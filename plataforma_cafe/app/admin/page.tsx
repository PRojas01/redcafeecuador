"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, type Lote, type ApiUser, type Pedido } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { KpiCard } from "@/components/Charts";
import { Icono } from "@/components/Icono";
import { CamasSecado, CerezaMadura, FincaTerrazas, SacoExportacion, TazaCenital } from "@/components/Lamina";
import { Skeleton } from "@/components/Skeleton";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Toast, useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { AvisosTab, ReportesTab, ModeracionTab } from "@/components/AdminGestion";
import { CuentasTab } from "@/components/AdminCuentas";
import { leerCertificados, emitirCertificado, rechazarCertificado, formatearFecha, etiquetaEstado, type Certificado } from "@/lib/certificados";

type EstadoValidacion = "pendiente" | "en_revision" | "verificado" | "rechazado";

interface MemberExtendido extends ApiUser {
 estado_validacion?: EstadoValidacion;
 motivo_rechazo?: string;
 nota_admin?: string;
 fecha_verificacion?: string;
 verificado_por?: string;
 telefono?: string;
 cedula?: string;
 provincia?: string;
 rating_promedio?: number;
 rating_count?: number;
 activo?: boolean;
}

const rolesTexto = (m: { rol: string; roles?: string[] }) => (m.roles?.length ? m.roles : [m.rol]).join(" · ");

type Tab =
 | "dashboard"
 | "validacion"
 | "lotes"
 | "pedidos"
 | "ordenes"
 | "cotizaciones"
 | "miembros"
 | "avisos"
 | "reportes"
 | "moderacion"
 | "cuentas"
 | "cursos"
 | "planes"
  | "certificaciones"
  | "media"
  | "imagenes"
  | "paginas"
  | "visual"
 | "cuenta";

