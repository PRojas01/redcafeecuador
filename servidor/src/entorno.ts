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
