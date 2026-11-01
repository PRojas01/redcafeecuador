<?php
declare(strict_types=1);

/* Red Café Ecuador — Preacuerdo estratégico 2026
 * ---------------------------------------------------------------------------
 * PUERTA DE ACCESO. Esta página lleva dentro el modelo de negocio, las
 * proyecciones financieras y el punto de equilibrio. Solo entra quien ANTES
 * aceptó el registro en la invitación:
 *   /socios/redcafe-invitacion-estrategica-2026-a7f3c9/
 *
 * La comprobación es de servidor a propósito. Hacerla en JavaScript habría sido
 * teatro: el HTML se entrega igual y cualquiera lo lee con un `curl`. Aquí, si
 * no hay registro aceptado, el contenido no llega a imprimirse.
 *
 * El fichero index.html de esta carpeta queda denegado por el .htaccess de al
 * lado: sin eso, el DirectoryIndex del sitio lo serviría antes que a este PHP
 * y la puerta no pintaría nada.
 */

require_once __DIR__ . '/../../api/_bootstrap.php';

$invitacion = '/socios/redcafe-invitacion-estrategica-2026-a7f3c9/';

/** ¿Hay un registro aceptado de verdad detrás de esta sesión? */
function preacuerdo_tiene_acceso(): bool {
    // La administración entra siempre: necesita revisar lo que firma.
    if (!empty($_SESSION['admin'])) return true;

    $id = trim((string)($_SESSION['socio_id'] ?? ''));
    if ($id === '') return false;

    // No basta con que la sesión traiga un id: se comprueba que el registro
    // exista y tenga las dos aceptaciones. Un registro borrado por la
    // administración deja de dar acceso en la siguiente carga.
    foreach (load_json('socios-invitados', []) as $item) {
        if ((string)($item['id'] ?? '') !== $id) continue;
        return !empty($item['accepted_privacy']) && !empty($item['accepted_confidentiality']);
    }
    return false;
}

if (!preacuerdo_tiene_acceso()) {
    header('Location: ' . $invitacion, true, 302);
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Robots-Tag: noindex, nofollow');
    // Un cuerpo mínimo para quien no siga la redirección. Ni una línea del
    // preacuerdo sale de aquí.
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta charset="utf-8"><title>Acceso restringido</title>'
       . '<meta name="robots" content="noindex, nofollow">'
       . '<p>El preacuerdo es para invitados que ya completaron el registro de aceptación. '
       . '<a href="' . htmlspecialchars($invitacion, ENT_QUOTES) . '">Ir a la invitación</a>.</p>';
    exit;
}

/* _bootstrap.php fija `Content-Type: application/json` porque nace para las
   APIs. Sin corregirlo, esta página se entrega como JSON y —con `nosniff`
   puesto— el navegador ni la intenta interpretar: se ve el texto crudo, sin
   título ni estilos. Medido. */
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Robots-Tag: noindex, nofollow');
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Preacuerdo estratégico 2026 - Red Café Ecuador</title>
  <link rel="stylesheet" href="/_next/static/css/6667e8518b882bfa.css"/><link rel="stylesheet" href="/redcafe-v60-final.css?v=20260924e"/>