export default function AdminPage() {
 const [pass, setPass] = useState("");
 const [error, setError] = useState<string | null>(null);
 const [resetMsg, setResetMsg] = useState<string | null>(null);
 const [keepSignedIn, setKeepSignedIn] = useState(true);
 const [authed, setAuthed] = useState<boolean>(false);
 const [tab, setTab] = useState<Tab>("dashboard");
 const [stats, setStats] = useState<Record<string, unknown> | null>(null);

 const check = async () => {
 const r = await api.adminMe();
 if (r.ok && r.data) setAuthed(!!(r.data as { admin: boolean }).admin);
 };

 const loadStats = async () => {
 const r = await api.adminStatsGlobal();
 if (r.ok && r.data) setStats(r.data as Record<string, unknown>);
 };

 useEffect(() => { check(); }, []);
 useEffect(() => { if (authed) loadStats(); }, [authed]);

 const login = async (e: React.FormEvent) => {
 e.preventDefault();
 const r = await api.adminLogin(pass, keepSignedIn);
 if (!r.ok) { setError(r.error || "Contraseña incorrecta"); return; }
 setError(null);
 // Respaldos, difusión, verificaciones y servicios se montan al cargar /admin/
 // con sesión: se recarga una vez para que aparezcan sin hacerlo a mano.
 window.location.reload();
 };

 const solicitarResetAdmin = async () => {
 setError(null);
 setResetMsg(null);
 const r = await api.adminResetRequest();
 setResetMsg(r.ok
  ? "Si el correo admin está configurado, recibirá el enlace de recuperación."
  : r.error || "No pudimos solicitar la recuperación.");
 };

 const logout = async () => {
 await api.adminLogout();
 setAuthed(false);
 };

 if (!authed) {
 return (
 <div className="mx-auto max-w-md px-4 py-16">
 <div className="rounded-2xl border border-cafe/10 bg-white p-8 shadow-sm">
 <div className="text-center">
 <span aria-hidden="true" className="mx-auto block h-10 w-10 rounded-full border border-cereza/40"></span>
 <h1 className="mt-3 font-titulo text-2xl font-bold text-cafe">Panel Admin</h1>
 <p className="mt-1 text-sm text-pizarra/60">Acceso restringido al administrador de Red Café Ecuador.</p>
 </div>
 <form onSubmit={login} className="mt-6 space-y-3">
 <div>
 <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
 <label className="text-xs font-semibold text-cafe/70">Contraseña</label>
 <button
 type="button"
 onClick={solicitarResetAdmin}
 className="text-xs font-semibold text-cereza underline"
 >
 ¿Olvidaste la contraseña?
 </button>
 </div>
 <input
 type="password"
 name="admin-password"
 value={pass}
 onChange={(e) => setPass(e.target.value)}
 placeholder="Contraseña de admin"
 className="w-full rounded-lg border border-cafe/20 px-3 py-2"
 autoFocus
 autoComplete="current-password"
 />
 </div>
 <label className="flex items-center gap-2 rounded-xl bg-crema p-3 text-sm text-pizarra/70">
 <input
 type="checkbox"
 checked={keepSignedIn}
 onChange={(e) => setKeepSignedIn(e.target.checked)}
 className="h-4 w-4"
 />
 <span>Mantener iniciada la sesión</span>
 </label>
 {error && <p className="rounded-lg bg-cereza/10 p-2 text-center text-sm text-cereza">{error}</p>}
 {resetMsg && <p className="rounded-lg bg-hoja/10 p-2 text-center text-sm text-hoja">{resetMsg}</p>}
 <button className="w-full rounded-full bg-cafe px-5 py-2.5 font-semibold text-crema hover:bg-cafe/90">
 Entrar
 </button>
 </form>
 </div>
 </div>
 );
 }

 const tabs: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "validacion", label: "Validación" },
  { id: "lotes", label: "Lotes" },
  { id: "pedidos", label: "Pedidos" },
  { id: "ordenes", label: "Órdenes" },
  { id: "cotizaciones", label: "Cotizaciones" },
  { id: "miembros", label: "Miembros" },
  { id: "avisos", label: "Avisos" },
  { id: "reportes", label: "Reportes" },
  { id: "moderacion", label: "Moderación" },
  { id: "cuentas", label: "Cuentas" },
  { id: "cursos", label: "Academia" },
  { id: "planes", label: "Planes" },
  { id: "certificaciones", label: "Certificaciones" },
  { id: "media", label: "Media" },
  { id: "imagenes", label: "Imágenes" },
  { id: "paginas", label: "Páginas" },
  { id: "visual", label: "Editor visual" },
  { id: "cuenta", label: "Mi cuenta" },
 ];

 return (
 <div className="mx-auto max-w-7xl px-4 py-6">
 {/* Header */}
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Panel Admin</p>
 <h1 className="mt-1 font-titulo text-2xl font-bold text-cafe">Centro de control</h1>
 </div>
 <div className="flex flex-wrap gap-2">
 <Link href="/chat" className="rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Chat
 </Link>
 <Link href="/bar" className="rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Ver Bar
 </Link>
 <button onClick={logout} className="rounded-full bg-cereza px-4 py-2 text-sm font-semibold text-crema hover:bg-cereza/90">
 Cerrar sesión
 </button>
 </div>
 </div>

 {/* Tabs */}
 <div className="mt-4 flex flex-wrap gap-2 border-b border-cafe/10 pb-2">
 {tabs.map((t) => (
 <button
 key={t.id}
 onClick={() => setTab(t.id)}
 className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
 tab === t.id ? "bg-cafe text-crema" : "border border-cafe/20 bg-white text-cafe hover:border-cafe/40"
 }`}
 >
 {t.label}
 </button>
 ))}
 </div>

 {/* Contenido */}
 <div className="mt-6">
 {tab === "dashboard" && <DashboardTab stats={stats} />}
 {tab === "validacion" && <ValidacionTab />}
 {tab === "lotes" && <CrudGenerico recurso="lotes" titulo="Lotes del marketplace" campos={[
 { k: "id", label: "ID", tipo: "text", readonly: true },
 { k: "finca", label: "Finca", tipo: "text" },
 { k: "productor", label: "Productor", tipo: "text" },
 { k: "provincia", label: "Provincia", tipo: "text" },
 { k: "variedad", label: "Variedad", tipo: "text" },
 { k: "proceso", label: "Proceso", tipo: "text" },
 { k: "altura", label: "Altura (msnm)", tipo: "number" },
 { k: "score", label: "Score SCA", tipo: "number" },
 { k: "precioQuintal", label: "Precio/qq", tipo: "number" },
 { k: "precioSaco", label: "Precio/saco", tipo: "number" },
 { k: "stockSacos", label: "Stock sacos", tipo: "number" },
 { k: "certificacion", label: "Certificación", tipo: "text" },
 { k: "emoji", label: "Emoji", tipo: "text" },
 ]} />}
 {tab === "pedidos" && <PedidosTab />}
 {tab === "ordenes" && <OrdenesAdminTab />}
 {tab === "cotizaciones" && <CotizacionesAdminTab />}
 {tab === "miembros" && <MiembrosTab />}
 {tab === "avisos" && <AvisosTab />}
 {tab === "reportes" && <ReportesTab />}
 {tab === "moderacion" && <ModeracionTab />}
 {tab === "cuentas" && <CuentasTab />}
 {tab === "cursos" && <CrudGenerico recurso="cursos" titulo="Cursos de Academia" campos={[
 { k: "id", label: "ID (slug)", tipo: "text", readonly: true },
 { k: "titulo", label: "Título", tipo: "text" },
 { k: "nivel", label: "Nivel", tipo: "select", opciones: ["Básico", "Intermedio", "Avanzado"] },
 { k: "duracion", label: "Duración", tipo: "text" },
 { k: "categoria", label: "Categoría", tipo: "text" },
 { k: "descripcion", label: "Descripción", tipo: "textarea" },
 { k: "modulos", label: "Módulos (JSON)", tipo: "json",
 placeholder: '[{"titulo":"Manejo del suelo","minutos":40}]' },
 ]} />}
 {tab === "planes" && <CrudGenerico recurso="planes" titulo="Planes de suscripción" campos={[
 { k: "id", label: "ID", tipo: "text", readonly: true },
 { k: "nombre", label: "Nombre", tipo: "text" },
 { k: "perfil", label: "Perfil", tipo: "select", opciones: ["productor", "vendedor", "comprador", "bar", "barista", "certificador", "proveedor", "transportista", "pilador", "exportador"] },
 { k: "precio", label: "Precio ($)", tipo: "number" },
 { k: "periodicidad", label: "Periodicidad", tipo: "text" },
 { k: "descripcion", label: "Descripción", tipo: "textarea" },
 { k: "destacado", label: "Destacado", tipo: "checkbox" },
 { k: "beneficios", label: "Beneficios (JSON array)", tipo: "json" },
 ]} />}
 {tab === "certificaciones" && <CertificacionesAdminTab />}
  {tab === "media" && <MediaAdminTab />}
  {tab === "imagenes" && <ImagenesAdminTab />}
  {tab === "paginas" && <PaginasAdminTab />}
  {tab === "visual" && <VisualAdminTab />}
 {tab === "cuenta" && <CuentaAdminTab />}
 </div>
 </div>
 );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────

function DashboardTab({ stats }: { stats: Record<string, unknown> | null }) {
 if (!stats) {
  return (
  <div className="space-y-6" aria-busy="true">
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {Array.from({ length: 4 }).map((_, i) => (
  <Skeleton key={i} variante="titulo" className="h-24" style={{ borderRadius: 16 }} />
  ))}
  </div>
  <Skeleton variante="linea" className="w-full" />
  <Skeleton variante="linea" className="w-2/3" />
  </div>
  );
 }

 const counts = stats as Record<string, number>;
 const miembrosRol = (stats.miembros_por_rol ?? {}) as Record<string, number>;
 const pedidosEstado = (stats.pedidos_por_estado ?? {}) as Record<string, number>;

 return (
 <div className="space-y-6">
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <KpiCard label="Miembros totales" valor={String(counts.members ?? 0)} icono={<Icono nombre="comunidad" className="h-6 w-6" />} />
 <KpiCard label="Lotes publicados" valor={String(counts.lotes ?? 0)} icono={<Icono nombre="marketplace" className="h-6 w-6" />} />
 <KpiCard label="Pedidos totales" valor={String(counts.pedidos ?? 0)} icono={<Icono nombre="administracion" className="h-6 w-6" />} />
 <KpiCard label="Ingresos" valor={"$" + (counts.ingresos_totales ?? 0).toLocaleString()} icono={<Icono nombre="precio" className="h-6 w-6" />} />
 </div>

 <div className="grid gap-4 md:grid-cols-3">
 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">Miembros por rol</p>
 <ul className="mt-3 space-y-1.5">
 {Object.entries(miembrosRol).length === 0 ? (
 <li className="text-sm text-pizarra/40">Sin miembros aún.</li>
 ) : Object.entries(miembrosRol).map(([r, n]) => (
 <li key={r} className="flex items-center justify-between text-sm">
 <span className="capitalize text-pizarra/70">{r}</span>
 <span className="font-bold text-cafe">{n}</span>
 </li>
 ))}
 </ul>
 </div>

 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">Pedidos por estado</p>
 <ul className="mt-3 space-y-1.5">
 {Object.entries(pedidosEstado).length === 0 ? (
 <li className="text-sm text-pizarra/40">Sin pedidos aún.</li>
 ) : Object.entries(pedidosEstado).map(([e, n]) => (
 <li key={e} className="flex items-center justify-between text-sm">
 <span className="text-pizarra/70">{e}</span>
 <span className="font-bold text-cafe">{n}</span>
 </li>
 ))}
 </ul>
 </div>

 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">Contenidos</p>
 <ul className="mt-3 space-y-1.5 text-sm">
 <li className="flex justify-between"><span className="text-pizarra/70">Cursos academia</span><span className="font-bold text-cafe">{counts.cursos ?? 0}</span></li>
 <li className="flex justify-between"><span className="text-pizarra/70">Planes</span><span className="font-bold text-cafe">{counts.planes ?? 0}</span></li>
 <li className="flex justify-between"><span className="text-pizarra/70">Páginas</span><span className="font-bold text-cafe">{counts.paginas ?? 0}</span></li>
 <li className="flex justify-between"><span className="text-pizarra/70">Ratings</span><span className="font-bold text-cafe">{counts.ratings ?? 0}</span></li>
 <li className="flex justify-between"><span className="text-pizarra/70">Chats</span><span className="font-bold text-cafe">{counts.chats ?? 0}</span></li>
 <li className="flex justify-between"><span className="text-pizarra/70">Posts</span><span className="font-bold text-cafe">{counts.posts ?? 0}</span></li>
 <li className="flex justify-between"><span className="text-pizarra/70">Waitlist</span><span className="font-bold text-cafe">{counts.waitlist ?? 0}</span></li>
 </ul>
 </div>
 </div>

 <div className="rounded-2xl border border-cereza/30 bg-cereza/5 p-4 text-sm text-pizarra/70">
 <strong>Zona peligrosa.</strong> Usa "Reset plataforma" solo si sabes lo que haces.
 Crea un backup antes (botón "Exportar" en cada recurso).
 </div>
 </div>
 );
}

// ─── VALIDACIÓN ────────────────────────────────────────────────────────────

function ValidacionTab() {
 const [members, setMembers] = useState<MemberExtendido[]>([]);
 const [filtro, setFiltro] = useState<EstadoValidacion | "todos">("todos");

 const cargar = async () => {
 const r = await api.membersAll();
 if (r.ok && r.data) {
 setMembers((r.data as { members: MemberExtendido[] }).members);
 }
 };
 useEffect(() => { cargar(); }, []);

 const setEstado = async (id: string, estado: EstadoValidacion) => {
 const fd = new FormData();
 fd.append("id", id);
 fd.append("estado", estado);
 await fetch(CONFIG.api("/api/members.php?action=set_estado"), { method: "POST", credentials: "include", body: fd });
 cargar();
 };

 const filtered = filtro === "todos" ? members : members.filter((m) => (m.estado_validacion ?? "pendiente") === filtro);

 return (
 <div>
 <div className="mb-4 flex flex-wrap items-center gap-3">
 <select value={filtro} onChange={(e) => setFiltro(e.target.value as EstadoValidacion | "todos")}
 className="rounded-lg border border-cafe/20 px-3 py-2 text-sm">
 <option value="todos">Todos</option>
 <option value="pendiente">Pendiente</option>
 <option value="en_revision">En revisión</option>
 <option value="verificado">Verificado</option>
 <option value="rechazado">Rechazado</option>
 </select>
 <span className="text-sm text-pizarra/60">{filtered.length} miembros</span>
 </div>

 <div className="overflow-x-auto rounded-2xl border border-cafe/10 bg-white">
 <table className="w-full text-sm">
 <thead className="bg-cafe text-crema">
 <tr>
 <th className="px-3 py-2 text-left">Nombre</th>
 <th className="px-3 py-2 text-left">Email</th>
 <th className="px-3 py-2 text-left">Rol</th>
 <th className="px-3 py-2 text-left">Estado</th>
 <th className="px-3 py-2 text-left">Acciones</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((m) => (
 <tr key={m.id} className="border-t border-cafe/5">
 <td className="px-3 py-2 font-semibold text-cafe">{m.nombre}</td>
 <td className="px-3 py-2 text-pizarra/70">{m.email}</td>
 <td className="px-3 py-2"><span className="rounded-full bg-crema px-2 py-0.5 text-xs">{rolesTexto(m)}</span></td>
 <td className="px-3 py-2 text-xs">
 <span className={`rounded-full px-2 py-0.5 font-semibold ${
 (m.estado_validacion ?? "pendiente") === "verificado" ? "bg-hoja/15 text-hoja" :
 (m.estado_validacion ?? "pendiente") === "rechazado" ? "bg-cereza/15 text-cereza" :
 "bg-latte/15 text-cafe"
 }`}>
 {m.estado_validacion ?? "pendiente"}
 </span>
 </td>
 <td className="px-3 py-2 space-x-1">
 <button onClick={() => setEstado(m.id, "verificado")} className="min-h-9 rounded px-3 py-2 text-xs bg-hoja/15 text-hoja hover:bg-hoja/25"> Verificar</button>
 <button onClick={() => setEstado(m.id, "rechazado")} className="min-h-9 rounded px-3 py-2 text-xs bg-cereza/15 text-cereza hover:bg-cereza/25"> Rechazar</button>
 </td>
 </tr>
 ))}
 {filtered.length === 0 && (
 <tr><td colSpan={5} className="px-3 py-6 text-center text-pizarra/50">Sin miembros en este filtro.</td></tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
}

// ─── CRUD GENÉRICO (cursos, planes, lotes) ────────────────────────────────

interface CampoDef {
 k: string;
 label: string;
 tipo: "text" | "number" | "textarea" | "select" | "checkbox" | "json";
 readonly?: boolean;
 opciones?: string[];
 placeholder?: string;
}

function CrudGenerico({
 recurso,
 titulo,
 campos,
}: {
 recurso: string;
 titulo: string;
 campos: CampoDef[];
}) {
 const [items, setItems] = useState<Record<string, unknown>[]>([]);
 const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
 const [nuevo, setNuevo] = useState(false);
 const [form, setForm] = useState<Record<string, string>>({});
 const [error, setError] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [confEliminar, setConfEliminar] = useState<string | null>(null);
 const { toast, mostrar, cerrar } = useToast();

 const cargar = async () => {
 setLoading(true);
 const r = await api.adminList(recurso);
 if (r.ok && r.data) {
 const data = r.data as Record<string, Record<string, unknown>[]>;
 setItems(data[recurso] || []);
 } else {
 setItems([]);
 setError(r.error || "Error cargando");
 }
 setLoading(false);
 };

 useEffect(() => { cargar(); }, [recurso]);

 const startEdit = (it: Record<string, unknown>) => {
 setEdit(it);
 const f: Record<string, string> = {};
 for (const c of campos) {
 const v = it[c.k];
 if (c.tipo === "json") f[c.k] = v ? JSON.stringify(v, null, 2) : "[]";
 else if (typeof v === "boolean") f[c.k] = v ? "true" : "false";
 else f[c.k] = v !== null && v !== undefined ? String(v) : "";
 }
 setForm(f);
 setNuevo(false);
 setError(null);
 };
 const startNew = () => {
 setEdit({});
 const f: Record<string, string> = {};
 for (const c of campos) {
 if (c.tipo === "json") f[c.k] = "[]";
 else if (c.tipo === "checkbox") f[c.k] = "false";
 else f[c.k] = "";
 }
 setForm(f);
 setNuevo(true);
 setError(null);
 };

 const guardar = async () => {
 setError(null);
 const data: Record<string, unknown> = {};
 for (const c of campos) {
 const raw = form[c.k] ?? "";
 if (c.tipo === "number") data[c.k] = parseFloat(raw) || 0;
 else if (c.tipo === "checkbox") data[c.k] = raw === "true";
 else if (c.tipo === "json") {
 try { data[c.k] = JSON.parse(raw); }
 catch { setError(`JSON inválido en ${c.label}`); return; }
 } else {
 data[c.k] = raw;
 }
 }
 let r;
 if (nuevo) {
 r = await api.adminCreate(recurso, data);
 } else {
 r = await api.adminUpdate(recurso, String(edit?.id ?? ""), data);
 }
 if (!r.ok) { setError(r.error || "Error guardando"); return; }
 setEdit(null); setNuevo(false);
 cargar();
 };

 const eliminar = async (id: string) => {
 setConfEliminar(null);
 const r = await api.adminDelete(recurso, id);
 if (!r.ok) mostrar("error", r.error || "Error");
 cargar();
 };

 const exportar = () => {
 window.location.href = CONFIG.api(`/api/admin.php?action=export&tipo=${recurso}`);
 };

 return (
 <div>
 {toast && <Toast {...toast} onCerrar={cerrar} />}
 <Modal
 abierto={confEliminar !== null}
 onCerrar={() => setConfEliminar(null)}
 titulo="Confirmar eliminación"
 descripcion={confEliminar ? `¿Eliminar el registro «${confEliminar}»? Esta acción no se puede deshacer.` : undefined}
 pie={
 <>
 <button className="btn-ghost" onClick={() => setConfEliminar(null)}>Cancelar</button>
 <button className="btn-primary" onClick={() => eliminar(confEliminar!)}>Eliminar</button>
 </>
 }
 />
 <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
 <h2 className="font-titulo text-xl font-bold text-cafe">{titulo}</h2>
 <div className="flex flex-wrap gap-2">
 <button onClick={exportar} className="rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">
 ⬇ Exportar JSON
 </button>
 <button onClick={startNew} className="rounded-full bg-cereza px-4 py-2 text-sm font-semibold text-crema hover:bg-cereza/90">
 + Nuevo
 </button>
 </div>
 </div>

 {(edit || nuevo) && (
 <div className="mb-4 rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">{nuevo ? "Crear nuevo" : "Editar"}</p>
 <div className="mt-3 grid gap-3 sm:grid-cols-2">
 {campos.map((c) => (
 <div key={c.k} className={c.tipo === "textarea" || c.tipo === "json" ? "sm:col-span-2" : ""}>
 <label className="block text-xs font-semibold text-pizarra/60">{c.label}</label>
 {c.tipo === "textarea" ? (
 <textarea
 value={form[c.k] ?? ""}
 onChange={(e) => setForm({ ...form, [c.k]: e.target.value })}
 readOnly={c.readonly}
 rows={3}
 className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm"
 />
 ) : c.tipo === "select" ? (
 <select
 value={form[c.k] ?? ""}
 onChange={(e) => setForm({ ...form, [c.k]: e.target.value })}
 className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm"
 >
 {c.opciones?.map((o) =><option key={o} value={o}>{o}</option>)}
 </select>
 ) : c.tipo === "checkbox" ? (
 <label className="mt-1 flex items-center gap-2">
 <input
 type="checkbox"
 checked={form[c.k] === "true"}
 onChange={(e) => setForm({ ...form, [c.k]: e.target.checked ? "true" : "false" })}
 />
 <span className="text-sm text-pizarra/70">{form[c.k] === "true" ? "Sí" : "No"}</span>
 </label>
 ) : c.tipo === "json" ? (
 <textarea
 value={form[c.k] ?? ""}
 onChange={(e) => setForm({ ...form, [c.k]: e.target.value })}
 placeholder={c.placeholder}
 rows={6}
 className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 font-mono text-xs"
 />
 ) : (
 <input
 type={c.tipo === "number" ? "number" : "text"}
 value={form[c.k] ?? ""}
 onChange={(e) => setForm({ ...form, [c.k]: e.target.value })}
 readOnly={c.readonly}
 className={`mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm ${c.readonly ? "bg-crema/30" : ""}`}
 />
 )}
 </div>
 ))}
 </div>
 {error && <p className="mt-3 rounded-lg bg-cereza/10 p-2 text-sm text-cereza">{error}</p>}
 <div className="mt-4 flex gap-2">
 <button onClick={guardar} className="rounded-full bg-hoja px-5 py-2 text-sm font-semibold text-crema hover:bg-hoja/90">
 {nuevo ? "Crear" : "Guardar"}
 </button>
 <button onClick={() => { setEdit(null); setNuevo(false); setError(null); }} className="rounded-full border border-cafe/30 px-5 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Cancelar
 </button>
 </div>
 </div>
 )}

 {loading ? (
 <Skeleton variante="linea" className="w-2/3" />
 ) : items.length === 0 ? (
 <EstadoVacio
 titulo="Aún no hay elementos"
 descripcion="Crea el primero con «+ Nuevo»."
 />
 ) : (
 <div className="overflow-x-auto rounded-2xl border border-cafe/10 bg-white">
 <table className="w-full text-sm">
 <thead className="bg-cafe text-crema">
 <tr>
 {campos.slice(0, 4).map((c) => (
 <th key={c.k} className="px-3 py-2 text-left">{c.label}</th>
 ))}
 <th className="px-3 py-2 text-left">Acciones</th>
 </tr>
 </thead>
 <tbody>
 {items.map((it) => (
 <tr key={String(it.id)} className="border-t border-cafe/5">
 {campos.slice(0, 4).map((c) => {
 let val: unknown = it[c.k];
 if (c.tipo === "json") val = Array.isArray(val) ? `${(val as unknown[]).length} items` : "";
 if (c.tipo === "checkbox") val = val ? "Sí" : "No";
 return (
 <td key={c.k} className="px-3 py-2 text-pizarra/80">
 {c.k === "id" ? <span className="font-semibold text-cafe">{String(val ?? "")}</span> : String(val ?? "")}
 </td>
 );
 })}
 <td className="px-3 py-2 space-x-1">
 <button onClick={() => startEdit(it)} className="min-h-9 rounded px-3 py-2 text-xs bg-hoja/15 text-hoja hover:bg-hoja/25">Editar</button>
<button onClick={() => setConfEliminar(String(it.id))} className="min-h-9 rounded border border-cereza/30 px-3 py-2 text-xs font-semibold text-cereza hover:bg-cereza/10">Eliminar</button>
  </td>
  </tr>
  ))}
  </tbody>
  </table>
  </div>
  )}
  </div>
  );
 }

 // ─── MIEMBROS (CRUD + reset) ──────────────────────────────────────────────

function MiembrosTab() {
 const [items, setItems] = useState<MemberExtendido[]>([]);
 const [confReset, setConfReset] = useState<MemberExtendido | null>(null);
 const [confEliminarM, setConfEliminarM] = useState<MemberExtendido | null>(null);
 const [passModal, setPassModal] = useState<MemberExtendido | null>(null);
 const [nuevaPass, setNuevaPass] = useState("");
 const { toast, mostrar, cerrar } = useToast();

 const cargar = async () => {
 const r = await api.membersAll();
 if (r.ok && r.data) setItems((r.data as { members: MemberExtendido[] }).members);
 };
 useEffect(() => { cargar(); }, []);

 const toggleActivo = async (m: MemberExtendido) => {
 await api.adminUpdate("members", m.id, { activo: !m.activo });
 cargar();
 };

 const resetUser = async (m: MemberExtendido) => {
 setConfReset(null);
 const r = await api.adminResetUser(m.id);
 if (r.ok) {
 const rep = (r.data as { report: Record<string, number> }).report;
 mostrar("success", `Reset completado. Pedidos: ${rep.pedidos_removed} · Lotes: ${rep.lotes_removed} · Ratings: ${rep.ratings_removed} · Chats: ${rep.chats_removed}`);
 } else {
 mostrar("error", r.error || "Error");
 }
 cargar();
 };

 const eliminarM = async (m: MemberExtendido) => {
 setConfEliminarM(null);
 await api.adminDelete("members", m.id);
 cargar();
 };

 const resetPass = async (m: MemberExtendido) => {
 const nueva = nuevaPass.trim();
 if (nueva.length < 6) { mostrar("error", "Mínimo 6 caracteres."); return; }
 setPassModal(null);
 setNuevaPass("");
 const r = await api.adminChangePassword(m.id, nueva, nueva);
 if (r.ok) {
 mostrar("success", `Contraseña de ${m.nombre} cambiada. Anota la nueva.`);
 } else {
 mostrar("error", r.error || "Error");
 }
 };

 const generarPassTemporal = () => {
 const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
 const bytes = new Uint8Array(12);
 window.crypto.getRandomValues(bytes);
 setNuevaPass(Array.from(bytes, (b) => chars[b % chars.length]).join(""));
 };

 return (
 <div>
 {toast && <Toast {...toast} onCerrar={cerrar} />}
 <Modal
 abierto={confReset !== null}
 onCerrar={() => setConfReset(null)}
 titulo="Reset de datos del miembro"
 descripcion={confReset ? `Esto borrará TODOS los datos de ${confReset.nombre}: pedidos, lotes, ratings, chats. El miembro quedará inactivo.` : undefined}
 pie={
 <>
 <button className="btn-ghost" onClick={() => setConfReset(null)}>Cancelar</button>
 <button className="btn-primary" onClick={() => confReset && resetUser(confReset)}>Borrar y resetear</button>
 </>
 }
 />
 <Modal
 abierto={confEliminarM !== null}
 onCerrar={() => setConfEliminarM(null)}
 titulo="Eliminar miembro"
 descripcion={confEliminarM ? `¿ELIMINAR PERMANENTEMENTE a ${confEliminarM.nombre}? Esta acción no se puede deshacer.` : undefined}
 pie={
 <>
 <button className="btn-ghost" onClick={() => setConfEliminarM(null)}>Cancelar</button>
 <button className="btn-primary" onClick={() => confEliminarM && eliminarM(confEliminarM)}>Eliminar definitivamente</button>
 </>
 }
 />
 <Modal
 abierto={passModal !== null}
 onCerrar={() => { setPassModal(null); setNuevaPass(""); }}
 titulo="Resetear contraseña"
 descripcion={passModal ? `Define una contraseña temporal para ${passModal.nombre}. Entrégala solo por un canal seguro y pide que la cambie al iniciar sesión.` : undefined}
 pie={
 <>
 <button className="btn-ghost" onClick={() => { setPassModal(null); setNuevaPass(""); }}>Cancelar</button>
 <button className="btn-primary" onClick={() => passModal && resetPass(passModal)}>Guardar contraseña</button>
 </>
 }
 >
 <div className="mb-3 flex justify-end">
 <button
 type="button"
 onClick={generarPassTemporal}
 className="rounded-full border border-cafe/25 px-3 py-1.5 text-xs font-semibold text-cafe hover:bg-crema"
 >
 Generar temporal
 </button>
 </div>
 <input
 type="text"
 value={nuevaPass}
 onChange={(e) => setNuevaPass(e.target.value)}
 placeholder="Contraseña temporal"
 className="w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm"
 autoFocus
 />
 </Modal>
 <div className="mb-4">
 <h2 className="font-titulo text-xl font-bold text-cafe">Miembros ({items.length})</h2>
 <p className="text-sm text-pizarra/60">
 Gestiona usuarios. Puedes editar datos, desactivar cuentas, borrar actividad o resetear contraseñas.
 </p>
 </div>
 <div className="overflow-x-auto rounded-2xl border border-cafe/10 bg-white">
 <table className="w-full text-sm">
 <thead className="bg-cafe text-crema">
 <tr>
 <th className="px-3 py-2 text-left">Nombre</th>
 <th className="px-3 py-2 text-left">Email</th>
 <th className="px-3 py-2 text-left">Rol</th>
 <th className="px-3 py-2 text-left">Activo</th>
 <th className="px-3 py-2 text-left">Acciones</th>
 </tr>
 </thead>
 <tbody>
 {items.map((m) => (
 <tr key={m.id} className="border-t border-cafe/5">
 <td className="px-3 py-2 font-semibold text-cafe">{m.nombre}</td>
 <td className="px-3 py-2 text-pizarra/70">{m.email}</td>
 <td className="px-3 py-2"><span className="rounded-full bg-crema px-2 py-0.5 text-xs">{rolesTexto(m)}</span></td>
 <td className="px-3 py-2">
 <button
 onClick={() => toggleActivo(m)}
 className={`min-h-9 rounded-full px-3 py-1.5 text-xs font-semibold ${m.activo !== false ? "bg-hoja/15 text-hoja" : "bg-pizarra/15 text-pizarra/60"}`}
 >
 {m.activo !== false ? " Activo" : "Inactivo"}
 </button>
 </td>
 <td className="px-3 py-2 space-x-1">
 <button onClick={() => setConfReset(m)} className="min-h-9 rounded px-3 py-2 text-xs bg-latte/20 text-cafe hover:bg-latte/30">Reset datos</button>
 <button onClick={() => { setNuevaPass(""); setPassModal(m); }} className="min-h-9 rounded px-3 py-2 text-xs bg-hoja/15 text-hoja hover:bg-hoja/25">Reset contraseña</button>
 <button onClick={() => setConfEliminarM(m)} className="min-h-9 rounded border border-cereza/30 px-3 py-2 text-xs font-semibold text-cereza hover:bg-cereza/10">Eliminar</button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}

// ─── PEDIDOS ──────────────────────────────────────────────────────────────

function PedidosTab() {
 const [items, setItems] = useState<Pedido[]>([]);
 useEffect(() => {
 api.pedidosList("admin", "").then((r) => {
 if (r.ok && r.data) setItems((r.data as { pedidos: Pedido[] }).pedidos);
 });
 }, []);

 return (
 <div>
 <h2 className="mb-4 font-titulo text-xl font-bold text-cafe">Pedidos ({items.length})</h2>
 <div className="overflow-x-auto rounded-2xl border border-cafe/10 bg-white">
 <table className="w-full text-sm">
 <thead className="bg-cafe text-crema">
 <tr>
 <th className="px-3 py-2 text-left">Nro</th>
 <th className="px-3 py-2 text-left">Producto</th>
 <th className="px-3 py-2 text-left">Sacos</th>
 <th className="px-3 py-2 text-left">Total</th>
 <th className="px-3 py-2 text-left">Estado</th>
 <th className="px-3 py-2 text-left">Fecha</th>
 </tr>
 </thead>
 <tbody>
 {items.map((p) => (
 <tr key={p.nro} className="border-t border-cafe/5">
 <td className="px-3 py-2 font-semibold text-cafe">#{p.nro}</td>
 <td className="px-3 py-2">{p.productor}</td>
 <td className="px-3 py-2">{p.sacos}</td>
 <td className="px-3 py-2 font-bold text-cereza">${p.total.toFixed(2)}</td>
 <td className="px-3 py-2"><span className="rounded-full bg-crema px-2 py-0.5 text-xs">{p.estado}</span></td>
 <td className="px-3 py-2 text-xs text-pizarra/60">{p.fecha}</td>
 </tr>
 ))}
{items.length === 0 && (
  <tr><td colSpan={6} className="px-3 py-6"><EstadoVacio titulo="Sin pedidos aún" descripcion="Cuando se registren pedidos, aparecerán aquí." /></td></tr>
  )}
 </tbody>
 </table>
 </div>
 </div>
 );
}

// ─── ÓRDENES DE SERVICIOS ────────────────────────────────────────────────

interface OrdenServicio {
 nro: number;
 servicio_id: string;
 servicio_nombre: string;
 precio: number;
 moneda: string;
 usuario_id: string;
 usuario_nombre: string;
 usuario_email: string;
 metodo_pago?: string;
 referencia_pago?: string;
 paypal_order_id?: string;
 estado: string;
 created_at: string;
 pagado_at?: string;
 completado_at?: string;
}

function OrdenesAdminTab() {
 const [items, setItems] = useState<OrdenServicio[]>([]);
 const [filtro, setFiltro] = useState<"todos" | "pendiente" | "pagado" | "completado">("todos");
 const [confMarcar, setConfMarcar] = useState<{ nro: number; accion: "pagado" | "completado" } | null>(null);
 const { toast, mostrar, cerrar } = useToast();

 const cargar = async () => {
  const r = await api.ordenAll();
  if (r.ok && r.data) setItems((r.data as { ordenes: OrdenServicio[] }).ordenes);
 };
 useEffect(() => { cargar(); }, []);

 const marcarPagado = async (nro: number) => {
  setConfMarcar(null);
  const r = await api.ordenMarcarPagado(nro, "Verificado por admin");
  if (r.ok) mostrar("success", `Orden #${nro} marcada como pagada.`);
  else mostrar("error", r.error || "Error");
  cargar();
 };

 const marcarCompletado = async (nro: number) => {
  setConfMarcar(null);
  const r = await api.ordenMarcarCompletado(nro);
  if (r.ok) mostrar("success", `Orden #${nro} marcada como completada.`);
  else mostrar("error", r.error || "Error");
  cargar();
 };

 const filtered = filtro === "todos" ? items : items.filter((o) => o.estado === filtro);

 const estadoColor = (e: string) => {
  if (e === "pagado") return "bg-hoja/15 text-hoja";
  if (e === "completado") return "bg-cereza/15 text-cereza";
  return "bg-latte/15 text-cafe";
 };

 return (
  <div>
   {toast && <Toast {...toast} onCerrar={cerrar} />}
   <Modal
    abierto={confMarcar !== null}
    onCerrar={() => setConfMarcar(null)}
    titulo={confMarcar?.accion === "pagado" ? "Marcar como pagado" : "Marcar como completado"}
    descripcion={confMarcar ? `¿Marcar la orden #${confMarcar.nro} como ${confMarcar.accion}?` : undefined}
    pie={
     <>
      <button className="btn-ghost" onClick={() => setConfMarcar(null)}>Cancelar</button>
      <button
       className="btn-primary"
       onClick={() => confMarcar && (confMarcar.accion === "pagado" ? marcarPagado(confMarcar.nro) : marcarCompletado(confMarcar.nro))}
      >
       Confirmar
      </button>
     </>
    }
   />
   <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
     <h2 className="font-titulo text-xl font-bold text-cafe">Órdenes de servicio ({items.length})</h2>
     <p className="text-sm text-pizarra/60">Gestiona las solicitudes de servicios pagados.</p>
    </div>
    <div className="flex gap-2">
     {(["todos", "pendiente", "pagado", "completado"] as const).map((f) => (
      <button
       key={f}
       onClick={() => setFiltro(f)}
       className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
        filtro === f ? "bg-cafe text-crema" : "border border-cafe/20 bg-white text-cafe"
       }`}
      >
       {f}
      </button>
     ))}
    </div>
   </div>

   <div className="overflow-x-auto rounded-2xl border border-cafe/10 bg-white">
    <table className="w-full text-sm">
     <thead className="bg-cafe text-crema">
      <tr>
       <th className="px-3 py-2 text-left">Nro</th>
       <th className="px-3 py-2 text-left">Servicio</th>
       <th className="px-3 py-2 text-left">Usuario</th>
       <th className="px-3 py-2 text-left">Método</th>
       <th className="px-3 py-2 text-left">Precio</th>
       <th className="px-3 py-2 text-left">Estado</th>
       <th className="px-3 py-2 text-left">Acciones</th>
      </tr>
     </thead>
     <tbody>
      {filtered.map((o) => (
       <tr key={o.nro} className="border-t border-cafe/5">
        <td className="px-3 py-2 font-semibold text-cafe">#{o.nro}</td>
        <td className="px-3 py-2">{o.servicio_nombre}</td>
        <td className="px-3 py-2">
         <span className="font-semibold">{o.usuario_nombre}</span>
         <br />
         <span className="text-xs text-pizarra/50">{o.usuario_email}</span>
        </td>
        <td className="px-3 py-2">
         <span className={`rounded-full px-2 py-0.5 text-xs ${o.metodo_pago === "paypal" ? "bg-blue-100 text-blue-700" : "bg-crema text-pizarra/70"}`}>
          {o.metodo_pago === "paypal" ? "PayPal" : "Transferencia"}
         </span>
        </td>
        <td className="px-3 py-2 font-bold text-cereza">${o.precio}</td>
        <td className="px-3 py-2">
         <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estadoColor(o.estado)}`}>
          {o.estado}
         </span>
        </td>
        <td className="px-3 py-2 space-x-1">
         {o.estado === "pendiente" && (
          <button onClick={() => setConfMarcar({ nro: o.nro, accion: "pagado" })} className="min-h-9 rounded px-3 py-2 text-xs bg-hoja/15 text-hoja hover:bg-hoja/25">
           Marcar pagado
          </button>
         )}
         {o.estado === "pagado" && (
          <button onClick={() => setConfMarcar({ nro: o.nro, accion: "completado" })} className="min-h-9 rounded px-3 py-2 text-xs bg-hoja/15 text-hoja hover:bg-hoja/25">
           Completar
          </button>
         )}
        </td>
       </tr>
      ))}
      {filtered.length === 0 && (
       <tr><td colSpan={7} className="px-3 py-6 text-center text-pizarra/50">Sin órdenes en este filtro.</td></tr>
      )}
     </tbody>
     </table>
    </div>
   </div>
  );
 }

