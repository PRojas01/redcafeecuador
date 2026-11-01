import { exigirDerechos } from "../lib/derechos.js";
// Port de api/lotes.php (versión corregida).
import { db } from "../lib/db.js";
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { esAdmin, filtroVisible, requiereUsuario, tieneRol, todosLosMiembros, usuarioActual } from "../lib/usuarios.js";
import { notificar, notificarAdmins, publicarAvisoComunidad, registrarActividad } from "../lib/avisos.js";
import { bool, cortar, esNumerico, fechaMs, int, largo, num, nowIso, str, textoEntrada, uid, whatsappDigitos, whatsappDisplay } from "../lib/util.js";
import { datosJson } from "../lib/json.js";
const semilla = datosJson<any[]>("semilla-lotes.json");

/** load_json('lotes', seed_lotes()): la primera vez se siembran los 6 lotes de muestra. */
export async function lotesTodos(): Promise<Doc[]> {
  const marca = await db.secreto.findUnique({ where: { nombre: "semilla:lotes" } });
  if (!marca) {
    await mutar("lotes", (items) => {
      if (items.length === 0) for (const l of semilla as Doc[]) items.push({ ...l, created_at: nowIso() });
      return items;
    });
    await db.secreto.upsert({ where: { nombre: "semilla:lotes" }, create: { nombre: "semilla:lotes", valor: nowIso() }, update: {} });
  }
  return listar("lotes");
}

/* ── Ficha del lote ─────────────────────────────────────────────────── */

const ESTADOS_CAFE = ["semilla", "plantula", "cereza", "bellota", "pergamino", "oro", "tostado"];
const EMPAQUES_LOTE = ["yute 69 kg", "yute 46 kg", "grainpro", "vacío", "big bag", "otro"];
const ENTREGAS_LOTE = ["en finca", "en bodega", "puesto en ciudad", "FOB Guayaquil", "a convenir"];
const DOC_TIPOS = ["certificado-calidad", "informe-catacion", "certificado-organico", "analisis-laboratorio", "trazabilidad-eudr", "ficha-tecnica", "otro"];
const CATEGORIAS = ["verde", "terminado"];
const TUESTES = ["claro", "medio", "medio-oscuro", "oscuro"];
const MOLIENDAS = ["grano entero", "gruesa", "media", "fina", "espresso"];
const EMPAQUES_TERMINADO = ["bolsa con válvula", "bolsa kraft", "lata", "vacío", "otro"];
const DISPONIBILIDADES = ["disponible", "reservado", "agotado"];

function valorDe(v: unknown, permitidos: string[], alias: Record<string, string> = {}): string {
  let s = str(v).trim().toLowerCase();
  s = alias[s] ?? s;
  return permitidos.map((p) => p.toLowerCase()).includes(s) ? permitidos.find((p) => p.toLowerCase() === s)! : "";
}

export function imagenesValidas(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const u of raw) {
    if (typeof u !== "string") continue;
    const url = u.trim();
    if (!/^\/uploads\/user-content\/[A-Za-z0-9._-]+\.jpg$/.test(url)) continue;
    if (!out.includes(url)) out.push(url);
    if (out.length >= 6) break;
  }
  return out;
}

function documentosValidos(docs: unknown): Doc[] {
  if (!Array.isArray(docs)) return [];
  const out: Doc[] = [];
  for (const d of docs) {
    if (!d || typeof d !== "object") continue;
    const url = str(d.url).trim();
    if (!/^\/uploads\/user-content\/[A-Za-z0-9._-]+$/.test(url) || url.includes("..")) continue;
    const tipo = DOC_TIPOS.includes(str(d.tipo)) ? str(d.tipo) : "otro";
    const titulo = cortar(str(d.titulo).trim(), 120);
    out.push({ tipo, titulo: titulo || "Documento del lote", url, formato: url.endsWith(".pdf") ? "pdf" : "imagen", subido_at: str(d.subido_at) || nowIso() });
    if (out.length >= 8) break;
  }
  return out;
}