</head>
<body class="redcafe-socios-page min-h-screen flex flex-col">
  <header class="sticky top-0 z-50 transition-all duration-300 border-b border-filtrado-600/25 bg-cafe backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
      <a class="group flex min-h-11 items-center gap-2.5" href="/"><svg viewBox="0 0 96 96" class="h-9 w-9 shrink-0 text-crema" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 32a35 35 0 0 1 54-6"></path><path d="M60 21l12 5-4 12"></path><path d="M78 64a35 35 0 0 1-54 6"></path><path d="M36 75l-12-5 4-12"></path></g><mask id="hendidura-grano"><rect width="96" height="96" fill="#fff"></rect><path d="M48 34c-3.6 5.6 3.6 11.2 0 16.8s-3.6 11.2 0 16.8" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"></path></mask><ellipse cx="48" cy="50" rx="12" ry="17" fill="currentColor" mask="url(#hendidura-grano)"></ellipse></svg><span class="marca text-lg leading-none text-crema">Red Café<span class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-acento-claro">Ecuador<img src="/img/bandera-ecuador-96.webp" srcset="/img/bandera-ecuador-96.webp 96w, /img/bandera-ecuador-192.webp 192w" sizes="(min-width: 768px) 32px, 24px" width="96" height="64" alt="" aria-hidden="true" loading="lazy" decoding="async" class="h-3.5 w-5 shrink-0" style="object-fit:contain"/></span></span></a>
      <nav class="hidden items-center gap-4 text-[13px] font-medium text-crema/85 lg:flex xl:gap-5" aria-label="Principal">
        <a class="inline-flex min-h-10 items-center whitespace-nowrap transition-colors hover:text-acento-claro" href="/marketplace/">Marketplace</a>
        <a class="inline-flex min-h-10 items-center whitespace-nowrap transition-colors hover:text-acento-claro" href="/academia/">Academia</a>
        <a class="inline-flex min-h-10 items-center whitespace-nowrap transition-colors hover:text-acento-claro" href="/servicios/">Servicios</a>
        <a class="inline-flex min-h-10 items-center whitespace-nowrap transition-colors hover:text-acento-claro" href="/quienes-somos/">Quiénes somos</a>
        <a class="inline-flex min-h-10 items-center whitespace-nowrap transition-colors hover:text-acento-claro" href="/comunidad/">Comunidad</a>
        <a class="inline-flex min-h-10 items-center whitespace-nowrap transition-colors hover:text-acento-claro" href="/login/">Entrar</a>
        <a class="btn-primary !px-4 !py-2 text-[13px]" href="/afiliate/">Forma parte de la Red</a>
      </nav>
      <button class="grid h-11 w-11 place-items-center border border-crema/25 text-crema lg:hidden" aria-label="Abrir menú" aria-expanded="false"><span class="text-lg leading-none">≡</span></button>
    </div>
  </header>

  <section class="redcafe-socios-hero">
    <div>
      <p class="redcafe-socios-eyebrow">Preacuerdo estratégico privado 2026</p>
      <h1>Preacuerdo privado para evaluar una colaboración con Red Café Ecuador</h1>
      <p>Este documento resume qué es la plataforma, qué le pedimos y qué le ofrecemos según su forma de participar, y qué condiciones deben quedar por escrito antes de cualquier alianza, inversión, servicio oficial o piloto.</p>
      <div class="redcafe-socios-actions">
        <a href="#retroalimentacion">Enviar respuesta</a>
        <a href="/afiliate/">Crear perfil gratis</a>
      </div>
      <p>No es una oferta pública de valores, no promete rentabilidad y no sustituye un contrato firmado. Sirve para que usted evalúe el encaje y responda si desea avanzar, ajustar condiciones o presentar una contrapropuesta.</p>
    </div>
  </section>

  <main class="redcafe-socios-main flex-1">
    <section id="indice" class="redcafe-socios-cardbox">
      <h2>Contenido del preacuerdo</h2>
      <div class="redcafe-socios-grid">
        <div class="redcafe-socios-dato"><span>01</span><strong><a href="#resumen">Qué es Red Café Ecuador</a></strong></div>
        <div class="redcafe-socios-dato"><span>02</span><strong><a href="#perfiles">Perfiles que atiende la Red</a></strong></div>
        <div class="redcafe-socios-dato"><span>03</span><strong><a href="#servicios-plataforma">Servicios gratuitos y premium</a></strong></div>
        <div class="redcafe-socios-dato"><span>04</span><strong><a href="#que-pedimos">Qué le pedimos y qué le ofrecemos</a></strong></div>
        <div class="redcafe-socios-dato"><span>05</span><strong><a href="#partes">Partes y objeto</a></strong></div>
        <div class="redcafe-socios-dato"><span>06</span><strong><a href="#clausulas">Cláusulas preliminares</a></strong></div>
        <div class="redcafe-socios-dato"><span>07</span><strong><a href="#formas-asociacion">Formas de asociación, inversión y márgenes</a></strong></div>
        <div class="redcafe-socios-dato"><span>08</span><strong><a href="#valoracion">Valoración y participación</a></strong></div>
        <div class="redcafe-socios-dato"><span>09</span><strong><a href="#modelo">Modelo de negocio e ingresos</a></strong></div>
        <div class="redcafe-socios-dato"><span>10</span><strong><a href="#proyeccion">Proyección financiera (referencial)</a></strong></div>
        <div class="redcafe-socios-dato"><span>11</span><strong><a href="#flujo">Flujo de caja inicial (referencial)</a></strong></div>
        <div class="redcafe-socios-dato"><span>12</span><strong><a href="#equilibrio">Punto de equilibrio (referencial)</a></strong></div>
        <div class="redcafe-socios-dato"><span>13</span><strong><a href="#fondos">Uso propuesto de fondos</a></strong></div>
        <div class="redcafe-socios-dato"><span>14</span><strong><a href="#objeciones">Objeciones de inversionista</a></strong></div>
        <div class="redcafe-socios-dato"><span>15</span><strong><a href="#retroalimentacion">Su respuesta</a></strong></div>
      </div>
    </section>

    <section id="resumen" class="redcafe-socios-cardbox redcafe-socios-section">
      <h2>Qué es Red Café Ecuador</h2>
      <p>Red Café Ecuador es una plataforma de negocios para el café ecuatoriano. En el sector se pierden oportunidades por información dispersa, baja trazabilidad, dificultad para validar a los actores y escasa visibilidad comercial; la Red reúne en un mismo lugar oferta publicada, contactos verificables, servicios, precios, formación y trazabilidad.</p>
      <p>La siguiente etapa busca ampliar registros útiles, activar servicios claros y sumar aliados que aporten compradores, trabajo técnico, capital, tecnología o capacidad comercial verificable, empezando por un piloto de 90 días.</p>
      <h3 id="funciones">Funciones que ya existen en el sitio</h3>
      <div class="redcafe-socios-grid">
        <div class="redcafe-socios-dato"><span>Marketplace</span><strong>Publica y muestra lotes de café con fichas por origen, variedad, proceso y contacto comercial.</strong></div>
        <div class="redcafe-socios-dato"><span>Academia</span><strong>Organiza cursos y rutas sobre café especial, ventas, exportación, postcosecha, tueste, trazabilidad y buenas prácticas.</strong></div>
        <div class="redcafe-socios-dato"><span>Servicios</span><strong>Agrupa asesorías y soluciones para finanzas, EUDR, facturación, contratación y herramientas de cálculo.</strong></div>
        <div class="redcafe-socios-dato"><span>Precios</span><strong>Presenta referencias de precio con enfoque informativo y fuente cuando aplica.</strong></div>
        <div class="redcafe-socios-dato"><span>Trazabilidad/EUDR</span><strong>Incluye contenido y servicio para preparar expedientes, documentación y cumplimiento relacionado con trazabilidad.</strong></div>
        <div class="redcafe-socios-dato"><span>Facturación</span><strong>Ofrece una ruta de factura y vista previa para formalizar operaciones o preparar documentos comerciales.</strong></div>
        <div class="redcafe-socios-dato"><span>Comunidad</span><strong>Permite avisos, contacto entre miembros y actividad relacionada con la Red.</strong></div>
        <div class="redcafe-socios-dato"><span>Panel</span><strong>Centraliza gestión de perfiles, publicaciones, pedidos, actividad y operación para usuarios autenticados.</strong></div>
        <div class="redcafe-socios-dato"><span>Verificaciones</span><strong>La administración puede revisar lotes de café, servicios, cursos y miembros para conceder o retirar sellos de verificación.</strong></div>
      </div>
      <h3 id="mercado">Mercado objetivo</h3>
      <p>Productores individuales, asociaciones y fincas; compradores nacionales, tostadores, cafeterías, exportadores e importadores interesados en Ecuador; laboratorios, certificadores, proveedores de insumos, profesionales, instituciones, marcas de consumo y proyectos de cooperación. No damos una cifra de tamaño de mercado sin fuente: el piloto debe medir la demanda real con registros, solicitudes, servicios vendidos, compradores activos y publicaciones útiles.</p>
      <h3 id="diferenciacion">Frente a asociaciones, gremios y cámaras</h3>
      <p>No los reemplazamos. Ellos cumplen roles de representación, convocatoria, política sectorial y trabajo territorial; la Red les suma una capa operativa digital.</p>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Actor</th><th>Rol natural</th><th>Complemento de Red Café Ecuador</th></tr></thead>
          <tbody>
            <tr><td>Asociaciones de productores</td><td>Organización local, representación y coordinación productiva.</td><td>Visibilidad digital, publicación de oferta, trazabilidad, formación y servicios.</td></tr>
            <tr><td>Gremios</td><td>Agenda sectorial, articulación y vocería.</td><td>Datos operativos, marketplace, campañas, contenidos y medición de oportunidades.</td></tr>
            <tr><td>Cámaras</td><td>Relaciones empresariales, promoción y entorno comercial.</td><td>Canal especializado para café, compradores, servicios y documentación de valor.</td></tr>
            <tr><td>Instituciones públicas o cooperación</td><td>Programas, financiamiento, asistencia y alcance territorial.</td><td>Herramientas digitales, registro, seguimiento y conexión con mercado.</td></tr>
          </tbody>
        </table>
      </div>
      <h3 id="vision">Meta de largo plazo</h3>
      <p>Que la Red sea una herramienta práctica para todo el sector, sin centralizarlo ni apropiarse de relaciones existentes: que productores, compradores, instituciones, marcas y prestadores de servicios se encuentren, documenten, validen, aprendan, vendan, compren y midan avances con mayor confianza. Prioridades, en este orden: confianza y verificación; trazabilidad y cumplimiento; comercio y exportación; formación y calidad; datos, IA y financiamiento.</p>
    </section>

    <section id="perfiles" class="redcafe-socios-cardbox redcafe-socios-section">
      <p class="redcafe-socios-eyebrow">Perfiles y servicios</p>
      <h2>Perfiles que atiende la Red</h2>
      <p>«Hoy en la Red» cuenta roles declarados en la plataforma: una misma persona u organización puede tener más de uno. Los precios de cada servicio están en la tabla siguiente.</p>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Perfil de la plataforma</th><th>Hoy en la Red</th><th>Qué obtiene gratis</th><th>Servicio premium útil</th><th>Qué aporta a la Red</th></tr></thead>
          <tbody>
            <tr><td>Productor</td><td>44 roles</td><td>Perfil, publicación de lotes de café, marketplace, academia básica, panel de precios y contacto directo.</td><td>Verificación de perfil, informe de catación y expediente EUDR.</td><td>Oferta real, origen, historia de finca, datos de producción y disponibilidad comercial.</td></tr>
            <tr><td>Vendedor / tostador / comerciante</td><td>14 roles</td><td>Perfil comercial, visibilidad, publicación de servicios o productos, comunidad y contactos.</td><td>Asesoría de negocio y curso de especialidad.</td><td>Transformación, lectura de mercado, canales de venta y retroalimentación de demanda.</td></tr>
            <tr><td>Comprador</td><td>13 roles</td><td>Búsqueda de lotes de café, requerimientos de compra, contacto directo, referencias de origen e intermediación en compraventa según alcance.</td><td>Informe de catación.</td><td>Demanda, criterios de calidad, compras piloto y señales de precio.</td></tr>
            <tr><td>Amante del café</td><td>8 roles</td><td>Comunidad, academia básica, noticias, recetas y aprendizaje de cultura cafetera.</td><td>Curso de barismo y curso de especialidad.</td><td>Audiencia, difusión, retroalimentación de consumo y cultura cafetera.</td></tr>
            <tr><td>Asesor</td><td>7 roles</td><td>Perfil profesional, vitrina de experiencia, contacto con productores y participación en comunidad.</td><td>Verificación de perfil; integración como servicio aliado según alcance.</td><td>Conocimiento técnico, acompañamiento, diagnóstico y confianza operativa.</td></tr>
            <tr><td>Exportador</td><td>7 roles</td><td>Exploración de lotes de café, perfiles, contactos y requerimientos comerciales.</td><td>Asesoría de exportación y expediente EUDR.</td><td>Mercado externo, estándares, documentación, volumen y demanda especializada.</td></tr>
            <tr><td>Pilador</td><td>4 roles</td><td>Perfil de servicio, contacto con productores y publicación de capacidad operativa.</td><td>Pilado de sacos y verificación de perfil.</td><td>Transformación física, preparación de café y capacidad territorial.</td></tr>
            <tr><td>Barista</td><td>2 roles</td><td>Perfil profesional, comunidad, academia y visibilidad ante cafeterías o marcas.</td><td>Curso de barismo y curso de especialidad.</td><td>Preparación, educación al consumidor, evaluación sensorial y reputación.</td></tr>
            <tr><td>Bar / cafetería</td><td>2 roles</td><td>Perfil comercial, contacto con productores, exploración de lotes de café y comunidad.</td><td>Curso de barismo y asesoría de negocio.</td><td>Demanda recurrente, venta al consumidor y validación de calidad en taza.</td></tr>
            <tr><td>Proveedor</td><td>1 rol</td><td>Perfil, publicación de servicios o insumos y contacto con miembros.</td><td>Verificación de perfil; campañas o servicios aliados según alcance.</td><td>Insumos, soluciones, equipamiento y soporte a la operación cafetera.</td></tr>
            <tr><td>Transportista</td><td>1 rol</td><td>Perfil de servicio, contacto con productores/compradores y visibilidad operativa.</td><td>Flete de café y verificación de perfil.</td><td>Logística, cobertura, tiempos de entrega y continuidad comercial.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="servicios-plataforma" class="redcafe-socios-cardbox redcafe-socios-section">
      <p class="redcafe-socios-eyebrow">Servicios gratuitos y premium</p>
      <h2>Qué ofrece la plataforma en cada nivel</h2>
      <p>Precios de los servicios publicados en la plataforma; pueden ajustarse según alcance, ubicación y acuerdo final.</p>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Nivel</th><th>Servicio</th><th>Precio real publicado</th><th>Uso principal</th></tr></thead>
          <tbody>
            <tr><td>Gratis</td><td>Acceso básico</td><td>0 USD / gratis</td><td>Crear perfil y empezar a usar la plataforma.</td></tr>
            <tr><td>Gratis</td><td>Marketplace de lotes de café</td><td>0 USD / gratis</td><td>Publicar o buscar oferta de café.</td></tr>
            <tr><td>Gratis</td><td>Academia básica</td><td>0 USD / gratis</td><td>Aprender y consultar contenido base.</td></tr>
            <tr><td>Gratis</td><td>Panel de precios</td><td>0 USD / gratis</td><td>Consultar referencias y herramientas informativas.</td></tr>
            <tr><td>Gratis</td><td>Intermediación en compraventa de café</td><td>0 USD / según alcance</td><td>Ordenar contacto comercial cuando aplica.</td></tr>
            <tr><td>Premium</td><td>Verificación de perfil</td><td>10 USD / por verificación</td><td>Dar mayor confianza a perfiles y publicaciones.</td></tr>
            <tr><td>Premium</td><td>Informe de catación</td><td>70 USD / por certificado</td><td>Respaldar decisiones de compra con calidad en taza.</td></tr>
            <tr><td>Premium</td><td>Expediente EUDR</td><td>120 USD / por lote</td><td>Preparar documentación de trazabilidad y cumplimiento.</td></tr>
            <tr><td>Premium</td><td>Asesoría de negocio</td><td>40 USD / por sesión</td><td>Mejorar gestión comercial, costos, oferta y ventas.</td></tr>
            <tr><td>Premium</td><td>Asesoría de exportación</td><td>90 USD / por sesión</td><td>Ordenar requisitos, negociación y documentación para vender fuera.</td></tr>
            <tr><td>Premium</td><td>Curso de barismo</td><td>60 USD / por taller</td><td>Fortalecer preparación, servicio y experiencia de taza.</td></tr>
            <tr><td>Premium</td><td>Curso de especialidad</td><td>80 USD / por taller</td><td>Elevar criterios de calidad, compra, tueste o venta especializada.</td></tr>
            <tr><td>Premium</td><td>Flete de café</td><td>7 USD / por quintal</td><td>Coordinar logística de café entre actores.</td></tr>
            <tr><td>Premium</td><td>Pilado de sacos</td><td>20 USD / por quintal</td><td>Transformar y preparar café para comercialización.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="que-pedimos" class="redcafe-socios-cardbox redcafe-socios-section">
