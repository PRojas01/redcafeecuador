// Port de api/stats.php. Corregido: «chats» y «actividad» contaban y
// mostraban los chats de TODA la plataforma; ahora solo los del miembro.
import { fail, type Modulo } from "../lib/http.js";
import { listar } from "../lib/docs.js";
import { usuarioActual } from "../lib/usuarios.js";
import { str } from "../lib/util.js";

const enCurso = (p: Record<string, unknown>) => !["Entregado", "Cancelado"].includes(str(p.estado));

async function datos(ctx: Parameters<Modulo["acciones"][string]>[0]) {
  const u = await usuarioActual(ctx);
  if (!u) fail("No autenticado.", 401);
  const [lotes, pedidos, ratings, chats, posts] = await Promise.all(["lotes", "pedidos", "ratings", "chats", "posts"].map((c) => listar(c)));
  const misPedidos = pedidos.filter((p) => p.origen_id === u.id || p.solicitante_id === u.id);
  const misChats = chats.filter((c) => (c.users ?? []).includes(u.id));
  return { u, lotes, misPedidos, ratings, misChats, posts };
}

export const stats: Modulo = {
  porDefecto: "stats",
  acciones: {
    async stats(ctx) {
      const { u, lotes, misPedidos, ratings, misChats, posts } = await datos(ctx);
      const misLotes = lotes.filter((l) => l.productor_id === u.id);
      const misR = ratings.filter((r) => r.rated_id === u.id);
      const prom = misR.length ? Math.round((misR.reduce((s, r) => s + Number(r.score || 0), 0) / misR.length) * 10) / 10 : 0;
      const ingresos = misPedidos.filter((p) => p.estado === "Entregado").reduce((s, p) => s + Number(p.total || 0), 0);
      const meses: string[] = [];
      const hoy = new Date();
      for (let i = 11; i >= 0; i--) { const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1)); meses.push(d.toISOString().slice(0, 7)); }
      const serie = meses.map((mes) => ({ mes, valor: misPedidos.filter((p) => str(p.fecha).slice(0, 7) === mes).length }));
      const ult = serie[11].valor, ant = serie[10].valor;
      const plata = "$" + Math.round(ingresos).toLocaleString("en-US");
      const kpis: Record<string, unknown[]> = {
        productor: [{ label: "Lotes publicados", valor: misLotes.length, unidad: "" }, { label: "Pedidos activos", valor: misPedidos.filter(enCurso).length, unidad: "" }, { label: "Calificación", valor: prom, unidad: "★" }, { label: "Ingresos", valor: plata, unidad: "" }],
        vendedor: [{ label: "Pedidos", valor: misPedidos.length, unidad: "" }, { label: "Entregados", valor: misPedidos.filter((p) => p.estado === "Entregado").length, unidad: "" }, { label: "Calificación", valor: prom, unidad: "★" }, { label: "Facturación", valor: plata, unidad: "" }],
        comprador: [{ label: "Pedidos realizados", valor: misPedidos.length, unidad: "" }, { label: "En curso", valor: misPedidos.filter(enCurso).length, unidad: "" }, { label: "Lotes en marketplace", valor: misLotes.length, unidad: "" }, { label: "Inversión", valor: plata, unidad: "" }],
        bar: [{ label: "Productos menú", valor: misLotes.length, unidad: "" }, { label: "Pedidos a tostadores", valor: misPedidos.length, unidad: "" }, { label: "Calificación", valor: prom, unidad: "★" }, { label: "Chats activos", valor: misChats.length, unidad: "" }],
        barista: [{ label: "Posts comunidad", valor: posts.filter((p) => p.autor_id === u.id).length, unidad: "" }, { label: "Chats", valor: misChats.length, unidad: "" }, { label: "Calificación", valor: prom, unidad: "★" }, { label: "Pedidos", valor: misPedidos.length, unidad: "" }],
      };
      return {
        rol: u.rol ?? "productor", periodo: "Últimos 12 meses", kpis: kpis[u.rol ?? "productor"] ?? [],
        series: [{ nombre: "Actividad", color: "#7b3f00", data: serie }],
        resumen: { total: serie.reduce((s, x) => s + x.valor, 0), ultimo_mes: ult, variacion_pct: ant > 0 ? Math.round(((ult - ant) / ant) * 1000) / 10 : 0 },
      };
    },
    async actividad(ctx) {
      const { misPedidos, misChats } = await datos(ctx);
      const items = [
        ...misPedidos.slice(-5).reverse().map((p) => ({ icono: "🛒", texto: `Pedido #${str(p.nro) || "?"} · ${str(p.estado)}`, cuando: str(p.fecha).slice(0, 10) })),
        ...misChats.slice(-3).reverse().map((c) => ({ icono: "💬", texto: "Chat: " + (str(c.last_message) || "...").slice(0, 50), cuando: str(c.updated_at ?? c.created_at) })),
      ].sort((a, b) => b.cuando.localeCompare(a.cuando)).slice(0, 10);
      return { items };
    },
  },
  noValida: { mensaje: "Acción no válida.", codigo: 400 },
};
