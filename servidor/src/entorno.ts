// Carga servidor/.env si existe (pm2, Passenger). Se importa la primera para
// que la configuración ya vea las variables. Las del sistema tienen prioridad.
// Lector propio (no process.loadEnvFile) para funcionar también en Node 18/20,
// que es lo que suelen ofrecer los cPanel compartidos.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const archivo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
if (fs.existsSync(archivo)) {
  for (const linea of fs.readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(linea);
    if (!m || m[1] in process.env) continue;
    let v = m[2];
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, "");
    process.env[m[1]] = v;
  }
}

// Plataformas con MySQL gestionado (GoDaddy Node.js Hosting y similares) dan
// los datos de conexión por separado. Si falta DATABASE_URL, se arma con ellos.
if (!process.env.DATABASE_URL) {
  const e = process.env;
  const de = (...n: string[]) => n.map((k) => e[k]).find((v) => v && v.trim() !== "")?.trim();
  const host = de("DB_HOST", "MYSQL_HOST", "DATABASE_HOST", "MYSQLHOST", "DB_HOSTNAME");
  const usuario = de("DB_USER", "DB_USERNAME", "MYSQL_USER", "MYSQL_USERNAME", "DATABASE_USER", "DATABASE_USERNAME", "MYSQLUSER");
  const clave = de("DB_PASSWORD", "DB_PASS", "MYSQL_PASSWORD", "DATABASE_PASSWORD", "MYSQLPASSWORD") ?? "";
  const base = de("DB_NAME", "DB_DATABASE", "MYSQL_DATABASE", "MYSQL_DB", "DATABASE_NAME", "MYSQLDATABASE");
  const puerto = de("DB_PORT", "MYSQL_PORT", "DATABASE_PORT", "MYSQLPORT") ?? "3306";
  if (host && usuario && base) {
    const ssl = /^(1|true|required?)$/i.test(de("DB_SSL", "MYSQL_SSL") ?? "") ? "?sslaccept=accept_invalid_certs" : "";
    e.DATABASE_URL = `mysql://${encodeURIComponent(usuario)}:${encodeURIComponent(clave)}@${host}:${puerto}/${encodeURIComponent(base)}${ssl}`;
  }
}

// Paneles de hosting: a veces el valor se pega con espacios, saltos de línea o
// comillas alrededor. Se limpian en las variables que lo toleran.
for (const v of ["REDCAFE_CLAVE_DATOS", "REDCAFE_PASS_ADMIN_INICIAL", "REDCAFE_PASS_ADMIN_RESTABLECER", "REDCAFE_IMPORTACION", "REDCAFE_ENTORNO", "REDCAFE_PROXY_CONFIABLE"]) {
  const crudo = process.env[v];
  if (crudo === undefined) continue;
  let limpio = crudo.trim();
  if (/^(["']).*\1$/s.test(limpio)) limpio = limpio.slice(1, -1).trim();
  if (v === "REDCAFE_CLAVE_DATOS") limpio = limpio.replace(/\s+/g, "");
  process.env[v] = limpio;
}
