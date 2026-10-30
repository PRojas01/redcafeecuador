import { CONFIG, waLink } from "@/lib/config";
import Link from "next/link";
import { Icono } from "@/components/Icono";

export function Footer() {
 return (
 <footer className="bg-cafe text-crema">
 <div className="mx-auto max-w-6xl px-4 pb-8 pt-14">
 <div className="grid gap-10 md:grid-cols-4">
 <div className="md:col-span-1">
 <div className="flex items-center gap-2.5">
 <span className="grid h-10 w-10 place-items-center rounded-full border border-crema/25 text-acento-claro">
 <Icono nombre="bar" className="h-5 w-5" />
 </span>
 <p className="font-titulo text-lg font-bold leading-none">
 Red Café
 <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-acento-claro">
 Ecuador
 </span>
 </p>
 </div>
 <p className="mt-4 text-sm leading-relaxed text-crema/70">
 Todo el café ecuatoriano, conectado.
 Productores, compradores, tostadores, cafeterías, proveedores y
 profesionales en una misma Red.
 </p>
 <div className="mt-5 flex flex-wrap gap-2">
 <a
 href={waLink("Hola, quiero información de la Red Café Ecuador.")}
 target="_blank"
 rel="noreferrer"
 className="inline-flex min-h-11 items-center gap-2 bg-[#25D366] px-4 text-sm font-semibold text-[#14140F] transition-opacity hover:opacity-90"
 >
 <Icono nombre="chat" className="h-4 w-4" />
 {CONFIG.whatsappMostrar}
 </a>
 {/* Solo se pintan las redes que existen: las vacías desaparecen solas. */}
 {Object.entries(CONFIG.redes)
 .filter(([, url]) => url)
 .map(([nombre, url]) => (
 <a
 key={nombre}
 href={url}
 target="_blank"
 rel="noreferrer"
 aria-label={nombre[0].toUpperCase() + nombre.slice(1)}
 title={nombre[0].toUpperCase() + nombre.slice(1)}
 className="grid h-11 w-11 place-items-center border border-crema/25 text-crema transition-colors hover:border-acento-claro hover:text-acento-claro"
 >
 <Icono nombre={nombre === "youtube" || nombre === "tiktok" ? "media" : nombre === "facebook" ? "comunidad" : "media"} className="h-4 w-4" />
 </a>
 ))}
 </div>
 </div>

 <div>
 <p className="mb-4 font-titulo text-sm font-bold uppercase tracking-widest text-acento-claro">
 La Red
 </p>
 <ul className="space-y-2.5 text-sm text-crema/70">
 <li>
 <Link href="/quienes-somos" className="transition-colors hover:text-acento-claro">
 Quiénes somos
 </Link>
 </li>
 <li>
 <Link href="/marketplace" className="transition-colors hover:text-acento-claro">
 Marketplace de café
 </Link>
 </li>
 <li>
 <Link href="/academia" className="transition-colors hover:text-acento-claro">
 Academia cafetera
 </Link>
 </li>
 <li>
 <Link href="/servicios" className="transition-colors hover:text-acento-claro">
 Asesoría comercial
 </Link>
 </li>
 <li>
 <Link href="/comunidad" className="transition-colors hover:text-acento-claro">
 Comunidad
 </Link>
 </li>
 <li>
 <Link href="/bar" className="transition-colors hover:text-acento-claro">
 Red Café Bar
 </Link>
 </li>
 </ul>
 </div>

 <div>
 <p className="mb-4 font-titulo text-sm font-bold uppercase tracking-widest text-acento-claro">
 Para ti
 </p>
 <ul className="space-y-2.5 text-sm text-crema/70">
 <li>
 <Link href="/afiliate" className="transition-colors hover:text-acento-claro">
 Productores
 </Link>
 </li>
 <li>
 <Link href="/afiliate" className="transition-colors hover:text-acento-claro">
 Tostadores y exportadores
 </Link>
 </li>
 <li>
 <Link href="/afiliate" className="transition-colors hover:text-acento-claro">
 Cafeterías y compradores
 </Link>
 </li>
 </ul>
 </div>

 <div>
 <p className="mb-4 font-titulo text-sm font-bold uppercase tracking-widest text-acento-claro">
 Contacto
 </p>
 <ul className="space-y-2.5 text-sm text-crema/70">
 <li>
 <a href={`mailto:${CONFIG.email}`} className="transition-colors hover:text-acento-claro">
 {CONFIG.email}
 </a>
 </li>
 <li>{CONFIG.whatsappMostrar}</li>
 <li>
 <a
 href="https://solucionespro.net/"
 target="_blank"
 rel="noreferrer"
 className="transition-colors hover:text-acento-claro"
 >
 SolucionesPro
 </a>
 </li>
 <li>
 <a
 href={waLink("Hola, quiero información de la Red Café Ecuador.")}
 target="_blank"
 rel="noreferrer"
 className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-latte/15 px-3 py-1.5 font-medium text-acento-claro transition-colors hover:bg-latte/25"
 >
 WhatsApp: escríbenos
 </a>
 </li>
 </ul>
 </div>
 </div>

 <div className="mt-12 border-t border-crema/10 pt-5">
 <div className="flex flex-col items-center justify-between gap-3 text-xs text-crema/50 md:flex-row">
 <p>© 2026 Red Café Ecuador — Pedro Rojas / SolucionesPro</p>
 <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
 <Link href="/terminos-y-condiciones" className="underline-offset-2 hover:text-acento-claro hover:underline">
 Términos
 </Link>
 <Link href="/politica-de-privacidad" className="underline-offset-2 hover:text-acento-claro hover:underline">
 Privacidad
 </Link>
 <Link href="/politica-de-cookies" className="underline-offset-2 hover:text-acento-claro hover:underline">
 Cookies
 </Link>
 <Link href="/legal" className="underline-offset-2 hover:text-acento-claro hover:underline">
 Centro legal
 </Link>
 </div>
 </div>
 </div>
 </div>
 </footer>
 );
}
