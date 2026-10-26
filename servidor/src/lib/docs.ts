// Colecciones de documentos en PostgreSQL: reemplazo transaccional de
// load_json()/save_json()/mutate_json() de PHP. Mismo formato de datos.
//
// Diferencia clave: mutar() corre dentro de una transacción con un bloqueo
// consultivo por colección (pg_advisory_xact_lock). Dos peticiones a la vez
// se ordenan en lugar de pisarse — la pérdida de altas del sistema PHP (7 de
// 10 registros simultáneos) no puede ocurrir aquí.
import { db, Prisma, type Tx } from "./db.js";
import { ErrorApi } from "./http.js";

export type Doc = Record<string, any>;

/** Campo que identifica cada documento de la colección. */
const CLAVES: Record<string, string> = {
  pedidos: "nro",
  cotizaciones: "nro",
  ordenes: "nro",
  inventario: "owner_id",
};
/** Colecciones que en PHP eran un objeto (mapa) y no una lista. */
const MAPAS = new Set(["notas-admin", "recordatorios-lote", "recordatorios-config", "visual-publicado", "visual-borrador", "metricas"]);

const claveDe = (col: string) => CLAVES[col] ?? "id";

function idDe(col: string, d: Doc, i: number): string {
  const v = d?.[claveDe(col)];
  if (v !== undefined && v !== null && String(v) !== "") return String(v);
  // Sin clave: una huella estable del contenido (raro; datos antiguos).
  return "~" + i + "-" + Buffer.from(JSON.stringify(d)).toString("base64url").slice(0, 40);
}

async function bloquear(tx: Tx, col: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"col:" + col}))`;
}

/** load_json(): la colección completa, en orden de inserción. */
export async function listar(col: string, cliente: Tx | typeof db = db): Promise<Doc[]> {
  if (MAPAS.has(col)) throw new Error(`${col} es un mapa: usa mapa()`);
  const filas = await cliente.documento.findMany({ where: { coleccion: col }, orderBy: { orden: "asc" }, select: { datos: true } });
  return filas.map((f) => f.datos as Doc);
}

/** Colecciones-mapa (notas-admin…): un único documento «_». */
export async function mapa(col: string, cliente: Tx | typeof db = db): Promise<Doc> {
  const f = await cliente.documento.findUnique({ where: { coleccion_id: { coleccion: col, id: "_" } } });
  return (f?.datos as Doc) ?? {};
}

export async function obtener(col: string, id: string | number): Promise<Doc | null> {
  const f = await db.documento.findUnique({ where: { coleccion_id: { coleccion: col, id: String(id) } } });
  return (f?.datos as Doc) ?? null;
}

/**
 * mutate_json(): lee, aplica fn y guarda solo lo que cambió, todo dentro de
 * una transacción con la colección bloqueada. Si fn lanza un ErrorApi (un
 * fail() de PHP dentro del callback), no se guarda nada.
 */
export async function mutar(col: string, fn: (items: Doc[], tx: Tx) => Doc[] | Promise<Doc[]>): Promise<Doc[]> {
  return db.$transaction(async (tx) => {
    await bloquear(tx, col);
    const filas = await tx.documento.findMany({ where: { coleccion: col }, orderBy: { orden: "asc" } });
    const antes = new Map<string, string>();
    const items = filas.map((f) => {
      antes.set(f.id, JSON.stringify(f.datos));
      return structuredClone(f.datos as Doc);
    });
    const nuevos = await fn(items, tx);
    await guardarDiferencias(tx, col, antes, nuevos);
    return nuevos;
  }, { timeout: 20_000, maxWait: 20_000 });
}

/** Igual que mutar() para colecciones-mapa. */
export async function mutarMapa(col: string, fn: (m: Doc, tx: Tx) => Doc | Promise<Doc>): Promise<Doc> {
  return db.$transaction(async (tx) => {
    await bloquear(tx, col);
    const actual = await mapa(col, tx);
    const nuevo = await fn(structuredClone(actual), tx);
    await tx.documento.upsert({
      where: { coleccion_id: { coleccion: col, id: "_" } },
      create: { coleccion: col, id: "_", datos: nuevo },
      update: { datos: nuevo },
    });
    return nuevo;
  });
}

async function guardarDiferencias(tx: Tx, col: string, antes: Map<string, string>, nuevos: Doc[]) {
  const vistos = new Set<string>();
  let i = 0;
  for (const d of nuevos) {
    const id = idDe(col, d, i++);
    if (vistos.has(id)) throw new ErrorApi(`Identificador repetido en ${col}: ${id}`, 500);
    vistos.add(id);
    const json = JSON.stringify(d);
    const previo = antes.get(id);
    if (previo === undefined) {
      await tx.documento.create({ data: { coleccion: col, id, datos: d } });
    } else if (previo !== json) {
      await tx.documento.update({ where: { coleccion_id: { coleccion: col, id } }, data: { datos: d } });
    }
  }
  const borrar = [...antes.keys()].filter((id) => !vistos.has(id));
  if (borrar.length) await tx.documento.deleteMany({ where: { coleccion: col, id: { in: borrar } } });
}

/** Añadir un documento sin releer la colección (avisos, bitácora). */
export async function agregar(col: string, d: Doc, tx: Tx | typeof db = db) {
  const id = idDe(col, d, Date.now());
  await tx.documento.create({ data: { coleccion: col, id, datos: d } });
}

/** Consulta por un campo del documento (datos->>campo = valor). */
export async function buscarPor(col: string, campo: string, valor: string): Promise<Doc[]> {
  const filas = await db.$queryRaw<{ datos: Doc }[]>(
    Prisma.sql`SELECT datos FROM "Documento" WHERE coleccion = ${col} AND datos->>${campo} = ${valor} ORDER BY orden ASC`,
  );
  return filas.map((f) => f.datos);
}

/** Operación sobre una colección con bloqueo, para quien necesita SQL propio. */
export async function conBloqueo<T>(col: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await bloquear(tx, col);
    return fn(tx);
  });
}
