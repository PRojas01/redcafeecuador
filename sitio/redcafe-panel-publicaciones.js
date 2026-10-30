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
    { k: "provincia", label: "Provincia", tipo: "select", opciones: provinciasEcuador() },
    { k: "variedad", label: "Variedad", tipo: "text" },
    { k: "proceso", label: "Proceso", tipo: "text" },
    { k: "altura", label: "Altura (msnm)", tipo: "number",
      ayuda: "La de tu finca. Vacío si no la sabes con certeza" },
    { k: "precioSaco", label: "Precio por saco (USD)", tipo: "number" },
    { k: "pesoSacoLb", label: "Peso del saco (libras)", tipo: "number",
      ayuda: "Un quintal son 100 lb. Decirlo permite comparar tu precio con la referencia del mercado" },
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
      opciones: ["", "semilla", "plantula", "cereza", "bellota", "pergamino", "oro", "tostado"],
      ayuda: "Semilla y plántula = material de siembra · Bellota = en cáscara · Oro = trillado/pilado" },
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

  // Un servicio no es café: aquí estaban copiados los campos del café
  // tostado (marca, tueste, registro sanitario…) y el editor de servicios los
  // mostraba, porque su tarjeta no lleva data-categoria que los oculte.
  var SERVICIO_CAMPOS = [
    { k: "titulo", label: "Título", tipo: "text" },
    { k: "categoria", label: "Categoría", tipo: "text" },
    { k: "provincia", label: "Provincia", tipo: "select", opciones: provinciasEcuador() },
    { k: "cobertura", label: "Cobertura", tipo: "text" },
    { k: "precio", label: "Precio (USD)", tipo: "number" },
    { k: "unidad", label: "Unidad", tipo: "text" },
    { k: "visibilidad", label: "Quién puede verlo", tipo: "select",
      opciones: [["publico", "Todo el mundo"], ["registrados", "Solo miembros de la Red"]],
      ayuda: "«Solo miembros»: solo lo verán quienes tengan cuenta en la Red" },
    { k: "descripcion", label: "Descripción", tipo: "textarea" }
  ];


  function enlazarDerechos(root) {
    root.querySelectorAll('.redcafe-derechos input').forEach(function (input) {
      if (input.derechosEnlazados) return;
      input.derechosEnlazados = true;
      var scope = input.parentElement.parentElement;
      var botones = scope.querySelectorAll('[data-derechos-enviar]');
      input.addEventListener('change', function () {
        scope.querySelectorAll('[data-derechos-enviar]').forEach(function (b) { b.disabled = !input.checked; });
      });
    });
  }
  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function provinciasEcuador() {
    return ["", "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi",
      "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja",
      "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza",
      "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas",
      "Sucumbíos", "Tungurahua", "Zamora Chinchipe"];
  }

  function normalizarProvincia(valor) {
    var actual = String(valor || "").trim();
    if (!actual) return "";
    var simple = actual.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var provincias = provinciasEcuador();
    for (var i = 0; i < provincias.length; i++) {
      var p = provincias[i];
      if (p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === simple) return p;
    }
    return actual;
  }

  function json(url, opciones) {
    return fetch(url, Object.assign({ credentials: "include", cache: "no-store" }, opciones || {}))
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false }; });
  }

  function skeletonPublicaciones(cuantas) {
    var html = "";
    for (var i = 0; i < cuantas; i++) {
      html += '<article class="redcafe-skeleton-card" aria-hidden="true">' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea corta"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea media"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea corta"></span>' +
      '</article>';
    }
    return '<div class="redcafe-skeleton redcafe-skeleton-lista" role="status" aria-label="Cargando publicaciones">' + html + '</div>';
  }

  function rolesDe(usuario) {
    var roles = [];
    if (usuario && typeof usuario.rol === "string" && usuario.rol) roles.push(usuario.rol);
    if (usuario && Array.isArray(usuario.roles)) {
      usuario.roles.forEach(function (rol) {
        if (roles.indexOf(rol) === -1) roles.push(rol);
      });
    }
    return roles;
  }

  function tieneRol(usuario, permitidos) {
    var roles = rolesDe(usuario);
    return roles.some(function (rol) { return permitidos.indexOf(rol) !== -1; });
  }

  function esAdmin(usuario) {
    return !!(usuario && (usuario.admin || usuario.is_admin || tieneRol(usuario, ["admin"])));
  }

  function panelAccesoRapido(usuario, sinLotes) {
    // Los mismos perfiles que api/lotes.php deja publicar. Con «comprador» y
    // «proveedor» en la lista, el botón principal llevaba a un formulario que la
    // API rechaza con 403.
    var vendedorCafe = tieneRol(usuario, ["productor", "vendedor", "exportador", "pilador", "admin"]);
    // Los mismos perfiles que redcafe-requerimientos.js deja publicar lo que buscan.
    var compraCafe = tieneRol(usuario, ["comprador", "bar", "barista", "amante"]);
    // El botón repetía literalmente el título de la tarjeta («Publicar lote de
    // café» dos veces seguidas). El título dice qué es; el botón, qué pasa al
    // pulsarlo.
    var primaryHref, primaryText, primaryDesc, primaryBoton;
    /* A quien todavía no tiene ni un lote publicado, decirle «publica tu lote»
       no le sirve: o no tiene café listo, o no sabe cómo presentarlo. Y si está
       en siembra no tendrá nada que vender en dos o tres años. Para ese caso la
       guía es lo único que la plataforma le puede dar hoy, así que se adelanta.
       En cuanto publica su primer lote, la recomendación vuelve a ser vender. */
    if (vendedorCafe && sinLotes) {
      primaryHref = "/panel/?ver=guias";
      primaryText = "Empieza por tu finca";
      primaryBoton = "Abrir mi guía";
      primaryDesc = "Guía paso a paso desde la siembra: vivero, siembra, manejo, cosecha, beneficio y venta. Marca lo que ya hiciste y anota tus datos; cuando tengas café listo, publicarlo será inmediato.";
    } else if (vendedorCafe) {
      primaryHref = "/panel/?ver=publicar";
      primaryText = "Publicar lote de café";
      primaryBoton = "Empezar la publicación";
      primaryDesc = "Registra café en cereza, bellota, pergamino, oro o terminado — o semillas y plántulas si vendes material de siembra. Los compradores de la Red lo verán en el Marketplace.";
    } else if (compraCafe) {
      primaryHref = "/panel/#redcafe-requerimientos-panel";
      primaryText = "Publicar qué café buscas";
      primaryBoton = "Escribir lo que busco";
      primaryDesc = "Indica variedad, cantidad y precio que buscas: los productores te ofrecen sus lotes sin que recorras las fichas una por una.";
    } else {
      primaryHref = "/panel/?ver=publicar_servicio";
      primaryText = "Publicar mi servicio";
      primaryBoton = "Publicar ahora";
      primaryDesc = "Catación, pilado, transporte, asesoría o insumos: publícalo para que productores y compradores de la Red te contraten.";
    }
    // La segunda tarjeta lleva a lo que la primera no cubre.
    if (vendedorCafe && sinLotes) {
      return '' +
        '<div class="redcafe-panel-next-actions" data-redcafe-propio="1">' +
          '<article class="redcafe-panel-next-card is-primary">' +
            '<p>Acción recomendada</p>' +
            '<h4>' + esc(primaryText) + '</h4>' +
            '<span>' + esc(primaryDesc) + '</span>' +
            '<a href="' + esc(primaryHref) + '">' + esc(primaryBoton) + '</a>' +
          '</article>' +
          '<article class="redcafe-panel-next-card">' +
            '<p>Cuando ya tengas café</p>' +
            '<h4>Publicar lote de café</h4>' +
            '<span>Cereza, bellota, pergamino, oro, terminado — o semillas y plántulas si vendes material de siembra.</span>' +
            '<a href="/panel/?ver=publicar">Empezar la publicación</a>' +
          '</article>' +
        '</div>';
    }

    var segunda = primaryHref.indexOf("publicar_servicio") !== -1
      ? { p: "Café", h: "Explorar lotes de café", s: "Mira la oferta por origen, proceso, variedad y estado del café.", href: "/marketplace/", a: "Ver lotes de café" }
      : { p: "Servicios", h: "Publicar o contratar servicios cafeteros", s: "Catación, pilado, transporte, asesoría, insumos y soporte operativo a un clic del panel.", href: "/panel/?ver=publicar_servicio", a: "Publicar servicio" };
    if (compraCafe && !vendedorCafe) {
      segunda = { p: "Café", h: "Explorar lotes de café", s: "Encuentra oferta disponible por origen, proceso, variedad y estado del café antes de contactar.", href: "/marketplace/", a: "Ver lotes de café" };
    }
    return '' +
      '<div class="redcafe-panel-next-actions" data-redcafe-propio="1">' +
        '<article class="redcafe-panel-next-card is-primary">' +
          '<p>Acción recomendada</p>' +
          '<h4>' + esc(primaryText) + '</h4>' +
          '<span>' + esc(primaryDesc) + '</span>' +
          '<a href="' + esc(primaryHref) + '">' + esc(primaryBoton || primaryText) + '</a>' +
        '</article>' +
        // Las otras dos tarjetas llevaban a Servicios y al panel de precios, que
        // ya están en la barra «Tus herramientas» de arriba. Tres bloques para
        // lo mismo alargaban el panel y hacían dudar de si eran cosas distintas.
        // Si esa barra no existe (versión antigua), se mantienen.
        (document.getElementById("redcafe-atajos") ? "" :
          '<article class="redcafe-panel-next-card">' +
            '<p>' + esc(segunda.p) + '</p>' +
            '<h4>' + esc(segunda.h) + '</h4>' +
            '<span>' + esc(segunda.s) + '</span>' +
            '<a href="' + esc(segunda.href) + '">' + esc(segunda.a) + '</a>' +
          '</article>' +
          '<article class="redcafe-panel-next-card">' +
            '<p>Negociación</p>' +
            '<h4>Revisar precio y requerimientos</h4>' +
            '<span>Usa la referencia mensual y mira qué están buscando compradores antes de fijar condiciones.</span>' +
            '<a href="/servicios/precios/">Ver panel de precios</a>' +
          '</article>') +
      '</div>';
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
  function fotosHtml(imagenes, tipo) {
    imagenes = Array.isArray(imagenes) ? imagenes : [];
    var esServicio = tipo === "servicio";
    var lista = imagenes.length
      ? imagenes.map(function (u, i) {
          return '<li data-foto="' + i + '">' +
            '<img src="' + esc(u) + '" alt="Foto ' + (i + 1) + '" loading="lazy">' +
            '<button type="button" disabled data-derechos-enviar class="redcafe-foto-quitar" aria-label="Quitar esta foto">Quitar</button>' +
          '</li>';
        }).join("")
      : '<li class="redcafe-foto-vacio">' + (esServicio
          ? "Sin fotos. Una foto de tu trabajo o de tu equipo da confianza a quien contrata."
          : "Sin fotos propias. La ficha muestra una imagen genérica del proceso.") + '</li>';

    return '<div class="redcafe-foto-bloque">' +
      '<p class="redcafe-doc-titulo">' + (esServicio ? "Fotos del servicio" : "Fotos del lote") + '</p>' +
      '<p class="redcafe-pub-ayuda">' + (esServicio
        ? "Muestra tu trabajo: el camión, el laboratorio, la piladora, un curso tuyo. "
        : "Toma fotos reales de tu café: el grano, el saco, la finca. ") +
        'JPG o PNG, hasta 2 MB, máximo 6. Es lo primero que se mira.</p>' +
      '<ul class="redcafe-foto-lista">' + lista + '</ul>' +
      '<div class="redcafe-doc-alta">' +
        '<input type="file" class="redcafe-foto-archivo" ' + (esServicio ? 'accept=".jpg,.jpeg,.png">' : 'accept="image/*" capture="environment"><p>Toma la foto en el momento con tu cámara.</p>') +
        '<button type="button" disabled data-derechos-enviar class="redcafe-foto-subir">Añadir foto</button>' +
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
    if (bloque) bloque.outerHTML = fotosHtml(fotos, card.getAttribute("data-tipo"));
    card.querySelectorAll(".redcafe-foto-bloque [data-derechos-enviar]").forEach(function (b) { b.disabled = !card.querySelector('[name="acepta_derechos"]').checked; });
  }

  function guardarFotos(card, fotos, mensaje) {
    if (!card.querySelector('[name="acepta_derechos"]').checked) return;
    var estado = card.querySelector(".redcafe-foto-estado");
    // Las fotos de un servicio las guarda su propia API; las del lote, la suya.
    var api = card.getAttribute("data-tipo") === "servicio"
      ? "/api/marketplace-servicios.php?action=update"
      : "/api/lotes.php?action=update";
    json(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acepta_derechos: true, id: card.getAttribute("data-id"), imagenes: fotos })
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
    if (!card.querySelector('[name="acepta_derechos"]').checked) return;
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
    fd.append("acepta_derechos", "true");
    fd.append("archivo", archivo);
    fd.append("context", "marketplace");

    boton.disabled = true;
    estado.textContent = "Subiendo…";
    estado.className = "redcafe-pub-estado redcafe-foto-estado";

    fetch("/api/uploads.php?action=image", { method: "POST", credentials: "include", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        boton.disabled = !boton.closest(".redcafe-pub-card").querySelector('[name="acepta_derechos"]').checked;
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
        boton.disabled = !boton.closest(".redcafe-pub-card").querySelector('[name="acepta_derechos"]').checked;
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
            '<button type="button" disabled data-derechos-enviar class="redcafe-doc-quitar" aria-label="Quitar documento">Quitar</button>' +
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
        '<button type="button" disabled data-derechos-enviar class="redcafe-doc-subir">Adjuntar</button>' +
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
    card.querySelectorAll(".redcafe-doc-bloque [data-derechos-enviar]").forEach(function (b) { b.disabled = !card.querySelector('[name="acepta_derechos"]').checked; });
  }

  function subirDocumento(card) {
    if (!card.querySelector('[name="acepta_derechos"]').checked) return;
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
    fd.append("acepta_derechos", "true");
    fd.append("archivo", archivo);
    fd.append("tipo", card.querySelector(".redcafe-doc-tipo").value);
    fd.append("titulo", card.querySelector(".redcafe-doc-nombre").value || "");

    boton.disabled = true;
    estado.textContent = "Subiendo…";
    estado.className = "redcafe-pub-estado redcafe-doc-estado";

    fetch("/api/uploads.php?action=documento", { method: "POST", credentials: "include", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        boton.disabled = !boton.closest(".redcafe-pub-card").querySelector('[name="acepta_derechos"]').checked;
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
        boton.disabled = !boton.closest(".redcafe-pub-card").querySelector('[name="acepta_derechos"]').checked;
        estado.textContent = "No se pudo subir el documento.";
        estado.className = "redcafe-pub-estado redcafe-doc-estado is-error";
      });
  }

  function guardarDocs(card, docs, mensaje) {
    if (!card.querySelector('[name="acepta_derechos"]').checked) return;
    var estado = card.querySelector(".redcafe-doc-estado");
    json("/api/lotes.php?action=update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acepta_derechos: true, id: card.getAttribute("data-id"), documentos: docs })
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
        : (campo.k === "provincia" ? normalizarProvincia(valor) : String(valor || ""));
      // «Quién puede verlo» usa pares [valor, etiqueta]: el value que entiende
      // la API no es el texto que se lee en pantalla.
      var opciones = (campo.opciones || []).map(function (o) {
        var par = Array.isArray(o);
        var valor = par ? o[0] : o;
        var rotulo = par ? o[1] : (o === "" ? "— sin indicar —" : esc(o));
        return '<option value="' + esc(valor) + '"' + (actual === valor ? " selected" : "") + '>' + esc(rotulo) + '</option>';
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

  // Resumen de una línea para la ficha plegada: lo que el dueño necesita ver
  // sin abrir 40 campos (estado, precio, existencias, disponibilidad).
  function resumenHtml(item, tipo) {
    var partes = [];
    if (tipo === "lote") {
      var terminado = String(item.categoria) === "terminado";
      if (!terminado && item.estado) partes.push(String(item.estado));
      if (terminado && Number(item.precioUnidad) > 0) partes.push("$" + Number(item.precioUnidad).toFixed(2) + " / unidad");
      if (!terminado && Number(item.precioSaco) > 0) partes.push("$" + Number(item.precioSaco).toFixed(2) + " / saco");
      var stock = terminado ? item.unidades : item.stockSacos;
      if (stock !== undefined && stock !== null && stock !== "") partes.push(stock + (terminado ? " unidades" : " sacos"));
      partes.push(item.disponibilidad || "disponible");
      var nDocs = Array.isArray(item.documentos) ? item.documentos.length : 0;
      partes.push(nDocs ? nDocs + (nDocs === 1 ? " certificado" : " certificados") : "sin certificados");
    } else {
      if (item.categoria) partes.push(String(item.categoria));
      if (Number(item.precio) > 0) partes.push("$" + Number(item.precio).toFixed(2) + (item.unidad ? " / " + item.unidad : ""));
      if (item.provincia) partes.push(String(item.provincia));
    }
    return '<p class="redcafe-pub-resumen">' + partes.map(esc).join(" · ") + '</p>';
  }

  function tarjetaHtml(item, campos, tipo, abierta) {
    var titulo = tipo === "lote" ? (item.finca || "Lote sin nombre") : (item.titulo || "Servicio");
    var docsAttr = ' data-fotos="' + esc(JSON.stringify(item.imagenes || [])) + '"' +
      (tipo === "lote" ? ' data-docs="' + esc(JSON.stringify(item.documentos || [])) + '"' : "");
    var categoria = tipo === "lote" ? (item.categoria || "verde") : "";
    var catAttr = tipo === "lote" ? ' data-categoria="' + esc(categoria) + '"' : "";
    return '<article class="redcafe-pub-card" data-tipo="' + tipo + '" data-id="' + esc(item.id) + '"' + catAttr + docsAttr + '>' +
      '<header class="redcafe-pub-head">' +
        '<h4>' + esc(titulo) + '</h4>' +
        '<span class="redcafe-pub-tag">' +
          (tipo === "lote" ? (categoria === "terminado" ? "Café tostado" : "Lote de café") : "Servicio") +
        '</span>' +
        // Decisión del propietario (23 sep 2026): los lotes se publican siempre
        // en abierto; en los servicios manda su campo visibilidad.
        '<span class="redcafe-pub-tag redcafe-pub-tag-vis">' +
          (tipo === "lote" || item.visibilidad !== "registrados" ? "Pública" : "Solo miembros") +
        '</span>' +
      '</header>' +
      '<label class="redcafe-derechos"><input type="checkbox" name="acepta_derechos" required> Declaro que tengo los derechos sobre este contenido y asumo la responsabilidad ante cualquier reclamo de terceros.</label>' +
      resumenHtml(item, tipo) +
      (tipo === "lote" ? avisoConfirmacionHtml(item) : "") +
      // Plegada por defecto: con dos lotes abiertos el panel medía 8.345 px en
      // el móvil. Se despliega con el botón; la recién publicada llega abierta.
      '<button type="button" class="redcafe-pub-toggle" aria-expanded="' + (abierta ? "true" : "false") + '">' +
        (abierta ? "Ocultar ficha" : (tipo === "lote" ? "Editar ficha, fotos y certificados" : "Editar servicio y fotos")) +
      '</button>' +
      '<div class="redcafe-pub-cuerpo"' + (abierta ? "" : " hidden") + '>' +
        '<div class="redcafe-pub-grid">' +
          campos.map(function (c) { return campoHtml(c, item[c.k]); }).join("") +
        '</div>' +
        fotosHtml(item.imagenes, tipo) +
        (tipo === "lote" ? docsHtml(item.documentos) : "") +
        '<div class="redcafe-pub-acciones">' +
          '<button type="button" disabled data-derechos-enviar class="redcafe-pub-guardar">Guardar cambios</button>' +
          '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function guardar(card) {
    var tipo = card.getAttribute("data-tipo");
    var id = card.getAttribute("data-id");
    var estado = card.querySelector(".redcafe-pub-estado");
    var boton = card.querySelector(".redcafe-pub-guardar");
    var cuerpo = { id: id, acepta_derechos: true };

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
      boton.disabled = !boton.closest(".redcafe-pub-card").querySelector('[name="acepta_derechos"]').checked;
      if (res && res.ok) {
        estado.textContent = "Cambios guardados.";
        estado.className = "redcafe-pub-estado is-ok";
      } else {
        estado.textContent = (res && res.error) || "No se pudo guardar. Inténtalo de nuevo.";
        estado.className = "redcafe-pub-estado is-error";
      }
    });
  }

  function pintar(contenedor, lotes, servicios, abiertas) {
    if (!lotes.length && !servicios.length) {
      contenedor.innerHTML =
        '<p class="redcafe-pub-vacio">Todavía no has publicado lotes ni servicios. ' +
        'Cuando publiques, aparecerán aquí para que puedas corregirlos cuando quieras.</p>';
      return;
    }
    contenedor.innerHTML =
      lotes.map(function (l) { return tarjetaHtml(l, LOTE_CAMPOS, "lote", abiertas); }).join("") +
      servicios.map(function (s) { return tarjetaHtml(s, SERVICIO_CAMPOS, "servicio", abiertas); }).join("");

    enlazarDerechos(contenedor);
    contenedor.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;

      var toggle = t.closest(".redcafe-pub-toggle");
      if (toggle) {
        var cardT = toggle.closest(".redcafe-pub-card");
        var cuerpoT = cardT && cardT.querySelector(".redcafe-pub-cuerpo");
        if (!cuerpoT) return;
        var abrir = cuerpoT.hidden;
        cuerpoT.hidden = !abrir;
        toggle.setAttribute("aria-expanded", abrir ? "true" : "false");
        toggle.textContent = abrir ? "Ocultar ficha"
          : (cardT.getAttribute("data-tipo") === "lote" ? "Editar ficha, fotos y certificados" : "Editar servicio y fotos");
        return;
      }

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

  /* La acción recomendada va ARRIBA del panel, no dentro de «Mis
     publicaciones», que a propósito se coloca casi al final. Para un productor
     que acaba de registrarse, lo primero que debe ver es «Publicar lote de
     café», no el bloque de pedidos pensado para quien compra.
     El bloque de pedidos lo inserta otro script también al principio y cuando
     le responde su API, así que puede adelantarse. Por eso se recoloca unas
     pocas veces, con un número fijo de intentos: una comprobación que solo
     para «cuando sale bien» es un bucle en cuanto algo falla. */
  function montarAccionRecomendada(main, usuario) {
    if (document.getElementById("redcafe-panel-accion")) return;
    var bloque = document.createElement("section");
    bloque.id = "redcafe-panel-accion";
    bloque.className = "mx-auto max-w-6xl px-4 pt-6";
    bloque.setAttribute("data-redcafe-propio", "1");
    bloque.innerHTML = panelAccesoRapido(usuario, false);
    colocarArriba(main, bloque);
    /* Cuántos lotes tiene se sabe una respuesta después, y la tarjeta ya está
       puesta. Se vuelve a pintar solo si resulta que no tiene ninguno: así
       nadie ve primero una recomendación y luego otra sin motivo.
       La consulta la comparte redcafe-sesion.js con la que hace la lista de
       publicaciones, así que no cuesta una llamada más. */
    json("/api/lotes.php?action=mine").then(function (res) {
      var mios = (res && res.ok && res.data && (res.data.lotes || res.data.items || res.data)) || [];
      if (!Array.isArray(mios) || mios.length > 0) return;
      if (!bloque.isConnected) return;
      bloque.innerHTML = panelAccesoRapido(usuario, true);
    });
    [1500, 3500, 6500].forEach(function (ms) {
      setTimeout(function () { colocarArriba(document.querySelector("main"), bloque); }, ms);
    });
  }

  function colocarArriba(main, bloque) {
    if (!main) return;
    var pedidos = document.getElementById("redcafe-panel-orders");
    if (pedidos && pedidos.parentNode === main) {
      if (pedidos.previousElementSibling !== bloque) main.insertBefore(bloque, pedidos);
    } else if (main.firstElementChild !== bloque) {
      main.insertBefore(bloque, main.firstElementChild);
    }
  }

  function montar(usuario) {
    if (location.pathname.indexOf("/panel") !== 0) return;
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-mis-publicaciones")) return;

    var seccion = document.createElement("section");
    seccion.id = "redcafe-mis-publicaciones";
    seccion.className = "redcafe-pub-seccion";
    seccion.setAttribute("data-redcafe-propio", "1");
    var tituloPropios = esAdmin(usuario) ? "Publicaciones administradas" : "Mis publicaciones";
    var introPropios = esAdmin(usuario)
      ? "Estás viendo publicaciones administradas. Las cuentas normales solo ven y editan sus propios lotes de café y servicios."
      : "Edita aquí tus propias publicaciones. Solo tú y la administración pueden modificarlas. Indica la latitud y longitud de tu finca para que aparezca en su ubicación exacta del mapa nacional.";
    seccion.innerHTML =
      '<div class="redcafe-pub-wrap">' +
        '<p class="redcafe-pub-rotulo">' + esc(tituloPropios) + '</p>' +
        '<h3 class="redcafe-pub-titulo">Lotes y servicios que has publicado</h3>' +
        '<p class="redcafe-pub-intro">' + esc(introPropios) + '</p>' +
        '<div id="redcafe-pub-lista">' + skeletonPublicaciones(3) + '</div>' +

      '</div>';
    // El panel del miembro (perfil, pedidos, estadísticas) va primero. Esta
    // sección se coloca después, justo antes del bloque de recursos del pie,
    // para no empujar hacia abajo lo que el usuario espera ver al entrar.
    var recursos = document.getElementById("redcafe-panel-resources");
    if (recursos) main.insertBefore(seccion, recursos);
    else main.appendChild(seccion);

    montarAccionRecomendada(main, usuario);

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


  // ── Publicar lote con la ficha completa ───────────────────────────────
  // El formulario de React de /panel/?ver=publicar solo pide los datos
  // básicos del café verde por sacos: no deja elegir el estado del café
  // (cereza, bellota, pergamino, oro), ni publicar producto terminado, ni
  // la ficha técnica, aunque api/lotes.php (action=publish) acepta todo eso
  // desde hace tiempo. Los certificados necesitan que el lote ya exista.
  //
  // Aquí se oculta ESE formulario con un atributo (nunca se borra ni se
  // mueve un nodo de React) y se pinta al lado uno propio. Al publicar se
  // abre la ficha del lote recién creado, con fotos y certificados.
  var PUBLICAR_BASICOS = ["finca", "provincia", "variedad", "proceso", "estado", "altura",
    "precioSaco", "pesoSacoLb", "precioQuintal", "stockSacos", "ventaMinima", "certificacion", "score",
    "descripcion", "lat", "lng"];
  var PUBLICAR_FICHA = ["humedad", "zaranda", "defectos", "rendimiento", "empaque", "cosecha",
    "cantidadKg", "entrega", "muestraDisponible", "notasTaza", "canton", "observaciones"];
  var intentosPublicar = 0;
  var publicarScrollHecho = false;

  function campoPorClave(k) {
    for (var i = 0; i < LOTE_CAMPOS.length; i++) if (LOTE_CAMPOS[i].k === k) return LOTE_CAMPOS[i];
    return null;
  }

  function formularioPublicarHtml() {
    var basicos = PUBLICAR_BASICOS.map(function (k) {
      var c = campoPorClave(k);
      if (!c) return "";
      if (k === "proceso") c = { k: "proceso", label: "Proceso", tipo: "select",
        opciones: ["", "Lavado", "Natural", "Honey", "Semi-lavado", "Anaeróbico", "Otro"] };
      if (k === "estado") c = { k: "estado", label: "Estado del café", tipo: "select",
        opciones: ["cereza", "bellota", "pergamino", "oro", "semilla", "plantula"],
        ayuda: "Cereza = recién cosechado · Bellota = en cáscara · Oro = trillado/pilado · Semilla y plántula = material de siembra" };
      return campoHtml(c, k === "estado" ? "pergamino" : "");
    }).join("");
    var terminado = LOTE_CAMPOS.filter(function (c) { return c.terminado; })
      .map(function (c) { return campoHtml(c, ""); }).join("");
    var ficha = PUBLICAR_FICHA.map(function (k) {
      var c = campoPorClave(k); return c ? campoHtml(c, "") : "";
    }).join("");
    return '' +
      '<div class="redcafe-pub-card redcafe-publicar" data-categoria="verde">' +
        '<label class="redcafe-derechos"><input type="checkbox" name="acepta_derechos" required> Declaro que tengo los derechos sobre este contenido y asumo la responsabilidad ante cualquier reclamo de terceros.</label>' +
        '<p class="redcafe-pub-rotulo">Paso 1 de 2 · Datos del lote</p>' +
        '<div class="redcafe-publicar-tipo" role="radiogroup" aria-label="Qué vas a publicar">' +
          '<label><input type="radio" name="redcafe-publicar-categoria" value="verde" checked>' +
            '<span><b>Café en grano</b><small>Cereza, bellota, pergamino u oro</small></span></label>' +
          '<label><input type="radio" name="redcafe-publicar-categoria" value="terminado">' +
            '<span><b>Producto terminado</b><small>Tostado y empacado, por unidades</small></span></label>' +
        '</div>' +
        '<div class="redcafe-pub-grid">' + basicos + terminado + '</div>' +
        '<button type="button" class="redcafe-publicar-gps">Usar mi ubicación actual</button>' +
        '<details class="redcafe-publicar-ficha"><summary>Ficha técnica (opcional): humedad, zaranda, defectos, cosecha, entrega…</summary>' +
          '<div class="redcafe-pub-grid">' + ficha + '</div>' +
        '</details>' +
        '<div class="redcafe-doc-bloque redcafe-publicar-cert">' +
          '<p class="redcafe-doc-titulo">Certificado de calidad (opcional)</p>' +
          '<p class="redcafe-pub-ayuda">PDF, JPG o PNG · hasta 5 MB. Se adjunta al publicar y el comprador lo ve en la ficha del lote.</p>' +
          '<div class="redcafe-doc-alta">' +
            '<select class="redcafe-pub-input redcafe-doc-tipo redcafe-cert-tipo">' +
              DOC_TIPOS.map(function (t) { return '<option value="' + t[0] + '">' + esc(t[1]) + '</option>'; }).join("") +
            '</select>' +
            '<input type="file" class="redcafe-cert-archivo" accept=".pdf,.jpg,.jpeg,.png">' +
          '</div>' +
        '</div>' +
        '<p class="redcafe-pub-ayuda">Los campos con * son obligatorios. En el paso 2 añades fotos y más certificados.</p>' +
        '<div class="redcafe-pub-acciones">' +
          '<button type="button" disabled data-derechos-enviar class="redcafe-pub-guardar redcafe-publicar-enviar">Publicar lote de café</button>' +
          '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>' +
        '</div>' +
        '<p class="redcafe-publicar-rapido"><button type="button" class="redcafe-publicar-usar-rapido">Prefiero el formulario rápido anterior</button></p>' +
      '</div>';
  }

  /* Semilla y plántula son material de siembra: se venden por planta, no por
     saco. Pedirles precio por saco y peso del saco no tiene sentido, así que
     el formulario cambia de campos cuando se elige ese estado. */
  function esSiembra(caja) {
    var sel = caja && caja.querySelector('[data-campo="estado"]');
    var v = sel ? String(sel.value || "").toLowerCase() : "";
    return v === "semilla" || v === "plantula";
  }

  function requeridosPublicar(categoria, siembra) {
    if (categoria === "terminado") return ["finca", "provincia", "variedad", "precioUnidad"];
    if (siembra) return ["finca", "provincia", "variedad", "precioUnidad", "unidades"];
    return ["finca", "provincia", "variedad", "proceso", "precioSaco", "pesoSacoLb", "stockSacos"];
  }

  function marcarRequeridos(caja, categoria) {
    var siembra = categoria !== "terminado" && esSiembra(caja);
    var req = requeridosPublicar(categoria, siembra);
    Array.prototype.slice.call(caja.querySelectorAll(".redcafe-pub-label")).forEach(function (l) {
      var el = l.querySelector("[data-campo]");
      var span = l.querySelector("span");
      if (!el || !span) return;
      var base = span.getAttribute("data-base") || span.textContent.replace(/ \*$/, "");
      span.setAttribute("data-base", base);
      span.textContent = req.indexOf(el.getAttribute("data-campo")) !== -1 ? base + " *" : base;
    });
    // En producto terminado el estado es siempre tostado, y precio/stock van por unidad.
    ["precioSaco", "precioQuintal", "pesoSacoLb", "stockSacos"].forEach(function (k) {
      var el = caja.querySelector('[data-campo="' + k + '"]');
      if (el) el.closest(".redcafe-pub-label").hidden = (categoria === "terminado") || siembra;
    });
    var elEstado = caja.querySelector('[data-campo="estado"]');
    if (elEstado) elEstado.closest(".redcafe-pub-label").hidden = categoria === "terminado";
    // Precio y cantidad por unidad: los usa el producto terminado y también el
    // material de siembra.
    ["precioUnidad", "unidades"].forEach(function (k) {
      var el = caja.querySelector('[data-campo="' + k + '"]');
      if (!el) return;
      var label = el.closest(".redcafe-pub-label");
      label.hidden = !(categoria === "terminado" || siembra);
      if (siembra) {
        var span = label.querySelector("span");
        if (span && !span.getAttribute("data-base-siembra")) {
          span.setAttribute("data-base-siembra", "1");
          span.textContent = (k === "precioUnidad" ? "Precio por planta o semilla (USD)" : "Plantas o semillas disponibles") +
            (req.indexOf(k) !== -1 ? " *" : "");
        }
      }
    });
    // La ficha técnica (humedad, zaranda, defectos, empaque en sacos…) es del
    // café en grano; ni el producto terminado ni la siembra la usan.
    var ficha = caja.querySelector(".redcafe-publicar-ficha");
    if (ficha) ficha.hidden = (categoria === "terminado") || siembra;
  }

  function enviarPublicacion(caja, formReact) {
    if (!caja.querySelector('[name="acepta_derechos"]').checked) return;
    var categoria = caja.getAttribute("data-categoria") || "verde";
    var estado = caja.querySelector(".redcafe-pub-acciones .redcafe-pub-estado");
    var boton = caja.querySelector(".redcafe-publicar-enviar");
    var cuerpo = { categoria: categoria, acepta_derechos: true };
    Array.prototype.slice.call(caja.querySelectorAll("[data-campo]")).forEach(function (el) {
      var label = el.closest(".redcafe-pub-label");
      if (label && (label.hidden || (label.getAttribute("data-solo") === "terminado" && categoria !== "terminado"))) return;
      var clave = el.getAttribute("data-campo");
      var valor = String(el.value).trim();
      if (valor === "") return; // vacío: no se envía, la API no inventa el dato
      if (clave === "muestraDisponible" || clave === "descafeinado") { cuerpo[clave] = valor === "sí"; return; }
      cuerpo[clave] = el.type === "number" ? Number(valor) : valor;
    });
    var faltan = requeridosPublicar(categoria, categoria !== "terminado" && esSiembra(caja)).filter(function (k) {
      return cuerpo[k] === undefined || cuerpo[k] === "" ||
        ((/^precio/.test(k) || k === "stockSacos" || k === "pesoSacoLb") && !(Number(cuerpo[k]) > 0));
    });
    if (faltan.length) {
      var nombres = faltan.map(function (k) { var c = campoPorClave(k); return c ? c.label : k; });
      estado.textContent = "Completa: " + nombres.join(", ") + ".";
      estado.className = "redcafe-pub-estado is-error";
      var primero = caja.querySelector('[data-campo="' + faltan[0] + '"]');
      if (primero) primero.focus();
      return;
    }
    var certInput = caja.querySelector(".redcafe-cert-archivo");
    var cert = certInput && certInput.files && certInput.files[0];
    if (cert && cert.size > 5 * 1024 * 1024) {
      estado.textContent = "El certificado supera los 5 MB.";
      estado.className = "redcafe-pub-estado is-error";
      return;
    }
    boton.disabled = true;
    estado.textContent = "Publicando…";
    estado.className = "redcafe-pub-estado";
    json("/api/lotes.php?action=publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo)
    }).then(function (res) {
      boton.disabled = !boton.closest(".redcafe-pub-card").querySelector('[name="acepta_derechos"]').checked;
      var lote = res && res.ok && res.data && res.data.lote;
      if (!lote) {
        estado.textContent = (res && res.error) || "No se pudo publicar. Inténtalo de nuevo.";
        estado.className = "redcafe-pub-estado is-error";
        return;
      }
      if (cert) {
        estado.textContent = "Lote publicado. Subiendo el certificado…";
        estado.className = "redcafe-pub-estado";
        boton.disabled = true;
        var fd = new FormData();
    fd.append("acepta_derechos", "true");
        fd.append("archivo", cert);
        fd.append("tipo", (caja.querySelector(".redcafe-cert-tipo") || {}).value || "certificado-calidad");
        fd.append("titulo", "");
        fetch("/api/uploads.php?action=documento", { method: "POST", credentials: "include", body: fd })
          .then(function (r) { return r.json(); })
          .then(function (up) {
            if (!up || !up.ok || !up.data || !up.data.documento) throw new Error((up && up.error) || "");
            var docs = [up.data.documento];
            return json("/api/lotes.php?action=update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ acepta_derechos: true, id: lote.id, documentos: docs })
            }).then(function (res2) {
              if (!res2 || !res2.ok) throw new Error((res2 && res2.error) || "");
              lote.documentos = docs;
              mostrarPaso2(lote, "");
            });
          })
          .catch(function (e) {
            mostrarPaso2(lote, "El lote se publicó, pero el certificado no se pudo adjuntar" +
              (e && e.message ? " (" + e.message + ")" : "") + ". Súbelo abajo, en «Certificados y documentos».");
          });
        return;
      }
      mostrarPaso2(lote, "");
    });

    function mostrarPaso2(lote, avisoCert) {
      // Paso 2: la ficha del lote recién creado, con fotos y certificados.
      var paso2 = document.createElement("div");
      paso2.className = "redcafe-publicar-paso2";
      paso2.setAttribute("data-redcafe-propio", "1");
      var aviso = document.createElement("div");
      aviso.className = "redcafe-publicar-ok";
      aviso.innerHTML = '<p class="redcafe-pub-rotulo">Paso 2 de 2 · Fotos y certificados</p>' +
        '<h3>Tu lote «' + esc(lote.finca) + '» ya está publicado</h3>' +
        '<p>Añade fotos reales y, si los tienes, el certificado de calidad o el informe de catación: es lo primero que pide un comprador.</p>' +
        (lote.ubicacion_aproximada || lote.sin_ubicacion
          ? '<p class="redcafe-publicar-aviso-mapa">Indica la latitud y la longitud de tu finca en la ficha de abajo ' +
            'para que el lote salga en su sitio del mapa nacional.</p>'
          : '') +
        (avisoCert ? '<p class="redcafe-publicar-aviso-mapa">' + esc(avisoCert) + '</p>' : '') +
        '<p><a href="/marketplace/' + esc(encodeURIComponent(lote.id)) + '/">Ver en el Marketplace</a> · ' +
        '<a href="/panel/?ver=publicar">Publicar otro lote</a></p>';
      var lista = document.createElement("div");
      paso2.appendChild(aviso);
      paso2.appendChild(lista);
      caja.parentNode.replaceChild(paso2, caja);
      pintar(lista, [lote], [], true);
      paso2.scrollIntoView({ block: "start" });
    }
  }

  function montarPublicarCompleto() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    // Antes se exigía ?ver=publicar en la dirección. Dentro del panel se llega
    // a publicar pulsando un botón que NO cambia la dirección, así que ahí se
    // quedaba el formulario básico: es lo que el propietario vio como
    // «formulario incompleto». Ahora basta con que el formulario de la web
    // aparezca, venga de donde venga.
    if (/[?&]editar=/.test(location.search || "")) return;
    if (document.getElementById("redcafe-publicar-completo")) return;
    var titulo = Array.prototype.slice.call(document.querySelectorAll("main h2")).filter(function (h) {
      return /Publicar lote en el Marketplace/.test(h.textContent || "");
    })[0];
    var formReact = titulo && titulo.parentNode && titulo.parentNode.querySelector("form");
    if (!formReact) return;

    var caja = document.createElement("div");
    caja.id = "redcafe-publicar-completo";
    caja.setAttribute("data-redcafe-propio", "1");
    caja.innerHTML = formularioPublicarHtml();
    enlazarDerechos(caja);
    var tarjeta = caja.firstChild;
    marcarRequeridos(tarjeta, "verde");
    // Firma del formulario de React: si React lo repinta, la limpieza de
    // copias huérfanas (redcafe-v60-final.js) vuelve a colocar este detrás.
    caja.setAttribute("data-redcafe-copia", "1");
    caja.setAttribute("data-redcafe-original", formReact.tagName + "|" + String(formReact.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200));
    formReact.setAttribute("data-redcafe-oculto-react", "1");
    formReact.insertAdjacentElement("afterend", caja);

    if (!publicarScrollHecho && /[?&]ver=publicar(?:&|$)/.test(location.search || "")) {
      publicarScrollHecho = true;
      // El panel sigue montando bloques por encima después de este punto y la
      // página volvía arriba: se repite tres veces y se deja de insistir en
      // cuanto el usuario se desplaza por su cuenta.
      var usuarioMovio = false;
      var marcarMovimiento = function () { usuarioMovio = true; };
      ["wheel", "touchstart", "keydown"].forEach(function (t) {
        window.addEventListener(t, marcarMovimiento, { once: true, passive: true });
      });
      [80, 900, 2000].forEach(function (ms) {
        setTimeout(function () {
          if (usuarioMovio || !document.body.contains(caja)) return;
          try {
            var y = caja.getBoundingClientRect().top + window.pageYOffset - 90;
            window.scrollTo(0, Math.max(0, y));
          } catch (e) {}
        }, ms);
      });
    }

    caja.addEventListener("change", function (ev) {
      var el = ev.target;
      if (el && el.name === "redcafe-publicar-categoria") {
        tarjeta.setAttribute("data-categoria", el.value);
        marcarRequeridos(tarjeta, el.value);
      }
      // Cambiar el estado a semilla o plántula cambia los campos: se piden
      // precio y cantidad por planta, no por saco.
      if (el && el.getAttribute && el.getAttribute("data-campo") === "estado") {
        marcarRequeridos(tarjeta, tarjeta.getAttribute("data-categoria") || "verde");
      }
    });
    caja.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest(".redcafe-publicar-enviar")) { enviarPublicacion(tarjeta, formReact); return; }
      if (t.closest(".redcafe-publicar-usar-rapido")) {
        formReact.removeAttribute("data-redcafe-oculto-react");
        caja.hidden = true;
        return;
      }
      if (t.closest(".redcafe-publicar-gps")) {
        var est = tarjeta.querySelector(".redcafe-pub-acciones .redcafe-pub-estado");
        if (!navigator.geolocation) { est.textContent = "Tu navegador no da la ubicación."; return; }
        est.textContent = "Buscando tu ubicación…";
        navigator.geolocation.getCurrentPosition(function (pos) {
          tarjeta.querySelector('[data-campo="lat"]').value = pos.coords.latitude.toFixed(5);
          tarjeta.querySelector('[data-campo="lng"]').value = pos.coords.longitude.toFixed(5);
          est.textContent = "Ubicación añadida.";
        }, function () { est.textContent = "No se pudo obtener la ubicación. Escríbela a mano o déjala vacía."; },
        { timeout: 10000 });
      }
    });
  }

  /* ── Publicar servicio con «Quién puede verlo» ─────────────────────────
     El formulario de React de /panel/?ver=publicar_servicio pide los datos
     (nombre, categoría, provincia, cobertura, precio, unidad, descripción e
     imágenes) pero envía a la API un payload FIJO sin visibilidad, y la API
     ya no hereda la del perfil del miembro (20260923): sin el campo, todo
     saldría público aunque el miembro quisiera «Solo miembros de la Red».

     Igual que con el lote: se oculta el formulario de React y se pinta uno
     propio con el campo «Quién puede verlo» y su aviso bajo él. */
  var SERVICIO_CATEGORIAS = [
    ["transporte", "Transporte"], ["catacion", "Catación"], ["asesoria", "Asesoría"],
    ["pilado", "Pilado / beneficio"], ["insumos", "Equipos e insumos"],
    ["capacitacion", "Capacitación"], ["exportacion", "Exportación"], ["otro", "Otro servicio"]
  ];
  var AVISO_VISIBILIDAD = "Solo lo verán quienes tengan cuenta. Tu servicio no aparecerá en búsquedas ni para visitantes.";

  function formularioServicioPublicarHtml() {
    var categorias = SERVICIO_CATEGORIAS.map(function (c) {
      return '<option value="' + esc(c[0]) + '">' + esc(c[1]) + '</option>';
    }).join("");
    var provincias = provinciasEcuador().map(function (p) {
      return '<option value="' + esc(p) + '">' + (p === "" ? "— sin indicar —" : esc(p)) + '</option>';
    }).join("");
    return '' +
      '<div class="redcafe-pub-card redcafe-publicar redcafe-publicar-servicio">' +
        '<label class="redcafe-derechos"><input type="checkbox" name="acepta_derechos" required> Declaro que tengo los derechos sobre este contenido y asumo la responsabilidad ante cualquier reclamo de terceros.</label>' +
        '<p class="redcafe-pub-rotulo">Publicar un servicio</p>' +
        '<div class="redcafe-pub-grid">' +
          '<label class="redcafe-pub-label"><span>Nombre del servicio *</span>' +
            '<input type="text" class="redcafe-pub-input" data-campo="titulo" placeholder="Nombre del servicio"></label>' +
          '<label class="redcafe-pub-label"><span>Categoría</span>' +
            '<select class="redcafe-pub-input" data-campo="categoria">' + categorias + '</select></label>' +
          '<label class="redcafe-pub-label"><span>Provincia base</span>' +
            '<select class="redcafe-pub-input" data-campo="provincia">' + provincias + '</select></label>' +
          '<label class="redcafe-pub-label"><span>Cobertura</span>' +
            '<input type="text" class="redcafe-pub-input" data-campo="cobertura" placeholder="Ej. Loja y Zamora, nacional"></label>' +
          '<label class="redcafe-pub-label"><span>Precio referencial (USD)</span>' +
            '<input type="number" min="0" step="any" class="redcafe-pub-input" data-campo="precio"></label>' +
          '<label class="redcafe-pub-label"><span>Unidad</span>' +
            '<input type="text" class="redcafe-pub-input" data-campo="unidad" placeholder="viaje, muestra, hora, saco…"></label>' +
          '<label class="redcafe-pub-label redcafe-pub-label-larga"><span>Descripción *</span>' +
            '<textarea rows="4" class="redcafe-pub-input" data-campo="descripcion" ' +
              'placeholder="Describe qué incluye, condiciones, tiempos y tipo de cliente al que atiendes."></textarea></label>' +
        '</div>' +
        '<div class="redcafe-foto-bloque">' +
          '<p class="redcafe-doc-titulo">Imágenes del servicio (opcional)</p>' +
          '<p class="redcafe-pub-ayuda">JPG o PNG, hasta 2 MB, máximo 6. Muestra tu trabajo: el camión, el laboratorio, un curso tuyo.</p>' +
          '<div class="redcafe-doc-alta">' +
            '<input type="file" class="redcafe-foto-archivo" accept=".jpg,.jpeg,.png,image/jpeg,image/png,image/webp" multiple>' +
            '<span class="redcafe-pub-estado redcafe-foto-estado" role="status" aria-live="polite"></span>' +
          '</div>' +
        '</div>' +
        '<label class="redcafe-pub-label redcafe-pub-visibilidad"><span>Quién puede verlo</span>' +
          '<select class="redcafe-pub-input redcafe-visibilidad-select">' +
            '<option value="publico">Todo el mundo (recomendado)</option>' +
            '<option value="registrados">Solo miembros de la Red</option>' +
          '</select>' +
          '<em class="redcafe-pub-ayuda redcafe-visibilidad-aviso" hidden>' + esc(AVISO_VISIBILIDAD) + '</em>' +
        '</label>' +
        '<div class="redcafe-pub-acciones">' +
          '<button type="button" disabled data-derechos-enviar class="redcafe-pub-guardar redcafe-publicar-enviar">Publicar servicio</button>' +
          '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>' +
        '</div>' +
      '</div>';
  }

  function subirImagenesServicio(archivos) {
    var urls = [];
    function siguiente(i) {
      if (i >= archivos.length) return Promise.resolve(urls);
      var fd = new FormData();
    fd.append("acepta_derechos", "true");
      fd.append("archivo", archivos[i]);
      fd.append("context", "marketplace");
      return fetch("/api/uploads.php?action=image", { method: "POST", credentials: "include", body: fd })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          var url = res && res.ok && res.data && (res.data.url || res.data.imagen || res.data.ruta);
          if (!url) throw new Error((res && res.error) || "No se pudo subir la imagen.");
          urls.push(url);
          return siguiente(i + 1);
        });
    }
    return siguiente(0);
  }

  function enviarServicioPublicacion(caja) {
    if (!caja.querySelector('[name="acepta_derechos"]').checked) return;
    var estado = caja.querySelector(".redcafe-pub-acciones .redcafe-pub-estado");
    var boton = caja.querySelector(".redcafe-publicar-enviar");
    var cuerpo = { visibilidad: "publico", acepta_derechos: true };
    Array.prototype.slice.call(caja.querySelectorAll("[data-campo]")).forEach(function (el) {
      var clave = el.getAttribute("data-campo");
      var valor = String(el.value).trim();
      if (valor === "") return;
      cuerpo[clave] = el.type === "number" ? Number(valor) : valor;
    });
    var visSel = caja.querySelector(".redcafe-visibilidad-select");
    if (visSel) cuerpo.visibilidad = visSel.value;

    if (!cuerpo.titulo || !cuerpo.descripcion) {
      estado.textContent = "Título y descripción son obligatorios.";
      estado.className = "redcafe-pub-estado is-error";
      return;
    }
    if (cuerpo.titulo.length > 90) {
      estado.textContent = "Título demasiado largo: máximo 90 caracteres.";
      estado.className = "redcafe-pub-estado is-error";
      return;
    }
    if (cuerpo.descripcion.length > 600) {
      estado.textContent = "Descripción demasiado larga: máximo 600 caracteres.";
      estado.className = "redcafe-pub-estado is-error";
      return;
    }
    var inputFoto = caja.querySelector(".redcafe-foto-archivo");
    var archivos = inputFoto && inputFoto.files ? Array.prototype.slice.call(inputFoto.files) : [];
    if (archivos.length > 6) {
      estado.textContent = "Máximo seis imágenes por servicio.";
      estado.className = "redcafe-pub-estado is-error";
      return;
    }
    for (var i = 0; i < archivos.length; i++) {
      if (archivos[i].size > 2 * 1024 * 1024) {
        estado.textContent = "«" + archivos[i].name + "» supera los 2 MB.";
        estado.className = "redcafe-pub-estado is-error";
        return;
      }
    }

    boton.disabled = true;
    estado.textContent = "Publicando…";
    estado.className = "redcafe-pub-estado";
    subirImagenesServicio(archivos)
      .then(function (urls) {
        cuerpo.imagenes = urls;
        return json("/api/marketplace-servicios.php?action=publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo)
        });
      })
      .then(function (res) {
        boton.disabled = !boton.closest(".redcafe-pub-card").querySelector('[name="acepta_derechos"]').checked;
        var servicio = res && res.ok && res.data && res.data.servicio;
        if (!servicio) {
          estado.textContent = (res && res.error) || "No se pudo publicar. Inténtalo de nuevo.";
          estado.className = "redcafe-pub-estado is-error";
          return;
        }
        // Éxito: el formulario es nuestro, se puede reemplazar sin tocar React.
        caja.innerHTML =
          '<div class="redcafe-publicar-ok" data-redcafe-propio="1">' +
        '<p class="redcafe-pub-rotulo">Publicar un servicio</p>' +
            '<h3>Tu servicio «' + esc(servicio.titulo) + '» ya está publicado' +
              (servicio.visibilidad === "registrados" ? " y lo ven los miembros" : "") + '</h3>' +
            '<p>' + (servicio.visibilidad === "registrados"
              ? "Está marcado como «Solo miembros de la Red»: solo lo verán quienes tengan cuenta."
              : "Está en abierto: lo verá todo el mundo.") + '</p>' +
            '<p><a href="/marketplace/">Ver en el Marketplace</a> · ' +
            '<a href="/panel/?ver=publicar_servicio">Publicar otro servicio</a></p>' +
          '</div>';
      })
      .catch(function (e) {
        boton.disabled = !boton.closest(".redcafe-pub-card").querySelector('[name="acepta_derechos"]').checked;
        estado.textContent = (e && e.message) || "No se pudo publicar. Inténtalo de nuevo.";
        estado.className = "redcafe-pub-estado is-error";
      });
  }

  function montarPublicarServicio() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    if (/[?&]editar=/.test(location.search || "")) return;
    if (document.getElementById("redcafe-publicar-servicio-completo")) return;
    var titulo = Array.prototype.slice.call(document.querySelectorAll("main h2")).filter(function (h) {
      return /Publicar servicio en el Marketplace/.test(h.textContent || "");
    })[0];
    var formReact = titulo && titulo.parentNode && titulo.parentNode.querySelector("form");
    if (!formReact) return;

    var caja = document.createElement("div");
    caja.id = "redcafe-publicar-servicio-completo";
    caja.setAttribute("data-redcafe-propio", "1");
    caja.innerHTML = formularioServicioPublicarHtml();
    enlazarDerechos(caja);
    caja.setAttribute("data-redcafe-copia", "1");
    caja.setAttribute("data-redcafe-original", formReact.tagName + "|" + String(formReact.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200));
    formReact.setAttribute("data-redcafe-oculto-react", "1");
    formReact.insertAdjacentElement("afterend", caja);

    caja.addEventListener("change", function (ev) {
      var el = ev.target;
      if (!el || el.className.indexOf("redcafe-visibilidad-select") === -1) return;
      var aviso = caja.querySelector(".redcafe-visibilidad-aviso");
      if (aviso) aviso.hidden = el.value !== "registrados";
    });
    caja.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t && t.closest && t.closest(".redcafe-publicar-enviar")) {
        enviarServicioPublicacion(caja.firstChild);
      }
    });
  }

  function programarPublicarCompleto() {
    // Intentos CONTADOS: React pinta las pestañas «publicar» de forma diferida.
    [800, 1800, 3500, 6000, 9000].forEach(function (ms) {
      setTimeout(function () {
        if (intentosPublicar >= 5) return;
        intentosPublicar++;
        montarPublicarCompleto();
        montarPublicarServicio();
      }, ms);
    });
    vigilarPublicar();
    // Y por si <body> aún no estaba listo cuando arrancó el panel.
    [1200, 4000].forEach(function (ms) { setTimeout(vigilarPublicar, ms); });
  }

  // El panel cambia de pestaña sin recargar. Se vigila el <main> para montar el
  // formulario cuando aparezca el de la web, y para volver a montarlo si React
  // lo rehace. Sin bucles: solo actúa si el formulario propio NO está puesto, y
  // el observador no reacciona a los atributos que pone esta capa.
  var observadorPublicar = null;
  var vecesVigilante = 0;
  function vigilarPublicar() {
    if (observadorPublicar || location.pathname.indexOf("/panel") !== 0) return;
    if (!window.MutationObserver || !document.body) return;
    // Contador PROPIO: el de los intentos programados ya está gastado cuando el
    // usuario pulsa la pestaña, y con él compartido el vigilante no montaba
    // nada. Se observa <body> (no <main>, que React rehace) y se corta a las
    // 60 comprobaciones, que no puede convertirse en bucle porque montar el
    // formulario no dispara peticiones.
    observadorPublicar = new MutationObserver(function () {
      if (vecesVigilante >= 60) return;
      vecesVigilante++;
      try { montarPublicarCompleto(); } catch (e) {}
      try { montarPublicarServicio(); } catch (e) {}
    });
    try { observadorPublicar.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  }

  function identidad(usuario) {
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-identidad")) return;
    var bloque = document.createElement("section");
    bloque.id = "redcafe-identidad";
    bloque.className = "redcafe-pub-seccion";
    bloque.setAttribute("data-redcafe-propio", "1");
    main.appendChild(bloque);
    function cargarIdentidad() {
      json("/api/identidad.php?action=estado").then(function (res) {
        if (!res || !res.ok) { bloque.textContent = (res && res.error) || "No se pudo consultar la identidad."; return; }
        var solicitud = res.data.solicitud;
        bloque.innerHTML = '<div class="redcafe-pub-wrap"><h3>Verificar mi identidad</h3><p>' +
          esc(usuario.verificado ? "Perfil verificado" : solicitud ? solicitud.estado : "Sin solicitud") +
          (solicitud && solicitud.motivo ? ": " + esc(solicitud.motivo) : "") + '</p>' +
          (!usuario.verificado && (!solicitud || solicitud.estado === "rechazada") ?
            '<form><p><label>Documento de identidad (máximo 5 MB) <input required type="file" name="documento" accept=".jpg,.jpeg,.png,.pdf"></label></p>' +
            '<p><label>Selfie sosteniendo el documento (máximo 5 MB) <input required type="file" name="selfie" accept=".jpg,.jpeg,.png"></label></p>' +
            '<p>Tus documentos se guardan en privado, solo los ve la administración y se borran tras la revisión.</p>' +
            '<button class="redcafe-pub-guardar" type="submit">Enviar solicitud</button></form>' : "") +
          '<p role="status" aria-live="polite"></p></div>';
        var form = bloque.querySelector("form");
        if (form) form.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var boton = form.querySelector("button"), estado = bloque.querySelector('[role="status"]');
          boton.disabled = true;
          estado.textContent = "Enviando…";
          json("/api/identidad.php?action=solicitar", { method: "POST", body: new FormData(form) }).then(function (r) {
            if (r && r.ok) cargarIdentidad();
            else { boton.disabled = false; estado.textContent = (r && r.error) || "No se pudo enviar."; }
          });
        });
      });
    }
    cargarIdentidad();
  }

  function iniciar() {
    if (!window.__redcafeReactListo || !window.__redcafeReactListo()) { setTimeout(iniciar, 200); return; }
    if (location.pathname.indexOf("/panel") !== 0) return;
    json("/api/auth.php?action=me").then(function (res) {
      var usuario = res && res.ok && res.data && res.data.user;
      if (!usuario || !usuario.id) return;
      if (!window.__redcafeReactListo()) { setTimeout(iniciar, 200); return; }
      identidad(usuario);
      montar(usuario);
      intentosPublicar = 0;
      vecesVigilante = 0;
      programarPublicarCompleto();
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
