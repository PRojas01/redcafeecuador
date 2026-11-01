/* Red Café Ecuador — avisos por WhatsApp desde la administración
   ------------------------------------------------------------------
   Sin proveedor de WhatsApp: la campaña guarda una lista congelada de
   destinatarios y un mensaje, y el administrador abre cada enlace wa.me y
   envía el mensaje a mano. Aquí se elige a quién, se escribe el aviso, se
   congela la lista y se marcan los envíos uno a uno.

   La autoriza la API (api/difusion.php): sin sesión de administración
   responde 401/403 y esta sección no llega a existir. Solo se monta en
   /admin/, sobre el propio `<main>`, sin tocar nodos de React.
*/
(function () {
  "use strict";

  if (window.__redcafeAdminDifusion) return;
  window.__redcafeAdminDifusion = true;

  var API = "/api/difusion.php";

  var ROLES = [
    { v: "productor",     l: "Productor/a" },
    { v: "comprador",     l: "Comprador/a" },
    { v: "vendedor",      l: "Vendedor / Tostador" },
    { v: "exportador",    l: "Exportador/a" },
    { v: "certificador",  l: "Certificador/a" },
    { v: "transportista", l: "Transportista" },
    { v: "pilador",       l: "Pilador/a" },
    { v: "proveedor",     l: "Proveedor/a" },
    { v: "asesor",        l: "Asesor/a" },
    { v: "bar",           l: "Bar / Cafetería" },
    { v: "barista",       l: "Barista" }
  ];

  var PROVINCIAS = [
    "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi",
    "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja",
    "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza",
    "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos",
    "Tungurahua", "Zamora Chinchipe"
  ];

  var SEGMENTOS = [
    { v: "todos",                 l: "Todos" },
    { v: "productores_sin_lote",  l: "Productores sin lote publicado" },
    { v: "nuevos_30_dias",        l: "Nuevos en los últimos 30 días" }
  ];

  var state = {
    campana: null,
    filtroEstado: "pendientes",
    ultimaLista: { destinatarios: [], total: 0, sin_telefono: 0, sin_consentimiento: 0 },
    filtros: { roles: [], provincia: "", segmento: "todos", solo_consentimiento: true },
    campanas: null
  };

  var seccion = null;

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function json(url, opciones) {
    return fetch(url, Object.assign({ credentials: "include", cache: "no-store" }, opciones || {}))
      .then(function (r) {
        return r.json().then(
          function (d) { d.estado = r.status; return d; },
          function () { return { ok: false, estado: r.status }; }
        );
      })
      .catch(function () { return { ok: false, estado: 0 }; });
  }

  function postJson(body) {
    return json(API + "?action=" + body.accion, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  function $id(id) { return document.getElementById(id); }
  function $q(sel, base) { return (base || document).querySelector(sel); }

  function fecha(iso) {
    if (!iso) return "";
    var f = new Date(Date.parse(iso));
    if (isNaN(f)) return "";
    return f.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
  }

  function primerNombre(nombre) {
    var p = String(nombre || "").split(/\s+/).filter(Boolean);
    return p.length ? p[0] : (nombre || "");
  }

  function reemplazarNombre(texto, nombre) {
    return String(texto || "").replace(/\{nombre\}/g, primerNombre(nombre));
  }

  function enmascarar(num) {
    var d = String(num || "").replace(/\D+/g, "");
    if (d.length < 11) return d;
    return "+" + d.slice(0, 3) + " " + d.slice(3, 5) + " *** " + d.slice(-4);
  }

  function textoFinal(dest) {
    if (!state.campana) return "";
    var base = reemplazarNombre(state.campana.mensaje || "", dest.nombre);
    var enlace = (state.campana.enlace || "").trim();
    return enlace ? base + "\n\n" + enlace : base;
  }

  // ─── Construcción de la sección (capaz propia, sin tocar React) ──────────

  function montar() {
    var main = document.querySelector("main");
    if (!main || $id("redcafe-admin-difusion")) return true;

    var provOpts = '<option value="" selected>Todas</option>' +
      PROVINCIAS.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + "</option>"; }).join("");
    var segOpts = SEGMENTOS.map(function (s) {
      return '<option value="' + esc(s.v) + '">' + esc(s.l) + "</option>";
    }).join("");

    seccion = document.createElement("section");
    seccion.id = "redcafe-admin-difusion";
    seccion.className = "redcafe-pub-seccion";
    seccion.setAttribute("data-redcafe-propio", "1");
    seccion.innerHTML =
      '<div class="redcafe-pub-wrap">' +
        '<p class="redcafe-pub-rotulo">Administración</p>' +
        '<h3 class="redcafe-pub-titulo">Avisos por WhatsApp</h3>' +
        '<p class="redcafe-pub-intro">Prepara un aviso, elige a quién y envíalo uno por uno desde tu ' +
          "WhatsApp. La lista queda congelada al crear la campaña y cada envío queda marcado.</p>" +
        '<p class="redcafe-dif-fijo">WhatsApp puede bloquear números que envían muchos mensajes seguidos a quien ' +
          "no los tiene guardados. Envía por tandas y solo a quien aceptó recibir comunicaciones.</p>" +

        '<div class="redcafe-pub-card">' +
          '<h4 class="redcafe-dif-h4">Paso 1 · A quién</h4>' +
          '<div class="redcafe-dif-roles" data-dif-roles>' +
            ROLES.map(function (r) {
              return '<label class="redcafe-dif-check"><input type="checkbox" data-dif-rol value="' + esc(r.v) + '"> ' +
                esc(r.l) + "</label>";
            }).join("") +
          "</div>" +
          '<div class="redcafe-dif-grid">' +
            '<label class="redcafe-pub-label"><span>Provincia</span><select class="redcafe-pub-input" data-dif-provincia>' +
              provOpts + "</select></label>" +
            '<label class="redcafe-pub-label"><span>Segmento</span><select class="redcafe-pub-input" data-dif-segmento>' +
              segOpts + "</select></label>" +
          "</div>" +
          '<label class="redcafe-dif-check-consent"><input type="checkbox" data-dif-consent checked> ' +
            "Solo quienes aceptaron recibir comunicaciones</label>" +
          '<div class="redcafe-pub-acciones">' +
            '<button type="button" class="redcafe-pub-guardar" data-dif-accion="ver-destinatarios">Ver destinatarios</button>' +
            '<span class="redcafe-pub-estado" data-dif-resumen role="status" aria-live="polite"></span>' +
          "</div>" +
        "</div>" +

        '<div class="redcafe-pub-card" data-dif-paso="2" hidden>' +
          '<h4 class="redcafe-dif-h4">Paso 2 · Mensaje</h4>' +
          '<label class="redcafe-pub-label"><span>Título interno (solo lo ves tú)</span>' +
            '<input class="redcafe-pub-input" data-dif-titulo maxlength="200" placeholder="Ej.: Aviso de cata en Loja"></label>' +
          '<label class="redcafe-pub-label"><span>Mensaje</span>' +
            '<textarea class="redcafe-pub-input" data-dif-mensaje rows="5" maxlength="1000" ' +
              'placeholder="Escribe el aviso…"></textarea>' +
            '<span class="redcafe-dif-ayuda">Usa {nombre} para personalizar con el primer nombre de cada persona.</span>' +
            '<span class="redcafe-dif-contador" data-dif-contador>0 / 1000</span>' +
          "</label>" +
          '<label class="redcafe-pub-label"><span>Enlace (opcional)</span>' +
            '<input class="redcafe-pub-input" data-dif-enlace placeholder="https://… o /ruta/interna/"></label>' +
          '<div class="redcafe-dif-preview" data-dif-preview></div>' +
          '<div class="redcafe-pub-acciones">' +
            '<button type="button" class="redcafe-pub-guardar" data-dif-accion="crear-campana">Crear lista de envío</button>' +
            '<span class="redcafe-pub-estado" data-dif-estado-paso2 role="status" aria-live="polite"></span>' +
          "</div>" +
        "</div>" +

        '<div class="redcafe-pub-card" data-dif-paso="3" hidden>' +
          '<h4 class="redcafe-dif-h4">Paso 3 · Enviar uno por uno</h4>' +
          '<p class="redcafe-dif-nombre-campana" data-dif-nombre-campana></p>' +
          '<div class="redcafe-dif-progreso" role="progressbar" aria-label="Envíos"><span data-dif-progreso-texto>0 de 0 enviados</span></div>' +
          '<div class="redcafe-ver-filtros">' +
            '<button type="button" class="redcafe-ped-btn is-activo" data-dif-filtro="pendientes" aria-pressed="true">Pendientes</button>' +
            '<button type="button" class="redcafe-ped-btn" data-dif-filtro="todos" aria-pressed="false">Todos</button>' +
            '<button type="button" class="redcafe-ped-btn" data-dif-accion="siguiente-pendiente">Siguiente pendiente</button>' +
          "</div>" +
          '<div class="redcafe-dif-lista" data-dif-lista><p class="redcafe-pub-vacio">Cargando…</p></div>' +
        "</div>" +

        '<div class="redcafe-pub-card redcafe-dif-campanas-card">' +
          '<h4 class="redcafe-dif-h4">Campañas anteriores</h4>' +
          '<div class="redcafe-pub-vacio" data-dif-campanas>Cargando…</div>' +
        "</div>" +
      "</div>";

    var recursos = document.getElementById("redcafe-panel-resources");
    if (recursos && recursos.parentNode === main) main.insertBefore(seccion, recursos);
    else main.appendChild(seccion);

    return true;
  }

  // ─── Filtros y lista de destinatarios ─────────────────────────────────────

  function leerFiltros() {
    state.filtros.roles = Array.prototype.slice.call(seccion.querySelectorAll("[data-dif-rol]:checked"))
      .map(function (b) { return b.value; });
    var prov = $q("[data-dif-provincia]", seccion);
    var seg = $q("[data-dif-segmento]", seccion);
    state.filtros.provincia = prov ? prov.value : "";
    state.filtros.segmento = seg ? seg.value : "todos";
    var cons = $q("[data-dif-consent]", seccion);
    state.filtros.solo_consentimiento = cons ? cons.checked : true;
  }

  function verDestinatarios() {
    leerFiltros();
    var btn = $q('[data-dif-accion="ver-destinatarios"]', seccion);
    var estado = $q("[data-dif-resumen]", seccion);
    var paso2 = seccion.querySelector('[data-dif-paso="2"]');
    btn.disabled = true;
    estado.textContent = "Calculando…";
    estado.className = "redcafe-pub-estado";

    postJson({ accion: "destinatarios", roles: state.filtros.roles, provincia: state.filtros.provincia,
               segmento: state.filtros.segmento, solo_consentimiento: state.filtros.solo_consentimiento })
      .then(function (res) {
        btn.disabled = false;
        if (!res || !res.ok) {
          estado.textContent = (res && (res.error || res.message)) || "No se pudo calcular la lista.";
          estado.className = "redcafe-pub-estado is-error";
          return;
        }
        state.ultimaLista = res.data || state.ultimaLista;
        estado.textContent = state.ultimaLista.total + " con WhatsApp · " +
          state.ultimaLista.sin_telefono + " sin teléfono válido · " +
          state.ultimaLista.sin_consentimiento + " sin consentimiento";
        estado.className = "redcafe-pub-estado is-ok";
        paso2.hidden = false;
        pintarPreview();
      });
  }

  // ─── Paso 2 · mensaje y vista previa ──────────────────────────────────────

  function pintarContador() {
    var ta = $q("[data-dif-mensaje]", seccion);
    var c = $q("[data-dif-contador]", seccion);
    if (!ta || !c) return;
    var n = ta.value.length;
    c.textContent = n + " / 1000";
  }

  function pintarPreview() {
    var ta = $q("[data-dif-mensaje]", seccion);
    var en = $q("[data-dif-enlace]", seccion);
    var preview = $q("[data-dif-preview]", seccion);
    if (!ta || !preview) return;
    var mensaje = (ta.value || "").trim();
    var enlace = (en && (en.value || "").trim()) || "";
    var dests = state.ultimaLista.destinatarios || [];
    var primer = dests.length ? dests[0] : null;

    var titulo = "Vista previa";
    if (!state.ultimaLista.total) {
      preview.innerHTML = '<span class="redcafe-dif-preview-titulo">' + esc(titulo) + "</span>" +
        '<div class="redcafe-dif-preview-texto">Primero elige destinatarios en el paso 1 y pulsa «Ver destinatarios».</div>';
      return;
    }
    var base = primer ? reemplazarNombre(mensaje, primer.nombre) : mensaje;
    var finalTxt = base + (enlace ? "\n\n" + enlace : "");
    titulo = "Texto final para el primer destinatario" + (primer ? " (" + esc(primer.nombre) + ")" : "");
    preview.innerHTML = '<span class="redcafe-dif-preview-titulo">' + esc(titulo) + "</span>" +
      '<div class="redcafe-dif-preview-texto">' + esc(finalTxt || "Escribe el mensaje para verlo aquí.").replace(/\n/g, "<br>") + "</div>";
  }

  function crearCampana() {
    leerFiltros();
    var titulo = ($q("[data-dif-titulo]", seccion).value || "").trim();
    var mensaje = ($q("[data-dif-mensaje]", seccion).value || "").trim();
    var enlace = ($q("[data-dif-enlace]", seccion).value || "").trim();
    var estado = $q("[data-dif-estado-paso2]", seccion);
    var btn = $q('[data-dif-accion="crear-campana"]', seccion);

    if (titulo.length < 3) { mensajeError(estado, "Pon un título interno de al menos 3 caracteres."); return; }
    if (!mensaje) { mensajeError(estado, "Escribe el mensaje del aviso."); return; }

    btn.disabled = true;
    estado.textContent = "Guardando…";
    estado.className = "redcafe-pub-estado";

    postJson({ accion: "guardar", titulo: titulo, mensaje: mensaje, enlace: enlace, filtros: state.filtros })
      .then(function (res) {
        btn.disabled = false;
        if (!res || !res.ok) {
          estado.textContent = (res && (res.error || res.message)) || "No se pudo crear la campaña.";
          estado.className = "redcafe-pub-estado is-error";
          return;
        }
        estado.textContent = "Campaña creada. A enviarlos uno por uno.";
        estado.className = "redcafe-pub-estado is-ok";
        state.campana = res.data.campaign;
        abrirPaso3();
        cargarCampanas();
      });
  }

  function mensajeError(el, texto) {
    el.textContent = texto;
    el.className = "redcafe-pub-estado is-error";
  }

  // ─── Paso 3 · envío uno por uno ───────────────────────────────────────────

  function abrirPaso3() {
    if (!state.campana) return;
    var paso3 = seccion.querySelector('[data-dif-paso="3"]');
    $q("[data-dif-nombre-campana]", seccion).textContent = "«" + (state.campana.titulo || "") + "» — " +
      fecha(state.campana.creada_at) + ",  enviada a " + (state.campana.destinatarios || []).length + " personas.";
    paso3.hidden = false;
    pintarEnviados();
    paso3.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function filaHtml(dest) {
    var c = state.campana;
    var enviado = !!(c.enviados && c.enviados[dest.id]);
    var datos = '<article class="redcafe-dif-fila' + (enviado ? " is-enviado" : "") + '" data-uid="' +
      esc(dest.id) + '" data-enviado="' + (enviado ? "1" : "0") + '">' +
      '<div class="redcafe-dif-datos">' +
        '<p class="redcafe-dif-nombre">' + esc(dest.nombre) + "</p>" +
        '<p class="redcafe-dif-meta">' + esc(dest.provincia || "Sin provincia") + " · " +
          esc(enmascarar(dest.telefono)) + "</p>" +
      "</div>" +
      '<div class="redcafe-dif-acciones">';
    if (enviado) {
      datos += '<span class="redcafe-dif-ok">Enviado ✓</span>' +
        '<button type="button" class="redcafe-ped-btn" data-dif-accion="desmarcar" data-uid="' + esc(dest.id) +
          '">Desmarcar</button>';
    } else {
      datos += '<a class="redcafe-dif-wa" target="_blank" rel="noopener" href="https://wa.me/' + esc(dest.telefono) +
        "?text=" + esc(encodeURIComponent(textoFinal(dest))) + '" data-dif-accion="enviar" data-uid="' +
        esc(dest.id) + '">Enviar por WhatsApp</a>';
    }
    return datos + "</div></article>";
  }

  function filtrarVisibles() {
    var c = state.campana;
    var dests = (c && c.destinatarios) || [];
    if (state.filtroEstado === "todos") return dests;
    return dests.filter(function (d) { return !(c.enviados && c.enviados[d.id]); });
  }

  function pintarEnviados() {
    var c = state.campana;
    if (!c) return;
    var dests = c.destinatarios || [];
    var enviados = c.enviados || {};
    var n = dests.length;
    var e = Object.keys(enviados).length;

    var barra = $q("[data-dif-progreso]", seccion);
    var texto = $q("[data-dif-progreso-texto]", seccion);
    if (texto) texto.textContent = e + " de " + n + " enviados";
    if (barra) {
      barra.setAttribute("aria-valuemin", "0");
      barra.setAttribute("aria-valuemax", String(n));
      barra.setAttribute("aria-valuenow", String(e));
      barra.style.setProperty("--rce-dif-pct", (n ? e / n * 100 : 0) + "%");
    }

    var visibles = filtrarVisibles();
    var lista = $q("[data-dif-lista]", seccion);
    lista.innerHTML = visibles.length
      ? visibles.map(filaHtml).join("")
      : '<p class="redcafe-pub-vacio">' + (n ? "No quedan pendientes." : "Sin destinatarios.") + "</p>";

    Array.prototype.slice.call(seccion.querySelectorAll("[data-dif-filtro]")).forEach(function (b) {
      var on = b.getAttribute("data-dif-filtro") === state.filtroEstado;
      b.classList.toggle("is-activo", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function marcarUid(uid, enviado) {
    if (!state.campana) return;
    var campanaId = state.campana.id;
    var fila = seccion.querySelector('.redcafe-dif-fila[data-uid="' + uid + '"]');
    if (fila) {
      var btn = fila.querySelector("[data-dif-accion]");
      if (btn) btn.disabled = true;
    }
    postJson({ accion: "marcar", id: campanaId, uid: uid, enviado: enviado }).then(function (res) {
      if (!res || !res.ok) {
        if (fila) {
          var b2 = fila.querySelector("[data-dif-accion]");
          if (b2) b2.disabled = false;
        }
        window.alert((res && (res.error || res.message)) || "No se pudo marcar el envío.");
        return;
      }
      state.campana = res.data.campaign;
      pintarEnviados();
      cargarCampanas();
    });
  }

  function siguientePendiente() {
    var lista = $q("[data-dif-lista]", seccion);
    if (!lista) return;
    var fila = lista.querySelector('[data-enviado="0"]');
    if (!fila) {
      var texto = $q("[data-dif-progreso-texto]", seccion);
      if (texto && !/de 0/.test(texto.textContent)) window.alert("Ya enviaste a todos los pendientes.");
      return;
    }
    if (fila.scrollIntoView) fila.scrollIntoView({ block: "center", behavior: "smooth" });
    var a = fila.querySelector("[data-dif-accion]");
    if (a && a.focus) a.focus();
  }

  // ─── Campañas anteriores ──────────────────────────────────────────────────

  function cargarCampanas() {
    var cont = $q("[data-dif-campanas]", seccion);
    if (!cont) return;
    json(API + "?action=list").then(function (res) {
      if (!res || !res.ok) {
        cont.innerHTML = '<p class="redcafe-pub-vacio">No se pudieron cargar las campañas.</p>';
        return;
      }
      var cs = (res.data && res.data.campaigns) || [];
      state.campanas = cs;
      if (!cs.length) {
        cont.innerHTML = '<p class="redcafe-pub-vacio">Todavía no hay campañas.</p>';
        return;
      }
      cont.innerHTML = cs.map(function (c) {
        return '<div class="redcafe-dif-campana">' +
          '<div class="redcafe-dif-campana-info">' +
            "<strong>" + esc(c.titulo) + "</strong>" +
            '<span class="redcafe-dif-campana-meta">' + esc(fecha(c.creada_at)) + " · " +
              c.enviados_count + " de " + c.total + " enviados</span>" +
          "</div>" +
          '<div class="redcafe-dif-campana-acc">' +
            '<button type="button" class="redcafe-ped-btn" data-dif-accion="abrir-campana" data-id="' +
              esc(c.id) + '">Continuar</button>' +
            '<button type="button" class="redcafe-ped-btn is-borrar" data-dif-accion="borrar-campana" data-id="' +
              esc(c.id) + '">Borrar</button>' +
          "</div>" +
        "</div>";
      }).join("");
    });
  }

  function abrirCampana(id) {
    json(API + "?action=get&id=" + encodeURIComponent(id)).then(function (res) {
      if (!res || !res.ok) {
        window.alert((res && (res.error || res.message)) || "No se pudo abrir la campaña.");
        return;
      }
      state.campana = res.data.campaign;
      abrirPaso3();
    });
  }

  function borrarCampana(id) {
    if (!window.confirm("¿Borrar esta campaña y su registro de envíos? No se puede deshacer.")) return;
    postJson({ accion: "borrar", id: id }).then(function (res) {
      if (!res || !res.ok) {
        window.alert((res && (res.error || res.message)) || "No se pudo borrar la campaña.");
        return;
      }
      if (state.campana && state.campana.id === id) {
        state.campana = null;
        var paso3 = seccion.querySelector('[data-dif-paso="3"]');
        paso3.hidden = true;
      }
      cargarCampanas();
    });
  }

  // ─── Eventos ──────────────────────────────────────────────────────────────

  function enlazarEventos() {
    seccion.addEventListener("click", function (ev) {
      var el = ev.target;
      var acc = el && el.closest && el.closest("[data-dif-accion]");
      if (acc) {
        var uid = acc.getAttribute("data-uid");
        var id = acc.getAttribute("data-id");
        switch (acc.getAttribute("data-dif-accion")) {
          case "ver-destinatarios": verDestinatarios(); break;
          case "crear-campana": crearCampana(); break;
          case "siguiente-pendiente": siguientePendiente(); break;
          case "enviar": if (uid) marcarUid(uid, true); break;
          case "desmarcar": if (uid) marcarUid(uid, false); break;
          case "abrir-campana": if (id) abrirCampana(id); break;
          case "borrar-campana": if (id) borrarCampana(id); break;
        }
        return;
      }
      var filtro = el && el.closest && el.closest("[data-dif-filtro]");
      if (filtro) {
        state.filtroEstado = filtro.getAttribute("data-dif-filtro");
        pintarEnviados();
      }
    });

    seccion.addEventListener("input", function (ev) {
      var t = ev.target;
      if (t && t.hasAttribute && t.hasAttribute("data-dif-mensaje")) {
        pintarContador();
        pintarPreview();
      } else if (t && t.hasAttribute && t.hasAttribute("data-dif-enlace")) {
        pintarPreview();
      } else if (t && t.hasAttribute && t.hasAttribute("data-dif-titulo")) {
        pintarPreview();
      }
    });

    seccion.addEventListener("change", function () { pintarPreview(); });
  }

  // ─── Arranque: solo /admin/ y solo si la API responde 200 ─────────────────

  function enRuta() {
    return location.pathname.indexOf("/admin") === 0;
  }

  function intentarMontar(intentos) {
    if ($id("redcafe-admin-difusion")) return;
    if (montar()) {
      enlazarEventos();
      cargarCampanas();
      return;
    }
    if (intentos >= 10) return;
    setTimeout(function () { intentarMontar(intentos + 1); }, 300);
  }

  function iniciar() {
    if (!enRuta()) return;
    json(API + "?action=list").then(function (res) {
      if (!res || !res.ok) return;   // 401/403: no pintar nada
      intentarMontar(0);
    });
  }

  if (document.readyState === "complete") setTimeout(iniciar, 1300);
  else window.addEventListener("load", function () { setTimeout(iniciar, 1300); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 1000); });
})();