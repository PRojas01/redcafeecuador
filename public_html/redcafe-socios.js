/* Red Café Ecuador — Invitados estratégicos (administración)
   Sigue el patrón de redcafe-admin-servicios.js: la API decide si el usuario
   es administración; si devuelve 403, esta sección no se monta.
*/
(function () {
  "use strict";

  if (window.__redcafeSociosAdmin) return;
  window.__redcafeSociosAdmin = true;

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function json(url) {
    return fetch(url, { credentials: "include", cache: "no-store" })
      .then(function (r) {
        if (!r.ok) return { ok: false, status: r.status };
        return r.json();
      })
      .catch(function () { return { ok: false }; });
  }

  function fecha(v) {
    if (!v) return "";
    var d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" });
  }

  function siNo(v) {
    return v ? "Sí" : "No";
  }

  function campo(label, valor) {
    return '<p><span class="redcafe-pub-tag">' + esc(label) + '</span><br><strong>' +
      esc(valor || "—") + '</strong></p>';
  }

  function tarjeta(item) {
    return '<article class="redcafe-pub-card">' +
      '<div class="redcafe-pub-head">' +
        '<h4>' + esc(item.name || "Invitado sin nombre") + '</h4>' +
        '<span class="redcafe-pub-tag">' + esc(item.profile_type || "Otro") + '</span>' +
      '</div>' +
      '<div class="redcafe-pub-grid">' +
        campo("Correo", item.email) +
        campo("Teléfono", item.phone) +
        campo("Organización", item.organization) +
        campo("Interés", item.interest) +
        campo("Privacidad", siNo(item.accepted_privacy)) +
        campo("Confidencialidad", siNo(item.accepted_confidentiality)) +
        campo("Fecha", fecha(item.created_at)) +
        campo("Participación elegida", Array.isArray(item.participacion) ? item.participacion.join(" · ") : item.participacion) +
        campo("Tipo de retroalimentación", item.feedback_type) +
        campo("Siguiente paso", item.next_step) +
      '</div>' +
      '<div class="redcafe-pub-grid">' +
        campo("Retroalimentación", item.feedback) +
        campo("Contrapropuesta", item.counterproposal) +
      '</div>' +
    '</article>';
  }

  function pintar(contexto, invitados) {
    if (!invitados.length) {
      contexto.lista.innerHTML = '<p class="redcafe-pub-vacio">Aún no hay invitados estratégicos registrados.</p>';
      return;
    }
    contexto.lista.innerHTML = invitados.map(tarjeta).join("");
  }

  function montar(datosIniciales) {
    var main = document.querySelector("main");
    if (!main || document.getElementById("redcafe-socios-admin")) return;

    var seccion = document.createElement("section");
    seccion.id = "redcafe-socios-admin";
    seccion.className = "redcafe-pub-seccion";
    seccion.setAttribute("data-redcafe-propio", "1");
    seccion.innerHTML =
      '<div class="redcafe-pub-wrap">' +
        '<p class="redcafe-pub-rotulo">Administración</p>' +
        '<h3 class="redcafe-pub-titulo">Invitados estratégicos</h3>' +
        '<div id="redcafe-socios-admin-lista">' +
          '<p class="redcafe-pub-vacio">Cargando invitados estratégicos…</p>' +
        '</div>' +
      '</div>';

    var recursos = document.getElementById("redcafe-panel-resources");
    if (recursos && recursos.parentNode === main) main.insertBefore(seccion, recursos);
    else main.appendChild(seccion);

    pintar({
      seccion: seccion,
      lista: seccion.querySelector("#redcafe-socios-admin-lista")
    }, (datosIniciales && datosIniciales.invitados) || []);
  }

  function enRuta() {
    var p = location.pathname;
    return p.indexOf("/admin") === 0 || p.indexOf("/panel") === 0;
  }

  function preguntarALaApi() {
    json("/api/socios.php?action=list").then(function (res) {
      if (!res || !res.ok) return;
      if (!enRuta()) return;
      montar(res.data || res);
    });
  }

  function iniciar() {
    if (!enRuta()) return;
    if (location.pathname.indexOf("/admin") === 0) { preguntarALaApi(); return; }
    json("/api/auth.php?action=me").then(function (res) {
      var u = res && res.ok && res.data && res.data.user;
      if (!u) return;
      var roles = u.roles || [u.rol];
      var esAdmin = !!u.admin || !!u.is_admin || u.rol === "admin" ||
        (roles.indexOf && roles.indexOf("admin") >= 0);
      if (esAdmin) preguntarALaApi();
    });
  }

  if (document.readyState === "complete") setTimeout(iniciar, 1200);
  else window.addEventListener("load", function () { setTimeout(iniciar, 1200); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 900); });
})();
