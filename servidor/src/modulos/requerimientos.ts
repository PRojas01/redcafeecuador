import { exigirDerechos } from "../lib/derechos.js";
// Port de api/requerimientos.php («compro café») y sus ofertas.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { miembroRoles, requiereUsuario, tieneRol, usuarioActual } from "../lib/usuarios.js";
import { notificar, notificarAdmins, publicarAvisoComunidad, registrarActividad } from "../lib/avisos.js";
import { nowIso, str, uid, whatsappDisplay } from "../lib/util.js";
import { enumerado, fechaCierre, imagenes, numero, siNo, texto, vencido } from "../lib/validar.js";

const TIPOS = ["verde", "tostado", "cualquiera"], PROCESOS = ["lavado", "honey", "natural", "cualquiera"], UNIDADES = ["sacos", "quintales", "kg"];
const FRECUENCIAS = ["unica", "mensual", "trimestral", "anual"], CONTACTOS = ["plataforma", "whatsapp", "correo"], ESTADOS = ["abierta", "pausada", "cerrada"];
const OFERTA_ESTADOS = ["recibida", "en-revision", "preseleccionada", "descartada", "cerrada"];
const COMPRAN = ["comprador", "vendedor", "bar", "exportador", "barista", "amante"];

async function usuarioOAdmin(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  if (u) return u;
  if (ctx.ses.d.admin) return { id: "admin", nombre: "Administración", rol: "admin", roles: ["admin"] };
  fail("No autenticado.", 401);
}
const esAdmin = (ctx: Ctx, u: Doc | null) => !!ctx.ses.d.admin || (!!u && tieneRol(ctx, u, "admin"));
const puedePublicar = (ctx: Ctx, u: Doc) => esAdmin(ctx, u) || miembroRoles(u).some((r) => COMPRAN.includes(r));
const autorizado = (ctx: Ctx, r: Doc, u: Doc) => esAdmin(ctx, u) || str(r.autor_id) === str(u.id);
const porFecha = (a: Doc, b: Doc) => str(b.created_at).localeCompare(str(a.created_at));

function publico(ctx: Ctx, r: Doc, u: Doc | null): Doc {
  const admin = esAdmin(ctx, u);
  const dueno = !!u && str(r.autor_id) === str(u.id);
  const { autor_email, autor_telefono, ...out } = r;
  void autor_email; void autor_telefono;
  if (!u && !admin) out.contacto_restringido = true;
  if (!out.mostrarPrecio && !admin && !dueno) delete out.precioReferencia;
  return out;
}

