"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RECETAS, type Receta } from "@/lib/data";
import { useContenido } from "@/lib/useContenido";
import { Icono } from "@/components/Icono";
import { EstadoVacio } from "@/components/EstadoVacio";

const METODOS = Array.from(new Set(RECETAS.map((r) => r.metodo)));
const DIFICULTADES = ["fácil", "media", "alta"] as const;

const etiquetaDificultad: Record<Receta["dificultad"], string> = {
  fácil: "Fácil",
  media: "Media",
  alta: "Alta",
};

function formatoTiempo(min: number): string {
  if (min >= 720) return `${Math.round(min / 60)} h`;
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  return `${min} min`;
}

export default function RecetasPage() {
  const { items: recetas } = useContenido<Receta>("recetas", RECETAS);
  const [metodo, setMetodo] = useState("todos");
  const [dificultad, setDificultad] = useState("todos");

  const filtradas = useMemo(() => {
    return recetas.filter((r) => {
      const porMetodo = metodo === "todos" || r.metodo === metodo;
      const porDificultad = dificultad === "todos" || r.dificultad === dificultad;
      return porMetodo && porDificultad;
    });
  }, [recetas, metodo, dificultad]);

  const limpiar = () => {
    setMetodo("todos");
    setDificultad("todos");
  };

  return (
    <div>
      <section className="hero-gradient py-16 text-crema">
        <div className="mx-auto max-w-6xl px-4">
          <p className="badge bg-latte/15 text-acento-claro">
            <Icono nombre="amante" className="mr-1 h-4 w-4" />
            RECETAS DE LA RED
          </p>
          <h1 className="mt-3 font-titulo text-4xl font-bold leading-tight text-crema md:text-5xl">
            Prepara café de origen en casa
          </h1>
          <p className="mt-4 max-w-2xl text-crema/80">
            Métodos de preparación verificables, paso a paso: desde la prensa
            francesa hasta el espresso casero. Ideas para que el café
            ecuatoriano rinda su mejor taza.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-widest text-green-700">
                Método
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  className="rounded-lg border border-border-soft bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-text-primary"
                >
                  <option value="todos">Todos</option>
                  {METODOS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-widest text-green-700">
                Dificultad
                <select
                  value={dificultad}
                  onChange={(e) => setDificultad(e.target.value)}
                  className="rounded-lg border border-border-soft bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-text-primary"
                >
                  <option value="todos">Todas</option>
                  {DIFICULTADES.map((d) => (
                    <option key={d} value={d}>{etiquetaDificultad[d]}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-sm text-text-secondary">
              {filtradas.length} {filtradas.length === 1 ? "receta" : "recetas"}
            </p>
          </div>

          <div className="mt-8">
            {filtradas.length === 0 ? (
              <EstadoVacio
                icono="amante"
                titulo="No encontramos recetas con estos filtros"
                descripcion="Prueba con otro método o dificultad."
                cta="Limpiar filtros"
                onCta={limpiar}
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtradas.map((r) => (
                  <Link
                    key={r.id}
                    href={`/recetas/${r.slug ?? r.id}`}
                    className="card group flex flex-col overflow-hidden"
                  >
                    <div className="flex flex-1 flex-col p-6">
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-coffee-800">
                        <Icono nombre="amante" className="h-3.5 w-3.5" />
                        {r.metodo}
                      </span>
                      <h2 className="mt-3 font-titulo text-lg font-bold leading-snug text-coffee-900 transition group-hover:text-green-700">
                        {r.titulo}
                      </h2>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                        {r.resumen}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                        <span
                          className={`rounded-full px-2.5 py-1 font-semibold ${
                            r.dificultad === "fácil"
                              ? "bg-green-100 text-green-700"
                              : r.dificultad === "media"
                                ? "bg-gold-500/20 text-coffee-800"
                                : "bg-coffee-900/10 text-coffee-800"
                          }`}
                        >
                          {etiquetaDificultad[r.dificultad]}
                        </span>
                        <span className="rounded-full bg-cream-200 px-2.5 py-1 font-semibold text-coffee-700">
                          {formatoTiempo(r.minutos)}
                        </span>
                        <span className="rounded-full bg-cream-200 px-2.5 py-1 font-semibold text-coffee-700">
                          Ratio {r.ratio}
                        </span>
                        <span className="rounded-full bg-cream-200 px-2.5 py-1 font-semibold text-coffee-700">
                          {r.porciones} {r.porciones === 1 ? "taza" : "tazas"}
                        </span>
                      </div>
                      <span className="mt-5 inline-flex items-center justify-center rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream-50 transition group-hover:bg-coffee-700">
                        Ver receta
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}