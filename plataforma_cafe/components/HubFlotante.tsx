"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { CLASE_DEMO, ENLACE_CLASE_DEMO_CURSO } from "@/lib/claseDemo";

/*
 Botón flotante de la Comunidad: una cereza de café (dibujo SVG con volumen y
 brillo) que madura en bucle de verde a amarilla y a roja, que resalta sobre el fondo crema y los tonos café de la
 página. Al tocarla abre UNA tarjeta
 pequeña; nunca se abre sola:
 · lo nuevo desde la última vez que esta persona abrió la tarjeta o entró a
   /comunidad/ (en este navegador): la última novedad y un número por tipo
   (miembros, lotes, servicios, cursos, empleos, requerimientos);
 · siempre «N cursos gratis»;
 · y el enlace a la Comunidad.
 El número de la burbuja cuenta miembros y lotes nuevos, más 1 fijo por los
 cursos gratis; al abrir
 la tarjeta o entrar a /comunidad/ se da por visto. En la primera visita no se
 inventa un número. Se cierra con «×», Escape, un enlace o la misma burbuja.
*/
const CLAVE_VISTO = "redcafe_comunidad_visto";

/* Cereza de café amarilla: cuerpo con degradado radial, brillo, la corona
   (cicatriz de la flor) arriba y un pedúnculo con hoja. Decorativa. */
// Maduración: verde → amarilla → roja → verde (cada color por stop del degradado).
const MADURACION = [
  ["#D9F2A0", "#FFF0A0", "#FFC2AE"],
  ["#9CCB4A", "#FFD233", "#E8442E"],
  ["#5E9A2A", "#EFA20C", "#B81E12"],
  ["#3D6E1C", "#B86F04", "#7E0F08"],
  ["#2A4F12", "#8A4F03", "#5A0804"],
];
const ESTATICO = 1; // sin animación (o con «reducir movimiento»): amarilla

