// Port de api/enviar-waitlist.php (y del alias /enviar-waitlist.php):
// pre-registro de la landing, sin duplicados por correo.
import { fail, type Modulo } from "../lib/http.js";
import { mutar } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { enviarCorreo } from "../lib/correo.js";
import { cortar, emailValido, largo, nowIso, str, uid } from "../lib/util.js";

const PERFILES = ["productor", "vendedor", "comprador", "proveedor", "amante", "asesor", "interesado"];

async function apuntar(ctx: Parameters<Modulo["acciones"][string]>[0]) {
  const nombre = str(ctx.in.nombre).trim(), email = str(ctx.in.email).trim().toLowerCase(), perfil = str(ctx.in.perfil);
  if (largo(nombre) < 2 || largo(nombre) > 100) fail("Nombre: 2-100 caracteres.", 422);
  if (!emailValido(email)) fail("Correo electrónico inválido.", 422);
  if (!PERFILES.includes(perfil)) fail("Perfil inválido.", 422);
  if (!(await cupo(ctx, "waitlist", 5, 600))) fail("Demasiados envíos. Espera unos minutos.", 429);
  const id = uid();
  await mutar("waitlist", (l) => {
    if (l.some((x) => str(x.email).toLowerCase() === email)) fail("duplicado", 409);
    return [...l, { id, nombre, email, perfil, ip: ctx.ip, ua: cortar(ctx.cabecera("user-agent"), 200), ts: nowIso() }];
  });
  void enviarCorreo("waitlist", email, { nombre, perfil }).catch(() => {});
  return { id };
}

// El archivo no usa ?action=: cualquier llamada es un alta.
export const waitlist: Modulo = { acciones: { alta: apuntar }, porDefecto: "alta", noValida: { mensaje: "Acción no válida.", codigo: 400 } };
