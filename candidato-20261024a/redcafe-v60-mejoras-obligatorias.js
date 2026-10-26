(function () {
  /* Los textos por perfil se comparten con redcafe-afiliate.js, que es quien
     los pinta ahora en su propio contenedor debajo del selector. Antes se
     escribían dentro de secciones de React —h2, p y ol ajenos— y eso es
     exactamente lo que rompe su reconciliación. */
  var perfiles = {
    Productor: {
      hero: "Publica lotes de café y atiende compradores desde tu panel.",
      titulo: "Publica lotes de café y organiza tus oportunidades de venta",
      texto: "Tu cuenta conecta tu perfil productivo con marketplace, mapa nacional, academia, pedidos y servicios Redcafe para vender café con más información.",
      pasos: [
        ["01", "Publicas lotes de café con contexto", "Registra provincia, finca, altura, proceso, estado del grano, fotos y datos básicos para que el lote aparezca de forma coherente en marketplace y mapa."],
        ["02", "Recibes pedidos y cotizaciones", "Los compradores pueden solicitar tu café, enviar pedidos y dejar trazabilidad comercial dentro de tu panel."],
        ["03", "Pides servicios cuando los necesitas", "Catación, expediente de trazabilidad, asesoría, flete o pilado se solicitan desde la Red sin salir del flujo de trabajo."]
      ],
      cierre: "Cada lote bien presentado mejora tu oportunidad de venta y también fortalece la reputación del café ecuatoriano como origen.",
      guia: ["Tu panel se enfoca en vender y organizar tu café", "Podrás publicar lotes de café desde grano sin proceso hasta producto terminado, agregar finca, altura, proceso, fotos y ubicación para que el mapa y el marketplace se actualicen desde la misma publicación.", ["Publicar lotes de café", "Recibir pedidos y cotizaciones", "Pedir flete, pilado, catación o trazabilidad"]]
    },
    "Tostador / Comerciante": {
      hero: "Organiza compras, servicios y abastecimiento con trazabilidad.",
      titulo: "Compra, tuesta y comercializa café con trazabilidad",
      texto: "Tu perfil reúne búsqueda de lotes de café, pedidos, servicios técnicos y contactos para organizar mejor el abastecimiento y la venta.",
      pasos: [
        ["01", "Encuentras lotes de café publicados", "Explora productores, perfiles de taza, ubicaciones y datos del lote antes de iniciar una solicitud."],
        ["02", "Ordenas tus operaciones", "Los pedidos y cotizaciones quedan visibles en tu panel para dar seguimiento a compras y servicios."],
        ["03", "Solicitas soporte especializado", "Puedes pedir catación, trazabilidad, asesoría comercial, control de calidad o logística según la operación."]
      ],
      cierre: "Un tostador o comerciante con información clara compra mejor, vende mejor y ayuda a elevar la confianza en el origen Ecuador.",
      guia: ["Tu panel se enfoca en abastecimiento y compras", "Podrás buscar lotes de café por origen, comparar información y abrir pedidos o cotizaciones con productores y proveedores de servicio.", ["Buscar lotes de café", "Solicitar servicios", "Organizar compras y costos"]]
    },
    Comprador: {
      hero: "Encuentra café ecuatoriano y solicita productos o servicios.",
      titulo: "Encuentra café ecuatoriano con información verificable",
      texto: "Tu cuenta está pensada para explorar lotes de café, pedir muestras o compras, calificar calidad y solicitar servicios asociados.",
      pasos: [
        ["01", "Comparas opciones reales", "Revisa lote, finca, provincia, proceso y publicaciones disponibles desde el marketplace."],
        ["02", "Solicitas productos o servicios", "Cada pedido queda asociado a tu panel para que puedas revisar estado, contacto y continuidad."],
        ["03", "Calificas la experiencia", "Tus valoraciones de calidad de café, servicio y atención ayudan a construir reputación dentro de la Red."]
      ],
      cierre: "Comprar con trazabilidad reduce incertidumbre y premia a quienes trabajan mejor el café ecuatoriano.",
      guia: ["Tu panel se enfoca en encontrar café con contexto", "Podrás comprar café de origen, revisar información del lote y pedir servicios relacionados cuando exista una operación.", ["Explorar marketplace", "Solicitar pedidos", "Calificar servicio y calidad"]]
    },
    "Bar / Cafetería": {
      hero: "Haz visible tu barra y conecta tu abastecimiento.",
      titulo: "Haz visible tu cafetería y organiza tu abastecimiento",
      texto: "Tu perfil conecta tu barra con productores, tostadores, proveedores, pedidos, servicios y valoración de clientes.",
      pasos: [
        ["01", "Presentas tu cafetería", "Muestra ubicación, propuesta, cafés servidos y datos útiles para que otros miembros te encuentren."],
        ["02", "Pides café y servicios", "Solicita lotes de café, insumos, equipos, asesoría, capacitación o soporte técnico desde marketplace."],
        ["03", "Construyes reputación", "Las calificaciones de servicio y experiencia ayudan a que tu cafetería gane visibilidad dentro de la Red."]
      ],
      cierre: "Una cafetería conectada compra mejor, comunica mejor el origen y acerca el café ecuatoriano al consumidor final.",
      guia: ["Tu panel se enfoca en tu barra y abastecimiento", "Podrás mostrar tu cafetería, organizar menú, pedir café y publicar necesidades de abastecimiento.", ["Menú digital", "Pedidos a proveedores", "Ingresos y gastos"]]
    },
    Barista: {
      hero: "Accede a formación, recetas y oportunidades de la Red.",
      titulo: "Aprende, participa y conecta con oportunidades",
      texto: "Tu cuenta prioriza academia, recetas, comunidad, cafeterías vinculadas y servicios que fortalecen tu trabajo en barra.",
      pasos: [
        ["01", "Accedes a formación", "La Academia y los contenidos de preparación quedan disponibles desde tu cuenta gratuita."],
        ["02", "Te conectas con la Red", "Puedes participar en comunidad, seguir cafeterías, conocer cafés de origen y encontrar oportunidades relacionadas."],
        ["03", "Construyes perfil profesional", "Tu actividad, servicios y valoraciones ayudan a mostrar experiencia ante cafeterías y miembros."]
      ],
      cierre: "Cuando el barista comunica mejor el origen, el consumidor entiende mejor el valor del café ecuatoriano.",
      guia: ["Tu panel se enfoca en capacitación y oportunidades", "Podrás acceder a Academia, recetas, comunidad y oportunidades relacionadas con barras afiliadas.", ["Academia", "Recetas", "Vinculación con cafeterías"]]
    },
    "Verificador / Catador": {
      hero: "Ofrece catación, verificación e informes solicitables.",
      titulo: "Recibe solicitudes de verificación, catación e informes",
      texto: "Tu perfil permite ofrecer servicios técnicos, responder pedidos y dejar evidencia verificable para productores, compradores y Redcafe.",
      pasos: [
        ["01", "Publicas tus servicios", "Catación, verificación de finca, análisis de calidad o informes técnicos pueden estar disponibles en marketplace."],
        ["02", "Atiendes solicitudes", "Los miembros solicitan el servicio y tú puedes dar continuidad desde el panel."],
        ["03", "Respaldas decisiones", "Los informes y calificaciones ayudan a que la negociación no dependa solo de la palabra."]
      ],
      cierre: "La verificación independiente aumenta la confianza de compradores y mejora la reputación del origen.",
      guia: ["Tu panel se enfoca en evaluaciones e informes", "Podrás ofrecer catación, verificación, informes técnicos y recibir solicitudes de miembros.", ["Solicitudes de evaluación", "Informes técnicos", "Calificaciones de servicio"]]
    },
    "Proveedor de Equipos e Insumos": {
      hero: "Publica productos, servicios y soporte para la cadena.",
      titulo: "Publica productos, insumos y soporte para la cadena",
      texto: "Tu cuenta está pensada para mostrar oferta, recibir solicitudes, cotizar y construir confianza con valoraciones de miembros.",
      pasos: [
        ["01", "Muestras lo que ofreces", "Equipos, insumos, mantenimiento, instalación o soporte pueden organizarse como publicaciones o servicios."],
        ["02", "Recibes pedidos", "Los miembros solicitan productos o servicios desde marketplace y el seguimiento queda en tu panel."],
        ["03", "Ganas reputación", "Las calificaciones permiten diferenciar proveedores confiables dentro de la Red."]
      ],
      cierre: "Un proveedor visible y evaluado ayuda a que la cadena trabaje con mejores herramientas y menos incertidumbre.",
      guia: ["Tu panel se enfoca en publicar productos y servicios", "Podrás mostrar equipos, insumos, soporte técnico y recibir solicitudes de cotización.", ["Publicar servicios", "Recibir pedidos", "Valoraciones de clientes"]]
    },
    Transportista: {
      hero: "Ofrece rutas, fletes y seguimiento logístico.",
      titulo: "Ofrece rutas y logística para mover café con control",
      texto: "Tu perfil conecta cobertura, disponibilidad, solicitudes de flete y seguimiento de servicios logísticos.",
      pasos: [
        ["01", "Publicas cobertura", "Indica zonas, rutas, tipo de carga y condiciones para que los miembros sepan cuándo solicitarte."],
        ["02", "Recibes fletes", "Productores, compradores, tostadores o cafeterías pueden pedir transporte desde marketplace o panel."],
        ["03", "Registras continuidad", "El historial de pedidos y valoraciones ayuda a construir confianza operativa."]
      ],
      cierre: "Una logística clara evita pérdidas, mejora tiempos y protege el valor del café durante la operación.",
      guia: ["Tu panel se enfoca en rutas y fletes", "Podrás publicar cobertura, recibir solicitudes de transporte y construir historial de entregas.", ["Publicar rutas", "Recibir fletes", "Historial de entregas"]]
    },
    "Pilador / Beneficiadero": {
      hero: "Recibe solicitudes de pilado y procesamiento.",
      titulo: "Ofrece beneficiado y procesamiento con seguimiento",
      texto: "Tu cuenta permite publicar capacidad, recibir solicitudes de pilado o beneficiado y registrar datos del servicio.",
      pasos: [
        ["01", "Presentas tu capacidad", "Describe ubicación, proceso, volumen, disponibilidad y condiciones del servicio."],
        ["02", "Atiendes pedidos de miembros", "Los productores o comerciantes pueden solicitar procesamiento y revisar estado desde el panel."],
        ["03", "Aportas datos al lote", "Humedad, merma, rendimiento y observaciones pueden fortalecer la trazabilidad."]
      ],
      cierre: "Un buen procesamiento conserva calidad y permite que cada lote llegue mejor preparado al mercado.",
      guia: ["Tu panel se enfoca en procesamiento", "Podrás publicar capacidad de pilado, recibir solicitudes y registrar lotes de café procesados.", ["Solicitudes de pilado", "Merma y humedad", "Historial de servicio"]]
    },
    Exportador: {
      hero: "Coordina lotes de café, trazabilidad y servicios de exportación.",
      titulo: "Encuentra lotes de café, documentación y servicios para exportar",
      texto: "Tu perfil se orienta a abastecimiento, trazabilidad, requisitos, verificación y coordinación de servicios especializados.",
      pasos: [
        ["01", "Buscas lotes de café con contexto", "Revisa origen, finca, proceso, calidad y disponibilidad antes de iniciar contacto."],
        ["02", "Solicitas documentación", "Expediente de trazabilidad, EUDR, catación o verificación pueden pedirse desde marketplace."],
        ["03", "Das seguimiento operativo", "Pedidos, servicios y contactos comerciales quedan organizados para reducir errores en la operación."]
      ],
      cierre: "Exportar con información clara protege al comprador y abre mejores puertas para el café ecuatoriano.",
      guia: ["Tu panel se enfoca en lotes de café y documentación", "Podrás buscar lotes con trazabilidad, solicitar verificaciones y coordinar servicios de exportación.", ["Lotes auditados", "EUDR", "Servicios de exportación"]]
    },
    "Amante del Café": {
      hero: "Descubre cafés, recetas, cafeterías y aprendizaje.",
      titulo: "Descubre, aprende y compra café de origen",
      texto: "Tu cuenta te acerca a cafés ecuatorianos, recetas, academia, cafeterías y publicaciones abiertas de la Red.",
      pasos: [
        ["01", "Exploras cafés y contenidos", "Puedes conocer lotes de café, historias, recetas y perfiles de taza sin perderte entre datos técnicos innecesarios."],
        ["02", "Pides productos disponibles", "Cuando un café o servicio esté publicado, podrás solicitarlo y revisar continuidad en tu panel."],
        ["03", "Calificas tu experiencia", "Tus opiniones ayudan a visibilizar calidad, servicio y cafeterías que hacen bien su trabajo."]
      ],
      cierre: "El consumidor informado reconoce mejor el valor del origen y ayuda a sostener una cultura cafetera más fuerte.",
      guia: ["Tu panel se enfoca en descubrir y aprender", "Podrás explorar recetas, cafés de origen, contenidos y publicaciones abiertas de la Red.", ["Recetas", "Academia", "Cafés de origen"]]
    },
    "Asesor Experto": {
      hero: "Publica asesorías y recibe solicitudes de miembros.",
      titulo: "Ofrece asesoría y acompaña mejoras reales",
      texto: "Tu perfil permite publicar servicios, recibir solicitudes y construir reputación profesional dentro de la cadena cafetera.",
      pasos: [
        ["01", "Publicas tu especialidad", "Agronomía, calidad, procesos, finanzas, exportación o marca pueden mostrarse como servicios solicitables."],
        ["02", "Recibes solicitudes", "Los miembros piden asesoría cuando la necesitan y el seguimiento queda asociado a la cuenta."],
        ["03", "Demuestras resultados", "Las valoraciones y continuidad de casos ayudan a diferenciar servicios útiles de promesas generales."]
      ],
      cierre: "La asesoría correcta convierte información en mejoras concretas para fincas, negocios y servicios de la Red.",
      guia: ["Tu panel se enfoca en ofrecer asesoría", "Podrás publicar servicios, recibir solicitudes de miembros y construir reputación profesional con valoraciones.", ["Publicar asesorías", "Recibir solicitudes", "Calificaciones de clientes"]]
    }
  };

  window.__redcafePerfilesCopy = perfiles;

  function text(el) {
    return (el && el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function htmlEscape(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char];
    });
  }

  function selectedProfileName() {
    if (window.__redcafePerfilSeleccionado && Date.now() - (window.__redcafePerfilSeleccionadoAt || 0) < 2500) {
      return perfiles[window.__redcafePerfilSeleccionado] ? window.__redcafePerfilSeleccionado : "Productor";
    }
    var cards = Array.prototype.slice.call(document.querySelectorAll("#profile-selector > div"));
    var active = cards.find(function (card) {
      var body = text(card);
      return /\bring-2\b/.test(card.className) || /\b(Activo|Principal)\b/.test(body);
    });
    var principal = active || cards.find(function (card) {
      return window.__redcafePerfilSeleccionado && text(card).indexOf(window.__redcafePerfilSeleccionado) !== -1;
    }) || cards[0];
    var body = text(principal);
    var name = Object.keys(perfiles).find(function (perfil) { return body.indexOf(perfil) !== -1; }) || text(principal && principal.querySelector("p.text-sm"));
    return perfiles[name] ? name : "Productor";
  }

  // Se comparte con redcafe-afiliate.js, que pinta la guía del perfil junto al
  // selector. Tiene en cuenta el último clic real (__redcafePerfilSeleccionado),
  // así que acierta cuando hay varios perfiles marcados y leer el DOM no basta.
  window.__redcafePerfilActual = selectedProfileName;

  function profileNameFromElement(el) {
    var card = el && el.closest && el.closest("#profile-selector > div");
    var body = text(card);
    return Object.keys(perfiles).find(function (perfil) { return body.indexOf(perfil) !== -1; }) || "";
  }

  function addSecondaryMenu() {
    // Cuando React hidrató, su propio Navbar.tsx YA trae el desplegable
    // "Más" (con los mismos enlaces) dentro de su <nav>. Insertar aquí
    // duplicaba el desplegable Y, peor, escribía un hijo nuevo dentro de un
    // nodo que React sigue reconciliando — el mismo patrón que en otras
    // partes del proyecto termina en "NotFoundError: removeChild". Mismo
    // criterio ya usado en redcafe-menu.js / redcafe-fusion.js.
    if (document.querySelector('script[src*="/_next/static/chunks/main-app-"]')) return;
    document.querySelectorAll("header nav").forEach(function (nav) {
      if (nav.querySelector('[data-redcafe-secondary-menu="1"]')) return;
      // El menú "Más" ya lo construye redcafe-v60-final.js (.redcafe-more).
      // Sin esta guarda la cabecera mostraba dos desplegables "Más" solapados.
      if (nav.querySelector(".redcafe-more") || document.querySelector("header .redcafe-more")) return;
      var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
      var login = links.find(function (a) { return text(a) === "Entrar"; });
      var details = document.createElement("details");
      details.className = "group relative";
      details.setAttribute("data-redcafe-secondary-menu", "1");
      details.innerHTML = '<summary class="inline-flex min-h-10 cursor-pointer list-none items-center gap-1 whitespace-nowrap transition-colors hover:text-acento-claro">Más <span class="text-[10px] text-crema/55">▾</span></summary><div class="absolute right-0 top-full z-50 mt-2 grid min-w-56 gap-1 border border-crema/15 bg-cafe p-2 shadow-xl"><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/marketplace/#mapa">Mapa / Ubicaciones</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/noticias/">Noticias</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/recetas/">Recetas</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/bar/">Bar / Cafeterías</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/laboratorio/">Laboratorio</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/servicios/calculadora/">Calculadora</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/servicios/eudr/">Trazabilidad / EUDR</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/servicios/factura/">Facturación</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/terminos-y-condiciones/">Términos</a><a class="min-h-9 whitespace-nowrap px-3 py-2 text-sm text-crema/80 transition hover:bg-filtrado-800 hover:text-acento-claro" href="/politica-de-privacidad/">Privacidad</a></div>';
      if (login) nav.insertBefore(details, login);
      else nav.appendChild(details);
    });
  }

  function removeHomeRedundantSections() {
    if (location.pathname !== "/" && location.pathname !== "/index.html") return;
    Array.prototype.slice.call(document.querySelectorAll("main section")).forEach(function (section) {
      var content = text(section);
      if (
        content.indexOf("Únete como miembro de la Red") !== -1 ||
        content.indexOf("Herramientas gratis para manejar mejor tu negocio cafetero") !== -1
      ) {
        // No se borra: retirar un nodo que pintó React es justo lo que rompe su
        // reconciliación y acaba en «Application error». Se oculta con el
        // atributo que ya tiene su regla en la hoja de estilos.
        section.setAttribute("data-redcafe-oculto", "1");
      }
    });
  }

  /* Aquí vivía updateAffiliateProfileContent(), que personalizaba /afiliate/
     reescribiendo cinco nodos de React —el h2 de la portada, y el título, el
     párrafo, la lista y el cierre de «Qué ganas de verdad»— e inyectaba una
     guía de 451 px antes de que el visitante hubiera elegido nada. Escribir
     dentro de nodos de React es lo que rompe su reconciliación, y esa guía
     era además la mitad del scroll que había que bajar para ver un perfil.

     Se retiró entera. La portada la pinta `redcafe-afiliate.js` en su propia
     sección, la guía se monta junto al selector cuando ya hay algo que contar,
     y «Qué ganas de verdad» se queda tal como la escribió React. Los textos
     por perfil siguen aquí, en `perfiles`, y se comparten con ese archivo por
     `window.__redcafePerfilesCopy`. */

  /* Copias propias y repintados de React. Para no escribir en un nodo de
     React se oculta el original y se pinta al lado una copia. Pero cuando
     React repinta (la barra de precio cada 10 minutos, una hidratación
     fallida, un cambio de pestaña del panel) crea un nodo nuevo sin la marca:
     la copia vieja quedaba huérfana y visible y la siguiente pasada añadía
     otra. «Fuente» llegó a salir cuatro veces en el panel. Cada copia guarda
     la firma de su original; si ya no va detrás de él, se busca en el mismo
     contenedor el nodo nuevo con esa firma, se oculta y la copia pasa detrás.
     Si no aparece, la copia sobra y se retira (es nuestra, no de React).
     Esta misma función está en redcafe-v60-final.js,
     redcafe-v60-mejoras-obligatorias.js y redcafe-conversion.js. */
  function firmaNodo(el) {
    return el.tagName + "|" + String(el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200);
  }
  function marcarCopia(copia, original) {
    copia.setAttribute("data-redcafe-copia", "1");
    copia.setAttribute("data-redcafe-original", firmaNodo(original));
  }
  function limpiarCopiasHuerfanas() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-redcafe-copia="1"]'), function (copia) {
      var padre = copia.parentNode;
      if (!padre) return;
      var previo = copia.previousElementSibling;
      if (previo && previo.getAttribute("data-redcafe-oculto-react") === "1") return;
      var firma = copia.getAttribute("data-redcafe-original") || "";
      var nuevo = null;
      if (firma) {
        Array.prototype.some.call(padre.children, function (h) {
          if (h === copia || h.hasAttribute("data-redcafe-propio")) return false;
          if (h.getAttribute("data-redcafe-oculto-react") === "1") return false;
          if (firmaNodo(h) !== firma) return false;
          nuevo = h;
          return true;
        });
      }
      if (nuevo) {
        nuevo.setAttribute("data-redcafe-oculto-react", "1");
        nuevo.insertAdjacentElement("afterend", copia);
      } else {
        padre.removeChild(copia);
      }
    });
  }

  function nodoPropioSeguro(nodo) {
    if (nodo.closest('[data-redcafe-propio="1"]')) return nodo;
    var siguiente = nodo.nextElementSibling;
    if (nodo.getAttribute("data-redcafe-oculto-react") === "1" && siguiente && siguiente.getAttribute("data-redcafe-propio") === "1") return siguiente;
    var copia = nodo.cloneNode(true);
    copia.removeAttribute("id");
    copia.querySelectorAll("[id]").forEach(function (hijo) { hijo.removeAttribute("id"); });
    copia.removeAttribute("data-redcafe-oculto-react");
    copia.setAttribute("data-redcafe-propio", "1");
    marcarCopia(copia, nodo);
    nodo.setAttribute("data-redcafe-oculto-react", "1");
    nodo.insertAdjacentElement("afterend", copia);
    return copia;
  }

  function patchPaymentInstructions() {
    if (location.pathname.indexOf("/servicios/contratar") !== 0) return;

    document.querySelectorAll('a[href="/afiliate"], a[href="/afiliate/"]').forEach(function (link) {
      if (text(link).indexOf("Iniciar sesión") !== -1) link.setAttribute("href", "/login/");
    });

    Array.prototype.slice.call(document.querySelectorAll("section, div")).forEach(function (box) {
      if (text(box).indexOf("Instrucciones de pago") === -1) return;
      actualizarListaPago(precioServicioTexto() || "el valor indicado");
    });

    Array.prototype.slice.call(document.querySelectorAll("a")).forEach(function (link) {
      if (text(link).indexOf("Enviar comprobante por WhatsApp") !== -1) {
        if (link.getAttribute("data-redcafe-oculto-react") === "1") return;
        link = nodoPropioSeguro(link);
        link.childNodes.forEach(function (node) {
          if (node.nodeType === 3 && node.nodeValue.trim()) node.nodeValue = "Solicitar datos de pago por WhatsApp";
        });
        if (text(link).indexOf("Enviar comprobante") !== -1) {
          link.textContent = "Solicitar datos de pago por WhatsApp";
        }
      }
    });
  }

  // Una sola petición de lotes por carga de página. Antes cada pasada de
  // applyAll (disparada por el MutationObserver) lanzaba un fetch nuevo:
  // se llegaron a medir >2600 peticiones a /api/lotes.php en una sola visita.
  function loadLotes() {
    if (window.__redcafeLotesPromise) return window.__redcafeLotesPromise;
    window.__redcafeLotesPromise = fetch("/api/lotes.php?action=list&_=" + Date.now(), { credentials: "include", cache: "no-store" })
      .then(function (res) { return res.json(); })
      .catch(function () { return { ok: false }; });
    return window.__redcafeLotesPromise;
  }

  function marketplaceApi(path) {
    return path;
  }

  function skeletonCardsHtml(cuantas) {
    var html = "";
    for (var i = 0; i < cuantas; i++) {
      html += '<article class="redcafe-skeleton-card" aria-hidden="true">' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-media"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea corta"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea media"></span>' +
        '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea corta"></span>' +
      '</article>';
    }
    return '<div class="redcafe-skeleton redcafe-skeleton-grid" role="status" aria-label="Cargando contenido">' +
      html +
    '</div>';
  }

  function loadMarketplaceServices() {
    if (window.__redcafeMarketplaceServicesPromise) return window.__redcafeMarketplaceServicesPromise;
    window.__redcafeMarketplaceServicesPromise = fetch(marketplaceApi("/api/marketplace-servicios.php?action=list&_=" + Date.now()), { credentials: "include", cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json || !json.ok) return [];
        if (Array.isArray(json.data)) return json.data;
        if (json.data && Array.isArray(json.data.servicios)) return json.data.servicios;
        return [];
      })
      .catch(function () { return []; });
    return window.__redcafeMarketplaceServicesPromise;
  }

  function loadAuthMe() {
    if (window.__redcafeAuthMePromise) return window.__redcafeAuthMePromise;
    window.__redcafeAuthMePromise = fetch("/api/auth.php?action=me&_=" + Date.now(), { credentials: "include", cache: "no-store" })
      .then(function (res) { return res.json(); })
      .catch(function () { return { ok: false }; });
    return window.__redcafeAuthMePromise;
  }

  function usuarioEnSesion(res) {
    return !!(res && res.ok && res.data && res.data.user && res.data.user.id);
  }

  function avisoCuenta(card, mensaje) {
    if (!card) return;
    var aviso = card.querySelector(".redcafe-empleo-aviso") || card.querySelector('[role="status"]');
    if (!aviso) return;
    aviso.className = "redcafe-empleo-aviso es-error";
    aviso.innerHTML = htmlEscape(mensaje) +
      ' <a href="/afiliate/">Crear cuenta gratis</a> · <a href="/login/">Entrar</a>';
  }

  function loadServiciosCatalogo() {
    if (window.__redcafeServiciosCatalogoPromise) return window.__redcafeServiciosCatalogoPromise;
    window.__redcafeServiciosCatalogoPromise = fetch("/api/servicios.php?action=list&_=" + Date.now(), { credentials: "include", cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json || !json.ok) return [];
        if (json.data && Array.isArray(json.data.servicios)) return json.data.servicios;
        if (Array.isArray(json.servicios)) return json.servicios;
        return [];
      })
      .catch(function () { return []; });
    return window.__redcafeServiciosCatalogoPromise;
  }

  function servicioContratarId() {
    try { return new URLSearchParams(location.search || "").get("servicio") || ""; }
    catch (e) { return ""; }
  }

  function precioServicioTexto() {
    var main = document.querySelector("main");
    if (!main) return "";
    var candidatos = Array.prototype.slice.call(main.querySelectorAll("p,span,strong,div,h2,h3")).filter(function (el) {
      var t = text(el);
      return /\$\s*\d/.test(t) && /(?:DESDE|POR|USD|\$)/i.test(t) && t.indexOf("%") === -1 && t.length < 120;
    });
    for (var i = 0; i < candidatos.length; i++) {
      var m = text(candidatos[i]).match(/\$\s*\d+(?:[.,]\d{1,2})?/);
      if (m) return m[0].replace(/\s+/g, "");
    }
    return "";
  }

  function actualizarListaPago(precio) {
    if (location.pathname.indexOf("/servicios/contratar") !== 0) return;
    Array.prototype.slice.call(document.querySelectorAll("section, div")).forEach(function (box) {
      if (text(box).indexOf("Instrucciones de pago") === -1) return;
      var list = box.querySelector("ol");
      if (!list) return;
      var serviceTitle = text(document.querySelector("h1")) || "este servicio";
      var servicePrice = precio || precioServicioTexto() || "el valor indicado";
      list = nodoPropioSeguro(list);
      if (list.getAttribute("data-redcafe-pago-precio") === servicePrice) return;
      list.setAttribute("data-redcafe-pago-whatsapp", "1");
      list.setAttribute("data-redcafe-pago-precio", servicePrice);
      list.innerHTML = '<li><strong>1.</strong> Solicita por WhatsApp los datos de pago actualizados para <strong>' + htmlEscape(serviceTitle) + '</strong>.</li><li><strong>2.</strong> Cuando el asesor confirme el método de pago, realiza el pago por el canal indicado.</li><li><strong>3.</strong> Guarda el comprobante e ingresa la referencia abajo para registrar tu solicitud por ' + htmlEscape(servicePrice) + '.</li>';
    });
  }

  function patchContratarServicePrice() {
    if (location.pathname.indexOf("/servicios/contratar") !== 0) return;
    var id = servicioContratarId();
    if (!id) return;
    loadServiciosCatalogo().then(function (servicios) {
      var servicio = servicios.find(function (s) { return String(s.id || "") === id; });
      if (!servicio) return;
      var precio = Number(servicio.precio);
      if (!isFinite(precio) || precio <= 0) return;
      var precioTxt = "$" + (Math.round(precio * 100) / 100).toString().replace(/\.00$/, "");
      var main = document.querySelector("main");
      if (!main) return;
      Array.prototype.slice.call(main.querySelectorAll("p,span,strong,div,h2,h3")).forEach(function (el) {
        if (el.closest('[data-redcafe-propio="1"]')) return;
        if (el.children.length > 2) return;
        var t = text(el);
        if (!/\$\s*\d/.test(t) || t.indexOf("%") !== -1 || t.length > 120) return;
        var copia = nodoPropioSeguro(el);
        copia.textContent = t.replace(/\$\s*\d+(?:[.,]\d{1,2})?/g, precioTxt);
      });
      actualizarListaPago(precioTxt);
    });
  }

  function patchChatEnterToSend() {
    if (location.pathname.indexOf("/chat") !== 0 || window.__redcafeChatEnterToSend) return;
    window.__redcafeChatEnterToSend = true;
    document.addEventListener("keydown", function (ev) {
      if ((ev.key !== "Enter" && ev.keyCode !== 13) || ev.shiftKey || ev.isComposing) return;
      var target = ev.target;
      if (!target || !target.matches || !target.matches('textarea,input[type="text"],input:not([type])')) return;
      var etiqueta = ((target.getAttribute("placeholder") || "") + " " + (target.getAttribute("aria-label") || "")).toLowerCase();
      if (etiqueta.indexOf("mensaje") === -1 && etiqueta.indexOf("respuesta") === -1) return;
      var form = target.closest("form") || target.closest("section") || target.closest("main") || document;
      var botones = Array.prototype.slice.call(form.querySelectorAll("button"));
      var enviar = botones.find(function (b) { return /^enviar$/i.test(text(b)); });
      if (!enviar || enviar.disabled) return;
      ev.preventDefault();
      enviar.click();
    });
  }

  function parseMarketplaceService(link) {
    var href = "";
    try { href = decodeURIComponent(link.getAttribute("href") || ""); } catch (_) { href = link.getAttribute("href") || ""; }
    var match = href.match(/servicio\s+(.+?)\s+publicado por\s+(.+?)\s+en Red/i);
    return {
      titulo: match ? match[1].trim() : "",
      proveedor: match ? match[2].trim() : "",
      card: link.closest("article, li, .rounded-2xl, .rounded-xl, div")
    };
  }

  function noticeAfter(el, message, ok) {
    var old = el.parentElement && el.parentElement.querySelector('[data-redcafe-service-notice="1"]');
    if (old) old.remove();
    var p = document.createElement("p");
    p.setAttribute("data-redcafe-service-notice", "1");
    p.className = "mt-2 text-xs font-semibold " + (ok ? "text-hoja" : "text-cereza");
    p.textContent = message;
    el.insertAdjacentElement("afterend", p);
  }

  function patchMarketplaceServiceRequests() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    Array.prototype.slice.call(document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]')).forEach(function (link) {
      if (link.getAttribute("data-redcafe-service-request") === "1") return;
      var parsed = parseMarketplaceService(link);
      var cardText = text(parsed.card);
      if (!parsed.titulo || cardText.indexOf("DESDE") === -1) return;
      link.setAttribute("data-redcafe-service-request", "1");
      link = nodoPropioSeguro(link);
      link.textContent = "Solicitar servicio";
      link.addEventListener("click", function (event) {
        event.preventDefault();
        if (link.getAttribute("data-redcafe-busy") === "1") return;
        link.setAttribute("data-redcafe-busy", "1");
        var oldText = link.textContent;
        link.textContent = "Enviando...";
        loadMarketplaceServices().then(function (services) {
          var current = parseMarketplaceService(link);
          var service = services.find(function (item) {
            return text({ textContent: item.titulo || item.nombre || "" }).toLowerCase() === current.titulo.toLowerCase();
          }) || services.find(function (item) {
            return (item.titulo || item.nombre || "").toLowerCase().indexOf(current.titulo.toLowerCase()) !== -1;
          });
          if (!service) throw new Error("No se encontró el servicio en marketplace.");
          return fetch(marketplaceApi("/api/pedidos.php?action=create_service"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              servicioId: service.id || service.servicio_id || current.titulo,
              servicio_id: service.id || service.servicio_id || current.titulo,
              titulo: service.titulo || service.nombre || current.titulo,
              proveedorId: service.proveedor_id || service.miembro_id || "",
              proveedor_id: service.proveedor_id || service.miembro_id || "",
              proveedor: service.proveedor || current.proveedor || "Red Café Ecuador",
              cantidad: 1,
              total: Number(service.precio || service.precio_desde || 0) || 0
            })
          });
        }).then(function (res) {
          if (res.status === 401) {
            location.href = "/login/";
            return null;
          }
          return res.json();
        }).then(function (json) {
          if (!json) return;
          if (!json.ok) throw new Error(json.error || "No se pudo registrar la solicitud.");
          link.textContent = "Solicitud enviada";
          noticeAfter(link, "Solicitud registrada. Revisa Mis órdenes en tu panel.", true);
        }).catch(function (err) {
          link.textContent = oldText || "Solicitar servicio";
          noticeAfter(link, err.message || "No se pudo registrar la solicitud.", false);
        }).finally(function () {
          link.removeAttribute("data-redcafe-busy");
        });
      });
    });
  }

  function patchMarketplaceLotContacts() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    if (window.__redcafeLotContactPromise) return;
    window.__redcafeLotContactPromise = loadLotes()
      .then(function (json) {
        var lotes = json && json.ok && json.data && Array.isArray(json.data.lotes) ? json.data.lotes : [];
      if (json && json.data && typeof json.data.sesion === "boolean") haySesion = json.data.sesion;
        lotes.forEach(function (lote) {
          if (!lote || !lote.id || !lote.contacto) return;
          var wanted = "/marketplace/" + String(lote.id) + "/";
          var card = Array.prototype.slice.call(document.querySelectorAll('a[href^="/marketplace/"]')).find(function (a) {
            return a.getAttribute("href") === wanted;
          });
          if (!card) return;
          card = card.closest("article") || card.parentElement;
          if (!card) return;
          var contact = Array.prototype.slice.call(card.querySelectorAll("a")).find(function (a) {
            return text(a).toLowerCase() === "contactar" || (a.href || "").indexOf("wa.me") !== -1;
          });
          if (!contact) return;
          contact = nodoPropioSeguro(contact);
          var message = msgWhatsapp("Hola, quiero consultar por el café " + (lote.variedad || "") + " " + (lote.proceso || "") + " de " + (lote.finca || "este lote") + ".", "lote", lote.id);
          // Siempre se limpia de una pasada anterior: si el mismo nodo ya fue
          // reescrito como enlace de WhatsApp y ahora toca la rama sin
          // contacto, no debe arrastrar target="_blank"/rel de esa vez.
          contact.removeAttribute("target");
          contact.removeAttribute("rel");
          contact.classList.remove("redcafe-solicitar-lote");
          if (!haySesion) {
            // Antes esto quedaba abierto a cualquiera: el WhatsApp del
            // productor se exponía en la tarjeta sin haber iniciado sesión,
            // aunque la ficha completa sí lo pedía. Se unifica el mismo
            // criterio aquí.
            contact.href = "/login/";
            contact.textContent = "Entra para contactar";
          } else if (lote.contacto.whatsapp) {
            contact.href = "https://wa.me/" + String(lote.contacto.whatsapp_link || lote.contacto.whatsapp).replace(/\D+/g, "") + "?text=" + message;
            contact.textContent = "Contactar";
            contact.target = "_blank";
            contact.rel = "noreferrer";
          } else if (lote.contacto.email) {
            contact.href = "mailto:" + lote.contacto.email + "?subject=Consulta%20de%20lote%20Red%20Caf%C3%A9&body=" + message;
            contact.textContent = "Contactar por email";
          } else {
            // Sin WhatsApp ni correo declarados: registra el pedido dentro
            // de la Red en vez de mandar a "/comunidad/", que no tiene
            // relación con este lote. Mismo botón y mismo listener que ya
            // usa la ficha completa del lote.
            contact.removeAttribute("href");
            contact.setAttribute("role", "button");
            contact.tabIndex = 0;
            contact.textContent = "Solicitar este lote";
            contact.classList.add("redcafe-solicitar-lote");
            contact.setAttribute("data-lote", lote.id);
            contact.setAttribute("data-finca", lote.finca || "");
            contact.setAttribute("data-productor", lote.productor || "");
            contact.setAttribute("data-precio", String(lote.precioSaco || 0));
          }
        });
      })
      .catch(function () {})
      .finally(function () { window.__redcafeLotContactPromise = null; });
  }

  function removeMarketplaceDemoNotes() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    // Solo se ocultan notas de texto sueltas (nodos hoja). Nunca contenedores:
    // evaluar textContent en un ancestro arrastraba todo el marketplace y el mapa.
    Array.prototype.slice.call(document.querySelectorAll("p, span")).forEach(function (el) {
      if (el.querySelector("section, article, div, h1, h2, h3, h4, a, button, img, ul, ol, table")) return;
      var body = text(el);
      if (body.length > 400) return;
      var normalized = body.toLowerCase();
      if (
        (normalized.indexOf("marketplace") !== -1 && normalized.indexOf("vista de demostr") !== -1) ||
        (normalized.indexOf("lotes marcados") !== -1 && normalized.indexOf("demostr") !== -1) ||
        (normalized.indexOf("fincas reales") !== -1 && normalized.indexOf("no son") !== -1) ||
        (normalized.indexOf("ejemplos") !== -1 && normalized.indexOf("demostr") !== -1) ||
        (body.indexOf("marcadores muestran") !== -1 && body.indexOf("distribución territorial") !== -1) ||
        (body.indexOf("marcadores de ejemplo") !== -1 && body.indexOf("formato territorial") !== -1) ||
        (body.indexOf("referenciales") !== -1 && body.indexOf("pendientes de verificación") !== -1) ||
        (body.indexOf("Explora cómo") !== -1 && body.indexOf("origen") !== -1)
      ) {
        // Igual que arriba: estas notas las pinta React. Se ocultan, no se borran.
        el.setAttribute("data-redcafe-oculto", "1");
      }
    });
  }

  function etiquetaEjemplo(lote) {
    return lote && (lote.demo || lote.ejemplo)
      ? '<span class="redcafe-etiqueta-demo">Lote demo</span>'
      : "";
  }

  // Imagen de la tarjeta: la foto que subió el productor si existe y, si no,
  // una del proceso que corresponde al estado del café. Sin esto las tarjetas
  // que repinta este script quedaban sin imagen y el listado "perdía" las
  // fotos que React había mostrado al cargar.
  // Si el ayudante de referencia no cargó, el mensaje sale igual: sin la
  // referencia, pero sin romperse.
  function msgWhatsapp(texto, tipo, id) {
    return typeof window.redcafeMensajeWhatsapp === "function"
      ? window.redcafeMensajeWhatsapp(texto, tipo, id)
      : encodeURIComponent(texto);
  }

  function loteImagen(lote) {
    var propias = Array.isArray(lote.imagenes) ? lote.imagenes : [];
    for (var i = 0; i < propias.length; i++) {
      var url = String(propias[i] || "");
      if (url.indexOf("/uploads/user-content/") === 0) return url;
    }
    var porEstado = {
      cereza: "/img/proceso/cereza.webp",
      bellota: "/img/proceso/secado.webp",
      pergamino: "/img/proceso/pergamino.webp",
      oro: "/img/proceso/verde.webp",
      tostado: "/img/proceso/tostado.webp"
    };
    var estado = String(lote.estado || "").toLowerCase();
    if (porEstado[estado]) return porEstado[estado];
    var proceso = String(lote.proceso || "").toLowerCase();
    if (proceso.indexOf("natural") !== -1) return "/img/proceso/secado.webp";
    if (proceso.indexOf("honey") !== -1) return "/img/proceso/pergamino.webp";
    return "/img/proceso/verde.webp";
  }

  // El café ya tostado y empacado se mide en unidades, no en quintales: se
  // etiqueta como tal y su precio se muestra por bolsa, no por saco.
  function esSiembraLote(lote) {
    if (lote && lote.siembra) return true;   // bandera pública, sin ficha técnica
    var e = String((lote && lote.estado) || "").toLowerCase();
    return e === "semilla" || e === "plantula";
  }

  function esTerminado(lote) {
    return String(lote && lote.categoria) === "terminado";
  }

  // Un lote vendido seguía anunciándose como si estuviera a la venta. La API
  // ya calcula el estado; aquí solo se pinta.
  var ETIQUETA_DISPONIBILIDAD = { agotado: "Agotado", reservado: "Reservado" };

  function disponibilidadLote(lote) {
    var d = String((lote && lote.disponibilidad) || "").toLowerCase();
    if (d === "agotado" || d === "reservado" || d === "disponible") return d;
    var stock = Number((lote && (lote.stockSacos || lote.unidades)) || 0);
    return stock > 0 ? "disponible" : "agotado";
  }

  /* El sello de verificado
     ------------------------------------------------------------------
     Lo lee un comprador antes de mandar dinero a un desconocido, así que dice
     quién revisó y cuándo, no solo «verificado». Un sello sin autor ni fecha
     no lo puede comprobar nadie. Lo concede la administración una a una desde
     el panel (api/verificaciones.php); no se hereda del rol de quien publica. */
  /* Contactar a un vendedor es el primer paso de un pedido, y eso es para
     miembros: la ficha completa ya lo era, pero el botón de WhatsApp seguía
     abierto a cualquiera, así que se podía cerrar un trato sin cuenta. La API
     dice si hay sesión (lotes.php, campo `sesion`); mientras no ha respondido
     se asume que sí, para no enseñarle a un miembro un botón de registro que
     desaparece un segundo después. */
  var haySesion = true;

  function botonContacto(lote, marca, href, texto) {
    if (haySesion || esLoteDemo(lote)) {
      return '<a ' + marca + ' target="_blank" rel="noreferrer" href="' + href + '">' + texto + '</a>';
    }
    return '<a class="btn-primary" href="/afiliate/">Entra para contactar al vendedor</a>';
  }

  function esLoteDemo(lote) {
    return !!(lote && (lote.demo || lote.ejemplo));
  }

  var QUINTAL_LB = 100;   // un quintal ecuatoriano: 100 libras

  function equivalenciaQuintal(lote) {
    if (!lote || esTerminado(lote) || esSiembraLote(lote)) return "";
    var saco = Number(lote.precioSaco || 0);
    var quintal = Number(lote.precioQuintal || 0);
    if (quintal > 0 || saco <= 0) return "";
    var peso = Number(lote.pesoSacoLb || 0);
    if (peso > 0) {
      var porQuintal = Math.round((saco * QUINTAL_LB / peso) * 100) / 100;
      return '<span class="redcafe-precio-equivalente">saco de ' + peso + ' lb · ≈ $ ' +
        porQuintal + ' por quintal</span>';
    }
    return '<span class="redcafe-precio-equivalente es-falta">peso del saco sin indicar</span>';
  }

  function selloVerificado(item) {
    if (!item || !item.verificado) return "";
    // Los servicios de la propia Red no llevan este sello. Ya se identifican
    // como suyos con «Gratis / Premium RedCafé», y ponerles «Verificado» —que
    // la API les marca por ser oficiales, sin que nadie los revisara— dejaba
    // los quince servicios del marketplace con sello: un sello que llevan
    // todos no distingue nada, y encima afirmaría una revisión que no hubo.
    if (item.oficial_redcafe) return "";
    var quien = item.verificado_por || "la administración";
    var cuando = "";
    if (item.verificado_en) {
      var f = new Date(Date.parse(item.verificado_en));
      if (!isNaN(f)) cuando = " el " + f.toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
    }
    return '<span class="redcafe-sello-verificado" title="' +
      htmlEscape("Revisado por " + quien + cuando) + '">✓ Verificado</span>';
  }

  function selloDisponibilidad(lote) {
    var d = disponibilidadLote(lote);
    if (!ETIQUETA_DISPONIBILIDAD[d]) return "";
    return '<span class="redcafe-sello-' + d + '">' + ETIQUETA_DISPONIBILIDAD[d] + '</span>';
  }

  function presentacionLote(lote) {
    var g = Number(lote.pesoGramos || 0);
    if (!g) return "";
    return g >= 1000 ? (g / 1000).toFixed(g % 1000 ? 1 : 0) + " kg" : g + " g";
  }

  function alturaLegible(lote) {
    var valor = lote && lote.altura;
    if (valor === undefined || valor === null || valor === "") return "";
    var numero = Number(valor);
    if (isFinite(numero) && numero >= 300 && numero <= 2600) return String(numero) + " msnm";
    return "Altura por confirmar";
  }

  function loteCardHtml(lote) {
    var terminado = esTerminado(lote);
    var title = terminado
      ? [lote.variedad || "Café", lote.tueste ? "tueste " + lote.tueste : ""].filter(Boolean).join(" · ")
      : [lote.variedad || "Café", lote.proceso || ""].filter(Boolean).join(" · ");
    var finca = lote.finca || lote.productor || "Lote publicado";
    var provincia = lote.provincia || "Ecuador";
    var precioSaco = Number(lote.precioSaco || 0);
    var precioQuintal = Number(lote.precioQuintal || 0);
    // Semilla y plántula se venden por planta: ni saco ni quintal.
    var siembra = esSiembraLote(lote);
    var precio = (terminado || siembra)
      ? Number(lote.precioUnidad || 0)
      : (precioSaco > 0 ? precioSaco : precioQuintal);
    var unidad = terminado
      ? (presentacionLote(lote) || "unidad")
      : (siembra
          ? (String(lote.estado) === "semilla" ? "semilla" : "planta")
          : (precioSaco > 0 ? "saco" : "quintal"));
    var precioLegible = isFinite(precio) && precio > 0
      ? '$ ' + precio + ' <span class="text-xs font-semibold uppercase text-text-muted">/ ' + htmlEscape(unidad) + '</span>'
      : 'Precio a convenir';
    // Un precio «por saco» no se puede comparar con la referencia del mercado,
    // que va por quintal (100 lb). Si el productor dijo cuánto pesa su saco se
    // calcula la equivalencia; si no lo dijo, se dice que falta, no se inventa.
    precioLegible += equivalenciaQuintal(lote);
    var stock = (terminado || siembra)
      ? Number(lote.unidades || 0)
      : Number(lote.stockSacos || lote.stockQuintales || 0);
    var contact = lote.contacto || {};
    var wa = String(contact.whatsapp_link || contact.whatsapp || "").replace(/\D+/g, "");
    var cantidad = [stock ? stock + " disponibles" : "", lote.ventaMinima ? "pedido desde " + lote.ventaMinima : ""].filter(Boolean).join(", ");
    var message = msgWhatsapp("Hola, quiero consultar por el café " + title + " de " + finca + (cantidad ? " (" + cantidad + ")" : "") + ".", "lote", lote.id);
    var disp = disponibilidadLote(lote);
    // Sin WhatsApp declarado, esto mandaba a "/comunidad/" — sin relación con
    // este lote. Con sesión, se ofrece solicitarlo dentro de la Red (mismo
    // listener de `.redcafe-solicitar-lote`); sin sesión, `botonContacto` ya
    // pedía entrar, así que ahí no cambia nada.
    var botonContactoLote = wa
      ? botonContacto(lote,
          'class="btn-primary !px-4 !py-2 text-sm redcafe-contactar" data-lote="' + htmlEscape(lote.id || "") + '"',
          'https://wa.me/' + wa + '?text=' + message,
          disp === "agotado" ? "Preguntar por el próximo lote" : "Contactar")
      : (haySesion || esLoteDemo(lote)
          ? '<button type="button" class="btn-primary !px-4 !py-2 text-sm redcafe-solicitar-lote" data-lote="' + htmlEscape(lote.id || "") +
            '" data-finca="' + htmlEscape(lote.finca || "") + '" data-productor="' + htmlEscape(lote.productor || "") +
            '" data-precio="' + htmlEscape(String(lote.precioSaco || 0)) + '">Solicitar este lote</button>'
          : '<a class="btn-primary" href="/afiliate/">Entra para contactar al vendedor</a>');
    return '<article class="border border-border-soft bg-white p-5 shadow-sm redcafe-lote-tarjeta" ' +
      'data-disponibilidad="' + disp + '" data-redcafe-api-lote="' + htmlEscape(lote.id || "") + '">' +
      '<a class="block" href="/marketplace/' + htmlEscape(lote.id || "") + '/" aria-label="Ver café ' + htmlEscape(title) + ' de ' + htmlEscape(finca) + '">' +
      '<img class="redcafe-lote-foto" src="' + htmlEscape(loteImagen(lote)) + '" alt="Café ' + htmlEscape(title) + ' de ' + htmlEscape(finca) + '" loading="lazy" decoding="async">' +
      '<p class="mt-3 text-xs font-bold uppercase tracking-widest text-green-700">' + htmlEscape(provincia) +
        (lote.ubicacion_aproximada === true ? '<span class="redcafe-etiqueta-aprox">' + htmlEscape("Ubicación aproximada") + '</span>' : '') +
        (terminado ? '<span class="redcafe-etiqueta-terminado">Café tostado</span>' : '') +
        selloVerificado(lote) + selloDisponibilidad(lote) + etiquetaEjemplo(lote) + '</p>' +
      '<h3 class="mt-2 font-titulo text-2xl font-bold text-coffee-900">' + htmlEscape(title) + '</h3>' +
      '<p class="mt-1 text-sm font-semibold text-text-secondary">' + htmlEscape(finca) + '</p>' +
      (terminado
        ? '<p class="mt-3 text-sm text-text-secondary">' +
            [presentacionLote(lote), lote.molienda || "", stock ? stock + " unidades" : ""]
              .filter(Boolean).map(htmlEscape).join(" · ") + '</p>'
        : '<p class="mt-3 text-sm text-text-secondary">' +
            [alturaLegible(lote),
             stock + " disponibles",
             lote.ventaMinima ? "desde " + lote.ventaMinima : "pedido a convenir"]
              .filter(Boolean).map(htmlEscape).join(" · ") + '</p>') +
      '<p class="mt-3 text-lg font-bold text-coffee-900">' + precioLegible + '</p>' +
      '</a>' +
      '<div class="mt-4 flex flex-wrap gap-2">' +
        '<a class="btn-ghost !px-4 !py-2 text-sm" href="/marketplace/' + htmlEscape(lote.id || "") + '/">Ver café</a>' +
        botonContactoLote +
      '</div>' +
      '</article>';
  }

  function serviceCardHtml(service) {
    var title = service.titulo || service.nombre || "Servicio RedCafé";
    var free = service.gratis === true || service.plan === "gratis" || service.tipo_plan === "gratis";
    // La etiqueta la decide la API: "Gratis", "A convenir" o el importe. Antes
    // un servicio gratuito salía como "$0" y uno que se cotiza según alcance,
    // como "Premium · $0".
    var price = service.precio_etiqueta ||
      (free ? "Gratis" : (Number(service.precio) > 0 ? "$ " + Number(service.precio) : "A convenir"));
    var sinImporte = price === "Gratis" || price === "A convenir";
    var wa = String(service.whatsapp_link || service.whatsapp || "").replace(/\D+/g, "");
    var message = msgWhatsapp("Hola, quiero solicitar el servicio " + title + ".", "servicio", service.id);
    // Foto del servicio, si su dueño subió alguna: un servicio con cara se
    // contrata más que una ficha de solo texto.
    var fotos = Array.isArray(service.imagenes) ? service.imagenes : [];
    var foto = fotos.filter(function (u) {
      return typeof u === "string" && u.indexOf("/uploads/user-content/") === 0;
    })[0];
    return '<article class="border border-border-soft bg-white p-5 shadow-sm">' +
      (foto ? '<img src="' + htmlEscape(foto) + '" alt="Foto del servicio ' + htmlEscape(title) + '" ' +
        'loading="lazy" decoding="async" class="redcafe-servicio-foto" onerror="this.remove()">' : '') +
      '<p class="text-xs font-bold uppercase tracking-widest text-green-700">' + htmlEscape(service.categoria || "RedCafé") +
        selloVerificado(service) + '</p>' +
      '<h3 class="mt-2 font-titulo text-xl font-bold text-coffee-900">' + htmlEscape(title) + '</h3>' +
      '<span class="redcafe-service-plan-badge ' + (free ? "is-free" : "is-premium") + '">' + (free ? "Gratis RedCafé" : "Premium RedCafé") + '</span>' +
      '<p class="mt-3 text-sm leading-relaxed text-text-secondary">' + htmlEscape(service.descripcion || "") + '</p>' +
      '<p class="mt-3 text-lg font-bold text-coffee-900">' + htmlEscape(price) +
        (sinImporte ? '' : ' <span class="text-xs font-semibold uppercase text-text-muted">/ ' + htmlEscape(service.unidad || "servicio") + '</span>') +
      '</p>' +
      // El botón lleva al WhatsApp de QUIEN ofrece el servicio. Sin sesión la
      // API no entrega su teléfono —y hace bien—, pero el botón caía entonces
      // en el WhatsApp de Red Café Ecuador: el visitante creía escribir al
      // proveedor y escribía a la plataforma. Ahora, sin contacto, se le pide
      // entrar. Los servicios oficiales de la Red sí llevan su propio número.
      (wa
        ? '<a class="btn-primary mt-4 !px-4 !py-2 text-sm" href="https://wa.me/' + htmlEscape(wa) + '?text=' + message + '" target="_blank" rel="noreferrer">Solicitar servicio</a>'
        : (service.oficial_redcafe
            ? '<a class="btn-primary mt-4 !px-4 !py-2 text-sm" href="https://wa.me/593968641376?text=' + message + '" target="_blank" rel="noreferrer">Solicitar servicio</a>'
            : '<a class="btn-primary mt-4 !px-4 !py-2 text-sm" href="/login/">Entra para contactar a quien lo ofrece</a>')) +
      '</article>';
  }

  // Lotes REALES: los de muestra (demo/ejemplo) inflaban «N ubicaciones» y
  // «N cafés disponibles». Con 13 registros y 6 de muestra, el visitante leía
  // 13 cafés disponibles cuando hay 7.
  function soloReales(lotes) {
    return (lotes || []).filter(function (l) { return l && !l.demo && !l.ejemplo && !l.oculto; });
  }

  /* «N cafés disponibles» decía 9 mientras se veían 15 tarjetas: contaba los
     lotes reales incluyendo los agotados y callaba los de muestra. Ahora dice
     lo que se puede comprar y, aparte, cuántos son ejemplos de la Red. */
  function contadorCafes(lotes) {
    var reales = soloReales(lotes);
    var disponibles = reales.filter(function (l) { return disponibilidadLote(l) !== "agotado"; }).length;
    var muestra = (lotes || []).filter(esLoteDemo).length;
    var txt = disponibles === 1 ? "1 café disponible" : disponibles + " cafés disponibles";
    if (muestra) txt += " · " + (muestra === 1 ? "1 ejemplo de la Red" : muestra + " ejemplos de la Red");
    return txt;
  }

  // T5 (optimización 20260917c): los lotes con más pruebas primero. Se ordena
  // de forma ESTABLE por nivel de confianza: 2 = foto real (subida por el
  // productor, no imagen de referencia) y puntaje numérico; 1 = solo uno de
  // los dos; 0 = ninguno. Dentro de un nivel se conserva el orden de llegada.
  function nivelConfianzaLote(lote) {
    var conFoto = String(loteImagen(lote) || "").indexOf("/uploads/user-content/") === 0;
    var conPuntaje = Number(lote && lote.score) > 0;
    return (conFoto && conPuntaje) ? 2 : ((conFoto || conPuntaje) ? 1 : 0);
  }
  function porConfianzaLotes(lotes) {
    var items = (lotes || []).map(function (l, i) { return { l: l, i: i }; });
    items.sort(function (a, b) {
      var d = nivelConfianzaLote(b.l) - nivelConfianzaLote(a.l);
      if (d) return d;
      return a.i - b.i;
    });
    return items.map(function (x) { return x.l; });
  }

  // «Más reciente» (20260923): antes ordenaba por confianza y un lote agotado
  // salía segundo. Ahora manda la fecha de publicación descendente (empate por
  // id) y los agotados al final, la misma regla que lote_orden_con_disponibilidad
  // de api/lotes.php. Estable dentro de cada tramo.
  function ordenRecientes(lotes) {
    var items = (lotes || []).map(function (l, i) { return { l: l, i: i }; });
    items.sort(function (a, b) {
      var agA = disponibilidadLote(a.l) === "agotado" ? 1 : 0;
      var agB = disponibilidadLote(b.l) === "agotado" ? 1 : 0;
      if (agA !== agB) return agA - agB;
      var fa = String(a.l.created_at || "");
      var fb = String(b.l.created_at || "");
      if (fa !== fb) return fa < fb ? 1 : -1;
      var ia = String(a.l.id || "");
      var ib = String(b.l.id || "");
      if (ia !== ib) return ia < ib ? 1 : -1;
      return a.i - b.i;
    });
    return items.map(function (x) { return x.l; });
  }

  // «Recomendados» (20260923): primero foto real + puntaje, luego solo uno de
  // los dos, luego el resto (orden estable de porConfianzaLotes), y los agotados
  // siempre al final.
  function ordenRecomendados(lotes) {
    var ordenado = porConfianzaLotes(lotes);
    var aLaVista = ordenado.filter(function (l) { return disponibilidadLote(l) !== "agotado"; });
    var agotados = ordenado.filter(function (l) { return disponibilidadLote(l) === "agotado"; });
    return aLaVista.concat(agotados);
  }

  function fallbackMapHtml(lotes) {
    var pins = lotes.filter(function (lote) { return lote.lat && lote.lng; }).map(function (lote) {
      var left = Math.max(8, Math.min(92, ((Number(lote.lng) + 82) / 7) * 100));
      var top = Math.max(8, Math.min(92, ((2 - Number(lote.lat)) / 7) * 100));
      return '<a class="redcafe-map-pin" href="/marketplace/' + htmlEscape(lote.id || "") + '/" aria-label="' + htmlEscape(lote.finca || lote.variedad || "Lote") + '" title="' + htmlEscape(lote.finca || lote.variedad || "Lote") + '" style="left:' + left.toFixed(2) + '%;top:' + top.toFixed(2) + '%"><span></span></a>';
    }).join("");
    return '<section class="mx-auto max-w-6xl px-4 pt-5"><div class="redcafe-map-head"><h2 class="font-titulo text-2xl font-bold text-cafe">Mapa de lotes de café publicados</h2><span>' + soloReales(lotes).length + ' ubicaciones</span></div><div class="redcafe-fallback-map" id="mapa">' + pins + '</div></section>';
  }

  function rebuildMarketplaceIfEmpty() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    var main = document.querySelector("main");
    if (!main || main.getAttribute("data-redcafe-marketplace-fallback") === "1") return;
    var isDetalle = /^\/marketplace\/[^\/]+\/?$/.test(location.pathname);
    if (isDetalle) return;
    // Si la página exportada ya montó su marketplace real, no lo destruimos:
    // se completa con parches puntuales para lotes/servicios y el mapa Leaflet.
    if (document.querySelector(".leaflet-container") || document.getElementById("lotes-grid")) return;
    if (text(main).length <= 80 && !document.getElementById("redcafe-marketplace-esperando")) {
      var esperando = document.createElement("div");
      esperando.id = "redcafe-marketplace-esperando";
      esperando.setAttribute("data-redcafe-propio", "1");
      esperando.innerHTML = '<section class="mx-auto max-w-6xl px-4 py-8">' +
        '<div class="redcafe-skeleton" role="status" aria-label="Cargando marketplace">' +
          '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea titulo"></span>' +
          '<span class="redcafe-skeleton-bloque redcafe-skeleton-linea intro"></span>' +
          '<div class="redcafe-skeleton-grid">' + skeletonCardsHtml(8) + '</div>' +
        '</div>' +
      '</section>';
      main.appendChild(esperando);
    }
    Promise.all([
      loadLotes(),
      loadMarketplaceServices().then(function (items) { return { ok: true, data: { servicios: items } }; })
    ]).then(function (all) {
      var lotes = all[0] && all[0].ok && all[0].data ? all[0].data.lotes || [] : [];
      var servicios = all[1] && all[1].data ? all[1].data.servicios || [] : [];
      // Solo actúa como red de seguridad: si el marketplace del sitio ya se
      // pintó, no se toca. Reconstruirlo siempre destruía el DOM de React.
      if (text(main).length > 80 || document.getElementById("lotes-grid")) return;
      if (!lotes.length) {
        var esperaVacia = document.getElementById("redcafe-marketplace-esperando");
        if (esperaVacia) esperaVacia.innerHTML =
          '<section class="mx-auto max-w-6xl px-4 py-8"><p class="redcafe-market-vacio">Todavía no hay lotes publicados.</p></section>';
        return;
      }
      var free = servicios.filter(function (s) { return s.gratis === true || s.plan === "gratis" || s.tipo_plan === "gratis"; }).length;
      var premium = servicios.length - free;
      main.setAttribute("data-redcafe-marketplace-fallback", "1");
      var esperando = document.getElementById("redcafe-marketplace-esperando");
      if (esperando && esperando.parentNode) esperando.parentNode.removeChild(esperando);
      var propio = document.createElement("div");
      propio.setAttribute("data-redcafe-propio", "1");
      main.appendChild(propio);
      ocultarContenidoDeReact(main, propio);
      propio.innerHTML =
        '<section class="redcafe-market-hero bg-cafe text-crema"><div class="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-7"><div><p class="rotulo text-acento-claro">Marketplace de café ecuatoriano</p><h1 class="mt-1 font-titulo text-3xl font-bold md:text-4xl">Encuentra café, servicios y compradores con datos claros</h1><p class="mt-2 max-w-3xl text-sm text-crema/80 md:text-base">Explora lotes por provincia, variedad, proceso y precio. Con tu perfil puedes publicar oferta, responder requerimientos y dar seguimiento desde el panel.</p></div><div class="flex flex-wrap gap-2"><a class="btn-primary !px-4 !py-2 text-sm" href="/afiliate/?rol=productor">Crear perfil para publicar café</a><a class="btn-ghost !border-crema/40 !px-4 !py-2 !text-crema text-sm" href="/afiliate/?rol=asesor">Crear perfil para ofrecer servicios</a></div></div></section>' +
        fallbackMapHtml(lotes) +
        '<section class="mx-auto max-w-6xl px-4 pb-10 pt-5"><div class="mb-3 flex flex-wrap items-center justify-between gap-2"><div class="flex flex-wrap gap-2"><button class="btn-primary !px-4 !py-2 text-sm" type="button" data-redcafe-tab="lotes">Cafés</button><button class="btn-ghost !px-4 !py-2 text-sm" type="button" data-redcafe-tab="servicios">Servicios</button></div><p class="text-sm font-semibold text-cafe">' + contadorCafes(lotes) + '</p></div><div id="lotes-grid" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">' + ordenRecientes(lotes).map(loteCardHtml).join("") + '</div><div id="servicios-grid" class="hidden grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><div id="redcafe-service-plan-summary" class="redcafe-service-plan-summary md:col-span-2 lg:col-span-3 xl:col-span-4"><span>Servicios RedCafé</span><strong>' + free + ' gratuitos</strong><strong>' + premium + ' premium</strong></div>' + servicios.map(serviceCardHtml).join("") + '</div></section>';
      main.addEventListener("click", function (event) {
        var btn = event.target && event.target.closest && event.target.closest("[data-redcafe-tab]");
        if (!btn) return;
        var showServices = btn.getAttribute("data-redcafe-tab") === "servicios";
        var lotesGrid = document.getElementById("lotes-grid");
        var servicesGrid = document.getElementById("servicios-grid");
        if (lotesGrid) lotesGrid.classList.toggle("hidden", showServices);
        if (servicesGrid) servicesGrid.classList.toggle("hidden", !showServices);
      });
    }).catch(function () {});
  }

  // React conserva referencias a los nodos que él creó. Vaciar su contenedor
  // con innerHTML se las invalida y, en la siguiente actualización, intenta
  // retirar nodos inexistentes: "NotFoundError: Failed to execute 'removeChild'",
  // que Next presenta como "Application error: a client-side exception".
  // Por eso nunca se borra su contenido: se oculta y se añade el nuestro al lado.
  function ocultarContenidoDeReact(contenedor, salvo) {
    Array.prototype.slice.call(contenedor.children).forEach(function (hijo) {
      if (hijo === salvo) return;
      if (hijo.hasAttribute("data-redcafe-propio")) return;
      hijo.setAttribute("data-redcafe-oculto", "1");
      hijo.setAttribute("aria-hidden", "true");
      hijo.setAttribute("inert", "");
    });
  }

  function mostrarContenidoDeReact(contenedor) {
    Array.prototype.slice.call(contenedor.querySelectorAll('[data-redcafe-oculto="1"]')).forEach(function (el) {
      el.removeAttribute("data-redcafe-oculto");
      el.removeAttribute("aria-hidden");
      el.removeAttribute("inert");
    });
  }

  function patchMarketplaceLotGrid() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    var grid = document.getElementById("lotes-grid");
    if (!grid || grid.getAttribute("data-redcafe-lotes-completos") === "1") return;
    loadLotes()
      .then(function (json) {
        var lotes = json && json.ok && json.data && Array.isArray(json.data.lotes) ? json.data.lotes : [];
      if (json && json.data && typeof json.data.sesion === "boolean") haySesion = json.data.sesion;
        if (!lotes.length) return;

        // El grid de lotes lo gestiona React. Reescribir su interior con
        // innerHTML dejaba a React con referencias a nodos que ya no existían:
        // al cambiar a la pestaña "Servicios" intentaba retirarlos y lanzaba
        // "NotFoundError: Failed to execute 'removeChild'", que Next muestra
        // como "Application error: a client-side exception has occurred".
        //
        // En su lugar se deja intacto el grid de React (oculto) y se pinta el
        // listado propio en un contenedor hermano que React no conoce.
        var propio = document.getElementById("redcafe-lotes-propio");
        if (!propio) {
          propio = document.createElement("div");
          propio.id = "redcafe-lotes-propio";
          propio.className = grid.className;
          propio.setAttribute("data-redcafe-propio", "1");
          grid.insertAdjacentElement("afterend", propio);
        }
      propio.innerHTML = skeletonCardsHtml(8);
      grid.setAttribute("data-redcafe-oculto-react", "1");
      grid.setAttribute("aria-hidden", "true");
      grid.setAttribute("inert", "");
      propio.innerHTML = ordenRecientes(lotes).map(loteCardHtml).join("");

        grid.setAttribute("data-redcafe-lotes-completos", "1");
        // Nada de escribir en el contador del sitio: es de React (ver arriba).

        // El listado que ve el usuario es este, no el de React. Sin conectar
        // los filtros del sitio, cambiar "Provincia" filtraba el grid oculto
        // de React y la pantalla seguía mostrando los mismos cafés: los
        // filtros, la búsqueda y el contador no hacían nada.
        activarFiltrosDelMarketplace(lotes, propio);
        activarPestanaServicios(propio);
      })
      .catch(function () {});
  }

  /* ── Filtros del marketplace ──────────────────────────────────────────
     No se duplica la interfaz: se escuchan los mismos controles que ya pinta
     el sitio (Provincia, Variedad, Proceso y Buscar) y se vuelve a pintar el
     listado propio. Escuchar un control de React es seguro; escribir dentro
     de su árbol no lo es. */

  var estadoMarketplace = null;

  function textoBusquedaDeLote(lote) {
    return [lote.finca, lote.productor, lote.variedad, lote.proceso, lote.provincia,
            lote.canton, lote.descripcion, lote.notasTaza, lote.certificacion,
            lote.marca, lote.tueste]
      .filter(Boolean).join(" ");
  }

  function coincide(valorLote, valorFiltro) {
    if (!valorFiltro) return true;
    var f = normalizeKey(valorFiltro);
    if (!f || f === "todas" || f === "todos") return true;
    return normalizeKey(valorLote) === f;
  }

  function etiquetaDeControl(control) {
    var etiqueta = control.closest("label");
    if (etiqueta) return normalizeKey(text(etiqueta));
    var previo = control.previousElementSibling;
    if (previo) return normalizeKey(text(previo));
    var padre = control.parentElement;
    return padre ? normalizeKey(text(padre)) : "";
  }

  // Los <select> del sitio no llevan name ni id: se identifican por su rótulo.
  /* De dónde sale el valor de cada filtro
     ------------------------------------------------------------------
     Antes se leía del <select> que existía cuando arrancó el script. En
     escritorio eso valía; en MÓVIL no: el botón «Filtros» del sitio despliega
     un panel con OTRO juego de selects —medido: de 4 pasa a 7— y esos nuevos
     no tenían oyente. Cambiar «Provincia = Manabí» movía el contador de React
     pero seguían viéndose las ocho tarjetas, porque el filtro leía el select
     original, que nadie había tocado. Es el fallo histórico del marketplace
     por un camino nuevo.

     Ahora manda lo ÚLTIMO que tocó el usuario, venga del control que venga, y
     si no ha tocado nada se mira cualquier select de la página que tenga valor.
     Así da igual cuántos juegos de controles pinte React. */
  // `null` = el usuario no ha tocado ese filtro; "" = lo ha puesto en «Todas».
  // Hay que distinguirlo: si se tratara igual, al volver a «Todas» el respaldo
  // leería el select OCULTO —que React mantiene sincronizado con el elegido— y
  // la lista se quedaría filtrada para siempre.
  var filtrosElegidos = { provincia: null, variedad: null, proceso: null };

  function filtroVigente(clave) {
    if (filtrosElegidos[clave] !== null) return filtrosElegidos[clave];
    var valor = "";
    Array.prototype.slice.call(document.querySelectorAll("main select")).forEach(function (sel) {
      if (valor) return;
      if (etiquetaDeControl(sel).indexOf(clave) === -1) return;
      if (sel.value && normalizeKey(sel.value).indexOf("tod") !== 0) valor = sel.value;
    });
    return valor;
  }

  function claveDeSelect(sel) {
    var rotulo = etiquetaDeControl(sel);
    if (rotulo.indexOf("provincia") !== -1) return "provincia";
    if (rotulo.indexOf("variedad") !== -1) return "variedad";
    if (rotulo.indexOf("proceso") !== -1) return "proceso";
    return "";
  }

  function localizarControles() {
    var controles = { provincia: null, variedad: null, proceso: null, buscar: null };
    Array.prototype.slice.call(document.querySelectorAll("main select")).forEach(function (sel) {
      var rotulo = etiquetaDeControl(sel);
      if (!controles.provincia && rotulo.indexOf("provincia") !== -1) controles.provincia = sel;
      else if (!controles.variedad && rotulo.indexOf("variedad") !== -1) controles.variedad = sel;
      else if (!controles.proceso && rotulo.indexOf("proceso") !== -1) controles.proceso = sel;
    });
    // Ojo: `input[type="text"]` NO encuentra un <input> sin el atributo
    // type, que es justo el caso del buscador del sitio. Se filtra por la
    // propiedad `.type`, que sí vale "text" por omisión.
    var entradas = Array.prototype.slice.call(document.querySelectorAll("main input"))
      .filter(function (i) { return i.type === "text" || i.type === "search"; });
    // Puede haber más de un buscador en la página; se escuchan todos y se
    // usa el que tenga algo escrito.
    controles.buscar = entradas.filter(function (i) {
      var rotulo = etiquetaDeControl(i) + " " + normalizeKey(i.getAttribute("placeholder") || "");
      return rotulo.indexOf("busca") !== -1 || rotulo.indexOf("finca") !== -1;
    });
    return controles;
  }

  // La página tiene dos buscadores (uno en el panel plegado de filtros y otro
  // a la vista) y React puede reemplazar el nodo al repintar. Por eso el texto
  // no se lee del DOM: se guarda el del último campo en el que se escribió.
  function textoBuscado() {
    return estadoMarketplace ? estadoMarketplace.texto : "";
  }

  function lotesFiltrados() {
    var e = estadoMarketplace;
    if (!e) return [];
    var c = e.controles;
    var texto = textoBuscado();
    var tipo = e.tipo;
    var lotes = e.lotes.filter(function (l) {
      if (tipo === "verde" && String(l.categoria || "verde") !== "verde") return false;
      if (tipo === "terminado" && String(l.categoria || "verde") !== "terminado") return false;
      if (!coincide(l.provincia, filtroVigente("provincia"))) return false;
      if (!coincide(l.variedad, filtroVigente("variedad"))) return false;
      if (!coincide(l.proceso, filtroVigente("proceso"))) return false;
      if (texto && normalizeKey(textoBusquedaDeLote(l)).indexOf(texto) === -1) return false;
      return true;
    });

    var precio = function (l) {
      return Number(String(l.categoria) === "terminado" ? (l.precioUnidad || 0)
                                                        : (l.precioSaco || l.precioQuintal || 0));
    };
    // Por defecto («Más reciente») se ordena por fecha de publicación
    // (agotados al final); «Recomendados» antepone la confianza (foto real +
    // puntaje, luego uno de los dos, luego el resto, estable y agotados al final).
    if (e.orden === "recomendados") lotes = ordenRecomendados(lotes);
    else if (e.orden === "reciente") lotes = ordenRecientes(lotes);
    else if (e.orden === "precio-asc") lotes.sort(function (a, b) { return precio(a) - precio(b); });
    else if (e.orden === "precio-desc") lotes.sort(function (a, b) { return precio(b) - precio(a); });
    else if (e.orden === "puntaje") lotes.sort(function (a, b) { return Number(b.score || 0) - Number(a.score || 0); });
    return lotes;
  }

  function pintarListado() {
    var e = estadoMarketplace;
    if (!e) return;
    var lotes = lotesFiltrados();
    e.contenedor.innerHTML = lotes.length
      ? lotes.map(loteCardHtml).join("")
      : '<p class="redcafe-market-vacio">Ningún café coincide con esos filtros. ' +
        'Prueba con otra provincia o variedad, o limpia la búsqueda.</p>';

    // El contador del sitio ("9 cafés disponibles") lo pinta React a partir
    // de SU estado. Reescribir su textContent destruye el nodo de texto que
    // React cree tener; en el siguiente repintado intenta retirarlo y lanza
    // "NotFoundError: removeChild" -> "Application error". Comprobado.
    // Por eso no se toca: el recuento real se anuncia en el resumen propio,
    // que está en un contenedor nuestro.
    if (e.resumen) {
      // Cuando no queda ningún café, el listado ya lo dice —y además sugiere
      // qué hacer—. Repetirlo aquí ponía dos frases casi iguales, una debajo
      // de la otra, que es justo lo que hace dudar de si son dos cosas
      // distintas. El resumen cuenta; el listado explica.
      // El número de React («N cafés disponibles») cuenta solo los lotes de
      // miembros, incluidos los agotados, mientras en pantalla hay más
      // tarjetas: el visitante leía 9 y contaba 15. Aquí se desglosa lo que
      // tiene delante, que es lo único que podemos escribir sin tocar React.
      var disponibles = 0, agotados = 0, muestra = 0;
      lotes.forEach(function (l) {
        if (esLoteDemo(l)) { muestra++; return; }
        if (disponibilidadLote(l) === "agotado") agotados++;
        else disponibles++;
      });
      var partes = [];
      partes.push(disponibles === 1 ? "1 café disponible" : disponibles + " cafés disponibles");
      if (agotados) partes.push(agotados === 1 ? "1 agotado" : agotados + " agotados");
      if (muestra) partes.push(muestra === 1 ? "1 ejemplo de la Red" : muestra + " ejemplos de la Red");
      var cabeza = lotes.length === e.lotes.length
        ? "Mostrando " + lotes.length + " publicaciones: "
        : "Mostrando " + lotes.length + " de " + e.lotes.length + " publicaciones: ";
      e.resumen.textContent = lotes.length === 0 ? "" : cabeza + partes.join(", ") + ".";
    }
  }

  // Controles que el sitio no tiene: tipo de café y orden. Van en un
  // contenedor propio, delante del listado propio.
  function barraPropia(contenedor) {
    if (document.getElementById("redcafe-market-barra")) return null;
    var barra = document.createElement("div");
    barra.id = "redcafe-market-barra";
    barra.className = "redcafe-market-barra";
    barra.setAttribute("data-redcafe-propio", "1");
    barra.innerHTML =
      '<div class="redcafe-market-grupo" role="group" aria-label="Tipo de café">' +
        '<button type="button" data-tipo="todos" class="is-activo">Todos</button>' +
        '<button type="button" data-tipo="verde">Café verde</button>' +
        '<button type="button" data-tipo="terminado">Café tostado</button>' +
      '</div>' +
      '<label class="redcafe-market-orden"><span>Ordenar por</span>' +
        '<select data-orden>' +
          '<option value="reciente">Más reciente</option>' +
          '<option value="recomendados">Recomendados</option>' +
          '<option value="precio-asc">Precio: de menor a mayor</option>' +
          '<option value="precio-desc">Precio: de mayor a menor</option>' +
          '<option value="puntaje">Puntaje de taza</option>' +
        '</select>' +
      '</label>' +
      '<p class="redcafe-market-resumen" role="status" aria-live="polite"></p>';
    contenedor.insertAdjacentElement("beforebegin", barra);
    return barra;
  }

  function activarFiltrosDelMarketplace(lotes, contenedor) {
    if (estadoMarketplace) return;
    var controles = localizarControles();
    var barra = barraPropia(contenedor);

    estadoMarketplace = {
      lotes: lotes.slice(),
      contenedor: contenedor,
      controles: controles,
      resumen: barra ? barra.querySelector(".redcafe-market-resumen") : null,
      tipo: "todos",
      orden: "reciente",
      texto: ""
    };

    // Delegado en el <main>, que sobrevive a los repintados de React y a que
    // el panel de móvil cree su propio juego de controles.
    var raizFiltros = document.querySelector("main");
    if (raizFiltros && raizFiltros.getAttribute("data-redcafe-filtros") !== "1") {
      raizFiltros.setAttribute("data-redcafe-filtros", "1");
      raizFiltros.addEventListener("change", function (ev) {
        var sel = ev.target;
        if (!sel || sel.tagName !== "SELECT") return;
        var clave = claveDeSelect(sel);
        if (!clave) return;
        // El valor puede venir vacío o como «Todas»: las dos cosas son «sin
        // filtro». Se mira también el texto de la opción elegida, porque hay
        // selects cuyo value no coincide con lo que se lee.
        var v = sel.value || "";
        var texto = sel.options && sel.selectedIndex >= 0
          ? (sel.options[sel.selectedIndex].textContent || "") : "";
        var vacio = v === "" || normalizeKey(v).indexOf("tod") === 0 ||
                    normalizeKey(texto).indexOf("tod") === 0;
        filtrosElegidos[clave] = vacio ? "" : v;
        pintarListado();
      });
    }
    function alBuscar(ev) {
      estadoMarketplace.texto = normalizeKey((ev.target && ev.target.value) || "");
      pintarListado();
    }
    (controles.buscar || []).forEach(function (campo) {
      campo.addEventListener("input", alBuscar);
      campo.addEventListener("search", alBuscar);
    });
    // Si React reemplaza el buscador, el oyente se habría quedado en el nodo
    // viejo. Se escucha también en el <main>, que sí sobrevive.
    var raiz = document.querySelector("main");
    if (raiz) {
      raiz.addEventListener("input", function (ev) {
        var campo = ev.target;
        if (!campo || campo.tagName !== "INPUT") return;
        if (campo.type !== "text" && campo.type !== "search") return;
        var rotulo = etiquetaDeControl(campo) + " " + normalizeKey(campo.getAttribute("placeholder") || "");
        if (rotulo.indexOf("busca") === -1 && rotulo.indexOf("finca") === -1) return;
        alBuscar(ev);
      });
    }
    if (barra) {
      barra.addEventListener("click", function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest("[data-tipo]") : null;
        if (!btn) return;
        estadoMarketplace.tipo = btn.getAttribute("data-tipo");
        Array.prototype.slice.call(barra.querySelectorAll("[data-tipo]")).forEach(function (b) {
          b.classList.toggle("is-activo", b === btn);
        });
        pintarListado();
      });
      barra.addEventListener("change", function (ev) {
        if (!ev.target || !ev.target.hasAttribute("data-orden")) return;
        estadoMarketplace.orden = ev.target.value;
        pintarListado();
      });
    }
    pintarListado();
  }

  /* ── Pestaña "Servicios" ──────────────────────────────────────────────
     La página exportada tiene los botones "Cafés" y "Servicios", pero nunca
     llegó a tener un grid de servicios: pulsar "Servicios" no hacía nada y
     los servicios publicados eran inalcanzables desde el marketplace. */

  function botonesDePestana() {
    return Array.prototype.slice.call(document.querySelectorAll("main button")).filter(function (b) {
      var t = normalizeKey(text(b));
      return t === "cafes" || t === "servicios";
    });
  }

  /* ── Pestaña "Empleos" ────────────────────────────────────────────────
     La bolsa de empleo vivía solo en el panel del miembro: quien buscaba
     trabajo no tenía dónde ver las ofertas ni cómo postular. Aquí se publica
     el listado y se postula sin salir del marketplace.

     El botón es nuestro (React solo tiene "Cafés" y "Servicios") y vive en
     nuestro propio contenedor. */

  var ETIQUETAS_EMPLEO = {
    jornada: {
      "tiempo-completo": "Tiempo completo", "medio-tiempo": "Medio tiempo",
      "por-horas": "Por horas", "temporal": "Temporal", "por-obra": "Por obra"
    },
    experiencia: {
      "sin-experiencia": "Sin experiencia", "1-2-anios": "1 a 2 años",
      "3-5-anios": "3 a 5 años", "mas-5-anios": "Más de 5 años"
    },
    periodo: { hora: "por hora", dia: "por día", mes: "al mes", obra: "por obra" }
  };

  function sueldoEmpleo(e) {
    var desde = Number(e.salarioDesde || 0);
    var hasta = Number(e.salarioHasta || 0);
    if (!desde && !hasta) return "Salario a convenir";
    var periodo = ETIQUETAS_EMPLEO.periodo[e.salarioPeriodo] || "";
    if (desde && hasta && desde !== hasta) return "$ " + desde + " – " + hasta + " " + periodo;
    return "$ " + (desde || hasta) + " " + periodo;
  }

  function empleoCardHtml(e) {
    var lugar = [e.canton, e.provincia].filter(Boolean).join(", ");
    var etiquetas = [
      ETIQUETAS_EMPLEO.jornada[e.jornada] || e.jornada,
      e.modalidad,
      ETIQUETAS_EMPLEO.experiencia[e.experiencia] || ""
    ].filter(Boolean);
    return '<article class="border border-border-soft bg-white p-5 shadow-sm redcafe-empleo-card" data-empleo="' + htmlEscape(e.id || "") + '">' +
      '<p class="text-xs font-bold uppercase tracking-widest text-green-700">' + htmlEscape(lugar || "Ecuador") + '</p>' +
      '<h3 class="mt-2 font-titulo text-xl font-bold text-coffee-900">' + htmlEscape(e.titulo || "Oferta de empleo") + '</h3>' +
      (e.empresa ? '<p class="mt-1 text-sm font-semibold text-text-secondary">' + htmlEscape(e.empresa) + '</p>' : '') +
      '<p class="redcafe-empleo-etiquetas">' + etiquetas.map(function (t) {
        return '<span>' + htmlEscape(t) + '</span>';
      }).join("") + '</p>' +
      '<p class="mt-3 text-sm leading-relaxed text-text-secondary">' + htmlEscape(String(e.descripcion || "").slice(0, 220)) +
        (String(e.descripcion || "").length > 220 ? '…' : '') + '</p>' +
      '<p class="mt-3 text-lg font-bold text-coffee-900">' + htmlEscape(sueldoEmpleo(e)) + '</p>' +
      '<p class="redcafe-empleo-pie">' + (Number(e.vacantes || 1)) + ' vacante(s)' +
        (e.cierra ? ' · recibe postulaciones hasta el ' + htmlEscape(e.cierra) : '') + '</p>' +
      '<button type="button" class="btn-primary mt-4 !px-4 !py-2 text-sm redcafe-empleo-postular">Postular</button>' +
      '<p class="redcafe-empleo-aviso" role="status" aria-live="polite"></p>' +
    '</article>';
  }

  function abrirPostulacion(card) {
    var id = card.getAttribute("data-empleo");
    var aviso = card.querySelector(".redcafe-empleo-aviso");
    if (card.querySelector(".redcafe-empleo-form")) return;

    var form = document.createElement("div");
    form.className = "redcafe-empleo-form";
    form.innerHTML =
      '<label><span>Cuéntale al empleador por qué te interesa</span>' +
        '<textarea rows="4" maxlength="1500" placeholder="Tu experiencia, tu disponibilidad y cómo contactarte."></textarea>' +
      '</label>' +
      '<label><span>Teléfono (opcional)</span><input type="tel" inputmode="tel" maxlength="40"></label>' +
      '<div class="redcafe-empleo-acciones">' +
        '<button type="button" class="redcafe-empleo-cancelar">Cancelar</button>' +
        '<button type="button" class="redcafe-empleo-enviar">Enviar postulación</button>' +
      '</div>';
    card.appendChild(form);
    var texto = form.querySelector("textarea");
    texto.focus();

    form.querySelector(".redcafe-empleo-cancelar").addEventListener("click", function () {
      card.removeChild(form);
    });
    form.querySelector(".redcafe-empleo-enviar").addEventListener("click", function () {
      var mensaje = texto.value.trim();
      if (mensaje.length < 20) {
        aviso.textContent = "Escribe al menos un par de frases: el empleador necesita saber quién eres.";
        aviso.className = "redcafe-empleo-aviso es-error";
        return;
      }
      aviso.textContent = "Enviando…";
      aviso.className = "redcafe-empleo-aviso";
      fetch("/api/empleos.php?action=postular", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id, mensaje: mensaje, telefono: form.querySelector('input[type="tel"]').value })
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (res && res.ok) {
          if (form.parentNode) form.parentNode.removeChild(form);
          aviso.textContent = "Postulación enviada. Verás la respuesta en tu panel.";
          aviso.className = "redcafe-empleo-aviso es-ok";
          var boton = card.querySelector(".redcafe-empleo-postular");
          if (boton) { boton.disabled = true; boton.textContent = "Ya postulaste"; }
        } else {
          aviso.textContent = (res && res.error) || "No se pudo enviar. Inténtalo de nuevo.";
          aviso.className = "redcafe-empleo-aviso es-error";
        }
      }).catch(function () {
        aviso.textContent = "No se pudo conectar.";
        aviso.className = "redcafe-empleo-aviso es-error";
      });
    });
  }

  /* ── Pestaña "Requerimientos" ──────────────────────────────────────────
     El espejo del marketplace: hasta ahora solo se publicaba lo que uno VENDE.
     Aquí se ve lo que la gente BUSCA, y un productor puede ofrecer su café sin
     recorrer fichas. Reutiliza a propósito las clases visuales de Empleos: son
     tarjetas del mismo tipo y duplicar el CSS acaba en dos diseños que se
     separan solos. */

  var ETIQUETAS_REQ = {
    tipo: { verde: "Café verde", tostado: "Café tostado", cualquiera: "Verde o tostado" },
    proceso: { lavado: "Lavado", honey: "Honey", natural: "Natural", cualquiera: "" },
    frecuencia: { unica: "Compra única", mensual: "Cada mes", trimestral: "Cada trimestre", anual: "Cada año" },
    unidadSingular: { sacos: "saco", quintales: "quintal", kg: "kg" }
  };

  function cantidadRequerimiento(r) {
    var n = Number(r.cantidad);
    if (!isFinite(n) || n <= 0) return "";
    var unidad = (n === 1 && ETIQUETAS_REQ.unidadSingular[r.unidad]) || r.unidad || "";
    return n + " " + unidad;
  }

  // «vigente hasta el 2026-11-09» es una fecha de base de datos, no algo que
  // nadie diga en voz alta.
  function fechaRequerimiento(iso) {
    var s = String(iso || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var d = new Date(s + "T00:00:00");
    if (isNaN(d)) return s;
    try {
      return d.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) { return s; }
  }

  function precioRequerimiento(r) {
    if (r.precioReferencia === null || r.precioReferencia === undefined) return "Precio a convenir";
    return "Referencia: $" + Number(r.precioReferencia).toFixed(2);
  }

  function requerimientoCardHtml(r) {
    var etiquetas = [
      ETIQUETAS_REQ.tipo[r.tipo] || r.tipo,
      r.variedad || "",
      ETIQUETAS_REQ.proceso[r.proceso] || "",
      ETIQUETAS_REQ.frecuencia[r.frecuencia] || ""
    ].filter(Boolean);
    var desc = String(r.descripcion || "");
    // Foto que subió quien busca el café, si la hay.
    var fotoReq = (Array.isArray(r.imagenes) ? r.imagenes : []).filter(function (u) {
      return typeof u === "string" && u.indexOf("/uploads/user-content/") === 0;
    })[0];
    return '<article class="border border-border-soft bg-white p-5 shadow-sm redcafe-empleo-card" data-requerimiento="' + htmlEscape(r.id || "") + '">' +
      (fotoReq ? '<img src="' + htmlEscape(fotoReq) + '" alt="Foto del requerimiento" loading="lazy" ' +
        'decoding="async" class="redcafe-servicio-foto" onerror="this.remove()">' : '') +
      '<p class="text-xs font-bold uppercase tracking-widest text-green-700">' +
        htmlEscape(r.provincia ? "Origen: " + r.provincia : "Cualquier origen") + '</p>' +
      '<h3 class="mt-2 font-titulo text-xl font-bold text-coffee-900">' + htmlEscape(r.titulo || "Requerimiento de café") + '</h3>' +
      (r.empresa || r.autor ? '<p class="mt-1 text-sm font-semibold text-text-secondary">' + htmlEscape(r.empresa || r.autor) + '</p>' : '') +
      '<p class="redcafe-empleo-etiquetas">' + etiquetas.map(function (t) {
        return '<span>' + htmlEscape(t) + '</span>';
      }).join("") + '</p>' +
      '<p class="mt-3 text-sm leading-relaxed text-text-secondary">' + htmlEscape(desc.slice(0, 220)) +
        (desc.length > 220 ? '…' : '') + '</p>' +
      '<p class="mt-3 text-lg font-bold text-coffee-900">Busca ' + htmlEscape(cantidadRequerimiento(r)) + '</p>' +
      '<p class="redcafe-empleo-pie">' + htmlEscape(precioRequerimiento(r)) +
        (r.puntajeMinimo ? ' · desde ' + htmlEscape(String(r.puntajeMinimo)) + ' puntos SCA' : '') +
        (r.certificacion ? ' · ' + htmlEscape(r.certificacion) : '') +
        (r.cierra ? ' · vigente hasta el ' + htmlEscape(fechaRequerimiento(r.cierra)) : '') + '</p>' +
      '<button type="button" class="btn-primary mt-4 !px-4 !py-2 text-sm redcafe-req-ofrecer">Ofrecer mi café</button>' +
      '<p class="redcafe-empleo-aviso" role="status" aria-live="polite"></p>' +
    '</article>';
  }

  function abrirOferta(card) {
    var id = card.getAttribute("data-requerimiento");
    var aviso = card.querySelector(".redcafe-empleo-aviso");
    if (card.querySelector(".redcafe-empleo-form")) return;

    var form = document.createElement("div");
    form.className = "redcafe-empleo-form";
    form.innerHTML =
      '<label><span>Cuéntele qué café tiene</span>' +
        '<textarea rows="4" maxlength="1500" placeholder="Variedad, proceso, puntaje, cantidad disponible y si puede enviar muestra."></textarea>' +
      '</label>' +
      '<label><span>Cantidad que ofrece (opcional)</span><input type="number" min="0" step="0.01" inputmode="decimal"></label>' +
      '<label><span>Precio por unidad (opcional)</span><input type="number" min="0" step="0.01" inputmode="decimal" data-precio></label>' +
      '<div class="redcafe-empleo-acciones">' +
        '<button type="button" class="redcafe-empleo-cancelar">Cancelar</button>' +
        '<button type="button" class="redcafe-empleo-enviar">Enviar oferta</button>' +
      '</div>';
    card.appendChild(form);
    var texto = form.querySelector("textarea");
    texto.focus();

    form.querySelector(".redcafe-empleo-cancelar").addEventListener("click", function () {
      if (form.parentNode) form.parentNode.removeChild(form);
    });
    form.querySelector(".redcafe-empleo-enviar").addEventListener("click", function () {
      var mensaje = texto.value.trim();
      if (mensaje.length < 20) {
        aviso.textContent = "Escriba al menos un par de frases: quien compra necesita saber qué café le ofrece.";
        aviso.className = "redcafe-empleo-aviso es-error";
        return;
      }
      aviso.textContent = "Enviando…";
      aviso.className = "redcafe-empleo-aviso";
      var cantidadInput = form.querySelector('input[type="number"]:not([data-precio])');
      var precioInput = form.querySelector('input[data-precio]');
      fetch("/api/requerimientos.php?action=ofertar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id,
          mensaje: mensaje,
          cantidad: cantidadInput ? cantidadInput.value : "",
          precio: precioInput ? precioInput.value : ""
        })
      }).then(function (r) {
        // El código HTTP hay que llevárselo: sin él no se puede distinguir «no
        // tienes cuenta» (401) de un error cualquiera, y el aviso amable de
        // más abajo nunca se mostraría.
        return r.json().then(function (j) { j.httpStatus = r.status; return j; },
                             function () { return { ok: false, httpStatus: r.status }; });
      }).then(function (res) {
        if (res && res.ok) {
          if (form.parentNode) form.parentNode.removeChild(form);
          aviso.textContent = "Oferta enviada. Verá la respuesta en su panel.";
          aviso.className = "redcafe-empleo-aviso es-ok";
          var boton = card.querySelector(".redcafe-req-ofrecer");
          if (boton) { boton.disabled = true; boton.textContent = "Ya ofertó"; }
        } else {
          // El 401 tiene su propio texto: "No autenticado" no le dice a nadie
          // qué hacer, y aquí la salida es crear una cuenta.
          aviso.textContent = (res && res.httpStatus === 401)
            ? "Crea tu perfil gratis para ofrecer café y dar seguimiento a la respuesta desde tu panel."
            : ((res && res.error) || "No se pudo enviar. Inténtelo de nuevo.");
          aviso.className = "redcafe-empleo-aviso es-error";
        }
      }).catch(function () {
        aviso.textContent = "No se pudo conectar.";
        aviso.className = "redcafe-empleo-aviso es-error";
      });
    });
  }

  /* Las pestañas propias (Empleos y Requerimientos) no se conocen entre sí:
     cada una solo escuchaba los botones de React, así que al abrir una la otra
     se quedaba encendida y se veían dos listados a la vez. Se avisan por un
     evento en lugar de referenciarse, que es lo que permite añadir una tercera
     sin tocar las anteriores. */
  function anunciarPestanaPropia(nombre) {
    try {
      document.dispatchEvent(new CustomEvent("redcafe:pestana-propia", { detail: nombre }));
    } catch (e) {}
  }

  function contadorDelSitioMarketplace() {
    var ps = document.querySelectorAll("main p");
    for (var i = 0; i < ps.length; i++) {
      if (ps[i].children.length) continue;
      if (ps[i].closest("[data-redcafe-propio]")) continue;
      if (/^\d+\s+\S+\s+disponibles/.test((ps[i].textContent || "").trim())) return ps[i];
    }
    return null;
  }

  function activarPestanaRequerimientos(gridLotes, gridServicios, botonesReact) {
    if (document.getElementById("redcafe-requerimientos-propio")) return;

    var grid = document.createElement("div");
    grid.id = "redcafe-requerimientos-propio";
    grid.className = gridLotes.className;
    grid.setAttribute("data-redcafe-propio", "1");
    grid.hidden = true;
    gridLotes.parentNode.insertBefore(grid, gridServicios.nextSibling);

    var resumen = document.createElement("p");
    resumen.className = "redcafe-market-resumen";
    resumen.setAttribute("data-redcafe-propio", "1");
    resumen.setAttribute("role", "status");
    resumen.setAttribute("aria-live", "polite");
    resumen.hidden = true;
    grid.parentNode.insertBefore(resumen, grid);

    var referencia = botonesReact[botonesReact.length - 1];
    var caja = document.createElement("span");
    caja.className = "redcafe-empleos-tab";
    caja.setAttribute("data-redcafe-propio", "1");
    var boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = "Requerimientos";
    caja.appendChild(boton);
    // Detrás de la pestaña de Empleos, que ya se insertó ahí mismo.
    var tabEmpleos = document.querySelector(".redcafe-empleos-tab");
    if (tabEmpleos && tabEmpleos.parentNode) tabEmpleos.parentNode.insertBefore(caja, tabEmpleos.nextSibling);
    else referencia.parentNode.insertBefore(caja, referencia.nextSibling);

    /* Con cuatro pestañas la fila mide 425 px y a 375 px desbordaba la página
       en horizontal —medido: sin esta pestaña, 375 justos—. La fila la pinta
       React, así que no se le toca el árbol ni las clases: se le marca un
       atributo y el CSS la deja pasar a dos líneas. Se prefiere que envuelva
       antes que que se desplace: así las cuatro siguen viéndose a la vez, que
       es de lo que depende que alguien descubra esta pestaña. */
    var fila = caja.parentNode;
    if (fila && fila.setAttribute) fila.setAttribute("data-redcafe-pestanas", "1");

    var cargados = false;
    function apagar() {
      grid.hidden = true;
      resumen.hidden = true;
      var c = contadorDelSitioMarketplace();
      if (c) c.removeAttribute("data-redcafe-oculto-react");
      boton.classList.remove("is-activo");
    }
    botonesReact.forEach(function (b) { b.addEventListener("click", apagar); });
    document.addEventListener("redcafe:pestana-propia", function (ev) {
      if (ev && ev.detail !== "requerimientos") apagar();
    });

    boton.addEventListener("click", function () {
      anunciarPestanaPropia("requerimientos");
      grid.hidden = false;
      resumen.hidden = false;
      boton.classList.add("is-activo");
      gridLotes.hidden = true;
      gridServicios.hidden = true;
      var barra = document.getElementById("redcafe-market-barra");
      if (barra) barra.hidden = true;
      var c = contadorDelSitioMarketplace();
      if (c) c.setAttribute("data-redcafe-oculto-react", "1");
      if (cargados) return;
      cargados = true;
      grid.innerHTML = skeletonCardsHtml(4);
      fetch("/api/requerimientos.php?action=list", { credentials: "include", cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          var lista = res && res.ok && res.data && Array.isArray(res.data.requerimientos)
            ? res.data.requerimientos : [];
          resumen.textContent = lista.length === 0
            ? "Ningún requerimiento abierto."
            : (lista.length === 1 ? "1 requerimiento abierto." : lista.length + " requerimientos abiertos.");
          grid.innerHTML = lista.length
            ? lista.map(requerimientoCardHtml).join("")
            : '<p class="redcafe-market-vacio">Todavía nadie ha publicado qué café busca. ' +
              'Si usted compra café, publique el suyo desde su panel.</p>';
        })
        .catch(function () {
          resumen.textContent = "";
          grid.innerHTML = '<p class="redcafe-market-vacio">No se pudieron cargar los requerimientos.</p>';
        });
    });

    grid.addEventListener("click", function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest(".redcafe-req-ofrecer") : null;
      if (!btn || btn.disabled) return;
      var card = btn.closest(".redcafe-empleo-card");
      loadAuthMe().then(function (res) {
        if (!usuarioEnSesion(res)) {
          avisoCuenta(card, "Crea tu perfil gratis para ofrecer café y ver la respuesta en tu panel");
          return;
        }
        abrirOferta(card);
      });
    });
  }

  /* ── «Busco empleo»: la otra cara de la bolsa ──────────────────────────
     Vive DENTRO de la pestaña Empleos, no en una pestaña propia: el empleo es
     un solo asunto con dos lados, y la fila de pestañas ya se parte en dos
     líneas a 375 px con cuatro. Quien ofrece asesoría por encargo no viene
     aquí: para eso está la pestaña «Servicios», que ya existe. */

  var ETIQUETAS_BUSQUEDA = {
    categoria: {
      barismo: "Barismo", "produccion-agricola": "Producción agrícola",
      "beneficio-pilado": "Beneficio y pilado", tueste: "Tueste",
      "calidad-catacion": "Calidad y catación", ventas: "Ventas",
      "logistica-transporte": "Logística y transporte", administracion: "Administración",
      "tecnico-agronomo": "Técnico agrónomo", otro: "Otro"
    },
    disponibilidad: {
      inmediata: "Disponible ya", "dos-semanas": "En dos semanas",
      "un-mes": "En un mes", "a-convenir": "A convenir"
    },
    modalidad: { presencial: "Presencial", hibrido: "Híbrido", remoto: "Remoto", cualquiera: "" },
    jornada: {
      "tiempo-completo": "Tiempo completo", "medio-tiempo": "Medio tiempo",
      "por-horas": "Por horas", temporal: "Temporal", "por-obra": "Por obra", cualquiera: ""
    }
  };

  function pretensionBusqueda(b) {
    var d = (b.pretensionDesde === null || b.pretensionDesde === undefined) ? null : Number(b.pretensionDesde);
    var h = (b.pretensionHasta === null || b.pretensionHasta === undefined) ? null : Number(b.pretensionHasta);
    if (d === null && h === null) return "Pretensión a convenir";
    var per = ETIQUETAS_EMPLEO.periodo[b.pretensionPeriodo] || "";
    if (d !== null && h !== null) return "$" + d.toFixed(2) + " - $" + h.toFixed(2) + " " + per;
    if (d !== null) return "Desde $" + d.toFixed(2) + " " + per;
    return "Hasta $" + h.toFixed(2) + " " + per;
  }

  function busquedaCardHtml(b) {
    var lugar = [b.canton, b.provincia].filter(Boolean).join(", ");
    var etiquetas = [
      ETIQUETAS_BUSQUEDA.categoria[b.categoria] || b.categoria,
      ETIQUETAS_EMPLEO.experiencia[b.experiencia] || "",
      ETIQUETAS_BUSQUEDA.jornada[b.jornada] || "",
      ETIQUETAS_BUSQUEDA.modalidad[b.modalidad] || "",
      ETIQUETAS_BUSQUEDA.disponibilidad[b.disponibilidad] || ""
    ].filter(Boolean);
    var desc = String(b.descripcion || "");
    return '<article class="border border-border-soft bg-white p-5 shadow-sm redcafe-empleo-card" data-busqueda="' + htmlEscape(b.id || "") + '">' +
      '<p class="text-xs font-bold uppercase tracking-widest text-green-700">' + htmlEscape(lugar || "Ecuador") + '</p>' +
      '<h3 class="mt-2 font-titulo text-xl font-bold text-coffee-900">' + htmlEscape(b.titulo || "Busca empleo") + '</h3>' +
      '<p class="mt-1 text-sm font-semibold text-text-secondary">' + htmlEscape(b.autor || "Un miembro de la Red") + '</p>' +
      '<p class="redcafe-empleo-etiquetas">' + etiquetas.map(function (t) {
        return '<span>' + htmlEscape(t) + '</span>';
      }).join("") + '</p>' +
      '<p class="mt-3 text-sm leading-relaxed text-text-secondary">' + htmlEscape(desc.slice(0, 220)) +
        (desc.length > 220 ? '…' : '') + '</p>' +
      '<p class="mt-3 text-lg font-bold text-coffee-900">' + htmlEscape(pretensionBusqueda(b)) + '</p>' +
      '<button type="button" class="btn-primary mt-4 !px-4 !py-2 text-sm redcafe-busco-contactar">Escribirle</button>' +
      '<p class="redcafe-empleo-aviso" role="status" aria-live="polite"></p>' +
    '</article>';
  }

  function abrirContactoBusqueda(card) {
    var id = card.getAttribute("data-busqueda");
    var aviso = card.querySelector(".redcafe-empleo-aviso");
    if (card.querySelector(".redcafe-empleo-form")) return;

    var form = document.createElement("div");
    form.className = "redcafe-empleo-form";
    form.innerHTML =
      '<label><span>Cuéntele qué puesto tiene</span>' +
        '<textarea rows="4" maxlength="1500" placeholder="El puesto, dónde es, la jornada y cómo postular."></textarea>' +
      '</label>' +
      '<label><span>Empresa o finca (opcional)</span><input type="text" maxlength="120"></label>' +
      '<div class="redcafe-empleo-acciones">' +
        '<button type="button" class="redcafe-empleo-cancelar">Cancelar</button>' +
        '<button type="button" class="redcafe-empleo-enviar">Enviar mensaje</button>' +
      '</div>';
    card.appendChild(form);
    var texto = form.querySelector("textarea");
    texto.focus();

    form.querySelector(".redcafe-empleo-cancelar").addEventListener("click", function () {
      if (form.parentNode) form.parentNode.removeChild(form);
    });
    form.querySelector(".redcafe-empleo-enviar").addEventListener("click", function () {
      var mensaje = texto.value.trim();
      if (mensaje.length < 20) {
        aviso.textContent = "Escriba al menos un par de frases: al otro lado hay alguien buscando trabajo.";
        aviso.className = "redcafe-empleo-aviso es-error";
        return;
      }
      aviso.textContent = "Enviando…";
      aviso.className = "redcafe-empleo-aviso";
      fetch("/api/busco-empleo.php?action=contactar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id, mensaje: mensaje,
          empresa: (form.querySelector('input[type="text"]') || {}).value || ""
        })
      }).then(function (r) {
        return r.json().then(function (j) { j.httpStatus = r.status; return j; },
                             function () { return { ok: false, httpStatus: r.status }; });
      }).then(function (res) {
        if (res && res.ok) {
          if (form.parentNode) form.parentNode.removeChild(form);
          aviso.textContent = "Mensaje enviado. Le avisamos en su panel cuando responda.";
          aviso.className = "redcafe-empleo-aviso es-ok";
          var boton = card.querySelector(".redcafe-busco-contactar");
          if (boton) { boton.disabled = true; boton.textContent = "Ya le escribió"; }
        } else {
          aviso.textContent = (res && res.httpStatus === 401)
            ? "Crea tu perfil gratis para escribirle y recibir la respuesta desde tu panel."
            : ((res && res.error) || "No se pudo enviar. Inténtelo de nuevo.");
          aviso.className = "redcafe-empleo-aviso es-error";
        }
      }).catch(function () {
        aviso.textContent = "No se pudo conectar.";
        aviso.className = "redcafe-empleo-aviso es-error";
      });
    });
  }

  function activarPestanaEmpleos(gridLotes, gridServicios, botonesReact) {
    if (document.getElementById("redcafe-empleos-propio")) return;

    var grid = document.createElement("div");
    grid.id = "redcafe-empleos-propio";
    grid.className = gridLotes.className;
    grid.setAttribute("data-redcafe-propio", "1");
    grid.hidden = true;
    gridLotes.parentNode.insertBefore(grid, gridServicios.nextSibling);

    // El botón se coloca junto a los del sitio, pero en contenedor propio.
    var referencia = botonesReact[botonesReact.length - 1];
    var caja = document.createElement("span");
    caja.className = "redcafe-empleos-tab";
    caja.setAttribute("data-redcafe-propio", "1");
    var boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = "Empleos";
    caja.appendChild(boton);
    referencia.parentNode.insertBefore(caja, referencia.nextSibling);

    /* El sitio pinta su propio recuento ("15 servicios disponibles") a partir
       del estado de React. Al abrir Empleos ese texto se quedaba puesto y
       anunciaba servicios sobre una lista de ofertas de empleo. No se le
       reescribe el texto —eso destruye el nodo que React cree tener y acaba en
       "Application error"—: se oculta con el atributo que solo mueve CSS, y el
       recuento de ofertas se anuncia en un párrafo propio. */
    function contadorDelSitio() {
      var ps = document.querySelectorAll("main p");
      for (var i = 0; i < ps.length; i++) {
        if (ps[i].children.length) continue;
        if (ps[i].closest("[data-redcafe-propio]")) continue;
        if (/^\d+\s+\S+\s+disponibles/.test((ps[i].textContent || "").trim())) return ps[i];
      }
      return null;
    }

    var resumen = document.createElement("p");
    resumen.className = "redcafe-market-resumen";
    resumen.setAttribute("data-redcafe-propio", "1");
    resumen.setAttribute("role", "status");
    resumen.setAttribute("aria-live", "polite");
    resumen.hidden = true;
    grid.parentNode.insertBefore(resumen, grid);

    /* Conmutador de las dos caras del empleo. Va en contenedor propio, delante
       del listado, y se esconde con la pestaña. */
    var vista = "ofertas";
    var conmutador = document.createElement("div");
    conmutador.className = "redcafe-market-grupo redcafe-empleo-conmutador";
    conmutador.setAttribute("data-redcafe-propio", "1");
    conmutador.setAttribute("role", "group");
    conmutador.setAttribute("aria-label", "Qué lado de la bolsa de empleo mirar");
    conmutador.hidden = true;
    conmutador.innerHTML =
      '<button type="button" data-vista="ofertas" class="is-activo" aria-pressed="true">Ofertas de trabajo</button>' +
      '<button type="button" data-vista="busco" aria-pressed="false">Buscan trabajo</button>';
    resumen.parentNode.insertBefore(conmutador, resumen);

    function anunciar(n) {
      resumen.hidden = false;
      if (vista === "busco") {
        resumen.textContent = n === 0
          ? "Nadie ha publicado todavía que busca trabajo."
          : n === 1 ? "1 persona busca trabajo." : n + " personas buscan trabajo.";
        return;
      }
      resumen.textContent = n === 0
        ? "Ninguna oferta publicada todavía."
        : n === 1 ? "1 oferta de empleo publicada." : n + " ofertas de empleo publicadas.";
    }

    /* Una caché por vista: cambiar de lado no debe volver a pedir lo mismo,
       pero tampoco puede mostrar el listado del otro lado mientras llega. */
    var cache = { ofertas: null, busco: null };

    function pintarVista() {
      if (cache[vista]) {
        var lista = cache[vista];
        anunciar(lista.length);
        grid.innerHTML = lista.length
          ? lista.map(vista === "busco" ? busquedaCardHtml : empleoCardHtml).join("")
          : vacioDe(vista);
        return;
      }
      grid.innerHTML = skeletonCardsHtml(4);
      var url = vista === "busco"
        ? "/api/busco-empleo.php?action=list"
        : "/api/empleos.php?action=list";
      var pedida = vista;
      fetch(url, { credentials: "include", cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          var d = (res && res.ok && res.data) || {};
          var lista = Array.isArray(d.busquedas) ? d.busquedas
                    : (Array.isArray(d.empleos) ? d.empleos : []);
          cache[pedida] = lista;
          // Si mientras llegaba la respuesta se cambió de lado, no se pinta:
          // si no, se vería el listado de ofertas bajo el rótulo de «buscan».
          if (pedida !== vista) return;
          anunciar(lista.length);
          grid.innerHTML = lista.length
            ? lista.map(vista === "busco" ? busquedaCardHtml : empleoCardHtml).join("")
            : vacioDe(vista);
        })
        .catch(function () {
          if (pedida !== vista) return;
          grid.innerHTML = '<p class="redcafe-market-vacio">No se pudo cargar. Inténtelo de nuevo.</p>';
        });
    }

    function vacioDe(v) {
      return v === "busco"
        ? '<p class="redcafe-market-vacio">Todavía nadie ha publicado que busca trabajo. ' +
          'Si usted lo busca, publíquelo desde su panel: lo puede hacer cualquier perfil.</p>'
        : '<p class="redcafe-market-vacio">Todavía no hay ofertas publicadas. ' +
          'Si tienes un negocio de café, publica la tuya desde tu panel. ' +
          'Y si lo que ofreces es tu propio servicio o una asesoría, va en la pestaña «Servicios».</p>';
    }

    conmutador.addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("button[data-vista]") : null;
      if (!b) return;
      var nueva = b.getAttribute("data-vista");
      if (nueva === vista) return;
      vista = nueva;
      Array.prototype.forEach.call(conmutador.querySelectorAll("button[data-vista]"), function (x) {
        var activo = x === b;
        x.classList.toggle("is-activo", activo);
        x.setAttribute("aria-pressed", activo ? "true" : "false");
      });
      pintarVista();
    });

    function ocultarEmpleos() {
      grid.hidden = true;
      resumen.hidden = true;
      conmutador.hidden = true;
      var c = contadorDelSitio();
      if (c) c.removeAttribute("data-redcafe-oculto-react");
      boton.classList.remove("is-activo");
    }
    botonesReact.forEach(function (b) { b.addEventListener("click", ocultarEmpleos); });
    // Sin esto, al abrir «Requerimientos» esta pestaña se quedaba encendida y
    // se veían dos listados a la vez.
    document.addEventListener("redcafe:pestana-propia", function (ev) {
      if (ev && ev.detail !== "empleos") ocultarEmpleos();
    });

    boton.addEventListener("click", function () {
      anunciarPestanaPropia("empleos");
      grid.hidden = false;
      boton.classList.add("is-activo");
      gridLotes.hidden = true;
      gridServicios.hidden = true;
      var barra = document.getElementById("redcafe-market-barra");
      if (barra) barra.hidden = true;
      var c = contadorDelSitio();
      if (c) c.setAttribute("data-redcafe-oculto-react", "1");
      conmutador.hidden = false;
      pintarVista();
    });

    grid.addEventListener("click", function (ev) {
      if (!ev.target || !ev.target.closest) return;
      var postular = ev.target.closest(".redcafe-empleo-postular");
      if (postular && !postular.disabled) {
        var card = postular.closest(".redcafe-empleo-card");
        loadAuthMe().then(function (res) {
          if (!usuarioEnSesion(res)) {
            avisoCuenta(card, "Crea tu perfil gratis para postular y recibir la respuesta en tu panel");
            return;
          }
          abrirPostulacion(card);
        });
        return;
      }
      var escribir = ev.target.closest(".redcafe-busco-contactar");
      if (escribir && !escribir.disabled) {
        abrirContactoBusqueda(escribir.closest(".redcafe-empleo-card"));
      }
    });
  }

  function activarPestanaServicios(gridLotes) {
    if (document.getElementById("redcafe-servicios-propio")) return;
    var botones = botonesDePestana();
    if (botones.length < 2) return;

    var grid = document.createElement("div");
    grid.id = "redcafe-servicios-propio";
    grid.className = gridLotes.className;
    grid.setAttribute("data-redcafe-propio", "1");
    grid.hidden = true;
    gridLotes.insertAdjacentElement("afterend", grid);

    var cargados = false;
    function mostrar(servicios) {
      grid.innerHTML = servicios.length
        ? servicios.map(serviceCardHtml).join("")
        : '<p class="redcafe-market-vacio">Todavía no hay servicios publicados.</p>';
    }

    botones.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var quiereServicios = normalizeKey(text(btn)) === "servicios";
        grid.hidden = !quiereServicios;
        gridLotes.hidden = quiereServicios;
        var barra = document.getElementById("redcafe-market-barra");
        if (barra) barra.hidden = quiereServicios;
        if (quiereServicios && !cargados) {
          cargados = true;
          grid.innerHTML = skeletonCardsHtml(6);
          loadMarketplaceServices().then(mostrar);
        }
      });
    });

    activarPestanaEmpleos(gridLotes, grid, botones);
    activarPestanaRequerimientos(gridLotes, grid, botones);
  }

  // El dueño necesita saber que alguien preguntó por su lote: es lo que le
  // permite confirmar si sigue disponible. Se avisa a la API antes de que el
  // navegador se vaya a WhatsApp; keepalive evita que la petición muera al
  // cambiar de pestaña.
  function registrarContacto(id) {
    if (!id) return;
    try {
      fetch("/api/lotes.php?action=contacto", {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
      }).catch(function () {});
    } catch (e) {}
  }

  document.addEventListener("click", function (ev) {
    var enlace = ev.target && ev.target.closest ? ev.target.closest(".redcafe-contactar") : null;
    if (!enlace) return;
    registrarContacto(enlace.getAttribute("data-lote"));
  }, true);

  /* Solicitud interna de un lote — mismo endpoint que usa la ficha de React
     (api/pedidos.php?action=create), para que el pedido quede registrado en
     la Red y visible en la bandeja del productor y en «Mis pedidos» del
     comprador, sin depender de que el productor haya declarado WhatsApp o
     correo. Mismo patrón de manejo de 401 que ya usa la solicitud de
     servicios (patchMarketplaceServiceRequests). */
  document.addEventListener("click", function (ev) {
    var boton = ev.target && ev.target.closest ? ev.target.closest(".redcafe-solicitar-lote") : null;
    if (!boton || boton.getAttribute("data-redcafe-busy") === "1") return;
    ev.preventDefault();
    boton.setAttribute("data-redcafe-busy", "1");
    var textoOriginal = boton.textContent;
    boton.textContent = "Enviando...";
    var precio = Number(boton.getAttribute("data-precio") || 0);
    // Timeout de seguridad: una respuesta que nunca llega (red intermitente,
    // proxy que corta la conexión sin avisar) no debe dejar el botón en
    // "Enviando..." para siempre. A los 15 s se cancela y se avisa; si la
    // respuesta real llega después, `catch` de un fetch ya abortado no
    // reescribe nada porque el guard de "data-redcafe-busy" ya se liberó.
    var controlador = typeof AbortController === "function" ? new AbortController() : null;
    var venceEn = setTimeout(function () { if (controlador) controlador.abort(); }, 15000);
    fetch(marketplaceApi("/api/pedidos.php?action=create"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loteId: boton.getAttribute("data-lote") || "",
        finca: boton.getAttribute("data-finca") || "",
        productor: boton.getAttribute("data-productor") || "",
        sacos: 1,
        total: precio
      }),
      signal: controlador ? controlador.signal : undefined
    }).then(function (res) {
      clearTimeout(venceEn);
      if (res.status === 401) { location.href = "/login/"; return null; }
      return res.json();
    }).then(function (json) {
      if (!json) return;
      if (!json.ok) throw new Error((json.error) || "No se pudo registrar la solicitud.");
      boton.textContent = "Solicitud enviada";
      noticeAfter(boton, "Pedido registrado. Lo verás en tu panel, en Mis pedidos.", true);
    }).catch(function (err) {
      clearTimeout(venceEn);
      boton.textContent = textoOriginal || "Solicitar este lote";
      var mensaje = (err && err.name === "AbortError")
        ? "La solicitud tardó demasiado. Revisa tu conexión e inténtalo de nuevo."
        : (err.message || "No se pudo registrar la solicitud.");
      noticeAfter(boton, mensaje, false);
    }).finally(function () {
      boton.removeAttribute("data-redcafe-busy");
    });
  }, true);

  function normalizeKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function patchMarketplaceServicePlanBadges() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    var grid = document.getElementById("servicios-grid");
    if (!grid || grid.getAttribute("data-redcafe-service-plans") === "1") return;
    loadMarketplaceServices().then(function (services) {
      var redcafeServices = services.filter(function (service) {
        return service && (service.oficial_redcafe || /red caf[eé] ecuador/i.test(String(service.proveedor || "")));
      });
      if (!redcafeServices.length) return;
      var byTitle = {};
      var counts = { gratis: 0, premium: 0 };
      redcafeServices.forEach(function (service) {
        var title = service.titulo || service.nombre || "";
        var free = service.gratis === true || service.plan === "gratis" || service.tipo_plan === "gratis";
        if (free) counts.gratis += 1;
        else counts.premium += 1;
        byTitle[normalizeKey(title)] = { service: service, free: free };
      });

      if (!document.getElementById("redcafe-service-plan-summary")) {
        var summary = document.createElement("div");
        summary.id = "redcafe-service-plan-summary";
        summary.className = "redcafe-service-plan-summary";
        summary.innerHTML = '<span>Servicios RedCafé</span><strong>' + counts.gratis + ' gratuitos</strong><strong>' + counts.premium + ' premium</strong>';
        grid.insertAdjacentElement("beforebegin", summary);
      }

      Array.prototype.slice.call(grid.querySelectorAll("article")).forEach(function (article) {
        if (article.querySelector(".redcafe-service-plan-badge")) return;
        var titleEl = article.querySelector("h3");
        var match = byTitle[normalizeKey(text(titleEl))];
        if (!match || !titleEl) return;
        var badge = document.createElement("span");
        badge.className = "redcafe-service-plan-badge " + (match.free ? "is-free" : "is-premium");
        badge.textContent = match.free ? "Gratis RedCafé" : "Premium RedCafé";
        titleEl.insertAdjacentElement("afterend", badge);
      });
      grid.setAttribute("data-redcafe-service-plans", "1");
    });
  }

  function collapseHomeProfiles() {
    if (location.pathname !== "/" && location.pathname !== "/index.html") return;
    if (document.querySelector('[data-redcafe-profile-collapse="1"]')) return;
    var lead = Array.prototype.slice.call(document.querySelectorAll("main p")).find(function (p) {
      return text(p).indexOf("Crea tu perfil según tu actividad") !== -1 && text(p).indexOf("publicar, cotizar") !== -1;
    });
    if (!lead) return;
    var section = lead.closest("section");
    if (!section || section.querySelector("details")) return;
    var candidates = Array.prototype.slice.call(section.children).filter(function (el) {
      if (el.contains(lead) || lead.contains(el)) return false;
      var body = text(el);
      return body.indexOf("Productor") !== -1 && body.indexOf("Comprador") !== -1 && body.indexOf("Barista") !== -1;
    });
    var profileBlock = candidates[candidates.length - 1] || Array.prototype.slice.call(section.querySelectorAll("div")).find(function (el) {
      var body = text(el);
      return body.indexOf("Productor") !== -1 && body.indexOf("Tostador") !== -1 && body.indexOf("Amante del Café") !== -1;
    });
    if (!profileBlock) return;

    /* Plegar sin mover nada
       ----------------------------------------------------------------
       Antes se creaba un <details> y se metía dentro el bloque de perfiles
       con appendChild. Ese bloque lo pinta React: reparentarlo es justo lo
       que rompe su reconciliación y acaba en «Application error». Aquí no se
       mueve: se le pone un atributo de estado y el CSS decide si se ve. Un
       atributo que React no conoce no le estorba, y el botón es nuestro. */
    profileBlock.setAttribute("data-redcafe-perfiles", "cerrado");

    var boton = document.createElement("button");
    boton.type = "button";
    boton.className = "redcafe-profile-collapse";
    boton.setAttribute("data-redcafe-profile-collapse", "1");
    boton.setAttribute("data-redcafe-propio", "1");
    boton.setAttribute("aria-expanded", "false");
    boton.textContent = "Ver perfiles de la Red";
    boton.addEventListener("click", function () {
      var abierto = profileBlock.getAttribute("data-redcafe-perfiles") === "abierto";
      profileBlock.setAttribute("data-redcafe-perfiles", abierto ? "cerrado" : "abierto");
      boton.setAttribute("aria-expanded", abierto ? "false" : "true");
      boton.textContent = abierto ? "Ver perfiles de la Red" : "Ocultar perfiles de la Red";
    });
    profileBlock.insertAdjacentElement("beforebegin", boton);
  }

  // --- Mapa nacional: corrige el mapa Leaflet inicializado con ancho 0 ---
  // Al hidratar, el contenedor aun no tiene ancho y Leaflet calcula zoom 0
  // (una sola tile del mundo). Se re-mide y se encuadra Ecuador.
  function findLeafletMap(container) {
    var key = Object.keys(container).find(function (k) { return k.indexOf("__reactFiber") === 0; });
    if (!key) return null;
    var seen = new Set();
    var stack = [[container[key], 0]];
    var props = ["stateNode", "memoizedState", "memoizedProps", "child", "sibling", "return", "next", "value", "current", "_map"];
    while (stack.length) {
      var pair = stack.pop();
      var node = pair[0];
      var depth = pair[1];
      if (!node || depth > 40 || typeof node !== "object" || seen.has(node)) continue;
      seen.add(node);
      if (node._container === container && typeof node.invalidateSize === "function") return node;
      for (var i = 0; i < props.length; i++) { if (node[props[i]]) stack.push([node[props[i]], depth + 1]); }
    }
    return null;
  }

  function fixNationalMap() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    var container = document.querySelector(".leaflet-container");
    if (!container || container.getAttribute("data-redcafe-map-fixed") === "1") return;
    if (!container.getBoundingClientRect().width) return;
    var map = findLeafletMap(container);
    if (!map) return;
    container.setAttribute("data-redcafe-map-fixed", "1");
    try {
      map.invalidateSize();
      if (map.getZoom() >= 5) return;
      var pts = [];
      map.eachLayer(function (layer) { if (layer && typeof layer.getLatLng === "function") pts.push(layer.getLatLng()); });
      if (pts.length > 1 && window.L && window.L.latLngBounds) {
        map.fitBounds(window.L.latLngBounds(pts).pad(0.2));
        if (map.getZoom() < 5) map.setView([-1.6, -78.6], 6);
      } else {
        map.setView([-1.6, -78.6], 6);
      }
    } catch (_) {
      container.removeAttribute("data-redcafe-map-fixed");
    }
  }

  function patchNationalMapMarkers() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    var container = document.querySelector(".leaflet-container");
    if (!container || container.getAttribute("data-redcafe-all-markers") === "1") return;
    if (!container.getBoundingClientRect().width || !window.L) return;
    var map = findLeafletMap(container);
    if (!map) return;

    loadLotes().then(function (json) {
      var lotes = json && json.ok && json.data && Array.isArray(json.data.lotes) ? json.data.lotes : [];
      if (json && json.data && typeof json.data.sesion === "boolean") haySesion = json.data.sesion;
      if (!lotes.length) return;
      var puntos = [];
      try {
        map.eachLayer(function (layer) {
          if (layer && typeof layer.getLatLng === "function") map.removeLayer(layer);
        });
      } catch (_) {}

      lotes.forEach(function (lote) {
        if (!lote || !lote.lat || !lote.lng) return;
        var lat = Number(lote.lat);
        var lng = Number(lote.lng);
        if (!isFinite(lat) || !isFinite(lng)) return;
        var marker = window.L.marker([lat, lng]).addTo(map);
        var titulo = htmlEscape(lote.finca || lote.variedad || "Lote publicado");
        var href = "/marketplace/" + htmlEscape(lote.id || "") + "/";
        marker.bindPopup('<a href="' + href + '">' + titulo + '</a>');
        puntos.push({ lat: lat, lng: lng });
      });

      try {
        if (puntos.length > 1 && window.L.latLngBounds) {
          map.fitBounds(window.L.latLngBounds(puntos).pad(0.18));
          if (map.getZoom() < 5) map.setView([-1.6, -78.6], 6);
        }
      } catch (_) {}
      container.setAttribute("data-redcafe-all-markers", "1");
    }).catch(function () {});
  }

  // --- Detalle de lotes publicados por miembros -----------------------
  // /marketplace/<id>/ no tiene página exportada para los lotes reales: el
  // .htaccess sirve el marketplace. Aquí se antepone la ficha del lote pedido
  // para que el enlace que comparte un productor muestre SU lote.
  function renderDetalleLote() {
    var m = location.pathname.match(/^\/marketplace\/([^\/]+)\/?$/);
    var previa = document.getElementById("redcafe-lote-detalle");

    // React no gestiona los nodos que inserta este script, así que al navegar
    // dentro del sitio no los retira: la ficha del café se quedaba fijada bajo
    // la cabecera en las demás páginas y al abrir otro lote. Se retira aquí
    // cuando la ruta ya no corresponde a ese lote.
    if (previa && previa.getAttribute("data-lote") !== (m ? decodeURIComponent(m[1]) : "")) {
      previa.remove();
      previa = null;
    }
    if (!m) return;
    var id = decodeURIComponent(m[1]);
    var main = document.querySelector("main");
    if (!main || previa) return;

    var seccion = document.createElement("section");
    seccion.id = "redcafe-lote-detalle";
    seccion.className = "redcafe-lote-detalle";
    seccion.setAttribute("data-redcafe-propio", "1");
    seccion.setAttribute("data-lote", id);
    seccion.setAttribute("data-loading", "1");
    seccion.innerHTML =
      '<div class="redcafe-lote-wrap">' +
        '<p class="redcafe-lote-rotulo">Marketplace</p>' +
        '<h1 class="redcafe-lote-titulo">Cargando ficha del café...</h1>' +
        '<p class="redcafe-lote-sub">Estamos consultando la publicación actual.</p>' +
      '</div>';
    main.setAttribute("data-redcafe-lote-detalle-activo", "1");
    seccion.setAttribute("data-redcafe-propio", "1");
    main.appendChild(seccion);
    ocultarContenidoDeReact(main, seccion);

    loadLotes().then(function (json) {
      var lotes = json && json.ok && json.data && Array.isArray(json.data.lotes) ? json.data.lotes : [];
      if (json && json.data && typeof json.data.sesion === "boolean") haySesion = json.data.sesion;
      var lote = lotes.filter(function (l) { return String(l.id) === id; })[0];
      // La petición pudo resolverse después de que el usuario cambiara de página.
      var sigueEnEsteLote = location.pathname.replace(/\/$/, "") === "/marketplace/" + id;
      if (!sigueEnEsteLote) return;
      if (!lote) {
        seccion.removeAttribute("data-loading");
        seccion.innerHTML =
          '<div class="redcafe-lote-wrap">' +
            '<p class="redcafe-lote-rotulo">Marketplace</p>' +
            '<h1 class="redcafe-lote-titulo">Lote no disponible</h1>' +
            '<p class="redcafe-lote-sub">La publicación no existe, fue retirada o todavía no está disponible en el marketplace.</p>' +
            '<div class="redcafe-lote-acciones"><a class="btn-ghost" href="/marketplace/">Ver todo el marketplace</a></div>' +
          '</div>';
        return;
      }

      // T6 (optimización 20260917c): título y metadatos propios del lote.
      // El nombre del lote ya se pinta como encabezado en la ficha, así que
      // el h1 genérico que pudo dejar el marketplace exportado se oculta en
      // vez de duplicar el nombre con una copia propia.
      var nombreLote = lote.finca || lote.nombre || lote.variedad || "Lote publicado";
      var tituloLote = [nombreLote, lote.provincia || "Ecuador"].filter(Boolean).join(" · ") + " · Red Café Ecuador";
      document.title = tituloLote;
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", tituloLote);
      var ogTitulo = document.querySelector('meta[property="og:title"]');
      if (ogTitulo) ogTitulo.setAttribute("content", tituloLote);
      Array.prototype.slice.call(document.querySelectorAll("main h1")).forEach(function (h) {
        if (h.getAttribute("data-redcafe-oculto-react") === "1") return;
        if (h.getAttribute("data-redcafe-oculto") === "1") return;
        if (text(h) !== "Café y servicios para el negocio cafetero") return;
        h.setAttribute("data-redcafe-oculto-react", "1");
      });

      var contacto = lote.contacto || {};
      var wa = String(contacto.whatsapp_link || contacto.whatsapp || "").replace(/\D+/g, "");
        // ── Galería ─────────────────────────────────────────────────────
      // La ficha no mostraba NINGUNA foto, ni cuando el productor había
      // subido la suya. Para un comprador de café verde la foto del grano es
      // la primera referencia que pide.
      var galeriaHtml = function () {
        var propias = (Array.isArray(lote.imagenes) ? lote.imagenes : [])
          .filter(function (u) { return typeof u === "string" && u.indexOf("/uploads/user-content/") === 0; });
        if (!propias.length) {
          return '<figure class="redcafe-lote-galeria es-generica">' +
            '<img src="' + htmlEscape(loteImagen(lote)) + '" alt="Imagen de referencia del proceso ' +
              htmlEscape(lote.proceso || "del café") + '" loading="lazy" decoding="async">' +
            '<figcaption>Imagen de referencia del proceso, no del lote. ' +
              'Pide fotos reales antes de cerrar la compra.</figcaption>' +
          '</figure>';
        }
        return '<div class="redcafe-lote-galeria">' + propias.map(function (u, i) {
          return '<img src="' + htmlEscape(u) + '" alt="Foto ' + (i + 1) + ' del lote ' +
            htmlEscape(lote.finca || "") + '" loading="lazy" decoding="async">';
        }).join("") + '</div>';
      };

      // ── Quién vende ────────────────────────────────────────────────
      // Comprar café a un desconocido por internet exige saber a quién.
      var vendedorHtml = function () {
        var c = lote.contacto || {};
        var desde = lote.created_at ? new Date(Date.parse(lote.created_at)) : null;
        var partes = [];
        if (lote.provincia) partes.push("Opera en " + lote.provincia);
        if (desde && !isNaN(desde)) {
          partes.push("publica en la Red desde " +
            desde.toLocaleDateString("es-EC", { month: "long", year: "numeric" }));
        }
        // El lote y el perfil de quien lo vende son dos cosas distintas y se
        // verifican por separado: decir «perfil verificado» porque el lote lo
        // esté sería afirmar algo que nadie ha revisado.
        partes.push(c.verificado
          ? "perfil verificado por la administración"
          : "perfil sin verificar todavía");
        partes.push(lote.verificado
          ? "este lote está verificado" +
            (lote.verificado_por ? " por " + lote.verificado_por : "")
          : "este lote todavía no lo ha revisado la administración");
        return '<div class="redcafe-lote-vendedor">' +
          '<h2>Quién vende</h2>' +
          '<p class="redcafe-lote-vendedor-nombre">' +
            htmlEscape(c.nombre || lote.productor || "Miembro de la Red") + '</p>' +
          '<p>' + htmlEscape(partes.join(" · ")) + '.</p>' +
          (lote.ubicacion_aproximada
            ? '<p class="redcafe-lote-nota">La ubicación del mapa es una referencia de la provincia, ' +
              'no la finca exacta: pídesela si necesitas la trazabilidad del origen.</p>'
            : '') +
        '</div>';
      };

      // ── Lo que el lote todavía no declara ──────────────────────────
      // El sistema no puede inventar estos datos. Lo que sí puede es decir
      // cuáles faltan y dejar pedirlos en un clic, en vez de mostrar una
      // ficha a medias sin explicación.
      var PEDIBLES = [
        ["estado", "estado del café (pergamino, oro…)"],
        ["humedad", "porcentaje de humedad"],
        ["score", "puntaje de catación"],
        ["defectos", "defectos por muestra de 300 g"],
        ["zaranda", "zaranda o granulometría"],
        ["rendimiento", "rendimiento en trilla"],
        ["cosecha", "mes de cosecha"],
        ["empaque", "tipo de empaque"],
        ["entrega", "condiciones de entrega"],
        ["certificacion", "certificaciones"],
        ["notasTaza", "notas de taza"]
      ];

      var faltaHtml = function () {
        var faltan = PEDIBLES.filter(function (par) {
          var v = lote[par[0]];
          return v === undefined || v === null || v === "" || v === 0;
        }).map(function (par) { return par[1]; });

        var docs = Array.isArray(lote.documentos) ? lote.documentos : [];
        if (!docs.length) faltan.push("certificado o informe de catación");
        if (lote.muestraDisponible !== true) faltan.push("si envía muestra");

        if (!faltan.length) return "";

        if (esLoteDemo(lote)) return "";   // en un ejemplo no hay a quién preguntar
        var pedido = "Hola, me interesa el café " + (lote.variedad || "") + " de " +
          (lote.finca || "su finca") + ". ¿Me puede indicar " + faltan.slice(0, 5).join(", ") + "?";
        var enlace = wa
          ? '<a class="btn-ghost redcafe-contactar" data-lote="' + htmlEscape(lote.id || "") + '" ' +
            'target="_blank" rel="noreferrer" href="https://wa.me/' + wa + '?text=' +
            msgWhatsapp(pedido, "lote", lote.id) + '">Pedir estos datos por WhatsApp</a>'
          : '';
        return '<div class="redcafe-lote-falta">' +
          '<h2>Datos que este lote todavía no declara</h2>' +
          '<ul>' + faltan.map(function (f) { return '<li>' + htmlEscape(f) + '</li>'; }).join("") + '</ul>' +
          '<p class="redcafe-lote-nota">Que falten no dice nada malo del café: muchos productores ' +
            'venden sin análisis de laboratorio. Pero conviene preguntarlos antes de acordar precio.</p>' +
          enlace +
        '</div>';
      };

      var titulo = [lote.variedad || "Café", lote.proceso || ""].filter(Boolean).join(" · ");
      var cantidadMensaje = [
        lote.stockSacos ? lote.stockSacos + " sacos disponibles" : "",
        lote.stockQuintales ? lote.stockQuintales + " quintales disponibles" : "",
        lote.ventaMinima ? "pedido desde " + lote.ventaMinima : ""
      ].filter(Boolean).join(", ");
      var mensaje = msgWhatsapp("Hola, quiero consultar por el café " + titulo + " de " + (lote.finca || "") + (cantidadMensaje ? " (" + cantidadMensaje + ")" : "") + ".", "lote", lote.id);
      var marca = 'class="btn-primary redcafe-contactar" data-lote="' + htmlEscape(lote.id || "") + '"';
      var idLoteAttr = htmlEscape(lote.id || "");
      var fincaAttr = htmlEscape(lote.finca || "");
      var productorAttr = htmlEscape(lote.productor || "");
      var precioAttr = htmlEscape(String(lote.precioSaco || 0));
      // Los seis lotes de muestra de la plataforma no tienen vendedor detrás:
      // ofrecer «Contactar por WhatsApp» mandaba al comprador a preguntar por
      // un café que no existe. Se le lleva a los lotes reales.
      //
      // Antes, un lote sin WhatsApp ni correo declarado mandaba a "/comunidad/"
      // — una página sin relación con ese lote, sin forma de retomar el
      // pedido. Ahora: sin sesión, un solo mensaje de entrar (igual que ya
      // hacía botonContacto para WhatsApp/correo, pero sin repetirlo dos
      // veces si además hay WhatsApp). Con sesión, SIEMPRE hay un botón de
      // solicitud interna (registra el pedido en la Red, como en React;
      // ver el listener de `.redcafe-solicitar-lote` más abajo), y junto a
      // él WhatsApp o correo cuando el productor los declaró — nunca solo
      // uno de los dos mundos.
      var accion;
      if (esLoteDemo(lote)) {
        accion = '<div class="redcafe-lote-demo-aviso">' +
            '<p><strong>Este es un lote de ejemplo</strong> de Red Café Ecuador, para mostrar cómo se ve una ficha. ' +
            'No hay café a la venta detrás de él.</p>' +
            '<a class="btn-primary" href="/marketplace/">Ver los cafés de verdad</a>' +
          '</div>';
      } else if (!haySesion) {
        accion = '<a class="btn-primary" href="/afiliate/">Entra para contactar al vendedor</a>';
      } else {
        var piezas = ['<button type="button" class="btn-primary redcafe-solicitar-lote" data-lote="' + idLoteAttr +
          '" data-finca="' + fincaAttr + '" data-productor="' + productorAttr + '" data-precio="' + precioAttr +
          '">Solicitar este lote</button>'];
        if (wa) {
          piezas.push('<a class="btn-ghost redcafe-contactar" data-lote="' + idLoteAttr + '" target="_blank" rel="noreferrer" href="https://wa.me/' + wa + '?text=' + mensaje + '">Contactar por WhatsApp</a>');
        } else if (contacto.email) {
          piezas.push('<a class="btn-ghost redcafe-contactar" data-lote="' + idLoteAttr + '" href="mailto:' + htmlEscape(contacto.email) + '?subject=' + mensaje + '">Escribir al correo</a>');
        }
        /* reportar-miembro */
        var duenoLote = lote.productor_id || lote.published_by || "";
        if (duenoLote) piezas.push('<button type="button" class="redcafe-reportar-btn" data-reportar-uid="' + htmlEscape(duenoLote) + '" data-reportar-nombre="' + productorAttr + '">Reportar al vendedor</button>');
        accion = piezas.join("");
      }

      var dato = function (etiqueta, valor) {
        if (valor === undefined || valor === null || valor === "") return "";
        return '<div class="redcafe-lote-dato"><span>' + htmlEscape(etiqueta) + '</span><strong>' + htmlEscape(valor) + '</strong></div>';
      };
      var precioSacoDetalle = Number(lote.precioSaco || 0);
      var precioQuintalDetalle = Number(lote.precioQuintal || 0);
      var precioUnidadDetalle = Number(lote.precioUnidad || 0);
      var precioGeneralDetalle = (!precioSacoDetalle && !precioQuintalDetalle && !precioUnidadDetalle)
        ? dato("Precio", "A convenir")
        : "";
      var fichaTecnica = function () {
        var origen = [lote.finca, lote.canton, lote.provincia || "Ecuador"].filter(Boolean).join(" · ");
        var calidad = [
          lote.score ? "SCA " + lote.score : "",
          lote.humedad ? "humedad " + lote.humedad + "%" : "",
          lote.defectos ? lote.defectos + " defectos / 300 g" : "",
          lote.zaranda ? "zaranda " + lote.zaranda : ""
        ].filter(Boolean).join(" · ");
        var disponible = [
          lote.stockSacos ? lote.stockSacos + " sacos" : "",
          lote.stockQuintales ? lote.stockQuintales + " quintales" : "",
          lote.cantidadKg ? lote.cantidadKg + " kg" : ""
        ].filter(Boolean).join(" · ");
        var pedido = [
          lote.ventaMinima ? "Desde " + lote.ventaMinima : "Confirmar muestra o pedido mínimo",
          disponible ? "disponible: " + disponible : "",
          lote.empaque ? "empaque: " + lote.empaque : ""
        ].filter(Boolean).join(" · ");
        var rows = [
          ["Origen", origen],
          ["Perfil", [titulo, lote.notas || lote.notasCata || ""].filter(Boolean).join(" · ")],
          ["Calidad", calidad],
          ["Pedido", pedido]
        ].filter(function (row) { return row[1]; });
        if (!rows.length) return "";
        // Sin sesión la API ya ha quitado humedad, defectos, zaranda, empaque y
        // documentos, así que lo que queda es un resumen. Titularlo «Ficha
        // técnica de compra» justo debajo del aviso de que la ficha completa es
        // para miembros hacía dudar de cuál de las dos cosas era verdad.
        return '<div class="redcafe-lote-ficha">' +
          '<h2>' + (lote.ficha_restringida
            ? "Resumen público del lote"
            : "Ficha técnica de compra") + '</h2>' +
          rows.map(function (row) {
            return '<p><span>' + htmlEscape(row[0]) + '</span>' + htmlEscape(row[1]) + '</p>';
          }).join("") +
        '</div>';
      };

      // Certificados y respaldos que el productor adjuntó al lote: es lo que
      // permite al comprador confiar en los datos antes de pedir muestra.
      var documentosHtml = function (l) {
        var docs = Array.isArray(l.documentos) ? l.documentos : [];
        var items = docs.map(function (d) {
          var url = String(d.url || "");
          if (url.indexOf("/uploads/user-content/") !== 0) return "";
          return '<li><a href="' + htmlEscape(url) + '" target="_blank" rel="noreferrer">' +
            htmlEscape(d.titulo || "Documento") +
            '<em>' + (d.formato === "pdf" ? "PDF" : "Imagen") + '</em>' +
          '</a></li>';
        }).join("");
        // Antes, sin documentos la sección desaparecía y el comprador no
        // sabía si no había o si no se mostraban.
        if (!items) {
          return '<div class="redcafe-lote-docs es-vacia"><h2>Certificados y documentos</h2>' +
            '<p>Este lote no tiene documentos adjuntos. Puedes pedir el informe de ' +
            'catación o el certificado antes de cerrar la compra.</p></div>';
        }
        return '<div class="redcafe-lote-docs"><h2>Certificados y documentos</h2><ul>' + items + '</ul></div>';
      };

      // Cuando la API recorta la ficha por venir sin sesión, se dice por qué
      // y se ofrece la puerta, en vez de mostrar una ficha corta a secas.
      var invitacionHtml = function () {
        if (!lote.ficha_restringida) return "";
        return '<div class="redcafe-lote-registro">' +
          '<h2>La ficha completa y el contacto son para miembros</h2>' +
          '<p>El análisis de laboratorio, el informe de catación, los certificados y ' +
            'el resto de la ficha técnica los publica el productor para quien tiene ' +
            'cuenta en la Red. Con tu perfil puedes escribir al vendedor, hacer pedidos ' +
            'y dar seguimiento desde tu panel: el productor sabe quién le está comprando.</p>' +
          '<div class="redcafe-lote-registro-acciones">' +
            '<a class="btn-primary" href="/afiliate/">Crear mi cuenta gratis</a>' +
            '<a class="btn-ghost" href="/login/">Ya tengo cuenta</a>' +
          '</div>' +
        '</div>';
      };

      seccion.removeAttribute("data-loading");
      seccion.innerHTML =
        '<div class="redcafe-lote-wrap">' +
          '<p class="redcafe-lote-rotulo">' + htmlEscape([lote.canton, lote.provincia || "Ecuador"].filter(Boolean).join(" · ")) +
            (lote.ubicacion_aproximada === true ? '<span class="redcafe-etiqueta-aprox">' + htmlEscape("Ubicación aproximada") + '</span>' : '') +
            selloVerificado(lote) + selloDisponibilidad(lote) + etiquetaEjemplo(lote) + '</p>' +
          '<h1 class="redcafe-lote-titulo">' + htmlEscape(lote.finca || "Lote publicado") + '</h1>' +
          '<p class="redcafe-lote-sub">' + htmlEscape(titulo) + (lote.productor ? ' · ' + htmlEscape(lote.productor) : '') + '</p>' +
          (lote.descripcion ? '<p class="redcafe-lote-desc">' + htmlEscape(lote.descripcion) + '</p>' : '') +
          galeriaHtml() +
          '<div class="redcafe-lote-datos">' +
            dato("Altura", alturaLegible(lote) || "Sin indicar") +
            dato("Puntaje de catación", lote.score ? lote.score + " / 100 (SCA)" : "Sin catar") +
            dato("Precio por saco", precioSacoDetalle > 0 ? "$ " + lote.precioSaco : "") +
            dato("Precio por quintal", precioQuintalDetalle > 0
              ? "$ " + lote.precioQuintal
              : (precioSacoDetalle > 0 && Number(lote.pesoSacoLb || 0) > 0
                  ? "≈ $ " + (Math.round((precioSacoDetalle * 100 / Number(lote.pesoSacoLb)) * 100) / 100) +
                    " (calculado sobre un saco de " + Number(lote.pesoSacoLb) + " lb)"
                  : "")) +
            dato("Peso del saco", Number(lote.pesoSacoLb || 0) > 0
              ? Number(lote.pesoSacoLb) + " lb"
              : (precioSacoDetalle > 0 ? "Sin indicar" : "")) +
            precioGeneralDetalle +
            dato("Disponibilidad", ETIQUETA_DISPONIBILIDAD[disponibilidadLote(lote)] || "Disponible") +
            dato("Sacos disponibles", lote.stockSacos) +
            dato("Venta mínima", lote.ventaMinima || "A convenir") +
            dato("Certificación", lote.certificacion || "Sin especificar") +
            dato("Estado", lote.estado) +
            dato("Humedad", lote.humedad ? lote.humedad + " %" : "") +
            dato("Zaranda", lote.zaranda) +
            dato("Defectos / 300 g", lote.defectos) +
            dato("Rendimiento", lote.rendimiento ? lote.rendimiento + " %" : "") +
            dato("Empaque", lote.empaque) +
            dato("Cosecha", lote.cosecha) +
            dato("Cantidad", lote.cantidadKg ? lote.cantidadKg + " kg" : "") +
            dato("Entrega", lote.entrega) +
            dato("Muestra", lote.muestraDisponible === true ? "Disponible" : (lote.muestraDisponible === false ? "No disponible" : "")) +
            // Café ya tostado y empacado: lo que mira quien compra la bolsa.
            dato("Marca", lote.marca) +
            dato("Presentación", presentacionLote(lote)) +
            dato("Precio por unidad", precioUnidadDetalle > 0 ? "$ " + lote.precioUnidad : "") +
            dato("Unidades disponibles", lote.unidades) +
            dato("Tueste", lote.tueste) +
            dato("Molienda", lote.molienda) +
            dato("Fecha de tueste", lote.fechaTueste) +
            dato("Empaque", lote.empaqueTerminado) +
            dato("Registro sanitario", lote.registroSanitario) +
            dato("Descafeinado", lote.descafeinado === true ? "Sí" : (lote.descafeinado === false ? "No" : "")) +
            dato("Perfil en etiqueta", lote.perfilTaza) +
          '</div>' +
          (lote.notasTaza ? '<p class="redcafe-lote-desc"><strong>Notas de taza:</strong> ' + htmlEscape(lote.notasTaza) + '</p>' : '') +
          (lote.observaciones ? '<p class="redcafe-lote-desc">' + htmlEscape(lote.observaciones) + '</p>' : '') +
          invitacionHtml() +
          (lote.ficha_restringida ? "" : documentosHtml(lote)) +
          vendedorHtml() +
          (lote.ficha_restringida ? "" : faltaHtml()) +
          fichaTecnica() +
          '<div class="redcafe-lote-acciones">' + accion +
            '<a class="btn-ghost" href="/marketplace/">Ver todo el marketplace</a>' +
          '</div>' +
        '</div>';
    }).catch(function () {
      // Cuando la API recorta la ficha por venir sin sesión, se dice por qué
      // y se ofrece la puerta, en vez de mostrar una ficha corta a secas.
      var invitacionHtml = function () {
        if (!lote.ficha_restringida) return "";
        return '<div class="redcafe-lote-registro">' +
          '<h2>La ficha completa y el contacto son para miembros</h2>' +
          '<p>El análisis de laboratorio, el informe de catación, los certificados y ' +
            'el resto de la ficha técnica los publica el productor para quien tiene ' +
            'cuenta en la Red. Con tu perfil puedes escribir al vendedor, hacer pedidos ' +
            'y dar seguimiento desde tu panel: el productor sabe quién le está comprando.</p>' +
          '<div class="redcafe-lote-registro-acciones">' +
            '<a class="btn-primary" href="/afiliate/">Crear mi cuenta gratis</a>' +
            '<a class="btn-ghost" href="/login/">Ya tengo cuenta</a>' +
          '</div>' +
        '</div>';
      };

      seccion.removeAttribute("data-loading");
      seccion.innerHTML =
        '<div class="redcafe-lote-wrap">' +
          '<p class="redcafe-lote-rotulo">Marketplace</p>' +
          '<h1 class="redcafe-lote-titulo">No se pudo cargar la ficha</h1>' +
          '<p class="redcafe-lote-sub">Revisa la conexión o vuelve al marketplace para intentarlo de nuevo.</p>' +
          '<div class="redcafe-lote-acciones"><a class="btn-ghost" href="/marketplace/">Ver todo el marketplace</a></div>' +
        '</div>';
    });
  }

  // Indicación junto al campo de fotos del lote. La foto de una web o de un
  // catálogo no sirve para vender café: el comprador necesita ver el grano
  // real, y una imagen que no corresponde al lote destruye la confianza.
  function notaFotosReales() {
    if (location.pathname.indexOf("/panel") !== 0 && location.pathname.indexOf("/afiliate") !== 0) return;
    Array.prototype.slice.call(document.querySelectorAll("label, p, span, h3, h4")).forEach(function (el) {
      if (el.querySelector("label, p, span, h3, h4")) return;
      if (text(el).indexOf("Fotos del lote") === -1) return;
      var host = el.parentElement || el;
      if (host.querySelector('[data-redcafe-nota-fotos="1"]')) return;
      var nota = document.createElement("p");
      nota.setAttribute("data-redcafe-nota-fotos", "1");
      nota.className = "redcafe-nota-fotos";
      nota.innerHTML =
        "<strong>Toma las fotos del café real que estás vendiendo.</strong> " +
        "Muestra el grano de este lote (pergamino, oro o cereza según corresponda), " +
        "el saco o empaque y, si puedes, la finca. Con luz de día y sin filtros. " +
        "No uses fotos de internet ni de otra cosecha: quien compra las compara con la muestra.";
      el.insertAdjacentElement("afterend", nota);
    });
  }

  function applyAll() {
    limpiarCopiasHuerfanas();
    addSecondaryMenu();
    removeHomeRedundantSections();
    rebuildMarketplaceIfEmpty();
    patchPaymentInstructions();
    patchContratarServicePrice();
    patchChatEnterToSend();
    removeMarketplaceDemoNotes();
    patchMarketplaceServiceRequests();
    patchMarketplaceServicePlanBadges();
    patchMarketplaceLotGrid();
    patchMarketplaceLotContacts();
    fixNationalMap();
    observarTamanoMapa();
    marcarTarjetasEjemplo();
    patchNationalMapMarkers();
    marcarRutaLote();
    notaFotosReales();
    collapseHomeProfiles();
  }

  // El mapa lo monta React de forma diferida: se reintenta hasta encuadrarlo.
  // Si el mapa se monta dentro de un contenedor todavía sin ancho (pestaña
  // oculta, panel plegado), no se puede dimensionar: se espera a que lo tenga.
  function observarTamanoMapa() {
    if (!window.ResizeObserver || window.__redcafeMapObserver) return;
    var container = document.querySelector(".leaflet-container");
    if (!container) return;
    window.__redcafeMapObserver = new ResizeObserver(function () {
      var c = document.querySelector(".leaflet-container");
      if (c && c.getBoundingClientRect().width > 0 && c.getAttribute("data-redcafe-map-fixed") !== "1") {
        fixNationalMap();
      }
    });
    window.__redcafeMapObserver.observe(container);
  }

  function marcarTarjetasEjemplo() {
  }

  function scheduleMapFix() {
    if (location.pathname.indexOf("/marketplace") !== 0) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      fixNationalMap();
      patchNationalMapMarkers();
      var container = document.querySelector(".leaflet-container");
      if (tries > 30 || (container && container.getAttribute("data-redcafe-map-fixed") === "1" && container.getAttribute("data-redcafe-all-markers") === "1")) clearInterval(timer);
    }, 500);
    // Una sola suscripción a resize por sesión: scheduleMapFix se ejecuta cada
    // vez que se entra al marketplace, y antes dejaba un listener por visita.
    if (!window.__redcafeMapaResize) {
      window.__redcafeMapaResize = true;
      window.addEventListener("resize", function () {
        if (location.pathname.indexOf("/marketplace") !== 0) return;
        var container = document.querySelector(".leaflet-container");
        if (container) container.removeAttribute("data-redcafe-map-fixed");
        fixNationalMap();
      }, { passive: true });
    }
  }

  /* Vigilantes que se registran UNA sola vez
     ------------------------------------------------------------------
     start() se llama otra vez en cada navegación SPA, y antes registraba en
     cada llamada otro listener global de click y otro MutationObserver sobre
     todo el documento. Tras diez navegaciones había diez observadores, cada
     uno programando su propio applyAll: coste que crece con el rato que el
     usuario lleva en el sitio, y carreras entre pasadas simultáneas.
     Lo que sí debe repetirse en cada ruta es applyAll y el arreglo del mapa;
     los vigilantes no. */
  function vigilarUnaVez() {
    if (window.__redcafeV60Vigilando) return;
    window.__redcafeV60Vigilando = true;

    document.addEventListener("click", function (event) {
      if (event.target && event.target.closest && event.target.closest("#profile-selector")) {
        var perfil = profileNameFromElement(event.target);
        if (perfil) {
          window.__redcafePerfilSeleccionado = perfil;
          window.__redcafePerfilSeleccionadoAt = Date.now();
        }
        applyAll();
        setTimeout(applyAll, 80);
        setTimeout(applyAll, 250);
      }
    }, true);
    if (window.MutationObserver) {
      // El observador se desconecta mientras applyAll escribe en el DOM: sin esta
      // guarda, cada cambio propio volvía a disparar applyAll en bucle.
      var observer = new MutationObserver(function () {
        clearTimeout(window.__redcafeV60HotfixTimer);
        window.__redcafeV60HotfixTimer = setTimeout(function () {
          observer.disconnect();
          try { applyAll(); } finally { connect(); }
        }, 120);
      });
      function connect() {
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
      }
      connect();
    }
  }

  function start() {
    applyAll();
    scheduleMapFix();
    vigilarUnaVez();
  }

  // En /marketplace/<id>/ el servidor entrega el marketplace completo y la ficha
  // del lote la compone este script. Sin marcar la ruta cuanto antes se veía
  // primero el marketplace entero y, segundos después, la ficha: dos versiones
  // de la misma página. Se oculta el listado desde el inicio (vía CSS) y se
  // pide la ficha de inmediato.
  function marcarRutaLote() {
    var raiz = document.documentElement;
    if (/^\/marketplace\/[^\/]+\/?$/.test(location.pathname)) {
      raiz.setAttribute("data-redcafe-lote", "1");
      // Dejar que React hidrate antes de añadir una ficha ajena a su árbol.
      setTimeout(renderDetalleLote, 1200);
      setTimeout(function () {
        // Red de seguridad: si la ficha no llega, se devuelve el marketplace.
        if (!document.getElementById("redcafe-lote-detalle")) raiz.removeAttribute("data-redcafe-lote");
      }, 6000);
    } else {
      raiz.removeAttribute("data-redcafe-lote");
    }
  }

  function startWhenStable() {
    marcarRutaLote();
    setTimeout(start, 2400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", marcarRutaLote, { once: true });
  } else {
    marcarRutaLote();
  }

  if (document.readyState === "complete") startWhenStable();
  else window.addEventListener("load", startWhenStable, { once: true });

  // Next navega sin recargar. redcafe-ruta.js ya retiró lo de la ruta
  // anterior y borró las marcas de "ya hecho"; aquí se vuelve a montar el
  // marketplace o la ficha del lote según dónde estemos ahora.
  document.addEventListener("redcafe:ruta", function () {
    estadoMarketplace = null;
    marcarRutaLote();
    setTimeout(start, 1400);
  });
})();

/* enlaces-comunidad */
/* /marketplace/?ver=servicios|requerimientos|empleos abre esa pestaña (las
   novedades de la comunidad enlazan así a lo que anuncian). Las pestañas se
   montan tras cargar: se reintenta unos segundos. */
(function () {
  "use strict";
  if (!/^\/marketplace\/?$/.test(location.pathname)) return;
  var ver = new URLSearchParams(location.search).get("ver");
  var texto = { servicios: "Servicios", requerimientos: "Requerimientos", empleos: "Empleos" }[ver || ""];
  if (!texto) return;
  var intentos = 0;
  var reloj = setInterval(function () {
    intentos++;
    var b = Array.prototype.slice.call(document.querySelectorAll("main button")).find(function (x) {
      return (x.textContent || "").trim() === texto;
    });
    if (b) { clearInterval(reloj); b.click(); b.scrollIntoView({ block: "center" }); }
    else if (intentos > 25) clearInterval(reloj);
  }, 300);
})();
