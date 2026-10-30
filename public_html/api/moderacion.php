<?php
/**
 * Red Café Ecuador — moderación de cuentas y baja voluntaria.
 * ---------------------------------------------------------------------------
 * Sanciones con debido proceso (Términos §6 y §9; Constitución art. 76):
 *   hechos + norma infringida + medida proporcional + notificación + derecho a
 *   apelar + resolución motivada + registro.
 * Baja voluntaria (Términos §4; LOPDP art. 15): el titular elimina su cuenta y
 *   sus datos personales; se conserva lo mínimo que exige el art. 18 (num. 2:
 *   obligaciones contractuales — pedidos con su contraparte; num. 4: defensa de
 *   reclamos — sanciones y reportes), sin datos de contacto.
 *
 * Datos: data/sanciones.json (registro de medidas) y data/bajas.json (registro
 * mínimo de bajas: id, fecha, motivo declarado).
 *
 * Acciones de administración: catalogo, ficha, sancionar, levantar,
 *   resolver_apelacion, list, contactar_correo, publicacion (ocultar, mostrar
 *   o eliminar lo que publicó, con motivo que se le comunica), nota (notas
 *   internas que el miembro no ve: data/notas-admin.json) y acceso (desactivar
 *   o reactivar la cuenta por motivos administrativos, no disciplinarios).
 * Acciones del miembro: mi_estado, apelar (también sin sesión, con el enlace
 *   firmado que recibe al ser sancionado), baja.
 */

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';
require_once __DIR__ . '/_moderacion.php';

$action = $_GET['action'] ?? '';
$in = input();

function mod_admin(): array {
  if (!empty($_SESSION['admin'])) return ['id' => 'admin', 'nombre' => 'Administración'];
  $u = current_user();
  if ($u && miembro_tiene_rol($u, 'admin')) return $u;
  fail('Solo la administración gestiona sanciones.', 403);
}

function mod_buscar_miembro(string $uid): ?array {
  foreach (load_json('members', []) as $m) if ((string)($m['id'] ?? '') === $uid) return $m;
  return null;
}

function mod_notificar_sancion(array $m, array $s, string $titulo, string $texto): void {
  notificar((string)$m['id'], 'sistema', $titulo, $texto, '/panel/?ver=cuenta');
  // Notificación formal por correo: es comunicación del servicio, no publicidad
  // (no depende del consentimiento de novedades). Lleva el enlace para apelar.
  $email = (string)($m['email'] ?? '');
  if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
    require_once __DIR__ . '/mailer.php';
    $inf = MOD_INFRACCIONES[$s['infraccion']] ?? ['titulo' => '', 'norma' => ''];
    $enlace = 'https://redcafeecuador.com/login/?apelacion=' . rawurlencode($s['id']) . '&u=' . rawurlencode((string)$m['id']) . '&t=' . mod_firma((string)$m['id'], $s['id']);
    mailer_send('sancion', $email, [
      'nombre' => (string)($m['nombre'] ?? ''), 'titulo' => $titulo, 'texto' => $texto,
      'infraccion' => $inf['titulo'], 'norma' => $inf['norma'], 'hechos' => $s['hechos'],
      'hasta' => $s['hasta'] ? gmdate('d/m/Y H:i', strtotime($s['hasta'])) . ' (UTC)' : '',
      'apelar_hasta' => $s['apelar_hasta'] ? gmdate('d/m/Y', strtotime($s['apelar_hasta'])) : '',
      'enlace' => $enlace,
    ]);
  }
}

function mod_texto_medida(array $s): string {
  if ($s['tipo'] === 'advertencia') return 'Advertencia formal (tu cuenta sigue activa).';
  if ($s['tipo'] === 'suspension') return 'Suspensión temporal hasta el ' . gmdate('d/m/Y H:i', strtotime((string)$s['hasta'])) . ' (UTC).';
  return 'Bloqueo de la cuenta por tiempo indefinido.';
}

/* ═══════════════════════ Administración ═══════════════════════ */

