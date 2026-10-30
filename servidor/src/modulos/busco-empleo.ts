import { exigirDerechos } from "../lib/derechos.js";
// Port de api/busco-empleo.php: quien busca trabajo y quien se interesa.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { miembroRoles, requiereUsuario, tieneRol, usuarioActual } from "../lib/usuarios.js";
import { notificar, registrarActividad } from "../lib/avisos.js";
import { nowIso, str, uid, whatsappDisplay } from "../lib/util.js";
import { enumerado, fechaCierre, numero, siNo, texto, vencido } from "../lib/validar.js";

const CATEGORIAS = ["barismo", "produccion-agricola", "beneficio-pilado", "tueste", "calidad-catacion", "ventas", "logistica-transporte", "administracion", "tecnico-agronomo", "otro"];
const MODALIDADES = ["presencial", "hibrido", "remoto", "cualquiera"], JORNADAS = ["tiempo-completo", "medio-tiempo", "por-horas", "temporal", "por-obra", "cualquiera"];
const EXPERIENCIAS = ["sin-experiencia", "1-2-anios", "3-5-anios", "mas-5-anios"], DISPONIBILIDAD = ["inmediata", "dos-semanas", "un-mes", "a-convenir"];
const PERIODOS = ["hora", "dia", "mes", "obra"], CONTACTOS = ["plataforma", "whatsapp", "correo"], ESTADOS = ["abierta", "pausada", "cerrada"];
const INTERES_ESTADOS = ["recibido", "en-conversacion", "descartado", "contratado"];

async function usuarioOAdmin(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  if (u) return u;
  if (ctx.ses.d.admin) return { id: "admin", nombre: "Administración", rol: "admin", roles: ["admin"] };
  fail("No autenticado.", 401);
}
const esAdmin = (ctx: Ctx, u: Doc | null) => !!ctx.ses.d.admin || (!!u && tieneRol(ctx, u, "admin"));
const autorizado = (ctx: Ctx, b: Doc, u: Doc) => esAdmin(ctx, u) || str(b.autor_id) === str(u.id);
const porFecha = (a: Doc, b: Doc) => str(b.created_at).localeCompare(str(a.created_at));

function publica(ctx: Ctx, b: Doc, u: Doc | null): Doc {
  const admin = u ? esAdmin(ctx, u) : !!ctx.ses.d.admin;
  const dueno = !!u && str(b.autor_id) === str(u.id);
  const { autor_email, autor_telefono, ...out } = b;
  void autor_email; void autor_telefono;
  if (!u && !admin) out.contacto_restringido = true;
  if (!out.mostrarPretension && !admin && !dueno) { delete out.pretensionDesde; delete out.pretensionHasta; }
  return out;
}

