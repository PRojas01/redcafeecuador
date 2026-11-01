<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';
require_once __DIR__ . '/_comunidad-avisos.php';

$action = $_GET['action'] ?? '';
$in = input();

function servicio_imagenes_validas($raw): array {
  if (!is_array($raw)) return [];
  $out = [];
  foreach ($raw as $url) {
    if (!is_string($url)) continue;
    $url = trim($url);
    if (!preg_match('#^/uploads/user-content/[A-Za-z0-9._-]+\.jpg$#', $url)) continue;
    if (!in_array($url, $out, true)) $out[] = $url;
    if (count($out) >= 6) break;
  }
  return $out;
}

/**
 * Cómo se anuncia el precio de un servicio.
 *
 * Había dos formas de mentir con un número: un servicio gratuito rotulado
 * «$0», que suena a error, y uno de pago con precio 0 —como la intermediación,
 * que se cotiza según el alcance— anunciado como «Premium · $0». Ninguno de
 * los dos decía la verdad. Aquí se decide una sola vez y las dos vistas del
 * sitio lo pintan igual.
 */
function servicio_precio_etiqueta($precio, bool $gratis): string {
  if ($gratis) return 'Gratis';
  $p = (float)$precio;
  if ($p <= 0) return 'A convenir';
  return '$ ' . rtrim(rtrim(number_format($p, 2, '.', ''), '0'), '.');
}

function categoria_servicio_valida(string $categoria): string {
  $permitidas = ['transporte', 'catacion', 'asesoria', 'pilado', 'insumos', 'capacitacion', 'exportacion', 'otro'];
  return in_array($categoria, $permitidas, true) ? $categoria : 'otro';
}

function servicio_redcafe_marketplace(array $s): array {
  $gratis = !empty($s['gratis']) || ((float)($s['precio'] ?? 0) <= 0 && preg_match('/gratis/i', (string)($s['unidad'] ?? '')));
  return [
    'id' => $s['id'] ?? '',
    'titulo' => $s['nombre'] ?? ($s['titulo'] ?? 'Servicio RedCafé'),
    'nombre' => $s['nombre'] ?? ($s['titulo'] ?? 'Servicio RedCafé'),
    'categoria' => $s['categoria'] ?? ($s['perfil'] ?? 'redcafe'),
    'descripcion' => $s['descripcion'] ?? '',
    'precio' => $s['precio'] ?? 0,
    'precio_etiqueta' => servicio_precio_etiqueta($s['precio'] ?? 0, $gratis),
    'moneda' => $s['moneda'] ?? 'USD',
    'unidad' => $s['unidad'] ?? 'servicio',
    'proveedor' => 'Red Café Ecuador',
    'proveedor_id' => 'redcafe',
    'cobertura' => $s['cobertura'] ?? 'Ecuador',
    'whatsapp' => redcafe_whatsapp_display(getenv('REDCAFE_WHATSAPP') ?: '593968641376'),
    'whatsapp_link' => redcafe_whatsapp_link_digits(getenv('REDCAFE_WHATSAPP') ?: '593968641376'),
    'email' => getenv('REDCAFE_EMAIL') ?: 'info@redcafeecuador.com',
    'verificado' => true,
    'oficial_redcafe' => true,
    'gratis' => $gratis,
    'plan' => $gratis ? 'gratis' : 'premium',
    'tipo_plan' => $gratis ? 'gratis' : 'premium',
    'etiqueta_plan' => $gratis ? 'Gratis RedCafé' : 'Premium RedCafé',
    'visibilidad' => 'publico',
    'created_at' => $s['created_at'] ?? '',
  ];
}

function servicio_intermediacion_redcafe(): array {
  return [
    'id' => 'intermediacion-compraventa',
    'nombre' => 'Intermediación en compraventa de café',
    'descripcion' => 'Para compradores: búsqueda de calidad, mejor proveedor, validación de lote, visita técnica y acompañamiento a la compra. Para vendedores: preparación de oferta, validación de lote, definición de precio, conexión con comprador y acompañamiento de la venta.',
    'precio' => 0,
    'moneda' => 'USD',
    'unidad' => 'según alcance',
    'categoria' => 'asesoria',
    'perfil' => 'all',
    'disponible' => true,
    'cobertura' => 'Ecuador',
  ];
}

