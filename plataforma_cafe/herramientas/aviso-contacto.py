#!/usr/bin/env python3
"""
Aviso de contacto y de operación entre terceros (redcafe-aviso-pedidos.js).

El aviso de pedidos ya existía (solo hablaba de pagos). Se amplía, sin crear
otro diálogo paralelo:
  · Al solicitar un pedido: qué datos se comparten y con quién, que la
    operación es estrictamente entre las partes y que Red Café no cobra ni
    garantiza. Casilla de aceptación expresa (LOPDP art. 8: consentimiento
    informado e inequívoco). Nueva versión del aviso: 2026-10-23 (la API la
    guarda en cada pedido: AVISO_PAGOS_VERSION).
  · Al pulsar un enlace de WhatsApp: se avisa que se sale de la plataforma, que
    lo que se hable allí queda fuera de Red Café y que la operación es entre
    terceros. Una vez por sesión.

    python3 herramientas/aviso-contacto.py <sitio>     # idempotente
"""
import os
import sys

VERSION = "2026-10-23"
MARCA = "/* aviso-contacto 2026-10-23 */"

CAMBIOS = [
    ('var VERSION_AVISO = "2026-09-07";', 'var VERSION_AVISO = "' + VERSION + '";'),
    ('''  var TEXTO = [
    "Red Café Ecuador es un punto de encuentro entre productores, compradores y proveedores. No intervenimos en los pagos, no retenemos el dinero y no somos parte del contrato.",
    "No hagas transferencias ni depósitos si no estás seguro de la identidad de la otra parte.",
    "Antes de enviar dinero: confirma con quién hablas por más de un canal, pide una muestra del café, acuerda por escrito la forma de pago y la entrega, y guarda el comprobante de todo."
  ];''', '''  var TEXTO = [
    "Esta operación es estrictamente entre tú y quien publica. Red Café Ecuador solo pone en contacto a las partes: no es parte del contrato, no cobra, no retiene dinero ni garantiza la entrega o la calidad.",
    "No hagas transferencias ni depósitos si no estás seguro de la identidad de la otra parte.",
    "Tus datos: quien publica recibirá tu nombre y esta solicitud en su panel, y podrá responderte por el chat de la Red. Si decides seguir por WhatsApp o por teléfono, compartirás directamente tus datos de contacto con esa persona y esa conversación quedará fuera de la plataforma.",
    "Antes de enviar dinero: confirma con quién hablas por más de un canal, pide una muestra del café, acuerda por escrito la forma de pago y la entrega, y guarda el comprobante de todo."
  ];'''),
    ('caja.appendChild(el("h2", { id: "redcafe-avisopago-titulo" }, "Cuidado con los pagos"));',
     'caja.appendChild(el("h2", { id: "redcafe-avisopago-titulo" }, "Antes de enviar tu solicitud"));'),
    ('''      var seguir = el("button", { type: "button", className: "redcafe-avisopago-seguir" }, "Entiendo, enviar solicitud");
      acciones.appendChild(cancelar);''', '''      var seguir = el("button", { type: "button", className: "redcafe-avisopago-seguir" }, "Acepto y envío la solicitud");
      // Aceptación expresa: el botón se activa solo al marcar la casilla.
      var acepto = el("label", { className: "redcafe-avisopago-acepto" });
      var casilla = el("input", { type: "checkbox" });
      acepto.appendChild(casilla);
      acepto.appendChild(document.createTextNode(" Entiendo que la operación es entre las partes y acepto que mi nombre y mi solicitud se compartan con quien publica."));
      caja.appendChild(acepto);
      seguir.disabled = true;
      casilla.addEventListener("change", function () { seguir.disabled = !casilla.checked; });
      acciones.appendChild(cancelar);'''),
    ('      seguir.focus();\n    });\n  }', '      casilla.focus();\n    });\n  }'),
]

