#!/usr/bin/env node
// Vigilante de datos personales del repositorio.
//
// Revisa todos los archivos versionados y falla (código 1) si encuentra:
//   · archivos de datos: data/*.json, uploads/user-content/, paquetes cifrados,
//     copias anónimas, volcados .sql, .zip, .env, la contraseña de administración;
//   · correos, teléfonos ecuatorianos o cédulas/RUC válidos que no estén en
//     herramientas/datos-permitidos.txt.
// Se ejecuta en GitHub en cada push y PR (.github/workflows/datos-personales.yml)
// y a mano con: node herramientas/vigilar-datos.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const raiz = execFileSync("git", ["rev-parse", "--show-toplevel"]).toString().trim();
process.chdir(raiz);
const permitidos = new Set(
  fs.readFileSync(path.join("herramientas", "datos-permitidos.txt"), "utf8")
    .split("\n").map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith("#")),
);

const RUTAS_PROHIBIDAS = [
  [/(^|\/)data\/[^/]+\.json$/i, "archivo de datos (data/*.json)"],
  [/(^|\/)data\/\.[^/]+$/i, "secreto de data/"],
  [/(^|\/)uploads\/user-content\//i, "foto o documento subido por miembros"],
  [/\.rcpaquete$/i, "paquete cifrado con datos reales"],
  [/redcafe-anonimo[^/]*\.json$/i, "copia anónima (no se versiona)"],
  [/(^|\/)(members|consents|chats|messages)\.json$/i, "datos de miembros"],
  [/\.redcafe_admin_pass$/i, "contraseña de administración"],
  [/(^|\/)\.env(\.(?!ejemplo$)[^/]*)?$/i, "variables de entorno con secretos"],
  [/\.zip$/i, "archivo comprimido (puede llevar datos)"],
  [/respaldo-[^/]*\.json\.gz$/i, "respaldo de la base"],
];
const SQL_PERMITIDOS = new Set(["servidor/prisma/esquema-mysql.sql", "servidor/prisma/tablas-para-pegar.sql"]);
const DOMINIOS_LIBRES = /@(ejemplo\.test|example\.(com|org|net)|redcafeecuador\.com|users\.noreply\.github\.com|anthropic\.com)$/i;

const RE_CORREO = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const RE_TELEFONO = /(?<![\d])(?:\+?593[\s-]?9\d{8}|09\d{8})(?!\d)/g;
const RE_NUMERO = /(?<![\d.])(\d{10}(?:001)?)(?![\d.])/g;

/** Cédula ecuatoriana válida (módulo 10). Los 13 dígitos terminados en 001 son un RUC de persona natural. */
function cedulaValida(n) {
  const c = n.slice(0, 10);
  const prov = Number(c.slice(0, 2));
  if (!((prov >= 1 && prov <= 24) || prov === 30) || Number(c[2]) > 5) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) { let v = Number(c[i]) * (i % 2 === 0 ? 2 : 1); if (v > 9) v -= 9; s += v; }
  return (10 - (s % 10)) % 10 === Number(c[9]);
}

const archivos = execFileSync("git", ["ls-files", "-z"]).toString().split("\0").filter(Boolean);
const hallazgos = [];
for (const f of archivos) {
  for (const [re, motivo] of RUTAS_PROHIBIDAS) if (re.test(f)) hallazgos.push(`${f}: ${motivo}`);
  if (/\.sql$/i.test(f) && !SQL_PERMITIDOS.has(f)) hallazgos.push(`${f}: volcado SQL (puede llevar datos)`);
  let texto;
  try {
    const b = fs.readFileSync(f);
    if (b.length > 5 * 1024 * 1024 || b.includes(0)) continue; // binarios
    texto = b.toString("utf8");
  } catch { continue; }
  const lineas = texto.split("\n");
  lineas.forEach((linea, i) => {
    const donde = `${f}:${i + 1}`;
    for (const m of linea.match(RE_CORREO) ?? []) {
      const c = m.toLowerCase();
      if (!DOMINIOS_LIBRES.test(c) && !permitidos.has(c) && !/\.(png|jpe?g|webp|svg|gif|js|css)$/i.test(c)) hallazgos.push(`${donde}: correo ${m}`);
    }
    for (const m of linea.match(RE_TELEFONO) ?? []) {
      const t = m.replace(/\D/g, "");
      if (!permitidos.has(t) && !permitidos.has("+" + t)) hallazgos.push(`${donde}: teléfono ${m}`);
    }
    for (const [, n] of linea.matchAll(RE_NUMERO)) {
      if (cedulaValida(n) && !permitidos.has(n)) hallazgos.push(`${donde}: posible cédula o RUC ${n.slice(0, 3)}…`);
    }
  });
}

if (hallazgos.length) {
  console.error(`Posibles datos personales en el repositorio (${hallazgos.length}):`);
  for (const h of hallazgos.slice(0, 200)) console.error("  · " + h);
  console.error("\nQuítalos del commit. Si un valor es público o ficticio, añádelo a herramientas/datos-permitidos.txt.");
  process.exit(1);
}
console.log(`Sin datos personales: ${archivos.length} archivos revisados.`);
