// Port de api/reportes.php.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { requiereUsuario, tieneRol, usuarioActual } from "../lib/usuarios.js";
import { notificar, notificarAdmins, registrarActividad } from "../lib/avisos.js";
import { db } from "../lib/db.js";
import { cortar, largo, nowIso, str, uid } from "../lib/util.js";

const CATEGORIAS = ["acceso", "pago", "publicacion", "pedido", "contenido", "contacto-sospechoso", "otro", "conflicto-usuario", "fraude", "acoso", "suplantacion", "uso-indebido-datos", "spam"];
const SOBRE_PERSONA = ["conflicto-usuario", "fraude", "acoso", "suplantacion", "uso-indebido-datos", "spam", "contacto-sospechoso"];
const ESTADOS = ["abierto", "en-proceso", "resuelto", "cerrado"];

function texto(v: unknown, campo: string, min: number, max: number): string {
  const s = str(v).trim();
  if (largo(s) < min || largo(s) > max) fail(`${campo} debe tener entre ${min} y ${max} caracteres.`, 422);
  return s;
}
function urlInterna(v: unknown): string {
  const u = str(v).trim();
  if (!u) return "";
  if (u[0] !== "/" || u.includes("..") || u.startsWith("//")) fail("URL interna inválida.", 422);
  if (largo(u) > 300) fail("URL demasiado larga.", 422);
  return u;
}
const esAdminR = (ctx: Ctx, u: Doc) => !!ctx.ses.d.admin || tieneRol(ctx, u, "admin");
async function requiereAdminR(ctx: Ctx): Promise<Doc> {
  const u = (await usuarioActual(ctx)) ?? {};
  if (!esAdminR(ctx, u)) fail("Solo administradores.", 403);
  return u;
}

const acciones: Modulo["acciones"] = {
  async crear(ctx) {
    const u = await requiereUsuario(ctx);
    const categoria = str(ctx.in.categoria).trim();
    if (!CATEGORIAS.includes(categoria)) fail("Categoría inválida.", 422);
    const asunto = texto(ctx.in.asunto, "Asunto", 5, 120);
    const detalle = texto(ctx.in.detalle, "Detalle", 10, 2000);
    const url = urlInterna(ctx.in.url);
    const reportadoId = str(ctx.in.reportado_id).trim();
    let reportadoNombre = "";
    if (SOBRE_PERSONA.includes(categoria) && categoria !== "contacto-sospechoso" && !reportadoId) {
      fail("Indica a qué miembro reportas (usa el botón «Reportar» de su publicación o perfil).", 422);
    }
    if (reportadoId) {
      if (reportadoId === u.id) fail("No puedes reportarte a ti mismo.", 422);
      reportadoNombre = (await db.usuario.findUnique({ where: { id: reportadoId }, select: { nombre: true } }))?.nombre ?? "";
      if (!reportadoNombre) fail("No encontramos al miembro que quieres reportar.", 404);
    }
    if (!(await cupo(ctx, "reporte", 5, 600))) fail("Demasiados reportes. Espera unos minutos.", 429);
    const reporte = {
      id: uid(), ts: nowIso(), uid: u.id, nombre: u.nombre, email: u.email ?? "", rol: u.rol ?? "", categoria, asunto, detalle, url,
      reportado_id: reportadoId, reportado_nombre: reportadoNombre, estado: "abierto", historial: [],
    };
    await mutar("reportes", (r) => [...r, reporte]);
    await notificarAdmins("reporte", (reportadoId ? "Reporte sobre un miembro: " : "Nuevo reporte: ") + asunto, cortar(detalle, 400), "/admin/");
    await registrarActividad(ctx, "reporte-creado", { actor_id: u.id, actor: u.nombre, rol: u.rol, objeto_tipo: "reporte", objeto_id: reporte.id, ref: categoria, detalle: asunto });
    return { reporte };
  },

  async mios(ctx) {
    const u = await requiereUsuario(ctx);
    const mios = (await listar("reportes")).filter((r) => r.uid === u.id).sort((a, b) => str(b.ts).localeCompare(str(a.ts)));
    return { reportes: mios };
  },

  async list(ctx) {
    await requiereAdminR(ctx);
    const estado = str(ctx.query.estado ?? ctx.in.estado).trim();
    if (estado && !ESTADOS.includes(estado)) fail("Estado inválido.", 422);
    let rs = await listar("reportes");
    if (estado) rs = rs.filter((r) => r.estado === estado);
    return { reportes: rs.sort((a, b) => str(b.ts).localeCompare(str(a.ts))) };
  },

  async responder(ctx) {
    const admin = await requiereAdminR(ctx);
    const id = str(ctx.in.id).trim();
    const respuesta = texto(ctx.in.respuesta, "Respuesta", 5, 2000);
    const estado = str(ctx.in.estado).trim();
    if (!id) fail("ID requerido.", 422);
    if (!ESTADOS.includes(estado)) fail("Estado inválido.", 422);
    let act: Doc | null = null;
    await mutar("reportes", (rs) => rs.map((r) => {
      if (str(r.id) !== id) return r;
      act = { ...r, estado, actualizado: nowIso(), historial: [...(Array.isArray(r.historial) ? r.historial : []), { ts: nowIso(), uid: admin.id ?? "admin", nombre: admin.nombre ?? "Administración", rol: "admin", respuesta, estado }] };
      return act;
    }));
    if (!act) fail("Reporte no encontrado.", 404);
    const a = act as Doc;
    await notificar(str(a.uid), "reporte", "Respuesta a tu reporte", cortar(respuesta, 400), "/panel/");
    await registrarActividad(ctx, "reporte-respondido", { actor_id: admin.id ?? "", actor: admin.nombre ?? "Administración", rol: "admin", objeto_tipo: "reporte", objeto_id: id, ref: estado, detalle: str(a.asunto) });
    return { reporte: a };
  },

  async cerrar(ctx) {
    const u = await requiereUsuario(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("ID requerido.", 422);
    const admin = esAdminR(ctx, u);
    let act: Doc | null = null;
    await mutar("reportes", (rs) => rs.map((r) => {
      if (str(r.id) !== id) return r;
      if (!admin && r.uid !== u.id) fail("No autorizado.", 403);
      act = { ...r, estado: "cerrado", actualizado: nowIso(), historial: [...(Array.isArray(r.historial) ? r.historial : []), { ts: nowIso(), uid: u.id, nombre: u.nombre, rol: admin ? "admin" : u.rol ?? "", estado: "cerrado", respuesta: "" }] };
      return act;
    }));
    if (!act) fail("Reporte no encontrado.", 404);
    return { reporte: act };
  },
};

export const reportes: Modulo = { acciones };
