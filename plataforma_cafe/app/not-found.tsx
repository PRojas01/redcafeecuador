import Link from "next/link";

export const metadata = {
 title: "404 — Página no encontrada | Red Café Ecuador",
};

export default function NotFound() {
 return (
 <div className="mx-auto max-w-2xl px-4 py-20 text-center">
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Error 404</p>
 <h1 className="mt-2 font-titulo text-3xl font-bold text-cafe">
 Esta taza está vacía
 </h1>
 <p className="mt-3 text-pizarra/70">
 La página que buscas no existe, se movió o fue retirada.
 Vuelve al inicio o explora la Red.
 </p>
 <div className="mt-8 flex flex-wrap justify-center gap-3">
 <Link href="/" className="rounded-full bg-cereza px-6 py-3 font-semibold text-crema hover:bg-cereza/90">
 Ir al inicio
 </Link>
 <Link href="/marketplace" className="rounded-full border border-cafe/30 px-6 py-3 font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Ver Marketplace
 </Link>
 <Link href="/servicios" className="rounded-full border border-cafe/30 px-6 py-3 font-semibold text-cafe hover:bg-cafe hover:text-crema">
 Explorar servicios
 </Link>
 </div>
 </div>
 );
}
