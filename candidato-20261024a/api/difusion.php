<?php
/**
 * Difusión por WhatsApp desde la administración — envío manual uno por uno.
 * ---------------------------------------------------------------------------
 * No hay proveedor de WhatsApp: la campaña guarda una lista congelada de
 * destinatarios y un mensaje, y el administrador abre cada enlace wa.me y lo
 * envía a mano. Este archivo solo administra quién entra en la lista y deja
 * constancia de adónde se envió (y cuándo).
 *
 *   ?action=destinatarios → calcula la lista según los filtros (sin guardar)
 *   ?action=guardar       → crea la campaña y congela sus destinatarios
 *   ?action=list          → campañas sin la lista de teléfonos (visión general)
 *   ?action=get&id=       → campaña completa
 *   ?action=marcar        → pone/quita enviados[uid]
 *   ?action=borrar        → elimina la campaña
 *
 * Todo exige sesión de administración: sin ella, 403 en cualquier acción.
 */

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

// Vale la contraseña de administración y también el miembro con rol admin.
if (empty($_SESSION['admin'])) {
  $uAdmin = function_exists('current_user') ? current_user() : null;
  if (!$uAdmin || !miembro_tiene_rol($uAdmin, 'admin')) fail('Solo administradores.', 403);
}

$action = $_GET['action'] ?? '';
$in = input();

const DIFUSION_MAX_CAMPANAS = 50;
const DIFUSION_SEGMENTOS = ['todos', 'productores_sin_lote', 'nuevos_30_dias'];
const DIFUSION_SITIO = 'https://redcafeecuador.com';

/**
 * Teléfono a formato internacional Ecuador sin «+». Se aceptan también otros
 * números internacionales de 11 a 15 dígitos tal cual. Resto = inválido.
 */
function difusion_normalizar_telefono($raw): string {
  $d = preg_replace('/\D+/', '', (string)$raw);
  if ($d === '') return '';
  if (str_starts_with($d, '00')) $d = substr($d, 2);
  $len = strlen($d);
  if ($len === 10 && $d[0] === '0') $d = '593' . substr($d, 1);
  elseif ($len === 9 && $d[0] === '9') $d = '593' . $d;
  $len = strlen($d);
  if ($len < 11 || $len > 15) return '';
  return $d;
}

/** ¿Este miembro aceptó recibir comunicaciones? */
function difusion_marketing(array $m): bool {
  if (!empty($m['acepta_marketing'])) return true;
  return !empty($m['consentimientos']['marketing']['aceptado']);
}

/** Estado bloqueado/suspendido/eliminado o cuenta dada de baja. */
function difusion_estado_ok(array $m): bool {
  if (array_key_exists('activo', $m) && empty($m['activo'])) return false;
  $estado = (string)($m['estado'] ?? '');
  if (in_array($estado, ['bloqueado', 'suspendido', 'eliminado'], true)) return false;
  return true;
}

/** Lee y valida los filtros de una petición. */
function difusion_leer_filtros(array $in): array {
  $rolesRaw = $in['roles'] ?? [];
  if (!is_array($rolesRaw)) $rolesRaw = in_array($rolesRaw, ['', null], true) ? [] : [$rolesRaw];
  $roles = [];
  foreach ($rolesRaw as $r) {
    $r = (string)$r;
    if (in_array($r, ROLES_MIEMBRO, true) && !in_array($r, $roles, true)) $roles[] = $r;
  }
  $provincia = trim((string)($in['provincia'] ?? ''));
  $segmento = (string)($in['segmento'] ?? 'todos');
  if (!in_array($segmento, DIFUSION_SEGMENTOS, true)) $segmento = 'todos';
  $solo = filter_var($in['solo_consentimiento'] ?? true, FILTER_VALIDATE_BOOLEAN);
  return ['roles' => $roles, 'provincia' => $provincia, 'segmento' => $segmento, 'solo_consentimiento' => $solo];
}

