import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createECDH, randomBytes } from "node:crypto";
const m = vi.hoisted(() => {
  const table = () => ({ findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn(), create: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn() });
  return { db: { usuario: table(), sesion: table(), administrador: table(), recuperacionPass: table(), intento: table(), secreto: table(), $transaction: vi.fn() }, listar: vi.fn(), mutar: vi.fn(), usuario: vi.fn(), cupo: vi.fn(), bloqueo: vi.fn(), visible: vi.fn() };
});
vi.mock("../src/lib/db.js", async () => ({ db: m.db, Prisma: (await import("@prisma/client")).Prisma }));
vi.mock("../src/lib/docs.js", () => ({ listar: m.listar, mutar: m.mutar, conBloqueo: m.bloqueo }));
vi.mock("../src/lib/usuarios.js", async (original) => ({ ...await original<any>(), requiereUsuario: m.usuario, usuarioActual: m.usuario, requiereAdmin: vi.fn(), invalidarUsuario: vi.fn(), filtroVisible: m.visible, tieneRol: (_c: any, _u: any, r: string) => r !== "admin", todosLosMiembros: async () => [fixture] }));
vi.mock("../src/lib/avisos.js", () => ({ AVISO_PAGOS_VERSION: "prueba", notificar: vi.fn(), notificarAdmins: vi.fn(), registrarActividad: vi.fn(), publicarAvisoComunidad: vi.fn() }));
vi.mock("../src/lib/correo.js", () => ({ enviarCorreo: vi.fn() }));
vi.mock("../src/modulos/lotes.js", () => ({ esSiembra: vi.fn(), lotesTodos: vi.fn() }));
vi.mock("../src/lib/config.js", () => ({ config: { sitio: "/tmp/redcafe-auditoria-inexistente", uploads: "/tmp/redcafe-auditoria-archivos", archivoPassAdmin: "", claveDatos: () => Buffer.alloc(32) }, esProduccion: () => true }));
import fs from "node:fs";
import bcrypt from "bcryptjs";
import { servirEstatico, rutaCanonica } from "../src/lib/estatico.js";
import { validarEndpointPush, enviarAUsuario } from "../src/lib/push.js";
import { EstadoSesion } from "../src/lib/sesion.js";
import { passAdminGuardada } from "../src/lib/admin.js";
import { push } from "../src/modulos/push.js";
import { auth } from "../src/modulos/auth.js";
import { members } from "../src/modulos/members.js";
import { admin } from "../src/modulos/admin.js";
import { pedidos } from "../src/modulos/pedidos.js";
import { cupo } from "../src/lib/seguridad.js";
import { leerEntrada, limitarCuerpo, LIMITE_CUERPO } from "../src/lib/http.js";
const fixture = { id: "sintetico", cedula: "XXXXXXX123", passHash: "sensible", two_factor_secret: "sensible", backup_codes: ["sensible"], token: "sensible" };
const ctx = (input = {}, query = {}): any => ({ in: input, query, ses: new EstadoSesion(), cache: new Map(), ip: "local", metodo: "POST", cabecera: () => "" });
beforeEach(() => {
  vi.clearAllMocks();
  m.usuario.mockResolvedValue({ id: "u", nombre: "Prueba", email: "uno@ejemplo.test" });
  m.visible.mockResolvedValue(() => true);
  m.listar.mockResolvedValue([]);
  m.bloqueo.mockImplementation(async (_key, fn) => fn(m.db));
  m.db.intento.count.mockResolvedValue(0);
  m.db.usuario.findUnique.mockResolvedValue({ id: "u", extra: {}, passHash: "" });
  m.db.usuario.update.mockResolvedValue({ id: "u", extra: {} });
  m.db.$transaction.mockImplementation(async (fn: any) => (typeof fn === "function" ? fn(m.db) : Promise.all(fn)));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("auditoría local", () => {
  it("a: bloquea rutas codificadas y rechaza codificación ambigua", () => {
    vi.spyOn(fs, "statSync").mockReturnValue({ isFile: () => true } as any);
    vi.spyOn(fs, "readFileSync").mockReturnValue(Buffer.from("contenido protegido sintético"));
    for (const ruta of ["/%64ata/x.json", "/socios/redcafe-preacuerdo-estrategico-2026-a7f3c9/%69ndex.txt", "/socios/redcafe-preacuerdo-estrategico-2026-a7f3c9/%69ndex.html", "/%2ehidden", "/x/%2e%2e/data/x.json", "/%", "/%2564ata/x.json"]) expect(servirEstatico(ruta, false).status).not.toBe(200);
    expect(rutaCanonica("/socios/%72edcafe-preacuerdo-estrategico-2026-a7f3c9/")).toBe("/socios/redcafe-preacuerdo-estrategico-2026-a7f3c9/");
  });
  it("b: acepta únicamente proveedores push permitidos", () => {
    for (const host of ["fcm.googleapis.com", "x.push.services.mozilla.com", "x.notify.windows.com", "web.push.apple.com"]) expect(() => validarEndpointPush(`https://${host}/push`)).not.toThrow();
    for (const url of ["https://127.0.0.1", "https://[::1]", "https://10.0.0.1", "https://localhost", "http://fcm.googleapis.com", "https://evil.com", "https://fcm.googleapis.com.evil.com", "https://fcm.googleapis.com:8443"]) expect(() => validarEndpointPush(url)).toThrowError(expect.objectContaining({ codigo: 422 }));
  });
  it("b: valida endpoint al guardar la suscripción", async () => {
    await expect(push.acciones.suscribir(ctx({ endpoint: "https://localhost/push", keys: { auth: "prueba", p256dh: "prueba" } }))).rejects.toMatchObject({ codigo: 422 });
    expect(m.mutar).not.toHaveBeenCalled();
    m.mutar.mockImplementation(async (_col, fn) => fn([]));
    await push.acciones.suscribir(ctx({ endpoint: "https://fcm.googleapis.com/push", keys: { auth: "prueba", p256dh: "prueba" } }));
    expect(m.mutar).toHaveBeenCalledTimes(1);
  });
  it("b: no sigue redirecciones ni envía a endpoints antiguos no permitidos", async () => {
    const ec = createECDH("prime256v1"); ec.generateKeys();
    const v = { privada: ec.getPrivateKey().toString("base64url"), publica: ec.getPublicKey().toString("base64url") };
    m.db.secreto.findUnique.mockResolvedValue({ valor: JSON.stringify(v) });
    m.listar.mockResolvedValue([{ uid: "u", endpoint: "https://fcm.googleapis.com/push", keys: { p256dh: v.publica, auth: randomBytes(16).toString("base64url") } }]);
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://127.0.0.1" } })); vi.stubGlobal("fetch", fetcher);
    expect(await enviarAUsuario("u", "Prueba", "Prueba")).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1); expect(fetcher.mock.calls[0][1].redirect).toBe("manual");
    m.listar.mockResolvedValue([{ uid: "u", endpoint: "https://127.0.0.1" }]);
    expect(await enviarAUsuario("u", "Prueba", "Prueba")).toBe(0); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("c: revoca sesiones de miembro y admin conservando la actual", async () => {
    m.db.sesion.findUnique.mockResolvedValue({ tokenHash: "actual", expira: new Date(Date.now() + 60000), datos: {} });
    const ses = await EstadoSesion.cargar("a".repeat(32));
    await ses.revocarOtras({ admin: true }); expect(m.db.sesion.deleteMany).toHaveBeenLastCalledWith({ where: { admin: true, tokenHash: { not: "actual" } } });
    await ses.revocarOtras({ usuarioId: "u" }); expect(m.db.sesion.deleteMany).toHaveBeenLastCalledWith({ where: { usuarioId: "u", tokenHash: { not: "actual" } } });
  });
  it("c: cambiar contraseñas conecta la revocación y recuperación admin cierra todas", async () => {
    const hash = await bcrypt.hash("actual-prueba", 4);
    m.db.usuario.findUnique.mockResolvedValue({ id: "u", extra: {}, passHash: hash });
    m.db.administrador.findUnique.mockResolvedValue({ passHash: hash });
    const c = ctx({ current: "actual-prueba", new: "nueva-prueba", confirm: "nueva-prueba" });
    const revocar = vi.spyOn(c.ses, "revocarOtras");
    await auth.acciones.change_password(c); expect(revocar).toHaveBeenCalledWith({ usuarioId: "u" });
    await auth.acciones.admin_change_own_password(c); expect(revocar).toHaveBeenCalledWith({ admin: true });
    const { escribirPassAdmin } = await import("../src/lib/admin.js");
    await escribirPassAdmin("rescate-sintetico"); expect(m.db.sesion.deleteMany).toHaveBeenLastCalledWith({ where: { admin: true } });
  });
  it("d: exige contraseña correcta solo al cambiar correo", async () => {
    m.db.usuario.findUnique.mockResolvedValue({ id: "u", extra: {}, passHash: await bcrypt.hash("correcta", 4) });
    const base = { nombre: "Prueba", email: "dos@ejemplo.test" };
    for (const password_actual of [undefined, "incorrecta"]) await expect(members.acciones.update(ctx({ ...base, password_actual }))).rejects.toMatchObject({ codigo: 422 });
    expect(m.db.usuario.update).not.toHaveBeenCalled();
    await members.acciones.update(ctx({ ...base, password_actual: "correcta" }));
    await members.acciones.update(ctx({ ...base, email: "uno@ejemplo.test" })); expect(m.db.usuario.update).toHaveBeenCalledTimes(2);
  });
  it("e: no registra la contraseña inicial generada", async () => {
    m.db.administrador.findUnique.mockResolvedValue(null);
    const hash = vi.spyOn(bcrypt, "hash"); const warn = vi.spyOn(console, "warn").mockImplementation(() => {}); const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await passAdminGuardada();
    const generado = hash.mock.calls[0][0]; expect(JSON.stringify([...warn.mock.calls, ...log.mock.calls])).not.toContain(generado);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("REDCAFE_PASS_ADMIN_INICIAL"));
  });
  it("f: exportación y listados administrativos enmascaran cédulas y eliminan secretos", async () => {
    const resultado: any = await admin.acciones.export(ctx({}, { tipo: "members" }));
    expect(JSON.parse(resultado.cuerpo)[0].cedula).toBe("*******123"); expect(resultado.cuerpo).not.toContain("sensible");
    const listado: any = await members.acciones.all(ctx()); expect(listado.members[0].cedula).toBe("*******123"); expect(JSON.stringify(listado)).not.toContain("sensible");
  });
  it("f: guardar una cédula enmascarada conserva cifrado y huella; una nueva los actualiza", async () => {
    const previo = { id: "u", extra: {}, cedulaCifrada: "cifrado-previo", cedulaHuella: "huella-previa" };
    m.db.usuario.findUnique.mockResolvedValue(previo);
    m.db.usuario.update.mockImplementation(async ({ data }) => ({ ...previo, ...data }));
    await admin.acciones.update(ctx({ recurso: "members", id: "u", cedula: "*******123" }));
    const guardado = m.db.usuario.update.mock.results[0].value;
    expect(await guardado).toMatchObject(previo);
    expect(m.db.usuario.update.mock.calls[0][0].data).not.toHaveProperty("cedulaCifrada");
    expect(m.db.usuario.update.mock.calls[0][0].data).not.toHaveProperty("cedulaHuella");
    await admin.acciones.update(ctx({ recurso: "members", id: "u", cedula: "CEDULA-SINTETICA" }));
    const { descifrar, huella } = await import("../src/lib/pii.js");
    const data = m.db.usuario.update.mock.calls[1][0].data;
    expect(descifrar(data.cedulaCifrada)).toBe("CEDULA-SINTETICA");
    expect(data.cedulaHuella).toBe(huella("CEDULA-SINTETICA"));
    for (const accion of ["verify", "set_estado"]) {
      await members.acciones[accion](ctx({ id: "u", estado: "verificado", cedula: "*******123" }));
      expect(m.db.usuario.update.mock.lastCall![0].data).not.toHaveProperty("cedulaCifrada");
      expect(m.db.usuario.update.mock.lastCall![0].data).not.toHaveProperty("cedulaHuella");
    }
  });
  it("g: recuperación inválida o caducada conserva HTTP 401", async () => {
    for (const r of [null, { id: "r", expira: new Date(0) }]) {
      m.db.recuperacionPass.findUnique.mockResolvedValue(r);
      await expect(auth.acciones.password_reset_confirm(ctx({ token: "sintetico", new: "nueva-prueba", confirm: "nueva-prueba" }))).rejects.toMatchObject({ codigo: 401 });
    }
    expect(m.db.usuario.update).not.toHaveBeenCalled();
  });
  it("g: consume recuperación dentro de la transacción antes de cambiar y revoca sesiones", async () => {
    m.db.recuperacionPass.findUnique.mockResolvedValue({ id: "r", usuarioId: "u", expira: new Date(Date.now() + 60000) });
    m.db.recuperacionPass.deleteMany.mockResolvedValue({ count: 0 });
    const c = ctx({ token: "sintetico", new: "nueva-prueba", confirm: "nueva-prueba" });
    await expect(auth.acciones.password_reset_confirm(c)).rejects.toMatchObject({ codigo: 422 }); expect(m.db.usuario.update).not.toHaveBeenCalled();
    m.db.usuario.findUnique.mockResolvedValue({ extra: { conservado: "prueba" } });
    m.db.recuperacionPass.deleteMany.mockResolvedValue({ count: 1 }); await auth.acciones.password_reset_confirm(c);
    expect(m.db.usuario.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ extra: { conservado: "prueba", pass_reset_at: expect.any(String), updated_at: expect.any(String) } }) }));
    expect(m.db.sesion.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: "u" } });
    expect(m.db.recuperacionPass.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(m.db.usuario.update.mock.invocationCallOrder[0]);
  });
  it("h: vuelve a comprobar estado y participación bajo bloqueo al cancelar", async () => {
    m.listar.mockResolvedValue([{ nro: 1, solicitante_id: "u", estado: "Solicitado" }]);
    for (const p of [{ nro: 1, solicitante_id: "u", estado: "Entregado" }, { nro: 1, solicitante_id: "otro", estado: "Solicitado" }]) {
      m.mutar.mockImplementation(async (_col, fn) => fn([p]));
      await expect(pedidos.acciones.cancelar(ctx({ nro: 1 }))).rejects.toMatchObject({ codigo: p.estado === "Entregado" ? 409 : 403 });
    }
  });
  it("i: rechaza cuerpos excesivos por longitud o por bytes recibidos", async () => {
    await expect(limitarCuerpo(new Request("https://local.test", { method: "POST", headers: { "content-length": String(LIMITE_CUERPO + 1) }, body: "x" }))).rejects.toMatchObject({ codigo: 413 });
    await expect(limitarCuerpo(new Request("https://local.test", { method: "POST", body: "x".repeat(LIMITE_CUERPO + 1) }))).rejects.toMatchObject({ codigo: 413 });
  });
  it("j: serializa intentos concurrentes bajo el mismo bloqueo", async () => {
    let cola = Promise.resolve(), usados = 0;
    m.bloqueo.mockImplementation((_k, fn) => { const r = cola.then(() => fn(m.db)); cola = r.then(() => undefined); return r; });
    m.db.intento.count.mockImplementation(async () => usados); m.db.intento.create.mockImplementation(async () => { usados++; });
    const resultados = await Promise.all(Array.from({ length: 20 }, () => cupo(ctx(), "prueba", 3)));
    expect(resultados.filter(Boolean)).toHaveLength(3); expect(m.bloqueo).toHaveBeenCalledTimes(20);
  });
  it("k: rechaza servicios inexistentes u ocultos y usa catálogo para título precio y proveedor", async () => {
    const c = ctx({ servicioId: "s", titulo: "falso", proveedorId: "intruso", cantidad: 2, total: 1 });
    await expect(pedidos.acciones.create_service(c)).rejects.toMatchObject({ codigo: 404 });
    m.listar.mockImplementation(async (col) => col === "servicios" ? [{ id: "s", oculto: true }] : []);
    await expect(pedidos.acciones.create_service(c)).rejects.toMatchObject({ codigo: 404 });
    m.listar.mockImplementation(async (col) => col === "servicios" ? [{ id: "s", nombre: "Catálogo", precio: 7, proveedor_id: "redcafe_admin" }] : []);
    m.mutar.mockImplementation(async (_col, fn) => fn([]));
    const r: any = await pedidos.acciones.create_service(c); expect(r.pedido).toMatchObject({ servicio: "Catálogo", total: 14, proveedor_id: "redcafe_admin" });
  });
  it("k: conserva las dos rutas oficiales y da prioridad al proveedor del catálogo", async () => {
    m.mutar.mockImplementation(async (_col, fn) => fn([]));
    for (const proveedorCatalogo of [undefined, "proveedor-catalogo"]) {
      m.listar.mockImplementation(async (col) => col === "servicios" ? [{ id: "s", nombre: "Catálogo", precio: 7, proveedor_id: proveedorCatalogo }] : []);
      for (const proveedorId of [undefined, "redcafe_admin", "intruso", " redcafe_admin"]) {
        const r: any = await pedidos.acciones.create_service(ctx({ servicioId: "s", proveedorId, titulo: "falso", total: 1, cantidad: 2 }));
        expect(r.pedido).toMatchObject({ servicio: "Catálogo", total: 14, proveedor_id: proveedorCatalogo || (proveedorId === "redcafe_admin" ? "redcafe_admin" : "redcafe") });
      }
    }
  });
  it("i: leerEntrada analiza la petición limitada sin reconstruir otro cuerpo", async () => {
    const req = await limitarCuerpo(new Request("https://local.test", { method: "POST", body: JSON.stringify({ nombre: "Prueba" }) }));
    const lector = vi.spyOn(req.body!, "getReader");
    expect((await leerEntrada(req, {})).in).toEqual({ nombre: "Prueba" });
    expect(lector).toHaveBeenCalledTimes(1);
  });
  it("d: el formulario propio envía la contraseña actual con los datos de perfil", () => {
    const fuente = fs.readFileSync(new URL("../../plataforma_cafe/app/panel/page.tsx", import.meta.url), "utf8");
    expect(fuente).toContain("Contraseña actual (solo si cambias el correo)");
    expect(fuente).toContain('type="password" value={passwordActualCuenta}');
    expect(fuente).toContain("password_actual: passwordActualCuenta");
  });

});
