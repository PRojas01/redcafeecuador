// Importador del sistema PHP: data/*.json → PostgreSQL.
//
//   npm run importar -- <carpeta data/>                 simulación (no escribe)
//   npm run importar -- <carpeta data/> --aplicar       importa
//   opciones: --pass-admin <archivo .redcafe_admin_pass>
//
// Reglas (plan de migración, M4):
//  · Idempotente: un miembro ya importado (mismo correo) no se duplica, y una
//    colección que ya tiene datos en la base no se toca. Cada archivo queda
//    anotado en RegistroImportacion.
//  · Miembros: se conserva el id y el hash bcrypt (siguen entrando con su
//    contraseña); la cédula se cifra; los códigos 2FA se importan como sha256.
//  · Nunca se migran sesiones, OTP, cupos (.rate, .sess, .locks) ni los
//    lotes de demostración.
//  · Los secretos (firma de apelaciones, bajas de correo, VAPID, token de
//    respaldos) se conservan para que los enlaces y suscripciones sigan valiendo.
import fs from "node:fs";
import path from "node:path";
import { createPrivateKey } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "../lib/db.js";
import { esMapa, idDe, type Doc } from "../lib/docs.js";
import { cifrar, huella } from "../lib/pii.js";

const args = process.argv.slice(2);
const DATA = path.resolve(args.find((a) => !a.startsWith("--")) ?? "");
const APLICAR = args.includes("--aplicar");
const archivoAdmin = (() => { const i = args.indexOf("--pass-admin"); return i >= 0 ? args[i + 1] : ""; })();

/** Archivos que no son colecciones o que se tratan aparte. */
const APARTE = new Set(["members", "consents"]);
const NUNCA = /^(sessions?|otp.*|rate.*|locks?|mail-debug)$/;

type Informe = { archivo: string; destino: string; filas: number; accion: string };
const informe: Informe[] = [];
const avisos: string[] = [];

const leer = (f: string): unknown => {
  const crudo = fs.readFileSync(f, "utf8").replace(/^﻿/, "");
  return crudo.trim() === "" ? [] : JSON.parse(crudo);
};
const fecha = (v: unknown): Date | null => { const t = Date.parse(String(v ?? "")); return Number.isFinite(t) ? new Date(t) : null; };
const anotar = (tx: Prisma.TransactionClient | typeof db, origen: string, legacyId: string, destino: string, destinoId: string) =>
  tx.registroImportacion.upsert({ where: { origen_legacyId: { origen, legacyId } }, create: { origen, legacyId, destino, destinoId }, update: { destino, destinoId } });

/* ── Miembros ─────────────────────────────────────────────────────────── */
const COLUMNAS = new Set(["id", "email", "pass", "nombre", "rol", "roles", "plan", "visibilidad", "provincia", "telefono", "whatsapp", "cedula", "verificado", "estado", "activo", "admin", "is_admin", "fundador", "two_factor_enabled", "two_factor_updated_at", "pass_changed_at", "backup_codes", "pass_reset_by", "pass_reset_at", "two_factor_secret"]);