if ($action === 'catalogo') {
  mod_admin();
  ok(['infracciones' => MOD_INFRACCIONES, 'medidas' => MOD_MEDIDAS_POR_GRAVEDAD, 'dias_max' => MOD_DIAS_MAX_SUSPENSION, 'dias_apelacion' => MOD_DIAS_APELACION]);
}

if ($action === 'ficha') {
  mod_admin();
  $uid = trim((string)($_GET['uid'] ?? ''));
  $m = mod_buscar_miembro($uid);
  if (!$m) fail('Miembro no encontrado.', 404);
  $suyo = fn($x) => in_array($uid, [(string)($x['published_by'] ?? ''), (string)($x['productor_id'] ?? ''), (string)($x['proveedor_id'] ?? ''), (string)($x['autor_id'] ?? ''), (string)($x['owner_id'] ?? '')], true);
  $pedidos = load_json('pedidos', []);
  $reportes = load_json('reportes', []);
  $sanciones = array_values(array_filter(load_json('sanciones', []), fn($s) => ($s['uid'] ?? '') === $uid));
  $actividad = array_values(array_filter(load_json('actividad', []), fn($a) => ($a['actor_id'] ?? '') === $uid));
  $publicaciones = [];
  foreach (MOD_PUBLICACIONES as $tipo => $def) {
    foreach (load_json($def['archivo'], []) as $x) {
      if (!is_array($x) || !$suyo($x)) continue;
      $publicaciones[] = [
        'tipo' => $tipo, 'id' => (string)($x['id'] ?? ''),
        'titulo' => mb_substr(trim((string)($x['titulo'] ?? $x['finca'] ?? $x['text'] ?? '')), 0, 120) ?: '(sin título)',
        'oculto' => !empty($x['oculto']), 'puede_ocultar' => $def['ocultable'],
        'fecha' => (string)($x['created_at'] ?? ''), 'enlace' => $def['enlace'],
      ];
    }
  }
  $notas = load_json('notas-admin', []);
  ok([
    'miembro' => sanitize_user($m),
    'contadores' => [
      'lotes' => count(array_filter(load_json('lotes', []), $suyo)),
      'servicios' => count(array_filter(load_json('servicios-terceros', []), $suyo)),
      'publicaciones' => count(array_filter(load_json('posts', []), $suyo)),
      'pedidos_comprador' => count(array_filter($pedidos, fn($p) => (string)($p['solicitante_id'] ?? '') === $uid)),
      'pedidos_vendedor' => count(array_filter($pedidos, fn($p) => (string)($p['productor_id'] ?? '') === $uid)),
    ],
    'reportes_recibidos' => array_values(array_filter($reportes, fn($r) => ($r['reportado_id'] ?? '') === $uid)),
    'reportes_hechos' => count(array_filter($reportes, fn($r) => ($r['uid'] ?? '') === $uid)),
    'sanciones' => array_map(fn($s) => $s + ['estado_vigente' => mod_estado_vigente($s)], $sanciones),
    'actividad' => array_slice(array_reverse($actividad), 0, 15),
    'publicaciones' => $publicaciones,
    'pedidos' => array_values(array_map(fn($p) => [
      'nro' => $p['nro'] ?? null, 'estado' => (string)($p['estado'] ?? ''), 'fecha' => (string)($p['created_at'] ?? $p['fecha'] ?? ''),
      'finca' => (string)($p['finca'] ?? ''), 'sacos' => $p['sacos'] ?? null, 'total' => $p['total'] ?? null,
      'papel' => (string)($p['solicitante_id'] ?? '') === $uid ? 'compra' : 'venta',
    ], array_filter($pedidos, fn($p) => in_array($uid, [(string)($p['solicitante_id'] ?? ''), (string)($p['productor_id'] ?? '')], true)))),
    'notas' => array_values(array_reverse((array)($notas['u:' . $uid] ?? []))),
    'acceso' => [
      'activo' => ($m['activo'] ?? true) !== false,
      'restringida' => cuenta_restringida($uid),
      'estado_validacion' => (string)($m['estado_validacion'] ?? ($m['verificado'] ?? false ? 'verificado' : 'pendiente')),
    ],
  ]);
}

