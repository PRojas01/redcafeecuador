import Link from "next/link";
import { SERVICIOS_EXTRA, SERVICIOS_PAGADOS } from "@/lib/data";
import { Icono } from "@/components/Icono";
import { waLink } from "@/lib/config";
import { Intermediacion, PrecioServicio } from "@/components/ServiciosVivos";

export const metadata = {
  title: "Servicios para el sector cafetero",
  description: "Asesoría, catación, trazabilidad, formalización y herramientas de precios para productores, tostadores y cafeterías.",
  alternates: { canonical: "/servicios/" },
};


const CATEGORIAS = [
	{ id: "asesoria", titulo: "Asesorías", icono: "administracion" },
	{ id: "capacitacion", titulo: "Capacitaciones", icono: "academia" },
	{ id: "certificacion", titulo: "Verificación y documentación", icono: "verificacion" },
	{ id: "logistica", titulo: "Logística", icono: "logistica" },
] as const;

const NOMBRES_BLOQUE1: Record<string, string> = {
	"acceso-basico": "Perfil",
	marketplace: "Marketplace",
	"academia-basica": "Academia",
	"precios-libres": "Precios",
};

const COPY_ESPECIAL: Record<string, { nombre: string; descripcion: string }> = {
	"cert-eudr": {
		nombre: "Expediente de trazabilidad",
		descripcion:
			"Organiza la información de finca y geolocalización necesaria para apoyar procesos de trazabilidad y debida diligencia.",
	},
	"cert-catacion": {
		nombre: "Servicio de catación",
		descripcion:
			"Evaluación técnica del lote por profesionales o laboratorios especializados disponibles en la Red.",
	},
};

const TITULO_EXTRA: Record<string, string> = {
	// Distinto de «Expediente de trazabilidad» (el servicio que se contrata): esta explica el EUDR.
	trazabilidad: "Trazabilidad y EUDR: cómo funciona",
	certificacion: "Verificación y documentación",
};

