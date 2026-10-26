// Port de api/twofactor.php (versión corregida).
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "../lib/db.js";
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { cupo } from "../lib/seguridad.js";
import { aDoc, invalidarUsuario, usuarioActual } from "../lib/usuarios.js";
import { enviarCorreo } from "../lib/correo.js";
import { sha256, str, nowIso } from "../lib/util.js";
import { codigoNuevo, hashCodigo, verificarPass } from "./auth.js";

const OTP_TTL = 600_000;
const OTP_MAX_FALLOS = 5;
const N_RESPALDO = 10;

const generarRespaldo = () =>
  Array.from({ length: N_RESPALDO }, () => `${randomBytes(2).toString("hex").toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`);

/** Acepta bcrypt (nuevos) y el sha256+sal fija heredado del PHP. */
async function respaldoValido(codigo: string, guardado: string): Promise<boolean> {
  if (/^\$2[aby]\$/.test(guardado)) return bcrypt.compare(codigo.toUpperCase(), guardado.replace(/^\$2y\$/, "$2b$"));
  return guardado === sha256(codigo + "redcafe_salt_2026");
}

async function guardarRespaldo(usuarioId: string, planos: string[]) {
  const hashes = await Promise.all(planos.map((c) => bcrypt.hash(c, 10)));
  await db.$transaction([
    db.codigoRespaldo.deleteMany({ where: { usuarioId } }),
    db.codigoRespaldo.createMany({ data: hashes.map((hash) => ({ usuarioId, hash })) }),
  ]);
}

async function enviarOtp(usuarioId: string, proposito: string, email: string, nombre: string): Promise<boolean> {
  const codigo = codigoNuevo();
  await db.otp.upsert({
    where: { usuarioId_proposito: { usuarioId, proposito } },
    create: { usuarioId, proposito, hash: hashCodigo(codigo), expira: new Date(Date.now() + OTP_TTL) },
    update: { hash: hashCodigo(codigo), expira: new Date(Date.now() + OTP_TTL), fallos: 0 },
  });
  return enviarCorreo("codigo", email, { nombre, code: codigo });
}

/** Comprueba un código OTP vigente y lo consume. Suma fallos y anula tras 5. */
async function consumirOtp(usuarioId: string, proposito: string, codigo: string): Promise<"ok" | "mal" | "agotado" | "sin"> {
  const otp = await db.otp.findUnique({ where: { usuarioId_proposito: { usuarioId, proposito } } });
  if (!otp || otp.expira.getTime() < Date.now()) return "sin";
  if (otp.hash === hashCodigo(codigo)) {
    await db.otp.delete({ where: { id: otp.id } });
    return "ok";
  }
  if (otp.fallos + 1 >= OTP_MAX_FALLOS) {
    await db.otp.delete({ where: { id: otp.id } });
    return "agotado";
  }
  await db.otp.update({ where: { id: otp.id }, data: { fallos: { increment: 1 } } });
  return "mal";
}

