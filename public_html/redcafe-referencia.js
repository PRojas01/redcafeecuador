/* Red Café Ecuador — referencia de origen para los mensajes de WhatsApp
   ------------------------------------------------------------------
   Cuando alguien pulsa "Contactar", se abre WhatsApp con un borrador. Hasta
   ahora ese borrador decía de qué café hablaba, pero no de dónde salía: al
   productor le llegaba un mensaje suelto, sin forma de abrir la publicación
   ni de citarla después.

   Este archivo añade al final de cada borrador tres líneas: que el pedido se
   generó en Red Café Ecuador, el enlace directo a la publicación y un código
   de referencia con el que las dos partes pueden identificar la operación.

   Se expone como global porque lo usan varios scripts del sitio.
*/
(function () {
  "use strict";

  // El dominio va fijo: el mensaje viaja a WhatsApp y tiene que abrir la web
  // pública, no el localhost desde el que se esté probando.
  var SITIO = "https://redcafeecuador.com";

  var RUTAS = {
    lote: function (id) { return "/marketplace/" + encodeURIComponent(id) + "/"; },
    servicio: function () { return "/marketplace/"; },
    empleo: function () { return "/marketplace/"; }
  };

  var PREFIJOS = { lote: "RCE-LOTE", servicio: "RCE-SERV", empleo: "RCE-EMP" };

  /**
   * Bloque de referencia listo para pegar en el cuerpo del mensaje.
   * Devuelve texto plano con saltos de línea; quien lo use debe codificarlo
   * con encodeURIComponent junto con el resto del mensaje.
   */
  function referenciaOrigen(tipo, id) {
    var clave = RUTAS[tipo] ? tipo : "lote";
    var codigo = (PREFIJOS[clave] || "RCE") + (id ? "-" + String(id).toUpperCase() : "");
    var lineas = [
      "",
      "— Pedido generado en Red Café Ecuador —",
      "Publicación: " + SITIO + RUTAS[clave](id),
      "Referencia: " + codigo
    ];
    return lineas.join("\n");
  }

  /** El mensaje completo, ya codificado para la URL de WhatsApp. */
  function mensajeConReferencia(texto, tipo, id) {
    return encodeURIComponent(String(texto || "") + referenciaOrigen(tipo, id));
  }

  window.redcafeReferenciaOrigen = referenciaOrigen;
  window.redcafeMensajeWhatsapp = mensajeConReferencia;
})();