function validar(i: Doc, u: Doc, actual: Doc | null = null): Doc {
  const desde = numero(i.pretensionDesde, "Pretensión desde", 1_000_000), hasta = numero(i.pretensionHasta, "Pretensión hasta", 1_000_000);
  if (desde !== null && hasta !== null && desde > hasta) fail("La pretensión mínima no puede superar a la máxima.", 422);
  const ahora = nowIso();
  return {
    id: actual?.id ?? uid(),
    titulo: texto(i.titulo, "Título", 5, 120), descripcion: texto(i.descripcion, "Descripción", 20, 3000),
    categoria: enumerado(i.categoria, "Área", CATEGORIAS), experiencia: enumerado(i.experiencia, "Experiencia", EXPERIENCIAS),
    modalidad: enumerado(i.modalidad ?? "cualquiera", "Modalidad", MODALIDADES), jornada: enumerado(i.jornada ?? "cualquiera", "Jornada", JORNADAS),
    disponibilidad: enumerado(i.disponibilidad ?? "a-convenir", "Disponibilidad", DISPONIBILIDAD),
    provincia: texto(i.provincia, "Provincia", 2, 80), canton: texto(i.canton, "Cantón", 0, 80, true),
    pretensionDesde: desde, pretensionHasta: hasta, pretensionPeriodo: enumerado(i.pretensionPeriodo ?? "mes", "Periodo", PERIODOS),
    mostrarPretension: siNo(i.mostrarPretension ?? false), cierra: fechaCierre(i.cierra, true),
    contactoPreferido: enumerado(i.contactoPreferido, "Contacto preferido", CONTACTOS),
    estado: enumerado(i.estado ?? actual?.estado ?? "abierta", "Estado", ESTADOS),
    autor_id: actual?.autor_id ?? str(u.id), autor: actual?.autor ?? str(u.nombre), autor_rol: actual?.autor_rol ?? str(u.rol),
    autor_roles: actual?.autor_roles ?? miembroRoles(u), autor_email: actual?.autor_email ?? str(u.email),
    autor_telefono: actual?.autor_telefono ?? whatsappDisplay(u.whatsapp || u.telefono || ""),
    created_at: actual?.created_at ?? ahora, updated_at: ahora,
  };
}

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    let vis = (await listar("busquedas-empleo")).filter((b) => b.estado === "abierta" && !vencido(b));
    for (const f of ["categoria", "provincia", "modalidad", "jornada", "experiencia"]) {
      const v = str(ctx.query[f] ?? ctx.in[f]).trim();
      if (v) vis = vis.filter((b) => str(b[f]) === v);
    }
    const u = await usuarioActual(ctx);
    return { busquedas: vis.sort(porFecha).map((b) => publica(ctx, b, u)), sesion: u !== null || !!ctx.ses.d.admin };
  },

  async get(ctx) {
    const id = str(ctx.query.id ?? ctx.in.id).trim();
    if (!id) fail("ID requerido.", 422);
    const u = await usuarioActual(ctx);
    const b = (await listar("busquedas-empleo")).find((x) => str(x.id) === id);
    if (!b) fail("Publicación no encontrada.", 404);
    if ((b.estado !== "abierta" || vencido(b)) && (!u || !autorizado(ctx, b, u))) fail("Publicación no encontrada.", 404);
    const out = publica(ctx, b, u);
    if (u) out.ya_contacte = (await listar("intereses-empleo")).some((i) => i.busqueda_id === id && i.empleador_id === u.id);
    return { busqueda: out };
  },

  async mias(ctx) {
    const u = await usuarioOAdmin(ctx);
    const intereses = await listar("intereses-empleo");
    const mias = (await listar("busquedas-empleo")).filter((b) => esAdmin(ctx, u) || str(b.autor_id) === u.id)
      .map((b) => ({ ...b, intereses_count: intereses.filter((i) => i.busqueda_id === b.id).length })).sort(porFecha);
    return { busquedas: mias };
  },

  async publish(ctx) {
    if (!(await cupo(ctx, "busqueda_publicar", 20, 3600))) fail("Demasiadas publicaciones seguidas. Vuelve a intentarlo en una hora.", 429);
    const u = await usuarioOAdmin(ctx);
    const b = validar(ctx.in, u);
    if (!ctx.ses.d.admin) Object.assign(b, await exigirDerechos(ctx, u, "busco-empleo.publish", b.id));
    await mutar("busquedas-empleo", (l) => [...l, b]);
    await registrarActividad(ctx, "busqueda-empleo-publicada", { actor_id: u.id, actor: u.nombre, rol: u.rol, objeto_tipo: "busqueda-empleo", objeto_id: b.id, detalle: b.titulo, ref: b.provincia });
    return { busqueda: publica(ctx, b, u) };
  },

  async update(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("ID requerido.", 422);
    const derechos = ctx.ses.d.admin ? {} : await exigirDerechos(ctx, u, "busco-empleo.update", id);
    let act: Doc | null = null;
    await mutar("busquedas-empleo", (l) => l.map((b) => {
      if (str(b.id) !== id) return b;
      if (!autorizado(ctx, b, u)) fail("No autorizado.", 403);
      act = { ...validar(ctx.in, u, b), ...derechos };
      return act;
    }));
    if (!act) fail("Publicación no encontrada.", 404);
    return { busqueda: act };
  },

  async cerrar(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("ID requerido.", 422);
    let hecho = false;
    await mutar("busquedas-empleo", (l) => l.map((b) => {
      if (str(b.id) !== id) return b;
      if (!autorizado(ctx, b, u)) fail("No autorizado.", 403);
      hecho = true;
      return { ...b, estado: "cerrada", updated_at: nowIso() };
    }));
    if (!hecho) fail("Publicación no encontrada.", 404);
    return { cerrado: true };
  },

  async delete(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("ID requerido.", 422);
    let hecho = false;
    await mutar("busquedas-empleo", (l) => l.filter((b) => {
      if (str(b.id) !== id) return true;
      if (!autorizado(ctx, b, u)) fail("No autorizado.", 403);
      hecho = true;
      return false;
    }));
    if (!hecho) fail("Publicación no encontrada.", 404);
    await mutar("intereses-empleo", (l) => l.filter((i) => str(i.busqueda_id) !== id));
    return { borrado: true };
  },

  async contactar(ctx) {
    if (!(await cupo(ctx, "busqueda_contactar", 40, 3600))) fail("Demasiados contactos seguidos. Vuelve a intentarlo en una hora.", 429);
    const u = await requiereUsuario(ctx);
    const id = str(ctx.in.id ?? ctx.in.busqueda_id).trim();
    if (!id) fail("ID requerido.", 422);
    const b = (await listar("busquedas-empleo")).find((x) => str(x.id) === id);
    if (!b) fail("Publicación no encontrada.", 404);
    if (b.estado !== "abierta" || vencido(b)) fail("Esta publicación ya no admite contactos.", 409);
    if (str(b.autor_id) === u.id) fail("No puedes contactarte a ti mismo.", 422);
    const interes = {
      id: uid(), busqueda_id: id, mensaje: texto(ctx.in.mensaje, "Mensaje", 20, 1500), estado: "recibido",
      empleador_id: u.id, empleador: u.nombre, empleador_rol: u.rol ?? "", empleador_empresa: texto(ctx.in.empresa, "Empresa", 0, 120, true),
      empleador_email: u.email ?? "", empleador_telefono: whatsappDisplay(u.whatsapp || u.telefono || ""), created_at: nowIso(),
    };
    await mutar("intereses-empleo", (l) => {
      if (l.some((i) => i.busqueda_id === id && i.empleador_id === u.id)) fail("Ya contactaste a esta persona.", 409);
      return [...l, interes];
    });
    await notificar(str(b.autor_id), "mensaje", `Le escribieron por «${b.titulo}»`, `${interes.empleador} vio su publicación en la bolsa de empleo.`, "/panel/");
    return { interes };
  },

  async intereses(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.query.id ?? ctx.in.id).trim();
    if (!id) fail("ID requerido.", 422);
    const b = (await listar("busquedas-empleo")).find((x) => str(x.id) === id);
    if (!b) fail("Publicación no encontrada.", 404);
    if (!autorizado(ctx, b, u)) fail("No autorizado.", 403);
    return { intereses: (await listar("intereses-empleo")).filter((i) => i.busqueda_id === id).sort(porFecha) };
  },

  async mis_contactos(ctx) {
    const u = await requiereUsuario(ctx);
    const bs = await listar("busquedas-empleo");
    const mios = (await listar("intereses-empleo")).filter((i) => i.empleador_id === u.id).map((i) => {
      const b = bs.find((x) => str(x.id) === str(i.busqueda_id));
      return { ...i, busqueda: b ? publica(ctx, b, u) : null };
    }).sort(porFecha);
    return { contactos: mios };
  },

  async resolver(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.in.id).trim();
    if (!id) fail("ID requerido.", 422);
    const estado = enumerado(ctx.in.estado, "Estado", INTERES_ESTADOS);
    const bs = await listar("busquedas-empleo");
    let hecho = false;
    await mutar("intereses-empleo", (l) => l.map((i) => {
      if (str(i.id) !== id) return i;
      const b = bs.find((x) => str(x.id) === str(i.busqueda_id));
      if (!b || !autorizado(ctx, b, u)) fail("No autorizado.", 403);
      hecho = true;
      return { ...i, estado, updated_at: nowIso() };
    }));
    if (!hecho) fail("Contacto no encontrado.", 404);
    return { actualizado: true };
  },
};

export const buscoEmpleo: Modulo = { acciones };