async function miembros() {
  const f = path.join(DATA, "members.json");
  if (!fs.existsSync(f)) return;
  const lista = leer(f);
  if (!Array.isArray(lista)) { avisos.push("members.json no es una lista: no se importa."); return; }
  let nuevos = 0, ya = 0, malos = 0;
  const vistos = new Set<string>();
  for (const m of lista as Doc[]) {
    const email = String(m?.email ?? "").trim().toLowerCase();
    const id = String(m?.id ?? "").trim();
    if (!id || !email) { malos++; avisos.push(`Miembro sin id o correo (${id || email || "?"}): omitido.`); continue; }
    if (vistos.has(email)) { malos++; avisos.push(`Correo repetido en members.json (${email}): se importa solo el primero.`); continue; }
    vistos.add(email);
    if (await db.usuario.findFirst({ where: { OR: [{ id }, { email }] }, select: { id: true } })) { ya++; continue; }
    nuevos++;
    if (!APLICAR) continue;
    let passHash = String(m.pass ?? "");
    const extra: Doc = {};
    for (const [k, v] of Object.entries(m)) if (!COLUMNAS.has(k)) extra[k] = v;
    if (!/^\$2[aby]\$/.test(passHash)) {
      // Sin hash válido: cuenta sin contraseña utilizable; entrará con «olvidé mi contraseña».
      passHash = await bcrypt.hash(cryptoAleatorio(), 10);
      extra.requiere_nueva_pass = true;
      avisos.push(`Miembro ${id} sin hash bcrypt: deberá recuperar su contraseña.`);
    }
    // Se conservan tal cual (incluido «admin»): validarlos aquí dejaría fuera cuentas reales.
    const roles = [...new Set((Array.isArray(m.roles) && m.roles.length ? m.roles : [m.rol]).map((r: unknown) => String(r ?? "").trim()).filter(Boolean))] as string[];
    const cedula = String(m.cedula ?? "").trim();
    const codigos = Array.isArray(m.backup_codes) ? m.backup_codes.map(String).filter(Boolean) : [];
    await db.$transaction(async (tx) => {
      await tx.usuario.create({
        data: {
          id, email, passHash, nombre: String(m.nombre ?? "").slice(0, 100) || email, rol: roles[0] ?? String(m.rol ?? "amante"), roles,
          plan: String(m.plan ?? "origen"), visibilidad: m.visibilidad === "registrados" ? "registrados" : "publico",
          provincia: String(m.provincia ?? ""), telefono: String(m.telefono ?? ""), whatsapp: String(m.whatsapp ?? ""),
          cedulaCifrada: cedula ? cifrar(cedula) : "", cedulaHuella: cedula ? huella(cedula) : "",
          verificado: !!m.verificado, estado: String(m.estado ?? "activo"), activo: m.activo === undefined ? true : !!m.activo,
          admin: !!(m.admin || m.is_admin), fundador: !!m.fundador,
          dosFactores: !!m.two_factor_enabled, dosFactoresEn: fecha(m.two_factor_updated_at), passCambiadaEn: fecha(m.pass_changed_at),
          creado: fecha(m.created_at) ?? new Date(), extra: extra as Prisma.InputJsonValue,
        },
      });
      if (codigos.length) await tx.codigoRespaldo.createMany({ data: codigos.map((hash: string) => ({ usuarioId: id, hash })) });
      await anotar(tx, "members.json", id, "Usuario", id);
    });
  }
  informe.push({ archivo: "members.json", destino: "Usuario", filas: nuevos, accion: `${nuevos} nuevos · ${ya} ya estaban · ${malos} omitidos` });
}
const cryptoAleatorio = () => Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("hex");

async function consentimientos() {
  const f = path.join(DATA, "consents.json");
  if (!fs.existsSync(f)) return;
  const lista = leer(f) as Doc[];
  if (!Array.isArray(lista)) return;
  let n = 0, ya = 0, huerfanos = 0;
  for (const c of lista) {
    const legacy = String(c.id ?? `${c.member_id}-${c.ts}`);
    if (await db.registroImportacion.findUnique({ where: { origen_legacyId: { origen: "consents.json", legacyId: legacy } } })) { ya++; continue; }
    const uid = String(c.member_id ?? "");
    if (!uid || !(await db.usuario.findUnique({ where: { id: uid }, select: { id: true } }))) { if (APLICAR || !uid) { huerfanos++; continue; } }
    n++;
    if (!APLICAR) continue;
    const fila = await db.consentimiento.create({
      data: { usuarioId: uid, email: String(c.email ?? ""), ip: String(c.ip ?? ""), ua: String(c.ua ?? "").slice(0, 200), terminos: !!c.acepta_terminos, privacidad: !!c.acepta_privacidad, usoDatos: !!c.acepta_uso_datos, marketing: !!c.acepta_marketing, ts: fecha(c.ts) ?? new Date() },
    });
    await anotar(db, "consents.json", legacy, "Consentimiento", fila.id);
  }
  informe.push({ archivo: "consents.json", destino: "Consentimiento", filas: n, accion: `${n} nuevos · ${ya} ya estaban · ${huerfanos} sin miembro` });
}

