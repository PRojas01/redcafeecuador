/* Red Café Ecuador — Mis publicaciones en el panel del miembro
   ------------------------------------------------------------------
   El panel listaba pedidos pero no exponía las publicaciones propias:
   un miembro no podía ver ni corregir sus lotes ni sus servicios desde
   su perfil, aunque la API (lotes.php / marketplace-servicios.php,
   action=update) ya autorizaba al dueño y al administrador.

   Esta sección añade ese listado con edición en línea. No modifica el
   diseño existente: reutiliza las clases del panel.
*/
(function () {
  "use strict";

  var LOTE_CAMPOS = [
    // Café verde por sacos o café ya tostado y empacado por unidades: la
    // categoría decide qué campos tienen sentido rellenar.
    { k: "categoria", label: "Tipo de publicación", tipo: "select",
      opciones: ["verde", "terminado"],
      ayuda: "verde = café en grano por sacos · terminado = tostado y empacado" },
    { k: "finca", label: "Finca / nombre del producto", tipo: "text" },
    { k: "provincia", label: "Provincia", tipo: "text" },
    { k: "variedad", label: "Variedad", tipo: "text" },
    { k: "proceso", label: "Proceso", tipo: "text" },
    { k: "altura", label: "Altura (msnm)", tipo: "number",
      ayuda: "La de tu finca. Vacío si no la sabes con certeza" },
    { k: "precioSaco", label: "Precio por saco (USD)", tipo: "number" },
    { k: "precioQuintal", label: "Precio por quintal (USD)", tipo: "number" },
    { k: "stockSacos", label: "Sacos disponibles", tipo: "number" },
    { k: "disponibilidad", label: "Estado del lote", tipo: "select",
      opciones: ["disponible", "reservado", "agotado"],
      ayuda: "Un lote agotado sigue visible, pero marcado y al final del catálogo" },
    { k: "ventaMinima", label: "Venta mínima", tipo: "text",
      ayuda: "Ej.: 1 saco, 5 quintales. Vacío = a convenir" },
    { k: "certificacion", label: "Certificación", tipo: "text",
      ayuda: "Orgánico, Comercio Justo, Rainforest… Déjalo vacío si tu café no tiene sello" },
    { k: "score", label: "Puntaje de catación (SCA)", tipo: "number",
      ayuda: "Solo si tienes un informe de catación. Déjalo vacío si tu café no está catado: se mostrará «Sin catar»" },
    { k: "canton", label: "Cantón / parroquia", tipo: "text" },
    // Ficha técnica: lo que un comprador necesita saber sin tener el saco delante.
    { k: "estado", label: "Estado del café", tipo: "select",
      opciones: ["", "cereza", "bellota", "pergamino", "oro", "tostado"],
      ayuda: "Bellota = en cáscara · Oro = trillado/pilado" },
    { k: "humedad", label: "Humedad (%)", tipo: "number", ayuda: "Comercial: 10 – 12 %" },
    { k: "zaranda", label: "Zaranda (malla)", tipo: "number", ayuda: "De 12 a 20" },
    { k: "defectos", label: "Defectos / 300 g", tipo: "number", ayuda: "Especialidad: 5 o menos" },
    { k: "rendimiento", label: "Rendimiento en trilla (%)", tipo: "number", ayuda: "Habitual: 76 – 82 %" },
    { k: "empaque", label: "Empaque", tipo: "select",
      opciones: ["", "yute 69 kg", "yute 46 kg", "grainpro", "vacío", "big bag", "otro"] },
    { k: "cosecha", label: "Cosecha", tipo: "text", ayuda: "Ej.: may–jul 2026" },
    { k: "cantidadKg", label: "Cantidad total (kg)", tipo: "number" },
    { k: "entrega", label: "Entrega", tipo: "select",
      opciones: ["", "en finca", "en bodega", "puesto en ciudad", "FOB Guayaquil", "a convenir"] },
    { k: "muestraDisponible", label: "¿Envías muestra?", tipo: "select",
      opciones: ["", "sí", "no"], ayuda: "Muchos compradores la piden antes de cerrar" },
    { k: "notasTaza", label: "Notas de taza", tipo: "text", ayuda: "Ej.: panela, naranja, cacao" },
    { k: "observaciones", label: "Observaciones", tipo: "textarea" },
    // Ubicación real del lote en el mapa nacional. Sin estos valores el lote
    // se sitúa en una referencia aproximada de su provincia.
    { k: "lat", label: "Latitud", tipo: "number", ayuda: "Ej.: -4.2606" },
    { k: "lng", label: "Longitud", tipo: "number", ayuda: "Ej.: -79.2233" },
    { k: "descripcion", label: "Descripción", tipo: "textarea" },
    // ── Solo para café en producto terminado ──────────────────────────
    { k: "marca", label: "Marca", tipo: "text", terminado: true,
      ayuda: "El nombre con el que se vende la bolsa" },
    { k: "tueste", label: "Nivel de tueste", tipo: "select", terminado: true,
      opciones: ["", "claro", "medio", "medio-oscuro", "oscuro"] },
    { k: "molienda", label: "Molienda", tipo: "select", terminado: true,
      opciones: ["", "grano entero", "gruesa", "media", "fina", "espresso"] },
    { k: "pesoGramos", label: "Presentación (gramos)", tipo: "number", terminado: true,
      ayuda: "Ej.: 250, 340, 500, 1000" },
    { k: "precioUnidad", label: "Precio por unidad (USD)", tipo: "number", terminado: true },
    { k: "unidades", label: "Unidades disponibles", tipo: "number", terminado: true },
    { k: "fechaTueste", label: "Fecha de tueste", tipo: "date", terminado: true,
      ayuda: "El comprador la mira: el café tostado se bebe fresco" },
    { k: "empaqueTerminado", label: "Empaque", tipo: "select", terminado: true,
      opciones: ["", "bolsa con válvula", "bolsa kraft", "lata", "vacío", "otro"] },
    { k: "registroSanitario", label: "Registro sanitario (ARCSA)", tipo: "text", terminado: true,
      ayuda: "Obligatorio para vender al público en Ecuador" },
    { k: "descafeinado", label: "¿Es descafeinado?", tipo: "select", terminado: true,
      opciones: ["", "sí", "no"] },
    { k: "perfilTaza", label: "Perfil de taza en la etiqueta", tipo: "text", terminado: true,
      ayuda: "Ej.: chocolate, panela, naranja" }
  ];

  var SERVICIO_CAMPOS = [
    { k: "titulo", label: "Título", tipo: "text" },
    { k: "categoria", label: "Categoría", tipo: "text" },
    { k: "provincia", label: "Provincia", tipo: "text" },
    { k: "cobertura", label: "Cobertura", tipo: "text" },
    { k: "precio", label: "Precio (USD)", tipo: "number" },
    { k: "unidad", label: "Unidad", tipo: "text" },
    { k: "descripcion", label: "Descripción", tipo: "textarea" },
    // ── Solo para café en producto terminado ──────────────────────────
    { k: "marca", label: "Marca", tipo: "text", terminado: true,
      ayuda: "El nombre con el que se vende la bolsa" },
    { k: "tueste", label: "Nivel de tueste", tipo: "select", terminado: true,
      opciones: ["", "claro", "medio", "medio-oscuro", "oscuro"] },
    { k: "molienda", label: "Molienda", tipo: "select", terminado: true,
      opciones: ["", "grano entero", "gruesa", "media", "fina", "espresso"] },
    { k: "pesoGramos", label: "Presentación (gramos)", tipo: "number", terminado: true,
      ayuda: "Ej.: 250, 340, 500, 1000" },
    { k: "precioUnidad", label: "Precio por unidad (USD)", tipo: "number", terminado: true },
    { k: "unidades", label: "Unidades disponibles", tipo: "number", terminado: true },
    { k: "fechaTueste", label: "Fecha de tueste", tipo: "date", terminado: true,
      ayuda: "El comprador la mira: el café tostado se bebe fresco" },
    { k: "empaqueTerminado", label: "Empaque", tipo: "select", terminado: true,
      opciones: ["", "bolsa con válvula", "bolsa kraft", "lata", "vacío", "otro"] },
    { k: "registroSanitario", label: "Registro sanitario (ARCSA)", tipo: "text", terminado: true,
      ayuda: "Obligatorio para vender al público en Ecuador" },
    { k: "descafeinado", label: "¿Es descafeinado?", tipo: "select", terminado: true,
      opciones: ["", "sí", "no"] },
    { k: "perfilTaza", label: "Perfil de taza en la etiqueta", tipo: "text", terminado: true,
      ayuda: "Ej.: chocolate, panela, naranja" }
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

  // ── Documentos del lote ───────────────────────────────────────────────
  // Certificado de calidad, informe de catación, análisis de laboratorio…
  // Son el respaldo que un comprador pide antes de cerrar una compra.
  var DOC_TIPOS = [
    ["certificado-calidad",  "Certificado de calidad"],
    ["informe-catacion",     "Informe de catación"],
    ["certificado-organico", "Certificado orgánico"],
    ["analisis-laboratorio", "Análisis de laboratorio"],
    ["trazabilidad-eudr",    "Trazabilidad / EUDR"],
    ["ficha-tecnica",        "Ficha técnica"],
    ["otro",                 "Otro documento"]
  ];

  // ── Fotos del lote ────────────────────────────────────────────────────
  // La API aceptaba `imagenes` en el update y existía la subida, pero el
  // panel no ofrecía cambiarlas: quien subió una foto mala no podía
  // corregirla nunca desde su perfil.
  function fotosHtml(imagenes) {
    imagenes = Array.isArray(imagenes) ? imagenes : [];
    var lista = imagenes.length
      ? imagenes.map(function (u, i) {
          return '<li data-foto="' + i + '">' +
            '<img src="' + esc(u) + '" alt="Foto ' + (i + 1) + ' del lote" loading="lazy">' +
            '<button type="button" class="redcafe-foto-quitar" aria-label="Quitar esta foto">Quitar</button>' +
          '</li>';
        }).join("")
      : '<li class="redcafe-foto-vacio">Sin fotos propias. La ficha muestra una imagen genérica del proceso.</li>';

    return '<div class="redcafe-foto-bloque">' +
      '<p class="redcafe-doc-titulo">Fotos del lote</p>' +
      '<p class="redcafe-pub-ayuda">Toma fotos reales de tu café: el grano, el saco, la finca. ' +
        'JPG o PNG, hasta 2 MB, máximo 6. Es lo primero que mira un comprador.</p>' +
      '<ul class="redcafe-foto-lista">' + lista + '</ul>' +
      '<div class="redcafe-doc-alta">' +
        '<input type="file" class="redcafe-foto-archivo" accept=".jpg,.jpeg,.png">' +
        '<button type="button" class="redcafe-foto-subir">Añadir foto</button>' +
        '<span class="redcafe-pub-estado redcafe-foto-estado" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</div>';
  }

  function fotosDeTarjeta(card) {
    try { return JSON.parse(card.getAttribute("data-fotos") || "[]"); } catch (e) { return []; }
  }

  function fijarFotos(card, fotos) {
    card.setAttribute("data-fotos", JSON.stringify(fotos));
    var bloque = card.querySelector(".redcafe-foto-bloque");
    if (bloque) bloque.outerHTML = fotosHtml(fotos);
  }

  function guardarFotos(card, fotos, mensaje) {
    var estado = card.querySelector(".redcafe-foto-estado");
    json("/api/lotes.php?action=update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.getAttribute("data-id"), imagenes: fotos })
    }).then(function (res) {
      var e = card.querySelector(".redcafe-foto-estado") || estado;
      if (!e) return;
      if (res && res.ok) {
        e.textContent = mensaje;
        e.className = "redcafe-pub-estado redcafe-foto-estado is-ok";
      } else {
        e.textContent = (res && res.error) || "No se pudo guardar.";
        e.className = "redcafe-pub-estado redcafe-foto-estado is-error";
      }
    });
  }

  function subirFoto(card) {
    var input = card.querySelector(".redcafe-foto-archivo");
    var estado = card.querySelector(".redcafe-foto-estado");
    var boton = card.querySelector(".redcafe-foto-subir");
    if (!input || !input.files || !input.files[0]) {
      estado.textContent = "Elige una foto primero.";
      estado.className = "redcafe-pub-estado redcafe-foto-estado is-error";
      return;
    }
    if (fotosDeTarjeta(card).length >= 6) {
      estado.textContent = "Ya tienes seis fotos. Quita una antes de añadir otra.";
      estado.className = "redcafe-pub-estado redcafe-foto-estado is-error";
      return;
    }
    var archivo = input.files[0];
    if (archivo.size > 2 * 1024 * 1024) {
      estado.textContent = "La foto supera los 2 MB.";
      estado.className = "redcafe-pub-estado redcafe-foto-estado is-error";
      return;
    }

    var fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("context", "marketplace");

    boton.disabled = true;
    estado.textContent = "Subiendo…";
    estado.className = "redcafe-pub-estado redcafe-foto-estado";

    fetch("/api/uploads.php?action=image", { method: "POST", credentials: "include", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        boton.disabled = false;
        var url = res && res.ok && res.data && (res.data.url || res.data.imagen || res.data.ruta);
        if (!url) {
          estado.textContent = (res && res.error) || "No se pudo subir la foto.";
          estado.className = "redcafe-pub-estado redcafe-foto-estado is-error";
          return;
        }
        var fotos = fotosDeTarjeta(card);
        fotos.push(url);
        fijarFotos(card, fotos);
        guardarFotos(card, fotos, "Foto añadida.");
      })
      .catch(function () {
        boton.disabled = false;
        estado.textContent = "No se pudo subir la foto.";
        estado.className = "redcafe-pub-estado redcafe-foto-estado is-error";
      });
  }

  function docsHtml(docs) {
    docs = Array.isArray(docs) ? docs : [];
    var lista = docs.length
      ? docs.map(function (d, i) {
          return '<li data-doc="' + i + '">' +
            '<a href="' + esc(d.url) + '" target="_blank" rel="noreferrer">' +
              '<strong>' + esc(d.titulo || "Documento") + '</strong>' +
              '<em>' + esc(d.formato === "pdf" ? "PDF" : "Imagen") + '</em>' +
            '</a>' +
            '<button type="button" class="redcafe-doc-quitar" aria-label="Quitar documento">Quitar</button>' +
          '</li>';
        }).join("")
      : '<li class="redcafe-doc-vacio">Sin documentos adjuntos.</li>';

    var opciones = DOC_TIPOS.map(function (t) {
      return '<option value="' + t[0] + '">' + esc(t[1]) + '</option>';
    }).join("");

    return '<div class="redcafe-doc-bloque">' +
      '<p class="redcafe-doc-titulo">Certificados y documentos</p>' +
      '<p class="redcafe-pub-ayuda">PDF, JPG o PNG · hasta 5 MB cada uno. Se muestran al comprador en la ficha del lote.</p>' +
      '<ul class="redcafe-doc-lista">' + lista + '</ul>' +
      '<div class="redcafe-doc-alta">' +
        '<select class="redcafe-pub-input redcafe-doc-tipo">' + opciones + '</select>' +
        '<input type="text" class="redcafe-pub-input redcafe-doc-nombre" placeholder="Nombre (opcional)">' +
        '<input type="file" class="redcafe-doc-archivo" accept=".pdf,.jpg,.jpeg,.png">' +
        '<button type="button" class="redcafe-doc-subir">Adjuntar</button>' +
        '<span class="redcafe-pub-estado redcafe-doc-estado" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</div>';
  }

  function docsDeTarjeta(card) {
    try { return JSON.parse(card.getAttribute("data-docs") || "[]"); } catch (_) { return []; }
  }

  function fijarDocs(card, docs) {
    card.setAttribute("data-docs", JSON.stringify(docs));
    var bloque = card.querySelector(".redcafe-doc-bloque");
    if (bloque) bloque.outerHTML = docsHtml(docs);
  }

  function subirDocumento(card) {
    var input = card.querySelector(".redcafe-doc-archivo");
    var estado = card.querySelector(".redcafe-doc-estado");
    var boton = card.querySelector(".redcafe-doc-subir");
    if (!input || !input.files || !input.files[0]) {
      estado.textContent = "Elige un archivo primero.";
      estado.className = "redcafe-pub-estado redcafe-doc-estado is-error";
      return;
    }
    var archivo = input.files[0];
    if (archivo.size > 5 * 1024 * 1024) {
      estado.textContent = "El documento supera los 5 MB.";
      estado.className = "redcafe-pub-estado redcafe-doc-estado is-error";
      return;
    }

    var fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("tipo", card.querySelector(".redcafe-doc-tipo").value);
    fd.append("titulo", card.querySelector(".redcafe-doc-nombre").value || "");

    boton.disabled = true;
    estado.textContent = "Subiendo…";
    estado.className = "redcafe-pub-estado redcafe-doc-estado";

    fetch("/api/uploads.php?action=documento", { method: "POST", credentials: "include", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        boton.disabled = false;
        if (!res || !res.ok || !res.data || !res.data.documento) {
          estado.textContent = (res && res.error) || "No se pudo subir el documento.";
          estado.className = "redcafe-pub-estado redcafe-doc-estado is-error";
          return;
        }
        var docs = docsDeTarjeta(card);
        docs.push(res.data.documento);
        fijarDocs(card, docs);
        guardarDocs(card, docs, "Documento adjuntado.");
      })
      .catch(function () {
        boton.disabled = false;
        estado.textContent = "No se pudo subir el documento.";
        estado.className = "redcafe-pub-estado redcafe-doc-estado is-error";
      });
  }

  function guardarDocs(card, docs, mensaje) {
    var estado = card.querySelector(".redcafe-doc-estado");
    json("/api/lotes.php?action=update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.getAttribute("data-id"), documentos: docs })
    }).then(function (res) {
      if (!estado) return;
      if (res && res.ok) {
        estado.textContent = mensaje;
        estado.className = "redcafe-pub-estado redcafe-doc-estado is-ok";
      } else {
        estado.textContent = (res && res.error) || "No se pudo guardar.";
        estado.className = "redcafe-pub-estado redcafe-doc-estado is-error";
      }
    });
  }

  function campoHtml(campo, valor) {
    var comun = 'data-campo="' + campo.k + '" class="redcafe-pub-input" ';
    var soloTerminado = campo.terminado ? ' data-solo="terminado"' : "";
    var ayuda = campo.ayuda ? '<em class="redcafe-pub-ayuda">' + esc(campo.ayuda) + '</em>' : "";
    if (campo.tipo === "textarea") {
      return '<label class="redcafe-pub-label"' + soloTerminado + '><span>' + esc(campo.label) + '</span>' +
        '<textarea rows="3" ' + comun + '>' + esc(valor) + '</textarea>' + ayuda + '</label>';
    }
    if (campo.tipo === "select") {
      var booleanos = ["muestraDisponible", "descafeinado"];
      var actual = booleanos.indexOf(campo.k) !== -1
        ? (valor === true ? "sí" : (valor === false ? "no" : ""))
        : String(valor || "");
      var opciones = (campo.opciones || []).map(function (o) {
        return '<option value="' + esc(o) + '"' + (actual === o ? " selected" : "") + '>' +
          (o === "" ? "— sin indicar —" : esc(o)) + '</option>';
      }).join("");
      return '<label class="redcafe-pub-label"' + soloTerminado + '><span>' + esc(campo.label) + '</span>' +
        '<select ' + comun + '>' + opciones + '</select>' + ayuda + '</label>';
    }
    var paso = (campo.k === "lat" || campo.k === "lng" || campo.k === "humedad" || campo.k === "rendimiento") ? 'step="any" ' : "";
    return '<label class="redcafe-pub-label"' + soloTerminado + '><span>' + esc(campo.label) + '</span>' +
      '<input type="' + campo.tipo + '" ' + paso + comun + 'value="' + esc(valor) + '">' + ayuda + '</label>';
  }

  // Cuando alguien pregunta por un lote, su dueño recibe un aviso. Aquí se le
  // pide la respuesta en un clic: sigue igual, queda menos, o ya se vendió.
  function avisoConfirmacionHtml(item) {
    if (!item.confirmacion_pendiente) return "";
    var cuantos = Number(item.contactos || 0);
    var quedan = Number(item.stockSacos || item.unidades || 0);
    var unidad = String(item.categoria) === "terminado" ? "unidades" : "sacos";
    return '<div class="redcafe-confirma" data-unidad="' + esc(unidad) + '">' +
      '<p class="redcafe-confirma-rot">Confirma el estado de este lote</p>' +
      '<p class="redcafe-confirma-txt">' +
        (cuantos === 1 ? "Alguien preguntó por él" : "Han preguntado por él " + cuantos + " veces") +
        '. ¿Sigue disponible?</p>' +
      '<div class="redcafe-confirma-acciones">' +
        '<button type="button" data-confirmar="disponible">Sigue disponible</button>' +
        '<button type="button" data-confirmar="cantidad">Queda menos</button>' +
        '<button type="button" data-confirmar="agotado" class="is-agotado">Ya se vendió</button>' +
      '</div>' +
      '<div class="redcafe-confirma-cantidad" hidden>' +
        '<label><span>¿Cuántos ' + esc(unidad) + ' te quedan?</span>' +
          '<input type="number" min="0" max="100000" value="' + esc(quedan) + '"></label>' +
        '<button type="button" data-confirmar="guardar-cantidad">Guardar</button>' +
      '</div>' +
      '<p class="redcafe-confirma-estado" role="status" aria-live="polite"></p>' +
    '</div>';
  }

  function confirmarEstado(card, cuerpo, mensaje) {
    var aviso = card.querySelector(".redcafe-confirma");
    var estado = aviso ? aviso.querySelector(".redcafe-confirma-estado") : null;
    if (estado) { estado.textContent = "Guardando…"; estado.className = "redcafe-confirma-estado"; }
    cuerpo.id = card.getAttribute("data-id");
    json("/api/lotes.php?action=confirmar_estado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo)
    }).then(function (res) {
      if (!res || !res.ok) {
        if (estado) {
          estado.textContent = (res && res.error) || "No se pudo guardar.";
          estado.className = "redcafe-confirma-estado is-error";
        }
        return;
      }
      var lote = res.data && res.data.lote;
      // El aviso desaparece: ya está respondido.
      if (aviso && aviso.parentNode) aviso.parentNode.removeChild(aviso);
      var sel = card.querySelector('[data-campo="disponibilidad"]');
      if (sel && lote) sel.value = lote.disponibilidad || "disponible";
      var stock = card.querySelector('[data-campo="stockSacos"]');
      if (stock && lote && lote.stockSacos !== undefined) stock.value = lote.stockSacos;
      var pie = card.querySelector(".redcafe-pub-estado");
      if (pie) {
        pie.textContent = mensaje;
        pie.className = "redcafe-pub-estado is-ok";
      }
    });
  }

  function tarjetaHtml(item, campos, tipo) {
    var titulo = tipo === "lote" ? (item.finca || "Lote sin nombre") : (item.titulo || "Servicio");
    var docsAttr = tipo === "lote"
      ? ' data-docs="' + esc(JSON.stringify(item.documentos || [])) + '"' +
        ' data-fotos="' + esc(JSON.stringify(item.imagenes || [])) + '"'
      : "";
    var categoria = tipo === "lote" ? (item.categoria || "verde") : "";
    var catAttr = tipo === "lote" ? ' data-categoria="' + esc(categoria) + '"' : "";
    return '<article class="redcafe-pub-card" data-tipo="' + tipo + '" data-id="' + esc(item.id) + '"' + catAttr + docsAttr + '>' +
      '<header class="redcafe-pub-head">' +
        '<h4>' + esc(titulo) + '</h4>' +
        '<span class="redcafe-pub-tag">' +
          (tipo === "lote" ? (categoria === "terminado" ? "Café tostado" : "Lote verde") : "Servicio") +
        '</span>' +
      '</header>' +
      (tipo === "lote" ? avisoConfirmacionHtml(item) : "") +
      '<div class="redcafe-pub-grid">' +
        campos.map(function (c) { return campoHtml(c, item[c.k]); }).join("") +
      '</div>' +
      (tipo === "lote" ? fotosHtml(item.imagenes) + docsHtml(item.documentos) : "") +
      '<div class="redcafe-pub-acciones">' +
        '<button type="button" class="redcafe-pub-guardar">Guardar cambios</button>' +
        '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</article>';
  }

  function guardar(card) {
    var tipo = card.getAttribute("data-tipo");
    var id = card.getAttribute("data-id");
    var estado = card.querySelector(".redcafe-pub-estado");
    var boton = card.querySelector(".redcafe-pub-guardar");
    var cuerpo = { id: id };

    Array.prototype.slice.call(card.querySelectorAll("[data-campo]")).forEach(function (el) {
      var clave = el.getAttribute("data-campo");
      // Un campo vacío no debe sobrescribir lo guardado con 0 ni con "".
      var opcionales = ["lat", "lng", "humedad", "zaranda", "defectos", "rendimiento",
                        "cantidadKg", "estado", "empaque", "entrega", "muestraDisponible",
                        "tueste", "molienda", "pesoGramos", "precioUnidad", "unidades",
                        "empaqueTerminado", "descafeinado", "disponibilidad"];
      if (opcionales.indexOf(clave) !== -1 && String(el.value).trim() === "") return;
      // El puntaje sí se envía vacío: es la forma de retirarlo.
      if (clave === "score" && String(el.value).trim() === "") { cuerpo[clave] = ""; return; }
      if (clave === "muestraDisponible" || clave === "descafeinado") {
        cuerpo[clave] = el.value === "sí";
        return;
      }
      cuerpo[clave] = el.type === "number" ? Number(el.value || 0) : el.value;
    });

    boton.disabled = true;
    estado.textContent = "Guardando…";
    estado.className = "redcafe-pub-estado";

    var url = tipo === "lote"
      ? "/api/lotes.php?action=update"
      : "/api/marketplace-servicios.php?action=update";

    json(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo)
    }).then(function (res) {
      boton.disabled = false;
      if (res && res.ok) {
        estado.textContent = "Cambios guardados.";
        estado.className = "redcafe-pub-estado is-ok";
      } else {
        estado.textContent = (res && res.error) || "No se pudo guardar. Inténtalo de nuevo.";
        estado.className = "redcafe-pub-estado is-error";
      }
    });
  }

  function pintar(contenedor, lotes, servicios) {
    if (!lotes.length && !servicios.length) {
      contenedor.innerHTML =
        '<p class="redcafe-pub-vacio">Todavía no has publicado lotes ni servicios. ' +
        'Cuando publiques, aparecerán aquí para que puedas corregirlos cuando quieras.</p>';
      return;
    }
    contenedor.innerHTML =
      lotes.map(function (l) { return tarjetaHtml(l, LOTE_CAMPOS, "lote"); }).join("") +
      servicios.map(function (s) { return tarjetaHtml(s, SERVICIO_CAMPOS, "servicio"); }).join("");

    contenedor.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;

      var subirF = t.closest(".redcafe-foto-subir");
      if (subirF) { subirFoto(subirF.closest(".redcafe-pub-card")); return; }

      var quitarF = t.closest(".redcafe-foto-quitar");
      if (quitarF) {
        var cardF = quitarF.closest(".redcafe-pub-card");
        var liF = quitarF.closest("[data-foto]");
        var iF = parseInt(liF.getAttribute("data-foto"), 10);
        var fotos = fotosDeTarjeta(cardF);
        fotos.splice(iF, 1);
        fijarFotos(cardF, fotos);
        guardarFotos(cardF, fotos, "Foto quitada.");
        return;
      }

      var subir = t.closest(".redcafe-doc-subir");
      if (subir) { subirDocumento(subir.closest(".redcafe-pub-card")); return; }

      var quitar = t.closest(".redcafe-doc-quitar");
      if (quitar) {
        var card = quitar.closest(".redcafe-pub-card");
        var li = quitar.closest("[data-doc]");
        var i = parseInt(li.getAttribute("data-doc"), 10);
        var docs = docsDeTarjeta(card);
        docs.splice(i, 1);
        fijarDocs(card, docs);
        guardarDocs(card, docs, "Documento quitado.");
        return;
      }

      var confirmar = t.closest("[data-confirmar]");
      if (confirmar) {
        var tarjeta = confirmar.closest(".redcafe-pub-card");
        var accion = confirmar.getAttribute("data-confirmar");
        var caja = tarjeta.querySelector(".redcafe-confirma-cantidad");
        if (accion === "disponible") {
          confirmarEstado(tarjeta, { disponibilidad: "disponible" }, "Confirmado: el lote sigue disponible.");
        } else if (accion === "agotado") {
          confirmarEstado(tarjeta, { disponibilidad: "agotado" }, "Marcado como agotado. Sigue visible, pero señalado.");
        } else if (accion === "cantidad") {
          if (caja) { caja.hidden = !caja.hidden; if (!caja.hidden) caja.querySelector("input").focus(); }
        } else if (accion === "guardar-cantidad") {
          var campo = caja.querySelector("input");
          var n = Math.max(0, parseInt(campo.value, 10) || 0);
          var esTerminado = tarjeta.getAttribute("data-categoria") === "terminado";
          var cuerpo = { disponibilidad: n > 0 ? "disponible" : "agotado" };
          cuerpo[esTerminado ? "unidades" : "stockSacos"] = n;
          confirmarEstado(tarjeta, cuerpo, n > 0
            ? "Actualizado: quedan " + n + "."
            : "Sin existencias: el lote queda marcado como agotado.");
        }
        return;
      }

      var boton = t.closest(".redcafe-pub-guardar");
      if (boton) guardar(boton.closest(".redcafe-pub-card"));
    });

    // Los campos del café tostado no tienen sentido en un lote verde. Se
    // ocultan con un atributo en la tarjeta; el CSS hace el resto.
    contenedor.addEventListener("change", function (ev) {
      var el = ev.target;
      if (!el || el.getAttribute("data-campo") !== "categoria") return;
      var card = el.closest(".redcafe-pub-card");
      if (card) card.setAttribute("data-categoria", el.value || "verde");
    });
  }

  // ── Mis pedidos ───────────────────────────────────────────────────────
  // El panel listaba los pedidos sin acciones: no se podían cancelar ni
  // retirar. Aquí se exponen las que autoriza la API.
  function pedidoHtml(p, uid) {
    var esMio = String(p.solicitante_id || "") === uid;
    var estado = p.estado || "Solicitado";
    var puedeEliminar = esMio && (estado === "Solicitado" || estado === "Cancelado");
    var puedeCancelar = estado !== "Entregado" && estado !== "Cancelado";
    var acciones = "";
    if (puedeCancelar) acciones += '<button type="button" class="redcafe-ped-btn" data-accion="cancelar">Cancelar pedido</button>';
    if (puedeEliminar) acciones += '<button type="button" class="redcafe-ped-btn is-borrar" data-accion="delete">Eliminar</button>';
    if (!acciones) acciones = '<span class="redcafe-pub-ayuda">Sin acciones disponibles en este estado.</span>';

    var titulo = p.tipo === "servicio" ? (p.servicio || "Servicio") : (p.finca || "Café");
    return '<article class="redcafe-ped-card" data-nro="' + esc(p.nro) + '">' +
      '<div class="redcafe-ped-info">' +
        '<p class="redcafe-pub-tag">#' + esc(p.nro) + ' · ' + (p.tipo === "servicio" ? "Servicio" : "Café") + '</p>' +
        '<h4>' + esc(titulo) + '</h4>' +
        '<p class="redcafe-ped-meta">' + esc(p.proveedor || p.productor || "") +
          ' · <strong>' + esc(estado) + '</strong> · ' + esc(p.fecha || "") + '</p>' +
      '</div>' +
      '<div class="redcafe-ped-acciones">' + acciones +
        '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</article>';
  }

  function accionPedido(card, accion) {
    var nro = card.getAttribute("data-nro");
    var estado = card.querySelector(".redcafe-pub-estado");
    var botones = card.querySelectorAll(".redcafe-ped-btn");
    var pregunta = accion === "delete"
      ? "¿Eliminar definitivamente el pedido #" + nro + "?"
      : "¿Cancelar el pedido #" + nro + "?";
    if (!window.confirm(pregunta)) return;

    Array.prototype.forEach.call(botones, function (b) { b.disabled = true; });
    estado.textContent = accion === "delete" ? "Eliminando…" : "Cancelando…";
    estado.className = "redcafe-pub-estado";

    json("/api/pedidos.php?action=" + accion, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nro: Number(nro) })
    }).then(function (res) {
      Array.prototype.forEach.call(botones, function (b) { b.disabled = false; });
      if (res && res.ok) {
        if (accion === "delete") { card.remove(); return; }
        estado.textContent = "Pedido cancelado.";
        estado.className = "redcafe-pub-estado is-ok";
        var meta = card.querySelector(".redcafe-ped-meta strong");
        if (meta) meta.textContent = "Cancelado";
        // En las tarjetas del sitio el estado va en un párrafo propio.
        Array.prototype.slice.call(card.querySelectorAll("p")).forEach(function (el) {
          if (/^(Solicitado|Aceptado|En camino)$/i.test((el.textContent || "").trim())) el.textContent = "Cancelado";
        });
        var cancelar = card.querySelector('[data-accion="cancelar"]');
        if (cancelar) cancelar.remove();
      } else {
        estado.textContent = (res && res.error) || "No se pudo completar la acción.";
        estado.className = "redcafe-pub-estado is-error";
      }
    });
  }

  function pintarPedidos(contenedor, pedidos, uid) {
    if (!pedidos.length) {
      contenedor.innerHTML = '<p class="redcafe-pub-vacio">Todavía no tienes pedidos ni solicitudes.</p>';
      return;
    }
    contenedor.innerHTML = pedidos.map(function (p) { return pedidoHtml(p, uid); }).join("");
    contenedor.addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest && ev.target.closest(".redcafe-ped-btn");
      if (!b) return;
      accionPedido(b.closest(".redcafe-ped-card"), b.getAttribute("data-accion"));
    });
  }

  // La sección de pedidos del sitio muestra los datos pero no deja actuar.
  // Aquí se le añaden las acciones que autoriza la API, sin duplicar la lista.
  function activarAccionesEnPedidosDelSitio(uid) {
    var intentos = 0;
    var timer = setInterval(function () {
      intentos += 1;
      var grid = document.querySelector(".redcafe-panel-orders-grid");
      var tarjetas = grid ? grid.querySelectorAll(".redcafe-panel-order-card") : [];
      if (intentos > 24) { clearInterval(timer); return; }
      if (!tarjetas.length) return;
      clearInterval(timer);

      json("/api/pedidos.php?action=list").then(function (r) {
        var pedidos = (r && r.ok && r.data && r.data.pedidos) || [];
        var porNro = {};
        pedidos.forEach(function (p) { porNro[String(p.nro)] = p; });

        Array.prototype.slice.call(tarjetas).forEach(function (card) {
          if (card.querySelector(".redcafe-ped-acciones")) return;
          var rot = card.querySelector("p");
          var m = rot ? (rot.textContent || "").match(/#\s*(\d+)/) : null;
          if (!m) return;
          var nro = m[1];
          var p = porNro[nro];
          if (!p) return;

          card.setAttribute("data-nro", nro);
          var estado = p.estado || "Solicitado";
          var esMio = String(p.solicitante_id || "") === uid;
          var acciones = "";
          if (estado !== "Entregado" && estado !== "Cancelado") {
            acciones += '<button type="button" class="redcafe-ped-btn" data-accion="cancelar">Cancelar pedido</button>';
          }
          if (esMio && (estado === "Solicitado" || estado === "Cancelado")) {
            acciones += '<button type="button" class="redcafe-ped-btn is-borrar" data-accion="delete">Eliminar</button>';
          }
          if (!acciones) return;

          var caja = document.createElement("div");
          caja.className = "redcafe-ped-acciones";
          caja.innerHTML = acciones + '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>';
          card.appendChild(caja);
        });

        if (grid.getAttribute("data-redcafe-acciones") === "1") return;
        grid.setAttribute("data-redcafe-acciones", "1");
        grid.addEventListener("click", function (ev) {
          var b = ev.target && ev.target.closest && ev.target.closest(".redcafe-ped-btn");
          if (!b) return;
          accionPedido(b.closest(".redcafe-panel-order-card"), b.getAttribute("data-accion"));
        });
      });
    }, 500);
  }

  function montar(usuario) {
    if (location.pathname.indexOf("/panel") !== 0) return;
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-mis-publicaciones")) return;

    var seccion = document.createElement("section");
    seccion.id = "redcafe-mis-publicaciones";
    seccion.className = "redcafe-pub-seccion";
    seccion.setAttribute("data-redcafe-propio", "1");
    seccion.innerHTML =
      '<div class="redcafe-pub-wrap">' +
        '<p class="redcafe-pub-rotulo">Mis publicaciones</p>' +
        '<h3 class="redcafe-pub-titulo">Lotes y servicios que has publicado</h3>' +
        '<p class="redcafe-pub-intro">Edita aquí tus propias publicaciones. Solo tú y la administración pueden modificarlas. Indica la latitud y longitud de tu finca para que aparezca en su ubicación exacta del mapa nacional.</p>' +
        '<div id="redcafe-pub-lista"><p class="redcafe-pub-vacio">Cargando tus publicaciones…</p></div>' +

      '</div>';
    // El panel del miembro (perfil, pedidos, estadísticas) va primero. Esta
    // sección se coloca después, justo antes del bloque de recursos del pie,
    // para no empujar hacia abajo lo que el usuario espera ver al entrar.
    var recursos = document.getElementById("redcafe-panel-resources");
    if (recursos) main.insertBefore(seccion, recursos);
    else main.appendChild(seccion);

    var lista = seccion.querySelector("#redcafe-pub-lista");

    // Los pedidos ya los lista la sección "Pedidos y solicitudes del
    // Marketplace" que pinta el propio sitio. En vez de duplicarla, se le
    // añaden ahí las acciones de cancelar y eliminar.
    activarAccionesEnPedidosDelSitio(String(usuario.id || ""));

    Promise.all([
      json("/api/lotes.php?action=mine"),
      json("/api/marketplace-servicios.php?action=mine")
    ]).then(function (r) {
      var lotes = (r[0] && r[0].ok && r[0].data && r[0].data.lotes) || [];
      var servicios = (r[1] && r[1].ok && r[1].data && (r[1].data.servicios || r[1].data)) || [];
      if (!Array.isArray(servicios)) servicios = [];

      var misLotes = lotes.map(function (l) {
        // La API rellena una coordenada provincial aproximada cuando el lote no
        // tiene la suya. No se muestra como si fuera real: el campo queda vacío
        // para que el dueño escriba la ubicación exacta de su finca.
        if (l.ubicacion_aproximada) {
          l = Object.assign({}, l);
          l.lat = "";
          l.lng = "";
        }
        return l;
      });
      var misServicios = servicios;
      pintar(lista, misLotes, misServicios);
    });
  }

  // "Lo que cambia para ti cuando entras en la Red" debe cerrar el panel.
  // «Lo que cambia para ti cuando entras en la Red» tiene que cerrar el
  // panel, no abrirlo. Antes se movía el nodo al final con appendChild, y eso
  // fallaba de dos maneas: mover un nodo de React es justo lo que rompe su
  // reconciliación, y además había una carrera — si React pintaba ese bloque
  // después de los tres intentos (1,5 s / 3 s / 5 s), se quedaba arriba, que
  // es lo que se veía en producción.
  //
  // Ahora no se mueve nada: se ordena con CSS. `order` no depende del momento
  // en que React pinte, así que el bloque cae al pie siempre.
  function recursosAlPie() {
    var main = document.querySelector("main");
    if (!main) return;
    main.classList.add("redcafe-panel-orden");
  }

  function iniciar() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    json("/api/auth.php?action=me").then(function (res) {
      var usuario = res && res.ok && res.data && res.data.user;
      if (!usuario || !usuario.id) return;
      montar(usuario);
      // El bloque de recursos cierra el panel: se comprueba varias veces
      // porque el sitio lo inserta de forma diferida.
      [1500, 3000, 5000].forEach(function (t) { setTimeout(recursosAlPie, t); });
    });
  }

  if (document.readyState === "complete") setTimeout(iniciar, 1200);
  else window.addEventListener("load", function () { setTimeout(iniciar, 1200); }, { once: true });
  // Next navega sin recargar: al entrar al panel por un enlace hay que montar
  // igual, y las secciones de la ruta anterior ya las retiró redcafe-ruta.js.
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 900); });
})();
