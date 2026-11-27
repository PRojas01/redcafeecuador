import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Catálogo real de los cursos de Legacy (copia de producción sin datos personales).
const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, "../../public_html/cursos-nuevos.json"), "utf8"));
const cursos = (Array.isArray(catalogo) ? catalogo : catalogo.cursos) as any[];
const libre = { id: "libre-prueba", titulo: "Libre", acceso: "abierto", modulos: [{ titulo: "M", lecciones: [{ titulo: "L", contenido: "secreto" }] }] };

vi.mock("../src/lib/db.js", () => ({ db: {} }));
vi.mock("../src/lib/docs.js", () => ({
  listar: vi.fn(async (col: string) => (col === "contenido-cursos" ? structuredClone([...cursos, libre]) : [])),
  mapa: vi.fn(async () => ({})),
  mutar: vi.fn(), mutarMapa: vi.fn(),
}));

const { cursos: modulo } = await import("../src/modulos/cursos.js");
const ctx = (id: string) => ({ query: { id }, in: {}, ses: { d: {} }, cache: new Map([["usuario", null]]) }) as any;

describe("ficha abierta de los cursos de pago de Legacy", () => {
  it("un visitante sin cuenta ve todo el curso, sin matrícula", async () => {
    const r: any = await modulo.acciones.get(ctx("legacy-barista-en-casa"));
    expect(r.acceso_concedido).toBe(true);
    expect(r.ficha_abierta).toBe(true);
    expect(r.curso.asociados).toBeUndefined();
    const lec = r.curso.modulos[0].lecciones[0];
    expect(lec.contenido.length).toBeGreaterThan(50);
    expect(r.curso.materiales.length).toBeGreaterThan(0);
    const textos = JSON.stringify(r.curso);
    expect(textos).not.toMatch(/matrícula en la Red es el primer paso/);
    expect(textos).not.toMatch(/La matrícula se gestiona primero desde la Red/);
    expect(textos).not.toMatch(/matricúlate aquí/i);
    expect(textos).toMatch(/escribe a Legacy con el botón de esta ficha/);
  });

  it("los cursos gratis siguen pidiendo matrícula para el contenido", async () => {
    const r: any = await modulo.acciones.get(ctx("libre-prueba"));
    expect(r.acceso_concedido).toBe(false);
    expect(r.curso.modulos[0].lecciones[0].contenido).toBeUndefined();
  });
});
