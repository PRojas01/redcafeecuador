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

  function enlazarDerechos(root) {
    root.querySelectorAll('.redcafe-derechos input').forEach(function (input) {
      if (input.derechosEnlazados) return;
      input.derechosEnlazados = true;
      var scope = input.parentElement.parentElement;
      var botones = scope.querySelectorAll('[data-derechos-enviar]');
      input.addEventListener('change', function () {
        botones.forEach(function (b) { b.disabled = !input.checked; });
      });
    });
  }
  function enAcademia() { return location.pathname.indexOf("/academia") === 0; }
  function enPanel() { return location.pathname.indexOf("/panel") === 0; }

  var NIVELES = ["Básico", "Intermedio", "Avanzado"];
  var CATEGORIAS = ["produccion", "postcosecha", "calidad", "comercial", "administrativo", "barismo", "legal", "general"];

  // Sello de verificación de la Academia. Dice quién revisó el curso y cuándo:
  // un curso «verificado» sin autor ni fecha no lo puede comprobar nadie.

  // Los números que llegan de la API se pintan como números. Van dentro de
  // atributos style y de texto: si algún día uno llegara con otra cosa dentro,
  // aquí no entra. No es paranoia gratuita, es el mismo cuidado que esc().
  function num(v) {
    var n = Number(v);
    return isFinite(n) ? String(n) : "0";
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




  /* ── Visor del curso ─────────────────────────────────────────────── */



  // ── Bloques de contenido ─────────────────────────────────────────
  // El texto plano de una lección puede venir acompañado de imágenes,
  // documentos en la nube, vídeos incrustados o fragmentos de código.
  // La API ya validó cada URL: aquí solo se pinta.
  // Un bloque puede traer una lista de pasos, una línea por paso. Antes todo
  // se metía en un solo <p> y los saltos simples los colapsaba el navegador:
  // los pasos salían encadenados en un párrafo ilegible.





  // Cuando el curso exige aprobación y aún no la tienes, se ve el temario
  // pero no el contenido. Aquí se explica y se ofrece solicitarlo.
  // Dos puertas distintas y hay que explicarlas distinto: matricularse
  // depende del alumno; la aprobación, del autor del curso.

  /* Material del curso para quien lo estudia: archivos para descargar y
     enlaces (una inscripción presencial, un formulario, un vídeo). Si el curso
     trae material pero la persona todavía no se matriculó, se le dice cuánto
     hay, sin entregarlo. */


  /* Advertencia obligatoria. El curso orienta; quien decide y responde por el
     resultado en su finca o su negocio es el miembro. Va al final, después del
     contenido, para que se lea con lo aprendido fresco y no estorbe al entrar. */


  // `rehacer` fuerza a volver a pedir el curso: se usa tras matricularse,
  // para que el contenido aparezca sin recargar la página.

  /* ── Listado de la academia con avance ───────────────────────────── */

  // La página de la Academia lista los 9 cursos, pero solo algunos tienen las
  // lecciones desarrolladas. Se marca cuáles se pueden cursar ya y cuáles
  // están en preparación, para no hacer entrar a nadie a un curso vacío.

  /* Las portadas por categoría que ya vienen en el paquete. La lista de React
     solo usaba tres de ellas y las repetía; aquí se cubren todas las categorías
     que acepta la API, y si aparece una nueva se cae a una genérica en vez de
     dejar el hueco. */

  /* Portadas hechas para un curso concreto. Los cursos de Legacy llevan su
     propia imagen de marca; sin esto caian en la portada generica de barismo
     y las tres se veian iguales. */


  /* El gancho de cada curso: la frase corta que React mostraba en el indice y
     que la fusion se llevo. Las descripciones de `data/cursos.json` explican el
     temario; estas dicen para que sirve. Rescatadas del paquete 20260924c. */





  /* Etiqueta de costo. Los 3 cursos de Legacy son de pago (su valor esta en su
     descripcion, dictado por el aliado); los propios de Red Cafe son gratis.
     Un solo punto de verdad para no repetir el numero por el sitio. */




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
          '<label class="redcafe-derechos"><input type="checkbox" name="acepta_derechos" required> Declaro que tengo los derechos sobre este contenido y asumo la responsabilidad ante cualquier reclamo de terceros.</label>' +
          '<button disabled data-derechos-enviar type="button" class="redcafe-ed-subir-imagen">Subir imagen</button>' +
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
    if (!bloque.querySelector('[name="acepta_derechos"]').checked) return;
    var input = bloque.querySelector(".redcafe-ed-imagen-archivo");
    var estado = bloque.querySelector(".redcafe-ed-imagen-estado");
    var url = bloque.querySelector('[data-bloque="url"]');
    if (!input.files || !input.files[0]) {
      estado.textContent = "Elige una imagen primero.";
      estado.className = "redcafe-pub-estado redcafe-ed-imagen-estado is-error";
      return;
    }
    var fd = new FormData();
    fd.append("acepta_derechos", "true");
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
        '<label class="redcafe-derechos"><input type="checkbox" name="acepta_derechos" required> Declaro que tengo los derechos sobre este contenido y asumo la responsabilidad ante cualquier reclamo de terceros.</label>' +
        '<button disabled data-derechos-enviar type="button" class="redcafe-pub-guardar" data-curso-guardar="1">Guardar curso</button>' +
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
        '<label class="redcafe-derechos"><input type="checkbox" name="acepta_derechos" required> Declaro que tengo los derechos sobre este contenido y asumo la responsabilidad ante cualquier reclamo de terceros.</label>' +
        '<button disabled data-derechos-enviar type="button" class="redcafe-mat-add-archivo">Subir archivo</button>' +
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
    if (!card.querySelector('.redcafe-mat-alta [name="acepta_derechos"]').checked) return;
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
    fd.append("acepta_derechos", "true");
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
            enlazarDerechos(vacio);
        lista.insertBefore(vacio.firstChild, lista.firstChild);
      });

      // Cada tipo de bloque muestra solo los campos que le sirven.
      lista.addEventListener("change", function (ev) {
        var sel = ev.target;
        if (!sel || !sel.classList || !sel.classList.contains("redcafe-ed-bloque-tipo")) return;
        sel.closest(".redcafe-ed-bloque").setAttribute("data-tipo", sel.value);
      });

      enlazarDerechos(lista);
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
            enlazarDerechos(cb);
            return;
          }
          if (tipo === "modulo") {
            var cont = add.previousElementSibling;
            var envoltorio = document.createElement("div");
            envoltorio.innerHTML = moduloEditorHtml({ titulo: "", minutos: 30, lecciones: [{}] }, cont.children.length);
            cont.appendChild(envoltorio.firstChild);
            enlazarDerechos(cont);
          } else {
            var conte = add.previousElementSibling;
            var env = document.createElement("div");
            env.innerHTML = leccionEditorHtml({}, conte.children.length);
            conte.appendChild(env.firstChild);
            enlazarDerechos(conte);
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
          if (!guardar.parentElement.querySelector('[name="acepta_derechos"]').checked) return;
          var datos = leerCurso(card);
          datos.acepta_derechos = true;
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
            guardar.disabled = !guardar.parentElement.querySelector('[name="acepta_derechos"]').checked;
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
    // La Academia (lista y ficha del curso) ya es de React.
    if (enAcademia()) return;
    if (!enPanel()) return;
    json("/api/auth.php?action=me").then(function (res) {
      var u = res && res.ok && res.data && res.data.user;
      if (!u || !u.id) return;
      var main = document.querySelector("main");
      montarMisMatriculas(main);
      montarEditor(u);
    });
  }

  /* No tocar el DOM antes de que React hidrate: si se añade algo a <main>
     antes, React lanza el error #418, tira todo el HTML y lo vuelve a pintar
     (el parpadeo de toda la página que se veía en /academia/). */
  function trasReact() {
    var k = 0;
    (function esperar() {
      var listo = window.__redcafeReactListo && window.__redcafeReactListo();
      if (!listo && ++k < 80) { setTimeout(esperar, 100); return; }
      iniciar();
    })();
  }
  if (document.readyState !== "loading") trasReact();
  else document.addEventListener("DOMContentLoaded", trasReact, { once: true });
  // El visor del curso se quedaba pegado al navegar a otra página: ahora lo
  // retira redcafe-ruta.js y aquí se vuelve a montar donde corresponde.
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 300); });
})();
