#!/usr/bin/env python3
"""
Reportar a un miembro (conflicto, fraude, acoso, suplantación, uso indebido de
datos, spam) desde donde se le ve: ficha del lote y publicaciones de la
comunidad. El formulario «¿Un problema?» (redcafe-reportes.js) recibe al
miembro reportado y la API lo valida (reportes.php · reportado_id).

Cualquier botón con data-reportar-uid / data-reportar-nombre abre el
formulario ya dirigido a esa persona; sin sesión, lleva a entrar.

    python3 herramientas/reportar-miembro.py <sitio>     # idempotente
"""
import os
import sys

MARCA = "/* reportar-miembro */"

PARCHES = {
    "redcafe-reportes.js": [
        ('''    ["contacto-sospechoso", "Contacto sospechoso"],
    ["otro", "Otro"]
  ];''', '''    ["contacto-sospechoso", "Contacto sospechoso"],
    ["otro", "Otro"]
  ];
  ''' + MARCA + '''
  // Categorías sobre una persona: solo se ofrecen cuando se reporta a alguien.
  var categoriasPersona = [
    ["conflicto-usuario", "Conflicto con este miembro"],
    ["fraude", "Fraude o estafa"],
    ["acoso", "Acoso, amenazas o discriminación"],
    ["suplantacion", "Suplantación de identidad o datos falsos"],
    ["uso-indebido-datos", "Uso indebido de mis datos"],
    ["spam", "Mensajes no solicitados (spam)"]
  ];
  var reportado = null;   // { id, nombre } cuando se reporta a un miembro'''),
        ('''    head.appendChild(el("h3", {}, "Reportar un problema"));''',
         '''    head.appendChild(el("h3", {}, reportado ? "Reportar a un miembro" : "Reportar un problema"));'''),
        ('''    form.appendChild(labelSelect());''',
         '''    if (reportado) {
      var quien = el("p", { className: "redcafe-rep-quien" });
      quien.appendChild(document.createTextNode("Reportas a: "));
      quien.appendChild(el("strong", {}, reportado.nombre || "este miembro"));
      form.appendChild(quien);
      form.appendChild(el("p", { className: "redcafe-rep-nota" }, "La persona reportada no sabrá quién la reportó. La administración revisará los hechos y, si corresponde, aplicará una medida con derecho a apelación."));
    }
    form.appendChild(labelSelect());'''),
        ('''    panel = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();''',
         '''    panel = null;
    reportado = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();'''),
        ('''    categorias.forEach(function (c) { select.appendChild(el("option", { value: c[0] }, c[1])); });''',
         '''    (reportado ? categoriasPersona.concat([["otro", "Otro"]]) : categorias).forEach(function (c) { select.appendChild(el("option", { value: c[0] }, c[1])); });'''),
        ('''        url: form.url.value
      })''', '''        url: form.url.value,
        reportado_id: reportado ? reportado.id : ""
      })'''),
        ('''  function agregarBoton() {''', '''  // Botones «Reportar» del sitio: <button data-reportar-uid data-reportar-nombre>.
  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest("[data-reportar-uid]") : null;
    if (!b) return;
    ev.preventDefault();
    var id = b.getAttribute("data-reportar-uid");
    if (!id) return;
    fetch("/api/auth.php?action=me", { credentials: "include", cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      if (!(j && j.ok && j.data && j.data.user)) { location.href = "/login/?siguiente=" + encodeURIComponent(location.pathname); return; }
      if (panel) cerrarPanel();
      reportado = { id: id, nombre: b.getAttribute("data-reportar-nombre") || "" };
      injectStyles();
      abrirPanel();
    }).catch(function () {});
  });
  window.RedCafeReportar = function (id, nombre) { reportado = { id: id, nombre: nombre || "" }; abrirPanel(); };

  function agregarBoton() {'''),
    ],
    "redcafe-v60-mejoras-obligatorias.js": [
        ('''        accion = piezas.join("");''', '''        ''' + MARCA + '''
        var duenoLote = lote.productor_id || lote.published_by || "";
        if (duenoLote) piezas.push('<button type="button" class="redcafe-reportar-btn" data-reportar-uid="' + htmlEscape(duenoLote) + '" data-reportar-nombre="' + productorAttr + '">Reportar al vendedor</button>');
        accion = piezas.join("");'''),
    ],
    "redcafe-comunidad.js": [
        ('''      pie.appendChild(borrar);
    }

    var comentarios''', '''      pie.appendChild(borrar);
    } else if (estado.usuario && !aviso && p.autor_id) {
      ''' + MARCA + '''
      pie.appendChild(el("button", { type: "button", className: "redcafe-muro-reportar", "data-reportar-uid": String(p.autor_id), "data-reportar-nombre": p.autor || "" }, "Reportar"));
    }

    var comentarios'''),
    ],
}


def main():
    sitio = sys.argv[1]
    for nombre, cambios in PARCHES.items():
        f = os.path.join(sitio, nombre)
        s = open(f, encoding="utf8").read()
        if MARCA in s:
            continue
        for viejo, nuevo in cambios:
            if s.count(viejo) != 1:
                sys.exit(f"DETENIDO: {nombre} no tiene la forma esperada ({viejo.strip()[:60]!r} aparece {s.count(viejo)} veces)")
            s = s.replace(viejo, nuevo)
        open(f, "w", encoding="utf8").write(s)
        print(f"{nombre}: reportar a un miembro")


if __name__ == "__main__":
    main()
