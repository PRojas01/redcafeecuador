// Comprueba el cifrado aes128gcm de Web Push descifrando como lo haría el navegador.
import { describe, expect, it } from "vitest";
import { createDecipheriv, createECDH, hkdfSync, randomBytes } from "node:crypto";
import { cifrar } from "../src/lib/push.js";

describe("web push", () => {
  it("el navegador puede descifrar el mensaje", () => {
    const ua = createECDH("prime256v1"); ua.generateKeys();
    const auth = randomBytes(16);
    const sub = { keys: { p256dh: ua.getPublicKey().toString("base64url"), auth: auth.toString("base64url") } };
    const out = cifrar(sub, { titulo: "Hola", cuerpo: "Café" });
    const sal = out.subarray(0, 16), idlen = out[20], asPub = out.subarray(21, 21 + idlen), datos = out.subarray(21 + idlen);
    const secreto = ua.computeSecret(asPub);
    const ikm = Buffer.from(hkdfSync("sha256", secreto, auth, Buffer.concat([Buffer.from("WebPush: info\0"), ua.getPublicKey(), asPub]), 32));
    const cek = Buffer.from(hkdfSync("sha256", ikm, sal, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
    const nonce = Buffer.from(hkdfSync("sha256", ikm, sal, Buffer.from("Content-Encoding: nonce\0"), 12));
    const d = createDecipheriv("aes-128-gcm", cek, nonce);
    d.setAuthTag(datos.subarray(datos.length - 16));
    const plano = Buffer.concat([d.update(datos.subarray(0, datos.length - 16)), d.final()]);
    expect(plano[plano.length - 1]).toBe(2);
    expect(JSON.parse(plano.subarray(0, -1).toString())).toEqual({ titulo: "Hola", cuerpo: "Café" });
  });
});
