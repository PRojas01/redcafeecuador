<?php
/**
 * API Admin — CRUD universal para el panel de administración.
 *
 * Recursos editables:
 *   members  — usuarios (incluye reset)
 *   cursos   — academia
 *   planes   — planes de suscripción
 *   lotes    — marketplace
 *   pedidos  — pedidos
 *   media    — videos y reportajes
 *   paginas  — páginas legales / info (markdown)
 *
 * Acciones especiales:
 *   ?action=reset_user&id=X   → borra datos del usuario X (pedidos, lotes, ratings)
 *   ?action=reset_platform    → borra TODO (con ?confirm=yes)
 *   ?action=export&tipo=X     → exporta JSON de un recurso
 *   ?action=stats_global      → métricas globales
 *
 * Todos los endpoints requieren sesión de admin (require_admin).
 */

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/_bootstrap.php';

require_admin();

$action = $_GET['action'] ?? '';

// ─── Catálogo de recursos editables ────────────────────────────────────────
// Define cómo se lee/escribe cada recurso. Algunos son archivos JSON,
// otros son secciones del código que editamos regenerando el archivo.

const RECURSOS_JSON = [
  'members' => ['file' => 'members.json', 'key' => 'members'],
  'pedidos' => ['file' => 'pedidos.json', 'key' => 'pedidos'],
  'lotes'   => ['file' => 'lotes.json',   'key' => 'lotes'],
  'ratings' => ['file' => 'ratings.json', 'key' => 'ratings'],
  'chats'   => ['file' => 'chats.json',   'key' => 'chats'],
  'posts'   => ['file' => 'posts.json',   'key' => 'posts'],
  'waitlist'=> ['file' => 'waitlist.json','key' => 'waitlist'],
  'consents'=> ['file' => 'consents.json','key' => 'consents'],
];

function recurso_path(string $name): ?string {
  if (!isset(RECURSOS_JSON[$name])) return null;
  return DATA_DIR . '/' . RECURSOS_JSON[$name]['file'];
}
function recurso_key(string $name): string {
  return RECURSOS_JSON[$name]['key'] ?? $name;
}
function recurso_read(string $name): array {
  $f = recurso_path($name);
  if (!$f || !file_exists($f)) return [];
  $j = json_decode(file_get_contents($f), true);
  return is_array($j) ? $j : [];
}
function recurso_write(string $name, array $data): bool {
  $f = recurso_path($name);
  if (!$f) return false;
  $tmp = $f . '.tmp';
  $fp = fopen($tmp, 'w');
  if (!$fp) return false;
  flock($fp, LOCK_EX);
  fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  return rename($tmp, $f);
}

// ─── Recursos con almacenamiento TS (cursos, planes) ──────────────────────
// Estos viven en lib/data.ts. Para editarlos desde el admin los guardamos
// también en data/ para lectura dinámica en runtime. Si el archivo TS tiene
// datos pero data/ no, usamos data/ como fuente editable.

const RECURSOS_DATA = ['cursos', 'planes'];

function data_path(string $name): string {
  return DATA_DIR . '/' . $name . '.json';
}
function data_read(string $name): ?array {
  $f = data_path($name);
  if (!file_exists($f)) return null;
  $j = json_decode(file_get_contents($f), true);
  return is_array($j) ? $j : null;
}
function data_write(string $name, array $data): bool {
  $f = data_path($name);
  $tmp = $f . '.tmp';
  $fp = fopen($tmp, 'w');
  if (!$fp) return false;
  flock($fp, LOCK_EX);
  fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  return rename($tmp, $f);
}

// ─── Páginas (markdown) ──────────────────────────────────────────────────

