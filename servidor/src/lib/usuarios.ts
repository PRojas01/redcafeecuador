// Miembros: de la tabla Usuario al formato que devolvía la API PHP, y las
// reglas de acceso de _bootstrap.php (cuenta_restringida, roles, admin).
import type { Usuario } from "@prisma/client";
import { db } from "./db.js";
import { fail, type Ctx } from "./http.js";
import { listar, type Doc } from "./docs.js";
import { descifrar } from "./pii.js";
import { nowIso, str, fechaMs } from "./util.js";

export const ROLES_MIEMBRO = [
  "productor", "vendedor", "comprador", "bar", "barista", "certificador",
  "transportista", "pilador", "exportador", "proveedor", "amante", "asesor",
];
export const MAX_ROLES = 3;

/** miembro_roles(): el principal primero, sin repetidos, solo válidos. */
export function miembroRoles(m: Doc): string[] {
  const principal = str(m.rol);
  const crudos: unknown[] = Array.isArray(m.roles) ? m.roles : [principal];
  const roles: string[] = [];
  if (principal && ROLES_MIEMBRO.includes(principal)) roles.push(principal);
  for (const r of crudos) {
    const s = str(r);
    if (ROLES_MIEMBRO.includes(s) && !roles.includes(s)) roles.push(s);
  }
  return roles.length ? roles : principal ? [principal] : [];
}

/** validar_roles_miembro() */
export function validarRoles(roles: unknown, principal: string | null = null, cortar = false): string[] {
  let lista: unknown[] = Array.isArray(roles) ? roles : roles !== null && roles !== undefined && roles !== "" ? [roles] : [];
  const limpios: string[] = [];
  for (const r of lista) {
    const s = str(r);
    if (!ROLES_MIEMBRO.includes(s)) fail("Rol inválido.", 422);
    if (!limpios.includes(s)) limpios.push(s);
  }
  if (principal) {
    if (!ROLES_MIEMBRO.includes(principal)) fail("Rol inválido.", 422);
    lista = limpios.filter((r) => r !== principal);
    limpios.splice(0, limpios.length, principal, ...(lista as string[]));
  }
  if (limpios.length < 1) fail("Debes seleccionar al menos un perfil.", 422);
  if (limpios.length > MAX_ROLES) fail("Puedes seleccionar máximo tres perfiles.", 422);
  return cortar ? limpios.slice(0, MAX_ROLES) : limpios;
}

/** Documento completo del miembro, sin secretos (sanitize_user de PHP). */
export function aDoc(u: Usuario): Doc {
  const extra = (u.extra as Doc) ?? {};
  const d: Doc = {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    visibilidad: u.visibilidad,
    roles: [] as string[],
    plan: u.plan,
    telefono: u.telefono,
    cedula: safeDescifrar(u.cedulaCifrada),
    provincia: u.provincia,
    verificado: u.verificado,
    ...extra,
    fundador: u.fundador,
    created_at: str(extra.created_at) || nowIso(u.creado),
  };
  if (u.whatsapp || "whatsapp" in extra) d.whatsapp = u.whatsapp;
  if (u.dosFactores || "two_factor_enabled" in extra) d.two_factor_enabled = u.dosFactores;
  if (!u.activo || "activo" in extra) d.activo = u.activo;
  if (u.estado !== "activo" || "estado" in extra) d.estado = u.estado;
  if (u.admin) d.admin = true;
  d.roles = miembroRoles({ rol: u.rol, roles: u.roles });
  return d;
}

function safeDescifrar(s: string): string {
  try {
    return descifrar(s);
  } catch {
    return "";
  }
}

/** miembro_publico(): lista BLANCA de lo que puede ver alguien sin cuenta. */
export function miembroPublico(u: Doc) {
  return {
    id: u.id ?? "",
    nombre: u.nombre ?? "",
    rol: u.rol ?? "",
    roles: miembroRoles(u),
    provincia: u.provincia ?? "",
    verificado: !!u.verificado,
    creado: u.creado ?? "",
  };
}

export const miembroEsPublico = (u: Doc) => (u.visibilidad ?? "publico") === "publico" && (u.estado ?? "activo") !== "inactivo";

