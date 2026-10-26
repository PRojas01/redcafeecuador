<?php
/**
 * Red Café Ecuador — guías paso a paso de finca y de negocio
 * ---------------------------------------------------------------------------
 * La Academia enseña; esta guía acompaña. Guarda, por miembro, qué pasos lleva
 * hechos, sus notas y las bitácoras que de verdad sirven después: cosecha,
 * fermentación, secado y costos. De ahí sale la ficha de finca que el productor
 * enseña a un comprador, pide en el banco o presenta en la auditoría de BPA.
 *
 * Todo es privado: cada miembro ve y escribe lo suyo, nunca lo de otro. El
 * contenido de las guías (los textos) no vive aquí, sino en
 * redcafe-guias-contenido.js, para que se pueda corregir sin tocar la API.
 */

declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

$action = $_GET['action'] ?? '';
$in = input();

const GUIAS_VALIDAS   = ['finca', 'negocio'];
const GUIAS_TIPOS     = ['cosecha', 'fermentacion', 'secado', 'costos'];
const GUIAS_MAX_FILAS = 500;
const GUIAS_MAX_NOTA  = 500;

/** Campos que acepta cada bitácora: nombre => [tipo, tope]. */
function guias_campos(string $tipo): array {
  switch ($tipo) {
    case 'cosecha':
      return ['fecha' => 'fecha', 'lote' => 'texto', 'kg_cereza' => 'numero',
              'jornales' => 'numero', 'observacion' => 'texto'];
    case 'fermentacion':
      return ['fecha' => 'fecha', 'lote' => 'texto', 'hora_inicio' => 'hora',
              'hora_fin' => 'hora', 'temperatura' => 'numero', 'observacion' => 'texto'];
    case 'secado':
      return ['fecha' => 'fecha', 'lote' => 'texto', 'humedad_pct' => 'porcentaje',
              'dia' => 'numero', 'observacion' => 'texto'];
    case 'costos':
      return ['fecha' => 'fecha', 'concepto' => 'texto', 'monto' => 'numero',
              'quintales' => 'numero', 'observacion' => 'texto'];
  }
  return [];
}

function guias_valor(string $clase, $bruto) {
  $s = is_scalar($bruto) ? trim((string)$bruto) : '';
  switch ($clase) {
    case 'texto':
      return mb_substr($s, 0, 160);
    case 'numero':
      if ($s === '' || !is_numeric($s)) return null;
      return max(0, round((float)$s, 2));
    case 'porcentaje':
      if ($s === '' || !is_numeric($s)) return null;
      return max(0, min(100, round((float)$s, 1)));
    case 'fecha':
      return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) ? $s : gmdate('Y-m-d');
    case 'hora':
      return preg_match('/^\d{2}:\d{2}$/', $s) ? $s : '';
  }
  return null;
}

function guias_uid(): string {
  $u = require_user();
  return (string)($u['id'] ?? '');
}

function guias_avance_de(string $uid): array {
  $todo = load_json('guias', []);
  $mio = $todo[$uid] ?? [];
  return is_array($mio) ? $mio : [];
}

function guias_registros_de(string $uid, string $tipo = ''): array {
  $todo = load_json('guias-registros', []);
  $mio = is_array($todo[$uid] ?? null) ? $todo[$uid] : [];
  if ($tipo === '') return $mio;
  return is_array($mio[$tipo] ?? null) ? $mio[$tipo] : [];
}

/**
 * Aviso de fermentación abierta: si hace más de 18 horas que se anotó el
 * inicio y no hay hora de fin, se recuerda una vez al día y por lote. No hay
 * tareas programadas en el hosting, así que se evalúa cuando el miembro abre
 * su guía, igual que hacen los recordatorios de la campana.
 */
