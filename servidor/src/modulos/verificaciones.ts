// Port de api/verificaciones.php: sello de verificado por la administración.
import { fail, type Ctx, type Modulo } from "../lib/http.js";
import { listar, mutar, type Doc } from "../lib/docs.js";
import { db } from "../lib/db.js";
import { aDoc, tieneRol, todosLosMiembros, usuarioActual } from "../lib/usuarios.js";
import { notificar, registrarActividad } from "../lib/avisos.js";
import { bool, cortar, nowIso, str } from "../lib/util.js";

const TIPOS = ["lote", "servicio", "curso", "miembro"];
const ARCHIVOS: Record<string, string[]> = { lote: ["lotes"], servicio: ["servicios-terceros", "servicios"], curso: ["contenido-cursos", "cursos"], miembro: [] };

async function adminO403(ctx: Ctx): Promise<Doc> {
  const u = await usuarioActual(ctx);
  if (u && tieneRol(ctx, u, "admin") && !ctx.ses.d.admin) return u;
  if (u && (u.admin || u.rol === "admin" || (u.roles ?? []).includes("admin"))) return u;
  if (ctx.ses.d.admin) return { id: "admin", nombre: "Administración" };
  fail("Solo la administración verifica publicaciones y perfiles.", 403);
}

function sellar(item: Doc, verificado: boolean, admin: Doc, nota: string): Doc {
  const x: Doc = { ...item, verificado };
  if (verificado) {
    x.verificado_en = nowIso(); x.verificado_por = admin.nombre ?? "Administración";
    if (nota) x.verificacion_nota = cortar(nota, 300);
  } else {
    Object.assign(x, { verificado_en: null, verificado_por: "", verificacion_retirada_en: nowIso(), verificacion_retirada_por: admin.nombre ?? "Administración", verificacion_nota: nota ? cortar(nota, 300) : "" });
  }
  return x;
}
const duenio = (tipo: string, i: Doc) => tipo === "miembro" ? str(i.id) : tipo === "lote" ? str(i.productor_id ?? i.owner_id ?? i.published_by)
  : tipo === "servicio" ? str(i.proveedor_id ?? i.owner_id ?? i.published_by) : str(i.autor_id);
function titulo(tipo: string, i: Doc): string {
  if (tipo === "miembro") return str(i.nombre ?? i.id);
  if (tipo === "lote") { const p = [i.finca, i.variedad].filter(Boolean); return p.length ? p.join(" · ") : str(i.id); }
  return str(i.titulo ?? i.nombre ?? i.id);
}

const acciones: Modulo["acciones"] = {
  async list(ctx) {
    await adminO403(ctx);
    const items: Doc[] = [];
    for (const l of await listar("lotes")) {
      if (l.demo || l.ejemplo) continue;
      items.push({ tipo: "lote", id: str(l.id), titulo: titulo("lote", l), detalle: `${str(l.provincia)} · ${str(l.productor)}`.trim(), verificado: !!l.verificado, verificado_en: l.verificado_en ?? null, verificado_por: l.verificado_por ?? "", creado: l.created_at ?? "", enlace: `/marketplace/${encodeURIComponent(str(l.id))}/` });
    }
    for (const s of await listar("servicios-terceros")) {
      items.push({ tipo: "servicio", id: str(s.id), titulo: titulo("servicio", s), detalle: `${str(s.categoria)} · ${str(s.proveedor)}`.trim(), verificado: !!s.verificado, verificado_en: s.verificado_en ?? null, verificado_por: s.verificado_por ?? "", creado: s.created_at ?? "", enlace: "/marketplace/" });
    }
    for (const c of await listar("contenido-cursos")) {
      const deLaRed = !str(c.autor_id).trim();
      items.push({ tipo: "curso", id: str(c.id), titulo: titulo("curso", c), detalle: `${str(c.nivel)} · ${deLaRed ? "curso de Red Café" : str(c.autor)}`.trim(), verificado: !!c.verificado, verificado_en: c.verificado_en ?? null, verificado_por: c.verificado_por ?? "", creado: c.created_at ?? "", enlace: `/academia/${encodeURIComponent(str(c.id))}/` });
    }
    for (const m of await todosLosMiembros()) {
      items.push({ tipo: "miembro", id: str(m.id), titulo: titulo("miembro", m), detalle: [(m.roles ?? [m.rol]).join(", "), str(m.provincia)].filter(Boolean).join(" · "), verificado: !!m.verificado, verificado_en: m.fecha_verificacion ?? m.verificado_en ?? null, verificado_por: m.verificado_por ?? "", estado_validacion: m.estado_validacion ?? "pendiente", creado: m.created_at ?? "", enlace: "" });
    }
    items.sort((a, b) => (a.verificado !== b.verificado ? (a.verificado ? 1 : -1) : str(b.creado).localeCompare(str(a.creado))));
    return { items, tipos: TIPOS, pendientes: items.filter((i) => !i.verificado).length };
  },

  async set(ctx) {
    const admin = await adminO403(ctx);
    const tipo = str(ctx.in.tipo).trim(), id = str(ctx.in.id).trim(), nota = str(ctx.in.nota).trim();
    if (!TIPOS.includes(tipo)) fail("Tipo no válido.", 422);
    if (!id) fail("id requerido.", 422);
    const verificado = bool(ctx.in.verificado ?? true);
    let tocado: Doc | null = null;
    if (tipo === "miembro") {
      const f = await db.usuario.findUnique({ where: { id } });
      if (f) {
        const sellado = sellar(aDoc(f), verificado, admin, nota);
        const extra = { ...((f.extra as Doc) ?? {}) };
        for (const k of ["verificado_en", "verificado_por", "verificacion_nota", "verificacion_retirada_en", "verificacion_retirada_por"]) if (k in sellado) extra[k] = sellado[k];
        extra.estado_validacion = verificado ? "verificado" : "pendiente";
        extra.fecha_verificacion = verificado ? nowIso() : null;
        tocado = aDoc(await db.usuario.update({ where: { id }, data: { verificado, extra } }));
      }
    } else {
      for (const archivo of ARCHIVOS[tipo]) {
        await mutar(archivo, (l) => l.map((it) => {
          if (str(it?.id) !== id || tocado) return it;
          const x = sellar(it, verificado, admin, nota);
          tocado = x;
          return x;
        }));
      }
    }
    if (!tocado) fail("No se encontró lo que quieres verificar.", 404);
    const t = tocado as Doc;
    const tit = titulo(tipo, t), d = duenio(tipo, t);
    const etiqueta = ({ lote: "lote", servicio: "servicio", curso: "curso", miembro: "perfil" } as Record<string, string>)[tipo];
    await registrarActividad(ctx, verificado ? "verificacion-concedida" : "verificacion-retirada", { objeto_tipo: tipo, objeto_id: id, detalle: `${etiqueta}: ${tit}` + (nota ? " — " + nota : "") });
    if (d) {
      await notificar(d, tipo, verificado ? `La administración verificó tu ${etiqueta}` : `Se retiró la verificación de tu ${etiqueta}`,
        verificado ? `${tit} lleva ahora el sello de verificado en la Red.` + (nota ? " " + nota : "") : `${tit} ya no lleva el sello.` + (nota ? " Motivo: " + nota : ""), str(t.enlace));
    }
    return { tipo, id, verificado, verificado_en: t.verificado_en ?? null, verificado_por: t.verificado_por ?? "" };
  },
};

export const verificaciones: Modulo = { acciones };
