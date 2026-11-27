"use client";

/*
 Ficha de un curso de la Academia con sus lecciones. Antes la pintaba la capa
 propia (redcafe-academia.js · montarVisor): ocultaba la ficha de React y ponía
 la suya cuando llegaba /api/cursos.php. Ahora es una sola versión, aquí.
 Mientras llega la API se ve lo que ya trae el sitio (título, descripción y
 temario); luego se completa con las lecciones, el avance y la matrícula.
 Los estilos son los de siempre (.redcafe-curso-* en redcafe-v60-final.css).
*/
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { CLASE_DEMO, proximaClase, type ClaseDemo } from "@/lib/claseDemo";
import { CONDICIONES_LEGACY, MOSTRAR_DESCUENTOS, OFERTA_LEGACY, WHATSAPP_LEGACY, hoyEcuador } from "@/lib/legacyOferta";
import { FOTOS_CURSOS } from "@/lib/fotos";

type Bloque = {
  tipo?: string; titulo?: string; texto?: string; url?: string; alt?: string; pie?: string;
  descripcion?: string; columnas?: string[]; filas?: string[][]; codigo?: string;
};
type Leccion = { titulo?: string; contenido?: string; bloques?: Bloque[] };
type Modulo = { titulo?: string; minutos?: number; resumen?: string; ejercicio?: string; lecciones?: Leccion[] };
type Material = { tipo?: string; url?: string; titulo?: string; nota?: string };
export type CursoVisor = {
  id: string; titulo?: string; nivel?: string; duracion?: string; categoria?: string; descripcion?: string;
  autor?: string; autor_id?: string; publico?: boolean; introduccion?: string; objetivos?: string[];
  modulos?: Modulo[]; materiales?: Material[]; materiales_count?: number; recursos?: string[]; cierre?: string;
};
type Datos = {
  curso: CursoVisor; total: number; completadas: string[]; acceso_concedido?: boolean; matriculado?: boolean;
  puede_editar?: boolean; mi_solicitud?: string; acceso?: string; ficha_abierta?: boolean;
};
type Estado = { texto: string; tipo: "" | "is-ok" | "is-error" };

/* Portada propia de cada curso (las mismas de redcafeecuador.com), servidas desde
   /img/academia/cursos/; si un curso nuevo no tiene, se usa la de su categoría. */
const PORTADAS_POR_CURSO: Record<string, string> = {
  "buenas-practicas": "/img/academia/cursos/buenas-practicas.webp",
  "cafe-de-especialidad-de-la-finca-a-la-taza": "/img/academia/cursos/cafe-de-especialidad-de-la-finca-a-la-taza.webp",
  "cafe-especial": "/img/academia/cursos/cafe-especial.webp",
  "exportacion": "/img/academia/cursos/exportacion.webp",
  "formalizacion": "/img/academia/cursos/formalizacion.webp",
  "legacy-barismo-profesional": "/img/academia/cursos/legacy-barismo-profesional.webp",
  "legacy-barista-avanzado": "/img/academia/cursos/legacy-barista-avanzado.webp",
  "legacy-barista-en-casa": "/img/academia/cursos/legacy-barista-en-casa.webp",
  "manejo-plagas": "/img/academia/cursos/manejo-plagas.webp",
  "postcosecha": "/img/academia/cursos/postcosecha.webp",
  "trazabilidad": "/img/academia/cursos/trazabilidad.webp",
  "tueste": "/img/academia/cursos/tueste.webp",
  "ventas-comercial": "/img/academia/cursos/ventas-comercial.webp",
};

const PORTADAS: Record<string, string> = {
  produccion: "/img/academia/produccion.webp",
  postcosecha: "/img/academia/postcosecha.webp",
  calidad: "/img/academia/certificacion.webp",
  comercial: "/img/academia/comercial.webp",
  administrativo: "/img/academia/capacitacion.webp",
  barismo: "/img/academia/barismo-taza.webp",
  legal: "/img/academia/certificacion.webp",
  general: "/img/academia/basico.webp",
};
const PRECIOS: Record<string, string> = Object.fromEntries(Object.entries(OFERTA_LEGACY).map(([k, o]) => [k, o.precio]));
/* Cursos de pago de Legacy: la ficha es pública y completa, sin cuenta en la
   Red. El botón abre WhatsApp con un mensaje que ya dice que la persona llega
   de redcafeecuador.com (y la referencia del curso), para que Legacy la
   identifique; cada clic se cuenta en las métricas propias (sin datos personales). */
