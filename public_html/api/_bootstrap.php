<?php
// Backend bootstrap: sesiones, cabeceras, IO JSON seguro, auth helpers.
// GoDaddy cPanel (PHP). Almacenamiento: archivos JSON en data/.

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

// --- Seguridad: redirigir a HTTPS ---
if (PHP_SAPI !== 'cli-server' && ($_SERVER['HTTPS'] ?? '') !== 'on' && ($_SERVER['SERVER_PORT'] ?? '80') !== '443') {
  $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
  $uri  = $_SERVER['REQUEST_URI'] ?? '/';
  header('Location: https://' . $host . $uri, true, 301);
  exit;
}

// --- Sesión: directorio privado, cookie segura ---
$sessDir = __DIR__ . '/../data/.sess';
if (!is_dir($sessDir)) @mkdir($sessDir, 0700, true);
if (is_dir($sessDir)) @session_save_path($sessDir);

// Sin esto PHP borra la sesión tras 24 min sin actividad (gc_maxlifetime=1440)
// aunque la cookie diga 7 o 30 días: la persona quedaba fuera sin cerrar sesión.
@ini_set('session.gc_maxlifetime', (string)(60 * 60 * 24 * 30));

session_set_cookie_params([
  'lifetime' => 60 * 60 * 24 * 7,   // 7 días (razonable para marketplace)
  'path'     => '/',
  'domain'   => '',
  'secure'   => true,
  'httponly'  => true,
  'samesite'  => 'Lax',
]);
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

/**
 * Peticiones que vienen de OTRO sitio (CSRF). La cookie de sesión es SameSite=Lax:
 * el navegador la envía en un enlace pulsado desde otra web, y varias acciones
 * que borran o cambian datos aceptaban GET (medido: un GET con la cookie borraba
 * un lote). El navegador declara el origen de cada petición (Sec-Fetch-Site y
 * Origin): desde otro sitio solo se permiten lecturas. No toca las llamadas del
 * propio sitio ni los enlaces firmados de los correos (llevan su propio token).
 */
