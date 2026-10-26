// Botones de la portada (24-oct-2026): Registrarse / WhatsApp / Acceder.
// Misma forma, un color por función, contraste AA, en móvil y escritorio.
//   node qa/e2e_portada_botones.mjs <url_local> <salida_dir>
import { chromium } from "playwright";
import fs from "node:fs";

const [BASE, OUT] = [process.argv[2].replace(/\/$/, ""), process.argv[3]];
fs.mkdirSync(OUT, { recursive: true });
const R = [];
const lum = (rgb) => {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const ESPERADO = [
  { texto: "Registrarse", href: /^\/afiliate\/?$/, fondo: "rgb(255, 190, 26)" },
  { texto: "WhatsApp", href: /^https:\/\/wa\.me\/593/, fondo: "rgb(37, 211, 102)" },
  { texto: "Acceder", href: /^\/login\/?$/, fondo: "rgb(242, 188, 142)" },
];

const b = await chromium.launch();
const errores = [];
for (const [nombre, vp] of [["móvil", { width: 390, height: 844 }], ["escritorio", { width: 1280, height: 800 }]]) {
  const p = await b.newPage({ viewport: vp });
  p.on("pageerror", (e) => errores.push(String(e)));
  await p.goto(BASE + "/"); await p.waitForTimeout(3500);
  const bs = await p.evaluate(() => [...document.querySelectorAll("#portada-hero .portada-botones a")].map((a) => {
    const s = getComputedStyle(a); const r = a.getBoundingClientRect();
    return { texto: a.textContent.trim(), href: a.getAttribute("href"), fondo: s.backgroundColor, color: s.color, x: r.x, y: r.y, w: r.width, h: r.height, radio: s.borderRadius, letra: s.fontSize };
  }));
  const ok = (a, c, d = "") => R.push([`${nombre}: ${a}`, !!c, d]);
  ok("hay exactamente tres botones, en el orden pedido", bs.length === 3 && bs.every((x, i) => x.texto === ESPERADO[i].texto), bs.map((x) => x.texto).join(" | "));
  bs.forEach((x, i) => {
    const e = ESPERADO[i]; if (!e) return;
    ok(`«${e.texto}» lleva a su sitio`, e.href.test(x.href || ""), x.href);
    ok(`«${e.texto}» tiene su color`, x.fondo === e.fondo, x.fondo);
    const k = contraste(x.fondo, x.color);
    ok(`«${e.texto}» se lee bien (contraste ≥ 4,5)`, k >= 4.5, k.toFixed(1));
  });
  ok("misma forma: misma altura, esquinas y letra", bs.length === 3 && new Set(bs.map((x) => Math.round(x.h))).size === 1 && new Set(bs.map((x) => x.radio)).size === 1 && new Set(bs.map((x) => x.letra)).size === 1, bs.map((x) => `${Math.round(x.h)}px ${x.radio} ${x.letra}`).join(" | "));
  ok("altura táctil ≥ 44 px", bs.every((x) => x.h >= 44), bs.map((x) => Math.round(x.h)).join(","));
  if (nombre === "móvil") ok("en el teléfono van uno debajo del otro, a lo ancho", bs.length === 3 && bs[0].y < bs[1].y && bs[1].y < bs[2].y && new Set(bs.map((x) => Math.round(x.w))).size === 1, bs.map((x) => Math.round(x.w)).join(","));
  else ok("en escritorio van en una fila", bs.length === 3 && new Set(bs.map((x) => Math.round(x.y))).size === 1);
  ok("no queda el «Acceder a mi perfil» que copiaba la capa", !(await p.locator("text=Acceder a mi perfil").count()));
  ok("la franja de cifras sigue saliendo bajo la portada", (await p.locator("#redcafe-cifras-red").count()) === 1);
  await p.locator("#portada-hero").screenshot({ path: `${OUT}/portada-${nombre}.png` });
  await p.close();
}
await b.close();
R.push(["sin errores de JavaScript", errores.length === 0, errores.join(" · ").slice(0, 200)]);
for (const [a, ok, d] of R) console.log(`${ok ? "✔" : "✘"} ${a}${ok ? "" : "  → " + d}`);
console.log(`\nportada ${R.filter((x) => x[1]).length}/${R.length}`);
