export const CONFIG = {
  marca: "Red Café Ecuador",
  dominio: "redcafeecuador.com",
  email: "info@redcafeecuador.com",
  // WhatsApp: configurar con NEXT_PUBLIC_WHATSAPP antes del build.
  // Si no se configura, los links de WhatsApp no funcionarán.
  // WhatsApp de contacto de la Red. Formato internacional sin signos ni espacios.
  whatsapp:
    process.env.NEXT_PUBLIC_WHATSAPP ?? "593968641376",
  whatsappMostrar:
    process.env.NEXT_PUBLIC_WHATSAPP_MOSTRAR ?? "Asesor redcafeEcuador",
  // BASE_PATH: prefijo del subdirectorio donde se sirve la app.
  // - Vacío en raíz de dominio (ej. https://redcafeecuador.com/)
  // - "/plataforma" en subdirectorio (ej. https://redcafeecuador.com/plataforma/)
  // Se inyecta con NEXT_PUBLIC_BASE_PATH al hacer build.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  // Ventana de registro gratuito. Quien se afilie antes de esta fecha queda
  // marcado como socio fundador y conserva las condiciones de entrada.
  registroGratisHasta: "2026-12-31",
  registroGratisTexto: "31 de diciembre de 2026",
  // Solo canales comprobados uno a uno. Un enlace a una cuenta que no existe
  // cuesta más credibilidad que la ausencia del canal: si está vacío, no se pinta.
  redes: {
    instagram: "https://www.instagram.com/redcafeecuador/",
    tiktok: "https://www.tiktok.com/@redcafeecuador",
    facebook: "https://www.facebook.com/RedCafeEcuador",
    youtube: "https://www.youtube.com/@RedCaf%C3%A9Ecuador",
    x: "",
    telegram: "",
  } as Record<string, string>,
  get registroGratisAbierto(): boolean {
    return new Date() <= new Date(this.registroGratisHasta + "T23:59:59");
  },
  // PayPal: configurar con NEXT_PUBLIC_PAYPAL_CLIENT_ID antes del build.
  // Si no se configura, el botón de PayPal no aparecerá.
  paypalClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "",
  paypalCurrency: "USD",
  // Helper para construir URLs absolutas a la API PHP respetando el subdirectorio.
  api(path: string): string {
    if (!path.startsWith("/")) path = "/" + path;
    return `${this.basePath}${path}`;
  },
};

export const waLink = (texto: string) => {
  if (!CONFIG.whatsapp) return "#";
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
};
