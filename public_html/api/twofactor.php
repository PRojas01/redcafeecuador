<?php
/**
 * API 2FA — Autenticación de dos factores por email (OTP).
 *
 * Esquema:
 *   1. Usuario envía email + password a /api/auth.php?action=login
 *   2. Si password OK y 2FA está activo, no se crea sesión todavía
 *   3. Se genera código OTP (6 dígitos, válido 10 min) y se envía por email
 *   4. Usuario envía código a /api/auth.php?action=verify_otp
 *   5. Sesión creada
 *
 * Backup codes:
 *   - 10 códigos de 8 chars generados al activar 2FA
 *   - Almacenados hasheados en data/backup-codes.json
 *   - Cada uno de un solo uso
 *
 * Admin:
 *   - No usa 2FA (decisión del producto)
 *
 * Acciones:
 *   - send_otp: (interno, llamado desde login)
 *   - verify_otp: usuario ingresa código
 *   - enable_2fa: usuario autenticado activa 2FA
 *   - disable_2fa: desactiva con código actual
 *   - regenerate_backup: regenera códigos de respaldo
 *   - status: ver estado 2FA del usuario autenticado
 */

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/_bootstrap.php';

const OTP_FILE     = DATA_DIR . '/otp-active.json';        // códigos activos
const BACKUP_FILE  = DATA_DIR . '/backup-codes.json';       // códigos de respaldo hasheados
const OTP_DEBUG    = DATA_DIR . '/otp-debug.log';           // log cuando mail() falla

const OTP_TTL_SECONDS = 600;   // 10 minutos
const BACKUP_CODE_COUNT = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────

function otp_read_all(): array {
  if (!file_exists(OTP_FILE)) return [];
  $j = json_decode(file_get_contents(OTP_FILE), true);
  return is_array($j) ? $j : [];
}

function otp_write_all(array $data): bool {
  $tmp = OTP_FILE . '.' . bin2hex(random_bytes(4)) . '.tmp';
  $fp = fopen($tmp, 'w');
  if (!$fp) return false;
  flock($fp, LOCK_EX);
  fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  return rename($tmp, OTP_FILE);
}

function otp_clean_expired(): array {
  $data = otp_read_all();
  $now = time();
  $clean = [];
  foreach ($data as $k => $row) {
    if (($row['expires_at'] ?? 0) >= $now) {
      $clean[$k] = $row;
    }
  }
  if (count($clean) !== count($data)) {
    otp_write_all($clean);
  }
  return $clean;
}

