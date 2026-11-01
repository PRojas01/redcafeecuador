<?php
/**
 * API de Imágenes editables — Red Café Ecuador.
 *
 * Sistema de huecos (slots) definidos por el código en data/slots.json (catálogo
 * CERRADO; el usuario no puede crear huecos). Cada slot tiene proporción fija y
 * ancho máximo: sustituir una imagen nunca descuadra la maqueta.
 *
 * Las imágenes se almacenan reencodadas SIEMPRE con GD en public/uploads/ bajo un
 * nombre generado por el servidor (uid().'.jpg'), con permisos 0644. El original
 * del cliente se descarta tras el reencodado para destruir cualquier carga útil
 * escondida en los metadatos. public/uploads/.htaccess desactiva la ejecución PHP.
 *
 * Almacén: data/imagenes.json mapea hueco ocupado -> archivo, con quién subió y
 * cuándo. Se lee/escribe con acceso directo a archivo (todavía no está en la
 * whitelist de _bootstrap), nunca con un nombre que venga del cliente.
 *
 * Acciones:
 *   ?action=map      público, sin sesión: { slots: catálogo, map: { slot: url } }.
 *                    Cacheable. Es lo único que consume el frontend estático.
 *   ?action=subir    requiere sesión; comprueba permiso según el ámbito del slot.
 *                    Multipart: slot, [recurso], archivo (campo 'archivo').
 *   ?action=borrar   idem; borra por el hueco registrado en imagenes.json, NUNCA por
 *                    una ruta que venga del cliente.
 *   ?action=listar   admin: inventario completo con peso y fecha.
 *
 * PERMISOS: ámbito "plataforma" exige !empty($_SESSION['admin']). Los demás ámbitos
 * exigen que el solicitante sea el DUEÑO del recurso, comprobado SIEMPRE leyendo el
 * almacén (members.json / lotes.json), nunca fiándose de un id que venga en la
 * petición. La comprobación es una guarda explícita al principio de cada acción con
 * fail(..., 403) y return.
 */

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/_bootstrap.php';

const IMAGENES_FILE           = DATA_DIR . '/imagenes.json';
const SLOTS_FILE              = DATA_DIR . '/slots.json';
const UPLOADS_DIR             = __DIR__ . '/../uploads';
const MAX_BYTES               = 2 * 1024 * 1024;          // 2 MB
const MAX_IMAGENES_POR_MIEMBRO = 30;
const PESO_MAX_KB             = 2048;                      // informativo para el cliente
const TIPOS_PERMITIDOS        = ['image/jpeg', 'image/png', 'image/webp'];

// ─── Catálogo de huecos (slots.json, definido por el código) ───────────────

function slots_read(): array {
  if (!file_exists(SLOTS_FILE)) {
    fail('Catálogo de huecos no configurado.', 500);
  }
  $raw = @file_get_contents(SLOTS_FILE);
  $j = json_decode((string)$raw, true);
  if (!is_array($j) || !is_array($j['slots'] ?? null)) {
    fail('Catálogo de huecos inválido.', 500);
  }
  $out = [];
  foreach ($j['slots'] as $s) {
    $id = $s['id'] ?? '';
    if (!is_string($id) || $id === '') continue;
    $out[$id] = [
      'id'          => $id,
      'nombre'      => $s['nombre'] ?? $id,
      'proporcion'  => $s['proporcion'] ?? '1:1',
      'ancho_max'   => (int)($s['ancho_max'] ?? 1600),
      'ambito'      => $s['ambito'] ?? 'plataforma',
      'lamina'      => $s['lamina'] ?? null,
      'peso_max_kb' => (int)($j['peso_max_kb'] ?? PESO_MAX_KB),
    ];
  }
  return $out;
}

// ─── Almacén de imágenes: acceso directo a file (fuera de whitelist aún) ───

function imagenes_read(): array {
  if (!file_exists(IMAGENES_FILE)) {
    return ['items' => [], 'updated_at' => null];
  }
  $raw = @file_get_contents(IMAGENES_FILE);
  $j = json_decode((string)$raw, true);
  if (!is_array($j)) return ['items' => [], 'updated_at' => null];
  $items = $j['items'] ?? [];
  return [
    'items'      => is_array($items) ? $items : [],
    'updated_at' => $j['updated_at'] ?? null,
  ];
}

