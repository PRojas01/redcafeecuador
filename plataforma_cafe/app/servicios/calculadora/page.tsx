import ClientPage from "./ClientPage";

export const metadata = {
 title: "Calculadora de venta de café",
 description: "Calcula venta bruta, sacos de exportación equivalentes, costos e ingreso neto por lote.",
 alternates: { canonical: "/servicios/calculadora/" },
 openGraph: {
  title: "Calculadora de venta de café · Red Café Ecuador",
  description: "Calcula venta bruta, sacos de exportación equivalentes, costos e ingreso neto por lote.",
  url: "/servicios/calculadora/",
 },
};

export default function CalculadoraPage() {
 return <ClientPage />;
}
