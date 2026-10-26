<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';
require_once __DIR__ . '/_comunidad-avisos.php';

$action = $_GET['action'] ?? '';
// El cuerpo de la petición se lee siempre: antes solo se leía dentro del bloque
// 'publish', así que 'update' y 'toggle_oculto' veían $in indefinido y
// respondían "id requerido" — editar un lote propio nunca funcionaba.
$in = input();

// Sembrar catálogo inicial si no existe (los 6 lotes de ejemplo)
function seed_lotes(): array {
  return [
    ['id'=>'loja-gesha-01','finca'=>'Finca El Paraíso','productor'=>'Red Café Ecuador','productor_id'=>'admin','visibilidad'=>'publico','provincia'=>'Loja','variedad'=>'Geisha','proceso'=>'Lavado','altura'=>1850,'score'=>91,'precioQuintal'=>340,'precioSaco'=>235,'stockSacos'=>48,'stockQuintales'=>24,'certificacion'=>'Orgánico','emoji'=>'🫘','ventaMinima'=>'1 lb','verificado'=>true,'ejemplo'=>true,'demo'=>true,'oculto'=>false,'published_by'=>'admin','descripcion'=>'Geisha lavado de altura. Notas de jazmín y bergamota, acidez cítrica marcada.','created_at'=>now_iso()],
    ['id'=>'zamora-sidra-02','finca'=>'Finca La Esperanza','productor'=>'Red Café Ecuador','productor_id'=>'admin','visibilidad'=>'publico','provincia'=>'Zamora Chinchipe','variedad'=>'Sidra','proceso'=>'Honey','altura'=>1720,'score'=>88,'precioQuintal'=>315,'precioSaco'=>218,'stockSacos'=>60,'stockQuintales'=>30,'certificacion'=>'Comercio Justo','emoji'=>'☕','ventaMinima'=>'1 lb','verificado'=>true,'ejemplo'=>true,'demo'=>true,'oculto'=>false,'published_by'=>'admin','descripcion'=>'Sidra honey de la Amazonía sur. Dulzor alto, notas de panela y caramelo.','created_at'=>now_iso()],
    ['id'=>'manabi-typica-03','finca'=>'Hacienda Cacao y Café','productor'=>'Red Café Ecuador','productor_id'=>'admin','visibilidad'=>'publico','provincia'=>'Manabí','variedad'=>'Típica','proceso'=>'Natural','altura'=>420,'score'=>84,'precioQuintal'=>205,'precioSaco'=>142,'stockSacos'=>80,'stockQuintales'=>40,'certificacion'=>'Convencional','emoji'=>'🌱','ventaMinima'=>'5 lb','verificado'=>true,'ejemplo'=>true,'demo'=>true,'oculto'=>false,'published_by'=>'admin','descripcion'=>'Typica natural de la costa. Cuerpo medio, notas de chocolate y nuez.','created_at'=>now_iso()],
    ['id'=>'sucumbios-robusta-04','finca'=>'Finca El Triunfo','productor'=>'Red Café Ecuador','productor_id'=>'admin','visibilidad'=>'publico','provincia'=>'Sucumbíos','variedad'=>'Robusta','proceso'=>'Lavado','altura'=>320,'score'=>80,'precioQuintal'=>125,'precioSaco'=>86,'stockSacos'=>120,'stockQuintales'=>60,'certificacion'=>'Convencional','emoji'=>'🟤','ventaMinima'=>'10 lb','verificado'=>true,'ejemplo'=>true,'demo'=>true,'oculto'=>false,'published_by'=>'admin','descripcion'=>'Robusta lavado amazónico. Cuerpo alto, notas de cacao amargo y malta.','created_at'=>now_iso()],
    ['id'=>'pichincha-typica-05','finca'=>'Finca Río Verde','productor'=>'Red Café Ecuador','productor_id'=>'admin','visibilidad'=>'publico','provincia'=>'Pichincha','variedad'=>'Típica','proceso'=>'Lavado','altura'=>1500,'score'=>86,'precioQuintal'=>255,'precioSaco'=>176,'stockSacos'=>70,'stockQuintales'=>35,'certificacion'=>'Orgánico','emoji'=>'☕','ventaMinima'=>'1 lb','verificado'=>true,'ejemplo'=>true,'demo'=>true,'oculto'=>false,'published_by'=>'admin','descripcion'=>'Typica lavado de altura andina. Acidez de naranja y fondo de panela.','created_at'=>now_iso()],
    ['id'=>'orense-robusta-06','finca'=>'Finca Lago San Pablo','productor'=>'Red Café Ecuador','productor_id'=>'admin','visibilidad'=>'publico','provincia'=>'Orellana','variedad'=>'Robusta','proceso'=>'Lavado','altura'=>1650,'score'=>85,'precioQuintal'=>135,'precioSaco'=>93,'stockSacos'=>90,'stockQuintales'=>45,'certificacion'=>'Convencional','emoji'=>'🫘','ventaMinima'=>'5 lb','verificado'=>true,'ejemplo'=>true,'demo'=>true,'oculto'=>false,'published_by'=>'admin','descripcion'=>'Robusta de Orellana. Cuerpo denso, notas de cacao y almendra tostada.','created_at'=>now_iso()],
  ];
}

function lote_imagenes_validas($raw): array {
  if (!is_array($raw)) return [];
  $out = [];
  foreach ($raw as $url) {
    if (!is_string($url)) continue;
    $url = trim($url);
    if (!preg_match('#^/uploads/user-content/[A-Za-z0-9._-]+\.jpg$#', $url)) continue;
    if (!in_array($url, $out, true)) $out[] = $url;
    if (count($out) >= 6) break;
  }
  return $out;
}

// ── Ficha del lote para el comprador ──────────────────────────────────────
// Datos y respaldos que un comprador de café verde necesita para decidir sin
// tener el saco delante.
// 'semilla' y 'plantula' son material de siembra, no café para tomar: se
// publican igual porque en la Red se venden, y la ficha lo dice claro.
const ESTADOS_CAFE = ['semilla', 'plantula', 'cereza', 'bellota', 'pergamino', 'oro', 'tostado'];
const EMPAQUES_LOTE = ['yute 69 kg', 'yute 46 kg', 'grainpro', 'vacío', 'big bag', 'otro'];
const ENTREGAS_LOTE = ['en finca', 'en bodega', 'puesto en ciudad', 'FOB Guayaquil', 'a convenir'];
const DOC_TIPOS_LOTE = [
  'certificado-calidad', 'informe-catacion', 'certificado-organico',
  'analisis-laboratorio', 'trazabilidad-eudr', 'ficha-tecnica', 'otro',
];
const MAX_DOCS_LOTE = 8;

function lote_valor_de(string $v, array $permitidos, array $alias = []): string {
  $v = mb_strtolower(trim($v));
  $v = $alias[$v] ?? $v;
  return in_array($v, $permitidos, true) ? $v : '';
}

