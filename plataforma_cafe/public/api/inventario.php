<?php
/**
 * API de Ventas e Inventario por perfil.
 *
 * Acciones:
 *   ?action=list                  → usuario autenticado: sus movimientos (ordenados)
 *   ?action=movimiento            → alta de entrada o salida (+ configuración de producto)
 *   ?action=resumen               → existencias actuales calculadas, valor y totales de periodo
 *   ?action=eliminar&id=…         → solo el dueño del movimiento (o admin)
 *
 * Almacén:
 *   data/movimientos.json  → libro de movimientos (ledger con owner_id)
 *   data/inventario.json   → configuración por dueño: productos → { unidad, minimo }
 *
 * Autorización: cada acción exige usuario autenticado, perfil habilitado y
 * comprueba explícitamente la pertenencia leyendo el almacén (sin array_filter invertido).
 */

require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';
$in = input();

const PERFILES_INVENTARIO = ['bar', 'barista', 'productor', 'vendedor', 'comprador', 'proveedor', 'transportista', 'pilador', 'exportador', 'certificador', 'asesor'];
const MOTIVOS_INVENTARIO = ['compra', 'cosecha', 'venta', 'consumo', 'produccion', 'servicio', 'flete', 'honorario', 'insumo', 'operativo', 'otro'];

function require_inventario(): array {
  $u = require_user();
  $autorizado = false;
  foreach (PERFILES_INVENTARIO as $perfil) {
    if (miembro_tiene_rol($u, $perfil)) { $autorizado = true; break; }
  }
  if (!$autorizado) {
    fail('Tu perfil no tiene acceso al control de ingresos, gastos e inventario.', 403);
  }
  return $u;
}

// ─── Configuración de productos por dueño ───────────────────────────────────

function config_productos(string $owner_id): array {
  $inv = load_json('inventario', []);
  foreach ($inv as $reg) {
    if (($reg['owner_id'] ?? '') === $owner_id && is_array($reg['productos'] ?? null)) {
      return $reg['productos'];
    }
  }
  return [];
}

function upsert_producto(string $owner_id, string $producto, string $unidad, ?float $minimo): void {
  $inv = load_json('inventario', []);
  $idx = null;
  foreach ($inv as $i => $reg) {
    if (($reg['owner_id'] ?? '') === $owner_id) { $idx = $i; break; }
  }
  if ($idx === null) {
    $inv[] = ['owner_id' => $owner_id, 'productos' => []];
    $idx = count($inv) - 1;
  }
  $prods = &$inv[$idx]['productos'];
  if (!is_array($prods)) $prods = [];
  if (!isset($prods[$producto])) $prods[$producto] = ['unidad' => $unidad, 'minimo' => 0];
  if ($minimo !== null) $prods[$producto]['minimo'] = $minimo;
  if ($unidad !== '') $prods[$producto]['unidad'] = $unidad;
  save_json('inventario', $inv);
}

// ─── MOVIMIENTO: alta de entrada o salida ───────────────────────────────────

