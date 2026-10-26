// Port de api/notificaciones.php. El respaldo diario y la revisión de salud que
// PHP disparaba desde la campana pasan a tareas del servidor/proveedor
// (PITR de PostgreSQL y monitoreo), no a una petición de usuario.
import { createHmac } from "node:crypto";
import { fail, Cruda, type Ctx, type Modulo } from "../lib/http.js";
import { buscarPor, conBloqueo, type Doc } from "../lib/docs.js";
import { db, Prisma } from "../lib/db.js";
import { tieneRol, todosLosMiembros, usuarioActual } from "../lib/usuarios.js";
import { AVISOS_ADMIN_UID, notificar, registrarActividad } from "../lib/avisos.js";
import { enviarCorreo } from "../lib/correo.js";
import { bool, emailValido, int, largo, nowIso, str } from "../lib/util.js";
import { secreto } from "./moderacion-comun.js";

const AVISO_TIPOS = ["pedido", "pedido-estado", "mensaje", "curso", "curso-acceso", "lote", "servicio", "miembro", "reporte", "sistema"];
const TOPE_CORREO = 250;

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
function consiente(m: Doc): boolean {
  if ("activo" in m && !m.activo) return false;
  if (["bloqueado", "suspendido", "eliminado"].includes(str(m.estado))) return false;
  return !!m.acepta_marketing || !!m.consentimientos?.marketing?.aceptado;
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
      SELECT count(*) AS n FROM "Documento" WHERE coleccion = 'notificaciones' AND datos->>'uid' = ${uidM}
        AND COALESCE((datos->>'leido')::boolean, false) = false`);
    return { sin_leer: Number(r[0]?.n ?? 0) };
  },

  async leer(ctx) {
    const uidM = await actorUid(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    const todos = bool(ctx.in.todos ?? ctx.query.todos ?? false);
    if (!id && !todos) fail("Indica id o todos.", 422);
    const n = await conBloqueo("notificaciones", (tx) => tx.$executeRaw(Prisma.sql`
      UPDATE "Documento" SET datos = datos || jsonb_build_object('leido', true, 'leido_at', ${nowIso()}::text), actualizado = now()
      WHERE coleccion = 'notificaciones' AND datos->>'uid' = ${uidM}
        AND COALESCE((datos->>'leido')::boolean, false) = false ${todos ? Prisma.empty : Prisma.sql`AND datos->>'id' = ${id}`}`));
    return { marcados: n };
  },

  async borrar(ctx) {
    const uidM = await actorUid(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("id requerido.", 422);
    const n = await db.$executeRaw(Prisma.sql`DELETE FROM "Documento" WHERE coleccion = 'notificaciones' AND datos->>'uid' = ${uidM} AND datos->>'id' = ${id}`);
    if (!n) fail("Aviso no encontrado.", 404);
    return { borrado: id };
  },

  async enviar(ctx) {
    const u = await usuarioActual(ctx);
    const admin = ctx.ses.d.admin ? u ?? { id: "admin", nombre: "Administración" } : u && tieneRol(ctx, u, "admin") ? u : null;
    if (!admin) fail("Solo la administración envía avisos a otros miembros.", 403);
    const destino = str(ctx.in.destino).trim(), titulo = str(ctx.in.titulo).trim(), texto = str(ctx.in.texto).trim(), enlace = str(ctx.in.enlace).trim();
    let tipo = str(ctx.in.tipo ?? "sistema").trim();
    if (!AVISO_TIPOS.includes(tipo)) tipo = "sistema";
    if (!titulo) fail("El título del aviso es obligatorio.", 422);
    if (largo(titulo) > 140) fail("El título no puede superar 140 caracteres.", 422);
    if (largo(texto) > 400) fail("El texto no puede superar 400 caracteres.", 422);
    const miembros = await todosLosMiembros();
    let dest: string[] = [];
    if (destino === "todos") dest = miembros.map((m) => str(m.id)).filter(Boolean);
    else if (destino === "rol") {
      const rol = str(ctx.in.rol).trim();
      if (!rol) fail("Indica el perfil al que quieres avisar.", 422);
      dest = miembros.filter((m) => tieneRol(ctx, m, rol)).map((m) => m.id);
    } else if (destino === "miembros") {
      let ids = ctx.in.ids;
      if (typeof ids === "string") ids = ids.split(",").map((s) => s.trim()).filter(Boolean);
      if (!Array.isArray(ids) || !ids.length) fail("Indica al menos un miembro destinatario.", 422);
      const existentes = new Set(miembros.map((m) => m.id));
      dest = (ids as unknown[]).map((x) => str(x).trim()).filter((x) => x && existentes.has(x));
    } else fail("Destino no válido: usa todos, rol o miembros.", 422);
    dest = [...new Set(dest)];
    if (!dest.length) fail("No se encontró a quién enviar el aviso.", 404);
    for (const d of dest) await notificar(d, tipo, titulo, texto, enlace);
    const correo = { enviados: 0, sin_consentimiento: 0, sin_correo: 0, fuera_de_tope: 0, fallidos: 0 };
    if (ctx.in.correo) {
      const porId = new Map(miembros.map((m) => [m.id, m]));
      for (const d of dest) {
        const m = porId.get(d);
        if (!m) continue;
        if (!consiente(m)) { correo.sin_consentimiento++; continue; }
        if (!emailValido(str(m.email))) { correo.sin_correo++; continue; }
        if (correo.enviados + correo.fallidos >= TOPE_CORREO) { correo.fuera_de_tope++; continue; }
        const ok = await enviarCorreo("aviso", m.email, {
          nombre: m.nombre, titulo, texto, enlace: enlaceAbsoluto(enlace),
          baja: `https://redcafeecuador.com/api/notificaciones.php?action=baja_correo&u=${encodeURIComponent(d)}&t=${await firmaBaja(d)}`,
        });
        correo[ok ? "enviados" : "fallidos"]++;
      }
    }
    await registrarActividad(ctx, "aviso-admin-enviado", {
      actor_id: admin.id ?? "admin", actor: admin.nombre ?? "Administración", objeto_tipo: "notificacion",
      detalle: `${titulo} · enviado a ${dest.length} miembro(s)` + (ctx.in.correo ? ` · ${correo.enviados} por correo` : "") + ".",
    });
    return { enviados: dest.length, correo: ctx.in.correo ? correo : null };
  },

  async baja_correo(ctx) {
    const uidM = str(ctx.query.u), t = str(ctx.query.t);
    const valida = !!uidM && (await firmaBaja(uidM)) === t;
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
