// Contraseña de administración.
//
// Transición: mientras exista la cuenta única del sistema PHP, se guarda su
// hash bcrypt en la tabla Administrador. Si REDCAFE_ARCHIVO_PASS_ADMIN=auto
// (solo pruebas de paridad con qa/) se lee y escribe el archivo
// .redcafe_admin_pass igual que hacía PHP.
// La Fase 1 del plan añade cuentas nominales con TOTP.
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { config } from "./config.js";

const COSTE = 10;

function candidatos(): string[] {
  if (config.archivoPassAdmin !== "auto") return config.archivoPassAdmin ? [config.archivoPassAdmin] : [];
  return [path.join(path.dirname(config.sitio), ".redcafe_admin_pass"), path.join(config.sitio, "data", ".redcafe_admin_pass")];
}

/** Valor guardado (bcrypt o, solo legado, texto plano). */
export async function passAdminGuardada(): Promise<string> {
  const archivos = candidatos();
  if (archivos.length) {
    for (const f of archivos) {
      if (fs.existsSync(f)) {
        const v = fs.readFileSync(f, "utf8").replace(/^﻿/, "").trim();
        if (v) return v;
      }
    }
    // Como PHP: si no hay ninguna, se crea una aleatoria.
    const nueva = randomBytes(12).toString("hex");
    const destino = archivos[archivos.length - 1];
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, nueva, { mode: 0o600 });
    return nueva;
  }
  const fila = await db.administrador.findUnique({ where: { id: "principal" } });
  if (fila) return fila.passHash;
  // Instalación nueva: la contraseña inicial puede venir del .env (sin Terminal
  // no se ve el registro del servidor); si no, una aleatoria que sale en el registro.
  const inicial = (process.env.REDCAFE_PASS_ADMIN_INICIAL ?? "").trim();
  if (inicial.length >= 12) {
    const hash = await bcrypt.hash(inicial, COSTE);
    await db.administrador.createMany({ data: [{ id: "principal", passHash: hash }], skipDuplicates: true });
    return (await db.administrador.findUnique({ where: { id: "principal" } }))!.passHash;
  }
  const nueva = randomBytes(12).toString("hex");
  await db.administrador.create({ data: { id: "principal", passHash: await bcrypt.hash(nueva, COSTE) } });
  console.warn(`[admin] Contraseña inicial de administración: ${nueva} — cámbiala desde Ajustes.`);
  return bcrypt.hash(nueva, COSTE);
}

export const esHash = (v: string) => /^\$2[aby]\$/.test(v);

export async function verificarPassAdmin(entrada: string, guardada: string): Promise<boolean> {
  if (!guardada) return false;
  if (esHash(guardada)) return bcrypt.compare(entrada, guardada.replace(/^\$2y\$/, "$2b$"));
  // Texto plano heredado: comparación de tiempo constante.
  const a = Buffer.from(guardada), b = Buffer.from(entrada);
  return a.length === b.length && (await import("node:crypto")).timingSafeEqual(a, b);
}

export async function escribirPassAdmin(plano: string) {
  const hash = await bcrypt.hash(plano, COSTE);
  const archivos = candidatos();
  if (archivos.length) {
    for (const f of archivos) if (fs.existsSync(path.dirname(f))) fs.writeFileSync(f, hash, { mode: 0o600 });
    return;
  }
  await db.administrador.upsert({ where: { id: "principal" }, create: { id: "principal", passHash: hash }, update: { passHash: hash, provisionalHasta: null } });
}

export async function provisionalCaducada(): Promise<boolean> {
  const f = await db.administrador.findUnique({ where: { id: "principal" } });
  return !!f?.provisionalHasta && f.provisionalHasta.getTime() < Date.now();
}
