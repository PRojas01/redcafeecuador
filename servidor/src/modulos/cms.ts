// Port de api/cms.php: adaptador de contenido (local o WordPress).
// La conexión a WordPress se configura con REDCAFE_WP_BASE (antes data/.wp.json).
import { fail, type Modulo } from "../lib/http.js";
import { listar, type Doc } from "../lib/docs.js";
import { str } from "../lib/util.js";

const SECCIONES = ["noticias", "cursos", "planes", "servicios"];
const cache = new Map<string, { t: number; d: unknown }>();
const wpBase = () => (process.env.REDCAFE_WP_BASE ?? "").replace(/\/+$/, "");
const sinEtiquetas = (s: unknown) => str(s).replace(/<[^>]*>/g, "");

async function wp(ruta: string, ttl = 300): Promise<any[] | Doc | null> {
  const base = wpBase();
  if (!/^https:\/\//.test(base)) return null;
  const c = cache.get(ruta);
  if (c && Date.now() - c.t < ttl * 1000) return c.d as Doc;
  try {
    const r = await fetch(`${base}/wp-json/wp/v2/${ruta.replace(/^\/+/, "")}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || typeof j !== "object") return null;
    if (cache.size > 200) cache.clear();
    cache.set(ruta, { t: Date.now(), d: j });
    return j;
  } catch {
    return null;
  }
}

const acciones: Modulo["acciones"] = {
  async estado() {
    const conf = !!wpBase();
    const vivo = conf && !!(await wp("types", 60));
    return { origen: conf ? (vivo ? "wordpress" : "local (WordPress no responde)") : "local", wp_configurado: conf, wp_responde: vivo, secciones: SECCIONES };
  },
  async medios(ctx) {
    if (!wpBase()) fail("La biblioteca de medios requiere WordPress configurado. Define REDCAFE_WP_BASE.", 409);
    const pagina = Math.max(1, Math.min(50, Math.trunc(Number(ctx.query.pagina ?? 1)) || 1));
    const buscar = str(ctx.query.buscar).trim().slice(0, 80);
    let ruta = `media?per_page=24&page=${pagina}&media_type=image`;
    if (buscar) ruta += "&search=" + encodeURIComponent(buscar);
    const items = await wp(ruta);
    if (!Array.isArray(items)) fail("No se pudo consultar la biblioteca de WordPress.", 502);
    return {
      pagina,
      items: items.map((m: Doc) => ({
        id: m.id ?? null, titulo: sinEtiquetas(m.title?.rendered), alt: str(m.alt_text), url: str(m.source_url),
        miniatura: str(m.media_details?.sizes?.thumbnail?.source_url ?? m.source_url), ancho: m.media_details?.width ?? null,
        alto: m.media_details?.height ?? null, fecha: str(m.date),
      })),
    };
  },
  async contenido(ctx) {
    const seccion = str(ctx.query.seccion);
    if (!SECCIONES.includes(seccion)) fail("Seccion no valida.", 422);
    if (seccion === "noticias" && wpBase()) {
      const posts = await wp("posts?per_page=20&_embed=1");
      if (Array.isArray(posts) && posts.length) {
        return {
          seccion, origen: "wordpress",
          items: posts.map((p: Doc) => ({
            id: str(p.id), slug: str(p.slug), titulo: sinEtiquetas(p.title?.rendered), resumen: sinEtiquetas(p.excerpt?.rendered).trim(),
            cuerpo: str(p.content?.rendered), fecha: str(p.date).slice(0, 10), imagen: str(p._embedded?.["wp:featuredmedia"]?.[0]?.source_url), origen: "wordpress",
          })),
        };
      }
    }
    return { seccion, origen: "local", items: await listar("contenido-" + seccion) };
  },
};

export const cms: Modulo = { acciones, porDefecto: "estado", noValida: { mensaje: "Accion no valida. Use estado|medios|contenido.", codigo: 400 } };
