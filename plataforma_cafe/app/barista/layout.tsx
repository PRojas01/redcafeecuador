import type { ReactNode } from "react";

// La página es de cliente y no puede exportar `metadata`: sin este archivo
// heredaba el título y el canonical de la portada.
export const metadata = {
 title: "Barista y cafeterías",
 description: "Herramientas y menú para baristas y cafeterías de la red de café ecuatoriano.",
 alternates: { canonical: "/barista/" },
};

export default function Layout({ children }: { children: ReactNode }) {
 return children;
}
