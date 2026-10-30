/* Red Café Ecuador — página de registro (/afiliate/)
   ------------------------------------------------------------------
   Mejoras al registro a partir del diagnóstico de PROPUESTA_AFILIATE.md.
   Se aplica solo lo que se puede hacer sin romper React:

   · La portada la pinta React pero es estática (no cambia con el estado):
     se oculta y se pone la nuestra al lado, con una propuesta de valor
     concreta y un botón que lleva al formulario.
   · Se añade una franja con datos reales de la Red — lotes publicados,
     provincias, cursos — en vez de un contador de usuarios que con doce
     miembros restaría credibilidad en lugar de sumarla.
   · Se corrige el teclado en móvil: el teléfono y la cédula abrían el
     teclado alfabético.
   · Validación a la vista con `:user-invalid`, sin inyectar nodos en el
     formulario de React.

   Lo que NO se toca: la sección de beneficios por perfil (cambia con el
   perfil elegido, es de React) ni el asistente de tres pasos.
*/
(function () {
  "use strict";

  /* El parpadeo al recargar
     ------------------------------------------------------------------
     React pinta su propia portada al hidratar y la nuestra la sustituía unos
     700 ms después: al recargar se veía un instante la versión anterior y
     luego saltaba a esta. Se marca la ruta en el <html> en cuanto se ejecuta
     este archivo —antes de `load`, porque va con `defer`— y el CSS esconde la
     portada de React desde ese momento. No se borra ni se toca ese nodo:
     solo deja de pintarse.

     Con red de seguridad: si por lo que sea la portada propia no llega a
     montarse, a los cuatro segundos se quita la marca y vuelve la de React.
     Una página sin portada sería peor que un parpadeo. */

  function enAfiliate() {
    return location.pathname.indexOf("/afiliate") === 0;
  }

  function marcarRuta() {
    var raiz = document.documentElement;
    if (enAfiliate()) {
      raiz.setAttribute("data-redcafe-afiliate", "1");
      setTimeout(function () {
        if (!document.getElementById("redcafe-afiliate-portada")) {
          raiz.removeAttribute("data-redcafe-afiliate");
        }
      }, 4000);
    } else {
      raiz.removeAttribute("data-redcafe-afiliate");
    }
  }

  marcarRuta();

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

  function json(url) {
    return fetch(url, { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false }; });
  }

  /* ── Portada ─────────────────────────────────────────────────────── */

  /* Qué va antes de los perfiles, y por qué
     ------------------------------------------------------------------
     Medido en un móvil de 375 px: había que bajar 1.614 px —dos pantallas
     enteras— antes de ver el primer perfil. Lo que estorbaba no era una cosa
     grande sino cinco medianas puestas en fila: la bajada larga, tres
     ventajas apiladas, la prueba social, el plegable y, sobre todo, una guía
     de 451 px que describía el perfil «Productor» ANTES de que nadie hubiera
     elegido nada.

     El orden ahora es el que pidió el propietario: título, subtítulo, cómo
     funciona, perfiles. Las ventajas siguen existiendo, pero dentro del
     plegable «Ver qué incluye tu cuenta»: son un argumento, no una
     instrucción, y no tienen por qué separarte de la decisión. */

  var VENTAJAS = [
    ["Gratis", "Crear cuenta y publicar no cuesta."],
    ["Sin comisión por el contacto", "Hablas y negocias directo con la otra parte."],
    ["Dos minutos", "Nombre, correo y contraseña."]
  ];

  var COMO_FUNCIONA = [
    ["1", "Eliges tu perfil", "Lo que haces con el café. Puedes marcar hasta tres."],
    ["2", "Creas tu cuenta", "Nombre, correo y contraseña. Dos minutos."],
    ["3", "Te encuentran y te escriben", "Tu ficha entra al directorio. Cuando publiques café o servicios, también salen en el marketplace y en el mapa."]
  ];

  function portada() {
    var raiz = document.querySelector("main > div");
    if (!raiz || document.getElementById("redcafe-afiliate-portada")) return false;
    var hero = raiz.firstElementChild;
    if (!hero || hero.tagName !== "SECTION") return false;

    var propia = el("section", {
      id: "redcafe-afiliate-portada",
      className: "redcafe-afil-hero",
      "data-redcafe-propio": "1"
    });
    var caja = el("div", { className: "redcafe-afil-wrap" });

    /* TÍTULO Y SUBTÍTULO — para los doce perfiles, no solo para el productor
       ------------------------------------------------------------------
       Decían «Publica tu café donde lo buscan compradores, tostadores y
       cafeterías». Eso le habla a quien produce; a los otros once perfiles de
       esta pantalla —el que compra, el que tuesta, el que transporta, el que
       pila, el que exporta, el barista, el catador, el asesor— les está
       diciendo que la página no es para ellos. Y son la mayoría de quienes
       llegan aquí. */
    caja.appendChild(el("p", { className: "redcafe-afil-rotulo" }, "Registro gratuito"));
    caja.appendChild(el("h1", {},
      "Encuentra con quién hacer negocio en el café ecuatoriano."));

    caja.appendChild(el("p", { className: "redcafe-afil-bajada" },
      "Produzcas, compres, tuestes, transportes o asesores: ficha pública, presencia en " +
      "el mapa nacional cuando publiques café, y contacto directo sin comisión."));

    // CÓMO FUNCIONA
    var pasos = el("ol", { className: "redcafe-afil-pasos" });
    COMO_FUNCIONA.forEach(function (paso) {
      var li = el("li", {});
      li.appendChild(el("span", { className: "redcafe-afil-num", "aria-hidden": "true" }, paso[0]));
      li.appendChild(el("strong", {}, paso[1]));
      li.appendChild(el("span", { className: "redcafe-afil-paso-txt" }, paso[2]));
      pasos.appendChild(li);
    });
    caja.appendChild(pasos);

    // ACCIONES
    var acciones = el("div", { className: "redcafe-afil-acciones" });
    var empezar = el("button", { type: "button", className: "redcafe-afil-cta" }, "Elegir mi perfil");
    empezar.addEventListener("click", function () {
      // Lleva al selector de perfiles, que es la primera decisión real, no a
      // la cabecera del formulario.
      var destino = document.getElementById("profile-selector") ||
        document.querySelector("main > div > div");
      if (destino) destino.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    acciones.appendChild(empezar);
    acciones.appendChild(el("a", { className: "redcafe-afil-secundario", href: "/login/" }, "Ya tengo cuenta"));
    caja.appendChild(acciones);

    propia.appendChild(caja);
    // Nunca se borra el nodo de React: se oculta y el nuestro va al lado.
    hero.insertAdjacentElement("afterend", propia);
    hero.setAttribute("data-redcafe-oculto", "1");

    /* Lo que no ayuda a elegir, debajo de los perfiles
       ----------------------------------------------------------------
       La prueba social y el detalle de la cuenta se leen igual de bien
       después de decidir, y sumaban ~150 px de scroll antes de la primera
       tarjeta. No se mueve ningún nodo de React para conseguirlo: el
       contenedor pasa a `flex` y se ordena con `order`, que es la pauta que
       este proyecto ya usa en el panel. Mover nodos de React sí rompería su
       reconciliación; cambiar el orden visual no. */
    raiz.classList.add("redcafe-afil-orden");

    var cierre = el("p", {
      className: "redcafe-afil-datos",
      id: "redcafe-afil-datos",
      "data-redcafe-propio": "1"
    }, "Lo que ya hay publicado en la Red se está cargando…");
    raiz.appendChild(cierre);
    return true;
  }

  /* ── Menos texto antes del formulario ────────────────────────────────
     Entre la portada y el primer campo había ~147 palabras explicando
     servicios que se contratan DESPUÉS de tener cuenta. No ayudan a
     registrarse: estorban. Se pliegan tras un enlace, no se borran — quien
     quiera leerlas las tiene a un clic.

     Solo se OCULTAN, nunca se sustituyen: esa sección la pinta React y
     cambia con el perfil elegido. Reemplazarla rompería la página. */

  function seccionQueGanas() {
    var rotulos = Array.prototype.slice.call(document.querySelectorAll("main p, main h2"));
    var rotulo = rotulos.find(function (n) {
      return /qu[eé] ganas de verdad/i.test((n.textContent || "").trim());
    });
    return rotulo ? rotulo.closest("section") : null;
  }

  function plegarQueGanas() {
    var seccion = seccionQueGanas();
    if (!seccion) return;
    if (seccion.getAttribute("data-redcafe-plegada") === "1") {
      // React puede repintar y devolverla a la vista: se vuelve a esconder.
      if (!seccion.hasAttribute("data-redcafe-oculto") &&
          !document.getElementById("redcafe-afil-vermas")) {
        seccion.setAttribute("data-redcafe-oculto", "1");
      }
      return;
    }
    seccion.setAttribute("data-redcafe-plegada", "1");
    seccion.setAttribute("data-redcafe-oculto", "1");

    var enlace = el("button", {
      type: "button",
      id: "redcafe-afil-vermas",
      className: "redcafe-afil-vermas",
      "aria-expanded": "false",
      "data-redcafe-propio": "1"
    }, "Ver qué incluye tu cuenta");
    enlace.addEventListener("click", function () {
      var abierta = !seccion.hasAttribute("data-redcafe-oculto");
      if (abierta) {
        seccion.setAttribute("data-redcafe-oculto", "1");
        enlace.textContent = "Ver qué incluye tu cuenta";
        enlace.setAttribute("aria-expanded", "false");
      } else {
        seccion.removeAttribute("data-redcafe-oculto");
        enlace.textContent = "Ocultar";
        enlace.setAttribute("aria-expanded", "true");
        seccion.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    // Las tres ventajas ya no van en el camino hacia los perfiles, pero no se
    // pierden: se leen aquí, junto al detalle de la cuenta, para quien las
    // quiera antes de decidir.
    var ventajas = el("ul", { className: "redcafe-afil-ventajas", "data-redcafe-propio": "1" });
    ventajas.id = "redcafe-afil-ventajas";
    VENTAJAS.forEach(function (v) {
      var li = el("li", {});
      li.appendChild(el("strong", {}, v[0]));
      li.appendChild(el("span", {}, v[1]));
      ventajas.appendChild(li);
    });
    ventajas.setAttribute("data-redcafe-oculto", "1");

    enlace.addEventListener("click", function () {
      if (seccion.hasAttribute("data-redcafe-oculto")) ventajas.setAttribute("data-redcafe-oculto", "1");
      else ventajas.removeAttribute("data-redcafe-oculto");
    });

    seccion.insertAdjacentElement("beforebegin", enlace);
    enlace.insertAdjacentElement("afterend", ventajas);
  }

  /* ── Qué hace cada perfil, donde se elige ────────────────────────────
     Esa explicación existía, pero estaba puesta ANTES del selector y contaba
     siempre lo mismo —lo del productor, por ser el perfil por defecto—,
     ocupando 451 px de los 1.614 que había que bajar. Ahora aparece debajo
     de las tarjetas y habla del perfil que acabas de marcar.

     Se añade como ÚLTIMO hijo del contenedor de React, que es la posición
     donde este proyecto lleva meses insertando sin romper la reconciliación.
     Nunca se reescribe ni se mueve un nodo que pinte React. */

  function perfilElegido() {
    /* Manda el perfil PRINCIPAL que está marcado en pantalla, no el último
       botón que se pulsó.
       Antes se preguntaba primero por el último clic, y eso describía el
       perfil equivocado en dos casos reales: al AÑADIR un segundo perfil la
       guía pasaba a hablar de él aunque el principal siguiera siendo otro, y
       al QUITAR uno la guía seguía describiendo el que se acababa de quitar.
       La tarjeta marcada «Principal» es la que define el plan y lo que se ve
       primero en el panel, así que es la que hay que explicar. */
    var sel = document.getElementById("profile-selector");
    if (!sel) return "";
    var tarjetas = Array.prototype.slice.call(sel.children);

    // Se puede marcar hasta tres perfiles, y todos quedan «Activo»: buscar el
    // primer activo devolvía el que estuviera antes en el DOM, no el que el
    // visitante eligió como principal. El principal es el que manda —define
    // el plan sugerido y lo que se ve primero en el panel—, así que se busca
    // «Principal» y solo se cae a «Activo» si no hubiera ninguno.
    // «Activo» y «Principal» son BOTONES, no rótulos, y el texto de la tarjeta
    // sale pegado («…negocio.ActivoPrincipal»), así que ni /\bPrincipal\b/ ni
    // /\bActivo\b/ encuentran límite de palabra: la versión anterior no
    // acertaba nunca y devolvía "". El principal se reconoce porque su botón
    // «Principal» está pintado como pulsado (fondo verde claro), mientras que
    // el de un perfil activo que aún no es principal lleva el borde apagado.
    function botonPorTexto(tarjeta, texto) {
      var bs = tarjeta.querySelectorAll("button");
      for (var i = 0; i < bs.length; i++) {
        if ((bs[i].textContent || "").trim() === texto) return bs[i];
      }
      return null;
    }
    function esPrincipal(tarjeta) {
      var b = botonPorTexto(tarjeta, "Principal");
      if (!b) return false;
      if (b.getAttribute("aria-pressed") === "true") return true;
      return String(b.className || "").indexOf("bg-green-100") !== -1;
    }
    var elegida = tarjetas.filter(esPrincipal)[0] ||
                  tarjetas.filter(function (c) { return botonPorTexto(c, "Activo"); })[0];
    if (!elegida) return "";
    var h = elegida.querySelector("h3, h4, p, strong");
    var nombre = h ? (h.textContent || "").trim() : "";

    // Si el nombre leído no es uno de los perfiles conocidos, se cae al
    // resolvedor de V60, que tiene en cuenta el último clic.
    var copia = window.__redcafePerfilesCopy;
    if (copia && !copia[nombre] && typeof window.__redcafePerfilActual === "function") {
      try { return window.__redcafePerfilActual() || nombre; } catch (e) { return nombre; }
    }
    return nombre;
  }

  function guiaDelPerfil() {
    var sel = document.getElementById("profile-selector");
    if (!sel) return;
    var copia = window.__redcafePerfilesCopy;
    if (!copia) return;

    var nombre = perfilElegido();
    var datos = copia[nombre] || copia.Productor;
    if (!datos || !datos.guia) return;

    var caja = document.getElementById("redcafe-afil-guia");
    if (!caja) {
      caja = el("div", { id: "redcafe-afil-guia", className: "redcafe-afil-guia", "data-redcafe-propio": "1" });
      // Hermana del selector, no hija: dentro de #profile-selector la habría
      // barrido cualquier repintado de React de sus doce tarjetas. Fuera, React
      // no la gestiona. Se ve en el mismo sitio —justo debajo de la rejilla—
      // porque el CSS ya no la necesita como celda.
      sel.insertAdjacentElement("afterend", caja);
    }
    if (caja.getAttribute("data-perfil") === nombre) return;
    caja.setAttribute("data-perfil", nombre);

    caja.textContent = "";
    caja.appendChild(el("p", { className: "redcafe-afil-guia-rotulo" },
      nombre ? "Con el perfil de " + nombre : "Con este perfil"));
    caja.appendChild(el("p", { className: "redcafe-afil-guia-titulo" }, datos.guia[0]));
    caja.appendChild(el("p", { className: "redcafe-afil-guia-texto" }, datos.guia[1]));
    var chips = el("div", { className: "redcafe-afil-guia-chips" });
    (datos.guia[2] || []).forEach(function (item) {
      chips.appendChild(el("span", {}, item));
    });
    caja.appendChild(chips);
  }

  /* ── Prueba social honesta ───────────────────────────────────────── */
  // Con doce miembros, presumir de comunidad sería mentir. Lo que sí es
  // cierto y verificable es cuánto café hay publicado y desde dónde.

  function datosReales() {
    var destino = document.getElementById("redcafe-afil-datos");
    if (!destino) return;
    Promise.all([
      json("/api/lotes.php?action=list"),
      json("/api/cursos.php?action=list")
    ]).then(function (r) {
      // Solo lotes reales: los de muestra (demo/ejemplo) inflaban la cifra a 13
      // lotes y 6 provincias cuando los reales son 7 en 3.
      var lotes = ((r[0] && r[0].ok && r[0].data && r[0].data.lotes) || []).filter(function (l) {
        return l && !l.demo && !l.ejemplo && !l.oculto;
      });
      var cursos = (r[1] && r[1].ok && r[1].data && r[1].data.cursos) || [];
      var provincias = {};
      lotes.forEach(function (l) { if (l.provincia) provincias[l.provincia] = true; });
      var nProv = Object.keys(provincias).length;

      var partes = [];
      if (lotes.length) partes.push(lotes.length + (lotes.length === 1 ? " lote publicado" : " lotes publicados"));
      if (nProv) partes.push(nProv + (nProv === 1 ? " provincia" : " provincias"));
      if (cursos.length) partes.push(cursos.length + (cursos.length === 1 ? " curso abierto" : " cursos abiertos"));

      destino.textContent = partes.length
        ? "Ahora mismo en la Red: " + partes.join(" · ") + "."
        : "";
    });
  }

  /* ── Teclado correcto en el móvil ────────────────────────────────── */
  // El teléfono y la cédula abrían el teclado de letras. Son atributos que
  // React no gestiona: ponerlos no altera su árbol.

  function tecladoMovil() {
    var campos = Array.prototype.slice.call(document.querySelectorAll("main input"));
    var tocados = 0;
    campos.forEach(function (campo) {
      var pista = ((campo.getAttribute("placeholder") || "") + " " +
                   (campo.getAttribute("autocomplete") || "")).toLowerCase();
      if (/09\d|tel/.test(pista) && campo.getAttribute("inputmode") !== "tel") {
        campo.setAttribute("inputmode", "tel");
        campo.setAttribute("type", "tel");
        tocados++;
      } else if (/171234|cédula|cedula|ruc|\d{10}/.test(pista) && campo.getAttribute("inputmode") !== "numeric") {
        campo.setAttribute("inputmode", "numeric");
        campo.setAttribute("autocomplete", "off");
        tocados++;
      }
      if (campo.type === "email") {
        campo.setAttribute("inputmode", "email");
        campo.setAttribute("autocapitalize", "off");
        campo.setAttribute("spellcheck", "false");
      }
    });
    return tocados;
  }

  /* ── Arranque ────────────────────────────────────────────────────── */
  // React hidrata tarde y el asistente cambia de paso: se revisa varias
  // veces en lugar de dar por hecho que ya está todo pintado.

  function pasada() {
    if (location.pathname.indexOf("/afiliate") !== 0) return;
    if (portada()) datosReales();
    plegarQueGanas();
    guiaDelPerfil();
    tecladoMovil();

    // La marca del <html> esconde la portada de React. Si por cualquier razón
    // la nuestra desapareciera —un repintado, un fallo— la página se quedaría
    // sin ninguna de las dos. Comprobarlo una vez a los 4 s no bastaba: se
    // comprueba en cada pasada.
    if (enAfiliate() && !document.getElementById("redcafe-afiliate-portada")) {
      document.documentElement.removeAttribute("data-redcafe-afiliate");
    } else if (enAfiliate()) {
      document.documentElement.setAttribute("data-redcafe-afiliate", "1");
    }
  }

  var relojPasadas = null;

  function iniciar() {
    pasada();
    // Cada navegación SPA llamaba a iniciar() y arrancaba OTRO intervalo de 21
    // ciclos: navegando rápido quedaban varios a la vez haciendo pasada()
    // durante 19 s cada uno. Solo hay un reloj, y el nuevo cancela al viejo.
    if (relojPasadas) clearInterval(relojPasadas);
    var n = 0;
    relojPasadas = setInterval(function () {
      n++;
      pasada();
      if (n > 20) { clearInterval(relojPasadas); relojPasadas = null; }
    }, 900);
    // Al pasar de "Perfil" a "Datos" aparecen campos nuevos.
    // El <main> sobrevive a las navegaciones de Next, así que sin la marca se
    // acumulaba un listener por cada entrada a /afiliate/ y cada click acababa
    // programando varios tecladoMovil.
    var main = document.querySelector("main");
    if (main && main.getAttribute("data-redcafe-afiliate-click") !== "1") {
      main.setAttribute("data-redcafe-afiliate-click", "1");
      main.addEventListener("click", function () {
        // El listener se queda para toda la sesión, así que comprueba la ruta:
        // fuera de /afiliate/ no tiene nada que ajustar.
        if (location.pathname.indexOf("/afiliate") !== 0) return;
        setTimeout(tecladoMovil, 300);
        // Al marcar un perfil, la guía de abajo pasa a hablar de ese.
        setTimeout(guiaDelPerfil, 120);
        setTimeout(guiaDelPerfil, 400);
      });
    }
  }

  /* Se intenta montar en cuanto React ha pintado su portada, no 700 ms
     después de `load`: cada milisegundo de más es un milisegundo de página en
     blanco bajo la cabecera. Se sondea rápido durante el primer segundo y
     luego `iniciar()` se encarga del resto. */
  function montarPronto() {
    if (!enAfiliate()) return;
    var intentos = 0;
    var reloj = setInterval(function () {
      intentos++;
      if (portada()) {
        datosReales();
        plegarQueGanas();
        guiaDelPerfil();
        clearInterval(reloj);
      } else if (intentos > 12) {
        clearInterval(reloj);
      }
    }, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montarPronto, { once: true });
  } else {
    montarPronto();
  }

  if (document.readyState === "complete") setTimeout(iniciar, 700);
  else window.addEventListener("load", function () { setTimeout(iniciar, 700); }, { once: true });
  // Next navega sin recargar: hay que volver a montar al cambiar de ruta.
  document.addEventListener("redcafe:ruta", function () {
    marcarRuta();
    setTimeout(montarPronto, 120);
    setTimeout(iniciar, 900);
  });
})();

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
