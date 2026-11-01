/* Red Café Ecuador — requerimientos de café ("compro café") en el panel
 * ---------------------------------------------------------------------------
 * Sigue a propósito la misma forma que redcafe-empleos.js: mismos nombres, la
 * misma rejilla de dos columnas y los mismos estados. Dos módulos que hacen lo
 * mismo con formas distintas se vuelven dos módulos que hay que aprender.
 *
 * Todo lo que pinta cuelga de un contenedor propio marcado
 * `data-redcafe-propio`, hermano de lo que monta React. Nunca se escribe dentro
 * de un nodo de React: hacerlo acaba en "NotFoundError: removeChild".
 */
(function () {
  "use strict";

  var TIPOS = [["verde", "Café verde"], ["tostado", "Café tostado"], ["cualquiera", "Cualquiera"]];
  var PROCESOS = [["cualquiera", "Cualquiera"], ["lavado", "Lavado"], ["honey", "Honey"], ["natural", "Natural"]];
  var UNIDADES = [["quintales", "Quintales"], ["sacos", "Sacos"], ["kg", "Kilos"]];
  var FRECUENCIAS = [
    ["unica", "Compra única"], ["mensual", "Mensual"],
    ["trimestral", "Trimestral"], ["anual", "Anual"]
  ];
  var CONTACTOS = [["plataforma", "Plataforma"], ["whatsapp", "WhatsApp"], ["correo", "Correo"]];
  var ESTADOS = [["abierta", "Abierta"], ["pausada", "Pausada"], ["cerrada", "Cerrada"]];
  var ESTADOS_OFERTA = [
    ["recibida", "Recibida"], ["en-revision", "En revisión"],
    ["preseleccionada", "Preseleccionada"], ["descartada", "Descartada"], ["cerrada", "Cerrada"]
  ];

  /* Decisión del propietario (10 sep 2026): publican los perfiles cuyo negocio
     es comprar café, más Barista y Amante del Café, que compran poco pero
     compran. El productor NO publica: es a quien va dirigido el requerimiento. */
  var COMPRAN = { comprador: true, vendedor: true, bar: true, exportador: true, barista: true, amante: true };

  var estado = { user: null, puedePublicar: false, admin: false, requerimientos: [], ofertas: [] };

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

  function api(action, data, params) {
    var opts = { credentials: "include", cache: "no-store" };
    if (data) {
      opts.method = "POST";
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(data);
    }
    // Los parámetros van aparte, no pegados a la acción: `encodeURIComponent`
    // convertiría el «&» y el «=» en %26 y %3D y la llamada nunca llegaría.
    var url = "/api/requerimientos.php?action=" + encodeURIComponent(action);
    if (params) {
      Object.keys(params).forEach(function (k) {
        url += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      });
    }
    return fetch(url, opts)
      .then(function (r) {
        return r.json().then(function (j) { j.httpStatus = r.status; return j; });
      })
      .catch(function () { return { ok: false, error: "No se pudo conectar con la API." }; });
  }

  function opciones(select, items) {
    items.forEach(function (i) { select.appendChild(el("option", { value: i[0] }, i[1])); });
  }

  function campo(wrap, name, label, type, required, attrs) {
    attrs = attrs || {};
    var id = attrs.id || ("redcafe-req-" + name);
    var box = el("label", { className: "redcafe-req-campo", htmlFor: id });
    box.appendChild(el("span", {}, label));
    var a = { id: id, name: name };
    Object.keys(attrs).forEach(function (k) { a[k] = attrs[k]; });
    var input = el(type === "textarea" ? "textarea" : "input", a);
    if (type !== "textarea") input.setAttribute("type", type || "text");
    if (required) input.setAttribute("required", "required");
    box.appendChild(input);
    wrap.appendChild(box);
    return input;
  }

  function campoSelect(wrap, name, label, items, attrs) {
    attrs = attrs || {};
    var id = attrs.id || ("redcafe-req-" + name);
    var box = el("label", { className: "redcafe-req-campo", htmlFor: id });
    box.appendChild(el("span", {}, label));
    var selectAttrs = { id: id, name: name, required: "required" };
    Object.keys(attrs).forEach(function (k) { selectAttrs[k] = attrs[k]; });
    var select = el("select", selectAttrs);
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
    var n = section.querySelector(".redcafe-req-msg");
    if (!n) return;
    n.className = "redcafe-req-msg " + (tipo || "");
    n.textContent = texto || "";
  }

  function puedePublicar(user) {
    if (!user) return false;
    if (user.rol === "admin" || user.admin || user.is_admin) return true;
    var roles = Array.isArray(user.roles) ? user.roles : [user.rol || ""];
    for (var i = 0; i < roles.length; i++) if (COMPRAN[roles[i]]) return true;
    return false;
  }

  function cantidadTexto(r) {
    var n = Number(r.cantidad);
    if (!isFinite(n)) return "";
    var cifra = n === Math.floor(n) ? String(n) : String(n);
    var singular = { sacos: "saco", quintales: "quintal", kg: "kg" };
    var unidad = (n === 1 && singular[r.unidad]) ? singular[r.unidad] : (r.unidad || "");
    return cifra + " " + unidad;
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

  function valorFecha(v) {
    return v ? String(v).slice(0, 10) : "";
  }

  function construirCamposFormulario(form, valores, sufijo) {
    valores = valores || {};
    function attrs(name, extra) {
      var out = { id: "redcafe-req-" + name + (sufijo || "") };
      extra = extra || {};
      Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
      return out;
    }
    campo(form, "titulo", "Título", "text", true, attrs("titulo", { maxlength: "120", minlength: "5", placeholder: "Busco café lavado de altura" }));
    campo(form, "descripcion", "Qué busca", "textarea", true, attrs("descripcion", { maxlength: "3000", minlength: "20", rows: "5" }));
    campoSelect(form, "tipo", "Tipo de café", TIPOS, attrs("tipo"));
    campo(form, "variedad", "Variedad (opcional)", "text", false, attrs("variedad", { maxlength: "80", placeholder: "Typica, Geisha…" }));
    campoSelect(form, "proceso", "Proceso", PROCESOS, attrs("proceso"));
    campo(form, "provincia", "Provincia de origen (opcional)", "text", false, attrs("provincia", { maxlength: "80" }));
    campo(form, "cantidad", "Cantidad", "number", true, attrs("cantidad", { min: "0.01", step: "0.01" }));
    campoSelect(form, "unidad", "Unidad", UNIDADES, attrs("unidad"));
    campoSelect(form, "frecuencia", "Frecuencia", FRECUENCIAS, attrs("frecuencia"));
    campo(form, "precioReferencia", "Precio de referencia (opcional)", "number", false, attrs("precioReferencia", { min: "0", step: "0.01" }));
    campo(form, "puntajeMinimo", "Puntaje SCA mínimo (opcional)", "number", false, attrs("puntajeMinimo", { min: "0", max: "100", step: "0.5" }));
    campo(form, "certificacion", "Certificación (opcional)", "text", false, attrs("certificacion", { maxlength: "120" }));
    campo(form, "empresa", "Empresa (opcional)", "text", false, attrs("empresa", { maxlength: "120" }));
    campo(form, "cierra", "Vigente hasta", "date", false, attrs("cierra", { min: fechaMinima(), max: fechaMaxima() }));
    campoSelect(form, "contactoPreferido", "Contacto preferido", CONTACTOS, attrs("contactoPreferido"));
    campoSelect(form, "estado", "Estado", ESTADOS, attrs("estado"));
    var check = el("label", { className: "redcafe-req-check" });
    check.appendChild(el("input", { type: "checkbox", name: "mostrarPrecio" }));
    check.appendChild(el("span", {}, "Mostrar el precio de referencia en el tablero público"));
    form.appendChild(check);

    Array.prototype.forEach.call(form.elements, function (i) {
      if (!i.name || valores[i.name] === undefined || valores[i.name] === null) return;
      if (i.type === "checkbox") i.checked = !!valores[i.name];
      else if (i.type === "date") i.value = valorFecha(valores[i.name]);
      else i.value = String(valores[i.name]);
    });
  }


  /* ── Fotos del requerimiento ─────────────────────────────────────────
     Quien busca café también enseña algo: su tostadora, su cafetería, el
     empaque que necesita. Se suben al momento a /api/uploads.php y el
     formulario solo guarda las rutas devueltas. */
  function bloqueFotos(iniciales) {
    var fotos = (iniciales || []).filter(function (u) {
      return typeof u === "string" && u.indexOf("/uploads/user-content/") === 0;
    }).slice(0, 4);
    var caja = el("div", { className: "redcafe-req-fotos" });
    caja.appendChild(el("p", { className: "redcafe-req-fotos-titulo" }, "Fotos (opcional)"));
    caja.appendChild(el("p", { className: "redcafe-req-nota" },
      "JPG o PNG, hasta 2 MB, máximo 4. Aparecen junto a tu requerimiento en el marketplace."));
    var lista = el("ul", { className: "redcafe-req-fotos-lista" });
    var estadoFoto = el("span", { className: "redcafe-req-fotos-estado", role: "status", "aria-live": "polite" });
    var archivo = el("input", { type: "file", accept: ".jpg,.jpeg,.png", className: "redcafe-req-foto-archivo" });
    var subir = el("button", { type: "button", className: "redcafe-req-btn-suave" }, "Añadir foto");

    function pintarLista() {
      while (lista.firstChild) lista.removeChild(lista.firstChild);
      fotos.forEach(function (url, i) {
        var li = el("li", {});
        li.appendChild(el("img", { src: url, alt: "Foto " + (i + 1), loading: "lazy" }));
        var quitar = el("button", { type: "button", className: "redcafe-req-foto-quitar" }, "Quitar");
        quitar.addEventListener("click", function () { fotos.splice(i, 1); pintarLista(); });
        li.appendChild(quitar);
        lista.appendChild(li);
      });
    }

    subir.addEventListener("click", function () {
      if (!archivo.files || !archivo.files[0]) { estadoFoto.textContent = "Elige una foto primero."; return; }
      if (fotos.length >= 4) { estadoFoto.textContent = "Ya tienes cuatro fotos."; return; }
      var f = archivo.files[0];
      if (f.size > 2 * 1024 * 1024) { estadoFoto.textContent = "La foto supera los 2 MB."; return; }
      var fd = new FormData();
      fd.append("archivo", f);
      fd.append("context", "marketplace");
      subir.disabled = true;
      estadoFoto.textContent = "Subiendo…";
      fetch("/api/uploads.php?action=image", { method: "POST", credentials: "include", body: fd })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          subir.disabled = false;
          var url = res && res.ok && res.data && (res.data.url || res.data.imagen || res.data.ruta);
          if (!url) { estadoFoto.textContent = (res && res.error) || "No se pudo subir la foto."; return; }
          fotos.push(url);
          archivo.value = "";
          estadoFoto.textContent = "Foto añadida.";
          pintarLista();
        })
        .catch(function () { subir.disabled = false; estadoFoto.textContent = "No se pudo subir la foto."; });
    });

    var alta = el("div", { className: "redcafe-req-fotos-alta" });
    alta.appendChild(archivo);
    alta.appendChild(subir);
    alta.appendChild(estadoFoto);
    caja.appendChild(lista);
    caja.appendChild(alta);
    pintarLista();
    return { nodo: caja, valores: function () { return fotos.slice(); } };
  }

  function crearFormulario(section) {
    var panel = el("div", { className: "redcafe-req-panel" });
    panel.appendChild(el("h4", {}, "Publicar un requerimiento"));
    if (!estado.puedePublicar) {
      // Al productor no se le deja en blanco: se le dice qué SÍ puede hacer.
      panel.appendChild(el("p", { className: "redcafe-req-nota" },
        "Su perfil no publica requerimientos, pero sí puede responder a los que hay en el marketplace, " +
        "en la pestaña «Requerimientos»."));
      return panel;
    }
    var form = el("form", { className: "redcafe-req-form" });
    construirCamposFormulario(form);
    var fotos = bloqueFotos([]);
    form.appendChild(fotos.nodo);
    form.appendChild(el("button", { type: "submit", className: "redcafe-req-btn" }, "Publicar requerimiento"));
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      msg(section, "Publicando…", "");
      api("publish", Object.assign(formData(form), { imagenes: fotos.valores() })).then(function (res) {
        if (!res.ok) { msg(section, res.error || "No se pudo publicar.", "error"); return; }
        form.reset();
        msg(section, "Requerimiento publicado. Ya aparece en el marketplace.", "ok");
        cargar(section);
      });
    });
    panel.appendChild(form);
    return panel;
  }

  function formularioEdicion(section, r, cerrarEditor) {
    var form = el("form", { className: "redcafe-req-form" });
    construirCamposFormulario(form, r, "-edit-" + String(r.id || "").replace(/[^a-zA-Z0-9_-]/g, ""));
    var fotos = bloqueFotos(Array.isArray(r.imagenes) ? r.imagenes : []);
    form.appendChild(fotos.nodo);
    var guardar = el("button", { type: "submit", className: "redcafe-req-btn" }, "Guardar cambios");
    var cancelar = el("button", { type: "button", className: "redcafe-req-btn-suave" }, "Cancelar");
    form.appendChild(guardar);
    form.appendChild(cancelar);
    cancelar.addEventListener("click", cerrarEditor);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      guardar.disabled = true;
      guardar.textContent = "Guardando…";
      api("update", Object.assign({ id: r.id }, formData(form), { imagenes: fotos.valores() })).then(function (res) {
        if (!res.ok) {
          guardar.disabled = false;
          guardar.textContent = "Guardar cambios";
          msg(section, res.error || "No se pudo actualizar.", "error");
          return;
        }
        msg(section, "Requerimiento actualizado.", "ok");
        cargar(section);
      });
    });
    return form;
  }

  function ofertaFila(section, o) {
    var row = el("article", { className: "redcafe-req-oferta" });
    row.appendChild(el("strong", {}, o.oferente || "Miembro"));
    row.appendChild(el("p", { className: "redcafe-req-meta" },
      (o.oferente_rol || "perfil") + (o.oferente_provincia ? " · " + o.oferente_provincia : "")));
    row.appendChild(el("p", {}, o.mensaje || ""));
    var detalle = [];
    if (o.cantidad !== null && o.cantidad !== undefined) detalle.push("Ofrece " + o.cantidad);
    if (o.precio !== null && o.precio !== undefined) detalle.push("$" + Number(o.precio).toFixed(2));
    if (detalle.length) row.appendChild(el("p", { className: "redcafe-req-meta" }, detalle.join(" · ")));
    // El contacto del oferente sí se muestra al dueño: escribió él para que le
    // respondan. El del comprador, en cambio, nunca sale del servidor.
    if (o.oferente_email || o.oferente_telefono) {
      row.appendChild(el("p", { className: "redcafe-req-contacto" },
        [o.oferente_email || "", o.oferente_telefono || ""].filter(Boolean).join(" · ")));
    }
    var sel = el("select", { "aria-label": "Estado de la oferta" });
    opciones(sel, ESTADOS_OFERTA);
    sel.value = o.estado || "recibida";
    sel.addEventListener("change", function () {
      api("resolver", { id: o.id, estado: sel.value }).then(function (res) {
        msg(section, res.ok ? "Estado actualizado." : (res.error || "No se pudo actualizar."), res.ok ? "ok" : "error");
      });
    });
    row.appendChild(sel);
    return row;
  }

  function requerimientoCard(section, r) {
    var card = el("article", { className: "redcafe-req-card" });
    card.appendChild(el("h5", {}, r.titulo || "Requerimiento"));
    var meta = [r.estado || "", cantidadTexto(r), r.frecuencia || ""].filter(Boolean).join(" · ");
    card.appendChild(el("p", { className: "redcafe-req-meta" }, meta));
    card.appendChild(el("p", {}, r.descripcion || ""));
    (Array.isArray(r.imagenes) ? r.imagenes : []).slice(0, 4).forEach(function (u) {
      if (typeof u !== "string" || u.indexOf("/uploads/user-content/") !== 0) return;
      card.appendChild(el("img", { src: u, alt: "Foto del requerimiento", loading: "lazy", className: "redcafe-req-foto" }));
    });
    var n = Number(r.ofertas_count || 0);
    card.appendChild(el("p", { className: "redcafe-req-meta" },
      n === 1 ? "1 oferta recibida" : n + " ofertas recibidas"));

    var details = el("details", {});
    details.appendChild(el("summary", {}, "Ver ofertas"));
    var box = el("div", { className: "redcafe-req-ofertas" });
    box.appendChild(el("p", {}, "Cargando…"));
    details.appendChild(box);
    details.addEventListener("toggle", function () {
      if (!details.open) return;
      api("ofertas", null, { id: r.id }).then(function (res) {
        while (box.firstChild) box.removeChild(box.firstChild);
        var lista = (res.ok && res.data && res.data.ofertas) || [];
        if (!lista.length) {
          box.appendChild(el("p", { className: "redcafe-req-vacio" }, "Todavía no hay ofertas."));
          return;
        }
        lista.forEach(function (o) { box.appendChild(ofertaFila(section, o)); });
      });
    });
    card.appendChild(details);

    var acciones = el("div", { className: "redcafe-req-acciones" });
    if ((r.estado || "") !== "cerrada") {
      var editor = el("div", { className: "redcafe-req-ofertas" });
      var editar = el("button", { type: "button", className: "redcafe-req-btn-suave" }, "Editar");
      editar.addEventListener("click", function () {
        while (editor.firstChild) editor.removeChild(editor.firstChild);
        editor.appendChild(formularioEdicion(section, r, function () {
          while (editor.firstChild) editor.removeChild(editor.firstChild);
          editar.disabled = false;
        }));
        editar.disabled = true;
      });
      acciones.appendChild(editar);
      var cerrar = el("button", { type: "button", className: "redcafe-req-btn-suave" }, "Cerrar requerimiento");
      cerrar.addEventListener("click", function () {
        api("cerrar", { id: r.id }).then(function (res) {
          msg(section, res.ok ? "Requerimiento cerrado." : (res.error || "No se pudo cerrar."), res.ok ? "ok" : "error");
          if (res.ok) cargar(section);
        });
      });
      acciones.appendChild(cerrar);
    }
    /* eliminar-propias */
    var borrarReq = el("button", { type: "button", className: "redcafe-req-btn-suave" }, "Eliminar");
    borrarReq.addEventListener("click", function () {
      if (!window.confirm("¿Eliminar «" + (r.titulo || "este requerimiento") + "»? No se puede deshacer.")) return;
      borrarReq.disabled = true;
      api("delete", { id: r.id }, { id: r.id }).then(function (res) {
        borrarReq.disabled = false;
        msg(section, res.ok ? "Requerimiento eliminado." : (res.error || "No se pudo eliminar."), res.ok ? "ok" : "error");
        if (res.ok) cargar(section);
      });
    });
    acciones.appendChild(borrarReq);
    card.appendChild(acciones);
    if (editor) card.appendChild(editor);
    return card;
  }

  function renderMios(section) {
    var lista = section.querySelector(".redcafe-req-mios");
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    if (!estado.requerimientos.length) {
      lista.appendChild(el("p", { className: "redcafe-req-vacio" },
        estado.puedePublicar ? "Todavía no ha publicado ningún requerimiento." : "Su perfil no publica requerimientos."));
      return;
    }
    estado.requerimientos.forEach(function (r) { lista.appendChild(requerimientoCard(section, r)); });
  }

  function renderMisOfertas(section) {
    var lista = section.querySelector(".redcafe-req-mis-ofertas");
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    if (!estado.ofertas.length) {
      lista.appendChild(el("p", { className: "redcafe-req-vacio" },
        "Todavía no ha ofrecido café a ningún requerimiento. Los encuentra en el marketplace, " +
        "en la pestaña «Requerimientos»."));
      return;
    }
    estado.ofertas.forEach(function (o) {
      var r = o.requerimiento || {};
      var card = el("article", { className: "redcafe-req-card" });
      card.appendChild(el("h5", {}, r.titulo || "Requerimiento retirado"));
      card.appendChild(el("p", { className: "redcafe-req-meta" }, "Su oferta: " + (o.estado || "recibida")));
      if (r.titulo) card.appendChild(el("p", { className: "redcafe-req-meta" }, (r.autor || "") + " · " + cantidadTexto(r)));
      card.appendChild(el("p", {}, o.mensaje || ""));
      lista.appendChild(card);
    });
  }

  function cargar(section) {
    api("mios").then(function (res) {
      if (res.ok && res.data) {
        estado.requerimientos = Array.isArray(res.data.requerimientos) ? res.data.requerimientos : [];
        estado.puedePublicar = !!res.data.puede_publicar;
        estado.admin = !!res.data.admin;
        var titulo = section.querySelector("[data-redcafe-req-mios-titulo]");
        if (titulo) titulo.textContent = estado.admin ? "Requerimientos administrados" : "Mis requerimientos";
      }
      renderMios(section);
    });
    api("mis_ofertas").then(function (res) {
      if (res.ok && res.data) estado.ofertas = Array.isArray(res.data.ofertas) ? res.data.ofertas : [];
      renderMisOfertas(section);
    });
  }

  function estilos() {
    if (document.getElementById("redcafe-requerimientos-style")) return;
    var s = el("style", { id: "redcafe-requerimientos-style" });
    s.textContent = [
      ".redcafe-req-seccion{border-top:1px solid rgba(140,30,14,.12);padding:28px 0;background:#fffdf8;color:#25221f}",
      ".redcafe-req-wrap{max-width:1120px;margin:0 auto;padding:0 16px}",
      ".redcafe-req-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:18px}",
      ".redcafe-req-head h3{margin:0;font-size:24px;line-height:1.2;color:#8c1e0e}",
      ".redcafe-req-head p,.redcafe-req-nota,.redcafe-req-vacio{color:#6f625a;font-size:14px;line-height:1.5}",
      ".redcafe-req-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:18px}",
      ".redcafe-req-panel{border:1px solid rgba(140,30,14,.14);border-radius:8px;padding:16px;background:#fff}",
      ".redcafe-req-panel h4{margin:0 0 12px;font-size:18px;color:#8c1e0e}",
      ".redcafe-req-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
      ".redcafe-req-campo{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700;color:#8c1e0e}",
      ".redcafe-req-campo input,.redcafe-req-campo select,.redcafe-req-campo textarea,.redcafe-req-oferta select{min-height:42px;border:1px solid rgba(140,30,14,.25);border-radius:6px;padding:9px 10px;background:#fff;color:#25221f;outline:none}",
      ".redcafe-req-campo textarea{grid-column:1/-1;resize:vertical}",
      ".redcafe-req-campo input:focus,.redcafe-req-campo select:focus,.redcafe-req-campo textarea:focus,.redcafe-req-btn:focus,.redcafe-req-btn-suave:focus,.redcafe-req-oferta select:focus{box-shadow:0 0 0 3px rgba(176,76,42,.28);border-color:#b04c2a}",
      ".redcafe-req-check{grid-column:1/-1;display:flex;align-items:center;gap:8px;font-size:14px;color:#8c1e0e}",
      ".redcafe-req-btn{min-height:44px;border:0;border-radius:6px;background:#8f2f1f;color:#fff;font-weight:800;padding:0 16px;cursor:pointer}",
      ".redcafe-req-btn-suave{min-height:40px;border:1px solid rgba(140,30,14,.25);border-radius:6px;background:#fff;color:#8c1e0e;font-weight:700;padding:0 14px;cursor:pointer}",
      ".redcafe-req-msg{min-height:22px;margin:8px 0 0;font-size:14px}.redcafe-req-msg.ok{color:#176b3a}.redcafe-req-msg.error{color:#9b1c1c}",
      ".redcafe-req-card{border-top:1px solid rgba(140,30,14,.12);padding:14px 0}.redcafe-req-card:first-child{border-top:0;padding-top:0}",
      ".redcafe-req-foto{border:1px solid rgba(140,30,14,.12);border-radius:8px;display:block;margin-top:8px;max-height:180px;object-fit:cover;width:100%}",
      ".redcafe-req-fotos{margin-top:12px}.redcafe-req-fotos-titulo{font-size:14px;font-weight:700;color:#8c1e0e;margin:0}",
      ".redcafe-req-fotos-lista{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:8px 0 0;padding:0}",
      ".redcafe-req-fotos-lista li{position:relative;width:96px}.redcafe-req-fotos-lista img{border-radius:6px;display:block;height:72px;object-fit:cover;width:100%}",
      ".redcafe-req-foto-quitar{background:#fff;border:1px solid rgba(140,30,14,.2);border-radius:999px;cursor:pointer;font-size:11px;margin-top:4px;padding:4px 8px;width:100%}",
      ".redcafe-req-fotos-alta{align-items:center;display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.redcafe-req-fotos-estado{color:#6b6459;font-size:12px}",
      ".redcafe-req-card h5{margin:0 0 6px;font-size:16px;color:#8c1e0e}.redcafe-req-card p{margin:6px 0;font-size:14px;line-height:1.45}",
      ".redcafe-req-meta,.redcafe-req-contacto{color:#6f625a;font-size:13px}",
      ".redcafe-req-oferta{border:1px solid rgba(140,30,14,.12);border-radius:8px;padding:12px;margin-top:10px;background:#fffdf8}",
      ".redcafe-req-acciones{margin-top:10px}",
      "@media (max-width:860px){.redcafe-req-grid,.redcafe-req-form{grid-template-columns:1fr}.redcafe-req-head{display:block}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function montar() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-requerimientos-panel")) return;
    estilos();
    var section = el("section", {
      id: "redcafe-requerimientos-panel",
      className: "redcafe-req-seccion",
      "data-redcafe-propio": "1"
    });
    var wrap = el("div", { className: "redcafe-req-wrap" });
    var head = el("div", { className: "redcafe-req-head" });
    var title = el("div", {});
    title.appendChild(el("h3", {}, "Requerimientos de café"));
    title.appendChild(el("p", {},
      "Publique lo que busca y deje que los productores se acerquen, en vez de recorrer las fichas una por una."));
    head.appendChild(title);
    head.appendChild(el("div", { className: "redcafe-req-msg", "aria-live": "polite" }));
    wrap.appendChild(head);

    var grid = el("div", { className: "redcafe-req-grid" });
    var izquierda = el("div", {});
    izquierda.appendChild(crearFormulario(section));
    var mios = el("div", { className: "redcafe-req-panel" });
    mios.appendChild(el("h4", { "data-redcafe-req-mios-titulo": "1" }, "Mis requerimientos"));
    var listaMios = el("div", { className: "redcafe-req-mios" });
    listaMios.appendChild(skeletonLista("Cargando requerimientos"));
    mios.appendChild(listaMios);
    izquierda.appendChild(mios);
    var derecha = el("div", { className: "redcafe-req-panel" });
    derecha.appendChild(el("h4", {}, "Café que he ofrecido"));
    var listaOfertas = el("div", { className: "redcafe-req-mis-ofertas" });
    listaOfertas.appendChild(skeletonLista("Cargando ofertas"));
    derecha.appendChild(listaOfertas);
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
        estado.puedePublicar = puedePublicar(u);
        [1000, 2600, 4600].forEach(function (t) { setTimeout(montar, t); });
      })
      .catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(iniciar, 700);
  else window.addEventListener("load", function () { setTimeout(iniciar, 700); }, { once: true });
  // Next navega sin recargar: hay que volver a montar al cambiar de ruta.
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 1000); });
})();
