/* Red Café Ecuador — guías paso a paso en el panel del miembro
   ------------------------------------------------------------------
   Pinta las dos guías (finca y negocio) que define redcafe-guias-contenido.js,
   guarda el avance y las notas con api/guias.php y recoge las bitácoras de
   cosecha, fermentación, secado y costos. Al final, arma una ficha imprimible
   con lo que el productor puede enseñar a un comprador o llevar al banco.

   Todo lo que se pinta es nodo propio: nunca se toca el árbol de React.
*/
(function () {
  "use strict";

  if (window.__redcafeGuias) return;
  window.__redcafeGuias = true;

  var REGISTROS = {
    cosecha: {
      titulo: "Anota la cosecha del día",
      campos: [
        { k: "fecha", etiqueta: "Fecha", tipo: "date" },
        { k: "lote", etiqueta: "Lote", tipo: "text", ph: "Ej. Lote alto" },
        { k: "kg_cereza", etiqueta: "Kilos de cereza", tipo: "number" },
        { k: "jornales", etiqueta: "Jornales", tipo: "number" },
        { k: "observacion", etiqueta: "Observación", tipo: "text" }
      ],
      resumen: function (f) {
        return [f.fecha, f.lote, f.kg_cereza ? f.kg_cereza + " kg" : "", f.jornales ? f.jornales + " jornales" : ""]
          .filter(Boolean).join(" · ");
      }
    },
    fermentacion: {
      titulo: "Anota la fermentación",
      campos: [
        { k: "fecha", etiqueta: "Fecha", tipo: "date" },
        { k: "lote", etiqueta: "Lote", tipo: "text" },
        { k: "hora_inicio", etiqueta: "Hora de inicio", tipo: "time" },
        { k: "hora_fin", etiqueta: "Hora de fin", tipo: "time" },
        { k: "temperatura", etiqueta: "Temperatura (°C)", tipo: "number" },
        { k: "observacion", etiqueta: "Observación", tipo: "text" }
      ],
      resumen: function (f) {
        var horas = f.hora_inicio ? (f.hora_inicio + (f.hora_fin ? " a " + f.hora_fin : " · sin cerrar")) : "";
        return [f.fecha, f.lote, horas, f.temperatura ? f.temperatura + " °C" : ""].filter(Boolean).join(" · ");
      }
    },
    secado: {
      titulo: "Anota el secado",
      campos: [
        { k: "fecha", etiqueta: "Fecha", tipo: "date" },
        { k: "lote", etiqueta: "Lote", tipo: "text" },
        { k: "humedad_pct", etiqueta: "Humedad (%)", tipo: "number" },
        { k: "dia", etiqueta: "Día de secado", tipo: "number" },
        { k: "observacion", etiqueta: "Observación", tipo: "text" }
      ],
      resumen: function (f) {
        return [f.fecha, f.lote, f.humedad_pct !== null && f.humedad_pct !== undefined ? f.humedad_pct + " %" : "",
                f.dia ? "día " + f.dia : ""].filter(Boolean).join(" · ");
      }
    },
    costos: {
      titulo: "Anota un costo",
      campos: [
        { k: "fecha", etiqueta: "Fecha", tipo: "date" },
        { k: "concepto", etiqueta: "Concepto", tipo: "text", ph: "Jornales, abono, flete…" },
        { k: "monto", etiqueta: "Monto (USD)", tipo: "number" },
        { k: "quintales", etiqueta: "Quintales del lote", tipo: "number" },
        { k: "observacion", etiqueta: "Observación", tipo: "text" }
      ],
      resumen: function (f) {
        return [f.fecha, f.concepto, f.monto ? "$ " + f.monto : "", f.quintales ? f.quintales + " qq" : ""]
          .filter(Boolean).join(" · ");
      }
    }
  };

  var estado = { avance: {}, registros: {}, guia: "finca", montado: false };
  var intentos = 0;

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function json(url, opciones) {
    return fetch(url, Object.assign({ credentials: "include", cache: "no-store" }, opciones || {}))
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false }; });
  }

  function post(accion, cuerpo) {
    return json("/api/guias.php?action=" + accion, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo || {})
    });
  }

  function guiaPorId(id) {
    var todas = (window.REDCAFE_GUIAS && window.REDCAFE_GUIAS.guias) || [];
    for (var i = 0; i < todas.length; i++) if (todas[i].id === id) return todas[i];
    return null;
  }

  function estadoPaso(guiaId, pasoId) {
    var g = estado.avance[guiaId] || {};
    return g[pasoId] || { hecho: false, nota: "" };
  }

  function avanceEtapa(guiaId, etapa) {
    var hechos = etapa.pasos.filter(function (p) { return estadoPaso(guiaId, p.id).hecho; }).length;
    return { hechos: hechos, total: etapa.pasos.length,
             pct: etapa.pasos.length ? Math.round(hechos * 100 / etapa.pasos.length) : 0 };
  }

  function avanceGuia(guia) {
    var total = 0, hechos = 0;
    guia.etapas.forEach(function (e) {
      total += e.pasos.length;
      hechos += e.pasos.filter(function (p) { return estadoPaso(guia.id, p.id).hecho; }).length;
    });
    return { hechos: hechos, total: total, pct: total ? Math.round(hechos * 100 / total) : 0 };
  }

  function barra(pct) {
    return '<span class="redcafe-guia-barra" aria-hidden="true"><span style="width:' + pct + '%"></span></span>';
  }

  function filaRegistroHtml(tipo, f) {
    var def = REGISTROS[tipo];
    return '<li><span>' + esc(def.resumen(f)) + '</span>' +
      '<button type="button" class="redcafe-guia-borrar" data-tipo="' + esc(tipo) + '" data-id="' + esc(f.id) + '">Borrar</button></li>';
  }

  function registroHtml(tipo) {
    var def = REGISTROS[tipo];
    if (!def) return "";
    var filas = (estado.registros[tipo] || []).slice(0, 3);
    var hoy = new Date().toISOString().slice(0, 10);
    return '<div class="redcafe-guia-registro" data-registro="' + esc(tipo) + '">' +
      '<p class="redcafe-guia-registro-titulo">' + esc(def.titulo) + '</p>' +
      '<div class="redcafe-guia-registro-campos">' +
        def.campos.map(function (c) {
          var valor = c.tipo === "date" ? ' value="' + hoy + '"' : '';
          return '<label><span>' + esc(c.etiqueta) + '</span>' +
            '<input type="' + c.tipo + '" data-campo="' + esc(c.k) + '"' + valor +
            (c.ph ? ' placeholder="' + esc(c.ph) + '"' : '') + '></label>';
        }).join("") +
      '</div>' +
      '<div class="redcafe-guia-registro-acciones">' +
        '<button type="button" class="redcafe-guia-guardar-registro">Guardar</button>' +
        '<span class="redcafe-guia-registro-estado" role="status" aria-live="polite"></span>' +
      '</div>' +
      '<ul class="redcafe-guia-registro-lista">' +
        (filas.length ? filas.map(function (f) { return filaRegistroHtml(tipo, f); }).join("")
                      : '<li class="redcafe-guia-vacio">Todavía no has anotado nada aquí.</li>') +
      '</ul>' +
    '</div>';
  }

  function pasoHtml(guiaId, paso) {
    var st = estadoPaso(guiaId, paso.id);
    return '<li class="redcafe-guia-paso' + (st.hecho ? " es-hecho" : "") + '" data-paso="' + esc(paso.id) + '">' +
      '<label class="redcafe-guia-check">' +
        '<input type="checkbox" data-hecho' + (st.hecho ? " checked" : "") + '>' +
        '<span>' + esc(paso.titulo) + '</span>' +
      '</label>' +
      (paso.revisar ? '<span class="redcafe-guia-revisar">Pendiente de revisión técnica</span>' : '') +
      '<p class="redcafe-guia-hacer">' + esc(paso.hacer) + '</p>' +
      (paso.fijarse ? '<p class="redcafe-guia-fijarse"><strong>En qué fijarte:</strong> ' + esc(paso.fijarse) + '</p>' : '') +
      (paso.error ? '<p class="redcafe-guia-error"><strong>Error frecuente:</strong> ' + esc(paso.error) + '</p>' : '') +
      (paso.fuente ? '<p class="redcafe-guia-fuente">Fuente: ' + esc(paso.fuente) + '</p>' : '') +
      '<label class="redcafe-guia-nota"><span>Tu nota</span>' +
        '<textarea rows="2" maxlength="500" data-nota placeholder="Lo que hiciste, la fecha, lo que te falta…">' + esc(st.nota || '') + '</textarea>' +
      '</label>' +
      (paso.registro ? registroHtml(paso.registro) : '') +
    '</li>';
  }

  function etapaHtml(guiaId, etapa, abierta) {
    var a = avanceEtapa(guiaId, etapa);
    return '<details class="redcafe-guia-etapa"' + (abierta ? " open" : "") + '>' +
      '<summary>' +
        '<span class="redcafe-guia-etapa-titulo">' + esc(etapa.titulo) + '</span>' +
        '<span class="redcafe-guia-etapa-avance">' + a.hechos + '/' + a.total + '</span>' +
        barra(a.pct) +
      '</summary>' +
      (etapa.intro ? '<p class="redcafe-guia-intro">' + esc(etapa.intro) + '</p>' : '') +
      '<ul class="redcafe-guia-pasos">' + etapa.pasos.map(function (p) { return pasoHtml(guiaId, p); }).join("") + '</ul>' +
      '<p class="redcafe-guia-academia"><a href="/academia/">Aprender más en la Academia →</a></p>' +
    '</details>';
  }

  /* La guía dice qué hacer y cuándo. Quien decide en su finca, quien aplica y
     quien responde por el resultado es el miembro. Va arriba, antes de los
     pasos: aquí sí se actúa sobre plantas, dinero y trámites. */
  function avisoResponsabilidad() {
    return '<aside class="redcafe-aviso-referencial" role="note">' +
      '<strong>Información referencial</strong>' +
      '<p>Esta guía reúne prácticas recomendadas y las fuentes en que se apoyan (INIAP, Agrocalidad, ' +
      'Anacafé, SCA y normativa vigente). Es orientación general: no sustituye la asistencia técnica de ' +
      'un agrónomo, ni la asesoría legal, contable o sanitaria de quien conozca tu caso. Suelo, clima, ' +
      'variedad, mercado y normas cambian de una finca a otra y con el tiempo.</p>' +
      '<p>Aplicar estos pasos y los resultados que se obtengan son responsabilidad de quien los aplica. ' +
      'Antes de fertilizar, aplicar un producto fitosanitario, certificar, exportar o comprometer dinero, ' +
      'confirma con un técnico y con la entidad competente (MAG, Agrocalidad, SRI, aduana, según el caso).</p>' +
      '</aside>';
  }

  function cuerpoHtml() {
    var guia = guiaPorId(estado.guia);
    if (!guia) return '<p class="redcafe-guia-vacio">No se pudo cargar el contenido de las guías.</p>';
    var av = avanceGuia(guia);
    var todas = (window.REDCAFE_GUIAS && window.REDCAFE_GUIAS.guias) || [];
    return '<div class="redcafe-guia-tabs" role="tablist">' +
        todas.map(function (g) {
          return '<button type="button" role="tab" class="redcafe-guia-tab' + (g.id === estado.guia ? " es-activa" : "") +
            '" data-guia="' + esc(g.id) + '" aria-selected="' + (g.id === estado.guia) + '">' + esc(g.titulo) + '</button>';
        }).join("") +
      '</div>' +
      '<p class="redcafe-guia-resumen">' + esc(guia.resumen) + '</p>' +
      avisoResponsabilidad() +
      '<div class="redcafe-guia-avance-general">' +
        '<strong>' + av.pct + ' %</strong><span>' + av.hechos + ' de ' + av.total + ' pasos</span>' + barra(av.pct) +
        '<button type="button" class="redcafe-guia-ficha">Descargar mi ficha de finca</button>' +
      '</div>' +
      guia.etapas.map(function (e, i) { return etapaHtml(guia.id, e, i === 0); }).join("");
  }

  function pintar(seccion) {
    var cuerpo = seccion.querySelector(".redcafe-guia-cuerpo");
    if (!cuerpo) return;
    cuerpo.innerHTML = cuerpoHtml();
  }

  function recogerRegistro(caja) {
    var datos = {};
    Array.prototype.forEach.call(caja.querySelectorAll("[data-campo]"), function (inp) {
      datos[inp.getAttribute("data-campo")] = inp.value;
    });
    return datos;
  }

  function fichaImprimible(d) {
    var etiquetas = { cosecha: "Última cosecha", fermentacion: "Última fermentación", secado: "Último secado", costos: "Último costo" };
    var filas = Object.keys(etiquetas).map(function (t) {
      var f = d.ultimos && d.ultimos[t];
      if (!f) return "";
      return '<tr><th>' + esc(etiquetas[t]) + '</th><td>' + esc(REGISTROS[t].resumen(f)) + '</td></tr>';
    }).join("");
    var hechos = (d.hechos && d.hechos.finca) || [];
    var vent = window.open("", "_blank");
    if (!vent) { window.alert("Tu navegador bloqueó la ventana de impresión."); return; }
    vent.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8">' +
      '<title>Ficha de finca · ' + esc(d.miembro.nombre) + '</title>' +
      '<style>body{font-family:system-ui,sans-serif;color:#2b2b2b;margin:2rem;max-width:40rem}' +
      'h1{font-size:1.3rem;margin:0 0 .2rem}p.sub{color:#6b6459;font-size:.9rem;margin:0 0 1.2rem}' +
      'table{border-collapse:collapse;width:100%;margin-bottom:1.2rem}th,td{border-bottom:1px solid #ddd;padding:.45rem .3rem;text-align:left;font-size:.9rem}' +
      'th{width:12rem;color:#6b6459;font-weight:600}ul{padding-left:1.1rem;font-size:.9rem}small{color:#8a8377}</style></head><body>' +
      '<h1>Ficha de finca · ' + esc(d.miembro.nombre) + '</h1>' +
      '<p class="sub">' + esc(d.miembro.provincia || "") + ' · Generada el ' +
        esc(new Date(Date.parse(d.generado)).toLocaleDateString("es-EC")) + ' en Red Café Ecuador</p>' +
      '<table>' + filas +
        (d.costo_quintal !== null && d.costo_quintal !== undefined
          ? '<tr><th>Costo por quintal</th><td>$ ' + esc(d.costo_quintal) + '</td></tr>' : '') +
        '<tr><th>Pasos cumplidos</th><td>' + hechos.length + ' de la guía de finca</td></tr>' +
      '</table>' +
      '<small>Los datos los declara el propio productor. Red Café Ecuador no los verifica.</small>' +
      '</body></html>');
    vent.document.close();
    vent.focus();
    vent.print();
  }

  function conectar(seccion) {
    seccion.addEventListener("click", function (ev) {
      var tab = ev.target.closest(".redcafe-guia-tab");
      if (tab) { estado.guia = tab.getAttribute("data-guia"); pintar(seccion); return; }

      var ficha = ev.target.closest(".redcafe-guia-ficha");
      if (ficha) {
        json("/api/guias.php?action=ficha").then(function (r) {
          if (r && r.ok && r.data) fichaImprimible(r.data);
        });
        return;
      }

      var guardar = ev.target.closest(".redcafe-guia-guardar-registro");
      if (guardar) {
        var caja = guardar.closest("[data-registro]");
        var tipo = caja.getAttribute("data-registro");
        var aviso = caja.querySelector(".redcafe-guia-registro-estado");
        aviso.textContent = "Guardando…";
        post("registro", { tipo: tipo, datos: recogerRegistro(caja) }).then(function (r) {
          if (!r || !r.ok) { aviso.textContent = (r && r.error) || "No se pudo guardar."; return; }
          aviso.textContent = "Guardado.";
          estado.registros[tipo] = [r.data.registro].concat(estado.registros[tipo] || []);
          pintar(seccion);
        });
        return;
      }

      var borrar = ev.target.closest(".redcafe-guia-borrar");
      if (borrar) {
        var t = borrar.getAttribute("data-tipo");
        post("borrar_registro", { tipo: t, id: borrar.getAttribute("data-id") }).then(function (r) {
          if (!r || !r.ok) return;
          estado.registros[t] = (estado.registros[t] || []).filter(function (f) {
            return f.id !== borrar.getAttribute("data-id");
          });
          pintar(seccion);
        });
      }
    });

    seccion.addEventListener("change", function (ev) {
      var chk = ev.target.closest("[data-hecho]");
      if (!chk) return;
      var li = chk.closest(".redcafe-guia-paso");
      var pasoId = li.getAttribute("data-paso");
      var nota = li.querySelector("[data-nota]");
      post("paso", { guia: estado.guia, paso: pasoId, hecho: chk.checked, nota: nota ? nota.value : "" })
        .then(function (r) {
          if (!r || !r.ok) { chk.checked = !chk.checked; return; }
          if (!estado.avance[estado.guia]) estado.avance[estado.guia] = {};
          estado.avance[estado.guia][pasoId] = r.data.estado;
          li.classList.toggle("es-hecho", chk.checked);
          var res = seccion.querySelector(".redcafe-guia-avance-general");
          var g = guiaPorId(estado.guia);
          if (res && g) {
            var av = avanceGuia(g);
            res.querySelector("strong").textContent = av.pct + " %";
            res.querySelector("span").textContent = av.hechos + " de " + av.total + " pasos";
            var b = res.querySelector(".redcafe-guia-barra span");
            if (b) b.style.width = av.pct + "%";
          }
        });
    });

    // La nota se guarda al salir del campo, no en cada tecla.
    seccion.addEventListener("focusout", function (ev) {
      var nota = ev.target.closest("[data-nota]");
      if (!nota) return;
      var li = nota.closest(".redcafe-guia-paso");
      var pasoId = li.getAttribute("data-paso");
      var chk = li.querySelector("[data-hecho]");
      var previa = estadoPaso(estado.guia, pasoId).nota || "";
      if (nota.value === previa) return;
      post("paso", { guia: estado.guia, paso: pasoId, hecho: !!(chk && chk.checked), nota: nota.value })
        .then(function (r) {
          if (r && r.ok) {
            if (!estado.avance[estado.guia]) estado.avance[estado.guia] = {};
            estado.avance[estado.guia][pasoId] = r.data.estado;
          }
        });
    });
  }

  function montar() {
    if (document.getElementById("redcafe-guias")) return true;
    if (!window.REDCAFE_GUIAS) return false;
    var main = document.querySelector("main");
    if (!main) return false;

    var seccion = document.createElement("section");
    seccion.id = "redcafe-guias";
    seccion.className = "redcafe-pub-seccion redcafe-guia-seccion";
    seccion.setAttribute("data-redcafe-propio", "1");
    seccion.innerHTML = '<div class="redcafe-pub-wrap">' +
      '<p class="redcafe-pub-rotulo">Guías</p>' +
      '<h3 class="redcafe-pub-titulo">Guías paso a paso</h3>' +
      '<button type="button" class="redcafe-col-boton" aria-expanded="false">' +
        '<span><span class="redcafe-col-texto">Abrir mis guías de finca y de negocio</span></span>' +
        '<span class="redcafe-col-flecha" aria-hidden="true">▾</span>' +
      '</button>' +
      '<div class="redcafe-col-cuerpo redcafe-guia-cuerpo" hidden></div>' +
    '</div>';

    var ancla = document.getElementById("redcafe-mis-cursos") || document.getElementById("redcafe-mis-publicaciones");
    if (ancla && ancla.parentNode) ancla.parentNode.insertBefore(seccion, ancla.nextSibling);
    else main.appendChild(seccion);

    var boton = seccion.querySelector(".redcafe-col-boton");
    var cuerpo = seccion.querySelector(".redcafe-guia-cuerpo");
    boton.addEventListener("click", function () {
      var abrir = cuerpo.hidden;
      cuerpo.hidden = !abrir;
      boton.setAttribute("aria-expanded", abrir ? "true" : "false");
      if (abrir) pintar(seccion);
    });
    conectar(seccion);
    pintar(seccion);
    return true;
  }

  function cargar() {
    return Promise.all([
      json("/api/guias.php?action=estado"),
      json("/api/guias.php?action=registros")
    ]).then(function (res) {
      if (!res[0] || !res[0].ok) return false;
      estado.avance = (res[0].data && res[0].data.avance) || {};
      estado.registros = (res[1] && res[1].ok && res[1].data && res[1].data.registros) || {};
      return true;
    });
  }

  function iniciar() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    if (estado.montado) return;
    cargar().then(function (hay) {
      if (!hay) return;      // sin sesión la API responde 401 y no se pinta nada
      estado.montado = true;
      var reloj = setInterval(function () {
        intentos++;
        if (montar() || intentos >= 12) clearInterval(reloj);
      }, 700);
      montar();
    });
  }

  if (document.readyState === "complete") setTimeout(iniciar, 700);
  else window.addEventListener("load", function () { setTimeout(iniciar, 700); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 900); });
})();
