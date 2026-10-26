// Arranque del servidor Red Café Ecuador.
import { serve } from "@hono/node-server";
import { crearApp } from "./app.js";
import { config } from "./lib/config.js";
import { purgarSesiones } from "./lib/sesion.js";
import { purgarIntentos } from "./lib/seguridad.js";

const app = crearApp();

serve({ fetch: app.fetch, port: config.puerto, hostname: process.env.HOST ?? "127.0.0.1" }, (info) => {
  console.log(`Red Café Ecuador · servidor en http://${info.address}:${info.port} · sitio ${config.sitio} · entorno ${config.entorno}`);
});

// Limpieza cada hora (sesiones caducadas e intentos viejos).
setInterval(() => {
  purgarSesiones().catch(() => {});
  purgarIntentos().catch(() => {});
}, 3600_000).unref();
