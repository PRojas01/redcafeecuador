#!/usr/bin/env python3
"""Genera las 4 imágenes del collage de la portada (sitio/img/collage/*.webp).

Mismo estilo que el generador de imágenes de cursos de la carpeta local
(_diseno/generar_imagenes_cursos.py): dibujo de línea sobre fondo liso.
Paleta de la portada: fondo blanco/crema, línea roja #8C1E0E, acento verde
#2F6B45 y oro #DFA066.  Uso:  python3 herramientas/generar-imagenes-collage.py
"""
import math
import os
from PIL import Image, ImageDraw

ESC = 3                      # se dibuja a 3x y se reduce: bordes suaves
L = 800 * ESC
ROJO, VERDE, ORO = (140, 30, 14), (47, 107, 69), (223, 160, 102)
CREMA, BLANCO = (251, 244, 242), (255, 255, 255)
G = 14 * ESC                 # grosor de línea
SALIDA = os.path.join(os.path.dirname(__file__), "..", "sitio", "img", "collage")


def lienzo():
    im = Image.new("RGB", (L, L), BLANCO)
    d = ImageDraw.Draw(im)
    # fondo: degradado blanco → crema y un círculo suave detrás del dibujo
    for y in range(L):
        t = y / L
        c = tuple(int(BLANCO[i] + (CREMA[i] - BLANCO[i]) * t) for i in range(3))
        d.line([(0, y), (L, y)], fill=c)
    r = 250 * ESC
    d.ellipse([L / 2 - r, 330 * ESC - r, L / 2 + r, 330 * ESC + r], fill=(246, 230, 225))
    return im, d


def p(x, y):
    return (x * ESC, y * ESC)


def linea(d, pts, color=ROJO, g=G):
    d.line([p(*q) for q in pts], fill=color, width=g, joint="curve")
    for q in (pts[0], pts[-1]):
        x, y = p(*q)
        d.ellipse([x - g / 2, y - g / 2, x + g / 2, y + g / 2], fill=color)


def arco(d, caja, a0, a1, color=ROJO, g=G):
    d.arc([*p(caja[0], caja[1]), *p(caja[2], caja[3])], a0, a1, fill=color, width=g)


def ovalo(d, caja, color=ROJO, g=G, relleno=None):
    d.ellipse([*p(caja[0], caja[1]), *p(caja[2], caja[3])], outline=color, width=g, fill=relleno)


def hoja(d, cx, cy, largo, ang, color=VERDE):
    a = math.radians(ang)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux
    pts = []
    for i in range(0, 41):
        t = i / 40
        w = math.sin(math.pi * t) * largo * 0.32
        pts.append((cx + ux * largo * t + nx * w, cy + uy * largo * t + ny * w))
    for i in range(40, -1, -1):
        t = i / 40
        w = math.sin(math.pi * t) * largo * 0.32
        pts.append((cx + ux * largo * t - nx * w, cy + uy * largo * t - ny * w))
    d.polygon([p(*q) for q in pts], fill=color)
    linea(d, [(cx, cy), (cx + ux * largo * .85, cy + uy * largo * .85)], (233, 242, 235), 5 * ESC)


def grano(d, cx, cy, r, color=ROJO):
    ovalo(d, (cx - r, cy - r * 1.3, cx + r, cy + r * 1.3), color, 10 * ESC)
    arco(d, (cx - r * .5, cy - r * 1.3, cx + r * .5, cy + r * 1.3), 280, 80, color, 8 * ESC)


def vender(d):
    # saco de café con etiqueta de precio
    saco = [(250, 260), (230, 300), (215, 470), (240, 520), (480, 520), (505, 470), (490, 300), (470, 260)]
    d.polygon([p(*q) for q in saco], fill=BLANCO)
    linea(d, saco + [saco[0]])
    linea(d, [(245, 262), (300, 230), (360, 248), (420, 230), (475, 262)])
    grano(d, 330, 395, 34)
    grano(d, 400, 410, 30, ORO)
    # etiqueta
    et = [(520, 300), (600, 300), (630, 340), (600, 380), (520, 380)]
    d.polygon([p(*q) for q in et], fill=(253, 242, 228))
    linea(d, et + [et[0]], ORO, 10 * ESC)
    ovalo(d, (536, 330, 556, 350), ORO, 8 * ESC)
    linea(d, [(470, 300), (530, 338)], ORO, 6 * ESC)
    hoja(d, 210, 250, 110, 215)


