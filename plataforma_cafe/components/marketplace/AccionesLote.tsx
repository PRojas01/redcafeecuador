"use client";

// Acciones de un lote (tarjeta del listado y ficha). Antes las atendía la capa
// propia por delegación y escribía su aviso dentro del árbol de React.
import { useState } from "react";

/** Avisa a la API de que alguien preguntó por el lote (el dueño lo ve en su panel).
 *  keepalive: la petición sobrevive aunque el navegador se vaya a WhatsApp. */
export function registrarContacto(id: string) {
  if (!id) return;
  try {
    fetch("/api/lotes.php?action=contacto", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  } catch {
    /* sin red: no bloquea el contacto */
  }
}

/** «Solicitar este lote»: crea el pedido interno (api/pedidos.php?action=create),
 *  visible en la bandeja del productor y en «Mis pedidos» del comprador. */
export function BotonSolicitarLote({
  lote,
  finca,
  productor,
  precio,
  className,
}: {
  lote: string;
  finca: string;
  productor: string;
  precio: number;
  className: string;
}) {
  const [estado, setEstado] = useState<"listo" | "enviando" | "enviado">("listo");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  async function solicitar() {
    if (estado === "enviando") return;
    setEstado("enviando");
    setAviso(null);
    // Una respuesta que nunca llega no deja el botón en «Enviando...»: a los 15 s se corta.
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const vence = setTimeout(() => ctrl?.abort(), 15000);
    try {
      const res = await fetch("/api/pedidos.php?action=create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteId: lote, finca, productor, sacos: 1, total: precio || 0 }),
        signal: ctrl?.signal,
      });
      clearTimeout(vence);
      if (res.status === 401) {
        location.href = "/login/";
        return;
      }
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "No se pudo registrar la solicitud.");
      setEstado("enviado");
      setAviso({ ok: true, texto: "Pedido registrado. Lo verás en tu panel, en Mis pedidos." });
    } catch (err) {
      clearTimeout(vence);
      setEstado("listo");
      const e = err as Error;
      setAviso({
        ok: false,
        texto: e?.name === "AbortError" ? "La solicitud tardó demasiado. Revisa tu conexión e inténtalo de nuevo." : e?.message || "No se pudo registrar la solicitud.",
      });
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={solicitar} disabled={estado === "enviando"} aria-busy={estado === "enviando"}>
        {estado === "enviando" ? "Enviando..." : estado === "enviado" ? "Solicitud enviada" : "Solicitar este lote"}
      </button>
      {aviso && (
        <p className={"mt-2 text-xs font-semibold " + (aviso.ok ? "text-hoja" : "text-cereza")} role="status" data-redcafe-service-notice="1">
          {aviso.texto}
        </p>
      )}
    </>
  );
}
