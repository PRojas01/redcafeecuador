// Revisión de SOLO LECTURA del sitio publicado: no crea cuentas, no envía formularios.
//   node qa/revision_publicada.mjs https://redcafeecuador.com <carpeta-salida>
// Por página (móvil 390 y escritorio 1280): estado HTTP, errores JS y de consola,
// peticiones fallidas, imágenes rotas, desborde horizontal, título/descripción/h1,
// tiempo de carga y captura. Además: enlaces internos rotos, cabeceras de seguridad,
// redirecciones, robots/sitemap y las fichas de cada curso de la Academia.
// No guarda datos personales: solo URLs, códigos y recuentos.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pw = await import(process.env.PLAYWRIGHT ?? "playwright").catch(() => import("/opt/node-tools/node_modules/playwright/index.mjs"));
const chromium = pw.chromium ?? pw.default.chromium;
const [, , BASE_ARG, OUT = "revision-publicada"] = process.argv;
if (!BASE_ARG) { console.error("Uso: node qa/revision_publicada.mjs https://<sitio> <salida>"); process.exit(2); }
const BASE = BASE_ARG.replace(/\/$/, "");
const ORIGEN = new URL(BASE).origin;
fs.mkdirSync(path.join(OUT, "capturas"), { recursive: true });
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const informe = { base: BASE, fecha: new Date().toISOString(), version: null, paginas: [], enlacesRotos: [], cabeceras: {}, extras: [] };

// ---------- Rutas: lista del proyecto + cursos y lotes publicados ----------
let rutas = fs.readFileSync(path.join(raiz, "plataforma_cafe/herramientas/rutas.txt"), "utf8")
  .split(/\r?\n/).map((r) => r.trim()).filter(Boolean).map((r) => (r === "/./" ? "/" : r));
const j = async (u) => { try { const r = await fetch(BASE + u); return await r.json(); } catch { return null; } };
informe.version = (await j("/redcafe-version.json"))?.version ?? "?";
const cursos = (await j("/api/cursos.php?action=list"))?.data?.cursos ?? [];
for (const c of cursos) if (c?.id) rutas.push(`/academia/${encodeURIComponent(c.id)}/`);
const lotesR = (await j("/api/lotes.php?action=list"))?.data;
const lotes = Array.isArray(lotesR) ? lotesR : (lotesR?.lotes ?? []);
for (const l of lotes.slice(0, 5)) if (l?.id) rutas.push(`/marketplace/${encodeURIComponent(l.id)}/`);
rutas = [...new Set(rutas)];
console.log(`Versión ${informe.version} · ${rutas.length} rutas (${cursos.length} cursos, ${lotes.length} lotes)`);

// ---------- Cabeceras y redirecciones ----------
async function cabeceras(u, opts = {}) {
  try {
    const r = await fetch(u, { redirect: "manual", ...opts });
    return { status: r.status, location: r.headers.get("location"), h: Object.fromEntries([...r.headers].filter(([k]) => /strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy|cache-control|content-encoding|server|x-powered/.test(k))) };
  } catch (e) { return { error: String(e.message) }; }
}
const host = new URL(BASE).host.replace(/^www\./, "");
informe.cabeceras.portada = await cabeceras(BASE + "/", { headers: { "accept-encoding": "br, gzip" } });
informe.cabeceras.http = await cabeceras(`http://${host}/`);
informe.cabeceras.www = await cabeceras(`https://www.${host}/`);
for (const u of ["/robots.txt", "/sitemap.xml", "/no-existe-xyz/", "/estado-servidor", "/data/members.json", "/.env", "/api/members.php?action=list"]) {
  const r = await cabeceras(BASE + u);
  informe.extras.push({ url: u, status: r.status ?? r.error });
}

