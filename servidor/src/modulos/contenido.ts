// Port de api/contenido.php: contenido editable (noticias, cursos, planes,
// servicios, recetas). Lectura pública; escritura solo para la administración.
// A diferencia del PHP (load + save sin bloqueo), cada escritura es atómica.
import { fail, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { requiereAdmin } from "../lib/usuarios.js";
import { largo, nowIso, str } from "../lib/util.js";

type Lista = { max_items: number; max_long: number };
type Cfg = {
  archivo: string; requeridos: string[]; maximos: Record<string, number>;
  contenido?: { max_parrafos: number; max_long: number };
  modulos?: { max_modulos: number; max_titulo: number; min_minutos: number; max_minutos: number };
  beneficios?: Lista; listas?: Record<string, Lista>;
};
export const SECCIONES: Record<string, Cfg> = {
  noticias: { archivo: "contenido-noticias", requeridos: ["titulo", "fecha", "resumen", "fuente", "categoria"], maximos: { titulo: 300, fecha: 32, resumen: 500, fuente: 120, categoria: 80, slug: 200 }, contenido: { max_parrafos: 100, max_long: 5000 } },
  cursos: { archivo: "contenido-cursos", requeridos: ["titulo", "nivel", "duracion", "descripcion", "categoria"], maximos: { titulo: 300, nivel: 50, duracion: 50, descripcion: 2000, categoria: 50 }, modulos: { max_modulos: 50, max_titulo: 200, min_minutos: 1, max_minutos: 10000 } },
  planes: { archivo: "contenido-planes", requeridos: ["nombre", "perfil", "precio", "periodicidad", "descripcion", "beneficios"], maximos: { nombre: 200, perfil: 50, periodicidad: 100, descripcion: 2000 }, beneficios: { max_items: 50, max_long: 500 } },
  servicios: { archivo: "contenido-servicios", requeridos: ["titulo", "descripcion", "icono", "href"], maximos: { titulo: 300, descripcion: 4000, icono: 20, href: 500 } },
  recetas: {
    archivo: "contenido-recetas", requeridos: ["titulo", "resumen", "metodo", "dificultad", "minutos", "porciones", "ingredientes", "pasos"],
    maximos: { titulo: 200, resumen: 500, metodo: 60, dificultad: 20, ratio: 20, molienda: 120, temperatura: 60, consejo: 600, origenSugerido: 400, slug: 200 },
    listas: { ingredientes: { max_items: 30, max_long: 200 }, pasos: { max_items: 30, max_long: 600 } },
  },
};

function validarId(id: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(id)) fail("ID no válido. Usa letras, números, guion (-) o guion bajo (_).", 422);
}
const esNum = (v: unknown) => (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)));

function listaTextos(v: unknown, campo: string, lim: Lista, msgs?: { muchos: string; tipo: string; largo: string }) {
  if (!Array.isArray(v)) fail(`El campo '${campo}' debe ser una lista.`, 422);
  if (v.length > lim.max_items) fail(msgs?.muchos ?? `Demasiados elementos en '${campo}'.`, 422);
  for (const e of v) {
    if (typeof e !== "string") fail(msgs?.tipo ?? `Cada elemento de '${campo}' debe ser texto.`, 422);
    if (largo(e) > lim.max_long) fail(msgs?.largo ?? `Un elemento de '${campo}' supera el máximo de caracteres.`, 422);
  }
}