function servicio_orden_publicacion(array $a, array $b): int {
  $ta = strtotime((string)($a['created_at'] ?? '')) ?: 0;
  $tb = strtotime((string)($b['created_at'] ?? '')) ?: 0;
  if ($tb !== $ta) return $tb <=> $ta;
  return strcmp((string)($b['id'] ?? ''), (string)($a['id'] ?? ''));
}

function servicio_owner_id(array $s): string {
  return (string)($s['proveedor_id'] ?? $s['owner_id'] ?? $s['published_by'] ?? '');
}

function servicio_usuario_o_admin(): array {
  $u = current_user();
  if ($u) return $u;
  if (!empty($_SESSION['admin'])) {
    return ['id' => 'admin', 'nombre' => 'Administración', 'rol' => 'admin', 'roles' => ['admin']];
  }
  fail('No autenticado.', 401);
}

/* ─── Administración de los servicios de la plataforma ─────────────────────
   Los servicios oficiales vivían en data/servicios.json y solo se podían
   cambiar editando el archivo a mano en el hosting: ni el precio, ni el
   texto, ni añadir uno nuevo. Aquí se administran desde el panel. */

function servicio_admin_o_403(): array {
  $u = current_user();
  if (!empty($_SESSION['admin'])) return $u ?: ['id' => 'admin', 'nombre' => 'Administración'];
  if ($u && miembro_tiene_rol($u, 'admin')) return $u;
  fail('Solo la administración gestiona los servicios de la plataforma.', 403);
}

const SERVICIO_PERFILES = ['all', 'productor', 'vendedor', 'comprador', 'bar', 'barista',
  'certificador', 'transportista', 'pilador', 'exportador', 'proveedor', 'amante', 'asesor'];

function servicio_oficial_saneado(array $in, array $previo = []): array {
  $nombre = trim((string)($in['nombre'] ?? ($previo['nombre'] ?? '')));
  if (mb_strlen($nombre) < 3 || mb_strlen($nombre) > 120) {
    fail('El nombre del servicio debe tener entre 3 y 120 caracteres.', 422);
  }
  $descripcion = trim((string)($in['descripcion'] ?? ($previo['descripcion'] ?? '')));
  if (mb_strlen($descripcion) > 600) $descripcion = mb_substr($descripcion, 0, 600);

  $precio = array_key_exists('precio', $in) ? $in['precio'] : ($previo['precio'] ?? 0);
  if (!is_numeric($precio) || (float)$precio < 0 || (float)$precio > 100000) {
    fail('Precio inválido: debe ser un número entre 0 y 100000.', 422);
  }
  $precio = round((float)$precio, 2);

  // «Gratis» no se deduce del precio: un servicio puede costar 0 porque se
  // cotiza según alcance, y eso no es gratis. Lo dice la administración.
  $gratis = array_key_exists('gratis', $in)
    ? filter_var($in['gratis'], FILTER_VALIDATE_BOOLEAN)
    : (bool)($previo['gratis'] ?? false);

  $perfil = trim((string)($in['perfil'] ?? ($previo['perfil'] ?? 'all')));
  if (!in_array($perfil, SERVICIO_PERFILES, true)) $perfil = 'all';

  $out = [
    'id'          => (string)($previo['id'] ?? ''),
    'nombre'      => $nombre,
    'descripcion' => $descripcion,
    'precio'      => $precio,
    'moneda'      => 'USD',
    'unidad'      => mb_substr(trim((string)($in['unidad'] ?? ($previo['unidad'] ?? 'servicio'))), 0, 40) ?: 'servicio',
    'categoria'   => categoria_servicio_valida(trim((string)($in['categoria'] ?? ($previo['categoria'] ?? 'otro')))),
    'perfil'      => $perfil,
    'icono'       => mb_substr(trim((string)($in['icono'] ?? ($previo['icono'] ?? '☕'))), 0, 8),
    'cobertura'   => mb_substr(trim((string)($in['cobertura'] ?? ($previo['cobertura'] ?? 'Ecuador'))), 0, 80),
    'gratis'      => $gratis,
    'disponible'  => array_key_exists('disponible', $in)
                       ? filter_var($in['disponible'], FILTER_VALIDATE_BOOLEAN)
                       : (bool)($previo['disponible'] ?? true),
    'created_at'  => (string)($previo['created_at'] ?? now_iso()),
  ];
  if (isset($previo['pago'])) $out['pago'] = $previo['pago'];
  return $out;
}

