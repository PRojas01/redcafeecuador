#!/usr/bin/env python3
"""
¿Puede cada persona EDITAR y ELIMINAR todo lo que publica? (API real, solo local)

    python3 qa/auditoria_dueno.py http://127.0.0.1:8993 local/sitio-8993
"""
import os, sys, shutil, secrets
BASE, SITIO = sys.argv[1].rstrip("/"), sys.argv[2]
if not any(h in BASE for h in ("127.0.0.1", "localhost")): sys.exit("Solo local.")
import importlib.util
spec = importlib.util.spec_from_file_location("h", os.path.join(os.path.dirname(__file__), "_http.py"))
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
cliente, pedir, js = h.cliente, h.pedir, h.js
shutil.rmtree(os.path.join(SITIO, "data", ".rate"), ignore_errors=True)

S = secrets.token_hex(3); R = []
def caso(tipo, accion, ok, det=""): R.append((tipo, accion, bool(ok), str(det)[:140]))
def okr(st, r): return st == 200 and js(r).get("ok") is not False
def err(st, r): return f"HTTP {st} {js(r).get('error','')}"
def dato(r, *claves):
    d = js(r).get("data") or {}
    for c in claves:
        if isinstance(d.get(c), dict): return d[c]
    return {}

c = cliente(); otro = cliente()
for cli, rol, roles in ((c, "productor", ["productor", "asesor", "exportador"]), (otro, "comprador", ["comprador"])):
    st, _, r = pedir(cli, "/api/auth.php?action=register", {"nombre": "Dueña " + rol, "email": f"duena.{rol}.{S}@ejemplo.test", "pass": "Prueba-" + S + "-ok",
        "rol": rol, "roles": roles, "provincia": "Loja", "telefono": "0991234567", "acepta_terminos": True, "acepta_privacidad": True, "acepta_uso_datos": True})
    print("registro", rol, err(st, r))

