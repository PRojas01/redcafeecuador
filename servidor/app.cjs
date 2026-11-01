// Punto de entrada para cPanel «Setup Node.js App» (Phusion Passenger).
// Passenger carga este archivo con require(); el servidor es ESM, así que se
// importa de forma dinámica. Antes: npm install && npm run build.
import("./dist/index.js").catch((e) => {
  console.error("No se pudo arrancar Red Café:", e);
  process.exit(1);
});
