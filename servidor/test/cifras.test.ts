import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ miembros: [] as any[], lotes: [] as any[] }));
vi.mock("../src/lib/db.js", () => ({ db: {}, Prisma: {} }));
vi.mock("../src/lib/docs.js", () => ({ listar: vi.fn(async () => []), mapa: vi.fn(async () => ({})), mutarMapa: vi.fn() }));
vi.mock("../src/lib/seguridad.js", () => ({ cupo: vi.fn() }));
vi.mock("../src/lib/usuarios.js", async () => {
  const real = await vi.importActual<any>("../src/lib/usuarios.js");
  return { miembroRoles: real.miembroRoles, requiereAdmin: vi.fn(), todosLosMiembros: vi.fn(async () => structuredClone(m.miembros)) };
});
vi.mock("../src/modulos/lotes.js", () => ({ lotesTodos: vi.fn(async () => structuredClone(m.lotes)) }));

const { metricas } = await import("../src/modulos/metricas.js");
const { provinciaEcuador } = await import("../src/lib/paises.js");

describe("provinciaEcuador", () => {
  it("reconoce las 24 provincias con o sin tildes y grafías cortas", () => {
    expect(provinciaEcuador("loja")).toBe("Loja");
    expect(provinciaEcuador(" MANABI ")).toBe("Manabí");
    expect(provinciaEcuador("Santo Domingo")).toBe("Santo Domingo de los Tsáchilas");
    expect(provinciaEcuador("Provincia de Zamora")).toBe("Zamora Chinchipe");
    expect(provinciaEcuador("Lima")).toBe("");
    expect(provinciaEcuador("Antioquia")).toBe("");
    expect(provinciaEcuador("")).toBe("");
  });
});

describe("cifras de la Red", () => {
  it("cuenta solo provincias del Ecuador, aparte los otros países y sin cuentas cerradas", async () => {
    m.miembros = [
      { id: "1", rol: "productor", provincia: "Loja" },
      { id: "2", rol: "comprador", provincia: "loja" },
      { id: "3", rol: "productor", provincia: "Manabi", pais: "EC" },
      { id: "4", rol: "productor", provincia: "Antioquia", pais: "CO" },
      { id: "5", rol: "comprador", provincia: "Lima", pais: "PE" },
      { id: "6", rol: "productor", provincia: "Loja", pais: "PE" }, // de otro país aunque escriba «Loja»
      { id: "7", rol: "productor", provincia: "Pichincha", estado: "eliminado", activo: false },
      { id: "8", rol: "productor", provincia: "Azuay", estado: "inactivo" },
      { id: "9", rol: "barista", provincia: "Quito" }, // texto que no es provincia
    ];
    m.lotes = [
      { id: "a", provincia: "Loja" },
      { id: "b", provincia: "El Oro" },
      { id: "c", provincia: "Huila" },
      { id: "d", provincia: "Azuay", demo: true },
    ];
    const d: any = await metricas.acciones.cifras({} as any);
    expect(d.miembros).toBe(7);
    expect(d.miembros_ecuador).toBe(4);
    expect(d.miembros_otros_paises).toBe(3);
    expect(d.paises).toBe(3);
    expect(d.provincias).toBe(2);
    expect(d.por_provincia).toEqual([
      { nombre: "Loja", miembros: 2, lotes: 1 },
      { nombre: "El Oro", miembros: 0, lotes: 1 },
      { nombre: "Manabí", miembros: 1, lotes: 0 },
    ]);
    expect(d.lotes_reales).toBe(3);
    expect(d.productores).toBe(4);
  });

  it("nunca pasa de 24 provincias", async () => {
    const { PROVINCIAS_EC } = await import("../src/lib/paises.js");
    m.miembros = [...PROVINCIAS_EC, ...PROVINCIAS_EC.map((p) => p.toUpperCase()), "Lima", "Bogotá"].map((p, i) => ({ id: String(i), rol: "productor", provincia: p }));
    m.lotes = [];
    const d: any = await metricas.acciones.cifras({} as any);
    expect(d.provincias).toBe(24);
  });
});
