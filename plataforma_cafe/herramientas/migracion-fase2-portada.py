#!/usr/bin/env python3
"""
Migración a React — FASE 2 (portada). Borra de la capa propia el bloque
«Forma parte» que ahora pinta React (components/AccesoPortada.tsx):
  · redcafe-conversion.js: sección 15 (accesoPortada y sus ayudas), su llamada
    en aplicar() y el reinicio de intentosAcceso en alCargarRuta().
React también trae ya el video del hero (antes la capa lo movía) y se borraron
las dos secciones de React que la capa ocultaba («Forma parte» y «Herramientas
gratis»). Regla del propietario: lo repetido se borra, no se oculta.

    python3 herramientas/migracion-fase2-portada.py <sitio>     # idempotente
"""
import os
import sys

MARCA = "/* migración a React · fase 2 (portada) */"


def main():
    f = os.path.join(sys.argv[1], "redcafe-conversion.js")
    s = open(f, encoding="utf8").read()
    if MARCA in s:
        return
    # Se borra lo propio de «Forma parte» (contador, buscador del original,
    # enlace(), accesoCard() y accesoPortada()). Los iconos (ICONOS_ACCESO y
    # accesoIcono) se conservan: los usa la sección 16 del panel.
    ini = "  var intentosAcceso = 0;"
    iconos = "  // Iconos de línea (trazos de Lucide"
    tarjeta = "  function accesoCard("
    fin = "  /* ── 16. Panel: herramientas al alcance"
    i, k, t, j = s.find(ini), s.find(iconos), s.find(tarjeta), s.find(fin)
    if min(i, k, t, j) < 0 or not (i < k < t < j):
        sys.exit("DETENIDO: la sección 15 de redcafe-conversion.js no tiene la forma esperada")
    s = s[:i] + "  " + MARCA + "\n" + s[k:t] + s[j:]
    llamada = " lenguajeLianoPortada(); accesoPortada(); }"
    if s.count(llamada) != 1:
        sys.exit("DETENIDO: la llamada a accesoPortada() no tiene la forma esperada")
    s = s.replace(llamada, " lenguajeLianoPortada(); }")
    reinicio = "    intentosAcceso = 0;\n"
    if s.count(reinicio) != 1:
        sys.exit("DETENIDO: el reinicio de intentosAcceso no tiene la forma esperada")
    s = s.replace(reinicio, "")
    for resto in ("accesoPortada", "intentosAcceso", "seccionAccesoOriginal", "accesoCard"):
        if resto in s:
            sys.exit(f"DETENIDO: queda una referencia a {resto}")
    open(f, "w", encoding="utf8").write(s)
    print("redcafe-conversion.js: borrado el bloque «Forma parte» de la capa (ya lo hace React)")


if __name__ == "__main__":
    main()
