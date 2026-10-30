/* Red Café Ecuador — verificaciones de la administración
   ------------------------------------------------------------------
   El sello «Verificado» que ve un comprador en el marketplace no se ponía en
   ningún sitio: lo heredaba automáticamente lo que publicaba la administración,
   y no había manera de verificar el lote, el servicio, el curso o el perfil de
   otro. Aquí se conceden y se retiran uno a uno.

   La lista llega ordenada por lo que falta revisar. Cada sello guarda quién lo
   concedió y cuándo, y el dueño recibe un aviso: sellar el trabajo de alguien
   sin decírselo no es verificar, es etiquetar a sus espaldas.

   Quien autoriza es la API (api/verificaciones.php): sin sesión de
   administración responde 403 y esta sección no llega a existir.
*/
(function () {
  "use strict";

  if (window.__redcafeAdminVerificaciones) return;
  window.__redcafeAdminVerificaciones = true;

  var ETIQUETA = {
    lote:     { titulo: "Lotes de café",     singular: "lote" },
    servicio: { titulo: "Servicios de miembros", singular: "servicio" },
    curso:    { titulo: "Cursos de miembros",   singular: "curso" },
    miembro:  { titulo: "Perfiles",          singular: "perfil" }
  };

  var filtro = "pendientes";

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function json(url, opciones) {
    // Se conserva el código HTTP: sin él, quien llama no puede distinguir
    // «se te caducó la sesión» (401/403) de un fallo cualquiera, y acaba
    // tragándose el error en silencio.
    return fetch(url, Object.assign({ credentials: "include", cache: "no-store" }, opciones || {}))
      .then(function (r) {
        return r.json().then(
          function (d) { d.estado = r.status; return d; },
          function () { return { ok: false, estado: r.status }; }
        );
      })
      .catch(function () { return { ok: false, estado: 0 }; });
  }

  function skeletonLista() {
    var html = "";
    for (var i = 0; i < 3; i++) {
      html += '<article class="redcafe-skeleton-card" aria-hidden="true">' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea corta"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea media"></span>' +
      '</article>';
    }
    return '<div class="redcafe-skeleton redcafe-skeleton-lista" role="status" aria-label="Cargando verificaciones">' + html + '</div>';
  }

  function fecha(iso) {
    if (!iso) return "";
    var f = new Date(Date.parse(iso));
    if (isNaN(f)) return "";
    return f.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
  }

  function filaHtml(item) {
    var meta = ETIQUETA[item.tipo] || { singular: item.tipo };
    var sello = item.verificado
      ? '<span class="redcafe-sello-verificado">✓ Verificado</span>'
      : '<span class="redcafe-ver-pendiente">Sin revisar</span>';
    var quien = item.verificado && (item.verificado_por || item.verificado_en)
      ? '<p class="redcafe-ver-quien">Lo revisó ' + esc(item.verificado_por || "la administración") +
        (item.verificado_en ? " · " + esc(fecha(item.verificado_en)) : "") + "</p>"
      : "";

    return '<article class="redcafe-pub-card redcafe-ver-fila" data-tipo="' + esc(item.tipo) +
        '" data-id="' + esc(item.id) + '" data-verificado="' + (item.verificado ? "1" : "0") + '">' +
      '<div class="redcafe-pub-head">' +
        '<div>' +
          '<p class="redcafe-pub-tag">' + esc(meta.singular) + "</p>" +
          "<h4>" + esc(item.titulo || item.id) + "</h4>" +
          (item.detalle ? '<p class="redcafe-ver-detalle">' + esc(item.detalle) + "</p>" : "") +
          quien +
        "</div>" +
        "<div>" + sello + "</div>" +
      "</div>" +
      '<div class="redcafe-pub-acciones">' +
        (item.verificado
          ? '<button type="button" class="redcafe-ped-btn is-borrar" data-accion="retirar">Retirar el sello</button>'
          : '<button type="button" class="redcafe-pub-guardar" data-accion="verificar">Verificar</button>') +
        (item.enlace
          ? '<a class="redcafe-ped-btn" href="' + esc(item.enlace) + '" target="_blank" rel="noreferrer">Ver antes de decidir</a>'
          : "") +
        '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>' +
      "</div>" +
    "</article>";
  }

  function pintar(ctx) {
    var items = ctx.items.slice();
    if (filtro === "pendientes") items = items.filter(function (i) { return !i.verificado; });
    else if (filtro !== "todo") items = items.filter(function (i) { return i.tipo === filtro; });

    if (!items.length) {
      ctx.lista.innerHTML = '<p class="redcafe-pub-vacio">' +
        (filtro === "pendientes"
          ? "No queda nada por revisar."
          : "Nada que mostrar con este filtro.") + "</p>";
      return;
    }
    ctx.lista.innerHTML = items.map(filaHtml).join("");
  }

  function decidir(ctx, card, verificado) {
    var tipo = card.getAttribute("data-tipo");
    var id = card.getAttribute("data-id");
    var titulo = (card.querySelector("h4") || {}).textContent || id;
    var nota = "";

    if (!verificado) {
      nota = window.prompt("¿Por qué retiras el sello de «" + titulo + "»?\n\n" +
        "Se le avisa al dueño con este motivo. Puedes dejarlo vacío.", "");
      if (nota === null) return;   // canceló
    } else if (!window.confirm(
        "Vas a verificar «" + titulo + "».\n\n" +
        "El sello dice a los compradores que alguien de la administración lo revisó, " +
        "y queda con tu nombre y la fecha. Se avisa al dueño.")) {
      return;
    }

    var estado = card.querySelector(".redcafe-pub-estado");
    if (estado) { estado.textContent = "Guardando…"; estado.className = "redcafe-pub-estado"; }

    json("/api/verificaciones.php?action=set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipo, id: id, verificado: verificado, nota: nota })
    }).then(function (res) {
      if (!res || !res.ok) {
        if (estado) {
          estado.textContent = (res && (res.error || res.message)) || "No se pudo guardar.";
          estado.className = "redcafe-pub-estado is-error";
        }
        return;
      }
      cargar(ctx);
    });
  }

  function cargar(ctx) {
    json("/api/verificaciones.php?action=list").then(function (res) {
      // Si la sesión de administración caducó, la lista anterior deja de ser
      // cierta. Seguir mostrándola —con su contador de «sin revisar»— hace
      // creer que todo sigue en pie, y el único síntoma aparecía al intentar
      // actuar, con un mensaje que además culpaba al rol y no a la sesión.
      if (res && (res.estado === 401 || res.estado === 403)) {
        ctx.items = [];
        var aviso = ctx.seccion.querySelector("[data-redcafe-ver-pendientes]");
        if (aviso) aviso.textContent = "Sesión caducada";
        if (ctx.lista) {
          ctx.lista.innerHTML = '<p class="redcafe-pub-vacio">' +
            "Tu sesión de administración caducó. Vuelve a entrar en /admin/ para seguir verificando." +
            "</p>";
        }
        return;
      }
      if (!res || !res.ok) return;
      var d = res.data || res;
      ctx.items = d.items || [];
      var n = d.pendientes || 0;
      var marca = ctx.seccion.querySelector("[data-redcafe-ver-pendientes]");
      if (marca) {
        marca.textContent = n === 0
          ? "Todo revisado"
          : n + (n === 1 ? " sin revisar" : " sin revisar");
      }
      pintar(ctx);
    });
  }

  function enRuta() {
    var p = location.pathname;
    return p.indexOf("/admin") === 0 || p.indexOf("/panel") === 0;
  }

  function identidades(seccion) {
    var bloque = document.createElement("div");
    bloque.className = "redcafe-pub-wrap";
    seccion.appendChild(bloque);
    function cargarIdentidades() {
      json("/api/identidad.php?action=pendientes").then(function (r) {
        bloque.innerHTML = '<h3>Solicitudes de identidad</h3>';
        if (!r || !r.ok) { bloque.appendChild(document.createTextNode((r && r.error) || "No se pudo cargar.")); return; }
        var items = r.data.solicitudes || [];
        if (!items.length) bloque.appendChild(document.createTextNode("No hay solicitudes pendientes."));
        items.forEach(function (s) {
          var card = document.createElement("article");
          card.className = "redcafe-pub-card";
          var base = "/api/identidad.php?action=ver&id=" + encodeURIComponent(s.id);
          card.innerHTML = '<h4>' + esc(s.nombre || s.uid) + '</h4><p>' + esc(fecha(s.creado)) + '</p>' +
            '<a target="_blank" rel="noreferrer" href="' + esc(base + "&cual=documento") + '">Ver documento</a> · ' +
            '<a target="_blank" rel="noreferrer" href="' + esc(base + "&cual=selfie") + '">Ver selfie</a> ' +
            '<button type="button" class="redcafe-pub-guardar" data-decision="aprobar">Aprobar</button> ' +
            '<button type="button" class="redcafe-ped-btn" data-decision="rechazar">Rechazar</button><p role="status"></p>';
          card.addEventListener("click", function (ev) {
            var b = ev.target.closest("[data-decision]");
            if (!b || b.disabled) return;
            var decision = b.getAttribute("data-decision"), motivo = "";
            if (decision === "rechazar") {
              motivo = window.prompt("Motivo del rechazo (obligatorio, máximo 300 caracteres):", "");
              if (motivo === null) return;
              if (!motivo.trim() || motivo.trim().length > 300) { card.querySelector('[role="status"]').textContent = "Indica un motivo de hasta 300 caracteres."; return; }
            }
            Array.prototype.forEach.call(card.querySelectorAll("button"), function (boton) { boton.disabled = true; });
            json("/api/identidad.php?action=decidir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, decision: decision, motivo: motivo }) }).then(function (res) {
              if (res && res.ok) { cargarIdentidades(); return; }
              card.querySelector('[role="status"]').textContent = (res && res.error) || "No se pudo guardar.";
              Array.prototype.forEach.call(card.querySelectorAll("button"), function (boton) { boton.disabled = false; });
            });
          });
          bloque.appendChild(card);
        });
      });
    }
    cargarIdentidades();
  }

  function montar(datos) {
    if (!window.__redcafeReactListo || !window.__redcafeReactListo()) { setTimeout(function () { montar(datos); }, 200); return; }
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-admin-verificaciones")) return;

    var seccion = document.createElement("section");
    seccion.id = "redcafe-admin-verificaciones";
    seccion.className = "redcafe-pub-seccion";
    seccion.setAttribute("data-redcafe-propio", "1");
    seccion.innerHTML =
      '<div class="redcafe-pub-wrap">' +
        '<p class="redcafe-pub-rotulo">Administración</p>' +
        '<h3 class="redcafe-pub-titulo">Verificaciones</h3>' +
        '<p class="redcafe-pub-intro">El sello «Verificado» lo lee un comprador antes de ' +
          "mandar dinero a alguien que no conoce. Concédelo solo cuando hayas mirado el lote, " +
          "el servicio, el curso o el perfil: queda con tu nombre y la fecha, y el dueño recibe aviso. " +
          '<strong data-redcafe-ver-pendientes></strong></p>' +
        '<div class="redcafe-ver-filtros">' +
          '<button type="button" class="redcafe-ped-btn is-activo" aria-pressed="true" data-filtro="pendientes">Por revisar</button>' +
          '<button type="button" class="redcafe-ped-btn" aria-pressed="false" data-filtro="lote">Lotes</button>' +
          '<button type="button" class="redcafe-ped-btn" aria-pressed="false" data-filtro="servicio">Servicios</button>' +
          '<button type="button" class="redcafe-ped-btn" aria-pressed="false" data-filtro="curso">Cursos</button>' +
          '<button type="button" class="redcafe-ped-btn" aria-pressed="false" data-filtro="miembro">Perfiles</button>' +
          '<button type="button" class="redcafe-ped-btn" aria-pressed="false" data-filtro="todo">Todo</button>' +
        "</div>" +
        '<div id="redcafe-ver-lista">' + skeletonLista() + '</div>' +
      "</div>";

    var recursos = document.getElementById("redcafe-panel-resources");
    if (recursos && recursos.parentNode === main) main.insertBefore(seccion, recursos);
    else main.appendChild(seccion);

    identidades(seccion);
    var ctx = { seccion: seccion, lista: seccion.querySelector("#redcafe-ver-lista"), items: [] };

    seccion.addEventListener("click", function (ev) {
      var f = ev.target && ev.target.closest && ev.target.closest("[data-filtro]");
      if (f) {
        filtro = f.getAttribute("data-filtro");
        Array.prototype.slice.call(seccion.querySelectorAll("[data-filtro]"))
          .forEach(function (b) {
            var elegido = b === f;
            b.classList.toggle("is-activo", elegido);
            // Sin esto el filtro elegido solo se distingue por el color: quien
            // usa lector de pantalla no oye cuál está puesto.
            b.setAttribute("aria-pressed", elegido ? "true" : "false");
          });
        pintar(ctx);
        return;
      }
      var b = ev.target && ev.target.closest && ev.target.closest("[data-accion]");
      if (!b) return;
      var card = b.closest(".redcafe-ver-fila");
      if (!card) return;
      decidir(ctx, card, b.getAttribute("data-accion") === "verificar");
    });

    ctx.items = (datos && datos.items) || [];
    var marca = seccion.querySelector("[data-redcafe-ver-pendientes]");
    if (marca && datos) {
      var n = datos.pendientes || 0;
      marca.textContent = n === 0 ? "Todo revisado" : n + " sin revisar";
    }
    pintar(ctx);
  }

  function preguntarALaApi() {
    json("/api/verificaciones.php?action=list").then(function (res) {
      if (!res || !res.ok) return;
      if (!enRuta()) return;
      montar(res.data || res);
    });
  }

  function iniciar() {
    if (!enRuta()) return;
    // En /admin/ la sesión de administración no es la de ningún miembro, así
    // que se pregunta directo. En /panel/ entran todos los miembros: se mira
    // primero quién es para no dejarle un 403 en la consola a cada uno.
    if (location.pathname.indexOf("/admin") === 0) { preguntarALaApi(); return; }

    json("/api/auth.php?action=me").then(function (res) {
      var u = res && res.ok && res.data && res.data.user;
      if (!u) return;
      var roles = u.roles || [u.rol];
      var esAdmin = !!u.admin || !!u.is_admin || u.rol === "admin" ||
        (roles.indexOf && roles.indexOf("admin") >= 0);
      if (esAdmin) preguntarALaApi();
    });
  }

  if (document.readyState === "complete") setTimeout(iniciar, 1300);
  else window.addEventListener("load", function () { setTimeout(iniciar, 1300); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 1000); });
})();
