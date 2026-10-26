<?php
/**
 * Red Café Ecuador — Web Push sin dependencias externas.
 *
 * Se puede llamar como endpoint (`api/push.php?action=...`) o incluir desde
 * `_avisos.php` para enviar un push al mismo tiempo que se guarda la campana.
 */

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
// aviso_enlace_seguro() vive en _avisos.php. Llamado como endpoint suelto
// (?action=prueba) ese archivo no estaría cargado y el envío moría en silencio.
require_once __DIR__ . '/_avisos.php';

const PUSH_VAPID_FILE = DATA_DIR . '/.push_vapid.json';
const PUSH_SUBJECT = 'mailto:soporte@redcafeecuador.com';
const PUSH_TTL = 86400;
const PUSH_RS = 4096;
// Tope de tiempo que el push puede robarle a la petición del usuario. El aviso
// interno (la campana) ya está guardado; el push es un extra y no vale la pena
// que un proveedor lento demore un pedido.
const PUSH_PRESUPUESTO_SEG = 2.5;
const PUSH_P256_SPKI_PREFIX = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

function push_b64url(string $bin): string {
  return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function push_b64url_decode(string $txt): string {
  $txt = strtr(trim($txt), '-_', '+/');
  $pad = strlen($txt) % 4;
  if ($pad) $txt .= str_repeat('=', 4 - $pad);
  $bin = base64_decode($txt, true);
  return $bin === false ? '' : $bin;
}

/** OpenSSL puede recortar el cero inicial de x/y; el punto sin comprimir exige 32 bytes cada uno. */
function push_punto_ec(array $det): string {
  $x = (string)($det['ec']['x'] ?? '');
  $y = (string)($det['ec']['y'] ?? '');
  if ($x === '' || $y === '' || strlen($x) > 32 || strlen($y) > 32) return '';
  return "\x04" . str_pad($x, 32, "\x00", STR_PAD_LEFT) . str_pad($y, 32, "\x00", STR_PAD_LEFT);
}

function push_pem_desde_punto(string $raw): string {
  $der = hex2bin(PUSH_P256_SPKI_PREFIX) . $raw;
  return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

function push_generar_par_claves(): array {
  $res = openssl_pkey_new([
    'private_key_type' => OPENSSL_KEYTYPE_EC,
    'curve_name' => 'prime256v1',
  ]);
  if (!$res) throw new RuntimeException('No se pudo crear clave VAPID.');
  $pem = '';
  openssl_pkey_export($res, $pem);
  $punto = push_punto_ec(openssl_pkey_get_details($res) ?: []);
  if ($punto === '') throw new RuntimeException('Clave VAPID inválida.');
  return [
    'privada_pem' => $pem,
    'publica' => push_b64url($punto),
    'creada' => now_iso(),
  ];
}

function push_vapid(): array {
  if (file_exists(PUSH_VAPID_FILE)) {
    $j = json_decode((string)@file_get_contents(PUSH_VAPID_FILE), true);
    if (is_array($j) && !empty($j['privada_pem']) && !empty($j['publica'])) return $j;
  }
  $j = push_generar_par_claves();
  @file_put_contents(PUSH_VAPID_FILE, json_encode($j, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
  @chmod(PUSH_VAPID_FILE, 0600);
  return $j;
}

function push_vapid_existe(): bool {
  if (!file_exists(PUSH_VAPID_FILE)) return false;
  $j = json_decode((string)@file_get_contents(PUSH_VAPID_FILE), true);
  return is_array($j) && !empty($j['publica']);
}

function push_origen_endpoint(string $endpoint): string {
  $p = parse_url($endpoint);
  if (!is_array($p) || empty($p['scheme']) || empty($p['host'])) return '';
  $origen = strtolower((string)$p['scheme']) . '://' . strtolower((string)$p['host']);
  if (!empty($p['port'])) $origen .= ':' . (int)$p['port'];
  return $origen;
}

function push_der_a_raw_firma(string $der): string {
  $i = 0;
  if (($der[$i++] ?? '') !== "\x30") return '';
  $len = ord($der[$i++] ?? "\x00");
  if ($len & 0x80) {
    $n = $len & 0x7f;
    $len = 0;
    while ($n-- > 0) $len = ($len << 8) + ord($der[$i++] ?? "\x00");
  }
  if (($der[$i++] ?? '') !== "\x02") return '';
  $rLen = ord($der[$i++] ?? "\x00");
  $r = substr($der, $i, $rLen);
  $i += $rLen;
  if (($der[$i++] ?? '') !== "\x02") return '';
  $sLen = ord($der[$i++] ?? "\x00");
  $s = substr($der, $i, $sLen);
  $r = substr(ltrim($r, "\x00"), -32);
  $s = substr(ltrim($s, "\x00"), -32);
  return str_pad($r, 32, "\x00", STR_PAD_LEFT) . str_pad($s, 32, "\x00", STR_PAD_LEFT);
}

function push_jwt_vapid(string $endpoint, array $vapid): string {
  $head = push_b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256'], JSON_UNESCAPED_SLASHES));
  $body = push_b64url(json_encode([
    'aud' => push_origen_endpoint($endpoint),
    'exp' => time() + 43200,
    'sub' => PUSH_SUBJECT,
  ], JSON_UNESCAPED_SLASHES));
  $firmar = $head . '.' . $body;
  $der = '';
  $ok = openssl_sign($firmar, $der, (string)$vapid['privada_pem'], OPENSSL_ALGO_SHA256);
  if (!$ok) throw new RuntimeException('No se pudo firmar VAPID.');
  $raw = push_der_a_raw_firma($der);
  if (strlen($raw) !== 64) throw new RuntimeException('Firma VAPID inválida.');
  return $firmar . '.' . push_b64url($raw);
}

function push_cifrar(array $sub, array $payload): string {
  $uaPublic = push_b64url_decode((string)($sub['keys']['p256dh'] ?? ''));
  $authSecret = push_b64url_decode((string)($sub['keys']['auth'] ?? ''));
  if (strlen($uaPublic) !== 65 || $uaPublic[0] !== "\x04" || strlen($authSecret) < 16) {
    throw new RuntimeException('Suscripción push inválida.');
  }

  $tmp = openssl_pkey_new([
    'private_key_type' => OPENSSL_KEYTYPE_EC,
    'curve_name' => 'prime256v1',
  ]);
  if (!$tmp) throw new RuntimeException('No se pudo crear clave efímera.');
  $asPublic = push_punto_ec(openssl_pkey_get_details($tmp) ?: []);
  if ($asPublic === '') throw new RuntimeException('Clave efímera inválida.');
  $uaPem = push_pem_desde_punto($uaPublic);
  $uaKey = openssl_pkey_get_public($uaPem);
  if (!$uaKey) throw new RuntimeException('Clave pública del navegador inválida.');
  // Sin tercer argumento: en P-256 el secreto ya son 32 bytes y el parámetro
  // está obsoleto desde PHP 8.4 (llenaría el log de avisos en cada envío).
  $secret = openssl_pkey_derive($uaKey, $tmp);
  if (!is_string($secret) || strlen($secret) !== 32) throw new RuntimeException('No se pudo derivar secreto push.');

  $ikm = hash_hkdf('sha256', $secret, 32, "WebPush: info\0" . $uaPublic . $asPublic, $authSecret);
  $salt = random_bytes(16);
  $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
  $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);
  $plain = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\x02";
  $tag = '';
  $cipher = openssl_encrypt($plain, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
  if (!is_string($cipher)) throw new RuntimeException('No se pudo cifrar push.');
  return $salt . pack('N', PUSH_RS) . chr(65) . $asPublic . $cipher . $tag;
}

function push_post_https(string $url, array $headers, string $body): int {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    if (!$ch) return 0;
    curl_setopt_array($ch, [
      CURLOPT_POST => true,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CONNECTTIMEOUT => 3,
      CURLOPT_TIMEOUT => 3,
      CURLOPT_HTTPHEADER => $headers,
      CURLOPT_POSTFIELDS => $body,
    ]);
    curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return $code;
  }

  $ctx = stream_context_create([
    'http' => [
      'method' => 'POST',
      'header' => implode("\r\n", $headers) . "\r\n",
      'content' => $body,
      'timeout' => 3,
      'ignore_errors' => true,
    ],
  ]);
  $prev = ini_get('default_socket_timeout');
  @ini_set('default_socket_timeout', '3');
  @file_get_contents($url, false, $ctx);
  @ini_set('default_socket_timeout', (string)$prev);
  $linea = $http_response_header[0] ?? '';
  return preg_match('/\s(\d{3})\s/', $linea, $m) ? (int)$m[1] : 0;
}

/** Segundos ya gastados enviando push en esta petición. */
function push_gastado(float $sumar = 0.0): float {
  static $total = 0.0;
  $total += $sumar;
  return $total;
}

function push_enviar_suscripcion(array $sub, string $titulo, string $cuerpo, string $enlace): int {
  $endpoint = (string)($sub['endpoint'] ?? '');
  if (!str_starts_with($endpoint, 'https://')) return 0;
  $vapid = push_vapid();
  $payload = [
    'titulo' => mb_substr($titulo, 0, 140),
    'cuerpo' => mb_substr($cuerpo, 0, 400),
    'url' => aviso_enlace_seguro($enlace) ?: '/',
  ];
  $body = push_cifrar($sub, $payload);
  $headers = [
    'Content-Type: application/octet-stream',
    'Content-Encoding: aes128gcm',
    'Content-Length: ' . strlen($body),
    'TTL: ' . PUSH_TTL,
    'Urgency: normal',
    'Authorization: vapid t=' . push_jwt_vapid($endpoint, $vapid) . ', k=' . (string)$vapid['publica'],
  ];
  return push_post_https($endpoint, $headers, $body);
}

function push_enviar_a_usuario(string $uid, string $titulo, string $cuerpo, string $enlace = ''): int {
  $uid = trim($uid);
  if ($uid === '') return 0;
  try {
    $entregados = 0;
    $caducados = [];
    $subs = load_json('push-suscripciones', []);
    foreach ($subs as $sub) {
      if (!is_array($sub) || (string)($sub['uid'] ?? '') !== $uid) continue;
      if (push_gastado() >= PUSH_PRESUPUESTO_SEG) break;
      $t0 = microtime(true);
      $code = push_enviar_suscripcion($sub, $titulo, $cuerpo, $enlace);
      push_gastado(microtime(true) - $t0);
      if (in_array($code, [200, 201, 202], true)) $entregados++;
      if (in_array($code, [404, 410], true)) $caducados[(string)($sub['endpoint'] ?? '')] = true;
    }
    if ($caducados) {
      mutate_json('push-suscripciones', [], function (array $todas) use ($caducados) {
        return array_values(array_filter($todas, function ($s) use ($caducados) {
          return empty($caducados[(string)($s['endpoint'] ?? '')]);
        }));
      });
    }
    return $entregados;
  } catch (Throwable $e) {
    return 0;
  }
}

function push_suscripciones_usuario(string $uid): array {
  return array_values(array_filter(load_json('push-suscripciones', []), function ($s) use ($uid) {
    return is_array($s) && (string)($s['uid'] ?? '') === $uid;
  }));
}

function push_accion_clave(): void {
  $u = require_user();
  $v = push_vapid();
  ok(['publica' => (string)$v['publica'], 'uid' => (string)$u['id']]);
}

function push_accion_estado(): void {
  $u = require_user();
  ok([
    'dispositivos' => count(push_suscripciones_usuario((string)$u['id'])),
    'clave' => push_vapid_existe(),
  ]);
}

function push_accion_suscribir(): void {
  $u = require_user();
  $in = input();
  $endpoint = trim((string)($in['endpoint'] ?? ''));
  $keys = is_array($in['keys'] ?? null) ? $in['keys'] : [];
  if (!str_starts_with($endpoint, 'https://')) fail('Endpoint push inválido.', 422);
  if ((string)($keys['p256dh'] ?? '') === '' || (string)($keys['auth'] ?? '') === '') fail('Claves push incompletas.', 422);
  $uid = (string)$u['id'];
  $agente = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 160);

  mutate_json('push-suscripciones', [], function (array $todas) use ($uid, $endpoint, $keys, $agente) {
    $todas = array_values(array_filter($todas, fn($s) => (string)($s['endpoint'] ?? '') !== $endpoint));
    $todas[] = [
      'uid' => $uid,
      'endpoint' => $endpoint,
      'keys' => [
        'p256dh' => (string)$keys['p256dh'],
        'auth' => (string)$keys['auth'],
      ],
      'agente' => $agente,
      'ts' => now_iso(),
    ];
    $mias = array_values(array_filter($todas, fn($s) => (string)($s['uid'] ?? '') === $uid));
    if (count($mias) > 5) {
      usort($mias, fn($a, $b) => strcmp((string)($a['ts'] ?? ''), (string)($b['ts'] ?? '')));
      $quitar = array_flip(array_column(array_slice($mias, 0, count($mias) - 5), 'endpoint'));
      $todas = array_values(array_filter($todas, fn($s) => empty($quitar[(string)($s['endpoint'] ?? '')])));
    }
    return $todas;
  });
  ok(['dispositivos' => count(push_suscripciones_usuario($uid))]);
}

function push_accion_baja(): void {
  $u = require_user();
  $endpoint = trim((string)(input()['endpoint'] ?? ''));
  mutate_json('push-suscripciones', [], function (array $todas) use ($u, $endpoint) {
    return array_values(array_filter($todas, function ($s) use ($u, $endpoint) {
      if ((string)($s['uid'] ?? '') !== (string)$u['id']) return true;
      return $endpoint !== '' && (string)($s['endpoint'] ?? '') !== $endpoint;
    }));
  });
  ok(['dispositivos' => count(push_suscripciones_usuario((string)$u['id']))]);
}

function push_accion_prueba(): void {
  $u = require_user();
  $n = push_enviar_a_usuario((string)$u['id'], 'Avisos activados', 'Este teléfono ya puede recibir avisos de Red Café Ecuador.', '/panel/');
  ok(['aceptados' => $n]);
}

function push_router(): void {
  $a = (string)($_GET['action'] ?? '');
  if ($a === 'clave') push_accion_clave();
  if ($a === 'estado') push_accion_estado();
  if ($a === 'suscribir') push_accion_suscribir();
  if ($a === 'baja') push_accion_baja();
  if ($a === 'prueba') push_accion_prueba();
  fail('Acción no válida.', 404);
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
  push_router();
}
