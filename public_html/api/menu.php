<?php
require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';
$in = input();

// --- Listar menú (público - cualquier usuario autenticado puede ver) ---
if ($action === 'list') {
  $owner = trim($_GET['owner'] ?? '');
  if (!$owner) fail('owner requerido.', 422);
  $menus = load_json('menus', []);
  $mine = array_values(array_filter($menus, fn($m) => ($m['owner_id'] ?? '') === $owner));
  ok(['menu' => $mine]);
}

// --- Agregar producto (solo bar o admin) ---
if ($action === 'add') {
  $u = require_user();
  if (!miembro_tiene_rol($u, 'bar') && !miembro_tiene_rol($u, 'admin')) fail('Solo bares pueden agregar productos.', 403);

  $nombre = trim($in['nombre'] ?? '');
  $desc = trim($in['descripcion'] ?? '');
  $precio = floatval($in['precio'] ?? 0);
  $cat = trim($in['categoria'] ?? 'Café');

  if (mb_strlen($nombre) < 1 || mb_strlen($nombre) > 200) fail('Nombre requerido (máx 200 chars).', 422);
  if ($precio <= 0 || $precio > 10000) fail('Precio inválido.', 422);
  if (mb_strlen($desc) > 500) fail('Descripción demasiado larga.', 422);

  $menus = load_json('menus', []);
  $item = [
    'id' => uid(),
    'owner_id' => $u['id'],
    'nombre' => $nombre,
    'descripcion' => $desc,
    'precio' => $precio,
    'categoria' => $cat,
    'created_at' => now_iso(),
  ];
  $menus[] = $item;
  save_json('menus', $menus);
  ok(['item' => $item]);
}

// --- Eliminar producto (owner o admin) ---
if ($action === 'delete') {
  $u = require_user();
  $id = trim($_GET['id'] ?? '');
  if (!$id) fail('ID requerido.', 422);

  $menus = load_json('menus', []);
  $found = false;
  // Eliminar solo si: (es el dueño) O (es admin)
  $menus = array_values(array_filter($menus, function($m) use ($id, $u, &$found) {
    if (($m['id'] ?? '') !== $id) return true;
    // Es el item que queremos eliminar
    if (($m['owner_id'] ?? '') === $u['id'] || miembro_tiene_rol($u, 'admin')) {
      $found = true;
      return false; // eliminar
    }
    return true; // mantener
  }));
  save_json('menus', $menus);
  ok(['deleted' => $found]);
}

fail('Acción no válida.', 400);
