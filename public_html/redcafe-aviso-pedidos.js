/* Red Café Ecuador — advertencia antes de pedir
   ------------------------------------------------------------------
   Red Café Ecuador conecta a las partes: no cobra, no retiene dinero y no
   garantiza la operación. Quien va a enviar dinero tiene que saberlo ANTES
   de pulsar, no en la letra pequeña.

   El formulario de pedido lo pinta el propio Next.js y no se puede tocar sin
   romper React. En vez de eso se intercepta la petición: cuando algo del
   sitio va a crear un pedido, se muestra la advertencia; si el comprador la
   acepta, la petición continúa con `aviso_aceptado: true` y la API deja
   constancia de qué versión del aviso aceptó.
*/
(function () {
  "use strict";

  var VERSION_AVISO = "2026-09-07";
  var RUTA = /\/api\/pedidos\.php\?action=create(_service)?/;
  var CLAVE = "redcafe-aviso-pedidos";
  var aceptadoEnSesion = false;

  var TEXTO = [
    "Red Café Ecuador es un punto de encuentro entre productores, compradores y proveedores. No intervenimos en los pagos, no retenemos el dinero y no somos parte del contrato.",
    "No hagas transferencias ni depósitos si no estás seguro de la identidad de la otra parte.",
    "Antes de enviar dinero: confirma con quién hablas por más de un canal, pide una muestra del café, acuerda por escrito la forma de pago y la entrega, y guarda el comprobante de todo."
  ];

  try {
    aceptadoEnSesion = sessionStorage.getItem(CLAVE) === VERSION_AVISO;
  } catch (e) {
    // Navegación privada o almacenamiento bloqueado: se pregunta cada vez.
  }

  function el(tag, attrs, texto) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
      if (k === "className") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }

  /* ── El diálogo ──────────────────────────────────────────────────── */

  function preguntar() {
    return new Promise(function (resolver) {
      var previo = document.activeElement;
      var fondo = el("div", { className: "redcafe-avisopago-fondo" });
      var caja = el("div", {
        className: "redcafe-avisopago",
        role: "alertdialog",
        "aria-modal": "true",
        "aria-labelledby": "redcafe-avisopago-titulo"
      });

      caja.appendChild(el("p", { className: "redcafe-avisopago-rotulo" }, "Antes de continuar"));
      caja.appendChild(el("h2", { id: "redcafe-avisopago-titulo" }, "Cuidado con los pagos"));
      TEXTO.forEach(function (p, i) {
        caja.appendChild(el("p", { className: i === 1 ? "redcafe-avisopago-clave" : "" }, p));
      });

      var pie = el("p", { className: "redcafe-avisopago-pie" },
        "Enviar esta solicitud no genera ningún cobro. El precio y la forma de pago se acuerdan directamente entre las partes.");
      caja.appendChild(pie);

      var acciones = el("div", { className: "redcafe-avisopago-acciones" });
      var cancelar = el("button", { type: "button", className: "redcafe-avisopago-cancelar" }, "Cancelar");
      var seguir = el("button", { type: "button", className: "redcafe-avisopago-seguir" }, "Entiendo, enviar solicitud");
      acciones.appendChild(cancelar);
      acciones.appendChild(seguir);
      caja.appendChild(acciones);

      function cerrar(respuesta) {
        document.removeEventListener("keydown", teclado, true);
        if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
        if (previo && previo.focus) { try { previo.focus(); } catch (e) {} }
        resolver(respuesta);
      }
      function teclado(ev) {
        if (ev.key === "Escape") { ev.preventDefault(); cerrar(false); }
      }

      cancelar.addEventListener("click", function () { cerrar(false); });
      seguir.addEventListener("click", function () {
        try { sessionStorage.setItem(CLAVE, VERSION_AVISO); } catch (e) {}
        aceptadoEnSesion = true;
        cerrar(true);
      });
      document.addEventListener("keydown", teclado, true);

      fondo.appendChild(caja);
      document.body.appendChild(fondo);
      seguir.focus();
    });
  }

  /* ── Intercepción de la petición ─────────────────────────────────── */

  function urlDe(entrada) {
    if (typeof entrada === "string") return entrada;
    if (entrada && typeof entrada.url === "string") return entrada.url;
    return "";
  }

  // Se añade la aceptación al cuerpo sin alterar el resto. Si el cuerpo no es
  // JSON legible, se deja intacto: la API lo tratará como no aceptado y lo
  // dejará anotado, pero el pedido no se pierde.
  function conAceptacion(cuerpo) {
    if (typeof cuerpo !== "string") return cuerpo;
    try {
      var datos = JSON.parse(cuerpo);
      if (datos && typeof datos === "object" && !Array.isArray(datos)) {
        datos.aviso_aceptado = true;
        datos.aviso_version = VERSION_AVISO;
        return JSON.stringify(datos);
      }
    } catch (e) {}
    return cuerpo;
  }

  function respuestaCancelada() {
    var cuerpo = JSON.stringify({
      ok: false,
      error: "Solicitud cancelada. No se envió nada."
    });
    return new Response(cuerpo, {
      status: 409,
      headers: { "Content-Type": "application/json" }
    });
  }

  var fetchOriginal = window.fetch;
  if (typeof fetchOriginal !== "function" || window.__redcafeAvisoPedidos) return;
  window.__redcafeAvisoPedidos = true;

  window.fetch = function (entrada, opciones) {
    var url = urlDe(entrada);
    var esPedido = RUTA.test(url);
    var metodo = String((opciones && opciones.method) ||
      (entrada && entrada.method) || "GET").toUpperCase();

    if (!esPedido || metodo !== "POST") {
      return fetchOriginal.apply(this, arguments);
    }

    var args = Array.prototype.slice.call(arguments);

    function continuar() {
      if (opciones && typeof opciones.body === "string") {
        var copia = {};
        Object.keys(opciones).forEach(function (k) { copia[k] = opciones[k]; });
        copia.body = conAceptacion(opciones.body);
        args[1] = copia;
      }
      return fetchOriginal.apply(window, args);
    }

    if (aceptadoEnSesion) return continuar();

    return preguntar().then(function (acepta) {
      return acepta ? continuar() : respuestaCancelada();
    });
  };

  /* ── Aviso permanente ────────────────────────────────────────────── */
  // La advertencia del diálogo se ve una vez por sesión. En el marketplace
  // queda además a la vista, sin depender de que nadie pulse nada.

  function avisoFijo() {
    if (document.getElementById("redcafe-avisopago-fijo")) return;

    /* Solo en el listado del marketplace, no en la ficha de un lote.
       ------------------------------------------------------------------
       Antes entraba en las dos, y en la ficha causaba dos problemas: se
       añadía como último hijo del <main> compitiendo con la propia ficha, que
       también se añade ahí, así que acababa antes o después de ella según cuál
       ganara la carrera —medido: el aviso aparecía en dos posiciones distintas
       entre dos cargas de la misma página—; y encima ni se veía, porque la
       regla que aísla la ficha oculta todo hermano que no sea ella. Un nodo
       invisible que además desordenaba la página. */
    if (!/^\/marketplace\/?$/.test(location.pathname)) return;
    var main = document.querySelector("main");
    if (!main) return;

    var nota = el("aside", {
      id: "redcafe-avisopago-fijo",
      className: "redcafe-avisopago-fijo",
      "data-redcafe-propio": "1"
    });
    nota.appendChild(el("strong", {}, "Opera con cuidado."));
    nota.appendChild(el("span", {},
      " Red Café Ecuador no cobra, no retiene dinero ni garantiza las operaciones entre miembros. " +
      "No transfieras dinero si no estás seguro de la identidad de la otra parte: verifica al vendedor, " +
      "pide una muestra y acuerda por escrito la forma de pago."));
    var enlace = el("a", { href: "/terminos-y-condiciones/" }, "Términos y condiciones");
    nota.appendChild(document.createTextNode(" "));
    nota.appendChild(enlace);

    // Se añade como último hijo del <main>, sin tocar ni vaciar lo que React
    // ya puso ahí.
    main.appendChild(nota);
  }

  if (document.readyState === "complete") setTimeout(avisoFijo, 1200);
  else window.addEventListener("load", function () { setTimeout(avisoFijo, 1200); }, { once: true });
  [2500, 4500].forEach(function (t) { setTimeout(avisoFijo, t); });
  // Next navega sin recargar: hay que volver a montar al cambiar de ruta.
  document.addEventListener("redcafe:ruta", function () { setTimeout(avisoFijo, 1200); });
})();
