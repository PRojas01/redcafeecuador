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

  // La version se toma de la etiqueta que carga ESTE archivo. Antes estaba
  // escrita a mano y se quedaba atras en cada publicacion: los miembros seguian
  // con el redcafe-recordatorios.js viejo en cache.
  var versionActual = (function () {
    var propio = document.currentScript ||
      document.querySelector('script[src*="redcafe-notificaciones.js"]');
    var m = propio && propio.src ? propio.src.match(/[?&]v=([^&]+)/) : null;
    return m ? m[1] : "";
  })();

  var recordatoriosScript = document.createElement('script');
  recordatoriosScript.src = '/redcafe-recordatorios.js' +
    (versionActual ? '?v=' + versionActual : '');
  recordatoriosScript.onload = function () {
    if (boton && window.RedCafeRecordatorios) window.RedCafeRecordatorios.resumen(boton, usuario);
  };
  document.head.appendChild(recordatoriosScript);

  var SONDEO_MS = 120000;      // dos minutos: suficiente sin castigar el hosting
  var usuario = null;

  // GUARDA DE UNIFICACIÓN 20260916d (decisión del dueño: carril usa redcafe-notif-*)
  // El sistema previo redcafe-avisos-* queda disponible pero NO monta su campana
  // propia para evitar doble FAB. Conservamos todo el código y la API pública.
  var carrilUsaNotif = !!(window.RedCafeNotif && window.RedCafeNotif.usaServidor === true);
  if (!carrilUsaNotif) {
    var estiloCompat = document.createElement('style');
    estiloCompat.textContent = '#redcafe-notif-fab,#redcafe-notif-panel{display:none!important}';
    document.head.appendChild(estiloCompat);
  }
  window.RedCafeAvisosCompat = { activo: false, motivo: carrilUsaNotif ? "unificado-en-redcafe-notif" : "compat" };
  function construirCampana() {
    if (carrilUsaNotif) { return false; } // campaña unificada: no duplicar FAB
    return montarCampana(true);
  }

  var boton = null;
  var globo = null;
  var panel = null;
  var abierto = false;
  var cargando = false;
  var avisosSinLeer = 0;
  var recordatoriosPendientes = 0;
  var reintentosAdminSesion = 0;
  var timerAdminSesion = null;

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

  function rutaAdmin() {
    return window.location && window.location.pathname.indexOf("/admin") === 0;
  }

  function anclajeAdminFijo() {
    var existente = document.querySelector("[data-redcafe-avisos-admin-fijo='1']");
    if (existente) return existente;
    if (!rutaAdmin() || !document.body) return null;

    var propio = document.createElement("div");
    propio.className = "redcafe-avisos-admin-fijo";
    propio.setAttribute("data-redcafe-propio", "1");
    propio.setAttribute("data-redcafe-avisos-admin-fijo", "1");
    propio.style.position = "fixed";
    propio.style.top = "14px";
    propio.style.right = "14px";
    propio.style.zIndex = "2147483000";
    document.body.appendChild(propio);
    return propio;
  }

  function montarCampana(permitirAdminFijo) {
    if (carrilUsaNotif) { return false; } // unificado en redcafe-notif-*: esta puerta no monta

    if (boton) return true;
    var destino = anclaje();
    if (!destino && permitirAdminFijo) destino = anclajeAdminFijo();
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
    avisosSinLeer = Math.max(0, Number(n) || 0);
    var total = avisosSinLeer + recordatoriosPendientes;
    if (total > 0) {
      globo.textContent = total > 99 ? "99+" : String(total);
      globo.hidden = false;
      boton.classList.add("tiene-avisos");
      boton.setAttribute("aria-label", total === 1 ? "1 aviso pendiente" : total + " avisos pendientes");
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

  document.addEventListener("redcafe:recordatorios-contador", function (ev) {
    recordatoriosPendientes = Math.max(0, Number(ev.detail && ev.detail.total) || 0);
    Array.prototype.slice.call(document.querySelectorAll(".rc-recordatorios-contador")).forEach(function (n) {
      n.hidden = true;
      n.setAttribute("aria-hidden", "true");
    });
    pintarContador(avisosSinLeer);
  });

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
    var art = el("article", {
      className: "redcafe-aviso" + (a.leido ? "" : " es-nuevo"),
      "data-id": a.id || ""
    });
    art.appendChild(el("span", { className: "redcafe-aviso-icono", "aria-hidden": "true" },
      ICONOS[a.tipo] || ICONOS.sistema));

    var cuerpo = el("div", { className: "redcafe-aviso-cuerpo" });
    if (a.enlace) {
      var enlace = el("a", { className: "redcafe-aviso-titulo", href: a.enlace }, a.titulo || "");
      enlace.addEventListener("click", function () { marcar(a.id); });
      cuerpo.appendChild(enlace);
    } else {
      cuerpo.appendChild(el("p", { className: "redcafe-aviso-titulo" }, a.titulo || ""));
    }
    if (a.texto) cuerpo.appendChild(el("p", { className: "redcafe-aviso-texto" }, a.texto));
    cuerpo.appendChild(el("time", { className: "redcafe-aviso-fecha", datetime: a.ts || "" }, cuando(a.ts)));
    art.appendChild(cuerpo);

    var quitar = el("button", { type: "button", className: "redcafe-aviso-quitar", "aria-label": "Quitar este aviso" }, "×");
    quitar.addEventListener("click", function () { borrar(a.id, art); });
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

  function marcar(id) {
    if (!id) return;
    json("/api/notificaciones.php?action=leer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id })
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
    if (window.RedCafeRecordatorios && usuario && usuario.id !== 'redcafe_admin') {
      window.RedCafeRecordatorios.montar(panel);
    }
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
      if (usuario && usuario.id) {
        if (timerAdminSesion) { clearTimeout(timerAdminSesion); timerAdminSesion = null; }
        arrancarCampana();
        return;
      }
      // Sesión de administración sin cuenta de miembro: sus avisos se guardan
      // como redcafe_admin y la campana sale en cualquier página.
      if (res && res.ok && res.data && res.data.admin === true) {
        usuario = { id: "redcafe_admin" };
        if (timerAdminSesion) { clearTimeout(timerAdminSesion); timerAdminSesion = null; }
        arrancarCampana();
        return;
      }
      if (rutaAdmin() && reintentosAdminSesion < 12 && !timerAdminSesion) {
        reintentosAdminSesion++;
        timerAdminSesion = setTimeout(function () {
          timerAdminSesion = null;
          iniciar();
        }, 5000);
      }
    });
  }

  var campanaArrancada = false;
  function arrancarCampana(contadorInicial) {
    if (campanaArrancada) return;
    campanaArrancada = true;
    // La cabecera la monta React tras hidratar: se reintenta unas cuantas
    // veces en lugar de dar por perdida la campana al primer fallo.
    var intentos = 0;
    var reloj = setInterval(function () {
      intentos++;
      if (montarCampana() || intentos > 20) {
        clearInterval(reloj);
        if (!boton && intentos > 20) montarCampana(true);
        if (boton) {
          if (window.RedCafeRecordatorios) window.RedCafeRecordatorios.resumen(boton, usuario);
          if (contadorInicial !== undefined) pintarContador(contadorInicial);
          else contar();
        }
      }
    }, 500);

    setInterval(function () {
      if (!document.hidden) contar();
    }, SONDEO_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) contar();
    });
  }

  if (document.readyState === "complete") setTimeout(iniciar, 600);
  else window.addEventListener("load", function () { setTimeout(iniciar, 600); }, { once: true });

  /* Navegación interna de React (sin recargar). Al entrar desde /login/ la
     aplicación pasa a /panel/ con history.pushState: iniciar() ya se había
     ejecutado en /login/ sin sesión y la campana no aparecía hasta recargar.
     En cada cambio de ruta: si no hay usuario y hay sesión guardada, se vuelve
     a preguntar (tope de 6 veces por carga); si la cabecera se repintó y se
     llevó la campana, se vuelve a colgar. */
  var reintentosRuta = 0;
  function alCambiarRuta() {
    setTimeout(function () {
      if (usuario && usuario.id) {
        if (boton && !document.body.contains(boton)) { boton = null; globo = null; montarCampana(); contar(); }
        return;
      }
      var guardada = null;
      try { guardada = localStorage.getItem("redcafe_sesion") || sessionStorage.getItem("redcafe_sesion"); } catch (e) {}
      if (!guardada || reintentosRuta >= 6) return;
      reintentosRuta++;
      iniciar();
    }, 700);
  }
  ["pushState", "replaceState"].forEach(function (m) {
    var original = history[m];
    if (typeof original !== "function") return;
    history[m] = function () {
      var r = original.apply(this, arguments);
      alCambiarRuta();
      return r;
    };
  });
  window.addEventListener("popstate", alCambiarRuta);
})();