function validar(seccion: string, item: Doc, crear: boolean): Doc {
  const cfg = SECCIONES[seccion];
  if (crear) {
    if (item.id === undefined || item.id === null) fail("id requerido.", 422);
    validarId(str(item.id));
  }
  for (const c of cfg.requeridos) {
    if (!(c in item)) fail(`Campo requerido: '${c}'.`, 422);
    if (typeof item[c] === "string" && item[c].trim() === "") fail(`El campo '${c}' no puede estar vacío.`, 422);
  }
  for (const [c, max] of Object.entries(cfg.maximos)) {
    if (typeof item[c] === "string" && largo(item[c]) > max) fail(`El campo '${c}' supera el máximo de ${max} caracteres.`, 422);
  }
  if (cfg.contenido && "contenido" in item) {
    if (!Array.isArray(item.contenido)) fail("El campo 'contenido' debe ser una lista de párrafos.", 422);
    listaTextos(item.contenido, "contenido", { max_items: cfg.contenido.max_parrafos, max_long: cfg.contenido.max_long },
      { muchos: "Demasiados párrafos en el contenido.", tipo: "Cada párrafo del contenido debe ser texto.", largo: "Un párrafo supera el máximo de caracteres." });
  }
  if (cfg.modulos && "modulos" in item) {
    const mods = item.modulos, lim = cfg.modulos;
    if (!Array.isArray(mods)) fail("El campo 'modulos' debe ser una lista.", 422);
    if (mods.length > lim.max_modulos) fail("Demasiados módulos en el curso.", 422);
    for (const m of mods) {
      if (!m || typeof m !== "object" || !("titulo" in m) || !("minutos" in m)) fail('Cada módulo requiere "titulo" y "minutos".', 422);
      if (typeof m.titulo !== "string" || largo(m.titulo) > lim.max_titulo) fail("Título de módulo demasiado largo.", 422);
      if (!esNum(m.minutos) || Math.trunc(Number(m.minutos)) < lim.min_minutos || Math.trunc(Number(m.minutos)) > lim.max_minutos) fail("Minutos de módulo fuera de rango.", 422);
    }
  }
  if (cfg.beneficios && "beneficios" in item) {
    if (!Array.isArray(item.beneficios)) fail("El campo 'beneficios' debe ser una lista.", 422);
    listaTextos(item.beneficios, "beneficios", cfg.beneficios, { muchos: "Demasiados beneficios en el plan.", tipo: "Un beneficio supera el máximo de caracteres.", largo: "Un beneficio supera el máximo de caracteres." });
  }
  for (const [c, lim] of Object.entries(cfg.listas ?? {})) if (c in item) listaTextos(item[c], c, lim);

  const out = { ...item };
  if (seccion === "planes" && "precio" in out) {
    out.precio = Math.round(Number(out.precio) || 0);
    if (out.precio < 0) fail("El precio no puede ser negativo.", 422);
  }
  if (seccion === "recetas") {
    for (const n of ["minutos", "porciones"]) if (n in out) {
      out[n] = Math.round(Number(out[n]) || 0);
      if (out[n] < 0) fail(`El campo '${n}' no puede ser negativo.`, 422);
    }
    if ("dificultad" in out && !["fácil", "media", "alta"].includes(out.dificultad)) fail("La dificultad debe ser: fácil, media o alta.", 422);
  }
  if ("destacado" in out && typeof out.destacado !== "boolean") fail("El campo 'destacado' debe ser booleano.", 422);
  delete out.action; delete out.seccion;
  return out;
}

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    const s = str(ctx.query.seccion).trim();
    if (!SECCIONES[s]) fail("Sección no válida. Usa: noticias, cursos, planes, servicios o recetas.", 400);
    return { [s]: await listar(SECCIONES[s].archivo) };
  },
  async get(ctx) {
    const s = str(ctx.query.seccion).trim();
    if (!SECCIONES[s]) fail("Sección no válida.", 400);
    const id = str(ctx.query.id).trim();
    if (!id) fail("id requerido.", 422);
    const item = (await listar(SECCIONES[s].archivo)).find((x) => str(x.id) === id);
    if (!item) fail("Elemento no encontrado.", 404);
    return { item };
  },
  async create(ctx) {
    requiereAdmin(ctx);
    const s = str(ctx.query.seccion).trim();
    if (!SECCIONES[s]) fail("Sección no válida.", 400);
    const item = validar(s, ctx.in, true);
    item.id = str(item.id);
    item.created_at ??= nowIso();
    await mutar(SECCIONES[s].archivo, (l) => {
      if (l.some((x) => str(x.id) === item.id)) fail("id duplicado.", 409);
      return [...l, item];
    });
    return { id: item.id };
  },
  async update(ctx) {
    requiereAdmin(ctx);
    const s = str(ctx.query.seccion).trim();
    if (!SECCIONES[s]) fail("Sección no válida.", 400);
    const id = str(ctx.query.id ?? ctx.in.id).trim();
    if (!id) fail("id requerido.", 422);
    validarId(id);
    const item = validar(s, { ...ctx.in, id }, false);
    item.updated_at = nowIso();
    await mutar(SECCIONES[s].archivo, (l) => {
      const i = l.findIndex((x) => str(x.id) === id);
      if (i < 0) fail("Elemento no encontrado.", 404);
      l[i] = item;
      return l;
    });
    return { id };
  },
  async delete(ctx) {
    requiereAdmin(ctx);
    const s = str(ctx.query.seccion).trim();
    if (!SECCIONES[s]) fail("Sección no válida.", 400);
    const id = str(ctx.query.id ?? ctx.in.id).trim();
    if (!id) fail("id requerido.", 422);
    validarId(id);
    await mutar(SECCIONES[s].archivo, (l) => {
      const r = l.filter((x) => str(x.id) !== id);
      if (r.length === l.length) fail("Elemento no encontrado.", 404);
      return r;
    });
    return { deleted: id };
  },
};

export const contenido: Modulo = { acciones };
