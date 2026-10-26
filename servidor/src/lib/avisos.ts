// Port de api/_avisos.php y api/_comunidad-avisos.php: avisos a miembros,
// bitácora de la Red y novedades automáticas del muro. Nunca rompen la
// operación que los llama.
import { db, Prisma } from "./db.js";
import { agregar, campoSql, mutar, recortar, type Doc } from "./docs.js";
import type { Ctx } from "./http.js";
import { usuarioActual, miembroRoles, miembroEsPublico } from "./usuarios.js";
import { cortar, enlaceInterno, nowIso, sha256, str, uid } from "./util.js";

export const AVISOS_ADMIN_UID = "redcafe_admin";
export const AVISO_PAGOS_VERSION = "2026-10-23";
export const AVISO_PAGOS_TEXTO =
  "Red Café Ecuador no interviene en los pagos ni retiene dinero. No hagas transferencias ni depósitos si no estás seguro de la identidad de la otra parte. Verifica al vendedor, pide una muestra y acuerda la forma de pago por escrito antes de enviar dinero.";
const AVISO_TIPOS = ["pedido", "pedido-estado", "mensaje", "curso", "curso-acceso", "lote", "servicio", "miembro", "reporte", "sistema"];
import { pushEnSegundoPlano } from "./push.js";
const AVISOS_MAX = 3000;
const AVISO_VIDA_DIAS = 90;
const BITACORA_MAX = 6000;

/** notificar(): un aviso para un miembro. */
export async function notificar(uidDest: string, tipo: string, titulo: string, texto = "", enlace = "") {
  uidDest = uidDest.trim();
  if (!uidDest) return;
  if (!AVISO_TIPOS.includes(tipo)) tipo = "sistema";
  titulo = cortar(titulo.trim(), 140);
  if (!titulo) return;
  try {
    await agregar("notificaciones", {
      id: uid(), uid: uidDest, tipo, titulo,
      texto: cortar(texto.trim(), 400),
      enlace: enlaceInterno(enlace),
      ts: nowIso(), leido: false,
    });
    await podarAvisos();
  } catch (e) {
    console.error("[avisos] notificar", e);
  }
  // El push es auxiliar y no retrasa la respuesta (los recordatorios van sin push).
  if (!(tipo === "sistema" && titulo.startsWith("Recordatorio"))) pushEnSegundoPlano(uidDest, titulo, texto, enlace);
}

async function podarAvisos() {
  // Se quedan los recientes y, de los viejos, solo los no leídos; tope global.
  const limite = new Date(Date.now() - AVISO_VIDA_DIAS * 86400_000).toISOString();
  await db.$executeRaw(Prisma.sql`
    DELETE FROM Documento WHERE coleccion = 'notificaciones'
      AND ${campoSql("leido")} = 'true' AND ${campoSql("ts")} < ${limite}`);
  await recortar("notificaciones", AVISOS_MAX);
}

/** notificar_admins(): el mismo aviso para toda la administración. */
export async function notificarAdmins(tipo: string, titulo: string, texto = "", enlace = "") {
  try {
    await notificar(AVISOS_ADMIN_UID, tipo, titulo, texto, enlace);
    const admins = await db.usuario.findMany({ where: { OR: [{ admin: true }, { rol: "admin" }, { roles: { array_contains: "admin" } }] }, select: { id: true } });
    for (const a of admins) if (a.id !== AVISOS_ADMIN_UID) await notificar(a.id, tipo, titulo, texto, enlace);
  } catch (e) {
    console.error("[avisos] notificarAdmins", e);
  }
}

/** registrar_actividad(): una línea en la bitácora (sin IP en claro). */
export async function registrarActividad(ctx: Ctx | null, evento: string, datos: Doc = {}) {
  evento = evento.trim();
  if (!evento) return;
  try {
    const u = ctx ? await usuarioActual(ctx) : null;
    const ip = ctx?.ip ?? "";
    const linea = {
      id: uid(),
      ts: nowIso(),
      evento: cortar(evento, 40),
      actor_id: str(datos.actor_id ?? u?.id ?? ""),
      actor: cortar(str(datos.actor ?? u?.nombre ?? "Sistema"), 120),
      rol: cortar(str(datos.rol ?? u?.rol ?? ""), 40),
      objeto_tipo: cortar(str(datos.objeto_tipo), 30),
      objeto_id: cortar(str(datos.objeto_id), 60),
      ref: cortar(str(datos.ref), 80),
      detalle: cortar(str(datos.detalle), 300),
      monto: datos.monto !== undefined && datos.monto !== null ? Math.round(Number(datos.monto) * 100) / 100 : null,
      contraparte: cortar(str(datos.contraparte), 120),
      origen: ip ? sha256("redcafe|" + ip).slice(0, 10) : "",
    };
    await agregar("actividad", linea);
    await recortar("actividad", BITACORA_MAX);
  } catch (e) {
    console.error("[avisos] registrarActividad", e);
  }
}

/* ── Novedades automáticas del muro (_comunidad-avisos.php) ───────────── */

const COMUNIDAD_AVISOS_MAX = 300;
const TIPOS_AVISO = ["miembro", "lote", "servicio", "curso", "empleo", "requerimiento"];

const texto160 = (v: unknown) => cortar(str(v).trim().replace(/\s+/g, " "), 160);

function sinContacto(v: unknown): string {
  let s = texto160(v);
  s = s.replace(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi, "");
  s = s.replace(/(?:\+?593|0)?[\s().-]*(?:\d[\s().-]*){8,12}/g, "");
  return texto160(s);
}

const partes = (vals: unknown[]) => vals.map(texto160).filter(Boolean);

function precio(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) && str(v).trim() !== "" ? "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : texto160(v);
}

