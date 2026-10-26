<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_comunidad-avisos.php';

const COMUNIDAD_LIMITE_POR_DEFECTO = 300;
const COMUNIDAD_LIMITE_MAX = 500;

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
  // Publicaciones de cuentas suspendidas, bloqueadas o cerradas: fuera.
  $posts = array_values(array_filter($posts, 'publicacion_visible'));
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

  /* El muro se entregaba entero. Con 94 entradas son 38 KB en cada visita; con
     500 sería medio mega, y crece solo (cada alta y cada lote publican una).
     Se pone techo. Hoy no cambia nada —el tope por defecto está muy por encima
     de lo que hay—, pero ya no puede crecer sin freno, y quien quiera paginar
     de verdad tiene `desde` y `limite`. */
  $total = count($posts);
  $desde = max(0, (int)($_GET['desde'] ?? 0));
  $limite = (int)($_GET['limite'] ?? COMUNIDAD_LIMITE_POR_DEFECTO);
  $limite = max(1, min($limite, COMUNIDAD_LIMITE_MAX));
  $posts = array_slice($posts, $desde, $limite);

  ok([
    'posts'  => $posts,
    'total'  => $total,
    'desde'  => $desde,
    'limite' => $limite,
    'hay_mas' => ($desde + count($posts)) < $total,
  ]);
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

/**
 * Borrar un comentario. Puede hacerlo quien lo escribió, quien publicó la
 * entrada (su conversación) o la administración. Antes no había forma: un
 * comentario equivocado quedaba para siempre.
 */
if ($action === 'comment_delete') {
  if (!$u && empty($_SESSION['admin'])) fail('No autenticado.', 401);
  $esAdmin = !empty($_SESSION['admin']) || ($u && miembro_tiene_rol($u, 'admin'));
  $uid = (string)($u['id'] ?? '');
  $id = trim((string)($in['id'] ?? ''));
  $cid = trim((string)($in['comment_id'] ?? ''));
  if ($id === '' || $cid === '') fail('Falta id o comment_id.', 422);
  $resultado = 'no-encontrado';
  mutate_json('posts', [], function ($posts) use ($id, $cid, $uid, $esAdmin, &$resultado) {
    foreach ($posts as &$p) {
      if (($p['id'] ?? '') !== $id) continue;
      foreach (($p['comments'] ?? []) as $i => $c) {
        if (($c['id'] ?? '') !== $cid) continue;
        $puede = $esAdmin || ($uid !== '' && (($c['autor_id'] ?? '') === $uid || ($p['autor_id'] ?? '') === $uid));
        if (!$puede) { $resultado = 'no-autorizado'; return $posts; }
        array_splice($p['comments'], $i, 1);
        $resultado = 'ok';
        return $posts;
      }
    }
    return $posts;
  });
  if ($resultado === 'no-autorizado') fail('Solo quien lo escribió, quien publicó la entrada o la administración puede borrarlo.', 403);
  if ($resultado !== 'ok') fail('Comentario no encontrado.', 404);
  ok();
}

/**
 * Corregir lo publicado. Antes solo se podía borrar y volver a escribir, y con
 * ello se perdían los comentarios y los «me gusta» de los demás. Se guarda la
 * marca de editado: quien lee tiene derecho a saber que el texto cambió
 * después de que otros respondieran.
 */
if ($action === 'update') {
  if (!$u && empty($_SESSION['admin'])) fail('No autenticado.', 401);
  if (!$u) $u = ['id' => 'admin', 'nombre' => 'Administración', 'rol' => 'admin'];
  $id = trim((string)($in['id'] ?? ''));
  if ($id === '') fail('id requerido.', 422);
  $titulo = trim((string)($in['titulo'] ?? ''));
  $text = trim((string)($in['text'] ?? ''));
  if ($titulo === '' || $text === '') fail('Título y texto requeridos.', 422);
  if (mb_strlen($text) > 4000) fail('Texto demasiado largo.', 422);

  $actual = null;
  foreach (load_json('posts', []) as $p) {
    if (($p['id'] ?? '') === $id) { $actual = $p; break; }
  }
  if (!$actual) fail('Publicación no encontrada.', 404);
  if (!empty($actual['tipo']) && $actual['tipo'] === 'aviso') {
    fail('Las novedades automáticas de la Red no se editan.', 422);
  }
  $autorizado = (($actual['autor_id'] ?? '') === ($u['id'] ?? '')) || !empty($_SESSION['admin']);
  if (!$autorizado) fail('No autorizado: solo el autor o un administrador puede editar.', 403);

  $imagenes = array_key_exists('imagenes', $in)
    ? comunidad_imagenes_validas($in['imagenes'])
    : ($actual['imagenes'] ?? []);

  $guardado = null;
  mutate_json('posts', [], function (array $posts) use ($id, $titulo, $text, $imagenes, $u, &$guardado) {
    foreach ($posts as &$p) {
      if (($p['id'] ?? '') !== $id) continue;
      $p['titulo'] = $titulo;
      $p['text'] = $text;
      $p['imagenes'] = $imagenes;
      $p['editado_at'] = now_iso();
      $p['editado_por'] = (string)($u['id'] ?? '');
      $guardado = $p;
    }
    unset($p);
    return $posts;
  });
  if (!$guardado) fail('No se pudo guardar el cambio.', 500);
  ok(['post' => $guardado]);
}

if ($action === 'delete') {
  if (!$u && empty($_SESSION['admin'])) fail('No autenticado.', 401);
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
