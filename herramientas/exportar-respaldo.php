<?php
/*
 * Red Café Ecuador — exportar el respaldo del sitio PHP en un solo .zip
 * ---------------------------------------------------------------------------
 * Uso (ver servidor/IMPORTAR-DATOS-SEGURO.md):
 *   1. Sube este archivo a public_html/ del hosting antiguo (Administrador de
 *      archivos de cPanel). Puedes cambiarle el nombre por uno difícil de adivinar.
 *   2. Ábrelo en el navegador (https://redcafeecuador.com/exportar-respaldo.php),
 *      escribe la contraseña de administración y pulsa «Descargar respaldo».
 *   3. Abre el .zip con herramientas/procesar-respaldo.html (en tu equipo).
 *
 * Qué lleva el .zip (las mismas rutas que espera procesar-respaldo.html):
 *   data/*.json, data/paginas/*, los secretos que mantienen válidos enlaces y
 *   avisos, uploads/user-content/* (fotos y PDF) y .redcafe_admin_pass (hash).
 * Qué NO lleva: sesiones, códigos OTP, cupos, bloqueos, enlaces de recuperación,
 *   copias antiguas, PHP ni configuración. El .zip se crea en la carpeta temporal
 *   del hosting, se envía y se borra en la misma petición.
 * Por defecto el script se borra a sí mismo al terminar: no queda nada que atacar.
 */
declare(strict_types=1);

const RC_MAX_INTENTOS = 5;          // por IP y hora
const RC_NUNCA = '/^(sessions?|sess.*|otp.*|rate.*|locks?|mail-debug|password-resets)(\.json)?$/i';
const RC_SECRETOS = ['.moderacion_secreto', '.baja_correo_secreto', '.respaldo_token', '.push_vapid.json'];
const RC_SUBIDA = '/^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(jpe?g|png|webp|gif|pdf)$/i';

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");

$raiz = __DIR__;                               // public_html
$dataDir = $raiz . '/data';
$subidas = $raiz . '/uploads/user-content';

function rc_pagina(string $cuerpo, int $codigo = 200): never {
  http_response_code($codigo);
  header('Content-Type: text/html; charset=utf-8');
  echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<meta name="robots" content="noindex"><title>Exportar respaldo · Red Café</title><style>'
    . 'body{font:16px/1.5 system-ui,sans-serif;background:#fbf7f1;color:#2b1a12;margin:0;padding:24px}'
    . 'main{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6d9c8;border-radius:14px;padding:24px}'
    . 'h1{font-size:1.4rem;margin:0 0 .5rem;color:#a20e00}label{display:block;margin:.8rem 0 .3rem;font-weight:600}'
    . 'input[type=password]{width:100%;box-sizing:border-box;padding:.6rem;border:1px solid #b9a690;border-radius:8px;font:inherit}'
    . '.op{font-weight:400;display:flex;gap:.5rem;align-items:flex-start}button{margin-top:1rem;background:#a20e00;color:#fff;border:0;border-radius:8px;padding:.7rem 1.2rem;font:inherit;font-weight:600;cursor:pointer}'
    . '.nota{font-size:.9rem;color:#5c4636}.error{background:#fdecea;border:1px solid #a20e00;padding:.6rem;border-radius:8px}'
    . 'table{border-collapse:collapse;width:100%;font-size:.9rem}td{border-bottom:1px solid #eee;padding:.25rem 0}td+td{text-align:right}'
    . '</style></head><body><main>' . $cuerpo . '</main></body></html>';
  exit;
}

function rc_h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

/** Misma lógica que api/auth.php, pero sin crear el archivo si no existe. */
function rc_pass_guardada(string $raiz): string {
  foreach ([dirname($raiz) . '/.redcafe_admin_pass', $raiz . '/data/.redcafe_admin_pass'] as $f) {
    if (is_file($f)) {
      $raw = preg_replace('/^\xEF\xBB\xBF/', '', (string)file_get_contents($f));
      $pass = rtrim(trim($raw), "\r\n");
      if ($pass !== '') return $pass;
    }
  }
  return '';
}

function rc_pass_ok(string $entrada, string $guardada): bool {
  if ($guardada === '' || $entrada === '') return false;
  if (str_starts_with($guardada, '$2y$') || str_starts_with($guardada, '$2b$')) return password_verify($entrada, $guardada);
  return hash_equals($guardada, $entrada);
}

