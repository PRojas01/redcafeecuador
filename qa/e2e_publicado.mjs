// Prueba de extremo a extremo del SITIO PUBLICADO (vista previa o dominio), con
// cuentas de prueba que se borran al final (baja voluntaria = borra todo lo suyo).
//   node qa/e2e_publicado.mjs https://<sitio> <carpeta-salida>
// Privacidad: no lee ni guarda datos de miembros reales; solo cuenta elementos
// públicos y trabaja con lo que crean sus propias cuentas (correo @ejemplo.test).
// Nunca pide un lote o servicio de otra persona: solo los de sus cuentas de prueba.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pw = await import(process.env.PLAYWRIGHT ?? "playwright").catch(() => import("/opt/node-tools/node_modules/playwright/index.mjs"));
const chromium = pw.chromium ?? pw.default.chromium;
const [, , BASE_ARG, OUT = "e2e-publicado"] = process.argv;
if (!BASE_ARG) { console.error("Uso: node qa/e2e_publicado.mjs https://<sitio> <salida>"); process.exit(2); }
const BASE = BASE_ARG.replace(/\/$/, "");
fs.mkdirSync(OUT, { recursive: true });
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SUF = Date.now().toString(36).slice(-6);
const PASS = "Prueba-" + SUF + "-Ok9";
const MARCA = "PRUEBA AUTOMÁTICA " + SUF;
const pasos = [];
const errJS = [];
let n = 0;

