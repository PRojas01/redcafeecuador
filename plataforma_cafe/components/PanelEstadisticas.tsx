"use client";

import { useEffect, useState } from "react";
import { KpiCard, LineChart, DonutChart } from "@/components/Charts";
import { Icono } from "@/components/Icono";

interface Stats {
 kpis: { label: string; valor: string | number; unidad?: string }[];
 series: { nombre: string; color: string; data: { mes: string; valor: number }[] }[];
 resumen: { total: number; ultimo_mes: number; variacion_pct: number };
 periodo: string;
}

interface Actividad {
 items: { icono: string; texto: string; cuando: string }[];
}

interface Props {
 rol?: string;
 /** Datos directos (alternativa al fetching) */
 stats?: Stats | null;
 actividad?: Actividad | null;
 loading?: boolean;
 /** Mostrar/ocultar actividad reciente */
 showActividad?: boolean;
 /** Mostrar/ocultar donut de distribución */
 showDistribucion?: boolean;
 /** Etiqueta custom para el gráfico principal */
 chartTitle?: string;
 /** Slices del donut (si no se generan automáticamente) */
 donutSlices?: { label: string; valor: number; color: string }[];
}

const kpiIconos = ["precio", "marketplace", "comunidad", "verificacion"] as const;

export function PanelEstadisticas({
 rol,
 stats: statsProp,
 actividad: actividadProp,
 loading: loadingProp,
 showActividad = true,
 showDistribucion = true,
 chartTitle = "Actividad mensual",
 donutSlices,
}: Props) {
 const [stats, setStats] = useState<Stats | null>(statsProp ?? null);
 const [actividad, setActividad] = useState<Actividad | null>(actividadProp ?? null);
 const [loading, setLoading] = useState(loadingProp ?? !statsProp);

 useEffect(() => {
 if (statsProp) setStats(statsProp);
 if (actividadProp) setActividad(actividadProp);
 if (loadingProp !== undefined) setLoading(loadingProp);
 }, [statsProp, actividadProp, loadingProp]);

 useEffect(() => {
 if (statsProp || !rol) return;
 setLoading(true);
 Promise.all([
 fetch(`/api/stats.php?action=stats&rol=${rol}`).then((r) => r.json()).then((j) => {
 if (j.ok) setStats(j.data);
 }),
 showActividad && fetch(`/api/stats.php?action=actividad&rol=${rol}`)
 .then((r) => r.json()).then((j) => {
 if (j.ok) setActividad(j.data);
 }),
 ]).finally(() => setLoading(false));
 }, [rol, statsProp, showActividad]);

 if (loading) {
 return (
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {[1,2,3,4].map((i) => (
 <div key={i} className="h-28 animate-pulse rounded-2xl bg-cafe/5"></div>
 ))}
 </div>
 );
 }

 if (!stats) return null;

 return (
 <div className="space-y-4">
 {/* KPIs */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {stats.kpis.map((k, i) => (
 <KpiCard
 key={k.label}
 label={k.label}
 valor={k.valor}
 unidad={k.unidad}
 variacion={stats.resumen.variacion_pct}
 icono={<Icono nombre={kpiIconos[i % kpiIconos.length]} className="h-6 w-6" />}
 />
 ))}
 </div>

 {/* Gráfico + Donut */}
 <div className="grid gap-4 lg:grid-cols-3">
 <div className="rounded-2xl border border-cafe/10 bg-white p-5 shadow-sm lg:col-span-2">
 <div className="mb-3 flex items-center justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">{chartTitle}</p>
 <p className="font-titulo text-lg font-bold text-cafe">{stats.periodo}</p>
 </div>
 <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
 stats.resumen.variacion_pct > 0 ? "bg-hoja/15 text-hoja" :
 stats.resumen.variacion_pct < 0 ? "bg-cereza/15 text-cereza" :
 "bg-pizarra/10 text-pizarra/60"
 }`}>
 {stats.resumen.variacion_pct > 0 ? "▲" : stats.resumen.variacion_pct < 0 ? "▼" : "·"} {Math.abs(stats.resumen.variacion_pct)}%
 </span>
 </div>
 <LineChart series={stats.series} height={180} />
 </div>

 {showDistribucion && donutSlices && (
 <div className="rounded-2xl border border-cafe/10 bg-white p-5 shadow-sm">
 <p className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">Distribución</p>
 <p className="font-titulo text-lg font-bold text-cafe">Por canal</p>
 <div className="mt-4">
 <DonutChart slices={donutSlices} size={140} thickness={18} />
 </div>
 </div>
 )}
 </div>

 {/* Actividad reciente */}
 {showActividad && actividad && (
 <div className="rounded-2xl border border-cafe/10 bg-white p-5 shadow-sm">
 <p className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">Actividad reciente</p>
 <p className="font-titulo text-lg font-bold text-cafe">Últimos movimientos</p>
 <ul className="mt-4 divide-y divide-cafe/5">
 {actividad.items.slice(0, 8).map((it, i) => (
 <li key={i} className="flex items-start gap-3 py-2 text-sm">
 {it.icono ? (
 <span className="text-xl" aria-hidden="true">{it.icono}</span>
 ) : (
 <Icono nombre="administracion" className="h-5 w-5 shrink-0 text-cereza/70" />
 )}
 <p className="flex-1 text-pizarra/80">{it.texto}</p>
 <span className="shrink-0 text-xs text-pizarra/40">{it.cuando}</span>
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 );
}
