// Port de api/cursos.php: la Academia (cursos, matrícula, avance, autoría).
// Colecciones: «contenido-cursos» (cursos completos), «cursos» (catálogo
// corto), y los mapas «inscripciones-cursos» {curso::uid} y
// «progreso-cursos» {uid: {completadas, actualizado}}.
// Cambios: el CSV neutraliza fórmulas (=, +, -, @) para que abrirlo en Excel
// no ejecute nada, y cada escritura del curso es atómica.
import { Cruda, fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mapa, mutar, mutarMapa, type Doc } from "../lib/docs.js";
import { db } from "../lib/db.js";
import { aDoc, miembroRoles, requiereUsuario, tieneRol, todosLosMiembros, usuarioActual } from "../lib/usuarios.js";
import { nombreMiembro, notificar, notificarAdmins, publicarAvisoComunidad, registrarActividad } from "../lib/avisos.js";
import { cupo } from "../lib/seguridad.js";
import { cortar, largo, nowIso, str, whatsappDigitos } from "../lib/util.js";

const NIVELES = ["Básico", "Intermedio", "Avanzado"];
const CATEGORIAS = ["produccion", "postcosecha", "calidad", "comercial", "administrativo", "barismo", "legal", "general"];
const ACCESOS = ["abierto", "aprobacion"];
const MAX_MODULOS = 12, MAX_LECCIONES = 12, MAX_BLOQUES = 40;
const BLOQUES = ["texto", "imagen", "enlace", "video", "documento", "codigo", "tabla"];
const EMBED = ["youtube.com", "www.youtube.com", "youtu.be", "www.youtu.be", "player.vimeo.com", "vimeo.com", "www.vimeo.com", "drive.google.com", "docs.google.com", "onedrive.live.com", "1drv.ms", "dropbox.com", "www.dropbox.com"];
const SUBIDA = /^\/uploads\/user-content\/[A-Za-z0-9._-]+$/;

