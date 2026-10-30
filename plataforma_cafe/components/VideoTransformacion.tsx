"use client";

/**
 * La transformación del café — video del héroe.
 *
 * Muestra el recorrido completo: cereza, fermentado, pergamino, café verde,
 * tostado, molido y taza. Es literalmente la cadena de valor del titular, y por
 * eso vive en la portada y no en una galería.
 *
 * POR QUÉ VIDEO Y NO GIF
 * Medido sobre este mismo material: un GIF de SEIS segundos a 480 px y 12 fps
 * pesa 888 KB. El MP4 completo —34 segundos, 960 px, 24 fps— pesa 1,5 MB. El GIF
 * costaría más del doble por la mitad de resolución, la mitad de fluidez y 256
 * colores con tramado. Un MP4 silenciado en bucle se comporta igual para quien
 * mira, y además se puede pausar.
 *
 * QUIÉN NO LO DESCARGA
 * · Quien pidió menos movimiento (`prefers-reduced-motion`): ve el póster quieto.
 * · Quien tiene el ahorro de datos activado: ve el póster y decide si lo carga.
 *   Un caficultor con datos contados no debe gastar megas en un fondo decorativo.
 * En ambos casos el póster ya cuenta la historia: son las cerezas maduras.
 */

import { useEffect, useRef, useState } from "react";

type Props = {
  className?: string;
  /** Ruta base para despliegues en subdirectorio. */
  base?: string;
};

export function VideoTransformacion({ className = "aspect-video w-full", base = "" }: Props) {
  const [cargar, setCargar] = useState(false);
  const [pedirPermiso, setPedirPermiso] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // `connection` no existe en todos los navegadores; si no está, se asume buena red.
    const con = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    const ahorroDatos = con?.saveData === true;
    const redLenta = con?.effectiveType === "slow-2g" || con?.effectiveType === "2g";

    if (menosMovimiento) return;             // póster quieto, sin botón
    if (ahorroDatos || redLenta) {
      setPedirPermiso(true);                 // póster + botón para cargarlo
      return;
    }
    setCargar(true);
  }, []);

  const poster = `${base}/video/transformacion-poster.webp`;

  return (
    <div className={`relative overflow-hidden bg-cafe ${className}`}>
      {cargar ? (
        <video
          ref={ref}
          className="h-full w-full object-cover"
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="La transformación del café ecuatoriano: de la cereza madura a la taza"
        >
          <source src={`${base}/video/transformacion.mp4`} type="video/mp4" />
        </video>
      ) : (
        <>
          <img
            src={poster}
            alt="Cerezas de café maduras sobre una mesa de madera, primer paso de la transformación"
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {pedirPermiso && (
            <button
              type="button"
              onClick={() => setCargar(true)}
              className="absolute inset-x-0 bottom-0 min-h-11 bg-cafe/90 px-3 py-2 text-xs font-semibold text-crema"
            >
              Ver la transformación en video · 1,5 MB
            </button>
          )}
        </>
      )}
    </div>
  );
}
