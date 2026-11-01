#!/usr/bin/env bash
# Suite completa de una instancia local: qa/suite-completa.sh <puerto> <etiqueta>
export PATH="$HOME/.local/node/bin:$PATH"
P=$1; E=$2; B=http://127.0.0.1:$P; S=local/sitio-$P; O=qa/regresion-$E
bash qa/regresion.sh $P $E
fresco() { rsync -a --delete local/sitio-8991/data/ $S/data/; rm -f local/.redcafe_admin_pass $S/data/.redcafe_admin_pass; }
fresco; node qa/e2e_mejoras.mjs $B $O/mejoras > $O/mejoras.txt 2>&1
fresco; python3 qa/auditoria_dueno.py $B $S > $O/dueno.txt 2>&1
fresco; python3 qa/auditoria_moderacion.py $B $S > $O/moderacion.txt 2>&1
fresco; node qa/e2e_cuentas.mjs $B $S $O/cuentas > $O/cuentas.txt 2>&1
fresco; node qa/e2e_portada_botones.mjs $B $O/portada > $O/portada.txt 2>&1
echo FIN > $O/FIN2
