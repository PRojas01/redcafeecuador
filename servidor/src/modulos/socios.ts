// Port de api/socios.php y de la puerta del preacuerdo estratégico
// (socios/redcafe-preacuerdo-estrategico-2026-a7f3c9/index.php).
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { tieneRol, usuarioActual } from "../lib/usuarios.js";
import { emailValido, nowIso, str } from "../lib/util.js";
import { config } from "../lib/config.js";
import type { EstadoSesion } from "../lib/sesion.js";

export const RUTA_PREACUERDO = "/socios/redcafe-preacuerdo-estrategico-2026-a7f3c9/";
const INVITACION = "/socios/redcafe-invitacion-estrategica-2026-a7f3c9/";

const PERFILES = ["Partner estratégico", "Founder", "Inversionista", "Profesional aliado", "Institución aliada", "Productor líder", "Comprador/exportador", "Aliado promotor de red", "Otro"];
const PARTICIPACIONES = ["Partner estratégico", "Founder operativo", "Inversionista", "Profesional aliado", "Institución aliada", "Productor líder", "Comprador/exportador", "Aliado promotor de red", "Aún no lo sé"];
const INTERESES = ["Comercialización", "Exportación", "Trazabilidad", "Certificación", "Calidad/catación", "Formación", "Tecnología", "Financiamiento", "Servicios para productores", "Otro"];
const RESPUESTAS = ["Acepto avanzar", "Quiero conversar", "Propongo ajustes", "Necesito más información", "No es de mi interés ahora"];

const corta = (s: string, max: number) => [...s].slice(0, max).join("");
const texto = (v: unknown, max: number) => corta(str(v).trim().replace(/\s+/gu, " "), max);
const parrafo = (v: unknown, max: number) => corta(str(v).trim().replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n"), max);
const slug = (t: string) => t.trim().toLowerCase().replace(/[áéíóúñü]/g, (c) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ñ: "n", ü: "u" })[c]!).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function opcion(v: unknown, permitidas: string[], campo: string): string {
  const val = texto(v, 200);
  if (permitidas.includes(val)) return val;
  const s = slug(val);
  const hit = permitidas.find((p) => slug(p) === s);
  if (!hit) fail(campo + " inválido.", 422);
  return hit;
}
const siNo = (v: unknown) => v === true || ["1", "true", "on", "yes"].includes(str(v).toLowerCase());
function correo(v: unknown, requerido = true): string {
  const e = texto(v, 160).toLowerCase();
  if (e === "" && !requerido) return "";
  if (!emailValido(e)) fail("Correo inválido.", 422);
  return e;
}
const nuevoId = () => "socio-" + new Date().toISOString().replace(/\D/g, "").slice(0, 14) + "-" + randomBytes(4).toString("hex");

