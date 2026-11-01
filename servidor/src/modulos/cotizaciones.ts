// Port de api/cotizaciones.php con las correcciones del plan (§4 n.º 6):
// el pedido que nace de una cotización se numera dentro del bloqueo, nadie
// se pide cotización a sí mismo, las cifras globales son solo para la
// administración y los correos de cotización ya existen.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { cuentaRestringida, requiereAdmin, requiereUsuario, tieneRol } from "../lib/usuarios.js";
import { notificar } from "../lib/avisos.js";
import { enviarCorreo } from "../lib/correo.js";
import { db } from "../lib/db.js";
import { cortar, int, num, nowIso, siguienteNro, str, textoEntrada, today } from "../lib/util.js";

const UNIDADES = ["sacos", "quintales", "kg", "libras", "unidades"];
const plata = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function cambiarCot(nro: number, u: Doc, permiso: (c: Doc) => boolean, estadoPrevio: string, msgEstado: string, cambio: (c: Doc) => Doc): Promise<Doc> {
  let act: Doc | null = null;
  let encontrada = false;
  await mutar("cotizaciones", (l) => l.map((c) => {
    if (int(c.nro) !== nro) return c;
    encontrada = true;
    if (!permiso(c)) fail("No autorizado.", 403);
    if (c.estado !== estadoPrevio) fail(msgEstado, 409);
    act = cambio({ ...c, updated_at: nowIso() });
    return act;
  }));
  if (!encontrada || !act) fail("Cotización no encontrada.", 404);
  void u;
  return act;
}

