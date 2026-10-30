"use client";

// Datos vivos de la portada (antes los pintaba la capa propia DESPUÉS de cargar,
// y la página saltaba): cifras de la Red, franja del precio y provincias reales
// del mapa. Ahora el hueco sale en el HTML desde el principio y solo cambian
// los números cuando llegan.
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";

type Provincia = { nombre: string; miembros: number; lotes: number };
type Cifras = {
  miembros: number;
  productores: number;
  compran_cafe: number;
  provincias: number;
  por_provincia?: Provincia[];
};

let promesa: Promise<Cifras | null> | null = null;
function pedirCifras(): Promise<Cifras | null> {
  if (!promesa) {
    promesa = fetch(CONFIG.api("/api/metricas.php?action=cifras"), { credentials: "omit" })
      .then((r) => r.json())
      .then((j) => (j && j.ok && j.data) || null)
      .catch(() => {
        promesa = null;
        return null;
      });
  }
  return promesa;
}

function useCifras() {
  const [d, setD] = useState<Cifras | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    pedirCifras().then((x) => vivo && setD(x));
    return () => {
      vivo = false;
    };
  }, []);
  return d;
}

/** Franja «La Red hoy» bajo la cabecera. */
export function CifrasRed() {
  const d = useCifras();
  if (d === null || (d && !(d.miembros > 0))) return null;
  const n = (v?: number) => (d ? String(v ?? 0) : "—");
  const datos: Array<[string, string]> = [
    [n(d?.miembros), "miembros en la Red"],
    [n(d?.productores), "productores"],
    [n(d?.compran_cafe), "compradores, tostadores y exportadores"],
    [n(d?.provincias), "provincias representadas"],
  ];
  return (
    <section id="redcafe-cifras-red" className="redcafe-cifras" aria-label="La Red hoy" aria-busy={d === undefined}>
      <div className="redcafe-cifras-caja">
        {datos.map(([v, l]) => (
          <div key={l} className="redcafe-cifra">
            <strong>{v}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

type FilaPrecio = { fecha: string; precio: number };
function fila(r: Record<string, unknown>): FilaPrecio | null {
  const fecha = (r.fecha || r.mes || r.date || r.dia) as string | undefined;
  const precio = Number(r.precio || r.usdQqal || r.centsLb || r.close || r.valor || r.cierre);
  return fecha && Number.isFinite(precio) ? { fecha: String(fecha), precio } : null;
}

/** Franja «Precio de mercado» con el último cierre. */
export function FranjaPrecio() {
  const [ultimo, setUltimo] = useState<FilaPrecio | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    fetch(CONFIG.api("/api/precios.php?action=list"), { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        const res = (j && j.data) || {};
        const filas = ((res.historico || res.precios || []) as Record<string, unknown>[])
          .map(fila)
          .filter((x): x is FilaPrecio => !!x)
          .sort((a, b) => a.fecha.localeCompare(b.fecha));
        if (vivo) setUltimo(filas[filas.length - 1] ?? null);
      })
      .catch(() => vivo && setUltimo(null));
    return () => {
      vivo = false;
    };
  }, []);
  return (
    <section id="redcafe-home-price-strip" className="redcafe-home-price-strip">
      <div className="redcafe-home-price-inner">
        <div className="redcafe-home-price-copy">
          <p className="redcafe-home-price-kicker">Precio de mercado</p>
          <h2>Referencia mensual para negociar café</h2>
          <p>Consulta el panel con fuente, histórico y lectura para Ecuador antes de publicar, comprar o negociar café.</p>
        </div>
        <div className="redcafe-home-price-metric" aria-live="polite">
          <span>ICE Coffee C</span>
          <strong>{ultimo === undefined ? "Actualizando..." : ultimo ? "$" + ultimo.precio.toFixed(2) : "Ver histórico"}</strong>
          <small>{ultimo ? "Última referencia: " + ultimo.fecha : "Fuente: panel de precios"}</small>
        </div>
        <Link href="/servicios/precios/">Abrir panel de precios</Link>
      </div>
    </section>
  );
}

/** Provincias reales (con lotes o miembros) en «Ponemos el café ecuatoriano en el mapa». */
export function ProvinciasReales() {
  const d = useCifras();
  const lista = (d && d.por_provincia) || [];
  const mostradas = lista.slice(0, 8);
  const resto = (d?.provincias || 0) - mostradas.filter((x) => x.miembros > 0).length;
  return (
    <div id="redcafe-mapa-provincias" className="mt-6 flex min-h-11 flex-wrap gap-2 redcafe-mapa-provincias" aria-busy={d === undefined}>
      {mostradas.map((x) => (
        <span
          key={x.nombre}
          className={"rounded-full border border-cafe/15 bg-white px-4 py-2 text-sm font-semibold text-pizarra" + (x.lotes > 0 ? " redcafe-mapa-con-lotes" : "")}
        >
          {x.nombre}
          <small>
            {x.lotes > 0
              ? " · " + x.lotes + (x.lotes === 1 ? " lote" : " lotes")
              : " · " + x.miembros + (x.miembros === 1 ? " miembro" : " miembros")}
          </small>
        </span>
      ))}
      {resto > 0 && (
        <span className="rounded-full border border-cafe/15 px-4 py-2 text-sm text-pizarra-suave">
          +{resto}
          {resto === 1 ? " provincia más" : " provincias más"}
        </span>
      )}
    </div>
  );
}