// ─── COTIZACIONES ─────────────────────────────────────────────────────────

function CotizacionesAdminTab() {
 const [items, setItems] = useState<Array<{ nro: number; solicitante_nombre: string; destinatario_nombre: string; estado: string; precio_total: number | null; created_at: string }>>([]);
 const [filtro, setFiltro] = useState<"todos" | "solicitada" | "enviada" | "aceptada" | "rechazada">("todos");
 const { toast, mostrar, cerrar } = useToast();

 const cargar = async () => {
  const r = await api.cotizacionAll();
  if (r.ok && r.data) setItems((r.data as { cotizaciones: typeof items }).cotizaciones);
 };
 useEffect(() => { cargar(); }, []);

 const filtered = filtro === "todos" ? items : items.filter((c) => c.estado === filtro);

 const estadoColor = (e: string) => {
  if (e === "solicitada") return "bg-crema text-pizarra/70";
  if (e === "enviada") return "bg-blue-100 text-blue-700";
  if (e === "aceptada") return "bg-hoja/15 text-hoja";
  if (e === "rechazada") return "bg-cereza/15 text-cereza";
  return "bg-pizarra/10 text-pizarra/50";
 };

 return (
  <div>
   {toast && <Toast {...toast} onCerrar={cerrar} />}
   <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
     <h2 className="font-titulo text-xl font-bold text-cafe">Cotizaciones ({items.length})</h2>
     <p className="text-sm text-pizarra/60">Todas las cotizaciones entre usuarios.</p>
    </div>
    <div className="flex gap-2">
     {(["todos", "solicitada", "enviada", "aceptada", "rechazada"] as const).map((f) => (
      <button
       key={f}
       onClick={() => setFiltro(f)}
       className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
        filtro === f ? "bg-cafe text-crema" : "border border-cafe/20 bg-white text-cafe"
       }`}
      >
       {f}
      </button>
     ))}
    </div>
   </div>

   <div className="overflow-x-auto rounded-2xl border border-cafe/10 bg-white">
    <table className="w-full text-sm">
     <thead className="bg-cafe text-crema">
      <tr>
       <th className="px-3 py-2 text-left">Nro</th>
       <th className="px-3 py-2 text-left">Solicitante</th>
       <th className="px-3 py-2 text-left">Destinatario</th>
       <th className="px-3 py-2 text-left">Estado</th>
       <th className="px-3 py-2 text-left">Precio</th>
       <th className="px-3 py-2 text-left">Fecha</th>
      </tr>
     </thead>
     <tbody>
      {filtered.map((c) => (
       <tr key={c.nro} className="border-t border-cafe/5">
        <td className="px-3 py-2 font-semibold text-cafe">#{c.nro}</td>
        <td className="px-3 py-2">{c.solicitante_nombre}</td>
        <td className="px-3 py-2">{c.destinatario_nombre}</td>
        <td className="px-3 py-2">
         <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estadoColor(c.estado)}`}>
          {c.estado}
         </span>
        </td>
        <td className="px-3 py-2 font-bold text-cereza">
         {c.precio_total ? `$${c.precio_total.toFixed(2)}` : "—"}
        </td>
        <td className="px-3 py-2 text-xs text-pizarra/50">
         {new Date(c.created_at).toLocaleDateString("es-EC")}
        </td>
       </tr>
      ))}
      {filtered.length === 0 && (
       <tr><td colSpan={6} className="px-3 py-6 text-center text-pizarra/50">Sin cotizaciones en este filtro.</td></tr>
      )}
     </tbody>
    </table>
   </div>
  </div>
 );
}

