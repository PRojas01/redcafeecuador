#!/usr/bin/env bash
# Red Café Ecuador — repone la capa propia sobre un build de Next
# ---------------------------------------------------------------------------
# El sitio publicado no es lo que sale de `next build`: encima lleva una hoja
# de estilos propia, un script en línea y entre doce y dieciocho scripts según
# la ruta. Todo eso se venía añadiendo A MANO después de construir, y por eso
# `npm run build` sin más deja el sitio sin la mitad de sus funciones.
#
#   ./inyectar-scripts.sh <carpeta-del-build> <version>
#   ./inyectar-scripts.sh ../out 20260909a
#
# NO reconstruye las etiquetas a partir de una lista de nombres. Copia los
# BLOQUES LITERALES extraídos del sitio publicado, que están en bloques/, uno
# por ruta, con la versión como marcador. Se hizo así después de descubrir que
# reconstruirlas perdía cosas: en las 61 páginas hay un <script> EN LÍNEA
# (redcafe-v59-ticker-panel, el botón «Panel de precios» del ticker) que no
# está en el fuente de Next y que un build habría borrado sin avisar.
#
# Falla —y no deja el build a medias en silencio— si una ruta no tiene bloque
# o si el HTML no trae </head> y </body>.
set -u
set -o pipefail

DIR="${1:?falta la carpeta del build, p.ej. ../out}"
VER="${2:?falta la versión, p.ej. 20260909a}"
[ -d "$DIR" ] || { echo "no existe $DIR"; exit 2; }

BLOQUES="$(dirname "$0")/bloques"
[ -d "$BLOQUES" ] || { echo "falta $BLOQUES"; exit 3; }

hechas=0; saltadas=0; problemas=0

while IFS= read -r pagina; do
  ruta="$(dirname "${pagina#"$DIR"/}")"; [ "$ruta" = "." ] && ruta=""
  nombre="$(echo "$ruta" | sed 's|/|__|g')"; [ -z "$nombre" ] && nombre="__inicio"
  bloque="$BLOQUES/$nombre.txt"

  if [ ! -f "$bloque" ]; then
    echo "  SIN BLOQUE $ruta — no está en bloques/, hay que extraerlo del sitio"
    problemas=$((problemas+1)); continue
  fi

  if ! grep -q '</head>' "$pagina" || ! grep -q '</body>' "$pagina"; then
    echo "  HTML ANÓMALO $ruta — sin </head> o sin </body>"
    problemas=$((problemas+1)); continue
  fi

  # Idempotencia comprobada etiqueta por etiqueta, no con una sola señal: si
  # faltara solo el CSS o solo un script, antes se saltaba la página entera.
  if ! python3 "$(dirname "$0")/aplicar-bloque.py" "$pagina" "$bloque" "$VER" comprobar; then
    saltadas=$((saltadas+1)); continue
  fi

  python3 "$(dirname "$0")/aplicar-bloque.py" "$pagina" "$bloque" "$VER" inyectar || {
    echo "  ERROR al inyectar en $ruta"; problemas=$((problemas+1)); continue
  }
  hechas=$((hechas+1))
done < <(find "$DIR" -name "index.html" -not -path "*/_next/*")

echo "Capa propia inyectada en $hechas páginas · ya la tenían: $saltadas · problemas: $problemas · versión $VER."
[ "$problemas" -eq 0 ]
