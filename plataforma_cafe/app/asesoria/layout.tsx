import type { ReactNode } from "react";

// La página es de cliente y no puede exportar `metadata`: sin este archivo
// heredaba el título y el canonical de la portada.
export const metadata = {
 title: "Asesoría para el negocio del café",
 description: "Asesoría técnica, comercial y de exportación para productores, tostadores y cafeterías del Ecuador.",
 alternates: { canonical: "/asesoria/" },
};

export default function Layout({ children }: { children: ReactNode }) {
 return children;
}
