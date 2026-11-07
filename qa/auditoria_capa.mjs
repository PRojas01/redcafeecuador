// Auditoría: ¿algún script de la capa propia escribe DENTRO de nodos de React?
// Uso: node qa/auditoria_capa.mjs <base> [salida.json]
// Recorre todas las rutas (anónimo y con sesión de miembro) y busca elementos sin
// fibra de React cuyo padre sí es de React. Se permiten: los huecos que React deja
// vacíos a propósito (data-redcafe-hueco), los nodos con dangerouslySetInnerHTML,
// el mapa (Leaflet monta sus capas en el div que le da React) y lo que cuelga de body.
import fs from "node:fs";
const PW = process.env.PLAYWRIGHT || "playwright";
const { chromium } = await import(PW);
const BASE = process.argv[2] || "http://127.0.0.1:8096";
const SALIDA = process.argv[3];

const RUTAS = ["/", "/academia/", "/academia/buenas-practicas/", "/admin/", "/afiliate/", "/asesoria/", "/bar/", "/barista/", "/chat/", "/comunidad/",
  "/laboratorio/", "/legal/", "/login/", "/marketplace/", "/noticias/", "/panel/", "/quienes-somos/", "/recetas/", "/recuperar/",
  "/servicios/", "/servicios/precios/", "/servicios/calculadora/", "/servicios/eudr/", "/servicios/factura/", "/servicios/contratar/"];

function revisar() {
  const tieneFibra = (el) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
  const fibra = (el) => el[Object.keys(el).find((k) => k.startsWith("__reactFiber$"))];
  const malos = [];
  for (const el of document.querySelectorAll("body *")) {
    if (tieneFibra(el)) continue;
    const p = el.parentElement;
    if (!p || p === document.body || !tieneFibra(p)) continue;
    if (p.hasAttribute("data-redcafe-hueco") || p.closest(".leaflet-container")) continue;
    const f = fibra(p);
    if (f && f.memoizedProps && f.memoizedProps.dangerouslySetInnerHTML) continue;
    if (["SCRIPT", "STYLE", "LINK", "META", "TITLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName)) continue;
    if (p.tagName === "HEAD" || p.tagName === "HTML") continue;
    malos.push(`${p.tagName.toLowerCase()}${p.id ? "#" + p.id : ""} > ${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).slice(0, 40)}`);
  }
  return malos;
}

const b = await chromium.launch();
const resultado = {};
for (const conSesion of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  if (conSesion) {
    await p.goto(BASE + "/");
    await p.evaluate(async () => {
      const email = "audit" + Date.now() + "@ejemplo.test";
      const r = await fetch("/api/auth.php?action=register", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: "Auditoría Capa", email, pass: "Clave-segura-123", rol: "productor", roles: ["productor"], acepta_terminos: true, acepta_privacidad: true, acepta_uso_datos: true }) });
      const j = await r.json();
      if (j.ok) localStorage.setItem("redcafe_sesion", JSON.stringify(j.data.user || j.data));
    });
  }
  for (const r of RUTAS) {
    try {
      await p.goto(BASE + r, { waitUntil: "load" });
      await p.waitForTimeout(r === "/panel/" ? 9000 : 5000);
      const m = await p.evaluate(revisar);
      if (m.length) resultado[(conSesion ? "miembro " : "anónimo ") + r] = [...new Set(m)];
    } catch (e) {
      resultado[(conSesion ? "miembro " : "anónimo ") + r] = ["error: " + e.message.slice(0, 80)];
    }
  }
  await ctx.close();
}
await b.close();
console.log(Object.keys(resultado).length ? JSON.stringify(resultado, null, 1) : "Sin escrituras de la capa dentro de React en " + RUTAS.length * 2 + " visitas.");
if (SALIDA) fs.writeFileSync(SALIDA, JSON.stringify(resultado, null, 1));
