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

 Encima del botón puede salir un MENSAJE TEMPORAL (anuncio vigente). No cambia
 lo que hace el botón:
 · sale solo, 2 s después de cargar, en cada visita nueva (una vez por sesión
   del navegador) hasta la fecha del anuncio; nunca en admin, registro, entrar,
   panel ni chat, donde taparía formularios;
 · se queda 20 s (se detiene si la persona lo toca o lo recorre con el teclado)
   y el botón late suavemente mientras tanto: se ve que el aviso sale de él;
 · deja de salir para siempre solo si la persona lo cierra con «×» o abre uno
   de sus enlaces.
*/
const CLAVE_VISTO = "redcafe_comunidad_visto";
const CLAVE_CERRADO = "redcafe_anuncio_cerrado"; // localStorage: lo cerró o lo abrió
const CLAVE_SESION = "redcafe_anuncio_sesion";   // sessionStorage: ya salió en esta visita
const DURACION_MS = 20000;

// Aviso temporal del botón flotante. Se borra cuando pasa su fecha
// (la clase gratis del 8 de octubre de 2026 ya pasó); para uno nuevo, rellénalo.
type Anuncio = {
  id: string;
  hasta: string; // ISO; deja de salir a partir de esta fecha
  rotulo: string;
  titulo: string;
  enlaces: { texto: string; href: string; externo: boolean }[];
};
const ANUNCIO: Anuncio | null = null;

type Post = { aviso?: string; created_at?: string };

function leer(clave: string): string {
  try { return localStorage.getItem(clave) || ""; } catch { return ""; }
}
function guardar(clave: string, valor: string) {
  try { localStorage.setItem(clave, valor); } catch { /* sin sitio: da igual */ }
}
function enSesion(): boolean {
  try { return sessionStorage.getItem(CLAVE_SESION) === ANUNCIO?.id; } catch { return false; }
}
function marcarSesion(id: string) {
  try { sessionStorage.setItem(CLAVE_SESION, id); } catch { /* nada */ }
}

export function HubFlotante() {
  const ruta = usePathname() || "/";
  const [nuevas, setNuevas] = useState(0);
  const [mensaje, setMensaje] = useState(false);
  const pausado = useRef(false);
  const conFormularios = ["/admin", "/afiliate", "/login", "/recuperar", "/panel", "/chat"].some((r) => ruta.startsWith(r));

  useEffect(() => {
    let vigente = true;
    fetch(CONFIG.api("/api/comunidad.php?action=list"), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!vigente) return;
        const posts: Post[] = (j && j.ok && j.data && j.data.posts) || [];
        if (!posts.length) return;
        const masNuevo = posts.reduce((max, p) => (String(p.created_at || "") > max ? String(p.created_at || "") : max), "");
        const visto = leer(CLAVE_VISTO);
        if (ruta.startsWith("/comunidad")) {
          if (masNuevo) guardar(CLAVE_VISTO, masNuevo);
          setNuevas(0);
          return;
        }
        if (!visto) {
          if (masNuevo) guardar(CLAVE_VISTO, masNuevo);
          return;
        }
        setNuevas(posts.filter((p) => (p.aviso === "miembro" || p.aviso === "lote") && String(p.created_at || "") > visto).length);
      })
      .catch(() => { /* sin contador: el botón sigue funcionando */ });
    return () => { vigente = false; };
  }, [ruta]);

  // El aviso: fecha y marcas se leen tras hidratar (el HTML estático no las conoce).
  useEffect(() => {
    if (!ANUNCIO || conFormularios || Date.now() >= Date.parse(ANUNCIO.hasta)) return;
    if (leer(CLAVE_CERRADO) === ANUNCIO.id || enSesion()) return;
    const id = ANUNCIO.id;
    const abrir = window.setTimeout(() => { setMensaje(true); marcarSesion(id); }, 2000);
    return () => window.clearTimeout(abrir);
  }, [ruta, conFormularios]);

  const descartar = () => { if (ANUNCIO) guardar(CLAVE_CERRADO, ANUNCIO.id); setMensaje(false); };

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
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden">
      {mensaje && ANUNCIO && (
        <div
          id="redcafe-mensaje-temporal"
          role="status"
          aria-live="polite"
          onPointerEnter={() => { pausado.current = true; }}
          onPointerLeave={() => { pausado.current = false; }}
          onFocus={() => { pausado.current = true; }}
          onBlur={() => { pausado.current = false; }}
          className="redcafe-mensaje-temporal relative w-[min(19rem,calc(100vw-2.5rem))] border border-white/15 px-4 pb-3 pt-3 text-crema shadow-2xl"
          style={{
            backgroundColor: "#8C1E0E",
            backgroundImage: "radial-gradient(110% 60% at 50% -20%, rgba(202,131,85,.24), rgba(202,131,85,0) 60%), linear-gradient(170deg, rgba(154,44,22,.95), rgba(86,16,8,.97))",
            WebkitBackdropFilter: "blur(12px)",
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            type="button"
            onClick={descartar}
            className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-crema/80 hover:text-crema"
            aria-label="Cerrar mensaje"
          >
            <span aria-hidden="true" className="text-lg leading-none">×</span>
          </button>
          <p className="pr-8 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-acento-claro">{ANUNCIO.rotulo}</p>
          <p className="mt-1 pr-6 text-[0.9375rem] font-semibold leading-snug text-white">{ANUNCIO.titulo}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {ANUNCIO.enlaces.map((e) =>
              e.externo ? (
                <a key={e.href} href={e.href} target="_blank" rel="noopener noreferrer" onClick={descartar} className="inline-flex min-h-11 items-center text-[0.8125rem] font-semibold text-acento-claro underline underline-offset-4">
                  {e.texto} <span aria-hidden="true" className="ml-1">↗</span>
                </a>
              ) : (
                <Link key={e.href} href={e.href} onClick={descartar} className="inline-flex min-h-11 items-center text-[0.8125rem] font-semibold text-acento-claro underline underline-offset-4">
                  {e.texto}
                </Link>
              ),
            )}
          </div>
          {/* Piquito que apunta al botón: el mensaje sale de él. */}
          <span aria-hidden="true" className="absolute -bottom-[7px] right-5 h-3 w-3 rotate-45 border-b border-r border-white/15" style={{ backgroundColor: "#561008" }} />
        </div>
      )}
      <Link
        href="/comunidad/"
        aria-label={etiqueta}
        className={`group relative grid h-14 w-14 place-items-center rounded-full bg-cereza text-white shadow-latte transition hover:bg-cereza/90 ${mensaje ? "motion-safe:animate-pulse ring-4 ring-acento-claro/60" : ""}`}
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
