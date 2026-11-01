/* Red Café Ecuador — secciones del panel plegadas
   ------------------------------------------------------------------
   El panel fue creciendo: publicaciones, bolsa de empleo, cursos, reportes,
   historial de pedidos y —para la administración— los servicios de la
   plataforma. Cada una abría de par en par su formulario completo, así que
   entrar al panel era caer en una página larguísima donde había que hacer
   scroll para encontrar lo de uno. Los formularios de publicar un empleo o
   editar un lote ocupan una pantalla entera y casi nunca se usan.

   Aquí cada sección se pliega. Se ve su título; el contenido se despliega al
   pulsarlo. Lo que abras se recuerda en este navegador, para que quien use a
   diario una sección no tenga que abrirla cada vez.

   No toca nada de React: solo secciones propias, marcadas con
   data-redcafe-propio, y solo mueve nodos dentro de ellas.
*/
(function () {
  "use strict";

  if (window.__redcafeColapsables) return;
  window.__redcafeColapsables = true;

  // Secciones que se pliegan. Se nombran una a una a propósito: plegar por
  // regla general acabaría escondiendo algún aviso corto que debe leerse.
  var SECCIONES = [
    "redcafe-bandeja",
    "redcafe-mis-publicaciones",
    "redcafe-empleos-panel",
    "redcafe-mis-cursos",
    "redcafe-admin-servicios",
    "redcafe-admin-verificaciones",
    "redcafe-socios-admin",
    "redcafe-registro-actividad",
    "redcafe-mis-reportes",
    "redcafe-solicitudes-curso"
  ];

  var CLAVE = "redcafe-panel-abierto:";

  function recordado(id) {
    try { return window.localStorage.getItem(CLAVE + id) === "1"; }
    catch (e) { return false; }
  }

  function recordar(id, abierto) {
    try { window.localStorage.setItem(CLAVE + id, abierto ? "1" : "0"); }
    catch (e) { /* navegación privada: se pliega y ya */ }
  }

  function estilos() {
    if (document.getElementById("redcafe-colapsables-css")) return;
    var s = document.createElement("style");
    s.id = "redcafe-colapsables-css";
    s.textContent =
      ".redcafe-col-boton{align-items:center;background:transparent;border:0;border-top:1px solid rgba(59,26,12,.14);" +
      "color:var(--color-filtrado-800,#3b1a0c);cursor:pointer;display:flex;font:inherit;font-weight:700;gap:.6rem;" +
      "justify-content:space-between;margin-top:.6rem;padding:.7rem 0 .2rem;text-align:left;width:100%}" +
      ".redcafe-col-boton:hover{color:var(--color-filtrado-600,#7a3411)}" +
      ".redcafe-col-boton:focus-visible{outline:2px solid rgba(122,52,17,.45);outline-offset:2px}" +
      ".redcafe-col-texto{font-size:.85rem}" +
      ".redcafe-col-cuenta{background:var(--color-crema-oscuro,#f3f1ea);border-radius:999px;font-size:.7rem;" +
      "font-weight:700;margin-left:.4rem;padding:.1rem .55rem}" +
      ".redcafe-col-flecha{font-size:.8rem;transition:transform .15s ease}" +
      '.redcafe-col-boton[aria-expanded="true"] .redcafe-col-flecha{transform:rotate(180deg)}' +
      ".redcafe-col-cuerpo{padding-top:.4rem}";
    document.head.appendChild(s);
  }

  /* Las secciones no tienen todas la misma forma: unas envuelven su contenido
     en un .redcafe-pub-wrap, otras cuelgan directamente de la <section>, y la
     bolsa de empleo mete el título dentro de una cabecera con subtítulo. Esto
     localiza, sea cual sea la forma, qué bloque es la cabecera (se queda a la
     vista) y cuál es el cuerpo (se pliega). */
  function partes(seccion) {
    var h = seccion.querySelector("h3") || seccion.querySelector("h2");
    if (!h) return null;
    var nivel = h;
    while (nivel.parentElement && nivel.parentElement !== seccion) nivel = nivel.parentElement;
    if (nivel === h) return { contenedor: seccion, cabecera: h, titulo: h };
    var cabecera = h;
    while (cabecera.parentElement && cabecera.parentElement !== nivel) cabecera = cabecera.parentElement;
    return { contenedor: nivel, cabecera: cabecera, titulo: h };
  }

  function contar(cuerpo) {
    return cuerpo.querySelectorAll(
      ".redcafe-pub-card, .redcafe-mis-card, .redcafe-empleo-card, .redcafe-act-fila"
    ).length;
  }

  function refrescarCuenta(boton, cuerpo, titulo) {
    var n = contar(cuerpo);
    var marca = boton.querySelector(".redcafe-col-cuenta");
    if (!marca) return;
    if (n > 0) { marca.textContent = String(n); marca.hidden = false; }
    else { marca.textContent = ""; marca.hidden = true; }
    var txt = boton.querySelector(".redcafe-col-texto");
    if (txt) txt.textContent = (boton.getAttribute("aria-expanded") === "true" ? "Ocultar " : "Abrir ") + titulo;
  }

  function plegar(seccion) {
    var id = seccion.id;
    if (!id || seccion.getAttribute("data-redcafe-colapsable") === "1") return;

    // Plegar mueve nodos a un contenedor nuevo, y eso solo puede hacerse con
    // lo que este sitio pintó. Si un día una de estas secciones la pintara
    // React, reparentar sus hijos rompería su reconciliación —el fallo que en
    // este proyecto acaba en «Application error»—. La marca es la prueba.
    if (seccion.getAttribute("data-redcafe-propio") !== "1") return;

    var p = partes(seccion);
    if (!p) return;

    // Todo lo que va después de la cabecera pasa a ser el cuerpo plegable.
    var siguientes = [];
    var n = p.cabecera.nextSibling;
    while (n) { siguientes.push(n); n = n.nextSibling; }
    if (!siguientes.length) return;

    seccion.setAttribute("data-redcafe-colapsable", "1");
    estilos();

    var cuerpo = document.createElement("div");
    cuerpo.className = "redcafe-col-cuerpo";
    cuerpo.id = id + "-cuerpo";
    siguientes.forEach(function (nodo) { cuerpo.appendChild(nodo); });

    // El texto del botón sale del propio encabezado, no del bloque que lo
    // contiene: en la bolsa de empleo ese bloque arrastra también el subtítulo
    // y el botón acababa diciendo «Abrir bolsa de empleopublica oportunidades…».
    var titulo = (p.titulo.textContent || "esta sección").trim().toLowerCase();
    if (titulo.length > 46) titulo = titulo.slice(0, 46) + "…";

    var boton = document.createElement("button");
    boton.type = "button";
    boton.className = "redcafe-col-boton";
    boton.setAttribute("aria-controls", cuerpo.id);
    boton.innerHTML = '<span><span class="redcafe-col-texto"></span>' +
      '<span class="redcafe-col-cuenta" hidden></span></span>' +
      '<span class="redcafe-col-flecha" aria-hidden="true">▾</span>';

    p.contenedor.appendChild(boton);
    p.contenedor.appendChild(cuerpo);

    function aplicar(abierto) {
      boton.setAttribute("aria-expanded", abierto ? "true" : "false");
      cuerpo.hidden = !abierto;
      refrescarCuenta(boton, cuerpo, titulo);
    }

    boton.addEventListener("click", function () {
      var abierto = boton.getAttribute("aria-expanded") !== "true";
      aplicar(abierto);
      recordar(id, abierto);
    });

    aplicar(recordado(id));

    // Las listas llegan por fetch, después de plegar la sección: el número
    // que acompaña al título se pone al día cuando el módulo termina.
    [800, 2000, 4000].forEach(function (t) {
      setTimeout(function () { refrescarCuenta(boton, cuerpo, titulo); }, t);
    });
  }

  function repasar() {
    if (location.pathname.indexOf("/panel") !== 0 &&
        location.pathname.indexOf("/admin") !== 0) return;
    SECCIONES.forEach(function (id) {
      var s = document.getElementById(id);
      if (s) { try { plegar(s); } catch (e) {} }
    });
  }

  // Cada módulo monta su sección cuando le responde su API, así que no hay un
  // único momento bueno: se repasa varias veces y luego se vigila el <main>.
  function arrancar() {
    repasar();
    [600, 1200, 2000, 3200, 5000, 7000].forEach(function (t) { setTimeout(repasar, t); });
    var main = document.querySelector("main");
    if (!main || main.getAttribute("data-redcafe-col-obs") === "1") return;
    main.setAttribute("data-redcafe-col-obs", "1");
    try {
      new MutationObserver(function () { repasar(); })
        .observe(main, { childList: true, subtree: false });
    } catch (e) { /* sin observador quedan los reintentos */ }
  }

  if (document.readyState === "complete") arrancar();
  else window.addEventListener("load", arrancar, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(arrancar, 700); });
})();
