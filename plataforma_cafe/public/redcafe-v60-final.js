(function () {
  "use strict";

  var VERSION = "20260930e";
  var WAPP = "593968641376";
  var path = normalizePath(location.pathname);
  var homeAuthChecking = false;
  var panelOrdersLoading = false;
  var panelResourcesLoading = false;

  /* Un bucle de peticiones que llevaba meses en producción
     ------------------------------------------------------------------
     run() lo dispara un MutationObserver sobre todo el documento, y cada
     respuesta de la API cambia el DOM: la respuesta vuelve a lanzar run().
     Eso solo se detenía si la petición conseguía crear su sección, porque
     entonces el getElementById de guardia cortaba. Cuando la petición NO
     creaba nada —un visitante anónimo en la portada, o en /panel/ sin sesión,
     donde la API responde 401— no quedaba ninguna marca, y la siguiente vuelta
     del observador volvía a pedir. Medido: 2 peticiones por segundo en /panel/
     y 1 por segundo en la portada, por cada pestaña abierta, indefinidamente.

     La corrección es tener también memoria de los intentos que NO produjeron
     nada. Se guarda por ruta y se olvida al cambiar de ruta, que es cuando
     tiene sentido volver a preguntar. */
  var intentos = {};
  var rutaDeLosIntentos = path;
  var MAX_INTENTOS = 3;

  // No basta con «ya lo pedí una vez»: la primera vuelta puede llegar antes de
  // que exista el <main> donde se pinta, y entonces habría que reintentar. Se
  // permiten tres intentos por ruta, que cubren esa carrera y cierran el bucle.
  function agotadosLosIntentos(clave) {
    if (rutaDeLosIntentos !== path) { intentos = {}; rutaDeLosIntentos = path; }
    return (intentos[clave] || 0) >= MAX_INTENTOS;
  }

  function anotarIntento(clave) {
    intentos[clave] = (intentos[clave] || 0) + 1;
  }

  function normalizePath(raw) {
    var p = raw || "/";
    if (!p.endsWith("/")) p += "/";
    return p;
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function text(el) {
    return (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim();
  }

  function api(url, options) {
    var sep = url.indexOf("?") === -1 ? "?" : "&";
    return fetch(url + sep + "_v=" + Date.now(), Object.assign({
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" }
    }, options || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.ok === false) {
          var err = new Error(j.error || ("HTTP " + r.status));
          err.status = r.status;
          throw err;
        }
        return j && j.data ? Object.assign({ raw: j }, j.data) : j;
      });
    });
  }

  function setRouteFlag() {
    document.body.setAttribute("data-redcafe-route", path);
  }

  function redirectLoggedHome() {
    if (path !== "/" || homeAuthChecking || agotadosLosIntentos("home-me")) return;
    // Con sesión iniciada el home siempre lleva al panel. Antes se cacheaba el
    // resultado en sessionStorage: quien entraba anónimo y luego iniciaba sesión
    // seguía viendo la portada al volver al inicio.
    homeAuthChecking = true;
    api("/api/auth.php?action=me").then(function (res) {
      if (res && res.user && !location.hash) location.replace("/panel/");
    }).catch(function () {}).finally(function () {
      homeAuthChecking = false;
      anotarIntento("home-me");
    });
  }

  /* Si React hidrató, su propio <header> (components/Navbar.tsx) ya trae
     el enlace «Precios», el desplegable «Más» y el menú móvil completo
     (incluido «Salir» cuando hay sesión). Antes de que existiera el fuente
     de React reconstruible, esta función rellenaba ese hueco a mano — pero
     nunca se le puso esta guarda, así que seguía construyendo un SEGUNDO
     menú móvil por encima del de React en todas las páginas: al abrir el
     menú se veían los dos superpuestos. Mismo patrón ya establecido en
     redcafe-menu.js y redcafe-fusion.js. */
  function reactVivo() {
    return !!document.querySelector('script[src*="/_next/static/chunks/main-app-"]');
  }

  function enhanceNav() {
    if (reactVivo()) return;
    var nav = qs("header nav");
    var links = '<a href="/marketplace/">Marketplace</a>' +
      '<a href="/academia/">Academia</a>' +
      '<a href="/servicios/">Servicios RedCafé</a>' +
      '<a href="/quienes-somos/">Quiénes somos</a>' +
      '<a href="/comunidad/">Comunidad</a>' +
      '<a href="/servicios/precios/">Precios</a>' +
      '<a href="/marketplace/#mapa">Mapa nacional y lotes</a>' +
      '<a href="/laboratorio/">Laboratorio</a>' +
      '<a href="/bar/">Bares y cafeterías</a>' +
      '<a href="/recetas/">Recetas</a>' +
      '<a href="/noticias/">Noticias</a>' +
      '<a href="/servicios/calculadora/">Calculadora</a>' +
      '<a href="/servicios/eudr/">Trazabilidad / EUDR</a>' +
      '<a href="/servicios/factura/">Facturación</a>' +
      '<a href="/legal/">Centro legal</a>' +
      '<a href="/terminos-y-condiciones/">Términos</a>' +
      '<a href="/politica-de-privacidad/">Privacidad</a>';
    if (nav && !document.querySelector(".redcafe-more")) {
      // "Precios" y el menú "Más" NO se insertan dentro del <nav>: ese nodo lo
      // gestiona React y añadirle hijos rompía su reconciliación al navegar
      // ("NotFoundError: Failed to execute 'removeChild'"). Se colocan en un
      // contenedor propio, hermano del nav, que React no conoce.
      var extra = document.getElementById("redcafe-nav-extra");
      if (!extra) {
        extra = document.createElement("div");
        extra.id = "redcafe-nav-extra";
        extra.className = "redcafe-nav-extra";
        nav.insertAdjacentElement("afterend", extra);
      }
      if (!qsa("a", nav).some(function (a) { return /servicios\/precios/.test(a.getAttribute("href") || ""); })) {
        var price = document.createElement("a");
        price.href = "/servicios/precios/";
        price.className = "redcafe-nav-precios";
        price.textContent = "Precios";
        extra.appendChild(price);
      }
      var details = document.createElement("details");
      details.className = "redcafe-more";
      details.innerHTML = '<summary>Más ▾</summary><div class="redcafe-more-menu">' + links + '</div>';
      extra.appendChild(details);
      document.addEventListener("click", function (ev) {
        if (!details.contains(ev.target)) details.removeAttribute("open");
      }, { passive: true });
    }
    enhanceMobileMenu(links);
  }

  function enhanceMobileMenu(links) {
    if (document.getElementById("redcafe-mobile-menu")) return;
    var header = qs("header");
    var btn = qs('header button[aria-label*="menú"], header button[aria-label*="menu"]');
    if (!header || !btn) return;
    var menu = document.createElement("div");
    menu.id = "redcafe-mobile-menu";
    menu.className = "redcafe-mobile-menu";
    menu.setAttribute("aria-hidden", "true");
    menu.innerHTML = '<a href="/login/">Entrar a mi perfil</a><a href="/afiliate/">Crear perfil</a>' + links;
    // Colgado del body, no del <header> de React, por el mismo motivo.
    // Su posición la fija el CSS, así que se ve igual.
    document.body.appendChild(menu);
    btn.addEventListener("click", function () {
      var open = menu.getAttribute("aria-hidden") !== "false";
      menu.setAttribute("aria-hidden", String(!open));
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  function addHomeLoginButton() {
    if (path !== "/" || document.getElementById("redcafe-home-login")) return;
    var existing = qsa('a[href="/login/"], a[href="/login"]').some(function (a) {
      return text(a) === "Acceder a mi perfil";
    });
    if (existing) return;
    var subtitle = qsa("p").find(function (p) {
      return text(p).indexOf("Crea tu perfil") !== -1 && text(p).indexOf("Publica") !== -1;
    });
    if (!subtitle) return;
    var box = document.createElement("div");
    box.id = "redcafe-home-login";
    box.className = "mt-3 flex flex-wrap gap-3";
    box.innerHTML = '<a class="inline-flex min-h-11 items-center border border-crema/30 px-6 py-3 font-semibold text-crema transition hover:border-acento-claro hover:text-acento-claro" href="/login/">Acceder a mi perfil</a>';
    subtitle.insertAdjacentElement("afterend", box);
  }

  function hideLimitedTimeRegistrationCopy() {
    if (path !== "/") return;
    qsa("main > div.redcafe-final-hidden").forEach(function (el) {
      if (text(el).indexOf("Nueva plataforma") !== -1) el.classList.remove("redcafe-final-hidden");
    });
    qsa("p,span").forEach(function (el) {
      var t = text(el);
      if (t.toLowerCase() === "por tiempo limitado") {
        el.classList.add("redcafe-final-hidden");
        var next = el.nextElementSibling;
        if (next && /gratuit[oa]\s+hasta|31 de diciembre de 2026/i.test(text(next))) {
          next.classList.add("redcafe-final-hidden");
        }
      }
      if (/El registro es gratuito hasta el\s+31 de diciembre de 2026/i.test(t)) {
        el.classList.add("redcafe-final-hidden");
      }
    });
  }

  /* Cambiar el texto de un nodo SIN escribir en él si es de React.
     Escribir textContent o innerHTML en un nodo que pinta React destruye los
     nodos de texto que React cree tener; en su siguiente repintado intenta
     retirarlos y lanza «NotFoundError: removeChild» → «Application error».
     Esta función se ejecuta en cada vuelta del observador, así que el riesgo se
     multiplica. Para nodos de React se oculta el original con el atributo que
     solo mueve CSS y se pinta al lado una copia propia con el texto nuevo. */
  function reemplazarTextoSeguro(el, nuevoHtml, esHtml) {
    if ((esHtml ? el.innerHTML : el.textContent) === nuevoHtml) return el;
    if (el.closest("[data-redcafe-propio]")) {
      if (esHtml) el.innerHTML = nuevoHtml; else el.textContent = nuevoHtml;
      return el;
    }
    if (el.getAttribute("data-redcafe-oculto-react") === "1") {
      var ya = el.nextElementSibling;
      return ya && ya.getAttribute("data-redcafe-copia") === "1" ? ya : undefined;
    }
    var copia = el.cloneNode(false);
    copia.removeAttribute("id");
    copia.setAttribute("data-redcafe-propio", "1");
    marcarCopia(copia, el);
    if (esHtml) copia.innerHTML = nuevoHtml; else copia.textContent = nuevoHtml;
    el.setAttribute("data-redcafe-oculto-react", "1");
    el.insertAdjacentElement("afterend", copia);
    return copia;
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

  var TEXTOS_LOTE_DE_CAFE = {
    "Publicar lote": "Publicar lote de café",
    "Publicar lotes": "Publicar lotes de café",
    "Mapa de lotes de café publicados": "Mapa de lotes de café publicados",
    "Cargando lotes publicados...": "Cargando lotes de café publicados...",
    "Marketplace de lotes.": "Marketplace de lotes de café."
  };

  function clarifyCoffeeLotCopy() {
    qsa("a,p,span,li,b,strong").forEach(function (el) {
      // Solo hojas: si el nodo tiene hijos elementos, cambiarle el texto
      // borraría esos hijos.
      if (el.children.length) return;
      var nuevo = TEXTOS_LOTE_DE_CAFE[text(el)];
      if (nuevo) reemplazarTextoSeguro(el, nuevo, false);
    });
  }

  function enhanceHomeHeroCopy() {
    if (path !== "/") return;
    var heroTitle = qs("main section:first-of-type h1");
    if (heroTitle && heroTitle.getAttribute("data-redcafe-oculto-react") !== "1" && !heroTitle.closest("[data-redcafe-propio]")) {
      reemplazarTextoSeguro(heroTitle, 'Crea tu perfil y conecta con oportunidades del <span class="text-acento-claro">café ecuatoriano</span>', true);
    }
    var heroParagraph = qsa("main section p").find(function (p) {
      var t = text(p);
      return t === "Una plataforma para que productores, tostadores, compradores, cafeterías, asesores y proveedores del café ecuatoriano puedan mostrarse, conectar y encontrar oportunidades comerciales." ||
        t === "Red Café Ecuador conecta a quienes trabajan en el negocio cafetero para mostrar oferta, encontrar oportunidades y decidir con más información." ||
        t === "Red Café Ecuador conecta productores, tostadores, compradores, cafeterías, asesores y proveedores en una plataforma abierta para mostrar oferta, encontrar oportunidades y trabajar con más información.";
    });
    if (!heroParagraph) return;
    reemplazarTextoSeguro(heroParagraph, "Regístrate gratis para publicar café o servicios, encontrar compradores y proveedores, revisar precios con fuente visible y guardar tu avance en la Academia.", false);
  }

  function enhanceHomeProfilePanel() {
    if (path !== "/") return;
    var label = qsa("p,span").find(function (el) {
      return text(el) === "Al crear tu perfil puedes" || text(el) === "Todos los perfiles acceden a";
    });
    if (!label) return;
    var panel = label.closest(".relative.overflow-hidden") || label.closest("div");
    while (panel && panel.parentElement && text(panel).indexOf("Productores") === -1) {
      panel = panel.parentElement;
    }
    if (!panel || panel.getAttribute("data-redcafe-home-profile-panel") === "1") return;

    panel.setAttribute("data-redcafe-home-profile-panel", "1");
    panel.classList.add("redcafe-home-profile-panel", "redcafe-home-profile-native");

    var list = qsa("div", panel).find(function (el) {
      var t = text(el);
      return t.indexOf("Productores") !== -1 &&
        t.indexOf("Tostadores") !== -1 &&
        t.indexOf("Compradores") !== -1 &&
        t.indexOf("Al crear tu perfil") === -1 &&
        t.indexOf("Todos los perfiles") === -1;
    });
    if (list) {
      list.classList.add("redcafe-home-profile-list-native");
      if (!panel.querySelector(".redcafe-home-profile-kicker")) {
        var kicker = document.createElement("p");
        kicker.className = "redcafe-home-profile-kicker";
        kicker.textContent = "Perfiles de entrada";
        list.insertAdjacentElement("beforebegin", kicker);
      }
    }

    var replacements = {
      "Publica tus lotes y abre nuevas conversaciones sin dejar tus canales actuales.": "Publica lotes de café, recibe pedidos y atiende compradores desde tu panel.",
      "Encuentra lotes de café por origen, compara datos y contacta productores.": "Encuentra lotes de café por origen, compara datos y contacta productores.",
      "Compra café con datos de finca, proceso, variedad y contacto directo.": "Compra café con datos de finca, proceso, variedad y contacto directo.",
      "Todos los perfiles acceden a": "Con tu perfil puedes",
      "· Academia y capacitación": "Guardar avance en Academia",
      "· Precio de mercado con su fuente": "Revisar precios con fuente",
      "· Red de contactos del sector": "Contactar actores del sector",
      "Publicar, comprar o vender café": "Publicar o encontrar oportunidades"
    };
    // Nunca textContent sobre un nodo de React (acaba en «removeChild»): se
    // oculta el original y se pinta una copia propia (reemplazarTextoSeguro).
    qsa("p,span,li", panel).forEach(function (el) {
      if (el.getAttribute("data-redcafe-oculto-react") === "1") return;
      var t = text(el);
      if (replacements[t] && replacements[t] !== t) {
        reemplazarTextoSeguro(el, replacements[t], false);
      } else if (/^·\s*/.test(t) && !el.children.length) {
        reemplazarTextoSeguro(el, t.replace(/^·\s*/, ""), false);
      }
    });

    var included = label.closest("div");
    if (included) included.classList.add("redcafe-home-profile-included-native");
  }

  function ensureHomePriceStrip() {
    if (path !== "/" || document.getElementById("redcafe-home-price-strip")) return;
    var main = qs("main");
    var hero = qs("main section:first-of-type");
    if (!main || !hero) return;

    var strip = document.createElement("section");
    strip.id = "redcafe-home-price-strip";
    strip.className = "redcafe-home-price-strip";
    strip.setAttribute("data-redcafe-propio", "1");
    strip.innerHTML =
      '<div class="redcafe-home-price-inner">' +
        '<div class="redcafe-home-price-copy">' +
          '<p class="redcafe-home-price-kicker">Precio de mercado</p>' +
          '<h2>Referencia mensual para negociar café</h2>' +
          '<p>Consulta el panel con fuente, histórico y lectura para Ecuador antes de publicar, comprar o negociar café.</p>' +
        '</div>' +
        '<div class="redcafe-home-price-metric" aria-live="polite">' +
          '<span>ICE Coffee C</span>' +
          '<strong data-redcafe-home-price-value>Actualizando...</strong>' +
          '<small data-redcafe-home-price-date>Fuente: panel de precios</small>' +
        '</div>' +
        '<a href="/servicios/precios/">Abrir panel de precios</a>' +
      '</div>';
    hero.insertAdjacentElement("afterend", strip);

    api("/api/precios.php?action=list").then(function (res) {
      var rows = (res.historico || res.precios || res.data || []).map(normalizePriceRow).filter(Boolean)
        .sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); });
      var latest = rows[rows.length - 1];
      var value = qs("[data-redcafe-home-price-value]", strip);
      var date = qs("[data-redcafe-home-price-date]", strip);
      if (value) value.textContent = latest ? "$" + latest.precio.toFixed(2) : "Ver histórico";
      if (date) date.textContent = latest ? ("Última referencia: " + latest.fecha) : "Fuente: panel de precios";
    }).catch(function () {
      var value = qs("[data-redcafe-home-price-value]", strip);
      if (value) value.textContent = "Ver histórico";
    });
  }

  function enhanceLoginRegisterChoice() {
    if (path !== "/login/" || document.getElementById("redcafe-login-register-choice")) return;
    var form = qs("main form");
    if (!form) return;
    var card = document.createElement("section");
    card.id = "redcafe-login-register-choice";
    card.className = "redcafe-login-register-choice";
    card.innerHTML =
      '<p class="redcafe-login-register-kicker">¿Primera vez en Red Café Ecuador?</p>' +
      '<h2>Crea tu perfil gratis</h2>' +
      '<p>El registro sirve para publicar, contactar, aprender y acceder a tu panel. Si ya tienes cuenta, entra con tu correo arriba.</p>' +
      '<a href="/afiliate/">Registrarme gratis</a>';
    form.insertAdjacentElement("afterend", card);
  }

  var roleCopy = {
    productor: {
      title: "Productor: publica lotes, recibe pedidos y mejora tu negociación",
      body: "Tu cuenta te permite mostrar finca, variedad, proceso, altura, fotos y ubicación del lote. Desde el panel puedes recibir pedidos, revisar precios, organizar inventario y solicitar trazabilidad, catación, asesoría, flete o pilado.",
      steps: ["Publica lotes de café con finca, proceso y estado del grano.", "Recibe solicitudes de compra desde el marketplace.", "Solicita servicios técnicos cuando el lote lo necesite."]
    },
    vendedor: {
      title: "Tostador o comerciante: encuentra abastecimiento y gestiona pedidos",
      body: "Este perfil está pensado para comparar lotes, contactar productores, registrar pedidos y ordenar compras. Puedes publicar servicios o necesidades comerciales si también participas como proveedor.",
      steps: ["Compara lotes por origen, proceso y disponibilidad.", "Solicita compra de café o servicios desde marketplace.", "Consulta precio diario y seguimiento de pedidos en tu panel."]
    },
    comprador: {
      title: "Comprador: descubre cafés ecuatorianos con datos verificables",
      body: "El perfil de comprador facilita encontrar lotes, solicitar muestras o pedidos y guardar continuidad comercial con productores, tostadores o servicios de la Red.",
      steps: ["Busca cafés por origen y características.", "Realiza pedidos desde las publicaciones.", "Califica calidad y servicio al cerrar operaciones."]
    },
    bar: {
      title: "Bar o cafetería: abastecimiento, menú y reputación de servicio",
      body: "Puedes conectar con proveedores, solicitar lotes, publicar tu cafetería y usar herramientas para organizar oferta, costos y experiencia de servicio.",
      steps: ["Encuentra café para tu barra.", "Gestiona pedidos y proveedores.", "Recibe calificaciones de servicio y calidad."]
    },
    certificador: {
      title: "Catador o verificador: ofrece informes, evaluación y trazabilidad",
      body: "Tu perfil permite ofrecer informes de catación, verificación de finca, trazabilidad y soporte técnico a miembros que necesitan documentar calidad.",
      steps: ["Publica servicios técnicos.", "Recibe solicitudes desde marketplace.", "Construye reputación con calificaciones verificables."]
    },
    transportista: {
      title: "Transportista: recibe solicitudes de flete de café",
      body: "Este perfil conecta rutas, volúmenes y fechas con miembros que necesitan mover café entre finca, piladora, tostador o puerto.",
      steps: ["Publica cobertura y rutas.", "Recibe pedidos de flete.", "Da seguimiento al estado del servicio."]
    },
    pilador: {
      title: "Pilador o beneficiadero: publica capacidad y recibe solicitudes",
      body: "Puedes ofrecer pilado, beneficio, clasificación o apoyo de proceso para productores y comerciantes que necesitan preparar café para venta.",
      steps: ["Publica servicios de proceso.", "Recibe solicitudes desde marketplace.", "Registra continuidad y calificaciones."]
    },
    exportador: {
      title: "Exportador: arma oferta con origen, calidad y expediente",
      body: "Este perfil conecta lotes, trazabilidad, catación y documentación para preparar operaciones comerciales con compradores internacionales.",
      steps: ["Busca lotes y productores documentados.", "Solicita expediente EUDR y catación.", "Coordina servicios y pedidos desde el panel."]
    },
    proveedor: {
      title: "Proveedor: ofrece equipos, insumos o servicios al sector",
      body: "Tu perfil permite publicar productos o servicios especializados, recibir solicitudes y mantener continuidad con cafeterías, fincas y tostadores.",
      steps: ["Publica tu oferta de equipos o insumos.", "Recibe pedidos desde marketplace.", "Gestiona reputación de servicio."]
    },
    asesor: {
      title: "Asesor experto: ofrece acompañamiento especializado",
      body: "Puedes publicar asesorías en agronomía, calidad, tueste, gestión, exportación o cafeterías y recibir solicitudes de miembros de la Red.",
      steps: ["Publica servicios profesionales.", "Recibe solicitudes en tu panel.", "Cierra el servicio con calificación."]
    },
    barista: {
      title: "Barista: capacitación, oportunidades y conexión con barras",
      body: "Este perfil ayuda a aprender, mostrar experiencia y conectarte con cafeterías, cursos, recetas y oportunidades del café ecuatoriano.",
      steps: ["Accede a academia y recetas.", "Conecta con bares y cafeterías.", "Participa en servicios y comunidad."]
    }
  };

  function selectedRole() {
    var param = new URLSearchParams(location.search).get("rol");
    if (param && roleCopy[param]) return param;
    var active = qsa("button, a").find(function (el) {
      return /activo|principal|seleccionado/i.test(text(el)) || /border-latte|bg-cafe|bg-cereza/.test(el.className || "");
    });
    var t = text(active || document.body).toLowerCase();
    if (t.indexOf("tostador") !== -1 || t.indexOf("comerciante") !== -1) return "vendedor";
    if (t.indexOf("comprador") !== -1) return "comprador";
    if (t.indexOf("cafeter") !== -1 || t.indexOf("bar ") !== -1) return "bar";
    if (t.indexOf("catador") !== -1 || t.indexOf("verificador") !== -1) return "certificador";
    if (t.indexOf("transport") !== -1) return "transportista";
    if (t.indexOf("pilador") !== -1 || t.indexOf("beneficiadero") !== -1) return "pilador";
    if (t.indexOf("exportador") !== -1) return "exportador";
    if (t.indexOf("proveedor") !== -1) return "proveedor";
    if (t.indexOf("asesor") !== -1) return "asesor";
    if (t.indexOf("barista") !== -1) return "barista";
    return "productor";
  }

  function renderProfileIntro(role) {
    // La ruta se lee AHORA, no de la variable del módulo. En /afiliate/ se
    // engancha un click a todos los enlaces de la página —incluidos los del
    // menú— y 80 ms después se vuelve a pintar este bloque. Al pulsar «Panel»
    // ese temporizador se dispara ya en /panel/, pero `path` todavía valía
    // "/afiliate/" porque run() aún no había pasado: el bloque se recreaba
    // después de que el vigilante de ruta lo hubiera retirado, y se quedaba
    // pegado en el panel.
    if (normalizePath(location.pathname) !== "/afiliate/") return;
    var copy = roleCopy[role] || roleCopy.productor;
    var panel = document.getElementById("redcafe-profile-intro");
    if (panel && panel.getAttribute("data-redcafe-role") === role) return;
    if (!panel) {
      var anchor = qsa("h1,h2,p").find(function (el) { return text(el).indexOf("Qué ganas de verdad") !== -1; }) ||
        qsa("form, section").find(function (el) { return text(el).indexOf("perfil") !== -1; });
      panel = document.createElement("aside");
      panel.id = "redcafe-profile-intro";
      panel.setAttribute("data-redcafe-propio", "1");
      panel.className = "redcafe-profile-intro";
      if (anchor) {
        (anchor.closest("section") || anchor.parentElement).insertAdjacentElement("afterbegin", panel);
      } else {
        qs("main").insertAdjacentElement("afterbegin", panel);
      }
    }
    panel.setAttribute("data-redcafe-role", role);
    panel.innerHTML = "<h3>" + esc(copy.title) + "</h3><p class=\"mt-2\">" + esc(copy.body) + "</p><ul>" +
      copy.steps.map(function (s) { return "<li>✓ " + esc(s) + "</li>"; }).join("") + "</ul>";
  }

  function enhanceAfiliate() {
    if (path !== "/afiliate/") return;
    renderProfileIntro(selectedRole());
    if (!document.getElementById("redcafe-afiliate-login")) {
      var h1 = qs("h1");
      var sub = h1 && qsa("p", h1.closest("section") || document).find(function (p) { return text(p).length > 40; });
      var a = document.createElement("a");
      a.id = "redcafe-afiliate-login";
      a.setAttribute("data-redcafe-propio", "1");
      a.href = "/login/";
      a.className = "mt-4 inline-flex min-h-11 items-center border border-cafe/30 px-5 py-2.5 font-semibold text-cafe transition hover:bg-crema/40";
      a.textContent = "Acceder con credenciales";
      (sub || h1 || qs("main")).insertAdjacentElement("afterend", a);
    }
    qsa("button,a").forEach(function (el) {
      if (el.__redcafeRoleBound) return;
      el.__redcafeRoleBound = true;
      el.addEventListener("click", function () {
        setTimeout(function () { renderProfileIntro(selectedRole()); }, 80);
      });
    });
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch];
    });
  }

  function money(v) {
    var n = Number(v || 0);
    return n <= 0 ? "Consultar" : "$" + n.toFixed(2);
  }

  function alturaLegible(lote) {
    var valor = lote && lote.altura;
    if (valor === undefined || valor === null || valor === "") return "";
    var numero = Number(valor);
    if (isFinite(numero) && numero >= 300 && numero <= 2600) return String(numero) + " msnm";
    return "Altura por confirmar";
  }

  function newestTime(item) {
    var t = Date.parse(item.created_at || item.updated_at || "");
    return isNaN(t) ? 0 : t;
  }

  function byNewest(a, b) {
    var diff = newestTime(b) - newestTime(a);
    if (diff) return diff;
    return String(b.id || "").localeCompare(String(a.id || ""));
  }

  function enhanceMarketplace() {
    if (path !== "/marketplace/") return;
    if (!window.__redcafeMarketMapFixed) {
      window.__redcafeMarketMapFixed = true;
      api("/api/lotes.php?action=list").then(function (res) {
        var lots = (res.lotes || []).filter(loteReal).map(normalizeLote).sort(byNewest);
        qsa("p").forEach(function (p) {
          if (/cafés disponibles/i.test(text(p)) && !p.children.length) reemplazarTextoSeguro(p, lots.length + " cafés disponibles", false);
        });
        renderMarketplaceMapMarkers(lots);
      }).catch(function () {});
    }
    if (document.getElementById("redcafe-market-tabs")) return;
    return;
    var main = qs("main");
    if (!main) return;
    var grid = document.getElementById("lotes-grid") || qsa("div").find(function (d) {
      return /Cargando cafés|Marketplace/i.test(text(d)) && d.children.length < 8;
    });
    if (!grid) {
      grid = document.createElement("div");
      grid.id = "lotes-grid";
      main.appendChild(grid);
    }
    var tabs = document.createElement("div");
    tabs.id = "redcafe-market-tabs";
    tabs.setAttribute("data-redcafe-propio", "1");
    tabs.className = "redcafe-market-tabs";
    tabs.innerHTML = '<button type="button" aria-pressed="true" data-view="cafes">Cafés y lotes</button><button type="button" aria-pressed="false" data-view="servicios">Servicios RedCafé</button>';
    grid.insertAdjacentElement("beforebegin", tabs);
    tabs.addEventListener("click", function (ev) {
      var btn = ev.target.closest("button");
      if (!btn) return;
      qsa("button", tabs).forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      if (btn.dataset.view === "servicios") renderMarketplaceServices(grid);
      else renderMarketplaceLots(grid);
    });
    renderMarketplaceLots(grid);
  }

  function cleanMarketplaceMapCopy() {
    qsa("h2").forEach(function (h) {
      if (/^Explora.*origen$|origen/i.test(text(h))) reemplazarTextoSeguro(h, "Mapa de lotes de café publicados", false);
    });
    qsa("p,span").forEach(function (el) {
      if (/marcadores.*distribuci|marcador.*lote|referenciales|pendientes de verificaci/i.test(text(el))) {
        el.remove();
      }
    });
  }

  // Los lotes de muestra (demo/ejemplo) contaban como oferta real: el
  // marketplace anunciaba «13 cafés disponibles» con 7 reales. normalizeLote
  // no conserva esas marcas, así que el filtro va ANTES de normalizar.
  function loteReal(lote) {
    return lote && !lote.demo && !lote.ejemplo && !lote.oculto;
  }

  function normalizeLote(lote) {
    return {
      id: lote.id || "",
      finca: lote.finca || lote.nombre || "Lote de café",
      productor: lote.productor || "Productor de la Red",
      provincia: lote.provincia || "Ecuador",
      variedad: lote.variedad || "Café",
      proceso: lote.proceso || "",
      altura: lote.altura || lote.msnm || "",
      score: lote.score || lote.puntaje || "",
      precioSaco: lote.precioSaco || lote.precio_saco || lote.precio || 0,
      stockSacos: lote.stockSacos || lote.stock_sacos || lote.stock || 0,
      ventaMinima: lote.ventaMinima || lote.venta_minima || "Consultar",
      descripcion: lote.descripcion || "",
      imagen: (lote.imagenes && lote.imagenes[0]) || lote.imagen || "/img/proceso/verde.webp",
      lat: Number(lote.lat),
      lng: Number(lote.lng),
      ejemplo: !!lote.ejemplo,
      ubicacion_aproximada: lote.ubicacion_aproximada === true,
      whatsapp: lote.whatsapp || lote.contacto_whatsapp || "",
      email: lote.email || lote.contacto_email || "",
      created_at: lote.created_at || "",
      updated_at: lote.updated_at || "",
      contacto: lote.contacto || {}
    };
  }

  // Si el ayudante de referencia no cargó, el mensaje sale igual: sin la
  // referencia, pero sin romperse.
  function msgWhatsapp(texto, tipo, id) {
    return typeof window.redcafeMensajeWhatsapp === "function"
      ? window.redcafeMensajeWhatsapp(texto, tipo, id)
      : encodeURIComponent(texto);
  }

  function loteContactHref(lote) {
    var msg = msgWhatsapp("Hola, quiero consultar por el café " + lote.variedad + " " + lote.proceso + " de " + lote.finca + ".", "lote", lote.id);
    var wa = lote.contacto.whatsapp || lote.whatsapp || "";
    var email = lote.contacto.email || lote.email || "";
    if (wa) return "https://wa.me/" + String(wa).replace(/\D/g, "") + "?text=" + msg;
    if (email) return "mailto:" + email + "?subject=" + encodeURIComponent("Consulta de lote Red Café Ecuador");
    return "https://wa.me/" + WAPP + "?text=" + msg;
  }

  function renderLoteCard(lote) {
    var detail = "/marketplace/" + encodeURIComponent(lote.id) + "/";
    var price = Number(lote.precioSaco || 0);
    var altura = alturaLegible(lote);
    return '<article class="card group overflow-hidden redcafe-market-card" data-lote-id="' + esc(lote.id) + '">' +
      '<a aria-label="Ver café ' + esc(lote.variedad + " " + lote.proceso + " de " + lote.finca) + '" class="relative block bg-crema" href="' + detail + '">' +
        '<img src="' + esc(lote.imagen) + '" alt="Café de ' + esc(lote.finca) + '" class="aspect-[16/10] w-full object-cover" width="800" height="500" loading="lazy" decoding="async"/>' +
        '<span class="rotulo absolute left-2 top-2 bg-coffee-900/90 px-2 py-0.5 text-cream-100">' + (lote.ejemplo ? "Referencial" : "Publicado") + '</span>' +
      '</a>' +
      '<div class="p-4">' +
        '<p class="rotulo flex flex-wrap items-center gap-2"><span>' + esc(lote.provincia) + '</span>' +
          (lote.ubicacion_aproximada === true ? '<span class="redcafe-etiqueta-aprox">' + esc("Ubicación aproximada") + '</span>' : '') + '</p>' +
        '<h3 class="mt-1.5 text-base font-semibold leading-snug text-pizarra">' + esc(lote.variedad) + (lote.proceso ? ' · ' + esc(lote.proceso) : '') + '</h3>' +
        '<p class="text-sm text-text-secondary">' + esc(lote.finca) + '</p>' +
        '<div class="mt-3 flex flex-wrap gap-1.5">' +
          '<span class="rotulo border border-arena px-2 py-0.5 text-tostado">' + esc(lote.variedad) + '</span>' +
          (lote.proceso ? '<span class="rotulo border border-arena px-2 py-0.5 text-tostado">' + esc(lote.proceso) + '</span>' : '') +
          (altura ? '<span class="rotulo border border-arena px-2 py-0.5 text-tostado">' + esc(altura) + '</span>' : '') +
        '</div>' +
        '<div class="regla mt-3.5"></div>' +
        '<div class="mt-3 flex items-end justify-between gap-3"><div><p class="rotulo">Saco 69 kg</p><p class="dato text-lg font-semibold text-pizarra">' + (price > 0 ? "$" + price : "Precio a convenir") + '</p></div>' +
        '<div class="text-right"><p class="rotulo">Puntaje</p><p class="dato text-lg font-semibold text-pizarra">' + esc(lote.score || "Sin catar") + '</p></div></div>' +
        '<p class="rotulo mt-2 normal-case tracking-normal text-text-secondary">' + esc(lote.stockSacos || "Consultar") + ' sacos disponibles · desde ' + esc(lote.ventaMinima) + '</p>' +
        '<div class="mt-3 flex gap-2"><a class="btn-primary flex-1" href="' + detail + '">Ver café</a><a href="' + esc(loteContactHref(lote)) + '" target="_blank" rel="noreferrer" class="btn-ghost inline-flex flex-1 items-center justify-center">Contactar</a></div>' +
      '</div>' +
    '</article>';
  }

  function renderMarketplaceLots(container) {
    container.innerHTML = '<p class="text-pizarra-suave">Cargando lotes publicados...</p>';
    api("/api/lotes.php?action=list").then(function (res) {
      var lots = (res.lotes || []).filter(loteReal).map(normalizeLote).sort(byNewest);
      container.className = "mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3";
      container.innerHTML = lots.map(renderLoteCard).join("");
      qsa("p").forEach(function (p) {
        if (/cafés disponibles/i.test(text(p)) && !p.children.length) reemplazarTextoSeguro(p, lots.length + " cafés disponibles", false);
      });
      renderMarketplaceMapMarkers(lots);
    }).catch(function () {
      container.innerHTML = '<p class="redcafe-launch-note">No se pudieron cargar todos los lotes. Intenta recargar la página.</p>';
    });
  }

  // El mapa del marketplace lo pinta la propia web (Leaflet) con sus
  // marcadores. Esta capa llegó a añadir DEBAJO un segundo recuadro con pines
  // colocados por porcentaje sobre un fondo dibujado: con el mapa real
  // funcionando eso son dos mapas seguidos y unos marcadores que no
  // corresponden a ninguna geografía —lo que el propietario vio como
  // «marcadores fuera»—. Se deja de pintar. Si algún día el mapa real no
  // cargara, aquí no se inventa un sustituto: se deja el sitio al mapa.
  function renderMarketplaceMapMarkers(lots) {
    var heading = qsa("h2").find(function (h) { return /origen|mapa/i.test(text(h)); });
    if (heading && text(heading) !== "Mapa de lotes de café publicados") {
      reemplazarTextoSeguro(heading, "Mapa de lotes de café publicados", false);
    }
    // Restos de intentos anteriores: si quedó un recuadro propio, se retira.
    var viejo = document.querySelector(".redcafe-map-overlay[data-redcafe-propio], .redcafe-map-overlay");
    if (viejo && viejo.parentNode) viejo.parentNode.removeChild(viejo);
  }
  function renderMarketplaceServices(container) {
    container.innerHTML = '<p class="text-pizarra-suave">Cargando servicios disponibles...</p>';
    api("/api/marketplace-servicios.php?action=list").then(function (res) {
      var items = (res.servicios || []).slice().sort(byNewest);
      container.className = "redcafe-service-grid";
      container.innerHTML = items.map(function (s) {
        var w = s.whatsapp || WAPP;
        var msg = msgWhatsapp("Hola, quiero solicitar el servicio: " + (s.titulo || s.nombre || "Servicio RedCafé") + ".", "servicio", s.id);
        return '<article class="redcafe-service-card">' +
          '<p class="rotulo text-filtrado-600">' + esc(s.categoria || "servicio") + '</p>' +
          '<h3>' + esc(s.titulo || s.nombre || "Servicio RedCafé") + '</h3>' +
          '<p class="mt-2">' + esc(s.descripcion || "") + '</p>' +
          '<p class="mt-3 font-semibold text-cafe">' + esc(s.precio_etiqueta || money(s.precio)) +
            (s.precio_etiqueta && Number(s.precio) <= 0 ? '' : ' <span class="text-xs text-pizarra-suave">/ ' + esc(s.unidad || "servicio") + '</span>') + '</p>' +
          '<p class="mt-1 text-xs text-pizarra-suave">' + esc(s.proveedor || "Red Café Ecuador") + ' · ' + esc(s.cobertura || "Ecuador") + '</p>' +
          '<div class="redcafe-action-row"><button type="button" data-service="' + esc(s.id) + '">Solicitar</button>' +
          '<a href="https://wa.me/' + esc(w) + '?text=' + msg + '" target="_blank" rel="noreferrer">WhatsApp</a></div>' +
          '</article>';
      }).join("");
      qsa("[data-service]", container).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var svc = items.find(function (s) { return String(s.id) === String(btn.dataset.service); });
          requestService(svc);
        });
      });
    }).catch(function () {
      container.innerHTML = '<p class="redcafe-launch-note">No se pudo cargar el catálogo de servicios. Puedes solicitarlos por WhatsApp.</p>';
    });
  }

  function requestService(svc) {
    if (!svc) return;
    api("/api/pedidos.php?action=create_service", {
      method: "POST",
      body: JSON.stringify({
        servicioId: svc.id,
        titulo: svc.titulo || svc.nombre,
        proveedor: svc.proveedor || "Red Café Ecuador",
        proveedorId: svc.proveedor_id || "redcafe_admin",
        cantidad: 1,
        total: Number(svc.precio || 0)
      })
    }).then(function () {
      location.href = "/panel/";
    }).catch(function (err) {
      if (err.status === 401) location.href = "/login/";
      else alert(err.message || "No se pudo crear la solicitud.");
    });
  }

  function enhancePricePage() {
    if (path !== "/servicios/precios/" || document.getElementById("redcafe-price-daily")) return;
    var main = qs("main");
    if (!main) return;
    var board = document.createElement("section");
    board.id = "redcafe-price-daily";
    board.setAttribute("data-redcafe-propio", "1");
    board.className = "redcafe-price-board";
    board.innerHTML = '<div class="redcafe-price-head"><div><p class="rotulo text-filtrado-600">ICE Coffee C · cierres diarios</p><h1 class="font-titulo text-2xl font-bold text-cafe">Precio histórico del café</h1><p class="redcafe-price-date" role="status">Cargando último cierre disponible…</p></div><div class="redcafe-price-value">...</div></div><div class="redcafe-range-tabs"><button type="button" data-range="7">7D</button><button type="button" data-range="30" aria-pressed="true">1M</button><button type="button" data-range="90">3M</button><button type="button" data-range="180">6M</button><button type="button" data-range="365">1A</button><button type="button" data-range="0">Todo</button></div><div class="redcafe-price-chart"></div><table class="redcafe-price-table"><thead></thead><tbody></tbody></table>';
    main.insertAdjacentElement("afterbegin", board);
    api("/api/precios.php?action=list").then(function (res) {
      var rows = (res.historico_diario || []).map(normalizePriceRow).filter(Boolean);
      if (rows.length < 2) { board.remove(); return; }
      drawPrices(board, rows, 30, res);
      if (rows.length > 1) main.setAttribute("data-redcafe-precio-propio", "listo");
      hideOldDailyPriceTable();
      qsa("[data-range]", board).forEach(function (btn) {
        btn.addEventListener("click", function () {
          qsa("[data-range]", board).forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
          drawPrices(board, rows, Number(btn.dataset.range || 0), res);
        });
      });
    }).catch(function () {
      board.remove();
    });
  }

  function enhanceServiciosPage() {
    if (path !== "/servicios/" || document.getElementById("redcafe-intermediation-service")) return;
    var main = qs("main");
    if (!main) return;
    var anchor = qs("h1");
    var section = document.createElement("section");
    section.id = "redcafe-intermediation-service";
    section.setAttribute("data-redcafe-propio", "1");
    section.className = "mx-auto max-w-6xl px-4 py-6";
    section.innerHTML =
      '<article class="redcafe-service-card redcafe-service-feature">' +
        '<div><p class="rotulo text-filtrado-600">Servicio oficial Red Café Ecuador</p>' +
        '<h2>Intermediación en compraventa de café</h2>' +
        '<p>Acompañamos a la parte que nos contrata durante una compra o venta de café: búsqueda de calidad, selección de proveedor o comprador, validación del lote, visita técnica, revisión de condiciones y soporte hasta el cierre.</p></div>' +
        '<div class="redcafe-service-steps">' +
          '<p><b>Para compradores:</b> ubicamos calidad, filtramos proveedores, validamos el lote y acompañamos la compra.</p>' +
          '<p><b>Para vendedores:</b> preparamos la oferta, revisamos calidad, soportamos la negociación y acompañamos el cierre.</p>' +
        '</div>' +
        '<div class="redcafe-action-row"><a href="/marketplace/?ver=servicios">Solicitar servicio</a><a href="https://wa.me/' + WAPP + '?text=Hola%2C%20quiero%20solicitar%20intermediaci%C3%B3n%20en%20compraventa%20de%20caf%C3%A9." target="_blank" rel="noreferrer">WhatsApp</a></div>' +
      '</article>';
    var target = anchor ? (anchor.closest("section") || anchor.parentElement) : main.firstElementChild;
    if (target) target.insertAdjacentElement("afterend", section);
    else main.insertAdjacentElement("afterbegin", section);
  }

  function patchSupportWhatsAppLink() {
    if (path !== "/servicios/") return;
    var href = "https://wa.me/" + WAPP + "?text=Hola%2C%20quiero%20soporte%20de%20la%20Red%20Caf%C3%A9%20Ecuador.";
    qsa("a").forEach(function (a) {
      if (a.getAttribute("data-redcafe-oculto-react") === "1") return;
      // La copia que crea esta misma función lleva el mismo texto: sin estas
      // dos guardas se clonaba a sí misma en cada pasada del observador y la
      // tarjeta salía repetida (103 veces en producción, 23 sep 2026).
      if (a.getAttribute("data-redcafe-propio") === "1") return;
      if (a.closest("[data-redcafe-propio]")) return;
      if (a.getAttribute("data-redcafe-wa-soporte") === "1") return;
      if (text(a).indexOf("Soporte y Comunidad WhatsApp") === -1) return;
      var copia = a.cloneNode(true);
      copia.removeAttribute("id");
      qsa("[id]", copia).forEach(function (n) { n.removeAttribute("id"); });
      copia.href = href;
      copia.target = "_blank";
      copia.rel = "noreferrer";
      copia.setAttribute("data-redcafe-propio", "1");
      copia.setAttribute("data-redcafe-wa-soporte", "1");
      marcarCopia(copia, a);
      a.setAttribute("data-redcafe-wa-soporte", "1");
      a.setAttribute("data-redcafe-oculto-react", "1");
      a.insertAdjacentElement("afterend", copia);
    });
  }

  function hideOldDailyPriceTable() {
    qsa("h2").forEach(function (h) {
      if (text(h).indexOf("Histórico") === -1) return;
      h.classList.add("redcafe-final-hidden");
      var next = h.nextElementSibling;
      if (next && next.tagName === "DIV") next.classList.add("redcafe-final-hidden");
    });
  }

  function normalizePriceRow(r) {
    var fecha = r.fecha || r.mes || r.date || r.dia;
    var precio = Number(r.precio || r.usdQqal || r.centsLb || r.close || r.valor || r.cierre);
    if (!fecha || !isFinite(precio)) return null;
    return { fecha: fecha, precio: precio };
  }

  function drawPrices(board, rows, days, meta) {
    rows = rows.slice().sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); });
    var latest = rows[rows.length - 1];
    if (days > 0) {
      var cutoff = new Date(latest.fecha + "T00:00:00Z");
      cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
      var from = cutoff.toISOString().slice(0, 10);
      rows = rows.filter(function (r) { return r.fecha >= from; });
    }
    qs(".redcafe-price-value", board).textContent = latest ? "$" + latest.precio.toFixed(2) : "Sin datos";
    qs(".redcafe-price-date", board).textContent = latest
      ? "Último cierre disponible: " + latest.fecha + " · USD/quintal" + (meta && (meta.stale || meta.diario_stale) ? " · dato guardado" : "")
      : "Sin cierres diarios disponibles";
    var chart = qs(".redcafe-price-chart", board);
    if (rows.length < 2) {
      chart.innerHTML = '<p class="redcafe-launch-note">Histórico pendiente de actualización.</p>';
      return;
    }
    var h = 260, w = Math.max(320, Math.round(h * chart.clientWidth / Math.max(1, chart.clientHeight))), pad = 28;
    var vals = rows.map(function (r) { return r.precio; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (min === max) { min -= 1; max += 1; }
    var pts = rows.map(function (r, i) {
      var x = pad + (i * (w - pad * 2) / (rows.length - 1));
      var y = h - pad - ((r.precio - min) * (h - pad * 2) / (max - min));
      return [x, y, r];
    });
    var area = "M " + pts[0][0] + " " + (h - pad) + " L " + pts.map(function (p) { return p[0] + " " + p[1]; }).join(" L ") + " L " + pts[pts.length - 1][0] + " " + (h - pad) + " Z";
    var line = "M " + pts.map(function (p) { return p[0] + " " + p[1]; }).join(" L ");
    var marcas = [0, Math.floor((rows.length - 1) / 2), rows.length - 1].filter(function (i, pos, arr) { return arr.indexOf(i) === pos; });
    var ejeFechas = marcas.map(function (i) {
      return '<text x="' + pts[i][0] + '" y="' + (h - 5) + '" text-anchor="' + (i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle') + '" fill="#5c5a50" font-size="11">' + esc(rows[i].fecha.slice(5)) + '</text>';
    }).join('');
    chart.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" tabindex="0" aria-label="Gráfico de cierres diarios del café entre ' + esc(rows[0].fecha) + ' y ' + esc(latest.fecha) + '. Haz clic o usa las flechas para consultar fecha y precio.">' +
      '<path d="' + area + '" fill="rgba(166,106,44,.16)"></path>' +
      '<path d="' + line + '" fill="none" stroke="#a66a2c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></path>' +
      '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" stroke="rgba(59,26,12,.18)"></line>' + ejeFechas +
      '<text x="' + pad + '" y="' + (pad - 7) + '" fill="#2f2a24" font-size="13">$' + max.toFixed(2) + '</text>' +
      '<text x="' + pad + '" y="' + (h - pad - 5) + '" fill="#2f2a24" font-size="13">$' + min.toFixed(2) + '</text>' +
      '<line class="redcafe-price-crosshair" y1="' + pad + '" y2="' + (h - pad) + '" stroke="#5b2d17" stroke-dasharray="4 4" stroke-width="1.5" visibility="hidden"></line>' +
      '<circle class="redcafe-price-selected-point" r="5" fill="#a66a2c" stroke="white" stroke-width="2" visibility="hidden"></circle>' +
      '</svg><div class="redcafe-price-tooltip" role="status" aria-live="polite" hidden></div>';
    var svg = qs("svg", chart), crosshair = qs(".redcafe-price-crosshair", chart);
    var marker = qs(".redcafe-price-selected-point", chart), tooltip = qs(".redcafe-price-tooltip", chart);
    var seleccionado = -1, fijado = false;
    function mostrar(i) {
      seleccionado = Math.max(0, Math.min(rows.length - 1, i));
      var p = pts[seleccionado], r = rows[seleccionado];
      crosshair.setAttribute("x1", String(p[0]));
      crosshair.setAttribute("x2", String(p[0]));
      crosshair.setAttribute("visibility", "visible");
      marker.setAttribute("cx", String(p[0]));
      marker.setAttribute("cy", String(p[1]));
      marker.setAttribute("visibility", "visible");
      tooltip.hidden = false;
      tooltip.textContent = r.fecha + " · $" + r.precio.toFixed(2) + " USD/quintal";
      var pantalla = svg.createSVGPoint();
      pantalla.x = p[0]; pantalla.y = p[1];
      var xPantalla = pantalla.matrixTransform(svg.getScreenCTM()).x;
      var caja = chart.getBoundingClientRect();
      tooltip.style.left = Math.max(12, Math.min(88, (xPantalla - caja.left) / caja.width * 100)) + "%";
    }
    function indiceDeEvento(ev) {
      var punto = svg.createSVGPoint();
      punto.x = ev.clientX; punto.y = ev.clientY;
      var px = punto.matrixTransform(svg.getScreenCTM().inverse()).x;
      return Math.round((px - pad) / (w - pad * 2) * (rows.length - 1));
    }
    svg.addEventListener("pointermove", function (ev) { if (!fijado) mostrar(indiceDeEvento(ev)); });
    svg.addEventListener("click", function (ev) { fijado = true; mostrar(indiceDeEvento(ev)); });
    svg.addEventListener("keydown", function (ev) {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      fijado = true;
      mostrar(Math.max(0, seleccionado < 0 ? rows.length - 1 : seleccionado) + (ev.key === "ArrowLeft" ? -1 : 1));
    });
    renderDailyTable(board, rows);
  }

  function renderDailyTable(board, rows) {
    var grouped = {};
    rows.forEach(function (r) {
      var key = String(r.fecha).slice(0, 7);
      (grouped[key] || (grouped[key] = [])).push(r.precio);
    });
    var claves = Object.keys(grouped).sort().reverse().slice(0, 12);
    var variosPorMes = claves.some(function (k) { return grouped[k].length > 1; });
    qs("thead", board).innerHTML = variosPorMes
      ? "<tr><th>Mes</th><th>Promedio de cierres</th><th>Máximo</th><th>Mínimo</th></tr>"
      : "<tr><th>Mes</th><th>USD por quintal</th></tr>";
    qs("tbody", board).innerHTML = claves.map(function (key) {
      var arr = grouped[key], avg = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
      if (!variosPorMes) return "<tr><td>" + esc(key) + "</td><td>$" + avg.toFixed(2) + "</td></tr>";
      return "<tr><td>" + esc(key) + "</td><td>$" + avg.toFixed(2) + "</td><td>$" + Math.max.apply(null, arr).toFixed(2) + "</td><td>$" + Math.min.apply(null, arr).toFixed(2) + "</td></tr>";
    }).join("");
  }

  function enhancePanelOrders() {
    if (path !== "/panel/" || panelOrdersLoading || document.getElementById("redcafe-panel-orders")) return;
    if (agotadosLosIntentos("panel-pedidos")) return;
    panelOrdersLoading = true;
    api("/api/pedidos.php?action=list").then(function (res) {
      var pedidos = res.pedidos || [];
      var main = qs("main");
      if (!main) return;
      var wrap = document.createElement("section");
      wrap.id = "redcafe-panel-orders";
      wrap.setAttribute("data-redcafe-propio", "1");
      wrap.className = "mx-auto max-w-6xl px-4 py-6";
      wrap.innerHTML = '<div class="flex flex-wrap items-end justify-between gap-3 border-b border-cafe/10 pb-3"><div><p class="rotulo text-filtrado-600">Continuidad comercial</p><h2 class="font-titulo text-2xl font-bold text-cafe">Pedidos y solicitudes del Marketplace</h2></div><a class="redcafe-panel-link" href="/marketplace/">Solicitar en Marketplace</a></div><div class="redcafe-panel-orders-grid mt-5"></div>';
      main.insertAdjacentElement("afterbegin", wrap);
      var grid = qs(".redcafe-panel-orders-grid", wrap);
      if (!pedidos.length) {
        grid.innerHTML = '<p class="redcafe-launch-note">Todavía no tienes pedidos o solicitudes. Cuando solicites café o servicios, aparecerán aquí.</p>';
        return;
      }
      grid.innerHTML = pedidos.slice(0, 12).map(function (p) {
        return '<article class="redcafe-panel-order-card"><p class="rotulo text-filtrado-600">#' + esc(p.nro || "") + ' · ' + esc(p.tipo || "café") + '</p><h3 class="mt-1 font-titulo text-lg font-bold text-cafe">' + esc(p.servicio || p.finca || "Pedido") + '</h3><p class="mt-1 text-sm text-pizarra-suave">' + esc(p.productor || p.proveedor || "") + '</p><p class="mt-2 font-semibold text-cafe">' + esc(p.estado || "Solicitado") + '</p><p class="mt-1 text-xs text-pizarra-suave">' + esc(p.fecha || "") + '</p></article>';
      }).join("");
    }).catch(function () {}).finally(function () {
      panelOrdersLoading = false;
      anotarIntento("panel-pedidos");
    });
  }

  function panelFooterCard(title, body, href, cta) {
    return '<a class="redcafe-panel-resource-card" href="' + esc(href) + '">' +
      '<h3>' + esc(title) + '</h3><p>' + esc(body) + '</p><span>' + esc(cta || "Explorar") + ' →</span></a>';
  }

  function enhancePanelResources() {
    if (path !== "/panel/" || panelResourcesLoading || document.getElementById("redcafe-panel-resources")) return;
    if (agotadosLosIntentos("panel-recursos")) return;
    panelResourcesLoading = true;
    api("/api/auth.php?action=me").then(function (res) {
      if (!res || !res.user) return;
      var main = qs("main");
      if (!main) return;
      var wrap = document.createElement("section");
      wrap.id = "redcafe-panel-resources";
      wrap.setAttribute("data-redcafe-propio", "1");
      wrap.className = "mx-auto max-w-6xl px-4 pb-12 pt-8";
      wrap.innerHTML =
        '<div class="redcafe-panel-resources-head">' +
          '<p class="rotulo text-filtrado-600">Todo lo de esta sección entra con tu cuenta gratuita</p>' +
          '<h2>Lo que cambia para ti cuando entras en la Red</h2>' +
          '<p>El registro y las herramientas básicas no tienen costo. Los servicios especializados se contratan aparte, solo si los necesitas.</p>' +
        '</div>' +
        '<div class="redcafe-panel-resource-grid">' +
          panelFooterCard("Marketplace", "Publica lotes de café, encuentra oferta disponible y coordina operaciones con origen visible.", "/marketplace/", "Explorar") +
          panelFooterCard("Academia", "Aprende lo que de verdad sube el precio de tu café: proceso, secado y taza.", "/academia/", "Explorar") +
          panelFooterCard("Servicios", "Resuelve lo que te frena: exportar, formalizarte, cumplir con Europa.", "/servicios/", "Explorar") +
          panelFooterCard("Confianza", "Sabes con quién tratas antes de mandar un solo saco.", "/comunidad/", "Explorar") +
        '</div>' +
        '<div class="redcafe-panel-resources-head redcafe-panel-resources-gap">' +
          '<p class="rotulo text-filtrado-600">Herramientas para negociar con números, no a ciegas</p>' +
        '</div>' +
        '<div class="redcafe-panel-resource-grid redcafe-panel-resource-grid-tools">' +
          panelFooterCard("Panel de Precios del Mercado", "Referencia ICE C y diferenciales para fijar tu oferta con información.", "/servicios/precios/", "Ver más") +
          panelFooterCard("Calculadora de Venta", "Convierte quintales y sacos, estima tu ingreso neto y margen por lote.", "/servicios/calculadora/", "Ver más") +
          panelFooterCard("Dossier EUDR de tu Finca", "Registra el GPS de tu finca y genera el documento de debida diligencia listo para exportar.", "/servicios/eudr/", "Ver más") +
          panelFooterCard("Facturación Electrónica", "Herramientas de apoyo para organizar y emitir documentación comercial desde la Red.", "/servicios/factura/", "Ver más") +
          panelFooterCard("Soporte y Comunidad WhatsApp", "Asistencia directa y una red de contactos comerciales en tu canal favorito.", "/comunidad/", "Ver más") +
        '</div>' +
        '<div class="redcafe-panel-eudr">' +
          '<div><p class="rotulo text-filtrado-600">Cuenta atrás europea</p><h2>Tu comprador te va a pedir el origen antes de que llegue la fecha</h2>' +
          '<p>El reglamento europeo se aplica desde el <b>30 de diciembre de 2026</b> a los compradores grandes y medianos, y desde el <b>30 de junio de 2027</b> a los pequeños. La obligación es de ellos, pero necesitan los datos de tu finca para cumplirla: <b>te los pedirán entre seis y doce meses antes</b>.</p></div>' +
          '<div class="redcafe-action-row"><a href="/servicios/eudr/">Arma tu expediente</a><a href="/servicios/">Hablar con un asesor</a></div>' +
        '</div>' +
        '<div class="redcafe-panel-split">' +
          '<article><p class="rotulo text-filtrado-600">Precio de mercado del café</p><h3>El ticker muestra la cotización internacional base.</h3><p>En el panel completo ves histórico, fuentes oficiales y referencias para estimar precio en Ecuador.</p><a href="/servicios/precios/">Ver panel completo →</a></article>' +
          '<article><p class="rotulo text-filtrado-600">Cómo garantizamos la confianza</p><h3>Una Red basada en personas reales</h3><p>La confianza comienza sabiendo con quién estás conectando: perfil claro, información de finca o empresa y contacto directo entre miembros.</p><a href="/servicios/">Conoce cómo funciona →</a></article>' +
        '</div>';
      main.insertAdjacentElement("beforeend", wrap);
    }).catch(function () {}).finally(function () {
      panelResourcesLoading = false;
      anotarIntento("panel-recursos");
    });
  }

  function enhancePaymentsText() {
    if (path !== "/servicios/contratar/") return;
    qsa("p,li,span,div").forEach(function (el) {
      if (el.children.length || el.getAttribute("data-redcafe-oculto-react") === "1") return;
      var t = text(el);
      if (/cuenta|transferencia bancaria|referencia/i.test(t) && t.length < 280) {
        reemplazarTextoSeguro(el, "Solicita los datos de pago actualizados por WhatsApp antes de realizar cualquier pago.", false);
      }
    });
  }

  function enhanceTickerSourceLabel() {
    qsa("a").forEach(function (a) {
      if (text(a) !== "Fuente oficial") return;
      if (a.getAttribute("data-redcafe-oculto-react") === "1") return;
      a = reemplazarTextoSeguro(a, "Fuente", false);
      a.title = "Fuente: KC=F vía Yahoo Finance";
      if (/ico\.org|coffee_prices/i.test(a.href || "")) {
        a.href = "https://finance.yahoo.com/quote/KC=F/";
      }
    });
  }

  function run() {
    path = normalizePath(location.pathname);
    limpiarCopiasHuerfanas();
    setRouteFlag();
    redirectLoggedHome();
    enhanceNav();
    hideLimitedTimeRegistrationCopy();
    clarifyCoffeeLotCopy();
    addHomeLoginButton();
    enhanceHomeHeroCopy();
    enhanceHomeProfilePanel();
    ensureHomePriceStrip();
    enhanceLoginRegisterChoice();
    enhanceAfiliate();
    enhanceMarketplace();
    enhanceServiciosPage();
    patchSupportWhatsAppLink();
    enhancePricePage();
    if (path === "/servicios/precios/") hideOldDailyPriceTable();
    enhancePanelOrders();
    enhancePanelResources();
    enhancePaymentsText();
    enhanceTickerSourceLabel();
  }

  function startEnhancements() {
    run();
    var n = 0;
    var timer = setInterval(function () {
      run();
      n += 1;
      if (n > 16) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === "complete") {
    setTimeout(startEnhancements, 2200);
  } else {
    window.addEventListener("load", function () {
      setTimeout(startEnhancements, 2200);
    }, { once: true });
  }
  new MutationObserver(function () {
    if (window.__redcafeFinalTick) return;
    window.__redcafeFinalTick = setTimeout(function () {
      window.__redcafeFinalTick = null;
      run();
    }, 120);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();


/* ======================================================================
   NOTIFICACIONES Origen · 20260916d · MÓVIL-FIRST
   Campana flotante (fab) con contador + panel "centro de notificaciones"
   deslizable (móvil: bottom-sheet; escritorio: panel derecho) + toasts.
   API global (no colisiona con nada existente):
     window.RedCafeNotif = { notificar(opts), toasts(titulo,texto,tipo),
                             contar(), marcarTodasLeidas() }
   Prefijo de clases/id: 'redcafe-notif-*'. Se auto-inyecta el HTML del fab
   y del panel si no están en el marcado. No depende de librerías.
   ====================================================================== */
(function () {
  "use strict";
  if (window.RedCafeNotif) { return; }

  var P = "redcafe-notif";
  var notifGlobal = [];
  var prefijoLS = "rc-notif-leidas";

  function id(x) { return P + "-" + x; }

  function comprobarEstructura() {
    var fab = document.getElementById(id("fab"));
    var panel = document.getElementById(id("panel"));
    if (!fab) {
      fab = document.createElement("button");
      fab.id = id("fab");
      fab.type = "button";
      fab.className = P + "-fab";
      fab.setAttribute("role", "button");
      fab.setAttribute("aria-label", "Abrir centro de notificaciones");
      fab.setAttribute("aria-haspopup", "dialog");
      fab.setAttribute("aria-expanded", "false");
      fab.innerHTML =
        '<svg class="' + P + '-icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22Zm7-4.6v-2.4l-1.6-1.3v-4.7a5.65 5.65 0 0 0-4.4-5.5v-.9a1 1 0 1 0-2 0v.9a5.65 5.65 0 0 0-4.4 5.5v4.7L5 15v2.4h14Z"/></svg>' +
        '<span class="' + P + '-contador" id="' + id("contador") + '" hidden>0</span>';
      document.body.appendChild(fab);
      fab.addEventListener("click", function () { abrir(); });
    }
    if (!panel) {
      panel = document.createElement("div");
      panel.id = id("panel");
      panel.className = P + "-panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", "Centro de notificaciones");
      panel.hidden = true;
      panel.innerHTML =
        '<div class="' + P + '-panel-cab">' +
          '<h3 class="' + P + '-panel-titulo">Notificaciones</h3>' +
          '<button type="button" class="' + P + '-panel-cerrar" id="' + id("cerrar") + '" aria-label="Cerrar">&#215;</button>' +
        '</div>' +
        '<div class="' + P + '-lista" id="' + id("lista") + '" role="list"></div>' +
        '<div class="' + P + '-panel-pie">' +
          '<button type="button" id="' + id("marcar") + '" class="' + P + '-marcar">Marcar como leídas</button>' +
        '</div>';
      document.body.appendChild(panel);
      document.getElementById(id("cerrar")).addEventListener("click", cerrar);
    }
  }

  function pintar() {
    var lista = document.getElementById(id("lista"));
    if (!lista) { return; }
    var contador = document.getElementById(id("contador"));
    var sinLeer = notifGlobal.filter(function (it) { return !it.leida; }).length;
    if (contador) {
      contador.hidden = sinLeer === 0;
      contador.textContent = sinLeer > 9 ? "9+" : String(sinLeer);
    }
    if (!notifGlobal.length) {
      lista.innerHTML = '<p class="' + P + '-vacio">Aún no tienes notificaciones.</p>';
      return;
    }
    var html = "";
    notifGlobal.slice().reverse().forEach(function (it) {
      html +=
        '<div class="' + P + '-item' + (it.leida ? " leida" : " no-leida") + '" role="listitem">' +
          '<div class="' + P + '-item-cuerpo">' +
            '<strong class="' + P + '-item-titulo">' + esc(it.titulo) + '</strong>' +
            (it.texto ? '<p class="' + P + '-item-texto">' + esc(it.texto) + '</p>' : "") +
            '<span class="' + P + '-item-hora">' + esc(it.tipo + " · " + it.ts) + '</span>' +
          '</div>' +
          '<button type="button" class="' + P + '-item-cerrar" aria-label="Quitar notificación">&#215;</button>' +
        '</div>';
    });
    lista.innerHTML = html;
    Array.prototype.forEach.call(lista.querySelectorAll("." + P + "-item-cerrar"), function (btn, i) {
      btn.addEventListener("click", function () {
        notifGlobal.splice(notifGlobal.length - 1 - i, 1);
        pintar();
      });
    });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function notificar(opts) {
    opts = opts || {};
    var item = {
      titulo: opts.titulo || "Red Café Ecuador",
      texto: opts.texto || "",
      tipo: opts.tipo || "info",      // info | exito | alerta
      ts: new Date(),
      leida: false
    };
    notifGlobal.push(item);
    persistir();
    pintar();
    toast(item);
    if (opts.tipo === "alerta") { marcarSonido(); }
    return item;
  }

  function toast(item) {
    var tipo = item.tipo || "info";
    var t = document.createElement("div");
    t.className = P + "-toast " + P + "-toast-" + tipo;
    t.setAttribute("role", "status");
    t.innerHTML =
      '<span class="' + P + '-toast-titulo">' + esc(item.titulo) + '</span>' +
      (item.texto ? '<span class="' + P + '-toast-texto">' + esc(item.texto) + '</span>' : "") +
      '<button type="button" class="' + P + '-toast-cerrar" aria-label="Cerrar aviso">&#215;</button>';
    document.body.appendChild(t);
    var cerrar = t.querySelector("." + P + "-toast-cerrar");
    if (cerrar) { cerrar.addEventListener("click", function () { quitarToast(t); }); }
    setTimeout(function () { quitarToast(t); }, tipo === "alerta" ? 6000 : 4000);
  }

  function quitarToast(t) {
    if (t && t.parentNode) { t.parentNode.removeChild(t); }
  }

  function marcarSonido() {
    try {
      if (typeof Audio !== "undefined") {
        var a = new Audio();
        a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
        a.volume = .35; a.play();
      }
    } catch (e) { /* silencioso */ }
  }

  function abrir() {
    var panel = document.getElementById(id("panel"));
    var fab = document.getElementById(id("fab"));
    if (!panel) { return; }
    panel.hidden = false;
    pintar();
    if (fab) { fab.setAttribute("aria-expanded", "true"); }
  }

  function cerrar() {
    var panel = document.getElementById(id("panel"));
    var fab = document.getElementById(id("fab"));
    if (panel) { panel.hidden = true; }
    if (fab) { fab.setAttribute("aria-expanded", "false"); }
  }

  function persistir() {
    try {
      localStorage.setItem(prefijoLS, JSON.stringify(notifGlobal.map(function (it) {
        return { titulo: it.titulo, texto: it.texto, tipo: it.tipo, ts: String(it.ts), leida: it.leida };
      })));
    } catch (e) { /* silencioso */ }
  }

  function cargar() {
    try {
      var raw = localStorage.getItem(prefijoLS);
      if (!raw) { return; }
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) { return; }
      notifGlobal = arr.map(function (it) {
        return { titulo: it.titulo, texto: it.texto, tipo: it.tipo, ts: it.ts, leida: it.leida };
      });
    } catch (e) { /* silencioso */ }
  }

  function marcarTodasLeidas() {
    notifGlobal.forEach(function (it) { it.leida = true; });
    persistir(); pintar();
  }

  function init() {
    cargar();
    comprobarEstructura();
    pintar();
    var marcar = document.getElementById(id("marcar"));
    if (marcar) {
      marcar.addEventListener("click", function () {
        marcarTodasLeidas();
        var marca = document.getElementById(id("marcar"));
        if (marca) { marca.textContent = "Todas leídas"; }
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var panel = document.getElementById(id("panel"));
        if (panel && !panel.hidden) { cerrar(); }
      }
    });
    window.RedCafeNotif = {
      notificar: notificar,
      toast: function (titulo, texto, tipo) { notificar({ titulo: titulo, texto: texto, tipo: tipo }); },
      contar: function () { return notifGlobal.length; },
      marcarTodasLeidas: marcarTodasLeidas,
      demo: function (n) {
        var tipos = ["info", "exito", "alerta"];
        n = n || 4;
        for (var i = 0; i < n; i++) {
          var t = tipos[i % tipos.length];
          notificar({ titulo: "Notificación " + (i + 1), texto: "Ejemplo de tipo " + t + " — Origen 20260916d.", tipo: t });
        }
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


/* ======================================================================
   PANEL HOME · Origen · 20260916e · móvil-first
   Reemplaza <section id="perfiles"> por un mosaico de acceso a los
   servicios principales (iconos + título corto + CTA registro).
   Los textos largos de las tarjetas POSTERIORES se colapsan ("Saber más").
   TODO lo anterior a #perfiles queda intacto (decisión del dueño).
   Guarda de degradación: si no existe #perfiles, no hace nada.
   Prefijo rc-homepanel-* · API window.RedCafeHomePanel. Autocontenido IIFE.
   ====================================================================== */
(function () {
  "use strict";
  if (window.RedCafeHomePanel) { return; }
  var P = "rc-homepanel";

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (html !== undefined && html !== null) { n.innerHTML = html; }
    return n;
  }

  var SERVICIOS = [
    { icono: "🛒", titulo: "Marketplace", sub: "Compra y vende lotes con origen", href: "/marketplace" },
    { icono: "☕", titulo: "Publicar mi café", sub: "Productor: muestra tus lotes", href: "/afiliate?rol=productor" },
    { icono: "📈", titulo: "Precios de mercado", sub: "ICE y diferenciales en vivo", href: "/servicios/precios" },
    { icono: "🎓", titulo: "Academia", sub: "Cata, proceso, recetas", href: "/academia" },
    { icono: "🧾", titulo: "Facturación", sub: "Emite documentos desde la Red", href: "/servicios/factura" },
    { icono: "🌱", titulo: "Dossier EUDR", sub: "Trazabilidad de tu finca", href: "/servicios/eudr" },
    { icono: "💼", titulo: "Empleos", sub: "Vacantes y perfiles de la Red", href: "/carreras-empleos" },
    { icono: "🤝", titulo: "Requerimientos", sub: "Publica lo que necesitas", href: "/requerimientos" }
  ];

  function iconosHTML() {
    var h = '<div class="' + P + '-mosaico">';
    SERVICIOS.forEach(function (s) {
      h += '<a class="' + P + '-item group" href="' + s.href + '">' +
             '<span class="' + P + '-icono" aria-hidden="true">' + s.icono + '</span>' +
             '<strong>' + s.titulo + '</strong>' +
             '<span class="' + P + '-sub">' + s.sub + '</span>' +
             '<span class="' + P + '-cta">Abrir →</span>' +
           '</a>';
    });
    return h + '</div>';
  }

  function colapsarLargos() {
    // Después de #perfiles: convierte párrafos largos de las tarjetas en
    // "Saber más" expandible. No borra contenido: lo oculta y lo restaura.
    var secciones = document.querySelectorAll("section");
    var encontrado = false;
    Array.prototype.forEach.call(secciones, function (sec) {
      if (encontrado) {
        Array.prototype.forEach.call(sec.querySelectorAll("p"), function (p) {
          var t = (p.textContent || "").trim();
          if (t.length > 110 && !p.getAttribute("data-"+P+"-parrafo")) {
            p.setAttribute("data-"+P+"-parrafo", "1");
            var corto = t.slice(0, 95) + "…";
            var original = p.innerHTML;
            p.innerHTML = '<span class="' + P + '-resumen">' + corto + '</span>' +
                          ' <button type="button" class="' + P + '-mas" data-' + P + '-origen="">Saber más</button>';
            (function (p, original) {
              var btn = p.querySelector("." + P + "-mas");
              btn.addEventListener("click", function () {
                if (btn.getAttribute("data-"+P+"-origen") === "1") {
                  p.innerHTML = '<span class="' + P + '-resumen">' + corto + '</span>' +
                                ' <button type="button" class="' + P + '-mas" data-' + P + '-origen="">Saber más</button>';
                  p.querySelector("." + P + "-mas").addEventListener("click", arguments.callee);
                } else {
                  p.innerHTML = original;
                  btn = null;
                }
              });
            })(p, original);
          }
        });
        return;
      }
      if (sec.id === "perfiles") { encontrado = true; }
    });
  }

  function construir() {
    var seccion = document.getElementById("perfiles");
    if (!seccion) { return false; } // guarda: nada que reemplazar

    var tarjetas = seccion;
    // La sección #perfiles ES el contenedor (badge + título + tarjetas).
    var nuevo = el("section", "py-16 md:py-24 " + P + "-seccion", "");
    nuevo.id = "perfiles"; // conserva el ancla/scroll
    nuevo.innerHTML =
      '<div class="mx-auto max-w-6xl px-4">' +
        '<p class="badge badge-verde">Crear tu perfil es gratis · solo pagas los servicios especializados que uses</p>' +
        '<h2 class="titulo-subrayado mt-3 max-w-xl font-titulo text-3xl font-bold text-cafe md:text-4xl">Accede a la Red por servicio</h2>' +
        '<p class="mt-3 max-w-2xl text-pizarra-suave">Elige lo que quieres hacer y entra directo. Tu perfil gratuito te da herramientas para publicar, comprar, vender, revisar precios y organizar tu operación.</p>' +
        '<div class="mt-6 flex flex-wrap gap-3">' +
          '<a href="/afiliate" class="btn-accent min-h-11">Crear mi perfil gratis</a>' +
          '<a href="/afiliate?rol=vendedor" class="inline-flex min-h-11 items-center border border-cafe/30 px-6 py-3 font-semibold text-cafe transition hover:bg-crema/40">Conoce los beneficios</a>' +
        '</div>' +
        iconosHTML() +
      '</div>';

    tarjetas.parentNode.replaceChild(nuevo, tarjetas);
    return true;
  }

  function aplicaEstilos() {
    if (document.getElementById(P + "-style")) { return; }
    var st = document.createElement("style");
    st.id = P + "-style";
    st.textContent =
      "." + P + "-mosaico{display:grid;grid-template-columns:repeat(2,1fr);gap:.75rem}@media(min-width:640px){." + P + "-mosaico{grid-template-columns:repeat(3,1fr);gap:1rem}}@media(min-width:1024px){." + P + "-mosaico{grid-template-columns:repeat(4,1fr)}}" +
      "." + P + "-item{display:flex;flex-direction:column;align-items:flex-start;gap:.2rem;border:1px solid rgba(59,26,12,.10);border-radius:1rem;background:#fff;padding:1rem 1.1rem;transition:border-color .15s,box-shadow .15s}" +
      "." + P + "-item:hover{border-color:rgba(169,78,23,.45);box-shadow:0 10px 24px rgba(28,20,12,.08)}" +
      "." + P + "-item ." + P + "-icono{font-size:1.5rem;line-height:1}" +
      "." + P + "-item strong{font-family:var(--rc-titulo);font-size:1rem;font-weight:700;color:#2a170c}" +
      "." + P + "-item ." + P + "-sub{font-size:.78rem;line-height:1.35;color:#6d5a49}" +
      "." + P + "-item ." + P + "-cta{font-size:.78rem;font-weight:700;letter-spacing:.02em;color:#a94e17;text-decoration:underline;text-underline-offset:3px;opacity:0;transform:translateY(2px);transition:opacity .15s}" +
      "." + P + "-item:hover ." + P + "-cta{opacity:1;transform:none}" +
      "." + P + "-resumen{white-space:normal}" +
      "." + P + "-mas{background:none;border:0;padding:0;margin-left:.35rem;color:#a94e17;font-weight:700;cursor:pointer;text-underline-offset:3px;text-decoration:underline}" +
      "@media(max-width:480px){." + P + "-mosaico{grid-template-columns:repeat(2,1fr)}}" +
      "@media(max-width:375px){." + P + "-item{padding:.85rem .9rem}." + P + "-item strong{font-size:.92rem}}";
    document.head.appendChild(st);
  }

  function iniciar() {
    aplicaEstilos();
    construir();
    colapsarLargos();
  }

  window.RedCafeHomePanel = {
    iniciar: iniciar,
    construir: construir,
    colapsar: colapsarLargos,
    activo: false
  };

  // DESACTIVADO 17 sep (Claude). No se arranca solo, por cuatro motivos:
  // 1) construir() usaba una variable inexistente (`tarjetashed`): error al
  //    cargar la portada; 2) colapsarLargos() usa arguments.callee, que en
  //    modo estricto lanza TypeError; 3) sustituía <section id="perfiles"> de
  //    React y reescribía con innerHTML sus párrafos, lo que rompe React y
  //    quitaba el desplegable «Ver perfiles disponibles» que el propietario
  //    pidió conservar; 4) enlazaba a /carreras-empleos y /requerimientos,
  //    que dan 404. El código se conserva para rehacerlo con la capa segura
  //    (ocultar + copia marcada) si el propietario confirma el mosaico.
})();
