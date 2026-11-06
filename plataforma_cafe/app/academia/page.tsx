"use client";

/*
 Índice de la Academia. Antes React pintaba una lista y la capa propia
 (redcafe-academia.js · montarListado) la ocultaba y ponía la suya con los
 datos de /api/cursos.php: ese cambio era el parpadeo. Ahora hay una sola lista,
 aquí: sale en el HTML con el catálogo del sitio y, cuando llega la API, se
 completan los mismos tarjetones (cursos nuevos, avance, autor y verificado).
*/
import { useEffect, useState } from "react";
import Link from "next/link";
import { CURSOS } from "@/lib/data";
import { CONFIG } from "@/lib/config";

type CursoLista = {
  id: string;
  titulo: string;
  nivel?: string;
  duracion?: string;
  categoria?: string;
  descripcion?: string;
  autor?: string;
  autor_id?: string;
  modulos?: number;
  lecciones?: number;
  completadas?: number;
  avance?: number;
  listo?: boolean;
  creado?: string;
  actualizado?: string;
  verificado?: boolean;
  verificado_en?: string | null;
  verificado_por?: string;
};

/* Portadas por categoría (las fotos de /uploads/user-content/ por curso no
   existen en el servidor y daban 404 y un segundo cambio de imagen). */
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

const SELLOS: Record<string, string> = {
  "cafe-de-especialidad-de-la-finca-a-la-taza": "Empieza gratis · de la finca a la taza",
  "legacy-barista-en-casa": "Prepara mejores tazas en casa",
  "legacy-barismo-profesional": "Practica técnicas de barra profesional",
  "legacy-barista-avanzado": "Da el siguiente paso tras Barista Pro",
};

const GANCHOS: Record<string, string> = {
  "buenas-practicas": "Saca más quintales de la misma hectárea.",
  postcosecha: "Sube el puntaje de tu taza y con él el precio que te pagan.",
  "ventas-comercial": "Deja de aceptar el primer precio que te ofrecen.",
  formalizacion: "Factura en regla y véndele a quien exige comprobante.",
  tueste: "Consigue un perfil de tueste que puedas repetir siempre igual.",
  trazabilidad: "Llega con los papeles hechos cuando tu comprador europeo te los pida.",
  "cafe-especial": "Haz que tu café deje de venderse como uno más.",
  "manejo-plagas": "No pierdas la cosecha por una plaga que se veía venir.",
  exportacion: "Vende fuera del Ecuador sin depender de un intermediario.",
  "cafe-de-especialidad-de-la-finca-a-la-taza": "Descubre qué hace valioso a un café, del grano a la taza.",
  "legacy-barista-en-casa": "Aprende a preparar café de calidad sin salir de casa.",
  "legacy-barismo-profesional": "Entrena espresso, calibración, leche y servicio para trabajar en barra.",
  "legacy-barista-avanzado": "Profundiza tu técnica si ya egresaste de Barista Pro.",
};

/* Los 3 cursos de Legacy son de pago; los de Red Café, gratis. */
const PRECIOS: Record<string, string> = {
  "legacy-barista-en-casa": "Promoción 143 USD · pareja/grupo 120 USD c/u",
  "legacy-barismo-profesional": "Promoción 359 USD · pareja/grupo 320 USD c/u",
  "legacy-barista-avanzado": "Promoción 550 USD",
};

const portadaDe = (c: CursoLista) => PORTADAS[c.categoria || "general"] || PORTADAS.general;
const selloDe = (c: CursoLista) => SELLOS[c.id] || (PRECIOS[c.id] ? "Formación con Legacy" : "Aprende gratis · a tu ritmo");
const pct = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
};

/* Catálogo del sitio para el primer HTML (los de Legacy llegan de la API:
   su ficha local es solo un marcador). Más recientes primero, como la API. */
const INICIAL: CursoLista[] = CURSOS.filter((c) => !c.id.startsWith("legacy-"))
  .map((c) => ({
    id: c.id, titulo: c.titulo, nivel: c.nivel, duracion: c.duracion, categoria: c.categoria,
    descripcion: c.descripcion, modulos: c.modulos.length, listo: true,
  }))
  .reverse();

