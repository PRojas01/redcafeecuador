#!/usr/bin/env python3
"""
Red Café Ecuador — servidor de ensayo.

Sirve un paquete como lo serviría el servidor real, con una diferencia: en el
ensayo no hay PHP, así que /api/*.php no respondería y medio sitio se vería
vacío. Eso ya pasó: el primer gráfico de la página de precios ("ICE COFFEE C ·
PROMEDIO MENSUAL") lo dibuja la capa propia leyendo la API, y sin API salen
literalmente las palabras "Sin datos" aunque el HTML lleve el precio correcto.

Este servidor contesta esas rutas con una copia de la respuesta real que se
guardó antes, y todo lo demás lo sirve como archivo estático, con las mismas
reglas de .htaccess que el servidor de verdad (HTML sin caché, JS y CSS con un
año inmutable).

    python3 herramientas/servidor-ensayo.py <directorio> <puerto> <api.json>

Luego, en otra terminal:

    python3 herramientas/comparar-con-produccion.py --local http://127.0.0.1:8123

Y para mirarlo con ojos de persona, abrir la URL en el navegador.
"""
from __future__ import annotations

import json
import mimetypes
import os
import posixpath
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = ""
API_JSON = ""
VERSAO = "20260930a"


class Ensayo(SimpleHTTPRequestHandler):
    # Mismas reglas que public/.htaccess: nada de caché para el HTML, que es
    # donde va el precio; un año inmutable para JS y CSS, que van con hash.
    def end_headers(self):
        ruta = self.path.split("?")[0]
        if ruta.endswith((".js", ".css")):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_GET(self):  # noqa: N802 — el nombre lo impone la clase base
        ruta = self.path.split("?")[0]
        if ruta.startswith("/api/") and ruta.endswith(".php"):
            self.enviar_api(ruta)
            return
        super().do_GET()

    def enviar_api(self, ruta: str):
        # En el ensayo precios.php no puede correr (no hay PHP), así que se
        # responde con la copia que se guardó de la respuesta real. Si hay varias
        # (precios.php y precios-refresh.php), se elige por nombre.
        origen = API_JSON
        if os.path.isdir(API_JSON):
            nombre = os.path.basename(ruta)
            candidato = os.path.join(API_JSON, nombre.replace(".php", "") + ".json")
            origen = candidato if os.path.isfile(candidato) else ""
            if not origen:
                self.send_error(404, "sin copia para esta ruta")
                return
        if not os.path.isfile(origen):
            self.send_error(404, "sin copia de la API para este ensayo")
            return
        with open(origen, "rb") as f:
            cuerpo = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def translate_path(self, path: str) -> str:
        # Como el servidor real: /ruta/ sirve /ruta/index.html
        limpio = posixpath.normpath(path.split("?")[0].split("#")[0])
        destino = os.path.join(RAIZ, limpio.lstrip("/"))
        if os.path.isdir(destino):
            destino = os.path.join(destino, "index.html")
        return destino

    def log_message(self, fmt, *args):  # silencio: solo los errores importan
        if args and str(args[1] if len(args) > 1 else "").startswith(("4", "5")):
            sys.stderr.write("  %s\n" % (fmt % args))


def main() -> int:
    global RAIZ, API_JSON
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    RAIZ = os.path.abspath(sys.argv[1])
    puerto = int(sys.argv[2]) if len(sys.argv) > 2 else 8123
    API_JSON = os.path.abspath(sys.argv[3]) if len(sys.argv) > 3 else ""

    if not os.path.isdir(RAIZ):
        print(f"ERROR: no existe el directorio {RAIZ}")
        return 1

    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("text/css", ".css")

    print(f"Ensayando {RAIZ}")
    print(f"  http://127.0.0.1:{puerto}/")
    print(f"  API: {API_JSON or 'ninguna (el sitio se verá sin datos)'}")
    ThreadingHTTPServer(("127.0.0.1", puerto), Ensayo).serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
