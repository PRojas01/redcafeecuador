// Validadores compartidos (req_texto, req_enum, req_numero... de PHP).
import { fail } from "./http.js";
import { esNumerico, largo, num, str, today } from "./util.js";

export function texto(v: unknown, campo: string, min: number, max: number, opcional = false): string {
  const s = str(v).trim();
  if (s === "" && opcional) return "";
  const n = largo(s);
  if (n < min || n > max) fail(`${campo} debe tener entre ${min} y ${max} caracteres.`, 422);
  return s;
}

export function enumerado(v: unknown, campo: string, permitidos: string[]): string {
  const s = str(v).trim();
  if (!permitidos.includes(s)) fail(`${campo} inválido.`, 422);
  return s;
}

export function numero(v: unknown, campo: string, max: number | null = null): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (!esNumerico(v)) fail(`${campo} debe ser numérico.`, 422);
  const n = num(v);
  if (n < 0) fail(`${campo} no puede ser negativo.`, 422);
  if (max !== null && n > max) fail(`${campo} es demasiado alto.`, 422);
  return Math.round(n * 100) / 100;
}

export function siNo(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (esNumerico(v)) return Math.trunc(num(v)) === 1;
  return ["1", "true", "on", "si", "sí"].includes(str(v).trim().toLowerCase());
}

/** Fecha de cierre: vacía → hoy + 60 días; nunca vencida ni a más de un año. */
export function fechaCierre(v: unknown, corto = false): string {
  // busco-empleo.php usaba mensajes más cortos («Fecha inválida.»).
  const m = corto
    ? ["Fecha inválida.", "La fecha no puede estar vencida.", "La fecha no puede superar un año."]
    : ["Fecha de cierre inválida.", "La fecha de cierre no puede estar vencida.", "La fecha de cierre no puede superar un año."];
  const s = str(v).trim();
  const hoy = new Date(today() + "T00:00:00Z");
  if (!s) return new Date(hoy.getTime() + 60 * 86400_000).toISOString().slice(0, 10);
  const d = new Date(s + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) fail(m[0], 422);
  if (d < hoy) fail(m[1], 422);
  const unAnio = new Date(hoy); unAnio.setUTCFullYear(unAnio.getUTCFullYear() + 1);
  if (d > unAnio) fail(m[2], 422);
  return s;
}

export const vencido = (r: Record<string, unknown>) => { const c = str(r.cierra); return c !== "" && c < today(); };

export function imagenes(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const u of raw) {
    if (typeof u !== "string") continue;
    const url = u.trim();
    if (!/^\/uploads\/user-content\/[A-Za-z0-9._-]+\.jpg$/.test(url) || out.includes(url)) continue;
    out.push(url);
    if (out.length >= max) break;
  }
  return out;
}
