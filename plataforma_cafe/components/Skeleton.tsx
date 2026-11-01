/**
 * Skeleton — componentes de carga por esqueleto.
 *
 * Implementa:
 *  - §62  MARKETPLACE — SKELETON: <div class="coffee-card skeleton">. Nunca dejar
 *        "Cargando catálogo…" como único estado visual durante varios segundos.
 *  - §116 LOADING: sustituir textos largos de carga por skeletons; pulso
 *        `animation: pulse 1.5s ease-in-out infinite`.
 *  - §18  TARJETAS: la tarjeta esqueleto replica la silueta visual de una
 *        CoffeeCard (§60/§61) a la espera de datos.
 *
 * Uso (API):
 *  - <Skeleton />                  → barra base (variante "linea", "titulo", "texto", "avatar").
 *  - <Skeleton variant="titulo" className="w-40" /> → bloque con ancho custom.
 *  - <SkeletonCard />              → una tarjeta café con silueta de CoffeeCard.
 *  - <SkeletonGrid cards={6} />    → grilla responsive de tarjetas; role="status"
 *                                    con etiqueta para lectores de pantalla.
 *
 * Sin dependencias nuevas. Colorea exclusivamente con tokens existentes
 * (--color-border-soft, --color-coffee-600, --color-surface). El CSS de este
 * componente vive aquí, no en globals.css. Respeta prefers-reduced-motion.
 */
import type { CSSProperties } from "react";

export type VarianteSkeleton = "linea" | "titulo" | "texto" | "avatar";

interface PropsSkeleton {
  variante?: VarianteSkeleton;
  className?: string;
  style?: CSSProperties;
}

/** Bloque único con pulso. Pensado para líneas, títulos, avatares y textos. */
export function Skeleton({
  variante = "linea",
  className = "",
  style,
}: PropsSkeleton) {
  const clases = ["rce-sk", `rce-sk--${variante}`, className].filter(Boolean).join(" ");
  return (
    <>
      <style>{css}</style>
      <span aria-hidden="true" className={clases} style={style} />
    </>
  );
}

/** Tarjeta esqueleto con la silueta de una CoffeeCard (§60/§61) sobre .card (§18). */
export function SkeletonCard({ className = "" }: { className?: string }) {
  const clases = ["rce-sk-card", className].filter(Boolean).join(" ");
  return (
    <div className={clases} aria-hidden="true">
      <style>{css}</style>
      <span className="rce-sk rce-sk--imagen" />
      <div className="rce-sk-card__cuerpo">
        <span className="rce-sk rce-sk--chip rce-sk-card__chip" />
        <span className="rce-sk rce-sk--titulo rce-sk-card__t1" />
        <span className="rce-sk rce-sk--linea rce-sk-card__l1" />
        <span className="rce-sk rce-sk--linea rce-sk-card__l2" />
        <div className="rce-sk-card__chips">
          <span className="rce-sk rce-sk--chip rce-sk-card__chip" />
          <span className="rce-sk rce-sk--chip rce-sk-card__chip" />
        </div>
        <span className="rce-sk rce-sk--boton" />
      </div>
    </div>
  );
}

interface PropsGrilla {
  /** Número de tarjetas a dibujar. */
  cards?: number;
  /** Texto anunciado por lectores de pantalla / aria-label. */
  etiqueta?: string;
  className?: string;
}

/** Grilla responsive de tarjetas esqueleto con anuncio de estado accesible. */
export function SkeletonGrid({
  cards = 6,
  etiqueta = "Cargando contenido…",
  className = "",
}: PropsGrilla) {
  const clases = ["rce-sk-grid", className].filter(Boolean).join(" ");
  return (
    <div role="status" aria-label={etiqueta} className={clases}>
      <style>{css}</style>
      <span className="rce-sr">{etiqueta}</span>
      {Array.from({ length: cards }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

const css = `
.rce-sk {
  display: inline-block;
  border-radius: 0;
  background: color-mix(in srgb, var(--color-border-soft) 82%, var(--color-coffee-600));
  animation: rce-pulse 1.5s ease-in-out infinite;
}
.rce-sk--linea { height: 14px; border-radius: 0; }
.rce-sk--texto { height: 13px; border-radius: 0; }
.rce-sk--titulo { height: 22px; border-radius: 0; }
.rce-sk--avatar { width: 44px; height: 44px; border-radius: 999px; }
.rce-sk--imagen { display: block; width: 100%; aspect-ratio: 16 / 10; border-radius: 0; }
.rce-sk--chip { height: 22px; width: 64px; border-radius: 999px; }
.rce-sk--boton { display: block; height: 40px; width: 100%; border-radius: 0; }
.rce-sk-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-border-soft);
  border-radius: 0;
  background: var(--color-surface);
}
.rce-sk-card__cuerpo { display: flex; flex-direction: column; gap: 12px; padding: 20px; }
.rce-sk-card__t1 { width: 64%; }
.rce-sk-card__l1 { width: 100%; }
.rce-sk-card__l2 { width: 42%; }
.rce-sk-card__chips { display: flex; gap: 8px; margin-top: 2px; }
.rce-sk-card__chips .rce-sk--chip:last-child { width: 80px; }
.rce-sk-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
.rce-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
  overflow: hidden;
  white-space: nowrap;
}
@keyframes rce-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.42; }
}
@media (prefers-reduced-motion: reduce) {
  .rce-sk { animation: none; }
}
`;