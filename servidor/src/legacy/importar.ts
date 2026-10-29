// Importador del sistema PHP desde una carpeta: data/*.json → MySQL.
//
//   npm run importar -- <carpeta data/>                 simulación (no escribe)
//   npm run importar -- <carpeta data/> --aplicar       importa
//   ... --aplicar --sincronizar   el sitio antiguo manda: actualiza miembros y sustituye colecciones
//   opciones: --pass-admin <archivo .redcafe_admin_pass>
//
// La lógica está en importador.ts; aquí solo se lee la carpeta.
import "../entorno.js"; // lee servidor/.env (DATABASE_URL, REDCAFE_CLAVE_DATOS)
import fs from "node:fs";
import path from "node:path";
import { db } from "../lib/db.js";
import { importar, type Fuente } from "./importador.js";

const args = process.argv.slice(2);
const DATA = path.resolve(args.find((a) => !a.startsWith("--")) ?? "");
const APLICAR = args.includes("--aplicar");
const archivoAdmin = (() => { const i = args.indexOf("--pass-admin"); return i >= 0 ? args[i + 1] : ""; })();

function leerCarpeta(): { fuente: Fuente; fechas: Map<string, string> } {
  const fuente: Fuente = new Map();
  const fechas = new Map<string, string>();
  for (const nombre of fs.readdirSync(DATA)) {
    const f = path.join(DATA, nombre);
    if (fs.statSync(f).isFile()) fuente.set(nombre, fs.readFileSync(f));
  }
  const pags = path.join(DATA, "paginas");
  if (fs.existsSync(pags)) for (const nombre of fs.readdirSync(pags)) {
    const f = path.join(pags, nombre);
    if (!fs.statSync(f).isFile()) continue;
    fuente.set("paginas/" + nombre, fs.readFileSync(f));
    fechas.set("paginas/" + nombre, fs.statSync(f).mtime.toISOString());
  }
  // La contraseña de administración vive fuera de data/ en el PHP.
  const candidatos = [archivoAdmin, path.join(path.dirname(DATA), "..", ".redcafe_admin_pass"), path.join(DATA, ".redcafe_admin_pass")].filter(Boolean);
  const admin = candidatos.find((c) => fs.existsSync(c));
  if (admin) fuente.set(".redcafe_admin_pass", fs.readFileSync(admin));
  return { fuente, fechas };
}

async function main() {
  if (!DATA || !fs.existsSync(DATA)) { console.error("Uso: npm run importar -- <carpeta data/> [--aplicar] [--sincronizar] [--pass-admin <archivo>]"); process.exit(2); }
  console.log(`Importador Red Café · origen ${DATA} · modo ${APLICAR ? "APLICAR" : "SIMULACIÓN (no se escribe nada)"}\n`);
  const { fuente, fechas } = leerCarpeta();
  const { informe, avisos } = await importar(fuente, { aplicar: APLICAR, fechas, modo: args.includes("--sincronizar") ? "sincronizar" : "inicial" });
  const ancho = Math.max(...informe.map((i) => i.archivo.length), 10);
  for (const i of informe) console.log(`${i.archivo.padEnd(ancho)}  → ${i.destino.padEnd(24)} ${String(i.filas).padStart(5)}  ${i.accion}`);
  if (avisos.length) { console.log("\nAvisos:"); for (const a of avisos) console.log("  · " + a); }
  console.log(`\nNo se migran: sesiones, OTP, cupos (.rate), bloqueos (.locks) ni lotes de demostración.`);
  console.log(APLICAR ? "\nHecho." : "\nSimulación terminada. Repite con --aplicar para importar.");
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
