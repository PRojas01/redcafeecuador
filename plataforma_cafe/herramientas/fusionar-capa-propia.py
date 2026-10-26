#!/usr/bin/env python3
"""
Red Café Ecuador — fusiona un `next build` limpio con la capa propia de producción.

    python3 herramientas/fusionar-capa-propia.py <out> <produccion> <version> <destino>

- <out>         carpeta que deja `next build` (output: "export").
- <produccion>  copia del public_html publicado (sin data/ ni uploads/). Es la
                fuente de verdad de la capa propia: qué <link>/<script> lleva
                cada ruta hoy.
- <version>     token nuevo para ?v=, sw.js, redcafe-version.json y VERSION.
- <destino>     carpeta nueva con el sitio completo listo para probar/empaquetar.

Por qué existe: la capa propia se reponía a mano o con bloques desactualizados
(herramientas/bloques/, de 20260909) y cada vez se perdía algo: páginas de
detalle sin scripts (20260926f), capa entera ausente (20260926e). Además los
paquetes parciales dejaban páginas con el payload RSC (index.txt) de builds
anteriores, y la navegación entre ellas fallaba ("Failed to fetch RSC payload
... reading 'call'"). Aquí se regeneran TODAS las rutas de React a la vez y la
capa se copia ruta por ruta desde producción, verificando el resultado.

Qué NO se copia de producción, a propósito:
- El script de rendimiento de GoDaddy (_trfq / tccl.min.js): el hosting lo
  inyecta al servir; tenerlo además en el archivo lo cargaba dos veces
  ("SCC Library has already been loaded").
- (El script redcafe-v59-home-colapsables se CONSERVA hasta migrar la portada:
  ya espera a la hidratación desde 20261001b.)

Nunca toca data/ ni uploads/: no se copian ni desde <out> ni desde <produccion>.
"""
import os
import re
import shutil
import sys

EXCLUIR_DIRS = {"data", "uploads", "Respaldo", "_respaldos", "context", "actualizacion"}

# Etiquetas que forman la capa propia (todo lo que no pone Next).
ETIQUETA = re.compile(
    r"<script\b[^>]*>.*?</script>|<link\b[^>]*>|<style\b[^>]*>.*?</style>", re.S
)


def es_de_next(t: str) -> bool:
    # $RB/$RT/$RC/$RS...: runtime de streaming de React que Next 15.5 emite en
    # línea en páginas con Suspense.
    return "/_next/" in t or "self.__next_f" in t or re.search(r"\$R[A-Z]\s*=", t) is not None


def es_capa_propia(t: str) -> bool:
    if es_de_next(t):
        return False
    if t.startswith("<link"):
        return 'rel="stylesheet"' in t and 'href="/' in t
    return t.startswith("<script") or t.startswith("<style")


def excluida(t: str) -> bool:
    return (
        "_trfq" in t
        or "tccl.min.js" in t
        or "application/ld+json" in t  # lo genera Next desde layout.tsx
    )


def clave(t: str) -> str:
    """Identidad de una etiqueta sin el token de versión (esté o no)."""
    return re.sub(r"\?v=[\w-]+", "", re.sub(r"\s+", " ", t)).strip()


def capa_de(html: str):
    """Etiquetas de capa propia de una página publicada, separadas en head/body."""
    fin_head = html.find("</head>")
    head, body = [], []
    for m in ETIQUETA.finditer(html):
        t = m.group(0)
        if not es_capa_propia(t) or excluida(t):
            continue
        (head if m.start() < fin_head else body).append(t)
    return head, body


def con_version(t: str, ver: str) -> str:
    t = re.sub(r"\?v=[\w-]+", "?v=" + ver, t)
    # Los /redcafe-*.js|css se sirven `immutable` a un año: sin ?v= (como
    # redcafe-fusion.js y redcafe-menu.js), una corrección nunca llegaba a quien
    # ya había visitado el sitio.
    return re.sub(r'((?:src|href)="/redcafe-[\w-]+\.(?:js|css))"', r'\1?v=' + ver + '"', t)


def rutas_html(raiz: str):
    for d, subdirs, files in os.walk(raiz):
        rel = os.path.relpath(d, raiz)
        if rel.split(os.sep)[0] in EXCLUIR_DIRS or rel.startswith("_next"):
            subdirs[:] = []
            continue
        if "index.html" in files:
            yield "" if rel == "." else rel


