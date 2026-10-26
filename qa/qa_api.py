#!/usr/bin/env python3
"""
QA de API y seguridad contra una instancia local (local/levantar.sh).

    python3 qa/qa_api.py http://127.0.0.1:8990 local/sitio-8990 [etiqueta]

Usa SOLO datos sintéticos: cuentas de prueba creadas aquí por la API real, en
un data/ local vacío. Nunca se ejecuta contra producción (se niega si la URL no
es 127.0.0.1/localhost).
"""
import concurrent.futures as cf
import http.cookiejar
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request

BASE, SITIO = sys.argv[1].rstrip("/"), sys.argv[2]
ETIQ = sys.argv[3] if len(sys.argv) > 3 else BASE
if not any(h in BASE for h in ("127.0.0.1", "localhost")):
    sys.exit("Solo contra instancias locales.")

RES = []  # (id, categoría, descripción, ok, detalle)


def cliente():
    # La cookie de sesión lleva Secure; en local (http://127.0.0.1) hay que
    # aceptarla igual o la sesión no se mantiene.
    pol = http.cookiejar.DefaultCookiePolicy(secure_protocols=("https", "wss", "http"))
    cj = http.cookiejar.CookieJar(policy=pol)
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    return op


def pedir(op, ruta, datos=None, metodo=None, cab=None):
    url = BASE + ruta
    body = json.dumps(datos).encode() if datos is not None else None
    req = urllib.request.Request(url, data=body, method=metodo or ("POST" if body else "GET"))
    req.add_header("Content-Type", "application/json")
    # El proxy de origen del sitio: las peticiones reales van con Origin propio.
    req.add_header("Origin", BASE)
    for k, v in (cab or {}).items():
        req.add_header(k, v)
    try:
        with op.open(req, timeout=30) as r:
            raw = r.read()
            return r.status, dict(r.headers), raw
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def js(raw):
    try:
        return json.loads(raw or b"{}")
    except Exception:
        return {}


def caso(id_, cat, desc, ok, detalle=""):
    RES.append((id_, cat, desc, bool(ok), str(detalle)[:160]))


# ---------------------------------------------------------------- preparar
# Material que en el servidor real existe y NO debe servirse (se simula aquí
# igual en las dos versiones para comparar sus reglas).
os.makedirs(os.path.join(SITIO, "Respaldo", "api"), exist_ok=True)
open(os.path.join(SITIO, "Respaldo", "api", "ping.php"), "w").write("<?php echo 'RESPALDO-VIVO';")
open(os.path.join(SITIO, "NOTAS-INTERNAS.md"), "w").write("interno")
open(os.path.join(SITIO, "uploads", "subido.php"), "w").write("<?php echo 'EJECUTADO';")

anon = cliente()
# Estado local limpio entre corridas: límites por IP y contraseña admin (que el
# PHP busca también un nivel por encima de la carpeta del sitio).
import shutil
shutil.rmtree(os.path.join(SITIO, "data", ".rate"), ignore_errors=True)
for f in (os.path.join(SITIO, "data", ".redcafe_admin_pass"), os.path.join(os.path.dirname(os.path.abspath(SITIO)), ".redcafe_admin_pass")):
    if os.path.exists(f): os.remove(f)

# ---------------------------------------------------------------- seguridad: archivos
for id_, ruta, esperado, desc in [
    ("SEG-01", "/data/members.json", {403, 404}, "data/ no se sirve"),
    ("SEG-02", "/data/.redcafe_admin_pass", {403, 404}, "contraseña admin no se sirve"),
    ("SEG-03", "/.htaccess", {403, 404}, ".htaccess no se sirve"),
    ("SEG-04", "/Respaldo/api/ping.php", {403, 404}, "copia /Respaldo/ no ejecuta PHP"),
    ("SEG-05", "/NOTAS-INTERNAS.md", {403, 404}, "notas .md internas no se sirven"),
    ("SEG-06", "/api/_bootstrap.php", {403, 404}, "includes api/_*.php no accesibles"),
    ("SEG-07", "/uploads/subido.php", {403, 404}, "PHP subido a uploads/ no se ejecuta"),
]:
    st, _, body = pedir(anon, ruta)
    caso(id_, "Seguridad", desc, st in esperado and b"RESPALDO-VIVO" not in body and b"EJECUTADO" not in body, f"HTTP {st}")