const acciones: Modulo["acciones"] = {
  async verify_otp(ctx) {
    if (!(await cupo(ctx, "otp_verify", 5, 600))) fail("Demasiados intentos. Espera 10 minutos.", 429);
    const codigo = str(ctx.in.code).trim();
    const pendiente = ctx.ses.d.pendiente2fa;
    if (!pendiente) fail("No hay verificación pendiente. Inicia sesión primero.", 400);
    const esOtp = /^[0-9]{6}$/.test(codigo);
    const esRespaldo = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(codigo);
    if (!esOtp && !esRespaldo) fail("Código inválido.");

    let ok = false;
    if (esOtp) {
      const r = await consumirOtp(pendiente, "login", codigo);
      if (r === "agotado") fail("Demasiados códigos incorrectos. Pide un código nuevo.", 401);
      ok = r === "ok";
    } else {
      // Cada código de respaldo sirve una vez: se borra en la misma transacción.
      ok = await db.$transaction(async (tx) => {
        const codigos = await tx.codigoRespaldo.findMany({ where: { usuarioId: pendiente } });
        for (const c of codigos) {
          if (await respaldoValido(codigo, c.hash)) {
            await tx.codigoRespaldo.delete({ where: { id: c.id } });
            return true;
          }
        }
        return false;
      });
    }
    if (!ok) fail("Código incorrecto o expirado.", 401);
    const fila = await db.usuario.findUnique({ where: { id: pendiente } });
    if (!fila) fail("Usuario no encontrado.", 404);
    const recordar = !!ctx.ses.d.datos.recordar2fa;
    const { recordar2fa: _r, ...resto } = ctx.ses.d.datos;
    ctx.ses.regenerar();
    ctx.ses.set({ usuarioId: fila.id, pendiente2fa: null, inicio: new Date(), datos: resto });
    ctx.ses.cookieRecordar(recordar);
    invalidarUsuario(ctx);
    return { user: aDoc(fila), two_factor_used: true };
  },

  async resend_otp(ctx) {
    if (!(await cupo(ctx, "otp_resend", 10, 3600))) fail("Demasiados reenvíos de código seguidos. Vuelve a intentarlo en una hora.", 429);
    const pendiente = ctx.ses.d.pendiente2fa;
    if (!pendiente) fail("No hay verificación pendiente.", 400);
    const fila = await db.usuario.findUnique({ where: { id: pendiente } });
    if (!fila) fail("Usuario no encontrado.", 404);
    const enviado = await enviarOtp(fila.id, "login", fila.email, fila.nombre);
    return { sent: enviado, to: fila.email.slice(0, 3) + "***@" + (fila.email.split("@")[1] ?? "") };
  },

  async enable_2fa(ctx) {
    const u = await usuarioActual(ctx);
    if (!(await cupo(ctx, "otp_enable", 10, 3600))) fail("Demasiados intentos de activar 2FA seguidos. Vuelve a intentarlo en una hora.", 429);
    if (!u) fail("No autenticado.", 401);
    const fila = await db.usuario.findUnique({ where: { id: u.id } });
    if (!fila) fail("Usuario no encontrado.", 404);
    if (fila.dosFactores) fail("2FA ya está activo. Desactívalo primero si quieres reiniciar.");
    await enviarOtp(fila.id, "enable", fila.email, fila.nombre);
    const planos = generarRespaldo();
    await guardarRespaldo(fila.id, planos);
    return {
      sent: true, purpose: "enable", backup_codes: planos,
      message: "Confirma con el código enviado a tu email. Guarda los códigos de respaldo en lugar seguro.",
    };
  },

  async confirm_enable_2fa(ctx) {
    const u = await usuarioActual(ctx);
    if (!u) fail("No autenticado.", 401);
    if (!(await cupo(ctx, "otp_confirm", 10, 600))) fail("Demasiados intentos. Espera 10 minutos.", 429);
    const codigo = str(ctx.in.code).trim();
    if (!/^[0-9]{6}$/.test(codigo)) fail("Código inválido.");
    const r = await consumirOtp(u.id, "enable", codigo);
    if (r === "sin") fail("Código expirado. Solicita uno nuevo.");
    if (r !== "ok") fail("Código incorrecto.", 401);
    await db.usuario.update({ where: { id: u.id }, data: { dosFactores: true, dosFactoresEn: new Date() } });
    return { enabled: true };
  },

  async disable_2fa(ctx) {
    const u = await usuarioActual(ctx);
    if (!u) fail("No autenticado.", 401);
    if (!(await cupo(ctx, "otp_disable", 10, 600))) fail("Demasiados intentos. Espera 10 minutos.", 429);
    const codigo = str(ctx.in.code).trim();
    const fila = await db.usuario.findUnique({ where: { id: u.id } });
    if (!fila?.dosFactores) fail("2FA no está activo.");
    if (/^[0-9]{6}$/.test(codigo)) {
      const r = await consumirOtp(u.id, "login", codigo);
      if (r !== "ok") fail("Código incorrecto.", 401);
    } else if (!(await verificarPass(codigo, fila.passHash))) {
      fail("Contraseña incorrecta.", 401);
    }
    await db.$transaction([
      db.usuario.update({ where: { id: u.id }, data: { dosFactores: false, dosFactoresEn: new Date() } }),
      db.codigoRespaldo.deleteMany({ where: { usuarioId: u.id } }),
    ]);
    return { disabled: true };
  },

  async regenerate_backup(ctx) {
    const u = await usuarioActual(ctx);
    if (!u) fail("No autenticado.", 401);
    if (!(await cupo(ctx, "otp_regenerate", 10, 600))) fail("Demasiados intentos. Espera 10 minutos.", 429);
    const fila = await db.usuario.findUnique({ where: { id: u.id } });
    if (!fila?.dosFactores) fail("Activa 2FA primero.");
    const r = await consumirOtp(u.id, "login", str(ctx.in.code).trim());
    if (r !== "ok") fail("Código OTP incorrecto.", 401);
    const planos = generarRespaldo();
    await guardarRespaldo(u.id, planos);
    return { backup_codes: planos };
  },

  async status(ctx) {
    const u = await usuarioActual(ctx);
    if (!u) fail("No autenticado.", 401);
    const fila = await db.usuario.findUnique({ where: { id: u.id } });
    if (!fila) fail("Usuario no encontrado.", 404);
    return {
      enabled: fila.dosFactores,
      backup_codes_remaining: await db.codigoRespaldo.count({ where: { usuarioId: u.id } }),
      updated_at: fila.dosFactoresEn ? nowIso(fila.dosFactoresEn) : null,
    };
  },
};

export const twofactor: Modulo = { acciones, noValida: { mensaje: "Acción no válida.", codigo: 400 } };
export type { Ctx };
