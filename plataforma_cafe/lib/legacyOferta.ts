/*
 Oferta vigente de los cursos de pago de Legacy (precios, qué incluye, fechas y
 condiciones). Fuente: configuración de la Bandeja de Legacy y su programa del
 24-nov-2026, entregados por Pedro el 27-nov-2026. Al cambiar la oferta, se
 edita solo este archivo.

 Las fechas cuyo último día ya pasó se ocultan solas (hora de Ecuador).
 MOSTRAR_DESCUENTOS: Legacy da el descuento cuando la persona confirma; con
 false la ficha muestra el precio normal y solo avisa de que hay descuentos.
*/

export const WHATSAPP_LEGACY = "593963291887";
export const MOSTRAR_DESCUENTOS = false;

export type FechaLegacy = {
  grupo: string; // «Diciembre», «Enero 2027»…
  lugar: string;
  modalidad: string;
  cuando: string;
  fin: string; // AAAA-MM-DD: último día (para ocultarla cuando pase)
  agotado?: boolean;
};
export type OpcionLegacy = { titulo: string; precio: string; detalle: string; descuento?: string };
export type OfertaLegacy = {
  nombre: string;
  precio: string;
  precioNota?: string;
  descuentos: string[];
  incluye: string[];
  fechas: FechaLegacy[];
  sinFechas?: string;
  opciones: OpcionLegacy[];
};

const CARRERA: OpcionLegacy = {
  titulo: "Carrera completa: Barista Pro + Barista Avanzado",
  precio: "998 USD por separado",
  detalle: "Los dos cursos seguidos, de la barra al origen del café.",
  descuento: "850 USD si te inscribes en los dos desde el inicio, pagando en efectivo o transferencia (ahorras alrededor del 15 %).",
};

export const OFERTA_LEGACY: Record<string, OfertaLegacy> = {
  "legacy-barismo-profesional": {
    nombre: "Barista Pro",
    precio: "399 USD",
    descuentos: ["359 USD si dejas lista la inscripción pagando en efectivo o transferencia.", "320 USD por persona si vienes con alguien."],
    incluye: [
      "25 horas de curso",
      "25 horas de práctica en barra (opcional)",
      "25 horas de arte latte (opcional)",
      "Materiales",
      "Certificado",
      "Bolsa de empleo",
    ],
    fechas: [
      { grupo: "Diciembre", lugar: "Cumbayá", modalidad: "Intensivo", cuando: "Lunes 14 a viernes 18 de diciembre, 8:30–13:30", fin: "2026-12-18" },
      { grupo: "Diciembre", lugar: "Cumbayá", modalidad: "Sábados (5)", cuando: "12 de diciembre a 9 de enero, 14:30–19:30", fin: "2027-01-09" },
      { grupo: "Diciembre", lugar: "Quito", modalidad: "Intensivo", cuando: "14 a 18 de diciembre, 9:00–14:00", fin: "2026-12-18" },
      { grupo: "Enero 2027", lugar: "Cumbayá", modalidad: "Sábados por la mañana", cuando: "9 de enero a 6 de febrero, 8:30–13:30", fin: "2027-02-06" },
      { grupo: "Enero 2027", lugar: "Cumbayá", modalidad: "Sábados por la tarde", cuando: "Desde el 23 de enero, 14:30–19:30", fin: "2027-01-23" },
      { grupo: "Enero 2027", lugar: "Cumbayá", modalidad: "Intensivo", cuando: "11 a 15 de enero, 8:30–13:30", fin: "2027-01-15" },
      { grupo: "Enero 2027", lugar: "Cuenca", modalidad: "Intensivo", cuando: "18 a 22 de enero, 9:00–14:00", fin: "2027-01-22" },
      { grupo: "Enero 2027", lugar: "Quito", modalidad: "Intensivo", cuando: "25 a 29 de enero, 9:00–14:00", fin: "2027-01-29" },
    ],
    opciones: [CARRERA],
  },
  "legacy-barista-en-casa": {
    nombre: "Barista en Casa",
    precio: "159 USD",
    precioNota: "grupal",
    descuentos: ["143 USD si dejas lista la inscripción pagando en efectivo o transferencia.", "120 USD por persona si vienes con alguien."],
    incluye: [
      "8 horas en Cumbayá",
      "Prácticas con V60, prensa francesa y moka",
      "Certificado",
      "3 meses de acceso a la plataforma",
      "No hace falta tener máquina de café",
    ],
    fechas: [
      { grupo: "Diciembre", lugar: "Cumbayá", modalidad: "Domingos", cuando: "13 y 20 de diciembre, 15:00–19:00", fin: "2026-12-20" },
    ],
    opciones: [
      {
        titulo: "Barista en Casa personalizado",
        precio: "275 USD (hasta 2 personas)",
        detalle: "6 horas en tu casa, con tu propia máquina, y 3 fundas de café de 250 g de cortesía. No incluye certificado. La fecha se coordina según la agenda de los instructores.",
      },
    ],
  },
  "legacy-barista-avanzado": {
    nombre: "Barista Avanzado",
    precio: "599 USD",
    descuentos: [],
    incluye: ["Visita a finca cafetera", "Tueste", "Cata", "Prácticas en Cafexporto"],
    fechas: [],
    sinFechas: "Por ahora no hay fecha abierta. Escribe a Legacy y te avisan apenas salga la próxima.",
    opciones: [
      { titulo: "Si egresaste de Barista Pro", precio: "550 USD", detalle: "Precio para quienes ya completaron Barista Pro con Legacy." },
      CARRERA,
    ],
  },
};

/** Condiciones que valen para todos los cursos de Legacy. */
export const CONDICIONES_LEGACY = {
  reserva: "Reserva tu cupo con 50 USD o el 50 %; el saldo se paga a más tardar el día en que empieza el curso.",
  universitaria: "Certificación universitaria opcional: 150 USD adicionales.",
  avisoDescuentos: "Si escribes hoy, puedes acceder a un descuento: Legacy te lo informa por WhatsApp. Si vienes con alguien más o en grupo, también hay precio especial por persona.",
};

/** Hoy en Ecuador (AAAA-MM-DD), para ocultar las fechas que ya pasaron. */
export function hoyEcuador(): string {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}
