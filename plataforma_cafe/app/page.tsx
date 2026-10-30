import Link from "next/link";
import { Icono, type IconoNombre } from "@/components/Icono";
import { InicioPanelRedirect } from "@/components/InicioPanelRedirect";
import { VideoTransformacion } from "@/components/VideoTransformacion";
import { AccesoPortada } from "@/components/AccesoPortada";
import { CifrasRed, FranjaPrecio, ProvinciasReales } from "@/components/PortadaDatos";
import { CamasSecado, FincaTerrazas } from "@/components/Lamina";
import { CONFIG, waLink } from "@/lib/config";

const PERFILES: Array<{
  href: string;
  icono: IconoNombre;
  titulo: string;
  bajada: string;
  texto: string;
  cta?: string;
}> = [
  { href: "/afiliate?rol=productor", icono: "productor", titulo: "Productor", bajada: "Vende desde 1 libra hasta tu cosecha.", texto: "Publico mi café con finca, altura y proceso para vender directo y acordar condiciones con el comprador." },
  { href: "/afiliate?rol=vendedor", icono: "tostador", titulo: "Tostador / Comerciante", bajada: "Asegura tu abastecimiento sin depender de un solo proveedor.", texto: "Comparo lotes por finca, altura, proceso y trazabilidad. Coordino compras y capacito a mi equipo desde la Academia." },
  { href: "/afiliate?rol=comprador", icono: "comprador", titulo: "Comprador", bajada: "Compra directo a quien produce y descubre orígenes.", texto: "Encuentro café ecuatoriano con ficha de lote y contacto directo para comprar con más contexto." },
  { href: "/afiliate?rol=certificador", icono: "laboratorio", titulo: "Verificador / Catador", bajada: "Cobra por cada evaluación y hazte un nombre en el sector.", texto: "Evalúo lotes, audito fincas y emito informes técnicos verificables dentro de la Red." },
  { href: "/afiliate?rol=transportista", icono: "logistica", titulo: "Transportista", bajada: "Llena tus rutas con fletes que llegan de la Red.", texto: "Conecto fincas, tostadores y puertos. Cotizo rutas y construyo historial de entregas." },
  { href: "/afiliate?rol=pilador", icono: "pilador", titulo: "Pilador / Beneficiadero", bajada: "Mantén la piladora ocupada sin salir a buscar clientes.", texto: "Proceso pergamino a café oro, controlo merma y humedad, y recibo solicitudes de pilado." },
  { href: "/afiliate?rol=exportador", icono: "exportador", titulo: "Exportador", bajada: "Cierra contenedores con el origen ya documentado.", texto: "Conecto lotes auditados, documentos EUDR, verificadores, catadores y compradores globales." },
  { href: "/afiliate?rol=proveedor", icono: "proveedor", titulo: "Proveedor de Equipos e Insumos", bajada: "Vende tus equipos a quien está montando su negocio ahora.", texto: "Para quienes venden maquinaria, insumos y materiales a la industria del café." },
  { href: "/recetas", icono: "amante", titulo: "Amante del Café", bajada: "Toma mejor café en casa, y sabe de qué finca viene.", texto: "Descubre cafés de origen, aprende a catarlos y prepáralos con recetas claras.", cta: "Descubre las recetas" },
  { href: "/afiliate?rol=asesor", icono: "asesor", titulo: "Asesor Experto", bajada: "Consigue clientes que ya saben que necesitan ayuda.", texto: "Ofrezco asesoría en agronomía, calidad, tueste, gestión o exportación." },
  { href: "/afiliate?rol=bar", icono: "bar", titulo: "Bar / Cafetería", bajada: "Diferénciate sirviendo café con nombre y finca.", texto: "Muestro mi barra, menú digital, cafés de origen y necesidades de abastecimiento." },
  { href: "/afiliate?rol=barista", icono: "barista", titulo: "Barista", bajada: "Capacítate y consigue barra donde crecer.", texto: "Me capacito en barra, manejo recetas y me vinculo a oportunidades del café de especialidad." },
];