function ordenar(cursos: CursoLista[]): CursoLista[] {
  return cursos
    .filter((c) => c.listo)
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const fa = Date.parse(a.c.creado || a.c.actualizado || "") || 0;
      const fb = Date.parse(b.c.creado || b.c.actualizado || "") || 0;
      return fa !== fb ? fb - fa : b.i - a.i;
    })
    .map((x) => x.c);
}

function SelloVerificado({ c }: { c: CursoLista }) {
  if (!c.verificado) return null;
  const quien = c.verificado_por || "la administración";
  let cuando = "";
  if (c.verificado_en) {
    const f = new Date(Date.parse(c.verificado_en));
    if (!Number.isNaN(f.getTime())) cuando = " el " + f.toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
  }
  return <span className="redcafe-sello-verificado" title={`Revisado por ${quien}${cuando}`}>✓ Verificado</span>;
}

export default function AcademiaPage() {
  const [cursos, setCursos] = useState<CursoLista[]>(INICIAL);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(CONFIG.api("/api/cursos.php?action=list"), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!vivo || !res?.ok || !res.data) return;
        const lista = ordenar((res.data.cursos as CursoLista[]) || []);
        if (lista.length) setCursos(lista);
        setAutenticado(!!res.data.autenticado);
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  return (
    <div>
      <section className="hero-gradient py-16 text-crema">
        <div className="mx-auto max-w-6xl px-4">
          <p className="badge bg-latte/15 text-acento-claro">ACADEMIA RED CAFÉ</p>
          <h1 className="mt-3 font-titulo text-4xl font-bold leading-tight text-crema md:text-5xl">
            El conocimiento también forma parte de la Red
          </h1>
          <p className="mt-4 max-w-2xl text-crema/80">
            Aprende sobre producción, postcosecha, comercialización,
            administración, calidad, tueste y otros temas relacionados con el
            café.
          </p>
        </div>
      </section>

      <section id="redcafe-academia-avance" className="redcafe-academia-avance">
        <div className="redcafe-pub-wrap">
          <p className="redcafe-pub-rotulo">Cursos disponibles</p>
          <h2 className="redcafe-pub-titulo">Formación abierta a todos los perfiles</h2>
          <p className="redcafe-pub-intro">
            {autenticado
              ? "Marca cada lección al terminarla: tu avance queda guardado en tu perfil."
              : "Crea tu perfil gratis para matricularte y guardar tu avance mientras avanzas por los cursos."}
          </p>
          <div className="redcafe-cursos-grid">
            {cursos.map((c) => {
              const avance = pct(c.avance);
              return (
                <Link key={c.id} className="redcafe-curso-card" href={`/academia/${c.id}/`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="redcafe-curso-card-portada" src={portadaDe(c)} alt="" width={640} height={360} decoding="async" />
                  <span className="redcafe-curso-portada-sello">{selloDe(c)}</span>
                  <p className="redcafe-curso-card-rot">
                    {c.nivel}{c.duracion ? ` · ${c.duracion}` : ""}
                    <span className="redcafe-curso-etiqueta">{(c.completadas ?? 0) > 0 ? `${avance} % completado` : "Contenido disponible"}</span>
                    <span className={"redcafe-curso-costo " + (PRECIOS[c.id] ? "es-pago" : "es-gratis")}>{PRECIOS[c.id] || "Gratis"}</span>
                  </p>
                  <h3>{c.titulo}</h3>
                  {GANCHOS[c.id] ? <p className="redcafe-curso-card-gancho">{GANCHOS[c.id]}</p> : null}
                  <p className="redcafe-curso-card-desc">{c.descripcion || ""}</p>
                  <p className="redcafe-curso-card-meta">
                    {Number(c.modulos) || 0} módulos{c.lecciones != null ? ` · ${Number(c.lecciones) || 0} lecciones` : ""}
                    {c.autor_id ? ` · por ${c.autor}` : ""}
                    <SelloVerificado c={c} />
                  </p>
                  {(c.completadas ?? 0) > 0 ? (
                    <>
                      <div className="redcafe-avance-barra mini"><span style={{ width: `${avance}%` }} /></div>
                      <p className="redcafe-curso-card-avance">{avance} % completado</p>
                    </>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
