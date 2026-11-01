/* Red Café Ecuador — bandeja del miembro
   ------------------------------------------------------------------
   Mensajes y solicitudes de pedido en un mismo sitio. Antes estaban en cuatro:
   las conversaciones en /chat/, los pedidos en una sección del panel, los
   avisos en la campana y el historial en otra sección. Quien vende tenía que
   recordar mirar en todas para saber si alguien le estaba escribiendo o
   pidiendo café.

   Lo que ordena esta bandeja no es la fecha: es de quién es el turno. Primero
   lo que espera una respuesta suya —un mensaje sin leer, un pedido que acaba
   de recibir—, y después el resto. Un pedido que usted mismo hizo y sigue
   «Solicitado» no le pide nada: espera al vendedor, y por eso baja.

   El hilo se lee y se contesta aquí mismo, llamando a chat.php, que es donde
   viven las reglas de quién puede hablar con quién. Esta sección no las repite.
*/
(function () {
  "use strict";

  if (window.__redcafeBandeja) return;
  window.__redcafeBandeja = true;

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function json(url, opciones) {
    return fetch(url, Object.assign({ credentials: "include", cache: "no-store" }, opciones || {}))
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false }; });
  }

  function cuando(iso) {
    if (!iso) return "";
    var f = new Date(Date.parse(iso));
    if (isNaN(f)) return "";
    var min = Math.round((Date.now() - f.getTime()) / 60000);
    if (min < 1) return "ahora mismo";
    if (min < 60) return "hace " + min + " min";
    if (min < 60 * 24) return "hace " + Math.round(min / 60) + " h";
    return f.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
  }

  // ── Pintado de la lista ────────────────────────────────────────────────

  function filaMensaje(it) {
    var aviso = it.sin_leer > 0
      ? '<span class="redcafe-band-nuevos">' + it.sin_leer + " sin leer</span>"
      : "";
    var previo = it.ultimo
      ? (it.ultimo_mio ? "Usted: " : "") + it.ultimo
      : "Conversación sin mensajes todavía.";
    return '<article class="redcafe-pub-card redcafe-band-fila" data-clase="mensaje" data-sala="' + esc(it.id) + '">' +
      '<div class="redcafe-pub-head">' +
        "<div>" +
          '<p class="redcafe-pub-tag">Mensaje · ' + esc(it.relacion && it.relacion.ref ? it.relacion.ref : "") + "</p>" +
          "<h4>" + esc(it.con) + "</h4>" +
          '<p class="redcafe-band-previo">' + esc(previo) + "</p>" +
        "</div>" +
        '<div class="redcafe-band-meta">' + aviso +
          '<span class="redcafe-band-fecha">' + esc(cuando(it.fecha)) + "</span></div>" +
      "</div>" +
      '<div class="redcafe-pub-acciones">' +
        '<button type="button" class="redcafe-ped-btn" data-accion="abrir">Leer y responder</button>' +
        '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>' +
      "</div>" +
      '<div class="redcafe-band-hilo" hidden></div>' +
    "</article>";
  }

  function filaPedido(it) {
    var etiqueta = it.papel === "recibido" ? "Te lo solicitan" : "Lo solicitaste";
    var aviso = it.pendiente
      ? '<span class="redcafe-band-nuevos">Esperando tu respuesta</span>' : "";
    var importe = (it.total !== null && it.total !== undefined && it.total !== "")
      ? " · $ " + esc(it.total) : "";
    return '<article class="redcafe-pub-card redcafe-band-fila" data-clase="pedido" data-nro="' + esc(it.id) + '">' +
      '<div class="redcafe-pub-head">' +
        "<div>" +
          '<p class="redcafe-pub-tag">Pedido #' + esc(it.id) + " · " + esc(etiqueta) + "</p>" +
          "<h4>" + esc(it.titulo) + "</h4>" +
          '<p class="redcafe-band-previo">' + esc(it.contraparte) + " · " + esc(it.estado) + esc(importe) + "</p>" +
        "</div>" +
        '<div class="redcafe-band-meta">' + aviso +
          '<span class="redcafe-band-fecha">' + esc(cuando(it.fecha)) + "</span></div>" +
      "</div>" +
      '<div class="redcafe-pub-acciones">' +
        '<a class="redcafe-ped-btn" href="/panel/#redcafe-panel-orders">Ver el pedido</a>' +
      "</div>" +
    "</article>";
  }

  function pintar(ctx) {
    var items = ctx.items.slice();
    if (ctx.filtro === "pendientes") items = items.filter(function (i) { return i.pendiente; });
    else if (ctx.filtro === "mensajes") items = items.filter(function (i) { return i.clase === "mensaje"; });
    else if (ctx.filtro === "pedidos") items = items.filter(function (i) { return i.clase === "pedido"; });

    if (!items.length) {
      ctx.lista.innerHTML = '<p class="redcafe-pub-vacio">' +
        (ctx.filtro === "pendientes"
          ? "No tienes nada esperando respuesta."
          : "Todavía no hay nada aquí.") + "</p>";
      return;
    }
    ctx.lista.innerHTML = items.map(function (i) {
      return i.clase === "mensaje" ? filaMensaje(i) : filaPedido(i);
    }).join("");
  }

  // ── Hilo de una conversación ───────────────────────────────────────────

  function pintarHilo(caja, mensajes, yo) {
    var cuerpo = mensajes.length
      ? mensajes.map(function (m) {
          var mio = String(m.from || "") === yo;
          return '<div class="redcafe-band-msg' + (mio ? " es-mio" : "") + '">' +
            "<strong>" + esc(mio ? "Usted" : (m.from_nombre || "Miembro")) + "</strong>" +
            "<p>" + esc(m.text || "") + "</p>" +
            "<span>" + esc(cuando(m.ts)) + "</span></div>";
        }).join("")
      : '<p class="redcafe-pub-vacio">Sin mensajes todavía. Escriba el primero.</p>';

    caja.innerHTML = '<div class="redcafe-band-mensajes">' + cuerpo + "</div>" +
      '<div class="redcafe-band-responder">' +
        '<textarea class="redcafe-pub-input" rows="2" placeholder="Escriba su respuesta"></textarea>' +
        '<button type="button" class="redcafe-pub-guardar" data-accion="enviar">Enviar</button>' +
      "</div>";
  }

  function abrirHilo(ctx, card) {
    var sala = card.getAttribute("data-sala");
    var caja = card.querySelector(".redcafe-band-hilo");
    var boton = card.querySelector('[data-accion="abrir"]');
    if (!caja.hidden) {
      caja.hidden = true;
      boton.textContent = "Leer y responder";
      return;
    }
    caja.hidden = false;
    boton.textContent = "Cerrar";
    caja.innerHTML = '<p class="redcafe-pub-vacio">Abriendo la conversación…</p>';

    json("/api/chat.php?action=messages&room=" + encodeURIComponent(sala)).then(function (res) {
      if (!res || !res.ok) {
        caja.innerHTML = '<p class="redcafe-pub-estado is-error">' +
          esc((res && res.error) || "No se pudo abrir la conversación.") + "</p>";
        return;
      }
      var msgs = (res.data && res.data.messages) || [];
      pintarHilo(caja, msgs, ctx.yo);

      /* Pedir los mensajes los marca como leídos en el servidor, así que esta
         conversación deja de estar «esperando respuesta». Si se repintara la
         lista, con el filtro «Esperando respuesta» puesto la fila se iría de
         la pantalla justo mientras usted escribe la contestación —y con ella,
         lo que llevara escrito—. Se actualizan solo los números; la lista se
         queda quieta hasta que usted cierre el hilo o cambie de filtro. */
      setTimeout(function () { refrescarContador(ctx); }, 400);
    });
  }

  function enviar(ctx, card) {
    var sala = card.getAttribute("data-sala");
    var area = card.querySelector(".redcafe-band-hilo textarea");
    var boton = card.querySelector('[data-accion="enviar"]');
    var texto = (area && area.value || "").trim();
    if (!texto) { if (area) area.focus(); return; }

    boton.disabled = true;
    json("/api/chat.php?action=send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: sala, text: texto })
    }).then(function (res) {
      boton.disabled = false;
      var estado = card.querySelector(".redcafe-pub-estado");
      if (!res || !res.ok) {
        if (estado) {
          estado.textContent = (res && res.error) || "No se pudo enviar.";
          estado.className = "redcafe-pub-estado is-error";
        }
        return;
      }
      area.value = "";
      json("/api/chat.php?action=messages&room=" + encodeURIComponent(sala)).then(function (r2) {
        var msgs = (r2 && r2.ok && r2.data && r2.data.messages) || [];
        pintarHilo(card.querySelector(".redcafe-band-hilo"), msgs, ctx.yo);
      });
    });
  }

  // ── Carga y montaje ────────────────────────────────────────────────────

  function marcador(ctx) {
    var m = ctx.seccion.querySelector("[data-redcafe-band-cuenta]");
    if (!m) return;
    var n = ctx.total;
    m.textContent = n === 0
      ? "Nada esperando respuesta"
      : n + (n === 1 ? " cosa esperando su respuesta" : " cosas esperando su respuesta");
  }

  function refrescarContador(ctx) {
    json("/api/bandeja.php?action=contador").then(function (res) {
      if (!res || !res.ok) return;
      ctx.total = (res.data || res).total || 0;
      marcador(ctx);
    });
  }

  function cargar(ctx, silencioso) {
    if (!silencioso) ctx.lista.innerHTML = '<p class="redcafe-pub-vacio">Cargando su bandeja…</p>';
    json("/api/bandeja.php?action=resumen").then(function (res) {
      if (!res || !res.ok) return;
      var d = res.data || res;
      ctx.items = d.items || [];
      ctx.total = d.total || 0;
      marcador(ctx);
      pintar(ctx);
    });
  }

  function montar(usuario, datos) {
    if (location.pathname.indexOf("/panel") !== 0) return;
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-bandeja")) return;

    var seccion = document.createElement("section");
    seccion.id = "redcafe-bandeja";
    seccion.className = "redcafe-pub-seccion";
    seccion.setAttribute("data-redcafe-propio", "1");
    seccion.innerHTML =
      '<div class="redcafe-pub-wrap">' +
        '<p class="redcafe-pub-rotulo">Su bandeja</p>' +
        '<h3 class="redcafe-pub-titulo">Mensajes y solicitudes de pedido</h3>' +
        '<p class="redcafe-pub-intro">Todo lo que necesita respuesta, en un solo sitio. ' +
          "Primero lo que espera algo de usted. <strong data-redcafe-band-cuenta></strong></p>" +
        '<div class="redcafe-ver-filtros">' +
          '<button type="button" class="redcafe-ped-btn is-activo" data-filtro="pendientes">Esperando respuesta</button>' +
          '<button type="button" class="redcafe-ped-btn" data-filtro="mensajes">Mensajes</button>' +
          '<button type="button" class="redcafe-ped-btn" data-filtro="pedidos">Pedidos</button>' +
          '<button type="button" class="redcafe-ped-btn" data-filtro="todo">Todo</button>' +
        "</div>" +
        '<div id="redcafe-bandeja-lista"></div>' +
      "</div>";

    var recursos = document.getElementById("redcafe-panel-resources");
    if (recursos && recursos.parentNode === main) main.insertBefore(seccion, recursos);
    else main.appendChild(seccion);

    var ctx = {
      seccion: seccion,
      lista: seccion.querySelector("#redcafe-bandeja-lista"),
      items: (datos && datos.items) || [],
      total: (datos && datos.total) || 0,
      filtro: "pendientes",
      yo: String(usuario.id || "")
    };

    seccion.addEventListener("click", function (ev) {
      var f = ev.target && ev.target.closest && ev.target.closest("[data-filtro]");
      if (f) {
        ctx.filtro = f.getAttribute("data-filtro");
        Array.prototype.slice.call(seccion.querySelectorAll("[data-filtro]"))
          .forEach(function (b) { b.classList.toggle("is-activo", b === f); });
        // Al cambiar de filtro sí se vuelve a pedir: es el momento en que el
        // usuario espera ver la lista al día, no mientras escribe.
        cargar(ctx, true);
        return;
      }
      var b = ev.target && ev.target.closest && ev.target.closest("[data-accion]");
      if (!b) return;
      var card = b.closest(".redcafe-band-fila");
      if (!card) return;
      if (b.getAttribute("data-accion") === "abrir") abrirHilo(ctx, card);
      else if (b.getAttribute("data-accion") === "enviar") enviar(ctx, card);
    });

    marcador(ctx);
    pintar(ctx);
  }

  function iniciar() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    json("/api/auth.php?action=me").then(function (res) {
      var usuario = res && res.ok && res.data && res.data.user;
      if (!usuario || !usuario.id) return;
      json("/api/bandeja.php?action=resumen").then(function (r2) {
        if (!r2 || !r2.ok) return;
        if (location.pathname.indexOf("/panel") !== 0) return;
        montar(usuario, r2.data || r2);
      });
    });
  }

  if (document.readyState === "complete") setTimeout(iniciar, 1100);
  else window.addEventListener("load", function () { setTimeout(iniciar, 1100); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 900); });
})();