if ($action === 'publicacion') {
  $admin = mod_admin();
  $tipo = (string)($in['tipo'] ?? '');
  $id = trim((string)($in['id'] ?? ''));
  $accion = (string)($in['accion'] ?? '');
  $motivo = trim((string)($in['motivo'] ?? ''));
  $def = MOD_PUBLICACIONES[$tipo] ?? null;
  if (!$def || $id === '') fail('Publicación no válida.', 422);
  if (!in_array($accion, ['ocultar', 'mostrar', 'eliminar'], true)) fail('Acción no válida.', 422);
  if ($accion !== 'eliminar' && !$def['ocultable']) fail('Esta publicación no se puede ocultar; solo eliminar.', 422);
  if (mb_strlen($motivo) < 10) fail('Escribe el motivo (mínimo 10 caracteres): se le comunica a quien publicó.', 422);
  $hecho = null;
  mutate_json($def['archivo'], [], function ($items) use ($id, $accion, &$hecho) {
    $out = [];
    foreach ($items as $x) {
      if (is_array($x) && (string)($x['id'] ?? '') === $id) {
        $hecho = $x;
        if ($accion === 'eliminar') continue;
        $x['oculto'] = $accion === 'ocultar';
        $x['updated_at'] = now_iso();
      }
      $out[] = $x;
    }
    return $out;
  });
  if (!$hecho) fail('Publicación no encontrada.', 404);
  $duenio = '';
  foreach (['published_by', 'productor_id', 'proveedor_id', 'autor_id', 'owner_id'] as $k) if (!empty($hecho[$k])) { $duenio = (string)$hecho[$k]; break; }
  $titulo = mb_substr(trim((string)($hecho['titulo'] ?? $hecho['finca'] ?? $hecho['text'] ?? '')), 0, 80);
  $verbo = ['ocultar' => 'ocultó', 'mostrar' => 'volvió a publicar', 'eliminar' => 'eliminó'][$accion];
  if ($duenio !== '') notificar($duenio, 'sistema', 'La administración ' . $verbo . ' tu publicación', '«' . $titulo . '». Motivo: ' . $motivo, '/panel/');
  registrar_actividad('publicacion-' . $accion . '-admin', [
    'actor_id' => (string)$admin['id'], 'actor' => (string)($admin['nombre'] ?? 'admin'),
    'objeto_tipo' => $tipo, 'objeto_id' => $id, 'detalle' => $motivo,
  ]);
  ok(['accion' => $accion]);
}

if ($action === 'nota') {
  $admin = mod_admin();
  $uid = trim((string)($in['uid'] ?? ''));
  $texto = trim((string)($in['texto'] ?? ''));
  if (!mod_buscar_miembro($uid)) fail('Miembro no encontrado.', 404);
  if (mb_strlen($texto) < 3 || mb_strlen($texto) > 1000) fail('La nota debe tener entre 3 y 1000 caracteres.', 422);
  $nota = ['ts' => now_iso(), 'actor' => (string)($admin['nombre'] ?? 'admin'), 'texto' => $texto];
  mutate_json('notas-admin', [], function ($todas) use ($uid, $nota) {
    $todas = is_array($todas) ? $todas : [];
    // Clave con prefijo: un id solo de cifras haría de PHP una lista.
    $todas['u:' . $uid] = array_merge((array)($todas['u:' . $uid] ?? []), [$nota]);
    return $todas;
  });
  ok(['nota' => $nota]);
}

