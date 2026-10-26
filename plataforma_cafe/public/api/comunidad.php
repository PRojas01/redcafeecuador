<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_comunidad-avisos.php';

$action = $_GET['action'] ?? '';
$u = current_user();
$in = input();

function comunidad_imagenes_validas($raw): array {
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

if ($action === 'list') {
  $posts = load_json('posts', []);
  $solo = $_GET['solo'] ?? '';
  if ($solo === 'avisos') {
    $posts = array_values(array_filter($posts, fn($p) => ($p['tipo'] ?? '') === 'aviso'));
  } elseif ($solo === 'personas') {
    $posts = array_values(array_filter($posts, fn($p) => ($p['tipo'] ?? '') !== 'aviso'));
  }
  usort($posts, fn($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));

  // Si un perfil está verificado se resuelve AHORA, no cuando se escribió el
  // mensaje: guardarlo dentro del post dejaría sellos viejos en el muro
  // después de retirar una verificación. Un índice por id y una pasada.
  $verificados = [];
  foreach (load_json('members', []) as $m) {
    $verificados[(string)($m['id'] ?? '')] = !empty($m['verificado']);
  }
  $posts = array_map(function ($p) use ($verificados) {
    $p['autor_verificado'] = !empty($verificados[(string)($p['autor_id'] ?? '')]);
    if (!empty($p['comments']) && is_array($p['comments'])) {
      $p['comments'] = array_map(function ($c) use ($verificados) {
        $c['autor_verificado'] = !empty($verificados[(string)($c['autor_id'] ?? '')]);
        return $c;
      }, $p['comments']);
    }
    return $p;
  }, $posts);

  ok(['posts' => $posts]);
}

if ($action === 'create') {
  // Frena publicaciones repetidas que llenen el muro de la comunidad.
  if (!check_rate_limit('comunidad_post', 30, 3600)) {
    fail('Demasiadas publicaciones seguidas. Vuelve a intentarlo en una hora.', 429);
  }

  if (!$u) fail('No autenticado.', 401);
  $text = trim($in['text'] ?? '');
  $titulo = trim($in['titulo'] ?? '');
  if ($titulo === '' || $text === '') fail('Título y texto requeridos.', 422);
  if (mb_strlen($text) > 4000) fail('Texto demasiado largo.', 422);
  $imagenes = comunidad_imagenes_validas($in['imagenes'] ?? []);
  $posts = load_json('posts', []);
  $p = [
    'id' => uid(),
    'titulo' => $titulo,
    'text' => $text,
    'autor' => $u['nombre'],
    'autor_id' => $u['id'],
    'autor_rol' => $u['rol'],
    'created_at' => now_iso(),
    'imagenes' => $imagenes,
    'likes' => [],
    'comments' => [],
  ];
  $posts[] = $p;
  save_json('posts', $posts);
  ok(['post' => $p]);
}

if ($action === 'like') {
  if (!$u) fail('No autenticado.', 401);
  $id = $in['id'] ?? '';
  $posts = mutate_json('posts', [], function($posts) use ($id, $u) {
    foreach ($posts as &$p) {
      if (($p['id'] ?? '') === $id) {
        if (!isset($p['likes'])) $p['likes'] = [];
        $i = array_search($u['id'], $p['likes'], true);
        if ($i === false) $p['likes'][] = $u['id']; else array_splice($p['likes'], $i, 1);
      }
    }
    return $posts;
  });
  ok();
}

if ($action === 'comment') {
  // Frena comentarios repetidos sin limitar conversaciones activas normales.
  if (!check_rate_limit('comunidad_comentario', 60, 3600)) {
    fail('Demasiados comentarios seguidos. Vuelve a intentarlo en una hora.', 429);
  }

  if (!$u) fail('No autenticado.', 401);
  $id = $in['id'] ?? '';
  $text = trim($in['text'] ?? '');
  if (!$id || $text === '') fail('Falta id o text.', 422);
  $posts = mutate_json('posts', [], function($posts) use ($id, $u, $text) {
    foreach ($posts as &$p) {
      if (($p['id'] ?? '') === $id) {
        if (!isset($p['comments'])) $p['comments'] = [];
        $p['comments'][] = [
          'id' => uid(),
          'autor' => $u['nombre'],
          'autor_id' => $u['id'],
          'text' => $text,
          'created_at' => now_iso(),
        ];
      }
    }
    return $posts;
  });
  ok();
}

if ($action === 'delete') {
  if (!$u) fail('No autenticado.', 401);
  $id = $in['id'] ?? '';
  if (!$id) fail('id requerido.', 422);
  $posts = load_json('posts', []);
  $objetivo = null;
  foreach ($posts as $p) {
    if (($p['id'] ?? '') === $id) { $objetivo = $p; break; }
  }
  if (!$objetivo) fail('Post no encontrado.', 404);
  $autorizado = (($objetivo['autor_id'] ?? '') === ($u['id'] ?? '')) || !empty($_SESSION['admin']);
  if (!$autorizado) fail('No autorizado: solo el autor o un administrador puede borrar.', 403);
  $posts = array_values(array_filter($posts, fn($p) => ($p['id'] ?? '') !== $id));
  save_json('posts', $posts);
  ok();
}

fail('Acción no válida.', 400);
