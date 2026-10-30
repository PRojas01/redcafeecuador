<?php
declare(strict_types=1);

/**
 * Bandeja del miembro — mensajes y solicitudes de pedido en un mismo sitio.
 * ---------------------------------------------------------------------------
 * Lo que había estaba repartido: las conversaciones en /chat/, los pedidos en
 * una sección del panel, los avisos en la campana y el historial en otra
 * sección. Cuatro sitios para atender dos cosas que en la práctica son la
 * misma: alguien me está escribiendo y alguien me está pidiendo café.
 *
 * Esto los reúne, y sobre todo separa lo que ESPERA UNA RESPUESTA MÍA de lo
 * que solo es historial. Un pedido que yo hice y sigue «Solicitado» no me pide
 * nada: espera al vendedor. El mismo pedido, visto por el vendedor, sí.
 *
 * No duplica nada. Lee los mismos archivos que chat.php y pedidos.php; para
 * abrir un hilo o contestar se sigue usando chat.php, que es donde viven esas
 * reglas. Aquí solo se resume, se ordena y se decide qué está pendiente.
 *
 *   ?action=resumen   → la bandeja completa
 *   ?action=contador  → solo los números, para la insignia
 */

require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';

/** Mismo identificador de administración que usa chat.php. */
const BANDEJA_ADMIN_ID = 'redcafe_admin';

/**
 * ¿Pueden hablar estas dos personas?
 *
 * Se replica la regla de chat.php a propósito: si la bandeja listara una
 * conversación que luego chat.php se niega a abrir, el miembro vería un hilo
 * que no puede leer. Cualquier cambio allí hay que traerlo aquí.
 */
function bandeja_hay_relacion(string $a, string $b): ?array {
  if ($a === BANDEJA_ADMIN_ID || $b === BANDEJA_ADMIN_ID) {
    return ['tipo' => 'soporte', 'ref' => 'Administración'];
  }
  foreach (load_json('pedidos', []) as $p) {
    $sol = (string)($p['solicitante_id'] ?? '');
    // La contraparte de un pedido de café es `productor_id`; la de un pedido de
    // SERVICIO es `proveedor_id`. Mirar solo el primero dejaba a quien contrata
    // un servicio sin poder conversar con quien se lo presta, aunque el pedido
    // sí le apareciera en la bandeja.
    foreach ([(string)($p['productor_id'] ?? ''), (string)($p['proveedor_id'] ?? '')] as $otro) {
      if ($otro === '') continue;
      if (($sol === $a && $otro === $b) || ($sol === $b && $otro === $a)) {
        return ['tipo' => 'pedido', 'ref' => '#' . (string)($p['nro'] ?? '')];
      }
    }
  }
  foreach (load_json('cotizaciones', []) as $c) {
    $sol = (string)($c['solicitante_id'] ?? '');
    $des = (string)($c['destinatario_id'] ?? '');
    if (($sol === $a && $des === $b) || ($sol === $b && $des === $a)) {
      return ['tipo' => 'cotizacion', 'ref' => '#' . (string)($c['nro'] ?? '')];
    }
  }
  return null;
}

function bandeja_nombre(string $id, array $members): string {
  if ($id === BANDEJA_ADMIN_ID) return 'Administración de Red Café';
  foreach ($members as $m) {
    if ((string)($m['id'] ?? '') === $id) return (string)($m['nombre'] ?? 'Miembro de la Red');
  }
  return 'Miembro de la Red';
}

/**
 * Estados en los que un pedido todavía espera algo de alguien.
 *
 * Tienen que ser los que api/pedidos.php escribe DE VERDAD. La primera versión
 * de esta lista los inventó —«En proceso», «Confirmado», «Enviado»— y ninguno
 * existe: el flujo real es Solicitado → Aceptado → En camino → Entregado, más
 * Cancelado. Con la lista inventada, un pedido aceptado o en camino salía como
 * cerrado en la bandeja.
 */
const BANDEJA_ESTADOS_ABIERTOS = ['Solicitado', 'Aceptado', 'En camino'];

/**
 * Conversaciones del miembro, con el último mensaje y cuántos no ha leído.
 */