function imagenes_save(array $items): void {
  $tmp = IMAGENES_FILE . '.tmp';
  $fp = @fopen($tmp, 'w');
  if (!$fp) fail('No se pudo escribir el almacén de imágenes.', 500);
  flock($fp, LOCK_EX);
  fwrite($fp, json_encode(
    ['items' => $items, 'updated_at' => gmdate('c')],
    JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
  ));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  if (!@rename($tmp, IMAGENES_FILE)) fail('No se pudo guardar el almacén de imágenes.', 500);
  @chmod(IMAGENES_FILE, 0644);
}

// ─── Resolución del slot y de la clave de almacén ──────────────────────────

function resolver_slot(array $slots): array {
  $id = trim((string)($_POST['slot'] ?? $_GET['slot'] ?? ''));
  if ($id === '') fail('Slot requerido.', 422);
  $s = $slots[$id] ?? null;
  if (!$s) fail('Slot no existe.', 422);
  $recurso = null;
  if (in_array($s['ambito'], ['perfil', 'lote', 'local'], true)) {
    $recurso = trim((string)($_POST['recurso'] ?? $_GET['recurso'] ?? ''));
    if ($recurso === '' || !preg_match('/^[A-Za-z0-9_\-]{1,64}$/', $recurso)) {
      fail('recurso inválido para este slot.', 422);
    }
  }
  return [$s, $recurso];
}

function slot_key(string $slotId, ?string $recurso): string {
  return $recurso === null ? $slotId : $slotId . ':' . $recurso;
}

function guardar_permiso(array $slot, ?string $recurso): void {
  $ambito = $slot['ambito'];

  if ($ambito === 'plataforma') {
    if (empty($_SESSION['admin'])) {
      fail('Solo administradores.', 403);
    }
    return;
  }

  $u = current_user();
  if (!$u) {
    fail('No autenticado.', 401);
  }
  $uid = $u['id'] ?? '';

  if ($ambito === 'perfil') {
    // El dueño del perfil es el miembro cuyo id == recurso, leído del almacén.
    $members = load_json('members', []);
    $found = false;
    foreach ($members as $m) {
      if (($m['id'] ?? '') === $recurso) { $found = true; break; }
    }
    if (!$found) fail('Perfil no encontrado en el almacén.', 403);
    if ($uid !== $recurso) fail('No eres el dueño de este perfil.', 403);
    return;
  }

  if ($ambito === 'lote') {
    // El dueño del lote se lee del almacén de lotes, no del cliente.
    $lotes = load_json('lotes', []);
    $owner = null;
    foreach ($lotes as $l) {
      if (($l['id'] ?? '') === $recurso) {
        $owner = $l['productor_id'] ?? $l['published_by'] ?? null;
        break;
      }
    }
    if ($owner === null) fail('Lote no encontrado en el almacén.', 403);
    if ($uid !== $owner) fail('No eres el dueño de este lote.', 403);
    return;
  }

  if ($ambito === 'local') {
    // El local es un miembro con rol 'bar'; su dueño se lee del almacén.
    $members = load_json('members', []);
    $found = null;
    foreach ($members as $m) {
      if (($m['id'] ?? '') === $recurso) { $found = $m; break; }
    }
    if (!$found) fail('Local no encontrado en el almacén.', 403);
    if (!miembro_tiene_rol($found, 'bar')) fail('El recurso no es un local.', 403);
    if ($uid !== $recurso) fail('No eres el dueño de este local.', 403);
    return;
  }

  fail('Ámbito de slot desconocido.', 500);
}

// ─── Reencodado con GD: redimensiona al ancho máximo y recorta a la proporción ─

function slot_ratio(array $slot): float {
  $p = $slot['proporcion'] ?? '1:1';
  $parts = explode(':', (string)$p);
  $w = (float)($parts[0] ?? 1);
  $h = (float)($parts[1] ?? 1);
  if ($w <= 0 || $h <= 0) return 1.0;
  return $w / $h;
}

