<?php
/**
 * cms.php — Adaptador de contenido: archivos locales o WordPress.
 *
 * Por qué existe: las páginas no deben saber de dónde sale el contenido. Hoy puede venir
 * de data/contenido-*.json; mañana, del WordPress del dominio padre. Cambiar de origen es
 * cambiar una configuración, no tocar las 31 páginas.
 *
 * Origen WordPress: se activa creando data/.wp.json con
 *   { "base": "https://solucionespro.net", "usuario": "...", "app_password": "..." }
 * Ese archivo queda bloqueado por el .htaccess (data/ devuelve 403) y NUNCA se sirve.
 * Sin ese archivo, el adaptador trabaja contra los JSON locales y todo sigue igual.
 *
 * Acciones:
 *   ?action=estado                 → qué origen está activo y si WordPress responde
 *   ?action=medios&buscar=&pagina= → biblioteca de medios (lectura pública de WP)
 *   ?action=contenido&seccion=X    → contenido de una sección, venga de donde venga
 */

declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

const WP_CONF   = __DIR__ . '/../data/.wp.json';
const WP_CACHE  = __DIR__ . '/../data/.wp-cache';
const CACHE_TTL = 300;

const SECCIONES = ['noticias', 'cursos', 'planes', 'servicios'];

function wp_conf(): ?array {
  if (!file_exists(WP_CONF)) return null;
  $j = json_decode((string)file_get_contents(WP_CONF), true);
  if (!is_array($j) || empty($j['base'])) return null;
  return $j;
}

function wp_get(string $ruta, int $ttl = CACHE_TTL): ?array {
  $conf = wp_conf();
  if (!$conf) return null;
  if (!is_dir(WP_CACHE)) @mkdir(WP_CACHE, 0700, true);
  $clave = WP_CACHE . '/' . md5($ruta) . '.json';
  if (file_exists($clave) && (time() - filemtime($clave)) < $ttl) {
    $c = json_decode((string)file_get_contents($clave), true);
    if (is_array($c)) return $c;
  }
  $url = rtrim($conf['base'], '/') . '/wp-json/wp/v2/' . ltrim($ruta, '/');
  $ctx = stream_context_create(['http' => [
    'method'  => 'GET',
    'timeout' => 6,
    'header'  => "Accept: application/json\r\n",
  ]]);
  $raw = @file_get_contents($url, false, $ctx);
  if ($raw === false) return null;
  $j = json_decode($raw, true);
  if (!is_array($j)) return null;
  @file_put_contents($clave, json_encode($j, JSON_UNESCAPED_UNICODE));
  return $j;
}

function local_seccion(string $seccion): array {
  $f = __DIR__ . '/../data/contenido-' . $seccion . '.json';
  if (!file_exists($f)) return [];
  $j = json_decode((string)file_get_contents($f), true);
  return is_array($j) ? $j : [];
}

$action = $_GET['action'] ?? 'estado';

if ($action === 'estado') {
  $conf = wp_conf();
  $vivo = false;
  if ($conf) { $vivo = is_array(wp_get('types', 60)); }
  ok([
    'origen'         => $conf ? ($vivo ? 'wordpress' : 'local (WordPress no responde)') : 'local',
    'wp_configurado' => (bool)$conf,
    'wp_responde'    => $vivo,
    'secciones'      => SECCIONES,
  ]);
}

if ($action === 'medios') {
  $conf = wp_conf();
  if (!$conf) fail('La biblioteca de medios requiere WordPress configurado. Crea data/.wp.json', 409);
  $pagina = max(1, min(50, (int)($_GET['pagina'] ?? 1)));
  $buscar = substr(trim((string)($_GET['buscar'] ?? '')), 0, 80);
  $ruta = 'media?per_page=24&page=' . $pagina . '&media_type=image';
  if ($buscar !== '') $ruta .= '&search=' . rawurlencode($buscar);
  $items = wp_get($ruta);
  if ($items === null) fail('No se pudo consultar la biblioteca de WordPress.', 502);
  $out = [];
  foreach ($items as $m) {
    $tam = $m['media_details']['sizes'] ?? [];
    $out[] = [
      'id'        => $m['id'] ?? null,
      'titulo'    => strip_tags((string)($m['title']['rendered'] ?? '')),
      'alt'       => (string)($m['alt_text'] ?? ''),
      'url'       => (string)($m['source_url'] ?? ''),
      'miniatura' => (string)($tam['thumbnail']['source_url'] ?? ($m['source_url'] ?? '')),
      'ancho'     => $m['media_details']['width'] ?? null,
      'alto'      => $m['media_details']['height'] ?? null,
      'fecha'     => (string)($m['date'] ?? ''),
    ];
  }
  ok(['pagina' => $pagina, 'items' => $out]);
}

if ($action === 'contenido') {
  $seccion = (string)($_GET['seccion'] ?? '');
  if (!in_array($seccion, SECCIONES, true)) fail('Seccion no valida.', 422);
  if ($seccion === 'noticias' && wp_conf()) {
    $posts = wp_get('posts?per_page=20&_embed=1');
    if (is_array($posts) && count($posts) > 0) {
      $out = [];
      foreach ($posts as $p) {
        $img = $p['_embedded']['wp:featuredmedia'][0]['source_url'] ?? '';
        $out[] = [
          'id'      => (string)($p['id'] ?? ''),
          'slug'    => (string)($p['slug'] ?? ''),
          'titulo'  => strip_tags((string)($p['title']['rendered'] ?? '')),
          'resumen' => trim(strip_tags((string)($p['excerpt']['rendered'] ?? ''))),
          'cuerpo'  => (string)($p['content']['rendered'] ?? ''),
          'fecha'   => substr((string)($p['date'] ?? ''), 0, 10),
          'imagen'  => (string)$img,
          'origen'  => 'wordpress',
        ];
      }
      ok(['seccion' => $seccion, 'origen' => 'wordpress', 'items' => $out]);
    }
  }
  ok(['seccion' => $seccion, 'origen' => 'local', 'items' => local_seccion($seccion)]);
}

fail('Accion no valida. Use estado|medios|contenido.');