/* ── Colecciones de documentos ────────────────────────────────────────── */
async function colecciones() {
  for (const nombre of fs.readdirSync(DATA).sort()) {
    if (!nombre.endsWith(".json") || nombre.startsWith(".") || /\.(copia|bak)-/.test(nombre)) continue;
    const col = nombre.slice(0, -5);
    if (APARTE.has(col) || NUNCA.test(col)) continue;
    let datos: unknown;
    try { datos = leer(path.join(DATA, nombre)); } catch { avisos.push(`${nombre}: JSON ilegible, omitido.`); continue; }
    const existentes = await db.documento.count({ where: { coleccion: col } });
    const mapa = !Array.isArray(datos) && !!datos && typeof datos === "object" && (esMapa(col) || Object.keys(datos).length > 0);
    if (existentes) { informe.push({ archivo: nombre, destino: col, filas: 0, accion: `omitida: la base ya tiene ${existentes} documento(s)` }); continue; }
    if (mapa) {
      informe.push({ archivo: nombre, destino: col, filas: 1, accion: "mapa" });
      if (APLICAR) {
        await db.documento.create({ data: { coleccion: col, id: "_", datos: datos as Prisma.InputJsonValue } });
        await anotar(db, nombre, "*", col, "_");
      }
      continue;
    }
    let items = (Array.isArray(datos) ? datos : []) as Doc[];
    const demo = col === "lotes" ? items.filter((l) => l?.demo).length : 0;
    if (demo) items = items.filter((l) => !l?.demo);
    const vistos = new Set<string>();
    const filas = items.filter((d) => d && typeof d === "object").map((d, i) => {
      let id = idDe(col, d, i);
      while (vistos.has(id)) id += "~dup";
      vistos.add(id);
      return { coleccion: col, id, datos: d as Prisma.InputJsonValue };
    });
    informe.push({ archivo: nombre, destino: col, filas: filas.length, accion: demo ? `${demo} lote(s) demo no migrados` : "lista" });
    if (APLICAR && filas.length) {
      await db.$transaction(async (tx) => {
        for (const f of filas) await tx.documento.create({ data: f }); // uno a uno: conserva el orden
        await anotar(tx, nombre, "*", col, String(filas.length));
      }, { timeout: 120_000 });
    }
  }
}

/** data/paginas/*.md + .meta.json → colección «paginas». */
async function paginas() {
  const dir = path.join(DATA, "paginas");
  if (!fs.existsSync(dir)) return;
  if (await db.documento.count({ where: { coleccion: "paginas" } })) { informe.push({ archivo: "paginas/", destino: "paginas", filas: 0, accion: "omitida: ya hay páginas" }); return; }
  const mds = fs.readdirSync(dir).filter((f) => /^[a-z0-9][a-z0-9\-_]{1,80}\.md$/.test(f));
  for (const f of mds) {
    const slug = f.slice(0, -3);
    const metaF = path.join(dir, slug + ".meta.json");
    const meta: Doc = fs.existsSync(metaF) ? (JSON.parse(fs.readFileSync(metaF, "utf8")) ?? {}) : {};
    const st = fs.statSync(path.join(dir, f));
    if (APLICAR) await db.documento.create({ data: { coleccion: "paginas", id: slug, datos: { id: slug, slug, contenido: fs.readFileSync(path.join(dir, f), "utf8"), titulo: meta.titulo ?? "", resumen: meta.resumen ?? "", orden: meta.orden ?? 99, publicado: meta.publicado ?? true, updated_at: meta.updated_at ?? st.mtime.toISOString(), created_at: st.mtime.toISOString() } } });
  }
  informe.push({ archivo: "paginas/", destino: "paginas", filas: mds.length, accion: "markdown" });
}

