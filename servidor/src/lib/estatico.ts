// Sirve el sitio exportado con las mismas reglas del .htaccess de producción.
import fs from "node:fs";
import path from "node:path";
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
  const raiz = config.sitio;
  const destino = path.normalize(path.join(raiz, decodeURIComponent(ruta)));
  if (!destino.startsWith(raiz)) return null;
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
  if (/^\/marketplace\/[^/]+\/?$/.test(ruta)) return path.join(raiz, "marketplace/index.html");
  if (/^\/academia\/[^/]+\/?$/.test(ruta)) return path.join(raiz, "academia/index.html");
  return null;
}

export function servirEstatico(ruta: string, https: boolean): Response {
  const h = new Headers();
  cabecerasSeguridad(h, https);
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
  if ([".html", ".json", ".txt"].includes(ext)) h.set("Cache-Control", "no-store, no-cache, must-revalidate");
  else if ([".js", ".css"].includes(ext)) h.set("Cache-Control", "public, max-age=31536000, immutable");
  if (archivo.includes(path.sep + "uploads" + path.sep)) h.set("Content-Disposition", "inline");
  return new Response(fs.readFileSync(archivo), { status: estado, headers: h });
}
