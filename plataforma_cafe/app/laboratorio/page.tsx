"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { waLink } from "@/lib/config";
import { Icono, type IconoNombre } from "@/components/Icono";
import { Skeleton } from "@/components/Skeleton";

interface CafeteriaItem {
 nombre: string;
 descripcion: string;
 precio: number;
 icono: IconoNombre;
}

interface Episodio {
 nro: number;
 titulo: string;
 duracion: string;
 resumen: string;
}

const CAFETERIA_PRODUCTOS: CafeteriaItem[] = [
 {
 nombre: "Geisha Loja — El Filo",
 descripcion: "Café de especialidad 91 pts, notas de jazmín y bergamota.",
 precio: 18,
 icono: "productor",
 },
 {
 nombre: "Sidra Honey — Quilla Yacu",
 descripcion: "89 pts, dulzor alto, caramelo y naranja confitada.",
 precio: 15,
 icono: "verificacion",
 },
 {
 nombre: "Blend de la Red (casa)",
 descripcion: "Mezcla ecuatoriana equilibrada para preparar en casa.",
 precio: 8,
 icono: "tostador",
 },
 {
 nombre: "Café del Mes — Suscripción",
 descripcion: "Recibe un origen nuevo seleccionado cada mes.",
 precio: 14,
 icono: "marketplace",
 },
];

const EPISODIOS: Episodio[] = [
 {
 nro: 1,
 titulo: "El despertar del café ecuatoriano",
 duracion: "28 min",
 resumen: "La historia del sector, la reactivación de 135 mil hectáreas y el futuro del café de especialidad.",
 },
 {
 nro: 2,
 titulo: "¿Cómo fijar el precio de tu lote?",
 duracion: "22 min",
 resumen: "ICE C, diferenciales por calidad y negociación directa con tostadores.",
 },
 {
 nro: 3,
 titulo: "EUDR en la práctica: exportar sin miedo",
 duracion: "25 min",
 resumen: "Lo que el reglamento europeo exige y cómo la trazabilidad GPS te abre mercados premium.",
 },
 {
 nro: 4,
 titulo: "De la finca a tu taza: historias de la Red",
 duracion: "31 min",
 resumen: "Productores de Loja, Zamora y Manabí cuentan cómo venden directo.",
 },
];

const PRUEBAS = [
 {
 t: "Catación virtual",
 d: "Anota notas de taza y compara tu paladar con perfiles de referencia.",
 icono: "verificacion" as const,
 },
 {
 t: "Curva de tueste",
 d: "Simula una curva de tueste y ve cómo cambia el perfil de taza.",
 icono: "tostador" as const,
 },
 {
 t: "Armar tu carta de café",
 d: "Diseña la oferta de tu cafetería con nuestros orígenes.",
 icono: "bar" as const,
 },
 {
 t: "Kit de empaque",
 d: "Previsualiza empaques con sello Red Café Ecuador para tu marca.",
 icono: "exportador" as const,
 },
];

export default function LaboratorioPage() {
 return (
 <Suspense
 fallback={
 <div className="mx-auto max-w-6xl px-4 py-20 space-y-6">
 <Skeleton variante="titulo" className="w-2/3" />
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="card p-6 space-y-3">
 <Skeleton variante="avatar" />
 <Skeleton variante="titulo" className="w-1/2" />
 <Skeleton variante="linea" className="w-full" />
 <Skeleton variante="linea" className="w-3/4" />
 </div>
 ))}
 </div>
 </div>
 }
 >
 <LaboratorioContent />
 </Suspense>
 );
}

