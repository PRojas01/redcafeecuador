"""Cliente HTTP compartido por las pruebas de API (extraído de qa_api.py)."""
import http.cookiejar, json, sys, urllib.error, urllib.request
BASE = sys.argv[1].rstrip("/")


def cliente():
    # La cookie de sesión lleva Secure; en local (http://127.0.0.1) hay que
    # aceptarla igual o la sesión no se mantiene.
    pol = http.cookiejar.DefaultCookiePolicy(secure_protocols=("https", "wss", "http"))
    cj = http.cookiejar.CookieJar(policy=pol)
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    return op


def pedir(op, ruta, datos=None, metodo=None, cab=None):
    url = BASE + ruta
    body = json.dumps(datos).encode() if datos is not None else None
    req = urllib.request.Request(url, data=body, method=metodo or ("POST" if body else "GET"))
    req.add_header("Content-Type", "application/json")
    # El proxy de origen del sitio: las peticiones reales van con Origin propio.
    req.add_header("Origin", BASE)
    for k, v in (cab or {}).items():
        req.add_header(k, v)
    try:
        with op.open(req, timeout=30) as r:
            raw = r.read()
            return r.status, dict(r.headers), raw
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def js(raw):
    try:
        return json.loads(raw or b"{}")
    except Exception:
        return {}


