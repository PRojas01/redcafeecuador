import { expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ pagina: vi.fn(() => new Response("Sesión requerida", { status: 403 })) }));
vi.mock("../src/modulos/index.js", () => ({ modulos: {} }));
vi.mock("../src/modulos/socios.js", () => ({ RUTA_PREACUERDO: "/socios/redcafe-preacuerdo-estrategico-2026-a7f3c9/", paginaPreacuerdo: m.pagina }));
vi.mock("../src/lib/sesion.js", () => ({ COOKIE_SESION: "prueba", EstadoSesion: { cargar: vi.fn(async () => ({})) } }));
vi.mock("../src/lib/db.js", () => ({ db: {} }));
import { crearApp } from "../src/app.js";
it("a: variantes codificadas de la carpeta pasan por la puerta de sesión", async () => {
  const app = crearApp();
  for (const ruta of ["/socios/%72edcafe-preacuerdo-estrategico-2026-a7f3c9/", "/%73ocios/redcafe-preacuerdo-estrategico-2026-a7f3c9/"]) {
    const r = await app.request("https://local.test" + ruta);
    expect(r.status).toBe(403);
  }
  expect(m.pagina).toHaveBeenCalledTimes(2);
});
it("i: límite global responde con contrato JSON y 413", async () => {
  const r = await crearApp().request("https://local.test/cualquiera", { method: "POST", headers: { "content-length": String(13 * 1024 * 1024) }, body: "x" });
  expect(r.status).toBe(413); expect(await r.json()).toMatchObject({ ok: false, error: expect.stringContaining("12 MB") });
});
