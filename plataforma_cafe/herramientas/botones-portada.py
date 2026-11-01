#!/usr/bin/env python3
"""
Botones de la portada (24-oct-2026, pedido del propietario): «Registrarse»,
«WhatsApp» y «Acceder», con la misma forma y un color por función. Ahora los
tres los pinta React (app/page.tsx). En la capa:
  · redcafe-v60-final.js: borra addHomeLoginButton() y su llamada.
  · redcafe-v60-mejoras-obligatorias.js: borra addHomeProfileButton() y su llamada.
    Las dos copiaban «Acceder a mi perfil» buscando una línea de la portada que
    ya no existe, así que en 20261023a el botón había desaparecido.
  · redcafe-conversion.js: la franja de cifras se ancla en #portada-hero en vez
    de buscar el texto «Unirme a la Red».
  · redcafe-v60-final.css: colores de los tres botones (al final, para ganar
    a las reglas del tema).

    python3 herramientas/botones-portada.py <sitio>     # idempotente
"""
import os
import re
import sys

MARCA_CSS = "/* ═══ Portada: botones Registrarse / WhatsApp / Acceder (24-oct-2026) ═══ */"

CSS = MARCA_CSS + """
html:not(#rc-t1):not(#rc-t2) body #portada-hero .portada-botones .btn-accent {
  display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
  min-height: 48px; padding: 0 1.4rem; border-radius: 0; border-width: 1px; border-style: solid;
  text-decoration: none;
}
/* Registrarse: el más llamativo. Amarillo ámbar intenso; texto rubí muy oscuro (contraste 9:1). */
html:not(#rc-t1):not(#rc-t2) body #portada-hero .portada-botones .btn-accent.btn-registro {
  background-color: #ffbe1a; border-color: #ffbe1a; color: #3a0d05;
  background-image: linear-gradient(180deg, #ffd45c 0%, #ffbe1a 55%, #f0a500 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 8px 22px -8px rgba(255,190,26,.85);
}
html:not(#rc-t1):not(#rc-t2) body #portada-hero .portada-botones .btn-accent.btn-registro:hover {
  background-image: linear-gradient(180deg, #ffdc78 0%, #ffc838 55%, #f5b000 100%);
}
/* WhatsApp: verde oficial #25D366 con el texto oscuro de la marca (contraste 9:1). */
html:not(#rc-t1):not(#rc-t2) body #portada-hero .portada-botones .btn-accent.btn-whatsapp {
  background-color: #25d366; border-color: #25d366; color: #0b141a; background-image: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 8px 22px -10px rgba(37,211,102,.8);
}
html:not(#rc-t1):not(#rc-t2) body #portada-hero .portada-botones .btn-accent.btn-whatsapp:hover {
  background-color: #1ebe5b; border-color: #1ebe5b;
}
html:not(#rc-t1):not(#rc-t2) body #portada-hero .portada-botones .btn-accent:focus-visible {
  outline: 3px solid #fff7e8; outline-offset: 3px;
}
@media (max-width: 639px) {
  /* En el teléfono, los tres a lo ancho y en el mismo orden. */
  html:not(#rc-t1):not(#rc-t2) body #portada-hero .portada-botones { display: grid; grid-template-columns: 1fr; gap: .6rem; }
}
"""


def leer(f):
    return open(f, encoding="utf8").read()


def borrar_funcion(s, nombre, llamada, archivo):
    ini = s.find(f"  function {nombre}() {{")
    if ini < 0:
        return s
    fin = s.find("\n  }\n", ini)
    if fin < 0 or s.count(llamada) != 1:
        sys.exit(f"DETENIDO: {archivo} no tiene la forma esperada ({nombre})")
    s = s[:ini] + s[fin + len("\n  }\n"):].lstrip("\n")
    s = s.replace(llamada, "")
    if nombre in s:
        sys.exit(f"DETENIDO: queda una referencia a {nombre} en {archivo}")
    return s


def main():
    sitio = sys.argv[1]

    f = os.path.join(sitio, "redcafe-v60-final.js")
    s = leer(f)
    s2 = borrar_funcion(s, "addHomeLoginButton", "    addHomeLoginButton();\n", "redcafe-v60-final.js")
    if s2 != s:
        open(f, "w", encoding="utf8").write(s2)
        print("redcafe-v60-final.js: borrada la copia de «Acceder a mi perfil»")

    f = os.path.join(sitio, "redcafe-v60-mejoras-obligatorias.js")
    s = leer(f)
    s2 = borrar_funcion(s, "addHomeProfileButton", "    addHomeProfileButton();\n", "redcafe-v60-mejoras-obligatorias.js")
    if s2 != s:
        open(f, "w", encoding="utf8").write(s2)
        print("redcafe-v60-mejoras-obligatorias.js: borrada la copia de «Acceder a mi perfil»")

    f = os.path.join(sitio, "redcafe-conversion.js")
    s = leer(f)
    viejo = re.compile(
        r"    var cta = Array\.prototype\.slice\.call\(document\.querySelectorAll\('main a\[href=\"/afiliate/\"\]'\)\)\.filter\(function \(a\) \{\n"
        r"      return texto\(a\) === \"Unirme a la Red\";\n"
        r"    \}\)\[0\];\n"
        r"    var cabecera = cta && cta\.closest\(\"section\"\);\n")
    if viejo.search(s):
        s = viejo.sub('    var cabecera = document.getElementById("portada-hero");\n', s, count=1)
        open(f, "w", encoding="utf8").write(s)
        print("redcafe-conversion.js: las cifras se anclan en #portada-hero")
    elif 'document.getElementById("portada-hero")' not in s:
        sys.exit("DETENIDO: cifrasDeLaRed() de redcafe-conversion.js no tiene la forma esperada")

    f = os.path.join(sitio, "redcafe-v60-final.css")
    s = leer(f)
    if MARCA_CSS not in s:
        open(f, "w", encoding="utf8").write(s.rstrip("\n") + "\n\n" + CSS)
        print("redcafe-v60-final.css: colores de los botones de la portada")


if __name__ == "__main__":
    main()
