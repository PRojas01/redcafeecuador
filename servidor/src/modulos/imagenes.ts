// Port de api/imagenes.php: imágenes de los huecos (slots) de la maqueta.
// El catálogo es cerrado (mapa «slots», importado de data/slots.json) y el
// almacén es el mapa «imagenes» {items: {clave: {...}}}.
import fs from "node:fs";
import path from "node:path";
import { Cruda, fail, type Ctx, type Modulo } from "../lib/http.js";
import { mapa, mutarMapa, type Doc } from "../lib/docs.js";
import { db } from "../lib/db.js";
import { cupo } from "../lib/seguridad.js";
import { aDoc, tieneRol, usuarioActual, requiereAdmin } from "../lib/usuarios.js";
import { formatoReal, paraHueco } from "../lib/imagen.js";
import { listar } from "../lib/docs.js";
import { config } from "../lib/config.js";
import { nowIso, str, uid } from "../lib/util.js";

const MAX_BYTES = 2 * 1024 * 1024, MAX_POR_MIEMBRO = 30, PESO_MAX_KB = 2048;

async function catalogo(): Promise<Record<string, Doc>> {
  const j = await mapa("slots");
  if (!Array.isArray(j.slots)) fail("Catálogo de huecos no configurado.", 500);
  const out: Record<string, Doc> = {};
  for (const s of j.slots) {
    const id = s?.id;
    if (typeof id !== "string" || !id) continue;
    out[id] = { id, nombre: s.nombre ?? id, proporcion: s.proporcion ?? "1:1", ancho_max: Math.trunc(Number(s.ancho_max ?? 1600)) || 0, ambito: s.ambito ?? "plataforma", lamina: s.lamina ?? null, peso_max_kb: Math.trunc(Number(j.peso_max_kb ?? PESO_MAX_KB)) };
  }
  return out;
}
async function items(): Promise<Record<string, Doc>> {
  const m = await mapa("imagenes");
  return m.items && typeof m.items === "object" && !Array.isArray(m.items) ? m.items : {};
}

async function resolver(ctx: Ctx): Promise<{ slot: Doc; recurso: string | null }> {
  const id = str(ctx.in.slot ?? ctx.query.slot).trim();
  if (!id) fail("Slot requerido.", 422);
  const slot = (await catalogo())[id];
  if (!slot) fail("Slot no existe.", 422);
  let recurso: string | null = null;
  if (["perfil", "lote", "local"].includes(slot.ambito)) {
    recurso = str(ctx.in.recurso ?? ctx.query.recurso).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(recurso)) fail("recurso inválido para este slot.", 422);
  }
  return { slot, recurso };
}
const clave = (slot: string, recurso: string | null) => (recurso === null ? slot : `${slot}:${recurso}`);

async function permiso(ctx: Ctx, slot: Doc, recurso: string | null) {
  const ambito = slot.ambito;
  if (ambito === "plataforma") { requiereAdmin(ctx); return; }
  const u = await usuarioActual(ctx);
  if (!u) fail("No autenticado.", 401);
  const yo = str(u.id);
  if (ambito === "perfil" || ambito === "local") {
    const f = await db.usuario.findUnique({ where: { id: recurso! } });
    if (!f) fail(ambito === "perfil" ? "Perfil no encontrado en el almacén." : "Local no encontrado en el almacén.", 403);
    if (ambito === "local" && !tieneRol(ctx, aDoc(f), "bar")) fail("El recurso no es un local.", 403);
    if (yo !== recurso) fail(ambito === "perfil" ? "No eres el dueño de este perfil." : "No eres el dueño de este local.", 403);
    return;
  }
  if (ambito === "lote") {
    const l = (await listar("lotes")).find((x) => str(x.id) === recurso);
    const duenio = l ? (l.productor_id ?? l.published_by ?? null) : null;
    if (duenio === null) fail("Lote no encontrado en el almacén.", 403);
    if (yo !== str(duenio)) fail("No eres el dueño de este lote.", 403);
    return;
  }
  fail("Ámbito de slot desconocido.", 500);
}
const borrarArchivo = (nombre: unknown) => {
  if (typeof nombre !== "string" || !nombre) return;
  const p = path.join(config.uploads, path.basename(nombre));
  try { fs.unlinkSync(p); } catch { /* ya no estaba */ }
};