function bandeja_conversaciones(array $u): array {
  $yo = (string)($u['id'] ?? '');
  $chats = load_json('chats', []);
  $mensajes = load_json('messages', []);
  $members = load_json('members', []);

  $porSala = [];
  foreach ($mensajes as $m) {
    $porSala[(string)($m['room'] ?? '')][] = $m;
  }

  $out = [];
  foreach ($chats as $c) {
    if (!in_array($yo, (array)($c['users'] ?? []), true)) continue;
    $sala = (string)($c['id'] ?? '');
    $otros = array_values(array_diff((array)($c['users'] ?? []), [$yo]));
    $otro = (string)($otros[0] ?? '');
    if ($otro === '') continue;

    $relacion = bandeja_hay_relacion($yo, $otro);
    if (!$relacion) continue;

    $msgs = $porSala[$sala] ?? [];
    usort($msgs, fn($a, $b) => strcmp((string)($a['ts'] ?? ''), (string)($b['ts'] ?? '')));
    $ultimo = $msgs ? end($msgs) : null;

    $sinLeer = 0;
    foreach ($msgs as $m) {
      if ((string)($m['from'] ?? '') === $yo) continue;
      if (empty($m['read_by'][$yo] ?? false)) $sinLeer++;
    }

    $out[] = [
      'clase'      => 'mensaje',
      'id'         => $sala,
      'con'        => bandeja_nombre($otro, $members),
      'con_id'     => $otro,
      'relacion'   => $relacion,
      'ultimo'     => $ultimo ? mb_substr((string)($ultimo['text'] ?? ''), 0, 160) : '',
      'ultimo_mio' => $ultimo ? ((string)($ultimo['from'] ?? '') === $yo) : false,
      'fecha'      => $ultimo['ts'] ?? ($c['created_at'] ?? ''),
      'sin_leer'   => $sinLeer,
      // Espera respuesta mía si hay algo sin leer.
      'pendiente'  => $sinLeer > 0,
    ];
  }
  return $out;
}

/**
 * Pedidos y solicitudes en los que participa el miembro.
 *
 * `pendiente` no es «está abierto»: es «me toca a mí». A quien vende, un
 * pedido recién llegado le pide una respuesta; a quien lo hizo, no.
 */
function bandeja_pedidos(array $u): array {
  $yo = (string)($u['id'] ?? '');
  $out = [];
  foreach (load_json('pedidos', []) as $p) {
    $solicitante = (string)($p['solicitante_id'] ?? '');
    $vendedor    = (string)($p['productor_id'] ?? $p['proveedor_id'] ?? '');
    if ($solicitante !== $yo && $vendedor !== $yo) continue;

    $estado = (string)($p['estado'] ?? 'Solicitado');
    $soyVendedor = ($vendedor === $yo);
    $abierto = in_array($estado, BANDEJA_ESTADOS_ABIERTOS, true);

    $out[] = [
      'clase'       => 'pedido',
      'id'          => (string)($p['nro'] ?? ''),
      'titulo'      => (string)($p['servicio'] ?? $p['finca'] ?? 'Pedido'),
      'contraparte' => $soyVendedor
        ? (string)($p['solicitante'] ?? 'Un miembro')
        : (string)($p['productor'] ?? $p['proveedor'] ?? 'Red Café Ecuador'),
      'papel'       => $soyVendedor ? 'recibido' : 'enviado',
      'estado'      => $estado,
      'total'       => $p['total'] ?? null,
      'fecha'       => (string)($p['created_at'] ?? $p['fecha'] ?? ''),
      'pendiente'   => $soyVendedor && $estado === 'Solicitado',
      'abierto'     => $abierto,
    ];
  }
  return $out;
}

function bandeja_ordenar(array $items): array {
  usort($items, function ($a, $b) {
    // Lo que espera respuesta va primero; dentro de cada grupo, lo más reciente.
    if ($a['pendiente'] !== $b['pendiente']) return $a['pendiente'] ? -1 : 1;
    return strcmp((string)($b['fecha'] ?? ''), (string)($a['fecha'] ?? ''));
  });
  return $items;
}

if ($action === 'resumen' || $action === 'contador') {
  $u = require_user();

  $conversaciones = bandeja_conversaciones($u);
  $pedidos = bandeja_pedidos($u);

  $sinLeer = array_sum(array_column($conversaciones, 'sin_leer'));
  $porResponder = count(array_filter($pedidos, fn($p) => $p['pendiente']));

  if ($action === 'contador') {
    ok([
      'sin_leer'     => $sinLeer,
      'por_responder'=> $porResponder,
      'total'        => $sinLeer + $porResponder,
    ]);
  }

  ok([
    'items'         => bandeja_ordenar(array_merge($conversaciones, $pedidos)),
    'sin_leer'      => $sinLeer,
    'por_responder' => $porResponder,
    'total'         => $sinLeer + $porResponder,
  ]);
}

fail('Acción no válida.', 400);
