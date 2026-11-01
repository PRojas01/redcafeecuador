<?php
/**
 * Red Café Ecuador — bitácora y registro de pedidos
 * ---------------------------------------------------------------------------
 * Dos vistas sobre lo mismo:
 *
 *   · La bitácora (`data/actividad.json`) recoge cada movimiento de la Red:
 *     pedidos, publicaciones, altas de miembros, cursos, reportes.
 *   · El registro de pedidos cruza esa bitácora con `data/pedidos.json` para
 *     dar el historial completo de cada operación.
 *
 * Quién ve qué: cada miembro ve lo suyo; la administración ve toda la Red.
 * Nadie ve la actividad de un tercero.
 */

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

$action = $_GET['action'] ?? '';

function actividad_es_admin(?array $u): bool {
  if (!empty($_SESSION['admin'])) return true;
  return $u !== null && miembro_tiene_rol($u, 'admin');
}

/** Solo lo que le concierne a este miembro: lo que hizo y lo que le hicieron. */
function actividad_de(string $uid, array $log, array $pedidos): array {
  $nros = [];
  foreach ($pedidos as $p) {
    $mio = (string)($p['solicitante_id'] ?? '') === $uid
        || (string)($p['productor_id'] ?? '') === $uid
        || (string)($p['proveedor_id'] ?? '') === $uid;
    if ($mio) $nros['#' . (string)($p['nro'] ?? '')] = true;
  }
  return array_values(array_filter($log, function ($l) use ($uid, $nros) {
    if ((string)($l['actor_id'] ?? '') === $uid) return true;
    $ref = (string)($l['ref'] ?? '');
    return $ref !== '' && isset($nros[$ref]);
  }));
}

/** Fecha desde la que se mira, en días hacia atrás. */
function actividad_desde(): int {
  $dias = intval($_GET['dias'] ?? 90);
  $dias = max(1, min(730, $dias));
  return time() - ($dias * 86400);
}

$u = current_user();
$esAdmin = actividad_es_admin($u);
if (!$u && !$esAdmin) fail('No autenticado.', 401);

$log = load_json('actividad', []);
$pedidos = load_json('pedidos', []);
$desde = actividad_desde();
$log = array_values(array_filter($log, fn($l) => (strtotime((string)($l['ts'] ?? '')) ?: 0) >= $desde));
usort($log, fn($a, $b) => strcmp((string)($b['ts'] ?? ''), (string)($a['ts'] ?? '')));

/* ── Bitácora ─────────────────────────────────────────────────────────── */

if ($action === 'list' || $action === 'mia') {
  $propia = $action === 'mia' || !$esAdmin;
  $lineas = $propia ? actividad_de((string)($u['id'] ?? ''), $log, $pedidos) : $log;

  $evento = trim((string)($_GET['evento'] ?? ''));
  if ($evento !== '') {
    $lineas = array_values(array_filter($lineas, fn($l) => (string)($l['evento'] ?? '') === $evento));
  }
  $limite = max(1, min(500, intval($_GET['limite'] ?? 100)));
  ok([
    'actividad' => array_slice($lineas, 0, $limite),
    'total'     => count($lineas),
    'alcance'   => $propia ? 'propia' : 'red',
  ]);
}

/* ── Registro de pedidos ──────────────────────────────────────────────── */
//
// Cada pedido con su traza: quién lo pidió, a quién, por cuánto y por qué
// estados pasó. Es la vista que permite vigilar la actividad comercial.

