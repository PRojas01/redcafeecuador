/* Fotos de portada de los cursos gratis y de las recetas.
   Fotos libres de Pexels (licencia Pexels: uso comercial sin atribución obligatoria);
   autor y enlace de cada una en sitio/img/cursos/CREDITOS.txt y sitio/img/recetas/CREDITOS.txt.
   Las sirve el sitio en webp (1280×720). Si un curso o receta nueva no tiene foto,
   cada página usa su imagen de siempre. */
export type Foto = { src: string; alt: string };

export const FOTOS_CURSOS: Record<string, Foto> = {
  "buenas-practicas": { src: "/img/cursos/buenas-practicas.webp", alt: "Caficultor con sombrero revisa las plantas de café en su cafetal" },
  postcosecha: { src: "/img/cursos/postcosecha.webp", alt: "Productor remueve el café que se seca al sol sobre camas elevadas" },
  "ventas-comercial": { src: "/img/cursos/ventas-comercial.webp", alt: "Productor muestra granos y cerezas de café sobre una mesa para negociar" },
  formalizacion: { src: "/img/cursos/formalizacion.webp", alt: "Manos anotando cuentas en un cuaderno junto a una calculadora" },
  tueste: { src: "/img/cursos/tueste.webp", alt: "Café recién tostado girando en la bandeja de enfriamiento de una tostadora" },
  trazabilidad: { src: "/img/cursos/trazabilidad.webp", alt: "Agricultor en su campo registra datos en una tableta" },
  "cafe-especial": { src: "/img/cursos/cafe-especial.webp", alt: "Catadores evalúan muestras de café en una mesa de catación" },
  "manejo-plagas": { src: "/img/cursos/manejo-plagas.webp", alt: "Mano revisa las ramas y hojas de un cafeto con cerezas maduras" },
  exportacion: { src: "/img/cursos/exportacion.webp", alt: "Grúas y contenedores en un puerto de carga al atardecer" },
  "cafe-de-especialidad-de-la-finca-a-la-taza": { src: "/img/cursos/cafe-de-especialidad-de-la-finca-a-la-taza.webp", alt: "Manos llenas de cerezas de café rojas y amarillas recién cosechadas" },
};

export const FOTOS_RECETAS: Record<string, Foto> = {
  v60: { src: "/img/recetas/v60.webp", alt: "Barista prepara café filtrado con un gotero V60 rojo" },
  "prensa-francesa": { src: "/img/recetas/prensa-francesa.webp", alt: "Prensa francesa con café, taza y azucarero sobre una bandeja de mimbre" },
  "moka-italiana": { src: "/img/recetas/moka-italiana.webp", alt: "Cafetera moka italiana sobre la hornilla de una cocina a gas" },
  "cold-brew": { src: "/img/recetas/cold-brew.webp", alt: "Botella y vaso de cold brew con hielo sobre una bandeja" },
  aeropress: { src: "/img/recetas/aeropress.webp", alt: "Barista presiona una Aeropress sobre una jarra de vidrio" },
  "espresso-casero": { src: "/img/recetas/espresso-casero.webp", alt: "Espresso cayendo de la máquina en una taza blanca" },
};
