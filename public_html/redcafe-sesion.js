/* Red Café Ecuador — una sola pregunta por respuesta
   ---------------------------------------------------------------------------
   Cada uno de nuestros archivos pregunta por su cuenta "¿quién ha entrado?"
   (api/auth.php?action=me). En /comunidad/ eso son seis llamadas idénticas en
   la misma carga, más la lista de la comunidad pedida dos veces. En un hosting
   compartido cada llamada cuesta medio segundo largo, y para quien ha iniciado
   sesión se suman: PHP guarda la sesión en un archivo con candado exclusivo, y
   mientras una petición lo tiene, las demás del mismo visitante hacen cola.

   Aquí no se toca ningún archivo: se envuelve fetch y, durante unos segundos,
   la misma consulta de solo lectura se responde una vez y se reparte. Cualquier
   envío (entrar, salir, publicar) vacía lo guardado, así que nadie ve datos
   viejos después de actuar.

   Va antes que el resto de scripts a propósito. */
(function () {
  "use strict";

  if (window.__redcafeUnaSolaVez) return;
  window.__redcafeUnaSolaVez = true;

  var original = window.fetch;
  if (typeof original !== "function") return;

  // Cuánto vale una respuesta guardada. Lo justo para juntar la ráfaga de una
  // carga de página, no tanto como para mostrar algo desactualizado. Cualquier envío la vacía.
  var VIDA_MS = 10000;

  // Solo consultas de lectura que varias partes piden a la vez.
  var REPETIDAS = [
    /\/api\/auth\.php\?action=me(&|$)/,
    /\/api\/media\.php\?action=redes(&|$)/,
    /\/api\/comunidad\.php\?action=list(&|$)/,
    /\/api\/precios\.php\?action=list(&|$)/,
    /\/api\/marketplace-servicios\.php\?action=list(&|$)/,
    /\/api\/lotes\.php\?action=mine(&|$)/
  ];

  var guardadas = Object.create(null);

  function direccion(entrada) {
    if (typeof entrada === "string") return entrada;
    if (entrada && typeof entrada.url === "string") return entrada.url;
    return "";
  }

  /* Varias partes añaden un parámetro contra la caché (?_v=1790…) distinto en
     cada llamada. Para el navegador son direcciones diferentes y nunca
     coincidirían. Se ignora solo al agrupar: la petición real va tal cual. */
  function claveDe(url) {
    return String(url).replace(/([?&])(_v|_|cb|ts|t)=\d+(&|$)/g, function (todo, antes, nombre, despues) {
      return despues === "&" ? antes : (antes === "?" ? "" : "");
    });
  }

  function metodoDe(entrada, opciones) {
    var m = (opciones && opciones.method) || (entrada && entrada.method) || "GET";
    return String(m).toUpperCase();
  }

  window.fetch = function (entrada, opciones) {
    var url, metodo;
    try {
      url = direccion(entrada);
      metodo = metodoDe(entrada, opciones);
    } catch (e) {
      return original.apply(this, arguments);
    }

    // Algo cambió: lo guardado deja de valer.
    if (metodo !== "GET") {
      guardadas = Object.create(null);
      return original.apply(this, arguments);
    }

    var repetida = false;
    for (var i = 0; i < REPETIDAS.length; i++) {
      if (REPETIDAS[i].test(url)) { repetida = true; break; }
    }
    if (!repetida) return original.apply(this, arguments);

    var ahora = Date.now();
    var clave = claveDe(url);
    var v = guardadas[clave];
    if (v && (ahora - v.ts) < VIDA_MS) {
      // Cada quien recibe su propia copia: un cuerpo de respuesta solo se
      // puede leer una vez.
      return v.promesa.then(function (r) { return r.clone(); });
    }

    var promesa = original.apply(this, arguments);
    guardadas[clave] = { ts: ahora, promesa: promesa };
    promesa.catch(function () { delete guardadas[clave]; });
    return promesa.then(function (r) { return r.clone(); });
  };
})();
