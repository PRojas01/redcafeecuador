import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { Ctx } from "../src/lib/http.js";

const memoria = vi.hoisted(() => ({ items: [] as any[], usuario: { id: "miembro-prueba", nombre: "Prueba", verificado: false, extra: {} } as any }));
vi.mock("../src/lib/db.js", () => ({ db: { usuario: {
  findUnique: vi.fn(async () => memoria.usuario),
  update: vi.fn(async ({ data }: any) => Object.assign(memoria.usuario, data)),
} } }));
vi.mock("../src/lib/docs.js", () => ({
  listar: vi.fn(async () => structuredClone(memoria.items)),
  mutar: vi.fn(async (_col, fn) => {
    const { db } = await import("../src/lib/db.js");
    memoria.items = await fn(structuredClone(memoria.items), db);
    return memoria.items;
  }),
}));
vi.mock("../src/lib/usuarios.js", () => ({
  usuarioActual: vi.fn(async (ctx) => ctx.cache.get("usuario") ?? null),
  requiereUsuario: vi.fn(async (ctx) => {
    const u = ctx.cache.get("usuario");
    if (!u) { const { fail } = await import("../src/lib/http.js"); fail("No autenticado.", 401); }
    return u;
  }),
  esAdmin: vi.fn(async ctx => !!ctx.ses.d.admin),
  aDoc: (u: any) => ({ ...u, ...u.extra }), tieneRol: () => false, todosLosMiembros: async () => [],
}));
vi.mock("../src/lib/avisos.js", () => ({ notificar: vi.fn(), notificarAdmins: vi.fn(), registrarActividad: vi.fn(), nombreMiembro: async () => "Prueba" }));
vi.mock("../src/lib/seguridad.js", () => ({ cupo: vi.fn(async () => true) }));

const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "redcafe-identidad-"));
process.env.REDCAFE_PRIVADO = path.join(temporal, "privado");
process.env.REDCAFE_UPLOADS = path.join(temporal, "publico", "uploads");
process.env.REDCAFE_SITIO = path.join(temporal, "publico");
const { identidad } = await import("../src/modulos/identidad.js");
const { uploads } = await import("../src/modulos/uploads.js");
const { config } = await import("../src/lib/config.js");
const { carpetaIdentidad } = await import("../src/lib/privado.js");
const { notificar, notificarAdmins } = await import("../src/lib/avisos.js");
const { Cruda } = await import("../src/lib/http.js");

function ctx(admin = false, entrada = {}, metodo = "POST"): Ctx {
  return { metodo, in: entrada, query: {}, archivos: {}, cache: new Map([["usuario", memoria.usuario]]), ses: { d: { admin } }, cabecera: () => "", ip: "127.0.0.1", ruta: "/api/identidad.php" } as unknown as Ctx;
}
async function solicitar() {
  const c = ctx();
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).png().toBuffer();
  c.archivos = { documento: new File(["%PDF-1.4\nprueba"], "nombre-falso.jpg"), selfie: new File([new Uint8Array(png)], "nombre-falso.pdf") };
  return identidad.acciones.solicitar(c) as Promise<any>;
}
beforeEach(() => {
  memoria.items = []; memoria.usuario = { id: "miembro-prueba", nombre: "Prueba", verificado: false, extra: {} };
  fs.rmSync(config.privado, { recursive: true, force: true }); vi.clearAllMocks();
});
afterAll(() => fs.rmSync(temporal, { recursive: true, force: true }));