<p class="redcafe-socios-eyebrow">Formas de participar</p>
<h2 id="participacion">Qué le pedimos y qué le ofrecemos según su forma de participar</h2>
<p>Qué espera Red Café Ecuador de cada tipo de aliado y qué puede ofrecer a cambio. Ninguna categoría crea derechos económicos automáticos: toda participación económica o societaria requiere contrato firmado, hitos verificables y responsabilidades definidas. Las condiciones de control de cada modalidad están en «Formas posibles de asociación».</p>
<div class="rc-socios-grid"><article class="rc-socio" id="socio-partner"><h3>Partner estratégico</h3><dl><div><dt>Le pedimos</dt><dd>Experiencia sectorial, reputación, cartera de clientes, servicios o capacidad de ejecución.</dd></div><div><dt>Le ofrecemos</dt><dd>Prioridad para revisar sus servicios, pilotos, canales comerciales, categorías patrocinadas y presencia institucional.</dd></div><div><dt>Participación posible</dt><dd>Alianza comercial, categoría patrocinada, servicio oficial o piloto territorial. 0 % societario; comisión o margen por operación pactada.</dd></div></dl></article><article class="rc-socio" id="socio-founder"><h3>Founder operativo</h3><dl><div><dt>Le pedimos</dt><dd>Dedicación ejecutiva, capital inicial, relaciones clave o liderazgo de una unidad del negocio.</dd></div><div><dt>Le ofrecemos</dt><dd>Participación temprana en decisiones, construcción de una unidad crítica y reconocimiento fundacional.</dd></div><div><dt>Participación posible</dt><dd>Participación propuesta de 2 % a 8 %, por hitos, con vesting y contrato societario; también contrato de dedicación o unidad de negocio.</dd></div></dl></article><article class="rc-socio" id="socio-inversionista"><h3>Inversionista</h3><dl><div><dt>Le pedimos</dt><dd>Capital por etapas, criterio financiero, revisión de riesgo y red empresarial.</dd></div><div><dt>Le ofrecemos</dt><dd>Información reservada, escenarios estimados, plan de uso de fondos y reportes por indicadores.</dd></div><div><dt>Participación posible</dt><dd>Participación propuesta de 5 % a 15 %, préstamo convertible, instrumento privado equivalente, patrocinio o aporte por etapas, tras debida diligencia.</dd></div></dl></article><article class="rc-socio" id="socio-profesional"><h3>Profesional aliado</h3><dl><div><dt>Le pedimos</dt><dd>Servicio técnico con tiempos claros, precio publicado y calidad documentada: catación, certificación, EUDR, asesoría o formación.</dd></div><div><dt>Le ofrecemos</dt><dd>Canal especializado, ficha de servicio publicada, reputación y acceso a necesidades reales de los miembros actuales.</dd></div><div><dt>Participación posible</dt><dd>Servicio aliado, bolsa de horas, convenio por casos o integración al marketplace. 0 % societario; entre el 70 % y el 85 % de cada servicio para el prestador (cursos y talleres: 60 % a 75 % para el instructor; verificaciones y expedientes: 45 % a 65 % para el responsable técnico, según la tabla de márgenes).</dd></div></dl></article><article class="rc-socio" id="socio-institucion"><h3>Institución aliada</h3><dl><div><dt>Le pedimos</dt><dd>Programas, formación, cooperación técnica, datos autorizados o alcance territorial.</dd></div><div><dt>Le ofrecemos</dt><dd>Herramientas digitales, registro, seguimiento y documentación de resultados para sus beneficiarios.</dd></div><div><dt>Participación posible</dt><dd>Programa territorial, convenio institucional, campaña educativa o piloto de trazabilidad. 0 % societario; visibilidad y reportes de programa.</dd></div></dl></article><article class="rc-socio" id="socio-productor"><h3>Productor líder</h3><dl><div><dt>Le pedimos</dt><dd>Lotes trazables de café, liderazgo local, testimonio, retroalimentación y disciplina de datos.</dd></div><div><dt>Le ofrecemos</dt><dd>Visibilidad, acompañamiento, validación de herramientas y conexión con compradores verificables.</dd></div><div><dt>Participación posible</dt><dd>Finca piloto, vocería territorial, validación de servicios o caso documentado. 0 % societario; prioridad en programas y servicios.</dd></div></dl></article><article class="rc-socio" id="socio-comprador"><h3>Comprador o exportador</h3><dl><div><dt>Le pedimos</dt><dd>Requerimientos claros, criterios de compra, retroalimentación de mercado y compras piloto cuando haya encaje.</dd></div><div><dt>Le ofrecemos</dt><dd>Búsqueda organizada de oferta de café, contacto directo, soporte documental y referencias de calidad.</dd></div><div><dt>Participación posible</dt><dd>Acuerdo de abastecimiento, piloto de compra, programa de origen o canal comercial recurrente. 0 % societario.</dd></div></dl></article><article class="rc-socio" id="socio-promotor"><h3>Aliado promotor de red</h3><dl><div><dt>Le pedimos</dt><dd>Vincular a la Red a sus contactos del sector, promoverla de forma activa y sumar a su comunidad: productores, cafeterías, baristas, compradores y alumnos.</dd></div><div><dt>Le ofrecemos</dt><dd>Participación propuesta de hasta 25 %, presencia destacada como aliado fundador de su territorio o especialidad y prioridad para integrar sus servicios, su cafetería o su academia.</dd></div><div><dt>Participación posible</dt><dd>Por tramos, según miembros activos y operaciones que origine su red, con vesting, registro del origen de cada contacto y contrato. Compatible con ser profesional aliado.</dd></div></dl></article></div>