function rc_proteger_origen(): void {
  $accion = (string)($_GET['action'] ?? '');
  if (in_array($accion, ['baja_correo', 'admin_reset_password', 'ver_apelacion'], true)) return;
  $cruzado = in_array(strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')), ['cross-site', 'same-site'], true);
  $origen = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
  if ($origen !== '' && $origen !== 'null') {
    $h = strtolower((string)parse_url($origen, PHP_URL_HOST));
    $puerto = parse_url($origen, PHP_URL_PORT);
    if ($h . ($puerto ? ':' . $puerto : '') !== strtolower((string)($_SERVER['HTTP_HOST'] ?? ''))) $cruzado = true;
  }
  if (!$cruzado) return;
  $lectura = '/^(list|get|all|me|publicos|stats|actividad|actual|precios?|clave|estado|contador|mine|mis_[a-z_]+|mios|mias|catalogo|ficha|messages|rooms|contacts|matriculas|matriculados|progreso|exportar|mi_estado|resumen|ofertas|postulaciones|solicitudes|categorias|redes|admin_me|cosecha|texto|published)$/';
  if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' && preg_match($lectura, $accion)) return;
  fail('Petición bloqueada: viene de otro sitio.', 403);
}
rc_proteger_origen();
// No anunciar la versión exacta de PHP en cada respuesta (X-Powered-By).
if (function_exists('header_remove')) @header_remove('X-Powered-By');

/* El candado de la sesión es exclusivo: mientras una petición lo tiene abierto,
   las demás del mismo visitante esperan en fila. Una página que dispara seis
   llamadas a la vez se vuelve seis veces más lenta para quien ha entrado, y
   nada para el visitante anónimo (que no tiene sesión). Estos cinco archivos
   son los únicos que escriben en $_SESSION; en todos los demás se suelta el
   candado enseguida. $_SESSION se sigue leyendo igual: solo deja de guardarse. */
const SESION_ESCRITORES = ['auth.php', 'members.php', 'twofactor.php', 'socios.php', 'recordatorios.php'];
if (session_status() === PHP_SESSION_ACTIVE
    && !in_array(basename((string)($_SERVER['SCRIPT_FILENAME'] ?? '')), SESION_ESCRITORES, true)) {
  session_write_close();
}

function refresh_session_cookie(bool $keepSignedIn): void {
  if (session_status() !== PHP_SESSION_ACTIVE) return;
  $expires = $keepSignedIn ? time() + (60 * 60 * 24 * 30) : 0;
  setcookie(session_name(), session_id(), [
    'expires' => $expires,
    'path' => '/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
}

// --- Cabeceras de seguridad ---
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

const DATA_DIR = __DIR__ . '/../data';

// --- Helpers JSON ---

function jexit($payload, int $code = 200): void {
  http_response_code($code);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function ok($data = null): void { jexit(['ok' => true, 'data' => $data]); }
function fail(string $msg, int $code = 400, array $extra = []): void {
  jexit(array_merge(['ok' => false, 'error' => $msg], $extra), $code);
}

function input(): array {
  $raw = file_get_contents('php://input') ?: '';
  if ($raw !== '') {
    $j = json_decode($raw, true);
    if (is_array($j)) return $j;
  }
  return $_REQUEST ?? [];
}

// Whitelist de nombres de archivo permitidos en load_json/save_json
// Guardián de datos: el instalador inicial es opcional en producción.
$semillaInstalador = __DIR__ . '/_semilla.php';
if (file_exists($semillaInstalador)) require_once $semillaInstalador;
if (function_exists('semilla_instalar') && !file_exists(DATA_DIR . '/.semilla-hecha')) {
    semilla_instalar();
    @file_put_contents(DATA_DIR . '/.semilla-hecha', gmdate('c'));
}

const ALLOWED_DATA_NAMES = [
  'members', 'pedidos', 'lotes', 'menus', 'chats', 'messages',
  'posts', 'waitlist', 'consents', 'ratings', 'media',
  'servicios', 'servicios-terceros', 'ordenes', 'cotizaciones',
  'contenido-noticias', 'contenido-cursos', 'contenido-planes', 'contenido-servicios',
  'contenido-recetas', 'inventario', 'movimientos', 'password-resets',
  // Academia: catálogo de cursos y avance de cada miembro.
  'cursos', 'progreso-cursos', 'inscripciones-cursos', 'planes', 'slots',
  // Avisos a cada miembro, bitácora de la Red y reportes de problemas.
  'notificaciones', 'actividad', 'reportes', 'empleos', 'postulaciones',
  // Fecha del último recordatorio de «publica tu lote» por productor.
  'recordatorios-lote', 'recordatorios-config',
  // Suscripciones Web Push por dispositivo del miembro.
  'push-suscripciones',
  // Guías paso a paso: avance por miembro y sus bitácoras (privadas).
  'guias', 'guias-registros',
  'socios-invitados',
  // Requerimientos de café («compro café») y las ofertas que reciben.
  'requerimientos', 'ofertas-requerimiento',
  // Bolsa de empleo, lado de quien busca: «busco empleo» y «ofrezco asesoría».
  'busquedas-empleo', 'intereses-empleo',
  // Contadores por día del embudo de registro, sin datos personales.
  'metricas',
  // Campañas de difusión por WhatsApp creadas desde la administración.
  'difusiones',
  // Personalización visual del sitio: lo publicado, el borrador y su historial.
  // Faltaban en esta lista, así que api/visual.php devolvía 500 en todas sus
  // acciones, incluida la pública `published`.
  'visual-publicado', 'visual-borrador', 'visual-versiones',
  // Moderación con debido proceso (sanciones y apelaciones) y registro mínimo
  // de bajas voluntarias (moderacion.php).
  'sanciones', 'notas-admin', 'bajas',
];

function safe_data_path(string $name): string {
  // Solo permite nombres en whitelist para evitar path traversal
  if (!in_array($name, ALLOWED_DATA_NAMES, true)) {
    fail('Nombre de datos no válido.', 500);
  }
  return DATA_DIR . '/' . $name . '.json';
}

function load_json(string $name, array $default): array {
  $f = safe_data_path($name);
  if (!file_exists($f)) {
    save_json($name, $default);
    return $default;
  }
  $fp = fopen($f, 'r');
  if (!$fp) return $default;
  flock($fp, LOCK_SH);
  $raw = stream_get_contents($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  $j = json_decode($raw, true);
  return is_array($j) ? $j : $default;
}

function save_json(string $name, array $data): bool {
  $f = safe_data_path($name);
  // Si la codificación falla (p. ej. UTF-8 inválido), antes se escribía una
  // cadena vacía y el rename dejaba el archivo en blanco: se perdía todo.
  $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
  if ($json === false) {
    error_log('[RedCafe] save_json: no se pudo codificar ' . $name . ': ' . json_last_error_msg());
    return false;
  }
  // Temporal único: con un nombre fijo, dos escritores simultáneos se pisaban
  // el mismo .tmp y uno renombraba el archivo a medio escribir del otro.
  $tmp = $f . '.' . bin2hex(random_bytes(4)) . '.tmp';
  if (@file_put_contents($tmp, $json, LOCK_EX) !== strlen($json)) {
    @unlink($tmp);
    return false;
  }
  if (!rename($tmp, $f)) {
    @unlink($tmp);
    return false;
  }
  return true;
}

/**
 * Bloqueo exclusivo por archivo de datos durante todo leer-modificar-escribir.
 * Sin esto, dos peticiones simultáneas leían el mismo estado y la segunda en
 * guardar borraba lo que había escrito la primera (mensajes, avisos, etc.).
 * Reentrante: un mutate_json anidado sobre el mismo nombre no se bloquea a sí
 * mismo (flock bloquearía aunque sea el mismo proceso).
 */
function data_lock(string $name, bool $acquire = true): void {
  static $held = [];
  if (!$acquire) {
    if (!isset($held[$name])) return;
    if (--$held[$name]['depth'] > 0) return;
    flock($held[$name]['fp'], LOCK_UN);
    fclose($held[$name]['fp']);
    unset($held[$name]);
    return;
  }
  if (isset($held[$name])) {
    $held[$name]['depth']++;
    return;
  }
  $dir = DATA_DIR . '/.locks';
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  $fp = @fopen($dir . '/' . $name . '.lock', 'c');
  if (!$fp) return; // sin bloqueo es preferible a no guardar
  flock($fp, LOCK_EX);
  $held[$name] = ['fp' => $fp, 'depth' => 1];
}

function mutate_json(string $name, array $default, callable $fn): array {
  data_lock($name);
  try {
    $data = load_json($name, $default);
    $anteriores = $name === 'actividad' ? count($data) : 0;
    $data = $fn($data);
    $guardado = save_json($name, $data);
  } finally {
    data_lock($name, false);
  }
  if ($guardado && $name === 'actividad' && function_exists('comunidad_aviso_desde_actividad')) {
    foreach (array_slice($data, $anteriores) as $actividad) {
      if (is_array($actividad)) comunidad_aviso_desde_actividad($actividad);
    }
  }
  return $data;
}

// --- Helpers generales ---

function uid(): string { return bin2hex(random_bytes(6)); }
function now_iso(): string { return gmdate('c'); }

/* Numerar con count()+1 repite números en cuanto alguien borra algo: dos
   pedidos distintos acaban con el mismo número y las acciones de uno recaen
   sobre el otro. Ya pasó con los pedidos. Se numera desde el mayor existente. */
function siguiente_nro(array $lista, string $campo = 'nro'): int {
  $max = 0;
  foreach ($lista as $x) {
    if (is_array($x)) $max = max($max, (int)($x[$campo] ?? 0));
  }
  return $max + 1;
}
function today(): string { return gmdate('Y-m-d'); }

function redcafe_whatsapp_display($raw): string {
  $phone = trim((string)$raw);
  if ($phone === '') return '';
  $digits = preg_replace('/\D+/', '', $phone);
  if ($digits === '') return '';
  if (str_starts_with($digits, '00')) $digits = substr($digits, 2);
  if (str_starts_with($digits, '0') && strlen($digits) === 10) $digits = '593' . substr($digits, 1);
  if (!str_starts_with($digits, '593') && strlen($digits) === 9) $digits = '593' . $digits;
  return '+' . $digits;
}

function redcafe_whatsapp_link_digits($raw): string {
  return preg_replace('/\D+/', '', redcafe_whatsapp_display($raw));
}

const ROLES_MIEMBRO = [
  'productor','vendedor','comprador','bar','barista','certificador',
  'transportista','pilador','exportador','proveedor','amante','asesor',
];
const MAX_ROLES_MIEMBRO = 3;

function miembro_roles(array $m): array {
  $rolPrincipal = (string)($m['rol'] ?? '');
  $raw = is_array($m['roles'] ?? null) ? $m['roles'] : [$rolPrincipal];
  $roles = [];
  if ($rolPrincipal !== '' && in_array($rolPrincipal, ROLES_MIEMBRO, true)) {
    $roles[] = $rolPrincipal;
  }
  foreach ($raw as $rol) {
    $rol = (string)$rol;
    if (in_array($rol, ROLES_MIEMBRO, true) && !in_array($rol, $roles, true)) {
      $roles[] = $rol;
    }
  }
  return $roles ?: ($rolPrincipal !== '' ? [$rolPrincipal] : []);
}

function validar_roles_miembro($roles, ?string $principal = null, bool $cortar = false): array {
  if (!is_array($roles)) {
    $roles = $roles !== null && $roles !== '' ? [$roles] : [];
  }
  $limpios = [];
  foreach ($roles as $rol) {
    $rol = (string)$rol;
    if (!in_array($rol, ROLES_MIEMBRO, true)) fail('Rol inválido.', 422);
    if (!in_array($rol, $limpios, true)) $limpios[] = $rol;
  }
  if ($principal !== null && $principal !== '') {
    if (!in_array($principal, ROLES_MIEMBRO, true)) fail('Rol inválido.', 422);
    $limpios = array_values(array_filter($limpios, fn($r) => $r !== $principal));
    array_unshift($limpios, $principal);
  }
  if (count($limpios) < 1) fail('Debes seleccionar al menos un perfil.', 422);
  // Primero se rechaza el exceso: recortar en silencio dejaría al usuario con
  // menos perfiles de los que pidió sin enterarse. El recorte solo se aplica a
  // datos ya guardados que vengan de antes del tope.
  if (count($limpios) > MAX_ROLES_MIEMBRO) fail('Puedes seleccionar máximo tres perfiles.', 422);
  if ($cortar) $limpios = array_slice($limpios, 0, MAX_ROLES_MIEMBRO);
  return $limpios;
}

function miembro_tiene_rol(array $m, string $rol): bool {
  if ($rol === 'admin') {
    if (!empty($_SESSION['admin'])) return true;
    if (!empty($m['admin']) || !empty($m['is_admin'])) return true;
    if (($m['rol'] ?? '') === 'admin') return true;
  }
  $roles = $m['roles'] ?? [$m['rol'] ?? ''];
  return in_array($rol, $roles, true);
}

// --- Auth ---

function current_user(): ?array {
  $u = $_SESSION['user'] ?? null;
  if (!$u) return null;
  // Una cuenta suspendida, bloqueada o cerrada pierde la sesión abierta en su
  // siguiente petición, no solo al volver a entrar (moderacion.php).
  if (cuenta_restringida((string)($u['id'] ?? ''))) {
    unset($_SESSION['user']);
    return null;
  }
  // Cambiar o restablecer la contraseña cierra las demás sesiones abiertas:
  // si alguien entró con la contraseña robada, deja de tener acceso en cuanto
  // el titular la cambia. Las sesiones sin marca de inicio (anteriores a esta
  // versión) solo caen si la contraseña cambió después de desplegarla.
  $cambio = miembro_pass_cambiada_en((string)($u['id'] ?? ''));
  if ($cambio > 0 && $cambio > (float)($_SESSION['login_at'] ?? 0)) {
    unset($_SESSION['user']);
    return null;
  }
  return $u;
}

/** Momento (epoch) del último cambio de contraseña del miembro, o 0. */
function miembro_pass_cambiada_en(string $uid): float {
  static $mapa = null;
  if ($uid === '') return 0;
  if ($mapa === null) {
    $mapa = [];
    foreach (load_json('members', []) as $m) {
      if (!empty($m['pass_changed_at'])) $mapa[(string)($m['id'] ?? '')] = (float)$m['pass_changed_at'];
    }
  }
  return $mapa[$uid] ?? 0;
}

/** Marca el inicio de la sesión actual (para invalidarla si cambia la contraseña). */
function marcar_inicio_sesion(): void {
  // Con microsegundos: con segundos enteros, una sesión abierta en el mismo
  // segundo del cambio sobrevivía.
  $_SESSION['login_at'] = microtime(true);
}

/**
 * Texto libre que llega del navegador: solo escalares, sin caracteres de
 * control (salvo saltos de línea si se piden) y con tope de longitud. Un
 * objeto o una lista en un campo de texto se guardaban tal cual y rompían
 * las vistas que esperan una cadena.
 */
function texto_entrada($valor, int $max, bool $multilinea = false): string {
  if (is_array($valor) || is_object($valor)) return '';
  $v = (string)$valor;
  $v = $multilinea
    ? preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v)
    : preg_replace('/[\x00-\x1F\x7F]/u', ' ', $v);
  $v = trim((string)$v);
  return mb_substr($v, 0, $max);
}

/**
 * Medida vigente que impide usar la cuenta: suspensión o bloqueo activos, o
 * cuenta cerrada/inactiva. Devuelve la sanción (o un marcador) o null.
 * Se lee una vez por petición; sanciones.json es pequeño.
 */
function cuenta_restringida(string $uid): ?array {
  static $cache = [];
  if ($uid === '') return null;
  if (array_key_exists($uid, $cache)) return $cache[$uid];
  static $sanciones = null, $estados = null;
  if ($sanciones === null) {
    $sanciones = [];
    foreach (load_json('sanciones', []) as $s) {
      if (($s['estado'] ?? '') !== 'activa' || !in_array($s['tipo'] ?? '', ['suspension', 'bloqueo'], true)) continue;
      if (!empty($s['hasta']) && strtotime((string)$s['hasta']) <= time()) continue;
      $sanciones[(string)$s['uid']] = $s;
    }
  }
  if (isset($sanciones[$uid])) return $cache[$uid] = $sanciones[$uid];
  if ($estados === null) {
    $estados = [];
    foreach (load_json('members', []) as $m) {
      $e = (string)($m['estado'] ?? 'activo');
      if (in_array($e, ['eliminado', 'inactivo', 'bloqueado', 'suspendido'], true) || (array_key_exists('activo', $m) && $m['activo'] === false)) {
        $estados[(string)($m['id'] ?? '')] = ['tipo' => $e === 'activo' ? 'inactivo' : $e];
      }
    }
  }
  return $cache[$uid] = $estados[$uid] ?? null;
}

/** Lo publicado por una cuenta restringida deja de mostrarse a los demás. */
function publicacion_visible(array $item): bool {
  foreach (['published_by', 'productor_id', 'proveedor_id', 'owner_id', 'autor_id'] as $k) {
    $id = (string)($item[$k] ?? '');
    if ($id !== '' && $id !== 'admin' && cuenta_restringida($id)) return false;
  }
  return true;
}

function pending_user(): ?array {
  // Usuario con sesión pendiente de verificar 2FA
  $id = $_SESSION['2fa_pending_user'] ?? null;
  if (!$id) return null;
  $members = load_json('members', []);
  foreach ($members as $m) {
    if (($m['id'] ?? '') === $id) {
      return sanitize_user($m);
    }
  }
  return null;
}

function current_or_pending(): ?array {
  return current_user() ?? pending_user();
}

function require_user(): array {
  $u = current_user();
  if (!$u) fail('No autenticado.', 401);
  return $u;
}

function require_user_or_pending(): array {
  $u = current_or_pending();
  if (!$u) fail('No autenticado.', 401);
  return $u;
}

function require_admin(): void {
  if (empty($_SESSION['admin'])) fail('Solo administradores.', 403);
}

function sanitize_user(array $u): array {
  // Nunca salen del servidor: la contraseña y los códigos de respaldo del
  // 2FA. Los códigos se guardaban como sha256 de 8 caracteres hexadecimales
  // y se devolvían en auth.php?action=me también a quien solo había pasado
  // la contraseña: se descifraban en una hora y el 2FA quedaba anulado.
  unset($u['pass'], $u['backup_codes'], $u['pass_changed_at'], $u['pass_reset_by']);
  $u['roles'] = miembro_roles($u);
  return $u;
}

/** Lo mínimo para la pantalla del código 2FA: quien solo pasó la contraseña. */
function usuario_pendiente_publico(array $u): array {
  $email = (string)($u['email'] ?? '');
  return [
    'id'     => (string)($u['id'] ?? ''),
    'nombre' => (string)($u['nombre'] ?? ''),
    'email'  => $email !== '' ? substr($email, 0, 3) . '***' : '',
  ];
}

/**
 * Proyección PÚBLICA de un miembro: la que puede ver alguien sin cuenta.
 *
 * Lista blanca a propósito, no lista negra. `sanitize_user` solo quita la
 * contraseña y deja correo, teléfono y cédula: sirve para usuarios
 * autenticados, NUNCA para el público. Aquí se enumera lo que SÍ sale, así
 * que un campo nuevo en el registro no se filtra solo por haberse añadido.
 */
function miembro_publico(array $u): array {
  return [
    'id'         => $u['id'] ?? '',
    'nombre'     => $u['nombre'] ?? '',
    'rol'        => $u['rol'] ?? '',
    'roles'      => miembro_roles($u),
    'provincia'  => $u['provincia'] ?? '',
    'verificado' => !empty($u['verificado']),
    'creado'     => $u['creado'] ?? '',
  ];
}

/** ¿Este miembro accedió a aparecer ante quien no tiene cuenta? */
function miembro_es_publico(array $u): bool {
  // Ausente = público: es el valor por defecto del registro y el que hace
  // útil el directorio. Quien elija lo contrario queda con 'registrados'.
  return ($u['visibilidad'] ?? 'publico') === 'publico'
      && ($u['estado'] ?? 'activo') !== 'inactivo';
}

function find_member(array $members, string $email): ?array {
  foreach ($members as $m) {
    if (strcasecmp($m['email'] ?? '', $email) === 0) return $m;
  }
  return null;
}

// --- Rate limiting básico (archivo por IP) ---

function check_rate_limit(string $action, int $max = 10, int $window = 60): bool {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  $dir = DATA_DIR . '/.rate';
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  $file = $dir . '/' . md5($action . $ip) . '.json';
  $now = time();
  $data = [];
  if (file_exists($file)) {
    $data = json_decode(file_get_contents($file), true) ?: [];
  }
  // Limpiar entradas fuera de la ventana
  $data = array_filter($data, fn($t) => $t > $now - $window);
  if (count($data) >= $max) return false;
  $data[] = $now;
  file_put_contents($file, json_encode(array_values($data)));
  return true;
}

require_once __DIR__ . '/_comunidad-avisos.php';
