// Importación de los datos reales del sistema PHP desde la administración.
//
// El administrador prepara en su equipo, con herramientas/procesar-respaldo.html,
// un paquete CIFRADO (AES-256-GCM, clave derivada de su contraseña con
// PBKDF2-SHA256) y lo sube aquí junto con la contraseña. El paquete se descifra
// en memoria: los datos personales no se escriben en el disco del servidor
// en ningún momento; van directos a la base, donde las cédulas quedan cifradas
// y las contraseñas siguen siendo hashes bcrypt. Solo las fotos se guardan, en
// la carpeta de subidas (REDCAFE_UPLOADS).
//
// Defensas:
//  · Apagada por defecto: solo existe si REDCAFE_IMPORTACION=1 en el panel.
//  · Solo con la sesión de administración (contraseña de admin).
//  · Primero «simular» (no escribe nada) y luego «aplicar».
//  · Cupo de intentos: una contraseña de paquete errónea cuenta como intento.
//  · Se registra quién y cuándo, nunca el contenido.
import fs from "node:fs";
import path from "node:path";
import { createDecipheriv, pbkdf2 } from "node:crypto";
import { promisify } from "node:util";
import { gunzipSync } from "node:zlib";
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { db } from "../lib/db.js";
import { cupo } from "../lib/seguridad.js";
import { registrarActividad } from "../lib/avisos.js";
import { config } from "../lib/config.js";
import { str } from "../lib/util.js";
import { importar, type Fuente } from "../legacy/importador.js";

const derivar = promisify(pbkdf2);

/** Cabecera del paquete: «RCPK1» + 1 byte de versión. */
export const MAGIA = Buffer.from("RCPK1\n", "utf8");
export const ITERACIONES = 600_000;
const MAX_BYTES = 150 * 1024 * 1024;
const EXT_SUBIDAS = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(jpe?g|png|webp|gif|pdf)$/i;

type Paquete = { formato: string; generado?: string; archivos: Record<string, string> };

/** Descifra el paquete. Falla con 422 si la contraseña no es la correcta o el archivo está dañado. */
export async function abrirPaquete(bytes: Buffer, clave: string): Promise<Paquete> {
  if (bytes.length < MAGIA.length + 16 + 12 + 16 || !bytes.subarray(0, MAGIA.length).equals(MAGIA)) fail("Ese archivo no es un paquete de Red Café (.rcpaquete).", 422);
  const sal = bytes.subarray(MAGIA.length, MAGIA.length + 16);
  const iv = bytes.subarray(MAGIA.length + 16, MAGIA.length + 28);
  const resto = bytes.subarray(MAGIA.length + 28);
  const cifrado = resto.subarray(0, resto.length - 16);
  const etiqueta = resto.subarray(resto.length - 16);
  const llave = await derivar(clave, sal, ITERACIONES, 32, "sha256");
  let plano: Buffer;
  try {
    const d = createDecipheriv("aes-256-gcm", llave, iv);
    d.setAuthTag(etiqueta);
    plano = Buffer.concat([d.update(cifrado), d.final()]);
  } catch {
    fail("Contraseña del paquete incorrecta, o el archivo está dañado.", 422);
  }
  let j: Paquete;
  try {
    j = JSON.parse(gunzipSync(plano).toString("utf8"));
  } catch {
    fail("El paquete está dañado.", 422);
  }
  if (j?.formato !== "redcafe-paquete/1" || !j.archivos || typeof j.archivos !== "object") fail("Formato de paquete desconocido.", 422);
  return j;
}

/** Separa el paquete en los datos (para el importador) y las fotos (para la carpeta de subidas). */
export function separar(p: Paquete): { fuente: Fuente; subidas: Map<string, Buffer> } {
  const fuente: Fuente = new Map();
  const subidas = new Map<string, Buffer>();
  for (const [ruta, b64] of Object.entries(p.archivos)) {
    if (typeof b64 !== "string") continue;
    if (ruta.startsWith("data/")) {
      const rel = ruta.slice(5);
      // Solo lo que el importador entiende: data/x, data/paginas/x.
      if (/^[^/]+$/.test(rel) || /^paginas\/[^/]+$/.test(rel)) fuente.set(rel, Buffer.from(b64, "base64"));
    } else if (ruta.startsWith("uploads/user-content/")) {
      const nombre = ruta.slice("uploads/user-content/".length);
      if (EXT_SUBIDAS.test(nombre)) subidas.set(nombre, Buffer.from(b64, "base64"));
    } else if (ruta === ".redcafe_admin_pass") {
      fuente.set(ruta, Buffer.from(b64, "base64"));
    }
  }
  return { fuente, subidas };
}

function guardarSubidas(subidas: Map<string, Buffer>, aplicar: boolean) {
  const dir = path.join(config.uploads, "user-content");
  let nuevas = 0, ya = 0;
  if (aplicar) fs.mkdirSync(dir, { recursive: true });
  for (const [nombre, datos] of subidas) {
    const destino = path.join(dir, path.basename(nombre));
    if (fs.existsSync(destino)) { ya++; continue; }
    nuevas++;
    if (aplicar) fs.writeFileSync(destino, datos, { mode: 0o644 });
  }
  return { archivo: "uploads/", destino: "carpeta de subidas", filas: nuevas, accion: `${nuevas} nuevas · ${ya} ya estaban` };
}

async function ejecutar(ctx: Ctx, aplicar: boolean) {
  if (ctx.metodo !== "POST") fail("Usa POST.", 405);
  if (!(await cupo(ctx, "importacion", 10, 3600))) fail("Demasiados intentos. Espera una hora.", 429);
  const archivo = ctx.archivos.paquete;
  const clave = str(ctx.in.clave);
  if (!archivo) fail("Falta el paquete.", 422);
  if (archivo.size > MAX_BYTES) fail("El paquete supera 150 MB.", 413);
  if (clave.length < 12) fail("Falta la contraseña del paquete.", 422);
  const paquete = await abrirPaquete(Buffer.from(await archivo.arrayBuffer()), clave);
  const { fuente, subidas } = separar(paquete);
  const r = await importar(fuente, { aplicar });
  r.informe.push(guardarSubidas(subidas, aplicar));
  await registrarActividad(ctx, "importacion", {
    detalle: (aplicar ? "Importación aplicada" : "Simulación de importación") + ` (paquete del ${str(paquete.generado).slice(0, 10) || "?"})`,
    objeto_tipo: "importacion",
  });
  return { ...r, generado: paquete.generado ?? null };
}

export const importacion: Modulo = {
  guardia(ctx) {
    if (process.env.REDCAFE_IMPORTACION !== "1") fail("La importación está desactivada.", 404);
    if (!ctx.ses.d.admin) fail("Solo administradores.", 403);
  },
  acciones: {
    async estado() {
      const [usuarios, documentos, registros] = await Promise.all([db.usuario.count(), db.documento.count(), db.registroImportacion.count()]);
      return { activa: true, usuarios, documentos, ya_importado: registros > 0 };
    },
    simular: (ctx) => ejecutar(ctx, false),
    aplicar: (ctx) => ejecutar(ctx, true),
  },
};
