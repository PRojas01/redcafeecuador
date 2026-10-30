"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { CURSOS } from "@/lib/data";
import { guardarBitacora, leerBitacora, leerSesion, type Sesion } from "@/lib/sesion";
import { CamasSecado, CerezaMadura, FincaTerrazas, SacoExportacion } from "@/components/Lamina";

const categoriaNombres: Record<string, string> = {
	produccion: "Producción",
	postcosecha: "Post-cosecha",
	comercial: "Comercial",
	administrativo: "Administrativo",
	calidad: "Calidad",
	barismo: "Barismo",
};

/** WhatsApp de Legacy, el aliado que dicta y cobra los cursos de barismo.
 *  El mensaje lleva el origen redcafeecuador.com para que Legacy sepa de dónde
 *  llega la persona y la Red pueda seguir la pista de cada matrícula. */
const waLegacy = (titulo: string) =>
	`https://wa.me/593998569355?text=${encodeURIComponent(
		`Hola Legacy, vengo de redcafeecuador.com. Me interesa el curso «${titulo}». ¿Me informan de fechas disponibles, promociones, condiciones y formas de pago?`
	)}`;

const idCursoLibre = "cafe-de-especialidad-de-la-finca-a-la-taza";

const portadasLegacy: Record<string, string> = {
	"legacy-barista-en-casa": "/uploads/user-content/legacy-barista-en-casa.jpg",
	"legacy-barismo-profesional": "/uploads/user-content/legacy-barismo-profesional.jpg",
	"legacy-barista-avanzado": "/uploads/user-content/legacy-barista-avanzado.jpg",
};

type EstadoMatricula = "cargando" | "anonimo" | "ninguno" | "pendiente" | "matriculado" | "aprobado" | "rechazado" | "error";
type DetalleCursoPublico = {
	introduccion?: string;
	objetivos?: string[];
	modulos?: { titulo: string; minutos?: number; resumen?: string; lecciones?: { titulo: string }[]; ejercicio?: string }[];
	recursos?: string[];
	cierre?: string;
};

const laminaPorCategoria: Record<string, ReactNode> = {
	produccion: <FincaTerrazas className="h-full w-full" />,
	postcosecha: <CamasSecado className="h-full w-full" />,
	comercial: <SacoExportacion className="h-full w-full" />,
	administrativo: <CerezaMadura className="h-full w-full" />,
};

