// Port de api/visual.php: ajustes visuales seguros desde la administración
// (tokens de color, textos, imágenes, enlaces y bloques), con versiones.
import { randomBytes } from "node:crypto";
import { Cruda, fail, type Modulo } from "../lib/http.js";
import { listar, mapa, mutar, mutarMapa, type Doc } from "../lib/docs.js";
import { requiereAdmin } from "../lib/usuarios.js";
import { nowIso, str } from "../lib/util.js";

const VARS = ["--color-cafe", "--color-cereza", "--color-latte", "--color-crema", "--color-hoja", "--color-acento-claro"];
const SELECTORES = ["body", "header", "main", "footer", "h1", "h2", "h3", "p", "a", "img", ".hero-gradient", "#lotes-grid", "#servicios-grid", "#mapa"];
const PROPS = ["display", "visibility", "order", "margin-top", "margin-bottom", "padding-top", "padding-bottom"];

const porDefecto = (): Doc => ({
  version: 1, nombre: "Tema V60/V74 protegido", updated_at: nowIso(), tokens: {}, textos: [], imagenes: [], links: [],
  bloques: { marketplace_compacto_seguro: true, menu_secundario: true, panel_solicitudes_marketplace: true }, css_seguro: [],
});
const limpio = (v: unknown, max: number) => [...str(v).trim()].slice(0, max).join("");
const urlValida = (u: string) => u === "" || (u.startsWith("/") ? !u.includes("..") : /^(https:\/\/|mailto:|tel:)/i.test(u));
const selectorValido = (s: string) => SELECTORES.includes(s) || (/^(#|\.|main\s|section\[|a\[|img\[)[A-Za-z0-9_\-\s.#=[\]"':/]+$/.test(s) && !/[{}<>;]/.test(s));
const obj = (v: unknown): Doc => (v && typeof v === "object" && !Array.isArray(v) ? (v as Doc) : {});
const lista = (v: unknown): any[] => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []);

function normalizar(i: Doc): Doc {
  const out = porDefecto();
  out.version = Math.max(1, Math.trunc(Number(i.version ?? 1)) || 1);
  out.nombre = limpio(i.nombre ?? out.nombre, 120);
  for (const [k, v] of Object.entries(obj(i.tokens))) {
    const val = limpio(v, 32);
    if (VARS.includes(k) && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)) out.tokens[k] = val;
  }
  for (const clave of ["textos", "imagenes", "links"]) {
    for (const it of lista(i[clave]).slice(0, 80)) {
      if (!it || typeof it !== "object") continue;
      const selector = limpio(it.selector, 180);
      if (!selector || !selectorValido(selector)) continue;
      const e: Doc = { selector };
      if (clave === "textos") e.texto = limpio(it.texto, 2000);
      else if (clave === "imagenes") {
        const src = limpio(it.src, 500);
        if (!urlValida(src)) continue;
        e.src = src; e.alt = limpio(it.alt, 300);
      } else {
        const href = limpio(it.href, 500);
        if (!urlValida(href)) continue;
        e.href = href; e.texto = limpio(it.texto, 300);
      }
      out[clave].push(e);
    }
  }
  const b = obj(i.bloques);
  for (const k of Object.keys(out.bloques)) if (k in b) out.bloques[k] = !!b[k] && b[k] !== "0" && b[k] !== "";
  for (const r of lista(i.css_seguro).slice(0, 40)) {
    if (!r || typeof r !== "object") continue;
    const selector = limpio(r.selector, 180), propiedad = limpio(r.propiedad, 60), valor = limpio(r.valor, 120);
    if (!selectorValido(selector) || !PROPS.includes(propiedad) || /[{}<>;]/.test(valor)) continue;
    out.css_seguro.push({ selector, propiedad, valor });
  }
  return out;
}

async function leer(col: "visual-publicado" | "visual-borrador"): Promise<Doc> {
  const m = await mapa(col);
  return Object.keys(m).length ? m : porDefecto();
}
const versiones = () => listar("visual-versiones");

async function publicar(nuevo: Doc): Promise<Doc> {
  return mutarMapa("visual-publicado", async (actual) => {
    const vigente = Object.keys(actual).length ? actual : porDefecto();
    await mutar("visual-versiones", (l) => {
      const id = "visual-" + new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15) + "-" + randomBytes(2).toString("hex");
      return [...l, { id, created_at: nowIso(), snapshot: vigente }].slice(-20);
    });
    nuevo.version = Math.trunc(Number(vigente.version ?? 0)) + 1;
    nuevo.published_at = nowIso();
    await mutarMapa("visual-borrador", () => nuevo);
    return nuevo;
  });
}

const acciones: Modulo["acciones"] = {
  async published() {
    return new Cruda(JSON.stringify({ ok: true, data: await leer("visual-publicado") }), "application/json; charset=utf-8", 200, { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" });
  },
  async get(ctx) {
    requiereAdmin(ctx);
    return { publicado: await leer("visual-publicado"), borrador: await leer("visual-borrador"), versiones: await versiones(), permitidos: { tokens: VARS, selectores: SELECTORES } };
  },
  async save_draft(ctx) {
    requiereAdmin(ctx);
    const borrador = normalizar(ctx.in);
    await mutarMapa("visual-borrador", () => borrador);
    return { borrador };
  },
  async publish(ctx) {
    requiereAdmin(ctx);
    return { publicado: await publicar(normalizar(ctx.in)) };
  },
  async rollback(ctx) {
    requiereAdmin(ctx);
    const id = str(ctx.query.id).trim();
    const v = (await versiones()).find((x) => x.id === id && x.snapshot && typeof x.snapshot === "object");
    if (!v) fail("Version no encontrada.", 404);
    return { publicado: await publicar(normalizar(v.snapshot)) };
  },
};

export const visual: Modulo = { acciones, guardia: (ctx, a) => { if (a !== "published") requiereAdmin(ctx); }, porDefecto: "published", noValida: { mensaje: "Accion no valida.", codigo: 400 } };
