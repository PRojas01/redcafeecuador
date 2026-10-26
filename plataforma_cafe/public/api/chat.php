<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

$action = $_GET['action'] ?? '';
$u = null;
$in = input();

const ADMIN_CHAT_ID = 'redcafe_admin';
const ADMIN_CHAT_NAME = 'Admin Red Café Ecuador';

// Room ID determinístico: orden lexicográfico de los dos IDs
function room_id(string $a, string $b): string {
  $x = [$a, $b]; sort($x, SORT_STRING);
  return 'r_' . substr(sha1(implode('|', $x)), 0, 16);
}

function chat_current_actor(): ?array {
  $u = current_user();
  if ($u) return $u;
  if (!empty($_SESSION['admin'])) {
    return [
      'id' => ADMIN_CHAT_ID,
      'nombre' => ADMIN_CHAT_NAME,
      'rol' => 'admin',
      'roles' => ['admin'],
    ];
  }
  return null;
}

function chat_relacion_comercial(string $a, string $b): ?array {
  if ($a === ADMIN_CHAT_ID || $b === ADMIN_CHAT_ID) {
    return ['tipo' => 'soporte', 'ref' => 'Admin', 'estado' => 'activo'];
  }

  $pedidos = load_json('pedidos', []);
  foreach ($pedidos as $p) {
    $solicitante = (string)($p['solicitante_id'] ?? '');
    $productor = (string)($p['productor_id'] ?? '');
    if ($productor !== '' && (($solicitante === $a && $productor === $b) || ($solicitante === $b && $productor === $a))) {
      return ['tipo' => 'pedido', 'ref' => '#' . (string)($p['nro'] ?? ''), 'estado' => (string)($p['estado'] ?? '')];
    }
  }

  $cotizaciones = load_json('cotizaciones', []);
  foreach ($cotizaciones as $c) {
    $solicitante = (string)($c['solicitante_id'] ?? '');
    $destinatario = (string)($c['destinatario_id'] ?? '');
    if (($solicitante === $a && $destinatario === $b) || ($solicitante === $b && $destinatario === $a)) {
      return ['tipo' => 'cotizacion', 'ref' => '#' . (string)($c['nro'] ?? ''), 'estado' => (string)($c['estado'] ?? '')];
    }
  }

  return null;
}

function chat_member_brief(array $m, array $relacion): array {
  return [
    'id' => $m['id'] ?? '',
    'nombre' => $m['nombre'] ?? '',
    'rol' => $m['rol'] ?? '',
    'roles' => miembro_roles($m),
    'relacion' => $relacion,
  ];
}

function chat_admin_brief(): array {
  return [
    'id' => ADMIN_CHAT_ID,
    'nombre' => ADMIN_CHAT_NAME,
    'rol' => 'admin',
    'roles' => ['admin'],
    'relacion' => ['tipo' => 'soporte', 'ref' => 'Admin', 'estado' => 'activo'],
  ];
}

$u = chat_current_actor();

if ($action === 'rooms') {
  if (!$u) fail('No autenticado.', 401);
  $chats = load_json('chats', []);
  $mine = array_values(array_filter($chats, fn($c) => in_array($u['id'], $c['users'] ?? [], true)));
  // calcular último mensaje y no leídos por room
  $msgs = load_json('messages', []);
  $out = [];
  foreach ($mine as $c) {
    $rid = $c['id'];
    $others = array_values(array_diff($c['users'], [$u['id']]));
    $relacion = isset($others[0]) ? chat_relacion_comercial($u['id'], (string)$others[0]) : null;
    if (!$relacion) continue;
    $roomMsgs = array_values(array_filter($msgs, fn($m) => ($m['room'] ?? '') === $rid));
    usort($roomMsgs, fn($a, $b) => strcmp($a['ts'] ?? '', $b['ts'] ?? ''));
    $last = end($roomMsgs) ?: null;
    $unread = 0;
    foreach ($roomMsgs as $m) {
      if (($m['from'] ?? '') !== $u['id'] && empty($m['read_by'][$u['id']] ?? false)) $unread++;
    }
    $out[] = [
      'id' => $rid,
      'users' => $c['users'],
      'with' => $others[0] ?? '',
      'relacion' => $relacion,
      'last' => $last,
      'unread' => $unread,
    ];
  }
  usort($out, function($a, $b) {
    return strcmp($b['last']['ts'] ?? '', $a['last']['ts'] ?? '');
  });
  ok(['rooms' => $out]);
}

if ($action === 'contacts') {
  if (!$u) fail('No autenticado.', 401);
  $members = load_json('members', []);
  $out = [];
  if (($u['id'] ?? '') !== ADMIN_CHAT_ID) {
    $out[] = chat_admin_brief();
  }
  foreach ($members as $m) {
    $id = (string)($m['id'] ?? '');
    if ($id === '' || $id === $u['id']) continue;
    if (($m['estado'] ?? 'activo') === 'inactivo' || ($m['activo'] ?? true) === false) continue;
    if (($u['id'] ?? '') === ADMIN_CHAT_ID) {
      $out[] = chat_member_brief($m, ['tipo' => 'soporte', 'ref' => 'Admin', 'estado' => 'activo']);
      continue;
    }
    $relacion = chat_relacion_comercial($u['id'], $id);
    if ($relacion) $out[] = chat_member_brief($m, $relacion);
  }
  usort($out, fn($a, $b) => strcmp($a['nombre'] ?? '', $b['nombre'] ?? ''));
  ok(['members' => $out]);
}

