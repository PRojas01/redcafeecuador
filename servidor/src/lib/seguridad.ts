// Protección de origen (CSRF) y límite de intentos.
import fs from "node:fs";
import path from "node:path";
import { conBloqueo } from "./docs.js";
import { db } from "./db.js";
import { config, esProduccion } from "./config.js";
import { fail, type Ctx } from "./http.js";
import { sha256 } from "./util.js";

/**
 * rc_proteger_origen() de PHP: desde otro sitio solo se permiten lecturas.
 * Los enlaces firmados de los correos llevan su propio token.
 */
const EXENTAS = new Set(["baja_correo", "admin_reset_password", "ver_apelacion"]);
const LECTURA = /^(list|get|all|me|publicos|stats|actividad|actual|precios?|clave|estado|contador|mine|mis_[a-z_]+|mios|mias|catalogo|ficha|messages|rooms|contacts|matriculas|matriculados|progreso|exportar|mi_estado|resumen|ofertas|postulaciones|solicitudes|categorias|redes|admin_me|cosecha|texto|published)$/;

export function protegerOrigen(ctx: Ctx, accion: string, host: string) {
  if (EXENTAS.has(accion)) return;
  const sitio = ctx.cabecera("sec-fetch-site").toLowerCase();
  let cruzado = ["cross-site", "same-site"].includes(sitio);
  const origen = ctx.cabecera("origin");
  // Sec-Fetch-Site lo pone el navegador y ninguna página lo puede falsificar:
  // si dice same-origin, basta (detrás de un proxy, Host puede no coincidir con Origin).
  if (sitio !== "same-origin" && origen && origen !== "null") {
    try {
      const u = new URL(origen);
      if (u.host.toLowerCase() !== host.toLowerCase()) cruzado = true;
    } catch {
      cruzado = true;
    }
  }
  if (!cruzado) return;
  if (ctx.metodo === "GET" && LECTURA.test(accion)) return;
  fail("Petición bloqueada: viene de otro sitio.", 403);
}

/**
 * check_rate_limit($accion, $max, $ventana): ventana deslizante por IP.
 * Devuelve false si se superó el cupo. En la base de datos y no en archivos.
 */
export async function cupo(ctx: Ctx, accion: string, max = 10, ventanaSeg = 60): Promise<boolean> {
  await reinicioDePrueba();
  const clave = accion + ":" + sha256("ip|" + ctx.ip).slice(0, 24);
  const desde = new Date(Date.now() - ventanaSeg * 1000);
  return conBloqueo("cupo:" + clave, async (tx) => {
    const usados = await tx.intento.count({ where: { clave, ts: { gt: desde } } });
    if (usados >= max) return false;
    await tx.intento.create({ data: { clave } });
    return true;
  });
}

/**
 * Solo fuera de producción: la suite qa/ reinicia los cupos borrando
 * <sitio>/data/.rate, como con el PHP. Si la carpeta no existe, se vacían los
 * intentos y se vuelve a crear la marca.
 */
async function reinicioDePrueba() {
  if (esProduccion()) return;
  const marca = path.join(config.sitio, "data", ".rate");
  if (fs.existsSync(marca)) return;
  await db.intento.deleteMany({});
  fs.mkdirSync(marca, { recursive: true });
}

/** Limpieza de intentos viejos (más de 1 día). */
export async function purgarIntentos() {
  await db.intento.deleteMany({ where: { ts: { lt: new Date(Date.now() - 86400_000) } } });
}
