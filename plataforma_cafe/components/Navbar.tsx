"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, setStoredSession } from "@/lib/api";
import { Icono } from "@/components/Icono";
import { BanderaEcuador, LogoRedCafe } from "@/components/Marca";
import { InstalarPWA } from "@/components/InstalarPWA";

interface NavUser {
 id: string;
 nombre: string;
 rol: string;
}

export function Navbar() {
 const [user, setUser] = useState<NavUser | null>(null);
 const [open, setOpen] = useState(false);
 const [scrolled, setScrolled] = useState(false);

 useEffect(() => {
 api.me().then((r) => {
 if (r.ok && r.data) {
 const data = r.data as { user: NavUser | null; requires_2fa?: boolean };
 if (data.requires_2fa && !data.user) {
 setUser(null);
 return;
 }
 if (data.user) setUser(data.user);
 }
 });

 const onScroll = () => setScrolled(window.scrollY > 12);
 onScroll();
 window.addEventListener("scroll", onScroll, { passive: true });
 return () => window.removeEventListener("scroll", onScroll);
 }, []);

 const logout = async () => {
 await api.logout();
 setStoredSession(null);
 setUser(null);
 window.location.href = "/";
 };

 const first = user?.nombre?.split(" ")[0] ?? "";

const primaryLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/servicios", label: "Servicios" },
  { href: "/servicios/precios", label: "Precios" },
  { href: "/academia", label: "Academia" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/quienes-somos", label: "Quiénes somos" },
];

const secondaryLinks = [
  { href: "/marketplace#mapa", label: "Mapa / Ubicaciones" },
  { href: "/noticias", label: "Noticias" },
  { href: "/recetas", label: "Recetas" },
  { href: "/bar", label: "Bar / Cafeterías" },
  { href: "/laboratorio", label: "Laboratorio" },
  { href: "/servicios/calculadora", label: "Calculadora" },
  { href: "/servicios/eudr", label: "Trazabilidad / EUDR" },
  { href: "/servicios/factura", label: "Facturación" },
  { href: "/terminos-y-condiciones", label: "Términos" },
  { href: "/politica-de-privacidad", label: "Privacidad" },
];

const mobileLinks = [
  { href: "/servicios/precios", label: "Precios" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/servicios", label: "Servicios" },
  { href: "/marketplace#mapa", label: "Mapa / Ubicaciones" },
  { href: "/academia", label: "Academia" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/quienes-somos", label: "Quiénes somos" },
  ...secondaryLinks.filter((l) => !["/marketplace#mapa"].includes(l.href)),
];

 return (
 <header
 className={`sticky top-0 z-50 transition-all duration-300 ${
 scrolled
 ? "border-b border-filtrado-600/40 bg-cafe/95 backdrop-blur-xl"
 : "border-b border-filtrado-600/25 bg-cafe backdrop-blur"
 }`}
 >
 <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
 <Link href="/" className="group flex min-h-11 items-center gap-2.5">
 <LogoRedCafe className="h-9 w-9 shrink-0 text-crema" />
 <span className="marca text-lg leading-none text-crema">
 Red Café
 <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-acento-claro">
 Ecuador
 <BanderaEcuador className="h-3.5 w-5 shrink-0" />
 </span>
 </span>
 </Link>

 <nav className="hidden items-center gap-4 text-[13px] font-medium text-crema/85 lg:flex xl:gap-5">
 {primaryLinks.map((l) => (
 <Link
 key={l.href}
 href={l.href}
 className="inline-flex min-h-10 items-center whitespace-nowrap transition-colors hover:text-acento-claro"
 >
 {l.label}
 </Link>
 ))}
 <details className="group relative">
  <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1 whitespace-nowrap transition-colors hover:text-acento-claro">
  Más <span className="text-[10px] text-crema/55">▾</span>
  </summary>
  <div className="absolute right-0 top-full z-50 mt-2 grid min-w-56 gap-1 border border-crema/15 bg-cafe p-2 shadow-xl">
  {secondaryLinks.map((l) => (
  <Link
  key={l.href}
  href={l.href}
  className="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro"
  >
  {l.label}
  </Link>
  ))}
  </div>
 </details>
 {user ? (
  <>
  <Link href="/panel" className="inline-flex min-h-10 items-center whitespace-nowrap transition-colors hover:text-acento-claro">
  Mi Red
  </Link>
  <Link
  href="/chat"
  className="relative inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap transition-colors hover:text-acento-claro"
  aria-label="Chat de mensajes"
  >
  <Icono nombre="chat" className="h-5 w-5" />
  <span>Chat</span>
  </Link>
  <InstalarPWA variant="menu" />
  <button
  onClick={logout}
  className="min-h-10 whitespace-nowrap text-crema/60 transition-colors hover:text-acento-claro"
  >
  Salir
  </button>
  <Link
  href="/panel"
  className="btn-primary !px-4 !py-2 text-[13px]"
  >
  {first}
  </Link>
  </>
 ) : (
  <>
  <Link href="/login" className="inline-flex min-h-10 items-center whitespace-nowrap transition-colors hover:text-acento-claro">
  Entrar
  </Link>
  <InstalarPWA variant="menu" />
 <Link href="/afiliate" className="btn-primary !px-4 !py-2 text-[13px]">
   Forma parte de la Red
   </Link>
  </>
 )}
 </nav>

 <button
 onClick={() => setOpen(!open)}
 className="grid h-11 w-11 place-items-center border border-crema/25 text-crema lg:hidden"
 aria-label={open ? "Cerrar menú" : "Abrir menú"}
 >
 <span className="text-lg leading-none">{open ? "×" : "≡"}</span>
 </button>
 </div>

 {open && (
 <div className="border-t border-filtrado-600/30 bg-cafe px-4 pb-5 pt-2 lg:hidden">
 <div className="flex flex-col gap-1 text-sm font-medium text-crema/85">
 {!user ? (
  <>
  <Link
  href="/afiliate"
  onClick={() => setOpen(false)}
  className="btn-primary mt-2 text-center"
  >
  Forma parte de la Red
  </Link>
  <Link
  href="/login"
  onClick={() => setOpen(false)}
  className="rounded-xl px-3 py-2.5 transition-colors hover:bg-filtrado-800 hover:text-acento-claro"
  >
  Entrar
  </Link>
  </>
 ) : (
  <div className="mb-1 flex items-center gap-2 border-b border-crema/10 pb-2">
  <Link
  href="/panel"
  onClick={() => setOpen(false)}
  className="flex-1 rounded-xl px-3 py-2.5 font-semibold transition-colors hover:bg-filtrado-800 hover:text-acento-claro"
  >
  Mi Red ({first})
  </Link>
  <Link
  href="/chat"
  onClick={() => setOpen(false)}
  className="rounded-xl px-3 py-2.5 transition-colors hover:bg-filtrado-800 hover:text-acento-claro"
  aria-label="Chat de mensajes"
  >
  <Icono nombre="chat" className="h-5 w-5" />
  </Link>
  <button
  onClick={logout}
  className="shrink-0 rounded-xl border border-acento-claro/60 px-3 py-2.5 text-sm font-semibold text-acento-claro"
  >
  Cerrar sesión
  </button>
  </div>
 )}
 {mobileLinks.map((l) => (
 <Link
 key={l.href}
 href={l.href}
 onClick={() => setOpen(false)}
 className="rounded-xl px-3 py-2.5 transition-colors hover:bg-filtrado-800 hover:text-acento-claro"
 >
 {l.label}
 </Link>
 ))}
 <InstalarPWA variant="mobile" showFallback />
 </div>
 </div>
 )}
 </header>
 );
}
