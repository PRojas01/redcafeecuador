// Utilidades equivalentes a las de api/_bootstrap.php.
import { randomBytes, createHash } from "node:crypto";

/** Igual que uid() de PHP: 12 caracteres hex. */
export const uid = (): string => randomBytes(6).toString("hex");

/** Igual que now_iso() de PHP: gmdate('c') → 2026-10-26T14:07:45+00:00 */
export function nowIso(d: Date = new Date()): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}
export const today = (): string => new Date().toISOString().slice(0, 10);

export const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

/** Texto que llega del navegador: escalar, sin caracteres de control y con tope. */
export function textoEntrada(valor: unknown, max: number, multilinea = false): string {
  if (valor === null || valor === undefined || typeof valor === "object") return "";
  let v = String(valor);
  v = multilinea
    ? v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    : v.replace(/[\x00-\x1F\x7F]/g, " ");
  return [...v.trim()].slice(0, max).join("");
}

/** Lo que PHP hace con trim((string)$x) para un valor cualquiera. */
export function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "1" : "";
  if (typeof v === "object") return "";
  return String(v);
}
export const strTrim = (v: unknown): string => str(v).trim();

/** floatval() de PHP: número inicial de la cadena, o 0. */
export function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  const m = /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/.exec(str(v));
  return m ? Number(m[0]) : 0;
}
export const int = (v: unknown): number => Math.trunc(num(v));
/** is_numeric() de PHP. */
export const esNumerico = (v: unknown): boolean =>
  typeof v === "number" ? Number.isFinite(v) : /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(str(v)) && str(v).trim() !== "";
/** !empty() de PHP. */
export function lleno(v: unknown): boolean {
  if (v === null || v === undefined || v === false || v === 0 || v === "" || v === "0") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}
/** filter_var(FILTER_VALIDATE_BOOLEAN). */
export function bool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  return ["1", "true", "on", "yes"].includes(str(v).toLowerCase().trim());
}
/** mb_strlen */
export const largo = (s: string): number => [...s].length;
export const cortar = (s: string, max: number): string => [...s].slice(0, max).join("");

export function emailValido(e: string): boolean {
  // Aproximación razonable a FILTER_VALIDATE_EMAIL.
  return e.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(e)
    && !e.includes("..");
}

/** Número de WhatsApp como lo muestra el PHP: +593... */
export function whatsappDisplay(raw: unknown): string {
  const phone = str(raw).trim();
  if (!phone) return "";
  let d = phone.replace(/\D+/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 10) d = "593" + d.slice(1);
  if (!d.startsWith("593") && d.length === 9) d = "593" + d;
  return "+" + d;
}
export const whatsappDigitos = (raw: unknown): string => whatsappDisplay(raw).replace(/\D+/g, "");

/** El mayor «nro» existente + 1 (nunca count()+1). */
export function siguienteNro(lista: Array<Record<string, unknown>>, campo = "nro"): number {
  let max = 0;
  for (const x of lista) max = Math.max(max, int(x?.[campo]));
  return max + 1;
}

/** Enlace interno seguro (sin dominios ajenos). */
export function enlaceInterno(enlace: string, max = 200): string {
  const e = enlace.trim();
  if (!e || e[0] !== "/" || e.startsWith("//") || e.includes("..")) return "";
  return cortar(e, max);
}

export const fechaMs = (s: unknown): number => {
  const t = Date.parse(str(s));
  return Number.isFinite(t) ? t : 0;
};