// Solo se aceptan rutas dentro de la carpeta de subidas del sitio: así un
// documento no puede apuntar a un dominio externo ni salir del directorio.
function lote_documentos_validos($docs): array {
  if (!is_array($docs)) return [];
  $out = [];
  foreach ($docs as $d) {
    if (!is_array($d)) continue;
    $url = trim((string)($d['url'] ?? ''));
    if ($url === '' || strpos($url, '/uploads/user-content/') !== 0) continue;
    if (strpos($url, '..') !== false) continue;
    if (!preg_match('#^/uploads/user-content/[A-Za-z0-9._-]+$#', $url)) continue;
    $tipo = (string)($d['tipo'] ?? 'otro');
    if (!in_array($tipo, DOC_TIPOS_LOTE, true)) $tipo = 'otro';
    $titulo = trim((string)($d['titulo'] ?? ''));
    if (mb_strlen($titulo) > 120) $titulo = mb_substr($titulo, 0, 120);
    $out[] = [
      'tipo'      => $tipo,
      'titulo'    => $titulo !== '' ? $titulo : 'Documento del lote',
      'url'       => $url,
      'formato'   => substr($url, -4) === '.pdf' ? 'pdf' : 'imagen',
      'subido_at' => (string)($d['subido_at'] ?? now_iso()),
    ];
    if (count($out) >= MAX_DOCS_LOTE) break;
  }
  return $out;
}

function lote_aplicar_ficha(array $l, array $in): array {
  if (array_key_exists('estado', $in)) {
    $v = lote_valor_de((string)$in['estado'], ESTADOS_CAFE, [
      'pilado' => 'oro', 'trillado' => 'oro', 'verde' => 'oro',
      'cáscara' => 'bellota', 'cascara' => 'bellota', 'bola' => 'bellota',
      'pergamino seco' => 'pergamino', 'café en cereza' => 'cereza',
      'plántula' => 'plantula', 'plantulas' => 'plantula', 'plántulas' => 'plantula',
      'planta' => 'plantula', 'plantas' => 'plantula', 'vivero' => 'plantula',
      'semillas' => 'semilla',
    ]);
    if ($v !== '') $l['estado'] = $v;
  }
  if (array_key_exists('empaque', $in)) {
    $v = lote_valor_de((string)$in['empaque'], EMPAQUES_LOTE);
    if ($v !== '') $l['empaque'] = $v;
  }
  if (array_key_exists('entrega', $in)) {
    $v = lote_valor_de((string)$in['entrega'], ENTREGAS_LOTE);
    if ($v !== '') $l['entrega'] = $v;
  }
  // Rangos reales del comercio de café verde.
  $numericos = [
    'humedad'     => [5, 20,  1],   // el café comercial se seca entre 10 % y 12 %
    'zaranda'     => [12, 20, 0],   // granulometría por malla
    'defectos'    => [0, 200, 0],   // por muestra de 300 g
    'rendimiento' => [1, 100, 1],   // trilla de pergamino a oro
    'cantidadKg'  => [0, 500000, 2],
  ];
  foreach ($numericos as $campo => $rango) {
    if (array_key_exists($campo, $in) && is_numeric($in[$campo])) {
      $v = round(floatval($in[$campo]), $rango[2]);
      if ($v >= $rango[0] && $v <= $rango[1]) $l[$campo] = $rango[2] === 0 ? (int)$v : $v;
    }
  }
  foreach (['cosecha' => 80, 'canton' => 80, 'notasTaza' => 300, 'observaciones' => 500] as $campo => $max) {
    if (array_key_exists($campo, $in)) {
      $v = trim((string)$in[$campo]);
      if (mb_strlen($v) <= $max) $l[$campo] = $v;
    }
  }
  if (array_key_exists('muestraDisponible', $in)) {
    $l['muestraDisponible'] = filter_var($in['muestraDisponible'], FILTER_VALIDATE_BOOLEAN);
  }
  if (array_key_exists('documentos', $in)) {
    $l['documentos'] = lote_documentos_validos($in['documentos']);
  }
  return $l;
}

// ── Café en producto terminado ────────────────────────────────────────────
// Además del café verde por sacos, la Red publica café ya tostado y empacado:
// el que vende una marca, un tostador o una cafetería. Comparte tarjeta y
// mapa con el lote verde, pero se mide en unidades, no en quintales, y lo que
// el comprador necesita saber es otro: tueste, molienda, fecha de tostado y
// registro sanitario.
const CATEGORIAS_LOTE = ['verde', 'terminado'];
const TUESTES_LOTE = ['claro', 'medio', 'medio-oscuro', 'oscuro'];
const MOLIENDAS_LOTE = ['grano entero', 'gruesa', 'media', 'fina', 'espresso'];
const EMPAQUES_TERMINADO = ['bolsa con válvula', 'bolsa kraft', 'lata', 'vacío', 'otro'];

function lote_categoria(array $in, string $actual = 'verde'): string {
  $c = mb_strtolower(trim((string)($in['categoria'] ?? $actual)));
  $alias = ['tostado' => 'terminado', 'producto terminado' => 'terminado', 'empacado' => 'terminado'];
  $c = $alias[$c] ?? $c;
  return in_array($c, CATEGORIAS_LOTE, true) ? $c : 'verde';
}

function lote_aplicar_terminado(array $l, array $in): array {
  foreach ([
    'tueste'           => TUESTES_LOTE,
    'molienda'         => MOLIENDAS_LOTE,
    'empaqueTerminado' => EMPAQUES_TERMINADO,
  ] as $campo => $permitidos) {
    if (!array_key_exists($campo, $in)) continue;
    $v = lote_valor_de((string)$in[$campo], $permitidos, [
      'entero' => 'grano entero', 'en grano' => 'grano entero',
      'medio oscuro' => 'medio-oscuro', 'oscuro medio' => 'medio-oscuro',
      'valvula' => 'bolsa con válvula', 'bolsa con valvula' => 'bolsa con válvula',
    ]);
    if ($v !== '') $l[$campo] = $v;
  }
  // Presentación en gramos: de una muestra de 30 g a un saco de 5 kg.
  $numericos = [
    'pesoGramos'   => [30, 5000,  0],
    'unidades'     => [0, 100000, 0],
    'precioUnidad' => [0, 10000,  2],
  ];
  foreach ($numericos as $campo => $rango) {
    if (array_key_exists($campo, $in) && is_numeric($in[$campo])) {
      $v = round((float)$in[$campo], $rango[2]);
      if ($v >= $rango[0] && $v <= $rango[1]) $l[$campo] = $rango[2] === 0 ? (int)$v : $v;
    }
  }
  // Una fecha de tueste futura o de hace años delata un error de captura: el
  // café tostado se consume en meses, no en años.
  if (array_key_exists('fechaTueste', $in)) {
    $f = trim((string)$in['fechaTueste']);
    if ($f === '') {
      unset($l['fechaTueste']);
    } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $f)) {
      $t = strtotime($f);
      if ($t && $t <= time() + 86400 && $t >= time() - (3 * 365 * 86400)) $l['fechaTueste'] = $f;
    }
  }
  foreach (['marca' => 120, 'registroSanitario' => 60, 'perfilTaza' => 200] as $campo => $max) {
    if (array_key_exists($campo, $in)) {
      $v = trim((string)$in[$campo]);
      if (mb_strlen($v) <= $max) $l[$campo] = $v;
    }
  }
  if (array_key_exists('descafeinado', $in)) {
    $l['descafeinado'] = filter_var($in['descafeinado'], FILTER_VALIDATE_BOOLEAN);
  }
  return $l;
}

