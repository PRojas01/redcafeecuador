import type { ReactNode } from "react";

export const metadata = {
  title: "Marketplace de café ecuatoriano",
  description: "Explora cómo se publican lotes con finca, variedad, proceso, precio y contacto dentro de Red Café Ecuador.",
  // El canonical="/marketplace/" lo heredan también las fichas /marketplace/<id>/.
 // Eso NO es un defecto: mientras .htaccess:27 siga sirviendo index.html para
 // toda URL de lote, esas URL muestran exactamente el índice, yles está diciendo
 // la verdad al buscador. El defecto real es la reescritura de .htaccess:27, que
 // está pendiente de decidir.
 //
 // Cuando se haga el prerender por lote (o el renderizado en servidor), este
 // layout deja de ser el padre de las fichas y entonces sí habrá que mover el
 // canonical a app/marketplace/[id]/ con un generateMetadata por ficha.
 alternates: { canonical: "/marketplace/" },
 openGraph: {
    title: "Marketplace de café ecuatoriano · Red Café Ecuador",
    description: "Explora cómo se publican lotes con finca, variedad, proceso, precio y contacto dentro de Red Café Ecuador.",
    url: "/marketplace/",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
