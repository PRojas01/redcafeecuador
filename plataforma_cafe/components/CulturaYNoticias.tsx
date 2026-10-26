import Link from "next/link";
import { Icono } from "@/components/Icono";

/*
 Cultura del café (Red Café Bar) y noticias del sector. Estaban al final de la
 portada; viven en la Comunidad, que es donde se conversa sobre lo que pasa
 alrededor del café (decisión del propietario, 23-oct-2026).
*/

export const NOTICIAS = [
  { href: "/noticias/calendario-cafe-ecuador-2026/", fecha: "2026-08-24", fuente: "Red Café Ecuador", titulo: "Calendario del café ecuatoriano: qué queda del 2026", texto: "Dos festivales el mismo fin de semana de octubre, el Día Internacional del Café y una fecha europea que marca el trimestre." },
  { href: "/noticias/ecuador-reactiva-caficultura/", fecha: "2026-07-20", fuente: "MAGAP", titulo: "Ecuador reactiva su caficultura: 135 mil hectáreas tecnificadas", texto: "El proyecto estatal apunta a renovar la caficultura con asistencia técnica, crédito productivo y comercialización asociativa." },
  { href: "/noticias/trazabilidad-requisito-europa/", fecha: "2026-07-02", fuente: "Comisión Europea", titulo: "Cuenta atrás: qué fecha te toca para exportar a Europa según a quién le vendes", texto: "El reglamento europeo contra la deforestación empieza el 30 de diciembre de 2026. Según el tamaño de tu comprador, tu plazo real puede ser ese o el 30 de junio de 2027." },
];

const CANALES = [
  { titulo: "Instagram", sub: "Fotos y catas", icono: "comunidad" as const },
  { titulo: "Videos", sub: "Barismo y origen", icono: "academia" as const },
  { titulo: "Reportajes", sub: "Productores y eventos", icono: "noticias" as const },
  { titulo: "WhatsApp", sub: "Canal directo", icono: "chat" as const },
];

export function CulturaCafe() {
  return (
    <section id="cultura" className="mt-12 rounded-2xl border border-cafe/10 bg-white p-6 md:p-8" aria-labelledby="cultura-titulo">
      <p className="badge">Bar / Cafetería</p>
      <h2 id="cultura-titulo" className="mt-3 font-titulo text-2xl font-semibold text-cafe md:text-3xl">Historias, personas y cultura del café</h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-pizarra-suave">
        Conoce lo que ocurre alrededor del café ecuatoriano: historias, videos, reportajes, cafeterías y protagonistas.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {CANALES.map((c) => (
          <div key={c.titulo} className="rounded-xl border border-cafe/10 bg-crema p-4">
            <Icono nombre={c.icono} className="h-6 w-6 text-latte" />
            <p className="mt-2 font-semibold text-cafe">{c.titulo}</p>
            <p className="text-sm text-pizarra-suave">{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/bar" className="btn-primary min-h-11">Entrar a Red Café Bar →</Link>
        <Link href="/afiliate" className="btn-ghost min-h-11">Afiliar mi barra</Link>
      </div>
    </section>
  );
}

export function NoticiasSector() {
  return (
    <section id="noticias-sector" className="mt-12" aria-labelledby="noticias-titulo">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-arena pb-3">
        <h2 id="noticias-titulo" className="text-2xl font-semibold text-pizarra md:text-3xl">Noticias del sector</h2>
        <Link href="/noticias/" className="rotulo text-latte hover:underline">Ver todas las noticias →</Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {NOTICIAS.map((n) => (
          <Link key={n.href} href={n.href} aria-label={`Leer: ${n.titulo}`} className="card group block p-5 transition-colors hover:border-latte">
            <p className="rotulo">{n.fecha} · {n.fuente}</p>
            <p className="mt-2 text-base font-semibold leading-snug text-pizarra group-hover:text-latte">{n.titulo}</p>
            <p className="mt-2 text-sm leading-relaxed text-pizarra-suave">{n.texto}</p>
            <span aria-hidden="true" className="rotulo mt-3 inline-block text-latte">Leer →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
