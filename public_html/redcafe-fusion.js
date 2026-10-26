/* redcafe-fusion.js — puente entre las dos capas durante la fusión.
   ------------------------------------------------------------------
   Medido el 24/09/2026: con React vivo en una página, su router de cliente
   intercepta los enlaces y pinta SU versión de la ruta destino sin pedir el
   HTML al servidor. Es decir, deshidratar una ruta no sirve de nada si se
   llega a ella pulsando un enlace: nuestro HTML nunca se descarga.

   Este puente obliga a una carga completa cuando el destino ya tiene dueño
   único. Escucha en fase de captura, antes que React, y no toca ningún nodo
   suyo: solo cancela el clic y navega.  */
(function () {
  "use strict";
  if (window.__redcafeFusion) return;
  window.__redcafeFusion = true;

  // Rutas cuya página ya no arranca React. Crece a medida que avanza la fusión.
  var PROPIAS = [
    "/noticias/", "/quienes-somos/", "/legal/", "/terminos-y-condiciones/",
    "/politica-de-cookies/", "/politica-de-privacidad/",
    "/politica-de-uso-de-datos/", "/propiedad-y-uso/", "/404/"
  ];
  var PREFIJOS = ["/noticias/", "/recetas/"];

  function esPropia(ruta) {
    for (var i = 0; i < PROPIAS.length; i++) {
      if (ruta === PROPIAS[i]) return true;
    }
    for (var j = 0; j < PREFIJOS.length; j++) {
      // /noticias/<id>/ si, pero no /noticias/<id>/<algo>/
      if (ruta.indexOf(PREFIJOS[j]) === 0 &&
          ruta.slice(PREFIJOS[j].length).replace(/\/$/, "").indexOf("/") === -1 &&
          ruta !== PREFIJOS[j]) return true;
    }
    return false;
  }

  function normaliza(ruta) {
    return ruta.charAt(ruta.length - 1) === "/" ? ruta : ruta + "/";
  }

  // No basta con el clic: React puede cambiar la URL con history.pushState o
  // replaceState sin pedir el HTML al servidor. Las rutas que siguen en capa
  // propia necesitan documento completo cuando se entra desde una ruta React.
  // Por eso tambien se vigila la History API.
  function desviarSiEsPropia(destino) {
    var u;
    try { u = new URL(destino, location.href); } catch (e) { return false; }
    if (u.origin !== location.origin) return false;
    if (!esPropia(normaliza(u.pathname))) return false;
    if (normaliza(u.pathname) === normaliza(location.pathname)) return false;
    location.assign(u.href);
    return true;
  }

  ["pushState", "replaceState"].forEach(function (nombre) {
    var original = history[nombre];
    if (typeof original !== "function") return;
    history[nombre] = function (estado, titulo, destino) {
      if (destino && desviarSiEsPropia(destino)) return;
      return original.apply(history, arguments);
    };
  });

  document.addEventListener("click", function (ev) {
    if (ev.defaultPrevented || ev.button !== 0) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (e) { return; }
    if (u.origin !== location.origin) return;
    if (!esPropia(normaliza(u.pathname))) return;
    ev.preventDefault();
    ev.stopPropagation();
    location.assign(u.href);
  }, true);

  /* Las rutas /academia/, /panel/ y /comunidad/ volvieron a React. Este archivo
     queda solo como puente de navegacion hacia las rutas que continuan en capa
     propia. */
})();
