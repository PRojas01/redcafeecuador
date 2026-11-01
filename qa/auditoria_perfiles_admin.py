#!/usr/bin/env python3
"""
Auditoría de alcance por perfil y del CONTROL DE ADMINISTRACIÓN (API real).

    python3 qa/auditoria_perfiles_admin.py http://127.0.0.1:8990 local/sitio-8990 [salida.json]

Crea cuentas sintéticas (productora, compradora, asesor, empleador), cada una
publica lo suyo, y la administración intenta sobre cada cosa: ver, editar,
aprobar/verificar, ocultar, borrar; más avisos internos (campana/push) y
externos (correo, WhatsApp). También comprueba que un perfil NO puede tocar
lo ajeno. Solo local.
"""
import json, os, sys, shutil, secrets
sys.argv += [""] * 3
BASE, SITIO, SALIDA = sys.argv[1].rstrip("/"), sys.argv[2], sys.argv[3]
if not any(h in BASE for h in ("127.0.0.1", "localhost")):
    sys.exit("Solo local.")
sys.argv = [sys.argv[0], BASE, SITIO]
import importlib.util
spec = importlib.util.spec_from_file_location("h", os.path.join(os.path.dirname(__file__), "_http.py"))
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
cliente, pedir, js = h.cliente, h.pedir, h.js

R = []
def caso(area, perfil, accion, ok, det=""):
    R.append({"area": area, "perfil": perfil, "accion": accion, "ok": bool(ok), "det": str(det)[:150]})
def ok_(st, r): return st == 200 and js(r).get("ok") is not False
def err(st, r): return f"HTTP {st} {js(r).get('error','')}"

shutil.rmtree(os.path.join(SITIO, "data", ".rate"), ignore_errors=True)
for f in (os.path.join(SITIO, "data", ".redcafe_admin_pass"), os.path.join(os.path.dirname(os.path.abspath(SITIO)), ".redcafe_admin_pass")):
    if os.path.exists(f): os.remove(f)

S = secrets.token_hex(3)
PASS = "Prueba-" + S + "-ok"
def nuevo(nombre, rol, roles):
    c = cliente()
    d = {"nombre": nombre, "email": f"{rol}.{S}@ejemplo.test", "pass": PASS, "rol": rol, "roles": roles, "provincia": "Loja",
         "telefono": "0991234567", "acepta_terminos": True, "acepta_privacidad": True, "acepta_uso_datos": True, "acepta_marketing": rol == "productor"}
    st, _, r = pedir(c, "/api/auth.php?action=register", d)
    u = (js(r).get("data") or {}).get("user") or js(r).get("user") or {}
    caso("Registro", rol, "registrarse", ok_(st, r), err(st, r))
    return c, u.get("id", ""), d
prod, idP, dP = nuevo("Rosa Productora", "productor", ["productor"])
comp, idC, dC = nuevo("Pablo Comprador", "comprador", ["comprador"])
ases, idA, dA = nuevo("Ana Asesora", "asesor", ["asesor"])
expo, idE, dE = nuevo("Eva Exportadora", "exportador", ["exportador"])
anon = cliente()

# ── Cada perfil publica lo suyo ─────────────────────────────────────────────
st, _, r = pedir(prod, "/api/lotes.php?action=publish", {"finca": "Finca Audit " + S, "provincia": "Loja", "variedad": "Typica", "proceso": "Lavado",
    "precioSaco": 240, "pesoSacoLb": 100, "stockSacos": 10, "lat": -4.26, "lng": -79.22})
lote = ((js(r).get("data") or {}).get("lote") or {}).get("id", "")
caso("Lotes", "productor", "publicar lote", bool(lote), err(st, r))
st, _, r = pedir(comp, "/api/lotes.php?action=publish", {"finca": "X", "provincia": "Loja", "variedad": "T", "proceso": "Lavado", "precioSaco": 1, "pesoSacoLb": 100, "stockSacos": 1})
caso("Lotes", "comprador", "también puede publicar lotes (reventa, por diseño)", st == 200, err(st, r))
if st == 200: pedir(comp, f"/api/lotes.php?action=delete&id={js(r)['data']['lote']['id']}", {})
st, _, r = pedir(comp, "/api/lotes.php?action=update", {"id": lote, "precioSaco": 1})
caso("Lotes", "comprador", "NO puede editar lote ajeno", st in (401, 403, 404), err(st, r))

