import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Cruda, fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { requiereUsuario, usuarioActual, esAdmin } from "../lib/usuarios.js";
import { notificar, notificarAdmins, registrarActividad, nombreMiembro } from "../lib/avisos.js";
import { cupo } from "../lib/seguridad.js";
import { formatoReal } from "../lib/imagen.js";
import { carpetaIdentidad } from "../lib/privado.js";
import { verificarMiembro } from "./verificaciones.js";
import { nowIso, str } from "../lib/util.js";

const COL = "verificacion-identidad";
const resumen = (s: Doc) => ({ id: s.id, estado: s.estado, creado: s.creado, decidido: s.decidido ?? null, motivo: s.motivo ?? "" });
function post(ctx: Ctx) { if (ctx.metodo !== "POST") fail("Usa POST.", 405); }
function ruta(nombre: unknown): string {
  if (typeof nombre !== "string" || !/^[a-zA-Z0-9_-]+\.(jpeg|png|pdf)$/.test(nombre) || path.basename(nombre) !== nombre) fail("Archivo no encontrado.", 404);
  return path.join(carpetaIdentidad(), nombre);
}
async function admin(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  if (!u && !ctx.ses.d.admin) fail("No autenticado.", 401);
  if (!(await esAdmin(ctx))) fail("Solo la administración puede revisar identidades.", 403);
  return u ?? { id: "admin", nombre: "Administración" };
}

export const identidad: Modulo = { acciones: {
  async solicitar(ctx) {
    const u = await requiereUsuario(ctx); post(ctx);
    if (!(await cupo(ctx, "identidad:" + u.id, 5, 86400))) fail("Has alcanzado el límite diario de solicitudes.", 429);
    if (u.verificado) fail("Tu perfil ya está verificado.", 422);
    const dir = carpetaIdentidad();
    const archivos: Doc = {}, formatos: Doc = {}, buffers: Buffer[] = [];
    for (const cual of ["documento", "selfie"]) {
      const f = ctx.archivos[cual];
      if (!f || f.size <= 0 || f.size > 5 * 1024 * 1024) fail("Cada archivo es obligatorio y debe pesar máximo 5 MB.", 422);
      const b = Buffer.from(await f.arrayBuffer());
      const { formato } = await formatoReal(b);
      if (!formato || !(cual === "documento" ? ["jpeg", "png", "pdf"] : ["jpeg", "png"]).includes(formato)) fail("Formato no permitido para " + cual + ".", 422);
      archivos[cual] = randomUUID() + "." + formato; formatos[cual] = formato; buffers.push(b);
    }
    const solicitud = { id: randomUUID(), uid: str(u.id), estado: "pendiente", creado: nowIso(), archivos, formatos };
    try {
      ["documento", "selfie"].forEach((c, i) => fs.writeFileSync(path.join(dir, archivos[c]), buffers[i], { mode: 0o600, flag: "wx" }));
      await mutar(COL, (items) => {
        if (items.some(s => s.uid === u.id && s.estado === "pendiente")) fail("Ya tienes una solicitud pendiente.", 422);
        return [...items, solicitud];
      });
    } catch (e) {
      for (const n of Object.values(archivos)) fs.rmSync(path.join(dir, n), { force: true });
      throw e;
    }
    await notificarAdmins("miembro", "Nueva solicitud de identidad", "Hay documentos privados pendientes de revisión.", "/admin/");
    return { solicitud: { id: solicitud.id, estado: solicitud.estado, creado: solicitud.creado } };
  },
  async estado(ctx) {
    const u = await requiereUsuario(ctx);
    const s = (await listar(COL)).filter(s => s.uid === u.id).reverse()[0];
    return { solicitud: s ? resumen(s) : null };
  },
  async pendientes(ctx) {
    await admin(ctx);
    const solicitudes = await Promise.all((await listar(COL)).filter(s => s.estado === "pendiente").map(async s => ({ id: s.id, uid: s.uid, nombre: await nombreMiembro(s.uid), creado: s.creado })));
    return { solicitudes };
  },
  async ver(ctx) {
    await admin(ctx);
    if (ctx.metodo !== "GET") fail("Usa GET.", 405);
    const cual = str(ctx.in.cual);
    if (!["documento", "selfie"].includes(cual)) fail("Archivo no encontrado.", 404);
    // El bloqueo evita servir un archivo mientras se decide y elimina.
    let respuesta: Cruda | undefined;
    await mutar(COL, items => {
      const s = items.find(s => s.id === ctx.in.id && s.estado === "pendiente");
      const archivo = ruta(s?.archivos?.[cual]);
      try {
        const fd = fs.openSync(archivo, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
        let bytes: Buffer;
        try { bytes = fs.readFileSync(fd); } finally { fs.closeSync(fd); }
        const mime = ({ jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" } as Record<string, string>)[s!.formatos[cual]];
        if (!mime) fail("Archivo no encontrado.", 404);
        respuesta = new Cruda(bytes, mime, 200, { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" });
      } catch { fail("Archivo no encontrado.", 404); }
      return items;
    });
    return respuesta;
  },
  async decidir(ctx) {
    const a = await admin(ctx); post(ctx);
    const decision = str(ctx.in.decision), motivo = str(ctx.in.motivo).trim();
    if (!["aprobar", "rechazar"].includes(decision) || motivo.length > 300 || (decision === "rechazar" && !motivo)) fail("Indica una decisión válida y un motivo de hasta 300 caracteres al rechazar.", 422);
    let solicitud: Doc = {};
    await mutar(COL, async (items, tx) => {
      const s = items.find(s => s.id === ctx.in.id);
      if (!s || s.estado !== "pendiente") fail("La solicitud no está pendiente.", 422);
      if (decision === "aprobar" && !(await verificarMiembro(s.uid, true, a, "", tx))) fail("Miembro no encontrado.", 404);
      for (const n of Object.values(s.archivos ?? {})) fs.rmSync(ruta(n), { force: true });
      delete s.archivos;
      Object.assign(s, { estado: decision === "aprobar" ? "aprobada" : "rechazada", decidido: nowIso(), decidido_por: a.id, motivo });
      solicitud = s;
      return items;
    });
    await registrarActividad(ctx, "identidad-" + solicitud.estado, { objeto_tipo: "miembro", objeto_id: solicitud.uid });
    await notificar(solicitud.uid, "miembro", decision === "aprobar" ? "Tu identidad fue verificada" : "Tu solicitud de identidad fue rechazada", decision === "aprobar" ? "Tu perfil lleva ahora el sello de verificado." : "Motivo: " + motivo, "/panel/");
    return { solicitud: resumen(solicitud) };
  },
} };
