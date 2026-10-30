// Recorrido automático de navegador contra una instancia LOCAL.
//   node qa/recorrido.mjs <url_base> <carpeta_sitio> <etiqueta> <salida.json>
// Mide por ruta: errores de consola/JS, fallos de contraste AA y h1 visibles.
// Con sesión (cuenta de prueba local): cabecera, menú móvil y navegación interna.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [, , BASE, SITIO, ETIQ, SALIDA] = process.argv;
if (!/127\.0\.0\.1|localhost/.test(BASE)) { console.error("Solo local"); process.exit(2); }
const cred = JSON.parse(fs.readFileSync(path.join(path.dirname(SITIO), "cuentas-prueba.json"), "utf8")).productora;

function rutas(dir) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (["_next", "data", "uploads", "fonts", "img", "video", "api", "socios"].includes(e.name) && d === dir) continue;
        walk(p);
      } else if (e.name === "index.html") {
        out.push("/" + path.relative(dir, d).split(path.sep).join("/") + (d === dir ? "" : "/"));
      }
    }
  })(dir);
  return out.map((r) => r.replace(/^\/\/$/, "/")).sort();
}

const IGNORAR = [/ServiceWorker/i, /status of 501/i, /favicon/i, /net::ERR_ABORTED/i, /video\//];

const ESCANER = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const mix = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const fondo = (el) => { const c = []; let p = el; while (p) { const s = getComputedStyle(p); if (s.backgroundImage !== "none" && !/gradient/.test(s.backgroundImage)) return null; const k = parse(s.backgroundColor); if (k && k.a > 0) { c.push(k); if (k.a >= 1) break; } p = p.parentElement; } let b = { r: 255, g: 255, b: 255, a: 1 }; for (let i = c.length - 1; i >= 0; i--) b = mix(c[i], b); return b; };
  const fallos = [];
  document.querySelectorAll("body *").forEach((el) => {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (txt.length < 2) return; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    const s = getComputedStyle(el); if (s.visibility === "hidden" || parseFloat(s.opacity) < 0.1) return;
    let p = el; while (p) { if (getComputedStyle(p).display === "none") return; p = p.parentElement; }
    const f0 = parse(s.color), bg = fondo(el); if (!f0 || !bg) return; const fg = mix(f0, bg);
    const a = lum(fg), b = lum(bg); const cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const px = parseFloat(s.fontSize), w = parseInt(s.fontWeight); const min = px >= 24 || (px >= 18.66 && w >= 700) ? 3 : 4.5;
    if (cr < min) fallos.push(`${txt.slice(0, 30)} (${cr.toFixed(2)})`);
  });
  const h1 = [...document.querySelectorAll("h1")].filter((e) => e.getBoundingClientRect().height > 0).length;
  return { fallos, h1 };
};

const res = { etiqueta: ETIQ, base: BASE, anonimo: {}, sesion: {}, movil: {}, navegacion: {} };
const browser = await chromium.launch();

async function visitar(ctx, ruta) {
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push("JS: " + e.message.slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error" && !IGNORAR.some((r) => r.test(m.text()))) errores.push(m.text().slice(0, 160)); });
  let estado = 0;
  try { const r = await page.goto(BASE + ruta, { waitUntil: "load", timeout: 30000 }); estado = r ? r.status() : 0; } catch (e) { errores.push("carga: " + e.message.slice(0, 80)); }
  await page.waitForTimeout(2500);
  let esc = { fallos: [], h1: 0 };
  try { esc = await page.evaluate(ESCANER); } catch {}
  await page.close();
  return { estado, errores, contraste: esc.fallos.slice(0, 8), n_contraste: esc.fallos.length, h1: esc.h1 };
}

// 1) Todas las rutas sin sesión (escritorio).
const anon = await browser.newContext({ viewport: { width: 1280, height: 900 } });
for (const r of rutas(SITIO)) res.anonimo[r] = await visitar(anon, r);
await anon.close();

// 2) Con sesión.
const ses = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p0 = await ses.newPage();
await p0.goto(BASE + "/login/");
const login = await p0.evaluate(async (c) => (await fetch("/api/auth.php?action=login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: c.email, pass: c.pass }) })).status, cred);
res.sesion.login_http = login;
await p0.close();
for (const r of ["/panel/", "/marketplace/", "/comunidad/", "/chat/", "/academia/", "/academia/postcosecha/"]) {
  const v = await visitar(ses, r);
  const pg = await ses.newPage(); await pg.goto(BASE + r); await pg.waitForTimeout(2500);
  v.cabecera = await pg.evaluate(() => [...document.querySelectorAll("header a, header button")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.textContent.trim()).filter((t) => /Salir|Entrar|Mi Red|Forma parte/.test(t)));
  await pg.close();
  res.sesion[r] = v;
}
// 3) Menú móvil con sesión.
const pm = await ses.newPage(); await pm.setViewportSize({ width: 375, height: 812 });
await pm.goto(BASE + "/marketplace/"); await pm.waitForTimeout(2500);
const boton = pm.locator("header button").filter({ hasText: /≡|☰|menú|Menu/i }).first();
try { await boton.click({ timeout: 3000 }); } catch { try { await pm.locator("header button").last().click({ timeout: 3000 }); } catch {} }
await pm.waitForTimeout(800);
res.movil.menu = await pm.evaluate(() => [...document.querySelectorAll("a,button")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && r.bottom > 0; }).map((e) => e.textContent.trim()).filter((t) => /Salir|Cerrar sesión|Entrar|Mi Red/.test(t)));
await pm.close();
// 4) Navegación interna (sin recarga) desde la portada a Quiénes somos.
const pn = await ses.newPage(); await pn.goto(BASE + "/quienes-somos/"); await pn.waitForTimeout(1500);
await pn.evaluate(() => { window.__marca = 1; });
try { await pn.locator('a[href="/academia/"]').first().click({ timeout: 3000 }); } catch {}
await pn.waitForTimeout(3000);
res.navegacion = await pn.evaluate(() => ({ ruta: location.pathname, sin_recarga: window.__marca === 1 }));
await pn.close();
await browser.close();

const rutasA = Object.values(res.anonimo);
res.resumen = {
  rutas: rutasA.length,
  rutas_con_errores: Object.entries(res.anonimo).filter(([, v]) => v.errores.length).map(([k]) => k),
  fallos_contraste_total: rutasA.reduce((a, v) => a + v.n_contraste, 0),
  rutas_no_200: Object.entries(res.anonimo).filter(([, v]) => v.estado !== 200).map(([k, v]) => k + ":" + v.estado),
};
fs.writeFileSync(SALIDA, JSON.stringify(res, null, 1));
console.log(ETIQ, JSON.stringify(res.resumen), "| login", res.sesion.login_http, "| movil", JSON.stringify(res.movil.menu), "| nav", JSON.stringify(res.navegacion));
