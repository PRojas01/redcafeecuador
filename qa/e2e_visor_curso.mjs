// Uso: ./servidor/paridad.sh <puerto> <sitio> qa/e2e_cursos.py qa/e2e_visor_curso.mjs (necesita los cursos que crea e2e_cursos).
// Alumno: entra a un curso del servidor, se matricula con «Empezar gratis» y marca una lección.
import { chromium } from "playwright";
const B = process.argv[2], OUT = process.argv[4];
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
await p.goto(B + "/"); 
const api = (u, d) => p.evaluate(async ([u, d]) => (await (await fetch(u, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })).json()), [u, d]);
const r = await api("/api/auth.php?action=register", { nombre: "Alumna Visor", email: `visor.${Date.now()}@ejemplo.test`, pass: "Clave-segura-123", rol: "productor", roles: ["productor"], provincia: "Loja", telefono: "0991234567", acepta_terminos: true, acepta_privacidad: true, acepta_uso_datos: true });
console.log("registro", r.ok);
const lista = await p.evaluate(async () => (await (await fetch("/api/cursos.php?action=list")).json()));
const id = lista.data.cursos.find((c) => c.listo && /cafetal/.test(c.id)).id;
// Llega desde la lista (navegación interna de Next) y luego se matricula.
await p.goto(B + "/academia/"); await p.waitForTimeout(2000);
await p.locator(`a[href="/academia/${id}/"]`).first().click(); await p.waitForTimeout(3000);
console.log("url", new URL(p.url()).pathname, "h1", await p.locator("main h1").first().textContent());
await p.getByRole("button", { name: "Empezar gratis" }).click(); await p.waitForTimeout(2500);
const cb = p.locator("input[data-completar]").first();
console.log("casillas", await p.locator("input[data-completar]").count());
await cb.check(); await p.waitForTimeout(1500);
console.log("avance", await p.locator(".redcafe-avance-texto").first().textContent());
await p.reload(); await p.waitForTimeout(3000);
console.log("tras recargar", await p.locator(".redcafe-avance-texto").first().textContent(), "marcada", await cb.isChecked());
await p.screenshot({ path: OUT + "/ver3.png" });
console.log("errores:", JSON.stringify(errs));
await b.close();
