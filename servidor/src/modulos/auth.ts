// Port de api/auth.php (versión corregida 20261024a).
import bcrypt from "bcryptjs";
import { createHmac, randomBytes, randomInt } from "node:crypto";
import { db, Prisma } from "../lib/db.js";
import { Cruda, fail, type Ctx, type Modulo } from "../lib/http.js";
import { cupo } from "../lib/seguridad.js";
import { aDoc, cuentaRestringida, invalidarUsuario, requiereAdmin, usuarioActual, validarRoles } from "../lib/usuarios.js";
import { cifrar, huella } from "../lib/pii.js";
import { listar } from "../lib/docs.js";
import { enviarCorreo } from "../lib/correo.js";
import { notificar, notificarAdmins, publicarAvisoComunidad, registrarActividad } from "../lib/avisos.js";
import { config } from "../lib/config.js";
import { escribirPassAdmin, esHash, passAdminGuardada, provisionalCaducada, verificarPassAdmin } from "../lib/admin.js";
import { emailValido, largo, nowIso, sha256, str, textoEntrada, uid } from "../lib/util.js";
import { vistaTitular } from "./moderacion-comun.js";

const REGISTRO_GRATIS_HASTA = "2026-12-31";
const COSTE_BCRYPT = 10;
const PLANES_FABRICA = ["semilla", "cosecha", "origen", "comprador", "granel", "barra", "barista", "certificador", "proveedor", "amante", "transportista", "pilador", "exportador", "asesor"];

export const hashPass = (p: string) => bcrypt.hash(p, COSTE_BCRYPT);
/** password_verify() compatible con los hashes $2y$ de PHP. */
export const verificarPass = (p: string, h: string) => (h && /^\$2[aby]\$/.test(h) ? bcrypt.compare(p, h.replace(/^\$2y\$/, "$2b$")) : Promise.resolve(false));

/** Código de verificación: HMAC con la clave del servidor (no sha256 con sal fija). */
export const hashCodigo = (codigo: string) => createHmac("sha256", config.claveDatos()).update("otp|" + codigo).digest("hex");
export const codigoNuevo = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

async function planValido(plan: unknown): Promise<string> {
  const p = typeof plan === "string" ? plan.trim().toLowerCase() : "";
  if (!p) return "origen";
  const validos = new Set(PLANES_FABRICA);
  for (const col of ["contenido-planes", "planes"]) {
    for (const x of await listar(col)) if (x?.id) validos.add(str(x.id).toLowerCase());
  }
  return validos.has(p) ? p : "origen";
}

const iniciarSesion = (ctx: Ctx, usuarioId: string, recordar: boolean) => {
  ctx.ses.regenerar();
  ctx.ses.set({ usuarioId, pendiente2fa: null, inicio: new Date() });
  ctx.ses.cookieRecordar(recordar);
  invalidarUsuario(ctx);
};

