// Port de api/moderacion.php: sanciones con debido proceso y baja voluntaria.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mapa, mutar, mutarMapa, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { aDoc, cuentaRestringida, tieneRol, usuarioActual } from "../lib/usuarios.js";
import { notificar, notificarAdmins, registrarActividad } from "../lib/avisos.js";
import { enviarCorreo } from "../lib/correo.js";
import { db } from "../lib/db.js";
import { cortar, emailValido, fechaMs, int, largo, nowIso, str, uid } from "../lib/util.js";
import { verificarPass } from "./auth.js";
import {
  MOD_DIAS_APELACION, MOD_DIAS_MAX_SUSPENSION, MOD_INFRACCIONES, MOD_MEDIDAS_POR_GRAVEDAD, MOD_PUBLICACIONES,
  estadoVigente, firma, vistaPublica,
} from "./moderacion-comun.js";

async function modAdmin(ctx: Ctx): Promise<Doc> {
  if (ctx.ses.d.admin) return { id: "admin", nombre: "Administración" };
  const u = await usuarioActual(ctx);
  if (u && tieneRol(ctx, u, "admin")) return u;
  fail("Solo la administración gestiona sanciones.", 403);
}
async function miembro(uidM: string): Promise<Doc | null> {
  if (!uidM) return null;
  const f = await db.usuario.findUnique({ where: { id: uidM } });
  return f ? aDoc(f) : null;
}
const fechaCorta = (iso: string, conHora = false) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}` + (conHora ? ` ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` : "");
};
function textoMedida(s: Doc): string {
  if (s.tipo === "advertencia") return "Advertencia formal (tu cuenta sigue activa).";
  if (s.tipo === "suspension") return `Suspensión temporal hasta el ${fechaCorta(s.hasta, true)} (UTC).`;
  return "Bloqueo de la cuenta por tiempo indefinido.";
}
async function notificarSancion(m: Doc, s: Doc, titulo: string, texto: string) {
  await notificar(m.id, "sistema", titulo, texto, "/panel/?ver=cuenta");
  if (emailValido(str(m.email))) {
    const inf = MOD_INFRACCIONES[s.infraccion] ?? { titulo: "", norma: "" };
    const enlace = `https://redcafeecuador.com/login/?apelacion=${encodeURIComponent(s.id)}&u=${encodeURIComponent(m.id)}&t=${await firma(m.id, s.id)}`;
    await enviarCorreo("sancion", m.email, {
      nombre: m.nombre, titulo, texto, infraccion: inf.titulo, norma: inf.norma, hechos: s.hechos,
      hasta: s.hasta ? fechaCorta(s.hasta, true) + " (UTC)" : "", apelar_hasta: s.apelar_hasta ? fechaCorta(s.apelar_hasta) : "", enlace,
    });
  }
}
const suyo = (uidM: string) => (x: Doc) => [x.published_by, x.productor_id, x.proveedor_id, x.autor_id, x.owner_id].map(str).includes(uidM);

