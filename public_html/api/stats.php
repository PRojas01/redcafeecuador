<?php
/**
 * API Stats — estadísticas agregadas para usuarios autenticados.
 *
 * Usa los JSON de la app (members, lotes, pedidos, ratings, posts, chats)
 * para construir KPIs y series reales por usuario.
 *
 * Acciones:
 *   ?action=stats        → KPIs + series 12m
 *   ?action=actividad    → últimos movimientos del usuario
 */

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? 'stats';
$user = current_user();
if (!$user) fail('No autenticado.', 401);

$uid = $user['id'];
$rol = $user['rol'] ?? 'productor';

switch ($action) {
  case 'stats': {
    $members = load_json('members', []);
    $lotes   = load_json('lotes', []);
    $pedidos = load_json('pedidos', []);
    $ratings = load_json('ratings', []);
    $chats   = load_json('chats', []);
    $posts   = load_json('posts', []);

    $misPedidos = array_values(array_filter($pedidos, fn($p) =>
      ($p['origen_id'] ?? '') === $uid || ($p['solicitante_id'] ?? '') === $uid
    ));
    $misLotes = array_values(array_filter($lotes, fn($l) => ($l['productor_id'] ?? '') === $uid));
    $misRatings = array_values(array_filter($ratings, fn($r) => ($r['rated_id'] ?? '') === $uid));

    $promedio = count($misRatings) > 0
      ? round(array_sum(array_column($misRatings, 'score')) / count($misRatings), 1)
      : 0;

    $ingresos = 0;
    foreach ($misPedidos as $p) {
      if (($p['estado'] ?? '') === 'Entregado') $ingresos += (float)($p['total'] ?? 0);
    }

    // Series 12 meses por rol
    $now = new DateTimeImmutable();
    $months = [];
    for ($i = 11; $i >= 0; $i--) {
      $m = $now->modify("-$i months");
      $months[$m->format('Y-m')] = 0;
    }
    foreach ($misPedidos as $p) {
      $f = substr($p['fecha'] ?? '', 0, 7);
      if (isset($months[$f])) $months[$f]++;
    }
    $seriesData = [];
    foreach ($months as $mes => $v) $seriesData[] = ['mes' => $mes, 'valor' => $v];

    $ult = end($seriesData)['valor'];
    $ant = $seriesData[count($seriesData) - 2]['valor'];
    $variacion = $ant > 0 ? round((($ult - $ant) / $ant) * 100, 1) : 0;

    $kpis = match ($rol) {
      'productor' => [
        ['label' => 'Lotes publicados', 'valor' => count($misLotes), 'unidad' => ''],
        ['label' => 'Pedidos activos',  'valor' => count(array_filter($misPedidos, fn($p) => !in_array($p['estado'] ?? '', ['Entregado', 'Cancelado']))), 'unidad' => ''],
        ['label' => 'Calificación',     'valor' => $promedio, 'unidad' => '★'],
        ['label' => 'Ingresos',         'valor' => '$' . number_format($ingresos, 0), 'unidad' => ''],
      ],
      'vendedor' => [
        ['label' => 'Pedidos',          'valor' => count($misPedidos), 'unidad' => ''],
        ['label' => 'Entregados',       'valor' => count(array_filter($misPedidos, fn($p) => ($p['estado'] ?? '') === 'Entregado')), 'unidad' => ''],
        ['label' => 'Calificación',     'valor' => $promedio, 'unidad' => '★'],
        ['label' => 'Facturación',      'valor' => '$' . number_format($ingresos, 0), 'unidad' => ''],
      ],
      'comprador' => [
        ['label' => 'Pedidos realizados', 'valor' => count($misPedidos), 'unidad' => ''],
        ['label' => 'En curso',           'valor' => count(array_filter($misPedidos, fn($p) => !in_array($p['estado'] ?? '', ['Entregado', 'Cancelado']))), 'unidad' => ''],
        ['label' => 'Lotes en marketplace', 'valor' => count($misLotes), 'unidad' => ''],
        ['label' => 'Inversión',          'valor' => '$' . number_format($ingresos, 0), 'unidad' => ''],
      ],
      'bar' => [
        ['label' => 'Productos menú',     'valor' => count($misLotes), 'unidad' => ''],
        ['label' => 'Pedidos a tostadores', 'valor' => count($misPedidos), 'unidad' => ''],
        ['label' => 'Calificación',       'valor' => $promedio, 'unidad' => '★'],
        ['label' => 'Chats activos',      'valor' => count($chats), 'unidad' => ''],
      ],
      'barista' => [
        ['label' => 'Posts comunidad',    'valor' => count(array_filter($posts, fn($p) => ($p['autor_id'] ?? '') === $uid)), 'unidad' => ''],
        ['label' => 'Chats',              'valor' => count($chats), 'unidad' => ''],
        ['label' => 'Calificación',       'valor' => $promedio, 'unidad' => '★'],
        ['label' => 'Pedidos',            'valor' => count($misPedidos), 'unidad' => ''],
      ],
      default => [],
    };

    ok([
      'rol' => $rol,
      'periodo' => 'Últimos 12 meses',
      'kpis' => $kpis,
      'series' => [['nombre' => 'Actividad', 'color' => '#7b3f00', 'data' => $seriesData]],
      'resumen' => [
        'total' => array_sum(array_column($seriesData, 'valor')),
        'ultimo_mes' => $ult,
        'variacion_pct' => $variacion,
      ],
    ]);
    break;
  }

  case 'actividad': {
    $pedidos = load_json('pedidos', []);
    $chats   = load_json('chats', []);
    $posts   = load_json('posts', []);

    $items = [];
    foreach (array_slice(array_reverse($pedidos), 0, 5) as $p) {
      if (($p['origen_id'] ?? '') !== $uid && ($p['solicitante_id'] ?? '') !== $uid) continue;
      $items[] = [
        'icono' => '🛒',
        'texto' => 'Pedido #' . ($p['nro'] ?? '?') . ' · ' . ($p['estado'] ?? ''),
        'cuando' => substr($p['fecha'] ?? '', 0, 10),
      ];
    }
    foreach (array_slice(array_reverse($chats), 0, 3) as $c) {
      $items[] = [
        'icono' => '💬',
        'texto' => 'Chat: ' . substr($c['last_message'] ?? '...', 0, 50),
        'cuando' => $c['updated_at'] ?? '',
      ];
    }

    usort($items, fn($a, $b) => strcmp($b['cuando'], $a['cuando']));
    $items = array_slice($items, 0, 10);

    ok(['items' => $items]);
    break;
  }

  default:
    fail('Acción no válida.');
}