st, cab, _ = pedir(anon, "/")
cabs = {k.lower(): v for k, v in cab.items()}
caso("SEG-08", "Seguridad", "Content-Security-Policy presente", "content-security-policy" in cabs, cabs.get("content-security-policy", "ausente"))
caso("SEG-09", "Seguridad", "Permissions-Policy presente", "permissions-policy" in cabs, cabs.get("permissions-policy", "ausente"))
hsts = open(os.path.join(SITIO, ".htaccess")).read()
import re
m = re.search(r"Strict-Transport-Security \"max-age=(\d+)", hsts)
caso("SEG-10", "Seguridad", "HSTS ≥ 1 año (.htaccess)", m and int(m.group(1)) >= 31536000, f"max-age={m.group(1) if m else '?'}")

# ---------------------------------------------------------------- funcional: cuentas
sufijo = secrets.token_hex(3)
PASS = "Prueba-" + secrets.token_hex(6)
A = {"nombre": "Productora Prueba", "email": f"prod.{sufijo}@ejemplo.test", "pass": PASS, "rol": "productor",
     "roles": ["productor"], "telefono": "0990000001", "cedula": "0000000001", "provincia": "Loja",
     "acepta_terminos": True, "acepta_privacidad": True, "acepta_uso_datos": True}
B = dict(A, nombre="Comprador Prueba", email=f"comp.{sufijo}@ejemplo.test", rol="comprador", roles=["comprador"],
         telefono="0990000002", cedula="0000000002", provincia="Pichincha")

ca, cb = cliente(), cliente()
st, _, r = pedir(ca, "/api/auth.php?action=register", A)
caso("FUN-01", "Funcional", "Registro de productora", st == 200 and js(r).get("ok"), f"HTTP {st} {js(r).get('error','')}")
st, _, r = pedir(cb, "/api/auth.php?action=register", B)
caso("FUN-02", "Funcional", "Registro de comprador", st == 200 and js(r).get("ok"), f"HTTP {st} {js(r).get('error','')}")

for op, u in ((ca, A), (cb, B)):
    pedir(op, "/api/auth.php?action=logout", {})
    st, _, r = pedir(op, "/api/auth.php?action=login", {"email": u["email"], "pass": u["pass"]})
st, _, r = pedir(ca, "/api/auth.php?action=me")
me_a = (js(r).get("data") or {}).get("user") or {}
caso("FUN-03", "Funcional", "Login y sesión (me)", me_a.get("email") == A["email"], f"HTTP {st}")
id_a = me_a.get("id", "")

# ---------------------------------------------------------------- seguridad: datos personales
st, _, r = pedir(anon, "/api/members.php?action=list")
caso("SEG-11", "Seguridad", "Listado de miembros exige sesión", st in (401, 403), f"HTTP {st}")

st, _, r = pedir(cb, "/api/members.php?action=list")
texto = r.decode("utf8", "replace")
fuga = [c for c in (A["cedula"], A["telefono"], A["email"]) if c in texto]
caso("SEG-12", "Seguridad", "Un miembro NO ve cédula/teléfono/correo de otros (list)", st == 200 and not fuga, f"HTTP {st}; expuestos: {len(fuga)} de 3")

st, _, r = pedir(cb, f"/api/members.php?action=get&id={id_a}")
texto = r.decode("utf8", "replace")
fuga = [c for c in (A["cedula"], A["telefono"], A["email"]) if c in texto]
caso("SEG-13", "Seguridad", "Un miembro NO ve datos personales de otro (get)", not fuga, f"HTTP {st}; expuestos: {len(fuga)} de 3")

st, _, r = pedir(ca, f"/api/members.php?action=get&id={id_a}")
caso("FUN-04", "Funcional", "El miembro ve su propia ficha completa", A["telefono"] in r.decode("utf8", "replace"), f"HTTP {st}")

# ---------------------------------------------------------------- funcional: marketplace
lote = {"finca": "Finca Prueba", "provincia": "Loja", "variedad": "Typica", "proceso": "Lavado",
        "precioSaco": 250, "sacos": 10, "stockSacos": 10, "altura": 1800, "categoria": "verde"}
st, _, r = pedir(ca, "/api/lotes.php?action=publish", lote)
lote_id = ((js(r).get("data") or {}).get("lote") or {}).get("id", "")
caso("FUN-05", "Funcional", "Productora publica lote", st == 200 and lote_id, f"HTTP {st} {js(r).get('error','')}")

