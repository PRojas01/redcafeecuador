// Mejoras 20261002a desde el móvil (390 px): novedades, cerrar vistas del panel,
// sesión al navegar, Eliminar en lo propio. Solo local.
//   node qa/e2e_mejoras.mjs <url_local> <salida_dir>
import { chromium } from "playwright";
import fs from "node:fs";

const [, , BASE, OUT] = process.argv;
if (!/127\.0\.0\.1|localhost/.test(BASE)) { console.error("Solo local"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const S = Date.now().toString(36).slice(-5), PASS = "Prueba-" + S + "-ok", DESC = "Publicación de prueba con detalle suficiente para validar.";
const pasos = []; let n = 0;
async function paso(page, nombre, fn) {
  n++; const t0 = Date.now();
  try { const nota = await fn(); pasos.push({ n, nombre, ok: true, nota: nota || "" }); }
  catch (e) { const shot = `${OUT}/fallo-${String(n).padStart(2, "0")}.png`; try { await page.screenshot({ path: shot, fullPage: true }); } catch {}
    pasos.push({ n, nombre, ok: false, nota: String(e.message).split("\n")[0].slice(0, 170) }); }
}
const b = await chromium.launch();
const cfg = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const ctx = await b.newContext(cfg); const p = await ctx.newPage();
const errJS = []; p.on("pageerror", (e) => errJS.push(new URL(p.url()).pathname + " :: " + e.message.slice(0, 60)));
p.on("dialog", (d) => d.accept());
const q = await ctx.newPage(); await q.goto(BASE + "/terminos-y-condiciones/"); await q.waitForTimeout(2500);
const api = (u, d) => q.evaluate(async ([u, d]) => (await (await fetch(u, { method: d ? "POST" : "GET", credentials: "include", headers: { "Content-Type": "application/json" }, body: d ? JSON.stringify(d) : undefined })).json()), [u, d]);

// ── La clase gratis del 8-oct-2026 ya pasó: su aviso y sus enlaces se borraron ──
await paso(p, "Clase del 8 de octubre: ni aviso ni enlaces (contenido vencido borrado)", async () => {
  for (const ruta of ["/", "/academia/", "/academia/cafe-de-especialidad-de-la-finca-a-la-taza/"]) {
    await p.goto(BASE + ruta); await p.waitForTimeout(3500);
    if (await p.locator("#redcafe-mensaje-temporal").count()) throw new Error("sale el aviso en " + ruta);
    const html = await p.content();
    if (/clasedemostrativa|Clase demostrativa|8 oct 2026/i.test(html)) throw new Error("queda la clase en " + ruta);
  }
  return "portada, academia y curso libre limpios";
});
await paso(p, "El botón flotante conserva su función: va a la Comunidad", async () => {
  const bt = p.getByRole("link", { name: /Ir a la comunidad de la Red/ });
  if (!(await bt.count())) throw new Error("el botón ya no es el acceso a la comunidad");
  await bt.click(); await p.waitForTimeout(2500);
  if (!/\/comunidad/.test(p.url())) throw new Error("no llevó a la comunidad: " + p.url());
});

// ── Cuenta ──
await api("/api/auth.php?action=register", { nombre: "Rosa Mejoras", email: `rm.${S}@ejemplo.test`, pass: PASS, rol: "productor", roles: ["productor", "asesor", "exportador"], provincia: "Loja", telefono: "0991234567", acepta_terminos: true, acepta_privacidad: true, acepta_uso_datos: true });

await paso(p, "Sesión: sigue iniciada al salir del panel a otras páginas", async () => {
  const rutas = [];
  await p.goto(BASE + "/panel/"); await p.waitForTimeout(3000);
  for (const dest of ["Marketplace", "Academia", "Comunidad", "Servicios"]) {
    const l = p.locator(`header a:has-text("${dest}"), nav a:has-text("${dest}")`).first();
    if (await l.count()) await l.evaluate((e) => e.click()); else await p.goto(BASE + "/" + dest.toLowerCase() + "/");
    await p.waitForTimeout(2500);
    const me = await p.evaluate(async () => !!(await (await fetch("/api/auth.php?action=me", { credentials: "include" })).json()).data?.user);
    if (!me) throw new Error("perdió la sesión en " + new URL(p.url()).pathname);
    rutas.push(new URL(p.url()).pathname);
  }
  return rutas.join(" → ");
});
await paso(p, "El mensaje no sale en el panel (no tapa el formulario)", async () => {
  await p.evaluate(() => { sessionStorage.clear(); localStorage.removeItem("redcafe_anuncio_cerrado"); });
  await p.goto(BASE + "/panel/?ver=publicar"); await p.waitForTimeout(4500);
  if (await p.locator("#redcafe-mensaje-temporal").count()) throw new Error("salió encima del panel");
});

// ── Cerrar vistas del panel ──
for (const [ver, nombre] of [["publicar", "Publicar lote"], ["publicar_servicio", "Publicar servicio"], ["mis_publicaciones", "Mis publicaciones"]]) {
  await paso(p, `Panel › ${nombre}: se puede cerrar (arriba y abajo)`, async () => {
    await p.goto(BASE + "/panel/?ver=" + ver); await p.waitForTimeout(3500);
    const arriba = p.getByRole("button", { name: new RegExp(`Cerrar ${nombre}`) });
    const abajo = p.getByRole("button", { name: "Cerrar y volver al resumen" });
    if (!(await arriba.count())) throw new Error("falta el botón Cerrar de arriba");
    if (!(await abajo.count())) throw new Error("falta el botón de abajo");
    await abajo.evaluate((e) => e.scrollIntoView({ block: "center" })); await abajo.click(); await p.waitForTimeout(1200);
    if (await abajo.count()) throw new Error("no volvió al resumen");
    if (/ver=/.test(p.url())) throw new Error("la dirección sigue con ?ver=");
  });
}
await paso(p, "Panel: tocar otra vez la pestaña activa la cierra", async () => {
  await p.goto(BASE + "/panel/"); await p.waitForTimeout(3000);
  const tab = p.getByRole("button", { name: "Mi cuenta", exact: true }).first();
  await tab.click(); await p.waitForTimeout(800);
  if (!(await p.getByRole("button", { name: "Cerrar y volver al resumen" }).count())) throw new Error("no se abrió");
  await tab.click(); await p.waitForTimeout(800);
  if (await p.getByRole("button", { name: "Cerrar y volver al resumen" }).count()) throw new Error("no se cerró");
});
await paso(p, "Secciones abiertas: el botón «Ocultar» queda a la vista al bajar", async () => {
  await p.goto(BASE + "/panel/"); await p.waitForTimeout(3500);
  const bt = p.locator("main .redcafe-col-boton").filter({ hasText: /mis cursos/i }).first();
  if (!(await bt.count())) throw new Error("no está «Abrir mis cursos»");
  await bt.evaluate((e) => e.scrollIntoView({ block: "center" })); await bt.click(); await p.waitForTimeout(800);
  const pos = await bt.evaluate((e) => getComputedStyle(e).position);
  if (pos !== "sticky") throw new Error("no queda fijo (" + pos + ")");
  await bt.click(); await p.waitForTimeout(500);
  if ((await bt.getAttribute("aria-expanded")) !== "false") throw new Error("no se ocultó");
  return "Mis cursos se abre, queda fijo y se oculta";
});

// ── Eliminar lo propio ──
const T = { lote: "Finca M " + S, serv: "Servicio M " + S, req: "Req M " + S, emp: "Empleo M " + S, busco: "Busco empleo M " + S };
await api("/api/lotes.php?action=publish", { finca: T.lote, provincia: "Loja", variedad: "Typica", proceso: "Lavado", precioSaco: 240, pesoSacoLb: 100, stockSacos: 10 });
await api("/api/marketplace-servicios.php?action=publish", { titulo: T.serv, descripcion: DESC, categoria: "asesoria", precio: 30, unidad: "hora", provincia: "Loja", cobertura: "Loja", visibilidad: "publico" });
await api("/api/requerimientos.php?action=publish", { titulo: T.req, descripcion: DESC, cantidad: 20, unidad: "quintales", provincia: "Loja", tipo: "verde", proceso: "lavado", contactoPreferido: "plataforma" });
await api("/api/empleos.php?action=publish", { titulo: T.emp, descripcion: DESC, empresa: "Finca SA", provincia: "Loja", categoria: "calidad-catacion", modalidad: "presencial", jornada: "tiempo-completo", vacantes: 1, contactoPreferido: "plataforma", salarioPeriodo: "mes", experiencia: "sin-experiencia" });
await api("/api/busco-empleo.php?action=publish", { titulo: T.busco, descripcion: DESC, categoria: "calidad-catacion", provincia: "Loja", modalidad: "presencial", jornada: "tiempo-completo", disponibilidad: "inmediata", experiencia: "1-2-anios", contactoPreferido: "plataforma" });
const abrirTodo = async () => { for (let k = 0; k < 2; k++) { const c = await p.locator("main [aria-expanded=false]").count(); for (let i = 0; i < c; i++) { const e = p.locator("main .redcafe-col-boton[aria-expanded=false]").first(); if (!(await e.count())) break; await e.evaluate((x) => x.click()).catch(() => {}); await p.waitForTimeout(200); } } };
const eliminarDesdePanel = async (titulo, boton, compruebaApi) => {
  await p.goto(BASE + "/panel/"); await p.waitForTimeout(4000); await abrirTodo(); await p.waitForTimeout(1500);
  const card = p.locator("article, .redcafe-req-card, .redcafe-empleo-card, .redcafe-busco-card, li, div").filter({ hasText: titulo }).filter({ has: p.getByRole("button", { name: boton }) }).last();
  if (!(await card.count())) throw new Error(`no hay botón «${boton}» junto a «${titulo}»`);
  const bt = card.getByRole("button", { name: boton }).first();
  await bt.evaluate((e) => e.scrollIntoView({ block: "center" })); await bt.click(); await p.waitForTimeout(2500);
  if (!(await compruebaApi())) throw new Error("sigue existiendo tras eliminar");
};
const yaNo = (u, t) => async () => !JSON.stringify(await api(u)).includes(t);
await paso(p, "Lote: su autora lo elimina desde el panel", async () => {
  // La ficha de lote se despliega con «Editar ficha…»; el botón está dentro.
  await p.goto(BASE + "/panel/"); await p.waitForTimeout(4000); await abrirTodo(); await p.waitForTimeout(1000);
  const card = p.locator(".redcafe-pub-card").filter({ hasText: T.lote }).first();
  await card.locator(".redcafe-pub-toggle").evaluate((e) => e.click()); await p.waitForTimeout(500);
  const bt = card.getByRole("button", { name: "Eliminar lote" });
  if (!(await bt.count())) throw new Error("no hay «Eliminar lote»");
  await bt.evaluate((e) => e.scrollIntoView({ block: "center" })); await bt.click(); await p.waitForTimeout(2500);
  if (!(await yaNo("/api/lotes.php?action=mine", T.lote)())) throw new Error("el lote sigue");
});
await paso(p, "Servicio: su autora lo elimina desde el panel", async () => {
  await p.goto(BASE + "/panel/"); await p.waitForTimeout(4000); await abrirTodo(); await p.waitForTimeout(1000);
  const card = p.locator(".redcafe-pub-card").filter({ hasText: T.serv }).first();
  await card.locator(".redcafe-pub-toggle").evaluate((e) => e.click()); await p.waitForTimeout(500);
  const bt = card.getByRole("button", { name: "Eliminar servicio" });
  if (!(await bt.count())) throw new Error("no hay «Eliminar servicio»");
  await bt.evaluate((e) => e.scrollIntoView({ block: "center" })); await bt.click(); await p.waitForTimeout(2500);
  if (!(await yaNo("/api/marketplace-servicios.php?action=mine", T.serv)())) throw new Error("el servicio sigue");
});
await paso(p, "Requerimiento: su autora lo elimina", () => eliminarDesdePanel(T.req, "Eliminar", yaNo("/api/requerimientos.php?action=mios", T.req)));
await paso(p, "Oferta de empleo: su autora la elimina", () => eliminarDesdePanel(T.emp, "Eliminar oferta", yaNo("/api/empleos.php?action=mias", T.emp)));
await paso(p, "Busco empleo: su autora lo elimina", () => eliminarDesdePanel(T.busco, "Eliminar", yaNo("/api/busco-empleo.php?action=mias", T.busco)));
await paso(p, "Comunidad: borra su propio comentario", async () => {
  const r = await api("/api/comunidad.php?action=create", { titulo: "Pregunta M " + S, text: "¿Quién vende en Loja?" });
  const id = r.data?.post?.id; await api("/api/comunidad.php?action=comment", { id, text: "Comentario M " + S });
  await p.goto(BASE + "/comunidad/"); await p.waitForTimeout(4000);
  const post = p.locator("article.redcafe-muro-item").filter({ hasText: "Pregunta M " + S }).first();
  await post.locator(".redcafe-muro-comentar").evaluate((e) => e.click()); await p.waitForTimeout(500);
  const bt = post.getByRole("button", { name: "Borrar comentario" });
  if (!(await bt.count())) throw new Error("no hay «Borrar» en el comentario");
  await bt.click(); await p.waitForTimeout(2500);
  const sigue = JSON.stringify(await api("/api/comunidad.php?action=list")).includes("Comentario M " + S);
  if (sigue) throw new Error("el comentario sigue");
});

await b.close();
fs.writeFileSync(`${OUT}/resultado.json`, JSON.stringify({ pasos, errJS }, null, 1));
for (const x of pasos) console.log(`${x.ok ? "✔" : "✘"} ${String(x.n).padStart(2)} ${x.nombre} ${x.nota}`);
console.log(`${pasos.filter((x) => x.ok).length}/${pasos.length} · errores JS: ${errJS.length ? JSON.stringify(errJS) : 0}`);
