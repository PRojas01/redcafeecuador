#!/usr/bin/env python3
"""
Comunidad: cada novedad lleva a SU destino.

Antes, «nuevo miembro» enlazaba a /comunidad/ (la misma página) y servicios,
requerimientos y empleos a /marketplace/ (la portada del marketplace, sin la
pestaña correspondiente). La API ya redacta los enlaces nuevos
(_comunidad-avisos.php); aquí:
  · redcafe-comunidad.js corrige al mostrarlas las novedades ya guardadas;
  · redcafe-v60-mejoras-obligatorias.js abre la pestaña pedida con
    /marketplace/?ver=servicios|requerimientos|empleos.

    python3 herramientas/enlaces-comunidad.py <sitio>     # idempotente
"""
import os
import sys

MARCA = "/* enlaces-comunidad */"

COMUNIDAD = [
    ('''    if (aviso && p.enlace) {
      var a = el("a", { className: "redcafe-muro-enlace", href: p.enlace },
        ENLACE_TEXTO[tipo] || "Ver más");''', '''    ''' + MARCA + '''
    var destino = aviso ? enlaceDeNovedad(tipo, p.enlace || "") : "";
    if (destino) {
      var a = el("a", { className: "redcafe-muro-enlace", href: destino },
        ENLACE_TEXTO[tipo] || "Ver más");'''),
    ('''  var ENLACE_TEXTO = {
    lote: "Ver el lote", servicio: "Ver los servicios",
    curso: "Ver el curso", empleo: "Ver la oferta", miembro: "Ver la comunidad"
  };''', '''  var ENLACE_TEXTO = {
    lote: "Ver el lote", servicio: "Ver los servicios",
    curso: "Ver el curso", empleo: "Ver las ofertas de empleo", requerimiento: "Ver los requerimientos"
  };
  // Novedades guardadas antes del arreglo: «nuevo miembro» llevaba a esta misma
  // página y el resto a la portada del marketplace. Cada una va a su sitio.
  function enlaceDeNovedad(tipo, enlace) {
    if (tipo === "miembro") return "";
    var generico = /^\\/(marketplace|comunidad)\\/?$/.test(enlace);
    if (!generico) return enlace;
    if (tipo === "servicio") return "/marketplace/?ver=servicios";
    if (tipo === "requerimiento") return "/marketplace/?ver=requerimientos";
    if (tipo === "empleo") return "/marketplace/?ver=empleos";
    return "";
  }'''),
]

MARKETPLACE = '''
''' + MARCA + '''
/* /marketplace/?ver=servicios|requerimientos|empleos abre esa pestaña (las
   novedades de la comunidad enlazan así a lo que anuncian). Las pestañas se
   montan tras cargar: se reintenta unos segundos. */
(function () {
  "use strict";
  if (!/^\\/marketplace\\/?$/.test(location.pathname)) return;
  var ver = new URLSearchParams(location.search).get("ver");
  var texto = { servicios: "Servicios", requerimientos: "Requerimientos", empleos: "Empleos" }[ver || ""];
  if (!texto) return;
  var intentos = 0;
  var reloj = setInterval(function () {
    intentos++;
    var b = Array.prototype.slice.call(document.querySelectorAll("main button")).find(function (x) {
      return (x.textContent || "").trim() === texto;
    });
    if (b) { clearInterval(reloj); b.click(); b.scrollIntoView({ block: "center" }); }
    else if (intentos > 25) clearInterval(reloj);
  }, 300);
})();
'''


def main():
    sitio = sys.argv[1]
    f = os.path.join(sitio, "redcafe-comunidad.js")
    s = open(f, encoding="utf8").read()
    if MARCA not in s:
        for viejo, nuevo in COMUNIDAD:
            if s.count(viejo) != 1:
                sys.exit(f"DETENIDO: redcafe-comunidad.js no tiene la forma esperada ({viejo.strip()[:50]!r})")
            s = s.replace(viejo, nuevo)
        open(f, "w", encoding="utf8").write(s)
        print("redcafe-comunidad.js: cada novedad a su destino")
    f = os.path.join(sitio, "redcafe-v60-mejoras-obligatorias.js")
    s = open(f, encoding="utf8").read()
    if MARCA not in s:
        open(f, "w", encoding="utf8").write(s.rstrip() + "\n" + MARKETPLACE)
        print("redcafe-v60-mejoras-obligatorias.js: /marketplace/?ver= abre la pestaña")


if __name__ == "__main__":
    main()
