/* Red Café Ecuador — Academia
   ------------------------------------------------------------------
   Dos piezas sobre la misma API (/api/cursos.php):

   1. Visor: en /academia/ y /academia/<curso>/ muestra el contenido real
      del curso y deja marcar cada lección como completada. El avance se
      guarda por miembro, así que cualquier perfil puede formarse y
      retomar donde lo dejó.

   2. Editor: en /panel/, quien puede publicar cursos (asesor experto o
      administrador) gestiona los suyos con una plantilla de módulos y
      lecciones. El administrador ve y edita todos.
*/
(function () {
  "use strict";

  // La ruta se comprueba en cada arranque, no una vez al cargar: Next navega
  // sin recargar y el módulo tiene que poder montarse al entrar por un enlace.
  function enAcademia() { return location.pathname.indexOf("/academia") === 0; }
  function enPanel() { return location.pathname.indexOf("/panel") === 0; }

  var NIVELES = ["Básico", "Intermedio", "Avanzado"];
  var CATEGORIAS = ["produccion", "postcosecha", "calidad", "comercial", "administrativo", "barismo", "legal", "general"];

  // Sello de verificación de la Academia. Dice quién revisó el curso y cuándo:
  // un curso «verificado» sin autor ni fecha no lo puede comprobar nadie.
  function selloVerificado(c) {
    if (!c || !c.verificado) return "";
    var quien = c.verificado_por || "la administración";
    var cuando = "";
    if (c.verificado_en) {
      var f = new Date(Date.parse(c.verificado_en));
      if (!isNaN(f)) cuando = " el " + f.toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
    }
    return '<span class="redcafe-sello-verificado" title="' +
      esc("Revisado por " + quien + cuando) + '">✓ Verificado</span>';
  }

  // Los números que llegan de la API se pintan como números. Van dentro de
  // atributos style y de texto: si algún día uno llegara con otra cosa dentro,
  // aquí no entra. No es paranoia gratuita, es el mismo cuidado que esc().
  function num(v) {
    var n = Number(v);
    return isFinite(n) ? String(n) : "0";
  }

  function porcentaje(v) {
    var n = Number(v);
    if (!isFinite(n)) return "0";
    return String(Math.max(0, Math.min(100, Math.round(n))));
  }

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function json(url, opciones) {
    return fetch(url, Object.assign({ credentials: "include", cache: "no-store" }, opciones || {}))
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false }; });
  }

  function skeletonTarjetas(cuantas) {
    var html = "";
    for (var i = 0; i < cuantas; i++) {
      html += '<article class="redcafe-skeleton-card" aria-hidden="true">' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-media"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea corta"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea media"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea corta"></span>' +
      '</article>';
    }
    return html;
  }

  function skeletonAcademia() {
    return '<div class="redcafe-pub-wrap redcafe-skeleton" role="status" aria-label="Cargando cursos">' +
      '<p class="redcafe-pub-rotulo">Cursos disponibles</p>' +
      '<h2 class="redcafe-pub-titulo">Formación abierta a todos los perfiles</h2>' +
      '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea intro"></span>' +
      '<div class="redcafe-cursos-grid redcafe-skeleton-grid">' + skeletonTarjetas(6) + '</div>' +
    '</div>';
  }

  function skeletonCurso() {
    return '<div class="redcafe-curso-wrap redcafe-skeleton" role="status" aria-label="Abriendo el curso">' +
      '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea corta"></span>' +
      '<span class="redcafe-skeleton-bloque redcafe-skeleton-portada"></span>' +
      '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea titulo"></span>' +
      '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea intro"></span>' +
      '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea media"></span>' +
      '<div class="redcafe-skeleton-lista">' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea media"></span>' +
      '</div>' +
    '</div>';
  }

  /* ── Visor del curso ─────────────────────────────────────────────── */

  function cursoDeLaRuta() {
    var m = location.pathname.match(/^\/academia\/([^\/]+)\/?$/);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function barraAvance(hechas, total) {
    var pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
    return '<div class="redcafe-avance" role="progressbar" aria-valuenow="' + pct +
      '" aria-valuemin="0" aria-valuemax="100" aria-label="Avance del curso">' +
      '<div class="redcafe-avance-barra"><span style="width:' + pct + '%"></span></div>' +
      '<p class="redcafe-avance-texto"><strong>' + pct + ' %</strong> · ' +
      hechas + ' de ' + total + ' lecciones</p></div>';
  }

  // ── Bloques de contenido ─────────────────────────────────────────
  // El texto plano de una lección puede venir acompañado de imágenes,
  // documentos en la nube, vídeos incrustados o fragmentos de código.
  // La API ya validó cada URL: aquí solo se pinta.
  // Un bloque puede traer una lista de pasos, una línea por paso. Antes todo
  // se metía en un solo <p> y los saltos simples los colapsaba el navegador:
  // los pasos salían encadenados en un párrafo ilegible.
  function parrafos(texto) {
    return String(texto || "").split(/\n\n+/).map(function (trozo) {
      var lineas = trozo.split(/\n/).map(function (l) { return l.trim(); })
        .filter(function (l) { return l !== ""; });
      var esLista = lineas.length > 1 && lineas.every(function (l) {
        return /^[•\-*]\s+/.test(l);
      });
      if (esLista) {
        return "<ul class=\"redcafe-bloque-lista\">" + lineas.map(function (l) {
          return "<li>" + esc(l.replace(/^[•\-*]\s+/, "")) + "</li>";
        }).join("") + "</ul>";
      }
      return "<p>" + esc(lineas.join(" ")) + "</p>";
    }).join("");
  }

  function bloqueHtml(b) {
    var titulo = b.titulo ? '<h5 class="redcafe-bloque-titulo">' + esc(b.titulo) + '</h5>' : "";

    if (b.tipo === "texto") {
      return '<div class="redcafe-bloque">' + titulo + parrafos(b.texto) + '</div>';
    }
    if (b.tipo === "imagen") {
      return '<figure class="redcafe-bloque redcafe-bloque-imagen">' + titulo +
        '<img src="' + esc(b.url) + '" alt="' + esc(b.alt || "") + '" loading="lazy" decoding="async">' +
        (b.pie ? '<figcaption>' + esc(b.pie) + '</figcaption>' : '') + '</figure>';
    }
    if (b.tipo === "enlace") {
      return '<div class="redcafe-bloque redcafe-bloque-enlace">' +
        '<a href="' + esc(b.url) + '" target="_blank" rel="noreferrer noopener">' +
          '<strong>' + esc(b.titulo || "Documento") + '</strong>' +
          (b.descripcion ? '<span>' + esc(b.descripcion) + '</span>' : '') +
        '</a></div>';
    }
    if (b.tipo === "tabla") {
      var columnas = Array.isArray(b.columnas) ? b.columnas : [];
      var filas = Array.isArray(b.filas) ? b.filas : [];
      if (!columnas.length || !filas.length) return "";
      return '<div class="redcafe-bloque redcafe-bloque-tabla">' + titulo +
        '<div class="redcafe-tabla-wrap"><table><thead><tr>' +
          columnas.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join("") +
        '</tr></thead><tbody>' +
          filas.map(function (fila) {
            fila = Array.isArray(fila) ? fila : [];
            return '<tr>' + columnas.map(function (c, i) {
              return '<td data-label="' + esc(c) + '">' + esc(fila[i] || "") + '</td>';
            }).join("") + '</tr>';
          }).join("") +
        '</tbody></table></div>' +
        (b.pie ? '<p class="redcafe-bloque-pie">' + esc(b.pie) + '</p>' : '') +
      '</div>';
    }
    if (b.tipo === "video" || b.tipo === "documento") {
      return '<div class="redcafe-bloque redcafe-bloque-embed">' + titulo +
        '<div class="redcafe-embed' + (b.tipo === "documento" ? " es-documento" : "") + '">' +
          '<iframe src="' + esc(b.url) + '" loading="lazy" allowfullscreen ' +
          'referrerpolicy="strict-origin-when-cross-origin" ' +
          'sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" ' +
          'title="' + esc(b.titulo || (b.tipo === "video" ? "Vídeo del curso" : "Documento del curso")) + '"></iframe>' +
        '</div>' +
        (b.descripcion ? '<p class="redcafe-bloque-pie">' + esc(b.descripcion) + '</p>' : '') +
      '</div>';
    }
    if (b.tipo === "codigo") {
      return '<div class="redcafe-bloque redcafe-bloque-codigo">' + titulo +
        '<pre><code>' + esc(b.codigo) + '</code></pre></div>';
    }
    return "";
  }

  function bloquesHtml(lec) {
    var bs = Array.isArray(lec.bloques) ? lec.bloques : [];
    if (!bs.length) return "";
    return '<div class="redcafe-bloques">' + bs.map(bloqueHtml).join("") + '</div>';
  }

  function leccionHtml(cursoId, mi, li, leccion, completada, puedeCompletar, publico) {
    var id = "lec-" + mi + "-" + li;
    return '<article class="redcafe-leccion' + (completada ? " is-hecha" : "") + '" data-modulo="' + mi + '" data-leccion="' + li + '">' +
      '<h4 id="' + id + '">' + esc(leccion.titulo) + '</h4>' +
      (leccion.contenido ? '<div class="redcafe-leccion-texto">' + parrafos(leccion.contenido) + '</div>' : '') +
      bloquesHtml(leccion) +
      (puedeCompletar
        ? '<label class="redcafe-leccion-check">' +
            '<input type="checkbox" data-completar="1"' + (completada ? " checked" : "") + '>' +
            '<span>Marcar como completada</span>' +
          '</label>'
        : '<p class="redcafe-leccion-bloqueada">' + (publico ? 'Matricúlate gratis para guardar tu avance.' : 'Matricúlate para abrir el contenido y guardar tu avance.') + '</p>') +
    '</article>';
  }

  function moduloHtml(cursoId, mi, mod, completadas, puedeCompletar, publico) {
    var lecciones = (mod.lecciones || []).map(function (l, li) {
      return leccionHtml(cursoId, mi, li, l, completadas.indexOf(cursoId + "::" + mi + "::" + li) !== -1, puedeCompletar, publico);
    }).join("");
    return '<section class="redcafe-modulo">' +
      '<header><p class="redcafe-modulo-num">Módulo ' + (mi + 1) + (mod.minutos ? ' · ' + mod.minutos + ' min' : '') + '</p>' +
      '<h3>' + esc(mod.titulo) + '</h3>' +
      (mod.resumen ? '<p class="redcafe-modulo-resumen">' + esc(mod.resumen) + '</p>' : '') +
      '</header>' +
      lecciones +
      (mod.ejercicio ? '<div class="redcafe-ejercicio"><p class="redcafe-ejercicio-rot">Ejercicio</p><p>' + esc(mod.ejercicio) + '</p></div>' : '') +
    '</section>';
  }

  // Cuando el curso exige aprobación y aún no la tienes, se ve el temario
  // pero no el contenido. Aquí se explica y se ofrece solicitarlo.
  // Dos puertas distintas y hay que explicarlas distinto: matricularse
  // depende del alumno; la aprobación, del autor del curso.
  function avisoAcceso(data) {
    var estado = data.mi_solicitud || "ninguno";
    var moderado = (data.acceso || "abierto") === "aprobacion";
    var titulo, cuerpo, accion = "";
    // La leyenda del consentimiento acompaña solo al botón de «Empezar
    // gratis» (curso abierto): ahí es donde se acepta que el autor vea los
    // datos de contacto. La interfaz lo advierte antes, como pide la regla.
    var consentimiento = "";

    if (estado === "anonimo") {
      titulo = data.curso && data.curso.publico ? "Explora gratis y guarda tu avance" : (moderado ? "Crea tu perfil para pedir acceso" : "Crea tu perfil para estudiar este curso");
      cuerpo = data.curso && data.curso.publico
        ? "Puedes leer este curso sin cuenta. Crea tu perfil gratis para matricularte y guardar tu avance."
        : (moderado ? "Este curso lo modera quien lo creó. Con una cuenta gratuita puedes pedir la matrícula y recibir la respuesta." : "La matrícula es gratis y sirve para guardar tu avance lección a lección.");
      accion = '<a class="redcafe-curso-solicitar" href="/afiliate/">Crear perfil gratis</a>';
    } else if (estado === "pendiente") {
      titulo = "Matrícula enviada";
      cuerpo = "Quien creó el curso tiene que aprobarla. Cuando lo haga, verás el contenido aquí mismo.";
    } else if (estado === "rechazado") {
      titulo = "Matrícula no aprobada";
      cuerpo = "Puedes volver a pedirla explicando para qué necesitas el curso.";
      accion = '<button type="button" class="redcafe-curso-solicitar">Pedir de nuevo</button>';
    } else if (moderado) {
      titulo = "Curso con acceso moderado";
      cuerpo = "Pide la matrícula y recibirás el contenido cuando su autor la apruebe.";
      accion = '<button type="button" class="redcafe-curso-matricular">Pedir matrícula</button>';
      consentimiento = '<p class="redcafe-curso-consentimiento">Al pedir la matrícula, quien creó el curso (y las personas asociadas al curso, si las tiene) verá tu nombre, tu avance y tus datos de contacto. <a href="/politica-de-uso-de-datos/" target="_blank" rel="noreferrer">Ver política de uso de datos</a>.</p>';
    } else {
      titulo = "Empezar gratis el curso";
      cuerpo = "Es gratis y toma un clic. Al matricularte se guarda tu avance lección a lección y puedes retomarlo cuando quieras.";
      accion = '<button type="button" class="redcafe-curso-matricular">Empezar gratis</button>';
      consentimiento = '<p class="redcafe-curso-consentimiento">Al matricularte, quien creó el curso (y las personas asociadas al curso, si las tiene) verá tu nombre, tu avance y tus datos de contacto. <a href="/politica-de-uso-de-datos/" target="_blank" rel="noreferrer">Ver política de uso de datos</a>.</p>';
    }

    return '<div class="redcafe-curso-bloqueado">' +
      '<h2>' + esc(titulo) + '</h2>' +
      '<p>' + esc(cuerpo) + '</p>' +
      '<p class="redcafe-bloque-pie">Abajo tienes el temario completo para decidir antes.</p>' +
      accion +
      consentimiento +
      '<p class="redcafe-curso-estado" role="status" aria-live="polite"></p>' +
    '</div>';
  }

  /* Material del curso para quien lo estudia: archivos para descargar y
     enlaces (una inscripción presencial, un formulario, un vídeo). Si el curso
     trae material pero la persona todavía no se matriculó, se le dice cuánto
     hay, sin entregarlo. */
  function materialesCursoHtml(c, data) {
    var lista = Array.isArray(c.materiales) ? c.materiales : [];
    if (!lista.length) {
      var n = Number(c.materiales_count || 0);
      if (!n || data.acceso_concedido !== false) return "";
      return '<div class="redcafe-curso-mat"><h2>Material del curso</h2>' +
        '<p class="redcafe-curso-mat-aviso">Este curso trae ' + n +
        (n === 1 ? ' documento o enlace de apoyo' : ' documentos y enlaces de apoyo') +
        '. Se ven al matricularse.</p></div>';
    }
    return '<div class="redcafe-curso-mat"><h2>Material del curso</h2><ul>' +
      lista.map(function (m) {
        var esArchivo = (m.tipo || "enlace") === "archivo";
        var externo = !esArchivo && /^https:/i.test(String(m.url || ""));
        return '<li>' +
          '<a href="' + esc(m.url || "#") + '"' +
            (esArchivo ? ' download' : '') +
            (externo ? ' target="_blank" rel="noreferrer"' : '') + '>' +
            (esArchivo ? "📄 " : "🔗 ") + esc(m.titulo || (esArchivo ? "Documento" : "Enlace")) +
          '</a>' +
          (m.nota ? '<small>' + esc(m.nota) + '</small>' : '') +
        '</li>';
      }).join("") +
      '</ul></div>';
  }


  /* Advertencia obligatoria. El curso orienta; quien decide y responde por el
     resultado en su finca o su negocio es el miembro. Va al final, después del
     contenido, para que se lea con lo aprendido fresco y no estorbe al entrar. */
  function avisoReferencial() {
    return '<aside class="redcafe-aviso-referencial" role="note">' +
      '<strong>Información referencial</strong>' +
      '<p>Este curso es material de orientación general para el café ecuatoriano. ' +
      'No sustituye la asistencia técnica, agronómica, legal, contable ni sanitaria de un profesional ' +
      'que conozca tu finca o tu negocio. Las condiciones de suelo, clima, variedad, mercado y normativa ' +
      'cambian de un sitio a otro y con el tiempo.</p>' +
      '<p>Aplicar lo aquí descrito y los resultados que se obtengan son responsabilidad de quien lo aplica. ' +
      'Antes de invertir, fumigar, certificar, exportar o firmar, consulta con un técnico y con la ' +
      'entidad competente (MAG, Agrocalidad, SRI, aduana, según el caso).</p>' +
      '</aside>';
  }

  function pintarCurso(host, data) {
    var c = data.curso || {};
    var completadas = data.completadas || [];
    var total = data.total || 0;
    var puedeCompletar = data.acceso_concedido !== false && (data.matriculado || data.puede_editar);

    // El HTML exportado trae el titulo generico de la Academia porque las 9
    // fichas comparten una sola plantilla estatica. React lo corregia al
    // hidratar, poniendo el titulo del curso en la pestaña del navegador.
    if (c.titulo) document.title = c.titulo + " \u00b7 Academia \u00b7 Red Caf\u00e9 Ecuador";

    host.innerHTML =
      '<div class="redcafe-curso-wrap">' +
        '<p class="redcafe-curso-rotulo">' + esc(c.nivel || "") + (c.duracion ? " · " + esc(c.duracion) : "") +
          (c.autor && c.autor_id ? ' · por ' + esc(c.autor) : '') + '</p>' +
        '<img class="redcafe-curso-portada" src="' + esc(portadaDe(c)) + '" alt="" ' +
          'loading="lazy" decoding="async" onerror="this.remove()">' +
        '<p class="redcafe-curso-costo-ficha ' + claseCosto(c) + '">' + esc(precioDe(c)) + '</p>' +
        '<h1 class="redcafe-curso-titulo">' + esc(c.titulo || "Curso") + '</h1>' +
        (c.descripcion ? '<p class="redcafe-curso-desc">' + esc(c.descripcion) + '</p>' : '') +
        ((data.acceso_concedido === false || !puedeCompletar) ? avisoAcceso(data) : '') +
        (data.acceso_concedido !== false && total ? barraAvance(completadas.length, total) : '') +
        (c.introduccion ? '<div class="redcafe-curso-intro"><p>' + esc(c.introduccion) + '</p></div>' : '') +
        ((c.objetivos || []).length
          ? '<div class="redcafe-curso-obj"><h2>Al terminar, podrás</h2><ul>' +
            c.objetivos.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + '</ul></div>'
          : '') +
        (c.modulos || []).map(function (m, i) { return moduloHtml(c.id, i, m, completadas, puedeCompletar, !!c.publico); }).join("") +
        materialesCursoHtml(c, data) +
        ((c.recursos || []).length
          ? '<div class="redcafe-curso-rec"><h2>Recursos y referencias</h2><ul>' +
            c.recursos.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + '</ul></div>'
          : '') +
        (c.cierre ? '<div class="redcafe-curso-cierre"><h2>Para cerrar</h2><p>' + esc(c.cierre) + '</p></div>' : '') +
        avisoReferencial() +
        '<div class="redcafe-curso-pie">' +
          '<a class="btn-ghost" href="/academia/">Volver a la Academia</a>' +
          (puedeCompletar && total ? '<button type="button" class="redcafe-curso-reiniciar">Reiniciar mi avance</button>' : '') +
          '<span class="redcafe-curso-estado" role="status" aria-live="polite"></span>' +
        '</div>' +
      '</div>';

    var estado = host.querySelector(".redcafe-curso-estado");

    host.addEventListener("change", function (ev) {
      var check = ev.target;
      if (!check || !check.getAttribute || check.getAttribute("data-completar") !== "1") return;
      var art = check.closest(".redcafe-leccion");
      json("/api/cursos.php?action=completar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curso: c.id,
          modulo: Number(art.getAttribute("data-modulo")),
          leccion: Number(art.getAttribute("data-leccion")),
          hecho: check.checked
        })
      }).then(function (res) {
        if (res && res.ok && res.data) {
          art.classList.toggle("is-hecha", check.checked);
          var barra = host.querySelector(".redcafe-avance");
          if (barra) barra.outerHTML = barraAvance(res.data.completadas.length, res.data.total);
          estado.textContent = "";
        } else {
          check.checked = !check.checked;
          estado.textContent = (res && res.error) === "No autenticado."
            ? "Crea tu perfil gratis para guardar tu avance."
            : ((res && res.error) || "No se pudo guardar tu avance.");
          estado.className = "redcafe-curso-estado is-error";
        }
      });
    });

    // Matrícula: un clic, sin preguntas. Es lo que abre el contenido de un
    // curso libre y lo que hace que el avance quede a nombre de alguien.
    // La etiqueta del botón varía (Empezar gratis / Pedir matrícula): se
    // guarda al pulsar para restaurarla si algo falla.
    var matricular = host.querySelector("button.redcafe-curso-matricular");
    if (matricular) {
      matricular.addEventListener("click", function () {
        var avisoEstado = host.querySelector(".redcafe-curso-estado");
        var etiqueta = (matricular.textContent || "Matricularme").trim();
        matricular.disabled = true;
        matricular.textContent = "Enviando…";
        json("/api/cursos.php?action=matricular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ curso: c.id })
        }).then(function (r) {
          if (r && r.ok && r.data && r.data.estado === "matriculado") {
            // Con la matrícula hecha, el curso se vuelve a pedir ya con el
            // contenido. El clic prometía empezar sin pasos intermedios: la
            // primera lección se abre al terminar de pintarse (reintentos
            // contados porque el visor llega por fetch).
            montarVisor(true);
            var intentos = 0;
            (function abrir() {
              var primera = document.getElementById("lec-0-0");
              if (primera) {
                primera.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
              }
              if (++intentos < 10) setTimeout(abrir, 250);
            })();
            return;
          }
          /* Cursos con aprobacion: la peticion salio bien pero el acceso
             queda pendiente. Antes esto se contaba en una linea gris de 13 px
             debajo del boton, que volvia a decir «Pedir matricula»: parecia
             que no habia pasado nada y la gente volvia a pulsar. Ahora la
             respuesta se ve como aviso y el boton deja de invitar al clic. */
          var pendiente = !!(r && r.ok);
          if (pendiente) {
            matricular.disabled = true;
            matricular.textContent = "Matrícula pedida";
            matricular.classList.add("es-pedida");
          } else {
            matricular.disabled = false;
            matricular.textContent = etiqueta;
          }
          if (avisoEstado) {
            avisoEstado.textContent = (r && r.data && r.data.mensaje) ||
              (r && r.error) || "No se pudo completar la matrícula.";
            avisoEstado.className = "redcafe-curso-estado " +
              (pendiente ? "is-ok" : "is-error");
          }
        });
      });
    }

    var solicitar = host.querySelector("button.redcafe-curso-solicitar");
    if (solicitar) {
      solicitar.addEventListener("click", function () {
        var motivo = window.prompt("Cuéntale a quien creó el curso para qué lo necesitas (opcional):", "");
        if (motivo === null) return;
        solicitar.disabled = true;
        solicitar.textContent = "Enviando…";
        json("/api/cursos.php?action=solicitar_acceso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ curso: c.id, mensaje: motivo })
        }).then(function (r) {
          if (r && r.ok) location.reload();
          else {
            solicitar.disabled = false;
            solicitar.textContent = "Solicitar acceso";
            estado.textContent = (r && r.error) || "No se pudo enviar la solicitud.";
            estado.className = "redcafe-curso-estado is-error";
          }
        });
      });
    }

    var reiniciar = host.querySelector(".redcafe-curso-reiniciar");
    if (reiniciar) {
      reiniciar.addEventListener("click", function () {
        if (!window.confirm("¿Borrar tu avance en este curso?")) return;
        json("/api/cursos.php?action=reiniciar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ curso: c.id })
        }).then(function (res) {
          if (res && res.ok) location.reload();
        });
      });
    }
  }

  // `rehacer` fuerza a volver a pedir el curso: se usa tras matricularse,
  // para que el contenido aparezca sin recargar la página.
  function montarVisor(rehacer) {
    var id = cursoDeLaRuta();
    if (!id || id === "index.html") return;
    // Las fichas presenciales de Legacy tienen condiciones y contacto propios
    // en la página publicada; el visor de lecciones no debe sustituirlas.
    if (/^legacy-/.test(id)) return;
    var main = document.querySelector("main");
    if (!main) return;
    var previo = document.getElementById("redcafe-curso");
    if (previo && !rehacer) return;
    if (previo && rehacer && previo.parentNode) previo.parentNode.removeChild(previo);

    /* Antes se esperaba la respuesta de la API y SOLO ENTONCES se ocultaba la
       ficha de React. En una conexión lenta eso son uno o dos segundos en los
       que el usuario ve la versión de React —con su imagen y los módulos
       plegados— y de golpe la ve cambiar por la nuestra. Era el parpadeo que
       se reportó.
       Ahora se oculta de entrada y se deja un aviso de «cargando» del mismo
       alto aproximado, para que no haya ni salto ni pantalla en blanco. Si la
       consulta falla o el curso no tiene lecciones, se devuelve la página a
       como estaba: hay que poder retroceder. */
    var tapados = [];
    Array.prototype.slice.call(main.children).forEach(function (el) {
      if (el.getAttribute("data-redcafe-propio") === "1") return;
      if (el.getAttribute("data-redcafe-oculto") === "1") return;
      el.setAttribute("data-redcafe-oculto", "1");
      tapados.push(el);
    });
    function devolverLaPagina() {
      tapados.forEach(function (el) { el.removeAttribute("data-redcafe-oculto"); });
      var esp = document.getElementById("redcafe-curso-esperando");
      if (esp && esp.parentNode) esp.parentNode.removeChild(esp);
      // Fusion: si React ya no pinta esta ruta no hay nada que devolver, asi que
      // la pantalla quedaria en blanco. Ponemos nuestro propio aviso.
      if (tapados.length === 0 && !document.getElementById("redcafe-curso")) {
        if (document.getElementById("redcafe-curso-sinvia")) return;
        var aviso = document.createElement("section");
        aviso.id = "redcafe-curso-sinvia";
        aviso.className = "redcafe-curso-esperando";
        aviso.setAttribute("data-redcafe-propio", "1");
        aviso.setAttribute("role", "status");
        var t = document.createElement("p");
        t.textContent = "No pudimos abrir este curso. Puede que ya no este disponible.";
        var a = document.createElement("a");
        a.href = "/academia/";
        a.textContent = "Volver a la Academia";
        aviso.appendChild(t); aviso.appendChild(a);
        main.insertBefore(aviso, main.firstChild);
      }
    }

    var esperando = document.createElement("section");
    esperando.id = "redcafe-curso-esperando";
    esperando.className = "redcafe-curso-esperando";
    esperando.setAttribute("data-redcafe-propio", "1");
    esperando.setAttribute("aria-live", "polite");
    esperando.innerHTML = skeletonCurso();
    main.insertBefore(esperando, main.firstChild);

    json("/api/cursos.php?action=get&id=" + encodeURIComponent(id)).then(function (res) {
      if (!res || !res.ok || !res.data || !res.data.curso || !res.data.total) {
        devolverLaPagina();
        return;
      }
      // El <h1> que viaja en el HTML es para quien no ejecuta JS y para los
      // buscadores. El visor trae el suyo, asi que aqui se retira el servido
      // para no tener dos titulos.
      var servido = document.querySelector('#redcafe-hueco-titulo[data-redcafe-propio="1"]');
      if (servido && servido.parentNode) servido.parentNode.removeChild(servido);

      var host = document.createElement("section");
      host.id = "redcafe-curso";
      host.className = "redcafe-curso";
      host.setAttribute("data-redcafe-propio", "1");
      main.insertBefore(host, main.firstChild);
      pintarCurso(host, res.data);
      if (esperando.parentNode) esperando.parentNode.removeChild(esperando);
    }).catch(devolverLaPagina);
  }

  /* ── Listado de la academia con avance ───────────────────────────── */

  // La página de la Academia lista los 9 cursos, pero solo algunos tienen las
  // lecciones desarrolladas. Se marca cuáles se pueden cursar ya y cuáles
  // están en preparación, para no hacer entrar a nadie a un curso vacío.
  function marcarCursosDelSitio(cursos) {
    var estado = {};
    cursos.forEach(function (c) { estado[c.id] = c; });
    Array.prototype.slice.call(document.querySelectorAll('a[href^="/academia/"]')).forEach(function (a) {
      var m = (a.getAttribute("href") || "").match(/\/academia\/([^\/]+)\/?$/);
      if (!m) return;
      var c = estado[decodeURIComponent(m[1])];
      if (!c) return;
      var card = a.closest("article, li, div") || a;
      if (card.querySelector(".redcafe-curso-etiqueta")) return;
      var destino = card.querySelector("h2, h3, h4") || a;
      var tag = document.createElement("span");
      tag.className = "redcafe-curso-etiqueta" + (c.listo ? "" : " es-preparacion");
      tag.textContent = c.listo
        ? (c.completadas > 0 ? c.avance + " % completado" : "Contenido disponible")
        : "En preparación";
      destino.appendChild(tag);
    });
  }

  /* Las portadas por categoría que ya vienen en el paquete. La lista de React
     solo usaba tres de ellas y las repetía; aquí se cubren todas las categorías
     que acepta la API, y si aparece una nueva se cae a una genérica en vez de
     dejar el hueco. */
  var PORTADAS = {
    produccion:     "/img/academia/produccion.webp",
    postcosecha:    "/img/academia/postcosecha.webp",
    calidad:        "/img/academia/certificacion.webp",
    comercial:      "/img/academia/comercial.webp",
    administrativo: "/img/academia/capacitacion.webp",
    barismo:        "/img/academia/barismo-taza.webp",
    legal:          "/img/academia/certificacion.webp",
    general:        "/img/academia/basico.webp"
  };
  /* Portadas hechas para un curso concreto. Los cursos de Legacy llevan su
     propia imagen de marca; sin esto caian en la portada generica de barismo
     y las tres se veian iguales. */
  var PORTADAS_POR_CURSO = {
    "legacy-barista-en-casa":       "/uploads/user-content/legacy-barista-en-casa.jpg",
    "legacy-barismo-profesional":   "/uploads/user-content/legacy-barismo-profesional.jpg",
    "legacy-barista-avanzado":      "/uploads/user-content/legacy-barista-avanzado.jpg",
    "cafe-de-especialidad-de-la-finca-a-la-taza":
                                    "/uploads/user-content/curso-cafe-especialidad-finca-taza.jpg",
    /* Los 9 cursos propios compartian solo 3 imagenes por categoria (algunos
       de tema totalmente distinto se veian con la misma foto). Portada
       propia por curso, generada el 24/09/2026. */
    "buenas-practicas":  "/uploads/user-content/curso-portada-buenas-practicas.jpg",
    "cafe-especial":     "/uploads/user-content/curso-portada-cafe-especial.jpg",
    "manejo-plagas":     "/uploads/user-content/curso-portada-manejo-plagas.jpg",
    "postcosecha":       "/uploads/user-content/curso-portada-postcosecha.jpg",
    "ventas-comercial":  "/uploads/user-content/curso-portada-ventas-comercial.jpg",
    "tueste":            "/uploads/user-content/curso-portada-tueste.jpg",
    "exportacion":       "/uploads/user-content/curso-portada-exportacion.jpg",
    "formalizacion":     "/uploads/user-content/curso-portada-formalizacion.jpg",
    "trazabilidad":      "/uploads/user-content/curso-portada-trazabilidad.jpg"
  };

  /* El gancho de cada curso: la frase corta que React mostraba en el indice y
     que la fusion se llevo. Las descripciones de `data/cursos.json` explican el
     temario; estas dicen para que sirve. Rescatadas del paquete 20260924c. */
  var SELLOS_PORTADA = {
    "cafe-de-especialidad-de-la-finca-a-la-taza": "Empieza gratis · de la finca a la taza",
    "legacy-barista-en-casa": "Prepara mejores tazas en casa",
    "legacy-barismo-profesional": "Practica técnicas de barra profesional",
    "legacy-barista-avanzado": "Da el siguiente paso tras Barista Pro"
  };
  function selloPortada(c) {
    return SELLOS_PORTADA[String(c.id || "")] ||
      (PRECIOS[String(c.id || "")] ? "Formación con Legacy" : "Aprende gratis · a tu ritmo");
  }

  var GANCHOS = {
    "buenas-practicas": "Saca m\u00e1s quintales de la misma hect\u00e1rea.",
    "postcosecha": "Sube el puntaje de tu taza y con \u00e9l el precio que te pagan.",
    "ventas-comercial": "Deja de aceptar el primer precio que te ofrecen.",
    "formalizacion": "Factura en regla y v\u00e9ndele a quien exige comprobante.",
    "tueste": "Consigue un perfil de tueste que puedas repetir siempre igual.",
    "trazabilidad": "Llega con los papeles hechos cuando tu comprador europeo te los pida.",
    "cafe-especial": "Haz que tu caf\u00e9 deje de venderse como uno m\u00e1s.",
    "manejo-plagas": "No pierdas la cosecha por una plaga que se ve\u00eda venir.",
    "exportacion": "Vende fuera del Ecuador sin depender de un intermediario.",
    "cafe-de-especialidad-de-la-finca-a-la-taza": "Descubre qué hace valioso a un café, del grano a la taza.",
    "legacy-barista-en-casa": "Aprende a preparar café de calidad sin salir de casa.",
    "legacy-barismo-profesional": "Entrena espresso, calibración, leche y servicio para trabajar en barra.",
    "legacy-barista-avanzado": "Profundiza tu técnica si ya egresaste de Barista Pro."
  };


  /* Etiqueta de costo. Los 3 cursos de Legacy son de pago (su valor esta en su
     descripcion, dictado por el aliado); los propios de Red Cafe son gratis.
     Un solo punto de verdad para no repetir el numero por el sitio. */
  var PRECIOS = {
    "legacy-barista-en-casa": "Promoción 143 USD · pareja/grupo 120 USD c/u",
    "legacy-barismo-profesional": "Promoción 359 USD · pareja/grupo 320 USD c/u",
    "legacy-barista-avanzado": "Promoción 550 USD"
  };
  function precioDe(c) {
    var p = PRECIOS[String(c.id || "")];
    return p || "Gratis";
  }
  function claseCosto(c) {
    return PRECIOS[String(c.id || "")] ? "es-pago" : "es-gratis";
  }

  function portadaDe(c) {
    var propia = PORTADAS_POR_CURSO[String(c.id || "")];
    if (propia) return propia;
    return PORTADAS[String(c.categoria || "general")] || PORTADAS.general;
  }

  function montarListado() {
    if (location.pathname.replace(/\/$/, "") !== "/academia") return;
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-academia-avance")) return;

    var seccion = document.createElement("section");
    seccion.id = "redcafe-academia-avance";
    seccion.className = "redcafe-academia-avance";
    seccion.setAttribute("data-redcafe-propio", "1");
    seccion.innerHTML = skeletonAcademia();
    main.appendChild(seccion);

    /* La lista de React se oculta AHORA, no cuando llegue la respuesta: si se
       espera a la respuesta, durante toda la petición se ven a la vez el
       esqueleto propio (arriba) y la lista vieja de React (debajo) — el
       «pestañeo» reportado. Se busca por <section> y no por hijo directo de
       <main>: React envuelve toda la página en un único <div>, así que mirar
       solo main.children ocultaba ESE div entero, título y subtítulo del
       encabezado incluidos, no solo la lista.
       Si la petición falla, se restaura (ver más abajo): mejor la lista vieja
       que una página sin encabezado ni cursos. */
    var ocultados = [];
    Array.prototype.forEach.call(main.querySelectorAll("section"), function (sec) {
      if (sec === seccion) return;
      if (sec.getAttribute("data-redcafe-propio") === "1") return;
      if (!sec.querySelector('a[href^="/academia/"]')) return;   // solo la lista
      sec.setAttribute("data-redcafe-oculto-react", "1");
      sec.style.display = "none";
      ocultados.push(sec);
    });

    json("/api/cursos.php?action=list").then(function (res) {
      if (!res || !res.ok || !res.data) {
        seccion.remove();
        ocultados.forEach(function (sec) {
          sec.removeAttribute("data-redcafe-oculto-react");
          sec.style.display = "";
        });
        return;
      }
      var cursos = res.data.cursos || [];
      marcarCursosDelSitio(cursos);
      var conContenido = cursos.filter(function (c) { return c.listo; });
      if (!conContenido.length) {
        seccion.remove();
        ocultados.forEach(function (sec) {
          sec.removeAttribute("data-redcafe-oculto-react");
          sec.style.display = "";
        });
        return;
      }

      /* Los mas recientes primero. Si el curso trae fecha se usa; si no, el
         orden del archivo, donde cada curso nuevo se anade al final. */
      conContenido = conContenido.slice().sort(function (a, b) {
        var fa = Date.parse(a.creado || a.actualizado || "") || 0;
        var fb = Date.parse(b.creado || b.actualizado || "") || 0;
        if (fa !== fb) return fb - fa;
        return cursos.indexOf(b) - cursos.indexOf(a);
      });

      seccion.innerHTML =
        '<div class="redcafe-pub-wrap">' +
          '<p class="redcafe-pub-rotulo">Cursos disponibles</p>' +
          '<h2 class="redcafe-pub-titulo">Formación abierta a todos los perfiles</h2>' +
          '<p class="redcafe-pub-intro">' +
            (res.data.autenticado
              ? "Marca cada lección al terminarla: tu avance queda guardado en tu perfil."
              : "Crea tu perfil gratis para matricularte y guardar tu avance mientras avanzas por los cursos.") +
          '</p>' +
          '<div class="redcafe-cursos-grid">' +
            conContenido.map(function (c) {
              return '' +
                '<a class="redcafe-curso-card" href="/academia/' + esc(c.id) + '/">' +
                '<img class="redcafe-curso-card-portada" src="' + esc(portadaDe(c)) + '" alt="" ' +
                  'loading="lazy" decoding="async" onerror="this.remove()">' +
                '<span class="redcafe-curso-portada-sello">' + esc(selloPortada(c)) + '</span>' +
                '<p class="redcafe-curso-card-rot">' + esc(c.nivel) + (c.duracion ? ' · ' + esc(c.duracion) : '') +
                  '<span class="redcafe-curso-etiqueta">Contenido disponible</span>' +
                  '<span class="redcafe-curso-costo ' + claseCosto(c) + '">' + esc(precioDe(c)) + '</span></p>' +
                '<h3>' + esc(c.titulo) + '</h3>' +
          (GANCHOS[String(c.id || "")]
            ? '<p class="redcafe-curso-card-gancho">' + esc(GANCHOS[String(c.id)]) + '</p>'
            : '') +
                '<p class="redcafe-curso-card-desc">' + esc(c.descripcion || "") + '</p>' +
                '<p class="redcafe-curso-card-meta">' + num(c.modulos) + ' módulos · ' + num(c.lecciones) + ' lecciones' +
                  (c.autor_id ? ' · por ' + esc(c.autor) : '') + selloVerificado(c) + '</p>' +
                (c.completadas > 0
                  ? '<div class="redcafe-avance-barra mini"><span style="width:' + porcentaje(c.avance) + '%"></span></div>' +
                    '<p class="redcafe-curso-card-avance">' + porcentaje(c.avance) + ' % completado</p>'
                  : '') +
              '</a>';
            }).join("") +
          '</div>' +
        '</div>';
      // La lista de React ya quedó oculta antes de esta petición (ver arriba).
    });
  }

  /* ── Editor de cursos en el panel ────────────────────────────────── */

  function campoTexto(label, clave, valor, tipo) {
    if (tipo === "textarea") {
      return '<label class="redcafe-pub-label"><span>' + esc(label) + '</span>' +
        '<textarea rows="3" class="redcafe-pub-input" data-curso="' + clave + '">' + esc(valor) + '</textarea></label>';
    }
    return '<label class="redcafe-pub-label"><span>' + esc(label) + '</span>' +
      '<input type="text" class="redcafe-pub-input" data-curso="' + clave + '" value="' + esc(valor) + '"></label>';
  }

  function campoSelect(label, clave, valor, opciones) {
    return '<label class="redcafe-pub-label"><span>' + esc(label) + '</span><select class="redcafe-pub-input" data-curso="' + clave + '">' +
      opciones.map(function (o) {
        return '<option value="' + esc(o) + '"' + (String(valor) === o ? " selected" : "") + '>' + esc(o) + '</option>';
      }).join("") + '</select></label>';
  }

  // ── Editor de bloques ────────────────────────────────────────────
  var BLOQUE_TIPOS = [
    ["texto",     "Texto"],
    ["imagen",    "Imagen"],
    ["tabla",     "Tabla técnica"],
    ["enlace",    "Enlace a documento"],
    ["video",     "Vídeo (YouTube / Vimeo)"],
    ["documento", "Documento incrustado (Drive / OneDrive)"],
    ["codigo",    "Fragmento de código"]
  ];

  function tablaEditorTexto(b) {
    var columnas = Array.isArray(b.columnas) ? b.columnas : [];
    var filas = Array.isArray(b.filas) ? b.filas : [];
    if (!columnas.length && b.tabla) return String(b.tabla);
    if (!columnas.length) return "";
    return [columnas.join(" | ")].concat(filas.map(function (fila) {
      return (Array.isArray(fila) ? fila : []).join(" | ");
    })).join("\n");
  }

  function parsearTablaEditor(texto) {
    var lineas = String(texto || "").split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (lineas.length < 2) return null;
    var columnas = lineas[0].split("|").map(function (c) { return c.trim(); }).filter(Boolean).slice(0, 6);
    if (!columnas.length) return null;
    var filas = lineas.slice(1, 17).map(function (linea) {
      var celdas = linea.split("|").map(function (c) { return c.trim(); }).slice(0, columnas.length);
      while (celdas.length < columnas.length) celdas.push("");
      return celdas;
    }).filter(function (fila) {
      return fila.some(function (c) { return c !== ""; });
    });
    if (!filas.length) return null;
    return { columnas: columnas, filas: filas };
  }

  function bloqueEditorHtml(b) {
    b = b || { tipo: "texto" };
    var opciones = BLOQUE_TIPOS.map(function (t) {
      return '<option value="' + t[0] + '"' + (b.tipo === t[0] ? " selected" : "") + '>' + esc(t[1]) + '</option>';
    }).join("");

    return '<div class="redcafe-ed-bloque" data-tipo="' + esc(b.tipo) + '">' +
      '<div class="redcafe-ed-bloque-cab">' +
        '<select class="redcafe-pub-input redcafe-ed-bloque-tipo">' + opciones + '</select>' +
        '<input type="text" class="redcafe-pub-input" data-bloque="titulo" placeholder="Título del bloque (opcional)" value="' + esc(b.titulo || "") + '">' +
        '<button type="button" class="redcafe-ed-quitar" data-quitar="bloque">Quitar</button>' +
      '</div>' +
      '<div class="redcafe-ed-bloque-campos">' +
        '<textarea rows="4" class="redcafe-pub-input campo-texto" data-bloque="texto" placeholder="Escribe el texto de este bloque">' + esc(b.texto || "") + '</textarea>' +
        '<div class="campo-url">' +
          '<input type="text" class="redcafe-pub-input" data-bloque="url" placeholder="Pega la dirección o el código de inserción" value="' + esc(b.url || "") + '">' +
          '<em class="redcafe-pub-ayuda">Admite YouTube, Vimeo, Google Drive, OneDrive y Dropbox. También puedes pegar el &lt;iframe&gt; completo: se extrae la dirección.</em>' +
          '<input type="file" class="redcafe-ed-imagen-archivo" accept=".jpg,.jpeg,.png,.webp">' +
          '<button type="button" class="redcafe-ed-subir-imagen">Subir imagen</button>' +
          '<span class="redcafe-pub-estado redcafe-ed-imagen-estado" role="status" aria-live="polite"></span>' +
        '</div>' +
        '<input type="text" class="redcafe-pub-input campo-desc" data-bloque="descripcion" placeholder="Descripción o pie (opcional)" value="' + esc(b.descripcion || b.pie || "") + '">' +
        '<input type="text" class="redcafe-pub-input campo-alt" data-bloque="alt" placeholder="Texto alternativo de la imagen" value="' + esc(b.alt || "") + '">' +
        '<textarea rows="5" class="redcafe-pub-input campo-tabla" data-bloque="tabla" placeholder="Encabezados separados por | en la primera línea. Una fila por línea.">' + esc(tablaEditorTexto(b)) + '</textarea>' +
        '<textarea rows="4" class="redcafe-pub-input campo-codigo" data-bloque="codigo" placeholder="Pega aquí el código">' + esc(b.codigo || "") + '</textarea>' +
      '</div>' +
    '</div>';
  }

  function leerBloques(lec) {
    return Array.prototype.slice.call(lec.querySelectorAll(".redcafe-ed-bloque")).map(function (el) {
      var b = { tipo: el.querySelector(".redcafe-ed-bloque-tipo").value };
      Array.prototype.slice.call(el.querySelectorAll("[data-bloque]")).forEach(function (campo) {
        var v = campo.value;
        if (String(v).trim() !== "") b[campo.getAttribute("data-bloque")] = v;
      });
      if (b.tipo === "tabla") {
        var tabla = parsearTablaEditor(b.tabla || "");
        delete b.tabla;
        delete b.texto;
        delete b.url;
        delete b.alt;
        delete b.codigo;
        if (tabla) {
          b.columnas = tabla.columnas;
          b.filas = tabla.filas;
        }
      }
      if (b.tipo === "imagen" && b.descripcion) { b.pie = b.descripcion; delete b.descripcion; }
      return b;
    }).filter(function (b) {
      return b.texto || b.url || b.codigo;
    });
  }

  function subirImagenBloque(bloque) {
    var input = bloque.querySelector(".redcafe-ed-imagen-archivo");
    var estado = bloque.querySelector(".redcafe-ed-imagen-estado");
    var url = bloque.querySelector('[data-bloque="url"]');
    if (!input.files || !input.files[0]) {
      estado.textContent = "Elige una imagen primero.";
      estado.className = "redcafe-pub-estado redcafe-ed-imagen-estado is-error";
      return;
    }
    var fd = new FormData();
    fd.append("archivo", input.files[0]);
    fd.append("context", "curso");
    estado.textContent = "Subiendo…";
    estado.className = "redcafe-pub-estado redcafe-ed-imagen-estado";
    fetch("/api/uploads.php?action=image", { method: "POST", credentials: "include", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok && res.data && res.data.url) {
          url.value = res.data.url;
          estado.textContent = "Imagen subida.";
          estado.className = "redcafe-pub-estado redcafe-ed-imagen-estado is-ok";
        } else {
          estado.textContent = (res && res.error) || "No se pudo subir la imagen.";
          estado.className = "redcafe-pub-estado redcafe-ed-imagen-estado is-error";
        }
      });
  }

  function leccionEditorHtml(l, li) {
    return '<div class="redcafe-ed-leccion" data-leccion="' + li + '">' +
      '<input type="text" class="redcafe-pub-input" data-lec="titulo" placeholder="Título de la lección" value="' + esc(l.titulo || "") + '">' +
      '<textarea rows="5" class="redcafe-pub-input" data-lec="contenido" placeholder="Contenido de la lección (120-250 palabras)">' + esc(l.contenido || "") + '</textarea>' +
      '<div class="redcafe-ed-bloques">' +
        (l.bloques || []).map(bloqueEditorHtml).join("") +
      '</div>' +
      '<button type="button" class="redcafe-ed-add" data-add="bloque">+ Añadir material (imagen, vídeo, documento…)</button>' +
      '<button type="button" class="redcafe-ed-quitar" data-quitar="leccion">Quitar lección</button>' +
    '</div>';
  }

  function moduloEditorHtml(m, mi) {
    return '<div class="redcafe-ed-modulo" data-modulo="' + mi + '">' +
      '<div class="redcafe-ed-modulo-cab">' +
        '<input type="text" class="redcafe-pub-input" data-mod="titulo" placeholder="Título del módulo" value="' + esc(m.titulo || "") + '">' +
        '<input type="number" class="redcafe-pub-input redcafe-ed-min" data-mod="minutos" placeholder="min" value="' + esc(m.minutos || "") + '">' +
        '<button type="button" class="redcafe-ed-quitar" data-quitar="modulo">Quitar módulo</button>' +
      '</div>' +
      '<textarea rows="2" class="redcafe-pub-input" data-mod="resumen" placeholder="Resumen del módulo">' + esc(m.resumen || "") + '</textarea>' +
      '<div class="redcafe-ed-lecciones">' +
        (m.lecciones || []).map(leccionEditorHtml).join("") +
      '</div>' +
      '<button type="button" class="redcafe-ed-add" data-add="leccion">+ Añadir lección</button>' +
      '<textarea rows="2" class="redcafe-pub-input" data-mod="ejercicio" placeholder="Ejercicio práctico del módulo">' + esc(m.ejercicio || "") + '</textarea>' +
    '</div>';
  }

  // Quién puede tocar un curso lo decide la API: su autor, y nadie más
  // (cursos.php, curso_puede_editar). La administración los ve todos, y por
  // eso necesita saber de quién es cada uno: rotularlos «Propio» a todos, como
  // se hacía antes, invitaba a editar el curso de otro miembro creyéndolo suyo.
  var YO = "";

  function autoriaEtiqueta(c) {
    var autor = String(c.autor_id || "");
    if (!autor) return "Red Café";
    if (YO && autor === YO) return "Propio";
    return "de " + (c.autor || "otro miembro");
  }

  function cursoEditorHtml(c) {
    return '<article class="redcafe-pub-card redcafe-ed-curso" data-id="' + esc(c.id || "") + '">' +
      '<header class="redcafe-pub-head">' +
        '<h4>' + esc(c.titulo || "Curso nuevo") + '</h4>' +
        '<span class="redcafe-pub-tag">' + esc(autoriaEtiqueta(c)) + '</span>' +
      '</header>' +
      '<div class="redcafe-pub-grid">' +
        campoTexto("Título", "titulo", c.titulo || "") +
        campoSelect("Nivel", "nivel", c.nivel || "Básico", NIVELES) +
        campoSelect("Categoría", "categoria", c.categoria || "general", CATEGORIAS) +
        campoSelect("Acceso", "acceso", c.acceso || "abierto", ["abierto", "aprobacion"]) +
        campoTexto("Duración", "duracion", c.duracion || "") +
      '</div>' +
      campoTexto("Descripción", "descripcion", c.descripcion || "", "textarea") +
      campoTexto("Introducción", "introduccion", c.introduccion || "", "textarea") +
      campoTexto("Objetivos (uno por línea)", "objetivos", (c.objetivos || []).join("\n"), "textarea") +
      '<div class="redcafe-ed-modulos">' +
        '<p class="redcafe-doc-titulo">Módulos y lecciones</p>' +
        (c.modulos || []).map(moduloEditorHtml).join("") +
      '</div>' +
      '<button type="button" class="redcafe-ed-add" data-add="modulo">+ Añadir módulo</button>' +
      materialesEditorHtml(c.materiales || []) +
      campoTexto("Recursos (uno por línea)", "recursos", (c.recursos || []).join("\n"), "textarea") +
      campoTexto("Cierre", "cierre", c.cierre || "", "textarea") +
      '<div class="redcafe-pub-acciones">' +
        '<button type="button" class="redcafe-pub-guardar" data-curso-guardar="1">Guardar curso</button>' +
        (c.id ? '<button type="button" class="redcafe-ped-btn is-borrar" data-curso-borrar="1">Eliminar</button>' : '') +
        '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</article>';
  }

  /* Material de apoyo: archivos que se suben a la Red y enlaces externos —una
     inscripción a un curso presencial, un formulario, un vídeo—. El archivo se
     sube al momento y aquí solo queda la ruta que devolvió la plataforma. */
  function materialFilaHtml(m, i) {
    var esArchivo = (m.tipo || "enlace") === "archivo";
    return '<li class="redcafe-mat-fila" data-mat="' + i + '" data-mat-tipo="' + esc(m.tipo || "enlace") + '" data-mat-url="' + esc(m.url || "") + '">' +
      '<span class="redcafe-mat-icono" aria-hidden="true">' + (esArchivo ? "📄" : "🔗") + '</span>' +
      '<span class="redcafe-mat-datos">' +
        '<strong>' + esc(m.titulo || (esArchivo ? "Documento" : "Enlace")) + '</strong>' +
        (m.nota ? '<small>' + esc(m.nota) + '</small>' : '') +
        '<small class="redcafe-mat-url">' + esc(m.url || "") + '</small>' +
      '</span>' +
      '<button type="button" class="redcafe-mat-quitar" data-mat-quitar="' + i + '">Quitar</button>' +
    '</li>';
  }

  function materialesEditorHtml(materiales) {
    materiales = Array.isArray(materiales) ? materiales : [];
    return '<div class="redcafe-mat-bloque">' +
      '<p class="redcafe-doc-titulo">Material y enlaces del curso</p>' +
      '<p class="redcafe-pub-ayuda">Archivos de apoyo (PDF, JPG o PNG, hasta 5 MB) y enlaces: la inscripción de un curso presencial, un formulario, un vídeo. Los ve quien está matriculado.</p>' +
      '<ul class="redcafe-mat-lista">' +
        (materiales.length ? materiales.map(materialFilaHtml).join("")
          : '<li class="redcafe-mat-vacio">Todavía no hay material adjunto.</li>') +
      '</ul>' +
      '<div class="redcafe-mat-alta">' +
        '<input type="text" class="redcafe-mat-titulo" placeholder="Título (ej.: Inscripción al taller de Loja)" maxlength="120">' +
        '<input type="text" class="redcafe-mat-nota" placeholder="Nota corta (opcional)" maxlength="300">' +
        '<input type="url" class="redcafe-mat-enlace" placeholder="https://… (para un enlace)">' +
        '<button type="button" class="redcafe-mat-add-enlace">Añadir enlace</button>' +
        '<input type="file" class="redcafe-mat-archivo" accept=".pdf,.jpg,.jpeg,.png">' +
        '<button type="button" class="redcafe-mat-add-archivo">Subir archivo</button>' +
        '<span class="redcafe-pub-estado redcafe-mat-estado" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</div>';
  }

  function materialesDeTarjeta(card) {
    return Array.prototype.slice.call(card.querySelectorAll(".redcafe-mat-fila")).map(function (li) {
      return {
        tipo: li.getAttribute("data-mat-tipo") || "enlace",
        url: li.getAttribute("data-mat-url") || "",
        titulo: (li.querySelector("strong") || {}).textContent || "",
        nota: (li.querySelector("small:not(.redcafe-mat-url)") || {}).textContent || ""
      };
    });
  }

  function pintarMateriales(card, materiales) {
    var lista = card.querySelector(".redcafe-mat-lista");
    if (!lista) return;
    lista.innerHTML = materiales.length
      ? materiales.map(materialFilaHtml).join("")
      : '<li class="redcafe-mat-vacio">Todavía no hay material adjunto.</li>';
  }

  function anadirEnlaceMaterial(card) {
    var estado = card.querySelector(".redcafe-mat-estado");
    var url = String((card.querySelector(".redcafe-mat-enlace") || {}).value || "").trim();
    var titulo = String((card.querySelector(".redcafe-mat-titulo") || {}).value || "").trim();
    var nota = String((card.querySelector(".redcafe-mat-nota") || {}).value || "").trim();
    if (!/^https:\/\//i.test(url) && url.charAt(0) !== "/") {
      estado.textContent = "El enlace debe empezar por https://";
      estado.className = "redcafe-pub-estado redcafe-mat-estado is-error";
      return;
    }
    var lista = materialesDeTarjeta(card);
    if (lista.length >= 12) {
      estado.textContent = "Ya hay doce piezas de material; quita una antes de añadir otra.";
      estado.className = "redcafe-pub-estado redcafe-mat-estado is-error";
      return;
    }
    lista.push({ tipo: "enlace", url: url, titulo: titulo || "Enlace del curso", nota: nota });
    pintarMateriales(card, lista);
    card.querySelector(".redcafe-mat-enlace").value = "";
    card.querySelector(".redcafe-mat-titulo").value = "";
    card.querySelector(".redcafe-mat-nota").value = "";
    estado.textContent = "Enlace añadido. Guarda el curso para conservarlo.";
    estado.className = "redcafe-pub-estado redcafe-mat-estado is-ok";
  }

  function subirArchivoMaterial(card) {
    var estado = card.querySelector(".redcafe-mat-estado");
    var input = card.querySelector(".redcafe-mat-archivo");
    if (!input || !input.files || !input.files[0]) {
      estado.textContent = "Elige un archivo primero.";
      estado.className = "redcafe-pub-estado redcafe-mat-estado is-error";
      return;
    }
    var archivo = input.files[0];
    if (archivo.size > 5 * 1024 * 1024) {
      estado.textContent = "El archivo supera los 5 MB.";
      estado.className = "redcafe-pub-estado redcafe-mat-estado is-error";
      return;
    }
    var fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("tipo", "otro");
    fd.append("titulo", String((card.querySelector(".redcafe-mat-titulo") || {}).value || ""));
    estado.textContent = "Subiendo…";
    estado.className = "redcafe-pub-estado redcafe-mat-estado";
    fetch("/api/uploads.php?action=documento", { method: "POST", credentials: "include", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var doc = res && res.ok && res.data && res.data.documento;
        var url = doc && (doc.url || doc.ruta || doc.archivo);
        if (!url) {
          estado.textContent = (res && res.error) || "No se pudo subir el archivo.";
          estado.className = "redcafe-pub-estado redcafe-mat-estado is-error";
          return;
        }
        var lista = materialesDeTarjeta(card);
        lista.push({
          tipo: "archivo", url: url,
          titulo: String((card.querySelector(".redcafe-mat-titulo") || {}).value || "").trim() || archivo.name,
          nota: String((card.querySelector(".redcafe-mat-nota") || {}).value || "").trim()
        });
        pintarMateriales(card, lista);
        input.value = "";
        card.querySelector(".redcafe-mat-titulo").value = "";
        card.querySelector(".redcafe-mat-nota").value = "";
        estado.textContent = "Archivo adjuntado. Guarda el curso para conservarlo.";
        estado.className = "redcafe-pub-estado redcafe-mat-estado is-ok";
      })
      .catch(function () {
        estado.textContent = "No se pudo subir el archivo.";
        estado.className = "redcafe-pub-estado redcafe-mat-estado is-error";
      });
  }

  function leerCurso(card) {
    var datos = { id: card.getAttribute("data-id") || "", materiales: materialesDeTarjeta(card) };
    Array.prototype.slice.call(card.querySelectorAll("[data-curso]")).forEach(function (el) {
      var k = el.getAttribute("data-curso");
      if (k === "objetivos" || k === "recursos") {
        datos[k] = el.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      } else {
        datos[k] = el.value;
      }
    });
    datos.modulos = Array.prototype.slice.call(card.querySelectorAll(".redcafe-ed-modulo")).map(function (mod) {
      var m = {};
      Array.prototype.slice.call(mod.querySelectorAll("[data-mod]")).forEach(function (el) {
        var k = el.getAttribute("data-mod");
        m[k] = k === "minutos" ? Number(el.value || 0) : el.value;
      });
      m.lecciones = Array.prototype.slice.call(mod.querySelectorAll(".redcafe-ed-leccion")).map(function (lec) {
        var l = {};
        Array.prototype.slice.call(lec.querySelectorAll("[data-lec]")).forEach(function (el) {
          l[el.getAttribute("data-lec")] = el.value;
        });
        l.bloques = leerBloques(lec);
        return l;
      }).filter(function (l) {
        return (l.titulo || "").trim() || (l.contenido || "").trim() || (l.bloques && l.bloques.length);
      });
      return m;
    }).filter(function (m) { return (m.titulo || "").trim(); });
    return datos;
  }

  // ── Solicitudes de acceso ────────────────────────────────────────
  // Quien crea un curso con acceso por aprobación decide aquí quién entra.
  function solicitudHtml(s) {
    var estado = s.estado || "pendiente";
    var acciones = estado === "pendiente"
      ? '<button type="button" class="redcafe-sol-btn is-si" data-decision="aprobado">Aprobar</button>' +
        '<button type="button" class="redcafe-sol-btn is-no" data-decision="rechazado">Rechazar</button>'
      : (estado === "aprobado"
          ? '<button type="button" class="redcafe-sol-btn is-no" data-decision="rechazado">Retirar acceso</button>'
          : '<button type="button" class="redcafe-sol-btn is-si" data-decision="aprobado">Conceder acceso</button>');

    return '<article class="redcafe-sol-card" data-curso="' + esc(s.curso) + '" data-usuario="' + esc(s.usuario) + '">' +
      '<div>' +
        '<p class="redcafe-pub-tag">' + esc(s.curso_titulo || s.curso) + '</p>' +
        '<h4>' + esc(s.nombre || "Miembro") + '</h4>' +
        '<p class="redcafe-sol-meta"><strong class="es-' + esc(estado) + '">' + esc(estado) + '</strong>' +
          (s.solicitado ? ' · ' + esc(String(s.solicitado).slice(0, 10)) : '') + '</p>' +
        (s.mensaje ? '<p class="redcafe-sol-msg">“' + esc(s.mensaje) + '”</p>' : '') +
      '</div>' +
      '<div class="redcafe-sol-acciones">' + acciones +
        '<span class="redcafe-pub-estado" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</article>';
  }

  function montarSolicitudes(main) {
    json("/api/cursos.php?action=solicitudes").then(function (res) {
      if (!res || !res.ok || !res.data) return;
      var lista = res.data.solicitudes || [];
      if (!lista.length) return;   // sin cursos con aprobación, no se muestra

      var seccion = document.createElement("section");
      seccion.id = "redcafe-solicitudes-curso";
      seccion.setAttribute("data-redcafe-propio", "1");
      seccion.className = "redcafe-pub-seccion";
      seccion.innerHTML =
        '<div class="redcafe-pub-wrap">' +
          '<p class="redcafe-pub-rotulo">Academia</p>' +
          '<h3 class="redcafe-pub-titulo">Solicitudes de acceso a tus cursos</h3>' +
          '<p class="redcafe-pub-intro">' + num(res.data.pendientes) +
            ' pendiente(s) de respuesta. Solo quien apruebas ve el contenido del curso.</p>' +
          '<div id="redcafe-sol-lista">' + lista.map(solicitudHtml).join("") + '</div>' +
        '</div>';

      var cursos = document.getElementById("redcafe-mis-cursos");
      if (cursos) cursos.insertAdjacentElement("beforebegin", seccion);
      else main.appendChild(seccion);

      seccion.addEventListener("click", function (ev) {
        var b = ev.target && ev.target.closest && ev.target.closest(".redcafe-sol-btn");
        if (!b) return;
        var card = b.closest(".redcafe-sol-card");
        var estado = card.querySelector(".redcafe-pub-estado");
        var decision = b.getAttribute("data-decision");
        b.disabled = true;
        estado.textContent = "Guardando…";
        estado.className = "redcafe-pub-estado";
        json("/api/cursos.php?action=resolver_acceso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            curso: card.getAttribute("data-curso"),
            usuario: card.getAttribute("data-usuario"),
            decision: decision
          })
        }).then(function (r) {
          b.disabled = false;
          if (r && r.ok) {
            estado.textContent = decision === "aprobado" ? "Acceso concedido." : "Acceso retirado.";
            estado.className = "redcafe-pub-estado is-ok";
            var marca = card.querySelector(".redcafe-sol-meta strong");
            if (marca) { marca.textContent = decision; marca.className = "es-" + decision; }
          } else {
            estado.textContent = (r && r.error) || "No se pudo guardar.";
            estado.className = "redcafe-pub-estado is-error";
          }
        });
      });
    });
  }

  function montarEditor(usuario) {
    YO = String((usuario && usuario.id) || "");
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-mis-cursos")) return;

    json("/api/cursos.php?action=mine").then(function (res) {
      if (!res || !res.ok || !res.data) return;
      var cursos = res.data.cursos || [];
      var esAdmin = !!res.data.es_admin;
      var puedePublicar = res.data.puede_publicar !== false;

      // Un miembro que no puede publicar cursos y tampoco tiene ninguno se
      // quedaba sin ver nada, sin saber por qué. Ahora se le explica la vía.
      if (!puedePublicar && !cursos.length) {
        var aviso = document.createElement("section");
        aviso.id = "redcafe-mis-cursos";
        aviso.className = "redcafe-pub-seccion";
        aviso.setAttribute("data-redcafe-propio", "1");
        aviso.innerHTML =
          '<div class="redcafe-pub-wrap">' +
            '<p class="redcafe-pub-rotulo">Academia</p>' +
            '<h3 class="redcafe-pub-titulo">¿Quieres publicar un curso?</h3>' +
            '<p class="redcafe-pub-intro">Publicar cursos es cosa del perfil ' +
            '<strong>Asesor Experto</strong>. Si enseñas lo que sabes —catación, ' +
            'beneficio, tueste, manejo del cafetal— puedes añadir ese perfil desde ' +
            'tu cuenta sin perder el que ya tienes: cada miembro puede tener hasta ' +
            'tres. Mientras tanto puedes matricularte en cualquier curso y llevar ' +
            'tu avance.</p>' +
            '<a class="redcafe-pub-guardar" href="/afiliate/">Añadir el perfil de Asesor</a>' +
          '</div>';
        var recursos0 = document.getElementById("redcafe-panel-resources");
        if (recursos0 && recursos0.parentNode === main) main.insertBefore(aviso, recursos0);
        else main.appendChild(aviso);
        return;
      }

      var seccion = document.createElement("section");
      seccion.id = "redcafe-mis-cursos";
      seccion.className = "redcafe-pub-seccion";
      seccion.setAttribute("data-redcafe-propio", "1");
      seccion.innerHTML =
        '<div class="redcafe-pub-wrap">' +
          '<p class="redcafe-pub-rotulo">Academia</p>' +
          '<h3 class="redcafe-pub-titulo">' + (esAdmin ? "Cursos de la Academia" : "Mis cursos") + '</h3>' +
          '<p class="redcafe-pub-intro">' +
            (esAdmin
              ? "Como administración puedes crear y editar cualquier curso de la Academia."
              : "Publica y edita tus propios cursos. Cada módulo agrupa lecciones y un ejercicio práctico.") +
          '</p>' +
          '<button type="button" class="redcafe-doc-subir" id="redcafe-curso-nuevo">+ Crear curso</button>' +
          '<div id="redcafe-cursos-lista">' + cursos.map(cursoEditorHtml).join("") + '</div>' +
        '</div>';
      main.appendChild(seccion);
      montarSolicitudes(main);

      var lista = seccion.querySelector("#redcafe-cursos-lista");

      seccion.querySelector("#redcafe-curso-nuevo").addEventListener("click", function () {
        var vacio = document.createElement("div");
        vacio.innerHTML = cursoEditorHtml({ modulos: [{ titulo: "", minutos: 30, lecciones: [{}] }] });
        lista.insertBefore(vacio.firstChild, lista.firstChild);
      });

      // Cada tipo de bloque muestra solo los campos que le sirven.
      lista.addEventListener("change", function (ev) {
        var sel = ev.target;
        if (!sel || !sel.classList || !sel.classList.contains("redcafe-ed-bloque-tipo")) return;
        sel.closest(".redcafe-ed-bloque").setAttribute("data-tipo", sel.value);
      });

      lista.addEventListener("click", function (ev) {
        var t = ev.target;
        if (!t || !t.closest) return;

        var add = t.closest("[data-add]");
        if (add) {
          var tipo = add.getAttribute("data-add");
          if (tipo === "bloque") {
            var cb = add.previousElementSibling;
            var eb = document.createElement("div");
            eb.innerHTML = bloqueEditorHtml({ tipo: "texto" });
            cb.appendChild(eb.firstChild);
            return;
          }
          if (tipo === "modulo") {
            var cont = add.previousElementSibling;
            var envoltorio = document.createElement("div");
            envoltorio.innerHTML = moduloEditorHtml({ titulo: "", minutos: 30, lecciones: [{}] }, cont.children.length);
            cont.appendChild(envoltorio.firstChild);
          } else {
            var conte = add.previousElementSibling;
            var env = document.createElement("div");
            env.innerHTML = leccionEditorHtml({}, conte.children.length);
            conte.appendChild(env.firstChild);
          }
          return;
        }

        var subir = t.closest(".redcafe-ed-subir-imagen");
        if (subir) { subirImagenBloque(subir.closest(".redcafe-ed-bloque")); return; }

        // Material y enlaces del curso
        var addEnlace = t.closest(".redcafe-mat-add-enlace");
        if (addEnlace) { anadirEnlaceMaterial(addEnlace.closest(".redcafe-ed-curso")); return; }
        var addArchivo = t.closest(".redcafe-mat-add-archivo");
        if (addArchivo) { subirArchivoMaterial(addArchivo.closest(".redcafe-ed-curso")); return; }
        var quitarMat = t.closest("[data-mat-quitar]");
        if (quitarMat) {
          var cardM = quitarMat.closest(".redcafe-ed-curso");
          var lista = materialesDeTarjeta(cardM);
          lista.splice(Number(quitarMat.getAttribute("data-mat-quitar")), 1);
          pintarMateriales(cardM, lista);
          return;
        }

        var quitar = t.closest("[data-quitar]");
        if (quitar) {
          var q = quitar.getAttribute("data-quitar");
          var sel = q === "modulo" ? ".redcafe-ed-modulo" : (q === "bloque" ? ".redcafe-ed-bloque" : ".redcafe-ed-leccion");
          var nodo = quitar.closest(sel);
          if (nodo) nodo.remove();
          return;
        }

        var guardar = t.closest("[data-curso-guardar]");
        if (guardar) {
          var card = guardar.closest(".redcafe-ed-curso");
          var estado = card.querySelector(".redcafe-pub-estado");
          var datos = leerCurso(card);
          if (!String(datos.titulo || "").trim()) {
            estado.textContent = "El curso necesita un título.";
            estado.className = "redcafe-pub-estado is-error";
            return;
          }
          var accion = datos.id ? "update" : "publish";
          guardar.disabled = true;
          estado.textContent = "Guardando…";
          estado.className = "redcafe-pub-estado";
          json("/api/cursos.php?action=" + accion, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
          }).then(function (r) {
            guardar.disabled = false;
            if (r && r.ok) {
              if (!datos.id && r.data && r.data.curso) card.setAttribute("data-id", r.data.curso.id);
              estado.textContent = "Curso guardado.";
              estado.className = "redcafe-pub-estado is-ok";
            } else {
              estado.textContent = (r && r.error) || "No se pudo guardar el curso.";
              estado.className = "redcafe-pub-estado is-error";
            }
          });
          return;
        }

        var borrar = t.closest("[data-curso-borrar]");
        if (borrar) {
          var tarjeta = borrar.closest(".redcafe-ed-curso");
          var cid = tarjeta.getAttribute("data-id");
          if (!cid || !window.confirm("¿Eliminar el curso definitivamente?")) return;
          json("/api/cursos.php?action=delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: cid })
          }).then(function (r) {
            if (r && r.ok) tarjeta.remove();
          });
        }
      });
    });
  }

  /* ── Mis cursos matriculados (vista de estudiante) ──────────────────
     `montarEditor()`, más arriba, también se llama "Mis cursos" pero es el
     panel del AUTOR (crear/editar cursos propios) — llamaba a
     `action=mine`, que solo devuelve cursos que la persona escribió. Quien
     se matricula en un curso ajeno nunca aparecía ahí, así que un miembro
     que solo estudia (sin publicar) no tenía dónde ver sus matrículas ni su
     avance. Esto es una sección aparte, con `action=matriculas` (cursos
     donde hay inscripción real), independiente de si la persona puede
     publicar o no. */
  function matriculaCardHtml(curso) {
    var pct = Math.max(0, Math.min(100, Number(curso.avance || 0)));
    var estadoTexto = curso.mi_solicitud === "pendiente"
      ? "Solicitud pendiente de aprobación"
      : (pct >= 100 ? "Curso completado" : pct + "% completado");
    return '<a class="redcafe-curso-card" href="/academia/' + esc(curso.id || "") + '/">' +
      '<div class="redcafe-curso-card-rot">' + esc(curso.categoria || "Academia") + ' · ' + esc(curso.nivel || "") + '</div>' +
      '<p class="redcafe-pub-titulo" style="margin-top:.3rem">' + esc(curso.titulo || "Curso") + '</p>' +
      '<div class="redcafe-avance mini">' +
        '<div class="redcafe-avance-barra mini"><span style="width:' + pct + '%"></span></div>' +
        '<p class="redcafe-avance-texto">' + esc(estadoTexto) + '</p>' +
      '</div>' +
    '</a>';
  }

  function montarMisMatriculas(main) {
    if (!main || document.getElementById("redcafe-mis-matriculas")) return;
    json("/api/cursos.php?action=matriculas").then(function (res) {
      if (!res || !res.ok || !res.data) return;
      var cursos = res.data.cursos || [];
      if (!cursos.length) return;   // sin matrículas: no hay nada que mostrar aquí.

      var seccion = document.createElement("section");
      seccion.id = "redcafe-mis-matriculas";
      seccion.className = "redcafe-pub-seccion";
      seccion.setAttribute("data-redcafe-propio", "1");
      seccion.innerHTML =
        '<div class="redcafe-pub-wrap">' +
          '<p class="redcafe-pub-rotulo">Academia</p>' +
          '<h3 class="redcafe-pub-titulo">Mis cursos</h3>' +
          '<p class="redcafe-pub-intro">Los cursos en los que estás matriculado, con tu avance.</p>' +
          '<div class="redcafe-cursos-grid">' + cursos.map(matriculaCardHtml).join("") + '</div>' +
        '</div>';

      // Antes que el panel del autor (si existe), para que un estudiante que
      // también publica vea primero lo que está cursando.
      var editor = document.getElementById("redcafe-mis-cursos");
      if (editor && editor.parentNode === main) main.insertBefore(seccion, editor);
      else main.appendChild(seccion);
    });
  }

  /* ── Arranque ────────────────────────────────────────────────────── */

  function iniciar() {
    if (enAcademia()) { montarVisor(); montarListado(); return; }
    if (!enPanel()) return;
    json("/api/auth.php?action=me").then(function (res) {
      var u = res && res.ok && res.data && res.data.user;
      if (!u || !u.id) return;
      var main = document.querySelector("main");
      montarMisMatriculas(main);
      montarEditor(u);
    });
  }

  if (document.readyState !== "loading") setTimeout(iniciar, 120);
  else document.addEventListener("DOMContentLoaded", function () { setTimeout(iniciar, 120); }, { once: true });
  // El visor del curso se quedaba pegado al navegar a otra página: ahora lo
  // retira redcafe-ruta.js y aquí se vuelve a montar donde corresponde.
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 300); });
})();
