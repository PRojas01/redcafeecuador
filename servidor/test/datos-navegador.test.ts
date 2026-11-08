// Los cuadernos de campo, favoritos e informes viven solo en el navegador de cada
// miembro (localStorage). Al pasar de PHP a Node el dominio no cambia, así que
// siguen ahí... siempre que el código lea las mismas claves. Esta prueba avisa si
// alguien renombra una clave o crea otra que /mis-datos-del-navegador/ no conoce.
import { expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pagina = fs.readFileSync(path.join(raiz, "sitio/mis-datos-del-navegador/index.html"), "utf8");
const conocidas = new Set([...pagina.slice(pagina.indexOf("var NOMBRES"), pagina.indexOf("};", pagina.indexOf("var NOMBRES"))).matchAll(/(redcafe_[a-z_]+):/g)].map((m) => m[1]));

function fuentes(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (["node_modules", ".next", "out", "public"].includes(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? fuentes(p) : /\.(tsx?)$/.test(e.name) ? [p] : [];
  });
}

it("la página de copia conoce todas las claves con datos de los miembros", () => {
  const usadas = new Set<string>();
  for (const f of fuentes(path.join(raiz, "plataforma_cafe"))) {
    const t = fs.readFileSync(f, "utf8");
    for (const m of t.matchAll(/(?:leer|guardar)Bitacora(?:<[^>]*>)?\(\s*"([a-z_]+)"/g)) usadas.add("redcafe_" + m[1]);
    for (const m of t.matchAll(/const KEY = "(redcafe_[a-z_]+)"/g)) if (m[1] !== "redcafe_sesion") usadas.add(m[1]);
    for (const m of t.matchAll(/const key = "(redcafe_[a-z_]+)"/g)) usadas.add(m[1]);
  }
  expect(usadas.size).toBeGreaterThan(10);
  const faltan = [...usadas].filter((k) => !conocidas.has(k));
  expect(faltan, "añade estas claves a NOMBRES en sitio/mis-datos-del-navegador/index.html").toEqual([]);
});

it("la página no se conecta a ningún sitio", () => {
  expect(pagina).toContain("connect-src 'none'");
  expect(pagina).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|<script[^>]+src=/);
});
