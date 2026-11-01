<?php
require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';
$in = input();

// --- Listar miembros (solo autenticados) ---
// Solo la proyección pública (lista blanca). Antes devolvía sanitize_user, que
// deja correo, teléfono y cédula: cualquier cuenta recién creada podía
// descargar los datos personales de toda la Red. El panel solo usa este
// listado para poner nombre a las contrapartes de los pedidos.
if ($action === 'list') {
  $u = require_user();
  $members = load_json('members', []);
  $members = array_values(array_filter($members, fn($m) => is_array($m)));
  if (empty($_SESSION['admin'])) {
    $members = array_values(array_filter($members, fn($m) => ($m['estado'] ?? 'activo') !== 'inactivo' && !cuenta_restringida((string)($m['id'] ?? ''))));
  }
  ok(['members' => array_map('miembro_publico', $members)]);
}

// --- Listado PÚBLICO: sin cuenta, solo quien aceptó ser visible ---
if ($action === 'publicos') {
  $members = load_json('members', []);
  $vis = array_values(array_filter($members, fn($m) => miembro_es_publico($m) && !cuenta_restringida((string)($m['id'] ?? ''))));
  ok(['members' => array_map('miembro_publico', $vis), 'total' => count($vis)]);
}

// --- Obtener un miembro (requiere auth) ---
if ($action === 'get') {
  $u = require_user();
  $id = trim($_GET['id'] ?? '');
  if (!$id) fail('ID requerido.', 422);
  $members = load_json('members', []);
  // El registro completo solo para el propio miembro o la administración;
  // para el resto, la misma proyección pública que el listado.
  $puedeVerTodo = ($u['id'] ?? '') === $id || !empty($_SESSION['admin']);
  foreach ($members as $m) {
    if (($m['id'] ?? '') === $id) {
      ok(['member' => $puedeVerTodo ? sanitize_user($m) : miembro_publico($m)]);
    }
  }
  fail('Miembro no encontrado.', 404);
}

// --- Actualizar perfil (solo el propio usuario) ---
if ($action === 'update') {
  $u = require_user();
  $nombre = texto_entrada($in['nombre'] ?? '', 101);
  $email = strtolower(texto_entrada($in['email'] ?? '', 254));
  $telefono = texto_entrada($in['telefono'] ?? '', 31);
  $whatsapp = texto_entrada($in['whatsapp'] ?? '', 31);
  $provincia = texto_entrada($in['provincia'] ?? '', 81);
  if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 100) fail('Nombre inválido.', 422);
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Correo electrónico inválido.', 422);
  if (strlen($telefono) > 30 || strlen($whatsapp) > 30) fail('Número de contacto demasiado largo.', 422);
  if ($telefono !== '' && !preg_match('/^[0-9+()\-\s.]{7,30}$/', $telefono)) fail('Teléfono inválido.', 422);
  if ($whatsapp !== '' && !preg_match('/^[0-9+()\-\s.]{7,30}$/', $whatsapp)) fail('WhatsApp inválido.', 422);
  if (mb_strlen($provincia) > 80) fail('Provincia demasiado larga.', 422);

  $resultado = 'no-encontrado';
  $updated = null;
  mutate_json('members', [], function (array $members) use ($u, $nombre, $email, $telefono, $whatsapp, $provincia, &$resultado, &$updated) {
    foreach ($members as $otro) {
      if (($otro['id'] ?? '') !== $u['id'] && strcasecmp($otro['email'] ?? '', $email) === 0) {
        $resultado = 'duplicado';
        return $members;
      }
    }
    foreach ($members as &$m) {
      if (($m['id'] ?? '') === $u['id']) {
        $m['nombre'] = $nombre;
        $m['email'] = $email;
        $m['telefono'] = $telefono;
        $m['whatsapp'] = $whatsapp;
        $m['provincia'] = $provincia;
        $m['updated_at'] = now_iso();
        $resultado = 'ok';
        $updated = $m;
        break;
      }
    }
    unset($m);
    return $members;
  });
  if ($resultado === 'duplicado') fail('Ese correo ya está registrado en otra cuenta.', 409);
  if ($resultado !== 'ok') fail('Miembro no encontrado.', 404);
  $_SESSION['user'] = sanitize_user($updated ?? []);
  ok(['user' => $_SESSION['user']]);
}

