#!/usr/bin/env python3
"""
Portada: React ya trae el titular y el subtítulo definitivos (20261005), así que
la capa deja de ocultar el titular de React y pintar su copia (era un cambio de
texto visible al cargar). El subtítulo ya solo se cambiaba si coincidía con un
texto antiguo: con el nuevo no hace nada.

Marketplace: cada tarjeta de lote repetía, para visitantes, dos botones
(«Entra para contactar al vendedor» + «Ya tengo cuenta»). «Ya tengo cuenta» ya
está en la cabecera: en las tarjetas queda solo el primero (en la ficha del
lote se conserva).

    python3 herramientas/portada-sin-duplicados.py <sitio>     # idempotente
"""
import os
import re
import sys

VIEJO = """    if (heroTitle && heroTitle.getAttribute("data-redcafe-oculto-react") !== "1" && !heroTitle.closest("[data-redcafe-propio]")) {"""
NUEVO = """    // React ya pinta este titular (20261005): sin copia ni ocultación.
    if (heroTitle && text(heroTitle).indexOf("Crea tu perfil y conecta") !== 0 && heroTitle.getAttribute("data-redcafe-oculto-react") !== "1" && !heroTitle.closest("[data-redcafe-propio]")) {"""


TARJETA = re.compile(r"""('<a class="btn-primary" href="/afiliate/">Entra para contactar al vendedor</a>')( \+\s*'<a class="btn-ghost" href="/login/">Ya tengo cuenta</a>')""")


def main():
    f = os.path.join(sys.argv[1], "redcafe-v60-final.js")
    s = open(f, encoding="utf8").read()
    if NUEVO not in s:
        if s.count(VIEJO) != 1:
            sys.exit("DETENIDO: redcafe-v60-final.js no tiene la forma esperada (titular de portada)")
        open(f, "w", encoding="utf8").write(s.replace(VIEJO, NUEVO))
        print("redcafe-v60-final.js: el titular de la portada ya no se duplica")

    f = os.path.join(sys.argv[1], "redcafe-v60-mejoras-obligatorias.js")
    s = open(f, encoding="utf8").read()
    n = len(TARJETA.findall(s))
    if n:
        if n != 3:
            sys.exit(f"DETENIDO: se esperaban 3 tarjetas con doble botón y hay {n}")
        open(f, "w", encoding="utf8").write(TARJETA.sub(r"\1", s))
        print("redcafe-v60-mejoras-obligatorias.js: tarjetas de lote con un solo botón para visitantes")


if __name__ == "__main__":
    main()
