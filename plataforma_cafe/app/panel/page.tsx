"use client";

import { Suspense, useCallback, useEffect, useState, useRef } from "react";
import { MedidasDeMiCuenta, CerrarMiCuenta } from "@/components/CuentaPropia";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PLANES, CURSOS, LOTES, serviciosPara, type Rol } from "@/lib/data";
import { leerBitacora, guardarBitacora } from "@/lib/sesion";
import { api, getStoredSession, setStoredSession, type ApiUser, type Pedido, type Lote, type MenuItem, type MovimientoInventario, type ResumenInventario, type ProductoInventario, type TipoMovimientoInventario, type MarketplaceServicio } from "@/lib/api";
import { waLink, CONFIG } from "@/lib/config";
import { agregarRegistro, type TipoRegistro } from "@/lib/registros";
import { leerCertificados, emitirCertificado, rechazarCertificado, guardarCertificados, formatearFecha, etiquetaEstado, type Certificado } from "@/lib/certificados";
import { BitacoraRegistros } from "@/components/BitacoraRegistros";
import { PanelEstadisticas } from "@/components/PanelEstadisticas";
import { Skeleton } from "@/components/Skeleton";
import { EstadoVacio } from "@/components/EstadoVacio";
import { EstadoError } from "@/components/EstadoError";
import { Modal } from "@/components/Modal";
import { Icono } from "@/components/Icono";
import { Toast, useToast } from "@/components/Toast";
import { CotizacionesPanel } from "@/components/CotizacionesPanel";
import { AtajosPanel } from "@/components/AtajosPanel";

interface Prod { id: string; fecha: string; variedad: string; quintales: number; calidad: string }
interface Venta { id: string; fecha: string; destino: string; quintales: number; precio: number; total: number }
interface Compra { id: string; fecha: string; origen: string; sacos: number; precio: number; total: number }
interface Tostado { id: string; fecha: string; lote: string; verde: number; tostado: number; merma: number }
interface Siembra { id: string; fecha: string; variedad: string; hectareas: number; estimacion: number }
interface Limpieza { id: string; fecha: string; tipo: string; parcela: string }
interface Costo { id: string; fecha: string; concepto: string; monto: number; categoria: string }
interface Turno { id: string; fecha: string; horas: number; notas: string }

const ESTADOS = ["Solicitado", "Aceptado", "En camino", "Entregado"];
const PERFILES_PANEL: Exclude<Rol, "admin">[] = ["productor", "vendedor", "comprador", "bar", "barista", "certificador", "proveedor", "transportista", "pilador", "exportador", "amante", "asesor"];
const NOMBRES_PERFIL: Record<Exclude<Rol, "admin">, string> = {
 productor: "Productor",
 vendedor: "Tostador / Comerciante",
 comprador: "Comprador",
 bar: "Bar / Cafetería",
 barista: "Barista",
 certificador: "Verificador / Catador",
 proveedor: "Proveedor",
 transportista: "Transportista",
 pilador: "Pilador",
 exportador: "Exportador",
 amante: "Amante del Café",
 asesor: "Asesor Experto",
};

function rolesDeUsuario(sesion: ApiUser): Exclude<Rol, "admin">[] {
 const base = (sesion.roles?.length ? sesion.roles : [sesion.rol]).filter((r): r is Exclude<Rol, "admin"> => r !== "admin" && PERFILES_PANEL.includes(r as Exclude<Rol, "admin">));
 return base.length ? base : ["productor"];
}

function tabsPorRol(rol: Exclude<Rol, "admin">): { id: string; l: string }[] {
  const comun = [{ id: "marketplace_pedidos", l: "Solicitudes Marketplace" }, { id: "mis_publicaciones", l: "Mis publicaciones" }, { id: "publicar_servicio", l: "Publicar servicio" }, { id: "servicios", l: "Servicios para mí" }, { id: "ordenes", l: "Mis órdenes" }, { id: "cotizaciones", l: "Cotizaciones" }];
 if (rol === "productor") return [
  { id: "productor", l: "Producción y venta" },
  { id: "publicar", l: "Publicar lote de café" },
  { id: "bandeja", l: "Pedidos recibidos" },
  { id: "plan", l: "Planificación" },
  { id: "inventario", l: "Finanzas e inventario" },
  ...comun,
  { id: "bitacora", l: "Bitácora" },
  { id: "valorar", l: "★ Valorar" },
 ];
 if (rol === "vendedor") return [
  { id: "vendedor", l: "Abastecimiento" },
  { id: "vpedidos", l: "Mis pedidos a productores" },
  { id: "vcostos", l: "Costos y proyección" },
  { id: "inventario", l: "Finanzas e inventario" },
  ...comun,
  { id: "bitacora", l: "Bitácora" },
  { id: "valorar", l: "★ Valorar" },
 ];
if (rol === "comprador") return [
  { id: "comprador", l: "Mis pedidos" },
  { id: "proveedores", l: "Mis proveedores" },
  { id: "inventario", l: "Ingresos y gastos" },
  ...comun,
  { id: "bitacora", l: "Bitácora" },
  { id: "valorar", l: "★ Valorar" },
 ];
 if (rol === "bar") return [
  { id: "bar_menu", l: "Mi menú" },
  { id: "bar_pedidos", l: "Pedidos del bar" },
  { id: "inventario", l: "Finanzas e inventario" },
  ...comun,
  { id: "bitacora", l: "Bitácora" },
  { id: "valorar", l: "★ Valorar" },
 ];
 if (rol === "barista") return [
  { id: "barista_menu", l: "Menú del día" },
  { id: "barista_turnos", l: "Mis turnos" },
  { id: "inventario", l: "Finanzas e insumos" },
  ...comun,
  { id: "bitacora", l: "Bitácora" },
 ];
if (rol === "certificador") return [
  { id: "certificar", l: "Bandeja de certificación" },
  { id: "catacion", l: "Catación SCA" },
  { id: "inventario", l: "Ingresos y gastos" },
  ...comun,
  { id: "bitacora", l: "Bitácora" },
 ];
 if (rol === "proveedor") return [
  { id: "inventario", l: "Ventas e inventario" },
  ...comun,
  { id: "bitacora", l: "Bitácora" },
 ];
if (rol === "transportista") return [
  { id: "transportista_fletes", l: "Fletes" },
  { id: "inventario", l: "Ingresos y gastos" },
  ...comun,
  { id: "bitacora", l: "Bitácora" },
 ];
if (rol === "pilador") return [
  { id: "pilador_pilado", l: "Pilado" },
  { id: "inventario", l: "Finanzas e inventario" },
  ...comun,
  { id: "bitacora", l: "Bitácora" },
 ];
if (rol === "exportador") return [
  { id: "exportador_envios", l: "Envíos" },
  { id: "inventario", l: "Ingresos y gastos" },
  ...comun,
  { id: "bitacora", l: "Bitácora" },
 ];
 if (rol === "amante") return [{ id: "amante", l: "Café en casa" }, ...comun];
 return [{ id: "inventario", l: "Ingresos y gastos" }, { id: "bitacora", l: "Bitácora" }, ...comun];
}

interface Paso { texto: string; vista?: string; href?: string }

// Orden sugerido de primeras acciones por perfil: mezcla vistas del panel
// (vista) con páginas del sitio (href), para que la persona sepa qué hacer
// primero sin tener que explorar todo el menú.
function pasosPorRol(rol: Exclude<Rol, "admin">): Paso[] {
 if (rol === "productor") return [
 { texto: "Publica tu primer lote", vista: "publicar" },
 { texto: "Revisa los precios del café", href: "/servicios/precios" },
 { texto: "Revisa los cursos de la Academia", href: "/academia" },
 { texto: "Consulta tus pedidos recibidos", vista: "bandeja" },
 ];
 if (rol === "vendedor") return [
 { texto: "Busca café para comprar", vista: "vendedor" },
 { texto: "Revisa los precios del café", href: "/servicios/precios" },
 { texto: "Revisa los cursos de la Academia", href: "/academia" },
 { texto: "Publica un servicio", vista: "publicar_servicio" },
 ];
 if (rol === "comprador") return [
 { texto: "Explora el Marketplace", href: "/marketplace" },
 { texto: "Revisa los precios del café", href: "/servicios/precios" },
 { texto: "Haz tu primer pedido", vista: "comprador" },
 { texto: "Revisa los cursos de la Academia", href: "/academia" },
 ];
 if (rol === "bar") return [
 { texto: "Revisa los precios del café", href: "/servicios/precios" },
 { texto: "Publica tu menú", vista: "bar_menu" },
 { texto: "Haz un pedido a productores", vista: "bar_pedidos" },
 ];
 if (rol === "barista") return [
 { texto: "Revisa el menú de tu bar", vista: "barista_menu" },
 { texto: "Consulta tus turnos", vista: "barista_turnos" },
 { texto: "Revisa los cursos de la Academia", href: "/academia" },
 ];
 if (rol === "certificador") return [
 { texto: "Revisa la bandeja de certificación", vista: "certificar" },
 { texto: "Registra una catación SCA", vista: "catacion" },
 ];
 if (rol === "proveedor") return [
 { texto: "Publica tu servicio", vista: "publicar_servicio" },
 { texto: "Revisa solicitudes del Marketplace", vista: "marketplace_pedidos" },
 { texto: "Revisa los cursos de la Academia", href: "/academia" },
 ];
 if (rol === "transportista") return [
 { texto: "Revisa los fletes disponibles", vista: "transportista_fletes" },
 { texto: "Revisa los precios del café", href: "/servicios/precios" },
 ];
 if (rol === "pilador") return [
 { texto: "Revisa el pilado", vista: "pilador_pilado" },
 { texto: "Revisa los precios del café", href: "/servicios/precios" },
 ];
 if (rol === "exportador") return [
 { texto: "Revisa tus envíos", vista: "exportador_envios" },
 { texto: "Revisa los precios del café", href: "/servicios/precios" },
 { texto: "Consulta trazabilidad / EUDR", href: "/servicios/eudr" },
 ];
 if (rol === "amante") return [
 { texto: "Explora el Marketplace", href: "/marketplace" },
 { texto: "Revisa los cursos de la Academia", href: "/academia" },
 { texto: "Prueba una receta", href: "/recetas" },
 ];
 return [
 { texto: "Revisa solicitudes del Marketplace", vista: "marketplace_pedidos" },
 { texto: "Revisa los cursos de la Academia", href: "/academia" },
 ];
}

function PrimerosPasos({ rol, onIrA }: { rol: Exclude<Rol, "admin">; onIrA: (vista: string) => void }) {
 const pasos = pasosPorRol(rol);
 if (!pasos.length) return null;
 return (
 <div className="rounded-2xl border border-hoja/30 bg-hoja/5 p-5">
 <p className="text-xs font-semibold uppercase tracking-widest text-hoja">Primeros pasos</p>
 <p className="mt-1 text-sm text-pizarra/70">Un orden sugerido para empezar. Puedes hacerlo en el orden que prefieras.</p>
 <ol className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
 {pasos.map((p, i) => {
 const contenido = (
 <>
 <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hoja text-xs font-bold text-crema">{i + 1}</span>
 <span className="text-sm font-semibold text-cafe">{p.texto}</span>
 </>
 );
 const clases = "flex items-center gap-2 rounded-xl border border-hoja/25 bg-white px-3 py-2 transition hover:border-hoja hover:shadow-sm sm:flex-1 sm:basis-[220px]";
 return (
 <li key={p.texto} className="sm:flex-1 sm:basis-[220px]">
 {p.href ? (
 <Link href={p.href} className={clases}>{contenido}</Link>
 ) : (
 <button type="button" onClick={() => onIrA(p.vista!)} className={`${clases} w-full text-left`}>{contenido}</button>
 )}
 </li>
 );
 })}
 </ol>
 </div>
 );
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// Helper: registra automáticamente en la bitácora unificada
function reg(perfil: Exclude<Rol, "admin">, tipo: TipoRegistro, accion: string, extra?: { cantidad?: number; unidad?: string; monto?: number }) {
 try {
 agregarRegistro({ perfil, tipo, accion, ...extra });
 } catch { /* noop */ }
}

export default function PanelPage() {
 return (
 <Suspense
 fallback={
 <div className="mx-auto max-w-6xl px-4 py-20 space-y-4" aria-busy="true">
 <Skeleton variante="titulo" className="w-1/2" />
 <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <Skeleton key={i} variante="titulo" className="h-20" style={{ borderRadius: 16 }} />
 ))}
 </div>
 <Skeleton variante="linea" className="w-full" />
 <Skeleton variante="linea" className="w-3/4" />
 </div>
 }
 >
 <PanelContent />
 </Suspense>
 );
}

