<?php
/**
 * API de Servicios — Órdenes de servicios de pago.
 * Endpoints: list, solicitar, confirm_paypal, mis_ordenes, marcar_pagado, marcar_completado.
 * Almacena en data/ordenes.json (whitelist en _bootstrap.php).
 */
require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';
$in = input();

// --- Helpers PayPal ---
function paypal_env(string $key, string $default = ''): string {
  return getenv($key) !== false ? getenv($key) : $default;
}

function paypal_credentials(): ?array {
  $clientId = paypal_env('PAYPAL_CLIENT_ID');
  $secret   = paypal_env('PAYPAL_CLIENT_SECRET');
  $mode     = paypal_env('PAYPAL_MODE', 'live'); // 'live' o 'sandbox'
  if (!$clientId || !$secret) return null;
  $base = $mode === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api.paypal.com';
  return ['client_id' => $clientId, 'secret' => $secret, 'base' => $base];
}

function paypal_get_token(array $creds): ?string {
  $ch = curl_init($creds['base'] . '/v1/oauth2/token');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_USERPWD => $creds['client_id'] . ':' . $creds['secret'],
    CURLOPT_HTTPHEADER => ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($code !== 200) return null;
  $j = json_decode($res, true);
  return $j['access_token'] ?? null;
}

function paypal_capture_order(array $creds, string $token, string $orderId): ?array {
  $ch = curl_init($creds['base'] . '/v2/checkout/orders/' . $orderId . '/capture');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Authorization: Bearer ' . $token,
      'Content-Type: application/json',
      'Prefer: return=representation',
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($code < 200 || $code >= 300) return null;
  return json_decode($res, true) ?: null;
}

// --- Listar catálogo (público) ---
if ($action === 'list') {
  $servicios = load_json('servicios', []);
  ok(['servicios' => $servicios]);
}

// --- Solicitar servicio (transferencia bancaria) ---
if ($action === 'solicitar') {
  if (!check_rate_limit('servicio_solicitar', 10, 3600)) {
    fail('Demasiadas solicitudes. Intenta más tarde.', 429);
  }

  $u = require_user();
  $servicioId = trim($in['servicio_id'] ?? '');
  $referenciaPago = trim($in['referencia_pago'] ?? '');

  if (!$servicioId) fail('Falta el ID del servicio.', 422);

  // Buscar servicio en catálogo
  $servicios = load_json('servicios', []);
  $servicio = null;
  foreach ($servicios as $s) {
    if (($s['id'] ?? '') === $servicioId) {
      $servicio = $s;
      break;
    }
  }
  if (!$servicio) fail('Servicio no encontrado.', 404);
  if (empty($servicio['disponible'])) fail('Servicio no disponible actualmente.', 410);

  $ordenes = load_json('ordenes', []);
  $nro = count($ordenes) + 1;
  $orden = [
    'nro' => $nro,
    'servicio_id' => $servicio['id'],
    'servicio_nombre' => $servicio['nombre'],
    'servicio_icono' => $servicio['icono'] ?? '',
    'precio' => $servicio['precio'],
    'moneda' => $servicio['moneda'] ?? 'USD',
    'usuario_id' => $u['id'],
    'usuario_nombre' => $u['nombre'],
    'usuario_email' => $u['email'] ?? '',
    'metodo_pago' => 'transferencia',
    'referencia_pago' => $referenciaPago,
    'estado' => 'pendiente',
    'fecha' => today(),
    'created_at' => now_iso(),
  ];
  $ordenes[] = $orden;
  save_json('ordenes', $ordenes);

  ok([
    'orden' => $orden,
    'mensaje' => 'Solicitud registrada. Realiza la transferencia y envía la referencia por WhatsApp o aquí.',
  ]);
}

