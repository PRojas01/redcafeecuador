// Carga servidor/.env si existe (pm2, Passenger). Se importa la primera para
// que la configuración ya vea las variables. Las del sistema tienen prioridad.
import path from "node:path";
import { fileURLToPath } from "node:url";
const archivo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
try {
  process.loadEnvFile(archivo);
} catch {
  /* sin .env: se usan las variables del entorno */
}
