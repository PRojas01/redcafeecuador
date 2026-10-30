/* Red Café Ecuador — avisos del sistema operativo (Web Push) */
(function () {
  "use strict";

  var estado = "inicial";
  var mensaje = "";
  var subActual = null;
  var clavePublica = "";
  var montadoPanel = false;

  function soportado() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }

  function json(url, opciones) {
    var base = { credentials: "include", cache: "no-store" };
    opciones = opciones || {};
    Object.keys(opciones).forEach(function (k) { base[k] = opciones[k]; });
    return fetch(url, base).then(function (r) {
      return r.json().catch(function () { return { ok: false, status: r.status }; });
    }).catch(function () { return { ok: false }; });
  }

  function el(tag, attrs, texto) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
      if (k === "className") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }

  function b64urlAUint8Array(valor) {
    var relleno = "=".repeat((4 - valor.length % 4) % 4);
    var base64 = (valor + relleno).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(base64);
    var salida = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) salida[i] = raw.charCodeAt(i);
    return salida;
  }

  function textoEstado() {
    if (Notification.permission === "denied") return "Permiso bloqueado en el navegador.";
    if (estado === "suscrito") return mensaje || "Activo: los avisos llegan a este teléfono aunque la página esté cerrada.";
    if (estado === "cargando") return "Revisando avisos del teléfono...";
    if (estado === "error") return mensaje || "No se pudo actualizar.";
    return "Enterate de pedidos y mensajes aunque no tengas la página abierta.";
  }

  function renderizarCaja(nodo, compacto) {
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
    // Ya activo: una línea discreta. Sin activar: el recuadro que invita a hacerlo.
    nodo.className = "redcafe-push redcafe-push-seccion" + (compacto ? " es-activo" : "");
    nodo.setAttribute("data-redcafe-propio", "1");

    var texto = el("div", { className: "redcafe-push-texto" });
    texto.appendChild(el("strong", {}, "Avisos en este teléfono"));
    texto.appendChild(el("span", {}, textoEstado()));
    nodo.appendChild(texto);

    var acciones = el("div", { className: "redcafe-push-acciones" });
    if (Notification.permission === "denied") {
      acciones.appendChild(el("span", { className: "redcafe-push-ayuda" }, "Actívalos desde permisos del sitio."));
    } else if (estado === "suscrito") {
      acciones.appendChild(boton("Desactivar", desactivar));
      acciones.appendChild(boton("Enviar prueba", probar, "secundario"));
    } else {
      acciones.appendChild(boton("Activar", activar));
    }
    nodo.appendChild(acciones);
  }

  function boton(txt, fn, tipo) {
    var b = el("button", { type: "button", className: "redcafe-push-btn" + (tipo ? " es-" + tipo : "") }, txt);
    b.disabled = estado === "cargando";
    b.addEventListener("click", function (ev) {
      ev.preventDefault();
      fn();
    });
    return b;
  }

  function renderizar() {
    Array.prototype.slice.call(document.querySelectorAll("[data-redcafe-push='1']")).forEach(function (n) {
      renderizarCaja(n, estado === "suscrito");
    });
  }

  function asegurarPanel() {
    if (window.location.pathname.indexOf("/panel") !== 0) return;
    // `montadoPanel` se reinicia en cada cambio de ruta, y React vuelve a
    // montar el panel: sin mirar el documento salían dos cajas iguales.
    var existente = document.querySelector("main [data-redcafe-push='1']");
    if (existente) { montadoPanel = true; return; }
    if (montadoPanel) return;
    var destino = document.getElementById("redcafe-panel-avisos")
      || document.getElementById("redcafe-panel-accion")
      || document.querySelector("main [data-redcafe-propio]");
    if (!destino || !destino.parentNode) return;
    var caja = el("section", { "data-redcafe-push": "1" });
    destino.insertAdjacentElement("afterend", caja);
    montadoPanel = true;
    renderizarCaja(caja, false);
  }

  function montar() {
    if (!soportado()) return;
    // Solo dentro del panel. En la cabecera estorbaba y se repetía en las 61
    // páginas; aquí lo ve quien está gestionando su cuenta.
    asegurarPanel();
  }

  function obtenerClave() {
    if (clavePublica) return Promise.resolve(clavePublica);
    return json("/api/push.php?action=clave").then(function (res) {
      if (!res || !res.ok || !res.data || !res.data.publica) throw new Error("Sin clave push.");
      clavePublica = res.data.publica;
      return clavePublica;
    });
  }

  function obtenerRegistro() {
    // Ojo: serviceWorker.ready no se rechaza nunca. Si nadie ha registrado el
    // worker todavía se queda colgada para siempre y el botón se quedaría en
    // "Revisando...". Por eso se registra primero y se corta a los 8 segundos.
    var listo = navigator.serviceWorker.getRegistration()
      .catch(function () { return null; })
      .then(function (reg) {
        if (reg) return navigator.serviceWorker.ready;
        return navigator.serviceWorker.register("/sw.js")
          .then(function () { return navigator.serviceWorker.ready; });
      });
    var corte = new Promise(function (_, rechazar) {
      setTimeout(function () { rechazar(new Error("El navegador no respondió.")); }, 8000);
    });
    return Promise.race([listo, corte]);
  }

  function refrescar() {
    if (!soportado()) return;
    estado = "cargando";
    renderizar();
    obtenerRegistro().then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      subActual = sub;
      estado = sub ? "suscrito" : "sin-suscribir";
      montar();
      renderizar();
    }).catch(function () {
      // Sin estado fiable se asume "sin activar": así el botón Activar sigue
      // disponible en vez de dejar la caja muerta.
      estado = "sin-suscribir";
      mensaje = "";
      montar();
      renderizar();
    });
  }

  function activar() {
    estado = "cargando";
    renderizar();
    Promise.resolve()
      .then(function () {
        if (Notification.permission === "granted") return "granted";
        return Notification.requestPermission();
      })
      .then(function (permiso) {
        if (permiso !== "granted") throw new Error("Permiso no concedido.");
        return Promise.all([obtenerRegistro(), obtenerClave()]);
      })
      .then(function (datos) {
        return datos[0].pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64urlAUint8Array(datos[1])
        });
      })
      .then(function (sub) {
        subActual = sub;
        return json("/api/push.php?action=suscribir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON())
        });
      })
      .then(function (res) {
        if (!res || !res.ok) throw new Error(res && res.error ? res.error : "No se pudo guardar.");
        estado = "suscrito";
        mensaje = "";
        renderizar();
      })
      .catch(function (err) {
        estado = "error";
        mensaje = err && err.message ? err.message : "No se pudo activar.";
        renderizar();
      });
  }

  function desactivar() {
    if (!subActual) return refrescar();
    estado = "cargando";
    renderizar();
    var endpoint = subActual.endpoint;
    subActual.unsubscribe().catch(function () {}).then(function () {
      return json("/api/push.php?action=baja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: endpoint })
      });
    }).then(function () {
      subActual = null;
      estado = "sin-suscribir";
      renderizar();
    });
  }

  function probar() {
    estado = "cargando";
    renderizar();
    json("/api/push.php?action=prueba", { method: "POST" }).then(function (res) {
      estado = "suscrito";
      mensaje = res && res.ok ? "Prueba enviada." : "No se pudo enviar la prueba.";
      renderizar();
    });
  }

  function arrancar() {
    if (!soportado()) return;
    json("/api/auth.php?action=me").then(function (res) {
      var u = res && res.ok && res.data && res.data.user;
      if (!u || !u.id) return;
      montar();
      refrescar();
      setTimeout(montar, 1200);
      setTimeout(montar, 3000);
    });
  }

  if (document.readyState === "complete") setTimeout(arrancar, 800);
  else window.addEventListener("load", function () { setTimeout(arrancar, 800); }, { once: true });

  ["pushState", "replaceState"].forEach(function (m) {
    var original = history[m];
    if (typeof original !== "function") return;
    history[m] = function () {
      var r = original.apply(this, arguments);
      setTimeout(function () { montadoPanel = false; montar(); }, 900);
      return r;
    };
  });
  window.addEventListener("popstate", function () {
    setTimeout(function () { montadoPanel = false; montar(); }, 900);
  });
})();
