import { exigirDerechos } from "../lib/derechos.js";
// Port de api/empleos.php: bolsa de empleo y postulaciones.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { miembroRoles, requiereUsuario, tieneRol, usuarioActual } from "../lib/usuarios.js";
import { notificar, notificarAdmins, publicarAvisoComunidad, registrarActividad } from "../lib/avisos.js";
import { int, nowIso, str, uid, whatsappDisplay } from "../lib/util.js";
import { enumerado, fechaCierre, numero, siNo, texto, vencido } from "../lib/validar.js";

const CATEGORIAS = ["barismo", "produccion-agricola", "beneficio-pilado", "tueste", "calidad-catacion", "ventas", "logistica-transporte", "administracion", "tecnico-agronomo", "otro"];
const MODALIDADES = ["presencial", "hibrido", "remoto"], JORNADAS = ["tiempo-completo", "medio-tiempo", "por-horas", "temporal", "por-obra"];
const PERIODOS = ["hora", "dia", "mes", "obra"], EXPERIENCIAS = ["sin-experiencia", "1-2-anios", "3-5-anios", "mas-5-anios"];
const CONTACTOS = ["plataforma", "whatsapp", "correo"], ESTADOS = ["abierta", "pausada", "cerrada"];
const POSTULACION_ESTADOS = ["recibida", "en-revision", "preseleccionado", "descartada", "contratado"];
const CONTRATAN = ["productor", "vendedor", "comprador", "bar", "barista", "certificador", "transportista", "pilador", "exportador", "proveedor", "asesor"];

async function usuarioOAdmin(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  if (u) return u;
  if (ctx.ses.d.admin) return { id: "admin", nombre: "Administración", rol: "admin", roles: ["admin"] };
  fail("No autenticado.", 401);
}
const esAdmin = (ctx: Ctx, u: Doc | null) => !!ctx.ses.d.admin || (!!u && tieneRol(ctx, u, "admin"));
const puedeContratar = (ctx: Ctx, u: Doc) => esAdmin(ctx, u) || miembroRoles(u).some((r) => CONTRATAN.includes(r));
const autorizado = (ctx: Ctx, e: Doc, u: Doc) => esAdmin(ctx, u) || str(e.autor_id) === str(u.id);
const porFecha = (a: Doc, b: Doc) => str(b.created_at).localeCompare(str(a.created_at));
const sinContactoPostulante = ({ postulante_email, postulante_telefono, ...r }: Doc) => (void postulante_email, void postulante_telefono, r);

function publico(ctx: Ctx, e: Doc, u: Doc | null = null): Doc {
  const admin = u ? esAdmin(ctx, u) : !!ctx.ses.d.admin;
  const dueno = !!u && str(e.autor_id) === str(u.id);
  const { autor_email, autor_telefono, autor_whatsapp, ...out } = e;
  void autor_email; void autor_telefono; void autor_whatsapp;
  if (!out.mostrarSalario && !admin && !dueno) { delete out.salarioDesde; delete out.salarioHasta; }
  return out;
}

function validar(i: Doc, u: Doc, actual: Doc | null = null): Doc {
  const desde = numero(i.salarioDesde, "Salario desde"), hasta = numero(i.salarioHasta, "Salario hasta");
  if (desde !== null && hasta !== null && desde > hasta) fail("El salario desde no puede superar al salario hasta.", 422);
  const vacantes = int(i.vacantes ?? 0);
  if (vacantes < 1 || vacantes > 99) fail("Vacantes debe estar entre 1 y 99.", 422);
  const estado = enumerado(i.estado ?? actual?.estado ?? "abierta", "Estado", ESTADOS);
  const ahora = nowIso();
  return {
    id: actual?.id ?? uid(),
    titulo: texto(i.titulo, "Título", 5, 120), descripcion: texto(i.descripcion, "Descripción", 20, 3000),
    categoria: enumerado(i.categoria, "Categoría", CATEGORIAS), modalidad: enumerado(i.modalidad, "Modalidad", MODALIDADES),
    jornada: enumerado(i.jornada, "Jornada", JORNADAS), provincia: texto(i.provincia, "Provincia", 2, 80), canton: texto(i.canton, "Cantón", 0, 80, true),
    salarioDesde: desde, salarioHasta: hasta, salarioPeriodo: enumerado(i.salarioPeriodo, "Periodo de salario", PERIODOS),
    mostrarSalario: siNo(i.mostrarSalario ?? false), experiencia: enumerado(i.experiencia, "Experiencia", EXPERIENCIAS), vacantes,
    cierra: fechaCierre(i.cierra), contactoPreferido: enumerado(i.contactoPreferido, "Contacto preferido", CONTACTOS), estado,
    empresa: texto(i.empresa, "Empresa", 0, 120, true),
    autor_id: actual?.autor_id ?? str(u.id), autor: actual?.autor ?? str(u.nombre), autor_rol: actual?.autor_rol ?? str(u.rol),
    autor_roles: actual?.autor_roles ?? miembroRoles(u), autor_email: actual?.autor_email ?? str(u.email),
    autor_telefono: actual?.autor_telefono ?? whatsappDisplay(u.whatsapp || u.telefono || ""),
    created_at: actual?.created_at ?? ahora, updated_at: ahora,
  };
}

