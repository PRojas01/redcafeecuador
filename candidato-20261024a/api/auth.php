<?php
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';
require_once __DIR__ . '/_comunidad-avisos.php';

const REGISTRO_GRATIS_HASTA = '2026-12-31';

$action = $_GET['action'] ?? '';
$in = input();

// --- Admin pass: archivo en data/, persistente ---
function get_admin_password(): string {
  // Candidatos en orden de prioridad
  $candidates = [
    dirname(__DIR__, 2) . '/.redcafe_admin_pass',         // fuera de public_html (ideal)
    __DIR__ . '/../data/.redcafe_admin_pass',            // en data/ (recomendado GoDaddy)
  ];
  foreach ($candidates as $f) {
    if (file_exists($f)) {
      $raw = file_get_contents($f);
      // Quitar BOM UTF-8 si existe
      $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);
      // Quitar saltos de línea al final
      $pass = rtrim(trim($raw), "\r\n");
      if ($pass !== '') return $pass;
    }
  }
  // Si no existe NINGÚN archivo, crear uno con pass aleatorio
  // Pero solo si el directorio data/ es escribible
  $newPass = bin2hex(random_bytes(12));
  $target = __DIR__ . '/../data/.redcafe_admin_pass';
  $dir = dirname($target);
  if (is_dir($dir) && is_writable($dir)) {
    @file_put_contents($target, $newPass);
    @chmod($target, 0600);
    error_log("[RedCafe] Admin password file created at: $target — CHANGE THIS PASSWORD!");
  } else {
    error_log("[RedCafe] CRITICAL: Cannot create admin password file. Directory not writable.");
  }
  return $newPass;
}

// Verifica la contraseña admin aceptando formato en claro (legacy) y bcrypt.
function admin_verify_password(string $input, string $stored): bool {
  if ($stored === '') return false;
  if (admin_is_hashed($stored)) {
    return password_verify($input, $stored);
  }
  return hash_equals($stored, $input);
}

function admin_is_hashed(string $stored): bool {
  return str_starts_with($stored, '$2y$');
}

// Escribe el contenido en las rutas candidatas del archivo de pass admin.
function admin_write_password(string $content): void {
  $candidates = [
    dirname(__DIR__, 2) . '/.redcafe_admin_pass',  // fuera de public_html (ideal)
    __DIR__ . '/../data/.redcafe_admin_pass',      // en data/ (ruta de lectura recomendada)
  ];
  $escritas = 0;
  foreach ($candidates as $f) {
    $dir = dirname($f);
    if (!is_dir($dir)) continue;
    if (file_put_contents($f, $content) !== false) {
      @chmod($f, 0600);
      $escritas++;
    }
  }
  // Fallback: crear en public/
  $fallback = dirname(__DIR__) . '/.redcafe_admin_pass';
  if ($escritas === 0 && file_put_contents($fallback, $content) !== false) {
    @chmod($fallback, 0600);
    $escritas++;
  }
  if ($escritas === 0) {
    error_log('[RedCafe] CRITICAL: No se pudo escribir la contraseña admin.');
  }
}

