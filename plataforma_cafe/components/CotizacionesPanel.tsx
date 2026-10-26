"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icono } from "@/components/Icono";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Toast, useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";

interface Cotizacion {
  nro: number;
  solicitante_id: string;
  solicitante_nombre: string;
  solicitante_rol: string;
  destinatario_id: string;
  destinatario_nombre: string;
  destinatario_rol: string;
  lote_id: string;
  mensaje: string;
  cantidad: number | null;
  unidad: string;
  estado: string;
  precio_unitario: number | null;
  precio_total: number | null;
  condiciones: string;
  respuesta_mensaje: string;
  fecha_respuesta: string | null;
  pedido_nro: number | null;
  created_at: string;
  updated_at: string;
}

type TabCotizaciones = "solicitadas" | "recibidas";

export function CotizacionesPanel({ perfilActual }: { perfilActual: "solicitadas" | "recibidas" }) {
  const [tab, setTab] = useState<TabCotizaciones>(perfilActual);
  const [solicitadas, setSolicitadas] = useState<Cotizacion[]>([]);
  const [recibidas, setRecibidas] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalEnviar, setModalEnviar] = useState<Cotizacion | null>(null);
  const [modalAceptar, setModalAceptar] = useState<Cotizacion | null>(null);
  const [modalRechazar, setModalRechazar] = useState<Cotizacion | null>(null);
  const [modalDetalle, setModalDetalle] = useState<Cotizacion | null>(null);
  const [precioResp, setPrecioResp] = useState("");
  const [condicionesResp, setCondicionesResp] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const { toast, mostrar, cerrar } = useToast();

  const cargar = useCallback(async () => {
    setCargando(true);
    const [r1, r2] = await Promise.all([
      api.cotizacionMisSolicitadas(),
      api.cotizacionMisRecibidas(),
    ]);
    if (r1.ok && r1.data?.cotizaciones) setSolicitadas(r1.data.cotizaciones as Cotizacion[]);
    if (r2.ok && r2.data?.cotizaciones) setRecibidas(r2.data.cotizaciones as Cotizacion[]);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const enviarRespuesta = async () => {
    if (!modalEnviar || !precioResp) return;
    const r = await api.cotizacionEnviar(modalEnviar.nro, parseFloat(precioResp), condicionesResp);
    if (r.ok) {
      mostrar("success", "Cotización enviada.");
      setModalEnviar(null);
      setPrecioResp("");
      setCondicionesResp("");
      cargar();
    } else {
      mostrar("error", r.error || "Error");
    }
  };

  const aceptarCotizacion = async () => {
    if (!modalAceptar) return;
    const r = await api.cotizacionAceptar(modalAceptar.nro);
    if (r.ok) {
      mostrar("success", "Cotización aceptada. Pedido creado automáticamente.");
      setModalAceptar(null);
      cargar();
    } else {
      mostrar("error", r.error || "Error");
    }
  };

  const rechazarCotizacion = async () => {
    if (!modalRechazar) return;
    const r = await api.cotizacionRechazar(modalRechazar.nro, motivoRechazo);
    if (r.ok) {
      mostrar("success", "Cotización rechazada.");
      setModalRechazar(null);
      setMotivoRechazo("");
      cargar();
    } else {
      mostrar("error", r.error || "Error");
    }
  };

  const cancelarSolicitud = async (nro: number) => {
    const r = await api.cotizacionCancelar(nro);
    if (r.ok) {
      mostrar("success", "Solicitud cancelada.");
      cargar();
    } else {
      mostrar("error", r.error || "Error");
    }
  };

  const estadoColor = (e: string) => {
    if (e === "solicitada") return "bg-crema text-pizarra/70";
    if (e === "enviada") return "bg-blue-100 text-blue-700";
    if (e === "aceptada") return "bg-hoja/15 text-hoja";
    if (e === "rechazada") return "bg-cereza/15 text-cereza";
    if (e === "cancelada") return "bg-pizarra/10 text-pizarra/50";
    return "bg-crema text-pizarra/70";
  };

  const estadoLabel = (e: string) => {
    const labels: Record<string, string> = {
      solicitada: "Pendiente",
      enviada: "Esperando respuesta",
      aceptada: "Aceptada",
      rechazada: "Rechazada",
      cancelada: "Cancelada",
    };
    return labels[e] ?? e;
  };

  const items = tab === "solicitadas" ? solicitadas : recibidas;

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onCerrar={cerrar} />}

      {/* Modal: Enviar respuesta */}
      <Modal
        abierto={modalEnviar !== null}
        onCerrar={() => { setModalEnviar(null); setPrecioResp(""); setCondicionesResp(""); }}
        titulo="Enviar cotización"
        descripcion={`Cotización #${modalEnviar?.nro} para ${modalEnviar?.solicitante_nombre}`}
        pie={
          <>
            <button className="btn-ghost" onClick={() => setModalEnviar(null)}>Cancelar</button>
            <button className="btn-primary" onClick={enviarRespuesta} disabled={!precioResp}>Enviar cotización</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-pizarra/60">Precio unitario (USD)</label>
            <input
              type="number"
              value={precioResp}
              onChange={(e) => setPrecioResp(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-pizarra/60">Condiciones</label>
            <textarea
              value={condicionesResp}
              onChange={(e) => setCondicionesResp(e.target.value)}
              placeholder="Ej: plazo, entrega y forma de pago"
              rows={3}
              className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Aceptar */}
      <Modal
        abierto={modalAceptar !== null}
        onCerrar={() => setModalAceptar(null)}
        titulo="Aceptar cotización"
        descripcion={`¿Aceptar la cotización #${modalAceptar?.nro} por $${modalAceptar?.precio_total?.toFixed(2)}? Se creará un pedido automáticamente.`}
        pie={
          <>
            <button className="btn-ghost" onClick={() => setModalAceptar(null)}>Cancelar</button>
            <button className="btn-primary" onClick={aceptarCotizacion}>Aceptar y crear pedido</button>
          </>
        }
      />

      {/* Modal: Rechazar */}
      <Modal
        abierto={modalRechazar !== null}
        onCerrar={() => { setModalRechazar(null); setMotivoRechazo(""); }}
        titulo="Rechazar cotización"
        descripcion={`Rechazar la cotización #${modalRechazar?.nro}?`}
        pie={
          <>
            <button className="btn-ghost" onClick={() => setModalRechazar(null)}>Cancelar</button>
            <button className="btn-primary" onClick={rechazarCotizacion}>Rechazar</button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-semibold text-pizarra/60">Motivo (opcional)</label>
          <textarea
            value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)}
            placeholder="Ej: precio, disponibilidad u otra condición"
            rows={3}
            className="mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2 text-sm"
          />
        </div>
      </Modal>

      {/* Modal: Detalle */}
      <Modal
        abierto={modalDetalle !== null}
        onCerrar={() => setModalDetalle(null)}
        titulo={`Cotización #${modalDetalle?.nro ?? ""}`}
      >
        {modalDetalle && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-pizarra/50">Solicitante</p>
                <p className="font-semibold text-cafe">{modalDetalle.solicitante_nombre}</p>
                <p className="text-xs text-pizarra/50">{modalDetalle.solicitante_rol}</p>
              </div>
              <div>
                <p className="text-xs text-pizarra/50">Destinatario</p>
                <p className="font-semibold text-cafe">{modalDetalle.destinatario_nombre}</p>
                <p className="text-xs text-pizarra/50">{modalDetalle.destinatario_rol}</p>
              </div>
            </div>
            {modalDetalle.mensaje && (
              <div>
                <p className="text-xs text-pizarra/50">Mensaje</p>
                <p className="text-pizarra/80">{modalDetalle.mensaje}</p>
              </div>
            )}
            {modalDetalle.cantidad && (
              <p><span className="text-pizarra/50">Cantidad:</span> {modalDetalle.cantidad} {modalDetalle.unidad}</p>
            )}
            {modalDetalle.precio_unitario && (
              <p><span className="text-pizarra/50">Precio unitario:</span> ${modalDetalle.precio_unitario.toFixed(2)}</p>
            )}
            {modalDetalle.precio_total && (
              <p className="font-bold text-cereza"><span className="text-pizarra/50">Total:</span> ${modalDetalle.precio_total.toFixed(2)}</p>
            )}
            {modalDetalle.condiciones && (
              <div>
                <p className="text-xs text-pizarra/50">Condiciones</p>
                <p className="text-pizarra/80">{modalDetalle.condiciones}</p>
              </div>
            )}
            {modalDetalle.respuesta_mensaje && (
              <div>
                <p className="text-xs text-pizarra/50">Respuesta</p>
                <p className="text-pizarra/80">{modalDetalle.respuesta_mensaje}</p>
              </div>
            )}
            {modalDetalle.pedido_nro && (
              <p className="rounded-lg bg-hoja/10 p-2 text-hoja-oscuro">
                Pedido #{modalDetalle.pedido_nro} creado automáticamente.
              </p>
            )}
            <p className="text-xs text-pizarra/40">
              Creada: {new Date(modalDetalle.created_at).toLocaleString("es-EC")}
            </p>
          </div>
        )}
      </Modal>

      {/* Header */}
      <div className="rounded-2xl border border-cafe/10 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-cereza">Negociaciones</p>
        <h2 className="mt-1 font-titulo text-2xl font-bold text-cafe">Cotizaciones</h2>
        <p className="mt-2 max-w-2xl text-sm text-pizarra/70">
          Solicita precios, envía cotizaciones y convierte acuerdos en pedidos automáticamente.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl border border-cafe/15 bg-crema p-1">
        <button
          onClick={() => setTab("solicitadas")}
          className={`flex-1 min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            tab === "solicitadas" ? "bg-white text-cafe shadow-sm" : "text-pizarra/60 hover:text-cafe"
          }`}
        >
          Enviadas ({solicitadas.length})
        </button>
        <button
          onClick={() => setTab("recibidas")}
          className={`flex-1 min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            tab === "recibidas" ? "bg-white text-cafe shadow-sm" : "text-pizarra/60 hover:text-cafe"
          }`}
        >
          Recibidas ({recibidas.length})
        </button>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="rounded-2xl border border-cafe/10 bg-white p-8 text-center">
          <p className="text-sm text-pizarra/60">Cargando cotizaciones...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-cafe/10 bg-white p-8 text-center">
          <EstadoVacio
            titulo={tab === "solicitadas" ? "Sin cotizaciones enviadas" : "Sin cotizaciones recibidas"}
            descripcion={tab === "solicitadas"
              ? "Envía tu primera cotización desde el marketplace o el perfil de un miembro."
              : "Las solicitudes de cotización de otros miembros aparecerán aquí."
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.nro} className="flex flex-col gap-3 rounded-2xl border border-cafe/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-titulo font-bold text-cafe">
                    {tab === "solicitadas" ? c.destinatario_nombre : c.solicitante_nombre}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estadoColor(c.estado)}`}>
                    {estadoLabel(c.estado)}
                  </span>
                </div>
                <p className="text-xs text-pizarra/50">
                  #{c.nro} · {new Date(c.created_at).toLocaleDateString("es-EC")}
                  {c.cantidad ? ` · ${c.cantidad} ${c.unidad}` : ""}
                </p>
                {c.mensaje && <p className="mt-1 text-sm text-pizarra/70 line-clamp-1">{c.mensaje}</p>}
              </div>
              <div className="flex items-center gap-2">
                {c.precio_total && (
                  <p className="font-mono text-lg font-bold tabular-nums text-cereza">${c.precio_total.toFixed(2)}</p>
                )}
                <Link
                  href={`/chat?user=${encodeURIComponent(tab === "solicitadas" ? c.destinatario_id : c.solicitante_id)}`}
                  className="rounded-lg bg-cafe px-3 py-1.5 text-xs font-semibold text-crema hover:bg-cafe/90"
                >
                  Chat
                </Link>
                <button
                  onClick={() => setModalDetalle(c)}
                  className="rounded-lg border border-cafe/20 px-3 py-1.5 text-xs font-semibold text-cafe hover:bg-crema"
                >
                  Ver
                </button>
                {/* Acciones para recibidas (destinatario responde) */}
                {tab === "recibidas" && c.estado === "solicitada" && (
                  <button
                    onClick={() => { setModalEnviar(c); setPrecioResp(""); setCondicionesResp(""); }}
                    className="rounded-lg bg-cereza px-3 py-1.5 text-xs font-semibold text-white hover:bg-cereza/90"
                  >
                    Responder
                  </button>
                )}
                {/* Acciones para solicitadas (solicitante acepta/rechaza) */}
                {tab === "solicitadas" && c.estado === "enviada" && (
                  <>
                    <button
                      onClick={() => setModalAceptar(c)}
                      className="rounded-lg bg-hoja px-3 py-1.5 text-xs font-semibold text-white hover:bg-hoja/90"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => setModalRechazar(c)}
                      className="rounded-lg bg-cereza/15 px-3 py-1.5 text-xs font-semibold text-cereza hover:bg-cereza/25"
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {tab === "solicitadas" && c.estado === "solicitada" && (
                  <button
                    onClick={() => cancelarSolicitud(c.nro)}
                    className="rounded-lg border border-pizarra/20 px-3 py-1.5 text-xs font-semibold text-pizarra/60 hover:bg-crema"
                  >
                    Cancelar
                  </button>
                )}
                {c.pedido_nro && (
                  <Link
                    href="/panel"
                    className="rounded-lg bg-hoja/15 px-3 py-1.5 text-xs font-semibold text-hoja hover:bg-hoja/25"
                  >
                    Ver pedido #{c.pedido_nro}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
