"use client";

// Contenido editable de la plataforma.
// Fuente primaria: /api/contenido.php → public/data/contenido-*.json
// (editables desde WordPress vía plugin puente).
// Fallback: datos estáticos de lib/data.ts (sin API, o antes del despliegue).
import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "@/lib/config";

export type SeccionContenido = "noticias" | "cursos" | "planes" | "servicios" | "recetas";

export interface ContenidoResultado<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useContenido<T>(
  seccion: SeccionContenido,
  fallback: T[],
): ContenidoResultado<T> {
  const [items, setItems] = useState<T[]>(fallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // fallback estable: solo re-sincroniza si cambia la referencia del array.
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(CONFIG.api(`/api/contenido.php?action=list&seccion=${seccion}`), {
      credentials: "omit",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((j) => {
        const arr = Array.isArray(j?.[seccion]) ? (j[seccion] as unknown[]) : null;
        setItems(arr && arr.length > 0 ? (arr as T[]) : fallbackRef.current);
      })
      .catch(() => {
        // API no disponible → datos estáticos.
        setItems(fallbackRef.current);
      })
      .finally(() => setLoading(false));
  }, [seccion]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}