def aprender(d):
    # libro abierto con una planta de café
    linea(d, [(170, 470), (400, 500), (630, 470)])
    linea(d, [(170, 470), (170, 300), (400, 330), (630, 300), (630, 470)])
    linea(d, [(400, 330), (400, 500)])
    for k in range(3):
        y = 355 + k * 35
        linea(d, [(205, y + 0), (365, y + 18)], (205, 160, 150), 7 * ESC)
        linea(d, [(435, y + 18), (595, y)], (205, 160, 150), 7 * ESC)
    linea(d, [(400, 330), (400, 190)], VERDE, 10 * ESC)
    hoja(d, 400, 270, 110, -35)
    hoja(d, 400, 230, 100, 215)
    for cx, cy in ((372, 300), (428, 288), (400, 250)):
        d.ellipse([*p(cx - 13, cy - 13), *p(cx + 13, cy + 13)], fill=ROJO)


def servicios(d):
    # camión con sacos
    linea(d, [(150, 440), (650, 440)], (205, 160, 150), 8 * ESC)
    caja = [(170, 280), (470, 280), (470, 420), (170, 420)]
    d.polygon([p(*q) for q in caja], fill=BLANCO)
    linea(d, caja + [caja[0]])
    cab = [(470, 320), (570, 320), (620, 370), (620, 420), (470, 420)]
    d.polygon([p(*q) for q in cab], fill=BLANCO)
    linea(d, cab + [cab[0]])
    linea(d, [(505, 335), (560, 335), (595, 370), (505, 370), (505, 335)], ROJO, 8 * ESC)
    for x in (230, 330):
        d.rounded_rectangle([*p(x - 38, 310), *p(x + 38, 400)], radius=22 * ESC, fill=(253, 242, 228), outline=ORO, width=8 * ESC)
        grano(d, x, 355, 13, ORO)
    for x in (240, 540):
        ovalo(d, (x - 38, 400, x + 38, 476), ROJO, G, BLANCO)
        ovalo(d, (x - 12, 426, x + 12, 450), ROJO, 7 * ESC)
    hoja(d, 600, 250, 90, 200)


def recetas(d):
    # gotero V60 sobre taza, con vapor
    linea(d, [(240, 520), (560, 520)], (205, 160, 150), 8 * ESC)
    taza = [(270, 400), (290, 500), (510, 500), (530, 400)]
    d.polygon([p(*q) for q in taza], fill=BLANCO)
    linea(d, taza)
    linea(d, [(270, 400), (530, 400)])
    arco(d, (505, 415, 590, 480), 270, 90)
    gotero = [(290, 250), (510, 250), (430, 380), (370, 380)]
    d.polygon([p(*q) for q in gotero], fill=(253, 242, 228))
    linea(d, gotero + [gotero[0]], ORO, 12 * ESC)
    for k in range(3):
        linea(d, [(340 + k * 40, 265), (385 + k * 15, 360)], ORO, 6 * ESC)
    for x in (360, 400, 440):
        pts = [(x + 12 * math.sin(t / 6), 230 - t * 4) for t in range(0, 26)]
        linea(d, pts, (205, 160, 150), 7 * ESC)
    d.ellipse([*p(394, 386), *p(406, 398)], fill=ROJO)
    hoja(d, 560, 330, 90, -20)


def main():
    os.makedirs(SALIDA, exist_ok=True)
    for nombre, dibujo in (("vender", vender), ("aprender", aprender), ("servicios", servicios), ("recetas", recetas)):
        im, d = lienzo()
        dibujo(d)
        im = im.resize((800, 800), Image.LANCZOS)
        ruta = os.path.join(SALIDA, nombre + ".webp")
        im.save(ruta, "WEBP", quality=86, method=6)
        print(ruta, os.path.getsize(ruta))


if __name__ == "__main__":
    main()