const acciones: Modulo["acciones"] = {
  async register(ctx) {
    if (!(await cupo(ctx, "register", 10, 3600))) fail("Demasiados registros seguidos. Vuelve a intentarlo en una hora.", 429);
    const i = ctx.in;
    const nombre = textoEntrada(i.nombre, 101);
    const email = textoEntrada(i.email, 254).toLowerCase();
    const pass = typeof i.pass === "string" ? i.pass : "";
    const rol0 = typeof i.rol === "string" ? i.rol : "";
    const roles = validarRoles(i.roles ?? [rol0], rol0 || null, true);
    const rol = roles[0];
    const plan = await planValido(i.plan);
    const telefono = textoEntrada(i.telefono, 30);
    const cedula = textoEntrada(i.cedula, 20);
    const provincia = textoEntrada(i.provincia, 80);
    if (telefono && !/^[0-9+()\-\s.]{7,30}$/.test(telefono)) fail("Teléfono inválido.", 422);
    if (cedula && !/^[0-9A-Za-z-]{5,20}$/.test(cedula)) fail("Cédula o RUC inválido.", 422);
    const visibilidad = i.visibilidad === "registrados" ? "registrados" : "publico";
    const acepta = { terminos: !!i.acepta_terminos, privacidad: !!i.acepta_privacidad, usoDatos: !!i.acepta_uso_datos, marketing: !!i.acepta_marketing };
    if (!acepta.terminos || !acepta.privacidad || !acepta.usoDatos) fail("Debes aceptar Términos, Privacidad y Uso de Datos para registrarte.", 422);
    if (largo(nombre) < 2 || largo(nombre) > 100) fail("Nombre: 2-100 caracteres.", 422);
    if (!emailValido(email)) fail("Correo electrónico inválido.", 422);
    if (pass.length < 8) fail("Contraseña mínimo 8 caracteres.", 422);
    if (pass.length > 200) fail("Contraseña demasiado larga.", 422);

    const ahora = nowIso();
    const consentimientos = {
      terminos: { aceptado: true, fecha: ahora, version: "v1" },
      privacidad: { aceptado: true, fecha: ahora, version: "v1" },
      uso_datos: { aceptado: true, fecha: ahora, version: "v1" },
      marketing: { aceptado: acepta.marketing, fecha: ahora, version: "v1" },
    };
    const id = uid();
    try {
      // La restricción única del correo hace atómica la comprobación de duplicados.
      await db.$transaction([
        db.usuario.create({
          data: {
            id, email, nombre, rol, roles, plan, visibilidad, telefono, provincia,
            passHash: await hashPass(pass),
            cedulaCifrada: cifrar(cedula), cedulaHuella: huella(cedula),
            fundador: new Date().toISOString().slice(0, 10) <= REGISTRO_GRATIS_HASTA,
            extra: { consentimientos, created_at: ahora },
          },
        }),
        db.consentimiento.create({
          data: { usuarioId: id, email, ip: ctx.ip, ua: ctx.cabecera("user-agent").slice(0, 200), terminos: true, privacidad: true, usoDatos: true, marketing: acepta.marketing },
        }),
      ]);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") fail("Ese correo ya está registrado.", 409);
      throw e;
    }
    const m = aDoc((await db.usuario.findUnique({ where: { id } }))!);
    await enviarCorreo("welcome", email, { nombre, rol });
    await notificarAdmins("miembro", "Nuevo miembro: " + nombre, "Perfil " + rol + (provincia ? " · " + provincia : "") + ".", "/admin/");
    iniciarSesion(ctx, id, false);
    await registrarActividad(ctx, "miembro-alta", { actor_id: id, actor: nombre, rol, objeto_tipo: "miembro", objeto_id: id, detalle: "Alta con perfil " + rol + (provincia ? " en " + provincia : "") });
    await publicarAvisoComunidad("miembro", m);
    await notificar(id, "sistema", "Te damos la bienvenida a Red Café Ecuador", "Completa tu perfil y publica tu primer lote o servicio desde el panel.", "/panel/");
    return { user: m };
  },

  async login(ctx) {
    const email = str(ctx.in.email).trim().toLowerCase();
    const pass = typeof ctx.in.pass === "string" ? ctx.in.pass : "";
    const recordar = !!ctx.in.remember;
    if (!email || !pass) fail("Correo y contraseña requeridos.", 422);
    if (!(await cupo(ctx, "login", 10, 60))) fail("Demasiados intentos. Espera un minuto.", 429);
    const fila = await db.usuario.findUnique({ where: { email } });
    if (!fila || !(await verificarPass(pass, fila.passHash))) fail("Credenciales inválidas.", 401);

    const r = await cuentaRestringida(ctx, fila.id);
    if (r) {
      if (r.id) fail(r.tipo === "suspension" ? "Tu cuenta está suspendida temporalmente." : "Tu cuenta está bloqueada.", 403, { sancion: await vistaTitular(r, fila.id) });
      fail("Esta cuenta está cerrada o desactivada. Si crees que es un error, escribe a soporte@redcafeecuador.com.", 403, { cuenta: r.tipo });
    }

    if (fila.dosFactores) {
      const codigo = codigoNuevo();
      await db.otp.upsert({
        where: { usuarioId_proposito: { usuarioId: fila.id, proposito: "login" } },
        create: { usuarioId: fila.id, proposito: "login", hash: hashCodigo(codigo), expira: new Date(Date.now() + 600_000) },
        update: { hash: hashCodigo(codigo), expira: new Date(Date.now() + 600_000), fallos: 0 },
      });
      const enviado = await enviarCorreo("codigo", fila.email, { nombre: fila.nombre, code: codigo });
      ctx.ses.regenerar();
      ctx.ses.set({ usuarioId: null, pendiente2fa: fila.id, datos: { ...ctx.ses.d.datos, recordar2fa: recordar } });
      ctx.ses.cookieRecordar(recordar);
      return { requires_2fa: true, to: fila.email.slice(0, 3) + "***", sent: enviado };
    }
    iniciarSesion(ctx, fila.id, recordar);
    return { user: aDoc(fila) };
  },

  async logout(ctx) {
    ctx.ses.destruir();
    return null;
  },

  async cancel_2fa(ctx) {
    ctx.ses.set({ pendiente2fa: null });
    return null;
  },

  async me(ctx) {
    const u = await usuarioActual(ctx);
    const admin = !!ctx.ses.d.admin;
    if (u) return { user: u, requires_2fa: false, admin };
    // Con 2FA pendiente no se entrega el usuario: el panel y la barra llevan
    // a /login para terminar la verificación.
    if (ctx.ses.d.pendiente2fa) return { user: null, requires_2fa: true };
    return { user: null, requires_2fa: false, admin };
  },

  async password_reset_request(ctx) {
    if (!(await cupo(ctx, "password_reset_request", 5, 3600))) fail("Demasiadas solicitudes. Espera una hora.", 429);
    const email = str(ctx.in.email).trim().toLowerCase();
    if (!emailValido(email)) fail("Correo electrónico inválido.", 422);
    const fila = await db.usuario.findUnique({ where: { email } });
    // Se responde igual exista o no la cuenta.
    if (fila) {
      const token = randomBytes(24).toString("hex");
      await db.recuperacionPass.deleteMany({ where: { expira: { lt: new Date() } } });
      await db.recuperacionPass.create({ data: { usuarioId: fila.id, tokenHash: sha256(token), expira: new Date(Date.now() + 3600_000), ip: ctx.ip } });
      await enviarCorreo("password_reset", email, { nombre: fila.nombre || "miembro de la Red", enlace: `${config.dominio}/recuperar/?token=${token}` });
    }
    return { enviado: true };
  },

  async password_reset_confirm(ctx) {
    if (!(await cupo(ctx, "password_reset_confirm", 10, 3600))) fail("Demasiados intentos. Espera una hora.", 429);
    const token = str(ctx.in.token).trim();
    const nueva = str(ctx.in.new);
    if (!token) fail("Token de recuperación requerido.", 422);
    if (nueva.length < 8) fail("La nueva contraseña debe tener mínimo 8 caracteres.", 422);
    if (nueva.length > 200) fail("La nueva contraseña es demasiado larga.", 422);
    if (nueva !== str(ctx.in.confirm)) fail("La confirmación no coincide.", 422);
    const r = await db.recuperacionPass.findUnique({ where: { tokenHash: sha256(token) } });
    if (!r || r.expira.getTime() <= Date.now()) fail("El enlace de recuperación no es válido o ya caducó.", 401);
    await db.$transaction([
      db.usuario.update({ where: { id: r.usuarioId }, data: { passHash: await hashPass(nueva), passCambiadaEn: new Date(), extra: await extraCon(r.usuarioId, { pass_reset_at: nowIso(), updated_at: nowIso() }) } }),
      db.recuperacionPass.deleteMany({ where: { usuarioId: r.usuarioId } }), // un solo uso; anula los demás enlaces
    ]);
    return { changed: true };
  },

  async admin_login(ctx) {
    const pass = str(ctx.in.pass);
    const recordar = !!ctx.in.remember;
    if (!(await cupo(ctx, "admin_login", 20, 600))) fail("Demasiados intentos admin. Espera 10 minutos.", 429);
    if (await provisionalCaducada()) fail("La contraseña provisional caducó. Pide una nueva desde «He olvidado la contraseña».", 401);
    const guardada = await passAdminGuardada();
    if (!(await verificarPassAdmin(pass, guardada))) fail("Contraseña admin incorrecta.", 401);
    if (!esHash(guardada)) await escribirPassAdmin(pass);
    ctx.ses.regenerar();
    ctx.ses.set({ admin: true, adminDesde: new Date() });
    ctx.ses.cookieRecordar(recordar);
    return { admin: true, debe_cambiar_pass: false };
  },

  async admin_logout(ctx) {
    ctx.ses.set({ admin: false, adminDesde: null });
    return null;
  },

  async admin_me(ctx) {
    return { admin: !!ctx.ses.d.admin };
  },

  async change_password(ctx) {
    // Exige sesión completa: con el 2FA pendiente no se cambia la contraseña.
    const u = await usuarioActual(ctx);
    if (!u) fail("No autenticado.", 401);
    if (!(await cupo(ctx, "change_password", 10, 3600))) fail("Demasiados intentos. Espera una hora.", 429);
    const actual = str(ctx.in.current), nueva = str(ctx.in.new);
    if (nueva.length < 8) fail("La nueva contraseña debe tener mínimo 8 caracteres.", 422);
    if (nueva.length > 200) fail("La nueva contraseña es demasiado larga.", 422);
    if (nueva !== str(ctx.in.confirm)) fail("La confirmación no coincide.", 422);
    const fila = await db.usuario.findUnique({ where: { id: u.id } });
    if (!fila) fail("Usuario no encontrado.", 404);
    if (!(await verificarPass(actual, fila.passHash))) fail("La contraseña actual es incorrecta.", 401);
    const ahora = new Date();
    await db.usuario.update({ where: { id: u.id }, data: { passHash: await hashPass(nueva), passCambiadaEn: ahora, extra: await extraCon(u.id, { updated_at: nowIso() }) } });
    // Esta sesión sigue; las demás quedan cerradas.
    ctx.ses.regenerar();
    ctx.ses.set({ inicio: new Date(ahora.getTime() + 1) });
    return { changed: true };
  },

  async admin_change_password(ctx) {
    requiereAdmin(ctx);
    const id = str(ctx.in.id ?? ctx.query.id);
    const nueva = str(ctx.in.new);
    if (!id) fail("id requerido.");
    if (nueva.length < 8) fail("La nueva contraseña debe tener mínimo 8 caracteres.", 422);
    if (nueva.length > 200) fail("La nueva contraseña es demasiado larga.", 422);
    if (nueva !== str(ctx.in.confirm)) fail("La confirmación no coincide.", 422);
    const existe = await db.usuario.findUnique({ where: { id }, select: { id: true } });
    if (!existe) fail("Miembro no encontrado.", 404);
    await db.usuario.update({ where: { id }, data: { passHash: await hashPass(nueva), passCambiadaEn: new Date(), extra: await extraCon(id, { updated_at: nowIso(), pass_reset_by: "admin" }) } });
    return { changed: true, id };
  },

  async admin_change_own_password(ctx) {
    requiereAdmin(ctx);
    const actual = str(ctx.in.current), nueva = str(ctx.in.new);
    if (nueva.length < 8) fail("La nueva contraseña debe tener mínimo 8 caracteres.", 422);
    if (nueva.length > 200) fail("La nueva contraseña es demasiado larga.", 422);
    if (nueva !== str(ctx.in.confirm)) fail("La confirmación no coincide.", 422);
    if (!(await verificarPassAdmin(actual, await passAdminGuardada()))) fail("La contraseña actual es incorrecta.", 401);
    await escribirPassAdmin(nueva);
    return { changed: true };
  },

  async admin_reset_request(ctx) {
    if (!(await cupo(ctx, "admin_reset_request", 3, 3600))) fail("Demasiadas solicitudes. Espera una hora.", 429);
    const token = randomBytes(24).toString("hex");
    await db.administrador.upsert({
      where: { id: "principal" },
      create: { id: "principal", passHash: await hashPass(randomBytes(12).toString("hex")), resetTokenHash: sha256(token), resetExpira: new Date(Date.now() + 3600_000) },
      update: { resetTokenHash: sha256(token), resetExpira: new Date(Date.now() + 3600_000) },
    });
    await enviarCorreo("admin_reset", config.correoAdmin, { enlace: `${config.dominio}/api/auth.php?action=admin_reset_password&token=${token}` });
    return { enviado: true, destino: "el correo registrado de la Red" };
  },

  async admin_reset_password(ctx) {
    const token = str(ctx.in.token ?? ctx.query.token);
    // GET solo muestra un botón: los antivirus del correo abren los enlaces solos.
    if (ctx.metodo !== "POST") {
      const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
      return new Cruda(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Restablecer contraseña</title>'
        + '<body style="font:16px/1.6 system-ui;max-width:34rem;margin:3rem auto;padding:0 1rem;color:#14140F"><h1 style="font-size:1.35rem">Restablecer la contraseña de administrador</h1>'
        + '<p>Pulsa el botón para generar una contraseña nueva. Se mostrará una sola vez.</p>'
        + `<form method="post" action="/api/auth.php?action=admin_reset_password"><input type="hidden" name="token" value="${esc(token)}">`
        + '<button type="submit" style="font:inherit;padding:.6rem 1.2rem;background:#A94E17;color:#fff;border:0;border-radius:6px;cursor:pointer">Generar contraseña nueva</button></form></body>',
        "text/html; charset=utf-8", 200, { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'" });
    }
    if (!(await cupo(ctx, "admin_reset_password", 10, 3600))) fail("Demasiados intentos. Espera una hora.", 429);
    const fila = await db.administrador.findUnique({ where: { id: "principal" } });
    if (!fila?.resetTokenHash || !fila.resetExpira) fail("No hay ninguna solicitud de recuperación activa.", 401);
    if (fila.resetExpira.getTime() < Date.now()) fail("El enlace de recuperación caducó. Pide uno nuevo.", 401);
    if (!token || sha256(token) !== fila.resetTokenHash) fail("Token de recuperación inválido.", 401);
    const nueva = randomBytes(9).toString("hex");
    await db.administrador.update({ where: { id: "principal" }, data: { resetTokenHash: null, resetExpira: null, provisionalHasta: null } });
    await escribirPassAdmin(nueva);
    return new Cruda(
      '<!doctype html><meta charset="utf-8"><title>Contraseña restablecida</title><body style="font:16px/1.6 system-ui;max-width:34rem;margin:3rem auto;padding:0 1rem;color:#14140F">'
      + '<h1 style="font-size:1.35rem">Contraseña de administrador restablecida</h1><p>Esta es tu nueva contraseña. <b>Cópiala ahora</b>: no se vuelve a mostrar y este enlace ya no sirve.</p>'
      + `<p style="font:1.25rem/1.4 ui-monospace,monospace;background:#F3F1EA;padding:1rem;border-left:4px solid #A94E17">${nueva}</p>`
      + '<p><a href="/admin/">Entrar al panel</a> y cámbiala por una tuya desde Ajustes.</p></body>', "text/html; charset=utf-8");
  },
};

/** Mezcla campos en Usuario.extra. */
export async function extraCon(id: string, cambios: Record<string, unknown>): Promise<Prisma.InputJsonValue> {
  const f = await db.usuario.findUnique({ where: { id }, select: { extra: true } });
  return { ...((f?.extra as object) ?? {}), ...cambios } as Prisma.InputJsonValue;
}

export const auth: Modulo = { acciones };
