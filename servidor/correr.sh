#!/usr/bin/env bash
# Arranca el servidor en segundo plano para pruebas locales: ./correr.sh [puerto]
cd "$(dirname "$0")"
set -a; . ./.env; set +a
export PUERTO="${1:-$PUERTO}"
exec npx tsx src/index.ts
