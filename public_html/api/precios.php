<?php
/**
 * API de Precios de Café — DATO ÚNICO REFERENCIAL.
 *
 * Fuente primaria configurable: REDCAFE_PRICE_OFFICIAL_URL.
 * Respaldo operativo: Yahoo Finance — KC=F (Coffee Dec 26, ICE Futures US).
 *   Endpoint: https://query1.finance.yahoo.com/v8/finance/chart/KC=F
 *   Unidad:   US cents / lb. Cobertura: futuro arábica "C" en ICE (NY).
 *
 * Esta cotización es la referencia internacional usada por la industria:
 * coincide con el ICO Composite Indicator Price (I-CIP) y sirve de base
 * para fijar precios FOB en contratos de café arábica a nivel mundial.
 *
 * Para Ecuador, este precio es el PISO de negociación. El productor
 * ecuatoriano recibe un premio por calidad de taza (score SCAA) sobre
 * este precio base, documentado por ANECAFÉ y la Federación de Cafeteros.
 *
 * Cache 6h. Para refrescar antes, llamar ?action=refresh o api/precios-refresh.php.
 */

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=3600');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://redcafeecuador.com', 'https://www.redcafeecuador.com', 'https://solucionespro.net', 'https://www.solucionespro.net'];
if (in_array($origin, $allowed, true)) {
  header("Access-Control-Allow-Origin: $origin");
}

const DATA_DIR_PREC = __DIR__ . '/../data';
const PRECIOS_CACHE = DATA_DIR_PREC . '/precios-cache.json';

