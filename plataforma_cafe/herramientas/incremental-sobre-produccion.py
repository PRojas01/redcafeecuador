#!/usr/bin/env python3
"""
Red Café Ecuador — versión INCREMENTAL sobre la producción vigente.

    python3 herramientas/incremental-sobre-produccion.py \
        <base_produccion> <parches> <origen_parches> <version> <destino> <fuentes_dir>

- <base_produccion>  copia exacta del public_html publicado (sin data/ ni uploads/).
- <parches>          carpeta con mis archivos corregidos (p. ej. public_html/).
- <origen_parches>   copia de la producción sobre la que hice esos parches
                     (p. ej. local/publicada-src = 20260926h). Si un archivo
                     a parchear cambió en <base_produccion> respecto a ese
                     origen, se DETIENE: otro agente lo tocó y hay que fusionar
                     a mano (nunca se pisa su trabajo).
- <version>          token nuevo para ?v=, sw.js, redcafe-version.json, VERSION.
- <fuentes_dir>      carpeta con los woff2 de DM Sans del build.

No recompila React: el build publicado se conserva byte a byte. El tema se
aplica por la hoja propia (variables CSS). Al terminar compara destino con
base y falla si cambió algo fuera de lo previsto.
"""
import filecmp
import os
import re
import shutil
import subprocess
import sys

PARCHES_PHP = ["api/members.php", "api/_bootstrap.php", "api/pedidos.php", "api/notificaciones.php", "api/mailer.php",
               "api/comunidad.php", "api/empleos.php", "api/auth.php", "api/twofactor.php", "api/reportes.php",
               "api/lotes.php", "api/marketplace-servicios.php", "api/_avisos.php", "api/_comunidad-avisos.php", ".htaccess"]
# Archivos nuevos (no existen en producción): se añaden, nunca pisan nada.
NUEVOS_PHP = ["api/moderacion.php", "api/_moderacion.php"]
FUENTES = {"13971731025ec697-s.p.woff2": "fonts/dm-sans-latin.woff2",
           "7ab938503e4547a1-s.p.woff2": "fonts/dm-sans-latin-ext.woff2"}
EXCLUIR = ("data", "uploads", "Respaldo", "_respaldos", "context", "actualizacion")


