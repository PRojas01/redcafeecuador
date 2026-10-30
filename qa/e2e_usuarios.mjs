// Pruebas de extremo a extremo desde la perspectiva de las personas usuarias.
//   node qa/e2e_usuarios.mjs <url_base_local> <salida_dir>
// Solo instancias locales con data/ sintético. Cada paso registra: ok, ms, nota.
import { chromium } from "playwright";
import fs from "node:fs";

const [, , BASE, OUT] = process.argv;
if (!/127\.0\.0\.1|localhost/.test(BASE)) { console.error("Solo local"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const SUF = Date.now().toString(36).slice(-5);
const PASS = "Prueba-" + SUF + "-ok";
const pasos = [];
let n = 0;

async function paso(page, nombre, fn) {
  const t0 = Date.now(); n++;
  try {
    const nota = await fn();
    pasos.push({ n, nombre, ok: true, ms: Date.now() - t0, nota: nota || "" });
  } catch (e) {
    const shot = `${OUT}/fallo-${String(n).padStart(2, "0")}.png`;
    try { await page.screenshot({ path: shot, fullPage: true }); } catch {}
    pasos.push({ n, nombre, ok: false, ms: Date.now() - t0, nota: String(e.message).split("\n")[0].slice(0, 180), captura: shot });
  }
}

const browser = await chromium.launch();

async function registrarDesdePortada(ctx, persona) {
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 100)));
  await paso(page, `${persona.etiqueta}: entra a la portada`, async () => {
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(1500);
  });
  await paso(page, `${persona.etiqueta}: pulsa el botón principal del hero («Registrarse»)`, async () => {
    await page.getByRole("link", { name: /^Registrarse$/i }).first().click();
    await page.waitForURL(/afiliate/, { timeout: 10000 });
  });
  await paso(page, `${persona.etiqueta}: elige su perfil (${persona.perfil})`, async () => {
    await page.waitForTimeout(1200);
    // Como una persona: pulsa «Elegir» en la tarjeta cuya descripción es la suya.
    // (Productor ya viene marcado; si es su perfil, no toca nada.)
    if (persona.descripcion) {
      // Clic REAL de ratón (como una persona) en el «Elegir» de su tarjeta.
      const idx = await page.evaluate((d) => [...document.querySelectorAll("button")].filter((x) => x.textContent.trim() === "Elegir")
        .findIndex((x) => { let c = x.parentElement; for (let i = 0; i < 6 && c; i++) { if (c.textContent.includes(d) && c.querySelectorAll("button").length <= 3) return true; c = c.parentElement; } return false; }), persona.descripcion);
      if (idx < 0) throw new Error("no encontré la tarjeta " + persona.perfil);
      const b = page.getByRole("button", { name: /^Elegir$/ }).nth(idx);
      await b.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
      await b.click();
      await page.waitForTimeout(500);
    }
    const cont = await page.getByRole("button", { name: /Continuar con/ }).first().textContent();
    await page.getByRole("button", { name: /Continuar con/ }).first().click();
    await page.locator("#af-nombre").first().waitFor({ timeout: 8000 });
    return cont.trim();
  });
  await paso(page, `${persona.etiqueta}: completa el formulario`, async () => {
    await page.locator("#af-nombre, [name=af-nombre]").first().fill(persona.nombre);
    await page.locator("#af-email, [name=af-email]").first().fill(persona.email);
    await page.locator("#af-pass, [name=af-pass]").first().fill(PASS);
    await page.locator("#af-whatsapp, [name=af-whatsapp]").first().fill(persona.tel);
    await page.locator("#af-provincia, [name=af-provincia]").first().selectOption({ label: persona.provincia });
    await page.locator("input[name=visibilidad]").first().check();
    const casillas = page.locator('input[type=checkbox]');
    await casillas.first().check();
    return `campos obligatorios: ${await page.locator("input[required], select[required]").count()}`;
  });
  await paso(page, `${persona.etiqueta}: envía («Revisar y listo»)`, async () => {
    const enviar = page.getByRole("button", { name: /Revisar y listo/i }).first();
    await enviar.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForTimeout(900);
    // En móvil la capa lo vuelve botón fijo abajo y salta entre fijo/en línea
    // (comportamiento previo, igual en la publicada): se pulsa donde quede.
    await enviar.evaluate((e) => e.click());
    await page.waitForTimeout(1500);
    // Puede haber una pantalla de revisión con confirmación final.
    const confirmar = page.getByRole("button", { name: /Crear (mi )?(perfil|cuenta)|Confirmar|Registrarme|Unirme|Listo/i });
    if (await confirmar.count()) { await confirmar.first().click().catch(() => {}); }
    await page.waitForFunction(() => /panel|bienvenida/.test(location.href) || /Ya formas parte|bienvenid/i.test(document.body.innerText), null, { timeout: 15000 });
    return "llega a: " + new URL(page.url()).pathname;
  });
  await paso(page, `${persona.etiqueta}: queda con sesión iniciada`, async () => {
    const r = await page.evaluate(async () => (await (await fetch("/api/auth.php?action=me", { credentials: "include" })).json()));
    const u = r.data && r.data.user;
    if (!u || u.email !== undefined && !u.email) throw new Error("sin sesión tras registrarse");
    if (persona.rolEsperado && u.rol !== persona.rolEsperado) throw new Error(`quedó con rol ${u.rol}, eligió ${persona.rolEsperado}`);
    return `rol ${u.rol} · roles ${JSON.stringify(u.roles)} · ${u.provincia || ""}`;
  });
  persona.errores = errores;
  return page;
}

// ---- Persona 1: productora (vende café) ----
const P = { etiqueta: "Productora", perfil: "Productor", descripcion: "", nombre: "Lucía Prueba Vera", email: `lucia.${SUF}@ejemplo.test`, tel: "0991112233", provincia: "Loja", rolEsperado: "productor" };
const ctxP = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pageP = await registrarDesdePortada(ctxP, P);

// ---- Persona 2: comprador (compra café, servicios y cursos) ----
const C = { etiqueta: "Comprador", perfil: "Comprador", descripcion: "Compro café para mi cafetería", nombre: "Mateo Prueba Ríos", email: `mateo.${SUF}@ejemplo.test`, tel: "0994445566", provincia: "Pichincha", rolEsperado: "comprador" };
const ctxC = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const pageC = await registrarDesdePortada(ctxC, C);

fs.writeFileSync(`${OUT}/estado.json`, JSON.stringify({ SUF, PASS, P: { email: P.email }, C: { email: C.email } }, null, 1));
fs.writeFileSync(`${OUT}/pasos-registro.json`, JSON.stringify({ pasos, erroresJS: { P: P.errores, C: C.errores } }, null, 1));
await browser.close();
for (const p of pasos) console.log(`${p.ok ? "✔" : "✘"} ${String(p.n).padStart(2)} ${p.nombre} (${(p.ms / 1000).toFixed(1)}s) ${p.nota}${p.captura ? " → " + p.captura : ""}`);
console.log("errores JS:", JSON.stringify({ P: P.errores, C: C.errores }));
