<?php
/**
 * visual.php — Editor visual controlado desde admin.
 *
 * Objetivo: permitir cambios de contenido visible y ajustes visuales seguros
 * sin recompilar Next, sin reemplazar CSS de V60/V74 y sin tocar datos reales.
 */

declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

const VISUAL_ALLOWED_CSS_VARS = [
  '--color-cafe',
  '--color-cereza',
  '--color-latte',
  '--color-crema',
  '--color-hoja',
  '--color-acento-claro',
];

const VISUAL_ALLOWED_SELECTORS = [
  'body',
  'header',
  'main',
  'footer',
  'h1',
  'h2',
  'h3',
  'p',
  'a',
  'img',
  '.hero-gradient',
  '#lotes-grid',
  '#servicios-grid',
  '#mapa',
];

function visual_default(): array {
  return [
    'version' => 1,
    'nombre' => 'Tema V60/V74 protegido',
    'updated_at' => now_iso(),
    'tokens' => [],
    'textos' => [],
    'imagenes' => [],
    'links' => [],
    'bloques' => [
      'marketplace_compacto_seguro' => true,
      'menu_secundario' => true,
      'panel_solicitudes_marketplace' => true,
    ],
    'css_seguro' => [],
  ];
}

function visual_clean_string($value, int $max): string {
  $value = trim((string)$value);
  if (mb_strlen($value) > $max) $value = mb_substr($value, 0, $max);
  return $value;
}

function visual_valid_url(string $url): bool {
  if ($url === '') return true;
  if (str_starts_with($url, '/')) return !str_contains($url, '..');
  return (bool)preg_match('#^(https://|mailto:|tel:)#i', $url);
}

function visual_valid_selector(string $selector): bool {
  if (in_array($selector, VISUAL_ALLOWED_SELECTORS, true)) return true;
  return (bool)preg_match('/^(\#|\.|main\s|section\[|a\[|img\[)[A-Za-z0-9_\-\s\.\#\=\[\]\"\'\:\/]+$/', $selector)
    && !preg_match('/[{}<>;]/', $selector);
}

function visual_valid_color(string $color): bool {
  return (bool)preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6})$/i', $color);
}

function visual_normalize(array $in): array {
  $out = visual_default();
  $out['version'] = max(1, (int)($in['version'] ?? 1));
  $out['nombre'] = visual_clean_string($in['nombre'] ?? $out['nombre'], 120);
  $out['updated_at'] = now_iso();

  $tokens = is_array($in['tokens'] ?? null) ? $in['tokens'] : [];
  foreach ($tokens as $name => $value) {
    $name = (string)$name;
    $value = visual_clean_string($value, 32);
    if (in_array($name, VISUAL_ALLOWED_CSS_VARS, true) && visual_valid_color($value)) {
      $out['tokens'][$name] = $value;
    }
  }

  foreach (['textos', 'imagenes', 'links'] as $key) {
    $items = is_array($in[$key] ?? null) ? array_slice($in[$key], 0, 80) : [];
    foreach ($items as $item) {
      if (!is_array($item)) continue;
      $selector = visual_clean_string($item['selector'] ?? '', 180);
      if ($selector === '' || !visual_valid_selector($selector)) continue;
      $entry = ['selector' => $selector];
      if ($key === 'textos') {
        $entry['texto'] = visual_clean_string($item['texto'] ?? '', 2000);
      } elseif ($key === 'imagenes') {
        $src = visual_clean_string($item['src'] ?? '', 500);
        if (!visual_valid_url($src)) continue;
        $entry['src'] = $src;
        $entry['alt'] = visual_clean_string($item['alt'] ?? '', 300);
      } else {
        $href = visual_clean_string($item['href'] ?? '', 500);
        if (!visual_valid_url($href)) continue;
        $entry['href'] = $href;
        $entry['texto'] = visual_clean_string($item['texto'] ?? '', 300);
      }
      $out[$key][] = $entry;
    }
  }

  $bloques = is_array($in['bloques'] ?? null) ? $in['bloques'] : [];
  foreach ($out['bloques'] as $name => $_) {
    if (array_key_exists($name, $bloques)) $out['bloques'][$name] = (bool)$bloques[$name];
  }

  $css = is_array($in['css_seguro'] ?? null) ? array_slice($in['css_seguro'], 0, 40) : [];
  foreach ($css as $rule) {
    if (!is_array($rule)) continue;
    $selector = visual_clean_string($rule['selector'] ?? '', 180);
    $prop = visual_clean_string($rule['propiedad'] ?? '', 60);
    $value = visual_clean_string($rule['valor'] ?? '', 120);
    if (!visual_valid_selector($selector)) continue;
    if (!in_array($prop, ['display', 'visibility', 'order', 'margin-top', 'margin-bottom', 'padding-top', 'padding-bottom'], true)) continue;
    if (preg_match('/[{}<>;]/', $value)) continue;
    $out['css_seguro'][] = ['selector' => $selector, 'propiedad' => $prop, 'valor' => $value];
  }

  return $out;
}

function visual_read(string $name): array {
  if ($name === 'visual-versiones') {
    $data = load_json($name, []);
    return array_is_list($data) ? $data : [];
  }
  return load_json($name, visual_default());
}

function visual_write(string $name, array $data): void {
  if (!save_json($name, $data)) fail('No se pudo guardar la configuracion visual.', 500);
}

$action = $_GET['action'] ?? 'published';

if ($action === 'published') {
  $data = visual_read('visual-publicado');
  header('Cache-Control: public, max-age=60, stale-while-revalidate=300');
  ok($data);
}

require_admin();

if ($action === 'get') {
  ok([
    'publicado' => visual_read('visual-publicado'),
    'borrador' => visual_read('visual-borrador'),
    'versiones' => visual_read('visual-versiones'),
    'permitidos' => [
      'tokens' => VISUAL_ALLOWED_CSS_VARS,
      'selectores' => VISUAL_ALLOWED_SELECTORS,
    ],
  ]);
}

if ($action === 'save_draft') {
  $draft = visual_normalize(input());
  visual_write('visual-borrador', $draft);
  ok(['borrador' => $draft]);
}

if ($action === 'publish') {
  $draft = visual_normalize(input());
  $current = visual_read('visual-publicado');
  $versions = visual_read('visual-versiones');
  $versions[] = [
    'id' => 'visual-' . gmdate('Ymd-His'),
    'created_at' => now_iso(),
    'snapshot' => $current,
  ];
  $versions = array_slice($versions, -20);
  $draft['version'] = (int)($current['version'] ?? 0) + 1;
  $draft['published_at'] = now_iso();
  visual_write('visual-versiones', $versions);
  visual_write('visual-publicado', $draft);
  visual_write('visual-borrador', $draft);
  ok(['publicado' => $draft]);
}

if ($action === 'rollback') {
  $id = trim((string)($_GET['id'] ?? ''));
  $versions = visual_read('visual-versiones');
  foreach ($versions as $version) {
    if (($version['id'] ?? '') === $id && is_array($version['snapshot'] ?? null)) {
      $snapshot = visual_normalize($version['snapshot']);
      $snapshot['version'] = (int)(visual_read('visual-publicado')['version'] ?? 0) + 1;
      $snapshot['published_at'] = now_iso();
      visual_write('visual-publicado', $snapshot);
      visual_write('visual-borrador', $snapshot);
      ok(['publicado' => $snapshot]);
    }
  }
  fail('Version no encontrada.', 404);
}

fail('Accion no valida.', 400);
