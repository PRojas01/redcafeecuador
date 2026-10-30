import { exigirDerechos } from "../lib/derechos.js";
// Port de api/comunidad.php (versión corregida).
import { fail, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { filtroVisible, tieneRol, usuarioActual } from "../lib/usuarios.js";
import { db } from "../lib/db.js";
import { int, largo, nowIso, str, textoEntrada, uid } from "../lib/util.js";
import { imagenesValidas } from "./lotes.js";

const LIMITE_DEFECTO = 300, LIMITE_MAX = 500;

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    let posts = await listar("posts");
    const solo = str(ctx.query.solo);
    if (solo === "avisos") posts = posts.filter((p) => p.tipo === "aviso");
    else if (solo === "personas") posts = posts.filter((p) => p.tipo !== "aviso");
    const visible = await filtroVisible(ctx);
    posts = posts.filter(visible).sort((a, b) => str(b.created_at).localeCompare(str(a.created_at)));
    const verificados = new Set((await db.usuario.findMany({ where: { verificado: true }, select: { id: true } })).map((x) => x.id));
    posts = posts.map((p) => ({
      ...p,
      autor_verificado: verificados.has(str(p.autor_id)),
      ...(Array.isArray(p.comments) && p.comments.length ? { comments: p.comments.map((c: Doc) => ({ ...c, autor_verificado: verificados.has(str(c.autor_id)) })) } : {}),
    }));
    const total = posts.length;
    const desde = Math.max(0, int(ctx.query.desde ?? 0));
    const limite = Math.max(1, Math.min(int(ctx.query.limite ?? LIMITE_DEFECTO) || LIMITE_DEFECTO, LIMITE_MAX));
    const pagina = posts.slice(desde, desde + limite);
    return { posts: pagina, total, desde, limite, hay_mas: desde + pagina.length < total };
  },

  async create(ctx) {
    if (!(await cupo(ctx, "comunidad_post", 30, 3600))) fail("Demasiadas publicaciones seguidas. Vuelve a intentarlo en una hora.", 429);
    const u = await usuarioActual(ctx);
    if (!u) fail("No autenticado.", 401);
    const text = textoEntrada(ctx.in.text, 4001, true), titulo = textoEntrada(ctx.in.titulo, 161);
    if (!titulo || !text) fail("Título y texto requeridos.", 422);
    if (largo(text) > 4000) fail("Texto demasiado largo.", 422);
    if (largo(titulo) > 160) fail("Título demasiado largo (máx. 160).", 422);
    const idPost = uid();
    const p = { ...await exigirDerechos(ctx, u, "comunidad.create", idPost), id: idPost, titulo, text, autor: u.nombre, autor_id: u.id, autor_rol: u.rol, created_at: nowIso(), imagenes: imagenesValidas(ctx.in.imagenes), likes: [], comments: [] };
    await mutar("posts", (posts) => [...posts, p]);
    return { post: p };
  },

  async like(ctx) {
    const u = await usuarioActual(ctx);
    if (!u) fail("No autenticado.", 401);
    const id = str(ctx.in.id);
    await mutar("posts", (posts) => posts.map((p) => {
      if (p.id !== id) return p;
      const likes: string[] = Array.isArray(p.likes) ? [...p.likes] : [];
      const ix = likes.indexOf(u.id);
      if (ix < 0) likes.push(u.id); else likes.splice(ix, 1);
      return { ...p, likes };
    }));
    return null;
  },

  async comment(ctx) {
    if (!(await cupo(ctx, "comunidad_comentario", 60, 3600))) fail("Demasiados comentarios seguidos. Vuelve a intentarlo en una hora.", 429);
    const u = await usuarioActual(ctx);
    if (!u) fail("No autenticado.", 401);
    const id = textoEntrada(ctx.in.id, 40), text = textoEntrada(ctx.in.text, 2001, true);
    if (!id || !text) fail("Falta id o text.", 422);
    if (largo(text) > 2000) fail("Comentario demasiado largo (máx. 2000).", 422);
    const idComentario = uid();
    const derechos = await exigirDerechos(ctx, u, "comunidad.comment", idComentario);
    await mutar("posts", (posts) => posts.map((p) => (p.id !== id ? p : {
      ...p, comments: [...(Array.isArray(p.comments) ? p.comments : []), { ...derechos, id: idComentario, autor: u.nombre, autor_id: u.id, text, created_at: nowIso() }],
    })));
    return null;
  },

  async comment_delete(ctx) {
    const u = await usuarioActual(ctx);
    if (!u && !ctx.ses.d.admin) fail("No autenticado.", 401);
    const admin = !!ctx.ses.d.admin || (!!u && tieneRol(ctx, u, "admin"));
    const yo = u?.id ?? "";
    const id = str(ctx.in.id).trim(), cid = str(ctx.in.comment_id).trim();
    if (!id || !cid) fail("Falta id o comment_id.", 422);
    let r = "no-encontrado";
    await mutar("posts", (posts) => posts.map((p) => {
      if (p.id !== id || !Array.isArray(p.comments)) return p;
      const c = p.comments.find((x: Doc) => x.id === cid);
      if (!c) return p;
      if (!(admin || (yo && (c.autor_id === yo || p.autor_id === yo)))) { r = "no-autorizado"; return p; }
      r = "ok";
      return { ...p, comments: p.comments.filter((x: Doc) => x.id !== cid) };
    }));
    if (r === "no-autorizado") fail("Solo quien lo escribió, quien publicó la entrada o la administración puede borrarlo.", 403);
    if (r !== "ok") fail("Comentario no encontrado.", 404);
    return null;
  },

  async update(ctx) {
    let u = await usuarioActual(ctx);
    if (!u && !ctx.ses.d.admin) fail("No autenticado.", 401);
    if (!u) u = { id: "admin", nombre: "Administración", rol: "admin" };
    const id = str(ctx.in.id).trim();
    if (!id) fail("id requerido.", 422);
    const titulo = textoEntrada(ctx.in.titulo, 161), text = textoEntrada(ctx.in.text, 4001, true);
    if (!titulo || !text) fail("Título y texto requeridos.", 422);
    if (largo(text) > 4000) fail("Texto demasiado largo.", 422);
    if (largo(titulo) > 160) fail("Título demasiado largo (máx. 160).", 422);
    const actual = (await listar("posts")).find((p) => p.id === id);
    if (!actual) fail("Publicación no encontrada.", 404);
    if (actual.tipo === "aviso") fail("Las novedades automáticas de la Red no se editan.", 422);
    if (actual.autor_id !== u.id && !ctx.ses.d.admin) fail("No autorizado: solo el autor o un administrador puede editar.", 403);
    const imagenes = "imagenes" in ctx.in ? imagenesValidas(ctx.in.imagenes) : actual.imagenes ?? [];
    const derechos = ctx.ses.d.admin ? {} : await exigirDerechos(ctx, u, "comunidad.update", id);
    let guardado: Doc | null = null;
    await mutar("posts", (posts) => posts.map((p) => (p.id !== id ? p : (guardado = { ...p, ...derechos, titulo, text, imagenes, editado_at: nowIso(), editado_por: u!.id }))));
    if (!guardado) fail("No se pudo guardar el cambio.", 500);
    return { post: guardado };
  },

  async delete(ctx) {
    const u = await usuarioActual(ctx);
    if (!u && !ctx.ses.d.admin) fail("No autenticado.", 401);
    const id = str(ctx.in.id);
    if (!id) fail("id requerido.", 422);
    const obj = (await listar("posts")).find((p) => p.id === id);
    if (!obj) fail("Post no encontrado.", 404);
    if (obj.autor_id !== (u?.id ?? "") && !ctx.ses.d.admin) fail("No autorizado: solo el autor o un administrador puede borrar.", 403);
    await mutar("posts", (posts) => posts.filter((p) => p.id !== id));
    return null;
  },
};

export const comunidad: Modulo = { acciones };