if ($action === 'acceso') {
  // Desactivar/reactivar por motivo administrativo (cuenta duplicada, petición
  // del titular, datos por confirmar). Las infracciones van por «sancionar».
  $admin = mod_admin();
  $uid = trim((string)($in['uid'] ?? ''));
  $activo = !empty($in['activo']);
  $motivo = trim((string)($in['motivo'] ?? ''));
  $m = mod_buscar_miembro($uid);
  if (!$m) fail('Miembro no encontrado.', 404);
  if (($m['estado'] ?? '') === 'eliminado') fail('La cuenta ya fue eliminada.', 409);
  if (mb_strlen($motivo) < 10) fail('Escribe el motivo (mínimo 10 caracteres).', 422);
  mutate_json('members', [], function ($ms) use ($uid, $activo, $motivo) {
    foreach ($ms as &$x) {
      if ((string)($x['id'] ?? '') !== $uid) continue;
      $x['activo'] = $activo;
      $x['motivo_acceso'] = $motivo;
      $x['updated_at'] = now_iso();
    }
    unset($x);
    return $ms;
  });
  if ($activo) notificar($uid, 'sistema', 'Tu cuenta está activa de nuevo', $motivo, '/panel/');
  registrar_actividad($activo ? 'cuenta-reactivada' : 'cuenta-desactivada', [
    'actor_id' => (string)$admin['id'], 'actor' => (string)($admin['nombre'] ?? 'admin'),
    'objeto_tipo' => 'miembro', 'objeto_id' => $uid, 'detalle' => $motivo,
  ]);
  ok(['activo' => $activo]);
}

if ($action === 'list') {
  mod_admin();
  $todas = load_json('sanciones', []);
  $filtro = (string)($_GET['estado'] ?? '');
  $out = [];
  foreach (array_reverse($todas) as $s) {
    $s['estado_vigente'] = mod_estado_vigente($s);
    if ($filtro === 'apelaciones' && (($s['apelacion']['estado'] ?? '') !== 'pendiente')) continue;
    if ($filtro && $filtro !== 'apelaciones' && $s['estado_vigente'] !== $filtro) continue;
    $m = mod_buscar_miembro((string)$s['uid']);
    $s['miembro'] = $m ? (string)($m['nombre'] ?? '') : '(cuenta eliminada)';
    $out[] = $s;
  }
  ok(['sanciones' => $out]);
}

if ($action === 'sancionar') {
  $admin = mod_admin();
  $uid = trim((string)($in['uid'] ?? ''));
  $tipo = (string)($in['tipo'] ?? '');
  $infraccion = (string)($in['infraccion'] ?? '');
  $hechos = trim((string)($in['hechos'] ?? ''));
  $dias = (int)($in['dias'] ?? 0);
  $evidencias = array_values(array_filter(array_map(fn($e) => mb_substr(trim((string)$e), 0, 300), (array)($in['evidencias'] ?? []))));
  $m = mod_buscar_miembro($uid);
  if (!$m) fail('Miembro no encontrado.', 404);
  if (($m['estado'] ?? '') === 'eliminado') fail('La cuenta ya fue eliminada.', 409);
  if (!isset(MOD_INFRACCIONES[$infraccion])) fail('Elige la infracción del catálogo.', 422);
  $permitidas = MOD_MEDIDAS_POR_GRAVEDAD[MOD_INFRACCIONES[$infraccion]['gravedad']];
  if (!in_array($tipo, $permitidas, true)) fail('Esa medida no es proporcional a la infracción elegida. Permitidas: ' . implode(', ', $permitidas) . '.', 422);
  if (mb_strlen($hechos) < 30) fail('Describe los hechos (mínimo 30 caracteres): qué pasó, cuándo y cómo se comprobó.', 422);
  if ($tipo === 'suspension' && ($dias < 1 || $dias > MOD_DIAS_MAX_SUSPENSION)) fail('La suspensión va de 1 a ' . MOD_DIAS_MAX_SUSPENSION . ' días.', 422);
  if ($tipo === 'bloqueo' && !count($evidencias)) fail('Un bloqueo indefinido requiere al menos una evidencia (reporte, enlace o captura).', 422);

  $ahora = time();
  $s = [
    'id' => uid(), 'uid' => $uid, 'tipo' => $tipo, 'infraccion' => $infraccion,
    'hechos' => mb_substr($hechos, 0, 2000), 'evidencias' => $evidencias,
    'desde' => gmdate('c', $ahora),
    'hasta' => $tipo === 'suspension' ? gmdate('c', $ahora + $dias * 86400) : null,
    'apelar_hasta' => gmdate('c', $ahora + MOD_DIAS_APELACION * 86400),
    'estado' => 'activa',
    'creado_por' => (string)($admin['id'] ?? 'admin'),
    'historial' => [['ts' => now_iso(), 'accion' => 'sancion-impuesta', 'actor' => (string)($admin['nombre'] ?? 'Administración')]],
  ];
  mutate_json('sanciones', [], function ($todas) use ($s) { $todas[] = $s; return $todas; });

  $titulo = $tipo === 'advertencia' ? 'Advertencia sobre el uso de tu cuenta' : ($tipo === 'suspension' ? 'Tu cuenta ha sido suspendida temporalmente' : 'Tu cuenta ha sido bloqueada');
  $texto = mod_texto_medida($s) . ' Motivo: ' . MOD_INFRACCIONES[$infraccion]['titulo'] . '. Puedes apelar hasta el ' . gmdate('d/m/Y', strtotime($s['apelar_hasta'])) . '.';
  mod_notificar_sancion($m, $s, $titulo, $texto);
  registrar_actividad('sancion-impuesta', [
    'actor_id' => (string)($admin['id'] ?? 'admin'), 'actor' => (string)($admin['nombre'] ?? 'Administración'),
    'objeto_tipo' => 'miembro', 'objeto_id' => $uid,
    'detalle' => $tipo . ' · ' . $infraccion . ($tipo === 'suspension' ? ' · ' . $dias . ' días' : ''),
  ]);
  ok(['sancion' => $s]);
}

