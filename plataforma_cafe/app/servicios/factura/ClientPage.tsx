"use client";

import { useState } from "react";
import Link from "next/link";
import { CONFIG } from "@/lib/config";
import { Icono } from "@/components/Icono";

export default function FacturaClientPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const avisoWhatsApp = encodeURIComponent(
    "Hola Red Café Ecuador. Me interesa la facturación electrónica SRI. Notifíquenme cuando esté disponible."
  );

  async function suscribirse(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Ingresa un email válido.");
      return;
    }
    try {
      await fetch(CONFIG.api("/api/servicios.php?action=solicitar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicio_id: "facturacion-aviso",
          referencia_pago: `Email: ${email} — Interés en facturación SRI`,
        }),
      });
      setEnviado(true);
      setError("");
    } catch {
      setEnviado(true);
      setError("");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/servicios" className="inline-flex min-h-11 items-center text-sm font-semibold text-cereza hover:text-cereza/90 hover:underline">
        ← Volver a servicios
      </Link>

      {/* Hero */}
      <div className="mt-8 text-center">
        <span className="inline-grid h-16 w-16 place-items-center rounded-2xl bg-cereza/10 text-cereza">
          <Icono nombre="administracion" className="h-9 w-9" />
        </span>
        <h1 className="mt-4 font-titulo text-3xl font-bold text-cafe md:text-4xl">
          Facturación Electrónica SRI
        </h1>
        <p className="mt-3 mx-auto max-w-2xl text-lg text-pizarra/70">
          Herramienta de facturación electrónica para el sector cafetero ecuatoriano.
          Integra tu negocio con el SRI de forma sencilla.
        </p>
      </div>

      {/* Próximamente */}
      <div className="mt-10 rounded-2xl border-2 border-dashed border-cereza/30 bg-cereza/5 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Próximamente</p>
        <h2 className="mt-2 font-titulo text-2xl font-bold text-cafe">
          Estamos trabajando en esto
        </h2>
        <p className="mt-3 mx-auto max-w-lg text-pizarra/70">
          La facturación electrónica con integración al SRI está en desarrollo.
          Te notificaremos cuando esté lista para usar.
        </p>

        {!enviado ? (
          <form onSubmit={suscribirse} className="mt-6 mx-auto max-w-md space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu email para aviso"
                className="flex-1 min-h-11 rounded-xl border border-cafe/20 bg-white px-4 py-3 text-sm text-pizarra placeholder:text-pizarra/40 focus:border-cereza focus:outline-none focus:ring-2 focus:ring-cereza/20"
                required
              />
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-cereza px-6 py-3 text-sm font-semibold text-white hover:bg-cereza/90"
              >
                Avísame
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        ) : (
          <div className="mt-6 mx-auto max-w-md rounded-xl border border-hoja/40 bg-hoja/10 p-4">
            <p className="text-sm font-semibold text-hoja-oscuro">
              Te avisaremos cuando la facturación electrónica esté lista.
            </p>
          </div>
        )}

        <a
          href={`https://wa.me/${CONFIG.whatsapp}?text=${avisoWhatsApp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-semibold text-[#14140F] transition hover:bg-[#20ba5a]"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 1.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Avisarme por WhatsApp
        </a>
      </div>

      {/* Qué incluirá */}
      <div className="mt-12">
        <h2 className="font-titulo text-2xl font-bold text-cafe text-center">Qué incluirá</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icono: "ubicacion" as const, titulo: "Emisión directa", desc: "Genera facturas electrónicas válidas ante el SRI desde la plataforma." },
            { icono: "verificacion" as const, titulo: "Clave de acceso", desc: "Obtención automática de la clave de acceso del SRI para cada comprobante." },
            { icono: "laboratorio" as const, titulo: "Plantillas personalizadas", desc: "Diseña tus facturas con los datos de tu negocio y logo." },
            { icono: "exportador" as const, titulo: "Notas de venta", desc: "Emisión de notas de venta y retenciones." },
            { icono: "administracion" as const, titulo: "Reportes", desc: "Resumen de ventas, IVA y retenciones por período." },
            { icono: "chat" as const, titulo: "Soporte", desc: "Asesoría para la configuración inicial con tu contador." },
          ].map((f) => (
            <div key={f.titulo} className="rounded-2xl border border-cafe/10 bg-white p-6">
              <Icono nombre={f.icono} className="h-7 w-7 text-cereza" />
              <p className="mt-3 font-titulo text-lg font-bold text-cafe">{f.titulo}</p>
              <p className="mt-1 text-sm text-pizarra/70">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Herramienta actual */}
      <div className="mt-12 rounded-2xl border border-latte/50 bg-latte-claro/40 p-6">
        <h2 className="font-titulo text-lg font-bold text-cafe">Herramienta de referencia</h2>
        <p className="mt-2 text-sm text-pizarra/70">
          Mientras tanto, puedes usar nuestra herramienta de vista previa para organizar
          la información de tus facturas. Genera una vista previa del documento con
          los cálculos de IVA.
        </p>
        <Link
          href="/servicios/factura/preview"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-white border border-cafe/20 px-5 py-2.5 text-sm font-semibold text-cafe hover:border-cafe/40 hover:shadow-sm"
        >
          Usar herramienta de referencia →
        </Link>
      </div>
    </div>
  );
}
