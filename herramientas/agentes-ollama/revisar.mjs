#!/usr/bin/env node
// Pasa archivos a Ollama (local) por partes y guarda lo que responde.
// Uso: node revisar.mjs <instrucciones.txt> <salida.md> <archivo...>
// Variables: OLLAMA_MODELO (qwen3:14b), OLLAMA_URL, PARTE (caracteres por llamada, 14000)
import fs from 'node:fs';
import path from 'node:path';

const [instrucciones, salida, ...archivos] = process.argv.slice(2);
if (!instrucciones || !salida || archivos.length === 0) {
  console.error('Uso: node revisar.mjs <instrucciones.txt> <salida.md> <archivo...>');
  process.exit(1);
}
const MODELO = process.env.OLLAMA_MODELO || 'qwen3:14b';
const URL = (process.env.OLLAMA_URL || 'http://localhost:11434') + '/api/generate';
const PARTE = Number(process.env.PARTE || 14000);
const PROHIBIDO = /(^|\/)(data|uploads|Respaldo)\/|(^|\/)\.env($|\.)(?!ejemplo)/;
const tarea = fs.readFileSync(instrucciones, 'utf8');

// Junta archivos con su ruta y número de línea, y corta en partes.
const partes = [];
let actual = '';
for (const a of archivos) {
  if (PROHIBIDO.test(a)) { console.error('Omitido (datos privados):', a); continue; }
  const lineas = fs.readFileSync(a, 'utf8').split('\n')
    .map((l, i) => `${String(i + 1).padStart(4)}| ${l}`);
  let bloque = `\n=== ${a} ===\n`;
  for (const l of lineas) {
    if (actual.length + bloque.length + l.length > PARTE) {
      partes.push(actual + bloque);
      actual = '';
      bloque = `\n=== ${a} (sigue) ===\n`;
    }
    bloque += l + '\n';
  }
  actual += bloque;
}
if (actual) partes.push(actual);

fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, `# Revisión con ${MODELO}\n\n`);
for (let i = 0; i < partes.length; i++) {
  const prompt = `${tarea}\n\nCÓDIGO (parte ${i + 1}/${partes.length}):\n${partes[i]}`;
  const t0 = Date.now();
  const r = await fetch(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODELO, prompt, stream: false, think: false,
      options: { num_ctx: 16384, temperature: 0.1 } }),
  });
  const j = await r.json();
  fs.appendFileSync(salida, `## Parte ${i + 1}/${partes.length}\n\n${(j.response || j.error || '').trim()}\n\n`);
  console.error(`parte ${i + 1}/${partes.length} lista en ${Math.round((Date.now() - t0) / 1000)} s`);
}
