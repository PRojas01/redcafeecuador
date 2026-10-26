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
  'socios-invitados',
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
  $tmp = $f . '.tmp';
  $fp = fopen($tmp, 'w');
  if (!$fp) return false;
  flock($fp, LOCK_EX);
  fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  return rename($tmp, $f);
}

function mutate_json(string $name, array $default, callable $fn): array {
  $data = load_json($name, $default);
  $anteriores = $name === 'actividad' ? count($data) : 0;
  $data = $fn($data);
  $guardado = save_json($name, $data);
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
  return $_SESSION['user'] ?? null;
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
  unset($u['pass']);
  $u['roles'] = miembro_roles($u);
  return $u;
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
