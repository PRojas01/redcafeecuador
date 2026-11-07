// Países del registro (misma lista que servidor/src/lib/paises.ts) con su prefijo telefónico.
// Ecuador va primero porque es el país por defecto; luego productores y compradores de café.
export type Pais = { c: string; n: string; t: string };

export const PAISES: Pais[] = [
  { c: "EC", n: "Ecuador", t: "593" },
  { c: "CO", n: "Colombia", t: "57" },
  { c: "PE", n: "Perú", t: "51" },
  { c: "BO", n: "Bolivia", t: "591" },
  { c: "BR", n: "Brasil", t: "55" },
  { c: "VE", n: "Venezuela", t: "58" },
  { c: "CL", n: "Chile", t: "56" },
  { c: "AR", n: "Argentina", t: "54" },
  { c: "UY", n: "Uruguay", t: "598" },
  { c: "PY", n: "Paraguay", t: "595" },
  { c: "PA", n: "Panamá", t: "507" },
  { c: "CR", n: "Costa Rica", t: "506" },
  { c: "NI", n: "Nicaragua", t: "505" },
  { c: "HN", n: "Honduras", t: "504" },
  { c: "SV", n: "El Salvador", t: "503" },
  { c: "GT", n: "Guatemala", t: "502" },
  { c: "MX", n: "México", t: "52" },
  { c: "CU", n: "Cuba", t: "53" },
  { c: "DO", n: "República Dominicana", t: "1" },
  { c: "PR", n: "Puerto Rico", t: "1" },
  { c: "HT", n: "Haití", t: "509" },
  { c: "JM", n: "Jamaica", t: "1" },
  { c: "BZ", n: "Belice", t: "501" },
  { c: "GY", n: "Guyana", t: "592" },
  { c: "SR", n: "Surinam", t: "597" },
  { c: "US", n: "Estados Unidos", t: "1" },
  { c: "CA", n: "Canadá", t: "1" },
  { c: "ES", n: "España", t: "34" },
  { c: "PT", n: "Portugal", t: "351" },
  { c: "FR", n: "Francia", t: "33" },
  { c: "IT", n: "Italia", t: "39" },
  { c: "DE", n: "Alemania", t: "49" },
  { c: "NL", n: "Países Bajos", t: "31" },
  { c: "BE", n: "Bélgica", t: "32" },
  { c: "CH", n: "Suiza", t: "41" },
  { c: "AT", n: "Austria", t: "43" },
  { c: "GB", n: "Reino Unido", t: "44" },
  { c: "IE", n: "Irlanda", t: "353" },
  { c: "SE", n: "Suecia", t: "46" },
  { c: "NO", n: "Noruega", t: "47" },
  { c: "DK", n: "Dinamarca", t: "45" },
  { c: "FI", n: "Finlandia", t: "358" },
  { c: "PL", n: "Polonia", t: "48" },
  { c: "CZ", n: "República Checa", t: "420" },
  { c: "GR", n: "Grecia", t: "30" },
  { c: "RU", n: "Rusia", t: "7" },
  { c: "TR", n: "Turquía", t: "90" },
  { c: "IL", n: "Israel", t: "972" },
  { c: "AE", n: "Emiratos Árabes Unidos", t: "971" },
  { c: "SA", n: "Arabia Saudita", t: "966" },
  { c: "ET", n: "Etiopía", t: "251" },
  { c: "KE", n: "Kenia", t: "254" },
  { c: "UG", n: "Uganda", t: "256" },
  { c: "TZ", n: "Tanzania", t: "255" },
  { c: "RW", n: "Ruanda", t: "250" },
  { c: "CN", n: "China", t: "86" },
  { c: "JP", n: "Japón", t: "81" },
  { c: "KR", n: "Corea del Sur", t: "82" },
  { c: "TW", n: "Taiwán", t: "886" },
  { c: "VN", n: "Vietnam", t: "84" },
  { c: "ID", n: "Indonesia", t: "62" },
  { c: "IN", n: "India", t: "91" },
  { c: "TH", n: "Tailandia", t: "66" },
  { c: "PH", n: "Filipinas", t: "63" },
  { c: "AU", n: "Australia", t: "61" },
  { c: "NZ", n: "Nueva Zelanda", t: "64" },
  { c: "ZA", n: "Sudáfrica", t: "27" },
];

export const PROVINCIAS_EC = ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"];

export const nombrePais = (c?: string) => PAISES.find((p) => p.c === (c || "EC"))?.n ?? c ?? "Ecuador";

/**
 * Número completo con prefijo internacional, para que el enlace de WhatsApp funcione
 * desde cualquier país. Si ya empieza por «+» se deja igual. Quita el 0 inicial del
 * número local (09… en Ecuador), salvo en Italia, donde forma parte del número.
 */
export function telefonoInternacional(numero: string, pais: string): string {
  const n = numero.trim();
  if (!n || n.startsWith("+")) return n;
  if (n.startsWith("00")) return "+" + n.slice(2);
  const p = PAISES.find((x) => x.c === pais);
  if (!p) return n;
  const local = pais === "IT" ? n : n.replace(/^0/, "");
  return "+" + p.t + " " + local;
}

/** Cédula ecuatoriana (10 dígitos con verificador) o RUC (13). Igual que en el servidor. */
export function documentoEcuadorValido(doc: string): boolean {
  const d = doc.replace(/[\s-]/g, "");
  const cedula = (c: string) => {
    if (!/^\d{10}$/.test(c)) return false;
    const prov = Number(c.slice(0, 2));
    if (!((prov >= 1 && prov <= 24) || prov === 30) || Number(c[2]) >= 6) return false;
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let n = Number(c[i]) * (i % 2 === 0 ? 2 : 1);
      if (n > 9) n -= 9;
      suma += n;
    }
    return (10 - (suma % 10)) % 10 === Number(c[9]);
  };
  if (d.length === 10) return cedula(d);
  if (!/^\d{13}$/.test(d) || d.endsWith("000")) return false;
  const tercero = Number(d[2]);
  if (tercero < 6) return cedula(d.slice(0, 10));
  const prov = Number(d.slice(0, 2));
  return (tercero === 6 || tercero === 9) && ((prov >= 1 && prov <= 24) || prov === 30);
}
