// Port de api/recordatorios.php: avisos periódicos por perfil (los de la
// administración y dos sugerencias automáticas: publicar lote / requerimiento).
// Todo el estado vive en el mapa «recordatorios-config» {campanas, usuarios},
// actualizado bajo bloqueo como en PHP. Las acciones que escriben exigen POST
// y la cabecera X-RC-TOKEN con el token de la sesión.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutarMapa, mapa, type Doc } from "../lib/docs.js";
import { ROLES_MIEMBRO, miembroRoles, requiereAdmin, requiereUsuario } from "../lib/usuarios.js";
import { largo, str } from "../lib/util.js";

const BASE: Doc[] = [
  { id: "lote", titulo: "Publica tu lote de café", texto: "Muestra tu café en el marketplace para que los compradores conozcan tu oferta.", enlace: "/panel/?ver=publicar", roles: ["productor"], dias: 7, activo: true, inicio: 0, fin: 0 },
  { id: "requerimiento", titulo: "Publica el café que necesitas", texto: "Indica cantidad, origen y calidad para recibir ofertas de los miembros de la Red.", enlace: "/panel/#redcafe-requerimientos-panel", roles: ["comprador", "vendedor", "bar", "exportador", "barista", "amante"], dias: 7, activo: true, inicio: 0, fin: 0 },
];
const ahora = () => Math.floor(Date.now() / 1000);
const seg = (s: unknown) => { const t = Date.parse(str(s)); return Number.isFinite(t) ? Math.floor(t / 1000) : NaN; };

function token(ctx: Ctx): string {
  let t = str(ctx.ses.d.datos.rc_recordatorios_csrf);
  if (!t) {
    t = randomBytes(24).toString("hex");
    ctx.ses.set({ datos: { ...ctx.ses.d.datos, rc_recordatorios_csrf: t } });
  }
  return t;
}

function exigirPost(ctx: Ctx) {
  if (ctx.metodo !== "POST") fail("Usa POST.", 405);
  const a = Buffer.from(token(ctx)), b = Buffer.from(ctx.cabecera("x-rc-token"));
  if (a.length !== b.length || !timingSafeEqual(a, b)) fail("Sesion caducada. Recarga la pagina.", 403);
}

const guardar = <T>(fn: (d: Doc) => T) => {
  let res!: T;
  return mutarMapa("recordatorios-config", (d) => {
    d.campanas ??= {}; d.usuarios ??= {};
    if (Array.isArray(d.campanas)) d.campanas = {};
    if (Array.isArray(d.usuarios)) d.usuarios = {};
    res = fn(d);
    return d;
  }).then(() => res);
};

async function aplica(c: Doc, u: Doc, now: number, cache: Map<string, Doc[]>): Promise<boolean> {
  if (!c.activo || c.inicio > now || (c.fin && c.fin <= now)) return false;
  if (c.roles?.length && !c.roles.some((r: string) => miembroRoles(u).includes(r))) return false;
  if (c.id === "lote" || c.id === "requerimiento") {
    const creado = seg(u.created_at);
    if (now - (Number.isFinite(creado) ? creado : now) < 86400) return false;
    const col = c.id === "lote" ? "lotes" : "requerimientos";
    if (!cache.has(col)) cache.set(col, await listar(col));
    for (const r of cache.get(col)!) {
      const duenio = c.id === "lote" ? (r.productor_id ?? r.published_by ?? "") : (r.autor_id ?? "");
      if (str(duenio) !== str(u.id)) continue;
      if (c.id === "lote" && !r.oculto) return false;
      if (c.id === "requerimiento" && r.estado === "abierta" && (!r.cierra || seg(r.cierra + "T23:59:59Z") > now)) return false;
    }
  }
  return true;
}

