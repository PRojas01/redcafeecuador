# Del café en cereza al café molido — secuencia de 30 s

**Formato:** 1920×1080 (16:9) · 30 fps · 900 fotogramas · H.264 CRF 16 · sin audio
**Base:** las 12 fotografías originales (4624×2084 y 9248×4164). Las placas de trabajo
se cargan a resolución nativa y todo recorte se sub-muestrea hacia 1080p: nunca se amplía.

## Cámara: una sola toma continua

La cámara **no encuadra el centro de cada fotografía sino el montón de café**. De la
máscara de cada toma se extrae el ancho y el centroide del montón, y el recorte 16:9 se
calcula para que el montón caiga siempre en la misma posición y con el mismo tamaño en
pantalla. El rango de encuadre compatible con las ocho fotografías es f ∈ [1,08 · 1,27]
(f = ancho del montón ÷ ancho de la ventana); se usa **1,10 → 1,24** como una única
aproximación continua a lo largo de los 30 s, más un empujón final a 1,54 entre 27,2 y
30 s, cuando ya no hay ninguna transición en curso.

Consecuencia: en cada disolvencia las dos capas comparten encuadre exacto, así que el
paso no se lee como un cambio de fotografía sino como la **transformación del mismo
montón**. Durante el tostado (13,4–23,6 s) el montón baja un 7,5 % en el encuadre para
dejar aire al vapor — también en función del tiempo, no de la toma, para no romper la
continuidad.

## Orden por etapa del proceso

| Toma | Fotografía | Etapa |
|------|-----------|-------|
| Z | `cereza.jpeg` | **Cereza madura real** — apertura |
| A | `20260820_125611.jpg` | Cereza seca (arranca con el grading de madura y se seca) |
| B | `20260820_125710.jpg` | Pergamino / grano claro |
| C | `20260820_125723.jpg` | Grano verde |
| D | `20260820_125815.jpg` | Tostado (dorado) |
| F | `20260820_125858.jpg` | Tostado (ángulo bajo, mesa oscura) |
| G | `20260820_130152.jpg` | Molido |
| H | `20260820_130155.jpg` | Molido (textura) |
| T | `tasa.jpeg` | **Taza servida, con vapor real** — cierre |

Descartadas por redundancia: `125824`, `125828` (ráfagas casi idénticas de `125827`),
`125854`, `125856` (mismo encuadre que `125858`). Descartada `125827` porque su montón
ocupa el 87 % del ancho de la foto —más que el 80 % visible en 16:9— y era la única que
impedía un encuadre común al resto.

`cereza.jpeg` y `tasa.jpeg` vienen a 1600 px (el resto a 4624–9248 px): no admiten el
encuadre cerrado común, así que van a cuadro completo con su propia escala y con
realce de micro-contraste para compensar la ampliación de ~1,6×.

## Línea de tiempo

| t (s) | Toma | Qué ocurre |
|-------|------|-----------|
| 0.0–2.9 | Z | **Cereza madura, fotografía real** |
| 2.9–3.7 | Z→A | disolvencia: la cereza real pasa al montón de cereza seca ya coloreado |
| 3.7–4.8 | A | Cereza madura sintética sobre el montón real de cereza seca |
| 4.8–7.0 | A | **Secado I**: pierde brillo y vira a marrón vinoso |
| 7.0–9.0 | A | **Secado II**: llega exactamente a la fotografía original · merma −0,26 % |
| 8.9–9.7 | A→B | disolvencia |
| 9.7–11.8 | B | Pergamino / grano claro |
| 12.5–14.5 | C | Grano verde |
| 15.2–17.7 | D | Tostado dorado · **entra el vapor** (15,2→16,6) |
| 18.4–20.0 | F | Tostado, ángulo bajo · **el vapor se disipa** (20,0→21,4) |
| 21.5–23.8 | G | Café molido |
| 24.5–26.7 | H | Textura del molido · empujón extra de cámara |
| 27.4–30.0 | T | **Taza servida**, con su vapor real |

