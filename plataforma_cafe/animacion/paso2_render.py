# -*- coding: utf-8 -*-
"""
PASO 2 - Render de la secuencia cinematografica de 30 s (1920x1080 @ 30 fps).

  0.0 - 4.0  Cereza madura   (grading sobre la foto real de cereza seca)
  4.0 - 8.0  Secado          (la cereza pierde humedad y vuelve a la foto original)
  8.0 -14.0  Beneficiado     (pergamino -> grano verde)
 14.0 -22.0  Tostado         (con vapor procedural ascendente)
 22.0 -30.0  Molienda        (cierre: acercamiento a la textura del molido)

La camara NO encuadra el centro de cada foto sino el MONTON: todas las tomas
comparten posicion y tamano en pantalla, y el movimiento es una unica
aproximacion continua a lo largo de los 30 s. Asi la disolvencia no se lee
como un cambio de imagen sino como la transformacion del mismo cafe.

Uso:
  python paso2_render.py               -> render completo a MP4
  python paso2_render.py --still 16.0  -> exporta un fotograma de prueba
"""
import os
import sys
import json
import math
import subprocess
import time
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import comun as C
from paso1_diseno import PLAN, FOTOS, alto_de

W, H = C.ANCHO, C.ALTO
FPS = C.FPS
NFRAMES = int(round(C.DURACION * FPS))

# --------------------------------------------------------------- guion ------
# f_fijo: tomas cuyo original es de baja resolucion (1600 px) y no admiten el
# encuadre cerrado comun; se encuadran a cuadro completo con su propia escala.
TOMAS = [
    dict(clave="Z_cereza", t_in=0.00, t_out=3.70, f_fijo=(0.749, 0.800), nitidez=0.55),
    dict(clave="A_cereza", t_in=2.90, t_out=9.70),
    dict(clave="B_pergam", t_in=8.90, t_out=12.50),
    dict(clave="C_verde",  t_in=11.80, t_out=15.20),
    dict(clave="D_tost1",  t_in=14.50, t_out=18.40),
    dict(clave="F_tost3",  t_in=17.70, t_out=21.50),
    dict(clave="G_molid1", t_in=20.80, t_out=24.50),
    dict(clave="H_molid2", t_in=23.80, t_out=27.40),
    dict(clave="Z_taza",   t_in=26.70, t_out=30.01, f_fijo=(0.470, 0.505), nitidez=0.55),
]

# La taza fotografiada ya tiene vapor real: solo se genera sobre el tostado.
VAPOR_T = (15.20, 16.60, 20.00, 21.40)
VAPOR_TOMAS = {"D_tost1", "F_tost3"}
VAPOR_MAX = 1.00

FUNDIDO_ENTRADA = 0.65
FUNDIDO_SALIDA = 0.80

# disolvencia: dispersion del umbral y amplitud del contra-alabeo (px)
DISOLV_SPREAD = 1.55
WARP_MAX = 7.0

ARCH = {k: a for k, a, *_ in PLAN}


# ------------------------------------------------------------- utilidades ---
def camara(t):
    """
    Un unico movimiento para toda la pieza.
      f  = ancho del monton / ancho de la ventana (mayor f = mas cerca)
      sx,sy = donde cae el centro del monton dentro del encuadre
    El rango 1.10-1.24 es el unico compatible con las ocho fotografias; el
    empujon final (27.2-30 s) solo actua cuando ya no hay transicion en curso.
    """
    p = min(max(t / 24.5, 0.0), 1.0)
    e = 0.45 * p + 0.55 * (p * p * (3.0 - 2.0 * p))
    f = 1.000 + 0.220 * e + 0.130 * float(C.suave(t, 24.6, 27.4))
    sx = 0.500 + 0.014 * math.sin(2 * math.pi * (0.075 * t + 0.12))
    sy = 0.660 + 0.012 * math.sin(2 * math.pi * (0.048 * t + 0.55))
    # durante el tostado el monton baja en el encuadre para dejar aire al vapor;
    # es una funcion del tiempo, no de la toma, asi que las dos capas de una
    # transicion siempre comparten el mismo encuadre
    sy += 0.075 * float(C.suave(t, 13.8, 15.9)) * (1.0 - float(C.suave(t, 20.0, 22.2)))
    return f, sx, sy


