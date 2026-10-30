/**
 * Color de perfil de taza.
 *
 * La franja de color de un lote no la elige un diseñador: sale de sus propias
 * notas sensoriales. Así la paleta del catálogo la genera el catálogo, y dos
 * cafés distintos nunca se ven iguales por casualidad.
 *
 * Si un lote no declara notas reconocibles, no lleva franja: preferimos la
 * ausencia a inventarle un perfil.
 */

export type FamiliaCata =
  | "dulce"
  | "frutal"
  | "citrico"
  | "floral"
  | "herbal"
  | "cacao"
  | null;

const FAMILIAS: { familia: Exclude<FamiliaCata, null>; notas: string[] }[] = [
  { familia: "floral",  notas: ["jazmín", "jazmin", "floral", "flores", "bergamota", "lavanda", "azahar"] },
  { familia: "frutal",  notas: ["cereza", "frutos rojos", "mora", "fresa", "durazno", "frutal", "maracuyá", "maracuya", "tropical", "uva"] },
  { familia: "citrico", notas: ["cítric", "citric", "naranja", "limón", "limon", "mandarina", "toronja", "lima"] },
  { familia: "cacao",   notas: ["cacao", "chocolate", "nuez", "almendra", "avellana", "tabaco", "malta"] },
  { familia: "dulce",   notas: ["panela", "miel", "caramelo", "azúcar", "azucar", "melaza", "vainilla", "dulce"] },
  { familia: "herbal",  notas: ["herbal", "hierba", "té", "te verde", "menta", "eucalipto", "cedro"] },
];

/** Deduce la familia sensorial a partir de la descripción del lote. */
export function familiaDeCata(texto?: string | null): FamiliaCata {
  if (!texto) return null;
  const t = texto.toLowerCase();
  for (const { familia, notas } of FAMILIAS) {
    if (notas.some((n) => t.includes(n))) return familia;
  }
  return null;
}

/** Variable CSS del color correspondiente. Devuelve null si no hay perfil. */
export function colorDeCata(texto?: string | null): string | null {
  const f = familiaDeCata(texto);
  return f ? `var(--color-cata-${f})` : null;
}

/** Etiqueta legible para mostrar junto a la franja. */
export const ETIQUETA_CATA: Record<Exclude<FamiliaCata, null>, string> = {
  dulce: "Dulce",
  frutal: "Frutal",
  citrico: "Cítrico",
  floral: "Floral",
  herbal: "Herbal",
  cacao: "Cacao",
};
