/**
 * EstadoError — estado de error de carga / recurso no disponible.
 *
 * Implementa:
 *  - §63  MARKETPLACE — ERROR: título "No pudimos cargar los cafés" + texto
 *        "Vuelve a intentarlo o modifica los filtros." + botón [Reintentar].
 *  - §117 ERROR GLOBAL: título "Algo no cargó correctamente" + texto
 *        "Puedes volver a intentarlo sin perder tu información." + [Reintentar].
 *
 * Los valores por defecto corresponden al error global (§117). Las páginas
 * sobreescriben título/descripción (p. ej. §63) y enganchan onReintentar a su
 * propia función de recarga. Role="alert" hace que los lectores de pantalla
 * anuncien el fallo. El ícono es un SVG autocontenido (no se toca Icono.tsx).
 *
 * Uso (API):
 *  <EstadoError
 *    titulo="No pudimos cargar los cafés"
 *    descripcion="Vuelve a intentarlo o modifica los filtros."
 *    onReintentar={cargar}
 *  />
 */
"use client";

import type { ReactNode } from "react";

interface PropsEstadoError {
  /** Título del error. Por defecto §117: "Algo no cargó correctamente". */
  titulo?: string;
  /** Texto de apoyo. Por defecto: "Puedes volver a intentarlo…". */
  descripcion?: string;
  /** Etiqueta del botón. Por defecto: "Reintentar". */
  etiquetaCta?: string;
  /** Acción de reintento (botón). Se omite el CTA si nada se pasa aquí. */
  onReintentar?: () => void;
  /** Alternativa de CTA como enlace (compatible server components). */
  href?: string;
  /** Nivel de encabezado. Por defecto 3 (§63, §117). */
  nivel?: 2 | 3;
  /** Espacio para contenido extra. */
  children?: ReactNode;
  className?: string;
}

export function EstadoError({
  titulo = "Algo no cargó correctamente",
  descripcion = "Puedes volver a intentarlo sin perder tu información.",
  etiquetaCta = "Reintentar",
  onReintentar,
  href,
  nivel = 3,
  children,
  className = "",
}: PropsEstadoError) {
  const Heading = nivel === 2 ? "h2" : "h3";
  const clases = ["rce-error", className].filter(Boolean).join(" ");
  const tieneCta = Boolean(onReintentar || href);

  return (
    <div className={clases} role="alert">
      <style>{css}</style>

      <span className="rce-error__icono" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3.5 21 20H3z" />
          <path d="M12 9.5v5" />
          <path d="M12 17.5h.01" />
        </svg>
      </span>

      <Heading className="rce-error__titulo">{titulo}</Heading>

      {descripcion && <p className="rce-error__desc">{descripcion}</p>}

      {tieneCta &&
        (href ? (
          <a href={href} className="btn-primary rce-error__cta">
            {etiquetaCta}
          </a>
        ) : (
          <button type="button" onClick={onReintentar} className="btn-primary rce-error__cta">
            {etiquetaCta}
          </button>
        ))}

      {children}
    </div>
  );
}

const css = `
.rce-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 48px 24px;
  border: 1px solid var(--color-border-soft);
  border-radius: 0;
  background: var(--color-surface);
  text-align: center;
}
.rce-error__icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-danger) 12%, var(--color-surface));
  color: var(--color-danger);
}
.rce-error__icono svg {
  width: 26px;
  height: 26px;
}
.rce-error__titulo {
  margin: 0;
  font-family: var(--font-titulo);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
}
.rce-error__desc {
  margin: 8px 0 0;
  max-width: 46ch;
  color: var(--color-text-secondary);
}
.rce-error__cta {
  margin-top: 20px;
}
`;