import type { SVGProps, JSX } from "react";

export type IconoNombre =
  | "academia"
  | "administracion"
  | "amante"
  | "asesor"
  | "bar"
  | "barista"
  | "calculadora"
  | "chat"
  | "comprador"
  | "comunidad"
  | "exportador"
  | "laboratorio"
  | "logistica"
  | "marketplace"
  | "media"
  | "noticias"
  | "pilador"
  | "precio"
  | "productor"
  | "proveedor"
  | "tostador"
  | "ubicacion"
  | "verificacion";

type Props = SVGProps<SVGSVGElement> & {
  nombre: IconoNombre;
  title?: string;
};

const paths: Record<IconoNombre, JSX.Element> = {
  academia: (
    <>
      <path d="M4 6.5h7a3 3 0 0 1 3 3v9a3 3 0 0 0-3-3H4z" />
      <path d="M20 6.5h-6a3 3 0 0 0-3 3v9a3 3 0 0 1 3-3h6z" />
    </>
  ),
  administracion: (
    <>
      <path d="M7 5.5h10l2 3v10H5v-10z" />
      <path d="M8 11h8M8 14h8M8 17h5" />
    </>
  ),
  amante: (
    <>
      <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M10 6c0-1.2-1.6-1.8-2.2-.8-.4.7 0 1.5 1 2.2.6.4 1.2.6 1.2.6s.6-.2 1.2-.6c1-.7 1.4-1.5 1-2.2C11.6 4.2 10 4.8 10 6Z" />
    </>
  ),
  asesor: (
    <>
      <path d="M5 8.5h14v10H5z" />
      <path d="M9 8.5v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M5 13h14" />
    </>
  ),
  bar: (
    <>
      <path d="M5 8h11v4.5a5.5 5.5 0 0 1-11 0z" />
      <path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16M6 20h10M9 5.5c-.8-.8-.8-1.6 0-2.4M13 5.5c-.8-.8-.8-1.6 0-2.4" />
    </>
  ),
  barista: (
    <>
      <path d="M8 18v-5.5a4 4 0 0 1 8 0V18" />
      <path d="M6 18h12M9 8.5c1.2-1 4.8-1 6 0M10 21h4" />
    </>
  ),
  calculadora: (
    <>
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <path d="M8.5 7h7M9 11h1M12 11h1M15 11h1M9 14h1M12 14h1M15 14h1M9 17h1M12 17h4" />
    </>
  ),
  chat: (
    <>
      <path d="M5 6.5h14v9H9l-4 3z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
  comprador: (
    <>
      <path d="M6 7h12l-1 8H8z" />
      <path d="M9 7a3 3 0 0 1 6 0M9 19h.1M15 19h.1" />
    </>
  ),
  comunidad: (
    <>
      <path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M3.5 20a4.5 4.5 0 0 1 9 0M11.5 20a4.5 4.5 0 0 1 9 0" />
    </>
  ),
  exportador: (
    <>
      <path d="M4 15.5h16l-2.5 3h-11z" />
      <path d="M7 15.5V8l7-3v10.5M14 9h4l2 6.5" />
      <path d="M8 11h3M8 13.5h3" />
    </>
  ),
  laboratorio: (
    <>
      <path d="M9 3.5h6M10 3.5v5l-4.5 8A3 3 0 0 0 8 21h8a3 3 0 0 0 2.5-4.5L14 8.5v-5" />
      <path d="M8 15h8" />
    </>
  ),
  logistica: (
    <>
      <path d="M3.5 8h11v8h-11zM14.5 11h3l3 3v2h-6z" />
      <path d="M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </>
  ),
  marketplace: (
    <>
      <path d="M5 9h14l-1.5 10h-11z" />
      <path d="M8 9a4 4 0 0 1 8 0M9 13h6" />
    </>
  ),
  media: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  noticias: (
    <>
      <path d="M5 5h12a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2z" />
      <path d="M8 9h7M8 12h8M8 15h5" />
    </>
  ),
  pilador: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
  precio: (
    <>
      <path d="M5 17.5 10 12l3 3 6-8" />
      <path d="M15 7h4v4" />
    </>
  ),
  productor: (
    <>
      <path d="M12 20v-8M6 14c3.5 0 6 2.5 6 6M18 14c-3.5 0-6 2.5-6 6" />
      <path d="M7 6.5c3.2.2 5 2 5 5-3.2-.2-5-2-5-5ZM17 6.5c-3.2.2-5 2-5 5 3.2-.2 5-2 5-5Z" />
    </>
  ),
  proveedor: (
    <>
      <path d="M5 9.5h14v9H5z" />
      <path d="M8.5 9.5v-2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M5 13h14M12 13v2.5" />
      <path d="M8.5 18.5v-3M15.5 18.5v-3" />
    </>
  ),
  tostador: (
    <>
      <path d="M5 14c2.5-4 11.5-4 14 0-2.5 4-11.5 4-14 0Z" />
      <path d="M8 14c1.5-1.5 6.5-1.5 8 0M8 8h8M10 5h4" />
    </>
  ),
  ubicacion: (
    <>
      <path d="M12 21s6-5.5 6-11a6 6 0 0 0-12 0c0 5.5 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  verificacion: (
    <>
      <path d="M12 3.5 18 6v5c0 4-2.4 7.4-6 9-3.6-1.6-6-5-6-9V6z" />
      <path d="m8.8 12 2.1 2.1 4.4-4.8" />
    </>
  ),
};

export function Icono({ nombre, title, className = "h-6 w-6", ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[nombre]}
    </svg>
  );
}
