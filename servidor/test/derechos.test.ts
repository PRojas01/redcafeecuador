import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ctx } from "../src/lib/http.js";

vi.mock("../src/lib/db.js", () => ({ db: {}, Prisma: {} }));
vi.mock("../src/lib/docs.js", () => ({ agregar: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../src/lib/usuarios.js", () => ({ requiereUsuario: vi.fn().mockResolvedValue({ id: "miembro-prueba" }) }));
vi.mock("../src/lib/seguridad.js", () => ({ cupo: vi.fn().mockResolvedValue(true) }));
vi.mock("../src/lib/imagen.js", () => ({ enMarco: vi.fn(), formatoReal: vi.fn() }));
vi.mock("../src/lib/config.js", () => ({ config: { uploads: "/tmp/redcafe-prueba-no-usada" } }));

import { agregar } from "../src/lib/docs.js";
import { DERECHOS_TEXTO, DERECHOS_VERSION, exigirDerechos } from "../src/lib/derechos.js";
import { uploads } from "../src/modulos/uploads.js";

const usuario = { id: "miembro-prueba" };
const contexto = (valor?: unknown): Ctx => ({
  metodo: "POST", ruta: "/api/uploads.php", query: {}, in: { acepta_derechos: valor },
  archivos: {}, cabecera: () => "", ip: "127.0.0.1", ses: { d: {} }, cache: new Map(),
} as Ctx);

beforeEach(() => vi.clearAllMocks());

describe("declaración de derechos", () => {
  it.each([undefined, false, "0", 0, "false", null, {}, []])("rechaza %j con 422 y no registra aceptación", async (valor) => {
    await expect(exigirDerechos(contexto(valor), usuario, "lote")).rejects.toMatchObject({
      codigo: 422, mensaje: "Debes declarar que tienes los derechos sobre este contenido y asumes la responsabilidad.",
    });
    expect(agregar).not.toHaveBeenCalled();
  });

  it.each([true, "true", "1", 1])("registra aceptación explícita %j y devuelve metadatos", async (valor) => {
    const campos = await exigirDerechos(contexto(valor), usuario, "lotes.publish", "lote-prueba");
    expect(DERECHOS_VERSION).toBe("derechos-v1");
    expect(DERECHOS_TEXTO).toBe("Declaro que tengo los derechos sobre este contenido y asumo la responsabilidad ante cualquier reclamo de terceros.");
    expect(agregar).toHaveBeenCalledExactlyOnceWith("aceptaciones-derechos", {
      id: expect.any(String), uid: usuario.id, contexto: "lotes.publish", objeto_id: "lote-prueba",
      version: "derechos-v1", aceptado_at: expect.any(String), ip: "127.0.0.1",
    });
    const registro = vi.mocked(agregar).mock.calls[0][1];
    expect(new Date(registro.aceptado_at).toISOString()).toBe(registro.aceptado_at);
    expect(campos).toEqual({ derechos_version: "derechos-v1", derechos_aceptados_at: registro.aceptado_at, derechos_aceptados_por: usuario.id });
  });

  it("omite IP ausente y usa objeto_id null", async () => {
    const ctx = contexto(true); ctx.ip = "";
    await exigirDerechos(ctx, usuario, "comunidad");
    expect(vi.mocked(agregar).mock.calls[0][1]).toMatchObject({ objeto_id: null });
    expect(vi.mocked(agregar).mock.calls[0][1]).not.toHaveProperty("ip");
  });

  it.each(["image", "documento"])("uploads.%s rechaza sin declaración antes de procesar archivos", async (accion) => {
    await expect(uploads.acciones[accion](contexto())).rejects.toMatchObject({ codigo: 422, mensaje: "Debes declarar que tienes los derechos sobre este contenido y asumes la responsabilidad." });
    expect(agregar).not.toHaveBeenCalled();
  });
});
