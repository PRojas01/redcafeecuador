/* Red Café Ecuador — bolsa de empleo del panel */
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
  var MODALIDADES = [["presencial", "Presencial"], ["hibrido", "Híbrido"], ["remoto", "Remoto"]];
  var JORNADAS = [
    ["tiempo-completo", "Tiempo completo"],
    ["medio-tiempo", "Medio tiempo"],
    ["por-horas", "Por horas"],
    ["temporal", "Temporal"],
    ["por-obra", "Por obra"]
  ];
  var PERIODOS = [["hora", "Hora"], ["dia", "Día"], ["mes", "Mes"], ["obra", "Obra"]];
  var EXPERIENCIAS = [
    ["sin-experiencia", "Sin experiencia"],
    ["1-2-anios", "1 a 2 años"],
    ["3-5-anios", "3 a 5 años"],
    ["mas-5-anios", "Más de 5 años"]
  ];
  var CONTACTOS = [["plataforma", "Plataforma"], ["whatsapp", "WhatsApp"], ["correo", "Correo"]];
  var ESTADOS_OFERTA = [["abierta", "Abierta"], ["pausada", "Pausada"], ["cerrada", "Cerrada"]];
  var ESTADOS_POSTULACION = [
    ["recibida", "Recibida"],
    ["en-revision", "En revisión"],
    ["preseleccionado", "Preseleccionado"],
    ["descartada", "Descartada"],
    ["contratado", "Contratado"]
  ];
  var CONTRATAN = {
    productor: true, vendedor: true, comprador: true, bar: true, barista: true,
    certificador: true, transportista: true, pilador: true, exportador: true,
    proveedor: true, asesor: true
  };
  var estado = { user: null, puedeContratar: false, admin: false, ofertas: [], postulaciones: [] };

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

  function skeletonLista(label) {
    var wrap = el("div", { className: "redcafe-skeleton redcafe-skeleton-lista", role: "status", "aria-label": label || "Cargando" });
    for (var i = 0; i < 2; i++) {
      var card = el("article", { className: "redcafe-skeleton-card", "aria-hidden": "true" });
      card.appendChild(el("span", { className: "redcafe-skeleton-bloque redcafe-skeleton-linea corta" }));
      card.appendChild(el("span", { className: "redcafe-skeleton-bloque redcafe-skeleton-linea" }));
      card.appendChild(el("span", { className: "redcafe-skeleton-bloque redcafe-skeleton-linea media" }));
      wrap.appendChild(card);
    }
    return wrap;
  }

  function api(action, data) {
    var opts = { credentials: "include", cache: "no-store" };
    if (data) {
      opts.method = "POST";
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(data);
    }
    return fetch("/api/empleos.php?action=" + encodeURIComponent(action), opts)
      .then(function (r) {
        return r.json().then(function (j) {
          j.httpStatus = r.status;
          return j;
        });
      })
      .catch(function () { return { ok: false, error: "No se pudo conectar con la API." }; });
  }

  function opciones(select, items) {
    items.forEach(function (item) {
      select.appendChild(el("option", { value: item[0] }, item[1]));
    });
  }

  function campo(wrap, name, label, type, required, attrs) {
    var id = "redcafe-empleo-" + name;
    var box = el("label", { className: "redcafe-empleo-campo", htmlFor: id });
    box.appendChild(el("span", {}, label));
    var inputAttrs = { id: id, name: name };
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) { inputAttrs[k] = attrs[k]; });
    var input = el(type === "textarea" ? "textarea" : "input", inputAttrs);
    if (type !== "textarea") input.setAttribute("type", type || "text");
    if (required) input.setAttribute("required", "required");
    box.appendChild(input);
    wrap.appendChild(box);
    return input;
  }

  function campoSelect(wrap, name, label, items) {
    var id = "redcafe-empleo-" + name;
    var box = el("label", { className: "redcafe-empleo-campo", htmlFor: id });
    box.appendChild(el("span", {}, label));
    var select = el("select", { id: id, name: name, required: "required" });
    opciones(select, items);
    box.appendChild(select);
    wrap.appendChild(box);
    return select;
  }

  function fechaMinima() {
    var d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function fechaMaxima() {
    var d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  function msg(section, texto, tipo) {
    var n = section.querySelector(".redcafe-empleo-msg");
    if (!n) return;
    n.className = "redcafe-empleo-msg " + (tipo || "");
    n.textContent = texto || "";
  }

  function puedeContratar(user) {
    if (!user) return false;
    if (user.rol === "admin" || user.admin || user.is_admin) return true;
    var roles = Array.isArray(user.roles) ? user.roles : [user.rol || ""];
    for (var i = 0; i < roles.length; i++) {
      if (CONTRATAN[roles[i]]) return true;
    }
    return false;
  }

  function dinero(oferta) {
    if (oferta.salarioDesde === undefined && oferta.salarioHasta === undefined) return "Salario reservado";
    var desde = oferta.salarioDesde !== null && oferta.salarioDesde !== undefined ? Number(oferta.salarioDesde) : null;
    var hasta = oferta.salarioHasta !== null && oferta.salarioHasta !== undefined ? Number(oferta.salarioHasta) : null;
    var periodo = oferta.salarioPeriodo ? " / " + oferta.salarioPeriodo : "";
    if (desde !== null && hasta !== null) return "$" + desde.toFixed(2) + " - $" + hasta.toFixed(2) + periodo;
    if (desde !== null) return "Desde $" + desde.toFixed(2) + periodo;
    if (hasta !== null) return "Hasta $" + hasta.toFixed(2) + periodo;
    return "Salario por acordar";
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

  /* Los mismos campos sirven para publicar y para editar: la API acepta el
     mismo cuerpo en «publish» y en «update», y quien publicó una oferta tiene
     derecho a corregirla sin borrarla y volver a empezar. */
  function camposOferta(form, valores) {
    campo(form, "titulo", "Título", "text", true, { maxlength: "120", minlength: "5" });
    campo(form, "empresa", "Empresa", "text", false, { maxlength: "120" });
    campo(form, "descripcion", "Descripción", "textarea", true, { maxlength: "3000", minlength: "20", rows: "5" });
    campoSelect(form, "categoria", "Categoría", CATEGORIAS);
    campoSelect(form, "modalidad", "Modalidad", MODALIDADES);
    campoSelect(form, "jornada", "Jornada", JORNADAS);
    campo(form, "provincia", "Provincia", "text", true, { maxlength: "80" });
    campo(form, "canton", "Cantón", "text", false, { maxlength: "80" });
    campo(form, "salarioDesde", "Salario desde", "number", false, { min: "0", step: "0.01" });
    campo(form, "salarioHasta", "Salario hasta", "number", false, { min: "0", step: "0.01" });
    campoSelect(form, "salarioPeriodo", "Periodo", PERIODOS);
    campoSelect(form, "experiencia", "Experiencia", EXPERIENCIAS);
    campo(form, "vacantes", "Vacantes", "number", true, { min: "1", max: "99", value: "1" });
    campo(form, "cierra", "Cierra", "date", true, { min: fechaMinima(), max: fechaMaxima() });
    campoSelect(form, "contactoPreferido", "Contacto preferido", CONTACTOS);
    campoSelect(form, "estado", "Estado", ESTADOS_OFERTA);
    var check = el("label", { className: "redcafe-empleo-check" });
    check.appendChild(el("input", { type: "checkbox", name: "mostrarSalario", checked: "checked" }));
    check.appendChild(el("span", {}, "Mostrar salario en la oferta pública"));
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
    var panel = el("div", { className: "redcafe-empleo-panel" });
    panel.appendChild(el("h4", {}, "Publicar una oferta"));
    if (!estado.puedeContratar) {
      panel.appendChild(el("p", { className: "redcafe-empleo-nota" },
        "Tu perfil no publica ofertas de empleo, pero sí puedes postular a oportunidades abiertas."));
      return panel;
    }
    /* Un asesor publicó aquí su consultoría como si fuera una vacante. No le
       faltaba un sitio —Servicios existe y cualquier miembro puede publicar en
       él—: no lo encontró. El aviso va ANTES del formulario, porque después de
       rellenar quince campos ya nadie cambia de sitio. */
    var desvio = el("p", { className: "redcafe-empleo-nota" });
    desvio.appendChild(document.createTextNode(
      "¿Lo que ofrece es su propio servicio o una asesoría por encargo, y no un puesto de trabajo? "));
    var aServicios = el("a", { href: "/panel/?ver=publicar_servicio" }, "Publíquelo en Servicios");
    desvio.appendChild(aServicios);
    desvio.appendChild(document.createTextNode(
      ": ahí lo buscan quienes necesitan contratar ese trabajo, y aquí se mezclaría con las vacantes."));
    panel.appendChild(desvio);

    var form = el("form", { className: "redcafe-empleo-form" });
    camposOferta(form);
    form.appendChild(el("button", { type: "submit", className: "redcafe-empleo-btn" }, "Publicar oferta"));
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      msg(section, "Publicando oferta...", "");
      api("publish", formData(form)).then(function (res) {
        if (!res.ok) {
          msg(section, res.error || "No se pudo publicar.", "error");
          return;
        }
        form.reset();
        msg(section, "Oferta publicada.", "ok");
        cargar(section);
      });
    });
    panel.appendChild(form);
    return panel;
  }

  function postulanteFila(section, p) {
    var row = el("article", { className: "redcafe-empleo-postulante" });
    row.appendChild(el("strong", {}, p.postulante || "Postulante"));
    row.appendChild(el("p", {}, (p.postulante_rol || "perfil") + (p.postulante_provincia ? " · " + p.postulante_provincia : "")));
    row.appendChild(el("p", {}, p.mensaje || ""));
    if (p.postulante_email || p.postulante_telefono) {
      row.appendChild(el("p", { className: "redcafe-empleo-contacto" },
        [p.postulante_email || "", p.postulante_telefono || ""].filter(Boolean).join(" · ")));
    }
    var sel = el("select", { "aria-label": "Estado de postulación" });
    opciones(sel, ESTADOS_POSTULACION);
    sel.value = p.estado || "recibida";
    sel.addEventListener("change", function () {
      api("resolver", { id: p.id, estado: sel.value }).then(function (res) {
        msg(section, res.ok ? "Estado actualizado." : (res.error || "No se pudo actualizar."), res.ok ? "ok" : "error");
      });
    });
    row.appendChild(sel);
    return row;
  }

  function ofertaCard(section, oferta) {
    var card = el("article", { className: "redcafe-empleo-card" });
    card.appendChild(el("h5", {}, oferta.titulo || "Oferta"));
    card.appendChild(el("p", { className: "redcafe-empleo-meta" },
      (oferta.estado || "") + " · " + (oferta.provincia || "") + " · " + dinero(oferta)));
    card.appendChild(el("p", {}, oferta.descripcion || ""));
    card.appendChild(el("p", { className: "redcafe-empleo-meta" },
      String(oferta.postulaciones_count || 0) + " postulación(es)"));
    var details = el("details", {});
    details.appendChild(el("summary", {}, "Ver postulantes"));
    var box = el("div", { className: "redcafe-empleo-postulantes" });
    box.appendChild(el("p", {}, "Cargando..."));
    details.appendChild(box);
    details.addEventListener("toggle", function () {
      if (!details.open || details.getAttribute("data-loaded")) return;
      api("postulaciones", { id: oferta.id }).then(function (res) {
        while (box.firstChild) box.removeChild(box.firstChild);
        if (!res.ok) {
          box.appendChild(el("p", {}, res.error || "No se pudo cargar."));
          return;
        }
        var items = res.data && Array.isArray(res.data.postulaciones) ? res.data.postulaciones : [];
        if (!items.length) box.appendChild(el("p", {}, "Todavía no hay postulantes."));
        items.forEach(function (p) { box.appendChild(postulanteFila(section, p)); });
        details.setAttribute("data-loaded", "1");
      });
    });
    card.appendChild(details);

    var editor = null;
    var editar = el("button", { type: "button", className: "redcafe-empleo-btn-suave" }, "Editar oferta");
    editar.addEventListener("click", function () {
      if (editor) { editor.remove(); editor = null; editar.textContent = "Editar oferta"; return; }
      editar.textContent = "Cancelar edición";
      editor = el("form", { className: "redcafe-empleo-form" });
      camposOferta(editor, oferta);
      var guardar = el("button", { type: "submit", className: "redcafe-empleo-btn" }, "Guardar cambios");
      editor.appendChild(guardar);
      editor.addEventListener("submit", function (ev) {
        ev.preventDefault();
        guardar.disabled = true;
        guardar.textContent = "Guardando…";
        api("update", Object.assign({ id: oferta.id }, formData(editor))).then(function (res) {
          guardar.disabled = false;
          guardar.textContent = "Guardar cambios";
          if (!res.ok) { msg(section, res.error || "No se pudo actualizar.", "error"); return; }
          msg(section, "Oferta actualizada.", "ok");
          cargar(section);
        });
      });
      card.appendChild(editor);
    });
    card.appendChild(editar);
    return card;
  }

  function renderMias(section) {
    var lista = section.querySelector(".redcafe-empleo-mias");
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    if (!estado.ofertas.length) {
      lista.appendChild(el("p", { className: "redcafe-empleo-vacio" }, "No tienes ofertas publicadas."));
      return;
    }
    estado.ofertas.forEach(function (o) { lista.appendChild(ofertaCard(section, o)); });
  }

  function renderMisPostulaciones(section) {
    var lista = section.querySelector(".redcafe-empleo-mis-postulaciones");
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    if (!estado.postulaciones.length) {
      lista.appendChild(el("p", { className: "redcafe-empleo-vacio" }, "Todavía no has postulado a ofertas."));
      return;
    }
    estado.postulaciones.forEach(function (p) {
      var e = p.empleo || {};
      var card = el("article", { className: "redcafe-empleo-card" });
      card.appendChild(el("h5", {}, e.titulo || "Oferta no disponible"));
      card.appendChild(el("p", { className: "redcafe-empleo-meta" }, "Estado: " + (p.estado || "recibida")));
      card.appendChild(el("p", {}, e.empresa || e.autor || ""));
      lista.appendChild(card);
    });
  }

  function cargar(section) {
    api("mias").then(function (res) {
      if (res.ok && res.data) {
        estado.ofertas = Array.isArray(res.data.empleos) ? res.data.empleos : [];
        estado.puedeContratar = !!res.data.puede_contratar;
        estado.admin = !!res.data.admin;
        var titulo = section.querySelector("[data-redcafe-empleo-mias-titulo]");
        if (titulo) titulo.textContent = estado.admin ? "Ofertas administradas" : "Mis ofertas";
      }
      renderMias(section);
    });
    api("mis_postulaciones").then(function (res) {
      if (res.ok && res.data) estado.postulaciones = Array.isArray(res.data.postulaciones) ? res.data.postulaciones : [];
      renderMisPostulaciones(section);
    });
  }

  function estilos() {
    if (document.getElementById("redcafe-empleos-style")) return;
    var s = el("style", { id: "redcafe-empleos-style" });
    s.textContent = [
      ".redcafe-empleo-seccion{border-top:1px solid rgba(24,37,31,.12);padding:28px 0;background:#fffdf8;color:#25221f}",
      ".redcafe-empleo-wrap{max-width:1120px;margin:0 auto;padding:0 16px}",
      ".redcafe-empleo-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:18px}",
      ".redcafe-empleo-head h3{margin:0;font-size:24px;line-height:1.2;color:#18251f}",
      ".redcafe-empleo-head p,.redcafe-empleo-nota,.redcafe-empleo-vacio{color:#6f625a;font-size:14px;line-height:1.5}",
      ".redcafe-empleo-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:18px}",
      ".redcafe-empleo-panel{border:1px solid rgba(24,37,31,.14);border-radius:8px;padding:16px;background:#fff}",
      ".redcafe-empleo-panel h4{margin:0 0 12px;font-size:18px;color:#18251f}",
      ".redcafe-empleo-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
      ".redcafe-empleo-campo{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700;color:#18251f}",
      ".redcafe-empleo-campo input,.redcafe-empleo-campo select,.redcafe-empleo-campo textarea,.redcafe-empleo-postulante select{min-height:42px;border:1px solid rgba(24,37,31,.25);border-radius:6px;padding:9px 10px;background:#fff;color:#25221f;outline:none}",
      ".redcafe-empleo-campo textarea{grid-column:1/-1;resize:vertical}",
      ".redcafe-empleo-campo input:focus,.redcafe-empleo-campo select:focus,.redcafe-empleo-campo textarea:focus,.redcafe-empleo-btn:focus,.redcafe-empleo-postulante select:focus{box-shadow:0 0 0 3px rgba(176,76,42,.28);border-color:#b04c2a}",
      ".redcafe-empleo-check{grid-column:1/-1;display:flex;align-items:center;gap:8px;font-size:14px;color:#18251f}",
      ".redcafe-empleo-btn{min-height:44px;border:0;border-radius:6px;background:#8f2f1f;color:#fff;font-weight:800;padding:0 16px;cursor:pointer}",
      ".redcafe-empleo-btn-suave{min-height:44px;border:1px solid rgba(24,37,31,.22);border-radius:6px;background:#fff;color:#18251f;font-weight:700;padding:0 14px;margin-top:8px;cursor:pointer}",
      ".redcafe-empleo-msg{min-height:22px;margin:8px 0 0;font-size:14px}.redcafe-empleo-msg.ok{color:#176b3a}.redcafe-empleo-msg.error{color:#9b1c1c}",
      ".redcafe-empleo-card{border-top:1px solid rgba(24,37,31,.12);padding:14px 0}.redcafe-empleo-card:first-child{border-top:0;padding-top:0}",
      ".redcafe-empleo-card h5{margin:0 0 6px;font-size:16px;color:#18251f}.redcafe-empleo-card p{margin:6px 0;font-size:14px;line-height:1.45}",
      ".redcafe-empleo-meta,.redcafe-empleo-contacto{color:#6f625a;font-size:13px}",
      ".redcafe-empleo-postulante{border:1px solid rgba(24,37,31,.12);border-radius:8px;padding:12px;margin-top:10px;background:#fffdf8}",
      "@media (max-width:860px){.redcafe-empleo-grid,.redcafe-empleo-form{grid-template-columns:1fr}.redcafe-empleo-head{display:block}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function montar() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-empleos-panel")) return;
    estilos();
    var section = el("section", {
      id: "redcafe-empleos-panel",
      "data-redcafe-propio": "1",
      className: "redcafe-empleo-seccion",
      "data-redcafe-propio": "1"
    });
    var wrap = el("div", { className: "redcafe-empleo-wrap" });
    var head = el("div", { className: "redcafe-empleo-head" });
    var title = el("div", {});
    title.appendChild(el("h3", {}, "Bolsa de empleo"));
    title.appendChild(el("p", {}, "Publica oportunidades, revisa postulantes y sigue el estado de tus postulaciones."));
    head.appendChild(title);
    var live = el("div", { className: "redcafe-empleo-msg", "aria-live": "polite" });
    head.appendChild(live);
    wrap.appendChild(head);
    var grid = el("div", { className: "redcafe-empleo-grid" });
    var izquierda = el("div", {});
    izquierda.appendChild(crearFormulario(section));
    var mias = el("div", { className: "redcafe-empleo-panel" });
    mias.appendChild(el("h4", { "data-redcafe-empleo-mias-titulo": "1" }, "Mis ofertas"));
    var listaMias = el("div", { className: "redcafe-empleo-mias" });
    listaMias.appendChild(skeletonLista("Cargando ofertas de empleo"));
    mias.appendChild(listaMias);
    izquierda.appendChild(mias);
    var derecha = el("div", { className: "redcafe-empleo-panel" });
    derecha.appendChild(el("h4", {}, "Mis postulaciones"));
    var listaPostulaciones = el("div", { className: "redcafe-empleo-mis-postulaciones" });
    listaPostulaciones.appendChild(skeletonLista("Cargando postulaciones"));
    derecha.appendChild(listaPostulaciones);
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
        estado.puedeContratar = puedeContratar(u);
        [1000, 2600, 4600].forEach(function (t) { setTimeout(montar, t); });
      })
      .catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(iniciar, 700);
  else window.addEventListener("load", function () { setTimeout(iniciar, 700); }, { once: true });
  // Next navega sin recargar: hay que volver a montar al cambiar de ruta.
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 1000); });
})();
