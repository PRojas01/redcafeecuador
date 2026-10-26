"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CONFIG } from "@/lib/config";

export interface PrecioData {
 valor: number;
 valor_cents: number;
 unidad: string;
 mes: string;
 fecha?: string | null;
 variacion_pct: number | null;
 variacion_periodo?: "cierre_anterior" | "mes_anterior";
}

export interface HistoricoRow {
 mes: string;
 centsLb: number;
 usdQqal: number;
 // Solo en la serie diaria: el día exacto (YYYY-MM-DD). En la mensual no
 // viene, porque allí "mes" ya es todo lo que se sabe.
 fecha?: string;
}

export interface PrecioResponse {
 updated_at: string;
 updated_human: string;
 precio: PrecioData;
 fuente: { nombre: string; url: string; periodicidad: string; descripcion: string };
 referencias_oficiales: { nombre: string; url: string }[];
 historico: HistoricoRow[];
 // Cierres diarios. Viene vacía si la consulta diaria a la fuente falló, y
 // entonces el gráfico diario cae al histórico mensual, diciéndolo.
 historico_diario?: HistoricoRow[];
 stale?: boolean;
}

function fmtUsd(n: number): string {
 return `$${n.toFixed(2)}`;
}

function fmtVar(v: number | null): { txt: string; cls: string } {
 if (v === null) return { txt: "—", cls: "text-pizarra/50" };
 const sign = v > 0 ? "▲" : v < 0 ? "▼" : "·";
 const cls = v > 0 ? "text-hoja" : v < 0 ? "text-cereza" : "text-pizarra/70";
 return { txt: `${sign} ${Math.abs(v).toFixed(2)}%`, cls };
}

/*
 * Los dos gráficos de esta página usan el mismo formato de fecha, para que al
 * mirarlos se lean igual. El mensual (el de la capa propia) rotula "jul 25";
 * aquí se replica ese estilo: día y mes en la serie diaria, mes y año en la
 * mensual. Con Intl el navegador escribe "sept", "sept." o "sep" según el
 * navegador y el idioma, y el eje queda desigual de una máquina a otra.
 */
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function parseFecha(iso: string): Date | null {
 const d = new Date(`${iso}T00:00:00Z`);
 return Number.isNaN(d.getTime()) ? null : d;
}

/*
 * Etiqueta real de un punto. En la serie diaria sale el día exacto, nunca solo
 * el mes: si no, medio año de puntos repetiría la misma palabra y el gráfico,
 * que aparenta detalle, no diría nada.
 */
