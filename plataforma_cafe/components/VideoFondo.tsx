"use client";

import { useEffect, useRef, useState } from "react";

/*
 Video de fondo en todo el sitio (antes lo añadía la capa propia después de
 cargar: redcafe-conversion.js · fondoVideo). Mismo comportamiento y mismo
 id/clases, así el CSS existente (#redcafe-video-fondo, .es-quieto) sigue valiendo:
 · silenciado, en bucle y playsinline, o el navegador no lo arranca;
 · con «ahorro de datos» o «menos movimiento»: solo el póster (43 KB);
 · se pausa al ocultar la pestaña;
 · versión ligera (259 KB): la portada conserva el original.
*/
export function VideoFondo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [quieto, setQuieto] = useState<boolean | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const ahorro = !!nav.connection?.saveData;
    const menosMov = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setQuieto(ahorro || !!menosMov);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || quieto !== false) return;
    const alArrancar = () => setQuieto(false);
    v.addEventListener("playing", alArrancar);
    v.play()?.catch(() => setQuieto(true));
    const alCambiar = () => {
      try { if (document.hidden) v.pause(); else v.play(); } catch { /* nada */ }
    };
    document.addEventListener("visibilitychange", alCambiar);
    return () => {
      v.removeEventListener("playing", alArrancar);
      document.removeEventListener("visibilitychange", alCambiar);
    };
  }, [quieto]);

  if (quieto === null) return null; // hasta saber las preferencias, nada

  return (
    <div
      id="redcafe-video-fondo"
      aria-hidden="true"
      className={quieto ? "es-quieto" : undefined}
      style={quieto ? { backgroundImage: "url('/video/transformacion-poster.webp')" } : undefined}
    >
      {!quieto && (
        <video
          ref={ref}
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          poster="/video/transformacion-poster.webp"
          src="/video/transformacion-fondo.mp4"
        />
      )}
    </div>
  );
}
