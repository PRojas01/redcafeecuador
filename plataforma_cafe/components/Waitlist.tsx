"use client";

import { useState } from "react";
import { CONFIG, waLink } from "@/lib/config";

export function Waitlist() {
 const [nombre, setNombre] = useState("");
 const [email, setEmail] = useState("");
 const [perfil, setPerfil] = useState("productor");
 const [estado, setEstado] = useState<"idle" | "ok" | "duplicado" | "error">("idle");

 const registrar = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!nombre.trim() || !email.includes("@")) {
 setEstado("idle");
 return;
 }

 try {
 const res = await fetch(CONFIG.api("/api/enviar-waitlist.php"), {
 method: "POST",
 headers: { Accept: "application/json" },
 body: JSON.stringify({ nombre, email, perfil }),
 });
 const json = await res.json().catch(() => null);
 if (res.status === 409) return setEstado("duplicado");
 if (res.ok && json?.ok) return setEstado("ok");
 setEstado("error");
 } catch {
 setEstado("error");
 }
 };

 const input =
 "mt-1 w-full rounded-lg border border-crema/30 bg-crema/10 px-3 py-2 text-crema placeholder:text-crema/50 focus:border-latte focus:outline-none";

 return (
 <section id="espera" className="bg-cafe py-16">
 <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
<div>
  <p className="text-sm font-semibold uppercase tracking-widest text-latte">
  FORMA PARTE
  </p>
  <h2 className="mt-2 font-titulo text-3xl font-bold text-crema">
  Forma parte de la Red
  </h2>
  <p className="mt-3 text-crema/80">
  Crea tu perfil y empieza a conectar con otros actores del café ecuatoriano.
  </p>
  <a
  href={waLink("Hola, quiero ser parte de la Red Café Ecuador.")}
  target="_blank"
  rel="noreferrer"
  className="mt-6 inline-flex items-center gap-2 rounded-full bg-hoja px-5 py-2.5 font-semibold text-crema transition hover:bg-hoja/90"
  >
  Prefiero escribir por WhatsApp
  </a>
  </div>

 <form
 onSubmit={registrar}
 className="rounded-2xl border border-crema/15 bg-crema/5 p-6"
 >
 <label className="block text-sm">
 <span className="text-crema/80">Nombre completo</span>
 <input
 value={nombre}
 onChange={(e) => setNombre(e.target.value)}
 placeholder="Ej: Nombre de ejemplo"
 className={input}
 />
 </label>
 <label className="mt-4 block text-sm">
 <span className="text-crema/80">Correo</span>
 <input
 value={email}
 type="email"
 onChange={(e) => setEmail(e.target.value)}
 placeholder="tu@correo.com"
 className={input}
 />
 </label>
 <label className="mt-4 block text-sm">
 <span className="text-crema/80">Soy…</span>
 <select
 value={perfil}
 onChange={(e) => setPerfil(e.target.value)}
 className={input}
 >
 <option value="productor">Productor (finca)</option>
 <option value="vendedor">Vendedor (tostador/exportador)</option>
 <option value="comprador">Comprador (cafetería/tienda)</option>
 <option value="proveedor">Proveedor de Equipos e Insumos</option>
<option value="amante">Amante del Café</option>
  <option value="asesor">Asesor Experto</option>
  <option value="interesado">Solo interesado</option>
 </select>
 </label>
<button
  type="submit"
  className="mt-5 w-full rounded-full bg-cereza px-5 py-3 font-semibold text-crema transition hover:bg-cereza/90"
  >
  Crear mi perfil
  </button>
  {estado === "ok" && (
  <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">
  ¡Listo {nombre.split(" ")[0]}! Tu solicitud fue registrada.
  </p>
  )}
 {estado === "duplicado" && (
 <p className="mt-3 rounded-xl bg-latte/15 p-3 text-center text-sm font-semibold text-latte-texto">
 Ya estás registrado. ¡Gracias!
 </p>
 )}
 {estado === "error" && (
 <p className="mt-3 rounded-xl bg-cereza/15 p-3 text-center text-sm font-semibold text-cereza">
 No pudimos registrar tu correo. Intenta de nuevo.
 </p>
 )}
<p className="mt-3 text-center text-xs text-crema/50">
  Participar en la Red es gratuito. Los servicios especializados se contratan
  únicamente cuando los necesites.
  </p>
 </form>
 </div>
 </section>
 );
}
