<?php
/**
 * API de Media — videos y reportajes del hub Bar/Cafetería.
 *
 * Estructura:
 *   data/media.json — fuente única de videos y reportajes.
 *
 * Esquema de cada item:
 *   {
 *     "id": "video-geisha-loja",
 *     "tipo": "video" | "reportaje",
 *     "titulo": "...",
 *     "descripcion": "...",
 *     "embed": "https://www.youtube.com/embed/...",   // para videos
 *     "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg", // opcional
 *     "imagen": "/img/reportaje-x.jpg",                  // para reportajes
 *     "autor": "María Z.",
 *     "fecha": "2026-08-01",
 *     "categoria": "catacion" | "barismo" | "origen" | "recetas" | "eventos" | "productores",
 *     "tags": ["loja","geisha"],
 *     "redes": { "instagram": "...", "tiktok": "...", "youtube": "..." }   // opcional
 *   }
 *
 * Acciones:
 *   ?action=list              → todos los items
 *   ?action=list&tipo=video   → solo videos
 *   ?action=list&tipo=reportaje → solo reportajes
 *   ?action=list&categoria=catacion
 *   ?action=get&id=video-x    → un item
 *   ?action=add (admin)       → agregar item
 *   ?action=delete&id=... (admin) → eliminar item
 *
 * El archivo JSON se edita directamente desde el admin o vía FTP.
 * Esta API es de SOLO LECTURA para el público (no requiere login para list/get).
 */

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/_bootstrap.php';

const MEDIA_FILE = DATA_DIR . '/media.json';

