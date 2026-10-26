import ClientPage from "./ClientPage";

export const metadata = {
 title: "Dossier EUDR para fincas cafetaleras",
 description: "Genera y verifica expedientes de trazabilidad para lotes de café. No es una certificación oficial de cumplimiento EUDR.",
 alternates: { canonical: "/servicios/eudr/" },
 openGraph: {
  title: "Dossier EUDR · Red Café Ecuador",
  description: "Genera y verifica expedientes de trazabilidad para lotes de café. No es una certificación oficial de cumplimiento EUDR.",
  url: "/servicios/eudr/",
 },
};

export default function EudrPage() {
 return <ClientPage />;
}