const acciones: Modulo["acciones"] = {
  async catalogo(ctx) {
    await modAdmin(ctx);
    return { infracciones: MOD_INFRACCIONES, medidas: MOD_MEDIDAS_POR_GRAVEDAD, dias_max: MOD_DIAS_MAX_SUSPENSION, dias_apelacion: MOD_DIAS_APELACION };
  },

  async ficha(ctx) {
    await modAdmin(ctx);
    const uidM = str(ctx.query.uid).trim();
    const m = await miembro(uidM);
    if (!m) fail("Miembro no encontrado.", 404);
    const es = suyo(uidM);
    const [pedidos, reportes, sanciones, actividad, lotes, servicios, posts] = await Promise.all(
      ["pedidos", "reportes", "sanciones", "actividad", "lotes", "servicios-terceros", "posts"].map((c) => listar(c)),
    );
    const publicaciones: Doc[] = [];
    for (const [tipo, def] of Object.entries(MOD_PUBLICACIONES)) {
      for (const x of await listar(def.archivo)) {
        if (!x || !es(x)) continue;
        publicaciones.push({
          tipo, id: str(x.id), titulo: cortar(str(x.titulo ?? x.finca ?? x.text).trim(), 120) || "(sin título)",
          oculto: !!x.oculto, puede_ocultar: def.ocultable, fecha: str(x.created_at), enlace: def.enlace,
        });
      }
    }
    const notas = await mapa("notas-admin");
    const fila = await db.usuario.findUnique({ where: { id: uidM } });
    return {
      miembro: m,
      contadores: {
        lotes: lotes.filter(es).length, servicios: servicios.filter(es).length, publicaciones: posts.filter(es).length,
        pedidos_comprador: pedidos.filter((p) => p.solicitante_id === uidM).length, pedidos_vendedor: pedidos.filter((p) => p.productor_id === uidM).length,
      },
      reportes_recibidos: reportes.filter((r) => r.reportado_id === uidM),
      reportes_hechos: reportes.filter((r) => r.uid === uidM).length,
      sanciones: sanciones.filter((s) => s.uid === uidM).map((s) => ({ ...s, estado_vigente: estadoVigente(s) })),
      actividad: actividad.filter((a) => a.actor_id === uidM).reverse().slice(0, 15),
      publicaciones,
      pedidos: pedidos.filter((p) => [p.solicitante_id, p.productor_id].includes(uidM)).map((p) => ({
        nro: p.nro ?? null, estado: str(p.estado), fecha: str(p.created_at ?? p.fecha), finca: str(p.finca), sacos: p.sacos ?? null, total: p.total ?? null,
        papel: p.solicitante_id === uidM ? "compra" : "venta",
      })),
      notas: [...((notas["u:" + uidM] as Doc[]) ?? [])].reverse(),
      acceso: {
        activo: fila?.activo !== false, restringida: await cuentaRestringida(ctx, uidM),
        estado_validacion: str((fila?.extra as Doc)?.estado_validacion) || (m.verificado ? "verificado" : "pendiente"),
      },
    };
  },

  async publicacion(ctx) {
    const admin = await modAdmin(ctx);
    const tipo = str(ctx.in.tipo), id = str(ctx.in.id).trim(), accion = str(ctx.in.accion), motivo = str(ctx.in.motivo).trim();
    const def = MOD_PUBLICACIONES[tipo];
    if (!def || !id) fail("Publicación no válida.", 422);
    if (!["ocultar", "mostrar", "eliminar"].includes(accion)) fail("Acción no válida.", 422);
    if (accion !== "eliminar" && !def.ocultable) fail("Esta publicación no se puede ocultar; solo eliminar.", 422);
    if (largo(motivo) < 10) fail("Escribe el motivo (mínimo 10 caracteres): se le comunica a quien publicó.", 422);
    let hecho: Doc | null = null;
    await mutar(def.archivo, (items) => {
      const out: Doc[] = [];
      for (const x of items) {
        if (str(x.id) === id) {
          hecho = x;
          if (accion === "eliminar") continue;
          out.push({ ...x, oculto: accion === "ocultar", updated_at: nowIso() });
        } else out.push(x);
      }
      return out;
    });
    if (!hecho) fail("Publicación no encontrada.", 404);
    const h = hecho as Doc;
    const duenio = ["published_by", "productor_id", "proveedor_id", "autor_id", "owner_id"].map((k) => str(h[k])).find(Boolean) ?? "";
    const titulo = cortar(str(h.titulo ?? h.finca ?? h.text).trim(), 80);
    const verbo = ({ ocultar: "ocultó", mostrar: "volvió a publicar", eliminar: "eliminó" } as Record<string, string>)[accion];
    if (duenio) await notificar(duenio, "sistema", "La administración " + verbo + " tu publicación", `«${titulo}». Motivo: ${motivo}`, "/panel/");
    await registrarActividad(ctx, "publicacion-" + accion + "-admin", { actor_id: admin.id, actor: admin.nombre ?? "admin", objeto_tipo: tipo, objeto_id: id, detalle: motivo });
    return { accion };
  },

  async nota(ctx) {
    const admin = await modAdmin(ctx);
    const uidM = str(ctx.in.uid).trim(), texto = str(ctx.in.texto).trim();
    if (!(await miembro(uidM))) fail("Miembro no encontrado.", 404);
    if (largo(texto) < 3 || largo(texto) > 1000) fail("La nota debe tener entre 3 y 1000 caracteres.", 422);
    const nota = { ts: nowIso(), actor: admin.nombre ?? "admin", texto };
    await mutarMapa("notas-admin", (todas) => ({ ...todas, ["u:" + uidM]: [...((todas["u:" + uidM] as Doc[]) ?? []), nota] }));
    return { nota };
  },

  async acceso(ctx) {
    const admin = await modAdmin(ctx);
    const uidM = str(ctx.in.uid).trim(), activo = !!ctx.in.activo, motivo = str(ctx.in.motivo).trim();
    const m = await miembro(uidM);
    if (!m) fail("Miembro no encontrado.", 404);
    if (m.estado === "eliminado") fail("La cuenta ya fue eliminada.", 409);
    if (largo(motivo) < 10) fail("Escribe el motivo (mínimo 10 caracteres).", 422);
    const fila = await db.usuario.findUnique({ where: { id: uidM } });
    await db.usuario.update({ where: { id: uidM }, data: { activo, extra: { ...((fila?.extra as Doc) ?? {}), motivo_acceso: motivo, updated_at: nowIso() } } });
    if (activo) await notificar(uidM, "sistema", "Tu cuenta está activa de nuevo", motivo, "/panel/");
    await registrarActividad(ctx, activo ? "cuenta-reactivada" : "cuenta-desactivada", { actor_id: admin.id, actor: admin.nombre ?? "admin", objeto_tipo: "miembro", objeto_id: uidM, detalle: motivo });
    return { activo };
  },

  async list(ctx) {
    await modAdmin(ctx);
    const filtro = str(ctx.query.estado);
    const out: Doc[] = [];
    for (const s0 of [...(await listar("sanciones"))].reverse()) {
      const s: Doc = { ...s0, estado_vigente: estadoVigente(s0) };
      if (filtro === "apelaciones" && s.apelacion?.estado !== "pendiente") continue;
      if (filtro && filtro !== "apelaciones" && s.estado_vigente !== filtro) continue;
      const m = await miembro(str(s.uid));
      out.push({ ...s, miembro: m ? str(m.nombre) : "(cuenta eliminada)" });
    }
    return { sanciones: out };
  },

  async sancionar(ctx) {
    const admin = await modAdmin(ctx);
    const i = ctx.in;
    const uidM = str(i.uid).trim(), tipo = str(i.tipo), infraccion = str(i.infraccion), hechos = str(i.hechos).trim(), dias = int(i.dias);
    const evidencias = (Array.isArray(i.evidencias) ? i.evidencias : i.evidencias ? [i.evidencias] : []).map((e) => cortar(str(e).trim(), 300)).filter(Boolean);
    const m = await miembro(uidM);
    if (!m) fail("Miembro no encontrado.", 404);
    if (m.estado === "eliminado") fail("La cuenta ya fue eliminada.", 409);
    const inf = MOD_INFRACCIONES[infraccion];
    if (!inf) fail("Elige la infracción del catálogo.", 422);
    const permitidas = MOD_MEDIDAS_POR_GRAVEDAD[inf.gravedad];
    if (!permitidas.includes(tipo)) fail("Esa medida no es proporcional a la infracción elegida. Permitidas: " + permitidas.join(", ") + ".", 422);
    if (largo(hechos) < 30) fail("Describe los hechos (mínimo 30 caracteres): qué pasó, cuándo y cómo se comprobó.", 422);
    if (tipo === "suspension" && (dias < 1 || dias > MOD_DIAS_MAX_SUSPENSION)) fail(`La suspensión va de 1 a ${MOD_DIAS_MAX_SUSPENSION} días.`, 422);
    if (tipo === "bloqueo" && !evidencias.length) fail("Un bloqueo indefinido requiere al menos una evidencia (reporte, enlace o captura).", 422);
    const ahora = Date.now();
    const iso = (t: number) => nowIso(new Date(t));
    const s: Doc = {
      id: uid(), uid: uidM, tipo, infraccion, hechos: cortar(hechos, 2000), evidencias,
      desde: iso(ahora), hasta: tipo === "suspension" ? iso(ahora + dias * 86400_000) : null,
      apelar_hasta: iso(ahora + MOD_DIAS_APELACION * 86400_000), estado: "activa", creado_por: admin.id ?? "admin",
      historial: [{ ts: nowIso(), accion: "sancion-impuesta", actor: admin.nombre ?? "Administración" }],
    };
    await mutar("sanciones", (t) => [...t, s]);
    const titulo = tipo === "advertencia" ? "Advertencia sobre el uso de tu cuenta" : tipo === "suspension" ? "Tu cuenta ha sido suspendida temporalmente" : "Tu cuenta ha sido bloqueada";
    const texto = `${textoMedida(s)} Motivo: ${inf.titulo}. Puedes apelar hasta el ${fechaCorta(s.apelar_hasta)}.`;
    await notificarSancion(m, s, titulo, texto);
    await registrarActividad(ctx, "sancion-impuesta", { actor_id: admin.id ?? "admin", actor: admin.nombre ?? "Administración", objeto_tipo: "miembro", objeto_id: uidM, detalle: `${tipo} · ${infraccion}` + (tipo === "suspension" ? ` · ${dias} días` : "") });
    return { sancion: s };
  },

  async levantar(ctx) { return levantarOResolver(ctx, "levantar"); },
  async resolver_apelacion(ctx) { return levantarOResolver(ctx, "resolver_apelacion"); },

  async contactar_correo(ctx) {
    const admin = await modAdmin(ctx);
    if (!(await cupo(ctx, "admin_correo_directo", 60, 3600))) fail("Demasiados correos seguidos. Espera un poco.", 429);
    const m = await miembro(str(ctx.in.uid).trim());
    if (!m) fail("Miembro no encontrado.", 404);
    const asunto = str(ctx.in.asunto).replace(/[\r\n]/g, " ").trim(), mensaje = str(ctx.in.mensaje).trim();
    if (largo(asunto) < 3 || largo(asunto) > 140) fail("El asunto va de 3 a 140 caracteres.", 422);
    if (largo(mensaje) < 10 || largo(mensaje) > 3000) fail("El mensaje va de 10 a 3000 caracteres.", 422);
    if (!emailValido(str(m.email))) fail("Ese miembro no tiene un correo válido.", 422);
    const okMail = await enviarCorreo("contacto_admin", m.email, { nombre: m.nombre, asunto, mensaje });
    await registrarActividad(ctx, "correo-admin-directo", { actor_id: admin.id ?? "admin", actor: admin.nombre ?? "Administración", objeto_tipo: "miembro", objeto_id: m.id, detalle: asunto });
    return { enviado: okMail };
  },

  async mi_estado(ctx) {
    const u = await usuarioActual(ctx);
    if (!u) fail("No autenticado.", 401);
    const mias = (await listar("sanciones")).filter((s) => s.uid === u.id).reverse();
    return { sanciones: mias.map(vistaPublica) };
  },

  async apelar(ctx) {
    if (!(await cupo(ctx, "apelacion", 5, 3600))) fail("Demasiados intentos. Vuelve a intentarlo en una hora.", 429);
    const sid = str(ctx.in.id).trim(), texto = str(ctx.in.texto).trim();
    const u = await usuarioActual(ctx);
    const uidM = u ? u.id : str(ctx.in.u).trim();
    if (!u && (!uidM || (await firma(uidM, sid)) !== str(ctx.in.t))) fail("Enlace de apelación no válido.", 403);
    if (largo(texto) < 30) fail("Explica tus razones (mínimo 30 caracteres). Puedes añadir enlaces a pruebas.", 422);
    let res = "";
    await mutar("sanciones", (todas) => todas.map((s) => {
      if (s.id !== sid || s.uid !== uidM) return s;
      if (s.apelacion) { res = "ya"; return s; }
      if (s.apelar_hasta && fechaMs(s.apelar_hasta) < Date.now()) { res = "plazo"; return s; }
      res = "ok";
      return { ...s, apelacion: { texto: cortar(texto, 3000), fecha: nowIso(), estado: "pendiente" }, historial: [...(s.historial ?? []), { ts: nowIso(), accion: "apelacion-presentada", actor: "titular" }] };
    }));
    if (res === "ya") fail("Esta medida ya tiene una apelación registrada.", 409);
    if (res === "plazo") fail("El plazo para apelar esta medida terminó.", 409);
    if (res !== "ok") fail("Sanción no encontrada.", 404);
    await notificarAdmins("reporte", "Nueva apelación de una sanción", cortar(texto, 200), "/admin/");
    return { apelacion: "pendiente" };
  },

  async ver_apelacion(ctx) {
    const sid = str(ctx.query.id).trim(), uidM = str(ctx.query.u).trim();
    if (!uidM || (await firma(uidM, sid)) !== str(ctx.query.t)) fail("Enlace no válido.", 403);
    const s = (await listar("sanciones")).find((x) => x.id === sid && x.uid === uidM);
    if (!s) fail("Sanción no encontrada.", 404);
    return { sancion: vistaPublica(s) };
  },

  async baja(ctx) {
    const u = await usuarioActual(ctx);
    if (!u) fail("No autenticado.", 401);
    if (!(await cupo(ctx, "baja_cuenta", 5, 3600))) fail("Demasiados intentos. Vuelve a intentarlo en una hora.", 429);
    if (str(ctx.in.confirmacion).trim() !== "ELIMINAR") fail("Escribe ELIMINAR para confirmar.", 422);
    const fila = await db.usuario.findUnique({ where: { id: u.id } });
    if (!fila || !(await verificarPass(str(ctx.in.pass), fila.passHash))) fail("La contraseña no es correcta.", 401);
    const abiertos = (await listar("pedidos")).filter((p) => [p.solicitante_id, p.productor_id, p.proveedor_id].includes(u.id) && !["entregado", "cancelado"].includes(str(p.estado).toLowerCase()));
    if (abiertos.length) fail(`Tienes ${abiertos.length} pedido(s) en curso. Complétalos o cancélalos antes de cerrar tu cuenta.`, 409, { pedidos: abiertos.map((p) => ({ nro: p.nro ?? "", estado: p.estado ?? "" })) });

    const motivo = cortar(str(ctx.in.motivo).trim(), 300);
    const resumen: Record<string, number> = { lotes: 0, servicios: 0, publicaciones: 0, requerimientos: 0, empleos: 0, busquedas: 0 };
    const deEl = suyo(u.id);
    for (const [archivo, clave] of Object.entries({ lotes: "lotes", "servicios-terceros": "servicios", posts: "publicaciones", requerimientos: "requerimientos", empleos: "empleos", "busquedas-empleo": "busquedas" })) {
      await mutar(archivo, (items) => {
        const antes = items.length;
        let quedan = items.filter((x) => !deEl(x));
        resumen[clave] = antes - quedan.length;
        if (clave === "publicaciones") {
          quedan = quedan.map((p) => (Array.isArray(p.comments) ? { ...p, comments: p.comments.map((c: Doc) => (c.autor_id === u.id ? { ...c, autor: "Miembro que dejó la Red", autor_id: "" } : c)) } : p));
        }
        return quedan;
      });
    }
    await mutar("pedidos", (ps) => ps.map((p) => {
      const x = { ...p };
      for (const [k, campo] of [["solicitante_id", "solicitante"], ["productor_id", "productor"], ["proveedor_id", "proveedor"]]) {
        if (str(x[k]) !== u.id) continue;
        x[campo] = "Miembro que dejó la Red";
        for (const c of ["email", "telefono", "whatsapp", `${campo}_email`, `${campo}_telefono`, `${campo}_whatsapp`]) delete x[c];
      }
      return x;
    }));
    await mutar("notificaciones", (ns) => ns.filter((n) => str(n.uid) !== u.id));
    // Registro mínimo e ilegible: sin nombre, contacto ni contraseña.
    await db.$transaction([
      db.usuario.update({
        where: { id: u.id },
        data: {
          nombre: "Miembro que dejó la Red", email: `eliminado+${u.id}@invalid`, passHash: "", estado: "eliminado", activo: false, rol: "eliminado", roles: [],
          visibilidad: "privado", telefono: "", whatsapp: "", provincia: "", cedulaCifrada: "", cedulaHuella: "", dosFactores: false, extra: { eliminado_en: nowIso() },
        },
      }),
      db.sesion.deleteMany({ where: { usuarioId: u.id } }),
      db.codigoRespaldo.deleteMany({ where: { usuarioId: u.id } }),
    ]);
    await mutarMapa("notas-admin", (t) => { const x = { ...t }; delete x["u:" + u.id]; return x; });
    await mutar("bajas", (b) => [...b, { id: uid(), uid: u.id, fecha: nowIso(), motivo, eliminado: resumen }]);
    await registrarActividad(ctx, "cuenta-eliminada", { actor_id: u.id, actor: "titular", objeto_tipo: "miembro", objeto_id: u.id, detalle: "baja voluntaria" });
    if (emailValido(str(u.email))) await enviarCorreo("baja", u.email, { nombre: u.nombre });
    ctx.ses.destruir();
    return { eliminado: resumen };
  },
};

