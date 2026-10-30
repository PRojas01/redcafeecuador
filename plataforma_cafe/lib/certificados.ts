/**
 * Informes técnicos de la Red.
 *
 * QUÉ EMITE Y QUÉ NO
 * La Red NO certifica. Un catador que aplica metodología SCA no convierte un
 * documento de esta plataforma en un certificado SCA, y el expediente EUDR no es
 * una certificación oficial de cumplimiento: la debida diligencia la declara el
 * importador europeo en el sistema de la Unión, y responde él por ella.
 *
 * Lo que se emite aquí son INFORMES TÉCNICOS firmados, numerados y verificables
 * dentro de la Red. Eso es defendible; llamarlo certificado no lo es.
 *
 * Los identificadores internos (TipoCertificado, emitirCertificado, la clave de
 * almacenamiento) conservan el nombre antiguo a propósito: renombrarlos no aporta
 * nada visible al usuario y rompería los datos ya guardados en el navegador.
 */

export type TipoCertificado = "eudr" | "verificacion" | "catacion" | "trazabilidad";

export type EstadoCertificado = "pendiente" | "en_revision" | "emitido" | "rechazado";

export interface Certificado {
  id: string;
  numero: string; // RC-XXXXXX-YYYY (único, visible en el documento)
  codigo: string; // hash de verificación pública
  tipo: TipoCertificado;
  titulo: string;
  finca: string;
  provincia: string;
  lote: string;
  solicitante: string; // nombre del productor/miembro
  email: string;
  fechaSolicitud: string; // ISO
  fechaEmision?: string; // ISO
  fechaVencimiento?: string; // ISO
  estado: EstadoCertificado;
  emisor: string; // "Red Café Ecuador" o nombre del verificador
  emisorCredencial?: string; // p.ej. "Q Grader #EC-0182" o "Verificador de la Red"
  notas?: string;
  datos: Record<string, string>; // campos específicos (GPS, score, métodos, etc.)
}

const KEY = "redcafe_certificados";

export const TITULOS_TIPO: Record<TipoCertificado, string> = {
  eudr: "Dossier de Trazabilidad EUDR",
  verificacion: "Verificación de miembro de la Red",
  catacion: "Informe de Catación",
  trazabilidad: "Informe de Trazabilidad de Lote",
};

function numeroAleatorio(): string {
  const n = Math.random().toString(36).slice(2, 8).toUpperCase();
  const y = new Date().getFullYear();
  return `RC-${n}-${y}`;
}

function codigoVerificacion(numero: string): string {
  let h = 0;
  for (let i = 0; i < numero.length; i++) {
    h = (h << 5) - h + numero.charCodeAt(i);
    h |= 0;
  }
  return "RC-" + Math.abs(h).toString(16).toUpperCase().padStart(8, "0") + "-EC";
}

export function guardarCertificados(lista: Certificado[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(lista));
  } catch {
    /* noop */
  }
}

export function leerCertificados(): Certificado[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Certificado[]) : [];
  } catch {
    return [];
  }
}

export function solicitarCertificado(
  p: Omit<Certificado, "id" | "numero" | "codigo" | "fechaSolicitud" | "estado" | "emisor">
): Certificado {
  const numero = numeroAleatorio();
  const cert: Certificado = {
    ...p,
    id: Math.random().toString(36).slice(2, 10),
    numero,
    codigo: codigoVerificacion(numero),
    fechaSolicitud: new Date().toISOString(),
    estado: "pendiente",
    emisor: "",
  };
  guardarCertificados([...leerCertificados(), cert]);
  return cert;
}

export function actualizarCertificado(id: string, patch: Partial<Certificado>): Certificado[] {
  const lista = leerCertificados().map((c) => (c.id === id ? { ...c, ...patch } : c));
  guardarCertificados(lista);
  return lista;
}

// Emite el certificado: lo firma el emisor con su credencial.
export function emitirCertificado(
  id: string,
  emisor: string,
  emisorCredencial: string,
  notas?: string
): Certificado[] {
  const hoy = new Date();
  const vence = new Date(hoy);
  vence.setFullYear(vence.getFullYear() + 1);
  return actualizarCertificado(id, {
    estado: "emitido",
    emisor,
    emisorCredencial,
    notas,
    fechaEmision: hoy.toISOString(),
    fechaVencimiento: vence.toISOString(),
  });
}

export function rechazarCertificado(id: string, notas?: string): Certificado[] {
  return actualizarCertificado(id, { estado: "rechazado", notas });
}

export function verificarCodigoPublico(codigo: string): Certificado | null {
  const limpio = codigo.trim().toUpperCase();
  return (
    leerCertificados().find((c) => c.codigo.toUpperCase() === limpio && c.estado === "emitido") ??
    null
  );
}

export function listarPorTipo(tipo: TipoCertificado): Certificado[] {
  return leerCertificados().filter((c) => c.tipo === tipo);
}

export function formatearFecha(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function etiquetaEstado(e: EstadoCertificado): { texto: string; clase: string } {
  switch (e) {
    case "pendiente":
      return { texto: "Solicitado", clase: "border-cereza/40 bg-cereza/10 text-cereza" };
    case "en_revision":
      return { texto: "En revisión", clase: "border-latte/50 bg-latte/10 text-cafe" };
    case "emitido":
      return { texto: "Emitido", clase: "border-hoja/50 bg-hoja/10 text-hoja" };
    case "rechazado":
      return { texto: "Rechazado", clase: "border-pizarra/30 bg-pizarra/10 text-pizarra" };
  }
}