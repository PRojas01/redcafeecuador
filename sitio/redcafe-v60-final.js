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

  var VERSION = "20261127e";
  var WAPP = "593968641376";
  var path = normalizePath(location.pathname);
  var homeAuthChecking = false;

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

  /* Cabecera, menú «Más», menú móvil y tarjeta «Crea tu perfil gratis» del login: en React. */


  /* (Las copias de texto sobre nodos de React se retiraron: los textos ya están en React.) */


  // Franja del precio de la portada: migrada a React (components/PortadaDatos.tsx).




  // Pizarra de cierres diarios de /servicios/precios/: migrada a React (ClientPage · PizarraDiaria).





  function run() {
    path = normalizePath(location.pathname);
    setRouteFlag();
    redirectLoggedHome();
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
      "." + P + "-item{display:flex;flex-direction:column;align-items:flex-start;gap:.2rem;border:1px solid rgba(140, 54, 4,.10);border-radius:1rem;background:#fff;padding:1rem 1.1rem;transition:border-color .15s,box-shadow .15s}" +
      "." + P + "-item:hover{border-color:rgba(169,78,23,.45);box-shadow:0 10px 24px rgba(20,31,26,.08)}" +
      "." + P + "-item ." + P + "-icono{font-size:1.5rem;line-height:1}" +
      "." + P + "-item strong{font-family:var(--rc-titulo);font-size:1rem;font-weight:700;color:#5e2402}" +
      "." + P + "-item ." + P + "-sub{font-size:.78rem;line-height:1.35;color:#6d5a49}" +
      "." + P + "-item ." + P + "-cta{font-size:.78rem;font-weight:700;letter-spacing:.02em;color:#8c3604;text-decoration:underline;text-underline-offset:3px;opacity:0;transform:translateY(2px);transition:opacity .15s}" +
      "." + P + "-item:hover ." + P + "-cta{opacity:1;transform:none}" +
      "." + P + "-resumen{white-space:normal}" +
      "." + P + "-mas{background:none;border:0;padding:0;margin-left:.35rem;color:#8c3604;font-weight:700;cursor:pointer;text-underline-offset:3px;text-decoration:underline}" +
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

/* Fotos de la portada: ahora en React (components/PortadaFotos.tsx). */

/* Sellos de Red Café sobre el fondo de saco (2026-11-11): como la tinta de los sacos de café.
   Solo se ponen en huecos sin texto, fotos, botones ni tarjetas; se recolocan si la página cambia
   de tamaño. Decorativos (aria-hidden, sin eventos). No tocan el DOM de React: van en una capa
   propia al final de <body>, después de hidratar. */
(function () {
  if (typeof window === "undefined" || !window.ResizeObserver) return;
  var URL_SELLO = "/img/sello-redcafe.svg?v=20261127e";
  var capa = null, temporizador = 0, ultimaFirma = "";
  var BANDA = 120;

  function transparente(c) { return !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c); }

  function ocupadas(main) {
    var cajas = [], els = main.querySelectorAll("*"), i, el, cs, r;
    for (i = 0; i < els.length; i++) {
      el = els[i];
      if (el.closest(".redcafe-sellos")) continue;
      r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      var saco = (cs.backgroundImage || "").indexOf("textura-saco") >= 0;
      var oscuro = false, rgb = (cs.backgroundColor.match(/\d+(\.\d+)?/g) || []).map(Number);
      if (saco && rgb.length >= 3 && (rgb.length < 4 || rgb[3] > .5) && rgb[0] + rgb[1] + rgb[2] < 540) { saco = false; oscuro = true; }
      var antes = getComputedStyle(el, "::before"), despues = getComputedStyle(el, "::after");
      var pseudo = [antes, despues].some(function (p) { return p.content !== "none" && p.content !== "normal" && ((p.backgroundImage !== "none" && p.backgroundImage.indexOf("textura-saco") < 0) || !transparente(p.backgroundColor)) && p.opacity > .2; });
      var marca = el.id === "portada-hero" || pseudo || oscuro || /(^|\s)(hero|hero-gradient|bg-cafe)(\s|$)/.test(el.className && el.className.baseVal === undefined ? el.className : "") || /^(IMG|SVG|svg|BUTTON|INPUT|SELECT|TEXTAREA|IFRAME|VIDEO|CANVAS|PICTURE|LABEL)$/.test(el.tagName) ||
        el.classList.contains("leaflet-container") ||
        (!transparente(cs.backgroundColor) && (cs.backgroundImage || "").indexOf("textura-saco") < 0) ||
        (cs.backgroundImage !== "none" && (cs.backgroundImage || "").indexOf("textura-saco") < 0) ||
        (!saco && cs.boxShadow !== "none");
      var bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0, bl = parseFloat(cs.borderLeftWidth) || 0, bd = parseFloat(cs.borderRightWidth) || 0;
      if (!saco && !marca && bt && bb && bl && bd) marca = true;
      if (marca) { cajas.push(r); continue; }
      // Una línea separadora (borde de un solo lado) ocupa solo esa línea.
      if (!saco) {
        if (bt) cajas.push({ left: r.left, right: r.right, top: r.top, bottom: r.top + bt });
        if (bb) cajas.push({ left: r.left, right: r.right, top: r.bottom - bb, bottom: r.bottom });
        if (bl) cajas.push({ left: r.left, right: r.left + bl, top: r.top, bottom: r.bottom });
        if (bd) cajas.push({ left: r.right - bd, right: r.right, top: r.top, bottom: r.bottom });
      }
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3 && n.nodeValue.trim()) {
          var rg = document.createRange(); rg.selectNodeContents(n);
          var lista = rg.getClientRects();
          for (var k = 0; k < lista.length; k++) cajas.push(lista[k]);
        }
      }
    }
    return cajas;
  }

  function colocar() {
    temporizador = 0;
    var main = document.querySelector("main");
    if (!main) return;
    var mr = main.getBoundingClientRect();
    var firma = Math.round(mr.width) + "x" + Math.round(mr.height) + ":" + main.querySelectorAll("*").length;
    if (firma === ultimaFirma && capa && capa.isConnected) return;
    ultimaFirma = firma;
    var movil = window.innerWidth < 768, M = movil ? 8 : 10;
    var sx = window.scrollX || 0, sy = window.scrollY || 0;
    var cajas = ocupadas(main), bandas = {};
    cajas.forEach(function (r) {
      for (var b = Math.floor((r.top - M) / BANDA); b <= Math.floor((r.bottom + M) / BANDA); b++) (bandas[b] = bandas[b] || []).push(r);
    });
    function libre(x, y, S) {
      var b0 = Math.floor(y / BANDA), b1 = Math.floor((y + S) / BANDA);
      for (var b = b0; b <= b1; b++) {
        var l = bandas[b]; if (!l) continue;
        for (var i = 0; i < l.length; i++) {
          var r = l[i];
          if (x < r.right + M && x + S > r.left - M && y < r.bottom + M && y + S > r.top - M) return false;
        }
      }
      return true;
    }
    // Cada hueco recibe un solo sello, del mayor tamaño que quepa (proporcional al espacio).
    var MAX = movil ? 132 : 190, MIN = movil ? 50 : 66, PASO_T = movil ? 8 : 10, paso = movil ? 12 : 20;
    var borde = movil ? 10 : 24, izq = Math.max(mr.left, 0) + borde, derecha = Math.min(mr.right, document.documentElement.clientWidth) - borde;
    var alto = mr.bottom - mr.top, maximo = Math.max(4, Math.min(movil ? 8 : 10, Math.round(alto / (movil ? 420 : 500))));
    function cabe(x, y) {
      for (var t = MAX; t >= MIN; t -= PASO_T) {
        if (x + t <= derecha && y + t <= mr.bottom - 8 && libre(x, y, t)) return t;
      }
      return 0;
    }
    var cand = [];
    for (var y = mr.top + 8; y < mr.bottom - MIN; y += paso)
      for (var x = izq; x <= derecha - MIN; x += paso) { var t = cabe(x, y); if (t) cand.push({ x: x, y: y, t: t }); }
    cand.sort(function (a, b) { return b.t - a.t || a.y - b.y; });
    var puestos = [];
    function choca(x, y, t) {
      for (var i = 0; i < puestos.length; i++) {
        var p = puestos[i], e = Math.max(40, Math.max(p.s, t) * .5);
        if (x < p.x + p.s + e && x + t > p.x - e && y < p.y + p.s + e && y + t > p.y - e) return true;
        // Un solo sello por franja horizontal: nada de filas de sellos.
        if (y < p.y + p.s + 10 && y + t > p.y - 10) return true;
      }
      return false;
    }
    for (var c = 0; c < cand.length && puestos.length < maximo; c++) {
      var k = cand[c], t2 = k.t;
      while (t2 >= MIN && choca(k.x, k.y, t2)) t2 -= PASO_T;
      if (t2 < MIN) continue;
      if (puestos.length >= 4 && t2 < (movil ? 64 : 84)) continue;
      var s2 = Math.round(t2 * .88), m2 = Math.round((t2 - s2) / 2);
      puestos.push({ x: k.x + m2, y: k.y + m2, s: s2 });
    }
    puestos.sort(function (a, b) { return a.y - b.y; });
    if (!capa || !capa.isConnected) {
      capa = document.createElement("div");
      capa.className = "redcafe-sellos";
      capa.setAttribute("aria-hidden", "true");
      capa.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;";
      document.body.appendChild(capa);
    }
    var br = document.body.getBoundingClientRect(), bx = br.left + sx, by = br.top + sy;
    capa.innerHTML = "";
    puestos.forEach(function (p, i) {
      var d = document.createElement("span");
      d.style.cssText = "position:absolute;width:" + p.s + "px;height:" + p.s + "px;left:" + Math.round(p.x + sx - bx) + "px;top:" + Math.round(p.y + sy - by) +
        "px;background:url(" + URL_SELLO + ") center/contain no-repeat;transform:rotate(" + [-6, 9, -12, 4][i % 4] + "deg);mix-blend-mode:multiply;pointer-events:none;";
      capa.appendChild(d);
    });
  }

  function programar() { if (temporizador) clearTimeout(temporizador); temporizador = setTimeout(colocar, 350); }

  function iniciar() {
    var main = document.querySelector("main");
    if (!main) return;
    new ResizeObserver(programar).observe(main);
    if (window.MutationObserver) new MutationObserver(programar).observe(main, { childList: true, subtree: true });
    window.addEventListener("resize", programar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(programar);
    programar();
  }

  var intentos = 0;
  (function esperar() {
    if ((window.__redcafeReactListo && window.__redcafeReactListo()) || intentos > 60) { iniciar(); return; }
    intentos++; setTimeout(esperar, 200);
  })();
})();

