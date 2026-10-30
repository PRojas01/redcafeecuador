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
    curso: "Ver el curso", empleo: "Ver la oferta", miembro: "Ver la comunidad"
  };
  var FILTROS = [
    ["todo", "Todo"],
    ["personas", "De los miembros"],
    ["miembro", "Nuevos miembros"],
    ["lote", "Lotes"],
    ["servicio", "Servicios"],
    ["empleo", "Empleos"],
    ["curso", "Cursos"]
  ];

  var estado = { posts: [], filtro: "todo", usuario: null, contenedor: null };

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

  /* ── Una entrada ─────────────────────────────────────────────────── */

  function tarjeta(p) {
    var aviso = esAviso(p);
    var tipo = aviso ? (p.aviso || "sistema") : "persona";
    var art = el("article", {
      className: "redcafe-muro-item" + (aviso ? " es-aviso" : ""),
      "data-tipo": tipo
    });

    var cab = el("header", { className: "redcafe-muro-cab" });
    var avatar = el("span", { className: "redcafe-muro-avatar", "aria-hidden": "true" },
      aviso ? (ICONOS[tipo] || "☕") : iniciales(p.autor));
    cab.appendChild(avatar);

    var quien = el("div", { className: "redcafe-muro-quien" });
    var autor = el("p", { className: "redcafe-muro-autor" }, p.autor || "Miembro de la Red");
    // El sello del perfil, no el del mensaje. Se resuelve en cada carga desde
    // la API: así, si la administración retira una verificación, el muro deja
    // de mostrarla en el acto en vez de arrastrar sellos viejos.
    if (p.autor_verificado) {
      var sello = el("span", { className: "redcafe-sello-verificado" }, "✓ Verificado");
      sello.title = "Perfil verificado por la administración";
      autor.appendChild(sello);
    }
    quien.appendChild(autor);
    var meta = el("p", { className: "redcafe-muro-meta" });
    if (aviso) meta.appendChild(el("span", { className: "redcafe-muro-sello" }, "Novedad de la Red"));
    else if (p.autor_rol) meta.appendChild(el("span", { className: "redcafe-muro-rol" }, p.autor_rol));
    meta.appendChild(el("time", { datetime: p.created_at || "" }, cuando(p.created_at)));
    quien.appendChild(meta);
    cab.appendChild(quien);
    art.appendChild(cab);

    if (p.titulo) art.appendChild(el("h3", { className: "redcafe-muro-titulo" }, p.titulo));
    if (p.text) art.appendChild(el("p", { className: "redcafe-muro-texto" }, p.text));

    (Array.isArray(p.imagenes) ? p.imagenes : []).slice(0, 4).forEach(function (url) {
      if (typeof url !== "string" || url.indexOf("/uploads/user-content/") !== 0) return;
      art.appendChild(el("img", {
        className: "redcafe-muro-foto", src: url, alt: "Imagen de la publicación",
        loading: "lazy", decoding: "async"
      }));
    });

    if (aviso && p.enlace) {
      var a = el("a", { className: "redcafe-muro-enlace", href: p.enlace },
        ENLACE_TEXTO[tipo] || "Ver más");
      art.appendChild(a);
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

    var comentarios = Array.isArray(p.comments) ? p.comments : [];
    var verCom = el("button", { type: "button", className: "redcafe-muro-comentar", "data-post": p.id || "" },
      comentarios.length === 1 ? "1 comentario" : comentarios.length + " comentarios");
    pie.appendChild(verCom);
    art.appendChild(pie);

    var caja = el("div", { className: "redcafe-muro-comentarios", hidden: "hidden" });
    comentarios.forEach(function (c) {
      var li = el("div", { className: "redcafe-muro-comentario" });
      li.appendChild(el("strong", {}, c.autor || "Miembro"));
      li.appendChild(el("span", { className: "redcafe-muro-comfecha" }, " · " + cuando(c.created_at)));
      li.appendChild(el("p", {}, c.text || ""));
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
    art.appendChild(caja);

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
    visibles.forEach(function (p) { lista.appendChild(tarjeta(p)); });
  }

  function cargar() {
    json("/api/comunidad.php?action=list").then(function (res) {
      estado.posts = (res && res.ok && res.data && Array.isArray(res.data.posts))
        ? res.data.posts : [];
      pintar();
    });
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
    seccion.appendChild(el("div", { className: "redcafe-muro-lista" }));

    if (listaReact) {
      listaReact.insertAdjacentElement("afterend", seccion);
      listaReact.setAttribute("data-redcafe-oculto", "1");
    } else {
      main.appendChild(seccion);
    }
    estado.contenedor = seccion;

    barra.addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("[data-filtro]") : null;
      if (!b) return;
      estado.filtro = b.getAttribute("data-filtro");
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
  // colocarse. Al navegar sin recargar, React tarda un poco: con un solo
  // intento el muro no llegaba a montarse. Se reintenta hasta que aparece.
  function iniciar() {
    if (location.pathname.indexOf("/comunidad") !== 0) return;
    var intentos = 0;
    var reloj = setInterval(function () {
      intentos++;
      montar();
      if (document.getElementById("redcafe-muro") || intentos > 12) clearInterval(reloj);
    }, 700);
    montar();
  }

  if (document.readyState === "complete") setTimeout(iniciar, 900);
  else window.addEventListener("load", function () { setTimeout(iniciar, 900); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 800); });
})();