function prec_ok(array $d): void {
  echo json_encode(['ok' => true, 'data' => $d], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function prec_fail(string $m, int $c = 400): void {
  http_response_code($c);
  echo json_encode(['ok' => false, 'error' => $m], JSON_UNESCAPED_UNICODE);
  exit;
}
function prec_read(string $p): ?array {
  if (!file_exists($p)) return null;
  $j = json_decode(@file_get_contents($p), true);
  return is_array($j) ? $j : null;
}
function prec_write(string $p, array $d): bool {
  $t = $p . '.tmp';
  $f = @fopen($t, 'w');
  if (!$f) return false;
  flock($f, LOCK_EX);
  fwrite($f, json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
  fflush($f);
  flock($f, LOCK_UN);
  fclose($f);
  return @rename($t, $p);
}

/**
 * Yahoo Finance v8 — café arábica futuro "C" en ICE (KC=F).
 * Devuelve histórico mensual en cents/lb (USX en meta.currency).
 */
function fetch_yahoo_coffee(): ?array {
  $url = 'https://query1.finance.yahoo.com/v8/finance/chart/KC=F'
       . '?interval=1mo&range=2y';
  $ctx = stream_context_create(['http' => [
    'timeout' => 10,
    'header'  => "User-Agent: Mozilla/5.0 (X11; Linux x86_64) redcafeecuador/1.0\r\n"
              . "Accept: application/json\r\n",
  ]]);
  $raw = @file_get_contents($url, false, $ctx);
  if ($raw === false || strlen($raw) < 100) return null;
  $j = json_decode($raw, true);
  if (!is_array($j) || !isset($j['chart']['result'][0])) return null;

  $r = $j['chart']['result'][0];
  $ts  = $r['timestamp'] ?? [];
  $cls = $r['indicators']['quote'][0]['close'] ?? [];
  if (empty($ts) || empty($cls)) return null;

  $rows = [];
  $n = min(count($ts), count($cls));
  for ($i = 0; $i < $n; $i++) {
    $c = $cls[$i];
    if ($c === null || $c === false || $c <= 0) continue;
    $rows[] = [
      'mes'     => gmdate('Y-m', (int)$ts[$i]),
      'centsLb' => round((float)$c, 2), // KC=F cotiza en USX = cents/lb
    ];
  }
  // Deduplicar por mes ANTES de invertir el orden: $rows viene en orden
  // ascendente, así que la última entrada de cada mes es la más reciente.
  // Al deduplicar sobre el array ya invertido se conservaba la lectura más
  // ANTIGUA: en el mes en curso el feed entrega la barra mensual y la
  // cotización viva, y se publicaba la barra vieja (desfase medido de
  // 324.35 frente a 292.90 USD/quintal el 2026-09-05).
  $dedup = [];
  foreach ($rows as $r) {
    $dedup[$r['mes']] = $r; // sobreescribe — se conserva la más reciente del mes
  }
  $rows = array_reverse(array_values($dedup));

  return array_slice($rows, 0, 13); // 13 → top + 12 histórico
}

function fetch_official_configured(): ?array {
  $url = getenv('REDCAFE_PRICE_OFFICIAL_URL') ?: '';
  if (!$url || !preg_match('#^https?://#', $url)) return null;
  $ctx = stream_context_create(['http' => [
    'timeout' => 10,
    'header'  => "User-Agent: redcafeecuador/1.0\r\nAccept: application/json\r\n",
  ]]);
  $raw = @file_get_contents($url, false, $ctx);
  if ($raw === false || strlen($raw) < 20) return null;
  $j = json_decode($raw, true);
  if (!is_array($j)) return null;
  $rows = $j['historico'] ?? $j['data']['historico'] ?? $j['rows'] ?? [];
  if (!is_array($rows) || empty($rows)) return null;
  $out = [];
  foreach ($rows as $r) {
    if (!is_array($r)) continue;
    $mes = $r['mes'] ?? $r['fecha'] ?? $r['date'] ?? '';
    $valor = $r['usdQqal'] ?? $r['centsLb'] ?? $r['precio'] ?? $r['valor'] ?? null;
    if (!$mes || !is_numeric($valor)) continue;
    $out[] = ['mes' => substr((string)$mes, 0, 7), 'centsLb' => round((float)$valor, 2)];
  }
  if (empty($out)) return null;
  usort($out, fn($a, $b) => strcmp($b['mes'], $a['mes']));
  return array_slice($out, 0, 13);
}

function build_payload(array $rows, string $sourceMode = 'respaldo'): ?array {
  if (empty($rows)) return null;
  $top  = $rows[0];
  $prev = $rows[1] ?? null;
  $variacion = $prev && $prev['centsLb'] > 0
    ? round((($top['centsLb'] - $prev['centsLb']) / $prev['centsLb']) * 100, 2)
    : null;

  $historico = array_map(fn($r) => [
    'mes'     => $r['mes'],
    'centsLb' => $r['centsLb'],
    'usdQqal' => $r['centsLb'], // 100 cents = 1 USD → 1 cent/lb = 1 USD/quintal
  ], $rows);

  return [
    'updated_at'    => gmdate('c'),
    'updated_human' => 'Actualizado ' . date('Y-m-d H:i') . ' UTC',
    'precio' => [
      'valor'         => $top['centsLb'],
      'valor_cents'   => $top['centsLb'],
      'unidad'        => 'USD/quintal',
      'mes'           => $top['mes'],
      'variacion_pct' => $variacion,
    ],
    'fuente' => $sourceMode === 'oficial' ? [
      'nombre'       => 'Fuente oficial configurada',
      'url'          => getenv('REDCAFE_PRICE_OFFICIAL_URL') ?: '',
      'periodicidad' => 'Según endpoint configurado',
      'descripcion'  => 'Datos cargados desde REDCAFE_PRICE_OFFICIAL_URL.',
      'tipo'         => 'oficial_configurada',
    ] : [
      'nombre'       => 'KC=F vía Yahoo Finance — respaldo operativo',
      'url'          => 'https://finance.yahoo.com/quote/KC=F/',
      'periodicidad' => 'Mensual (último cierre disponible)',
      'descripcion'  => 'Respaldo operativo con la cotización internacional de café arábica en ICE Futures (NY). No sustituye una fuente oficial configurada.',
      'tipo'         => 'respaldo_operativo',
    ],
    'referencias_oficiales' => [
      ['nombre' => 'ICO Composite Indicator Price', 'url' => 'https://www.ico.org/coffee_prices.html'],
      ['nombre' => 'ICE Arabica Coffee "C"',       'url' => 'https://www.theice.com/products/咖啡/Coffee-C'],
      ['nombre' => 'Banco Central del Ecuador',    'url' => 'https://www.bce.fin.ec/'],
      ['nombre' => 'ANECAFÉ Ecuador',              'url' => 'http://www.anecafe.org.ec/'],
    ],
    'historico' => $historico,
  ];
}

function get_precios(bool $forceRefresh = false): array {
  $cache = prec_read(PRECIOS_CACHE);
  $age = $cache ? time() - strtotime($cache['updated_at'] ?? '1970') : PHP_INT_MAX;

  $cacheTieneFuenteActual = isset($cache['fuente']['tipo']);
  if (!$forceRefresh && $cache && $cacheTieneFuenteActual && $age < 6 * 3600) {
    return $cache + ['stale' => false];
  }

  $sourceMode = 'oficial';
  $rows = fetch_official_configured();
  if (!$rows) {
    $sourceMode = 'respaldo';
    $rows = fetch_yahoo_coffee();
  }
  if ($rows) {
    $payload = build_payload($rows, $sourceMode);
    if ($payload) {
      prec_write(PRECIOS_CACHE, $payload);
      return $payload + ['stale' => false];
    }
  }

  if ($cache) {
    return $cache + ['stale' => true, 'reason' => 'fuente externa no disponible, mostrando último cache'];
  }
  return [
    'stale'  => true,
    'reason' => 'sin datos disponibles',
    'precio' => null,
  ];
}

$action = $_GET['action'] ?? 'list';
date_default_timezone_set('UTC');

switch ($action) {
  case 'list':
  case 'actual':
    prec_ok(get_precios(false));
    break;
  case 'refresh':
    prec_ok(get_precios(true));
    break;
  default:
    prec_fail('Acción no válida. Use list|refresh.');
}
