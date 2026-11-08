import type { ReactNode } from "react";

// Visor genérico de los cursos que llegan por la API: el servidor pone en el
// canonical la dirección real del curso (/academia/<id>/).
export const metadata = {
 title: { absolute: "Curso · Red Café Ecuador" },
 alternates: { canonical: "/academia/curso/" },
};

export default function Layout({ children }: { children: ReactNode }) {
 return children;
}
