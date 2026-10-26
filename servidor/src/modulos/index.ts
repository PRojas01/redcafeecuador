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
import { requerimientos } from "./requerimientos.js";
import { empleos } from "./empleos.js";
import { buscoEmpleo } from "./busco-empleo.js";
import { cotizaciones } from "./cotizaciones.js";
import { ratings } from "./ratings.js";
import { servicios } from "./servicios.js";
import { verificaciones } from "./verificaciones.js";
import { menu } from "./menu.js";
import { inventario } from "./inventario.js";
import { stats } from "./stats.js";
import { actividad } from "./actividad.js";
import { precios, preciosRefresh } from "./precios.js";
import { guias } from "./guias.js";
import { recordatorios } from "./recordatorios.js";
import { socios } from "./socios.js";
import { contenido } from "./contenido.js";
import { cms } from "./cms.js";
import { visual } from "./visual.js";
import { uploads } from "./uploads.js";
import { imagenes } from "./imagenes.js";
import { media } from "./media.js";

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
  requerimientos,
  empleos,
  "busco-empleo": buscoEmpleo,
  cotizaciones,
  ratings,
  servicios,
  verificaciones,
  menu,
  inventario,
  stats,
  actividad,
  precios,
  "precios-refresh": preciosRefresh,
  guias,
  recordatorios,
  socios,
  contenido,
  cms,
  visual,
  uploads,
  imagenes,
  media,
};
