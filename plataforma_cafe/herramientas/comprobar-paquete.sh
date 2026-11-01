#!/usr/bin/env bash
# Compuerta antes de subir: rechaza cualquier paquete o carpeta que lleve datos.
#
#   ./comprobar-paquete.sh ../out
#   ./comprobar-paquete.sh /ruta/redcafeecuador-produccion-XXXX.zip
#
# Existe porque `next build` copia public/ dentro de out/, y en public/data/
# había una copia vieja de los datos: lotes.json con 6 lotes cuando producción
# tiene 8, y los precios anteriores. Subirlo habría borrado los lotes de una
# productora real. Sale distinto de 0 si encuentra algo así.
set -u
OBJ="${1:?falta la carpeta o el zip a comprobar}"

if [ -f "$OBJ" ]; then
  listado="$(unzip -Z1 "$OBJ")"
else
  listado="$(cd "$OBJ" && find . -type f | sed 's|^\./||')"
fi

# Se rechaza la CARGA de datos, no el guardián. api/_semilla.php es justo lo
# que impide que un paquete pise datos reales: ese sí debe viajar. Lo que no
# puede viajar es data/, la carga en data/_semilla/, los respaldos y las
# sesiones PHP.
malos="$(printf '%s\n' "$listado" | grep -E '^data/|/data/|\.sess|_respaldos|\.semilla-hecha|\.semilla\.log' || true)"

# CREDENCIALES. En el árbol del fuente conviven archivos de contraseña fuera de
# data/ —.redcafe_admin_pass, .secretos/, admin-pass-RECUPERACION.txt— y la
# compuerta no los miraba: un ZIP hecho desde la raíz equivocada habría pasado
# llevando la contraseña de administración dentro. Ya ocurrió algo así en otro
# proyecto de la casa: un respaldo con credenciales quedó descargable.
secretos="$(printf '%s\n' "$listado" | grep -E '(^|/)\.redcafe_admin_pass$|(^|/)\.secretos/|admin-pass|(^|/)\.env($|\.)|\.(pem|key|p12)$' || true)"
if [ -n "$secretos" ]; then
  echo "RECHAZADO: el paquete lleva credenciales."
  printf '%s\n' "$secretos" | head -10 | sed 's/^/  /'
  exit 1
fi

# uploads/ es aparte: son las fotos que subieron los miembros. No borra nada al
# extraer, pero sí sobreescribe con una copia local cualquier archivo del mismo
# nombre, así que puede revertir una foto que alguien haya cambiado. Se avisa.
subidas="$(printf '%s\n' "$listado" | grep -cE '^uploads/.+' || true)"

if [ -n "$malos" ]; then
  echo "RECHAZADO: el paquete lleva datos o rastros de siembra."
  printf '%s\n' "$malos" | head -20 | sed 's/^/  /'
  n="$(printf '%s\n' "$malos" | wc -l)"
  [ "$n" -gt 20 ] && echo "  … y $((n-20)) más"
  echo
  echo "Los datos reales viven solo en el servidor. Quítalos del paquete."
  exit 1
fi

if [ "${subidas:-0}" -gt 0 ]; then
  echo "AVISO: el paquete lleva $subidas archivos de uploads/ (fotos de miembros)."
  echo "  Al extraer sobreescribiría con copias locales las que tengan el mismo"
  echo "  nombre. Conviene excluir uploads/ salvo en una instalación nueva."
fi
# .htaccess. El del fuente y el de producción llegaron a ser distintos, y el
# del fuente NO traía las reglas que producción sí tiene: bloquear api/api,
# los archivos ocultos, los .bak/.log/.zip/.sql y error_log. Subir ese build
# habría reabierto puertas ya cerradas sin que nadie lo notara.
if [ -d "$OBJ" ] && [ -f "$OBJ/.htaccess" ]; then
  faltan=""
  for regla in 'RewriteRule \^data/' 'RewriteRule \^api/api/' 'RewriteRule \(\^\|/\)\\\.' 'error_log'; do
    grep -qE "$regla" "$OBJ/.htaccess" || faltan="$faltan\n  falta: $regla"
  done
  if [ -n "$faltan" ]; then
    echo "RECHAZADO: el .htaccess del paquete es más débil que el de producción."
    printf "$faltan\n"
    exit 1
  fi
fi

echo "OK: sin data/, sin credenciales, sin semillas. .htaccess con las reglas de producción. $(printf '%s\n' "$listado" | wc -l) archivos."