async function levantarOResolver(ctx: Ctx, accion: "levantar" | "resolver_apelacion") {
  const admin = await modAdmin(ctx);
  const sid = str(ctx.in.id).trim();
  const justif = str(ctx.in[accion === "levantar" ? "justificacion" : "respuesta"]).trim();
  const decision = str(ctx.in.decision);
  if (largo(justif) < 20) fail("Escribe la justificación (mínimo 20 caracteres): queda en el registro y se comunica a la persona.", 422);
  if (accion === "resolver_apelacion" && !["aceptada", "rechazada"].includes(decision)) fail("Decisión no válida.", 422);
  let hecho: Doc | null = null;
  await mutar("sanciones", (todas) => todas.map((s0) => {
    if (s0.id !== sid) return s0;
    const s = structuredClone(s0);
    const actor = admin.nombre ?? "Administración";
    if (accion === "resolver_apelacion") {
      if (s.apelacion?.estado !== "pendiente") return s0;
      Object.assign(s.apelacion, { estado: decision, respuesta: cortar(justif, 2000), resuelta: nowIso() });
      s.historial = [...(s.historial ?? []), { ts: nowIso(), accion: "apelacion-" + decision, actor }];
      if (decision === "aceptada") { s.estado = "levantada"; s.levantada = nowIso(); }
    } else {
      if (estadoVigente(s) !== "activa") return s0;
      Object.assign(s, { estado: "levantada", levantada: nowIso(), justificacion_levantamiento: cortar(justif, 2000) });
      s.historial = [...(s.historial ?? []), { ts: nowIso(), accion: "sancion-levantada", actor, nota: cortar(justif, 300) }];
    }
    hecho = s;
    return s;
  }));
  if (!hecho) fail("No se encontró la sanción o ya no admite ese cambio.", 409);
  const h = hecho as Doc;
  const m = await miembro(str(h.uid));
  if (m) {
    const titulo = accion === "levantar" || decision === "aceptada" ? "Se levantó la medida sobre tu cuenta" : "Resolución de tu apelación";
    await notificar(m.id, "sistema", titulo, cortar(justif, 380), "/panel/?ver=cuenta");
    if (emailValido(str(m.email))) await enviarCorreo("contacto_admin", m.email, { nombre: m.nombre, asunto: titulo, mensaje: justif });
  }
  await registrarActividad(ctx, accion === "levantar" ? "sancion-levantada" : "apelacion-resuelta", { actor_id: admin.id ?? "admin", actor: admin.nombre ?? "Administración", objeto_tipo: "miembro", objeto_id: str(h.uid), detalle: accion === "levantar" ? "levantada" : decision });
  return { sancion: h };
}

export const moderacion: Modulo = { acciones };
