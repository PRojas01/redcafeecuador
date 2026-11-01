"use client";

// Grilla editorial de noticias. Fuente: contenido.php (editable desde WP)
// con fallback a los datos estáticos de lib/data.ts.
import Link from "next/link";
import { useContenido } from "@/lib/useContenido";
import type { Noticia } from "@/lib/data";
import { Icono } from "@/components/Icono";
import { EstadoVacio } from "@/components/EstadoVacio";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function fechaNoticia(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const mes = MESES[(m - 1) % 12];
  return `${String(d).padStart(2, "0")} ${mes} ${y}`;
}

function Tarjeta({ n, destacada = false }: { n: Noticia; destacada?: boolean }) {
  return (
    <Link
      key={n.id}
      href={`/noticias/${n.slug ?? n.id}`}
      className={`card group flex flex-col p-6 transition hover:border-green-700/40 ${destacada ? "md:p-8" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-green-700">{n.categoria}</span>
        <time className="text-xs font-semibold text-text-muted">{fechaNoticia(n.fecha)}</time>
      </div>
      <p className={`mt-3 font-titulo font-bold leading-snug text-coffee-900 ${destacada ? "text-2xl md:text-3xl" : "text-xl"}`}>
        {n.titulo}
      </p>
      <p className={`mt-2 flex-1 text-sm leading-relaxed text-text-secondary ${destacada ? "md:text-base" : "line-clamp-3"}`}>
        {n.resumen}
      </p>
      <p className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-coffee-700 group-hover:text-green-700">
        <Icono nombre="noticias" className="h-4 w-4" />
        Fuente: {n.fuente} · Leer →
      </p>
    </Link>
  );
}

export default function GrillaNoticias({ fallback }: { fallback: Noticia[] }) {
  const { items } = useContenido("noticias", fallback);
  const noticias = items as Noticia[];

  const ordenadas = [...noticias].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const destacada = ordenadas[0];
  const secundarias = ordenadas.slice(1, 3);
  const resto = ordenadas.slice(3);

  if (ordenadas.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EstadoVacio
          icono="noticias"
          titulo="Aún no hay artículos publicados"
          descripcion="Cuando la Red publique noticias, guías y reportajes aparecerán aquí."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {["Todos", ...Array.from(new Set(noticias.map((n) => n.categoria)))].map((c) => (
          <span
            key={c}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              c === "Todos"
                ? "bg-coffee-900 text-cream-50"
                : "border border-border-soft bg-surface text-text-secondary"
            }`}
          >
            {c}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {destacada && (
          <div className="lg:col-span-2">
            <Tarjeta n={destacada} destacada />
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
          {secundarias.map((n) => (
            <Tarjeta key={n.id} n={n} />
          ))}
        </div>
      </div>

      {resto.length > 0 && (
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resto.map((n) => (
            <Tarjeta key={n.id} n={n} />
          ))}
        </div>
      )}
    </div>
  );
}