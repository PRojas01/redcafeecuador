import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "redcafe-estatico-"));
vi.mock("../src/lib/config.js", () => ({ config: { sitio: dir, uploads: path.join(dir, "uploads") }, esProduccion: () => false }));
const { servirEstatico } = await import("../src/lib/estatico.js");

const css = "body{color:#3b1a0c}\n".repeat(400);
fs.writeFileSync(path.join(dir, "estilo.css"), css);
fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>x</title>" + "<p>hola</p>".repeat(200));
fs.mkdirSync(path.join(dir, "_next/static/chunks"), { recursive: true });
fs.writeFileSync(path.join(dir, "_next/static/chunks/a-123.js"), "console.log(1)");
fs.mkdirSync(path.join(dir, "marketplace/ficha"), { recursive: true });
fs.writeFileSync(path.join(dir, "marketplace/ficha/index.html"), '<link rel="canonical" href="https://redcafeecuador.com/marketplace/ficha/"/><script>x("href\\":\\"https://redcafeecuador.com/marketplace/ficha/\\"")</script>');
fs.mkdirSync(path.join(dir, "video"));
fs.writeFileSync(path.join(dir, "video/v.mp4"), Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256)));

describe("archivos estáticos", () => {
  it("comprime el texto según Accept-Encoding", async () => {
    const br = servirEstatico("/estilo.css", false, { aceptaCodificacion: "gzip, deflate, br" });
    expect(br.headers.get("content-encoding")).toBe("br");
    expect(br.headers.get("vary")).toBe("Accept-Encoding");
    expect(zlib.brotliDecompressSync(Buffer.from(await br.arrayBuffer())).toString()).toBe(css);
    const gz = servirEstatico("/estilo.css", false, { aceptaCodificacion: "gzip" });
    expect(gz.headers.get("content-encoding")).toBe("gzip");
    expect(zlib.gunzipSync(Buffer.from(await gz.arrayBuffer())).toString()).toBe(css);
    const nada = servirEstatico("/estilo.css", false);
    expect(nada.headers.get("content-encoding")).toBeNull();
    expect(await nada.text()).toBe(css);
  });

  it("solo guarda un año lo que lleva versión o huella", () => {
    expect(servirEstatico("/estilo.css", false, { consulta: "?v=20261108a" }).headers.get("cache-control")).toContain("immutable");
    expect(servirEstatico("/estilo.css", false).headers.get("cache-control")).not.toContain("immutable");
    expect(servirEstatico("/_next/static/chunks/a-123.js", false).headers.get("cache-control")).toContain("immutable");
    expect(servirEstatico("/", false).headers.get("cache-control")).toBe("no-cache");
  });

  it("responde 304 si el navegador ya tiene la misma versión", () => {
    const etag = servirEstatico("/", false).headers.get("etag")!;
    expect(etag).toMatch(/^W\//);
    expect(servirEstatico("/", false, { siNoCoincide: etag }).status).toBe(304);
  });

  it("sirve videos por trozos (Safari en iPhone)", async () => {
    const r = servirEstatico("/video/v.mp4", false, { rango: "bytes=10-19" });
    expect(r.status).toBe(206);
    expect(r.headers.get("content-range")).toBe("bytes 10-19/1000");
    expect([...new Uint8Array(await r.arrayBuffer())]).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(servirEstatico("/video/v.mp4", false, { rango: "bytes=5000-" }).status).toBe(416);
    expect(servirEstatico("/video/v.mp4", false).headers.get("accept-ranges")).toBe("bytes");
  });

  it("los lotes sin carpeta propia llevan su propio canonical", async () => {
    const t = await servirEstatico("/marketplace/lote-real_9/", false).text();
    expect(t).not.toContain("/marketplace/ficha/");
    expect(t.match(/marketplace\/lote-real_9\//g)).toHaveLength(2);
    expect(await servirEstatico("/marketplace/ficha/", false).text()).toContain("/marketplace/ficha/");
  });
});
