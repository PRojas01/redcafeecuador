<?php
/**
 * API de Cotizaciones — Sistema de cotización gratuita entre usuarios.
 * Flujo: solicitar → enviar → aceptar/rechazar → convertir a pedido
 * Almacena en data/cotizaciones.json (whitelist en _bootstrap.php).
 */
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

$action = $_GET['action'] ?? '';
$in = input();

// ─── SOLICITAR COTIZACIÓN (comprador/vendedor/bar a productor/vendedor) ───
if ($action === 'solicitar') {
  if (!check_rate_limit('cotizacion_solicitar', 30, 3600)) {
    fail('Demasiadas solicitudes. Intenta más tarde.', 429);
  }

  $u = require_user();
  $destinatarioId = trim($in['destinatario_id'] ?? '');
  $loteId = trim($in['lote_id'] ?? '');
  $mensaje = mb_substr(trim($in['mensaje'] ?? ''), 0, 500);
  $cantidad = floatval($in['cantidad'] ?? 0);
  $unidad = trim($in['unidad'] ?? 'sacos');

  if (!$destinatarioId) fail('Falta el destinatario.', 422);

  // Verificar que el destinatario exista
  $members = load_json('members', []);
  $destinatario = null;
  foreach ($members as $m) {
    if (($m['id'] ?? '') === $destinatarioId) { $destinatario = $m; break; }
  }
  if (!$destinatario) fail('Destinatario no encontrado.', 404);

  $cotizaciones = load_json('cotizaciones', []);
  $nro = siguiente_nro($cotizaciones);
  $c = [
    'nro' => $nro,
    'solicitante_id' => $u['id'],
    'solicitante_nombre' => $u['nombre'],
    'solicitante_rol' => $u['rol'],
    'destinatario_id' => $destinatarioId,
    'destinatario_nombre' => $destinatario['nombre'] ?? '',
    'destinatario_rol' => $destinatario['rol'] ?? '',
    'lote_id' => $loteId,
    'mensaje' => $mensaje,
    'cantidad' => $cantidad > 0 ? $cantidad : null,
    'unidad' => $unidad,
    'estado' => 'solicitada', // solicitada → enviada → aceptada/rechazada
    'precio_unitario' => null,
    'precio_total' => null,
    'condiciones' => '',
    'respuesta_mensaje' => '',
    'fecha_respuesta' => null,
    'pedido_nro' => null, // se llena al convertir a pedido
    'created_at' => now_iso(),
    'updated_at' => now_iso(),
  ];
  $cotizaciones[] = $c;
  save_json('cotizaciones', $cotizaciones);

  // Notificar al destinatario por email
  @include_once __DIR__ . '/mailer.php';
  if (function_exists('mailer_send') && !empty($destinatario['email'])) {
    mailer_send('cotizacion_solicitada', $destinatario['email'], [
      'nombre' => $destinatario['nombre'],
      'solicitante' => $u['nombre'],
      'nro' => (string)$nro,
    ]);
  }

  // El correo puede no estar configurado y el miembro no se enteraría de que
  // le piden precio. El aviso interno sí llega siempre: campana y, si lo tiene
  // activado, notificación en el teléfono.
  $cuanto = $cantidad > 0 ? ' · ' . rtrim(rtrim(number_format($cantidad, 2, '.', ''), '0'), '.') . ' ' . $unidad : '';
  notificar($destinatarioId, 'pedido',
    'Te piden cotización #' . $nro . ': ' . (string)($u['nombre'] ?? 'Un miembro'),
    ($mensaje !== '' ? mb_substr($mensaje, 0, 200) : 'Sin mensaje') . $cuanto . '. Respóndela desde tu panel.',
    '/panel/');

  ok(['cotizacion' => $c]);
}

