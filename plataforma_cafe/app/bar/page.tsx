"use client";

import { useEffect, useState } from "react";
import mediaSemilla from "@/public/data/_semilla/media.json";
import Link from "next/link";
import { api } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { Icono, type IconoNombre } from "@/components/Icono";
import { TazaCenital } from "@/components/Lamina";
import { Skeleton, SkeletonGrid } from "@/components/Skeleton";
import { EstadoError } from "@/components/EstadoError";
import { EstadoVacio } from "@/components/EstadoVacio";

interface MediaItem {
  id: string;
  tipo: "video" | "reportaje";
  titulo: string;
  descripcion: string;
  embed?: string;
  thumbnail?: string;
  imagen?: string;
  autor?: string;
  fecha?: string;
  categoria?: string;
  tags?: string[];
  redes?: { instagram?: string; tiktok?: string; youtube?: string };
  cuerpo?: string;
}

interface RedesData {
  whatsapp?: { comunidad?: string; contacto?: string; broadcast?: string };
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
  x?: string;
  telegram?: string;
  threads?: string;
}

type Tab = "todos" | "video" | "reportaje" | "redes";

function formatFecha(s?: string): string {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BarPage() {
  const [tab, setTab] = useState<Tab>("todos");
  // Sembrado para que el HTML servido traiga contenido; la API lo reemplaza.
  const [items, setItems] = useState<MediaItem[]>(
    (mediaSemilla.items ?? []) as unknown as MediaItem[],
  );
  const [redes, setRedes] = useState<RedesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);

  useEffect(() => {
    setLoading(true);
    setErrorCarga(false);
    Promise.all([
      api.mediaList().then((r) => {
        if (r.ok && r.data) { setItems((r.data as { items: MediaItem[] }).items || []); }
        else setItems([]);
      }),
      api.mediaRedes().then((r) => {
        if (r.ok && r.data) setRedes(r.data as RedesData);
      }),
    ])
      .catch(() => setErrorCarga(true))
      .finally(() => setLoading(false));
  }, []);

  const videos = items.filter((i) => i.tipo === "video");
  const reportajes = items.filter((i) => i.tipo === "reportaje");
  const total = items.length;
  const conContenido = total > 0;

  const wa = CONFIG.whatsapp ? `https://wa.me/${CONFIG.whatsapp}` : "#";

  const tabs: { k: Tab; t: string }[] = conContenido
    ? [
        { k: "todos", t: `Todo (${total})` },
        { k: "video", t: `Videos (${videos.length})` },
        { k: "reportaje", t: `Reportajes (${reportajes.length})` },
        { k: "redes", t: "Canales" },
      ]
    : [
        { k: "todos", t: "Todo" },
        { k: "video", t: "Videos" },
        { k: "reportaje", t: "Reportajes" },
        { k: "redes", t: "Canales" },
      ];

  return (
    <div>
      {/* HERO */}
      <section className="hero-gradient text-cream-50">
        <div className="vapor left-[10%] top-[16%] h-24 w-16" aria-hidden="true" />
        <div className="vapor right-[24%] top-[20%] h-20 w-14" style={{ animationDelay: "1.8s" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="grid items-center gap-10 md:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)]">
            <div className="anim-fade-up">
              <p className="badge mb-4 bg-gold-500/15 text-gold-500">Red Café Bar</p>
              <h1 className="font-titulo text-4xl font-bold leading-tight text-cream-50 md:text-5xl">
                Historias, personas y cultura alrededor del café
              </h1>
              <p className="mt-4 max-w-xl text-lg text-cream-100/85">
                Videos, reportajes, experiencias y conversaciones que muestran quiénes
                hacen posible el café ecuatoriano.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={wa + "?text=" + encodeURIComponent("Hola, quiero afiliar mi bar/cafetería a la Red.")}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-accent"
                >
                  Hablar por WhatsApp
                </a>
                <Link
                  href="/afiliate?rol=bar"
                  className="inline-flex min-h-11 items-center  border border-cream-50/35 px-6 py-3 font-semibold text-cream-50 transition hover:bg-cream-50/10"
                >
                  Afiliar mi bar →
                </Link>
              </div>
              <p className="mt-5 text-sm text-cream-100/60">
                Hacemos visible la cafetería, el bar y cada persona que sirve café ecuatoriano.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-cream-50 text-coffee-900 shadow-lg">
              <TazaCenital className="aspect-[4/3] w-full" notas="cacao · panela · cítrico" />
              <div className="grid gap-2 border-t border-border-soft p-4 text-sm">
                <div className="flex items-center gap-3">
                  <Icono nombre="media" className="h-5 w-5 shrink-0 text-green-700" />
                  <span className="font-semibold text-coffee-900">Videos y reportajes</span>
                  <span className="font-titulo text-coffee-900">·</span>
                  <Icono nombre="comunidad" className="h-5 w-5 shrink-0 text-green-700" />
                  <span className="font-semibold text-coffee-900">Canales de la Red</span>
                </div>
                <p className="text-xs text-text-secondary">
                  El Bar es el escaparate público donde el café ecuatoriano se muestra y se conversa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="sticky top-[60px] z-20 border-b border-border-soft bg-cream-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2">
          {tabs.map((b) => (
            <button
              key={b.k}
              onClick={() => setTab(b.k as Tab)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === b.k
                  ? "bg-coffee-900 text-cream-50"
                  : "border border-border-soft bg-surface text-coffee-700 hover:border-green-700/50 hover:text-coffee-900"
              }`}
            >
              {b.t}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENIDO */}
      {/* ── LA CAFETERÍA DE LA RED ── */}
      <section className="border-b border-arena bg-crema-oscuro py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-10 gap-y-4 px-4">
          <div className="min-w-[250px] flex-1">
            <p className="rotulo text-filtrado-600">La cafetería de la Red</p>
            <p className="mt-1.5 font-titulo text-xl font-bold leading-snug text-cafe md:text-2xl">
              El Moral Bar / Cafetería
            </p>
          </div>
          <p className="max-w-xl flex-1 text-sm leading-relaxed text-pizarra-suave">
            Es una barra vinculada a Red Café Ecuador: donde se cata, se prueba y se
            sirve café de productores de la Red. Si quieres probar en taza lo que ves
            en el Marketplace, se empieza aquí.
          </p>
          <Link
            href="/afiliate?rol=bar"
            className="inline-flex min-h-11 shrink-0 items-center font-semibold text-latte underline-offset-4 hover:underline"
          >
            Suma tu cafetería →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        {loading ? (
          <SkeletonGrid
            cards={4}
            etiqueta="Cargando contenido del Red Café Bar…"
            className="gap-4 md:grid-cols-2"
          />
        ) : tab === "redes" ? (
          <RedesGrid redes={redes} wa={wa} />
        ) : errorCarga ? (
          <EstadoError
            titulo="No pudimos cargar el contenido"
            descripcion="Vuelve a intentarlo en un momento."
            onReintentar={() => {
              window.location.reload();
            }}
          />
        ) : (
          <ItemsGrid items={items} tab={tab} />
        )}
      </section>

      {/* CTA CAFETERÍA */}
      <section className="border-t border-border-soft bg-cream-100/40 py-14">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <Icono nombre="bar" className="mx-auto h-10 w-10 text-green-700" />
          <h2 className="mt-3 font-titulo text-3xl font-bold text-coffee-900">
            ¿Tienes una cafetería?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-text-secondary">
            Crea tu perfil y haz visible tu cafetería dentro de la Red.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/afiliate?rol=bar" className="btn-primary">
              Registrar cafetería
            </Link>
            <Link href="/bar/gestion" className="btn-ghost">
              Ya soy afiliada · Gestionar mi barra
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function RedesGrid({ redes, wa }: { redes: RedesData | null; wa: string }) {
  if (!redes) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card flex items-start gap-4 p-5">
            <Skeleton variante="avatar" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton variante="titulo" className="w-2/3" />
              <Skeleton variante="texto" className="w-full" />
              <Skeleton variante="linea" className="w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  const canales: { nombre: string; url: string; icono: IconoNombre; desc: string }[] = [
    { nombre: "WhatsApp · Directo", url: wa, icono: "chat", desc: "Conversación inmediata con el equipo." },
    { nombre: "WhatsApp · Comunidad", url: redes.whatsapp?.comunidad || "#", icono: "comunidad", desc: "Únete al grupo de la Red." },
    { nombre: "Instagram", url: redes.instagram || "#", icono: "media", desc: "Fotos, catas, eventos." },
    { nombre: "TikTok", url: redes.tiktok || "#", icono: "media", desc: "Videos cortos, barismo." },
    { nombre: "YouTube", url: redes.youtube || "#", icono: "media", desc: "Reportajes y formación." },
    { nombre: "Facebook", url: redes.facebook || "#", icono: "comunidad", desc: "Comunidad y noticias." },
    { nombre: "X (Twitter)", url: redes.x || "#", icono: "noticias", desc: "Actualizaciones rápidas." },
    { nombre: "Telegram", url: redes.telegram || "#", icono: "chat", desc: "Canal de avisos." },
    { nombre: "Threads", url: redes.threads || "#", icono: "comunidad", desc: "Conversaciones largas." },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {canales.map((c) => (
        <a
          key={c.nombre}
          href={c.url}
          target="_blank"
          rel="noreferrer noopener"
          className="card group flex items-start gap-4 p-5 transition hover:border-green-700/40"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cream-200 text-green-700" aria-hidden="true">
            <Icono nombre={c.icono} className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-titulo font-bold text-coffee-900 group-hover:text-green-700">{c.nombre}</p>
            <p className="mt-0.5 text-sm text-text-secondary">{c.desc}</p>
            <p className="mt-1 truncate text-xs text-text-muted">{c.url}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

function ItemsGrid({ items, tab }: { items: MediaItem[]; tab: Tab }) {
  const filtered = tab === "todos" ? items : items.filter((i) => i.tipo === tab);
  if (filtered.length === 0) {
    return (
      <div className="py-4">
        <EstadoVacio
          icono="media"
          titulo="Pronto encontrarás nuevas historias aquí"
          descripcion="Red Café Bar reúne historias, videos y contenidos de quienes forman parte del sector."
        />
      </div>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {filtered.map((it) => (
        <ItemCard key={it.id} item={it} />
      ))}
    </div>
  );
}

function ItemCard({ item }: { item: MediaItem }) {
  if (item.tipo === "video") return <VideoCard item={item} />;
  return <ReportajeCard item={item} />;
}

function VideoCard({ item }: { item: MediaItem }) {
  return (
    <article className="card shadow-sm transition hover:border-green-700/40">
      <div className="aspect-video bg-coffee-900/5">
        {item.embed ? (
          <iframe
            src={item.embed}
            title={item.titulo}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <div className="grid h-full place-items-center bg-cream-200 text-4xl text-coffee-900/30">
            <Icono nombre="media" className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="badge badge-verde">Video</span>
          {item.categoria && <span className="badge">{item.categoria}</span>}
          <span className="text-text-muted">{formatFecha(item.fecha)}</span>
        </div>
        <h3 className="mt-2 font-titulo text-lg font-bold text-coffee-900">{item.titulo}</h3>
        <p className="mt-1 text-sm text-text-secondary">{item.descripcion}</p>
        {item.autor && <p className="mt-3 text-xs text-text-muted">Por {item.autor}</p>}
        {item.redes && (
          <div className="mt-3 flex gap-2">
            {item.redes.youtube && (
              <a href={item.redes.youtube} target="_blank" rel="noreferrer noopener" className="text-xs font-semibold text-green-700 underline">YouTube</a>
            )}
            {item.redes.instagram && (
              <a href={item.redes.instagram} target="_blank" rel="noreferrer noopener" className="text-xs font-semibold text-green-700 underline">Instagram</a>
            )}
            {item.redes.tiktok && (
              <a href={item.redes.tiktok} target="_blank" rel="noreferrer noopener" className="text-xs font-semibold text-green-700 underline">TikTok</a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function ReportajeCard({ item }: { item: MediaItem }) {
  const preview = item.cuerpo ? item.cuerpo.split("\n").slice(0, 3).join(" ") : item.descripcion;
  return (
    <article className="card shadow-sm transition hover:border-green-700/40">
      <div className="flex h-32 items-center justify-center bg-cream-100">
        <div className="relative h-full w-full">
          <TazaCenital className="h-full w-full object-cover" notas="cultura · origen · barra" />
          <div className="absolute inset-0 bg-coffee-900/10" aria-hidden="true"></div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="badge badge-verde">Reportaje</span>
          {item.categoria && <span className="badge">{item.categoria}</span>}
          <span className="text-text-muted">{formatFecha(item.fecha)}</span>
        </div>
        <h3 className="mt-2 font-titulo text-lg font-bold text-coffee-900">{item.titulo}</h3>
        <p className="mt-1 text-sm text-text-secondary">{item.descripcion}</p>
        <p className="mt-2 line-clamp-3 text-sm italic text-text-muted">"{preview}"</p>
        {item.autor && (
          <p className="mt-3 text-xs text-text-muted">Por {item.autor}</p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <span key={t} className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] text-text-muted">#{t}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
