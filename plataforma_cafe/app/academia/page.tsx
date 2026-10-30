"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CURSOS } from "@/lib/data";
import { useContenido } from "@/lib/useContenido";
import { leerBitacora, leerSesion, type Sesion } from "@/lib/sesion";
import { CONFIG } from "@/lib/config";
import { CamasSecado, CerezaMadura, FincaTerrazas, SacoExportacion } from "@/components/Lamina";
import { EstadoVacio } from "@/components/EstadoVacio";

const sellos: Record<string, string> = {
  "cafe-de-especialidad-de-la-finca-a-la-taza": "Empieza gratis · de la finca a la taza",
  "legacy-barista-en-casa": "Prepara mejores tazas en casa",
  "legacy-barismo-profesional": "Practica técnicas de barra profesional",
  "legacy-barista-avanzado": "Da el siguiente paso tras Barista Pro",
};

const categoriaNombres: Record<string, string> = {
	produccion: "Producción",
	postcosecha: "Post-cosecha",
	comercial: "Comercial",
	administrativo: "Administrativo",
	calidad: "Calidad",
};

/** Fotografías reales del proceso, por categoría de curso. Las categorías sin
 *  fotografía propia caen en la lámina vectorial de siempre. */
const fotoPorCategoria: Record<string, string> = {
	produccion: "produccion",
	postcosecha: "postcosecha",
	comercial: "comercial",
	certificacion: "certificacion",
	capacitacion: "capacitacion",
	basico: "basico",
};

const laminaPorCategoria: Record<string, ReactNode> = {
	produccion: <FincaTerrazas className="h-full w-full" />,
	postcosecha: <CamasSecado className="h-full w-full" />,
	comercial: <SacoExportacion className="h-full w-full" />,
	administrativo: <CerezaMadura className="h-full w-full" />,
};

function PortadaCurso({ categoria, titulo }: { categoria: string; titulo: string }) {
	const foto = fotoPorCategoria[categoria];
	if (categoria === "calidad") return <img src="/uploads/user-content/redcafe-curso-calidad.jpg" alt={`Portada de ${titulo}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />;
	if (foto) {
		return (
			<img
				src={`${CONFIG.basePath}/img/academia/${foto}.webp`}
				alt={`Fotografía del proceso relacionada con ${titulo}`}
				className="h-full w-full object-cover"
				width={640}
				height={360}
				loading="lazy"
				decoding="async"
			/>
		);
	}
	return <>{laminaPorCategoria[categoria]}</>;
}

export default function AcademiaPage() {
	// Sesión y avance viven en el navegador: se leen después de hidratar para que
	// el primer render coincida con el HTML estático (antes: React #418).
	const [sesion, setSesion] = useState<Sesion | null>(null);
	const [montado, setMontado] = useState(false);
	useEffect(() => { setSesion(leerSesion()); setMontado(true); }, []);
	const { items: cursos } = useContenido("cursos", CURSOS);

	return (
		<div>
			<section className="hero-gradient py-16 text-crema">
				<div className="mx-auto max-w-6xl px-4">
					<p className="badge bg-latte/15 text-acento-claro">ACADEMIA RED CAFÉ</p>
					<h1 className="mt-3 font-titulo text-4xl font-bold leading-tight text-crema md:text-5xl">
						El conocimiento también forma parte de la Red
					</h1>
					<p className="mt-4 max-w-2xl text-crema/80">
						Aprende sobre producción, postcosecha, comercialización,
						administración, calidad, tueste y otros temas relacionados con el
						café.
					</p>
				</div>
			</section>

			<section className="py-14">
				<div className="mx-auto max-w-6xl px-4">
					<p className="max-w-2xl text-pizarra-suave">
						Consulta los contenidos disponibles para tu perfil y continúa
						aprendiendo dentro de la Red.
					</p>

					<div className="mt-8">
						{cursos.length === 0 ? (
							<EstadoVacio
								icono="academia"
								titulo="Aún no hay cursos disponibles"
								descripcion="La Academia se encuentra en preparación. Vuelve más tarde."
							/>
						) : (
						<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{cursos.map((c) => {
							const progreso = montado ? leerBitacora<number>(`curso_prog_${c.id}`, 0) : 0;
							return (
								<Link
									key={c.id}
									href={`/academia/${c.id}`}
									className="card group flex flex-col overflow-hidden"
								>
									<div className="relative aspect-[16/9] overflow-hidden bg-cream-100">
										<PortadaCurso categoria={c.categoria} titulo={c.titulo} />
										<span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-md bg-[#3B1A0C] px-3 py-2 text-xs font-bold leading-snug text-[#FFF7E8] shadow-lg">{sellos[c.id] ?? "Aprende gratis · a tu ritmo"}</span>
									</div>
									<div className="flex flex-1 flex-col p-6">
										<span className="inline-block w-fit rounded-full bg-latte/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cafe">
											{categoriaNombres[c.categoria]} · {c.nivel}
										</span>
										<h3 className="mt-3 font-titulo text-lg font-bold leading-snug text-cafe transition group-hover:text-cereza">
											{c.titulo}
										</h3>
										<p className="mt-2 flex-1 text-sm leading-relaxed text-pizarra-suave">
											{c.descripcion}
										</p>
										<p className="mt-4 text-xs font-semibold text-latte-texto">
											{c.duracion} · {c.modulos.length} módulos
										</p>
										{sesion ? (
											<div className="mt-4">
												<div className="flex items-center justify-between text-xs font-semibold text-pizarra-suave">
													<span>Tu progreso</span>
													<span>{progreso}%</span>
												</div>
												<div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cafe/10">
													<div
														className="h-full bg-latte transition-all"
														style={{ width: `${progreso}%` }}
													/>
												</div>
											</div>
										) : null}
										<span className="mt-5 inline-flex items-center justify-center rounded-full bg-cereza px-5 py-2.5 text-sm font-semibold text-crema transition group-hover:bg-hoja">
											{progreso > 0 ? "Continuar curso" : "Comenzar curso"}
										</span>
									</div>
								</Link>
							);
						})}
					</div>
					)}
					</div>
				</div>
			</section>
		</div>
	);
}