function bloqueos_quitar_perfiles(string $userId, array $actuales, array $nuevos): array {
  $quitados = array_values(array_diff($actuales, $nuevos));
  if (!$quitados) return [];

  $bloqueos = [];
  $lotes = load_json('lotes', []);
  $menus = load_json('menus', []);
  $inventario = load_json('inventario', []);
  $movimientos = load_json('movimientos', []);
  $pedidos = load_json('pedidos', []);

  foreach ($quitados as $rol) {
    if ($rol === 'productor') {
      foreach ($lotes as $l) {
        if (($l['productor_id'] ?? '') === $userId || ($l['published_by'] ?? '') === $userId) {
          $bloqueos[] = 'No puedes quitar productor mientras tengas lotes publicados. Elimina u oculta esos lotes antes.';
          break;
        }
      }
    }
    if ($rol === 'bar') {
      foreach ($menus as $m) {
        if (($m['owner_id'] ?? '') === $userId) {
          $bloqueos[] = 'No puedes quitar bar mientras tengas menú publicado. Elimina los productos del menú antes.';
          break;
        }
      }
    }
    if (in_array($rol, ['bar','barista','productor','vendedor','proveedor','pilador'], true)) {
      $tieneInventario = false;
      foreach ($inventario as $i) {
        if (($i['owner_id'] ?? '') === $userId) { $tieneInventario = true; break; }
      }
      foreach ($movimientos as $mov) {
        if (($mov['owner_id'] ?? '') === $userId) { $tieneInventario = true; break; }
      }
      if ($tieneInventario) {
        $bloqueos[] = "No puedes quitar $rol mientras tengas inventario o movimientos registrados. Vacía o elimina esos registros antes.";
      }
    }
    if (in_array($rol, ['productor','vendedor','comprador','bar','barista'], true)) {
      foreach ($pedidos as $p) {
        $esProductor = $rol === 'productor' && ($p['productor_id'] ?? '') === $userId;
        $esSolicitante = in_array($rol, ['vendedor','comprador','bar','barista'], true) && ($p['solicitante_id'] ?? '') === $userId;
        if ($esProductor || $esSolicitante) {
          $bloqueos[] = "No puedes quitar $rol mientras tengas pedidos asociados. Cierra o resuelve esos pedidos antes.";
          break;
        }
      }
    }
  }

  return array_values(array_unique($bloqueos));
}

// --- Actualizar perfiles (solo el propio usuario) ---
if ($action === 'roles_update') {
  $u = require_user();
  $roles = validar_roles_miembro($in['roles'] ?? [], $in['rol'] ?? null);

  $actual = null;
  foreach (load_json('members', []) as $m) { if (($m['id'] ?? '') === $u['id']) { $actual = $m; break; } }
  if (!$actual) fail('Miembro no encontrado.', 404);
  $bloqueos = bloqueos_quitar_perfiles($u['id'], miembro_roles($actual), $roles);
  if ($bloqueos) fail(implode(' ', $bloqueos), 409, ['bloqueos' => $bloqueos]);
  $updated = null;
  mutate_json('members', [], function (array $members) use ($u, $roles, &$updated) {
    foreach ($members as &$m) {
      if (($m['id'] ?? '') !== $u['id']) continue;
      $m['rol'] = $roles[0];
      $m['roles'] = $roles;
      $m['updated_at'] = now_iso();
      $updated = $m;
      break;
    }
    unset($m);
    return $members;
  });
  if (!$updated) fail('Miembro no encontrado.', 404);
  $_SESSION['user'] = sanitize_user($updated ?? []);
  ok(['user' => $_SESSION['user']]);
}

// --- Verificar miembro (solo admin) — compatibilidad hacia atrás ---
if ($action === 'verify') {
  require_admin();
  $id = trim($in['id'] ?? '');
  if (!$id) fail('ID requerido.', 422);
  mutate_json('members', [], function (array $members) use ($id) {
    foreach ($members as &$m) {
      if (($m['id'] ?? '') === $id) {
        $m['verificado'] = true;
        $m['estado_validacion'] = 'verificado';
        $m['fecha_verificacion'] = now_iso();
        break;
      }
    }
    unset($m);
    return $members;
  });
  ok();
}

// --- Cambiar estado de validación (solo admin) ---
if ($action === 'set_estado') {
  require_admin();
  $id = trim($_POST['id'] ?? $in['id'] ?? '');
  $estado = trim($_POST['estado'] ?? $in['estado'] ?? '');
  $motivo = trim($_POST['motivo'] ?? $in['motivo'] ?? '');
  $nota = trim($_POST['nota'] ?? $in['nota'] ?? '');

  if (!$id) fail('ID requerido.', 422);
  if (!in_array($estado, ['pendiente', 'en_revision', 'verificado', 'rechazado'], true)) {
    fail('Estado inválido.', 422);
  }

  $found = null;
  mutate_json('members', [], function (array $members) use ($id, $estado, $motivo, $nota, &$found) {
    foreach ($members as &$m) {
      if (($m['id'] ?? '') !== $id) continue;
      $m['estado_validacion'] = $estado;
      $m['verificado'] = ($estado === 'verificado');
      if ($estado === 'verificado') {
        $m['fecha_verificacion'] = now_iso();
      } else {
        $m['fecha_verificacion'] = $estado === 'pendiente' ? null : ($m['fecha_verificacion'] ?? null);
      }
      if ($motivo) $m['motivo_rechazo'] = mb_substr($motivo, 0, 500);
      if ($nota) $m['nota_admin'] = mb_substr($nota, 0, 1000);
      $found = $m;
      break;
    }
    unset($m);
    return $members;
  });
  if (!$found) fail('Miembro no encontrado.', 404);
  $m = $found;
  ok(['member' => sanitize_user($m)]);
}

// --- Listar todos los miembros (solo admin) ---
if ($action === 'all') {
  require_admin();
  $members = load_json('members', []);
  ok(['members' => array_map('sanitize_user', $members)]);
}

fail('Acción no válida.', 400);