// --- Confirmar pago PayPal ---
if ($action === 'confirm_paypal') {
  if (!check_rate_limit('servicio_paypal', 10, 3600)) {
    fail('Demasiadas solicitudes. Intenta más tarde.', 429);
  }

  $u = require_user();
  $servicioId = trim($in['servicio_id'] ?? '');
  $paypalOrderId = trim($in['paypal_order_id'] ?? '');

  if (!$servicioId) fail('Falta el ID del servicio.', 422);
  if (!$paypalOrderId) fail('Falta el ID de la orden PayPal.', 422);

  // Buscar servicio
  $servicios = load_json('servicios', []);
  $servicio = null;
  foreach ($servicios as $s) {
    if (($s['id'] ?? '') === $servicioId) { $servicio = $s; break; }
  }
  if (!$servicio) fail('Servicio no encontrado.', 404);
  if (empty($servicio['disponible'])) fail('Servicio no disponible.', 410);

  // Verificar credenciales PayPal
  $creds = paypal_credentials();
  if (!$creds) {
    fail('PayPal no está configurado en el servidor. Contacta soporte.', 503);
  }

  // Obtener token de acceso
  $token = paypal_get_token($creds);
  if (!$token) {
    fail('No se pudo conectar con PayPal. Intenta más tarde.', 502);
  }

  // Capturar la orden (verifica y completa el pago)
  $capture = paypal_capture_order($creds, $token, $paypalOrderId);
  if (!$capture) {
    fail('No se pudo verificar el pago PayPal. Verifica el ID de la orden.', 402);
  }

  // Verificar estado
  $status = $capture['status'] ?? '';
  if ($status !== 'COMPLETED') {
    fail('El pago PayPal no fue completado. Estado: ' . $status, 402);
  }

  // Verificar monto
  $capturedAmount = $capture['purchase_units'][0]['payments']['captures'][0]['amount']['value'] ?? '0';
  if (floatval($capturedAmount) < floatval($servicio['precio'])) {
    fail('El monto pagado no coincide con el precio del servicio.', 402);
  }

  // Registrar orden como pagada
  $ordenes = load_json('ordenes', []);
  $nro = count($ordenes) + 1;
  $orden = [
    'nro' => $nro,
    'servicio_id' => $servicio['id'],
    'servicio_nombre' => $servicio['nombre'],
    'servicio_icono' => $servicio['icono'] ?? '',
    'precio' => $servicio['precio'],
    'moneda' => $servicio['moneda'] ?? 'USD',
    'usuario_id' => $u['id'],
    'usuario_nombre' => $u['nombre'],
    'usuario_email' => $u['email'] ?? '',
    'metodo_pago' => 'paypal',
    'paypal_order_id' => $paypalOrderId,
    'paypal_payer_id' => $capture['payer']['payer_id'] ?? '',
    'paypal_email' => $capture['payer']['email_address'] ?? '',
    'estado' => 'pagado',
    'pagado_at' => now_iso(),
    'fecha' => today(),
    'created_at' => now_iso(),
  ];
  $ordenes[] = $orden;
  save_json('ordenes', $ordenes);

  ok([
    'orden' => $orden,
    'mensaje' => 'Pago confirmado. Tu solicitud fue registrada exitosamente.',
  ]);
}

// --- Mis órdenes (usuario autenticado) ---
if ($action === 'mis_ordenes') {
  $u = require_user();
  $ordenes = load_json('ordenes', []);
  $mis = array_values(array_filter($ordenes, fn($o) => ($o['usuario_id'] ?? '') === $u['id']));
  ok(['ordenes' => array_reverse($mis)]);
}

// --- Listar todas las órdenes (admin) ---
if ($action === 'all') {
  require_admin();
  $ordenes = load_json('ordenes', []);
  ok(['ordenes' => array_reverse($ordenes)]);
}

// --- Marcar como pagado (admin) ---
if ($action === 'marcar_pagado') {
  require_admin();
  $nro = intval($in['nro'] ?? 0);
  $referencia = trim($in['referencia_pago'] ?? '');
  if ($nro <= 0) fail('Número de orden inválido.', 422);

  $ordenes = load_json('ordenes', []);
  $found = false;
  foreach ($ordenes as &$o) {
    if (($o['nro'] ?? 0) === $nro) {
      $o['estado'] = 'pagado';
      $o['referencia_pago'] = $referencia;
      $o['pagado_at'] = now_iso();
      $found = true;
      break;
    }
  }
  unset($o);
  if (!$found) fail('Orden no encontrada.', 404);

  save_json('ordenes', $ordenes);
  ok(['mensaje' => 'Orden marcada como pagada.']);
}

// --- Marcar como completado (admin) ---
if ($action === 'marcar_completado') {
  require_admin();
  $nro = intval($in['nro'] ?? 0);
  if ($nro <= 0) fail('Número de orden inválido.', 422);

  $ordenes = load_json('ordenes', []);
  $found = false;
  foreach ($ordenes as &$o) {
    if (($o['nro'] ?? 0) === $nro) {
      $o['estado'] = 'completado';
      $o['completado_at'] = now_iso();
      $found = true;
      break;
    }
  }
  unset($o);
  if (!$found) fail('Orden no encontrada.', 404);

  save_json('ordenes', $ordenes);
  ok(['mensaje' => 'Orden marcada como completada.']);
}

fail('Acción no válida.', 400);
