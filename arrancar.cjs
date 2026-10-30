// Arranque desde la raíz del repositorio (GoDaddy Node.js Hosting y similares).
// Escucha siempre en process.env.PORT y en 0.0.0.0, que es lo que exige el hosting.
// Si la plataforma no ejecutó la instalación de servidor/ (postinstall), se hace
// aquí una vez (instalar dependencias, generar Prisma y compilar). Mientras tanto
// responde una página de «preparando» en el mismo puerto, para que el hosting no
// dé el arranque por fallido. Después arranca el servidor de verdad.
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PUERTO = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
process.env.PORT = String(PUERTO);
process.env.HOST = HOST;

const srv = path.join(__dirname, "servidor");
const listo = () =>
  fs.existsSync(path.join(srv, "dist", "index.js")) &&
  fs.existsSync(path.join(srv, "node_modules", ".prisma", "client", "index.js"));

function correr(args) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  return new Promise((ok, mal) => {
    const p = spawn(npm, args, { cwd: srv, stdio: "inherit", env: process.env });
    p.on("error", mal);
    p.on("exit", (c) => (c === 0 ? ok() : mal(new Error(`«npm ${args.join(" ")}» terminó con código ${c}`))));
  });
}

function arrancar() {
  require(path.join(srv, "app.cjs"));
}

if (listo()) {
  arrancar();
} else {
  console.log("[arranque] Preparando servidor/ (instalación y compilación, solo la primera vez)…");
  let fallo = null;
  const server = http.createServer((req, res) => {
    res.writeHead(fallo ? 500 : 503, { "content-type": "text/plain; charset=utf-8", "retry-after": "30" });
    res.end(fallo ? "Red Café: no se pudo preparar el servidor. Revisa los registros." : "Red Café se está preparando. Vuelve en un minuto.");
  });
  server.listen(process.env.PORT || 3000, "0.0.0.0", () => console.log(`[arranque] Escuchando en ${HOST}:${PUERTO} mientras se prepara.`));
  (async () => {
    try {
      await correr(["ci", "--include=dev", "--no-audit", "--no-fund"]);
      await correr(["run", "build"]);
    } catch (e) {
      fallo = e;
      console.error("[arranque] Falló la preparación de servidor/:", e.message);
      return; // se queda respondiendo 500 para que el error se vea en los registros
    }
    server.close(() => arrancar());
  })();
}
