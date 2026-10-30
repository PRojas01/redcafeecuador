// Port de api/push.php: suscripción de dispositivos a los avisos.
import { fail, type Modulo } from "../lib/http.js";
import { listar, mutar } from "../lib/docs.js";
import { requiereUsuario } from "../lib/usuarios.js";
import { enviarAUsuario, validarEndpointPush, vapid, vapidExiste } from "../lib/push.js";
import { cortar, nowIso, str } from "../lib/util.js";

const mias = async (uid: string) => (await listar("push-suscripciones")).filter((s) => str(s.uid) === uid).length;

const acciones: Modulo["acciones"] = {
  async clave(ctx) {
    const u = await requiereUsuario(ctx);
    return { publica: (await vapid()).publica, uid: str(u.id) };
  },
  async estado(ctx) {
    const u = await requiereUsuario(ctx);
    return { dispositivos: await mias(str(u.id)), clave: await vapidExiste() };
  },
  async suscribir(ctx) {
    const u = await requiereUsuario(ctx);
    const endpoint = str(ctx.in.endpoint).trim();
    const keys = ctx.in.keys && typeof ctx.in.keys === "object" ? (ctx.in.keys as Record<string, unknown>) : {};
    validarEndpointPush(endpoint);
    if (!str(keys.p256dh) || !str(keys.auth)) fail("Claves push incompletas.", 422);
    const uid = str(u.id), agente = cortar(ctx.cabecera("user-agent"), 160);
    await mutar("push-suscripciones", (todas) => {
      todas = todas.filter((s) => str(s.endpoint) !== endpoint);
      todas.push({ id: "ps-" + Buffer.from(endpoint).toString("base64url").slice(-40) + "-" + Date.now().toString(36), uid, endpoint, keys: { p256dh: cortar(str(keys.p256dh), 200), auth: cortar(str(keys.auth), 100) }, agente, ts: nowIso() });
      const propias = todas.filter((s) => str(s.uid) === uid).sort((a, b) => str(a.ts).localeCompare(str(b.ts)));
      if (propias.length > 5) {
        const quitar = new Set(propias.slice(0, propias.length - 5).map((s) => str(s.endpoint)));
        todas = todas.filter((s) => !quitar.has(str(s.endpoint)));
      }
      return todas;
    });
    return { dispositivos: await mias(uid) };
  },
  async baja(ctx) {
    const u = await requiereUsuario(ctx);
    const endpoint = str(ctx.in.endpoint).trim(), uid = str(u.id);
    await mutar("push-suscripciones", (l) => l.filter((s) => str(s.uid) !== uid || (endpoint !== "" && str(s.endpoint) !== endpoint)));
    return { dispositivos: await mias(uid) };
  },
  async prueba(ctx) {
    const u = await requiereUsuario(ctx);
    return { aceptados: await enviarAUsuario(str(u.id), "Avisos activados", "Este teléfono ya puede recibir avisos de Red Café Ecuador.", "/panel/") };
  },
};

export const push: Modulo = { acciones, noValida: { mensaje: "Acción no válida.", codigo: 404 } };
