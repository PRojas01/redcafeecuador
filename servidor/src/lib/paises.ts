// País del miembro y documento de identidad. Ecuador es el país por defecto:
// los miembros que se registraron antes no tienen país y se tratan como Ecuador.

/** Códigos ISO 3166-1 alfa-2 que acepta el registro (misma lista que el formulario). */
export const PAISES = new Set([
  "EC", "CO", "PE", "BO", "BR", "VE", "CL", "AR", "UY", "PY", "PA", "CR", "NI", "HN", "SV", "GT", "MX", "CU", "DO", "PR",
  "HT", "JM", "BZ", "GY", "SR", "US", "CA", "ES", "PT", "FR", "IT", "DE", "NL", "BE", "CH", "AT", "GB", "IE", "SE", "NO",
  "DK", "FI", "PL", "CZ", "GR", "RU", "TR", "IL", "AE", "SA", "ET", "KE", "UG", "TZ", "RW", "CN", "JP", "KR", "TW", "VN",
  "ID", "IN", "TH", "PH", "AU", "NZ", "ZA",
]);

export const PAIS_DEFECTO = "EC";

/** Devuelve el código del país o «» si no es válido. Vacío se toma como Ecuador. */
export function paisValido(v: unknown): string {
  const p = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (!p) return PAIS_DEFECTO;
  return PAISES.has(p) ? p : "";
}

/** Cédula ecuatoriana: 10 dígitos, provincia 01-24 o 30, tercer dígito < 6 y dígito verificador (módulo 10). */
export function cedulaEcuatorianaValida(c: string): boolean {
  if (!/^\d{10}$/.test(c)) return false;
  const prov = Number(c.slice(0, 2));
  if (!((prov >= 1 && prov <= 24) || prov === 30)) return false;
  if (Number(c[2]) >= 6) return false;
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(c[i]) * (i % 2 === 0 ? 2 : 1);
    if (n > 9) n -= 9;
    suma += n;
  }
  return (10 - (suma % 10)) % 10 === Number(c[9]);
}

/**
 * RUC ecuatoriano: 13 dígitos que terminan en establecimiento 001 o mayor.
 * Persona natural: los 10 primeros son su cédula. Sociedades (tercer dígito 6 o 9):
 * solo se comprueba la provincia, porque su verificador cambia según el tipo.
 */
export function rucEcuatorianoValido(r: string): boolean {
  if (!/^\d{13}$/.test(r) || r.endsWith("000")) return false;
  const tercero = Number(r[2]);
  if (tercero < 6) return cedulaEcuatorianaValida(r.slice(0, 10));
  if (tercero !== 6 && tercero !== 9) return false;
  const prov = Number(r.slice(0, 2));
  return (prov >= 1 && prov <= 24) || prov === 30;
}

/**
 * Valida el documento según el país. En Ecuador: cédula (10) o RUC (13), se
 * ignoran guiones y espacios. Fuera de Ecuador: documento libre (letras, números,
 * guiones, puntos y espacios). Devuelve el documento normalizado o null si no vale.
 */
export function documentoValido(doc: string, pais: string): string | null {
  if (!doc) return "";
  if (pais === "EC") {
    const d = doc.replace(/[\s-]/g, "");
    return cedulaEcuatorianaValida(d) || rucEcuatorianoValido(d) ? d : null;
  }
  return /^[0-9A-Za-z][0-9A-Za-z.\-\s]{3,19}$/.test(doc) ? doc : null;
}
