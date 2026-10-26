/* Red Café Ecuador — registro de pedidos y actividad de la Red
   ------------------------------------------------------------------
   El panel mostraba los pedidos vivos, pero no había forma de revisar lo que
   ha pasado: qué se pidió, a quién, por cuánto y cómo terminó. Esta sección
   es el registro: cada miembro ve su historial completo con la traza de cada
   operación, y la administración ve el de toda la Red.

   Se monta en un contenedor propio dentro del <main> del panel. No toca ni
   vacía nada de lo que pinta React.
*/
(function () {
  "use strict";

  var ESTADOS_ORDEN = ["Solicitado", "Aceptado", "En camino", "Entregado", "Cancelado"];
  var datos = null;

  function json(url) {
    return fetch(url, { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false }; });
  }

  function el(tag, attrs, texto) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
      if (k === "className") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }

  function dinero(v) {
    var n = Number(v) || 0;
    return "$" + n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fecha(iso) {
    var t = Date.parse(iso || "");
    if (!t) return "—";
    return new Date(t).toLocaleDateString("es-EC", {
      day: "2-digit", month: "short", year: "numeric"
    });
  }

  function fechaHora(iso) {
    var t = Date.parse(iso || "");
    if (!t) return "";
    return new Date(t).toLocaleString("es-EC", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    });
  }

  var NOMBRE_EVENTO = {
    "pedido-creado": "Pedido creado",
    "servicio-solicitado": "Servicio solicitado",
    "pedido-estado": "Cambio de estado",
    "pedido-cancelado": "Cancelado",
    "pedido-eliminado": "Retirado",
    "pedido-entregado": "Recepción confirmada"
  };

  /* ── Una fila del registro ───────────────────────────────────────── */

  function filaPedido(p) {
    var art = el("article", { className: "redcafe-reg-fila", "data-estado": p.estado || "" });

    var cab = el("div", { className: "redcafe-reg-cab" });
    cab.appendChild(el("span", { className: "redcafe-reg-nro" }, "#" + p.nro));
    cab.appendChild(el("span", { className: "redcafe-reg-concepto" }, p.concepto || "—"));
    cab.appendChild(el("span", { className: "redcafe-reg-estado" }, p.estado || "Sin estado"));
    art.appendChild(cab);

    var meta = el("dl", { className: "redcafe-reg-meta" });
    function dato(clave, valor) {
      meta.appendChild(el("dt", {}, clave));
      meta.appendChild(el("dd", {}, valor));
    }
    dato("Tipo", p.tipo === "servicio" ? "Servicio" : "Café");
    dato(p.mi_papel === "solicitante" ? "Le pediste a" : "Te lo pidió",
         p.mi_papel === "solicitante" ? (p.contraparte || "—") : (p.solicitante || "—"));
    dato("Cantidad", p.tipo === "servicio"
      ? (p.cantidad || 1) + " unidad(es)"
      : (p.sacos || 0) + " saco(s)");
    dato("Total", dinero(p.total));
    dato("Fecha", fecha(p.creado || p.fecha));
    art.appendChild(meta);

    var traza = Array.isArray(p.traza) ? p.traza : [];
    if (traza.length) {
      var det = el("details", { className: "redcafe-reg-traza" });
      det.appendChild(el("summary", {}, "Historial de la operación (" + traza.length + ")"));
      var ol = el("ol", {});
      traza.forEach(function (t) {
        var li = el("li", {});
        li.appendChild(el("strong", {}, NOMBRE_EVENTO[t.evento] || t.evento || "Movimiento"));
        li.appendChild(el("span", { className: "redcafe-reg-traza-fecha" }, " · " + fechaHora(t.ts)));
        if (t.detalle) li.appendChild(el("p", {}, t.detalle));
        ol.appendChild(li);
      });
      det.appendChild(ol);
      art.appendChild(det);
    }
    return art;
  }

  /* ── Descarga en CSV ─────────────────────────────────────────────── */
  // Para llevar el registro a una hoja de cálculo o a la contabilidad.

  function csvSeguro(v) {
    var s = String(v === null || v === undefined ? "" : v);
    // Una celda que empieza por = + - @ la interpreta Excel como fórmula.
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function descargarCsv() {
    if (!datos || !datos.pedidos.length) return;
    var cabecera = ["Nro", "Tipo", "Concepto", "Estado", "Fecha", "Solicitante", "Contraparte", "Total"];
    var filas = datos.pedidos.map(function (p) {
      return [p.nro, p.tipo === "servicio" ? "Servicio" : "Café", p.concepto, p.estado,
              fecha(p.creado || p.fecha), p.solicitante, p.contraparte,
              (Number(p.total) || 0).toFixed(2)].map(csvSeguro).join(";");
    });
    var texto = "﻿" + [cabecera.map(csvSeguro).join(";")].concat(filas).join("\r\n");
    var url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = "registro-pedidos-redcafe-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* ── Pintado ─────────────────────────────────────────────────────── */

  function pintar(seccion) {
    var lista = seccion.querySelector(".redcafe-reg-lista");
    var resumen = seccion.querySelector(".redcafe-reg-resumen");
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    while (resumen.firstChild) resumen.removeChild(resumen.firstChild);

    var pedidos = datos.pedidos;
    var filtro = seccion.querySelector(".redcafe-reg-filtro").value;
    if (filtro) pedidos = pedidos.filter(function (p) { return p.estado === filtro; });

    var r = datos.resumen || {};
    resumen.appendChild(el("span", {}, (r.total || 0) + " operación(es) registrada(s)"));
    resumen.appendChild(el("span", {}, "Valor acumulado: " + dinero(r.monto)));
    Object.keys(r.por_estado || {}).forEach(function (e) {
      resumen.appendChild(el("span", { className: "redcafe-reg-chip" }, e + ": " + r.por_estado[e]));
    });

    if (!pedidos.length) {
      lista.appendChild(el("p", { className: "redcafe-pub-vacio" },
        filtro ? "No hay operaciones en ese estado."
               : "Todavía no tienes operaciones registradas. Aquí quedará el historial de cada pedido y cada solicitud de servicio."));
      return;
    }
    pedidos.forEach(function (p) { lista.appendChild(filaPedido(p)); });
  }

  function montar() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-registro-actividad")) return;

    var seccion = el("section", {
      id: "redcafe-registro-actividad",
      className: "redcafe-pub-seccion redcafe-reg-seccion",
      "data-redcafe-propio": "1"
    });
    var wrap = el("div", { className: "redcafe-pub-wrap" });
    wrap.appendChild(el("p", { className: "redcafe-pub-rotulo" }, "Registro de la Red"));
    wrap.appendChild(el("h3", { className: "redcafe-pub-titulo" }, "Historial de pedidos y solicitudes"));
    wrap.appendChild(el("p", { className: "redcafe-pub-intro" },
      "Cada operación con su traza completa: quién la pidió, a quién, por cuánto y por qué estados pasó. " +
      "Nadie ve el historial de otro miembro; la administración ve el de toda la Red."));

    var barra = el("div", { className: "redcafe-reg-barra" });
    var etiqueta = el("label", { className: "redcafe-reg-etiqueta" });
    etiqueta.appendChild(el("span", {}, "Estado"));
    var filtro = el("select", { className: "redcafe-reg-filtro" });
    filtro.appendChild(el("option", { value: "" }, "Todos"));
    ESTADOS_ORDEN.forEach(function (e) { filtro.appendChild(el("option", { value: e }, e)); });
    etiqueta.appendChild(filtro);
    barra.appendChild(etiqueta);
    var csv = el("button", { type: "button", className: "redcafe-reg-csv" }, "Descargar CSV");
    barra.appendChild(csv);
    wrap.appendChild(barra);

    wrap.appendChild(el("div", { className: "redcafe-reg-resumen" }));
    var lista = el("div", { className: "redcafe-reg-lista" });
    lista.appendChild(el("p", { className: "redcafe-pub-vacio" }, "Cargando el registro…"));
    wrap.appendChild(lista);
    seccion.appendChild(wrap);

    var recursos = document.getElementById("redcafe-panel-resources");
    if (recursos && recursos.parentNode === main) main.insertBefore(seccion, recursos);
    else main.appendChild(seccion);

    filtro.addEventListener("change", function () { if (datos) pintar(seccion); });
    csv.addEventListener("click", descargarCsv);

    json("/api/actividad.php?action=pedidos&dias=365").then(function (res) {
      if (!res || !res.ok || !res.data) {
        while (lista.firstChild) lista.removeChild(lista.firstChild);
        lista.appendChild(el("p", { className: "redcafe-pub-vacio" },
          "No se pudo cargar el registro. Vuelve a intentarlo en un momento."));
        return;
      }
      datos = {
        pedidos: Array.isArray(res.data.pedidos) ? res.data.pedidos : [],
        resumen: res.data.resumen || {},
        alcance: res.data.alcance || "propia"
      };
      if (datos.alcance === "red") {
        wrap.querySelector(".redcafe-pub-rotulo").textContent = "Registro de la Red · administración";
      }
      pintar(seccion);
    });
  }

  function iniciar() {
    if (location.pathname.indexOf("/panel") !== 0) return;
    fetch("/api/auth.php?action=me", { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var u = res && res.ok && res.data && res.data.user;
        if (!u || !u.id) return;
        [1400, 3200, 5200].forEach(function (t) { setTimeout(montar, t); });
      })
      .catch(function () {});
  }

  if (document.readyState === "complete") setTimeout(iniciar, 900);
  else window.addEventListener("load", function () { setTimeout(iniciar, 900); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 900); });
})();