def ventana_monton(tam, geo, f, sx, sy):
    """Recorte 16:9 encuadrado respecto del monton, no del centro de la foto."""
    wp, hp = tam
    ww = min(geo["pw"] / f, float(wp), hp * 16.0 / 9.0)
    hw = ww * 9.0 / 16.0
    l = min(max(geo["pcx"] - sx * ww, 0.0), wp - ww)
    t = min(max(geo["pcy"] - sy * hw, 0.0), hp - hw)
    return (l, t, l + ww, t + hw)


def desplazar(box, dx, dy, dz, tam):
    """Desplaza/escala la ventana y la encaja dentro de la placa."""
    l, t, r, b = box
    cx, cy = (l + r) * 0.5 + dx, (t + b) * 0.5 + dy
    hw, hh = (r - l) * 0.5 / dz, (b - t) * 0.5 / dz
    wp, hp = tam
    if hw * 2.0 > wp or hh * 2.0 > hp:            # nunca mayor que la placa
        k = min(wp / (hw * 2.0), hp / (hh * 2.0))
        hw *= k; hh *= k
    cx = min(max(cx, hw), wp - hw)
    cy = min(max(cy, hh), hp - hh)
    return (cx - hw, cy - hh, cx + hw, cy + hh)


def recorta(im, box, filtro=Image.LANCZOS):
    return im.resize((W, H), filtro, box=box)


def muestrear(campo, X, Y):
    """Bilineal periodico sobre un campo 2D."""
    h, w = campo.shape
    x0 = np.floor(X).astype(np.int32)
    y0 = np.floor(Y).astype(np.int32)
    fx = (X - x0).astype(np.float32)
    fy = (Y - y0).astype(np.float32)
    x0 %= w; y0 %= h
    x1 = (x0 + 1) % w; y1 = (y0 + 1) % h
    return (campo[y0, x0] * (1 - fx) * (1 - fy) + campo[y0, x1] * fx * (1 - fy) +
            campo[y1, x0] * (1 - fx) * fy + campo[y1, x1] * fx * fy).astype(np.float32)


def muestrear_img(im, X, Y):
    """Bilineal con bordes fijados, sobre una imagen HxWx3."""
    h, w = im.shape[:2]
    X = np.clip(X, 0, w - 1.001)
    Y = np.clip(Y, 0, h - 1.001)
    x0 = X.astype(np.int32); y0 = Y.astype(np.int32)
    fx = (X - x0).astype(np.float32)[..., None]
    fy = (Y - y0).astype(np.float32)[..., None]
    x1 = np.minimum(x0 + 1, w - 1); y1 = np.minimum(y0 + 1, h - 1)
    return (im[y0, x0] * (1 - fx) * (1 - fy) + im[y0, x1] * fx * (1 - fy) +
            im[y1, x0] * (1 - fx) * fy + im[y1, x1] * fx * fy).astype(np.float32)


