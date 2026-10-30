#!/usr/bin/env python3
"""
Red Café Ecuador — paquete de ACTUALIZACIÓN sin archivos mutables.

    python3 herramientas/empaquetar-actualizacion.py <staging> <produccion> <version> <salida_dir> [nombre]

Incluye solo lo que cambia respecto a <produccion> (copia del public_html
publicado): archivos nuevos o con contenido distinto. Nunca incluye datos
mutables del servidor —data/, uploads/, sesiones, registros, respaldos— aunque
aparezcan en <staging>. Falla (exit 1) si algo mutable se cuela, si falta una
pieza obligatoria o si la versión no es única.

Salida: <nombre>.zip, <nombre>.zip.sha256 y <nombre>.MANIFIESTO.txt
(lista de rutas, para revisar qué se sube).
"""
import hashlib
import os
import re
import sys
import zipfile

MUTABLE_DIRS = {"data", "uploads", "Respaldo", "_respaldos", "context", "actualizacion", ".git"}
MUTABLE_RE = re.compile(
    r"(^|/)(error_log|\.redcafe_admin_pass|\.admin_pass_expira|\.semilla-hecha|\.DS_Store)$"
    r"|\.(log|bak|tmp|old|zip|sql|sha256|dump)$", re.I)
OBLIGATORIOS = ["index.html", ".htaccess", "redcafe-version.json", "sw.js", "api/_bootstrap.php"]


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 16), b""):
            h.update(b)
    return h.hexdigest()


def archivos(raiz):
    for d, subdirs, files in os.walk(raiz):
        rel = os.path.relpath(d, raiz)
        top = rel.split(os.sep)[0]
        if top in MUTABLE_DIRS:
            subdirs[:] = []
            continue
        for f in files:
            r = os.path.normpath(os.path.join(rel, f)).replace(os.sep, "/")
            if r.startswith("./"):
                r = r[2:]
            yield r


def main():
    staging, prod, ver, salida = sys.argv[1:5]
    nombre = sys.argv[5] if len(sys.argv) > 5 else f"redcafeecuador-produccion-{ver}"
    os.makedirs(salida, exist_ok=True)
    problemas, lista = [], []

    for r in sorted(archivos(staging)):
        if MUTABLE_RE.search(r):
            continue
        a = os.path.join(staging, r)
        b = os.path.join(prod, r)
        if not os.path.exists(b) or sha(a) != sha(b):
            lista.append(r)

    for r in lista:
        if r.split("/")[0] in MUTABLE_DIRS or MUTABLE_RE.search(r):
            problemas.append(f"archivo mutable en el paquete: {r}")
    for r in OBLIGATORIOS:
        if r not in lista and not os.path.exists(os.path.join(staging, r)):
            problemas.append(f"falta pieza obligatoria: {r}")

    # Versión única en lo que se sube.
    viejas = set()
    for r in lista:
        if r.endswith((".html", ".txt", ".js", ".json")):
            s = open(os.path.join(staging, r), encoding="utf8", errors="replace").read()
            viejas |= {v for v in re.findall(r"\?v=([0-9]{8}[a-z])\b", s) if v != ver}
    if viejas:
        problemas.append(f"versiones distintas de {ver} en el paquete: {sorted(viejas)}")
    v = open(os.path.join(staging, "redcafe-version.json"), encoding="utf8").read()
    if ver not in v:
        problemas.append("redcafe-version.json no lleva la versión del paquete")

    if problemas:
        for p in problemas:
            print("  PROBLEMA:", p)
        sys.exit(1)

    zpath = os.path.join(salida, nombre + ".zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for r in lista:
            z.write(os.path.join(staging, r), r)
    digest = sha(zpath)
    open(zpath + ".sha256", "w").write(f"{digest}  {os.path.basename(zpath)}\n")
    with open(os.path.join(salida, nombre + ".MANIFIESTO.txt"), "w", encoding="utf8") as m:
        m.write(f"Paquete {nombre} · versión {ver} · {len(lista)} archivos\n")
        m.write("Solo archivos nuevos o modificados respecto a producción. Sin data/ ni uploads/.\n\n")
        m.write("\n".join(lista) + "\n")
    tam = os.path.getsize(zpath) / 1024 / 1024
    print(f"OK {zpath} · {len(lista)} archivos · {tam:.1f} MB · sha256 {digest[:16]}…")


if __name__ == "__main__":
    main()
