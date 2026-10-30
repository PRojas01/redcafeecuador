<?php
/**
 * Red Café Ecuador — avisos y bitácora
 * ---------------------------------------------------------------------------
 * Dos piezas que el resto de las APIs usan para dejar rastro:
 *
 *   notificar()            → un aviso dirigido a una persona concreta.
 *   registrar_actividad()  → una línea en la bitácora de la Red.
 *
 * Ninguna de las dos puede tumbar la operación que las llamó: si el archivo
 * no se puede escribir, la publicación o el pedido siguen adelante. Por eso
 * todo va envuelto y nunca llaman a fail().
 */

declare(strict_types=1);

if (!defined('AVISOS_MAX'))     define('AVISOS_MAX', 3000);
if (!defined('BITACORA_MAX'))   define('BITACORA_MAX', 6000);
if (!defined('AVISO_VIDA_DIAS')) define('AVISO_VIDA_DIAS', 90);

/**
 * Advertencia de pagos que se muestra antes de enviar un pedido.
 * Se versiona: si el texto cambia, los pedidos guardan qué versión aceptó el
 * comprador. `AVISO_PAGOS_TEXTO` es la referencia; el frontend muestra la
 * misma redacción.
 */
const AVISO_PAGOS_VERSION = '2026-09-07';
const AVISO_PAGOS_TEXTO = 'Red Café Ecuador no interviene en los pagos ni retiene dinero. '
  . 'No hagas transferencias ni depósitos si no estás seguro de la identidad de la otra parte. '
  . 'Verifica al vendedor, pide una muestra y acuerda la forma de pago por escrito antes de enviar dinero.';

const AVISO_TIPOS = [
  'pedido', 'pedido-estado', 'mensaje', 'curso', 'curso-acceso',
  'lote', 'servicio', 'miembro', 'reporte', 'sistema',
];

/** Un aviso para un miembro. $uid vacío = no se guarda nada. */
function notificar(string $uid, string $tipo, string $titulo, string $texto = '', string $enlace = ''): void {
  $uid = trim($uid);
  if ($uid === '') return;
  if (!in_array($tipo, AVISO_TIPOS, true)) $tipo = 'sistema';
  $titulo = mb_substr(trim($titulo), 0, 140);
  if ($titulo === '') return;

  try {
    mutate_json('notificaciones', [], function (array $todas) use ($uid, $tipo, $titulo, $texto, $enlace) {
      $todas[] = [
        'id'     => uid(),
        'uid'    => $uid,
        'tipo'   => $tipo,
        'titulo' => $titulo,
        'texto'  => mb_substr(trim($texto), 0, 400),
        'enlace' => aviso_enlace_seguro($enlace),
        'ts'     => now_iso(),
        'leido'  => false,
      ];
      return avisos_podar($todas);
    });
  } catch (Throwable $e) {
    // Un aviso perdido no justifica romper la operación del usuario.
  }
}

/** El mismo aviso para toda la administración. */
function notificar_admins(string $tipo, string $titulo, string $texto = '', string $enlace = ''): void {
  try {
    $members = load_json('members', []);
    foreach ($members as $m) {
      $esAdmin = ($m['rol'] ?? '') === 'admin'
        || !empty($m['admin']) || !empty($m['is_admin'])
        || in_array('admin', (array)($m['roles'] ?? []), true);
      if ($esAdmin) notificar((string)($m['id'] ?? ''), $tipo, $titulo, $texto, $enlace);
    }
  } catch (Throwable $e) {}
}

/** Solo rutas internas del sitio. Nada de dominios ajenos en un aviso. */
function aviso_enlace_seguro(string $enlace): string {
  $enlace = trim($enlace);
  if ($enlace === '') return '';
  if ($enlace[0] !== '/' || str_starts_with($enlace, '//')) return '';
  if (str_contains($enlace, '..')) return '';
  return mb_substr($enlace, 0, 200);
}

/** Se quedan los avisos recientes y, de los viejos, solo los no leídos. */
function avisos_podar(array $todas): array {
  $limite = time() - (AVISO_VIDA_DIAS * 86400);
  $todas = array_values(array_filter($todas, function ($a) use ($limite) {
    if (empty($a['leido'])) return true;
    return (strtotime((string)($a['ts'] ?? '')) ?: time()) > $limite;
  }));
  if (count($todas) > AVISOS_MAX) {
    $todas = array_slice($todas, count($todas) - AVISOS_MAX);
  }
  return $todas;
}

/**
 * Bitácora de la Red: quién hizo qué y cuándo.
 *
 * No guarda la IP en claro — para saber si dos movimientos vienen del mismo
 * sitio basta un hash, y así la bitácora no se convierte en un fichero de
 * datos personales.
 */
function registrar_actividad(string $evento, array $datos = []): void {
  $evento = trim($evento);
  if ($evento === '') return;
  try {
    $u = function_exists('current_user') ? current_user() : null;
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $linea = [
      'id'          => uid(),
      'ts'          => now_iso(),
      'evento'      => mb_substr($evento, 0, 40),
      'actor_id'    => (string)($datos['actor_id'] ?? ($u['id'] ?? '')),
      'actor'       => mb_substr((string)($datos['actor'] ?? ($u['nombre'] ?? 'Sistema')), 0, 120),
      'rol'         => mb_substr((string)($datos['rol'] ?? ($u['rol'] ?? '')), 0, 40),
      'objeto_tipo' => mb_substr((string)($datos['objeto_tipo'] ?? ''), 0, 30),
      'objeto_id'   => mb_substr((string)($datos['objeto_id'] ?? ''), 0, 60),
      'ref'         => mb_substr((string)($datos['ref'] ?? ''), 0, 80),
      'detalle'     => mb_substr((string)($datos['detalle'] ?? ''), 0, 300),
      'monto'       => isset($datos['monto']) ? round((float)$datos['monto'], 2) : null,
      'contraparte' => mb_substr((string)($datos['contraparte'] ?? ''), 0, 120),
      'origen'      => $ip === '' ? '' : substr(sha1('redcafe|' . $ip), 0, 10),
    ];
    mutate_json('actividad', [], function (array $log) use ($linea) {
      $log[] = $linea;
      if (count($log) > BITACORA_MAX) $log = array_slice($log, count($log) - BITACORA_MAX);
      return $log;
    });
  } catch (Throwable $e) {}
}

/** Nombre de un miembro por id, para no repetir el bucle en cada API. */
function aviso_nombre_miembro(string $id): string {
  if ($id === '') return '';
  foreach (load_json('members', []) as $m) {
    if ((string)($m['id'] ?? '') === $id) return (string)($m['nombre'] ?? '');
  }
  return '';
}
