// Port de api/precios.php y api/precios-refresh.php. El refresco lo hace el
// propio servidor cada 6 h (tarea interna): ya no depende de un cron de
// cPanel, que además apuntaba a una ruta equivocada (/plataforma/api/...).
// «refresh» desde fuera queda limitado para que nadie dispare consultas
// externas sin fin.
import { Cruda, fail, type Modulo } from "../lib/http.js";
import { mapa, mutarMapa, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";

const SEIS_H = 6 * 3600_000;
type Fila = { mes: string; centsLb: number };
/** Cierre de una jornada. apertura/maximo/minimo solo si la fuente los trae. */
type Dia = { fecha: string; mes: string; centsLb: number; usdQqal: number; apertura?: number; maximo?: number; minimo?: number };
const r2 = (n: number) => Math.round(n * 100) / 100;

async function deYahoo(): Promise<Fila[] | null> {
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/KC=F?interval=1mo&range=2y", {
      headers: { "User-Agent": "Mozilla/5.0 redcafeecuador/1.0", Accept: "application/json" }, signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as Doc;
    const res = j?.chart?.result?.[0];
    const ts: number[] = res?.timestamp ?? [], cls: (number | null)[] = res?.indicators?.quote?.[0]?.close ?? [];
    const porMes = new Map<string, Fila>();
    for (let i = 0; i < Math.min(ts.length, cls.length); i++) {
      const c = cls[i];
      if (!c || c <= 0) continue;
      const mes = new Date(ts[i] * 1000).toISOString().slice(0, 7);
      porMes.set(mes, { mes, centsLb: Math.round(c * 100) / 100 });
    }
    return [...porMes.values()].reverse().slice(0, 13);
  } catch {
    return null;
  }
}

/**
 * Cierres diarios de la misma fuente (KC=F). Igual que en api/precios.php del
 * sitio PHP: consulta aparte, dos años, sin rellenar fines de semana ni
 * festivos. Además guarda apertura, máximo y mínimo de cada jornada para el
 * gráfico de velas. Más reciente primero.
 */
export function diasDeYahoo(j: Doc): Dia[] {
  const res = j?.chart?.result?.[0];
  const ts: number[] = res?.timestamp ?? [];
  const q = res?.indicators?.quote?.[0] ?? {};
  const cls: (number | null)[] = q.close ?? [], ops: (number | null)[] = q.open ?? [], his: (number | null)[] = q.high ?? [], los: (number | null)[] = q.low ?? [];
  const porDia = new Map<string, Dia>();
  for (let i = 0; i < Math.min(ts.length, cls.length); i++) {
    const c = cls[i];
    if (!c || c <= 0) continue;
    const fecha = new Date(ts[i] * 1000).toISOString().slice(0, 10);
    const d: Dia = { fecha, mes: fecha.slice(0, 7), centsLb: r2(c), usdQqal: r2(c) };
    const o = ops[i], h = his[i], l = los[i];
    if (o && h && l && o > 0 && h >= Math.max(o, c) && l <= Math.min(o, c) && l > 0) {
      d.apertura = r2(o); d.maximo = r2(h); d.minimo = r2(l);
    }
    porDia.set(fecha, d);
  }
  return [...porDia.values()].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

async function diarioDeYahoo(): Promise<Dia[]> {
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/KC=F?interval=1d&range=2y", {
      headers: { "User-Agent": "Mozilla/5.0 redcafeecuador/1.0", Accept: "application/json" }, signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    return diasDeYahoo((await r.json()) as Doc);
  } catch {
    return [];
  }
}

async function deFuenteOficial(): Promise<Fila[] | null> {
  const url = process.env.REDCAFE_PRICE_OFFICIAL_URL ?? "";
  if (!/^https?:\/\//.test(url)) return null;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    const j = (await r.json()) as Doc;
    const filas: Doc[] = j?.historico ?? j?.data?.historico ?? j?.rows ?? [];
    const out = filas.map((x) => ({ mes: String(x.mes ?? x.fecha ?? x.date ?? "").slice(0, 7), centsLb: Number(x.usdQqal ?? x.centsLb ?? x.precio ?? x.valor) }))
      .filter((x) => x.mes && Number.isFinite(x.centsLb)).map((x) => ({ ...x, centsLb: Math.round(x.centsLb * 100) / 100 }));
    return out.length ? out.sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 13) : null;
  } catch {
    return null;
  }
}