Fundido de negro: 0.65 s a la entrada, 0.80 s a la salida.

## Transformación visual (solo donde hace falta)

**1. Cereza madura.** La apertura es la fotografía real (`cereza.jpeg`). Además, para que
el *mismo* montón de cereza seca pueda secarse en pantalla, se genera su versión madura:
se segmenta el montón (distancia robusta en Lab respecto al color de la mesa + prior
espacial, componente conexo mayor, erosión y plumeado), se conserva el canal L —forma,
textura, iluminación y sombras intactas— y se reemplaza la cromaticidad por el rojo
**medido en la fotografía real** (a\*=43,4 · b\*=25,3), modulado por luminancia:
las sombras se mantienen oscuras y los especulares limpios, de modo que el fruto tiene
brillo ceroso y no aspecto de plástico. Dos campos de ruido fractal varían el tono fruto
a fruto (unos más escarlata, otros más anaranjados), como en un lote real de maduración
despareja. Fondo, tabla y bandeja quedan sin tocar.

**2. Secado.** No es un simple *fade*. Se recorre madura → estado intermedio (mezcla
oscurecida y desaturada, marrón vinoso, mate) → fotografía original, con curvas
independientes. En paralelo el montón se contrae un 0.26 % respecto de la mesa: merma
por deshidratación.

**3. Vapor (15,2–21,4 s).** Solo sobre el tostado: la taza del cierre trae su vapor real.
Es procedural y **nace en la superficie del café**, no flota encima. La silueta del montón
se recalcula en cada fotograma (con erosión vertical, para que una filtración de la
máscara no falsee de dónde sale). Sobre ella:
- *Penachos*: cuatro columnas dentro del 60 % central del montón, cada una con su propia
  anchura, peso y balanceo lateral, que se ensanchan al ascender. No es una sábana
  uniforme sino unas pocas fuentes, como el vapor real de un lote caliente.
- *Volutas*: ruido fractal periódico advectado hacia arriba con turbulencia, que se
  estiran a medida que suben y se disipan; densas junto a la superficie y tenues arriba.
- *Ondulación de calor*: desplazamiento turbulento y suavizado del aire justo por encima
  de la silueta, sin deformar el grano.

**4. Transiciones.** Tres mecanismos combinados, ninguno es un *cross-fade*:
- *Encuadre compartido* (ver arriba): ambas capas tienen el montón en el mismo sitio y
  al mismo tamaño. Es lo que hace que el paso se lea como transformación.
- *Disolvencia orgánica*: el umbral avanza modulado por ruido fractal y por la luminancia
  de la toma saliente (dispersión 1,55), así que las zonas oscuras mutan primero y el
  cambio ocurre por parches, no por mezcla al 50 %.
- *Contra-alabeo*: en el centro de la transición cada capa se desplaza hasta 7 px hacia
  la otra siguiendo un campo de turbulencia compartido, de modo que las dos texturas
  fluyen una hacia la otra en lugar de superponerse.

**5. Microparallax.** El montón se desplaza 2–3 px y escala 0.3 % respecto de la mesa a lo
largo de cada toma, usando su propia máscara como capa de frente.

**6. Continuidad cromática.** Se mide la media Lab de las ocho placas y cada una se acerca
un 26 % (croma) / 13 % (luminancia) al promedio común, para que las tres mesas y los tres
balances de blancos distintos no delaten el corte.

**7. Acabado.** Curva S suave, viñeta, grano fino y fundidos de negro.

No se añade texto, logotipos ni elementos ajenos al material fotografiado.

## Archivos

- `comun.py` — color (sRGB↔Lab), máscaras, grading de cereza, ruido fractal
- `paso1_diseno.py` — genera máscaras y la imagen de cereza madura
- `paso2_render.py` — guion, cámara, vapor, transiciones y codificación
- `salida/cafe_cereza_a_molido_30s_1080p.mp4`
- `salida/cereza_madura_1080.jpg` — la cereza madura como imagen fija

Reproducir el render:

```bash
python paso1_diseno.py && python paso2_render.py
```
