// Port de api/respaldo.php: copias de los datos con rotación 7/4/6.
// Antes se comprimía data/*.json; ahora es una copia lógica de la base
// (miembros, documentos, consentimientos y códigos 2FA cifrados) en
// .json.gz, fuera del sitio. NO entran sesiones, OTP, cupos ni secretos
// (VAPID, firmas): un respaldo filtrado no entrega las llaves de la casa.
// En producción esto complementa —no sustituye— el pg_dump diario.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { gzipSync } from "node:zlib";
import { Cruda, fail, type Ctx, type Modulo } from "../lib/http.js";
import { db } from "../lib/db.js";
import { tieneRol, usuarioActual } from "../lib/usuarios.js";
import { registrarActividad } from "../lib/avisos.js";
import { config } from "../lib/config.js";
import { nowIso, str } from "../lib/util.js";

const DIARIOS = 7, SEMANALES = 4, MENSUALES = 6, MAX_MB = 200;
const PATRON = /^respaldo-(\d{8})-(\d{6})\.json\.gz$/;

export function carpeta(): string {
  const dir = path.resolve(process.env.REDCAFE_RESPALDOS ?? path.join(path.dirname(config.sitio), "redcafe-respaldos"));
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

async function token(): Promise<string> {
  const f = await db.secreto.findUnique({ where: { nombre: "respaldo_token" } });
  if (f) return f.valor;
  const t = randomBytes(16).toString("hex");
  await db.secreto.createMany({ data: [{ nombre: "respaldo_token", valor: t }], skipDuplicates: true });
  return (await db.secreto.findUnique({ where: { nombre: "respaldo_token" } }))!.valor;
}

export function listarCopias() {
  const dir = carpeta();
  return fs.readdirSync(dir).flatMap((f) => {
    const m = PATRON.exec(f);
    if (!m) return [];
    const ts = Date.parse(`${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6)}T${m[2].slice(0, 2)}:${m[2].slice(2, 4)}:${m[2].slice(4)}Z`) || 0;
    return [{ archivo: f, ts: Math.floor(ts / 1000), fecha: new Date(ts).toISOString().replace(/\.\d{3}Z$/, "+00:00"), bytes: fs.statSync(path.join(dir, f)).size }];
  }).sort((a, b) => b.ts - a.ts);
}

export async function crear(motivo: string) {
  const [usuarios, documentos, consentimientos, codigos, administradores] = await Promise.all([
    db.usuario.findMany(), db.documento.findMany({ orderBy: [{ coleccion: "asc" }, { orden: "asc" }] }),
    db.consentimiento.findMany(), db.codigoRespaldo.findMany(), db.administrador.findMany().catch(() => []),
  ]);
  const bulto = {
    formato: "redcafe-respaldo/2", generado: nowIso(), motivo,
    nota: "Restaurar con: npm run restaurar -- <archivo> (vacía y repone las tablas listadas). No contiene sesiones, OTP, cupos ni secretos.",
    tablas: { usuarios, documentos, consentimientos, codigosRespaldo: codigos, administradores },
  };
  const gz = gzipSync(Buffer.from(JSON.stringify(bulto)), { level: 6 });
  const sello = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  const nombre = `respaldo-${sello}.json.gz`;
  const ruta = path.join(carpeta(), nombre);
  fs.writeFileSync(ruta, gz, { mode: 0o600 });
  const info = { archivo: nombre, bytes: gz.length, sha256: createHash("sha256").update(gz).digest("hex"), piezas: documentos.length + usuarios.length, creado: nowIso(), motivo };
  rotar();
  return info;
}

function rotar() {
  const copias = listarCopias();
  const guardar = new Set<string>(), semanas = new Set<string>(), meses = new Set<string>();
  copias.forEach((c, i) => {
    if (i < DIARIOS) { guardar.add(c.archivo); return; }
    const d = new Date(c.ts * 1000);
    const jueves = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)));
    const semana = `${jueves.getUTCFullYear()}-${Math.ceil(((jueves.getTime() - Date.UTC(jueves.getUTCFullYear(), 0, 1)) / 86400_000 + 1) / 7)}`;
    const mes = d.toISOString().slice(0, 7);
    if (semanas.size < SEMANALES && !semanas.has(semana)) { semanas.add(semana); guardar.add(c.archivo); return; }
    if (meses.size < MENSUALES && !meses.has(mes)) { meses.add(mes); guardar.add(c.archivo); }
  });
  const dir = carpeta();
  let total = 0;
  for (const c of copias) {
    if (!guardar.has(c.archivo)) { fs.rmSync(path.join(dir, c.archivo), { force: true }); continue; }
    total += c.bytes;
  }
  const quedan = listarCopias();
  for (let i = quedan.length - 1; i > 0 && total > MAX_MB * 1024 * 1024; i--) {
    fs.rmSync(path.join(dir, quedan[i].archivo), { force: true });
    total -= quedan[i].bytes;
  }
}

