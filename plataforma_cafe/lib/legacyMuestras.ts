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

/** WhatsApp a Legacy con los datos de la muestra y la referencia a la Red. */
export function waMuestras(d: DatosMuestra = {}): string {
  const lineas = MUESTRAS_LEGACY.datos
    .map((c) => {
      const v = String(d[c.id] || "").trim().slice(0, 120);
      if (!v && c.opcional) return "";
      return `${c.etiqueta}: ${v || "(por completar)"}`;
    })
    .filter(Boolean);
  const texto =
    `Hola Legacy, vengo de redcafeecuador.com. Quiero solicitar el servicio de muestras: recepción de muestra de café en verde y análisis organoléptico (50 USD más impuestos).\n\n` +
    lineas.join("\n") +
    `\nMuestra: café en verde (trillado), 400 g.\n\n¿Me indican cómo y dónde entrego la muestra?\n\nRef.: Red Café Ecuador · ${REF_MUESTRAS}`;
  return `https://wa.me/${WHATSAPP_LEGACY}?text=${encodeURIComponent(texto)}`;
}