const acciones: Modulo["acciones"] = {
  async map() {
    const slots = await catalogo();
    const map: Record<string, string> = {};
    for (const it of Object.values(await items())) {
      if (typeof it.archivo !== "string" || !it.archivo) continue;
      map[str(it.slot) + (it.recurso !== null && it.recurso !== undefined ? ":" + it.recurso : "")] = "/uploads/" + path.basename(it.archivo);
    }
    return new Cruda(JSON.stringify({ ok: true, data: { slots, map, peso_max_kb: PESO_MAX_KB } }), "application/json; charset=utf-8", 200, { "Cache-Control": "public, max-age=300" });
  },

  async subir(ctx) {
    const { slot, recurso } = await resolver(ctx);
    await permiso(ctx, slot, recurso);
    const u = await usuarioActual(ctx);
    if (!(await cupo(ctx, "subir_imagen", 20, 3600))) fail("Demasiadas subidas. Intenta más tarde.", 429);
    const k = clave(slot.id, recurso);
    const admin = !!ctx.ses.d.admin;
    if (!admin) {
      const todos = await items(), yo = str(u?.id);
      if (!(todos[k] && todos[k].subido_por === yo) && Object.values(todos).filter((i) => i.subido_por === yo).length >= MAX_POR_MIEMBRO) {
        fail(`Cuota alcanzada: máximo ${MAX_POR_MIEMBRO} imágenes por miembro.`, 429);
      }
    }
    const f = ctx.archivos.archivo;
    if (!f) fail("No se recibió ningún archivo.", 422);
    if (f.size <= 0) fail("Archivo vacío.", 422);
    if (f.size > MAX_BYTES) fail("Máximo 2 MB por imagen.", 413);
    const buf = Buffer.from(await f.arrayBuffer());
    const { formato } = await formatoReal(buf);
    if (!formato) fail("El archivo no es una imagen válida.", 422);
    if (formato === "pdf") fail("Formato no permitido (JPG, PNG o WebP).", 422);
    const { datos, ancho, alto } = await paraHueco(buf, slot.ancho_max, slot.proporcion);
    fs.mkdirSync(config.uploads, { recursive: true });
    const nombre = uid() + ".jpg";
    fs.writeFileSync(path.join(config.uploads, nombre), datos, { mode: 0o644 });
    let viejo: unknown = null;
    await mutarMapa("imagenes", (m) => {
      m.items = m.items && typeof m.items === "object" && !Array.isArray(m.items) ? m.items : {};
      viejo = m.items[k]?.archivo;
      m.items[k] = { slot: slot.id, recurso, archivo: nombre, peso: datos.length, ancho, alto, subido_por: admin ? "admin" : str(u?.id), nombre_subio: u?.nombre ?? "Admin de la Red", fecha: nowIso() };
      m.updated_at = nowIso();
      return m;
    });
    borrarArchivo(viejo);
    return { slot: slot.id, url: "/uploads/" + nombre, peso: datos.length, peso_original: f.size, ancho, alto };
  },

  async borrar(ctx) {
    const { slot, recurso } = await resolver(ctx);
    await permiso(ctx, slot, recurso);
    const k = clave(slot.id, recurso);
    let archivo: unknown = null;
    await mutarMapa("imagenes", (m) => {
      if (!m.items?.[k]) fail("No hay imagen registrada en este hueco.", 404);
      archivo = m.items[k].archivo;
      delete m.items[k];
      m.updated_at = nowIso();
      return m;
    });
    borrarArchivo(archivo);
    return { slot: slot.id, restaurada: true };
  },

  async listar(ctx) {
    requiereAdmin(ctx);
    const slots = await catalogo();
    const inventario: Record<string, Doc> = {};
    for (const [k, it] of Object.entries(await items())) {
      if (typeof it.archivo !== "string" || !it.archivo) continue;
      const peso = Math.trunc(Number(it.peso ?? 0));
      inventario[k] = { slot: it.slot ?? "", recurso: it.recurso ?? null, url: "/uploads/" + path.basename(it.archivo), peso, peso_kb: Math.round((peso / 1024) * 10) / 10, ancho: it.ancho ?? null, alto: it.alto ?? null, subido_por: it.subido_por ?? "", nombre_subio: it.nombre_subio ?? "", fecha: it.fecha ?? "" };
    }
    return { slots, inventario };
  },
};

export const imagenes: Modulo = { acciones, noValida: { mensaje: "Acción no válida. Use map|subir|borrar|listar.", codigo: 400 } };