/** Tarea interna: una copia al día (antes la disparaba la primera visita a la campana). */
let enCurso = false;
export function programarRespaldos() {
  const tic = async () => {
    if (enCurso) return;
    enCurso = true;
    try {
      const u = listarCopias()[0];
      if (!u || Date.now() / 1000 - u.ts >= 20 * 3600) await crear("automatico");
    } catch (e) {
      console.error("[respaldo]", e);
    } finally {
      enCurso = false;
    }
  };
  setTimeout(tic, 60_000).unref();
  setInterval(tic, 3600_000).unref();
}

async function guardia(ctx: Ctx, accion: string) {
  if (accion === "cron" || ctx.ses.d.admin) return;
  const u = await usuarioActual(ctx);
  if (u && tieneRol(ctx, u, "admin")) return;
  fail("Solo administradores.", 403);
}
const nombreValido = (n: string) => { const b = path.basename(n); if (!PATRON.test(b)) fail("Archivo no válido.", 422); return b; };

const acciones: Modulo["acciones"] = {
  async cron(ctx) {
    const t = Buffer.from(str(ctx.query.token ?? ctx.in.token)), real = Buffer.from(await token());
    if (t.length !== real.length || !timingSafeEqual(t, real)) fail("Token inválido.", 403);
    return crear("cron");
  },
  async estado() {
    const lista = listarCopias();
    const t = await token();
    return {
      ultimo: lista[0] ?? null, total: lista.length, bytes_total: lista.reduce((s, c) => s + c.bytes, 0), carpeta: carpeta(),
      fuera_web: !carpeta().startsWith(config.sitio + path.sep), zip: false, formato: "json.gz",
      archivos: await db.documento.groupBy({ by: ["coleccion"] }).then((g) => g.length + 1),
      token: t, cron: "automático cada 24 h (el servidor lo hace solo)", cron_url: `/api/respaldo.php?action=cron&token=${t}`, copias: lista,
    };
  },
  async crear(ctx) {
    const info = await crear("manual");
    await registrarActividad(ctx, "respaldo", { detalle: "Respaldo manual " + info.archivo, objeto_tipo: "respaldo" });
    return info;
  },
  async descargar(ctx) {
    const nombre = nombreValido(str(ctx.query.archivo));
    const ruta = path.join(carpeta(), nombre);
    if (!fs.existsSync(ruta)) fail("Respaldo no encontrado.", 404);
    await registrarActividad(ctx, "respaldo", { detalle: "Descarga de " + nombre, objeto_tipo: "respaldo" });
    return new Cruda(new Uint8Array(fs.readFileSync(ruta)), "application/octet-stream", 200, { "Content-Disposition": `attachment; filename="${nombre}"` });
  },
  async borrar(ctx) {
    const nombre = nombreValido(str(ctx.in.archivo));
    const ruta = path.join(carpeta(), nombre);
    if (!fs.existsSync(ruta)) fail("Respaldo no encontrado.", 404);
    fs.rmSync(ruta);
    await registrarActividad(ctx, "respaldo", { detalle: "Borrado de " + nombre, objeto_tipo: "respaldo" });
    return { borrado: nombre };
  },
};

export const respaldo: Modulo = { acciones, guardia, noValida: { mensaje: "Acción no válida.", codigo: 400 } };