/* Deslizar para cambiar de página (móvil)
   ------------------------------------------------------------------
   En pantallas táctiles, deslizar el dedo hacia la izquierda abre la página
   principal siguiente y hacia la derecha la anterior, en ciclo: después de la
   última vuelve a la primera y al revés. Solo actúa en las cinco páginas
   principales (Inicio, Marketplace, Servicios, Precios, Academia, Comunidad y
   Crear perfil).
   No interfiere con lo que ya se desliza de lado: mapas, galerías, tablas o
   listas con desplazamiento horizontal, campos de texto, menús abiertos ni
   con el gesto «atrás» del navegador (se ignoran los toques en los bordes).
   Una pastilla con el nombre de la página acompaña al dedo para que se
   entienda qué va a pasar; si se suelta antes del umbral, no pasa nada. */
(function () {
  "use strict";
  if (window.__redcafeDeslizar) return;
  window.__redcafeDeslizar = true;

  // Solo las páginas principales, en el orden de la barra de abajo.
  var PAGINAS = [
    ["/", "Inicio", '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h4.5v-6h4v6h4.5V10"/>'],
    ["/marketplace/", "Marketplace", '<path d="M5 8.5h14l-1.2 11.5H6.2z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/><path d="M9.5 13.5c1.5 1.3 3.5 1.3 5 0"/>'],
    ["/servicios/", "Servicios", '<rect x="3" y="7.5" width="18" height="12" rx="1.5"/><path d="M9 7.5V5h6v2.5"/><path d="M3 12.5h18"/><path d="M11 12.5h2v2h-2z"/>'],
    ["/servicios/precios/", "Precios", '<path d="M3.5 20h17"/><path d="M5 15.5l4-4.5 3.5 3 6.5-7.5"/><path d="M15.5 6.5H19V10"/>'],
    ["/academia/", "Academia", '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.5"/><path d="M21.5 9.5v5"/>'],
    ["/comunidad/", "Comunidad", '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 13.6c2.6.3 4.5 2.6 4.5 5.4"/>'],
    ["/afiliate/", "Crear perfil", '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c0-3.6 2.9-6.5 6.5-6.5 1.3 0 2.5.4 3.5 1"/><path d="M18 13.5v6.5"/><path d="M14.8 16.75h6.4"/>']
  ];
  var UMBRAL = 90;      // px de recorrido horizontal para cambiar de página
  var BORDE = 24;       // px desde el borde que se dejan al gesto del navegador
  var NO_DESLIZAR = "input,textarea,select,[contenteditable],iframe,canvas,video," +
    "header,nav,dialog,[role=dialog],[aria-modal=true],details[open],[data-sin-deslizar]," +
    ".leaflet-container,.maplibregl-map,.mapboxgl-map,.gm-style," +
    ".swiper,.splide,.embla,.redcafe-hub";

  function ruta() {
    var p = location.pathname.replace(/index\.html$/, "");
    if (p.slice(-1) !== "/") p += "/";
    return p;
  }
  function indice() {
    var p = ruta();
    for (var i = 0; i < PAGINAS.length; i++) if (PAGINAS[i][0] === p) return i;
    return -1;
  }
  function vecina(paso) {
    var i = indice();
    if (i < 0) return null;
    return PAGINAS[(i + paso + PAGINAS.length) % PAGINAS.length];
  }

  // ¿Hay entre el elemento tocado y <body> algo que se desplace de lado?
  function seDesplazaDeLado(el) {
    for (var n = el; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 4) {
        var ox = getComputedStyle(n).overflowX;
        if (ox === "auto" || ox === "scroll") return true;
      }
    }
    return false;
  }
  function menuAbierto() {
    var b = document.querySelector('header button[aria-label="Cerrar menú"], header button[aria-expanded="true"]');
    return !!b || document.documentElement.style.overflow === "hidden" || document.body.style.overflow === "hidden";
  }

  var pastilla = null;
  function crearPastilla() {
    if (pastilla) return pastilla;
    pastilla = document.createElement("div");
    pastilla.className = "fixed";
    pastilla.setAttribute("aria-hidden", "true");
    pastilla.style.cssText = "position:fixed;top:50%;z-index:9998;pointer-events:none;display:flex;align-items:center;gap:6px;" +
      "padding:10px 14px;background:#3b1a0c;color:#fbf6f0;font:600 14px/1.2 Figtree,Inter,system-ui,sans-serif;border-radius:4px;" +
      "box-shadow:0 6px 18px rgba(59,26,12,.35);opacity:0;transform:translateY(-50%);white-space:nowrap;max-width:70vw;";
    document.body.appendChild(pastilla);
    return pastilla;
  }
  function mostrar(dx, destino) {
    var p = crearPastilla();
    var avance = Math.min(1, Math.abs(dx) / UMBRAL);
    var listo = avance >= 1;
    p.textContent = dx < 0 ? destino[1] + " ›" : "‹ " + destino[1];
    p.style.left = dx > 0 ? "0" : "auto";
    p.style.right = dx < 0 ? "0" : "auto";
    var desde = (1 - avance) * 100 * (dx < 0 ? 1 : -1);
    p.style.transition = "none";
    p.style.transform = "translate(" + desde + "%,-50%)";
    p.style.opacity = String(0.35 + 0.65 * avance);
    p.style.background = listo ? "#8C3604" : "#3b1a0c";
  }
  function ocultar() {
    if (!pastilla) return;
    pastilla.style.transition = "opacity .2s ease";
    pastilla.style.opacity = "0";
  }

  var x0 = 0, y0 = 0, t0 = 0, activo = false, horizontal = null, dxFinal = 0;

  function alTocar(e) {
    activo = false; horizontal = null; dxFinal = 0;
    if (e.touches.length !== 1 || indice() < 0) return;
    if (window.visualViewport && window.visualViewport.scale > 1.05) return; // con zoom, deslizar es mover la vista
    var t = e.touches[0];
    if (t.clientX < BORDE || t.clientX > window.innerWidth - BORDE) return;
    var el = e.target;
    if (!el || !el.closest || el.closest(NO_DESLIZAR) || seDesplazaDeLado(el) || menuAbierto()) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return;
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); activo = true;
  }
  function alMover(e) {
    if (!activo) return;
    if (e.touches.length !== 1) { activo = false; ocultar(); return; }
    var t = e.touches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    if (horizontal === null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
      horizontal = Math.abs(dx) > Math.abs(dy) * 1.8;
      if (!horizontal) { activo = false; return; }
    }
    if (!horizontal) return;
    dxFinal = dx;
    var destino = vecina(dx < 0 ? 1 : -1);
    if (destino) mostrar(dx, destino);
  }
  function alSoltar() {
    if (!activo) return;
    activo = false;
    var rapido = Date.now() - t0 < 300 && Math.abs(dxFinal) > UMBRAL * 0.6;
    if (horizontal && (Math.abs(dxFinal) >= UMBRAL || rapido)) {
      var destino = vecina(dxFinal < 0 ? 1 : -1);
      if (destino) {
        if (pastilla) { pastilla.style.transform = "translate(0,-50%)"; pastilla.style.opacity = "1"; pastilla.style.background = "#8C3604"; }
        location.assign(destino[0]);
        return;
      }
    }
    ocultar();
  }

  /* Barra de pestañas abajo (móvil), semitransparente y solo con iconos
     propios (el nombre queda para lectores de pantalla): muestra en qué
     sección estás, se puede tocar y avisa de que se puede deslizar. Solo
     aparece en las siete páginas principales y por debajo de 1024 px. La
     burbuja de cursos y la barra fija del registro suben por encima. */
  function crearBarra() {
    var actual = indice();
    // En el registro manda su propio botón flotante («Continuar con N perfiles»): ahí no va la barra.
    if (actual < 0 || PAGINAS[actual][0] === "/afiliate/" || document.getElementById("rc-pestanas")) return;
    var est = document.createElement("style");
    est.textContent =
      "#rc-pestanas{position:fixed;left:0;right:0;bottom:0;z-index:9996;display:flex;justify-content:space-around;align-items:stretch;" +
      "padding:0 4px env(safe-area-inset-bottom);background:rgba(255,253,249,.6);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);" +
      "border-top:1px solid rgba(255,255,255,.5);box-shadow:0 -2px 10px rgba(59,26,12,.08)}" +
      "#rc-pestanas a{position:relative;flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;" +
      "min-height:48px;padding:0 2px;color:#3b1a0c;text-decoration:none;white-space:nowrap;letter-spacing:-.01em;font:500 10.5px/1.1 Figtree,Inter,system-ui,sans-serif;" +
      "border-radius:0 !important;transform:none !important;filter:none !important;-webkit-tap-highlight-color:transparent}" +
      "#rc-pestanas a span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" +
      "#rc-pestanas svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
      "#rc-pestanas a[aria-current=page]{color:#8C3604;font-weight:700}" +
      "#rc-pestanas a[aria-current=page] svg{stroke-width:2.2}" +
      "#rc-pestanas a[aria-current=page]::after{content:'';position:absolute;bottom:5px;left:50%;width:5px;height:5px;margin-left:-2.5px;background:#8C3604;border-radius:50%}" +
      "#rc-pestanas a:active{background:rgba(140,54,4,.07)}" +
      "#rc-pestanas.rc-vaiven svg{animation:rc-vaiven .9s ease-in-out .9s 1}" +
      "@keyframes rc-vaiven{0%,100%{transform:none}30%{transform:translateX(-5px)}60%{transform:translateX(4px)}}" +
      "html.rc-con-pestanas body{padding-bottom:calc(48px + env(safe-area-inset-bottom))}" +
      "html.rc-con-pestanas body .redcafe-hub.fixed.bottom-5{bottom:calc(60px + env(safe-area-inset-bottom)) !important}" +
            // En el registro ya hay una barra fija con el botón de crear la cuenta: esa manda.
      "html.redcafe-con-boton-fijo #rc-pestanas,html:has([data-redcafe-fijo]) #rc-pestanas{display:none}html.redcafe-con-boton-fijo.rc-con-pestanas body{padding-bottom:5.5rem}" +
      "html.redcafe-con-boton-fijo.rc-con-pestanas body .redcafe-hub.fixed.bottom-5{bottom:calc(5.5rem + env(safe-area-inset-bottom)) !important}" +
      "@media (prefers-reduced-motion:reduce){#rc-pestanas.rc-vaiven svg{animation:none}}" +
      "@media print,(min-width:1024px){#rc-pestanas{display:none}html.rc-con-pestanas body{padding-bottom:0}html.rc-con-pestanas body .redcafe-hub.fixed.bottom-5{bottom:calc(1rem + env(safe-area-inset-bottom)) !important}}";
    document.head.appendChild(est);
    var barra = document.createElement("nav");
    barra.id = "rc-pestanas";
    barra.className = "fixed"; // el tema pone position:relative a lo suelto del body que no la lleva
    barra.setAttribute("aria-label", "Secciones principales");
    barra.title = "Toca una sección o desliza a los lados";
    var html = "";
    for (var i = 0; i < PAGINAS.length; i++) {
      html += '<a href="' + PAGINAS[i][0] + '"' + (i === actual ? ' aria-current="page"' : "") + '>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + PAGINAS[i][2] + "</svg><span>" + PAGINAS[i][1] + "</span></a>";
    }
    barra.innerHTML = html;
    try {
      if (!sessionStorage.getItem("rc-deslizar-visto")) { barra.classList.add("rc-vaiven"); sessionStorage.setItem("rc-deslizar-visto", "1"); }
    } catch (e) {}
    document.body.appendChild(barra);
    document.documentElement.classList.add("rc-con-pestanas");
  }

  function iniciar() {
    crearBarra();
    if (!("ontouchstart" in window) && !(navigator.maxTouchPoints > 0)) return;
    document.addEventListener("touchstart", alTocar, { passive: true });
    document.addEventListener("touchmove", alMover, { passive: true });
    document.addEventListener("touchend", alSoltar, { passive: true });
    document.addEventListener("touchcancel", function () { activo = false; ocultar(); }, { passive: true });
    // Al volver con «atrás», el navegador puede restaurar la página con la pastilla visible.
    window.addEventListener("pageshow", function () { if (pastilla) { pastilla.style.transition = "none"; pastilla.style.opacity = "0"; } });
  }

  var intentos = 0;
  (function esperar() {
    if ((window.__redcafeReactListo && window.__redcafeReactListo()) || intentos > 60) { iniciar(); return; }
    intentos++; setTimeout(esperar, 200);
  })();
})();