/** Cupo de intentos por IP (archivo en la carpeta temporal, fuera del sitio). */
function rc_cupo(bool $sumar): int {
  $f = sys_get_temp_dir() . '/redcafe-exportar-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __FILE__) . '.json';
  $lista = is_file($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : [];
  $lista = array_values(array_filter($lista, fn($t) => is_int($t) && $t > time() - 3600));
  if ($sumar) { $lista[] = time(); @file_put_contents($f, json_encode($lista), LOCK_EX); @chmod($f, 0600); }
  return count($lista);
}

/** Lista [ruta dentro del zip => ruta en disco] con lo que procesar-respaldo.html acepta. */
function rc_inventario(string $raiz, string $dataDir, string $subidas, bool $conFotos): array {
  $out = [];
  if (is_dir($dataDir)) {
    foreach (scandir($dataDir) ?: [] as $base) {
      $ruta = $dataDir . '/' . $base;
      if (!is_file($ruta) || is_link($ruta)) continue;
      if (in_array($base, RC_SECRETOS, true)) { $out['data/' . $base] = $ruta; continue; }
      if ($base[0] === '.' || !preg_match('/\.json$/i', $base)) continue;
      if (preg_match(RC_NUNCA, $base) || preg_match('/\.(copia|bak)-/', $base)) continue;
      $out['data/' . $base] = $ruta;
    }
    $paginas = $dataDir . '/paginas';
    if (is_dir($paginas)) {
      foreach (scandir($paginas) ?: [] as $base) {
        $ruta = $paginas . '/' . $base;
        if (is_file($ruta) && !is_link($ruta) && preg_match('/^[a-z0-9][a-z0-9\-_]{1,80}\.(md|meta\.json)$/', $base)) $out['data/paginas/' . $base] = $ruta;
      }
    }
  }
  if ($conFotos && is_dir($subidas)) {
    foreach (scandir($subidas) ?: [] as $base) {
      $ruta = $subidas . '/' . $base;
      if (is_file($ruta) && !is_link($ruta) && preg_match(RC_SUBIDA, $base)) $out['uploads/user-content/' . $base] = $ruta;
    }
  }
  foreach ([dirname($raiz) . '/.redcafe_admin_pass', $dataDir . '/.redcafe_admin_pass'] as $f) {
    if (is_file($f)) { $out['.redcafe_admin_pass'] = $f; break; }
  }
  return $out;
}

$formulario = '<h1>Exportar respaldo del sitio</h1>'
  . '<p class="nota">Descarga en un .zip los datos de <code>data/</code>, las fotos de los miembros y la contraseña de administración (cifrada). '
  . 'Luego ábrelo en tu equipo con <code>procesar-respaldo.html</code>. Nada se envía a otro sitio.</p>'
  . '<form method="post" autocomplete="off">'
  . '<label for="pass">Contraseña de administración</label><input type="password" id="pass" name="pass" required autofocus>'
  . '<label class="op"><input type="checkbox" name="fotos" value="1" checked> Incluir fotos y PDF (<code>uploads/user-content/</code>)</label>'
  . '<label class="op"><input type="checkbox" name="borrar" value="1" checked> Borrar este archivo del hosting al terminar (recomendado)</label>'
  . '<button type="submit">Descargar respaldo</button></form>';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') rc_pagina($formulario);

if (rc_cupo(false) >= RC_MAX_INTENTOS) rc_pagina('<p class="error">Demasiados intentos. Espera una hora.</p>', 429);
$guardada = rc_pass_guardada($raiz);
if ($guardada === '') rc_pagina('<p class="error">No encontré <code>.redcafe_admin_pass</code>. ¿Subiste el script a <code>public_html/</code>?</p>', 500);
if (!rc_pass_ok((string)($_POST['pass'] ?? ''), $guardada)) {
  rc_cupo(true);
  usleep(800000);
  rc_pagina('<p class="error">Contraseña incorrecta.</p>' . $formulario, 403);
}
if (!class_exists('ZipArchive')) rc_pagina('<p class="error">Este hosting no tiene la extensión <code>zip</code> de PHP. Actívala en cPanel → «Seleccionar versión de PHP» → Extensiones → <code>zip</code>, o descarga las carpetas a mano.</p>', 500);

$archivos = rc_inventario($raiz, $dataDir, $subidas, !empty($_POST['fotos']));
if (!array_filter(array_keys($archivos), fn($k) => str_starts_with($k, 'data/'))) rc_pagina('<p class="error">No encontré archivos en <code>data/</code>.</p>', 500);
if (count($archivos) > 60000) rc_pagina('<p class="error">Hay demasiados archivos para un solo .zip. Desmarca «Incluir fotos» y descarga <code>uploads/</code> aparte.</p>', 500);

@set_time_limit(0);
@ignore_user_abort(false);
$tmp = tempnam(sys_get_temp_dir(), 'rcexp');
if ($tmp === false) rc_pagina('<p class="error">No se pudo crear el archivo temporal.</p>', 500);
register_shutdown_function(function () use ($tmp) { if (is_file($tmp)) @unlink($tmp); });

$zip = new ZipArchive();
if ($zip->open($tmp, ZipArchive::OVERWRITE) !== true) rc_pagina('<p class="error">No se pudo crear el .zip.</p>', 500);
$bytes = 0;
foreach ($archivos as $nombre => $ruta) {
  $zip->addFile($ruta, $nombre);
  // Las fotos ya vienen comprimidas: guardarlas tal cual es más rápido.
  if (str_starts_with($nombre, 'uploads/') && method_exists($zip, 'setCompressionName')) $zip->setCompressionName($nombre, ZipArchive::CM_STORE);
  $bytes += (int)@filesize($ruta);
}
$resumen = ['generado' => gmdate('c'), 'archivos' => count($archivos), 'bytes_originales' => $bytes, 'formato' => 'redcafe-exportar/1'];
$zip->addFromString('LEEME-respaldo.txt', json_encode($resumen, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
if (!$zip->close()) rc_pagina('<p class="error">Falló al cerrar el .zip (¿espacio en el hosting?). Prueba sin fotos.</p>', 500);
if (filesize($tmp) >= 4294967295) rc_pagina('<p class="error">El .zip pasa de 4 GB. Desmarca «Incluir fotos» y descarga <code>uploads/</code> aparte.</p>', 500);

if (!empty($_POST['borrar'])) @unlink(__FILE__);
while (ob_get_level()) ob_end_clean();
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="redcafe-respaldo-' . gmdate('Ymd-His') . '.zip"');
header('Content-Length: ' . filesize($tmp));
readfile($tmp);
@unlink($tmp);
exit;
