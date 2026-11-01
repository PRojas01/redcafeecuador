/* React debe terminar de «hidratar» la página antes de que esta capa toque su
   DOM. Si se modifica antes, React ve un HTML distinto del que esperaba
   (error #418) y vuelve a pintarla. Está hidratada cuando <main> lleva las
   propiedades internas __reactFiber…; en páginas sin <main>, cuando existe
   el <body> hidratado. */
window.__redcafeReactListo = window.__redcafeReactListo || function () {
  var m = document.querySelector("main") || document.body;
  if (!m) return false;
  for (var k in m) { if (k.indexOf("__reactFiber") === 0 || k.indexOf("__reactContainer") === 0) return true; }
  return false;
};

(function () {
  "use strict";

  var VERSION = "20261101b";
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

  function enhanceHomeHeroCopy() {
    if (path !== "/") return;
    var heroTitle = qs("main section:first-of-type h1");
    // React ya pinta este titular (20261005): sin copia ni ocultación.
    if (heroTitle && text(heroTitle).indexOf("Crea tu perfil y conecta") !== 0 && heroTitle.getAttribute("data-redcafe-oculto-react") !== "1" && !heroTitle.closest("[data-redcafe-propio]")) {
      reemplazarTextoSeguro(heroTitle, 'Crea tu perfil y conecta con oportunidades del <span class="text-acento-claro">café ecuatoriano</span>', true);
    }
    var heroParagraph = qsa("main section p").find(function (p) {
      var t = text(p);
      return t === "Una plataforma para que productores, tostadores, compradores, cafeterías, asesores y proveedores del café ecuatoriano puedan mostrarse, conectar y encontrar oportunidades comerciales." ||
        t === "Red Café Ecuador conecta a quienes trabajan en el negocio cafetero para mostrar oferta, encontrar oportunidades y decidir con más información." ||
        t === "Red Café Ecuador conecta productores, tostadores, compradores, cafeterías, asesores y proveedores en una plataforma abierta para mostrar oferta, encontrar oportunidades y trabajar con más información." ||
        t === "Red Café Ecuador conecta actores del negocio cafetero en una plataforma abierta para mostrar oferta, encontrar oportunidades y trabajar con más información.";
    });
    if (!heroParagraph) return;
    reemplazarTextoSeguro(heroParagraph, "Compra y vende café directo, sin intermediarios ni comisiones. Tu perfil gratis en dos minutos.", false);
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

  // Franja del precio de la portada: migrada a React (components/PortadaDatos.tsx).

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

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch];
    });
  }















  // Pizarra de cierres diarios de /servicios/precios/: migrada a React (ClientPage · PizarraDiaria).

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

  function run() {
    path = normalizePath(location.pathname);
    limpiarCopiasHuerfanas();
    setRouteFlag();
    redirectLoggedHome();
    enhanceNav();
    hideLimitedTimeRegistrationCopy();
    enhanceHomeHeroCopy();
    enhanceHomeProfilePanel();
    enhanceLoginRegisterChoice();
    enhancePanelOrders();
    enhancePanelResources();
    enhancePaymentsText();
  }

  function startEnhancements() {
    if (!window.__redcafeReactListo()) { setTimeout(startEnhancements, 200); return; }
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
      // Antes de la hidratación no se toca nada; el observador volverá a
      // dispararse con los cambios que haga la propia hidratación.
      if (!window.__redcafeReactListo()) return;
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

  // Igual que arriba: esperar a que React haya hidratado (máx. ~8 s).
  function initTrasHidratar(n) {
    if (window.__redcafeReactListo() || n > 40) { init(); return; }
    setTimeout(function () { initTrasHidratar(n + 1); }, 200);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { initTrasHidratar(0); });
  } else {
    initTrasHidratar(0);
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
      "." + P + "-item{display:flex;flex-direction:column;align-items:flex-start;gap:.2rem;border:1px solid rgba(140,30,14,.10);border-radius:1rem;background:#fff;padding:1rem 1.1rem;transition:border-color .15s,box-shadow .15s}" +
      "." + P + "-item:hover{border-color:rgba(169,78,23,.45);box-shadow:0 10px 24px rgba(20,31,26,.08)}" +
      "." + P + "-item ." + P + "-icono{font-size:1.5rem;line-height:1}" +
      "." + P + "-item strong{font-family:var(--rc-titulo);font-size:1rem;font-weight:700;color:#561008}" +
      "." + P + "-item ." + P + "-sub{font-size:.78rem;line-height:1.35;color:#6d5a49}" +
      "." + P + "-item ." + P + "-cta{font-size:.78rem;font-weight:700;letter-spacing:.02em;color:#8c1e0e;text-decoration:underline;text-underline-offset:3px;opacity:0;transform:translateY(2px);transition:opacity .15s}" +
      "." + P + "-item:hover ." + P + "-cta{opacity:1;transform:none}" +
      "." + P + "-resumen{white-space:normal}" +
      "." + P + "-mas{background:none;border:0;padding:0;margin-left:.35rem;color:#8c1e0e;font-weight:700;cursor:pointer;text-underline-offset:3px;text-decoration:underline}" +
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
