// Port de api/chat.php. En PHP cada consulta de mensajes reescribía el archivo
// entero sin bloqueo y se perdían mensajes; aquí cada mensaje es una fila y
// «leído» se marca con un UPDATE atómico.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { actualizarDonde, buscarPor, listar, mutar, conBloqueo, agregar, type Doc } from "../lib/docs.js";
import { db, Prisma } from "../lib/db.js";
import { cupo } from "../lib/seguridad.js";
import { miembroRoles, usuarioActual } from "../lib/usuarios.js";
import { AVISOS_ADMIN_UID, notificar } from "../lib/avisos.js";
import { cortar, fechaMs, largo, nowIso, sha1, str, uid } from "../lib/util.js";

export const ADMIN_CHAT_ID = "redcafe_admin";
const ADMIN_CHAT_NAME = "Admin Red Café Ecuador";

export const roomId = (a: string, b: string) => "r_" + sha1([a, b].sort().join("|")).slice(0, 16);

async function actor(ctx: Ctx): Promise<Doc | null> {
  const u = await usuarioActual(ctx);
  if (u) return u;
  if (ctx.ses.d.admin) return { id: ADMIN_CHAT_ID, nombre: ADMIN_CHAT_NAME, rol: "admin", roles: ["admin"] };
  return null;
}

/** ¿Hay pedido o cotización entre los dos? (o es la administración) */
export async function relacionComercial(a: string, b: string): Promise<Doc | null> {
  if (a === ADMIN_CHAT_ID || b === ADMIN_CHAT_ID) return { tipo: "soporte", ref: "Admin", estado: "activo" };
  for (const p of await listar("pedidos")) {
    const s = str(p.solicitante_id);
    for (const otro of [str(p.productor_id), str(p.proveedor_id)]) {
      if (!otro) continue;
      if ((s === a && otro === b) || (s === b && otro === a)) return { tipo: "pedido", ref: "#" + str(p.nro), estado: str(p.estado) };
    }
  }
  for (const c of await listar("cotizaciones")) {
    const s = str(c.solicitante_id), d = str(c.destinatario_id);
    if ((s === a && d === b) || (s === b && d === a)) return { tipo: "cotizacion", ref: "#" + str(c.nro), estado: str(c.estado) };
  }
  return null;
}

async function puedeSala(u: Doc, rid: string): Promise<boolean> {
  const c = (await listar("chats")).find((x) => x.id === rid);
  if (!c || !c.users?.includes(u.id)) return false;
  const otro = (c.users as string[]).find((x) => x !== u.id);
  return !!otro && (await relacionComercial(u.id, otro)) !== null;
}

