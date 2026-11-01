#!/usr/bin/env bash
# Red Café Ecuador — foto del sitio renderizado
# ---------------------------------------------------------------------------
# Para qué existe. Se va a migrar la capa de scripts propios hacia el fuente de
# React, y la condición es que el diseño y el funcionamiento NO cambien. Eso no
# se puede prometer de palabra: hay que poder demostrarlo. Esta herramienta
# guarda cómo queda cada página DESPUÉS de que React hidrata y de que corren
# los scripts propios, para poder comparar antes y después.
#
# Usa Chrome en modo headless con --virtual-time-budget, que adelanta los
# temporizadores: sin eso no se capturaría nada de lo que montan los scripts
# propios, que arrancan entre 700 ms y 4 s después de cargar.
#
#   ./foto-sitio.sh <origen> <carpeta-destino> [movil|escritorio]
#
#   ./foto-sitio.sh https://redcafeecuador.com referencia movil
#   ./foto-sitio.sh http://127.0.0.1:8123      candidato  movil
#   ./comparar-fotos.sh referencia candidato
set -u
set -o pipefail

ORIGEN="${1:?falta el origen, p.ej. https://redcafeecuador.com}"
DESTINO="${2:?falta la carpeta destino}"
VISTA="${3:-movil}"

case "$VISTA" in
  movil)      TAM="375,812";  ANCHO=375;  ALTO_FOTO=4000 ;;
  escritorio) TAM="1280,900"; ANCHO=1280; ALTO_FOTO=5000 ;;
  *) echo "vista no válida: $VISTA (usa movil o escritorio)"; exit 2 ;;
esac

CHROME="$(command -v google-chrome || command -v chromium || echo /snap/bin/chromium)"
[ -x "$CHROME" ] || { echo "no encuentro Chrome"; exit 3; }

# Se puede pasar otro listado con RUTAS=... para iterar rápido sobre unas
# pocas rutas en vez de las 61.
RUTAS_FICHERO="${RUTAS:-$(dirname "$0")/rutas.txt}"
[ -f "$RUTAS_FICHERO" ] || { echo "falta $RUTAS_FICHERO"; exit 4; }

mkdir -p "$DESTINO/$VISTA"
total=0; fallos=0; inestables=0; disputadas=0; imagenes_inestables=0

# ── Qué se guarda de cada ruta ───────────────────────────────────────────
#
# DOS cosas, porque una sola no basta:
#
#   1. Una CAPTURA DE PANTALLA. El primer intento de esta herramienta solo
#      comparaba el DOM, y la auditoría lo tumbó con un argumento
#      irrefutable: un cambio de CSS que altere colores, espaciados o el
#      diseño responsive deja el DOM idéntico y habría pasado como «sin
#      cambios». Comprobado: dos capturas de la misma página dan PNG idénticos
#      byte a byte, así que sirven como compuerta.
#   2. El DOM, para saber QUÉ cambió cuando la imagen cambie, y para ver
#      cosas que la imagen no muestra (atributos, enlaces, textos ocultos).
#
# Del DOM se recorta el ruido del framework, pero NO la capa propia: si
# dejara de cargarse `redcafe-v60-final.css` o un script, eso tiene que
# aparecer en la comparación. Por eso las etiquetas de la capa propia se
# extraen y se guardan como cabecera del archivo.

capa_propia() {
  grep -oE '<(link|script)[^>]*(href|src)="/(redcafe|admin-visual)[^"]*"[^>]*>' \
    | sed -E 's/\?v=[0-9]{8}[a-z]+/?v=VERSION/g' \
    | sed 's/^/CAPA-PROPIA: /'
}

limpiar() {
  sed -E 's/^.*<body/<body/' \
    | perl -0777 -pe 's{<script\b.*?</script>}{}gs' \
    | perl -0777 -pe 's{<(link|meta)\b[^>]*>}{}gs' \
    | sed -E 's/\?v=[0-9]{8}[a-z]+/?v=VERSION/g' \
    | sed -E 's/\?_=[0-9]+/?_=T/g; s/&_v=[0-9]+/\&_v=T/g' \
    | sed -E 's/(^|[[:space:]])id="[a-f0-9]{8,}"/\1id="ID"/g' \
    | sed -E 's/(react-aria|radix|:r)[0-9a-z]+/\1ID/g' \
    | sed -E 's/\b(hace )?[0-9]+ (min|minutos?|h|horas?|d|d(í|i)as?)\b/TIEMPO-RELATIVO/g' \
    | sed -E 's/\bhace (un|una|unos|unas) [a-zñáéíóú]+\b/TIEMPO-RELATIVO/g' \
    | sed -E 's/></>\n</g' \
    | python3 "$(dirname "$0")/normalizar.py"
}