function reencodar_imagen(string $tmp, string $mime, array $slot): array {
  switch ($mime) {
    case 'image/jpeg': $src = @imagecreatefromjpeg($tmp); break;
    case 'image/png':  $src = @imagecreatefrompng($tmp);  break;
    case 'image/webp': $src = @imagecreatefromwebp($tmp); break;
    default:           $src = false;
  }
  if (!$src) fail('No se pudo decodificar la imagen.', 422);

  $srcW = imagesx($src);
  $srcH = imagesy($src);
  if ($srcW < 1 || $srcH < 1) {
    imagedestroy($src);
    fail('Imagen vacía.', 422);
  }

  // 1) Escala para que el ancho no supere ancho_max (nunca upscalar).
  $maxW = max(1, $slot['ancho_max']);
  $scale = min(1.0, $maxW / $srcW);
  $curW = max(1, (int)round($srcW * $scale));
  $curH = max(1, (int)round($srcH * $scale));

  // 2) Recorte al centro para la proporción exacta del hueco.
  $ratio = slot_ratio($slot);
  $previstaH = $curW / $ratio;
  if ($curH > $previstaH) {
    $dstW = $curW;
    $dstH = max(1, (int)round($previstaH));
    $srcX = 0;
    $srcY = (int)(($curH - $dstH) / 2);
  } else {
    $dstW = max(1, (int)round($curH * $ratio));
    $dstH = $curH;
    $srcX = (int)(($curW - $dstW) / 2);
    $srcY = 0;
  }

  $out = imagecreatetruecolor($dstW, $dstH);
  if (!$out) {
    imagedestroy($src);
    fail('No se pudo crear la imagen de destino.', 500);
  }
  $blanco = imagecolorallocate($out, 255, 255, 255);
  imagefilledrectangle($out, 0, 0, $dstW, $dstH, $blanco);
  imagecopyresampled($out, $src, 0, 0, $srcX, $srcY, $dstW, $dstH, $curW, $curH);
  imagedestroy($src);

  // El archivo final SIEMPRE es JPEG (uid().'.jpg'); el reencodado destruye los
  // metadatos del original.
  ob_start();
  imagejpeg($out, null, 82);
  $raw = ob_get_clean();
  imagedestroy($out);
  if ($raw === false || $raw === '') {
    fail('No se pudo codificar la imagen final.', 500);
  }
  return [$raw, $dstW, $dstH];
}

// ─── Acciones ──────────────────────────────────────────────────────────────

$action = $_GET['action'] ?? '';