function fmtPunto(row: HistoricoRow): string {
 if (row.fecha) {
  const d = parseFecha(row.fecha);
  if (d) return `${String(d.getUTCDate()).padStart(2, "0")} ${MESES[d.getUTCMonth()]}`;
 }
 const d = parseFecha(`${row.mes.slice(0, 7)}-01`);
 if (!d) return row.mes;
 return `${MESES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
}

/*
 * Marcas del eje horizontal.
 *
 * Antes se elegían tres filas a mano (la primera, la del medio y la última) y
 * se les ponía el mes. En el rango de 5 días las tres caían dentro de
 * septiembre, así que el eje decía "sept sept sept": tres etiquetas iguales no
 * son tres referencias, son una repetida. Ahora:
 *   - las marcas se reparten por el ancho del eje, no se cogen a dedo;
 *   - cada una lleva su fecha real;
 *   - si dos caen en el mismo día, la segunda avanza hasta la siguiente fecha
 *     distinta, en vez de repetir lo que ya dice la anterior.
 */
function marcasEje(
 coords: (HistoricoRow & { x: number })[]
): { x: number; texto: string }[] {
 const cuantas = Math.min(4, coords.length);
 if (cuantas < 2) return [];
 const salida: { x: number; texto: string }[] = [];
 const vistas = new Set<string>();
 for (let i = 0; i < cuantas; i++) {
  const ideal = Math.round((i * (coords.length - 1)) / (cuantas - 1));
  let indice = ideal;
  let intentos = 0;
  while (vistas.has(fmtPunto(coords[indice])) && intentos < coords.length) {
   indice = indice >= coords.length - 1 ? 0 : indice + 1;
   intentos++;
  }
  const texto = fmtPunto(coords[indice]);
  if (vistas.has(texto)) break;
  vistas.add(texto);
  salida.push({ x: coords[indice].x, texto });
 }
 return salida.sort((a, b) => a.x - b.x);
}

function fmtMonth(label: string): string {
 const d = new Date(`${label.slice(0, 7)}-01T00:00:00Z`);
 if (Number.isNaN(d.getTime())) return label.slice(0, 7);
 return new Intl.DateTimeFormat("es-EC", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
 }).format(d);
}

function resumenMensual(rows: HistoricoRow[]): HistoricoRow[] {
 const monthly = new Map<string, HistoricoRow>();
 rows.forEach((row) => {
  const month = row.mes.slice(0, 7);
  if (!monthly.has(month)) monthly.set(month, row);
 });
 return Array.from(monthly.values()).slice(0, 13);
}

/*
 * Rangos del selector.
 *
 * Los de días son los de verdad: la serie diaria son cierres de sesión, así que
 * "5D" son cinco días. Cuando la consulta diaria a la fuente falla y solo
 * quedan meses, los mismos botones en días dirían "5D" sobre puntos mensuales,
 * que es mentira; en ese caso se rotulan en meses ("3M", "6M", "1A", "Todo") y
 * se recortan contando meses. Un botón tiene que decir lo que hace.
 */
type Rango = { id: string; label: string; dias?: number; meses?: number };

const RANGOS_DIA: Rango[] = [
 { id: "5D", label: "5D", dias: 5 },
 { id: "1M", label: "1M", dias: 31 },
 { id: "3M", label: "3M", dias: 92 },
 { id: "6M", label: "6M", dias: 184 },
 { id: "1Y", label: "1Y", dias: 260 },
];

const RANGOS_MES: Rango[] = [
 { id: "3m", label: "3M", meses: 3 },
 { id: "6m", label: "6M", meses: 6 },
 { id: "12m", label: "1A", meses: 12 },
 { id: "todo", label: "Todo", meses: 9999 },
];

/*
 * Si las filas traen fecha exacta, la serie es diaria y se puede filtrar bien.
 * Si solo traen "YYYY-MM", son meses y no hay manera de saber qué día del mes
 * era: se devuelve null y el gráfico no promete un recorte que no puede cumplir.
 */
function diasDe(rows: HistoricoRow[]): number[] | null {
 if (rows.length === 0) return null;
 if (!rows.every((r) => typeof r.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha))) {
  return null;
 }
 return rows.map((r) => Date.parse(`${r.fecha}T00:00:00Z`));
}

function HistoricoReciente({ rows }: { rows: HistoricoRow[] }) {
 const fechas = diasDe(rows);
 const esDiario = fechas !== null;

 /*
  * Solo se ofrecen los rangos que los datos pueden cumplir. La serie diaria
  * llega seis meses, así que el botón "1Y" desaparecería en vez de pintar medio
  * año prometiendo un año: es preferible que falte un botón a que prometa algo
  * que el gráfico no muestra.
  */
 const cubierto = fechas
  ? Math.round((Math.max(...fechas) - Math.min(...fechas)) / 86400000)
  : Infinity;
 const disponibles = (esDiario ? RANGOS_DIA : RANGOS_MES).filter(
  (r) => (esDiario ? r.dias! : r.meses!) <= cubierto
 );
 const porDefecto = esDiario ? "1M" : "6M";

 const [rangoElegido, setRango] = useState<string>(porDefecto);
 const rango = disponibles.some((r) => r.id === rangoElegido) ? rangoElegido : porDefecto;
 const seleccionado = disponibles.find((r) => r.id === rango) ?? disponibles[0];

 /*
  * OJO: aquí antes había rows.slice(0, days), que contaba FILAS. Como las
  * filas eran meses, el botón "5D" pintaba cinco meses: por eso los dos
  * gráficos de esta página acababan mostrando lo mismo y nadie entendía
  * cuál era el promedio mensual y cuál el diario. Ahora se recorta por fecha,
  * que es lo que dicen los botones.
  */
 const puntos = useMemo(() => {
  if (!fechas) return rows.slice(0, seleccionado.meses).reverse();
  const ultimo = Math.max(...fechas);
  const desde = ultimo - (seleccionado.dias ?? 0) * 86400000;
  return rows.filter((_, i) => fechas[i] >= desde).reverse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [rows, seleccionado]);

 const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

 if (puntos.length < 2) return null;

 const valores = puntos.map((p) => p.usdQqal);
 const min = Math.min(...valores);
 const max = Math.max(...valores);
 const valueRange = Math.max(1, max - min);
 const coords = puntos.map((p, i) => {
 const x = 52 + i * (496 / Math.max(1, puntos.length - 1));
 const y = 190 - ((p.usdQqal - min) / valueRange) * 126;
 return { ...p, x, y };
 });
 const selected = coords[selectedIndex ?? coords.length - 1];
 const first = coords[0];
 const change = first && selected
  ? ((selected.usdQqal - first.usdQqal) / first.usdQqal) * 100
  : 0;
 const linePath = coords
  .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
  .join(" ");
 const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} 212 L ${coords[0].x.toFixed(2)} 212 Z`;
 const yTicks = [max, min + valueRange / 2, min];
 const eje = marcasEje(coords);

 return (
 <div className="mt-6 rounded-2xl border border-cafe/10 bg-white p-5 shadow-sm">
 <div className="flex flex-wrap items-start justify-between gap-4">
 <div>
 <p className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">
 KC=F · ICE Coffee C
 </p>
 <h2 className="mt-1 font-titulo text-2xl font-bold text-cafe">
 {fmtUsd(selected.usdQqal)}
 <span className="ml-2 text-sm font-medium text-pizarra/60">USD / quintal</span>
 </h2>
 <p className={`mt-1 text-sm font-semibold ${change >= 0 ? "text-hoja" : "text-cereza"}`}>
 {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}% en {seleccionado.label} · {fmtPunto(selected)}
 </p>
 </div>
 <div className="flex rounded-full border border-cafe/10 bg-crema/70 p-1 text-xs font-bold text-pizarra/70">
 {disponibles.map((r) => (
 <button
 key={r.id}
 type="button"
 onClick={() => {
 setRango(r.id);
 setSelectedIndex(null);
 }}
 className={`rounded-full px-3 py-1.5 transition ${
 rango === r.id ? "bg-white text-cafe shadow-sm" : "hover:text-cafe"
 }`}
 >
 {r.label}
 </button>
 ))}
 </div>
 </div>

 <div className="mt-4 overflow-hidden rounded-xl border border-cafe/10 bg-[#fbfaf7] p-3">
 <svg
 viewBox="0 0 600 260"
 role="img"
 aria-label="Gráfica diaria del precio referencial KC=F, similar al panel de Yahoo Finance"
 className="h-auto w-full"
 onMouseMove={(event) => {
 const rect = event.currentTarget.getBoundingClientRect();
 const x = ((event.clientX - rect.left) / rect.width) * 600;
 const nearest = coords.reduce((best, p, i) => {
  const dist = Math.abs(p.x - x);
  return dist < best.dist ? { i, dist } : best;
 }, { i: 0, dist: Number.POSITIVE_INFINITY });
 setSelectedIndex(nearest.i);
 }}
 onMouseLeave={() => setSelectedIndex(null)}
 >
 <defs>
 <linearGradient id="redcafePrecioArea" x1="0" x2="0" y1="0" y2="1">
 <stop offset="0%" stopColor="#3F6B4A" stopOpacity="0.22" />
 <stop offset="100%" stopColor="#3F6B4A" stopOpacity="0.02" />
 </linearGradient>
 </defs>
 {yTicks.map((tick, i) => {
 const y = 64 + i * 74;
 return (
 <g key={tick}>
 <line x1="52" y1={y} x2="560" y2={y} stroke="#E8DCC7" strokeWidth="1" />
 <text x="560" y={y - 6} textAnchor="end" fontSize="12" fontWeight="700" fill="#6B5D52">
 {fmtUsd(tick)}
 </text>
 </g>
 );
 })}
 <path d={areaPath} fill="url(#redcafePrecioArea)" />
 <path d={linePath} fill="none" stroke="#3F6B4A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
 <line x1={selected.x} y1="52" x2={selected.x} y2="212" stroke="#6B5D52" strokeDasharray="4 5" strokeWidth="1.5" />
 <circle cx={selected.x} cy={selected.y} r="7" fill="#A94E17" stroke="#FBFAF7" strokeWidth="4" />
 <g>
 <rect x={Math.min(460, Math.max(62, selected.x - 70))} y="18" width="132" height="42" rx="10" fill="#3B1A0C" />
 <text x={Math.min(526, Math.max(128, selected.x - 4))} y="36" textAnchor="middle" fontSize="12" fontWeight="800" fill="#FBFAF7">
 {fmtPunto(selected)}
 </text>
 <text x={Math.min(526, Math.max(128, selected.x - 4))} y="52" textAnchor="middle" fontSize="13" fontWeight="800" fill="#F2C879">
 {fmtUsd(selected.usdQqal)}
 </text>
 </g>
 {/*
  Las marcas del eje horizontal. El detalle de por qué se reparten y de cómo
  se evitan etiquetas repetidas está en marcasEje(), arriba; aquí solo se pintan.
  */}
 {eje.map((m, i) => (
  <text
  // La clave era "mes", y en la serie diaria hay varios puntos del mismo mes:
  // React avisaba de claves duplicadas. Con la etiqueta y el indice no se
  // pueden repetir.
  key={`${m.texto}-${i}`}
  x={m.x}
  y="240"
  // La primera se pega a la izquierda y la última a la derecha, para que el
  // texto no se salga del dibujo ni se coma el eje de precios.
  textAnchor={i === 0 ? "start" : i === eje.length - 1 ? "end" : "middle"}
  fontSize="12"
  fontWeight="700"
  fill="#6B5D52"
  >
 {m.texto}
 </text>
 ))}
 </svg>
 </div>
 <p className="mt-3 text-xs leading-relaxed text-pizarra/60">
  {esDiario
  ? "Un punto por día con el cierre de cada sesión del futuro Coffee C (KC=F). Los fines de semana y días festivos no tienen barra porque no hay mercado: no se rellenan con ningún valor."
  : "Ahora mismo no hay serie diaria, así que se muestran los cierres de mes. En cuanto la fuente vuelva a responder, aquí habrá un punto por día."}
 </p>
 </div>
 );
}

