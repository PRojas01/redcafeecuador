import Link from "next/link";
import { Icono } from "@/components/Icono";
import { CONFIG, waLink } from "@/lib/config";

export const metadata = {
  title: "Quiénes somos",
  description:
    "Red Café Ecuador es una plataforma abierta y digital creada por Pedro Rojas / SolucionesPro para apoyar negocios, contactos y servicios del café ecuatoriano.",
  alternates: { canonical: "/quienes-somos/" },
};

const BENEFICIOS = [
  { href: "/marketplace", icono: "marketplace" as const, titulo: "Marketplace", texto: "Publica, encuentra y conversa alrededor de lotes con origen visible." },
  { href: "/academia", icono: "academia" as const, titulo: "Academia", texto: "Aprende lo que de verdad sube el precio de tu café: proceso, secado y taza." },
  { href: "/servicios", icono: "asesor" as const, titulo: "Servicios", texto: "Resuelve lo que te frena: exportar, formalizarte, cumplir con Europa." },
  { href: "/comunidad", icono: "verificacion" as const, titulo: "Confianza", texto: "Sabes con quién tratas antes de mandar un solo saco." },
];

const NUMEROS = [
  { href: "/servicios/precios", icono: "precio" as const, titulo: "Panel de Precios del Mercado", texto: "Referencia ICE C y diferenciales para fijar tu oferta con información." },
  { href: "/servicios/calculadora", icono: "calculadora" as const, titulo: "Calculadora de Venta", texto: "Convierte quintales y sacos, estima tu ingreso neto y margen por lote." },
  { href: "/servicios/eudr", icono: "ubicacion" as const, titulo: "Dossier EUDR de tu Finca", texto: "Registra el GPS de tu finca y genera el documento de debida diligencia listo para exportar." },
  { href: "/servicios/factura", icono: "administracion" as const, titulo: "Facturación Electrónica", texto: "Herramientas de apoyo para organizar y emitir documentación comercial desde la Red." },
];

const PRINCIPIOS = [
  {
    titulo: "Una alternativa abierta",
    texto:
      "No reemplazamos asociaciones, relaciones comerciales ni canales existentes. Sumamos una herramienta digital para que más actores puedan mostrarse, encontrarse y trabajar con información clara.",
  },
  {
    titulo: "Tecnología aplicada al negocio",
    texto:
      "La plataforma organiza perfiles, publicaciones, servicios, cotizaciones, comunidad y paneles por actividad para que cada miembro use lo que necesita sin cambiar su forma de trabajar de un día para otro.",
  },
  {
    titulo: "Personas reales, operaciones reales",
    texto:
      "Productores, tostadores, compradores, cafeterías, catadores, transportistas, piladores, proveedores y asesores pueden participar desde su rol y construir confianza con datos, historial y contacto directo.",
  },
];

const COMO_FUNCIONA = [
  "Creas tu perfil según tu actividad en el café.",
  "Publicas lo que ofreces: café, servicios, insumos, experiencia o necesidades de compra.",
  "Exploras perfiles, Marketplace, comunidad, academia y servicios.",
  "Inicias conversaciones a partir de pedidos, cotizaciones, compras o soporte administrativo.",
  "Usas tu panel para registrar actividad, controlar finanzas, revisar pedidos y mantener tu presencia actualizada.",
];

