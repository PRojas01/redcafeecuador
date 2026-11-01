<?php
// Red Cafe Ecuador - reportes de problemas de usuarios a administracion.
require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';
$in = input();

const REPORTE_CATEGORIAS = [
  'acceso', 'pago', 'publicacion', 'pedido', 'contenido',
  'contacto-sospechoso', 'otro',
];

const REPORTE_ESTADOS = ['abierto', 'en-proceso', 'resuelto', 'cerrado'];

function reporte_texto(string $valor, string $campo, int $min, int $max): string {
  $valor = trim($valor);
  $len = mb_strlen($valor);
  if ($len < $min || $len > $max) {
    fail($campo . ' debe tener entre ' . $min . ' y ' . $max . ' caracteres.', 422);
  }
  return $valor;
}

function reporte_url($valor): string {
  $url = trim((string)$valor);
  if ($url === '') return '';
  if ($url[0] !== '/' || strpos($url, '..') !== false || strpos($url, '//') === 0) {
    fail('URL interna inválida.', 422);
  }
  if (mb_strlen($url) > 300) fail('URL demasiado larga.', 422);
  return mb_substr($url, 0, 300);
}

function reporte_por_id(array $reportes, string $id): ?array {
  foreach ($reportes as $r) {
    if ((string)($r['id'] ?? '') === $id) return $r;
  }
  return null;
}

function reporte_es_admin(array $u): bool {
  return !empty($_SESSION['admin']) || miembro_tiene_rol($u, 'admin');
}

function reporte_require_admin(): array {
  $u = current_user() ?: [];
  if (!reporte_es_admin($u)) fail('Solo administradores.', 403);
  return $u;
}

function reporte_incluir_avisos(): void {
  if (file_exists(__DIR__ . '/_avisos.php')) {
    @include_once __DIR__ . '/_avisos.php';
  }
}

if ($action === 'crear') {
  $u = require_user();

  $categoria = trim((string)($in['categoria'] ?? ''));
  if (!in_array($categoria, REPORTE_CATEGORIAS, true)) fail('Categoría inválida.', 422);
  $asunto = reporte_texto((string)($in['asunto'] ?? ''), 'Asunto', 5, 120);
  $detalle = reporte_texto((string)($in['detalle'] ?? ''), 'Detalle', 10, 2000);
  $url = reporte_url($in['url'] ?? '');

  if (!check_rate_limit('reporte', 5, 600)) {
    fail('Demasiados reportes. Espera unos minutos.', 429);
  }

  $reporte = [
    'id' => uid(),
    'ts' => now_iso(),
    'uid' => (string)($u['id'] ?? ''),
    'nombre' => (string)($u['nombre'] ?? ''),
    'email' => (string)($u['email'] ?? ''),
    'rol' => (string)($u['rol'] ?? ''),
    'categoria' => $categoria,
    'asunto' => $asunto,
    'detalle' => $detalle,
    'url' => $url,
    'estado' => 'abierto',
    'historial' => [],
  ];

  mutate_json('reportes', [], function (array $reportes) use ($reporte) {
    $reportes[] = $reporte;
    return $reportes;
  });

  reporte_incluir_avisos();
  $detalleCorto = mb_substr($detalle, 0, 400);
  if (function_exists('notificar_admins')) {
    notificar_admins('reporte', 'Nuevo reporte: ' . $asunto, $detalleCorto, '/admin/');
  }
  if (function_exists('registrar_actividad')) {
    registrar_actividad('reporte-creado', [
      'actor_id' => $reporte['uid'],
      'actor' => $reporte['nombre'],
      'rol' => $reporte['rol'],
      'objeto_tipo' => 'reporte',
      'objeto_id' => $reporte['id'],
      'ref' => $categoria,
      'detalle' => $asunto,
    ]);
  }

  ok(['reporte' => $reporte]);
}

if ($action === 'mios') {
  $u = require_user();
  $uid = (string)($u['id'] ?? '');
  $reportes = load_json('reportes', []);
  $mios = array_values(array_filter($reportes, function ($r) use ($uid) {
    return (string)($r['uid'] ?? '') === $uid;
  }));
  usort($mios, fn($a, $b) => strcmp((string)($b['ts'] ?? ''), (string)($a['ts'] ?? '')));
  ok(['reportes' => $mios]);
}