async function paso(page, nombre, fn) {
  const t0 = Date.now(); n++;
  try {
    const nota = await fn();
    pasos.push({ n, nombre, ok: true, ms: Date.now() - t0, nota: nota || "" });
  } catch (e) {
    const shot = `${OUT}/fallo-${String(n).padStart(2, "0")}.png`;
    try { await page.screenshot({ path: shot, fullPage: true }); } catch {}
    pasos.push({ n, nombre, ok: false, ms: Date.now() - t0, nota: String(e.message).split("\n")[0].slice(0, 200), captura: shot });
  }
  const p = pasos[pasos.length - 1];
  console.log(`${p.ok ? "✔" : "✘"} ${String(p.n).padStart(2)} ${p.nombre} (${(p.ms / 1000).toFixed(1)}s) ${p.nota}`);
}
const api = (page, u, d) => page.evaluate(async ([u, d]) => {
  const r = await fetch(u, { signal: AbortSignal.timeout(30000), method: d ? "POST" : "GET", credentials: "include", headers: { "Content-Type": "application/json" }, body: d ? JSON.stringify(d) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { st: r.status, ok: !!j?.ok, data: j?.data, error: j?.error };
}, [u, d]);
const exige = (r, que) => { if (!r.ok) throw new Error(`${que}: HTTP ${r.st} ${r.error ?? ""}`); return r; };

const browser = await chromium.launch();

// ---------- 1. Recorrido público: todas las rutas ----------
const rutas = fs.readFileSync(path.join(raiz, "plataforma_cafe/herramientas/rutas.txt"), "utf8")
  .split(/\r?\n/).map((r) => r.trim()).filter(Boolean).map((r) => (r === "/./" ? "/" : r));
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await paso(page, "Versión publicada", async () => {
    const r = await page.goto(BASE + "/redcafe-version.json");
    const v = JSON.parse(await r.text());
    return `${v.version}`;
  });
  if (!pasos[0].ok) { console.error("El sitio no responde: se detiene sin crear cuentas."); await browser.close(); process.exit(1); }
  const malas = [];
  let conErr = 0;
  await paso(page, `Recorrido de ${rutas.length} páginas (móvil): responden y sin errores JS`, async () => {
    for (const r of rutas) {
      const errs = [];
      const h = (e) => errs.push(String(e.message).slice(0, 120));
      page.on("pageerror", h);
      const resp = await page.goto(BASE + r, { waitUntil: "load", timeout: 30000 }).catch((e) => ({ status: () => "ERR " + e.message.slice(0, 40) }));
      await page.waitForTimeout(700);
      page.off("pageerror", h);
      const st = resp?.status?.();
      if (st !== 200) malas.push(`${r} → ${st}`);
      if (errs.length) { conErr++; errJS.push({ ruta: r, errs }); }
    }
    if (malas.length) throw new Error("no responden: " + malas.slice(0, 8).join(", "));
    return `${rutas.length} OK · páginas con error JS: ${conErr}`;
  });
  await ctx.close();
}

// ---------- 2. Registro desde la portada, como una persona ----------
async function registrar(ctx, persona) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errJS.push({ ruta: persona.etiqueta, errs: [String(e.message).slice(0, 120)] }));
  await paso(page, `${persona.etiqueta}: portada → «Crear cuenta gratis»`, async () => {
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.getByRole("link", { name: /^(Registrarse|Crear cuenta gratis)$/i }).first().click();
    await page.waitForURL(/afiliate/, { timeout: 15000 });
  });
  await paso(page, `${persona.etiqueta}: elige su perfil (${persona.perfil})`, async () => {
    await page.waitForTimeout(1500);
    if (persona.descripcion) {
      const idx = await page.evaluate((d) => [...document.querySelectorAll("button")].filter((x) => x.textContent.trim() === "Elegir")
        .findIndex((x) => { let c = x.parentElement; for (let i = 0; i < 6 && c; i++) { if (c.textContent.includes(d) && c.querySelectorAll("button").length <= 3) return true; c = c.parentElement; } return false; }), persona.descripcion);
      if (idx < 0) throw new Error("no encontré la tarjeta " + persona.perfil);
      const b = page.getByRole("button", { name: /^Elegir$/ }).nth(idx);
      await b.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
      await b.click();
      await page.waitForTimeout(500);
    }
    await page.getByRole("button", { name: /Continuar con/ }).first().click();
    await page.locator("#af-nombre").first().waitFor({ timeout: 10000 });
  });
  await paso(page, `${persona.etiqueta}: completa el formulario y envía`, async () => {
    await page.locator("#af-nombre, [name=af-nombre]").first().fill(persona.nombre);
    await page.locator("#af-email, [name=af-email]").first().fill(persona.email);
    await page.locator("#af-pass, [name=af-pass]").first().fill(PASS);
    await page.locator("#af-whatsapp, [name=af-whatsapp]").first().fill(persona.tel);
    await page.locator("#af-provincia, [name=af-provincia]").first().selectOption({ label: persona.provincia });
    // Perfil NO visible en el directorio, para que la cuenta de prueba no se vea.
    const vis = page.locator("input[name=visibilidad]");
    await (await vis.count() > 1 ? vis.last() : vis.first()).check();
    const casillas = page.locator("input[type=checkbox]");
    for (let i = 0; i < await casillas.count(); i++) {
      const c = casillas.nth(i);
      const req = await c.evaluate((e) => e.required || /t[eé]rminos|privacidad|uso de datos/i.test(e.closest("label")?.textContent ?? ""));
      if (req) await c.check();
    }
    const enviar = page.getByRole("button", { name: /Revisar y listo/i }).first();
    await enviar.evaluate((e) => { e.scrollIntoView({ block: "center", behavior: "instant" }); e.click(); });
    await page.waitForTimeout(1500);
    const confirmar = page.getByRole("button", { name: /Crear (mi )?(perfil|cuenta)|Confirmar|Registrarme|Unirme|Listo/i }).locator("visible=true");
    if (await confirmar.count()) await confirmar.first().click({ timeout: 8000 });
    await page.waitForFunction(() => /panel|bienvenida/.test(location.href) || /Ya formas parte|bienvenid/i.test(document.body.innerText), null, { timeout: 20000 });
    return "llega a " + new URL(page.url()).pathname;
  });
  await paso(page, `${persona.etiqueta}: queda con sesión`, async () => {
    const r = exige(await api(page, "/api/auth.php?action=me"), "me");
    if (!r.data?.user) throw new Error("sin sesión");
    persona.id = r.data.user.id;
    return `rol ${r.data.user.rol}`;
  });
  return page;
}

const P = { etiqueta: "Productora", perfil: "Productor", descripcion: "", nombre: `Prueba Productora ${SUF}`, email: `prueba.productora.${SUF}@ejemplo.test`, tel: "0990000001", provincia: "Loja" };
const C = { etiqueta: "Comprador", perfil: "Comprador", descripcion: "Compro café para mi cafetería", nombre: `Prueba Comprador ${SUF}`, email: `prueba.comprador.${SUF}@ejemplo.test`, tel: "0990000002", provincia: "Pichincha" };
const ctxP = await browser.newContext({ viewport: { width: 390, height: 844 } });
const ctxC = await browser.newContext({ viewport: { width: 1280, height: 900 } });
let pP, pC;
const T = { lote: `Finca ${MARCA}`, serv: `Servicio ${MARCA}`, req: `Busco café ${MARCA}`, emp: `Empleo ${MARCA}`, busco: `Busco trabajo ${MARCA}` };
const DESC = "Publicación de prueba automática; se borra sola en unos minutos.";
let loteId = "", nroPedido = 0;

