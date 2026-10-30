"use client";

import type { ReactNode } from "react";

interface DataPoint { mes: string; valor: number; }
interface Series { nombre: string; color: string; data: DataPoint[]; }

interface Props {
 series: Series[];
 height?: number;
 showLegend?: boolean;
}

/**
 * Mini-gráfico de barras SVG sin dependencias externas.
 * Diseñado para KPIs pequeños en paneles.
 */
export function MiniBarChart({ series, height = 140, showLegend = true }: Props) {
 const allData = series.flatMap((s) => s.data);
 const max = Math.max(...allData.map((d) => d.valor), 1);
 const min = Math.min(...allData.map((d) => d.valor), 0);
 const range = max - min || 1;
 const barW = 100 / Math.max(allData.length, 1);

 return (
 <div>
 <svg viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
 {series.map((s, si) =>
 s.data.map((d, i) => {
 const h = ((d.valor - min) / range) * 80 + 5;
 const x = i * barW + barW * 0.15;
 const y = 90 - h;
 const w = barW * 0.7;
 return (
 <rect
 key={`${si}-${i}`}
 x={x}
 y={y}
 width={w}
 height={h}
 fill={s.color}
 opacity={si === 0 ? 1 : 0.5}
 rx="1"
 >
 <title>{`${s.nombre} · ${d.mes}: ${d.valor}`}</title>
 </rect>
 );
 })
 )}
 </svg>
 {showLegend && (
 <div className="mt-1 flex flex-wrap justify-between px-1 text-[9px] text-pizarra/40">
 {series[0]?.data.filter((_, i) => i % 3 === 0).map((d) => (
 <span key={d.mes}>{d.mes}</span>
 ))}
 </div>
 )}
 </div>
 );
}

/**
 * Gráfico de línea SVG con área rellena.
 */
export function LineChart({ series, height = 180, showLegend = true }: Props) {
 const allData = series.flatMap((s) => s.data);
 if (allData.length === 0) return null;

 const max = Math.max(...allData.map((d) => d.valor), 1);
 const min = Math.min(...allData.map((d) => d.valor), 0);
 const range = max - min || 1;
 const stepX = 100 / Math.max(allData.length - 1, 1);

 return (
 <div>
 <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full" style={{ height }}>
 {/* líneas horizontales sutiles */}
 {[0.25, 0.5, 0.75].map((p) => (
 <line key={p} x1="0" x2="100" y1={60 - p * 60} y2={60 - p * 60} stroke="#0001" strokeWidth="0.2" />
 ))}
 {series.map((s, si) => {
 const points = s.data.map((d, i) => {
 const x = i * stepX;
 const y = 60 - ((d.valor - min) / range) * 55 - 2.5;
 return `${x},${y}`;
 }).join(" ");
 const area = `M0,60 L${points} L100,60 Z`;
 return (
 <g key={si}>
 <path d={area} fill={s.color} opacity={si === 0 ? 0.15 : 0.05} />
 <polyline
 points={points}
 fill="none"
 stroke={s.color}
 strokeWidth={si === 0 ? "0.8" : "0.5"}
 opacity={si === 0 ? 1 : 0.6}
 />
 {s.data.map((d, i) => {
 const x = i * stepX;
 const y = 60 - ((d.valor - min) / range) * 55 - 2.5;
 return (
 <circle key={i} cx={x} cy={y} r="0.8" fill={s.color} opacity={si === 0 ? 1 : 0.6}>
 <title>{`${s.nombre} · ${d.mes}: ${d.valor}`}</title>
 </circle>
 );
 })}
 </g>
 );
 })}
 </svg>
 {showLegend && (
 <div className="mt-1 flex justify-between px-1 text-[9px] text-pizarra/40">
 {series[0]?.data.filter((_, i) => i % 3 === 0).map((d) => (
 <span key={d.mes}>{d.mes}</span>
 ))}
 </div>
 )}
 </div>
 );
}

/**
 * Gráfico de dona/pastel para distribución porcentual.
 */
interface PieSlice { label: string; valor: number; color: string; }
export function DonutChart({ slices, size = 140, thickness = 18 }: { slices: PieSlice[]; size?: number; thickness?: number; }) {
 const total = slices.reduce((a, b) => a + b.valor, 0) || 1;
 const r = size / 2 - thickness / 2;
 const c = size / 2;
 let acc = 0;

 return (
 <div className="flex flex-col items-center gap-2 sm:flex-row">
 <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
 {slices.length === 0 ? (
 <circle cx={c} cy={c} r={r} fill="none" stroke="#eee" strokeWidth={thickness} />
 ) : slices.map((s, i) => {
 const start = (acc / total) * 2 * Math.PI;
 acc += s.valor;
 const end = (acc / total) * 2 * Math.PI;
 const x1 = c + r * Math.sin(start);
 const y1 = c - r * Math.cos(start);
 const x2 = c + r * Math.sin(end);
 const y2 = c - r * Math.cos(end);
 const large = end - start > Math.PI ? 1 : 0;
 const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
 return (
 <path key={i} d={d} fill="none" stroke={s.color} strokeWidth={thickness}>
 <title>{`${s.label}: ${s.valor} (${((s.valor/total)*100).toFixed(1)}%)`}</title>
 </path>
 );
 })}
 <text x={c} y={c - 4} textAnchor="middle" className="fill-cafe" fontSize="14" fontWeight="bold">{total}</text>
 <text x={c} y={c + 10} textAnchor="middle" fill="rgba(61,35,20,0.5)" fontSize="6">total</text>
 </svg>
 <div className="space-y-1 text-xs">
 {slices.map((s, i) => (
 <div key={i} className="flex items-center gap-2">
 <span className="inline-block h-3 w-3 rounded-full" style={{ background: s.color }} />
 <span className="text-pizarra/70">{s.label}</span>
 <span className="font-semibold text-cafe">{((s.valor/total)*100).toFixed(0)}%</span>
 </div>
 ))}
 </div>
 </div>
 );
}

/**
 * KPI card grande con icono y variación.
 */
interface KpiProps {
 label: string;
 valor: string | number;
 unidad?: string;
 variacion?: number;
 icono?: ReactNode;
}

export function KpiCard({ label, valor, unidad, variacion, icono }: KpiProps) {
 const varSign = variacion !== undefined && variacion > 0 ? "▲" : variacion !== undefined && variacion < 0 ? "▼" : "·";
 const varCls = variacion === undefined || variacion === 0
 ? "text-pizarra/40"
 : variacion > 0
 ? "text-hoja"
 : "text-cereza";

 return (
 <div className="rounded-2xl border border-cafe/10 bg-white p-4 shadow-sm transition hover:shadow-md">
 <div className="flex items-start justify-between">
 <p className="text-xs font-semibold uppercase tracking-wider text-pizarra/60">{label}</p>
 {icono && <span className="text-2xl opacity-60" aria-hidden="true">{icono}</span>}
 </div>
 <p className="mt-2 font-titulo text-3xl font-bold text-cafe">
 {valor}
 {unidad && <span className="ml-1 text-sm font-medium text-pizarra/50">{unidad}</span>}
 </p>
 {variacion !== undefined && (
 <p className={`mt-1 text-xs font-semibold ${varCls}`}>
 {varSign} {Math.abs(variacion).toFixed(1)}% vs mes anterior
 </p>
 )}
 </div>
 );
}