// ---------- Recorrido con navegador ----------
const browser = await chromium.launch();
const internos = new Map(); // href -> página donde aparece
for (const [nombre, vp] of [["movil", { width: 390, height: 844 }], ["escritorio", { width: 1280, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  for (const r of rutas) {
    const page = await ctx.newPage();
    const fila = { ruta: r, vista: nombre, errJS: [], consola: [], fallidas: [] };
    page.on("pageerror", (e) => fila.errJS.push(String(e.message).slice(0, 160)));
    page.on("console", (m) => { if (m.type() === "error") fila.consola.push(m.text().slice(0, 160)); });
    page.on("requestfailed", (q) => { if (!/tile\.openstreetmap|google-analytics|googletagmanager/.test(q.url())) fila.fallidas.push(`${q.failure()?.errorText} ${q.url().slice(0, 140)}`); });
    page.on("response", (s) => { if (s.status() >= 400 && s.url().startsWith(ORIGEN)) fila.fallidas.push(`${s.status()} ${s.url().replace(ORIGEN, "").slice(0, 140)}`); });
    const t0 = Date.now();
    let resp = null;
    try { resp = await page.goto(BASE + r, { waitUntil: "load", timeout: 45000 }); } catch (e) { fila.fallidas.push("goto " + String(e.message).slice(0, 80)); }
    fila.ms = Date.now() - t0;
    fila.status = resp?.status?.() ?? 0;
    await page.waitForTimeout(1500);
    try {
      Object.assign(fila, await page.evaluate(() => {
        const imgs = [...document.images].filter((i) => i.getClientRects().length);
        const rotas = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src).slice(0, 10);
        const anchoDoc = document.documentElement.scrollWidth, anchoVista = window.innerWidth;
        const anchos = anchoDoc > anchoVista + 2 ? [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > anchoVista + 2 && getComputedStyle(e).position !== "fixed").slice(0, 3).map((e) => e.tagName + "." + String(e.className).slice(0, 40)) : [];
        const bgRotos = [];
        return {
          titulo: document.title, descripcion: document.querySelector('meta[name="description"]')?.content ?? "",
          h1: document.querySelectorAll("h1").length, imagenes: imgs.length, imgRotas: rotas,
          desborde: anchoDoc > anchoVista + 2 ? `${anchoDoc}px > ${anchoVista}px ${anchos.join(" ")}` : "",
          sinAlt: imgs.filter((i) => !i.hasAttribute("alt")).length,
          botonesSinNombre: [...document.querySelectorAll("button, a[href]")].filter((b) => b.getClientRects().length && !(b.innerText.trim() || b.getAttribute("aria-label") || b.getAttribute("title") || b.querySelector("img[alt]:not([alt=''])"))).length,
          hrefs: [...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => h.startsWith(location.origin)),
          bgRotos,
        };
      }));
      for (const h of fila.hrefs) { const u = h.split("#")[0]; if (!internos.has(u)) internos.set(u, r); }
      delete fila.hrefs;
      // Imágenes de fondo (CSS) que no cargan
      const bgs = await page.evaluate(() => [...new Set([...document.querySelectorAll("body *")].map((e) => getComputedStyle(e).backgroundImage).join(" ").match(/url\("?([^")]+)"?\)/g) ?? [])].map((x) => x.replace(/^url\("?|"?\)$/g, "")).filter((u) => !u.startsWith("data:")).slice(0, 40));
      for (const u of bgs) { try { const s = await page.request.get(new URL(u, BASE).href); if (s.status() >= 400) fila.bgRotos.push(`${s.status()} ${u.slice(0, 120)}`); } catch {} }
      if (nombre === "movil") await page.screenshot({ path: path.join(OUT, "capturas", (r.replace(/\W+/g, "_") || "_") + ".png"), fullPage: true });
    } catch (e) { fila.fallidas.push("eval " + String(e.message).slice(0, 80)); }
    informe.paginas.push(fila);
    const malo = fila.status !== 200 || fila.errJS.length || fila.imgRotas?.length || fila.bgRotos?.length || fila.desborde || fila.fallidas.length;
    console.log(`${malo ? "✘" : "✔"} ${nombre.padEnd(10)} ${String(fila.status).padEnd(3)} ${String(fila.ms).padStart(5)}ms ${r}${malo ? "  " + JSON.stringify({ errJS: fila.errJS.length, img: fila.imgRotas?.length, bg: fila.bgRotos?.length, desborde: fila.desborde, fallidas: fila.fallidas.slice(0, 3) }) : ""}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();

// ---------- Enlaces internos rotos ----------
for (const [u, desde] of internos) {
  if (/\/api\/|logout|salir/.test(u)) continue;
  try { const r = await fetch(u, { method: "GET", redirect: "follow" }); if (r.status >= 400) informe.enlacesRotos.push({ url: u.replace(ORIGEN, ""), status: r.status, desde }); } catch (e) { informe.enlacesRotos.push({ url: u, error: String(e.message).slice(0, 60), desde }); }
}

fs.writeFileSync(path.join(OUT, "informe.json"), JSON.stringify(informe, null, 1));
const P = informe.paginas;
const resumen = {
  version: informe.version, paginas: P.length,
  noOk: P.filter((p) => p.status !== 200).map((p) => `${p.vista} ${p.status} ${p.ruta}`),
  conErrorJS: P.filter((p) => p.errJS.length).map((p) => `${p.vista} ${p.ruta}: ${p.errJS[0]}`),
  imgRotas: P.filter((p) => p.imgRotas?.length).map((p) => `${p.vista} ${p.ruta}: ${p.imgRotas.join(", ")}`),
  fondosRotos: P.filter((p) => p.bgRotos?.length).map((p) => `${p.ruta}: ${p.bgRotos.join(", ")}`),
  desborde: P.filter((p) => p.desborde).map((p) => `${p.vista} ${p.ruta}: ${p.desborde}`),
  fallidas: P.filter((p) => p.fallidas.length).map((p) => `${p.vista} ${p.ruta}: ${p.fallidas.slice(0, 3).join(" | ")}`),
  lentas: P.filter((p) => p.ms > 4000).map((p) => `${p.vista} ${p.ms}ms ${p.ruta}`),
  sinDescripcion: [...new Set(P.filter((p) => !p.descripcion).map((p) => p.ruta))],
  h1Raro: [...new Set(P.filter((p) => p.h1 !== 1).map((p) => `${p.ruta} (${p.h1})`))],
  enlacesRotos: informe.enlacesRotos.slice(0, 30), cabeceras: informe.cabeceras, extras: informe.extras,
};
fs.writeFileSync(path.join(OUT, "resumen.json"), JSON.stringify(resumen, null, 1));
console.log("\nRESUMEN\n" + JSON.stringify(resumen, null, 1).slice(0, 6000));
