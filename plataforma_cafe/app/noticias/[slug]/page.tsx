import Link from "next/link";
import { NOTICIAS } from "@/lib/data";
import { Icono } from "@/components/Icono";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function fechaNoticia(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const mes = MESES[(m - 1) % 12];
  return `${String(d).padStart(2, "0")} ${mes} ${y}`;
}

export function generateStaticParams() {
  return NOTICIAS.map((n) => ({ slug: n.slug ?? n.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = NOTICIAS.find((x) => (x.slug ?? x.id) === slug);
  if (!n) return { title: "Noticia no encontrada" };
  return {
    title: n.titulo,
    description: n.resumen,
  };
}

export default async function NoticiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = NOTICIAS.find((x) => (x.slug ?? x.id) === slug);

  if (!n) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <Icono nombre="noticias" className="mx-auto h-10 w-10 text-green-700" />
        <h1 className="mt-4 font-titulo text-3xl font-bold text-coffee-900">Noticia no encontrada</h1>
        <Link href="/noticias" className="btn-primary mt-6">Volver a noticias</Link>
      </div>
    );
  }

  const esPropia = n.fuente.toLowerCase().includes("red café");

  return (
    <article className="py-14">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/noticias" className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:underline">
          ← Todas las noticias
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <span className="badge badge-verde">{n.categoria}</span>
          <time className="font-semibold text-coffee-700">{fechaNoticia(n.fecha)}</time>
          <span className="text-text-muted">·</span>
          <span className="flex items-center gap-1.5 text-text-secondary">
            <Icono nombre="noticias" className="h-4 w-4" /> Fuente:{" "}
            {n.fuente_url ? (
              <a
                href={n.fuente_url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-latte underline-offset-4 hover:underline"
              >
                {n.fuente}
              </a>
            ) : (
              n.fuente
            )}
          </span>
        </div>

        <h1 className="mt-4 font-titulo text-3xl font-bold leading-tight text-coffee-900 md:text-5xl">
          {n.titulo}
        </h1>
        <p className="mt-4 text-lg text-text-secondary">{n.resumen}</p>

        <div className="mt-8 space-y-5">
          {n.contenido?.map((parrafo, i) => (
            <p key={i} className="text-lg leading-relaxed text-text-primary">
              {parrafo}
            </p>
          ))}
        </div>

        {!esPropia && (
          <div className="mt-10 rounded-xl border border-border-soft bg-surface-soft p-4 text-sm text-text-secondary">
            <p className="font-semibold text-coffee-900">Sobre la fuente</p>
            <p className="mt-1">
              Esta publicación cita información pública de <b className="text-coffee-900">{n.fuente}</b> como
              referencia. No representa autoría ni postura oficial de la Red Café Ecuador.
            </p>
          </div>
        )}

        <div className="card mt-12 p-6">
          <p className="font-titulo text-lg font-bold text-coffee-900">
            ¿Quieres vender mejor tu café?
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Forma parte de la Red Café Ecuador: marketplace directo, academia y asesoría
            para productores, comerciantes y compradores.
          </p>
          <Link href="/afiliate" className="btn-accent mt-4">
            Forma parte de la Red
          </Link>
        </div>
      </div>
    </article>
  );
}