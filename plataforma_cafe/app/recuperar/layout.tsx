import type { ReactNode } from "react";

// La página es de cliente y no puede exportar `metadata`: sin este archivo
// heredaba el título y el canonical de la portada.
export const metadata = {
 title: "Recuperar contraseña",
 alternates: { canonical: "/recuperar/" },
 robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
 return children;
}
