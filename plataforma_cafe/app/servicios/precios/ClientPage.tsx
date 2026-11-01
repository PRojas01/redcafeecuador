"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
 diario_stale?: boolean;
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
 * Pizarra de cierres diarios («Precio histórico del café»).
 *
 * Antes la pintaba la capa propia (redcafe-v60-final.js · enhancePricePage)
 * cuando ya estaba la página: insertaba la pizarra arriba y escondía todo el
 * bloque de React, así que la página cambiaba entera al cargar. Ahora sale en
 * el primer HTML con los cierres guardados y solo cambian los números cuando
 * llegan los de la API. Mismas clases: los estilos de redcafe-v60-final.css
 * siguen valiendo.
 */
const RANGOS_PIZARRA = [
 { dias: 7, label: "7D" },
 { dias: 30, label: "1M" },
 { dias: 90, label: "3M" },
 { dias: 180, label: "6M" },
 { dias: 365, label: "1A" },
 { dias: 0, label: "Todo" },
];
type Cierre = { fecha: string; precio: number };

function cierresDiarios(rows: HistoricoRow[] | undefined): Cierre[] {
 return (rows ?? [])
  .map((r) => ({ fecha: String(r.fecha || r.mes || ""), precio: Number(r.usdQqal || r.centsLb) }))
  .filter((r) => r.fecha && Number.isFinite(r.precio) && r.precio > 0)
  .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function PizarraDiaria({ cierres, stale }: { cierres: Cierre[]; stale?: boolean }) {
 const [dias, setDias] = useState(30);
 const [elegido, setElegido] = useState<number | null>(null);
 const [fijado, setFijado] = useState(false);
 const caja = useRef<HTMLDivElement>(null);
 const [proporcion, setProporcion] = useState(1366 / 280);

 useEffect(() => {
  const el = caja.current;
  if (!el || typeof ResizeObserver === "undefined") return;
  const medir = () => el.clientHeight && setProporcion(el.clientWidth / el.clientHeight);
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(el);
  return () => ro.disconnect();
 }, []);

 const ultimo = cierres[cierres.length - 1];
 const filas = useMemo(() => {
  if (!dias || !ultimo) return cierres;
  const corte = new Date(`${ultimo.fecha}T00:00:00Z`);
  corte.setUTCDate(corte.getUTCDate() - dias + 1);
  const desde = corte.toISOString().slice(0, 10);
  return cierres.filter((r) => r.fecha >= desde);
 }, [cierres, dias, ultimo]);

 const h = 260, pad = 28;
 const w = Math.max(320, Math.round(h * proporcion));
 const vals = filas.map((r) => r.precio);
 let min = Math.min(...vals), max = Math.max(...vals);
 if (min === max) { min -= 1; max += 1; }
 const pts = filas.map((r, i) => ({
  x: pad + (i * (w - pad * 2)) / Math.max(1, filas.length - 1),
  y: h - pad - ((r.precio - min) * (h - pad * 2)) / (max - min),
 }));
 const hayGrafico = filas.length >= 2;
 const linea = pts.map((p) => `${p.x} ${p.y}`).join(" L ");
 const marcas = Array.from(new Set([0, Math.floor((filas.length - 1) / 2), filas.length - 1]));
 const sel = elegido === null ? null : Math.max(0, Math.min(filas.length - 1, elegido));

 const indiceDe = (ev: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
  const r = ev.currentTarget.getBoundingClientRect();
  const px = ((ev.clientX - r.left) / r.width) * w;
  return Math.round(((px - pad) / (w - pad * 2)) * (filas.length - 1));
 };

 // Tabla por mes con lo que se ve en el gráfico.
 const porMes = new Map<string, number[]>();
 filas.forEach((r) => {
  const k = r.fecha.slice(0, 7);
  porMes.set(k, [...(porMes.get(k) ?? []), r.precio]);
 });
 const meses = Array.from(porMes.keys()).sort().reverse().slice(0, 12);
 const variosPorMes = meses.some((k) => porMes.get(k)!.length > 1);

 return (
  <section id="redcafe-price-daily" className="redcafe-price-board">
   <div className="redcafe-price-head">
    <div>
     <p className="rotulo text-filtrado-600">ICE Coffee C · cierres diarios</p>
     <h1 className="font-titulo text-2xl font-bold text-cafe">Precio histórico del café</h1>
     <p className="redcafe-price-date" role="status">
      {ultimo ? `Último cierre disponible: ${ultimo.fecha} · USD/quintal${stale ? " · dato guardado" : ""}` : "Sin cierres diarios disponibles"}
     </p>
    </div>
    <div className="redcafe-price-value">{ultimo ? fmtUsd(ultimo.precio) : "Sin datos"}</div>
   </div>
   <div className="redcafe-range-tabs">
    {RANGOS_PIZARRA.map((r) => (
     <button key={r.label} type="button" aria-pressed={dias === r.dias} onClick={() => { setDias(r.dias); setElegido(null); setFijado(false); }}>
      {r.label}
     </button>
    ))}
   </div>
   <div className="redcafe-price-chart" ref={caja}>
    {hayGrafico ? (
     <>
      <svg
       viewBox={`0 0 ${w} ${h}`}
       role="img"
       tabIndex={0}
       aria-label={`Gráfico de cierres diarios del café entre ${filas[0].fecha} y ${ultimo.fecha}. Haz clic o usa las flechas para consultar fecha y precio.`}
       onPointerMove={(ev) => { if (!fijado) setElegido(indiceDe(ev)); }}
       onClick={(ev) => { setFijado(true); setElegido(indiceDe(ev)); }}
       onKeyDown={(ev) => {
        if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
        ev.preventDefault();
        setFijado(true);
        setElegido((sel ?? filas.length - 1) + (ev.key === "ArrowLeft" ? -1 : 1));
       }}
      >
       <path d={`M ${pts[0].x} ${h - pad} L ${linea} L ${pts[pts.length - 1].x} ${h - pad} Z`} fill="rgba(166,106,44,.16)" />
       <path d={`M ${linea}`} fill="none" stroke="#a66a2c" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
       <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(140,30,14,.18)" />
       {marcas.map((i) => (
        <text key={i} x={pts[i].x} y={h - 5} textAnchor={i === 0 ? "start" : i === filas.length - 1 ? "end" : "middle"} fill="#5c5a50" fontSize="11">
         {filas[i].fecha.slice(5)}
        </text>
       ))}
       <text x={pad} y={pad - 7} fill="#25221f" fontSize="13">${max.toFixed(2)}</text>
       <text x={pad} y={h - pad - 5} fill="#25221f" fontSize="13">${min.toFixed(2)}</text>
       {sel !== null && (
        <>
         <line x1={pts[sel].x} x2={pts[sel].x} y1={pad} y2={h - pad} stroke="#5b2d17" strokeDasharray="4 4" strokeWidth="1.5" />
         <circle cx={pts[sel].x} cy={pts[sel].y} r="5" fill="#a66a2c" stroke="white" strokeWidth="2" />
        </>
       )}
      </svg>
      {sel !== null && (
       <div className="redcafe-price-tooltip" role="status" aria-live="polite" style={{ left: `${Math.max(12, Math.min(88, (pts[sel].x / w) * 100))}%` }}>
        {filas[sel].fecha} · {fmtUsd(filas[sel].precio)} USD/quintal
       </div>
      )}
     </>
    ) : (
     <p className="redcafe-launch-note">Histórico pendiente de actualización.</p>
    )}
   </div>
   <table className="redcafe-price-table">
    <thead>
     {variosPorMes ? (
      <tr><th>Mes</th><th>Promedio de cierres</th><th>Máximo</th><th>Mínimo</th></tr>
     ) : (
      <tr><th>Mes</th><th>USD por quintal</th></tr>
     )}
    </thead>
    <tbody>
     {meses.map((k) => {
      const arr = porMes.get(k)!;
      const prom = arr.reduce((a, b) => a + b, 0) / arr.length;
      return (
       <tr key={k}>
        <td>{k}</td>
        <td>{fmtUsd(prom)}</td>
        {variosPorMes && <td>{fmtUsd(Math.max(...arr))}</td>}
        {variosPorMes && <td>{fmtUsd(Math.min(...arr))}</td>}
       </tr>
      );
     })}
    </tbody>
   </table>
  </section>
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
 const cierres = cierresDiarios(data.historico_diario);
 const haySerieDiaria = cierres.length >= 2;

 return (
 <div className="mx-auto max-w-4xl px-4 py-10">
 {/* En un <div>: el CSS de la capa pinta en claro los títulos de la primera
     sección de main > div (la toma por cabecera oscura). */}
 {haySerieDiaria && <div><PizarraDiaria cierres={cierres} stale={data.stale || data.diario_stale} /></div>}
 {!haySerieDiaria && (
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

 {/* Sin cierres diarios: precio de referencia, gráfico y tabla mensuales. */}
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
 )}

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
