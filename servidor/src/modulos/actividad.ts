// Port de api/actividad.php: bitácora propia (o de toda la Red para la
// administración), registro de pedidos con su traza y resumen.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, type Doc } from "../lib/docs.js";
import { db } from "../lib/db.js";
import { tieneRol, usuarioActual } from "../lib/usuarios.js";
import { fechaMs, int, num, str } from "../lib/util.js";

async function base(ctx: Ctx) {
  const u = await usuarioActual(ctx);
  const admin = !!ctx.ses.d.admin || (!!u && tieneRol(ctx, u, "admin"));
  if (!u && !admin) fail("No autenticado.", 401);
  const dias = Math.max(1, Math.min(730, int(ctx.query.dias ?? 90) || 90));
  const desde = Date.now() - dias * 86400_000;
  const log = (await listar("actividad")).filter((l) => fechaMs(l.ts) >= desde).sort((a, b) => str(b.ts).localeCompare(str(a.ts)));
  return { u, admin, log, pedidos: await listar("pedidos") };
}

function deMiembro(uid: string, log: Doc[], pedidos: Doc[]): Doc[] {
  const nros = new Set(pedidos.filter((p) => [p.solicitante_id, p.productor_id, p.proveedor_id].includes(uid)).map((p) => "#" + str(p.nro)));
  return log.filter((l) => l.actor_id === uid || (str(l.ref) && nros.has(str(l.ref))));
}

async function bitacora(ctx: Ctx, soloPropia: boolean) {
  const { u, admin, log, pedidos } = await base(ctx);
  const propia = soloPropia || !admin;
  let lineas = propia ? deMiembro(str(u?.id), log, pedidos) : log;
  const evento = str(ctx.query.evento).trim();
  if (evento) lineas = lineas.filter((l) => l.evento === evento);
  const limite = Math.max(1, Math.min(500, int(ctx.query.limite ?? 100) || 100));
  return { actividad: lineas.slice(0, limite), total: lineas.length, alcance: propia ? "propia" : "red" };
}

const acciones: Modulo["acciones"] = {
  list: (ctx) => bitacora(ctx, false),
  mia: (ctx) => bitacora(ctx, true),

  async pedidos(ctx) {
    const { u, admin, log, pedidos } = await base(ctx);
    const uid = str(u?.id);
    const traza = new Map<string, Doc[]>();
    for (const l of log) {
      const ref = str(l.ref);
      if (!ref.startsWith("#")) continue;
      if (!traza.has(ref)) traza.set(ref, []);
      traza.get(ref)!.push({ ts: l.ts ?? "", evento: l.evento ?? "", actor: l.actor ?? "", detalle: l.detalle ?? "" });
    }
    let mios = pedidos.filter((p) => admin || [p.solicitante_id, p.productor_id, p.proveedor_id].includes(uid));
    const estado = str(ctx.query.estado).trim();
    if (estado) mios = mios.filter((p) => str(p.estado) === estado);
    const filas = mios.map((p) => {
      const servicio = p.tipo === "servicio";
      return {
        nro: p.nro ?? 0, tipo: p.tipo ?? "lote", concepto: servicio ? str(p.servicio || "Servicio") : str(p.finca || "Café"),
        estado: p.estado ?? "", fecha: p.fecha ?? "", creado: p.created_at ?? "", actualizado: p.updated_at ?? "",
        total: Math.round(num(p.total) * 100) / 100, sacos: p.sacos ?? null, cantidad: p.cantidad ?? null, solicitante: p.solicitante ?? "",
        contraparte: servicio ? str(p.proveedor) : str(p.productor), mi_papel: p.solicitante_id === uid ? "solicitante" : "oferente",
        traza: (traza.get("#" + str(p.nro)) ?? []).sort((a, b) => str(a.ts).localeCompare(str(b.ts))),
      };
    }).sort((a, b) => int(b.nro) - int(a.nro));
    const porEstado: Record<string, number> = {};
    let monto = 0;
    for (const f of filas) {
      const e = str(f.estado) || "Sin estado";
      porEstado[e] = (porEstado[e] ?? 0) + 1;
      if (f.estado !== "Cancelado") monto += f.total;
    }
    return { pedidos: filas, alcance: admin ? "red" : "propia", resumen: { total: filas.length, por_estado: porEstado, monto: Math.round(monto * 100) / 100 } };
  },

  async resumen(ctx) {
    const { admin, log, pedidos } = await base(ctx);
    if (!admin) fail("Solo administradores.", 403);
    const eventos: Record<string, number> = {}, porDia: Record<string, number> = {}, actores: Record<string, number> = {};
    for (const l of log) {
      const ev = str(l.evento) || "otro";
      eventos[ev] = (eventos[ev] ?? 0) + 1;
      const dia = str(l.ts).slice(0, 10);
      if (dia) porDia[dia] = (porDia[dia] ?? 0) + 1;
      const a = str(l.actor);
      if (a && a !== "Sistema") actores[a] = (actores[a] ?? 0) + 1;
    }
    const ordenar = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
    return {
      eventos: ordenar(eventos), por_dia: Object.fromEntries(Object.entries(porDia).sort()), mas_activos: Object.fromEntries(Object.entries(ordenar(actores)).slice(0, 10)),
      miembros: await db.usuario.count(), lotes: (await listar("lotes")).length, servicios: (await listar("servicios-terceros")).length,
      pedidos: pedidos.length, lineas: log.length,
    };
  },
};

export const actividad: Modulo = { acciones };
