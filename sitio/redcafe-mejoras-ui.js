(function () {
  "use strict";

  // Solo queda la limpieza de cachés al cambiar de versión. Los parches sobre
  // React (enlace «Publicar lote», aviso de sesión en /afiliate/, botón Editar
  // del marketplace) ya están en React.

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

  function init() {
    try { limpiarCachesDeVersion(); } catch (e) {}
  }

  function stableInit() {
    setTimeout(init, 2600);
  }

  if (document.readyState === "complete") stableInit();
  else window.addEventListener("load", stableInit, { once: true });
})();
