import FichaMuestras from "./FichaMuestras";

export const metadata = {
  title: "Análisis de muestras de café verde con Legacy",
  description:
    "Recepción de muestras de café en verde y análisis organoléptico: tostado en 3 curvas, puntaje, recomendación de precio y de procesamiento. 50 USD más impuestos por muestra.",
  alternates: { canonical: "/servicios/analisis-de-muestras/" },
};

export default function Page() {
  return <FichaMuestras />;
}
