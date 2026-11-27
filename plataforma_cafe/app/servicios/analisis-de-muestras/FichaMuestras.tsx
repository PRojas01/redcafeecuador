"use client";

/* Ficha del servicio de muestras de Legacy (análisis de café verde), con el
   mismo estilo que las fichas de los cursos de Legacy en la Academia: botón de
   WhatsApp a Legacy con «vengo de redcafeecuador.com» y la referencia, y
   WhatsApp de Red Café para asistencia. Los datos que la persona escribe aquí
   solo viajan en el mensaje de WhatsApp: no se guardan en la Red. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { MUESTRAS_LEGACY as M, VIDEOS_MUESTRAS, faltantes, textoMuestras, waMuestras, type CampoMuestra, type DatosMuestra } from "@/lib/legacyMuestras";
import { descargar, fichaMuestraPng } from "@/lib/fichaMuestraImagen";

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

function AyudaRed() {
  return (
    <p className="redcafe-curso-inscripcion-red">
      ¿Tienes dudas o necesitas ayuda con tu muestra? También te atiende Red Café Ecuador:{" "}
      <a href={waRed()} target="_blank" rel="noopener noreferrer">escribir a Red Café por WhatsApp <span aria-hidden="true">↗</span></a>
    </p>
  );
}

/* Arriba: lleva al formulario (la solicitud necesita los datos). */
function IrASolicitud() {
  return (
    <aside className="redcafe-curso-inscripcion" aria-label="Solicitar el análisis a Legacy">
      <p className="redcafe-curso-inscripcion-rotulo">Servicio de pago · lo hace y lo cobra Legacy</p>
      <p>
        Completa los datos de tu muestra, tu contacto y la fecha de envío. Con eso se arma la ficha de recepción y el mensaje
        de WhatsApp a Legacy, que ya dice que vienes de redcafeecuador.com.
      </p>
      <a className="redcafe-curso-inscripcion-boton" href="#solicitud-muestra">
        Completar la solicitud <span aria-hidden="true">↓</span>
      </a>
      <AyudaRed />
    </aside>
  );
}

/* Paso 4: envía el WhatsApp con todos los datos y la ficha como imagen. */
function Enviar({ datos, onFalta }: { datos: DatosMuestra; onFalta: (f: CampoMuestra[]) => void }) {
  const [puedeCompartir, setPuedeCompartir] = useState(false);
  const [aviso, setAviso] = useState("");
  useEffect(() => {
    try {
      const f = new File(["x"], "x.png", { type: "image/png" });
      setPuedeCompartir(!!navigator.canShare && navigator.canShare({ files: [f] }));
    } catch { setPuedeCompartir(false); }
  }, []);
  const revisar = () => {
    const f = faltantes(datos);
    onFalta(f);
    if (f.length) setAviso("Falta completar: " + f.map((c) => c.etiqueta).join(", ") + ".");
    else setAviso("");
    return f.length === 0;
  };
  /* Valida; luego abre el WhatsApp con un enlace normal (pasa por el aviso de
     «Vas a salir de Red Café») y descarga la ficha para adjuntarla. */
  const enviar = () => {
    if (!revisar()) return;
    contarClic();
    const a = document.createElement("a");
    a.href = waMuestras(datos); a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); a.remove();
    fichaMuestraPng(datos).then(descargar).catch(() => {});
    setAviso("Se descargó la ficha. En el chat de Legacy toca el clip (📎) y adjunta la imagen antes de enviar.");
  };
  const compartir = async () => {
    if (!revisar()) return;
    try {
      const f = await fichaMuestraPng(datos);
      contarClic();
      await navigator.share({ files: [f], text: textoMuestras(datos) });
    } catch { /* la persona canceló */ }
  };
  const bajar = async () => { if (revisar()) descargar(await fichaMuestraPng(datos)); };
  return (
    <aside className="redcafe-curso-inscripcion es-abajo" aria-label="Enviar la solicitud a Legacy">
      <p className="redcafe-curso-inscripcion-rotulo">Envía tu solicitud</p>
      <p>
        El botón abre WhatsApp con Legacy (0963291887) con todos tus datos, que vienes de redcafeecuador.com y la referencia,
        y descarga la ficha de recepción como imagen para que la adjuntes en el mismo chat.
      </p>
      <button type="button" className="redcafe-curso-inscripcion-boton" onClick={enviar}>
        Enviar solicitud a Legacy por WhatsApp <span aria-hidden="true">↗</span>
      </button>
      <div className="redcafe-muestra-acciones">
        {puedeCompartir ? (
          <button type="button" onClick={compartir}>Compartir la ficha con los datos (elige el chat de Legacy)</button>
        ) : null}
        <button type="button" onClick={bajar}>Descargar solo la ficha</button>
      </div>
      {aviso ? <p className="redcafe-muestra-aviso" role="status">{aviso}</p> : null}
      <AyudaRed />
    </aside>
  );
}

