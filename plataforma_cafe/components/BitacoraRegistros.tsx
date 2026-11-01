"use client";

import { useMemo, useState } from "react";
import { agregarRegistro, eliminarRegistro, exportarCSV, leerRegistros, type Registro, type TipoRegistro } from "@/lib/registros";
import { Modal } from "@/components/Modal";
import { EstadoVacio } from "@/components/EstadoVacio";

const TIPOS_LABEL: Record<TipoRegistro, string> = {
 produccion: "Producción",
 venta: "Venta",
 compra: "Compra",
 tostado: "Tostado",
 siembra: "Siembra",
 limpieza: "Limpieza",
 costo: "Costo",
 turno: "Turno",
 menu: "Menú",
 pedido: "Pedido",
 lote: "Lote",
 asistencia: "Asistencia",
 capacitacion: "Capacitación",
 nota: "Nota",
 otro: "Otro",
};

const TIPOS_COLOR: Record<TipoRegistro, string> = {
 produccion: "bg-hoja/20 text-hoja",
 venta: "bg-cereza/15 text-cereza",
 compra: "bg-latte/25 text-pizarra",
 tostado: "bg-cafe/15 text-cafe",
 siembra: "bg-hoja/20 text-hoja",
 limpieza: "bg-cafe/10 text-cafe",
 costo: "bg-cereza/10 text-cereza",
 turno: "bg-latte/20 text-pizarra",
 menu: "bg-hoja/15 text-hoja",
 pedido: "bg-latte/30 text-pizarra",
 lote: "bg-cafe/15 text-cafe",
 asistencia: "bg-hoja/10 text-hoja",
 capacitacion: "bg-cafe/10 text-cafe",
 nota: "bg-pizarra/10 text-pizarra",
 otro: "bg-pizarra/10 text-pizarra",
};

interface Props {
 perfil: Registro["perfil"];
 tiposVisibles?: TipoRegistro[];
 titulo?: string;
 compacto?: boolean;
}