// --- Registro ---
if ($action === 'register') {
  // Limita altas masivas desde la misma IP sin bloquear registros legítimos.
  if (!check_rate_limit('register', 10, 3600)) {
    fail('Demasiados registros seguidos. Vuelve a intentarlo en una hora.', 429);
  }

  $nombre = trim($in['nombre'] ?? '');
  $email = strtolower(trim($in['email'] ?? ''));
  $pass = $in['pass'] ?? '';
  $rol = (string)($in['rol'] ?? '');
  $roles = validar_roles_miembro($in['roles'] ?? [$rol], $rol ?: null, true);
  $rol = $roles[0];
  $plan = $in['plan'] ?? '';

  // Additional fields (optional)
  $telefono = trim($in['telefono'] ?? '');
  $cedula   = trim($in['cedula'] ?? '');
  $provincia = trim($in['provincia'] ?? '');

  // Aceptación de políticas (LOPDP Ecuador: guardar evidencia de consentimiento)
  // Visibilidad del perfil: pública o solo para miembros con cuenta.
  $visibilidad = ($in['visibilidad'] ?? 'publico') === 'registrados' ? 'registrados' : 'publico';
  $aceptaTerminos    = !empty($in['acepta_terminos']);
  $aceptaPrivacidad  = !empty($in['acepta_privacidad']);
  $aceptaUsoDatos    = !empty($in['acepta_uso_datos']);
  $aceptaMarketing   = !empty($in['acepta_marketing']);

  if (!$aceptaTerminos || !$aceptaPrivacidad || !$aceptaUsoDatos) {
    fail('Debes aceptar Términos, Privacidad y Uso de Datos para registrarte.', 422);
  }

  // Validaciones
  if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 100) fail('Nombre: 2-100 caracteres.', 422);
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Correo electrónico inválido.', 422);
  if (strlen($pass) < 8) fail('Contraseña mínimo 8 caracteres.', 422);
  if (strlen($pass) > 200) fail('Contraseña demasiado larga.', 422);

  $members = load_json('members', []);
  if (find_member($members, $email)) fail('Ese correo ya está registrado.', 409);

  $id = uid();
  $m = [
    'id' => $id,
    'nombre' => $nombre,
    'email' => $email,
    'pass' => password_hash($pass, PASSWORD_BCRYPT),
    'rol' => $rol,
    'visibilidad' => $visibilidad,
    'roles' => $roles,
    'plan' => $plan ?: 'origen',
    'telefono' => $telefono,
    'cedula' => $cedula,
    'provincia' => $provincia,
    'verificado' => false,
    'consentimientos' => [
      'terminos'    => ['aceptado' => true, 'fecha' => now_iso(), 'version' => 'v1'],
      'privacidad'  => ['aceptado' => true, 'fecha' => now_iso(), 'version' => 'v1'],
      'uso_datos'   => ['aceptado' => true, 'fecha' => now_iso(), 'version' => 'v1'],
      'marketing'   => ['aceptado' => $aceptaMarketing, 'fecha' => now_iso(), 'version' => 'v1'],
    ],
    // Ventana de registro gratuito: quien entra antes del cierre conserva las
    // condiciones de acceso de la etapa actual.
    'fundador' => (gmdate('Y-m-d') <= REGISTRO_GRATIS_HASTA),
    'created_at' => now_iso(),
  ];
  $members[] = $m;
  save_json('members', $members);

  // Log de consentimientos (evidencia para LOPDP)
  $consents = load_json('consents', []);
  $consents[] = [
    'id' => uid(),
    'member_id' => $id,
    'email' => $email,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    'ua' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200),
    'acepta_terminos' => $aceptaTerminos,
    'acepta_privacidad' => $aceptaPrivacidad,
    'acepta_uso_datos' => $aceptaUsoDatos,
    'acepta_marketing' => $aceptaMarketing,
    'ts' => now_iso(),
  ];
  save_json('consents', $consents);

  // Email de bienvenida (transaccional, no bloquea el registro)
  @include_once __DIR__ . '/mailer.php';
  if (function_exists('mailer_send')) {
    mailer_send('welcome', $m['email'], [
      'nombre' => $m['nombre'],
      'rol'    => $m['rol'],
    ]);
  }

  // La Red se entera de que hay alguien nuevo. Sin correo ni teléfono: para
  // la administración basta el nombre, el perfil y la provincia.
  notificar_admins('miembro',
    'Nuevo miembro: ' . $m['nombre'],
    'Perfil ' . $m['rol'] . ($m['provincia'] ? ' · ' . $m['provincia'] : '') . '.',
    '/admin/');
  registrar_actividad('miembro-alta', [
    'actor_id'    => $id,
    'actor'       => $m['nombre'],
    'rol'         => $m['rol'],
    'objeto_tipo' => 'miembro',
    'objeto_id'   => $id,
    'detalle'     => 'Alta con perfil ' . $m['rol'] . ($m['provincia'] ? ' en ' . $m['provincia'] : ''),
  ]);
  // El muro de la Comunidad anuncia a quien llega. Sin correo ni teléfono, y
  // solo si el miembro eligió ser visible: publicar_aviso_comunidad() lo
  // comprueba con miembro_es_publico().
  publicar_aviso_comunidad('miembro', $m);

  notificar($id, 'sistema', 'Te damos la bienvenida a Red Café Ecuador',
    'Completa tu perfil y publica tu primer lote o servicio desde el panel.', '/panel/');

  // Regenerar sesión para evitar fixation
  session_regenerate_id(true);
  $_SESSION['user'] = sanitize_user($m);
  ok(['user' => $_SESSION['user']]);
}

