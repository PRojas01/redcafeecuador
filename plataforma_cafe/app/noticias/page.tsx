import { NOTICIAS } from "@/lib/data";
import GrillaNoticias from "@/components/GrillaNoticias";

export const metadata = {
  alternates: { canonical: "/noticias/" },
  title: "Noticias del sector cafetero",
  description:
    "Noticias, guías y reportajes del café ecuatoriano: mercado, precios, trazabilidad, técnicas de cultivo y comunidad cafetera, con la fuente y la fecha de cada publicación.",
};

export default function NoticiasPage() {
  return (
    <div>
      {/* HERO EDITORIAL */}
      <section className="hero-gradient text-cream-50">
        <div className="vapor left-[12%] top-[20%] h-24 w-16" aria-hidden="true" />
        <div className="vapor right-[18%] top-[16%] h-20 w-14" style={{ animationDelay: "1.6s" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
          <p className="badge mb-4 bg-gold-500/15 text-gold-500">Red Café Noticias</p>
          <h1 className="font-titulo text-4xl font-bold leading-tight text-cream-50 md:text-6xl">
            Noticias del sector
          </h1>
          <p className="mt-4 max-w-xl text-lg text-cream-100/85">
            Mercado, precios, trazabilidad y técnica. Lo que necesitas saber para
            vender mejor tu café.
          </p>
        </div>
      </section>

      {/* PARRILLA EDITORIAL */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <GrillaNoticias fallback={NOTICIAS} />
        </div>
      </section>
    </div>
  );
}