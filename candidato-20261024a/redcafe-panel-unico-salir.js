/* Red Café Ecuador — un solo botón de cerrar sesión en /panel/
   ------------------------------------------------------------------
   React trae dos controles de sesión ya en 20260924c: "Salir" en el <nav>
   de la cabecera (disponible en todo el sitio) y "Cerrar sesión" dentro de
   la ficha del panel. Se deja el de la cabecera, por estar en todas las
   páginas, y se oculta el del panel — sin tocar el nodo de React: se marca
   con los mismos atributos que ya usa el resto del sitio para esto
   (data-redcafe-oculto, aria-hidden, inert), nunca se borra ni se
   reescribe con innerHTML. */
(function () {
  "use strict";
  if (location.pathname.indexOf("/panel") !== 0) return;

  var INTENTOS_MAX = 30, intentos = 0;

  function ocultar() {
    var main = document.querySelector("main");
    if (!main) return false;
    var botones = main.querySelectorAll("button");
    for (var i = 0; i < botones.length; i++) {
      var b = botones[i];
      if (b.getAttribute("data-redcafe-oculto") === "1") continue;
      var t = (b.textContent || "").trim().toLowerCase();
      if (t !== "cerrar sesión" && t !== "cerrar sesion") continue;
      b.setAttribute("data-redcafe-oculto", "1");
      b.setAttribute("aria-hidden", "true");
      b.setAttribute("inert", "");
      return true;
    }
    return false;
  }

  function intentar() {
    if (ocultar()) return;
    if (++intentos >= INTENTOS_MAX) return;
    setTimeout(intentar, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", intentar);
  } else {
    intentar();
  }
})();
