/**
 * Modal — diálogo overlay accesible para acciones puntuales (§120).
 *
 * Implementa:
 *  - §120 MODALES: solo para confirmaciones, acciones rápidas e información
 *        contextual. NUNCA para contenido principal (eso se hace en página).
 *
 * - Accesible: role="dialog" + aria-modal="true", aria-labelledby/
 *   aria-describedby al título/descripción, cierre con Escape, cierre al
 *   hacer clic en el backdrop, trampa de foco (Tab), foco inicial en el
 *   panel y devolución del foco al elemento previo al cerrar.
 * - Bloquea el scroll del body mientras está abierto.
 * - Se renderiza en document.body vía createPortal (react-dom, ya presente)
 *   para evitar contextos de apilamiento; nada depende del servidor.
 * - Colores exclusivamente con tokens existentes; prefer-reduced-motion
 *   respetado.
 *
 * Uso (API):
 *  <Modal
 *    abierto={confirmar}
 *    onCerrar={() => setConfirmar(false)}
 *    titulo="Confirmar publicación"
 *    descripcion="¿Publicar este café?"
 *    pie={<>
 *      <button className="btn-ghost" onClick={cerrar}>Cancelar</button>
 *      <button className="btn-primary" onClick={publicar}>Publicar</button>
 *    </>}
 *  >
 *    Contenido contextual…
 *  </Modal>
 */
"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export type AnchoModal = "sm" | "md" | "lg";

interface PropsModal {
  /** Controla visibilidad (componente controlado). */
  abierto: boolean;
  /** Callback para cerrar (Escape, backdrop, botón ×). */
  onCerrar: () => void;
  /** Título del diálogo (convierte en aria-labelledby). */
  titulo?: string;
  /** Subtítulo (convierte en aria-describedby). */
  descripcion?: string;
  /** Ancho máximo: "sm" | "md" (default) | "lg". */
  ancho?: AnchoModal;
  /** Etiqueta accesible cuando no hay título. */
  ariaLabel?: string;
  /** Muestra el botón × (default true). */
  mostrarCerrar?: boolean;
  /** Contenido contextual del diálogo. Opcional en confirmaciones simples. */
  children?: ReactNode;
  /** Pie con acciones (confirmar/cancelar). */
  pie?: ReactNode;
  className?: string;
}

const FOCUSABLES =
  'a[href], button:not([disabled]), input[type="text"], input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  ancho = "md",
  ariaLabel,
  mostrarCerrar = true,
  children,
  pie,
  className = "",
}: PropsModal) {
  const panelRef = useRef<HTMLDivElement>(null);
  const focoPrevioRef = useRef<HTMLElement | null>(null);
  const id = useId();

  useEffect(() => {
    if (!abierto) return;

    focoPrevioRef.current = document.activeElement as HTMLElement | null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const enfocar = window.setTimeout(() => panel?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCerrar();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const elementos = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLES));
      if (elementos.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(enfocar);
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener("keydown", onKey);
      focoPrevioRef.current?.focus();
    };
  }, [abierto, onCerrar]);

  if (!abierto || typeof document === "undefined") return null;

  const tituloId = titulo ? `${id}-titulo` : undefined;
  const descId = descripcion ? `${id}-desc` : undefined;

  return createPortal(
    <div className={`rce-modal ${className}`.trim()}>
      <style>{css}</style>
      <div className="rce-modal__backdrop" onClick={onCerrar} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-label={tituloId === undefined ? ariaLabel : undefined}
        aria-describedby={descId}
        tabIndex={-1}
        className={`rce-modal__panel rce-modal__panel--${ancho}`}
      >
        {titulo && (
          <h2 id={tituloId} className="rce-modal__titulo">
            {titulo}
          </h2>
        )}
        {descripcion && (
          <p id={descId} className="rce-modal__descripcion">
            {descripcion}
          </p>
        )}
        {mostrarCerrar && (
          <button
            type="button"
            className="rce-modal__x"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
        <div className="rce-modal__contenido">{children}</div>
        {pie && <div className="rce-modal__pie">{pie}</div>}
      </div>
    </div>,
    document.body
  );
}

const css = `
.rce-modal {
  position: fixed;
  inset: 0;
  z-index: 1100;
}
.rce-modal__backdrop {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--color-coffee-950) 55%, transparent);
  animation: rce-fade 0.22s ease-out both;
}
.rce-modal__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  width: min(calc(100vw - 32px), 480px);
  max-height: min(86vh, 720px);
  overflow: auto;
  padding: 28px 24px;
  border: 1px solid var(--color-border-soft);
  border-radius: 0;
  background: var(--color-surface);
  box-shadow: 0 24px 64px rgba(36, 23, 17, 0.28);
  outline: none;
  animation: rce-zoom 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.rce-modal__panel--sm { width: min(calc(100vw - 32px), 340px); }
.rce-modal__panel--lg { width: min(calc(100vw - 32px), 720px); }
@media (max-width: 640px) {
  .rce-modal__panel { padding: 24px 18px; }
}
.rce-modal__titulo {
  margin: 0 40px 0 0;
  font-family: var(--font-titulo);
  font-size: 1.45rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
}
.rce-modal__descripcion {
  margin: 8px 0 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
.rce-modal__x {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.rce-modal__x:hover {
  background: color-mix(in srgb, var(--color-coffee-600) 10%, transparent);
  color: var(--color-text-primary);
}
.rce-modal__x svg { width: 18px; height: 18px; }
.rce-modal__contenido {
  margin-top: 14px;
  color: var(--color-text-secondary);
  font-size: 0.975rem;
  line-height: 1.65;
}
.rce-modal__pie {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
@keyframes rce-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes rce-zoom {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .rce-modal__backdrop,
  .rce-modal__panel { animation: none; }
}
`;