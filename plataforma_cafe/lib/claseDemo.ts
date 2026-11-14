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
  corto: "☕ Nueva clase demostrativa de barismo con LEGACY. Únete al grupo para participar.",
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