const waLegacy = (titulo: string, id: string) =>
  `https://wa.me/${WHATSAPP_LEGACY}?text=${encodeURIComponent(
    `Hola Legacy, vengo de redcafeecuador.com. Quiero inscribirme en el curso «${titulo}». ¿Me informan de fechas disponibles, cupos, promociones y formas de pago?\n\nRef.: Red Café Ecuador · academia/${id}`,
  )}`;
/* WhatsApp de Red Café Ecuador para asistencia y consultas sobre el curso. */
const waRed = (titulo: string) =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(`Hola Red Café Ecuador, tengo una consulta sobre el curso «${titulo}» de Legacy.`)}`;
function contarClicLegacy() {
  try {
    const cuerpo = JSON.stringify({ e: "legacy_clic", p: location.pathname });
    if (navigator.sendBeacon) navigator.sendBeacon(CONFIG.api("/api/metricas.php?action=evento"), new Blob([cuerpo], { type: "application/json" }));
  } catch { /* la medición nunca bloquea el enlace */ }
}

/* Videos del canal de YouTube de Legacy Academy (@LEGACYACADEMYDM) que
   corresponden a cada curso. Se muestra solo la miniatura; el reproductor
   (youtube-nocookie) se carga al tocarla. */
type VideoLegacy = { id: string; titulo: string; dura: string; en: string };
/* «en» dice dónde va cada video dentro del contenido: "intro", "objetivos",
   "oferta" (precios y fechas) o "leccion:<módulo>:<lección>" (desde 0). */
const VIDEOS_LEGACY: Record<string, VideoLegacy[]> = {
  "legacy-barista-en-casa": [
    { id: "HQgwiUl-yTI", titulo: "Los cursos que ofrece Legacy", dura: "0:40", en: "intro" },
    { id: "OgruUffbTac", titulo: "La importancia de ser barista", dura: "1:21", en: "objetivos" },
    { id: "mlQO_dd-SIo", titulo: "Barista en Casa", dura: "0:53", en: "leccion:0:0" },
  ],
  "legacy-barismo-profesional": [
    { id: "Io2ReJQbHW4", titulo: "Cuánto dura Barista Pro", dura: "1:03", en: "oferta" },
    { id: "nb5WmcxGrE4", titulo: "Barista Pro", dura: "0:56", en: "leccion:0:0" },
    { id: "6qmvy-QLvjo", titulo: "Horas de práctica en barra", dura: "1:22", en: "leccion:2:1" },
  ],
  "legacy-barista-avanzado": [
    { id: "VFvgbxEdXEE", titulo: "Barista Avanzado", dura: "1:10", en: "leccion:0:0" },
    { id: "56Spbktim1I", titulo: "Horas de práctica de Barista Avanzado", dura: "0:59", en: "leccion:6:0" },
  ],
};

function VideoDiferido({ v }: { v: VideoLegacy }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <figure className="redcafe-curso-video">
      <div className="redcafe-curso-video-marco">
        {abierto ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1`}
            title={`Video: ${v.titulo}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" onClick={() => setAbierto(true)} aria-label={`Ver el video «${v.titulo}» (${v.dura})`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width={480} height={360} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
            <span className="redcafe-curso-video-play" aria-hidden="true">▶</span>
            <span className="redcafe-curso-video-dura" aria-hidden="true">{v.dura}</span>
          </button>
        )}
      </div>
      <figcaption>{v.titulo}</figcaption>
    </figure>
  );
}

/* Videos de Legacy Academy (YouTube) que van en este punto del contenido. */
function VideosEn({ curso, en }: { curso: string; en: string }) {
  const lista = (VIDEOS_LEGACY[curso] || []).filter((v) => v.en === en);
  if (!lista.length) return null;
  return <div className="redcafe-curso-videos">{lista.map((v) => <VideoDiferido key={v.id} v={v} />)}</div>;
}

/* Al inicio de la ficha: horas de teoría y práctica, y qué incluye. */
function ResumenLegacy({ id }: { id: string }) {
  const o = OFERTA_LEGACY[id];
  if (!o) return null;
  return (
    <section className="redcafe-curso-resumen" aria-label="Qué incluye el curso">
      <ul className="redcafe-curso-horas">
        {o.horas.map((h) => (
          <li key={h.etiqueta}>
            <span className="redcafe-curso-horas-etq">{h.etiqueta}</span>
            <strong>{h.valor}</strong>
            {h.detalle ? <span className="redcafe-curso-horas-det">{h.detalle}</span> : null}
          </li>
        ))}
      </ul>
      <p className="redcafe-curso-resumen-rot">Incluye</p>
      <ul className="redcafe-curso-incluye">{o.incluye.map((x) => <li key={x}>{x}</li>)}</ul>
    </section>
  );
}

/* Precio, qué incluye, fechas disponibles y condiciones de un curso de Legacy. */
function OfertaLegacyVista({ id }: { id: string }) {
  const o = OFERTA_LEGACY[id];
  const [hoy, setHoy] = useState("");
  useEffect(() => { setHoy(hoyEcuador()); }, []);
  if (!o) return null;
  const fechas = o.fechas.filter((f) => !f.agotado && (!hoy || f.fin >= hoy));
  const grupos = Array.from(new Set(fechas.map((f) => f.grupo)));
  const hayDescuentos = o.descuentos.length > 0 || o.opciones.some((x) => x.descuento);
  return (
    <section className="redcafe-curso-oferta" aria-label="Precio, fechas y condiciones">
      <h2>Precio, fechas y condiciones</h2>
      <p className="redcafe-curso-oferta-precio"><strong>{o.precio}</strong>{o.precioNota ? <span> · {o.precioNota}</span> : null}</p>
      {MOSTRAR_DESCUENTOS && o.descuentos.length ? <ul className="redcafe-curso-oferta-lista">{o.descuentos.map((d) => <li key={d}>{d}</li>)}</ul> : null}
      {!MOSTRAR_DESCUENTOS && hayDescuentos ? <p className="redcafe-curso-oferta-aviso">{CONDICIONES_LEGACY.avisoDescuentos}</p> : null}
      <VideosEn curso={id} en="oferta" />
      <h3>Fechas disponibles</h3>
      {fechas.length ? grupos.map((g) => (
        <div key={g} className="redcafe-curso-oferta-grupo">
          <p className="redcafe-curso-oferta-mes">{g}</p>
          <ul className="redcafe-curso-oferta-fechas">
            {fechas.filter((f) => f.grupo === g).map((f) => (
              <li key={`${f.lugar}-${f.modalidad}-${f.cuando}`}>
                <strong>{f.lugar} · {f.modalidad}</strong>
                <span>{f.cuando}</span>
              </li>
            ))}
          </ul>
        </div>
      )) : <p>{o.sinFechas || "Escribe a Legacy para conocer la próxima fecha."}</p>}
      {o.opciones.length ? (
        <>
          <h3>Otras opciones</h3>
          <ul className="redcafe-curso-oferta-opciones">
            {o.opciones.map((x) => (
              <li key={x.titulo}>
                <strong>{x.titulo}</strong>
                <span className="es-precio">{x.precio}</span>
                <span>{x.detalle}{MOSTRAR_DESCUENTOS && x.descuento ? ` ${x.descuento}` : ""}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h3>Condiciones</h3>
      <ul className="redcafe-curso-oferta-lista">
        {MOSTRAR_DESCUENTOS ? <li>{CONDICIONES_LEGACY.reserva}</li> : null}
        <li>{CONDICIONES_LEGACY.universitaria}</li>
        <li>El curso lo dicta y lo cobra Legacy; el pago se acuerda directamente con ellos.</li>
      </ul>
    </section>
  );
}

function InscripcionLegacy({ titulo, id, abajo }: { titulo: string; id: string; abajo?: boolean }) {
  return (
    <aside className={"redcafe-curso-inscripcion" + (abajo ? " es-abajo" : "")} aria-label="Inscripción con Legacy">
      <p className="redcafe-curso-inscripcion-rotulo">{abajo ? "¿Te interesa este curso?" : "Curso de pago · lo dicta y lo cobra Legacy"}</p>
      <p>Escribe a Legacy por WhatsApp: tu mensaje ya dice que vienes de redcafeecuador.com y ellos te confirman fechas, cupos y formas de pago.</p>
      <a className="redcafe-curso-inscripcion-boton" href={waLegacy(titulo, id)} target="_blank" rel="noopener noreferrer" onClick={contarClicLegacy}>
        Solicitar inscripción a Legacy <span aria-hidden="true">↗</span>
      </a>
      <p className="redcafe-curso-inscripcion-red">
        ¿Tienes dudas o necesitas ayuda con el curso? También te atiende Red Café Ecuador:{" "}
        <a href={waRed(titulo)} target="_blank" rel="noopener noreferrer">escribir a Red Café por WhatsApp <span aria-hidden="true">↗</span></a>
      </p>
    </aside>
  );
}

async function pedir(url: string, cuerpo?: unknown) {
  const r = await fetch(CONFIG.api(url), cuerpo === undefined
    ? { credentials: "include", cache: "no-store" }
    : { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  return r.json().catch(() => null);
}

/* Párrafos y listas de pasos: una línea por paso («• », «- » o «* »). */
function Parrafos({ texto }: { texto?: string }) {
  return (
    <>
      {String(texto || "").split(/\n\n+/).map((trozo, i) => {
        const lineas = trozo.split(/\n/).map((l) => l.trim()).filter(Boolean);
        if (lineas.length > 1 && lineas.every((l) => /^[•\-*]\s+/.test(l))) {
          return <ul key={i} className="redcafe-bloque-lista">{lineas.map((l, j) => <li key={j}>{l.replace(/^[•\-*]\s+/, "")}</li>)}</ul>;
        }
        return <p key={i}>{lineas.join(" ")}</p>;
      })}
    </>
  );
}

function BloqueVista({ b }: { b: Bloque }) {
  const titulo = b.titulo ? <h5 className="redcafe-bloque-titulo">{b.titulo}</h5> : null;
  if (b.tipo === "texto") return <div className="redcafe-bloque">{titulo}<Parrafos texto={b.texto} /></div>;
  if (b.tipo === "imagen") {
    return (
      <figure className="redcafe-bloque redcafe-bloque-imagen">
        {titulo}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.url} alt={b.alt || ""} loading="lazy" decoding="async" />
        {b.pie ? <figcaption>{b.pie}</figcaption> : null}
      </figure>
    );
  }
  if (b.tipo === "enlace") {
    return (
      <div className="redcafe-bloque redcafe-bloque-enlace">
        <a href={b.url} target="_blank" rel="noreferrer noopener">
          <strong>{b.titulo || "Documento"}</strong>
          {b.descripcion ? <span>{b.descripcion}</span> : null}
        </a>
      </div>
    );
  }
  if (b.tipo === "tabla") {
    const columnas = Array.isArray(b.columnas) ? b.columnas : [];
    const filas = Array.isArray(b.filas) ? b.filas : [];
    if (!columnas.length || !filas.length) return null;
    return (
      <div className="redcafe-bloque redcafe-bloque-tabla">
        {titulo}
        <div className="redcafe-tabla-wrap">
          <table>
            <thead><tr>{columnas.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i}>{columnas.map((c, j) => <td key={j} data-label={c}>{(Array.isArray(fila) ? fila : [])[j] || ""}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        {b.pie ? <p className="redcafe-bloque-pie">{b.pie}</p> : null}
      </div>
    );
  }
  if (b.tipo === "video" || b.tipo === "documento") {
    return (
      <div className="redcafe-bloque redcafe-bloque-embed">
        {titulo}
        <div className={"redcafe-embed" + (b.tipo === "documento" ? " es-documento" : "")}>
          <iframe
            src={b.url}
            loading="lazy"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            title={b.titulo || (b.tipo === "video" ? "Vídeo del curso" : "Documento del curso")}
          />
        </div>
        {b.descripcion ? <p className="redcafe-bloque-pie">{b.descripcion}</p> : null}
      </div>
    );
  }
  if (b.tipo === "codigo") return <div className="redcafe-bloque redcafe-bloque-codigo">{titulo}<pre><code>{b.codigo}</code></pre></div>;
  return null;
}

function BarraAvance({ hechas, total }: { hechas: number; total: number }) {
  const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
  return (
    <div className="redcafe-avance" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del curso">
      <div className="redcafe-avance-barra"><span style={{ width: `${pct}%` }} /></div>
      <p className="redcafe-avance-texto"><strong>{pct} %</strong> · {hechas} de {total} lecciones</p>
    </div>
  );
}

/* Aviso de la clase demostrativa al inicio del curso; la burbuja enlaza aquí. */
export function ClaseDemoCurso({ clase }: { clase: ClaseDemo }) {
  // La fecha se calcula tras hidratar: el HTML estático no la trae (cambia sola).
  const [fecha, setFecha] = useState("");
  useEffect(() => { setFecha(proximaClase()); }, []);
  return (
    <aside id="clase-demostrativa" className="redcafe-clase-demo-curso" aria-label="Clase demostrativa de barismo">
      <p className="redcafe-clase-demo-rotulo">{clase.rotulo}</p>
      {fecha ? <p className="redcafe-clase-demo-fecha">📅 Próxima clase: <strong>{fecha}</strong></p> : null}
      <p className="redcafe-clase-demo-modalidad">{clase.modalidad}</p>
      {clase.parrafos.map((t, i) => <p key={i} className={i === 0 ? "es-saludo" : undefined}>{t}</p>)}
      <p>{clase.antesDelBoton}</p>
      <p>
        <a className="redcafe-clase-demo-boton" href={clase.href} target="_blank" rel="noopener noreferrer">
          {clase.boton} <span aria-hidden="true">↗</span>
        </a>
      </p>
      <p className="redcafe-clase-demo-nota">💬 {clase.nota}</p>
      {clase.despues.map((t, i) => <p key={i}>{t}</p>)}
    </aside>
  );
}

function AvisoReferencial() {
  return (
    <aside className="redcafe-aviso-referencial" role="note">
      <strong>Información referencial</strong>
      <p>Este curso es material de orientación general para el café ecuatoriano. No sustituye la asistencia técnica, agronómica, legal, contable ni sanitaria de un profesional que conozca tu finca o tu negocio. Las condiciones de suelo, clima, variedad, mercado y normativa cambian de un sitio a otro y con el tiempo.</p>
      <p>Aplicar lo aquí descrito y los resultados que se obtengan son responsabilidad de quien lo aplica. Antes de invertir, fumigar, certificar, exportar o firmar, consulta con un técnico y con la entidad competente (MAG, Agrocalidad, SRI, aduana, según el caso).</p>
    </aside>
  );
}

function Esqueleto() {
  return (
    <div className="redcafe-curso-wrap redcafe-skeleton" role="status" aria-label="Abriendo el curso">
      <span className="redcafe-skeleton-bloque redcafe-skeleton-linea corta" />
      <span className="redcafe-skeleton-bloque redcafe-skeleton-portada" />
      <span className="redcafe-skeleton-bloque redcafe-skeleton-linea titulo" />
      <span className="redcafe-skeleton-bloque redcafe-skeleton-linea intro" />
      <span className="redcafe-skeleton-bloque redcafe-skeleton-linea media" />
      <div className="redcafe-skeleton-lista">
        <span className="redcafe-skeleton-bloque redcafe-skeleton-linea" />
        <span className="redcafe-skeleton-bloque redcafe-skeleton-linea" />
        <span className="redcafe-skeleton-bloque redcafe-skeleton-linea media" />
      </div>
    </div>
  );
}

const CONSENTIMIENTO = (accion: string) => (
  <p className="redcafe-curso-consentimiento">
    Al {accion}, quien creó el curso (y las personas asociadas al curso, si las tiene) verá tu nombre, tu avance y tus datos de contacto.{" "}
    <a href="/politica-de-uso-de-datos/" target="_blank" rel="noreferrer">Ver política de uso de datos</a>.
  </p>
);

/** id: el del curso; null = leerlo de la dirección (cursos creados después del build). */
export function VisorCurso({ id: idFijo, inicial, respaldo }: { id: string | null; inicial?: CursoVisor; respaldo?: React.ReactNode }) {
  const [id, setId] = useState<string | null>(idFijo);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [fallo, setFallo] = useState(false);
  const [estado, setEstado] = useState<Estado>({ texto: "", tipo: "" });
  const [matriculando, setMatriculando] = useState<"" | "enviando" | "pedida">("");
  const [solicitando, setSolicitando] = useState(false);

  useEffect(() => {
    if (idFijo) return;
    const m = location.pathname.match(/^\/academia\/([^/]+)\/?$/);
    const desdeRuta = m ? decodeURIComponent(m[1]) : "";
    if (desdeRuta && desdeRuta !== "curso") setId(desdeRuta);
    else setFallo(true);
  }, [idFijo]);

  const cargar = useCallback(async () => {
    if (!id) return null;
    const res = await pedir(`/api/cursos.php?action=get&id=${encodeURIComponent(id)}`).catch(() => null);
    if (!res || !res.ok || !res.data || !res.data.curso || !res.data.total) { setFallo(true); return null; }
    setDatos(res.data as Datos);
    return res.data as Datos;
  }, [id]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Cursos de Legacy: el inicio de la ficha sale al momento de su oferta, sin
  // esperar a la API (antes se veía el esqueleto y luego saltaba todo).
  const ofertaInicial = id && OFERTA_LEGACY[id] ? { id, categoria: "barismo", ...OFERTA_LEGACY[id].ficha } : undefined;
  const c: CursoVisor | undefined = datos?.curso ?? inicial ?? ofertaInicial;
  const usarRespaldo = fallo && !datos && !!respaldo;
  useEffect(() => {
    if (usarRespaldo) return;
    if (c?.titulo) document.title = `${c.titulo} · Academia · Red Café Ecuador`;
  }, [c?.titulo, usarRespaldo]);

  if (usarRespaldo) return <>{respaldo}</>;

  if (!c) {
    return (
      <section className={fallo ? "redcafe-curso-esperando" : "redcafe-curso-esperando"} role="status" aria-live="polite">
        {fallo ? (
          <>
            <p>No pudimos abrir este curso. Puede que ya no esté disponible.</p>
            <Link href="/academia/">Volver a la Academia</Link>
          </>
        ) : <Esqueleto />}
      </section>
    );
  }

  const completadas = datos?.completadas ?? [];
  const total = datos?.total ?? 0;
  const puedeCompletar = !!datos && datos.acceso_concedido !== false && !!(datos.matriculado || datos.puede_editar);
  const precio = PRECIOS[c.id];
  const deAliado = !!precio || !!datos?.ficha_abierta;
  const portada = FOTOS_CURSOS[c.id]?.src || PORTADAS_POR_CURSO[c.id] || PORTADAS[c.categoria || "general"] || PORTADAS.general;

  const completar = async (mi: number, li: number, hecho: boolean) => {
    // Se marca al momento y se deshace si el servidor no lo guarda.
    const clave = `${c.id}::${mi}::${li}`;
    const poner = (si: boolean) => setDatos((d) => d ? { ...d, completadas: si ? [...d.completadas.filter((k) => k !== clave), clave] : d.completadas.filter((k) => k !== clave) } : d);
    poner(hecho);
    const res = await pedir("/api/cursos.php?action=completar", { curso: c.id, modulo: mi, leccion: li, hecho }).catch(() => null);
    if (res && res.ok && res.data) {
      setDatos((d) => (d ? { ...d, completadas: res.data.completadas, total: res.data.total } : d));
      setEstado({ texto: "", tipo: "" });
    } else {
      poner(!hecho);
      setEstado({
        texto: res?.error === "No autenticado." ? "Crea tu perfil gratis para guardar tu avance." : res?.error || "No se pudo guardar tu avance.",
        tipo: "is-error",
      });
    }
  };

  const matricular = async () => {
    setMatriculando("enviando");
    const r = await pedir("/api/cursos.php?action=matricular", { curso: c.id }).catch(() => null);
    if (r && r.ok && r.data && r.data.estado === "matriculado") {
      setMatriculando("");
      await cargar();
      let intentos = 0;
      const abrir = () => {
        const primera = document.getElementById("lec-0-0");
        if (primera) { primera.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        if (++intentos < 10) setTimeout(abrir, 250);
      };
      abrir();
      return;
    }
    const pendiente = !!(r && r.ok);
    setMatriculando(pendiente ? "pedida" : "");
    setEstado({ texto: r?.data?.mensaje || r?.error || "No se pudo completar la matrícula.", tipo: pendiente ? "is-ok" : "is-error" });
  };

  const solicitar = async () => {
    const motivo = window.prompt("Cuéntale a quien creó el curso para qué lo necesitas (opcional):", "");
    if (motivo === null) return;
    setSolicitando(true);
    const r = await pedir("/api/cursos.php?action=solicitar_acceso", { curso: c.id, mensaje: motivo }).catch(() => null);
    if (r && r.ok) { location.reload(); return; }
    setSolicitando(false);
    setEstado({ texto: r?.error || "No se pudo enviar la solicitud.", tipo: "is-error" });
  };

  const reiniciar = async () => {
    if (!window.confirm("¿Borrar tu avance en este curso?")) return;
    const res = await pedir("/api/cursos.php?action=reiniciar", { curso: c.id }).catch(() => null);
    if (res && res.ok) location.reload();
  };

  const estadoLinea = <p className={"redcafe-curso-estado" + (estado.tipo ? " " + estado.tipo : "")} role="status" aria-live="polite">{estado.texto}</p>;

  /* Dos puertas: matricularse depende del alumno; la aprobación, del autor. */
  let aviso: React.ReactNode = null;
  if (datos && !deAliado && (datos.acceso_concedido === false || !puedeCompletar)) {
    const sol = datos.mi_solicitud || "ninguno";
    const moderado = (datos.acceso || "abierto") === "aprobacion";
    let titulo = "", cuerpo = "", accion: React.ReactNode = null, consentimiento: React.ReactNode = null;
    if (sol === "anonimo") {
      titulo = c.publico ? "Explora gratis y guarda tu avance" : moderado ? "Crea tu perfil para pedir acceso" : "Crea tu perfil para estudiar este curso";
      cuerpo = c.publico
        ? "Puedes leer este curso sin cuenta. Crea tu perfil gratis para matricularte y guardar tu avance."
        : moderado ? "Este curso lo modera quien lo creó. Con una cuenta gratuita puedes pedir la matrícula y recibir la respuesta." : "La matrícula es gratis y sirve para guardar tu avance lección a lección.";
      accion = <a className="redcafe-curso-solicitar" href="/afiliate/">Crear perfil gratis</a>;
    } else if (sol === "pendiente") {
      titulo = "Matrícula enviada";
      cuerpo = "Quien creó el curso tiene que aprobarla. Cuando lo haga, verás el contenido aquí mismo.";
    } else if (sol === "rechazado") {
      titulo = "Matrícula no aprobada";
      cuerpo = "Puedes volver a pedirla explicando para qué necesitas el curso.";
      accion = <button type="button" className="redcafe-curso-solicitar" disabled={solicitando} onClick={solicitar}>{solicitando ? "Enviando…" : "Pedir de nuevo"}</button>;
    } else {
      titulo = moderado ? "Curso con acceso moderado" : "Empezar gratis el curso";
      cuerpo = moderado
        ? "Pide la matrícula y recibirás el contenido cuando su autor la apruebe."
        : "Es gratis y toma un clic. Al matricularte se guarda tu avance lección a lección y puedes retomarlo cuando quieras.";
      const etiqueta = moderado ? "Pedir matrícula" : "Empezar gratis";
      accion = (
        <button type="button" className={"redcafe-curso-matricular" + (matriculando === "pedida" ? " es-pedida" : "")} disabled={matriculando !== ""} onClick={matricular}>
          {matriculando === "enviando" ? "Enviando…" : matriculando === "pedida" ? "Matrícula pedida" : etiqueta}
        </button>
      );
      consentimiento = CONSENTIMIENTO(moderado ? "pedir la matrícula" : "matricularte");
    }
    aviso = (
      <div className="redcafe-curso-bloqueado">
        <h2>{titulo}</h2>
        <p>{cuerpo}</p>
        <p className="redcafe-bloque-pie">Abajo tienes el temario completo para decidir antes.</p>
        {accion}
        {consentimiento}
        {estadoLinea}
      </div>
    );
  }

  // En el curso de la clase demostrativa, el enlace «Avisarme…» se cambia por
  // el grupo de WhatsApp de la clase.
  const materiales = (Array.isArray(c.materiales) ? c.materiales : []).map((m) =>
    CLASE_DEMO && c.id === CLASE_DEMO.curso && /^avisarme/i.test(String(m.titulo || ""))
      ? { ...m, tipo: "enlace", titulo: "Clase demostrativa de barismo: unirme al grupo de WhatsApp", url: CLASE_DEMO.href, nota: CLASE_DEMO.nota }
      // En los cursos de Legacy, todo WhatsApp lleva la misma referencia a la Red.
      : deAliado && /^https:\/\/wa\.me\//i.test(String(m.url || ""))
        ? { ...m, url: waLegacy(c.titulo || "", c.id) }
        : m
  );
  const nMat = Number(c.materiales_count || 0);

  return (
    <section id="redcafe-curso" className="redcafe-curso">
      <div className="redcafe-curso-wrap">
        <p className="redcafe-curso-rotulo">
          {c.nivel || ""}{c.duracion ? ` · ${c.duracion}` : ""}{c.autor && c.autor_id ? ` · por ${c.autor}` : ""}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="redcafe-curso-portada" src={portada} alt={FOTOS_CURSOS[c.id]?.alt || ""} decoding="async" width={640} height={360} />
        <p className={"redcafe-curso-costo-ficha " + (precio ? "es-pago" : "es-gratis")}>{precio || "Gratis"}</p>
        <h1 className="redcafe-curso-titulo">{c.titulo || "Curso"}</h1>
        {c.descripcion ? <p className="redcafe-curso-desc">{c.descripcion}</p> : null}
        {CLASE_DEMO && c.id === CLASE_DEMO.curso ? <ClaseDemoCurso clase={CLASE_DEMO} /> : null}
        {deAliado ? <ResumenLegacy id={c.id} /> : null}
        {deAliado ? <InscripcionLegacy titulo={c.titulo || ""} id={c.id} /> : null}
        {deAliado ? <OfertaLegacyVista id={c.id} /> : null}
        {aviso}
        {datos && !deAliado && datos.acceso_concedido !== false && total ? <BarraAvance hechas={completadas.length} total={total} /> : null}
        {c.introduccion ? <div className="redcafe-curso-intro"><p>{c.introduccion}</p></div> : null}
        {deAliado ? <VideosEn curso={c.id} en="intro" /> : null}
        {(c.objetivos || []).length ? (
          <div className="redcafe-curso-obj"><h2>Al terminar, podrás</h2><ul>{(c.objetivos || []).map((o, i) => <li key={i}>{o}</li>)}</ul></div>
        ) : null}
        {deAliado ? <VideosEn curso={c.id} en="objetivos" /> : null}
        {(c.modulos || []).map((m, mi) => (
          <section key={mi} className="redcafe-modulo">
            <header>
              <p className="redcafe-modulo-num">Módulo {mi + 1}{m.minutos ? ` · ${m.minutos} min` : ""}</p>
              <h3>{m.titulo}</h3>
              {m.resumen ? <p className="redcafe-modulo-resumen">{m.resumen}</p> : null}
            </header>
            {datos ? (m.lecciones || []).map((l, li) => {
              const hecha = completadas.includes(`${c.id}::${mi}::${li}`);
              return (
                <article key={li} className={"redcafe-leccion" + (hecha ? " is-hecha" : "")} data-modulo={mi} data-leccion={li}>
                  <h4 id={`lec-${mi}-${li}`}>{l.titulo}</h4>
                  {l.contenido ? <div className="redcafe-leccion-texto"><Parrafos texto={l.contenido} /></div> : null}
                  {Array.isArray(l.bloques) && l.bloques.length ? (
                    <div className="redcafe-bloques">{l.bloques.map((b, bi) => <Fragment key={bi}><BloqueVista b={b} /></Fragment>)}</div>
                  ) : null}
                  {deAliado ? <VideosEn curso={c.id} en={`leccion:${mi}:${li}`} /> : puedeCompletar ? (
                    <label className="redcafe-leccion-check">
                      <input type="checkbox" data-completar="1" checked={hecha} onChange={(e) => void completar(mi, li, e.target.checked)} />
                      <span>Marcar como completada</span>
                    </label>
                  ) : (
                    <p className="redcafe-leccion-bloqueada">{c.publico ? "Matricúlate gratis para guardar tu avance." : "Matricúlate para abrir el contenido y guardar tu avance."}</p>
                  )}
                </article>
              );
            }) : null}
            {m.ejercicio ? <div className="redcafe-ejercicio"><p className="redcafe-ejercicio-rot">Ejercicio</p><p>{m.ejercicio}</p></div> : null}
          </section>
        ))}
        {materiales.length ? (
          <div className="redcafe-curso-mat">
            <h2>Material del curso</h2>
            <ul>
              {materiales.map((m, i) => {
                const esArchivo = (m.tipo || "enlace") === "archivo";
                const externo = !esArchivo && /^https:/i.test(String(m.url || ""));
                return (
                  <li key={i}>
                    <a href={m.url || "#"} download={esArchivo || undefined} target={externo ? "_blank" : undefined} rel={externo ? "noreferrer" : undefined}>
                      {esArchivo ? "📄 " : "🔗 "}{m.titulo || (esArchivo ? "Documento" : "Enlace")}
                    </a>
                    {m.nota ? <small>{m.nota}</small> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : nMat && datos?.acceso_concedido === false ? (
          <div className="redcafe-curso-mat">
            <h2>Material del curso</h2>
            <p className="redcafe-curso-mat-aviso">Este curso trae {nMat} {nMat === 1 ? "documento o enlace de apoyo" : "documentos y enlaces de apoyo"}. Se ven al matricularse.</p>
          </div>
        ) : null}
        {(c.recursos || []).length ? (
          <div className="redcafe-curso-rec"><h2>Recursos y referencias</h2><ul>{(c.recursos || []).map((r, i) => <li key={i}>{r}</li>)}</ul></div>
        ) : null}
        {c.cierre ? <div className="redcafe-curso-cierre"><h2>Para cerrar</h2><p>{c.cierre}</p></div> : null}
        {deAliado ? <InscripcionLegacy titulo={c.titulo || ""} id={c.id} abajo /> : <AvisoReferencial />}
        <div className="redcafe-curso-pie">
          <Link className="btn-ghost" href="/academia/">Volver a la Academia</Link>
          {puedeCompletar && !deAliado && total ? <button type="button" className="redcafe-curso-reiniciar" onClick={reiniciar}>Reiniciar mi avance</button> : null}
          {aviso ? null : estadoLinea}
        </div>
      </div>
    </section>
  );
}
