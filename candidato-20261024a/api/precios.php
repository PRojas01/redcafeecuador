<?php
/**
 * API de Precios de Café — DATO ÚNICO REFERENCIAL.
 *
 * Fuente primaria configurable: REDCAFE_PRICE_OFFICIAL_URL.
 * Respaldo operativo: Yahoo Finance — KC=F (Coffee Dec 26, ICE Futures US).
 *   Endpoint: https://query1.finance.yahoo.com/v8/finance/chart/KC=F
 *   Unidad:   US cents / lb. Cobertura: futuro arábica "C" en ICE (NY).
 *
 * KC=F es un contrato de futuros de arábica; no equivale al indicador
 * compuesto de la OIC ni representa por sí solo un precio de finca o FOB.
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

/**
 * Yahoo Finance v8 — misma fuente, pero DIARIO.
 *
 * Antes esta serie no existía y por eso el segundo gráfico de la página de
 * precios no podía ser diario: la única serie era la mensual de arriba
 * (interval=1mo). Sus botones ponían 5D/1M/3M/6M/1Y pero contaban filas, y las
 * filas son meses, así que "5D" pintaba cinco meses.
 *
 * Es una consulta aparte a propósito, y NO se mezcla con la mensual:
 *   - si esta falla, la mensual sigue intacta y el segundo gráfico cae al
 *     histórico mensual en vez de quedarse en blanco;
 *   - la mensual es la que usa el gráfico de promedio mensual y la tabla de 13
 *     meses, y no se toca.
 *
 * Dos años de cierres diarios cubren todos los filtros, incluido 1A.
 * En fines de semana y días festivos no hay barra, y no se
 * rellena con nada: un día sin cotización no es un día con precio.
 */
function fetch_yahoo_coffee_daily(): array {
  $url = 'https://query1.finance.yahoo.com/v8/finance/chart/KC=F'
       . '?interval=1d&range=2y';
  $ctx = stream_context_create(['http' => [
    'timeout' => 10,
    'header'  => "User-Agent: Mozilla/5.0 (X11; Linux x86_64) redcafeecuador/1.0\r\n"
              . "Accept: application/json\r\n",
  ]]);
  $raw = @file_get_contents($url, false, $ctx);
  if ($raw === false || strlen($raw) < 100) return [];
  $j = json_decode($raw, true);
  if (!is_array($j) || !isset($j['chart']['result'][0])) return [];

  $r = $j['chart']['result'][0];
  $ts  = $r['timestamp'] ?? [];
  $cls = $r['indicators']['quote'][0]['close'] ?? [];
  if (empty($ts) || empty($cls)) return [];

  $rows = [];
  $n = min(count($ts), count($cls));
  for ($i = 0; $i < $n; $i++) {
    $c = $cls[$i];
    if ($c === null || $c === false || $c <= 0) continue;
    $fecha = gmdate('Y-m-d', (int)$ts[$i]);
    $rows[$fecha] = [
      'fecha'   => $fecha,
      'mes'     => substr($fecha, 0, 7),
      'centsLb' => round((float)$c, 2),
    ];
  }
  // Más reciente primero, que es como los espera el resto del código.
  krsort($rows);
  return array_values($rows);
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
  $diario = build_historico_diario();
  $cierre = $diario[0] ?? null;
  $anterior = $diario[1] ?? null;
  $cierrePrecio = $sourceMode === 'respaldo' ? $cierre : null;
  $variacion = $cierrePrecio && $anterior && $anterior['centsLb'] > 0
    ? round((($cierre['centsLb'] - $anterior['centsLb']) / $anterior['centsLb']) * 100, 2)
    : ($prev && $prev['centsLb'] > 0
    ? round((($top['centsLb'] - $prev['centsLb']) / $prev['centsLb']) * 100, 2)
    : null);

  $historico = array_map(fn($r) => [
    'mes'     => $r['mes'],
    'centsLb' => $r['centsLb'],
    'usdQqal' => $r['centsLb'], // 100 cents = 1 USD → 1 cent/lb = 1 USD/quintal
  ], $rows);

  return [
    'updated_at'    => gmdate('c'),
    'updated_human' => 'Actualizado ' . date('Y-m-d H:i') . ' UTC',
    'precio' => [
      'valor'         => $cierrePrecio['centsLb'] ?? $top['centsLb'],
      'valor_cents'   => $cierrePrecio['centsLb'] ?? $top['centsLb'],
      'unidad'        => 'USD/quintal',
      'mes'           => $top['mes'],
      'fecha'         => $cierrePrecio['fecha'] ?? null,
      'variacion_pct' => $variacion,
      'variacion_periodo' => $cierrePrecio ? 'cierre_anterior' : 'mes_anterior',
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
      'periodicidad' => 'Diaria para el gráfico; mensual para el resumen',
      'descripcion'  => 'Respaldo operativo con la cotización internacional de café arábica en ICE Futures (NY). No sustituye una fuente oficial configurada.',
      'tipo'         => 'respaldo_operativo',
    ],
    'referencias_oficiales' => [
      ['nombre' => 'ICO Composite Indicator Price', 'url' => 'https://ico.org/es/resources/public-market-information/'],
      ['nombre' => 'ICE Arabica Coffee "C"',       'url' => 'https://www.ice.com/products/15/Coffee-C-Futures'],
      ['nombre' => 'Banco Central del Ecuador',    'url' => 'https://www.bce.fin.ec/'],
      ['nombre' => 'ANECAFÉ Ecuador',              'url' => 'https://anecafe-ecuador.com/'],
    ],
    'historico' => $historico,
    // Serie diaria aparte. Si la consulta diaria falla, va vacía; quien la lea
    // tiene que saber qué hacer con eso, y por eso la clave está siempre.
    'historico_diario' => $diario,
  ];
}

/**
 * Envuelve la serie diaria con la misma forma que la mensual, para que el
 * segundo gráfico pueda leer las dos igual. Nunca lanza: si no hay datos
 * devuelve una lista vacía.
 */
function build_historico_diario(): array {
  $filas = fetch_yahoo_coffee_daily();
  return array_map(fn($r) => [
    'fecha'   => $r['fecha'],
    'mes'     => $r['mes'],
    'centsLb' => $r['centsLb'],
    'usdQqal' => $r['centsLb'],
  ], $filas);
}

function get_precios(bool $forceRefresh = false): array {
  $cache = prec_read(PRECIOS_CACHE);
  $age = $cache ? time() - strtotime($cache['updated_at'] ?? '1970') : PHP_INT_MAX;

  $cacheTieneFuenteActual = isset($cache['fuente']['tipo']);
  $cacheTieneSerieDiaria = !empty($cache['historico_diario']) && count($cache['historico_diario']) >= 2;
  if (!$forceRefresh && $cache && $cacheTieneFuenteActual && $cacheTieneSerieDiaria && $age < 6 * 3600) {
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
      // Conservar la última serie diaria válida si falla solo esa consulta.
      if (empty($payload['historico_diario']) && $cacheTieneSerieDiaria) {
        $payload['historico_diario'] = $cache['historico_diario'];
        $payload['diario_stale'] = true;
      }
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