</section>

    <section id="partes" class="redcafe-socios-cardbox redcafe-socios-section">
      <h2>Partes y objeto</h2>
      <p><strong>Parte proponente:</strong> nosotros, Red Café Ecuador.</p>
      <p><strong>Parte invitada:</strong> usted, persona natural, empresa, institución, productor referente, comprador, exportador, marca, profesional o inversionista que recibió acceso privado a este documento.</p>
      <p><strong>Objeto:</strong> dejar una base inicial para evaluar una colaboración —inversión, patrocinio, servicio oficial, solución tecnológica, alianza comercial, piloto territorial, convenio institucional o participación fundacional—, siempre según el aporte real y un acuerdo escrito.</p>
    </section>

    <section id="clausulas" class="redcafe-socios-cardbox redcafe-socios-section">
      <h2>Cláusulas preliminares</h2>
      <h3>Naturaleza preliminar</h3>
      <p>Este documento tiene naturaleza preliminar, exploratoria y privada. No constituye contrato definitivo, oferta pública, captación, promesa irrevocable, garantía de retorno ni compromiso automático de participación societaria. Cualquier obligación económica, comercial, operativa, societaria o de representación se documentará por escrito con alcance, responsables, plazos y condiciones.</p>
      <h3>Confidencialidad, reserva y derecho de idea</h3>
      <p>La recepción, lectura, revisión o discusión de este preacuerdo se realiza bajo confidencialidad. Usted recibe información sobre enfoque, estructura, textos, modelo, relaciones, capacidades y estrategia de Red Café Ecuador para evaluar una colaboración, no para copiarla, reproducirla, transferirla, explotarla o presentarla como propia. Nosotros protegemos la marca, la arquitectura del proyecto, los contenidos, el software, los datos operativos y las relaciones originadas por la plataforma.</p>
      <h3>Piloto de 90 días</h3>
      <p>Las partes podrán iniciar un piloto de 90 días con objetivos concretos: validar demanda, probar integración de servicios, activar una categoría, ordenar una comunidad territorial, incorporar compradores, documentar trazabilidad, medir respuesta comercial o estructurar una oferta de valor conjunta. El piloto incluirá responsables, indicadores, calendario, criterios de continuidad y reglas de uso de datos.</p>
      <h3 id="intercambio">Aportes de usted y su control</h3>
      <p>Los aportes pueden incluir capital, tiempo ejecutivo, tecnología o datos, servicios profesionales, red de compradores, acceso institucional, logística, validación técnica, reputación sectorial, formación, catación, certificación, financiamiento o acompañamiento territorial; lo que se pide a cada tipo de socio está en «Qué le pedimos y qué le ofrecemos». Cada aporte tendrá su mecanismo de control: presupuesto aprobado, hitos y reportes para el capital; estándares de atención, precio, cobertura y calidad para los servicios; registro del origen del contacto y consentimiento para los contactos comerciales; objetivos de programa, roles públicos y reporte de resultados para el respaldo institucional; y, para la tecnología o los datos, que pueden retribuirse con integración comercial, licenciamiento o co-creación con casos reales, un acuerdo de propiedad, acceso, soporte y uso permitido.</p>
      <h3>Obligaciones de Red Café Ecuador</h3>
      <p>Nosotros nos comprometemos a presentar el estado real de la plataforma, coordinar la evaluación, proteger la información recibida, documentar acuerdos, habilitar espacios de visibilidad cuando corresponda, administrar los canales digitales bajo criterios de calidad y mantener una comunicación clara con usted durante la revisión.</p>
      <h3>Integración de servicios oficiales del socio</h3>
      <p>Cuando exista encaje, los servicios de usted o de su organización podrán integrarse como servicios oficiales, servicios aliados o servicios publicados en marketplace. La integración requerirá alcance, precio, cobertura, tiempos de respuesta, responsable, condiciones de atención, reglas de reputación y criterios de verificación.</p>
      <h3>Uso de marca, nombre e imagen</h3>
      <p>Ninguna de las partes usará públicamente marca, nombre comercial, logotipo, fotografía, testimonio, caso, contacto o imagen de la otra sin autorización previa. Las menciones públicas se aprobarán con texto, contexto, duración y canal definidos.</p>
      <h3>Datos, contactos e información</h3>
      <p>Los datos, contactos, bases de clientes, oportunidades comerciales y documentos técnicos compartidos por usted se usarán solo para los fines aprobados. No venderemos datos de la evaluación ni los usaremos para fines ajenos a esta revisión privada. Cuando haya datos personales, se aplicarán criterios de consentimiento, finalidad, proporcionalidad y resguardo.</p>
      <h3>No exclusividad</h3>
      <p>Salvo acuerdo escrito distinto, esta revisión no impide que usted ni Red Café Ecuador trabajen con otras personas u organizaciones del sector.</p>
      <h3>Propiedad intelectual</h3>
      <p>La plataforma, marca, código, contenidos, diseño, bases documentales, piezas comerciales, metodología, estructura de datos, interfaces y concepto operativo de Red Café Ecuador pertenecen a sus titulares. Los aportes de usted conservarán su titularidad, salvo pacto expreso de cesión, licencia o trabajo conjunto.</p>
      <h3>Revisión, ajustes y continuidad</h3>
      <p>Al finalizar la evaluación o el piloto, las partes revisarán resultados, riesgos, aportes y próximos pasos. La continuidad puede incluir contrato comercial, patrocinio, inversión, alianza, integración de servicios, mejora tecnológica o cierre sin obligación adicional.</p>
      <h3>Contrapropuesta</h3>
      <p>Usted puede responder en el formulario final con una contrapropuesta que ajuste aporte, alcance, categoría, derechos, tiempos, condiciones, límites, retorno esperado, mecanismo de medición o forma de participación.</p>
    </section>

    <section id="formas-asociacion" class="redcafe-socios-cardbox redcafe-socios-section">
      <h2>Formas posibles de asociación, inversión y márgenes</h2>
      <p>Toda cifra, margen, comisión o porcentaje de esta sección es una propuesta que se valida con debida diligencia y contrato escrito. No emite valores ni capta dinero del público.</p>

      <h3>Modalidades de vinculación</h3>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Modalidad</th><th>Aporte principal</th><th>Participación o retorno posible</th><th>Condición de control</th></tr></thead>
          <tbody>
            <tr><td>Aliado comercial o socio de canal</td><td>Referidos, compradores, cartera, difusión, presencia territorial o activación de oportunidades.</td><td>0 % societario. Comisión, tarifa de gestión o participación por operación previamente aprobada.</td><td>Registro del origen del contacto, consentimiento de las partes y acuerdo antes de gestionar la oportunidad.</td></tr>
            <tr><td>Partner operativo</td><td>Servicio técnico, equipo de campo, ejecución comercial, soporte, calidad, logística o gestión de categoría.</td><td>Margen por servicio, bolsa de horas, revenue share por unidad o piloto territorial.</td><td>Entregables, SLA, precio al usuario, responsable visible y revisión de calidad.</td></tr>
            <tr><td>Founder operativo</td><td>Dedicación ejecutiva, capital inicial, construcción comercial, liderazgo de unidad crítica o relaciones estratégicas.</td><td>Participación propuesta de 2 % a 8 %, sujeta a hitos, permanencia, vesting, riesgo asumido y contrato societario.</td><td>Hitos medibles, cláusula de salida, propiedad intelectual clara y reversión si no se cumplen aportes.</td></tr>
            <tr><td>Inversionista</td><td>Capital por etapas, criterio financiero, red empresarial, seguimiento e impulso comercial.</td><td>Participación propuesta de 5 % a 15 %, préstamo convertible o instrumento privado equivalente, según valoración y riesgo.</td><td>Debida diligencia, uso de fondos aprobado, reportes, protección de datos y documentación legal.</td></tr>
            <tr><td>Patrocinador o institución aliada</td><td>Financiamiento de programas, formación, verificaciones, campañas, territorio o impacto sectorial.</td><td>0 % societario. Visibilidad, reportes, derechos de programa, categoría patrocinada o entregables institucionales.</td><td>Separación entre patrocinio, recomendación técnica y datos de usuarios.</td></tr>
            <tr><td>Proveedor oficial de servicios</td><td>Servicios profesionales, laboratorio, catación, EUDR, asesoría, tecnología, logística o formación.</td><td>0 % societario. Reparto por servicio, membresía premium, comisión o margen acordado por caso.</td><td>Ficha publicada, precio claro, responsable técnico, tiempos de respuesta y reclamos auditables.</td></tr>
