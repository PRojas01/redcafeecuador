"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
 solicitarCertificado,
 leerCertificados,
 formatearFecha,
 etiquetaEstado,
 TITULOS_TIPO,
 verificarCodigoPublico,
 type Certificado,
 type TipoCertificado,
} from "@/lib/certificados";

const input =
 "mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 focus:border-cereza focus:outline-none";

export default function EudrClientPage() {
 const [finca, setFinca] = useState("");
 const [coordenadas, setCoordenadas] = useState("");
 const [provincia, setProvincia] = useState("");
 const [lote, setLote] = useState("");
 const [sacos, setSacos] = useState<number | "">("");
 const [solicitante, setSolicitante] = useState("");
 const [email, setEmail] = useState("");
 const [cert, setCert] = useState<Certificado | null>(null);
 const [certificados, setCertificados] = useState<Certificado[]>([]);
 const [codigoBusca, setCodigoBusca] = useState("");
 const [verificado, setVerificado] = useState<Certificado | null | "no" | null>(null);

 useEffect(() => {
 setCertificados(leerCertificados());
 }, []);

 const solicitar = (e: React.FormEvent) => {
 e.preventDefault();
 const c = solicitarCertificado({
 tipo: "eudr",
 titulo: TITULOS_TIPO.eudr,
 finca,
 provincia,
 lote,
 solicitante,
 email,
 datos: {
 coordenadas,
 sacos: `${Number(sacos)} sacos (${(Number(sacos) * 60).toLocaleString("es-EC")} kg)`,
 producto: "Café arábica (verde), origen Ecuador",
 libreDeforestacion: "Declaración: parcela libre de deforestación posterior a 31/12/2020",
 cadenaCustodia: "Productor → Red Café Ecuador → Comprador",
 },
 });
 setCert(c);
 setCertificados(leerCertificados());
 };

 const imprimir = () => {
 document.getElementById("certificado-impreso")?.classList.remove("print:hidden");
 window.print();
 };

 const buscarCodigo = (e: React.FormEvent) => {
 e.preventDefault();
 const r = verificarCodigoPublico(codigoBusca);
 setVerificado(r ?? "no");
 };

return (
		<div className="mx-auto max-w-4xl px-4 py-10">
			<p className="text-sm font-semibold uppercase tracking-widest text-cereza">Servicio de la Red · Trazabilidad</p>
			<h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">Expediente de trazabilidad</h1>
			<p className="mt-2 max-w-2xl text-pizarra/80">
				Organiza la información de finca y geolocalización necesaria para apoyar procesos de
				trazabilidad y debida diligencia.
			</p>

			<div className="mt-6 grid gap-4 sm:grid-cols-3">
				{[
					{ n: "1", t: "Preparas", d: "Registras finca, GPS y lote. Queda listo para tu expediente." },
					{ n: "2", t: "Revisión de la Red", d: "La Red valida los datos y apoya la debida diligencia." },
					{ n: "3", t: "Expediente listo", d: "Número único + código de verificación, listo para adjuntar." },
				].map((p) => (
 <div key={p.n} className="rounded-2xl border border-cafe/10 bg-white p-4">
 <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cereza text-sm font-bold text-crema">{p.n}</span>
 <p className="mt-2 font-semibold text-cafe">{p.t}</p>
 <p className="mt-1 text-xs text-pizarra/70">{p.d}</p>
 </div>
 ))}
 </div>

<form onSubmit={solicitar} className="mt-8 space-y-4 rounded-2xl border border-cafe/10 bg-white p-6">
		<p className="font-titulo text-lg font-bold text-cafe">Preparar expediente del lote</p>
 <div className="grid gap-4 sm:grid-cols-2">
 <label className="text-sm">
 Solicitante (nombre del productor)
 <input value={solicitante} onChange={(e) => setSolicitante(e.target.value)} placeholder="Ej: Nombre de ejemplo" className={input} required />
 </label>
 <label className="text-sm">
 Correo
 <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className={input} required />
 </label>
 <label className="text-sm">
 Finca
 <input value={finca} onChange={(e) => setFinca(e.target.value)} placeholder="Nombre de finca o unidad productiva" className={input} required />
 </label>
 <label className="text-sm">
 Coordenadas GPS
 <input value={coordenadas} onChange={(e) => setCoordenadas(e.target.value)} placeholder="Ej: latitud, longitud o referencia GPS" className={input} required />
 </label>
 <label className="text-sm">
 Provincia
 <input value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Provincia" className={input} required />
 </label>
 <label className="text-sm">
 Lote / referencia
 <input value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Ej: lote o cosecha de referencia" className={input} required />
 </label>
 <label className="text-sm">
 Cantidad (sacos 60 kg)
 <input type="number" min={1} value={sacos} onChange={(e) => setSacos(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Cantidad" className={input} required />
 </label>
 </div>
<button className="rounded-full bg-cereza px-6 py-3 font-semibold text-crema hover:bg-cereza/90">
		Preparar expediente
	</button>
 </form>

 {cert && cert.estado === "pendiente" && (
 <div className="mt-6 rounded-2xl border border-latte/50 bg-latte/10 p-6">
 <p className="font-titulo text-lg font-bold text-cafe"> Solicitud recibida — N.º {cert.numero}</p>
 <p className="mt-1 text-sm text-pizarra/80">
 Tu lote quedó en <b>revisión</b>. Un verificador de la Red auditará los datos. Usa el
 perfil <Link href="/afiliate?rol=certificador" className="font-semibold text-cereza underline">Verificador / Catador</Link>{" "}
 (o el panel de un miembro certificador) para emitir el certificado. También puedes
 aprobarlo desde el panel con el rol de certificador.
 </p>
 <button onClick={() => setCert(null)} className="mt-3 rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe">
 Solicitar otro lote
 </button>
 </div>
 )}

<div className="mt-8">
		<p className="font-titulo text-lg font-bold text-cafe">Tus expedientes</p>
		{certificados.length === 0 ? (
			<p className="mt-2 rounded-2xl border border-cafe/10 bg-white p-5 text-sm text-pizarra/70">
				Aún no has preparado expedientes. Completa el formulario para comenzar.
			</p>
 ) : (
 <div className="mt-3 space-y-3">
 {certificados.map((c) => {
 const st = etiquetaEstado(c.estado);
 return (
 <div key={c.id} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="font-semibold text-cafe">{c.titulo} · {c.lote}</p>
 <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.clase}`}>{st.texto}</span>
 </div>
 <p className="mt-1 text-xs text-pizarra/60">
 N.º {c.numero} · Solicitado {formatearFecha(c.fechaSolicitud)}
 {c.estado === "emitido" && ` · Emitido ${formatearFecha(c.fechaEmision)}`}
 </p>
 {c.estado === "emitido" && (
 <div className="mt-3 flex flex-wrap gap-2">
 <button onClick={imprimir} className="rounded-full bg-cafe px-4 py-2 text-sm font-semibold text-crema hover:bg-cafe/90">
 Imprimir / PDF
 </button>
 <span className="self-center text-xs text-pizarra/60">
 Verifica: <button onClick={() => { setCodigoBusca(c.codigo); setVerificado(null); }} className="font-mono font-semibold text-cereza hover:underline">{c.codigo}</button>
 </span>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Verificación pública */}
 <form onSubmit={buscarCodigo} className="mt-8 rounded-2xl border border-hoja/40 bg-hoja/5 p-6">
 <p className="font-titulo text-lg font-bold text-cafe"> Verificar un informe</p>
 <p className="mt-1 text-sm text-pizarra/70">
 Cualquier comprador o importador puede validar la autenticidad de un certificado con su código.
 </p>
 <div className="mt-3 flex gap-2">
 <input value={codigoBusca} onChange={(e) => setCodigoBusca(e.target.value)} placeholder="RC-XXXXXXXX-EC" className={`${input} max-w-xs font-mono`} />
 <button className="rounded-full bg-hoja px-5 py-2 text-sm font-semibold text-crema hover:bg-hoja/90">Verificar</button>
 </div>
 {verificado === "no" && (
 <p className="mt-3 rounded-xl bg-cereza/10 p-3 text-sm font-semibold text-cereza">
 Código no encontrado o certificado no emitido.
 </p>
 )}
 {verificado && verificado !== "no" && (
 <div className="mt-3 rounded-xl bg-white p-4">
 <p className="font-semibold text-hoja"> Informe válido</p>
 <p className="mt-1 text-sm text-pizarra/80">
 {verificado.titulo} · {verificado.finca} · Lote {verificado.lote}
 <br />
 Emisor: {verificado.emisor} ({verificado.emisorCredencial}) · Emitido {formatearFecha(verificado.fechaEmision)}
 </p>
 </div>
 )}
 </form>

 {/* ====== Documento imprimible (vista previa en pantalla + impresión) ====== */}
 {cert && cert.estado === "emitido" && (
 <div className="print-cert">
 <p className="mt-10 text-sm font-semibold uppercase tracking-widest text-pizarra/50">Vista previa del documento</p>
 <CertificadoDocumento cert={cert} />
 </div>
 )}
 {certificados
 .filter((c) => c.estado === "emitido")
 .map((c) => (
 <div key={c.id} className="print-cert">
 <CertificadoDocumento cert={c} />
 </div>
 ))}
 </div>
 );
}

function CertificadoDocumento({ cert }: { cert: Certificado }) {
 return (
 <div className="mt-4 rounded-2xl border-2 border-cafe/60 bg-white p-8 shadow-sm">
 <div className="flex items-start justify-between border-b-2 border-cafe/20 pb-4">
 <div>
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Red Café Ecuador</p>
 <p className="mt-1 font-titulo text-2xl font-bold text-cafe">{cert.titulo}</p>
 </div>
 <p className="text-right font-mono text-xs text-pizarra/60">
 N.º {cert.numero}
 <br />
 Código: {cert.codigo}
 </p>
 </div>

 <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
 <CampoDoc k="Certifica que" v={`${cert.solicitante} ha registrado y auditado el lote:`} span />
 <CampoDoc k="Finca" v={cert.finca} />
 <CampoDoc k="Provincia" v={cert.provincia} />
 <CampoDoc k="Lote" v={cert.lote} />
 {Object.entries(cert.datos).map(([k, v]) => (
 <CampoDoc key={k} k={k.replace(/([A-Z])/g, " $1").trim()} v={v} />
 ))}
 <CampoDoc k="Fecha de emisión" v={formatearFecha(cert.fechaEmision)} />
 <CampoDoc k="Válido hasta" v={formatearFecha(cert.fechaVencimiento)} />
 </div>

 <div className="mt-8 flex items-end justify-between border-t-2 border-cafe/20 pt-6">
 <div>
 <p className="font-mono text-xs text-pizarra/60">Código de verificación pública</p>
 <p className="font-mono text-lg font-bold text-cafe">{cert.codigo}</p>
 <p className="mt-1 text-xs text-pizarra/50">
 Verificable en Red Café Ecuador · {new Date().getFullYear()}
 </p>
 </div>
 <div className="text-right">
 <p className="font-titulo text-lg font-bold text-cafe">{cert.emisor || "Red Café Ecuador"}</p>
 <p className="text-xs text-pizarra/60">{cert.emisorCredencial || "Verificador de la Red"}</p>
 <p className="mt-2 border-t border-cafe/20 pt-1 font-mono text-xs text-pizarra/50">
 {cert.emisor || "Red Café Ecuador"}
 </p>
 </div>
 </div>
 </div>
 );
}

function CampoDoc({ k, v, span }: { k: string; v: string; span?: boolean }) {
 return (
 <div className={span ? "col-span-2" : ""}>
 <p className="text-xs font-semibold uppercase tracking-wider text-pizarra/50">{k}</p>
 <p className="mt-0.5 text-pizarra/90">{v}</p>
 </div>
 );
}
