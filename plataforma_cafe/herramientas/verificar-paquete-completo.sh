#!/bin/bash
# Red Café Ecuador — verificación completa de un paquete ANTES de subirlo.
#
# Por qué existe: la suite de 80 pruebas siempre se lanzó a mano. El fallo de
# las cotizaciones (aceptar creaba un pedido vacío) llegó a producción y estuvo
# ahí sin que nadie se enterara. Esto hace que verificar deje de depender de
# que alguien se acuerde.
#
#   verificar-paquete-completo.sh <paquete.zip> <carpeta-con-datos-de-prueba>
#
# Devuelve 0 solo si TODO pasa. Cualquier fallo -> 1 y no se sube nada.
set -u
ZIP="${1:-}"
DATOS="${2:-}"
[ -f "$ZIP" ] || { echo "Falta el zip. Uso: $0 <paquete.zip> <carpeta-datos>"; exit 1; }
[ -d "$DATOS" ] || { echo "Falta la carpeta de datos de prueba."; exit 1; }

QA="$(dirname "$0")/../../redcafecuador.com/_diseno/qa_servicios_api_20260917.py"
PUERTO=${PUERTO:-8271}
TMP=$(mktemp -d)
FALLOS=0
paso () { printf '  %-44s %s\n' "$1" "$2"; }
mal ()  { FALLOS=$((FALLOS+1)); }

trap 'PID=$(ss -ltnp 2>/dev/null | grep ":$PUERTO" | grep -o "pid=[0-9]*" | cut -d= -f2); [ -n "${PID:-}" ] && kill $PID 2>/dev/null; rm -rf "$TMP"' EXIT

echo "== Verificación de $(basename "$ZIP") =="

# 1. Compuerta: nada de data/, credenciales ni semillas.
if bash "$(dirname "$0")/comprobar-paquete.sh" "$ZIP" >/dev/null 2>&1; then
  paso "compuerta (sin data/, sin credenciales)" "OK"
else
  paso "compuerta" "FALLA"; mal
fi

# 2. Nada de datos de usuarios ni fotos dentro del paquete.
COLADAS=$(unzip -Z1 "$ZIP" | grep -cE "(^|/)(data|uploads)/|marcar-admin|\.push_vapid" || true)
if [ "$COLADAS" = "0" ]; then paso "sin datos de usuarios ni uploads" "OK"; else paso "datos colados" "FALLA ($COLADAS)"; mal; fi

# 3. Permisos: 640 provocó un 403 en producción en septiembre.
MALPERM=$(unzip -Z "$ZIP" | awk '/^-/{print $1}' | grep -vc '^-rw-r--r--' || true)
if [ "$MALPERM" = "0" ]; then paso "todos los archivos en 644" "OK"; else paso "permisos" "FALLA ($MALPERM archivos)"; mal; fi

# 4. Desplegar y servir.
unzip -q "$ZIP" -d "$TMP" || { paso "extraer" "FALLA"; exit 1; }
cp -r "$DATOS" "$TMP/data" 2>/dev/null
rm -rf "$TMP/data/.rate" "$TMP/data/.sess" "$TMP/data/.salud_ultimo"
php -d sendmail_path=/bin/true -S 127.0.0.1:$PUERTO -t "$TMP" >/dev/null 2>&1 &
sleep 2

# 5. Todas las rutas responden.
RUTAS=$(cd "$TMP" && find . -name index.html -not -path "./_next/*" | sed 's|^\.||; s|index.html$||' | sort)
TOT=0; MALR=0
while read -r r; do
  [ -z "$r" ] && continue
  TOT=$((TOT+1))
  C=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PUERTO$r")
  [ "$C" = "200" ] || { echo "      $C $r"; MALR=$((MALR+1)); }
done <<< "$RUTAS"
if [ "$MALR" = "0" ]; then paso "rutas del sitio" "OK ($TOT/$TOT)"; else paso "rutas" "FALLA ($MALR de $TOT)"; mal; fi

