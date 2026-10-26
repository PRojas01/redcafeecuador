// Registro de módulos: el nombre es el del archivo PHP que reemplazan.
import type { Modulo } from "../lib/http.js";
import { auth } from "./auth.js";
import { twofactor } from "./twofactor.js";
import { members } from "./members.js";

export const modulos: Record<string, Modulo> = {
  auth,
  twofactor,
  members,
};
