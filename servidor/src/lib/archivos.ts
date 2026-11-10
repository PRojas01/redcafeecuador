// Fotos y documentos de /uploads/ guardados también en la base.
//
// En GoDaddy Node.js Hosting la carpeta de la app se reemplaza en cada
// despliegue: sin REDCAFE_UPLOADS las fotos subidas desaparecían (los lotes
// caían todos a la misma imagen por defecto). Ahora cada archivo se escribe en
// el disco Y en la tabla Archivo; si al pedirlo ya no está en el disco, se
// recupera de la base y se vuelve a escribir.
import fs from "node:fs";
import path from "node:path";
import { db } from "./db.js";
import { config } from "./config.js";

const NOMBRE = /^(?:[A-Za-z0-9._-]+\/)?[A-Za-z0-9._-]+\.(?:jpe?g|png|webp|pdf)$/i;
const hayBase = () => !!process.env.DATABASE_URL;

/** Ruta relativa a la carpeta de subidas («user-content/x.jpg»), o null. */
export function claveDe(archivo: string): string | null {
  const rel = path.relative(config.uploads, archivo).split(path.sep).join("/");
  return NOMBRE.test(rel) && !rel.includes("..") ? rel : null;
}

/** Escribe en el disco y guarda la copia en la base. */
export async function guardarSubida(archivo: string, datos: Buffer): Promise<void> {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, datos, { mode: 0o644 });
  const nombre = claveDe(archivo);
  if (!nombre || !hayBase()) return;
  try {
    const bytes = new Uint8Array(datos);
    await db.archivo.upsert({ where: { nombre }, create: { nombre, datos: bytes }, update: { datos: bytes } });
  } catch (e) {
    console.error("[archivos] No se pudo copiar a la base:", nombre, (e as Error)?.message ?? e);
  }
}

/** Borra del disco y de la base. true si estaba en alguno de los dos. */
export async function borrarSubida(archivo: string): Promise<boolean> {
  let habia = false;
  try { if (fs.existsSync(archivo)) { fs.rmSync(archivo, { force: true }); habia = true; } } catch { /* ya no estaba */ }
  const nombre = claveDe(archivo);
  if (nombre && hayBase()) {
    try { habia = (await db.archivo.deleteMany({ where: { nombre } })).count > 0 || habia; } catch { /* base caída */ }
  }
  return habia;
}

/** Nombres guardados en la base dentro de una subcarpeta («user-content»). */
export async function nombresEnBase(carpeta: string): Promise<string[]> {
  if (!hayBase()) return [];
  try {
    const filas = await db.archivo.findMany({ where: { nombre: { startsWith: carpeta + "/" } }, select: { nombre: true } });
    return filas.map((f) => f.nombre.slice(carpeta.length + 1));
  } catch { return []; }
}

// Lo que no existe tampoco en la base no se vuelve a consultar en 10 min.
const ausentes = new Map<string, number>();

/** Si /uploads/<ruta> falta en el disco, lo trae de la base. */
export async function restaurarSubida(ruta: string): Promise<void> {
  if (!/^\/uploads\//.test(ruta) || !hayBase()) return;
  const archivo = path.normalize(path.join(config.uploads, ruta.slice("/uploads".length)));
  const nombre = claveDe(archivo);
  if (!nombre || fs.existsSync(archivo)) return;
  const t = ausentes.get(nombre);
  if (t && Date.now() - t < 600_000) return;
  try {
    const fila = await db.archivo.findUnique({ where: { nombre } });
    if (!fila) {
      if (ausentes.size > 5000) ausentes.clear();
      ausentes.set(nombre, Date.now());
      return;
    }
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    fs.writeFileSync(archivo, Buffer.from(fila.datos), { mode: 0o644 });
  } catch (e) {
    console.error("[archivos] No se pudo restaurar:", nombre, (e as Error)?.message ?? e);
  }
}

/** Al arrancar: copia a la base lo que hay en el disco y aún no está en ella. */
export async function respaldarSubidasEnBase(): Promise<number> {
  if (!hayBase() || !fs.existsSync(config.uploads)) return 0;
  const enDisco: string[] = [];
  const recorrer = (dir: string, prof: number) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && prof < 1) recorrer(p, prof + 1);
      else if (e.isFile() && claveDe(p)) enDisco.push(p);
    }
  };
  recorrer(config.uploads, 0);
  if (!enDisco.length) return 0;
  const ya = new Set((await db.archivo.findMany({ select: { nombre: true } })).map((f) => f.nombre));
  let n = 0;
  for (const p of enDisco) {
    const nombre = claveDe(p)!;
    if (ya.has(nombre)) continue;
    await db.archivo.create({ data: { nombre, datos: fs.readFileSync(p) } });
    n++;
  }
  return n;
}
