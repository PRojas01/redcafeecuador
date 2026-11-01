#!/usr/bin/env python3
"""
Red Café Ecuador — aplica la paleta Stradale (Starter V0.1) a la capa propia.

    python3 herramientas/tema-stradale-capa.py <public_html> [--comprobar]

La capa propia (redcafe-v60-final.css y algunos redcafe-*.js que inyectan
estilos) lleva los colores del tema «Origen» escritos a mano. Aquí se cambian
POR ROL con una tabla explícita, no por parecido de color:

  café oscuro (cabecera, pie, texto fuerte)  → rubí ámbar #8C1E0E (degradado #B4461E→#561008)
  ámbar/terracota de acento sobre papel      → rubí #8C1E0E (AA 8.2:1)
  ámbar claro sobre fondo oscuro             → cobre claro #F2BC8E (AA 5.4:1)
  papel / espuma                             → #F6F3EE / #EFE8E0

Verdes de estado, rojos de error y la franja de cata NO se tocan: son
señales, no marca. Las tipografías pasan a DM Sans por sus variables.

Es idempotente: una segunda pasada no cambia nada. --comprobar solo informa.
"""
import os
import re
import sys

ARCHIVOS = [
    "redcafe-v60-final.css",
    "redcafe-requerimientos.js",
    "redcafe-empleos.js",
    "redcafe-colapsables.js",
    "redcafe-v60-final.js",
    "redcafe-grafico-precios.js",
]

HEX = {
    # verdes del tema anterior (producción 20261001b) → espresso
    "#18251f": "#8c1e0e", "#111b16": "#561008", "#243a30": "#b4461e", "#1c2a23": "#701509",
    # café oscuro → espresso
    "#3b1a0c": "#8c1e0e",
    "#2a1207": "#561008",
    "#4a3526": "#25221f",
    "#2f2a24": "#25221f",
    "#5a2810": "#b4461e",
    "#1e120b": "#8c1e0e",
    "#2a170c": "#561008",
    "#55250f": "#b4461e",
    "#241b15": "#701509",
    "#21130c": "#701509",
    "#2f241f": "#25221f",
    "#4a3826": "#3a3530",
    # cafés medios usados como acento o texto → caramelo oscuro
    "#653017": "#6f4718",
    "#6b3413": "#6f4718",
    "#6b3d15": "#6f4718",
    "#6b3f1f": "#6f4718",
    "#7a4a12": "#6f4718",
    "#7a4a1a": "#6f4718",
    "#8a3f05": "#6f4718",
    # acento terracota/ámbar sobre papel → caramelo oscuro
    "#7a3411": "#8c1e0e",
    "#a94e17": "#8c1e0e",
    "#8e4416": "#6f4718",
    "#9c4515": "#8c1e0e",
    "#bc5a1e": "#b4461e",
    "#8a5310": "#8c1e0e",
    "#9a3412": "#8c1e0e",
    "#b86e2a": "#b4461e",
    "#b86d2a": "#b4461e",
    "#b06a12": "#b4461e",
    # ámbar claro (sobre oscuro) → dorado / caramelo Stradale
    "#dfa066": "#f6cda6",
    "#d98e52": "#f2bc8e",
    "#d4893f": "#f2bc8e",
    "#e9c9a6": "#f8dccb",
    # papel
    "#fbfaf7": "#f7f4ef",
    "#f3f1ea": "#efeae1",
    "#e4e1d9": "#e4ddd2",
    "#f6ede9": "#f5ecdd",
    "#14140f": "#222222",
    # grises de texto secundario que no llegaban a AA sobre crema
    "#7d7a70": "#5e5850",
    "#8a8377": "#6a645b",
    # verde de enlaces de la capa: 4.1–4.5:1 sobre crema → verde de marca (AA)
    "#587a35": "#3f6b4a",
    # espresso recién hecho (20261002) → ámbar filtrado (20261005, foto de referencia)
    # ámbar filtrado (20261005 v1) → rubí ámbar (recalibrado con la foto: tono 6–14°)
    "#7e2a10": "#8c1e0e",
    "#5c1a0b": "#561008",
    "#9c3e16": "#b4461e",
    "#6b220d": "#701509",
    "#9a3a12": "#8c1e0e",
    "#8f3414": "#8c1e0e",
    "#b5521e": "#b4461e",
    "#e8b26a": "#f2bc8e",
    "#f0c27e": "#f6cda6",
    "#f6dcc0": "#f8dccb",
    "#d99a50": "#e0a070",
    "#f3c784": "#f7cba0",
    # verdes decorativos (no de estado) → ámbar: borde de tarjetas de perfil, botones de academia
    "#2f5f3a": "#8c1e0e", "#0f3d1e": "#8c1e0e", "#154f2c": "#8c1e0e",
    "#3b2318": "#8c1e0e",
    "#2c1a12": "#561008",
    "#5a3523": "#b4461e",
    "#45291c": "#701509",
    "#8e5328": "#8c1e0e",
    "#b87440": "#b4461e",
    "#dda35e": "#f2bc8e",
    "#e3ae6b": "#f6cda6",
    "#f0dcc0": "#f8dccb",
    "#7a4424": "#8c1e0e",
    # espresso sobreextraído (20261001c–f) → espresso recién hecho (20261002)
    "#21170f": "#8c1e0e",
    "#160f0a": "#561008",
    "#33251a": "#b4461e",
    "#2a1d13": "#701509",
    "#8a5a22": "#8c1e0e",
    "#b07a39": "#b4461e",
    "#ca8e46": "#f2bc8e",
    "#d7a158": "#f6cda6",
    "#ead7b8": "#f8dccb",
}
# rgba(59,26,12,a) → rgba(33,23,15,a)  (café oscuro translúcido)
RGBA = [(re.compile(r"rgba\(\s*59\s*,\s*26\s*,\s*12\s*,"), "rgba(140,30,14,"),
        (re.compile(r"rgba\(\s*61\s*,\s*35\s*,\s*20\s*,"), "rgba(140,30,14,"),
        (re.compile(r"rgba\(\s*30\s*,\s*18\s*,\s*11\s*,"), "rgba(140,30,14,"),
        (re.compile(r"rgba\(\s*24\s*,\s*37\s*,\s*31\s*,"), "rgba(140,30,14,"),
        (re.compile(r"rgba\(\s*33\s*,\s*23\s*,\s*15\s*,"), "rgba(140,30,14,"),
        (re.compile(r"rgba\(\s*59\s*,\s*35\s*,\s*24\s*,"), "rgba(140,30,14,"),
        (re.compile(r"rgba\(\s*126\s*,\s*42\s*,\s*16\s*,"), "rgba(140,30,14,")]
