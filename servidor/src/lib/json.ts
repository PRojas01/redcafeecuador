// JSON de datos que viaja con el código (semillas). Se lee del disco en vez de
// «import … with { type: "json" }» para no exigir Node 20.10+.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const datosJson = <T = any>(nombre: string): T =>
  JSON.parse(fs.readFileSync(fileURLToPath(new URL(`../datos/${nombre}`, import.meta.url)), "utf8")) as T;
