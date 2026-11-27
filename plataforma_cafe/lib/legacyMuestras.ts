/*
 Servicio de muestras de Legacy Academics: recepción de muestras de café en
 verde y análisis organoléptico. Fuente: documento «Legacy Academics - Servicio
 de Muestras» entregado por Pedro el 27-nov-2026. Al cambiar el servicio, se
 edita solo este archivo.
*/
import { WHATSAPP_LEGACY } from "@/lib/legacyOferta";

export const RUTA_MUESTRAS = "/servicios/analisis-de-muestras/";
export const REF_MUESTRAS = "servicios/analisis-de-muestras";

export const MUESTRAS_LEGACY = {
  nombre: "Recepción de muestras de café en verde y análisis organoléptico",
  corto: "Análisis de muestras de café verde",
  precio: "50 USD",
  precioNota: "más impuestos, por muestra",
  /* Información necesaria para la recepción de la muestra. */
  datos: [
    { id: "proveedor", etiqueta: "Proveedor", opcional: false, ayuda: "Nombre de la finca, productor o empresa." },
    { id: "origen", etiqueta: "Origen del café", opcional: false, ayuda: "Provincia, cantón o zona, y altura si la conoces." },
    { id: "variedad", etiqueta: "Variedad genética", opcional: false, ayuda: "Por ejemplo: Typica, Caturra, Sidra, Geisha." },
    { id: "maduracion", etiqueta: "Tiempo de maduración", opcional: true, ayuda: "" },
    { id: "brix", etiqueta: "Promedio de Brix", opcional: true, ayuda: "" },
    { id: "anios", etiqueta: "Años de cultivo", opcional: true, ayuda: "" },
  ],
  /* Datos de contacto y envío (para que Legacy pueda coordinar la recepción). */
  contacto: [
    { id: "nombre", etiqueta: "Nombre de contacto", opcional: false, ayuda: "Quién envía la muestra.", tipo: "text" },
    { id: "telefono", etiqueta: "Teléfono / WhatsApp", opcional: false, ayuda: "Por ejemplo: 0991234567", tipo: "tel" },
    { id: "correo", etiqueta: "Correo electrónico", opcional: true, ayuda: "", tipo: "email" },
    { id: "ciudad", etiqueta: "Ciudad desde donde envías", opcional: false, ayuda: "", tipo: "text" },
    { id: "fecha", etiqueta: "Fecha en que enviarás la muestra", opcional: false, ayuda: "", tipo: "date" },
  ],
  /* Condiciones de la muestra. */
  condiciones: ["Muestra de café en verde (trillado)", "Cantidad: 400 g"],
  /* Proceso de evaluación: tostado de la muestra con 3 curvas. */
  curvas: [
    { titulo: "Cata", detalle: "Para poner puntajes." },
    { titulo: "Omni", detalle: "Demuestra el potencial de la muestra para trabajar en métodos alternativos y espresso." },
    { titulo: "Filtro", detalle: "Demuestra el potencial de la muestra para trabajar en métodos de filtrado." },
  ],
  entregables: [
    { titulo: "Recomendaciones de procesamiento futuro", detalle: "Descripción de mejoras o ajustes en el procesamiento del café según el análisis." },
    { titulo: "Recomendación de precio", detalle: "Estimación del precio por libra o kilogramo según calidad y mercado." },
    { titulo: "Puntaje con formato SCA", detalle: "" },
    { titulo: "Evaluación de muestra de 100 g de café en verde", detalle: "" },
    { titulo: "Envío de muestra a Cafexporto para su cata y posible venta", detalle: "El cliente paga el envío." },
  ],
};

/* Videos del canal de Legacy Academy (@LEGACYACADEMYDM) que corresponden al
   proceso. El canal no tiene un video propio del servicio de muestras; este
   muestra el tostador y el trabajo de tueste en Legacy. */
export const VIDEOS_MUESTRAS = [
  { id: "56Spbktim1I", titulo: "El tueste en Legacy (del curso Barista Avanzado)", dura: "0:59", en: "tostado" },
];

export type DatosMuestra = Record<string, string>;
export type CampoMuestra = { id: string; etiqueta: string; opcional: boolean; ayuda: string; tipo?: string };

const CAMPOS: CampoMuestra[] = [...MUESTRAS_LEGACY.datos, ...MUESTRAS_LEGACY.contacto];

/** «2026-12-03» → «jueves 3 de diciembre de 2026». */
export function fechaLarga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  const f = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  return f.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Valor ya limpio para mostrar (fecha en palabras). */
export function valorMuestra(c: CampoMuestra, d: DatosMuestra): string {
  const v = String(d[c.id] || "").trim().slice(0, 120);
  return c.tipo === "date" ? fechaLarga(v) : v;
}

/** Campos obligatorios que faltan. */
export function faltantes(d: DatosMuestra): CampoMuestra[] {
  return CAMPOS.filter((c) => !c.opcional && !String(d[c.id] || "").trim());
}

/** Bloques de la ficha de recepción: [título, [etiqueta, valor][]]. */
export function fichaMuestra(d: DatosMuestra): [string, [string, string][]][] {
  const filas = (lista: CampoMuestra[]) =>
    lista.map((c) => [c.etiqueta, valorMuestra(c, d) || (c.opcional ? "—" : "(por completar)")] as [string, string]);
  return [
    ["Información de la muestra", filas(MUESTRAS_LEGACY.datos)],
    ["Condiciones de la muestra", [["Muestra", "Café en verde (trillado)"], ["Cantidad", "400 g"]]],
    ["Contacto y envío", filas(MUESTRAS_LEGACY.contacto)],
    ["Servicio", [["Precio", "50 USD más impuestos, por muestra"], ["Evaluación", "Tostado en 3 curvas: Cata, Omni y Filtro"]]],
  ];
}

/** Texto completo de la solicitud (mensaje de WhatsApp). */
export function textoMuestras(d: DatosMuestra = {}): string {
  const bloques = fichaMuestra(d)
    .map(([t, filas]) => `*${t}*\n` + filas.map(([e, v]) => `${e}: ${v}`).join("\n"))
    .join("\n\n");
  return (
    `Hola Legacy, vengo de redcafeecuador.com. Quiero solicitar el servicio de muestras: recepción de muestra de café en verde y análisis organoléptico.\n\n` +
    bloques +
    `\n\nAdjunto la ficha de recepción de la muestra. ¿Me confirman dónde la entrego?\n\nRef.: Red Café Ecuador · ${REF_MUESTRAS}`
  );
}

/** WhatsApp a Legacy con los datos de la muestra y la referencia a la Red. */
export function waMuestras(d: DatosMuestra = {}): string {
  return `https://wa.me/${WHATSAPP_LEGACY}?text=${encodeURIComponent(textoMuestras(d))}`;
}
