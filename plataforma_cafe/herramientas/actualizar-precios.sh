#!/usr/bin/env bash
# Red Café Ecuador — precio del día, automático
# ---------------------------------------------------------------------------
# El sistema de precios de siempre es api/precios.php: él solo refresca su caché
# cuando pasa de 6 horas, y precios-refresh.php ya está pensado para un cron
# diario de cPanel. Ese sistema NUNCA se quedó viejo: hoy marcaba 290,15 del
# 30 de septiembre con "stale": false.
#
# Lo que sí se quedaba viejo era el HTML. El precio que viaja dentro del HTML
# estaba escrito a mano en app/servicios/precios/page.tsx y next build lo
# horneaba para siempre. El visitante no lo notaba —la capa propia lo reemplaza
# al cargar— pero Google no ejecuta JavaScript, así que en el buscador salía un
# precio con semanas de atraso y un texto de "la fuente oficial no responde".
#
# Este script ata el HTML a la misma caché que ya existía. No inventa nada:
# lee la caché de la API y la guarda para el próximo build.
#
#   ./herramientas/actualizar-precios.sh            # leer precio y reconstruir
#   ./herramientas/actualizar-precios.sh --leer     # solo leer y guardar el JSON
#   ./herramientas/actualizar-precios.sh --construir # solo reconstruir
#
# CRON DIARIO (después de subir el paquete una vez, en cPanel o con crontab -e):
#
#   30 6 * * * /ruta/al/fuente/herramientas/actualizar-precios.sh >> /var/log/precios.log 2>&1
#
# El cron no sube nada al servidor: deja el build listo en out/. Subir es una
# decisión aparte, a mano, que no conviene automatizar sin supervisarla.
set -uo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
JSON="$RAIZ/app/servicios/precios/precios-guardados.json"
API="${REDCAFE_PRECIOS_API:-https://redcafeecuador.com/api/precios.php}"

MODO="${1:---todo}"
fallos=0

