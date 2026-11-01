#!/usr/bin/env python3
"""
La clase demostrativa gratis de Legacy (8 de octubre de 2026) ya pasó. Regla del
propietario: lo desactualizado se borra, no se oculta. Borra de la capa:
  · redcafe-academia.js: el enlace de la ficha del curso libre, el enlace y el
    envoltorio de su tarjeta en el catálogo, CLASE_DEMOSTRATIVA_URL y
    CURSO_DE_ENTRADA (solo los usaba la clase).
  · redcafe-v60-final.css: los estilos de esos enlaces y del envoltorio.

    python3 herramientas/clase-demo-expirada.py <sitio>     # idempotente
"""
import os
import re
import sys


def quitar(s, viejo, nuevo, archivo):
    if s.count(viejo) != 1:
        sys.exit(f"DETENIDO: {archivo} no tiene la forma esperada ({viejo[:60]!r})")
    return s.replace(viejo, nuevo)


def academia(sitio):
    f = os.path.join(sitio, "redcafe-academia.js")
    s = open(f, encoding="utf8").read()
    if "CLASE_DEMOSTRATIVA_URL" not in s:
        return
    # Ficha del curso libre.
    s = re.sub(r"        \(c\.id === CURSO_DE_ENTRADA\n          \? '<a class=\"redcafe-curso-demo es-ficha\"[^\n]*\n          : ''\) \+\n", "", s, count=1)
    # Tarjeta del catálogo: el envoltorio solo existía para colgar el enlace.
    s = quitar(s, "              var esEntrada = c.id === CURSO_DE_ENTRADA;\n", "", "redcafe-academia.js")
    s = quitar(s, "return (esEntrada ? '<div class=\"redcafe-curso-card-grupo\">' : '') +\n", "return '' +\n", "redcafe-academia.js")
    s = re.sub(r"'</a>' \+ \(esEntrada\n                \? '<a class=\"redcafe-curso-demo\"[^\n]*</a></div>'\n                : ''\);",
               "'</a>';", s, count=1)
    s = re.sub(r"  var CLASE_DEMOSTRATIVA_URL = \"[^\"\n]*\";\n", "", s, count=1)
    s = re.sub(r"  var CURSO_DE_ENTRADA = \"[^\"\n]*\";\n", "", s, count=1)
    for resto in ("CLASE_DEMOSTRATIVA_URL", "CURSO_DE_ENTRADA", "esEntrada", "redcafe-curso-demo",
                  "redcafe-curso-card-grupo", "Clase demostrativa", "clase demostrativa"):
        if resto in s:
            sys.exit(f"DETENIDO: redcafe-academia.js aún contiene {resto}")
    open(f, "w", encoding="utf8").write(s)
    print("redcafe-academia.js: borrada la clase demostrativa del 8 de octubre")


def estilos(sitio):
    f = os.path.join(sitio, "redcafe-v60-final.css")
    s = open(f, encoding="utf8").read()
    if "redcafe-curso-demo" not in s and "redcafe-curso-card-grupo" not in s:
        return
    s = re.sub(r"body\[data-redcafe-route=\"/academia/\"\] main \.redcafe-curso-card-grupo[^\n]*\n", "", s)
    s = re.sub(r"body main \.redcafe-curso-demo \{[^}]*\}\n", "", s, count=1)
    s = re.sub(r"body main \.redcafe-curso-demo[.:][^\n]*\n", "", s)
    s = s.replace("/* Academia: beneficio visible en portada y acceso externo independiente del curso libre. */",
                  "/* Academia: beneficio visible en portada. */")
    if "redcafe-curso-demo" in s or "redcafe-curso-card-grupo" in s:
        sys.exit("DETENIDO: redcafe-v60-final.css aún contiene estilos de la clase demostrativa")
    open(f, "w", encoding="utf8").write(s)
    print("redcafe-v60-final.css: borrados los estilos de la clase demostrativa")


if __name__ == "__main__":
    academia(sys.argv[1])
    estilos(sys.argv[1])
