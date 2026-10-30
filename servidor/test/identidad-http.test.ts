import { afterAll, beforeAll, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "redcafe-identidad-http-"));
const nombre = "documento-prueba.pdf";
const contenido = "%PDF-1.4\nDocumento privado ficticio para prueba HTTP";
let app: ReturnType<typeof import("../src/app.js").crearApp>;

beforeAll(async () => {
  vi.stubEnv("REDCAFE_ENTORNO", "prueba");
  vi.stubEnv("REDCAFE_SITIO", path.join(temporal, "sitio"));
  vi.stubEnv("REDCAFE_UPLOADS", path.join(temporal, "uploads"));
  vi.stubEnv("REDCAFE_PRIVADO", path.join(temporal, "redcafe-privado"));
  vi.resetModules();
  const { config } = await import("../src/lib/config.js");
  fs.mkdirSync(config.sitio, { recursive: true });
  fs.mkdirSync(config.uploads, { recursive: true });
  const { carpetaIdentidad } = await import("../src/lib/privado.js");
  fs.writeFileSync(path.join(carpetaIdentidad(), nombre), contenido, { mode: 0o600 });
  // Control positivo: la ruta pública debe servir archivos del volumen temporal.
  fs.writeFileSync(path.join(config.uploads, "publico.pdf"), "%PDF-publico");
  const { crearApp } = await import("../src/app.js");
  app = crearApp();
});

afterAll(() => {
  vi.unstubAllEnvs();
  fs.rmSync(temporal, { recursive: true, force: true });
});

it("no expone documentos privados por HTTP, ni con traversal codificado", async () => {
  const publico = await app.request("/uploads/publico.pdf");
  expect(publico.status).toBe(200);
  expect(await publico.text()).toBe("%PDF-publico");

  for (const ruta of [
    `/uploads/${nombre}`,
    `/uploads/../redcafe-privado/identidad/${nombre}`,
    `/uploads/%2e%2e%2fredcafe-privado%2fidentidad%2f${nombre}`,
    `/uploads/%2e%2e/redcafe-privado/identidad/${nombre}`,
    `/redcafe-privado/identidad/${nombre}`,
  ]) {
    const respuesta = await app.request(ruta);
    expect(respuesta.status, ruta).not.toBe(200);
    expect(await respuesta.text(), ruta).not.toContain(contenido);
  }
});
