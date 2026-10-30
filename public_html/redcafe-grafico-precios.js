/* Red Café Ecuador — Gráfico histórico del panel de precios
   ------------------------------------------------------------------
   Sustituye el trazo plano anterior (una polilínea sin ejes) por un
   gráfico de cotización con rejilla, eje de precios, eje temporal,
   área degradada, punto de cierre y lectura interactiva con crosshair.

   Diseño propio de Red Café: no reproduce marca, colores ni maquetación
   de ningún proveedor. Datos: /api/precios.php?action=list.
   Requisito J.1 · J.2 · J.3.
*/
(function () {
  "use strict";

  // La unidad del precio viene de la API. Se escapa igual que cualquier otro
  // texto ajeno antes de entrar en innerHTML.
  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  if (location.pathname.indexOf("/servicios/precios") !== 0) return;

  var NS = "http://www.w3.org/2000/svg";
  var W = 760, H = 300;
  var M = { top: 18, right: 62, bottom: 34, left: 14 };

  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  function el(nombre, atributos, texto) {
    var nodo = document.createElementNS(NS, nombre);
    Object.keys(atributos || {}).forEach(function (k) { nodo.setAttribute(k, atributos[k]); });
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  }

  function etiquetaMes(clave) {
    var partes = String(clave || "").split("-");
    if (partes.length < 2) return String(clave || "");
    var i = parseInt(partes[1], 10) - 1;
    return (MESES[i] || partes[1]) + " " + partes[0].slice(2);
  }

  function escalaBonita(min, max) {
    var rango = max - min;
    if (rango <= 0) rango = Math.abs(max) || 1;
    var margen = rango * 0.12;
    var lo = min - margen, hi = max + margen;
    var paso = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4)));
    var candidatos = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < candidatos.length; i++) {
      if ((hi - lo) / (paso * candidatos[i]) <= 5) { paso = paso * candidatos[i]; break; }
    }
    return { lo: Math.floor(lo / paso) * paso, hi: Math.ceil(hi / paso) * paso, paso: paso };
  }

  function construir(historico, unidad) {
    // La API entrega el histórico del mes más reciente al más antiguo:
    // se ordena de forma ascendente para que el eje temporal avance a la derecha.
    var puntos = historico
      .filter(function (p) { return p && isFinite(Number(p.usdQqal || p.centsLb)); })
      .map(function (p) { return { mes: p.mes, valor: Number(p.usdQqal || p.centsLb) }; })
      .sort(function (a, b) { return String(a.mes) < String(b.mes) ? -1 : (String(a.mes) > String(b.mes) ? 1 : 0); });
    if (puntos.length < 2) return null;

    var valores = puntos.map(function (p) { return p.valor; });
    var esc = escalaBonita(Math.min.apply(null, valores), Math.max.apply(null, valores));

    var ancho = W - M.left - M.right;
    var alto = H - M.top - M.bottom;
    var x = function (i) { return M.left + (ancho * i) / (puntos.length - 1); };
    var y = function (v) { return M.top + alto - ((v - esc.lo) / (esc.hi - esc.lo)) * alto; };

    var sube = puntos[puntos.length - 1].valor >= puntos[0].valor;
    var color = sube ? "#2f6b3a" : "#9b2c2c";
    var tinte = sube ? "rgba(47,107,58,.20)" : "rgba(155,44,68,.18)";

    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H,
      class: "redcafe-grafico-svg",
      role: "img",
      // Sin "none": estirar el viewBox deformaba las cifras de los ejes.
      preserveAspectRatio: "xMidYMid meet",
      "aria-label": "Evolución mensual del precio del café en " + unidad
    });

    var defs = el("defs");
    var grad = el("linearGradient", { id: "redcafeAreaGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
    grad.appendChild(el("stop", { offset: "0%", "stop-color": tinte }));
    grad.appendChild(el("stop", { offset: "100%", "stop-color": "rgba(255,255,255,0)" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    // Rejilla horizontal + eje de precios a la derecha
    for (var v = esc.lo; v <= esc.hi + 1e-9; v += esc.paso) {
      var yy = y(v);
      svg.appendChild(el("line", {
        x1: M.left, x2: M.left + ancho, y1: yy, y2: yy,
        stroke: "rgba(24,37,31,.12)", "stroke-width": 1
      }));
      svg.appendChild(el("text", {
        x: M.left + ancho + 8, y: yy + 4,
        "font-size": 11, fill: "#5c5a50", "text-anchor": "start"
      }, "$" + Math.round(v)));
    }

    // Eje temporal (hasta 6 marcas para no saturar)
    var salto = Math.max(1, Math.ceil(puntos.length / 6));
    puntos.forEach(function (p, i) {
      if (i % salto !== 0 && i !== puntos.length - 1) return;
      svg.appendChild(el("text", {
        x: x(i), y: H - 12, "font-size": 11, fill: "#5c5a50", "text-anchor": "middle"
      }, etiquetaMes(p.mes)));
    });

    // Área y línea de cotización
    var d = puntos.map(function (p, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.valor).toFixed(1); }).join(" ");
    svg.appendChild(el("path", {
      d: d + " L" + x(puntos.length - 1).toFixed(1) + " " + (M.top + alto) + " L" + x(0).toFixed(1) + " " + (M.top + alto) + " Z",
      fill: "url(#redcafeAreaGrad)"
    }));
    svg.appendChild(el("path", {
      d: d, fill: "none", stroke: color, "stroke-width": 2.2,
      "stroke-linejoin": "round", "stroke-linecap": "round"
    }));

    // Cierre destacado
    var ultimo = puntos[puntos.length - 1];
    svg.appendChild(el("circle", { cx: x(puntos.length - 1), cy: y(ultimo.valor), r: 4.5, fill: color }));
    svg.appendChild(el("circle", { cx: x(puntos.length - 1), cy: y(ultimo.valor), r: 9, fill: "none", stroke: color, "stroke-opacity": ".28", "stroke-width": 2 }));

    // Crosshair de lectura
    var guia = el("line", { y1: M.top, y2: M.top + alto, stroke: "rgba(24,37,31,.45)", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: "0" });
    var foco = el("circle", { r: 4, fill: "#fff", stroke: color, "stroke-width": 2, opacity: "0" });
    svg.appendChild(guia);
    svg.appendChild(foco);

    var capa = el("rect", { x: M.left, y: M.top, width: ancho, height: alto, fill: "transparent" });
    svg.appendChild(capa);

    return { svg: svg, puntos: puntos, x: x, y: y, guia: guia, foco: foco, capa: capa, ancho: ancho, color: color };
  }

  function activarLectura(g, caja, unidad) {
    var globo = document.createElement("div");
    globo.className = "redcafe-grafico-tooltip";
    globo.setAttribute("role", "status");
    globo.hidden = true;
    caja.appendChild(globo);

    function mover(ev) {
      var r = g.svg.getBoundingClientRect();
      var px = ev.touches ? ev.touches[0].clientX : ev.clientX;
      var rel = ((px - r.left) / r.width) * W;
      var i = Math.round(((rel - M.left) / g.ancho) * (g.puntos.length - 1));
      i = Math.max(0, Math.min(g.puntos.length - 1, i));
      var p = g.puntos[i];
      var cx = g.x(i), cy = g.y(p.valor);

      g.guia.setAttribute("x1", cx); g.guia.setAttribute("x2", cx); g.guia.setAttribute("opacity", "1");
      g.foco.setAttribute("cx", cx); g.foco.setAttribute("cy", cy); g.foco.setAttribute("opacity", "1");

      globo.hidden = false;
      globo.innerHTML = '<strong>$' + p.valor.toFixed(2) + '</strong><span>' + esc(unidad) + '</span><em>' + esc(etiquetaMes(p.mes)) + '</em>';
      var izq = (cx / W) * r.width;
      globo.style.left = Math.max(8, Math.min(r.width - 8, izq)) + "px";
    }

    function salir() {
      g.guia.setAttribute("opacity", "0");
      g.foco.setAttribute("opacity", "0");
      globo.hidden = true;
    }

    g.capa.addEventListener("mousemove", mover);
    g.capa.addEventListener("mouseleave", salir);
    g.capa.addEventListener("touchmove", mover, { passive: true });
    g.capa.addEventListener("touchend", salir);
  }

  function montar(datos) {
    var historico = datos.historico || [];
    var unidad = (datos.precio && datos.precio.unidad) || "USD/quintal";
    var g = construir(historico, unidad);
    if (!g) return;

    // Se reemplaza el SVG histórico existente conservando su contenedor.
    var previo = document.querySelector('main svg[viewBox="0 0 720 260"]');
    var host = previo ? previo.parentElement : null;
    if (!host || host.getAttribute("data-redcafe-grafico") === "1") return;
    host.setAttribute("data-redcafe-grafico", "1");
    host.classList.add("redcafe-grafico-caja");
    // El SVG que se sustituye lo pintó React: se oculta, no se borra. Retirarlo
    // deja a React con una referencia a un nodo que ya no está en el árbol, y
    // en el siguiente repintado eso es un removeChild fallido.
    previo.setAttribute("data-redcafe-oculto", "1");

    var cabecera = document.createElement("div");
    cabecera.className = "redcafe-grafico-cabecera";
    var ultimo = g.puntos[g.puntos.length - 1];
    var primero = g.puntos[0];
    var pct = primero.valor ? ((ultimo.valor - primero.valor) / primero.valor) * 100 : 0;
    var sube = pct >= 0;
    cabecera.innerHTML =
      '<div><p class="redcafe-grafico-rot">Café arábica · histórico mensual</p>' +
      '<p class="redcafe-grafico-valor">$' + ultimo.valor.toFixed(2) + ' <span>' + esc(unidad) + '</span></p></div>' +
      '<p class="redcafe-grafico-var ' + (sube ? "is-sube" : "is-baja") + '">' +
      (sube ? "▲" : "▼") + " " + Math.abs(pct).toFixed(1) + '% <span>' + g.puntos.length + ' meses</span></p>';

    // Marcados como propios para que el vigilante de ruta los retire al
    // navegar; si no, la cabecera y el gráfico se quedarían pegados.
    cabecera.setAttribute("data-redcafe-propio", "1");
    g.svg.setAttribute("data-redcafe-propio", "1");
    host.insertBefore(cabecera, host.firstChild);
    host.appendChild(g.svg);
    activarLectura(g, host, unidad);
  }

  function iniciar() {
    fetch("/api/precios.php?action=list", { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok && j.data) montar(j.data); })
      .catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(iniciar, 1500);
  else window.addEventListener("load", function () { setTimeout(iniciar, 1500); }, { once: true });
})();
