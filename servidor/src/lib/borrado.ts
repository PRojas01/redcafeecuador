// Baja LOPDP: borrado completo de los datos de un miembro en un solo sitio,
// y la copia de sus datos («Descargar mis datos»). La usan la baja voluntaria
// (moderacion.baja) y el «eliminar miembro» de administración (admin.delete).
//
// Se borra: perfil y contacto, fotos y documentos subidos, solicitudes y
// archivos de identidad, matrículas y avance de cursos, chats y mensajes,
// valoraciones dadas y recibidas, avisos (notificaciones y push) y todo lo que
// publicó. Se conserva solo lo que otras personas necesitan, sin datos suyos:
// los pedidos con terceros y las órdenes de servicio (anonimizados), los comentarios en publicaciones
// ajenas (anonimizados), el registro de consentimientos (prueba legal) y las
// sanciones de moderación (debido proceso). La fila del usuario queda como
// lápida sin datos personales para que su id no se reutilice.
import fs from "node:fs";
import path from "node:path";
import { db } from "./db.js";
import { listar, mapa, mutar, mutarMapa, type Doc } from "./docs.js";
import { config } from "./config.js";
import { carpetaIdentidad } from "./privado.js";
import { descifrar } from "./pii.js";
import { nowIso, str } from "./util.js";

export const ANONIMO = "Miembro que dejó la Red";

const campos = (...c: string[]) => (x: Doc, id: string) => c.some((k) => str(x?.[k]) === id);

/** Colecciones con datos propios del miembro: se borran enteras sus filas. */
const PROPIAS: Record<string, (x: Doc, id: string) => boolean> = {
  lotes: campos("productor_id", "published_by"),
  "servicios-terceros": campos("proveedor_id", "published_by", "owner_id", "autor_id"),
  servicios: campos("usuario_id", "proveedor_id", "published_by"),
  posts: campos("autor_id", "published_by"),
  requerimientos: campos("autor_id", "published_by"),
  empleos: campos("autor_id", "published_by"),
  "busquedas-empleo": campos("autor_id", "published_by"),
  cursos: campos("autor_id"),
  "contenido-cursos": campos("autor_id"),
  postulaciones: campos("postulante_id"),
  "intereses-empleo": campos("empleador_id"),
  "ofertas-requerimiento": campos("oferente_id"),
  cotizaciones: campos("solicitante_id"),
  ratings: campos("rated_id", "rater_id"),
  chats: (x, id) => (Array.isArray(x?.users) ? x.users : Array.isArray(x?.participants) ? x.participants : []).map(str).includes(id),
  notificaciones: campos("uid"),
  "push-suscripciones": campos("uid"),
  reportes: campos("uid"),
  "verificacion-identidad": campos("uid"),
  "contenido-subido": campos("uid"),
  inventario: campos("owner_id"),
  movimientos: campos("owner_id"),
  menus: campos("owner_id"),
  actividad: campos("actor_id", "objeto_id"),
};

/** Filas que dependen de lo borrado (p. ej. postulaciones a sus ofertas). */
const DEPENDIENTES: [col: string, campo: string, padre: string][] = [
  ["postulaciones", "empleo_id", "empleos"],
  ["intereses-empleo", "busqueda_id", "busquedas-empleo"],
  ["ofertas-requerimiento", "requerimiento_id", "requerimientos"],
  ["messages", "room", "chats"],
];

const esDePedido = (p: Doc, id: string) => ["solicitante_id", "productor_id", "proveedor_id", "origen_id"].some((k) => str(p?.[k]) === id);

/** Pedidos abiertos que impiden la baja voluntaria. */
export async function pedidosAbiertos(id: string): Promise<Doc[]> {
  return (await listar("pedidos")).filter((p) => esDePedido(p, id) && !["entregado", "cancelado"].includes(str(p.estado).toLowerCase()));
}

/** Rutas de archivos subidos (/uploads/user-content/…) mencionadas en los documentos. */
function urlsSubidas(docs: Doc[]): string[] {
  const t = JSON.stringify(docs);
  return [...t.matchAll(/\/uploads\/user-content\/([A-Za-z0-9_.-]+)/g)].map((m) => m[1]);
}

function borrarArchivo(dir: string, nombre: string): boolean {
  if (!nombre || path.basename(nombre) !== nombre) return false;
  const f = path.join(dir, nombre);
  if (!fs.existsSync(f)) return false;
  fs.rmSync(f, { force: true });
  return true;
}

export type ResumenBorrado = Record<string, number>;