function aplicarFicha(l: Doc, i: Doc): Doc {
  if ("estado" in i) {
    const v = valorDe(i.estado, ESTADOS_CAFE, {
      pilado: "oro", trillado: "oro", verde: "oro", "cáscara": "bellota", cascara: "bellota", bola: "bellota",
      "pergamino seco": "pergamino", "café en cereza": "cereza", "plántula": "plantula", plantulas: "plantula",
      "plántulas": "plantula", planta: "plantula", plantas: "plantula", vivero: "plantula", semillas: "semilla",
    });
    if (v) l.estado = v;
  }
  if ("empaque" in i) { const v = valorDe(i.empaque, EMPAQUES_LOTE); if (v) l.empaque = v; }
  if ("entrega" in i) { const v = valorDe(i.entrega, ENTREGAS_LOTE); if (v) l.entrega = v; }
  const numericos: Record<string, [number, number, number]> = {
    humedad: [5, 20, 1], zaranda: [12, 20, 0], defectos: [0, 200, 0], rendimiento: [1, 100, 1], cantidadKg: [0, 500000, 2],
  };
  for (const [c, [min, max, dec]] of Object.entries(numericos)) {
    if (c in i && esNumerico(i[c])) {
      const v = Math.round(num(i[c]) * 10 ** dec) / 10 ** dec;
      if (v >= min && v <= max) l[c] = dec === 0 ? Math.trunc(v) : v;
    }
  }
  for (const [c, max] of Object.entries({ cosecha: 80, canton: 80, notasTaza: 300, observaciones: 500 })) {
    if (c in i) { const v = str(i[c]).trim(); if (largo(v) <= max) l[c] = v; }
  }
  if ("muestraDisponible" in i) l.muestraDisponible = bool(i.muestraDisponible);
  if ("documentos" in i) l.documentos = documentosValidos(i.documentos);
  return l;
}

function categoria(i: Doc, actual = "verde"): string {
  let c = str(i.categoria ?? actual).trim().toLowerCase();
  c = ({ tostado: "terminado", "producto terminado": "terminado", empacado: "terminado" } as Record<string, string>)[c] ?? c;
  return CATEGORIAS.includes(c) ? c : "verde";
}

function aplicarTerminado(l: Doc, i: Doc): Doc {
  const alias = { entero: "grano entero", "en grano": "grano entero", "medio oscuro": "medio-oscuro", "oscuro medio": "medio-oscuro", valvula: "bolsa con válvula", "bolsa con valvula": "bolsa con válvula" };
  for (const [c, perm] of [["tueste", TUESTES], ["molienda", MOLIENDAS], ["empaqueTerminado", EMPAQUES_TERMINADO]] as const) {
    if (c in i) { const v = valorDe(i[c], perm as unknown as string[], alias); if (v) l[c] = v; }
  }
  for (const [c, [min, max, dec]] of Object.entries({ pesoGramos: [30, 5000, 0], unidades: [0, 100000, 0], precioUnidad: [0, 10000, 2] } as Record<string, [number, number, number]>)) {
    if (c in i && esNumerico(i[c])) {
      const v = Math.round(num(i[c]) * 10 ** dec) / 10 ** dec;
      if (v >= min && v <= max) l[c] = dec === 0 ? Math.trunc(v) : v;
    }
  }
  if ("fechaTueste" in i) {
    const f = str(i.fechaTueste).trim();
    if (f === "") delete l.fechaTueste;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
      const t = Date.parse(f);
      if (t && t <= Date.now() + 86400_000 && t >= Date.now() - 3 * 365 * 86400_000) l.fechaTueste = f;
    }
  }
  for (const [c, max] of Object.entries({ marca: 120, registroSanitario: 60, perfilTaza: 200 })) {
    if (c in i) { const v = str(i[c]).trim(); if (largo(v) <= max) l[c] = v; }
  }
  if ("descafeinado" in i) l.descafeinado = bool(i.descafeinado);
  return l;
}

export const esSiembra = (l: Doc) => ["semilla", "plantula"].includes(str(l.estado).trim().toLowerCase());

