"use client";

// Wrapper fetch para el backend PHP (GoDaddy cPanel). Sesión por cookie.
import { CONFIG } from "@/lib/config";

export interface ApiUser {
  id: string;
  nombre: string;
  email: string;
  rol: "productor" | "vendedor" | "comprador" | "bar" | "barista" | "certificador" | "transportista" | "pilador" | "exportador" | "proveedor" | "amante" | "asesor" | "admin";
  roles?: ("productor" | "vendedor" | "comprador" | "bar" | "barista" | "certificador" | "transportista" | "pilador" | "exportador" | "proveedor" | "amante" | "asesor" | "admin")[];
  plan: string;
  verificado?: boolean;
  created_at?: string;
  telefono?: string;
  whatsapp?: string;
  provincia?: string;
}

export function getStoredSession(): ApiUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("redcafe_sesion") ?? sessionStorage.getItem("redcafe_sesion");
    return raw ? (JSON.parse(raw) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(u: ApiUser | null, keepSignedIn = true) {
  if (typeof window === "undefined") return;
  localStorage.removeItem("redcafe_sesion");
  sessionStorage.removeItem("redcafe_sesion");
  if (!u) return;
  const target = keepSignedIn ? localStorage : sessionStorage;
  target.setItem("redcafe_sesion", JSON.stringify(u));
}

export interface Pedido {
  nro: number;
  tipo?: "cafe" | "servicio";
  loteId: string;
  servicioId?: string;
  servicio?: string;
  finca: string;
  productor: string;
  productor_id?: string;
  proveedor_id?: string;
  published_by?: string | null;
  sacos: number;
  total: number;
  estado: string;
  fecha: string;
  origenRol: string;
  solicitante: string;
  solicitante_id: string;
}

export interface Lote {
  id: string;
  finca: string;
  productor: string;
  productor_id?: string;
  published_by?: string | null;
  provincia: string;
  variedad: string;
  proceso: string;
  altura: number;
  score: number;
  precioQuintal: number;
  precioSaco: number;
  stockSacos: number;
  stockQuintales: number;
  certificacion: string;
  emoji: string;
  ventaMinima: string;
  verificado: boolean;
  ejemplo?: boolean;
  lat?: number;
  lng?: number;
  /** Notas de cata en texto libre. De aquí sale el color del perfil de taza. */
  descripcion?: string;
  imagenes?: string[];
  oculto?: boolean;
  updated_at?: string;
}

export interface MarketplaceServicio {
  id: string;
  titulo: string;
  categoria: "transporte" | "catacion" | "asesoria" | "pilado" | "insumos" | "capacitacion" | "exportacion" | "otro";
  descripcion: string;
  provincia?: string;
  cobertura?: string;
  precio: number;
  unidad: string;
  imagenes?: string[];
  proveedor: string;
  proveedor_id: string;
  proveedor_rol: string;
  proveedor_roles?: string[];
  whatsapp?: string;
  email?: string;
  visibilidad?: "publico" | "registrados";
  verificado?: boolean;
  redcafe?: boolean;
  created_at: string;
  updated_at?: string;
  oculto?: boolean;
}

export interface ChatRoom {
  id: string;
  users: string[];
  with: string;
  relacion?: { tipo: "pedido" | "cotizacion" | "soporte"; ref: string; estado: string };
  last: { text: string; ts: string; from: string } | null;
  unread: number;
}
export interface ChatMessage {
  id: string;
  room: string;
  from: string;
  from_nombre: string;
  text: string;
  ts: string;
}

export interface ChatContact {
  id: string;
  nombre: string;
  rol: string;
  roles?: string[];
  relacion?: { tipo: "pedido" | "cotizacion" | "soporte"; ref: string; estado: string };
}

export interface Post {
  id: string;
  titulo: string;
  text: string;
  autor: string;
  autor_id: string;
  autor_rol: string;
  created_at: string;
  imagenes?: string[];
  likes: string[];
  comments: { id: string; autor: string; autor_id: string; text: string; created_at: string }[];
}

export interface MenuItem {
  id: string;
  owner_id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
}

export type TipoMovimientoInventario = "entrada" | "salida" | "ingreso" | "gasto";

export interface MovimientoInventario {
  id: string;
  owner_id: string;
  fecha: string;
  producto: string;
  cantidad: number;
  unidad: string;
  tipo: TipoMovimientoInventario;
  motivo: string;
  precio: number | null;
  concepto?: string;
  categoria?: string;
  monto?: number | null;
  created_at: string;
}

export interface ProductoInventario {
  producto: string;
  unidad: string;
  minimo: number;
  existencias: number;
  entradas: number;
  salidas: number;
  valor: number | null;
  bajo: boolean;
}

export interface ResumenInventario {
  productos: ProductoInventario[];
  totales: {
    mes: string;
    unidades_vendidas: number;
    ingreso_estimado: number;
    gasto_estimado?: number;
    utilidad_estimada?: number;
    unidades_totales: number;
    ingreso_total: number;
    gasto_total?: number;
    utilidad_total?: number;
  };
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
  /** Cuerpo completo de la respuesta (p. ej. `sancion` cuando el acceso se niega). */
  raw?: Record<string, unknown>;
}

async function call<T = unknown>(path: string, opts: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    const body = await res.json().catch(() => ({}));
    return { ok: !!body.ok, data: body.data, error: body.error, status: res.status, raw: body };
  } catch (e) {
    return { ok: false, error: String(e), status: 0 };
  }
}

