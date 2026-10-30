<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

$action = $_GET['action'] ?? '';

// El comprador debe haber visto la advertencia sobre transferencias antes de
// enviar el pedido. El frontend la muestra y marca esta casilla; si falta, el
// pedido se guarda igual pero queda constancia de que no se aceptó.
function pedido_aviso(array $in): array {
  $aceptado = filter_var($in['aviso_aceptado'] ?? false, FILTER_VALIDATE_BOOLEAN);
  return [
    'aviso_aceptado'    => $aceptado,
    'aviso_aceptado_at' => $aceptado ? now_iso() : '',
    'aviso_version'     => AVISO_PAGOS_VERSION,
  ];
}
$in = input();

// --- Listar pedidos (requiere autenticación) ---
if ($action === 'list') {
  $u = require_user();
  $rolSolicitado = trim((string)($_GET['rol'] ?? ''));
  $userId = $u['id'] ?? '';
  $todos = load_json('pedidos', []);
  $rolActivo = miembro_tiene_rol($u, $rolSolicitado) ? $rolSolicitado : ($u['rol'] ?? '');

  if (miembro_tiene_rol($u, 'admin')) {
    // Admin ve todo
    ok(['pedidos' => array_reverse($todos)]);
  }

  // Todo perfil ve las dos caras de su actividad: lo que solicita y lo que
  // recibe. La rama 'productor' filtraba solo por productor_id, así que un
  // productor no veía sus propios pedidos de lotes ni sus solicitudes de
  // servicio (requisito E.3 del panel).
  $out = array_values(array_filter($todos, function ($p) use ($userId) {
    return ($p['solicitante_id'] ?? '') === $userId
        || ($p['productor_id'] ?? '') === $userId
        || ($p['proveedor_id'] ?? '') === $userId;
  }));
  ok(['pedidos' => array_reverse($out)]);
}

// --- Crear pedido ---
if ($action === 'create') {
  $u = require_user();

  // El cupo se cuenta por dirección IP, así que se comprueba solo con sesión:
  // si no, alguien de fuera agotaría el de quien comparte salida a internet.
  // Evita ráfagas de pedidos falsos que saturen a productores reales.
  if (!check_rate_limit('pedido_create', 30, 3600)) {
    fail('Demasiados pedidos seguidos. Vuelve a intentarlo en una hora.', 429);
  }

  $loteId = trim($in['loteId'] ?? '');
  $finca = trim($in['finca'] ?? '');
  $productor = trim($in['productor'] ?? '');
  $sacos = floatval($in['sacos'] ?? 0);
  $total = floatval($in['total'] ?? 0);

  // Validaciones
  if (mb_strlen($finca) < 2 || mb_strlen($finca) > 200) fail('Nombre de finca inválido.', 422);
  if ($sacos <= 0 || $sacos > 10000) fail('Cantidad de sacos inválida.', 422);
  if ($total <= 0 || $total > 1000000) fail('Total inválido.', 422);

  $origenRol = 'comprador';
  foreach (['vendedor','bar','barista'] as $perfilPedido) {
    if (miembro_tiene_rol($u, $perfilPedido)) { $origenRol = $perfilPedido; break; }
  }

  // Resolver productor_id desde el lote (si existe)
  $productorId = '';
  $lotes = load_json('lotes', []);
  foreach ($lotes as $ll) {
    if (($ll['id'] ?? '') === $loteId) {
      $productorId = $ll['productor_id'] ?? $ll['published_by'] ?? '';
      break;
    }
  }

  $todos = load_json('pedidos', []);
  $nro = count($todos) + 1;
  $p = [
    'nro' => $nro,
    'loteId' => $loteId,
    'finca' => $finca,
    'productor' => $productor,
    'productor_id' => $productorId,
    'sacos' => $sacos,
    'total' => $total,
    'estado' => 'Solicitado',
    'fecha' => today(),
    'origenRol' => $origenRol,
    'solicitante' => $u['nombre'],
    'solicitante_id' => $u['id'],
    'created_at' => now_iso(),
  ];
  $p = array_merge($p, pedido_aviso($in));
  $todos[] = $p;
  save_json('pedidos', $todos);

  // Un pedido es una señal más fuerte que una consulta: el lote queda marcado
  // para que su dueño confirme cuánto le queda o si ya se acabó.
  if ($loteId !== '') {
    mutate_json('lotes', [], function ($lotes) use ($loteId) {
      foreach ($lotes as &$l) {
        if (($l['id'] ?? '') === $loteId) {
          $l['confirmacion_pendiente'] = true;
          $l['ultimo_contacto'] = now_iso();
        }
      }
      unset($l);
      return $lotes;
    });
  }

  notificar($productorId, 'pedido',
    'Nuevo pedido #' . $nro . ' de ' . $u['nombre'],
    $sacos . ' saco(s) de ' . $finca . ' por $' . number_format($total, 2) . '. Revísalo en tu panel.',
    '/panel/');
  registrar_actividad('pedido-creado', [
    'objeto_tipo' => 'pedido',
    'objeto_id'   => (string)$nro,
    'ref'         => '#' . $nro,
    'detalle'     => $sacos . ' saco(s) de ' . $finca,
    'monto'       => $total,
    'contraparte' => $productor !== '' ? $productor : aviso_nombre_miembro($productorId),
  ]);

  // Notificar al productor por email (transaccional, no bloquea)
  @include_once __DIR__ . '/mailer.php';
  if (function_exists('mailer_send') && $productorId !== '') {
    $members = load_json('members', []);
    foreach ($members as $mi) {
      if (($mi['id'] ?? '') === $productorId) {
        mailer_send('pedido', $mi['email'], [
          'nombre'  => $mi['nombre'],
          'nro'     => (string)$nro,
          'cliente' => $u['nombre'],
          'total'   => '$' . number_format($total, 2),
        ]);
        break;
      }
    }
  }

  ok(['pedido' => $p]);
}

