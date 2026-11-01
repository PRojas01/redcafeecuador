// E2E 20261023a desde el móvil: portada por prioridad, comunidad, aceptación de
// contacto, reportar a un miembro, ficha y medidas del admin, apelación y baja.
//   node qa/e2e_cuentas.mjs <url_local> <carpeta_sitio> <salida_dir>
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [, , BASE, SITIO, OUT] = process.argv;
if (!/127\.0\.0\.1|localhost/.test(BASE)) { console.error("Solo local"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const S = Date.now().toString(36).slice(-5), PASS = "Prueba-" + S + "-ok";
const pasos = []; let n = 0;
async function paso(page, nombre, fn) {
  n++;
  try { const nota = await fn(); pasos.push({ n, nombre, ok: true, nota: nota || "" }); }
  catch (e) { const shot = `${OUT}/fallo-${String(n).padStart(2, "0")}.png`; try { await page.screenshot({ path: shot, fullPage: true }); } catch {}
    pasos.push({ n, nombre, ok: false, nota: String(e.message).split("\n")[0].slice(0, 180) }); }
}
const b = await chromium.launch();
const cfg = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const errJS = [];
async function contexto() {
  const ctx = await b.newContext(cfg); const p = await ctx.newPage();
  p.on("pageerror", (e) => errJS.push(new URL(p.url()).pathname + " :: " + e.message.slice(0, 70)));
  await p.goto(BASE + "/terminos-y-condiciones/"); await p.evaluate(() => localStorage.setItem("redcafe_anuncio_cerrado", "clase-legacy-curso-libre-2026-10-08"));
  const api = (u, d) => p.evaluate(async ([u, d]) => (await (await fetch(u, { method: d ? "POST" : "GET", credentials: "include", headers: { "Content-Type": "application/json" }, body: d ? JSON.stringify(d) : undefined })).json()), [u, d]);
  return { ctx, p, api };
}
const registrar = (api, nombre, email, rol) => api("/api/auth.php?action=register", { nombre, email, pass: PASS, rol, roles: [rol], provincia: "Loja", telefono: "0991234567", acepta_terminos: true, acepta_privacidad: true, acepta_uso_datos: true });

// ── Portada y comunidad (visitante) ──
const V = await contexto();
await paso(V.p, "Portada: orden por prioridad y sin bloques repetidos", async () => {
  await V.p.goto(BASE + "/"); await V.p.waitForTimeout(4500);
  const r = await V.p.evaluate(() => {
    const top = (sel) => { const e = document.querySelector(sel); return e && e.getBoundingClientRect().height > 0 ? e.getBoundingClientRect().top + scrollY : null; };
    const t = { hero: top("main section.hero-gradient"), cifras: top("#redcafe-cifras-red"), forma: top("#forma-parte"), perfiles: top("#perfiles"), mapa: top("#mapa-portada"), precio: top("#redcafe-home-price-strip"), confianza: top("#confianza") };
    const texto = document.querySelector("main").innerText;
    return { t, capaAcceso: !!document.getElementById("redcafe-acceso"), ocultas: document.querySelectorAll("main [data-redcafe-oculto-react]").length,
      bar: /Historias, personas y cultura del café/.test(texto), noticias: /Noticias del sector/.test(texto), video: !!document.querySelector("main section.hero-gradient video"), tarjetaPerfiles: /Perfiles de entrada/i.test(texto) };
  });
  const orden = ["hero", "cifras", "forma", "perfiles", "mapa", "precio", "confianza"];
  for (let i = 1; i < orden.length; i++) if (r.t[orden[i]] === null || r.t[orden[i - 1]] === null || r.t[orden[i]] <= r.t[orden[i - 1]]) throw new Error("orden: " + JSON.stringify(r.t));
  if (r.capaAcceso) throw new Error("sigue la copia de la capa de «Forma parte»");
  if (r.bar || r.noticias) throw new Error("Bar o Noticias siguen en la portada");
  if (!r.video) throw new Error("falta el video en el hero");
  if (r.tarjetaPerfiles) throw new Error("sigue la tarjeta «Perfiles de entrada»");
  return `orden correcto · bloques ocultos de React: ${r.ocultas}`;
});
await paso(V.p, "Comunidad: Bar/Cafetería y Noticias del sector", async () => {
  await V.p.goto(BASE + "/comunidad/"); await V.p.waitForTimeout(4500);
  const r = await V.p.evaluate(() => ({ cultura: !!document.querySelector("#cultura"), noticias: document.querySelectorAll("#noticias-sector a.card").length }));
  if (!r.cultura || r.noticias !== 3) throw new Error(JSON.stringify(r));
});
await paso(V.p, "Comunidad: cada novedad lleva a su destino (ninguna a la misma página)", async () => {
  const enlaces = await V.p.evaluate(() => [...document.querySelectorAll("a.redcafe-muro-enlace")].map((a) => a.getAttribute("href")));
  const malos = enlaces.filter((h) => /^\/(comunidad|marketplace)\/?$/.test(h));
  if (malos.length) throw new Error("enlaces genéricos: " + JSON.stringify(malos.slice(0, 4)));
  return enlaces.length + " enlaces · " + [...new Set(enlaces.map((h) => h.replace(/[0-9a-f]{8,}/, "<id>")))].slice(0, 5).join(" ");
});
await paso(V.p, "Marketplace: ?ver=servicios abre la pestaña de servicios", async () => {
  await V.p.goto(BASE + "/marketplace/?ver=servicios"); await V.p.waitForTimeout(5000);
  const activo = await V.p.evaluate(() => { const b = [...document.querySelectorAll("main button")].find((x) => x.textContent.trim() === "Servicios"); return b ? getComputedStyle(b).color + "|" + b.className : ""; });
  const txt = await V.p.evaluate(() => document.querySelector("main").innerText);
  if (!/servicio/i.test(txt) || !/bg-coffee-900/.test(activo)) throw new Error("pestaña no activa: " + activo.slice(0, 80));
});

// ── Cuentas de prueba ──
const vend = await contexto(); const comp = await contexto();
await registrar(vend.api, "Vera Vendedora", `vera.${S}@ejemplo.test`, "productor");
await registrar(comp.api, "Ciro Comprador", `ciro.${S}@ejemplo.test`, "comprador");
const lote = (await vend.api("/api/lotes.php?action=publish", { finca: "Finca UI " + S, provincia: "Loja", variedad: "Typica", proceso: "Lavado", precioSaco: 200, pesoSacoLb: 100, stockSacos: 5 })).data?.lote?.id;
const idV = (await vend.api("/api/auth.php?action=me")).data?.user?.id;

await paso(comp.p, "Pedido: aceptación expresa antes de enviar (datos y operación entre las partes)", async () => {
  await comp.p.goto(BASE + "/marketplace/" + lote + "/"); await comp.p.waitForTimeout(4500);
  const bt = comp.p.getByRole("button", { name: "Solicitar este lote" }).first();
  await bt.evaluate((e) => e.scrollIntoView({ block: "center" })); await bt.click(); await comp.p.waitForTimeout(800);
  const dialogo = comp.p.locator(".redcafe-avisopago");
  if (!(await dialogo.count())) throw new Error("no salió el aviso");
  const texto = await dialogo.innerText();
  if (!/estrictamente entre tú y quien publica/.test(texto) || !/Tus datos/.test(texto)) throw new Error("texto incompleto");
  const enviar = dialogo.getByRole("button", { name: /Acepto y envío/ });
  if (!(await enviar.isDisabled())) throw new Error("el botón no espera la aceptación");
  await dialogo.locator("input[type=checkbox]").check(); await enviar.click(); await comp.p.waitForTimeout(2000);
  const conf = comp.p.getByRole("button", { name: /Enviar solicitud|Confirmar|Solicitar/ });
  if (await conf.count()) { await conf.last().click().catch(() => {}); await comp.p.waitForTimeout(2000); }
  const ped = (await comp.api("/api/pedidos.php?action=list")).data?.pedidos || [];
  const p = ped.find((x) => x.loteId === lote);
  if (!p) throw new Error("no se creó el pedido");
  if (!p.aviso_aceptado || p.aviso_version !== "2026-10-23") throw new Error("aceptación no registrada: " + JSON.stringify({ a: p.aviso_aceptado, v: p.aviso_version }));
  return "pedido #" + p.nro + " con aviso " + p.aviso_version;
});
await paso(comp.p, "WhatsApp: aviso de salida de la plataforma antes de abrirlo", async () => {
  await comp.p.goto(BASE + "/marketplace/" + lote + "/"); await comp.p.waitForTimeout(4500);
  await comp.p.evaluate(() => { window.__abierto = ""; window.open = (u) => { window.__abierto = u; return null; }; });
  const wa = comp.p.getByRole("link", { name: "Contactar por WhatsApp" }).first();
  if (!(await wa.count())) throw new Error("no hay enlace de WhatsApp en la ficha");
  await wa.evaluate((e) => e.scrollIntoView({ block: "center" })); await wa.click(); await comp.p.waitForTimeout(600);
  const d = comp.p.locator(".redcafe-avisopago");
  const t = await d.innerText();
  if (!/Vas a salir de Red Café Ecuador/i.test(t) || !/estrictamente entre ustedes/.test(t)) throw new Error("texto: " + t.slice(0, 100));
  await d.getByRole("button", { name: /Entiendo, abrir WhatsApp/ }).click(); await comp.p.waitForTimeout(400);
  const abierto = await comp.p.evaluate(() => window.__abierto);
  if (!/wa\.me/.test(abierto)) throw new Error("no abrió WhatsApp tras aceptar");
});
await paso(comp.p, "Reportar al vendedor desde la ficha del lote", async () => {
  await comp.p.goto(BASE + "/marketplace/" + lote + "/"); await comp.p.waitForTimeout(4500);
  const bt = comp.p.getByRole("button", { name: "Reportar al vendedor" });
  await bt.evaluate((e) => e.scrollIntoView({ block: "center" })); await bt.click(); await comp.p.waitForTimeout(1500);
  const panel = comp.p.locator(".redcafe-rep-panel");
  if (!/Reportas a: Vera Vendedora/.test(await panel.innerText())) throw new Error("no indica a quién se reporta");
  await panel.locator("select[name=categoria]").selectOption("fraude");
  await panel.locator("input[name=asunto]").fill("Pidió adelanto");
  await panel.locator("textarea[name=detalle]").fill("Me pidió transferencia anticipada y luego dejó de responder.");
  await panel.getByRole("button", { name: "Enviar reporte" }).click(); await comp.p.waitForTimeout(2000);
  if (!/recibido/.test(await panel.innerText())) throw new Error("no se confirmó el reporte");
});

// ── Admin ──
const A = await contexto();
await A.api("/api/auth.php?action=admin_login", { pass: "x" });
const fpass = [path.join(path.dirname(path.resolve(SITIO)), ".redcafe_admin_pass"), path.join(SITIO, "data", ".redcafe_admin_pass")].find((f) => fs.existsSync(f));
await paso(A.p, "Admin › Reportes: ve al miembro reportado y abre su ficha", async () => {
  await A.p.goto(BASE + "/admin/"); await A.p.waitForTimeout(2000);
  await A.p.locator("input[type=password]").first().fill(fs.readFileSync(fpass, "utf8").trim());
  await A.p.getByRole("button", { name: /Entrar/ }).first().click(); await A.p.waitForTimeout(6000);
  await A.p.getByRole("button", { name: /^Reportes$/ }).click(); await A.p.waitForTimeout(2500);
  const rep = A.p.locator("article").filter({ hasText: "Pidió adelanto" }).first();
  if (!/Miembro reportado: Vera Vendedora/.test(await rep.innerText())) throw new Error("no muestra al reportado");
  await rep.getByRole("button", { name: "Ver ficha y actuar" }).click(); await A.p.waitForTimeout(2500);
  const t = await rep.innerText();
  if (!/vera\.[a-z0-9]+@ejemplo\.test/.test(t) || !/Reportes recibidos \(1\)/.test(t)) throw new Error("ficha incompleta");
});
await paso(A.p, "Admin: suspende 7 días desde la ficha (debido proceso)", async () => {
  const rep = A.p.locator("article").filter({ hasText: "Pidió adelanto" }).first();
  await rep.getByRole("button", { name: "Suspender", exact: true }).click(); await A.p.waitForTimeout(500);
  await rep.locator("#ficha-inf").selectOption("fraude");
  await rep.getByText("Suspensión temporal", { exact: true }).click();
  await rep.locator("#ficha-dias").fill("7");
  await rep.locator("#ficha-hechos").fill("Pidió transferencia anticipada a un comprador y dejó de responder; consta en el reporte.");
  await rep.getByRole("button", { name: "Revisar y aplicar" }).click(); await A.p.waitForTimeout(500);
  await A.p.getByRole("dialog").getByRole("button", { name: "Aplicar y notificar" }).click(); await A.p.waitForTimeout(2500);
  const s = (await A.api("/api/moderacion.php?action=list")).data?.sanciones || [];
  if (!s.find((x) => x.uid === idV && x.tipo === "suspension")) throw new Error("no quedó la suspensión");
});
await paso(vend.p, "Vendedora: al entrar ve la medida y apela desde la misma pantalla", async () => {
  const L = await contexto();
  await L.p.goto(BASE + "/login/"); await L.p.waitForTimeout(1500);
  await L.p.locator("input[type=email]").first().fill(`vera.${S}@ejemplo.test`); await L.p.locator("input[type=password]").first().fill(PASS);
  await L.p.getByRole("button", { name: /Continuar|Entrar/i }).first().click(); await L.p.waitForTimeout(2500);
  const box = L.p.locator("section[aria-labelledby=sancion-titulo]");
  const t = await box.innerText();
  if (!/Suspensión temporal/.test(t) || !/Términos y Condiciones/.test(t)) throw new Error("no muestra la medida: " + t.slice(0, 80));
  await box.locator("#apelacion-texto").fill("No es cierto: el comprador canceló antes del pago y tengo los mensajes que lo prueban.");
  await box.getByRole("button", { name: "Enviar apelación" }).click(); await L.p.waitForTimeout(2000);
  if (!/apelación está registrada/.test(await box.innerText())) throw new Error("no se registró la apelación");
  await L.ctx.close();
});
await paso(A.p, "Admin › Cuentas: resuelve la apelación con resolución motivada", async () => {
  await A.p.getByRole("button", { name: /^Cuentas$/ }).click(); await A.p.waitForTimeout(1500);
  await A.p.getByRole("tab", { name: "Apelaciones pendientes" }).click(); await A.p.waitForTimeout(2000);
  await A.p.getByRole("button", { name: "Resolver apelación" }).first().click(); await A.p.waitForTimeout(400);
  await A.p.locator("#cuentas-resp").fill("Revisamos los mensajes aportados: el comprador canceló antes del pago. Se levanta la suspensión.");
  await A.p.getByRole("dialog").getByRole("button", { name: "Aceptar y levantar" }).click(); await A.p.waitForTimeout(2500);
  const r = await vend.api("/api/auth.php?action=login", { email: `vera.${S}@ejemplo.test`, pass: PASS });
  if (!r.ok) throw new Error("la vendedora sigue sin poder entrar: " + r.error);
});
await paso(A.p, "Admin › ficha: bloquea y desbloquea desde «Estado de la cuenta»", async () => {
  await A.p.getByRole("tab", { name: "Buscar miembro" }).click(); await A.p.waitForTimeout(500);
  await A.p.locator("#cuentas-buscar").fill(`vera.${S}`); await A.p.waitForTimeout(800);
  await A.p.getByRole("button", { name: /Vera Vendedora/ }).first().click(); await A.p.waitForTimeout(2500);
  const estado = A.p.locator("section[aria-labelledby='ficha-estado']");
  if (!/Acceso: Activa/.test(await estado.innerText())) throw new Error("no muestra la cuenta activa: " + (await estado.innerText()).slice(0, 80));
  await estado.getByRole("button", { name: "Bloquear", exact: true }).click(); await A.p.waitForTimeout(500);
  await A.p.locator("#ficha-inf").selectOption("fraude");
  if (!(await A.p.locator("input[name='ficha-tipo'][value='bloqueo']").isChecked())) throw new Error("no dejó elegido el bloqueo");
  await A.p.locator("#ficha-hechos").fill("Segundo intento comprobado de cobrar por adelantado sin enviar el café; reporte adjunto.");
  await A.p.locator("#ficha-evid").fill("reporte de prueba E2E");
  await A.p.getByRole("button", { name: "Revisar y aplicar" }).click(); await A.p.waitForTimeout(400);
  await A.p.getByRole("dialog").getByRole("button", { name: "Aplicar y notificar" }).click(); await A.p.waitForTimeout(2500);
  if (!/Acceso: Bloqueada/.test(await estado.innerText())) throw new Error("no quedó bloqueada");
  await estado.getByRole("button", { name: /Desbloquear/ }).click(); await A.p.waitForTimeout(400);
  await A.p.locator("#ficha-justif").fill("Aportó el comprobante de envío: el reporte no se sostiene.");
  await A.p.getByRole("dialog").getByRole("button", { name: "Levantar" }).click(); await A.p.waitForTimeout(2500);
  if (!/Acceso: Activa/.test(await estado.innerText())) throw new Error("no volvió a activa");
  const r = await vend.api("/api/auth.php?action=login", { email: `vera.${S}@ejemplo.test`, pass: PASS });
  if (!r.ok) throw new Error("tras desbloquear no puede entrar: " + r.error);
});
await paso(A.p, "Admin › ficha: nota interna y aviso a la campana", async () => {
  await A.p.locator("#ficha-nota").fill("Revisado el 24-oct: comprobante correcto.");
  await A.p.getByRole("button", { name: "Guardar nota" }).click(); await A.p.waitForTimeout(1500);
  if (!(await A.p.getByText("comprobante correcto", { exact: false }).count())) throw new Error("no se ve la nota");
  await A.p.getByRole("button", { name: "Aviso a su campana" }).click(); await A.p.waitForTimeout(300);
  await A.p.locator("#ficha-asunto").fill("Tu cuenta está activa");
  await A.p.locator("#ficha-mensaje").fill("Revisamos tu caso y tu cuenta sigue activa. Gracias por tu paciencia.");
  await A.p.getByRole("button", { name: "Enviar aviso" }).click(); await A.p.waitForTimeout(1500);
  const n = await vend.api("/api/notificaciones.php?action=list");
  if (!JSON.stringify(n.data || {}).includes("Tu cuenta está activa")) throw new Error("no le llegó el aviso");
});
await paso(comp.p, "Comprador: cierra su cuenta desde Mi cuenta (pedido cancelado antes)", async () => {
  const ped = (await comp.api("/api/pedidos.php?action=list")).data?.pedidos || [];
  for (const p of ped) await comp.api("/api/pedidos.php?action=cancelar", { nro: p.nro, motivo: "Prueba" });
  await comp.p.goto(BASE + "/panel/?ver=cuenta"); await comp.p.waitForTimeout(4000);
  const bt = comp.p.getByRole("button", { name: "Quiero cerrar mi cuenta" });
  await bt.evaluate((e) => e.scrollIntoView({ block: "center" })); await bt.click();
  await comp.p.locator("#baja-pass").fill(PASS); await comp.p.locator("#baja-conf").fill("ELIMINAR");
  await comp.p.getByRole("button", { name: "Cerrar mi cuenta definitivamente" }).click(); await comp.p.waitForTimeout(3500);
  if (!/cuenta=eliminada/.test(comp.p.url())) throw new Error("no terminó la baja: " + comp.p.url());
  const r = await comp.api("/api/auth.php?action=login", { email: `ciro.${S}@ejemplo.test`, pass: PASS });
  if (r.ok) throw new Error("la cuenta sigue entrando");
});

await b.close();
fs.writeFileSync(`${OUT}/resultado.json`, JSON.stringify({ pasos, errJS }, null, 1));
for (const x of pasos) console.log(`${x.ok ? "✔" : "✘"} ${String(x.n).padStart(2)} ${x.nombre} ${x.nota}`);
console.log(`${pasos.filter((x) => x.ok).length}/${pasos.length} · errores JS: ${errJS.length ? JSON.stringify(errJS) : 0}`);