function validar(i: Doc, u: Doc, actual: Doc | null = null): Doc {
  const cantidad = numero(i.cantidad, "Cantidad", 1_000_000);
  if (cantidad === null || cantidad <= 0) fail("Indica cuánto café buscas.", 422);
  const ahora = nowIso();
  return {
    id: actual?.id ?? uid(),
    titulo: texto(i.titulo, "Título", 5, 120),
    descripcion: texto(i.descripcion, "Descripción", 20, 3000),
    tipo: enumerado(i.tipo, "Tipo de café", TIPOS),
    variedad: texto(i.variedad, "Variedad", 0, 80, true),
    proceso: enumerado(i.proceso ?? "cualquiera", "Proceso", PROCESOS),
    provincia: texto(i.provincia, "Provincia de origen", 0, 80, true),
    cantidad,
    unidad: enumerado(i.unidad, "Unidad", UNIDADES),
    frecuencia: enumerado(i.frecuencia ?? "unica", "Frecuencia", FRECUENCIAS),
    precioReferencia: numero(i.precioReferencia, "Precio de referencia", 100000),
    mostrarPrecio: siNo(i.mostrarPrecio ?? false),
    puntajeMinimo: numero(i.puntajeMinimo, "Puntaje mínimo", 100),
    certificacion: texto(i.certificacion, "Certificación", 0, 120, true),
    cierra: fechaCierre(i.cierra),
    contactoPreferido: enumerado(i.contactoPreferido, "Contacto preferido", CONTACTOS),
    estado: enumerado(i.estado ?? actual?.estado ?? "abierta", "Estado", ESTADOS),
    empresa: texto(i.empresa, "Empresa", 0, 120, true),
    imagenes: "imagenes" in i ? imagenes(i.imagenes, 4) : actual?.imagenes ?? [],
    autor_id: actual?.autor_id ?? str(u.id),
    autor: actual?.autor ?? str(u.nombre),
    autor_rol: actual?.autor_rol ?? str(u.rol),
    autor_roles: actual?.autor_roles ?? miembroRoles(u),
    autor_email: actual?.autor_email ?? str(u.email),
    autor_telefono: actual?.autor_telefono ?? whatsappDisplay(u.whatsapp || u.telefono || ""),
    verificado: actual?.verificado ?? false,
    created_at: actual?.created_at ?? ahora,
    updated_at: ahora,
  };
}

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    let vis = (await listar("requerimientos")).filter((r) => r.estado === "abierta" && !vencido(r));
    for (const f of ["tipo", "proceso", "provincia", "frecuencia"]) {
      const v = str(ctx.query[f] ?? ctx.in[f]).trim();
      if (v) vis = vis.filter((r) => str(r[f]) === v);
    }
    const u = await usuarioActual(ctx);
    return { requerimientos: vis.sort(porFecha).map((r) => publico(ctx, r, u)), sesion: u !== null || !!ctx.ses.d.admin };
  },

  async get(ctx) {
    const id = str(ctx.query.id ?? ctx.in.id).trim();
    if (!id) fail("ID requerido.", 422);
    const u = await usuarioActual(ctx);
    const r = (await listar("requerimientos")).find((x) => str(x.id) === id);
    if (!r) fail("Requerimiento no encontrado.", 404);
    if ((r.estado !== "abierta" || vencido(r)) && (!u || !autorizado(ctx, r, u))) fail("Requerimiento no encontrado.", 404);
    const out = publico(ctx, r, u);
    if (u) out.ya_oferte = (await listar("ofertas-requerimiento")).some((o) => o.requerimiento_id === id && o.oferente_id === u.id);
    return { requerimiento: out };
  },

  async mios(ctx) {
    const u = await usuarioOAdmin(ctx);
    const admin = esAdmin(ctx, u);
    const ofertas = await listar("ofertas-requerimiento");
    const mios = (await listar("requerimientos")).filter((r) => admin || str(r.autor_id) === u.id)
      .map((r) => ({ ...r, ofertas_count: ofertas.filter((o) => o.requerimiento_id === r.id).length })).sort(porFecha);
    return { requerimientos: mios, puede_publicar: puedePublicar(ctx, u), admin };
  },

  async publish(ctx) {
    if (!(await cupo(ctx, "requerimiento_publicar", 20, 3600))) fail("Demasiados requerimientos seguidos. Vuelve a intentarlo en una hora.", 429);
    const u = await usuarioOAdmin(ctx);
    if (!puedePublicar(ctx, u)) fail("Tu perfil no publica requerimientos de café.", 403);
    const r = validar(ctx.in, u);
    if (!ctx.ses.d.admin) Object.assign(r, await exigirDerechos(ctx, u, "requerimientos.publish", r.id));
    await mutar("requerimientos", (l) => [...l, r]);
    await registrarActividad(ctx, "requerimiento-publicado", { actor_id: u.id, actor: u.nombre, rol: u.rol, objeto_tipo: "requerimiento", objeto_id: r.id, detalle: r.titulo, ref: r.provincia });
    await publicarAvisoComunidad("requerimiento", r);
    await notificarAdmins("servicio", "Nuevo requerimiento de café: " + r.titulo, `${r.autor} · ${r.cantidad} ${r.unidad}`, "/marketplace/");
    return { requerimiento: publico(ctx, r, u) };
  },

  async update(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("ID requerido.", 422);
    const derechos = ctx.ses.d.admin ? {} : await exigirDerechos(ctx, u, "requerimientos.update", id);
    let act: Doc | null = null;
    await mutar("requerimientos", (l) => l.map((r) => {
      if (str(r.id) !== id) return r;
      if (!autorizado(ctx, r, u)) fail("No autorizado.", 403);
      act = { ...validar(ctx.in, u, r), ...derechos };
      return act;
    }));
    if (!act) fail("Requerimiento no encontrado.", 404);
    return { requerimiento: act };
  },

  async cerrar(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("ID requerido.", 422);
    let hecho = false;
    await mutar("requerimientos", (l) => l.map((r) => {
      if (str(r.id) !== id) return r;
      if (!autorizado(ctx, r, u)) fail("No autorizado.", 403);
      hecho = true;
      return { ...r, estado: "cerrada", updated_at: nowIso() };
    }));
    if (!hecho) fail("Requerimiento no encontrado.", 404);
    return { cerrado: true };
  },

  async delete(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("ID requerido.", 422);
    let hecho = false;
    await mutar("requerimientos", (l) => l.filter((r) => {
      if (str(r.id) !== id) return true;
      if (!autorizado(ctx, r, u)) fail("No autorizado.", 403);
      hecho = true;
      return false;
    }));
    if (!hecho) fail("Requerimiento no encontrado.", 404);
    await mutar("ofertas-requerimiento", (l) => l.filter((o) => str(o.requerimiento_id) !== id));
    return { borrado: true };
  },

  async ofertar(ctx) {
    if (!(await cupo(ctx, "requerimiento_ofertar", 40, 3600))) fail("Demasiadas ofertas seguidas. Vuelve a intentarlo en una hora.", 429);
    const u = await requiereUsuario(ctx);
    const id = str(ctx.in.id ?? ctx.in.requerimiento_id).trim();
    if (!id) fail("ID requerido.", 422);
    const r = (await listar("requerimientos")).find((x) => str(x.id) === id);
    if (!r) fail("Requerimiento no encontrado.", 404);
    if (r.estado !== "abierta" || vencido(r)) fail("Este requerimiento ya no admite ofertas.", 409);
    if (str(r.autor_id) === u.id) fail("No puedes ofertar a tu propio requerimiento.", 422);
    const oferta = {
      id: uid(), requerimiento_id: id,
      mensaje: texto(ctx.in.mensaje, "Mensaje", 20, 1500), lote_id: texto(ctx.in.lote_id, "Lote", 0, 40, true),
      precio: numero(ctx.in.precio, "Precio ofrecido", 100000), cantidad: numero(ctx.in.cantidad, "Cantidad ofrecida", 1_000_000),
      estado: "recibida", oferente_id: u.id, oferente: u.nombre, oferente_rol: u.rol ?? "", oferente_provincia: u.provincia ?? "",
      oferente_email: u.email ?? "", oferente_telefono: whatsappDisplay(u.whatsapp || u.telefono || ""), created_at: nowIso(),
    };
    // La comprobación de oferta repetida va dentro del bloqueo.
    await mutar("ofertas-requerimiento", (l) => {
      if (l.some((o) => o.requerimiento_id === id && o.oferente_id === u.id)) fail("Ya enviaste una oferta a este requerimiento.", 409);
      return [...l, oferta];
    });
    await notificar(str(r.autor_id), "pedido", `Nueva oferta para «${r.titulo}»`, `${oferta.oferente} respondió a tu requerimiento de café.`, "/panel/");
    return { oferta };
  },

  async ofertas(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.query.id ?? ctx.in.id).trim();
    if (!id) fail("ID requerido.", 422);
    const r = (await listar("requerimientos")).find((x) => str(x.id) === id);
    if (!r) fail("Requerimiento no encontrado.", 404);
    if (!autorizado(ctx, r, u)) fail("No autorizado.", 403);
    return { ofertas: (await listar("ofertas-requerimiento")).filter((o) => o.requerimiento_id === id).sort(porFecha) };
  },

  async mis_ofertas(ctx) {
    const u = await requiereUsuario(ctx);
    const reqs = await listar("requerimientos");
    const mias = (await listar("ofertas-requerimiento")).filter((o) => o.oferente_id === u.id).map((o) => {
      const r = reqs.find((x) => str(x.id) === str(o.requerimiento_id));
      return { ...o, requerimiento: r ? publico(ctx, r, u) : null };
    }).sort(porFecha);
    return { ofertas: mias };
  },

  async resolver(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.in.id).trim();
    if (!id) fail("ID requerido.", 422);
    const estado = enumerado(ctx.in.estado, "Estado", OFERTA_ESTADOS);
    const reqs = await listar("requerimientos");
    let hecho = false;
    await mutar("ofertas-requerimiento", (l) => l.map((o) => {
      if (str(o.id) !== id) return o;
      const r = reqs.find((x) => str(x.id) === str(o.requerimiento_id));
      if (!r || !autorizado(ctx, r, u)) fail("No autorizado.", 403);
      hecho = true;
      return { ...o, estado, updated_at: nowIso() };
    }));
    if (!hecho) fail("Oferta no encontrada.", 404);
    return { actualizado: true };
  },
};

export const requerimientos: Modulo = { acciones };