DESC = "Publicación de prueba con detalle suficiente para validar."
casos = [
    ("Lote", "/api/lotes.php?action=publish", {"finca": "Finca Dueña " + S, "provincia": "Loja", "variedad": "Typica", "proceso": "Lavado", "precioSaco": 240, "pesoSacoLb": 100, "stockSacos": 10},
     ("lote",), "/api/lotes.php?action=update", {"precioSaco": 250}, "/api/lotes.php?action=delete"),
    ("Servicio", "/api/marketplace-servicios.php?action=publish", {"titulo": "Servicio dueña " + S, "descripcion": DESC, "categoria": "asesoria", "precio": 30, "unidad": "hora", "provincia": "Loja", "cobertura": "Loja", "visibilidad": "publico"},
     ("servicio",), "/api/marketplace-servicios.php?action=update", {"titulo": "Servicio editado " + S, "precio": 35}, "/api/marketplace-servicios.php?action=delete"),
    ("Curso", "/api/cursos.php?action=publish", {"titulo": "Curso dueña " + S, "descripcion": DESC, "modulos": [{"titulo": "M1", "lecciones": [{"titulo": "L1", "contenido": "Texto."}]}]},
     ("curso",), "/api/cursos.php?action=update", {"titulo": "Curso editado " + S}, "/api/cursos.php?action=delete"),
    ("Requerimiento", "/api/requerimientos.php?action=publish", {"titulo": "Busco café " + S, "descripcion": DESC, "cantidad": 20, "unidad": "quintales", "provincia": "Loja", "tipo": "verde", "proceso": "lavado", "contactoPreferido": "plataforma"},
     ("requerimiento",), "/api/requerimientos.php?action=update", {"titulo": "Req editado " + S, "descripcion": DESC, "cantidad": 25, "unidad": "quintales", "provincia": "Loja", "tipo": "verde", "proceso": "lavado", "contactoPreferido": "plataforma"}, "/api/requerimientos.php?action=delete"),
    ("Oferta de empleo", "/api/empleos.php?action=publish", {"titulo": "Catador " + S, "descripcion": DESC, "empresa": "Finca SA", "provincia": "Loja", "categoria": "calidad-catacion", "modalidad": "presencial", "jornada": "tiempo-completo", "vacantes": 1, "contactoPreferido": "plataforma", "salarioPeriodo": "mes", "experiencia": "sin-experiencia"},
     ("empleo",), "/api/empleos.php?action=update", {"titulo": "Catador editado " + S, "descripcion": DESC, "empresa": "Finca SA", "provincia": "Loja", "categoria": "calidad-catacion", "modalidad": "presencial", "jornada": "tiempo-completo", "vacantes": 2, "contactoPreferido": "plataforma", "salarioPeriodo": "mes", "experiencia": "sin-experiencia"}, "/api/empleos.php?action=delete"),
    ("Busco empleo", "/api/busco-empleo.php?action=publish", {"titulo": "Busco trabajo de catadora " + S, "descripcion": DESC, "categoria": "calidad-catacion", "provincia": "Loja", "modalidad": "presencial", "jornada": "tiempo-completo", "disponibilidad": "inmediata", "experiencia": "1-2-anios", "contactoPreferido": "plataforma"},
     ("busqueda",), "/api/busco-empleo.php?action=update", {"titulo": "Busco trabajo editado " + S, "descripcion": DESC, "categoria": "calidad-catacion", "provincia": "Loja", "modalidad": "presencial", "jornada": "tiempo-completo", "disponibilidad": "inmediata", "experiencia": "1-2-anios", "contactoPreferido": "plataforma"}, "/api/busco-empleo.php?action=delete"),
    ("Publicación en comunidad", "/api/comunidad.php?action=create", {"titulo": "Hola " + S, "text": "Mi primera publicación en la comunidad de la Red."},
     ("post",), "/api/comunidad.php?action=update", {"titulo": "Hola editado " + S, "text": "Texto corregido."}, "/api/comunidad.php?action=delete"),
]
for tipo, pub, dp, claves, upd, du, dele in casos:
    st, _, r = pedir(c, pub, dp)
    obj = dato(r, *claves); i = obj.get("id", "")
    caso(tipo, "publicar", bool(i), err(st, r))
    if not i: continue
    st, _, r = pedir(otro, f"{upd}&id={i}", dict(du, id=i)); caso(tipo, "otra persona NO puede editar", st in (401, 403), err(st, r))
    st, _, r = pedir(c, f"{upd}&id={i}", dict(du, id=i)); caso(tipo, "su autora la edita", okr(st, r), err(st, r))
    st, _, r = pedir(otro, f"{dele}&id={i}", {"id": i}); caso(tipo, "otra persona NO puede eliminar", st in (401, 403), err(st, r))
    st, _, r = pedir(c, f"{dele}&id={i}", {"id": i}); caso(tipo, "su autora la elimina", okr(st, r), err(st, r))

# Comentario en la comunidad: ¿se puede borrar el propio?
st, _, r = pedir(otro, "/api/comunidad.php?action=create", {"titulo": "Pregunta " + S, "text": "¿Alguien vende en Loja?"})
post = dato(r, "post").get("id", "")
st, _, r = pedir(c, "/api/comunidad.php?action=comment", {"id": post, "text": "Yo vendo en Loja."})
caso("Comentario en comunidad", "comentar", okr(st, r), err(st, r))
acciones = [a for a in ("delete_comment", "comment_delete", "borrar_comentario", "uncomment") if f"'{a}'" in open(os.path.join(SITIO, "api", "comunidad.php"), encoding="utf8").read()]
caso("Comentario en comunidad", "su autora lo elimina", bool(acciones), "existe: " + ",".join(acciones) if acciones else "comunidad.php no tiene acción para borrar comentarios")

for t, a, ok, d in R: print(f"{'✔' if ok else '✘'} {t:<26} {a}" + ("" if ok else f"  → {d}"))
print(f"\n{sum(x[2] for x in R)}/{len(R)} correctos")
