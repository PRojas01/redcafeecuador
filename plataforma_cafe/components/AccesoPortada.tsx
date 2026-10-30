import Link from "next/link";
import { Icono, type IconoNombre } from "@/components/Icono";
import { CONFIG, waLink } from "@/lib/config";

/*
 «Forma parte» de la portada: la puerta de registro. Antes lo pintaba la capa
 propia (redcafe-conversion.js · accesoPortada), que ocultaba el bloque de React
 y ponía su copia después de cargar. Ahora es una sola versión, aquí; la de la
 capa y las dos secciones de React que quedaban ocultas se borraron.
 Quien ya tiene sesión no ve la portada (InicioPanelRedirect lo lleva al panel),
 así que basta la versión de visitante.
*/

const BENEFICIOS: { icono: IconoNombre; titulo: string; detalle: string; href: string }[] = [
  { icono: "productor", titulo: "Vender mi café", detalle: "Lote visible en marketplace y mapa", href: "/afiliate/?rol=productor" },
  { icono: "comprador", titulo: "Comprar café", detalle: "Filtra por provincia, variedad y datos del lote", href: "/marketplace/" },
  { icono: "precio", titulo: "Negociar con referencia", detalle: "Precio mensual con fuente visible", href: "/servicios/precios/" },
  { icono: "academia", titulo: "Aprender y avanzar", detalle: "Cursos con progreso guardado", href: "/academia/" },
  { icono: "asesor", titulo: "Contratar apoyo", detalle: "Catación, exportación, pilado y más", href: "/servicios/" },
  { icono: "comunidad", titulo: "Encontrar oportunidades", detalle: "Requerimientos, empleo y contactos", href: "/comunidad/" },
];

export function AccesoPortada() {
  return (
    <section id="forma-parte" className="py-14 md:py-20" aria-labelledby="forma-parte-titulo">
      <div className="mx-auto max-w-6xl px-4">
        <p className="badge">Forma parte</p>
        <h2 id="forma-parte-titulo" className="mt-3 max-w-2xl font-titulo text-3xl font-semibold leading-tight text-cafe md:text-4xl">
          Haz visible tu trabajo en el negocio del café ecuatoriano.
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-pizarra-suave">
          Crea tu perfil gratis para publicar café o servicios, revisar precios, estudiar cursos y recibir contactos directos desde la Red.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/afiliate/" className="btn-primary min-h-11">Crear mi perfil gratis</Link>
          <Link href="/login/" className="btn-ghost min-h-11">Ya tengo cuenta · Entrar</Link>
        </div>
        <p className="mt-8 font-semibold text-cafe">¿Qué ganas al entrar?</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICIOS.map((b) => (
            <Link key={b.titulo} href={b.href} className="flex min-h-11 items-start gap-3 rounded-xl border border-cafe/10 bg-white p-4 transition hover:border-latte/50">
              <Icono nombre={b.icono} className="mt-0.5 h-6 w-6 shrink-0 text-latte" />
              <span>
                <span className="block font-semibold text-cafe">{b.titulo}</span>
                <span className="block text-sm text-pizarra-suave">{b.detalle}</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-5 text-sm text-pizarra-suave">
          ¿Prefieres hablar con una persona?{" "}
          <a href={waLink("Hola, quiero saber cómo formar parte de la Red Café Ecuador.")} target="_blank" rel="noreferrer" className="font-semibold text-latte underline">Escríbenos por WhatsApp</a>
          {" "}({CONFIG.whatsappMostrar}) ·{" "}
          <Link href="#perfiles" className="font-semibold text-latte underline">Ver perfiles</Link>
        </p>
      </div>
    </section>
  );
}