export default function CursoPage() {
	const params = useParams<{ id: string }>();
	const curso = CURSOS.find((c) => c.id === params.id);

	// El avance vive en el navegador: se lee después de hidratar. Leerlo en el
	// primer render hacía que el HTML del servidor (0 %) y el del cliente no
	// coincidieran (React #418) para quien ya había avanzado.
	const [terminados, setTerminados] = useState<number[]>([]);
	useEffect(() => {
		setTerminados(leerBitacora<number[]>(`curso_done_${params.id}`, []));
	}, [params.id]);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [matricula, setMatricula] = useState<EstadoMatricula>("cargando");
	const [detalle, setDetalle] = useState<DetalleCursoPublico | null>(null);
	const [errorMatricula, setErrorMatricula] = useState("");
	const [enviandoMatricula, setEnviandoMatricula] = useState(false);

	const [sesion, setSesion] = useState<Sesion | null>(null);
	useEffect(() => { setSesion(leerSesion()); }, []);

	useEffect(() => {
		if (!curso?.precios) return;
		let activo = true;
		fetch(`/api/cursos.php?action=get&id=${encodeURIComponent(curso.id)}`, { credentials: "include", cache: "no-store" })
			.then((r) => r.json())
			.then((j) => {
				if (!activo) return;
				if (!j.ok || !j.data) throw new Error(j.error || "No se pudo consultar tu matrícula.");
				setDetalle(j.data.curso as DetalleCursoPublico);
				const estado = j.data.mi_solicitud as EstadoMatricula;
				setMatricula(["anonimo", "ninguno", "pendiente", "matriculado", "aprobado", "rechazado"].includes(estado) ? estado : "ninguno");
			})
			.catch(() => { if (activo) setMatricula("error"); });
		return () => { activo = false; };
	}, [curso?.id, curso?.precios]);

	if (!curso) notFound();

	const solicitarMatricula = async () => {
		if (enviandoMatricula) return;
		setEnviandoMatricula(true);
		setErrorMatricula("");
		try {
			const r = await fetch("/api/cursos.php?action=matricular", {
				method: "POST", credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ curso: curso.id }),
			});
			const j = await r.json();
			if (!r.ok || !j.ok) throw new Error(j.error || "No se pudo registrar la matrícula.");
			const estado = j.data?.estado as EstadoMatricula;
			if (!["pendiente", "matriculado", "aprobado"].includes(estado)) throw new Error("No se confirmó la matrícula.");
			setMatricula(estado);
		} catch (error) {
			setErrorMatricula(error instanceof Error ? error.message : "No se pudo registrar la matrícula.");
		} finally {
			setEnviandoMatricula(false);
		}
	};

	const progreso = Math.round((terminados.length / curso.modulos.length) * 100);

	const alternar = (i: number) => {
		const nuevos = terminados.includes(i)
			? terminados.filter((x) => x !== i)
			: [...terminados, i];
		setTerminados(nuevos);
		guardarBitacora(`curso_done_${params.id}`, nuevos);
		guardarBitacora(
			`curso_prog_${params.id}`,
			Math.round((nuevos.length / curso.modulos.length) * 100)
		);
		if (nuevos.length === curso.modulos.length) setFeedback("completo");
	};

	return (
		<div className="mx-auto max-w-4xl px-4 py-10">
			<Link href="/academia" className="text-sm font-semibold text-cereza hover:underline">
				← Volver a la Academia
			</Link>

			<div className="mt-4 aspect-[16/6] overflow-hidden rounded-2xl bg-cream-100">
				{portadasLegacy[curso.id]
					? <img src={portadasLegacy[curso.id]} alt={`Portada de ${curso.titulo}`} className="h-full w-full object-cover" />
					: curso.id === idCursoLibre
						? <img src="/uploads/user-content/redcafe-curso-calidad.jpg" alt={`Portada de ${curso.titulo}`} className="h-full w-full object-cover" />
						: laminaPorCategoria[curso.categoria] ?? laminaPorCategoria.produccion}
			</div>

			<div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
				<span className="rounded-full bg-latte/15 px-3 py-1 font-bold uppercase tracking-wide text-cafe">
					{categoriaNombres[curso.categoria]} · {curso.nivel}
				</span>
				<span className="rounded-full bg-cream-200 px-3 py-1 font-semibold text-pizarra-suave">
					{curso.duracion}
				</span>
			</div>

			<h1 className="mt-3 font-titulo text-3xl font-bold leading-tight text-cafe">
				{curso.titulo}
			</h1>
			<p className="mt-2 text-pizarra-suave">{curso.descripcion}</p>

			{curso.precios && (
				<div className="mt-6 rounded-2xl border border-cereza/25 bg-cereza/5 p-5">
					<p className="text-xs font-bold uppercase tracking-widest text-cereza">
						Curso de pago · dictado y cobrado por {curso.autor ?? "el aliado"}
					</p>

					<div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
						<span className="font-titulo text-3xl font-bold text-cafe">
							{curso.precios.descuento} USD
						</span>
						<span className="text-sm text-pizarra/60 line-through">
							Valor normal {curso.precios.normal} USD
						</span>
						{typeof curso.precios.pareja_grupo === "number" && (
							<span className="text-sm font-semibold text-pizarra-suave">
								En pareja o grupo: {curso.precios.pareja_grupo} USD por persona
							</span>
						)}
					</div>
					<p className="mt-1 text-xs text-pizarra/70">
						La matrícula en la Red es gratis y no implica cobro: reservas tu lugar y la
						Red te pone en contacto con Legacy para el pago, la fecha y la logística.
					</p>

					{curso.requisitos && <p className="mt-3 text-sm font-semibold text-cafe">{curso.requisitos}</p>}
					{curso.incluye && curso.incluye.length > 0 && (
						<div className="mt-4"><p className="text-sm font-bold text-cafe">Incluye</p>
							<ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{curso.incluye.map((item) => <li key={item} className="text-sm text-pizarra">✓ {item}</li>)}</ul>
						</div>
					)}
					{curso.fechas && curso.fechas.length > 0 && (
						<div className="mt-4">
							<p className="text-xs font-bold uppercase tracking-widest text-pizarra">
								Fechas anunciadas · confirma disponibilidad
							</p>
							<ul className="mt-2 space-y-1.5">
								{curso.fechas.map((f) => (
									<li
										key={`${f.nombre}-${f.inicio}`}
										className="flex flex-wrap items-baseline gap-x-3 rounded-xl bg-surface px-3 py-2 text-sm"
									>
										<span className="font-semibold text-cafe">{f.nombre}</span>
										<span className="text-pizarra-suave">
											{f.inicio} → {f.fin}
										</span>
										<span className="text-xs text-pizarra/70">
											{f.dias} · {f.horario}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}

					<div className="mt-4 rounded-xl border border-cafe/10 bg-white p-4">
						{matricula === "cargando" && <p className="text-sm text-pizarra">Comprobando tu matrícula en Red Café…</p>}
						{matricula === "error" && <p className="text-sm text-cereza">No pudimos consultar tu matrícula. Recarga esta página para intentarlo de nuevo.</p>}
						{matricula === "anonimo" && <div className="text-sm text-pizarra">
							<p>Primero crea tu perfil o entra a Red Café para registrar tu interés en este curso.</p>
							<div className="mt-3 flex flex-wrap gap-3"><Link href="/afiliate/" className="rounded-xl bg-cafe px-4 py-2 font-semibold text-white">Crear perfil gratis</Link><Link href="/login/" className="rounded-xl border border-cafe px-4 py-2 font-semibold text-cafe">Entrar</Link></div>
						</div>}
						{["ninguno", "rechazado"].includes(matricula) && <div className="text-sm text-pizarra">
							<p>Registra tu matrícula gratuita en Red Café. Así queda guardada en el sistema y podrás consultar después las condiciones y formas de pago con Legacy.</p>
							<button type="button" onClick={solicitarMatricula} disabled={enviandoMatricula} className="mt-3 rounded-xl bg-cafe px-4 py-2 font-semibold text-white disabled:opacity-60">{enviandoMatricula ? "Registrando…" : "Matricularme en Red Café"}</button>
							<p className="mt-2 text-xs text-pizarra/70">Al matricularte, la administración y las personas autorizadas para gestionar este curso podrán ver tus datos de contacto y dar seguimiento a tu solicitud. <Link href="/politica-de-uso-de-datos/" className="underline">Ver política de uso de datos</Link>.</p>
						</div>}
						{["pendiente", "matriculado", "aprobado"].includes(matricula) && <div className="text-sm text-pizarra">
							<p>Tu matrícula quedó registrada en Red Café{matricula === "pendiente" ? " y el acceso al contenido está pendiente de aprobación" : ""}. Ya puedes consultar a Legacy por las condiciones y formas de pago.</p>
							<a href={waLegacy(curso.titulo)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#25D366] px-5 py-3 font-bold text-[#14140F] transition hover:brightness-95">Solicitar información y formas de pago a Legacy</a>
						</div>}
						{errorMatricula && <p role="alert" className="mt-2 text-sm text-cereza">{errorMatricula}</p>}
					</div>
					{curso.cierre && (
						<p className="mt-3 text-xs text-pizarra/70">{curso.cierre}</p>
					)}
				</div>
			)}

			{sesion && !curso.precios && (
				<div className="mt-5 rounded-2xl border border-border-soft bg-surface p-4">
					<div className="flex items-center justify-between text-sm font-semibold text-pizarra">
						<span>Tu progreso</span>
						<span>{progreso}%</span>
					</div>
					<div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cafe/10">
						<div
							className="h-full bg-latte transition-all"
							style={{ width: `${progreso}%` }}
						/>
					</div>
				</div>
			)}

			{curso.precios ? (
				<section className="mt-8 space-y-6" aria-label="Temario">
					{detalle?.introduccion && <div className="rounded-2xl border border-border-soft bg-surface p-5"><h2 className="font-titulo text-xl font-bold text-cafe">Sobre el curso</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-pizarra">{detalle.introduccion}</p></div>}
					{detalle?.objetivos && detalle.objetivos.length > 0 && <div><h2 className="font-titulo text-xl font-bold text-cafe">Al terminar, podrás</h2><ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm text-pizarra">{detalle.objetivos.map((objetivo, i) => <li key={i}>{objetivo}</li>)}</ul></div>}
					<div><h2 className="font-titulo text-xl font-bold text-cafe">Temario completo</h2><p className="mt-1 text-sm text-pizarra/70">Puedes revisar los temas antes de matricularte. El contenido de las lecciones requiere aprobación del curso.</p>
						<div className="mt-3 space-y-3">{(detalle?.modulos ?? curso.modulos).map((m, i) => <article key={`${m.titulo}-${i}`} className="rounded-2xl border border-border-soft bg-surface p-5"><p className="text-xs font-bold uppercase tracking-wide text-cereza">Módulo {i + 1}{m.minutos ? ` · ${m.minutos} min` : ""}</p><h3 className="mt-1 font-titulo text-lg font-bold text-cafe">{m.titulo}</h3>{"resumen" in m && m.resumen && <p className="mt-2 text-sm text-pizarra">{m.resumen}</p>}{"lecciones" in m && m.lecciones && m.lecciones.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-pizarra">{m.lecciones.map((leccion, j) => <li key={j}>{leccion.titulo}</li>)}</ul>}{"ejercicio" in m && m.ejercicio && <p className="mt-3 text-sm text-pizarra"><strong>Ejercicio:</strong> {m.ejercicio}</p>}</article>)}</div>
					</div>
					{detalle?.recursos && detalle.recursos.length > 0 && <div><h2 className="font-titulo text-xl font-bold text-cafe">Recursos y referencias</h2><ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-pizarra">{detalle.recursos.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
					{detalle?.cierre && <div className="rounded-2xl border border-border-soft bg-surface p-5"><h2 className="font-titulo text-xl font-bold text-cafe">Para cerrar</h2><p className="mt-2 text-sm text-pizarra">{detalle.cierre}</p></div>}
				</section>
			) : <div className="mt-8 space-y-3">
				{curso.modulos.map((m, i) => {
					const hecho = terminados.includes(i);
					return (
						<button
							key={m.titulo}
							onClick={() => alternar(i)}
							className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
								hecho
									? "border-hoja/40 bg-hoja/10"
									: "border-border-soft bg-surface hover:border-cafe/30"
							}`}
						>
							<span
								className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
									hecho ? "bg-hoja text-cream-50" : "bg-cafe/10 text-cafe"
								}`}
							>
								{hecho ? "✓" : i + 1}
							</span>
							<div className="flex-1">
								<p className="font-semibold text-cafe">{m.titulo}</p>
								<p className="text-xs text-pizarra/60">{m.minutos} min</p>
							</div>
							<span className="text-xs text-pizarra/50">
								{hecho ? "Completado" : "Por completar"}
							</span>
						</button>
					);
				})}
			</div>}

			{!curso.precios && feedback === "completo" && (
				<div className="mt-6 rounded-2xl border border-latte/40 bg-latte/15 p-5 text-center">
					<span
						aria-hidden="true"
						className="mx-auto block h-7 w-7 rounded-full border border-cereza/40"
					/>
					<p className="mt-1 font-titulo text-lg font-bold text-cafe">¡Curso completado!</p>
					<p className="text-sm text-pizarra/70">
						Tu certificado de la Red Café Ecuador está disponible. Míralo en{" "}
						<Link href="/panel?ver=certificados" className="font-semibold text-cereza underline">
							Mi Red
						</Link>
						.
					</p>
				</div>
			)}
		</div>
	);
}