<tr><td>Aliado promotor de red</td><td>Red de contactos del sector, promoción activa, vinculación de miembros, eventos, formación y reputación en su territorio o especialidad.</td><td>Participación propuesta de hasta 25 %, ligada a crecimiento medible y consolidada por tramos según la red realmente activada.</td><td>Hitos de miembros activos y operaciones originadas por su red, vesting, registro del origen de cada contacto, cláusula de salida y reversión si los hitos no se cumplen.</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Rangos privados de inversión por etapa</h3>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Etapa</th><th>Rango estimado</th><th>Uso esperado</th><th>Decisión posterior</th></tr></thead>
          <tbody>
            <tr><td>Piloto estratégico de 90 días</td><td>2.500 a 7.500 USD</td><td>Contenido, activación comercial, soporte, validación de servicios, verificaciones iniciales y seguimiento.</td><td>Continuar, ajustar categoría, convertir en contrato comercial o cerrar el piloto sin obligación adicional.</td></tr>
            <tr><td>Partner o founder operativo</td><td>10.000 a 25.000 USD y/o dedicación ejecutiva equivalente</td><td>Construcción de una unidad comercial, ventas, formación, soporte operativo y validación territorial.</td><td>Participación por hitos, revenue share, contrato de dedicación o unidad de negocio.</td></tr>
            <tr><td>Tramo de expansión</td><td>25.000 a 75.000 USD</td><td>Tecnología, seguridad, equipo de soporte, ventas, aliados oficiales, campo, trazabilidad y marketing medible.</td><td>Negociación de participación, préstamo convertible, patrocinio estratégico o inversión por etapas.</td></tr>
            <tr><td>Ronda posterior con métricas</td><td>75.000 USD en adelante</td><td>Escalamiento nacional, institucional, comercial o tecnológico, solo si ya existen indicadores suficientes.</td><td>Valoración formal, debida diligencia, gobierno, derechos económicos y plan de crecimiento aprobado.</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Márgenes propuestos por línea</h3>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Línea privada</th><th>Margen o reparto propuesto</th><th>Condición de aplicación</th></tr></thead>
          <tbody>
            <tr><td>Servicios oficiales y asesorías</td><td>Margen bruto objetivo de 25 % a 45 % para la plataforma o unidad gestora.</td><td>Depende de si Red Café Ecuador vende, coordina, factura, acompaña o solo deriva.</td></tr>
            <tr><td>Servicios prestados por terceros aliados</td><td>70 % a 85 % para el prestador y 15 % a 30 % para plataforma, soporte, marketing o coordinación.</td><td>El reparto cambia si el tercero aporta el cliente, si la Red aporta la demanda o si existe soporte posventa.</td></tr>
            <tr><td>Verificaciones, expedientes y trazabilidad</td><td>35 % a 55 % para administración/plataforma y 45 % a 65 % para responsable técnico o campo.</td><td>Debe cubrir revisión documental, control de calidad, soporte, archivo y responsabilidad del alcance.</td></tr>
            <tr><td>Academia, cursos y talleres</td><td>60 % a 75 % para instructor/autor y 25 % a 40 % para plataforma, producción, venta y soporte.</td><td>Programas institucionales, cohortes o cursos patrocinados se cotizan por proyecto.</td></tr>
            <tr><td>Marketplace y oportunidades de café</td><td>0 % de comisión base en contacto directo; 1 % a 3 % si hay comisión de éxito pactada; 3 % a 6 % si existe acompañamiento comercial premium.</td><td>La comisión debe estar acordada antes de intervenir en negociación, documentación o cierre.</td></tr>
            <tr><td>Campañas, patrocinios y categorías</td><td>Margen neto objetivo de 20 % a 35 % después de producción, pauta, operación y entregables.</td><td>Se separa patrocinio de recomendación técnica para proteger confianza de usuarios.</td></tr>
            <tr><td>Tecnología, paneles, datos o licencias</td><td>Margen bruto objetivo de 50 % a 70 % cuando el componente sea principalmente software y soporte remoto.</td><td>Implementaciones con campo, hardware o terceros reducen el margen y deben cotizarse aparte.</td></tr>
            <tr><td>Acompañamiento exportador o comercial</td><td>Honorario fijo por expediente/operación o éxito de 2 % a 5 %, sujeto a acuerdo previo.</td><td>No aplica si las partes negocian directamente sin intervención comercial documentada de la Red.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="valoracion" class="redcafe-socios-cardbox redcafe-socios-section">
      <h2>Valoración y participación</h2>
      <p>No presentamos una valoración cerrada sin debida diligencia. Cualquier participación, derecho económico, comisión, retorno o asiento de decisión se negociará con estos criterios:</p>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Criterio de evaluación</th><th>Peso propuesto</th><th>Qué se revisa</th><th>Impacto en participación</th></tr></thead>
          <tbody>
            <tr><td>Aporte verificable</td><td>30 %</td><td>Capital, clientes, tecnología, equipo, campo, reputación, contenido, metodología o servicios con evidencia.</td><td>Sin evidencia no se reconoce participación permanente; puede operar como piloto o comisión.</td></tr>
            <tr><td>Dedicación y riesgo asumido</td><td>25 %</td><td>Tiempo ejecutivo, exclusividad parcial, responsabilidad operativa, inversión no recuperable y permanencia.</td><td>Puede justificar vesting, unidad de negocio o mayor derecho económico por hitos.</td></tr>
            <tr><td>Impacto comercial medible</td><td>25 %</td><td>Ventas, usuarios, servicios contratados, compradores, campañas, alianzas, margen y recurrencia.</td><td>La participación se consolida cuando el impacto se documenta, no por expectativa.</td></tr>
            <tr><td>Compatibilidad</td><td>20 %</td><td>Confianza, datos, marca, reputación y buen encaje con productores, compradores y objetivos de largo plazo.</td><td>Puede limitar derechos si existe conflicto de interés, riesgo reputacional o dependencia excesiva.</td></tr>
          </tbody>
        </table>
      </div>
      <p>Como regla de protección, ninguna participación societaria nace por una reunión, por acceder a este documento ni por enviar una contrapropuesta. Debe existir acuerdo firmado, hitos, alcance, derechos, responsabilidades, confidencialidad, tratamiento de datos, salida y manejo de propiedad intelectual.</p>
    </section>

    <section id="modelo" class="redcafe-socios-cardbox redcafe-socios-section">
      <h2>Modelo de negocio e ingresos</h2>
      <p>El modelo combina acceso abierto con servicios pagados, verificación, formación, oportunidades comerciales, trazabilidad y presencia de aliados, para no depender de una sola línea de ingresos. Prioridad actual, en este orden: servicios oficiales, asesoría y verificaciones; marketplace y oportunidades comerciales; trazabilidad, datos e IA; academia, formación y contenido; patrocinios y campañas cooperadas.</p>
      <h3 id="ingresos">Ingresos posibles por línea</h3>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Línea</th><th>Mecanismo</th><th>Quién paga</th><th>Condición de calidad</th></tr></thead>
          <tbody>
            <tr><td>Afiliaciones premium</td><td>Perfil con mayor visibilidad, herramientas y soporte.</td><td>Productores, proveedores, profesionales o empresas.</td><td>Beneficios claros, transparencia de precio y baja fricción de uso.</td></tr>
            <tr><td>Productores y compradores verificados</td><td>Revisión de identidad, actividad, publicaciones o capacidad comercial.</td><td>Actor que solicita verificación o tercero patrocinador.</td><td>Criterios públicos y trazabilidad de la revisión.</td></tr>
            <tr><td>Trazabilidad</td><td>Expedientes, documentación, soporte EUDR y rutas de cumplimiento.</td><td>Productores, organizaciones, compradores o exportadores.</td><td>Documentación consistente y alcance de responsabilidad definido.</td></tr>
            <tr><td>Catación y calidad</td><td>Servicios de evaluación, ficha, laboratorio aliado o mejora de lote.</td><td>Productor, comprador, marca o programa.</td><td>Metodología y responsable técnico identificados.</td></tr>
            <tr><td>Exportación</td><td>Acompañamiento comercial, documentación, contactos y preparación de oferta.</td><td>Productor, exportador, comprador o alianza.</td><td>Alcance comercial realista y reglas de comisión aprobadas.</td></tr>
            <tr><td>Asesorías técnicas</td><td>Servicios puntuales para finca, proceso, comercialización o gestión.</td><td>Cliente que contrata o programa que financia.</td><td>Ficha de servicio, entregable y responsable.</td></tr>
            <tr><td>Consultorías</td><td>Diagnóstico, estrategia, implementación o acompañamiento institucional.</td><td>Empresa, institución, proyecto o cooperante.</td><td>Contrato, entregables y cronograma.</td></tr>
            <tr><td>Implementaciones tecnológicas</td><td>Configuración de herramientas, sistemas, trazabilidad, IA o paneles.</td><td>Organización, comprador, exportador o institución.</td><td>Soporte, capacitación y resguardo de datos.</td></tr>
            <tr><td>Academia y cursos</td><td>Cursos, talleres, rutas formativas y contenido especializado.</td><td>Estudiantes, empresas, instituciones o patrocinadores.</td><td>Contenido útil, instructor claro y evaluación de aprendizaje.</td></tr>
            <tr><td>Publicidad o patrocinios de categoría</td><td>Presencia de marca en secciones, campañas o contenidos.</td><td>Marca o institución patrocinadora.</td><td>Separación entre pauta, contenido y recomendación técnica.</td></tr>
            <tr><td>Comisiones por oportunidades comerciales</td><td>Compensación por conexión, gestión, cierre o acompañamiento.</td><td>Parte beneficiada, según acuerdo.</td><td>Comisión pactada antes de la gestión y registrada por escrito.</td></tr>
            <tr><td>Campañas cooperadas de marketing</td><td>Activaciones entre Red Café Ecuador, aliado y actores de la cadena.</td><td>Marcas, instituciones o grupos participantes.</td><td>Objetivo, audiencia, piezas y medición acordadas.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="proyeccion" class="redcafe-socios-cardbox redcafe-socios-section">
      <p class="redcafe-socios-eyebrow">Referencial</p>
      <h2>Proyección financiera estimada</h2>
      <p>Escenarios de trabajo para dimensionar la oportunidad, los costos y las condiciones de un eventual acuerdo. No son datos históricos ni garantía de resultados.</p>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Escenario</th><th>Supuestos principales</th><th>Ingresos anuales estimados</th><th>Egresos anuales estimados</th><th>Resultado operativo estimado</th></tr></thead>
          <tbody>
            <tr><td>Conservador</td><td>Venta gradual de servicios, baja pauta, pocas campañas cooperadas, equipo liviano y soporte acotado.</td><td>18.000 USD</td><td>15.600 USD</td><td>2.400 USD</td></tr>
            <tr><td>Base</td><td>Servicios recurrentes, cursos selectivos, verificaciones, campañas moderadas y activación comercial constante.</td><td>42.000 USD</td><td>29.400 USD</td><td>12.600 USD</td></tr>
            <tr><td>Expansión</td><td>Más categorías activas, servicios oficiales integrados, compradores aliados, campañas y tecnología de soporte.</td><td>96.000 USD</td><td>61.200 USD</td><td>34.800 USD</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="flujo" class="redcafe-socios-cardbox redcafe-socios-section">
      <p class="redcafe-socios-eyebrow">Referencial</p>
      <h2>Flujo de caja inicial estimado</h2>
      <p>Etapa inicial con activación de servicios, ventas y soporte, para dimensionar necesidades de caja y ver cuándo una alianza podría sostener la operación mensual.</p>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Mes</th><th>Supuesto principal</th><th>Ingresos supuestos</th><th>Egresos supuestos</th><th>Flujo neto supuesto</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>Preparación comercial, contenidos, servicios base y primeras reuniones.</td><td>1.200 USD</td><td>2.500 USD</td><td>-1.300 USD</td></tr>
            <tr><td>2</td><td>Primeras ventas de servicios, ajustes operativos y activación de aliados.</td><td>1.800 USD</td><td>2.700 USD</td><td>-900 USD</td></tr>
            <tr><td>3</td><td>Servicios contratados, verificación inicial y cursos selectivos.</td><td>2.800 USD</td><td>3.000 USD</td><td>-200 USD</td></tr>
            <tr><td>4</td><td>Mejor ritmo comercial, campañas pequeñas y servicios oficiales.</td><td>3.800 USD</td><td>3.100 USD</td><td>700 USD</td></tr>
            <tr><td>5</td><td>Más recurrencia en servicios, contenidos y oportunidades comerciales.</td><td>4.600 USD</td><td>3.300 USD</td><td>1.300 USD</td></tr>
            <tr><td>6</td><td>Base comercial más estable y control de costos.</td><td>5.400 USD</td><td>3.500 USD</td><td>1.900 USD</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="equilibrio" class="redcafe-socios-cardbox redcafe-socios-section">
      <p class="redcafe-socios-eyebrow">Referencial</p>
      <h2>Punto de equilibrio estimado</h2>
      <p>Se calcula como mecanismo, no como dato confirmado: costos fijos mensuales divididos para el margen bruto. Usa supuestos propios, que no coinciden con los del flujo inicial ni con los de los escenarios anuales; si cambian costos, precios, comisiones, volumen o margen, cambia el resultado.</p>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Cálculo</th><th>Supuestos principales</th><th>Resultado</th></tr></thead>
          <tbody>
            <tr><td>Equilibrio operativo mensual</td><td>Costos fijos supuestos: 3.200 USD. Margen bruto supuesto: 55 %. Fórmula: 3.200 / 0,55.</td><td>5.820 USD de ingresos mensuales aproximados</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="fondos" class="redcafe-socios-cardbox redcafe-socios-section">
      <h2>Uso propuesto de fondos</h2>
      <p>Distribución prudente de los recursos iniciales si la revisión deriva en inversión, patrocinio o aporte operativo. Se define por etapa y por acuerdo.</p>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Área</th><th>Porcentaje propuesto</th><th>Uso previsto</th></tr></thead>
          <tbody>
            <tr><td>Producto y tecnología</td><td>30 %</td><td>Mejoras de plataforma, paneles, trazabilidad, automatización, seguridad y experiencia móvil.</td></tr>
            <tr><td>Ventas y alianzas</td><td>22 %</td><td>Prospección, activación de aliados, compradores, servicios oficiales y campañas cooperadas.</td></tr>
            <tr><td>Contenido, academia y calidad</td><td>18 %</td><td>Cursos, guías, fichas, material técnico, catación y formación comercial.</td></tr>
            <tr><td>Soporte operativo y verificaciones</td><td>15 %</td><td>Atención, revisión de publicaciones, validación documental y coordinación con usuarios.</td></tr>
            <tr><td>Legal, datos y administración</td><td>10 %</td><td>Contratos, políticas, protección de datos, documentación y control financiero.</td></tr>
            <tr><td>Reserva de contingencia</td><td>5 %</td><td>Imprevistos operativos, ajustes de campaña o necesidades técnicas menores.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="objeciones" class="redcafe-socios-cardbox redcafe-socios-section">
      <h2>Respuesta a objeciones que plantearía un inversionista</h2>
      <div class="redcafe-socios-tablewrap">
        <table class="redcafe-socios-table">
          <thead><tr><th>Objeción</th><th>Respuesta de Red Café Ecuador</th><th>Cómo se valida</th></tr></thead>
          <tbody>
            <tr><td>¿Cómo se prueba adopción?</td><td>Con pilotos por categoría, servicios útiles desde el primer contacto y medición de acciones concretas.</td><td>Registros de uso, ventas, solicitudes, publicaciones, reuniones, conversiones y satisfacción.</td></tr>
            <tr><td>¿Qué impide que otros copien la idea?</td><td>La idea aislada no basta: importan ejecución, confianza, contenido, relaciones, datos, software, reputación, servicios y continuidad.</td><td>Velocidad de implementación, alianzas firmadas, calidad de servicio y propiedad intelectual documentada.</td></tr>
            <tr><td>¿Dónde está la monetización?</td><td>En las líneas de «Ingresos posibles»: servicios, verificaciones, academia, trazabilidad, campañas, tecnología, asesorías, consultorías y oportunidades comerciales.</td><td>Pruebas de precio, contratos, tickets, recurrencia y margen por línea.</td></tr>
            <tr><td>¿Cómo se controla la calidad?</td><td>Con fichas claras, revisión administrativa, verificación progresiva, criterios de publicación y trazabilidad de cambios.</td><td>Auditoría interna, reclamos, tiempos de respuesta, calidad de datos y retiro de sellos cuando aplique.</td></tr>
            <tr><td>¿Compite con asociaciones o gremios?</td><td>No. Las complementa con herramientas digitales, marketplace, servicios, formación, trazabilidad y medición.</td><td>Convenios, programas conjuntos y uso por actores ya organizados.</td></tr>
            <tr><td>¿Cuál es el riesgo principal?</td><td>Ejecutar demasiadas líneas a la vez. Por eso proponemos pilotos enfocados, responsables claros y revisión por etapas.</td><td>Plan de 90 días, tablero de indicadores y decisión de continuidad por evidencia.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
