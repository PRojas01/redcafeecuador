// Port de api/guias.php: avance de las guías paso a paso y bitácoras privadas.
// En PHP todo el avance de todos los miembros vivía en un solo archivo; aquí
// cada miembro tiene su documento (coleccion «guias»/«guias-registros», id = uid).
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { obtener, mutarUno, type Doc } from "../lib/docs.js";
import { miembroRoles, requiereUsuario } from "../lib/usuarios.js";
import { notificar } from "../lib/avisos.js";
import { bool, cortar, esNumerico, fechaMs, num, nowIso, str, today, uid } from "../lib/util.js";

const GUIAS = ["finca", "negocio"], TIPOS = ["cosecha", "fermentacion", "secado", "costos"];
const MAX_FILAS = 500, MAX_NOTA = 500;
const CAMPOS: Record<string, Record<string, string>> = {
  cosecha: { fecha: "fecha", lote: "texto", kg_cereza: "numero", jornales: "numero", observacion: "texto" },
  fermentacion: { fecha: "fecha", lote: "texto", hora_inicio: "hora", hora_fin: "hora", temperatura: "numero", observacion: "texto" },
  secado: { fecha: "fecha", lote: "texto", humedad_pct: "porcentaje", dia: "numero", observacion: "texto" },
  costos: { fecha: "fecha", concepto: "texto", monto: "numero", quintales: "numero", observacion: "texto" },
};

function valor(clase: string, bruto: unknown): unknown {
  const s = bruto !== null && typeof bruto !== "object" ? str(bruto).trim() : "";
  switch (clase) {
    case "texto": return cortar(s, 160);
    case "numero": return s === "" || !esNumerico(s) ? null : Math.max(0, Math.round(num(s) * 100) / 100);
    case "porcentaje": return s === "" || !esNumerico(s) ? null : Math.max(0, Math.min(100, Math.round(num(s) * 10) / 10));
    case "fecha": return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : today();
    case "hora": return /^\d{2}:\d{2}$/.test(s) ? s : "";
  }
  return null;
}

const avance = async (u: string) => ((await obtener("guias", u)) ?? {}) as Doc;
const registros = async (u: string) => ((await obtener("guias-registros", u)) ?? {}) as Doc;

async function avisarFermentacion(uidM: string) {
  try {
    const filas: Doc[] = (await registros(uidM)).fermentacion ?? [];
    if (!filas.length) return;
    await mutarUno("guias", uidM, async (d) => {
      const marcas: Doc = { ...(d._avisos ?? {}) };
      let cambio = false;
      for (const f of filas) {
        if (str(f.hora_fin).trim()) continue;
        const inicio = Date.parse(`${str(f.fecha)}T${str(f.hora_inicio) || "00:00"}:00Z`);
        if (!inicio || Date.now() - inicio < 18 * 3600_000) continue;
        const clave = `ferm-${str(f.id)}-${today()}`;
        if (marcas[clave]) continue;
        const lote = str(f.lote).trim();
        await notificar(uidM, "sistema", "Fermentación sin cerrar" + (lote ? " · lote " + lote : ""),
          "Anotaste el inicio hace más de 18 horas y falta la hora de fin. Cierra el registro y mide la humedad cuando empieces a secar.", "/panel/?ver=guias");
        marcas[clave] = nowIso();
        cambio = true;
      }
      if (!cambio) return d;
      const limite = Date.now() - 7 * 86400_000;
      for (const k of Object.keys(marcas)) if ((fechaMs(marcas[k]) || Date.now()) < limite) delete marcas[k];
      return { ...d, _avisos: marcas };
    });
  } catch { /* un aviso que falla no rompe la guía */ }
}

async function uidDe(ctx: Ctx) { return (await requiereUsuario(ctx)).id as string; }

