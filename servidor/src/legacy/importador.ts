// Importador del sistema PHP (data/*.json → MySQL), sin acceso al disco:
// recibe los archivos ya leídos. Lo usan la línea de órdenes (importar.ts,
// que lee una carpeta) y la pantalla de administración (modulos/importacion.ts,
// que descifra en memoria el paquete que sube el administrador).
//
// Reglas:
//  · Idempotente: un miembro ya importado (mismo correo) no se duplica, y una
//    colección que ya tiene datos en la base no se toca. Cada archivo queda
//    anotado en RegistroImportacion.
//  · Miembros: se conserva el id y el hash bcrypt (siguen entrando con su
//    contraseña); la cédula se cifra; los códigos 2FA se importan como sha256.
//  · Nunca se migran sesiones, OTP, cupos (.rate, .sess, .locks) ni los
//    lotes de demostración.
//  · Los secretos (firma de apelaciones, bajas de correo, VAPID, token de
//    respaldos) se conservan para que los enlaces y suscripciones sigan valiendo.
import { createPrivateKey, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "../lib/db.js";
import { esMapa, idDe, type Doc } from "../lib/docs.js";
import { cifrar, huella } from "../lib/pii.js";

/** Archivos por ruta relativa a data/: «members.json», «paginas/x.md», «.moderacion_secreto». */
export type Fuente = Map<string, Buffer>;
export type Informe = { archivo: string; destino: string; filas: number; accion: string };
export type Resultado = { aplicado: boolean; informe: Informe[]; avisos: string[] };

export async function importar(F: Fuente, opciones: { aplicar: boolean; fechas?: Map<string, string> }): Promise<Resultado> {
  const APLICAR = opciones.aplicar;
  const fechas = opciones.fechas;
  const informe: Informe[] = [];
  const avisos: string[] = [];
  const texto = (k: string) => F.get(k)!.toString("utf8");
  const leer = (k: string): unknown => {
    const crudo = texto(k).replace(/^\ufeff/, "");
    return crudo.trim() === "" ? [] : JSON.parse(crudo);
  };

  /** Archivos que no son colecciones o que se tratan aparte. */
  const APARTE = new Set(["members", "consents"]);
  const NUNCA = /^(sessions?|otp.*|rate.*|locks?|mail-debug)$/;


  const fecha = (v: unknown): Date | null => { const t = Date.parse(String(v ?? "")); return Number.isFinite(t) ? new Date(t) : null; };
  const anotar = (tx: Prisma.TransactionClient | typeof db, origen: string, legacyId: string, destino: string, destinoId: string) =>
    tx.registroImportacion.upsert({ where: { origen_legacyId: { origen, legacyId } }, create: { origen, legacyId, destino, destinoId }, update: { destino, destinoId } });

  /* ── Miembros ─────────────────────────────────────────────────────────── */
  const COLUMNAS = new Set(["id", "email", "pass", "nombre", "rol", "roles", "plan", "visibilidad", "provincia", "telefono", "whatsapp", "cedula", "verificado", "estado", "activo", "admin", "is_admin", "fundador", "two_factor_enabled", "two_factor_updated_at", "pass_changed_at", "backup_codes", "pass_reset_by", "pass_reset_at", "two_factor_secret"]);

  async function miembros() {
    if (!F.has("members.json")) return;
    const lista = leer("members.json");
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
  const cryptoAleatorio = () => randomBytes(24).toString("hex");

  async function consentimientos() {
    if (!F.has("consents.json")) return;
    const lista = leer("consents.json") as Doc[];
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
    for (const nombre of [...F.keys()].filter((k) => !k.includes("/")).sort()) {
      if (!nombre.endsWith(".json") || nombre.startsWith(".") || /\.(copia|bak)-/.test(nombre)) continue;
      const col = nombre.slice(0, -5);
      if (APARTE.has(col) || NUNCA.test(col)) continue;
      let datos: unknown;
      try { datos = leer(nombre); } catch { avisos.push(`${nombre}: JSON ilegible, omitido.`); continue; }
      let existentes = await db.documento.count({ where: { coleccion: col } });
      if (existentes) {
        // Lo que la aplicación siembra sola (lotes y vídeos de ejemplo) no cuenta
        // como dato: se reemplaza por el real.
        const docs = await db.documento.findMany({ where: { coleccion: col }, select: { datos: true } });
        const soloEjemplo = docs.every(({ datos }) => {
          const d = datos as Doc;
          if (Array.isArray(d?.items)) return d.items.every((x: Doc) => x?.ejemplo || x?.demo);
          return !!(d?.demo || d?.ejemplo);
        });
        if (soloEjemplo) {
          if (APLICAR) await db.documento.deleteMany({ where: { coleccion: col } });
          avisos.push(`${col}: tenía solo contenido de ejemplo; se reemplaza por el real.`);
          existentes = 0;
        }
      }
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
    const enPaginas = [...F.keys()].filter((k) => k.startsWith("paginas/")).map((k) => k.slice(8));
    if (!enPaginas.length) return;
    if (await db.documento.count({ where: { coleccion: "paginas" } })) { informe.push({ archivo: "paginas/", destino: "paginas", filas: 0, accion: "omitida: ya hay páginas" }); return; }
    const mds = enPaginas.filter((f) => /^[a-z0-9][a-z0-9\-_]{1,80}\.md$/.test(f));
    for (const f of mds) {
      const slug = f.slice(0, -3);
      const metaF = "paginas/" + slug + ".meta.json";
      const meta: Doc = F.has(metaF) ? (JSON.parse(texto(metaF)) ?? {}) : {};
      const cuando = fechas?.get("paginas/" + f) ?? new Date().toISOString();
      if (APLICAR) await db.documento.create({ data: { coleccion: "paginas", id: slug, datos: { id: slug, slug, contenido: texto("paginas/" + f), titulo: meta.titulo ?? "", resumen: meta.resumen ?? "", orden: meta.orden ?? 99, publicado: meta.publicado ?? true, updated_at: meta.updated_at ?? cuando, created_at: cuando } } });
    }
    informe.push({ archivo: "paginas/", destino: "paginas", filas: mds.length, accion: "markdown" });
  }

  /* ── Secretos y administración ────────────────────────────────────────── */
  async function secretos() {
    const pares: [string, string][] = [[".moderacion_secreto", "moderacion"], [".baja_correo_secreto", "baja-correo"], [".respaldo_token", "respaldo_token"]];
    for (const [archivo, nombre] of pares) {
      if (!F.has(archivo)) continue;
      const valor = texto(archivo).trim();
      const ya = await db.secreto.findUnique({ where: { nombre } });
      informe.push({ archivo, destino: "Secreto:" + nombre, filas: ya ? 0 : 1, accion: ya ? "ya existía (se conserva el de la base)" : "se conserva" });
      if (APLICAR && !ya && valor) await db.secreto.create({ data: { nombre, valor } });
    }
    const vapidF = ".push_vapid.json";
    if (F.has(vapidF)) {
      const ya = await db.secreto.findUnique({ where: { nombre: "push_vapid" } });
      try {
        const j = JSON.parse(texto(vapidF));
        const d = createPrivateKey(j.privada_pem).export({ format: "jwk" }).d;
        informe.push({ archivo: ".push_vapid.json", destino: "Secreto:push_vapid", filas: ya ? 0 : 1, accion: ya ? "ya existía" : "las suscripciones siguen valiendo" });
        if (APLICAR && !ya && d && j.publica) await db.secreto.create({ data: { nombre: "push_vapid", valor: JSON.stringify({ privada: d, publica: j.publica }) } });
      } catch {
        avisos.push(".push_vapid.json ilegible: se generará una clave nueva y los dispositivos deberán volver a activar avisos.");
      }
    }
    const f = F.has(".redcafe_admin_pass") ? ".redcafe_admin_pass" : "";
    if (f) {
      const v = texto(f).replace(/^﻿/, "").trim();
      const ya = await db.administrador.findUnique({ where: { id: "principal" } });
      // La contraseña de administración de producción manda sobre la inicial del .env.
      informe.push({ archivo: f, destino: "Administrador", filas: 1, accion: (ya ? "sustituye a la inicial · " : "") + (/^\$2[aby]\$/.test(v) ? "hash bcrypt conservado" : "texto plano → bcrypt") });
      if (APLICAR && v) {
        const passHash = /^\$2[aby]\$/.test(v) ? v : await bcrypt.hash(v, 10);
        await db.administrador.upsert({ where: { id: "principal" }, create: { id: "principal", passHash }, update: { passHash, provisionalHasta: null, resetTokenHash: null, resetExpira: null } });
      }
    }
  }

  await miembros();
  await consentimientos();
  await colecciones();
  await paginas();
  await secretos();
  return { aplicado: APLICAR, informe, avisos };
}