/** miembro_tiene_rol() */
export function tieneRol(ctx: Ctx, m: Doc, rol: string): boolean {
  if (rol === "admin") {
    if (ctx.ses.d.admin) return true;
    if (m.admin || m.is_admin || m.rol === "admin") return true;
  }
  const roles: unknown[] = Array.isArray(m.roles) ? m.roles : [m.rol ?? ""];
  return roles.includes(rol);
}

/* ── Cuentas restringidas ─────────────────────────────────────────────── */

type Restriccion = Doc & { tipo: string };

/** Mapa uid → medida vigente (suspensión/bloqueo activos o cuenta cerrada). */
export async function restringidas(ctx: Ctx): Promise<Map<string, Restriccion>> {
  const enCache = ctx.cache.get("restringidas") as Map<string, Restriccion> | undefined;
  if (enCache) return enCache;
  const mapa = new Map<string, Restriccion>();
  // Primero el estado de la cuenta; después las sanciones vigentes, que pesan más
  // (en PHP la sanción se devolvía antes que el estado).
  const cerradas = await db.usuario.findMany({
    where: { OR: [{ activo: false }, { estado: { in: ["eliminado", "inactivo", "bloqueado", "suspendido"] } }] },
    select: { id: true, estado: true },
  });
  for (const c of cerradas) mapa.set(c.id, { tipo: c.estado === "activo" ? "inactivo" : c.estado });
  for (const s of await listar("sanciones")) {
    if (s.estado !== "activa" || !["suspension", "bloqueo"].includes(s.tipo)) continue;
    if (s.hasta && fechaMs(s.hasta) <= Date.now()) continue;
    mapa.set(str(s.uid), s as Restriccion);
  }
  ctx.cache.set("restringidas", mapa);
  return mapa;
}

export async function cuentaRestringida(ctx: Ctx, uid: string): Promise<Restriccion | null> {
  if (!uid) return null;
  return (await restringidas(ctx)).get(uid) ?? null;
}

/** publicacion_visible(): lo publicado por una cuenta restringida no se muestra. */
export async function filtroVisible(ctx: Ctx): Promise<(item: Doc) => boolean> {
  const r = await restringidas(ctx);
  return (item: Doc) => {
    for (const k of ["published_by", "productor_id", "proveedor_id", "owner_id", "autor_id"]) {
      const id = str(item?.[k]);
      if (id && id !== "admin" && r.has(id)) return false;
    }
    return true;
  };
}

/* ── Usuario actual ───────────────────────────────────────────────────── */

/** current_user(): el miembro con sesión, o null. */
export async function usuarioActual(ctx: Ctx): Promise<Doc | null> {
  if (ctx.cache.has("usuario")) return ctx.cache.get("usuario") as Doc | null;
  let res: Doc | null = null;
  const id = ctx.ses.d.usuarioId;
  if (id) {
    const fila = await db.usuario.findUnique({ where: { id } });
    if (fila && !(await cuentaRestringida(ctx, id))) {
      const cambio = fila.passCambiadaEn?.getTime() ?? 0;
      const inicio = ctx.ses.d.inicio?.getTime() ?? 0;
      if (!(cambio > 0 && cambio > inicio)) res = aDoc(fila);
    }
    if (!res) ctx.ses.set({ usuarioId: null });
  }
  ctx.cache.set("usuario", res);
  return res;
}

export async function requiereUsuario(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  if (!u) fail("No autenticado.", 401);
  return u;
}

export function requiereAdmin(ctx: Ctx) {
  if (!ctx.ses.d.admin) fail("Solo administradores.", 403);
}

/** Sesión de administración o miembro con rol admin. */
export async function esAdmin(ctx: Ctx): Promise<boolean> {
  if (ctx.ses.d.admin) return true;
  const u = await usuarioActual(ctx);
  return !!u && tieneRol(ctx, u, "admin");
}

export function invalidarUsuario(ctx: Ctx) {
  ctx.cache.delete("usuario");
}

/** Todos los miembros como documentos (para listados y búsquedas). */
export async function todosLosMiembros(): Promise<Doc[]> {
  const filas = await db.usuario.findMany({ orderBy: { creado: "asc" } });
  return filas.map(aDoc);
}

export async function nombreDe(id: string): Promise<string> {
  if (!id) return "";
  const u = await db.usuario.findUnique({ where: { id }, select: { nombre: true } });
  return u?.nombre ?? "";
}
