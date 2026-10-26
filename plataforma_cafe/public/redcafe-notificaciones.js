/* Red Café Ecuador — avisos del miembro
   ------------------------------------------------------------------
   Una campana en la cabecera con lo que ha pasado mientras el miembro no
   estaba: pedidos nuevos, cambios de estado, mensajes, accesos a cursos.

   Regla del proyecto: nada de esto se inserta dentro de un nodo gestionado
   por React. La campana cuelga de `#redcafe-nav-extra` —un contenedor propio,
   hermano del <nav>, que crea redcafe-v60-final.js— y el panel, del <body>.
*/
(function () {
  "use strict";

  var SONDEO_MS = 120000;      // dos minutos: suficiente sin castigar el hosting
  var usuario = null;
  var boton = null;
  var globo = null;
  var panel = null;
  var abierto = false;
  var cargando = false;

  var ICONOS = {
    "pedido": "📦", "pedido-estado": "🚚", "mensaje": "💬",
    "curso": "🎓", "curso-acceso": "🔑", "lote": "🫘",
    "servicio": "🛠️", "miembro": "👤", "reporte": "⚠️", "sistema": "☕"
  };

  function json(url, opciones) {
    var base = { credentials: "include", cache: "no-store" };
    opciones = opciones || {};
    Object.keys(opciones).forEach(function (k) { base[k] = opciones[k]; });
    return fetch(url, base)
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false }; });
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

  // "hace 5 min", "ayer": una fecha ISO no dice nada de un vistazo.
  function cuando(iso) {
    var t = Date.parse(iso || "");
    if (!t) return "";
    var seg = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (seg < 60) return "hace un momento";
    if (seg < 3600) return "hace " + Math.round(seg / 60) + " min";
    if (seg < 86400) return "hace " + Math.round(seg / 3600) + " h";
    if (seg < 172800) return "ayer";
    if (seg < 2592000) return "hace " + Math.round(seg / 86400) + " días";
    return new Date(t).toLocaleDateString("es-EC", { day: "numeric", month: "short" });
  }

  /* ── Campana ─────────────────────────────────────────────────────── */

  function anclaje() {
    var extra = document.getElementById("redcafe-nav-extra");
    if (extra) return extra;
    // Si la cabecera aún no ha montado su contenedor propio, se crea uno
    // hermano del <nav>. Nunca se inserta dentro del <nav> de React.
    var nav = document.querySelector("header nav");
    if (!nav || !nav.parentNode) return null;
    var propio = document.createElement("div");
    propio.id = "redcafe-nav-extra";
    propio.className = "redcafe-nav-extra";
    nav.insertAdjacentElement("afterend", propio);
    return propio;
  }

  function montarCampana() {
    if (boton) return true;
    var destino = anclaje();
    if (!destino) return false;

    boton = el("button", {
      type: "button",
      className: "redcafe-avisos-boton",
      "aria-label": "Avisos",
      "aria-expanded": "false",
      "data-redcafe-propio": "1"
    });
    boton.appendChild(el("span", { className: "redcafe-avisos-icono", "aria-hidden": "true" }, "🔔"));
    globo = el("span", { className: "redcafe-avisos-globo", hidden: "hidden" }, "0");
    boton.appendChild(globo);
    boton.addEventListener("click", function (ev) {
      ev.preventDefault();
      abierto ? cerrar() : abrir();
    });
    destino.appendChild(boton);
    return true;
  }

  function pintarContador(n) {
    if (!globo) return;
    if (n > 0) {
      globo.textContent = n > 99 ? "99+" : String(n);
      globo.hidden = false;
      boton.classList.add("tiene-avisos");
      boton.setAttribute("aria-label", n === 1 ? "1 aviso sin leer" : n + " avisos sin leer");
    } else {
      globo.hidden = true;
      boton.classList.remove("tiene-avisos");
      boton.setAttribute("aria-label", "Avisos");
    }
  }

  function contar() {
    if (!usuario) return;
    json("/api/notificaciones.php?action=contador").then(function (res) {
      if (res && res.ok && res.data) pintarContador(Number(res.data.sin_leer) || 0);
    });
  }

  /* ── Panel ───────────────────────────────────────────────────────── */

  function montarPanel() {
    if (panel) return panel;
    panel = el("div", {
      id: "redcafe-avisos-panel",
      className: "redcafe-avisos-panel",
      role: "dialog",
      "aria-label": "Tus avisos",
      hidden: "hidden"
    });
    var cabecera = el("div", { className: "redcafe-avisos-cabecera" });
    cabecera.appendChild(el("h2", {}, "Avisos"));
    var todos = el("button", { type: "button", className: "redcafe-avisos-todos" }, "Marcar todo como leído");
    todos.addEventListener("click", marcarTodos);
    cabecera.appendChild(todos);
    var cerrarBtn = el("button", { type: "button", className: "redcafe-avisos-cerrar", "aria-label": "Cerrar avisos" }, "×");
    cerrarBtn.addEventListener("click", cerrar);
    cabecera.appendChild(cerrarBtn);
    panel.appendChild(cabecera);
    panel.appendChild(el("div", { className: "redcafe-avisos-lista" }));
    document.body.appendChild(panel);
    return panel;
  }

  function tarjeta(a) {
    var destino = typeof a.enlace === "string" && /^\/(?!\/)/.test(a.enlace) && a.enlace.indexOf("..") === -1
      ? a.enlace : "";
    var art = el("article", {
      className: "redcafe-aviso" + (a.leido ? "" : " es-nuevo"),
      "data-id": a.id || ""
    });
    art.appendChild(el("span", { className: "redcafe-aviso-icono", "aria-hidden": "true" },
      ICONOS[a.tipo] || ICONOS.sistema));

    var cuerpo = el(destino ? "a" : "div", {
      className: "redcafe-aviso-cuerpo" + (destino ? " redcafe-aviso-enlace" : ""),
      href: destino || null
    });
    cuerpo.appendChild(el("span", { className: "redcafe-aviso-titulo" }, a.titulo || ""));
    if (a.texto) cuerpo.appendChild(el("p", { className: "redcafe-aviso-texto" }, a.texto));
    cuerpo.appendChild(el("time", { className: "redcafe-aviso-fecha", datetime: a.ts || "" }, cuando(a.ts)));
    if (destino) {
      cuerpo.appendChild(el("span", { className: "redcafe-aviso-accion" },
        a.tipo === "curso" || a.tipo === "curso-acceso" ? "Ver curso →" : "Ver contenido →"));
      cuerpo.addEventListener("click", function () { marcar(a.id, true); });
      art.addEventListener("click", function (ev) {
        if (!cuerpo.contains(ev.target) && !ev.target.closest(".redcafe-aviso-quitar")) cuerpo.click();
      });
    }
    art.appendChild(cuerpo);

    var quitar = el("button", { type: "button", className: "redcafe-aviso-quitar", "aria-label": "Quitar este aviso" }, "×");
    quitar.addEventListener("click", function (ev) { ev.stopPropagation(); borrar(a.id, art); });
    art.appendChild(quitar);
    return art;
  }

  function pintar(avisos) {
    var lista = panel.querySelector(".redcafe-avisos-lista");
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    if (!avisos.length) {
      lista.appendChild(el("p", { className: "redcafe-avisos-vacio" },
        "No tienes avisos. Aquí verás tus pedidos, tus mensajes y lo que pase con tus publicaciones."));
      return;
    }
    avisos.forEach(function (a) { lista.appendChild(tarjeta(a)); });
  }

  function cargar() {
    if (cargando) return;
    cargando = true;
    var lista = panel.querySelector(".redcafe-avisos-lista");
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    lista.appendChild(el("p", { className: "redcafe-avisos-vacio" }, "Cargando…"));
    json("/api/notificaciones.php?action=list&limite=30").then(function (res) {
      cargando = false;
      var datos = res && res.ok && res.data ? res.data : { notificaciones: [], sin_leer: 0 };
      pintar(Array.isArray(datos.notificaciones) ? datos.notificaciones : []);
      pintarContador(Number(datos.sin_leer) || 0);
    });
  }

  function marcar(id, persistirDuranteNavegacion) {
    if (!id) return;
    json("/api/notificaciones.php?action=leer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
      keepalive: !!persistirDuranteNavegacion
    }).then(contar);
  }

  function marcarTodos() {
    json("/api/notificaciones.php?action=leer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todos: true })
    }).then(function () {
      Array.prototype.slice.call(panel.querySelectorAll(".redcafe-aviso")).forEach(function (n) {
        n.classList.remove("es-nuevo");
      });
      pintarContador(0);
    });
  }

  function borrar(id, nodo) {
    if (!id) return;
    json("/api/notificaciones.php?action=borrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id })
    }).then(function (res) {
      if (res && res.ok && nodo && nodo.parentNode) nodo.parentNode.removeChild(nodo);
      contar();
    });
  }

  function abrir() {
    montarPanel();
    panel.hidden = false;
    abierto = true;
    boton.setAttribute("aria-expanded", "true");
    cargar();
    // Abrir la bandeja cuenta como haberla mirado: el contador se pone a cero
    // cuando el miembro cierra, no antes, para que alcance a leer qué había.
  }

  function cerrar() {
    if (!panel) return;
    panel.hidden = true;
    abierto = false;
    if (boton) boton.setAttribute("aria-expanded", "false");
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && abierto) cerrar();
  });

  document.addEventListener("click", function (ev) {
    if (!abierto || !panel) return;
    if (panel.contains(ev.target)) return;
    if (boton && boton.contains(ev.target)) return;
    cerrar();
  });

  /* ── Arranque ────────────────────────────────────────────────────── */

  function iniciar() {
    json("/api/auth.php?action=me").then(function (res) {
      usuario = res && res.ok && res.data && res.data.user;
      if (!usuario || !usuario.id) return;

      // La cabecera la monta React tras hidratar: se reintenta unas cuantas
      // veces en lugar de dar por perdida la campana al primer fallo.
      var intentos = 0;
      var reloj = setInterval(function () {
        intentos++;
        if (montarCampana() || intentos > 20) {
          clearInterval(reloj);
          if (boton) contar();
        }
      }, 500);

      setInterval(function () {
        if (!document.hidden) contar();
      }, SONDEO_MS);
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) contar();
      });
    });
  }

  if (document.readyState === "complete") setTimeout(iniciar, 600);
  else window.addEventListener("load", function () { setTimeout(iniciar, 600); }, { once: true });
})();