const acciones: Modulo["acciones"] = {
  async rooms(ctx) {
    const u = await actor(ctx);
    if (!u) fail("No autenticado.", 401);
    const mias = (await listar("chats")).filter((c) => (c.users ?? []).includes(u.id));
    const out: Doc[] = [];
    for (const c of mias) {
      const otros = (c.users as string[]).filter((x) => x !== u.id);
      const relacion = otros[0] ? await relacionComercial(u.id, otros[0]) : null;
      if (!relacion) continue;
      const msgs = (await buscarPor("messages", "room", c.id)).sort((a, b) => str(a.ts).localeCompare(str(b.ts)));
      out.push({
        id: c.id, users: c.users, with: otros[0] ?? "", relacion, last: msgs[msgs.length - 1] ?? null,
        unread: msgs.filter((m) => m.from !== u.id && !m.read_by?.[u.id]).length,
      });
    }
    out.sort((a, b) => str(b.last?.ts).localeCompare(str(a.last?.ts)));
    return { rooms: out };
  },

  async contacts(ctx) {
    const u = await actor(ctx);
    if (!u) fail("No autenticado.", 401);
    const filas = await db.usuario.findMany({ where: { activo: true, NOT: { estado: "inactivo" } } });
    const out: Doc[] = [];
    if (u.id !== ADMIN_CHAT_ID) out.push({ id: ADMIN_CHAT_ID, nombre: ADMIN_CHAT_NAME, rol: "admin", roles: ["admin"], relacion: { tipo: "soporte", ref: "Admin", estado: "activo" } });
    for (const m of filas) {
      if (m.id === u.id) continue;
      const relacion = u.id === ADMIN_CHAT_ID ? { tipo: "soporte", ref: "Admin", estado: "activo" } : await relacionComercial(u.id, m.id);
      if (relacion) out.push({ id: m.id, nombre: m.nombre, rol: m.rol, roles: miembroRoles({ rol: m.rol, roles: m.roles }), relacion });
    }
    out.sort((a, b) => str(a.nombre).localeCompare(str(b.nombre)));
    return { members: out };
  },

  async open(ctx) {
    const u = await actor(ctx);
    if (!u) fail("No autenticado.", 401);
    const otro = str(ctx.in.user).trim();
    if (!otro) fail("Falta user.", 422);
    if (otro === u.id) fail("No puedes abrir un chat contigo mismo.", 422);
    const existe = otro === ADMIN_CHAT_ID || !!(await db.usuario.findFirst({ where: { id: otro, NOT: { estado: "inactivo" } }, select: { id: true } }));
    if (!existe) fail("Miembro no encontrado.", 404);
    const relacion = await relacionComercial(u.id, otro);
    if (!relacion) fail("Para abrir un chat debe existir antes un pedido o una cotización entre los miembros.", 403);
    const rid = roomId(u.id, otro);
    await mutar("chats", (chats) => (chats.some((c) => c.id === rid) ? chats : [...chats, { id: rid, users: [u.id, otro], relacion, created_at: nowIso() }]));
    return { room: rid };
  },

  async messages(ctx) {
    const u = await actor(ctx);
    if (!u) fail("No autenticado.", 401);
    const rid = str(ctx.query.room), since = str(ctx.query.since);
    if (!rid) fail("Falta room.", 422);
    if (!(await puedeSala(u, rid))) fail("Sin acceso al chat.", 403);
    let sala = (await buscarPor("messages", "room", rid)).sort((a, b) => str(a.ts).localeCompare(str(b.ts)));
    if (since) sala = sala.filter((m) => str(m.ts) > since);
    if (sala.length) {
      const yo = str(u.id);
      await actualizarDonde("messages", "room", rid, (m) => {
        if (str(m.from) === yo) return null;
        const leidos = m.read_by && typeof m.read_by === "object" && !Array.isArray(m.read_by) ? m.read_by : {};
        if (leidos[yo] === true) return null;
        m.read_by = { ...leidos, [yo]: true };
        return m;
      });
    }
    return { messages: sala };
  },

  async send(ctx) {
    if (!(await cupo(ctx, "chat_send", 120, 3600))) fail("Demasiados mensajes seguidos. Vuelve a intentarlo en una hora.", 429);
    const u = await actor(ctx);
    if (!u) fail("No autenticado.", 401);
    const rid = str(ctx.query.room ?? ctx.in.room), text = str(ctx.in.text).trim();
    if (!rid || !text) fail("Falta room o text.", 422);
    if (largo(text) > 2000) fail("Mensaje demasiado largo.", 422);
    if (!(await puedeSala(u, rid))) fail("Sin acceso al chat.", 403);
    const m = { id: uid(), room: rid, from: u.id, from_nombre: u.nombre, text, ts: nowIso(), read_by: { [u.id]: true } };
    await agregar("messages", m);
    // Un aviso por conversación, no uno por mensaje.
    const sala = (await listar("chats")).find((c) => c.id === rid);
    for (const otro of (sala?.users ?? []) as string[]) {
      if (!otro || otro === u.id) continue;
      if (otro === ADMIN_CHAT_ID) {
        if (u.id === ADMIN_CHAT_ID) continue;
        const enlace = "/chat/?room=" + encodeURIComponent(rid);
        const reciente = (await buscarPor("notificaciones", "uid", AVISOS_ADMIN_UID)).some((a) => a.tipo === "mensaje" && a.enlace === enlace && Date.now() - fechaMs(a.ts) < 600_000);
        if (!reciente) await notificar(AVISOS_ADMIN_UID, "mensaje", `Mensaje de ${u.nombre || "un miembro"} para administración`, cortar(text, 120), enlace);
        continue;
      }
      const ya = (await buscarPor("notificaciones", "uid", otro)).some((a) => a.tipo === "mensaje" && !a.leido && a.enlace === "/chat/");
      if (!ya) await notificar(otro, "mensaje", `Tienes un mensaje de ${u.nombre || "un miembro"}`, cortar(text, 120), "/chat/");
    }
    return { message: m };
  },
};

export const chat: Modulo = { acciones };