function paginas_dir(): string {
  return DATA_DIR . '/paginas';
}
function paginas_read(): array {
  $dir = paginas_dir();
  if (!is_dir($dir)) @mkdir($dir, 0755, true);
  $out = [];
  foreach (glob($dir . '/*.md') as $f) {
    $slug = basename($f, '.md');
    $meta = $dir . '/' . $slug . '.meta.json';
    $m = file_exists($meta) ? (json_decode(file_get_contents($meta), true) ?: []) : [];
    $out[] = [
      'slug'     => $slug,
      'titulo'   => $m['titulo'] ?? ucfirst(str_replace('-', ' ', $slug)),
      'resumen'  => $m['resumen'] ?? '',
      'orden'    => $m['orden'] ?? 99,
      'publicado'=> $m['publicado'] ?? true,
      'contenido'=> file_get_contents($f),
      'updated_at' => gmdate('c', filemtime($f)),
    ];
  }
  usort($out, fn($a, $b) => ($a['orden'] ?? 99) <=> ($b['orden'] ?? 99));
  return $out;
}
function paginas_get(string $slug): ?array {
  $dir = paginas_dir();
  if (!is_dir($dir)) @mkdir($dir, 0755, true);
  $f = $dir . '/' . $slug . '.md';
  if (!file_exists($f)) return null;
  $meta = $dir . '/' . $slug . '.meta.json';
  $m = file_exists($meta) ? (json_decode(file_get_contents($meta), true) ?: []) : [];
  return [
    'slug'     => $slug,
    'titulo'   => $m['titulo'] ?? ucfirst(str_replace('-', ' ', $slug)),
    'resumen'  => $m['resumen'] ?? '',
    'orden'    => $m['orden'] ?? 99,
    'publicado'=> $m['publicado'] ?? true,
    'contenido'=> file_get_contents($f),
    'updated_at' => gmdate('c', filemtime($f)),
  ];
}
function paginas_save(string $slug, array $data): bool {
  $dir = paginas_dir();
  if (!is_dir($dir)) @mkdir($dir, 0755, true);
  // Validar slug
  if (!preg_match('/^[a-z0-9][a-z0-9\-_]{1,80}$/', $slug)) return false;
  $body = (string)($data['contenido'] ?? '');
  $tmp = $dir . '/' . $slug . '.md.tmp';
  $fp = fopen($tmp, 'w');
  if (!$fp) return false;
  flock($fp, LOCK_EX);
  fwrite($fp, $body);
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  if (!rename($tmp, $dir . '/' . $slug . '.md')) return false;
  // Guardar meta
  $meta = [
    'titulo'    => substr((string)($data['titulo'] ?? ''), 0, 200),
    'resumen'   => substr((string)($data['resumen'] ?? ''), 0, 400),
    'orden'     => (int)($data['orden'] ?? 99),
    'publicado' => (bool)($data['publicado'] ?? true),
    'updated_at' => gmdate('c'),
  ];
  file_put_contents($dir . '/' . $slug . '.meta.json',
    json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
  return true;
}
function paginas_delete(string $slug): bool {
  // Mismo criterio que paginas_save: sin esta validación, un slug con '../'
  // permite borrar archivos .md fuera del directorio de páginas.
  if (!preg_match('/^[a-z0-9][a-z0-9\-_]{1,80}$/', $slug)) return false;
  $dir = paginas_dir();
  @unlink($dir . '/' . $slug . '.md');
  @unlink($dir . '/' . $slug . '.meta.json');
  return true;
}

// ─── Router ────────────────────────────────────────────────────────────────

try {
  switch ($action) {

    // ─────────────── LIST ───────────────
    case 'list': {
      $recurso = $_GET['recurso'] ?? '';
      if (array_key_exists($recurso, RECURSOS_JSON)) {
        ok([$recurso => recurso_read($recurso)]);
        break;
      }
      if (in_array($recurso, RECURSOS_DATA, true)) {
        $data = data_read($recurso);
        if (!$data) fail("Recurso $recurso no inicializado en data/. Sube contenido primero.");
        ok([$recurso => $data]);
        break;
      }
      if ($recurso === 'paginas') {
        ok(['paginas' => paginas_read()]);
        break;
      }
      fail('recurso no válido.');
    }

    // ─────────────── CREATE ───────────────
    case 'create': {
      $recurso = $_POST['recurso'] ?? $_GET['recurso'] ?? '';
      $in = input();
      if (array_key_exists($recurso, RECURSOS_JSON)) {
        $arr = recurso_read($recurso);
        if (!isset($in['id'])) fail('id requerido.');
        // Evitar duplicados
        foreach ($arr as $item) {
          if (($item['id'] ?? '') === $in['id']) fail('id duplicado.', 409);
        }
        $in['created_at'] = $in['created_at'] ?? gmdate('c');
        $arr[] = $in;
        recurso_write($recurso, $arr);
        ok(['id' => $in['id']]);
        break;
      }
      if (in_array($recurso, RECURSOS_DATA, true)) {
        $arr = data_read($recurso) ?? [];
        if (!isset($in['id'])) fail('id requerido.');
        foreach ($arr as $item) {
          if (($item['id'] ?? '') === $in['id']) fail('id duplicado.', 409);
        }
        $arr[] = $in;
        data_write($recurso, $arr);
        ok(['id' => $in['id']]);
        break;
      }
      if ($recurso === 'paginas') {
        $slug = $in['slug'] ?? '';
        if (!preg_match('/^[a-z0-9][a-z0-9\-_]{1,80}$/', $slug)) fail('slug inválido.', 422);
        if (file_exists(paginas_dir() . '/' . $slug . '.md')) fail('slug ya existe.', 409);
        if (!paginas_save($slug, $in)) fail('Error guardando página.');
        ok(['slug' => $slug]);
        break;
      }
      fail('recurso no válido.');
    }

    // ─────────────── UPDATE ───────────────
    case 'update': {
      $recurso = $_POST['recurso'] ?? $_GET['recurso'] ?? '';
      $id = $_POST['id'] ?? $_GET['id'] ?? '';
      if (!$id) fail('id requerido.');
      $in = input();

      if (array_key_exists($recurso, RECURSOS_JSON)) {
        $arr = recurso_read($recurso);
        $found = false;
        foreach ($arr as &$item) {
          if (($item['id'] ?? '') === $id) {
            $item = array_merge($item, $in);
            $item['updated_at'] = gmdate('c');
            $found = true;
            break;
          }
        }
        unset($item);
        if (!$found) fail('id no encontrado.', 404);
        recurso_write($recurso, $arr);
        ok(['id' => $id]);
        break;
      }
      if (in_array($recurso, RECURSOS_DATA, true)) {
        $arr = data_read($recurso) ?? [];
        $found = false;
        foreach ($arr as &$item) {
          if (($item['id'] ?? '') === $id) {
            $item = array_merge($item, $in);
            $found = true;
            break;
          }
        }
        unset($item);
        if (!$found) fail('id no encontrado.', 404);
        data_write($recurso, $arr);
        ok(['id' => $id]);
        break;
      }
      if ($recurso === 'paginas') {
        if (!paginas_save($id, $in)) fail('Error guardando página.');
        ok(['slug' => $id]);
        break;
      }
      fail('recurso no válido.');
    }

    // ─────────────── DELETE ───────────────
    case 'delete': {
      $recurso = $_POST['recurso'] ?? $_GET['recurso'] ?? '';
      $id = $_POST['id'] ?? $_GET['id'] ?? '';
      if (!$id) fail('id requerido.');

      if (array_key_exists($recurso, RECURSOS_JSON)) {
        $arr = recurso_read($recurso);
        $before = count($arr);
        // Los pedidos no llevan campo `id`: se identifican por `nro`. Filtrar
        // solo por `id` hacía que la administración nunca pudiera retirar un
        // pedido — ni siquiera uno de prueba. Se acepta cualquiera de los dos.
        $arr = array_values(array_filter($arr, function ($i) use ($id) {
          if ((string)($i['id'] ?? '') === (string)$id) return false;
          if (isset($i['nro']) && (string)$i['nro'] === (string)$id) return false;
          return true;
        }));
        if (count($arr) === $before) fail('id no encontrado.', 404);
        recurso_write($recurso, $arr);
        ok(['deleted' => $id]);
        break;
      }
      if (in_array($recurso, RECURSOS_DATA, true)) {
        $arr = data_read($recurso) ?? [];
        $before = count($arr);
        $arr = array_values(array_filter($arr, fn($i) => ($i['id'] ?? '') !== $id));
        if (count($arr) === $before) fail('id no encontrado.', 404);
        data_write($recurso, $arr);
        ok(['deleted' => $id]);
        break;
      }
      if ($recurso === 'paginas') {
        if (!paginas_delete($id)) fail('Identificador de página no válido.', 422);
        ok(['deleted' => $id]);
        break;
      }
      fail('recurso no válido.');
    }

    // ─────────────── RESET USER ───────────────
    case 'reset_user': {
      $id = $_GET['id'] ?? $_POST['id'] ?? '';
      if (!$id) fail('id requerido.');

      $report = ['pedidos_removed' => 0, 'lotes_removed' => 0, 'ratings_removed' => 0, 'chats_removed' => 0];

      // Pedidos donde el usuario es origen o solicitante
      $pedidos = recurso_read('pedidos');
      $before = count($pedidos);
      $pedidos = array_values(array_filter($pedidos,
        fn($p) => ($p['origen_id'] ?? '') !== $id && ($p['solicitante_id'] ?? '') !== $id));
      $report['pedidos_removed'] = $before - count($pedidos);
      recurso_write('pedidos', $pedidos);

      // Lotes publicados por el usuario
      $lotes = recurso_read('lotes');
      $before = count($lotes);
      $lotes = array_values(array_filter($lotes,
        fn($l) => ($l['productor_id'] ?? '') !== $id && ($l['published_by'] ?? '') !== $id));
      $report['lotes_removed'] = $before - count($lotes);
      recurso_write('lotes', $lotes);

      // Ratings donde el usuario es rated_id o autor
      $ratings = recurso_read('ratings');
      $before = count($ratings);
      $ratings = array_values(array_filter($ratings,
        fn($r) => ($r['rated_id'] ?? '') !== $id && ($r['rated_by'] ?? '') !== $id));
      $report['ratings_removed'] = $before - count($ratings);
      recurso_write('ratings', $ratings);

      // Chats del usuario
      $chats = recurso_read('chats');
      $before = count($chats);
      $chats = array_values(array_filter($chats,
        fn($c) => !in_array($id, (array)($c['participants'] ?? []), true)));
      $report['chats_removed'] = $before - count($chats);
      recurso_write('chats', $chats);

      // Marcar miembro como inactivo (no borrar)
      $members = recurso_read('members');
      foreach ($members as &$m) {
        if (($m['id'] ?? '') === $id) {
          $m['activo'] = false;
          $m['reset_at'] = gmdate('c');
          break;
        }
      }
      unset($m);
      recurso_write('members', $members);

      ok(['user_id' => $id, 'report' => $report]);
      break;
    }

    // ─────────────── RESET PLATFORM (peligroso) ───────────────
    case 'reset_platform': {
      /* Esta acción vaciaba TODOS los catálogos con solo ?confirm=yes, y entre
         ellos van `members` y `lotes`. Con 32 personas registradas y lotes de
         productores reales, una URL escrita por error borraba el trabajo de
         gente de verdad. En este proyecto ya ocurrió una pérdida así.

         Ahora rige la misma idea que el guardián de semilla: los datos de
         PERSONAS no se tocan nunca, y un catálogo con algún registro real
         —cualquiera sin la marca `ejemplo`— se salta y se informa. Sigue
         sirviendo para dejar limpia una instalación nueva, que es para lo que
         se hizo. */
      if (($_GET['confirm'] ?? '') !== 'yes') {
        fail('Debes confirmar con ?confirm=yes');
      }

      // Nunca, bajo ninguna confirmación.
      $intocables = ['members', 'consents', 'waitlist', 'chats', 'pedidos'];

      $total = [];
      $protegidos = [];
      foreach (RECURSOS_JSON as $name => $cfg) {
        if (in_array($name, $intocables, true)) { $protegidos[] = $name; continue; }
        $f = DATA_DIR . '/' . $cfg['file'];
        if (!file_exists($f)) continue;

        $actual = json_decode((string)file_get_contents($f), true);
        $tieneReales = false;
        if (is_array($actual)) {
          foreach ($actual as $reg) {
            if (is_array($reg) && empty($reg['ejemplo']) && empty($reg['demo'])) { $tieneReales = true; break; }
          }
        }
        if ($tieneReales) { $protegidos[] = $name; continue; }

        @copy($f, $f . '.bak-' . gmdate('Ymd-His'));
        file_put_contents($f, json_encode([], JSON_UNESCAPED_UNICODE));
        $total[] = $name;
      }
      ok([
        'reset' => $total,
        'count' => count($total),
        'protegidos' => $protegidos,
        'nota' => 'Los datos de personas y los catálogos con registros reales no se vacían.',
      ]);
      break;
    }

    // ─────────────── EXPORT ───────────────
    case 'export': {
      $tipo = $_GET['tipo'] ?? '';
      $pretty = (bool)($_GET['pretty'] ?? true);
      if (array_key_exists($tipo, RECURSOS_JSON)) {
        $data = recurso_read($tipo);
        $out = $pretty ? json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
                       : json_encode($data, JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json; charset=utf-8');
        header("Content-Disposition: attachment; filename=\"$tipo-" . gmdate('Ymd-His') . ".json\"");
        echo $out;
        exit;
      }
      if (in_array($tipo, RECURSOS_DATA, true)) {
        $data = data_read($tipo) ?? [];
        $out = $pretty ? json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
                       : json_encode($data, JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json; charset=utf-8');
        header("Content-Disposition: attachment; filename=\"$tipo-" . gmdate('Ymd-His') . ".json\"");
        echo $out;
        exit;
      }
      fail('tipo no válido.');
    }

    // ─────────────── STATS GLOBAL ───────────────
    case 'stats_global': {
      $counts = [];
      foreach (RECURSOS_JSON as $name => $cfg) {
        $counts[$name] = count(recurso_read($name));
      }
      $cursosData = data_read('cursos');
      $planesData = data_read('planes');
      $counts['cursos'] = is_array($cursosData) ? count($cursosData) : 0;
      $counts['planes'] = is_array($planesData) ? count($planesData) : 0;
      $counts['paginas'] = count(paginas_read());

      // Stats globales: miembros por rol
      $members = recurso_read('members');
      $byRol = [];
      foreach ($members as $m) {
        $r = $m['rol'] ?? 'sin_rol';
        $byRol[$r] = ($byRol[$r] ?? 0) + 1;
      }
      $counts['miembros_por_rol'] = $byRol;

      // Pedidos por estado
      $pedidos = recurso_read('pedidos');
      $byEstado = [];
      foreach ($pedidos as $p) {
        $e = $p['estado'] ?? 'sin_estado';
        $byEstado[$e] = ($byEstado[$e] ?? 0) + 1;
      }
      $counts['pedidos_por_estado'] = $byEstado;

      // Ingresos totales
      $ingresos = 0;
      foreach ($pedidos as $p) {
        if (($p['estado'] ?? '') === 'Entregado') $ingresos += (float)($p['total'] ?? 0);
      }
      $counts['ingresos_totales'] = $ingresos;

      ok($counts);
      break;
    }

    default:
      fail('Acción no válida.');
  }
} catch (Throwable $e) {
  fail('Error interno: ' . $e->getMessage(), 500);
}
