import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => {
  const table = () => ({ findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), count: vi.fn() });
  return { db: { usuario: table(), consentimiento: table(), intento: table(), $transaction: vi.fn() }, cupo: vi.fn() };
});
vi.mock("../src/lib/db.js", async () => ({ db: m.db, Prisma: (await import("@prisma/client")).Prisma }));
vi.mock("../src/lib/docs.js", () => ({ listar: async () => [], mutar: vi.fn(), conBloqueo: vi.fn() }));
vi.mock("../src/lib/seguridad.js", () => ({ cupo: m.cupo }));
vi.mock("../src/lib/avisos.js", () => ({ notificar: vi.fn(), notificarAdmins: vi.fn(), registrarActividad: vi.fn(), publicarAvisoComunidad: vi.fn() }));
vi.mock("../src/lib/correo.js", () => ({ enviarCorreo: vi.fn() }));
vi.mock("../src/lib/config.js", () => ({ config: { sitio: "/tmp/x", uploads: "/tmp/x", archivoPassAdmin: "", claveDatos: () => Buffer.alloc(32) }, esProduccion: () => false }));
import { cedulaEcuatorianaValida, documentoValido, paisValido, rucEcuatorianoValido } from "../src/lib/paises.js";
import { auth } from "../src/modulos/auth.js";
import { EstadoSesion } from "../src/lib/sesion.js";

const ctx = (input: object): any => ({ in: input, query: {}, ses: new EstadoSesion(), cache: new Map(), ip: "local", metodo: "POST", cabecera: () => "" });
const base = { nombre: "Ana Prueba", email: "ana@ejemplo.test", pass: "Prueba-123456", rol: "comprador", acepta_terminos: true, acepta_privacidad: true, acepta_uso_datos: true };

describe("país y documento", () => {
  it("valida la cédula ecuatoriana con su dígito verificador", () => {
    expect(cedulaEcuatorianaValida("1710000009")).toBe(true);
    expect(cedulaEcuatorianaValida("1710000008")).toBe(false);
    expect(cedulaEcuatorianaValida("2510000000")).toBe(false); // provincia 25 no existe
    expect(cedulaEcuatorianaValida("171000000")).toBe(false);
  });
  it("valida RUC de persona natural y de sociedad", () => {
    expect(rucEcuatorianoValido("1710000009001")).toBe(true);
    expect(rucEcuatorianoValido("1710000009000")).toBe(false);
    expect(rucEcuatorianoValido("1790000000001")).toBe(true);
    expect(rucEcuatorianoValido("1780000000001")).toBe(false);
  });
  it("Ecuador por defecto; otros países con documento libre", () => {
    expect(paisValido(undefined)).toBe("EC");
    expect(paisValido("co")).toBe("CO");
    expect(paisValido("ZZ")).toBe("");
    expect(documentoValido("171000000-9", "EC")).toBe("1710000009");
    expect(documentoValido("12345", "EC")).toBeNull();
    expect(documentoValido("PA 123.456-X", "CO")).toBe("PA 123.456-X");
    expect(documentoValido("<x>", "US")).toBeNull();
    expect(documentoValido("", "EC")).toBe("");
  });
});

describe("registro desde otros países", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.cupo.mockResolvedValue(true);
    m.db.$transaction.mockResolvedValue([]);
    m.db.usuario.findUnique.mockImplementation(async ({ where }: any) => ({ id: where.id, email: base.email, nombre: base.nombre, rol: "comprador", roles: ["comprador"], extra: { pais: "CO" }, creado: new Date() }));
  });
  it("guarda el país y acepta teléfono internacional y documento extranjero", async () => {
    const r: any = await auth.acciones.register(ctx({ ...base, pais: "CO", provincia: "Huila", telefono: "+57 300 123 4567", cedula: "1020304050" }));
    const data = m.db.usuario.create.mock.calls[0][0].data;
    expect(data.extra.pais).toBe("CO");
    expect(data.provincia).toBe("Huila");
    expect(data.telefono).toBe("+57 300 123 4567");
    expect(r.user.pais).toBe("CO");
  });
  it("sin país es Ecuador y exige cédula válida", async () => {
    await expect(auth.acciones.register(ctx({ ...base, cedula: "0000000001" }))).rejects.toMatchObject({ codigo: 422 });
    await auth.acciones.register(ctx({ ...base, cedula: "1710000009", provincia: "Pichincha" }));
    expect(m.db.usuario.create.mock.calls[0][0].data.extra.pais).toBe("EC");
  });
  it("rechaza un país desconocido", async () => {
    await expect(auth.acciones.register(ctx({ ...base, pais: "XX" }))).rejects.toMatchObject({ codigo: 422 });
  });
});
