#!/usr/bin/env bash
# Red Café Ecuador — empaquetador de producción
# ===========================================================================
#   ./herramientas/empaquetar.sh 20260930a
#
# Deja el ZIP en /mnt/Datos_3/redcafecuador.com/ y escribe el SHA-256 al lado.
#
# POR QUÉ NO SE EMPAQUETA EL out/ COMPLETO
# ----------------------------------------
# El 30 de septiembre de 2026 se comprobó, archivo por archivo, que 18 de los
# 24 archivos de la capa propia que hay en public/ están MÁS VIEJOS que los
# que están sirviendo en producción. Ejemplos:
#
#   redcafe-v60-final.css   fuente 106 KB · producción 234 KB
#   sw.js                   fuente  2,6 KB · producción 3,7 KB
#                           (al de producción le faltan en el fuente los
#                            manejadores de push y de notificationclick)
#
# Es decir: la capa propia se ha ido parchando directamente en el servidor y
# el árbol fuente se ha quedado atrás. Subir el out/ completo BORRARÍA
# functionality que está viva ahora mismo. Por eso este empaquetador mete
# solo el HTML y los _next/ de la compilación, que es lo único que este
# paquete cambia de verdad.
#
# Si alguna vez hay que subir la capa propia, hay que traerla de producción
# hacia el fuente primero (herramientas/verificar-capa-propia.sh lo dice).
#
# LO QUE SÍ VIAJA
# ---------------
#   index.html y el de cada ruta          el HTML, que es lo que ve el buscador
#   _next/**                              la compilación de React, con sus hashes
#   redcafe-version.json                  el token de versión
#   api/precios.php                       UNA corrección de una línea, indicada abajo
#   video/, fonts/, img/                  el vídeo del héroe, las fuentes y las imágenes
#   favicon.ico, icon-*.png, icon.svg,
#   apple-touch-icon.png, manifest.json,
#   og-image.svg, robots.txt, 404.html    lo que el HTML pide por URL directa
#
# Los assets estáticos se incluyen porque el 30 de septiembre de 2026 se
# comprobó, archivo por archivo, que son IDÉNTICOS a los que sirve producción
# (mismo SHA-256). Sin ellos el paquete no es autocontenido: el home se queda
# sin el vídeo de la cabecera y las páginas se ven con la fuente de sistema.
#
# LO QUE NUNCA VIAJA
# ------------------
#   data/, uploads/                       los datos son reales y del servidor
#   redcafe-*, admin-visual-runtime.js    la capa propia va por delante en el servidor
#   sw.js                                igual de por delante
#   .htaccess, .htaccess.previo-*        el del servidor tiene reglas propias
#   api/*.php salvo precios.php            el resto de la API no se toca
#   index.txt                            artefacto de compilación, no se sirve
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
VER="${1:-}"
DESTINO="/mnt/Datos_3/redcafecuador.com"
BUILD="$RAIZ/out"

if [ -z "$VER" ]; then
  echo "uso: $0 <version>   (por ejemplo 20260930a)" >&2
  exit 2
fi
if [ ! -d "$BUILD" ]; then
  echo "ERROR: no existe $BUILD. Compila antes con herramientas/actualizar-precios.sh" >&2
  exit 1
fi

# La versión del paquete y la del build tienen que ser la misma. Si no, el ZIP
# lleva un token que no corresponde con el HTML que se subió.
VER_BUILD="$(python3 -c "import json;print(json.load(open('$BUILD/redcafe-version.json'))['version'])" 2>/dev/null || echo "")"
if [ "$VER_BUILD" != "$VER" ]; then
  echo "ERROR: el build es $VER_BUILD y el paquete dice $VER. No pueden ser distintos." >&2
  echo "  Arregla public/redcafe-version.json y vuelve a compilar." >&2
  exit 1
fi

echo "· Comprobando que la compilación no lleva datos mutables"
for d in data uploads; do
  if [ -e "$BUILD/$d" ]; then
    echo "ERROR: $BUILD/$d existe. En producción hay datos reales y se pisarían." >&2
    echo "  tools/actualizar-precios.sh lo borra; no lo metas a mano." >&2
    exit 1
  fi
done

# La corrección de la API: una dirección con dos caracteres chinos metidos.
if ! grep -q 'theice.com/products/Coffee-C' "$BUILD/api/precios.php"; then
  echo "ERROR: api/precios.php no lleva la dirección del ICE corregida." >&2
  exit 1
fi

ZIP="$DESTINO/redcafeecuador-produccion-$VER.zip"
rm -f "$ZIP"

echo "· Empaquetando $VER"
cd "$BUILD"

