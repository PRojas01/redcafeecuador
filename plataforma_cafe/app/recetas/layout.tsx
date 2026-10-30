import type { ReactNode } from "react";

export const metadata = {
  title: "Recetas de café — métodos de preparación",
  description: "V60, prensa francesa, moka, cold brew, aeropress y espresso: ratios, molienda, temperatura y pasos.",
  alternates: { canonical: "/recetas/" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
