// Web Push (RFC 8291 aes128gcm + VAPID RFC 8292) sin dependencias, con
// node:crypto. Las claves VAPID viven en la tabla Secreto (antes
// data/.push_vapid.json). El envío no bloquea la petición del usuario: se
// lanza en segundo plano y un fallo nunca rompe el aviso interno.
import { createECDH, createCipheriv, createPrivateKey, createSign, hkdfSync, randomBytes } from "node:crypto";
import { fail } from "./http.js";
import { db } from "./db.js";
import { listar, mutar, type Doc } from "./docs.js";
import { cortar, enlaceInterno, str } from "./util.js";

const SUJETO = "mailto:soporte@redcafeecuador.com";
const TTL = 86400, RS = 4096;
const b64u = (b: Buffer) => b.toString("base64url");
const deB64u = (s: string) => Buffer.from(s.trim(), "base64url");

type Vapid = { privada: string; publica: string };
let cache: Vapid | null = null;

/** Par de claves P-256: privada (d, base64url) y pública (punto sin comprimir). */
export async function vapid(): Promise<Vapid> {
  if (cache) return cache;
  const f = await db.secreto.findUnique({ where: { nombre: "push_vapid" } });
  if (f) {
    try { const j = JSON.parse(f.valor); if (j.privada && j.publica) return (cache = j); } catch { /* se regenera */ }
  }
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const nuevo = { privada: b64u(ecdh.getPrivateKey()), publica: b64u(ecdh.getPublicKey()) };
  // Si otra petición la creó a la vez, gana la que ya esté guardada.
  await db.secreto.createMany({ data: [{ nombre: "push_vapid", valor: JSON.stringify(nuevo) }], skipDuplicates: true });
  const g = await db.secreto.findUnique({ where: { nombre: "push_vapid" } });
  return (cache = JSON.parse(g!.valor));
}
export async function vapidExiste(): Promise<boolean> {
  return !!(await db.secreto.findUnique({ where: { nombre: "push_vapid" } }));
}

function jwt(endpoint: string, v: Vapid): string {
  const u = new URL(endpoint);
  const cab = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const cuerpo = b64u(Buffer.from(JSON.stringify({ aud: u.origin, exp: Math.floor(Date.now() / 1000) + 43200, sub: SUJETO })));
  const pub = deB64u(v.publica);
  const clave = createPrivateKey({ key: { kty: "EC", crv: "P-256", d: v.privada, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: "jwk" });
  const firma = createSign("SHA256").update(`${cab}.${cuerpo}`).sign({ key: clave, dsaEncoding: "ieee-p1363" });
  return `${cab}.${cuerpo}.${b64u(firma)}`;
}

export function cifrar(sub: Doc, payload: unknown): Buffer {
  const uaPub = deB64u(str(sub.keys?.p256dh)), auth = deB64u(str(sub.keys?.auth));
  if (uaPub.length !== 65 || uaPub[0] !== 4 || auth.length < 16) throw new Error("Suscripción push inválida.");
  const efimera = createECDH("prime256v1");
  efimera.generateKeys();
  const asPub = efimera.getPublicKey();
  const secreto = efimera.computeSecret(uaPub);
  const ikm = Buffer.from(hkdfSync("sha256", secreto, auth, Buffer.concat([Buffer.from("WebPush: info\0"), uaPub, asPub]), 32));
  const sal = randomBytes(16);
  const cek = Buffer.from(hkdfSync("sha256", ikm, sal, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, sal, Buffer.from("Content-Encoding: nonce\0"), 12));
  const c = createCipheriv("aes-128-gcm", cek, nonce);
  const cifrado = Buffer.concat([c.update(Buffer.concat([Buffer.from(JSON.stringify(payload)), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(RS);
  return Buffer.concat([sal, rs, Buffer.from([65]), asPub, cifrado]);
}

async function enviarUna(sub: Doc, titulo: string, cuerpo: string, enlace: string): Promise<number> {
  const endpoint = str(sub.endpoint);
  validarEndpointPush(endpoint);
  const v = await vapid();
  const body = cifrar(sub, { titulo: cortar(titulo, 140), cuerpo: cortar(cuerpo, 400), url: enlaceInterno(enlace) || "/" });
  try {
    const r = await fetch(endpoint, {
      method: "POST", redirect: "manual", body: new Uint8Array(body), signal: AbortSignal.timeout(3000),
      headers: { "Content-Type": "application/octet-stream", "Content-Encoding": "aes128gcm", TTL: String(TTL), Urgency: "normal", Authorization: `vapid t=${jwt(endpoint, v)}, k=${v.publica}` },
    });
    return r.status;
  } catch {
    return 0;
  }
}

export async function enviarAUsuario(uid: string, titulo: string, cuerpo: string, enlace = ""): Promise<number> {
  uid = uid.trim();
  if (!uid) return 0;
  try {
    const subs = (await listar("push-suscripciones")).filter((s) => str(s.uid) === uid);
    let entregados = 0;
    const caducados = new Set<string>();
    await Promise.all(subs.map(async (s) => {
      const code = await enviarUna(s, titulo, cuerpo, enlace);
      if ([200, 201, 202].includes(code)) entregados++;
      if ([404, 410].includes(code)) caducados.add(str(s.endpoint));
    }));
    if (caducados.size) await mutar("push-suscripciones", (l) => l.filter((s) => !caducados.has(str(s.endpoint))));
    return entregados;
  } catch {
    return 0;
  }
}

/** Para notificar(): en segundo plano, sin esperar. */
export function pushEnSegundoPlano(uid: string, titulo: string, cuerpo: string, enlace: string) {
  void enviarAUsuario(uid, titulo, cuerpo, enlace).catch(() => {});
}

export function validarEndpointPush(endpoint: string): void {
  let u: URL;
  try { u = new URL(endpoint); } catch { fail("Endpoint push inválido.", 422); }
  const h = u.hostname;
  if (endpoint.length > 1000 || u.protocol !== "https:" || u.port || u.username || u.password ||
      !(h === "fcm.googleapis.com" || h.endsWith(".push.services.mozilla.com") || h.endsWith(".notify.windows.com") || h === "web.push.apple.com")) fail("Endpoint push inválido.", 422);
}
