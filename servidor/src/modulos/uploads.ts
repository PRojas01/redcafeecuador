import { exigirDerechos } from "../lib/derechos.js";
// Port de api/uploads.php: fotos de miembros (marco 1280×720) y documentos
// de lote (PDF o imagen).
import { agregar } from "../lib/docs.js";
import fs from "node:fs";
import path from "node:path";
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { cupo } from "../lib/seguridad.js";
import { requiereUsuario } from "../lib/usuarios.js";
import { enMarco, formatoReal } from "../lib/imagen.js";
import { config } from "../lib/config.js";
import { largo, nowIso, str, uid } from "../lib/util.js";

const URL_BASE = "/uploads/user-content";
const DOC_TIPOS: Record<string, string> = {
  "certificado-calidad": "Certificado de calidad", "informe-catacion": "Informe de catación", "certificado-organico": "Certificado orgánico",
  "analisis-laboratorio": "Análisis de laboratorio", "trazabilidad-eudr": "Expediente de trazabilidad / EUDR", "ficha-tecnica": "Ficha técnica", otro: "Documento del lote",
};

function carpeta(): string {
  const dir = path.join(config.uploads, "user-content");
  fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  return dir;
}
async function archivo(ctx: Ctx, max: number, msgPeso: string): Promise<Buffer> {
  const f = ctx.archivos.archivo;
  if (!f) fail("Archivo requerido.", 422);
  if (f.size <= 0 || f.size > max) fail(msgPeso, 422);
  return Buffer.from(await f.arrayBuffer());
}
const slugUid = (id: unknown) => str(id).replace(/[^A-Za-z0-9_-]/g, "");

const acciones: Modulo["acciones"] = {
  async image(ctx) {
    const u = await requiereUsuario(ctx);
    const id = uid();
    const derechos = await exigirDerechos(ctx, u, "uploads.image", id);
    // El cupo va después de exigir sesión: si no, cualquiera agotaría el de
    // una oficina o asociación que comparte salida a internet.
    if (!(await cupo(ctx, "upload_image", 60, 3600))) fail("Demasiadas imágenes subidas seguidas. Vuelve a intentarlo en una hora.", 429);
    const contexto = str(ctx.in.context).trim();
    if (!["comunidad", "marketplace", "lote", "curso"].includes(contexto)) fail("Contexto de imagen inválido.", 422);
    const buf = await archivo(ctx, 2 * 1024 * 1024, "La imagen debe pesar máximo 2 MB.");
    const { formato } = await formatoReal(buf);
    if (!formato || formato === "pdf") fail("Solo se permiten imágenes JPG, PNG o WebP.", 422);
    const nombre = `${contexto}-${slugUid(u.id)}-${uid()}.jpg`;
    fs.writeFileSync(path.join(carpeta(), nombre), await enMarco(buf), { mode: 0o644 });
    await agregar("contenido-subido", { id, uid: u.id, contexto, url: `${URL_BASE}/${nombre}`, ...derechos });
    return { ...derechos, url: `${URL_BASE}/${nombre}` };
  },

  async documento(ctx) {
    const u = await requiereUsuario(ctx);
    const id = uid();
    const derechos = await exigirDerechos(ctx, u, "uploads.documento", id);
    if (!(await cupo(ctx, "upload_documento", 30, 3600))) fail("Demasiados documentos subidos seguidos. Vuelve a intentarlo en una hora.", 429);
    const tipo = str(ctx.in.tipo ?? "otro").trim() || "otro";
    if (/identidad|selfie|cedula|cédula|pasaporte|dni|identifica/i.test(tipo)) fail("Los documentos de identidad deben enviarse por la verificación privada.", 422);
    if (!DOC_TIPOS[tipo]) fail("Tipo de documento inválido.", 422);
    const titulo = str(ctx.in.titulo).trim();
    if (largo(titulo) > 120) fail("El título del documento es demasiado largo.", 422);
    const buf = await archivo(ctx, 5 * 1024 * 1024, "El documento debe pesar máximo 5 MB.");
    const { formato } = await formatoReal(buf);
    if (!formato || formato === "webp") fail("Solo se permiten documentos PDF, JPG o PNG.", 422);
    const pdf = formato === "pdf";
    const nombre = `doc-${slugUid(u.id)}-${uid()}.${pdf ? "pdf" : "jpg"}`;
    fs.writeFileSync(path.join(carpeta(), nombre), pdf ? buf : await enMarco(buf), { mode: 0o644 });
    await agregar("contenido-subido", { id, uid: u.id, contexto: "documento", tipo, titulo, url: `${URL_BASE}/${nombre}`, ...derechos });
    return { documento: { ...derechos, tipo, titulo: titulo || DOC_TIPOS[tipo], url: `${URL_BASE}/${nombre}`, formato: pdf ? "pdf" : "imagen", subido_at: nowIso() } };
  },
};

export const uploads: Modulo = { acciones };