function PanelContent() {
 const search = useSearchParams();
 const ver = search.get("ver");
 const [vista, setVista] = useState<string>(ver ?? "resumen");
 const [sesion, setSesion] = useState<ApiUser | null>(null);
 const [perfilActivo, setPerfilActivo] = useState<Exclude<Rol, "admin">>("productor");
 const [rolAbierto, setRolAbierto] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const inicioVistas = useRef<HTMLDivElement>(null);

 // Cada vista del panel se puede cerrar (arriba, abajo o tocando otra vez su
 // pestaña): en el móvil un formulario largo no puede dejar a nadie atrapado.
 const cerrarVista = () => {
  setVista("resumen");
  try {
   const u = new URL(window.location.href);
   if (u.searchParams.has("ver")) { u.searchParams.delete("ver"); u.searchParams.delete("editar"); u.searchParams.delete("tipo"); window.history.replaceState(null, "", u.pathname + u.search + u.hash); }
  } catch { /* sin URL: basta con cambiar la vista */ }
  inicioVistas.current?.scrollIntoView({ block: "start", behavior: "smooth" });
 };
 const abrirVista = (id: string) => { if (vista === id && id !== "resumen") cerrarVista(); else setVista(id); };

 useEffect(() => {
 const local = getStoredSession();
 if (local) { setSesion(local); setLoading(false); return; }
 api.me().then((r) => {
 if (r.ok && r.data) {
 const data = r.data as { user: ApiUser | null; requires_2fa?: boolean };
 // Si el usuario tiene 2FA pendiente, redirigir a /login para que verifique
 if (data.requires_2fa && !data.user) {
 setStoredSession(null);
 window.location.href = "/login?pending_2fa=1";
 return;
 }
 if (data.user) {
 setStoredSession(data.user);
 setSesion(data.user);
 }
 }
 setLoading(false);
 });
 }, []);

 useEffect(() => {
 if (!sesion) return;
 const roles = rolesDeUsuario(sesion);
 setPerfilActivo((actual) => roles.includes(actual) ? actual : roles[0]);
 }, [sesion]);

 if (loading) return (
 <div className="mx-auto max-w-6xl px-4 py-20 space-y-4" aria-busy="true">
 <Skeleton variante="titulo" className="w-1/2" />
 <Skeleton variante="linea" className="w-full" />
 <Skeleton variante="linea" className="w-2/3" />
 <Skeleton variante="linea" className="w-1/2" />
 </div>
 );

 if (!sesion) {
 return (
 <div className="mx-auto max-w-2xl px-4 py-16 text-center">
 <span aria-hidden="true" className="mx-auto block h-10 w-10 rounded-full border border-cereza/40"></span>
 <h1 className="mt-4 font-titulo text-3xl font-bold text-cafe">Aún no estás en la Red</h1>
 <p className="mt-2 text-pizarra/70">Únete gratis como productor, tostador, comprador, bar, barista, verificador, proveedor de equipos, transportista, pilador o exportador para ver tu panel.</p>
 <Link href="/afiliate" className="mt-6 inline-block rounded-full bg-cereza px-6 py-3 font-semibold text-crema hover:bg-cereza/90">Afíliate ahora</Link>
 </div>
 );
 }

 const rol = sesion.rol as Rol;
 const roles = rolesDeUsuario(sesion);
 const plan = PLANES.find((p) => p.id === sesion.plan);

 const cerrar = async () => {
 await api.logout();
 setStoredSession(null);
 window.location.href = "/";
 };

 const tabs = [
 { id: "resumen", l: "Resumen" },
 ...roles.flatMap((r) => tabsPorRol(r)).filter((tab, i, arr) => arr.findIndex((t) => t.id === tab.id) === i),
 { id: "certificados", l: "Informes técnicos" },
 { id: "cuenta", l: "Mi cuenta" },
 ];
 const nombreVista = (v: string) => tabs.find((t) => t.id === v)?.l ?? (v === "publicar" ? "Publicar lote de café" : "Sección del panel");

 return (
 <>
 <AtajosPanel roles={(sesion.roles?.length ? sesion.roles : [sesion.rol]).map(String)} />
 <div className="mx-auto max-w-6xl px-4 py-10">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Mi Red — Panel del miembro</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">Hola, {sesion.nombre.split(" ")[0]}</h1>
 <p className="text-sm text-pizarra/60">Perfil principal: {NOMBRES_PERFIL[roles[0]]} · Plan: {plan?.nombre ?? sesion.plan}</p>
 </div>
 <div className="flex flex-wrap gap-2">
 <Link href="/chat" className="inline-flex items-center gap-2 rounded-full bg-cafe px-4 py-2 text-sm font-semibold text-crema hover:bg-cafe/90">
 <Icono nombre="chat" className="h-4 w-4" />
 Chat
 </Link>
 <button onClick={cerrar} className="rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Cerrar sesión
 </button>
 </div>
 </div>

 <div className="mt-4 flex flex-wrap items-center gap-2">
 <span className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">Perfil activo</span>
 {roles.map((r) => (
 <button key={r} type="button" onClick={() => setPerfilActivo(r)}
 className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${perfilActivo === r ? "bg-cafe text-crema" : "border border-cafe/20 bg-white text-cafe"}`}>
 {NOMBRES_PERFIL[r]}{r === roles[0] ? " · principal" : ""}
 </button>
 ))}
 </div>

 <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cafe/10 bg-white p-4 shadow-sm">
 <div className="flex items-start gap-3">
 <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-hoja/15 text-hoja">
 <Icono nombre="chat" className="h-5 w-5" />
 </span>
 <div>
 <p className="font-titulo text-lg font-bold text-cafe">Chat ligado a operaciones</p>
 <p className="text-sm text-pizarra/60">
 Entre miembros, las conversaciones se activan desde pedidos, cotizaciones y compras. Administración siempre está disponible para soporte.
 </p>
 </div>
 </div>
 <Link href="/chat" className="rounded-full bg-cereza px-5 py-2.5 text-sm font-semibold text-crema hover:bg-cereza/90">
 Ver conversaciones
 </Link>
 </div>

 <div className="mt-4 space-y-3">
 <div className="flex flex-wrap gap-2">
 {[tabs[0], tabs[tabs.length - 2], tabs[tabs.length - 1]].map((t) => (
 <button key={t.id} onClick={() => abrirVista(t.id)} aria-pressed={vista === t.id}
 className={`rounded-full px-4 py-2 text-sm font-semibold transition ${vista === t.id ? "bg-cafe text-crema" : "border border-cafe/20 bg-white text-cafe"}`}>
 {t.l}
 </button>
 ))}
 </div>
 {roles.map((r) => (
 <details
 key={r}
 open={rolAbierto === r}
 onToggle={(e) => setRolAbierto(e.currentTarget.open ? r : null)}
 className={`rounded-2xl border bg-white p-3 ${perfilActivo === r ? "border-cafe/30" : "border-cafe/10"}`}
 >
 <summary className="cursor-pointer text-sm font-semibold text-cafe">{NOMBRES_PERFIL[r]}{r === roles[0] ? " · principal" : ""}</summary>
 <div className="mt-3 flex flex-wrap gap-2">
 {tabsPorRol(r).map((t) => (
 <button key={`${r}-${t.id}`} onClick={() => { abrirVista(t.id); setPerfilActivo(r); setRolAbierto(null); }} aria-pressed={vista === t.id}
 className={`rounded-full px-4 py-2 text-sm font-semibold transition ${vista === t.id ? "bg-cafe text-crema" : "border border-cafe/20 bg-white text-cafe"}`}>
 {t.l}
 </button>
 ))}
 </div>
 </details>
 ))}
 </div>

 <div className="mt-8 scroll-mt-24" ref={inicioVistas}>
 {vista !== "resumen" && (
  <div className="mb-4 flex items-center justify-between gap-3 border-b border-cafe/10 pb-3">
   <p className="text-sm font-semibold text-cafe">{nombreVista(vista)}</p>
   <button type="button" onClick={cerrarVista} className="btn-ghost min-h-11 px-4" aria-label={`Cerrar ${nombreVista(vista)} y volver al resumen`}>
    Cerrar <span aria-hidden="true" className="ml-1">✕</span>
   </button>
  </div>
 )}
 {vista === "resumen" && <Resumen rol={perfilActivo} sesion={sesion} plan={plan} onIrA={(v) => { setVista(v); setRolAbierto(null); }} />}
 {vista === "productor" && <ProductorProduccion />}
 {vista === "publicar" && <ProductorPublicar />}
 {vista === "publicar_servicio" && <PublicarServicioMarketplace />}
 {vista === "bandeja" && <ProductorBandeja />}
 {vista === "plan" && <ProductorPlanificacion />}
 {vista === "vendedor" && <VendedorAbastecimiento />}
 {vista === "vpedidos" && <VendedorPedidos />}
 {vista === "vcostos" && <VendedorCostos />}
 {vista === "comprador" && <CompradorPedidos />}
 {vista === "proveedores" && <CompradorProveedores />}
 {vista === "bar_menu" && <BarMenu />}
 {vista === "bar_pedidos" && <BarPedidos />}
 {vista === "barista_menu" && <BaristaMenu />}
 {vista === "barista_turnos" && <BaristaTurnos />}
 {vista === "certificar" && <BandejaCertificacion sesion={sesion} />}
 {vista === "catacion" && <CatacionSCA sesion={sesion} />}
 {vista === "transportista_fletes" && <TransportistaFletes />}
 {vista === "pilador_pilado" && <PiladorPilado />}
 {vista === "exportador_envios" && <ExportadorEnvios />}
 {vista === "inventario" && <InventarioPanel sesion={sesion} />}
 {vista === "amante" && <AmantePanel />}
 {vista === "servicios" && <ServiciosPanel rol={perfilActivo} />}
 {vista === "marketplace_pedidos" && <SolicitudesMarketplacePanel rol={perfilActivo} />}
 {vista === "mis_publicaciones" && <MisPublicacionesMarketplace sesion={sesion} />}
 {vista === "ordenes" && <OrdenesPanel />}
 {vista === "cotizaciones" && <CotizacionesPanel perfilActual={
   ["productor", "vendedor", "exportador", "pilador"].includes(perfilActivo) ? "recibidas" : "solicitadas"
 } />}
 {vista === "bitacora" && <BitacoraPanel rol={perfilActivo} />}
 {vista === "valorar" && <ValorarPanel />}
 {vista === "certificados" && <Certificados />}
 {vista === "cuenta" && <MiCuenta sesion={sesion} onSesion={setSesion} />}
 {vista !== "resumen" && (
  <button type="button" onClick={cerrarVista} className="btn-ghost mt-6 min-h-11 w-full px-4">
   Cerrar y volver al resumen
  </button>
 )}
 </div>
 </div>
 </>
 );
}

/* ==================== RESUMEN ==================== */

function Resumen({ rol, sesion, plan, onIrA }: { rol: Exclude<Rol, "admin">; sesion: ApiUser; plan: { nombre: string; precio: number } | undefined; onIrA: (vista: string) => void }) {
 const [pedidos, setPedidos] = useState<Pedido[]>([]);
 const produccion = leerBitacora<Prod[]>("produccion", []);
 const ventas = leerBitacora<Venta[]>("ventas", []);
 const compras = leerBitacora<Compra[]>("compras", []);
 const tostados = leerBitacora<Tostado[]>("tostados", []);
 const costosP = leerBitacora<Costo[]>("costos_productor", []);
 const costosV = leerBitacora<Costo[]>("costos_vendedor", []);
 const siembras = leerBitacora<Siembra[]>("siembras", []);

 useEffect(() => {
 api.pedidosList(rol, sesion.id).then((r) => {
 if (r.ok && r.data) setPedidos((r.data as { pedidos: Pedido[] }).pedidos);
 });
 }, [rol, sesion.id]);

 const stats: { k: string; v: string }[] = [{ k: "Plan", v: plan?.nombre ?? sesion.plan }];
 if (rol === "productor") {
 stats.push(
 { k: "Producción (qq)", v: produccion.reduce((a, p) => a + p.quintales, 0).toFixed(1) },
 { k: "Ventas ($)", v: `$${ventas.reduce((a, v) => a + v.total, 0).toFixed(0)}` },
 { k: "Pedidos recibidos", v: String(pedidos.length) },
 { k: "Costos ($)", v: `$${costosP.reduce((a, c) => a + c.monto, 0).toFixed(0)}` },
 { k: "Siembras planificadas", v: String(siembras.length) }
 );
 } else if (rol === "vendedor") {
 stats.push(
 { k: "Verde comprado ($)", v: `$${compras.reduce((a, c) => a + c.total, 0).toFixed(0)}` },
 { k: "Tostado (sacos)", v: tostados.reduce((a, t) => a + t.tostado, 0).toFixed(0) },
 { k: "Pedidos a productores", v: String(pedidos.length) },
 { k: "Costos ($)", v: `$${costosV.reduce((a, c) => a + c.monto, 0).toFixed(0)}` }
 );
 } else if (rol === "comprador") {
 stats.push(
 { k: "Mis pedidos", v: String(pedidos.length) },
 { k: "Fincas guardadas", v: String(leerBitacora<string[]>("favoritos", []).length) }
 );
 } else if (rol === "bar") {
 stats.push({ k: "Pedidos del bar", v: String(pedidos.length) });
 } else if (rol === "barista") {
 stats.push({ k: "Pedidos", v: String(pedidos.length) });
 } else if (rol === "transportista") {
 const fletes = leerBitacora<Flete[]>("fletes", []);
 stats.push({ k: "Fletes", v: String(fletes.length) }, { k: "Sacos movidos", v: String(fletes.reduce((a, f) => a + f.sacos, 0)) });
 } else if (rol === "pilador") {
 const pilados = leerBitacora<Pilado[]>("pilados", []);
 stats.push({ k: "Pilados", v: String(pilados.length) }, { k: "Quintales", v: String(pilados.reduce((a, p) => a + p.quintales, 0)) });
 } else if (rol === "exportador") {
 const envios = leerBitacora<Envio[]>("envios", []);
 stats.push({ k: "Envíos", v: String(envios.length) }, { k: "Sacos", v: String(envios.reduce((a, e) => a + e.sacos, 0)) });
 } else if (rol === "certificador") {
 stats.push({ k: "Certificaciones", v: String(leerCertificados().length) });
 } else if (rol === "proveedor") {
 stats.push({ k: "Solicitudes", v: String(pedidos.length) });
 }

 return (
 <div className="space-y-6">
 <PrimerosPasos rol={rol} onIrA={onIrA} />
 {/* Tarjetas rápidas heredadas */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {stats.map((c) => (
 <div key={c.k} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="text-xs text-pizarra/60">{c.k}</p>
 <p className="mt-1 text-2xl font-bold text-cafe">{c.v}</p>
 </div>
 ))}
 </div>

 {/* Estadísticas y gráficos en vivo */}
 <div className="rounded-2xl border border-cafe/10 bg-crema/30 p-4">
 <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-pizarra/60">
 Estadísticas en vivo (12 meses)
 </p>
 <PanelEstadisticas rol={rol} showDistribucion={true} chartTitle={`Tu actividad como ${rol}`} />
 </div>
 </div>
 );
}

/* ==================== PRODUCTOR ==================== */

function ProductorProduccion() {
 const [produccion, setProduccion] = useState<Prod[]>(leerBitacora("produccion", []));
 const [ventas, setVentas] = useState<Venta[]>(leerBitacora("ventas", []));
 const [ok, setOk] = useState<string | null>(null);
 const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
 const [variedad, setVariedad] = useState("");
 const [quintales, setQuintales] = useState("");
 const [calidad, setCalidad] = useState("Estándar");
 const [vFecha, setVFecha] = useState(new Date().toISOString().slice(0, 10));
 const [destino, setDestino] = useState("");
 const [vQuintales, setVQuintales] = useState("");
 const [precio, setPrecio] = useState("");

 const addProd = (e: React.FormEvent) => {
 e.preventDefault();
 const qq = parseFloat(quintales);
 if (!variedad.trim() || isNaN(qq) || qq <= 0) { setOk("Completa variedad y quintales válidos."); return; }
 const next = [...produccion, { id: uid(), fecha, variedad, quintales: qq, calidad }];
 guardarBitacora("produccion", next); setProduccion(next);
 reg("productor", "produccion", `${qq} qq de ${variedad} (${calidad})`, { cantidad: qq, unidad: "qq" });
 setVariedad(""); setQuintales(""); setOk("Producción registrada.");
 };
 const addVenta = (e: React.FormEvent) => {
 e.preventDefault();
 const qq = parseFloat(vQuintales), pr = parseFloat(precio);
 if (!destino.trim() || isNaN(qq) || isNaN(pr)) { setOk("Completa destino, quintales y precio."); return; }
 const total = qq * pr;
 const next = [...ventas, { id: uid(), fecha: vFecha, destino, quintales: qq, precio: pr, total }];
 guardarBitacora("ventas", next); setVentas(next);
 reg("productor", "venta", `Venta a ${destino}: ${qq} qq × $${pr}`, { cantidad: qq, unidad: "qq", monto: total });
 setDestino(""); setVQuintales(""); setPrecio(""); setOk("Venta registrada.");
 };

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Control de producción y venta</h2>
 <p className="mb-4 text-sm text-pizarra/70">Registra tu cosecha y tus ventas. Los datos se guardan en este navegador.</p>
 <div className="grid gap-4 sm:grid-cols-3">
 <div className="rounded-2xl border border-hoja/30 bg-hoja/10 p-4"><p className="text-xs text-pizarra/60">Producción total</p><p className="text-2xl font-bold text-cafe">{produccion.reduce((a, p) => a + p.quintales, 0).toFixed(1)} qq</p></div>
 <div className="rounded-2xl border border-latte/40 bg-latte/10 p-4"><p className="text-xs text-pizarra/60">Ventas totales</p><p className="text-2xl font-bold text-cafe">${ventas.reduce((a, v) => a + v.total, 0).toFixed(0)}</p></div>
 <div className="rounded-2xl border border-cafe/10 bg-white p-4"><p className="text-xs text-pizarra/60">Registros de venta</p><p className="text-2xl font-bold text-cafe">{ventas.length}</p></div>
 </div>
 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <form onSubmit={addProd} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Registrar producción</p>
 <div className="mt-3 space-y-3">
 <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={variedad} onChange={(e) => setVariedad(e.target.value)} placeholder="Variedad (ej: Geisha)" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.1" value={quintales} onChange={(e) => setQuintales(e.target.value)} placeholder="Quintales cosechados" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <select value={calidad} onChange={(e) => setCalidad(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2">
 <option>Estándar</option><option>Premium</option><option>Especialidad</option>
 </select>
 <button className="w-full rounded-full bg-hoja px-4 py-2.5 font-semibold text-crema hover:bg-hoja/90">Guardar producción</button>
 </div>
 </form>
 <form onSubmit={addVenta} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Registrar venta</p>
 <div className="mt-3 space-y-3">
 <input type="date" value={vFecha} onChange={(e) => setVFecha(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Comprador / destino" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.1" value={vQuintales} onChange={(e) => setVQuintales(e.target.value)} placeholder="Quintales vendidos" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio por qq ($)" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <button className="w-full rounded-full bg-cereza px-4 py-2.5 font-semibold text-crema hover:bg-cereza/90">Guardar venta</button>
 </div>
 </form>
 </div>
 {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <div>
 <p className="mb-2 font-semibold text-cafe">Producción reciente</p>
{produccion.length === 0 ? (
  <EstadoVacio titulo="Sin registros de producción" descripcion="Tu cosecha aparecerá aquí cuando la registres." />
 ) : (
  <div className="space-y-2">{produccion.slice().reverse().map((p) => (
 <div key={p.id} className="rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <span className="font-semibold text-cafe">{p.variedad}</span> · {p.quintales} qq · {p.calidad}
 <span className="float-right text-pizarra/50">{p.fecha}</span>
 </div>))}</div>)}
 </div>
 <div>
 <p className="mb-2 font-semibold text-cafe">Ventas recientes</p>
{ventas.length === 0 ? (
  <EstadoVacio titulo="Sin registros de venta" descripcion="Tus ventas aparecerán aquí cuando las registres." />
 ) : (
  <div className="space-y-2">{ventas.slice().reverse().map((v) => (
 <div key={v.id} className="rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <span className="font-semibold text-cafe">{v.destino}</span> · {v.quintales} qq · ${v.total.toFixed(0)}
 <span className="float-right text-pizarra/50">{v.fecha}</span>
 </div>))}</div>)}
 </div>
 </div>
 </div>
 );
}

function ProductorPublicar() {
 const [ok, setOk] = useState<string | null>(null);
 const [finca, setFinca] = useState("");
 const [provincia, setProvincia] = useState("");
 const [variedad, setVariedad] = useState("");
 const [proceso, setProceso] = useState("Lavado");
 const [altura, setAltura] = useState("");
 const [precioSaco, setPrecioSaco] = useState("");
 const [stockSacos, setStockSacos] = useState("");
const [certificacion, setCertificacion] = useState("Convencional");
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoBuscando, setGeoBuscando] = useState(false);

  const usarMiUbicacion = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    setGeoBuscando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoBuscando(false);
      },
      () => setGeoBuscando(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const publicar = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!finca.trim() || !provincia.trim() || !variedad.trim() || !precioSaco.trim()) {
  setOk("Completa finca, provincia, variedad y precio."); return;
  }
  setSubiendo(true);
  const urls: string[] = [];
  for (const file of imagenes) {
  const up = await api.uploadImage(file, "marketplace");
  if (!up.ok || !up.data?.url) {
  setSubiendo(false);
  setOk(up.status === 401 ? "Tu sesión caducó. Vuelve a entrar para publicar el lote." : up.error || "No pudimos subir una imagen.");
  return;
  }
  urls.push(up.data.url);
  }
  const latNum = lat.trim() === "" ? undefined : Number(lat);
  const lngNum = lng.trim() === "" ? undefined : Number(lng);
  const r = await api.lotePublish({
  finca, provincia, variedad, proceso,
  altura: parseInt(altura) || 0, precioSaco: parseFloat(precioSaco),
  stockSacos: parseInt(stockSacos) || 0, stockQuintales: Math.floor((parseInt(stockSacos) || 0) / 2),
  certificacion, score: 80, imagenes: urls,
  ...(typeof latNum === "number" && Number.isFinite(latNum) ? { lat: latNum } : {}),
  ...(typeof lngNum === "number" && Number.isFinite(lngNum) ? { lng: lngNum } : {}),
  });
  setSubiendo(false);
  if (r.ok) {
  setOk("Lote publicado en el Marketplace. Si agregaste ubicación válida, también se actualizará en el mapa.");
  reg("productor", "lote", `Lote publicado: ${finca} — ${variedad} ${proceso}`, { cantidad: parseInt(stockSacos) || 0, unidad: "sacos" });
  setFinca(""); setProvincia(""); setVariedad(""); setAltura(""); setPrecioSaco(""); setStockSacos("");
  setLat(""); setLng(""); setImagenes([]);
  } else {
  setOk(r.error || "Error al publicar.");
  }
  };

  const seleccionarImagenes = (files: FileList | null) => {
  const elegidas = Array.from(files ?? [])
  .filter((file) => file.type.startsWith("image/") && file.size <= 2 * 1024 * 1024)
  .slice(0, 6);
  setImagenes(elegidas);
  if ((files?.length ?? 0) > elegidas.length) setOk("Puedes adjuntar hasta 6 imágenes JPG, PNG o WebP de máximo 2 MB.");
  };

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Publicar lote en el Marketplace</h2>
 <p className="mb-4 text-sm text-pizarra/70">Comparte tu café con compradores y tostadores de toda la Red.</p>
 <form onSubmit={publicar} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="grid gap-3 sm:grid-cols-2">
 <input value={finca} onChange={(e) => setFinca(e.target.value)} placeholder="Nombre de finca o unidad productiva" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Provincia" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={variedad} onChange={(e) => setVariedad(e.target.value)} placeholder="Variedad (ej: Geisha)" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <select value={proceso} onChange={(e) => setProceso(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2">
 <option>Lavado</option><option>Natural</option><option>Honey</option><option>Semi-lavado</option>
 </select>
 <input type="number" value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="Altura (msnm)" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.01" value={precioSaco} onChange={(e) => setPrecioSaco(e.target.value)} placeholder="Precio por saco ($)" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" value={stockSacos} onChange={(e) => setStockSacos(e.target.value)} placeholder="Stock (sacos)" className="rounded-lg border border-cafe/20 px-3 py-2" />
<select value={certificacion} onChange={(e) => setCertificacion(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2">
  <option>Convencional</option><option>Orgánico</option><option>Comercio Justo</option><option>Rainforest</option>
  </select>
  <div className="rounded-lg border border-dashed border-cafe/20 bg-crema/30 p-3 sm:col-span-2">
  <p className="text-xs font-semibold text-pizarra/60">Ubicación de la finca (opcional — aparece en el mapa del Marketplace)</p>
  <div className="mt-2 grid gap-2 sm:grid-cols-2">
  <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitud aproximada (ej: -3.99)" className="rounded-lg border border-cafe/20 px-3 py-2" />
  <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitud aproximada (ej: -79.20)" className="rounded-lg border border-cafe/20 px-3 py-2" />
  </div>
  <button type="button" onClick={usarMiUbicacion} disabled={geoBuscando} className="mt-2 rounded-full border border-hoja px-3 py-1.5 text-xs font-semibold text-hoja hover:bg-hoja/10 disabled:opacity-50">
  {geoBuscando ? "Obteniendo ubicación…" : "Usar mi ubicación actual"}
  </button>
  </div>
  <div className="rounded-lg border border-dashed border-cafe/20 bg-crema/30 p-3 sm:col-span-2">
  <p className="text-xs font-semibold text-pizarra/60">Fotos del lote (opcional)</p>
  <input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  multiple
  onChange={(e) => seleccionarImagenes(e.target.files)}
  className="mt-2 block w-full text-sm text-pizarra/70 file:mr-3 file:rounded-full file:border-0 file:bg-hoja file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-crema"
  />
  {imagenes.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-2 text-xs text-pizarra/60">
  {imagenes.map((img) => <span key={`${img.name}-${img.size}`} className="rounded-full bg-white px-2 py-1">{img.name}</span>)}
  </div>
  )}
  </div>
  </div>
 <button disabled={subiendo} className="mt-4 w-full rounded-full bg-hoja px-4 py-2.5 font-semibold text-crema hover:bg-hoja/90 disabled:opacity-60">{subiendo ? "Publicando..." : "Publicar lote de café"}</button>
 </form>
 {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 </div>
 );
}

function PublicarServicioMarketplace() {
 const [ok, setOk] = useState<string | null>(null);
 const [titulo, setTitulo] = useState("");
 const [categoria, setCategoria] = useState("transporte");
 const [descripcion, setDescripcion] = useState("");
 const [provincia, setProvincia] = useState("");
 const [cobertura, setCobertura] = useState("");
 const [precio, setPrecio] = useState("");
 const [unidad, setUnidad] = useState("servicio");
 const [imagenes, setImagenes] = useState<File[]>([]);
 const [subiendo, setSubiendo] = useState(false);

 const seleccionarImagenes = (files: FileList | null) => {
 const elegidas = Array.from(files ?? [])
 .filter((file) => file.type.startsWith("image/") && file.size <= 2 * 1024 * 1024)
 .slice(0, 6);
 setImagenes(elegidas);
 if ((files?.length ?? 0) > elegidas.length) setOk("Puedes adjuntar hasta 6 imágenes JPG, PNG o WebP de máximo 2 MB.");
 };

 const publicar = async (e: React.FormEvent) => {
 e.preventDefault();
 setOk(null);
 if (!titulo.trim() || !descripcion.trim()) {
 setOk("Completa el título y la descripción del servicio.");
 return;
 }
 setSubiendo(true);
 const urls: string[] = [];
 for (const file of imagenes) {
 const up = await api.uploadImage(file, "marketplace");
 if (!up.ok || !up.data?.url) {
 setSubiendo(false);
 setOk(up.status === 401 ? "Tu sesión caducó. Vuelve a entrar para publicar el servicio." : up.error || "No pudimos subir una imagen.");
 return;
 }
 urls.push(up.data.url);
 }
 const r = await api.marketplaceServicioPublish({
 titulo,
 categoria: categoria as "transporte" | "catacion" | "asesoria" | "pilado" | "insumos" | "capacitacion" | "exportacion" | "otro",
 descripcion,
 provincia,
 cobertura,
 precio: parseFloat(precio) || 0,
 unidad,
 imagenes: urls,
 });
 setSubiendo(false);
 if (!r.ok) {
 setOk(r.error || "Error al publicar el servicio.");
 return;
 }
 setOk("Servicio publicado en el Marketplace.");
 setTitulo(""); setDescripcion(""); setProvincia(""); setCobertura(""); setPrecio(""); setUnidad("servicio"); setImagenes([]);
 };

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Publicar servicio en el Marketplace</h2>
 <p className="mb-4 text-sm text-pizarra/70">Ofrece transporte, catación, asesoría, pilado, insumos u otros servicios para el negocio cafetero.</p>
 <form onSubmit={publicar} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="grid gap-3 sm:grid-cols-2">
 <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nombre del servicio" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2" aria-label="Categoría del servicio">
 <option value="transporte">Transporte</option>
 <option value="catacion">Catación</option>
 <option value="asesoria">Asesoría</option>
 <option value="pilado">Pilado / beneficio</option>
 <option value="insumos">Equipos e insumos</option>
 <option value="capacitacion">Capacitación</option>
 <option value="exportacion">Exportación</option>
 <option value="otro">Otro servicio</option>
 </select>
 <input value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Provincia base" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={cobertura} onChange={(e) => setCobertura(e.target.value)} placeholder="Cobertura (ej: provincia, zona o nacional)" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.01" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio referencial ($)" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="Unidad (viaje, muestra, hora, saco...)" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Describe qué incluye, condiciones, tiempos y tipo de cliente al que atiendes." rows={4} className="rounded-lg border border-cafe/20 px-3 py-2 sm:col-span-2" />
 <div className="rounded-lg border border-dashed border-cafe/20 bg-crema/30 p-3 sm:col-span-2">
 <p className="text-xs font-semibold text-pizarra/60">Imágenes del servicio (opcional)</p>
 <input
 type="file"
 accept="image/jpeg,image/png,image/webp"
 multiple
 onChange={(e) => seleccionarImagenes(e.target.files)}
 className="mt-2 block w-full text-sm text-pizarra/70 file:mr-3 file:rounded-full file:border-0 file:bg-hoja file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-crema"
 />
 {imagenes.length > 0 && (
 <div className="mt-2 flex flex-wrap gap-2 text-xs text-pizarra/60">
 {imagenes.map((img) => <span key={`${img.name}-${img.size}`} className="rounded-full bg-white px-2 py-1">{img.name}</span>)}
 </div>
 )}
 </div>
 </div>
 <button disabled={subiendo} className="mt-4 w-full rounded-full bg-hoja px-4 py-2.5 font-semibold text-crema hover:bg-hoja/90 disabled:opacity-60">
 {subiendo ? "Publicando..." : "Publicar servicio"}
 </button>
 </form>
 {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 </div>
 );
}

function ProductorBandeja() {
 const [pedidos, setPedidos] = useState<Pedido[]>([]);
 const [ok, setOk] = useState<string | null>(null);
 const sesion = getStoredSession();

 useEffect(() => {
 if (!sesion) return;
 api.pedidosList("productor", sesion.id).then((r) => {
 if (r.ok && r.data) setPedidos((r.data as { pedidos: Pedido[] }).pedidos);
 });
 }, [sesion]);

 const avanzar = async (nro: number) => {
 const r = await api.pedidoAdvance(nro);
 if (r.ok) {
 setPedidos((prev) => prev.map((p) => p.nro === nro ? { ...p, estado: ESTADOS[Math.min(ESTADOS.indexOf(p.estado) + 1, ESTADOS.length - 1)] } : p));
 setOk(`Pedido #${nro} avanzado.`);
 }
 };

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Bandeja de pedidos recibidos</h2>
 <p className="mb-4 text-sm text-pizarra/70">Pedidos de compradores y vendedores. Avanza el estado y se sincroniza.</p>
{pedidos.length === 0 ? (
 <EstadoVacio titulo="Aún no has recibido pedidos" descripcion="Cuando un comprador haga un pedido, aparecerá en tu bandeja." />
 ) : (
 <div className="space-y-3">{pedidos.map((p) => (
 <div key={p.nro} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="font-semibold text-cafe">Pedido #{p.nro} — {p.finca}</p>
 <span className="rounded-full bg-latte/20 px-3 py-1 text-xs font-bold text-latte-texto">{p.estado}</span>
 </div>
 <p className="mt-1 text-sm text-pizarra/70">De: <b>{p.solicitante}</b> ({p.origenRol}) · {p.sacos} sacos · ${p.total.toFixed(0)} · {p.fecha}</p>
 <div className="mt-3 flex gap-2">
 {p.estado !== "Entregado" ? (
 <button onClick={() => avanzar(p.nro)} className="rounded-full bg-cafe px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cafe/90">Avanzar estado</button>
 ) : (
 <span className="rounded-full bg-hoja/20 px-3 py-1 text-xs font-semibold text-hoja">Entregado</span>
 )}
 {p.solicitante_id && (
 <Link href={`/chat?user=${encodeURIComponent(p.solicitante_id)}`} className="rounded-full bg-cereza px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cereza/90">
 Chat del pedido
 </Link>
 )}
 <a href={waLink(`Hola, soy la finca ${p.finca}. Sobre el pedido #${p.nro} de ${p.solicitante}.`)} target="_blank" rel="noreferrer"
 className="rounded-full border border-hoja px-4 py-1.5 text-xs font-semibold text-hoja">Coordinar con {p.solicitante}</a>
 </div>
 </div>
 ))}</div>
 )}
 {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 </div>
 );
}

function ProductorPlanificacion() {
 const [siembras, setSiembras] = useState<Siembra[]>(leerBitacora("siembras", []));
 const [limpiezas, setLimpiezas] = useState<Limpieza[]>(leerBitacora("limpiezas", []));
 const [costos, setCostos] = useState<Costo[]>(leerBitacora("costos_productor", []));
 const [ok, setOk] = useState<string | null>(null);
 const [precioRef, setPrecioRef] = useState("250");
 const [sFecha, setSFecha] = useState(new Date().toISOString().slice(0, 10));
 const [sVar, setSVar] = useState("");
 const [sHa, setSHa] = useState("");
 const [sEst, setSEst] = useState("");
 const [lFecha, setLFecha] = useState(new Date().toISOString().slice(0, 10));
 const [lTipo, setLTipo] = useState("Poda");
 const [lParc, setLParc] = useState("");
 const [cFecha, setCFecha] = useState(new Date().toISOString().slice(0, 10));
 const [cConc, setCConc] = useState("");
 const [cMont, setCMont] = useState("");
 const [cCat, setCCat] = useState("Insumos");

 const addS = (e: React.FormEvent) => {
 e.preventDefault();
 const ha = parseFloat(sHa), est = parseFloat(sEst);
 if (!sVar.trim() || isNaN(ha) || isNaN(est)) { setOk("Completa variedad, hectáreas y estimación."); return; }
 const next = [...siembras, { id: uid(), fecha: sFecha, variedad: sVar, hectareas: ha, estimacion: est }];
 guardarBitacora("siembras", next); setSiembras(next);
 reg("productor", "siembra", `Siembra de ${sVar}: ${ha} ha, est. ${est} qq`, { cantidad: ha, unidad: "ha" });
 setSVar(""); setSHa(""); setSEst(""); setOk("Siembra planificada.");
 };
 const addL = (e: React.FormEvent) => {
 e.preventDefault();
 if (!lParc.trim()) { setOk("Indica la parcela."); return; }
 const next = [...limpiezas, { id: uid(), fecha: lFecha, tipo: lTipo, parcela: lParc }];
 guardarBitacora("limpiezas", next); setLimpiezas(next);
 reg("productor", "limpieza", `${lTipo} en ${lParc}`, { });
 setLParc(""); setOk("Tarea de limpieza registrada.");
 };
 const addC = (e: React.FormEvent) => {
 e.preventDefault();
 const m = parseFloat(cMont);
 if (!cConc.trim() || isNaN(m)) { setOk("Completa concepto y monto."); return; }
 const next = [...costos, { id: uid(), fecha: cFecha, concepto: cConc, monto: m, categoria: cCat }];
 guardarBitacora("costos_productor", next); setCostos(next);
 reg("productor", "costo", `${cConc} (${cCat})`, { monto: m });
 setCConc(""); setCMont(""); setOk("Costo registrado.");
 };

 const estimada = siembras.reduce((a, s) => a + s.estimacion, 0);
 const ingresoProy = estimada * (parseFloat(precioRef) || 0);
 const totalCostos = costos.reduce((a, c) => a + c.monto, 0);
 const margen = ingresoProy - totalCostos;

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Planificación de finca</h2>
 <p className="mb-4 text-sm text-pizarra/70">Planifica siembras, limpiezas, costos y proyecta tu venta.</p>
 <div className="grid gap-4 sm:grid-cols-4">
 <div className="rounded-2xl border border-hoja/30 bg-hoja/10 p-4"><p className="text-xs text-pizarra/60">Cosecha estimada</p><p className="text-2xl font-bold text-cafe">{estimada.toFixed(0)} qq</p></div>
 <div className="rounded-2xl border border-latte/40 bg-latte/10 p-4"><p className="text-xs text-pizarra/60">Ingreso proyectado</p><p className="text-2xl font-bold text-cafe">${ingresoProy.toFixed(0)}</p></div>
 <div className="rounded-2xl border border-cereza/30 bg-cereza/10 p-4"><p className="text-xs text-pizarra/60">Costos</p><p className="text-2xl font-bold text-cafe">${totalCostos.toFixed(0)}</p></div>
 <div className="rounded-2xl border border-cafe/10 bg-white p-4"><p className="text-xs text-pizarra/60">Margen proyectado</p><p className="text-2xl font-bold text-cafe">${margen.toFixed(0)}</p></div>
 </div>
 <div className="mt-4 rounded-xl border border-cafe/10 bg-white p-4">
 <label className="text-xs font-semibold text-pizarra/60">Precio de referencia por qq ($)</label>
 <input type="number" value={precioRef} onChange={(e) => setPrecioRef(e.target.value)} className="mt-1 w-40 rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <div className="mt-6 grid gap-6 lg:grid-cols-3">
 <form onSubmit={addS} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Planificar siembra</p>
 <div className="mt-3 space-y-3">
 <input type="date" value={sFecha} onChange={(e) => setSFecha(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={sVar} onChange={(e) => setSVar(e.target.value)} placeholder="Variedad" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.1" value={sHa} onChange={(e) => setSHa(e.target.value)} placeholder="Hectáreas" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.1" value={sEst} onChange={(e) => setSEst(e.target.value)} placeholder="Estimación (qq)" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <button className="w-full rounded-full bg-hoja px-4 py-2.5 font-semibold text-crema hover:bg-hoja/90">Guardar siembra</button>
 </div>
 </form>
 <form onSubmit={addL} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Limpieza / mantenimiento</p>
 <div className="mt-3 space-y-3">
 <input type="date" value={lFecha} onChange={(e) => setLFecha(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <select value={lTipo} onChange={(e) => setLTipo(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2">
 <option>Poda</option><option>Deshierbe</option><option>Fertilización</option><option>Control plagas</option>
 </select>
 <input value={lParc} onChange={(e) => setLParc(e.target.value)} placeholder="Parcela / sector" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <button className="w-full rounded-full bg-hoja px-4 py-2.5 font-semibold text-crema hover:bg-hoja/90">Guardar tarea</button>
 </div>
 </form>
 <form onSubmit={addC} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Registrar costo</p>
 <div className="mt-3 space-y-3">
 <input type="date" value={cFecha} onChange={(e) => setCFecha(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={cConc} onChange={(e) => setCConc(e.target.value)} placeholder="Concepto" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.01" value={cMont} onChange={(e) => setCMont(e.target.value)} placeholder="Monto ($)" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <select value={cCat} onChange={(e) => setCCat(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2">
 <option>Insumos</option><option>Mano de obra</option><option>Transporte</option><option>Certificación</option><option>Otros</option>
 </select>
 <button className="w-full rounded-full bg-cereza px-4 py-2.5 font-semibold text-crema hover:bg-cereza/90">Guardar costo</button>
 </div>
 </form>
 </div>
 {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 <div className="mt-6 grid gap-6 lg:grid-cols-3">
 <div>
 <p className="mb-2 font-semibold text-cafe">Siembras</p>
 {siembras.length === 0 ? <p className="rounded-xl border border-cafe/10 bg-white p-4 text-sm text-pizarra/60">Sin plan.</p> : (
 <div className="space-y-2">{siembras.slice().reverse().map((s) => (
 <div key={s.id} className="rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <span className="font-semibold text-cafe">{s.variedad}</span> · {s.hectareas} ha · {s.estimacion} qq
 <span className="float-right text-pizarra/50">{s.fecha}</span>
 </div>))}</div>)}
 </div>
 <div>
 <p className="mb-2 font-semibold text-cafe">Limpiezas / tareas</p>
 {limpiezas.length === 0 ? <p className="rounded-xl border border-cafe/10 bg-white p-4 text-sm text-pizarra/60">Sin tareas.</p> : (
 <div className="space-y-2">{limpiezas.slice().reverse().map((l) => (
 <div key={l.id} className="rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <span className="font-semibold text-cafe">{l.tipo}</span> · {l.parcela}
 <span className="float-right text-pizarra/50">{l.fecha}</span>
 </div>))}</div>)}
 </div>
 <div>
 <p className="mb-2 font-semibold text-cafe">Costos</p>
 {costos.length === 0 ? <p className="rounded-xl border border-cafe/10 bg-white p-4 text-sm text-pizarra/60">Sin costos.</p> : (
 <div className="space-y-2">{costos.slice().reverse().map((c) => (
 <div key={c.id} className="rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <span className="font-semibold text-cafe">{c.concepto}</span> · ${c.monto.toFixed(0)} · {c.categoria}
 <span className="float-right text-pizarra/50">{c.fecha}</span>
 </div>))}</div>)}
 </div>
 </div>
 </div>
 );
}

/* ==================== VENDEDOR ==================== */

function VendedorAbastecimiento() {
 const [compras, setCompras] = useState<Compra[]>(leerBitacora("compras", []));
 const [tostados, setTostados] = useState<Tostado[]>(leerBitacora("tostados", []));
 const [ok, setOk] = useState<string | null>(null);
 const [cFecha, setCFecha] = useState(new Date().toISOString().slice(0, 10));
 const [origen, setOrigen] = useState("");
 const [sacos, setSacos] = useState("");
 const [precio, setPrecio] = useState("");
 const [tFecha, setTFecha] = useState(new Date().toISOString().slice(0, 10));
 const [lote, setLote] = useState("");
 const [verde, setVerde] = useState("");
 const [tostado, setTostado] = useState("");

 const addCompra = (e: React.FormEvent) => {
 e.preventDefault();
 const s = parseFloat(sacos), pr = parseFloat(precio);
 if (!origen.trim() || isNaN(s) || isNaN(pr)) { setOk("Completa origen, sacos y precio."); return; }
 const total = s * pr;
 const next = [...compras, { id: uid(), fecha: cFecha, origen, sacos: s, precio: pr, total }];
 guardarBitacora("compras", next); setCompras(next);
 reg("vendedor", "compra", `Compra a ${origen}: ${s} sacos × $${pr}`, { cantidad: s, unidad: "sacos", monto: total });
 setOrigen(""); setSacos(""); setPrecio(""); setOk("Compra de verde registrada.");
 };
 const addTostado = (e: React.FormEvent) => {
 e.preventDefault();
 const v = parseFloat(verde), t = parseFloat(tostado);
 if (!lote.trim() || isNaN(v) || isNaN(t) || t > v) { setOk("Completa lote y sacos válidos."); return; }
 const next = [...tostados, { id: uid(), fecha: tFecha, lote, verde: v, tostado: t, merma: v - t }];
 guardarBitacora("tostados", next); setTostados(next);
 reg("vendedor", "tostado", `Tostado de ${lote}: ${v} → ${t} sacos (merma ${(v - t).toFixed(1)})`, { cantidad: t, unidad: "sacos" });
 setLote(""); setVerde(""); setTostado(""); setOk("Tostado registrado.");
 };

 const totalCompras = compras.reduce((a, c) => a + c.total, 0);
 const totalTostado = tostados.reduce((a, t) => a + t.tostado, 0);
 const merma = tostados.reduce((a, t) => a + t.verde, 0) > 0
 ? (tostados.reduce((a, t) => a + t.verde, 0) - totalTostado) / tostados.reduce((a, t) => a + t.verde, 0) : 0;

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Abastecimiento y tostado</h2>
 <p className="mb-4 text-sm text-pizarra/70">Control de café verde y producción de tostadora.</p>
 <div className="grid gap-4 sm:grid-cols-3">
 <div className="rounded-2xl border border-cafe/10 bg-white p-4"><p className="text-xs text-pizarra/60">Inversión en verde</p><p className="text-2xl font-bold text-cafe">${totalCompras.toFixed(0)}</p></div>
 <div className="rounded-2xl border border-hoja/30 bg-hoja/10 p-4"><p className="text-xs text-pizarra/60">Café tostado</p><p className="text-2xl font-bold text-cafe">{totalTostado.toFixed(0)} sacos</p></div>
 <div className="rounded-2xl border border-latte/40 bg-latte/10 p-4"><p className="text-xs text-pizarra/60">Merma promedio</p><p className="text-2xl font-bold text-cafe">{(merma * 100).toFixed(1)}%</p></div>
 </div>
 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <form onSubmit={addCompra} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Comprar verde</p>
 <div className="mt-3 space-y-3">
 <input type="date" value={cFecha} onChange={(e) => setCFecha(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Origen / finca" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.1" value={sacos} onChange={(e) => setSacos(e.target.value)} placeholder="Sacos de verde" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio por saco ($)" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <button className="w-full rounded-full bg-hoja px-4 py-2.5 font-semibold text-crema hover:bg-hoja/90">Guardar compra</button>
 </div>
 </form>
 <form onSubmit={addTostado} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Registrar tostado</p>
 <div className="mt-3 space-y-3">
 <input type="date" value={tFecha} onChange={(e) => setTFecha(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Lote / microlote" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.1" value={verde} onChange={(e) => setVerde(e.target.value)} placeholder="Sacos verdes" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.1" value={tostado} onChange={(e) => setTostado(e.target.value)} placeholder="Sacos tostados" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <button className="w-full rounded-full bg-cereza px-4 py-2.5 font-semibold text-crema hover:bg-cereza/90">Guardar tostado</button>
 </div>
 </form>
 </div>
 {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 </div>
 );
}

function VendedorPedidos() {
 const [pedidos, setPedidos] = useState<Pedido[]>([]);
 const [ok, setOk] = useState<string | null>(null);
 const [lotes, setLotes] = useState<Lote[]>([]);
 const [finca, setFinca] = useState("");
 const [sacos, setSacos] = useState("5");
 const sesion = getStoredSession();

 useEffect(() => {
 api.lotesList().then((r) => { if (r.ok && r.data) setLotes((r.data as { lotes: Lote[] }).lotes); });
 if (sesion) api.pedidosList("vendedor", sesion.id).then((r) => { if (r.ok && r.data) setPedidos((r.data as { pedidos: Pedido[] }).pedidos); });
 }, [sesion]);

 const crear = async (e: React.FormEvent) => {
 e.preventDefault();
 const s = parseFloat(sacos);
 const l = lotes.find((x) => x.finca === finca);
 if (!l || isNaN(s) || s <= 0) { setOk("Selecciona lote y cantidad."); return; }
 const r = await api.pedidoCreate({ loteId: l.id, finca: l.finca, productor: l.productor, sacos: s, total: s * l.precioSaco });
 if (r.ok) {
 setOk(`Pedido enviado a ${l.productor}.`);
 reg("vendedor", "pedido", `Pedido a ${l.productor}: ${s} sacos × $${l.precioSaco}`, { cantidad: s, unidad: "sacos", monto: s * l.precioSaco });
 if (sesion) api.pedidosList("vendedor", sesion.id).then((r2) => { if (r2.ok && r2.data) setPedidos((r2.data as { pedidos: Pedido[] }).pedidos); });
 setSacos("5");
 } else setOk(r.error || "Error al crear pedido.");
 };

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Mis pedidos a productores</h2>
 <p className="mb-4 text-sm text-pizarra/70">Solicita café en verde a los productores de la Red.</p>
 <form onSubmit={crear} className="mb-6 rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Solicitar a productor</p>
 <div className="mt-3 grid gap-3 sm:grid-cols-3">
 <select value={finca} onChange={(e) => setFinca(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2">
 <option value="">Seleccionar finca…</option>
 {lotes.map((l) => (<option key={l.id} value={l.finca}>{l.finca} (${l.precioSaco}/saco)</option>))}
 </select>
 <input type="number" step="0.1" value={sacos} onChange={(e) => setSacos(e.target.value)} placeholder="Sacos" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <button className="rounded-full bg-cereza px-4 py-2.5 font-semibold text-crema hover:bg-cereza/90">Enviar pedido</button>
 </div>
 </form>
 {ok && <p className="mb-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
{pedidos.length === 0 ? (
  <EstadoVacio titulo="Sin pedidos aún" descripcion="Los pedidos que envíes a productores aparecerán aquí." />
  ) : (
  <div className="space-y-3">{pedidos.map((p) => (
  <div key={p.nro} className="rounded-2xl border border-cafe/10 bg-white p-5">
  <div className="flex flex-wrap items-center justify-between gap-2">
  <p className="font-semibold text-cafe">Pedido #{p.nro} — {p.finca}</p>
  <span className="rounded-full bg-latte/20 px-3 py-1 text-xs font-bold text-latte-texto">{p.estado}</span>
  </div>
  <p className="mt-1 text-sm text-pizarra/70">Productor: {p.productor} · {p.sacos} sacos · ${p.total.toFixed(0)} · {p.fecha}</p>
  {p.productor_id && (
  <Link href={`/chat?user=${encodeURIComponent(p.productor_id)}`} className="mt-3 inline-flex rounded-full bg-cereza px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cereza/90">
  Chat del pedido
  </Link>
  )}
  </div>
  ))}</div>
  )}
 </div>
 );
}

function VendedorCostos() {
 const [costos, setCostos] = useState<Costo[]>(leerBitacora("costos_vendedor", []));
 const [ok, setOk] = useState<string | null>(null);
 const [precioVenta, setPrecioVenta] = useState("300");
 const compras = leerBitacora<Compra[]>("compras", []);
 const tostados = leerBitacora<Tostado[]>("tostados", []);
 const [cFecha, setCFecha] = useState(new Date().toISOString().slice(0, 10));
 const [cConc, setCConc] = useState("");
 const [cMont, setCMont] = useState("");
 const [cCat, setCCat] = useState("Operación");

 const addC = (e: React.FormEvent) => {
 e.preventDefault();
 const m = parseFloat(cMont);
 if (!cConc.trim() || isNaN(m)) { setOk("Completa concepto y monto."); return; }
 const next = [...costos, { id: uid(), fecha: cFecha, concepto: cConc, monto: m, categoria: cCat }];
 guardarBitacora("costos_vendedor", next); setCostos(next);
 reg("vendedor", "costo", `${cConc} (${cCat})`, { monto: m });
 setCConc(""); setCMont(""); setOk("Costo registrado.");
 };

 const tostadoProd = tostados.reduce((a, t) => a + t.tostado, 0);
 const ingresoEst = tostadoProd * (parseFloat(precioVenta) || 0);
 const costoVerde = compras.reduce((a, c) => a + c.total, 0);
 const totalCostos = costos.reduce((a, c) => a + c.monto, 0);
 const margen = ingresoEst - costoVerde - totalCostos;

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Costos y proyección de margen</h2>
 <p className="mb-4 text-sm text-pizarra/70">Registra costos y proyecta el margen de tu tostado.</p>
 <div className="grid gap-4 sm:grid-cols-4">
 <div className="rounded-2xl border border-hoja/30 bg-hoja/10 p-4"><p className="text-xs text-pizarra/60">Tostado (sacos)</p><p className="text-2xl font-bold text-cafe">{tostadoProd.toFixed(0)}</p></div>
 <div className="rounded-2xl border border-latte/40 bg-latte/10 p-4"><p className="text-xs text-pizarra/60">Ingreso estimado</p><p className="text-2xl font-bold text-cafe">${ingresoEst.toFixed(0)}</p></div>
 <div className="rounded-2xl border border-cereza/30 bg-cereza/10 p-4"><p className="text-xs text-pizarra/60">Costos totales</p><p className="text-2xl font-bold text-cafe">${(costoVerde + totalCostos).toFixed(0)}</p></div>
 <div className="rounded-2xl border border-cafe/10 bg-white p-4"><p className="text-xs text-pizarra/60">Margen proyectado</p><p className="text-2xl font-bold text-cafe">${margen.toFixed(0)}</p></div>
 </div>
 <div className="mt-4 rounded-xl border border-cafe/10 bg-white p-4">
 <label className="text-xs font-semibold text-pizarra/60">Precio de venta por saco tostado ($)</label>
 <input type="number" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} className="mt-1 w-40 rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <form onSubmit={addC} className="mt-6 rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Registrar costo de operación</p>
 <div className="mt-3 grid gap-3 sm:grid-cols-4">
 <input type="date" value={cFecha} onChange={(e) => setCFecha(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={cConc} onChange={(e) => setCConc(e.target.value)} placeholder="Concepto" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.01" value={cMont} onChange={(e) => setCMont(e.target.value)} placeholder="Monto ($)" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <select value={cCat} onChange={(e) => setCCat(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2">
 <option>Operación</option><option>Mano de obra</option><option>Envase</option><option>Logística</option><option>Otros</option>
 </select>
 </div>
 <button className="mt-3 w-full rounded-full bg-cereza px-4 py-2.5 font-semibold text-crema hover:bg-cereza/90">Guardar costo</button>
 </form>
 {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 {costos.length > 0 && (
 <div className="mt-4 space-y-2">{costos.slice().reverse().map((c) => (
 <div key={c.id} className="rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <span className="font-semibold text-cafe">{c.concepto}</span> · ${c.monto.toFixed(0)} · {c.categoria}
 <span className="float-right text-pizarra/50">{c.fecha}</span>
 </div>))}</div>)}
 </div>
 );
}

/* ==================== COMPRADOR ==================== */

function CompradorPedidos() {
 const [pedidos, setPedidos] = useState<Pedido[]>([]);
 const [ok, setOk] = useState<string | null>(null);
 const [lotes, setLotes] = useState<Lote[]>([]);
 const [finca, setFinca] = useState("");
 const [sacos, setSacos] = useState("1");
 const sesion = getStoredSession();

 useEffect(() => {
 api.lotesList().then((r) => { if (r.ok && r.data) setLotes((r.data as { lotes: Lote[] }).lotes); });
 if (sesion) api.pedidosList("comprador", sesion.id).then((r) => { if (r.ok && r.data) setPedidos((r.data as { pedidos: Pedido[] }).pedidos); });
 }, [sesion]);

 const crear = async (e: React.FormEvent) => {
 e.preventDefault();
 const s = parseFloat(sacos);
 const l = lotes.find((x) => x.finca === finca);
 if (!l || isNaN(s) || s <= 0) { setOk("Selecciona un lote y cantidad."); return; }
 const r = await api.pedidoCreate({ loteId: l.id, finca: l.finca, productor: l.productor, sacos: s, total: s * l.precioSaco });
 if (r.ok) {
 setOk(`Pedido #${(r.data as { pedido: Pedido }).pedido.nro} creado. El productor lo recibe en su bandeja.`);
 reg("comprador", "pedido", `Pedido a ${l.finca}: ${s} sacos × $${l.precioSaco}`, { cantidad: s, unidad: "sacos", monto: s * l.precioSaco });
 if (sesion) api.pedidosList("comprador", sesion.id).then((r2) => { if (r2.ok && r2.data) setPedidos((r2.data as { pedidos: Pedido[] }).pedidos); });
 setSacos("1");
 } else setOk(r.error || "Error al crear pedido.");
 };

 const confirmar = async (nro: number) => {
 const r = await api.pedidoConfirmRecepcion(nro);
 if (r.ok) {
 setPedidos((prev) => prev.map((p) => p.nro === nro ? { ...p, estado: "Entregado" } : p));
 setOk(`Pedido #${nro} confirmado. Entrega completa.`);
 reg("comprador", "pedido", `Confirmación de recepción pedido #${nro}`, { });
 }
 };

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Mis pedidos</h2>
 <p className="mb-4 text-sm text-pizarra/70">Crea pedidos y sigue su avance hasta la entrega.</p>
 <form onSubmit={crear} className="mb-6 rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Nuevo pedido</p>
 <div className="mt-3 grid gap-3 sm:grid-cols-3">
 <select value={finca} onChange={(e) => setFinca(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2">
 <option value="">Seleccionar finca…</option>
 {lotes.map((l) => (<option key={l.id} value={l.finca}>{l.finca} (${l.precioSaco}/saco)</option>))}
 </select>
 <input type="number" step="0.1" value={sacos} onChange={(e) => setSacos(e.target.value)} placeholder="Sacos" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <button className="rounded-full bg-cereza px-4 py-2.5 font-semibold text-crema hover:bg-cereza/90">Crear pedido</button>
 </div>
 </form>
 {ok && <p className="mb-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 {pedidos.length === 0 ? (
 <EstadoVacio
 titulo="Aún no has hecho pedidos"
 descripcion="Cuando hagas un pedido, aparecerá en esta sección."
 cta="Explorar Marketplace"
 href="/marketplace"
 />
 ) : (
 <div className="space-y-3">{pedidos.map((p) => (
 <div key={p.nro} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="font-semibold text-cafe">Pedido #{p.nro} — {p.finca}</p>
 <span className="rounded-full bg-latte/20 px-3 py-1 text-xs font-bold text-latte-texto">{p.estado}</span>
 </div>
 <p className="mt-1 text-sm text-pizarra/70">{p.fecha} · {p.sacos} sacos · ${p.total.toFixed(0)}</p>
 <div className="mt-3 flex gap-2">
 {p.estado !== "Entregado" && (
 <button onClick={() => confirmar(p.nro)} className="rounded-full bg-hoja px-4 py-1.5 text-xs font-semibold text-crema hover:bg-hoja/90">
 Confirmar recepción
 </button>
 )}
 {p.productor_id && (
 <Link href={`/chat?user=${encodeURIComponent(p.productor_id)}`} className="rounded-full bg-cereza px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cereza/90">
 Chat del pedido
 </Link>
 )}
 <a href={waLink(`Hola, quiero confirmar la entrega del pedido #${p.nro}.`)} target="_blank" rel="noreferrer"
 className="rounded-full border border-hoja px-4 py-1.5 text-xs font-semibold text-hoja">Coordinar entrega</a>
 </div>
 </div>
 ))}</div>
 )}
 </div>
 );
}

function CompradorProveedores() {
 const [fav, setFav] = useState<string[]>(leerBitacora("favoritos", []));
 const [lotes, setLotes] = useState<Lote[]>([]);

 useEffect(() => {
 api.lotesList().then((r) => { if (r.ok && r.data) setLotes((r.data as { lotes: Lote[] }).lotes); });
 }, []);

 const toggle = (id: string) => {
 const next = fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id];
 guardarBitacora("favoritos", next); setFav(next);
 };
 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Mis proveedores / fincas</h2>
 <p className="mb-4 text-sm text-pizarra/70">Guarda tus fincas favoritas para comprarles directo.</p>
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {lotes.map((l) => {
 const sel = fav.includes(l.id);
 return (
 <div key={l.id} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="flex items-center justify-between">
 <p className="font-titulo text-lg font-bold text-cafe">{l.finca}</p>
 <span className="rounded-full bg-latte/20 px-2 py-0.5 text-xs font-bold text-latte-texto">{l.score} pts</span>
 </div>
 <p className="text-sm text-pizarra/60">{l.provincia} · {l.variedad} · {l.productor}</p>
 <p className="mt-1 text-xs text-pizarra/50">{l.certificacion} · ${l.precioSaco}/saco</p>
 <div className="mt-3 flex gap-2">
 <button onClick={() => toggle(l.id)} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${sel ? "bg-hoja text-crema hover:bg-hoja/90" : "border border-cafe/20 text-cafe hover:bg-cafe hover:text-crema"}`}>
 {sel ? "Guardada" : "Guardar"}
 </button>
 <Link href={`/marketplace/${l.id}`} className="rounded-full border border-cereza px-4 py-1.5 text-xs font-semibold text-cereza hover:bg-cereza/10">Ver lote</Link>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}

/* ==================== BAR ==================== */

function BarMenu() {
 const [menu, setMenu] = useState<MenuItem[]>([]);
 const [ok, setOk] = useState<string | null>(null);
 const [nombre, setNombre] = useState("");
 const [desc, setDesc] = useState("");
 const [precio, setPrecio] = useState("");
 const [cat, setCat] = useState("Café");
 const [confEliminar, setConfEliminar] = useState<MenuItem | null>(null);
 const sesion = getStoredSession();

 const cargar = () => {
 if (!sesion) return;
 api.menuList(sesion.id).then((r) => { if (r.ok && r.data) setMenu((r.data as { menu: MenuItem[] }).menu); });
 };

 useEffect(() => { cargar(); }, [sesion]);

 const agregar = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!nombre.trim() || !precio.trim()) { setOk("Nombre y precio requeridos."); return; }
 const r = await api.menuAdd({ nombre, descripcion: desc, precio: parseFloat(precio), categoria: cat });
 if (r.ok) {
 setOk("Producto agregado al menú.");
 reg("bar", "menu", `${cat}: ${nombre} — $${precio}`, { monto: parseFloat(precio) });
 setNombre(""); setDesc(""); setPrecio("");
 cargar();
 } else setOk(r.error || "Error al agregar.");
 };

 const eliminar = async (id: string) => {
 await api.menuDelete(id);
 setConfEliminar(null);
 cargar();
 };

 const cats = [...new Set(menu.map((m) => m.categoria))];

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Gestión de menú</h2>
 <p className="mb-4 text-sm text-pizarra/70">Agrega y administra los productos de tu bar.</p>
 <form onSubmit={agregar} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="grid gap-3 sm:grid-cols-4">
 <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del producto" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio ($)" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2">
 <option>Café</option><option>Bebida</option><option>Comida</option><option>Postre</option><option>Otro</option>
 </select>
 </div>
 <button className="mt-3 w-full rounded-full bg-cereza px-4 py-2.5 font-semibold text-crema hover:bg-cereza/90">Agregar al menú</button>
 </form>
 {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 {cats.map((c) => (
 <div key={c} className="mt-6">
 <p className="mb-2 font-semibold text-cafe">{c}</p>
 <div className="space-y-2">
 {menu.filter((m) => m.categoria === c).map((m) => (
 <div key={m.id} className="flex items-center justify-between rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <div>
 <span className="font-semibold text-cafe">{m.nombre}</span>
 {m.descripcion && <span className="ml-2 text-pizarra/60">— {m.descripcion}</span>}
 <span className="ml-2 font-bold text-cafe">${m.precio.toFixed(2)}</span>
 </div>
 <button onClick={() => setConfEliminar(m)} className="min-h-9 rounded border border-cereza/30 px-3 py-1.5 text-xs font-semibold text-cereza hover:bg-cereza/10">Eliminar</button>
 </div>
 ))}
 </div>
 </div>
 ))}
 {menu.length === 0 && <p className="mt-4 rounded-xl border border-cafe/10 bg-white p-4 text-sm text-pizarra/60">Sin productos en el menú.</p>}
 <Modal
 abierto={confEliminar !== null}
 onCerrar={() => setConfEliminar(null)}
 titulo="Eliminar producto del menú"
 descripcion={confEliminar ? `¿Eliminar «${confEliminar.nombre}» del menú? Esta acción no se puede deshacer.` : undefined}
 pie={<>
 <button className="btn-ghost" onClick={() => setConfEliminar(null)}>Cancelar</button>
 <button className="btn-primary" onClick={() => confEliminar && eliminar(confEliminar.id)}>Eliminar</button>
 </>}
 />
 </div>
 );
}

function BarPedidos() {
 const [pedidos, setPedidos] = useState<Pedido[]>([]);
 const [ok, setOk] = useState<string | null>(null);
 const [lotes, setLotes] = useState<Lote[]>([]);
 const [finca, setFinca] = useState("");
 const [sacos, setSacos] = useState("1");
 const sesion = getStoredSession();

 useEffect(() => {
 api.lotesList().then((r) => { if (r.ok && r.data) setLotes((r.data as { lotes: Lote[] }).lotes); });
 if (sesion) api.pedidosList("bar", sesion.id).then((r) => { if (r.ok && r.data) setPedidos((r.data as { pedidos: Pedido[] }).pedidos); });
 }, [sesion]);

 const crear = async (e: React.FormEvent) => {
 e.preventDefault();
 const s = parseFloat(sacos);
 const l = lotes.find((x) => x.finca === finca);
 if (!l || isNaN(s) || s <= 0) { setOk("Selecciona lote y cantidad."); return; }
 const r = await api.pedidoCreate({ loteId: l.id, finca: l.finca, productor: l.productor, sacos: s, total: s * l.precioSaco });
 if (r.ok) {
 setOk("Pedido enviado al productor.");
 reg("bar", "pedido", `Pedido a ${l.productor}: ${s} sacos × $${l.precioSaco}`, { cantidad: s, unidad: "sacos", monto: s * l.precioSaco });
 if (sesion) api.pedidosList("bar", sesion.id).then((r2) => { if (r2.ok && r2.data) setPedidos((r2.data as { pedidos: Pedido[] }).pedidos); });
 setSacos("1");
 } else setOk(r.error || "Error al crear pedido.");
 };

 const avanzar = async (nro: number) => {
 const r = await api.pedidoAdvance(nro);
 if (r.ok) {
 setPedidos((prev) => prev.map((p) => p.nro === nro ? { ...p, estado: ESTADOS[Math.min(ESTADOS.indexOf(p.estado) + 1, ESTADOS.length - 1)] } : p));
 setOk(`Pedido #${nro} avanzado.`);
 reg("bar", "pedido", `Avance de estado pedido #${nro}`, { });
 }
 };

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Pedidos del bar</h2>
 <p className="mb-4 text-sm text-pizarra/70">Realiza pedidos de café a los productores de la Red.</p>
 <form onSubmit={crear} className="mb-6 rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Nuevo pedido</p>
 <div className="mt-3 grid gap-3 sm:grid-cols-3">
 <select value={finca} onChange={(e) => setFinca(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2">
 <option value="">Seleccionar finca…</option>
 {lotes.map((l) => (<option key={l.id} value={l.finca}>{l.finca} (${l.precioSaco}/saco)</option>))}
 </select>
 <input type="number" step="0.1" value={sacos} onChange={(e) => setSacos(e.target.value)} placeholder="Sacos" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <button className="rounded-full bg-cereza px-4 py-2.5 font-semibold text-crema hover:bg-cereza/90">Enviar pedido</button>
 </div>
 </form>
 {ok && <p className="mb-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 {pedidos.length === 0 ? (
 <EstadoVacio titulo="Sin pedidos aún" descripcion="Cuando completes un pedido, aparecerá aquí." />
 ) : (
 <div className="space-y-3">{pedidos.map((p) => (
 <div key={p.nro} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="font-semibold text-cafe">Pedido #{p.nro} — {p.finca}</p>
 <span className="rounded-full bg-latte/20 px-3 py-1 text-xs font-bold text-latte-texto">{p.estado}</span>
 </div>
 <p className="mt-1 text-sm text-pizarra/70">Productor: {p.productor} · {p.sacos} sacos · ${p.total.toFixed(0)} · {p.fecha}</p>
 {p.productor_id && (
 <Link href={`/chat?user=${encodeURIComponent(p.productor_id)}`} className="mt-3 inline-flex rounded-full bg-cereza px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cereza/90">
 Chat del pedido
 </Link>
 )}
 {p.estado !== "Entregado" && (
 <button onClick={() => avanzar(p.nro)} className="mt-2 rounded-full bg-cafe px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cafe/90">Avanzar estado</button>
 )}
 </div>
 ))}</div>
 )}
 </div>
 );
}

/* ==================== BARISTA ==================== */

function BaristaMenu() {
 const [menu, setMenu] = useState<MenuItem[]>([]);
 const [barName, setBarName] = useState("");
 const sesion = getStoredSession();

 useEffect(() => {
 if (!sesion) return;
 // El barista ve el menú de su bar asignado (en MVP, busca el primer bar registrado)
 api.membersAll().then((r) => {
 if (r.ok && r.data) {
 const members = (r.data as { members: ApiUser[] }).members;
 const bar = members.find((m) => m.rol === "bar");
 if (bar) {
 setBarName(bar.nombre);
 api.menuList(bar.id).then((r2) => {
 if (r2.ok && r2.data) setMenu((r2.data as { menu: MenuItem[] }).menu);
 });
 }
 }
 });
 }, [sesion]);

 const cats = [...new Set(menu.map((m) => m.categoria))];

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Menú del día</h2>
 <p className="mb-4 text-sm text-pizarra/70">{barName ? `Menú de ${barName}` : "Productos disponibles para preparar."}</p>
 {cats.length === 0 ? (
<EstadoVacio titulo="Sin productos en el menú" descripcion="El administrador del bar debe agregar productos para que aparezcan aquí." />
  ) : (
 cats.map((c) => (
 <div key={c} className="mt-4">
 <p className="mb-2 font-semibold text-cafe">{c}</p>
 <div className="space-y-2">
 {menu.filter((m) => m.categoria === c).map((m) => (
 <div key={m.id} className="flex items-center justify-between rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <div>
 <span className="font-semibold text-cafe">{m.nombre}</span>
 {m.descripcion && <span className="ml-2 text-pizarra/60">— {m.descripcion}</span>}
 </div>
 <span className="font-bold text-cafe">${m.precio.toFixed(2)}</span>
 </div>
 ))}
 </div>
 </div>
 ))
 )}
 </div>
 );
}

function BaristaTurnos() {
 const [turnos, setTurnos] = useState<Turno[]>(leerBitacora("turnos_barista", []));
 const [ok, setOk] = useState<string | null>(null);
 const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
 const [horas, setHoras] = useState("");
 const [notas, setNotas] = useState("");

 const agregar = (e: React.FormEvent) => {
 e.preventDefault();
 const h = parseFloat(horas);
 if (isNaN(h) || h <= 0) { setOk("Ingresa las horas trabajadas."); return; }
 const next = [...turnos, { id: uid(), fecha, horas: h, notas }];
 guardarBitacora("turnos_barista", next); setTurnos(next);
 reg("barista", "turno", `Turno de ${h}h${notas ? ` — ${notas}` : ""}`, { cantidad: h, unidad: "horas" });
 setHoras(""); setNotas(""); setOk("Turno registrado.");
 };

 const totalHoras = turnos.reduce((a, t) => a + t.horas, 0);

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Mis turnos</h2>
 <p className="mb-4 text-sm text-pizarra/70">Registra tus horas trabajadas.</p>
 <div className="rounded-2xl border border-hoja/30 bg-hoja/10 p-4 mb-4">
 <p className="text-xs text-pizarra/60">Total horas registradas</p>
 <p className="text-2xl font-bold text-cafe">{totalHoras.toFixed(1)} h</p>
 </div>
 <form onSubmit={agregar} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="grid gap-3 sm:grid-cols-3">
 <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.5" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="Horas" className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (opcional)" className="rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <button className="mt-3 w-full rounded-full bg-cereza px-4 py-2.5 font-semibold text-crema hover:bg-cereza/90">Registrar turno</button>
 </form>
 {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 {turnos.length > 0 && (
 <div className="mt-4 space-y-2">{turnos.slice().reverse().map((t) => (
 <div key={t.id} className="rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <span className="font-semibold text-cafe">{t.horas}h</span>
 {t.notas && <span className="ml-2 text-pizarra/60">— {t.notas}</span>}
 <span className="float-right text-pizarra/50">{t.fecha}</span>
 </div>))}</div>
 )}
 </div>
 );
}

/* ==================== BITÁCORA UNIFICADA ==================== */

function BitacoraPanel({ rol }: { rol: Rol }) {
 const tiposPorPerfil: Record<Rol, TipoRegistro[]> = {
 productor: ["produccion", "venta", "siembra", "limpieza", "costo", "lote", "pedido", "nota"],
 vendedor: ["compra", "tostado", "costo", "pedido", "nota"],
 comprador: ["pedido", "compra", "nota"],
 bar: ["menu", "pedido", "costo", "nota"],
 barista: ["turno", "asistencia", "capacitacion", "nota"],
 certificador: ["nota", "otro"],
 proveedor: ["pedido", "nota", "otro"],
amante: ["compra", "pedido", "nota"],
  asesor: ["nota", "pedido", "otro"],
  transportista: ["nota", "otro"],
 pilador: ["nota", "otro"],
 exportador: ["nota", "otro"],
 admin: ["nota"],
 };
 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Bitácora unificada</h2>
 <p className="mb-4 text-sm text-pizarra/70">
 Registro consolidado de todas las actividades de tu negocio. Filtra por tipo, fecha o búsqueda.
 Exporta a CSV para tus registros contables o presentación al contador.
 </p>
 <BitacoraRegistros
 perfil={rol as Exclude<Rol, "admin">}
 tiposVisibles={tiposPorPerfil[rol]}
 titulo="Mis registros"
 />
 </div>
 );
}

/* ==================== VALORAR MIEMBROS ==================== */

interface RatingItem {
 id: string;
 rated_id: string;
 rater_nombre: string;
 is_admin: boolean;
 tipo?: "miembro" | "calidad_cafe" | "servicio" | "cafeteria";
 score: number;
 comentario: string;
 ts: string;
 pedido_nro?: number | null;
}

const TIPOS_VALORACION = [
 { id: "calidad_cafe", label: "Calidad de café" },
 { id: "servicio", label: "Servicio" },
 { id: "cafeteria", label: "Cafetería" },
 { id: "miembro", label: "Relación comercial" },
] as const;

function ValorarPanel() {
 const sesion = getStoredSession();
 const [pedidos, setPedidos] = useState<Pedido[]>([]);
 const [members, setMembers] = useState<ApiUser[]>([]);
 const [ratings, setRatings] = useState<RatingItem[]>([]);
 const [targetId, setTargetId] = useState<string>("");
 const [score, setScore] = useState(5);
 const [tipo, setTipo] = useState<(typeof TIPOS_VALORACION)[number]["id"]>("calidad_cafe");
 const [comentario, setComentario] = useState("");
 const [pedidoNro, setPedidoNro] = useState<number | null>(null);
 const [ok, setOk] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);

 const cargar = async () => {
 if (!sesion) return;
 const [pRes, mRes] = await Promise.all([
 api.pedidosList(sesion.rol, sesion.id),
 api.membersList(),
 ]);
 if (pRes.ok && pRes.data) setPedidos((pRes.data as { pedidos: Pedido[] }).pedidos);
 if (mRes.ok && mRes.data) setMembers((mRes.data as { members: ApiUser[] }).members);

 // Cargar mis valoraciones
 try {
 const rr = await fetch(CONFIG.api(`/api/ratings.php?action=promedio&id=${encodeURIComponent(sesion.id)}`), { credentials: "include" });
 const j = await rr.json();
 if (j?.ok) setRatings(j.data.lista ?? []);
 } catch { /* noop */ }
 };

 useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [sesion?.id]);

 // Candidatos: miembros con los que tuve pedidos (productor del lote, vendedor, comprador)
 const candidatos = (() => {
 if (!sesion) return [] as ApiUser[];
 const ids = new Set<string>();
 for (const p of pedidos) {
 if ((p.solicitante_id ?? "") === sesion.id) {
 // yo compré/barré → puedo valorar al productor
 const prod = members.find((m) => m.nombre === p.productor);
 if (prod) ids.add(prod.id);
 } else {
 // soy el receptor (productor) → puedo valorar al solicitante
 ids.add(p.solicitante_id);
 }
 }
 return members.filter((m) => ids.has(m.id) && m.id !== sesion.id);
 })();

 const enviar = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!targetId || !sesion) return;
 setLoading(true);
 const r = await api.ratingCreate(targetId, score, comentario, pedidoNro, tipo);
 setLoading(false);
 if (r.ok) {
 setOk("Valoración enviada. Gracias por ayudar a medir calidad y confianza en la Red.");
 setTargetId(""); setScore(5); setTipo("calidad_cafe"); setComentario(""); setPedidoNro(null);
 cargar();
 } else {
 setOk(` ${r.error ?? "Error al enviar"}`);
 }
 };

 if (!sesion) return null;

 return (
 <div>
 <h2 className="mb-1 text-lg font-semibold text-cafe">Valorar a otros miembros</h2>
 <p className="mb-4 text-sm text-pizarra/70">
 Califica calidad de café, servicios, cafeterías o la relación comercial con
 miembros con los que hayas tenido un pedido.
 </p>

 <div className="grid gap-6 lg:grid-cols-2">
 <form onSubmit={enviar} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Nueva valoración</p>
 {candidatos.length === 0 ? (
 <p className="mt-3 rounded-xl bg-crema/60 p-3 text-sm text-pizarra/70">
 Aún no tienes pedidos con otros miembros. Cuando completes un pedido,
 podrás valorarlos aquí.
 </p>
 ) : (
 <div className="mt-3 space-y-3">
 <div>
 <label className="text-xs font-semibold text-pizarra/60">¿A quién valoras?</label>
 <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" required>
 <option value="">Seleccionar miembro…</option>
 {candidatos.map((m) => (
 <option key={m.id} value={m.id}>
 {m.nombre} ({m.rol})
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs font-semibold text-pizarra/60">¿Qué estás calificando?</label>
 <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" required>
 {TIPOS_VALORACION.map((t) => (
 <option key={t.id} value={t.id}>{t.label}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs font-semibold text-pizarra/60">Pedido (opcional)</label>
 <select value={pedidoNro ?? ""} onChange={(e) => setPedidoNro(e.target.value ? parseInt(e.target.value) : null)} className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2">
 <option value="">Sin pedido específico</option>
 {pedidos
 .filter((p) => candidatos.find((c) => c.id === targetId && (c.nombre === p.productor || p.solicitante_id === c.id)))
 .map((p) => (
 <option key={p.nro} value={p.nro}>#{p.nro} — {p.finca}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs font-semibold text-pizarra/60">Puntuación</label>
 <div className="mt-2 flex gap-1">
 {[1, 2, 3, 4, 5].map((n) => (
 <button
 key={n}
 type="button"
 onClick={() => setScore(n)}
 aria-label={`Puntuación: ${n} de 5`}
 aria-pressed={n <= score}
 className={`min-h-11 min-w-11 text-3xl ${n <= score ? "text-latte" : "text-pizarra/20"} hover:text-latte`}
 >

 </button>
 ))}
 </div>
 </div>
 <div>
 <label className="text-xs font-semibold text-pizarra/60">Comentario (opcional)</label>
 <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} maxLength={500} placeholder="¿Qué destacarías?" className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 <p className="mt-1 text-right text-[10px] text-pizarra/50">{comentario.length}/500</p>
 </div>
 <button type="submit" disabled={loading || !targetId} className="w-full rounded-full bg-latte px-4 py-2.5 font-semibold text-pizarra hover:bg-latte/90 disabled:opacity-60">
 {loading ? "Enviando…" : "Enviar valoración"}
 </button>
 {ok && <p className="rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
 </div>
 )}
 </form>

 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Valoraciones que has recibido</p>
{ratings.length === 0 ? (
  <EstadoVacio titulo="Aún no has recibido valoraciones" descripcion="Sé activo en la Red para que otros te valoren." />
  ) : (
 <div className="mt-3 space-y-2">
 {ratings.map((r) => (
 <div key={r.id} className="rounded-xl border border-cafe/10 p-3 text-sm">
 <div className="flex items-center justify-between">
 <p className="font-semibold text-cafe">{r.rater_nombre}{r.is_admin ? " (Red)" : ""}</p>
 <p className="text-latte-texto">{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</p>
 </div>
 {r.comentario && <p className="mt-1 text-xs text-pizarra/70">"{r.comentario}"</p>}
 <p className="mt-1 text-[10px] text-pizarra/50">{new Date(r.ts).toLocaleString("es-EC")}</p>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

/* ==================== ROLES DE CADENA DE VALOR ==================== */

interface Flete { id: string; fecha: string; origen: string; destino: string; sacos: number; estado: string }
interface Pilado { id: string; fecha: string; cliente: string; quintales: number; merma: number }
interface Envio { id: string; fecha: string; destino: string; sacos: number; puerto: string }

/* Transportista: fletes de café */
function TransportistaFletes() {
 const [fletes, setFletes] = useState<Flete[]>(() => leerBitacora<Flete[]>("fletes", []));
 const [f, setF] = useState({ origen: "", destino: "", sacos: 10 });
 const registrar = (e: React.FormEvent) => {
 e.preventDefault();
 if (!f.origen.trim() || !f.destino.trim()) return;
 const nuevo: Flete = { id: uid(), fecha: new Date().toISOString().slice(0, 10), ...f, estado: "En tránsito" };
 const lista = [...fletes, nuevo];
 setFletes(lista);
 guardarBitacora("fletes", lista);
 setF({ origen: "", destino: "", sacos: 10 });
 };
 return (
 <div>
 <p className="mb-3 text-lg font-semibold text-cafe"> Mis fletes</p>
 <form onSubmit={registrar} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="grid gap-3 sm:grid-cols-3">
 <input placeholder="Origen (finca/ciudad)" value={f.origen} onChange={(e) => setF({ ...f, origen: e.target.value })} className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input placeholder="Destino" value={f.destino} onChange={(e) => setF({ ...f, destino: e.target.value })} className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" placeholder="Sacos" value={f.sacos} onChange={(e) => setF({ ...f, sacos: Number(e.target.value) })} className="rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <button className="mt-3 rounded-full bg-cereza px-5 py-2 text-sm font-semibold text-crema hover:bg-cereza/90">Registrar flete</button>
 </form>
{fletes.length === 0 ? (
  <div className="mt-4">
  <EstadoVacio titulo="Aún no registras fletes" descripcion="Cuando un miembro solicite transporte desde la Red, aquí verás tus rutas." />
  </div>
  ) : (
 <div className="mt-4 space-y-2">
 {fletes.map((x) => (
 <div key={x.id} className="rounded-2xl border border-cafe/10 bg-white p-4">
 <p className="font-semibold text-cafe">{x.origen} → {x.destino}</p>
 <p className="text-xs text-pizarra/60">{x.fecha} · {x.sacos} sacos · <b>{x.estado}</b></p>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}

/* Pilador: procesamiento pergamino → oro */
function PiladorPilado() {
 const [pilados, setPilados] = useState<Pilado[]>(() => leerBitacora<Pilado[]>("pilados", []));
 const [p, setP] = useState({ cliente: "", quintales: 5, merma: 2 });
 const registrar = (e: React.FormEvent) => {
 e.preventDefault();
 if (!p.cliente.trim()) return;
 const nuevo: Pilado = { id: uid(), fecha: new Date().toISOString().slice(0, 10), ...p };
 const lista = [...pilados, nuevo];
 setPilados(lista);
 guardarBitacora("pilados", lista);
 setP({ cliente: "", quintales: 5, merma: 2 });
 };
 return (
 <div>
 <p className="mb-3 text-lg font-semibold text-cafe"> Mis pilados</p>
 <form onSubmit={registrar} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="grid gap-3 sm:grid-cols-3">
 <input placeholder="Cliente / finca" value={p.cliente} onChange={(e) => setP({ ...p, cliente: e.target.value })} className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" placeholder="Quintales" value={p.quintales} onChange={(e) => setP({ ...p, quintales: Number(e.target.value) })} className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" placeholder="Merma (%)" value={p.merma} onChange={(e) => setP({ ...p, merma: Number(e.target.value) })} className="rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <button className="mt-3 rounded-full bg-cereza px-5 py-2 text-sm font-semibold text-crema hover:bg-cereza/90">Registrar pilado</button>
 </form>
{pilados.length === 0 ? (
  <div className="mt-4">
  <EstadoVacio titulo="Aún no registras procesamientos" descripcion="Cuando un productor solicite pilado desde la Red, aquí verás los lotes." />
  </div>
  ) : (
 <div className="mt-4 space-y-2">
 {pilados.map((x) => (
 <div key={x.id} className="rounded-2xl border border-cafe/10 bg-white p-4">
 <p className="font-semibold text-cafe">{x.cliente}</p>
 <p className="text-xs text-pizarra/60">{x.fecha} · {x.quintales} qq · merma {x.merma}%</p>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}

/* Exportador: envíos internacionales */
function ExportadorEnvios() {
 const [envios, setEnvios] = useState<Envio[]>(() => leerBitacora<Envio[]>("envios", []));
 const [e, setE] = useState({ destino: "", sacos: 100, puerto: "" });
 const registrar = (e2: React.FormEvent) => {
 e2.preventDefault();
 if (!e.destino.trim() || !e.puerto.trim()) return;
 const nuevo: Envio = { id: uid(), fecha: new Date().toISOString().slice(0, 10), ...e };
 const lista = [...envios, nuevo];
 setEnvios(lista);
 guardarBitacora("envios", lista);
 setE({ destino: "", sacos: 100, puerto: "" });
 };
 return (
 <div>
 <p className="mb-3 text-lg font-semibold text-cafe"> Mis envíos internacionales</p>
 <form onSubmit={registrar} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="grid gap-3 sm:grid-cols-3">
 <input placeholder="País / destino" value={e.destino} onChange={(e2) => setE({ ...e, destino: e2.target.value })} className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input placeholder="Puerto de salida" value={e.puerto} onChange={(e2) => setE({ ...e, puerto: e2.target.value })} className="rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" placeholder="Sacos" value={e.sacos} onChange={(e2) => setE({ ...e, sacos: Number(e2.target.value) })} className="rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <button className="mt-3 rounded-full bg-cereza px-5 py-2 text-sm font-semibold text-crema hover:bg-cereza/90">Registrar envío</button>
 </form>
{envios.length === 0 ? (
  <div className="mt-4">
  <EstadoVacio titulo="Aún no registras envíos" descripcion="Cuando prepares una exportación, aquí llevarás el control de sacos y puertos." />
  </div>
  ) : (
 <div className="mt-4 space-y-2">
 {envios.map((x) => (
 <div key={x.id} className="rounded-2xl border border-cafe/10 bg-white p-4">
 <p className="font-semibold text-cafe">{x.destino} ({x.puerto})</p>
 <p className="text-xs text-pizarra/60">{x.fecha} · {x.sacos} sacos</p>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}

/* ==================== CERTIFICADOS ==================== */

/* Bandeja de certificación (rol certificador): revisa solicitudes y emite/rechaza. */
function BandejaCertificacion({ sesion }: { sesion: ApiUser }) {
 const [certs, setCerts] = useState<Certificado[]>([]);
 const [seleccion, setSeleccion] = useState<Certificado | null>(null);
 const [notas, setNotas] = useState("");

 useEffect(() => {
 setCerts(leerCertificados().filter((c) => c.estado === "pendiente" || c.estado === "en_revision"));
 }, []);

 const emitir = (c: Certificado) => {
 setCerts(emitirCertificado(c.id, sesion.nombre, "Verificador de la Red", notas || undefined));
 setSeleccion(null);
 setNotas("");
 };
 const rechazar = (c: Certificado) => {
 setCerts(rechazarCertificado(c.id, notas || "No cumple los criterios"));
 setSeleccion(null);
 setNotas("");
 };

 if (certs.length === 0) {
 return (
<div className="rounded-2xl border border-cafe/10 bg-white p-6">
  <p className="text-lg font-semibold text-cafe"> Bandeja de certificación</p>
  <div className="mt-2">
  <EstadoVacio
  titulo="No hay solicitudes pendientes"
  descripcion="Cuando un productor solicite un dossier EUDR, catación o verificación, aparecerá aquí para que lo audites y emitas el certificado."
  />
  </div>
  </div>
  );
  }

 return (
 <div>
 <p className="mb-3 text-lg font-semibold text-cafe"> Solicitudes de certificación</p>
 <div className="space-y-3">
 {certs.map((c) => {
 const st = etiquetaEstado(c.estado);
 return (
 <div key={c.id} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="font-semibold text-cafe">{c.titulo} · {c.lote}</p>
 <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.clase}`}>{st.texto}</span>
 </div>
 <p className="mt-1 text-xs text-pizarra/60">
 Solicitante: {c.solicitante} ({c.email}) · {c.finca}, {c.provincia}
 </p>
 {Object.entries(c.datos).map(([k, v]) => (
 <p key={k} className="mt-0.5 text-sm text-pizarra/70">
 <b>{k.replace(/([A-Z])/g, " $1").trim()}:</b> {v}
 </p>
 ))}
 <button
 onClick={() => setSeleccion(c)}
 className="mt-3 rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema"
 >
 Auditar y resolver
 </button>
 </div>
 );
 })}
 </div>

 {seleccion && (
 <div className="mt-6 rounded-2xl border-2 border-cereza/50 bg-white p-6">
 <p className="font-titulo text-lg font-bold text-cafe">Resolver solicitud {seleccion.numero}</p>
 <p className="mt-1 text-sm text-pizarra/70">{seleccion.titulo} · {seleccion.lote} · {seleccion.finca}</p>
 <textarea
 value={notas}
 onChange={(e) => setNotas(e.target.value)}
 placeholder="Notas de auditoría (opcional)"
 className="mt-3 w-full rounded-lg border border-cafe/20 px-3 py-2"
 rows={3}
 />
 <div className="mt-3 flex flex-wrap gap-2">
 <button onClick={() => emitir(seleccion)} className="rounded-full bg-hoja px-5 py-2 text-sm font-semibold text-crema hover:bg-hoja/90">
 Emitir certificado
 </button>
 <button onClick={() => rechazar(seleccion)} className="rounded-full bg-cereza px-5 py-2 text-sm font-semibold text-crema hover:bg-cereza/90">
 Rechazar
 </button>
 <button onClick={() => setSeleccion(null)} className="rounded-full border border-cafe/30 px-5 py-2 text-sm font-semibold text-cafe">
 Cancelar
 </button>
 </div>
 </div>
 )}
 </div>
 );
}

/* Catación SCA (rol certificador): puntúa lotes y emite certificado de catación. */
function CatacionSCA({ sesion }: { sesion: ApiUser }) {
 const [lotes, setLotes] = useState<Lote[]>(LOTES as unknown as Lote[]);
 const [lote, setLote] = useState<Lote>(LOTES[0] as unknown as Lote);
 const [score, setScore] = useState(86);
 const [notasCata, setNotasCata] = useState("Acidez brillante, dulzor persistente, cuerpo cremoso.");
 const [lista, setLista] = useState<Certificado[]>([]);
 const [ok, setOk] = useState<string | null>(null);

 useEffect(() => {
 setLista(leerCertificados().filter((c) => c.tipo === "catacion"));
 api.lotesList().then((r) => {
 if (r.ok && r.data) {
  const publicados = (r.data as { lotes: Lote[] }).lotes;
  if (publicados.length > 0) {
   setLotes(publicados);
   setLote(publicados[0]);
  }
 }
 });
 }, []);

 const emitirCata = () => {
 setOk(null);
 const dueno = lote.productor_id ?? lote.published_by ?? "";
 if (dueno !== "" && dueno === sesion.id) {
 setOk("Un certificador no puede emitir evaluaciones sobre lotes de su propia cuenta.");
 return;
 }
 const numero = `RC-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${new Date().getFullYear()}`;
 const c: Certificado = {
 id: Math.random().toString(36).slice(2, 10),
 numero,
 codigo: `RC-${Math.abs([...numero].reduce((h, ch) => (h << 5) - h + ch.charCodeAt(0), 0)).toString(16).toUpperCase().padStart(8, "0")}-EC`,
 tipo: "catacion",
 titulo: "Informe de Catación",
 finca: lote.finca,
 provincia: lote.provincia,
 lote: lote.id,
 solicitante: lote.productor,
 email: "",
 fechaSolicitud: new Date().toISOString(),
 fechaEmision: new Date().toISOString(),
 estado: "emitido",
 emisor: sesion.nombre,
 emisorCredencial: "Catador verificado de la Red",
 notas: notasCata,
 datos: {
 variedad: lote.variedad,
 proceso: lote.proceso,
 altura: `${lote.altura} msnm`,
 scoreSCA: `${score} / 100`,
 certificacion: lote.certificacion,
 },
 };
 const nueva = [...lista, c];
 guardarCertificados(nueva);
 setLista(nueva);
 setOk("Informe de catación emitido.");
 };

 return (
 <div>
 <p className="mb-3 text-lg font-semibold text-cafe"> Catación SCA</p>
 <div className="grid gap-4 lg:grid-cols-2">
 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <label className="text-sm font-semibold text-pizarra/60">Lote a catar</label>
 <select
 value={lote.id}
 onChange={(e) => setLote(lotes.find((l) => l.id === e.target.value) ?? lotes[0])}
 className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2"
 >
 {lotes.map((l) => (
 <option key={l.id} value={l.id}>{l.finca} — {l.variedad}</option>
 ))}
 </select>
 <label className="mt-3 block text-sm font-semibold text-pizarra/60">
 Score SCA (80+ = especialidad)
 <input type="range" min={70} max={95} value={score} onChange={(e) => setScore(Number(e.target.value))} className="mt-2 w-full accent-cereza" />
 </label>
 <p className="mt-1 text-center text-3xl font-bold text-cafe">{score}<span className="text-base text-pizarra/50">/100</span></p>
 <label className="mt-3 block text-sm font-semibold text-pizarra/60">
 Notas de cata
 <textarea value={notasCata} onChange={(e) => setNotasCata(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </label>
 <button onClick={emitirCata} className="mt-4 rounded-full bg-cereza px-6 py-3 font-semibold text-crema hover:bg-cereza/90">
 Emitir certificado de catación
 </button>
 {ok && <p className={`mt-3 rounded-xl p-3 text-sm font-semibold ${ok.startsWith("Un certificador") ? "bg-cereza/10 text-cereza" : "bg-hoja/10 text-hoja"}`}>{ok}</p>}
 </div>

 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-semibold text-cafe">Informes de catación emitidos</p>
{lista.length === 0 ? (
  <EstadoVacio titulo="Aún no has emitido informes de catación" descripcion="Cuando emitas tu primer informe aparecerá aquí." />
  ) : (
 <div className="mt-3 space-y-2">
 {lista.map((c) => (
 <div key={c.id} className="rounded-xl border border-hoja/30 bg-hoja/5 p-3">
 <p className="text-sm font-semibold text-cafe">{c.finca} · {c.lote}</p>
 <p className="text-xs text-pizarra/60">
 Score {c.datos.scoreSCA} · Emisor {c.emisor} · N.º {c.numero}
 </p>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

function Certificados() {
 const certificados = CURSOS.filter((c) => {
 const done = leerBitacora<number[]>(`curso_done_${c.id}`, []);
 return done.length === c.modulos.length;
 });
 const certificaciones = leerCertificados();
 return (
 <div>
 <p className="mb-3 text-lg font-semibold text-cafe">Tus certificados de la Academia</p>
 {certificados.length === 0 ? (
 <p className="rounded-2xl border border-cafe/10 bg-white p-5 text-sm text-pizarra/70">
 Completa un curso en la <Link className="font-semibold text-cereza underline" href="/academia">Academia</Link> para recibir tu certificado.
 </p>
 ) : (
 <div className="grid gap-4 sm:grid-cols-2">
 {certificados.map((c) => (
 <div key={c.id} className="rounded-2xl border border-latte/50 bg-latte/10 p-5">
 <span aria-hidden="true" className="block h-7 w-7 rounded-full border border-cereza/40"></span>
 <p className="mt-1 font-titulo text-lg font-bold text-cafe">{c.titulo}</p>
 <p className="text-sm text-pizarra/70">Certificado de la Red Café Ecuador · {c.duracion} · {c.nivel}</p>
 </div>
 ))}
 </div>
 )}

 <p className="mb-3 mt-8 text-lg font-semibold text-cafe">Certificaciones de la Red</p>
 {certificaciones.length === 0 ? (
 <p className="rounded-2xl border border-cafe/10 bg-white p-5 text-sm text-pizarra/70">
 Solicita la certificación de tus lotes en{" "}
 <Link className="font-semibold text-cereza underline" href="/servicios/eudr">Certificación y Trazabilidad</Link>.
 </p>
 ) : (
 <div className="space-y-3">
 {certificaciones.map((c) => {
 const st = etiquetaEstado(c.estado);
 return (
 <div key={c.id} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="font-semibold text-cafe">{c.titulo} · {c.lote}</p>
 <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.clase}`}>{st.texto}</span>
 </div>
 <p className="mt-1 text-xs text-pizarra/60">
 N.º {c.numero} · {c.finca} · Solicitado {formatearFecha(c.fechaSolicitud)}
 {c.estado === "emitido" && ` · Emisor: ${c.emisor} (${c.emisorCredencial})`}
 </p>
 {c.estado === "emitido" && c.fechaVencimiento && (
 <p className="mt-0.5 text-xs text-pizarra/50">Válido hasta {formatearFecha(c.fechaVencimiento)}</p>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}

/* ==================== MI CUENTA ==================== */

function MiCuenta({ sesion, onSesion }: { sesion: ApiUser; onSesion: (u: ApiUser) => void }) {
 const [nombreCuenta, setNombreCuenta] = useState(sesion.nombre ?? "");
 const [emailCuenta, setEmailCuenta] = useState(sesion.email ?? "");
 const [telefonoCuenta, setTelefonoCuenta] = useState(sesion.telefono ?? "");
 const [whatsappCuenta, setWhatsappCuenta] = useState(sesion.whatsapp ?? "");
 const [provinciaCuenta, setProvinciaCuenta] = useState(sesion.provincia ?? "");
 const [datosMsg, setDatosMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
 const [current, setCurrent] = useState("");
 const [newPass, setNewPass] = useState("");
 const [confirm, setConfirm] = useState("");
 const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
 const [rolesCuenta, setRolesCuenta] = useState<Exclude<Rol, "admin">[]>(rolesDeUsuario(sesion));
 const [rolesMsg, setRolesMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
 const [loading, setLoading] = useState(false);

 useEffect(() => {
 setNombreCuenta(sesion.nombre ?? "");
 setEmailCuenta(sesion.email ?? "");
 setTelefonoCuenta(sesion.telefono ?? "");
 setWhatsappCuenta(sesion.whatsapp ?? "");
 setProvinciaCuenta(sesion.provincia ?? "");
 setRolesCuenta(rolesDeUsuario(sesion));
 }, [sesion]);

 const guardarDatos = async (e: React.FormEvent) => {
 e.preventDefault();
 setDatosMsg(null);
 if (nombreCuenta.trim().length < 2) { setDatosMsg({ tipo: "err", texto: "Ingresa tu nombre o nombre comercial." }); return; }
 if (!emailCuenta.includes("@")) { setDatosMsg({ tipo: "err", texto: "Ingresa un correo válido." }); return; }
 setLoading(true);
 const r = await api.memberUpdate({
  nombre: nombreCuenta,
  email: emailCuenta,
  telefono: telefonoCuenta,
  whatsapp: whatsappCuenta,
  provincia: provinciaCuenta,
 });
 setLoading(false);
 if (r.ok && r.data) {
  const user = (r.data as { user: ApiUser }).user;
  setStoredSession(user);
  onSesion(user);
  setDatosMsg({ tipo: "ok", texto: "Datos de contacto actualizados." });
 } else {
  setDatosMsg({ tipo: "err", texto: r.error || "No se pudieron guardar los datos." });
 }
 };

 const guardarRoles = async (next: Exclude<Rol, "admin">[]) => {
 setRolesMsg(null);
 if (next.length < 1) { setRolesMsg({ tipo: "err", texto: "Debes mantener al menos un perfil." }); return; }
 if (next.length > 3) { setRolesMsg({ tipo: "err", texto: "Puedes tener máximo tres perfiles." }); return; }
 const r = await api.memberRolesUpdate(next, next[0]);
 if (r.ok && r.data) {
  const user = (r.data as { user: ApiUser }).user;
  setStoredSession(user);
  onSesion(user);
  setRolesCuenta(rolesDeUsuario(user));
  setRolesMsg({ tipo: "ok", texto: "Perfiles actualizados." });
 } else {
  setRolesMsg({ tipo: "err", texto: r.error || "No se pudieron actualizar los perfiles." });
 }
 };

 const togglePerfil = (perfil: Exclude<Rol, "admin">) => {
 if (rolesCuenta.includes(perfil)) {
  void guardarRoles(rolesCuenta.filter((r) => r !== perfil));
 } else {
  void guardarRoles([...rolesCuenta, perfil]);
 }
 };

 const principalPerfil = (perfil: Exclude<Rol, "admin">) => {
 void guardarRoles([perfil, ...rolesCuenta.filter((r) => r !== perfil)]);
 };

 const cambiar = async (e: React.FormEvent) => {
 e.preventDefault();
 setMsg(null);
 if (newPass.length < 6) { setMsg({ tipo: "err", texto: "La nueva contraseña debe tener mínimo 6 caracteres." }); return; }
 if (newPass !== confirm) { setMsg({ tipo: "err", texto: "Las contraseñas no coinciden." }); return; }
 setLoading(true);
 const r = await api.changePassword(current, newPass, confirm);
 setLoading(false);
 if (r.ok) {
 setMsg({ tipo: "ok", texto: " Contraseña cambiada correctamente. La próxima vez que inicies sesión usa la nueva contraseña." });
 setCurrent(""); setNewPass(""); setConfirm("");
 } else {
 setMsg({ tipo: "err", texto: r.error || "Error cambiando contraseña." });
 }
 };

 return (
 <div className="space-y-6">
 {/* Datos de la cuenta */}
 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Mi cuenta</p>
 <h2 className="font-titulo text-xl font-bold text-cafe">{sesion.nombre}</h2>
 <form onSubmit={guardarDatos} className="mt-4 grid gap-3">
 <div className="grid gap-3 sm:grid-cols-2">
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Nombre o negocio</label>
 <input value={nombreCuenta} onChange={(e) => setNombreCuenta(e.target.value)}
 required className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Correo de acceso</label>
 <input type="email" value={emailCuenta} onChange={(e) => setEmailCuenta(e.target.value)}
 required autoComplete="email" className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Teléfono de contacto</label>
 <input value={telefonoCuenta} onChange={(e) => setTelefonoCuenta(e.target.value)}
 inputMode="tel" autoComplete="tel" placeholder="+593..." className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">WhatsApp</label>
 <input value={whatsappCuenta} onChange={(e) => setWhatsappCuenta(e.target.value)}
 inputMode="tel" autoComplete="tel" placeholder="+593..." className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Provincia / ciudad base</label>
 <input value={provinciaCuenta} onChange={(e) => setProvinciaCuenta(e.target.value)}
 autoComplete="address-level1" className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <div className="rounded-xl bg-crema p-3 text-sm text-pizarra/70">
 <p><span className="text-pizarra/60">Perfil principal:</span> <span className="font-semibold text-cafe">{NOMBRES_PERFIL[rolesCuenta[0]]}</span></p>
 <p><span className="text-pizarra/60">Plan:</span> <span className="font-semibold text-cafe">{sesion.plan}</span></p>
 <p><span className="text-pizarra/60">Miembro desde:</span> <span className="font-semibold text-cafe">{sesion.created_at ? new Date(sesion.created_at).toLocaleDateString("es-EC") : "—"}</span></p>
 </div>
 </div>
 <button type="submit" disabled={loading} className="w-fit rounded-full bg-cafe px-5 py-2.5 text-sm font-semibold text-crema hover:bg-cafe/90 disabled:opacity-50">
 {loading ? "Guardando..." : "Guardar datos"}
 </button>
 {datosMsg && (
 <p className={`rounded-xl p-3 text-sm font-semibold ${datosMsg.tipo === "ok" ? "bg-hoja/10 text-hoja" : "bg-cereza/10 text-cereza"}`}>
 {datosMsg.texto}
 </p>
 )}
 </form>
 </div>

 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Mis perfiles</p>
 <h2 className="font-titulo text-xl font-bold text-cafe">Perfiles de actividad</h2>
 <p className="mt-1 text-sm text-pizarra/60">Puedes tener de uno a tres perfiles. El primero es el principal.</p>
 <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
 {PERFILES_PANEL.map((perfil) => {
 const activo = rolesCuenta.includes(perfil);
 const principal = rolesCuenta[0] === perfil;
 const bloqueadoAgregar = !activo && rolesCuenta.length >= 3;
 return (
 <div key={perfil} className={`rounded-xl border p-3 ${principal ? "border-hoja bg-hoja/5" : activo ? "border-cafe/30" : "border-cafe/10"}`}>
 <p className="font-semibold text-cafe">{NOMBRES_PERFIL[perfil]}</p>
 <div className="mt-2 flex flex-wrap gap-2">
 <button
 type="button"
 disabled={bloqueadoAgregar}
 onClick={() => togglePerfil(perfil)}
 className={`rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${activo ? "border border-cafe/30 text-cafe" : "bg-cafe text-crema"}`}
 >
 {activo ? "Quitar" : "Añadir"}
 </button>
 {activo && (
 <button
 type="button"
 onClick={() => principalPerfil(perfil)}
 className={`rounded-full px-3 py-1.5 text-xs font-semibold ${principal ? "bg-hoja text-crema" : "border border-hoja text-hoja"}`}
 >
 {principal ? "Principal" : "Hacer principal"}
 </button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 {rolesMsg && (
 <p className={`mt-3 rounded-xl p-3 text-sm font-semibold ${rolesMsg.tipo === "ok" ? "bg-hoja/10 text-hoja" : "bg-cereza/10 text-cereza"}`}>
 {rolesMsg.texto}
 </p>
 )}
 </div>

 {/* Cambio de contraseña */}
 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Seguridad</p>
 <h2 className="font-titulo text-xl font-bold text-cafe">Cambiar mi contraseña</h2>
 <p className="mt-1 text-sm text-pizarra/60">
 Cambia tu contraseña regularmente. Necesitas conocer la actual para hacer el cambio.
 </p>

 <form onSubmit={cambiar} className="mt-4 space-y-3 max-w-md">
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Contraseña actual</label>
 <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
 required className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Nueva contraseña (mínimo 6 caracteres)</label>
 <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
 required minLength={6} className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Confirmar nueva contraseña</label>
 <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
 required className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <button type="submit" disabled={loading}
 className="rounded-full bg-hoja px-5 py-2.5 text-sm font-semibold text-crema hover:bg-hoja/90 disabled:opacity-50">
 {loading ? "Cambiando…" : " Cambiar contraseña"}
 </button>
 </form>

 {msg && (
 <p className={`mt-3 rounded-lg p-3 text-sm ${msg.tipo === "ok" ? "bg-hoja/15 text-hoja" : "bg-cereza/15 text-cereza"}`}>
 {msg.texto}
 </p>
 )}
 </div>

 {/* 2FA */}
 <TwoFactorPanel />

 {/* Medidas de moderación (si las hay) y cierre de la cuenta */}
 <MedidasDeMiCuenta />
 <CerrarMiCuenta />

 {/* Consejos */}
 <div className="rounded-2xl border border-latte/40 bg-latte/10 p-4 text-sm text-pizarra/70">
 <strong>Consejos de seguridad:</strong>
 <ul className="mt-2 space-y-1 list-disc pl-5">
 <li>Usa mínimo 8 caracteres con números y letras</li>
 <li>No uses la misma contraseña de tu email</li>
 <li>Cámbiala cada 3 meses</li>
 <li>Activa 2FA para mayor seguridad</li>
 <li>Si perdiste tu contraseña, usa la recuperación desde la pantalla de acceso</li>
 </ul>
 </div>
 </div>
 );
}

function TwoFactorPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const [step, setStep] = useState<"idle" | "enable_confirm" | "disable_confirm" | "regen_confirm">("idle");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [pendingEnableCode, setPendingEnableCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast, mostrar, cerrar } = useToast();

 const cargar = async () => {
 const r = await api.twoFactorStatus();
 if (r.ok && r.data) {
 const d = r.data as { enabled: boolean; backup_codes_remaining: number };
 setEnabled(d.enabled);
 setRemaining(d.backup_codes_remaining);
 }
 };

 // Cargar al montar
 useState(() => { cargar(); });

 const activar = async () => {
 setMsg(null);
 setLoading(true);
 const r = await api.twoFactorEnable();
 setLoading(false);
 if (!r.ok) { setMsg({ tipo: "err", texto: r.error || "Error." }); return; }
 const d = r.data as { backup_codes: string[]; dev_code: string };
 setBackupCodes(d.backup_codes);
 setPendingEnableCode(d.dev_code);
 setStep("enable_confirm");
 };

 const confirmarActivar = async () => {
 setMsg(null);
 setLoading(true);
 const r = await api.twoFactorConfirmEnable(code);
 setLoading(false);
 if (!r.ok) { setMsg({ tipo: "err", texto: r.error || "Código incorrecto." }); return; }
 setMsg({ tipo: "ok", texto: " 2FA activado. Guarda los códigos de respaldo antes de cerrar." });
 setStep("idle");
 setCode("");
 setPendingEnableCode(null);
 cargar();
 };

 const desactivar = async () => {
 setMsg(null);
 setLoading(true);
 const r = await api.twoFactorDisable(code);
 setLoading(false);
 if (!r.ok) { setMsg({ tipo: "err", texto: r.error || "Error." }); return; }
 setMsg({ tipo: "ok", texto: " 2FA desactivado." });
 setStep("idle");
 setCode("");
 setBackupCodes(null);
 cargar();
 };

 const regenerarBackup = async () => {
 setMsg(null);
 setLoading(true);
 const r = await api.twoFactorRegenerateBackup(code);
 setLoading(false);
 if (!r.ok) { setMsg({ tipo: "err", texto: r.error || "Error." }); return; }
 const d = r.data as { backup_codes: string[] };
 setBackupCodes(d.backup_codes);
 setMsg({ tipo: "ok", texto: " Códigos regenerados. Guarda los nuevos antes de cerrar." });
 setStep("idle");
 setCode("");
 cargar();
 };

return (
  <div className="rounded-2xl border border-cafe/10 bg-white p-5">
  {toast && <Toast {...toast} onCerrar={cerrar} />}
  <div className="flex flex-wrap items-start justify-between gap-3">
  <div>
  <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Verificación en 2 pasos</p>
 <h2 className="font-titulo text-xl font-bold text-cafe">2FA por email</h2>
<p className="mt-1 text-sm text-pizarra/60">
  {enabled === null ? <Skeleton className="my-0.5 inline-block h-4 w-64 align-middle" /> :
  enabled ? `Activado · ${remaining} códigos de respaldo restantes` :
  "Desactivado · añade una capa extra de seguridad"}
  </p>
 </div>
 {enabled && (
 <span className="rounded-full bg-hoja/15 px-3 py-1 text-xs font-semibold text-hoja"> ACTIVO</span>
 )}
 {enabled === false && (
 <span className="rounded-full bg-pizarra/10 px-3 py-1 text-xs font-semibold text-pizarra/60">INACTIVO</span>
 )}
 </div>

 {enabled === false && step === "idle" && (
 <div className="mt-4">
 <p className="text-sm text-pizarra/70">
 Al activar 2FA, cada vez que inicies sesión te enviaremos un código de 6 dígitos a tu email.
 También generaremos <strong>10 códigos de respaldo</strong> por si pierdes acceso al email.
 </p>
 <button onClick={activar} disabled={loading}
 className="mt-3 rounded-full bg-cereza px-5 py-2.5 text-sm font-semibold text-crema hover:bg-cereza/90 disabled:opacity-50">
 Activar 2FA
 </button>
 </div>
 )}

 {enabled === true && step === "idle" && (
 <div className="mt-4 flex flex-wrap gap-2">
 <button onClick={() => setStep("regen_confirm")} className="rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Regenerar códigos de respaldo
 </button>
 <button onClick={() => setStep("disable_confirm")} className="rounded-full bg-cereza/15 px-4 py-2 text-sm font-semibold text-cereza hover:bg-cereza/25">
 Desactivar 2FA
 </button>
 </div>
 )}

 {step === "enable_confirm" && (
 <div className="mt-4 rounded-xl border-2 border-latte bg-latte/10 p-4">
 {pendingEnableCode && (
 <p className="text-sm text-pizarra/80">
 MODO DESARROLLO: Tu código es <span className="select-all rounded bg-crema px-2 font-mono font-bold">{pendingEnableCode}</span>
 </p>
 )}
 <p className="mt-2 text-sm text-pizarra/70">
 Te enviamos un código a tu email. Ingrésalo abajo para confirmar:
 </p>
 <input
 type="text"
 value={code}
 onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
 placeholder="123456"
 maxLength={6}
 className="mt-2 w-full rounded-lg border border-cafe/20 px-3 py-2 text-center font-mono text-xl tracking-widest"
 />
 {backupCodes && (
 <div className="mt-3 rounded-lg border-2 border-cereza bg-crema p-3">
 <p className="text-xs font-semibold text-cereza"> CÓDIGOS DE RESPALDO — GUÁRDALOS AHORA</p>
 <p className="mt-1 text-xs text-pizarra/70">
 Estos códigos solo se muestran una vez. Úsalos si no tienes acceso a tu email.
 </p>
 <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
 {backupCodes.map((c, i) => (
 <code key={i} className="rounded bg-white p-1.5 text-center font-mono text-xs">{c}</code>
 ))}
 </div>
<button
  onClick={() => {
  navigator.clipboard.writeText(backupCodes.join("\n"));
  mostrar("success", "Códigos copiados al portapapeles");
  }}
  className="mt-2 text-xs text-cereza underline"
  >
  Copiar todos
  </button>
 </div>
 )}
 <div className="mt-3 flex gap-2">
 <button onClick={confirmarActivar} disabled={loading || code.length !== 6}
 className="rounded-full bg-hoja px-4 py-2 text-sm font-semibold text-crema hover:bg-hoja/90 disabled:opacity-50">
 Confirmar y activar
 </button>
 <button onClick={() => { setStep("idle"); setCode(""); }} className="rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Cancelar
 </button>
 </div>
 </div>
 )}

 {step === "disable_confirm" && (
 <div className="mt-4 rounded-xl border-2 border-cereza/40 bg-cereza/5 p-4">
 <p className="text-sm font-semibold text-cereza"> Desactivar 2FA</p>
 <p className="mt-1 text-sm text-pizarra/70">
 Ingresa un código OTP reciente (6 dígitos) o tu contraseña actual:
 </p>
 <input
 type="text"
 value={code}
 onChange={(e) => setCode(e.target.value)}
 placeholder="123456 o tu contraseña"
 className="mt-2 w-full rounded-lg border border-cafe/20 px-3 py-2"
 />
 <div className="mt-3 flex gap-2">
 <button onClick={desactivar} disabled={loading || code.length < 6}
 className="rounded-full bg-cereza px-4 py-2 text-sm font-semibold text-crema hover:bg-cereza/90 disabled:opacity-50">
 Desactivar
 </button>
 <button onClick={() => { setStep("idle"); setCode(""); }} className="rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Cancelar
 </button>
 </div>
 </div>
 )}

 {step === "regen_confirm" && (
 <div className="mt-4 rounded-xl border-2 border-latte/40 bg-latte/5 p-4">
 <p className="text-sm font-semibold text-cafe"> Regenerar códigos de respaldo</p>
 <p className="mt-1 text-sm text-pizarra/70">
 Ingresa un código OTP reciente (6 dígitos enviado a tu email):
 </p>
 <input
 type="text"
 value={code}
 onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
 placeholder="123456"
 maxLength={6}
 className="mt-2 w-full rounded-lg border border-cafe/20 px-3 py-2 text-center font-mono text-xl tracking-widest"
 />
 <div className="mt-3 flex gap-2">
 <button onClick={regenerarBackup} disabled={loading || code.length !== 6}
 className="rounded-full bg-hoja px-4 py-2 text-sm font-semibold text-crema hover:bg-hoja/90 disabled:opacity-50">
 Regenerar
 </button>
 <button onClick={() => { setStep("idle"); setCode(""); }} className="rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Cancelar
 </button>
 </div>
 </div>
 )}

 {backupCodes && step === "idle" && (
 <div className="mt-4 rounded-lg border-2 border-cereza bg-crema p-3">
 <p className="text-xs font-semibold text-cereza"> Códigos de respaldo nuevos</p>
 <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
 {backupCodes.map((c, i) => (
 <code key={i} className="rounded bg-white p-1.5 text-center font-mono text-xs">{c}</code>
 ))}
 </div>
 <p className="mt-2 text-xs text-pizarra/50">Guárdalos antes de cerrar.</p>
 </div>
 )}

{msg && (
  <p className={`mt-3 rounded-lg p-3 text-sm ${msg.tipo === "ok" ? "bg-hoja/15 text-hoja" : "bg-cereza/15 text-cereza"}`}>
  {msg.texto}
  </p>
  )}
  </div>
  );
}

/* ==================== FINANZAS E INVENTARIO ==================== */

const MOTIVOS_ENTRADA = ["compra", "cosecha", "produccion"] as const;
const MOTIVOS_SALIDA = ["venta", "consumo"] as const;
const MOTIVOS_INGRESO = ["venta", "servicio", "honorario", "otro"] as const;
const MOTIVOS_GASTO = ["compra", "insumo", "flete", "operativo", "otro"] as const;

const ETIQUETA_MOTIVO: Record<string, string> = {
  compra: "Compra",
  cosecha: "Cosecha",
  produccion: "Producción",
  venta: "Venta",
  consumo: "Consumo",
  servicio: "Servicio",
  flete: "Flete",
  honorario: "Honorario",
  insumo: "Insumo",
  operativo: "Operativo",
  otro: "Otro",
};

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatoMes(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return `${MESES_CORTOS[(m - 1) % 12]} ${y}`;
}

function tipoRegistroInventario(tipo: TipoMovimientoInventario, motivo: string): TipoRegistro {
  if (tipo === "ingreso") return "venta";
  if (tipo === "gasto") return "costo";
  if (tipo === "entrada") return motivo === "cosecha" ? "produccion" : "compra";
  return motivo === "venta" ? "venta" : "otro";
}

function InventarioPanel({ sesion }: { sesion: ApiUser }) {
  const { toast, mostrar, cerrar } = useToast();
  const [resumen, setResumen] = useState<ResumenInventario | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [producto, setProducto] = useState("");
  const [tipo, setTipo] = useState<TipoMovimientoInventario>("entrada");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("");
  const [motivo, setMotivo] = useState<string>("compra");
  const [precio, setPrecio] = useState("");
  const [minimo, setMinimo] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [guardando, setGuardando] = useState(false);

  const [eliminarId, setEliminarId] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const [r1, r2] = await Promise.all([api.inventarioResumen(), api.inventarioList()]);
    if (r1.ok && r1.data) setResumen(r1.data as ResumenInventario);
    if (r2.ok && r2.data) setMovimientos((r2.data as { movimientos: MovimientoInventario[] }).movimientos);
    if (!r1.ok && !r2.ok) setError(r1.error || r2.error || "No se pudo cargar el inventario.");
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const productoConfig = (nombre: string): ProductoInventario | undefined =>
    resumen?.productos.find((p) => p.producto.toLowerCase() === nombre.trim().toLowerCase());

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = producto.trim();
    const esFinanza = tipo === "ingreso" || tipo === "gasto";
    const cant = parseFloat(cantidad);
    const montoFinanciero = parseFloat(precio);
    if (!nombre) {
      mostrar("error", esFinanza ? "Completa el concepto." : "Completa el producto.");
      return;
    }
    if (!esFinanza && (isNaN(cant) || cant <= 0)) {
      mostrar("error", "Completa una cantidad mayor que 0.");
      return;
    }
    if (esFinanza && (isNaN(montoFinanciero) || montoFinanciero <= 0)) {
      mostrar("error", "Completa un monto mayor que 0.");
      return;
    }
    const cfg = productoConfig(nombre);
    const unid = unidad.trim() || cfg?.unidad || "un";
    setGuardando(true);
    const r = await api.inventarioMovimiento({
      producto: nombre,
      concepto: nombre,
      cantidad: esFinanza ? 1 : cant,
      tipo,
      motivo,
      categoria: motivo,
      unidad: esFinanza ? "registro" : unid,
      precio: precio.trim() === "" ? null : parseFloat(precio),
      monto: esFinanza ? montoFinanciero : null,
      minimo: !esFinanza && minimo.trim() !== "" ? parseFloat(minimo) : null,
      fecha,
    });
    setGuardando(false);
    if (r.ok) {
      const monto = esFinanza ? montoFinanciero : (precio.trim() !== "" && !isNaN(parseFloat(precio)) ? parseFloat(precio) * cant : undefined);
      reg(
        sesion.rol as Exclude<Rol, "admin">,
        tipoRegistroInventario(tipo, motivo),
        esFinanza
          ? `${tipo === "ingreso" ? "Ingreso" : "Gasto"}: ${nombre} (${ETIQUETA_MOTIVO[motivo] ?? motivo})`
          : `${tipo === "entrada" ? "Entrada" : "Salida"} de ${nombre}: ${cant} ${unid} (${ETIQUETA_MOTIVO[motivo] ?? motivo})`,
        esFinanza
          ? { monto }
          : (monto !== undefined ? { cantidad: cant, unidad: unid, monto } : { cantidad: cant, unidad: unid })
      );
      mostrar("success", esFinanza ? "Movimiento financiero registrado." : (tipo === "entrada" ? "Entrada registrada en tu inventario." : "Salida registrada en ventas."));
      setProducto(""); setCantidad(""); setUnidad(""); setPrecio(""); setMinimo("");
      cargar();
    } else {
      mostrar("error", r.error || "Error al registrar el movimiento.");
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminarId) return;
    setBorrando(true);
    const r = await api.inventarioEliminar(eliminarId);
    setBorrando(false);
    if (r.ok) {
      mostrar("success", "Movimiento eliminado.");
      setEliminarId(null);
      cargar();
    } else {
      setEliminarId(null);
      mostrar("error", r.error || "No se pudo eliminar el movimiento.");
    }
  };

  const cambiarTipo = (t: TipoMovimientoInventario) => {
    setTipo(t);
    if (t === "entrada") setMotivo(MOTIVOS_ENTRADA[0]);
    else if (t === "salida") setMotivo(MOTIVOS_SALIDA[0]);
    else if (t === "ingreso") setMotivo(MOTIVOS_INGRESO[0]);
    else setMotivo(MOTIVOS_GASTO[0]);
  };

  if (error && !resumen) {
    return (
      <div>
        <h2 className="mb-1 text-lg font-semibold text-cafe">Finanzas e inventario</h2>
        <EstadoError
          titulo="No pudimos cargar tu inventario"
          descripcion="Vuelve a intentarlo en un momento."
          onReintentar={() => cargar()}
        />
      </div>
    );
  }

  const esFinanza = tipo === "ingreso" || tipo === "gasto";
  const motivos = tipo === "entrada" ? MOTIVOS_ENTRADA : tipo === "salida" ? MOTIVOS_SALIDA : tipo === "ingreso" ? MOTIVOS_INGRESO : MOTIVOS_GASTO;
  const totales = resumen?.totales;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-cafe">Finanzas e inventario</h2>
        <p className="mb-4 text-sm text-pizarra/70">
          Registra ingresos, gastos, entradas y salidas de inventario. Tus datos se guardan de forma privada en tu cuenta.
        </p>
      </div>

      {/* Totales del periodo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-cafe/10 bg-white p-4">
          <p className="text-xs text-pizarra/60">Vendido en {formatoMes(totales?.mes ?? "")}</p>
          <p className="mt-1 text-2xl font-bold text-cafe">
            {cargando || !totales ? "—" : `${totales.unidades_vendidas} ${totales.unidades_vendidas === 1 ? "unidad" : "unidades"}`}
          </p>
        </div>
        <div className="rounded-2xl border border-hoja/30 bg-hoja/10 p-4">
          <p className="text-xs text-pizarra/60">Ingresos del periodo</p>
          <p className="mt-1 text-2xl font-bold text-cafe">
            {cargando || !totales ? "—" : `$${totales.ingreso_estimado.toFixed(2)}`}
          </p>
        </div>
        <div className="rounded-2xl border border-cereza/25 bg-cereza/5 p-4">
          <p className="text-xs text-pizarra/60">Gastos del periodo</p>
          <p className="mt-1 text-2xl font-bold text-cafe">
            {cargando || !totales ? "—" : `$${(totales.gasto_estimado ?? 0).toFixed(2)}`}
          </p>
        </div>
        <div className="rounded-2xl border border-cafe/10 bg-white p-4">
          <p className="text-xs text-pizarra/60">Utilidad del periodo</p>
          <p className="mt-1 text-2xl font-bold text-cafe">
            {cargando || !totales ? "—" : `$${(totales.utilidad_estimada ?? totales.ingreso_estimado).toFixed(2)}`}
          </p>
        </div>
        <div className="rounded-2xl border border-cafe/10 bg-white p-4">
          <p className="text-xs text-pizarra/60">Utilidad histórica</p>
          <p className="mt-1 text-2xl font-bold text-cafe">
            {cargando || !totales ? "—" : `$${(totales.utilidad_total ?? totales.ingreso_total).toFixed(2)}`}
          </p>
        </div>
      </div>

      {/* Registro rápido */}
      <form onSubmit={registrar} className="rounded-2xl border border-cafe/10 bg-white p-5">
        <p className="font-titulo text-lg font-bold text-cafe">Registro rápido</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <input
              list="productos-inventario"
              value={producto}
              onChange={(e) => {
                setProducto(e.target.value);
                const cfg = productoConfig(e.target.value);
                if (cfg) setUnidad(cfg.unidad);
              }}
              placeholder={esFinanza ? "Concepto (venta, flete, insumo, honorarios...)" : "Producto (escribe o elige uno existente)"}
              className="w-full rounded-lg border border-cafe/20 px-3 py-2"
            />
            {!esFinanza && (
              <datalist id="productos-inventario">
                {(resumen?.productos ?? []).map((p) => (
                  <option key={p.producto} value={p.producto}>{p.unidad}</option>
                ))}
              </datalist>
            )}
            <p className="mt-1 text-xs text-pizarra/50">
              {esFinanza ? "Úsalo para controlar caja, costos de operación, ventas de servicios o compras." : "Para productos nuevos, define su mínimo con el campo correspondiente."}
            </p>
          </div>
          <select
            value={tipo}
            onChange={(e) => cambiarTipo(e.target.value as TipoMovimientoInventario)}
            className="rounded-lg border border-cafe/20 px-3 py-2"
            aria-label="Tipo de movimiento"
          >
            <option value="entrada">Entrada (compra/cosecha)</option>
            <option value="salida">Salida (venta/consumo)</option>
            <option value="ingreso">Ingreso ($)</option>
            <option value="gasto">Gasto ($)</option>
          </select>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="rounded-lg border border-cafe/20 px-3 py-2"
            aria-label="Motivo"
          >
            {motivos.map((m) => (
              <option key={m} value={m}>{ETIQUETA_MOTIVO[m]}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Cantidad"
            disabled={esFinanza}
            className="rounded-lg border border-cafe/20 px-3 py-2"
          />
          <input
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
            placeholder="Unidad (kg, lb, qq…)"
            disabled={esFinanza}
            className="rounded-lg border border-cafe/20 px-3 py-2"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder={esFinanza ? "Monto total ($)" : "Precio por unidad ($) — opcional"}
            className="rounded-lg border border-cafe/20 px-3 py-2"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
            placeholder="Mínimo en stock — opcional"
            disabled={esFinanza}
            className="rounded-lg border border-cafe/20 px-3 py-2"
          />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-cafe/20 px-3 py-2"
            aria-label="Fecha del movimiento"
          />
          <button
            type="submit"
            disabled={guardando}
            className="rounded-full bg-hoja px-4 py-2.5 font-semibold text-crema hover:bg-hoja/90 disabled:opacity-50"
          >
            {guardando ? "Registrando…" : "Registrar movimiento"}
          </button>
        </div>
      </form>

      {/* Existencias actuales */}
      <div>
        <p className="mb-2 font-semibold text-cafe">Existencias actuales</p>
        {cargando ? (
          <Skeleton variante="linea" className="h-24 w-full" />
        ) : (resumen?.productos.length ?? 0) === 0 ? (
          <EstadoVacio
            icono="marketplace"
            titulo="Aún no tienes productos en inventario"
            descripcion="Registra una entrada para empezar a controlar tus existencias."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resumen?.productos.map((p) => (
              <div
                key={p.producto}
                className={`rounded-2xl border p-4 ${p.bajo ? "border-cereza/40 bg-cereza/5" : "border-cafe/10 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug text-cafe">{p.producto}</p>
                  {p.bajo && (
                    <span className="shrink-0 rounded-full bg-cereza/15 px-2.5 py-1 text-xs font-bold text-cereza">
                      Bajo
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold text-cafe">
                  {p.existencias} <span className="text-sm font-semibold text-pizarra/60">{p.unidad}</span>
                </p>
                <p className="mt-1 text-xs text-pizarra/60">
                  {p.minimo > 0 ? `Mínimo: ${p.minimo} ${p.unidad}` : "Sin mínimo configurado"}
                  {typeof p.valor === "number" ? ` · Valor est.: $${p.valor.toFixed(2)}` : ""}
                </p>
                {p.bajo && p.minimo > 0 && (
                  <p className="mt-2 rounded-lg bg-cereza/10 p-2 text-xs font-semibold text-cereza">
                    Bajo el mínimo establecido ({p.minimo} {p.unidad}).
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial */}
      <div>
        <p className="mb-2 font-semibold text-cafe">Historial de movimientos</p>
        {cargando ? (
          <Skeleton variante="linea" className="h-24 w-full" />
        ) : movimientos.length === 0 ? (
          <EstadoVacio
            icono="administracion"
            titulo="Sin movimientos registrados"
            descripcion="Los movimientos que registres aparecerán aquí y podrás corregirlos."
          />
        ) : (
          <div className="space-y-2">
            {movimientos.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cafe/10 bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${m.tipo === "entrada" || m.tipo === "ingreso" ? "bg-hoja/15 text-hoja" : "bg-cereza/15 text-cereza"}`}>
                    {m.tipo === "entrada" ? "Entrada" : m.tipo === "salida" ? "Salida" : m.tipo === "ingreso" ? "Ingreso" : "Gasto"}
                  </span>
                  <span className="font-semibold text-cafe">{m.concepto || m.producto}</span>
                  {m.tipo === "ingreso" || m.tipo === "gasto" ? (
                    <span>{m.tipo === "ingreso" ? "+" : "−"}${Number(m.monto ?? m.precio ?? 0).toFixed(2)}</span>
                  ) : (
                    <span>
                      {m.tipo === "entrada" ? "+" : "−"}{m.cantidad} {m.unidad}
                    </span>
                  )}
                  <span className="text-pizarra/50">· {ETIQUETA_MOTIVO[m.motivo] ?? m.motivo}</span>
                  {m.tipo !== "ingreso" && m.tipo !== "gasto" && typeof m.precio === "number" && (
                    <span className="text-pizarra/50">· ${m.precio.toFixed(2)}/un</span>
                  )}
                  <span className="text-pizarra/40">· {m.fecha}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEliminarId(m.id)}
                  className="rounded-full border border-cereza/30 px-3 py-1 text-xs font-semibold text-cereza hover:bg-cereza/10"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        abierto={Boolean(eliminarId)}
        onCerrar={() => setEliminarId(null)}
        titulo="Eliminar movimiento"
        descripcion="Esta acción quita el movimiento del historial y actualiza tus totales. No se puede deshacer."
        pie={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEliminarId(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-full bg-cereza px-5 py-2.5 font-semibold text-crema hover:bg-cereza/90 disabled:opacity-50"
              onClick={confirmarEliminar}
              disabled={borrando}
            >
              {borrando ? "Eliminando…" : "Sí, eliminar"}
            </button>
          </>
        }
      />

      {toast && <Toast {...toast} onCerrar={cerrar} />}
    </div>
  );
}

/* ==================== ÓRDENES DEL USUARIO ==================== */

function SolicitudesMarketplacePanel({ rol }: { rol: Rol }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ok, setOk] = useState<string | null>(null);
  const sesion = getStoredSession();
  const sesionId = sesion?.id ?? "";

  const cargar = useCallback(() => {
    if (!sesionId) return;
    setCargando(true);
    api.pedidosList(rol, sesionId).then((r) => {
      if (r.ok && r.data) setPedidos((r.data as { pedidos: Pedido[] }).pedidos);
      else setOk(r.error || "No se pudieron cargar tus solicitudes.");
      setCargando(false);
    });
  }, [rol, sesionId]);

  useEffect(() => { cargar(); }, [cargar]);

  const avanzar = async (nro: number) => {
    const r = await api.pedidoAdvance(nro);
    if (r.ok && r.data) {
      const actualizado = (r.data as { pedido: Pedido }).pedido;
      setPedidos((prev) => prev.map((p) => p.nro === nro ? actualizado : p));
      setOk(`Solicitud #${nro} actualizada.`);
    } else {
      setOk(r.error || "No se pudo actualizar la solicitud.");
    }
  };

  const confirmar = async (nro: number) => {
    const r = await api.pedidoConfirmRecepcion(nro);
    if (r.ok) {
      setPedidos((prev) => prev.map((p) => p.nro === nro ? { ...p, estado: "Entregado" } : p));
      setOk(`Solicitud #${nro} confirmada.`);
    } else {
      setOk(r.error || "No se pudo confirmar la solicitud.");
    }
  };

  const receptorId = (p: Pedido) => p.proveedor_id || p.productor_id || "";

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-cafe">Solicitudes del Marketplace</h2>
      <p className="mb-4 text-sm text-pizarra/70">
        Aquí aparecen tus pedidos de café y servicios solicitados desde el Marketplace.
      </p>

      {cargando ? (
        <div className="rounded-2xl border border-cafe/10 bg-white p-8 text-center">
          <p className="text-sm text-pizarra/60">Cargando solicitudes...</p>
        </div>
      ) : pedidos.length === 0 ? (
        <EstadoVacio
          titulo="Aún no tienes solicitudes"
          descripcion="Cuando solicites café o servicios en el Marketplace, aparecerán en tu panel."
          cta="Explorar Marketplace"
          href="/marketplace"
        />
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const esServicio = p.tipo === "servicio";
            const soySolicitante = sesion?.id === p.solicitante_id;
            const puedoAvanzar = !soySolicitante && p.estado !== "Entregado";
            return (
              <div key={p.nro} className="rounded-2xl border border-cafe/10 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-cafe">
                      Solicitud #{p.nro} — {esServicio ? p.servicio || p.finca : p.finca}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-pizarra/50">
                      {esServicio ? "Servicio" : "Café"} · {soySolicitante ? "Solicitada por mí" : `Recibida de ${p.solicitante}`}
                    </p>
                  </div>
                  <span className="rounded-full bg-latte/20 px-3 py-1 text-xs font-bold text-latte-texto">{p.estado}</span>
                </div>
                <p className="mt-2 text-sm text-pizarra/70">
                  {esServicio ? "Proveedor" : "Productor"}: <b>{p.productor}</b> · {p.sacos} {esServicio ? "unidad" : "sacos"} · ${p.total.toFixed(0)} · {p.fecha}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {soySolicitante && p.estado !== "Entregado" && (
                    <button onClick={() => confirmar(p.nro)} className="rounded-full bg-hoja px-4 py-1.5 text-xs font-semibold text-crema hover:bg-hoja/90">
                      Confirmar recepción
                    </button>
                  )}
                  {puedoAvanzar && (
                    <button onClick={() => avanzar(p.nro)} className="rounded-full bg-cafe px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cafe/90">
                      Avanzar estado
                    </button>
                  )}
                  {receptorId(p) && (
                    <Link href={`/chat?user=${encodeURIComponent(soySolicitante ? receptorId(p) : p.solicitante_id)}`} className="rounded-full bg-cereza px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cereza/90">
                      Chat de la solicitud
                    </Link>
                  )}
                  <a href={waLink(`Hola, quiero coordinar la solicitud #${p.nro} de ${esServicio ? p.servicio || p.finca : p.finca}.`)} target="_blank" rel="noreferrer"
                    className="rounded-full border border-hoja px-4 py-1.5 text-xs font-semibold text-hoja">
                    Coordinar
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}
    </div>
  );
}

function OrdenesPanel() {
  const [ordenes, setOrdenes] = useState<Array<{ nro: number; servicio_nombre: string; precio: number; estado: string; metodo_pago?: string; created_at: string }>>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.ordenMisOrdenes().then((res) => {
      if (res.ok && res.data?.ordenes) setOrdenes(res.data.ordenes);
      else setError(res.error || "No se pudieron cargar las órdenes.");
      setCargando(false);
    });
  }, []);

  const estadoColor = (e: string) => {
    if (e === "pagado") return "bg-hoja/20 text-hoja-oscuro";
    if (e === "completado") return "bg-cereza/15 text-cereza";
    return "bg-crema text-pizarra/70";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cafe/10 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Tus transacciones</p>
        <h2 className="mt-1 font-titulo text-2xl font-bold text-cafe">Mis órdenes de servicio</h2>
        <p className="mt-2 max-w-2xl text-sm text-pizarra/70">
          Historial de servicios contratados y su estado de pago.
        </p>
      </div>

      {cargando && (
        <div className="rounded-2xl border border-cafe/10 bg-white p-8 text-center">
          <p className="text-sm text-pizarra/60">Cargando órdenes...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!cargando && !error && ordenes.length === 0 && (
        <div className="rounded-2xl border border-cafe/10 bg-white p-8 text-center">
          <p className="text-sm text-pizarra/60">Aún no tienes órdenes registradas.</p>
          <Link href="/servicios" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-cereza px-5 py-2.5 text-sm font-semibold text-white hover:bg-cereza/90">
            Ver servicios →
          </Link>
        </div>
      )}

      {!cargando && ordenes.length > 0 && (
        <div className="space-y-3">
          {ordenes.map((o) => (
            <div key={o.nro} className="flex flex-col gap-3 rounded-2xl border border-cafe/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-titulo font-bold text-cafe">{o.servicio_nombre}</p>
                <p className="text-xs text-pizarra/50">
                  Orden #{o.nro} · {new Date(o.created_at).toLocaleDateString("es-EC")}
                  {o.metodo_pago === "paypal" && " · PayPal"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${estadoColor(o.estado)}`}>
                  {o.estado === "pagado" ? "Pagado" : o.estado === "completado" ? "Completado" : "Pendiente"}
                </span>
                <p className="font-mono text-lg font-bold tabular-nums text-cereza">${o.precio}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== SERVICIOS POR PERFIL ==================== */

function MisPublicacionesMarketplace({ sesion }: { sesion: ApiUser }) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [servicios, setServicios] = useState<MarketplaceServicio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editLote, setEditLote] = useState<Lote | null>(null);
  const [editServicio, setEditServicio] = useState<MarketplaceServicio | null>(null);
  const userId = sesion.id;
  const esAdmin = sesion.rol === "admin";

  const cargar = useCallback(async () => {
    setCargando(true);
    setAviso(null);
    const [r1, r2] = await Promise.all([api.lotesAll(), api.marketplaceServiciosList()]);
    const allLotes: Lote[] = (r1.ok && r1.data && (r1.data as { lotes: Lote[] }).lotes) || [];
    const allServicios: MarketplaceServicio[] = (r2.ok && r2.data && (r2.data as { servicios: MarketplaceServicio[] }).servicios) || [];
    setLotes(allLotes.filter((l) => esAdmin || l.published_by === userId));
    setServicios(allServicios.filter((s) => esAdmin || s.proveedor_id === userId));
    setCargando(false);
  }, [userId, esAdmin]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminarLote = async (l: Lote) => {
    if (!confirm(`¿Eliminar el lote "${l.finca}" del Marketplace?`)) return;
    const r = await api.loteDelete(l.id);
    setAviso(r.ok ? `Lote eliminado: ${l.finca}.` : (r.error || "No se pudo eliminar el lote."));
    if (r.ok) cargar();
  };
  const toggleOcultoLote = async (l: Lote) => {
    const r = await api.loteToggleOculto(l.id);
    setAviso(r.ok ? `Lote ${l.oculto ? "publicado" : "ocultado"}.` : (r.error || "No se pudo cambiar la visibilidad."));
    if (r.ok) cargar();
  };
  const eliminarServicio = async (s: MarketplaceServicio) => {
    if (!confirm(`¿Eliminar el servicio "${s.titulo}" del Marketplace?`)) return;
    const r = await api.marketplaceServicioDelete(s.id);
    setAviso(r.ok ? `Servicio eliminado: ${s.titulo}.` : (r.error || "No se pudo eliminar el servicio."));
    if (r.ok) cargar();
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Tus publicaciones</p>
        <h2 className="mt-1 font-titulo text-2xl font-bold text-cafe">Mis publicaciones en el Marketplace</h2>
        <p className="mt-2 max-w-2xl text-sm text-pizarra/70">
          Aquí ves tus lotes y servicios publicados. Puedes editarlos o eliminarlos en cualquier momento.
          {esAdmin ? " Como administrador, también ves las publicaciones de cualquier miembro." : ""}
       </p>
     </div>
      {aviso && (
        <p className="mb-4 rounded-xl border border-green-700/20 bg-green-100/40 p-3 text-sm font-semibold text-green-700">{aviso}</p>
      )}

      <h3 className="mb-2 font-titulo text-lg font-bold text-cafe">Lotes ({lotes.length})</h3>
      {cargando ? (
        <p className="rounded-xl border border-cafe/10 bg-white p-4 text-sm text-pizarra/60">Cargando…</p>
      ) : lotes.length === 0 ? (
        <p className="rounded-xl border border-cafe/10 bg-white p-4 text-sm text-pizarra/60">
          Aún no has publicado lotes. Ve a <strong>Publicar lote de café</strong> en este panel.
       </p>
      ) : (
        <ul className="space-y-3">
          {lotes.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cafe/10 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-cafe">{l.finca} · {l.variedad} · {l.proceso}</p>
                <p className="text-xs text-pizarra/60">{l.provincia} · {l.altura} msnm · score {l.score} · ${l.precioSaco}/saco</p>
                <p className="text-xs text-pizarra/60">Estado: {l.oculto ? <span className="font-semibold text-cereza">oculto</span> : <span className="font-semibold text-hoja">publicado</span>}{esAdmin && l.published_by ? ` · publicado por ${l.published_by}` : ""}</p>
             </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/marketplace/${l.id}`} className="rounded-full bg-cafe px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cafe/90">Ver</Link>
                <button onClick={() => setEditLote(l)} className="rounded-full border border-hoja px-4 py-1.5 text-xs font-semibold text-hoja hover:bg-hoja/10">Editar</button>
                <button onClick={() => toggleOcultoLote(l)} className="rounded-full border border-filtrado-600 px-4 py-1.5 text-xs font-semibold text-filtrado-600 hover:bg-filtrado-600/10">{l.oculto ? "Publicar" : "Ocultar"}</button>
                <button onClick={() => eliminarLote(l)} className="rounded-full border border-cereza px-4 py-1.5 text-xs font-semibold text-cereza hover:bg-cereza/10">Eliminar</button>
             </div>
           </li>
          ))}
       </ul>
      )}

      <h3 className="mb-2 mt-8 font-titulo text-lg font-bold text-cafe">Servicios ({servicios.length})</h3>
      {cargando ? (
        <p className="rounded-xl border border-cafe/10 bg-white p-4 text-sm text-pizarra/60">Cargando…</p>
      ) : servicios.length === 0 ? (
        <p className="rounded-xl border border-cafe/10 bg-white p-4 text-sm text-pizarra/60">
          Aún no has publicado servicios. Ve a <strong>Publicar servicio</strong> en este panel.
       </p>
      ) : (
        <ul className="space-y-3">
          {servicios.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cafe/10 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-cafe">{s.titulo}</p>
                <p className="text-xs text-pizarra/60">{s.categoria} · {s.provincia || "Ecuador"} · ${s.precio}/{s.unidad}</p>
                {esAdmin && s.proveedor_id ? <p className="text-xs text-pizarra/60">publicado por {s.proveedor_id}</p> : null}
             </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setEditServicio(s)} className="rounded-full border border-hoja px-4 py-1.5 text-xs font-semibold text-hoja hover:bg-hoja/10">Editar</button>
                <button onClick={() => eliminarServicio(s)} className="rounded-full border border-cereza px-4 py-1.5 text-xs font-semibold text-cereza hover:bg-cereza/10">Eliminar</button>
             </div>
           </li>
          ))}
       </ul>
      )}

      {editLote && (
        <EditarLoteModal
          lote={editLote}
          onCerrar={() => setEditLote(null)}
          onGuardado={() => { setEditLote(null); cargar(); }}
          onAviso={setAviso}
        />
      )}
      {editServicio && (
        <EditarServicioModal
          servicio={editServicio}
          onCerrar={() => setEditServicio(null)}
          onGuardado={() => { setEditServicio(null); cargar(); }}
          onAviso={setAviso}
        />
      )}
   </div>
  );
}

function EditarLoteModal({ lote, onCerrar, onGuardado, onAviso }: { lote: Lote; onCerrar: () => void; onGuardado: () => void; onAviso: (m: string) => void; }) {
  const [finca, setFinca] = useState(lote.finca ?? "");
  const [provincia, setProvincia] = useState(lote.provincia ?? "");
  const [variedad, setVariedad] = useState(lote.variedad ?? "");
  const [proceso, setProceso] = useState(lote.proceso ?? "Lavado");
  const [altura, setAltura] = useState(String(lote.altura ?? 0));
  const [score, setScore] = useState(String(lote.score ?? 80));
  const [precioSaco, setPrecioSaco] = useState(String(lote.precioSaco ?? 0));
  const [precioQuintal, setPrecioQuintal] = useState(String(lote.precioQuintal ?? 0));
  const [stockSacos, setStockSacos] = useState(String(lote.stockSacos ?? 0));
  const [stockQuintales, setStockQuintales] = useState(String(lote.stockQuintales ?? 0));
  const [certificacion, setCertificacion] = useState(lote.certificacion ?? "Convencional");
  const [descripcion, setDescripcion] = useState(lote.descripcion ?? "");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    const r = await api.loteUpdate(lote.id, {
      finca, provincia, variedad, proceso,
      altura: parseInt(altura) || 0,
      score: parseInt(score) || 80,
      precioSaco: parseFloat(precioSaco) || 0,
      precioQuintal: parseFloat(precioQuintal) || 0,
      stockSacos: parseInt(stockSacos) || 0,
      stockQuintales: parseInt(stockQuintales) || 0,
      certificacion,
      descripcion: descripcion.slice(0, 400),
    } as Partial<Lote>);
    setGuardando(false);
    if (r.ok) { onAviso("Lote actualizado."); onGuardado(); }
    else { onAviso(r.error || "No se pudo guardar."); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cafe/60 p-4" role="dialog" aria-modal="true" aria-label={`Editar lote ${lote.finca}`}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-titulo text-xl font-bold text-cafe">Editar lote · {lote.finca}</h3>
          <button onClick={onCerrar} className="rounded-full p-1 text-pizarra/60 hover:bg-crema" aria-label="Cerrar">✕</button>
       </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input value={finca} onChange={(e) => setFinca(e.target.value)} placeholder="Finca" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <input value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Provincia" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <input value={variedad} onChange={(e) => setVariedad(e.target.value)} placeholder="Variedad" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <select value={proceso} onChange={(e) => setProceso(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2">
            <option>Lavado</option><option>Natural</option><option>Honey</option><option>Semi-lavado</option>
         </select>
          <input type="number" value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="Altura" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <input type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <input type="number" step="0.01" value={precioSaco} onChange={(e) => setPrecioSaco(e.target.value)} placeholder="Precio saco" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <input type="number" step="0.01" value={precioQuintal} onChange={(e) => setPrecioQuintal(e.target.value)} placeholder="Precio quintal" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <input type="number" value={stockSacos} onChange={(e) => setStockSacos(e.target.value)} placeholder="Stock sacos" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <input type="number" value={stockQuintales} onChange={(e) => setStockQuintales(e.target.value)} placeholder="Stock quintales" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <select value={certificacion} onChange={(e) => setCertificacion(e.target.value)} className="rounded-lg border border-cafe/20 px-3 py-2 sm:col-span-2">
            <option>Convencional</option><option>Orgánico</option><option>Comercio Justo</option><option>Rainforest</option>
         </select>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} placeholder="Descripción / notas de cata" className="rounded-lg border border-cafe/20 px-3 py-2 sm:col-span-2" />
       </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCerrar} className="rounded-full border border-cafe/20 px-4 py-2 text-sm font-semibold text-cafe hover:bg-crema">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="rounded-full bg-hoja px-5 py-2 text-sm font-semibold text-crema hover:bg-hoja/90 disabled:opacity-60">{guardando ? "Guardando..." : "Guardar cambios"}</button>
       </div>
     </div>
   </div>
  );
}

function EditarServicioModal({ servicio, onCerrar, onGuardado, onAviso }: { servicio: MarketplaceServicio; onCerrar: () => void; onGuardado: () => void; onAviso: (m: string) => void; }) {
  const [titulo, setTitulo] = useState(servicio.titulo ?? "");
  const [categoria, setCategoria] = useState(servicio.categoria);
  const [descripcion, setDescripcion] = useState(servicio.descripcion ?? "");
  const [provincia, setProvincia] = useState(servicio.provincia ?? "");
  const [cobertura, setCobertura] = useState(servicio.cobertura ?? "");
  const [precio, setPrecio] = useState(String(servicio.precio ?? 0));
  const [unidad, setUnidad] = useState(servicio.unidad ?? "servicio");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    const r = await api.marketplaceServicioUpdate(servicio.id, {
      titulo,
      categoria: categoria as MarketplaceServicio["categoria"],
      descripcion: descripcion.slice(0, 600),
      provincia,
      cobertura,
      precio: parseFloat(precio) || 0,
      unidad,
    } as Partial<MarketplaceServicio>);
    setGuardando(false);
    if (r.ok) { onAviso("Servicio actualizado."); onGuardado(); }
    else { onAviso(r.error || "No se pudo guardar."); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cafe/60 p-4" role="dialog" aria-modal="true" aria-label={`Editar servicio ${servicio.titulo}`}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-titulo text-xl font-bold text-cafe">Editar servicio · {servicio.titulo}</h3>
          <button onClick={onCerrar} className="rounded-full p-1 text-pizarra/60 hover:bg-crema" aria-label="Cerrar">✕</button>
       </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className="rounded-lg border border-cafe/20 px-3 py-2 sm:col-span-2" />
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as MarketplaceServicio["categoria"])} className="rounded-lg border border-cafe/20 px-3 py-2 sm:col-span-2" aria-label="Categoría">
            <option value="transporte">Transporte</option>
            <option value="catacion">Catación</option>
            <option value="asesoria">Asesoría</option>
            <option value="pilado">Pilado / beneficio</option>
            <option value="insumos">Equipos e insumos</option>
            <option value="capacitacion">Capacitación</option>
            <option value="exportacion">Exportación</option>
            <option value="otro">Otro servicio</option>
         </select>
          <input value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Provincia" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <input value={cobertura} onChange={(e) => setCobertura(e.target.value)} placeholder="Cobertura" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <input type="number" step="0.01" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="Unidad" className="rounded-lg border border-cafe/20 px-3 py-2" />
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} placeholder="Descripción" className="rounded-lg border border-cafe/20 px-3 py-2 sm:col-span-2" />
       </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCerrar} className="rounded-full border border-cafe/20 px-4 py-2 text-sm font-semibold text-cafe hover:bg-crema">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="rounded-full bg-hoja px-5 py-2 text-sm font-semibold text-crema hover:bg-hoja/90 disabled:opacity-60">{guardando ? "Guardando..." : "Guardar cambios"}</button>
       </div>
     </div>
   </div>
  );
}

function ServiciosPanel({ rol }: { rol: Rol }) {
  const servicios = serviciosPara(rol);
  const gratuitos = servicios.filter((s) => s.gratis);
  const dePago = servicios.filter((s) => !s.gratis);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cafe/10 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Tus servicios</p>
        <h2 className="mt-1 font-titulo text-2xl font-bold text-cafe">Servicios disponibles para tu perfil</h2>
        <p className="mt-2 max-w-2xl text-sm text-pizarra/70">
          Accede a herramientas gratuitas o contrata servicios especializados según las necesidades de tu actividad.
        </p>
      </div>

      {gratuitos.length > 0 && (
        <div>
          <p className="rotulo text-hoja mb-3">Incluidos en tu cuenta · $0</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gratuitos.map((s) => (
              <Link key={s.id} href={s.href} className="group rounded-2xl border border-hoja/30 bg-hoja/5 p-5 transition hover:shadow-md">
                <p className="font-titulo text-lg font-bold text-cafe">{s.nombre}</p>
                <p className="mt-1 text-sm leading-relaxed text-pizarra/70">{s.descripcion}</p>
                <span className="mt-2 inline-block text-sm font-bold text-hoja underline-offset-4 group-hover:underline">
                  Usar ahora →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {dePago.length > 0 && (
        <div>
          <p className="rotulo text-filtrado-600 mb-3">Servicios especializados · con costo</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dePago.map((s) => (
              <Link key={s.id} href={`/servicios/contratar?servicio=${s.id}`} className="group rounded-2xl border border-cafe/10 bg-white p-5 transition hover:shadow-md">
                <p className="font-titulo text-lg font-bold text-cafe">{s.nombre}</p>
                <p className="mt-1 text-sm leading-relaxed text-pizarra/70">{s.descripcion}</p>
                <p className="mt-2 text-sm font-bold text-cereza">
                  desde ${s.precio} <span className="font-normal text-pizarra/60">/ {s.unidad}</span>
                </p>
                <span className="mt-2 inline-block text-sm font-bold text-cereza-roja underline-offset-4 group-hover:underline">
                  Contratar →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== AMANTE DEL CAFÉ ==================== */

function AmantePanel() {
  const links = [
    { href: "/recetas", icono: "amante" as const, titulo: "Recetas de preparación", d: "Métodos paso a paso para preparar café en casa: V60, prensa francesa y más." },
    { href: "/academia", icono: "academia" as const, titulo: "Cursos y cata", d: "Aprende sobre orígenes, catación y preparación en la Academia de la Red." },
    { href: "/marketplace", icono: "marketplace" as const, titulo: "Comprar café de origen", d: "Explora cafés ecuatorianos y compra directo a quien los produce." },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cafe/10 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Tu espacio de café en casa</p>
        <h2 className="mt-1 font-titulo text-2xl font-bold text-cafe">Descubre y prepara café ecuatoriano</h2>
        <p className="mt-2 max-w-2xl text-sm text-pizarra/70">
          En este espacio encuentras recetas verificadas de preparación, cursos de la Academia
          y el camino directo a los cafés de origen de la Red.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="group rounded-2xl border border-cafe/10 bg-white p-6 transition hover:shadow-md">
            <span className="inline-grid h-11 w-11 place-items-center rounded-full bg-cereza/10 text-cereza">
              <Icono nombre={l.icono} className="h-6 w-6" />
            </span>
            <h3 className="mt-3 font-titulo text-lg font-bold text-cafe group-hover:text-cereza">{l.titulo}</h3>
            <p className="mt-1 text-sm leading-relaxed text-pizarra/70">{l.d}</p>
            <span className="mt-3 inline-block text-sm font-bold text-cereza-roja underline-offset-4 group-hover:underline">
              Explorar →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