if ($action === 'list') {
  reporte_require_admin();
  $estado = trim((string)($_GET['estado'] ?? $in['estado'] ?? ''));
  if ($estado !== '' && !in_array($estado, REPORTE_ESTADOS, true)) fail('Estado inválido.', 422);
  $reportes = load_json('reportes', []);
  if ($estado !== '') {
    $reportes = array_values(array_filter($reportes, function ($r) use ($estado) {
      return (string)($r['estado'] ?? '') === $estado;
    }));
  }
  usort($reportes, fn($a, $b) => strcmp((string)($b['ts'] ?? ''), (string)($a['ts'] ?? '')));
  ok(['reportes' => $reportes]);
}

if ($action === 'responder') {
  $admin = reporte_require_admin();
  $id = trim((string)($in['id'] ?? ''));
  $respuesta = reporte_texto((string)($in['respuesta'] ?? ''), 'Respuesta', 5, 2000);
  $estado = trim((string)($in['estado'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  if (!in_array($estado, REPORTE_ESTADOS, true)) fail('Estado inválido.', 422);

  $actualizado = null;
  mutate_json('reportes', [], function (array $reportes) use ($id, $respuesta, $estado, $admin, &$actualizado) {
    foreach ($reportes as &$r) {
      if ((string)($r['id'] ?? '') !== $id) continue;
      if (!isset($r['historial']) || !is_array($r['historial'])) $r['historial'] = [];
      $r['historial'][] = [
        'ts' => now_iso(),
        'uid' => (string)($admin['id'] ?? 'admin'),
        'nombre' => (string)($admin['nombre'] ?? 'Administración'),
        'rol' => 'admin',
        'respuesta' => $respuesta,
        'estado' => $estado,
      ];
      $r['estado'] = $estado;
      $r['actualizado'] = now_iso();
      $actualizado = $r;
      break;
    }
    unset($r);
    return $reportes;
  });

  if (!$actualizado) fail('Reporte no encontrado.', 404);

  reporte_incluir_avisos();
  if (function_exists('notificar')) {
    notificar(
      (string)($actualizado['uid'] ?? ''),
      'reporte',
      'Respuesta a tu reporte',
      mb_substr($respuesta, 0, 400),
      '/panel/'
    );
  }
  if (function_exists('registrar_actividad')) {
    registrar_actividad('reporte-respondido', [
      'actor_id' => (string)($admin['id'] ?? ''),
      'actor' => (string)($admin['nombre'] ?? 'Administración'),
      'rol' => 'admin',
      'objeto_tipo' => 'reporte',
      'objeto_id' => $id,
      'ref' => $estado,
      'detalle' => (string)($actualizado['asunto'] ?? ''),
    ]);
  }

  ok(['reporte' => $actualizado]);
}

if ($action === 'cerrar') {
  $u = require_user();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);

  $actualizado = null;
  mutate_json('reportes', [], function (array $reportes) use ($id, $u, &$actualizado) {
    $admin = reporte_es_admin($u);
    foreach ($reportes as &$r) {
      if ((string)($r['id'] ?? '') !== $id) continue;
      if (!$admin && (string)($r['uid'] ?? '') !== (string)($u['id'] ?? '')) {
        fail('No autorizado.', 403);
      }
      $r['estado'] = 'cerrado';
      $r['actualizado'] = now_iso();
      if (!isset($r['historial']) || !is_array($r['historial'])) $r['historial'] = [];
      $r['historial'][] = [
        'ts' => now_iso(),
        'uid' => (string)($u['id'] ?? ''),
        'nombre' => (string)($u['nombre'] ?? ''),
        'rol' => $admin ? 'admin' : (string)($u['rol'] ?? ''),
        'estado' => 'cerrado',
        'respuesta' => '',
      ];
      $actualizado = $r;
      break;
    }
    unset($r);
    return $reportes;
  });

  if (!$actualizado) fail('Reporte no encontrado.', 404);
  ok(['reporte' => $actualizado]);
}

fail('Acción no válida.', 400);
