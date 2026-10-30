import { randomUUID } from "node:crypto";
import { agregar, type Doc } from "./docs.js";
import { fail, type Ctx } from "./http.js";

export const DERECHOS_VERSION = "derechos-v1";
export const DERECHOS_TEXTO = "Declaro que tengo los derechos sobre este contenido y asumo la responsabilidad ante cualquier reclamo de terceros.";

export async function exigirDerechos(ctx: Ctx, u: Doc, contexto: string, objetoId?: unknown) {
  const valor = ctx.in.acepta_derechos;
  if (valor !== true && valor !== "true" && valor !== "1" && valor !== 1) {
    fail("Debes declarar que tienes los derechos sobre este contenido y asumes la responsabilidad.", 422);
  }
  const aceptado_at = new Date().toISOString();
  await agregar("aceptaciones-derechos", {
    id: randomUUID(), uid: u.id, contexto, objeto_id: objetoId ?? null,
    version: DERECHOS_VERSION, aceptado_at, ...(ctx.ip ? { ip: ctx.ip } : {}),
  });
  return { derechos_version: DERECHOS_VERSION, derechos_aceptados_at: aceptado_at, derechos_aceptados_por: u.id };
}
