import type { ReactNode } from "react";

// app/login/page.tsx es "use client", y una página de cliente no puede exportar
// `metadata`. Antes de este archivo, /login/ heredaba el canonical y el
// openGraph de la portada, así que Google la tenía por duplicada de "/".
export const metadata = {
 title: "Entrar",
 description: "Acceso de miembros de Red Café Ecuador: productores, compradores, tostadores y servicios.",
 alternates: { canonical: "/login/" },
 openGraph: {
  title: "Entrar · Red Café Ecuador",
  description: "Acceso de miembros de Red Café Ecuador: productores, compradores, tostadores y servicios.",
  url: "/login/",
 },
 robots: {
  index: true,
  follow: true,
 },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
 return children;
}