export function armar(filas: Fila[], modo: "oficial" | "respaldo", diario: Dia[] = []): Doc {
  const [top, prev] = filas;
  const ahora = new Date();
  // Con fuente de respaldo, el precio de cabecera es el último cierre diario y
  // la variación es contra el cierre anterior (como el sitio PHP).
  const [cierre, anterior] = modo === "respaldo" ? diario : [];
  const variacion = cierre && anterior && anterior.centsLb > 0
    ? r2(((cierre.centsLb - anterior.centsLb) / anterior.centsLb) * 100)
    : prev && prev.centsLb > 0 ? r2(((top.centsLb - prev.centsLb) / prev.centsLb) * 100) : null;
  return {
    updated_at: ahora.toISOString().replace(/\.\d{3}Z$/, "+00:00"),
    updated_human: `Actualizado ${ahora.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    precio: {
      valor: cierre?.centsLb ?? top.centsLb, valor_cents: cierre?.centsLb ?? top.centsLb, unidad: "USD/quintal", mes: top.mes,
      fecha: cierre?.fecha ?? null, variacion_pct: variacion, variacion_periodo: cierre ? "cierre_anterior" : "mes_anterior",
    },
    fuente: modo === "oficial"
      ? { nombre: "Fuente oficial configurada", url: process.env.REDCAFE_PRICE_OFFICIAL_URL ?? "", periodicidad: "Según endpoint configurado", descripcion: "Datos cargados desde REDCAFE_PRICE_OFFICIAL_URL.", tipo: "oficial_configurada" }
      : { nombre: "KC=F vía Yahoo Finance — respaldo operativo", url: "https://finance.yahoo.com/quote/KC=F/", periodicidad: "Diaria para el gráfico; mensual para el resumen", descripcion: "Respaldo operativo con la cotización internacional de café arábica en ICE Futures (NY). No sustituye una fuente oficial configurada.", tipo: "respaldo_operativo" },
    referencias_oficiales: [
      { nombre: "ICO Composite Indicator Price", url: "https://www.ico.org/coffee_prices.html" },
      { nombre: 'ICE Arabica Coffee "C"', url: "https://www.theice.com/products/15/Coffee-C-Futures" },
      { nombre: "Banco Central del Ecuador", url: "https://www.bce.fin.ec/" },
      { nombre: "ANECAFÉ Ecuador", url: "http://www.anecafe.org.ec/" },
    ],
    historico: filas.map((f) => ({ mes: f.mes, centsLb: f.centsLb, usdQqal: f.centsLb })),
    // Siempre presente: vacía si la consulta diaria falló.
    historico_diario: diario,
  };
}

export async function obtenerPrecios(forzar = false): Promise<Doc> {
  const cache = await mapa("precios-cache");
  const edad = cache.updated_at ? Date.now() - Date.parse(cache.updated_at) : Infinity;
  const cacheDiario = Array.isArray(cache.historico_diario) && cache.historico_diario.length >= 2;
  // Una caché anterior a la serie diaria (sin la clave) se rehace al momento;
  // si la clave está pero vacía, se espera a las 6 h como siempre.
  if (!forzar && cache.fuente?.tipo && "historico_diario" in cache && edad < SEIS_H) return { ...cache, stale: false };
  let modo: "oficial" | "respaldo" = "oficial";
  let filas = await deFuenteOficial();
  if (!filas) { modo = "respaldo"; filas = await deYahoo(); }
  if (filas?.length) {
    const diario = await diarioDeYahoo();
    const p = armar(filas, modo, diario);
    // Si solo falla la serie diaria, se conserva la última buena.
    if (!diario.length && cacheDiario) { p.historico_diario = cache.historico_diario; p.diario_stale = true; }
    await mutarMapa("precios-cache", () => p);
    return { ...p, stale: false };
  }
  if (cache.updated_at) return { ...cache, stale: true, reason: "fuente externa no disponible, mostrando último cache" };
  return { stale: true, reason: "sin datos disponibles", precio: null };
}

/** Tarea interna: refresca cada 6 h sin esperar a un visitante. */
export function programarPrecios() {
  const tic = () => obtenerPrecios(false).catch(() => {});
  setTimeout(tic, 10_000).unref();
  setInterval(tic, SEIS_H).unref();
}

export const precios: Modulo = {
  porDefecto: "list",
  noValida: { mensaje: "Acción no válida. Use list|refresh.", codigo: 400 },
  acciones: {
    list: () => obtenerPrecios(false),
    actual: () => obtenerPrecios(false),
    async refresh(ctx) {
      if (!(await cupo(ctx, "precios_refresh", 3, 3600))) return obtenerPrecios(false);
      return obtenerPrecios(true);
    },
  },
};

/** precios-refresh.php: ahora solo informa (el servidor refresca solo). */
export const preciosRefresh: Modulo = {
  porDefecto: "estado",
  acciones: {
    async estado() {
      const c = await mapa("precios-cache");
      const edad = c.updated_at ? Math.round((Date.now() - Date.parse(c.updated_at)) / 1000) : null;
      return new Cruda(edad !== null ? `OK (cache ${edad} segundos; el servidor refresca cada 6 h)\n` : "SIN CACHE (se refresca en segundo plano)\n", "text/plain; charset=utf-8");
    },
  },
};
void fail;
