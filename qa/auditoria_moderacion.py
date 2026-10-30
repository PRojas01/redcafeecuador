#!/usr/bin/env python3
"""
Moderación con debido proceso y baja voluntaria (API real, solo local).

    python3 qa/auditoria_moderacion.py http://127.0.0.1:8995 local/sitio-8995
"""
import os, sys, shutil, secrets
BASE, SITIO = sys.argv[1].rstrip("/"), sys.argv[2]
if not any(h in BASE for h in ("127.0.0.1", "localhost")): sys.exit("Solo local.")
import importlib.util
spec = importlib.util.spec_from_file_location("h", os.path.join(os.path.dirname(__file__), "_http.py"))
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
cliente, pedir, js = h.cliente, h.pedir, h.js
shutil.rmtree(os.path.join(SITIO, "data", ".rate"), ignore_errors=True)
for f in (os.path.join(SITIO, "data", ".redcafe_admin_pass"), os.path.join(os.path.dirname(os.path.abspath(SITIO)), ".redcafe_admin_pass")):
    if os.path.exists(f): os.remove(f)

S = secrets.token_hex(3); PASS = "Prueba-" + S + "-ok"; R = []
def caso(a, ok, d=""): R.append((a, bool(ok), str(d)[:160]))
def okr(st, r): return st == 200 and js(r).get("ok") is not False
def err(st, r): return f"HTTP {st} {js(r).get('error','')}"
def dato(r, k): return (js(r).get("data") or {}).get(k) or {}

def cuenta(nombre, rol):
    c = cliente(); email = f"{rol}.{S}@ejemplo.test"
    st, _, r = pedir(c, "/api/auth.php?action=register", {"nombre": nombre, "email": email, "pass": PASS, "rol": rol, "roles": [rol], "provincia": "Loja", "telefono": "0991234567", "acepta_terminos": True, "acepta_privacidad": True, "acepta_uso_datos": True})
    return c, (dato(r, "user").get("id") or ""), email
vend, idV, emailV = cuenta("Vera Vendedora", "productor")
comp, idC, emailC = cuenta("Ciro Comprador", "comprador")
anon = cliente()

st, _, r = pedir(vend, "/api/lotes.php?action=publish", {"finca": "Finca Mod " + S, "provincia": "Loja", "variedad": "Typica", "proceso": "Lavado", "precioSaco": 200, "pesoSacoLb": 100, "stockSacos": 5})
lote = dato(r, "lote").get("id", ""); caso("Vendedora publica un lote", bool(lote), err(st, r))

# Reporte sobre una persona
st, _, r = pedir(comp, "/api/reportes.php?action=crear", {"categoria": "fraude", "asunto": "Pidió adelanto y no envió", "detalle": "Me pidió transferencia anticipada y luego dejó de responder.", "reportado_id": idV, "url": "/marketplace/" + lote + "/"})
rep = dato(r, "reporte"); caso("Comprador reporta a la vendedora (fraude)", rep.get("reportado_id") == idV, err(st, r))
st, _, r = pedir(comp, "/api/reportes.php?action=crear", {"categoria": "fraude", "asunto": "Sin persona", "detalle": "Reporte de fraude sin indicar a quién."})
caso("Reporte sobre persona exige indicar a quién", st == 422, err(st, r))
st, _, r = pedir(comp, "/api/reportes.php?action=crear", {"categoria": "acoso", "asunto": "A mí mismo", "detalle": "Prueba de autorreporte que no debe pasar.", "reportado_id": idC})
caso("No se puede reportar a uno mismo", st == 422, err(st, r))

