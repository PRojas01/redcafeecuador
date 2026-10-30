#!/usr/bin/env python3
"""
Red Café Ecuador — comparación del build contra producción.

Compara el HTML CRUDO que sirve el build local con el que sirve producción.
No usa navegador a propósito: este sitio es una aplicación de JavaScript, así
que el HTML crudo es lo único que ve un buscador. El navegador dice lo que ve
una persona; este script dice lo que ve Google. Hay que mirar los dos.

    python3 herramientas/comparar-con-produccion.py \
        --local http://127.0.0.1:8099 \
        --produccion https://redcafeecuador.com

Sale con 1 si encuentra alguna diferencia en lo que obliga (precio, canonical),
y con 0 si todo lo comprobado coincide. Las diferencias esperadas a propósito
se marcan aparte y no hacen fallar.
"""
from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request

RUTAS = [
    "/",
    "/servicios/precios/",
    "/servicios/eudr/",
    "/servicios/calculadora/",
    "/login/",
    "/terminos-y-condiciones/",
    "/marketplace/",
]

RE_CANONICAL = re.compile(r'<link rel="canonical" href="([^"]*)"')
RE_OG = {
    k: re.compile(r'<meta property="og:%s" content="([^"]*)"' % k)
    for k in ("url", "title", "description")
}
RE_TITLE = re.compile(r"<title>(.*?)</title>", re.S)
RE_PRECIO = re.compile(r'text-5xl font-bold text-cafe">\$(\d+\.\d{2})')
RE_FECHA = re.compile(r"Actualizado: <!-- -->([^<]{0,40})")
RE_AVISO_FALLO = re.compile(r"no responde ahora mismo")
RE_ICE = re.compile(r'(https://www\.theice\.com/products/[^"\\]*)')


def traer(base: str, ruta: str) -> tuple[int, str]:
    url = base.rstrip("/") + ruta
    peticion = urllib.request.Request(url, headers={"User-Agent": "comparar-local/1.0"})
    try:
        with urllib.request.urlopen(peticion, timeout=25) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:  # noqa: BLE001 — se informa, no se oculta
        return 0, f"<!-- ERROR: {e} -->"


def primer(patron: re.Pattern, html: str) -> str:
    m = patron.search(html)
    if not m:
        return "(ninguno)"
    # Los patrones sin grupo de captura (los avisos) se usan como "¿aparece?".
    return (m.group(1) if m.groups() else "SÍ").strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", default="http://127.0.0.1:8099")
    ap.add_argument("--produccion", default="https://redcafeecuador.com")
    ap.add_argument("--sitio", default="https://redcafeecuador.com",
                    help="base del sitio, para saber qué canonical es el correcto")
    args = ap.parse_args()

    fallos: list[str] = []
    notas: list[str] = []

    # La idea de este script: no se compara contra producción para decidir si
    # está bien, porque producción es el defecto de partida. Se valida que lo
    # local sea lo CORRECTO, y producción solo se imprime como "antes".
    for ruta in RUTAS:
        esperado = args.sitio.rstrip("/") + ruta
        print(f"\n=== {ruta}")
        st_l, html_l = traer(args.local, ruta)
        st_p, html_p = traer(args.produccion, ruta)

        if st_l == 0:
            fallos.append(f"{ruta}: el servidor local no respondió")
            print(f"  estado     local SIN RESPUESTA")
            continue
        print(f"  estado     local {st_l} · producción {st_p}")

        for etiqueta, rx, debe in (
            ("canonical", RE_CANONICAL, esperado),
            ("og:url", RE_OG["url"], esperado),
        ):
            v_l, v_p = primer(rx, html_l), primer(rx, html_p)
            if v_l == debe:
                marca = "correcto"
                if v_p != debe:
                    notas.append(f"{ruta}: {etiqueta} arreglado (antes {v_p})")
            else:
                marca = "MAL"
                fallos.append(f"{ruta}: {etiqueta} es {v_l} y debería ser {debe}")
            print(f"  {etiqueta:<11} {v_l}")
            print(f"  {' ' * 11} {marca} · en producción era {v_p}")

        for etiqueta in ("title", "description"):
            v_l = primer(RE_OG[etiqueta], html_l)
            if v_l == args.sitio.rstrip("/") + "/":
                fallos.append(f"{ruta}: og:{etiqueta} sigue siendo el de la portada")
                print(f"  og:{etiqueta:<8} MAL · es el texto de la portada")
            else:
                print(f"  og:{etiqueta:<8} {v_l[:70]}")

    # El panel de precios, en detalle
    print("\n=== /servicios/precios/ — el precio que ve el buscador")
    _, html_l = traer(args.local, "/servicios/precios/")
    _, html_p = traer(args.produccion, "/servicios/precios/")

    pre_l, pre_p = primer(RE_PRECIO, html_l), primer(RE_PRECIO, html_p)
    print(f"  precio     local {pre_l} · producción {pre_p}")
    if pre_l == "(ninguno)":
        fallos.append("el HTML local no trae precio: el buscador vería la página sin precio")
        print("             <- MAL")
    elif pre_l != pre_p:
        print("             <- distinto, que es lo que se quería")
        notas.append(f"el precio pasa de {pre_p} (el del 1 de septiembre) a {pre_l}")
    else:
        fallos.append("el precio local es el mismo viejo de producción: no se aplicó el arreglo")
        print("             <- MAL, sigue el precio viejo")

    for nombre, rx in (("fecha", RE_FECHA), ("aviso de fallo", RE_AVISO_FALLO),
                       ("enlace del ICE", RE_ICE)):
        v_l, v_p = primer(rx, html_l), primer(rx, html_p)
        if rx is RE_AVISO_FALLO:
            v_l = "SÍ" if rx.search(html_l) else "no"
            v_p = "SÍ" if rx.search(html_p) else "no"
        print(f"  {nombre:<11} local {v_l} · producción {v_p}")
        if nombre == "fecha" and v_l == "(ninguno)":
            fallos.append("el HTML local no trae fecha de actualización")
        if nombre == "enlace del ICE" and "咖啡" in v_p:
            notas.append("producción sigue con el enlace del ICE corrupto (se arregla con el paquete)")
        if nombre == "enlace del ICE" and "咖啡" in v_l:
            fallos.append("el HTML local arrastra el enlace del ICE corrupto")

    # Token de versión
    print("\n=== token de versión")
    ver_l = primer(re.compile(r'redcafe-v60-final\.css\?v=([0-9a-zA-Z]+)'), html_l)
    ver_p = primer(re.compile(r'redcafe-v60-final\.css\?v=([0-9a-zA-Z]+)'), html_p)
    print(f"  token      local {ver_l} · producción {ver_p}")
    if ver_l != ver_p:
        notas.append(f"el token sube de {ver_p} a {ver_l}, como debe")

    print("\n" + "=" * 62)
    if fallos:
        print("HAY DIFERENCIAS QUE HAY QUE RESOLVER:")
        for f in fallos:
            print(f"  - {f}")
    else:
        print("Sin diferencias que obliguen a parar.")
    if notas:
        print("\nDiferencias previstas o advisadas:")
        for n in notas:
            print(f"  · {n}")
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