const ENLACE = /^\/(?!\/)[a-zA-Z0-9/_?=&#%.+-]*$/;

const acciones: Modulo["acciones"] = {
  async "admin-list"(ctx) {
    requiereAdmin(ctx);
    const d = await mapa("recordatorios-config");
    return { campanas: Object.values(d.campanas ?? {}), token: token(ctx) };
  },

  async guardar(ctx) {
    requiereAdmin(ctx);
    exigirPost(ctx);
    const i = ctx.in;
    const titulo = str(i.titulo).trim(), texto = str(i.texto).trim(), enlace = str(i.enlace).trim();
    const roles = i.roles ?? [], dias = i.dias ?? 0;
    if (largo(titulo) < 5 || largo(titulo) > 100 || largo(texto) < 10 || largo(texto) > 400) fail("Revisa el titulo y el mensaje.", 422);
    if (enlace !== "" && (!ENLACE.test(enlace) || enlace.includes(".."))) fail("Usa un enlace interno de la plataforma.", 422);
    const diasN = typeof dias === "number" ? dias : /^-?\d+$/.test(str(dias)) ? Number(dias) : NaN;
    if (!Array.isArray(roles) || roles.some((r) => !ROLES_MIEMBRO.includes(str(r))) || ![0, 1, 7, 30].includes(diasN)) fail("Perfil o frecuencia no validos.", 422);
    const inicio = i.inicio ? seg(i.inicio) : ahora();
    const fin = i.fin ? seg(i.fin) : 0;
    if (Number.isNaN(inicio) || Number.isNaN(fin) || (fin && fin <= inicio)) fail("Revisa las fechas.", 422);
    const idIn = str(i.id).trim();
    return guardar((d) => {
      if (idIn && !d.campanas[idIn]) fail("Aviso no encontrado.", 422);
      if (!idIn && Object.keys(d.campanas).length >= 100) fail("Limite de 100 avisos.", 422);
      const id = idIn || "admin-" + randomBytes(8).toString("hex");
      d.campanas[id] = { id, titulo, texto, enlace, roles: [...new Set(roles.map(str))], dias: diasN, inicio, fin, activo: d.campanas[id]?.activo ?? true };
      return d.campanas[id];
    });
  },

  async estado(ctx) {
    requiereAdmin(ctx);
    exigirPost(ctx);
    const id = str(ctx.in.id);
    if (typeof ctx.in.activo !== "boolean") fail("Estado no valido.", 422);
    return guardar((d) => {
      if (!d.campanas[id]) fail("Aviso no encontrado.", 422);
      d.campanas[id].activo = ctx.in.activo;
      return { actualizado: true };
    });
  },

  async list(ctx) {
    await requiereUsuario(ctx);
    return { token: token(ctx) };
  },

  async entregar(ctx) {
    const u = await requiereUsuario(ctx);
    exigirPost(ctx);
    const uid = str(u.id), now = ahora(), cache = new Map<string, Doc[]>();
    // Las comprobaciones de lotes/requerimientos se leen antes del bloqueo.
    const previo = await mapa("recordatorios-config");
    const candidatas: Doc[] = [];
    for (const c of [...BASE, ...Object.values<Doc>(previo.campanas ?? {})]) if (await aplica(c, u, now, cache)) candidatas.push(c);
    return guardar((d) => {
      const out: Doc[] = [];
      for (const c0 of candidatas) {
        const c = d.campanas[c0.id] ?? c0;
        if (!c.activo) continue;
        d.usuarios[uid] ??= {};
        const s: Doc = d.usuarios[uid][c.id] ?? {};
        if (s.desactivado || (s.pospuesto ?? 0) > now) continue;
        if (s.ultimo !== undefined && (!c.dias || now - s.ultimo < c.dias * 86400) && s.leido) continue;
        if (s.ultimo === undefined || (c.dias && now - s.ultimo >= c.dias * 86400)) {
          s.ultimo = now; s.leido = false;
          d.usuarios[uid][c.id] = s;
        }
        out.push({ ...c, ts: new Date(s.ultimo * 1000).toISOString().replace(/\.\d{3}Z$/, "+00:00") });
      }
      out.sort((a, b) => str(a.id).localeCompare(str(b.id)));
      return { recordatorios: out };
    });
  },

  async preferencia(ctx) {
    const u = await requiereUsuario(ctx);
    exigirPost(ctx);
    const uid = str(u.id), id = str(ctx.in.id), modo = ctx.in.modo;
    if (!["leido", "posponer", "desactivar", "reactivar"].includes(str(modo))) fail("Preferencia no valida.", 422);
    return guardar((d) => {
      if (!["lote", "requerimiento"].includes(id) && !d.campanas[id]) fail("Aviso no encontrado.", 422);
      d.usuarios[uid] ??= {};
      const s: Doc = d.usuarios[uid][id] ?? {};
      if (modo === "leido") s.leido = true;
      if (modo === "posponer") s.pospuesto = ahora() + 7 * 86400;
      if (modo === "desactivar") s.desactivado = true;
      if (modo === "reactivar") { s.desactivado = false; s.pospuesto = 0; }
      d.usuarios[uid][id] = s;
      return { guardado: true };
    });
  },
};

export const recordatorios: Modulo = { acciones, porDefecto: "list", noValida: { mensaje: "Accion no valida.", codigo: 400 } };
