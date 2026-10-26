import type { ReactNode } from "react";

export const metadata = {
  title: "Laboratorio de catación y calidad",
  description: "Catación SCA, puntajes y control de calidad para lotes de café ecuatoriano.",
  alternates: { canonical: "/laboratorio/" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
