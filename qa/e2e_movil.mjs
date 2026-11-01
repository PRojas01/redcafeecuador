// E2E en MÓVIL (390×844, táctil) desde la perspectiva de vendedora y comprador.
//   node qa/e2e_movil.mjs <url_local> <salida_dir>
// Solo instancias locales con datos sintéticos. Cuentas nuevas en cada corrida.
import { chromium } from "playwright";
import fs from "node:fs";

const [, , BASE, OUT] = process.argv;
if (!/127\.0\.0\.1|localhost/.test(BASE)) { console.error("Solo local"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const SUF = Date.now().toString(36).slice(-5);
const PASS = "Prueba-" + SUF + "-ok";
const FINCA = "Finca Movil " + SUF;
globalThis.FINCA_G = FINCA;
const SERVICIO = "Secado solar " + SUF;
const pasos = [], movil = {};
let n = 0;

async function paso(page, nombre, fn) {
  const t0 = Date.now(); n++;
  try { const nota = await fn(); pasos.push({ n, nombre, ok: true, ms: Date.now() - t0, nota: nota || "" }); return true; }
  catch (e) {
    const shot = `${OUT}/fallo-${String(n).padStart(2, "0")}.png`;
    try { await page.screenshot({ path: shot, fullPage: true }); } catch {}
    pasos.push({ n, nombre, ok: false, ms: Date.now() - t0, nota: String(e.message).split("\n")[0].slice(0, 170), captura: shot });
    return false;
  }
}

// Chequeo de vista móvil de la pantalla actual.
async function revisarMovil(page, etiqueta) {
  const r = await page.evaluate(() => {
    const W = innerWidth;
    const desborde = document.documentElement.scrollWidth > W + 1;
    const vis = (e) => { const b = e.getBoundingClientRect(); if (b.width < 1 || b.height < 1) return false; let q = e; while (q) { const s = getComputedStyle(q); if (s.display === "none" || s.visibility === "hidden") return false; q = q.parentElement; } return true; };
    const toques = [...document.querySelectorAll("a, button, input, select, textarea")].filter(vis)
      .filter((e) => { const b = e.getBoundingClientRect(); return (b.height < 32 || b.width < 32) && !e.closest("p, li") && e.type !== "hidden" && e.type !== "checkbox" && e.type !== "radio"; })
      .map((e) => (e.textContent || e.getAttribute("aria-label") || e.placeholder || e.tagName).trim().slice(0, 28));
    const diminutos = [...document.querySelectorAll("body *")].filter((e) => e.childNodes.length && [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim().length > 2) && vis(e) && parseFloat(getComputedStyle(e).fontSize) < 11).length;
    const anchos = [...document.querySelectorAll("body *")].filter((e) => vis(e) && e.getBoundingClientRect().right > W + 2 && getComputedStyle(e).position !== "fixed").slice(0, 3).map((e) => e.tagName + "." + String(e.className).slice(0, 40));
    return { desborde, anchos, toques_pequenos: toques.length, ejemplos_toque: [...new Set(toques)].slice(0, 5), textos_menores_11px: diminutos };
  });
  movil[etiqueta] = r;
}

async function login(page, email) {
  await page.goto(BASE + "/login/"); await page.waitForTimeout(1200);
  await page.locator('input[type=email]').first().fill(email);
  await page.locator('input[type=password]').first().fill(PASS);
  await page.getByRole("button", { name: /Continuar|Entrar/i }).first().click();
  await page.waitForFunction(() => /panel/.test(location.pathname), null, { timeout: 15000 });
}

async function registrarApi(ctx, d) {
  const p = await ctx.newPage(); await p.goto(BASE + "/");
  const r = await p.evaluate(async (d) => (await fetch("/api/auth.php?action=register", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })).status, d);
  await p.evaluate(async () => fetch("/api/auth.php?action=logout", { method: "POST", credentials: "include" }));
  await p.close(); return r;
}

const browser = await chromium.launch();
const movilCfg = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const V = { nombre: "Rosa Vendedora", email: `rosa.${SUF}@ejemplo.test`, pass: PASS, rol: "productor", roles: ["productor", "asesor"], provincia: "Loja", telefono: "0991234567", acepta_terminos: true, acepta_privacidad: true, acepta_uso_datos: true };
const C = { nombre: "Pablo Comprador", email: `pablo.${SUF}@ejemplo.test`, pass: PASS, rol: "comprador", roles: ["comprador"], provincia: "Pichincha", acepta_terminos: true, acepta_privacidad: true, acepta_uso_datos: true };
const ctxV = await browser.newContext(movilCfg); const ctxC = await browser.newContext(movilCfg);
await registrarApi(ctxV, V); await registrarApi(ctxC, C);
const pv = await ctxV.newPage(); const pc = await ctxC.newPage();
const errJS = []; for (const p of [pv, pc]) p.on("pageerror", (e) => errJS.push(new URL(p.url()).pathname + " :: " + e.message.slice(0, 60)));
let loteId = "";

// ───────────── VENDEDORA ─────────────
await paso(pv, "Vendedora: inicia sesión desde el móvil", async () => { await login(pv, V.email); await revisarMovil(pv, "panel"); return new URL(pv.url()).pathname; });

await paso(pv, "Vendedora: abre «Publicar lote» desde el panel", async () => {
  await pv.goto(BASE + "/panel/?ver=publicar"); await pv.waitForTimeout(2500);
  await pv.getByLabel(/Finca \/ nombre del producto/).first().waitFor({ timeout: 8000 });
  await revisarMovil(pv, "publicar lote");
});
await paso(pv, "Vendedora: completa la ficha del lote (incluye ubicación para el mapa)", async () => {
  await pv.getByLabel(/Finca \/ nombre del producto/).first().fill(FINCA);
  await pv.getByLabel(/^Provincia/).first().selectOption({ label: "Loja" });
  await pv.getByLabel(/^Variedad/).first().fill("Typica");
  await pv.getByLabel(/^Proceso/).first().selectOption({ label: "Lavado" });
  await pv.getByLabel(/Altura \(msnm\)/).first().fill("1750");
  await pv.getByLabel(/Precio por saco/).first().fill("240");
  await pv.getByLabel(/Peso del saco/).first().fill("100");
  await pv.getByLabel(/Sacos disponibles/).first().fill("15");
  await pv.getByLabel(/^Descripción/).first().fill("Lote de prueba para el recorrido móvil.");
  await pv.getByLabel(/^Latitud/).first().fill("-4.2606");
  await pv.getByLabel(/^Longitud/).first().fill("-79.2233");
});
await paso(pv, "Vendedora: publica el lote", async () => {
  const b = pv.getByRole("button", { name: /Publicar lote de café/ }).first();
  await b.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await b.click();
  await pv.waitForTimeout(3000);
  const r = await pv.evaluate(async (f) => { const j = await (await fetch("/api/lotes.php?action=mine", { credentials: "include" })).json(); const l = ((j.data && j.data.lotes) || []).find((x) => x.finca === f); return l ? l.id : ""; }, FINCA);
  if (!r) throw new Error("el lote no quedó guardado");
  loteId = r; return "lote " + r;
});
await paso(pv, "Vendedora: ve su lote en «Mis publicaciones»", async () => {
  await pv.goto(BASE + "/panel/"); await pv.waitForTimeout(3000);
  const txt = await pv.evaluate(() => document.body.innerText);
  if (!txt.includes(FINCA)) {
    const ab = pv.getByRole("button", { name: /Abrir lotes y servicios que has publicad/ }).first();
    if (await ab.count()) { await ab.click(); await pv.waitForTimeout(800); }
  }
  if (!(await pv.evaluate((f) => document.body.innerText.includes(f), FINCA))) throw new Error("no aparece en el panel");
});
await paso(pv, "Lote visible en el marketplace", async () => {
  await pv.goto(BASE + "/marketplace/"); await pv.waitForTimeout(3500);
  await revisarMovil(pv, "marketplace");
  if (!(await pv.evaluate((f) => document.body.innerText.includes(f), FINCA))) throw new Error("no aparece en el listado");
});
await paso(pv, "Lote con marcador en el mapa del marketplace", async () => {
  const n = await pv.evaluate(() => document.querySelectorAll(".leaflet-marker-icon, .redcafe-map-pin, .leaflet-interactive").length);
  if (!n) throw new Error("mapa sin marcadores");
  return n + " marcadores";
});
await paso(pv, "Ficha pública del lote en móvil", async () => {
  await pv.goto(BASE + "/marketplace/" + loteId + "/"); await pv.waitForTimeout(3500);
  await revisarMovil(pv, "ficha de lote");
  if (!(await pv.evaluate((f) => document.body.innerText.includes(f), FINCA))) throw new Error("la ficha no muestra el lote");
});
await paso(pv, "Vendedora: edita el lote (precio 240 → 255)", async () => {
  await pv.goto(BASE + "/panel/"); await pv.waitForTimeout(3000);
  const ab = pv.getByRole("button", { name: /Abrir lotes y servicios que has publicad/ }).first();
  if (await ab.count()) { await ab.click(); await pv.waitForTimeout(800); }
  const editar = pv.locator("button, a").filter({ hasText: /^Editar/ }).first();
  await editar.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await editar.click(); await pv.waitForTimeout(1500);
  const precio = pv.getByLabel(/Precio por saco/).first();
  await precio.fill("255");
  const guardar = pv.getByRole("button", { name: /Guardar|Actualizar|Publicar/ }).first();
  await guardar.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await guardar.click(); await pv.waitForTimeout(2500);
  const v = await pv.evaluate(async (id) => { const j = await (await fetch("/api/lotes.php?action=mine", { credentials: "include" })).json(); const l = ((j.data && j.data.lotes) || []).find((x) => x.id === id); return l && l.precioSaco; }, loteId);
  if (String(v) !== "255") throw new Error("precio guardado: " + v);
  await revisarMovil(pv, "editar lote");
});
await paso(pv, "Vendedora: publica un servicio", async () => {
  await pv.goto(BASE + "/panel/?ver=publicar_servicio"); await pv.waitForTimeout(3000);
  await revisarMovil(pv, "publicar servicio");
  // Formulario visible (hoy lo pinta la capa; el de React está oculto → fase 4 de la migración).
  const f = pv.locator("#redcafe-publicar-servicio-completo");
  await f.waitFor({ timeout: 8000 });
  const campos = await f.evaluate((el) => [...el.querySelectorAll("input,select,textarea")].map((c) => ({ tag: c.tagName, type: c.type, ph: c.placeholder || "", lab: (c.closest("label")?.innerText || "").split("\n")[0].slice(0, 40), req: c.required })));
  for (const [i, c] of campos.entries()) {
    const loc = f.locator("input,select,textarea").nth(i);
    if (c.type === "file" || c.type === "checkbox" || c.type === "radio" || c.type === "hidden") continue;
    const k = (c.lab + " " + c.ph).toLowerCase();
    if (c.tag === "SELECT") { await loc.selectOption({ index: 1 }).catch(() => {}); continue; }
    const v = /nombre|título/.test(k) ? SERVICIO : /precio/.test(k) ? "30" : /provincia/.test(k) ? "Loja" : /cobertura/.test(k) ? "Loja y Zamora" : /unidad/.test(k) ? "hora" : /descr|incluye/.test(k) ? "Servicio de prueba del recorrido móvil, con detalle suficiente." : /tel|whats/.test(k) ? "0991234567" : c.req ? "Dato de prueba" : null;
    if (v !== null) await loc.fill(v).catch(() => {});
  }
  const b = f.getByRole("button", { name: /Publicar/ }).last();
  await b.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await b.click(); await pv.waitForTimeout(2500);
  const ok = await pv.evaluate(async (s) => JSON.stringify(await (await fetch("/api/marketplace-servicios.php?action=list", { credentials: "include" })).json()).includes(s), SERVICIO);
  if (!ok) throw new Error("el servicio no quedó publicado");
});

// ───────────── COMPRADOR ─────────────
await paso(pc, "Comprador: inicia sesión desde el móvil", async () => { await login(pc, C.email); });
await paso(pc, "Comprador: filtra el marketplace por provincia (Loja)", async () => {
  await pc.goto(BASE + "/marketplace/"); await pc.waitForTimeout(3500);
  await pc.getByRole("button", { name: /^Filtros/ }).first().click(); await pc.waitForTimeout(600);
  const sel = pc.locator("select").filter({ has: pc.locator("option", { hasText: "Zamora Chinchipe" }) });
  const n = await sel.count(); let usado = false;
  for (let i = 0; i < n; i++) { const s = sel.nth(i); if (await s.isVisible()) { await s.selectOption({ label: "Loja" }); usado = true; break; } }
  if (!usado) throw new Error("tras pulsar «Filtros» no aparece un selector de provincia visible (" + n + " ocultos)");
  await pc.waitForTimeout(1200);
  await revisarMovil(pc, "marketplace con filtros");
  const t = await pc.evaluate(() => document.body.innerText);
  if (!t.includes(globalThis.FINCA_G)) throw new Error("el filtro oculta el lote");
  if (/Finca La Esperanza/.test(t) && !/Loja/.test(t)) throw new Error("el filtro no filtra");
});
await paso(pc, "Comprador: abre la ficha y solicita el lote", async () => {
  await pc.goto(BASE + "/marketplace/" + loteId + "/"); await pc.waitForTimeout(3500);
  const b = pc.getByRole("button", { name: /Solicitar este lote|Solicitar|Contactar|Hacer pedido/i }).first();
  await b.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await b.click(); await pc.waitForTimeout(1500);
  // Aviso de pedido (desde 20261023a con aceptación expresa por casilla).
  const aviso = pc.locator(".redcafe-avisopago");
  if (await aviso.count()) {
    const casilla = aviso.locator("input[type=checkbox]");
    if (await casilla.count()) await casilla.check();
    await aviso.getByRole("button", { name: /Acepto y envío|Entiendo, enviar/ }).click(); await pc.waitForTimeout(1500);
  }
  const conf = pc.getByRole("button", { name: /Enviar solicitud|Confirmar|Enviar pedido|Solicitar/i });
  if (await conf.count()) { await conf.last().click().catch(() => {}); await pc.waitForTimeout(2000); }
  const n = await pc.evaluate(async (id) => JSON.stringify(await (await fetch("/api/pedidos.php?action=list&rol=comprador", { credentials: "include" })).json()).includes(id), loteId);
  if (!n) throw new Error("no se creó el pedido");
});
await paso(pv, "Vendedora: recibe el pedido en su panel y en la campana", async () => {
  await pv.goto(BASE + "/panel/"); await pv.waitForTimeout(3000);
  const n = await pv.evaluate(async (id) => JSON.stringify(await (await fetch("/api/pedidos.php?action=list&rol=productor", { credentials: "include" })).json()).includes(id), loteId);
  const notis = await pv.evaluate(async () => { const j = await (await fetch("/api/notificaciones.php?action=list", { credentials: "include" })).json(); return JSON.stringify(j).includes("Nuevo pedido"); });
  if (!n) throw new Error("el pedido no le llega"); if (!notis) throw new Error("sin aviso en la campana");
});
await paso(pc, "Comprador: ve el servicio de la vendedora en Marketplace › Servicios", async () => {
  await pc.goto(BASE + "/marketplace/"); await pc.waitForTimeout(3500);
  await pc.getByRole("button", { name: /^Servicios$/ }).first().click(); await pc.waitForTimeout(1500);
  await revisarMovil(pc, "marketplace servicios");
  if (!(await pc.evaluate((s) => document.body.innerText.includes(s), SERVICIO))) throw new Error("el servicio no aparece");
});
await paso(pc, "Comprador: entra a un curso y se matricula", async () => {
  await pc.goto(BASE + "/academia/"); await pc.waitForTimeout(3500);
  await revisarMovil(pc, "academia");
  await pc.goto(BASE + "/academia/buenas-practicas/"); await pc.waitForTimeout(4000);
  await revisarMovil(pc, "curso");
  // Con los cursos del servidor (como en producción) la ficha tiene «Empezar gratis»
  // y la matrícula queda en el servidor; sin ellos, se marca la lección en el navegador.
  const emp = pc.getByRole("button", { name: /Empezar gratis/ }).first();
  if (await emp.count()) {
    await emp.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await emp.click(); await pc.waitForTimeout(3000);
    const ins = await pc.evaluate(async () => JSON.stringify(await (await fetch("/api/cursos.php?action=matriculas", { credentials: "include" })).json()));
    if (!/buenas-practicas/.test(ins)) throw new Error("no quedó matriculado: " + ins.slice(0, 160));
    await revisarMovil(pc, "curso matriculado");
    const cb = pc.locator("input[data-completar]").first();
    if (await cb.count()) { await cb.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await cb.check(); await pc.waitForTimeout(2500); }
    const prog = await pc.evaluate(async () => JSON.stringify(await (await fetch("/api/cursos.php?action=matriculas", { credentials: "include" })).json()).match(/"progreso":\s*(\d+)/));
    return "matriculado en el servidor · progreso " + (prog ? prog[1] + "%" : "¿?");
  }
  const m = pc.locator("main button, main a").filter({ hasText: /Manejo del suelo/ }).first();
  await m.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await m.click(); await pc.waitForTimeout(3000);
  await revisarMovil(pc, "lección");
  const botones = await pc.evaluate(() => [...document.querySelectorAll("main button")].filter((b) => b.getBoundingClientRect().height > 0).map((b) => b.textContent.trim().slice(0, 30)).filter((t) => /complet|siguiente|marcar/i.test(t)));
  const c = pc.locator("main button").filter({ hasText: /Marcar como completad|Completar|Siguiente/i }).first();
  if (await c.count()) { await c.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await c.click(); await pc.waitForTimeout(2500); }
  const prog1 = await pc.evaluate(() => [...document.querySelectorAll("main button")].filter((b) => b.textContent.trim().startsWith("✓")).length);
  await pc.reload(); await pc.waitForTimeout(3500);
  const prog2 = await pc.evaluate(() => [...document.querySelectorAll("main button")].filter((b) => b.textContent.trim().startsWith("✓")).length);
  if (!(prog1 > 0)) throw new Error("el avance no sube: " + prog1);
  if (prog2 !== prog1) throw new Error(`el avance no se conserva al recargar (${prog1} → ${prog2} lecciones)`);
  const prog = prog2;
  return "botones de lección: " + JSON.stringify(botones) + " · lecciones completadas " + prog;
});

await browser.close();
fs.writeFileSync(`${OUT}/resultado.json`, JSON.stringify({ pasos, movil, errJS }, null, 1));
for (const p of pasos) console.log(`${p.ok ? "✔" : "✘"} ${String(p.n).padStart(2)} ${p.nombre} (${(p.ms / 1000).toFixed(1)}s) ${p.nota}${p.captura ? " → " + p.captura : ""}`);
console.log("\nVista móvil por pantalla:");
for (const [k, v] of Object.entries(movil)) console.log(`  ${k}: desborde=${v.desborde ? "SÍ " + v.anchos.join(",") : "no"} · toques<32px=${v.toques_pequenos} ${JSON.stringify(v.ejemplos_toque)} · textos<11px=${v.textos_menores_11px}`);
console.log("errores JS:", errJS.length ? errJS : 0);