const acciones: Modulo["acciones"] = {
  async accept(ctx) {
    if (!(await cupo(ctx, "socios_accept", 20, 3600))) fail("Demasiados intentos. Intenta nuevamente más tarde.", 429);
    const i = ctx.in;
    const name = texto(i.name, 120), email = correo(i.email), phone = texto(i.phone, 60), organization = texto(i.organization, 140);
    const profile_type = opcion(i.profile_type, PERFILES, "Tipo de perfil"), interest = opcion(i.interest, INTERESES, "Interés");
    if ([...name].length < 2) fail("Nombre requerido.", 422);
    if (!phone) fail("Teléfono o WhatsApp requerido.", 422);
    if (!organization) fail("Empresa u organización requerida.", 422);
    if (!siNo(i.accepted_privacy) || !siNo(i.accepted_confidentiality)) fail("Debes aceptar la política de datos y la reserva de la propuesta.", 422);
    const item = {
      id: nuevoId(), name, email, phone, organization, profile_type, interest, accepted_privacy: true, accepted_confidentiality: true,
      ip_address: ctx.ip, user_agent: texto(ctx.cabecera("user-agent"), 500),
      feedback_type: "", feedback: "", counterproposal: "", next_step: "", feedback_at: "", created_at: nowIso(),
    };
    await mutar("socios-invitados", (l) => [...l, item]);
    // La marca que abre el preacuerdo vive en la sesión del servidor.
    ctx.ses.set({ datos: { ...ctx.ses.d.datos, socio_id: item.id, socio_email: item.email } });
    return { id: item.id };
  },

  async feedback(ctx) {
    if (!(await cupo(ctx, "socios_feedback", 20, 3600))) fail("Demasiados intentos. Intenta nuevamente más tarde.", 429);
    const i = ctx.in;
    const id = texto(i.id, 80), email = correo(i.email, true);
    const feedback_type = opcion(i.feedback_type ?? "Quiero conversar", RESPUESTAS, "Tipo de respuesta");
    const feedback = parrafo(i.feedback, 2500), counterproposal = parrafo(i.counterproposal, 2500), next_step = texto(i.next_step, 220);
    const crudo = i.participacion ?? [];
    const participacion = [...new Set((Array.isArray(crudo) ? crudo : [crudo]).map((v) => opcion(v, PARTICIPACIONES, "Forma de participación")))];
    if (!participacion.length) fail("Elige al menos una forma de participación.", 422);
    if (!feedback && !counterproposal && feedback_type === "Propongo ajustes") fail("Si propone ajustes, describa la contrapropuesta.", 422);
    let res: Doc | null = null;
    await mutar("socios-invitados", (l) => {
      let idx = -1;
      if (id) {
        const k = l.findIndex((x) => str(x.id) === id);
        // El id solo vale acompañado del correo del propio registro.
        if (k >= 0 && str(l[k].email).toLowerCase() === email) idx = k;
      }
      if (idx < 0) {
        l.push({ id: nuevoId(), name: "", email, phone: "", organization: "", profile_type: "Otro", interest: "Otro", accepted_privacy: false, accepted_confidentiality: false, ip_address: ctx.ip, user_agent: texto(ctx.cabecera("user-agent"), 500), created_at: nowIso() });
        idx = l.length - 1;
      }
      Object.assign(l[idx], { participacion, feedback_type, feedback, counterproposal, next_step, feedback_at: nowIso() });
      res = l[idx];
      return l;
    });
    return { id: (res as Doc | null)?.id ?? id };
  },

  async list(ctx) {
    const u = await usuarioActual(ctx);
    if (!ctx.ses.d.admin && !(u && tieneRol(ctx, u, "admin"))) fail("Solo la administración puede revisar invitados estratégicos.", 403);
    const items = (await listar("socios-invitados")).sort((a, b) => (Date.parse(str(b.created_at)) || 0) - (Date.parse(str(a.created_at)) || 0));
    return { invitados: items };
  },
};

export const socios: Modulo = { acciones, noValida: { mensaje: "Acción no válida.", codigo: 404 } };

/** La puerta: solo con un registro aceptado (o sesión de administración). */
export async function paginaPreacuerdo(ses: EstadoSesion): Promise<Response> {
  const h = new Headers({ "Cache-Control": "no-store, no-cache, must-revalidate", "X-Robots-Tag": "noindex, nofollow", "Content-Type": "text/html; charset=utf-8" });
  let acceso = !!ses.d.admin;
  const id = str(ses.d.datos.socio_id).trim();
  if (!acceso && id) {
    const r = (await listar("socios-invitados")).find((x) => str(x.id) === id);
    acceso = !!r && !!r.accepted_privacy && !!r.accepted_confidentiality;
  }
  if (!acceso) {
    h.set("Location", INVITACION);
    return new Response(`<!doctype html><meta charset="utf-8"><title>Acceso restringido</title><meta name="robots" content="noindex, nofollow"><p>El preacuerdo es para invitados que ya completaron el registro de aceptación. <a href="${INVITACION}">Ir a la invitación</a>.</p>`, { status: 302, headers: h });
  }
  // El contenido es el HTML que sigue al bloque PHP de la puerta.
  const fuente = path.join(config.sitio, RUTA_PREACUERDO, "index.php");
  const php = fs.existsSync(fuente) ? fs.readFileSync(fuente, "utf8") : "";
  const corte = php.indexOf("?>");
  const html = corte >= 0 ? php.slice(corte + 2).replace(/^\r?\n/, "") : "";
  if (!html) return new Response("Página no disponible.", { status: 404, headers: h });
  return new Response(html, { status: 200, headers: h });
}