if ($action === 'open') {
  if (!$u) fail('No autenticado.', 401);
  $other = trim($in['user'] ?? '');
  if (!$other) fail('Falta user.', 422);
  if ($other === $u['id']) fail('No puedes abrir un chat contigo mismo.', 422);

  $members = load_json('members', []);
  $otherExists = ($other === ADMIN_CHAT_ID);
  foreach ($members as $m) {
    if (($m['id'] ?? '') === $other && ($m['estado'] ?? 'activo') !== 'inactivo') {
      $otherExists = true;
      break;
    }
  }
  if (!$otherExists) fail('Miembro no encontrado.', 404);
  $relacion = chat_relacion_comercial($u['id'], $other);
  if (!$relacion) {
    fail('Para abrir un chat debe existir antes un pedido o una cotización entre los miembros.', 403);
  }

  $rid = room_id($u['id'], $other);
  $chats = load_json('chats', []);
  $exists = false;
  foreach ($chats as $c) if (($c['id'] ?? '') === $rid) $exists = true;
  if (!$exists) {
    $chats[] = ['id' => $rid, 'users' => [$u['id'], $other], 'relacion' => $relacion, 'created_at' => now_iso()];
    save_json('chats', $chats);
  }
  ok(['room' => $rid]);
}

if ($action === 'messages') {
  if (!$u) fail('No autenticado.', 401);
  $rid = $_GET['room'] ?? '';
  $since = $_GET['since'] ?? '';
  if (!$rid) fail('Falta room.', 422);
  $chats = load_json('chats', []);
  $allowed = false;
  foreach ($chats as $c) {
    if ($c['id'] === $rid && in_array($u['id'], $c['users'], true)) {
      $others = array_values(array_diff($c['users'], [$u['id']]));
      $allowed = isset($others[0]) && chat_relacion_comercial($u['id'], (string)$others[0]) !== null;
    }
  }
  if (!$allowed) fail('Sin acceso al chat.', 403);
  $msgs = load_json('messages', []);
  $room = array_values(array_filter($msgs, fn($m) => ($m['room'] ?? '') === $rid));
  usort($room, fn($a, $b) => strcmp($a['ts'] ?? '', $b['ts'] ?? ''));
  if ($since !== '') {
    $room = array_values(array_filter($room, fn($m) => strcmp($m['ts'] ?? '', $since) > 0));
  }
  // marcar leídos al pedir mensajes
  if (!empty($room)) {
    $changed = false;
    foreach ($msgs as &$m) {
      if (($m['room'] ?? '') === $rid && ($m['from'] ?? '') !== $u['id']) {
        if (!isset($m['read_by'])) $m['read_by'] = [];
        if (empty($m['read_by'][$u['id']])) { $m['read_by'][$u['id']] = true; $changed = true; }
      }
    }
    if ($changed) save_json('messages', $msgs);
  }
  ok(['messages' => $room]);
}

if ($action === 'send') {
  // Evita ráfagas de mensajes que molesten a otros miembros.
  if (!check_rate_limit('chat_send', 120, 3600)) {
    fail('Demasiados mensajes seguidos. Vuelve a intentarlo en una hora.', 429);
  }

  if (!$u) fail('No autenticado.', 401);
  $rid = $_GET['room'] ?? ($in['room'] ?? '');
  $text = trim($in['text'] ?? '');
  if (!$rid || $text === '') fail('Falta room o text.', 422);
  if (mb_strlen($text) > 2000) fail('Mensaje demasiado largo.', 422);
  $chats = load_json('chats', []);
  $allowed = false;
  foreach ($chats as $c) {
    if ($c['id'] === $rid && in_array($u['id'], $c['users'], true)) {
      $others = array_values(array_diff($c['users'], [$u['id']]));
      $allowed = isset($others[0]) && chat_relacion_comercial($u['id'], (string)$others[0]) !== null;
    }
  }
  if (!$allowed) fail('Sin acceso al chat.', 403);
  $msgs = load_json('messages', []);
  $m = ['id' => uid(), 'room' => $rid, 'from' => $u['id'], 'from_nombre' => $u['nombre'], 'text' => $text, 'ts' => now_iso(), 'read_by' => [$u['id'] => true]];
  $msgs[] = $m;
  save_json('messages', $msgs);

  // Un aviso por conversación y no uno por mensaje: si el destinatario ya
  // tiene un aviso sin leer de este mismo chat, no se le añade otro.
  foreach ($chats as $c) {
    if (($c['id'] ?? '') !== $rid) continue;
    foreach (($c['users'] ?? []) as $otro) {
      $otro = (string)$otro;
      if ($otro === '' || $otro === $u['id'] || $otro === ADMIN_CHAT_ID) continue;
      $yaAvisado = false;
      foreach (load_json('notificaciones', []) as $a) {
        if (($a['uid'] ?? '') === $otro && ($a['tipo'] ?? '') === 'mensaje'
            && empty($a['leido']) && ($a['enlace'] ?? '') === '/chat/') {
          $yaAvisado = true; break;
        }
      }
      if (!$yaAvisado) {
        notificar($otro, 'mensaje', 'Tienes un mensaje de ' . (string)($u['nombre'] ?? 'un miembro'),
          mb_substr($text, 0, 120), '/chat/');
      }
    }
  }
  ok(['message' => $m]);
}

fail('Acción no válida.', 400);
