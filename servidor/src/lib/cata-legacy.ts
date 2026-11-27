// Solicitudes de cata que ya existían cuando el servicio pasó a Legacy
// (27-nov-2026): «Informe de catación» de la Red → servicio de muestras de
// Legacy (/servicios/analisis-de-muestras/). Se ejecuta al arrancar y es
// idempotente: marca cada solicitud con `cata_legacy_at`.
//
// Reversible: lo que se cambia queda guardado en `cata_legacy_antes`
// (nombre y precio anteriores). Lo que ya se pagó o se completó conserva su
// precio: solo recibe el nuevo nombre y la nota.
import { listar, mutar, type Doc } from "./docs.js";
import { nowIso, str } from "./util.js";

export const CATA_ID = "cert-catacion";
export const CATA_NOMBRE = "Servicio de cata: análisis de muestras (Legacy)";
export const CATA_NOTA =
  "El servicio de cata ahora lo hace y lo cobra Legacy: 50 USD más impuestos por muestra (400 g de café verde trillado). " +
  "Procedimiento y solicitud por WhatsApp en https://redcafeecuador.com/servicios/analisis-de-muestras/";

const esCata = (d: Doc) => str(d.servicio_id ?? d.servicioId) === CATA_ID;
const abierta = (estado: unknown) => ["pendiente", "solicitado", ""].includes(str(estado).toLowerCase());

/** Devuelve la solicitud actualizada, o la misma si no corresponde. */
export function actualizarSolicitudCata(d: Doc, ahora = nowIso()): Doc {
  if (!esCata(d) || d.cata_legacy_at) return d;
  const nombreCampo = "servicio_nombre" in d || !("servicio" in d) ? "servicio_nombre" : "servicio";
  const precioCampo = "precio" in d ? "precio" : "total" in d ? "total" : null;
  const antes: Doc = { [nombreCampo]: d[nombreCampo] ?? null };
  const nuevo: Doc = { ...d, [nombreCampo]: CATA_NOMBRE, nota_servicio: CATA_NOTA, cata_legacy_at: ahora };
  if (precioCampo && abierta(d.estado)) {
    antes[precioCampo] = d[precioCampo] ?? null;
    nuevo[precioCampo] = precioCampo === "total" ? 50 * Math.max(1, Number(d.cantidad) || 1) : 50;
  }
  nuevo.cata_legacy_antes = antes;
  return nuevo;
}

/** Aplica el cambio en «ordenes» (servicios pagados) y «pedidos» (solicitudes). */
export async function actualizarSolicitudesCata(): Promise<number> {
  let n = 0;
  for (const col of ["ordenes", "pedidos"]) {
    if (!(await listar(col)).some((d) => esCata(d) && !d.cata_legacy_at)) continue;
    await mutar(col, (l) => l.map((d) => {
      const r = actualizarSolicitudCata(d);
      if (r !== d) n++;
      return r;
    }));
  }
  return n;
}
