#!/usr/bin/env bash
# Paridad: corre la suite qa/ del proyecto contra el servidor nuevo, sobre una
# base de pruebas vacía.  Uso: ./paridad.sh <puerto> <carpeta-sitio> [script qa...]
set -euo pipefail
cd "$(dirname "$0")"
P=${1:-8095}; SITIO=$(realpath "${2:?carpeta del sitio}"); shift 2 || true
export DATABASE_URL="mysql://redcafe:redcafe-local@127.0.0.1:3306/redcafe_test"
export REDCAFE_CLAVE_DATOS=$(grep REDCAFE_CLAVE_DATOS .env | cut -d'"' -f2)
export REDCAFE_SITIO="$SITIO" REDCAFE_ENTORNO=prueba REDCAFE_ARCHIVO_PASS_ADMIN=auto PUERTO=$P
npx prisma db push --skip-generate >/dev/null && npx tsx src/scripts/preparar-base.ts >/dev/null
# Vaciado SOLO de la base de pruebas local (nunca otra): las tablas, no la base.
case "$DATABASE_URL" in *"@127.0.0.1:3306/redcafe_test") ;; *) echo "Base no es redcafe_test local: abortado"; exit 2;; esac
TABLAS=$(mysql -N -uredcafe -predcafe-local redcafe_test -e "SELECT table_name FROM information_schema.tables WHERE table_schema='redcafe_test'" 2>/dev/null)
{ echo "SET FOREIGN_KEY_CHECKS=0;"; for t in $TABLAS; do echo "TRUNCATE TABLE \`$t\`;"; done; echo "SET FOREIGN_KEY_CHECKS=1;"; } | mysql -uredcafe -predcafe-local redcafe_test 2>/dev/null
mkdir -p "$SITIO/data" "$SITIO/uploads"
rm -rf "$SITIO/data/.rate" "$SITIO/data/.redcafe_admin_pass" "$(dirname "$SITIO")/.redcafe_admin_pass"
node --import tsx src/index.ts > "/tmp/paridad-$P.log" 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$P/" && break; sleep 0.25; done
cd ..
for s in "${@:-qa/qa_api.py}"; do
  echo "=== $s"
  rm -rf "$SITIO/data/.rate"   # cada script empieza con los cupos de intentos a cero
  case "$s" in
    *.py) python3 "$s" "http://127.0.0.1:$P" "$SITIO" paridad 2>&1 | tail -40 ;;
    *.mjs) mkdir -p "/tmp/paridad-capturas-$P" && node "$s" "http://127.0.0.1:$P" "$SITIO" "/tmp/paridad-capturas-$P" 2>&1 | tail -40 ;;
  esac
done