// ─── ENVIAR COTIZACIÓN (productor/vendedor responde con precio) ───
if ($action === 'enviar') {
  if (!check_rate_limit('cotizacion_enviar', 30, 3600)) {
    fail('Demasiadas solicitudes. Intenta más tarde.', 429);
  }

  $u = require_user();
  $nro = intval($in['nro'] ?? 0);
  $precioUnitario = floatval($in['precio_unitario'] ?? 0);
  $condiciones = mb_substr(trim($in['condiciones'] ?? ''), 0, 500);
  $respuestaMensaje = mb_substr(trim($in['respuesta_mensaje'] ?? ''), 0, 500);

  if (!$nro) fail('Número de cotización requerido.', 422);
  if ($precioUnitario <= 0) fail('Precio unitario requerido.', 422);

  $cotizaciones = load_json('cotizaciones', []);
  $found = false;
  $idx = -1;
  foreach ($cotizaciones as $i => $c) {
    if ((int)($c['nro'] ?? 0) === $nro) {
      $idx = $i;
      // Verificar que el destinatario sea el usuario actual
      if (($c['destinatario_id'] ?? '') !== $u['id']) {
        fail('No autorizado.', 403);
      }
      if (($c['estado'] ?? '') !== 'solicitada') {
        fail('Esta cotización ya fue respondida.', 409);
      }
      $cantidad = $c['cantidad'] ?? 0;
      $cotizaciones[$i]['precio_unitario'] = $precioUnitario;
      $cotizaciones[$i]['precio_total'] = $cantidad > 0 ? $precioUnitario * $cantidad : null;
      $cotizaciones[$i]['condiciones'] = $condiciones;
      $cotizaciones[$i]['respuesta_mensaje'] = $respuestaMensaje;
      $cotizaciones[$i]['estado'] = 'enviada';
      $cotizaciones[$i]['updated_at'] = now_iso();
      $found = true;
      break;
    }
  }
  if (!$found || $idx < 0) fail('Cotización no encontrada.', 404);
  $c = $cotizaciones[$idx];   // copia ya actualizada, utilizable más abajo

  save_json('cotizaciones', $cotizaciones);

  // Notificar al solicitante
  @include_once __DIR__ . '/mailer.php';
  if (function_exists('mailer_send')) {
    $members = load_json('members', []);
    foreach ($members as $m) {
      if (($m['id'] ?? '') === $c['solicitante_id']) {
        mailer_send('cotizacion_recibida', $m['email'], [
          'nombre' => $m['nombre'],
          'nro' => (string)$nro,
          'precio' => '$' . number_format($precioUnitario, 2),
        ]);
        break;
      }
    }
  }

  notificar((string)($c['solicitante_id'] ?? ''), 'pedido',
    'Ya tienes precio en la cotización #' . $nro,
    (string)($c['destinatario_nombre'] ?? 'El vendedor') . ' respondió: $' .
      number_format($precioUnitario, 2) . ' por ' . (string)($c['unidad'] ?? 'unidad') .
      '. Acéptala o recházala desde tu panel.',
    '/panel/');

  ok(['cotizacion' => $c]);
}