/** Identificador legible a partir del nombre, sin repetir. */
function servicio_id_nuevo(string $nombre, array $existentes): string {
  $base = mb_strtolower(trim($nombre));
  $base = strtr($base, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n','ü'=>'u']);
  $base = trim((string)preg_replace('/[^a-z0-9]+/', '-', $base), '-');
  if ($base === '') $base = 'servicio';
  $ids = array_map(fn($s) => (string)($s['id'] ?? ''), $existentes);
  $id = $base; $n = 2;
  while (in_array($id, $ids, true)) { $id = $base . '-' . $n; $n++; }
  return $id;
}

if ($action === 'admin_list') {
  servicio_admin_o_403();
  $oficiales = load_json('servicios', []);
  usort($oficiales, fn($a, $b) => strcmp((string)($a['nombre'] ?? ''), (string)($b['nombre'] ?? '')));
  ok(['servicios' => $oficiales, 'perfiles' => SERVICIO_PERFILES]);
}

if ($action === 'admin_save') {
  $u = servicio_admin_o_403();
  $id = trim((string)($in['id'] ?? ''));
  $oficiales = load_json('servicios', []);

  if ($id === '') {
    $nuevo = servicio_oficial_saneado($in, []);
    $nuevo['id'] = servicio_id_nuevo($nuevo['nombre'], $oficiales);
    $oficiales[] = $nuevo;
    save_json('servicios', $oficiales);
    registrar_actividad('servicio-plataforma-alta', [
      'objeto_tipo' => 'servicio', 'objeto_id' => $nuevo['id'],
      'detalle' => $nuevo['nombre'] . ' · $' . $nuevo['precio'],
    ]);
    ok(['servicio' => $nuevo, 'creado' => true]);
  }

  $encontrado = null;
  foreach ($oficiales as &$s) {
    if ((string)($s['id'] ?? '') !== $id) continue;
    $antes = $s;
    $s = servicio_oficial_saneado($in, $s);
    $s['id'] = $id;
    $encontrado = $s;
    if ((float)($antes['precio'] ?? 0) !== (float)$s['precio']) {
      registrar_actividad('servicio-plataforma-precio', [
        'objeto_tipo' => 'servicio', 'objeto_id' => $id,
        'detalle' => $s['nombre'] . ': $' . ($antes['precio'] ?? 0) . ' -> $' . $s['precio'],
        'monto' => $s['precio'],
      ]);
    }
    break;
  }
  unset($s);
  if (!$encontrado) fail('Servicio no encontrado.', 404);
  save_json('servicios', $oficiales);
  ok(['servicio' => $encontrado, 'creado' => false]);
}

if ($action === 'admin_delete') {
  servicio_admin_o_403();
  $id = trim((string)($in['id'] ?? ($_GET['id'] ?? '')));
  if ($id === '') fail('id requerido.', 422);
  $oficiales = load_json('servicios', []);
  $antes = count($oficiales);
  $oficiales = array_values(array_filter($oficiales, fn($s) => (string)($s['id'] ?? '') !== $id));
  if (count($oficiales) === $antes) fail('Servicio no encontrado.', 404);
  save_json('servicios', $oficiales);
  registrar_actividad('servicio-plataforma-baja', [
    'objeto_tipo' => 'servicio', 'objeto_id' => $id, 'detalle' => 'Retirado del catálogo',
  ]);
  ok(['eliminado' => $id]);
}

if ($action === 'list') {
  $u = current_user();
  $haySesion = $u !== null || !empty($_SESSION['admin']);
  $oficiales = load_json('servicios', []);
  $ids = array_map(fn($s) => (string)($s['id'] ?? ''), $oficiales);
  if (!in_array('intermediacion-compraventa', $ids, true)) {
    $oficiales[] = servicio_intermediacion_redcafe();
  }
  $items = array_merge(array_map('servicio_redcafe_marketplace', array_values(array_filter($oficiales, fn($s) => !isset($s['disponible']) || !empty($s['disponible'])))), load_json('servicios-terceros', []));
  $visibles = array_values(array_filter($items, function ($s) use ($haySesion) {
    if (!empty($s['oculto']) || !publicacion_visible($s)) return false;
    $v = $s['visibilidad'] ?? 'publico';
    return $v === 'publico' || $haySesion;
  }));
  $visibles = array_map(function ($s) {
    if (!isset($s['precio_etiqueta'])) {
      $gratis = !empty($s['gratis']) || ($s['plan'] ?? '') === 'gratis';
      $s['precio_etiqueta'] = servicio_precio_etiqueta($s['precio'] ?? 0, $gratis);
    }
    return $s;
  }, $visibles);
  usort($visibles, 'servicio_orden_publicacion');
  // El servicio de un miembro guarda su correo. Sin sesión no debe salir: el
  // contacto público es el WhatsApp del botón. Los servicios oficiales de
  // Red Café sí llevan la dirección de la propia plataforma, que es pública.
  if (!$haySesion) {
    // Sin sesión se retira TODO el contacto de un servicio publicado por un
    // miembro: correo y también WhatsApp. Quitar solo el correo dejaba el
    // teléfono de una persona real a la vista de cualquiera. Los servicios
    // oficiales conservan el contacto de la propia plataforma, que es público.
    $visibles = array_map(function ($s) {
      if (empty($s['oficial_redcafe'])) {
        unset($s['email'], $s['whatsapp'], $s['whatsapp_link']);
      }
      return $s;
    }, $visibles);
  }
  ok(['servicios' => $visibles]);
}

if ($action === 'mine' || $action === 'mis_servicios') {
  $u = require_user();
  $ownerId = (string)($u['id'] ?? '');
  $esAdmin = miembro_tiene_rol($u, 'admin');
  if ($ownerId === '' && !$esAdmin) fail('Sesión inválida. Vuelve a iniciar sesión.', 401);
  $items = load_json('servicios-terceros', []);
  $propios = array_values(array_filter($items, fn($s) => $esAdmin || servicio_owner_id($s) === $ownerId));
  usort($propios, 'servicio_orden_publicacion');
  ok(['servicios' => $propios, 'admin' => $esAdmin]);
}

if ($action === 'publish') {
  // Mismo motivo que en los lotes: publicar avisa a la administración y al muro.
  if (!check_rate_limit('servicio_publicar', 30, 3600)) {
    fail('Has publicado demasiado seguido. Vuelve a intentarlo en una hora.', 429);
  }

  $u = require_user();
  $titulo = trim((string)($in['titulo'] ?? ''));
  $descripcion = trim((string)($in['descripcion'] ?? ''));
  $provincia = trim((string)($in['provincia'] ?? ''));
  $cobertura = trim((string)($in['cobertura'] ?? ''));
  $categoria = categoria_servicio_valida(trim((string)($in['categoria'] ?? 'otro')));
  $precio = floatval($in['precio'] ?? 0);
  $unidad = trim((string)($in['unidad'] ?? 'servicio'));
  $imagenes = servicio_imagenes_validas($in['imagenes'] ?? []);

  if ($titulo === '' || $descripcion === '') fail('Título y descripción requeridos.', 422);
  if (mb_strlen($titulo) > 90) fail('Título demasiado largo.', 422);
  if (mb_strlen($descripcion) > 600) fail('Descripción demasiado larga.', 422);
  if (mb_strlen($provincia) > 80 || mb_strlen($cobertura) > 120 || mb_strlen($unidad) > 40) {
    fail('Revisa provincia, cobertura o unidad.', 422);
  }

  // DECISIÓN DEL PROPIETARIO (23 sep 2026): la visibilidad ya no se hereda del
  // perfil del miembro. Si quien publica no dice nada, el servicio sale público;
  // solo queda «solo miembros» si el miembro lo pide expresamente en el form.
  $vis = ($in['visibilidad'] ?? 'publico') === 'registrados' ? 'registrados' : 'publico';
  $servicio = [
    'id' => uid(),
    'titulo' => $titulo,
    'categoria' => $categoria,
    'descripcion' => mb_substr($descripcion, 0, 600),
    'provincia' => $provincia,
    'cobertura' => $cobertura,
    'precio' => max(0, $precio),
    'unidad' => $unidad !== '' ? $unidad : 'servicio',
    'imagenes' => $imagenes,
    'proveedor' => $u['nombre'],
    'proveedor_id' => $u['id'],
    'proveedor_rol' => $u['rol'],
    'proveedor_roles' => miembro_roles($u),
    'whatsapp' => redcafe_whatsapp_display($u['whatsapp'] ?? $u['telefono'] ?? ''),
    'whatsapp_link' => redcafe_whatsapp_link_digits($u['whatsapp'] ?? $u['telefono'] ?? ''),
    'email' => $u['email'] ?? '',
    'visibilidad' => $vis,
    // Igual que en los lotes: el sello del servicio se concede revisándolo,
    // no se copia del perfil de quien lo publica ni de su rol.
    'verificado' => false,
    'oculto' => false,
    'created_at' => now_iso(),
  ];
  mutate_json('servicios-terceros', [], function (array $items) use ($servicio) { $items[] = $servicio; return $items; });
  publicar_aviso_comunidad('servicio', $servicio);
  registrar_actividad('servicio-publicado', [
    'objeto_tipo' => 'servicio',
    'objeto_id'   => (string)($servicio['id'] ?? ''),
    'detalle'     => (string)($servicio['titulo'] ?? '') . ' · ' . (string)($servicio['provincia'] ?? ''),
    'monto'       => $servicio['precio'] ?? null,
  ]);
  notificar_admins('servicio', 'Nuevo servicio publicado: ' . (string)($servicio['titulo'] ?? ''),
    (string)($servicio['categoria'] ?? '') . ' · ' . (string)($servicio['provincia'] ?? '') . '.',
    '/marketplace/');
  ok(['servicio' => $servicio]);
}

if ($action === 'delete') {
  $u = servicio_usuario_o_admin();
  $id = $_GET['id'] ?? '';
  if (!$id) fail('id requerido.', 422);
  $items = load_json('servicios-terceros', []);
  $objetivo = null;
  foreach ($items as $s) {
    if (($s['id'] ?? '') === $id) { $objetivo = $s; break; }
  }
  if (!$objetivo) fail('Servicio no encontrado.', 404);
  $autorizado = (servicio_owner_id($objetivo) === ($u['id'] ?? '')) || !empty($_SESSION['admin']);
  if (!$autorizado) fail('No autorizado.', 403);
  mutate_json('servicios-terceros', [], fn(array $items) => array_values(array_filter($items, fn($s) => ($s['id'] ?? '') !== $id)));
  ok();
}

if ($action === 'update') {
  $u = servicio_usuario_o_admin();
  $id = trim((string)($in['id'] ?? ($_GET['id'] ?? '')));
  if ($id === '') fail('id requerido.', 422);
  $updated = null;
  mutate_json('servicios-terceros', [], function (array $items) use ($id, $in, $u, &$updated) {
  foreach ($items as &$s) {
    if (($s['id'] ?? '') !== $id) continue;
    $owner = servicio_owner_id($s);
    if ($owner !== ($u['id'] ?? '') && !miembro_tiene_rol($u, 'admin')) {
      fail('No autorizado: solo el dueño o un administrador puede editar este servicio.', 403);
    }
    // Los mismos topes que al publicar; antes la edición los saltaba.
    foreach (['titulo' => 90, 'descripcion' => 600, 'provincia' => 80, 'cobertura' => 120, 'unidad' => 40] as $field => $max) {
      if (!array_key_exists($field, $in)) continue;
      $v = texto_entrada($in[$field], $max, $field === 'descripcion');
      if ($v === '' && in_array($field, ['titulo', 'descripcion'], true)) continue;
      $s[$field] = $v;
    }
    if (array_key_exists('visibilidad', $in)) $s['visibilidad'] = $in['visibilidad'] === 'registrados' ? 'registrados' : 'publico';
    if (array_key_exists('categoria', $in)) $s['categoria'] = categoria_servicio_valida((string)$in['categoria']);
    if (array_key_exists('precio', $in)) $s['precio'] = max(0, floatval($in['precio']));
    if (array_key_exists('imagenes', $in)) $s['imagenes'] = servicio_imagenes_validas($in['imagenes']);
    $s['updated_at'] = now_iso();
    $s['updated_by'] = $u['id'] ?? '';
    $updated = $s;
    break;
  }
  unset($s);
  return $items;
  });
  if (!$updated) fail('Servicio no encontrado.', 404);
  ok(['servicio' => $updated]);
}

fail('Acción no válida.', 400);