# ------------------------------------------------------------- escenario ----
class Escena:
    def __init__(self):
        print("Preparando placas...")
        with open(os.path.join(C.PREV, "geometria.json")) as f:
            self.geo = json.load(f)

        usadas = {s["clave"] for s in TOMAS}
        plan = [p for p in PLAN if p[0] in usadas]

        self.placas = {}
        self.masc = {}
        crudas = {}
        medias = []
        for clave, arch, *_ in plan:
            p = C.cargar_placa(os.path.join(FOTOS, arch), alto_de(clave))
            crudas[clave] = p
            medias.append(C.media_lab(p))
        objetivo = np.mean(np.array(medias), axis=0)
        print("  objetivo Lab comun: L=%.1f a=%.1f b=%.1f" % tuple(objetivo))

        for clave, arch, *_ in plan:
            p = C.ajustar_hacia(crudas[clave], objetivo, 0.26, 0.13)
            crudas[clave] = None
            m = np.load(os.path.join(C.PREV, "mask_%s.npy" % clave))
            self.placas[clave] = [p]
            self.masc[clave] = Image.fromarray(m)
            print("  %s listo %s" % (clave, p.size), flush=True)

        # Cereza: 3 estados (madura -> intermedia -> seca) para el secado
        base = self.placas["A_cereza"][0]
        mA = np.load(os.path.join(C.PREV, "mask_A_cereza.npy")).astype(np.float32) / 255.0
        with open(os.path.join(C.PREV, "color_cereza.json")) as f:
            col = json.load(f)      # cromaticidad medida en la cereza real
        madura = C.cereza_madura(base, mA, fuerza=1.00,
                                 a_obj=col["a"], b_obj=col["b"])
        mez = (0.52 * np.asarray(madura, np.float32) +
               0.48 * np.asarray(base, np.float32)) / 255.0
        lab = C.rgb_a_lab(mez)
        lab[..., 0] -= 5.0 * mA
        lab[..., 1] *= (1.0 - 0.16 * mA)
        lab[..., 2] *= (1.0 - 0.10 * mA)
        media = Image.fromarray((C.lab_a_rgb(lab) * 255 + 0.5).astype(np.uint8))
        del mez, lab, mA
        self.placas["A_cereza"] = [madura, media, base]
        madura.save(os.path.join(C.SALIDA, "cereza_madura_1080.jpg"), quality=95)

        # campos de ruido
        self.wisp = C.ruido_fractal(600, 1067, beta=2.15, semilla=3)
        self.turb = C.ruido_fractal(220, 391, beta=2.75, semilla=17)
        self._disolv = {}
        self._warp = {}

        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        self.gx, self.gy = xx, yy
        r = np.sqrt(((xx / W - 0.5) * 1.02) ** 2 + ((yy / H - 0.5) * 1.10) ** 2)
        self.vineta = (1.0 - 0.30 * C.suave(r, 0.34, 0.78))[..., None].astype(np.float32)
        self.rng = np.random.default_rng(2026)
        print("Placas listas.\n")

    # ---- campos por transicion (se guarda solo el vigente) ----
    def campo_disolv(self, idx):
        if idx not in self._disolv:
            self._disolv.clear()
            n = C.ruido_fractal(304, 540, beta=2.15, semilla=100 + idx * 7)
            im = Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
            self._disolv[idx] = np.asarray(im, dtype=np.float32) / 255.0
        return self._disolv[idx]

    def campo_warp(self, idx):
        """Desplazamiento suave para que las dos texturas fluyan una hacia la otra."""
        if idx not in self._warp:
            self._warp.clear()
            def sube(sem):
                n = C.ruido_fractal(108, 192, beta=2.7, semilla=sem)
                im = Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
                return np.asarray(im, dtype=np.float32) / 255.0 - 0.5
            self._warp[idx] = (sube(300 + idx * 11), sube(900 + idx * 11))
        return self._warp[idx]

    @staticmethod
    def pesos_cereza(t):
        """madura -> intermedia -> seca, ya con la cereza real establecida."""
        if t <= 7.00:
            k = float(C.suave(t, 4.80, 7.00))
            return [1.0 - k, k, 0.0]
        k = float(C.suave(t, 7.00, 9.00))
        return [0.0, 1.0 - k, k]

    # ---- render de una toma ----
    def toma(self, s, t):
        clave = s["clave"]
        e = (t - s["t_in"]) / (s["t_out"] - s["t_in"])
        f, sx, sy = camara(t)
        if "f_fijo" in s:      # original de baja resolucion: cuadro completo
            f0, f1 = s["f_fijo"]
            f = f0 + (f1 - f0) * (0.45 * e + 0.55 * (e * e * (3.0 - 2.0 * e)))
            sy = 0.500 + 0.010 * math.sin(2 * math.pi * (0.05 * t))

        placas = self.placas[clave]
        tam = placas[0].size
        box = ventana_monton(tam, self.geo[clave], f, sx, sy)
        ww = box[2] - box[0]

        # microparallax: el monton se mueve unos pixeles respecto de la mesa
        dx = ww * (-0.0016 + 0.0032 * e)
        dy = ww * (0.0006 - 0.0012 * e)
        dz = 1.0 + 0.003 * e
        if clave == "A_cereza":                       # merma por deshidratacion
            dz -= 0.0026 * float(C.suave(t, 4.8, 9.0))
        box_f = desplazar(box, dx, dy, dz, tam)

        if len(placas) == 1:
            fondo = np.asarray(recorta(placas[0], box), dtype=np.float32) / 255.0
            frente = np.asarray(recorta(placas[0], box_f), dtype=np.float32) / 255.0
        else:
            w = self.pesos_cereza(t)
            fondo = np.zeros((H, W, 3), np.float32)
            frente = np.zeros((H, W, 3), np.float32)
            for pl, k in zip(placas, w):
                if k <= 0.002:
                    continue
                fondo += k * (np.asarray(recorta(pl, box), dtype=np.float32) / 255.0)
                frente += k * (np.asarray(recorta(pl, box_f), dtype=np.float32) / 255.0)

        mk = np.asarray(recorta(self.masc[clave], box_f, Image.BILINEAR),
                        dtype=np.float32)[..., None] / 255.0
        img = fondo * (1.0 - mk) + frente * mk

        # luz viva sobre la cereza (deriva lenta, solo dentro del monton)
        if clave == "A_cereza":
            g = 0.5 + 0.5 * np.cos(2.6 * (self.gx / W - 0.5) +
                                   1.7 * (self.gy / H - 0.5) - 0.20 * t)
            img *= (1.0 + 0.055 * (g - 0.5) * mk[..., 0])[..., None]

        # las dos fotos de 1600 px se amplian ~1.6x: se recupera algo de micro-
        # contraste para que no canten frente al resto de la secuencia
        k = s.get("nitidez", 0.0)
        if k > 0.0:
            img = np.clip(img + k * (img - ndi.gaussian_filter(img, (1.2, 1.2, 0.0))),
                          0.0, 1.0)

        return np.clip(img, 0.0, 1.0), mk[..., 0]

    # ---- vapor procedural ----
    def vapor(self, img, mk, t):
        t0, t1, t2, t3 = VAPOR_T
        inten = float(C.suave(t, t0, t1)) * (1.0 - float(C.suave(t, t2, t3)))
        if inten <= 0.004:
            return img
        w2, h2 = W // 2, H // 2
        m = np.asarray(Image.fromarray((mk * 255).astype(np.uint8)).resize((w2, h2), Image.BILINEAR),
                       dtype=np.float32) / 255.0
        # erosion vertical: descarta filtraciones finas de la mascara (granos
        # del fondo) que falsearian la silueta desde donde nace el vapor
        solido = ndi.binary_erosion(m > 0.45, np.ones((7, 1)))
        hay = solido.any(axis=0)
        if hay.sum() < 8:
            return img
        cima = np.argmax(solido, axis=0).astype(np.float32)
        cima = np.where(hay, cima, float(np.median(cima[hay])))
        cima = ndi.uniform_filter1d(cima, 41, mode="nearest")
        cima = np.where(hay, cima, h2 + 999.0)

        yy, xx = np.mgrid[0:h2, 0:w2].astype(np.float32)
        alto = cima[None, :] - yy

        u = muestrear(self.turb, (xx * 0.30 + t * 5.0), (yy * 0.30 - t * 7.0)) - 0.5
        v = muestrear(self.turb, (xx * 0.30 + 133.0 - t * 3.0), (yy * 0.30 + 71.0 - t * 5.0)) - 0.5

        cols = np.where(hay)[0]
        cx = float(cols.mean())
        ancho = max(float(cols[-1] - cols[0]), 60.0)

        # Penachos: el vapor no es una sabana sobre el monton sino unas pocas
        # columnas que NACEN en la superficie del cafe, se inclinan y se abren
        # al subir. Las fuentes van dentro del 60 % central del monton.
        eh = np.zeros_like(xx)
        for k, (off, fase, anc) in enumerate((
                (-0.29, 0.0, 0.052), (-0.09, 1.7, 0.045),
                (0.11, 3.1, 0.050), (0.30, 4.6, 0.043))):
            inclina = 15.0 * math.sin(0.35 * t + fase) * np.clip(alto / 70.0, 0.0, 2.2)
            sig = ancho * anc * (1.0 + np.clip(alto, 0.0, None) / 55.0)
            peso = 0.62 + 0.38 * math.sin(0.23 * t + 2.1 * fase)
            eh += peso * np.exp(-((xx - (cx + off * ancho) - inclina) / sig) ** 2)
        eh = np.clip(eh, 0.0, 1.30)

        disipa = 1.0 - C.suave(alto, 50.0, 210.0)
        # nace en la superficie del cafe: algo de presencia por delante del grano
        # (donde el vapor si se ve, contra el fondo oscuro) y lleno al salir
        nace = C.suave(alto, -150.0, -10.0)
        sube = np.exp(-np.clip(alto, 0.0, None) / 110.0)     # denso abajo, tenue arriba

        env_sh = C.suave(alto, -8.0, 30.0) * disipa * np.clip(eh, 0.0, 1.0) * inten
        env_w = nace * sube * disipa * eh * inten

        peq = np.asarray(Image.fromarray((img * 255 + 0.5).astype(np.uint8))
                         .resize((w2, h2), Image.BILINEAR), dtype=np.float32) / 255.0
        fac = 1.0 + 2.6 * np.clip(alto / 130.0, 0.0, 1.4)
        dx = u * 2.0 * fac + 1.0 * np.sin(0.9 * t + yy * 0.05)
        dy = v * 0.9 * fac
        peq_d = muestrear_img(peq, xx + dx * env_sh, yy + dy * env_sh)
        peq_d = ndi.gaussian_filter(peq_d, (0.9, 0.9, 0.0))
        a_sh = ndi.gaussian_filter(np.clip(env_sh * 0.85, 0.0, 1.0), 2.0)

        amp = 6.0 + 40.0 * np.clip(alto / 160.0, 0.0, 1.6)
        # las volutas se estiran a medida que ascienden
        estira = 1.0 / (1.0 + np.clip(alto, 0.0, None) / 150.0)
        X = xx * 1.55 + u * amp + 9.0 * np.sin(0.42 * t + yy * 0.012)
        Y = yy * 1.55 * estira + v * amp * 0.5 - t * 34.0
        s = muestrear(self.wisp, X, Y)
        s2 = muestrear(self.wisp, X * 2.1 + 311.0, Y * 2.1 - t * 22.0)
        # al promediar dos octavas la varianza cae: se reexpande antes de
        # recortar, si no casi ningun pixel supera el umbral de la voluta
        s = 0.5 + (0.66 * s + 0.34 * s2 - 0.5) * 1.35
        a_w = np.clip((s - 0.40) / 0.30, 0.0, 1.0) ** 1.15
        a_w = ndi.gaussian_filter(a_w * env_w * VAPOR_MAX, 1.8)

        gr = np.asarray(Image.fromarray((np.clip(peq_d, 0, 1) * 255).astype(np.uint8))
                        .resize((W, H), Image.BICUBIC), dtype=np.float32) / 255.0
        A_sh = np.asarray(Image.fromarray((np.clip(a_sh, 0, 1) * 255).astype(np.uint8))
                          .resize((W, H), Image.BICUBIC), dtype=np.float32)[..., None] / 255.0
        A_w = np.asarray(Image.fromarray((np.clip(a_w, 0, 1) * 255).astype(np.uint8))
                         .resize((W, H), Image.BICUBIC), dtype=np.float32)[..., None] / 255.0

        out = img * (1.0 - A_sh) + gr * A_sh
        col = np.array([0.95, 0.94, 0.915], dtype=np.float32)
        return out * (1.0 - A_w) + (out * 0.32 + col * 0.68) * A_w

    # ---- acabado ----
    def acabado(self, img, t):
        img = np.clip(img, 0.0, 1.0)
        img = img * 0.82 + (img * img * (3.0 - 2.0 * img)) * 0.18
        img *= self.vineta
        g = self.rng.standard_normal((H // 2, W // 2)).astype(np.float32)
        g = np.asarray(Image.fromarray(np.clip(g * 40 + 128, 0, 255).astype(np.uint8))
                       .resize((W, H), Image.BILINEAR), dtype=np.float32)
        img += ((g - 128.0) / 128.0)[..., None] * 0.010
        k = float(C.suave(t, 0.0, FUNDIDO_ENTRADA)) * (1.0 - float(C.suave(t, C.DURACION - FUNDIDO_SALIDA, C.DURACION)))
        return np.clip(img * k, 0.0, 1.0)

    # ---- fotograma completo ----
    def frame(self, i):
        t = i / float(FPS)
        act = [s for s in TOMAS if s["t_in"] - 1e-6 <= t < s["t_out"]]
        if not act:
            act = [TOMAS[-1]]
        if len(act) == 1:
            img, mk = self.toma(act[0], t)
            vapor_on = act[0]["clave"] in VAPOR_TOMAS
        else:
            a, b = act[0], act[1]
            ia, ma = self.toma(a, t)
            ib, mb = self.toma(b, t)
            p = (t - b["t_in"]) / max(a["t_out"] - b["t_in"], 1e-6)
            idx = TOMAS.index(b)

            # contra-alabeo: las dos texturas fluyen una hacia la otra
            amp = WARP_MAX * math.sin(math.pi * p)
            if amp > 0.35:
                wx, wy = self.campo_warp(idx)
                ia = muestrear_img(ia, self.gx + wx * amp, self.gy + wy * amp)
                ib = muestrear_img(ib, self.gx - wx * amp, self.gy - wy * amp)

            n = 0.60 * self.campo_disolv(idx) + 0.40 * (1.0 - ia.mean(axis=2))
            sp = DISOLV_SPREAD
            al = np.clip((p * (1.0 + sp) - n * sp) / sp, 0.0, 1.0)[..., None]
            img = ia * (1.0 - al) + ib * al
            mk = ma * (1.0 - al[..., 0]) + mb * al[..., 0]
            vapor_on = (a["clave"] in VAPOR_TOMAS) or (b["clave"] in VAPOR_TOMAS)

        if vapor_on:
            img = self.vapor(img, mk, t)
        return self.acabado(img, t)


# ---------------------------------------------------------------- main ------
def main():
    esc = Escena()

    if "--still" in sys.argv:
        for v in sys.argv[sys.argv.index("--still") + 1:]:
            try:
                t = float(v)
            except ValueError:
                break
            f = esc.frame(int(round(t * FPS)))
            Image.fromarray((f * 255 + 0.5).astype(np.uint8)).save(
                os.path.join(C.PREV, "still_%05.2f.jpg" % t), quality=88)
            print("still %.2f s" % t)
        return

    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    destino = os.path.join(C.SALIDA, "cafe_cereza_a_molido_30s_1080p.mp4")
    cmd = [ff, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "%dx%d" % (W, H),
           "-r", str(FPS), "-i", "-",
           "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "16",
           "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1",
           "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
           "-movflags", "+faststart", destino]
    print("Render -> %s" % destino)
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL)
    t0 = time.time()
    for i in range(NFRAMES):
        f = esc.frame(i)
        proc.stdin.write((f * 255 + 0.5).astype(np.uint8).tobytes())
        if i % 30 == 0:
            el = time.time() - t0
            print("  %3d/%d  (%4.1f s)  %.2f s/frame" % (i, NFRAMES, i / float(FPS),
                                                         el / max(i, 1)), flush=True)
    proc.stdin.close()
    proc.wait()
    print("Listo en %.1f min -> %s" % ((time.time() - t0) / 60.0, destino))


if __name__ == "__main__":
    main()
