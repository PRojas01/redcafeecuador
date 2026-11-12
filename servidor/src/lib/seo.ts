// Datos estructurados (schema.org) y metadatos por página, añadidos al servir
// el HTML. Buscadores y asistentes de IA leen el JSON-LD sin ejecutar JavaScript.
//
// Solo se reescribe el contenido del <script type="application/ld+json"> que ya
// trae el HTML (React no compara un dangerouslySetInnerHTML al hidratar) y, en
// las fichas de lotes, textos que aparecen idénticos en el HTML y en el payload
// de Next. No se añaden etiquetas nuevas: eso rompe la hidratación (#418).
import type { Doc } from "./docs.js";
import { datosJson } from "./json.js";
import { num, str } from "./util.js";

const BASE = "https://redcafeecuador.com";
const ORG = `${BASE}/#organizacion`;
const WEB = `${BASE}/#sitio`;
const SOLUCIONESPRO = "https://solucionespro.net/#organizacion";
const MARCA = " · Red Café Ecuador";

type Receta = { titulo: string; resumen: string; metodo: string; minutos: number; porciones: number; ingredientes: string[]; pasos: string[] };
type Noticia = { titulo: string; fecha: string; resumen: string; fuente: string; fuente_url: string; categoria: string };
let contenido: { recetas: Record<string, Receta>; noticias: Record<string, Noticia> } | null = null;
function datos() {
  if (!contenido) {
    try { contenido = datosJson("seo-contenido.json"); } catch { contenido = { recetas: {}, noticias: {} }; }
  }
  return contenido!;
}

const SECCIONES: Record<string, string> = {
  marketplace: "Marketplace", academia: "Academia", recetas: "Recetas", noticias: "Noticias", servicios: "Servicios",
  bar: "Bar y cafeterías", comunidad: "Comunidad",
};

const entidades = (t: string) =>
  t.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Metadatos de la cabecera del HTML (solo la parte de <head>). */
export function leerMeta(html: string) {
  const fin = html.indexOf("</head>");
  const head = fin > 0 ? html.slice(0, fin) : html.slice(0, 40000);
  const m = (re: RegExp) => entidades(re.exec(head)?.[1] ?? "");
  return {
    titulo: m(/<title>([^<]*)<\/title>/),
    descripcion: m(/<meta name="description" content="([^"]*)"/),
    canonical: m(/<link rel="canonical" href="([^"]*)"/),
    imagen: m(/<meta property="og:image" content="([^"]*)"/) || `${BASE}/img/og-redcafe.jpg`,
    robots: m(/<meta name="robots" content="([^"]*)"/),
  };
}

const nombreCorto = (titulo: string) =>
  titulo.replace(MARCA, "").replace(/ — (curso|receta de café)$/, "").replace(/^Red Café Ecuador \| /, "").trim();

function organizacion() {
  return {
    "@type": "Organization",
    "@id": ORG,
    name: "Red Café Ecuador",
    alternateName: ["RedCafe Ecuador", "Red Cafe Ecuador"],
    url: `${BASE}/`,
    logo: { "@type": "ImageObject", url: `${BASE}/icon-512.png`, width: 512, height: 512 },
    image: `${BASE}/img/og-redcafe.jpg`,
    description:
      "Plataforma digital que conecta la cadena de valor del café ecuatoriano: productores, compradores, tostadores, comerciantes, cafeterías y amantes del café. Marketplace de lotes, servicios, precios del café, cursos gratis y comunidad.",
    areaServed: { "@type": "Country", name: "Ecuador" },
    knowsAbout: [
      "café ecuatoriano", "café de especialidad", "compra y venta de café", "precio del café", "postcosecha",
      "trazabilidad y EUDR", "tueste de café", "barismo",
    ],
    sameAs: ["https://www.facebook.com/RedCafeEcuador", "https://www.instagram.com/redcafeecuador/"],
    founder: {
      "@type": "Person",
      "@id": `${BASE}/quienes-somos/#pedro-rojas`,
      name: "Pedro Rojas",
      jobTitle: "Fundador",
      url: `${BASE}/quienes-somos/`,
      sameAs: ["https://www.linkedin.com/in/pedro-antonio-rojas/"],
      worksFor: { "@id": SOLUCIONESPRO },
    },
    parentOrganization: { "@type": "Organization", "@id": SOLUCIONESPRO, name: "SolucionesPro", url: "https://solucionespro.net/" },
  };
}

function sitio() {
  return { "@type": "WebSite", "@id": WEB, url: `${BASE}/`, name: "Red Café Ecuador", inLanguage: "es-EC", publisher: { "@id": ORG } };
}

function migas(ruta: string, nombre: string) {
  const partes = ruta.split("/").filter(Boolean);
  if (partes.length === 0) return null;
  const items = [{ name: "Inicio", item: `${BASE}/` }];
  let acum = "";
  partes.forEach((p, i) => {
    acum += `/${p}`;
    const ultimo = i === partes.length - 1;
    items.push({ name: ultimo ? nombre : SECCIONES[p] ?? p, item: `${BASE}${acum}/` });
  });
  return {
    "@type": "BreadcrumbList",
    "@id": `${BASE}${acum}/#migas`,
    itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: x.item })),
  };
}

