#!/usr/bin/env node
// Genera servidor/src/datos/seo-contenido.json: lo que el servidor necesita para
// los datos estructurados (schema.org) de recetas y noticias. Sale del mismo
// contenido que usa el sitio (plataforma_cafe/lib), así que hay que volver a
// correrlo cuando cambie una receta o una noticia:
//   node herramientas/generar-seo-contenido.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = path.join(raiz, "plataforma_cafe/lib");

const recetas = {};
for (const r of JSON.parse(fs.readFileSync(path.join(lib, "contenido/recetas.json"), "utf8"))) {
  recetas[r.slug || r.id] = {
    titulo: r.titulo, resumen: r.resumen, metodo: r.metodo, minutos: r.minutos, porciones: r.porciones,
    ingredientes: r.ingredientes ?? [], pasos: r.pasos ?? [],
  };
}

// NOTICIAS vive en data.ts (TypeScript): se leen solo los campos simples.
const ts = fs.readFileSync(path.join(lib, "data.ts"), "utf8");
const ini = ts.indexOf("export const NOTICIAS");
const fin = ts.indexOf("export const", ini + 10);
const bloque = ts.slice(ini, fin);
const campo = (t, n) => {
  const m = new RegExp(`\\n\\s*${n}:\\s*\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(t);
  return m ? JSON.parse(`"${m[1]}"`) : "";
};
const noticias = {};
for (const trozo of bloque.split(/\n  \{\n/).slice(1)) {
  const slug = campo(trozo, "slug");
  if (!slug) continue;
  noticias[slug] = {
    titulo: campo(trozo, "titulo"), fecha: campo(trozo, "fecha"), resumen: campo(trozo, "resumen"),
    fuente: campo(trozo, "fuente"), fuente_url: campo(trozo, "fuente_url"), categoria: campo(trozo, "categoria"),
  };
}

const salida = path.join(raiz, "servidor/src/datos/seo-contenido.json");
fs.writeFileSync(salida, JSON.stringify({ recetas, noticias }, null, 1) + "\n");
console.log(`seo-contenido.json: ${Object.keys(recetas).length} recetas, ${Object.keys(noticias).length} noticias`);