const j = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  // --- Auth ---
  register: (
    nombre: string,
    email: string,
    pass: string,
    rol: string,
    plan: string,
    roles?: string[],
    extra?: { telefono?: string; cedula?: string; provincia?: string; visibilidad?: "publico" | "registrados" },
    consents?: { terminos: boolean; privacidad: boolean; uso_datos: boolean; marketing?: boolean }
  ) => {
    const body = {
      nombre, email, pass, rol, roles, plan, ...extra,
      acepta_terminos: consents?.terminos ?? false,
      acepta_privacidad: consents?.privacidad ?? false,
      acepta_uso_datos: consents?.uso_datos ?? false,
      acepta_marketing: consents?.marketing ?? false,
    };
    return call(CONFIG.api("/api/auth.php?action=register"), j(body));
  },
  login: (email: string, pass: string, remember = true) =>
    call(CONFIG.api("/api/auth.php?action=login"), j({ email, pass, remember })),
  logout: () => call(CONFIG.api("/api/auth.php?action=logout"), { method: "POST" }),
  me: () => call(CONFIG.api("/api/auth.php?action=me")),
  passwordResetRequest: (email: string) =>
    call(CONFIG.api("/api/auth.php?action=password_reset_request"), j({ email })),
  passwordResetConfirm: (token: string, newPass: string, confirm: string) =>
    call(CONFIG.api("/api/auth.php?action=password_reset_confirm"), j({ token, new: newPass, confirm })),
  adminLogin: (pass: string, remember = true) =>
    call(CONFIG.api("/api/auth.php?action=admin_login"), j({ pass, remember })),
  adminResetRequest: () => call(CONFIG.api("/api/auth.php?action=admin_reset_request"), { method: "POST" }),
  adminLogout: () => call(CONFIG.api("/api/auth.php?action=admin_logout"), { method: "POST" }),
  adminMe: () => call(CONFIG.api("/api/auth.php?action=admin_me")),

  // --- Cambio de contraseña ---
  changePassword: (current: string, newPass: string, confirm: string) =>
    call(CONFIG.api("/api/auth.php?action=change_password"), j({ current, new: newPass, confirm })),
  adminChangeOwnPassword: (current: string, newPass: string, confirm: string) =>
    call(CONFIG.api("/api/auth.php?action=admin_change_own_password"), j({ current, new: newPass, confirm })),
  adminChangePassword: (id: string, newPass: string, confirm: string) =>
    call(CONFIG.api("/api/auth.php?action=admin_change_password&id=" + encodeURIComponent(id)), j({ new: newPass, confirm })),
  adminResetPassword: (token: string) =>
    call(CONFIG.api("/api/auth.php?action=admin_reset_password"), j({ token })),

  // --- 2FA (usuarios, no admin) ---
  twoFactorVerify: (code: string) =>
    call(CONFIG.api("/api/twofactor.php?action=verify_otp"), j({ code })),
  twoFactorResend: () =>
    call(CONFIG.api("/api/twofactor.php?action=resend_otp"), { method: "POST" }),
  twoFactorCancel: () =>
    call(CONFIG.api("/api/auth.php?action=cancel_2fa"), { method: "POST" }),
  twoFactorStatus: () =>
    call(CONFIG.api("/api/twofactor.php?action=status")),
  twoFactorEnable: () =>
    call(CONFIG.api("/api/twofactor.php?action=enable_2fa"), { method: "POST" }),
  twoFactorConfirmEnable: (code: string) =>
    call(CONFIG.api("/api/twofactor.php?action=confirm_enable_2fa"), j({ code })),
  twoFactorDisable: (codeOrPassword: string) =>
    call(CONFIG.api("/api/twofactor.php?action=disable_2fa"), j({ code: codeOrPassword })),
  twoFactorRegenerateBackup: (code: string) =>
    call(CONFIG.api("/api/twofactor.php?action=regenerate_backup"), j({ code })),

  // --- Members ---
  membersList: () => call(CONFIG.api("/api/members.php?action=list")),
  memberGet: (id: string) => call(CONFIG.api("/api/members.php?action=get&id=" + encodeURIComponent(id))),
  memberUpdate: (data: { nombre: string; email: string; password_actual?: string; telefono?: string; whatsapp?: string; provincia?: string }) =>
    call(CONFIG.api("/api/members.php?action=update"), j(data)),
  memberRolesUpdate: (roles: string[], rol?: string) => call(CONFIG.api("/api/members.php?action=roles_update"), j({ roles, rol: rol ?? roles[0] })),
  memberVerify: (id: string) => call(CONFIG.api("/api/members.php?action=verify"), j({ id })),
  membersAll: () => call(CONFIG.api("/api/members.php?action=all")),

  // --- Pedidos ---
  pedidosList: (rol: string, userId: string) =>
    call(CONFIG.api(`/api/pedidos.php?action=list&rol=${encodeURIComponent(rol)}&user=${encodeURIComponent(userId)}`)),
  pedidoCreate: (data: { loteId: string; finca: string; productor: string; sacos: number; total: number }) =>
    call(CONFIG.api("/api/pedidos.php?action=create"), j(data)),
  pedidoServicioCreate: (data: { servicioId: string; titulo: string; proveedor: string; proveedorId?: string; cantidad?: number; total?: number }) =>
    call(CONFIG.api("/api/pedidos.php?action=create_service"), j(data)),
  pedidoAdvance: (nro: number) => call(CONFIG.api("/api/pedidos.php?action=advance"), j({ nro })),
  pedidoConfirmRecepcion: (nro: number) => call(CONFIG.api("/api/pedidos.php?action=confirm_recepcion"), j({ nro })),

  // --- Lotes ---
  lotesList: () => call(CONFIG.api("/api/lotes.php?action=list")),
  lotesAll: () => call<{ lotes: Lote[] }>(CONFIG.api("/api/lotes.php?action=all")),
  lotePublish: (data: Partial<Lote>) => call(CONFIG.api("/api/lotes.php?action=publish"), j(data)),
  loteUpdate: (id: string, data: Partial<Lote>) => call(CONFIG.api("/api/lotes.php?action=update&id=" + encodeURIComponent(id)), j(data)),
  loteToggleOculto: (id: string) => call(CONFIG.api("/api/lotes.php?action=toggle_oculto&id=" + encodeURIComponent(id)), { method: "POST" }),
  loteDelete: (id: string) => call(CONFIG.api("/api/lotes.php?action=delete&id=" + encodeURIComponent(id)), { method: "POST" }),

  // --- Servicios de terceros en Marketplace ---
  marketplaceServiciosList: () =>
    call<{ servicios: MarketplaceServicio[] }>(CONFIG.api("/api/marketplace-servicios.php?action=list")),
  marketplaceServicioPublish: (data: Partial<MarketplaceServicio>) =>
    call<{ servicio: MarketplaceServicio }>(CONFIG.api("/api/marketplace-servicios.php?action=publish"), j(data)),
  marketplaceServicioUpdate: (id: string, data: Partial<MarketplaceServicio>) =>
    call<{ servicio: MarketplaceServicio }>(CONFIG.api("/api/marketplace-servicios.php?action=update&id=" + encodeURIComponent(id)), j(data)),
  marketplaceServicioDelete: (id: string) =>
    call(CONFIG.api("/api/marketplace-servicios.php?action=delete&id=" + encodeURIComponent(id)), { method: "POST" }),

  // --- Chat ---
  chatRooms: () => call(CONFIG.api("/api/chat.php?action=rooms")),
  chatContacts: () => call<{ members: ChatContact[] }>(CONFIG.api("/api/chat.php?action=contacts")),
  chatOpen: (user: string) => call(CONFIG.api("/api/chat.php?action=open"), j({ user })),
  chatMessages: (room: string, since = "") =>
    call(CONFIG.api(`/api/chat.php?action=messages&room=${encodeURIComponent(room)}${since ? `&since=${encodeURIComponent(since)}` : ""}`)),
  chatSend: (room: string, text: string) => call(CONFIG.api("/api/chat.php?action=send&room=" + encodeURIComponent(room)), j({ text })),

  // --- Comunidad ---
  postsList: () => call(CONFIG.api("/api/comunidad.php?action=list")),
  postCreate: (titulo: string, text: string, imagenes: string[] = []) =>
    call(CONFIG.api("/api/comunidad.php?action=create"), j({ titulo, text, imagenes })),
  postLike: (id: string) => call(CONFIG.api("/api/comunidad.php?action=like"), j({ id })),
  postComment: (id: string, text: string) => call(CONFIG.api("/api/comunidad.php?action=comment"), j({ id, text })),
  postDelete: (id: string) => call(CONFIG.api("/api/comunidad.php?action=delete"), j({ id })),

  // --- Uploads de usuario ---
  uploadImage: async (file: File, context: "comunidad" | "marketplace" | "lote") => {
    try {
      const form = new FormData();
      form.append("context", context);
      form.append("archivo", file);
      const res = await fetch(CONFIG.api("/api/uploads.php?action=image"), {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      return { ok: !!body.ok, data: body.data, error: body.error, status: res.status } as ApiResponse<{ url: string }>;
    } catch (e) {
      return { ok: false, error: String(e), status: 0 } as ApiResponse<{ url: string }>;
    }
  },

  // --- Menu (bar) ---
  menuList: (owner: string) => call(CONFIG.api("/api/menu.php?action=list&owner=" + encodeURIComponent(owner))),
  menuAdd: (data: { nombre: string; descripcion: string; precio: number; categoria: string }) =>
    call(CONFIG.api("/api/menu.php?action=add"), j(data)),
  menuDelete: (id: string) => call(CONFIG.api("/api/menu.php?action=delete&id=" + encodeURIComponent(id)), { method: "POST" }),

  // --- Inventario (ventas y existencias por perfil) ---
  inventarioList: () =>
    call<{ movimientos: MovimientoInventario[] }>(CONFIG.api("/api/inventario.php?action=list")),
  inventarioMovimiento: (data: {
    producto: string;
    cantidad: number;
    unidad: string;
    tipo: TipoMovimientoInventario;
    motivo: string;
    precio?: number | null;
    concepto?: string;
    categoria?: string;
    monto?: number | null;
    minimo?: number | null;
    fecha?: string;
  }) =>
    call<{ movimiento: MovimientoInventario }>(CONFIG.api("/api/inventario.php?action=movimiento"), j(data)),
  inventarioResumen: () =>
    call<ResumenInventario>(CONFIG.api("/api/inventario.php?action=resumen")),
  inventarioEliminar: (id: string) =>
    call(CONFIG.api("/api/inventario.php?action=eliminar"), j({ id })),

  // --- Ratings (valoraciones) ---
  ratingCreate: (ratedId: string, score: number, comentario: string, pedidoNro: number | null = null, tipo = "miembro") =>
    call(CONFIG.api("/api/ratings.php?action=create"), j({ rated_id: ratedId, score, comentario, pedido_nro: pedidoNro, tipo })),
  ratingPromedio: (id: string) => call(CONFIG.api("/api/ratings.php?action=promedio&id=" + encodeURIComponent(id))),

  // --- Servicios / Órdenes ---
  serviciosList: () => call<{ servicios: Array<{ id: string; nombre: string; precio: number; moneda: string; unidad: string; disponible: boolean }> }>(CONFIG.api("/api/servicios.php?action=list")),
  ordenMisOrdenes: () => call<{ ordenes: Array<{ nro: number; servicio_nombre: string; precio: number; estado: string; created_at: string }> }>(CONFIG.api("/api/servicios.php?action=mis_ordenes")),
  ordenAll: () => call<{ ordenes: Array<{ nro: number; servicio_nombre: string; usuario_nombre: string; estado: string; created_at: string }> }>(CONFIG.api("/api/servicios.php?action=all")),
  ordenMarcarPagado: (nro: number, referenciaPago: string) =>
    call(CONFIG.api("/api/servicios.php?action=marcar_pagado"), j({ nro, referencia_pago: referenciaPago })),
  ordenMarcarCompletado: (nro: number) =>
    call(CONFIG.api("/api/servicios.php?action=marcar_completado"), j({ nro })),

  // --- Cotizaciones ---
  cotizacionSolicitar: (destinatarioId: string, mensaje: string, cantidad?: number, unidad?: string, loteId?: string) =>
    call(CONFIG.api("/api/cotizaciones.php?action=solicitar"), j({ destinatario_id: destinatarioId, mensaje, cantidad, unidad, lote_id: loteId })),
  cotizacionEnviar: (nro: number, precioUnitario: number, condiciones: string, respuestaMensaje?: string) =>
    call(CONFIG.api("/api/cotizaciones.php?action=enviar"), j({ nro, precio_unitario: precioUnitario, condiciones, respuesta_mensaje: respuestaMensaje })),
  cotizacionAceptar: (nro: number) =>
    call(CONFIG.api("/api/cotizaciones.php?action=aceptar"), j({ nro })),
  cotizacionRechazar: (nro: number, motivo?: string) =>
    call(CONFIG.api("/api/cotizaciones.php?action=rechazar"), j({ nro, motivo })),
  cotizacionCancelar: (nro: number) =>
    call(CONFIG.api("/api/cotizaciones.php?action=cancelar"), j({ nro })),
  cotizacionMisSolicitadas: () =>
    call<{ cotizaciones: Array<{ nro: number; destinatario_nombre: string; estado: string; precio_unitario: number | null; created_at: string }> }>(CONFIG.api("/api/cotizaciones.php?action=mis_solicitadas")),
  cotizacionMisRecibidas: () =>
    call<{ cotizaciones: Array<{ nro: number; solicitante_nombre: string; estado: string; precio_unitario: number | null; created_at: string }> }>(CONFIG.api("/api/cotizaciones.php?action=mis_recibidas")),
  cotizacionEstadisticas: () =>
    call<{ total: number; por_estado: Record<string, number>; tasa_conversion: number; monto_aceptadas: number }>(CONFIG.api("/api/cotizaciones.php?action=estadisticas")),
  cotizacionAll: () =>
    call<{ cotizaciones: Array<{ nro: number; solicitante_nombre: string; destinatario_nombre: string; estado: string; created_at: string }> }>(CONFIG.api("/api/cotizaciones.php?action=all")),
  cotizacionDetalle: (nro: number) =>
    call(CONFIG.api(`/api/cotizaciones.php?action=detalle&nro=${nro}`)),

  // --- Media (videos y reportajes del hub Bar/Cafetería) ---
  mediaList: (tipo?: "video" | "reportaje") => {
    const q = tipo ? `&tipo=${tipo}` : "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api(`/api/media.php?action=list${q}`));
  },
  mediaCategorias: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api("/api/media.php?action=categorias"));
  },
  mediaRedes: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api("/api/media.php?action=redes"));
  },

  // --- Stats (usuario autenticado) ---
  stats: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api("/api/stats.php?action=stats"));
  },
  statsActividad: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api("/api/stats.php?action=actividad"));
  },

  // --- Admin (CRUD universal) ---
  adminList: (recurso: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api(`/api/admin.php?action=list&recurso=${recurso}`));
  },
  adminCreate: (recurso: string, data: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api(`/api/admin.php?action=create&recurso=${recurso}`), {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  adminUpdate: (recurso: string, id: string, data: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api(`/api/admin.php?action=update&recurso=${recurso}&id=${encodeURIComponent(id)}`), {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  adminDelete: (recurso: string, id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api(`/api/admin.php?action=delete&recurso=${recurso}&id=${encodeURIComponent(id)}`), {
      method: "POST",
      body: "{}",
    });
  },
  adminResetUser: (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api(`/api/admin.php?action=reset_user&id=${encodeURIComponent(id)}`), {
      method: "POST",
      body: "{}",
    });
  },
  adminStatsGlobal: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api("/api/admin.php?action=stats_global"));
  },
  visualGet: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api("/api/visual.php?action=get"));
  },
  visualSaveDraft: (data: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api("/api/visual.php?action=save_draft"), {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  visualPublish: (data: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api("/api/visual.php?action=publish"), {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  visualRollback: (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return call<any>(CONFIG.api(`/api/visual.php?action=rollback&id=${encodeURIComponent(id)}`), {
      method: "POST",
      body: "{}",
    });
  },
};
