<?php
/**
 * Red Café Ecuador — respaldos automáticos de los datos reales
 * ---------------------------------------------------------------------------
 * Todo lo que la plataforma guarda vive en archivos JSON dentro de data/:
 * miembros, lotes, servicios, pedidos, cursos, mensajes, avisos. Un borrado
 * accidental, una extracción de ZIP encima o un fallo del hosting se los lleva
 * por delante, y el hosting compartido no garantiza copias que uno pueda
 * recuperar cuando hacen falta.
 *
 * Aquí se hace la copia:
 *   - se guarda FUERA de public_html si el hosting lo permite; si no, en
 *     data/_respaldos, que el .htaccess ya bloquea al público;
 *   - se dispara sola: la primera visita de cada día a la campana la lanza,
 *     sin tareas programadas (el hosting no las garantiza);
 *   - también se puede lanzar desde cPanel con una tarea programada, usando
 *     el token de data/.respaldo_token;
 *   - se rota: 7 diarias, 4 semanales y 6 mensuales;
 *   - descargar y borrar es cosa de la administración, nunca del público.
 *
 * Lo que NO entra en la copia: la contraseña de administración, el token de
 * respaldos y los contadores de límite de peticiones. Un respaldo que se
 * filtra no debe entregar además las llaves de la casa.
 */

declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

const RESPALDO_EXCLUIDOS = ['.redcafe_admin_pass', '.admin_pass_expira', '.respaldo_token', '.rate', '.push_vapid.json'];
const RESPALDO_DIARIOS   = 7;
const RESPALDO_SEMANALES = 4;
const RESPALDO_MENSUALES = 6;
const RESPALDO_MAX_MB    = 200;

/** Carpeta de las copias: fuera de public_html si se puede. */
function respaldo_dir(): string {
  $fuera = dirname(__DIR__, 2) . '/redcafe-respaldos';
  if (is_dir($fuera) || @mkdir($fuera, 0700, true)) {
    if (is_writable($fuera)) return $fuera;
  }
  $dentro = DATA_DIR . '/_respaldos';
  if (!is_dir($dentro)) @mkdir($dentro, 0700, true);
  // Cinturón y tirantes: si algún día se sirviera data/, este .htaccess niega.
  $ht = $dentro . '/.htaccess';
  if (!file_exists($ht)) @file_put_contents($ht, "Require all denied\nDeny from all\n");
  return $dentro;
}

function respaldo_es_publico(): bool {
  return strpos(respaldo_dir(), realpath(DATA_DIR) ?: DATA_DIR) === 0;
}

/** Archivos de datos que entran en la copia. */
function respaldo_archivos(): array {
  $out = [];
  foreach (scandir(DATA_DIR) ?: [] as $f) {
    if ($f === '.' || $f === '..') continue;
    if (in_array($f, RESPALDO_EXCLUIDOS, true)) continue;
    $ruta = DATA_DIR . '/' . $f;
    if (!is_file($ruta)) continue;
    if (substr($f, -5) !== '.json') continue;
    $out[$f] = $ruta;
  }
  return $out;
}

function respaldo_token(): string {
  $f = DATA_DIR . '/.respaldo_token';
  $t = is_file($f) ? trim((string)@file_get_contents($f)) : '';
  if ($t === '') {
    $t = bin2hex(random_bytes(16));
    @file_put_contents($f, $t);
    @chmod($f, 0600);
  }
  return $t;
}

/**
 * Crea la copia. Devuelve [archivo, bytes, sha256, piezas] o null si falla.
 * Con ZipArchive sale un .zip; sin él, un .json.gz con el mismo contenido.
 */