/**
 * Borra todos los datos del miembro. Idempotente: si se corta a medias, se
 * puede repetir. Devuelve cuántos elementos se quitaron por colección.
 */
export async function borrarMiembro(id: string): Promise<ResumenBorrado> {
  id = str(id).trim();
  if (!id) throw new Error("id requerido");
  const resumen: ResumenBorrado = {};
  const borrados: Record<string, Doc[]> = {};
  const previos: Record<string, Doc[]> = {};
  for (const [col, es] of Object.entries(PROPIAS)) previos[col] = (await listar(col)).filter((x) => es(x, id));
  const filaInicial = await db.usuario.findUnique({ where: { id } });

  // Archivos primero: si el borrado se corta a medias, al repetirlo los
  // documentos que los nombran siguen ahí. Fotos y documentos públicos, y los
  // de identidad (privados).
  let archivos = 0;
  const dirSubidas = path.join(config.uploads, "user-content");
  const nombres = new Set(urlsSubidas(Object.values(previos).flat()));
  const slug = id.replace(/[^A-Za-z0-9_-]/g, "");
  if (slug && fs.existsSync(dirSubidas)) {
    // Nombres de uploads.ts: <contexto>-<id>-<12 hex>.jpg|pdf
    const suyo = new RegExp(`^(comunidad|marketplace|lote|curso|doc)-${slug}-[0-9a-f]{12}\\.(jpg|pdf)$`);
    for (const n of fs.readdirSync(dirSubidas)) if (suyo.test(n)) nombres.add(n);
  }
  for (const n of nombres) if (borrarArchivo(dirSubidas, n)) archivos++;
  const idents = (previos["verificacion-identidad"] ?? []).flatMap((s) => Object.values(s.archivos ?? {}).map(str));
  if (idents.length) {
    const dir = carpetaIdentidad();
    for (const n of idents) if (borrarArchivo(dir, n)) archivos++;
  }
  if (archivos) resumen.archivos = archivos;

  // Lista de espera: se apuntó con su correo, no con su id.
  const email = str(filaInicial?.email).toLowerCase();
  if (email && !email.endsWith("@invalid")) {
    let n = 0;
    await mutar("waitlist", (l) => { const q = l.filter((x) => str(x.email).toLowerCase() !== email); n = l.length - q.length; return n ? q : l; });
    if (n) resumen.waitlist = n;
  }


  for (const [col, es] of Object.entries(PROPIAS)) {
    await mutar(col, (items) => {
      const fuera = items.filter((x) => es(x, id));
      borrados[col] = fuera;
      return fuera.length ? items.filter((x) => !es(x, id)) : items;
    });
    if (borrados[col].length) resumen[col] = borrados[col].length;
  }
  for (const [col, campo, padre] of DEPENDIENTES) {
    const ids = new Set((borrados[padre] ?? []).map((x) => str(x.id)).filter(Boolean));
    if (!ids.size) continue;
    let n = 0;
    await mutar(col, (items) => {
      const quedan = items.filter((x) => !ids.has(str(x?.[campo])));
      n = items.length - quedan.length;
      return n ? quedan : items;
    });
    if (n) resumen[col] = (resumen[col] ?? 0) + n;
  }

  // Comentarios en publicaciones ajenas y pedidos con terceros: anonimizados.
  await mutar("posts", (ps) => ps.map((p) => (Array.isArray(p.comments) && p.comments.some((c: Doc) => str(c.autor_id) === id)
    ? { ...p, comments: p.comments.map((c: Doc) => (str(c.autor_id) === id ? { ...c, autor: ANONIMO, autor_id: "" } : c)) } : p)));
  await mutar("pedidos", (ps) => ps.map((p) => {
    if (!esDePedido(p, id)) return p;
    const x = { ...p };
    for (const [k, campo] of [["solicitante_id", "solicitante"], ["productor_id", "productor"], ["proveedor_id", "proveedor"]]) {
      if (str(x[k]) !== id) continue;
      x[campo] = ANONIMO;
      for (const c of ["email", "telefono", "whatsapp", `${campo}_email`, `${campo}_telefono`, `${campo}_whatsapp`, `${campo}_nombre`]) delete x[c];
    }
    return x;
  }));

  // Órdenes de servicios de la plataforma: se conservan (registro contable) sin sus datos.
  await mutar("ordenes", (os) => os.map((o) => (str(o.usuario_id) === id
    ? { ...o, usuario_nombre: ANONIMO, usuario_email: "", referencia_pago: "" } : o)));

  // Mapas: matrículas, avance de cursos y notas de administración.
  const cursosBorrados = new Set([...(borrados.cursos ?? []), ...(borrados["contenido-cursos"] ?? [])].map((c) => str(c.id)));
  await mutarMapa("inscripciones-cursos", (m) => {
    for (const k of Object.keys(m)) {
      const [cid, u] = k.split("::");
      if (u === id || str(m[k]?.usuario) === id || cursosBorrados.has(cid)) { delete m[k]; resumen.matriculas = (resumen.matriculas ?? 0) + 1; }
    }
    return m;
  });
  await mutarMapa("progreso-cursos", (m) => { if (id in m) { delete m[id]; resumen.progreso = 1; } return m; });
  await mutarMapa("notas-admin", (m) => { delete m["u:" + id]; return m; });
  await mutarMapa("recordatorios-config", (m) => { if (m.usuarios && typeof m.usuarios === "object" && id in m.usuarios) delete m.usuarios[id]; return m; });
  const guias = await db.documento.deleteMany({ where: { coleccion: "guias-registros", id } });
  if (guias.count) resumen["guias-registros"] = guias.count;

  // Cuenta: lápida sin datos personales; fuera sesiones y códigos.
  const fila = await db.usuario.findUnique({ where: { id } });
  if (fila) {
    await db.$transaction([
      db.usuario.update({
        where: { id },
        data: {
          nombre: ANONIMO, email: `eliminado+${id}@invalid`, passHash: "", estado: "eliminado", activo: false, rol: "eliminado", roles: [],
          visibilidad: "privado", telefono: "", whatsapp: "", provincia: "", cedulaCifrada: "", cedulaHuella: "", verificado: false,
          admin: false, fundador: false, dosFactores: false, dosFactoresEn: null, extra: { eliminado_en: nowIso() },
        },
      }),
      db.sesion.deleteMany({ where: { usuarioId: id } }),
      db.codigoRespaldo.deleteMany({ where: { usuarioId: id } }),
      db.otp.deleteMany({ where: { usuarioId: id } }),
      db.recuperacionPass.deleteMany({ where: { usuarioId: id } }),
    ]);
    resumen.cuenta = 1;
  }
  return resumen;
}