# Admin
pedir(anon, "/api/auth.php?action=admin_login", {"pass": "x"})
f = next((c for c in [os.path.join(os.path.dirname(os.path.abspath(SITIO)), ".redcafe_admin_pass"), os.path.join(SITIO, "data", ".redcafe_admin_pass")] if os.path.exists(c)), "")
adm = cliente(); st, _, r = pedir(adm, "/api/auth.php?action=admin_login", {"pass": open(f).read().strip()})
caso("Admin inicia sesión", okr(st, r), err(st, r))
st, _, r = pedir(comp, "/api/moderacion.php?action=ficha&uid=" + idV)
caso("Un miembro NO ve fichas de otros", st == 403, err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=ficha&uid=" + idV)
fi = js(r).get("data") or {}
caso("Admin ve la ficha completa (datos, contadores, reportes recibidos)", okr(st, r) and fi.get("miembro", {}).get("email") == emailV and len(fi.get("reportes_recibidos", [])) == 1 and fi.get("contadores", {}).get("lotes") == 1, err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=contactar_correo", {"uid": idV, "asunto": "Consulta sobre un reporte", "mensaje": "Hola, recibimos un reporte sobre tu lote. ¿Puedes explicarnos qué pasó?"})
caso("Admin contacta por correo (externo)", okr(st, r), err(st, r))
st, _, r = pedir(adm, "/api/chat.php?action=open", {"user": idV}); room = dato(r, "room") if isinstance(dato(r, "room"), str) else (js(r).get("data") or {}).get("room", "")
st2, _, r2 = pedir(adm, "/api/chat.php?action=send", {"room": room, "text": "Hola, te escribe la administración por un reporte."})
caso("Admin contacta por chat interno", bool(room) and okr(st2, r2), err(st2, r2))

# Proporcionalidad y requisitos
st, _, r = pedir(adm, "/api/moderacion.php?action=sancionar", {"uid": idV, "tipo": "bloqueo", "infraccion": "spam", "hechos": "Publicó el mismo anuncio diez veces en una hora en la comunidad."})
caso("Medida desproporcionada rechazada (bloqueo por spam)", st == 422, err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=sancionar", {"uid": idV, "tipo": "suspension", "infraccion": "fraude", "hechos": "corto", "dias": 7})
caso("Sin hechos descritos no se sanciona", st == 422, err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=sancionar", {"uid": idV, "tipo": "bloqueo", "infraccion": "fraude", "hechos": "Pidió transferencias anticipadas a dos compradores y no entregó el café."})
caso("Bloqueo sin evidencias rechazado", st == 422, err(st, r))

# Suspensión
st, _, r = pedir(vend, "/api/auth.php?action=me"); caso("La vendedora tiene sesión antes de la medida", bool((js(r).get("data") or {}).get("user")))
st, _, r = pedir(adm, "/api/moderacion.php?action=sancionar", {"uid": idV, "tipo": "suspension", "infraccion": "fraude", "dias": 7, "evidencias": ["reporte " + rep.get("id", "")], "hechos": "Pidió transferencia anticipada a un comprador y dejó de responder; consta en el reporte y en el chat."})
san = dato(r, "sancion"); caso("Admin suspende 7 días con hechos y evidencia", san.get("tipo") == "suspension" and san.get("hasta"), err(st, r))
st, _, r = pedir(vend, "/api/auth.php?action=me"); caso("La sesión abierta se corta al suspender", not (js(r).get("data") or {}).get("user"))
st, _, r = pedir(anon, "/api/lotes.php?action=list"); caso("Su lote deja de verse en el marketplace", lote not in r.decode("utf8", "replace"))
st, _, r = pedir(comp, "/api/pedidos.php?action=create", {"loteId": lote, "sacos": 1, "total": 200}); caso("No se puede pedir su lote (aun con el enlace)", st == 404, err(st, r))
v2 = cliente(); st, _, r = pedir(v2, "/api/auth.php?action=login", {"email": emailV, "pass": PASS})
sv = (js(r).get("sancion") or {}); ap = sv.get("apelar") or {}
caso("Al entrar ve la medida: motivo, norma, hasta cuándo y cómo apelar", st == 403 and sv.get("tipo") == "suspension" and "Términos" in sv.get("norma", "") and ap.get("t"), err(st, r))
st, _, r = pedir(anon, "/api/moderacion.php?action=apelar", {"id": san.get("id"), "u": idV, "t": "falsa", "texto": "No es cierto: el comprador canceló antes del pago y tengo los mensajes."})
caso("Apelación con enlace falso rechazada", st == 403, err(st, r))
st, _, r = pedir(anon, "/api/moderacion.php?action=apelar", {"id": san.get("id"), "u": idV, "t": ap.get("t"), "texto": "No es cierto: el comprador canceló antes del pago y tengo los mensajes que lo prueban."})
caso("Apela con el enlace firmado (sin sesión)", okr(st, r), err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=list&estado=apelaciones"); caso("La apelación aparece pendiente para el admin", san.get("id", "x") in r.decode("utf8", "replace"))
st, _, r = pedir(adm, "/api/moderacion.php?action=resolver_apelacion", {"id": san.get("id"), "decision": "aceptada", "respuesta": "Revisamos los mensajes aportados: el comprador canceló antes del pago. Se levanta la suspensión."})
caso("Admin acepta la apelación con resolución motivada", okr(st, r) and dato(r, "sancion").get("estado") == "levantada", err(st, r))
st, _, r = pedir(v2, "/api/auth.php?action=login", {"email": emailV, "pass": PASS}); caso("La vendedora vuelve a entrar", okr(st, r), err(st, r))
st, _, r = pedir(anon, "/api/lotes.php?action=list"); caso("Su lote vuelve al marketplace", lote in r.decode("utf8", "replace"))
st, _, r = pedir(v2, "/api/moderacion.php?action=mi_estado"); caso("Ve su historial de medidas (sin notas internas)", okr(st, r) and "creado_por" not in r.decode("utf8", "replace"), err(st, r))

# Advertencia + levantar
st, _, r = pedir(adm, "/api/moderacion.php?action=sancionar", {"uid": idC, "tipo": "advertencia", "infraccion": "spam", "hechos": "Envió el mismo mensaje promocional a doce miembros sin relación comercial."})
adv = dato(r, "sancion"); st, _, r = pedir(comp, "/api/auth.php?action=me"); caso("Advertencia: la cuenta sigue activa", bool((js(r).get("data") or {}).get("user")))
st, _, r = pedir(comp, "/api/notificaciones.php?action=list"); caso("Le llega el aviso de la advertencia", "Advertencia" in r.decode("utf8", "replace"))
st, _, r = pedir(adm, "/api/moderacion.php?action=levantar", {"id": adv.get("id"), "justificacion": "corta"}); caso("Levantar exige justificación", st == 422, err(st, r))


# Ficha ampliada (24-oct): publicaciones, pedidos, notas, acceso y validación
import json as _json
st, _, r = pedir(adm, "/api/moderacion.php?action=ficha&uid=" + idV); fi = js(r).get("data") or {}
pubs = fi.get("publicaciones") or []
caso("La ficha lista lo que publicó (con su lote)", any(p.get("tipo") == "lote" and p.get("id") == lote for p in pubs), err(st, r))
caso("La ficha trae el estado de acceso y de validación", (fi.get("acceso") or {}).get("activo") is True and (fi.get("acceso") or {}).get("estado_validacion"), err(st, r))
st, _, r = pedir(v2, "/api/moderacion.php?action=publicacion", {"tipo": "lote", "id": lote, "accion": "ocultar", "motivo": "Prueba de un miembro"})
caso("Un miembro NO puede moderar publicaciones", st == 403, err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=publicacion", {"tipo": "lote", "id": lote, "accion": "ocultar", "motivo": "corto"})
caso("Ocultar exige motivo", st == 422, err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=publicacion", {"tipo": "lote", "id": lote, "accion": "ocultar", "motivo": "Fotos que no corresponden al lote; súbelas de nuevo."})
st2, _, r2 = pedir(anon, "/api/lotes.php?action=list")
caso("Admin oculta el lote desde la ficha y sale del marketplace", okr(st, r) and lote not in r2.decode("utf8", "replace"), err(st, r))
st, _, r = pedir(v2, "/api/notificaciones.php?action=list"); caso("A la vendedora le llega el motivo", "Fotos que no corresponden" in r.decode("utf8", "replace"))
st, _, r = pedir(adm, "/api/moderacion.php?action=publicacion", {"tipo": "lote", "id": lote, "accion": "mostrar", "motivo": "Fotos corregidas por la vendedora."})
st2, _, r2 = pedir(anon, "/api/lotes.php?action=list")
caso("Admin lo vuelve a publicar", okr(st, r) and lote in r2.decode("utf8", "replace"), err(st, r))
st, _, r = pedir(v2, "/api/comunidad.php?action=create", {"titulo": "Post a borrar " + S, "text": "Publicación que la administración elimina desde la ficha."})
post = (dato(r, "post") or {}).get("id") or ""
st, _, r = pedir(adm, "/api/moderacion.php?action=publicacion", {"tipo": "publicacion", "id": post, "accion": "ocultar", "motivo": "No se puede ocultar un post."})
caso("Una publicación de la comunidad no se oculta (solo eliminar)", st == 422, err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=publicacion", {"tipo": "publicacion", "id": post, "accion": "eliminar", "motivo": "Contenido promocional repetido."})
st2, _, r2 = pedir(anon, "/api/comunidad.php?action=list")
caso("Admin elimina la publicación desde la ficha", okr(st, r) and ("Post a borrar " + S) not in r2.decode("utf8", "replace"), err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=nota", {"uid": idV, "texto": "Llamó el 24-oct; enviará la factura del lote."})
st2, _, r2 = pedir(adm, "/api/moderacion.php?action=ficha&uid=" + idV)
caso("Admin guarda una nota interna y la ve en la ficha", okr(st, r) and "enviará la factura" in r2.decode("utf8", "replace"), err(st, r))
st, _, r = pedir(v2, "/api/moderacion.php?action=mi_estado"); caso("El miembro no ve las notas internas", "enviará la factura" not in r.decode("utf8", "replace"))
st, _, r = pedir(adm, "/api/members.php?action=set_estado", {"id": idV, "estado": "verificado"})
caso("Admin cambia la validación del perfil", okr(st, r) and (dato(r, "member") or {}).get("verificado") is True, err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=acceso", {"uid": idV, "activo": False, "motivo": "Cuenta duplicada, pendiente de confirmar."})
st2, _, r2 = pedir(v2, "/api/auth.php?action=me")
caso("Desactivar (administrativo) cierra su sesión", okr(st, r) and not (js(r2).get("data") or {}).get("user"), err(st, r))
st, _, r = pedir(adm, "/api/moderacion.php?action=acceso", {"uid": idV, "activo": True, "motivo": "Confirmó que es su única cuenta."})
st2, _, r2 = pedir(v2, "/api/auth.php?action=login", {"email": emailV, "pass": PASS})
caso("Reactivar le devuelve el acceso", okr(st, r) and okr(st2, r2), err(st2, r2))
st, _, r = pedir(comp, "/api/pedidos.php?action=create", {"loteId": lote, "sacos": 1, "total": 200}); nroM = (dato(r, "pedido") or {}).get("nro")
st, _, r = pedir(adm, "/api/moderacion.php?action=ficha&uid=" + idC)
caso("La ficha lista sus pedidos", any(p.get("nro") == nroM for p in ((js(r).get("data") or {}).get("pedidos") or [])), err(st, r))
st, _, r = pedir(adm, "/api/pedidos.php?action=cancelar", {"nro": nroM, "motivo": "Mediación de la administración: el lote no estaba disponible."})
caso("Admin cancela un pedido en conflicto (mediación)", okr(st, r), err(st, r))
pedir(adm, "/api/moderacion.php?action=nota", {"uid": idC, "texto": "Nota sobre el comprador que debe borrarse con su baja."})

# Baja voluntaria
st, _, r = pedir(comp, "/api/pedidos.php?action=create", {"loteId": lote, "sacos": 1, "total": 200}); nro = (dato(r, "pedido") or {}).get("nro")
st, _, r = pedir(comp, "/api/moderacion.php?action=baja", {"pass": PASS, "confirmacion": "ELIMINAR"})
caso("Baja bloqueada con pedido en curso (se avisa cuál)", st == 409 and js(r).get("pedidos"), err(st, r))
pedir(comp, "/api/pedidos.php?action=cancelar", {"nro": nro, "motivo": "Prueba de baja"})
st, _, r = pedir(comp, "/api/moderacion.php?action=baja", {"pass": "mala", "confirmacion": "ELIMINAR"}); caso("Baja exige la contraseña", st == 401, err(st, r))
st, _, r = pedir(comp, "/api/moderacion.php?action=baja", {"pass": PASS, "confirmacion": "eliminar"}); caso("Baja exige escribir ELIMINAR", st == 422, err(st, r))
st, _, r = pedir(comp, "/api/comunidad.php?action=create", {"titulo": "Mi post " + S, "text": "Publicación que debe desaparecer con la baja."})
st, _, r = pedir(comp, "/api/moderacion.php?action=baja", {"pass": PASS, "confirmacion": "ELIMINAR", "motivo": "Ya no compro café"})
caso("Baja voluntaria completada", okr(st, r), err(st, r))
st, _, r = pedir(comp, "/api/auth.php?action=me"); caso("La sesión se cierra", not (js(r).get("data") or {}).get("user"))
st, _, r = pedir(cliente(), "/api/auth.php?action=login", {"email": emailC, "pass": PASS}); caso("Ya no puede entrar con esa cuenta", st in (401, 403), err(st, r))
st, _, r = pedir(adm, "/api/members.php?action=all"); t = r.decode("utf8", "replace")
caso("Su correo y nombre ya no están en la base", emailC not in t and "Ciro Comprador" not in t)
st, _, r = pedir(anon, "/api/comunidad.php?action=list"); caso("Su publicación desapareció", "Mi post " + S not in r.decode("utf8", "replace"))
st, _, r = pedir(v2, "/api/pedidos.php?action=list"); caso("La contraparte conserva el pedido, sin datos del comprador", str(nro) in r.decode("utf8", "replace") and "Ciro Comprador" not in r.decode("utf8", "replace"))
c3 = cliente(); st, _, r = pedir(c3, "/api/auth.php?action=register", {"nombre": "Ciro Nuevo", "email": emailC, "pass": PASS, "rol": "comprador", "roles": ["comprador"], "provincia": "Loja", "acepta_terminos": True, "acepta_privacidad": True, "acepta_uso_datos": True})
caso("El correo queda libre para registrarse de nuevo", okr(st, r), err(st, r))
notas = os.path.join(SITIO, "data", "notas-admin.json")
caso("Sus notas internas se borran con la baja", not os.path.exists(notas) or ("u:" + idC) not in open(notas, encoding="utf8").read())

for a, ok, d in R: print(f"{'✔' if ok else '✘'} {a}" + ("" if ok else f"  → {d}"))
print(f"\n{sum(x[1] for x in R)}/{len(R)} correctos")
