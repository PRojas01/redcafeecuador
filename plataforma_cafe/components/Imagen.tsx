"use client";

// Sustituto de las láminas SVG: si el hueco (slot) tiene una imagen subida se muestra
// esa imagen con la misma proporción del catálogo (sin salto de layout); si no, la
// lámina de reserva. El catálogo de huecos se consulta UNA sola vez por página y se
// cachea en memoria a nivel de módulo (no una petición por imagen).

import { cloneElement, isValidElement, useEffect, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { CONFIG } from "@/lib/config";

export interface SlotInfo {
  id: string;
  nombre: string;
  proporcion: string;
  ancho_max: number;
  ambito: "plataforma" | "perfil" | "lote" | "local";
  lamina: string | null;
  peso_max_kb: number;
}

export interface MapImagenes {
  slots: Record<string, SlotInfo>;
  map: Record<string, string>;
  peso_max_kb: number;
}

let mapaCache: Promise<MapImagenes | null> | null = null;

function pedirMapa(): Promise<MapImagenes | null> {
  if (!mapaCache) {
    mapaCache = fetch(CONFIG.api("/api/imagenes.php?action=map"), { credentials: "omit" })
      .then((r) => (r.ok ? r.json().catch(() => null) : null))
      .then((j) => (j && typeof j === "object" && (j as { ok?: boolean }).ok ? (j as { data: MapImagenes }).data : null))
      .catch(() => null);
  }
  return mapaCache;
}

interface ImagenProps {
  slot: string;
  alt: string;
  lamina: ReactNode;
  recurso?: string;
  className?: string;
  style?: CSSProperties;
}

export default function Imagen({ slot, alt, lamina, recurso, className, style }: ImagenProps) {
  const [ocupacion, setOcupacion] = useState<{ url: string; info: SlotInfo | null } | null>(null);

  useEffect(() => {
    let vivo = true;
    const clave = recurso ? `${slot}:${recurso}` : slot;
    pedirMapa().then((d) => {
      if (!vivo || !d) return;
      const url = d.map[clave];
      if (url) setOcupacion({ url, info: d.slots[slot] ?? null });
    });
    return () => {
      vivo = false;
    };
  }, [slot, recurso]);

  if (ocupacion) {
    const anchoMax = ocupacion.info?.ancho_max ?? 1600;
    const partes = (ocupacion.info?.proporcion ?? "1:1").split(":");
    const ancho = parseFloat(partes[0] ?? "1") || 1;
    const alto = parseFloat(partes[1] ?? "1") || 1;
    const alturaAttr = Math.max(1, Math.round((anchoMax * alto) / ancho));
    return (
      <img
        src={CONFIG.api(ocupacion.url)}
        alt={alt}
        width={anchoMax}
        height={alturaAttr}
        className={className}
        style={{ ...style, aspectRatio: `${ancho} / ${alto}` }}
        loading="lazy"
      />
    );
  }

  // Primera renderización / hueco vacío: la lámina de reserva, con la misma clase
  // para que ocupe exactamente lo mismo que ocupará la imagen.
  if (isValidElement(lamina)) {
    const lama = lamina as ReactElement<{ className?: string; style?: CSSProperties }>;
    return cloneElement(lama, {
      className: [lama.props.className, className].filter(Boolean).join(" "),
      style: { ...(lama.props.style ?? {}), ...style },
    });
  }

  return <div className={className} style={style}>{lamina}</div>;
}