/** Copia de todos los datos del miembro, para «Descargar mis datos». */
export async function datosDeMiembro(id: string): Promise<Doc> {
  const fila = await db.usuario.findUnique({ where: { id } });
  if (!fila) return {};
  let cedula = "";
  try { cedula = fila.cedulaCifrada ? descifrar(fila.cedulaCifrada) : ""; } catch { cedula = ""; }
  const { passHash: _p, cedulaCifrada: _c, cedulaHuella: _h, ...perfil } = fila;
  const out: Doc = {
    generado: nowIso(),
    aviso: "Copia de tus datos personales en Red Café Ecuador (LOPDP, derecho de acceso y portabilidad).",
    perfil: { ...perfil, cedula },
    consentimientos: await db.consentimiento.findMany({ where: { usuarioId: id }, orderBy: { ts: "asc" } }),
  };
  for (const [col, es] of Object.entries(PROPIAS)) out[col] = (await listar(col)).filter((x) => es(x, id));
  const salas = new Set((out.chats as Doc[]).map((c) => str(c.id)));
  out.messages = salas.size ? (await listar("messages")).filter((m) => salas.has(str(m.room))) : [];
  out.pedidos = (await listar("pedidos")).filter((p) => esDePedido(p, id));
  out.ordenes = (await listar("ordenes")).filter((o) => str(o.usuario_id) === id);
  out.recordatorios = (await mapa("recordatorios-config")).usuarios?.[id] ?? null;
  out.waitlist = (await listar("waitlist")).filter((w) => str(w.email).toLowerCase() === str(fila.email).toLowerCase());
  out.sanciones = (await listar("sanciones")).filter((s) => str(s.uid) === id);
  const insc = await mapa("inscripciones-cursos");
  out.matriculas = Object.entries(insc).filter(([k, v]) => k.split("::")[1] === id || str((v as Doc)?.usuario) === id).map(([, v]) => v);
  out.progreso_cursos = (await mapa("progreso-cursos"))[id] ?? null;
  const g = await db.documento.findUnique({ where: { coleccion_id: { coleccion: "guias-registros", id } } });
  out.guias_registros = g?.datos ?? null;
  // Notificaciones y suscripciones push no aportan nada a la persona fuera del sitio.
  delete out["push-suscripciones"];
  return out;
}
