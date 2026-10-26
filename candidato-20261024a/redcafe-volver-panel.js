/* Red Café Ecuador — volver al panel desde cualquier página
   ------------------------------------------------------------------
   La cabecera tiene «Mi Red», pero en el móvil queda dentro del menú
   plegado, y desde una ficha de lote, un curso o el muro hay que ir a
   buscarlo. Quien está trabajando en su cuenta necesita una vía de vuelta
   a mano, siempre.

   Es un botón propio, cuelga del <body> y no aparece en el panel (allí no
   haría falta) ni para quien no ha entrado.
*/
(function () {
  "use strict";

  var boton = null;
  var usuario = null;

  function enPanel() { return location.pathname.indexOf("/panel") === 0; }

  function montar() {
    if (!usuario || boton) return;
    boton = document.createElement("a");
    boton.id = "redcafe-volver-panel";
    boton.className = "redcafe-volver-panel";
    boton.href = "/panel/";
    boton.setAttribute("data-redcafe-propio", "1");
    boton.innerHTML = '<span aria-hidden="true">↩</span><span>Mi panel</span>';
    boton.setAttribute("aria-label", "Volver a mi panel");
    document.body.appendChild(boton);
  }

  function actualizar() {
    if (!usuario) return;
    montar();
    if (boton) boton.hidden = enPanel();
  }

  function iniciar() {
    fetch("/api/auth.php?action=me", { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        usuario = res && res.ok && res.data && res.data.user;
        if (!usuario || !usuario.id) return;
        actualizar();
      })
      .catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(iniciar, 800);
  else window.addEventListener("load", function () { setTimeout(iniciar, 800); }, { once: true });
  // Cuelga del <body>, así que la limpieza de ruta no lo retira: solo hay
  // que revisar si toca mostrarlo en la ruta nueva.
  document.addEventListener("redcafe:ruta", function () { setTimeout(actualizar, 400); });
})();
