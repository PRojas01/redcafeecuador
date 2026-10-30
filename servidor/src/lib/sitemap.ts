// /sitemap.xml generado al pedirlo: las páginas públicas del sitio y los lotes
// reales publicados por miembros (los de ejemplo no se indexan). Antes era un
// archivo fijo con 37 páginas, los lotes de ejemplo y /login/, que robots.txt
// excluye.
import { config } from "./config.js";
import { lotesTodos, esDemo } from "../modulos/lotes.js";
import { str } from "./util.js";
import type { Doc } from "./docs.js";

const PUBLICAS = [
  "/",
  "/quienes-somos/",
  "/marketplace/",
  "/servicios/",
  "/servicios/precios/",
  "/servicios/eudr/",
  "/servicios/calculadora/",
  "/servicios/finanzas/",
  "/servicios/factura/",
  "/asesoria/",
  "/afiliate/",
  "/comunidad/",
  "/academia/",
  "/academia/buenas-practicas/",
  "/academia/cafe-especial/",
  "/academia/exportacion/",
  "/academia/formalizacion/",
  "/academia/manejo-plagas/",
  "/academia/postcosecha/",
  "/academia/trazabilidad/",
  "/academia/tueste/",
  "/academia/ventas-comercial/",
  "/recetas/",
  "/recetas/aeropress/",
  "/recetas/cold-brew/",
  "/recetas/espresso-casero/",
  "/recetas/moka-italiana/",
  "/recetas/prensa-francesa/",
  "/recetas/v60/",
  "/noticias/",
  "/noticias/barismo-cafeterias-red/",
  "/noticias/cafe-especialidad-asia/",
  "/noticias/calendario-cafe-ecuador-2026/",
  "/noticias/como-fijar-precio-cafe/",
  "/noticias/ecuador-reactiva-caficultura/",
  "/noticias/postcosecha-errores/",
  "/noticias/trazabilidad-requisito-europa/",
  "/bar/",
  "/barista/",
  "/laboratorio/",
  "/legal/",
  "/terminos-y-condiciones/",
  "/politica-de-privacidad/",
  "/politica-de-cookies/",
  "/politica-de-uso-de-datos/",
  "/propiedad-y-uso/",
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fecha(v: unknown): string {
  const t = Date.parse(str(v));
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : "";
}

export async function sitemapXml(): Promise<string> {
  const base = config.dominio.replace(/\/+$/, "");
  const urls: Array<{ loc: string; mod?: string }> = PUBLICAS.map((p) => ({ loc: base + p }));
  if (process.env.DATABASE_URL) {
    try {
      const lotes = (await lotesTodos()).filter(
        (l: Doc) => !esDemo(l) && str(l.visibilidad || "publico") === "publico" && /^[A-Za-z0-9_-]+$/.test(str(l.id)),
      );
      for (const l of lotes) urls.push({ loc: `${base}/marketplace/${str(l.id)}/`, mod: fecha(l.updated_at || l.created_at) });
    } catch {
      /* sin base: solo las páginas fijas */
    }
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.mod ? `<lastmod>${u.mod}</lastmod>` : ""}</url>`).join("\n") +
    "\n</urlset>\n"
  );
}
