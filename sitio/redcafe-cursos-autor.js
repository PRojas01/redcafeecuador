/* Red Café Ecuador — Mis cursos: estudiantes
   ------------------------------------------------------------------
   El autor de un curso necesita ver quién está dentro: nombres, avance,
   pendientes de aprobar y cómo contactar a quien ya está matriculado.
   Esta sección vive en /panel/ y se monta solo si quien entra tiene al
   menos un curso propio (action=mine). Por cada curso muestra la tabla de
   estudiantes, el modo de acceso, los botones de exportar y de avisar a
   los inactivos, y el filtro rápido.

   Privacidad que no se negocia: el correo y el teléfono solo se pintan
   cuando la persona está matriculada en ESE curso (estado matriculado o
   aprobado) y su consentimiento no dice lo contrario. Aquí se pide al
   servidor contacto_visible y, por si acaso, se vuelve a comprobar antes
   de pintar: defensa en dos capas, no en una.

   Todo este bloque es propio (data-redcafe-propio): redcafe-ruta.js lo
   retira al cambiar de página y lo vuelve a montar si se vuelve.
   No toca nodos de React: solo crea los suyos.
*/
(function () {
  "use strict";

  if (window.__redcafeCursosAutor) return;
  window.__redcafeCursosAutor = true;

  function enPanel() { return location.pathname.indexOf("/panel") === 0; }

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? String(n) : "0";
  }

  function json(url, opciones) {
    return fetch(url, Object.assign({ credentials: "include", cache: "no-store" }, opciones || {}))
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false }; });
  }

  function fechaCorta(v) {
    var s = String(v || "");
    return s.slice(0, 10);
  }

  // Solo quien está matriculado en este curso (y consintió) ve los datos de
  // contacto. El servidor ya lo filtró; aquí se confirma antes de pintar.
  function conContacto(e) {
    return e && e.contacto_visible === true &&
      (e.estado === "matriculado" || e.estado === "aprobado");
  }

  function estadoEtiqueta(estado) {
    var mapa = {
      pendiente: "Pendiente", matriculado: "Matriculado",
      aprobado: "Aprobado", rechazado: "Rechazado"
    };
    return mapa[estado] || esc(estado);
  }

  function accionesFila(cursoAcceso, e) {
    var es = esc(e.estado);
    var puedeResolver = cursoAcceso === "aprobacion" && es === "pendiente";
    var contacto = conContacto(e);
    var botones = [];

    if (puedeResolver) {
      botones.push('<button type="button" class="redcafe-autor-btn es-ok" data-decision="aprobado">Aprobar</button>');
      botones.push('<button type="button" class="redcafe-autor-btn es-no" data-decision="rechazado">Rechazar</button>');
    }

    botones.push('<a class="redcafe-autor-btn es-link" href="/chat/?user=' + esc(e.usuario_id) + '">Escribir</a>');

    if (contacto && e.email) {
      botones.push('<a class="redcafe-autor-btn es-link" href="mailto:' + esc(e.email) +
        '?subject=' + encodeURIComponent("Red Café Ecuador — ") + '">Correo</a>');
    }
    if (contacto && e.whatsapp) {
      botones.push('<a class="redcafe-autor-btn es-wa" target="_blank" rel="noreferrer" href="https://wa.me/' +
        esc(e.whatsapp) + '?text=' + encodeURIComponent("Hola " + (e.nombre || "") + ", te escribo desde Red Café Ecuador por el curso.") + '">WhatsApp</a>');
    }

    return botones.join("");
  }

  function filaHtml(cursoId, cursoAcceso, e) {
    var avance = num(e.avance_pct);
    var filtro = e.estado === "pendiente" ? "pendientes"
      : avance === "100" ? "terminados"
      : avance === "0" ? "sin-avanzar" : "todos";
    return '<article class="redcafe-autor-fila" data-usuario="' + esc(e.usuario_id) + '"' +
      ' data-filtro="' + filtro + '" data-estado="' + esc(e.estado) + '">' +
      '<div class="redcafe-autor-quien">' +
        '<strong class="redcafe-autor-nombre">' + esc(e.nombre) + '</strong>' +
        (e.perfil ? '<span class="redcafe-autor-perfil">' + esc(e.perfil) + '</span>' : '') +
        (e.provincia ? '<span class="redcafe-autor-provincia">' + esc(e.provincia) + '</span>' : '') +
      '</div>' +
      '<span class="redcafe-autor-chip es-' + esc(e.estado) + '">' + estadoEtiqueta(e.estado) + '</span>' +
      '<div class="redcafe-autor-avance" role="progressbar" aria-valuenow="' + avance +
        '" aria-valuemin="0" aria-valuemax="100" aria-label="Avance">' +
        '<div class="redcafe-avance-barra mini"><span style="width:' + avance + '%"></span></div>' +
        '<span class="redcafe-autor-avance-txt">' + avance + ' % · ' + fechaCorta(e.ultima_actividad) + '</span>' +
      '</div>' +
      '<div class="redcafe-autor-fecha">Matriculado el ' + fechaCorta(e.fecha) + '</div>' +
      '<div class="redcafe-autor-acciones">' + accionesFila(cursoAcceso, e) + '</div>' +
    '</article>';
  }

  function metros(estudiantes) {
    var m = { matriculados: 0, pendientes: 0, sinAvanzar: 0, terminados: 0, suma: 0 };
    estudiantes.forEach(function (e) {
      if (e.estado === "pendiente") m.pendientes++;
      if (e.estado === "rechazado") return;
      m.matriculados++;
      var a = num(e.avance_pct);
      if (a === "100") m.terminados++;
      if (a === "0") m.sinAvanzar++;
      m.suma += Number(a) || 0;
    });
    m.avanceMedio = m.matriculados > 0 ? String(Math.round(m.suma / m.matriculados)) : "0";
    return m;
  }

  function selectorModo(c) {
    // Los cursos de la Red los mantiene la administración abiertos a todos:
    // ahí no hay selector, no se toca su modo por accidente.
    if (!c.autor_id || !c.puede_gestionar_asociados) return "";
    var opciones = [
      ["abierto", "Abierto a cualquier miembro"],
      ["aprobacion", "Con aprobación del autor"]
    ].map(function (o) {
      return '<option value="' + o[0] + '"' + (c.acceso === o[0] ? " selected" : "") + '>' + esc(o[1]) + '</option>';
    }).join("");
    return '<label class="redcafe-autor-modo"><span>Acceso del curso</span>' +
      '<select data-autor-modo="' + esc(c.curso) + '">' + opciones + '</select></label>';
  }

  function asociadosHtml(c) {
    if (!c.puede_gestionar_asociados) return "";
    var asociados = c.asociados || [];
    var filas = asociados.map(function (a) {
      return '<li class="redcafe-autor-asociado" data-asociado-id="' + esc(a.id) + '">' +
        '<span><strong>' + esc(a.nombre || a.id) + '</strong>' +
        (a.email ? '<small>' + esc(a.email) + '</small>' : '') + '</span>' +
        '<button type="button" class="redcafe-autor-btn es-no" data-asociado-quitar="' + esc(a.id) + '">Quitar</button>' +
      '</li>';
    }).join("");
    return '<section class="redcafe-autor-asociados">' +
      '<h4>Personas asociadas a este curso</h4>' +
      '<ul>' + (filas || '<li class="redcafe-autor-asociado-vacio">Sin personas asociadas.</li>') + '</ul>' +
      '<div class="redcafe-autor-asociar-form">' +
        '<input type="email" inputmode="email" autocomplete="email" data-asociado-input placeholder="correo@ejemplo.com">' +
        '<button type="button" class="redcafe-autor-btn es-ok" data-asociado-agregar>Asociar</button>' +
      '</div>' +
    '</section>';
  }

  function cursoHtml(c) {
    var rows = (c.estudiantes || []).map(function (e) {
      return filaHtml(c.curso, c.acceso, e);
    }).join("");
    var m = metros(c.estudiantes || []);
    var filtros = [
      ["todos", "Todos"],
      ["pendientes", "Pendientes"],
      ["sin-avanzar", "Sin avanzar"],
      ["terminados", "Terminados"]
    ].map(function (f) {
      return '<button type="button" class="redcafe-autor-filtro' + (f[0] === "todos" ? " is-activo" : "") +
        '" data-autor-filtro="' + f[0] + '">' + f[1] + '</button>';
    }).join("");

    return '<div class="redcafe-autor-curso" data-curso="' + esc(c.curso) + '">' +
      '<header class="redcafe-autor-cab">' +
        '<h3 class="redcafe-autor-titulo">' + esc(c.titulo) + '</h3>' +
        '<div class="redcafe-autor-metricas">' +
          '<span class="redcafe-autor-metrica"><strong>'+ m.matriculados +'</strong> ' + (m.matriculados === 1 ? 'matriculado' : 'matriculados') + '</span>' +
          '<span class="redcafe-autor-metrica"><strong>' + m.pendientes + '</strong> pendientes de aprobar</span>' +
          '<span class="redcafe-autor-metrica"><strong>' + m.avanceMedio + ' %</strong> avance medio</span>' +
        '</div>' +
        '<label class="redcafe-derechos"><input type="checkbox" name="acepta_derechos" required> Declaro que tengo los derechos sobre este contenido y asumo la responsabilidad ante cualquier reclamo de terceros.</label>' +
        selectorModo(c) +
        '<span class="redcafe-autor-estado" role="status" aria-live="polite"></span>' +
      '</header>' +
      '<div class="redcafe-autor-barra-acciones">' +
        '<div class="redcafe-autor-filtros">' + filtros + '</div>' +
        '<div class="redcafe-autor-curso-botones">' +
          '<a class="redcafe-autor-btn" href="/api/cursos.php?action=exportar&amp;curso=' + esc(c.curso) + '">Exportar CSV</a>' +
          (c.puede_gestionar_asociados ? '<button type="button" class="redcafe-autor-btn es-avisar" data-autor-avisar="' + esc(c.curso) + '">Avisar a los inactivos (30 días)</button>' : '') +
        '</div>' +
      '</div>' +
      asociadosHtml(c) +
      '<div class="redcafe-autor-tabla">' + (rows || '<p class="redcafe-autor-vacio">Todavía no hay estudiantes en este curso.</p>') + '</div>' +
      '<p class="redcafe-autor-aviso-contacto">Correo y teléfono solo de quien está matriculado en este curso.</p>' +
    '</div>';
  }

  function pintar(seccion, data) {
    var cursos = data.cursos || [];
    seccion.innerHTML =
      '<div class="redcafe-pub-wrap">' +
        '<p class="redcafe-pub-rotulo">Academia</p>' +
        '<h2 class="redcafe-pub-titulo">Mis cursos: estudiantes</h2>' +
        '<p class="redcafe-pub-intro">Revisa quién está matriculado, aprueba o rechaza peticiones y retoma el hilo con los que llevan un tiempo sin avanzar.</p>' +
        cursos.map(cursoHtml).join("") +
      '</div>';
  }

  function refrescarCurso(cursoEl, c) {
    var rows = (c.estudiantes || []).map(function (e) {
      return filaHtml(c.curso, c.acceso, e);
    }).join("");
    cursoEl.querySelector(".redcafe-autor-tabla").innerHTML =
      rows || '<p class="redcafe-autor-vacio">Todavía no hay estudiantes en este curso.</p>';
    var m = metros(c.estudiantes || []);
    var mets = cursoEl.querySelector(".redcafe-autor-metricas");
    if (mets) {
      mets.innerHTML =
        '<span class="redcafe-autor-metrica"><strong>' + m.matriculados + '</strong> ' + (m.matriculados === 1 ? 'matriculado' : 'matriculados') + '</span>' +
        '<span class="redcafe-autor-metrica"><strong>' + m.pendientes + '</strong> pendientes de aprobar</span>' +
        '<span class="redcafe-autor-metrica"><strong>' + m.avanceMedio + ' %</strong> avance medio</span>';
    }
    cursoEl.estadoDatos = c;
  }

  function refrescarAsociados(cursoEl, asociados) {
    if (!cursoEl || !cursoEl.estadoDatos) return;
    cursoEl.estadoDatos.asociados = asociados || [];
    var bloque = cursoEl.querySelector(".redcafe-autor-asociados");
    if (!bloque) return;
    var tmp = document.createElement("div");
    tmp.innerHTML = asociadosHtml(cursoEl.estadoDatos);
    var nuevo = tmp.firstChild;
    if (nuevo) bloque.replaceWith(nuevo);
  }

  // Tras resolver una petición se pide de nuevo el curso: así los totales, las
  // filas y los botones quedan al día sin inventar nada en el navegador.
  function refrescarCursoTrasResolver(seccion, cursoId) {
    json("/api/cursos.php?action=matriculados&curso=" + encodeURIComponent(cursoId)).then(function (r) {
      if (!r || !r.ok) return;
      var nuevo = r.data && r.data.cursos && r.data.cursos[0];
      if (!nuevo) return;
      var el = seccion.querySelector('.redcafe-autor-curso[data-curso="' + esc(cursoId) + '"]');
      if (el) refrescarCurso(el, nuevo);
    });
  }

  function montar() {
    if (!enPanel()) return;
    var main = document.querySelector("main");
    if (!main) return;
    if (document.getElementById("redcafe-cursos-autor")) return;

    // GATE: solo si quien entra tiene al menos un curso propio.
    json("/api/cursos.php?action=mine").then(function (m) {
      if (!m || !m.ok || !m.data) return;
      var mios = m.data.cursos || [];
      if (!mios.length) return;

      json("/api/cursos.php?action=matriculados").then(function (r) {
        if (!r || !r.ok || !r.data) return;
        var datos = r.data;
        var seccion = document.createElement("section");
        seccion.id = "redcafe-cursos-autor";
        seccion.className = "redcafe-pub-seccion";
        seccion.setAttribute("data-redcafe-propio", "1");
        pintar(seccion, datos);
        main.appendChild(seccion);

        // Referencia viva para refrescar cada curso tras resolver acceso.
        datos.cursos.forEach(function (c) {
          var el = seccion.querySelector('.redcafe-autor-curso[data-curso="' + esc(c.curso) + '"]');
          if (el) { el.estadoDatos = c; }
        });

        seccion.addEventListener("click", function (ev) {
          var t = ev.target;
          if (!t || !t.closest) return;

          var resolver = t.closest("[data-decision]");
          if (resolver) {
            var fila = resolver.closest(".redcafe-autor-fila");
            var cursoEl = resolver.closest(".redcafe-autor-curso");
            var estado = cursoEl.querySelector(".redcafe-autor-estado");
            var decision = resolver.getAttribute("data-decision");
            resolver.disabled = true;
            if (estado) { estado.textContent = "Guardando…"; estado.className = "redcafe-autor-estado"; }
            json("/api/cursos.php?action=resolver_acceso", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                curso: cursoEl.getAttribute("data-curso"),
                usuario: fila.getAttribute("data-usuario"),
                decision: decision
              })
            }).then(function (r) {
              resolver.disabled = false;
              if (r && r.ok) {
                refrescarCursoTrasResolver(seccion, cursoEl.getAttribute("data-curso"));
                if (estado) estado.textContent = decision === "aprobado" ? "Acceso concedido." : "Petición rechazada.";
              } else if (estado) {
                estado.textContent = (r && r.error) || "No se pudo guardar.";
                estado.className = "redcafe-autor-estado is-error";
              }
            });
            return;
          }

          var avisar = t.closest("[data-autor-avisar]");
          if (avisar) {
            var cursoId2 = avisar.getAttribute("data-autor-avisar");
            var cont = avisar.closest(".redcafe-autor-curso");
            var st = cont.querySelector(".redcafe-autor-estado");
            if (!window.confirm("¿Enviar un aviso interno a quienes llevan más de 30 días sin avanzar en este curso?")) return;
            avisar.disabled = true;
            if (st) { st.textContent = "Enviando…"; st.className = "redcafe-autor-estado"; }
            json("/api/cursos.php?action=recordar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ curso: cursoId2, dias: 30 })
            }).then(function (r) {
              avisar.disabled = false;
              if (r && r.ok) {
                var n = r.data && r.data.avisados;
                if (st) {
                  st.textContent = n > 0 ? "Se avisó a " + n + " persona" + (n === 1 ? "" : "s") + "." : "Nadie lleva más de 30 días sin avanzar.";
                  st.className = "redcafe-autor-estado is-ok";
                }
              } else if (st) {
                st.textContent = (r && r.error) || "No se pudo avisar.";
                st.className = "redcafe-autor-estado is-error";
              }
            });
            return;
          }

          var agregarAsociado = t.closest("[data-asociado-agregar]");
          if (agregarAsociado) {
            var cursoElA = agregarAsociado.closest(".redcafe-autor-curso");
            var input = cursoElA.querySelector("[data-asociado-input]");
            var estadoA = cursoElA.querySelector(".redcafe-autor-estado");
            var valor = input ? input.value.trim() : "";
            if (!valor) {
              if (estadoA) { estadoA.textContent = "Escribe el correo del miembro."; estadoA.className = "redcafe-autor-estado is-error"; }
              return;
            }
            agregarAsociado.disabled = true;
            if (estadoA) { estadoA.textContent = "Asociando…"; estadoA.className = "redcafe-autor-estado"; }
            json("/api/cursos.php?action=asociar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ curso: cursoElA.getAttribute("data-curso"), miembro: valor })
            }).then(function (r) {
              agregarAsociado.disabled = false;
              if (r && r.ok) {
                if (input) input.value = "";
                refrescarAsociados(cursoElA, (r.data && r.data.asociados) || []);
                if (estadoA) { estadoA.textContent = "Persona asociada."; estadoA.className = "redcafe-autor-estado is-ok"; }
              } else if (estadoA) {
                estadoA.textContent = (r && r.error) || "No se pudo asociar.";
                estadoA.className = "redcafe-autor-estado is-error";
              }
            });
            return;
          }

          var quitarAsociado = t.closest("[data-asociado-quitar]");
          if (quitarAsociado) {
            var cursoElQ = quitarAsociado.closest(".redcafe-autor-curso");
            var estadoQ = cursoElQ.querySelector(".redcafe-autor-estado");
            var miembro = quitarAsociado.getAttribute("data-asociado-quitar");
            if (!window.confirm("¿Quitar a esta persona asociada del curso?")) return;
            quitarAsociado.disabled = true;
            if (estadoQ) { estadoQ.textContent = "Quitando…"; estadoQ.className = "redcafe-autor-estado"; }
            json("/api/cursos.php?action=desasociar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ curso: cursoElQ.getAttribute("data-curso"), miembro: miembro })
            }).then(function (r) {
              quitarAsociado.disabled = false;
              if (r && r.ok) {
                refrescarAsociados(cursoElQ, (r.data && r.data.asociados) || []);
                if (estadoQ) { estadoQ.textContent = "Persona retirada."; estadoQ.className = "redcafe-autor-estado is-ok"; }
              } else if (estadoQ) {
                estadoQ.textContent = (r && r.error) || "No se pudo quitar.";
                estadoQ.className = "redcafe-autor-estado is-error";
              }
            });
            return;
          }

          var filtro = t.closest("[data-autor-filtro]");
          if (filtro) {
            var cont2 = filtro.closest(".redcafe-autor-curso");
            var grupo = filtro.getAttribute("data-autor-filtro");
            Array.prototype.slice.call(cont2.querySelectorAll(".redcafe-autor-filtro")).forEach(function (b) {
              b.classList.toggle("is-activo", b === filtro);
            });
            Array.prototype.slice.call(cont2.querySelectorAll(".redcafe-autor-fila")).forEach(function (f) {
              var ok = grupo === "todos" || f.getAttribute("data-filtro") === grupo;
              f.style.display = ok ? "" : "none";
            });
          }
        });

        seccion.querySelectorAll('.redcafe-derechos input').forEach(function (input) {
          var selector = input.closest('.redcafe-autor-curso').querySelector('[data-autor-modo]');
          if (!selector) return;
          selector.disabled = true;
          input.addEventListener('change', function () { selector.disabled = !input.checked; });
        });
        seccion.addEventListener("change", function (ev) {
          var sel = ev.target;
          if (!sel || !sel.getAttribute || sel.getAttribute("data-autor-modo") === null) return;
          var cursoId = sel.getAttribute("data-autor-modo");
          var cont = sel.closest(".redcafe-autor-curso");
          var st = cont.querySelector(".redcafe-autor-modo-estado");
          if (st) { st.textContent = "Guardando…"; st.className = "redcafe-autor-estado"; }
          json("/api/cursos.php?action=update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: cursoId, acceso: sel.value, acepta_derechos: true })
          }).then(function (r) {
            if (r && r.ok) {
              cont.setAttribute("data-acceso", sel.value);
              var datos = cont.estadoDatos;
              if (datos) datos.acceso = sel.value;
              if (st) st.textContent = sel.value === "abierto"
                ? "Ahora cualquier miembro puede matricularte."
                : "Ahora hay que aprobar cada matrícula.";
            } else if (st) {
              st.textContent = (r && r.error) || "No se pudo cambiar el acceso.";
              st.className = "redcafe-autor-estado is-error";
            }
          });
        });
      });
    });
  }

  function iniciar() {
    try { montar(); } catch (e) { /* no estropear el panel por esto */ }
  }

  if (document.readyState === "complete") setTimeout(iniciar, 1600);
  else window.addEventListener("load", function () { setTimeout(iniciar, 1600); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 1200); });
})();
