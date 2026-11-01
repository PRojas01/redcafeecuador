// Procesado de imágenes subidas (antes GD en PHP). Siempre se reencoda a JPEG:
// así se descartan metadatos y cualquier carga escondida en el original.
// limitInputPixels corta las «bombas de descompresión» (una imagen pequeña en
// bytes que declara 30000×30000 px y agotaba la memoria del PHP).
import sharp from "sharp";
import { fail } from "./http.js";

const MAX_PIXELES = 40_000_000;
export type Formato = "jpeg" | "png" | "webp";

/** Tipo real por contenido (no por extensión ni Content-Type del navegador). */
export async function formatoReal(buf: Buffer): Promise<{ formato: Formato | "pdf" | null; ancho: number; alto: number }> {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return { formato: "pdf", ancho: 0, alto: 0 };
  try {
    const m = await sharp(buf, { limitInputPixels: MAX_PIXELES }).metadata();
    const f = m.format === "jpeg" || m.format === "png" || m.format === "webp" ? m.format : null;
    if (!f || !m.width || !m.height) return { formato: null, ancho: 0, alto: 0 };
    if (m.width * m.height > MAX_PIXELES) fail("La imagen tiene demasiados píxeles.", 422);
    return { formato: f, ancho: m.width, alto: m.height };
  } catch (e) {
    if ((e as any)?.codigo) throw e;
    return { formato: null, ancho: 0, alto: 0 };
  }
}

const base = (buf: Buffer) => sharp(buf, { limitInputPixels: MAX_PIXELES, failOn: "error" }).rotate();

/** Marco único 1280×720 de las fotos de miembros: la imagen entera, centrada,
 *  sobre su propio color medio oscurecido (como uploads.php). */
export async function enMarco(buf: Buffer, W = 1280, H = 720): Promise<Buffer> {
  try {
    const orientada = await base(buf).toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = orientada.info;
    const st = await sharp(orientada.data).stats();
    const [r, g, b] = [0, 1, 2].map((i) => Math.floor((st.channels[i] ?? st.channels[0])?.mean ?? 0) * 0.7);
    const fondo = { r: Math.floor(r), g: Math.floor(g), b: Math.floor(b), alpha: 1 };
    const esc = Math.min(W / w, H / h, 1);
    const nw = Math.max(1, Math.round(w * esc)), nh = Math.max(1, Math.round(h * esc));
    const dx = Math.floor((W - nw) / 2), dy = Math.floor((H - nh) / 2);
    return await sharp(orientada.data).flatten({ background: fondo }).resize(nw, nh).extend({ top: dy, bottom: H - nh - dy, left: dx, right: W - nw - dx, background: fondo })
      .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch {
    fail("No pudimos procesar esa imagen.", 422);
  }
}

/** Huecos de la maqueta: ancho máximo (sin ampliar) y recorte central a la proporción. */
export async function paraHueco(buf: Buffer, anchoMax: number, proporcion: string): Promise<{ datos: Buffer; ancho: number; alto: number }> {
  try {
    const o = await base(buf).toBuffer({ resolveWithObject: true });
    const { width: sw, height: sh } = o.info;
    const [pw, ph] = proporcion.split(":").map(Number);
    const ratio = pw > 0 && ph > 0 ? pw / ph : 1;
    const esc = Math.min(1, Math.max(1, anchoMax) / sw);
    const cw = Math.max(1, Math.round(sw * esc)), ch = Math.max(1, Math.round(sh * esc));
    const prevista = cw / ratio;
    const [dw, dh] = ch > prevista ? [cw, Math.max(1, Math.round(prevista))] : [Math.max(1, Math.round(ch * ratio)), ch];
    const datos = await sharp(o.data).flatten({ background: "#ffffff" }).resize(cw, ch).resize(dw, dh, { fit: "cover", position: "centre" })
      .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    return { datos, ancho: dw, alto: dh };
  } catch {
    fail("No se pudo decodificar la imagen.", 422);
  }
}
