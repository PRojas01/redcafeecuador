<?php
// Sistema de valoraciones entre miembros y desde admin.
// Score 1-5, con comentario opcional. Almacenado en data/ratings.json.
require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';
$in = input();

// --- Crear valoración ---
if ($action === 'create') {
  $u = current_user();
  $isAdmin = !empty($_SESSION['admin']);

  $ratedId = trim($in['rated_id'] ?? '');
  $targetType = trim((string)($in['target_type'] ?? $in['tipo'] ?? 'usuario'));
  $targetId = trim((string)($in['target_id'] ?? $in['objeto_id'] ?? $ratedId));
  $score = intval($in['score'] ?? 0);
  $comentario = trim($in['comentario'] ?? '');
  $pedidoNro = isset($in['pedido_nro']) ? intval($in['pedido_nro']) : null;

  if (!$u && !$isAdmin) fail('No autenticado.', 401);
  $tiposPermitidos = ['usuario', 'lote', 'servicio', 'cafeteria'];
  if (!in_array($targetType, $tiposPermitidos, true)) fail('Tipo de valoración inválido.', 422);
  if (!$targetId) fail('ID del objeto a valorar requerido.', 422);
  if (!$ratedId && $targetType === 'usuario') $ratedId = $targetId;
  if ($score < 1 || $score > 5) fail('Puntuación inválida (1-5).', 422);
  if (strlen($comentario) > 500) fail('Comentario demasiado largo (máx 500).', 422);

  // Evitar auto-valoración
  if ($targetType === 'usuario' && $u && ($u['id'] ?? '') === $ratedId) {
    fail('No puedes valorarte a ti mismo.', 422);
  }

  // Si no es admin, verificar que el rated_id tuvo un pedido con el usuario
  if (!$isAdmin && $targetType === 'usuario') {
    $pedidos = load_json('pedidos', []);
    $involucrado = false;
    foreach ($pedidos as $p) {
      if (($p['solicitante_id'] ?? '') === $ratedId || ($p['productor_id'] ?? '') === $ratedId) {
        if (($p['solicitante_id'] ?? '') === ($u['id'] ?? '') || ($p['productor_id'] ?? '') === ($u['id'] ?? '')) {
          $involucrado = true;
          break;
        }
      }
    }
    if (!$involucrado) {
      fail('Solo puedes valorar a miembros con los que hayas tenido un pedido.', 403);
    }
  }

  // Si es un miembro (no admin), rate limit
  if (!$isAdmin && !check_rate_limit('rating', 20, 3600)) {
    fail('Demasiadas valoraciones. Espera una hora.', 429);
  }

  $ratings = load_json('ratings', []);
  $raterId = $isAdmin ? 'admin' : ($u['id'] ?? 'anon');
  foreach ($ratings as $r) {
    if (($r['rater_id'] ?? '') === $raterId
      && ($r['target_type'] ?? 'usuario') === $targetType
      && (string)($r['target_id'] ?? ($r['rated_id'] ?? '')) === $targetId
      && (string)($r['pedido_nro'] ?? '') === (string)($pedidoNro ?? '')) {
      fail('Ya registraste una valoración para este elemento.', 409);
    }
  }
  $ratings[] = [
    'id' => uid(),
    'rated_id' => $ratedId,
    'target_type' => $targetType,
    'target_id' => $targetId,
    'rater_id' => $raterId,
    'rater_nombre' => $isAdmin ? 'Equipo Red Café' : ($u['nombre'] ?? 'Anónimo'),
    'is_admin' => $isAdmin,
    'score' => $score,
    'comentario' => $comentario,
    'pedido_nro' => $pedidoNro,
    'ts' => now_iso(),
  ];
  save_json('ratings', $ratings);

  ok(['id' => end($ratings)['id']]);
}

// --- Promedio y lista de valoraciones de un miembro ---
if ($action === 'promedio') {
  $id = trim($_GET['id'] ?? '');
  $type = trim((string)($_GET['target_type'] ?? $_GET['tipo'] ?? ''));
  if (!$id) fail('ID requerido.', 422);
  $ratings = load_json('ratings', []);
  $del = array_values(array_filter($ratings, function ($r) use ($id, $type) {
    $rt = $r['target_type'] ?? 'usuario';
    $rid = $r['target_id'] ?? ($r['rated_id'] ?? '');
    if ($type !== '' && $rt !== $type) return false;
    return (string)$rid === $id || (string)($r['rated_id'] ?? '') === $id;
  }));
  if (empty($del)) {
    ok(['promedio' => 0, 'count' => 0, 'lista' => []]);
  }
  $sum = array_sum(array_column($del, 'score'));
  $promedio = $sum / count($del);
  // Devolver últimos 20
  usort($del, fn($a, $b) => strcmp($b['ts'] ?? '', $a['ts'] ?? ''));
  ok(['promedio' => round($promedio, 2), 'count' => count($del), 'lista' => array_slice($del, 0, 20)]);
}

// --- Listar todas las valoraciones (solo admin) ---
if ($action === 'all') {
  require_admin();
  $ratings = load_json('ratings', []);
  usort($ratings, fn($a, $b) => strcmp($b['ts'] ?? '', $a['ts'] ?? ''));
  ok(['ratings' => $ratings]);
}

fail('Acción no válida.', 400);