st, _, r = pedir(anon, "/api/lotes.php?action=list")
caso("FUN-06", "Funcional", "Lote visible en el listado público", lote_id and lote_id in r.decode("utf8", "replace"), f"HTTP {st}")

st, _, r = pedir(cb, "/api/pedidos.php?action=create",
                 {"loteId": lote_id, "finca": "Finca Prueba", "productor": A["nombre"], "sacos": 2, "total": 500})
caso("FUN-07", "Funcional", "Comprador crea pedido del lote", bool(lote_id) and st == 200 and js(r).get("ok"), f"HTTP {st} {js(r).get('error','')}")

st, _, r = pedir(ca, "/api/pedidos.php?action=list&rol=productor")
caso("FUN-08", "Funcional", "Productora ve el pedido recibido", bool(lote_id) and st == 200 and lote_id in r.decode("utf8", "replace"), f"HTTP {st}")

st, _, r = pedir(cb, f"/api/lotes.php?action=delete&id={lote_id}", {}, "POST")
st2, _, r2 = pedir(anon, "/api/lotes.php?action=list")
caso("SEG-14", "Seguridad", "Un tercero no puede borrar un lote ajeno", bool(lote_id) and lote_id in r2.decode("utf8", "replace"), f"borrado→HTTP {st}")

st, _, r = pedir(cb, "/api/pedidos.php?action=create",
                 {"loteId": "no-existe-" + sufijo, "finca": "Inventada", "productor": "Nadie", "sacos": 1, "total": 10})
caso("VAL-01", "Validación", "No se aceptan pedidos de un lote inexistente", st >= 400, f"HTTP {st} {js(r).get('error','')}")

# ---------------------------------------------------------------- admin
pedir(anon, "/api/auth.php?action=admin_login", {"pass": "incorrecta"})  # crea el archivo si no existe
cands = [os.path.join(os.path.dirname(os.path.abspath(SITIO)), ".redcafe_admin_pass"), os.path.join(SITIO, "data", ".redcafe_admin_pass")]
f = next((c for c in cands if os.path.exists(c)), "")
adm = cliente()
clave = open(f).read().strip() if f else ""
st, _, r = pedir(adm, "/api/auth.php?action=admin_login", {"pass": clave}) if not clave.startswith("$2") else (0, {}, b"")
caso("FUN-09", "Funcional", "Login de administración", js(r).get("ok"), f"HTTP {st}")
st, _, r = pedir(adm, "/api/members.php?action=all")
caso("FUN-10", "Funcional", "Admin lista miembros completos", st == 200 and A["email"] in r.decode("utf8", "replace"), f"HTTP {st}")
st, _, r = pedir(cb, "/api/members.php?action=all")
caso("SEG-15", "Seguridad", "Un miembro no accede a funciones de admin", st in (401, 403), f"HTTP {st}")

# ---------------------------------------------------------------- fuerza bruta
atac = cliente()
codigos = [pedir(atac, "/api/auth.php?action=login", {"email": A["email"], "pass": "mal-" + str(i)})[0] for i in range(12)]
caso("SEG-16", "Seguridad", "Login frena fuerza bruta (429 tras 10 fallos)", 429 in codigos, f"códigos: {codigos[-3:]}")

# ---------------------------------------------------------------- concurrencia
N = 80
ruta_prueba = "/qa-concurrencia-" + sufijo


def evento(_):
    return pedir(cliente(), "/api/metricas.php?action=evento", {"e": "visita", "p": ruta_prueba})[0]


t0 = time.time()
with cf.ThreadPoolExecutor(max_workers=16) as ex:
    cods = list(ex.map(evento, range(N)))
dur = time.time() - t0
time.sleep(0.5)
datos = json.load(open(os.path.join(SITIO, "data", "metricas.json")))
guardados = sum(v for dia in datos.values() if isinstance(dia, dict) for k, v in dia.items() if ruta_prueba.strip("/") in k)
aceptados = sum(1 for c in cods if c == 204)
caso("CON-01", "Integridad", f"{N} escrituras simultáneas sin pérdida", guardados == aceptados,
     f"enviadas {aceptados}, guardadas {guardados} ({aceptados - guardados} perdidas) en {dur:.1f}s")

# ---------------------------------------------------------------- informe
ok = sum(1 for x in RES if x[3])
print(json.dumps({"etiqueta": ETIQ, "ok": ok, "total": len(RES), "casos": RES}, ensure_ascii=False))