st, _, r = pedir(ases, "/api/marketplace-servicios.php?action=publish", {"titulo": "Asesoría audit " + S, "descripcion": "Servicio de prueba.", "categoria": "asesoria",
    "precio": 30, "unidad": "hora", "provincia": "Loja", "cobertura": "provincial", "visibilidad": "publico"})
serv = ((js(r).get("data") or {}).get("servicio") or {}).get("id", "")
caso("Servicios", "asesor", "publicar servicio", bool(serv), err(st, r))

st, _, r = pedir(ases, "/api/cursos.php?action=publish", {"titulo": "Curso audit " + S, "descripcion": "Curso de prueba.",
    "modulos": [{"titulo": "Módulo 1", "lecciones": [{"titulo": "Lección 1", "contenido": "Texto."}]}]})
curso = ((js(r).get("data") or {}).get("curso") or {}).get("id", "")
caso("Academia", "asesor", "crear curso", bool(curso), err(st, r))
st, _, r = pedir(comp, "/api/cursos.php?action=matricular", {"curso": curso, "id": curso})
caso("Academia", "comprador", "matricularse en curso", ok_(st, r), err(st, r))

st, _, r = pedir(comp, "/api/comunidad.php?action=create", {"titulo": "Hola " + S, "text": "Primera publicación en la comunidad."})
post = ((js(r).get("data") or {}).get("post") or {}).get("id", "")
caso("Comunidad", "comprador", "publicar en comunidad", bool(post), err(st, r))
st, _, r = pedir(prod, "/api/comunidad.php?action=delete", {"id": post})
caso("Comunidad", "productor", "NO puede borrar publicación ajena", st in (401, 403), err(st, r))

st, _, r = pedir(expo, "/api/requerimientos.php?action=publish", {"titulo": "Busco arábica " + S, "descripcion": "Requerimiento de prueba.", "cantidad": 20,
    "unidad": "quintales", "provincia": "Loja", "tipo": "verde", "proceso": "lavado", "contactoPreferido": "plataforma"})
req = ((js(r).get("data") or {}).get("requerimiento") or {}).get("id", "")
caso("Requerimientos", "exportador", "publicar requerimiento", bool(req), err(st, r))
st, _, r = pedir(expo, "/api/empleos.php?action=publish", {"titulo": "Catador " + S, "descripcion": "Oferta de prueba para catador de café de especialidad.", "empresa": "Eva SA",
    "provincia": "Loja", "categoria": "calidad-catacion", "modalidad": "presencial", "jornada": "tiempo-completo", "vacantes": 1, "contactoPreferido": "plataforma", "salarioPeriodo": "mes", "experiencia": "sin-experiencia"})
emp = ((js(r).get("data") or {}).get("empleo") or {}).get("id", "")
caso("Empleos", "exportador", "publicar oferta de empleo", bool(emp), err(st, r))

st, _, r = pedir(comp, "/api/pedidos.php?action=create", {"loteId": lote, "sacos": 1, "total": 240})
nro = str(((js(r).get("data") or {}).get("pedido") or {}).get("nro", ""))
caso("Pedidos", "comprador", "pedir un lote", bool(nro), err(st, r))
st, _, r = pedir(prod, "/api/pedidos.php?action=advance", {"nro": nro})
caso("Pedidos", "productor", "avanzar estado de su pedido", ok_(st, r), err(st, r))

st, _, r = pedir(comp, "/api/reportes.php?action=crear", {"asunto": "Problema " + S, "detalle": "No carga la ficha.", "categoria": "publicacion", "url": "/marketplace/"})
rep = ((js(r).get("data") or {}).get("reporte") or {}).get("id", "")
caso("Soporte", "comprador", "reportar un problema", bool(rep), err(st, r))

# ── Miembros sin acceso de admin ────────────────────────────────────────────
for ruta in ("/api/members.php?action=all", "/api/admin.php?action=list&recurso=members", "/api/marketplace-servicios.php?action=admin_list",
             "/api/verificaciones.php?action=list", "/api/difusion.php?action=list", "/api/reportes.php?action=list", "/api/respaldo.php?action=estado"):
    st, _, r = pedir(comp, ruta)
    caso("Seguridad", "comprador", "sin acceso a " + ruta.split("?")[0].split("/")[-1] + " " + ruta.split("action=")[1], st in (401, 403), err(st, r))
st, _, r = pedir(comp, "/api/notificaciones.php?action=enviar", {"destino": "todos", "titulo": "spam"})
caso("Seguridad", "comprador", "NO puede enviar avisos a otros", st in (401, 403), err(st, r))

