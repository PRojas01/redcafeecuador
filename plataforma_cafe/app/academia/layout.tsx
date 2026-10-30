import type { ReactNode } from "react";

export const metadata = {
  title: "Academia del café — cursos y formación",
  description: "Cursos de producción, post-cosecha, catación, tueste y comercialización para el sector cafetero ecuatoriano.",
  alternates: { canonical: "/academia/" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
