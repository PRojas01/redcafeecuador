"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { Icono } from "@/components/Icono";

/*
 Botón flotante de la Comunidad: lleva a /comunidad/ y muestra cuántas
 novedades hay desde la última visita (solo miembros y lotes nuevos; en
 /comunidad/ se da por visto; en la primera visita no se inventa un número).
 Antes React pintaba también «Canales de la Red» y la capa propia lo ocultaba y
 pintaba su copia (parpadeo). Ahora es una sola versión, aquí.

 Encima del botón sale solo un MENSAJE (como mucho uno por visita): si hay
 novedades desde la última visita (miembros, lotes, servicios, cursos, empleos,
 requerimientos), la más reciente; si no, el aviso fijo de cursos gratis.
 No cambia lo que hace el botón:
 · sale solo, 2 s después de cargar, en cada visita nueva (una vez por sesión
   del navegador) hasta la fecha del anuncio (o siempre, si es permanente); nunca en admin, registro, entrar,
   panel ni chat, donde taparía formularios;
 · se queda 20 s (se detiene si la persona lo toca o lo recorre con el teclado)
   y el botón late suavemente mientras tanto: se ve que el aviso sale de él;
 · si es temporal, deja de salir para siempre cuando la persona lo cierra con
   «×» o abre uno de sus enlaces; si es permanente, solo hasta la próxima visita.
*/
const CLAVE_VISTO = "redcafe_comunidad_visto";
const CLAVE_CERRADO = "redcafe_anuncio_cerrado"; // localStorage: lo cerró o lo abrió
const CLAVE_SESION = "redcafe_anuncio_sesion";   // sessionStorage: ya salió en esta visita
const DURACION_MS = 20000;

// Aviso del botón flotante. Con fecha («hasta») es temporal y «×» lo cierra
// para siempre. Sin fecha es PERMANENTE (cursos gratis): sale una vez en cada
// visita nueva y «×» solo lo cierra hasta la próxima visita.
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
function enSesion(): boolean {
  try { return !!sessionStorage.getItem(CLAVE_SESION); } catch { return false; }
}
function marcarSesion(id: string) {
  try { sessionStorage.setItem(CLAVE_SESION, id); } catch { /* nada */ }
}

