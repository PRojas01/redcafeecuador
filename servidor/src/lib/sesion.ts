// Sesiones opacas en la base (MySQL) (sustituyen a $_SESSION de PHP).
// La cookie lleva un token aleatorio; la base guarda solo su sha256.
import { randomBytes } from "node:crypto";
import { db } from "./db.js";
import { sha256 } from "./util.js";
import { esProduccion } from "./config.js";

export const COOKIE_SESION = "rc_sesion";
const DIA = 86400_000;
const VIDA_SERVIDOR = 30 * DIA;   // como session.gc_maxlifetime = 30 días
const VIDA_COOKIE_RECORDAR = 30 * DIA;
const VIDA_COOKIE_BASE = 7 * DIA; // session_set_cookie_params lifetime

export interface DatosSesion {
  usuarioId: string | null;
  admin: boolean;
  adminDesde: Date | null;
  pendiente2fa: string | null;
  recordar: boolean;
  inicio: Date | null;
  datos: Record<string, unknown>;
}

export class EstadoSesion {
  private token: string | null = null;
  private hashLeido: string | null = null;
  private cambiado = false;
  private regenerada = false;
  private destruida = false;
  /** El cliente debe recibir cookie de sesión de navegador (sin fecha). */
  private cookieDeSesion = false;
  d: DatosSesion = vacia();

  static async cargar(token: string | undefined): Promise<EstadoSesion> {
    const s = new EstadoSesion();
    if (!token || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return s;
    const fila = await db.sesion.findUnique({ where: { tokenHash: sha256(token) } });
    if (!fila || fila.expira.getTime() < Date.now()) return s;
    s.token = token;
    s.hashLeido = fila.tokenHash;
    s.d = {
      usuarioId: fila.usuarioId,
      admin: fila.admin,
      adminDesde: fila.adminDesde,
      pendiente2fa: fila.pendiente2fa,
      recordar: fila.recordar,
      inicio: fila.inicio,
      datos: (fila.datos as Record<string, unknown>) ?? {},
    };
    return s;
  }

  /** Cambia algo de la sesión (se guarda al final de la petición). */
  set(cambios: Partial<DatosSesion>) {
    Object.assign(this.d, cambios);
    this.cambiado = true;
  }

  /** session_regenerate_id(true): token nuevo, el viejo deja de valer. */
  regenerar() {
    this.regenerada = true;
    this.cambiado = true;
  }

  /** refresh_session_cookie($keepSignedIn) */
  cookieRecordar(recordar: boolean) {
    this.set({ recordar });
    this.cookieDeSesion = !recordar;
  }

  /** $_SESSION = []; session_destroy() */
  destruir() {
    this.d = vacia();
    this.destruida = true;
    this.cambiado = true;
  }

  /** Persiste y devuelve la cabecera Set-Cookie (o null si no hace falta). */
  async guardar(): Promise<string | null> {
    if (!this.cambiado) return null;
    if (this.destruida) {
      if (this.hashLeido) await db.sesion.deleteMany({ where: { tokenHash: this.hashLeido } });
      return cookie("", 0);
    }
    const vacio = !this.d.usuarioId && !this.d.admin && !this.d.pendiente2fa && Object.keys(this.d.datos).length === 0;
    if (vacio && !this.hashLeido) return null;
    if (!this.token || this.regenerada) {
      if (this.hashLeido) await db.sesion.deleteMany({ where: { tokenHash: this.hashLeido } });
      this.token = randomBytes(32).toString("base64url");
      this.hashLeido = null;
    }
    const tokenHash = sha256(this.token);
    const datos = {
      usuarioId: this.d.usuarioId,
      admin: this.d.admin,
      adminDesde: this.d.adminDesde,
      pendiente2fa: this.d.pendiente2fa,
      recordar: this.d.recordar,
      inicio: this.d.inicio,
      datos: this.d.datos as object,
      expira: new Date(Date.now() + VIDA_SERVIDOR),
    };
    await db.sesion.upsert({ where: { tokenHash }, create: { tokenHash, ...datos }, update: datos });
    const vida = this.cookieDeSesion ? null : this.d.recordar ? VIDA_COOKIE_RECORDAR : VIDA_COOKIE_BASE;
    return cookie(this.token, vida);
  }
}

function vacia(): DatosSesion {
  return { usuarioId: null, admin: false, adminDesde: null, pendiente2fa: null, recordar: false, inicio: null, datos: {} };
}

function cookie(valor: string, vidaMs: number | null): string {
  const partes = [`${COOKIE_SESION}=${valor}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  // En local (http://127.0.0.1) los navegadores aceptan Secure; se mantiene
  // siempre, igual que en PHP.
  partes.push("Secure");
  if (vidaMs === 0) partes.push("Max-Age=0");
  else if (vidaMs) partes.push(`Max-Age=${Math.floor(vidaMs / 1000)}`);
  void esProduccion;
  return partes.join("; ");
}

/** Limpieza periódica de sesiones caducadas. */
export async function purgarSesiones() {
  await db.sesion.deleteMany({ where: { expira: { lt: new Date() } } });
}