/* ===== v20261127e · Registro más atractivo =====
   Cifras de la Red siempre en vivo (/api/metricas.php?action=cifras), nunca escritas a mano:
   · Portada: línea corta bajo los botones (miembros y provincias) y título sobre las tarjetas.
   · Comunidad: la franja completa «La Red hoy», bajo el subtítulo.
   · Crear perfil: «Ya son N miembros en M provincias» en la cabecera.
   Todo va en contenedores propios (data-redcafe-propio) junto a nodos estáticos de React;
   el hueco lo reserva el CSS para que la página no salte. */
(function () {
  "use strict";

  var promesa = null;
  function pedirCifras() {
    if (!promesa) {
      promesa = fetch("/api/metricas.php?action=cifras", { credentials: "omit" })
        .then(function (r) { return r.json(); })
        .then(function (j) { return (j && j.ok && j.data && j.data.miembros > 0) ? j.data : null; })
        .catch(function () { promesa = null; return null; });
    }
    return promesa;
  }
  function num(v) { var n = Number(v); return isFinite(n) && n >= 0 ? String(Math.floor(n)) : "0"; }
  function crear(etiqueta, clase, texto) {
    var e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto) e.textContent = texto;
    return e;
  }

  function portada() {
    var botones = document.querySelector("#portada-hero .portada-botones");
    if (!botones || !botones.parentNode) return;
    var sig = botones.nextElementSibling;
    if (sig && sig.classList.contains("rc-hero-extra")) return;
    var caja = crear("div", "rc-hero-extra");
    caja.setAttribute("data-redcafe-propio", "");
    var prueba = crear("p", "rc-hero-prueba", "Gratis · 2 minutos · sin tarjeta");
    caja.appendChild(prueba);
    botones.parentNode.insertBefore(caja, botones.nextSibling);
    pedirCifras().then(function (d) {
      if (!d) return;
      prueba.textContent = "";
      var b1 = crear("b", "", num(d.miembros)), b2 = crear("b", "", num(d.provincias));
      prueba.appendChild(b1); prueba.appendChild(document.createTextNode(" miembros · "));
      prueba.appendChild(b2); prueba.appendChild(document.createTextNode(" provincias · gratis, 2 minutos"));
    });
  }

  // Título sobre las cuatro tarjetas con imagen de la portada, que son los beneficios.
  function tituloBeneficios() {
    var collage = document.getElementById("rc-collage");
    if (!collage || !collage.parentNode || !document.getElementById("portada-hero")) return;
    var ant = collage.previousElementSibling;
    if (ant && ant.classList.contains("rc-gana-titulo")) return;
    var h = crear("h2", "rc-gana-titulo", "Con tu cuenta gratis puedes");
    h.setAttribute("data-redcafe-propio", "");
    // Las secciones de la portada se ordenan con «order»: el título lleva el mismo que las tarjetas.
    h.style.order = getComputedStyle(collage).order;
    collage.parentNode.insertBefore(h, collage);
  }

  function comunidad() {
    var muro = document.getElementById("redcafe-muro");
    var main = muro && muro.closest("main");
    var sub = main && main.querySelector("h1 + p");
    if (!sub || !sub.parentNode) return;
    var sig = sub.nextElementSibling;
    if (sig && sig.classList.contains("rc-cifras-com")) return;
    var sec = crear("section", "redcafe-cifras rc-cifras-com");
    sec.setAttribute("data-redcafe-propio", "");
    sec.setAttribute("aria-label", "La Red hoy");
    sec.setAttribute("aria-busy", "true");
    var caja = crear("div", "redcafe-cifras-caja");
    var filas = [
      ["miembros", "miembros en la Red"], ["productores", "productores"],
      ["compran_cafe", "compradores, tostadores y exportadores"], ["provincias", "provincias representadas"],
      ["lotes_reales", "lotes de café publicados"], ["servicios", "servicios disponibles"]
    ];
    var fuertes = filas.map(function (f) {
      var celda = crear("div", "redcafe-cifra"), s = crear("strong", "", "—");
      celda.appendChild(s); celda.appendChild(crear("span", "", f[1])); caja.appendChild(celda);
      return s;
    });
    sec.appendChild(caja);
    sub.parentNode.insertBefore(sec, sub.nextSibling);
    pedirCifras().then(function (d) {
      sec.setAttribute("aria-busy", "false");
      if (!d) return;
      filas.forEach(function (f, i) { fuertes[i].textContent = num(d[f[0]]); });
    });
  }

  function registro() {
    var bajada = document.querySelector(".redcafe-afil-hero .redcafe-afil-bajada");
    if (!bajada || !bajada.parentNode) return;
    var sig = bajada.nextElementSibling;
    if (sig && sig.classList.contains("rc-afil-prueba")) return;
    var p = crear("p", "rc-afil-prueba");
    p.setAttribute("data-redcafe-propio", "");
    bajada.parentNode.insertBefore(p, bajada.nextSibling);
    pedirCifras().then(function (d) {
      if (d) p.textContent = "Ya son " + num(d.miembros) + " miembros en " + num(d.provincias) + " provincias";
    });
  }

  function pintar() {
    if (!(window.__redcafeReactListo && window.__redcafeReactListo())) return;
    try { portada(); tituloBeneficios(); comunidad(); registro(); } catch (e) { /* la página sigue sin estos añadidos */ }
  }
  // Next cambia de página sin recargar: se repasa cada poco (tres búsquedas en el DOM, sin coste).
  pintar();
  setInterval(pintar, 700);
})();

