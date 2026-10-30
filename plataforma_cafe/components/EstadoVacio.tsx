/**
 * EstadoVacio — componente reutilizable de estado vacío.
 *
 * Implementa:
 *  - §64  MARKETPLACE — VACÍO: "No encontramos cafés con esos filtros" +
 *        "Prueba con otra provincia, variedad o proceso." + CTA [Limpiar filtros].
 *  - §77  BAR — ESTADO VACÍO: H2 + "Red Café Bar reúne historias…".
 *  - §80  ESTADO VACÍO COMUNIDAD: "Comparte algo con la Red" + CTA
 *        [Crear publicación].
 *  - §118 EMPTY STATE: patrón reutilizable [ICONO] Título Descripción [CTA].
 *
 * No lleva textos quemados: cada página pasa su contenido. Solo los textos que
 * el vigente proceso de afiliación debe limpiar se resuelven en la página que
 * lo usa. Se admite CTA como <a href> (navegación del lado servidor) o como
 * <button onClick> (acción cliente); el nivel de encabezado es configurable
 * (§77 pide H2, §80/§64 usan H3).
 *
 * Uso (API):
 *  <EstadoVacio
 *    icono="marketplace"
 *    titulo="No encontramos cafés con esos filtros"
 *    descripcion="Prueba con otra provincia, variedad o proceso."
 *    cta="Limpiar filtros"
 *    onCta={limpiarFiltros}
 *  />
 */
"use client";

import type { ReactNode } from "react";
import { Icono, type IconoNombre } from "./Icono";

interface PropsEstadoVacio {
  /** Texto del encabezado (requerido). */
  titulo: string;
  /** Texto de apoyo bajo el título. */
  descripcion?: string;
  /** Ícono de la biblioteca Icono (§118 pide [ICONO]). */
  icono?: IconoNombre;
  /** Etiqueta del botón de acción (CTA). */
  cta?: string;
  /** Si se pasa, el CTA es un <a href> (compatible con server components). */
  href?: string;
  /** Si se pasa, el CTA es un <button onClick>. */
  onCta?: () => void;
  /** Nivel del encabezado: 2 (§77) o 3 (§64, §80). Por defecto 3. */
  nivel?: 2 | 3;
  /** Espacio extra para contenido custom (p. ej. sugerencias de filtros). */
  children?: ReactNode;
  className?: string;
}

export function EstadoVacio({
  titulo,
  descripcion,
  icono,
  cta,
  href,
  onCta,
  nivel = 3,
  children,
  className = "",
}: PropsEstadoVacio) {
  const Heading = nivel === 2 ? "h2" : "h3";
  const clases = ["rce-empty", className].filter(Boolean).join(" ");

  return (
    <div className={clases}>
      <style>{css}</style>

      {icono && (
        <span className="rce-empty__icono" aria-hidden="true">
          <Icono nombre={icono} className="h-7 w-7" />
        </span>
      )}

      <Heading className="rce-empty__titulo">{titulo}</Heading>

      {descripcion && <p className="rce-empty__desc">{descripcion}</p>}

      {cta &&
        (href ? (
          <a href={href} className="btn-primary rce-empty__cta">
            {cta}
          </a>
        ) : (
          <button type="button" onClick={onCta} className="btn-primary rce-empty__cta">
            {cta}
          </button>
        ))}

      {children}
    </div>
  );
}

const css = `
.rce-empty {
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
.rce-empty__icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-gold-500) 14%, var(--color-surface));
  color: var(--color-gold-500);
}
.rce-empty__titulo {
  margin: 0;
  font-family: var(--font-titulo);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
}
.rce-empty__desc {
  margin: 8px 0 0;
  max-width: 46ch;
  color: var(--color-text-secondary);
}
.rce-empty__cta {
  margin-top: 20px;
}
`;