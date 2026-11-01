// Port de api/metricas.php: contadores por día sin datos personales.
import fs from "node:fs";
import path from "node:path";
import { Cruda, fail, type Modulo } from "../lib/http.js";
import { listar, mutarMapa, mapa, type Doc } from "../lib/docs.js";
import { cupo } from "../lib/seguridad.js";
import { miembroRoles, requiereAdmin, todosLosMiembros } from "../lib/usuarios.js";
import { config } from "../lib/config.js";
import { str, today } from "../lib/util.js";
import { lotesTodos } from "./lotes.js";

const EVENTOS = ["visita", "cta_registro", "registro_paso1", "registro_paso2", "registro_paso3", "registro_enviado", "registro_ok", "activacion_clic"];
const DIAS = 120;

function rutaCorta(r: string): string {
  let p = "/";
  try { p = new URL(r, "https://x").pathname; } catch { /* */ }
  const partes = p.split("/").filter(Boolean);
  if (!partes.length) return "/";
  const primera = partes[0].toLowerCase().replace(/[^a-z0-9-]/g, "");
  return primera ? "/" + primera + "/" : "/";
}

const sinCuerpo = () => new Cruda("", "text/plain", 204);

const acciones: Modulo["acciones"] = {
  async evento(ctx) {
    if (ctx.metodo !== "POST") fail("Método no permitido.", 405);
    if (!(await cupo(ctx, "metricas_evento", 120, 60))) return sinCuerpo();
    const e = str(ctx.in.e);
    if (!EVENTOS.includes(e)) fail("Evento no válido.", 422);
    const clave = e + "|" + rutaCorta(str(ctx.in.p ?? "/"));
    const dia = today();
    const todo = await mutarMapa("metricas", (t) => {
      const d = (t[dia] as Doc) ?? {};
      d[clave] = (Number(d[clave]) || 0) + 1;
      t[dia] = d;
      const dias = Object.keys(t).sort().reverse().slice(0, DIAS);
      return Object.fromEntries(dias.map((k) => [k, t[k]]));
    });
    // Solo en pruebas: espejo en <sitio>/data/metricas.json, que la suite qa/ lee directamente.
    if (config.entorno === "prueba") {
      fs.mkdirSync(path.join(config.sitio, "data"), { recursive: true });
      fs.writeFileSync(path.join(config.sitio, "data", "metricas.json"), JSON.stringify(todo));
    }
    return sinCuerpo();
  },

  async cifras() {
    const miembros = await todosLosMiembros();
    let productores = 0, compran = 0;
    const prov = new Map<string, { nombre: string; miembros: number; lotes: number }>();
    const sumar = (p: string, campo: "miembros" | "lotes") => {
      const k = p.toLowerCase();
      if (!prov.has(k)) prov.set(k, { nombre: p, miembros: 0, lotes: 0 });
      prov.get(k)![campo]++;
    };
    for (const m of miembros) {
      if ((m.estado ?? "activo") === "inactivo") continue;
      const roles = miembroRoles(m);
      if (roles.includes("productor")) productores++;
      if (roles.some((r) => ["comprador", "vendedor", "exportador", "bar"].includes(r))) compran++;
      if (str(m.provincia).trim()) sumar(str(m.provincia).trim(), "miembros");
    }
    let lotesReales = 0;
    for (const l of await lotesTodos()) {
      if (l.oculto || l.demo || l.ejemplo) continue;
      lotesReales++;
      if (str(l.provincia).trim()) sumar(str(l.provincia).trim(), "lotes");
    }
    const hoy = today();
    const requerimientos = (await listar("requerimientos")).filter((r) => r.estado === "abierta" && !(str(r.cierra) && str(r.cierra) < hoy)).length;
    // Servicios publicados en el catálogo (oficiales disponibles + de miembros visibles al público).
    // Como el catálogo público, sin contar ejemplos: la intermediación siempre existe aunque no esté guardada.
    const oficiales = await listar("servicios");
    const servicios =
      oficiales.filter((s) => (s.disponible === undefined || !!s.disponible) && !s.oculto).length +
      (oficiales.some((s) => s.id === "intermediacion-compraventa") ? 0 : 1) +
      (await listar("servicios-terceros")).filter((s) => !s.oculto && !s.demo && (s.visibilidad ?? "publico") === "publico").length;
    const porProvincia = [...prov.values()].sort((a, b) => b.lotes - a.lotes || b.miembros - a.miembros);
    return {
      miembros: miembros.length, productores, compran_cafe: compran, provincias: porProvincia.filter((x) => x.miembros > 0).length,
      por_provincia: porProvincia.slice(0, 12), lotes_reales: lotesReales, servicios, requerimientos_abiertos: requerimientos,
    };
  },

  async resumen(ctx) {
    requiereAdmin(ctx);
    const dias = Math.max(1, Math.min(DIAS, Number(ctx.query.dias ?? 30) || 30));
    const todo = await mapa("metricas");
    const recorte = Object.fromEntries(Object.keys(todo).sort().reverse().slice(0, dias).map((k) => [k, todo[k]]));
    const tot: Record<string, number> = Object.fromEntries(EVENTOS.map((e) => [e, 0]));
    for (const claves of Object.values(recorte)) for (const [c, n] of Object.entries(claves as Doc)) {
      const e = c.split("|")[0];
      if (e in tot) tot[e] += Number(n) || 0;
    }
    const tasa = (de: string, a: string) => (tot[de] > 0 ? Math.round((tot[a] / tot[de]) * 1000) / 10 : null);
    return {
      dias, totales: tot,
      embudo: { paso1_a_paso2: tasa("registro_paso1", "registro_paso2"), paso2_a_paso3: tasa("registro_paso2", "registro_paso3"), paso3_a_envio: tasa("registro_paso3", "registro_enviado"), envio_a_alta: tasa("registro_enviado", "registro_ok") },
      por_dia: recorte,
    };
  },
};

export const metricas: Modulo = { acciones };
