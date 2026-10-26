// Configuración leída una sola vez del entorno.
import path from "node:path";
import { fileURLToPath } from "node:url";

// Las rutas relativas del .env se leen desde servidor/, no desde la carpeta
// en la que se arranca (en cPanel/Passenger no siempre es la misma).
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ruta = (v: string) => path.resolve(RAIZ, v);

function req(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`);
  return v;
}

export const config = {
  raiz: RAIZ,
  entorno: (process.env.REDCAFE_ENTORNO ?? "desarrollo") as "desarrollo" | "produccion" | "prueba",
  // PORT lo fija el hosting (cPanel/Passenger, Render…); PUERTO es el nombre propio.
  puerto: Number(process.env.PORT ?? process.env.PUERTO ?? 8080),
  sitio: ruta(process.env.REDCAFE_SITIO ?? "../staging"),
  // Archivos subidos por miembros y administración (se sirven en /uploads).
  uploads: ruta(process.env.REDCAFE_UPLOADS ?? path.join(ruta(process.env.REDCAFE_SITIO ?? "../staging"), "uploads")),
  dominio: process.env.REDCAFE_DOMINIO ?? "https://redcafeecuador.com",
  // Clave de cifrado de datos personales: 32 bytes en hex.
  claveDatos(): Buffer {
    const hex = req("REDCAFE_CLAVE_DATOS");
    const b = Buffer.from(hex, "hex");
    if (b.length !== 32) throw new Error("REDCAFE_CLAVE_DATOS debe tener 64 caracteres hex (32 bytes).");
    return b;
  },
  // Correo: sin proveedor configurado los correos se registran y no se envían.
  correo: {
    remitente: process.env.REDCAFE_CORREO_REMITENTE ?? "Red Café Ecuador <no-reply@redcafeecuador.com>",
    apiResend: process.env.RESEND_API_KEY ?? "",
  },
  // Destino fijo de la recuperación del administrador (no se acepta por parámetro).
  correoAdmin: process.env.REDCAFE_CORREO_ADMIN ?? "redcafeecuador@gmail.com",
  // Transición: el administrador puede seguir entrando con la contraseña del
  // archivo .redcafe_admin_pass del sistema PHP hasta crear cuentas nominales.
  archivoPassAdmin: process.env.REDCAFE_ARCHIVO_PASS_ADMIN ?? "",
};

export const esProduccion = () => config.entorno === "produccion";