# ── ADMINISTRACIÓN ──────────────────────────────────────────────────────────
pedir(anon, "/api/auth.php?action=admin_login", {"pass": "incorrecta"})
cands = [os.path.join(os.path.dirname(os.path.abspath(SITIO)), ".redcafe_admin_pass"), os.path.join(SITIO, "data", ".redcafe_admin_pass")]
f = next((c for c in cands if os.path.exists(c)), "")
adm = cliente()
st, _, r = pedir(adm, "/api/auth.php?action=admin_login", {"pass": open(f).read().strip() if f else ""})
caso("Admin", "admin", "iniciar sesión", ok_(st, r), err(st, r))
A = lambda ruta, d=None: pedir(adm, ruta, d)

# Miembros
st, _, r = A("/api/members.php?action=all"); caso("Miembros", "admin", "ver todos los miembros (datos completos)", ok_(st, r) and dC["email"] in r.decode("utf8", "replace"), err(st, r))
st, _, r = A("/api/members.php?action=set_estado", {"id": idP, "estado": "verificado", "nota": "audit"}); caso("Miembros", "admin", "aprobar/verificar miembro", ok_(st, r), err(st, r))
st, _, r = A("/api/members.php?action=set_estado", {"id": idE, "estado": "rechazado", "motivo": "audit"}); caso("Miembros", "admin", "rechazar miembro", ok_(st, r), err(st, r))
st, _, r = A(f"/api/admin.php?action=update&recurso=members&id={idC}", {"telefono": "0990000000"})
caso("Miembros", "admin", "editar datos de un miembro", ok_(st, r), err(st, r))
st, _, r = A("/api/admin.php?action=list&recurso=members"); m = next((x for x in ((js(r).get("data") or {}).get("members") or []) if x.get("id") == idC), {})
caso("Miembros", "admin", "la edición quedó guardada", m.get("telefono") == "0990000000", m.get("telefono"))

# Lotes
st, _, r = A("/api/lotes.php?action=update", {"id": lote, "precioSaco": 250}); caso("Lotes", "admin", "editar lote de un miembro", ok_(st, r), err(st, r))
st, _, r = A("/api/verificaciones.php?action=set", {"tipo": "lote", "id": lote, "verificado": True, "nota": "audit"}); caso("Lotes", "admin", "verificar (aprobar) lote", ok_(st, r), err(st, r))
st, _, r = A(f"/api/lotes.php?action=toggle_oculto&id={lote}", {"id": lote}); caso("Lotes", "admin", "ocultar lote", ok_(st, r), err(st, r))
st, _, r = pedir(anon, "/api/lotes.php?action=list"); caso("Lotes", "admin", "lote oculto no se ve en el marketplace", lote not in r.decode("utf8", "replace"), "")
st, _, r = A(f"/api/lotes.php?action=toggle_oculto&id={lote}", {"id": lote}); caso("Lotes", "admin", "volver a mostrar lote", ok_(st, r), err(st, r))

# Servicios
st, _, r = A("/api/marketplace-servicios.php?action=admin_list"); caso("Servicios", "admin", "ver servicios oficiales de la plataforma", ok_(st, r), err(st, r))
st, _, r = A("/api/marketplace-servicios.php?action=list"); caso("Servicios", "admin", "ver servicios publicados por miembros", ok_(st, r) and serv in r.decode("utf8", "replace"), err(st, r))
st, _, r = A("/api/marketplace-servicios.php?action=update", {"id": serv, "titulo": "Asesoría editada " + S, "precio": 35})
caso("Servicios", "admin", "editar servicio de un miembro", ok_(st, r), err(st, r))
st, _, r = A("/api/verificaciones.php?action=set", {"tipo": "servicio", "id": serv, "verificado": True}); caso("Servicios", "admin", "verificar servicio", ok_(st, r), err(st, r))

# Cursos
st, _, r = A("/api/cursos.php?action=update", {"id": curso, "titulo": "Curso editado " + S}); caso("Academia", "admin", "editar curso de un asesor", ok_(st, r), err(st, r))
st, _, r = A("/api/verificaciones.php?action=set", {"tipo": "curso", "id": curso, "verificado": True}); caso("Academia", "admin", "verificar curso", ok_(st, r), err(st, r))
st, _, r = A(f"/api/cursos.php?action=matriculados&curso={curso}"); caso("Academia", "admin", "ver matriculados", ok_(st, r) and idC in r.decode("utf8", "replace"), err(st, r))
st, _, r = A(f"/api/cursos.php?action=exportar&curso={curso}"); caso("Academia", "admin", "exportar matriculados (CSV)", st == 200 and len(r) > 20, err(st, r))

