// Port de api/notificaciones.php. El respaldo diario y la revisión de salud que
// PHP disparaba desde la campana pasan a tareas del servidor/proveedor
// (copias de la base y monitoreo), no a una petición de usuario.
import { createHmac, timingSafeEqual } from "node:crypto";
import { fail, Cruda, type Ctx, type Modulo } from "../lib/http.js";
import { actualizarDonde, buscarPor, campoSql, conBloqueo, type Doc } from "../lib/docs.js";
import { db, Prisma } from "../lib/db.js";
import { tieneRol, todosLosMiembros, usuarioActual } from "../lib/usuarios.js";
import { AVISOS_ADMIN_UID, notificar, registrarActividad } from "../lib/avisos.js";
import { enviarCorreosLote, type CorreoLote } from "../lib/correo.js";
import { aceptaNovedades, activo, filtrarMiembros, leerFiltros, resumenCanales, siNo } from "../lib/audiencia.js";
import { cupo } from "../lib/seguridad.js";
import { bool, emailValido, int, largo, nowIso, str } from "../lib/util.js";
import { secreto } from "./moderacion-comun.js";

const AVISO_TIPOS = ["pedido", "pedido-estado", "mensaje", "curso", "curso-acceso", "lote", "servicio", "miembro", "reporte", "sistema"];
const TOPE_CORREO = Math.max(1, Math.min(5000, Number(process.env.REDCAFE_TOPE_CORREO) || 250));