// ─── ACEPTAR COTIZACIÓN ───
if ($action === 'aceptar') {
  $u = require_user();
  $nro = intval($in['nro'] ?? 0);
  if (!$nro) fail('Número de cotización requerido.', 422);

  $cotizaciones = load_json('cotizaciones', []);
  $found = false;
  $idx = -1;
  foreach ($cotizaciones as $i => $c) {
    if ((int)($c['nro'] ?? 0) === $nro) {
      $idx = $i;
      if (($c['solicitante_id'] ?? '') !== $u['id']) {
        fail('No autorizado.', 403);
      }
      if (($c['estado'] ?? '') !== 'enviada') {
        fail('Esta cotización no está en estado para aceptar.', 409);
      }
      $cotizaciones[$i]['estado'] = 'aceptada';
      $cotizaciones[$i]['fecha_respuesta'] = now_iso();
      $cotizaciones[$i]['updated_at'] = now_iso();
      $found = true;
      break;
    }
  }
  if (!$found || $idx < 0) fail('Cotización no encontrada.', 404);
  $c = $cotizaciones[$idx];   // copia ya actualizada, utilizable más abajo

  // Crear pedido automáticamente
  $pedidos = load_json('pedidos', []);
  $pedidoNro = siguiente_nro($pedidos);
  $pedido = [
    'nro' => $pedidoNro,
    'loteId' => $c['lote_id'] ?? '',
    'finca' => '',
    'productor' => $c['destinatario_nombre'],
    'productor_id' => $c['destinatario_id'],
    'sacos' => $c['cantidad'] ?? 0,
    'total' => $c['precio_total'] ?? 0,
    'estado' => 'Solicitado',
    'fecha' => today(),
    'origenRol' => $c['solicitante_rol'] ?? 'comprador',
    'solicitante' => $c['solicitante_nombre'],
    'solicitante_id' => $c['solicitante_id'],
    'cotizacion_nro' => $nro,
    'created_at' => now_iso(),
  ];
  $pedidos[] = $pedido;
  save_json('pedidos', $pedidos);

  $cotizaciones[$idx]['pedido_nro'] = $pedidoNro;
  $c = $cotizaciones[$idx];
  save_json('cotizaciones', $cotizaciones);

  notificar((string)($c['destinatario_id'] ?? ''), 'pedido',
    'Aceptaron tu cotización #' . $nro . ' — pedido #' . $pedidoNro,
    (string)($c['solicitante_nombre'] ?? 'El comprador') . ' aceptó el precio. ' .
      'El pedido ya está en tu panel.',
    '/panel/');

  ok(['cotizacion' => $c, 'pedido' => $pedido]);
}

// ─── RECHAZAR COTIZACIÓN ───
if ($action === 'rechazar') {
  $u = require_user();
  $nro = intval($in['nro'] ?? 0);
  $motivo = mb_substr(trim($in['motivo'] ?? ''), 0, 300);
  if (!$nro) fail('Número de cotización requerido.', 422);

  $cotizaciones = load_json('cotizaciones', []);
  $found = false;
  $idx = -1;
  foreach ($cotizaciones as $i => $c) {
    if ((int)($c['nro'] ?? 0) === $nro) {
      $idx = $i;
      if (($c['solicitante_id'] ?? '') !== $u['id']) {
        fail('No autorizado.', 403);
      }
      if (($c['estado'] ?? '') !== 'enviada') {
        fail('Esta cotización no está en estado para rechazar.', 409);
      }
      $cotizaciones[$i]['estado'] = 'rechazada';
      $cotizaciones[$i]['respuesta_mensaje'] = $motivo;
      $cotizaciones[$i]['fecha_respuesta'] = now_iso();
      $cotizaciones[$i]['updated_at'] = now_iso();
      $found = true;
      break;
    }
  }
  if (!$found || $idx < 0) fail('Cotización no encontrada.', 404);
  $c = $cotizaciones[$idx];   // copia ya actualizada, utilizable más abajo

  save_json('cotizaciones', $cotizaciones);
  notificar((string)($c['destinatario_id'] ?? ''), 'pedido',
    'No aceptaron la cotización #' . $nro,
    (string)($c['solicitante_nombre'] ?? 'El comprador') . ' la rechazó' .
      ($motivo !== '' ? ': ' . $motivo : '.'),
    '/panel/');
  ok(['cotizacion' => $c]);
}

