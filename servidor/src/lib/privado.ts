import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

export function carpetaIdentidad(): string {
  // Resolver también enlaces simbólicos, incluso si el destino aún no existe.
  const real = (p: string): string => fs.existsSync(p) ? fs.realpathSync(p) : path.join(real(path.dirname(p)), path.basename(p));
  const privado = real(path.resolve(config.privado));
  for (const publico of [config.sitio, config.uploads]) {
    const relativo = path.relative(real(path.resolve(publico)), privado);
    if (!relativo || (!relativo.startsWith(".." + path.sep) && relativo !== ".." && !path.isAbsolute(relativo))) {
      throw new Error("REDCAFE_PRIVADO debe estar fuera del sitio y de REDCAFE_UPLOADS.");
    }
  }
  fs.mkdirSync(privado, { recursive: true, mode: 0o700 });
  fs.chmodSync(privado, 0o700);
  const dir = path.join(privado, "identidad");
  if (fs.existsSync(dir) && fs.lstatSync(dir).isSymbolicLink()) throw new Error("La carpeta privada identidad no puede ser un enlace simbólico.");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
  return dir;
}
