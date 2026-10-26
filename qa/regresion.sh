#!/usr/bin/env bash
# Regresión completa de una instancia local: qa/regresion.sh <puerto> <etiqueta>
export PATH="$HOME/.local/node/bin:$PATH"
P=$1; E=$2; B=http://127.0.0.1:$P; S=local/sitio-$P; O=qa/regresion-$E; mkdir -p $O
limpia() { rm -rf $S/data/.rate; }
limpia; python3 qa/qa_api.py $B $S $E > $O/api.txt 2>&1
limpia; python3 qa/e2e_cursos.py $B $S > $O/cursos.txt 2>&1
limpia; python3 qa/auditoria_perfiles_admin.py $B $S $O/admin.json > $O/admin.txt 2>&1
limpia; node qa/e2e_usuarios.mjs $B $O/usuarios > $O/usuarios.txt 2>&1
limpia; node qa/e2e_movil.mjs $B $O/movil > $O/movil.txt 2>&1
limpia; node qa/recorrido.mjs $B $S $E $O/recorrido.json > $O/recorrido.txt 2>&1
limpia; node qa/parpadeo.mjs $B $O/parpadeo.json > $O/parpadeo.txt 2>&1
echo FIN > $O/FIN