// ─── CANCELAR SOLICITUD (solicitante cancela antes de recibir respuesta) ───
if ($action === 'cancelar') {
  $u = require_user();
  $nro = intval($in['nro'] ?? 0);
  if (!$nro) fail('Número de cotización requerido.', 422);

  $cotizaciones = load_json('cotizaciones', []);
  $found = false;
  $idx = -1;
  foreach ($cotizaciones as $i => $c) {
    if ((int)($c['nro'] ?? 0) === $nro) {
      $idx = $i;
      if (($c['solicitante_id'] ?? '') !== $u['id']) {
        fail('No autorizado.', 403);
      }
      if (($c['estado'] ?? '') !== 'solicitada') {
        fail('Solo puedes cancelar solicitudes pendientes.', 409);
      }
      $cotizaciones[$i]['estado'] = 'cancelada';
      $cotizaciones[$i]['updated_at'] = now_iso();
      $found = true;
      break;
    }
  }
  if (!$found || $idx < 0) fail('Cotización no encontrada.', 404);
  $c = $cotizaciones[$idx];   // copia ya actualizada, utilizable más abajo

  save_json('cotizaciones', $cotizaciones);
  notificar((string)($c['destinatario_id'] ?? ''), 'pedido',
    'Retiraron la solicitud de cotización #' . $nro,
    (string)($c['solicitante_nombre'] ?? 'El comprador') . ' la canceló antes de que respondieras.',
    '/panel/');
  ok(['cotizacion' => $c]);
}

// ─── MIS COTIZACIONES (como solicitante) ───
if ($action === 'mis_solicitadas') {
  $u = require_user();
  $cotizaciones = load_json('cotizaciones', []);
  $mis = array_values(array_filter($cotizaciones, fn($c) => ($c['solicitante_id'] ?? '') === $u['id']));
  ok(['cotizaciones' => array_reverse($mis)]);
}

// ─── COTIZACIONES RECIBIDAS (como destinatario) ───
if ($action === 'mis_recibidas') {
  $u = require_user();
  $cotizaciones = load_json('cotizaciones', []);
  $mis = array_values(array_filter($cotizaciones, fn($c) => ($c['destinatario_id'] ?? '') === $u['id']));
  ok(['cotizaciones' => array_reverse($mis)]);
}

// ─── ESTADÍSTICAS ───
if ($action === 'estadisticas') {
  $u = require_user();
  $cotizaciones = load_json('cotizaciones', []);

  $total = count($cotizaciones);
  $solicitadas = 0;
  $enviadas = 0;
  $aceptadas = 0;
  $rechazadas = 0;
  $canceladas = 0;
  $montoTotal = 0;
  $montoAceptadas = 0;

  foreach ($cotizaciones as $c) {
    $estado = $c['estado'] ?? '';
    if ($estado === 'solicitada') $solicitadas++;
    elseif ($estado === 'enviada') $enviadas++;
    elseif ($estado === 'aceptada') { $aceptadas++; $montoAceptadas += $c['precio_total'] ?? 0; }
    elseif ($estado === 'rechazada') $rechazadas++;
    elseif ($estado === 'cancelada') $canceladas++;
    $montoTotal += $c['precio_total'] ?? 0;
  }

  // Cotizaciones del usuario
  $misSolicitadas = array_filter($cotizaciones, fn($c) => ($c['solicitante_id'] ?? '') === $u['id']);
  $misRecibidas = array_filter($cotizaciones, fn($c) => ($c['destinatario_id'] ?? '') === $u['id']);

  $tasaConversion = $total > 0 ? round(($aceptadas / $total) * 100, 1) : 0;

  ok([
    'total' => $total,
    'por_estado' => [
      'solicitada' => $solicitadas,
      'enviada' => $enviadas,
      'aceptada' => $aceptadas,
      'rechazada' => $rechazadas,
      'cancelada' => $canceladas,
    ],
    'monto_total' => $montoTotal,
    'monto_aceptadas' => $montoAceptadas,
    'tasa_conversion' => $tasaConversion,
    'mis_solicitadas' => count($misSolicitadas),
    'mis_recibidas' => count($misRecibidas),
  ]);
}

// ─── TODAS (admin) ───
if ($action === 'all') {
  require_admin();
  $cotizaciones = load_json('cotizaciones', []);
  ok(['cotizaciones' => array_reverse($cotizaciones)]);
}

fail('Acción no válida.', 400);
