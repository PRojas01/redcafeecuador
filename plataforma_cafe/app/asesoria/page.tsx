"use client";

import { useState } from "react";
import Link from "next/link";
import { waLink } from "@/lib/config";

export default function AsesoriaPage() {
 const [nombre, setNombre] = useState("");
 const [tema, setTema] = useState("Comercialización y precios");
 const [fecha, setFecha] = useState("");
 const [agendado, setAgendado] = useState(false);
 const [link, setLink] = useState("");

 const input = "mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2";

 const agendar = (e: React.FormEvent) => {
 e.preventDefault();
 if (nombre && fecha) {
 setLink(
 waLink(
 `Hola, quiero agendar una asesoría de la Red.\nTema: ${tema}\nNombre: ${nombre}\nFecha preferida: ${fecha}`
 )
 );
 setAgendado(true);
 }
 };

 const bloques = [
 {
 t: "Comercialización y precios",
 d: "Fija el precio justo de tu lote comparando ICE C y tu score de catación.",
 },
 {
 t: "Certificaciones (orgánico, comercio justo, EUDR)",
 d: "Te guiamos para obtener los sellos que abren mercados premium.",
 },
 {
 t: "Formalización (RUC, SRI, registro sanitario)",
 d: "Pasos concretos para formalizar tu negocio y facturar electrónicamente.",
 },
 {
 t: "Exportación y logística",
 d: "Desde cotización de flete hasta documentación de exportación.",
 },
 ];

 return (
 <div className="mx-auto max-w-6xl px-4 py-10">
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Servicio de la Red</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">Asesoría Comercial y Administrativa</h1>
 <p className="mt-2 max-w-2xl text-pizarra/80">
 Acompañamiento 1 a 1 para que vendas mejor y lleves tu negocio en orden.
 Se contrata cuando lo necesitas; el precio se informa antes de empezar.
 </p>

 <div className="mt-8 grid gap-6 lg:grid-cols-2">
 <div>
 <div className="grid gap-4 sm:grid-cols-2">
 {bloques.map((b) => (
 <div key={b.t} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <p className="font-semibold text-cafe">{b.t}</p>
 <p className="mt-1 text-sm text-pizarra/80">{b.d}</p>
 </div>
 ))}
 </div>
 <div className="mt-6 rounded-2xl border border-latte/40 bg-latte/10 p-5">
 <p className="font-titulo text-lg font-bold text-cafe">Panel de precios de referencia</p>
 <p className="mt-1 text-sm text-pizarra/70">
 Consulta el mercado y negocia con datos.{" "}
 <a href="/servicios/precios" className="font-semibold text-cereza underline">Ver panel →</a>
 </p>
 </div>
 </div>

 <form onSubmit={agendar} className="rounded-2xl border border-cafe/10 bg-white p-6">
 <p className="font-titulo text-xl font-bold text-cafe">Agenda tu sesión</p>
 <div className="mt-4 space-y-4">
 <label className="block text-sm">
 Tu nombre
 <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Nombre de ejemplo" className={input} />
 </label>
 <label className="block text-sm">
 Tema de asesoría
 <select value={tema} onChange={(e) => setTema(e.target.value)} className={input}>
 {bloques.map((b) => (
 <option key={b.t}>{b.t}</option>
 ))}
 </select>
 </label>
 <label className="block text-sm">
 Fecha preferida
 <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} />
 </label>
 </div>
 <button className="mt-5 w-full rounded-full bg-cereza px-5 py-3 font-semibold text-crema hover:bg-cereza/90">
 Agendar asesoría
 </button>
 {agendado && (
 <div className="mt-3 space-y-3 rounded-xl bg-hoja/15 p-4 text-center">
 <p className="text-sm font-semibold text-hoja">
 Reserva de {fecha} registrada. Confírmala ahora por WhatsApp:
 </p>
 <a
 href={link}
 target="_blank"
 rel="noreferrer"
 className="inline-flex rounded-full bg-hoja px-5 py-2 text-sm font-semibold text-crema hover:bg-hoja/90"
 >
 Confirmar por WhatsApp
 </a>
 </div>
 )}
</form>
  </div>

  <div className="mt-8 rounded-2xl border border-cafe/10 bg-white p-6">
  <p className="font-titulo text-xl font-bold text-cafe">¿Eres profesional del café?</p>
  <p className="mt-1 text-sm text-pizarra/80">
  Agrónomos, expertos en poscosecha y control de calidad, tostadores, gestores,
  exportadores o montadores de cafeterías: únete a la Red como Asesor Experto y
  ofrece tus servicios a cualquier eslabón de la cadena, desde productores hasta barras.
  </p>
  <Link href="/afiliate?rol=asesor" className="mt-4 inline-flex rounded-full bg-cafe px-5 py-2.5 font-semibold text-crema hover:bg-cafe/90">
  Darme de alta como asesor
  </Link>
  </div>
  </div>
  );
}
