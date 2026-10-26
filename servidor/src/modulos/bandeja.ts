// Port de api/bandeja.php: mensajes y pedidos que esperan respuesta.
import { fail, type Modulo } from "../lib/http.js";
import { buscarPor, listar, type Doc } from "../lib/docs.js";
import { requiereUsuario } from "../lib/usuarios.js";
import { db } from "../lib/db.js";
import { cortar, str } from "../lib/util.js";
import { relacionComercial } from "./chat.js";

const ADMIN_ID = "redcafe_admin";
const ABIERTOS = ["Solicitado", "Aceptado", "En camino"];

async function conversaciones(yo: string): Promise<Doc[]> {
  const out: Doc[] = [];
  const nombres = new Map((await db.usuario.findMany({ select: { id: true, nombre: true } })).map((x) => [x.id, x.nombre]));
  for (const c of await listar("chats")) {
    if (!(c.users ?? []).includes(yo)) continue;
    const otro = str((c.users as string[]).find((x) => x !== yo));
    if (!otro) continue;
    const r = await relacionComercial(yo, otro);
    if (!r) continue;
    const relacion = r.tipo === "soporte" ? { tipo: "soporte", ref: "Administración" } : { tipo: r.tipo, ref: r.ref };
    const msgs = (await buscarPor("messages", "room", c.id)).sort((a, b) => str(a.ts).localeCompare(str(b.ts)));
    const ultimo = msgs[msgs.length - 1] ?? null;
    const sinLeer = msgs.filter((m) => m.from !== yo && !m.read_by?.[yo]).length;
    out.push({
      clase: "mensaje", id: c.id, con: otro === ADMIN_ID ? "Administración de Red Café" : nombres.get(otro) ?? "Miembro de la Red", con_id: otro, relacion,
      ultimo: ultimo ? cortar(str(ultimo.text), 160) : "", ultimo_mio: ultimo ? ultimo.from === yo : false,
      fecha: ultimo?.ts ?? c.created_at ?? "", sin_leer: sinLeer, pendiente: sinLeer > 0,
    });
  }
  return out;
}

async function pedidos(yo: string): Promise<Doc[]> {
  const out: Doc[] = [];
  for (const p of await listar("pedidos")) {
    const vendedor = str(p.productor_id ?? p.proveedor_id);
    if (p.solicitante_id !== yo && vendedor !== yo) continue;
    const estado = str(p.estado || "Solicitado");
    const soyVendedor = vendedor === yo;
    out.push({
      clase: "pedido", id: str(p.nro), titulo: str(p.servicio ?? p.finca ?? "Pedido"),
      contraparte: soyVendedor ? str(p.solicitante || "Un miembro") : str(p.productor ?? p.proveedor ?? "Red Café Ecuador"),
      papel: soyVendedor ? "recibido" : "enviado", estado, total: p.total ?? null, fecha: str(p.created_at ?? p.fecha),
      pendiente: soyVendedor && estado === "Solicitado", abierto: ABIERTOS.includes(estado),
    });
  }
  return out;
}

async function resumen(ctx: Parameters<Modulo["acciones"][string]>[0], soloContador: boolean) {
  const u = await requiereUsuario(ctx);
  const conv = await conversaciones(u.id);
  const peds = await pedidos(u.id);
  const sinLeer = conv.reduce((s, c) => s + c.sin_leer, 0);
  const porResponder = peds.filter((p) => p.pendiente).length;
  if (soloContador) return { sin_leer: sinLeer, por_responder: porResponder, total: sinLeer + porResponder };
  const items = [...conv, ...peds].sort((a, b) => (a.pendiente !== b.pendiente ? (a.pendiente ? -1 : 1) : str(b.fecha).localeCompare(str(a.fecha))));
  return { items, sin_leer: sinLeer, por_responder: porResponder, total: sinLeer + porResponder };
}

export const bandeja: Modulo = {
  acciones: {
    resumen: (ctx) => resumen(ctx, false),
    contador: (ctx) => resumen(ctx, true),
  },
};
void fail;