function otp_generate_code(): string {
  return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function otp_hash(string $code): string {
  return hash('sha256', $code . 'redcafe_salt_2026');
}

/** Códigos de respaldo: bcrypt. Antes sha256 con sal fija, rompible en una hora. */
function backup_hash(string $code): string {
  return password_hash(strtoupper($code), PASSWORD_BCRYPT);
}

/** Acepta el formato nuevo (bcrypt) y el antiguo (sha256) de los ya emitidos. */
function backup_verifica(string $code, string $guardado): bool {
  if (str_starts_with($guardado, '$2y$')) return password_verify(strtoupper($code), $guardado);
  return hash_equals($guardado, otp_hash($code));
}

/** Máximo de códigos erróneos antes de anular el código vigente. */
const OTP_MAX_FALLOS = 5;

function otp_send_email(string $to, string $nombre, string $code): bool {
  // Usar plantilla HTML de marca si mailer.php está disponible
  if (file_exists(__DIR__ . '/mailer.php')) {
    @include_once __DIR__ . '/mailer.php';
  }
  if (function_exists('mailer_send')) {
    $ok = mailer_send('codigo', $to, ['nombre' => $nombre, 'code' => $code]);
  } else {
    $subject = 'Tu código de verificación Red Café Ecuador';
    $body = "Hola $nombre,\n\n"
          . "Tu código de verificación es: $code\n\n"
          . "Válido por 10 minutos. Si no solicitaste este código, ignora este mensaje.\n\n"
          . "— Red Café Ecuador";
    $headers = "From: Red Café Ecuador <no-reply@redcafeecuador.com>\r\n"
             . "Reply-To: no-reply@redcafeecuador.com\r\n"
             . "Content-Type: text/plain; charset=utf-8\r\n";
    $ok = @mail($to, $subject, $body, $headers);
  }

  if (!$ok) {
    // Se registra el fallo de envío, nunca el código (un secreto de acceso no
    // se guarda en claro en un registro).
    $line = "[" . date('Y-m-d H:i:s') . "] fallo de envío del código a " . substr($to, 0, 3) . "***\n";
    @file_put_contents(OTP_DEBUG, $line, FILE_APPEND | LOCK_EX);
    @chmod(OTP_DEBUG, 0600);
  }
  return $ok;
}

function backup_read_all(): array {
  if (!file_exists(BACKUP_FILE)) return [];
  $j = json_decode(file_get_contents(BACKUP_FILE), true);
  return is_array($j) ? $j : [];
}

function backup_write_all(array $data): bool {
  $tmp = BACKUP_FILE . '.tmp';
  $fp = fopen($tmp, 'w');
  if (!$fp) return false;
  flock($fp, LOCK_EX);
  fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  return rename($tmp, BACKUP_FILE);
}

function backup_generate_codes(int $count = BACKUP_CODE_COUNT): array {
  $codes = [];
  for ($i = 0; $i < $count; $i++) {
    // Formato legible: XXXX-XXXX
    $p1 = strtoupper(bin2hex(random_bytes(2)));
    $p2 = strtoupper(bin2hex(random_bytes(2)));
    $codes[] = "$p1-$p2";
  }
  return $codes;
}

// ─── Helpers de estado 2FA ─────────────────────────────────────────────────

function user_2fa_enabled(string $userId): bool {
  $members = load_json('members', []);
  foreach ($members as $m) {
    if (($m['id'] ?? '') === $userId) {
      return (bool)($m['two_factor_enabled'] ?? false);
    }
  }
  return false;
}

function user_set_2fa(string $userId, bool $enabled): bool {
  $found = false;
  mutate_json('members', [], function (array $members) use ($userId, $enabled, &$found) {
    foreach ($members as &$m) {
      if (($m['id'] ?? '') === $userId) {
        $m['two_factor_enabled'] = $enabled;
        $m['two_factor_updated_at'] = gmdate('c');
        if (!$enabled) $m['backup_codes'] = [];
        $found = true;
        break;
      }
    }
    unset($m);
    return $members;
  });
  return $found;
}

/** Guarda (o borra, con []) los códigos de respaldo ya cifrados del miembro. */
function user_set_backup(string $userId, array $hashes): void {
  mutate_json('members', [], function (array $members) use ($userId, $hashes) {
    foreach ($members as &$m) {
      if (($m['id'] ?? '') === $userId) { $m['backup_codes'] = $hashes; break; }
    }
    unset($m);
    return $members;
  });
}

// ─── Router ────────────────────────────────────────────────────────────────

$action = $_GET['action'] ?? '';

switch ($action) {

  // ─────────────── VERIFY OTP (login step 2) ───────────────
  case 'verify_otp': {
    if (!check_rate_limit('otp_verify', 5, 600)) fail('Demasiados intentos. Espera 10 minutos.', 429);
    $in = input();
    $code = trim($in['code'] ?? '');
    $pendingId = $_SESSION['2fa_pending_user'] ?? '';

    if (!$pendingId) {
      fail('No hay verificación pendiente. Inicia sesión primero.', 400);
    }
    if (!preg_match('/^[0-9]{6}$/', $code) && !preg_match('/^[A-Z0-9]{4}-[A-Z0-9]{4}$/', $code)) {
      fail('Código inválido.');
    }

    // Primero probar como código OTP activo
    $all = otp_clean_expired();
    $matched = false;
    $clave = null;
    foreach ($all as $k => $row) {
      if (($row['user_id'] ?? '') === $pendingId && empty($row['purpose'])) { $clave = $k; break; }
    }
    if ($clave !== null && hash_equals($all[$clave]['code_hash'] ?? '', otp_hash($code))) {
      unset($all[$clave]);
      otp_write_all($all);
      $matched = true;
    }

    // Si no match, probar como código de respaldo (cada uno sirve una vez)
    if (!$matched && preg_match('/^[A-Z0-9]{4}-[A-Z0-9]{4}$/i', $code)) {
      mutate_json('members', [], function (array $members) use ($pendingId, $code, &$matched) {
        foreach ($members as &$m) {
          if (($m['id'] ?? '') !== $pendingId) continue;
          $codes = (array)($m['backup_codes'] ?? []);
          foreach ($codes as $i => $bc) {
            if (backup_verifica($code, (string)$bc)) {
              array_splice($codes, $i, 1);
              $m['backup_codes'] = array_values($codes);
              $matched = true;
              break;
            }
          }
          break;
        }
        unset($m);
        return $members;
      });
    }

    // El límite por IP no basta: con muchas IP se probaban códigos sin fin.
    // Tras OTP_MAX_FALLOS errores el código se anula y hay que pedir otro.
    if (!$matched && $clave !== null) {
      $all = otp_read_all();
      if (isset($all[$clave])) {
        $all[$clave]['fallos'] = (int)($all[$clave]['fallos'] ?? 0) + 1;
        if ($all[$clave]['fallos'] >= OTP_MAX_FALLOS) {
          unset($all[$clave]);
          otp_write_all($all);
          fail('Demasiados códigos incorrectos. Pide un código nuevo.', 401);
        }
        otp_write_all($all);
      }
    }

    if (!$matched) fail('Código incorrecto o expirado.', 401);

    // Cargar usuario completo y crear sesión
    $members = load_json('members', []);
    $user = null;
    foreach ($members as $m) {
      if (($m['id'] ?? '') === $pendingId) {
        $user = $m;
        break;
      }
    }
    if (!$user) fail('Usuario no encontrado.', 404);

    $remember = !empty($_SESSION['2fa_remember']);
    unset($_SESSION['2fa_pending_user']);
    unset($_SESSION['2fa_remember']);
    session_regenerate_id(true);
    $_SESSION['user'] = sanitize_user($user);
    $_SESSION['remember'] = $remember;
    marcar_inicio_sesion();
    refresh_session_cookie($remember);

    ok(['user' => $_SESSION['user'], 'two_factor_used' => true]);
  }

  // ─────────────── RESEND OTP ───────────────
  case 'resend_otp': {
    // Evita reenvíos repetidos de códigos que saturen el correo del usuario.
    if (!check_rate_limit('otp_resend', 10, 3600)) {
      fail('Demasiados reenvíos de código seguidos. Vuelve a intentarlo en una hora.', 429);
    }

    $pendingId = $_SESSION['2fa_pending_user'] ?? '';
    if (!$pendingId) fail('No hay verificación pendiente.', 400);

    $members = load_json('members', []);
    $user = null;
    foreach ($members as $m) {
      if (($m['id'] ?? '') === $pendingId) {
        $user = $m;
        break;
      }
    }
    if (!$user) fail('Usuario no encontrado.', 404);

    $code = otp_generate_code();
    $all = otp_clean_expired();
    $all[$pendingId] = [
      'user_id'    => $pendingId,
      'code_hash'  => otp_hash($code),
      'expires_at' => time() + OTP_TTL_SECONDS,
      'created_at' => gmdate('c'),
    ];
    otp_write_all($all);

    $sent = otp_send_email($user['email'], $user['nombre'], $code);

    ok([
      'sent'   => $sent,
      'to'     => substr($user['email'], 0, 3) . '***@' . explode('@', $user['email'])[1],
    ]);
  }

  // ─────────────── ENABLE 2FA (usuario autenticado) ───────────────
  case 'enable_2fa': {
    $u = current_user();

    // El cupo se cuenta por dirección IP, así que se comprueba solo con sesión:
    // si no, alguien de fuera agotaría el de quien comparte salida a internet.
    // Evita generación repetida de códigos al activar 2FA.
    if (!check_rate_limit('otp_enable', 10, 3600)) {
      fail('Demasiados intentos de activar 2FA seguidos. Vuelve a intentarlo en una hora.', 429);
    }

    if (!$u) fail('No autenticado.', 401);

    if (user_2fa_enabled($u['id'])) {
      fail('2FA ya está activo. Desactívalo primero si quieres reiniciar.');
    }

    $code = otp_generate_code();
    $all = otp_clean_expired();
    $all[$u['id'] . ':enable'] = [
      'user_id'    => $u['id'],
      'purpose'    => 'enable',
      'code_hash'  => otp_hash($code),
      'expires_at' => time() + OTP_TTL_SECONDS,
      'created_at' => gmdate('c'),
    ];
    otp_write_all($all);

    $members = load_json('members', []);
    foreach ($members as $m) {
      if (($m['id'] ?? '') === $u['id']) {
        otp_send_email($m['email'], $m['nombre'], $code);
        break;
      }
    }

    // Generar backup codes
    $plainCodes = backup_generate_codes();
    user_set_backup((string)$u['id'], array_map('backup_hash', $plainCodes));

    ok([
      'sent'         => true,
      'purpose'      => 'enable',
      'backup_codes' => $plainCodes, // solo se muestran una vez
      'message'      => 'Confirma con el código enviado a tu email. Guarda los códigos de respaldo en lugar seguro.',
    ]);
  }

  // ─────────────── CONFIRM ENABLE 2FA ───────────────
  case 'confirm_enable_2fa': {
    $u = current_user();
    if (!$u) fail('No autenticado.', 401);
    if (!check_rate_limit('otp_confirm', 10, 600)) fail('Demasiados intentos. Espera 10 minutos.', 429);

    $in = input();
    $code = trim($in['code'] ?? '');
    if (!preg_match('/^[0-9]{6}$/', $code)) fail('Código inválido.');

    $all = otp_clean_expired();
    $key = $u['id'] . ':enable';
    if (!isset($all[$key])) fail('Código expirado. Solicita uno nuevo.');
    if (!hash_equals($all[$key]['code_hash'] ?? '', otp_hash($code))) fail('Código incorrecto.', 401);

    unset($all[$key]);
    otp_write_all($all);
    user_set_2fa($u['id'], true);

    ok(['enabled' => true]);
  }

  // ─────────────── DISABLE 2FA ───────────────
  case 'disable_2fa': {
    $u = current_user();
    if (!$u) fail('No autenticado.', 401);
    if (!check_rate_limit('otp_disable', 10, 600)) fail('Demasiados intentos. Espera 10 minutos.', 429);

    $in = input();
    $code = trim($in['code'] ?? '');

    if (!user_2fa_enabled($u['id'])) fail('2FA no está activo.');

    // Verificar código OTP o password
    if (strlen($code) === 6 && preg_match('/^[0-9]{6}$/', $code)) {
      $all = otp_clean_expired();
      $matched = false;
      foreach ($all as $k => $row) {
        if (($row['user_id'] ?? '') === $u['id']) {
          if (hash_equals($row['code_hash'] ?? '', otp_hash($code))) {
            unset($all[$k]);
            otp_write_all($all);
            $matched = true;
            break;
          }
        }
      }
      if (!$matched) fail('Código incorrecto.', 401);
    } else {
      // Asumir password
      $members = load_json('members', []);
      foreach ($members as $m) {
        if (($m['id'] ?? '') === $u['id']) {
          if (!password_verify($code, $m['pass'] ?? '')) {
            fail('Contraseña incorrecta.', 401);
          }
          break;
        }
      }
    }

    user_set_2fa($u['id'], false);   // también borra los códigos de respaldo

    ok(['disabled' => true]);
  }

  // ─────────────── REGENERATE BACKUP CODES ───────────────
  case 'regenerate_backup': {
    $u = current_user();
    if (!$u) fail('No autenticado.', 401);
    if (!check_rate_limit('otp_regenerate', 10, 600)) fail('Demasiados intentos. Espera 10 minutos.', 429);

    if (!user_2fa_enabled($u['id'])) fail('Activa 2FA primero.');

    $in = input();
    $code = trim($in['code'] ?? '');
    $all = otp_clean_expired();
    $matched = false;
    foreach ($all as $k => $row) {
      if (($row['user_id'] ?? '') === $u['id']) {
        if (hash_equals($row['code_hash'] ?? '', otp_hash($code))) {
          unset($all[$k]);
          otp_write_all($all);
          $matched = true;
          break;
        }
      }
    }
    if (!$matched) fail('Código OTP incorrecto.', 401);

    $plainCodes = backup_generate_codes();
    user_set_backup((string)$u['id'], array_map('backup_hash', $plainCodes));

    ok(['backup_codes' => $plainCodes]);
  }

  // ─────────────── STATUS ───────────────
  case 'status': {
    $u = current_user();
    if (!$u) fail('No autenticado.', 401);

    $members = load_json('members', []);
    foreach ($members as $m) {
      if (($m['id'] ?? '') === $u['id']) {
        ok([
          'enabled'        => (bool)($m['two_factor_enabled'] ?? false),
          'backup_codes_remaining' => count($m['backup_codes'] ?? []),
          'updated_at'     => $m['two_factor_updated_at'] ?? null,
        ]);
      }
    }
    fail('Usuario no encontrado.', 404);
  }

  default:
    fail('Acción no válida.');
}
