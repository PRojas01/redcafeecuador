<?php
/**
 * Red Café Ecuador — avisos del miembro
 * ---------------------------------------------------------------------------
 * Cada miembro consulta aquí lo que ha pasado con sus pedidos, sus
 * publicaciones, sus cursos y sus conversaciones. Las APIs que provocan esos
 * hechos los registran con notificar() (api/_avisos.php); esta solo lee y
 * marca como leído.
 */

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

$action = $_GET['action'] ?? '';
$in = input();

function mis_avisos(string $uid): array {
  $todas = load_json('notificaciones', []);
  $mias = array_values(array_filter($todas, fn($a) => (string)($a['uid'] ?? '') === $uid));
  usort($mias, fn($a, $b) => strcmp((string)($b['ts'] ?? ''), (string)($a['ts'] ?? '')));
  return $mias;
}

/**
 * Listado del miembro. `solo=nuevos` devuelve únicamente lo no leído, que es
 * lo que consulta el sondeo periódico de la campana.
 */
if ($action === 'list') {
  $u = require_user();
  $uid = (string)$u['id'];
  $mias = mis_avisos($uid);
  $sinLeer = count(array_filter($mias, fn($a) => empty($a['leido'])));

  if (($_GET['solo'] ?? '') === 'nuevos') {
    $mias = array_values(array_filter($mias, fn($a) => empty($a['leido'])));
  }
  $limite = max(1, min(100, intval($_GET['limite'] ?? 30)));
  ok([
    'notificaciones' => array_slice($mias, 0, $limite),
    'sin_leer'       => $sinLeer,
  ]);
}

/** Solo el contador: es lo que pide la campana cada pocos minutos. */
if ($action === 'contador') {
  $u = current_user();
  if (!$u) ok(['sin_leer' => 0]);
  $sinLeer = 0;
  foreach (load_json('notificaciones', []) as $a) {
    if ((string)($a['uid'] ?? '') === (string)$u['id'] && empty($a['leido'])) $sinLeer++;
  }
  ok(['sin_leer' => $sinLeer]);
}

/** Marca uno (`id`) o todos (`todos: true`). Solo los propios. */
if ($action === 'leer') {
  $u = require_user();
  $uid = (string)$u['id'];
  $id = trim((string)($in['id'] ?? ($_GET['id'] ?? '')));
  $todos = filter_var($in['todos'] ?? ($_GET['todos'] ?? false), FILTER_VALIDATE_BOOLEAN);
  if ($id === '' && !$todos) fail('Indica id o todos.', 422);

  $tocados = 0;
  mutate_json('notificaciones', [], function (array $todas) use ($uid, $id, $todos, &$tocados) {
    foreach ($todas as &$a) {
      if ((string)($a['uid'] ?? '') !== $uid) continue;
      if (!$todos && (string)($a['id'] ?? '') !== $id) continue;
      if (empty($a['leido'])) { $a['leido'] = true; $a['leido_at'] = now_iso(); $tocados++; }
    }
    unset($a);
    return $todas;
  });
  ok(['marcados' => $tocados]);
}

/** Retirar un aviso propio de la bandeja. */
if ($action === 'borrar') {
  $u = require_user();
  $uid = (string)$u['id'];
  $id = trim((string)($in['id'] ?? ($_GET['id'] ?? '')));
  if ($id === '') fail('id requerido.', 422);
  $habia = false;
  mutate_json('notificaciones', [], function (array $todas) use ($uid, $id, &$habia) {
    return array_values(array_filter($todas, function ($a) use ($uid, $id, &$habia) {
      if ((string)($a['id'] ?? '') === $id && (string)($a['uid'] ?? '') === $uid) {
        $habia = true;
        return false;
      }
      return true;
    }));
  });
  if (!$habia) fail('Aviso no encontrado.', 404);
  ok(['borrado' => $id]);
}

fail('Acción no válida.', 400);
