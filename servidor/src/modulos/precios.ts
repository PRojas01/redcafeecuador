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

function armar(filas: Fila[], modo: "oficial" | "respaldo"): Doc {
  const [top, prev] = filas;
  const ahora = new Date();
  return {
    updated_at: ahora.toISOString().replace(/\.\d{3}Z$/, "+00:00"),
    updated_human: `Actualizado ${ahora.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    precio: { valor: top.centsLb, valor_cents: top.centsLb, unidad: "USD/quintal", mes: top.mes, variacion_pct: prev && prev.centsLb > 0 ? Math.round(((top.centsLb - prev.centsLb) / prev.centsLb) * 10000) / 100 : null },
    fuente: modo === "oficial"
      ? { nombre: "Fuente oficial configurada", url: process.env.REDCAFE_PRICE_OFFICIAL_URL ?? "", periodicidad: "Según endpoint configurado", descripcion: "Datos cargados desde REDCAFE_PRICE_OFFICIAL_URL.", tipo: "oficial_configurada" }
      : { nombre: "KC=F vía Yahoo Finance — respaldo operativo", url: "https://finance.yahoo.com/quote/KC=F/", periodicidad: "Mensual (último cierre disponible)", descripcion: "Respaldo operativo con la cotización internacional de café arábica en ICE Futures (NY). No sustituye una fuente oficial configurada.", tipo: "respaldo_operativo" },
    referencias_oficiales: [
      { nombre: "ICO Composite Indicator Price", url: "https://www.ico.org/coffee_prices.html" },
      { nombre: 'ICE Arabica Coffee "C"', url: "https://www.theice.com/products/15/Coffee-C-Futures" },
      { nombre: "Banco Central del Ecuador", url: "https://www.bce.fin.ec/" },
      { nombre: "ANECAFÉ Ecuador", url: "http://www.anecafe.org.ec/" },
    ],
    historico: filas.map((f) => ({ mes: f.mes, centsLb: f.centsLb, usdQqal: f.centsLb })),
  };
}

export async function obtenerPrecios(forzar = false): Promise<Doc> {
  const cache = await mapa("precios-cache");
  const edad = cache.updated_at ? Date.now() - Date.parse(cache.updated_at) : Infinity;
  if (!forzar && cache.fuente?.tipo && edad < SEIS_H) return { ...cache, stale: false };
  let modo: "oficial" | "respaldo" = "oficial";
  let filas = await deFuenteOficial();
  if (!filas) { modo = "respaldo"; filas = await deYahoo(); }
  if (filas?.length) {
    const p = armar(filas, modo);
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