/** Calcula la lista de destinatarios y cuántos quedaron fuera por cada causa. */
function difusion_calcular(array $filtros): array {
  $roles = $filtros['roles'] ?? [];
  $provincia = (string)($filtros['provincia'] ?? '');
  $segmento = (string)($filtros['segmento'] ?? 'todos');
  $solo = !empty($filtros['solo_consentimiento']);

  $members = load_json('members', []);
  $lotes = [];
  if ($segmento === 'productores_sin_lote') {
    foreach (load_json('lotes', []) as $l) {
      $lotes[(string)($l['productor_id'] ?? $l['published_by'] ?? '')] = true;
    }
  }
  $limiteReciente = strtotime('today -30 days');

  $destinatarios = [];
  $sin_consentimiento = 0;
  $sin_telefono = 0;

  foreach ($members as $m) {
    if (!is_array($m)) continue;
    if (!difusion_estado_ok($m)) continue;

    $rolesM = miembro_roles($m);
    if ($roles && !array_intersect($roles, $rolesM)) continue;
    if ($provincia !== '' && (string)($m['provincia'] ?? '') !== $provincia) continue;

    if ($segmento === 'productores_sin_lote') {
      if (!in_array('productor', $rolesM, true)) continue;
      if (!empty($lotes[(string)($m['id'] ?? '')])) continue;
    }
    if ($segmento === 'nuevos_30_dias') {
      $ts = strtotime((string)($m['created_at'] ?? '')) ?: 0;
      if ($ts < $limiteReciente) continue;
    }

    if ($solo && !difusion_marketing($m)) { $sin_consentimiento++; continue; }

    $tel = difusion_normalizar_telefono($m['telefono'] ?? '');
    if ($tel === '') $tel = difusion_normalizar_telefono($m['whatsapp'] ?? '');
    if ($tel === '') { $sin_telefono++; continue; }

    $destinatarios[] = [
      'id'        => (string)($m['id'] ?? ''),
      'nombre'    => (string)($m['nombre'] ?? ''),
      'telefono'  => $tel,
      'roles'     => $rolesM,
      'provincia' => (string)($m['provincia'] ?? ''),
    ];
  }

  return [$destinatarios, $sin_consentimiento, $sin_telefono];
}

/**
 * Enlace del mensaje: se acepta una ruta interna (se convierte a
 * https://redcafeecuador.com + ruta) o un https:// externo. Lo demás, vacío.
 */
function difusion_enlace_final(string $enlace): string {
  $e = trim($enlace);
  if ($e === '') return '';
  if (mb_strlen($e) > 500) $e = mb_substr($e, 0, 500);
  if (str_starts_with($e, '/') && !str_starts_with($e, '//') && !str_contains($e, '..')) {
    return DIFUSION_SITIO . $e;
  }
  if (preg_match('#^https://\S{3,}$#i', $e)) return $e;
  return '';
}

function difusion_buscar(string $id): ?array {
  foreach (load_json('difusiones', []) as $c) {
    if ((string)($c['id'] ?? '') === $id) return is_array($c) ? $c : null;
  }
  return null;
}

if ($action === 'destinatarios') {
  $filtros = difusion_leer_filtros($in);
  [$dest, $sinConsent, $sinTel] = difusion_calcular($filtros);
  ok([
    'destinatarios'     => $dest,
    'total'             => count($dest),
    'sin_telefono'      => $sinTel,
    'sin_consentimiento'=> $sinConsent,
    'filtros'           => $filtros,
  ]);
}