function media_read(): array {
  if (!file_exists(MEDIA_FILE)) {
    $default = [
      'updated_at' => gmdate('c'),
      'items'      => seed_media(),
    ];
    file_put_contents(MEDIA_FILE, json_encode($default, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    return $default;
  }
  $j = json_decode(file_get_contents(MEDIA_FILE), true);
  if (!is_array($j)) return ['items' => []];
  return $j;
}

function seed_media(): array {
  // Seed inicial con contenido demostrativo (se puede editar desde admin o FTP).
  return [
    [
      'id' => 'video-catacion-geisha',
      'tipo' => 'video',
      'titulo' => '[Ejemplo] Cata profesional de Geisha de Loja',
      'descripcion' => '(nombre de ejemplo), Q-Grader, evalúa un microlote de Geisha lavado: fragancia, sabor, retrogusto, balance.',
      'embed' => '',
      'thumbnail' => '',
      'autor' => 'Red Café Ecuador',
      'fecha' => '2026-08-05',
      'categoria' => 'catacion',
      'tags' => ['geisha','loja','q-grader','catacion'],
      'redes' => ['youtube' => 'https://www.youtube.com/@RedCaf%C3%A9Ecuador'],
      'ejemplo' => true,
    ],
    [
      'id' => 'video-barismo-latte-art',
      'tipo' => 'video',
      'titulo' => '[Ejemplo] Latte art: roseta básica en 3 pasos',
      'descripcion' => '(nombre de ejemplo), barista certificado, enseña la roseta básica para cafeterías afiliadas.',
      'embed' => '',
      'thumbnail' => '',
      'autor' => 'Red Café Ecuador',
      'fecha' => '2026-07-22',
      'categoria' => 'barismo',
      'tags' => ['barismo','latte-art','capacitacion'],
      'redes' => [],
      'ejemplo' => true,
    ],
    [
      'id' => 'video-origen-zamora',
      'tipo' => 'video',
      'titulo' => '[Ejemplo] De la finca a la taza: recorrido por Zamora',
      'descripcion' => 'Reportaje en finca de (nombre de ejemplo): cosecha selectiva, beneficio, secado en patio y embarque a Corea.',
      'embed' => '',
      'thumbnail' => '',
      'autor' => 'Red Café Ecuador',
      'fecha' => '2026-07-10',
      'categoria' => 'origen',
      'tags' => ['zamora','sidra','origen','corea'],
      'ejemplo' => true,
    ],
    [
      'id' => 'video-receta-cold-brew',
      'tipo' => 'video',
      'titulo' => '[Ejemplo] Cold brew de café ecuatoriano para tu barra',
      'descripcion' => 'Receta 1:8 con Geisha, 18h en nevera. Filtra y sirve con hielo.',
      'embed' => '',
      'thumbnail' => '',
      'autor' => 'Red Café Ecuador',
      'fecha' => '2026-06-30',
      'categoria' => 'recetas',
      'tags' => ['cold-brew','recetas','barra'],
      'ejemplo' => true,
    ],
    [
      'id' => 'reportaje-productores-loja',
      'tipo' => 'reportaje',
      'titulo' => '[Ejemplo] 8 productores de Loja que están cambiando el café ecuatoriano',
      'descripcion' => 'Perfiles, fincas y procesos de ocho caficultores lojanos que llevan su café a mercados premium de Japón, Corea y EE.UU.',
      'imagen' => '',
      'autor' => 'Red Café Ecuador',
      'fecha' => '2026-08-12',
      'categoria' => 'productores',
      'tags' => ['loja','productores','especialidad'],
      'ejemplo' => true,
      'cuerpo' => "Loja es, desde hace años, la provincia con mayor densidad de cafés de especialidad del Ecuador. En este reportaje visitamos ocho fincas que están marcando tendencia:\n\n1. Finca El Paraíso ((nombre de ejemplo)) — Geisha lavado con perfil floral.\n2. Finca La Soledad ((nombre de ejemplo)) — Sidra natural de proceso experimental.\n3. Finca Valles del Cóndor — Typica tradicional con secado lento.\n4. ...\n\nCada uno de estos productores encontró en la Red Café Ecuador un canal directo para llegar a compradores internacionales sin intermediarios.",
    ],
    [
      'id' => 'reportaje-becadas-barismo',
      'tipo' => 'reportaje',
      'titulo' => '[Ejemplo] Las 12 becadas 2026 en barismo ya están listas',
      'descripcion' => 'Programa anual de becas para mujeres baristas de zonas cafeteras. Conoce a las seleccionadas y sus proyectos.',
      'imagen' => '',
      'autor' => 'Red Café Ecuador',
      'fecha' => '2026-07-15',
      'categoria' => 'eventos',
      'tags' => ['becas','barismo','mujeres','academia'],
      'ejemplo' => true,
      'cuerpo' => "Este año 2026 entregamos 12 becas completas a mujeres baristas de Manabí, Loja, Zamora y Sucumbíos. Cada becada recibe:\n\n- Curso intensivo de 3 meses.\n- Materiales de barismo profesional.\n- Vinculación a una barra afiliada.\n- Mentoría con baristas senior.\n\nLas postulaciones para 2027 abren en noviembre.",
    ],
  ];
}

$action = $_GET['action'] ?? 'list';

switch ($action) {
  case 'list': {
    $data = media_read();
    $items = $data['items'] ?? [];
    $tipo = $_GET['tipo'] ?? null;
    $cat  = $_GET['categoria'] ?? null;
    $tag  = $_GET['tag'] ?? null;
    $limit = isset($_GET['limit']) ? max(1, min(50, (int)$_GET['limit'])) : 50;

    $filtered = array_values(array_filter($items, function ($it) use ($tipo, $cat, $tag) {
      if ($tipo && ($it['tipo'] ?? '') !== $tipo) return false;
      if ($cat  && ($it['categoria'] ?? '') !== $cat) return false;
      if ($tag  && !in_array($tag, (array)($it['tags'] ?? []), true)) return false;
      return true;
    }));

    // Orden: más recientes primero
    usort($filtered, fn($a, $b) => strcmp($b['fecha'] ?? '', $a['fecha'] ?? ''));
    $filtered = array_slice($filtered, 0, $limit);

    ok([
      'count'      => count($filtered),
      'total'      => count($items),
      'updated_at' => $data['updated_at'] ?? null,
      'items'      => $filtered,
    ]);
    break;
  }

  case 'get': {
    $id = $_GET['id'] ?? '';
    if (!$id) fail('id requerido.');
    $data = media_read();
    foreach (($data['items'] ?? []) as $it) {
      if (($it['id'] ?? '') === $id) {
        ok($it);
        return;
      }
    }
    fail('Item no encontrado.', 404);
  }

  case 'categorias': {
    $data = media_read();
    $cats = [];
    foreach (($data['items'] ?? []) as $it) {
      $c = $it['categoria'] ?? 'general';
      $cats[$c] = ($cats[$c] ?? 0) + 1;
    }
    ok($cats);
  }

  case 'redes': {
    // Devuelve los canales oficiales de la Red Café Ecuador.
    // Configurable aquí para centralizar todos los enlaces sociales.
    ok([
      // Solo canales que existen de verdad. Un enlace vacío o genérico hace
      // más daño que la ausencia del canal.
      'whatsapp'   => [
        'nombre'    => 'Asesor redcafeEcuador',
        'contacto'  => 'https://wa.me/593968641376',
        'comunidad' => '',
        'broadcast' => '',
      ],
      'instagram'  => 'https://www.instagram.com/redcafeecuador/',
      'tiktok'     => 'https://www.tiktok.com/@redcafeecuador',
      'facebook'   => 'https://www.facebook.com/RedCafeEcuador',
      'youtube'    => 'https://www.youtube.com/@RedCaf%C3%A9Ecuador',
      'x'          => '',
      'telegram'   => '',
      'spotify'    => '',
      'threads'    => '',
    ]);
  }

  case 'add': {
    require_admin();
    $in = input();
    $id = $in['id'] ?? '';
    if (!$id || !preg_match('/^[a-z0-9\-_]{2,80}$/', $id)) {
      fail('id inválido (solo a-z, 0-9, guion y guion bajo, 2-80 chars).');
    }
    if (empty($in['titulo']) || empty($in['tipo'])) fail('titulo y tipo requeridos.');
    if (!in_array($in['tipo'], ['video', 'reportaje'], true)) fail('tipo debe ser video|reportaje.');

    $data = media_read();
    // Evitar duplicados
    foreach ($data['items'] as $it) {
      if (($it['id'] ?? '') === $id) fail('id ya existe.', 409);
    }
    $in['fecha'] = $in['fecha'] ?? gmdate('Y-m-d');
    $data['items'][] = $in;
    $data['updated_at'] = gmdate('c');
    file_put_contents(MEDIA_FILE, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    ok(['id' => $id]);
  }

  case 'delete': {
    require_admin();
    $id = $_GET['id'] ?? '';
    if (!$id) fail('id requerido.');
    $data = media_read();
    $before = count($data['items']);
    $data['items'] = array_values(array_filter($data['items'], fn($i) => ($i['id'] ?? '') !== $id));
    if (count($data['items']) === $before) fail('id no encontrado.', 404);
    $data['updated_at'] = gmdate('c');
    file_put_contents(MEDIA_FILE, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    ok(['deleted' => $id]);
  }

  default:
    fail('Acción no válida. Use list|get|categorias|redes|add|delete.');
}