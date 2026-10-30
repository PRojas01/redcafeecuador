import type { ReactNode } from "react";

export const metadata = {
  title: "Forma parte de la Red Café Ecuador",
  description: "Crea tu perfil como productor, tostador, cafetería, barista, proveedor o asesor y usa herramientas para el negocio cafetero ecuatoriano.",
  alternates: { canonical: "/afiliate/" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
