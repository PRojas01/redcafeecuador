"use client";

/* Ficha del servicio de muestras de Legacy (análisis de café verde), con el
   mismo estilo que las fichas de los cursos de Legacy en la Academia: botón de
   WhatsApp a Legacy con «vengo de redcafeecuador.com» y la referencia, y
   WhatsApp de Red Café para asistencia. Los datos que la persona escribe aquí
   solo viajan en el mensaje de WhatsApp: no se guardan en la Red. */
import Link from "next/link";
import { useState } from "react";
import { CONFIG } from "@/lib/config";
import { MUESTRAS_LEGACY as M, VIDEOS_MUESTRAS, waMuestras, type DatosMuestra } from "@/lib/legacyMuestras";

const waRed = () =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent("Hola Red Café Ecuador, tengo una consulta sobre el servicio de análisis de muestras de café verde de Legacy.")}`;

function contarClic() {
  try {
    const cuerpo = JSON.stringify({ e: "legacy_clic", p: location.pathname });
    if (navigator.sendBeacon) navigator.sendBeacon(CONFIG.api("/api/metricas.php?action=evento"), new Blob([cuerpo], { type: "application/json" }));
  } catch { /* la medición nunca bloquea el enlace */ }
}

function Video({ id, titulo, dura }: { id: string; titulo: string; dura: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <figure className="redcafe-curso-video">
      <div className="redcafe-curso-video-marco">
        {abierto ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
            title={`Video: ${titulo}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" onClick={() => setAbierto(true)} aria-label={`Ver el video «${titulo}» (${dura})`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width={480} height={360} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
            <span className="redcafe-curso-video-play" aria-hidden="true">▶</span>
            <span className="redcafe-curso-video-dura" aria-hidden="true">{dura}</span>
          </button>
        )}
      </div>
      <figcaption>{titulo}</figcaption>
    </figure>
  );
}

function VideosEn({ en }: { en: string }) {
  const lista = VIDEOS_MUESTRAS.filter((v) => v.en === en);
  if (!lista.length) return null;
  return <div className="redcafe-curso-videos">{lista.map((v) => <Video key={v.id} {...v} />)}</div>;
}

function Solicitar({ datos, abajo }: { datos: DatosMuestra; abajo?: boolean }) {
  return (
    <aside className={"redcafe-curso-inscripcion" + (abajo ? " es-abajo" : "")} aria-label="Solicitar el análisis a Legacy">
      <p className="redcafe-curso-inscripcion-rotulo">{abajo ? "¿Listo para enviar tu muestra?" : "Servicio de pago · lo hace y lo cobra Legacy"}</p>
      <p>
        Escribe a Legacy por WhatsApp: tu mensaje ya dice que vienes de redcafeecuador.com
        {abajo ? " y lleva los datos de tu muestra que completaste en el paso 1" : ""}. Ellos te indican cómo y dónde entregar la muestra y la forma de pago.
      </p>
      <a className="redcafe-curso-inscripcion-boton" href={waMuestras(datos)} target="_blank" rel="noopener noreferrer" onClick={contarClic}>
        Solicitar análisis a Legacy <span aria-hidden="true">↗</span>
      </a>
      <p className="redcafe-curso-inscripcion-red">
        ¿Tienes dudas o necesitas ayuda con tu muestra? También te atiende Red Café Ecuador:{" "}
        <a href={waRed()} target="_blank" rel="noopener noreferrer">escribir a Red Café por WhatsApp <span aria-hidden="true">↗</span></a>
      </p>
    </aside>
  );
}

