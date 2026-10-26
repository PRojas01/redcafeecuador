# -*- coding: utf-8 -*-
"""
PASO 1 - Diseno / pruebas visuales antes de renderizar los 900 fotogramas.
Genera: mascaras del monton, su geometria (para encuadrar la camara respecto
del cafe) y la imagen de CEREZA MADURA.
"""
import os
import json
import numpy as np
from PIL import Image
import comun as C

FOTOS = os.path.join(C.RAIZ)

# Placas a resolucion nativa: la camara encuadra muy cerrado y necesita
# margen para hacer zoom sin ampliar nunca por encima del original.
ALTO_PLACA = {"H_molid2": 4164, "Z_cereza": 707, "Z_taza": 700}
ALTO_DEF = 2084

ENCOGER = {"A_cereza": 3}

PLAN = [
    # clave      archivo                 cx    cy    sx    sy
    ("Z_cereza", "cereza.jpeg",         0.50, 0.58, 0.42, 0.42),
    ("Z_taza",   "tasa.jpeg",           0.53, 0.58, 0.30, 0.35),
    ("A_cereza", "20260820_125611.jpg", 0.49, 0.60, 0.40, 0.44),
    ("B_pergam", "20260820_125710.jpg", 0.49, 0.55, 0.48, 0.46),
    ("C_verde",  "20260820_125723.jpg", 0.47, 0.57, 0.40, 0.42),
    ("D_tost1",  "20260820_125815.jpg", 0.48, 0.58, 0.38, 0.42),
    ("E_tost2",  "20260820_125827.jpg", 0.48, 0.58, 0.40, 0.44),
    ("F_tost3",  "20260820_125858.jpg", 0.43, 0.60, 0.36, 0.40),
    ("G_molid1", "20260820_130152.jpg", 0.44, 0.62, 0.34, 0.38),
    ("H_molid2", "20260820_130155.jpg", 0.45, 0.62, 0.36, 0.40),
]


def alto_de(clave):
    return ALTO_PLACA.get(clave, ALTO_DEF)


if __name__ == "__main__":
    os.makedirs(C.PREV, exist_ok=True)
    geo = {}
    for clave, arch, cx, cy, sx, sy in PLAN:
        placa = C.cargar_placa(os.path.join(FOTOS, arch), alto_de(clave))
        m = C.mascara_monton(placa, cx, cy, sx, sy,
                             plumon=10.0 if clave in ENCOGER else 13.0,
                             encoger=ENCOGER.get(clave, 0))
        np.save(os.path.join(C.PREV, "mask_%s.npy" % clave),
                (m * 255 + 0.5).astype(np.uint8))
        g = C.geometria_monton(m)
        g["placa"] = list(placa.size)
        # rango de encuadre posible: f = ancho del monton / ancho de ventana
        g["f_min"] = g["pw"] / (placa.height * 16.0 / 9.0)
        g["f_max"] = g["pw"] / C.ANCHO
        geo[clave] = g
        print("%-9s placa=%s  pw=%.0f  centro=(%.0f,%.0f)  f=[%.2f, %.2f]"
              % (clave, placa.size, g["pw"], g["pcx"], g["pcy"],
                 g["f_min"], g["f_max"]))
        if clave.startswith("Z_"):     # overlay para revisar las fotos nuevas
            ov = np.asarray(placa, np.float32)
            ov[..., 1] = ov[..., 1] * (1 - 0.55 * m) + 255 * 0.55 * m
            Image.fromarray(ov.astype(np.uint8)).resize((760, 336), Image.LANCZOS) \
                .save(os.path.join(C.PREV, "mask_%s.jpg" % clave), quality=82)

    with open(os.path.join(C.PREV, "geometria.json"), "w") as f:
        json.dump(geo, f, indent=1)
    lo = max(g["f_min"] for g in geo.values())
    hi = min(g["f_max"] for g in geo.values())
    print("\nEncuadre comun posible: f entre %.3f y %.3f" % (lo, hi))

    # ---- color real de la cereza madura, medido de la fotografia ----
    real = C.cargar_placa(os.path.join(FOTOS, "cereza.jpeg"), ALTO_PLACA["Z_cereza"])
    mr = np.load(os.path.join(C.PREV, "mask_Z_cereza.npy")).astype(np.float32) / 255.0
    lab = C.rgb_a_lab(np.asarray(real, np.float32) / 255.0)
    sel = (mr > 0.6) & (lab[..., 0] > 16) & (lab[..., 0] < 68)
    a_obj = float(np.median(lab[..., 1][sel]))
    b_obj = float(np.median(lab[..., 2][sel]))
    print("color real de la cereza: a*=%.1f  b*=%.1f" % (a_obj, b_obj))
    with open(os.path.join(C.PREV, "color_cereza.json"), "w") as f:
        json.dump({"a": a_obj, "b": b_obj}, f)

    # ---- cereza madura sintetica (para el monton de cereza seca) ----
    placa = C.cargar_placa(os.path.join(FOTOS, "20260820_125611.jpg"), ALTO_DEF)
    m = np.load(os.path.join(C.PREV, "mask_A_cereza.npy")).astype(np.float32) / 255.0
    madura = C.cereza_madura(placa, m, fuerza=1.0, a_obj=a_obj, b_obj=b_obj)
    madura.save(os.path.join(C.SALIDA, "cereza_madura_placa.jpg"), quality=95)
    madura.resize((760, 343), Image.LANCZOS).save(
        os.path.join(C.PREV, "cereza_madura.jpg"), quality=88)
    print("cereza madura lista")
