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
  puede_editar?: boolean; mi_solicitud?: string; acceso?: string;
};
type Estado = { texto: string; tipo: "" | "is-ok" | "is-error" };

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
const PRECIOS: Record<string, string> = {
  "legacy-barista-en-casa": "Promoción 143 USD · pareja/grupo 120 USD c/u",
  "legacy-barismo-profesional": "Promoción 359 USD · pareja/grupo 320 USD c/u",
  "legacy-barista-avanzado": "Promoción 550 USD",
};
const waLegacy = (titulo: string) =>
  `https://wa.me/593998569355?text=${encodeURIComponent(
    `Hola Legacy, vengo de redcafeecuador.com. Me interesa el curso «${titulo}». ¿Me informan de fechas disponibles, promociones, condiciones y formas de pago?`,
  )}`;

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

  const c: CursoVisor | undefined = datos?.curso ?? inicial;
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
  const portada = PORTADAS[c.categoria || "general"] || PORTADAS.general;

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
  if (datos && (datos.acceso_concedido === false || !puedeCompletar)) {
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

  const materiales = Array.isArray(c.materiales) ? c.materiales : [];
  const nMat = Number(c.materiales_count || 0);

  return (
    <section id="redcafe-curso" className="redcafe-curso">
      <div className="redcafe-curso-wrap">
        <p className="redcafe-curso-rotulo">
          {c.nivel || ""}{c.duracion ? ` · ${c.duracion}` : ""}{c.autor && c.autor_id ? ` · por ${c.autor}` : ""}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="redcafe-curso-portada" src={portada} alt="" decoding="async" width={640} height={360} />
        <p className={"redcafe-curso-costo-ficha " + (precio ? "es-pago" : "es-gratis")}>{precio || "Gratis"}</p>
        <h1 className="redcafe-curso-titulo">{c.titulo || "Curso"}</h1>
        {c.descripcion ? <p className="redcafe-curso-desc">{c.descripcion}</p> : null}
        {precio ? (
          <p className="redcafe-curso-legacy">
            <a className="redcafe-curso-solicitar" href={waLegacy(c.titulo || "")} target="_blank" rel="noreferrer">Pedir fechas y condiciones a Legacy</a>
          </p>
        ) : null}
        {aviso}
        {datos && datos.acceso_concedido !== false && total ? <BarraAvance hechas={completadas.length} total={total} /> : null}
        {c.introduccion ? <div className="redcafe-curso-intro"><p>{c.introduccion}</p></div> : null}
        {(c.objetivos || []).length ? (
          <div className="redcafe-curso-obj"><h2>Al terminar, podrás</h2><ul>{(c.objetivos || []).map((o, i) => <li key={i}>{o}</li>)}</ul></div>
        ) : null}
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
                  {puedeCompletar ? (
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
        <AvisoReferencial />
        <div className="redcafe-curso-pie">
          <Link className="btn-ghost" href="/academia/">Volver a la Academia</Link>
          {puedeCompletar && total ? <button type="button" className="redcafe-curso-reiniciar" onClick={reiniciar}>Reiniciar mi avance</button> : null}
          {aviso ? null : estadoLinea}
        </div>
      </div>
    </section>
  );
}