# Comunidad
st, _, r = A("/api/comunidad.php?action=update", {"id": post, "titulo": "Editado por admin", "text": "Texto moderado."}); caso("Comunidad", "admin", "editar publicación de un miembro", ok_(st, r), err(st, r))

# Requerimientos / empleos
st, _, r = A("/api/requerimientos.php?action=update", {"id": req, "titulo": "Req editado " + S, "cantidad": 25, "descripcion": "Requerimiento corregido por la administración.", "unidad": "quintales", "proceso": "lavado", "tipo": "verde", "contactoPreferido": "plataforma", "provincia": "Loja"}); caso("Requerimientos", "admin", "editar requerimiento", ok_(st, r), err(st, r))
st, _, r = A("/api/empleos.php?action=update", {"id": emp, "titulo": "Empleo editado " + S, "descripcion": "Oferta corregida por la administración del sitio.", "empresa": "Eva SA", "provincia": "Loja", "categoria": "calidad-catacion", "modalidad": "presencial", "jornada": "tiempo-completo", "vacantes": 1, "contactoPreferido": "plataforma", "salarioPeriodo": "mes", "experiencia": "sin-experiencia"}); caso("Empleos", "admin", "editar oferta de empleo", ok_(st, r), err(st, r))

# Pedidos
st, _, r = A("/api/pedidos.php?action=list"); caso("Pedidos", "admin", "ver todos los pedidos", ok_(st, r) and nro in r.decode("utf8", "replace"), err(st, r))
st, _, r = A("/api/pedidos.php?action=advance", {"nro": nro}); caso("Pedidos", "admin", "avanzar pedido", ok_(st, r), err(st, r))

# Soporte
st, _, r = A("/api/reportes.php?action=list"); caso("Soporte", "admin", "ver reportes", ok_(st, r) and rep in r.decode("utf8", "replace"), err(st, r))
st, _, r = A("/api/reportes.php?action=responder", {"id": rep, "estado": "resuelto", "respuesta": "Arreglado."}); caso("Soporte", "admin", "responder reporte", ok_(st, r), err(st, r))

# Avisos INTERNOS
st, _, r = A("/api/notificaciones.php?action=enviar", {"destino": "todos", "titulo": "Día del Café " + S, "texto": "Novedades de la Red.", "enlace": "/comunidad/"})
caso("Avisos internos", "admin", "aviso a todos (campana)", ok_(st, r), err(st, r) + " " + str((js(r).get("data") or {}).get("enviados")))
st, _, r = A("/api/notificaciones.php?action=enviar", {"destino": "rol", "rol": "productor", "titulo": "Solo productores " + S})
caso("Avisos internos", "admin", "aviso por perfil (productores)", ok_(st, r), err(st, r))
st, _, r = A("/api/notificaciones.php?action=enviar", {"destino": "miembros", "ids": [idA], "titulo": "Directo " + S})
caso("Avisos internos", "admin", "aviso a miembros concretos", ok_(st, r), err(st, r))
st, _, r = pedir(comp, "/api/notificaciones.php?action=list"); t = r.decode("utf8", "replace")
caso("Avisos internos", "comprador", "recibe el aviso general", "Día del Café " + S in t, "")
caso("Avisos internos", "comprador", "NO recibe el aviso de productores", "Solo productores " + S not in t, "")
st, _, r = pedir(prod, "/api/notificaciones.php?action=list"); caso("Avisos internos", "productor", "recibe el aviso de su perfil", "Solo productores " + S in r.decode("utf8", "replace"), "")
st, _, r = pedir(prod, "/api/notificaciones.php?action=list"); caso("Avisos internos", "productor", "le llegó el aviso de pedido", "pedido" in r.decode("utf8", "replace").lower(), "")

# Avisos EXTERNOS
st, _, r = A("/api/difusion.php?action=destinatarios", {"roles": ["productor"], "rol": "productor"}); caso("Avisos externos", "admin", "WhatsApp: elegir destinatarios", ok_(st, r), err(st, r))
st, _, r = A("/api/difusion.php?action=guardar", {"titulo": "Charla " + S, "mensaje": "Charla gratuita el sábado.", "roles": ["productor"], "rol": "productor", "destino": "rol"})
caso("Avisos externos", "admin", "WhatsApp: crear campaña (envío manual wa.me)", ok_(st, r), err(st, r))
st, _, r = st, _, r = pedir(prod, "/api/push.php?action=estado"); caso("Avisos externos", "productor", "Push del navegador: el miembro puede activarlo", st == 200, err(st, r))