// ── Disponibilidad del lote ───────────────────────────────────────────────
// Un lote vendido seguía apareciendo como si estuviera a la venta: el
// comprador escribía y se llevaba el chasco, y el vendedor recibía consultas
// por café que ya no tenía.
const DISPONIBILIDADES_LOTE = ['disponible', 'reservado', 'agotado'];

/**
 * Estado real del lote.
 *
 * El orden importa y se aprendió con un fallo: si el valor guardado mandara
 * siempre, un lote publicado con cero sacos saldría "disponible" solo porque
 * el campo se rellenó al crearlo. Y si mandara siempre el stock, el dueño no
 * podría marcar como vendido un lote que aún figura con existencias.
 *
 *   1. Si el dueño dijo "agotado", está agotado. Su palabra vale.
 *   2. Sin existencias, agotado, diga lo que diga el campo.
 *   3. Si el dueño dijo "reservado" y hay existencias, reservado.
 *   4. En cualquier otro caso, disponible.
 */
/**
 * Material de siembra: semilla y plántula. Se vende por unidad —o por millar—,
 * no por saco ni por quintal, así que ni el precio por saco ni las existencias
 * en sacos tienen sentido para estos lotes.
 */
function lote_es_siembra(array $l): bool {
  $e = mb_strtolower(trim((string)($l['estado'] ?? '')));
  return $e === 'semilla' || $e === 'plantula';
}

function lote_disponibilidad(array $l): string {
  $dicho = mb_strtolower(trim((string)($l['disponibilidad'] ?? '')));
  if ($dicho === 'agotado') return 'agotado';

  $hay = ((string)($l['categoria'] ?? 'verde') === 'terminado' || lote_es_siembra($l))
    ? (float)($l['unidades'] ?? 0) > 0
    : ((float)($l['stockSacos'] ?? 0) + (float)($l['stockQuintales'] ?? 0)) > 0;
  if (!$hay) return 'agotado';

  return $dicho === 'reservado' ? 'reservado' : 'disponible';
}

/** Los lotes agotados van al final del catálogo, no desaparecen. */
function lote_orden_con_disponibilidad(array $a, array $b): int {
  $pa = lote_disponibilidad($a) === 'agotado' ? 1 : 0;
  $pb = lote_disponibilidad($b) === 'agotado' ? 1 : 0;
  if ($pa !== $pb) return $pa <=> $pb;
  return lote_orden_publicacion($a, $b);
}

function lote_coord_por_provincia(string $provincia): ?array {
  $p = mb_strtolower(trim($provincia));
  $coords = [
    'azuay' => [-2.9006, -79.0045],
    'bolívar' => [-1.5926, -79.0009],
    'bolivar' => [-1.5926, -79.0009],
    'cañar' => [-2.5606, -78.9394],
    'canar' => [-2.5606, -78.9394],
    'carchi' => [0.8119, -77.7173],
    'chimborazo' => [-1.6648, -78.6543],
    'cotopaxi' => [-0.9333, -78.6167],
    'el oro' => [-3.2581, -79.9554],
    'esmeraldas' => [0.9682, -79.6517],
    'galápagos' => [-0.9538, -90.9656],
    'galapagos' => [-0.9538, -90.9656],
    'guayas' => [-2.1700, -79.9224],
    'imbabura' => [0.3392, -78.1223],
    'loja' => [-3.9931, -79.2042],
    'los ríos' => [-1.8022, -79.5344],
    'los rios' => [-1.8022, -79.5344],
    'manabí' => [-1.0546, -80.4525],
    'manabi' => [-1.0546, -80.4525],
    'morona santiago' => [-2.3051, -78.1147],
    'napo' => [-0.9938, -77.8129],
    'orellana' => [-0.4667, -76.9872],
    'pastaza' => [-1.4924, -78.0024],
    'pichincha' => [-0.1807, -78.4678],
    'santa elena' => [-2.2267, -80.8587],
    'santo domingo' => [-0.2530, -79.1754],
    'sucumbíos' => [0.0875, -76.8898],
    'sucumbios' => [0.0875, -76.8898],
    'tungurahua' => [-1.2543, -78.6229],
    'zamora chinchipe' => [-4.0669, -78.9558],
  ];
  return $coords[$p] ?? null;
}

/**
 * Proyección de un lote para el marketplace y el mapa.
 *
 * $haySesion decide qué contacto sale. Sin sesión iba TODO: el correo del
 * dueño quedaba servido a cualquiera que llamara a la API — un regalo para
 * los recolectores de direcciones. El WhatsApp sí se mantiene: el botón
 * "Contactar" es el motivo de existir del marketplace y quien publica un lote
 * lo hace para que lo llamen.
 */
/** ¿Es un lote de la propia plataforma, puesto para que el catálogo no se vea vacío? */
function lote_es_demo(array $l): bool {
  return !empty($l['demo']) || !empty($l['ejemplo']) || ($l['productor_id'] ?? '') === 'admin';
}

/**
 * Datos que solo ve quien tiene cuenta, en los lotes de productores reales.
 *
 * DECISIÓN DEL PROPIETARIO (8 sep 2026): el catálogo sigue siendo público
 * —cualquiera ve qué café hay, de qué finca, a qué precio— pero la ficha
 * técnica y los documentos son el trabajo del productor: análisis de
 * laboratorio, informes de catación, certificados. Eso se muestra a quien se
 * registra, no a un visitante anónimo ni a un recolector automático.
 *
 * Los lotes de demostración son de la plataforma y quedan abiertos.
 */
const CAMPOS_SOLO_REGISTRADOS = [
  'documentos', 'estado', 'humedad', 'zaranda', 'defectos', 'rendimiento',
  'empaque', 'cosecha', 'cantidadKg', 'entrega', 'muestraDisponible',
  'notasTaza', 'observaciones', 'trazabilidad', 'canton',
  'registroSanitario', 'fechaTueste', 'perfilTaza', 'marca', 'molienda',
];

