// Port de api/ratings.php. Mejora del plan (§4 n.º 9): un lote o servicio
// solo lo valora quien lo pidió; antes cualquier cuenta valoraba cualquiera.
import { fail, type Modulo } from "../lib/http.js";
import { listar, mutar } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { requiereAdmin, usuarioActual } from "../lib/usuarios.js";
import { int, largo, nowIso, str, uid } from "../lib/util.js";

const TIPOS = ["usuario", "lote", "servicio", "cafeteria"];

const acciones: Modulo["acciones"] = {
  async create(ctx) {
    const u = await usuarioActual(ctx);
    const admin = !!ctx.ses.d.admin;
    if (!u && !admin) fail("No autenticado.", 401);
    let ratedId = str(ctx.in.rated_id).trim();
    const tipo = str(ctx.in.target_type ?? ctx.in.tipo ?? "usuario").trim();
    const targetId = str(ctx.in.target_id ?? ctx.in.objeto_id ?? ratedId).trim();
    const score = int(ctx.in.score);
    const comentario = str(ctx.in.comentario).trim();
    const pedidoNro = ctx.in.pedido_nro !== undefined && ctx.in.pedido_nro !== null ? int(ctx.in.pedido_nro) : null;
    if (!TIPOS.includes(tipo)) fail("Tipo de valoración inválido.", 422);
    if (!targetId) fail("ID del objeto a valorar requerido.", 422);
    if (!ratedId && tipo === "usuario") ratedId = targetId;
    if (score < 1 || score > 5) fail("Puntuación inválida (1-5).", 422);
    if (largo(comentario) > 500) fail("Comentario demasiado largo (máx 500).", 422);
    if (tipo === "usuario" && u && u.id === ratedId) fail("No puedes valorarte a ti mismo.", 422);
    if (!admin) {
      const pedidos = await listar("pedidos");
      const yo = u!.id;
      const ok = tipo === "usuario"
        ? pedidos.some((p) => [p.solicitante_id, p.productor_id, p.proveedor_id].includes(ratedId) && [p.solicitante_id, p.productor_id, p.proveedor_id].includes(yo))
        : tipo === "lote" ? pedidos.some((p) => p.solicitante_id === yo && str(p.loteId) === targetId)
        : tipo === "servicio" ? pedidos.some((p) => p.solicitante_id === yo && str(p.servicioId) === targetId)
        : true;
      if (!ok) fail(tipo === "usuario" ? "Solo puedes valorar a miembros con los que hayas tenido un pedido." : "Solo puedes valorar lo que hayas pedido.", 403);
      if (!(await cupo(ctx, "rating", 20, 3600))) fail("Demasiadas valoraciones. Espera una hora.", 429);
    }
    const rater = admin ? "admin" : u!.id;
    const r = {
      id: uid(), rated_id: ratedId, target_type: tipo, target_id: targetId, rater_id: rater,
      rater_nombre: admin ? "Equipo Red Café" : u!.nombre ?? "Anónimo", is_admin: admin, score, comentario, pedido_nro: pedidoNro, ts: nowIso(),
    };
    await mutar("ratings", (l) => {
      if (l.some((x) => x.rater_id === rater && (x.target_type ?? "usuario") === tipo && str(x.target_id ?? x.rated_id) === targetId && str(x.pedido_nro ?? "") === str(pedidoNro ?? ""))) {
        fail("Ya registraste una valoración para este elemento.", 409);
      }
      return [...l, r];
    });
    return { id: r.id };
  },

  async promedio(ctx) {
    const id = str(ctx.query.id).trim(), tipo = str(ctx.query.target_type ?? ctx.query.tipo).trim();
    if (!id) fail("ID requerido.", 422);
    const del = (await listar("ratings")).filter((r) => (!tipo || (r.target_type ?? "usuario") === tipo) && (str(r.target_id ?? r.rated_id) === id || str(r.rated_id) === id));
    if (!del.length) return { promedio: 0, count: 0, lista: [] };
    const prom = del.reduce((s, r) => s + int(r.score), 0) / del.length;
    del.sort((a, b) => str(b.ts).localeCompare(str(a.ts)));
    return { promedio: Math.round(prom * 100) / 100, count: del.length, lista: del.slice(0, 20) };
  },

  async all(ctx) {
    requiereAdmin(ctx);
    return { ratings: (await listar("ratings")).sort((a, b) => str(b.ts).localeCompare(str(a.ts))) };
  },
};

export const ratings: Modulo = { acciones };