switch ($action) {

  // Público, sin sesión. Es lo único que consume el frontend estático.
  case 'map': {
    $slots = slots_read();
    $inv = imagenes_read();
    $map = [];
    foreach ($inv['items'] as $it) {
      $archivo = $it['archivo'] ?? '';
      if (!is_string($archivo) || $archivo === '') continue;
      $map[$it['slot'] . (($it['recurso'] ?? null) !== null ? ':' . $it['recurso'] : '')] = '/uploads/' . basename($archivo);
    }
    // Cacheable (override del no-store del bootstrap, que aplica a APIs privadas).
    header('Cache-Control: public, max-age=300');
    ok(['slots' => $slots, 'map' => $map, 'peso_max_kb' => PESO_MAX_KB]);
    return;
  }

  case 'subir': {
    [$slot, $recurso] = resolver_slot(slots_read());

    // Guardas explícitas al inicio de la acción (no repetir el patrón de comunidad.php).
    guardar_permiso($slot, $recurso);
    $u = current_user();

    if (!check_rate_limit('subir_imagen', 20, 3600)) {
      fail('Demasiadas subidas. Intenta más tarde.', 429);
    }

    // Cuota: máximo 30 imágenes por miembro (admin exento). Se cuenta primero para
    // no procesar archivos que de todos modos se rechazarían.
    $items = imagenes_read()['items'];
    $key = slot_key($slot['id'], $recurso);
    if (empty($_SESSION['admin'])) {
      $uid = $u['id'] ?? '';
      $reemplazaAlguna = isset($items[$key]) && ($items[$key]['subido_por'] ?? '') === $uid;
      if (!$reemplazaAlguna) {
        $n = 0;
        foreach ($items as $it) {
          if (($it['subido_por'] ?? '') === $uid) $n++;
        }
        if ($n >= MAX_IMAGENES_POR_MIEMBRO) {
          fail('Cuota alcanzada: máximo ' . MAX_IMAGENES_POR_MIEMBRO . ' imágenes por miembro.', 429);
        }
      }
    }

    // a) Error de subida del propio PHP
    if (empty($_FILES['archivo'])) fail('No se recibió ningún archivo.', 422);
    $f = $_FILES['archivo'];
    if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) fail('Error en la carga del archivo.', 422);
    if (empty($f['tmp_name']) || !is_uploaded_file($f['tmp_name'])) fail('Archivo inválido.', 422);

    // b) Tamaño máximo 2 MB, comprobado en servidor
    $size = (int)($f['size'] ?? 0);
    if ($size <= 0) fail('Archivo vacío.', 422);
    if ($size > MAX_BYTES) fail('Máximo 2 MB por imagen.', 413);

    // c) Tipo real con finfo Y getimagesize; nunca extensión ni Content-Type del navegador
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = $finfo ? finfo_file($finfo, $f['tmp_name']) : false;
    if ($finfo) finfo_close($finfo);
    $meta = @getimagesize($f['tmp_name']);
    if (!$mime || !$meta) fail('El archivo no es una imagen válida.', 422);
    if (!in_array($mime, TIPOS_PERMITIDOS, true)) fail('Formato no permitido (JPG, PNG o WebP).', 422);

    // d) + e) Reencodar SIEMPRE con GD (descarta el original), redimensionar y recortar
    if (!is_dir(UPLOADS_DIR)) @mkdir(UPLOADS_DIR, 0755, true);
    [$raw, $wOut, $hOut] = reencodar_imagen($f['tmp_name'], $mime, $slot);

    // f) Nombre generado por el servidor; el del cliente nunca se usa
    $nombre = uid() . '.jpg';
    $dest = UPLOADS_DIR . '/' . $nombre;
    if (file_put_contents($dest, $raw) === false) {
      fail('No se pudo guardar la imagen.', 500);
    }

    // g) Permisos 0644
    @chmod($dest, 0644);

    // Si el hueco ya estaba ocupado, se descarta el archivo anterior.
    if (isset($items[$key]) && !empty($items[$key]['archivo'])) {
      $viejo = UPLOADS_DIR . '/' . basename($items[$key]['archivo']);
      if (is_file($viejo)) @unlink($viejo);
    }

    $items[$key] = [
      'slot'         => $slot['id'],
      'recurso'      => $recurso,
      'archivo'      => $nombre,
      'peso'         => filesize($dest),
      'ancho'        => $wOut,
      'alto'         => $hOut,
      'subido_por'   => !empty($_SESSION['admin']) ? 'admin' : ($u['id'] ?? ''),
      'nombre_subio' => $u['nombre'] ?? 'Admin de la Red',
      'fecha'        => now_iso(),
    ];
    imagenes_save($items);

    ok([
      'slot'  => $slot['id'],
      'url'   => '/uploads/' . $nombre,
      'peso'  => filesize($dest),
      'peso_original' => $size,
      'ancho' => $wOut,
      'alto'  => $hOut,
    ]);
    return;
  }

  case 'borrar': {
    [$slot, $recurso] = resolver_slot(slots_read());
    guardar_permiso($slot, $recurso);

    // Se borra por el hueco registrado en imagenes.json, nunca por una ruta del cliente.
    $key = slot_key($slot['id'], $recurso);
    $items = imagenes_read()['items'];
    if (!isset($items[$key])) fail('No hay imagen registrada en este hueco.', 404);

    $archivo = $items[$key]['archivo'] ?? '';
    unset($items[$key]);
    imagenes_save($items);

    if (is_string($archivo) && $archivo !== '') {
      // basename() como defensa en profundidad: jamás se borra fuera de uploads/.
      $path = UPLOADS_DIR . '/' . basename($archivo);
      if (is_file($path)) @unlink($path);
    }
    ok(['slot' => $slot['id'], 'restaurada' => true]);
    return;
  }

  case 'listar': {
    require_admin();
    $slots = slots_read();
    $inv = imagenes_read();
    $inventario = [];
    foreach ($inv['items'] as $key => $it) {
      $archivo = $it['archivo'] ?? '';
      if (!is_string($archivo) || $archivo === '') continue;
      $peso = (int)($it['peso'] ?? 0);
      $inventario[$key] = [
        'slot'     => $it['slot'] ?? '',
        'recurso'  => $it['recurso'] ?? null,
        'url'      => '/uploads/' . basename($archivo),
        'peso'     => $peso,
        'peso_kb'  => round($peso / 1024, 1),
        'ancho'    => $it['ancho'] ?? null,
        'alto'     => $it['alto'] ?? null,
        'subido_por'   => $it['subido_por'] ?? '',
        'nombre_subio' => $it['nombre_subio'] ?? '',
        'fecha'        => $it['fecha'] ?? '',
      ];
    }
    ok(['slots' => $slots, 'inventario' => $inventario]);
    return;
  }

  default:
    fail('Acción no válida. Use map|subir|borrar|listar.');
}