export default function QuienesSomosPage() {
  return (
    <div>
      <section className="hero-gradient text-crema">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="badge mb-4 bg-filtrado-800 text-acento-claro">Quiénes somos</p>
          <h1 className="max-w-3xl font-titulo text-4xl font-bold leading-[1.1] md:text-6xl">
            Una plataforma para hacer más visible y operable el negocio del café ecuatoriano
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-crema/85">
            Red Café Ecuador es una iniciativa digital creada para reunir herramientas,
            perfiles, publicaciones y servicios útiles para quienes producen, transforman,
            compran, preparan, transportan, asesoran o proveen al sector cafetero.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/afiliate" className="btn-accent min-h-11">
              Crear mi perfil
            </Link>
            <a
              href={waLink("Hola, quiero conocer más sobre Red Café Ecuador y SolucionesPro.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center border border-crema/30 px-6 py-3 font-semibold text-crema transition hover:border-acento-claro hover:text-acento-claro"
            >
              Hablar con la Red
            </a>
          </div>
        </div>
      </section>

      <section className="bg-crema py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div>
            <p className="badge bg-latte/15 text-filtrado-600">Origen del proyecto</p>
            <h2 className="mt-3 font-titulo text-3xl font-bold text-cafe md:text-4xl">
              Red Café Ecuador nace desde SolucionesPro
            </h2>
            <p className="mt-4 leading-relaxed text-pizarra-suave">
              El proyecto es desarrollado por Pedro Rojas / SolucionesPro, con enfoque en
              tecnología aplicada, automatización, inteligencia artificial y sistemas de
              apoyo operativo para pequeñas empresas y negocios en Ecuador.
            </p>
            <p className="mt-4 leading-relaxed text-pizarra-suave">
              La idea es llevar esa experiencia al café ecuatoriano: no como una promesa
              abstracta de transformación digital, sino como herramientas concretas para
              publicar oferta, organizar información, registrar actividad, facilitar
              contactos y apoyar decisiones comerciales.
            </p>
            <a
              href="https://solucionespro.net/"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-cafe px-5 py-2.5 font-semibold text-crema transition hover:bg-cafe/90"
            >
              Conocer SolucionesPro
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <aside className="rounded-2xl border border-cafe/10 bg-white p-6 shadow-sm">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-hoja/15 text-hoja">
              <Icono nombre="administracion" className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-titulo text-2xl font-bold text-cafe">
              Qué somos
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-pizarra-suave">
              Una red digital de apoyo comercial y operativo para el café ecuatoriano.
              La plataforma conecta perfiles, Marketplace, servicios, academia,
              comunidad, chat operativo y paneles de gestión.
            </p>
            <div className="mt-5 border-t border-cafe/10 pt-4">
              <p className="rotulo text-filtrado-600">Qué no somos</p>
              <p className="mt-2 text-sm leading-relaxed text-pizarra-suave">
                No somos una asociación gremial, no somos una bolsa única de comercio y
                no sustituimos acuerdos existentes. Somos una herramienta adicional para
                trabajar con más visibilidad, información y orden.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="badge badge-verde">Principios</p>
          <h2 className="mt-3 font-titulo text-3xl font-bold text-cafe md:text-4xl">
            Cómo entendemos la Red
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {PRINCIPIOS.map((p) => (
              <article key={p.titulo} className="rounded-2xl border border-cafe/10 bg-crema p-6">
                <h3 className="font-titulo text-xl font-bold text-cafe">{p.titulo}</h3>
                <p className="mt-3 text-sm leading-relaxed text-pizarra-suave">{p.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-cafe/10 bg-crema-oscuro py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="badge bg-latte/15 text-filtrado-600">Cómo funciona</p>
            <h2 className="mt-3 font-titulo text-3xl font-bold text-cafe md:text-4xl">
              Del perfil a la oportunidad
            </h2>
            <p className="mt-4 leading-relaxed text-pizarra-suave">
              La Red funciona como una capa digital sobre la actividad real del sector:
              el productor sigue produciendo, el tostador sigue comprando, el transportista
              sigue moviendo carga y el asesor sigue prestando servicios. La diferencia es
              que ahora pueden mostrarse, registrar información y conectar desde un mismo lugar.
            </p>
          </div>
          <ol className="space-y-3">
            {COMO_FUNCIONA.map((paso, index) => (
              <li key={paso} className="flex gap-3 rounded-2xl border border-cafe/10 bg-white p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cafe text-sm font-bold text-crema">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm leading-relaxed text-pizarra-suave">{paso}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Beneficios y herramientas de la Red */}
      <section className="granos-bg bg-crema-oscuro py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="badge badge-verde">Todo lo de esta sección entra con tu cuenta gratuita</p>
          <h2 className="titulo-subrayado mt-3 max-w-2xl font-titulo text-3xl font-bold text-cafe md:text-4xl">
            Lo que cambia para ti cuando entras en la Red
          </h2>
          <p className="mt-3 max-w-2xl text-pizarra-suave">
            El registro y las herramientas básicas no tienen costo. Los servicios especializados se contratan aparte, solo si los necesitas.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
            {BENEFICIOS.map((item) => (
              <Link key={item.titulo} href={item.href} aria-label={`Explorar: ${item.titulo}`} className="card group p-6 md:p-7">
                <Icono nombre={item.icono} aria-hidden="true" className="h-7 w-7 text-cereza-roja" />
                <p className="mt-4 font-titulo text-lg font-bold text-cafe">{item.titulo}</p>
                <p className="mt-2 text-sm leading-relaxed text-pizarra-suave">{item.texto}</p>
                <span aria-hidden="true" className="mt-3 inline-block text-sm font-bold text-cereza-roja underline-offset-4 group-hover:underline">Explorar →</span>
              </Link>
            ))}
          </div>
          <div className="mt-12 border-t border-cafe/10 pt-8">
            <p className="rotulo text-filtrado-600">Herramientas para negociar con números, no a ciegas</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {NUMEROS.map((item) => (
                <Link key={item.titulo} href={item.href} aria-label={`Ver más: ${item.titulo}`} className="card group p-6 md:p-7">
                  <Icono nombre={item.icono} aria-hidden="true" className="h-7 w-7 text-cereza-roja" />
                  <p className="mt-3 font-titulo text-lg font-bold text-cafe">{item.titulo}</p>
                  <p className="mt-2 text-sm leading-relaxed text-pizarra-suave">{item.texto}</p>
                  <span aria-hidden="true" className="mt-3 inline-block text-sm font-bold text-cereza-roja underline-offset-4 group-hover:underline">Ver más →</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link href="/servicios" className="inline-flex min-h-11 items-center font-semibold text-latte underline-offset-4 hover:underline">
              Ver también los servicios con costo →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-cafe py-14 text-crema md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="badge bg-filtrado-800 text-acento-claro">Siguiente paso</p>
          <h2 className="mt-3 max-w-3xl font-titulo text-3xl font-bold md:text-4xl">
            Si trabajas alrededor del café ecuatoriano, puedes crear tu perfil y empezar desde tu panel.
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/afiliate" className="btn-accent min-h-11">
              Unirme a la Red
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex min-h-11 items-center border border-crema/30 px-6 py-3 font-semibold text-crema transition hover:border-acento-claro hover:text-acento-claro"
            >
              Ver Marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