describe("identidad privada", () => {
  it("rechaza miembros sin rol admin y anónimos", async () => {
    for (const accion of ["pendientes", "ver", "decidir"]) await expect(identidad.acciones[accion](ctx())).rejects.toMatchObject({ codigo: 403 });
    for (const accion of Object.keys(identidad.acciones)) {
      const c = ctx(); c.cache.clear();
      await expect(identidad.acciones[accion](c)).rejects.toMatchObject({ codigo: 401 });
    }
  });
  it("almacena fuera del sitio con permisos privados, valida contenido y no expone nombres", async () => {
    const r = await solicitar();
    expect(Object.keys(r.solicitud).sort()).toEqual(["creado", "estado", "id"]);
    expect(notificarAdmins).toHaveBeenCalled();
    const dir = carpetaIdentidad();
    for (const publico of [config.sitio, config.uploads]) expect(path.relative(publico, dir).startsWith(".." + path.sep)).toBe(true);
    expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
    for (const n of Object.values(memoria.items[0].archivos) as string[]) expect(fs.statSync(path.join(dir, n)).mode & 0o777).toBe(0o600);
    expect(memoria.items[0].formatos).toEqual({ documento: "pdf", selfie: "png" });
    const estado = await identidad.acciones.estado(ctx());
    expect(JSON.stringify(estado)).not.toContain("archivos");
    await expect(solicitar()).rejects.toMatchObject({ codigo: 422 });
  });
  it("impide configurar carpetas públicas, incluso mediante enlaces", () => {
    const anterior = config.privado;
    try {
      for (const publico of [config.sitio, config.uploads]) {
        config.privado = path.join(publico, "identidades");
        expect(() => carpetaIdentidad()).toThrow("REDCAFE_PRIVADO");
      }
      fs.mkdirSync(config.sitio, { recursive: true });
      const enlace = path.join(temporal, "enlace"); fs.symlinkSync(config.sitio, enlace);
      config.privado = path.join(enlace, "identidades"); expect(() => carpetaIdentidad()).toThrow("REDCAFE_PRIVADO");
    } finally { config.privado = anterior; }
  });
  it("sirve solo al admin sin caché y rechaza traversal", async () => {
    await solicitar(); const id = memoria.items[0].id;
    const r = await identidad.acciones.ver(ctx(true, { id, cual: "documento" }, "GET")) as InstanceType<typeof Cruda>;
    expect(r).toBeInstanceOf(Cruda); expect(r.tipo).toBe("application/pdf"); expect(r.cabeceras["Cache-Control"]).toBe("no-store");
    memoria.items[0].archivos.documento = "../otro.pdf";
    await expect(identidad.acciones.ver(ctx(true, { id, cual: "documento" }, "GET"))).rejects.toMatchObject({ codigo: 404 });
  });
  it("aprueba con el sello existente, notifica y borra ambos archivos", async () => {
    await solicitar(); const id = memoria.items[0].id;
    await identidad.acciones.decidir(ctx(true, { id, decision: "aprobar" }));
    expect(memoria.usuario.verificado).toBe(true);
    expect(memoria.usuario.extra).toMatchObject({ estado_validacion: "verificado", verificado_por: "Prueba" });
    expect(memoria.usuario.extra.fecha_verificacion).toBeTruthy();
    expect(notificar).toHaveBeenCalledWith("miembro-prueba", "miembro", "Tu identidad fue verificada", expect.any(String), "/panel/");
    expect(fs.readdirSync(carpetaIdentidad())).toEqual([]);
    expect(memoria.items[0].archivos).toBeUndefined();
    await expect(identidad.acciones.decidir(ctx(true, { id, decision: "aprobar" }))).rejects.toMatchObject({ codigo: 422 });
  });
  it("exige motivo al rechazar, lo notifica y borra archivos", async () => {
    await solicitar(); const id = memoria.items[0].id;
    await expect(identidad.acciones.decidir(ctx(true, { id, decision: "rechazar" }))).rejects.toMatchObject({ codigo: 422 });
    await identidad.acciones.decidir(ctx(true, { id, decision: "rechazar", motivo: "Documento ilegible" }));
    expect(memoria.usuario.verificado).toBe(false);
    expect(notificar).toHaveBeenCalledWith("miembro-prueba", "miembro", expect.any(String), "Motivo: Documento ilegible", "/panel/");
    expect(fs.readdirSync(carpetaIdentidad())).toEqual([]); expect(memoria.items[0].archivos).toBeUndefined();
  });
  it("rechaza archivos falsos, selfies PDF, exceso de tamaño y métodos de escritura incorrectos", async () => {
    const c = ctx();
    c.archivos = { documento: new File(["texto"], "documento.jpg"), selfie: new File(["texto"], "selfie.png") };
    await expect(identidad.acciones.solicitar(c)).rejects.toMatchObject({ codigo: 422 });
    c.archivos.documento = new File(["%PDF-1.4"], "documento.pdf");
    c.archivos.selfie = new File(["%PDF-1.4"], "selfie.jpg");
    await expect(identidad.acciones.solicitar(c)).rejects.toMatchObject({ codigo: 422 });
    c.archivos.documento = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "grande.pdf");
    await expect(identidad.acciones.solicitar(c)).rejects.toMatchObject({ codigo: 422 });
    await expect(identidad.acciones.solicitar(ctx(false, {}, "GET"))).rejects.toMatchObject({ codigo: 405 });
    await expect(identidad.acciones.decidir(ctx(true, {}, "GET"))).rejects.toMatchObject({ codigo: 405 });
    expect(fs.readdirSync(carpetaIdentidad())).toEqual([]);
  });
  it("rechaza perfiles verificados y tipos de identidad en la subida pública", async () => {
    memoria.usuario.verificado = true;
    await expect(solicitar()).rejects.toMatchObject({ codigo: 422 });
    for (const tipo of ["identidad", "cedula", "selfie", "pasaporte", "documento-identificacion"]) await expect(uploads.acciones.documento(ctx(false, { tipo }))).rejects.toMatchObject({ codigo: 422 });
  });
});
