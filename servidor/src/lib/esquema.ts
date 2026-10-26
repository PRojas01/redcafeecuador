// Crea las tablas la primera vez, si la base está vacía. En GoDaddy Node.js
// Hosting la base gestionada llega vacía y no hay Terminal: así no hace falta
// importar nada a mano. Nunca toca una base que ya tiene tablas.
import fs from "node:fs";
import path from "node:path";
import { db } from "./db.js";
import { config } from "./config.js";

export async function asegurarEsquema(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const hay = await db.$queryRawUnsafe<{ n: bigint }[]>(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'Usuario'",
  );
  if (Number(hay[0]?.n ?? 0) > 0) return;
  const sql = fs.readFileSync(path.join(config.raiz, "prisma", "esquema-mysql.sql"), "utf8");
  const sentencias = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter((s) => s && !/^SET (NAMES|FOREIGN_KEY_CHECKS)/i.test(s));
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const s of sentencias) await tx.$executeRawUnsafe(s);
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }, { timeout: 120_000, maxWait: 30_000 });
  console.log(`[esquema] Base vacía: creadas ${sentencias.filter((s) => /^CREATE TABLE/i.test(s)).length} tablas.`);
}
