#!/usr/bin/env python3
"""
Prueba de extremo a extremo del sistema de cursos (API real, instancia local).

    python3 qa/e2e_cursos.py http://127.0.0.1:8990 local/sitio-8990

Personas (todas sintéticas): autora y coautora (Asesor Experto), dos alumnos,
un intruso. Cubre: publicar, aviso en Comunidad, matrícula, avance, lista y
exportación CSV de inscritos, coautoría y sus límites, curso con aprobación,
edición, desasociar y protecciones.
"""
import http.cookiejar
import json
import os
import secrets
import shutil
import sys
import urllib.error
import urllib.request

BASE, SITIO = sys.argv[1].rstrip("/"), sys.argv[2]
if not any(h in BASE for h in ("127.0.0.1", "localhost")):
    sys.exit("Solo local")
shutil.rmtree(os.path.join(SITIO, "data", ".rate"), ignore_errors=True)
SUF = secrets.token_hex(3)
R = []


def cli():
    pol = http.cookiejar.DefaultCookiePolicy(secure_protocols=("https", "wss", "http"))
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar(policy=pol)))


def api(op, ruta, datos=None):
    req = urllib.request.Request(BASE + ruta, data=json.dumps(datos).encode() if datos is not None else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with op.open(req, timeout=30) as r:
            b = r.read(); ct = r.headers.get("Content-Type", "")
            return r.status, (json.loads(b) if "json" in ct and b else b.decode("utf8", "replace"))
    except urllib.error.HTTPError as e:
        b = e.read()
        try: return e.code, json.loads(b)
        except Exception: return e.code, b.decode("utf8", "replace")


def caso(id_, desc, ok, det=""):
    R.append((id_, desc, bool(ok), str(det)[:140]))


def persona(nombre, rol, email_pref):
    op = cli()
    d = {"nombre": nombre, "email": f"{email_pref}.{SUF}@ejemplo.test", "pass": "Prueba-" + SUF + "x",
         "rol": rol, "roles": [rol], "provincia": "Loja", "acepta_terminos": True,
         "acepta_privacidad": True, "acepta_uso_datos": True}
    st, r = api(op, "/api/auth.php?action=register", d)
    st2, me = api(op, "/api/auth.php?action=me")
    u = (me.get("data") or {}).get("user") or {} if isinstance(me, dict) else {}
    return op, u, d


autora, uA, dA = persona("Ana Autora", "asesor", "autora")
coaut, uC, dC = persona("Carla Coautora", "asesor", "coautora")
alum1, u1, d1 = persona("Luis Alumno", "comprador", "alumno1")
alum2, u2, d2 = persona("=HYPERLINK(\"http://x\")", "productor", "alumno2")  # prueba de inyección CSV
intru, uI, dI = persona("Iván Intruso", "comprador", "intruso")
caso("C-00", "Cuentas de prueba creadas (autora, coautora, 2 alumnos, intruso)",
     all(x.get("id") for x in (uA, uC, u1, u2, uI)), [x.get("rol") for x in (uA, uC, u1, u2, uI)])

MODS = [{"titulo": "Módulo 1 · Suelo", "minutos": 20, "lecciones": [{"titulo": "L1", "contenido": "Texto 1"}, {"titulo": "L2", "contenido": "Texto 2"}]},
        {"titulo": "Módulo 2 · Cosecha", "minutos": 25, "lecciones": [{"titulo": "L3", "contenido": "Texto 3"}, {"titulo": "L4", "contenido": "Texto 4"}]}]

st, r = api(alum1, "/api/cursos.php?action=publish", {"titulo": "Curso pirata " + SUF, "modulos": MODS})
caso("C-01", "Sin perfil Asesor no se puede publicar", st == 403, f"HTTP {st}")

st, r = api(autora, "/api/cursos.php?action=publish", {"titulo": "Cafetal sano " + SUF, "descripcion": "Curso de prueba",
            "categoria": "produccion", "acceso": "abierto", "modulos": MODS})
curso = (((r or {}).get("data") or {}).get("curso") or {}).get("id") if isinstance(r, dict) else None
curso = curso or (((r or {}).get("data") or {}).get("id") if isinstance(r, dict) else None)
caso("C-02", "La autora publica un curso abierto (2 módulos, 4 lecciones)", st == 200 and curso, f"HTTP {st} id={curso} {r if st != 200 else ''}")

st, r = api(cli(), "/api/cursos.php?action=list")
caso("C-03", "El curso aparece en el catálogo público", curso and curso in json.dumps(r, ensure_ascii=False), f"HTTP {st}")

st, r = api(cli(), "/api/comunidad.php?action=list")
caso("C-04", "Se publica el aviso automático en Comunidad", "Cafetal sano " + SUF in json.dumps(r, ensure_ascii=False), f"HTTP {st}")

st, r = api(alum1, "/api/cursos.php?action=matricular", {"curso": curso})
caso("C-05", "Alumno 1 se matricula", st == 200, f"HTTP {st} {r.get('error','') if isinstance(r, dict) else ''}")
st, r = api(alum1, "/api/cursos.php?action=completar", {"curso": curso, "modulo": 0, "leccion": 0, "hecho": True})
caso("C-06", "Alumno 1 guarda avance de una lección", st == 200, f"HTTP {st} {r.get('error','') if isinstance(r, dict) else ''}")
st, r = api(alum1, "/api/cursos.php?action=matriculas")
caso("C-07", "«Mis cursos» del alumno muestra el curso", curso in json.dumps(r, ensure_ascii=False), f"HTTP {st}")
st, r = api(alum2, "/api/cursos.php?action=matricular", {"curso": curso})
caso("C-08", "Alumno 2 se matricula", st == 200, f"HTTP {st}")

st, r = api(autora, f"/api/cursos.php?action=matriculados&curso={curso}")
txt = json.dumps(r, ensure_ascii=False)
caso("C-09", "La autora ve la lista de inscritos (2) con su avance", "Luis Alumno" in txt and dA["email"] not in txt, f"HTTP {st}")
st, csv = api(autora, f"/api/cursos.php?action=exportar&curso={curso}")
csv = csv if isinstance(csv, str) else json.dumps(csv, ensure_ascii=False)
caso("C-10", "La autora exporta los inscritos a CSV", st == 200 and "Luis Alumno" in csv, f"HTTP {st} {len(csv)} bytes")
inj = [l for l in csv.splitlines() if "HYPERLINK" in l]
import csv as _csv, io as _io
celdas = [c for fila in _csv.reader(_io.StringIO(csv.lstrip("\ufeff")), delimiter=";") for c in fila if "HYPERLINK" in c]
caso("C-11", "CSV a prueba de inyección de fórmulas (=, +, -, @)", celdas and not celdas[0][:1] in "=+-@\t\r", celdas[0][:60] if celdas else "sin fila")

st, r = api(autora, "/api/cursos.php?action=asociar", {"curso": curso, "email": dC["email"]})
caso("C-12", "La autora asocia a la coautora", st == 200, f"HTTP {st} {r.get('error','') if isinstance(r, dict) else ''}")
st, r = api(coaut, f"/api/cursos.php?action=matriculados&curso={curso}")
caso("C-13", "La coautora ve los inscritos del curso compartido", "Luis Alumno" in json.dumps(r, ensure_ascii=False), f"HTTP {st}")
st, csv2 = api(coaut, f"/api/cursos.php?action=exportar&curso={curso}")
caso("C-14", "La coautora puede exportar el CSV del curso compartido", st == 200 and "Luis Alumno" in str(csv2), f"HTTP {st}")
st, r = api(coaut, "/api/cursos.php?action=update", {"id": curso, "titulo": "Hackeado"})
caso("C-15", "La coautora NO puede editar el curso", st in (401, 403), f"HTTP {st}")
st, r = api(coaut, "/api/cursos.php?action=asociar", {"curso": curso, "email": dI["email"]})
caso("C-16", "La coautora NO puede asociar a otras personas", st in (401, 403), f"HTTP {st}")

st, r = api(intru, f"/api/cursos.php?action=matriculados&curso={curso}")
caso("C-17", "Un tercero NO ve los inscritos", "Luis Alumno" not in json.dumps(r, ensure_ascii=False), f"HTTP {st}")
st, csv3 = api(intru, f"/api/cursos.php?action=exportar&curso={curso}")
caso("C-18", "Un tercero NO puede exportar inscritos", "Luis Alumno" not in str(csv3), f"HTTP {st}")
st, r = api(intru, "/api/cursos.php?action=update", {"id": curso, "titulo": "Hackeado"})
caso("C-19", "Un tercero NO puede editar el curso", st in (401, 403), f"HTTP {st}")

st, r = api(autora, "/api/cursos.php?action=publish", {"titulo": "Taller privado " + SUF, "acceso": "aprobacion", "modulos": MODS[:1]})
c2 = (((r or {}).get("data") or {}).get("curso") or {}).get("id") if isinstance(r, dict) else None
caso("C-20", "La autora publica un curso con aprobación", st == 200 and c2, f"HTTP {st}")
api(autora, "/api/cursos.php?action=asociar", {"curso": c2, "email": dC["email"]})
st, r = api(alum1, "/api/cursos.php?action=solicitar_acceso", {"curso": c2, "mensaje": "Quiero participar"})
caso("C-21", "Alumno 1 solicita acceso", st == 200, f"HTTP {st} {r.get('error','') if isinstance(r, dict) else ''}")
st, r = api(alum1, "/api/cursos.php?action=completar", {"curso": c2, "modulo": 0, "leccion": 0, "hecho": True})
caso("C-22", "Sin aprobación no puede avanzar en el curso privado", st >= 400, f"HTTP {st}")
st, r = api(coaut, "/api/cursos.php?action=resolver_acceso", {"curso": c2, "usuario": u1.get("id"), "decision": "aprobado"})
caso("C-23", "La coautora aprueba la solicitud", st == 200, f"HTTP {st} {r.get('error','') if isinstance(r, dict) else ''}")
st, r = api(alum1, "/api/cursos.php?action=completar", {"curso": c2, "modulo": 0, "leccion": 0, "hecho": True})
caso("C-24", "Aprobado, ya puede avanzar", st == 200, f"HTTP {st} {r.get('error','') if isinstance(r, dict) else ''}")

st, r = api(autora, "/api/cursos.php?action=update", {"id": curso, "titulo": "Cafetal sano (2ª ed.) " + SUF})
caso("C-25", "La autora edita su curso", st == 200, f"HTTP {st}")
st, r = api(autora, "/api/cursos.php?action=desasociar", {"curso": curso, "email": dC["email"]})
caso("C-26", "La autora quita a la coautora", st == 200, f"HTTP {st}")
st, r = api(coaut, f"/api/cursos.php?action=matriculados&curso={curso}")
caso("C-27", "La coautora retirada ya NO ve los inscritos", "Luis Alumno" not in json.dumps(r, ensure_ascii=False), f"HTTP {st}")

ok = sum(1 for x in R if x[2])
for x in R:
    print(f"{'✔' if x[2] else '✘'} {x[0]} {x[1]} | {x[3]}")
print(f"\nCursos: {ok}/{len(R)}")
json.dump({"ok": ok, "total": len(R), "casos": R}, open(os.path.join(os.path.dirname(__file__), "res-cursos.json"), "w"), ensure_ascii=False)
