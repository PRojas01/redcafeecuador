(function () {
  "use strict";

  var scriptSrc = document.currentScript && document.currentScript.getAttribute("src") || "/admin-visual-runtime.js";
  var BASE_PATH = scriptSrc.replace(/\/admin-visual-runtime\.js(?:\?.*)?$/, "");
  var CONFIG_URL = (BASE_PATH || "") + "/api/visual.php?action=published";
  var STYLE_ID = "redcafe-admin-visual-runtime";

  function safeQuery(selector) {
    try {
      return Array.prototype.slice.call(document.querySelectorAll(selector));
    } catch (e) {
      return [];
    }
  }

  function setText(item) {
    safeQuery(item.selector).forEach(function (el) {
      el.textContent = String(item.texto || "");
    });
  }

  function setImage(item) {
    safeQuery(item.selector).forEach(function (el) {
      if (item.src) el.setAttribute("src", item.src);
      if (typeof item.alt === "string") el.setAttribute("alt", item.alt);
    });
  }

  function setLink(item) {
    safeQuery(item.selector).forEach(function (el) {
      if (item.href) el.setAttribute("href", item.href);
      if (item.texto) el.textContent = item.texto;
    });
  }

  function applyStyles(config) {
    var css = [];
    var tokens = config.tokens || {};
    Object.keys(tokens).forEach(function (name) {
      document.documentElement.style.setProperty(name, tokens[name]);
    });
    (config.css_seguro || []).forEach(function (rule) {
      css.push(rule.selector + "{" + rule.propiedad + ":" + rule.valor + "!important}");
    });
    if (config.bloques && config.bloques.marketplace_compacto_seguro) {
      css.push("#lotes-grid,#servicios-grid{gap:1rem!important;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))!important;align-items:stretch!important}");
      css.push("#lotes-grid article,#servicios-grid article{min-width:0!important;height:100%!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}");
      css.push("#lotes-grid article>div,#servicios-grid article>div{min-width:0!important;display:flex!important;flex:1 1 auto!important;flex-direction:column!important;padding:.8rem!important}");
      css.push("#lotes-grid h3,#servicios-grid h3,#lotes-grid p,#servicios-grid p{overflow-wrap:anywhere!important}");
      css.push("#lotes-grid .mt-2.flex,#lotes-grid .mt-3.flex,#servicios-grid .mt-2.flex,#servicios-grid .mt-3.flex{flex-wrap:wrap!important;margin-top:auto!important}");
      css.push("#lotes-grid .btn-primary,#lotes-grid .btn-ghost,#servicios-grid .btn-primary,#servicios-grid .btn-ghost{min-width:6.5rem!important;flex:1 1 6.5rem!important;white-space:normal!important}");
    }
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = css.join("\n");
  }

  function applyVisualConfig(config) {
    if (!config || typeof config !== "object") return;
    applyStyles(config);
    (config.textos || []).forEach(setText);
    (config.imagenes || []).forEach(setImage);
    (config.links || []).forEach(setLink);
    document.documentElement.dataset.redcafeVisualVersion = String(config.version || "");
  }

  function readPreviewConfig() {
    try {
      var raw = sessionStorage.getItem("redcafe_visual_preview");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function load() {
    var preview = readPreviewConfig();
    if (preview) {
      applyVisualConfig(preview);
      return;
    }
    fetch(CONFIG_URL, { credentials: "include" })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok) applyVisualConfig(j.data); })
      .catch(function () {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
  window.redcafeApplyVisualConfig = applyVisualConfig;
})();

(function () {
  try {
    var basePath = (document.currentScript && document.currentScript.getAttribute("src") || "/admin-visual-runtime.js").replace(/\/admin-visual-runtime\.js(?:\?.*)?$/, "");
    var src = (basePath || "") + "/redcafe-mejoras-ui.js";
    var s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.defer = false;
    s.setAttribute("data-redcafe-patch", "1");
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
})();
