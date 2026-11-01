// Mide el parpadeo React ↔ capa propia en todas las rutas.
//   node qa/parpadeo.mjs <base> <salida.json> [anchura]
//   p. ej. node qa/parpadeo.mjs http://127.0.0.1:8172 /tmp/parpadeo.json 390
// «ventana»: ms entre el primer pintado (FCP) y el último cambio que hace la capa
// (bloque de React oculto, bloque propio añadido o texto cambiado dentro de <main>
// por un script que no es React). Criterio de salida de cada fase: < 300 ms.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pw = await import(process.env.PLAYWRIGHT ?? "/opt/node22/lib/node_modules/playwright/index.mjs");
const chromium = pw.chromium ?? pw.default.chromium;
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rutas = fs.readFileSync(path.join(raiz, "plataforma_cafe/herramientas/rutas.txt"), "utf8")
  .split(/\r?\n/).map((r) => r.trim()).filter(Boolean).map((r) => (r === "/./" ? "/" : r));
const B = process.argv[2] ?? "http://127.0.0.1:8172";
const ancho = Number(process.argv[4] ?? 390);
const b = await chromium.launch();
const out = [];
for (const r of rutas) {
  const c = await b.newContext({ viewport: { width: ancho, height: 844 } });
  const p = await c.newPage();
  await p.addInitScript(() => {
    const t = (window.__t = { oc: 0, pr: 0, ini: null, ult: null, que: [] });
    const marca = (q) => { const ms = performance.now(); if (t.ini === null) t.ini = ms; t.ult = ms; if (t.que.length < 12) t.que.push(Math.round(ms) + " " + q); };
    new MutationObserver((l) => {
      for (const m of l) {
        if (m.type === "attributes" && m.attributeName === "data-redcafe-oculto-react" && m.target.getAttribute("data-redcafe-oculto-react") === "1") { t.oc++; marca("oculta " + (m.target.id || m.target.className || m.target.tagName).toString().slice(0, 40)); }
        if (m.type === "childList") for (const n of m.addedNodes) {
          if (n.nodeType === 1 && (n.hasAttribute?.("data-redcafe-propio") || n.querySelector?.("[data-redcafe-propio]"))) { t.pr++; marca("pinta " + (n.id || n.className || n.tagName).toString().slice(0, 40)); }
        }
      }
    }).observe(document, { subtree: true, attributes: true, childList: true, attributeFilter: ["data-redcafe-oculto-react"] });
  });
  try {
    await p.goto(B + r, { waitUntil: "load", timeout: 30000 });
    await p.waitForTimeout(4500);
    const m = await p.evaluate(() => {
      const f = performance.getEntriesByName("first-contentful-paint")[0];
      return { fcp: f ? Math.round(f.startTime) : null, ...window.__t, ocFinal: document.querySelectorAll('[data-redcafe-oculto-react="1"]').length, prFinal: document.querySelectorAll("[data-redcafe-propio]").length };
    });
    const ventana = m.ult != null && m.fcp != null ? Math.max(0, Math.round(m.ult - m.fcp)) : 0;
    out.push({ r, ventana, oc: m.ocFinal, pr: m.prFinal, que: m.que });
  } catch (e) {
    out.push({ r, ventana: -1, oc: 0, pr: 0, error: String(e).slice(0, 120) });
  }
  await c.close();
}
await b.close();
out.sort((a, b) => b.ventana - a.ventana);
fs.writeFileSync(process.argv[3] ?? "parpadeo.json", JSON.stringify(out, null, 1));
const con = out.filter((x) => x.ventana > 300);
console.log(`páginas: ${out.length} · con parpadeo (>0,3 s): ${con.length} · sin parpadeo: ${out.length - con.length}`);
console.log("ruta | parpadeo (s) | React oculto | pintado por la capa");
out.forEach((x) => console.log(`${x.r} | ${(x.ventana / 1000).toFixed(1)} | ${x.oc} | ${x.pr}`));
