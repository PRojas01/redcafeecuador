/* Red Café Ecuador — respaldos de datos en el panel de administración
   ------------------------------------------------------------------
   La copia se hace sola una vez al día (la dispara la primera consulta de la
   campana). Aquí se ve cuándo fue la última, se puede forzar una, descargarla
   para guardarla fuera del hosting y borrar las que sobren.

   Quien autoriza es la API (api/respaldo.php): sin sesión de administración
   responde 403 y esta sección no llega a existir.
*/
(function () {
  "use strict";

  if (window.__redcafeAdminRespaldos) return;
  window.__redcafeAdminRespaldos = true;

  var intentos = 0;
  var cargando = false;

  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function json(url, opciones) {
    return fetch(url, Object.assign({ credentials: "include", cache: "no-store" }, opciones || {}))
      .then(function (r) {
        return r.json().catch(function () { return { ok: false }; })
          .then(function (j) { j.__http = r.status; return j; });
      })
      .catch(function () { return { ok: false, __http: 0 }; });
  }

  function tamano(bytes) {
    var n = Number(bytes) || 0;
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function cuando(iso) {
    var t = Date.parse(iso || "");
    if (!t) return "sin fecha";
    var horas = Math.floor((Date.now() - t) / 3600000);
    var fecha = new Date(t).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
    if (horas < 1) return fecha + " (hace menos de una hora)";
    if (horas < 48) return fecha + " (hace " + horas + " h)";
    return fecha + " (hace " + Math.floor(horas / 24) + " días)";
  }

  function estadoHtml(d) {
    var u = d.ultimo;
    var viejo = !u || (Date.now() - Date.parse(u.fecha || "")) > 48 * 3600000;
    return '<div class="redcafe-resp-estado' + (viejo ? " es-alerta" : " es-ok") + '">' +
      '<p class="redcafe-resp-titulo">' +
        (u ? "Última copia: " + esc(cuando(u.fecha)) : "Todavía no hay ninguna copia") + '</p>' +
      '<p class="redcafe-resp-detalle">' +
        esc(d.total) + (Number(d.total) === 1 ? " copia guardada · " : " copias guardadas · ") +
        esc(tamano(d.bytes_total)) + " en total · " + esc(d.archivos) + " archivos de datos en cada copia" +
      '</p>' +
      '<p class="redcafe-resp-detalle">' +
        (d.fuera_web
          ? "Se guardan fuera de la carpeta pública del sitio."
          : "Se guardan en data/_respaldos, que no es accesible desde internet.") +
        " Formato " + (d.zip ? ".zip" : ".json.gz") + "." +
      '</p>' +
      '<div class="redcafe-resp-acciones">' +
        '<button type="button" class="redcafe-resp-crear">Crear copia ahora</button>' +
        '<span class="redcafe-resp-msg" role="status" aria-live="polite"></span>' +
      '</div>' +
    '</div>';
  }

  function listaHtml(copias) {
    if (!copias.length) return '<p class="redcafe-resp-vacio">Aún no hay copias guardadas.</p>';
    return '<table class="redcafe-resp-tabla"><thead><tr>' +
      '<th>Fecha</th><th>Tamaño</th><th>Acciones</th></tr></thead><tbody>' +
      copias.map(function (c) {
        return '<tr><td>' + esc(new Date(Date.parse(c.fecha)).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })) + '</td>' +
          '<td>' + esc(tamano(c.bytes)) + '</td>' +
          '<td class="redcafe-resp-fila-acciones">' +
            '<a href="/api/respaldo.php?action=descargar&archivo=' + encodeURIComponent(c.archivo) + '">Descargar</a>' +
            '<button type="button" data-borrar="' + esc(c.archivo) + '">Borrar</button>' +
          '</td></tr>';
      }).join("") +
      '</tbody></table>';
  }

  function ayudaHtml(d) {
    return '<details class="redcafe-resp-ayuda"><summary>Cómo guardar una copia fuera del hosting y cómo restaurar</summary>' +
      '<p><strong>Copia fuera del hosting:</strong> descarga una copia al menos una vez al mes y guárdala en tu computadora o en tu nube. ' +
      'Si el hosting falla por completo, las copias que viven en él se pierden también.</p>' +
      '<p><strong>Restaurar:</strong> descomprime el archivo y sube el contenido de la carpeta <code>data/</code> a la carpeta <code>data/</code> del sitio, sobrescribiendo. ' +
      'Hazlo solo si los datos actuales están dañados: sobrescribir borra lo que se haya hecho después de esa copia.</p>' +
      '<p><strong>Tarea programada (opcional):</strong> en cPanel → Cron Jobs, una vez al día:<br>' +
      '<code>' + esc(d.cron) + '</code><br>' +
      'o bien, con visitas web: <code>curl -s "https://redcafeecuador.com' + esc(d.cron_url) + '"</code>. ' +
      'No hace falta: la copia diaria ya se dispara sola cuando alguien entra.</p>' +
      '<p>La copia no incluye la contraseña de administración ni las fotos subidas; las fotos viven en <code>uploads/</code> y conviene descargarlas aparte de vez en cuando.</p>' +
      '</details>';
  }

  function pintar(seccion, d) {
    seccion.innerHTML = '<h2 class="redcafe-resp-h2">Respaldo de datos</h2>' +
      '<p class="redcafe-resp-intro">Copia automática diaria de miembros, lotes, servicios, requerimientos, pedidos, cursos y mensajes.</p>' +
      estadoHtml(d) + listaHtml(d.copias || []) + ayudaHtml(d);

    var msg = seccion.querySelector(".redcafe-resp-msg");
    seccion.querySelector(".redcafe-resp-crear").addEventListener("click", function (ev) {
      var boton = ev.currentTarget;
      boton.disabled = true;
      msg.textContent = "Creando copia…";
      json("/api/respaldo.php?action=crear", { method: "POST" }).then(function (res) {
        boton.disabled = false;
        if (!res || !res.ok) { msg.textContent = (res && res.error) || "No se pudo crear la copia."; return; }
        msg.textContent = "Copia creada.";
        cargar(seccion);
      });
    });

    Array.prototype.slice.call(seccion.querySelectorAll("[data-borrar]")).forEach(function (b) {
      b.addEventListener("click", function () {
        var archivo = b.getAttribute("data-borrar");
        if (!window.confirm("¿Borrar la copia " + archivo + "? No se puede deshacer.")) return;
        json("/api/respaldo.php?action=borrar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archivo: archivo })
        }).then(function (res) {
          if (!res || !res.ok) { window.alert((res && res.error) || "No se pudo borrar."); return; }
          cargar(seccion);
        });
      });
    });
  }

  function cargar(seccion) {
    if (cargando) return;
    cargando = true;
    json("/api/respaldo.php?action=estado").then(function (res) {
      cargando = false;
      if (!res || !res.ok || !res.data) return;
      pintar(seccion, res.data);
    });
  }

  function montar() {
    if (document.getElementById("redcafe-admin-respaldos")) return true;
    var main = document.querySelector("main");
    if (!main) return false;
    var seccion = document.createElement("section");
    seccion.id = "redcafe-admin-respaldos";
    seccion.className = "redcafe-resp";
    seccion.setAttribute("data-redcafe-propio", "1");
    // Antes de las verificaciones si ya están puestas, y si no, al final del
    // panel: así queda junto al resto de herramientas de administración.
    var vecino = document.getElementById("redcafe-admin-difusion")
      || document.getElementById("redcafe-admin-verificaciones");
    if (vecino && vecino.parentNode) vecino.parentNode.insertBefore(seccion, vecino);
    else main.appendChild(seccion);
    cargar(seccion);
    return true;
  }

  function iniciar() {
    if (location.pathname.indexOf("/admin") !== 0) return;
    // Sin sesión de administración la API responde 403 y no se pinta nada.
    json("/api/respaldo.php?action=estado").then(function (res) {
      if (!res || !res.ok) return;
      montar();
      // React repinta el panel varias veces al cargar y se lleva por delante
      // lo que hay dentro de <main>. Se vuelve a poner, con tope: 40 vueltas
      // de segundo y medio, un minuto en total, y nunca más.
      var vueltas = 0;
      var reloj = setInterval(function () {
        vueltas++;
        montar();
        if (vueltas >= 40) clearInterval(reloj);
      }, 1500);
    });
  }

  if (document.readyState === "complete") setTimeout(iniciar, 600);
  else window.addEventListener("load", function () { setTimeout(iniciar, 600); }, { once: true });
  document.addEventListener("redcafe:ruta", function () { setTimeout(iniciar, 800); });
})();