const acciones: Modulo["acciones"] = {
  async solicitar(ctx) {
    if (!(await cupo(ctx, "cotizacion_solicitar", 30, 3600))) fail("Demasiadas solicitudes. Intenta más tarde.", 429);
    const u = await requiereUsuario(ctx);
    const destId = str(ctx.in.destinatario_id).trim();
    const mensaje = textoEntrada(ctx.in.mensaje, 500, true);
    const cantidad = num(ctx.in.cantidad);
    const unidad = UNIDADES.includes(str(ctx.in.unidad ?? "sacos").trim()) ? str(ctx.in.unidad ?? "sacos").trim() : "sacos";
    if (!destId) fail("Falta el destinatario.", 422);
    if (destId === u.id) fail("No puedes pedirte una cotización a ti mismo.", 422);
    const dest = await db.usuario.findUnique({ where: { id: destId } });
    if (!dest || (await cuentaRestringida(ctx, destId))) fail("Destinatario no encontrado.", 404);
    const c: Doc = {
      nro: 0, solicitante_id: u.id, solicitante_nombre: u.nombre, solicitante_rol: u.rol, destinatario_id: destId,
      destinatario_nombre: dest.nombre, destinatario_rol: dest.rol, lote_id: textoEntrada(ctx.in.lote_id, 60), mensaje,
      cantidad: cantidad > 0 ? cantidad : null, unidad, estado: "solicitada", precio_unitario: null, precio_total: null,
      condiciones: "", respuesta_mensaje: "", fecha_respuesta: null, pedido_nro: null, created_at: nowIso(), updated_at: nowIso(),
    };
    await mutar("cotizaciones", (l) => { c.nro = siguienteNro(l); return [...l, c]; });
    await enviarCorreo("cotizacion_solicitada", dest.email, { nombre: dest.nombre, solicitante: u.nombre, nro: String(c.nro) });
    const cuanto = cantidad > 0 ? ` · ${String(Math.round(cantidad * 100) / 100)} ${unidad}` : "";
    await notificar(destId, "pedido", `Te piden cotización #${c.nro}: ${u.nombre || "Un miembro"}`, (mensaje ? cortar(mensaje, 200) : "Sin mensaje") + cuanto + ". Respóndela desde tu panel.", "/panel/");
    return { cotizacion: c };
  },

  async enviar(ctx) {
    if (!(await cupo(ctx, "cotizacion_enviar", 30, 3600))) fail("Demasiadas solicitudes. Intenta más tarde.", 429);
    const u = await requiereUsuario(ctx);
    const nro = int(ctx.in.nro), precio = num(ctx.in.precio_unitario);
    if (!nro) fail("Número de cotización requerido.", 422);
    if (precio <= 0 || precio > 1_000_000) fail("Precio unitario requerido.", 422);
    const c = await cambiarCot(nro, u, (x) => x.destinatario_id === u.id, "solicitada", "Esta cotización ya fue respondida.", (x) => ({
      ...x, precio_unitario: precio, precio_total: num(x.cantidad) > 0 ? Math.round(precio * num(x.cantidad) * 100) / 100 : null,
      condiciones: textoEntrada(ctx.in.condiciones, 500, true), respuesta_mensaje: textoEntrada(ctx.in.respuesta_mensaje, 500, true), estado: "enviada",
    }));
    const sol = await db.usuario.findUnique({ where: { id: str(c.solicitante_id) }, select: { email: true, nombre: true } });
    if (sol) await enviarCorreo("cotizacion_recibida", sol.email, { nombre: sol.nombre, nro: String(nro), precio: "$" + plata(precio) });
    await notificar(str(c.solicitante_id), "pedido", `Ya tienes precio en la cotización #${nro}`,
      `${str(c.destinatario_nombre) || "El vendedor"} respondió: $${plata(precio)} por ${str(c.unidad) || "unidad"}. Acéptala o recházala desde tu panel.`, "/panel/");
    return { cotizacion: c };
  },

  async aceptar(ctx) {
    const u = await requiereUsuario(ctx);
    const nro = int(ctx.in.nro);
    if (!nro) fail("Número de cotización requerido.", 422);
    let c = await cambiarCot(nro, u, (x) => x.solicitante_id === u.id, "enviada", "Esta cotización no está en estado para aceptar.", (x) => ({ ...x, estado: "aceptada", fecha_respuesta: nowIso() }));
    // El pedido se numera dentro del bloqueo de pedidos (antes podía repetir número).
    const pedido: Doc = {
      nro: 0, loteId: c.lote_id ?? "", finca: "", productor: c.destinatario_nombre, productor_id: c.destinatario_id,
      sacos: c.cantidad ?? 0, total: c.precio_total ?? 0, estado: "Solicitado", fecha: today(), origenRol: c.solicitante_rol ?? "comprador",
      solicitante: c.solicitante_nombre, solicitante_id: c.solicitante_id, cotizacion_nro: nro, created_at: nowIso(),
    };
    await mutar("pedidos", (l) => { pedido.nro = siguienteNro(l); return [...l, pedido]; });
    await mutar("cotizaciones", (l) => l.map((x) => (int(x.nro) === nro ? (c = { ...x, pedido_nro: pedido.nro }) : x)));
    await notificar(str(c.destinatario_id), "pedido", `Aceptaron tu cotización #${nro} — pedido #${pedido.nro}`, `${str(c.solicitante_nombre) || "El comprador"} aceptó el precio. El pedido ya está en tu panel.`, "/panel/");
    return { cotizacion: c, pedido };
  },

  async rechazar(ctx) {
    const u = await requiereUsuario(ctx);
    const nro = int(ctx.in.nro), motivo = textoEntrada(ctx.in.motivo, 300, true);
    if (!nro) fail("Número de cotización requerido.", 422);
    const c = await cambiarCot(nro, u, (x) => x.solicitante_id === u.id, "enviada", "Esta cotización no está en estado para rechazar.", (x) => ({ ...x, estado: "rechazada", respuesta_mensaje: motivo, fecha_respuesta: nowIso() }));
    await notificar(str(c.destinatario_id), "pedido", `No aceptaron la cotización #${nro}`, `${str(c.solicitante_nombre) || "El comprador"} la rechazó` + (motivo ? ": " + motivo : "."), "/panel/");
    return { cotizacion: c };
  },

  async cancelar(ctx) {
    const u = await requiereUsuario(ctx);
    const nro = int(ctx.in.nro);
    if (!nro) fail("Número de cotización requerido.", 422);
    const c = await cambiarCot(nro, u, (x) => x.solicitante_id === u.id, "solicitada", "Solo puedes cancelar solicitudes pendientes.", (x) => ({ ...x, estado: "cancelada" }));
    await notificar(str(c.destinatario_id), "pedido", `Retiraron la solicitud de cotización #${nro}`, `${str(c.solicitante_nombre) || "El comprador"} la canceló antes de que respondieras.`, "/panel/");
    return { cotizacion: c };
  },

  async mis_solicitadas(ctx) {
    const u = await requiereUsuario(ctx);
    return { cotizaciones: (await listar("cotizaciones")).filter((c) => c.solicitante_id === u.id).reverse() };
  },

  async mis_recibidas(ctx) {
    const u = await requiereUsuario(ctx);
    return { cotizaciones: (await listar("cotizaciones")).filter((c) => c.destinatario_id === u.id).reverse() };
  },

  async estadisticas(ctx) {
    const u = await requiereUsuario(ctx);
    const todas = await listar("cotizaciones");
    const admin = !!ctx.ses.d.admin || tieneRol(ctx, u, "admin");
    // Cada miembro ve sus propias cifras; las de toda la Red, solo la administración.
    const base = admin ? todas : todas.filter((c) => c.solicitante_id === u.id || c.destinatario_id === u.id);
    const por = { solicitada: 0, enviada: 0, aceptada: 0, rechazada: 0, cancelada: 0 } as Record<string, number>;
    let montoTotal = 0, montoAceptadas = 0;
    for (const c of base) {
      if (c.estado in por) por[c.estado]++;
      if (c.estado === "aceptada") montoAceptadas += num(c.precio_total);
      montoTotal += num(c.precio_total);
    }
    return {
      total: base.length, por_estado: por, monto_total: montoTotal, monto_aceptadas: montoAceptadas,
      tasa_conversion: base.length ? Math.round((por.aceptada / base.length) * 1000) / 10 : 0,
      mis_solicitadas: todas.filter((c) => c.solicitante_id === u.id).length, mis_recibidas: todas.filter((c) => c.destinatario_id === u.id).length,
      alcance: admin ? "red" : "propias",
    };
  },

  async all(ctx) {
    requiereAdmin(ctx);
    return { cotizaciones: (await listar("cotizaciones")).reverse() };
  },
};

export const cotizaciones: Modulo = { acciones };
export type { Ctx };