function lote_recortado_para_visitante(array $l): array {
  // Qué se vende —café en grano o material de siembra— no es ficha técnica:
  // sin este dato la tarjeta no sabe si el precio va por saco o por planta, y
  // un vivero salía anunciado como «precio a convenir».
  $siembra = lote_es_siembra($l);
  foreach (CAMPOS_SOLO_REGISTRADOS as $campo) unset($l[$campo]);
  if ($siembra) $l['siembra'] = true;

  // La finca de un productor real no se publica en su punto exacto. Quien
  // rellena latitud y longitud lo hace para salir en el mapa nacional, no para
  // que un desconocido tenga las coordenadas de su puerta. Sin sesión se
  // entregan redondeadas a dos decimales: en el mapa del país el pin cae en el
  // mismo sitio (un decimal de más o de menos ahí no se ve), pero sobre el
  // terreno eso es alrededor de un kilómetro, que ya no señala una casa.
  foreach (['lat', 'lng'] as $coord) {
    if (isset($l[$coord]) && is_numeric($l[$coord])) {
      $l[$coord] = round((float)$l[$coord], 2);
      $l['ubicacion_redondeada'] = true;
    }
  }

  // Se avisa de que hay más, en vez de dejar una ficha corta sin explicación.
  $l['ficha_restringida'] = true;
  return $l;
}

function lote_con_contacto_y_mapa(array $l, array $members, bool $haySesion = true): array {
  // Los lotes publicados antes de existir el producto terminado no llevan
  // categoría: son café verde. Se rellena aquí para que el marketplace pueda
  // filtrar sin comprobar la ausencia del campo en cada tarjeta.
  if (empty($l['categoria'])) $l['categoria'] = 'verde';
  // Se calcula siempre: un lote antiguo sin el campo tiene que salir con su
  // estado real, no en blanco.
  $l['disponibilidad'] = lote_disponibilidad($l);
  if ((empty($l['lat']) || empty($l['lng'])) && !empty($l['provincia'])) {
    $coord = lote_coord_por_provincia((string)$l['provincia']);
    if ($coord) {
      // Sin coordenada propia se usa la referencia provincial. Todos los lotes
      // de una misma provincia caían en el MISMO punto y se tapaban entre sí en
      // el mapa: se separan con un desplazamiento estable derivado del id
      // (~1-3 km) para que cada marcador sea visible y se pueda pulsar.
      $semilla = crc32((string)($l['id'] ?? ''));
      $dx = ((($semilla       % 1000) / 1000) - 0.5) * 0.05;
      $dy = (((intdiv($semilla, 1000) % 1000) / 1000) - 0.5) * 0.05;
      $l['lat'] = round($coord[0] + $dy, 6);
      $l['lng'] = round($coord[1] + $dx, 6);
      $l['ubicacion_aproximada'] = true;
    }
  }
  $owner = (string)($l['productor_id'] ?? $l['published_by'] ?? '');
  if ($owner !== '') {
    foreach ($members as $m) {
      if (($m['id'] ?? '') !== $owner) continue;
      $whatsapp = $m['whatsapp'] ?? $m['telefono'] ?? '';
      $l['contacto'] = [
        'nombre' => $m['nombre'] ?? ($l['productor'] ?? ''),
        // El sello del PERFIL, que es distinto del sello del lote. La ficha
        // los muestra por separado: verificar a alguien no verifica su café.
        'verificado' => !empty($m['verificado']),
      ];
      if ($haySesion) {
        $l['contacto']['whatsapp'] = redcafe_whatsapp_display($whatsapp);
        $l['contacto']['whatsapp_link'] = redcafe_whatsapp_link_digits($whatsapp);
        $l['contacto']['email'] = $m['email'] ?? '';
      }
      break;
    }
    if ($owner === 'admin' && empty($l['contacto'])) {
      $l['contacto'] = [
        'whatsapp' => '+593968641376',
        'whatsapp_link' => '593968641376',
        'email' => 'info@redcafeecuador.com',
        'nombre' => 'Red Café Ecuador',
        'verificado' => true,
      ];
    }
  }
  return $l;
}

function lote_orden_publicacion(array $a, array $b): int {
  $ta = strtotime((string)($a['created_at'] ?? '')) ?: 0;
  $tb = strtotime((string)($b['created_at'] ?? '')) ?: 0;
  if ($tb !== $ta) return $tb <=> $ta;
  return strcmp((string)($b['id'] ?? ''), (string)($a['id'] ?? ''));
}

function lote_owner_id(array $l): string {
  return (string)($l['published_by'] ?? $l['productor_id'] ?? '');
}

/* Los filtros del marketplace se arman con los valores que llegan en la lista,
   así que dos escrituras del mismo sitio abren dos opciones distintas y elegir
   una esconde los lotes de la otra. Pasó de verdad: una productora escribió
   «loja» y las fichas de muestra dicen «Típica» donde su lote real dice
   «Typica».
   No se toca lo guardado —es lo que el dueño escribió—: se unifica solo lo que
   se sirve, agrupando por el texto sin tildes ni mayúsculas y mostrando la
   grafía de un lote real antes que la de una ficha de muestra. */
/* Grafías de una misma variedad que no se distinguen por tilde ni por
   mayúscula, sino por la letra: «Typica»/«Típica» y «Geisha»/«Gesha» conviven
   en el catálogo y abrían dos opciones de filtro para el mismo café. Es una
   lista corta y explícita a propósito: adivinar equivalencias por parecido
   acabaría juntando variedades que sí son distintas. */
const LOTE_GRAFIAS_EQUIVALENTES = [
  'typica' => 'typica', 'tipica' => 'typica',
  'geisha' => 'geisha', 'gesha'  => 'geisha',
];

