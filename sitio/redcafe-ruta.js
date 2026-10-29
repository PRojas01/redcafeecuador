/* Red Café Ecuador — vigilante de ruta
   ------------------------------------------------------------------
   Next.js navega sin recargar la página: al pulsar un enlace, React
   reemplaza sus propios hijos dentro del mismo <main>, que sobrevive. Todo
   lo que este sitio añade por su cuenta —el visor de curso, las secciones
   del panel, el listado del marketplace— colgaba de ese <main> y NADIE lo
   quitaba. Resultado: abrías un curso y sus lecciones te seguían a cualquier
   página a la que fueras.

   Y el reverso del mismo problema: los módulos comprobaban la ruta una sola
   vez, al cargar. Si llegabas al panel pulsando un enlace en vez de recargar,
   no montaban nada.

   Este archivo arregla las dos cosas:
     · al cambiar la ruta, retira lo que pertenecía a la ruta anterior;
     · y avisa con un evento `redcafe:ruta` para que cada módulo vuelva a
       montarse donde le toca.
*/
(function () {
  "use strict";

  if (window.__redcafeRuta) return;
  window.__redcafeRuta = true;

  // Qué pertenece a cada ruta. Si el prefijo no encaja con la ruta actual,
  // el nodo sobra y se retira.
  var PROPIOS = [
    { sel: "#redcafe-curso",                ruta: "/academia" },
    { sel: "#redcafe-academia-avance",      ruta: "/academia" },
    { sel: "#redcafe-academia-editor",      ruta: "/academia" },
    { sel: "#redcafe-academia-solicitudes", ruta: "/academia" },
    { sel: "#redcafe-mis-cursos",           ruta: "/panel" },
    { sel: "#redcafe-cursos-autor",         ruta: "/panel" },
    { sel: "#redcafe-mis-publicaciones",    ruta: "/panel" },
    { sel: "#redcafe-registro-actividad",   ruta: "/panel" },
    { sel: "#redcafe-empleos-panel",        ruta: "/panel" },
    { sel: "#redcafe-mis-reportes",         ruta: "/panel" },
    { sel: "#redcafe-solicitudes-curso",    ruta: "/academia" }
  ];

  // Marcas que dejan los módulos para no repetirse. Viven en nodos que
  // sobreviven al cambio de ruta, así que hay que borrarlas o el módulo
  // creerá que ya hizo su trabajo.
  var MARCAS = [
    "data-redcafe-lotes-completos",
    "data-redcafe-oculto-react",
    "data-redcafe-service-plans",
    "data-redcafe-acciones"
  ];

  function quitar(nodo) {
    if (nodo && nodo.parentNode) nodo.parentNode.removeChild(nodo);
  }

  function limpiar(ruta) {
    // Regla principal, la que no depende de mi memoria: TODO lo que este
    // sitio inyecta dentro del <main> lleva `data-redcafe-propio` y se retira
    // al cambiar de ruta. Cada módulo vuelve a montar lo suyo al recibir el
    // evento. Mantener una lista de ids a mano ya falló una vez: la ficha del
    // lote se quedaba pegada bajo la cabecera al ir a otra página.
    var main = document.querySelector("main");
    if (main) {
      Array.prototype.slice.call(main.querySelectorAll("[data-redcafe-propio]"))
        .forEach(quitar);
    }

    // La lista sigue como respaldo, por si algún contenedor antiguo no lleva
    // todavía la marca.
    PROPIOS.forEach(function (item) {
      if (ruta.indexOf(item.ruta) === 0) return;
      Array.prototype.slice.call(document.querySelectorAll(item.sel)).forEach(quitar);
    });

    // Lo que ocultamos de React se devuelve a la vista: si no, al volver a
    // esa ruta la página aparecería en blanco.
    Array.prototype.slice.call(document.querySelectorAll("[data-redcafe-oculto]"))
      .forEach(function (el) { el.removeAttribute("data-redcafe-oculto"); });

    MARCAS.forEach(function (marca) {
      Array.prototype.slice.call(document.querySelectorAll("[" + marca + "]"))
        .forEach(function (el) { el.removeAttribute(marca); });
    });
  }

  /* ── Scripts que solo viven en su ruta ────────────────────────────────
     El visor de cursos, las secciones del panel y el gráfico de precios no
     se cargan en las 61 páginas: pesan y solo sirven en su sitio. Pero Next
     navega sin recargar, así que al llegar a /academia/<curso>/ desde el
     marketplace el navegador NUNCA pidió redcafe-academia.js y la página se
     quedaba sin visor. Aquí se traen a demanda, una sola vez. */

  var POR_RUTA = [
    { ruta: "/academia",         src: ["/redcafe-academia.js"] },
    { ruta: "/admin",            src: ["/redcafe-admin-servicios.js",
                                       "/redcafe-admin-verificaciones.js",
                                       "/redcafe-socios.js",
                                       "/redcafe-colapsables.js"] },
    { ruta: "/panel",            src: ["/redcafe-academia.js",
                                       "/redcafe-cursos-autor.js",
                                       "/redcafe-panel-publicaciones.js",
                                       "/redcafe-registro-actividad.js",
                                       "/redcafe-bandeja.js",
                                       "/redcafe-admin-servicios.js",
                                       "/redcafe-admin-verificaciones.js",
                                       "/redcafe-socios.js",
                                       "/redcafe-colapsables.js"] }
  ];

  // La versión se toma de un script ya cargado para no romper el cachebuster.
  function versionDeLosScripts() {
    var uno = document.querySelector('script[src*="redcafe-"][src*="?v="]');
    if (!uno) return "";
    var m = (uno.getAttribute("src") || "").match(/[?&]v=([^&]+)/);
    return m ? m[1] : "";
  }

  function yaCargado(src) {
    return !!document.querySelector('script[src^="' + src + '"]');
  }

  function asegurarScripts(ruta) {
    var v = versionDeLosScripts();
    POR_RUTA.forEach(function (item) {
      if (ruta.indexOf(item.ruta) !== 0) return;
      item.src.forEach(function (src) {
        if (yaCargado(src)) return;
        var s = document.createElement("script");
        s.src = src + (v ? "?v=" + v : "");
        s.defer = true;
        document.head.appendChild(s);
      });
    });
  }

  var anterior = location.pathname;

  function comprobar() {
    var ahora = location.pathname;
    if (ahora === anterior) return;
    var previa = anterior;
    anterior = ahora;
    try { limpiar(ahora); } catch (e) {}
    // Primero llega el script que haga falta; su propio arranque lo monta.
    try { asegurarScripts(ahora); } catch (e) {}
    try {
      document.dispatchEvent(new CustomEvent("redcafe:ruta", {
        detail: { ruta: ahora, anterior: previa }
      }));
    } catch (e) {
      // Navegadores viejos sin CustomEvent: la limpieza ya se hizo, que es
      // lo que evita el contenido pegado.
    }
  }

  ["pushState", "replaceState"].forEach(function (metodo) {
    var original = history[metodo];
    if (typeof original !== "function") return;
    history[metodo] = function () {
      var r = original.apply(this, arguments);
      setTimeout(comprobar, 0);
      return r;
    };
  });
  window.addEventListener("popstate", function () { setTimeout(comprobar, 0); });

  // Red de seguridad: si alguna navegación no pasa por history, el sondeo la
  // detecta igual. Comparar dos cadenas cada segundo no cuesta nada.
  setInterval(comprobar, 1000);
})();