if ($action === 'create_service') {
  $u = require_user();

  // El cupo se cuenta por dirección IP, así que se comprueba solo con sesión:
  // si no, alguien de fuera agotaría el de quien comparte salida a internet.
  // Evita solicitudes de servicio repetidas que saturen a proveedores.
  if (!check_rate_limit('pedido_servicio', 30, 3600)) {
    fail('Demasiadas solicitudes de servicio seguidas. Vuelve a intentarlo en una hora.', 429);
  }

  $servicioId = trim((string)($in['servicioId'] ?? $in['servicio_id'] ?? ''));
  $titulo = trim((string)($in['titulo'] ?? $in['servicio'] ?? 'Servicio'));
  $proveedor = trim((string)($in['proveedor'] ?? 'Red Café Ecuador'));
  $proveedorId = trim((string)($in['proveedorId'] ?? $in['proveedor_id'] ?? 'redcafe'));
  $cantidad = max(1, intval($in['cantidad'] ?? 1));
  $total = max(0, floatval($in['total'] ?? 0));
  if ($servicioId === '' || mb_strlen($titulo) < 2) fail('Servicio inválido.', 422);

  $todos = load_json('pedidos', []);
  $nro = count($todos) + 1;
  $p = [
    'nro' => $nro,
    'tipo' => 'servicio',
    'servicioId' => $servicioId,
    'servicio' => $titulo,
    'proveedor' => $proveedor,
    'proveedor_id' => $proveedorId,
    'cantidad' => $cantidad,
    'total' => $total,
    'estado' => 'Solicitado',
    'fecha' => today(),
    'origenRol' => $u['rol'] ?? '',
    'solicitante' => $u['nombre'],
    'solicitante_id' => $u['id'],
    'created_at' => now_iso(),
  ];
  $p = array_merge($p, pedido_aviso($in));
  $todos[] = $p;
  save_json('pedidos', $todos);

  notificar($proveedorId, 'pedido',
    'Nueva solicitud #' . $nro . ' de ' . $u['nombre'],
    $titulo . ' · ' . $cantidad . ' unidad(es). Revísala en tu panel.',
    '/panel/');
  registrar_actividad('servicio-solicitado', [
    'objeto_tipo' => 'pedido',
    'objeto_id'   => (string)$nro,
    'ref'         => '#' . $nro,
    'detalle'     => $titulo,
    'monto'       => $total,
    'contraparte' => $proveedor,
  ]);
  ok(['pedido' => $p]);
}