# Avisos por CORREO (copia opcional del aviso; solo con consentimiento)
st, _, r = A("/api/notificaciones.php?action=enviar", {"destino": "todos", "titulo": "Correo " + S, "texto": "Prueba.", "enlace": "/academia/", "correo": True})
c = (js(r).get("data") or {}).get("correo")
if c is None:
    caso("Avisos externos", "admin", "Correo: copia del aviso por correo", False, "la API no admite correo (versión sin esta función)")
else:
    intentados = c.get("enviados", 0) + c.get("fallidos", 0)
    caso("Avisos externos", "admin", "Correo: copia del aviso por correo", ok_(st, r), json.dumps(c))
    caso("Avisos externos", "admin", "Correo: solo a quien aceptó novedades (1 de 4 de prueba)", intentados >= 1 and c.get("sin_consentimiento", 0) >= 3, json.dumps(c))
    import hmac, hashlib
    sec = open(os.path.join(SITIO, "data", ".baja_correo_secreto")).read().strip()
    st, _, r = pedir(anon, f"/api/notificaciones.php?action=baja_correo&u={idP}&t=falsa")
    caso("Avisos externos", "visitante", "Correo: enlace de baja falso no da de baja", st == 200 and "no es válido" in r.decode("utf8", "replace"), "")
    firma = hmac.new(sec.encode(), ("baja-correo|" + idP).encode(), hashlib.sha256).hexdigest()
    st, _, r = pedir(anon, f"/api/notificaciones.php?action=baja_correo&u={idP}&t={firma}")
    caso("Avisos externos", "productor", "Correo: baja con un clic", st == 200 and "ya no recibirás" in r.decode("utf8", "replace"), f"HTTP {st}")
    st, _, r = A("/api/notificaciones.php?action=enviar", {"destino": "miembros", "ids": [idP], "titulo": "Tras baja " + S, "correo": True})
    c2 = (js(r).get("data") or {}).get("correo") or {}
    caso("Avisos externos", "admin", "Correo: tras la baja ya no se le envía (sí la campana)", c2.get("sin_consentimiento") == 1 and (js(r).get("data") or {}).get("enviados") == 1, json.dumps(c2))

# Borrados (al final)
st, _, r = A("/api/comunidad.php?action=delete", {"id": post}); caso("Comunidad", "admin", "borrar publicación", ok_(st, r), err(st, r))
st, _, r = A("/api/requerimientos.php?action=delete", {"id": req}); caso("Requerimientos", "admin", "borrar requerimiento", ok_(st, r), err(st, r))
st, _, r = A("/api/empleos.php?action=delete", {"id": emp}); caso("Empleos", "admin", "borrar oferta de empleo", ok_(st, r), err(st, r))
st, _, r = A(f"/api/marketplace-servicios.php?action=delete&id={serv}", {"id": serv}); caso("Servicios", "admin", "borrar servicio", ok_(st, r), err(st, r))
st, _, r = A("/api/pedidos.php?action=delete", {"nro": nro}); caso("Pedidos", "admin", "borrar pedido", ok_(st, r), err(st, r))
st, _, r = A("/api/cursos.php?action=delete", {"id": curso}); caso("Academia", "admin", "borrar curso", ok_(st, r), err(st, r))
st, _, r = A(f"/api/lotes.php?action=delete&id={lote}", {"id": lote}); caso("Lotes", "admin", "borrar lote", ok_(st, r), err(st, r))
st, _, r = A(f"/api/admin.php?action=reset_user&id={idE}", {"id": idE, "confirm": "yes"}); caso("Miembros", "admin", "dar de baja/limpiar un miembro", ok_(st, r), err(st, r))

if SALIDA: json.dump(R, open(SALIDA, "w"), ensure_ascii=False, indent=1)
area = None
for c in R:
    if c["area"] != area: area = c["area"]; print(f"\n[{area}]")
    print(f"  {'✔' if c['ok'] else '✘'} {c['perfil']:<10} {c['accion']}" + ("" if c["ok"] else f"  → {c['det']}"))
print(f"\n{sum(c['ok'] for c in R)}/{len(R)} correctos")