leer_precio() {
  local tmp
  tmp="$(mktemp)"

  # Fuente local: sirve para ensayar sin red, y para cuando la API del servidor
  # está mal. REDCAFE_PRECIOS_API puede ser una URL o la ruta a un archivo.
  if [ -f "$API" ]; then
    echo "· Leyendo el precio del archivo $API"
    cp "$API" "$tmp" || { rm -f "$tmp"; return 1; }
  else
    echo "· Leyendo el precio de $API"
    if ! curl -fsS --max-time 25 "$API?action=refresh&v=$(date +%s)" -o "$tmp" 2>/dev/null; then
      rm -f "$tmp"; echo "  ERROR: la API no respondió. Se conserva el JSON anterior." >&2
      return 1
    fi
  fi
  [ -s "$tmp" ] || { rm -f "$tmp"; echo "  ERROR: la fuente del precio respondió vacío." >&2; return 1; }

  python3 - "$tmp" "$JSON" <<'PY' || { rm -f "$tmp"; return 1; }
import json, sys, datetime

origen, ruta = sys.argv[1], sys.argv[2]

try:
    with open(origen, encoding="utf-8") as f:
        sobre = json.load(f)
except Exception as e:
    print(f"  ERROR: la API no devolvió JSON válido ({e})", file=sys.stderr)
    sys.exit(1)

if not sobre.get("ok") or not isinstance(sobre.get("data"), dict):
    print("  ERROR: la API respondió pero sin datos utilizables", file=sys.stderr)
    sys.exit(1)

d = sobre["data"]

# Un precio de 0 o ausente no se guarda: es peor un número falso que ninguno.
valor = (d.get("precio") or {}).get("valor")
if not isinstance(valor, (int, float)) or valor <= 0:
    print(f"  ERROR: la API no trae precio utilizable ({valor!r})", file=sys.stderr)
    sys.exit(1)

if not d.get("updated_at"):
    print("  ERROR: la respuesta no trae fecha de actualización", file=sys.stderr)
    sys.exit(1)

# Las direcciones de las fuentes oficiales tienen que ser URLs limpias. Ya pasó:
# la API de producción devolvía https://www.theice.com/products/咖啡/Coffee-C
# y el HTML horneaba ese enlace roto. Si algo no parece una URL, se PARA aquí,
# en vez de guardar el dato y dejar un enlace muerto en la página de precios.
import re
# OJO: sin \w. En Python 3 \w incluye los ideogramas chinos, que es justo lo
# que hay que rechazar. La clase va con el juego ASCII escrito a mano.
URL_OK = re.compile(r"^https?://[A-Za-z0-9_.~:/?#\[\]@!$&'()*+,;=%-]+$")
malas = [r.get("url", "") for r in (d.get("referencias_oficiales") or [])
         if not URL_OK.match(r.get("url", ""))]
if malas:
    print("  ERROR: la API devuelve direcciones de fuente que no son URLs válidas:",
          file=sys.stderr)
    for u in malas:
        print(f"    - {u!r}", file=sys.stderr)
    print("  Revisa api/precios.php en el SERVIDOR antes de seguir.", file=sys.stderr)
    sys.exit(1)

d.pop("stale", None)
d["stale"] = False
d["guardado_en"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

with open(ruta, "w", encoding="utf-8") as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
    f.write("\n")

var = (d.get("precio") or {}).get("variacion_pct")
fl = f"{var:+.2f} %" if isinstance(var, (int, float)) else "sin variación"
print(f"  Guardado: {valor:.2f} USD/quintal ({fl}) · {d['updated_at']}")
PY
  rm -f "$tmp"
}

construir() {
  echo "· Compilando (next build)"
  ( cd "$RAIZ" && npm run build ) || { echo "  ERROR: falló next build" >&2; return 1; }

  echo "· Quitando los datos mutables de out/"
  # next build copia public/ entero dentro de out/, y en public/data/ hay una
  # carga vieja (recetas, semilla). En el servidor los datos son reales y
  # distintos: subir esto los pisaría. Se borran del build, nunca del servidor.
  local quitado=0 d
  for d in "$RAIZ/out/data" "$RAIZ/out/uploads"; do
    [ -d "$d" ] || continue
    rm -rf "$d"
    echo "  fuera: ${d#"$RAIZ"/}"
    quitado=$((quitado + 1))
  done
  [ "$quitado" -gt 0 ] || echo "  (no había data/ ni uploads/ en el build)"

  # La versión NO se toca aquí a propósito: este script solo cambia el precio,
  # que viaja en el HTML (no-store, según .htaccess) y no en JS/CSS. Subir el
  # token a diario haría que todos los navegadores se descargaran otra vez la
  # capa entera cada mañana sin ningún cambio que lo justifique.
  local ver
  ver="$(python3 -c "import json;print(json.load(open('$RAIZ/public/redcafe-version.json'))['version'])" 2>/dev/null || echo "")"
  [ -n "$ver" ] || { echo "  ERROR: no se pudo leer la versión de public/redcafe-version.json" >&2; return 1; }

  echo "· Reponiendo la capa propia (versión $ver)"
  bash "$RAIZ/herramientas/inyectar-scripts.sh" "$RAIZ/out" "$ver" || {
    echo "  ERROR: la inyección de la capa propia falló" >&2; return 1
  }

  echo "· Compuerta de datos"
  bash "$RAIZ/herramientas/comprobar-paquete.sh" "$RAIZ/out" || {
    echo "  ERROR: la compuerta rechazó el build (¿entró data/ o una contraseña?)" >&2
    return 1
  }
  echo "  Listo en out/ — sin subir."
}

case "$MODO" in
  --leer)      leer_precio || fallos=1 ;;
  --construir) construir || fallos=1 ;;
  --todo)       leer_precio && construir || fallos=1 ;;
  *)           echo "uso: $0 [--leer|--construir]"; exit 2 ;;
esac

exit "$fallos"