# Tríos rgb()/rgba() café → verde (se conserva la opacidad si la hay).
TRIOS = {
    (16, 8, 4): (12, 8, 5), (20, 12, 6): (18, 12, 8), (30, 16, 8): (27, 19, 12),
    (24, 16, 10): (24, 16, 10), (28, 20, 12): (27, 19, 12), (36, 23, 17): (140, 30, 14),
    (74, 53, 38): (58, 53, 48), (122, 52, 17): (138, 90, 34), (88, 122, 53): (63, 107, 74),
    (24, 37, 31): (140, 30, 14), (33, 23, 15): (140, 30, 14), (59, 35, 24): (140, 30, 14), (126, 42, 16): (140, 30, 14),
}
TRIORE = re.compile(r"(rgba?\(\s*)(\d+)(\s*,\s*)(\d+)(\s*,\s*)(\d+)")


def _trio(m):
    t = (int(m.group(2)), int(m.group(4)), int(m.group(6)))
    if t not in TRIOS:
        return m.group(0)
    r, g, b = TRIOS[t]
    return f"{m.group(1)}{r}{m.group(3)}{g}{m.group(5)}{b}"


HEXRE = re.compile(r"#(?:" + "|".join(h[1:] for h in HEX) + r")\b", re.I)

FUENTE = 'var(--font-dm-sans), "DM Sans", system-ui, sans-serif'
FUENTES = [
    (re.compile(r'"DM Serif Display"\s*,\s*Georgia\s*,\s*serif'), FUENTE),
    (re.compile(r'var\(--rc-titulo,\s*"DM Serif Display"\)'), 'var(--rc-titulo, "DM Sans")'),
    (re.compile(r'var\(--rc-texto,\s*"Inter"\)'), 'var(--rc-texto, "DM Sans")'),
]
# Las variables de la capa apuntan a DM Sans (se añade una sola vez al final).
BLOQUE = """
/* ═══ Tema Stradale (Starter V0.1) — tipografía única DM Sans ═══ */
/* DM Sans variable, alojada en el sitio (CSP 'self'). */
@font-face { font-family: "DM Sans"; src: url("/fonts/dm-sans-latin.woff2") format("woff2");
  font-weight: 300 700; font-style: normal; font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: "DM Sans"; src: url("/fonts/dm-sans-latin-ext.woff2") format("woff2");
  font-weight: 300 700; font-style: normal; font-display: swap;
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }
/* Variables del React compilado (Tailwind v4 las define en @layer theme;
   esta regla sin capa las redefine sin recompilar). Mapeo por rol. */
:root {
  --color-crema: #f6f3ee; --color-crema-oscuro: #efe8e0; --color-arena: #e6d9cc;
  --color-pizarra: #222222; --color-pizarra-suave: #5E5850;
  --color-cafe: #8c1e0e; --color-cafe-oscuro: #561008; --color-tostado: #615B53; --color-tostado-claro: #efe8e0;
  --color-latte: #8c1e0e; --color-latte-texto: #5E5850; --color-latte-claro: #F8E8D8; --color-miel: #8c1e0e;
  --color-cereza: #8c1e0e; --color-cereza-roja: #8c1e0e; --color-cereza-roja-suave: #F8E8D8;
  --color-filtrado-900: #561008; --color-filtrado-800: #8c1e0e; --color-filtrado-600: #8c1e0e;
  --color-filtrado-500: #b4461e; --color-filtrado-300: #f2bc8e; --color-filtrado-100: #f8dccb;
  --color-acento-claro: #f6cda6; --color-hoja-clara: #C2EBC8;
  --color-coffee-950: #561008; --color-coffee-900: #8c1e0e; --color-coffee-800: #b4461e;
  --color-coffee-700: #8c1e0e; --color-coffee-600: #b4461e; --color-gold-500: #f2bc8e;
  --color-text-primary: #222222; --color-text-secondary: #5E5850; --color-text-muted: #615B53;
  --color-cream-50: #FCF9F4; --color-cream-100: #f6f3ee; --color-cream-200: #efe8e0; --color-sand-300: #e6d9cc;
  --color-surface-soft: #FCF9F4; --color-border-soft: #e6d9cc;
  --font-titulo: "DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-cuerpo: "DM Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-marca: "DM Sans", system-ui, sans-serif;
  --rc-titulo: "DM Sans", system-ui, sans-serif;
  --rc-texto: "DM Sans", system-ui, sans-serif;
}
/* Componentes de React (antes en globals.css del fuente). */
.btn-primary, .btn-accent, .btn-ghost, a.min-h-11.border, button.min-h-11.border {
  font-size: .8125rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; border-radius: 0;
}
.btn-primary { background: #8c1e0e; border-color: #8c1e0e; color: #f6f3ee; }
.btn-primary:hover { background: #561008; }
.btn-accent { background: #f2bc8e; border-color: #f2bc8e; color: #8c1e0e; }
.btn-accent:hover { background: #f6cda6; border-color: #f6cda6; }
.btn-ghost { border-color: rgba(140,30,14,.45); color: #8c1e0e; }
:is(.hero-gradient, .bg-cafe, .bg-cafe-oscuro, .bg-filtrado-800, .bg-filtrado-900, .bg-coffee-950, .bg-coffee-900) .btn-primary {
  background: #f2bc8e; border-color: #f2bc8e; color: #8c1e0e; }
:is(.hero-gradient, .bg-cafe, .bg-cafe-oscuro, .bg-filtrado-800, .bg-filtrado-900, .bg-coffee-950, .bg-coffee-900) .btn-ghost {
  color: #f6f3ee; border-color: rgba(247,244,239,.45); }
.badge { border-radius: 0; background: transparent; color: #8c1e0e; border: 1px solid rgba(242,188,142,.55);
  font-size: .6875rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
footer a.rounded-full { border-radius: 0; }
/* En secciones verdes, «cereza» (verde) era invisible: p. ej. la bajada del
   precio en la barra. Ahí pasa a rojo claro (7.3:1). */
:is(.hero-gradient, .bg-cafe, .bg-cafe-oscuro, .bg-filtrado-800, .bg-filtrado-900) .text-cereza { color: #FFCABF; }
h1 { font-weight: 400; letter-spacing: -.035em; }
h2 { font-weight: 500; letter-spacing: -.025em; }
h3 { font-weight: 600; letter-spacing: -.015em; }
/* Botones y tarjetas de acceso de la capa propia: rectos, voz Stradale. */
.redcafe-acceso-btn {
  border-radius: 0 !important;
  font-size: .8125rem;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.redcafe-acceso-card { border-radius: 0 !important; }
/* La capa oscurece el hero del marketplace (section:first-child); su botón
   primario verde quedaba invisible sobre el verde. Ahí va en caramelo. */
body[data-redcafe-route="/marketplace/"] main > div > section:first-child .btn-primary {
  background: var(--color-filtrado-300, #f2bc8e) !important;
  border-color: var(--color-filtrado-300, #f2bc8e) !important;
  color: var(--color-cafe, #8c1e0e) !important;
}
/* Cabecera casi opaca (Starter: 94 %): la capa la dejaba al 80 % y sobre
   contenido claro el dorado de «Ecuador» caía a 3.1:1. */
html:not(#rc-t1):not(#rc-t2):not(#rc-t3) body > header.sticky { background-color: rgba(140,30,14,.90) !important;
  -webkit-backdrop-filter: blur(14px) saturate(150%); backdrop-filter: blur(14px) saturate(150%); }
/* Caramelo claro solo sirve sobre verde; sobre crema, el caramelo oscuro (AA). */
.redcafe-acceso-rotulo,
.redcafe-acceso-pie a { color: #8c1e0e !important; }
.redcafe-precio-equivalente.es-falta { color: #6a645b !important; }
/* Ajustes finos para no bajar de AA donde el fondo crema es más oscuro. */
.redcafe-muro-sello { color: #8c1e0e !important; }
.redcafe-bloque-lista a { color: #3f6b4a !important; }
/* Tarjetas, avisos y controles de la capa: cantos rectos como el Starter. */
.redcafe-curso-card,
.redcafe-service-card,
.redcafe-home-price-metric,
#redcafe-avisopago-fijo,
main article,
main :is(select, input:not([type=checkbox]):not([type=radio]), textarea) {
  border-radius: 0 !important;
}
.redcafe-home-price-inner a {
  border-radius: 0 !important;
  font-size: .8125rem;
  letter-spacing: .06em;
  text-transform: uppercase;
}
/* Titulares ligeros (Stradale). La capa los fuerza a 700 con !important y
   selectores html:not(#rc-t1):not(#rc-t2); aquí uno más gana solo para
   h1–h3. Las negritas de texto (strong, b) no se tocan. */
html:not(#rc-t1):not(#rc-t2):not(#rc-t3) body :is(main, [data-redcafe-propio]) h1 { font-weight: 400 !important; letter-spacing: -.035em; }
html:not(#rc-t1):not(#rc-t2):not(#rc-t3) body :is(main, [data-redcafe-propio]) h2 { font-weight: 500 !important; letter-spacing: -.025em; }
html:not(#rc-t1):not(#rc-t2):not(#rc-t3) body :is(main, [data-redcafe-propio]) h3 { font-weight: 600 !important; }
/* ═ Ámbar filtrado (foto de referencia: café de especialidad en jarra de vidrio):
   cuerpo ámbar rojizo con luz anaranjada arriba, translúcido; miel como acento.
   AA: texto claro 9,4:1 sobre #8c1e0e, miel 6,9:1, enlaces #8c1e0e 6,4:1. ═ */
.hero-gradient, body > footer, footer.bg-cafe, .bg-coffee-950, .bg-filtrado-900 {
  /* Promedio medido ≈ rgb(142,50,37), el del líquido de la foto: borde cobre
     tenue arriba, cuerpo rubí, fondo profundo. */
  background-image: radial-gradient(110% 55% at 50% -12%, rgba(202,131,85,.22), rgba(202,131,85,0) 60%),
                    linear-gradient(170deg, #9a2c16 0%, #8c1e0e 40%, #6e160b 75%, #561008 100%) !important;
}
.bg-cafe:not(footer), .bg-coffee-900, .bg-filtrado-800 {
  background-image: linear-gradient(170deg, rgba(154,44,22,.45), rgba(86,16,8,.15));
}
.btn-accent, :is(.hero-gradient, .bg-cafe, .bg-cafe-oscuro, .bg-filtrado-800, .bg-filtrado-900, .bg-coffee-950, .bg-coffee-900) .btn-primary {
  background-image: linear-gradient(180deg, #f7cba0 0%, #f2bc8e 55%, #e0a070 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 6px 18px -8px rgba(224,160,112,.7);
}
.btn-primary { box-shadow: inset 0 1px 0 rgba(255,255,255,.12); }
::selection { background: rgba(242,188,142,.45); color: #561008; }
/* Móvil: con una sección o formulario abierto, su botón «Ocultar…» / «Cerrar
   formulario» se queda pegado arriba al hacer scroll; nadie queda atrapado
   en un formulario largo. */
.redcafe-col-boton[aria-expanded="true"], .redcafe-form-abrir[aria-expanded="true"], .redcafe-pub-toggle[aria-expanded="true"] {
  position: sticky !important; top: var(--rc-alto-cabecera, 74px); z-index: 6;
  background: rgba(246,243,238,.94) !important; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  box-shadow: 0 8px 14px -12px rgba(86,16,8,.55);
}
/* ═ Menos superficie oscura (antes 45–58 % de la portada): cifras y precio de
   referencia pasan a claro con acentos ámbar.
   Oscuro solo cabecera, portada principal, «confianza» y pie. ═ */
.redcafe-cifras { background: #efe8e0 !important; color: #2B1A12 !important; border-top: 1px solid rgba(140,30,14,.18) !important; border-bottom: 1px solid rgba(140,30,14,.12); }
.redcafe-cifras :is(strong, b, [class*="num"], [class*="valor"]) { color: #8c1e0e !important; }
.redcafe-cifras :is(span, small, p):not([class*="num"]):not([class*="valor"]) { color: #5E5850 !important; }
.redcafe-home-price-strip { background: #f6f3ee !important; color: #2B1A12 !important; border-color: rgba(140,30,14,.18) !important; }
.redcafe-home-price-kicker { color: #8c1e0e !important; }
.redcafe-home-price-copy h2 { color: #2B1A12 !important; }
.redcafe-home-price-copy p:last-child { color: #5E5850 !important; }
.redcafe-home-price-metric { background: #fff !important; border-color: rgba(140,30,14,.22) !important; }
.redcafe-home-price-metric :is(span, small) { color: #5E5850 !important; }
.redcafe-home-price-metric strong { color: #8c1e0e !important; }
.redcafe-home-price-inner > a { background: #8c1e0e !important; background-image: none !important; color: #fff !important; }
/* Tarjeta de perfiles del portada (crema sobre ámbar): texto oscuro legible.
   Antes dependía de que la capa la reconociera por un bloque ya eliminado. */
body[data-redcafe-route="/"] main section.hero-gradient [class~="bg-crema/95"] :is(p, li, span) { color: #2B1A12 !important; }
body[data-redcafe-route="/"] main section.hero-gradient [class~="bg-crema/95"] p + p { color: #5E5850 !important; }
/* El vídeo de fondo (granos rojos, desenfocado) teñía de rosa las secciones
   claras: velo crema encima; se intuye el movimiento, no ensucia el color. */
#redcafe-video-fondo::after { content: ""; position: absolute; inset: 0; background: rgba(246,243,238,.88); pointer-events: none; }
/* La tarjeta de perfiles de la portada, con fondo sólido (era crema al 95 %). */
body[data-redcafe-route="/"] main section.hero-gradient [class~="bg-crema/95"] { background-color: #f6f3ee !important; }
/* «Solicitar servicio»: blanco sobre miel no llegaba a AA; ámbar con blanco 7,9:1. */
html:not(#rc-t1):not(#rc-t2):not(#rc-t3) body .redcafe-action-row a:first-child { background: #8c1e0e !important; border-color: #8c1e0e !important; color: #fff !important; }
/* /bar/: texto secundario crema sobre tarjeta crema (1:1, ya pasaba antes). */
main [class~="bg-cream-50"] :is(p, span)[class~="text-text-secondary"] { color: #5E5850 !important; }
/* ═ Portada por prioridad (23-oct-2026): registro primero (portada, cifras,
   «Forma parte», perfiles), luego comprar/vender (mapa y marketplace), después
   la referencia de precio y la confianza. Las piezas de la capa y las de React
   son hermanas: se ordenan sin mover nodos. ═ */
body[data-redcafe-route="/"] main > div { display: flex; flex-direction: column; }
body[data-redcafe-route="/"] main > div > * { order: 50; }
body[data-redcafe-route="/"] main > div > section:first-of-type { order: 1; }
body[data-redcafe-route="/"] main > div > #redcafe-cifras-red { order: 2; }
body[data-redcafe-route="/"] main > div > #forma-parte { order: 3; }
body[data-redcafe-route="/"] main > div > #perfiles { order: 4; }
body[data-redcafe-route="/"] main > div > #mapa-portada { order: 5; }
body[data-redcafe-route="/"] main > div > #redcafe-home-price-strip { order: 6; }
body[data-redcafe-route="/"] main > div > #confianza { order: 7; }
/* Reportar a un miembro y aceptación expresa en avisos. */
.redcafe-reportar-btn, .redcafe-muro-reportar { min-height: 44px; padding: 0 12px; background: transparent; border: 0; color: #6a645b; font-size: .875rem; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.redcafe-reportar-btn:hover, .redcafe-muro-reportar:hover { color: #8c1e0e; }
.redcafe-rep-quien { margin: 0 0 .5rem; color: #2B1A12; }
.redcafe-rep-nota { margin: 0 0 .75rem; color: #5E5850; font-size: .875rem; }
.redcafe-avisopago-acepto { display: flex; gap: .6rem; align-items: flex-start; margin: .9rem 0 .2rem; color: #2B1A12; font-weight: 600; line-height: 1.4; }
.redcafe-avisopago-acepto input { width: 20px; height: 20px; margin-top: 2px; flex: none; }
.redcafe-avisopago-seguir[disabled] { opacity: .5; cursor: not-allowed; }
/* Etiquetas «verdes» decorativas → ámbar (el verde queda solo para estados). */
.badge.badge-verde { color: #8c1e0e !important; border-color: rgba(140,30,14,.4) !important; background: transparent !important; }
main li > .text-hoja:first-child { color: #8c1e0e !important; }
/* ═ Lectura en el móvil: la capa fijaba párrafos a 13 px y textos secundarios a
   12 px. En teléfonos, cuerpo 15 px y secundarios 13 px; rótulos en mayúsculas,
   botones y escritorio sin cambios. ═ */
@media (max-width: 640px) {
  html:not(#rc-t1):not(#rc-t2):not(#rc-t3) body :is(main, footer, [data-redcafe-propio]) :is(p, li, td, dd, dt, blockquote, figcaption, summary):not(.badge):not(.rotulo):not(.uppercase):not([class*="rotulo"]):not([class*="etiqueta"]):not([class*="-tag"]):not([class*="kicker"]) {
    font-size: 15px !important; line-height: 1.55 !important;
  }
  html:not(#rc-t1):not(#rc-t2):not(#rc-t3) body :is(main, footer, [data-redcafe-propio]) :is(small, time, .text-sm, .text-xs, [class*="-meta"], [class*="fecha"], [class*="ayuda"], [class*="-nota"], [class*="hint"]):not(.badge):not(.uppercase):not([class*="rotulo"]):not([class*="etiqueta"]) {
    font-size: 13px !important; line-height: 1.45 !important;
  }
  html:not(#rc-t1):not(#rc-t2):not(#rc-t3) body :is(main, [data-redcafe-propio]) :is(input, select, textarea) { font-size: 16px !important; }
}
/* «Eliminar» en lo propio: discreto pero claro, con área táctil de 44 px. */
.redcafe-pub-eliminar { min-height: 44px; margin-left: 8px; padding: 0 14px; background: transparent;
  border: 1px solid rgba(166,52,38,.55); color: #a63426; font-weight: 700; cursor: pointer; }
.redcafe-pub-eliminar:hover { background: rgba(166,52,38,.08); }
"""
MARCA = "Tema Stradale (Starter V0.1)"