// --- Login ---
if ($action === 'login') {
  $email = strtolower(trim($in['email'] ?? ''));
  $pass = $in['pass'] ?? '';
  $remember = !empty($in['remember']);
  if (!$email || !$pass) fail('Correo y contraseña requeridos.', 422);

  // Rate limiting: 10 intentos por minuto por IP
  if (!check_rate_limit('login', 10, 60)) {
    fail('Demasiados intentos. Espera un minuto.', 429);
  }

  $members = load_json('members', []);
  $m = find_member($members, $email);
  if (!$m || !password_verify($pass, $m['pass'] ?? '')) fail('Credenciales inválidas.', 401);

  // Cuenta cerrada, suspendida o bloqueada: no se abre sesión. Se explica el
  // motivo, la norma aplicada, hasta cuándo y cómo apelar (moderacion.php).
  $restriccion = cuenta_restringida((string)($m['id'] ?? ''));
  if ($restriccion) {
    if (isset($restriccion['id'])) {
      require_once __DIR__ . '/_moderacion.php';
      fail($restriccion['tipo'] === 'suspension' ? 'Tu cuenta está suspendida temporalmente.' : 'Tu cuenta está bloqueada.', 403, [
        'sancion' => moderacion_vista_titular($restriccion, (string)$m['id']),
      ]);
    }
    fail('Esta cuenta está cerrada o desactivada. Si crees que es un error, escribe a soporte@redcafeecuador.com.', 403, ['cuenta' => $restriccion['tipo']]);
  }

  // Si el usuario tiene 2FA activo, no crear sesión todavía
  if (!empty($m['two_factor_enabled'])) {
    // Generar código y enviar email
    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $codeHash = hash('sha256', $code . 'redcafe_salt_2026');
    $otpFile = __DIR__ . '/../data/otp-active.json';
    $all = [];
    if (file_exists($otpFile)) {
      $j = json_decode(file_get_contents($otpFile), true);
      if (is_array($j)) $all = $j;
    }
    $all[$m['id']] = [
      'user_id'    => $m['id'],
      'code_hash'  => $codeHash,
      'expires_at' => time() + 600,
      'created_at' => gmdate('c'),
    ];
    @file_put_contents($otpFile, json_encode($all, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    $subject = 'Tu código de verificación Red Café Ecuador';
    $body = "Hola {$m['nombre']},\n\nTu código de verificación es: $code\n\nVálido por 10 minutos.\n\n— Red Café Ecuador";
    $headers = "From: Red Café Ecuador <no-reply@redcafeecuador.com>\r\nContent-Type: text/plain; charset=utf-8\r\n";
    $sent = @mail($m['email'], $subject, $body, $headers);
    // (Antes se escribía el código en claro en data/otp-debug.log si el correo
    // fallaba: un secreto de acceso guardado en un registro. Eliminado.)

    // Guardar usuario pendiente y devolver requires_2fa
    $_SESSION['2fa_pending_user'] = $m['id'];
    $_SESSION['2fa_remember'] = $remember;
    refresh_session_cookie($remember);
    // Nunca se devuelve el código: antes, si el correo fallaba, la respuesta lo
    // traía y cualquiera con la contraseña se saltaba el segundo factor.
    ok([
      'requires_2fa' => true,
      'to'           => substr($m['email'], 0, 3) . '***',
      'sent'         => $sent,
    ]);
    return;
  }

  session_regenerate_id(true);
  $_SESSION['user'] = sanitize_user($m);
  $_SESSION['remember'] = $remember;
  refresh_session_cookie($remember);
  ok(['user' => $_SESSION['user']]);
}

// --- Logout ---
if ($action === 'logout') {
  $_SESSION = [];
  session_destroy();
  // Borrar cookie de sesión
  $params = session_get_cookie_params();
  setcookie(session_name(), '', time() - 3600, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
  ok();
}

// --- Cancelar verificación 2FA pendiente ---
if ($action === 'cancel_2fa') {
  unset($_SESSION['2fa_pending_user']);
  ok();
}

// --- Me ---
if ($action === 'me') {
  $u = current_user();
  // `admin` deja a la campana de avisos saber que hay sesión de administración
  // sin gastar otra petición por cada visitante.
  $esAdmin = !empty($_SESSION['admin']);
  if ($u) {
    ok(['user' => $u, 'requires_2fa' => false, 'admin' => $esAdmin]);
  } elseif ($pendingId = $_SESSION['2fa_pending_user'] ?? null) {
    // Usuario tiene 2FA pendiente, devolver datos pero indicando
    $members = load_json('members', []);
    foreach ($members as $m) {
      if (($m['id'] ?? '') === $pendingId) {
        ok(['user' => sanitize_user($m), 'requires_2fa' => true]);
        return;
      }
    }
    ok(['user' => null, 'requires_2fa' => true]);
  } else {
    ok(['user' => null, 'requires_2fa' => false, 'admin' => $esAdmin]);
  }
}

// --- Recuperación de contraseña para miembros ---
if ($action === 'password_reset_request') {
  if (!check_rate_limit('password_reset_request', 5, 3600)) {
    fail('Demasiadas solicitudes. Espera una hora.', 429);
  }

  $email = strtolower(trim($in['email'] ?? ''));
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Correo electrónico inválido.', 422);
  }

  $members = load_json('members', []);
  $m = find_member($members, $email);

  // Responder igual exista o no exista la cuenta evita confirmar correos a terceros.
  if ($m) {
    $token = bin2hex(random_bytes(24));
    $tokens = load_json('password-resets', []);
    $now = time();
    $tokens = array_values(array_filter($tokens, fn($r) => (int)($r['expira'] ?? 0) > $now));
    $tokens[] = [
      'id' => uid(),
      'member_id' => $m['id'] ?? '',
      'email' => $email,
      'token' => password_hash($token, PASSWORD_BCRYPT),
      'expira' => $now + 3600,
      'created_at' => now_iso(),
      'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    ];
    save_json('password-resets', $tokens);

    require_once __DIR__ . '/mailer.php';
    $enlace = 'https://redcafeecuador.com/recuperar/?token=' . $token;
    mailer_send('password_reset', $email, [
      'nombre' => $m['nombre'] ?? 'miembro de la Red',
      'enlace' => $enlace,
    ]);
  }

  ok(['enviado' => true]);
}

if ($action === 'password_reset_confirm') {
  if (!check_rate_limit('password_reset_confirm', 10, 3600)) {
    fail('Demasiados intentos. Espera una hora.', 429);
  }

  $token = trim($in['token'] ?? '');
  $new = $in['new'] ?? '';
  $confirm = $in['confirm'] ?? '';

  if ($token === '') fail('Token de recuperación requerido.', 422);
  if (strlen($new) < 8) fail('La nueva contraseña debe tener mínimo 8 caracteres.', 422);
  if (strlen($new) > 200) fail('La nueva contraseña es demasiado larga.', 422);
  if ($new !== $confirm) fail('La confirmación no coincide.', 422);

  $tokens = load_json('password-resets', []);
  $now = time();
  $matchIndex = null;
  $match = null;
  foreach ($tokens as $idx => $r) {
    if ((int)($r['expira'] ?? 0) <= $now) continue;
    if (!empty($r['token']) && password_verify($token, $r['token'])) {
      $matchIndex = $idx;
      $match = $r;
      break;
    }
  }
  if (!$match) {
    fail('El enlace de recuperación no es válido o ya caducó.', 401);
  }

  $members = load_json('members', []);
  $found = false;
  foreach ($members as &$m) {
    if (($m['id'] ?? '') === ($match['member_id'] ?? '')) {
      $m['pass'] = password_hash($new, PASSWORD_BCRYPT);
      $m['updated_at'] = now_iso();
      $m['pass_reset_at'] = now_iso();
      $found = true;
      break;
    }
  }
  unset($m);
  if (!$found) fail('Usuario no encontrado.', 404);

  unset($tokens[$matchIndex]);
  $tokens = array_values(array_filter($tokens, fn($r) => (int)($r['expira'] ?? 0) > $now));
  save_json('members', $members);
  save_json('password-resets', $tokens);
  ok(['changed' => true]);
}

// --- Admin Login ---
if ($action === 'admin_login') {
  $pass = $in['pass'] ?? '';
  $remember = !empty($in['remember']);

  if (!check_rate_limit('admin_login', 20, 600)) {
    fail('Demasiados intentos admin. Espera 10 minutos.', 429);
  }

  // La contraseña provisional que viaja en el paquete de recuperación CADUCA.
  // Si el ZIP se filtra más tarde, esa contraseña ya no sirve para entrar.
  $marca = __DIR__ . '/../data/.admin_pass_expira';
  if (file_exists($marca)) {
    $limite = trim((string) file_get_contents($marca));
    if ($limite !== '' && strtotime($limite) !== false && time() > strtotime($limite)) {
      fail('La contraseña provisional caducó. Pide una nueva desde «He olvidado la contraseña».', 401);
    }
  }

  $adminPass = get_admin_password();
  if (!admin_verify_password($pass, $adminPass)) fail('Contraseña admin incorrecta.', 401);

  // Entrar con la provisional la consume: se borra la marca de caducidad y se
  // avisa a la interfaz de que hay que cambiarla ya.
  $eraProvisional = file_exists($marca);

  // Migrar a hash si el archivo aún está en claro (primer login correcto)
  if (!admin_is_hashed($adminPass)) {
    admin_write_password(password_hash($adminPass, PASSWORD_BCRYPT));
  }

  session_regenerate_id(true);
  $_SESSION['admin'] = true;
  $_SESSION['admin_login_at'] = now_iso();
  $_SESSION['admin_remember'] = $remember;
  refresh_session_cookie($remember);
  ok(['admin' => true, 'debe_cambiar_pass' => $eraProvisional]);
}

// --- Admin Logout ---
if ($action === 'admin_logout') {
  unset($_SESSION['admin']);
  unset($_SESSION['admin_login_at']);
  ok();
}

// --- Admin Me ---
if ($action === 'admin_me') {
  ok(['admin' => !empty($_SESSION['admin'])]);
}

// --- Cambio de contraseña del usuario autenticado ---
if ($action === 'change_password') {
  // Aceptar tanto sesión completa como 2fa_pending_user (usuario con código OTP pendiente)
  $u = current_user();
  $pendingId = $_SESSION['2fa_pending_user'] ?? null;
  if (!$u && !$pendingId) fail('No autenticado.', 401);

  $userId = $u['id'] ?? $pendingId;

  $current = $in['current'] ?? '';
  $new     = $in['new'] ?? '';
  $confirm = $in['confirm'] ?? '';

  if (strlen($new) < 8) fail('La nueva contraseña debe tener mínimo 8 caracteres.', 422);
  if (strlen($new) > 200) fail('La nueva contraseña es demasiado larga.', 422);
  if ($new !== $confirm) fail('La confirmación no coincide.', 422);

  $members = load_json('members', []);
  $found = false;
  foreach ($members as &$m) {
    if (($m['id'] ?? '') === $userId) {
      if (!password_verify($current, $m['pass'] ?? '')) {
        fail('La contraseña actual es incorrecta.', 401);
      }
      $m['pass'] = password_hash($new, PASSWORD_BCRYPT);
      $m['updated_at'] = now_iso();
      $found = true;
      break;
    }
  }
  unset($m);
  if (!$found) fail('Usuario no encontrado.', 404);

  save_json('members', $members);
  ok(['changed' => true]);
}

// --- Cambio de contraseña de cualquier miembro (admin) ---
if ($action === 'admin_change_password') {
  require_admin();

  $targetId = $in['id'] ?? $_GET['id'] ?? '';
  $new      = $in['new'] ?? '';
  $confirm  = $in['confirm'] ?? '';

  if (!$targetId) fail('id requerido.');
  if (strlen($new) < 8) fail('La nueva contraseña debe tener mínimo 8 caracteres.', 422);
  if (strlen($new) > 200) fail('La nueva contraseña es demasiado larga.', 422);
  if ($new !== $confirm) fail('La confirmación no coincide.', 422);

  $members = load_json('members', []);
  $found = false;
  foreach ($members as &$m) {
    if (($m['id'] ?? '') === $targetId) {
      $m['pass'] = password_hash($new, PASSWORD_BCRYPT);
      $m['updated_at'] = now_iso();
      $m['pass_reset_by'] = $_SESSION['admin_login_at'] ?? 'admin';
      $found = true;
      break;
    }
  }
  unset($m);
  if (!$found) fail('Miembro no encontrado.', 404);

  save_json('members', $members);
  ok(['changed' => true, 'id' => $targetId]);
}

// --- Cambio de contraseña del propio admin (logueado) ---
if ($action === 'admin_change_own_password') {
  require_admin();

  $current = $in['current'] ?? '';
  $new     = $in['new'] ?? '';
  $confirm = $in['confirm'] ?? '';

  if (strlen($new) < 8) fail('La nueva contraseña debe tener mínimo 8 caracteres.', 422);
  if (strlen($new) > 200) fail('La nueva contraseña es demasiado larga.', 422);
  if ($new !== $confirm) fail('La confirmación no coincide.', 422);

  $adminPass = get_admin_password();
  if (!admin_verify_password($current, $adminPass)) {
    fail('La contraseña actual es incorrecta.', 401);
  }

  // Escribir SIEMPRE el hash (nunca en claro)
  admin_write_password(password_hash($new, PASSWORD_BCRYPT));

  ok(['changed' => true]);
}

// --- Recuperar / regenerar contraseña admin (sin saber la actual) ---
// Solo accesible si NO hay sesión admin (modo recuperación de emergencia).
// En producción real, esto debería estar protegido por .htaccess o solo accesible desde IP de confianza.
// Por simplicidad aquí requiere conocer un token de recuperación definido en variable de entorno o archivo.
/* ─────────────────────────────────────────────────────────────────────────
   RECUPERACIÓN DE LA CONTRASEÑA DE ADMINISTRADOR

   El destino del correo está FIJADO EN EL SERVIDOR y no se acepta por
   parámetro. Si se pudiera indicar a dónde mandar el enlace, cualquiera
   pediría el reset hacia su propio buzón y se quedaría con el panel.
   ───────────────────────────────────────────────────────────────────────── */
const ADMIN_RESET_EMAIL = 'redcafeecuador@gmail.com';
const ADMIN_RESET_VIGENCIA = 3600; // una hora

if ($action === 'admin_reset_request') {
  // Límite estricto: este endpoint manda correo y no pide autenticación.
  if (!check_rate_limit('admin_reset_request', 3, 3600)) {
    fail('Demasiadas solicitudes. Espera una hora.', 429);
  }

  $token = bin2hex(random_bytes(24));
  $archivo = __DIR__ . '/../data/.admin_reset_token';
  @file_put_contents($archivo, json_encode([
    'token' => password_hash($token, PASSWORD_BCRYPT),
    'expira' => time() + ADMIN_RESET_VIGENCIA,
  ]));
  @chmod($archivo, 0600);

  $enlace = 'https://redcafeecuador.com/api/auth.php?action=admin_reset_password&token=' . $token;
  require_once __DIR__ . '/mailer.php';
  $enviado = mailer_send('admin_reset', ADMIN_RESET_EMAIL, ['enlace' => $enlace]);

  // Se responde igual haya salido o no el correo: decir "no existe" o "falló"
  // le confirmaría a un desconocido qué buzón está configurado.
  if (!$enviado) {
    error_log('[RedCafe] admin_reset_request: mail() devolvió false');
  }
  ok(['enviado' => true, 'destino' => 'el correo registrado de la Red']);
}

if ($action === 'admin_reset_password') {
  $token = $in['token'] ?? $_GET['token'] ?? '';
  $archivo = __DIR__ . '/../data/.admin_reset_token';
  $guardado = file_exists($archivo) ? json_decode((string) file_get_contents($archivo), true) : null;

  if (!is_array($guardado) || empty($guardado['token']) || empty($guardado['expira'])) {
    fail('No hay ninguna solicitud de recuperación activa.', 401);
  }
  if (time() > (int) $guardado['expira']) {
    @unlink($archivo);
    fail('El enlace de recuperación caducó. Pide uno nuevo.', 401);
  }
  if ($token === '' || !password_verify($token, $guardado['token'])) {
    fail('Token de recuperación inválido.', 401);
  }
  @unlink($archivo); // un solo uso

  $nueva = bin2hex(random_bytes(9));
  admin_write_password(password_hash($nueva, PASSWORD_BCRYPT));
  // Al restablecer se levanta la caducidad de la provisional: esta ya es la buena.
  @unlink(__DIR__ . '/../data/.admin_pass_expira');

  header('Content-Type: text/html; charset=utf-8');
  echo '<!doctype html><meta charset="utf-8"><title>Contraseña restablecida</title>'
     . '<body style="font:16px/1.6 system-ui;max-width:34rem;margin:3rem auto;padding:0 1rem;color:#14140F">'
     . '<h1 style="font-size:1.35rem">Contraseña de administrador restablecida</h1>'
     . '<p>Esta es tu nueva contraseña. <b>Cópiala ahora</b>: no se vuelve a mostrar y este enlace ya no sirve.</p>'
     . '<p style="font:1.25rem/1.4 ui-monospace,monospace;background:#F3F1EA;padding:1rem;border-left:4px solid #A94E17">'
     . htmlspecialchars($nueva, ENT_QUOTES) . '</p>'
     . '<p><a href="https://redcafeecuador.com/admin/">Entrar al panel</a> y cámbiala por una tuya desde Ajustes.</p>'
     . '</body>';
  exit;
}

fail('Acción no válida.', 400);