# Se eligEN los archivos en vez de quitar los que sobran. Ir excluyendo se
# lleva por delante cosas sin querer: ya pasó con redcafe-version.json, que
# se lo comía el patrón redcafe-*.
#   index.html                  la portada
#   */index.html                las 63 rutas
#   _next/**                    la compilación de React
#   redcafe-version.json        el token de versión
#   sitemap.xml                 el mapa del sitio
#   api/precios.php             UNA línea corregida, entra aparte
mapfile -t HTMLS < <(find . -name "index.html" -not -path "./_next/*" | sed 's|^\./||' | sort)
mapfile -t NEXTJS < <(find _next/static -type f | sort)
# Assets estáticos: el vídeo del héroe, las fuentes, las imágenes y los iconos.
# Sin ellos el home se queda sin cabecera y las páginas se ven con la fuente de
# sistema. Se incluyen porque son idénticos a los que sirve producción.
mapfile -t ASSETS < <(find video fonts img -type f 2>/dev/null | sort)
mapfile -t ICONOS < <(find . -maxdepth 1 -type f \( -name 'favicon.ico' -o -name 'icon-*.png' -o -name 'icon.svg' -o -name 'apple-touch-icon.png' -o -name 'manifest.json' -o -name 'og-image.svg' -o -name 'robots.txt' -o -name '404.html' \) | sed 's|^\./||' | sort)

[ "${#HTMLS[@]}" -gt 0 ] || { echo "ERROR: no hay ningún index.html en el build" >&2; exit 1; }
[ "${#NEXTJS[@]}" -gt 0 ] || { echo "ERROR: no hay nada en _next/static" >&2; exit 1; }
[ "${#ASSETS[@]}" -gt 0 ] || { echo "ERROR: no hay assets estáticos (video/, fonts/, img/)" >&2; exit 1; }

# OJO: la lista se pasa archivo por archivo a propósito. Un "zip -r ... _next/static"
# funciona, pero un "zip ... _next/static" SIN -r se lleva la carpeta vacía y
# entrega un paquete sin la compilación, sin avisar. Con la lista explícita no
# hay forma de que pase.
zip -q "$ZIP" "${HTMLS[@]}" "${NEXTJS[@]}" "${ASSETS[@]}" "${ICONOS[@]}" \
  redcafe-version.json sitemap.xml \
  || { echo "ERROR: falló el zip" >&2; exit 1; }

# api/precios.php entra aparte y a la fuerza: sin él el cron diario no puede
# trabajar, porque la API del servidor devuelve la dirección corrupta y el
# script se niega a construir el precio con un enlace roto.
zip -q "$ZIP" api/precios.php || { echo "ERROR: no se pudo añadir api/precios.php" >&2; exit 1; }

# Comprobación de que no se coló nada prohibido, y de que la compilación está
# completa. data/ y uploads/ en producción son reales: pisarlos sería perder
# información de verdad.
COLADOS="$(unzip -Z1 "$ZIP" | grep -E '^(data|uploads)/|^\.htaccess|^redcafe-.*\.(css|js)$|^sw\.js$|^admin-visual' || true)"
if [ -n "$COLADOS" ]; then
  echo "ERROR: se colaron archivos que no deben viajar:" >&2
  echo "$COLADOS" >&2
  rm -f "$ZIP"
  exit 1
fi

EN_PAQUETE="$(unzip -Z1 "$ZIP" | grep -c '^_next/' || true)"
if [ "$EN_PAQUETE" -ne "${#NEXTJS[@]}" ]; then
  echo "ERROR: el paquete lleva $EN_PAQUETE archivos de _next/ y el build tiene ${#NEXTJS[@]}." >&2
  echo "  No lo subas: sería un paquete sin la compilación de React." >&2
  rm -f "$ZIP"
  exit 1
fi

# El vídeo del héroe es el activo que más fácil se queda fuera: sin él el home
# se ve "roto" y no hay ningún error que lo delate. Se comprueba por nombre.
if ! unzip -Z1 "$ZIP" | grep -q '^video/transformacion\.mp4$'; then
  echo "ERROR: el paquete no lleva video/transformacion.mp4." >&2
  echo "  Sin él el home se queda sin la cabecera. No lo subas." >&2
  rm -f "$ZIP"
  exit 1
fi

echo "· SHA-256"
( cd "$DESTINO" && sha256sum "$(basename "$ZIP")" > "$(basename "$ZIP").sha256" )
SUMA="$(cut -d' ' -f1 < "$ZIP.sha256")"

echo
echo "Paquete: $(basename "$ZIP")"
echo "SHA-256: $SUMA"
echo "Entradas: $(unzip -Z1 "$ZIP" | wc -l)"
echo "data/ o uploads/: $(unzip -Z1 "$ZIP" | grep -cE '^(data|uploads)/' || true)"
echo "Capa propia: $(unzip -Z1 "$ZIP" | grep -cE '^redcafe-.*\.(css|js)$|^sw\.js$|^admin-visual' || true)  (0 es lo correcto)"
echo "API: $(unzip -Z1 "$ZIP" | grep -c '^api/' || true)  (solo precios.php)"
echo
echo "NO SUBIR: redcafeecuador-produccion-20260915b-datos-reales.zip"