def aplicar(texto, es_css):
    n = 0
    texto, c = HEXRE.subn(lambda m: HEX[m.group(0).lower()], texto); n += c
    for re_, nuevo in RGBA + FUENTES:
        texto, c = re_.subn(nuevo, texto); n += c
    n += sum(1 for m in TRIORE.finditer(texto)
             if (int(m.group(2)), int(m.group(4)), int(m.group(6))) in TRIOS)
    texto = TRIORE.sub(_trio, texto)

    if es_css:
        # El bloque del tema va siempre al final y se regenera entero, así
        # un cambio en BLOQUE se aplica sin duplicarlo.
        i = texto.find("\n/* ═══ " + MARCA)
        previo = texto[i:] if i >= 0 else ""
        if previo != BLOQUE:
            texto = (texto[:i] if i >= 0 else texto) + BLOQUE; n += 1
    return texto, n


def main():
    raiz = sys.argv[1]
    solo = "--comprobar" in sys.argv
    total = 0
    for nombre in ARCHIVOS:
        f = os.path.join(raiz, nombre)
        s = open(f, encoding="utf8").read()
        nuevo, n = aplicar(s, nombre.endswith(".css"))
        total += n
        print(f"{n:4d} cambios  {nombre}")
        if n and not solo:
            open(f, "w", encoding="utf8").write(nuevo)
    print(("pendientes: " if solo else "aplicados: ") + str(total))


if __name__ == "__main__":
    main()