if ($action === 'movimiento') {
  $u = require_inventario();

  if (!check_rate_limit('inventario_movimiento', 30, 60)) {
    fail('Demasiados movimientos. Intenta de nuevo en un minuto.', 429);
  }

  $producto = trim((string)($in['producto'] ?? ''));
  $concepto = trim((string)($in['concepto'] ?? $producto));
  $cantidad = $in['cantidad'] ?? null;
  $tipo = $in['tipo'] ?? '';
  $motivo = trim((string)($in['motivo'] ?? ''));
  $categoria = trim((string)($in['categoria'] ?? $motivo));
  $unidad = trim((string)($in['unidad'] ?? ''));
  $precio = (isset($in['precio']) && $in['precio'] !== '' && $in['precio'] !== null) ? (float)$in['precio'] : null;
  $monto = (isset($in['monto']) && $in['monto'] !== '' && $in['monto'] !== null) ? (float)$in['monto'] : $precio;
  $minimo = (isset($in['minimo']) && $in['minimo'] !== '' && $in['minimo'] !== null) ? (float)$in['minimo'] : null;
  $fecha = trim((string)($in['fecha'] ?? ''));

  if (!in_array($tipo, ['entrada', 'salida', 'ingreso', 'gasto'], true)) fail('Tipo inválido.', 422);
  $esFinanza = in_array($tipo, ['ingreso', 'gasto'], true);
  if ($esFinanza) {
    if ($concepto === '' || mb_strlen($concepto) > 160) fail('Concepto inválido.', 422);
    if ($monto === null || $monto <= 0) fail('Monto inválido (mayor que 0).', 422);
    if ($producto === '') $producto = $concepto;
    $cantidad = 1;
    $unidad = 'registro';
    $precio = $monto;
  } else {
    if ($producto === '' || mb_strlen($producto) > 120) fail('Producto inválido.', 422);
    if (!is_numeric($cantidad) || (float)$cantidad <= 0) fail('Cantidad inválida (mayor que 0).', 422);
  }
  if (!in_array($motivo, MOTIVOS_INVENTARIO, true)) fail('Motivo inválido.', 422);
  if ($categoria === '' || mb_strlen($categoria) > 80) $categoria = $motivo;
  if ($unidad === '' || mb_strlen($unidad) > 20) $unidad = 'un';
  if ($precio !== null && $precio < 0) fail('Precio inválido.', 422);
  if ($monto !== null && $monto < 0) fail('Monto inválido.', 422);
  if ($minimo !== null && $minimo < 0) fail('Mínimo inválido.', 422);
  if ($fecha === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = today();

  $mov = [
    'id' => uid(),
    'owner_id' => $u['id'],
    'fecha' => $fecha,
    'producto' => $producto,
    'cantidad' => (float)$cantidad,
    'unidad' => $unidad,
    'tipo' => $tipo,
    'motivo' => $motivo,
    'concepto' => $concepto,
    'categoria' => $categoria,
    'monto' => $monto,
    'precio' => $precio,
    'created_at' => now_iso(),
  ];

  $movs = load_json('movimientos', []);
  $movs[] = $mov;
  save_json('movimientos', $movs);

  if (!$esFinanza) {
    upsert_producto($u['id'], $producto, $unidad, $minimo);
  }

  ok(['movimiento' => $mov]);
}

// ─── LIST: solo los movimientos del solicitante ─────────────────────────────

if ($action === 'list') {
  $u = require_inventario();
  $movs = load_json('movimientos', []);
  $mios = [];
  foreach ($movs as $m) {
    if (($m['owner_id'] ?? '') === $u['id']) $mios[] = $m;
  }
  usort($mios, fn($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));
  ok(['movimientos' => $mios]);
}

// ─── RESUMEN: existencias calculadas, valor y totales de periodo ────────────

if ($action === 'resumen') {
  $u = require_inventario();
  $movs = load_json('movimientos', []);
  $productos = config_productos($u['id']);

  // conteo por producto
  $conteo = [];
  foreach ($movs as $m) {
    if (($m['owner_id'] ?? '') !== $u['id']) continue;
    if (in_array(($m['tipo'] ?? ''), ['ingreso', 'gasto'], true)) continue;
    $p = $m['producto'];
    if (!isset($conteo[$p])) {
      $conteo[$p] = [
        'entrada' => 0.0, 'salida' => 0.0, 'existencias' => 0.0,
        'valor' => 0.0, 'salidasMes' => 0.0, 'ingresoMes' => 0.0,
        'preciosEnt' => [],
      ];
    }
    $cant = (float)($m['cantidad'] ?? 0);
    $precio = (isset($m['precio']) && is_numeric($m['precio'])) ? (float)$m['precio'] : null;
    $fecha = $m['fecha'] ?? '';
    $esMes = ($fecha !== '' && substr($fecha, 0, 7) === gmdate('Y-m'));

    if (($m['tipo'] ?? '') === 'entrada') {
      $conteo[$p]['entrada'] += $cant;
      $conteo[$p]['existencias'] += $cant;
      if ($precio !== null) $conteo[$p]['preciosEnt'][] = $precio;
    } else {
      $conteo[$p]['salida'] += $cant;
      $conteo[$p]['existencias'] -= $cant;
      if ($precio !== null) $conteo[$p]['valor'] += $precio * $cant;
      if ($esMes) {
        $conteo[$p]['salidasMes'] += $cant;
        if ($precio !== null) $conteo[$p]['ingresoMes'] += $precio * $cant;
      }
    }
  }

  // unir con configuración (unidad, mínimo)
  $nombres = array_unique(array_merge(array_keys($conteo), array_keys($productos)));
  $lista = [];
  foreach ($nombres as $nombre) {
    $cfg = $productos[$nombre] ?? null;
    $c = $conteo[$nombre] ?? null;
    $unidad = $c ? ($c['unidad'] ?? '') : '';
    if ($unidad === '' && is_array($cfg)) $unidad = $cfg['unidad'] ?? 'un';
    if ($unidad === '') $unidad = 'un';
    $minimo = (is_array($cfg) && isset($cfg['minimo'])) ? (float)$cfg['minimo'] : 0.0;
    $existencias = $c ? (float)$c['existencias'] : 0.0;
    $precios = $c ? $c['preciosEnt'] : [];
    $precioProm = count($precios) > 0 ? array_sum($precios) / count($precios) : null;
    $valor = ($precioProm !== null) ? round($existencias * $precioProm, 2) : null;
    $lista[] = [
      'producto' => $nombre,
      'unidad' => $unidad,
      'minimo' => $minimo,
      'existencias' => round($existencias, 4),
      'bajo' => $existencias < $minimo,
      'valor' => $valor,
      'entradas' => $c ? round((float)$c['entrada'], 4) : 0.0,
      'salidas' => $c ? round((float)$c['salida'], 4) : 0.0,
    ];
  }
  usort($lista, fn($a, $b) => strcmp(strtolower($a['producto']), strtolower($b['producto'])));

  $totSales = 0.0; $totIngreso = 0.0; $totGasto = 0.0;
  $totSalesMes = 0.0; $totIngresoMes = 0.0; $totGastoMes = 0.0;
  foreach ($conteo as $c) {
    $totSales += $c['salida'];
    $totIngreso += $c['valor'];
    $totSalesMes += $c['salidasMes'];
    $totIngresoMes += $c['ingresoMes'];
  }
  foreach ($movs as $m) {
    if (($m['owner_id'] ?? '') !== $u['id']) continue;
    $tipoMov = $m['tipo'] ?? '';
    $fecha = $m['fecha'] ?? '';
    $esMes = ($fecha !== '' && substr($fecha, 0, 7) === gmdate('Y-m'));
    $montoMov = isset($m['monto']) && is_numeric($m['monto']) ? (float)$m['monto'] : null;
    if ($montoMov === null && isset($m['precio']) && is_numeric($m['precio'])) {
      $montoMov = (float)$m['precio'] * (float)($m['cantidad'] ?? 1);
    }
    if ($montoMov === null) continue;
    if ($tipoMov === 'ingreso') {
      $totIngreso += $montoMov;
      if ($esMes) $totIngresoMes += $montoMov;
    }
    if ($tipoMov === 'gasto') {
      $totGasto += $montoMov;
      if ($esMes) $totGastoMes += $montoMov;
    }
  }

  ok([
    'productos' => $lista,
    'totales' => [
      'mes' => gmdate('Y-m'),
      'unidades_vendidas' => round($totSalesMes, 4),
      'ingreso_estimado' => round($totIngresoMes, 2),
      'gasto_estimado' => round($totGastoMes, 2),
      'utilidad_estimada' => round($totIngresoMes - $totGastoMes, 2),
      'unidades_totales' => round($totSales, 4),
      'ingreso_total' => round($totIngreso, 2),
      'gasto_total' => round($totGasto, 2),
      'utilidad_total' => round($totIngreso - $totGasto, 2),
    ],
  ]);
}

// ─── ELIMINAR: solo el dueño del movimiento ─────────────────────────────────

if ($action === 'eliminar') {
  $u = require_inventario();
  $id = trim((string)($in['id'] ?? ''));
  if ($id === '') fail('id requerido.', 422);

  $movs = load_json('movimientos', []);
  $idx = null;
  foreach ($movs as $i => $m) {
    if (($m['id'] ?? '') === $id) { $idx = $i; break; }
  }
  if ($idx === null) fail('Movimiento no encontrado.', 404);

  // Autorización explícita: el recurso pertenece al solicitante (o es admin).
  $mov = $movs[$idx];
  if (($mov['owner_id'] ?? '') !== $u['id'] && empty($_SESSION['admin'])) {
    fail('No autorizado: este movimiento no te pertenece.', 403);
  }

  array_splice($movs, $idx, 1);
  save_json('movimientos', array_values($movs));
  ok(['deleted' => $id]);
}

fail('Acción no válida.', 400);
