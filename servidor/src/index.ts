// Arranque del servidor Red Café Ecuador.
import "./entorno.js";
import { serve } from "@hono/node-server";
import { crearApp } from "./app.js";
import { config } from "./lib/config.js";
import { purgarSesiones } from "./lib/sesion.js";
import { purgarIntentos } from "./lib/seguridad.js";
import { programarPrecios } from "./modulos/precios.js";
import { programarRespaldos } from "./modulos/respaldo.js";
import { programarSalud } from "./lib/salud.js";

const app = crearApp();

for (const v of ["DATABASE_URL", "REDCAFE_CLAVE_DATOS"]) {
  if (!process.env[v]) console.warn(`[config] Falta ${v}: el sitio se sirve, pero la API responderá 503 hasta configurarla (ver servidor/DESPLIEGUE.md).`);
}

serve({ fetch: app.fetch, port: config.puerto, // Si la plataforma fija PORT (GoDaddy, Render…), hay que escuchar en todas las interfaces.
  hostname: process.env.HOST ?? (process.env.PORT ? "0.0.0.0" : "127.0.0.1") }, (info) => {
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
  programarSalud();
}
