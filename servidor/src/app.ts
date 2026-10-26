// Aplicación HTTP: sitio estático + /api/*.php con el contrato de PHP.
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import fs from "node:fs";
import path from "node:path";
import { config, esProduccion } from "./lib/config.js";
import { Cruda, ErrorApi, leerEntrada, type Ctx, type Modulo } from "./lib/http.js";
import { EstadoSesion, COOKIE_SESION } from "./lib/sesion.js";
import { protegerOrigen } from "./lib/seguridad.js";
import { cabecerasSeguridad, servirEstatico } from "./lib/estatico.js";
import { modulos } from "./modulos/index.js";
import { RUTA_PREACUERDO, paginaPreacuerdo } from "./modulos/socios.js";

type Vars = { ip: string };

export function crearApp(opciones: { ipDe?: (c: any) => string } = {}) {
  const app = new Hono<{ Variables: Vars }>();

  app.use("*", async (c, next) => {
    // Un solo dominio y HTTPS en producción (las reglas 301 del .htaccess).
    if (esProduccion()) {
      const host = c.req.header("host") ?? "";
      const proto = c.req.header("x-forwarded-proto") ?? "https";
      if (/^www\.redcafeecuador\.com$/i.test(host) || proto !== "https") {
        const u = new URL(c.req.url);
        return c.redirect(`https://redcafeecuador.com${u.pathname}${u.search}`, 301);
      }
    }
    await next();
  });

  // /enviar-waitlist.php en la raíz era un alias de la API real.
  app.all("/enviar-waitlist.php", (c) => c.redirect("/api/enviar-waitlist.php", 307));

  app.all("/api/:archivo{[A-Za-z0-9_.-]+\\.php}", async (c) => {
    const archivo = c.req.param("archivo").replace(/\.php$/, "");
    const https = esProduccion();
    const h = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    cabecerasSeguridad(h, https);
    h.set("X-Frame-Options", "DENY");
    if (https) h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    if (archivo.startsWith("_")) return new Response("Not Found", { status: 404 });
    if (!process.env.DATABASE_URL) {
      return new Response(JSON.stringify({ ok: false, error: "Servicio en mantenimiento: falta configurar la base de datos (DATABASE_URL)." }), { status: 503, headers: h });
    }

    const modulo: Modulo | undefined = modulos[archivo];
    const url = new URL(c.req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const { in: entrada, archivos } = await leerEntrada(c.req.raw, query);
    const ses = await EstadoSesion.cargar(getCookie(c, COOKIE_SESION));
    const ctx: Ctx = {
      metodo: c.req.method,
      ruta: url.pathname,
      query,
      in: entrada,
      archivos,
      cabecera: (n) => c.req.header(n) ?? "",
      ip: opciones.ipDe ? opciones.ipDe(c) : ipDe(c),
      ses,
      cache: new Map(),
    };

    let cuerpo: BodyInit;
    let estado = 200;
    try {
      const accion = query.action ?? (typeof entrada.action === "string" ? entrada.action : "") ?? "";
      protegerOrigen(ctx, accion, c.req.header("host") ?? url.host);
      if (!modulo) {
        estado = 501;
        cuerpo = JSON.stringify({ ok: false, error: "Este servicio aún no está disponible en la nueva plataforma." });
      } else {
        const nombre = accion || modulo.porDefecto || "";
        if (modulo.guardia) await modulo.guardia(ctx, nombre);
        const fn = modulo.acciones[nombre];
        if (!fn) throw new ErrorApi(modulo.noValida?.mensaje ?? "Acción no válida.", modulo.noValida?.codigo ?? 400);
        const res = await fn(ctx);
        if (res instanceof Cruda) {
          for (const [k, v] of Object.entries(res.cabeceras)) h.set(k, v);
          h.set("Content-Type", res.tipo);
          estado = res.codigo;
          cuerpo = res.cuerpo as BodyInit;
        } else {
          cuerpo = JSON.stringify({ ok: true, data: res ?? null });
        }
      }
    } catch (e) {
      if (e instanceof ErrorApi) {
        estado = e.codigo;
        cuerpo = JSON.stringify({ ok: false, error: e.mensaje, ...e.extra });
      } else {
        console.error(`[api] ${archivo}.php`, e);
        estado = 500;
        cuerpo = JSON.stringify({ ok: false, error: "Error interno." });
      }
    }
    const setCookie = await ses.guardar().catch((e) => {
      console.error("[sesion]", e);
      return null;
    });
    if (setCookie) h.append("Set-Cookie", setCookie);
    return new Response(cuerpo, { status: estado, headers: h });
  });

  // Preacuerdo estratégico: el contenido solo sale si la sesión tiene un
  // registro aceptado (la puerta que antes hacía su index.php).
  app.get(RUTA_PREACUERDO, async (c) => {
    const ses = await EstadoSesion.cargar(getCookie(c, COOKIE_SESION));
    const r = await paginaPreacuerdo(ses);
    cabecerasSeguridad(r.headers, esProduccion());
    return r;
  });

  // Páginas PHP sueltas que aún no se migran.
  app.get("*", (c) => {
    const ruta = new URL(c.req.url).pathname;
    const phpIndex = path.join(config.sitio, ruta, "index.php");
    if (ruta.endsWith("/") && fs.existsSync(phpIndex) && !fs.existsSync(path.join(config.sitio, ruta, "index.html"))) {
      return new Response("Página aún no disponible en la nueva plataforma.", { status: 501 });
    }
    return servirEstatico(ruta, esProduccion());
  });

  return app;
}

/** IP del cliente. Detrás de un proxy de confianza se usa la ÚLTIMA entrada de
 *  X-Forwarded-For (la que añade el proxy), nunca la primera: esa la escribe
 *  el cliente y se puede falsificar para saltarse los límites de intentos. */
function ipDe(c: any): string {
  const socket = c.env?.incoming?.socket?.remoteAddress ?? "";
  if (process.env.REDCAFE_PROXY_CONFIABLE === "1") {
    const xff = (c.req.header("x-forwarded-for") ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
    if (xff.length) return xff[xff.length - 1];
  }
  return socket;
}