function receta(slug: string, url: string, imagen: string) {
  const r = datos().recetas[slug];
  if (!r) return null;
  return {
    "@type": "Recipe",
    "@id": `${url}#receta`,
    name: r.titulo,
    description: r.resumen,
    image: [imagen],
    author: { "@id": ORG },
    recipeCategory: "Bebida",
    recipeCuisine: "Café",
    keywords: `café, ${r.metodo}, café ecuatoriano, receta de café`,
    totalTime: r.minutos ? `PT${Math.round(r.minutos)}M` : undefined,
    recipeYield: r.porciones ? `${r.porciones} ${r.porciones === 1 ? "taza" : "tazas"}` : undefined,
    recipeIngredient: r.ingredientes,
    recipeInstructions: r.pasos.map((t, i) => ({ "@type": "HowToStep", position: i + 1, text: t })),
    inLanguage: "es-EC",
  };
}

function articulo(slug: string, url: string, meta: ReturnType<typeof leerMeta>) {
  const n = datos().noticias[slug];
  if (!n) return null;
  return {
    "@type": "Article",
    "@id": `${url}#articulo`,
    headline: n.titulo,
    description: n.resumen || meta.descripcion,
    image: [meta.imagen],
    datePublished: n.fecha || undefined,
    dateModified: n.fecha || undefined,
    articleSection: n.categoria || undefined,
    author: { "@id": ORG },
    publisher: { "@id": ORG },
    isBasedOn: n.fuente_url || undefined,
    mainEntityOfPage: url,
    inLanguage: "es-EC",
  };
}

function curso(url: string, meta: ReturnType<typeof leerMeta>, html: string) {
  const gratis = html.includes(">Gratis<");
  const horas = /·\s*(\d+(?:[.,]\d+)?)\s*horas?</.exec(html)?.[1];
  return {
    "@type": "Course",
    "@id": `${url}#curso`,
    name: nombreCorto(meta.titulo),
    description: meta.descripcion,
    provider: { "@id": ORG },
    inLanguage: "es-EC",
    url,
    isAccessibleForFree: gratis || undefined,
    offers: gratis ? { "@type": "Offer", category: "Free", price: 0, priceCurrency: "USD" } : undefined,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseWorkload: horas ? `PT${horas.replace(",", ".")}H` : undefined,
    },
  };
}

/* ── Lotes publicados por miembros ─────────────────────────────────── */

