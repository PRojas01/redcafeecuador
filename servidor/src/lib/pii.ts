// Datos personales cifrados en reposo (LOPDP): la cédula/RUC se guarda con
// AES-256-GCM y una huella HMAC permite buscar duplicados sin descifrar.
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { config } from "./config.js";

export function cifrar(texto: string): string {
  if (!texto) return "";
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", config.claveDatos(), iv);
  const cuerpo = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), cuerpo.toString("base64url")].join(".");
}

export function descifrar(sobre: string): string {
  if (!sobre) return "";
  const [v, iv, tag, cuerpo] = sobre.split(".");
  if (v !== "v1" || !iv || !tag || cuerpo === undefined) return "";
  const d = createDecipheriv("aes-256-gcm", config.claveDatos(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(cuerpo, "base64url")), d.final()]).toString("utf8");
}

export function huella(texto: string): string {
  if (!texto) return "";
  return createHmac("sha256", config.claveDatos()).update("huella|" + texto.trim().toUpperCase()).digest("hex");
}
