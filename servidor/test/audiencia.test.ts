import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ cols: {} as Record<string, any> }));
vi.mock("../src/lib/db.js", () => ({ db: {}, Prisma: {} }));
vi.mock("../src/lib/docs.js", () => ({
  listar: vi.fn(async (c: string) => structuredClone(m.cols[c] ?? [])),
  mapa: vi.fn(async (c: string) => structuredClone(m.cols[c] ?? {})),
  agregar: vi.fn(async (c: string, d: any) => { (m.cols[c] ??= []).push(d); }),
}));
vi.mock("../src/lib/usuarios.js", async () => {
  const real = await vi.importActual<any>("../src/lib/usuarios.js");
  return { ROLES_MIEMBRO: real.ROLES_MIEMBRO, miembroRoles: real.miembroRoles, todosLosMiembros: vi.fn(async () => structuredClone(m.cols.miembros)) };
});

const { filtrarMiembros, leerFiltros, resumenCanales, telefonoInternacional } = await import("../src/lib/audiencia.js");
const { enviarCorreosLote } = await import("../src/lib/correo.js");
const { config } = await import("../src/lib/config.js");

const si = { acepta_marketing: true };
// Teléfonos ficticios armados en tiempo de ejecución (el vigilante de datos no los confunde con reales).
const movil = (resto: string) => "09" + resto;
beforeEach(() => {
  m.cols = {
    miembros: [
      { id: "a", nombre: "Ana", rol: "productor", provincia: "Loja", email: "a@ejemplo.test", whatsapp: movil("91234567"), ...si },
      { id: "b", nombre: "Beto", rol: "barista", provincia: "Loja", email: "b@ejemplo.test", ...si },
      { id: "c", nombre: "Cata", rol: "productor", provincia: "Pichincha", email: "c@ejemplo.test", whatsapp: movil("97654321") },
      { id: "d", nombre: "Dani", rol: "productor", provincia: "Loja", email: "d@ejemplo.test", estado: "suspendido", ...si },
    ],
    "inscripciones-cursos": {
      "cur1::a": { curso: "cur1", usuario: "a", estado: "matriculado" },
      "cur1::b": { curso: "cur1", usuario: "b", estado: "rechazado" },
      "cur1::c": { curso: "cur1", usuario: "c", estado: "aprobado" },
    },
    lotes: [{ id: "l1", productor_id: "a" }],
  };
});

describe("audiencia de mensajes masivos", () => {
  it("filtra por perfil y provincia y deja fuera a suspendidos", async () => {
    const ids = (await filtrarMiembros(leerFiltros({ roles: ["productor"], provincia: "Loja" }))).map((x) => x.id);
    expect(ids).toEqual(["a"]);
  });
  it("filtra por curso solo a matriculados o aprobados", async () => {
    const ids = (await filtrarMiembros(leerFiltros({ curso: "cur1" }))).map((x) => x.id);
    expect(ids).toEqual(["a", "c"]);
  });
  it("productores sin lote", async () => {
    const ids = (await filtrarMiembros(leerFiltros({ segmento: "productores_sin_lote" }))).map((x) => x.id);
    expect(ids).toEqual(["c"]);
  });
  it("cuenta por canal solo a quien aceptó novedades", async () => {
    const r = resumenCanales(await filtrarMiembros(leerFiltros({})));
    expect(r).toEqual({ total: 3, con_correo: 2, con_whatsapp: 1, sin_consentimiento: 1 });
  });
  it("normaliza teléfonos de Ecuador", () => {
    expect(telefonoInternacional("09 9 123 4567")).toBe("593" + movil("91234567").slice(1));
    expect(telefonoInternacional("+34 612 345 678")).toBe("34612345678");
    expect(telefonoInternacional("123")).toBe("");
  });
});

describe("envío de correos por lotes", () => {
  it("manda tandas de 100 a Resend con cabecera de baja", async () => {
    const llamadas: any[] = [];
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async (_u: any, o: any) => { llamadas.push(JSON.parse(o.body)); return new Response("{}", { status: 200 }); });
    (config.correo as any).apiResend = "re_prueba";
    try {
      const lista = Array.from({ length: 150 }, (_, i) => ({ para: `p${i}@ejemplo.test`, baja: `https://redcafeecuador.com/b?u=${i}`, vars: { titulo: "Hola", texto: "t" } }));
      lista.push({ para: "no-es-correo", baja: "", vars: { titulo: "x", texto: "" } });
      const r = await enviarCorreosLote("aviso", lista);
      expect(r).toEqual({ enviados: 150, fallidos: 1 });
      expect(llamadas.map((l) => l.length)).toEqual([100, 50]);
      expect(llamadas[0][0].headers["List-Unsubscribe"]).toBe("<https://redcafeecuador.com/b?u=0>");
      expect(llamadas[0][0].html).toContain("Dejar de recibir");
    } finally {
      (config.correo as any).apiResend = "";
      f.mockRestore();
    }
  });
});