// --- Avanzar estado (solo el productordueño o admin) ---
if ($action === 'advance') {
  $u = require_user();
  $nro = intval($in['nro'] ?? 0);
  if (!$nro) fail('Número de pedido requerido.', 422);

  // Autorización: solo admin o el productor dueño del lote puede avanzar
  $todos = load_json('pedidos', []);
  $objetivo = null;
  foreach ($todos as $p) {
    if (intval($p['nro'] ?? 0) === $nro) { $objetivo = $p; break; }
  }
  if (!$objetivo) fail('Pedido no encontrado.', 404);
  $esAdmin = miembro_tiene_rol($u, 'admin');
  $esDueno = ($objetivo['productor_id'] ?? '') !== '' && ($objetivo['productor_id'] ?? '') === $u['id'];
  if (!$esAdmin && !$esDueno) fail('No autorizado: solo el productor dueño o un administrador puede avanzar.', 403);

  $estados = ['Solicitado', 'Aceptado', 'En camino', 'Entregado'];
  $found = false;
  $updated = null;

  $data = mutate_json('pedidos', [], function($todos) use ($nro, $estados, $u, &$found, &$updated) {
    foreach ($todos as &$p) {
      if (intval($p['nro'] ?? 0) === $nro) {
        $actual = ($p['estado'] ?? '') === 'Pago en custodia (escrow)' ? 'Solicitado' : ($p['estado'] ?? '');
        $i = array_search($actual, $estados, true);
        if ($i !== false && $i < count($estados) - 1) {
          $p['estado'] = $estados[$i + 1];
          $p['updated_at'] = now_iso();
          $p['updated_by'] = $u['id'];
          $found = true;
          $updated = $p;
        }
      }
    }
    return $todos;
  });

  if (!$found) fail('Pedido no encontrado o ya en estado final.', 404);
  notificar((string)($updated['solicitante_id'] ?? ''), 'pedido-estado',
    'Tu pedido #' . $nro . ' pasó a «' . $updated['estado'] . '»',
    'Lo actualizó ' . $u['nombre'] . '.', '/panel/');
  registrar_actividad('pedido-estado', [
    'objeto_tipo' => 'pedido',
    'objeto_id'   => (string)$nro,
    'ref'         => '#' . $nro,
    'detalle'     => 'Nuevo estado: ' . $updated['estado'],
    'monto'       => $updated['total'] ?? null,
    'contraparte' => (string)($updated['solicitante'] ?? ''),
  ]);
  ok(['pedido' => $updated]);
}

// --- Confirmar recepción (solo el solicitante) ---
// --- Cancelar un pedido -------------------------------------------------
// Puede cancelar quien lo solicitó, la contraparte (productor o proveedor) o
// un administrador. No se borra: queda como "Cancelado" para conservar el
// historial de la operación.
if ($action === 'cancelar') {
  $u = require_user();
  $nro = intval($in['nro'] ?? ($_GET['nro'] ?? 0));
  if (!$nro) fail('Número de pedido requerido.', 422);
  $motivo = trim((string)($in['motivo'] ?? ''));
  if (mb_strlen($motivo) > 300) fail('Motivo demasiado largo (máx 300).', 422);

  $todos = load_json('pedidos', []);
  $objetivo = null;
  foreach ($todos as $p) { if (intval($p['nro'] ?? 0) === $nro) { $objetivo = $p; break; } }
  if (!$objetivo) fail('Pedido no encontrado.', 404);

  $uid = $u['id'] ?? '';
  $autorizado = miembro_tiene_rol($u, 'admin')
    || ($objetivo['solicitante_id'] ?? '') === $uid
    || ($objetivo['productor_id'] ?? '') === $uid
    || ($objetivo['proveedor_id'] ?? '') === $uid;
  if (!$autorizado) fail('No autorizado: solo quien participa en el pedido puede cancelarlo.', 403);
  if (($objetivo['estado'] ?? '') === 'Entregado') fail('Un pedido entregado no se puede cancelar.', 409);

  $found = false; $updated = null;
  mutate_json('pedidos', [], function($todos) use ($nro, $u, $motivo, &$found, &$updated) {
    foreach ($todos as &$p) {
      if (intval($p['nro'] ?? 0) === $nro) {
        $p['estado'] = 'Cancelado';
        if ($motivo !== '') $p['motivo_cancelacion'] = $motivo;
        $p['updated_at'] = now_iso();
        $p['cancelled_by'] = $u['id'] ?? '';
        $found = true; $updated = $p;
      }
    }
    unset($p);
    return $todos;
  });
  if (!$found) fail('Pedido no encontrado.', 404);
  // Se avisa a la otra parte, no a quien canceló.
  foreach (['solicitante_id', 'productor_id', 'proveedor_id'] as $campo) {
    $otro = (string)($updated[$campo] ?? '');
    if ($otro !== '' && $otro !== $uid) {
      notificar($otro, 'pedido-estado', 'Se canceló el pedido #' . $nro,
        $motivo !== '' ? 'Motivo: ' . $motivo : 'Lo canceló ' . $u['nombre'] . '.', '/panel/');
    }
  }
  registrar_actividad('pedido-cancelado', [
    'objeto_tipo' => 'pedido',
    'objeto_id'   => (string)$nro,
    'ref'         => '#' . $nro,
    'detalle'     => $motivo !== '' ? $motivo : 'Sin motivo indicado',
    'monto'       => $updated['total'] ?? null,
  ]);
  ok(['pedido' => $updated]);
}

