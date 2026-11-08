// Port de api/difusion.php: campañas de WhatsApp que la administración envía
// a mano (enlaces wa.me). Solo guarda la lista congelada y lo ya enviado.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { miembroRoles, tieneRol, usuarioActual } from "../lib/usuarios.js";
import { aceptaNovedades, filtrarMiembros, leerFiltros, siNo, telefonoInternacional, whatsappDe } from "../lib/audiencia.js";
import { registrarActividad } from "../lib/avisos.js";
import { largo, nowIso, str, uid } from "../lib/util.js";

const MAX_CAMPANAS = 50;
const SITIO = "https://redcafeecuador.com";

async function soloAdmin(ctx: Ctx) {
  if (ctx.ses.d.admin) return;
  const u = await usuarioActual(ctx);
  if (!u || !tieneRol(ctx, u, "admin")) fail("Solo administradores.", 403);
}

export { telefonoInternacional };

function filtros(i: Doc) {
  return { ...leerFiltros(i), solo_consentimiento: siNo(i.solo_consentimiento, true) };
}

async function calcular(f: ReturnType<typeof filtros>) {
  const destinatarios: Doc[] = [];
  let sinConsentimiento = 0, sinTelefono = 0;
  for (const m of await filtrarMiembros(f)) {
    if (f.solo_consentimiento && !aceptaNovedades(m)) { sinConsentimiento++; continue; }
    const tel = whatsappDe(m);
    if (!tel) { sinTelefono++; continue; }
    destinatarios.push({ id: str(m.id), nombre: str(m.nombre), telefono: tel, roles: miembroRoles(m), provincia: str(m.provincia) });
  }
  return { destinatarios, sinConsentimiento, sinTelefono };
}

function enlaceFinal(e: string): string {
  e = [...e.trim()].slice(0, 500).join("");
  if (!e) return "";
  if (e.startsWith("/") && !e.startsWith("//") && !e.includes("..")) return SITIO + e;
  return /^https:\/\/\S{3,}$/i.test(e) ? e : "";
}
const buscar = async (id: string) => (await listar("difusiones")).find((c) => str(c.id) === id) ?? null;

const acciones: Modulo["acciones"] = {
  async destinatarios(ctx) {
    await soloAdmin(ctx);
    const f = filtros(ctx.in);
    const r = await calcular(f);
    return { destinatarios: r.destinatarios, total: r.destinatarios.length, sin_telefono: r.sinTelefono, sin_consentimiento: r.sinConsentimiento, filtros: f };
  },
  async guardar(ctx) {
    await soloAdmin(ctx);
    const titulo = str(ctx.in.titulo).trim(), mensaje = str(ctx.in.mensaje).trim();
    if (largo(titulo) < 3 || largo(titulo) > 200) fail("Título interno: entre 3 y 200 caracteres.", 422);
    if (!mensaje || largo(mensaje) > 1000) fail("El mensaje es obligatorio y no puede pasar de 1000 caracteres.", 422);
    const enlace = enlaceFinal(str(ctx.in.enlace));
    const f = filtros(ctx.in.filtros && typeof ctx.in.filtros === "object" && !Array.isArray(ctx.in.filtros) ? (ctx.in.filtros as Doc) : ctx.in);
    const { destinatarios } = await calcular(f);
    if (!destinatarios.length) fail("Con esos filtros la lista queda vacía: no hay destinatarios.", 422);
    const id = uid();
    await mutar("difusiones", (todas) => {
      todas.push({ id, titulo, mensaje, enlace, filtros: f, destinatarios, creada_at: nowIso(), creada_por: "admin", enviados: {} });
      if (todas.length > MAX_CAMPANAS) todas = todas.sort((a, b) => (Date.parse(str(a.creada_at)) || 0) - (Date.parse(str(b.creada_at)) || 0)).slice(-MAX_CAMPANAS);
      return todas;
    });
    await registrarActividad(ctx, "difusion", { objeto_tipo: "difusion", objeto_id: id, detalle: `Campaña de WhatsApp «${titulo}» · ${destinatarios.length} destinatarios` });
    return { id, campaign: await buscar(id) };
  },
  async list(ctx) {
    await soloAdmin(ctx);
    const out = (await listar("difusiones")).map((c) => ({
      id: str(c.id), titulo: str(c.titulo), creada_at: str(c.creada_at),
      total: (c.destinatarios ?? []).length, enviados_count: Object.keys(c.enviados ?? {}).length,
    }));
    out.sort((a, b) => (Date.parse(b.creada_at) || 0) - (Date.parse(a.creada_at) || 0));
    return { campaigns: out };
  },
  async get(ctx) {
    await soloAdmin(ctx);
    const id = str(ctx.in.id).trim();
    if (!id) fail("id requerido.", 422);
    const c = await buscar(id);
    if (!c) fail("Campaña no encontrada.", 404);
    return { campaign: c };
  },
  async marcar(ctx) {
    await soloAdmin(ctx);
    const id = str(ctx.in.id).trim(), destino = str(ctx.in.uid).trim(), enviado = siNo(ctx.in.enviado, true);
    if (!id || !destino) fail("id y uid requeridos.", 422);
    let campana: Doc | null = null;
    await mutar("difusiones", (todas) => {
      const c = todas.find((x) => str(x.id) === id);
      if (!c || !(c.destinatarios ?? []).some((d: Doc) => str(d.id) === destino)) return todas;
      if (!c.enviados || typeof c.enviados !== "object" || Array.isArray(c.enviados)) c.enviados = {};
      if (enviado) c.enviados[destino] = nowIso(); else delete c.enviados[destino];
      campana = c;
      return todas;
    });
    if (!campana) fail("Destinatario no encontrado en la campaña.", 404);
    return { campaign: campana };
  },
  async borrar(ctx) {
    await soloAdmin(ctx);
    const id = str(ctx.in.id).trim();
    if (!id) fail("id requerido.", 422);
    let borrado = false;
    await mutar("difusiones", (t) => { const r = t.filter((c) => str(c.id) !== id); borrado = r.length !== t.length; return r; });
    if (!borrado) fail("Campaña no encontrada.", 404);
    return { deleted: id };
  },
};

export const difusion: Modulo = { acciones, guardia: soloAdmin };
