<?php
/**
 * Refrescador de precios — para cron job.
 *
 * Uso:
 *   curl -s "https://redcafeecuador.com/api/precios-refresh.php" > /dev/null
 *
 * Cron sugerido (cPanel):
 *   0 6 * * * /usr/bin/curl -s "https://redcafeecuador.com/api/precios-refresh.php" > /dev/null 2>&1
 *
 * Solo refresca una vez al día (controlado por stamp interno en el cache).
 *
 * ESTE CRON ES OPCIONAL, NO CRÍTICO.
 * precios.php ya se refresca solo: si la caché supera las 6 horas, va a buscar el
 * dato en la misma petición. El cron únicamente evita que el primer visitante tras
 * esas 6 horas pague la espera de la consulta externa. Si el cron falla o apunta a
 * una ruta equivocada, el precio NO se congela: se actualiza igual, algo más lento.
 * Y si la fuente externa no responde, la interfaz avisa de que el dato no está
 * actualizado en vez de presentarlo como vigente.
 */

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: text/plain; charset=utf-8');
date_default_timezone_set('UTC');

$cache = __DIR__ . '/../data/precios-cache.json';

// Si se refrescó hace menos de 12h, no hacer nada (evitar gastar API calls).
if (file_exists($cache)) {
  $j = json_decode(file_get_contents($cache), true);
  if (is_array($j) && !empty($j['updated_at'])) {
    $age = time() - strtotime($j['updated_at']);
    if ($age < 12 * 3600) {
      echo "OK (cache $age segundos)\n";
      exit(0);
    }
  }
}

// Llamar al endpoint principal con refresh forzado.
$base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
      . '://' . ($_SERVER['HTTP_HOST'] ?? 'redcafeecuador.com')
      . '/plataforma/api/precios.php?action=refresh';
$ctx = stream_context_create(['http' => ['timeout' => 10]]);
$out = @file_get_contents($base, false, $ctx);
echo $out ? "REFRESH OK\n" : "REFRESH FAIL\n";
exit($out ? 0 : 1);
