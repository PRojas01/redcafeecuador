// Port de api/admin.php: CRUD del panel de administración.
// Cambios de seguridad respecto al PHP:
//  · «members» sale de la tabla Usuario sin hash de contraseña ni códigos 2FA
//    (el PHP los devolvía en list/export).
//  · Editar un miembro solo toca campos de perfil; nunca la contraseña, el
//    2FA ni el permiso de administración. No se crean miembros por aquí.
//  · Todas las escrituras son atómicas (el PHP leía y reescribía sin bloqueo).
import { Prisma } from "@prisma/client";
import { Cruda, fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { db } from "../lib/db.js";
import { requiereAdmin, todosLosMiembros, validarRoles } from "../lib/usuarios.js";
import { cifrar, huella } from "../lib/pii.js";
import { emailValido, nowIso, str } from "../lib/util.js";

const RECURSOS = ["members", "pedidos", "lotes", "ratings", "chats", "posts", "waitlist", "consents"] as const;
const DATOS = ["cursos", "planes"];
const SLUG = /^[a-z0-9][a-z0-9\-_]{1,80}$/;
const esRecurso = (r: string): r is (typeof RECURSOS)[number] => (RECURSOS as readonly string[]).includes(r);

async function leer(r: string): Promise<Doc[]> {
  if (r === "members") return todosLosMiembros();
  if (r === "consents") {
    const f = await db.consentimiento.findMany({ orderBy: { ts: "asc" } });
    return f.map((c) => ({ ...c, ts: c.ts.toISOString() }));
  }
  return listar(r);
}
const recursoDe = (ctx: Ctx) => str(ctx.in.recurso ?? ctx.query.recurso);
const idDe = (ctx: Ctx) => str(ctx.query.id ?? ctx.in.id);

/* ── Miembros ─────────────────────────────────────────────────────────── */
const COLUMNAS_TEXTO = ["nombre", "provincia", "telefono", "whatsapp", "plan", "visibilidad", "estado"] as const;
const PROHIBIDOS = new Set(["id", "pass", "passHash", "backup_codes", "two_factor_enabled", "two_factor_secret", "pass_changed_at", "pass_reset_by", "admin", "fundador", "cedulaCifrada", "cedulaHuella", "created_at", "creado", "action", "recurso"]);

async function editarMiembro(id: string, i: Doc) {
  const f = await db.usuario.findUnique({ where: { id } });
  if (!f) fail("id no encontrado.", 404);
  const data: Prisma.UsuarioUpdateInput = {};
  const extra: Doc = { ...((f.extra as Doc) ?? {}) };
  for (const [k, v] of Object.entries(i)) {
    if (PROHIBIDOS.has(k)) continue;
    if ((COLUMNAS_TEXTO as readonly string[]).includes(k)) (data as Doc)[k] = str(v).trim().slice(0, 200);
    else if (k === "email") {
      const e = str(v).trim().toLowerCase();
      if (!emailValido(e)) fail("Correo inválido.", 422);
      if (e !== f.email && (await db.usuario.findUnique({ where: { email: e } }))) fail("Ese correo ya está registrado.", 409);
      data.email = e;
    } else if (k === "cedula") {
      const c = str(v).trim().slice(0, 20);
      data.cedulaCifrada = c ? cifrar(c) : "";
      data.cedulaHuella = c ? huella(c) : "";
    } else if (k === "roles" || k === "rol") {
      const roles = validarRoles(k === "roles" ? v : [v, ...(f.roles ?? [])], null, true);
      if (roles.length) { data.roles = roles; data.rol = roles[0]; }
    } else if (k === "verificado") data.verificado = v === true || v === "1" || v === "true";
    else if (k === "activo") data.activo = !(v === false || v === "0" || v === "false" || v === 0);
    else extra[k] = v;
  }
  extra.updated_at = nowIso();
  data.extra = extra as Prisma.InputJsonValue;
  await db.usuario.update({ where: { id }, data });
}

/* ── Páginas (antes data/paginas/*.md) ───────────────────────────────── */
function pagina(slug: string, d: Doc, previo: Doc | null): Doc {
  return {
    id: slug, slug, contenido: str(d.contenido), titulo: str(d.titulo).slice(0, 200), resumen: str(d.resumen).slice(0, 400),
    orden: Math.trunc(Number(d.orden ?? 99)) || 0, publicado: d.publicado === undefined ? true : !!d.publicado && d.publicado !== "0" && d.publicado !== "false",
    updated_at: nowIso(), created_at: previo?.created_at ?? nowIso(),
  };
}
async function paginas(): Promise<Doc[]> {
  return (await listar("paginas")).map((p) => ({
    slug: p.slug, titulo: p.titulo || p.slug.charAt(0).toUpperCase() + p.slug.slice(1).replace(/-/g, " "), resumen: p.resumen ?? "", orden: p.orden ?? 99,
    publicado: p.publicado ?? true, contenido: p.contenido ?? "", updated_at: p.updated_at ?? "",
  })).sort((a, b) => a.orden - b.orden);
}

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    const r = str(ctx.query.recurso);
    if (esRecurso(r)) return { [r]: await leer(r) };
    if (DATOS.includes(r)) {
      const d = await listar(r);
      if (!d.length) fail(`Recurso ${r} no inicializado en data/. Sube contenido primero.`);
      return { [r]: d };
    }
    if (r === "paginas") return { paginas: await paginas() };
    fail("recurso no válido.");
  },

  async create(ctx) {
    const r = recursoDe(ctx), i: Doc = { ...ctx.in };
    delete i.action; delete i.recurso;
    if (r === "members") fail("Los miembros se crean con el registro (auth.php?action=register).", 422);
    if (r === "consents") fail("Los consentimientos solo se registran al aceptar.", 422);
    if (esRecurso(r) || DATOS.includes(r)) {
      if (i.id === undefined || i.id === null || i.id === "") fail("id requerido.");
      if (esRecurso(r)) i.created_at ??= nowIso();
      await mutar(r, (l) => {
        if (l.some((x) => str(x.id) === str(i.id))) fail("id duplicado.", 409);
        return [...l, i];
      });
      return { id: i.id };
    }
    if (r === "paginas") {
      const slug = str(i.slug);
      if (!SLUG.test(slug)) fail("slug inválido.", 422);
      await mutar("paginas", (l) => {
        if (l.some((p) => p.id === slug)) fail("slug ya existe.", 409);
        return [...l, pagina(slug, i, null)];
      });
      return { slug };
    }
    fail("recurso no válido.");
  },

  async update(ctx) {
    const r = recursoDe(ctx), id = idDe(ctx);
    if (!id) fail("id requerido.");
    const i: Doc = { ...ctx.in };
    delete i.action; delete i.recurso;
    if (r === "members") { await editarMiembro(id, i); return { id }; }
    if (r === "consents") fail("Los consentimientos no se editan.", 422);
    if (esRecurso(r) || DATOS.includes(r)) {
      delete i.id; delete i.nro;
      await mutar(r, (l) => {
        const x = l.find((it) => str(it.id) === id);
        if (!x) fail("id no encontrado.", 404);
        Object.assign(x, i);
        if (esRecurso(r)) x.updated_at = nowIso();
        return l;
      });
      return { id };
    }
    if (r === "paginas") {
      if (!SLUG.test(id)) fail("Error guardando página.");
      await mutar("paginas", (l) => {
        const k = l.findIndex((p) => p.id === id);
        const nueva = pagina(id, i, k >= 0 ? l[k] : null);
        if (k >= 0) l[k] = nueva; else l.push(nueva);
        return l;
      });
      return { slug: id };
    }
    fail("recurso no válido.");
  },

  async delete(ctx) {
    const r = recursoDe(ctx), id = idDe(ctx);
    if (!id) fail("id requerido.");
    if (r === "members") {
      const n = await db.usuario.deleteMany({ where: { id } });
      if (!n.count) fail("id no encontrado.", 404);
      return { deleted: id };
    }
    if (r === "consents") fail("Los consentimientos se conservan como prueba legal.", 422);
    if (esRecurso(r) || DATOS.includes(r)) {
      await mutar(r, (l) => {
        // Los pedidos se identifican por «nro»; se acepta cualquiera de los dos.
        const f = l.filter((x) => str(x.id) !== id && !(x.nro !== undefined && str(x.nro) === id));
        if (f.length === l.length) fail("id no encontrado.", 404);
        return f;
      });
      return { deleted: id };
    }
    if (r === "paginas") {
      if (!SLUG.test(id)) fail("Identificador de página no válido.", 422);
      await mutar("paginas", (l) => l.filter((p) => p.id !== id));
      return { deleted: id };
    }
    fail("recurso no válido.");
  },

  async reset_user(ctx) {
    const id = idDe(ctx);
    if (!id) fail("id requerido.");
    const report = { pedidos_removed: 0, lotes_removed: 0, ratings_removed: 0, chats_removed: 0 };
    const quitar = async (col: string, campo: keyof typeof report, fuera: (x: Doc) => boolean) => {
      await mutar(col, (l) => { const f = l.filter((x) => !fuera(x)); report[campo] = l.length - f.length; return f; });
    };
    await quitar("pedidos", "pedidos_removed", (p) => p.origen_id === id || p.solicitante_id === id);
    await quitar("lotes", "lotes_removed", (l) => l.productor_id === id || l.published_by === id);
    await quitar("ratings", "ratings_removed", (r) => r.rated_id === id || r.rated_by === id);
    await quitar("chats", "chats_removed", (c) => (Array.isArray(c.participants) ? c.participants : []).includes(id));
    const f = await db.usuario.findUnique({ where: { id } });
    if (f) {
      await db.usuario.update({ where: { id }, data: { activo: false, extra: { ...((f.extra as Doc) ?? {}), reset_at: nowIso() } } });
      await db.sesion.deleteMany({ where: { usuarioId: id } });
    }
    return { user_id: id, report };
  },

  async reset_platform(ctx) {
    if (str(ctx.query.confirm) !== "yes") fail("Debes confirmar con ?confirm=yes");
    // Los datos de personas no se vacían nunca; un catálogo con algún registro
    // real (sin marca de ejemplo/demo) tampoco.
    const intocables = ["members", "consents", "waitlist", "chats", "pedidos"];
    const reset: string[] = [], protegidos: string[] = [];
    for (const r of RECURSOS) {
      if (intocables.includes(r)) { protegidos.push(r); continue; }
      let vaciado = false, reales = false;
      await mutar(r, (l) => {
        reales = l.some((x) => !x.ejemplo && !x.demo);
        if (reales || !l.length) return l;
        vaciado = true;
        return [];
      });
      if (reales) protegidos.push(r); else if (vaciado) reset.push(r);
    }
    return { reset, count: reset.length, protegidos, nota: "Los datos de personas y los catálogos con registros reales no se vacían." };
  },

  async export(ctx) {
    const tipo = str(ctx.query.tipo);
    if (!esRecurso(tipo) && !DATOS.includes(tipo)) fail("tipo no válido.");
    const datos = esRecurso(tipo) ? await leer(tipo) : await listar(tipo);
    const bonito = !["0", "false", ""].includes(str(ctx.query.pretty ?? "1"));
    const sello = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
    return new Cruda(JSON.stringify(datos, null, bonito ? 4 : 0), "application/json; charset=utf-8", 200, { "Content-Disposition": `attachment; filename="${tipo}-${sello}.json"` });
  },

  async stats_global() {
    const counts: Doc = {};
    for (const r of RECURSOS) counts[r] = r === "members" ? await db.usuario.count() : r === "consents" ? await db.consentimiento.count() : (await listar(r)).length;
    counts.cursos = (await listar("cursos")).length;
    counts.planes = (await listar("planes")).length;
    counts.paginas = (await listar("paginas")).length;
    const porRol: Record<string, number> = {};
    for (const g of await db.usuario.groupBy({ by: ["rol"], _count: { _all: true } })) porRol[g.rol || "sin_rol"] = g._count._all;
    counts.miembros_por_rol = porRol;
    const pedidos = await listar("pedidos");
    const porEstado: Record<string, number> = {};
    let ingresos = 0;
    for (const p of pedidos) {
      const e = str(p.estado) || "sin_estado";
      porEstado[e] = (porEstado[e] ?? 0) + 1;
      if (p.estado === "Entregado") ingresos += Number(p.total) || 0;
    }
    counts.pedidos_por_estado = porEstado;
    counts.ingresos_totales = ingresos;
    return counts;
  },
};

export const admin: Modulo = { acciones, guardia: (ctx) => requiereAdmin(ctx), noValida: { mensaje: "Acción no válida.", codigo: 400 } };