export default function ServiciosPage() {
	const gratis = SERVICIOS_PAGADOS.filter((s) => s.gratis);
	const pagos = SERVICIOS_PAGADOS.filter((s) => !s.gratis);

	return (
		<div>
			{/* HERO */}
			<section className="hero-gradient py-16 text-crema">
				<div className="mx-auto max-w-6xl px-4">
					<p className="badge bg-latte/15 text-acento-claro">SERVICIOS DE LA RED</p>
					<h1 className="mt-3 font-titulo text-4xl font-bold leading-tight text-crema md:text-5xl">
						Soluciones para quienes trabajan con café
					</h1>
					<p className="mt-4 max-w-2xl text-crema/80">
						Accede a herramientas, información, asesoría y servicios especializados
						según las necesidades de tu actividad.
					</p>
				</div>
			</section>

			{/* Servicio oficial de intermediación (antes lo añadía la capa al cargar) */}
			<Intermediacion />

			<section className="py-14">
				<div className="mx-auto max-w-6xl px-4">
					{/* ── PRIMER BLOQUE: HERRAMIENTAS PARA TODOS ── */}
					<h2 className="font-titulo text-2xl font-bold text-cafe">
						Herramientas disponibles para todos
					</h2>
					<p className="mt-1 max-w-2xl text-pizarra/70">
						Crea tu perfil gratis y utiliza las herramientas básicas de la Red.
					</p>

					<div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{gratis.map((s) => (
							<Link
								key={s.id}
								href={s.href}
								className="group flex flex-col rounded-2xl border border-border-soft bg-surface p-6 shadow-sm transition hover:shadow-md"
							>
								<Icono nombre={iconoServicio(s.id)} className="h-7 w-7 text-cereza" />
								<p className="mt-3 font-titulo text-lg font-bold text-cafe">
									{NOMBRES_BLOQUE1[s.id] ?? s.nombre}
								</p>
								<p className="mt-1 flex-1 text-sm text-pizarra/80">{s.descripcion}</p>
								<span className="mt-4 text-sm font-semibold text-cereza group-hover:underline">
									Gratis →
								</span>
							</Link>
						))}
					</div>

					{/* ── SEGUNDO BLOQUE: SERVICIOS ESPECIALIZADOS ── */}
					<h2 className="mt-14 font-titulo text-2xl font-bold text-cafe">
						Servicios especializados
					</h2>
					<p className="mt-1 text-pizarra/70">
						Contrata únicamente los servicios que necesites.
					</p>

					{CATEGORIAS.map((cat) => {
						const items = pagos.filter((s) => s.categoria === cat.id);
						if (items.length === 0) return null;
						return (
							<div key={cat.id} className="mt-8">
								<p className="font-titulo text-lg font-bold text-cafe">
									<span className="inline-flex items-center gap-2">
										<Icono nombre={cat.icono} className="h-5 w-5 text-cereza" />
										{cat.titulo}
									</span>
								</p>
								<div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{items.map((s) => {
										const copy = COPY_ESPECIAL[s.id];
										return (
											<Link
												key={s.id}
												href={`/servicios/contratar?servicio=${s.id}`}
												className="group flex flex-col rounded-2xl border border-border-soft bg-surface p-6 shadow-sm transition hover:shadow-md"
											>
												<Icono nombre={iconoServicio(s.id)} className="h-7 w-7 text-cereza" />
												<p className="mt-3 font-titulo text-lg font-bold text-cafe">
													{copy?.nombre ?? s.nombre}
												</p>
												<p className="mt-1 flex-1 text-sm text-pizarra/80">
													{copy?.descripcion ?? s.descripcion}
												</p>
												<PrecioServicio id={s.id} nombre={copy?.nombre ?? s.nombre} precio={s.precio} unidad={s.unidad} />
											</Link>
										);
									})}
								</div>
							</div>
						);
					})}

					{/* ── HERRAMIENTAS ESPECIALIZADAS ── */}
					<p className="mt-12 font-titulo text-lg font-bold text-cafe">
						Herramientas
					</p>
					<div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{SERVICIOS_EXTRA.map((s) => {
							const ruta = rutaServicio(s.id);
							// Soporte y Comunidad va directo a WhatsApp (antes la capa copiaba la tarjeta con ese enlace).
							if (s.id === "soporte") {
								return (
									<a
										key={s.id}
										href={waLink("Hola, quiero soporte de la Red Café Ecuador.")}
										target="_blank"
										rel="noreferrer"
										className="group flex flex-col rounded-2xl border border-border-soft bg-surface p-6 shadow-sm transition hover:shadow-md"
									>
										<Icono nombre={iconoServicio(s.id)} className="h-7 w-7 text-cereza" />
										<p className="mt-3 font-titulo text-lg font-bold text-cafe">{TITULO_EXTRA[s.id] ?? s.titulo}</p>
										<p className="mt-1 flex-1 text-sm text-pizarra/80">{s.descripcion}</p>
										<span className="mt-4 text-sm font-semibold text-cereza group-hover:underline">Escribir por WhatsApp →</span>
									</a>
								);
							}
							return (
								<Link
									key={s.id}
									href={ruta ?? "/servicios"}
									className="group flex flex-col rounded-2xl border border-border-soft bg-surface p-6 shadow-sm transition hover:shadow-md"
								>
									<Icono nombre={iconoServicio(s.id)} className="h-7 w-7 text-cereza" />
									<p className="mt-3 font-titulo text-lg font-bold text-cafe">{TITULO_EXTRA[s.id] ?? s.titulo}</p>
									<p className="mt-1 flex-1 text-sm text-pizarra/80">{s.descripcion}</p>
									<span className="mt-4 text-sm font-semibold text-cereza group-hover:underline">
										{s.id === "trazabilidad"
											? "Preparar expediente →"
											: ruta
												? "Probar en el Laboratorio →"
												: "Incluido en la Academia"}
									</span>
								</Link>
							);
						})}
					</div>
				</div>
			</section>
		</div>
	);
}

function iconoServicio(id: string) {
	const mapa = {
		asesoria: "administracion",
		capacitacion: "academia",
		certificacion: "verificacion",
		logistica: "logistica",
		precios: "precio",
		calculadora: "calculadora",
		trazabilidad: "ubicacion",
		facturacion: "administracion",
		catacion: "laboratorio",
		suscripcion: "bar",
		soporte: "chat",
	} as const;
	return mapa[id as keyof typeof mapa] ?? "administracion";
}

function rutaServicio(id: string): string | null {
	const mapa: Record<string, string> = {
		precios: "/servicios/precios",
		calculadora: "/servicios/calculadora",
		trazabilidad: "/servicios/eudr",
		facturacion: "/servicios/factura",
		catacion: "/laboratorio",
		suscripcion: "/laboratorio?seccion=cafeteria",
		soporte: "/laboratorio?seccion=podcast",
	};
	return mapa[id] ?? null;
}