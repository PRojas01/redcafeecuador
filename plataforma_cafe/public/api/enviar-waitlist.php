<?php
// API Waitlist — Captura de leads de la landing (pre-registro).
// Guarda en data/waitlist.json (dedupe por email) y avisa por correo sin bloquear.

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/_bootstrap.php';

$in = input();
$nombre = trim((string)($in['nombre'] ?? ''));
$email  = strtolower(trim((string)($in['email'] ?? '')));
$perfil = (string)($in['perfil'] ?? '');

// Lista cerrada: debe coincidir con <select> de components/Waitlist.tsx
$perfiles = ['productor', 'vendedor', 'comprador', 'proveedor', 'amante', 'asesor', 'interesado'];

if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 100) fail('Nombre: 2-100 caracteres.', 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Correo electrónico inválido.', 422);
if (!in_array($perfil, $perfiles, true)) fail('Perfil inválido.', 422);

if (!check_rate_limit('waitlist', 5, 600)) {
  fail('Demasiados envíos. Espera unos minutos.', 429);
}

$leads = load_json('waitlist', []);
if (find_member($leads, $email)) fail('duplicado', 409);

$leads[] = [
  'id'     => uid(),
  'nombre' => $nombre,
  'email'  => $email,
  'perfil' => $perfil,
  'ip'     => $_SERVER['REMOTE_ADDR'] ?? '',
  'ua'     => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200),
  'ts'     => now_iso(),
];
save_json('waitlist', $leads);

// Aviso por correo: si mailer.php está disponible, sin bloquear la respuesta
@include_once __DIR__ . '/mailer.php';
if (function_exists('mailer_send')) {
  mailer_send('waitlist', $email, ['nombre' => $nombre, 'perfil' => $perfil]);
}

ok(['id' => $leads[count($leads) - 1]['id']]);
