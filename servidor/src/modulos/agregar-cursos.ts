// api/agregar-cursos.php era un script de un solo uso con clave fija en el
// código. En la plataforma nueva eso se hace desde el servidor:
//   npm run agregar-cursos -- cursos-nuevos.json            (simulación)
//   npm run agregar-cursos -- cursos-nuevos.json --aplicar  (escribe)
import { Cruda, type Modulo } from "../lib/http.js";

export const agregarCursos: Modulo = {
  porDefecto: "x",
  acciones: { x: async () => new Cruda("Este script ya no se usa por web. Ejecuta en el servidor: npm run agregar-cursos -- cursos-nuevos.json [--aplicar]\n", "text/plain; charset=utf-8", 410) },
};