export function BitacoraRegistros({ perfil, tiposVisibles, titulo = "Bitácora de registros", compacto }: Props) {
 const [version, setVersion] = useState(0);
 const [filtroTipo, setFiltroTipo] = useState<TipoRegistro | "todos">("todos");
 const [busqueda, setBusqueda] = useState("");
 const [desde, setDesde] = useState("");
 const [hasta, setHasta] = useState("");
 const [nuevoTipo, setNuevoTipo] = useState<TipoRegistro>("nota");
 const [nuevoAccion, setNuevoAccion] = useState("");
 const [nuevoCantidad, setNuevoCantidad] = useState("");
 const [nuevoUnidad, setNuevoUnidad] = useState("");
 const [nuevoMonto, setNuevoMonto] = useState("");
 const [openForm, setOpenForm] = useState(false);
 const [confEliminarId, setConfEliminarId] = useState<string | null>(null);

 const refresh = () => setVersion((v) => v + 1);

 const registros = useMemo(() => {
 let lista = leerRegistros().filter((r) => r.perfil === perfil);
 if (tiposVisibles) lista = lista.filter((r) => tiposVisibles.includes(r.tipo));
 if (filtroTipo !== "todos") lista = lista.filter((r) => r.tipo === filtroTipo);
 if (busqueda.trim()) {
 const q = busqueda.toLowerCase();
 lista = lista.filter((r) => r.accion.toLowerCase().includes(q));
 }
 if (desde) lista = lista.filter((r) => r.fecha >= desde);
 if (hasta) lista = lista.filter((r) => r.fecha <= hasta);
 return lista.sort((a, b) => b.ts - a.ts);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [version, filtroTipo, busqueda, desde, hasta, perfil, tiposVisibles?.join("|")]);

 const tiposDisponibles = tiposVisibles ?? (Object.keys(TIPOS_LABEL) as TipoRegistro[]);

 const onAgregar = (e: React.FormEvent) => {
 e.preventDefault();
 if (!nuevoAccion.trim()) return;
 agregarRegistro({
 perfil,
 tipo: nuevoTipo,
 accion: nuevoAccion.trim(),
 cantidad: nuevoCantidad ? parseFloat(nuevoCantidad) : undefined,
 unidad: nuevoUnidad || undefined,
 monto: nuevoMonto ? parseFloat(nuevoMonto) : undefined,
 });
 setNuevoAccion(""); setNuevoCantidad(""); setNuevoUnidad(""); setNuevoMonto("");
 setOpenForm(false);
 refresh();
 };

 const confirmarEliminar = () => {
 if (confEliminarId) {
 eliminarRegistro(confEliminarId);
 setConfEliminarId(null);
 refresh();
 }
 };

 return (
 <div className="rounded-2xl border border-cafe/10 bg-white p-5">
 <Modal
 abierto={confEliminarId !== null}
 onCerrar={() => setConfEliminarId(null)}
 titulo="Eliminar registro"
 descripcion="¿Eliminar este registro de la bitácora? Esta acción no se puede deshacer."
 pie={
 <>
 <button className="btn-ghost" onClick={() => setConfEliminarId(null)}>Cancelar</button>
 <button className="btn-primary" onClick={confirmarEliminar}>Eliminar</button>
 </>
 }
 />
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <p className="font-titulo text-lg font-bold text-cafe">{titulo}</p>
 <p className="text-xs text-pizarra/60">
 {registros.length} registros. Datos guardados solo en tu navegador (privacidad).
 </p>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setOpenForm((o) => !o)}
 className="rounded-full bg-cereza px-4 py-1.5 text-xs font-semibold text-crema hover:bg-cereza/90"
 >
 {openForm ? "Cerrar" : "+ Nuevo registro"}
 </button>
 {registros.length > 0 && (
 <button
 onClick={() => exportarCSV(registros)}
 className="rounded-full border border-cafe/30 px-4 py-1.5 text-xs font-semibold text-cafe hover:bg-cafe hover:text-crema"
 >
 Exportar CSV
 </button>
 )}
 </div>
 </div>

 {openForm && (
 <form onSubmit={onAgregar} className="mt-4 rounded-xl border border-cafe/10 bg-crema/40 p-4">
 <div className="grid gap-3 sm:grid-cols-5">
 <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value as TipoRegistro)} className="rounded-lg border border-cafe/20 px-3 py-2 text-sm">
 {tiposDisponibles.map((t) => (
 <option key={t} value={t}>{TIPOS_LABEL[t]}</option>
 ))}
 </select>
 <input value={nuevoAccion} onChange={(e) => setNuevoAccion(e.target.value)} placeholder="Descripción (ej: cosecha, compra, venta o gasto)" className="rounded-lg border border-cafe/20 px-3 py-2 text-sm sm:col-span-2" required />
 <input type="number" step="0.1" value={nuevoCantidad} onChange={(e) => setNuevoCantidad(e.target.value)} placeholder="Cantidad" className="rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 <input value={nuevoUnidad} onChange={(e) => setNuevoUnidad(e.target.value)} placeholder="Unidad (qq, sacos…)" className="rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 <input type="number" step="0.01" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} placeholder="Monto USD" className="rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 </div>
 <button type="submit" className="mt-3 rounded-full bg-hoja px-4 py-2 text-xs font-semibold text-crema hover:bg-hoja/90">
 Guardar registro
 </button>
 </form>
 )}

 <div className="mt-4 grid gap-2 sm:grid-cols-4">
 <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as TipoRegistro | "todos")} className="rounded-lg border border-cafe/20 px-3 py-2 text-sm">
 <option value="todos">Todos los tipos</option>
 {tiposDisponibles.map((t) => (
 <option key={t} value={t}>{TIPOS_LABEL[t]}</option>
 ))}
 </select>
 <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en descripción…" className="rounded-lg border border-cafe/20 px-3 py-2 text-sm sm:col-span-2" />
 <div className="flex gap-2">
 <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm" />
 </div>
 </div>

 <div className="mt-4 max-h-[480px] overflow-y-auto">
 {registros.length === 0 ? (
 <EstadoVacio
 titulo="Sin registros aún"
 descripcion="Usa «+ Nuevo registro» para empezar."
 />
 ) : (
 <ul className="divide-y divide-cafe/5">
 {registros.slice(0, compacto ? 30 : undefined).map((r) => (
 <li key={r.id} className="flex items-start gap-3 py-3 text-sm">
 <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIPOS_COLOR[r.tipo]}`}>
 {TIPOS_LABEL[r.tipo]}
 </span>
 <div className="flex-1">
 <p className="font-medium text-cafe">{r.accion}</p>
 <p className="mt-0.5 text-xs text-pizarra/50">
 {r.fecha} · {r.hora}
 {r.cantidad != null && ` · ${r.cantidad} ${r.unidad ?? ""}`}
 {r.monto != null && ` · $${r.monto.toFixed(2)}`}
 </p>
 </div>
 <button onClick={() => setConfEliminarId(r.id)} className="shrink-0 text-xs text-cereza/70 hover:text-cereza hover:underline">
 Eliminar
 </button>
 </li>
 ))}
 {compacto && registros.length > 30 && (
 <li className="py-2 text-center text-xs text-pizarra/50">
 Mostrando los 30 más recientes de {registros.length}.
 </li>
 )}
 </ul>
 )}
 </div>
 </div>
 );
}
