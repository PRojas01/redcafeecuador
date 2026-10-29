#!/usr/bin/env bash
# Convierte data/ del sitio PHP en un .sql (estructura + datos) para importar en la
# base MySQL del hosting (phpMyAdmin o «Importar» de GoDaddy Node.js Hosting).
#
# Uso:
#   MYSQL_CLAVE=... servidor/herramientas/convertir-datos-a-sql.sh \
#       <carpeta data/> <redcafe-produccion.env> <salida.sql> [.redcafe_admin_pass]
#
# Requisitos: MySQL 8 LOCAL (el primer comando usa la cuenta de administración
# del MySQL local para crear la base temporal «redcafe_migracion»), Node 22 y
# `npm ci && npm run build` hecho en servidor/. Usa la MISMA REDCAFE_CLAVE_DATOS
# que producción: con otra, las cédulas no se podrán leer.
# El .sql resultante contiene DATOS PERSONALES: confidencial, borrar tras importar.
set -euo pipefail
DATA=$(realpath "$1"); ENVF=$(realpath "$2"); OUT=$3; PASSADM=${4:-}
SRV=$(cd "$(dirname "$0")/.." && pwd)
BD=redcafe_migracion
CLAVE=$(grep '^REDCAFE_CLAVE_DATOS=' "$ENVF" | cut -d'"' -f2)
[ ${#CLAVE} -eq 64 ] || { echo "Clave de datos no válida en $ENVF"; exit 2; }
mysql -e "DROP DATABASE IF EXISTS $BD; CREATE DATABASE $BD; GRANT ALL ON $BD.* TO '${MYSQL_USUARIO:-redcafe}'@'localhost';"
mysql -u"${MYSQL_USUARIO:-redcafe}" -p"${MYSQL_CLAVE:?define MYSQL_CLAVE}" $BD < $SRV/prisma/esquema-mysql.sql 2>/dev/null
export DATABASE_URL="mysql://${MYSQL_USUARIO:-redcafe}:${MYSQL_CLAVE}@127.0.0.1:3306/$BD" REDCAFE_CLAVE_DATOS="$CLAVE"
ARGS=("$DATA"); [ -n "$PASSADM" ] && ARGS+=(--pass-admin "$PASSADM")
echo "== Simulación"; node $SRV/dist/legacy/importar.js "${ARGS[@]}"
echo "== Importación"; node $SRV/dist/legacy/importar.js "${ARGS[@]}" --aplicar | tail -8
echo "== Recuento en la base"
mysql -u"${MYSQL_USUARIO:-redcafe}" -p"${MYSQL_CLAVE:?define MYSQL_CLAVE}" -N $BD -e "SELECT 'Usuario',COUNT(*) FROM Usuario UNION ALL SELECT 'Consentimiento',COUNT(*) FROM Consentimiento UNION ALL SELECT 'CodigoRespaldo',COUNT(*) FROM CodigoRespaldo UNION ALL SELECT 'Secreto',COUNT(*) FROM Secreto UNION ALL SELECT 'Administrador',COUNT(*) FROM Administrador UNION ALL SELECT CONCAT('Documento:',coleccion),COUNT(*) FROM Documento GROUP BY coleccion" 2>/dev/null
{ echo "-- Red Café Ecuador: estructura + datos migrados del sitio PHP ($(date -u +%F))"
  echo "-- Importar en phpMyAdmin sobre una base VACÍA. CONFIDENCIAL: contiene datos personales."
  echo "SET NAMES utf8mb4; SET FOREIGN_KEY_CHECKS = 0;"
  mysqldump -uredcafe -predcafe-local --no-tablespaces --single-transaction --skip-comments --skip-add-locks \
    --set-gtid-purged=OFF --default-character-set=utf8mb4 --hex-blob --skip-triggers --routines=false $BD 2>/dev/null
  echo "SET FOREIGN_KEY_CHECKS = 1;"; } > "$OUT"
chmod 600 "$OUT"; ls -la "$OUT"