function Campos({ lista, datos, poner, marcados }: { lista: CampoMuestra[]; datos: DatosMuestra; poner: (id: string, v: string) => void; marcados: Set<string> }) {
  const [hoy, setHoy] = useState("");
  useEffect(() => { setHoy(new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)); }, []);
  return (
    <div className="redcafe-muestra-form">
      {lista.map((c) => (
        <label key={c.id} className={marcados.has(c.id) ? "es-falta" : undefined}>
          <span>{c.etiqueta}{c.opcional ? <em> (opcional)</em> : null}</span>
          <input
            type={c.tipo || "text"}
            name={c.id}
            id={"muestra-" + c.id}
            maxLength={120}
            min={c.tipo === "date" ? hoy || undefined : undefined}
            required={!c.opcional}
            aria-invalid={marcados.has(c.id) || undefined}
            autoComplete={c.id === "nombre" ? "name" : c.id === "telefono" ? "tel" : c.id === "correo" ? "email" : "off"}
            inputMode={c.tipo === "tel" ? "tel" : undefined}
            placeholder={c.ayuda || undefined}
            value={datos[c.id] || ""}
            onChange={(e) => poner(c.id, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

export default function FichaMuestras() {
  const [datos, setDatos] = useState<DatosMuestra>({});
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const poner = (id: string, v: string) => {
    setDatos((d) => ({ ...d, [id]: v }));
    if (v.trim()) setMarcados((m) => { const n = new Set(m); n.delete(id); return n; });
  };
  const onFalta = (f: CampoMuestra[]) => {
    setMarcados(new Set(f.map((c) => c.id)));
    if (f.length) document.getElementById("muestra-" + f[0].id)?.focus();
  };
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

        <IrASolicitud />

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
            <li>Escribe tu contacto y la fecha en que enviarás la muestra (paso 3).</li>
            <li>Envía la solicitud por WhatsApp a Legacy con la ficha adjunta y entrega la muestra (paso 4).</li>
            <li>Legacy tuesta la muestra en 3 curvas y la evalúa (paso 5).</li>
            <li>Recibes tus resultados y, si quieres, tu muestra va a Cafexporto (paso 6).</li>
          </ul>
        </div>

        <form id="solicitud-muestra" className="redcafe-muestra-solicitud" onSubmit={(e) => e.preventDefault()} noValidate>
          <section className="redcafe-modulo">
            <header>
              <p className="redcafe-modulo-num">Paso 1</p>
              <h3>Información necesaria para la recepción de la muestra</h3>
              <p className="redcafe-modulo-resumen">Lo que escribas aquí va en tu mensaje de WhatsApp y en la ficha para Legacy. No se guarda en la Red.</p>
            </header>
            <Campos lista={M.datos} datos={datos} poner={poner} marcados={marcados} />
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
              <h3>Contacto y fecha de envío de la muestra</h3>
              <p className="redcafe-modulo-resumen">Para que Legacy te confirme la recepción y te escriba con los resultados.</p>
            </header>
            <Campos lista={M.contacto} datos={datos} poner={poner} marcados={marcados} />
          </section>

          <section className="redcafe-modulo">
            <header>
              <p className="redcafe-modulo-num">Paso 4</p>
              <h3>Envía la solicitud con la ficha y entrega la muestra</h3>
              <p className="redcafe-modulo-resumen">
                Legacy te confirma por WhatsApp dónde entregar la muestra y el pago de {M.precio} más impuestos.
              </p>
            </header>
            <Enviar datos={datos} onFalta={onFalta} />
          </section>
        </form>

        <section className="redcafe-modulo">
          <header>
            <p className="redcafe-modulo-num">Paso 5 · Proceso de evaluación</p>
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
            <p className="redcafe-modulo-num">Paso 6</p>
            <h3>Entregables</h3>
          </header>
          <ul className="redcafe-muestra-lista">
            {M.entregables.map((e) => <li key={e.titulo}><strong>{e.titulo}</strong>{e.detalle ? `. ${e.detalle}` : ""}</li>)}
          </ul>
        </section>

        <div className="redcafe-curso-pie">
          <Link className="btn-ghost" href="/servicios/">Volver a Servicios</Link>
        </div>
      </div>
    </section>
  );
}
