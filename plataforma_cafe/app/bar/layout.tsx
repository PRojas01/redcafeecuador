import type { ReactNode } from "react";

export const metadata = {
  title: "Red Café Bar — historias y cultura del café",
  description: "Reportajes, catas y cultura del café ecuatoriano para barras y cafeterías de la Red.",
  alternates: { canonical: "/bar/" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