const idDe = (ctx: Ctx) => str(ctx.in.id ?? ctx.in.empleo_id ?? ctx.query.id).trim();

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    let vis = (await listar("empleos")).filter((e) => e.estado === "abierta" && !vencido(e));
    for (const f of ["categoria", "provincia", "modalidad", "jornada"]) {
      const v = str(ctx.query[f] ?? ctx.in[f]).trim();
      if (v) vis = vis.filter((e) => str(e[f]) === v);
    }
    return { empleos: vis.sort(porFecha).map((e) => publico(ctx, e)) };
  },

  async get(ctx) {
    const id = str(ctx.query.id ?? ctx.in.id).trim();
    if (!id) fail("ID requerido.", 422);
    const u = await usuarioActual(ctx);
    const e = (await listar("empleos")).find((x) => str(x.id) === id);
    if (!e) fail("Oferta no encontrada.", 404);
    if ((e.estado !== "abierta" || vencido(e)) && (!u || !autorizado(ctx, e, u))) fail("Oferta no encontrada.", 404);
    const out = publico(ctx, e, u);
    if (u) out.ya_postule = (await listar("postulaciones")).some((p) => p.empleo_id === id && p.postulante_id === u.id);
    return { empleo: out };
  },

  async mias(ctx) {
    const u = await usuarioOAdmin(ctx);
    const admin = esAdmin(ctx, u);
    const posts = await listar("postulaciones");
    const mias = (await listar("empleos")).filter((e) => !e.eliminada && (admin || str(e.autor_id) === u.id))
      .map((e) => ({ ...e, postulaciones_count: posts.filter((p) => p.empleo_id === e.id).length })).sort(porFecha);
    return { empleos: mias, puede_contratar: puedeContratar(ctx, u), admin };
  },

  async publish(ctx) {
    if (!(await cupo(ctx, "empleo_publicar", 20, 3600))) fail("Demasiadas ofertas publicadas seguidas. Vuelve a intentarlo en una hora.", 429);
    const u = await usuarioOAdmin(ctx);
    if (!puedeContratar(ctx, u)) fail("Este perfil puede postular, pero no publicar ofertas.", 403);
    const e = validar(ctx.in, u);
    if (!ctx.ses.d.admin) Object.assign(e, await exigirDerechos(ctx, u, "empleos.publish", e.id));
    await mutar("empleos", (l) => [...l, e]);
    await registrarActividad(ctx, "empleo-publicado", { actor_id: u.id, actor: u.nombre, rol: u.rol, objeto_tipo: "empleo", objeto_id: e.id, detalle: e.titulo, ref: e.provincia });
    await publicarAvisoComunidad("empleo", e);
    await notificarAdmins("servicio", "Nueva oferta de empleo: " + e.titulo, `${e.autor} · ${e.provincia}`, "/panel/");
    return { empleo: publico(ctx, e, u) };
  },

  async update(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("ID requerido.", 422);
    const derechos = ctx.ses.d.admin ? {} : await exigirDerechos(ctx, u, "empleos.update", id);
    let act: Doc | null = null;
    await mutar("empleos", (l) => l.map((e) => {
      if (str(e.id) !== id) return e;
      if (!autorizado(ctx, e, u)) fail("No autorizado.", 403);
      act = { ...validar(ctx.in, u, e), ...derechos };
      return act;
    }));
    if (!act) fail("Oferta no encontrada.", 404);
    return { empleo: act };
  },

  async cerrar(ctx) { return cambiarEstado(ctx, false); },
  async delete(ctx) { return cambiarEstado(ctx, true); },

  async postular(ctx) {
    const u = await requiereUsuario(ctx);
    if (!(await cupo(ctx, "empleo_postular", 30, 3600))) fail("Demasiadas postulaciones seguidas. Vuelve a intentarlo en una hora.", 429);
    const id = idDe(ctx);
    if (!id) fail("ID requerido.", 422);
    const mensaje = texto(ctx.in.mensaje, "Mensaje", 20, 1500), telefono = texto(ctx.in.telefono, "Teléfono", 0, 40, true);
    const e = (await listar("empleos")).find((x) => str(x.id) === id);
    if (!e) fail("Oferta no encontrada.", 404);
    if (str(e.autor_id) === u.id) fail("No puedes postular a tu propia oferta.", 422);
    if (e.estado !== "abierta" || vencido(e)) fail("La oferta ya no recibe postulaciones.", 409);
    const ahora = nowIso();
    const p = {
      id: uid(), empleo_id: id, postulante_id: u.id, postulante: u.nombre, postulante_rol: u.rol ?? "", postulante_roles: miembroRoles(u),
      postulante_provincia: u.provincia ?? "", postulante_email: u.email ?? "", postulante_telefono: whatsappDisplay(telefono || u.whatsapp || u.telefono || ""),
      mensaje, estado: "recibida", created_at: ahora, updated_at: ahora,
    };
    // En PHP esta escritura iba sin bloqueo: postulaciones simultáneas se perdían.
    await mutar("postulaciones", (l) => {
      if (l.some((x) => x.empleo_id === id && x.postulante_id === u.id)) fail("Ya postulaste a esta oferta.", 409);
      return [...l, p];
    });
    await notificar(str(e.autor_id), "servicio", "Nueva postulación: " + str(e.titulo), `${p.postulante} postuló a tu oferta.`, "/panel/");
    await registrarActividad(ctx, "empleo-postulacion", { actor_id: p.postulante_id, actor: p.postulante, rol: p.postulante_rol, objeto_tipo: "empleo", objeto_id: id, detalle: str(e.titulo), contraparte: str(e.autor) });
    return { postulacion: sinContactoPostulante(p) };
  },

  async postulaciones(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = idDe(ctx);
    if (!id) fail("ID requerido.", 422);
    const e = (await listar("empleos")).find((x) => str(x.id) === id);
    if (!e) fail("Oferta no encontrada.", 404);
    if (!autorizado(ctx, e, u)) fail("No autorizado.", 403);
    let ps = (await listar("postulaciones")).filter((p) => p.empleo_id === id);
    if (str(e.autor_id) !== u.id) ps = ps.map(sinContactoPostulante);
    return { postulaciones: ps.sort(porFecha), empleo: { id, titulo: str(e.titulo) } };
  },

  async mis_postulaciones(ctx) {
    const u = await requiereUsuario(ctx);
    const empleos = await listar("empleos");
    const mias = (await listar("postulaciones")).filter((p) => p.postulante_id === u.id).map((p) => {
      const e = empleos.find((x) => str(x.id) === str(p.empleo_id));
      return { ...sinContactoPostulante(p), empleo: e ? publico(ctx, e, u) : null };
    }).sort(porFecha);
    return { postulaciones: mias };
  },

  async resolver(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    const estado = enumerado(ctx.in.estado, "Estado", POSTULACION_ESTADOS);
    if (!id) fail("ID requerido.", 422);
    const p = (await listar("postulaciones")).find((x) => str(x.id) === id);
    if (!p) fail("Postulación no encontrada.", 404);
    const e = (await listar("empleos")).find((x) => str(x.id) === str(p.empleo_id));
    if (!e) fail("Oferta no encontrada.", 404);
    if (!autorizado(ctx, e, u)) fail("No autorizado.", 403);
    let act: Doc | null = null;
    await mutar("postulaciones", (l) => l.map((x) => (str(x.id) !== id ? x : (act = { ...x, estado, updated_at: nowIso() }))));
    await notificar(str((act as Doc | null)?.postulante_id), "servicio", "Tu postulación cambió de estado", `Estado: ${estado} · ${str(e.titulo)}`, "/panel/");
    return { postulacion: act };
  },
};

async function cambiarEstado(ctx: Ctx, eliminar: boolean) {
  const u = await usuarioOAdmin(ctx);
  const id = str(ctx.in.id ?? ctx.query.id).trim();
  if (!id) fail("ID requerido.", 422);
  let act: Doc | null = null;
  await mutar("empleos", (l) => l.map((e) => {
    if (str(e.id) !== id) return e;
    if (!autorizado(ctx, e, u)) fail("No autorizado.", 403);
    // Al eliminar se conserva cerrada: las postulaciones mantienen contexto.
    act = { ...e, estado: "cerrada", updated_at: nowIso(), ...(eliminar ? { eliminada: true } : {}) };
    return act;
  }));
  if (!act) fail("Oferta no encontrada.", 404);
  if (eliminar) await mutar("postulaciones", (l) => l.map((p) => (str(p.empleo_id) === id ? { ...p, oferta_eliminada: true } : p)));
  return { empleo: act };
}

export const empleos: Modulo = { acciones };