# 6. Ningún archivo de _next citado que no exista (limpieza mal hecha).
ROTOS=0
for f in $(cd "$TMP" && grep -rhoE '/_next/static/[A-Za-z0-9_./-]+\.(js|css|woff2?)' --include=index.html . | sort -u); do
  [ -f "$TMP$f" ] || { echo "      falta $f"; ROTOS=$((ROTOS+1)); }
done
if [ "$ROTOS" = "0" ]; then paso "assets de _next completos" "OK"; else paso "assets de _next" "FALLA ($ROTOS)"; mal; fi

# 7. Chunks perezosos que declara el runtime de webpack.
PERD=$(cd "$TMP" && python3 - <<'PY'
import re,glob,os
falta=0
for rt in glob.glob('_next/static/chunks/webpack-*.js'):
    t=open(rt,encoding='utf-8',errors='ignore').read()
    m=re.search(r'\.u\s*=\s*e=>"static/chunks/"\+(.{0,200}?)\+"\.js"', t)
    if not m: continue
    esp=dict(re.findall(r'(\d+)===e\?"([A-Za-z0-9_-]+)"', m.group(1)))
    for cid,h in re.findall(r'(\d+):"([0-9a-f]{12,24})"', m.group(1)):
        p='_next/static/chunks/%s.%s.js' % (esp.get(cid,cid), h)
        if not os.path.exists(p): print('      falta', p); falta+=1
print(falta)
PY
)
ULT=$(echo "$PERD" | tail -1)
if [ "$ULT" = "0" ]; then paso "chunks de carga perezosa" "OK"; else echo "$PERD" | head -5; paso "chunks perezosos" "FALLA"; mal; fi

# 7b. Rutas DINÁMICAS: el punto ciego que rompió producción el 24 de septiembre.
#     Una ficha de detalle (/marketplace/<id>/) devuelve 200 aunque falte su
#     chunk: el fallo ocurre después, en el navegador. Aquí se comprueba que
#     cada carpeta [id]/[slug] exista y tenga al menos un page-*.js.
DINAM=0; FALTA_DIN=0
for d in $(cd "$TMP" && find _next/static/chunks/app -type d -name '[[]*[]]' 2>/dev/null); do
  DINAM=$((DINAM+1))
  N=$(ls "$TMP/$d"/page-*.js 2>/dev/null | wc -l)
  [ "$N" -gt 0 ] || { echo "      sin page-*.js: $d"; FALTA_DIN=$((FALTA_DIN+1)); }
done
RUTAS_DIN=$(cd "$TMP" && find . -name index.html -not -path "./_next/*" -exec grep -lo 'academia/\[id\]\|marketplace/\[id\]\|noticias/\[slug\]\|recetas/\[slug\]' {} \; 2>/dev/null | wc -l)
if [ "$DINAM" = "0" ]; then
  paso "rutas dinámicas (fichas de detalle)" "FALLA (no hay ninguna carpeta [id]/[slug])"; mal
elif [ "$FALTA_DIN" = "0" ]; then
  paso "rutas dinámicas (fichas de detalle)" "OK ($DINAM rutas con su archivo)"
else
  paso "rutas dinámicas" "FALLA ($FALTA_DIN sin archivo)"; mal
fi

# 8. La suite de servicios y API.
if [ -f "$QA" ]; then
  sed "s/8170/$PUERTO/g" "$QA" > "$TMP/qa.py"
  python3 -c "
import base64
open('$TMP/f.png','wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='))"
  R=$(cd "$TMP" && timeout 900 python3 qa.py 2>&1 | head -1)
  case "$R" in
    80/80*|*"/${R#*/}"*) : ;;
  esac
  if echo "$R" | grep -qE '^([0-9]+)/\1 OK'; then paso "suite de servicios y API" "OK ($R)"
  else paso "suite de servicios y API" "FALLA ($R)"; mal; fi
else
  paso "suite de QA" "NO ENCONTRADA"; mal
fi

echo
if [ "$FALLOS" = "0" ]; then echo "TODO EN ORDEN. El paquete se puede subir."; exit 0
else echo "$FALLOS COMPROBACIÓN(ES) FALLARON. NO subir."; exit 1; fi
