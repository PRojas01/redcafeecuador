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

  var VERSION_AVISO = "2026-10-23";
  var RUTA = /\/api\/pedidos\.php\?action=create(_service)?/;
  var CLAVE = "redcafe-aviso-pedidos";
  var aceptadoEnSesion = false;

  var TEXTO = [
    "Esta operación es estrictamente entre tú y quien publica. Red Café Ecuador solo pone en contacto a las partes: no es parte del contrato, no cobra, no retiene dinero ni garantiza la entrega o la calidad.",
    "No hagas transferencias ni depósitos si no estás seguro de la identidad de la otra parte.",
    "Tus datos: quien publica recibirá tu nombre y esta solicitud en su panel, y podrá responderte por el chat de la Red. Si decides seguir por WhatsApp o por teléfono, compartirás directamente tus datos de contacto con esa persona y esa conversación quedará fuera de la plataforma.",
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
      caja.appendChild(el("h2", { id: "redcafe-avisopago-titulo" }, "Antes de enviar tu solicitud"));
      TEXTO.forEach(function (p, i) {
        caja.appendChild(el("p", { className: i === 1 ? "redcafe-avisopago-clave" : "" }, p));
      });

      var pie = el("p", { className: "redcafe-avisopago-pie" },
        "Enviar esta solicitud no genera ningún cobro. El precio y la forma de pago se acuerdan directamente entre las partes.");
      caja.appendChild(pie);

      var acciones = el("div", { className: "redcafe-avisopago-acciones" });
      var cancelar = el("button", { type: "button", className: "redcafe-avisopago-cancelar" }, "Cancelar");
      var seguir = el("button", { type: "button", className: "redcafe-avisopago-seguir" }, "Acepto y envío la solicitud");
      // Aceptación expresa: el botón se activa solo al marcar la casilla.
      var acepto = el("label", { className: "redcafe-avisopago-acepto" });
      var casilla = el("input", { type: "checkbox" });
      acepto.appendChild(casilla);
      acepto.appendChild(document.createTextNode(" Entiendo que la operación es entre las partes y acepto que mi nombre y mi solicitud se compartan con quien publica."));
      caja.appendChild(acepto);
      seguir.disabled = true;
      casilla.addEventListener("change", function () { seguir.disabled = !casilla.checked; });
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
      casilla.focus();
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
  // queda además a la vista: ese aviso fijo ya lo pinta React.

  /* aviso-contacto 2026-10-23 */
  /* ── Salir a WhatsApp ─────────────────────────────────────────────
     Antes de abrir WhatsApp se avisa que se sale de la plataforma: lo que se
     hable allí no lo ve ni lo guarda Red Café, y la operación es entre las
     partes. Una vez por sesión; se puede cancelar. */
  var CLAVE_WA = "redcafe-aviso-whatsapp";
  var NUMERO_RED = "593968641376";
  function avisoWhatsapp(href) {
    var propio = href.indexOf(NUMERO_RED) !== -1;
    return new Promise(function (resolver) {
      var previo = document.activeElement;
      var fondo = el("div", { className: "redcafe-avisopago-fondo" });
      var caja = el("div", { className: "redcafe-avisopago", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "redcafe-avisowa-titulo" });
      caja.appendChild(el("p", { className: "redcafe-avisopago-rotulo" }, "Vas a salir de Red Café Ecuador"));
      caja.appendChild(el("h2", { id: "redcafe-avisowa-titulo" }, propio ? "Escribir a Red Café por WhatsApp" : "Continuar por WhatsApp"));
      caja.appendChild(el("p", {}, "WhatsApp es un servicio de otra empresa (Meta). Lo que escribas allí queda fuera de esta plataforma: Red Café no puede verlo, moderarlo ni guardarlo, y se rige por las condiciones de WhatsApp."));
      if (!propio) {
        caja.appendChild(el("p", { className: "redcafe-avisopago-clave" }, "Cualquier acuerdo, pago o envío que hagas con esta persona es estrictamente entre ustedes. Red Café Ecuador no es parte de la operación ni la garantiza."));
        caja.appendChild(el("p", {}, "Al escribirle compartirás tu número de teléfono con ella. Compártele solo los datos necesarios y desconfía de pedidos de pago anticipado."));
      } else {
        caja.appendChild(el("p", {}, "Al escribirnos compartirás tu número de teléfono con Red Café Ecuador; lo usaremos solo para responderte."));
      }
      var acciones = el("div", { className: "redcafe-avisopago-acciones" });
      var cancelar = el("button", { type: "button", className: "redcafe-avisopago-cancelar" }, "Quedarme en la Red");
      var seguir = el("button", { type: "button", className: "redcafe-avisopago-seguir" }, "Entiendo, abrir WhatsApp");
      acciones.appendChild(cancelar); acciones.appendChild(seguir); caja.appendChild(acciones);
      function cerrar(r) {
        document.removeEventListener("keydown", tecla, true);
        if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
        if (previo && previo.focus) { try { previo.focus(); } catch (e) {} }
        resolver(r);
      }
      function tecla(ev) { if (ev.key === "Escape") { ev.preventDefault(); cerrar(false); } }
      cancelar.addEventListener("click", function () { cerrar(false); });
      seguir.addEventListener("click", function () { try { sessionStorage.setItem(CLAVE_WA, "1"); } catch (e) {} cerrar(true); });
      document.addEventListener("keydown", tecla, true);
      fondo.appendChild(caja); document.body.appendChild(fondo); seguir.focus();
    });
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href*="wa.me/"], a[href*="api.whatsapp.com/"], a[href^="whatsapp:"]') : null;
    if (!a || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey) return;
    try { if (sessionStorage.getItem(CLAVE_WA) === "1") return; } catch (e) {}
    ev.preventDefault(); ev.stopPropagation();
    var href = a.href, destino = a.getAttribute("target");
    avisoWhatsapp(href).then(function (ok) {
      if (!ok) return;
      if (destino === "_blank") window.open(href, "_blank", "noopener"); else location.href = href;
    });
  }, true);
})();