// --- Eliminar un pedido -------------------------------------------------
// Solo quien lo hizo puede retirarlo mientras siga en "Solicitado" o
// "Cancelado"; con la operación en marcha se cancela, no se borra.
// El administrador puede eliminar cualquiera.
if ($action === 'delete') {
  $u = require_user();
  $nro = intval($in['nro'] ?? ($_GET['nro'] ?? 0));
  if (!$nro) fail('Número de pedido requerido.', 422);

  $todos = load_json('pedidos', []);
  $objetivo = null;
  foreach ($todos as $p) { if (intval($p['nro'] ?? 0) === $nro) { $objetivo = $p; break; } }
  if (!$objetivo) fail('Pedido no encontrado.', 404);

  $esAdmin = miembro_tiene_rol($u, 'admin');
  $esSolicitante = ($objetivo['solicitante_id'] ?? '') === ($u['id'] ?? '');
  if (!$esAdmin && !$esSolicitante) {
    fail('No autorizado: solo quien hizo el pedido o un administrador puede eliminarlo.', 403);
  }
  if (!$esAdmin && !in_array($objetivo['estado'] ?? '', ['Solicitado', 'Cancelado'], true)) {
    fail('Este pedido ya está en curso: cancélalo en vez de eliminarlo.', 409);
  }

  mutate_json('pedidos', [], function($todos) use ($nro) {
    return array_values(array_filter($todos, function($p) use ($nro) {
      return intval($p['nro'] ?? 0) !== $nro;
    }));
  });
  registrar_actividad('pedido-eliminado', [
    'objeto_tipo' => 'pedido',
    'objeto_id'   => (string)$nro,
    'ref'         => '#' . $nro,
    'detalle'     => 'Retirado por ' . ($esAdmin ? 'la administración' : 'quien lo solicitó'),
    'monto'       => $objetivo['total'] ?? null,
  ]);
  ok(['eliminado' => $nro]);
}

if ($action === 'confirm_recepcion') {
  $u = require_user();
  $nro = intval($in['nro'] ?? 0);
  if (!$nro) fail('Número de pedido requerido.', 422);

  $found = false;
  $updated = null;

  $data = mutate_json('pedidos', [], function($todos) use ($nro, $u, &$found, &$updated) {
    foreach ($todos as &$p) {
      if (intval($p['nro'] ?? 0) === $nro && ($p['solicitante_id'] ?? '') === $u['id']) {
        $p['estado'] = 'Entregado';
        $p['updated_at'] = now_iso();
        $p['confirmed_by'] = $u['id'];
        $found = true;
        $updated = $p;
      }
    }
    return $todos;
  });

  if (!$found) fail('Pedido no encontrado o no eres el solicitante.', 404);
  foreach (['productor_id', 'proveedor_id'] as $campo) {
    $otro = (string)($updated[$campo] ?? '');
    if ($otro !== '') {
      notificar($otro, 'pedido-estado', $u['nombre'] . ' confirmó la recepción del pedido #' . $nro,
        'La operación queda como entregada.', '/panel/');
    }
  }
  registrar_actividad('pedido-entregado', [
    'objeto_tipo' => 'pedido',
    'objeto_id'   => (string)$nro,
    'ref'         => '#' . $nro,
    'detalle'     => 'Recepción confirmada por el solicitante',
    'monto'       => $updated['total'] ?? null,
  ]);
  ok(['pedido' => $updated]);
}

fail('Acción no válida.', 400);
