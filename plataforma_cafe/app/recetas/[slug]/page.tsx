"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { RECETAS, type Receta } from "@/lib/data";
import { useContenido } from "@/lib/useContenido";
import { Icono } from "@/components/Icono";
import { TazaCenital } from "@/components/Lamina";
import { EstadoError } from "@/components/EstadoError";

function formatoTiempo(min: number): string {
  if (min >= 720) return `${Math.round(min / 60)} h`;
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  return `${min} min`;
}

function Badge({ children, className = "bg-cream-200 text-coffee-700" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-3 py-1 font-semibold ${className}`}>{children}</span>
  );
}

function Detalle({ receta }: { receta: Receta }) {
  const difClase =
    receta.dificultad === "fácil"
      ? "bg-green-100 text-green-700"
      : receta.dificultad === "media"
        ? "bg-gold-500/20 text-coffee-800"
        : "bg-coffee-900/10 text-coffee-800";

  return (
    <>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border-soft">
        <TazaCenital
          className="aspect-[16/6] w-full"
          puntaje={`${receta.metodo}`}
          notas={`${formatoTiempo(receta.minutos)} · ${receta.porciones} ${receta.porciones === 1 ? "taza" : "tazas"} · ratio ${receta.ratio}`}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        <Badge className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 font-bold uppercase tracking-wide text-coffee-800">
          <Icono nombre="amante" className="h-3.5 w-3.5" />
          {receta.metodo}
        </Badge>
        <Badge className={difClase}>
          Dificultad: {receta.dificultad}
        </Badge>
      </div>

      <h1 className="mt-3 font-titulo text-3xl font-bold leading-tight text-coffee-900">
        {receta.titulo}
      </h1>
      <p className="mt-2 text-text-secondary">{receta.resumen}</p>

      <div className="mt-5 grid gap-3 rounded-2xl border border-border-soft bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Tiempo</p>
          <p className="mt-1 font-semibold text-coffee-900">{formatoTiempo(receta.minutos)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Porciones</p>
          <p className="mt-1 font-semibold text-coffee-900">{receta.porciones} {receta.porciones === 1 ? "taza" : "tazas"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Molienda</p>
          <p className="mt-1 font-semibold text-coffee-900">{receta.molienda}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Temperatura</p>
          <p className="mt-1 font-semibold text-coffee-900">{receta.temperatura}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="font-titulo text-xl font-bold text-coffee-900">Preparación</h2>
          <ol className="mt-4 space-y-3">
            {receta.pasos.map((paso, i) => (
              <li key={i} className="flex items-start gap-4 rounded-2xl border border-border-soft bg-surface p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green-700 text-sm font-bold text-cream-50">
                  {i + 1}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-text-primary">{paso}</p>
              </li>
            ))}
          </ol>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border-soft bg-surface p-5">
            <h2 className="font-titulo text-lg font-bold text-coffee-900">Ingredientes y equipo</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {receta.ingredientes.map((ing, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-700">•</span>
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </div>

          {receta.consejo && (
            <div className="rounded-2xl border border-gold-500/40 bg-gold-500/10 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-coffee-800">Consejo</p>
              <p className="mt-2 text-sm leading-relaxed text-coffee-800">{receta.consejo}</p>
            </div>
          )}

          {receta.origenSugerido && (
            <div className="rounded-2xl border border-green-100 bg-green-100/50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">Origen que le va bien</p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{receta.origenSugerido}</p>
            </div>
          )}
        </aside>
      </div>

      <div className="card mt-10 p-6">
        <p className="font-titulo text-lg font-bold text-coffee-900">
          ¿Dónde encontrar café para esta receta?
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          En el Marketplace de la Red puedes comprar café ecuatoriano de origen
          directo y descubrir el perfil de cada finca.
        </p>
        <Link href="/marketplace" className="btn-accent mt-4">
          Explorar el Marketplace
        </Link>
      </div>
    </>
  );
}

export default function RecetaPage() {
  const params = useParams<{ slug: string }>();
  const { items: recetas } = useContenido<Receta>("recetas", RECETAS);
  const receta = recetas.find((r) => (r.slug ?? r.id) === params.slug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/recetas" className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:underline">
        <span aria-hidden="true">←</span> Todas las recetas
      </Link>

      {receta ? (
        <Detalle receta={receta} />
      ) : (
        <div className="mt-10">
          <EstadoError
            titulo="Receta no encontrada"
            descripcion="Esta receta no existe o fue retirada de la Red."
            href="/recetas"
            etiquetaCta="Ver todas las recetas"
          />
        </div>
      )}
    </div>
  );
}