WHATSAPP = r'''
  ''' + MARCA + r'''
  /* ── Salir a WhatsApp ─────────────────────────────────────────────
     Antes de abrir WhatsApp se avisa que se sale de la plataforma: lo que se
     hable allí no lo ve ni lo guarda Red Café, y la operación es entre las
     partes. Una vez por sesión; se puede cancelar. */
  var CLAVE_WA = "redcafe-aviso-whatsapp";
  var NUMERO_RED = "593968641376";
  function avisoWhatsapp(href) {
    var propio = href.indexOf(NUMERO_RED) !== -1;
    return new Promise(function (resolver) {
      var previo = document.activeElement;
      var fondo = el("div", { className: "redcafe-avisopago-fondo" });
      var caja = el("div", { className: "redcafe-avisopago", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "redcafe-avisowa-titulo" });
      caja.appendChild(el("p", { className: "redcafe-avisopago-rotulo" }, "Vas a salir de Red Café Ecuador"));
      caja.appendChild(el("h2", { id: "redcafe-avisowa-titulo" }, propio ? "Escribir a Red Café por WhatsApp" : "Continuar por WhatsApp"));
      caja.appendChild(el("p", {}, "WhatsApp es un servicio de otra empresa (Meta). Lo que escribas allí queda fuera de esta plataforma: Red Café no puede verlo, moderarlo ni guardarlo, y se rige por las condiciones de WhatsApp."));
      if (!propio) {
        caja.appendChild(el("p", { className: "redcafe-avisopago-clave" }, "Cualquier acuerdo, pago o envío que hagas con esta persona es estrictamente entre ustedes. Red Café Ecuador no es parte de la operación ni la garantiza."));
        caja.appendChild(el("p", {}, "Al escribirle compartirás tu número de teléfono con ella. Compártele solo los datos necesarios y desconfía de pedidos de pago anticipado."));
      } else {
        caja.appendChild(el("p", {}, "Al escribirnos compartirás tu número de teléfono con Red Café Ecuador; lo usaremos solo para responderte."));
      }
      var acciones = el("div", { className: "redcafe-avisopago-acciones" });
      var cancelar = el("button", { type: "button", className: "redcafe-avisopago-cancelar" }, "Quedarme en la Red");
      var seguir = el("button", { type: "button", className: "redcafe-avisopago-seguir" }, "Entiendo, abrir WhatsApp");
      acciones.appendChild(cancelar); acciones.appendChild(seguir); caja.appendChild(acciones);
      function cerrar(r) {
        document.removeEventListener("keydown", tecla, true);
        if (fondo.parentNode) fondo.parentNode.removeChild(fondo);
        if (previo && previo.focus) { try { previo.focus(); } catch (e) {} }
        resolver(r);
      }
      function tecla(ev) { if (ev.key === "Escape") { ev.preventDefault(); cerrar(false); } }
      cancelar.addEventListener("click", function () { cerrar(false); });
      seguir.addEventListener("click", function () { try { sessionStorage.setItem(CLAVE_WA, "1"); } catch (e) {} cerrar(true); });
      document.addEventListener("keydown", tecla, true);
      fondo.appendChild(caja); document.body.appendChild(fondo); seguir.focus();
    });
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href*="wa.me/"], a[href*="api.whatsapp.com/"], a[href^="whatsapp:"]') : null;
    if (!a || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey) return;
    try { if (sessionStorage.getItem(CLAVE_WA) === "1") return; } catch (e) {}
    ev.preventDefault(); ev.stopPropagation();
    var href = a.href, destino = a.getAttribute("target");
    avisoWhatsapp(href).then(function (ok) {
      if (!ok) return;
      if (destino === "_blank") window.open(href, "_blank", "noopener"); else location.href = href;
    });
  }, true);
})();'''


def main():
    f = os.path.join(sys.argv[1], "redcafe-aviso-pedidos.js")
    s = open(f, encoding="utf8").read()
    if MARCA in s:
        return
    for viejo, nuevo in CAMBIOS:
        if s.count(viejo) != 1:
            sys.exit(f"DETENIDO: redcafe-aviso-pedidos.js no tiene la forma esperada ({viejo.strip()[:60]!r})")
        s = s.replace(viejo, nuevo)
    if not s.rstrip().endswith("})();"):
        sys.exit("DETENIDO: final inesperado en redcafe-aviso-pedidos.js")
    s = s.rstrip()[:-len("})();")].rstrip() + "\n" + WHATSAPP + "\n"
    open(f, "w", encoding="utf8").write(s)
    print("redcafe-aviso-pedidos.js: aviso de contacto y de WhatsApp (versión " + VERSION + ")")


if __name__ == "__main__":
    main()
