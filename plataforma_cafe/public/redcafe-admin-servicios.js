/* Red Café Ecuador — Servicios de la plataforma (administración)
   ------------------------------------------------------------------
   Los servicios que la Red vende —certificación EUDR, asesoría de
   exportación, flete, talleres— vivían en data/servicios.json y solo se
   podían cambiar editando ese archivo a mano en el hosting. Subir un precio
   obligaba a abrir el gestor de archivos de cPanel; crear un servicio nuevo,
   a escribir JSON sin equivocarse en una coma.

   Esta sección los administra desde el panel: editar, activar, retirar y
   crear. La API (marketplace-servicios.php, admin_list / admin_save /
   admin_delete) es la que autoriza: si no eres administración, devuelve 403
   y aquí no se monta nada.

   Regla del proyecto que este archivo respeta: no se escribe dentro de
   ningún nodo que pinte React. Todo cuelga de una <section> propia marcada
   con data-redcafe-propio, que el vigilante de ruta retira al navegar.
*/
(function () {
  "use strict";

  if (window.__redcafeAdminServicios) return;
  window.__redcafeAdminServicios = true;

  var CATEGORIAS = ["transporte", "catacion", "asesoria", "pilado",
                    "insumos", "capacitacion", "exportacion", "otro"];

  var CAMPOS = [
    { k: "nombre", label: "Nombre del servicio", tipo: "text" },
    { k: "precio", label: "Precio (USD)", tipo: "number",
      ayuda: "0 = se cotiza según alcance; se anuncia «A convenir»" },
    { k: "unidad", label: "Unidad", tipo: "text",
      ayuda: "Por lote, por quintal, por taller, por hora…" },
    { k: "categoria", label: "Categoría", tipo: "select", opciones: CATEGORIAS,
      porDefecto: "otro" },
    { k: "perfil", label: "Dirigido a", tipo: "select", opciones: [],
      porDefecto: "all" },
    { k: "cobertura", label: "Cobertura", tipo: "text", ayuda: "Ej.: Ecuador, Loja y Zamora" },
    { k: "icono", label: "Icono", tipo: "text", ayuda: "Un emoji. Ej.: ☕ 🚚 🎓" },
    { k: "gratis", label: "¿Es gratuito?", tipo: "select", opciones: ["no", "sí"],
      ayuda: "«Gratis» no se deduce del precio: un servicio puede costar 0 porque se cotiza aparte" },
    { k: "disponible", label: "¿Se ofrece ahora?", tipo: "select", opciones: ["sí", "no"],
      ayuda: "Un servicio no disponible deja de aparecer en el Marketplace" },
    { k: "descripcion", label: "Descripción", tipo: "textarea", ancho: true }
  ];

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

  function enviar(datos) {
    return json("/api/marketplace-servicios.php?action=admin_save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });
  }

  function etiquetaPrecio(s) {
    if (s.gratis) return "Gratis";
    var p = parseFloat(s.precio);
    if (!(p > 0)) return "A convenir";
    return "$ " + String(p);
  }

  // ── Formulario ─────────────────────────────────────────────────────────

  function campoHtml(campo, valor, perfiles) {
    var id = "sv-" + campo.k + "-" + Math.random().toString(36).slice(2, 8);
    var ayuda = campo.ayuda
      ? '<em class="redcafe-pub-ayuda">' + esc(campo.ayuda) + "</em>" : "";
    var control;

    if (campo.tipo === "select") {
      var opciones = campo.k === "perfil" ? perfiles : campo.opciones;
      var actual = String(valor === undefined || valor === null ? "" : valor);
      // La mayoría de los servicios se guardaron sin categoría. Si el valor
      // guardado no está entre las opciones, el navegador marcaría la primera
      // —«transporte»— y guardar la escribiría como si el administrador la
      // hubiera elegido. Se muestra el valor que la propia API asigna a lo que
      // no está clasificado, que es el único que no inventa nada.
      if (opciones.indexOf(actual) < 0) {
        actual = campo.porDefecto && opciones.indexOf(campo.porDefecto) >= 0
          ? campo.porDefecto : (opciones[0] || "");
      }
      control = '<select class="redcafe-pub-input" id="' + id + '" data-campo="' + campo.k + '">' +
        opciones.map(function (o) {
          return '<option value="' + esc(o) + '"' +
            (o === actual ? " selected" : "") + ">" + esc(o) + "</option>";
        }).join("") + "</select>";
    } else if (campo.tipo === "textarea") {
      control = '<textarea class="redcafe-pub-input" id="' + id + '" rows="3" ' +
        'data-campo="' + campo.k + '">' + esc(valor) + "</textarea>";
    } else {
      control = '<input class="redcafe-pub-input" id="' + id + '" type="' +
        (campo.tipo === "number" ? "number" : "text") + '"' +
        (campo.tipo === "number" ? ' step="0.01" min="0"' : "") +
        ' value="' + esc(valor) + '" data-campo="' + campo.k + '">';
    }

    return '<label class="redcafe-pub-label"' +
      (campo.ancho ? ' style="grid-column:1/-1"' : "") +
      ' for="' + id + '"><span>' + esc(campo.label) + "</span>" +
      control + ayuda + "</label>";
  }

  function valorDe(servicio, campo) {
    if (campo.k === "gratis") return servicio.gratis ? "sí" : "no";
    if (campo.k === "disponible") return servicio.disponible === false ? "no" : "sí";
    var v = servicio[campo.k];
    return v === undefined || v === null ? "" : v;
  }

  function leerFormulario(caja) {
    var datos = {};
    Array.prototype.slice.call(caja.querySelectorAll("[data-campo]")).forEach(function (el) {
      var k = el.getAttribute("data-campo");
      var v = el.value;
      if (k === "gratis" || k === "disponible") datos[k] = (v === "sí");
      else datos[k] = v;
    });
    return datos;
  }

  function tarjetaHtml(servicio, perfiles) {
    var nuevo = !servicio.id;
    return '<article class="redcafe-pub-card" data-servicio="' + esc(servicio.id || "") + '">' +
      '<div class="redcafe-pub-head">' +
        "<h4>" + esc(servicio.nombre || "Servicio nuevo") + "</h4>" +
        '<span class="redcafe-pub-tag">' +
          (nuevo ? "Sin guardar" : etiquetaPrecio(servicio) +
            (servicio.disponible === false ? " · Retirado" : "")) +
        "</span>" +
      "</div>" +
      '<div class="redcafe-pub-grid">' +
        CAMPOS.map(function (c) {
          return campoHtml(c, valorDe(servicio, c), perfiles);
        }).join("") +
      "</div>" +
      '<div class="redcafe-pub-acciones">' +
        '<button type="button" class="redcafe-pub-guardar" data-accion="guardar">' +
          (nuevo ? "Crear servicio" : "Guardar cambios") + "</button>" +
        (nuevo ? '<button type="button" class="redcafe-ped-btn" data-accion="cancelar">Cancelar</button>'
               : '<button type="button" class="redcafe-ped-btn is-borrar" data-accion="eliminar">Retirar del catálogo</button>') +
        '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>' +
      "</div>" +
    "</article>";
  }

  // ── Acciones ───────────────────────────────────────────────────────────

  function estado(card, texto, clase) {
    var e = card.querySelector(".redcafe-pub-estado");
    if (!e) return;
    e.textContent = texto;
    e.className = "redcafe-pub-estado" + (clase ? " " + clase : "");
  }

  function guardar(card, contexto) {
    var id = card.getAttribute("data-servicio") || "";
    var datos = leerFormulario(card);
    datos.id = id;
    if (!String(datos.nombre || "").trim()) {
      estado(card, "Escribe el nombre del servicio.", "is-error");
      return;
    }
    var boton = card.querySelector('[data-accion="guardar"]');
    if (boton) boton.disabled = true;
    estado(card, "Guardando…", "");

    enviar(datos).then(function (res) {
      if (boton) boton.disabled = false;
      if (!res || !res.ok) {
        estado(card, (res && (res.error || res.message)) || "No se pudo guardar.", "is-error");
        return;
      }
      estado(card, id ? "Guardado." : "Servicio creado.", "is-ok");
      // Un alta cambia la lista entera (id nuevo, orden alfabético): se
      // recarga en vez de intentar coserlo a mano.
      setTimeout(function () { cargar(contexto); }, 700);
    });
  }

  function eliminar(card, contexto) {
    var id = card.getAttribute("data-servicio") || "";
    if (!id) return;
    var nombre = (card.querySelector("h4") || {}).textContent || id;
    if (!window.confirm("¿Retirar «" + nombre + "» del catálogo de servicios?\n\n" +
        "Deja de ofrecerse en el Marketplace. Los pedidos ya registrados no se tocan.")) return;
    estado(card, "Retirando…", "");
    json("/api/marketplace-servicios.php?action=admin_delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id })
    }).then(function (res) {
      if (!res || !res.ok) {
        estado(card, (res && (res.error || res.message)) || "No se pudo retirar.", "is-error");
        return;
      }
      cargar(contexto);
    });
  }

  // ── Pintado ────────────────────────────────────────────────────────────

  function pintar(contexto, servicios, perfiles) {
    var lista = contexto.lista;
    contexto.perfiles = perfiles && perfiles.length ? perfiles : ["all"];

    if (!servicios.length) {
      lista.innerHTML = '<p class="redcafe-pub-vacio">Todavía no hay servicios de la plataforma. ' +
        "Crea el primero con el botón de arriba.</p>";
      return;
    }
    lista.innerHTML = servicios.map(function (s) {
      return tarjetaHtml(s, contexto.perfiles);
    }).join("");
  }

  function cargar(contexto) {
    json("/api/marketplace-servicios.php?action=admin_list").then(function (res) {
      if (!res || !res.ok) return;
      var d = res.data || res;
      pintar(contexto, d.servicios || [], d.perfiles || []);
    });
  }

  function anadirFormularioNuevo(contexto) {
    if (contexto.seccion.querySelector('[data-servicio=""]')) {
      var previo = contexto.seccion.querySelector('[data-servicio=""]');
      previo.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    var caja = document.createElement("div");
    caja.innerHTML = tarjetaHtml({
      id: "", nombre: "", descripcion: "", precio: 0, unidad: "servicio",
      categoria: "otro", perfil: "all", icono: "☕", cobertura: "Ecuador",
      gratis: false, disponible: true
    }, contexto.perfiles);
    var card = caja.firstChild;
    contexto.lista.insertBefore(card, contexto.lista.firstChild);
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    var primero = card.querySelector("input");
    if (primero) primero.focus();
  }

  // ── Montaje ────────────────────────────────────────────────────────────

  function enRuta() {
    var p = location.pathname;
    return p.indexOf("/admin") === 0 || p.indexOf("/panel") === 0;
  }

  function montar(datosIniciales) {
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-admin-servicios")) return;

    var seccion = document.createElement("section");
    seccion.id = "redcafe-admin-servicios";
    seccion.className = "redcafe-pub-seccion";
    seccion.setAttribute("data-redcafe-propio", "1");
    seccion.innerHTML =
      '<div class="redcafe-pub-wrap">' +
        '<p class="redcafe-pub-rotulo">Administración</p>' +
        '<h3 class="redcafe-pub-titulo">Servicios de la plataforma</h3>' +
        '<p class="redcafe-pub-intro">Los servicios que ofrece Red Café Ecuador en el Marketplace. ' +
          "Aquí se cambia el precio, el texto y la unidad de cobro, se retira un servicio o se crea uno nuevo. " +
          "Cada cambio de precio queda anotado en el registro de actividad.</p>" +
        '<div class="redcafe-pub-acciones">' +
          '<button type="button" class="redcafe-pub-guardar" data-accion="nuevo">+ Crear un servicio</button>' +
        "</div>" +
        '<div id="redcafe-admin-servicios-lista">' +
          '<p class="redcafe-pub-vacio">Cargando los servicios…</p>' +
        "</div>" +
      "</div>";

    var recursos = document.getElementById("redcafe-panel-resources");
    if (recursos && recursos.parentNode === main) main.insertBefore(seccion, recursos);
    else main.appendChild(seccion);

    var contexto = {
      seccion: seccion,
      lista: seccion.querySelector("#redcafe-admin-servicios-lista"),
      perfiles: (datosIniciales && datosIniciales.perfiles) || ["all"]
    };

    seccion.addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest && ev.target.closest("[data-accion]");
      if (!b) return;
      var accion = b.getAttribute("data-accion");
      if (accion === "nuevo") { anadirFormularioNuevo(contexto); return; }
      var card = b.closest(".redcafe-pub-card");
      if (!card) return;
      if (accion === "guardar") guardar(card, contexto);
      else if (accion === "eliminar") eliminar(card, contexto);
      else if (accion === "cancelar" && card.parentNode) card.parentNode.removeChild(card);
    });

    pintar(contexto,
      (datosIniciales && datosIniciales.servicios) || [],
      (datosIniciales && datosIniciales.perfiles) || []);
  }

  function preguntarALaApi() {
    json("/api/marketplace-servicios.php?action=admin_list").then(function (res) {
      if (!res || !res.ok) return;
      if (!enRuta()) return;
      montar(res.data || res);
    });
  }

  function iniciar() {
    if (!enRuta()) return;

    // Quien autoriza es la API: sin sesión de administración devuelve 403 y
    // esta sección no llega a existir. Pero en /panel/ entran todos los
    // miembros, y preguntar siempre dejaba un 403 en la consola de cada uno.
    // Así que ahí se pregunta primero quién es; en /admin/ no hace falta,
    // porque la sesión de administración no es la de ningún miembro.
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

  if (document.readyState === "complete") setTimeout(iniciar, 1200);
  else window.addEventListener("load", function () { setTimeout(iniciar, 1200); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 900); });
})();