function perfil(m: Doc): string {
  let roles = miembroRoles(m).map(texto160).filter(Boolean);
  if (!roles.length && m.rol) roles = [texto160(m.rol)];
  if (!roles.length) return "miembro de la Red";
  roles = roles.slice(0, 3);
  if (roles.length === 1) return roles[0];
  const ultimo = roles.pop();
  return roles.join(", ") + " y " + ultimo;
}

function redactar(tipo: string, d: Doc): { titulo: string; text: string; enlace: string } {
  const idObj = str(d.id ?? d.objeto_id);
  if (tipo === "miembro") {
    const nombre = sinContacto(d.nombre) || "Nuevo miembro";
    const prov = texto160(d.provincia);
    return { titulo: "Nuevo miembro en la Red: " + nombre, text: nombre + " se suma como " + perfil(d) + (prov ? ", desde " + prov : "") + ".", enlace: "" };
  }
  if (tipo === "lote") {
    const finca = texto160(d.finca ?? d.titulo ?? "Lote de café");
    let t = partes([d.variedad, d.proceso, d.provincia]).join(" · ");
    const p = precio(d.precioSaco ?? d.precio_saco);
    if (p) t += (t ? ". " : "") + p + " el saco.";
    else if (t) t += ".";
    return { titulo: "Nuevo lote publicado: " + finca, text: t, enlace: "/marketplace/" + encodeURIComponent(idObj) + "/" };
  }
  if (tipo === "servicio") {
    let t = partes([d.categoria, d.provincia]).join(" · ");
    t += (t ? ". " : "") + "Lo ofrece " + texto160(d.proveedor ?? d.autor ?? "un miembro de la Red") + ".";
    return { titulo: "Nuevo servicio: " + texto160(d.titulo ?? "Servicio"), text: t, enlace: "/marketplace/?ver=servicios" };
  }
  if (tipo === "curso") {
    let t = partes([d.nivel, d.duracion]).join(" · ");
    t += (t ? ". " : "") + "Lo publica " + texto160(d.autor ?? "Red Café Ecuador") + ".";
    return { titulo: "Nuevo curso en la Academia: " + texto160(d.titulo ?? "Curso"), text: t, enlace: "/academia/" + encodeURIComponent(idObj) + "/" };
  }
  if (tipo === "requerimiento") {
    const cantidad = str(d.cantidad).trim();
    const unidad = texto160(d.unidad);
    let busca = "";
    if (cantidad !== "" && Number.isFinite(Number(cantidad))) {
      const n = Number(cantidad);
      const cifra = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
      const singular: Record<string, string> = { sacos: "saco", quintales: "quintal", kg: "kg" };
      busca = "Busca " + cifra + " " + (n === 1 && singular[unidad] ? singular[unidad] : unidad);
    }
    const rasgos = [d.variedad, d.proceso, d.provincia].filter((v) => str(v).trim() !== "" && str(v).trim() !== "cualquiera");
    let t = partes(rasgos).join(" · ");
    if (busca) t = busca + (t ? ". " + t + "." : ".");
    else if (t) t += ".";
    return { titulo: "Buscan café: " + texto160(d.titulo ?? "Requerimiento de café"), text: t, enlace: "/marketplace/?ver=requerimientos" };
  }
  const ps = partes([d.modalidad, d.jornada, d.provincia]);
  return { titulo: "Nueva oferta de empleo: " + texto160(d.titulo ?? "Oferta de empleo"), text: ps.join(" · ") + (ps.length ? "." : ""), enlace: "/marketplace/?ver=empleos" };
}

/** publicar_aviso_comunidad() */
export async function publicarAvisoComunidad(tipo: string, datos: Doc) {
  if (!TIPOS_AVISO.includes(tipo)) return;
  if (tipo === "miembro" && !miembroEsPublico(datos)) return;
  const objetoId = texto160(datos.objeto_id ?? datos.id);
  if (!objetoId) return;
  const a = redactar(tipo, datos);
  if (!a.titulo) return;
  const fecha = str(datos.created_at ?? datos.creado).trim();
  const post = {
    id: uid(), tipo: "aviso", aviso: tipo, objeto_id: objetoId,
    titulo: a.titulo, text: a.text, enlace: enlaceInterno(a.enlace),
    autor: "Red Café Ecuador", autor_id: "redcafe", autor_rol: "sistema",
    created_at: fecha && Number.isFinite(Date.parse(fecha)) ? fecha : nowIso(),
    imagenes: [], likes: [], comments: [],
  };
  try {
    await mutar("posts", (posts) => {
      if (posts.some((p) => p.tipo === "aviso" && p.aviso === tipo && str(p.objeto_id) === objetoId)) return posts;
      posts.push(post);
      return podarAvisosMuro(posts);
    });
  } catch (e) {
    console.error("[avisos] publicarAvisoComunidad", e);
  }
}

function podarAvisosMuro(posts: Doc[]): Doc[] {
  const avisos = posts.map((p, idx) => ({ p, idx })).filter((x) => x.p.tipo === "aviso");
  if (avisos.length <= COMUNIDAD_AVISOS_MAX) return posts;
  avisos.sort((a, b) => str(b.p.created_at).localeCompare(str(a.p.created_at)) || b.idx - a.idx);
  const mantener = new Set(avisos.slice(0, COMUNIDAD_AVISOS_MAX).map((x) => x.idx));
  return posts.filter((p, idx) => p.tipo !== "aviso" || mantener.has(idx));
}

/** Nombre de un miembro por id. */
export async function nombreMiembro(id: string): Promise<string> {
  if (!id) return "";
  const u = await db.usuario.findUnique({ where: { id }, select: { nombre: true } });
  return u?.nombre ?? "";
}
