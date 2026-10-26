#!/usr/bin/env python3
"""
Botón «Eliminar» en todo lo que una persona publica y que hoy solo se pinta en
la capa propia (no tiene versión React todavía):

  · panel › Lotes y servicios que has publicado  (redcafe-panel-publicaciones.js)
  · requerimientos de café                        (redcafe-requerimientos.js)
  · ofertas de empleo                             (redcafe-empleos.js)
  · busco empleo                                  (redcafe-busco-empleo.js)
  · comentarios de la comunidad                   (redcafe-comunidad.js; API nueva comment_delete)
  · y el muro de la comunidad espera a que React hidrate (evita React #418)

La API ya autoriza solo a la autora o a la administración; aquí solo se pone el
botón, siempre con confirmación. Idempotente y se detiene si el código no tiene
la forma esperada.

    python3 herramientas/eliminar-propias.py <sitio>
"""
import os
import sys

MARCA = "/* eliminar-propias */"

PARCHES = {
    "redcafe-requerimientos.js": [(
        """      acciones.appendChild(cerrar);
    }
    card.appendChild(acciones);
    if (editor) card.appendChild(editor);""",
        """      acciones.appendChild(cerrar);
    }
    """ + MARCA + """
    var borrarReq = el("button", { type: "button", className: "redcafe-req-btn-suave" }, "Eliminar");
    borrarReq.addEventListener("click", function () {
      if (!window.confirm("¿Eliminar «" + (r.titulo || "este requerimiento") + "»? No se puede deshacer.")) return;
      borrarReq.disabled = true;
      api("delete", { id: r.id }, { id: r.id }).then(function (res) {
        borrarReq.disabled = false;
        msg(section, res.ok ? "Requerimiento eliminado." : (res.error || "No se pudo eliminar."), res.ok ? "ok" : "error");
        if (res.ok) cargar(section);
      });
    });
    acciones.appendChild(borrarReq);
    card.appendChild(acciones);
    if (editor) card.appendChild(editor);""")],
    "redcafe-empleos.js": [(
        """    card.appendChild(editar);
    return card;
  }

  function renderMias(section) {""",
        """    card.appendChild(editar);
    """ + MARCA + """
    var borrarOferta = el("button", { type: "button", className: "redcafe-empleo-btn-suave" }, "Eliminar oferta");
    borrarOferta.addEventListener("click", function () {
      if (!window.confirm("¿Eliminar la oferta «" + (oferta.titulo || "") + "»? No se puede deshacer.")) return;
      borrarOferta.disabled = true;
      api("delete", { id: oferta.id }).then(function (res) {
        borrarOferta.disabled = false;
        msg(section, res.ok ? "Oferta eliminada." : (res.error || "No se pudo eliminar."), res.ok ? "ok" : "error");
        if (res.ok) cargar(section);
      });
    });
    card.appendChild(borrarOferta);
    return card;
  }

  function renderMias(section) {""")],
    "redcafe-busco-empleo.js": [(
        """      acciones.appendChild(cerrar);
    }
    card.appendChild(acciones);
    return card;
  }""",
        """      acciones.appendChild(cerrar);
    }
    """ + MARCA + """
    var borrarBusq = el("button", { type: "button", className: "redcafe-req-btn-suave" }, "Eliminar");
    borrarBusq.addEventListener("click", function () {
      if (!window.confirm("¿Eliminar «" + (b.titulo || "esta búsqueda") + "»? No se puede deshacer.")) return;
      borrarBusq.disabled = true;
      api("delete", { id: b.id }, { id: b.id }).then(function (res) {
        borrarBusq.disabled = false;
        msg(section, res.ok ? "Publicación eliminada." : (res.error || "No se pudo eliminar."), res.ok ? "ok" : "error");
        if (res.ok) cargar(section);
      });
    });
    acciones.appendChild(borrarBusq);
    card.appendChild(acciones);
    return card;
  }""")],
    "redcafe-panel-publicaciones.js": [(
        """          '<button type="button" class="redcafe-pub-guardar">Guardar cambios</button>' +""",
        """          '<button type="button" class="redcafe-pub-guardar">Guardar cambios</button>' +
          /* eliminar-propias */ '<button type="button" class="redcafe-pub-eliminar">Eliminar ' + (tipo === "lote" ? "lote" : "servicio") + '</button>' +"""), (
        """      var toggle = t.closest(".redcafe-pub-toggle");""",
        """      var eliminarP = t.closest(".redcafe-pub-eliminar");
      if (eliminarP) {
        // pintar() puede añadir este manejador más de una vez: una sola pregunta.
        if (eliminarP.getAttribute("data-borrando")) return;
        eliminarP.setAttribute("data-borrando", "1");
        var cardE = eliminarP.closest(".redcafe-pub-card");
        var tipoE = cardE.getAttribute("data-tipo"), idE = cardE.getAttribute("data-id");
        var nombreE = (cardE.querySelector("h3, h4, strong") || {}).textContent || (tipoE === "lote" ? "este lote" : "este servicio");
        setTimeout(function () {
          if (!window.confirm("¿Eliminar «" + nombreE.trim() + "»? Deja de verse en el marketplace y no se puede deshacer.")) { eliminarP.removeAttribute("data-borrando"); return; }
          var urlE = (tipoE === "lote" ? "/api/lotes.php" : "/api/marketplace-servicios.php") + "?action=delete&id=" + encodeURIComponent(idE);
          json(urlE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: idE }) }).then(function (r) {
            eliminarP.removeAttribute("data-borrando");
            var estadoE = cardE.querySelector(".redcafe-pub-estado");
            if (r && r.ok) { cardE.remove(); return; }
            if (estadoE) estadoE.textContent = (r && r.error) || "No se pudo eliminar.";
          });
        }, 0);
        return;
      }

      var toggle = t.closest(".redcafe-pub-toggle");""")],
    "redcafe-comunidad.js": [(
        """  function iniciar() {
    if (location.pathname.indexOf("/comunidad") !== 0) return;
    var intentos = 0;""",
        """  // React #418 en producción: con red lenta, «load» llegaba antes de que React
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
    var intentos = 0;"""), (
        """      li.appendChild(el("p", {}, c.text || ""));
      caja.appendChild(li);""",
        """      li.appendChild(el("p", {}, c.text || ""));
      """ + MARCA + """
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
      caja.appendChild(li);""")],
}


def main():
    sitio = sys.argv[1]
    for nombre, cambios in PARCHES.items():
        f = os.path.join(sitio, nombre)
        s = open(f, encoding="utf8").read()
        antes = s
        for viejo, nuevo in cambios:
            if nuevo in s:
                continue  # ya aplicado (cada cambio es idempotente por separado)
            if s.count(viejo) != 1:
                sys.exit(f"DETENIDO: {nombre} no tiene la forma esperada ({viejo.strip()[:60]!r} aparece {s.count(viejo)} veces)")
            s = s.replace(viejo, nuevo)
        if s != antes:
            open(f, "w", encoding="utf8").write(s)
            print(f"{nombre}: actualizado")


if __name__ == "__main__":
    main()