function LaboratorioContent() {
 const router = useRouter();
 const search = useSearchParams();
 const [seccion, setSeccion] = useState<string>(search.get("seccion") ?? "cafeteria");
 const [carrito, setCarrito] = useState<Record<string, number>>({});
 const [probarPrecios, setProbarPrecios] = useState(false);

 const totalUnidades = Object.values(carrito).reduce((a, b) => a + b, 0);
 const totalUsd = Object.entries(carrito).reduce(
 (acc, [nombre, cant]) =>
 acc + cant * (CAFETERIA_PRODUCTOS.find((p) => p.nombre === nombre)?.precio ?? 0),
 0
 );

 const agregar = (nombre: string) =>
 setCarrito((prev) => ({ ...prev, [nombre]: (prev[nombre] ?? 0) + 1 }));

 const tabs = [
 { id: "cafeteria", l: " El Moral Bar Cafetería" },
 { id: "podcast", l: " Podcast" },
 { id: "pruebas", l: " Experiencias" },
 ];

 return (
 <div className="mx-auto max-w-6xl px-4 py-10">
 <span className="rounded-full bg-latte/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-pizarra">
 Novedades
 </span>
 <h1 className="mt-3 font-titulo text-3xl font-bold text-cafe">
 Laboratorio de la Red Café Ecuador
 </h1>
 <p className="mt-2 max-w-2xl text-pizarra/80">
 Una cafetería para estrenar el marketplace, un podcast con historias del campo
 y un banco de herramientas que la Red va poniendo a tu disposición.
 </p>

 <div className="mt-6 rounded-2xl border border-latte/40 bg-latte/10 p-4 text-sm">
 <p className="font-semibold text-cafe"> Precios de referencia (demo)</p>
 <p className="mt-1 text-pizarra/70">
 Los precios mostrados son valores de referencia para probar el flujo de
 compra. En la versión productiva, cada miembro publica su propio catálogo
 con precios reales.
 </p>
 </div>

 <div className="mt-6 flex flex-wrap gap-2">
 {tabs.map((t) => (
 <button
 key={t.id}
 onClick={() => {
 setSeccion(t.id);
 router.replace(`/laboratorio?seccion=${t.id}`, { scroll: false });
 }}
 className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
 seccion === t.id
 ? "bg-cafe text-crema"
 : "border border-cafe/20 bg-white text-cafe hover:border-cafe/40"
 }`}
 >
 {t.l}
 </button>
 ))}
 </div>

 {seccion === "cafeteria" && (
 <div className="mt-8 grid gap-6 lg:grid-cols-3">
 <div className="lg:col-span-2">
 <div className="grid gap-4 sm:grid-cols-2">
 {CAFETERIA_PRODUCTOS.map((p) => (
 <div key={p.nombre} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <Icono nombre={p.icono} className="h-8 w-8 text-cereza" />
 <p className="mt-2 font-semibold text-cafe">{p.nombre}</p>
 <p className="mt-1 text-sm text-pizarra/80">{p.descripcion}</p>
 <div className="mt-3 flex items-center justify-between">
 <p className="text-lg font-bold text-cereza">${p.precio.toFixed(2)}</p>
 <button
 onClick={() => agregar(p.nombre)}
 className="rounded-full bg-cafe px-4 py-2 text-sm font-semibold text-crema hover:bg-cereza"
 >
 Agregar × {carrito[p.nombre] ?? 0}
 </button>
 </div>
 </div>
 ))}
 </div>
 <p className="mt-4 rounded-xl bg-latte/15 p-3 text-sm text-pizarra/70">
 <strong>Así funciona:</strong> esta cafetería muestra el flujo de la
 suscripción "Café del mes" para miembros compradores.
 </p>
 </div>
 <div className="rounded-2xl border border-cafe/10 bg-white p-6">
 <p className="font-titulo text-lg font-bold text-cafe">Tu pedido</p>
 {totalUnidades === 0 ? (
 <p className="mt-2 text-sm text-pizarra/60">
 Agrega productos para probar el flujo de compra.
 </p>
 ) : (
 <ul className="mt-3 space-y-2 text-sm">
 {Object.entries(carrito)
 .filter(([, c]) => c > 0)
 .map(([nombre, cant]) => (
 <li key={nombre} className="flex justify-between">
 <span>{nombre} × {cant}</span>
 <span className="font-semibold text-cafe">
 ${(cant * (CAFETERIA_PRODUCTOS.find((p) => p.nombre === nombre)?.precio ?? 0)).toFixed(2)}
 </span>
 </li>
 ))}
 </ul>
 )}
 <div className="mt-4 flex justify-between border-t border-cafe/10 pt-3">
 <span className="font-semibold text-cafe">Total</span>
 <span className="text-xl font-bold text-cereza">${totalUsd.toFixed(2)}</span>
 </div>
 <button
 onClick={() => setProbarPrecios(true)}
 disabled={totalUnidades === 0}
 className="mt-4 w-full rounded-full bg-cereza px-4 py-3 text-sm font-semibold text-crema transition hover:bg-cereza/90 disabled:opacity-40"
 >
 Confirmar pedido (demostración)
 </button>
 {probarPrecios && totalUnidades > 0 && (
 <div className="mt-3 space-y-2 rounded-xl bg-hoja/15 p-3 text-center">
 <p className="text-sm font-semibold text-hoja">
 Pedido registrado: cuando activemos escrow, tu pago quedará en custodia hasta confirmar la entrega.
 </p>
 <p className="text-xs text-pizarra/70">
 El pago se coordina por WhatsApp con nuestro equipo.
 </p>
 </div>
 )}
 </div>
 </div>
 )}

 {seccion === "podcast" && (
 <div className="mt-8 grid gap-4 md:grid-cols-2">
 {EPISODIOS.map((ep) => (
 <div key={ep.nro} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="flex items-center gap-3">
 <span className="grid h-10 w-10 place-items-center rounded-full bg-cafe text-crema">▶</span>
 <div>
 <p className="text-xs text-pizarra/50">Episodio {ep.nro} · {ep.duracion}</p>
 <p className="font-semibold text-cafe">{ep.titulo}</p>
 </div>
 </div>
 <p className="mt-3 text-sm text-pizarra/80">{ep.resumen}</p>
 <a
 href="https://open.spotify.com"
 target="_blank"
 rel="noreferrer"
 className="mt-3 inline-block rounded-full border border-hoja px-4 py-1.5 text-xs font-semibold text-hoja hover:bg-hoja hover:text-crema"
 >
 Escuchar
 </a>
 </div>
 ))}
 </div>
 )}

 {seccion === "pruebas" && (
 <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {PRUEBAS.map((p) => (
 <div
 key={p.t}
 className="rounded-2xl border border-dashed border-latte/60 bg-latte/10 p-5 transition hover:bg-latte/20"
 >
 <Icono nombre={p.icono} className="h-8 w-8 text-cereza" />
 <p className="mt-2 font-semibold text-cafe">{p.t}</p>
 <p className="mt-1 text-sm text-pizarra/70">{p.d}</p>
 <a
 href={waLink(`Hola, quiero activar la herramienta "${p.t}" de la Red.`)}
 target="_blank"
 rel="noreferrer"
 className="mt-3 inline-block rounded-full bg-cafe px-3 py-1 text-xs font-semibold text-crema hover:bg-pizarra"
 >
 Solicitar por WhatsApp
 </a>
 </div>
 ))}
 </div>
 )}

 <FeedbackForm />

 </div>
 );
}

function FeedbackForm() {
 const [nombre, setNombre] = useState("");
 const [perfil, setPerfil] = useState("productor");
 const [voto, setVoto] = useState(4);
 const [comentario, setComentario] = useState("");
 const [enviado, setEnviado] = useState(false);

 const guardar = (e: React.FormEvent) => {
 e.preventDefault();
 const key = "redcafe_feedback";
 const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
 const lista = raw ? (JSON.parse(raw) as unknown[]) : [];
 lista.push({
 nombre,
 perfil,
 voto,
 comentario,
 fecha: new Date().toISOString(),
 });
 localStorage.setItem(key, JSON.stringify(lista));
 setEnviado(true);
 };

 const input = "mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2";

 return (
 <div className="mt-10 rounded-2xl border border-cafe/10 bg-white p-6">
 <p className="font-titulo text-lg font-bold text-cafe">
 Cuéntanos qué te parecen los servicios
 </p>
 <p className="mt-1 text-sm text-pizarra/70">
 Tu opinión nos ayuda a priorizar mejoras. También puedes escribirnos por
 WhatsApp con cualquier sugerencia.
 </p>
 <form onSubmit={guardar} className="mt-4 grid gap-4 sm:grid-cols-2">
 <label className="block text-sm">
 Nombre (opcional)
 <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
 </label>
 <label className="block text-sm">
 Perfil
 <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className={input}>
 <option>productor</option>
 <option>vendedor</option>
 <option>comprador</option>
 <option>proveedor</option>
 <option>interesado</option>
 </select>
 </label>
 <label className="block text-sm">
 Valoración (1–5)
 <input
 type="number"
 min={1}
 max={5}
 value={voto}
 onChange={(e) => setVoto(Number(e.target.value))}
 className={input}
 />
 </label>
 <label className="block text-sm sm:col-span-2">
 Comentario
 <textarea
 value={comentario}
 onChange={(e) => setComentario(e.target.value)}
 rows={3}
 placeholder="¿Qué te gustó? ¿Qué falta?"
 className={input}
 />
 </label>
 </form>
 {!enviado ? (
 <button
 onClick={guardar}
 className="mt-4 rounded-full bg-cereza px-6 py-2.5 text-sm font-semibold text-crema hover:bg-cereza/90"
 >
 Enviar feedback
 </button>
 ) : (
 <div className="mt-4 rounded-2xl bg-hoja/15 p-4 text-center">
 <p className="font-semibold text-hoja">
 ¡Gracias por tu opinión!
 </p>
 <p className="text-sm text-pizarra/70">
 Tu feedback quedó registrado en este dispositivo.
 </p>
 </div>
 )}
 </div>
 );
}