/** lote_disponibilidad(): la palabra del dueño manda; sin existencias, agotado. */
export function disponibilidad(l: Doc): string {
  const dicho = str(l.disponibilidad).trim().toLowerCase();
  if (dicho === "agotado") return "agotado";
  const hay = str(l.categoria ?? "verde") === "terminado" || esSiembra(l)
    ? num(l.unidades) > 0
    : num(l.stockSacos) + num(l.stockQuintales) > 0;
  if (!hay) return "agotado";
  return dicho === "reservado" ? "reservado" : "disponible";
}

const COORDS: Record<string, [number, number]> = {
  azuay: [-2.9006, -79.0045], "bolívar": [-1.5926, -79.0009], bolivar: [-1.5926, -79.0009], "cañar": [-2.5606, -78.9394], canar: [-2.5606, -78.9394],
  carchi: [0.8119, -77.7173], chimborazo: [-1.6648, -78.6543], cotopaxi: [-0.9333, -78.6167], "el oro": [-3.2581, -79.9554], esmeraldas: [0.9682, -79.6517],
  "galápagos": [-0.9538, -90.9656], galapagos: [-0.9538, -90.9656], guayas: [-2.17, -79.9224], imbabura: [0.3392, -78.1223], loja: [-3.9931, -79.2042],
  "los ríos": [-1.8022, -79.5344], "los rios": [-1.8022, -79.5344], "manabí": [-1.0546, -80.4525], manabi: [-1.0546, -80.4525],
  "morona santiago": [-2.3051, -78.1147], napo: [-0.9938, -77.8129], orellana: [-0.4667, -76.9872], pastaza: [-1.4924, -78.0024],
  pichincha: [-0.1807, -78.4678], "santa elena": [-2.2267, -80.8587], "santo domingo": [-0.253, -79.1754], "sucumbíos": [0.0875, -76.8898],
  sucumbios: [0.0875, -76.8898], tungurahua: [-1.2543, -78.6229], "zamora chinchipe": [-4.0669, -78.9558],
};
const coordProvincia = (p: string) => COORDS[p.trim().toLowerCase()] ?? null;

export const esDemo = (l: Doc) => !!l.demo || !!l.ejemplo || l.productor_id === "admin";
const ownerId = (l: Doc) => str(l.published_by ?? l.productor_id);

const CAMPOS_SOLO_REGISTRADOS = [
  "documentos", "estado", "humedad", "zaranda", "defectos", "rendimiento", "empaque", "cosecha", "cantidadKg", "entrega",
  "muestraDisponible", "notasTaza", "observaciones", "trazabilidad", "canton", "registroSanitario", "fechaTueste", "perfilTaza", "marca", "molienda",
];

function recortarVisitante(l: Doc): Doc {
  const siembra = esSiembra(l);
  for (const c of CAMPOS_SOLO_REGISTRADOS) delete l[c];
  if (siembra) l.siembra = true;
  // Finca de un productor real: coordenadas redondeadas (~1 km) para quien no tiene cuenta.
  for (const c of ["lat", "lng"]) {
    if (l[c] !== undefined && esNumerico(l[c])) { l[c] = Math.round(num(l[c]) * 100) / 100; l.ubicacion_redondeada = true; }
  }
  l.ficha_restringida = true;
  return l;
}

