// Port de api/inventario.php: ingresos, gastos e inventario por miembro.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { requiereUsuario, tieneRol } from "../lib/usuarios.js";
import { esNumerico, largo, num, nowIso, str, today, uid } from "../lib/util.js";

const PERFILES = ["bar", "barista", "productor", "vendedor", "comprador", "proveedor", "transportista", "pilador", "exportador", "certificador", "asesor"];
const MOTIVOS = ["compra", "cosecha", "venta", "consumo", "produccion", "servicio", "flete", "honorario", "insumo", "operativo", "otro"];
const r2 = (n: number) => Math.round(n * 100) / 100, r4 = (n: number) => Math.round(n * 10000) / 10000;
const mesActual = () => new Date().toISOString().slice(0, 7);
const opcional = (v: unknown) => (v !== undefined && v !== null && v !== "" ? num(v) : null);

async function requiereInventario(ctx: Ctx): Promise<Doc> {
  const u = await requiereUsuario(ctx);
  if (!PERFILES.some((p) => tieneRol(ctx, u, p))) fail("Tu perfil no tiene acceso al control de ingresos, gastos e inventario.", 403);
  return u;
}

const acciones: Modulo["acciones"] = {
  async movimiento(ctx) {
    const u = await requiereInventario(ctx);
    if (!(await cupo(ctx, "inventario_movimiento", 30, 60))) fail("Demasiados movimientos. Intenta de nuevo en un minuto.", 429);
    const i = ctx.in;
    let producto = str(i.producto).trim();
    const concepto = str(i.concepto ?? producto).trim();
    let cantidad: unknown = i.cantidad ?? null;
    const tipo = str(i.tipo), motivo = str(i.motivo).trim();
    let categoria = str(i.categoria ?? motivo).trim(), unidad = str(i.unidad).trim();
    let precio = opcional(i.precio);
    const monto = i.monto !== undefined && i.monto !== null && i.monto !== "" ? num(i.monto) : precio;
    const minimo = opcional(i.minimo);
    let fecha = str(i.fecha).trim();
    if (!["entrada", "salida", "ingreso", "gasto"].includes(tipo)) fail("Tipo inválido.", 422);
    const finanza = tipo === "ingreso" || tipo === "gasto";
    if (finanza) {
      if (!concepto || largo(concepto) > 160) fail("Concepto inválido.", 422);
      if (monto === null || monto <= 0) fail("Monto inválido (mayor que 0).", 422);
      if (!producto) producto = concepto;
      cantidad = 1; unidad = "registro"; precio = monto;
    } else {
      if (!producto || largo(producto) > 120) fail("Producto inválido.", 422);
      if (!esNumerico(cantidad) || num(cantidad) <= 0) fail("Cantidad inválida (mayor que 0).", 422);
    }
    if (!MOTIVOS.includes(motivo)) fail("Motivo inválido.", 422);
    if (!categoria || largo(categoria) > 80) categoria = motivo;
    if (!unidad || largo(unidad) > 20) unidad = "un";
    if (precio !== null && precio < 0) fail("Precio inválido.", 422);
    if (monto !== null && monto < 0) fail("Monto inválido.", 422);
    if (minimo !== null && minimo < 0) fail("Mínimo inválido.", 422);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) fecha = today();
    const mov = { id: uid(), owner_id: u.id, fecha, producto, cantidad: num(cantidad), unidad, tipo, motivo, concepto, categoria, monto, precio, created_at: nowIso() };
    await mutar("movimientos", (l) => [...l, mov]);
    if (!finanza) {
      await mutar("inventario", (inv) => {
        let reg = inv.find((r) => r.owner_id === u.id);
        if (!reg) { reg = { owner_id: u.id, productos: {} }; inv.push(reg); }
        const prods = (reg.productos ??= {});
        prods[producto] ??= { unidad, minimo: 0 };
        if (minimo !== null) prods[producto].minimo = minimo;
        if (unidad) prods[producto].unidad = unidad;
        return inv;
      });
    }
    return { movimiento: mov };
  },

  async list(ctx) {
    const u = await requiereInventario(ctx);
    return { movimientos: (await listar("movimientos")).filter((m) => m.owner_id === u.id).sort((a, b) => str(b.created_at).localeCompare(str(a.created_at))) };
  },

  async resumen(ctx) {
    const u = await requiereInventario(ctx);
    const movs = (await listar("movimientos")).filter((m) => m.owner_id === u.id);
    const productos: Doc = (await listar("inventario")).find((r) => r.owner_id === u.id)?.productos ?? {};
    const mes = mesActual();
    const conteo = new Map<string, { entrada: number; salida: number; existencias: number; valor: number; salidasMes: number; ingresoMes: number; precios: number[] }>();
    for (const m of movs) {
      if (["ingreso", "gasto"].includes(m.tipo)) continue;
      const p = str(m.producto);
      if (!conteo.has(p)) conteo.set(p, { entrada: 0, salida: 0, existencias: 0, valor: 0, salidasMes: 0, ingresoMes: 0, precios: [] });
      const c = conteo.get(p)!;
      const cant = num(m.cantidad), precio = esNumerico(m.precio) ? num(m.precio) : null, esMes = str(m.fecha).slice(0, 7) === mes;
      if (m.tipo === "entrada") { c.entrada += cant; c.existencias += cant; if (precio !== null) c.precios.push(precio); }
      else {
        c.salida += cant; c.existencias -= cant;
        if (precio !== null) c.valor += precio * cant;
        if (esMes) { c.salidasMes += cant; if (precio !== null) c.ingresoMes += precio * cant; }
      }
    }
    const nombres = [...new Set([...conteo.keys(), ...Object.keys(productos)])];
    const lista = nombres.map((n) => {
      const cfg = productos[n], c = conteo.get(n);
      const minimo = cfg?.minimo !== undefined ? num(cfg.minimo) : 0, ex = c?.existencias ?? 0;
      const prom = c?.precios.length ? c.precios.reduce((s, x) => s + x, 0) / c.precios.length : null;
      return { producto: n, unidad: str(cfg?.unidad) || "un", minimo, existencias: r4(ex), bajo: ex < minimo, valor: prom !== null ? r2(ex * prom) : null, entradas: r4(c?.entrada ?? 0), salidas: r4(c?.salida ?? 0) };
    }).sort((a, b) => a.producto.toLowerCase().localeCompare(b.producto.toLowerCase()));
    let ventas = 0, ingreso = 0, gasto = 0, ventasMes = 0, ingresoMes = 0, gastoMes = 0;
    for (const c of conteo.values()) { ventas += c.salida; ingreso += c.valor; ventasMes += c.salidasMes; ingresoMes += c.ingresoMes; }
    for (const m of movs) {
      const esMes = str(m.fecha).slice(0, 7) === mes;
      let monto = esNumerico(m.monto) ? num(m.monto) : null;
      if (monto === null && esNumerico(m.precio)) monto = num(m.precio) * num(m.cantidad ?? 1);
      if (monto === null) continue;
      if (m.tipo === "ingreso") { ingreso += monto; if (esMes) ingresoMes += monto; }
      if (m.tipo === "gasto") { gasto += monto; if (esMes) gastoMes += monto; }
    }
    return {
      productos: lista,
      totales: { mes, unidades_vendidas: r4(ventasMes), ingreso_estimado: r2(ingresoMes), gasto_estimado: r2(gastoMes), utilidad_estimada: r2(ingresoMes - gastoMes),
        unidades_totales: r4(ventas), ingreso_total: r2(ingreso), gasto_total: r2(gasto), utilidad_total: r2(ingreso - gasto) },
    };
  },

  async eliminar(ctx) {
    const u = await requiereInventario(ctx);
    const id = str(ctx.in.id).trim();
    if (!id) fail("id requerido.", 422);
    let r = "no";
    await mutar("movimientos", (l) => l.filter((m) => {
      if (m.id !== id) return true;
      if (m.owner_id !== u.id && !ctx.ses.d.admin) { r = "ajeno"; return true; }
      r = "ok";
      return false;
    }));
    if (r === "no") fail("Movimiento no encontrado.", 404);
    if (r === "ajeno") fail("No autorizado: este movimiento no te pertenece.", 403);
    return { deleted: id };
  },
};

export const inventario: Modulo = { acciones };
