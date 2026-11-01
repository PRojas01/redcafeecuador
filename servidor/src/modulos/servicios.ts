// Port de api/servicios.php (órdenes de servicios de pago) con la corrección
// de PayPal del plan (§4 n.º 1): ID de orden validado, moneda USD obligatoria,
// sin órdenes PayPal repetidas y numeración dentro del bloqueo.
import { fail, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { requiereAdmin, requiereUsuario } from "../lib/usuarios.js";
import { notificarAdmins } from "../lib/avisos.js";
import { int, num, nowIso, siguienteNro, str, textoEntrada, today } from "../lib/util.js";

function paypal() {
  const id = process.env.PAYPAL_CLIENT_ID, secreto = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secreto) return null;
  const base = (process.env.PAYPAL_MODE ?? "live") === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
  return { id, secreto, base };
}

async function capturar(orderId: string): Promise<Doc | null> {
  const c = paypal();
  if (!c) fail("PayPal no está configurado en el servidor. Contacta soporte.", 503);
  const t = await fetch(`${c.base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${c.id}:${c.secreto}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials", signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  if (!t?.ok) fail("No se pudo conectar con PayPal. Intenta más tarde.", 502);
  const token = ((await t.json()) as Doc).access_token;
  // El ID ya está validado (solo A-Z y 0-9): no puede salirse de esta ruta.
  const r = await fetch(`${c.base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  if (!r?.ok) return null;
  return (await r.json()) as Doc;
}

const acciones: Modulo["acciones"] = {
  async list() {
    return { servicios: await listar("servicios") };
  },

  async solicitar(ctx) {
    if (!(await cupo(ctx, "servicio_solicitar", 10, 3600))) fail("Demasiadas solicitudes. Intenta más tarde.", 429);
    const u = await requiereUsuario(ctx);
    const sid = str(ctx.in.servicio_id).trim();
    if (!sid) fail("Falta el ID del servicio.", 422);
    const s = (await listar("servicios")).find((x) => str(x.id) === sid);
    if (!s) fail("Servicio no encontrado.", 404);
    if (!s.disponible) fail("Servicio no disponible actualmente.", 410);
    const ref = textoEntrada(ctx.in.referencia_pago, 120);
    const orden: Doc = {
      nro: 0, servicio_id: s.id, servicio_nombre: s.nombre, servicio_icono: s.icono ?? "", precio: s.precio, moneda: s.moneda ?? "USD",
      usuario_id: u.id, usuario_nombre: u.nombre, usuario_email: u.email ?? "", metodo_pago: "transferencia", referencia_pago: ref,
      estado: "pendiente", fecha: today(), created_at: nowIso(),
    };
    await mutar("ordenes", (l) => { orden.nro = siguienteNro(l); return [...l, orden]; });
    await notificarAdmins("servicio", "Nueva orden de servicio: " + str(s.nombre || "Servicio"), `${u.nombre || "Usuario"} · $${str(s.precio)} · referencia ${ref || "sin indicar"}`, "/admin/");
    return { orden, mensaje: "Solicitud registrada. Realiza la transferencia y envía la referencia por WhatsApp o aquí." };
  },

  async confirm_paypal(ctx) {
    if (!(await cupo(ctx, "servicio_paypal", 10, 3600))) fail("Demasiadas solicitudes. Intenta más tarde.", 429);
    const u = await requiereUsuario(ctx);
    const sid = str(ctx.in.servicio_id).trim(), orderId = str(ctx.in.paypal_order_id).trim();
    if (!sid) fail("Falta el ID del servicio.", 422);
    if (!orderId) fail("Falta el ID de la orden PayPal.", 422);
    // Un ID de orden de PayPal son letras mayúsculas y cifras. Sin esta
    // comprobación, «../../v2/payments/…» llamaba a otras operaciones de la
    // API con las credenciales del comercio.
    if (!/^[A-Z0-9]{10,36}$/.test(orderId)) fail("ID de orden PayPal inválido.", 422);
    const s = (await listar("servicios")).find((x) => str(x.id) === sid);
    if (!s) fail("Servicio no encontrado.", 404);
    if (!s.disponible) fail("Servicio no disponible.", 410);
    if ((await listar("ordenes")).some((o) => o.paypal_order_id === orderId)) fail("Esa orden de PayPal ya fue registrada.", 409);
    const cap = await capturar(orderId);
    if (!cap) fail("No se pudo verificar el pago PayPal. Verifica el ID de la orden.", 402);
    if (cap.status !== "COMPLETED") fail("El pago PayPal no fue completado. Estado: " + str(cap.status), 402);
    const importe = cap.purchase_units?.[0]?.payments?.captures?.[0]?.amount ?? {};
    // La moneda la elegía el navegador: «30» en yenes pasaba por 30 dólares.
    if (str(importe.currency_code) !== str(s.moneda ?? "USD")) fail("La moneda del pago no coincide con la del servicio.", 402);
    if (num(importe.value) < num(s.precio)) fail("El monto pagado no coincide con el precio del servicio.", 402);
    const orden: Doc = {
      nro: 0, servicio_id: s.id, servicio_nombre: s.nombre, servicio_icono: s.icono ?? "", precio: s.precio, moneda: s.moneda ?? "USD",
      usuario_id: u.id, usuario_nombre: u.nombre, usuario_email: u.email ?? "", metodo_pago: "paypal", paypal_order_id: orderId,
      paypal_payer_id: cap.payer?.payer_id ?? "", paypal_email: cap.payer?.email_address ?? "", estado: "pagado", pagado_at: nowIso(), fecha: today(), created_at: nowIso(),
    };
    await mutar("ordenes", (l) => {
      if (l.some((o) => o.paypal_order_id === orderId)) fail("Esa orden de PayPal ya fue registrada.", 409);
      orden.nro = siguienteNro(l);
      return [...l, orden];
    });
    await notificarAdmins("servicio", "Pago PayPal recibido: " + str(s.nombre), `${u.nombre} · $${str(importe.value)} ${str(importe.currency_code)}`, "/admin/");
    return { orden, mensaje: "Pago confirmado. Tu solicitud fue registrada exitosamente." };
  },

  async mis_ordenes(ctx) {
    const u = await requiereUsuario(ctx);
    return { ordenes: (await listar("ordenes")).filter((o) => o.usuario_id === u.id).reverse() };
  },

  async all(ctx) {
    requiereAdmin(ctx);
    return { ordenes: (await listar("ordenes")).reverse() };
  },

  async marcar_pagado(ctx) {
    requiereAdmin(ctx);
    const nro = int(ctx.in.nro);
    if (nro <= 0) fail("Número de orden inválido.", 422);
    let hecho = false;
    await mutar("ordenes", (l) => l.map((o) => (int(o.nro) !== nro ? o : ((hecho = true), { ...o, estado: "pagado", referencia_pago: textoEntrada(ctx.in.referencia_pago, 120), pagado_at: nowIso() }))));
    if (!hecho) fail("Orden no encontrada.", 404);
    return { mensaje: "Orden marcada como pagada." };
  },

  async marcar_completado(ctx) {
    requiereAdmin(ctx);
    const nro = int(ctx.in.nro);
    if (nro <= 0) fail("Número de orden inválido.", 422);
    let hecho = false;
    await mutar("ordenes", (l) => l.map((o) => (int(o.nro) !== nro ? o : ((hecho = true), { ...o, estado: "completado", completado_at: nowIso() }))));
    if (!hecho) fail("Orden no encontrada.", 404);
    return { mensaje: "Orden marcada como completada." };
  },
};

export const servicios: Modulo = { acciones };
