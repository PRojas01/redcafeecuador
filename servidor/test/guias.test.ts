import { beforeEach, describe, expect, it, vi } from "vitest";

// Registros privados de la guía: ficha del terreno y análisis de suelo.
const m = vi.hoisted(() => ({ cols: {} as Record<string, Record<string, any>> }));
vi.mock("../src/lib/docs.js", () => ({
  obtener: vi.fn(async (col: string, id: string) => structuredClone(m.cols[col]?.[id] ?? null)),
  mutarUno: vi.fn(async (col: string, id: string, fn: any) => {
    m.cols[col] ??= {};
    m.cols[col][id] = await fn(structuredClone(m.cols[col][id] ?? {}));
    return m.cols[col][id];
  }),
}));
vi.mock("../src/lib/usuarios.js", () => ({
  requiereUsuario: vi.fn(async () => ({ id: "yo1", nombre: "Ana", provincia: "Loja" })),
  miembroRoles: () => ["productor"],
}));
vi.mock("../src/lib/avisos.js", () => ({ notificar: vi.fn() }));

const { guias } = await import("../src/modulos/guias.js");
const ctx = (entrada: any) => ({ in: entrada, query: {} }) as any;

beforeEach(() => { m.cols = {}; });

describe("guías: registros del terreno", () => {
  it("guarda la ficha del terreno con sus campos y descarta los ajenos", async () => {
    const r: any = await guias.acciones.registro(ctx({
      tipo: "terreno",
      datos: { fecha: "2026-11-11", lote: "La loma", provincia: "Loja", altitud_m: "1650", pendiente: "Inclinada (25–50 %)",
               lluvia_mm: "1400", cedula: "0102030405" },
    }));
    expect(r.registro).toMatchObject({ lote: "La loma", provincia: "Loja", altitud_m: 1650, pendiente: "Inclinada (25–50 %)", lluvia_mm: 1400 });
    expect(r.registro.cedula).toBeUndefined();
    expect(m.cols["guias-registros"].yo1.terreno).toHaveLength(1);
  });

  it("guarda el análisis de suelo y lo devuelve en la ficha", async () => {
    await guias.acciones.registro(ctx({ tipo: "suelo", datos: { lote: "A", ph: "5.4", materia_organica_pct: "150" } }));
    const f: any = await guias.acciones.ficha(ctx({}));
    expect(f.ultimos.suelo).toMatchObject({ ph: 5.4, materia_organica_pct: 100 });
    expect(f.ultimos.terreno).toBeNull();
  });

  it("rechaza tipos desconocidos", async () => {
    await expect(guias.acciones.registro(ctx({ tipo: "otro", datos: {} }))).rejects.toThrow();
  });
});
