#!/usr/bin/env bash
# Paridad: corre la suite qa/ del proyecto contra el servidor nuevo, sobre una
# base de pruebas vacía.  Uso: ./paridad.sh <puerto> <carpeta-sitio> [script qa...]
set -euo pipefail
cd "$(dirname "$0")"
P=${1:-8095}; SITIO=$(realpath "${2:?carpeta del sitio}"); shift 2 || true
export DATABASE_URL="postgresql://postgres@localhost:5432/redcafe_test?host=/tmp"
export REDCAFE_CLAVE_DATOS=$(grep REDCAFE_CLAVE_DATOS .env | cut -d'"' -f2)
export REDCAFE_SITIO="$SITIO" REDCAFE_ENTORNO=prueba REDCAFE_ARCHIVO_PASS_ADMIN=auto PUERTO=$P
npx prisma db push --skip-generate >/dev/null
# Vaciado SOLO de la base de pruebas local (nunca otra): las tablas, no la base.
case "$DATABASE_URL" in *"/redcafe_test?host=/tmp") ;; *) echo "Base no es redcafe_test local: abortado"; exit 2;; esac
psql -h /tmp -U postgres -d redcafe_test -qc "DO \$\$ DECLARE t text; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' LOOP EXECUTE format('TRUNCATE TABLE %I CASCADE', t); END LOOP; END \$\$;"
mkdir -p "$SITIO/data" "$SITIO/uploads"
rm -rf "$SITIO/data/.rate" "$SITIO/data/.redcafe_admin_pass" "$(dirname "$SITIO")/.redcafe_admin_pass"
node --import tsx src/index.ts > "/tmp/paridad-$P.log" 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$P/" && break; sleep 0.25; done
cd ..
for s in "${@:-qa/qa_api.py}"; do
  echo "=== $s"
  case "$s" in
    *.py) python3 "$s" "http://127.0.0.1:$P" "$SITIO" paridad 2>&1 | tail -40 ;;
    *.mjs) node "$s" "http://127.0.0.1:$P" "$SITIO" 2>&1 | tail -40 ;;
  esac
done