function guias_avisar_fermentacion(string $uid): void {
  try {
    $filas = guias_registros_de($uid, 'fermentacion');
    if (!$filas) return;
    $marcas = load_json('guias', [])[$uid]['_avisos'] ?? [];
    $nuevas = is_array($marcas) ? $marcas : [];
    $cambio = false;

    foreach ($filas as $f) {
      if (!is_array($f) || trim((string)($f['hora_fin'] ?? '')) !== '') continue;
      $inicio = strtotime(((string)($f['fecha'] ?? '')) . ' ' . ((string)($f['hora_inicio'] ?? '00:00')) . ' UTC');
      if (!$inicio || time() - $inicio < 18 * 3600) continue;
      $clave = 'ferm-' . (string)($f['id'] ?? '') . '-' . gmdate('Y-m-d');
      if (!empty($nuevas[$clave])) continue;
      $lote = trim((string)($f['lote'] ?? ''));
      notificar($uid, 'sistema',
        'Fermentación sin cerrar' . ($lote !== '' ? ' · lote ' . $lote : ''),
        'Anotaste el inicio hace más de 18 horas y falta la hora de fin. Cierra el registro y mide la humedad cuando empieces a secar.',
        '/panel/?ver=guias');
      $nuevas[$clave] = now_iso();
      $cambio = true;
    }
    if (!$cambio) return;

    // Solo se conservan las marcas de la última semana: no hace falta más.
    $limite = time() - 7 * 86400;
    foreach ($nuevas as $k => $ts) {
      if ((strtotime((string)$ts) ?: time()) < $limite) unset($nuevas[$k]);
    }
    mutate_json('guias', [], function (array $todo) use ($uid, $nuevas) {
      if (!isset($todo[$uid]) || !is_array($todo[$uid])) $todo[$uid] = [];
      $todo[$uid]['_avisos'] = $nuevas;
      return $todo;
    });
  } catch (Throwable $e) {
    // Un aviso que falla no puede dejar al miembro sin su guía.
  }
}

/* ── Acciones ─────────────────────────────────────────────────────────── */

if ($action === 'estado') {
  $uid = guias_uid();
  guias_avisar_fermentacion($uid);
  $mio = guias_avance_de($uid);
  unset($mio['_avisos']);
  $registros = [];
  foreach (GUIAS_TIPOS as $t) $registros[$t] = count(guias_registros_de($uid, $t));
  ok(['avance' => $mio, 'registros' => $registros]);
}

if ($action === 'paso') {
  $uid = guias_uid();
  $guia = trim((string)($in['guia'] ?? ''));
  $paso = trim((string)($in['paso'] ?? ''));
  if (!in_array($guia, GUIAS_VALIDAS, true)) fail('Guía no válida.', 422);
  if ($paso === '' || !preg_match('/^[a-z0-9-]{1,60}$/', $paso)) fail('Paso no válido.', 422);
  $hecho = array_key_exists('hecho', $in) ? filter_var($in['hecho'], FILTER_VALIDATE_BOOLEAN) : true;
  $nota = mb_substr(trim((string)($in['nota'] ?? '')), 0, GUIAS_MAX_NOTA);

  $guardado = null;
  mutate_json('guias', [], function (array $todo) use ($uid, $guia, $paso, $hecho, $nota, &$guardado) {
    if (!isset($todo[$uid]) || !is_array($todo[$uid])) $todo[$uid] = [];
    if (!isset($todo[$uid][$guia]) || !is_array($todo[$uid][$guia])) $todo[$uid][$guia] = [];
    $previo = is_array($todo[$uid][$guia][$paso] ?? null) ? $todo[$uid][$guia][$paso] : [];
    $todo[$uid][$guia][$paso] = [
      'hecho' => $hecho,
      'nota'  => $nota !== '' ? $nota : (string)($previo['nota'] ?? ''),
      'fecha' => now_iso(),
    ];
    $guardado = $todo[$uid][$guia][$paso];
    return $todo;
  });
  ok(['paso' => $paso, 'estado' => $guardado]);
}