if ($action === 'levantar' || $action === 'resolver_apelacion') {
  $admin = mod_admin();
  $sid = trim((string)($in['id'] ?? ''));
  $justif = trim((string)($in[$action === 'levantar' ? 'justificacion' : 'respuesta'] ?? ''));
  $decision = (string)($in['decision'] ?? '');
  if (mb_strlen($justif) < 20) fail('Escribe la justificación (mínimo 20 caracteres): queda en el registro y se comunica a la persona.', 422);
  if ($action === 'resolver_apelacion' && !in_array($decision, ['aceptada', 'rechazada'], true)) fail('Decisión no válida.', 422);
  $hecho = null;
  mutate_json('sanciones', [], function ($todas) use ($sid, $justif, $decision, $action, $admin, &$hecho) {
    foreach ($todas as &$s) {
      if (($s['id'] ?? '') !== $sid) continue;
      $actor = (string)($admin['nombre'] ?? 'Administración');
      if ($action === 'resolver_apelacion') {
        if (($s['apelacion']['estado'] ?? '') !== 'pendiente') return $todas;
        $s['apelacion']['estado'] = $decision;
        $s['apelacion']['respuesta'] = mb_substr($justif, 0, 2000);
        $s['apelacion']['resuelta'] = now_iso();
        $s['historial'][] = ['ts' => now_iso(), 'accion' => 'apelacion-' . $decision, 'actor' => $actor];
        if ($decision === 'aceptada') { $s['estado'] = 'levantada'; $s['levantada'] = now_iso(); }
      } else {
        if (mod_estado_vigente($s) !== 'activa') return $todas;
        $s['estado'] = 'levantada'; $s['levantada'] = now_iso(); $s['justificacion_levantamiento'] = mb_substr($justif, 0, 2000);
        $s['historial'][] = ['ts' => now_iso(), 'accion' => 'sancion-levantada', 'actor' => $actor, 'nota' => mb_substr($justif, 0, 300)];
      }
      $hecho = $s;
    }
    return $todas;
  });
  if (!$hecho) fail('No se encontró la sanción o ya no admite ese cambio.', 409);
  $m = mod_buscar_miembro((string)$hecho['uid']);
  if ($m) {
    $titulo = $action === 'levantar' || $decision === 'aceptada' ? 'Se levantó la medida sobre tu cuenta' : 'Resolución de tu apelación';
    notificar((string)$m['id'], 'sistema', $titulo, mb_substr($justif, 0, 380), '/panel/?ver=cuenta');
    if (filter_var((string)($m['email'] ?? ''), FILTER_VALIDATE_EMAIL)) {
      require_once __DIR__ . '/mailer.php';
      mailer_send('contacto_admin', (string)$m['email'], ['nombre' => (string)($m['nombre'] ?? ''), 'asunto' => $titulo, 'mensaje' => $justif]);
    }
  }
  registrar_actividad($action === 'levantar' ? 'sancion-levantada' : 'apelacion-resuelta', [
    'actor_id' => (string)($admin['id'] ?? 'admin'), 'actor' => (string)($admin['nombre'] ?? 'Administración'),
    'objeto_tipo' => 'miembro', 'objeto_id' => (string)$hecho['uid'], 'detalle' => $action === 'levantar' ? 'levantada' : $decision,
  ]);
  ok(['sancion' => $hecho]);
}

