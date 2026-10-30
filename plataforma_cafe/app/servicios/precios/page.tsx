import PreciosClientPage, { type PrecioResponse } from "./ClientPage";
import preciosGuardados from "./precios-guardados.json";

export const metadata = {
 title: "Panel de precios del café",
 description: "Precio referencial diario del café arábica con gráfico histórico y fuentes oficiales internacionales.",
 alternates: { canonical: "/servicios/precios/" },
 openGraph: {
  title: "Panel de precios del café · Red Café Ecuador",
  description: "Precio referencial diario del café arábica con gráfico histórico y fuentes oficiales internacionales.",
  url: "/servicios/precios/",
 },
};

/*
 * El precio que viaja DENTRO del HTML ya no está escrito a mano.
 *
 * Antes este archivo traía el número fijo en el código (304,90 del 1 de
 * septiembre) y `next build` lo horneaba en el HTML para siempre. El visitante
 * no lo notaba, porque la capa propia lo reemplaza al cargar, pero Google NO
 * ejecuta JavaScript: se llevaba ese número viejo, con un mes de atraso y con
 * el texto de "la fuente oficial no responde" debajo.
 *
 * Ahora el valor sale de precios-guardados.json, que escribe el mismo sistema
 * de siempre — la caché de api/precios.php — con herramientas/actualizar-precios.sh.
 * Ese script se puede correr a diario, y el HTML queda al día con la API.
 * Si el JSON no existe, se muestra un aviso claro en vez de un número viejo:
 * es preferible que el buscador no vea un precio antes que ver uno falso.
 */
const sinPrecioGuardado: PrecioResponse = {
 updated_at: "",
 updated_human: "Sin datos guardados: se está leyendo el precio en vivo",
 precio: {
  valor: 0,
  valor_cents: 0,
  unidad: "USD/quintal",
  mes: "",
  variacion_pct: null,
 },
 fuente: {
  nombre: "KC=F vía Yahoo Finance — respaldo operativo",
  url: "https://finance.yahoo.com/quote/KC=F/",
  periodicidad: "Diaria (último cierre disponible)",
  descripcion:
  "Referencia internacional de mercado. No es el precio oficial de Ecuador ni una cotización en vivo.",
 },
 referencias_oficiales: [],
 historico: [],
 historico_diario: [],
 stale: true,
};

function precioDeConstruccion(): PrecioResponse {
 const guardado = preciosGuardados as Partial<PrecioResponse> | null;
 if (!guardado || !guardado.precio || !guardado.precio.valor || !guardado.updated_at) {
  return sinPrecioGuardado;
 }
 return {
  ...sinPrecioGuardado,
  ...guardado,
  // stale lo decide el script al guardar: si no pudo leer la fuente, lo marca
  // y el HTML avisa, en vez de fingir que el dato es de hoy.
  stale: Boolean(guardado.stale),
 } as PrecioResponse;
}

export default function PreciosPage() {
 return <PreciosClientPage initialData={precioDeConstruccion()} />;
}