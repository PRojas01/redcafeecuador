// Cómo se muestra un lote: lo comparten la ficha (/marketplace/<id>/) y las
// tarjetas del marketplace. Antes vivía en la capa propia
// (redcafe-v60-mejoras-obligatorias.js); ahora hay una sola copia, aquí.

export type Documento = { url?: string; titulo?: string; formato?: string };
export type Contacto = { nombre?: string; whatsapp?: string; whatsapp_link?: string; email?: string; verificado?: boolean };
export type LoteApi = Record<string, unknown> & {
  id?: string;
  finca?: string;
  nombre?: string;
  variedad?: string;
  proceso?: string;
  productor?: string;
  provincia?: string;
  canton?: string;
  descripcion?: string;
  imagenes?: unknown[];
  documentos?: Documento[];
  contacto?: Contacto;
  ficha_restringida?: boolean;
  demo?: boolean;
  ejemplo?: boolean;
  oculto?: boolean;
  verificado?: boolean;
  verificado_por?: string;
  verificado_en?: string;
  oficial_redcafe?: boolean;
  ubicacion_aproximada?: boolean;
  created_at?: string;
  productor_id?: string;
  published_by?: string;
  categoria?: string;
  lat?: number | string;
  lng?: number | string;
};

export const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));
export const n = (v: unknown) => Number(v || 0);

/** Texto del mensaje de WhatsApp, con la referencia de la Red si su ayudante cargó. */
export function msgWhatsapp(texto: string, tipo: string, id: string) {
  if (typeof window === "undefined") return encodeURIComponent(texto);
  const w = window as unknown as { redcafeMensajeWhatsapp?: (t: string, tipo: string, id: string) => string };
  return typeof w.redcafeMensajeWhatsapp === "function" ? w.redcafeMensajeWhatsapp(texto, tipo, id) : encodeURIComponent(texto);
}

export function loteImagen(lote: LoteApi) {
  const propia = (Array.isArray(lote.imagenes) ? lote.imagenes : []).map(s).find((u) => u.indexOf("/uploads/user-content/") === 0);
  if (propia) return propia;
  const porEstado: Record<string, string> = {
    cereza: "/img/proceso/cereza.webp",
    bellota: "/img/proceso/secado.webp",
    pergamino: "/img/proceso/pergamino.webp",
    oro: "/img/proceso/verde.webp",
    tostado: "/img/proceso/tostado.webp",
  };
  const estado = s(lote.estado).toLowerCase();
  if (porEstado[estado]) return porEstado[estado];
  const proceso = s(lote.proceso).toLowerCase();
  if (proceso.includes("natural")) return "/img/proceso/secado.webp";
  if (proceso.includes("honey")) return "/img/proceso/pergamino.webp";
  return "/img/proceso/verde.webp";
}

export const ETIQUETA_DISPONIBILIDAD: Record<string, string> = { agotado: "Agotado", reservado: "Reservado" };
export function disponibilidadLote(lote: LoteApi) {
  const d = s(lote.disponibilidad).toLowerCase();
  if (d === "agotado" || d === "reservado" || d === "disponible") return d;
  return n(lote.stockSacos || lote.unidades) > 0 ? "disponible" : "agotado";
}
export const esLoteDemo = (lote: LoteApi) => !!(lote.demo || lote.ejemplo);
export const esTerminado = (lote: LoteApi) => s(lote.categoria) === "terminado";
export function esSiembraLote(lote: LoteApi) {
  if (lote.siembra) return true;
  const e = s(lote.estado).toLowerCase();
  return e === "semilla" || e === "plantula";
}

export function presentacionLote(lote: LoteApi) {
  const g = n(lote.pesoGramos);
  if (!g) return "";
  return g >= 1000 ? (g / 1000).toFixed(g % 1000 ? 1 : 0) + " kg" : g + " g";
}

export function alturaLegible(lote: LoteApi) {
  const v = lote.altura;
  if (v === undefined || v === null || v === "") return "";
  const num = Number(v);
  return Number.isFinite(num) && num >= 300 && num <= 2600 ? `${num} msnm` : "Altura por confirmar";
}

export function textoVerificado(item: { verificado?: boolean; oficial_redcafe?: boolean; verificado_por?: string; verificado_en?: string }) {
  if (!item.verificado || item.oficial_redcafe) return null;
  const quien = item.verificado_por || "la administración";
  let cuando = "";
  if (item.verificado_en) {
    const f = new Date(Date.parse(item.verificado_en));
    if (!isNaN(f.getTime())) cuando = " el " + f.toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
  }
  return "Revisado por " + quien + cuando;
}

/** Sin acentos ni mayúsculas, para comparar textos. */
export function normalizar(v: unknown) {
  return s(v)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const QUINTAL_LB = 100;
/** «saco de 69 lb · ≈ $ X por quintal» cuando el precio va por saco. */
export function equivalenciaQuintal(lote: LoteApi): { texto: string; falta: boolean } | null {
  if (esTerminado(lote) || esSiembraLote(lote)) return null;
  const saco = n(lote.precioSaco);
  const quintal = n(lote.precioQuintal);
  if (quintal > 0 || saco <= 0) return null;
  const peso = n(lote.pesoSacoLb);
  if (peso > 0) return { texto: `saco de ${peso} lb · ≈ $ ${Math.round(((saco * QUINTAL_LB) / peso) * 100) / 100} por quintal`, falta: false };
  return { texto: "peso del saco sin indicar", falta: true };
}

/* Orden del listado. «Más reciente»: fecha de publicación, agotados al final.
   «Recomendados»: primero foto real + puntaje, luego uno de los dos, luego el resto. */
function nivelConfianza(l: LoteApi) {
  const conFoto = loteImagen(l).indexOf("/uploads/user-content/") === 0;
  const conPuntaje = n(l.score) > 0;
  return conFoto && conPuntaje ? 2 : conFoto || conPuntaje ? 1 : 0;
}
export function ordenRecientes(lotes: LoteApi[]) {
  return lotes
    .map((l, i) => ({ l, i }))
    .sort((a, b) => {
      const ag = (x: LoteApi) => (disponibilidadLote(x) === "agotado" ? 1 : 0);
      if (ag(a.l) !== ag(b.l)) return ag(a.l) - ag(b.l);
      const fa = s(a.l.created_at), fb = s(b.l.created_at);
      if (fa !== fb) return fa < fb ? 1 : -1;
      const ia = s(a.l.id), ib = s(b.l.id);
      if (ia !== ib) return ia < ib ? 1 : -1;
      return a.i - b.i;
    })
    .map((x) => x.l);
}
export function ordenRecomendados(lotes: LoteApi[]) {
  const ordenado = lotes
    .map((l, i) => ({ l, i }))
    .sort((a, b) => nivelConfianza(b.l) - nivelConfianza(a.l) || a.i - b.i)
    .map((x) => x.l);
  return [...ordenado.filter((l) => disponibilidadLote(l) !== "agotado"), ...ordenado.filter((l) => disponibilidadLote(l) === "agotado")];
}
