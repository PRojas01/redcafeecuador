// Sirve el sitio exportado con las mismas reglas del .htaccess de producción.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { config } from "./config.js";

const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".mp4": "video/mp4",
  ".webm": "video/webm", ".pdf": "application/pdf", ".xml": "application/xml", ".webmanifest": "application/manifest+json",
};

/** Cabeceras de seguridad comunes (las del .htaccess). */
export function cabecerasSeguridad(h: Headers, https: boolean) {
  if (https) h.set("Strict-Transport-Security", "max-age=31536000");
  h.set("X-Frame-Options", "SAMEORIGIN");
  h.set("Content-Security-Policy", "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; upgrade-insecure-requests");
  h.set("Permissions-Policy", "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

/** ¿La ruta está prohibida? Devuelve el código (403/404) o 0. */
export function prohibida(ruta: string): number {
  if (/^\/(Respaldo|_respaldos|context|actualizacion)(\/|$)/.test(ruta)) return 404;
  if (/\.(md|toml|zlib)$/i.test(ruta)) return 404;
  if (/^\/api\/_[^/]*\.php/.test(ruta)) return 404;
  if (/^\/data(\/|$)/.test(ruta) || /^\/api\/api\//.test(ruta)) return 403;
  if (/(^|\/)\./.test(ruta)) return 403;
  if (/\.(log|bak|tmp|old|zip|sql|sha256)$/i.test(ruta) || /(^|\/)error_log$/i.test(ruta)) return 403;
  // Contenido del preacuerdo sin puerta (lo bloqueaba su .htaccess).
  if (/^\/socios\/redcafe-preacuerdo-estrategico-2026-a7f3c9\/index\.(html|txt)$/.test(ruta)) return 403;
  // Nunca se sirve código del servidor como archivo.
  if (/\.(php|phtml|phar|cgi|pl|py|sh)$/i.test(ruta)) return 404;
  return 0;
}

function resolver(ruta: string): string | null {
  // /uploads/ puede vivir fuera del sitio (REDCAFE_UPLOADS): un volumen persistente.
  const enUploads = /^\/uploads\//.test(ruta);
  const raiz = enUploads ? config.uploads : config.sitio;
  const destino = path.normalize(path.join(raiz, enUploads ? ruta.slice("/uploads".length) : ruta));
  if (destino !== raiz && !destino.startsWith(raiz + path.sep)) return null;
  if (enUploads && !/\.(jpe?g|png|webp|pdf)$/i.test(destino)) return null;
  try {
    const st = fs.statSync(destino);
    if (st.isFile()) return destino;
    if (st.isDirectory()) {
      const idx = path.join(destino, "index.html");
      if (fs.existsSync(idx)) return idx;
    }
  } catch {
    /* no existe */
  }
  // Lotes y cursos creados después del build no tienen carpeta propia.
  if (/^\/marketplace\/[^/]+\/?$/.test(ruta)) {
    // La ficha genérica lee el id de la dirección; si el build aún no la trae, el listado.
    const ficha = path.join(raiz, "marketplace/ficha/index.html");
    return fs.existsSync(ficha) ? ficha : path.join(raiz, "marketplace/index.html");
  }
  if (/^\/academia\/[^/]+\/?$/.test(ruta)) {
    // El visor genérico lee el id de la dirección; si el build aún no lo trae, la Academia.
    const visor = path.join(raiz, "academia/curso/index.html");
    return fs.existsSync(visor) ? visor : path.join(raiz, "academia/index.html");
  }
  // Navegación interna de Next a uno de esos cursos: el payload del visor genérico.
  if (/^\/academia\/[^/]+\/index\.txt$/.test(ruta)) {
    const txt = path.join(raiz, "academia/curso/index.txt");
    if (fs.existsSync(txt)) return txt;
  }
  return null;
}

/** Datos de la petición que cambian la respuesta (todos opcionales). */
export interface PeticionEstatica {
  /** «?v=…»: el archivo lleva versión y se puede guardar un año. */
  consulta?: string;
  aceptaCodificacion?: string;
  siNoCoincide?: string;
  rango?: string;
  metodo?: string;
}

// Texto que vale la pena comprimir (el CSS pasa de 343 KB a ~60 KB).
const COMPRIMIBLES = new Set([".html", ".txt", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".webmanifest", ".ico"]);
const RANGO = new Set([".mp4", ".webm", ".pdf"]);
// Archivos ya leídos (y comprimidos) por ruta; se renuevan si cambian fecha o tamaño.
type Entrada = { firma: string; crudo: Buffer; br?: Buffer; gz?: Buffer };
const cache = new Map<string, Entrada>();
let bytesCache = 0;
const LIMITE_CACHE = 64 * 1024 * 1024;
const MAX_ARCHIVO_CACHE = 4 * 1024 * 1024;

function leer(archivo: string, st: fs.Stats): Entrada {
  const firma = `${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}`;
  const previa = cache.get(archivo);
  if (previa && previa.firma === firma) return previa;
  const e: Entrada = { firma, crudo: fs.readFileSync(archivo) };
  if (st.size <= MAX_ARCHIVO_CACHE) {
    if (previa) bytesCache -= tam(previa);
    if (bytesCache + st.size > LIMITE_CACHE) { cache.clear(); bytesCache = 0; }
    cache.set(archivo, e);
    bytesCache += st.size;
  }
  return e;
}
const tam = (e: Entrada) => e.crudo.length + (e.br?.length ?? 0) + (e.gz?.length ?? 0);

function comprimida(e: Entrada, acepta: string): { cuerpo: Buffer; codificacion: string } | null {
  if (e.crudo.length < 1024) return null;
  const a = acepta.toLowerCase();
  if (/\bbr\b/.test(a)) {
    if (!e.br) { e.br = zlib.brotliCompressSync(e.crudo, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: e.crudo.length } }); bytesCache += e.br.length; }
    return { cuerpo: e.br, codificacion: "br" };
  }
  if (/\bgzip\b/.test(a)) {
    if (!e.gz) { e.gz = zlib.gzipSync(e.crudo, { level: 9 }); bytesCache += e.gz.length; }
    return { cuerpo: e.gz, codificacion: "gzip" };
  }
  return null;
}

/** Cuánto puede guardar el navegador cada archivo. */
function politicaCache(ruta: string, archivo: string, ext: string, versionada: boolean): string {
  // HTML y datos: siempre se revalidan (con ETag responden 304 sin reenviar nada).
  // sw.js no lleva ?v=: si se guardara, el navegador seguiría con la versión vieja.
  if ([".html", ".json", ".txt", ".webmanifest", ".xml"].includes(ext) || path.basename(archivo) === "sw.js") return "no-cache";
  // Nombres con huella (Next) o con ?v=: no cambian nunca.
  if (/^\/_next\/static\//.test(ruta) || ((ext === ".js" || ext === ".css") && versionada)) return "public, max-age=31536000, immutable";
  // JS/CSS sin versión (p. ej. admin-visual-runtime.js): un rato y luego revalidar.
  if (ext === ".js" || ext === ".css" || ext === ".mjs") return "public, max-age=3600, must-revalidate";
  if (ext === ".woff2" || ext === ".woff") return "public, max-age=31536000";
  // Fotos, iconos y videos: una semana; el ETag evita reenviarlos si no cambiaron.
  return "public, max-age=604800";
}

export function servirEstatico(ruta: string, https: boolean, pet: PeticionEstatica = {}): Response {
  const h = new Headers();
  cabecerasSeguridad(h, https);
  try { ruta = rutaCanonica(ruta); }
  catch { return new Response("Ruta inválida.", { status: 400, headers: h }); }
  const bloqueo = prohibida(ruta);
  if (bloqueo) return new Response(bloqueo === 403 ? "Forbidden" : "Not Found", { status: bloqueo, headers: h });
  let archivo = resolver(ruta);
  let estado = 200;
  if (!archivo) {
    estado = 404;
    const p404 = [path.join(config.sitio, "404.html"), path.join(config.sitio, "404/index.html")].find((p) => fs.existsSync(p));
    if (!p404) return new Response("Not Found", { status: 404, headers: h });
    archivo = p404;
  }
  const ext = path.extname(archivo).toLowerCase();
  h.set("Content-Type", TIPOS[ext] ?? "application/octet-stream");
  const enUploads = archivo.startsWith(config.uploads + path.sep);
  if (enUploads) {
    h.set("Content-Disposition", "inline");
    h.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  }
  let st: fs.Stats;
  try { st = fs.statSync(archivo); } catch { return new Response("Not Found", { status: 404, headers: h }); }
  const soloCabeceras = pet.metodo === "HEAD";

  if (estado === 200) {
    h.set("Cache-Control", politicaCache(ruta, archivo, ext, /(^|[?&])v=/.test(pet.consulta ?? "")));
    // Archivos grandes (videos, PDF): por trozos, como pide Safari en iPhone para reproducir video.
    if (RANGO.has(ext) || st.size > MAX_ARCHIVO_CACHE) {
      h.set("Accept-Ranges", "bytes");
      const etag = `W/"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
      h.set("ETag", etag);
      if (pet.siNoCoincide && pet.siNoCoincide.split(",").map((s) => s.trim()).includes(etag)) return new Response(null, { status: 304, headers: h });
      const r = /^bytes=(\d*)-(\d*)$/.exec((pet.rango ?? "").trim());
      if (r && (r[1] || r[2])) {
        const ini = r[1] ? Number(r[1]) : Math.max(0, st.size - Number(r[2]));
        const fin = r[1] && r[2] ? Math.min(Number(r[2]), st.size - 1) : st.size - 1;
        if (ini >= st.size || ini > fin) {
          h.set("Content-Range", `bytes */${st.size}`);
          return new Response(null, { status: 416, headers: h });
        }
        h.set("Content-Range", `bytes ${ini}-${fin}/${st.size}`);
        h.set("Content-Length", String(fin - ini + 1));
        return new Response(soloCabeceras ? null : leerTrozo(archivo, ini, fin), { status: 206, headers: h });
      }
      h.set("Content-Length", String(st.size));
      return new Response(soloCabeceras ? null : new Uint8Array(fs.readFileSync(archivo)), { status: 200, headers: h });
    }
  } else {
    h.set("Cache-Control", "no-cache");
  }

  let e = leer(archivo, st);
  // Lotes y cursos sin carpeta propia usan una plantilla: su canonical debe
  // ser su propia dirección, no la de la plantilla.
  const plantilla = estado === 200 && ext === ".html" ? canonicalDePlantilla(ruta, archivo) : null;
  if (plantilla) {
    const texto = e.crudo.toString("utf8").split(plantilla.de).join(plantilla.a);
    e = { firma: e.firma + "-" + sha1(ruta), crudo: Buffer.from(texto, "utf8") };
  }
  const etag = `W/"${e.firma}"`;
  if (estado === 200) {
    h.set("ETag", etag);
    if (pet.siNoCoincide && pet.siNoCoincide.split(",").map((s) => s.trim()).includes(etag)) return new Response(null, { status: 304, headers: h });
  }
  let cuerpo: Buffer = e.crudo;
  if (COMPRIMIBLES.has(ext)) {
    h.set("Vary", "Accept-Encoding");
    const c = comprimida(e, pet.aceptaCodificacion ?? "");
    if (c) { cuerpo = c.cuerpo; h.set("Content-Encoding", c.codificacion); }
  }
  h.set("Content-Length", String(cuerpo.length));
  return new Response(soloCabeceras ? null : new Uint8Array(cuerpo), { status: estado, headers: h });
}

const PLANTILLAS: Array<[RegExp, string]> = [
  [/^\/marketplace\/([A-Za-z0-9_-]+)\/?$/, "marketplace/ficha/index.html"],
  [/^\/academia\/([A-Za-z0-9_-]+)\/?$/, "academia/curso/index.html"],
];
function canonicalDePlantilla(ruta: string, archivo: string): { de: string; a: string } | null {
  for (const [re, plant] of PLANTILLAS) {
    const m = re.exec(ruta);
    if (!m || archivo !== path.join(config.sitio, plant)) continue;
    const base = "/" + path.posix.dirname(plant) + "/";
    const propio = base.replace(/[^/]+\/$/, m[1] + "/");
    if (propio === base) return null;
    return { de: `https://redcafeecuador.com${base}`, a: `https://redcafeecuador.com${propio}` };
  }
  return null;
}
const sha1 = (t: string) => createHash("sha1").update(t).digest("hex").slice(0, 10);

function leerTrozo(archivo: string, ini: number, fin: number): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(fin - ini + 1);
  const fd = fs.openSync(archivo, "r");
  try { fs.readSync(fd, buf, 0, buf.length, ini); } finally { fs.closeSync(fd); }
  return buf;
}

/** Una sola decodificación antes de comprobar o resolver archivos. */
export function rutaCanonica(ruta: string): string {
  const decodificada = decodeURIComponent(ruta);
  if (/%[0-9a-f]{2}/i.test(decodificada) || decodificada.includes("\\") || decodificada.includes("\0")) throw new Error("Ruta inválida.");
  if (decodificada.split("/").includes("..")) throw new Error("Ruta inválida.");
  return path.posix.normalize(decodificada);
}
