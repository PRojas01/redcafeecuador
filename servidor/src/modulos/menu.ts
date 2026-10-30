import { exigirDerechos } from "../lib/derechos.js";
// Port de api/menu.php: carta de los bares.
import { fail, type Modulo } from "../lib/http.js";
import { listar, mutar } from "../lib/docs.js";
import { requiereUsuario, tieneRol } from "../lib/usuarios.js";
import { largo, num, nowIso, str, textoEntrada, uid } from "../lib/util.js";

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    const owner = str(ctx.query.owner).trim();
    if (!owner) fail("owner requerido.", 422);
    return { menu: (await listar("menus")).filter((m) => m.owner_id === owner) };
  },

  async add(ctx) {
    const u = await requiereUsuario(ctx);
    if (!tieneRol(ctx, u, "bar") && !tieneRol(ctx, u, "admin")) fail("Solo bares pueden agregar productos.", 403);
    const nombre = str(ctx.in.nombre).trim(), desc = str(ctx.in.descripcion).trim(), precio = num(ctx.in.precio);
    if (largo(nombre) < 1 || largo(nombre) > 200) fail("Nombre requerido (máx 200 chars).", 422);
    if (precio <= 0 || precio > 10000) fail("Precio inválido.", 422);
    if (largo(desc) > 500) fail("Descripción demasiado larga.", 422);
    const idItem = uid();
    const item = { ...await exigirDerechos(ctx, u, "menu.add", idItem), id: idItem, owner_id: u.id, nombre, descripcion: desc, precio, categoria: textoEntrada(ctx.in.categoria ?? "Café", 60) || "Café", created_at: nowIso() };
    await mutar("menus", (l) => [...l, item]);
    return { item };
  },

  async delete(ctx) {
    const u = await requiereUsuario(ctx);
    const id = str(ctx.query.id).trim();
    if (!id) fail("ID requerido.", 422);
    let found = false;
    await mutar("menus", (l) => l.filter((m) => {
      if (m.id !== id) return true;
      if (m.owner_id === u.id || tieneRol(ctx, u, "admin")) { found = true; return false; }
      return true;
    }));
    return { deleted: found };
  },
};

export const menu: Modulo = { acciones };
