// Ajuste de la base tras crear las tablas (lo llama npm run db:push):
// intercalación utf8mb4_bin, para que «Lote-A» y «lote-a», o «café» y «cafe»,
// sean identificadores distintos. cPanel crea las bases con una intercalación
// que no distingue mayúsculas ni acentos, y eso haría chocar claves.
import "../entorno.js";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const base = decodeURIComponent(new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, ""));
if (!/^[A-Za-z0-9_$-]+$/.test(base)) throw new Error("Nombre de base no válido en DATABASE_URL");
const [{ v }] = await db.$queryRawUnsafe<{ v: string }[]>("SELECT VERSION() AS v");
const tablas = await db.$queryRawUnsafe<{ t: string }[]>(
  "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' AND table_collation <> 'utf8mb4_bin'",
  base,
);
// Una sola conexión: las claves foráneas se comprueban al terminar, no tabla a tabla.
await db.$transaction(async (tx) => {
  await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const { t } of tablas) {
      if (!/^[A-Za-z0-9_]+$/.test(t)) continue;
      await tx.$executeRawUnsafe(`ALTER TABLE \`${t}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);
    }
  } finally {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
}, { timeout: 600_000, maxWait: 30_000 });
console.log(`Base «${base}» (${v}): ${tablas.length} tabla(s) pasadas a utf8mb4_bin.`);
await db.$disconnect();