if ($action === 'contactar_correo') {
  $admin = mod_admin();
  if (!check_rate_limit('admin_correo_directo', 60, 3600)) fail('Demasiados correos seguidos. Espera un poco.', 429);
  $m = mod_buscar_miembro(trim((string)($in['uid'] ?? '')));
  if (!$m) fail('Miembro no encontrado.', 404);
  $asunto = trim(str_replace(["\r", "\n"], ' ', (string)($in['asunto'] ?? '')));
  $mensaje = trim((string)($in['mensaje'] ?? ''));
  if (mb_strlen($asunto) < 3 || mb_strlen($asunto) > 140) fail('El asunto va de 3 a 140 caracteres.', 422);
  if (mb_strlen($mensaje) < 10 || mb_strlen($mensaje) > 3000) fail('El mensaje va de 10 a 3000 caracteres.', 422);
  if (!filter_var((string)($m['email'] ?? ''), FILTER_VALIDATE_EMAIL)) fail('Ese miembro no tiene un correo válido.', 422);
  require_once __DIR__ . '/mailer.php';
  $okMail = mailer_send('contacto_admin', (string)$m['email'], ['nombre' => (string)($m['nombre'] ?? ''), 'asunto' => $asunto, 'mensaje' => $mensaje]);
  registrar_actividad('correo-admin-directo', [
    'actor_id' => (string)($admin['id'] ?? 'admin'), 'actor' => (string)($admin['nombre'] ?? 'Administración'),
    'objeto_tipo' => 'miembro', 'objeto_id' => (string)$m['id'], 'detalle' => $asunto,
  ]);
  ok(['enviado' => $okMail]);
}

/* ═══════════════════════ Miembro ═══════════════════════ */

if ($action === 'mi_estado') {
  $u = current_user();
  if (!$u) fail('No autenticado.', 401);
  $mias = array_values(array_filter(load_json('sanciones', []), fn($s) => ($s['uid'] ?? '') === (string)$u['id']));
  ok(['sanciones' => array_map('mod_publica', array_reverse($mias))]);
}

