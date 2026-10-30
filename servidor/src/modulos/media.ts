// Port de api/media.php: videos y reportajes del hub Bar/Cafetería.
// Mapa «media» {updated_at, items}; con la base vacía se siembra el contenido
// de ejemplo, como hacía el PHP al no encontrar data/media.json.
import { fail, type Modulo } from "../lib/http.js";
import { mapa, mutarMapa, type Doc } from "../lib/docs.js";
import { requiereAdmin } from "../lib/usuarios.js";
import { nowIso, str, today } from "../lib/util.js";
import { datosJson } from "../lib/json.js";
const semilla = datosJson<any[]>("semilla-media.json");

async function leer(): Promise<Doc> {
  const m = await mapa("media");
  if (Object.keys(m).length) return Array.isArray(m.items) ? m : { ...m, items: [] };
  return mutarMapa("media", (actual) => (Object.keys(actual).length ? actual : { updated_at: nowIso(), items: structuredClone(semilla) }));
}

const REDES = {
  whatsapp: { nombre: "Asesor redcafeEcuador", contacto: "https://wa.me/593968641376", comunidad: "", broadcast: "" },
  instagram: "https://www.instagram.com/redcafeecuador/", tiktok: "https://www.tiktok.com/@redcafeecuador",
  facebook: "https://www.facebook.com/RedCafeEcuador", youtube: "https://www.youtube.com/@RedCaf%C3%A9Ecuador",
  x: "", telegram: "", spotify: "", threads: "",
};

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    const d = await leer();
    const items: Doc[] = d.items;
    const { tipo, categoria, tag } = ctx.query;
    const limite = ctx.query.limit !== undefined ? Math.max(1, Math.min(50, Math.trunc(Number(ctx.query.limit)) || 0)) : 50;
    const f = items.filter((it) => (!tipo || it.tipo === tipo) && (!categoria || it.categoria === categoria) && (!tag || (Array.isArray(it.tags) ? it.tags : [it.tags]).includes(tag)))
      .sort((a, b) => str(b.fecha).localeCompare(str(a.fecha))).slice(0, limite);
    return { count: f.length, total: items.length, updated_at: d.updated_at ?? null, items: f };
  },
  async get(ctx) {
    const id = str(ctx.query.id);
    if (!id) fail("id requerido.");
    const it = (await leer()).items.find((x: Doc) => x.id === id);
    if (!it) fail("Item no encontrado.", 404);
    return it;
  },
  async categorias() {
    const out: Record<string, number> = {};
    for (const it of (await leer()).items) { const c = it.categoria ?? "general"; out[c] = (out[c] ?? 0) + 1; }
    return out;
  },
  async redes() { return REDES; },
  async add(ctx) {
    requiereAdmin(ctx);
    const i = { ...ctx.in };
    delete i.action;
    const id = str(i.id);
    if (!/^[a-z0-9\-_]{2,80}$/.test(id)) fail("id inválido (solo a-z, 0-9, guion y guion bajo, 2-80 chars).");
    if (!i.titulo || !i.tipo) fail("titulo y tipo requeridos.");
    if (!["video", "reportaje"].includes(str(i.tipo))) fail("tipo debe ser video|reportaje.");
    // Lo que se pinta en la web pasa por un mínimo de saneado.
    for (const k of ["embed", "thumbnail", "imagen"]) if (i[k] && !/^(https:\/\/|\/(?!\/))/.test(str(i[k]))) fail(`${k} debe ser un enlace https o una ruta interna.`, 422);
    i.fecha ??= today();
    await leer();
    await mutarMapa("media", (d) => {
      d.items = Array.isArray(d.items) ? d.items : [];
      if (d.items.some((x: Doc) => x.id === id)) fail("id ya existe.", 409);
      d.items.push(i);
      d.updated_at = nowIso();
      return d;
    });
    return { id };
  },
  async delete(ctx) {
    requiereAdmin(ctx);
    const id = str(ctx.query.id);
    if (!id) fail("id requerido.");
    await leer();
    await mutarMapa("media", (d) => {
      const antes = d.items.length;
      d.items = d.items.filter((x: Doc) => x.id !== id);
      if (d.items.length === antes) fail("id no encontrado.", 404);
      d.updated_at = nowIso();
      return d;
    });
    return { deleted: id };
  },
};

export const media: Modulo = { acciones, porDefecto: "list", noValida: { mensaje: "Acción no válida. Use list|get|categorias|redes|add|delete.", codigo: 400 } };
