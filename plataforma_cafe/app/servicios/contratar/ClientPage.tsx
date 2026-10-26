"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SERVICIOS_PAGADOS } from "@/lib/data";
import { getStoredSession, api } from "@/lib/api";
import { Icono } from "@/components/Icono";
import { CerezaMadura, SelloOrigen } from "@/components/Lamina";
import { Skeleton } from "@/components/Skeleton";
import { CONFIG } from "@/lib/config";
import { PayPalButton } from "@/components/PayPalButton";

const ICONO_SERVICIO = {
  "asesoria-negocio": "administracion",
  "asesoria-exportacion": "exportador",
  "curso-especialidad": "laboratorio",
  "curso-barismo": "barista",
  "cert-eudr": "ubicacion",
  "cert-catacion": "laboratorio",
  "cert-verificacion": "verificacion",
  "flete-cafe": "logistica",
  "pilado-sacos": "pilador",
} as const;

function iconoDeServicio(id: string) {
  return ICONO_SERVICIO[id as keyof typeof ICONO_SERVICIO] ?? "administracion";
}

type MetodoPago = "transferencia" | "paypal";

function ContratarInner() {
  const params = useSearchParams();
  const servicioId = params.get("servicio") ?? "";
  const servicio = SERVICIOS_PAGADOS.find((s) => s.id === servicioId && !s.gratis);

  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);
  const [metodo, setMetodo] = useState<MetodoPago>("transferencia");
  const [referencia, setReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  const crearOrden = useCallback(async (servicioId: string, referenciaPago: string) => {
    const res = await fetch(CONFIG.api("/api/servicios.php?action=solicitar"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servicio_id: servicioId, referencia_pago: referenciaPago }),
    });
    return res.json();
  }, []);

  if (!servicio) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Servicios de la Red</p>
        <h1 className="mt-4 font-titulo text-2xl font-bold text-cafe">Servicio no encontrado</h1>
        <p className="mt-2 text-pizarra/70">El servicio que buscas no existe o no está disponible.</p>
        <Link href="/servicios" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-cereza px-6 py-3 text-sm font-semibold text-white hover:bg-cereza/90">
          ← Volver a servicios
        </Link>
      </div>
    );
  }

  const mensajeWhatsApp = encodeURIComponent(
    `Hola Red Café Ecuador. Quiero solicitar: ${servicio.nombre} ($${servicio.precio} ${servicio.unidad}). Mi nombre es ${session?.nombre ?? "[tu nombre]"}.`
  );
  const whatsappUrl = `https://wa.me/${CONFIG.whatsapp}?text=${mensajeWhatsApp}`;

  async function enviarReferencia(e: React.FormEvent) {
    e.preventDefault();
    if (!referencia.trim()) {
      setError("Ingresa la referencia del comprobante.");
      return;
    }
    setEnviando(true);
    setError("");
    setMensaje("");
    try {
      const data = await crearOrden(servicio!.id, referencia.trim());
      if (!data.ok) {
        setError(data.error || "Error al enviar la solicitud.");
      } else {
        setMensaje("Solicitud registrada. Recibirás confirmación por WhatsApp una vez verificado el pago.");
        setReferencia("");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function handlePayPalSuccess(orderID: string, _payerID: string) {
    setEnviando(true);
    setError("");
    setMensaje("");
    try {
      const res = await fetch(CONFIG.api("/api/servicios.php?action=confirm_paypal"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicio_id: servicio!.id, paypal_order_id: orderID }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "No se pudo confirmar el pago PayPal.");
      } else {
        setMensaje("Pago confirmado. Tu solicitud fue registrada exitosamente.");
      }
    } catch {
      setError("Error al confirmar el pago. Contacta soporte si el cobro se realizó.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/servicios" className="inline-flex min-h-11 items-center text-sm font-semibold text-cereza hover:text-cereza/90 hover:underline">
        ← Volver a servicios
      </Link>

      <div className="mt-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
        {/* Columna izquierda: imagen */}
        <div className="lg:col-span-5">
          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-cafe/15 bg-crema">
              <CerezaMadura className="w-full" />
            </div>
            <SelloOrigen className="absolute -right-3 -bottom-6 w-40 -rotate-6" />
          </div>
        </div>

        {/* Columna derecha: info + pago */}
        <div className="mt-12 lg:col-span-7 lg:mt-0">
          <div className="flex items-start gap-3">
            <Icono nombre={iconoDeServicio(servicio.id)} className="mt-1 h-8 w-8 shrink-0 text-cereza" />
            <div>
              <h1 className="font-titulo text-3xl font-bold text-cafe md:text-4xl">{servicio.nombre}</h1>
              <p className="mt-2 text-pizarra/70">{servicio.descripcion}</p>
            </div>
          </div>

          {/* Precio */}
          <div className="mt-8 border-t border-cafe/15 pt-6">
            <p className="font-mono text-5xl font-bold tracking-tight tabular-nums text-cereza md:text-6xl">
              <span className="rotulo mr-1 align-middle text-text-secondary">desde</span>${servicio.precio}
              <span className="ml-3 align-middle text-sm font-semibold uppercase tracking-wider text-pizarra/60">{servicio.unidad}</span>
            </p>
          </div>

          {/* Tabs de método de pago */}
          {!session ? (
            <div className="mt-8 rounded-2xl border border-latte/40 bg-latte-claro/50 p-6 text-center">
              <p className="text-sm text-pizarra/70">Inicia sesión para contratar este servicio.</p>
              <Link href="/login" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-cereza px-6 py-3 text-sm font-semibold text-white hover:bg-cereza/90">
                Iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-8 flex gap-2 rounded-xl border border-cafe/15 bg-crema p-1">
                <button
                  onClick={() => setMetodo("transferencia")}
                  className={`flex-1 min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    metodo === "transferencia"
                      ? "bg-white text-cafe shadow-sm"
                      : "text-pizarra/60 hover:text-cafe"
                  }`}
                >
                  Transferencia bancaria
                </button>
                <button
                  onClick={() => setMetodo("paypal")}
                  className={`flex-1 min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    metodo === "paypal"
                      ? "bg-white text-cafe shadow-sm"
                      : "text-pizarra/60 hover:text-cafe"
                  }`}
                >
                  PayPal
                </button>
              </div>

              {/* Transferencia bancaria */}
              {metodo === "transferencia" && (
                <div className="mt-6 space-y-6">
                  <div className="rounded-2xl border border-latte/50 bg-latte-claro/60 p-6">
                    <h2 className="font-titulo text-lg font-bold text-cafe">Instrucciones de pago</h2>
                    <ol className="mt-3 space-y-3 text-sm text-pizarra/70">
                      <li>
                        <strong>1.</strong> Solicita por WhatsApp los datos de pago actualizados para <strong>{servicio.nombre}</strong>.
                      </li>
                      <li><strong>2.</strong> Cuando el asesor confirme el método de pago, realiza el pago por el canal indicado.</li>
                      <li><strong>3.</strong> Guarda el comprobante e ingresa la referencia abajo para registrar tu solicitud.</li>
                    </ol>
                  </div>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-base font-semibold text-[#14140F] transition hover:bg-[#20ba5a]"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Solicitar datos de pago por WhatsApp
                  </a>

                  <form onSubmit={enviarReferencia} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-cafe">Referencia del comprobante</label>
                      <input
                        type="text"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="Ej: TRX-20260818-12345"
                        className="mt-1 w-full min-h-11 rounded-xl border border-cafe/20 bg-white px-4 py-3 text-sm text-pizarra placeholder:text-pizarra/40 focus:border-cereza focus:outline-none focus:ring-2 focus:ring-cereza/20"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={enviando}
                      className="w-full min-h-11 rounded-xl bg-cereza px-6 py-3 text-base font-semibold text-white transition hover:bg-cereza/90 disabled:opacity-50"
                    >
                      {enviando ? "Enviando..." : "Enviar referencia de pago"}
                    </button>
                  </form>
                </div>
              )}

              {/* PayPal */}
              {metodo === "paypal" && (
                <div className="mt-6 space-y-6">
                  <div className="rounded-2xl border border-latte/50 bg-latte-claro/60 p-6">
                    <h2 className="font-titulo text-lg font-bold text-cafe">Pago seguro con PayPal</h2>
                    <p className="mt-2 text-sm text-pizarra/70">
                      Paga con tu cuenta de PayPal o con tarjeta de crédito/débito a través de PayPal.
                      El pago se confirma automáticamente y tu solicitud se registra al instante.
                    </p>
                  </div>

                  <PayPalButton
                    amount={servicio.precio}
                    description={`${servicio.nombre} — Red Café Ecuador`}
                    onSuccess={handlePayPalSuccess}
                    onError={(err) => {
                      console.error("PayPal error:", err);
                      setError("Error en el pago PayPal. Intenta de nuevo.");
                    }}
                    disabled={enviando}
                  />

                  <p className="text-center text-xs text-pizarra/50">
                    Al pagar, aceptas los <Link href="/terminos-y-condiciones" className="underline">términos y condiciones</Link> del servicio.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Mensajes globales */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
          {mensaje && (
            <div className="mt-4 rounded-xl border border-hoja/40 bg-hoja/10 p-4 text-sm font-semibold text-hoja-oscuro">
              {mensaje}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContratarServicioClient() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 space-y-4">
          <Skeleton variante="titulo" className="w-2/3" />
          <Skeleton variante="texto" className="w-full" />
          <Skeleton variante="texto" className="w-5/6" />
          <Skeleton variante="linea" className="w-full" />
        </div>
      }
    >
      <ContratarInner />
    </Suspense>
  );
}