# Las fechas y los precios YA NO se normalizan. La auditoría tenía razón: la
# regla `\$ ?[0-9]+[.,][0-9]{2}` escondía cambios reales de precio en el
# marketplace y en las facturas, que es justo lo que más importa en este
# proyecto. Lo único que cambia solo entre dos capturas tomadas con minutos de
# diferencia es la franja de cotización, y esa se sustituye entera en
# normalizar.py. Las fechas de una noticia no cambian en diez minutos.

volcar_dom() {
  timeout 120 "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --window-size="$TAM" --virtual-time-budget=20000 --dump-dom "$1" 2>/dev/null
}

volcar_png() {
  # Ventana alta a propósito: la captura de Chrome recoge solo el alto de la
  # ventana, y con 812 px se compararía nada más que la primera pantalla.
  timeout 150 "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --window-size="$ANCHO,$ALTO_FOTO" --virtual-time-budget=20000 \
    --screenshot="$2" "$1" >/dev/null 2>&1
  [ -s "$2" ] || return 1
  tapar_flotante "$2"
}

# El botón flotante de la esquina inferior derecha lleva una insignia con un
# número que cambia solo. Medido: en dos rutas del marketplace, dos capturas
# separadas por minutos diferían en 4 píxeles, y eran exactamente los de esa
# insignia — la misma caja de 14x14 en las dos, porque el botón va anclado a la
# ventana y siempre cae en el mismo sitio.
#
# Se tapa esa esquina antes de comparar. Lo que se pierde es detectar POR
# IMAGEN un cambio de diseño del botón flotante; el DOM sigue cubriéndolo
# entero, y a cambio la comparación deja de dar falsos positivos en las 63
# rutas, porque ese botón sale en todas.
tapar_flotante() {
  command -v convert >/dev/null 2>&1 || return 0
  local x=$((ANCHO - 110)) y=$((ALTO_FOTO - 130))
  # `-strip` y los `+set date:*` NO son adorno: sin ellos, ImageMagick escribe
  # la fecha de creación dentro del PNG y dos ejecuciones sobre la MISMA imagen
  # dan archivos distintos byte a byte. Al añadir el tapado, eso convirtió en
  # «imagen inestable» tres rutas que en realidad eran idénticas: el fallo lo
  # había metido el propio arreglo.
  convert "$1" -fill '#808080' -draw "rectangle $x,$y $ANCHO,$ALTO_FOTO" \
    -strip +set date:create +set date:modify +set date:timestamp \
    "png:$1" 2>/dev/null || true
}

# Un archivo vale solo si tiene contenido y de verdad es una página: si la
# limpieza falla y deja el archivo vacío, dos vacíos iguales podrían pasar por
# «versión estable» y quedar como referencia.
dom_valido() {
  [ -s "$1" ] && grep -q "<body" "$1"
}

mayoria() {
  # Devuelve el archivo cuyo contenido se repite en MÁS DE LA MITAD de las
  # capturas válidas. Antes bastaba con que se repitiera dos veces, y con
  # A,A,B,B,C se quedaba con A sin que hubiera versión dominante.
  local total="$1" mejor="" mejorn=0 f g n
  for f in "$tmpdir"/dom-*; do
    [ -f "$f" ] || continue
    n=0
    for g in "$tmpdir"/dom-*; do
      [ -f "$g" ] || continue
      cmp -s "$f" "$g" && n=$((n+1))
    done
    if [ "$n" -gt "$mejorn" ]; then mejor="$f"; mejorn="$n"; fi
  done
  if [ "$mejorn" -gt $((total / 2)) ] && [ "$mejorn" -ge 2 ]; then
    echo "$mejor"; return 0
  fi
  return 1
}