function lote_clave_texto(string $v): string {
  $v = mb_strtolower(trim($v), 'UTF-8');
  $v = strtr($v, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n']);
  $v = preg_replace('/\s+/', ' ', $v);
  return LOTE_GRAFIAS_EQUIVALENTES[$v] ?? $v;
}

function lotes_unificar_grafias(array $lotes, array $campos): array {
  foreach ($campos as $campo) {
    $variantes = [];
    foreach ($lotes as $l) {
      $v = trim((string)($l[$campo] ?? ''));
      if ($v === '') continue;
      $k = lote_clave_texto($v);
      if (!isset($variantes[$k][$v])) $variantes[$k][$v] = ['n' => 0, 'real' => false];
      $variantes[$k][$v]['n']++;
      if (!lote_es_demo($l)) $variantes[$k][$v]['real'] = true;
    }
    $canon = [];
    foreach ($variantes as $k => $formas) {
      uasort($formas, function ($a, $b) {
        if ($a['real'] !== $b['real']) return $a['real'] ? -1 : 1;
        return $b['n'] <=> $a['n'];
      });
      $canon[$k] = array_key_first($formas);
    }
    foreach ($lotes as &$l) {
      $v = trim((string)($l[$campo] ?? ''));
      if ($v === '') continue;
      $k = lote_clave_texto($v);
      if (isset($canon[$k])) $l[$campo] = $canon[$k];
    }
    unset($l);
  }
  return $lotes;
}

if ($action === 'list') {
  $lotes = load_json('lotes', seed_lotes());
  $members = load_json('members', []);
  // guardar la semilla si estaba vacía
  if (!file_exists(DATA_DIR . '/lotes.json')) save_json('lotes', $lotes);

  $haySesion = current_user() !== null || !empty($_SESSION['admin']);

  // DECISIÓN DEL PROPIETARIO (7 sep 2026): el catálogo del marketplace es
  // público entero. Todo lote no oculto se ve, tenga o no `visibilidad:
  // registrados`, y lo mismo vale para los que se publiquen en adelante. Un
  // marketplace con inventario escondido vende menos.
  //
  // Lo único que retira un lote del catálogo es `oculto`, que es un acto
  // deliberado del dueño o de la administración.
  //
  // Ni el correo ni el WhatsApp del dueño salen sin sesión. Esto cambió el 8 de
  // septiembre, cuando se decidió que contactar al vendedor exige cuenta: si la
  // API sigue entregando su teléfono, la puerta solo la ve quien mira la
  // pantalla, y cualquiera que lea la respuesta se lleva el número de una
  // productora real. La oferta sigue siendo pública; el teléfono, no.
  // Ni ocultos ni de cuentas suspendidas, bloqueadas o cerradas.
  $visibles = array_values(array_filter($lotes, function ($l) {
    return empty($l['oculto']) && publicacion_visible($l);
  }));
  usort($visibles, 'lote_orden_con_disponibilidad');
  $visibles = array_map(function ($l) use ($members, $haySesion) {
    $l = lote_con_contacto_y_mapa($l, $members, $haySesion);
    if (!$haySesion && !lote_es_demo($l)) $l = lote_recortado_para_visitante($l);
    return $l;
  }, $visibles);
  // El navegador no tiene que adivinar si hay sesión mirando qué campos
  // faltan: se lo decimos. De esto depende que el botón de contacto lleve al
  // vendedor o al registro, y una deducción indirecta fallaría justo en los
  // lotes de demostración, que no se recortan.
  $visibles = lotes_unificar_grafias($visibles, ['provincia', 'variedad', 'proceso']);
  ok(['lotes' => $visibles, 'sesion' => $haySesion]);
}

if ($action === 'mine' || $action === 'mis_lotes') {
  $u = current_user();
  $esAdmin = !empty($_SESSION['admin']) || ($u && miembro_tiene_rol($u, 'admin'));
  if (!$u && !$esAdmin) fail('No autenticado.', 401);
  $ownerId = $u ? (string)($u['id'] ?? '') : 'admin';
  if ($ownerId === '' && !$esAdmin) fail('Sesión inválida. Vuelve a iniciar sesión.', 401);
  $lotes = load_json('lotes', seed_lotes());
  $members = load_json('members', []);
  $propios = array_values(array_filter($lotes, fn($l) => $esAdmin || lote_owner_id($l) === $ownerId));
  usort($propios, 'lote_orden_publicacion');
  $propios = array_map(fn($l) => lote_con_contacto_y_mapa($l, $members), $propios);
  ok(['lotes' => $propios, 'admin' => $esAdmin]);
}

if ($action === 'all') {
  if (empty($_SESSION['admin'])) fail('Solo admin.', 403);
  ok(['lotes' => load_json('lotes', seed_lotes())]);
}

if ($action === 'publish') {
  // Evita ráfagas de publicaciones que llenen el marketplace y avisen a la administración.
  if (!check_rate_limit('lote_publicar', 30, 3600)) {
    fail('Has publicado demasiado seguido. Vuelve a intentarlo en una hora.', 429);
  }

  $u = require_user();
  // Publicar lotes no es solo cosa del productor: en la cadena del café también
  // ofrecen lote el comerciante, el exportador, el beneficiadero y quien compra
  // para revender. Quien publica es siempre el dueño de su publicación y el
  // único (junto con la administración) que puede editarla.
  $perfilesQueVenden = ['productor', 'vendedor', 'exportador', 'pilador', 'comprador', 'proveedor', 'admin'];
  $puede = false;
  foreach ($perfilesQueVenden as $rolVenta) {
    if (miembro_tiene_rol($u, $rolVenta)) { $puede = true; break; }
  }
  if (!$puede) {
    fail('Tu perfil no publica lotes de café. Añade el perfil de productor, comerciante, exportador o pilador desde tu cuenta.', 403);
  }
  // Un precio o un stock negativo se aceptaba y quedaba publicado.
  foreach (['precioSaco','precioQuintal','stockSacos','stockQuintales','altura'] as $n) {
    if (isset($in[$n]) && is_numeric($in[$n]) && floatval($in[$n]) < 0) {
      fail('El valor de ' . $n . ' no puede ser negativo.', 422);
    }
  }
  $categoria = lote_categoria($in);
  // El café verde se pide por saco; el ya tostado, por unidad. Exigir
  // 'precioSaco' a una bolsa de 340 g no tiene sentido, y exigir 'proceso'
  // a quien revende café de terceros tampoco.
  $esSiembra = lote_es_siembra(['estado' => (string)($in['estado'] ?? '')]);
  // Semilla y plántula no tienen proceso de beneficiado ni precio por saco:
  // lo que se pide es el precio por planta y cuántas hay.
  $req = $categoria === 'terminado'
    ? ['finca', 'provincia', 'variedad', 'precioUnidad']
    : ($esSiembra
        ? ['finca', 'provincia', 'variedad']
        : ['finca', 'provincia', 'variedad', 'proceso', 'precioSaco']);
  foreach ($req as $k) if (trim((string)($in[$k] ?? '')) === '') fail("Falta $k.", 422);
  if ($categoria === 'terminado' && (float)($in['precioUnidad'] ?? 0) <= 0) {
    fail('Indica el precio de venta por unidad.', 422);
  }
  // Semilla y plántula: se piden precio y cantidad POR UNIDAD, no por saco.
  if ($esSiembra) {
    if ((float)($in['precioUnidad'] ?? 0) <= 0) {
      fail('Indica el precio por planta o por semilla.', 422);
    }
    if ((int)($in['unidades'] ?? 0) <= 0) {
      fail('Indica cuántas plantas o semillas tienes disponibles.', 422);
    }
  }
  // Sin existencias, lote_disponibilidad() lo da por agotado. Un lote nuevo
  // con «Sacos disponibles» vacío salía publicado como agotado (17 sep 2026).
  if ($categoria !== 'terminado' && !$esSiembra
      && mb_strtolower(trim((string)($in['disponibilidad'] ?? ''))) !== 'agotado'
      && ((int)($in['stockSacos'] ?? 0) + (int)($in['stockQuintales'] ?? 0)) <= 0) {
    fail('Indica cuántos sacos tienes disponibles para vender.', 422);
  }

  // Ubicación opcional: lat/lng dentro de Ecuador continental (-5..2, -82..-75).
  // Fuera de rango o ausentes -> el lote se guarda igual, pero sin coordenadas
  // y marcado como sin ubicación. Publicar nunca falla por no tener GPS.
  $latRaw = trim((string)($in['lat'] ?? ''));
  $lngRaw = trim((string)($in['lng'] ?? ''));
  $traza = $in['trazabilidad'] ?? null;
  $gpsText = is_array($traza) ? trim((string)($traza['gps'] ?? '')) : '';
  $latVal = is_numeric($latRaw) ? (float)$latRaw : NAN;
  $lngVal = is_numeric($lngRaw) ? (float)$lngRaw : NAN;
  $tieneUbicacion = is_numeric($latRaw) && is_numeric($lngRaw)
    && $latVal >= -5 && $latVal <= 2
    && $lngVal >= -82 && $lngVal <= -75;

  // El lote se publica siempre en abierto. Antes heredaba la visibilidad del
  // perfil, así que un productor que había elegido no aparecer en el directorio
  // de miembros veía además su lote fuera del marketplace, sin haberlo pedido.
  // La preferencia del perfil sigue valiendo para el directorio de personas;
  // el catálogo de café es público.
  $visLote = ($in['visibilidad'] ?? 'publico') === 'registrados' ? 'registrados' : 'publico';
  $imagenes = lote_imagenes_validas($in['imagenes'] ?? []);

  $lote = [
    'id' => uid(),
    'categoria' => $categoria,
    'finca' => trim($in['finca']),
    'productor' => $u['nombre'],
    'productor_id' => $u['id'],
    'visibilidad' => $visLote,
    'provincia' => trim($in['provincia']),
    'variedad' => trim($in['variedad']),
    'proceso' => trim((string)($in['proceso'] ?? '')),
    // La altura es un dato de la finca, no un cero: 0 msnm no existe en la
    // caficultura ecuatoriana. Sin dato se deja vacío y la ficha lo omite.
    'altura' => (isset($in['altura']) && is_numeric($in['altura']) && (int)$in['altura'] > 0)
                  ? (int)$in['altura'] : null,
    // El puntaje NO se inventa. Es una nota de catación SCA: una afirmación
    // de calidad que solo vale si alguien cató el café. Antes, quien publicaba
    // sin indicarlo se encontraba con un 80 puesto por el sistema y anunciado
    // en el marketplace como si lo hubiera declarado él. Sin dato, no hay
    // puntaje, y la ficha lo dice: «sin catar».
    'score' => (isset($in['score']) && is_numeric($in['score']) && (int)$in['score'] > 0)
                 ? max(0, min(100, (int)$in['score']))
                 : null,
    'precioQuintal' => floatval($in['precioQuintal'] ?? 0),
    'precioSaco' => floatval($in['precioSaco'] ?? 0),
    // Cuánto pesa el saco de ESTE lote. Sin este dato, un precio «por saco» no
    // se puede comparar con otro ni con la referencia de mercado, que va por
    // quintal (100 lb). No se asume nada: si no lo dicen, la ficha lo declara
    // como «peso sin indicar».
    'pesoSacoLb' => (isset($in['pesoSacoLb']) && is_numeric($in['pesoSacoLb']) && (float)$in['pesoSacoLb'] > 0)
                      ? max(1, min(500, (int)round((float)$in['pesoSacoLb'])))
                      : null,
    'stockSacos' => intval($in['stockSacos'] ?? 0),
    'stockQuintales' => intval($in['stockQuintales'] ?? 0),
    // «Convencional» no es un valor neutro: afirma que el café NO está
    // certificado. A un productor con sello orgánico que no rellenó el campo,
    // la plataforma le estaba publicando lo contrario de lo que tiene, y eso
    // le cuesta dinero. Sin dato no se afirma nada.
    'certificacion' => trim((string)($in['certificacion'] ?? '')),
    // Notas de cata: de aquí sale el color del perfil de taza en el catálogo.
    'descripcion' => mb_substr(trim($in['descripcion'] ?? ''), 0, 400),
    'emoji' => trim($in['emoji'] ?? '☕'),
    // La venta mínima es un compromiso comercial del vendedor. Anunciar
    // «desde 1 lb» a quien solo vende por sacos le trae consultas que no
    // puede atender. Sin dato: a convenir.
    'ventaMinima' => trim((string)($in['ventaMinima'] ?? '')),
    // El sello no se hereda del rol de quien publica: se concede mirando el
    // lote, en api/verificaciones.php. Antes, todo lo que subía la
    // administración nacía «verificado» sin que nadie hubiera revisado nada.
    'verificado' => false,
    'imagenes' => $imagenes,
    'ejemplo' => false,
    'oculto' => false,
    'published_by' => $u['id'],
    'created_at' => now_iso(),
  ];
  if ($tieneUbicacion) {
    $lote['lat'] = $latVal;
    $lote['lng'] = $lngVal;
  } else {
    $coord = lote_coord_por_provincia((string)$lote['provincia']);
    if ($coord) {
      $lote['lat'] = $coord[0];
      $lote['lng'] = $coord[1];
      $lote['ubicacion_aproximada'] = true;
    } else {
      $lote['sin_ubicacion'] = true;
    }
  }
  if ($gpsText !== '') {
    $lote['trazabilidad'] = ['gps' => $gpsText];
  }
  $data = load_json('lotes', seed_lotes());
  $lote = lote_aplicar_ficha($lote, $in);
  if ($categoria === 'terminado') {
    $lote['estado'] = 'tostado';
    $lote = lote_aplicar_terminado($lote, $in);
    // Sin marca propia, la marca es el nombre con el que se publicó.
    if (trim((string)($lote['marca'] ?? '')) === '') $lote['marca'] = $lote['finca'];
  } elseif ($esSiembra) {
    // El material de siembra guarda precio y cantidad por unidad, igual que el
    // producto terminado, aunque su categoría siga siendo café verde.
    $lote['precioUnidad'] = round((float)($in['precioUnidad'] ?? 0), 2);
    $lote['unidades'] = (int)($in['unidades'] ?? 0);
    $lote['precioSaco'] = 0;
    $lote['precioQuintal'] = 0;
    $lote['stockSacos'] = 0;
    $lote['stockQuintales'] = 0;
  }
  $data[] = $lote;
  save_json('lotes', $data);
  publicar_aviso_comunidad('lote', $lote);
  registrar_actividad('lote-publicado', [
    'objeto_tipo' => 'lote',
    'objeto_id'   => (string)$lote['id'],
    'detalle'     => ($categoria === 'terminado' ? 'Producto terminado · ' : '')
                     . $lote['finca'] . ' · ' . $lote['variedad'] . ' · ' . $lote['provincia'],
    'monto'       => $categoria === 'terminado' ? ($lote['precioUnidad'] ?? 0) : $lote['precioSaco'],
  ]);
  notificar_admins('lote',
    ($categoria === 'terminado' ? 'Nuevo café tostado publicado: ' : 'Nuevo lote publicado: ') . $lote['finca'],
    $categoria === 'terminado'
      ? $lote['variedad'] . ' · ' . $lote['provincia'] . ' · $' . number_format((float)($lote['precioUnidad'] ?? 0), 2) . ' la unidad.'
      : $lote['variedad'] . ' · ' . $lote['provincia'] . ' · $' . number_format((float)$lote['precioSaco'], 2) . ' el saco.',
    '/marketplace/');
  ok(['lote' => $lote]);
}

if ($action === 'toggle_oculto') {
  if (empty($_SESSION['admin'])) fail('Solo admin.', 403);
  $id = $_GET['id'] ?? '';
  $data = mutate_json('lotes', seed_lotes(), function($lotes) use ($id) {
    foreach ($lotes as &$l) if (($l['id'] ?? '') === $id) $l['oculto'] = empty($l['oculto']);
    return $lotes;
  });
  ok();
}

if ($action === 'update') {
  $u = current_user();
  if (!$u && empty($_SESSION['admin'])) fail('No autenticado.', 401);
  $actorId = $u['id'] ?? 'admin';
  $esAdmin = !empty($_SESSION['admin']) || ($u && miembro_tiene_rol($u, 'admin'));
  $id = trim((string)($in['id'] ?? ($_GET['id'] ?? '')));
  if ($id === '') fail('id requerido.', 422);
  $data = load_json('lotes', seed_lotes());
  $updated = null;
  foreach ($data as &$l) {
    if (($l['id'] ?? '') !== $id) continue;
    $owner = lote_owner_id($l);
    if ($owner !== $actorId && !$esAdmin) {
      fail('No autorizado: solo el dueño o un administrador puede editar este lote.', 403);
    }
    $antes = $l;
    if (array_key_exists('disponibilidad', $in)) {
      $d = mb_strtolower(trim((string)$in['disponibilidad']));
      if (in_array($d, DISPONIBILIDADES_LOTE, true)) $l['disponibilidad'] = $d;
    }
    foreach (['finca','provincia','variedad','proceso','certificacion','descripcion','ventaMinima','visibilidad'] as $field) {
      if (!array_key_exists($field, $in)) continue;
      $valor = is_string($in[$field]) ? trim($in[$field]) : $in[$field];
      if ((string)($l[$field] ?? '') !== (string)$valor) $l[$field] = $valor;
    }
    if (array_key_exists('pesoSacoLb', $in)) {
      $peso = $in['pesoSacoLb'];
      $l['pesoSacoLb'] = (is_numeric($peso) && (float)$peso > 0)
        ? max(1, min(500, (int)round((float)$peso)))
        : null;
    }
    foreach (['stockSacos','stockQuintales'] as $field) {
      if (!array_key_exists($field, $in)) continue;
      $valor = intval($in[$field]);
      if (intval($l[$field] ?? 0) !== $valor) $l[$field] = $valor;
    }
    // Marcarlo disponible o reservado sin sacos lo dejaría agotado en silencio.
    if ((string)($l['categoria'] ?? 'verde') !== 'terminado' && !lote_es_siembra($l)
        && in_array(mb_strtolower(trim((string)($in['disponibilidad'] ?? ''))), ['disponible', 'reservado'], true)
        && ((int)($l['stockSacos'] ?? 0) + (int)($l['stockQuintales'] ?? 0)) <= 0) {
      fail('Para marcar el lote como disponible, indica cuántos sacos tienes.', 422);
    }
    if (lote_es_siembra($l)
        && in_array(mb_strtolower(trim((string)($in['disponibilidad'] ?? ''))), ['disponible', 'reservado'], true)
        && (int)($l['unidades'] ?? 0) <= 0) {
      fail('Para marcarlo disponible, indica cuántas plantas o semillas tienes.', 422);
    }
    if (array_key_exists('altura', $in)) {
      $a = $in['altura'];
      if ($a === '' || $a === null || (is_numeric($a) && (int)$a <= 0)) $l['altura'] = null;
      elseif (is_numeric($a) && (int)$a <= 4000) $l['altura'] = (int)$a;
    }
    // El puntaje se puede poner, corregir y también quitar: dejar el campo en
    // blanco significa «este café no está catado», no «vale cero».
    if (array_key_exists('score', $in)) {
      $bruto = $in['score'];
      if ($bruto === '' || $bruto === null) {
        $l['score'] = null;
      } elseif (is_numeric($bruto)) {
        $n = (int)$bruto;
        // La escala SCA va de 0 a 100 y por debajo de 60 no se cata: un valor
        // fuera de rango es un error de tecleo, no una nota.
        if ($n === 0) $l['score'] = null;
        elseif ($n >= 60 && $n <= 100) $l['score'] = $n;
      }
    }
    foreach (['precioQuintal','precioSaco','lat','lng'] as $field) {
      if (!array_key_exists($field, $in) || !is_numeric($in[$field])) continue;
      $valor = floatval($in[$field]);
      if (abs(floatval($l[$field] ?? 0) - $valor) > 0.000001) $l[$field] = $valor;
    }
    // Al fijar el dueño la ubicación real del lote deja de ser una referencia
    // provincial: se retiran las marcas de ubicación aproximada.
    if (array_key_exists('categoria', $in)) {
      $l['categoria'] = lote_categoria($in, (string)($l['categoria'] ?? 'verde'));
    }
    $l = lote_aplicar_ficha($l, $in);
    if (($l['categoria'] ?? 'verde') === 'terminado') {
      $l = lote_aplicar_terminado($l, $in);
    }
    if ((array_key_exists('lat', $in) || array_key_exists('lng', $in)) && !empty($l['lat']) && !empty($l['lng'])) {
      unset($l['ubicacion_aproximada'], $l['sin_ubicacion']);
    }
    if (array_key_exists('imagenes', $in)) {
      $imagenes = lote_imagenes_validas($in['imagenes']);
      if (($l['imagenes'] ?? []) !== $imagenes) $l['imagenes'] = $imagenes;
    }
    if ($l !== $antes) {
      $l['updated_at'] = now_iso();
      $l['updated_by'] = $actorId;
    }
    $updated = $l;
    break;
  }
  unset($l);
  if (!$updated) fail('Lote no encontrado.', 404);
  save_json('lotes', $data);
  ok(['lote' => $updated]);
}

/* ── Aviso de contacto al dueño ────────────────────────────────────────────
   Cuando alguien pulsa "Contactar", el dueño recibe un aviso para que
   confirme si el lote sigue en pie. Es lo único que mantiene el catálogo
   honesto: nadie entra al panel a marcar "agotado" por su cuenta.

   Funciona sin sesión —la mayoría de los interesados no la tienen— y por eso
   se limita por IP y se avisa como mucho una vez cada 12 h por lote: si no,
   cualquiera podría llenar de avisos la bandeja de un productor. */
if ($action === 'contacto') {
  $id = trim((string)($in['id'] ?? ($_GET['id'] ?? '')));
  if ($id === '') fail('id requerido.', 422);
  if (!check_rate_limit('contacto-lote', 20, 3600)) ok(['registrado' => false]);

  $u = current_user();
  $lotes = load_json('lotes', seed_lotes());
  $objetivo = null;
  foreach ($lotes as $l) { if (($l['id'] ?? '') === $id) { $objetivo = $l; break; } }
  if (!$objetivo) fail('Lote no encontrado.', 404);

  $duenio = lote_owner_id($objetivo);
  // Nadie se avisa a sí mismo por mirar su propio lote.
  if ($duenio === '' || ($u && $duenio === (string)$u['id'])) ok(['registrado' => false]);

  $ahora = time();
  $ultimo = strtotime((string)($objetivo['ultimo_aviso_contacto'] ?? '')) ?: 0;
  $avisar = ($ahora - $ultimo) > (12 * 3600);

  mutate_json('lotes', seed_lotes(), function ($todos) use ($id, $avisar) {
    foreach ($todos as &$l) {
      if (($l['id'] ?? '') !== $id) continue;
      $l['contactos'] = (int)($l['contactos'] ?? 0) + 1;
      $l['ultimo_contacto'] = now_iso();
      $l['confirmacion_pendiente'] = true;
      if ($avisar) $l['ultimo_aviso_contacto'] = now_iso();
    }
    unset($l);
    return $todos;
  });

  if ($avisar) {
    $quien = $u ? (string)($u['nombre'] ?? 'Un miembro') : 'Alguien';
    notificar($duenio, 'lote',
      $quien . ' preguntó por tu lote «' . (string)($objetivo['finca'] ?? 'sin nombre') . '»',
      'Confirma en tu panel si sigue disponible, si te queda menos cantidad o si ya se vendió.',
      '/panel/');
  }
  registrar_actividad('lote-contacto', [
    'objeto_tipo' => 'lote',
    'objeto_id'   => $id,
    'detalle'     => 'Consulta por ' . (string)($objetivo['finca'] ?? ''),
    'contraparte' => (string)($objetivo['productor'] ?? ''),
  ]);
  ok(['registrado' => true]);
}

/* ── El dueño confirma el estado ──────────────────────────────────────────
   Una sola llamada para las tres respuestas posibles: sigue igual, queda esta
   cantidad, o ya se vendió. */
if ($action === 'confirmar_estado') {
  $u = current_user();
  if (!$u && empty($_SESSION['admin'])) fail('No autenticado.', 401);
  $actorId = $u['id'] ?? 'admin';
  $esAdmin = !empty($_SESSION['admin']) || ($u && miembro_tiene_rol($u, 'admin'));
  $id = trim((string)($in['id'] ?? ''));
  if ($id === '') fail('id requerido.', 422);

  $lotes = load_json('lotes', seed_lotes());
  $objetivo = null;
  foreach ($lotes as $l) { if (($l['id'] ?? '') === $id) { $objetivo = $l; break; } }
  if (!$objetivo) fail('Lote no encontrado.', 404);
  if (lote_owner_id($objetivo) !== $actorId && !$esAdmin) {
    fail('No autorizado: solo el dueño puede confirmar el estado de su lote.', 403);
  }

  $disp = mb_strtolower(trim((string)($in['disponibilidad'] ?? '')));
  if ($disp !== '' && !in_array($disp, DISPONIBILIDADES_LOTE, true)) {
    fail('Estado no válido.', 422);
  }
  if ($disp === 'disponible' && (string)($objetivo['categoria'] ?? 'verde') !== 'terminado') {
    $sacos = array_key_exists('stockSacos', $in) ? (int)$in['stockSacos'] : (int)($objetivo['stockSacos'] ?? 0);
    $qq = array_key_exists('stockQuintales', $in) ? (int)$in['stockQuintales'] : (int)($objetivo['stockQuintales'] ?? 0);
    if ($sacos + $qq <= 0) fail('Este lote no tiene sacos registrados: usa «Queda menos» e indica cuántos te quedan.', 422);
  }

  $actualizado = null;
  mutate_json('lotes', seed_lotes(), function ($todos) use ($id, $in, $disp, $actorId, &$actualizado) {
    foreach ($todos as &$l) {
      if (($l['id'] ?? '') !== $id) continue;
      foreach (['stockSacos', 'stockQuintales', 'unidades'] as $campo) {
        if (array_key_exists($campo, $in) && is_numeric($in[$campo])) {
          $v = (int)$in[$campo];
          if ($v >= 0 && $v <= 100000) $l[$campo] = $v;
        }
      }
      // Si se marca agotado, el stock se pone a cero: dejarlo en 30 sacos
      // contradiría la etiqueta y confundiría al comprador.
      if ($disp === 'agotado') {
        $l['stockSacos'] = 0;
        $l['stockQuintales'] = 0;
        if ((string)($l['categoria'] ?? 'verde') === 'terminado' || lote_es_siembra($l)) $l['unidades'] = 0;
      }
      if ($disp !== '') $l['disponibilidad'] = $disp;
      $l['confirmacion_pendiente'] = false;
      $l['estado_confirmado_at'] = now_iso();
      $l['updated_at'] = now_iso();
      $l['updated_by'] = $actorId;
      $actualizado = $l;
    }
    unset($l);
    return $todos;
  });

  registrar_actividad('lote-estado', [
    'objeto_tipo' => 'lote',
    'objeto_id'   => $id,
    'detalle'     => (string)($actualizado['finca'] ?? '') . ' · ' . lote_disponibilidad($actualizado ?: []),
  ]);
  $actualizado['disponibilidad'] = lote_disponibilidad($actualizado ?: []);
  ok(['lote' => $actualizado]);
}

if ($action === 'delete') {
  $u = current_user();
  if (!$u && empty($_SESSION['admin'])) fail('No autenticado.', 401);
  $actorId = $u['id'] ?? 'admin';
  $esAdmin = !empty($_SESSION['admin']) || ($u && miembro_tiene_rol($u, 'admin'));
  $id = $_GET['id'] ?? '';
  if (!$id) fail('id requerido.', 422);
  $data = load_json('lotes', seed_lotes());
  $objetivo = null;
  foreach ($data as $l) {
    if (($l['id'] ?? '') === $id) { $objetivo = $l; break; }
  }
  if (!$objetivo) fail('Lote no encontrado.', 404);
  $autorizado = lote_owner_id($objetivo) === $actorId || $esAdmin;
  if (!$autorizado) fail('No autorizado: solo el productor dueño o un administrador puede borrar.', 403);
  $data = array_values(array_filter($data, fn($l) => ($l['id'] ?? '') !== $id));
  save_json('lotes', $data);
  ok();
}

fail('Acción no válida.', 400);