/** Apelación: con sesión (advertencias) o con el enlace firmado (suspensión o bloqueo). */
if ($action === 'apelar') {
  if (!check_rate_limit('apelacion', 5, 3600)) fail('Demasiados intentos. Vuelve a intentarlo en una hora.', 429);
  $sid = trim((string)($in['id'] ?? ''));
  $texto = trim((string)($in['texto'] ?? ''));
  $u = current_user();
  $uid = $u ? (string)$u['id'] : trim((string)($in['u'] ?? ''));
  $firma = (string)($in['t'] ?? '');
  if (!$u && ($uid === '' || !hash_equals(mod_firma($uid, $sid), $firma))) fail('Enlace de apelación no válido.', 403);
  if (mb_strlen($texto) < 30) fail('Explica tus razones (mínimo 30 caracteres). Puedes añadir enlaces a pruebas.', 422);
  $res = null;
  mutate_json('sanciones', [], function ($todas) use ($sid, $uid, $texto, &$res) {
    foreach ($todas as &$s) {
      if (($s['id'] ?? '') !== $sid || ($s['uid'] ?? '') !== $uid) continue;
      if (isset($s['apelacion'])) { $res = 'ya'; return $todas; }
      if (!empty($s['apelar_hasta']) && strtotime((string)$s['apelar_hasta']) < time()) { $res = 'plazo'; return $todas; }
      $s['apelacion'] = ['texto' => mb_substr($texto, 0, 3000), 'fecha' => now_iso(), 'estado' => 'pendiente'];
      $s['historial'][] = ['ts' => now_iso(), 'accion' => 'apelacion-presentada', 'actor' => 'titular'];
      $res = 'ok';
    }
    return $todas;
  });
  if ($res === 'ya') fail('Esta medida ya tiene una apelación registrada.', 409);
  if ($res === 'plazo') fail('El plazo para apelar esta medida terminó.', 409);
  if ($res !== 'ok') fail('Sanción no encontrada.', 404);
  notificar_admins('reporte', 'Nueva apelación de una sanción', mb_substr($texto, 0, 200), '/admin/');
  ok(['apelacion' => 'pendiente']);
}

/** Datos públicos de una sanción para quien llega con el enlace firmado (sin sesión). */
if ($action === 'ver_apelacion') {
  $sid = trim((string)($_GET['id'] ?? '')); $uid = trim((string)($_GET['u'] ?? '')); $firma = (string)($_GET['t'] ?? '');
  if ($uid === '' || !hash_equals(mod_firma($uid, $sid), $firma)) fail('Enlace no válido.', 403);
  foreach (load_json('sanciones', []) as $s) if (($s['id'] ?? '') === $sid && ($s['uid'] ?? '') === $uid) ok(['sancion' => mod_publica($s)]);
  fail('Sanción no encontrada.', 404);
}

/**
 * Baja voluntaria: elimina la cuenta y los datos personales (LOPDP art. 15).
 * Pide contraseña y la palabra ELIMINAR. Si hay pedidos en curso se resuelven
 * antes (Términos §9): no se deja a la contraparte sin saber con quién trata.
 */
