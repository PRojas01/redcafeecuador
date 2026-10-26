#!/usr/bin/env bash
# Compara dos fotos del sitio: la imagen y el DOM de cada ruta.
#
#   ./comparar-fotos.sh referencia candidato [movil|escritorio]
#
# Sale con 0 solo si NADA cambió. Cualquier diferencia es un cambio de diseño
# o de funcionamiento que hay que justificar antes de desplegar.
#
# Compara las dos cosas a propósito: la imagen dice si el usuario vería algo
# distinto —un cambio de CSS que mueva o recolore no altera el DOM— y el DOM
# dice QUÉ cambió, además de lo que la imagen no muestra (enlaces, atributos,
# la propia capa de scripts y estilos propios, que se guarda como cabecera).
set -u
set -o pipefail
A="${1:?falta la foto de referencia}"
B="${2:?falta la foto a comparar}"
VISTA="${3:-movil}"

[ -d "$A/$VISTA" ] || { echo "no existe $A/$VISTA"; exit 2; }
[ -d "$B/$VISTA" ] || { echo "no existe $B/$VISTA"; exit 2; }

ruta_de() {
  local n="${1%.*}"
  [ "$n" = "__inicio" ] && { echo "/"; return; }
  echo "/$(echo "$n" | sed 's|__|/|g')"
}

# Rutas cuya imagen no es comparable porque muestra tiempo relativo. Se
# informa, pero no tumba la comparación: en ellas el DOM sí compara entero.
RELOJ="$(dirname "$0")/rutas-con-reloj.txt"
con_reloj() {
  [ -f "$RELOJ" ] || return 1
  grep -v '^#' "$RELOJ" | grep -qx "$1"
}

# Rutas que hoy devuelven más de una versión por un fallo del sitio ya
# identificado. Se informan aparte, con su nombre, para que no tapen una
# regresión nueva. Cada línea de ese archivo debe desaparecer cuando su fallo
# se corrija: si sigue ahí sin motivo, la compuerta deja de vigilar esa ruta.
CONOCIDOS="$(dirname "$0")/rutas-con-fallo-conocido.txt"
fallo_conocido() {
  [ -f "$CONOCIDOS" ] || return 1
  grep -v '^#' "$CONOCIDOS" | grep -qx "$1"
}

iguales=0; dom=0; domconocido=0; img=0; imgaviso=0; faltan=0; sobran=0
detalle="$(mktemp)"

for f in "$A/$VISTA"/*.html; do
  [ -e "$f" ] || continue
  n="$(basename "$f")"; base="${n%.html}"; ruta="$(ruta_de "$n")"

  if [ ! -f "$B/$VISTA/$n" ]; then
    printf '  FALTA   %-40s no está en la foto nueva\n' "$ruta" >> "$detalle"
    faltan=$((faltan+1)); continue
  fi

  cambio=""
  if ! cmp -s "$f" "$B/$VISTA/$n"; then
    if fallo_conocido "$ruta"; then
      domconocido=$((domconocido+1))
      lineas="$(diff "$f" "$B/$VISTA/$n" | grep -c '^[<>]' || true)"
      printf '  conocido %-39s %s líneas (fallo del sitio ya identificado)\n' "$ruta" "$lineas" >> "$detalle"
    else
      cambio="dom"; dom=$((dom+1))
    fi
  fi

  # La imagen solo se compara si existe en las dos: si falta en una, se avisa.
  if [ -f "$A/$VISTA/$base.png" ] && [ -f "$B/$VISTA/$base.png" ]; then
    if ! cmp -s "$A/$VISTA/$base.png" "$B/$VISTA/$base.png"; then
      pix="?"
      if command -v compare >/dev/null 2>&1; then
        pix="$(compare -metric AE "$A/$VISTA/$base.png" "$B/$VISTA/$base.png" null: 2>&1 | tr -d '\n')"
      fi
      if con_reloj "$ruta"; then
        imgaviso=$((imgaviso+1))
        printf '  aviso   %-40s %s píxeles (ruta con reloj: no cuenta)\n' "$ruta" "$pix" >> "$detalle"
      else
        cambio="${cambio:+$cambio+}imagen"
        img=$((img+1))
        printf '  IMAGEN  %-40s %s píxeles distintos\n' "$ruta" "$pix" >> "$detalle"
      fi
    fi
  elif [ -f "$A/$VISTA/$base.png" ] || [ -f "$B/$VISTA/$base.png" ]; then
    printf '  IMAGEN  %-40s falta en una de las dos fotos\n' "$ruta" >> "$detalle"
  fi

  if [ "$cambio" = "dom" ]; then
    lineas="$(diff "$f" "$B/$VISTA/$n" | grep -c '^[<>]' || true)"
    printf '  DOM     %-40s %s líneas\n' "$ruta" "$lineas" >> "$detalle"
  elif [ -z "$cambio" ]; then
    iguales=$((iguales+1))
  fi
done

# Rutas que aparecen en la foto nueva y no en la referencia: también es un
# cambio. Antes solo se recorría la referencia y una ruta añadida pasaba
# inadvertida.
for f in "$B/$VISTA"/*.html; do
  [ -e "$f" ] || continue
  n="$(basename "$f")"
  if [ ! -f "$A/$VISTA/$n" ]; then
    printf '  SOBRA   %-40s no está en la referencia\n' "$(ruta_de "$n")" >> "$detalle"
    sobran=$((sobran+1))
  fi
done

echo "Comparación $VISTA — sin cambios: $iguales · DOM: $dom · imagen: $img · faltan: $faltan · sobran: $sobran"
[ "$imgaviso" -gt 0 ] && echo "  ($imgaviso rutas con reloj: la imagen cambió pero no cuenta)"
[ "$domconocido" -gt 0 ] && echo "  ($domconocido rutas con fallo del sitio ya identificado: ver rutas-con-fallo-conocido.txt)"
[ -s "$detalle" ] && sort "$detalle"
rm -f "$detalle"
[ "$dom" -eq 0 ] && [ "$img" -eq 0 ] && [ "$faltan" -eq 0 ] && [ "$sobran" -eq 0 ]
