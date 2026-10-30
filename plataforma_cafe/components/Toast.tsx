/**
 * Toast — notificaciones breves de confirmación o error (§119).
 *
 * Implementa:
 *  - §119 TOAST: confirmaciones ("✓ Perfil actualizado", "✓ Café publicado",
 *        "✓ Mensaje enviado") y errores ("No pudimos guardar los cambios.").
 *        PROHIBIDO usar alert() del navegador: esto lo sustituye.
 *
 * - role/alocución correctos: role="status" + aria-live="polite" para éxito;
 *   role="alert" + aria-live="assertive" para error.
 * - Auto-cierre tras `duracion` ms (0 = persistir) y cierre con Escape.
 * - Posición inferior (por defecto) o superior, apilable con className propio.
 * - El hook useToast() ahorra el boilerplate de estado en las páginas.
 *
 * Uso (API):
 *  const { toast, mostrar, cerrar } = useToast();
 *  mostrar("success", "✓ Perfil actualizado");
 *  {toast && <Toast {...toast} onCerrar={cerrar} />}
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export type TipoToast = "success" | "error";

export interface DatosToast {
  tipo: TipoToast;
  mensaje: string;
}

interface PropsToast extends DatosToast {
  /** Cierra la notificación (necesario para auto-cierre, Escape y botón). */
  onCerrar: () => void;
  /** Milisegundos antes de auto-cierre. 0 = permanece abierto. Por defecto 4000. */
  duracion?: number;
  /** "abajo" (por defecto) o "arriba". */
  posicion?: "abajo" | "arriba";
  className?: string;
}

export function Toast({
  tipo,
  mensaje,
  onCerrar,
  duracion = 4000,
  posicion = "abajo",
  className = "",
}: PropsToast) {
  useEffect(() => {
    if (duracion <= 0) return;
    const t = window.setTimeout(onCerrar, duracion);
    return () => window.clearTimeout(t);
  }, [duracion, onCerrar]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  const esError = tipo === "error";
  const clases = ["rce-toast", `rce-toast--${posicion}`, `rce-toast--${tipo}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role={esError ? "alert" : "status"}
      aria-live={esError ? "assertive" : "polite"}
      className={clases}
    >
      <style>{css}</style>

      <span className="rce-toast__icono" aria-hidden="true">
        {esError ? <IconoError /> : <IconoOk />}
      </span>

      <p className="rce-toast__mensaje">{mensaje}</p>

      <button
        type="button"
        onClick={onCerrar}
        className="rce-toast__cerrar"
        aria-label="Cerrar notificación"
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
    </div>
  );
}

function IconoOk() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.3 2.3 4.8-5.1" />
    </svg>
  );
}

function IconoError() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/**
 * Gestión de estado para Toasts sin re-render innecesario.
 *
 *  const { toast, mostrar, cerrar } = useToast();
 *  mostrar("success", "✓ Café publicado");
 *  {toast && <Toast {...toast} onCerrar={cerrar} />}
 */
export function useToast() {
  const [toast, setToast] = useState<DatosToast | null>(null);

  const mostrar = useCallback((tipo: TipoToast, mensaje: string) => {
    setToast({ tipo, mensaje });
  }, []);

  const cerrar = useCallback(() => setToast(null), []);

  return { toast, mostrar, cerrar };
}

const css = `
.rce-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1300;
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(92vw, 420px);
  padding: 14px 16px;
  border: 1px solid var(--color-border-soft);
  border-radius: 0;
  background: var(--color-surface);
  box-shadow: 0 12px 32px rgba(61, 35, 20, 0.16);
  animation: rce-toast-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.rce-toast--abajo { bottom: 24px; }
.rce-toast--arriba { top: 24px; }
@media (max-width: 640px) {
  .rce-toast--abajo { bottom: 16px; }
  .rce-toast--arriba { top: 16px; }
}
.rce-toast__icono {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
}
.rce-toast--success .rce-toast__icono {
  background: color-mix(in srgb, var(--color-success) 14%, var(--color-surface));
  color: var(--color-success);
}
.rce-toast--error .rce-toast__icono {
  background: color-mix(in srgb, var(--color-danger) 14%, var(--color-surface));
  color: var(--color-danger);
}
.rce-toast__icono svg { width: 18px; height: 18px; }
.rce-toast__mensaje {
  flex: 1;
  margin: 0;
  color: var(--color-text-primary);
  font-size: 0.95rem;
  line-height: 1.4;
}
.rce-toast__cerrar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.rce-toast__cerrar:hover {
  background: color-mix(in srgb, var(--color-coffee-600) 10%, transparent);
  color: var(--color-text-primary);
}
.rce-toast__cerrar svg { width: 16px; height: 16px; }
@keyframes rce-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(12px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .rce-toast { animation: none; }
}
`;