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
 // Solo en la serie diaria y si la fuente los trae: para el gráfico de velas.
 apertura?: number;
 maximo?: number;
 minimo?: number;
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
 * Sale en el primer HTML con los cierres guardados y solo cambian los números
 * cuando llegan los de la API. Pensada para leer la variación de cada día:
 *   - eje de precios con rejilla y eje de fechas que se adapta al rango;
 *   - línea o velas (apertura, máximo, mínimo y cierre de cada jornada);
 *   - línea de referencia con el precio al inicio del rango;
 *   - lectura de cada día: cierre, cambio contra el día anterior y rango del día;
 *   - media de 20 sesiones opcional para ver la tendencia.
 */
const RANGOS_PIZARRA = [
 { dias: 7, label: "1S" },
 { dias: 30, label: "1M" },
 { dias: 90, label: "3M" },
 { dias: 180, label: "6M" },
 { dias: 365, label: "1A" },
 { dias: 0, label: "Todo" },
];
const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const SUBE = "#2f6b45";
const BAJA = "#8c1e0e";
const TEXTO_EJE = "#5c5a50";

type Cierre = { fecha: string; precio: number; apertura?: number; maximo?: number; minimo?: number };

function cierresDiarios(rows: HistoricoRow[] | undefined): Cierre[] {
 return (rows ?? [])
  .map((r) => {
   const c: Cierre = { fecha: String(r.fecha || r.mes || ""), precio: Number(r.usdQqal || r.centsLb) };
   if (r.apertura && r.maximo && r.minimo) {
    c.apertura = Number(r.apertura);
    c.maximo = Number(r.maximo);
    c.minimo = Number(r.minimo);
   }
   return c;
  })
  .filter((r) => r.fecha && Number.isFinite(r.precio) && r.precio > 0)
  .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function fechaLarga(iso: string): string {
 const d = parseFecha(iso);
 if (!d) return iso;
 return `${DIAS_SEMANA[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function cambio(actual: number, antes: number | undefined): { abs: number; pct: number } | null {
 if (!antes || antes <= 0) return null;
 return { abs: actual - antes, pct: ((actual - antes) / antes) * 100 };
}

function fmtCambio(c: { abs: number; pct: number } | null): string {
 if (!c) return "—";
 const signo = c.abs > 0 ? "▲ +" : c.abs < 0 ? "▼ −" : "· ";
 return `${signo}${Math.abs(c.abs).toFixed(2)} (${Math.abs(c.pct).toFixed(2)}%)`;
}

/* Escala de precios con pasos redondos (1, 2, 2.5, 5, 10…). */
function escalaPrecios(min: number, max: number) {
 let rango = max - min;
 if (rango <= 0) rango = Math.abs(max) * 0.02 || 1;
 const lo0 = min - rango * 0.08, hi0 = max + rango * 0.08;
 let paso = Math.pow(10, Math.floor(Math.log10((hi0 - lo0) / 4)));
 for (const k of [1, 2, 2.5, 5, 10]) {
  if ((hi0 - lo0) / (paso * k) <= 5) { paso *= k; break; }
 }
 const lo = Math.floor(lo0 / paso) * paso, hi = Math.ceil(hi0 / paso) * paso;
 const marcas: number[] = [];
 for (let v = lo; v <= hi + paso / 1000; v += paso) marcas.push(Math.round(v * 100) / 100);
 return { lo, hi, marcas, decimales: paso < 1 ? 2 : 0 };
}

/*
 * Marcas del eje de fechas según el rango: día a día en una semana, cada
 * pocos días hasta tres meses y el primer día de cotización de cada mes en
 * rangos largos. Nunca repite la misma etiqueta.
 */
function marcasFechas(filas: Cierre[], anchoUtil: number): number[] {
 const n = filas.length;
 const caben = Math.max(2, Math.floor(anchoUtil / 70));
 if (n <= caben) return filas.map((_, i) => i);
 const dias = (Date.parse(filas[n - 1].fecha) - Date.parse(filas[0].fecha)) / 86400000;
 if (dias > 100) {
  const inicios = filas.map((r, i) => (i > 0 && r.fecha.slice(0, 7) !== filas[i - 1].fecha.slice(0, 7) ? i : -1)).filter((i) => i >= 0);
  const salto = Math.max(1, Math.ceil(inicios.length / caben));
  return inicios.filter((_, k) => k % salto === 0);
 }
 const salto = Math.ceil(n / caben);
 const out: number[] = [];
 for (let i = n - 1; i >= 0; i -= salto) out.unshift(i);
 return out;
}

function etiquetaFecha(r: Cierre, largo: boolean): string {
 const d = parseFecha(r.fecha);
 if (!d) return r.fecha;
 return largo ? `${MESES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` : `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

function PizarraDiaria({ cierres, stale }: { cierres: Cierre[]; stale?: boolean }) {
 const [dias, setDias] = useState(90);
 const [velas, setVelas] = useState(false);
 const [media, setMedia] = useState(false);
 const [elegido, setElegido] = useState<number | null>(null);
 const [fijado, setFijado] = useState(false);
 const caja = useRef<HTMLDivElement>(null);
 const [proporcion, setProporcion] = useState(1366 / 320);

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
 const penultimo = cierres[cierres.length - 2];
 const hayVelas = cierres.some((r) => r.apertura !== undefined);

 // Media móvil de 20 sesiones sobre toda la serie (así el inicio del rango
 // también tiene media).
 const medias = useMemo(() => {
  const out: (number | null)[] = [];
  let suma = 0;
  cierres.forEach((r, i) => {
   suma += r.precio;
   if (i >= 20) suma -= cierres[i - 20].precio;
   out.push(i >= 19 ? suma / 20 : null);
  });
  return out;
 }, [cierres]);

 const desdeIndice = useMemo(() => {
  if (!dias || !ultimo) return 0;
  const corte = new Date(`${ultimo.fecha}T00:00:00Z`);
  corte.setUTCDate(corte.getUTCDate() - dias + 1);
  const desde = corte.toISOString().slice(0, 10);
  const i = cierres.findIndex((r) => r.fecha >= desde);
  return i < 0 ? 0 : i;
 }, [cierres, dias, ultimo]);
 const filas = cierres.slice(desdeIndice);
 const mediasRango = medias.slice(desdeIndice);
 const usarVelas = velas && hayVelas;

 const h = 320;
 const w = Math.max(320, Math.round(h * proporcion));
 const M = { top: 14, right: 62, bottom: 30, left: 10 };
 const anchoUtil = w - M.left - M.right;
 const altoUtil = h - M.top - M.bottom;

 const hayGrafico = filas.length >= 2;
 const valores = filas.flatMap((r) => (usarVelas && r.maximo && r.minimo ? [r.maximo, r.minimo] : [r.precio]));
 if (media) mediasRango.forEach((m) => m !== null && valores.push(m));
 const esc = escalaPrecios(Math.min(...valores), Math.max(...valores));
 const paso = anchoUtil / Math.max(1, filas.length - 1);
 // Con velas se deja medio paso a cada lado para que la primera y la última no queden cortadas.
 const margenVela = usarVelas ? Math.min(paso / 2, 12) : 0;
 const xDe = (i: number) => M.left + margenVela + (i * (anchoUtil - margenVela * 2)) / Math.max(1, filas.length - 1);
 const yDe = (v: number) => M.top + altoUtil - ((v - esc.lo) / (esc.hi - esc.lo)) * altoUtil;

 const inicio = filas[0];
 const fin = filas[filas.length - 1];
 const varRango = inicio && fin ? cambio(fin.precio, inicio.precio) : null;
 const colorRango = varRango && varRango.abs < 0 ? BAJA : SUBE;
 const maxRango = filas.reduce((a, r) => (r.precio > a.precio ? r : a), filas[0] ?? { fecha: "", precio: 0 });
 const minRango = filas.reduce((a, r) => (r.precio < a.precio ? r : a), filas[0] ?? { fecha: "", precio: 0 });
 const varDia = ultimo ? cambio(ultimo.precio, penultimo?.precio) : null;

 const linea = filas.map((r, i) => `${i ? "L" : "M"}${xDe(i).toFixed(1)} ${yDe(r.precio).toFixed(1)}`).join(" ");
 const lineaMedia = mediasRango
  .map((m, i) => (m === null ? null : `${xDe(i).toFixed(1)} ${yDe(m).toFixed(1)}`))
  .filter(Boolean)
  .map((p, i) => `${i ? "L" : "M"}${p}`)
  .join(" ");
 const marcasX = hayGrafico ? marcasFechas(filas, anchoUtil) : [];
 const etiquetasLargas = hayGrafico && (Date.parse(fin.fecha) - Date.parse(inicio.fecha)) / 86400000 > 100;
 const sel = elegido === null || !hayGrafico ? null : Math.max(0, Math.min(filas.length - 1, elegido));
 const selFila = sel === null ? null : filas[sel];
 const selAntes = sel === null ? undefined : cierres[desdeIndice + sel - 1]?.precio;

 const indiceDe = (ev: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
  const r = ev.currentTarget.getBoundingClientRect();
  const px = ((ev.clientX - r.left) / r.width) * w;
  return Math.round(((px - M.left - margenVela) / (anchoUtil - margenVela * 2)) * (filas.length - 1));
 };

 // Tabla por mes con lo que se ve en el gráfico.
 const porMes = new Map<string, number[]>();
 filas.forEach((r) => {
  const k = r.fecha.slice(0, 7);
  porMes.set(k, [...(porMes.get(k) ?? []), r.precio]);
 });
 const meses = Array.from(porMes.keys()).sort().reverse().slice(0, 12);
 const variosPorMes = meses.some((k) => porMes.get(k)!.length > 1);
 const rangoLabel = RANGOS_PIZARRA.find((r) => r.dias === dias)?.label ?? "";

 return (
  <section id="redcafe-price-daily" className="redcafe-price-board">
   <div className="redcafe-price-head">
    <div>
     <p className="rotulo text-filtrado-600">ICE Coffee C · cierres diarios</p>
     <h1 className="font-titulo text-2xl font-bold text-cafe">Precio histórico del café</h1>
     <p className="redcafe-price-date" role="status">
      {ultimo ? `Último cierre: ${fechaLarga(ultimo.fecha)} · USD/quintal${stale ? " · dato guardado" : ""}` : "Sin cierres diarios disponibles"}
     </p>
    </div>
    <div className="rcp-cabecera-valor">
     <div className="redcafe-price-value">{ultimo ? fmtUsd(ultimo.precio) : "Sin datos"}</div>
     {varDia && (
      <p className="rcp-var" style={{ color: varDia.abs < 0 ? BAJA : SUBE }}>
       {fmtCambio(varDia)} <span>vs. cierre anterior</span>
      </p>
     )}
    </div>
   </div>

   <div className="rcp-controles">
    <div className="redcafe-range-tabs" role="group" aria-label="Rango de fechas">
     {RANGOS_PIZARRA.map((r) => (
      <button key={r.label} type="button" aria-pressed={dias === r.dias} onClick={() => { setDias(r.dias); setElegido(null); setFijado(false); }}>
       {r.label}
      </button>
     ))}
    </div>
    <div className="redcafe-range-tabs" role="group" aria-label="Tipo de gráfico">
     <button type="button" aria-pressed={!usarVelas} onClick={() => setVelas(false)}>Línea</button>
     {hayVelas && <button type="button" aria-pressed={usarVelas} onClick={() => setVelas(true)}>Velas</button>}
     <button type="button" aria-pressed={media} onClick={() => setMedia(!media)}>Media 20 días</button>
    </div>
   </div>

   {hayGrafico && (
    <dl className="rcp-resumen">
     <div><dt>Inicio {rangoLabel}</dt><dd>{fmtUsd(inicio.precio)}</dd><dd className="rcp-sub">{fechaLarga(inicio.fecha)}</dd></div>
     <div><dt>Cierre más alto</dt><dd>{fmtUsd(maxRango.precio)}</dd><dd className="rcp-sub">{fechaLarga(maxRango.fecha)}</dd></div>
     <div><dt>Cierre más bajo</dt><dd>{fmtUsd(minRango.precio)}</dd><dd className="rcp-sub">{fechaLarga(minRango.fecha)}</dd></div>
     <div><dt>Variación {rangoLabel}</dt><dd style={{ color: colorRango }}>{fmtCambio(varRango)}</dd><dd className="rcp-sub">{filas.length} sesiones</dd></div>
    </dl>
   )}

   <div className="redcafe-price-chart rcp-grafico" ref={caja}>
    {hayGrafico ? (
     <>
      <svg
       viewBox={`0 0 ${w} ${h}`}
       role="img"
       tabIndex={0}
       aria-label={`Gráfico de cierres diarios del café entre ${inicio.fecha} y ${fin.fecha}: de ${fmtUsd(inicio.precio)} a ${fmtUsd(fin.precio)}. Pasa el dedo o usa las flechas para ver cada día.`}
       onPointerMove={(ev) => { if (!fijado) setElegido(indiceDe(ev)); }}
       onPointerLeave={() => { if (!fijado) setElegido(null); }}
       onClick={(ev) => { setFijado(!fijado); setElegido(indiceDe(ev)); }}
       onKeyDown={(ev) => {
        if (ev.key === "Escape") { setFijado(false); setElegido(null); return; }
        if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
        ev.preventDefault();
        setFijado(true);
        setElegido((sel ?? filas.length - 1) + (ev.key === "ArrowLeft" ? -1 : 1));
       }}
      >
       <defs>
        <linearGradient id="rcpArea" x1="0" x2="0" y1="0" y2="1">
         <stop offset="0%" stopColor={colorRango} stopOpacity="0.18" />
         <stop offset="100%" stopColor={colorRango} stopOpacity="0" />
        </linearGradient>
       </defs>
       {/* Rejilla y eje de precios a la derecha */}
       {esc.marcas.map((v) => (
        <g key={v}>
         <line x1={M.left} x2={M.left + anchoUtil} y1={yDe(v)} y2={yDe(v)} stroke="rgba(59,26,12,.09)" />
         <text x={M.left + anchoUtil + 8} y={yDe(v) + 4} fontSize="11" fill={TEXTO_EJE}>${v.toFixed(esc.decimales)}</text>
        </g>
       ))}
       {/* Eje de fechas */}
       <line x1={M.left} x2={M.left + anchoUtil} y1={M.top + altoUtil} y2={M.top + altoUtil} stroke="rgba(59,26,12,.25)" />
       {marcasX.map((i) => (
        <g key={filas[i].fecha}>
         <line x1={xDe(i)} x2={xDe(i)} y1={M.top + altoUtil} y2={M.top + altoUtil + 4} stroke="rgba(59,26,12,.35)" />
         <text x={xDe(i)} y={h - 8} fontSize="11" fill={TEXTO_EJE} textAnchor={xDe(i) < M.left + 24 ? "start" : xDe(i) > M.left + anchoUtil - 24 ? "end" : "middle"}>
          {etiquetaFecha(filas[i], etiquetasLargas)}
         </text>
        </g>
       ))}
       {/* Precio al inicio del rango, como referencia */}
       <line x1={M.left} x2={M.left + anchoUtil} y1={yDe(inicio.precio)} y2={yDe(inicio.precio)} stroke={TEXTO_EJE} strokeDasharray="2 4" strokeOpacity=".7" />

       {usarVelas ? (
        filas.map((r, i) => {
         const o = r.apertura ?? r.precio, c = r.precio;
         const color = c >= o ? SUBE : BAJA;
         const cuerpo = Math.max(1, Math.min(14, paso * 0.62));
         const yA = yDe(Math.max(o, c)), yB = yDe(Math.min(o, c));
         return (
          <g key={r.fecha}>
           <line x1={xDe(i)} x2={xDe(i)} y1={yDe(r.maximo ?? Math.max(o, c))} y2={yDe(r.minimo ?? Math.min(o, c))} stroke={color} strokeWidth="1" />
           <rect x={xDe(i) - cuerpo / 2} y={yA} width={cuerpo} height={Math.max(1, yB - yA)} fill={c >= o ? "#ffffff" : color} stroke={color} strokeWidth="1" />
          </g>
         );
        })
       ) : (
        <>
         <path d={`${linea} L${xDe(filas.length - 1).toFixed(1)} ${M.top + altoUtil} L${xDe(0).toFixed(1)} ${M.top + altoUtil} Z`} fill="url(#rcpArea)" />
         <path d={linea} fill="none" stroke={colorRango} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
         {filas.length <= 31 && filas.map((r, i) => <circle key={r.fecha} cx={xDe(i)} cy={yDe(r.precio)} r="2.6" fill={colorRango} />)}
        </>
       )}
       {media && lineaMedia && <path d={lineaMedia} fill="none" stroke="#a66a2c" strokeWidth="1.6" strokeDasharray="6 4" />}

       {/* Último cierre marcado en el eje de precios */}
       <rect x={M.left + anchoUtil + 2} y={yDe(fin.precio) - 10} width={M.right - 4} height="20" rx="4" fill={colorRango} />
       <text x={M.left + anchoUtil + 7} y={yDe(fin.precio) + 4} fontSize="11" fontWeight="700" fill="#ffffff">{fin.precio.toFixed(2)}</text>

       {sel !== null && selFila && (
        <>
         <line x1={xDe(sel)} x2={xDe(sel)} y1={M.top} y2={M.top + altoUtil} stroke="#3b1a0c" strokeDasharray="4 4" strokeWidth="1" />
         <line x1={M.left} x2={M.left + anchoUtil} y1={yDe(selFila.precio)} y2={yDe(selFila.precio)} stroke="#3b1a0c" strokeDasharray="4 4" strokeWidth="1" strokeOpacity=".5" />
         <circle cx={xDe(sel)} cy={yDe(selFila.precio)} r="5" fill={colorRango} stroke="#ffffff" strokeWidth="2" />
        </>
       )}
      </svg>
      {sel !== null && selFila && (
       <div
        className="rcp-tip"
        role="status"
        aria-live="polite"
        style={{ left: `${Math.max(14, Math.min(86, (xDe(sel) / w) * 100))}%` }}
       >
        <strong>{fechaLarga(selFila.fecha)}</strong>
        <span className="rcp-tip-precio">{fmtUsd(selFila.precio)} <small>USD/quintal</small></span>
        <span style={{ color: (cambio(selFila.precio, selAntes)?.abs ?? 0) < 0 ? "#ffb4a6" : "#a8e0b8" }}>
         {fmtCambio(cambio(selFila.precio, selAntes))} en el día
        </span>
        {selFila.apertura !== undefined && (
         <span className="rcp-tip-ohlc">
          Apertura {selFila.apertura.toFixed(2)} · Máx. {selFila.maximo?.toFixed(2)} · Mín. {selFila.minimo?.toFixed(2)}
         </span>
        )}
        {fijado && <span className="rcp-tip-ohlc">Toca otra vez o pulsa Esc para soltar</span>}
       </div>
      )}
     </>
    ) : (
     <p className="redcafe-launch-note">Histórico pendiente de actualización.</p>
    )}
   </div>
   <p className="rcp-nota">
    Cada punto es el cierre de una jornada del futuro Coffee C (ICE, Nueva York). Sin cotización en fines de semana ni festivos.
    La línea punteada marca el precio al inicio del rango.
   </p>
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