async function actorUid(ctx: Ctx): Promise<string> {
  const u = await usuarioActual(ctx);
  if (u) return u.id;
  if (ctx.ses.d.admin) return AVISOS_ADMIN_UID;
  fail("No autenticado.", 401);
}
async function misAvisos(uidM: string): Promise<Doc[]> {
  return (await buscarPor("notificaciones", "uid", uidM)).sort((a, b) => str(b.ts).localeCompare(str(a.ts)));
}
const firmaBaja = async (uidM: string) => createHmac("sha256", await secreto("baja-correo")).update("baja-correo|" + uidM).digest("hex");
function enlaceAbsoluto(e: string): string {
  if (!e) return "https://redcafeecuador.com/panel/";
  if (/^https:\/\/redcafeecuador\.com\//.test(e)) return e;
  if (e.startsWith("/") && !e.startsWith("//")) return "https://redcafeecuador.com" + e;
  return "https://redcafeecuador.com/panel/";
}

async function adminDeAvisos(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  const admin = ctx.ses.d.admin ? u ?? { id: "admin", nombre: "Administración" } : u && tieneRol(ctx, u, "admin") ? u : null;
  if (!admin) fail("Solo la administración envía avisos a otros miembros.", 403);
  return admin;
}

/** destino: todos | rol (un perfil) | filtro (perfiles, provincia, curso, segmento) | miembros (ids). */
async function destinatarios(ctx: Ctx): Promise<Doc[]> {
  const destino = str(ctx.in.destino).trim();
  const miembros = await todosLosMiembros();
  if (destino === "todos") return filtrarMiembros(leerFiltros({}), miembros);
  if (destino === "rol") {
    const rol = str(ctx.in.rol).trim();
    if (!rol) fail("Indica el perfil al que quieres avisar.", 422);
    return miembros.filter((m) => activo(m) && tieneRol(ctx, m, rol));
  }
  if (destino === "filtro") {
    const f = leerFiltros(ctx.in.filtros && typeof ctx.in.filtros === "object" && !Array.isArray(ctx.in.filtros) ? (ctx.in.filtros as Doc) : ctx.in);
    return filtrarMiembros(f, miembros);
  }
  if (destino === "miembros") {
    let ids = ctx.in.ids;
    if (typeof ids === "string") ids = ids.split(",").map((s) => s.trim()).filter(Boolean);
    if (!Array.isArray(ids) || !ids.length) fail("Indica al menos un miembro destinatario.", 422);
    const quiero = new Set((ids as unknown[]).map((x) => str(x).trim()).filter(Boolean));
    return miembros.filter((m) => quiero.has(str(m.id)));
  }
  fail("Destino no válido: usa todos, rol, filtro o miembros.", 422);
}

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    const uidM = await actorUid(ctx);
    let mias = await misAvisos(uidM);
    const sinLeer = mias.filter((a) => !a.leido).length;
    if (str(ctx.query.solo) === "nuevos") mias = mias.filter((a) => !a.leido);
    const limite = Math.max(1, Math.min(100, int(ctx.query.limite ?? 30) || 30));
    return { notificaciones: mias.slice(0, limite), sin_leer: sinLeer };
  },

  async contador(ctx) {
    const uidM = await actorUid(ctx);
    const r = await db.$queryRaw<{ n: bigint }[]>(Prisma.sql`
      SELECT count(*) AS n FROM Documento WHERE coleccion = 'notificaciones' AND ${campoSql("uid")} = ${uidM}
        AND COALESCE(${campoSql("leido")}, 'false') <> 'true'`);
    return { sin_leer: Number(r[0]?.n ?? 0) };
  },

  async leer(ctx) {
    const uidM = await actorUid(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    const todos = bool(ctx.in.todos ?? ctx.query.todos ?? false);
    if (!id && !todos) fail("Indica id o todos.", 422);
    const ahora = nowIso();
    const n = await actualizarDonde("notificaciones", "uid", uidM, (a) => {
      if (a.leido === true || (!todos && str(a.id) !== id)) return null;
      return { ...a, leido: true, leido_at: ahora };
    });
    return { marcados: n };
  },

  async borrar(ctx) {
    const uidM = await actorUid(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("id requerido.", 422);
    const n = await db.$executeRaw(Prisma.sql`DELETE FROM Documento WHERE coleccion = 'notificaciones' AND ${campoSql("uid")} = ${uidM} AND ${campoSql("id")} = ${id}`);
    if (!n) fail("Aviso no encontrado.", 404);
    return { borrado: id };
  },

  /** Recuento previo: cuántos recibirían el mensaje por cada canal. */
  async audiencia(ctx) {
    await adminDeAvisos(ctx);
    const ms = await destinatarios(ctx);
    return resumenCanales(ms);
  },

  async enviar(ctx) {
    const admin = await adminDeAvisos(ctx);
    const titulo = str(ctx.in.titulo).trim(), texto = str(ctx.in.texto).trim(), enlace = str(ctx.in.enlace).trim();
    let tipo = str(ctx.in.tipo ?? "sistema").trim();
    if (!AVISO_TIPOS.includes(tipo)) tipo = "sistema";
    const campana = siNo(ctx.in.campana, true), porCorreo = siNo(ctx.in.correo, false);
    if (!campana && !porCorreo) fail("Elige al menos un canal: campana de la Red o correo.", 422);
    if (!titulo) fail("El título del aviso es obligatorio.", 422);
    if (largo(titulo) > 140) fail("El título no puede superar 140 caracteres.", 422);
    if (largo(texto) > 2000) fail("El texto no puede superar 2000 caracteres.", 422);
    const dest = await destinatarios(ctx);
    if (!dest.length) fail("No se encontró a quién enviar el aviso.", 404);
    if (porCorreo && !(await cupo(ctx, "admin_correo_masivo", 20, 3600))) fail("Demasiados envíos masivos seguidos. Espera un poco.", 429);
    if (campana) for (const m of dest) await notificar(str(m.id), tipo, titulo, texto, enlace);
    const correo = { enviados: 0, sin_consentimiento: 0, sin_correo: 0, fuera_de_tope: 0, fallidos: 0 };
    if (porCorreo) {
      const lista: CorreoLote[] = [];
      for (const m of dest) {
        if (!aceptaNovedades(m)) { correo.sin_consentimiento++; continue; }
        if (!emailValido(str(m.email))) { correo.sin_correo++; continue; }
        if (lista.length >= TOPE_CORREO) { correo.fuera_de_tope++; continue; }
        const d = str(m.id);
        const baja = `https://redcafeecuador.com/api/notificaciones.php?action=baja_correo&u=${encodeURIComponent(d)}&t=${await firmaBaja(d)}`;
        lista.push({ para: str(m.email), baja, vars: { nombre: m.nombre, titulo, texto, enlace: enlaceAbsoluto(enlace), baja } });
      }
      const r = await enviarCorreosLote("aviso", lista);
      correo.enviados = r.enviados; correo.fallidos = r.fallidos;
    }
    await registrarActividad(ctx, "aviso-admin-enviado", {
      actor_id: admin.id ?? "admin", actor: admin.nombre ?? "Administración", objeto_tipo: "notificacion",
      detalle: `${titulo} · ${dest.length} miembro(s)` + (campana ? " en la campana" : "") + (porCorreo ? ` · ${correo.enviados} por correo` : "") + ".",
    });
    return { enviados: campana ? dest.length : 0, destinatarios: dest.length, correo: porCorreo ? correo : null };
  },

  async baja_correo(ctx) {
    const uidM = str(ctx.query.u), t = str(ctx.query.t);
    const esperada = uidM ? Buffer.from(await firmaBaja(uidM)) : Buffer.alloc(0), recibida = Buffer.from(str(t));
    const valida = !!uidM && esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
    if (valida) {
      const f = await db.usuario.findUnique({ where: { id: uidM } });
      if (f) {
        const extra: Doc = { ...((f.extra as Doc) ?? {}), acepta_marketing: false };
        extra.consentimientos = { ...(extra.consentimientos ?? {}), marketing: { aceptado: false, fecha: nowIso(), version: "baja-correo" } };
        await db.usuario.update({ where: { id: uidM }, data: { extra } });
      }
    }
    return new Cruda('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Red Café Ecuador</title><body style="font-family:system-ui,sans-serif;background:#F7F4EF;color:#21170F;padding:48px 16px;text-align:center">'
      + (valida ? '<h1 style="font-weight:500">Listo: ya no recibirás correos de novedades</h1><p>Seguirás viendo los avisos dentro de la Red y los correos de tus pedidos.</p>'
                : '<h1 style="font-weight:500">Este enlace no es válido</h1><p>Escríbenos a soporte@redcafeecuador.com y te damos de baja.</p>')
      + '<p><a href="/" style="color:#8A5A22">Volver a Red Café Ecuador</a></p></body>', "text/html; charset=utf-8");
  },
};

export const notificaciones: Modulo = { acciones };