export const guias: Modulo = {
  acciones: {
    async estado(ctx) {
      const u = await uidDe(ctx);
      await avisarFermentacion(u);
      const { _avisos, ...mio } = await avance(u);
      void _avisos;
      const regs = await registros(u);
      return { avance: mio, registros: Object.fromEntries(TIPOS.map((t) => [t, (regs[t] ?? []).length])) };
    },
    async paso(ctx) {
      const u = await uidDe(ctx);
      const guia = str(ctx.in.guia).trim(), paso = str(ctx.in.paso).trim();
      if (!GUIAS.includes(guia)) fail("Guía no válida.", 422);
      if (!/^[a-z0-9-]{1,60}$/.test(paso)) fail("Paso no válido.", 422);
      const hecho = "hecho" in ctx.in ? bool(ctx.in.hecho) : true;
      const nota = cortar(str(ctx.in.nota).trim(), MAX_NOTA);
      let guardado: Doc | null = null;
      await mutarUno("guias", u, (d) => {
        const g = { ...(d[guia] ?? {}) };
        g[paso] = { hecho, nota: nota || str(g[paso]?.nota), fecha: nowIso() };
        guardado = g[paso];
        return { ...d, [guia]: g };
      });
      return { paso, estado: guardado };
    },
    async registro(ctx) {
      const u = await uidDe(ctx);
      const tipo = str(ctx.in.tipo).trim();
      if (!TIPOS.includes(tipo)) fail("Tipo de registro no válido.", 422);
      const datos = ctx.in.datos && typeof ctx.in.datos === "object" ? (ctx.in.datos as Doc) : {};
      const fila: Doc = { id: uid(), creado: nowIso() };
      for (const [campo, clase] of Object.entries(CAMPOS[tipo])) fila[campo] = valor(clase, datos[campo] ?? "");
      await mutarUno("guias-registros", u, (d) => ({ ...d, [tipo]: [...(d[tipo] ?? []), fila].slice(-MAX_FILAS) }));
      return { registro: fila };
    },
    async registros(ctx) {
      const u = await uidDe(ctx);
      const tipo = str(ctx.query.tipo ?? ctx.in.tipo).trim();
      if (tipo && !TIPOS.includes(tipo)) fail("Tipo de registro no válido.", 422);
      const regs = await registros(u);
      if (!tipo) return { registros: Object.fromEntries(TIPOS.map((t) => [t, [...(regs[t] ?? [])].reverse()])) };
      return { tipo, filas: [...(regs[tipo] ?? [])].reverse() };
    },
    async borrar_registro(ctx) {
      const u = await uidDe(ctx);
      const tipo = str(ctx.in.tipo).trim(), id = str(ctx.in.id).trim();
      if (!TIPOS.includes(tipo)) fail("Tipo de registro no válido.", 422);
      if (!id) fail("id requerido.", 422);
      let borrado = false;
      await mutarUno("guias-registros", u, (d) => {
        const filas: Doc[] = d[tipo] ?? [];
        const quedan = filas.filter((f) => str(f.id) !== id);
        borrado = quedan.length !== filas.length;
        return { ...d, [tipo]: quedan };
      });
      if (!borrado) fail("Ese registro no existe.", 404);
      return { borrado: id };
    },
    async ficha(ctx) {
      const user = await requiereUsuario(ctx);
      const { _avisos, ...mio } = await avance(user.id);
      void _avisos;
      const regs = await registros(user.id);
      const hechos = Object.fromEntries(GUIAS.map((g) => [g, Object.entries(mio[g] ?? {}).filter(([, e]) => (e as Doc)?.hecho).map(([p]) => p)]));
      const ultimos = Object.fromEntries(TIPOS.map((t) => [t, (regs[t] ?? []).at(-1) ?? null]));
      let monto = 0, qq = 0;
      for (const f of regs.costos ?? []) { monto += num(f.monto); qq += num(f.quintales); }
      return {
        miembro: { nombre: user.nombre ?? "", provincia: user.provincia ?? "", roles: miembroRoles(user) },
        hechos, ultimos, costo_quintal: qq > 0 ? Math.round((monto / qq) * 100) / 100 : null, generado: nowIso(),
      };
    },
  },
};
