// Port de api/pedidos.php (versión corregida: total calculado por el
// servidor, existencias, proveedor del catálogo, sin entregar cancelados).
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { filtroVisible, requiereUsuario, tieneRol, usuarioActual } from "../lib/usuarios.js";
import { AVISO_PAGOS_VERSION, nombreMiembro, notificar, notificarAdmins, registrarActividad } from "../lib/avisos.js";
import { enviarCorreo } from "../lib/correo.js";
import { db } from "../lib/db.js";
import { bool, cortar, int, num, nowIso, str, textoEntrada, today } from "../lib/util.js";
import { esSiembra, lotesTodos } from "./lotes.js";

const ESTADOS = ["Solicitado", "Aceptado", "En camino", "Entregado"];
const plata = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function usuarioOAdmin(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  if (u) return u;
  if (ctx.ses.d.admin) return { id: "admin", nombre: "Administración", rol: "admin", roles: ["admin"] };
  fail("No autenticado.", 401);
}

function aviso(i: Doc) {
  const ok = bool(i.aviso_aceptado ?? false);
  return { aviso_aceptado: ok, aviso_aceptado_at: ok ? nowIso() : "", aviso_version: AVISO_PAGOS_VERSION };
}

/** Repara números repetidos y asigna el siguiente, dentro del bloqueo. */
function conNumero(todos: Doc[], p: Doc): Doc[] {
  const vistos = new Set<number>();
  let max = todos.reduce((m, t) => Math.max(m, int(t.nro)), 0);
  for (const t of todos) {
    const n = int(t.nro);
    if (n > 0 && !vistos.has(n)) { vistos.add(n); continue; }
    t.nro_anterior = n;
    t.nro = ++max;
    vistos.add(t.nro);
  }
  p.nro = max + 1;
  return [...todos, p];
}

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    const u = await usuarioOAdmin(ctx);
    const todos = await listar("pedidos");
    if (tieneRol(ctx, u, "admin")) return { pedidos: [...todos].reverse() };
    const mios = todos.filter((p) => [p.solicitante_id, p.productor_id, p.proveedor_id].includes(u.id));
    return { pedidos: mios.reverse() };
  },

  async create(ctx) {
    const u = await requiereUsuario(ctx);
    if (!(await cupo(ctx, "pedido_create", 30, 3600))) fail("Demasiados pedidos seguidos. Vuelve a intentarlo en una hora.", 429);
    const i = ctx.in;
    const loteId = textoEntrada(i.loteId, 60);
    const sacos = num(i.sacos);
    const totalCliente = num(i.total);
    if (sacos <= 0 || sacos > 10000) fail("Cantidad de sacos inválida.", 422);
    if (totalCliente < 0 || totalCliente > 1000000) fail("Total inválido.", 422);
    let origenRol = "comprador";
    for (const r of ["vendedor", "bar", "barista"]) if (tieneRol(ctx, u, r)) { origenRol = r; break; }

    const lote = loteId ? (await lotesTodos()).find((l) => l.id === loteId) : undefined;
    const visible = await filtroVisible(ctx);
    if (!lote || lote.oculto || !visible(lote)) fail("Ese lote ya no está disponible.", 404);
    if (lote.ejemplo || lote.demo) fail("Este es un lote de demostración: no se puede pedir. Mira los lotes publicados por productores de la Red.", 422);
    const productorId = str(lote.productor_id) || str(lote.published_by);
    if (productorId && productorId === u.id) fail("No puedes hacer un pedido de tu propio lote.", 422);

    // Cantidad y precio los decide el lote. total = sacos × precioSaco (o por unidad); 0 = a convenir.
    const porUnidad = str(lote.categoria ?? "verde") === "terminado" || esSiembra(lote);
    const existencias = porUnidad ? num(lote.unidades) : num(lote.stockSacos) + num(lote.stockQuintales);
    if (str(lote.disponibilidad).toLowerCase() === "agotado" || existencias <= 0) fail("Este lote está agotado. Escribe al vendedor para preguntar por el próximo.", 409);
    if (sacos > existencias) fail(`Solo hay ${existencias} ${porUnidad ? "unidades" : "sacos"} disponibles.`, 422);
    const precio = porUnidad ? num(lote.precioUnidad) : num(lote.precioSaco);
    const total = precio > 0 ? Math.round(precio * sacos * 100) / 100 : 0;
    const finca = cortar(str(lote.finca).trim(), 200);
    const productor = cortar(str(lote.productor).trim(), 200);

    const p: Doc = {
      nro: 0, loteId, finca, productor, productor_id: productorId, sacos, total,
      precio_a_convenir: total <= 0, estado: "Solicitado", fecha: today(), origenRol,
      solicitante: u.nombre, solicitante_id: u.id, created_at: nowIso(), ...aviso(i),
    };
    await mutar("pedidos", (todos) => conNumero(todos, p));
    await mutar("lotes", (ls) => ls.map((l) => (l.id === loteId ? { ...l, confirmacion_pendiente: true, ultimo_contacto: nowIso() } : l)));

    await notificar(productorId, "pedido", `Nuevo pedido #${p.nro} de ${u.nombre}`,
      `${sacos}${porUnidad ? " unidad(es)" : " saco(s)"} de ${finca}${total > 0 ? " por $" + plata(total) : " (precio a convenir)"}. Revísalo en tu panel.`, "/panel/");
    await registrarActividad(ctx, "pedido-creado", {
      objeto_tipo: "pedido", objeto_id: String(p.nro), ref: "#" + p.nro, detalle: `${sacos} saco(s) de ${finca}`, monto: total,
      contraparte: productor || (await nombreMiembro(productorId)),
    });
    if (productorId) {
      const dest = await db.usuario.findUnique({ where: { id: productorId }, select: { email: true, nombre: true } });
      if (dest) await enviarCorreo("pedido", dest.email, { nombre: dest.nombre, nro: String(p.nro), cliente: u.nombre, total: total > 0 ? "$" + plata(total) : "A convenir" });
    }
    return { pedido: p };
  },

  async create_service(ctx) {
    const u = await requiereUsuario(ctx);
    if (!(await cupo(ctx, "pedido_servicio", 30, 3600))) fail("Demasiadas solicitudes de servicio seguidas. Vuelve a intentarlo en una hora.", 429);
    const i = ctx.in;
    const servicioId = textoEntrada(i.servicioId ?? i.servicio_id, 120);
    let titulo = textoEntrada(i.titulo ?? i.servicio ?? "Servicio", 120);
    const cantidad = Math.max(1, Math.min(1000, int(i.cantidad ?? 1)));
    if (!servicioId) fail("Servicio inválido.", 422);

    // Proveedor, título y precio salen del catálogo, nunca del navegador.
    const visible = await filtroVisible(ctx);
    const tercero = (await listar("servicios-terceros")).find((s) => str(s.id) === servicioId && !s.oculto && visible(s));
    let proveedorId: string, proveedor: string, precioUnit = 0;
    if (tercero) {
      proveedorId = str(tercero.proveedor_id ?? tercero.owner_id);
      if (proveedorId === u.id) fail("No puedes solicitar tu propio servicio.", 422);
      proveedor = str(tercero.proveedor);
      titulo = cortar(str(tercero.titulo) || titulo, 120);
      precioUnit = num(tercero.precio);
    } else {
      const oficial = (await listar("servicios")).find((s) => str(s.id) === servicioId);
      if (oficial) { titulo = cortar(str(oficial.nombre) || titulo, 120); precioUnit = num(oficial.precio); }
      // «redcafe» (marketplace) o «redcafe_admin» (catálogo antiguo): el chat del admin depende de ello.
      proveedorId = str(i.proveedorId ?? i.proveedor_id) === "redcafe_admin" ? "redcafe_admin" : "redcafe";
      proveedor = "Red Café Ecuador";
    }
    if ([...titulo].length < 2) fail("Servicio inválido.", 422);
    const total = precioUnit > 0 ? Math.round(precioUnit * cantidad * 100) / 100 : 0;
    const p: Doc = {
      nro: 0, tipo: "servicio", servicioId, servicio: titulo, proveedor, proveedor_id: proveedorId, cantidad, total,
      estado: "Solicitado", fecha: today(), origenRol: u.rol ?? "", solicitante: u.nombre, solicitante_id: u.id, created_at: nowIso(), ...aviso(i),
    };
    await mutar("pedidos", (todos) => conNumero(todos, p));
    if (proveedorId === "redcafe" || proveedorId === "redcafe_admin") {
      await notificarAdmins("pedido", `Nueva solicitud de servicio #${p.nro} de ${u.nombre}`, `${titulo} · ${cantidad} unidad(es).`, "/admin/");
    } else {
      await notificar(proveedorId, "pedido", `Nueva solicitud #${p.nro} de ${u.nombre}`, `${titulo} · ${cantidad} unidad(es). Revísala en tu panel.`, "/panel/");
    }
    await registrarActividad(ctx, "servicio-solicitado", { objeto_tipo: "pedido", objeto_id: String(p.nro), ref: "#" + p.nro, detalle: titulo, monto: total, contraparte: proveedor });
    return { pedido: p };
  },

  async advance(ctx) {
    const u = await usuarioOAdmin(ctx);
    const nro = int(ctx.in.nro);
    if (!nro) fail("Número de pedido requerido.", 422);
    const objetivo = (await listar("pedidos")).find((p) => int(p.nro) === nro);
    if (!objetivo) fail("Pedido no encontrado.", 404);
    const admin = tieneRol(ctx, u, "admin");
    const dueno = (!!objetivo.productor_id && objetivo.productor_id === u.id) || (!!objetivo.proveedor_id && objetivo.proveedor_id === u.id);
    if (!admin && !dueno) fail("No autorizado: solo el productor dueño o un administrador puede avanzar.", 403);
    let act: Doc | null = null;
    await mutar("pedidos", (todos) => todos.map((p) => {
      if (int(p.nro) !== nro) return p;
      const actual = p.estado === "Pago en custodia (escrow)" ? "Solicitado" : str(p.estado);
      const ix = ESTADOS.indexOf(actual);
      if (ix < 0 || ix >= ESTADOS.length - 1) return p;
      act = { ...p, estado: ESTADOS[ix + 1], updated_at: nowIso(), updated_by: u.id };
      return act;
    }));
    if (!act) fail("Pedido no encontrado o ya en estado final.", 404);
    const a = act as Doc;
    await notificar(str(a.solicitante_id), "pedido-estado", `Tu pedido #${nro} pasó a «${a.estado}»`, `Lo actualizó ${u.nombre}.`, "/panel/");
    await registrarActividad(ctx, "pedido-estado", { objeto_tipo: "pedido", objeto_id: String(nro), ref: "#" + nro, detalle: "Nuevo estado: " + a.estado, monto: a.total ?? null, contraparte: str(a.solicitante) });
    return { pedido: a };
  },

  async cancelar(ctx) {
    const u = await usuarioOAdmin(ctx);
    const nro = int(ctx.in.nro ?? ctx.query.nro);
    if (!nro) fail("Número de pedido requerido.", 422);
    const motivo = str(ctx.in.motivo).trim();
    if ([...motivo].length > 300) fail("Motivo demasiado largo (máx 300).", 422);
    const objetivo = (await listar("pedidos")).find((p) => int(p.nro) === nro);
    if (!objetivo) fail("Pedido no encontrado.", 404);
    const autorizado = tieneRol(ctx, u, "admin") || [objetivo.solicitante_id, objetivo.productor_id, objetivo.proveedor_id].includes(u.id);
    if (!autorizado) fail("No autorizado: solo quien participa en el pedido puede cancelarlo.", 403);
    if (objetivo.estado === "Entregado") fail("Un pedido entregado no se puede cancelar.", 409);
    let act: Doc | null = null;
    await mutar("pedidos", (todos) => todos.map((p) => {
      if (int(p.nro) !== nro) return p;
      act = { ...p, estado: "Cancelado", updated_at: nowIso(), cancelled_by: u.id ?? "" };
      if (motivo) (act as Doc).motivo_cancelacion = motivo;
      return act;
    }));
    if (!act) fail("Pedido no encontrado.", 404);
    const a = act as Doc;
    for (const campo of ["solicitante_id", "productor_id", "proveedor_id"]) {
      const otro = str(a[campo]);
      if (otro && otro !== u.id) await notificar(otro, "pedido-estado", `Se canceló el pedido #${nro}`, motivo ? "Motivo: " + motivo : `Lo canceló ${u.nombre}.`, "/panel/");
    }
    await registrarActividad(ctx, "pedido-cancelado", { objeto_tipo: "pedido", objeto_id: String(nro), ref: "#" + nro, detalle: motivo || "Sin motivo indicado", monto: a.total ?? null });
    return { pedido: a };
  },

  async delete(ctx) {
    const u = await usuarioOAdmin(ctx);
    const nro = int(ctx.in.nro ?? ctx.query.nro);
    if (!nro) fail("Número de pedido requerido.", 422);
    const objetivo = (await listar("pedidos")).find((p) => int(p.nro) === nro);
    if (!objetivo) fail("Pedido no encontrado.", 404);
    const admin = tieneRol(ctx, u, "admin");
    if (!admin && objetivo.solicitante_id !== u.id) fail("No autorizado: solo quien hizo el pedido o un administrador puede eliminarlo.", 403);
    if (!admin && !["Solicitado", "Cancelado"].includes(str(objetivo.estado))) fail("Este pedido ya está en curso: cancélalo en vez de eliminarlo.", 409);
    await mutar("pedidos", (todos) => todos.filter((p) => int(p.nro) !== nro));
    await registrarActividad(ctx, "pedido-eliminado", { objeto_tipo: "pedido", objeto_id: String(nro), ref: "#" + nro, detalle: "Retirado por " + (admin ? "la administración" : "quien lo solicitó"), monto: objetivo.total ?? null });
    return { eliminado: nro };
  },

  async confirm_recepcion(ctx) {
    const u = await requiereUsuario(ctx);
    const nro = int(ctx.in.nro);
    if (!nro) fail("Número de pedido requerido.", 422);
    let act: Doc | null = null;
    await mutar("pedidos", (todos) => todos.map((p) => {
      if (int(p.nro) !== nro || p.solicitante_id !== u.id || ["Cancelado", "Entregado"].includes(str(p.estado))) return p;
      act = { ...p, estado: "Entregado", updated_at: nowIso(), confirmed_by: u.id };
      return act;
    }));
    if (!act) fail("Pedido no encontrado, ya cerrado (entregado o cancelado) o no eres el solicitante.", 404);
    const a = act as Doc;
    for (const campo of ["productor_id", "proveedor_id"]) {
      const otro = str(a[campo]);
      if (otro) await notificar(otro, "pedido-estado", `${u.nombre} confirmó la recepción del pedido #${nro}`, "La operación queda como entregada.", "/panel/");
    }
    await registrarActividad(ctx, "pedido-entregado", { objeto_tipo: "pedido", objeto_id: String(nro), ref: "#" + nro, detalle: "Recepción confirmada por el solicitante", monto: a.total ?? null });
    return { pedido: a };
  },
};

export const pedidos: Modulo = { acciones };