if ($action === 'registro') {
  $uid = guias_uid();
  $tipo = trim((string)($in['tipo'] ?? ''));
  if (!in_array($tipo, GUIAS_TIPOS, true)) fail('Tipo de registro no válido.', 422);
  $datos = is_array($in['datos'] ?? null) ? $in['datos'] : [];
  $fila = ['id' => uid(), 'creado' => now_iso()];
  foreach (guias_campos($tipo) as $campo => $clase) {
    $fila[$campo] = guias_valor($clase, $datos[$campo] ?? '');
  }

  mutate_json('guias-registros', [], function (array $todo) use ($uid, $tipo, $fila) {
    if (!isset($todo[$uid]) || !is_array($todo[$uid])) $todo[$uid] = [];
    if (!isset($todo[$uid][$tipo]) || !is_array($todo[$uid][$tipo])) $todo[$uid][$tipo] = [];
    $todo[$uid][$tipo][] = $fila;
    if (count($todo[$uid][$tipo]) > GUIAS_MAX_FILAS) {
      $todo[$uid][$tipo] = array_slice($todo[$uid][$tipo], -GUIAS_MAX_FILAS);
    }
    return $todo;
  });
  ok(['registro' => $fila]);
}

if ($action === 'registros') {
  $uid = guias_uid();
  $tipo = trim((string)($_GET['tipo'] ?? ($in['tipo'] ?? '')));
  if ($tipo !== '' && !in_array($tipo, GUIAS_TIPOS, true)) fail('Tipo de registro no válido.', 422);
  if ($tipo === '') {
    $out = [];
    foreach (GUIAS_TIPOS as $t) $out[$t] = array_reverse(guias_registros_de($uid, $t));
    ok(['registros' => $out]);
  }
  ok(['tipo' => $tipo, 'filas' => array_reverse(guias_registros_de($uid, $tipo))]);
}

if ($action === 'borrar_registro') {
  $uid = guias_uid();
  $tipo = trim((string)($in['tipo'] ?? ''));
  $id = trim((string)($in['id'] ?? ''));
  if (!in_array($tipo, GUIAS_TIPOS, true)) fail('Tipo de registro no válido.', 422);
  if ($id === '') fail('id requerido.', 422);
  $borrado = false;
  mutate_json('guias-registros', [], function (array $todo) use ($uid, $tipo, $id, &$borrado) {
    $filas = is_array($todo[$uid][$tipo] ?? null) ? $todo[$uid][$tipo] : [];
    $quedan = array_values(array_filter($filas, function ($f) use ($id) {
      return (string)($f['id'] ?? '') !== $id;
    }));
    $borrado = count($quedan) !== count($filas);
    $todo[$uid][$tipo] = $quedan;
    return $todo;
  });
  if (!$borrado) fail('Ese registro no existe.', 404);
  ok(['borrado' => $id]);
}

if ($action === 'ficha') {
  $u = require_user();
  $uid = (string)($u['id'] ?? '');
  $mio = guias_avance_de($uid);
  unset($mio['_avisos']);

  $hechos = [];
  foreach (GUIAS_VALIDAS as $g) {
    $hechos[$g] = [];
    foreach (($mio[$g] ?? []) as $paso => $estado) {
      if (!empty($estado['hecho'])) $hechos[$g][] = $paso;
    }
  }

  $ultimos = [];
  foreach (GUIAS_TIPOS as $t) {
    $filas = guias_registros_de($uid, $t);
    $ultimos[$t] = $filas ? $filas[count($filas) - 1] : null;
  }

  // Costo por quintal con todo lo anotado en la bitácora de costos.
  $monto = 0.0; $quintales = 0.0;
  foreach (guias_registros_de($uid, 'costos') as $f) {
    $monto += (float)($f['monto'] ?? 0);
    $quintales += (float)($f['quintales'] ?? 0);
  }
  $costoQq = $quintales > 0 ? round($monto / $quintales, 2) : null;

  ok([
    'miembro' => [
      'nombre'    => (string)($u['nombre'] ?? ''),
      'provincia' => (string)($u['provincia'] ?? ''),
      'roles'     => miembro_roles($u),
    ],
    'hechos'      => $hechos,
    'ultimos'     => $ultimos,
    'costo_quintal' => $costoQq,
    'generado'    => now_iso(),
  ]);
}

fail('Acción no válida.', 400);