<style>
#que-pedimos .rc-socios-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,17.5rem),1fr));gap:1rem;margin-top:1.25rem}
#que-pedimos .rc-socio{background:#fffdf9;border:1px solid rgba(59,26,12,.14);border-radius:.5rem;display:grid;gap:.6rem;padding:1.1rem 1.15rem;align-content:start}
#que-pedimos .rc-socio h3{color:#3b1a0c;font-family:var(--font-marca,"DM Serif Display",Georgia,serif);font-size:1.2rem;font-weight:400;line-height:1.2;margin:0}
#que-pedimos .rc-socio dl{display:grid;gap:.55rem;margin:0}
#que-pedimos .rc-socio dt{color:#b86e2a;font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
#que-pedimos .rc-socio dd{color:#2b2622;font-size:.92rem;line-height:1.5;margin:.15rem 0 0}
#que-pedimos #socio-promotor{border-color:#d4893f;box-shadow:inset 0 0 0 1px #d4893f}
.rc-eleccion{border:0;margin:0 0 1rem;padding:0}
.rc-eleccion legend{color:#3b1a0c;font-weight:700;margin-bottom:.35rem;padding:0}
.rc-eleccion .rc-eleccion-ayuda{color:#5c5a50;font-size:.88rem;margin:0 0 .75rem}
.rc-eleccion-lista{display:grid;gap:.5rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))}
.rc-opcion{align-items:flex-start;background:#fffdf9;border:1px solid rgba(59,26,12,.18);border-radius:.45rem;cursor:pointer;display:flex;gap:.6rem;min-height:44px;padding:.65rem .75rem}
.rc-opcion input{accent-color:#b86e2a;flex:0 0 auto;height:1.1rem;margin:.15rem 0 0;width:1.1rem}
.rc-opcion span{display:grid;gap:.1rem}
.rc-opcion b{color:#2b2622;font-size:.93rem}
.rc-opcion small{color:#5c5a50;font-size:.8rem;line-height:1.35}
.rc-opcion:has(input:checked){background:#f3e3cf;border-color:#b86e2a}
.rc-opcion:focus-within{outline:2px solid #d4893f;outline-offset:2px}
</style>
<section id="retroalimentacion" class="redcafe-socios-cardbox redcafe-socios-section">
      <h2>Retroalimentación y contrapropuesta</h2>
      <p id="socios-feedback-help">Si usted accedió desde la invitación privada, registraremos su respuesta con el identificador guardado en esta sesión. Si no aparece ese identificador, ingrese el correo con el que accedió y vuelva a entrar desde la invitación para vincular correctamente la respuesta.</p>
      <form id="socios-feedback-form" class="redcafe-socios-form">
        <label class="redcafe-socios-label">Correo con el que accedió
          <input name="email" type="email" autocomplete="email" maxlength="160" required>
        </label>
        <fieldset class="rc-eleccion" id="socios-participacion"><legend>¿Cómo le gustaría participar?</legend><p class="rc-eleccion-ayuda">Puede marcar más de una. Por ejemplo, profesional aliado y promotor de red a la vez.</p><div class="rc-eleccion-lista"><label class="rc-opcion"><input type="checkbox" name="participacion" value="Partner estratégico" id="participacion-0"><span><b>Partner estratégico</b><small>Alianza, canal o servicio oficial</small></span></label><label class="rc-opcion"><input type="checkbox" name="participacion" value="Founder operativo" id="participacion-1"><span><b>Founder operativo</b><small>Dedicación ejecutiva y hitos</small></span></label><label class="rc-opcion"><input type="checkbox" name="participacion" value="Inversionista" id="participacion-2"><span><b>Inversionista</b><small>Capital por etapas</small></span></label><label class="rc-opcion"><input type="checkbox" name="participacion" value="Profesional aliado" id="participacion-3"><span><b>Profesional aliado</b><small>Servicios técnicos publicados</small></span></label><label class="rc-opcion"><input type="checkbox" name="participacion" value="Institución aliada" id="participacion-4"><span><b>Institución aliada</b><small>Programas y convenios</small></span></label><label class="rc-opcion"><input type="checkbox" name="participacion" value="Productor líder" id="participacion-5"><span><b>Productor líder</b><small>Oferta de café y vocería</small></span></label><label class="rc-opcion"><input type="checkbox" name="participacion" value="Comprador/exportador" id="participacion-6"><span><b>Comprador/exportador</b><small>Abastecimiento y compras piloto</small></span></label><label class="rc-opcion"><input type="checkbox" name="participacion" value="Aliado promotor de red" id="participacion-7"><span><b>Aliado promotor de red</b><small>Red de contactos, hasta 25 %</small></span></label><label class="rc-opcion"><input type="checkbox" name="participacion" value="Aún no lo sé" id="participacion-8"><span><b>Aún no lo sé</b><small>Prefiero una reunión</small></span></label></div></fieldset>
<label class="redcafe-socios-label">Tipo de respuesta
          <select name="feedback_type" required>
            <option value="Acepto avanzar">Acepto avanzar</option>
            <option value="Quiero conversar">Quiero una reunión</option>
            <option value="Propongo ajustes">Propongo ajustes</option>
            <option value="Necesito más información">Necesito más información</option>
            <option value="No es de mi interés ahora">No es de mi interés ahora</option>
          </select>
        </label>
        <label class="redcafe-socios-label">Retroalimentación
          <textarea name="feedback" maxlength="2500" placeholder="Comparta observaciones, inquietudes o criterios de evaluación."></textarea>
        </label>
        <label class="redcafe-socios-label">Contrapropuesta
          <textarea name="counterproposal" maxlength="2500" placeholder="Proponga aporte, alcance, piloto, participación, tiempos o condiciones alternativas."></textarea>
        </label>
        <label class="redcafe-socios-label">Siguiente paso sugerido
          <input name="next_step" maxlength="200" placeholder="Ej.: reunión, revisión legal, piloto, mesa técnica.">
        </label>
        <button class="redcafe-socios-button" type="submit">Enviar retroalimentación</button>
        <p id="socios-feedback-status" class="redcafe-socios-status" role="status" aria-live="polite"></p>
      </form>
    </section>
  </main>

  <footer class="bg-cafe text-crema">
    <div class="mx-auto max-w-6xl px-4 pb-8 pt-14">
      <div class="grid gap-10 md:grid-cols-4">
        <div>
          <p class="font-titulo text-lg font-bold leading-none">Red Café<span class="block text-[11px] font-semibold uppercase tracking-[0.18em] text-acento-claro">Ecuador</span></p>
          <p class="mt-4 text-sm leading-relaxed text-crema/70">Perfiles, lotes de café, servicios y herramientas para trabajar mejor dentro del café ecuatoriano.</p>
        </div>
        <div>
          <p class="font-semibold text-acento-claro">Explorar</p>
          <a class="mt-3 block text-sm text-crema/75 hover:text-acento-claro" href="/marketplace/">Marketplace</a>
          <a class="mt-2 block text-sm text-crema/75 hover:text-acento-claro" href="/academia/">Academia</a>
          <a class="mt-2 block text-sm text-crema/75 hover:text-acento-claro" href="/servicios/">Servicios</a>
          <a class="mt-2 block text-sm text-crema/75 hover:text-acento-claro" href="/comunidad/">Comunidad</a>
        </div>
        <div>
          <p class="font-semibold text-acento-claro">Herramientas</p>
          <a class="mt-3 block text-sm text-crema/75 hover:text-acento-claro" href="/servicios/precios/">Precios</a>
          <a class="mt-2 block text-sm text-crema/75 hover:text-acento-claro" href="/servicios/calculadora/">Calculadora</a>
          <a class="mt-2 block text-sm text-crema/75 hover:text-acento-claro" href="/servicios/eudr/">Trazabilidad / EUDR</a>
          <a class="mt-2 block text-sm text-crema/75 hover:text-acento-claro" href="/servicios/factura/">Facturación</a>
        </div>
        <div>
          <p class="font-semibold text-acento-claro">Documento</p>
          <a class="mt-3 block text-sm text-crema/75 hover:text-acento-claro" href="#indice">Índice del preacuerdo</a>
          <a class="mt-2 block text-sm text-crema/75 hover:text-acento-claro" href="#participacion">Participación</a>
          <a class="mt-2 block text-sm text-crema/75 hover:text-acento-claro" href="#retroalimentacion">Respuesta</a>
          <a class="mt-2 block text-sm text-crema/75 hover:text-acento-claro" href="mailto:info@redcafeecuador.com">info@redcafeecuador.com</a>
        </div>
      </div>
      <p class="mt-10 border-t border-crema/15 pt-6 text-xs text-crema/55">Red Café Ecuador - Documento privado para revisar una posible colaboración.</p>
    </div>
  </footer>

  <script>
  (function () {
    "use strict";
    var form = document.getElementById("socios-feedback-form");
    var status = document.getElementById("socios-feedback-status");
    var help = document.getElementById("socios-feedback-help");

    function getStored(name) {
      try {
        return sessionStorage.getItem(name) || "";
      } catch (e) {
        return "";
      }
    }

    function setStatus(text, className) {
      status.textContent = text;
      status.className = "redcafe-socios-status" + (className ? " " + className : "");
    }

    var savedEmail = getStored("redcafe-socio-email") || getStored("redcafe_socio_email");
    var savedId = getStored("redcafe-socio-id") || getStored("redcafe_socio_id");
    if (savedEmail) {
      form.elements.email.value = savedEmail;
    }
    if (!savedId) {
      form.elements.email.required = true;
      help.textContent = "No encontramos el identificador privado de la invitación en esta sesión. Ingrese el correo con el que accedió y entre nuevamente desde la invitación para que podamos vincular su respuesta al registro correcto.";
      setStatus("Para enviar la retroalimentación necesitamos que usted entre por la invitación privada.", "is-error");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var id = getStored("redcafe-socio-id") || getStored("redcafe_socio_id");
      if (!id) {
        form.elements.email.required = true;
        setStatus("Ingrese el correo con el que accedió y vuelva a entrar desde la invitación privada para vincular su respuesta.", "is-error");
        form.elements.email.focus();
        return;
      }

      /* El correo VIAJA SIEMPRE. Antes, cuando había id, el envío lo omitía y
         la API respondía 422 «Correo inválido»: el formulario final del
         preacuerdo era imposible de enviar para cualquier invitado. La API
         pide id y correo juntos a propósito, para que nadie pueda sobrescribir
         la contrapropuesta de otro acertando un id. */
      var correo = (form.elements.email && form.elements.email.value.trim()) ||
                   getStored("redcafe-socio-email") || "";
      if (!correo) {
        setStatus("Indique el correo con el que accedió a la invitación.", "is-error");
        if (form.elements.email) form.elements.email.focus();
        return;
      }

      var participacion = Array.prototype.slice.call(form.querySelectorAll('input[name="participacion"]:checked')).map(function (c) { return c.value; });
      if (!participacion.length) {
        setStatus("Marque al menos una forma de participación.", "is-error");
        var primera = form.querySelector('input[name="participacion"]');
        if (primera) primera.focus();
        return;
      }

      var data = {
        id: id,
        email: correo,
        participacion: participacion,
        feedback_type: form.elements.feedback_type.value,
        feedback: form.elements.feedback.value,
        counterproposal: form.elements.counterproposal.value,
        next_step: form.elements.next_step.value
      };
      var button = form.querySelector("button");
      button.disabled = true;
      setStatus("Enviando respuesta...", "");

      fetch("/api/socios.php?action=feedback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (response) {
        return response.json();
      }).then(function (result) {
        button.disabled = false;
        if (!result || !result.ok) {
          setStatus((result && result.error) || "No se pudo registrar la respuesta.", "is-error");
          return;
        }
        setStatus("Respuesta registrada. Gracias por revisar el preacuerdo.", "is-ok");
      }).catch(function () {
        button.disabled = false;
        setStatus("No se pudo conectar con la API. Intente nuevamente desde la invitación privada.", "is-error");
      });
    });
  })();
  </script>
  <script src="/redcafe-v60-final.js?v=20260924e" defer></script>
  <script src="/redcafe-v60-mejoras-obligatorias.js?v=20260924e" defer></script>
  <script src="/redcafe-mejoras-ui.js?v=20260924e" defer></script>
</body>
</html>
