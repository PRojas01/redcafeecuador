// A quién llega un mensaje masivo de la administración (campana, correo o
// WhatsApp). Mismos filtros para los tres canales: perfiles, provincia, curso
// y segmento. El consentimiento de novedades (LOPDP) se exige para correo y
// WhatsApp; la campana interna es un aviso del servicio y no lo necesita.
import { listar, mapa, type Doc } from "./docs.js";
import { ROLES_MIEMBRO, miembroRoles, todosLosMiembros } from "./usuarios.js";
import { emailValido, str } from "./util.js";

export const SEGMENTOS = ["todos", "productores_sin_lote", "nuevos_30_dias"];
const ESTADOS_CURSO = ["matriculado", "aprobado", "pendiente"];

export type Filtros = { roles: string[]; provincia: string; curso: string; segmento: string; ids?: string[] };

const siNo = (v: unknown, def: boolean) => (v === undefined || v === null ? def : v === true || ["1", "true", "on", "yes"].includes(str(v).toLowerCase()));
export { siNo };

export function leerFiltros(i: Doc): Filtros {
  let crudo = i.roles ?? (i.rol ? [i.rol] : []);
  if (!Array.isArray(crudo)) crudo = crudo === "" || crudo === null ? [] : [crudo];
  const roles = [...new Set((crudo as unknown[]).map(str).filter((r) => ROLES_MIEMBRO.includes(r)))];
  const segmento = SEGMENTOS.includes(str(i.segmento)) ? str(i.segmento) : "todos";
  const ids = Array.isArray(i.ids) ? [...new Set((i.ids as unknown[]).map((x) => str(x).trim()).filter(Boolean))].slice(0, 500) : [];
  return { roles, provincia: str(i.provincia).trim(), curso: str(i.curso).trim().slice(0, 120), segmento, ...(ids.length ? { ids } : {}) };
}

export const activo = (m: Doc) => !("activo" in m && !m.activo) && !["bloqueado", "suspendido", "eliminado"].includes(str(m.estado));
export const aceptaNovedades = (m: Doc) => activo(m) && (!!m.acepta_marketing || !!m.consentimientos?.marketing?.aceptado);
/** WhatsApp lleva consentimiento propio: el antiguo «novedades» solo hablaba de correo. */
export const aceptaWhatsapp = (m: Doc) => activo(m) && m.consentimientos?.whatsapp?.aceptado === true;

export function telefonoInternacional(raw: unknown): string {
  let d = str(raw).replace(/\D+/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d[0] === "0") d = "593" + d.slice(1);
  else if (d.length === 9 && d[0] === "9") d = "593" + d;
  return d.length < 11 || d.length > 15 ? "" : d;
}
export const whatsappDe = (m: Doc) => telefonoInternacional(m.whatsapp) || telefonoInternacional(m.telefono);

/** Miembros activos que cumplen los filtros (sin mirar consentimiento ni canal). */
export async function filtrarMiembros(f: Filtros, miembros?: Doc[]): Promise<Doc[]> {
  const conLote = new Set<string>();
  if (f.segmento === "productores_sin_lote") for (const l of await listar("lotes")) conLote.add(str(l.productor_id ?? l.published_by));
  let enCurso: Set<string> | null = null;
  if (f.curso) {
    enCurso = new Set();
    for (const [k, i] of Object.entries(await mapa("inscripciones-cursos"))) {
      if (!i || typeof i !== "object") continue;
      const [cid, uidM] = k.split("::");
      if ((str(i.curso) || cid) === f.curso && ESTADOS_CURSO.includes(str(i.estado || "pendiente"))) enCurso.add(str(i.usuario) || uidM);
    }
  }
  const hoy = new Date(); hoy.setUTCHours(0, 0, 0, 0);
  const limite = hoy.getTime() - 30 * 86400_000;
  const out: Doc[] = [];
  for (const m of miembros ?? (await todosLosMiembros())) {
    if (!str(m.id) || !activo(m)) continue;
    if (f.ids && !f.ids.includes(str(m.id))) continue;
    const roles = miembroRoles(m);
    if (f.roles.length && !f.roles.some((r) => roles.includes(r))) continue;
    if (f.provincia && str(m.provincia) !== f.provincia) continue;
    if (enCurso && !enCurso.has(str(m.id))) continue;
    if (f.segmento === "productores_sin_lote" && (!roles.includes("productor") || conLote.has(str(m.id)))) continue;
    if (f.segmento === "nuevos_30_dias" && (Date.parse(str(m.created_at)) || 0) < limite) continue;
    out.push(m);
  }
  return out;
}

/** Recuento por canal para mostrar antes de enviar. */
export function resumenCanales(ms: Doc[]) {
  let correo = 0, whatsapp = 0, sinConsentimiento = 0;
  for (const m of ms) {
    const c = aceptaNovedades(m), w = aceptaWhatsapp(m);
    if (!c && !w) { sinConsentimiento++; continue; }
    if (c && emailValido(str(m.email))) correo++;
    if (w && whatsappDe(m)) whatsapp++;
  }
  return { total: ms.length, con_correo: correo, con_whatsapp: whatsapp, sin_consentimiento: sinConsentimiento };
}