function respaldo_crear(string $motivo = 'automatico'): ?array {
  $dir = respaldo_dir();
  if (!is_writable($dir)) return null;
  $sello = gmdate('Ymd-His');
  $archivos = respaldo_archivos();
  if (!$archivos) return null;

  if (class_exists('ZipArchive')) {
    $ruta = $dir . '/respaldo-' . $sello . '.zip';
    $zip = new ZipArchive();
    if ($zip->open($ruta, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) return null;
    foreach ($archivos as $nombre => $origen) $zip->addFile($origen, 'data/' . $nombre);
    $zip->addFromString('RESPALDO.txt', respaldo_nota($motivo, count($archivos)));
    if (!$zip->close()) return null;
  } else {
    $bulto = ['generado' => now_iso(), 'motivo' => $motivo, 'archivos' => []];
    foreach ($archivos as $nombre => $origen) {
      $bulto['archivos'][$nombre] = (string)@file_get_contents($origen);
    }
    $ruta = $dir . '/respaldo-' . $sello . '.json.gz';
    $crudo = json_encode($bulto, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($crudo === false) return null;
    if (@file_put_contents($ruta, gzencode($crudo, 6)) === false) return null;
  }
  @chmod($ruta, 0600);

  $info = [
    'archivo' => basename($ruta),
    'bytes'   => (int)(@filesize($ruta) ?: 0),
    'sha256'  => hash_file('sha256', $ruta) ?: '',
    'piezas'  => count($archivos),
    'creado'  => now_iso(),
    'motivo'  => $motivo,
  ];
  @file_put_contents($dir . '/ultimo.json', json_encode($info, JSON_UNESCAPED_UNICODE));
  respaldo_rotar();
  return $info;
}

function respaldo_nota(string $motivo, int $piezas): string {
  return "Respaldo de datos de Red Café Ecuador\n"
    . "Generado: " . now_iso() . " (UTC)\n"
    . "Motivo: " . $motivo . "\n"
    . "Archivos incluidos: " . $piezas . "\n\n"
    . "Para restaurar: descomprime este archivo y copia el contenido de la carpeta\n"
    . "data/ dentro de la carpeta data/ del sitio, sobrescribiendo. Hazlo solo si\n"
    . "sabes que los datos actuales están dañados: sobrescribir borra lo posterior.\n"
    . "No contiene la contraseña de administración ni el token de respaldos.\n";
}

/** Se conservan 7 diarias, 4 semanales y 6 mensuales; el resto se borra. */
function respaldo_rotar(): void {
  $copias = respaldo_listar();
  if (!$copias) return;
  $guardar = [];
  $porSemana = [];
  $porMes = [];
  foreach ($copias as $i => $c) {
    $ts = $c['ts'];
    if ($i < RESPALDO_DIARIOS) { $guardar[$c['archivo']] = true; continue; }
    $semana = gmdate('o-W', $ts);
    $mes = gmdate('Y-m', $ts);
    if (count($porSemana) < RESPALDO_SEMANALES && empty($porSemana[$semana])) {
      $porSemana[$semana] = true;
      $guardar[$c['archivo']] = true;
      continue;
    }
    if (count($porMes) < RESPALDO_MENSUALES && empty($porMes[$mes])) {
      $porMes[$mes] = true;
      $guardar[$c['archivo']] = true;
    }
  }
  $dir = respaldo_dir();
  $total = 0;
  foreach ($copias as $c) {
    if (empty($guardar[$c['archivo']])) { @unlink($dir . '/' . $c['archivo']); continue; }
    $total += $c['bytes'];
  }
  // Tope de espacio: si aun así se pasa, caen las más antiguas conservadas.
  if ($total > RESPALDO_MAX_MB * 1024 * 1024) {
    $restantes = array_values(array_filter(respaldo_listar(), fn($c) => true));
    for ($i = count($restantes) - 1; $i > 0 && $total > RESPALDO_MAX_MB * 1024 * 1024; $i--) {
      @unlink($dir . '/' . $restantes[$i]['archivo']);
      $total -= $restantes[$i]['bytes'];
    }
  }
}

/** Copias existentes, de la más reciente a la más antigua. */
function respaldo_listar(): array {
  $dir = respaldo_dir();
  $out = [];
  foreach (scandir($dir) ?: [] as $f) {
    if (!preg_match('/^respaldo-(\d{8})-(\d{6})\.(zip|json\.gz)$/', $f, $m)) continue;
    $ts = strtotime($m[1] . 'T' . substr($m[2], 0, 2) . ':' . substr($m[2], 2, 2) . ':' . substr($m[2], 4, 2) . 'Z') ?: 0;
    $out[] = [
      'archivo' => $f,
      'ts'      => $ts,
      'fecha'   => gmdate('c', $ts),
      'bytes'   => (int)(@filesize($dir . '/' . $f) ?: 0),
    ];
  }
  usort($out, fn($a, $b) => $b['ts'] <=> $a['ts']);
  return $out;
}

function respaldo_ultimo(): ?array {
  $l = respaldo_listar();
  return $l[0] ?? null;
}

/**
 * Disparo automático: lo llama la campana (api/notificaciones.php) en la
 * primera visita del día. Nunca rompe a quien la llamó ni le hace esperar
 * más de lo necesario: si ya hay copia de hoy, sale en una lectura.
 */
function respaldo_automatico(): void {
  try {
    $ultimo = respaldo_ultimo();
    if ($ultimo && (time() - $ultimo['ts']) < 20 * 3600) return;
    // Reserva del turno: dos visitas simultáneas no deben crear dos copias.
    $marca = respaldo_dir() . '/.en-curso';
    if (is_file($marca) && (time() - (int)@filemtime($marca)) < 600) return;
    @file_put_contents($marca, (string)time());
    respaldo_crear('automatico');
    @unlink($marca);
  } catch (Throwable $e) {
    // Un respaldo que falla no puede tumbar la campana de un usuario.
  }
}


/**
 * Administración: vale la entrada por contraseña de administración y también
 * el miembro con rol admin. Con la primera sola, quien entra como miembro
 * marcado admin no veía estas herramientas y parecía que no existían.
 */
function respaldo_guardia_admin(): void {
  if (!empty($_SESSION['admin'])) return;
  $u = function_exists('current_user') ? current_user() : null;
  if ($u && function_exists('miembro_tiene_rol') && miembro_tiene_rol($u, 'admin')) return;
  fail('Solo administradores.', 403);
}

/* ── API (solo administración, salvo el disparo por token desde cron) ─── */

if (PHP_SAPI !== 'cli' && basename((string)($_SERVER['SCRIPT_NAME'] ?? '')) === 'respaldo.php') {
  $in = input();
  $action = $_GET['action'] ?? ($in['action'] ?? '');

  // Tarea programada de cPanel: /api/respaldo.php?action=cron&token=…
  if ($action === 'cron') {
    $token = (string)($_GET['token'] ?? ($in['token'] ?? ''));
    if (!hash_equals(respaldo_token(), $token)) fail('Token inválido.', 403);
    $info = respaldo_crear('cron');
    if (!$info) fail('No se pudo crear el respaldo.', 500);
    ok($info);
  }

  respaldo_guardia_admin();

  if ($action === 'estado') {
    $lista = respaldo_listar();
    $ultimo = $lista[0] ?? null;
    ok([
      'ultimo'      => $ultimo,
      'total'       => count($lista),
      'bytes_total' => array_sum(array_column($lista, 'bytes')),
      'carpeta'     => respaldo_dir(),
      'fuera_web'   => !respaldo_es_publico(),
      'zip'         => class_exists('ZipArchive'),
      'archivos'    => count(respaldo_archivos()),
      'token'       => respaldo_token(),
      'cron'        => 'php ' . __FILE__ . ' cron',
      'cron_url'    => '/api/respaldo.php?action=cron&token=' . respaldo_token(),
      'copias'      => $lista,
    ]);
  }

  if ($action === 'crear') {
    $info = respaldo_crear('manual');
    if (!$info) fail('No se pudo crear el respaldo. Revisa permisos de escritura.', 500);
    registrar_actividad('respaldo', ['detalle' => 'Respaldo manual ' . $info['archivo'], 'objeto_tipo' => 'respaldo']);
    ok($info);
  }

  if ($action === 'descargar') {
    $nombre = basename((string)($_GET['archivo'] ?? ''));
    if (!preg_match('/^respaldo-\d{8}-\d{6}\.(zip|json\.gz)$/', $nombre)) fail('Archivo no válido.', 422);
    $ruta = respaldo_dir() . '/' . $nombre;
    if (!is_file($ruta)) fail('Respaldo no encontrado.', 404);
    registrar_actividad('respaldo', ['detalle' => 'Descarga de ' . $nombre, 'objeto_tipo' => 'respaldo']);
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $nombre . '"');
    header('Content-Length: ' . (string)filesize($ruta));
    header('X-Content-Type-Options: nosniff');
    readfile($ruta);
    exit;
  }

  if ($action === 'borrar') {
    $nombre = basename((string)($in['archivo'] ?? ''));
    if (!preg_match('/^respaldo-\d{8}-\d{6}\.(zip|json\.gz)$/', $nombre)) fail('Archivo no válido.', 422);
    $ruta = respaldo_dir() . '/' . $nombre;
    if (!is_file($ruta)) fail('Respaldo no encontrado.', 404);
    @unlink($ruta);
    registrar_actividad('respaldo', ['detalle' => 'Borrado de ' . $nombre, 'objeto_tipo' => 'respaldo']);
    ok(['borrado' => $nombre]);
  }

  fail('Acción no válida.', 400);
}

// Desde la línea de órdenes: php api/respaldo.php cron
if (PHP_SAPI === 'cli' && in_array('cron', $argv ?? [], true)) {
  $info = respaldo_crear('cron');
  echo $info ? ('OK ' . $info['archivo'] . ' ' . $info['bytes'] . " bytes\n") : "FALLO\n";
}
