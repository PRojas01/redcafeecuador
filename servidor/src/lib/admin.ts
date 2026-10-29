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

/**
 * Rescate: si REDCAFE_PASS_ADMIN_RESTABLECER tiene 12+ caracteres, al arrancar
 * se fija como contraseña de administración (si no lo es ya). Pensado para
 * cuando la base ya tenía una contraseña que nadie conoce. Se borra la
 * variable después de entrar.
 */
export async function restablecerPassAdminDesdeEntorno() {
  const nueva = (process.env.REDCAFE_PASS_ADMIN_RESTABLECER ?? "").trim();
  if (!nueva) return;
  if (nueva.length < 12) { console.warn("[admin] REDCAFE_PASS_ADMIN_RESTABLECER necesita 12 caracteres o más; se ignora."); return; }
  if (candidatos().length) return; // modo archivo (solo pruebas)
  const fila = await db.administrador.findUnique({ where: { id: "principal" } });
  if (fila && esHash(fila.passHash) && (await bcrypt.compare(nueva, fila.passHash))) return;
  await escribirPassAdmin(nueva);
  console.warn("[admin] Contraseña de administración restablecida desde REDCAFE_PASS_ADMIN_RESTABLECER. Borra esa variable ahora.");
}

/**
 * Clave de datos (cifra las cédulas). Fuente, por orden:
 *  1. La guardada en la base (Secreto «clave_datos»), si existe: así nunca
 *     cambia la clave con la que ya se cifraron datos.
 *  2. REDCAFE_CLAVE_DATOS, si es válida (64 hex).
 *  3. Si no hay ninguna (el panel no pasa bien el secreto), se genera una y se
 *     guarda en la base. Más cómodo, menos protegido: una copia completa de la
 *     base lleva la clave dentro.
 */
export async function prepararClaveDatos() {
  const valida = (v?: string | null) => !!v && /^[0-9a-f]{64}$/i.test(v);
  const env = process.env.REDCAFE_CLAVE_DATOS;
  const fila = await db.secreto.findUnique({ where: { nombre: "clave_datos" } });
  if (fila && valida(fila.valor)) {
    if (valida(env) && env!.toLowerCase() !== fila.valor.toLowerCase()) console.warn("[clave] REDCAFE_CLAVE_DATOS no coincide con la guardada en la base; se usa la de la base.");
    process.env.REDCAFE_CLAVE_DATOS = fila.valor;
    process.env.REDCAFE_CLAVE_DATOS_ORIGEN = "base";
    return;
  }
  if (valida(env)) { process.env.REDCAFE_CLAVE_DATOS_ORIGEN = "variable"; return; }
  const nueva = randomBytes(32).toString("hex");
  await db.secreto.createMany({ data: [{ nombre: "clave_datos", valor: nueva }], skipDuplicates: true });
  const guardada = await db.secreto.findUnique({ where: { nombre: "clave_datos" } });
  process.env.REDCAFE_CLAVE_DATOS = guardada!.valor;
  process.env.REDCAFE_CLAVE_DATOS_ORIGEN = "base";
  console.warn("[clave] REDCAFE_CLAVE_DATOS no es válida: se generó una clave de datos y se guardó en la base.");
}
