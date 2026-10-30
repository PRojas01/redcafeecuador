#!/usr/bin/env python3
"""
Migración a React — FASE 1 (globales). BORRA de la capa propia el código que ya
hace React (regla del propietario: lo repetido se borra, no se oculta).

    python3 herramientas/migracion-fase1.py <sitio>      # aplica (idempotente)

Lo que pasa a React en esta fase (plataforma_cafe):
  · botón flotante → components/HubFlotante.tsx (solo Comunidad + contador;
    se borra «Canales de la Red»)
  · vídeo de fondo  → components/VideoFondo.tsx
  · «Fuente» del ticker → components/TickerPrecio.tsx
Y aquí se borra lo que lo sustituía en la capa:
  · redcafe-conversion.js: secciones 17 (tazaALaComunidad y contador) y 18
    (fondoVideo), sus llamadas en aplicar() y sus reinicios en alCargarRuta().
  · redcafe-v60-final.js: enhanceTickerSourceLabel() y su llamada.
Se detiene si el código no tiene la forma esperada (nunca borra a ciegas).
"""
import os
import sys

MARCA = "/* migración a React · fase 1 */"


def borrar_bloque(s, inicio, fin, nombre):
    i = s.find(inicio)
    j = s.find(fin, i + 1) if i >= 0 else -1
    if i < 0 or j < 0:
        sys.exit(f"DETENIDO: no encuentro el bloque {nombre}")
    return s[:i] + s[j:]


def borrar_exacto(s, texto, nombre):
    if s.count(texto) != 1:
        sys.exit(f"DETENIDO: «{nombre}» aparece {s.count(texto)} veces (se esperaba 1)")
    return s.replace(texto, "")


def main():
    sitio = sys.argv[1]
    conv = os.path.join(sitio, "redcafe-conversion.js")
    s = open(conv, encoding="utf8").read()
    if MARCA not in s:
        s = borrar_bloque(s, "  /* ── 17. La taza flotante lleva a la comunidad",
                          "  /* ── Arranque", "secciones 17–18 (taza flotante y vídeo de fondo)")
        s = borrar_exacto(s, "    tazaALaComunidad();\n    fondoVideo();\n", "llamadas en aplicar()")
        s = borrar_exacto(s, "    intentosTaza = 0;\n    contadorPedido = false;\n", "reinicios en alCargarRuta()")
        for resto in ("tazaALaComunidad", "fondoVideo", "contarNovedadesComunidad", "intentosTaza", "contadorPedido"):
            if resto in s:
                sys.exit(f"DETENIDO: queda una referencia a {resto}")
        s = s.replace("  /* ── Arranque", "  " + MARCA + "\n  /* ── Arranque", 1)
        open(conv, "w", encoding="utf8").write(s)
        print("redcafe-conversion.js: borrados botón flotante y vídeo de fondo de la capa")

    fin = os.path.join(sitio, "redcafe-v60-final.js")
    s = open(fin, encoding="utf8").read()
    if "enhanceTickerSourceLabel" in s:
        s = borrar_bloque(s, "  function enhanceTickerSourceLabel() {", "  function run() {", "enhanceTickerSourceLabel()")
        s = borrar_exacto(s, "    enhanceTickerSourceLabel();\n", "llamada a enhanceTickerSourceLabel()")
        open(fin, "w", encoding="utf8").write(s)
        print("redcafe-v60-final.js: borrado el cambio de «Fuente oficial» (ya lo hace React)")


if __name__ == "__main__":
    main()