/** Texto seguro para repetirlo dentro del HTML y del payload de Next. */
const limpio = (v: unknown, max: number) => {
  const t = str(v).replace(/["\\<>&\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : t;
};
const dinero = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ¿Este lote puede aparecer en buscadores? Solo los públicos de miembros. */
export function loteIndexable(l: Doc | null | undefined): l is Doc {
  return !!l && !l.oculto && !l.demo && !l.ejemplo && str(l.visibilidad || "publico") === "publico";
}

export function textosLote(l: Doc) {
  const terminado = str(l.categoria) === "terminado";
  const variedad = limpio(l.variedad, 60) || "Café";
  const provincia = limpio(l.provincia, 50);
  const proceso = limpio(l.proceso, 40);
  const finca = limpio(terminado ? l.marca || l.finca : l.finca, 60);
  const nombre = terminado
    ? `${finca || variedad}: café tostado${provincia ? ` de ${provincia}` : ""}`
    : `${variedad}${provincia ? ` de ${provincia}` : ""}${proceso ? `, ${proceso.toLowerCase()}` : ""}`;
  const precio = terminado || num(l.precioUnidad) > 0 ? num(l.precioUnidad) : num(l.precioSaco);
  const unidad = terminado ? "la unidad" : num(l.precioUnidad) > 0 ? "la unidad" : "el saco";
  const datos = [
    finca && !terminado ? `Finca ${finca}` : "",
    num(l.altura) > 0 ? `${Math.round(num(l.altura))} m s. n. m.` : "",
    num(l.score) > 0 ? `${Math.round(num(l.score))} puntos SCA` : "",
    precio > 0 ? `$${dinero(precio)} ${unidad}` : "",
  ].filter(Boolean).join(" · ");
  const desc = limpio(l.descripcion, 400);
  let descripcion = `${nombre}, Ecuador. ${datos ? datos + ". " : ""}${desc}`.trim();
  if (descripcion.length > 158) descripcion = limpio(descripcion, 158);
  return { titulo: `${nombre} — café en venta${MARCA}`, descripcion, nombre, precio };
}

function producto(l: Doc, url: string) {
  const t = textosLote(l);
  const disp = str(l.disponibilidad).toLowerCase();
  const imagenes = (Array.isArray(l.imagenes) ? l.imagenes : [])
    .filter((u: unknown) => typeof u === "string" && /^\/uploads\/user-content\/[A-Za-z0-9._-]+\.jpg$/.test(u))
    .slice(0, 6)
    .map((u: string) => BASE + u);
  const prop = (name: string, value: unknown) => (str(value).trim() ? { "@type": "PropertyValue", name, value: limpio(value, 80) } : null);
  return {
    "@type": "Product",
    "@id": `${url}#producto`,
    name: t.nombre,
    description: limpio(l.descripcion, 400) || t.descripcion,
    image: imagenes.length ? imagenes : [`${BASE}/img/og-redcafe.jpg`],
    category: str(l.categoria) === "terminado" ? "Café tostado" : "Café verde",
    countryOfOrigin: { "@type": "Country", name: "Ecuador" },
    additionalProperty: [
      prop("Variedad", l.variedad), prop("Proceso", l.proceso), prop("Provincia", l.provincia),
      num(l.altura) > 0 ? prop("Altura (m s. n. m.)", Math.round(num(l.altura))) : null,
      num(l.score) > 0 ? prop("Puntaje SCA", Math.round(num(l.score))) : null,
      prop("Certificación", l.certificacion),
    ].filter(Boolean),
    offers: t.precio > 0 ? {
      "@type": "Offer",
      url,
      price: t.precio.toFixed(2),
      priceCurrency: "USD",
      availability: disp === "agotado" ? "https://schema.org/OutOfStock" : disp === "reservado" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
      areaServed: { "@type": "Country", name: "Ecuador" },
    } : undefined,
  };
}

/* ── Página completa ───────────────────────────────────────────────── */

export interface OpcionesSeo {
  /** Para /marketplace/<id>/ servida con la ficha genérica: el lote (o null si no es indexable). */
  lote?: Doc | null;
}

export function grafo(ruta: string, html: string, op: OpcionesSeo = {}) {
  const meta = leerMeta(html);
  const url = meta.canonical || `${BASE}${ruta.endsWith("/") ? ruta : ruta + "/"}`;
  const nodos: unknown[] = [organizacion(), sitio()];
  const partes = ruta.split("/").filter(Boolean);
  let nombre = nombreCorto(meta.titulo) || "Red Café Ecuador";
  let principal: Record<string, unknown> | null = null;

  if (op.lote) {
    const t = textosLote(op.lote);
    nombre = t.nombre;
    principal = producto(op.lote, url);
  } else if (partes[0] === "recetas" && partes.length === 2) {
    principal = receta(partes[1], url, meta.imagen);
  } else if (partes[0] === "noticias" && partes.length === 2) {
    principal = articulo(partes[1], url, meta);
  } else if (partes[0] === "academia" && partes.length === 2 && partes[1] !== "curso" && nombreCorto(meta.titulo) !== "Curso") {
    principal = curso(url, meta, html);
  }
  const m = migas(ruta, nombre);
  nodos.push({
    "@type": partes.length === 0 ? "WebPage" : partes.length === 1 ? "CollectionPage" : "WebPage",
    "@id": `${url}#pagina`,
    url,
    name: op.lote ? textosLote(op.lote).titulo.replace(MARCA, "") : meta.titulo.replace(MARCA, ""),
    description: op.lote ? textosLote(op.lote).descripcion : meta.descripcion,
    isPartOf: { "@id": WEB },
    about: { "@id": ORG },
    inLanguage: "es-EC",
    primaryImageOfPage: meta.imagen,
    breadcrumb: m ? { "@id": m["@id"] } : undefined,
    mainEntity: principal ? { "@id": principal["@id"] } : undefined,
  });
  if (m) nodos.push(m);
  if (principal) nodos.push(principal);
  return { "@context": "https://schema.org", "@graph": nodos };
}

const LD = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;

/** Reescribe el HTML de una página pública: JSON-LD completo y, en lotes, sus textos. */
export function seoPagina(ruta: string, html: string, op: OpcionesSeo = {}): string {
  if (!LD.test(html)) return html;
  const meta = leerMeta(html);
  if (/noindex/.test(meta.robots) && !("lote" in op)) return html;
  let out = html;
  if ("lote" in op) {
    if (op.lote) {
      const t = textosLote(op.lote);
      const viejo = leerMeta(html);
      if (viejo.titulo) out = out.split(viejo.titulo).join(t.titulo);
      if (viejo.descripcion) out = out.split(viejo.descripcion).join(t.descripcion);
    } else {
      // Dirección de un lote que no existe, está oculto o es solo para registrados.
      out = noIndexar(out);
      return out;
    }
  }
  const json = JSON.stringify(grafo(ruta, html, op)).replace(/</g, "\\u003c");
  return out.replace(LD, () => `<script type="application/ld+json">${json}</script>`);
}

/** Pone «noindex, follow» en el HTML y en el payload (mismo texto en ambos). */
export function noIndexar(html: string): string {
  return html
    .replace(/<meta name="robots" content="[^"]*"\/>/, '<meta name="robots" content="noindex, follow"/>')
    .replace(/(\\"name\\":\\"robots\\",\\"content\\":\\")[^\\]*(\\")/, "$1noindex, follow$2");
}
