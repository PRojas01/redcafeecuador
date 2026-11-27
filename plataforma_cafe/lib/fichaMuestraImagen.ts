/* Dibuja la ficha de recepción de la muestra como imagen PNG (en el
   navegador), para adjuntarla al WhatsApp a Legacy. Nada sale del navegador
   salvo lo que la persona envíe. */
import { fichaMuestra, REF_MUESTRAS, type DatosMuestra } from "@/lib/legacyMuestras";

const ANCHO = 1080;
const M = 64;

function partir(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const out: string[] = [];
  let linea = "";
  for (const p of texto.split(/\s+/)) {
    const prueba = linea ? linea + " " + p : p;
    if (ctx.measureText(prueba).width > ancho && linea) { out.push(linea); linea = p; } else linea = prueba;
  }
  if (linea) out.push(linea);
  return out.length ? out : [""];
}

function dibujar(ctx: CanvasRenderingContext2D, d: DatosMuestra, hoy: string, medir: boolean): number {
  const fuente = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  let y = 0;
  if (!medir) { ctx.fillStyle = "#8c3604"; ctx.fillRect(0, 0, ANCHO, 215); }
  ctx.fillStyle = "#f7d08a"; ctx.font = `700 26px ${fuente}`;
  if (!medir) ctx.fillText("LEGACY ACADEMICS · SERVICIO DE MUESTRAS", M, 70);
  ctx.fillStyle = "#ffffff"; ctx.font = `700 40px ${fuente}`;
  if (!medir) ctx.fillText("Ficha de recepción de muestra de café verde", M, 125);
  ctx.font = `400 24px ${fuente}`;
  if (!medir) ctx.fillText("Análisis organoléptico · solicitud desde redcafeecuador.com", M, 165);
  if (!medir) ctx.fillText(hoy, M, 197);
  y = 270;
  for (const [titulo, filas] of fichaMuestra(d)) {
    ctx.font = `700 28px ${fuente}`; ctx.fillStyle = "#8c3604";
    if (!medir) ctx.fillText(titulo.toUpperCase(), M, y);
    y += 18;
    for (const [e, v] of filas) {
      ctx.font = `500 24px ${fuente}`;
      const etiquetas = partir(ctx, e, 330);
      ctx.font = `600 26px ${fuente}`;
      const lineas = partir(ctx, v, ANCHO - M * 2 - 360);
      const alto = 30 + Math.max(lineas.length, etiquetas.length) * 36;
      if (!medir) {
        ctx.strokeStyle = "rgba(140,54,4,.25)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(ANCHO - M, y); ctx.stroke();
        ctx.fillStyle = "#5c4a3d"; ctx.font = `500 24px ${fuente}`;
        etiquetas.forEach((l, i) => ctx.fillText(l, M, y + 42 + i * 36));
        ctx.fillStyle = "#241f1b"; ctx.font = `600 26px ${fuente}`;
        lineas.forEach((l, i) => ctx.fillText(l, M + 360, y + 42 + i * 36));
      }
      y += alto;
    }
    y += 50;
  }
  ctx.font = `400 22px ${fuente}`; ctx.fillStyle = "#5c4a3d";
  if (!medir) ctx.fillText(`Ref.: Red Café Ecuador · ${REF_MUESTRAS}`, M, y);
  return y + 50;
}

/** Devuelve la ficha como archivo PNG. */
export async function fichaMuestraPng(d: DatosMuestra): Promise<File> {
  const hoy = new Date().toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
  const c = document.createElement("canvas");
  c.width = ANCHO; c.height = 100;
  const alto = dibujar(c.getContext("2d")!, d, hoy, true);
  c.height = alto;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fbf6f0"; ctx.fillRect(0, 0, ANCHO, alto);
  dibujar(ctx, d, hoy, false);
  const blob: Blob = await new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error("sin imagen"))), "image/png"));
  const nombre = "ficha-muestra-" + (String(d.proveedor || "cafe").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "cafe") + ".png";
  return new File([blob], nombre, { type: "image/png" });
}

/** Descarga un archivo en el dispositivo. */
export function descargar(f: File) {
  const url = URL.createObjectURL(f);
  const a = document.createElement("a");
  a.href = url; a.download = f.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