// ─── MEDIA (videos y reportajes) ───────────────────────────────────────────

function CertificacionesAdminTab() {
 const [certs, setCerts] = useState<Certificado[]>([]);
 const [filtro, setFiltro] = useState<"todas" | "pendiente" | "emitido">("todas");

 useEffect(() => {
 setCerts(leerCertificados());
 }, []);

 const emitir = (c: Certificado) => {
 setCerts(emitirCertificado(c.id, "Admin de la Red", "Ente verificador de la Red"));
 };
 const rechazar = (c: Certificado) => {
 setCerts(rechazarCertificado(c.id, "No cumple los criterios de la Red"));
 };

 const visibles = certs.filter((c) =>
 filtro === "todas" ? true : c.estado === filtro
 );

 return (
 <div>
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <p className="text-lg font-semibold text-cafe"> Certificaciones de la Red</p>
 <p className="text-sm text-pizarra/60">
 Supervisión de todas las solicitudes y certificados emitidos (EUDR, catación, verificación).
 </p>
 </div>
 <div className="flex gap-2">
 {(["todas", "pendiente", "emitido"] as const).map((f) => (
 <button
 key={f}
 onClick={() => setFiltro(f)}
 className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
 filtro === f ? "bg-cafe text-crema" : "border border-cafe/20 bg-white text-cafe"
 }`}
 >
 {f}
 </button>
 ))}
 </div>
 </div>

{visibles.length === 0 ? (
  <div className="mt-4">
  <EstadoVacio titulo="No hay certificaciones" descripcion={filtro === "todas" ? "Aún no hay certificaciones registradas." : `No hay certificaciones en estado «${filtro}».`} />
  </div>
  ) : (
 <div className="mt-4 space-y-3">
 {visibles.map((c) => {
 const st = etiquetaEstado(c.estado);
 return (
 <div key={c.id} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="font-semibold text-cafe">{c.titulo} · {c.lote}</p>
 <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.clase}`}>{st.texto}</span>
 </div>
 <p className="mt-1 text-xs text-pizarra/60">
 N.º {c.numero} · Solicitante: {c.solicitante} ({c.email}) · {c.finca}, {c.provincia}
 </p>
 <p className="mt-0.5 text-xs text-pizarra/50">
 Solicitado {formatearFecha(c.fechaSolicitud)}
 {c.estado === "emitido" && ` · Emisor: ${c.emisor} (${c.emisorCredencial}) · Emitido ${formatearFecha(c.fechaEmision)}`}
 {c.notas && ` · Notas: ${c.notas}`}
 </p>
 {(c.estado === "pendiente" || c.estado === "en_revision") && (
 <div className="mt-3 flex gap-2">
 <button onClick={() => emitir(c)} className="rounded-full bg-hoja px-4 py-1.5 text-xs font-semibold text-crema hover:bg-hoja/90">
 Emitir
 </button>
 <button onClick={() => rechazar(c)} className="rounded-full bg-cereza px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cereza/90">
 Rechazar
 </button>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}

function MediaAdminTab() {
 const [items, setItems] = useState<Record<string, unknown>[]>([]);
 const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
 const [form, setForm] = useState<Record<string, string>>({});
 const [confEliminarMedia, setConfEliminarMedia] = useState<string | null>(null);
 const { toast, mostrar, cerrar } = useToast();

 const cargar = async () => {
 const r = await api.mediaList();
 if (r.ok && r.data) setItems(((r.data as { items: Record<string, unknown>[] }).items) || []);
 };
 useEffect(() => { cargar(); }, []);

 const startEdit = (it: Record<string, unknown>) => {
 setEdit(it);
 const f: Record<string, string> = {};
 for (const k of ["id", "tipo", "titulo", "descripcion", "embed", "thumbnail", "imagen", "autor", "fecha", "categoria", "tags", "cuerpo"]) {
 const v = it[k];
 if (Array.isArray(v)) f[k] = v.join(",");
 else f[k] = v !== null && v !== undefined ? String(v) : "";
 }
 setForm(f);
 };

 const guardar = async () => {
 if (!edit) return;
 const data: Record<string, unknown> = { ...form };
 if (form.tags) data.tags = form.tags.split(",").map((s) => s.trim()).filter(Boolean);
 delete data.redes; // se omite en admin simple
 await api.adminUpdate("media", String(edit.id), data);
 setEdit(null);
 cargar();
 };

 const eliminar = async (id: string) => {
 setConfEliminarMedia(null);
 const r = await api.adminDelete("media", id);
 if (!r.ok) mostrar("error", r.error || "Error");
 cargar();
 };

 return (
 <div>
 {toast && <Toast {...toast} onCerrar={cerrar} />}
 <Modal
 abierto={confEliminarMedia !== null}
 onCerrar={() => setConfEliminarMedia(null)}
 titulo="Confirmar eliminación"
 descripcion={`¿Eliminar el elemento de media «${confEliminarMedia ?? ""}»?`}
 pie={
 <>
 <button className="btn-ghost" onClick={() => setConfEliminarMedia(null)}>Cancelar</button>
 <button className="btn-primary" onClick={() => eliminar(confEliminarMedia!)}>Eliminar</button>
 </>
 }
 />
 <h2 className="mb-4 font-titulo text-xl font-bold text-cafe">Media (videos y reportajes)</h2>

 {edit && (
 <div className="mb-4 rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Editar: {String(edit.id)}</p>
 <div className="mt-3 grid gap-3 sm:grid-cols-2">
 {["titulo", "descripcion", "embed", "thumbnail", "imagen", "autor", "fecha", "categoria", "tags", "cuerpo"].map((k) => (
 <div key={k} className={(k === "descripcion" || k === "cuerpo") ? "sm:col-span-2" : ""}>
 <label className="block text-xs font-semibold text-pizarra/60">{k}</label>
 {k === "descripcion" || k === "cuerpo" ? (
 <textarea value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} rows={k === "cuerpo" ? 6 : 2} className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 ) : (
 <input value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 )}
 </div>
 ))}
 </div>
 <div className="mt-4 flex gap-2">
 <button onClick={guardar} className="rounded-full bg-hoja px-5 py-2 text-sm font-semibold text-crema hover:bg-hoja/90">Guardar</button>
 <button onClick={() => setEdit(null)} className="rounded-full border border-cafe/30 px-5 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">Cancelar</button>
 </div>
 </div>
 )}

 <div className="grid gap-3 lg:grid-cols-2">
 {items.map((it) => (
 <div key={String(it.id)} className="rounded-2xl border border-cafe/10 bg-white p-4">
 <div className="flex items-start justify-between gap-2">
 <div>
 <span className="rounded-full bg-cereza/15 px-2 py-0.5 text-xs font-semibold text-cereza">{String(it.tipo ?? "")}</span>
 <p className="mt-1 font-titulo font-bold text-cafe">{String(it.titulo ?? "")}</p>
 <p className="text-xs text-pizarra/60">{String(it.categoria ?? "")} · {String(it.fecha ?? "")}</p>
 </div>
 <div className="flex gap-1">
 <button onClick={() => startEdit(it)} aria-label="Editar" className="grid min-h-9 min-w-9 place-items-center rounded bg-hoja/15 text-hoja"><span aria-hidden="true" className="block h-3 w-3 rounded-sm border border-hoja"></span></button>
 <button onClick={() => setConfEliminarMedia(String(it.id))} aria-label="Eliminar" className="grid min-h-9 min-w-9 place-items-center rounded border border-cereza/30 text-cereza"><span aria-hidden="true" className="block h-3 w-3 rounded-full border border-cereza"></span></button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

// ─── IMÁGENES (huecos de la plataforma) ────────────────────────────────────

interface SlotCatalogado {
  id: string;
  nombre: string;
  proporcion: string;
  ancho_max: number;
  ambito: string;
  lamina: string | null;
  peso_max_kb: number;
}

interface ItemInventario {
  slot: string;
  recurso: string | null;
  url: string;
  peso: number;
  peso_kb: number;
  ancho: number | null;
  alto: number | null;
  subido_por: string;
  nombre_subio: string;
  fecha: string;
}

const LAMINAS_DE_HUECO: Record<string, React.ReactNode> = {
  "hero-finca": <FincaTerrazas />,
  "secado-camas": <CamasSecado />,
  "taza-cata": <TazaCenital />,
  "saco-exportacion": <SacoExportacion />,
  "cereza-madura": <CerezaMadura />,
};

function ImagenesAdminTab() {
  const [datos, setDatos] = useState<{ slots: Record<string, SlotCatalogado>; inventario: Record<string, ItemInventario> } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [confRestaurar, setConfRestaurar] = useState<string | null>(null);
  const { toast, mostrar, cerrar } = useToast();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch(CONFIG.api("/api/imagenes.php?action=listar"), { credentials: "include" });
      const j = await r.json().catch(() => null);
      if (j && j.ok) {
        setDatos({ slots: j.data.slots ?? {}, inventario: j.data.inventario ?? {} });
      } else {
        setDatos(null);
        setError(j?.error ?? "Error cargando el inventario de imágenes.");
      }
    } catch {
      setDatos(null);
      setError("Error de red.");
    }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const elegirArchivo = (slotId: string) => {
    fileRefs.current[slotId]?.click();
  };

  const subir = async (slotId: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      mostrar("error", "La imagen supera el máximo de 2 MB.");
      return;
    }
    setSubiendo(slotId);
    const fd = new FormData();
    fd.append("slot", slotId);
    fd.append("archivo", file);
    try {
      const r = await fetch(CONFIG.api("/api/imagenes.php?action=subir"), {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = await r.json().catch(() => null);
      if (j && j.ok) mostrar("success", "Imagen actualizada.");
      else mostrar("error", j?.error ?? "Error subiendo la imagen.");
    } catch {
      mostrar("error", "Error de red.");
    }
    setSubiendo(null);
    await cargar();
  };

  const restaurar = async (slotId: string) => {
    setConfRestaurar(null);
    const fd = new FormData();
    fd.append("slot", slotId);
    try {
      const r = await fetch(CONFIG.api("/api/imagenes.php?action=borrar"), {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = await r.json().catch(() => null);
      if (j && j.ok) mostrar("success", "Lámina restaurada.");
      else mostrar("error", j?.error ?? "Error restaurando la lámina.");
    } catch {
      mostrar("error", "Error de red.");
    }
    await cargar();
  };

  const slotsPlataforma = Object.values(datos?.slots ?? {}).filter((s) => s.ambito === "plataforma");

  return (
    <div>
      {toast && <Toast {...toast} onCerrar={cerrar} />}
      <Modal
        abierto={confRestaurar !== null}
        onCerrar={() => setConfRestaurar(null)}
        titulo="Restaurar lámina"
        descripcion="Esto borrará la imagen subida y volverá a mostrarse la lámina SVG original del hueco."
        pie={
          <>
            <button className="btn-ghost" onClick={() => setConfRestaurar(null)}>Cancelar</button>
            <button className="btn-primary" onClick={() => restaurar(confRestaurar!)}>Restaurar lámina</button>
          </>
        }
      />
      <div className="mb-4">
        <h2 className="font-titulo text-xl font-bold text-cafe">Imágenes de la plataforma</h2>
        <p className="text-sm text-pizarra/60">
          Sustituye las láminas de la portada por fotografías reales. Cada hueco tiene una
          proporción fija (no descuadra la maqueta) y un máximo de 2 MB por imagen.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-cereza/10 p-3 text-sm text-cereza">{error}</p>
      )}

      {cargando ? (
        <Skeleton variante="linea" className="w-2/3" />
      ) : slotsPlataforma.length === 0 ? (
        <EstadoVacio titulo="Sin huecos definidos" descripcion="Cada hueco se define en public/data/slots.json." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {slotsPlataforma.map((slot) => {
            const inv = datos!.inventario[slot.id];
            const [rw, rh] = slot.proporcion.split(":").map((v) => parseFloat(v));
            const aspect = rw && rh ? `${rw} / ${rh}` : "1 / 1";
            return (
              <div key={slot.id} className="overflow-hidden rounded-2xl border border-cafe/10 bg-white">
                <div className="bg-crema/60" style={{ aspectRatio: aspect }}>
                  {inv ? (
                    <img
                      src={CONFIG.api(inv.url)}
                      alt={slot.nombre}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full">{LAMINAS_DE_HUECO[slot.id] ?? null}</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-titulo font-bold text-cafe">{slot.nombre}</p>
                      <p className="text-xs text-pizarra/60">
                        Proporción {slot.proporcion} · Máximo {slot.peso_max_kb / 1024} MB ·{" "}
                        {slot.lamina ? `Lámina: ${slot.lamina}` : "Sin lámina"}
                      </p>
                    </div>
                    {inv && (
                      <button
                        onClick={() => setConfRestaurar(slot.id)}
                        className="rounded-full border border-cereza/30 px-3 py-1 text-xs font-semibold text-cereza hover:bg-cereza hover:text-crema"
                      >
                        Restaurar lámina
                      </button>
                    )}
                  </div>
                  {inv && (
                    <p className="mt-2 text-xs text-pizarra/50">
                      Subida el {inv.fecha} por {inv.nombre_subio} · {inv.peso_kb} KB
                    </p>
                  )}
                  <div className="mt-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      ref={(el) => { fileRefs.current[slot.id] = el; }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) subir(slot.id, f);
                      }}
                    />
                    <button
                      onClick={() => elegirArchivo(slot.id)}
                      disabled={subiendo !== null}
                      className="rounded-full bg-cereza px-4 py-2 text-sm font-semibold text-crema hover:bg-cereza/90 disabled:opacity-50"
                    >
                      {subiendo === slot.id ? "Subiendo…" : inv ? "Sustituir imagen" : "Subir imagen"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PÁGINAS (markdown) ──────────────────────────────────────────────────

function PaginasAdminTab() {
 const [items, setItems] = useState<Record<string, unknown>[]>([]);
 const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
 const [form, setForm] = useState<{ slug: string; titulo: string; resumen: string; orden: string; publicado: boolean; contenido: string }>({
 slug: "", titulo: "", resumen: "", orden: "99", publicado: true, contenido: ""
 });
 const [confEliminarSlug, setConfEliminarSlug] = useState<string | null>(null);
 const { toast, mostrar, cerrar } = useToast();

 const cargar = async () => {
 const r = await api.adminList("paginas");
 if (r.ok && r.data) setItems(((r.data as { paginas: Record<string, unknown>[] }).paginas) || []);
 };
 useEffect(() => { cargar(); }, []);

 const startEdit = (it: Record<string, unknown>) => {
 setEdit(it);
 setForm({
 slug: String(it.slug ?? ""),
 titulo: String(it.titulo ?? ""),
 resumen: String(it.resumen ?? ""),
 orden: String(it.orden ?? 99),
 publicado: Boolean(it.publicado ?? true),
 contenido: String(it.contenido ?? ""),
 });
 };

 const startNew = () => {
 setEdit({});
 setForm({ slug: "", titulo: "", resumen: "", orden: "99", publicado: true, contenido: "# Nueva página\n\nContenido..." });
 };

 const guardar = async () => {
 if (!form.slug) { mostrar("error", "Slug requerido"); return; }
 if (edit && Object.keys(edit).length > 0) {
 await api.adminUpdate("paginas", form.slug, form);
 } else {
 await api.adminCreate("paginas", form);
 }
 setEdit(null);
 cargar();
 };

 const eliminar = async (slug: string) => {
 setConfEliminarSlug(null);
 const r = await api.adminDelete("paginas", slug);
 if (!r.ok) mostrar("error", r.error || "Error");
 cargar();
 };

 return (
 <div>
 {toast && <Toast {...toast} onCerrar={cerrar} />}
 <Modal
 abierto={confEliminarSlug !== null}
 onCerrar={() => setConfEliminarSlug(null)}
 titulo="Eliminar página"
 descripcion={confEliminarSlug ? `¿Eliminar la página «${confEliminarSlug}»? Esta acción no se puede deshacer.` : undefined}
 pie={
 <>
 <button className="btn-ghost" onClick={() => setConfEliminarSlug(null)}>Cancelar</button>
 <button className="btn-primary" onClick={() => eliminar(confEliminarSlug!)}>Eliminar</button>
 </>
 }
 />
 <div className="mb-4 flex items-center justify-between">
 <h2 className="font-titulo text-xl font-bold text-cafe">Páginas (markdown)</h2>
 <button onClick={startNew} className="rounded-full bg-cereza px-4 py-2 text-sm font-semibold text-crema hover:bg-cereza/90">
 + Nueva página
 </button>
 </div>

 {(edit !== null) && (
 <div className="mb-4 rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="grid gap-3 sm:grid-cols-2">
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Slug (URL)</label>
 <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
 placeholder="terminos-y-condiciones"
 className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Título</label>
 <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
 className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Resumen</label>
 <input value={form.resumen} onChange={(e) => setForm({ ...form, resumen: e.target.value })}
 className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Orden</label>
 <input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })}
 className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 </div>
 <div className="flex items-end">
 <label className="flex items-center gap-2">
 <input type="checkbox" checked={form.publicado}
 onChange={(e) => setForm({ ...form, publicado: e.target.checked })} />
 <span className="text-sm">Publicada</span>
 </label>
 </div>
 </div>
 <div className="mt-3">
 <label className="block text-xs font-semibold text-pizarra/60">Contenido (Markdown)</label>
 <textarea value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })}
 rows={14} className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 font-mono text-sm" />
 </div>
 <div className="mt-4 flex gap-2">
 <button onClick={guardar} className="rounded-full bg-hoja px-5 py-2 text-sm font-semibold text-crema hover:bg-hoja/90">
 Guardar
 </button>
 <button onClick={() => setEdit(null)} className="rounded-full border border-cafe/30 px-5 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Cancelar
 </button>
 </div>
 </div>
 )}

 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {items.map((it) => (
 <div key={String(it.slug)} className="rounded-2xl border border-cafe/10 bg-white p-4">
 <p className="font-titulo font-bold text-cafe">{String(it.titulo ?? "")}</p>
 <p className="text-xs text-pizarra/60">/{String(it.slug ?? "")}</p>
 <p className="mt-1 line-clamp-2 text-sm text-pizarra/70">{String(it.resumen ?? "")}</p>
 <p className="mt-1 text-xs">
 <span className={`rounded-full px-2 py-0.5 ${it.publicado ? "bg-hoja/15 text-hoja" : "bg-pizarra/15 text-pizarra/60"}`}>
 {it.publicado ? " Publicada" : "Borrador"}
 </span>
 <span className="ml-1 text-pizarra/40">orden {String(it.orden ?? 99)}</span>
 </p>
 <div className="mt-3 flex gap-1">
 <button onClick={() => startEdit(it)} className="min-h-9 rounded px-3 py-2 text-xs bg-hoja/15 text-hoja"> Editar</button>
 <button onClick={() => setConfEliminarSlug(String(it.slug))} aria-label="Eliminar" className="grid min-h-9 min-w-9 place-items-center rounded border border-cereza/30 text-cereza"><span aria-hidden="true" className="block h-3 w-3 rounded-full border border-cereza"></span></button>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

// ─── EDITOR VISUAL CONTROLADO ────────────────────────────────────────────

type VisualConfig = {
 version?: number;
 nombre?: string;
 updated_at?: string;
 published_at?: string;
 tokens?: Record<string, string>;
 textos?: { selector: string; texto: string }[];
 imagenes?: { selector: string; src: string; alt?: string }[];
 links?: { selector: string; href: string; texto?: string }[];
 bloques?: Record<string, boolean>;
 css_seguro?: { selector: string; propiedad: string; valor: string }[];
};

const visualInicial: VisualConfig = {
 version: 1,
 nombre: "Tema V60/V74 protegido",
 tokens: {},
 textos: [],
 imagenes: [],
 links: [],
 bloques: {
 marketplace_compacto_seguro: true,
 menu_secundario: true,
 panel_solicitudes_marketplace: true,
 },
 css_seguro: [],
};

const visualTokenDefaults: Record<string, string> = {
 "--color-cafe": "#3B1A0C",
 "--color-cereza": "#8B1E1E",
 "--color-latte": "#C58A3A",
 "--color-crema": "#FFF8E7",
 "--color-hoja": "#2F6B3F",
 "--color-acento-claro": "#EBCB77",
};

function VisualAdminTab() {
 const [config, setConfig] = useState<VisualConfig>(visualInicial);
 const [raw, setRaw] = useState("");
 const [versiones, setVersiones] = useState<Record<string, unknown>[]>([]);
 const [permitidos, setPermitidos] = useState<{ tokens?: string[]; selectores?: string[] }>({});
 const [previewUrl, setPreviewUrl] = useState("/");
 const [previewKey, setPreviewKey] = useState(0);
 const [mensaje, setMensaje] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const { toast, mostrar, cerrar } = useToast();

 const syncRaw = (cfg: VisualConfig) => setRaw(JSON.stringify(cfg, null, 2));

 const cargar = async () => {
  setError(null);
  const r = await api.visualGet();
  if (!r.ok || !r.data) {
   setError(r.error || "No se pudo cargar el editor visual.");
   return;
  }
  const data = r.data as { borrador?: VisualConfig; publicado?: VisualConfig; versiones?: Record<string, unknown>[]; permitidos?: { tokens?: string[]; selectores?: string[] } };
  const cfg = data.borrador || data.publicado || visualInicial;
  setConfig(cfg);
  syncRaw(cfg);
  setVersiones(data.versiones || []);
  setPermitidos(data.permitidos || {});
 };

 useEffect(() => { cargar(); }, []);

 const parseRaw = (): VisualConfig | null => {
  try {
   const parsed = JSON.parse(raw) as VisualConfig;
   setError(null);
   return parsed;
  } catch {
   setError("El JSON del editor visual no es válido.");
   return null;
  }
 };

 const guardarBorrador = async () => {
  const parsed = parseRaw();
  if (!parsed) return;
  const r = await api.visualSaveDraft(parsed as Record<string, unknown>);
  if (!r.ok || !r.data) {
   mostrar("error", r.error || "No se pudo guardar el borrador.");
   return;
  }
  const cfg = ((r.data as { borrador?: VisualConfig }).borrador || parsed);
  setConfig(cfg);
  syncRaw(cfg);
  setMensaje("Borrador guardado. Aún no está publicado.");
 };

 const previsualizar = () => {
  const parsed = parseRaw();
  if (!parsed) return;
  window.sessionStorage.setItem("redcafe_visual_preview", JSON.stringify(parsed));
  setConfig(parsed);
  setPreviewKey((v) => v + 1);
  setMensaje("Vista previa actualizada en este navegador.");
 };

 const limpiarPreview = async () => {
  window.sessionStorage.removeItem("redcafe_visual_preview");
  await cargar();
  setPreviewKey((v) => v + 1);
  setMensaje("Vista previa local desactivada.");
 };

 const publicar = async () => {
  const parsed = parseRaw();
  if (!parsed) return;
  const seguro = window.confirm("Publicar estos cambios visuales en producción? Se guardará una versión anterior para rollback.");
  if (!seguro) return;
  const r = await api.visualPublish(parsed as Record<string, unknown>);
  if (!r.ok || !r.data) {
   mostrar("error", r.error || "No se pudo publicar.");
   return;
  }
  const cfg = ((r.data as { publicado?: VisualConfig }).publicado || parsed);
  window.sessionStorage.removeItem("redcafe_visual_preview");
  setConfig(cfg);
  syncRaw(cfg);
  setMensaje("Cambios publicados.");
  await cargar();
 };

 const rollback = async (id: string) => {
  if (!window.confirm("Restaurar esta versión visual?")) return;
  const r = await api.visualRollback(id);
  if (!r.ok) {
   mostrar("error", r.error || "No se pudo restaurar.");
   return;
  }
  window.sessionStorage.removeItem("redcafe_visual_preview");
  setMensaje("Versión restaurada.");
  await cargar();
  setPreviewKey((v) => v + 1);
 };

 const setToken = (name: string, value: string) => {
  const next = { ...config, tokens: { ...(config.tokens || {}), [name]: value } };
  setConfig(next);
  syncRaw(next);
 };

 const setBloque = (name: string, value: boolean) => {
  const next = { ...config, bloques: { ...(config.bloques || {}), [name]: value } };
  setConfig(next);
  syncRaw(next);
 };

 return (
  <div>
  {toast && <Toast {...toast} onCerrar={cerrar} />}
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
  <div className="space-y-4">
  <div className="rounded-2xl border border-cafe/10 bg-white p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
  <div>
  <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Editor visual seguro</p>
  <h2 className="mt-1 font-titulo text-xl font-bold text-cafe">Tema editable sin rebuild</h2>
  <p className="mt-1 text-sm text-pizarra/70">Edita textos, imágenes, enlaces, colores permitidos y bloques protegidos. El tema V60/V74 queda como base.</p>
  </div>
  <span className="rounded-full bg-crema px-3 py-1 text-xs font-semibold text-cafe">v{String(config.version || 1)}</span>
  </div>
  {mensaje && <p className="mt-3 rounded-lg bg-hoja/10 p-2 text-sm text-hoja">{mensaje}</p>}
  {error && <p className="mt-3 rounded-lg bg-cereza/10 p-2 text-sm text-cereza">{error}</p>}
  </div>

  <div className="rounded-2xl border border-cafe/10 bg-white p-5">
  <h3 className="font-titulo text-lg font-bold text-cafe">Colores permitidos</h3>
  <div className="mt-3 grid gap-3 sm:grid-cols-2">
  {(permitidos.tokens || Object.keys(visualInicial.tokens || {}).concat(["--color-cafe", "--color-cereza", "--color-latte", "--color-crema", "--color-hoja", "--color-acento-claro"])).map((token) => (
  <label key={token} className="text-xs font-semibold text-pizarra/60">
  {token}
  <div className="mt-1 flex gap-2">
  <input type="color" value={(config.tokens && config.tokens[token]) || visualTokenDefaults[token] || "#3B1A0C"} onChange={(e) => setToken(token, e.target.value)} className="h-10 w-12 rounded border border-cafe/20 bg-white" />
  <input value={(config.tokens && config.tokens[token]) || ""} onChange={(e) => setToken(token, e.target.value)} placeholder="#3B1A0C" className="w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
  </div>
  </label>
  ))}
  </div>
  </div>

  <div className="rounded-2xl border border-cafe/10 bg-white p-5">
  <h3 className="font-titulo text-lg font-bold text-cafe">Bloques protegidos</h3>
  <div className="mt-3 grid gap-2 sm:grid-cols-2">
  {Object.entries(config.bloques || visualInicial.bloques || {}).map(([name, value]) => (
  <label key={name} className="flex items-center gap-2 rounded-xl bg-crema p-3 text-sm text-pizarra/80">
  <input type="checkbox" checked={Boolean(value)} onChange={(e) => setBloque(name, e.target.checked)} />
  <span>{name.replaceAll("_", " ")}</span>
  </label>
  ))}
  </div>
  </div>

  <div className="rounded-2xl border border-cafe/10 bg-white p-5">
  <div className="flex flex-wrap items-center justify-between gap-2">
  <h3 className="font-titulo text-lg font-bold text-cafe">Configuración avanzada JSON</h3>
  <button onClick={() => syncRaw(config)} className="rounded-full border border-cafe/30 px-3 py-1.5 text-xs font-semibold text-cafe hover:bg-cafe hover:text-crema">Sincronizar</button>
  </div>
  <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={18} className="mt-3 w-full rounded-xl border border-cafe/20 px-3 py-2 font-mono text-xs" />
  <div className="mt-4 flex flex-wrap gap-2">
  <button onClick={guardarBorrador} className="rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">Guardar borrador</button>
  <button onClick={previsualizar} className="rounded-full bg-latte px-4 py-2 text-sm font-semibold text-cafe hover:bg-latte/90">Previsualizar</button>
  <button onClick={publicar} className="rounded-full bg-hoja px-4 py-2 text-sm font-semibold text-crema hover:bg-hoja/90">Publicar</button>
  <button onClick={limpiarPreview} className="rounded-full bg-cereza/10 px-4 py-2 text-sm font-semibold text-cereza hover:bg-cereza/15">Quitar preview</button>
  </div>
  </div>

  <div className="rounded-2xl border border-cafe/10 bg-white p-5">
  <h3 className="font-titulo text-lg font-bold text-cafe">Versiones publicadas</h3>
  <div className="mt-3 space-y-2">
  {versiones.length === 0 ? <p className="text-sm text-pizarra/60">Aún no hay versiones anteriores.</p> : versiones.slice().reverse().map((v) => (
  <div key={String(v.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cafe/10 p-3">
  <div>
  <p className="text-sm font-semibold text-cafe">{String(v.id)}</p>
  <p className="text-xs text-pizarra/50">{String(v.created_at || "")}</p>
  </div>
  <button onClick={() => rollback(String(v.id))} className="rounded-full border border-cafe/30 px-3 py-1.5 text-xs font-semibold text-cafe hover:bg-cafe hover:text-crema">Restaurar</button>
  </div>
  ))}
  </div>
  </div>
  </div>

  <div className="rounded-2xl border border-cafe/10 bg-white p-5">
  <div className="flex flex-wrap items-center justify-between gap-2">
  <h3 className="font-titulo text-lg font-bold text-cafe">Vista previa</h3>
  <select value={previewUrl} onChange={(e) => { setPreviewUrl(e.target.value); setPreviewKey((v) => v + 1); }} className="rounded-lg border border-cafe/20 px-3 py-2 text-sm">
  <option value="/">Inicio</option>
  <option value="/marketplace/">Marketplace</option>
  <option value="/afiliate/">Registro</option>
  <option value="/panel/">Panel</option>
  <option value="/servicios/">Servicios</option>
  </select>
  </div>
  <div className="mt-3 overflow-hidden rounded-xl border border-cafe/10 bg-crema">
  <iframe key={`${previewUrl}-${previewKey}`} src={previewUrl} title="Vista previa visual" className="h-[680px] w-full bg-white" />
  </div>
  <p className="mt-3 text-xs text-pizarra/60">La vista previa usa sesión local del navegador. Publicar aplica los cambios para todos.</p>
  </div>
  </div>
  </div>
 );
}

// ─── MI CUENTA (cambio de contraseña y recuperación) ──────────────────────

function CuentaAdminTab() {
 const [current, setCurrent] = useState("");
 const [newPass, setNewPass] = useState("");
 const [confirm, setConfirm] = useState("");
 const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
 const [tokenReset, setTokenReset] = useState("");
 const [newResetPass, setNewResetPass] = useState("");

 const cambiar = async (e: React.FormEvent) => {
 e.preventDefault();
 setMsg(null);
 if (newPass.length < 6) { setMsg({ tipo: "err", texto: "Mínimo 6 caracteres." }); return; }
 if (newPass !== confirm) { setMsg({ tipo: "err", texto: "Las contraseñas no coinciden." }); return; }
 const r = await api.adminChangeOwnPassword(current, newPass, confirm);
 if (r.ok) {
 setMsg({ tipo: "ok", texto: " Contraseña cambiada. Vuelve a iniciar sesión." });
 setCurrent(""); setNewPass(""); setConfirm("");
 // Cerrar sesión para forzar re-login
 setTimeout(async () => {
 await api.adminLogout();
 window.location.href = "/admin";
 }, 2000);
 } else {
 setMsg({ tipo: "err", texto: r.error || "Error." });
 }
 };

 const resetEmergencia = async (e: React.FormEvent) => {
 e.preventDefault();
 setMsg(null);
 if (!tokenReset) { setMsg({ tipo: "err", texto: "Ingresa el token de recuperación." }); return; }
 const r = await api.adminResetPassword(tokenReset);
 if (r.ok) {
 setNewResetPass((r.data as { new_password: string }).new_password);
 setMsg({ tipo: "ok", texto: " Contraseña regenerada. Cópiala abajo." });
 } else {
 setMsg({ tipo: "err", texto: r.error || "Token inválido." });
 }
 };

 return (
 <div className="space-y-6">
 {/* Cambiar contraseña actual */}
 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Cambiar contraseña</p>
 <h2 className="font-titulo text-xl font-bold text-cafe">Mi contraseña de admin</h2>
 <p className="mt-1 text-sm text-pizarra/60">
 Cambia la contraseña que usas para entrar al panel. Necesitas conocer la actual.
 </p>

 <form onSubmit={cambiar} className="mt-4 space-y-3 max-w-md">
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Contraseña actual</label>
 <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
 required className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Nueva contraseña (mínimo 6)</label>
 <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
 required minLength={6} className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Confirmar nueva contraseña</label>
 <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
 required className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2" />
 </div>
 <button type="submit" className="rounded-full bg-hoja px-5 py-2.5 text-sm font-semibold text-crema hover:bg-hoja/90">
 Cambiar contraseña
 </button>
 </form>
 </div>

 {msg && (
 <p className={`rounded-lg p-3 text-sm ${msg.tipo === "ok" ? "bg-hoja/15 text-hoja" : "bg-cereza/15 text-cereza"}`}>
 {msg.texto}
 </p>
 )}

 {/* Reset de emergencia */}
 <div className="rounded-2xl border border-cereza/30 bg-cereza/5 p-5">
 <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Recuperación de emergencia</p>
 <h2 className="font-titulo text-xl font-bold text-cafe">Si olvidaste la contraseña</h2>
 <p className="mt-1 text-sm text-pizarra/70">
 Usa el token de recuperación guardado en <code className="rounded bg-crema px-1 text-xs">data/.admin_reset_token</code>.
 Al usarlo se genera una contraseña aleatoria nueva que debes copiar inmediatamente.
 </p>

 <form onSubmit={resetEmergencia} className="mt-4 space-y-3 max-w-md">
 <div>
 <label className="block text-xs font-semibold text-pizarra/60">Token de recuperación</label>
 <input value={tokenReset} onChange={(e) => setTokenReset(e.target.value)}
 placeholder="64 caracteres hexadecimales" className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 font-mono text-xs" />
 </div>
 <button type="submit" className="rounded-full bg-cereza px-5 py-2.5 text-sm font-semibold text-crema hover:bg-cereza/90">
 Generar contraseña nueva
 </button>
 </form>

 {newResetPass && (
 <div className="mt-4 rounded-lg border-2 border-latte bg-latte/10 p-4">
 <p className="text-sm font-semibold text-cafe"> Tu nueva contraseña admin:</p>
 <p className="mt-2 select-all break-all rounded bg-crema p-3 font-mono text-base font-bold text-cafe">
 {newResetPass}
 </p>
 <p className="mt-2 text-xs text-pizarra/70">
 Cópiala ahora. Se muestra solo esta vez. Si la pierdes, repite el proceso.
 </p>
 </div>
 )}
 </div>

 {/* Gestión de miembros - reset password */}
 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">Resetear contraseña de un miembro</p>
 <h2 className="font-titulo text-xl font-bold text-cafe">Cambiar contraseña a cualquier usuario</h2>
 <p className="mt-1 text-sm text-pizarra/60">
 Ve al tab <strong>"Miembros"</strong>, selecciona el usuario y usa el botón " Reset pass".
 </p>
 </div>
 </div>
 );
}
