/* Red Café Ecuador — fase 1 de conversión
 * ---------------------------------------------------------------------------
 * Cuatro arreglos medidos el 15 de septiembre de 2026, sin cambiar el contenido
 * de la plataforma ni quitar ningún servicio:
 *
 *   1. Medición propia del embudo de registro (api/metricas.php): contadores
 *      por día, sin IP ni cookies.
 *   2. Portada: los precios de «Servicios especializados» salen de los datos
 *      reales. El expediente EUDR se anunciaba «desde $30» y cuesta $120.
 *   3. Portada: cifras reales de la Red bajo la cabecera, y fuera la etiqueta
 *      «Por tiempo limitado», que contradecía «Estar en la Red es gratis».
 *   4. Registro: se oculta el selector de 14 planes —todos a $0 y con uno ya
 *      elegido por defecto— y el botón para avanzar queda fijo en el móvil,
 *      donde estaba a 3,5 pantallas de distancia.
 *
 * Fase 1b (diagnóstico del 15 de septiembre, tarde):
 *   5. Portada: el mapa listaba seis provincias de los lotes de MUESTRA; ahora
 *      salen las provincias reales con lotes y miembros.
 *   6. Sesión caducada: si el navegador guarda «redcafe_sesion» pero el
 *      servidor ya no tiene sesión, se limpia y no se muestra «Ya eres parte de
 *      la Red» a quien en realidad tiene que entrar o registrarse.
 *   7. Tras registrarse: un siguiente paso según el perfil (publicar lote,
 *      publicar lo que busca o publicar su servicio), en vez de solo
 *      «Completar mi perfil».
 *   8. Panel: el enlace a requerimientos baja hasta la sección cuando aparece.
 *
 * REGLA DE TODA LA CAPA PROPIA: nunca se escribe texto, se mueve ni se borra un
 * nodo que pinta React (acaba en «NotFoundError: removeChild»). Lo que hay que
 * cambiar se oculta con un atributo y se pinta al lado en un contenedor propio
 * marcado data-redcafe-propio.
 */
