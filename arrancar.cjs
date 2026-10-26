// Arranque desde la raíz del repositorio (GoDaddy Node.js Hosting y similares).
// Si la plataforma no ejecutó la instalación de servidor/ (postinstall), se hace
// aquí una vez: instalar dependencias, generar Prisma y compilar. Luego arranca.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const srv = path.join(__dirname, "servidor");
const listo = () =>
  fs.existsSync(path.join(srv, "dist", "index.js")) &&
  fs.existsSync(path.join(srv, "node_modules", ".prisma", "client", "index.js"));

if (!listo()) {
  console.log("[arranque] Preparando servidor/ (instalación y compilación, solo la primera vez)…");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  for (const args of [["ci", "--include=dev", "--no-audit", "--no-fund"], ["run", "build"]]) {
    const r = spawnSync(npm, args, { cwd: srv, stdio: "inherit", env: process.env });
    if (r.status !== 0) {
      console.error(`[arranque] Falló «npm ${args.join(" ")}» en servidor/.`);
      process.exit(1);
    }
  }
}
require(path.join(srv, "app.cjs"));
