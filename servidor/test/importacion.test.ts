// El paquete cifrado de procesar-respaldo.html: formato, contraseña y filtrado.
import { describe, expect, it } from "vitest";
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { abrirPaquete, ITERACIONES, MAGIA, separar } from "../src/modulos/importacion.js";

function paquete(clave: string, archivos: Record<string, string>) {
  const sal = randomBytes(16), iv = randomBytes(12);
  const llave = pbkdf2Sync(clave, sal, ITERACIONES, 32, "sha256");
  const c = createCipheriv("aes-256-gcm", llave, iv);
  const plano = gzipSync(Buffer.from(JSON.stringify({ formato: "redcafe-paquete/1", generado: "2026-10-29T00:00:00Z", archivos })));
  return Buffer.concat([MAGIA, sal, iv, c.update(plano), c.final(), c.getAuthTag()]);
}
const b64 = (s: string) => Buffer.from(s).toString("base64");

describe("paquete de importación", () => {
  it("se abre con la contraseña correcta y separa datos y fotos", async () => {
    const p = await abrirPaquete(paquete("Clave-De-Prueba-1", {
      "data/members.json": b64("[]"),
      "data/paginas/a.md": b64("# A"),
      "data/sub/otra.json": b64("[]"),
      "uploads/user-content/foto.jpg": b64("jpg"),
      "uploads/user-content/malo.php": b64("<?php"),
      "uploads/user-content/../../fuera.jpg": b64("x"),
      ".redcafe_admin_pass": b64("$2b$10$x"),
    }), "Clave-De-Prueba-1");
    const { fuente, subidas } = separar(p);
    expect([...fuente.keys()].sort()).toEqual([".redcafe_admin_pass", "members.json", "paginas/a.md"]);
    expect([...subidas.keys()]).toEqual(["foto.jpg"]);
  });

  it("rechaza una contraseña equivocada", async () => {
    await expect(abrirPaquete(paquete("Clave-De-Prueba-1", {}), "Otra-Clave-12345")).rejects.toMatchObject({ codigo: 422 });
  });

  it("rechaza un archivo que no es un paquete", async () => {
    await expect(abrirPaquete(Buffer.from("hola, no soy un paquete de nada"), "Clave-De-Prueba-1")).rejects.toMatchObject({ codigo: 422 });
  });
});