def main():
    base, parches, origen, ver, dest, fuentes = sys.argv[1:7]
    if os.path.exists(dest):
        sys.exit(f"{dest} ya existe")
    m = re.search(r'"version"\s*:\s*"([^"]+)"', open(os.path.join(base, "redcafe-version.json")).read())
    ver_base = m.group(1)
    print(f"Base de producción: {ver_base} → nueva {ver}")

    # 0. Ningún parche puede pisar un archivo que otro agente cambió.
    for r in PARCHES_PHP:
        if filecmp.cmp(os.path.join(parches, r), os.path.join(base, r), shallow=False):
            continue  # ya aplicado en la base
        if not filecmp.cmp(os.path.join(origen, r), os.path.join(base, r), shallow=False):
            sys.exit(f"DETENIDO: {r} cambió en {ver_base} respecto al origen de mi parche; fusionar a mano.")

    for r in NUEVOS_PHP:
        if os.path.exists(os.path.join(base, r)) and not filecmp.cmp(os.path.join(parches, r), os.path.join(base, r), shallow=False):
            sys.exit(f"DETENIDO: {r} ya existe en {ver_base} con otro contenido; fusionar a mano.")

    shutil.copytree(base, dest, ignore=shutil.ignore_patterns(*EXCLUIR))
    previstos = set()

    # 1. Parches PHP / .htaccess.
    for r in PARCHES_PHP + NUEVOS_PHP:
        shutil.copyfile(os.path.join(parches, r), os.path.join(dest, r))
        previstos.add(r)

    # 2. Fuente DM Sans alojada en el sitio.
    for origen_f, destino_f in FUENTES.items():
        os.makedirs(os.path.dirname(os.path.join(dest, destino_f)), exist_ok=True)
        shutil.copyfile(os.path.join(fuentes, origen_f), os.path.join(dest, destino_f))
        previstos.add(destino_f)

    # 3. Tema Stradale sobre la capa propia (colores por rol + bloque final).
    herr = os.path.dirname(os.path.abspath(__file__))
    out = subprocess.run([sys.executable, os.path.join(herr, "tema-stradale-capa.py"), dest],
                         capture_output=True, text=True, check=True).stdout
    print(out.strip().splitlines()[-1])
    for f in ["redcafe-v60-final.css", "redcafe-requerimientos.js", "redcafe-empleos.js",
              "redcafe-colapsables.js", "redcafe-v60-final.js", "redcafe-grafico-precios.js"]:
        previstos.add(f)

    # 3b. Portada: el script en línea redcafe-v59-home-colapsables tocaba el DOM
    #     antes de que React hidratara (React #418). Se deja igual pero espera a
    #     la hidratación (nodo con __reactFiber) y observa solo <main>.
    portada = os.path.join(dest, "index.html")
    s = open(portada, encoding="utf8").read()
    viejo = ("  addHomeDetails();\n"
             "  new MutationObserver(addHomeDetails).observe(document.documentElement, {childList:true, subtree:true});\n")
    nuevo = ("  /* Espera a que React hidrate (evita React #418) y vigila solo <main>. */\n"
             "  function hidratado(){ var h=document.querySelector('main h2'); return !!h && Object.keys(h).some(function(k){ return k.indexOf('__reactFiber')===0; }); }\n"
             "  var t0=Date.now();\n"
             "  (function arrancar(){\n"
             "    if(!hidratado() && Date.now()-t0<8000){ return setTimeout(arrancar,60); }\n"
             "    addHomeDetails();\n"
             "    new MutationObserver(addHomeDetails).observe(document.querySelector('main')||document.body, {childList:true, subtree:true});\n"
             "  })();\n")
    if s.count(nuevo) == 1:
        pass  # ya aplicado en la base
    elif s.count(viejo) != 1:
        sys.exit("DETENIDO: el script de la portada no tiene la forma esperada; revisar a mano.")
    else:
        open(portada, "w", encoding="utf8").write(s.replace(viejo, nuevo))

    # 3c. Texto bajo el titular de la portada (decisión del propietario, 1-oct):
    #     la lista de frases que reemplaza enhanceHomeHeroCopy() no incluía la
    #     actual de React («…conecta actores del negocio cafetero…»). Se añade
    #     y se pone el texto nuevo, por la vía segura (reemplazarTextoSeguro).
    js = os.path.join(dest, "redcafe-v60-final.js")
    s = open(js, encoding="utf8").read()
    ancla = ('        t === "Red Café Ecuador conecta productores, tostadores, compradores, cafeterías, '
             'asesores y proveedores en una plataforma abierta para mostrar oferta, encontrar '
             'oportunidades y trabajar con más información.";')
    frase_react = ("Red Café Ecuador conecta actores del negocio cafetero en una plataforma abierta "
                   "para mostrar oferta, encontrar oportunidades y trabajar con más información.")
    texto_viejo = ('"Regístrate gratis para publicar café o servicios, encontrar compradores y proveedores, '
                   'revisar precios con fuente visible y guardar tu avance en la Academia."')
    texto_nuevo = '"Compra y vende café directo, sin intermediarios ni comisiones. Tu perfil gratis en dos minutos."'
    if s.count(texto_nuevo) == 1 and frase_react in s:
        pass  # ya aplicado en la base
    elif s.count(ancla) != 1 or s.count(texto_viejo) != 1:
        sys.exit("DETENIDO: enhanceHomeHeroCopy() no tiene la forma esperada; revisar a mano.")
    else:
        s = s.replace(ancla, ancla[:-1] + ' ||\n        t === "' + frase_react + '";')
        s = s.replace(texto_viejo, texto_nuevo)
        open(js, "w", encoding="utf8").write(s)

    # 3d. /afiliate/: «Productor» preseleccionado se sumaba a cualquier perfil
    #     elegido. Se añade al final de redcafe-afiliate.js (idempotente).
    af = os.path.join(dest, "redcafe-afiliate.js")
    parche = open(os.path.join(os.path.dirname(os.path.abspath(parches)), "parches",
                               "afiliate-perfil-preseleccion.js"), encoding="utf8").read()
    s = open(af, encoding="utf8").read()
    if "preselección de «Productor» en /afiliate/" not in s:
        open(af, "w", encoding="utf8").write(s.rstrip() + "\n" + parche)
    previstos.add("redcafe-afiliate.js")

    # 3e. CSV de inscritos: una celda que empieza por = + - @ (o tab/CR) la evalúa
    #     Excel como fórmula (inyección CSV). Se antepone ' (idempotente).
    cur = os.path.join(dest, "api", "cursos.php")
    s = open(cur, encoding="utf8").read()
    viejo_csv = ("function curso_csv_celda(string $v): string {\n"
                 "    $v = trim($v);\n")
    nuevo_csv = ("function curso_csv_celda(string $v): string {\n"
                 "    $v = trim($v);\n"
                 "    // Inyección CSV: Excel evalúa como fórmula lo que empieza por = + - @.\n"
                 "    if ($v !== '' && strpbrk($v[0], \"=+-@\\t\\r\") !== false) $v = \"'\" . $v;\n")
    if "Inyección CSV" not in s:
        if s.count(viejo_csv) != 1:
            sys.exit("DETENIDO: curso_csv_celda() no tiene la forma esperada.")
        open(cur, "w", encoding="utf8").write(s.replace(viejo_csv, nuevo_csv))
    previstos.add("api/cursos.php")

    # 3f. Migración a React — fase 1: borra de la capa lo que ya hace React.
    out = subprocess.run([sys.executable, os.path.join(herr, "migracion-fase1.py"), dest],
                         capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(out.stdout + out.stderr)
    previstos.update({"redcafe-conversion.js", "redcafe-v60-final.js"})

    # 3g. Clase demostrativa de Legacy: pasa del 3 al 8 de octubre de 2026
    #     (decisión del propietario, 1-oct-2026). Solo los textos de la clase.
    f = os.path.join(dest, "redcafe-academia.js")
    s = open(f, encoding="utf8").read()
    cambios = [("Clase demostrativa gratis de Legacy · 3 oct 2026", "Clase demostrativa gratis de Legacy · 8 oct 2026", 1),
               ("clase demostrativa gratis de Legacy el 3 de octubre de 2026", "clase demostrativa gratis de Legacy el 8 de octubre de 2026", 1),
               ("Clase demostrativa gratis · 3 oct 2026", "Clase demostrativa gratis · 8 oct 2026", 1)]
    for viejo, nuevo, n in cambios:
        if s.count(viejo) != n and s.count(nuevo) != n:
            sys.exit(f"DETENIDO: redcafe-academia.js no tiene la forma esperada ({viejo!r})")
        s = s.replace(viejo, nuevo)
    if "3 oct 2026" in s or "3 de octubre de 2026" in s:
        sys.exit("DETENIDO: queda una fecha antigua de la clase demostrativa")
    open(f, "w", encoding="utf8").write(s)
    previstos.add("redcafe-academia.js")

    # 3h. Botón «Eliminar» en lo que cada persona publica (capa sin versión React).
    out = subprocess.run([sys.executable, os.path.join(herr, "eliminar-propias.py"), dest], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(out.stdout + out.stderr)
    previstos.update({"redcafe-requerimientos.js", "redcafe-empleos.js", "redcafe-busco-empleo.js",
                      "redcafe-panel-publicaciones.js", "redcafe-comunidad.js"})

    # 3i. Portada: la capa ya no duplica el titular que React trae definitivo.
    out = subprocess.run([sys.executable, os.path.join(herr, "portada-sin-duplicados.py"), dest], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(out.stdout + out.stderr)
    previstos.update({"redcafe-v60-final.js", "redcafe-v60-mejoras-obligatorias.js"})

    # 3j–3n. Contacto y WhatsApp con aceptación, reportar a un miembro, enlaces de
    #        la comunidad, fase 2 de la migración (bloque «Forma parte» a React) y
    #        borrado de la clase demostrativa del 8 de octubre (ya pasó) y
    # 3o.    botones de la portada (Registrarse / WhatsApp / Acceder) en React.
    for herramienta, archivos in [
        ("aviso-contacto.py", ["redcafe-aviso-pedidos.js"]),
        ("reportar-miembro.py", ["redcafe-reportes.js", "redcafe-v60-mejoras-obligatorias.js", "redcafe-comunidad.js"]),
        ("enlaces-comunidad.py", ["redcafe-comunidad.js", "redcafe-v60-mejoras-obligatorias.js"]),
        ("migracion-fase2-portada.py", ["redcafe-conversion.js"]),
        ("clase-demo-expirada.py", ["redcafe-academia.js", "redcafe-v60-final.css"]),
        ("botones-portada.py", ["redcafe-v60-final.js", "redcafe-v60-mejoras-obligatorias.js", "redcafe-conversion.js", "redcafe-v60-final.css"]),
    ]:
        out = subprocess.run([sys.executable, os.path.join(herr, herramienta), dest], capture_output=True, text=True)
        if out.returncode != 0:
            sys.exit(out.stdout + out.stderr)
        previstos.update(archivos)

    # 4. Versión nueva en todo lo que la lleva; ?v= también en redcafe-fusion/menu.
    for d, _, fs in os.walk(dest):
        rel = os.path.relpath(d, dest)
        # socios/ va aparte (puerta propia, tokens propios): no se toca.
        if rel.startswith("_next") or rel.split(os.sep)[0] == "socios":
            continue
        for f in fs:
            if f != "index.html":
                continue
            p = os.path.join(d, f)
            s = open(p, encoding="utf8").read()
            s2 = s.replace("?v=" + ver_base, "?v=" + ver)
            s2 = re.sub(r'src="/(redcafe-(?:fusion|menu)\.js)"', r'src="/\1?v=' + ver + '"', s2)
            if s2 != s:
                open(p, "w", encoding="utf8").write(s2)
                previstos.add(os.path.normpath(os.path.join(rel, f)))
    for r, pat in (("sw.js", r'(VERSION\s*=\s*")[^"]+(")'),
                   ("redcafe-v60-final.js", r'(VERSION\s*=\s*")[^"]+(")')):
        p = os.path.join(dest, r)
        s = open(p, encoding="utf8").read()
        s2, n = re.subn(pat, r"\g<1>" + ver + r"\g<2>", s)
        if n == 0:
            sys.exit(f"no encontré VERSION en {r}")
        open(p, "w", encoding="utf8").write(s2)
        previstos.add(r)
    open(os.path.join(dest, "redcafe-version.json"), "w").write(
        '{\n  "version": "%s",\n  "cache": "redcafe-raiz-v%s"\n}\n' % (ver, ver))
    previstos.add("redcafe-version.json")

    # 5. Verificación: fuera de lo previsto, todo idéntico a producción.
    inesperados, react = [], 0
    for d, _, fs in os.walk(dest):
        for f in fs:
            r = os.path.normpath(os.path.relpath(os.path.join(d, f), dest))
            b = os.path.join(base, r)
            if r in previstos:
                continue
            if not os.path.exists(b) or not filecmp.cmp(b, os.path.join(d, f), shallow=False):
                inesperados.append(r)
            elif r.startswith("_next") or r.endswith("index.txt"):
                react += 1
    # Las páginas cambiadas solo pueden diferir en el token de versión.
    for r in sorted(x for x in previstos if x.endswith("index.html")):
        a = open(os.path.join(base, r), encoding="utf8").read().replace("?v=" + ver_base, "?v=" + ver)
        a = re.sub(r'src="/(redcafe-(?:fusion|menu)\.js)"', r'src="/\1?v=' + ver + '"', a)
        if r == "index.html" and viejo in a:
            a = a.replace(viejo, nuevo)
        if a != open(os.path.join(dest, r), encoding="utf8").read():
            inesperados.append(r + " (cambia algo más que la versión)")
    print(f"Previstos: {len(previstos)} · React/RSC intactos: {react} · inesperados: {len(inesperados)}")
    for x in inesperados[:20]:
        print("  INESPERADO:", x)
    sys.exit(1 if inesperados else 0)


if __name__ == "__main__":
    main()
