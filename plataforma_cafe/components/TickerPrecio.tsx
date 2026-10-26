"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONFIG } from "@/lib/config";

interface PrecioData {
  valor: number;
  valor_cents: number;
  unidad: string;
  mes: string;
  variacion_pct: number | null;
}

interface HistoricoFila {
  /** Solo en la serie diaria: el día exacto (YYYY-MM-DD). */
  fecha?: string;
  mes: string;
  centsLb: number;
  usdQqal: number;
}

interface ApiOk {
  ok: true;
  data: {
    updated_at: string;
    precio: PrecioData;
    fuente: { nombre: string; url: string; periodicidad: string };
    historico_diario?: HistoricoFila[];
    stale?: boolean;
  };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

const MESES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];

const MESES_CORTOS = [
  "ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic",
];

/** De "2026-09-29" devuelve "29 sep": el día exacto contra el que se compara. */
function diaCorto(fecha: string | undefined): string | null {
  if (!fecha) return null;
  const d = new Date(`${fecha}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MESES_CORTOS[d.getUTCMonth()]}`;
}

/** De "2026-08" devuelve "julio 2026": el mes contra el que se compara.
 *  Un porcentaje sin período de referencia no informa de nada. */
function mesAnterior(mes: string | undefined): string | null {
  if (!mes) return null;
  const [a, m] = mes.split("-").map(Number);
  if (!a || !m) return null;
  const anterior = m === 1 ? 12 : m - 1;
  const anio = m === 1 ? a - 1 : a;
  return `${MESES[anterior - 1]} ${anio}`;
}

export function TickerPrecio() {
  const [precio, setPrecio] = useState<PrecioData | null>(null);
  const [series, setSeries] = useState<HistoricoFila[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(CONFIG.api("/api/precios.php?action=list"), {
        cache: "no-store",
      });
      const j: ApiOk = await r.json();
      if (j.ok && j.data?.precio) {
        setPrecio(j.data.precio);
        // Viene de la más reciente a la más antigua, que es como la devuelve la
        // API. Se filtran las filas sin precio para no calcular con huecos.
        setSeries(
          Array.isArray(j.data.historico_diario)
            ? j.data.historico_diario.filter((f) => f.usdQqal > 0)
            : []
        );
        setUpdatedAt(j.data.updated_at);
        setStale(Boolean(j.data.stale));
      }
    } catch {
      /* silencioso: si falla, mantiene último valor */
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 10 * 60 * 1000); // 10 min
    return () => clearInterval(id);
  }, []);

  if (!precio) return null;

  /*
   * Cotización del día y variación contra el cierre anterior.
   *
   * Antes se comparaba el precio contra el cierre del MES anterior y se
   * rotulaba "vs agosto 2026". En una cinta que se lee de un vistazo, un
   * -15 % mensual parece la caída de hoy, y no lo es. Ahora:
   *   - la variación es día contra día, que es lo único que cambia de una
   *     sesión a otra;
   *   - se dice contra qué día exacto, porque el mercado cierra los fines de
   *     semana: un lunes, "hoy contra ayer" sería en realidad contra el
   *     viernes, y decirlo así sería mentir por poco;
   *   - si no hay serie diaria, se cae a la comparación mensual de siempre y
   *     se rotula como mensual, para no mezclarlas.
   */
  const hoy = series[0] ?? null;
  const anterior = series[1] ?? null;
  const valorHoy = hoy ? hoy.usdQqal : precio.valor;
  const haySerieDiaria = anterior !== null && anterior.usdQqal > 0;
  const variacion = haySerieDiaria
    ? ((valorHoy - anterior.usdQqal) / anterior.usdQqal) * 100
    : precio.variacion_pct;
  const contra = haySerieDiaria ? diaCorto(anterior.fecha) : mesAnterior(precio.mes);

  const varSign = variacion !== null && variacion > 0 ? "▲" : variacion !== null && variacion < 0 ? "▼" : "·";
  const varColor =
    variacion === null
      ? "text-crema/70"
      : variacion > 0
      ? "text-hoja-clara"   // verde hoja = subió
      : variacion < 0
      ? "text-cereza" // cereza = bajó
      : "text-crema/70";

  return (
    <div
      className="border-b border-cafe/20 bg-cafe text-crema"
      role="status"
      aria-live="polite"
      aria-label="Precio referencial del café arábica"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-1.5 text-xs md:justify-between md:text-sm">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">☕</span>
          <span className="font-semibold uppercase tracking-wider text-crema/80">
            Café arábica ·{" "}
            <span className="font-titulo text-base font-bold text-acento-claro md:text-lg">
              ${valorHoy.toFixed(2)}
            </span>{" "}
            {precio.unidad}
          </span>
          {variacion !== null && (
            /*
             * La variación va un punto mayor que el texto que la rodea y con
             * más contraste: es el dato por el que se entra a mirar, y antes
             * quedaba tan apagada como el resto de la cinta.
             */
            <span
              className={`text-sm font-bold md:text-base ${varColor}`}
              title={
                haySerieDiaria && contra
                  ? `Comparado con el cierre del ${contra}`
                  : contra
                  ? `Comparado con el cierre de ${contra}`
                  : undefined
              }
            >
              {varSign} {Math.abs(variacion).toFixed(2)}%{" "}
              {contra && (
                <span className="ml-1 text-xs font-medium text-crema/80 md:text-sm">
                  {haySerieDiaria ? `vs cierre del ${contra}` : `vs ${contra}`}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-crema/70">
          <span className="hidden sm:inline">
            {hoy?.fecha ? `Cierre ${hoy.fecha}` : `Mes ${precio.mes}`} ·{" "}
            {updatedAt ? timeAgo(updatedAt) : "—"}
          </span>
          <Link
            href="/servicios/precios"
            className="rounded-full bg-acento-claro px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cafe transition hover:bg-latte hover:text-crema"
            title="Abrir panel completo de precios"
          >
            Panel de precios
          </Link>
          <a
            href="https://finance.yahoo.com/quote/KC=F/"
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-full border border-crema/30 px-2 py-0.5 text-[10px] uppercase tracking-wider hover:border-latte hover:text-acento-claro"
            title="Fuente: KC=F vía Yahoo Finance"
          >
            {/* Antes «Fuente oficial» con enlace a ICO y la capa lo cambiaba tras
                cargar (enhanceTickerSourceLabel). Ahora es el texto definitivo. */}
            Fuente
          </a>
          {stale && (
            <span
              className="font-semibold text-acento-claro"
              title="La fuente oficial no responde; se muestra el último dato válido"
            >
              · dato sin actualizar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
