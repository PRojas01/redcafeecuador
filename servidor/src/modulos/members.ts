// Port de api/members.php (versión corregida).
import { db, Prisma } from "../lib/db.js";
import { fail, type Modulo } from "../lib/http.js";
import { listar } from "../lib/docs.js";
import {
  miembroAdministracion, aDoc, cuentaRestringida, esAdmin, miembroEsPublico, miembroPublico, miembroRoles, requiereAdmin,
  requiereUsuario, restringidas, todosLosMiembros, validarRoles, invalidarUsuario,
} from "../lib/usuarios.js";
import { emailValido, largo, nowIso, str, textoEntrada } from "../lib/util.js";
import { cupo } from "../lib/seguridad.js";
import { extraCon, verificarPass } from "./auth.js";

async function bloqueosQuitarPerfiles(userId: string, actuales: string[], nuevos: string[]): Promise<string[]> {
  const quitados = actuales.filter((r) => !nuevos.includes(r));
  if (!quitados.length) return [];
  const bloqueos: string[] = [];
  const [lotes, menus, inventario, movimientos, pedidos] = await Promise.all(
    ["lotes", "menus", "inventario", "movimientos", "pedidos"].map((c) => listar(c)),
  );
  for (const rol of quitados) {
    if (rol === "productor" && lotes.some((l) => l.productor_id === userId || l.published_by === userId)) {
      bloqueos.push("No puedes quitar productor mientras tengas lotes publicados. Elimina u oculta esos lotes antes.");
    }
    if (rol === "bar" && menus.some((m) => m.owner_id === userId)) {
      bloqueos.push("No puedes quitar bar mientras tengas menú publicado. Elimina los productos del menú antes.");
    }
    if (["bar", "barista", "productor", "vendedor", "proveedor", "pilador"].includes(rol)
        && (inventario.some((i) => i.owner_id === userId) || movimientos.some((m) => m.owner_id === userId))) {
      bloqueos.push(`No puedes quitar ${rol} mientras tengas inventario o movimientos registrados. Vacía o elimina esos registros antes.`);
    }
    if (["productor", "vendedor", "comprador", "bar", "barista"].includes(rol)) {
      const tiene = pedidos.some((p) => (rol === "productor" && p.productor_id === userId)
        || (["vendedor", "comprador", "bar", "barista"].includes(rol) && p.solicitante_id === userId));
      if (tiene) bloqueos.push(`No puedes quitar ${rol} mientras tengas pedidos asociados. Cierra o resuelve esos pedidos antes.`);
    }
  }
  return [...new Set(bloqueos)];
}

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    await requiereUsuario(ctx);
    let miembros = await todosLosMiembros();
    if (!ctx.ses.d.admin) {
      const r = await restringidas(ctx);
      miembros = miembros.filter((m) => (m.estado ?? "activo") !== "inactivo" && !r.has(m.id));
    }
    return { members: miembros.map(miembroPublico) };
  },

  async publicos(ctx) {
    const r = await restringidas(ctx);
    const vis = (await todosLosMiembros()).filter((m) => miembroEsPublico(m) && !r.has(m.id));
    return { members: vis.map(miembroPublico), total: vis.length };
  },

  async get(ctx) {
    const u = await requiereUsuario(ctx);
    const id = str(ctx.query.id).trim();
    if (!id) fail("ID requerido.", 422);
    const fila = await db.usuario.findUnique({ where: { id } });
    if (!fila) fail("Miembro no encontrado.", 404);
    const todo = u.id === id || !!ctx.ses.d.admin;
    return { member: todo ? (u.id === id ? aDoc(fila) : miembroAdministracion(aDoc(fila))) : miembroPublico(aDoc(fila)) };
  },

  async update(ctx) {
    const u = await requiereUsuario(ctx);
    const i = ctx.in;
    const nombre = textoEntrada(i.nombre, 101);
    const email = textoEntrada(i.email, 254).toLowerCase();
    const telefono = textoEntrada(i.telefono, 31);
    const whatsapp = textoEntrada(i.whatsapp, 31);
    const provincia = textoEntrada(i.provincia, 81);
    if (largo(nombre) < 2 || largo(nombre) > 100) fail("Nombre inválido.", 422);
    if (!emailValido(email)) fail("Correo electrónico inválido.", 422);
    if (telefono.length > 30 || whatsapp.length > 30) fail("Número de contacto demasiado largo.", 422);
    if (telefono && !/^[0-9+()\-\s.]{7,30}$/.test(telefono)) fail("Teléfono inválido.", 422);
    if (whatsapp && !/^[0-9+()\-\s.]{7,30}$/.test(whatsapp)) fail("WhatsApp inválido.", 422);
    if (largo(provincia) > 80) fail("Provincia demasiado larga.", 422);
    if (email !== u.email) {
      if (!(await cupo(ctx, "cambiar_email", 10, 3600))) fail("Demasiados intentos. Espera una hora.", 429);
      const actual = await db.usuario.findUnique({ where: { id: u.id } });
      if (!actual || !(await verificarPass(str(i.password_actual), actual.passHash))) fail("La contraseña actual es obligatoria y debe ser correcta para cambiar el correo.", 422);
    }
    try {
      const fila = await db.usuario.update({
        where: { id: u.id },
        data: { nombre, email, telefono, whatsapp, provincia, extra: await extraCon(u.id, { updated_at: nowIso() }) },
      });
      invalidarUsuario(ctx);
      return { user: aDoc(fila) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") fail("Ese correo ya está registrado en otra cuenta.", 409);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") fail("Miembro no encontrado.", 404);
      throw e;
    }
  },

  async roles_update(ctx) {
    const u = await requiereUsuario(ctx);
    const roles = validarRoles(ctx.in.roles ?? [], typeof ctx.in.rol === "string" ? ctx.in.rol : null);
    const fila = await db.usuario.findUnique({ where: { id: u.id } });
    if (!fila) fail("Miembro no encontrado.", 404);
    const bloqueos = await bloqueosQuitarPerfiles(u.id, miembroRoles(aDoc(fila)), roles);
    if (bloqueos.length) fail(bloqueos.join(" "), 409, { bloqueos });
    const act = await db.usuario.update({ where: { id: u.id }, data: { rol: roles[0], roles, extra: await extraCon(u.id, { updated_at: nowIso() }) } });
    invalidarUsuario(ctx);
    return { user: aDoc(act) };
  },

  async verify(ctx) {
    requiereAdmin(ctx);
    const id = str(ctx.in.id).trim();
    if (!id) fail("ID requerido.", 422);
    const existe = await db.usuario.findUnique({ where: { id }, select: { id: true } });
    if (existe) {
      await db.usuario.update({ where: { id }, data: { verificado: true, extra: await extraCon(id, { estado_validacion: "verificado", fecha_verificacion: nowIso() }) } });
    }
    return null;
  },

  async set_estado(ctx) {
    requiereAdmin(ctx);
    const id = str(ctx.in.id).trim();
    const estado = str(ctx.in.estado).trim();
    const motivo = str(ctx.in.motivo).trim();
    const nota = str(ctx.in.nota).trim();
    if (!id) fail("ID requerido.", 422);
    if (!["pendiente", "en_revision", "verificado", "rechazado"].includes(estado)) fail("Estado inválido.", 422);
    const fila = await db.usuario.findUnique({ where: { id } });
    if (!fila) fail("Miembro no encontrado.", 404);
    const extra = { ...((fila.extra as Record<string, unknown>) ?? {}) };
    extra.estado_validacion = estado;
    if (estado === "verificado") extra.fecha_verificacion = nowIso();
    else extra.fecha_verificacion = estado === "pendiente" ? null : extra.fecha_verificacion ?? null;
    if (motivo) extra.motivo_rechazo = motivo.slice(0, 500);
    if (nota) extra.nota_admin = nota.slice(0, 1000);
    const act = await db.usuario.update({ where: { id }, data: { verificado: estado === "verificado", extra: extra as Prisma.InputJsonValue } });
    return { member: miembroAdministracion(aDoc(act)) };
  },

  async all(ctx) {
    requiereAdmin(ctx);
    return { members: (await todosLosMiembros()).map(miembroAdministracion) };
  },
};

void cuentaRestringida; void esAdmin;
export const members: Modulo = { acciones };