try {
  const uiP = await registrar(ctxP, P);
  const uiC = await registrar(ctxC, C);
  // Las llamadas a la API van en una pestaña quieta, aparte de la que navega.
  pP = await ctxP.newPage(); await pP.goto(BASE + "/redcafe-version.json");
  pC = await ctxC.newPage(); await pC.goto(BASE + "/redcafe-version.json");
  pP.ui = uiP; pC.ui = uiC;

  // ---------- 3. Servicios de quien vende ----------
  await paso(pP, "Productora: publica un lote", async () => {
    const r = exige(await api(pP, "/api/lotes.php?action=publish", { acepta_derechos: true, finca: T.lote, provincia: "Loja", variedad: "Typica", proceso: "Lavado", precioSaco: 240, pesoSacoLb: 100, stockSacos: 10 }), "publicar lote");
    loteId = r.data?.lote?.id ?? r.data?.id ?? "";
    if (!loteId) { const m = await api(pP, "/api/lotes.php?action=mine"); loteId = (JSON.stringify(m.data).match(/"id":"([^"]+)"[^}]*?Finca PRUEBA/) || [])[1] ?? ""; }
    return loteId ? "lote " + loteId : "publicado";
  });
  await paso(pP, "El lote aparece en el listado público", async () => {
    const r = exige(await api(pC, "/api/lotes.php?action=list"), "listar");
    if (!JSON.stringify(r.data).includes(T.lote)) throw new Error("no aparece");
    const l = (r.data?.lotes ?? r.data ?? []).find?.((x) => x.finca === T.lote);
    if (l?.id) loteId = l.id;
    return `${(r.data?.lotes ?? r.data ?? []).length} lotes públicos`;
  });
  await paso(pP, "Publica servicio, empleo y «busco empleo» (productora) y requerimiento (comprador)", async () => {
    exige(await api(pP, "/api/marketplace-servicios.php?action=publish", { acepta_derechos: true, titulo: T.serv, descripcion: DESC, categoria: "asesoria", precio: 30, unidad: "hora", provincia: "Loja", cobertura: "Loja", visibilidad: "publico" }), "servicio");
    exige(await api(pC, "/api/requerimientos.php?action=publish", { acepta_derechos: true, titulo: T.req, descripcion: DESC, cantidad: 20, unidad: "quintales", provincia: "Loja", tipo: "verde", proceso: "lavado", contactoPreferido: "plataforma" }), "requerimiento");
    exige(await api(pP, "/api/empleos.php?action=publish", { acepta_derechos: true, titulo: T.emp, descripcion: DESC, empresa: "Finca de prueba", provincia: "Loja", categoria: "calidad-catacion", modalidad: "presencial", jornada: "tiempo-completo", vacantes: 1, contactoPreferido: "plataforma", salarioPeriodo: "mes", experiencia: "sin-experiencia" }), "empleo");
    exige(await api(pP, "/api/busco-empleo.php?action=publish", { acepta_derechos: true, titulo: T.busco, descripcion: DESC, categoria: "calidad-catacion", provincia: "Loja", modalidad: "presencial", jornada: "tiempo-completo", disponibilidad: "inmediata", experiencia: "1-2-anios", contactoPreferido: "plataforma" }), "busco empleo");
    return "4 publicaciones";
  });
  await paso(pP, "Productora: ve sus publicaciones en el panel", async () => {
    const ui = pP.ui;
    await ui.goto(BASE + "/panel/", { waitUntil: "load" }); await ui.waitForTimeout(3000);
    const txt = await ui.evaluate(() => document.body.innerText);
    if (!txt.includes(P.nombre.split(" ")[0])) throw new Error("el panel no carga la cuenta");
    const mios = exige(await api(pP, "/api/lotes.php?action=mine"), "mis lotes");
    if (!JSON.stringify(mios.data).includes(T.lote)) throw new Error("su lote no está en «mis lotes»");
    return "panel y «mis lotes» OK";
  });
  await paso(pP, "Comunidad: publica y comenta", async () => {
    const r = exige(await api(pP, "/api/comunidad.php?action=create", { acepta_derechos: true, titulo: "Pregunta " + MARCA, text: "Prueba automática, se borra sola." }), "publicar");
    const id = r.data?.post?.id;
    exige(await api(pC, "/api/comunidad.php?action=comment", { acepta_derechos: true, id, text: "Comentario " + MARCA }), "comentar");
    return "publicación + comentario";
  });

  // ---------- 4. Servicios de quien compra ----------
  await paso(pC, "Comprador: ve la ficha del lote en el Marketplace", async () => {
    const ui = pC.ui;
    await ui.goto(BASE + "/marketplace/", { waitUntil: "load" }); await ui.waitForTimeout(2500);
    if (loteId) { await ui.goto(BASE + "/marketplace/" + encodeURIComponent(loteId) + "/", { waitUntil: "load" }); await ui.waitForTimeout(2500); }
    const txt = await ui.evaluate(() => document.body.innerText);
    if (loteId && !txt.includes("Typica")) throw new Error("la ficha no muestra el lote");
    return "ficha OK";
  });
  await paso(pC, "Comprador: hace un pedido del lote de prueba", async () => {
    if (!loteId) throw new Error("sin id de lote");
    const r = exige(await api(pC, "/api/pedidos.php?action=create", { loteId, sacos: 1, total: 240, aviso_aceptado: true, acepta_condiciones: true }), "pedido");
    nroPedido = r.data?.pedido?.nro ?? 0;
    return "pedido #" + nroPedido;
  });
  await paso(pP, "Productora: recibe el pedido", async () => {
    const r = exige(await api(pP, "/api/pedidos.php?action=list"), "pedidos");
    if (!JSON.stringify(r.data).includes(String(nroPedido))) throw new Error("no le llega");
    const notif = await api(pP, "/api/notificaciones.php?action=list");
    return `aviso en campana: ${notif.ok ? "sí" : "no"}`;
  });
  await paso(pC, "Comprador: cancela su pedido", async () => {
    exige(await api(pC, "/api/pedidos.php?action=cancelar", { nro: nroPedido, motivo: "Prueba automática" }), "cancelar");
  });
  await paso(pC, "Academia: lista de cursos y un curso abren", async () => {
    const r = exige(await api(pC, "/api/cursos.php?action=list"), "cursos");
    const cursos = r.data?.cursos ?? [];
    await pC.ui.goto(BASE + "/academia/", { waitUntil: "load" }); await pC.ui.waitForTimeout(2000);
    return `${cursos.length} cursos`;
  });
  await paso(pC, "Precios, servicios y recetas abren", async () => {
    for (const r of ["/servicios/precios/", "/marketplace/?ver=servicios", "/recetas/", "/comunidad/", "/bar/"]) {
      const resp = await pC.ui.goto(BASE + r, { waitUntil: "load" });
      if (resp.status() !== 200) throw new Error(r + " → " + resp.status());
    }
    return "5 páginas";
  });
} finally {
  // ---------- 5. Limpieza: baja de las dos cuentas (borra todo lo suyo) ----------
  for (const [ctx, persona, pg] of [[ctxC, C, pC], [ctxP, P, pP]]) {
    const page = pg ?? await ctx.newPage();
    if (!pg) await page.goto(BASE + "/redcafe-version.json").catch(() => {});
    let r = await api(page, "/api/auth.php?action=me").catch(() => ({}));
    if (!r.data?.user) r = await api(page, "/api/auth.php?action=login", { email: persona.email, pass: PASS }).catch(() => ({}));
    if (!r.ok && !r.data?.user) { console.log(`· ${persona.etiqueta}: no hay cuenta que borrar`); continue; }
    await paso(page, `${persona.etiqueta}: cierra su cuenta (borra sus datos)`, async () => {
      if (nroPedido) await api(page, "/api/pedidos.php?action=cancelar", { nro: nroPedido, motivo: "Prueba automática" });
      const b = exige(await api(page, "/api/moderacion.php?action=baja", { pass: PASS, confirmacion: "ELIMINAR", motivo: "Prueba automática" }), "baja");
      return "eliminado: " + JSON.stringify(b.data?.eliminado ?? {}).slice(0, 120);
    });
  }
  const anon = await (await browser.newContext()).newPage();
  await paso(anon, "Nada de la prueba queda publicado", async () => {
    await anon.goto(BASE + "/", { waitUntil: "load" });
    const quedan = [];
    for (const u of ["/api/lotes.php?action=list", "/api/comunidad.php?action=list"]) {
      const r = await api(anon, u);
      if (JSON.stringify(r.data ?? "").includes(SUF)) quedan.push(u);
    }
    if (quedan.length) throw new Error("siguen datos de prueba en " + quedan.join(", "));
    return "limpio";
  });
  await browser.close();
  const ok = pasos.filter((p) => p.ok).length;
  fs.writeFileSync(`${OUT}/resultado.json`, JSON.stringify({ base: BASE, fecha: new Date().toISOString(), ok, total: pasos.length, pasos, errJS }, null, 1));
  console.log(`\n${ok}/${pasos.length} pasos correctos · páginas con error JS: ${errJS.length}`);
  if (errJS.length) console.log(JSON.stringify(errJS.slice(0, 10), null, 1));
}