/*
 * Gráfico MENSUAL, dibujado en React.
 *
 * Antes este gráfico lo pintaba la capa propia: redcafe-v60-final.js dibujaba un
 * gráfico base SIN etiquetas de mes y redcafe-grafico-precios.js lo sustituía por
 * otro con etiquetas a los ~1,5 s. Como la capa propia no viaja en el paquete y
 * su script falla a veces, el gráfico se quedaba sin etiquetas o tardaba en
 * tenerlas. Ahora lo dibuja React, con las etiquetas de mes desde el primer
 * instante y sin depender de ningún script que no viaja.
 */
const RANGOS_MENSUAL = [
 { id: "3m", label: "3M", meses: 3 },
 { id: "6m", label: "6M", meses: 6 },
 { id: "12m", label: "1A", meses: 12 },
 { id: "todo", label: "Todo", meses: 9999 },
] as const;

function GraficoMensual({ rows }: { rows: HistoricoRow[] }) {
 const disponibles = RANGOS_MENSUAL.filter((r) => r.meses <= rows.length);
 const porDefecto = rows.length >= 12 ? "12m" : rows.length >= 6 ? "6m" : "3m";
 const [rangoElegido, setRango] = useState<string>(porDefecto);
 const rango = disponibles.some((r) => r.id === rangoElegido) ? rangoElegido : porDefecto;
 const seleccionado = disponibles.find((r) => r.id === rango) ?? disponibles[0];

 // rows va del mes más reciente al más antiguo: se toman los N meses y se
 // invierten para que el eje temporal avance a la derecha.
 const puntos = useMemo(
  () => rows.slice(0, seleccionado.meses).reverse(),
  [rows, seleccionado.meses]
 );
 const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

 if (puntos.length < 2) return null;

 const valores = puntos.map((p) => p.usdQqal);
 const min = Math.min(...valores);
 const max = Math.max(...valores);
 const valueRange = Math.max(1, max - min);
 const coords = puntos.map((p, i) => {
  const x = 52 + i * (496 / Math.max(1, puntos.length - 1));
  const y = 190 - ((p.usdQqal - min) / valueRange) * 126;
  return { ...p, x, y };
 });
 const selected = coords[selectedIndex ?? coords.length - 1];
 const first = coords[0];
 const change = first && selected
  ? ((selected.usdQqal - first.usdQqal) / first.usdQqal) * 100
  : 0;
 const linePath = coords
  .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
  .join(" ");
 const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} 212 L ${coords[0].x.toFixed(2)} 212 Z`;
 const yTicks = [max, min + valueRange / 2, min];
 const eje = marcasEje(coords);

 return (
  <div className="mt-6 rounded-2xl border border-cafe/10 bg-white p-5 shadow-sm">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
     <p className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">
      KC=F · ICE Coffee C
     </p>
     <h2 className="mt-1 font-titulo text-2xl font-bold text-cafe">
      {fmtUsd(selected.usdQqal)}
      <span className="ml-2 text-sm font-medium text-pizarra/60">USD / quintal</span>
     </h2>
     <p className={`mt-1 text-sm font-semibold ${change >= 0 ? "text-hoja" : "text-cereza"}`}>
      {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}% en {seleccionado.label} · {fmtPunto(selected)}
     </p>
    </div>
    <div className="flex rounded-full border border-cafe/10 bg-crema/70 p-1 text-xs font-bold text-pizarra/70">
     {disponibles.map((r) => (
      <button
      key={r.id}
      type="button"
      onClick={() => {
       setRango(r.id);
       setSelectedIndex(null);
      }}
      className={`rounded-full px-3 py-1.5 transition ${
       rango === r.id ? "bg-white text-cafe shadow-sm" : "hover:text-cafe"
      }`}
      >
       {r.label}
      </button>
     ))}
    </div>
   </div>

   <div className="mt-4 overflow-hidden rounded-xl border border-cafe/10 bg-[#fbfaf7] p-3">
    <svg
    viewBox="0 0 600 260"
    role="img"
    aria-label="Gráfica mensual del precio del café, con la etiqueta de cada mes"
    className="h-auto w-full"
    onMouseMove={(event) => {
     const rect = event.currentTarget.getBoundingClientRect();
     const x = ((event.clientX - rect.left) / rect.width) * 600;
     const nearest = coords.reduce((best, p, i) => {
      const dist = Math.abs(p.x - x);
      return dist < best.dist ? { i, dist } : best;
     }, { i: 0, dist: Number.POSITIVE_INFINITY });
     setSelectedIndex(nearest.i);
    }}
    onMouseLeave={() => setSelectedIndex(null)}
    >
     <defs>
      <linearGradient id="redcafeMensualArea" x1="0" x2="0" y1="0" y2="1">
       <stop offset="0%" stopColor="#3F6B4A" stopOpacity="0.22" />
       <stop offset="100%" stopColor="#3F6B4A" stopOpacity="0.02" />
      </linearGradient>
     </defs>
     {yTicks.map((tick, i) => {
      const y = 64 + i * 74;
      return (
       <g key={tick}>
        <line x1="52" y1={y} x2="560" y2={y} stroke="#E8DCC7" strokeWidth="1" />
        <text x="560" y={y - 6} textAnchor="end" fontSize="12" fontWeight="700" fill="#6B5D52">
         {fmtUsd(tick)}
        </text>
       </g>
      );
     })}
     <path d={areaPath} fill="url(#redcafeMensualArea)" />
     <path d={linePath} fill="none" stroke="#3F6B4A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
     <line x1={selected.x} y1="52" x2={selected.x} y2="212" stroke="#6B5D52" strokeDasharray="4 5" strokeWidth="1.5" />
     <circle cx={selected.x} cy={selected.y} r="7" fill="#A94E17" stroke="#FBFAF7" strokeWidth="4" />
     <g>
      <rect x={Math.min(460, Math.max(62, selected.x - 70))} y="18" width="132" height="42" rx="10" fill="#3B1A0C" />
      <text x={Math.min(526, Math.max(128, selected.x - 4))} y="36" textAnchor="middle" fontSize="12" fontWeight="800" fill="#FBFAF7">
       {fmtPunto(selected)}
      </text>
      <text x={Math.min(526, Math.max(128, selected.x - 4))} y="52" textAnchor="middle" fontSize="13" fontWeight="800" fill="#F2C879">
       {fmtUsd(selected.usdQqal)}
      </text>
     </g>
     {eje.map((m, i) => (
      <text
      key={`${m.texto}-${i}`}
      x={m.x}
      y="240"
      textAnchor={i === 0 ? "start" : i === eje.length - 1 ? "end" : "middle"}
      fontSize="12"
      fontWeight="700"
      fill="#6B5D52"
      >
       {m.texto}
      </text>
     ))}
    </svg>
   </div>
   <p className="mt-3 text-xs leading-relaxed text-pizarra/60">
    Un punto por mes, con el cierre de cada mes del futuro Coffee C (KC=F). Es el
    promedio mensual: el mismo que se ve en la cabecera de la plataforma.
   </p>
  </div>
 );
}

export default function PreciosClientPage({ initialData }: { initialData: PrecioResponse }) {
 const [data, setData] = useState<PrecioResponse>(initialData);
 const [error, setError] = useState(false);

 useEffect(() => {
 let alive = true;
 async function loadFreshPrice() {
 try {
 const r = await fetch(CONFIG.api(`/api/precios.php?action=list&v=${Date.now()}`), { cache: "no-store" });
 const j = await r.json();
 if (alive && j.ok && j.data?.precio?.valor) {
 setData(j.data as PrecioResponse);
 setError(false);
 return;
 }
 throw new Error("Respuesta de precios inválida");
 } catch {
 if (alive) setError(true);
 }
 }
 loadFreshPrice();
 return () => {
 alive = false;
 };
 }, []);

 const variacion = fmtVar(data.precio.variacion_pct);
 // Si el build no traía precio guardado, updated_at viene vacío y el navegador
 // no ejecuta JS: hay que poder pintar algo legible en vez de "Invalid Date".
 const updatedAt = data.updated_at ? new Date(data.updated_at).toUTCString() : "sin dato guardado";
 const monthlyRows = resumenMensual(data.historico);
 /*
  * El gráfico grande es el DIARIO, y usa la serie de cierres diarios. Si esa
  * consulta falló y no viene, se cae al histórico mensual — y se dice, en vez
  * de dejar que alguien crea que son precios diarios los que no lo son.
  */
 const dailyRows = (data.historico_diario ?? []).filter((r) => r.usdQqal > 0);
 const haySerieDiaria = dailyRows.length >= 2;
 const filasGrafico = haySerieDiaria ? dailyRows : data.historico;

 return (
 <div className="mx-auto max-w-4xl px-4 py-10">
 <div data-precios-respaldo>
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Servicio de la Red</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">Panel de Precios del Café</h1>
 <p className="mt-2 text-pizarra/80">
 Precio referencial internacional. El gráfico muestra el último cierre disponible de cada jornada de mercado.
 </p>

 {error && (
 <p className="mt-4 rounded-xl bg-cereza/10 p-4 text-sm text-pizarra/80">
 Dato mostrado: {data.updated_human || updatedAt}. La actualización en tiempo real está temporalmente indisponible.
 </p>
 )}

 <div className="mt-6 rounded-2xl border border-cafe/10 bg-white p-6 shadow-sm">
 <div className="flex flex-wrap items-baseline justify-between gap-4">
 <div>
 <p className="text-xs font-semibold uppercase tracking-widest text-pizarra/60">
 Café arábica — Precio referencial
 </p>
 <p className="mt-1 font-titulo text-5xl font-bold text-cafe">
 {fmtUsd(data.precio.valor)}
 <span className="ml-2 text-base font-medium text-pizarra/60">
 {data.precio.unidad}
 </span>
 </p>
 <p className={`mt-1 text-lg font-semibold ${variacion.cls}`}>
 {variacion.txt} vs. {data.precio.variacion_periodo === "cierre_anterior" ? "cierre anterior" : "mes anterior"}
 </p>
 </div>
 <div className="text-right text-xs text-pizarra/60">
 <p>Fecha del cierre: <strong>{data.precio.fecha || data.precio.mes}</strong></p>
 <p>Actualizado: {updatedAt}</p>
 {data.stale && (
                  <p className="mt-1 max-w-[16rem] leading-snug text-latte-texto">
                    La fuente oficial no responde ahora mismo. Este es el último dato
                    válido, del {updatedAt}: úsalo con esa reserva.
                  </p>
                )}
 </div>
 </div>

 <div className="mt-4 rounded-xl bg-crema/60 p-3 text-xs text-pizarra/70">
 <strong>Fuente principal:</strong>{" "}
 <a href={data.fuente.url} target="_blank" rel="noreferrer noopener" className="underline">
 {data.fuente.nombre}
 </a>{" "}
 · {data.fuente.periodicidad} · {data.fuente.descripcion}
 </div>
 </div>

 {/* Gráfico y tabla de respaldo si el panel histórico propio no carga. */}
 <h2 className="mt-10 font-titulo text-xl font-bold text-cafe">
 Precio mensual
 </h2>
 <p className="mt-1 max-w-2xl text-sm leading-relaxed text-pizarra/70">
  Un punto por mes, con su último cierre disponible.
 </p>
 <GraficoMensual rows={data.historico} />

 <h2 className="mt-10 font-titulo text-xl font-bold text-cafe">
 Resumen mensual
 </h2>
 <p className="mt-1 max-w-2xl text-sm leading-relaxed text-pizarra/70">
 El último cierre disponible de cada mes.
 </p>
 <div className="mt-4 overflow-x-auto rounded-2xl border border-cafe/10 bg-white">
 <table className="w-full text-left text-sm">
 <thead className="bg-cafe text-crema">
 <tr>
 <th className="px-5 py-3">Mes</th>
 <th className="px-5 py-3">Último cierre del mes</th>
 <th className="px-5 py-3">USD / quintal</th>
 </tr>
 </thead>
 <tbody>
 {monthlyRows.map((h, i) => (
 <tr key={h.mes} className={i % 2 ? "bg-crema/60" : "bg-white"}>
 <td className="px-5 py-2 font-semibold text-cafe">{fmtMonth(h.mes)}</td>
 <td className="px-5 py-2 text-pizarra/70">{h.centsLb.toFixed(2)}</td>
 <td className="px-5 py-2 font-bold text-cereza">{fmtUsd(h.usdQqal)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 <h2 className="mt-10 font-titulo text-xl font-bold text-cafe">
 Fuentes oficiales de referencia
 </h2>
 <div className="mt-4 grid gap-3 sm:grid-cols-2">
 {data.referencias_oficiales.map((r) => (
 <a
 key={r.url}
 href={r.url}
 target="_blank"
 rel="noreferrer noopener"
 className="rounded-xl border border-cafe/10 bg-white p-3 transition hover:border-hoja hover:shadow-sm"
 >
 <p className="text-xs font-semibold uppercase tracking-wider text-hoja">Fuente oficial</p>
 <p className="mt-0.5 font-titulo font-bold text-cafe">{r.nombre}</p>
 </a>
 ))}
 </div>

 <div className="mt-10 space-y-3 rounded-xl border border-latte/40 bg-latte/10 p-4 text-sm text-pizarra/80">
 <p>
 <strong>Cómo usar este precio:</strong> compara esta referencia internacional
 con tu precio de compra o venta y negocia según calidad, proceso, origen,
 condiciones de entrega y costos reales.
 </p>
 <p>
 Los valores son de referencia, no constituyen cotizaciones en vivo ni
 garantías de precio de venta. Para transacciones reales, consulta con tu
 comprador o con nuestro equipo de asesoría.
 </p>
 <p>
 <Link href="/asesoria" className="font-semibold text-cereza underline">
 Agenda una asesoría comercial
 </Link>
 {" · "}
 <a href={CONFIG.api("/api/precios-refresh.php")} className="text-pizarra/60 underline">
 Forzar refresco de cache
 </a>
 </p>
 </div>
 </div>
 );
}
