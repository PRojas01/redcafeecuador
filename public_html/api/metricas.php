<?php
declare(strict_types=1);

/* Red Café Ecuador — medición propia y cifras públicas
 * ---------------------------------------------------------------------------
 * El sitio no medía nada: sin eso no se puede saber en qué paso del registro se
 * va la gente, ni comprobar si un cambio ayudó.
 *
 * Se mide aquí, en el propio servidor, en vez de con una etiqueta de terceros:
 *   - No guarda IP, ni cookies propias, ni identificadores de persona. Solo
 *     contadores por día: «hoy hubo 40 visitas a /afiliate/». Por eso no pide
 *     banner de consentimiento ni comparte datos con nadie.
 *   - No depende de crear una cuenta en otro servicio.
 *
 * Acciones:
 *   evento  (POST, público)  suma 1 a un evento de la lista cerrada.
 *   cifras  (GET,  público)  totales agregados de la Red, sin datos personales.
 *   resumen (GET,  admin)    embudo de los últimos días.
 */

require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';

/* Lista CERRADA: un nombre de evento que no está aquí se descarta. Así nadie
 * puede llenar el archivo con claves inventadas. */
const METRICAS_EVENTOS = [
  'visita',             // cualquier página
  'cta_registro',       // clic en un enlace que lleva a /afiliate/
  'registro_paso1',     // ve el selector de perfiles
  'registro_paso2',     // llega al formulario de datos
  'registro_paso3',     // llega a la revisión final
  'registro_enviado',   // pulsa «Crear mi cuenta»
  'registro_ok',        // aterriza en el panel justo después de registrarse
  'activacion_clic',    // pulsa el siguiente paso tras registrarse o en el panel
];

const METRICAS_DIAS_GUARDADOS = 120;

/** Deja solo la primera parte de la ruta: /marketplace/abc123/ -> /marketplace/ */
function metricas_ruta(string $ruta): string {
  $ruta = '/' . trim(parse_url($ruta, PHP_URL_PATH) ?: '/', '/');
  $partes = array_values(array_filter(explode('/', $ruta)));
  if (!$partes) return '/';
  $primera = preg_replace('/[^a-z0-9-]/', '', strtolower($partes[0]));
  return $primera === '' ? '/' : '/' . $primera . '/';
}

if ($action === 'evento') {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Método no permitido.', 405);
  // Un visitante real genera pocos eventos por minuto; más que esto es ruido.
  if (!check_rate_limit('metricas_evento', 120, 60)) {
    http_response_code(204);
    exit;
  }
  $raw = file_get_contents('php://input') ?: '';
  $in = json_decode($raw, true);
  if (!is_array($in)) $in = [];
  $evento = (string)($in['e'] ?? '');
  if (!in_array($evento, METRICAS_EVENTOS, true)) fail('Evento no válido.', 422);
  $ruta = metricas_ruta((string)($in['p'] ?? '/'));
  $clave = $evento . '|' . $ruta;
  $dia = today();

  mutate_json('metricas', [], function (array $todo) use ($dia, $clave) {
    if (!isset($todo[$dia]) || !is_array($todo[$dia])) $todo[$dia] = [];
    $todo[$dia][$clave] = (int)($todo[$dia][$clave] ?? 0) + 1;
    // Se podan los días viejos para que el archivo no crezca sin fin.
    krsort($todo);
    return array_slice($todo, 0, METRICAS_DIAS_GUARDADOS, true);
  });
  http_response_code(204);
  exit;
}

if ($action === 'cifras') {
  $members = load_json('members', []);
  $productores = 0;
  $compran = 0;
  $provincias = [];
  foreach ($members as $m) {
    if (!is_array($m) || ($m['estado'] ?? 'activo') === 'inactivo') continue;
    $roles = miembro_roles($m);
    if (in_array('productor', $roles, true)) $productores++;
    if (array_intersect($roles, ['comprador', 'vendedor', 'exportador', 'bar'])) $compran++;
    $p = trim((string)($m['provincia'] ?? ''));
    if ($p !== '') {
      $k = mb_strtolower($p);
      if (!isset($provincias[$k])) $provincias[$k] = ['nombre' => $p, 'miembros' => 0, 'lotes' => 0];
      $provincias[$k]['miembros']++;
    }
  }

  $lotesReales = 0;
  foreach (load_json('lotes', []) as $l) {
    if (!is_array($l) || !empty($l['oculto']) || !empty($l['demo']) || !empty($l['ejemplo'])) continue;
    $lotesReales++;
    $p = trim((string)($l['provincia'] ?? ''));
    if ($p !== '') {
      $k = mb_strtolower($p);
      if (!isset($provincias[$k])) $provincias[$k] = ['nombre' => $p, 'miembros' => 0, 'lotes' => 0];
      $provincias[$k]['lotes']++;
    }
  }

  $requerimientos = 0;
  foreach (load_json('requerimientos', []) as $r) {
    if (!is_array($r) || (string)($r['estado'] ?? '') !== 'abierta') continue;
    $cierra = (string)($r['cierra'] ?? '');
    if ($cierra !== '' && $cierra < today()) continue;
    $requerimientos++;
  }

  // Solo agregados por provincia (cuántos, nunca quiénes). Primero donde hay
  // lotes reales, luego por número de miembros.
  $porProvincia = array_values($provincias);
  usort($porProvincia, function ($a, $b) {
    return [$b['lotes'], $b['miembros']] <=> [$a['lotes'], $a['miembros']];
  });
  $conMiembros = count(array_filter($porProvincia, function ($x) { return $x['miembros'] > 0; }));

  header('Cache-Control: public, max-age=300');
  ok([
    'miembros' => count($members),
    'productores' => $productores,
    'compran_cafe' => $compran,
    'provincias' => $conMiembros,
    'por_provincia' => array_slice($porProvincia, 0, 12),
    'lotes_reales' => $lotesReales,
    'requerimientos_abiertos' => $requerimientos,
  ]);
}

if ($action === 'resumen') {
  require_admin();
  $dias = max(1, min(METRICAS_DIAS_GUARDADOS, (int)($_GET['dias'] ?? 30)));
  $todo = load_json('metricas', []);
  krsort($todo);
  $recorte = array_slice($todo, 0, $dias, true);

  $totales = array_fill_keys(METRICAS_EVENTOS, 0);
  foreach ($recorte as $claves) {
    foreach ((array)$claves as $clave => $n) {
      $evento = explode('|', (string)$clave)[0];
      if (isset($totales[$evento])) $totales[$evento] += (int)$n;
    }
  }
  $tasa = function (string $de, string $a) use ($totales): ?float {
    return $totales[$de] > 0 ? round($totales[$a] / $totales[$de] * 100, 1) : null;
  };
  ok([
    'dias' => $dias,
    'totales' => $totales,
    'embudo' => [
      'paso1_a_paso2' => $tasa('registro_paso1', 'registro_paso2'),
      'paso2_a_paso3' => $tasa('registro_paso2', 'registro_paso3'),
      'paso3_a_envio' => $tasa('registro_paso3', 'registro_enviado'),
      'envio_a_alta' => $tasa('registro_enviado', 'registro_ok'),
    ],
    'por_dia' => $recorte,
  ]);
}

fail('Acción no válida.', 400);
