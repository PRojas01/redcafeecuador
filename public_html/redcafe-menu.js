/* redcafe-menu.js — dueño único del menú móvil cuando React no arranca en la ruta.
   No toca nodos de React: solo escucha el botón que ya existe en el HTML estático
   y despliega el menú propio (.redcafe-more-menu) que ya construye nuestra capa. */
(function () {
  "use strict";
  var INTENTOS_MAX = 40, intentos = 0;

  function reactVivo() {
    // Si React hidrató, él se encarga del menú y nosotros no hacemos nada.
    return !!document.querySelector('script[src*="/_next/static/chunks/main-app-"]');
  }


  /* Sesión en la cabecera.
     ------------------------------------------------------------------
     La cabecera viaja en el HTML con el estado de visitante: un enlace
     «Entrar» y nada más. React la corregía al hidratar. En las rutas donde
     React ya no arranca se quedaba congelada, así que un miembro con sesión
     veía «Entrar» y **no tenía forma de cerrar sesión**. Aquí la corrige
     nuestra capa, y solo cuando React no está: si él manda, no se toca nada. */
  function sesionEnCabecera() {
    if (reactVivo()) return;
    var cab = document.querySelector("header");
    if (!cab || cab.getAttribute("data-redcafe-sesion") === "1") return;

    var entrar = null;
    var enlaces = cab.querySelectorAll('a[href="/login/"], a[href="/login"]');
    for (var i = 0; i < enlaces.length; i++) {
      if (enlaces[i].offsetParent !== null || !entrar) entrar = enlaces[i];
    }
    if (!entrar) return;
    cab.setAttribute("data-redcafe-sesion", "1");

    fetch("/api/auth.php?action=me", { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var u = res && res.ok && res.data && res.data.user;
        if (!u || !u.id) return;

        entrar.setAttribute("href", "/panel/");
        entrar.textContent = "Mi Red";
        entrar.setAttribute("data-redcafe-propio", "1");

        if (document.getElementById("redcafe-salir")) return;

        // El original mostraba tambien un enlace "Chat" y el nombre del
        // miembro en la cabecera, antes de "Salir". Se insertan en el mismo
        // orden.
        var cursor = entrar;
        if (!cab.querySelector('a[href="/chat/"][data-redcafe-propio]')) {
          var chat = document.createElement("a");
          chat.href = "/chat/";
          chat.textContent = "Chat";
          chat.setAttribute("data-redcafe-propio", "1");
          chat.className = entrar.className;
          cursor.parentNode.insertBefore(chat, cursor.nextSibling);
          cursor = chat;
        }
        var salir = document.createElement("button");
        salir.type = "button";
        salir.id = "redcafe-salir";
        salir.className = "redcafe-salir";
        salir.setAttribute("data-redcafe-propio", "1");
        salir.textContent = "Salir";
        salir.setAttribute("aria-label", "Cerrar sesión");
        salir.addEventListener("click", function () {
          if (salir.disabled) return;
          salir.disabled = true;
          salir.textContent = "Saliendo…";
          fetch("/api/auth.php?action=logout", { method: "POST", credentials: "include" })
            // A /login/ y no a la portada: medido, al volver a «/» React
            // conservaba en memoria el estado de sesion y empujaba a /panel/
            // un instante despues de cerrarla.
            .then(function () { location.replace("/login/"); })
            .catch(function () {
              salir.disabled = false;
              salir.textContent = "Salir";
            });
        });
        if (u.nombre && !cab.querySelector("a[data-redcafe-nombre]")) {
          var nombre = document.createElement("a");
          nombre.href = "/panel/";
          nombre.textContent = String(u.nombre).trim().split(/\s+/)[0];
          nombre.setAttribute("data-redcafe-propio", "1");
          nombre.setAttribute("data-redcafe-nombre", "1");
          nombre.className = entrar.className;
          cursor.parentNode.insertBefore(nombre, cursor.nextSibling);
          cursor = nombre;
        }
        if (cursor.parentNode) cursor.parentNode.insertBefore(salir, cursor.nextSibling);
      })
      .catch(function () {});
  }

  function montar() {
    sesionEnCabecera();
    if (reactVivo()) return true;
    var cab = document.querySelector("header");
    if (!cab) return false;
    var boton = cab.querySelector('button[aria-label*="men" i], button[aria-label*="Men" i]');
    var caja = cab.querySelector("details.redcafe-more");
    var menu = cab.querySelector(".redcafe-more-menu");
    if (!boton || !menu || !caja) return false;
    if (boton.getAttribute("data-redcafe-menu") === "1") return true;

    boton.setAttribute("data-redcafe-menu", "1");
    boton.setAttribute("aria-expanded", "false");
    caja.setAttribute("data-redcafe-propio", "1");

    function abrir(si) {
      caja.classList.toggle("redcafe-menu-abierto", si);
      caja.open = si;
      boton.setAttribute("aria-expanded", si ? "true" : "false");
      boton.setAttribute("aria-label", si ? "Cerrar menú" : "Abrir menú");
    }
    boton.addEventListener("click", function (ev) {
      ev.preventDefault();
      abrir(!caja.classList.contains("redcafe-menu-abierto"));
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") abrir(false);
    });
    document.addEventListener("click", function (ev) {
      if (!caja.contains(ev.target) && !boton.contains(ev.target)) abrir(false);
    });
    return true;
  }

  function reintentar() {
    if (montar()) return;
    if (++intentos >= INTENTOS_MAX) return;
    setTimeout(reintentar, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reintentar);
  } else {
    reintentar();
  }
})();
