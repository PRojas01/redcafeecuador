/* Red Cafe Ecuador - reportes de problemas de usuarios */
(function () {
  "use strict";

  var WHATSAPP_ADMIN = "593968641376";
  var categorias = [
    ["acceso", "Acceso"],
    ["pago", "Pago"],
    ["publicacion", "Publicación"],
    ["pedido", "Pedido"],
    ["contenido", "Contenido"],
    ["contacto-sospechoso", "Contacto sospechoso"],
    ["otro", "Otro"]
  ];
  var user = null;
  var root = null;
  var panel = null;
  var lastFocus = null;

  function json(url, opciones) {
    var opts = { credentials: "include", cache: "no-store" };
    opciones = opciones || {};
    Object.keys(opciones).forEach(function (k) { opts[k] = opciones[k]; });
    return fetch(url, opts)
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: "No se pudo conectar." }; });
  }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
      if (k === "className") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function injectStyles() {
    if (document.getElementById("redcafe-reportes-style")) return;
    var s = el("style", { id: "redcafe-reportes-style" });
    s.textContent = ""
      + ".redcafe-rep-fab{position:fixed;left:18px;right:auto;bottom:18px;z-index:9998;max-width:calc(100vw - 112px);border:0;border-radius:999px;background:#1f5f4a;color:#fff;padding:9px 12px;font:600 13px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 22px rgba(0,0,0,.2);cursor:pointer;white-space:nowrap}"
      + ".redcafe-rep-fab:focus,.redcafe-rep-close:focus,.redcafe-rep-submit:focus{outline:3px solid rgba(31,95,74,.28);outline-offset:2px}"
      + ".redcafe-rep-backdrop{position:fixed;inset:0;z-index:9999;background:rgba(15,23,20,.38);display:flex;align-items:flex-end;justify-content:flex-end;padding:18px}"
      + ".redcafe-rep-panel{width:min(440px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#fff;color:#1c2722;border-radius:8px;box-shadow:0 18px 60px rgba(0,0,0,.26);font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}"
      + ".redcafe-rep-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #e5e9e6}"
      + ".redcafe-rep-head h3{margin:0;font-size:18px;line-height:1.2}.redcafe-rep-close{border:0;background:transparent;font-size:26px;line-height:1;cursor:pointer;color:#425047}"
      + ".redcafe-rep-body{padding:16px 18px 18px}.redcafe-rep-label{display:block;margin:0 0 12px;font-weight:650;color:#27352e}.redcafe-rep-label span{display:block;margin-bottom:5px}"
      + ".redcafe-rep-input,.redcafe-rep-select,.redcafe-rep-textarea{box-sizing:border-box;width:100%;border:1px solid #cbd5cf;border-radius:6px;background:#fff;color:#17211c;padding:9px 10px;font:14px/1.35 inherit}"
      + ".redcafe-rep-textarea{resize:vertical;min-height:118px}.redcafe-rep-row{display:flex;justify-content:flex-end;gap:10px;align-items:center;margin-top:14px}.redcafe-rep-submit{border:0;border-radius:6px;background:#1f5f4a;color:#fff;padding:10px 14px;font-weight:700;cursor:pointer}"
      + ".redcafe-rep-submit:disabled{opacity:.65;cursor:wait}.redcafe-rep-status{min-height:20px;color:#5d6a62}.redcafe-rep-status.is-error{color:#a33122}.redcafe-rep-ok{border-top:1px solid #e5e9e6;margin-top:14px;padding-top:14px}.redcafe-rep-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.redcafe-rep-links a{border-radius:6px;background:#edf5f0;color:#164832;text-decoration:none;padding:8px 10px;font-weight:650}"
      + ".redcafe-mis-reportes{margin:24px 0;padding:18px;border:1px solid #e2e8e4;border-radius:8px;background:#fff;color:#17211c;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}.redcafe-mis-reportes h3{margin:0 0 12px;font-size:19px}.redcafe-mis-lista{display:grid;gap:10px}.redcafe-mis-card{border:1px solid #e2e8e4;border-radius:8px;padding:12px;background:#fbfcfb}.redcafe-mis-card h4{margin:0 0 4px;font-size:15px}.redcafe-mis-meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;color:#5c6a61}.redcafe-mis-estado{font-weight:750;color:#1f5f4a}.redcafe-mis-resp{margin-top:8px;padding-top:8px;border-top:1px solid #e2e8e4}.redcafe-mis-vacio{color:#5c6a61}"
      + "@media(max-width:560px){.redcafe-rep-backdrop{padding:10px}.redcafe-rep-panel{max-height:calc(100vh - 20px)}.redcafe-rep-fab{left:12px;right:auto;bottom:12px;max-width:calc(100vw - 92px);padding:8px 10px;font-size:12px}}";
    document.head.appendChild(s);
  }

  function abrirPanel() {
    if (panel) return;
    lastFocus = document.activeElement;
    var backdrop = el("div", { className: "redcafe-rep-backdrop" });
    var box = el("section", {
      className: "redcafe-rep-panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Reportar un problema"
    });
    var head = el("div", { className: "redcafe-rep-head" });
    head.appendChild(el("h3", {}, "Reportar un problema"));
    var close = el("button", { type: "button", className: "redcafe-rep-close", "aria-label": "Cerrar" }, "×");
    head.appendChild(close);
    box.appendChild(head);

    var body = el("div", { className: "redcafe-rep-body" });
    var form = el("form");
    form.appendChild(labelSelect());
    form.appendChild(labelInput("asunto", "Asunto", "text", 120));
    form.appendChild(labelTextarea());
    var urlLabel = labelInput("url", "URL", "text", 300);
    urlLabel.querySelector("input").value = location.pathname + location.search;
    form.appendChild(urlLabel);

    var row = el("div", { className: "redcafe-rep-row" });
    var status = el("span", { className: "redcafe-rep-status", role: "status", "aria-live": "polite" });
    var submit = el("button", { type: "submit", className: "redcafe-rep-submit" }, "Enviar reporte");
    row.appendChild(status);
    row.appendChild(submit);
    form.appendChild(row);
    body.appendChild(form);
    box.appendChild(body);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    panel = backdrop;

    close.addEventListener("click", cerrarPanel);
    backdrop.addEventListener("click", function (ev) { if (ev.target === backdrop) cerrarPanel(); });
    form.addEventListener("submit", function (ev) { enviar(ev, form, status, submit); });
    setTimeout(function () {
      var first = box.querySelector("select, input, textarea, button");
      if (first) first.focus();
    }, 0);
  }

  function cerrarPanel() {
    if (!panel) return;
    panel.parentNode.removeChild(panel);
    panel = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function labelSelect() {
    var label = el("label", { className: "redcafe-rep-label" });
    label.appendChild(el("span", {}, "Categoría"));
    var select = el("select", { name: "categoria", className: "redcafe-rep-select", required: "required" });
    categorias.forEach(function (c) { select.appendChild(el("option", { value: c[0] }, c[1])); });
    label.appendChild(select);
    return label;
  }

  function labelInput(name, title, type, max) {
    var label = el("label", { className: "redcafe-rep-label" });
    label.appendChild(el("span", {}, title));
    label.appendChild(el("input", { name: name, type: type, maxlength: String(max), className: "redcafe-rep-input", required: name !== "url" ? "required" : null }));
    return label;
  }

  function labelTextarea() {
    var label = el("label", { className: "redcafe-rep-label" });
    label.appendChild(el("span", {}, "Detalle"));
    label.appendChild(el("textarea", { name: "detalle", maxlength: "2000", rows: "6", className: "redcafe-rep-textarea", required: "required" }));
    return label;
  }

  function enviar(ev, form, status, submit) {
    ev.preventDefault();
    status.className = "redcafe-rep-status";
    status.textContent = "Enviando...";
    submit.disabled = true;
    json("/api/reportes.php?action=crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria: form.categoria.value,
        asunto: form.asunto.value,
        detalle: form.detalle.value,
        url: form.url.value
      })
    }).then(function (res) {
      submit.disabled = false;
      if (!res || !res.ok || !res.data || !res.data.reporte) {
        status.className = "redcafe-rep-status is-error";
        status.textContent = (res && res.error) || "No se pudo enviar.";
        return;
      }
      mostrarExito(form, res.data.reporte);
    });
  }

  function mostrarExito(form, reporte) {
    var msg = "Reporte #" + reporte.id + "\nCategoría: " + reporte.categoria + "\nAsunto: " + reporte.asunto + "\nDetalle: " + reporte.detalle;
    var box = el("div", { className: "redcafe-rep-ok" });
    box.appendChild(el("strong", {}, "Reporte #" + (reporte.id || "") + " recibido."));
    var links = el("div", { className: "redcafe-rep-links" });
    links.appendChild(el("a", { href: "/chat/" }, "Escribir al administrador por el chat interno"));
    links.appendChild(el("a", {
      target: "_blank",
      rel: "noreferrer",
      href: "https://wa.me/" + WHATSAPP_ADMIN + "?text=" + encodeURIComponent(msg)
    }, "Enviar por WhatsApp"));
    box.appendChild(links);
    form.parentNode.appendChild(box);
    form.reset();
  }

  function agregarBoton() {
    if (root) return;
    root = el("div", { id: "redcafe-reportes-root" });
    var btn = el("button", { type: "button", className: "redcafe-rep-fab" }, "¿Un problema?");
    btn.addEventListener("click", abrirPanel);
    root.appendChild(btn);
    document.body.appendChild(root);
  }

  function pintarMisReportes(reportes) {
    if (location.pathname.indexOf("/panel") !== 0) return;
    if (document.getElementById("redcafe-mis-reportes")) return;
    var wrap = el("section", { id: "redcafe-mis-reportes", className: "redcafe-mis-reportes", "data-redcafe-propio": "1" });
    wrap.appendChild(el("h3", {}, "Mis reportes"));
    var lista = el("div", { className: "redcafe-mis-lista" });
    wrap.appendChild(lista);
    if (!reportes.length) {
      lista.appendChild(el("p", { className: "redcafe-mis-vacio" }, "No tienes reportes registrados."));
    } else {
      reportes.forEach(function (r) {
        lista.appendChild(tarjetaReporte(r));
      });
    }
    // Colgarlo del <body> lo dejaba suelto detrás del pie de página. Va
    // dentro del <main> del panel, delante del bloque de recursos, que es el
    // que cierra la página. Nunca DENTRO de un nodo de React: se añade como
    // hijo propio del main, sin tocar los que ya están.
    var main = document.querySelector("main");
    var recursos = document.getElementById("redcafe-panel-resources");
    if (main && recursos && recursos.parentNode === main) main.insertBefore(wrap, recursos);
    else if (main) main.appendChild(wrap);
    else document.body.appendChild(wrap);
  }

  function tarjetaReporte(r) {
    var card = el("article", { className: "redcafe-mis-card" });
    card.appendChild(el("h4", {}, r.asunto || "Reporte"));
    var meta = el("div", { className: "redcafe-mis-meta" });
    meta.appendChild(el("span", {}, "#" + (r.id || "")));
    meta.appendChild(el("span", {}, r.categoria || ""));
    meta.appendChild(el("span", { className: "redcafe-mis-estado" }, r.estado || ""));
    card.appendChild(meta);
    card.appendChild(el("p", {}, r.detalle || ""));
    var hist = Array.isArray(r.historial) ? r.historial : [];
    hist.forEach(function (h) {
      if (!h.respuesta) return;
      var resp = el("div", { className: "redcafe-mis-resp" });
      resp.appendChild(el("strong", {}, h.nombre || "Administración"));
      resp.appendChild(el("p", {}, h.respuesta || ""));
      card.appendChild(resp);
    });
    return card;
  }

  function cargarMisReportes() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    json("/api/reportes.php?action=mios").then(function (res) {
      var lista = res && res.ok && res.data && Array.isArray(res.data.reportes) ? res.data.reportes : [];
      pintarMisReportes(lista);
    });
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") cerrarPanel();
  });

  function iniciar() {
    json("/api/auth.php?action=me").then(function (res) {
      user = res && res.ok && res.data ? res.data.user : null;
      if (!user) return;
      injectStyles();
      agregarBoton();
      // El panel lo pinta React después de hidratar: si se busca el <main>
      // demasiado pronto, la sección no encuentra dónde colocarse.
      [1200, 3000, 5000].forEach(function (t) { setTimeout(cargarMisReportes, t); });
    });
  }

  if (document.readyState === "complete") setTimeout(iniciar, 800);
  else window.addEventListener("load", function () { setTimeout(iniciar, 800); }, { once: true });
  // Next navega sin recargar: hay que volver a montar al cambiar de ruta.
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 1000); });
}());
