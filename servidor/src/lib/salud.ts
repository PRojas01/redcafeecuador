// Port de api/_salud.php: revisión diaria de datos que fallan en silencio.
// No corrige nada: avisa a la administración. Antes la disparaba la primera
// visita del día a la campana; ahora es una tarea del servidor.
import { listar } from "./docs.js";
import { db } from "./db.js";
import { notificarAdmins } from "./avisos.js";
import { listarCopias } from "../modulos/respaldo.js";
import { str } from "./util.js";

const vacio = (v: unknown) => v === null || v === undefined || v === "" || v === 0 || v === "0";

export async function revisar(): Promise<string[]> {
  const fallos: string[] = [];
  const pedidos = await listar("pedidos");
  const rotos = pedidos.filter((p) => vacio(p.productor_id) || vacio(p.solicitante_id)).map((p) => "#" + str(p.nro ?? "?"));
  if (rotos.length) fallos.push(`${rotos.length} pedido(s) sin comprador o sin vendedor, invisibles en el panel: ${rotos.slice(0, 6).join(", ")}`);
  for (const [nombre, l] of [["pedidos", pedidos], ["cotizaciones", await listar("cotizaciones")]] as const) {
    const vistos = new Set<number>(), dups = new Set<number>();
    for (const x of l) { const n = Math.trunc(Number(x.nro ?? 0)); if (n <= 0) continue; if (vistos.has(n)) dups.add(n); else vistos.add(n); }
    if (dups.size) fallos.push(`Números repetidos en ${nombre}: #${[...dups].slice(0, 6).join(", #")}`);
  }
  const lotes = await listar("lotes");
  const sinPrecio = lotes.filter((l) => !l.demo && !l.oculto && (["semilla", "plantula"].includes(str(l.estado)) ? Number(l.precioUnidad) || 0 : Number(l.precioSaco) || 0) <= 0).length;
  if (sinPrecio) fallos.push(`${sinPrecio} lote(s) de miembros publicados sin precio: se ven en el Marketplace pero no se pueden negociar.`);
  const ids = new Set((await db.usuario.findMany({ select: { id: true } })).map((u) => u.id));
  const huerfanos = lotes.filter((l) => !l.demo && str(l.productor_id) && !ids.has(str(l.productor_id))).length;
  if (huerfanos) fallos.push(`${huerfanos} lote(s) cuyo dueño ya no está registrado.`);
  try {
    const u = listarCopias()[0];
    if (!u) fallos.push("No hay ninguna copia de respaldo guardada.");
    else if (Date.now() / 1000 - u.ts > 48 * 3600) fallos.push("La última copia de respaldo tiene más de 48 horas.");
  } catch {
    fallos.push("No se puede leer la carpeta de respaldos.");
  }
  return fallos;
}

export function programarSalud() {
  const tic = async () => {
    try {
      const f = await db.secreto.findUnique({ where: { nombre: "salud_ultimo" } });
      if (f && Date.now() - Number(f.valor) < 20 * 3600_000) return;
      await db.secreto.upsert({ where: { nombre: "salud_ultimo" }, create: { nombre: "salud_ultimo", valor: String(Date.now()) }, update: { valor: String(Date.now()) } });
      const fallos = await revisar();
      if (fallos.length) await notificarAdmins("sistema", `Revisión diaria: ${fallos.length} cosa(s) que revisar`, fallos.join(" · "), "/admin/");
    } catch (e) {
      console.error("[salud]", e);
    }
  };
  setTimeout(tic, 5 * 60_000).unref();
  setInterval(tic, 3600_000).unref();
}
