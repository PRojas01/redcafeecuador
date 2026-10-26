"use client";

/**
 * Acercamiento al cafetal — del plano general a la cereza.
 *
 * CÓMO FUNCIONA
 * No se anima el viewBox del SVG (eso obliga al navegador a recalcular el
 * trazado en cada fotograma y da tirones). Se anima una sola propiedad,
 * `transform`, que la GPU compone sin volver a pintar: el movimiento sale
 * fluido incluso en un teléfono de gama media.
 *
 * El origen de la transformación es el punto donde está la rama con los frutos
 * dentro de la lámina, así que el encuadre se cierra sobre las cerezas en vez
 * de sobre el centro geométrico. Si se recompone la lámina, hay que mover
 * también ese origen o el acercamiento apuntará a otro sitio.
 *
 * ACCESIBILIDAD
 * Con `prefers-reduced-motion` el movimiento no ocurre: se muestra el plano
 * general, quieto. Nadie con sensibilidad vestibular se lleva un acercamiento
 * de catorce segundos sin haberlo pedido.
 */

import { Cafetal } from "./Cafetal";

type Props = {
  className?: string;
  /** Segundos del recorrido completo. Por debajo de 10 se siente brusco. */
  duracion?: number;
  /** Cuánto se cierra el encuadre. 3.2 deja la cereza casi a pantalla. */
  acercamiento?: number;
};

/** Punto de la lámina donde vive la rama con frutos, en % del viewBox. */
const FOCO_X = 81.5;
const FOCO_Y = 50;

export function CafetalAnimado({
  className = "aspect-video w-full",
  duracion = 14,
  acercamiento = 3.2,
}: Props) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <style>{`
        @keyframes cafetal-acercar {
          0%   { transform: scale(1); }
          8%   { transform: scale(1.04); }
          72%  { transform: scale(${acercamiento}); }
          100% { transform: scale(${acercamiento}); }
        }
        .cafetal-camara {
          width: 100%;
          height: 100%;
          transform-origin: ${FOCO_X}% ${FOCO_Y}%;
          animation: cafetal-acercar ${duracion}s cubic-bezier(0.33, 0, 0.2, 1) infinite alternate;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .cafetal-camara { animation: none; }
        }
      `}</style>
      <div className="cafetal-camara">
        <Cafetal className="h-full w-full" />
      </div>
    </div>
  );
}