export default function HomePage() {
  return (
    <div>
      <InicioPanelRedirect />

      {/* 1. Hero con vapor */}
      <section id="portada-hero" className="hero-gradient text-crema">
        <div className="vapor left-[12%] top-[18%] h-24 w-16" aria-hidden="true" />
        <div className="vapor left-[28%] top-[10%] h-20 w-14" style={{ animationDelay: "1.4s" }} aria-hidden="true" />
        <div className="vapor right-[18%] top-[22%] h-24 w-16" style={{ animationDelay: "2.8s" }} aria-hidden="true" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)] md:items-center md:py-20">
          <div>
            <p className="badge mb-4 bg-filtrado-800 text-acento-claro">Nueva plataforma · Red Café Ecuador</p>
            <h1 className="max-w-4xl font-titulo text-4xl font-bold leading-[1.08] md:text-6xl">
              Crea tu perfil y conecta con oportunidades del <span className="text-acento-claro">café ecuatoriano</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-crema/85">
              Compra y vende café directo, sin intermediarios ni comisiones. Tu perfil gratis en dos minutos.
            </p>
            {/* Tres botones con la misma forma y un color por función:
                registrarse (el más llamativo), WhatsApp (verde oficial) y
                acceder (el cobre que antes llevaba «Unirme a la Red»). */}
            <div className="portada-botones mt-8 flex flex-wrap gap-3">
              <Link href="/afiliate" className="btn-accent btn-registro min-h-11">Registrarse</Link>
              <a
                href={waLink("Hola, quiero conocer Red Café Ecuador y crear mi perfil.")}
                target="_blank"
                rel="noreferrer"
                className="btn-accent btn-whatsapp min-h-11"
                aria-label="WhatsApp: escríbenos (se abre WhatsApp)"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[1.15em] w-[1.15em] shrink-0" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </a>
              <Link href="/login" className="btn-accent min-h-11">Acceder</Link>
            </div>
          </div>

          {/* El video de la transformación (antes la capa lo sacaba del bloque
              «Forma parte» y lo traía aquí). La tarjeta «Perfiles de entrada»
              se borró: repetía los perfiles de «Elige tu perfil». */}
          <div className="overflow-hidden rounded-2xl border border-crema/20 shadow-lg">
            <VideoTransformacion className="aspect-video w-full" base="" />
          </div>
        </div>
      </section>

      {/* Cifras reales de la Red y franja del precio (antes las pintaba la capa al cargar) */}
      <CifrasRed />
      <FranjaPrecio />

      {/* 2. Forma parte (antes copia de la capa sobre dos secciones ocultas) */}
      <AccesoPortada />

      {/* 5. Perfiles */}
      <section id="perfiles" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="badge badge-verde">Crear cuenta y publicar café es gratis. Algunos servicios profesionales son opcionales y se pagan aparte, con precio a la vista.</p>
          <h2 className="titulo-subrayado mt-3 max-w-xl font-titulo text-3xl font-bold text-cafe md:text-4xl">
            Elige tu perfil
          </h2>
          {/* Plegado de forma nativa (antes lo hacía la capa buscando un párrafo
              que ya no existe): en el móvil la lista completa medía ~2.000 px. */}
          <details className="group/perfiles mt-6">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 border border-cafe/15 bg-white px-5 py-3 font-semibold text-cafe [&::-webkit-details-marker]:hidden">
              <span>Ver los {PERFILES.length} perfiles</span>
              <span aria-hidden="true" className="text-xl transition group-open/perfiles:rotate-45">+</span>
            </summary>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3 md:gap-8">
            {PERFILES.map((perfil) => (
              <Link key={perfil.titulo} href={perfil.href} className="group rounded-2xl border border-cafe/10 bg-white p-7 shadow-sm md:p-8 transition hover:shadow-md hover:border-latte/40">
                <Icono nombre={perfil.icono} className="h-7 w-7 text-cereza-roja" />
                <p className="mt-4 font-titulo text-lg font-bold text-cafe">{perfil.titulo}</p>
                <p className="mt-2 font-semibold leading-snug text-latte">{perfil.bajada}</p>
                <p className="mt-2 text-sm leading-relaxed text-pizarra-suave">{perfil.texto}</p>
                <span className="mt-3 inline-block text-sm font-bold text-cereza-roja underline-offset-4 group-hover:underline">
                  {perfil.cta ?? "Forma parte de la Red"} →
                </span>
              </Link>
            ))}
          </div>
          </details>
        </div>
      </section>

      {/* 9. Confianza — Camas de secado */}
      <section id="confianza" className="granos-bg relative overflow-hidden bg-cafe py-16 md:py-24 text-crema">
        <CamasSecado className="absolute inset-0 h-full w-full opacity-[0.18]" />
        <div className="relative mx-auto max-w-6xl px-4">
          <p className="badge bg-filtrado-800 text-acento-claro">Cómo garantizamos la confianza</p>
          <h2 className="mt-3 max-w-2xl font-titulo text-3xl font-bold text-crema md:text-4xl">Una Red basada en personas reales</h2>
          <p className="mt-3 max-w-2xl text-crema/80">La confianza comienza sabiendo con quién estás conectando.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
            {[
              { titulo: "Perfil", texto: "Cada actor presenta claramente quién es y qué actividad realiza." },
              { titulo: "Información", texto: "Los perfiles pueden incorporar datos de finca, empresa, productos y servicios." },
              { titulo: "Contacto", texto: "La Red facilita conexiones directas entre sus miembros." },
            ].map((item) => (
              <div key={item.titulo} className="rounded-2xl border border-crema/20 bg-cafe/70 p-7 backdrop-blur">
                <Icono nombre={item.titulo === "Perfil" ? "productor" : item.titulo === "Información" ? "precio" : "comunidad"} className="h-7 w-7 text-latte" />
                <p className="mt-3 font-titulo text-lg font-bold text-crema">{item.titulo}</p>
                <p className="mt-2 text-sm leading-relaxed text-crema/75">{item.texto}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/servicios" className="btn-accent min-h-11">Conoce cómo funciona</Link>
          </div>
        </div>
      </section>

      {/* 10. Concepto territorial — FincaTerrazas */}
      <section id="mapa-portada" className="py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-[3fr_2fr]">
          <div>
            <p className="badge badge-verde">Concepto territorial</p>
            <h2 className="titulo-subrayado mt-3 max-w-xl font-titulo text-3xl font-bold text-cafe md:text-4xl">
              Ponemos el café ecuatoriano en el mapa
            </h2>
            <p className="mt-3 max-w-2xl text-pizarra-suave">
              Explora productores, fincas, cafés y actores de diferentes provincias del Ecuador.
            </p>
            {/* Provincias reales con lotes y miembros (antes seis provincias de muestra que la capa sustituía) */}
            <ProvinciasReales />
            <Link href="/marketplace" className="btn-primary mt-8 min-h-11">Explorar Marketplace</Link>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-cafe/10 bg-white shadow-md">
            <FincaTerrazas className="aspect-video w-full" />
          </div>
        </div>
      </section>

   </div>
  );
}
