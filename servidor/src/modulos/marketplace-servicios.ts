// Port de api/marketplace-servicios.php (versión corregida).
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { filtroVisible, miembroRoles, requiereUsuario, tieneRol, usuarioActual } from "../lib/usuarios.js";
import { notificarAdmins, publicarAvisoComunidad, registrarActividad } from "../lib/avisos.js";
import { bool, cortar, esNumerico, fechaMs, largo, num, nowIso, str, textoEntrada, uid, whatsappDigitos, whatsappDisplay } from "../lib/util.js";
import { imagenesValidas } from "./lotes.js";

const WA = process.env.REDCAFE_WHATSAPP || "593968641376";
const EMAIL = process.env.REDCAFE_EMAIL || "info@redcafeecuador.com";
const CATEGORIAS = ["transporte", "catacion", "asesoria", "pilado", "insumos", "capacitacion", "exportacion", "otro"];
const PERFILES = ["all", "productor", "vendedor", "comprador", "bar", "barista", "certificador", "transportista", "pilador", "exportador", "proveedor", "amante", "asesor"];
const categoriaValida = (c: string) => (CATEGORIAS.includes(c) ? c : "otro");

export function precioEtiqueta(precio: unknown, gratis: boolean): string {
  if (gratis) return "Gratis";
  const p = num(precio);
  if (p <= 0) return "A convenir";
  return "$ " + p.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function oficialParaMarketplace(s: Doc): Doc {
  const gratis = !!s.gratis || (num(s.precio) <= 0 && /gratis/i.test(str(s.unidad)));
  return {
    id: s.id ?? "", titulo: s.nombre ?? s.titulo ?? "Servicio RedCafé", nombre: s.nombre ?? s.titulo ?? "Servicio RedCafé",
    categoria: s.categoria ?? s.perfil ?? "redcafe", descripcion: s.descripcion ?? "", precio: s.precio ?? 0,
    precio_etiqueta: precioEtiqueta(s.precio ?? 0, gratis), moneda: s.moneda ?? "USD", unidad: s.unidad ?? "servicio",
    proveedor: "Red Café Ecuador", proveedor_id: "redcafe", cobertura: s.cobertura ?? "Ecuador",
    whatsapp: whatsappDisplay(WA), whatsapp_link: whatsappDigitos(WA), email: EMAIL,
    verificado: true, oficial_redcafe: true, gratis, plan: gratis ? "gratis" : "premium", tipo_plan: gratis ? "gratis" : "premium",
    etiqueta_plan: gratis ? "Gratis RedCafé" : "Premium RedCafé", visibilidad: "publico", created_at: s.created_at ?? "",
  };
}

const INTERMEDIACION: Doc = {
  id: "intermediacion-compraventa", nombre: "Intermediación en compraventa de café",
  descripcion: "Para compradores: búsqueda de calidad, mejor proveedor, validación de lote, visita técnica y acompañamiento a la compra. Para vendedores: preparación de oferta, validación de lote, definición de precio, conexión con comprador y acompañamiento de la venta.",
  precio: 0, moneda: "USD", unidad: "según alcance", categoria: "asesoria", perfil: "all", disponible: true, cobertura: "Ecuador",
};

const ordenPublicacion = (a: Doc, b: Doc) => fechaMs(b.created_at) - fechaMs(a.created_at) || str(b.id).localeCompare(str(a.id));
const ownerId = (s: Doc) => str(s.proveedor_id ?? s.owner_id ?? s.published_by);

async function usuarioOAdmin(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  if (u) return u;
  if (ctx.ses.d.admin) return { id: "admin", nombre: "Administración", rol: "admin", roles: ["admin"] };
  fail("No autenticado.", 401);
}
async function adminO403(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  if (ctx.ses.d.admin) return u ?? { id: "admin", nombre: "Administración" };
  if (u && tieneRol(ctx, u, "admin")) return u;
  fail("Solo la administración gestiona los servicios de la plataforma.", 403);
}

function oficialSaneado(i: Doc, previo: Doc = {}): Doc {
  const nombre = str(i.nombre ?? previo.nombre).trim();
  if (largo(nombre) < 3 || largo(nombre) > 120) fail("El nombre del servicio debe tener entre 3 y 120 caracteres.", 422);
  const descripcion = cortar(str(i.descripcion ?? previo.descripcion).trim(), 600);
  const precioIn = "precio" in i ? i.precio : previo.precio ?? 0;
  if (!esNumerico(precioIn) || num(precioIn) < 0 || num(precioIn) > 100000) fail("Precio inválido: debe ser un número entre 0 y 100000.", 422);
  const perfil = PERFILES.includes(str(i.perfil ?? previo.perfil ?? "all").trim()) ? str(i.perfil ?? previo.perfil ?? "all").trim() : "all";
  const out: Doc = {
    id: str(previo.id), nombre, descripcion, precio: Math.round(num(precioIn) * 100) / 100, moneda: "USD",
    unidad: cortar(str(i.unidad ?? previo.unidad ?? "servicio").trim(), 40) || "servicio",
    categoria: categoriaValida(str(i.categoria ?? previo.categoria ?? "otro").trim()), perfil,
    icono: cortar(str(i.icono ?? previo.icono ?? "☕").trim(), 8), cobertura: cortar(str(i.cobertura ?? previo.cobertura ?? "Ecuador").trim(), 80),
    gratis: "gratis" in i ? bool(i.gratis) : !!previo.gratis,
    disponible: "disponible" in i ? bool(i.disponible) : previo.disponible ?? true,
    created_at: str(previo.created_at) || nowIso(),
  };
  if (previo.pago !== undefined) out.pago = previo.pago;
  return out;
}

function idNuevo(nombre: string, existentes: Doc[]): string {
  let base = nombre.trim().toLowerCase().replace(/[áéíóúñü]/g, (c) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ñ: "n", ü: "u" })[c]!);
  base = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "servicio";
  const ids = new Set(existentes.map((s) => str(s.id)));
  let id = base;
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
  return id;
}

