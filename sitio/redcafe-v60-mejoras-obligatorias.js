(function () {

  function text(el) {
    return (el && el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function htmlEscape(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char];
    });
  }

  function addSecondaryMenu() {
    // Cuando React hidrató, su propio Navbar.tsx YA trae el desplegable
    // "Más" (con los mismos enlaces) dentro de su <nav>. Insertar aquí
    // duplicaba el desplegable Y, peor, escribía un hijo nuevo dentro de un
    // nodo que React sigue reconciliando — el mismo patrón que en otras
    // partes del proyecto termina en "NotFoundError: removeChild". Mismo
    // criterio ya usado en redcafe-menu.js / redcafe-fusion.js.
    if (document.querySelector('script[src*="/_next/static/chunks/main-app-"]')) return;
    document.querySelectorAll("header nav").forEach(function (nav) {
      if (nav.querySelector('[data-redcafe-secondary-menu="1"]')) return;
      // El menú "Más" ya lo construye redcafe-v60-final.js (.redcafe-more).
      // Sin esta guarda la cabecera mostraba dos desplegables "Más" solapados.
      if (nav.querySelector(".redcafe-more") || document.querySelector("header .redcafe-more")) return;
      var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
      var login = links.find(function (a) { return text(a) === "Entrar"; });
      var details = document.createElement("details");
      details.className = "group relative";
      details.setAttribute("data-redcafe-secondary-menu", "1");
      details.innerHTML = '<summary class="inline-flex min-h-10 cursor-pointer list-none items-center gap-1 whitespace-nowrap transition-colors hover:text-acento-claro">Más <span class="text-[10px] text-crema/55">▾</span></summary><div class="absolute right-0 top-full z-50 mt-2 grid min-w-56 gap-1 border border-crema/15 bg-cafe p-2 shadow-xl"><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/marketplace/#mapa">Mapa / Ubicaciones</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/noticias/">Noticias</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/recetas/">Recetas</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/bar/">Bar / Cafeterías</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/laboratorio/">Laboratorio</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/servicios/calculadora/">Calculadora</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/servicios/eudr/">Trazabilidad / EUDR</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/servicios/factura/">Facturación</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/terminos-y-condiciones/">Términos</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/politica-de-privacidad/">Privacidad</a></div>';
      if (login) nav.insertBefore(details, login);
      else nav.appendChild(details);
    });
  }

  function removeHomeRedundantSections() {
    if (location.pathname !== "/" && location.pathname !== "/index.html") return;
    Array.prototype.slice.call(document.querySelectorAll("main section")).forEach(function (section) {
      var content = text(section);
      if (
        content.indexOf("Únete como miembro de la Red") !== -1 ||
        content.indexOf("Herramientas gratis para manejar mejor tu negocio cafetero") !== -1
      ) {
        // No se borra: retirar un nodo que pintó React es justo lo que rompe su
        // reconciliación y acaba en «Application error». Se oculta con el
        // atributo que ya tiene su regla en la hoja de estilos.
        section.setAttribute("data-redcafe-oculto", "1");
      }
    });
  }


  /* Copias propias y repintados de React. Para no escribir en un nodo de
     React se oculta el original y se pinta al lado una copia. Pero cuando
     React repinta (la barra de precio cada 10 minutos, una hidratación
     fallida, un cambio de pestaña del panel) crea un nodo nuevo sin la marca:
     la copia vieja quedaba huérfana y visible y la siguiente pasada añadía
     otra. «Fuente» llegó a salir cuatro veces en el panel. Cada copia guarda
     la firma de su original; si ya no va detrás de él, se busca en el mismo
     contenedor el nodo nuevo con esa firma, se oculta y la copia pasa detrás.
     Si no aparece, la copia sobra y se retira (es nuestra, no de React).
     Esta misma función está en redcafe-v60-final.js,
     redcafe-v60-mejoras-obligatorias.js y redcafe-conversion.js. */
  function firmaNodo(el) {
    return el.tagName + "|" + String(el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200);
  }
  function marcarCopia(copia, original) {
    copia.setAttribute("data-redcafe-copia", "1");
    copia.setAttribute("data-redcafe-original", firmaNodo(original));
  }
  function limpiarCopiasHuerfanas() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-redcafe-copia="1"]'), function (copia) {
      var padre = copia.parentNode;
      if (!padre) return;
      var previo = copia.previousElementSibling;
      if (previo && previo.getAttribute("data-redcafe-oculto-react") === "1") return;
      var firma = copia.getAttribute("data-redcafe-original") || "";
      var nuevo = null;
      if (firma) {
        Array.prototype.some.call(padre.children, function (h) {
          if (h === copia || h.hasAttribute("data-redcafe-propio")) return false;
          if (h.getAttribute("data-redcafe-oculto-react") === "1") return false;
          if (firmaNodo(h) !== firma) return false;
          nuevo = h;
          return true;
        });
      }
      if (nuevo) {
        nuevo.setAttribute("data-redcafe-oculto-react", "1");
        nuevo.insertAdjacentElement("afterend", copia);
      } else {
        padre.removeChild(copia);
      }
    });
  }

  function nodoPropioSeguro(nodo) {
    if (nodo.closest('[data-redcafe-propio="1"]')) return nodo;
    var siguiente = nodo.nextElementSibling;
    if (nodo.getAttribute("data-redcafe-oculto-react") === "1" && siguiente && siguiente.getAttribute("data-redcafe-propio") === "1") return siguiente;
    var copia = nodo.cloneNode(true);
    copia.removeAttribute("id");
    copia.querySelectorAll("[id]").forEach(function (hijo) { hijo.removeAttribute("id"); });
    copia.removeAttribute("data-redcafe-oculto-react");
    copia.setAttribute("data-redcafe-propio", "1");
    marcarCopia(copia, nodo);
    nodo.setAttribute("data-redcafe-oculto-react", "1");
    nodo.insertAdjacentElement("afterend", copia);
    return copia;
  }

  function patchPaymentInstructions() {
    if (location.pathname.indexOf("/servicios/contratar") !== 0) return;

    document.querySelectorAll('a[href="/afiliate"], a[href="/afiliate/"]').forEach(function (link) {
      if (text(link).indexOf("Iniciar sesión") !== -1) link.setAttribute("href", "/login/");
    });

    Array.prototype.slice.call(document.querySelectorAll("section, div")).forEach(function (box) {
      if (text(box).indexOf("Instrucciones de pago") === -1) return;
      actualizarListaPago(precioServicioTexto() || "el valor indicado");
    });

    Array.prototype.slice.call(document.querySelectorAll("a")).forEach(function (link) {
      if (text(link).indexOf("Enviar comprobante por WhatsApp") !== -1) {
        if (link.getAttribute("data-redcafe-oculto-react") === "1") return;
        link = nodoPropioSeguro(link);
        link.childNodes.forEach(function (node) {
          if (node.nodeType === 3 && node.nodeValue.trim()) node.nodeValue = "Solicitar datos de pago por WhatsApp";
        });
        if (text(link).indexOf("Enviar comprobante") !== -1) {
          link.textContent = "Solicitar datos de pago por WhatsApp";
        }
      }
    });
  }


  function marketplaceApi(path) {
    return path;
  }






  function loadServiciosCatalogo() {
    if (window.__redcafeServiciosCatalogoPromise) return window.__redcafeServiciosCatalogoPromise;
    window.__redcafeServiciosCatalogoPromise = fetch("/api/servicios.php?action=list&_=" + Date.now(), { credentials: "include", cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json || !json.ok) return [];
        if (json.data && Array.isArray(json.data.servicios)) return json.data.servicios;
        if (Array.isArray(json.servicios)) return json.servicios;
        return [];
      })
      .catch(function () { return []; });
    return window.__redcafeServiciosCatalogoPromise;
  }

  function servicioContratarId() {
    try { return new URLSearchParams(location.search || "").get("servicio") || ""; }
    catch (e) { return ""; }
  }

  function precioServicioTexto() {
    var main = document.querySelector("main");
    if (!main) return "";
    var candidatos = Array.prototype.slice.call(main.querySelectorAll("p,span,strong,div,h2,h3")).filter(function (el) {
      var t = text(el);
      return /\$\s*\d/.test(t) && /(?:DESDE|POR|USD|\$)/i.test(t) && t.indexOf("%") === -1 && t.length < 120;
    });
    for (var i = 0; i < candidatos.length; i++) {
      var m = text(candidatos[i]).match(/\$\s*\d+(?:[.,]\d{1,2})?/);
      if (m) return m[0].replace(/\s+/g, "");
    }
    return "";
  }

  function actualizarListaPago(precio) {
    if (location.pathname.indexOf("/servicios/contratar") !== 0) return;
    Array.prototype.slice.call(document.querySelectorAll("section, div")).forEach(function (box) {
      if (text(box).indexOf("Instrucciones de pago") === -1) return;
      var list = box.querySelector("ol");
      if (!list) return;
      var serviceTitle = text(document.querySelector("h1")) || "este servicio";
      var servicePrice = precio || precioServicioTexto() || "el valor indicado";
      list = nodoPropioSeguro(list);
      if (list.getAttribute("data-redcafe-pago-precio") === servicePrice) return;
      list.setAttribute("data-redcafe-pago-whatsapp", "1");
      list.setAttribute("data-redcafe-pago-precio", servicePrice);
      list.innerHTML = '<li><strong>1.</strong> Solicita por WhatsApp los datos de pago actualizados para <strong>' + htmlEscape(serviceTitle) + '</strong>.</li><li><strong>2.</strong> Cuando el asesor confirme el método de pago, realiza el pago por el canal indicado.</li><li><strong>3.</strong> Guarda el comprobante e ingresa la referencia abajo para registrar tu solicitud por ' + htmlEscape(servicePrice) + '.</li>';
    });
  }

  function patchContratarServicePrice() {
    if (location.pathname.indexOf("/servicios/contratar") !== 0) return;
    var id = servicioContratarId();
    if (!id) return;
    loadServiciosCatalogo().then(function (servicios) {
      var servicio = servicios.find(function (s) { return String(s.id || "") === id; });
      if (!servicio) return;
      var precio = Number(servicio.precio);
      if (!isFinite(precio) || precio <= 0) return;
      var precioTxt = "$" + (Math.round(precio * 100) / 100).toString().replace(/\.00$/, "");
      var main = document.querySelector("main");
      if (!main) return;
      Array.prototype.slice.call(main.querySelectorAll("p,span,strong,div,h2,h3")).forEach(function (el) {
        if (el.closest('[data-redcafe-propio="1"]')) return;
        if (el.children.length > 2) return;
        var t = text(el);
        if (!/\$\s*\d/.test(t) || t.indexOf("%") !== -1 || t.length > 120) return;
        var copia = nodoPropioSeguro(el);
        copia.textContent = t.replace(/\$\s*\d+(?:[.,]\d{1,2})?/g, precioTxt);
      });
      actualizarListaPago(precioTxt);
    });
  }

  function patchChatEnterToSend() {
    if (location.pathname.indexOf("/chat") !== 0 || window.__redcafeChatEnterToSend) return;
    window.__redcafeChatEnterToSend = true;
    document.addEventListener("keydown", function (ev) {
      if ((ev.key !== "Enter" && ev.keyCode !== 13) || ev.shiftKey || ev.isComposing) return;
      var target = ev.target;
      if (!target || !target.matches || !target.matches('textarea,input[type="text"],input:not([type])')) return;
      var etiqueta = ((target.getAttribute("placeholder") || "") + " " + (target.getAttribute("aria-label") || "")).toLowerCase();
      if (etiqueta.indexOf("mensaje") === -1 && etiqueta.indexOf("respuesta") === -1) return;
      var form = target.closest("form") || target.closest("section") || target.closest("main") || document;
      var botones = Array.prototype.slice.call(form.querySelectorAll("button"));
      var enviar = botones.find(function (b) { return /^enviar$/i.test(text(b)); });
      if (!enviar || enviar.disabled) return;
      ev.preventDefault();
      enviar.click();
    });
  }


  function noticeAfter(el, message, ok) {
    var old = el.parentElement && el.parentElement.querySelector('[data-redcafe-service-notice="1"]');
    if (old) old.remove();
    var p = document.createElement("p");
    p.setAttribute("data-redcafe-service-notice", "1");
    p.className = "mt-2 text-xs font-semibold " + (ok ? "text-hoja" : "text-cereza");
    p.textContent = message;
    el.insertAdjacentElement("afterend", p);
  }

  // El dueño necesita saber que alguien preguntó por su lote: es lo que le
  // permite confirmar si sigue disponible. Se avisa a la API antes de que el
  // navegador se vaya a WhatsApp; keepalive evita que la petición muera al
  // cambiar de pestaña.
  function registrarContacto(id) {
    if (!id) return;
    try {
      fetch("/api/lotes.php?action=contacto", {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
      }).catch(function () {});
    } catch (e) {}
  }

  document.addEventListener("click", function (ev) {
    var enlace = ev.target && ev.target.closest ? ev.target.closest(".redcafe-contactar") : null;
    if (!enlace) return;
    registrarContacto(enlace.getAttribute("data-lote"));
  }, true);

  /* Solicitud interna de un lote — mismo endpoint que usa la ficha de React
     (api/pedidos.php?action=create), para que el pedido quede registrado en
     la Red y visible en la bandeja del productor y en «Mis pedidos» del
     comprador, sin depender de que el productor haya declarado WhatsApp o
     correo. Mismo patrón de manejo de 401 que ya usa la solicitud de
     servicios (patchMarketplaceServiceRequests). */
  document.addEventListener("click", function (ev) {
    var boton = ev.target && ev.target.closest ? ev.target.closest(".redcafe-solicitar-lote") : null;
    if (!boton || boton.getAttribute("data-redcafe-busy") === "1") return;
    ev.preventDefault();
    boton.setAttribute("data-redcafe-busy", "1");
    var textoOriginal = boton.textContent;
    boton.textContent = "Enviando...";
    var precio = Number(boton.getAttribute("data-precio") || 0);
    // Timeout de seguridad: una respuesta que nunca llega (red intermitente,
    // proxy que corta la conexión sin avisar) no debe dejar el botón en
    // "Enviando..." para siempre. A los 15 s se cancela y se avisa; si la
    // respuesta real llega después, `catch` de un fetch ya abortado no
    // reescribe nada porque el guard de "data-redcafe-busy" ya se liberó.
    var controlador = typeof AbortController === "function" ? new AbortController() : null;
    var venceEn = setTimeout(function () { if (controlador) controlador.abort(); }, 15000);
    fetch(marketplaceApi("/api/pedidos.php?action=create"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loteId: boton.getAttribute("data-lote") || "",
        finca: boton.getAttribute("data-finca") || "",
        productor: boton.getAttribute("data-productor") || "",
        sacos: 1,
        total: precio
      }),
      signal: controlador ? controlador.signal : undefined
    }).then(function (res) {
      clearTimeout(venceEn);
      if (res.status === 401) { location.href = "/login/"; return null; }
      return res.json();
    }).then(function (json) {
      if (!json) return;
      if (!json.ok) throw new Error((json.error) || "No se pudo registrar la solicitud.");
      boton.textContent = "Solicitud enviada";
      noticeAfter(boton, "Pedido registrado. Lo verás en tu panel, en Mis pedidos.", true);
    }).catch(function (err) {
      clearTimeout(venceEn);
      boton.textContent = textoOriginal || "Solicitar este lote";
      var mensaje = (err && err.name === "AbortError")
        ? "La solicitud tardó demasiado. Revisa tu conexión e inténtalo de nuevo."
        : (err.message || "No se pudo registrar la solicitud.");
      noticeAfter(boton, mensaje, false);
    }).finally(function () {
      boton.removeAttribute("data-redcafe-busy");
    });
  }, true);



  function collapseHomeProfiles() {
    if (location.pathname !== "/" && location.pathname !== "/index.html") return;
    if (document.querySelector('[data-redcafe-profile-collapse="1"]')) return;
    var lead = Array.prototype.slice.call(document.querySelectorAll("main p")).find(function (p) {
      return text(p).indexOf("Crea tu perfil según tu actividad") !== -1 && text(p).indexOf("publicar, cotizar") !== -1;
    });
    if (!lead) return;
    var section = lead.closest("section");
    if (!section || section.querySelector("details")) return;
    var candidates = Array.prototype.slice.call(section.children).filter(function (el) {
      if (el.contains(lead) || lead.contains(el)) return false;
      var body = text(el);
      return body.indexOf("Productor") !== -1 && body.indexOf("Comprador") !== -1 && body.indexOf("Barista") !== -1;
    });
    var profileBlock = candidates[candidates.length - 1] || Array.prototype.slice.call(section.querySelectorAll("div")).find(function (el) {
      var body = text(el);
      return body.indexOf("Productor") !== -1 && body.indexOf("Tostador") !== -1 && body.indexOf("Amante del Café") !== -1;
    });
    if (!profileBlock) return;

    /* Plegar sin mover nada
       ----------------------------------------------------------------
       Antes se creaba un <details> y se metía dentro el bloque de perfiles
       con appendChild. Ese bloque lo pinta React: reparentarlo es justo lo
       que rompe su reconciliación y acaba en «Application error». Aquí no se
       mueve: se le pone un atributo de estado y el CSS decide si se ve. Un
       atributo que React no conoce no le estorba, y el botón es nuestro. */
    profileBlock.setAttribute("data-redcafe-perfiles", "cerrado");

    var boton = document.createElement("button");
    boton.type = "button";
    boton.className = "redcafe-profile-collapse";
    boton.setAttribute("data-redcafe-profile-collapse", "1");
    boton.setAttribute("data-redcafe-propio", "1");
    boton.setAttribute("aria-expanded", "false");
    boton.textContent = "Ver perfiles de la Red";
    boton.addEventListener("click", function () {
      var abierto = profileBlock.getAttribute("data-redcafe-perfiles") === "abierto";
      profileBlock.setAttribute("data-redcafe-perfiles", abierto ? "cerrado" : "abierto");
      boton.setAttribute("aria-expanded", abierto ? "false" : "true");
      boton.textContent = abierto ? "Ver perfiles de la Red" : "Ocultar perfiles de la Red";
    });
    profileBlock.insertAdjacentElement("beforebegin", boton);
  }

  // --- Mapa nacional: corrige el mapa Leaflet inicializado con ancho 0 ---
  // Al hidratar, el contenedor aun no tiene ancho y Leaflet calcula zoom 0
  // (una sola tile del mundo). Se re-mide y se encuadra Ecuador.
  function findLeafletMap(container) {
    var key = Object.keys(container).find(function (k) { return k.indexOf("__reactFiber") === 0; });
    if (!key) return null;
    var seen = new Set();
    var stack = [[container[key], 0]];
    var props = ["stateNode", "memoizedState", "memoizedProps", "child", "sibling", "return", "next", "value", "current", "_map"];
    while (stack.length) {
      var pair = stack.pop();
      var node = pair[0];
      var depth = pair[1];
      if (!node || depth > 40 || typeof node !== "object" || seen.has(node)) continue;
      seen.add(node);
      if (node._container === container && typeof node.invalidateSize === "function") return node;
      for (var i = 0; i < props.length; i++) { if (node[props[i]]) stack.push([node[props[i]], depth + 1]); }
    }
    return null;
  }

  function fixNationalMap() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    var container = document.querySelector(".leaflet-container");
    if (!container || container.getAttribute("data-redcafe-map-fixed") === "1") return;
    if (!container.getBoundingClientRect().width) return;
    var map = findLeafletMap(container);
    if (!map) return;
    container.setAttribute("data-redcafe-map-fixed", "1");
    try {
      map.invalidateSize();
      if (map.getZoom() >= 5) return;
      var pts = [];
      map.eachLayer(function (layer) { if (layer && typeof layer.getLatLng === "function") pts.push(layer.getLatLng()); });
      if (pts.length > 1 && window.L && window.L.latLngBounds) {
        map.fitBounds(window.L.latLngBounds(pts).pad(0.2));
        if (map.getZoom() < 5) map.setView([-1.6, -78.6], 6);
      } else {
        map.setView([-1.6, -78.6], 6);
      }
    } catch (_) {
      container.removeAttribute("data-redcafe-map-fixed");
    }
  }


  // Ficha de /marketplace/<id>/: migrada a React (components/FichaLote.tsx).

  // Indicación junto al campo de fotos del lote. La foto de una web o de un
  // catálogo no sirve para vender café: el comprador necesita ver el grano
  // real, y una imagen que no corresponde al lote destruye la confianza.
  function notaFotosReales() {
    if (location.pathname.indexOf("/panel") !== 0 && location.pathname.indexOf("/afiliate") !== 0) return;
    Array.prototype.slice.call(document.querySelectorAll("label, p, span, h3, h4")).forEach(function (el) {
      if (el.querySelector("label, p, span, h3, h4")) return;
      if (text(el).indexOf("Fotos del lote") === -1) return;
      var host = el.parentElement || el;
      if (host.querySelector('[data-redcafe-nota-fotos="1"]')) return;
      var nota = document.createElement("p");
      nota.setAttribute("data-redcafe-nota-fotos", "1");
      nota.className = "redcafe-nota-fotos";
      nota.innerHTML =
        "<strong>Toma las fotos del café real que estás vendiendo.</strong> " +
        "Muestra el grano de este lote (pergamino, oro o cereza según corresponda), " +
        "el saco o empaque y, si puedes, la finca. Con luz de día y sin filtros. " +
        "No uses fotos de internet ni de otra cosecha: quien compra las compara con la muestra.";
      el.insertAdjacentElement("afterend", nota);
    });
  }

  function applyAll() {
    limpiarCopiasHuerfanas();
    addSecondaryMenu();
    removeHomeRedundantSections();
    patchPaymentInstructions();
    patchContratarServicePrice();
    patchChatEnterToSend();
    fixNationalMap();
    observarTamanoMapa();
    notaFotosReales();
    collapseHomeProfiles();
  }

  // El mapa lo monta React de forma diferida: se reintenta hasta encuadrarlo.
  // Si el mapa se monta dentro de un contenedor todavía sin ancho (pestaña
  // oculta, panel plegado), no se puede dimensionar: se espera a que lo tenga.
  function observarTamanoMapa() {
    if (!window.ResizeObserver || window.__redcafeMapObserver) return;
    var container = document.querySelector(".leaflet-container");
    if (!container) return;
    window.__redcafeMapObserver = new ResizeObserver(function () {
      var c = document.querySelector(".leaflet-container");
      if (c && c.getBoundingClientRect().width > 0 && c.getAttribute("data-redcafe-map-fixed") !== "1") {
        fixNationalMap();
      }
    });
    window.__redcafeMapObserver.observe(container);
  }


  function scheduleMapFix() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      fixNationalMap();
        var container = document.querySelector(".leaflet-container");
      if (tries > 30 || (container && container.getAttribute("data-redcafe-map-fixed") === "1" && container.getAttribute("data-redcafe-all-markers") === "1")) clearInterval(timer);
    }, 500);
    // Una sola suscripción a resize por sesión: scheduleMapFix se ejecuta cada
    // vez que se entra al marketplace, y antes dejaba un listener por visita.
    if (!window.__redcafeMapaResize) {
      window.__redcafeMapaResize = true;
      window.addEventListener("resize", function () {
        if (location.pathname.indexOf("/marketplace") !== 0) return;
        var container = document.querySelector(".leaflet-container");
        if (container) container.removeAttribute("data-redcafe-map-fixed");
        fixNationalMap();
      }, { passive: true });
    }
  }

  /* Vigilantes que se registran UNA sola vez
     ------------------------------------------------------------------
     start() se llama otra vez en cada navegación SPA, y antes registraba en
     cada llamada otro listener global de click y otro MutationObserver sobre
     todo el documento. Tras diez navegaciones había diez observadores, cada
     uno programando su propio applyAll: coste que crece con el rato que el
     usuario lleva en el sitio, y carreras entre pasadas simultáneas.
     Lo que sí debe repetirse en cada ruta es applyAll y el arreglo del mapa;
     los vigilantes no. */
  function vigilarUnaVez() {
    if (window.__redcafeV60Vigilando) return;
    window.__redcafeV60Vigilando = true;

    document.addEventListener("click", function (event) {
      if (event.target && event.target.closest && event.target.closest("#profile-selector")) {
        applyAll();
        setTimeout(applyAll, 80);
        setTimeout(applyAll, 250);
      }
    }, true);
    if (window.MutationObserver) {
      // El observador se desconecta mientras applyAll escribe en el DOM: sin esta
      // guarda, cada cambio propio volvía a disparar applyAll en bucle.
      var observer = new MutationObserver(function () {
        clearTimeout(window.__redcafeV60HotfixTimer);
        window.__redcafeV60HotfixTimer = setTimeout(function () {
          observer.disconnect();
          try { applyAll(); } finally { connect(); }
        }, 120);
      });
      function connect() {
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
      }
      connect();
    }
  }

  function start() {
    applyAll();
    scheduleMapFix();
    vigilarUnaVez();
  }

  function startWhenStable() {
    setTimeout(start, 2400);
  }

  if (document.readyState === "complete") startWhenStable();
  else window.addEventListener("load", startWhenStable, { once: true });

  // Next navega sin recargar. redcafe-ruta.js ya retiró lo de la ruta
  // anterior y borró las marcas de "ya hecho"; aquí se vuelve a montar el
  // marketplace según dónde estemos ahora.
  document.addEventListener("redcafe:ruta", function () {
    setTimeout(start, 1400);
  });
})();

/* enlaces-comunidad */
/* /marketplace/?ver=servicios|requerimientos|empleos abre esa pestaña (las
   novedades de la comunidad enlazan así a lo que anuncian). Las pestañas se
   montan tras cargar: se reintenta unos segundos. */
(function () {
  "use strict";
  if (!/^\/marketplace\/?$/.test(location.pathname)) return;
  var ver = new URLSearchParams(location.search).get("ver");
  var texto = { servicios: "Servicios", requerimientos: "Requerimientos", empleos: "Empleos" }[ver || ""];
  if (!texto) return;
  var intentos = 0;
  var reloj = setInterval(function () {
    intentos++;
    var b = Array.prototype.slice.call(document.querySelectorAll("main button")).find(function (x) {
      return (x.textContent || "").trim() === texto;
    });
    if (b) { clearInterval(reloj); b.click(); b.scrollIntoView({ block: "center" }); }
    else if (intentos > 25) clearInterval(reloj);
  }, 300);
})();
