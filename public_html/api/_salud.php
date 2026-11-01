<?php
/**
 * Red Café Ecuador — chequeo de datos que fallan en silencio
 * ---------------------------------------------------------------------------
 * Lo que motivó esto: aceptar una cotización creaba un pedido sin productor,
 * sin comprador y sin monto. El error no daba ningún aviso: la API respondía
 * «ok», el pedido se guardaba vacío y no aparecía en el panel de ninguna de
 * las dos partes. Estuvo así vaya a saber cuánto.
 *
 * Nadie va a revisar los JSON a mano cada día. Esto lo hace: una vez al día,
 * cuando alguien consulta la campana, se repasan los datos importantes y, si
 * algo no cuadra, se avisa a la administración. No corrige nada: avisar es
 * suficiente y no arriesga los datos de nadie.
 */

declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

const SALUD_MARCA = DATA_DIR . '/.salud_ultimo';
const SALUD_CADA_HORAS = 20;
const SALUD_MAX_DETALLE = 6;

function salud_vacio($v): bool {
  return $v === null || $v === '' || $v === 0 || $v === '0';
}

/** Devuelve la lista de problemas encontrados, en lenguaje llano. */
function salud_revisar(): array {
  $fallos = [];

  // 1. Pedidos sin las dos partes o sin monto: invisibles para todos.
  $pedidos = load_json('pedidos', []);
  $rotos = [];
  foreach ($pedidos as $p) {
    if (!is_array($p)) continue;
    if (salud_vacio($p['productor_id'] ?? null) || salud_vacio($p['solicitante_id'] ?? null)) {
      $rotos[] = '#' . (string)($p['nro'] ?? '?');
    }
  }
  if ($rotos) {
    $fallos[] = count($rotos) . ' pedido(s) sin comprador o sin vendedor, invisibles en el panel: '
      . implode(', ', array_slice($rotos, 0, SALUD_MAX_DETALLE));
  }

  // 2. Números repetidos: una acción sobre uno recae sobre el otro.
  foreach ([['pedidos', $pedidos], ['cotizaciones', load_json('cotizaciones', [])]] as $par) {
    [$nombre, $lista] = $par;
    $vistos = [];
    $dups = [];
    foreach ($lista as $x) {
      $n = (int)($x['nro'] ?? 0);
      if ($n <= 0) continue;
      if (isset($vistos[$n])) $dups[$n] = true; else $vistos[$n] = true;
    }
    if ($dups) {
      $fallos[] = 'Números repetidos en ' . $nombre . ': #' . implode(', #', array_slice(array_keys($dups), 0, SALUD_MAX_DETALLE));
    }
  }

  // 3. Lotes publicados que nadie puede comprar porque no dicen precio.
  $sinPrecio = 0;
  foreach (load_json('lotes', []) as $l) {
    if (!is_array($l) || !empty($l['demo']) || !empty($l['oculto'])) continue;
    $esSiembra = in_array((string)($l['estado'] ?? ''), ['semilla', 'plantula'], true);
    $precio = $esSiembra ? (float)($l['precioUnidad'] ?? 0) : (float)($l['precioSaco'] ?? 0);
    if ($precio <= 0) $sinPrecio++;
  }
  if ($sinPrecio > 0) {
    $fallos[] = $sinPrecio . ' lote(s) de miembros publicados sin precio: se ven en el Marketplace pero no se pueden negociar.';
  }

  // 4. Publicaciones huérfanas: su dueño ya no existe.
  $ids = [];
  foreach (load_json('members', []) as $m) $ids[(string)($m['id'] ?? '')] = true;
  $huerfanos = 0;
  foreach (load_json('lotes', []) as $l) {
    if (!is_array($l) || !empty($l['demo'])) continue;
    $d = (string)($l['productor_id'] ?? '');
    if ($d !== '' && empty($ids[$d])) $huerfanos++;
  }
  if ($huerfanos > 0) {
    $fallos[] = $huerfanos . ' lote(s) cuyo dueño ya no está registrado.';
  }

  // 5. Que el respaldo diario esté ocurriendo de verdad.
  if (function_exists('respaldo_ultimo')) {
    $u = respaldo_ultimo();
    if (!$u) $fallos[] = 'No hay ninguna copia de respaldo guardada.';
    elseif ((time() - (int)$u['ts']) > 48 * 3600) {
      $fallos[] = 'La última copia de respaldo tiene más de 48 horas.';
    }
  }

  return $fallos;
}

/** Una vez al día, y nunca a costa de la petición que lo disparó. */
function salud_revision_diaria(): void {
  try {
    $ultimo = is_file(SALUD_MARCA) ? (int)@file_get_contents(SALUD_MARCA) : 0;
    if ((time() - $ultimo) < SALUD_CADA_HORAS * 3600) return;
    @file_put_contents(SALUD_MARCA, (string)time());
    @chmod(SALUD_MARCA, 0600);

    $fallos = salud_revisar();
    if (!$fallos) return;
    notificar_admins('sistema',
      'Revisión diaria: ' . count($fallos) . ' cosa(s) que revisar',
      implode(' · ', $fallos),
      '/admin/');
  } catch (Throwable $e) {
    // Un chequeo que falla no puede estropearle la campana a nadie.
  }
}