/** CRC32 (para el desplazamiento estable de los pines por provincia, como PHP). */
function crc32(s: string): number {
  let c = ~0;
  for (const b of Buffer.from(s)) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function conContactoYMapa(l: Doc, miembros: Map<string, Doc>, haySesion = true): Doc {
  if (!l.categoria) l.categoria = "verde";
  l.disponibilidad = disponibilidad(l);
  if ((!lleno(l.lat) || !lleno(l.lng)) && l.provincia) {
    const c = coordProvincia(str(l.provincia));
    if (c) {
      const s = crc32(str(l.id));
      const dx = (((s % 1000) / 1000) - 0.5) * 0.05;
      const dy = (((Math.floor(s / 1000) % 1000) / 1000) - 0.5) * 0.05;
      l.lat = Math.round((c[0] + dy) * 1e6) / 1e6;
      l.lng = Math.round((c[1] + dx) * 1e6) / 1e6;
      l.ubicacion_aproximada = true;
    }
  }
  const owner = str(l.productor_id ?? l.published_by);
  if (owner) {
    const m = miembros.get(owner);
    if (m) {
      const wa = m.whatsapp || m.telefono || "";
      l.contacto = { nombre: m.nombre ?? l.productor ?? "", verificado: !!m.verificado };
      if (haySesion) Object.assign(l.contacto, { whatsapp: whatsappDisplay(wa), whatsapp_link: whatsappDigitos(wa), email: m.email ?? "" });
    }
    if (owner === "admin" && !l.contacto) {
      l.contacto = { whatsapp: "+593968641376", whatsapp_link: "593968641376", email: "info@redcafeecuador.com", nombre: "Red Café Ecuador", verificado: true };
    }
  }
  return l;
}
const lleno = (v: unknown) => !(v === undefined || v === null || v === 0 || v === "" || v === "0" || v === false);

function ordenPublicacion(a: Doc, b: Doc): number {
  const ta = fechaMs(a.created_at), tb = fechaMs(b.created_at);
  if (tb !== ta) return tb - ta;
  return str(b.id).localeCompare(str(a.id));
}
function ordenConDisponibilidad(a: Doc, b: Doc): number {
  const pa = disponibilidad(a) === "agotado" ? 1 : 0, pb = disponibilidad(b) === "agotado" ? 1 : 0;
  return pa !== pb ? pa - pb : ordenPublicacion(a, b);
}

const GRAFIAS: Record<string, string> = { typica: "typica", tipica: "typica", geisha: "geisha", gesha: "geisha" };
function claveTexto(v: string): string {
  let s = v.trim().toLowerCase();
  s = s.replace(/[áéíóúüñ]/g, (c) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n" })[c]!).replace(/\s+/g, " ");
  return GRAFIAS[s] ?? s;
}
function unificarGrafias(lotes: Doc[], campos: string[]): Doc[] {
  for (const campo of campos) {
    const variantes = new Map<string, Map<string, { n: number; real: boolean }>>();
    for (const l of lotes) {
      const v = str(l[campo]).trim();
      if (!v) continue;
      const k = claveTexto(v);
      if (!variantes.has(k)) variantes.set(k, new Map());
      const f = variantes.get(k)!;
      const e = f.get(v) ?? { n: 0, real: false };
      e.n++;
      if (!esDemo(l)) e.real = true;
      f.set(v, e);
    }
    const canon = new Map<string, string>();
    for (const [k, formas] of variantes) {
      const orden = [...formas.entries()].sort((a, b) => (a[1].real !== b[1].real ? (a[1].real ? -1 : 1) : b[1].n - a[1].n));
      canon.set(k, orden[0][0]);
    }
    for (const l of lotes) {
      const v = str(l[campo]).trim();
      if (v && canon.has(claveTexto(v))) l[campo] = canon.get(claveTexto(v));
    }
  }
  return lotes;
}

async function mapaMiembros(): Promise<Map<string, Doc>> {
  return new Map((await todosLosMiembros()).map((m) => [m.id, m]));
}

async function actorDe(ctx: Ctx) {
  const u = await usuarioActual(ctx);
  if (!u && !ctx.ses.d.admin) fail("No autenticado.", 401);
  return { u, actorId: u?.id ?? "admin", admin: !!ctx.ses.d.admin || (!!u && tieneRol(ctx, u, "admin")) };
}

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    const lotes = await lotesTodos();
    const miembros = await mapaMiembros();
    const haySesion = (await usuarioActual(ctx)) !== null || !!ctx.ses.d.admin;
    const visible = await filtroVisible(ctx);
    let vis = lotes.filter((l) => !l.oculto && visible(l)).sort(ordenConDisponibilidad);
    vis = vis.map((l) => {
      let x = conContactoYMapa(structuredClone(l), miembros, haySesion);
      if (!haySesion && !esDemo(x)) x = recortarVisitante(x);
      return x;
    });
    return { lotes: unificarGrafias(vis, ["provincia", "variedad", "proceso"]), sesion: haySesion };
  },

  async mine(ctx) {
    const u = await usuarioActual(ctx);
    const admin = !!ctx.ses.d.admin || (!!u && tieneRol(ctx, u, "admin"));
    if (!u && !admin) fail("No autenticado.", 401);
    const owner = u ? u.id : "admin";
    const miembros = await mapaMiembros();
    const propios = (await lotesTodos()).filter((l) => admin || ownerId(l) === owner).sort(ordenPublicacion);
    return { lotes: propios.map((l) => conContactoYMapa(l, miembros)), admin };
  },

  async all(ctx) {
    if (!ctx.ses.d.admin) fail("Solo admin.", 403);
    return { lotes: await lotesTodos() };
  },

  async publish(ctx) {
    if (!(await cupo(ctx, "lote_publicar", 30, 3600))) fail("Has publicado demasiado seguido. Vuelve a intentarlo en una hora.", 429);
    const u = await requiereUsuario(ctx);
    const i = ctx.in;
    if (!["productor", "vendedor", "exportador", "pilador", "comprador", "proveedor", "admin"].some((r) => tieneRol(ctx, u, r))) {
      fail("Tu perfil no publica lotes de café. Añade el perfil de productor, comerciante, exportador o pilador desde tu cuenta.", 403);
    }
    for (const n of ["precioSaco", "precioQuintal", "stockSacos", "stockQuintales", "altura"]) {
      if (i[n] !== undefined && i[n] !== null && esNumerico(i[n]) && num(i[n]) < 0) fail(`El valor de ${n} no puede ser negativo.`, 422);
    }
    const cat = categoria(i);
    const siembra = esSiembra({ estado: str(i.estado) });
    const req = cat === "terminado" ? ["finca", "provincia", "variedad", "precioUnidad"] : siembra ? ["finca", "provincia", "variedad"] : ["finca", "provincia", "variedad", "proceso", "precioSaco"];
    for (const k of req) if (str(i[k]).trim() === "") fail(`Falta ${k}.`, 422);
    if (cat === "terminado" && num(i.precioUnidad) <= 0) fail("Indica el precio de venta por unidad.", 422);
    if (siembra) {
      if (num(i.precioUnidad) <= 0) fail("Indica el precio por planta o por semilla.", 422);
      if (int(i.unidades) <= 0) fail("Indica cuántas plantas o semillas tienes disponibles.", 422);
    }
    if (cat !== "terminado" && !siembra && str(i.disponibilidad).trim().toLowerCase() !== "agotado" && int(i.stockSacos) + int(i.stockQuintales) <= 0) {
      fail("Indica cuántos sacos tienes disponibles para vender.", 422);
    }
    const latRaw = str(i.lat).trim(), lngRaw = str(i.lng).trim();
    const traza = i.trazabilidad && typeof i.trazabilidad === "object" ? (i.trazabilidad as Doc) : null;
    const gps = traza ? str(traza.gps).trim() : "";
    const lat = num(latRaw), lng = num(lngRaw);
    const conUbic = esNumerico(latRaw) && esNumerico(lngRaw) && lat >= -5 && lat <= 2 && lng >= -82 && lng <= -75;

    const idLote = uid();
    let lote: Doc = {
      ...await exigirDerechos(ctx, u, "lotes.publish", idLote),
      id: idLote,
      categoria: cat,
      finca: textoEntrada(i.finca, 120),
      productor: u.nombre,
      productor_id: u.id,
      visibilidad: i.visibilidad === "registrados" ? "registrados" : "publico",
      provincia: textoEntrada(i.provincia, 80),
      variedad: textoEntrada(i.variedad, 80),
      proceso: textoEntrada(i.proceso, 80),
      altura: esNumerico(i.altura) && int(i.altura) > 0 ? int(i.altura) : null,
      score: esNumerico(i.score) && int(i.score) > 0 ? Math.max(0, Math.min(100, int(i.score))) : null,
      precioQuintal: num(i.precioQuintal),
      precioSaco: num(i.precioSaco),
      pesoSacoLb: esNumerico(i.pesoSacoLb) && num(i.pesoSacoLb) > 0 ? Math.max(1, Math.min(500, Math.round(num(i.pesoSacoLb)))) : null,
      stockSacos: Math.max(0, Math.min(100000, int(i.stockSacos))),
      stockQuintales: Math.max(0, Math.min(100000, int(i.stockQuintales))),
      certificacion: textoEntrada(i.certificacion, 80),
      descripcion: textoEntrada(i.descripcion, 400, true),
      emoji: textoEntrada(i.emoji ?? "☕", 8) || "☕",
      ventaMinima: textoEntrada(i.ventaMinima, 40),
      verificado: false,
      imagenes: imagenesValidas(i.imagenes),
      ejemplo: false,
      oculto: false,
      published_by: u.id,
      created_at: nowIso(),
    };
    if (conUbic) { lote.lat = lat; lote.lng = lng; }
    else {
      const c = coordProvincia(str(lote.provincia));
      if (c) { lote.lat = c[0]; lote.lng = c[1]; lote.ubicacion_aproximada = true; } else lote.sin_ubicacion = true;
    }
    if (gps) lote.trazabilidad = { gps: cortar(gps, 120) };
    lote = aplicarFicha(lote, i);
    if (cat === "terminado") {
      lote.estado = "tostado";
      lote = aplicarTerminado(lote, i);
      if (!str(lote.marca).trim()) lote.marca = lote.finca;
    } else if (siembra) {
      Object.assign(lote, { precioUnidad: Math.round(num(i.precioUnidad) * 100) / 100, unidades: int(i.unidades), precioSaco: 0, precioQuintal: 0, stockSacos: 0, stockQuintales: 0 });
    }
    await lotesTodos();
    await mutar("lotes", (items) => [...items, lote]);
    await publicarAvisoComunidad("lote", lote);
    await registrarActividad(ctx, "lote-publicado", {
      objeto_tipo: "lote", objeto_id: lote.id,
      detalle: (cat === "terminado" ? "Producto terminado · " : "") + `${lote.finca} · ${lote.variedad} · ${lote.provincia}`,
      monto: cat === "terminado" ? lote.precioUnidad ?? 0 : lote.precioSaco,
    });
    const precio = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    await notificarAdmins("lote",
      (cat === "terminado" ? "Nuevo café tostado publicado: " : "Nuevo lote publicado: ") + lote.finca,
      cat === "terminado" ? `${lote.variedad} · ${lote.provincia} · $${precio(num(lote.precioUnidad))} la unidad.` : `${lote.variedad} · ${lote.provincia} · $${precio(num(lote.precioSaco))} el saco.`,
      "/marketplace/");
    return { lote };
  },

  async toggle_oculto(ctx) {
    if (!ctx.ses.d.admin) fail("Solo admin.", 403);
    const id = str(ctx.query.id);
    await lotesTodos();
    await mutar("lotes", (items) => items.map((l) => (l.id === id ? { ...l, oculto: !l.oculto } : l)));
    return null;
  },

  async update(ctx) {
    const { actorId, admin } = await actorDe(ctx);
    const i = ctx.in;
    const id = str(i.id ?? ctx.query.id).trim();
    if (!id) fail("id requerido.", 422);
    for (const n of ["precioSaco", "precioQuintal", "stockSacos", "stockQuintales", "unidades", "precioUnidad"]) {
      if (i[n] !== undefined && esNumerico(i[n]) && num(i[n]) < 0) fail(`El valor de ${n} no puede ser negativo.`, 422);
    }
    for (const [c, min, max] of [["lat", -5, 2], ["lng", -82, -75]] as const) {
      if (i[c] !== undefined && esNumerico(i[c]) && (num(i[c]) < min || num(i[c]) > max)) fail("La ubicación debe estar dentro de Ecuador continental.", 422);
    }
    let actualizado: Doc | null = null;
    await lotesTodos();
    await mutar("lotes", async (items) => {
      const idx = items.findIndex((l) => l.id === id);
      if (idx < 0) return items;
      let l = items[idx];
      if (ownerId(l) !== actorId && !admin) fail("No autorizado: solo el dueño o un administrador puede editar este lote.", 403);
      const antes = JSON.stringify(l);
      if (!admin && ["imagenes", "documentos"].some((k) => k in i)) Object.assign(l, await exigirDerechos(ctx, { id: actorId }, "lotes.update", id));
      if ("disponibilidad" in i) { const d = str(i.disponibilidad).trim().toLowerCase(); if (DISPONIBILIDADES.includes(d)) l.disponibilidad = d; }
      const topes: Record<string, number> = { finca: 120, provincia: 80, variedad: 80, proceso: 80, certificacion: 80, descripcion: 400, ventaMinima: 40 };
      for (const [f, max] of Object.entries(topes)) {
        if (!(f in i)) continue;
        const v = textoEntrada(i[f], max, f === "descripcion");
        if (["finca", "provincia", "variedad"].includes(f) && v === "") continue;
        if (str(l[f]) !== v) l[f] = v;
      }
      if ("visibilidad" in i) l.visibilidad = i.visibilidad === "registrados" ? "registrados" : "publico";
      if ("pesoSacoLb" in i) l.pesoSacoLb = esNumerico(i.pesoSacoLb) && num(i.pesoSacoLb) > 0 ? Math.max(1, Math.min(500, Math.round(num(i.pesoSacoLb)))) : null;
      for (const f of ["stockSacos", "stockQuintales"]) if (f in i) l[f] = Math.max(0, Math.min(100000, int(i[f])));
      const dispPedida = str(i.disponibilidad).trim().toLowerCase();
      if (str(l.categoria ?? "verde") !== "terminado" && !esSiembra(l) && ["disponible", "reservado"].includes(dispPedida) && int(l.stockSacos) + int(l.stockQuintales) <= 0) {
        fail("Para marcar el lote como disponible, indica cuántos sacos tienes.", 422);
      }
      if (esSiembra(l) && ["disponible", "reservado"].includes(dispPedida) && int(l.unidades) <= 0) fail("Para marcarlo disponible, indica cuántas plantas o semillas tienes.", 422);
      if ("altura" in i) {
        const a = i.altura;
        if (a === "" || a === null || (esNumerico(a) && int(a) <= 0)) l.altura = null;
        else if (esNumerico(a) && int(a) <= 4000) l.altura = int(a);
      }
      if ("score" in i) {
        const b = i.score;
        if (b === "" || b === null) l.score = null;
        else if (esNumerico(b)) { const n = int(b); if (n === 0) l.score = null; else if (n >= 60 && n <= 100) l.score = n; }
      }
      for (const f of ["precioQuintal", "precioSaco", "lat", "lng"]) if (f in i && esNumerico(i[f])) l[f] = num(i[f]);
      if ("categoria" in i) l.categoria = categoria(i, str(l.categoria ?? "verde"));
      l = aplicarFicha(l, i);
      if (str(l.categoria ?? "verde") === "terminado") l = aplicarTerminado(l, i);
      if (("lat" in i || "lng" in i) && lleno(l.lat) && lleno(l.lng)) { delete l.ubicacion_aproximada; delete l.sin_ubicacion; }
      if ("imagenes" in i) l.imagenes = imagenesValidas(i.imagenes);
      if (JSON.stringify(l) !== antes) { l.updated_at = nowIso(); l.updated_by = actorId; }
      items[idx] = l;
      actualizado = l;
      return items;
    });
    if (!actualizado) fail("Lote no encontrado.", 404);
    return { lote: actualizado };
  },

  async contacto(ctx) {
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("id requerido.", 422);
    if (!(await cupo(ctx, "contacto-lote", 20, 3600))) return { registrado: false };
    const u = await usuarioActual(ctx);
    const objetivo = (await lotesTodos()).find((l) => l.id === id);
    if (!objetivo) fail("Lote no encontrado.", 404);
    const duenio = ownerId(objetivo);
    if (!duenio || (u && duenio === u.id)) return { registrado: false };
    const avisar = Date.now() - fechaMs(objetivo.ultimo_aviso_contacto) > 12 * 3600_000;
    await mutar("lotes", (items) => items.map((l) => {
      if (l.id !== id) return l;
      const x: Doc = { ...l, contactos: int(l.contactos) + 1, ultimo_contacto: nowIso(), confirmacion_pendiente: true };
      if (avisar) x.ultimo_aviso_contacto = nowIso();
      return x;
    }));
    if (avisar) {
      await notificar(duenio, "lote", `${u ? u.nombre || "Un miembro" : "Alguien"} preguntó por tu lote «${str(objetivo.finca) || "sin nombre"}»`,
        "Confirma en tu panel si sigue disponible, si te queda menos cantidad o si ya se vendió.", "/panel/");
    }
    await registrarActividad(ctx, "lote-contacto", { objeto_tipo: "lote", objeto_id: id, detalle: "Consulta por " + str(objetivo.finca), contraparte: str(objetivo.productor) });
    return { registrado: true };
  },

  async confirmar_estado(ctx) {
    const { actorId, admin } = await actorDe(ctx);
    const id = str(ctx.in.id).trim();
    if (!id) fail("id requerido.", 422);
    const objetivo = (await lotesTodos()).find((l) => l.id === id);
    if (!objetivo) fail("Lote no encontrado.", 404);
    if (ownerId(objetivo) !== actorId && !admin) fail("No autorizado: solo el dueño puede confirmar el estado de su lote.", 403);
    const disp = str(ctx.in.disponibilidad).trim().toLowerCase();
    if (disp && !DISPONIBILIDADES.includes(disp)) fail("Estado no válido.", 422);
    if (disp === "disponible" && str(objetivo.categoria ?? "verde") !== "terminado") {
      const sacos = "stockSacos" in ctx.in ? int(ctx.in.stockSacos) : int(objetivo.stockSacos);
      const qq = "stockQuintales" in ctx.in ? int(ctx.in.stockQuintales) : int(objetivo.stockQuintales);
      if (sacos + qq <= 0) fail("Este lote no tiene sacos registrados: usa «Queda menos» e indica cuántos te quedan.", 422);
    }
    let act: Doc | null = null;
    await mutar("lotes", (items) => items.map((l) => {
      if (l.id !== id) return l;
      const x = { ...l };
      for (const c of ["stockSacos", "stockQuintales", "unidades"]) {
        if (c in ctx.in && esNumerico(ctx.in[c])) { const v = int(ctx.in[c]); if (v >= 0 && v <= 100000) x[c] = v; }
      }
      if (disp === "agotado") {
        x.stockSacos = 0; x.stockQuintales = 0;
        if (str(x.categoria ?? "verde") === "terminado" || esSiembra(x)) x.unidades = 0;
      }
      if (disp) x.disponibilidad = disp;
      Object.assign(x, { confirmacion_pendiente: false, estado_confirmado_at: nowIso(), updated_at: nowIso(), updated_by: actorId });
      act = x;
      return x;
    }));
    const a = (act ?? {}) as Doc;
    await registrarActividad(ctx, "lote-estado", { objeto_tipo: "lote", objeto_id: id, detalle: `${str(a.finca)} · ${disponibilidad(a)}` });
    a.disponibilidad = disponibilidad(a);
    return { lote: a };
  },

  async delete(ctx) {
    const { actorId, admin } = await actorDe(ctx);
    const id = str(ctx.query.id);
    if (!id) fail("id requerido.", 422);
    const objetivo = (await lotesTodos()).find((l) => l.id === id);
    if (!objetivo) fail("Lote no encontrado.", 404);
    if (ownerId(objetivo) !== actorId && !admin) fail("No autorizado: solo el productor dueño o un administrador puede borrar.", 403);
    await mutar("lotes", (items) => items.filter((l) => l.id !== id));
    return null;
  },
};
acciones.mis_lotes = acciones.mine;

void esAdmin; void uid;
export const lotes: Modulo = { acciones };
