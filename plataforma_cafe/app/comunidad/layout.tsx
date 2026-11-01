import type { ReactNode } from "react";

export const metadata = {
  title: "Comunidad de la Red Café Ecuador",
  description: "Conversación entre productores, tostadores, baristas y compradores del café ecuatoriano.",
  alternates: { canonical: "/comunidad/" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
