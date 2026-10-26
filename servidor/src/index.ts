// Arranque del servidor Red Café Ecuador.
import { serve } from "@hono/node-server";
import { crearApp } from "./app.js";
import { config } from "./lib/config.js";
import { purgarSesiones } from "./lib/sesion.js";
import { purgarIntentos } from "./lib/seguridad.js";
import { programarPrecios } from "./modulos/precios.js";
import { programarRespaldos } from "./modulos/respaldo.js";

const app = crearApp();

serve({ fetch: app.fetch, port: config.puerto, hostname: process.env.HOST ?? "127.0.0.1" }, (info) => {
  console.log(`Red Café Ecuador · servidor en http://${info.address}:${info.port} · sitio ${config.sitio} · entorno ${config.entorno}`);
});

// Limpieza cada hora (sesiones caducadas e intentos viejos).
setInterval(() => {
  purgarSesiones().catch(() => {});
  purgarIntentos().catch(() => {});
}, 3600_000).unref();

// Precio del café: se refresca solo cada 6 h (fuera de pruebas).
if (process.env.REDCAFE_ENTORNO !== "prueba") {
  programarPrecios();
  programarRespaldos();
}
