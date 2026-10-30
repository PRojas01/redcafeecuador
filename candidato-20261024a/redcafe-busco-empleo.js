/* Red Café Ecuador — «Busco empleo» en el panel
 * ---------------------------------------------------------------------------
 * La otra cara de la bolsa de empleo, y está ABIERTA A TODOS los perfiles:
 * entre los 32 miembros hay 19 productores, 7 asesores, 2 baristas y 1 pilador,
 * y limitar esto a un perfil dejaría un tablero de dos personas.
 *
 * Quien quiera ofrecer asesoría por encargo NO viene aquí: para eso está la
 * pestaña «Servicios» del marketplace, que cualquier miembro puede usar. Dos
 * sitios para lo mismo reparten la oferta y ninguno se ve lleno.
 *
 * Misma forma que redcafe-empleos.js y redcafe-requerimientos.js a propósito.
 * Todo cuelga de un contenedor propio; nunca se escribe dentro de React.
 */
(function () {
  "use strict";

  var CATEGORIAS = [
    ["barismo", "Barismo"],
    ["produccion-agricola", "Producción agrícola"],
    ["beneficio-pilado", "Beneficio y pilado"],
    ["tueste", "Tueste"],
    ["calidad-catacion", "Calidad y catación"],
    ["ventas", "Ventas"],
    ["logistica-transporte", "Logística y transporte"],
    ["administracion", "Administración"],
    ["tecnico-agronomo", "Técnico agrónomo"],
    ["otro", "Otro"]
  ];
  var EXPERIENCIAS = [
    ["sin-experiencia", "Sin experiencia"], ["1-2-anios", "1 a 2 años"],
    ["3-5-anios", "3 a 5 años"], ["mas-5-anios", "Más de 5 años"]
  ];
  var MODALIDADES = [["cualquiera", "Cualquiera"], ["presencial", "Presencial"], ["hibrido", "Híbrido"], ["remoto", "Remoto"]];
  var JORNADAS = [
    ["cualquiera", "Cualquiera"], ["tiempo-completo", "Tiempo completo"],
    ["medio-tiempo", "Medio tiempo"], ["por-horas", "Por horas"],
    ["temporal", "Temporal"], ["por-obra", "Por obra"]
  ];
  var DISPONIBILIDAD = [
    ["inmediata", "Inmediata"], ["dos-semanas", "En dos semanas"],
    ["un-mes", "En un mes"], ["a-convenir", "A convenir"]
  ];
  var PERIODOS = [["mes", "Mes"], ["dia", "Día"], ["hora", "Hora"], ["obra", "Obra"]];
  var CONTACTOS = [["plataforma", "Plataforma"], ["whatsapp", "WhatsApp"], ["correo", "Correo"]];
  var ESTADOS = [["abierta", "Abierta"], ["pausada", "Pausada"], ["cerrada", "Cerrada"]];
  var ESTADOS_INTERES = [
    ["recibido", "Recibido"], ["en-conversacion", "En conversación"],
    ["descartado", "Descartado"], ["contratado", "Contratado"]
  ];

  var estado = { user: null, busquedas: [], contactos: [] };

  function el(tag, attrs, texto) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
      if (k === "className") n.className = attrs[k];
      else if (k === "htmlFor") n.htmlFor = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }

  function api(action, data, params) {
    var opts = { credentials: "include", cache: "no-store" };
    if (data) {
      opts.method = "POST";
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(data);
    }
    // Los parámetros van aparte: pegarlos a la acción y codificar el conjunto
    // convierte el «&» en %26 y la llamada nunca llega.
    var url = "/api/busco-empleo.php?action=" + encodeURIComponent(action);
    if (params) {
      Object.keys(params).forEach(function (k) {
        url += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      });
    }
    return fetch(url, opts).then(function (r) {
      return r.json().then(function (j) { j.httpStatus = r.status; return j; },
                           function () { return { ok: false, httpStatus: r.status }; });
    }).catch(function () { return { ok: false, error: "No se pudo conectar con la API." }; });
  }

  function opciones(select, items) {
    items.forEach(function (i) { select.appendChild(el("option", { value: i[0] }, i[1])); });
  }

  function campo(wrap, name, label, type, required, attrs) {
    var id = "redcafe-busco-" + name;
    var box = el("label", { className: "redcafe-req-campo", htmlFor: id });
    box.appendChild(el("span", {}, label));
    var a = { id: id, name: name };
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) { a[k] = attrs[k]; });
    var input = el(type === "textarea" ? "textarea" : "input", a);
    if (type !== "textarea") input.setAttribute("type", type || "text");
    if (required) input.setAttribute("required", "required");
    box.appendChild(input);
    wrap.appendChild(box);
    return input;
  }

  function campoSelect(wrap, name, label, items) {
    var id = "redcafe-busco-" + name;
    var box = el("label", { className: "redcafe-req-campo", htmlFor: id });
    box.appendChild(el("span", {}, label));
    var select = el("select", { id: id, name: name, required: "required" });
    opciones(select, items);
    box.appendChild(select);
    wrap.appendChild(box);
    return select;
  }

  function fechaMinima() { return new Date().toISOString().slice(0, 10); }
  function fechaMaxima() {
    var d = new Date(); d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  function msg(section, texto, tipo) {
    var n = section.querySelector(".redcafe-busco-msg");
    if (!n) return;
    n.className = "redcafe-busco-msg " + (tipo || "");
    n.textContent = texto || "";
  }

  function formData(form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (i) {
      if (!i.name) return;
      if (i.type === "checkbox") out[i.name] = i.checked;
      else out[i.name] = i.value;
    });
    return out;
  }

  /* Los mismos campos para publicar y para editar: quien publicó su búsqueda
     puede corregirla —cambió de provincia, ya no pide el mismo sueldo— sin
     borrarla y empezar de nuevo. La API ya lo permitía; faltaba el botón. */
  function camposBusqueda(form, valores) {
    campo(form, "titulo", "Título", "text", true, { maxlength: "120", minlength: "5", placeholder: "Barista con 3 años en especialidad" });
    campo(form, "descripcion", "Qué sabe hacer y qué busca", "textarea", true, { maxlength: "3000", minlength: "20", rows: "5" });
    campoSelect(form, "categoria", "Área", CATEGORIAS);
    campoSelect(form, "experiencia", "Experiencia", EXPERIENCIAS);
    campoSelect(form, "jornada", "Jornada que busca", JORNADAS);
    campoSelect(form, "modalidad", "Modalidad", MODALIDADES);
    campoSelect(form, "disponibilidad", "Disponibilidad", DISPONIBILIDAD);
    campo(form, "provincia", "Provincia", "text", true, { maxlength: "80" });
    campo(form, "canton", "Cantón (opcional)", "text", false, { maxlength: "80" });
    campo(form, "pretensionDesde", "Pretensión desde (opcional)", "number", false, { min: "0", step: "0.01" });
    campo(form, "pretensionHasta", "Pretensión hasta (opcional)", "number", false, { min: "0", step: "0.01" });
    campoSelect(form, "pretensionPeriodo", "Periodo", PERIODOS);
    campo(form, "cierra", "Vigente hasta", "date", false, { min: fechaMinima(), max: fechaMaxima() });
    campoSelect(form, "contactoPreferido", "Contacto preferido", CONTACTOS);
    campoSelect(form, "estado", "Estado", ESTADOS);

    var check = el("label", { className: "redcafe-req-check" });
    check.appendChild(el("input", { type: "checkbox", name: "mostrarPretension" }));
    check.appendChild(el("span", {}, "Mostrar mi pretensión salarial en el marketplace"));
    form.appendChild(check);

    if (!valores) return;
    Array.prototype.forEach.call(form.elements, function (i) {
      if (!i.name || valores[i.name] === undefined || valores[i.name] === null) return;
      if (i.type === "checkbox") i.checked = !!valores[i.name];
      else if (i.type === "date") i.value = String(valores[i.name]).slice(0, 10);
      else i.value = String(valores[i.name]);
    });
  }

  function crearFormulario(section) {
    var panel = el("div", { className: "redcafe-req-panel" });
    panel.appendChild(el("h4", {}, "Publicar que busca empleo"));
    panel.appendChild(el("p", { className: "redcafe-req-nota" },
      "Lo puede publicar cualquier perfil. Su nombre y su perfil se ven en el marketplace; " +
      "su correo y su teléfono no, y solo los recibe quien usted decida responder."));

    var form = el("form", { className: "redcafe-req-form" });
    camposBusqueda(form);
    form.appendChild(el("button", { type: "submit", className: "redcafe-req-btn" }, "Publicar"));

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      msg(section, "Publicando…", "");
      api("publish", formData(form)).then(function (res) {
        if (!res.ok) { msg(section, res.error || "No se pudo publicar.", "error"); return; }
        form.reset();
        msg(section, "Publicado. Ya aparece en el marketplace, en Empleos › Buscan trabajo.", "ok");
        cargar(section);
      });
    });
    panel.appendChild(form);
    return panel;
  }

  function interesFila(section, i) {
    var row = el("article", { className: "redcafe-req-oferta" });
    row.appendChild(el("strong", {}, i.empleador || "Un miembro"));
    row.appendChild(el("p", { className: "redcafe-req-meta" },
      (i.empleador_empresa || i.empleador_rol || "perfil")));
    row.appendChild(el("p", {}, i.mensaje || ""));
    // El contacto de quien escribe sí se muestra: escribió para que le
    // respondan. El de quien busca empleo nunca sale del servidor.
    if (i.empleador_email || i.empleador_telefono) {
      row.appendChild(el("p", { className: "redcafe-req-contacto" },
        [i.empleador_email || "", i.empleador_telefono || ""].filter(Boolean).join(" · ")));
    }
    var sel = el("select", { "aria-label": "Estado del contacto" });
    opciones(sel, ESTADOS_INTERES);
    sel.value = i.estado || "recibido";
    sel.addEventListener("change", function () {
      api("resolver", { id: i.id, estado: sel.value }).then(function (res) {
        msg(section, res.ok ? "Estado actualizado." : (res.error || "No se pudo actualizar."), res.ok ? "ok" : "error");
      });
    });
    row.appendChild(sel);
    return row;
  }

  function busquedaCard(section, b) {
    var card = el("article", { className: "redcafe-req-card" });
    card.appendChild(el("h5", {}, b.titulo || "Busco empleo"));
    card.appendChild(el("p", { className: "redcafe-req-meta" },
      [b.estado || "", b.provincia || "", b.disponibilidad || ""].filter(Boolean).join(" · ")));
    card.appendChild(el("p", {}, b.descripcion || ""));
    var n = Number(b.intereses_count || 0);
    card.appendChild(el("p", { className: "redcafe-req-meta" },
      n === 1 ? "1 persona le escribió" : n + " personas le escribieron"));

    var details = el("details", {});
    details.appendChild(el("summary", {}, "Ver quién le escribió"));
    var box = el("div", { className: "redcafe-req-ofertas" });
    box.appendChild(el("p", {}, "Cargando…"));
    details.appendChild(box);
    details.addEventListener("toggle", function () {
      if (!details.open) return;
      api("intereses", null, { id: b.id }).then(function (res) {
        while (box.firstChild) box.removeChild(box.firstChild);
        var lista = (res.ok && res.data && res.data.intereses) || [];
        if (!lista.length) {
          box.appendChild(el("p", { className: "redcafe-req-vacio" }, "Todavía no le ha escrito nadie."));
          return;
        }
        lista.forEach(function (i) { box.appendChild(interesFila(section, i)); });
      });
    });
    card.appendChild(details);

    var acciones = el("div", { className: "redcafe-req-acciones" });
    var editor = null;
    var editar = el("button", { type: "button", className: "redcafe-req-btn-suave" }, "Editar");
    editar.addEventListener("click", function () {
      if (editor) { editor.remove(); editor = null; editar.textContent = "Editar"; return; }
      editar.textContent = "Cancelar";
      editor = el("form", { className: "redcafe-req-form" });
      camposBusqueda(editor, b);
      var guardar = el("button", { type: "submit", className: "redcafe-req-btn" }, "Guardar cambios");
      editor.appendChild(guardar);
      editor.addEventListener("submit", function (ev) {
        ev.preventDefault();
        guardar.disabled = true;
        guardar.textContent = "Guardando…";
        api("update", Object.assign({ id: b.id }, formData(editor))).then(function (res) {
          guardar.disabled = false;
          guardar.textContent = "Guardar cambios";
          if (!res.ok) { msg(section, res.error || "No se pudo actualizar.", "error"); return; }
          msg(section, "Publicación actualizada.", "ok");
          cargar(section);
        });
      });
      card.appendChild(editor);
    });
    acciones.appendChild(editar);
    if ((b.estado || "") !== "cerrada") {
      var cerrar = el("button", { type: "button", className: "redcafe-req-btn-suave" }, "Ya no busco empleo");
      cerrar.addEventListener("click", function () {
        api("cerrar", { id: b.id }).then(function (res) {
          msg(section, res.ok ? "Retirado del marketplace." : (res.error || "No se pudo retirar."), res.ok ? "ok" : "error");
          if (res.ok) cargar(section);
        });
      });
      acciones.appendChild(cerrar);
    }
    /* eliminar-propias */
    var borrarBusq = el("button", { type: "button", className: "redcafe-req-btn-suave" }, "Eliminar");
    borrarBusq.addEventListener("click", function () {
      if (!window.confirm("¿Eliminar «" + (b.titulo || "esta búsqueda") + "»? No se puede deshacer.")) return;
      borrarBusq.disabled = true;
      api("delete", { id: b.id }, { id: b.id }).then(function (res) {
        borrarBusq.disabled = false;
        msg(section, res.ok ? "Publicación eliminada." : (res.error || "No se pudo eliminar."), res.ok ? "ok" : "error");
        if (res.ok) cargar(section);
      });
    });
    acciones.appendChild(borrarBusq);
    card.appendChild(acciones);
    return card;
  }

  function renderMias(section) {
    var lista = section.querySelector(".redcafe-busco-mias");
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    if (!estado.busquedas.length) {
      lista.appendChild(el("p", { className: "redcafe-req-vacio" }, "Todavía no ha publicado que busca empleo."));
      return;
    }
    estado.busquedas.forEach(function (b) { lista.appendChild(busquedaCard(section, b)); });
  }

  function renderContactos(section) {
    var lista = section.querySelector(".redcafe-busco-contactos");
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    if (!estado.contactos.length) {
      lista.appendChild(el("p", { className: "redcafe-req-vacio" },
        "Todavía no ha escrito a nadie. Los encuentra en el marketplace, en Empleos › Buscan trabajo."));
      return;
    }
    estado.contactos.forEach(function (c) {
      var b = c.busqueda || {};
      var card = el("article", { className: "redcafe-req-card" });
      card.appendChild(el("h5", {}, b.titulo || "Publicación retirada"));
      card.appendChild(el("p", { className: "redcafe-req-meta" }, "Estado: " + (c.estado || "recibido")));
      if (b.autor) card.appendChild(el("p", { className: "redcafe-req-meta" }, b.autor));
      card.appendChild(el("p", {}, c.mensaje || ""));
      lista.appendChild(card);
    });
  }

  function cargar(section) {
    api("mias").then(function (res) {
      if (res.ok && res.data) estado.busquedas = Array.isArray(res.data.busquedas) ? res.data.busquedas : [];
      renderMias(section);
    });
    api("mis_contactos").then(function (res) {
      if (res.ok && res.data) estado.contactos = Array.isArray(res.data.contactos) ? res.data.contactos : [];
      renderContactos(section);
    });
  }

  function montar() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-busco-empleo-panel")) return;

    var section = el("section", {
      id: "redcafe-busco-empleo-panel",
      className: "redcafe-req-seccion",
      "data-redcafe-propio": "1"
    });
    var wrap = el("div", { className: "redcafe-req-wrap" });
    var head = el("div", { className: "redcafe-req-head" });
    var title = el("div", {});
    title.appendChild(el("h3", {}, "Busco empleo"));
    title.appendChild(el("p", {},
      "Publique que busca trabajo y deje que le escriban. Si lo que ofrece es asesoría por encargo, " +
      "publíquelo en Servicios, no aquí."));
    head.appendChild(title);
    head.appendChild(el("div", { className: "redcafe-busco-msg redcafe-req-msg", "aria-live": "polite" }));
    wrap.appendChild(head);

    var grid = el("div", { className: "redcafe-req-grid" });
    var izquierda = el("div", {});
    izquierda.appendChild(crearFormulario(section));
    var mias = el("div", { className: "redcafe-req-panel" });
    mias.appendChild(el("h4", {}, "Mi publicación"));
    mias.appendChild(el("div", { className: "redcafe-busco-mias" }));
    izquierda.appendChild(mias);
    var derecha = el("div", { className: "redcafe-req-panel" });
    derecha.appendChild(el("h4", {}, "A quién he escrito"));
    derecha.appendChild(el("div", { className: "redcafe-busco-contactos" }));
    grid.appendChild(izquierda);
    grid.appendChild(derecha);
    wrap.appendChild(grid);
    section.appendChild(wrap);

    var recursos = document.getElementById("redcafe-panel-resources");
    if (recursos && recursos.parentNode === main) main.insertBefore(section, recursos);
    else main.appendChild(section);
    cargar(section);
  }

  function iniciar() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    fetch("/api/auth.php?action=me", { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var u = res && res.ok && res.data && res.data.user;
        if (!u || !u.id) return;
        estado.user = u;
        [1000, 2600, 4600].forEach(function (t) { setTimeout(montar, t); });
      })
      .catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(iniciar, 700);
  else window.addEventListener("load", function () { setTimeout(iniciar, 700); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 1000); });
})();