if ($action === 'guardar') {
  $titulo  = trim((string)($in['titulo'] ?? ''));
  $mensaje = trim((string)($in['mensaje'] ?? ''));
  if (mb_strlen($titulo) < 3 || mb_strlen($titulo) > 200) fail('Título interno: entre 3 y 200 caracteres.', 422);
  if ($mensaje === '' || mb_strlen($mensaje) > 1000) fail('El mensaje es obligatorio y no puede pasar de 1000 caracteres.', 422);

  $enlace = difusion_enlace_final((string)($in['enlace'] ?? ''));
  $filtros = difusion_leer_filtros(is_array($in['filtros'] ?? null) ? $in['filtros'] : $in);
  [$dest] = difusion_calcular($filtros);
  if (!count($dest)) fail('Con esos filtros la lista queda vacía: no hay destinatarios.', 422);

  $id = uid();
  mutate_json('difusiones', [], function (array $todas) use ($id, $titulo, $mensaje, $enlace, $filtros, $dest): array {
    $todas[] = [
      'id'            => $id,
      'titulo'        => $titulo,
      'mensaje'       => $mensaje,
      'enlace'        => $enlace,
      'filtros'       => $filtros,
      'destinatarios' => $dest,
      'creada_at'     => now_iso(),
      'creada_por'    => 'admin',
      'enviados'      => [],
    ];
    if (count($todas) > DIFUSION_MAX_CAMPANAS) {
      usort($todas, fn($a, $b) => (strtotime((string)($a['creada_at'] ?? '')) ?: 0)
                              <=> (strtotime((string)($b['creada_at'] ?? '')) ?: 0));
      $todas = array_slice($todas, count($todas) - DIFUSION_MAX_CAMPANAS);
    }
    return $todas;
  });

  registrar_actividad('difusion', [
    'objeto_tipo' => 'difusion',
    'objeto_id'   => $id,
    'detalle'     => 'Campaña de WhatsApp «' . $titulo . '» · ' . count($dest) . ' destinatarios',
  ]);

  ok(['id' => $id, 'campaign' => difusion_buscar($id)]);
}

if ($action === 'list') {
  $out = array_map(function (array $c): array {
    return [
      'id'              => (string)($c['id'] ?? ''),
      'titulo'          => (string)($c['titulo'] ?? ''),
      'creada_at'       => (string)($c['creada_at'] ?? ''),
      'total'           => count($c['destinatarios'] ?? []),
      'enviados_count'  => count($c['enviados'] ?? []),
    ];
  }, load_json('difusiones', []));
  usort($out, fn($a, $b) => (strtotime((string)($b['creada_at'] ?? '')) ?: 0)
                         <=> (strtotime((string)($a['creada_at'] ?? '')) ?: 0));
  ok(['campaigns' => $out]);
}

if ($action === 'get') {
  $id = trim((string)($in['id'] ?? ''));
  if ($id === '') fail('id requerido.', 422);
  $c = difusion_buscar($id);
  if (!$c) fail('Campaña no encontrada.', 404);
  ok(['campaign' => $c]);
}

if ($action === 'marcar') {
  $id      = trim((string)($in['id'] ?? ''));
  $uidDest = trim((string)($in['uid'] ?? ''));
  $enviado = filter_var($in['enviado'] ?? true, FILTER_VALIDATE_BOOLEAN);
  if ($id === '' || $uidDest === '') fail('id y uid requeridos.', 422);

  $cambio = false;
  $campana = null;
  mutate_json('difusiones', [], function (array $todas) use ($id, $uidDest, $enviado, &$cambio, &$campana): array {
    foreach ($todas as &$c) {
      if ((string)($c['id'] ?? '') !== $id) continue;
      $existe = false;
      foreach ($c['destinatarios'] ?? [] as $d) {
        if ((string)($d['id'] ?? '') === $uidDest) { $existe = true; break; }
      }
      if (!$existe) break;
      if (!is_array($c['enviados'] ?? null)) $c['enviados'] = [];
      if ($enviado) $c['enviados'][$uidDest] = now_iso();
      else unset($c['enviados'][$uidDest]);
      $cambio = true;
      $campana = $c;
      break;
    }
    unset($c);
    return $todas;
  });

  if (!$cambio) fail('Destinatario no encontrado en la campaña.', 404);
  ok(['campaign' => $campana]);
}

if ($action === 'borrar') {
  $id = trim((string)($in['id'] ?? ''));
  if ($id === '') fail('id requerido.', 422);

  $borrado = false;
  mutate_json('difusiones', [], function (array $todas) use ($id, &$borrado): array {
    $n = count($todas);
    $todas = array_values(array_filter($todas, fn($c) => (string)($c['id'] ?? '') !== $id));
    $borrado = count($todas) !== $n;
    return $todas;
  });

  if (!$borrado) fail('Campaña no encontrada.', 404);
  ok(['deleted' => $id]);
}

fail('Acción no válida.', 400);