/* ===== PROPUESTA · Vista previa bajo «Con tu cuenta gratis puedes» =====
   Bajo cada tarjeta de la portada (#rc-collage) hay una lista con elementos reales de esa
   sección (lotes, cursos, servicios, recetas) que se puede deslizar y que rota sola cada 4 s
   (pausa al tocarla, al pasar el ratón o si la persona pide menos movimiento).
   En Academia van primero los cursos de pago de Legacy. Datos en vivo de la API pública;
   si algo falla, la tarjeta queda como estaba. Solo tras hidratar React. */
(function () {
  "use strict";
  // Cursos de pago (aliado Legacy): precio normal de plataforma_cafe/lib/legacyOferta.ts (sin descuentos).
  var PAGO = {
    "legacy-barista-en-casa": "$159",
    "legacy-barismo-profesional": "$399",
    "legacy-barista-avanzado": "$599"
  };
  var MAX = 8;
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function api(u, k) {
    return fetch(u, { credentials: "omit" }).then(function (r) { return r.json(); })
      .then(function (j) { return (j && j.ok && j.data && j.data[k]) || []; }).catch(function () { return []; });
  }
  function dinero(v) { var n = Number(v); return isFinite(n) && n > 0 ? "$" + (n % 1 ? n.toFixed(2) : n) : ""; }
  function primeraImg(x) { var l = x && (x.imagenes || x.fotos); return Array.isArray(l) && l.length ? (typeof l[0] === "string" ? l[0] : l[0].url || "") : (x && (x.imagen || x.foto)) || ""; }
  function item(o) {
    var a = el("a", "rc-vp-item"); a.href = o.href;
    var f = el("span", "rc-vp-foto");
    if (o.img) { var i = el("img"); i.src = o.img; i.alt = ""; i.loading = "lazy"; i.decoding = "async"; i.width = 64; i.height = 64; f.appendChild(i); }
    else { f.textContent = o.icono || "☕"; f.setAttribute("aria-hidden", "true"); }
    a.appendChild(f);
    var t = el("span", "rc-vp-texto");
    if (o.etiqueta) t.appendChild(el("span", "rc-vp-etq rc-vp-etq-" + o.etiqueta[0], o.etiqueta[1]));
    t.appendChild(el("span", "rc-vp-nombre", o.nombre));
    if (o.meta) t.appendChild(el("span", "rc-vp-meta", o.meta));
    a.appendChild(t);
    if (o.precio) a.appendChild(el("span", "rc-vp-precio", o.precio));
    return a;
  }
  function panel(col, titulo, items, total, verTodo, href) {
    var p = el("div", "rc-vp rc-vp-c" + col); p.setAttribute("data-redcafe-propio", "");
    var cab = el("p", "rc-vp-cab");
    cab.appendChild(el("span", "", titulo));
    if (total) cab.appendChild(el("b", "rc-vp-total", total));
    p.appendChild(cab);
    var lista = el("div", "rc-vp-lista");
    lista.setAttribute("role", "list"); lista.setAttribute("aria-label", titulo); lista.tabIndex = 0;
    items.slice(0, MAX).forEach(function (o) { var it = item(o); it.setAttribute("role", "listitem"); lista.appendChild(it); });
    p.appendChild(lista);
    var v = el("a", "rc-vp-ver", verTodo + " →"); v.href = href; p.appendChild(v);
    rotar(lista);
    return p;
  }
  // Rotación: baja un elemento cada 4 s y vuelve arriba al final.
  var menosMovimiento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function rotar(lista) {
    if (menosMovimiento) return;
    var pausa = false;
    ["mouseenter", "focusin", "touchstart"].forEach(function (ev) { lista.addEventListener(ev, function () { pausa = true; }, { passive: true }); });
    ["mouseleave", "focusout"].forEach(function (ev) { lista.addEventListener(ev, function () { pausa = false; }); });
    lista.addEventListener("touchend", function () { setTimeout(function () { pausa = false; }, 6000); }, { passive: true });
    setInterval(function () {
      if (pausa || document.hidden || lista.scrollHeight <= lista.clientHeight + 4) return;
      var r = lista.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var paso = lista.firstElementChild ? lista.firstElementChild.offsetHeight + 8 : 64;
      var fin = lista.scrollTop + lista.clientHeight >= lista.scrollHeight - 4;
      lista.scrollTo({ top: fin ? 0 : lista.scrollTop + paso, behavior: "smooth" });
    }, 4000);
  }
  function lotes() {
    return api("/api/lotes.php?action=list", "lotes").then(function (l) {
      var reales = l.filter(function (x) { return !x.demo && !x.ejemplo && !x.oculto && String(x.disponibilidad || "").toLowerCase() !== "agotado"; });
      var vis = (reales.length ? reales : l).map(function (x) {
        var precio = dinero(x.precioQuintal) ? dinero(x.precioQuintal) + "/qq" : dinero(x.precioSaco) ? dinero(x.precioSaco) + "/saco" : dinero(x.precioUnidad);
        return { href: "/marketplace/" + encodeURIComponent(x.id) + "/", img: primeraImg(x) || "/img/proceso/verde.webp", nombre: [x.variedad, x.proceso].filter(Boolean).join(" · ") || "Café de Ecuador", meta: [x.provincia, x.altura ? x.altura + " msnm" : ""].filter(Boolean).join(" · "), precio: precio };
      });
      return vis.length ? panel(1, "Lotes publicados", vis, reales.length ? String(reales.length) : "", "Ver todos los lotes", "/marketplace/") : null;
    });
  }
  function cursos() {
    return api("/api/cursos.php?action=list", "cursos").then(function (l) {
      var pago = l.filter(function (c) { return PAGO[c.id]; }), libres = l.filter(function (c) { return !PAGO[c.id]; });
      var vis = pago.concat(libres).map(function (c) {
        var dePago = !!PAGO[c.id];
        return { href: "/academia/" + encodeURIComponent(c.id) + "/", img: "/img/academia/cursos/" + c.id + ".webp", nombre: c.titulo || "Curso",
          etiqueta: dePago ? ["pago", "Certificado"] : ["gratis", "Gratis"],
          meta: dePago ? "Legacy · " + (c.duracion || "presencial y online") : (c.lecciones ? c.lecciones + " lecciones" : c.nivel || ""), precio: dePago ? PAGO[c.id] : "" };
      });
      return vis.length ? panel(2, "Cursos", vis, String(l.length), "Ver la Academia", "/academia/") : null;
    });
  }
  function servicios() {
    return api("/api/marketplace-servicios.php?action=list", "servicios").then(function (l) {
      var vis = l.filter(function (s) { return !s.demo; }).map(function (s) {
        return { href: "/servicios/", img: primeraImg(s), icono: s.icono || "🛠️", nombre: s.titulo || s.nombre || "Servicio", meta: s.provincia || s.categoria || "", precio: s.precio_etiqueta || "" };
      });
      // Servicio de cata de Legacy: siempre primero en la vista previa.
      vis.unshift({ href: "/servicios/analisis-de-muestras/", img: "/img/proceso/verde.webp", nombre: "Cata de muestras de café",
        etiqueta: ["pago", "Formato SCA"], meta: "Legacy · café verde, puntaje y precio", precio: "$50" });
      return panel(3, "Servicios", vis, String(vis.length), "Ver servicios", "/servicios/");
    });
  }
  function recetas() {
    var r = [["v60", "Café V60", "Goteo manual · 4 min", "taza"], ["prensa-francesa", "Prensa francesa", "Fácil · 5 min", "molido"],
      ["aeropress", "Aeropress", "Rápido · 2 min", "tostado"], ["moka-italiana", "Moka italiana", "Intenso · 5 min", "molido"],
      ["espresso-casero", "Espresso casero", "Con cafetera · 1 min", "taza"], ["cold-brew", "Cold brew", "En frío · 12 h", "tostado"]];
    return Promise.resolve(panel(4, "Recetas", r.map(function (x) {
      return { href: "/recetas/" + x[0] + "/", img: "/img/proceso/" + x[3] + ".webp", nombre: x[1], meta: x[2] };
    }), String(r.length), "Ver recetas", "/recetas/"));
  }
  var hecho = false;
  function pintar() {
    if (hecho || !(window.__redcafeReactListo && window.__redcafeReactListo())) return;
    var fila = document.querySelector("#rc-collage .rc-collage-fila");
    if (!fila || fila.querySelector(".rc-vp")) return;
    hecho = true;
    Promise.all([lotes(), cursos(), servicios(), recetas()]).then(function (ps) {
      if (!document.body.contains(fila) || fila.querySelector(".rc-vp")) { hecho = false; return; }
      ps.forEach(function (p, i) { fila.appendChild(p || el("div", "rc-vp rc-vp-vacio rc-vp-c" + (i + 1))); });
      fila.classList.add("rc-con-vp");
    });
  }
  pintar();
  setInterval(function () { if (!document.querySelector("#rc-collage .rc-vp")) hecho = false; pintar(); }, 800);
})();