while IFS= read -r ruta; do
  [ -z "$ruta" ] && continue
  case "$ruta" in \#*) continue ;; esac
  total=$((total+1))
  nombre="$(echo "$ruta" | sed 's|^/||; s|/$||; s|/|__|g')"
  [ -z "$nombre" ] && nombre="__inicio"

  # Tres capturas; si no hay mayoría estricta, se escala a cinco. Algunas
  # rutas del sitio devuelven más de una versión según si React terminó de
  # hidratar antes del volcado (la portada, 4 de cada 5 veces una y 1 de cada
  # 5 la otra), y eso es un fallo del sitio, no de esta herramienta.
  tmpdir="$(mktemp -d)"
  validas=0
  capturar() {
    local bruto
    bruto="$(volcar_dom "$ORIGEN$ruta")"
    [ -z "$bruto" ] && return 1
    printf '%s' "$bruto" | capa_propia  > "$tmpdir/dom-$1"
    printf '%s' "$bruto" | limpiar     >> "$tmpdir/dom-$1"
    dom_valido "$tmpdir/dom-$1" || { rm -f "$tmpdir/dom-$1"; return 1; }
    validas=$((validas+1))
  }

  for intento in 1 2 3; do capturar "$intento" || true; done
  estable="$(mayoria "$validas" || true)"
  unanime=0
  if [ -n "$estable" ] && [ "$validas" -ge 3 ] \
     && cmp -s "$tmpdir/dom-1" "$tmpdir/dom-2" && cmp -s "$tmpdir/dom-1" "$tmpdir/dom-3"; then
    unanime=1
  fi
  if [ "$unanime" -eq 0 ]; then
    for intento in 4 5; do capturar "$intento" || true; done
    estable="$(mayoria "$validas" || true)"
  fi

  if [ -z "$estable" ]; then
    if [ "$validas" -ge 1 ]; then
      echo "  INESTABLE $ruta — sin versión mayoritaria en $validas capturas"
      inestables=$((inestables+1))
      estable="$(ls "$tmpdir"/dom-* 2>/dev/null | head -1)"
    else
      echo "  FALLO $ruta"
      fallos=$((fallos+1)); rm -rf "$tmpdir"; continue
    fi
  elif [ "$unanime" -eq 0 ]; then
    echo "  DISPUTADA $ruta — el sitio devuelve más de una versión"
    disputadas=$((disputadas+1))
  fi

  cp "$estable" "$DESTINO/$VISTA/$nombre.html"

  # La imagen, con la misma regla que el DOM: hasta tres tomas y se guarda la
  # que se repita. Con dos tomas, diez rutas salían «inestables»: las que
  # cargan imágenes en diferido, el mapa del marketplace y las que traen fotos
  # de miembros tardan distinto en pintar. Una tercera toma las resuelve, y si
  # ni así coinciden es que ahí no hay imagen comparable y hay que saberlo.
  png=""
  for intento in 1 2 3; do
    volcar_png "$ORIGEN$ruta" "$tmpdir/p$intento.png"
    [ -s "$tmpdir/p$intento.png" ] || continue
    for previo in 1 2; do
      [ "$previo" -ge "$intento" ] && continue
      if cmp -s "$tmpdir/p$previo.png" "$tmpdir/p$intento.png"; then
        png="$tmpdir/p$intento.png"; break 2
      fi
    done
  done

  if [ -n "$png" ]; then
    cp "$png" "$DESTINO/$VISTA/$nombre.png"
  elif [ -s "$tmpdir/p1.png" ]; then
    echo "  IMAGEN INESTABLE $ruta — tres tomas distintas, no se guarda"
    imagenes_inestables=$((imagenes_inestables+1))
  else
    echo "  SIN IMAGEN $ruta"
  fi

  rm -rf "$tmpdir"
  printf '.'
done < "$RUTAS_FICHERO"

echo
echo "Fotos guardadas en $DESTINO/$VISTA — $((total-fallos)) de $total rutas."
[ "$fallos" -gt 0 ] && echo "ATENCIÓN: $fallos rutas sin capturar."
[ "$disputadas" -gt 0 ] && echo "Nota: $disputadas rutas con más de una versión (el sitio no es determinista ahí)."
[ "$inestables" -gt 0 ] && echo "ATENCIÓN: $inestables rutas sin versión mayoritaria."
[ "$imagenes_inestables" -gt 0 ] && echo "ATENCIÓN: $imagenes_inestables rutas sin imagen comparable."
exit 0