export default function FichaMuestras() {
  const [datos, setDatos] = useState<DatosMuestra>({});
  return (
    <section id="redcafe-servicio-muestras" className="redcafe-curso">
      <div className="redcafe-curso-wrap">
        <p className="redcafe-curso-rotulo">Servicio de laboratorio · por Legacy Academics</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="redcafe-curso-portada" src="/img/proceso/verde.webp" alt="" decoding="async" width={640} height={360} />
        <p className="redcafe-curso-costo-ficha es-pago">{M.precio} + impuestos</p>
        <h1 className="redcafe-curso-titulo">{M.nombre}</h1>
        <p className="redcafe-curso-desc">
          Envía 400 g de tu café en verde a Legacy: lo tuestan en tres curvas, lo catan y te entregan el puntaje, una
          recomendación de precio y recomendaciones para mejorar tu procesamiento. Además, tu muestra puede ir a Cafexporto para
          su cata y posible venta.
        </p>

        <Solicitar datos={datos} />

        <section className="redcafe-curso-oferta" aria-label="Precio y entregables">
          <h2>Precio y entregables</h2>
          <p className="redcafe-curso-oferta-precio"><strong>{M.precio}</strong><span> · {M.precioNota}</span></p>
          <h3>Recibes</h3>
          <ul className="redcafe-curso-oferta-lista es-check">
            {M.entregables.map((e) => <li key={e.titulo}><strong>{e.titulo}</strong>{e.detalle ? `: ${e.detalle}` : ""}</li>)}
          </ul>
          <h3>Condiciones</h3>
          <ul className="redcafe-curso-oferta-lista">
            {M.condiciones.map((c) => <li key={c}>{c}</li>)}
            <li>El envío de la muestra a Cafexporto lo paga el cliente.</li>
            <li>El servicio lo hace y lo cobra Legacy; el pago se acuerda directamente con ellos.</li>
          </ul>
        </section>

        <div className="redcafe-curso-obj">
          <h2>Cómo funciona, paso a paso</h2>
          <ul>
            <li>Completa los datos de tu muestra (paso 1).</li>
            <li>Prepara 400 g de café en verde trillado (paso 2).</li>
            <li>Escribe a Legacy por WhatsApp y entrega la muestra (paso 3).</li>
            <li>Legacy tuesta la muestra en 3 curvas y la evalúa (paso 4).</li>
            <li>Recibes tus resultados y, si quieres, tu muestra va a Cafexporto (paso 5).</li>
          </ul>
        </div>

        <section className="redcafe-modulo">
          <header>
            <p className="redcafe-modulo-num">Paso 1</p>
            <h3>Información necesaria para la recepción de la muestra</h3>
            <p className="redcafe-modulo-resumen">Escríbela aquí y viajará en tu mensaje de WhatsApp a Legacy. No se guarda en la Red.</p>
          </header>
          <form className="redcafe-muestra-form" onSubmit={(e) => e.preventDefault()}>
            {M.datos.map((c) => (
              <label key={c.id}>
                <span>{c.etiqueta}{c.opcional ? <em> (opcional)</em> : null}</span>
                <input
                  type="text"
                  name={c.id}
                  maxLength={120}
                  autoComplete="off"
                  placeholder={c.ayuda || undefined}
                  value={datos[c.id] || ""}
                  onChange={(e) => setDatos((d) => ({ ...d, [c.id]: e.target.value }))}
                />
              </label>
            ))}
          </form>
        </section>

        <section className="redcafe-modulo">
          <header>
            <p className="redcafe-modulo-num">Paso 2</p>
            <h3>Condiciones de la muestra</h3>
          </header>
          <ul className="redcafe-muestra-lista">
            {M.condiciones.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </section>

        <section className="redcafe-modulo">
          <header>
            <p className="redcafe-modulo-num">Paso 3</p>
            <h3>Solicita el servicio y entrega la muestra</h3>
            <p className="redcafe-modulo-resumen">
              Toca «Solicitar análisis a Legacy». El mensaje ya lleva tus datos, que vienes de redcafeecuador.com y la referencia
              del servicio. Legacy te confirma cómo y dónde entregar la muestra y el pago de {M.precio} más impuestos.
            </p>
          </header>
        </section>

        <section className="redcafe-modulo">
          <header>
            <p className="redcafe-modulo-num">Paso 4 · Proceso de evaluación</p>
            <h3>Tostado de la muestra</h3>
            <p className="redcafe-modulo-resumen">Se diseñan 3 curvas de tueste:</p>
          </header>
          <ul className="redcafe-muestra-curvas">
            {M.curvas.map((c) => <li key={c.titulo}><strong>{c.titulo}</strong><span>{c.detalle}</span></li>)}
          </ul>
          <VideosEn en="tostado" />
        </section>

        <section className="redcafe-modulo">
          <header>
            <p className="redcafe-modulo-num">Paso 5</p>
            <h3>Entregables</h3>
          </header>
          <ul className="redcafe-muestra-lista">
            {M.entregables.map((e) => <li key={e.titulo}><strong>{e.titulo}</strong>{e.detalle ? `. ${e.detalle}` : ""}</li>)}
          </ul>
        </section>

        <Solicitar datos={datos} abajo />

        <div className="redcafe-curso-pie">
          <Link className="btn-ghost" href="/servicios/">Volver a Servicios</Link>
        </div>
      </div>
    </section>
  );
}
