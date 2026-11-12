import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { grafo, noIndexar, seoPagina, textosLote } from "../src/lib/seo.js";

const sitio = path.resolve(__dirname, "../../sitio");
const leer = (r: string) => fs.readFileSync(path.join(sitio, r, "index.html"), "utf8");
const ld = (html: string) => JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1]);
const tipos = (g: any) => g["@graph"].map((n: any) => n["@type"]);

const lote = {
  id: "abc123", categoria: "verde", finca: "La Esperanza", provincia: "Loja", variedad: "Typica", proceso: "Lavado",
  altura: 1800, score: 86, precioSaco: 320, stockSacos: 4, descripcion: 'Notas a panela y "cítricos" <b>dulces</b>.',
  imagenes: ["/uploads/user-content/foto-1.jpg", "/etc/passwd"], visibilidad: "publico", productor: "Nombre Persona",
};

describe("datos estructurados", () => {
  it("portada: organización y sitio, sin perder el resto del HTML", () => {
    const html = leer("");
    const out = seoPagina("/", html);
    const g = ld(out);
    expect(tipos(g)).toEqual(["Organization", "WebSite", "WebPage"]);
    expect(g["@graph"][0].sameAs).toContain("https://www.facebook.com/RedCafeEcuador");
    expect(out.length - html.length).toBeLessThan(4000);
    // El payload de Next no cambia (solo el script del HTML).
    expect(out.split("self.__next_f").length).toBe(html.split("self.__next_f").length);
  });

  it("receta con ingredientes y pasos", () => {
    const g = ld(seoPagina("/recetas/v60/", leer("recetas/v60")));
    const r = g["@graph"].find((n: any) => n["@type"] === "Recipe");
    expect(r.recipeIngredient.length).toBeGreaterThan(1);
    expect(r.recipeInstructions[0]["@type"]).toBe("HowToStep");
    expect(r.totalTime).toBe("PT4M");
    expect(tipos(g)).toContain("BreadcrumbList");
  });

  it("noticia con fecha y curso con proveedor", () => {
    const a = ld(seoPagina("/noticias/postcosecha-errores/", leer("noticias/postcosecha-errores")))["@graph"].find((n: any) => n["@type"] === "Article");
    expect(a.datePublished).toBe("2026-07-28");
    const c = ld(seoPagina("/academia/tueste/", leer("academia/tueste")))["@graph"].find((n: any) => n["@type"] === "Course");
    expect(c.name).toBe("Tueste y Blending para Tostadores");
    expect(c.offers.category).toBe("Free");
    expect(c.hasCourseInstance.courseWorkload).toBe("PT4H");
  });

  it("no toca páginas con noindex", () => {
    const html = leer("chat");
    expect(seoPagina("/chat/", html)).toBe(html);
  });

  it("lote real: título y descripción propios en HTML y payload, producto con oferta", () => {
    const html = leer("marketplace/ficha");
    const out = seoPagina("/marketplace/abc123/", html, { lote });
    const t = textosLote(lote);
    expect(out).not.toContain("Lote de café · Red Café Ecuador");
    expect(out).toContain(`<title>${t.titulo}</title>`);
    expect(out).toContain(`\\"children\\":\\"${t.titulo}\\"`);
    expect(t.descripcion.length).toBeLessThanOrEqual(158);
    expect(t.descripcion).not.toMatch(/["<>]/);
    expect(out).not.toContain("Nombre Persona");
    const p = ld(out)["@graph"].find((n: any) => n["@type"] === "Product");
    expect(p.offers.price).toBe("320.00");
    expect(p.offers.availability).toBe("https://schema.org/InStock");
    expect(p.image).toEqual(["https://redcafeecuador.com/uploads/user-content/foto-1.jpg"]);
    expect(p.description).not.toMatch(/[<>"]/);
  });

  it("lote inexistente u oculto: noindex en HTML y payload", () => {
    const out = seoPagina("/marketplace/nada/", leer("marketplace/ficha"), { lote: null });
    expect(out).toContain('<meta name="robots" content="noindex, follow"/>');
    expect(out).toContain('\\"name\\":\\"robots\\",\\"content\\":\\"noindex, follow\\"');
    expect(noIndexar(leer("marketplace/ficha"))).toContain("noindex, follow");
  });

  it("todas las páginas públicas dan un JSON-LD válido", () => {
    for (const r of ["servicios/precios", "quienes-somos", "marketplace", "academia", "noticias", "recetas"]) {
      const g = grafo(`/${r}/`, leer(r));
      expect(JSON.stringify(g)).not.toContain("undefined");
      expect(g["@graph"].length).toBeGreaterThanOrEqual(4);
    }
  });
});