function CerezaAmarilla({ animar }: { animar: boolean }) {
  const parada = (offset: string, i: number) => (
    <stop offset={offset} stopColor={MADURACION[i][ESTATICO]}>
      {animar && (
        <animate attributeName="stop-color" dur="9s" repeatCount="indefinite"
          values={[0, 0, 1, 1, 2, 2, 0].map((k) => MADURACION[i][k]).join(";")}
          keyTimes="0;0.2;0.33;0.53;0.66;0.86;1" />
      )}
    </stop>
  );
  return (
    <svg viewBox="0 0 64 70" className="h-16 w-16" style={{ filter: "drop-shadow(0 6px 8px rgba(60,30,0,.4))" }} aria-hidden="true">
      <defs>
        <radialGradient id="rc-cereza-cuerpo" cx="36%" cy="32%" r="78%">
          {parada("0%", 0)}
          {parada("22%", 1)}
          {parada("58%", 2)}
          {parada("88%", 3)}
          {parada("100%", 4)}
        </radialGradient>
        <radialGradient id="rc-cereza-brillo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".95" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rc-cereza-corona" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#5A3A0A" />
          <stop offset="70%" stopColor="#8E5B0C" />
          <stop offset="100%" stopColor="#C98A0E" />
        </radialGradient>
        <linearGradient id="rc-cereza-hoja" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6FAE5C" />
          <stop offset="100%" stopColor="#2F6B45" />
        </linearGradient>
      </defs>
      {/* Pedúnculo corto y hoja */}
      <path d="M31 14 C31 9 33 6 36 4" stroke="#5E4A1C" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M35 5 C43 -1 55 1 60 8 C51 12 41 11 35 5 Z" fill="url(#rc-cereza-hoja)" />
      <path d="M36 5.5 C44 6 52 7.5 59 8" stroke="#1F4A2F" strokeWidth=".8" fill="none" opacity=".55" />
      {/* Cuerpo: ovalado, un poco más alto que ancho, como la cereza del café */}
      <path d="M32 13 C47 13 56 26 56 41 C56 56 46 67 32 67 C18 67 8 56 8 41 C8 26 17 13 32 13 Z" fill="url(#rc-cereza-cuerpo)" />
      {/* Surco de las dos semillas */}
      <path d="M33 16 C29 30 29 50 32 64" stroke="#A86A06" strokeWidth="1.2" fill="none" opacity=".35" />
      {/* Brillo */}
      <ellipse cx="22" cy="28" rx="7.5" ry="5" fill="url(#rc-cereza-brillo)" transform="rotate(-28 22 28)" />
      {/* Corona: la cicatriz de la flor, abajo */}
      <ellipse cx="32" cy="62.5" rx="4.2" ry="3.2" fill="url(#rc-cereza-corona)" />
      <circle cx="32" cy="62.3" r="1.4" fill="#3A250A" />
      {/* Unión con el pedúnculo */}
      <ellipse cx="31.5" cy="14.5" rx="3" ry="1.6" fill="#7A5410" />
    </svg>
  );
}

type Anuncio = {
  id: string;
  hasta: string | null; // ISO; deja de salir a partir de esta fecha. null = permanente
  rotulo: string;
  titulo: string;
  enlaces: { texto: string; href: string; externo: boolean }[];
};
const ANUNCIO: Anuncio | null = {
  id: "cursos-gratis",
  hasta: null,
  rotulo: "Academia · Cursos gratis",
  titulo: "Aprende gratis y a tu ritmo.",
  enlaces: [
    { texto: "Ver cursos gratis", href: "/academia/", externo: false },
    { texto: "De la finca a la taza", href: "/academia/cafe-de-especialidad-de-la-finca-a-la-taza/", externo: false },
  ],
};

type Post = { aviso?: string; created_at?: string; titulo?: string; enlace?: string };

// Novedades del muro que salen solas (además del número del botón).
const TIPOS_NOVEDAD = ["miembro", "lote", "servicio", "curso", "empleo", "requerimiento"];

// Novedades desde la última visita de esta persona: una línea por tipo, cada
// una con su número y su enlace (no se suman todas en un solo número).
const NOMBRES: Record<string, [string, string, string]> = {
  miembro: ["miembro nuevo", "miembros nuevos", "/comunidad/"],
  lote: ["lote nuevo", "lotes nuevos", "/marketplace/"],
  servicio: ["servicio nuevo", "servicios nuevos", "/marketplace/?ver=servicios"],
  curso: ["curso nuevo", "cursos nuevos", "/academia/"],
  empleo: ["oferta de empleo", "ofertas de empleo", "/marketplace/?ver=empleos"],
  requerimiento: ["requerimiento nuevo", "requerimientos nuevos", "/comunidad/"],
};
function anuncioNovedades(nuevas: Post[]): Anuncio | null {
  if (!nuevas.length) return null;
  const ultima = nuevas.reduce((a, b) => (String(b.created_at || "") > String(a.created_at || "") ? b : a));
  const enlaces = TIPOS_NOVEDAD.flatMap((t) => {
    const n = nuevas.filter((p) => p.aviso === t).length;
    if (!n) return [];
    const [uno, varios, href] = NOMBRES[t];
    return [{ texto: `${n} ${n === 1 ? uno : varios}`, href, externo: false }];
  });
  return {
    id: "novedades-" + String(ultima.created_at || ""),
    hasta: null,
    rotulo: "Novedades desde tu última visita",
    titulo: String(ultima.titulo || "").trim() || "Hay movimiento en la Red",
    enlaces,
  };
}

function leer(clave: string): string {
  try { return localStorage.getItem(clave) || ""; } catch { return ""; }
}
function guardar(clave: string, valor: string) {
  try { localStorage.setItem(clave, valor); } catch { /* sin sitio: da igual */ }
}
export function HubFlotante() {
  const ruta = usePathname() || "/";
  const [nuevas, setNuevas] = useState(0);
  const [abierta, setAbierta] = useState(false);
  const [gratis, setGratis] = useState(0); // número de cursos gratis (los de Legacy son de pago)
  const [novedad, setNovedad] = useState<Anuncio | null>(null);
  const [masNuevo, setMasNuevo] = useState("");
  // La animación se activa tras hidratar (el HTML estático la trae quieta) y
  // nunca si la persona pidió reducir el movimiento.
  const [animar, setAnimar] = useState(false);
  useEffect(() => {
    try { setAnimar(!window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch { setAnimar(true); }
  }, []);

  const enlaces = [
    ...(novedad ? novedad.enlaces : []),
    { texto: gratis > 0 ? `${gratis} cursos gratis` : "Cursos gratis", href: "/academia/", externo: false },
    { texto: "Ir a la Comunidad", href: "/comunidad/", externo: false },
  ];

  useEffect(() => {
    let vigente = true;
    fetch(CONFIG.api("/api/comunidad.php?action=list"), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!vigente) return;
        const posts: Post[] = (j && j.ok && j.data && j.data.posts) || [];
        if (!posts.length) return;
        const ultimo = posts.reduce((max, p) => (String(p.created_at || "") > max ? String(p.created_at || "") : max), "");
        setMasNuevo(ultimo);
        const visto = leer(CLAVE_VISTO);
        if (ruta.startsWith("/comunidad") || !visto) {
          if (ultimo) guardar(CLAVE_VISTO, ultimo);
          setNuevas(0);
          setNovedad(null);
          return;
        }
        const recientes = posts.filter((p) => TIPOS_NOVEDAD.includes(String(p.aviso || "")) && String(p.created_at || "") > visto);
        setNuevas(recientes.filter((p) => p.aviso === "miembro" || p.aviso === "lote").length);
        setNovedad(anuncioNovedades(recientes));
      })
      .catch(() => { /* sin contador: el botón sigue funcionando */ });
    return () => { vigente = false; };
  }, [ruta]);

  useEffect(() => {
    let vigente = true;
    fetch(CONFIG.api("/api/cursos.php?action=list"), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const cursos: { id?: string }[] = (j && j.ok && j.data && j.data.cursos) || [];
        if (vigente) setGratis(cursos.filter((c) => !String(c.id || "").startsWith("legacy-")).length);
      })
      .catch(() => { /* sin número: el enlace sigue */ });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierta(false); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierta]);

  useEffect(() => { setAbierta(false); }, [ruta]);

  // Al abrirla, lo que se ve queda como visto: la próxima vez solo sale lo nuevo.
  const alternar = () => {
    if (!abierta) {
      if (masNuevo) guardar(CLAVE_VISTO, masNuevo);
      setNuevas(0);
    }
    setAbierta(!abierta);
  };

  // El número de la burbuja: miembros y lotes nuevos + 1 fijo por los cursos
  // gratis + 1 mientras esté la clase demostrativa.
  const alerta = nuevas + 1 + (CLASE_DEMO ? 1 : 0);
  const etiqueta = `Novedades de la Red: ${alerta} ${alerta === 1 ? "aviso" : "avisos"}`;
  const enlaceCss = "inline-flex min-h-9 items-center text-[0.8125rem] font-semibold text-white underline underline-offset-4";

  return (
    <div className="redcafe-hub fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden">
      {abierta && (
        <div
          id="redcafe-mensaje-temporal"
          role="dialog"
          aria-label="Novedades de la Red"
          className="redcafe-mensaje-temporal relative w-[min(19rem,calc(100vw-2.5rem))] overflow-y-auto border border-white/15 px-4 pb-3 pt-3 text-white shadow-2xl"
          style={{
            maxHeight: "calc(100dvh - 7.5rem)",
            overscrollBehavior: "contain",
            backgroundColor: "#8C3604",
            backgroundImage: "linear-gradient(170deg, rgba(140,54,4,.96), rgba(84,32,4,.97))",
          }}
        >
          <button
            type="button"
            onClick={() => setAbierta(false)}
            className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-white"
            aria-label="Cerrar novedades"
          >
            <span aria-hidden="true" className="text-lg leading-none">×</span>
          </button>
          {CLASE_DEMO && (
            <div className="redcafe-clase-demo mb-3 border-b pb-3" style={{ borderColor: "rgba(255,255,255,.2)" }}>
              <p className="pr-8 text-[0.6875rem] font-bold uppercase tracking-[0.14em]" style={{ color: "#F7D08A" }}>
                {CLASE_DEMO.rotulo}
              </p>
              {CLASE_DEMO.parrafos.map((t, i) => (
                <p key={i} className={`mt-1.5 text-[0.8125rem] leading-snug text-white ${i === 0 ? "pr-6 font-semibold" : ""}`}>{t}</p>
              ))}
              <p className="mt-1.5 text-[0.8125rem] leading-snug text-white">{CLASE_DEMO.antesDelBoton}</p>
              <a
                href={CLASE_DEMO.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setAbierta(false)}
                className="mt-2 inline-flex min-h-11 items-center justify-center bg-white px-4 text-sm font-bold"
                style={{ color: "#542004", borderRadius: 4, textDecoration: "none" }}
              >
                {CLASE_DEMO.boton} <span aria-hidden="true" className="ml-1">↗</span>
              </a>
              {CLASE_DEMO.despues.map((t, i) => (
                <p key={i} className="mt-1.5 text-[0.8125rem] leading-snug text-white">{t}</p>
              ))}
              <Link href={ENLACE_CLASE_DEMO_CURSO} onClick={() => setAbierta(false)} className={"mt-1 " + enlaceCss}>
                Ver en el curso «De la finca a la taza»
              </Link>
            </div>
          )}
          <p className={`${CLASE_DEMO ? "" : "pr-8 "}text-[0.6875rem] font-bold uppercase tracking-[0.14em]`} style={{ color: "#F7D08A" }}>
            {novedad ? "Novedades de la Red" : "Academia · Cursos gratis"}
          </p>
          <p className="mt-1 pr-6 text-sm font-semibold leading-snug text-white">
            {novedad ? novedad.titulo : "Aprende gratis y a tu ritmo."}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3">
            {enlaces.map((e) => (
              <Link key={e.href + e.texto} href={e.href} onClick={() => setAbierta(false)} className={enlaceCss}>
                {e.texto}
              </Link>
            ))}
          </div>
          {/* Piquito que apunta a la burbuja: la tarjeta sale de ella. */}
          <span aria-hidden="true" className="absolute -bottom-[7px] right-5 h-3 w-3 rotate-45 border-b border-r border-white/15" style={{ backgroundColor: "#542004" }} />
        </div>
      )}
      <button
        type="button"
        onClick={alternar}
        aria-label={etiqueta}
        aria-expanded={abierta}
        className="group relative grid h-16 w-16 place-items-center transition hover:opacity-90"
      >
        <CerezaAmarilla animar={animar} />
        {alerta > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-cafe px-1 text-[10px] font-bold text-white">
            {alerta > 9 ? "9+" : alerta}
          </span>
        )}
        <span className="absolute right-full mr-2 hidden whitespace-nowrap rounded-full bg-cafe px-3 py-1 text-xs text-crema group-hover:block">
          Novedades de la Red
        </span>
      </button>
    </div>
  );
}
