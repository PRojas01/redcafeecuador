// Pantalla de importación: sube el paquete cifrado a /api/importacion.php.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var simulado = null; // archivo simulado con éxito: solo ese se puede aplicar

  function texto(el, t, clase) { el.textContent = t; el.className = "estado" + (clase ? " " + clase : ""); }

  function pintarInforme(d) {
    var cont = $("informe");
    cont.textContent = "";
    var tabla = document.createElement("table");
    tabla.innerHTML = "<thead><tr><th>Archivo</th><th>Destino</th><th>Filas</th><th>Resultado</th></tr></thead>";
    var cuerpo = document.createElement("tbody");
    (d.informe || []).forEach(function (i) {
      var tr = document.createElement("tr");
      [i.archivo, i.destino, String(i.filas), i.accion].forEach(function (v) { var td = document.createElement("td"); td.textContent = v; tr.appendChild(td); });
      cuerpo.appendChild(tr);
    });
    tabla.appendChild(cuerpo);
    cont.appendChild(tabla);
    if (d.avisos && d.avisos.length) {
      var ul = document.createElement("ul");
      ul.className = "nota";
      d.avisos.slice(0, 50).forEach(function (a) { var li = document.createElement("li"); li.textContent = a; ul.appendChild(li); });
      if (d.avisos.length > 50) { var li = document.createElement("li"); li.textContent = "… y " + (d.avisos.length - 50) + " avisos más."; ul.appendChild(li); }
      cont.appendChild(ul);
    }
  }

  function enviar(accion) {
    var f = $("paquete").files[0], clave = $("clave").value;
    if (!f) return texto($("mensaje"), "Elige el paquete.", "error");
    if (clave.length < 12) return texto($("mensaje"), "Escribe la contraseña del paquete.", "error");
    var datos = new FormData();
    datos.append("paquete", f);
    datos.append("clave", clave);
    $("simular").disabled = true; $("aplicar").disabled = true;
    texto($("mensaje"), accion === "aplicar" ? "Importando… no cierres esta página." : "Descifrando y simulando…");
    fetch("/api/importacion.php?action=" + accion, { method: "POST", body: datos, credentials: "include" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) { texto($("mensaje"), j.error || "No se pudo.", "error"); simulado = null; return; }
        pintarInforme(j.data);
        if (accion === "simular") {
          simulado = f;
          texto($("mensaje"), "Simulación correcta. Revisa la tabla y, si está bien, pulsa «Importar de verdad».", "ok");
        } else {
          simulado = null;
          $("clave").value = "";
          texto($("mensaje"), "Importación terminada. Borra el paquete de tu equipo cuando compruebes que todo está bien.", "ok");
        }
      })
      .catch(function () { texto($("mensaje"), "Error de conexión.", "error"); })
      .then(function () {
        $("simular").disabled = false;
        $("aplicar").disabled = !(simulado && $("paquete").files[0] === simulado);
      });
  }

  $("simular").addEventListener("click", function () { enviar("simular"); });
  $("aplicar").addEventListener("click", function () {
    if (window.confirm("¿Importar los datos reales en la base? Lo que ya exista no se duplica.")) enviar("aplicar");
  });
  $("paquete").addEventListener("change", function () { simulado = null; $("aplicar").disabled = true; });

  fetch("/api/importacion.php?action=estado", { credentials: "include" })
    .then(function (r) { return r.json().then(function (j) { return { codigo: r.status, j: j }; }); })
    .then(function (x) {
      if (x.codigo === 404) return texto($("estado"), "La importación está apagada. Para usarla, añade REDCAFE_IMPORTACION=1 en las variables del panel y vuelve a desplegar.", "error");
      if (x.codigo === 403) { $("estado").innerHTML = ""; texto($("estado"), "Primero entra como administrador en /admin/ y vuelve a esta página.", "error"); return; }
      if (!x.j.ok) return texto($("estado"), x.j.error || "No disponible.", "error");
      var d = x.j.data;
      texto($("estado"), "Base actual: " + d.usuarios + " miembros y " + d.documentos + " registros de contenido." + (d.ya_importado ? " Ya se importó antes: lo repetido no se duplica." : ""));
      $("form").hidden = false;
    })
    .catch(function () { texto($("estado"), "Error de conexión.", "error"); });
})();
