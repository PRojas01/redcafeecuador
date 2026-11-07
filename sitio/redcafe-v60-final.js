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

  var VERSION = "20261107b";
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

/* Fotos de la portada: ahora en React (components/PortadaFotos.tsx). */
