// Port de api/mailer.php con las mismas plantillas de marca.
// Envío por proveedor transaccional (Resend, con SPF/DKIM del dominio) en
// lugar de mail() sin autenticar. Sin proveedor configurado, el correo se
// registra en consola y en la colección «correos-enviados» (solo desarrollo).
import { config, esProduccion } from "./config.js";
import { agregar } from "./docs.js";
import { emailValido, nowIso, str, uid } from "./util.js";

const URL_MARCA = "https://redcafeecuador.com/";

const esc = (s: unknown) =>
  str(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]!);
const nl2br = (s: string) => s.replace(/\r?\n/g, "<br />\n");

const titulo = (t: string) => `<h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#2b1d16;font-family:Georgia,serif;">${esc(t)}</h1>`;
const parrafo = (s: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#2b1d16;font-family:Arial,sans-serif;">${nl2br(esc(s))}</p>`;
const boton = (etq: string, url: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:999px;background:linear-gradient(135deg,#6f3f1f,#2b1d16);padding:12px 28px;"><a href="${esc(url)}" style="color:#fffaf2;font-size:14px;font-weight:700;text-decoration:none;font-family:Arial,sans-serif;display:inline-block;">${etq} →</a></td></tr></table>`;

function envolver(interior: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Red Café Ecuador</title></head>
<body style="margin:0;padding:0;background:#f7f0e5;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f0e5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fffaf2;border-radius:16px;overflow:hidden;border:1px solid rgba(43,29,22,0.09);">
<tr><td style="background:linear-gradient(135deg,#2b1d16 0%,#6f3f1f 100%);padding:28px 32px;"><span style="font-size:22px;font-weight:800;color:#f7f0e5;font-family:Georgia,serif;">☕ Red Café</span> <span style="font-size:22px;font-weight:800;color:#d19a5b;font-family:Georgia,serif;">Ecuador</span><p style="margin:6px 0 0;font-size:12px;color:rgba(247,240,229,0.75);font-family:Arial,sans-serif;">La red del café de especialidad</p></td></tr>
<tr><td style="padding:32px;">${interior}</td></tr>
<tr><td style="padding:24px 32px;background:#efe5d2;border-top:1px solid rgba(43,29,22,0.08);"><p style="margin:0 0 8px;font-size:12px;color:#6f5747;font-family:Arial,sans-serif;">Red Café Ecuador — Comunidad de productores, tostadores y cafeterías de especialidad.</p>
<p style="margin:0;font-size:12px;color:#6f5747;font-family:Arial,sans-serif;"><a href="${URL_MARCA}" style="color:#6f3f1f;font-weight:700;text-decoration:none;">Visita la plataforma</a> &nbsp;·&nbsp; <a href="${URL_MARCA}terminos-y-condiciones" style="color:#6f5747;text-decoration:none;">Términos y privacidad</a></p>
<p style="margin:12px 0 0;font-size:11px;color:#6f5747;font-family:Arial,sans-serif;">Recibes este correo porque tienes una cuenta o interacción en Red Café Ecuador. Si no reconoces esta actividad, ignóralo o escríbenos a info@redcafeecuador.com.</p></td></tr>
</table></td></tr></table></body></html>`;
}

const ROLES: Record<string, string> = {
  productor: "productor", vendedor: "vendedor", comprador: "comprador", bar: "bar", barista: "barista",
  certificador: "verificador / catador", transportista: "transportista", pilador: "pilador", exportador: "exportador",
};

type Vars = Record<string, unknown>;

function componer(plantilla: string, v: Vars): { asunto: string; html: string } | null {
  const nombre = str(v.nombre) || "amigo";
  const primero = nombre.trim().split(" ")[0] || "amigo";
  const unaLinea = (s: unknown, d: string) => str(s || d).replace(/[\r\n]/g, " ").slice(0, 140);
  let asunto = "";
  let i = "";
  switch (plantilla) {
    case "welcome":
      asunto = `¡Bienvenido a la Red Café Ecuador, ${primero}! ☕`;
      i = titulo(`¡Bienvenido a la Red, ${primero}!`)
        + parrafo(`Hola, gracias por unirte como ${ROLES[str(v.rol)] ?? "miembro de la comunidad"}. Tu cuenta está lista.`)
        + parrafo("Aquí puedes publicar lotes de café, conectarte con compradores, llevar tu menú y vender directo a cafeterías y baristas de especialidad de todo el país.")
        + boton("Entrar a tu panel", URL_MARCA + "panel")
        + parrafo("Encuentra guías y herramientas para vender mejor en la sección Servicios de la plataforma.");
      break;
    case "pedido":
      asunto = `Nuevo pedido #${str(v.nro)} — Red Café Ecuador`;
      i = titulo("Tienes un nuevo pedido 🚚") + parrafo(`Hola ${primero}, recibiste un pedido con este detalle:`)
        + `<table role="presentation" width="100%" cellpadding="10" cellspacing="0" style="background:#f7f0e5;border-radius:12px;margin:0 0 16px;font-family:Arial,sans-serif;">`
        + `<tr><td style="color:#6f5747;font-size:13px;">N° pedido</td><td style="color:#2b1d16;font-weight:700;font-size:14px;">#${esc(v.nro)}</td></tr>`
        + `<tr><td style="color:#6f5747;font-size:13px;">Cliente</td><td style="color:#2b1d16;font-weight:700;font-size:14px;">${esc(v.cliente)}</td></tr>`
        + `<tr><td style="color:#6f5747;font-size:13px;">Total</td><td style="color:#6f3f1f;font-weight:800;font-size:15px;">${esc(v.total)}</td></tr></table>`
        + boton("Ver pedido", URL_MARCA + "panel");
      break;
    case "mensaje":
      asunto = `Nuevo mensaje de ${primero} — Red Café Ecuador`;
      i = titulo("Tienes un nuevo mensaje 💬") + parrafo(`De ${str(v.de) || nombre} en ${str(v.tema) || "tu conversación"}:`)
        + `<blockquote style="margin:0 0 16px;padding:14px 18px;background:#f7f0e5;border-left:4px solid #d19a5b;border-radius:8px;color:#2b1d16;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">${esc(v.texto)}</blockquote>`
        + boton("Responder", URL_MARCA + "comunidad");
      break;
    case "codigo":
      asunto = "Tu código de verificación — Red Café Ecuador";
      i = titulo("Tu código de verificación") + parrafo(`Hola ${primero}, usa este código para completar tu acceso:`)
        + `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="background:#f7f0e5;border:2px dashed #d19a5b;border-radius:12px;padding:16px 32px;font-size:30px;font-weight:800;letter-spacing:8px;color:#2b1d16;font-family:monospace;">${esc(v.code)}</td></tr></table>`
        + parrafo("El código es válido por 10 minutos. Si no solicitaste este código, ignora este mensaje.");
      break;
    case "password_reset":
      asunto = "Recupera tu contraseña · Red Café Ecuador";
      i = titulo("Recupera tu contraseña") + parrafo(`Hola ${primero}, recibimos una solicitud para cambiar la contraseña de tu cuenta.`)
        + boton("Crear una nueva contraseña", str(v.enlace) || URL_MARCA + "recuperar")
        + parrafo("El enlace vale UNA HORA y sirve UNA SOLA VEZ. Si no pediste este cambio, ignora este correo: tu contraseña actual seguirá igual.");
      break;
    case "admin_reset":
      asunto = "Recuperar el acceso de administrador · Red Café Ecuador";
      i = titulo("Recuperar el acceso de administrador")
        + parrafo("Alguien pidió restablecer la contraseña del panel de administración. Si has sido tú, abre este enlace y pulsa el botón: te mostrará una contraseña nueva, una sola vez.")
        + boton("Restablecer la contraseña", str(v.enlace) || URL_MARCA)
        + parrafo("El enlace vale UNA HORA y sirve UNA SOLA VEZ. Si no lo has pedido tú, ignora este correo: mientras nadie lo abra, la contraseña actual sigue funcionando y no ha cambiado nada.");
      break;
    case "waitlist":
      asunto = "¡Estás en la lista de espera de Red Café Ecuador! ☕";
      i = titulo(`¡Gracias, ${primero}!`) + parrafo("Tu correo quedó en la lista de espera de la Red Café Ecuador.")
        + parrafo("Te avisaremos cuando abra la membresía de tu perfil" + (str(v.perfil) ? ` (${str(v.perfil)})` : "") + ": acceso anticipado, precios de lanzamiento y contenido gratuito de la Academia.")
        + boton("Ver la Red", URL_MARCA);
      break;
    case "sancion":
      asunto = unaLinea(v.titulo, "Aviso sobre tu cuenta") + " — Red Café Ecuador";
      i = titulo(str(v.titulo) || "Aviso sobre tu cuenta")
        + parrafo(`Hola ${primero}, te escribimos para notificarte formalmente una medida sobre tu cuenta.`)
        + parrafo("Medida: " + str(v.texto)) + parrafo("Infracción: " + str(v.infraccion))
        + parrafo("Norma aplicada: " + str(v.norma)) + parrafo("Hechos: " + str(v.hechos))
        + (str(v.hasta) ? parrafo("Vigente hasta: " + str(v.hasta)) : "")
        + parrafo("Tienes derecho a presentar tu versión y las pruebas que consideres" + (str(v.apelar_hasta) ? " hasta el " + str(v.apelar_hasta) : "") + ". Revisaremos tu apelación y te responderemos con una resolución motivada.")
        + boton("Presentar mi apelación", str(v.enlace) || URL_MARCA + "login/");
      break;
    case "contacto_admin":
      asunto = unaLinea(v.asunto, "Mensaje de Red Café Ecuador") + " — Red Café Ecuador";
      i = titulo(str(v.asunto) || "Mensaje de Red Café Ecuador") + parrafo(`Hola ${primero},`) + parrafo(str(v.mensaje))
        + parrafo("Puedes responder escribiéndonos desde el chat de tu panel o a soporte@redcafeecuador.com.")
        + boton("Ir a mi panel", URL_MARCA + "panel/");
      break;
    case "baja":
      asunto = "Tu cuenta fue eliminada — Red Café Ecuador";
      i = titulo("Tu cuenta fue eliminada") + parrafo(`Hola ${primero}, confirmamos que cerraste tu cuenta en Red Café Ecuador.`)
        + parrafo("Eliminamos tu perfil, tus datos de contacto, tus publicaciones y tus avisos. Conservamos solo lo que la ley permite para atender obligaciones con otras personas o reclamos (pedidos ya cerrados y registros de moderación), sin tus datos de contacto.")
        + parrafo("Si no fuiste tú, escríbenos de inmediato a soporte@redcafeecuador.com.");
      break;
    case "aviso":
      asunto = unaLinea(v.titulo, "Novedades") + " — Red Café Ecuador";
      i = titulo(str(v.titulo) || "Novedades de la Red") + parrafo(`Hola ${primero},`)
        + (str(v.texto).trim() ? parrafo(str(v.texto)) : "")
        + boton("Ver en la Red", str(v.enlace) || URL_MARCA + "panel/")
        + `<p style="margin:24px 0 0;color:#6f5747;font-size:12px;line-height:1.5;font-family:Arial,sans-serif;">Recibes este correo porque aceptaste recibir novedades de la Red. <a href="${esc(v.baja)}" style="color:#6f3f1f;">Dejar de recibir estos correos</a>.</p>`;
      break;
    // Nuevas: en PHP cotizaciones.php las pedía pero no existían y nunca se enviaban.
    case "cotizacion_solicitada":
      asunto = `Te piden cotización #${str(v.nro)} — Red Café Ecuador`;
      i = titulo("Te piden una cotización") + parrafo(`Hola ${primero}, ${str(v.solicitante) || "un miembro"} te pidió precio (cotización #${str(v.nro)}).`)
        + boton("Responder desde mi panel", URL_MARCA + "panel/");
      break;
    case "cotizacion_recibida":
      asunto = `Ya tienes precio en la cotización #${str(v.nro)} — Red Café Ecuador`;
      i = titulo("Respondieron tu cotización") + parrafo(`Hola ${primero}, la cotización #${str(v.nro)} ya tiene precio: ${str(v.precio)}.`)
        + boton("Aceptar o rechazar", URL_MARCA + "panel/");
      break;
    default:
      return null;
  }
  return { asunto, html: envolver(i) };
}

/** mailer_send() */
export async function enviarCorreo(plantilla: string, para: string, vars: Vars = {}): Promise<boolean> {
  if (!emailValido(para)) return false;
  const c = componer(plantilla, vars);
  if (!c) return false;
  try {
    if (config.correo.apiResend) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.correo.apiResend}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: config.correo.remitente, to: [para], subject: c.asunto, html: c.html, reply_to: "no-reply@redcafeecuador.com" }),
      });
      if (!r.ok) console.error("[correo] proveedor respondió", r.status);
      return r.ok;
    }
    if (esProduccion()) {
      console.error("[correo] sin proveedor configurado en producción: no se envió", plantilla);
      return false;
    }
    // Desarrollo y pruebas: se guarda para poder inspeccionarlo (códigos 2FA, enlaces).
    await agregar("correos-enviados", { id: uid(), ts: nowIso(), plantilla, para, asunto: c.asunto, vars });
    return true;
  } catch (e) {
    console.error("[correo] fallo de envío", e);
    return false;
  }
}

export { componer as _componerParaPruebas };