def main():
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(2)
    out, prod, ver, dest = sys.argv[1:]
    if os.path.exists(dest):
        sys.exit(f"{dest} ya existe: bórralo o elige otro destino")

    # 1. Base: producción completa (salvo datos), con su capa y sus páginas no-React.
    shutil.copytree(prod, dest, ignore=shutil.ignore_patterns(*EXCLUIR_DIRS))

    # 2. Todo _next/ del build nuevo (los nombres llevan hash: no pisa nada vigente).
    shutil.copytree(os.path.join(out, "_next"), os.path.join(dest, "_next"), dirs_exist_ok=True)

    problemas = []
    fusionadas = 0
    # Solo las rutas que genera React (llevan payload RSC). Lo demás que hay en
    # <out> son copias de public/ —p. ej. socios/, que en producción está detrás
    # de un index.php con contraseña: su index.html suelto se serviría antes que
    # el PHP (DirectoryIndex index.html index.php) y saltaría la puerta.
    def es_de_react(r):
        if r.split(os.sep)[0] == "socios":
            return False
        s = open(os.path.join(out, r, "index.html"), encoding="utf8", errors="replace").read()
        return "/_next/static/chunks/app/" in s

    rutas_out = {r for r in rutas_html(out) if es_de_react(r)}
    rutas_prod = set(rutas_html(prod))

    for ruta in sorted(rutas_out):
        o_dir = os.path.join(out, ruta)
        p_html = os.path.join(prod, ruta, "index.html")
        if not os.path.exists(p_html):
            problemas.append(f"ruta nueva sin equivalente en producción: /{ruta}")
            continue
        nuevo = open(os.path.join(o_dir, "index.html"), encoding="utf8").read()
        publicado = open(p_html, encoding="utf8", errors="replace").read()
        head, body = capa_de(publicado)

        ya = {clave(m.group(0)) for m in ETIQUETA.finditer(nuevo)}
        head = [con_version(t, ver) for t in head if clave(t) not in ya]
        body = [con_version(t, ver) for t in body if clave(t) not in ya]
        if "</head>" not in nuevo or "</body>" not in nuevo:
            problemas.append(f"HTML anómalo en /{ruta}")
            continue
        nuevo = nuevo.replace("</head>", "".join(head) + "</head>", 1)
        i = nuevo.rfind("</body>")
        nuevo = nuevo[:i] + "".join(body) + nuevo[i:]

        os.makedirs(os.path.join(dest, ruta), exist_ok=True)
        open(os.path.join(dest, ruta, "index.html"), "w", encoding="utf8").write(nuevo)
        # El payload RSC tiene que ser del MISMO build que el HTML y los chunks.
        txt = os.path.join(o_dir, "index.txt")
        if os.path.exists(txt):
            shutil.copyfile(txt, os.path.join(dest, ruta, "index.txt"))
        fusionadas += 1

        # Verificación: misma capa que producción (menos lo excluido), una sola vez.
        esperado = sorted(clave(t) for t in sum(capa_de(publicado), []))
        obtenido = sorted(clave(t) for t in sum(capa_de(nuevo), []))
        if esperado != obtenido:
            faltan = set(esperado) - set(obtenido)
            sobran = [k for k in set(obtenido) if obtenido.count(k) > esperado.count(k)]
            problemas.append(f"/{ruta}: capa distinta de producción — faltan {len(faltan)}, repetidas {len(sobran)}")

    # 3. Páginas que solo existen en producción (sin React): se conservan tal cual,
    #    solo sin el script de GoDaddy horneado y con la versión nueva.
    solo_prod = sorted(rutas_prod - rutas_out)
    for ruta in solo_prod:
        f = os.path.join(dest, ruta, "index.html")
        s = open(f, encoding="utf8", errors="replace").read()
        s = re.sub(r"<script\b[^>]*>(?:(?!</script>).)*_trfq.*?</script>", "", s, flags=re.S)
        s = re.sub(r"<script src='https://img1\.wsimg\.com/traffic-assets/js/tccl\.min\.js'></script>", "", s)
        open(f, "w", encoding="utf8").write(con_version(s, ver))

    # 4. Versión única en todo lo que la lleva.
    open(os.path.join(dest, "redcafe-version.json"), "w", encoding="utf8").write(
        '{\n  "version": "%s",\n  "cache": "redcafe-raiz-v%s"\n}\n' % (ver, ver)
    )
    sw = os.path.join(dest, "sw.js")
    s = open(sw, encoding="utf8").read()
    s2 = re.sub(r"redcafe-raiz-v[\w-]+", "redcafe-raiz-v" + ver, s)
    s2 = re.sub(r"\?v=[\w-]+", "?v=" + ver, s2)
    s2, n = re.subn(r"(VERSION\s*=\s*['\"])[\w-]+(['\"])", r"\g<1>" + ver + r"\g<2>", s2)
    if n == 0:
        problemas.append("no encontré la constante VERSION en sw.js")
    open(sw, "w", encoding="utf8").write(s2)
    js = os.path.join(dest, "redcafe-v60-final.js")
    s = open(js, encoding="utf8").read()
    s2, n = re.subn(r"(VERSION\s*=\s*['\"])[\w-]+(['\"])", r"\g<1>" + ver + r"\g<2>", s)
    if n == 0:
        problemas.append("no encontré la constante VERSION en redcafe-v60-final.js")
    open(js, "w", encoding="utf8").write(s2)

    # 5. Ninguna página puede referenciar un chunk que no esté en el destino.
    for ruta in rutas_html(dest):
        for nombre in ("index.html", "index.txt"):
            f = os.path.join(dest, ruta, nombre)
            if not os.path.exists(f):
                continue
            s = open(f, encoding="utf8", errors="replace").read()
            for m in set(re.findall(r"static/(?:chunks|css|media)/[\w./\[\]-]+?\.(?:js|css|woff2)", s)):
                if not os.path.exists(os.path.join(dest, "_next", m)):
                    problemas.append(f"/{ruta}/{nombre} referencia {m}, que no existe")
            viejas = set(re.findall(r"\?v=([\w-]+)", s)) - {ver}
            if viejas:
                problemas.append(f"/{ruta}/{nombre} conserva versiones viejas: {sorted(viejas)}")

    print(f"Fusionadas {fusionadas} rutas de React · {len(solo_prod)} solo de producción · versión {ver}")
    for p in problemas:
        print("  PROBLEMA:", p)
    sys.exit(1 if problemas else 0)


if __name__ == "__main__":
    main()
