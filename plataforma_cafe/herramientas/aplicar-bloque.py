#!/usr/bin/env python3
"""Comprueba o inyecta el bloque literal de la capa propia en una página.

  aplicar-bloque.py <pagina.html> <bloque.txt> <version> comprobar|inyectar

`comprobar` sale 0 si FALTA algo por inyectar, y 1 si ya está todo: así el
script que lo llama puede saltar la página sin duplicar nada.
"""
import re
import sys


def leer_bloque(ruta, version):
    texto = open(ruta, encoding='utf-8').read().replace('__VERSION__', version)
    partes = {}
    for nombre in ('css', 'inline', 'scripts'):
        m = re.search(r'<<<%s>>>\n(.*?)(?=\n<<<|\Z)' % nombre, texto, re.S)
        partes[nombre] = (m.group(1).strip() if m else '')
    return partes


def etiquetas(partes):
    """Cada etiqueta por separado, para comprobarlas una a una."""
    fuera = []
    if partes['css']:
        fuera.append(partes['css'])
    if partes['inline']:
        fuera.append(partes['inline'])
    fuera += re.findall(r'<script src="[^"]*"[^>]*></script>', partes['scripts'])
    return fuera


def main():
    pagina, bloque, version, accion = sys.argv[1:5]
    partes = leer_bloque(bloque, version)

    # Páginas que no pertenecen a la capa: las privadas de /socios/ son HTML
    # propio y autónomo, viajan tal cual dentro de public/ y no llevan ningún
    # script del sitio. Su bloque solo tiene la hoja de estilos, que ellas
    # mismas ya declaran. Tocarlas solo movería un salto de línea.
    if not re.search(r'<script src="', partes['scripts']):
        sys.exit(1 if accion == 'comprobar' else 0)
    html = open(pagina, encoding='utf-8').read()
    falta = [t for t in etiquetas(partes) if t not in html]

    if accion == 'comprobar':
        # 0 = falta algo (hay que inyectar); 1 = ya está completo
        sys.exit(0 if falta else 1)

    if partes['css'] and partes['css'] not in html:
        html = html.replace('</head>', partes['css'] + '</head>', 1)

    cola = ''
    if partes['inline'] and partes['inline'] not in html:
        cola += partes['inline']
    for tag in re.findall(r'<script src="[^"]*"[^>]*></script>', partes['scripts']):
        if tag not in html:
            cola += tag
    if cola:
        i = html.rfind('</body>')
        html = html[:i] + cola + html[i:]

    open(pagina, 'w', encoding='utf-8').write(html)


if __name__ == '__main__':
    main()
