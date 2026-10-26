(function () {
  "use strict";

  var scriptSrc = (document.currentScript && document.currentScript.getAttribute("src")) || "/redcafe-mejoras-ui.js";
  var BASE = scriptSrc.replace(/\/redcafe-mejoras-ui\.js(?:\?.*)?$/, "");
  var API = (BASE || "") + "/api";
  var PATH = window.location.pathname;

  function getSession() {
    try {
      var raw = localStorage.getItem("redcafe_sesion") || sessionStorage.getItem("redcafe_sesion");
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function isAdmin(u) {
    if (!u) return false;
    var roles = [];
    if (Array.isArray(u.roles)) roles = u.roles;
    else if (typeof u.rol === "string") roles = [u.rol];
    else if (u.rol) roles = [u.rol];
    return roles.indexOf("admin") !== -1;
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function limpiarCachesDeVersion() {
    if (!("fetch" in window)) return;
    fetch("/redcafe-version.json?_=" + Date.now(), { cache: "no-store", credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) {
        var version = info && info.version ? String(info.version) : "";
        if (!version) return;
        var key = "redcafe_asset_version";
        var anterior = "";
        try { anterior = localStorage.getItem(key) || ""; } catch (_) {}
        if (anterior === version) {
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "REDCF_CLEAR_OLD_CACHES", version: version });
          }
          return;
        }

        var limpieza = Promise.resolve();
        if (window.caches && caches.keys) {
          limpieza = caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) {
              return k.indexOf("redcafe-") === 0 && k.indexOf(version) === -1 ? caches.delete(k) : false;
            }));
          });
        }
        limpieza.then(function () {
          try { localStorage.setItem(key, version); } catch (_) {}
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "REDCF_CLEAR_OLD_CACHES", version: version });
          }
          if (anterior && !sessionStorage.getItem("redcafe_reloaded_" + version)) {
            sessionStorage.setItem("redcafe_reloaded_" + version, "1");
            location.reload();
          }
        });
      })
      .catch(function () {});
  }

  function $all(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function patchMarketplacePublicarLote() {
    var u = getSession();
    if (!u) return;
    $all('a[href*="/afiliate/?rol=productor"]').forEach(function (a) {
      if (a.textContent && a.textContent.indexOf("Publicar un lote") !== -1) {
        a.setAttribute("href", "/panel/?ver=publicar");
      }
    });
  }

  function patchAffiliateDetectSession() {
    var u = getSession();
    if (!u) return;
    if (PATH.indexOf("/afiliate") !== 0) return;

    var existing = document.getElementById("redcafe-sesion-activa");
    if (existing) existing.parentNode.removeChild(existing);

    var nombre = (u.nombre || u.name || "miembro");
    var banner = document.createElement("div");
    banner.id = "redcafe-sesion-activa";
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#1f6f3f;color:#fff;padding:18px 24px;text-align:center;font-family:system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.15)";
    var inner = document.createElement("div");
    inner.style.cssText = "max-width:720px;margin:0 auto";
    var strong = document.createElement("strong");
    strong.style.cssText = "display:block;font-size:16px;margin-bottom:6px";
    strong.textContent = "Ya eres parte de la Red";
    var span = document.createElement("span");
    span.style.cssText = "font-size:14px;opacity:.9";
    span.textContent = "Hola, " + nombre + ". Estás autenticado. Te llevamos a tu panel para publicar.";
    var links = document.createElement("div");
    links.style.cssText = "margin-top:10px";
    var a1 = document.createElement("a");
    a1.href = "/panel/?ver=publicar";
    a1.textContent = "Ir al panel";
    a1.style.cssText = "background:#fff;color:#1f6f3f;padding:8px 18px;border-radius:6px;font-weight:600;text-decoration:none;margin-right:8px";
    var a2 = document.createElement("a");
    a2.href = "/panel";
    a2.textContent = "Mi Red";
    a2.style.cssText = "border:1px solid #fff;color:#fff;padding:8px 18px;border-radius:6px;font-weight:600;text-decoration:none";
    links.appendChild(a1);
    links.appendChild(a2);
    inner.appendChild(strong);
    inner.appendChild(span);
    inner.appendChild(links);
    banner.appendChild(inner);
    document.body.appendChild(banner);
  }

  function marketplaceEditOverlay() {
    var u = getSession();
    if (!u) return;
    if (PATH.indexOf("/marketplace") !== 0) return;
    var admin = isAdmin(u);

    var apply = function () {
      var cards = $all("#lotes-grid article, #servicios-grid article");
      if (!cards.length) return;
      cards.forEach(function (card) {
        if (card.querySelector(".redcafe-edit-overlay")) return;
        var titleEl = card.querySelector("h3");
        if (!titleEl) return;
        var id = card.getAttribute("data-id") || "";
        if (!id) return;
        var canEdit = admin;
        if (!canEdit) return;
        var btn = document.createElement("button");
        btn.className = "redcafe-edit-overlay";
        btn.type = "button";
        btn.textContent = "Editar";
        btn.style.cssText = "margin-top:8px;padding:6px 12px;background:#1f6f3f;color:#fff;border:0;border-radius:6px;font-size:12px;cursor:pointer;font-family:system-ui";
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var isServicio = card.closest("#servicios-grid") !== null;
          window.location.href = "/panel/?ver=publicar&editar=" + encodeURIComponent(id) + "&tipo=" + (isServicio ? "servicio" : "lote");
        });
        var body = card.querySelector("div") || card;
        body.appendChild(btn);
      });
    };

    apply();
    setTimeout(apply, 1500);
    setTimeout(apply, 3500);
  }

  function init() {
    try { limpiarCachesDeVersion(); } catch (e) {}
    try { patchMarketplacePublicarLote(); } catch (e) {}
    try { patchAffiliateDetectSession(); } catch (e) {}
    try { marketplaceEditOverlay(); } catch (e) {}
  }

  function stableInit() {
    setTimeout(init, 2600);
  }

  if (document.readyState === "complete") stableInit();
  else window.addEventListener("load", stableInit, { once: true });
})();
