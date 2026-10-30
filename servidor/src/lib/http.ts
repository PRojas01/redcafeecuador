// Contrato HTTP idéntico al de api/_bootstrap.php:
//   éxito  → 200 {"ok":true,"data":...}
//   fallo  → <código> {"ok":false,"error":"...", ...extra}
// El frontend (React y la capa propia) y la suite qa/ dependen de esta forma.
import type { EstadoSesion } from "./sesion.js";

export class ErrorApi extends Error {
  constructor(
    public mensaje: string,
    public codigo = 400,
    public extra: Record<string, unknown> = {},
  ) {
    super(mensaje);
  }
}

/** fail() de PHP: corta la petición con un error JSON. */
export function fail(mensaje: string, codigo = 400, extra: Record<string, unknown> = {}): never {
  throw new ErrorApi(mensaje, codigo, extra);
}

/** Respuesta que no es JSON (HTML, CSV, descarga). */
export class Cruda {
  constructor(
    public cuerpo: string | Uint8Array,
    public tipo: string,
    public codigo = 200,
    public cabeceras: Record<string, string> = {},
  ) {}
}

export type Entrada = Record<string, unknown>;

export interface Ctx {
  metodo: string;
  ruta: string;
  query: Record<string, string>;
  /** input() de PHP: el cuerpo JSON, o los campos de formulario + query. */
  in: Entrada;
  /** Archivos subidos (multipart). */
  archivos: Record<string, File>;
  cabecera(nombre: string): string;
  ip: string;
  ses: EstadoSesion;
  /** Caché por petición (usuario actual, sanciones…). */
  cache: Map<string, unknown>;
}

export type Accion = (ctx: Ctx) => Promise<unknown>;
export type Modulo = {
  acciones: Record<string, Accion>;
  /** Mensaje cuando la acción no existe (cada archivo PHP tenía el suyo). */
  noValida?: { mensaje: string; codigo: number };
  /** Acción por defecto si no viene ?action= (media.php usa «list»). */
  porDefecto?: string;
  /** Comprobación previa a todas las acciones (p. ej. «solo administración»),
   *  incluso a las que no existen: así responde 403 antes que 400, como PHP. */
  guardia?: (ctx: Ctx, accion: string) => Promise<void> | void;
};

export const LIMITE_CUERPO = 12 * 1024 * 1024;

/** Limita los bytes antes de usar los analizadores JSON o multipart. */
export async function limitarCuerpo(req: Request): Promise<Request> {
  const longitud = Number(req.headers.get("content-length"));
  if (longitud > LIMITE_CUERPO) fail("El cuerpo de la petición supera el límite de 12 MB.", 413);
  if (!req.body) return req;
  const lector = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.byteLength;
      if (total > LIMITE_CUERPO) { await lector.cancel(); fail("El cuerpo de la petición supera el límite de 12 MB.", 413); }
      partes.push(value);
    }
  } finally { lector.releaseLock(); }
  return new Request(req.url, { method: req.method, headers: req.headers, body: new Blob(partes as BlobPart[]) });
}

/** Lee el cuerpo como lo hacía input() en PHP. */
export async function leerEntrada(req: Request, query: Record<string, string>): Promise<{ in: Entrada; archivos: Record<string, File> }> {
  const archivos: Record<string, File> = {};
  if (req.method === "GET" || req.method === "HEAD") return { in: { ...query }, archivos };
  const tipo = (req.headers.get("content-type") ?? "").toLowerCase();
  if (tipo.includes("multipart/form-data") || tipo.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData().catch(() => null);
    const campos: Entrada = { ...query };
    if (form) {
      for (const [k, v] of form.entries()) {
        if (typeof v === "string") asignarCampo(campos, k, v);
        else archivos[k] = v as File;
      }
    }
    return { in: campos, archivos };
  }
  const crudo = await req.text().catch(() => "");
  if (crudo !== "") {
    try {
      const j = JSON.parse(crudo);
      if (j && typeof j === "object") return { in: j as Entrada, archivos };
    } catch {
      /* como en PHP: si no es JSON se usan query y formulario */
    }
  }
  return { in: { ...query }, archivos };
}

/** Campos de formulario estilo PHP: «ids[]=a&ids[]=b» → ids: ["a","b"]. */
function asignarCampo(obj: Entrada, clave: string, valor: string) {
  if (clave.endsWith("[]")) {
    const k = clave.slice(0, -2);
    const arr = Array.isArray(obj[k]) ? (obj[k] as unknown[]) : [];
    arr.push(valor);
    obj[k] = arr;
  } else obj[clave] = valor;
}