const acciones: Modulo["acciones"] = {
  async admin_list(ctx) {
    await adminO403(ctx);
    const of = (await listar("servicios")).sort((a, b) => str(a.nombre).localeCompare(str(b.nombre)));
    return { servicios: of, perfiles: PERFILES };
  },

  async admin_save(ctx) {
    await adminO403(ctx);
    const id = str(ctx.in.id).trim();
    let res: Doc | null = null;
    let creado = false;
    await mutar("servicios", (of) => {
      if (!id) {
        const nuevo = oficialSaneado(ctx.in, {});
        nuevo.id = idNuevo(nuevo.nombre, of);
        res = nuevo; creado = true;
        return [...of, nuevo];
      }
      return of.map((s) => {
        if (str(s.id) !== id) return s;
        const n = oficialSaneado(ctx.in, s);
        n.id = id;
        res = { ...n, _antes: s.precio ?? 0 };
        return n;
      });
    });
    if (!res) fail("Servicio no encontrado.", 404);
    const r = res as Doc;
    if (creado) await registrarActividad(ctx, "servicio-plataforma-alta", { objeto_tipo: "servicio", objeto_id: r.id, detalle: `${r.nombre} · $${r.precio}` });
    else if (num(r._antes) !== num(r.precio)) await registrarActividad(ctx, "servicio-plataforma-precio", { objeto_tipo: "servicio", objeto_id: id, detalle: `${r.nombre}: $${r._antes} -> $${r.precio}`, monto: r.precio });
    delete r._antes;
    return { servicio: r, creado };
  },

  async admin_delete(ctx) {
    await adminO403(ctx);
    const id = str(ctx.in.id ?? ctx.query.id).trim();
    if (!id) fail("id requerido.", 422);
    let habia = false;
    await mutar("servicios", (of) => of.filter((s) => (str(s.id) === id ? ((habia = true), false) : true)));
    if (!habia) fail("Servicio no encontrado.", 404);
    await registrarActividad(ctx, "servicio-plataforma-baja", { objeto_tipo: "servicio", objeto_id: id, detalle: "Retirado del catálogo" });
    return { eliminado: id };
  },

  async list(ctx) {
    const haySesion = (await usuarioActual(ctx)) !== null || !!ctx.ses.d.admin;
    const oficiales = await listar("servicios");
    if (!oficiales.some((s) => s.id === "intermediacion-compraventa")) oficiales.push(INTERMEDIACION);
    const visible = await filtroVisible(ctx);
    const items = [
      ...oficiales.filter((s) => s.disponible === undefined || !!s.disponible).map(oficialParaMarketplace),
      ...(await listar("servicios-terceros")),
    ];
    let vis = items.filter((s) => !s.oculto && visible(s) && ((s.visibilidad ?? "publico") === "publico" || haySesion));
    vis = vis.map((s) => (s.precio_etiqueta !== undefined ? s : { ...s, precio_etiqueta: precioEtiqueta(s.precio ?? 0, !!s.gratis || s.plan === "gratis") }));
    vis.sort(ordenPublicacion);
    if (!haySesion) vis = vis.map((s) => (s.oficial_redcafe ? s : (({ email, whatsapp, whatsapp_link, ...r }) => r)(s)));
    return { servicios: vis };
  },

  async mine(ctx) {
    const u = await requiereUsuario(ctx);
    const admin = tieneRol(ctx, u, "admin");
    const propios = (await listar("servicios-terceros")).filter((s) => admin || ownerId(s) === u.id).sort(ordenPublicacion);
    return { servicios: propios, admin };
  },

  async publish(ctx) {
    if (!(await cupo(ctx, "servicio_publicar", 30, 3600))) fail("Has publicado demasiado seguido. Vuelve a intentarlo en una hora.", 429);
    const u = await requiereUsuario(ctx);
    const i = ctx.in;
    const titulo = str(i.titulo).trim(), descripcion = str(i.descripcion).trim(), provincia = str(i.provincia).trim();
    const cobertura = str(i.cobertura).trim(), unidad = str(i.unidad ?? "servicio").trim();
    if (!titulo || !descripcion) fail("Título y descripción requeridos.", 422);
    if (largo(titulo) > 90) fail("Título demasiado largo.", 422);
    if (largo(descripcion) > 600) fail("Descripción demasiado larga.", 422);
    if (largo(provincia) > 80 || largo(cobertura) > 120 || largo(unidad) > 40) fail("Revisa provincia, cobertura o unidad.", 422);
    const wa = u.whatsapp || u.telefono || "";
    const servicio: Doc = {
      id: uid(), titulo, categoria: categoriaValida(str(i.categoria ?? "otro").trim()), descripcion, provincia, cobertura,
      precio: Math.max(0, num(i.precio)), unidad: unidad || "servicio", imagenes: imagenesValidas(i.imagenes),
      proveedor: u.nombre, proveedor_id: u.id, proveedor_rol: u.rol, proveedor_roles: miembroRoles(u),
      whatsapp: whatsappDisplay(wa), whatsapp_link: whatsappDigitos(wa), email: u.email ?? "",
      visibilidad: i.visibilidad === "registrados" ? "registrados" : "publico", verificado: false, oculto: false, created_at: nowIso(),
    };
    await mutar("servicios-terceros", (items) => [...items, servicio]);
    await publicarAvisoComunidad("servicio", servicio);
    await registrarActividad(ctx, "servicio-publicado", { objeto_tipo: "servicio", objeto_id: servicio.id, detalle: `${titulo} · ${provincia}`, monto: servicio.precio });
    await notificarAdmins("servicio", "Nuevo servicio publicado: " + titulo, `${servicio.categoria} · ${provincia}.`, "/marketplace/");
    return { servicio };
  },

  async delete(ctx) {
    const u = await usuarioOAdmin(ctx);
    const id = str(ctx.query.id);
    if (!id) fail("id requerido.", 422);
    const obj = (await listar("servicios-terceros")).find((s) => s.id === id);
    if (!obj) fail("Servicio no encontrado.", 404);
    if (ownerId(obj) !== u.id && !ctx.ses.d.admin) fail("No autorizado.", 403);
    await mutar("servicios-terceros", (items) => items.filter((s) => s.id !== id));
    return null;
  },

  async update(ctx) {
    const u = await usuarioOAdmin(ctx);
    const i = ctx.in;
    const id = str(i.id ?? ctx.query.id).trim();
    if (!id) fail("id requerido.", 422);
    let act: Doc | null = null;
    await mutar("servicios-terceros", (items) => items.map((s) => {
      if (s.id !== id) return s;
      if (ownerId(s) !== u.id && !tieneRol(ctx, u, "admin")) fail("No autorizado: solo el dueño o un administrador puede editar este servicio.", 403);
      const x = { ...s };
      for (const [f, max] of Object.entries({ titulo: 90, descripcion: 600, provincia: 80, cobertura: 120, unidad: 40 })) {
        if (!(f in i)) continue;
        const v = textoEntrada(i[f], max, f === "descripcion");
        if (v === "" && (f === "titulo" || f === "descripcion")) continue;
        x[f] = v;
      }
      if ("visibilidad" in i) x.visibilidad = i.visibilidad === "registrados" ? "registrados" : "publico";
      if ("categoria" in i) x.categoria = categoriaValida(str(i.categoria));
      if ("precio" in i) x.precio = Math.max(0, num(i.precio));
      if ("imagenes" in i) x.imagenes = imagenesValidas(i.imagenes);
      x.updated_at = nowIso(); x.updated_by = u.id ?? "";
      act = x;
      return x;
    }));
    if (!act) fail("Servicio no encontrado.", 404);
    return { servicio: act };
  },
};
acciones.mis_servicios = acciones.mine;

export const marketplaceServicios: Modulo = { acciones };
