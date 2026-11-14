/* Clase demostrativa de barismo de LEGACY, parte del curso «Café de
   especialidad: de la finca a la taza». El aviso completo sale al inicio de ese
   curso; la tarjeta de la burbuja solo lleva el mensaje corto y el enlace al
   curso (y suma 1 a su número). Para quitarla en todo el
   sitio, poner CLASE_DEMO = null. */
export type ClaseDemo = {
  curso: string;
  corto: string; // lo que dice la tarjeta de la burbuja
  rotulo: string;
  parrafos: string[];
  antesDelBoton: string;
  boton: string;
  href: string;
  despues: string[];
};

export const CLASE_DEMO: ClaseDemo | null = {
  curso: "cafe-de-especialidad-de-la-finca-a-la-taza",
  corto: "☕ Clase demostrativa gratis de barismo con LEGACY",
  rotulo: "Academia · Clase demostrativa",
  parrafos: [
    "☕ ¡Hola a todos!",
    "En LEGACY estamos organizando una nueva clase demostrativa de BARISMO y queremos invitarlos a participar.",
    "Hemos creado un nuevo grupo oficial para compartir toda la información de la clase, novedades y el enlace de acceso.",
    "📲 Para mantenerse informados y participar, les invitamos a unirse a nuestro nuevo grupo:",
  ],
  antesDelBoton: "🔗 Únanse aquí:",
  boton: "Registrarme en la clase de LEGACY (WhatsApp)",
  href: "https://chat.whatsapp.com/Lt5S7VRZbb8D9bANdHAmoA?s=cl&p=i&iam=2",
  despues: [
    "¡Será una excelente oportunidad para conocer y aprender más sobre el mundo del barismo!",
    "¡Los esperamos! ☕",
  ],
};

export const ENLACE_CLASE_DEMO_CURSO = CLASE_DEMO ? `/academia/${CLASE_DEMO.curso}/#clase-demostrativa` : "";

/* Fecha de la próxima clase: una cada 14 días, siempre en jueves, a partir del
   jueves de referencia. El día de la clase todavía se muestra; al día
   siguiente (hora de Ecuador) pasa sola a la siguiente. */
const REFERENCIA_CLASE = Date.UTC(2026, 10, 19); // jueves 19 nov 2026
const CADA_DIAS = 14;
const DIA_MS = 86400000;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function proximaClase(ahora: number = Date.now()): string {
  // Día de hoy en Ecuador (UTC−5, sin horario de verano), a medianoche UTC.
  const hoy = Math.floor((ahora - 5 * 3600000) / DIA_MS) * DIA_MS;
  const pasados = Math.max(0, Math.ceil((hoy - REFERENCIA_CLASE) / (CADA_DIAS * DIA_MS)));
  const f = new Date(REFERENCIA_CLASE + pasados * CADA_DIAS * DIA_MS);
  return `jueves ${f.getUTCDate()} de ${MESES[f.getUTCMonth()]}`;
}