if ($action === 'baja') {
  $u = current_user();
  if (!$u) fail('No autenticado.', 401);
  if (!check_rate_limit('baja_cuenta', 5, 3600)) fail('Demasiados intentos. Vuelve a intentarlo en una hora.', 429);
  if (trim((string)($in['confirmacion'] ?? '')) !== 'ELIMINAR') fail('Escribe ELIMINAR para confirmar.', 422);
  $uid = (string)$u['id'];
  $m = mod_buscar_miembro($uid);
  if (!$m || !password_verify((string)($in['pass'] ?? ''), (string)($m['pass'] ?? ''))) fail('La contraseña no es correcta.', 401);

  $finales = ['entregado', 'cancelado'];   // estados de pedidos.php: Solicitado, Aceptado, En camino, Entregado, Cancelado
  $abiertos = array_values(array_filter(load_json('pedidos', []), function ($p) use ($uid, $finales) {
    $es = in_array($uid, [(string)($p['solicitante_id'] ?? ''), (string)($p['productor_id'] ?? ''), (string)($p['proveedor_id'] ?? '')], true);
    return $es && !in_array(mb_strtolower((string)($p['estado'] ?? '')), $finales, true);
  }));
  if (count($abiertos)) {
    fail('Tienes ' . count($abiertos) . ' pedido(s) en curso. Complétalos o cancélalos antes de cerrar tu cuenta.', 409, [
      'pedidos' => array_map(fn($p) => ['nro' => $p['nro'] ?? '', 'estado' => $p['estado'] ?? ''], $abiertos),
    ]);
  }

  $email = (string)($m['email'] ?? ''); $nombre = (string)($m['nombre'] ?? '');
  $motivo = mb_substr(trim((string)($in['motivo'] ?? '')), 0, 300);
  $resumen = ['lotes' => 0, 'servicios' => 0, 'publicaciones' => 0, 'requerimientos' => 0, 'empleos' => 0, 'busquedas' => 0];
  $deEl = fn($x) => in_array($uid, [(string)($x['published_by'] ?? ''), (string)($x['productor_id'] ?? ''), (string)($x['proveedor_id'] ?? ''), (string)($x['autor_id'] ?? ''), (string)($x['owner_id'] ?? '')], true);
  foreach (['lotes' => 'lotes', 'servicios-terceros' => 'servicios', 'posts' => 'publicaciones', 'requerimientos' => 'requerimientos', 'empleos' => 'empleos', 'busquedas-empleo' => 'busquedas'] as $archivo => $clave) {
    mutate_json($archivo, [], function ($items) use ($deEl, &$resumen, $clave, $uid) {
      $antes = count($items);
      $items = array_values(array_filter($items, fn($x) => !$deEl($x)));
      $resumen[$clave] = $antes - count($items);
      if ($clave === 'publicaciones') {   // sus comentarios en publicaciones ajenas: sin nombre
        foreach ($items as &$p) foreach (($p['comments'] ?? []) as $i => $c) {
          if (($c['autor_id'] ?? '') === $uid) { $p['comments'][$i]['autor'] = 'Miembro que dejó la Red'; $p['comments'][$i]['autor_id'] = ''; }
        }
      }
      return $items;
    });
  }
  // Pedidos ya cerrados: se conservan para la contraparte (art. 18 num. 2) sin datos de contacto.
  mutate_json('pedidos', [], function ($ps) use ($uid) {
    foreach ($ps as &$p) {
      foreach (['solicitante_id' => 'solicitante', 'productor_id' => 'productor', 'proveedor_id' => 'proveedor'] as $k => $nombreCampo) {
        if ((string)($p[$k] ?? '') !== $uid) continue;
        $p[$nombreCampo] = 'Miembro que dejó la Red';
        foreach (['email', 'telefono', 'whatsapp', $nombreCampo . '_email', $nombreCampo . '_telefono', $nombreCampo . '_whatsapp'] as $c) unset($p[$c]);
      }
    }
    return $ps;
  });
  mutate_json('notificaciones', [], fn($ns) => array_values(array_filter($ns, fn($n) => (string)($n['uid'] ?? '') !== $uid)));
  // La ficha queda como registro mínimo e ilegible: sin nombre, contacto ni contraseña.
  mutate_json('members', [], function ($ms) use ($uid) {
    foreach ($ms as &$x) {
      if ((string)($x['id'] ?? '') !== $uid) continue;
      $x = ['id' => $uid, 'nombre' => 'Miembro que dejó la Red', 'email' => 'eliminado+' . $uid . '@invalid', 'estado' => 'eliminado', 'activo' => false,
            'rol' => 'eliminado', 'roles' => [], 'visibilidad' => 'privado', 'eliminado_en' => now_iso()];
    }
    return $ms;
  });
  // Las notas internas sobre la persona se borran con su cuenta (LOPDP art. 15).
  mutate_json('notas-admin', [], function ($todas) use ($uid) { unset($todas['u:' . $uid]); return $todas; });
  mutate_json('bajas', [], function ($bs) use ($uid, $motivo, $resumen) { $bs[] = ['uid' => $uid, 'fecha' => now_iso(), 'motivo' => $motivo, 'eliminado' => $resumen]; return $bs; });
  registrar_actividad('cuenta-eliminada', ['actor_id' => $uid, 'actor' => 'titular', 'objeto_tipo' => 'miembro', 'objeto_id' => $uid, 'detalle' => 'baja voluntaria']);
  if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
    require_once __DIR__ . '/mailer.php';
    mailer_send('baja', $email, ['nombre' => $nombre]);
  }
  $_SESSION = [];
  session_destroy();
  ok(['eliminado' => $resumen]);
}

fail('Acción no válida.', 400);
