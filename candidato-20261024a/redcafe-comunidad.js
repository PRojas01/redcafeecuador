/* Red Café Ecuador — el muro de la Comunidad
   ------------------------------------------------------------------
   La página listaba todo igual: un aviso automático de «nuevo miembro» y la
   pregunta de un caficultor tenían la misma pinta, sin forma de distinguirlos
   ni de filtrar. Con 34 entradas ya cuesta encontrar nada.

   Aquí se pinta el muro como lo que es —un tablón de la Red— con:
     · filtros: todo, lo que escriben las personas, y las novedades;
     · un icono por tipo de novedad y un enlace directo a lo anunciado;
     · fechas en lenguaje llano y «me gusta» y comentarios a la vista.

   El listado de React se oculta, nunca se sustituye ni se vacía: se pinta el
   nuestro al lado. Lo demás de la página —cabecera y formulario para
   publicar— sigue siendo suyo y no se toca.
*/
(function () {
  "use strict";

  var ICONOS = {
    miembro: "👤", lote: "🫘", servicio: "🛠️",
    curso: "🎓", empleo: "💼", persona: "💬"
  };
  var ENLACE_TEXTO = {
    lote: "Ver el lote", servicio: "Ver los servicios",
    curso: "Ver el curso", empleo: "Ver las ofertas de empleo", requerimiento: "Ver los requerimientos"
  };
  // Novedades guardadas antes del arreglo: «nuevo miembro» llevaba a esta misma
  // página y el resto a la portada del marketplace. Cada una va a su sitio.
  function enlaceDeNovedad(tipo, enlace) {
    if (tipo === "miembro") return "";
    var generico = /^\/(marketplace|comunidad)\/?$/.test(enlace);
    if (!generico) return enlace;
    if (tipo === "servicio") return "/marketplace/?ver=servicios";
    if (tipo === "requerimiento") return "/marketplace/?ver=requerimientos";
    if (tipo === "empleo") return "/marketplace/?ver=empleos";
    return "";
  }
  var FILTROS = [
    ["todo", "Todo"],
    ["personas", "De los miembros"],
    ["miembro", "Nuevos miembros"],
    ["lote", "Lotes"],
    ["servicio", "Servicios"],
    ["empleo", "Empleos"],
    ["curso", "Cursos"]
  ];
  var POR_PAGINA = 12;
  var AVISO_ROTULOS = {
    miembro: "Nuevo miembro en la Red", lote: "Nuevo lote publicado",
    servicio: "Nuevo servicio", curso: "Nuevo curso en la Academia",
    empleo: "Nueva oferta de empleo"
  };

  var estado = { posts: [], filtro: "todo", usuario: null, contenedor: null, mostrar: POR_PAGINA };

  function json(url, opciones) {
    var base = { credentials: "include", cache: "no-store" };
    opciones = opciones || {};
    Object.keys(opciones).forEach(function (k) { base[k] = opciones[k]; });
    return fetch(url, base).then(function (r) { return r.json(); })
      .catch(function () { return { ok: false }; });
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

  function skeletonMuro(cuantas) {
    var frag = document.createDocumentFragment();
    var wrap = el("div", { className: "redcafe-skeleton redcafe-skeleton-lista", role: "status", "aria-label": "Cargando comunidad" });
    for (var i = 0; i < cuantas; i++) {
      var card = el("article", { className: "redcafe-skeleton-card", "aria-hidden": "true" });
      card.appendChild(el("span", { className: "redcafe-skeleton-bloque redcafe-skeleton-linea corta" }));
      card.appendChild(el("span", { className: "redcafe-skeleton-bloque redcafe-skeleton-linea" }));
      card.appendChild(el("span", { className: "redcafe-skeleton-bloque redcafe-skeleton-linea media" }));
      wrap.appendChild(card);
    }
    frag.appendChild(wrap);
    return frag;
  }

  function cuando(iso) {
    var t = Date.parse(iso || "");
    if (!t) return "";
    var seg = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (seg < 60) return "hace un momento";
    if (seg < 3600) return "hace " + Math.round(seg / 60) + " min";
    if (seg < 86400) return "hace " + Math.round(seg / 3600) + " h";
    if (seg < 172800) return "ayer";
    if (seg < 2592000) return "hace " + Math.round(seg / 86400) + " días";
    return new Date(t).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
  }

  function iniciales(nombre) {
    var partes = String(nombre || "?").trim().split(/\s+/).slice(0, 2);
    return partes.map(function (p) { return p.charAt(0).toUpperCase(); }).join("") || "?";
  }

  function esAviso(p) { return (p.tipo || "") === "aviso"; }

  function pasaFiltro(p) {
    if (estado.filtro === "todo") return true;
    if (estado.filtro === "personas") return !esAviso(p);
    return esAviso(p) && (p.aviso || "") === estado.filtro;
  }

  /* ── Paginación ──────────────────────────────────────────────────── */

  function botonVerMas() {
    var b = el("button", { type: "button", className: "redcafe-muro-vermas" }, "Ver más");
    b.addEventListener("click", function () {
      estado.mostrar += POR_PAGINA;
      pintar();
    });
    return b;
  }

  /* ── Una entrada ─────────────────────────────────────────────────── */

  function tarjeta(p) {
    var aviso = esAviso(p);
    var tipo = aviso ? (p.aviso || "sistema") : "persona";
    var art = el("article", {
      className: "redcafe-muro-item" + (aviso ? " es-aviso" : ""),
      "data-tipo": tipo
    });

    // Disposición tipo X: avatar a la izquierda y, a la derecha, una sola
    // línea de cabecera (autor · rol · cuándo) sobre el contenido. Nada de
    // tarjetas: las entradas se separan con una línea fina.
    var avatar = el("span", { className: "redcafe-muro-avatar", "aria-hidden": "true" },
      aviso ? (ICONOS[tipo] || "☕") : iniciales(p.autor));
    art.appendChild(avatar);
    var cuerpo = el("div", { className: "redcafe-muro-cuerpo" });
    art.appendChild(cuerpo);

    // <div>, no <header>: el CSS del sitio pinta toda cabecera con el fondo
    // oscuro de la barra superior y tapaba el nombre del autor.
    var cab = el("div", { className: "redcafe-muro-cab" });
    var quien = el("div", { className: "redcafe-muro-quien" });
    var autor = el("span", { className: "redcafe-muro-autor" }, p.autor || "Miembro de la Red");
    // El sello del perfil, no el del mensaje. Se resuelve en cada carga desde
    // la API: así, si la administración retira una verificación, el muro deja
    // de mostrarla en el acto en vez de arrastrar sellos viejos.
    if (p.autor_verificado) {
      var sello = el("span", { className: "redcafe-sello-verificado" }, "✓ Verificado");
      sello.title = "Perfil verificado por la administración";
      autor.appendChild(sello);
    }
    quien.appendChild(autor);
    var meta = el("span", { className: "redcafe-muro-meta" });
    if (aviso) meta.appendChild(el("span", { className: "redcafe-muro-sello" }, "Novedad de la Red"));
    else if (p.autor_rol) meta.appendChild(el("span", { className: "redcafe-muro-rol" }, p.autor_rol));
    meta.appendChild(el("time", { datetime: p.created_at || "" }, cuando(p.created_at)));
    if (p.editado_at) meta.appendChild(el("span", { className: "redcafe-muro-editado" }, "· editado"));
    quien.appendChild(meta);
    cab.appendChild(quien);
    cuerpo.appendChild(cab);

    if (p.titulo) cuerpo.appendChild(el("h3", { className: "redcafe-muro-titulo" }, p.titulo));
    if (p.text) cuerpo.appendChild(el("p", { className: "redcafe-muro-texto" }, p.text));

    (Array.isArray(p.imagenes) ? p.imagenes : []).slice(0, 4).forEach(function (url) {
      if (typeof url !== "string" || url.indexOf("/uploads/user-content/") !== 0) return;
      cuerpo.appendChild(el("img", {
        className: "redcafe-muro-foto", src: url, alt: "Imagen de la publicación",
        loading: "lazy", decoding: "async"
      }));
    });

    /* enlaces-comunidad */
    var destino = aviso ? enlaceDeNovedad(tipo, p.enlace || "") : "";
    if (destino) {
      var a = el("a", { className: "redcafe-muro-enlace", href: destino },
        ENLACE_TEXTO[tipo] || "Ver más");
      cuerpo.appendChild(a);
    }

    var pie = el("div", { className: "redcafe-muro-pie" });
    var likes = Array.isArray(p.likes) ? p.likes : [];
    var yaDi = estado.usuario && likes.indexOf(estado.usuario.id) !== -1;
    var botonLike = el("button", {
      type: "button",
      className: "redcafe-muro-like" + (yaDi ? " es-mio" : ""),
      "aria-pressed": yaDi ? "true" : "false",
      "data-post": p.id || ""
    }, (yaDi ? "♥ " : "♡ ") + likes.length);
    pie.appendChild(botonLike);

    // Editar y borrar lo propio: antes solo se podía borrar, y con ello se
    // perdían los comentarios y los «me gusta» que ya había recibido.
    var esMio = !aviso && estado.usuario && String(p.autor_id || "") === String(estado.usuario.id || "");
    if (esMio) {
      var editar = el("button", { type: "button", className: "redcafe-muro-editar" }, "Editar");
      var editorAbierto = null;
      editar.addEventListener("click", function () {
        if (editorAbierto) {
          editorAbierto.remove();
          editorAbierto = null;
          editar.textContent = "Editar";
          return;
        }
        editar.textContent = "Cancelar";
        var caja2 = el("div", { className: "redcafe-muro-editor" });
        var campoTitulo = el("input", { type: "text", maxlength: "140", value: p.titulo || "" });
        var campoTexto = el("textarea", { rows: "4", maxlength: "4000" });
        campoTexto.value = p.text || "";
        var guardar = el("button", { type: "button", className: "redcafe-muro-editar-guardar" }, "Guardar");
        var aviso2 = el("span", { className: "redcafe-muro-editar-estado", role: "status", "aria-live": "polite" });
        guardar.addEventListener("click", function () {
          var t = campoTitulo.value.trim();
          var x = campoTexto.value.trim();
          if (t.length < 2 || x.length < 2) { aviso2.textContent = "Escribe título y texto."; return; }
          guardar.disabled = true;
          aviso2.textContent = "Guardando…";
          json("/api/comunidad.php?action=update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: p.id, titulo: t, text: x })
          }).then(function (r) {
            guardar.disabled = false;
            if (r && r.ok) { cargar(); return; }
            aviso2.textContent = (r && r.error) || "No se pudo guardar.";
          });
        });
        caja2.appendChild(campoTitulo);
        caja2.appendChild(campoTexto);
        caja2.appendChild(guardar);
        caja2.appendChild(aviso2);
        cuerpo.appendChild(caja2);
        editorAbierto = caja2;
      });
      pie.appendChild(editar);

      var borrar = el("button", { type: "button", className: "redcafe-muro-borrar" }, "Borrar");
      borrar.addEventListener("click", function () {
        if (!window.confirm("¿Borrar esta publicación? Se pierden sus comentarios.")) return;
        json("/api/comunidad.php?action=delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: p.id })
        }).then(function (r) { if (r && r.ok) cargar(); });
      });
      pie.appendChild(borrar);
    } else if (estado.usuario && !aviso && p.autor_id) {
      /* reportar-miembro */
      pie.appendChild(el("button", { type: "button", className: "redcafe-muro-reportar", "data-reportar-uid": String(p.autor_id), "data-reportar-nombre": p.autor || "" }, "Reportar"));
    }

    var comentarios = Array.isArray(p.comments) ? p.comments : [];
    var verCom = el("button", { type: "button", className: "redcafe-muro-comentar", "data-post": p.id || "" },
      comentarios.length === 1 ? "1 comentario" : comentarios.length + " comentarios");
    pie.appendChild(verCom);
    cuerpo.appendChild(pie);

    var caja = el("div", { className: "redcafe-muro-comentarios", hidden: "hidden" });
    comentarios.forEach(function (c) {
      var li = el("div", { className: "redcafe-muro-comentario" });
      li.appendChild(el("strong", {}, c.autor || "Miembro"));
      li.appendChild(el("span", { className: "redcafe-muro-comfecha" }, " · " + cuando(c.created_at)));
      li.appendChild(el("p", {}, c.text || ""));
      /* eliminar-propias */
      var yo = estado.usuario && String(estado.usuario.id || "");
      if (yo && c.id && (c.autor_id === yo || p.autor_id === yo)) {
        var borrarCom = el("button", { type: "button", className: "redcafe-muro-borrar", "aria-label": "Borrar comentario" }, "Borrar");
        borrarCom.addEventListener("click", function () {
          if (!window.confirm("¿Borrar este comentario?")) return;
          json("/api/comunidad.php?action=comment_delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: p.id, comment_id: c.id })
          }).then(function (r) { if (r && r.ok) cargar(); });
        });
        li.appendChild(borrarCom);
      }
      caja.appendChild(li);
    });
    if (estado.usuario) {
      var form = el("div", { className: "redcafe-muro-nuevocom" });
      var campo = el("input", { type: "text", maxlength: "1000", placeholder: "Escribe un comentario…" });
      var enviar = el("button", { type: "button" }, "Comentar");
      enviar.addEventListener("click", function () {
        var texto = campo.value.trim();
        if (texto.length < 2) return;
        enviar.disabled = true;
        json("/api/comunidad.php?action=comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: p.id, text: texto })
        }).then(function (r) {
          enviar.disabled = false;
          if (r && r.ok) { campo.value = ""; cargar(); }
        });
      });
      form.appendChild(campo);
      form.appendChild(enviar);
      caja.appendChild(form);
    } else if (!comentarios.length) {
      caja.appendChild(el("p", { className: "redcafe-muro-vacio" },
        "Entra a tu perfil para comentar."));
    }
    cuerpo.appendChild(caja);

    verCom.addEventListener("click", function () { caja.hidden = !caja.hidden; });
    botonLike.addEventListener("click", function () {
      if (!estado.usuario) { location.href = "/login/"; return; }
      json("/api/comunidad.php?action=like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id })
      }).then(function (r) { if (r && r.ok) cargar(); });
    });

    return art;
  }

  /* ── Pintado ─────────────────────────────────────────────────────── */

  function pintar() {
    var lista = estado.contenedor.querySelector(".redcafe-muro-lista");
    while (lista.firstChild) lista.removeChild(lista.firstChild);

    var visibles = estado.posts.filter(pasaFiltro);
    var resumen = estado.contenedor.querySelector(".redcafe-muro-resumen");
    if (resumen) {
      resumen.textContent = visibles.length === estado.posts.length
        ? estado.posts.length + (estado.posts.length === 1 ? " entrada" : " entradas")
        : "Mostrando " + visibles.length + " de " + estado.posts.length;
    }

    if (!visibles.length) {
      lista.appendChild(el("p", { className: "redcafe-muro-vacio" },
        estado.filtro === "personas"
          ? "Todavía nadie ha escrito en el muro. Puedes ser el primero."
          : "No hay nada de este tipo por ahora."));
      return;
    }

    // Se pinta por tandas de POR_PAGINA; «Ver más» añade otra tanda. Los
    // avisos de nuevos miembros seguidos se agrupan en una sola fila.
    visibles.slice(0, estado.mostrar).forEach(function (p) { lista.appendChild(tarjeta(p)); });
    if (visibles.length > estado.mostrar) lista.appendChild(botonVerMas());
  }

  function cargar() {
    json("/api/comunidad.php?action=list").then(function (res) {
      estado.posts = (res && res.ok && res.data && Array.isArray(res.data.posts))
        ? res.data.posts : [];
      pintar();
    });
  }

  // Busca la lista de React (el contenedor de sus <article>) que no sea la
  // nuestra y no esté ya oculta. Vigila hasta encontrarla y la oculta apenas
  // aparece; se rinde a los 15 s como red de seguridad (no debería tardar
  // tanto, pero si el fetch de React fallara no hay que vigilar para siempre).
  function vigilarListaReactTardia(main) {
    function buscar() {
      var arts = main.querySelectorAll("article");
      for (var i = 0; i < arts.length; i++) {
        if (arts[i].closest("#redcafe-muro")) continue;
        var padre = arts[i].parentElement;
        if (padre && padre.getAttribute("data-redcafe-oculto") !== "1") return padre;
      }
      return null;
    }
    var obs = new MutationObserver(function () {
      var contenedor = buscar();
      if (!contenedor) return;
      contenedor.setAttribute("data-redcafe-oculto", "1");
      obs.disconnect();
    });
    obs.observe(main, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 15000);
  }

  function montar() {
    if (location.pathname.indexOf("/comunidad") !== 0) return;
    if (document.getElementById("redcafe-muro")) return;
    var main = document.querySelector("main");
    if (!main) return;

    // El listado de React se localiza por ser el contenedor de los artículos.
    // Si el muro está vacío no hay artículos que buscar: entonces el nuestro
    // se coloca igual al final del <main>. Antes, con cero publicaciones, la
    // página se quedaba sin filtros y sin el mensaje de «sé el primero».
    var alguno = main.querySelector("article");
    var listaReact = alguno ? alguno.parentElement : null;

    var seccion = el("section", { id: "redcafe-muro", className: "redcafe-muro", "data-redcafe-propio": "1" });

    var barra = el("div", { className: "redcafe-muro-barra", role: "group", "aria-label": "Filtrar el muro" });
    FILTROS.forEach(function (f) {
      var b = el("button", {
        type: "button",
        className: "redcafe-muro-filtro" + (f[0] === "todo" ? " is-activo" : ""),
        "data-filtro": f[0]
      }, f[1]);
      barra.appendChild(b);
    });
    seccion.appendChild(barra);
    seccion.appendChild(el("p", { className: "redcafe-muro-resumen", role: "status", "aria-live": "polite" }));
    var lista = el("div", { className: "redcafe-muro-lista" });
    lista.appendChild(skeletonMuro(4));
    seccion.appendChild(lista);

    if (listaReact) {
      listaReact.insertAdjacentElement("afterend", seccion);
      listaReact.setAttribute("data-redcafe-oculto", "1");
    } else {
      main.appendChild(seccion);
      // Con sesión iniciada y publicaciones reales, React trae su propia
      // lista con una petición suya, aparte de la nuestra: puede tardar más
      // o menos según la red, y puede llegar después de montar el muro. Si
      // no se vigila, esa lista se queda visible para siempre junto a la
      // nuestra — las «dos versiones a la vez» reportadas. Se vigila con
      // MutationObserver, no con reintentos por tiempo: se entera en cuanto
      // React la pinta, sin importar cuánto tarde.
      vigilarListaReactTardia(main);
    }
    estado.contenedor = seccion;

    barra.addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("[data-filtro]") : null;
      if (!b) return;
      estado.filtro = b.getAttribute("data-filtro");
      estado.mostrar = POR_PAGINA;
      Array.prototype.slice.call(barra.querySelectorAll("[data-filtro]")).forEach(function (x) {
        x.classList.toggle("is-activo", x === b);
      });
      pintar();
    });

    json("/api/auth.php?action=me").then(function (res) {
      estado.usuario = res && res.ok && res.data && res.data.user;
      cargar();
    });
  }

  // El muro necesita que React haya pintado ya su lista para saber dónde
  // colocarse, y al navegar sin recargar (SPA) React tarda un poco en
  // pintar la ruta nueva: por eso hay reintentos. Pero en una carga
  // completa de la página el <main> ya existe desde el primer HTML
  // (estático), así que esperar 900 ms fijos antes de intentarlo no evita
  // ningún error de carrera: solo deja a la vista, sin necesidad, el muro
  // de React sin la capa propia encima durante casi un segundo — el
  // «pestañeo» reportado. Se monta de inmediato y los reintentos quedan
  // como red de seguridad para cuando sí hace falta esperar a React.
  // React #418 en producción: con red lenta, «load» llegaba antes de que React
  // hidratara y el muro se insertaba en un <main> que React aún no había
  // reconocido. Se espera a la hidratación (máx. 10 s, luego sigue igual).
  var esperaHidratacion = 0;
  function hidratado() {
    var m = document.querySelector("main");
    return !!m && Object.keys(m).some(function (k) { return k.indexOf("__reactFiber") === 0; });
  }
  function iniciar() {
    if (location.pathname.indexOf("/comunidad") !== 0) return;
    if (!hidratado() && esperaHidratacion < 66) { esperaHidratacion++; setTimeout(iniciar, 150); return; }
    var intentos = 0;
    var reloj = setInterval(function () {
      intentos++;
      montar();
      if (document.getElementById("redcafe-muro") || intentos > 12) clearInterval(reloj);
    }, 700);
    montar();
  }

  if (document.readyState === "complete") iniciar();
  else window.addEventListener("load", iniciar, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 800); });
})();
