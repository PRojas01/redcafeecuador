"use client";

/*
 Fotos de la portada: pase de fotos del héroe («Del grano a la taza») y collage
 de accesos. Antes los insertaba la capa propia (redcafe-v60-final.js) después
 de que React hidrataba, y la portada saltaba. Ahora salen en el HTML desde el
 principio; los estilos siguen en redcafe-v60-final.css (.rc-carrusel, .rc-collage).
*/
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const FOTOS: [string, string][] = [
  ["cereza", "Cereza madura"], ["secado", "Secado al sol"], ["pergamino", "Café pergamino"],
  ["verde", "Café verde"], ["tostado", "Tostado"], ["molido", "Molido"], ["taza", "En la taza"],
];

export function CarruselPortada() {
  const [n, setN] = useState(0);
  const t = useRef<ReturnType<typeof setInterval> | null>(null);
  const parar = useCallback(() => {
    if (t.current) clearInterval(t.current);
    t.current = null;
  }, []);
  const andar = useCallback(() => {
    parar();
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    t.current = setInterval(() => setN((x) => (x + 1) % FOTOS.length), 5000);
  }, [parar]);
  useEffect(() => {
    andar();
    return parar;
  }, [andar, parar]);

  return (
    <div className="relative aspect-video w-full">
      <div className="rc-carrusel" aria-roledescription="carrusel" aria-label="Del grano a la taza" onMouseEnter={parar} onMouseLeave={andar}>
        {FOTOS.map(([f, alt], i) => (
          <figure key={f} className={"rc-diapo" + (i === n ? " activa" : "")} aria-hidden={i !== n}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/img/proceso/${f}.webp`} alt={alt} width={800} height={500} decoding="async" loading={i === 0 ? "eager" : "lazy"} />
            <figcaption>{alt}</figcaption>
          </figure>
        ))}
        <div className="rc-puntos">
          {FOTOS.map(([f, alt], i) => (
            <button key={f} type="button" aria-label={`Ver foto: ${alt}`} aria-current={i === n ? "true" : undefined} onClick={() => { setN(i); andar(); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const ACCESOS: [string, string, string, string, string, string][] = [
  ["portada/vender", "Compra y vende café", "Directo con productores y compradores, sin comisiones", "Marketplace", "/marketplace/", "Café verde a la venta en un mercado"],
  ["portada/aprender", "Aprende a mejorar tu café", "Cursos gratis de cultivo, poscosecha y tueste", "Academia", "/academia/", "Manos con cerezas de café recién cosechadas"],
  ["portada/servicios", "Contrata servicios", "Catación, pilado, transporte y más", "Servicios", "/servicios/", "Trabajador cargando sacos de café"],
  ["portada/recetas", "Prepara mejor café en casa", "Recetas fáciles, paso a paso", "Recetas", "/recetas/", "Café de filtro preparado en casa"],
];

export function CollagePortada() {
  return (
    <section id="rc-collage" className="rc-collage" aria-label="Explora la Red">
      <div className="rc-collage-fila">
        {ACCESOS.map(([foto, titulo, sub, cta, href, alt]) => (
          <Link key={href} className="rc-collage-foto" href={href}>
            <span className="rc-collage-velo" aria-hidden="true" />
            <span className="rc-collage-titulo">
              <span className="rc-collage-t">{titulo}</span>
              <span className="rc-collage-sub">{sub}</span>
              <span className="rc-collage-cta">{cta} →</span>
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/img/${foto}.webp`} alt={alt} width={800} height={800} decoding="async" />
          </Link>
        ))}
      </div>
    </section>
  );
}