if ($action === 'pedidos') {
  $uid = (string)($u['id'] ?? '');

  $trazaPorNro = [];
  foreach ($log as $l) {
    $ref = (string)($l['ref'] ?? '');
    if ($ref === '' || $ref[0] !== '#') continue;
    $trazaPorNro[$ref][] = [
      'ts'      => $l['ts'] ?? '',
      'evento'  => $l['evento'] ?? '',
      'actor'   => $l['actor'] ?? '',
      'detalle' => $l['detalle'] ?? '',
    ];
  }

  $mios = array_values(array_filter($pedidos, function ($p) use ($esAdmin, $uid) {
    if ($esAdmin) return true;
    return (string)($p['solicitante_id'] ?? '') === $uid
        || (string)($p['productor_id'] ?? '') === $uid
        || (string)($p['proveedor_id'] ?? '') === $uid;
  }));

  $estadoFiltro = trim((string)($_GET['estado'] ?? ''));
  if ($estadoFiltro !== '') {
    $mios = array_values(array_filter($mios, fn($p) => (string)($p['estado'] ?? '') === $estadoFiltro));
  }

  $filas = array_map(function ($p) use ($trazaPorNro, $uid) {
    $nro = '#' . (string)($p['nro'] ?? '');
    $traza = $trazaPorNro[$nro] ?? [];
    usort($traza, fn($a, $b) => strcmp((string)($a['ts'] ?? ''), (string)($b['ts'] ?? '')));
    return [
      'nro'          => $p['nro'] ?? 0,
      'tipo'         => $p['tipo'] ?? 'lote',
      'concepto'     => (string)($p['tipo'] ?? '') === 'servicio'
                          ? (string)($p['servicio'] ?? 'Servicio')
                          : (string)($p['finca'] ?? 'Café'),
      'estado'       => $p['estado'] ?? '',
      'fecha'        => $p['fecha'] ?? '',
      'creado'       => $p['created_at'] ?? '',
      'actualizado'  => $p['updated_at'] ?? '',
      'total'        => round((float)($p['total'] ?? 0), 2),
      'sacos'        => $p['sacos'] ?? null,
      'cantidad'     => $p['cantidad'] ?? null,
      'solicitante'  => $p['solicitante'] ?? '',
      'contraparte'  => (string)($p['tipo'] ?? '') === 'servicio'
                          ? (string)($p['proveedor'] ?? '')
                          : (string)($p['productor'] ?? ''),
      'mi_papel'     => (string)($p['solicitante_id'] ?? '') === $uid ? 'solicitante' : 'oferente',
      'traza'        => $traza,
    ];
  }, $mios);

  usort($filas, fn($a, $b) => ($b['nro'] <=> $a['nro']));

  $porEstado = [];
  $monto = 0.0;
  foreach ($filas as $f) {
    $e = $f['estado'] !== '' ? $f['estado'] : 'Sin estado';
    $porEstado[$e] = ($porEstado[$e] ?? 0) + 1;
    if ($f['estado'] !== 'Cancelado') $monto += (float)$f['total'];
  }

  ok([
    'pedidos'   => $filas,
    'alcance'   => $esAdmin ? 'red' : 'propia',
    'resumen'   => [
      'total'      => count($filas),
      'por_estado' => $porEstado,
      'monto'      => round($monto, 2),
    ],
  ]);
}

/* ── Resumen para la administración ───────────────────────────────────── */

if ($action === 'resumen') {
  if (!$esAdmin) fail('Solo administradores.', 403);

  $porEvento = [];
  $porDia = [];
  $actores = [];
  foreach ($log as $l) {
    $ev = (string)($l['evento'] ?? 'otro');
    $porEvento[$ev] = ($porEvento[$ev] ?? 0) + 1;
    $dia = substr((string)($l['ts'] ?? ''), 0, 10);
    if ($dia !== '') $porDia[$dia] = ($porDia[$dia] ?? 0) + 1;
    $a = (string)($l['actor'] ?? '');
    if ($a !== '' && $a !== 'Sistema') $actores[$a] = ($actores[$a] ?? 0) + 1;
  }
  arsort($porEvento);
  ksort($porDia);
  arsort($actores);

  ok([
    'eventos'       => $porEvento,
    'por_dia'       => $porDia,
    'mas_activos'   => array_slice($actores, 0, 10, true),
    'miembros'      => count(load_json('members', [])),
    'lotes'         => count(load_json('lotes', [])),
    'servicios'     => count(load_json('servicios-terceros', [])),
    'pedidos'       => count($pedidos),
    'lineas'        => count($log),
  ]);
}

fail('Acción no válida.', 400);
