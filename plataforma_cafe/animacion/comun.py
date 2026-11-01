# -*- coding: utf-8 -*-
"""
Utilidades comunes para la secuencia "Del cafe en cereza al cafe molido".
Color (sRGB<->Lab), mascaras de monton, grading de cereza madura y placas base.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# El trabajo intermedio va a un directorio de trabajo (scratchpad); los
# entregables finales se copian despues a animacion/salida.
TRABAJO = os.environ.get(
    "CAFE_TRABAJO",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "trabajo"))
PREV = os.path.join(TRABAJO, "prev")
SALIDA = os.path.join(TRABAJO, "salida")
os.makedirs(PREV, exist_ok=True)
os.makedirs(SALIDA, exist_ok=True)

ANCHO, ALTO = 1920, 1080
FPS = 30
DURACION = 30.0
PLACA_H = 1512  # 1.4x de 1080 -> siempre se reduce, nunca se amplia

# ---------------------------------------------------------------- color -----
_M_RGB2XYZ = np.array([[0.4124564, 0.3575761, 0.1804375],
                       [0.2126729, 0.7151522, 0.0721750],
                       [0.0193339, 0.1191920, 0.9503041]], dtype=np.float32)
_M_XYZ2RGB = np.linalg.inv(_M_RGB2XYZ).astype(np.float32)
_WP = np.array([0.95047, 1.00000, 1.08883], dtype=np.float32)
_EPS = np.float32(216.0 / 24389.0)
_KAP = np.float32(24389.0 / 27.0)


def srgb_a_lineal(c):
    c = np.asarray(c, dtype=np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(np.float32)


def lineal_a_srgb(c):
    c = np.clip(np.asarray(c, dtype=np.float32), 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055).astype(np.float32)


def rgb_a_lab(rgb01):
    """rgb01: HxWx3 float32 en [0,1] -> Lab (L 0..100, a/b ~ -128..128)."""
    lin = srgb_a_lineal(rgb01)
    xyz = lin @ _M_RGB2XYZ.T
    r = xyz / _WP
    f = np.where(r > _EPS, np.cbrt(np.maximum(r, 1e-8)), (_KAP * r + 16.0) / 116.0).astype(np.float32)
    L = 116.0 * f[..., 1] - 16.0
    a = 500.0 * (f[..., 0] - f[..., 1])
    b = 200.0 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], axis=-1).astype(np.float32)


def lab_a_rgb(lab):
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    fy = (L + 16.0) / 116.0
    fx = fy + a / 500.0
    fz = fy - b / 200.0
    def finv(f):
        f3 = f ** 3
        return np.where(f3 > _EPS, f3, (116.0 * f - 16.0) / _KAP).astype(np.float32)
    xyz = np.stack([finv(fx), finv(fy), finv(fz)], axis=-1) * _WP
    lin = xyz @ _M_XYZ2RGB.T
    return np.clip(lineal_a_srgb(lin), 0.0, 1.0)


def suave(x, a=0.0, b=1.0):
    """smoothstep entre a y b."""
    t = np.clip((np.asarray(x, dtype=np.float32) - a) / max(b - a, 1e-6), 0.0, 1.0)
    return (t * t * (3.0 - 2.0 * t)).astype(np.float32)


# ---------------------------------------------------------------- placas ----
def cargar_placa(ruta, alto=PLACA_H):
    """Carga la foto original y la lleva a una placa de trabajo de alto fijo."""
    im = Image.open(ruta)
    ancho = int(round(im.width * alto / im.height))
    im.draft("RGB", (ancho, alto))     # decodificado DCT a la escala mas cercana
    im = im.convert("RGB")
    if im.size != (ancho, alto):
        im = im.resize((ancho, alto), Image.LANCZOS)
    return im


def geometria_monton(mascara):
    """
    Posicion y tamano del monton dentro de la placa, en pixeles de placa.
    Es lo que permite encuadrar la camara respecto del cafe y no del centro
    de la foto: con esto todas las tomas comparten encuadre y la disolvencia
    se lee como una transformacion del mismo monton.
    """
    m = np.asarray(mascara, dtype=np.float32)
    h, w = m.shape
    cols = m.sum(axis=0)
    filas = m.sum(axis=1)
    ix = np.where(cols > cols.max() * 0.06)[0]
    iy = np.where(filas > filas.max() * 0.06)[0]
    tot = max(float(m.sum()), 1e-6)
    return {
        "pw": float(ix[-1] - ix[0]),
        "ph": float(iy[-1] - iy[0]),
        "pcx": float((cols * np.arange(w)).sum() / tot),
        "pcy": float((filas * np.arange(h)).sum() / tot),
    }


# -------------------------------------------------------------- mascaras ----
def _otsu(x):
    h, bordes = np.histogram(x, bins=256)
    h = h.astype(np.float64)
    centros = (bordes[:-1] + bordes[1:]) / 2.0
    w0 = np.cumsum(h)
    w1 = w0[-1] - w0
    m0 = np.cumsum(h * centros) / np.maximum(w0, 1e-9)
    mt = (h * centros).sum()
    m1 = (mt - np.cumsum(h * centros)) / np.maximum(w1, 1e-9)
    var = w0 * w1 * (m0 - m1) ** 2
    return float(centros[int(np.argmax(var))])


def mascara_monton(placa, cx=0.50, cy=0.60, sx=0.45, sy=0.44, plumon=9.0, encoger=0):
    """
    Mascara suave del monton de cafe (o cerezas) sobre la mesa.
    Modelo: distancia robusta en Lab respecto al color del borde (mesa) +
    prior espacial gaussiano centrado en el monton.
    Devuelve float32 0..1 al tamano de la placa.
    """
    esc = 480.0 / placa.width
    ch, cw = max(1, int(placa.height * esc)), 480
    peq = np.asarray(placa.resize((cw, ch), Image.BILINEAR), dtype=np.float32) / 255.0
    lab = rgb_a_lab(peq)

    # muestras de fondo: anillo perimetral
    borde = np.zeros((ch, cw), dtype=bool)
    mx, my = int(cw * 0.07), int(ch * 0.06)
    borde[:my, :] = True
    borde[-my:, :] = True
    borde[:, :mx] = True
    borde[:, -mx:] = True
    muestras = lab[borde]
    med = np.median(muestras, axis=0)
    mad = np.median(np.abs(muestras - med), axis=0) * 1.4826
    mad = np.maximum(mad, np.array([3.0, 1.4, 1.8], dtype=np.float32))

    d = np.sqrt(((lab - med) / mad) ** 2 @ np.array([1.0, 1.35, 1.35], dtype=np.float32))
    d = ndi.gaussian_filter(d, 2.0)

    yy, xx = np.mgrid[0:ch, 0:cw].astype(np.float32)
    xx = xx / cw
    yy = yy / ch
    prior = np.exp(-(((xx - cx) / sx) ** 2 + ((yy - cy) / sy) ** 2)).astype(np.float32)
    score = d * (0.35 + 0.65 * prior)

    thr = _otsu(score)
    m = score > max(thr, 0.9)
    m = ndi.binary_opening(m, np.ones((3, 3)), iterations=2)
    m = ndi.binary_closing(m, np.ones((5, 5)), iterations=3)
    lab_c, n = ndi.label(m)
    if n > 0:
        tam = ndi.sum(m, lab_c, range(1, n + 1))
        m = lab_c == (int(np.argmax(tam)) + 1)
    m = ndi.binary_fill_holes(m)

    frac = m.mean()
    if frac < 0.04 or frac > 0.80:  # fallback elipse central
        m = (((xx - cx) / (sx * 0.78)) ** 2 + ((yy - cy) / (sy * 0.78)) ** 2) < 1.0

    if encoger > 0:  # evita que el grading se derrame sobre la mesa
        m = ndi.binary_erosion(m, np.ones((3, 3)), iterations=int(encoger))

    mf = ndi.gaussian_filter(m.astype(np.float32), 4.5)
    mf = np.clip((mf - 0.22) / 0.56, 0.0, 1.0)
    grande = Image.fromarray((mf * 255).astype(np.uint8)).resize(placa.size, Image.BILINEAR)
    g = np.asarray(grande, dtype=np.float32) / 255.0
    if plumon > 0:
        g = ndi.gaussian_filter(g, plumon)
    return np.clip(g, 0.0, 1.0)


# ------------------------------------------------- cereza madura (grading) --
def _campo_variacion(tam, semilla, beta=2.4, alto=140):
    """Campo suave 0..1 al tamano de la placa, para variar el tono por fruto."""
    ancho = int(alto * tam[0] / tam[1])
    n = ruido_fractal(alto, ancho, beta=beta, semilla=semilla)
    im = Image.fromarray((n * 255).astype(np.uint8)).resize(tam, Image.BICUBIC)
    n = np.asarray(im, dtype=np.float32) / 255.0
    n -= n.mean()
    s = max(float(np.std(n)), 1e-6)
    return np.clip(n / (s * 3.2) + 0.5, 0.0, 1.0)


def cereza_madura(placa, mascara, fuerza=1.0, a_obj=54.0, b_obj=40.0, oscurecer=0.0):
    """
    Convierte la cereza seca en cereza madura: conserva forma, textura e
    iluminacion (canal L) y reemplaza la cromaticidad por un rojo profundo,
    modulado por luminancia (sombras oscuras, brillos especulares limpios).
    """
    rgb = np.asarray(placa, dtype=np.float32) / 255.0
    lab = rgb_a_lab(rgb)
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]

    # ventana de croma: nada en sombras profundas, nada en especulares
    w = suave(L, 6.0, 34.0) * (1.0 - 0.72 * suave(L, 70.0, 93.0))

    # maduracion despareja: unos frutos mas escarlata, otros mas anaranjados
    v1 = _campo_variacion(placa.size, semilla=11, beta=2.4, alto=150)
    v2 = _campo_variacion(placa.size, semilla=29, beta=2.2, alto=110)
    a_loc = a_obj + 7.0 * (v1 - 0.5) * 2.0
    b_loc = b_obj + 16.0 * (v2 - 0.5) * 2.0 + 6.0 * (v1 - 0.5) * 2.0

    k = fuerza * w
    a_n = a * 0.16 + a_loc * k
    b_n = b * 0.16 + b_loc * k * (0.55 + 0.45 * suave(L, 20.0, 62.0))

    # vida: micro-contraste y brillo humedo
    Lm = float(np.average(L, weights=np.maximum(mascara, 1e-6)))
    L_n = Lm + (L - Lm) * (1.0 + 0.13 * fuerza)
    L_n = L_n + 5.5 * fuerza * suave(L, 62.0, 88.0)     # sheen ceroso
    L_n = L_n - 3.0 * fuerza * (1.0 - suave(L, 4.0, 26.0))  # sombras mas ricas
    L_n = L_n - oscurecer                                   # deshidratacion
    L_n = np.clip(L_n, 0.0, 100.0)

    grad = lab_a_rgb(np.stack([L_n, a_n, b_n], axis=-1))
    m = mascara[..., None]
    fin = rgb * (1.0 - m) + grad * m
    return Image.fromarray((np.clip(fin, 0, 1) * 255 + 0.5).astype(np.uint8))


# -------------------------------------------------- continuidad cromatica ---
def ajustar_hacia(placa, objetivo_lab, fuerza_ab=0.28, fuerza_L=0.16, banda=384):
    """
    Acerca parcialmente la media Lab de la placa a un objetivo comun.
    Se procesa por bandas horizontales: las placas nativas llegan a 38 Mpx y
    una conversion Lab de toda la imagen a la vez dispara la memoria.
    """
    d = objetivo_lab - media_lab(placa)
    ajuste = np.array([d[0] * fuerza_L, d[1] * fuerza_ab, d[2] * fuerza_ab],
                      dtype=np.float32)
    ancho, alto = placa.size
    salida = np.empty((alto, ancho, 3), dtype=np.uint8)
    fuente = np.asarray(placa, dtype=np.uint8)
    for y in range(0, alto, banda):
        y1 = min(y + banda, alto)
        lab = rgb_a_lab(fuente[y:y1].astype(np.float32) / 255.0)
        lab += ajuste
        salida[y:y1] = (lab_a_rgb(lab) * 255 + 0.5).astype(np.uint8)
    return Image.fromarray(salida)


def media_lab(placa):
    rgb = np.asarray(placa.resize((320, 180), Image.BILINEAR), dtype=np.float32) / 255.0
    return rgb_a_lab(rgb).reshape(-1, 3).mean(axis=0)


# ------------------------------------------------------- ruido fractal ------
def ruido_fractal(alto, ancho, beta=2.1, semilla=7):
    """Ruido fractal periodico (via FFT) normalizado a 0..1. Tileable."""
    rng = np.random.default_rng(semilla)
    fy = np.fft.fftfreq(alto)[:, None]
    fx = np.fft.rfftfreq(ancho)[None, :]
    f = np.sqrt(fy ** 2 + fx ** 2)
    f[0, 0] = 1.0
    amp = f ** (-beta / 2.0)
    amp[0, 0] = 0.0
    fase = rng.uniform(0, 2 * np.pi, size=amp.shape)
    espectro = amp * (np.cos(fase) + 1j * np.sin(fase))
    campo = np.fft.irfft2(espectro, s=(alto, ancho)).astype(np.float32)
    # normalizar por desviacion (min-max aplastaria todo el rango contra 0.5)
    campo -= campo.mean()
    campo /= max(float(np.std(campo)) * 3.0, 1e-8)
    return np.clip(campo + 0.5, 0.0, 1.0)