export function HubFlotante() {
  const ruta = usePathname() || "/";
  const [nuevas, setNuevas] = useState(0);
  const [mensaje, setMensaje] = useState(false);
  const [gratis, setGratis] = useState(0); // número de cursos gratis (los de Legacy son de pago)
  // undefined = aún no se sabe si hay novedades; null = no hay.
  const [novedad, setNovedad] = useState<Anuncio | null | undefined>(undefined);
  // Una sola tarjeta pequeña: cursos gratis siempre y, si hay, las novedades de
  // esta persona (una por tipo) en la misma tarjeta, para no tapar la pantalla.
  const anuncio: Anuncio | null = novedad && ANUNCIO
    ? { id: novedad.id, hasta: null, rotulo: "Novedades de la Red", titulo: novedad.titulo,
        enlaces: [...novedad.enlaces, ANUNCIO.enlaces[0]] }
    : ANUNCIO || novedad || null;
  const conNumero = (a: Anuncio | null): Anuncio | null => (a && gratis > 0
    ? { ...a, enlaces: a.enlaces.map((e) => (e.href === "/academia/" ? { ...e, texto: `${gratis} cursos gratis` } : e)) }
    : a);
  const anuncios = [conNumero(anuncio)].filter((a): a is Anuncio => !!a && !(a.hasta && Date.now() >= Date.parse(a.hasta)));
  const [cerrados, setCerrados] = useState<string[]>([]);
  const visibles = anuncios.filter((a) => !cerrados.includes(a.id));
  const pausado = useRef(false);
  const conFormularios = ["/admin", "/afiliate", "/login", "/recuperar", "/panel", "/chat"].some((r) => ruta.startsWith(r));

  useEffect(() => {
    let vigente = true;
    fetch(CONFIG.api("/api/comunidad.php?action=list"), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!vigente) return;
        const posts: Post[] = (j && j.ok && j.data && j.data.posts) || [];
        if (!posts.length) { setNovedad(null); return; }
        const masNuevo = posts.reduce((max, p) => (String(p.created_at || "") > max ? String(p.created_at || "") : max), "");
        const visto = leer(CLAVE_VISTO);
        if (ruta.startsWith("/comunidad")) {
          if (masNuevo) guardar(CLAVE_VISTO, masNuevo);
          setNuevas(0);
          setNovedad(null);
          return;
        }
        if (!visto) {
          if (masNuevo) guardar(CLAVE_VISTO, masNuevo);
          setNovedad(null);
          return;
        }
        const recientes = posts.filter((p) => TIPOS_NOVEDAD.includes(String(p.aviso || "")) && String(p.created_at || "") > visto);
        setNuevas(recientes.filter((p) => p.aviso === "miembro" || p.aviso === "lote").length); // el número del botón, como antes
        setNovedad(anuncioNovedades(recientes));
      })
      .catch(() => { setNovedad(null); /* sin contador: el botón sigue funcionando */ });
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

  // El aviso: fecha y marcas se leen tras hidratar (el HTML estático no las conoce).
  useEffect(() => {
    if (novedad === undefined) return; // espera a saber si hay novedades
    if (conFormularios || enSesion()) return;
    const quedan = anuncios.filter((a) => leer(CLAVE_CERRADO) !== a.id);
    if (!quedan.length) return;
    setCerrados(anuncios.filter((a) => !quedan.includes(a)).map((a) => a.id));
    const abrir = window.setTimeout(() => { setMensaje(true); marcarSesion(quedan[0].id); }, 2000);
    return () => window.clearTimeout(abrir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta, conFormularios, novedad]);

  // «×» o un enlace cierran esa tarjeta; con fecha, para siempre; sin fecha, hasta la próxima visita.
  const descartar = (a: Anuncio) => {
    if (a.hasta) guardar(CLAVE_CERRADO, a.id);
    const otros = [...cerrados, a.id];
    setCerrados(otros);
    if (anuncios.every((x) => otros.includes(x.id))) setMensaje(false);
  };

  useEffect(() => {
    if (!mensaje) return;
    let restante = DURACION_MS;
    const paso = window.setInterval(() => {
      if (pausado.current) return;
      restante -= 500;
      if (restante <= 0) setMensaje(false);
    }, 500);
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setMensaje(false); };
    document.addEventListener("keydown", tecla);
    return () => { window.clearInterval(paso); document.removeEventListener("keydown", tecla); };
  }, [mensaje]);

  useEffect(() => { setMensaje(false); }, [ruta]);

  const etiqueta = nuevas
    ? `Ir a la comunidad de la Red: ${nuevas} ${nuevas === 1 ? "novedad" : "novedades"}`
    : "Ir a la comunidad de la Red";

  return (
    <div className="redcafe-hub fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden">
      {mensaje && visibles.map((anuncio, n) => (
        <div
          key={anuncio.id}
          id={n === visibles.length - 1 ? "redcafe-mensaje-temporal" : undefined}
          role="status"
          aria-live="polite"
          onPointerEnter={() => { pausado.current = true; }}
          onPointerLeave={() => { pausado.current = false; }}
          onFocus={() => { pausado.current = true; }}
          onBlur={() => { pausado.current = false; }}
          className="redcafe-mensaje-temporal relative w-[min(19rem,calc(100vw-2.5rem))] border border-white/15 px-4 pb-3 pt-3 text-crema shadow-2xl"
          style={{
            backgroundColor: "#8C3604",
            backgroundImage: "radial-gradient(110% 60% at 50% -20%, rgba(202,131,85,.24), rgba(202,131,85,0) 60%), linear-gradient(170deg, rgba(140,54,4,.96), rgba(84,32,4,.97))",
            WebkitBackdropFilter: "blur(12px)",
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            type="button"
            onClick={() => descartar(anuncio)}
            className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-crema/80 hover:text-crema"
            aria-label="Cerrar mensaje"
          >
            <span aria-hidden="true" className="text-lg leading-none">×</span>
          </button>
          <p className="pr-8 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-acento-claro">{anuncio.rotulo}</p>
          {anuncio.titulo && <p className="mt-1 pr-6 text-sm font-semibold leading-snug text-white">{anuncio.titulo}</p>}
          <div className="mt-1 flex flex-wrap gap-x-3">
            {anuncio.enlaces.map((e) =>
              e.externo ? (
                <a key={e.href} href={e.href} target="_blank" rel="noopener noreferrer" onClick={() => descartar(anuncio)} className="inline-flex min-h-9 items-center text-[0.8125rem] font-semibold text-acento-claro underline underline-offset-4">
                  {e.texto} <span aria-hidden="true" className="ml-1">↗</span>
                </a>
              ) : (
                <Link key={e.href} href={e.href} onClick={() => descartar(anuncio)} className="inline-flex min-h-9 items-center text-[0.8125rem] font-semibold text-acento-claro underline underline-offset-4">
                  {e.texto}
                </Link>
              ),
            )}
          </div>
          {/* Piquito que apunta al botón: el mensaje sale de él. */}
          {n === visibles.length - 1 && <span aria-hidden="true" className="absolute -bottom-[7px] right-5 h-3 w-3 rotate-45 border-b border-r border-white/15" style={{ backgroundColor: "#542004" }} />}
        </div>
      ))}
      <Link
        href="/comunidad/"
        aria-label={etiqueta}
        className={`group relative grid h-14 w-14 place-items-center rounded-full bg-cereza text-white shadow-latte transition hover:bg-cereza/90 ${mensaje && visibles.length ? "motion-safe:animate-pulse ring-4 ring-acento-claro/60" : ""}`}
      >
        <Icono nombre="comunidad" className="h-6 w-6" />
        {nuevas > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-acento-claro px-1 text-[10px] font-bold text-cafe">
            {nuevas > 9 ? "9+" : nuevas}
          </span>
        )}
        <span className="absolute right-full mr-2 hidden whitespace-nowrap rounded-full bg-cafe px-3 py-1 text-xs text-crema group-hover:block">
          Comunidad de la Red
        </span>
      </Link>
    </div>
  );
}
