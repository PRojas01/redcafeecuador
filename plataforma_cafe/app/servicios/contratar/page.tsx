import { Suspense } from "react";
import ContratarInner from "./ClientPage";

export const metadata = {
  alternates: { canonical: "/servicios/contratar/" },
  robots: { index: false, follow: false },
  title: { absolute: "Contratar servicios de Red Café Ecuador" },
  description: "Solicita asesorías, capacitaciones, certificaciones y logística para el sector cafetero.",
};

export default function ContratarServicioPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16 text-center text-pizarra/60">Cargando...</div>}>
      <ContratarInner />
    </Suspense>
  );
}