/* ── URLs y bloques ─────────────────────────────────────────────────────── */
const hostDe = (u: string) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ""; } };
function urlSegura(u: string): string {
  u = u.trim();
  if (!u) return "";
  if (u.startsWith("/uploads/user-content/") && SUBIDA.test(u)) return u;
  if (!/^https:\/\//i.test(u) || u.includes('"') || u.includes("<")) return "";
  try { new URL(u); return u; } catch { return ""; }
}
const embedPermitido = (u: string) => { const h = hostDe(u); return !!h && EMBED.some((ok) => h === ok || h.endsWith("." + ok)); };
function urlDeInsercion(e: string): string {
  e = e.trim();
  if (!e) return "";
  const m = /src\s*=\s*["']([^"']+)["']/i.exec(e) ?? /https:\/\/[^\s"'<>]+/i.exec(e);
  if (m) e = m[1] ?? m[0];
  return urlSegura(e);
}
function embedNormalizado(u: string): [string, string] {
  const h = hostDe(u);
  if (h.includes("youtu")) {
    const id = /youtu\.be\/([A-Za-z0-9_-]{6,})/.exec(u)?.[1] ?? /[?&]v=([A-Za-z0-9_-]{6,})/.exec(u)?.[1] ?? /\/embed\/([A-Za-z0-9_-]{6,})/.exec(u)?.[1];
    return id ? ["https://www.youtube-nocookie.com/embed/" + id, "youtube"] : ["", ""];
  }
  if (h.includes("vimeo")) { const m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u); return m ? ["https://player.vimeo.com/video/" + m[1], "vimeo"] : ["", ""]; }
  if (h.includes("drive.google.com")) { const m = /\/d\/([A-Za-z0-9_-]+)/.exec(u); return m ? [`https://drive.google.com/file/d/${m[1]}/preview`, "drive"] : ["", ""]; }
  if (h.includes("docs.google.com")) return [u.replace(/\/(edit|view)([?#].*)?$/, "/preview"), "docs"];
  if (h.includes("dropbox.com")) return [u.replace(/[?&]dl=0/, "?raw=1"), "dropbox"];
  if (h.includes("onedrive") || h.includes("1drv.ms")) return [u, "onedrive"];
  return ["", ""];
}
const t = (v: unknown) => str(v).trim();
const lista = (v: unknown): any[] => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []);

function bloquesSaneados(bs: unknown): Doc[] {
  const out: Doc[] = [];
  for (const b of lista(bs)) {
    if (!b || typeof b !== "object") continue;
    const tipo = t(b.tipo ?? "texto").toLowerCase();
    if (!BLOQUES.includes(tipo)) continue;
    const n: Doc = { tipo };
    const titulo = t(b.titulo);
    if (titulo) n.titulo = cortar(titulo, 140);
    if (tipo === "texto") { const x = t(b.texto); if (!x) continue; n.texto = cortar(x, 8000); }
    else if (tipo === "codigo") {
      const c = str(b.codigo); if (!c.trim()) continue;
      n.codigo = cortar(c, 6000);
      const l = t(b.lenguaje); if (l) n.lenguaje = cortar(l.replace(/[^A-Za-z0-9+#-]/g, ""), 20);
    } else if (tipo === "imagen") {
      const u = urlSegura(str(b.url)); if (!u) continue;
      n.url = u; n.alt = cortar(t(b.alt) || "Imagen del curso", 200);
      const p = t(b.pie); if (p) n.pie = cortar(p, 300);
    } else if (tipo === "enlace") {
      const u = urlDeInsercion(str(b.url)); if (!u) continue;
      n.url = u; n.titulo = cortar(titulo || "Documento del curso", 140);
      const d = t(b.descripcion); if (d) n.descripcion = cortar(d, 400);
    } else if (tipo === "tabla") {
      const cols = lista(b.columnas).map(t).filter(Boolean).slice(0, 6).map((c) => cortar(c, 80));
      const filas: string[][] = [];
      for (const f of lista(b.filas)) {
        if (!Array.isArray(f) && (typeof f !== "object" || !f)) continue;
        const limpia = lista(f).slice(0, cols.length).map((c) => cortar(t(c), 180));
        while (limpia.length < cols.length) limpia.push("");
        if (limpia.length) filas.push(limpia);
        if (filas.length >= 16) break;
      }
      if (!cols.length || !filas.length) continue;
      n.columnas = cols; n.filas = filas;
      const p = t(b.pie ?? b.descripcion); if (p) n.pie = cortar(p, 300);
    } else {
      const u = urlDeInsercion(str(b.url));
      if (!u || !embedPermitido(u)) continue;
      const [embed, prov] = embedNormalizado(u);
      if (!embed) continue;
      n.url = embed; n.proveedor = prov;
      const d = t(b.descripcion); if (d) n.descripcion = cortar(d, 400);
    }
    out.push(n);
    if (out.length >= MAX_BLOQUES) break;
  }
  return out;
}

function materialesSaneados(ms: unknown): Doc[] {
  const out: Doc[] = [];
  for (const m of lista(ms)) {
    if (!m || typeof m !== "object") continue;
    const tipo = t(m.tipo).toLowerCase();
    if (!["archivo", "enlace"].includes(tipo)) continue;
    const url = t(m.url);
    if (!url) continue;
    if (tipo === "archivo") { if (!SUBIDA.test(url)) continue; }
    else {
      const interno = url[0] === "/" && !url.startsWith("//") && !url.includes("..");
      if ((!interno && !/^https:\/\/\S+$/i.test(url)) || largo(url) > 400) continue;
    }
    out.push({ tipo, titulo: cortar(t(m.titulo) || (tipo === "archivo" ? "Documento del curso" : "Enlace del curso"), 120), url, nota: cortar(t(m.nota), 300) });
    if (out.length >= 12) break;
  }
  return out;
}

function modulosSaneados(ms: unknown): Doc[] {
  const out: Doc[] = [];
  for (const m of lista(ms)) {
    if (!m || typeof m !== "object") continue;
    const titulo = t(m.titulo);
    if (!titulo) continue;
    let minutos = Math.trunc(Number(m.minutos ?? 0)) || 0;
    if (minutos < 0 || minutos > 600) minutos = 0;
    const mod: Doc = { titulo: cortar(titulo, 140), minutos };
    const r = t(m.resumen); if (r) mod.resumen = cortar(r, 800);
    const e = t(m.ejercicio); if (e) mod.ejercicio = cortar(e, 1500);
    const lecciones: Doc[] = [];
    for (const l of lista(m.lecciones)) {
      if (!l || typeof l !== "object") continue;
      const lt = t(l.titulo), lc = t(l.contenido);
      const conBloques = Array.isArray(l.bloques) && l.bloques.length > 0;
      if (!lt && !lc && !conBloques) continue;
      const lec: Doc = { titulo: cortar(lt, 140), contenido: cortar(lc, 6000) };
      const bs = bloquesSaneados(l.bloques);
      if (bs.length) lec.bloques = bs;
      lecciones.push(lec);
      if (lecciones.length >= MAX_LECCIONES) break;
    }
    if (lecciones.length) mod.lecciones = lecciones;
    out.push(mod);
    if (out.length >= MAX_MODULOS) break;
  }
  return out;
}

const asociadosIds = (a: unknown) => [...new Set(lista(a).map(t).filter(Boolean))].slice(0, 10);

function saneado(i: Doc, base: Doc = {}): Doc {
  const c: Doc = { ...base };
  if ("titulo" in i) { const x = t(i.titulo); if (!x || largo(x) > 140) fail("El título debe tener entre 1 y 140 caracteres.", 422); c.titulo = x; }
  if ("descripcion" in i) { const x = t(i.descripcion); if (largo(x) > 600) fail("La descripción es demasiado larga (máx 600).", 422); c.descripcion = x; }
  if ("nivel" in i) { const x = t(i.nivel); if (!NIVELES.includes(x)) fail("Nivel inválido.", 422); c.nivel = x; }
  if ("categoria" in i) { const x = t(i.categoria).toLowerCase(); if (!CATEGORIAS.includes(x)) fail("Categoría inválida.", 422); c.categoria = x; }
  if ("acceso" in i) { const x = t(i.acceso).toLowerCase(); if (!ACCESOS.includes(x)) fail("Tipo de acceso inválido.", 422); c.acceso = x; }
  if ("duracion" in i) { const x = t(i.duracion); if (largo(x) > 40) fail("Duración inválida.", 422); c.duracion = x; }
  for (const k of ["introduccion", "cierre"]) if (k in i) { const x = t(i[k]); if (largo(x) > 1200) fail(`El campo ${k} es demasiado largo.`, 422); c[k] = x; }
  for (const k of ["objetivos", "recursos"]) if (k in i) c[k] = (Array.isArray(i[k]) ? i[k] : []).map(t).filter(Boolean).map((x: string) => cortar(x, 300)).slice(0, 12);
  if ("materiales" in i) c.materiales = materialesSaneados(i.materiales);
  if ("modulos" in i) c.modulos = modulosSaneados(i.modulos);
  c.asociados = asociadosIds(c.asociados);
  return c;
}

/* ── Consultas ──────────────────────────────────────────────────────────── */
const todos = () => listar("contenido-cursos");
const porId = (cs: Doc[], id: string) => cs.find((c) => c.id === id) ?? null;
const totalLecciones = (c: Doc) => lista(c.modulos).reduce((n, m) => n + lista(m?.lecciones).length, 0);
const esAdmin = (ctx: Ctx, u: Doc | null) => tieneRol(ctx, u ?? {}, "admin");
const puedeEditar = (ctx: Ctx, c: Doc, u: Doc) => esAdmin(ctx, u) || (!!str(c.autor_id) && str(c.autor_id) === str(u.id));
function autorOAsociado(ctx: Ctx, c: Doc, u: Doc | null): boolean {
  if (!u && !ctx.ses.d.admin) return false;
  if (esAdmin(ctx, u)) return true;
  const id = str(u?.id);
  return !!id && (str(c.autor_id) === id || asociadosIds(c.asociados).includes(id));
}
const puedePublicar = (ctx: Ctx, u: Doc) => esAdmin(ctx, u) || tieneRol(ctx, u, "asesor");
const slug = (s: string) => s.trim().toLowerCase().replace(/[áéíóúñü]/g, (x) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ñ: "n", ü: "u" })[x]!).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function resumen(c: Doc, completadas: string[] = []): Doc {
  const total = totalLecciones(c);
  const hechas = completadas.filter((k) => str(k).startsWith(str(c.id) + "::")).length;
  return {
    id: c.id ?? "", titulo: c.titulo ?? "", nivel: c.nivel ?? "", duracion: c.duracion ?? "", categoria: c.categoria ?? "", descripcion: c.descripcion ?? "",
    autor: c.autor ?? "Red Café Ecuador", autor_id: c.autor_id ?? "", modulos: lista(c.modulos).length, lecciones: total,
    completadas: Math.min(hechas, total), avance: total > 0 ? Math.round((hechas / total) * 100) : 0, listo: total > 0,
    verificado: !!c.verificado, verificado_en: c.verificado_en ?? null, verificado_por: c.verificado_por ?? "",
  };
}
const inscripciones = () => mapa("inscripciones-cursos");
const clave = (c: string, u: string) => `${c}::${u}`;
async function estadoInscripcion(cid: string, uid: string, todas?: Doc): Promise<string> {
  if (!uid) return "anonimo";
  const i = (todas ?? (await inscripciones()))[clave(cid, uid)];
  return i && typeof i === "object" ? str(i.estado || "pendiente") : "ninguno";
}
async function accesoConcedido(ctx: Ctx, c: Doc, u: Doc | null): Promise<boolean> {
  if (c.publico) return true;
  if (!u && !ctx.ses.d.admin) return false;
  if (autorOAsociado(ctx, c, u)) return true;
  const e = await estadoInscripcion(str(c.id), str(u?.id));
  return (c.acceso ?? "abierto") === "aprobacion" ? e === "aprobado" : ["matriculado", "aprobado"].includes(e);
}
async function usuarioOAdmin(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  if (u) return u;
  if (ctx.ses.d.admin) return { id: "admin", nombre: "Administración", rol: "admin", roles: ["admin"] };
  fail("No autenticado.", 401);
}
async function matriculado(ctx: Ctx, c: Doc, u: Doc | null) {
  if (!u) return false;
  if (autorOAsociado(ctx, c, u)) return true;
  return ["matriculado", "pendiente", "aprobado"].includes(await estadoInscripcion(str(c.id), str(u.id)));
}
function sinContenido(c: Doc): Doc {
  const o: Doc = { ...c };
  delete o.asociados;
  o.materiales_count = lista(c.materiales).length;
  delete o.materiales;
  o.modulos = lista(c.modulos).map((m) => ({ titulo: m.titulo ?? "", minutos: m.minutos ?? 0, resumen: m.resumen ?? "", lecciones: lista(m.lecciones).map((l) => ({ titulo: l.titulo ?? "" })) }));
  return o;
}
const progresoTodo = () => mapa("progreso-cursos");
const progresoDe = async (uid: string) => { const p = (await progresoTodo())[uid]; return p && typeof p === "object" ? p : {}; };
const miembrosPorId = async () => new Map((await todosLosMiembros()).map((m) => [str(m.id), m]));

function estudiantes(c: Doc, ins: Doc, prog: Doc, miembros: Map<string, Doc>) {
  const cid = str(c.id), total = totalLecciones(c);
  const est: Doc[] = [];
  const totales: Record<string, number> = { pendiente: 0, matriculado: 0, aprobado: 0, rechazado: 0 };
  let suma = 0, enrolados = 0;
  for (const i of Object.values<Doc>(ins)) {
    if (!i || typeof i !== "object" || str(i.curso) !== cid) continue;
    const uid = str(i.usuario), m = miembros.get(uid);
    const estado = str(i.estado || "pendiente");
    totales[estado] = (totales[estado] ?? 0) + 1;
    const p = prog[uid] && typeof prog[uid] === "object" ? prog[uid] : {};
    const hechas = lista(p.completadas).filter((k) => str(k).startsWith(cid + "::")).length;
    const avance = total > 0 ? Math.round((hechas / total) * 100) : 0;
    const activo = ["matriculado", "aprobado"].includes(estado);
    if (activo) { enrolados++; suma += avance; }
    const contacto = activo && i.contacto_visible_autor !== false;
    const roles = m ? miembroRoles(m) : [];
    est.push({
      usuario_id: uid, nombre: str(m?.nombre ?? i.nombre), perfil: (roles.length ? roles : [str(i.rol)]).join(" · "), rol: roles[0] ?? "",
      provincia: str(m?.provincia), estado, fecha: str(i.solicitado), avance_pct: avance, completadas: hechas,
      ultima_actividad: str(p.actualizado) || str(i.solicitado), contacto_visible: contacto, contacto_visible_autor: i.contacto_visible_autor ?? true,
      email: contacto ? str(m?.email) : null, telefono: contacto ? str(m?.telefono) : null, whatsapp: contacto ? whatsappDigitos(m?.telefono) : "",
    });
  }
  est.sort((a, b) => str(b.fecha).localeCompare(str(a.fecha)));
  return { estudiantes: est, totales, avance_medio: enrolados ? Math.round(suma / enrolados) : 0, matriculados: (totales.matriculado ?? 0) + (totales.aprobado ?? 0), pendientes: totales.pendiente ?? 0 };
}
async function cursosDelAutor(ctx: Ctx, u: Doc, filtro = ""): Promise<Doc[]> {
  const mios = (await todos()).filter((c) => autorOAsociado(ctx, c, u));
  if (!filtro) return mios;
  const c = mios.find((x) => str(x.id) === filtro);
  if (!c) fail("No autorizado: ese curso no es tuyo.", 403);
  return [c];
}
async function asociadosDetalle(c: Doc) {
  const ids = asociadosIds(c.asociados);
  if (!ids.length) return [];
  const ms = await miembrosPorId();
  return ids.map((id) => ({ id, nombre: str(ms.get(id)?.nombre ?? id), email: str(ms.get(id)?.email) }));
}
const ETIQUETAS: Record<string, string> = { pendiente: "Pendiente", matriculado: "Matriculado", aprobado: "Aprobado", rechazado: "Rechazado" };
/** Celda CSV (separador «;»). Neutraliza fórmulas: una celda que empieza por
 *  =, +, -, @, tab o retorno se ejecutaría al abrir el archivo en Excel. */
export function celdaCsv(v: string): string {
  v = v.trim();
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  if (/[;\n"]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}

/** Mantiene el catálogo corto («cursos») alineado con el curso completo. */
async function sincronizarCatalogo(c: Doc | null, idBorrar?: string) {
  await mutar("cursos", (cat) => {
    if (idBorrar) return cat.filter((x) => x.id !== idBorrar);
    if (!c) return cat;
    const corto = (x: Doc) => {
      for (const k of ["titulo", "nivel", "duracion", "categoria", "descripcion"]) if (c[k] !== undefined) x[k] = c[k];
      x.modulos = lista(c.modulos).map((m) => ({ titulo: m.titulo, minutos: m.minutos }));
      return x;
    };
    const k = cat.findIndex((x) => x.id === c.id);
    if (k >= 0) cat[k] = corto(cat[k]); else cat.push(corto({ id: c.id, descripcion: c.descripcion ?? "" }));
    return cat;
  });
}
const enlaceCurso = (id: string) => "/academia/" + encodeURIComponent(id) + "/";

/* ── Acciones ───────────────────────────────────────────────────────────── */
const acciones: Modulo["acciones"] = {
  async list(ctx) {
    const u = await usuarioActual(ctx);
    const hechas = u ? lista((await progresoDe(str(u.id))).completadas).map(str) : [];
    return { cursos: (await todos()).map((c) => resumen(c, hechas)), autenticado: !!u };
  },

  async get(ctx) {
    const id = t(ctx.query.id);
    if (!id) fail("id requerido.", 422);
    const c = porId(await todos(), id);
    if (!c) fail("Curso no encontrado.", 404);
    const u = await usuarioActual(ctx);
    const hechas = u ? lista((await progresoDe(str(u.id))).completadas).map(str) : [];
    const propias = hechas.filter((k) => k.startsWith(id + "::"));
    const ok = await accesoConcedido(ctx, c, u);
    return {
      curso: ok ? c : sinContenido(c), total: totalLecciones(c), completadas: ok ? propias : [], avance: ok ? resumen(c, hechas).avance : 0,
      puede_editar: u ? puedeEditar(ctx, c, u) : false, acceso: c.acceso ?? "abierto", acceso_concedido: ok,
      matriculado: await matriculado(ctx, c, u), mi_solicitud: u ? await estadoInscripcion(id, str(u.id)) : "anonimo",
    };
  },

  async progreso(ctx) {
    const u = await requiereUsuario(ctx);
    const hechas = lista((await progresoDe(str(u.id))).completadas).map(str);
    const det = (await todos()).map((c) => resumen(c, hechas));
    const con = det.filter((c) => c.completadas > 0), fin = det.filter((c) => c.lecciones > 0 && c.completadas >= c.lecciones);
    return { cursos: det, en_curso: con.length - fin.length, terminados: fin.length, completadas: hechas.length };
  },

  async completar(ctx) {
    const u = await requiereUsuario(ctx);
    const cid = t(ctx.in.curso);
    const mod = "modulo" in ctx.in ? Math.trunc(Number(ctx.in.modulo)) : -1, lec = "leccion" in ctx.in ? Math.trunc(Number(ctx.in.leccion)) : -1;
    const hecho = "hecho" in ctx.in ? [true, 1, "1", "true", "on", "yes"].includes(ctx.in.hecho as any) : true;
    if (!cid || !(mod >= 0) || !(lec >= 0)) fail("Curso, módulo y lección requeridos.", 422);
    const c = porId(await todos(), cid);
    if (!c) fail("Curso no encontrado.", 404);
    const mods = lista(c.modulos);
    if (!mods[mod]) fail("Módulo no encontrado.", 404);
    if (!lista(mods[mod].lecciones)[lec]) fail("Lección no encontrada.", 404);
    if (!(await accesoConcedido(ctx, c, u))) fail((c.acceso ?? "abierto") === "aprobacion" ? "Necesitas que el autor apruebe tu acceso a este curso." : "Matricúlate en el curso antes de registrar tu avance.", 403);
    const k = `${cid}::${mod}::${lec}`, uid = str(u.id);
    let res: string[] = [];
    await mutarMapa("progreso-cursos", (todo) => {
      if (!todo[uid] || typeof todo[uid] !== "object") todo[uid] = { completadas: [], actualizado: nowIso() };
      const l = lista(todo[uid].completadas).map(str).filter((x) => x !== k);
      if (hecho) l.push(k);
      todo[uid].completadas = l; todo[uid].actualizado = nowIso();
      res = l;
      return todo;
    });
    const propias = res.filter((x) => x.startsWith(cid + "::")), total = totalLecciones(c);
    return { completadas: propias, total, avance: total > 0 ? Math.round((propias.length / total) * 100) : 0 };
  },

  async reiniciar(ctx) {
    const u = await requiereUsuario(ctx);
    const cid = t(ctx.in.curso);
    if (!cid) fail("Curso requerido.", 422);
    const uid = str(u.id);
    await mutarMapa("progreso-cursos", (todo) => {
      if (!todo[uid]) return todo;
      todo[uid].completadas = lista(todo[uid].completadas).filter((k) => !str(k).startsWith(cid + "::"));
      todo[uid].actualizado = nowIso();
      return todo;
    });
    return { reiniciado: cid };
  },

  async matricular(ctx) {
    const u = await requiereUsuario(ctx);
    const cid = t(ctx.in.curso);
    if (!cid) fail("Curso requerido.", 422);
    const c = porId(await todos(), cid);
    if (!c) fail("Curso no encontrado.", 404);
    const uid = str(u.id);
    if (autorOAsociado(ctx, c, u)) return { estado: "aprobado", mensaje: "Es tu propio curso: no necesitas matricularte." };
    const moderado = (c.acceso ?? "abierto") === "aprobacion";
    let previo = "";
    const nuevo = moderado ? "pendiente" : "matriculado";
    await mutarMapa("inscripciones-cursos", async (todas) => {
      previo = await estadoInscripcion(cid, uid, todas);
      if (["matriculado", "aprobado", "pendiente"].includes(previo)) return todas;
      todas[clave(cid, uid)] = { curso: cid, usuario: uid, nombre: u.nombre ?? "", email: u.email ?? "", estado: nuevo, mensaje: "", solicitado: nowIso(), contacto_visible_autor: true, contacto_visible_en: nowIso() };
      return todas;
    });
    if (["matriculado", "aprobado"].includes(previo)) return { estado: previo, mensaje: "Ya estabas matriculado." };
    if (previo === "pendiente") return { estado: "pendiente", mensaje: "Tu solicitud sigue esperando respuesta del autor." };
    const titulo = str(c.titulo || cid);
    await registrarActividad(ctx, "curso-matricula", { objeto_tipo: "curso", objeto_id: cid, detalle: titulo });
    if (moderado) {
      await notificar(str(c.autor_id), "curso-acceso", `${u.nombre ?? "Un miembro"} quiere matricularse en «${titulo}»`, "Resuélvelo desde la academia.", enlaceCurso(cid));
      return { estado: "pendiente", mensaje: "Este curso lo modera su autor. Te avisaremos cuando responda." };
    }
    await notificar(uid, "curso", `Te matriculaste en «${titulo}»`, "Ya puedes estudiarlo y tu avance queda registrado.", enlaceCurso(cid));
    if (str(c.autor_id)) await notificar(str(c.autor_id), "curso", `${u.nombre ?? "Un miembro"} se matriculó en «${titulo}»`, "Ya puedes ver su avance y sus datos de contacto desde el panel.", "/panel/");
    return { estado: "matriculado", mensaje: "Matrícula hecha. Ya puedes empezar." };
  },

  async desmatricular(ctx) {
    const u = await requiereUsuario(ctx);
    const cid = t(ctx.in.curso);
    if (!cid) fail("Curso requerido.", 422);
    await mutarMapa("inscripciones-cursos", (todas) => { delete todas[clave(cid, str(u.id))]; return todas; });
    return { estado: "ninguno" };
  },

  async solicitar_acceso(ctx) {
    const u = await requiereUsuario(ctx);
    const cid = t(ctx.in.curso);
    if (!cid) fail("Curso requerido.", 422);
    const c = porId(await todos(), cid);
    if (!c) fail("Curso no encontrado.", 404);
    if ((c.acceso ?? "abierto") !== "aprobacion") return { estado: "aprobado", mensaje: "Este curso es de acceso libre." };
    if (autorOAsociado(ctx, c, u)) return { estado: "aprobado", mensaje: "Es tu propio curso." };
    const nota = t(ctx.in.mensaje);
    if (largo(nota) > 400) fail("El mensaje es demasiado largo (máx 400).", 422);
    const uid = str(u.id);
    let final = "pendiente";
    await mutarMapa("inscripciones-cursos", (todas) => {
      const k = clave(cid, uid);
      if (todas[k]?.estado === "aprobado") { final = "aprobado"; return todas; }
      todas[k] = { curso: cid, usuario: uid, nombre: u.nombre ?? "", email: u.email ?? "", estado: "pendiente", mensaje: nota, solicitado: nowIso(), contacto_visible_autor: true, contacto_visible_en: nowIso() };
      return todas;
    });
    if (final === "pendiente") {
      const titulo = str(c.titulo || cid);
      await notificar(str(c.autor_id), "curso-acceso", `${u.nombre ?? "Un miembro"} pide acceso a «${titulo}»`, nota || "Sin mensaje. Resuélvelo desde la academia.", enlaceCurso(cid));
      await registrarActividad(ctx, "curso-acceso-solicitado", { objeto_tipo: "curso", objeto_id: cid, detalle: "Solicitud de acceso a " + titulo, contraparte: str(c.autor) });
    }
    return { estado: final };
  },

  async solicitudes(ctx) {
    const u = await requiereUsuario(ctx);
    const mios = new Map((await todos()).filter((c) => autorOAsociado(ctx, c, u)).map((c) => [str(c.id), c.titulo ?? ""]));
    const out = Object.entries(await inscripciones()).filter(([, i]) => i && typeof i === "object" && mios.has(str(i.curso)))
      .map(([k, i]) => ({ ...i, curso_titulo: mios.get(str(i.curso)), clave: k })).sort((a, b) => str(b.solicitado).localeCompare(str(a.solicitado)));
    return { solicitudes: out, pendientes: out.filter((i) => i.estado === "pendiente").length };
  },

  async resolver_acceso(ctx) {
    const u = await requiereUsuario(ctx);
    const cid = t(ctx.in.curso), destino = t(ctx.in.usuario), decision = t(ctx.in.decision).toLowerCase();
    if (!cid || !destino) fail("Curso y usuario requeridos.", 422);
    if (!["aprobado", "rechazado", "pendiente"].includes(decision)) fail("Decisión inválida.", 422);
    const c = porId(await todos(), cid);
    if (!c) fail("Curso no encontrado.", 404);
    if (!autorOAsociado(ctx, c, u)) fail("Solo el autor del curso, una persona asociada o un administrador puede resolver el acceso.", 403);
    let hallada = false;
    await mutarMapa("inscripciones-cursos", (todas) => {
      const k = clave(cid, destino);
      if (!todas[k] || typeof todas[k] !== "object") return todas;
      Object.assign(todas[k], { estado: decision, resuelto: nowIso(), resuelto_por: u.id ?? "" });
      hallada = true;
      return todas;
    });
    if (!hallada) fail("No hay solicitud de ese miembro para este curso.", 404);
    const titulo = str(c.titulo || cid);
    const msj: Record<string, [string, string]> = {
      aprobado: [`Ya tienes acceso a «${titulo}»`, "Puedes empezar el curso y registrar tu avance."],
      rechazado: [`Tu solicitud de acceso a «${titulo}» no fue aprobada`, "Puedes escribir al autor si necesitas revisarlo."],
      pendiente: [`Tu acceso a «${titulo}» vuelve a estar pendiente`, "El autor lo revisará de nuevo."],
    };
    await notificar(destino, "curso-acceso", msj[decision][0], msj[decision][1], enlaceCurso(cid));
    await registrarActividad(ctx, "curso-acceso-" + decision, { objeto_tipo: "curso", objeto_id: cid, detalle: titulo, contraparte: await nombreMiembro(destino) });
    return { curso: cid, usuario: destino, estado: decision };
  },

  async matriculados(ctx) {
    const u = await usuarioOAdmin(ctx);
    const mios = await cursosDelAutor(ctx, u, t(ctx.query.curso));
    if (!mios.length) fail("Aún no tienes cursos propios.", 404);
    const [ins, prog, ms] = await Promise.all([inscripciones(), progresoTodo(), miembrosPorId()]);
    const uid = str(u.id);
    const cursos = [];
    for (const c of mios) {
      const d = estudiantes(c, ins, prog, ms);
      const gestiona = !!str(c.autor_id) && str(c.autor_id) === uid;
      cursos.push({
        curso: str(c.id), titulo: str(c.titulo), acceso: c.acceso ?? "abierto", autor_id: c.autor_id ?? "", puede_gestionar_asociados: gestiona,
        asociados: gestiona ? await asociadosDetalle(c) : [], total_lecciones: totalLecciones(c),
        resumen: { matriculados: d.matriculados, pendientes: d.pendientes, avance_medio: d.avance_medio }, totales: d.totales, estudiantes: d.estudiantes,
      });
    }
    return { cursos };
  },

  async exportar(ctx) {
    const u = await usuarioOAdmin(ctx);
    const filtro = t(ctx.query.curso);
    const mios = await cursosDelAutor(ctx, u, filtro);
    const [ins, prog, ms] = await Promise.all([inscripciones(), progresoTodo(), miembrosPorId()]);
    const filas: string[][] = [["Curso", "Nombre", "Perfil", "Provincia", "Estado", "Fecha matrícula", "Avance %", "Última actividad", "Correo", "Teléfono"]];
    for (const c of mios) for (const e of estudiantes(c, ins, prog, ms).estudiantes) {
      filas.push([str(c.titulo), str(e.nombre), str(e.perfil), str(e.provincia), ETIQUETAS[e.estado] ?? e.estado, str(e.fecha).slice(0, 10), `${e.avance_pct} %`, str(e.ultima_actividad).slice(0, 10), str(e.email), str(e.telefono)]);
    }
    const csv = "﻿" + filas.map((f) => f.map(celdaCsv).join(";")).join("\r\n") + "\r\n";
    const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const nombre = mios.length === 1 ? `redcafe-estudiantes-${slug(str(mios[0].titulo || "curso"))}.csv` : `redcafe-estudiantes-${filtro ? slug(filtro) + "-" : ""}${hoy}.csv`;
    return new Cruda(csv, "text/csv; charset=utf-8", 200, { "Content-Disposition": `attachment; filename="${nombre}"`, "Cache-Control": "no-store" });
  },

  async recordar(ctx) {
    const u = await usuarioOAdmin(ctx);
    const cid = t(ctx.in.curso ?? ctx.query.curso);
    if (!cid) fail("Curso requerido.", 422);
    let dias = Math.trunc(Number(ctx.in.dias ?? ctx.query.dias ?? 30)) || 0;
    if (dias < 1 || dias > 365) dias = 30;
    const c = porId(await todos(), cid);
    if (!c) fail("Curso no encontrado.", 404);
    if (!puedeEditar(ctx, c, u)) fail("Solo el autor del curso o un administrador puede avisar.", 403);
    const [ins, prog, ms] = await Promise.all([inscripciones(), progresoTodo(), miembrosPorId()]);
    const avisar = estudiantes(c, ins, prog, ms).estudiantes.filter((e) => ["matriculado", "aprobado"].includes(e.estado) && Date.now() - (Date.parse(e.ultima_actividad) || Date.now()) >= dias * 86400_000).map((e) => str(e.usuario_id));
    // La marca semanal se reserva bajo bloqueo antes de avisar: dos clics a la vez no duplican avisos.
    await mutar("contenido-cursos", (cs) => {
      const x = cs.find((y) => y.id === cid);
      if (!x) fail("Curso no encontrado.", 404);
      const previo = Date.parse(str(x.recordatorio_inactivos_en)) || 0;
      if (previo && Date.now() - previo < 7 * 86400_000) fail(`Ya avisaste a los inactivos de este curso esta semana. Vuelve en ${Math.ceil((previo + 7 * 86400_000 - Date.now()) / 86400_000)} día(s).`, 429);
      Object.assign(x, { recordatorio_inactivos_en: nowIso(), recordatorio_inactivos_dias: dias, recordatorio_inactivos_n: avisar.length });
      return cs;
    });
    const titulo = str(c.titulo || cid);
    for (const uid of avisar) await notificar(uid, "curso", `¿Sigues con «${titulo}»?`, `Hace más de ${dias} días que no avanzas en este curso. Tu avance está guardado: continúa donde lo dejaste.`, enlaceCurso(cid));
    return { avisados: avisar.length, dias, curso: cid };
  },

  asociar: (ctx) => asociar(ctx, true),
  desasociar: (ctx) => asociar(ctx, false),

  async publish(ctx) {
    if (!(await cupo(ctx, "curso_publicar", 20, 3600))) fail("Has publicado demasiado seguido. Vuelve a intentarlo en una hora.", 429);
    const u = await usuarioOAdmin(ctx);
    if (!puedePublicar(ctx, u)) fail("Para publicar cursos necesitas el perfil de Asesor Experto. Puedes añadirlo desde tu cuenta sin perder el que ya tienes: cada miembro puede tener hasta tres perfiles.", 403);
    if (!t(ctx.in.titulo)) fail("El curso necesita un título.", 422);
    let curso!: Doc;
    await mutar("contenido-cursos", (cs) => {
      const base = slug(str(ctx.in.titulo)) || "curso";
      let id = base, n = 2;
      while (porId(cs, id)) id = `${base}-${n++}`;
      curso = saneado(ctx.in, { id, nivel: "Básico", categoria: "general", duracion: "", modulos: [], asociados: [] });
      Object.assign(curso, { autor: u.nombre ?? "Miembro de la Red", autor_id: u.id ?? "", created_at: nowIso() });
      return [...cs, curso];
    });
    await sincronizarCatalogo(curso);
    await publicarAvisoComunidad("curso", curso);
    await registrarActividad(ctx, "curso-publicado", { objeto_tipo: "curso", objeto_id: str(curso.id), detalle: `${curso.titulo} · ${curso.nivel}` });
    await notificarAdmins("curso", "Nuevo curso publicado: " + curso.titulo, `Lo publicó ${curso.autor}.`, "/academia/");
    return { curso };
  },

  async update(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = t(ctx.in.id ?? ctx.query.id);
    if (!id) fail("id requerido.", 422);
    let act!: Doc;
    await mutar("contenido-cursos", (cs) => {
      const k = cs.findIndex((c) => c.id === id);
      if (k < 0) fail("Curso no encontrado.", 404);
      if (!puedeEditar(ctx, cs[k], u)) fail("No autorizado: solo el autor del curso o un administrador puede editarlo.", 403);
      act = saneado(ctx.in, cs[k]);
      act.updated_at = nowIso(); act.updated_by = u.id ?? "";
      cs[k] = act;
      return cs;
    });
    await sincronizarCatalogo(act);
    return { curso: act };
  },

  async delete(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = t(ctx.in.id ?? ctx.query.id);
    if (!id) fail("id requerido.", 422);
    await mutar("contenido-cursos", (cs) => {
      const c = porId(cs, id);
      if (!c) fail("Curso no encontrado.", 404);
      if (!puedeEditar(ctx, c, u)) fail("No autorizado: solo el autor del curso o un administrador puede eliminarlo.", 403);
      return cs.filter((x) => x.id !== id);
    });
    await sincronizarCatalogo(null, id);
    return { eliminado: id };
  },

  async mine(ctx) {
    const u = await requiereUsuario(ctx);
    return { cursos: (await todos()).filter((c) => autorOAsociado(ctx, c, u)), es_admin: esAdmin(ctx, u), puede_publicar: puedePublicar(ctx, u) };
  },

  async matriculas(ctx) {
    const u = await requiereUsuario(ctx);
    const uid = str(u.id);
    const hechas = lista((await progresoDe(uid)).completadas).map(str);
    const ins = await inscripciones();
    const out: Doc[] = [];
    for (const c of await todos()) {
      const e = await estadoInscripcion(str(c.id), uid, ins);
      if (["matriculado", "aprobado", "pendiente"].includes(e)) out.push({ ...resumen(c, hechas), mi_solicitud: e });
    }
    return { cursos: out };
  },
};

async function asociar(ctx: Ctx, alta: boolean) {
  const u = await requiereUsuario(ctx);
  const cid = t(ctx.in.curso ?? ctx.query.curso);
  if (!cid) fail("Curso requerido.", 422);
  const ident = t(ctx.in.miembro ?? ctx.in.usuario ?? ctx.in.email ?? ctx.in.id);
  if (!ident) fail("Miembro requerido.", 422);
  const f = (await db.usuario.findUnique({ where: { id: ident } })) ?? (await db.usuario.findUnique({ where: { email: ident.toLowerCase() } }));
  if (!f) fail("Miembro no encontrado.", 404);
  const m = aDoc(f), mid = str(m.id), uid = str(u.id);
  let act!: Doc;
  await mutar("contenido-cursos", (cs) => {
    const c = cs.find((x) => str(x.id) === cid);
    if (!c) fail("Curso no encontrado.", 404);
    if (str(c.autor_id) !== uid) fail("Solo el autor real del curso puede gestionar personas asociadas.", 403);
    if (mid === str(c.autor_id)) fail("El autor del curso no necesita asociarse.", 422);
    const as = asociadosIds(c.asociados);
    if (alta) {
      if (as.includes(mid)) fail("Ese miembro ya está asociado al curso.", 409);
      if (as.length >= 10) fail("Puedes asociar máximo 10 personas a un curso.", 422);
      c.asociados = [...as, mid];
    } else {
      if (!as.includes(mid)) fail("Ese miembro no está asociado al curso.", 404);
      c.asociados = as.filter((x) => x !== mid);
    }
    c.updated_at = nowIso(); c.updated_by = uid;
    act = c;
    return cs;
  });
  const titulo = str(act.titulo || cid);
  if (alta) await notificar(mid, "curso", `Te asociaron al curso «${titulo}»`, "Ahora puedes ver estudiantes, solicitudes y contenido completo de ese curso.", "/panel/");
  else await notificar(mid, "curso", `Ya no estás asociado al curso «${titulo}»`, "El autor retiró tu acceso de coautoría.", "/panel/");
  return { curso: cid, asociados: await asociadosDetalle(act) };
}

export const cursos: Modulo = { acciones, noValida: { mensaje: "Acción no válida.", codigo: 400 } };
