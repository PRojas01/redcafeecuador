
/* === Red Café · preselección de «Productor» en /afiliate/ (1-oct-2026) ===
   Sin ?rol= en la URL, React deja «Productor» marcado como Activo y Principal.
   Quien elegía otro perfil (p. ej. Comprador) lo SUMABA y seguía registrándose
   como productor principal (comprobado: rol=productor, roles=[productor,
   comprador]). Si la primera elección es otro perfil y «Productor» sigue
   intacto, se desmarca pulsando su propio botón (sin tocar el DOM de React);
   React pasa entonces el perfil elegido a principal. Quien quiera ser también
   productor puede volver a marcarlo. */
; (function () {
  // La ruta se comprueba en cada clic, no al cargar: desde la portada se llega
  // a /afiliate/ por navegación interna de React y este script no se re-ejecuta.
  var tocado = false, rutaVista = "";
  function enAfiliateSinRol() {
    return /^\/afiliate\/?$/.test(location.pathname) && !new URLSearchParams(location.search).has("rol");
  }
  function tarjetaDe(boton) {
    var c = boton.parentElement;
    for (var i = 0; i < 6 && c; i++) {
      if (/Produzco café|Compro café|Tueste, compro|Sirvo café|Trabajo en barra|Audito fincas|Vendo maquinaria|Muevo café|Proceso pergamino|Llevo café|Disfruto el café|Asesoro a otros/.test(c.textContent) &&
          c.querySelectorAll("button").length <= 3) return c;
      c = c.parentElement;
    }
    return null;
  }
  function esProductor(t) { return t && /Produzco café/.test(t.textContent); }
  document.addEventListener("click", function (ev) {
    // Solo cuentan los clics de la persona: la propia capa pulsa botones de las
    // tarjetas por código al cargar y eso no es «su primera elección».
    if (!ev.isTrusted) return;
    if (location.pathname + location.search !== rutaVista) { rutaVista = location.pathname + location.search; tocado = false; }
    if (!enAfiliateSinRol()) return;
    var b = ev.target.closest && ev.target.closest("button");
    if (!b || tocado) return;
    var etiqueta = (b.textContent || "").trim();
    var t = tarjetaDe(b);
    if (!t) return;
    tocado = true;                       // solo la primera elección cuenta
    if (esProductor(t) || etiqueta !== "Elegir") return;
    setTimeout(function () {
      var activo = Array.prototype.find.call(document.querySelectorAll("button"), function (x) {
        return (x.textContent || "").trim() === "Activo" && esProductor(tarjetaDe(x));
      });
      if (activo) activo.click();
    }, 0);
  }, true);
})();
