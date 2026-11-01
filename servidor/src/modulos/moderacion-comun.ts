// Port de api/_moderacion.php: catálogo de infracciones, firma de enlaces de
// apelación y vista para la persona sancionada.
import { createHmac, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "../lib/config.js";
import { db } from "../lib/db.js";
import type { Doc } from "../lib/docs.js";
import { fechaMs, str } from "../lib/util.js";

export const MOD_INFRACCIONES: Record<string, { titulo: string; norma: string; gravedad: string }> = {
  "informacion-falsa": { titulo: "Información falsa o suplantación de identidad", norma: "Términos y Condiciones §6 («Publicar información falsa o suplantar identidades») y §3 (datos verídicos en el registro).", gravedad: "grave" },
  manipulacion: { titulo: "Manipulación de precios, puntajes de catación o métricas", norma: "Términos y Condiciones §6 («Manipular precios, scores de catación o métricas de calidad»).", gravedad: "media" },
  fraude: { titulo: "Fraude en pagos o en transacciones con otros miembros", norma: "Términos y Condiciones §6 («Defraudar… cualquier mecanismo de pago») y §9 (actividad fraudulenta o ilegal).", gravedad: "muy-grave" },
  acoso: { titulo: "Acoso, amenazas o discriminación a otros miembros", norma: "Términos y Condiciones §6 («Acosar, amenazar o discriminar a otros miembros»).", gravedad: "grave" },
  "actividad-ilicita": { titulo: "Uso de la plataforma para actividades ilícitas", norma: "Términos y Condiciones §6 («Usar la plataforma para actividades ilícitas») y §9.", gravedad: "muy-grave" },
  "acceso-no-autorizado": { titulo: "Intento de acceso a cuentas o datos de otros miembros", norma: "Términos y Condiciones §6 («Intentar acceder a cuentas o datos de otros miembros»); LOPDP art. 7 num. 8 (interés legítimo de seguridad).", gravedad: "muy-grave" },
  "uso-indebido-datos": { titulo: "Uso indebido de datos personales de otros miembros", norma: "Términos y Condiciones §6; LOPDP art. 8 (los datos solo se tratan con consentimiento libre, específico, informado e inequívoco).", gravedad: "grave" },
  spam: { titulo: "Mensajes o publicaciones no solicitadas y repetitivas (spam)", norma: "Términos y Condiciones §9 (incumplimiento de los Términos).", gravedad: "leve" },
  "incumplimiento-pedidos": { titulo: "Incumplimiento reiterado de pedidos aceptados", norma: "Términos y Condiciones §5 (los lotes deben reflejar datos reales; el productor responde por la calidad) y §9.", gravedad: "media" },
};
export const MOD_MEDIDAS_POR_GRAVEDAD: Record<string, string[]> = {
  leve: ["advertencia", "suspension"], media: ["advertencia", "suspension"],
  grave: ["advertencia", "suspension", "bloqueo"], "muy-grave": ["suspension", "bloqueo"],
};
export const MOD_DIAS_MAX_SUSPENSION = 90;
export const MOD_DIAS_APELACION = 10;
export const MOD_PUBLICACIONES: Record<string, { archivo: string; ocultable: boolean; enlace: string }> = {
  lote: { archivo: "lotes", ocultable: true, enlace: "/marketplace/" },
  servicio: { archivo: "servicios-terceros", ocultable: true, enlace: "/marketplace/?ver=servicios" },
  publicacion: { archivo: "posts", ocultable: false, enlace: "/comunidad/" },
  empleo: { archivo: "empleos", ocultable: false, enlace: "/marketplace/?ver=empleos" },
  requerimiento: { archivo: "requerimientos", ocultable: false, enlace: "/marketplace/?ver=requerimientos" },
  busqueda: { archivo: "busquedas-empleo", ocultable: false, enlace: "/marketplace/?ver=empleos" },
};

/** Secreto persistente (equivale a data/.moderacion_secreto). */
export async function secreto(nombre: string): Promise<string> {
  const f = await db.secreto.findUnique({ where: { nombre } });
  let valor = f && f.valor.length >= 32 ? f.valor : "";
  if (!valor) {
    valor = randomBytes(32).toString("hex");
    await db.secreto.upsert({ where: { nombre }, create: { nombre, valor }, update: { valor } });
  }
  // Solo en pruebas: la suite qa/ firma enlaces leyendo data/.<nombre>_secreto, como con PHP.
  if (config.entorno === "prueba") {
    try {
      const dir = path.join(config.sitio, "data");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `.${nombre.replace(/-/g, "_")}_secreto`), valor, { mode: 0o600 });
    } catch { /* sin carpeta de sitio en pruebas unitarias */ }
  }
  return valor;
}

export async function firma(uid: string, sid: string): Promise<string> {
  return createHmac("sha256", await secreto("moderacion")).update(`apelacion|${uid}|${sid}`).digest("hex");
}

export function estadoVigente(s: Doc): string {
  if (s.estado !== "activa") return str(s.estado);
  if (s.hasta && fechaMs(s.hasta) <= Date.now()) return "vencida";
  return "activa";
}

export function vistaPublica(s: Doc) {
  const inf = MOD_INFRACCIONES[s.infraccion] ?? { titulo: s.infraccion, norma: "" };
  return {
    id: s.id, tipo: s.tipo, estado: estadoVigente(s), infraccion: inf.titulo, norma: inf.norma, hechos: s.hechos,
    desde: s.desde, hasta: s.hasta, apelar_hasta: s.apelar_hasta ?? null,
    apelacion: s.apelacion ? { estado: s.apelacion.estado, fecha: s.apelacion.fecha, respuesta: s.apelacion.respuesta ?? null } : null,
  };
}

export async function vistaTitular(s: Doc, uid: string) {
  return { ...vistaPublica(s), apelar: { id: s.id, u: uid, t: await firma(uid, str(s.id)) } };
}
