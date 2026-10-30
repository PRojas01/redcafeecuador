#!/usr/bin/env bash
# Red Café Ecuador — despliegue local completo para pruebas.
#
#   local/levantar.sh <carpeta-del-sitio> [puerto]
#   local/levantar.sh staging-20260928a 8990
#
# Copia el sitio a local/sitio/ (nunca se prueba sobre la carpeta a empaquetar),
# con data/ y uploads/ VACÍOS: la API siembra sola los datos de demostración
# (api/_semilla.php) y las cuentas de prueba se crean con local/cuentas-prueba.sh.
# Nunca se copian datos reales de producción.
set -euo pipefail

ORIGEN="${1:?falta la carpeta del sitio, p. ej. staging-20260928a}"
PUERTO="${2:-8990}"
AQUI="$(cd "$(dirname "$0")" && pwd)"
DESTINO="$AQUI/sitio-$PUERTO"

# Shells que no cargan ~/.zprofile no tienen Homebrew en el PATH.
if ! command -v php >/dev/null && [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi
command -v php >/dev/null || { echo "Falta PHP (brew install php)"; exit 2; }
if /usr/sbin/lsof -nP -iTCP:"$PUERTO" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "El puerto $PUERTO ya está en uso: la instancia ya está corriendo en http://localhost:$PUERTO/"
  exit 0
fi
[ -d "$ORIGEN" ] || { echo "No existe $ORIGEN"; exit 2; }

# Actualiza el código y CONSERVA data/ y uploads/ locales (cuentas y
# contenido de prueba) entre relanzamientos. Para empezar de cero:
# rm -rf "$DESTINO" antes de lanzar.
rsync -a --delete --exclude '/data/' --exclude '/uploads/' "$ORIGEN/" "$DESTINO/"
mkdir -p "$DESTINO/data" "$DESTINO/uploads"
# Las mismas protecciones que en el servidor.
printf 'Require all denied\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\n' > "$DESTINO/data/.htaccess"
printf 'php_flag engine off\n<FilesMatch "\\.(php|phtml|phar|cgi|pl|py|sh|htaccess)$">\n  Require all denied\n</FilesMatch>\nOptions -Indexes -ExecCGI\n' > "$DESTINO/uploads/.htaccess"

echo "Sitio local: http://localhost:$PUERTO/   (Ctrl-C para detener)"
export PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-8}"
exec php -S "127.0.0.1:$PUERTO" -t "$DESTINO" "$AQUI/router.php"
