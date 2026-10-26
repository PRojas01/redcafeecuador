// Sustituye a api/agregar-cursos.php (script web con clave fija):
//   npm run agregar-cursos -- cursos-nuevos.json            simulación
//   npm run agregar-cursos -- cursos-nuevos.json --aplicar  escribe
// Añade a la Academia los cursos cuyo id no exista; nunca reemplaza.
import "../entorno.js"; // lee servidor/.env (DATABASE_URL, REDCAFE_CLAVE_DATOS)
import fs from "node:fs";
import { db } from "../lib/db.js";
import { listar, mutar, type Doc } from "../lib/docs.js";

const [archivo] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const aplicar = process.argv.includes("--aplicar");

async function main() {
  if (!archivo || !fs.existsSync(archivo)) { console.error("Uso: npm run agregar-cursos -- <cursos-nuevos.json> [--aplicar]"); process.exit(2); }
  const nuevos = JSON.parse(fs.readFileSync(archivo, "utf8")) as Doc[];
  if (!Array.isArray(nuevos) || !nuevos.length) throw new Error("El archivo no es una lista de cursos.");
  const ya = new Set((await listar("contenido-cursos")).map((c) => String(c.id)));
  const anadir = nuevos.filter((c) => c?.id && !ya.has(String(c.id)));
  console.log(`Modo: ${aplicar ? "APLICAR" : "SIMULACIÓN"} · ${ya.size} cursos actuales · ${anadir.length} nuevos · ${nuevos.length - anadir.length} ya existían`);
  for (const c of anadir) console.log(`  + ${c.id} (${(c.modulos ?? []).length} módulos)`);
  if (aplicar && anadir.length) {
    await mutar("contenido-cursos", (l) => [...l, ...anadir.filter((c) => !l.some((x) => x.id === c.id))]);
    await mutar("cursos", (l) => [...l, ...anadir.filter((c) => !l.some((x) => x.id === c.id)).map((c) => ({
      id: c.id, titulo: c.titulo, nivel: c.nivel ?? "Básico", duracion: c.duracion ?? "", categoria: c.categoria ?? "general", descripcion: c.descripcion ?? "",
      modulos: (c.modulos ?? []).map((m: Doc) => ({ titulo: m.titulo, minutos: Math.trunc(Number(m.minutos ?? 0)) })),
    }))]);
    console.log("Hecho.");
  }
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e.message ?? e); await db.$disconnect(); process.exit(1); });