(function () {
  "use strict";

  var API = "/api/metricas.php";

  function texto(n) { return ((n && n.textContent) || "").replace(/\s+/g, " ").trim(); }
  function ruta() { return location.pathname || "/"; }
  function esPortada() { return ruta() === "/" || ruta() === "/index.html"; }
  function esRegistro() { return ruta().indexOf("/afiliate") === 0; }

  /* ── 1. Medición ────────────────────────────────────────────────────── */

  var enviados = {};
  function medir(evento, unaVezPorRuta) {
    var clave = evento + "|" + ruta();
    if (unaVezPorRuta && enviados[clave]) return;
    enviados[clave] = true;
    var cuerpo = JSON.stringify({ e: evento, p: ruta() });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API + "?action=evento", new Blob([cuerpo], { type: "application/json" }));
        return;
      }
    } catch (e) {}
    try {
      fetch(API + "?action=evento", {
        method: "POST", keepalive: true, credentials: "omit",
        headers: { "Content-Type": "application/json" }, body: cuerpo
      }).catch(function () {});
    } catch (e) {}
  }

  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href^="/afiliate"]') : null;
    if (a && !esRegistro()) medir("cta_registro", false);
    var paso = ev.target && ev.target.closest ? ev.target.closest("#redcafe-siguiente-paso a, #redcafe-panel-accion a") : null;
    if (paso) medir("activacion_clic", false);
    var b = ev.target && ev.target.closest ? ev.target.closest("button[type=submit]") : null;
    if (b && esRegistro() && /Crear mi cuenta/.test(texto(b))) {
      medir("registro_enviado", false);
      try { sessionStorage.setItem("redcafe-registro-enviado", String(Date.now())); } catch (e) {}
      comprobarAlta();
    }
  }, true);

  /* Tras crear la cuenta la página no cambia de ruta, así que el alta se
     confirma preguntando si ya hay sesión. Con un número FIJO de intentos: una
     comprobación que solo se detiene «cuando sale bien» es un bucle de
     peticiones en cuanto algo falla (ya pasó en este proyecto). */
  var intentosAlta = 0;
  function comprobarAlta() {
    if (intentosAlta >= 5) return;
    intentosAlta++;
    setTimeout(function () {
      fetch("/api/auth.php?action=me", { credentials: "include", cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.ok && res.data && res.data.user && res.data.user.id) {
            intentosAlta = 5;
            try { sessionStorage.removeItem("redcafe-registro-enviado"); } catch (e) {}
            medir("registro_ok", true);
          } else {
            comprobarAlta();
          }
        })
        .catch(comprobarAlta);
    }, 2000);
  }

  function medirLlegadaAlPanel() {
    if (ruta().indexOf("/panel") !== 0) return;
    try {
      var t = Number(sessionStorage.getItem("redcafe-registro-enviado") || 0);
      // Solo cuenta como alta si el envío fue hace menos de 10 minutos.
      if (t && Date.now() - t < 600000) {
        sessionStorage.removeItem("redcafe-registro-enviado");
        medir("registro_ok", true);
      }
    } catch (e) {}
  }

  /* ── 2 y 3. Portada ─────────────────────────────────────────────────── */

  var preciosPedidos = false;

  function formatoPrecio(precio) {
    var n = Number(precio);
    if (!isFinite(n)) return "";
    return n === Math.floor(n) ? String(n) : n.toFixed(2);
  }

  /* Copias propias y repintados de React. Para no escribir en un nodo de
     React se oculta el original y se pinta al lado una copia. Pero cuando
     React repinta (la barra de precio cada 10 minutos, una hidratación
     fallida, un cambio de pestaña del panel) crea un nodo nuevo sin la marca:
     la copia vieja quedaba huérfana y visible y la siguiente pasada añadía
     otra. «Fuente» llegó a salir cuatro veces en el panel. Cada copia guarda
     la firma de su original; si ya no va detrás de él, se busca en el mismo
     contenedor el nodo nuevo con esa firma, se oculta y la copia pasa detrás.
     Si no aparece, la copia sobra y se retira (es nuestra, no de React).
     Esta misma función está en redcafe-v60-final.js,
     redcafe-v60-mejoras-obligatorias.js y redcafe-conversion.js. */
  function firmaNodo(el) {
    return el.tagName + "|" + String(el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200);
  }
  function marcarCopia(copia, original) {
    copia.setAttribute("data-redcafe-copia", "1");
    copia.setAttribute("data-redcafe-original", firmaNodo(original));
  }
  function limpiarCopiasHuerfanas() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-redcafe-copia="1"]'), function (copia) {
      var padre = copia.parentNode;
      if (!padre) return;
      var previo = copia.previousElementSibling;
      if (previo && previo.getAttribute("data-redcafe-oculto-react") === "1") return;
      var firma = copia.getAttribute("data-redcafe-original") || "";
      var nuevo = null;
      if (firma) {
        Array.prototype.some.call(padre.children, function (h) {
          if (h === copia || h.hasAttribute("data-redcafe-propio")) return false;
          if (h.getAttribute("data-redcafe-oculto-react") === "1") return false;
          if (firmaNodo(h) !== firma) return false;
          nuevo = h;
          return true;
        });
      }
      if (nuevo) {
        nuevo.setAttribute("data-redcafe-oculto-react", "1");
        nuevo.insertAdjacentElement("afterend", copia);
      } else {
        padre.removeChild(copia);
      }
    });
  }

  function preciosReales() {
    if (preciosPedidos) return;
    var titulo = Array.prototype.slice.call(document.querySelectorAll("main p")).filter(function (p) {
      return texto(p) === "Se contratan solo cuando los necesitas";
    })[0];
    if (!titulo) return;
    var lista = titulo.nextElementSibling;
    if (!lista || lista.tagName !== "UL" || lista.getAttribute("data-redcafe-oculto-react") === "1") return;
    preciosPedidos = true;

    var nombres = Array.prototype.slice.call(lista.querySelectorAll("li b")).map(texto);
    fetch("/api/marketplace-servicios.php?action=list", { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var servicios = (res && res.ok && res.data && res.data.servicios) || [];
        var porTitulo = {};
        servicios.forEach(function (s) { porTitulo[texto({ textContent: s.titulo })] = s; });
        // Si falta cualquiera de los servicios de la lista, no se toca nada:
        // mejor el precio antiguo que una lista a medias.
        var filas = [];
        for (var i = 0; i < nombres.length; i++) {
          var s = porTitulo[nombres[i]];
          if (!s || !(Number(s.precio) > 0)) return;
          filas.push(s);
        }
        if (!filas.length) return;

        var propia = document.createElement("ul");
        propia.className = lista.className;
        propia.setAttribute("data-redcafe-propio", "1");
        filas.forEach(function (s) {
          var li = document.createElement("li");
          li.className = "flex items-baseline justify-between gap-4 py-2";
          var izq = document.createElement("span");
          izq.className = "text-pizarra-suave";
          var b = document.createElement("b");
          b.className = "text-cafe";
          b.textContent = s.titulo;
          izq.appendChild(b);
          var der = document.createElement("span");
          der.className = "dato shrink-0 text-right text-filtrado-600";
          der.appendChild(document.createTextNode("desde $" + formatoPrecio(s.precio)));
          if (s.unidad) {
            var u = document.createElement("span");
            u.className = "block text-[11px] font-normal leading-tight";
            u.textContent = "/ " + s.unidad;
            der.appendChild(u);
          }
          li.appendChild(izq);
          li.appendChild(der);
          propia.appendChild(li);
        });
        marcarCopia(propia, lista);
        lista.setAttribute("data-redcafe-oculto-react", "1");
        lista.parentNode.insertBefore(propia, lista.nextSibling);
      })
      .catch(function () { preciosPedidos = false; });
  }

  function sinTiempoLimitado() {
    Array.prototype.slice.call(document.querySelectorAll("main p.rotulo")).forEach(function (p) {
      if (texto(p) !== "Por tiempo limitado") return;
      p.setAttribute("data-redcafe-oculto-react", "1");
      // La frase con la fecha límite también contradice «Estar en la Red es
      // gratis». Se oculta solo esa; el título «Únete gratis» y su botón quedan.
      var fecha = p.nextElementSibling && p.nextElementSibling.nextElementSibling;
      if (fecha && /gratuito hasta el/.test(texto(fecha))) fecha.setAttribute("data-redcafe-oculto-react", "1");
    });
  }

  /* 3 y 5 (cifras de la Red y provincias reales del mapa): migradas a React
     (components/PortadaDatos.tsx). */

  /* ── 4. Registro ────────────────────────────────────────────────────── */

  function registroMasCorto() {
    var main = document.querySelector("main");
    if (!main) return;

    // Paso 1: selector de perfiles visible.
    if (document.getElementById("profile-selector")) medir("registro_paso1", true);

    var botones = Array.prototype.slice.call(main.querySelectorAll("button"));
    var hayPaso2 = false, hayPaso3 = false;
    botones.forEach(function (b) {
      var t = texto(b);
      if (/^Continuar con \d+ perfil/.test(t) || /^Revisar y listo/.test(t) || t === "Crear mi cuenta" || t === "Creando cuenta…") {
        var fila = b.parentElement;
        if (fila && fila.getAttribute("data-redcafe-fijo") !== "1") fila.setAttribute("data-redcafe-fijo", "1");
      }
      if (/^Revisar y listo/.test(t)) hayPaso2 = true;
      if (t === "Crear mi cuenta") hayPaso3 = true;
    });
    if (hayPaso2) medir("registro_paso2", true);
    if (hayPaso3) medir("registro_paso3", true);
    document.documentElement.classList.toggle("redcafe-con-boton-fijo", !!main.querySelector('[data-redcafe-fijo="1"]'));
  }

  /* ── 4b. Contraseña mínima 8 en el frontend ──────────────────────────── */
  // El servidor ya exige 8 (api/auth.php). Aquí solo se ajustan ATRIBUTOS de
  // inputs (permitido en inputs de React) en registro, cambio y restablecimiento.
  // El LOGIN no se toca: las cuentas con 6 siguen entrando.
  function clavesConMinimo8() {
    var enLogin = ruta().indexOf("/login") === 0;
    var enAdminLogin = ruta().indexOf("/admin") === 0;
    Array.prototype.slice.call(document.querySelectorAll('input[type="password"]')).forEach(function (inp) {
      if (inp.getAttribute("data-redcafe-min8") === "1") return;
      if (enLogin || enAdminLogin) return;
      // Solo contraseñas NUEVAS: la «contraseña actual» de una cuenta antigua
      // puede tener 6 y exigirle 8 le impediría cambiarla.
      var etiqueta = [inp.name, inp.id, inp.getAttribute("autocomplete"), inp.getAttribute("placeholder"),
        inp.labels && inp.labels[0] ? inp.labels[0].textContent : ""].join(" ");
      if (/actual|current/i.test(etiqueta)) return;
      var esRegistro = /^\/(afiliate|recuperar)/.test(ruta());
      if (!esRegistro && !/nuev|new|confirm|repet/i.test(etiqueta)) return;
      inp.setAttribute("data-redcafe-min8", "1");
      inp.setAttribute("minlength", "8");
      var ph = inp.getAttribute("placeholder") || "";
      if (ph === "" || /caracteres/i.test(ph)) {
        inp.setAttribute("placeholder", "Mínimo 8 caracteres");
      }
    });
    // Textos visibles «Mínimo 6 caracteres» (copia segura con 8), fuera del login.
    if (!enLogin && !enAdminLogin) {
      Array.prototype.slice.call(document.querySelectorAll("p,span,small,label,li,strong")).forEach(function (el) {
        if (el.getAttribute("data-redcafe-oculto-react") === "1") return;
        if (el.closest("[data-redcafe-propio]")) return;
        if (el.children.length) return;
        var t = texto(el);
        if (/Mínimo 6 caracteres/.test(t)) {
          var copia = el.cloneNode(false);
          copia.setAttribute("data-redcafe-propio", "1");
          copia.textContent = t.replace(/6/g, "8");
          marcarCopia(copia, el);
          el.setAttribute("data-redcafe-oculto-react", "1");
          el.insertAdjacentElement("afterend", copia);
        }
      });
    }
  }

  /* ── 4b2. Ver / ocultar contraseña ─────────────────────────────────── */
  // Botón propio junto a CADA campo de contraseña, en todas las páginas
  // (login, registro paso 2, recuperar, cambio de clave del panel y acceso
  // de /admin/). El input es de React: nunca se envuelve ni se mueve; el
  // botón va como hermano, después del campo, y se coloca con CSS
  // (position:fixed) sobre su borde derecho, tomando sus medidas.
  var SVG_OJO = '<svg class="redcafe-ojo" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var SVG_OJO_NO = '<svg class="redcafe-ojo-oculto" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  var retriesVerClave = 0;
  var formasVerClave = window.WeakSet ? new WeakSet() : { add: function () {}, has: function () { return false; } };

  function verClave() {
    // Reintentos CONTADOS (patrón del archivo): si React repinta el input y lo
    // reemplaza, el botón hermano puede quedarse huérfano o quedar el campo sin
    // botón; con tope, no puede convertirse en bucle.
    if (retriesVerClave >= 200) return;
    Array.prototype.forEach.call(document.querySelectorAll("button.redcafe-ver-clave"), function (b) {
      var previo = b.previousElementSibling;
      // En texto plano sigue siendo el mismo campo (marcado por nosotros);
      // solo se descarta un botón huérfano (React reemplazó el input).
      if (previo && previo.tagName === "INPUT" && previo.hasAttribute("data-redcafe-verclave")) return;
      if (b.parentNode) b.parentNode.removeChild(b); // es nuestro, no de React
    });
    Array.prototype.slice.call(document.querySelectorAll('input[type="password"]')).forEach(function (inp) {
      if (!inp.parentNode) return;
      var existente = inp.nextElementSibling;
      if (existente && existente.className.indexOf("redcafe-ver-clave") !== -1 && existente._campo === inp) return;
      // React pudo reemplazar el input pero el botón viejo quedaría apuntando a
      // un nodo desconectado: se retiran los botones propios que sobren alrededor
      // del campo actual antes de volver a montar.
      var nodo = inp;
      while (nodo.nextElementSibling && nodo.nextElementSibling.className &&
             nodo.nextElementSibling.className.indexOf("redcafe-ver-clave") !== -1) {
        var sobrante = nodo.nextElementSibling;
        if (sobrante.parentNode) sobrante.parentNode.removeChild(sobrante);
      }
      retriesVerClave += 1;
      if (retriesVerClave >= 200) return;
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "redcafe-ver-clave";
      boton._campo = inp;
      boton.setAttribute("aria-label", "Mostrar contraseña");
      boton.setAttribute("aria-pressed", "false");
      boton.innerHTML = SVG_OJO + SVG_OJO_NO;
      boton.addEventListener("click", function () { alternarVerClave(inp, boton); });
      inp.insertAdjacentElement("afterend", boton);
      inp.setAttribute("data-redcafe-verclave", "1");
      var form = inp.closest("form");
      if (form && !formasVerClave.has(form)) {
        formasVerClave.add(form);
        form.addEventListener("submit", function () { reiniciarVerClave(); });
      }
    });
    posicionarVerClave();
  }

  function alternarVerClave(campo, boton) {
    var mostrando = campo.type === "text";
    campo.type = mostrando ? "password" : "text";
    boton.classList.toggle("redcafe-ver-clave-activa", !mostrando);
    boton.setAttribute("aria-pressed", mostrando ? "false" : "true");
    boton.setAttribute("aria-label", mostrando ? "Mostrar contraseña" : "Ocultar contraseña");
    campo.focus();
  }

  function posicionarVerClave() {
    Array.prototype.forEach.call(document.querySelectorAll("button.redcafe-ver-clave"), function (b) {
      var campo = b.previousElementSibling;
      if (!campo || campo.tagName !== "INPUT") return;
      var ancho = 46, alto = 46;
      var rect = campo.getBoundingClientRect();
      b.style.position = "fixed";
      b.style.width = ancho + "px";
      b.style.height = alto + "px";
      b.style.left = Math.max(0, rect.right - ancho - 2) + "px";
      b.style.top = (rect.top + rect.height / 2 - alto / 2) + "px";
    });
  }

  /* Al enviar el formulario o al cambiar de ruta la contraseña vuelve a estar
     oculta: un campo despejado tras el alta quedaría en la caché del
     autocompletado del navegador. */
  function reiniciarVerClave() {
    retriesVerClave = 0;
    Array.prototype.forEach.call(document.querySelectorAll('[data-redcafe-verclave="1"]'), function (inp) {
      if (inp && inp.type !== "password") inp.type = "password";
      var b = inp.nextElementSibling;
      if (b && b.className.indexOf("redcafe-ver-clave") !== -1) {
        b.classList.remove("redcafe-ver-clave-activa");
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-label", "Mostrar contraseña");
      }
    });
    posicionarVerClave();
  }
  document.addEventListener("redcafe:ruta", reiniciarVerClave);
  window.addEventListener("popstate", reiniciarVerClave);
  window.addEventListener("scroll", posicionarVerClave, { passive: true });
  window.addEventListener("resize", posicionarVerClave, { passive: true });

  /* ── 4c. Lenguaje llano en la portada ────────────────────────────────── */
  // Frases con jerga (QA crítico 20260917): se cambian SOLO en la portada y
  // solo cuando son etiqueta/título/1 frase. Copia propia detrás del original.
  var FRASES_LLANAS = [
    ["Crear tu perfil es gratis · solo pagas los servicios especializados que uses",
     "Crear cuenta y publicar café es gratis. Algunos servicios profesionales son opcionales y se pagan aparte, con precio a la vista."],
    ["Dossier EUDR de tu Finca", "Documento EUDR de tu Finca"],
    ["Conecto lotes auditados, dossier EUDR, verificadores, catadores y compradores globales.",
     "Conecto lotes auditados, documentos EUDR, verificadores, catadores y compradores globales."],
    ["Registra el GPS de tu finca y genera el documento de debida diligencia listo para exportar.",
     "Registra el GPS de tu finca y genera el documento listo para exportar."],
    ["Expediente EUDR", "Documento EUDR"],
    ["Cuenta atrás para el EUDR: qué fecha te toca según a quién le vendes",
     "Cuenta atrás: qué fecha te toca para exportar a Europa según a quién le vendes"]
  ];
  function lenguajeLianoPortada() {
    if (!esPortada()) return;
    FRASES_LLANAS.forEach(function (par) {
      Array.prototype.slice.call(document.querySelectorAll("main p, main span, main h2, main h3, main small, main li, main b")).forEach(function (el) {
        if (el.getAttribute("data-redcafe-oculto-react") === "1") return;
        if (el.closest("[data-redcafe-oculto-react]")) return;
        if (el.closest("[data-redcafe-propio]")) return;
        if (texto(el) !== par[0]) return;
        copiaPropia(el, par[1]);
      });
    });
  }

  /* ── 6. Sesión guardada en el navegador pero caducada en el servidor ─── */

  var CLAVE_SESION = "redcafe_sesion";
  var sesionEnServidor = null; // null: sin comprobar · true · false
  function sesionGuardada() {
    try {
      var raw = localStorage.getItem(CLAVE_SESION) || sessionStorage.getItem(CLAVE_SESION);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  // Una sola consulta por carga de página, y solo si hay algo guardado.
  function comprobarSesionGuardada() {
    if (!sesionGuardada()) return;
    fetch("/api/auth.php?action=me", { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok || !res.data) return; // error: no se toca nada
        if (res.data.user && res.data.user.id) {
          sesionEnServidor = true;
          // Otra persona en el mismo navegador: la sesión guardada era de la
          // cuenta anterior (cerró por caducidad, no con el botón) y el panel
          // saludaba y mostraba su perfil. Se guarda la cuenta real y se
          // recarga UNA vez (marca en sessionStorage para no entrar en bucle).
          var guardada = sesionGuardada();
          if (guardada && guardada.id && String(guardada.id) !== String(res.data.user.id)) {
            try {
              var marca = "redcafe_sesion_corregida_" + res.data.user.id;
              if (sessionStorage.getItem(marca)) return;
              sessionStorage.setItem(marca, "1");
              if (localStorage.getItem(CLAVE_SESION)) localStorage.setItem(CLAVE_SESION, JSON.stringify(res.data.user));
              if (sessionStorage.getItem(CLAVE_SESION)) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(res.data.user));
              location.reload();
            } catch (e) {}
          }
          return;
        }
        if (res.data.requires_2fa) return; // a medio entrar: se respeta
        sesionEnServidor = false;
        try { localStorage.removeItem(CLAVE_SESION); sessionStorage.removeItem(CLAVE_SESION); } catch (e) {}
        quitarAvisoSesionCaducada();
      })
      .catch(function () {});
  }
  // El aviso lo crea redcafe-mejoras-ui.js en <body> (no es de React).
  function quitarAvisoSesionCaducada() {
    if (sesionEnServidor !== false) return;
    var aviso = document.getElementById("redcafe-sesion-activa");
    if (aviso && aviso.parentNode) aviso.parentNode.removeChild(aviso);
  }

  /* ── 7. Siguiente paso tras crear la cuenta ─────────────────────────── */

  // La tarjeta «Tu siguiente paso» la pinta React (app/afiliate/page.tsx).
  // Aquí solo se mide que el registro terminó.
  function siguientePaso() {
    var ok = Array.prototype.slice.call(document.querySelectorAll("main h1")).some(function (h) {
      return texto(h) === "Ya formas parte de la Red";
    });
    if (ok) medir("registro_ok", true);
  }

  /* ── 8. Ancla de requerimientos en el panel ─────────────────────────── */
  // La sección la monta redcafe-requerimientos.js segundos después de cargar,
  // así que el navegador no encuentra el ancla al llegar. Intentos contados.
  function bajarARequerimientos() {
    if (ruta().indexOf("/panel") !== 0 || location.hash !== "#redcafe-requerimientos-panel") return;
    var hecho = false;
    [1500, 3000, 5000, 7500].forEach(function (ms) {
      setTimeout(function () {
        if (hecho) return;
        var el = document.getElementById("redcafe-requerimientos-panel");
        if (!el) return;
        // La sección llega plegada (redcafe-colapsables.js): se abre antes de bajar.
        var plegada = el.querySelector('.redcafe-col-boton[aria-expanded="false"]');
        if (!plegada && el.getAttribute("data-redcafe-colapsable") !== "1" && ms < 5000) return;
        if (plegada) plegada.click();
        hecho = true;
        el.scrollIntoView({ block: "start" });
      }, ms);
    });
  }


  /* ── 9. «Qué cuesta y qué no» de la comunidad: migrado a React (components/CostesRed.tsx). */


  /* ── 10, 11 y 12 (fecha límite, precios reales y nombres de /servicios/):
     migrados a React (components/ServiciosVivos.tsx y los textos de cada página). */

  function copiaPropia(el, textoNuevo) {
    if (!el || el.getAttribute("data-redcafe-oculto-react") === "1") return false;
    if (el.closest("[data-redcafe-propio]")) return false;
    var copia = el.cloneNode(false);
    copia.removeAttribute("id");
    copia.setAttribute("data-redcafe-propio", "1");
    copia.textContent = textoNuevo;
    marcarCopia(copia, el);
    el.setAttribute("data-redcafe-oculto-react", "1");
    el.insertAdjacentElement("afterend", copia);
    return true;
  }

  /* ── 13. «Qué cuesta y qué no» se MUEVE a la comunidad ────────────────── */
  // El propietario pidió moverlo, no duplicarlo: ese bloque estaba casi al
  // final de la portada y ahora vive al pie de /comunidad/. Aquí se oculta el
  // de la portada, con la misma regla de siempre: no se borra un nodo de
  // React, se marca y el CSS deja de pintarlo.
  function costesFueraDeLaPortada() {
    if (!esPortada()) return;
    Array.prototype.slice.call(document.querySelectorAll("main section")).forEach(function (sec) {
      if (sec.getAttribute("data-redcafe-oculto-react") === "1") return;
      if (sec.closest("[data-redcafe-propio]")) return;
      var t = texto(sec);
      if (t.indexOf("Estar en la Red es gratis. Los servicios, solo si los pides") === -1) return;
      if (t.indexOf("Se contratan solo cuando los necesitas") === -1) return;
      sec.setAttribute("data-redcafe-oculto-react", "1");
    });
  }

  /* ── 14. «Lo que cambia para ti» y las herramientas, a Quiénes somos ─── */
  // El propietario pidió MOVER de la portada a /quienes-somos/ la sección
  // «Todo lo de esta sección entra con tu cuenta gratuita · Lo que cambia para
  // ti cuando entras en la Red» (Marketplace, Academia, Servicios, Confianza) y
  // «Herramientas para negociar con números». En la portada se oculta (regla
  // de siempre: se marca, no se borra). En Quiénes somos se trae esa misma
  // sección del HTML exportado de la portada y se pinta como bloque propio,
  // antes del llamado final; así los textos y enlaces son los mismos.
  var FIRMA_BENEFICIOS = "Lo que cambia para ti cuando entras en la Red";
  var FIRMA_HERRAMIENTAS = "Herramientas para negociar con números";
  function esSeccionBeneficios(sec) {
    var t = texto(sec);
    return t.indexOf(FIRMA_BENEFICIOS) !== -1 && t.indexOf(FIRMA_HERRAMIENTAS) !== -1 && t.length < 3000;
  }
  function esQuienesSomos() { return ruta().indexOf("/quienes-somos") === 0; }

  function beneficiosFueraDeLaPortada() {
    if (!esPortada()) return;
    Array.prototype.slice.call(document.querySelectorAll("main section")).forEach(function (sec) {
      if (sec.getAttribute("data-redcafe-oculto-react") === "1") return;
      if (sec.closest("[data-redcafe-propio]")) return;
      if (esSeccionBeneficios(sec)) sec.setAttribute("data-redcafe-oculto-react", "1");
    });
  }

  var beneficiosPedidos = false;
  var intentosBeneficios = 0;
  function beneficiosEnQuienesSomos() {
    if (!esQuienesSomos() || beneficiosPedidos || intentosBeneficios >= 3) return;
    if (document.getElementById("redcafe-beneficios-red")) return;
    var main = document.querySelector("main");
    if (!main || !main.querySelector("h2")) return;
    beneficiosPedidos = true;
    intentosBeneficios++;
    fetch("/", { credentials: "omit" })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        if (document.getElementById("redcafe-beneficios-red")) return;
        var doc = new DOMParser().parseFromString(html, "text/html");
        var origen = Array.prototype.slice.call(doc.querySelectorAll("main section")).filter(esSeccionBeneficios)[0];
        if (!origen) { beneficiosPedidos = false; return; }
        var propia = document.importNode(origen, true);
        propia.id = "redcafe-beneficios-red";
        propia.setAttribute("data-redcafe-propio", "1");
        Array.prototype.slice.call(propia.querySelectorAll("[id]")).forEach(function (n) { n.removeAttribute("id"); });
        // Antes del llamado final («Si trabajas alrededor del café…»); si no
        // está, al final de la página.
        var cierre = Array.prototype.slice.call(main.querySelectorAll("h2")).filter(function (h) {
          return texto(h).indexOf("Si trabajas alrededor del café") === 0;
        })[0];
        var seccionCierre = cierre && cierre.closest("section");
        if (seccionCierre && seccionCierre.parentNode) {
          seccionCierre.parentNode.insertBefore(propia, seccionCierre);
        } else {
          main.appendChild(propia);
        }
      })
      .catch(function () { beneficiosPedidos = false; });
  }

  /* ── 15. Portada: la puerta de registro ya es de React (AccesoPortada). */
  /* ── 16. Panel: la barra «Tus herramientas» ya es de React (AtajosPanel). */

  /* Un atajo debe abrir lo que promete. Con ?ver=... se despliega la sección
     del panel o se cambia a la pestaña del marketplace, y se lleva la vista
     hasta ahí. Reintentos contados: el panel tarda en pintarse. */
  var VISTAS_PANEL = {
    publicaciones: "redcafe-mis-publicaciones",
    bandeja: "redcafe-bandeja",
    mensajes: "redcafe-bandeja",
    reportes: "redcafe-mis-reportes",
    registro: "redcafe-registro-actividad",
    cursos: "redcafe-mis-cursos",
    requerimientos: "redcafe-requerimientos-panel",
    empleos: "redcafe-empleos-panel",
    guias: "redcafe-guias"
  };
  var intentosVista = 0;
  var vistaHecha = false;

  function abrirVista() {
    if (vistaHecha || intentosVista >= 12) return;
    var m = /[?&]ver=([a-z_]+)/.exec(location.search || "");
    if (!m) { vistaHecha = true; return; }
    intentosVista++;
    var vista = m[1];

    if (ruta().indexOf("/panel") === 0) {
      var id = VISTAS_PANEL[vista];
      if (!id) { vistaHecha = true; return; }
      var sec = document.getElementById(id);
      if (!sec) return;
      var boton = sec.querySelector(".redcafe-col-boton, button[aria-expanded]");
      if (boton && boton.getAttribute("aria-expanded") !== "true") boton.click();
      sec.scrollIntoView({ block: "start" });
      vistaHecha = true;
      return;
    }

    // Las pestañas del marketplace (?ver=) las abre la propia página de React.
    vistaHecha = true;
  }

  /* /servicios/contratar/ sin servicio elegido enseñaba «Servicio no
     encontrado» y un enlace de vuelta: un callejón sin salida para quien
     llega desde un enlace viejo o un marcador. Se le lleva al catálogo. */
  function contratarSinServicio() {
    if (ruta().indexOf("/servicios/contratar") !== 0) return;
    if (/[?&]servicio=/.test(location.search || "")) return;
    if (sessionStorage.getItem("redcafe_contratar_redirigido")) return;
    sessionStorage.setItem("redcafe_contratar_redirigido", "1");
    location.replace("/servicios/");
  }

  /* El menú del panel («Pedidos recibidos», «Cotizaciones», «Mis servicios»…)
     sí funciona: cambia el contenido. El problema es que ese contenido está
     unos 2.000 px más abajo, así que en el celular el usuario pulsa y no ve
     pasar nada. Aquí se lleva la vista a lo que acaba de abrir. */
  var panelVistaLista = false;
  function panelSeguirVista() {
    if (ruta().indexOf("/panel") !== 0 || panelVistaLista) return;
    panelVistaLista = true;
    document.addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("main button") : null;
      if (!b || b.closest("[data-redcafe-propio]")) return;
      var menu = b.closest("details") || b.closest("div.mt-4");
      if (!menu) return;
      var caja = b.closest("div.mt-4") || menu.parentElement;
      if (!caja) return;
      // React sustituye el nodo del contenido al repintar, así que no se guarda
      // una referencia: se vuelve a buscar cuando toca mover la pantalla.
      setTimeout(function () {
        var destino = caja.isConnected ? caja.nextElementSibling : null;
        if (!destino) {
          var main = document.querySelector("main");
          destino = main ? main.querySelector(".mt-8") : null;
        }
        if (!destino) return;
        var y = destino.getBoundingClientRect().top + window.pageYOffset - 64;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }, 380);
    }, true);
  }

  /* Orden de las secciones del panel: lo que se usa a diario arriba y lo
     explicativo al final. Las guías quedaban después del bloque de promoción,
     y el registro de actividad por delante de ellas. Solo se mueven secciones
     propias; a los nodos de React no se les toca el sitio. */
  var ORDEN_PANEL = [
    "redcafe-bandeja",
    "redcafe-guias",
    "redcafe-mis-publicaciones",
    "redcafe-requerimientos-panel",
    "redcafe-empleos-panel",
    "redcafe-busco-empleo-panel",
    "redcafe-mis-cursos",
    "redcafe-mis-reportes",
    "redcafe-registro-actividad",
    "redcafe-panel-resources"
  ];
  var ordenPanelHecho = false;
  var intentosOrdenPanel = 0;
  function ordenarPanel() {
    if (ruta().indexOf("/panel") !== 0 || ordenPanelHecho) return;
    var presentes = ORDEN_PANEL.map(function (id) { return document.getElementById(id); })
      .filter(function (n) { return n && n.parentNode; });
    if (presentes.length < 4) return;   // todavía no están pintadas
    // Las secciones aparecen a distinto ritmo: se reordena en cada pasada hasta
    // que estén todas, con tope para no quedarse dando vueltas.
    intentosOrdenPanel++;
    if (presentes.length === ORDEN_PANEL.length || intentosOrdenPanel >= 12) ordenPanelHecho = true;
    var ancla = presentes[0];
    var padre = ancla.parentNode;
    var previo = ancla;
    presentes.slice(1).forEach(function (sec) {
      if (sec.parentNode !== padre) return;   // no se saca nada de su contenedor
      if (previo.nextElementSibling !== sec) padre.insertBefore(sec, previo.nextSibling);
      previo = sec;
    });
  }

  /* migración a React · fase 1 */
  /* ── Arranque ───────────────────────────────────────────────────────── */

  var programado = false;
  function aplicar() {
    programado = false;
    limpiarCopiasHuerfanas();
    clavesConMinimo8();
    verClave();
    ordenarPanel();
    panelSeguirVista();
    abrirVista();
    contratarSinServicio();
    if (esPortada()) { preciosReales(); sinTiempoLimitado(); costesFueraDeLaPortada(); beneficiosFueraDeLaPortada(); lenguajeLianoPortada(); }
    if (esQuienesSomos()) beneficiosEnQuienesSomos();
    if (esRegistro()) { registroMasCorto(); siguientePaso(); quitarAvisoSesionCaducada(); }
    else document.documentElement.classList.remove("redcafe-con-boton-fijo");
  }
  function programar() {
    if (programado) return;
    programado = true;
    // setTimeout y no requestAnimationFrame: el navegador pausa los frames en
    // una pestaña en segundo plano, y mientras tanto «programado» se quedaba en
    // true y se ignoraban todos los cambios de paso del registro. Medido.
    setTimeout(aplicar, 60);
  }

  function alCargarRuta() {
    enviados = {};
    preciosPedidos = false;
    beneficiosPedidos = false;
    intentosBeneficios = 0;
    medir("visita", true);
    medirLlegadaAlPanel();
    bajarARequerimientos();
    // Espera a que React hidrate antes de tocar nada en la página.
    [900, 2200, 4200].forEach(function (ms) { setTimeout(programar, ms); });
  }

  // Solo se observan altas y bajas de nodos: los atributos que pone esta capa
  // no vuelven a disparar el observador, así que no puede entrar en bucle.
  var observador = new MutationObserver(function () {
    programar();
  });

  function iniciar() {
    /* Se observa <body>, no <main>. La portada y el registro lanzan el error de
       hidratación #418, y React responde rehaciendo el árbol: el <main> que
       existía al arrancar queda desconectado y un observador puesto sobre él
       ya no se entera de nada. Medido: en el paso 2 del registro no se ocultó
       el selector de planes ni se fijó el botón. */
    observador.observe(document.body, { childList: true, subtree: true });
    comprobarSesionGuardada();
    alCargarRuta();
  }

  if (document.readyState === "complete") setTimeout(iniciar, 400);
  else window.addEventListener("load", function () { setTimeout(iniciar, 400); }, { once: true });
  document.addEventListener("redcafe:ruta", alCargarRuta);
})();
