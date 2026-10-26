// Registro de módulos: el nombre es el del archivo PHP que reemplazan.
import type { Modulo } from "../lib/http.js";
import { auth } from "./auth.js";
import { twofactor } from "./twofactor.js";
import { members } from "./members.js";
import { lotes } from "./lotes.js";
import { pedidos } from "./pedidos.js";
import { marketplaceServicios } from "./marketplace-servicios.js";
import { comunidad } from "./comunidad.js";
import { reportes } from "./reportes.js";
import { moderacion } from "./moderacion.js";
import { notificaciones } from "./notificaciones.js";
import { chat } from "./chat.js";
import { bandeja } from "./bandeja.js";
import { metricas } from "./metricas.js";

export const modulos: Record<string, Modulo> = {
  auth,
  twofactor,
  members,
  lotes,
  pedidos,
  "marketplace-servicios": marketplaceServicios,
  comunidad,
  reportes,
  moderacion,
  notificaciones,
  chat,
  bandeja,
  metricas,
};