/* ── Secretos y administración ────────────────────────────────────────── */
async function secretos() {
  const pares: [string, string][] = [[".moderacion_secreto", "moderacion"], [".baja_correo_secreto", "baja-correo"], [".respaldo_token", "respaldo_token"]];
  for (const [archivo, nombre] of pares) {
    const f = path.join(DATA, archivo);
    if (!fs.existsSync(f)) continue;
    const valor = fs.readFileSync(f, "utf8").trim();
    const ya = await db.secreto.findUnique({ where: { nombre } });
    informe.push({ archivo, destino: "Secreto:" + nombre, filas: ya ? 0 : 1, accion: ya ? "ya existía (se conserva el de la base)" : "se conserva" });
    if (APLICAR && !ya && valor) await db.secreto.create({ data: { nombre, valor } });
  }
  const vapidF = path.join(DATA, ".push_vapid.json");
  if (fs.existsSync(vapidF)) {
    const ya = await db.secreto.findUnique({ where: { nombre: "push_vapid" } });
    try {
      const j = JSON.parse(fs.readFileSync(vapidF, "utf8"));
      const d = createPrivateKey(j.privada_pem).export({ format: "jwk" }).d;
      informe.push({ archivo: ".push_vapid.json", destino: "Secreto:push_vapid", filas: ya ? 0 : 1, accion: ya ? "ya existía" : "las suscripciones siguen valiendo" });
      if (APLICAR && !ya && d && j.publica) await db.secreto.create({ data: { nombre: "push_vapid", valor: JSON.stringify({ privada: d, publica: j.publica }) } });
    } catch {
      avisos.push(".push_vapid.json ilegible: se generará una clave nueva y los dispositivos deberán volver a activar avisos.");
    }
  }
  const candidatos = [archivoAdmin, path.join(path.dirname(DATA), "..", ".redcafe_admin_pass"), path.join(DATA, ".redcafe_admin_pass")].filter(Boolean);
  const f = candidatos.find((c) => fs.existsSync(c));
  if (f) {
    const v = fs.readFileSync(f, "utf8").replace(/^﻿/, "").trim();
    const ya = await db.administrador.findUnique({ where: { id: "principal" } });
    informe.push({ archivo: path.basename(f), destino: "Administrador", filas: ya ? 0 : 1, accion: ya ? "ya existía" : /^\$2[aby]\$/.test(v) ? "hash bcrypt conservado" : "texto plano → bcrypt" });
    if (APLICAR && !ya && v) await db.administrador.create({ data: { id: "principal", passHash: /^\$2[aby]\$/.test(v) ? v : await bcrypt.hash(v, 10) } });
  }
}

async function main() {
  if (!DATA || !fs.existsSync(path.join(DATA))) { console.error("Uso: npm run importar -- <carpeta data/> [--aplicar] [--pass-admin <archivo>]"); process.exit(2); }
  console.log(`Importador Red Café · origen ${DATA} · modo ${APLICAR ? "APLICAR" : "SIMULACIÓN (no se escribe nada)"}\n`);
  await miembros();
  await consentimientos();
  await colecciones();
  await paginas();
  await secretos();
  const ancho = Math.max(...informe.map((i) => i.archivo.length), 10);
  for (const i of informe) console.log(`${i.archivo.padEnd(ancho)}  → ${i.destino.padEnd(24)} ${String(i.filas).padStart(5)}  ${i.accion}`);
  if (avisos.length) { console.log("\nAvisos:"); for (const a of avisos) console.log("  · " + a); }
  console.log(`\nNo se migran: sesiones, OTP, cupos (.rate), bloqueos (.locks) ni lotes de demostración.`);
  console.log(APLICAR ? "\nHecho." : "\nSimulación terminada. Repite con --aplicar para importar.");
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
