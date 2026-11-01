<?php
/**
 * Red Café Ecuador — avisos del miembro
 * ---------------------------------------------------------------------------
 * Cada miembro consulta aquí lo que ha pasado con sus pedidos, sus
 * publicaciones, sus cursos y sus conversaciones. Las APIs que provocan esos
 * hechos los registran con notificar() (api/_avisos.php); esta solo lee y
 * marca como leído.
 */

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';
require_once __DIR__ . '/_respaldo_auto.php';
require_once __DIR__ . '/_salud.php';

$action = $_GET['action'] ?? '';
$in = input();

function mis_avisos(string $uid): array {
  $todas = load_json('notificaciones', []);
  $mias = array_values(array_filter($todas, fn($a) => (string)($a['uid'] ?? '') === $uid));
  usort($mias, fn($a, $b) => strcmp((string)($b['ts'] ?? ''), (string)($a['ts'] ?? '')));
  return $mias;
}

function notificaciones_actor_uid(): string {
  $u = current_user();
  if ($u) return (string)$u['id'];
  if (!empty($_SESSION['admin'])) return AVISOS_ADMIN_UID;
  fail('No autenticado.', 401);
}

/** La administración es la sesión de /admin/ o un miembro con rol admin. */
function notificaciones_admin_o_403(): array {
  $u = current_user();
  if (!empty($_SESSION['admin'])) return $u ?: ['id' => 'admin', 'nombre' => 'Administración'];
  if ($u && miembro_tiene_rol($u, 'admin')) return $u;
  fail('Solo la administración envía avisos a otros miembros.', 403);
}

/** Máximo de correos por envío (el hosting compartido limita el correo por hora). */
const AVISO_CORREO_TOPE = 250;

/** Solo quien marcó «acepto recibir novedades» recibe avisos por correo. */
function aviso_correo_consiente(array $m): bool {
  if (array_key_exists('activo', $m) && empty($m['activo'])) return false;
  if (in_array((string)($m['estado'] ?? ''), ['bloqueado', 'suspendido', 'eliminado'], true)) return false;
  if (!empty($m['acepta_marketing'])) return true;
  return !empty($m['consentimientos']['marketing']['aceptado']);
}

/** Secreto propio para firmar enlaces de baja (se crea una vez en data/). */
function aviso_correo_firma(string $uid): string {
  $f = DATA_DIR . '/.baja_correo_secreto';
  $secreto = is_file($f) ? trim((string)file_get_contents($f)) : '';
  if (strlen($secreto) < 32) {
    $secreto = bin2hex(random_bytes(32));
    @file_put_contents($f, $secreto, LOCK_EX);
    @chmod($f, 0600);
  }
  return hash_hmac('sha256', 'baja-correo|' . $uid, $secreto);
}

function aviso_correo_enlace_baja(string $uid): string {
  return 'https://redcafeecuador.com/api/notificaciones.php?action=baja_correo&u=' . rawurlencode($uid) . '&t=' . aviso_correo_firma($uid);
}

/** El enlace del aviso es una ruta interna; en el correo hace falta completa. */
function aviso_enlace_absoluto(string $enlace): string {
  if ($enlace === '') return 'https://redcafeecuador.com/panel/';
  if (preg_match('#^https://redcafeecuador\.com/#', $enlace)) return $enlace;
  if (str_starts_with($enlace, '/') && !str_starts_with($enlace, '//')) return 'https://redcafeecuador.com' . $enlace;
  return 'https://redcafeecuador.com/panel/';
}

/**
 * Listado del miembro. `solo=nuevos` devuelve únicamente lo no leído, que es
 * lo que consulta el sondeo periódico de la campana.
 */
if ($action === 'list') {
  $uid = notificaciones_actor_uid();
  // Recordatorios opcionales en recordatorios.php, separados de pedidos y mensajes.
  $mias = mis_avisos($uid);
  $sinLeer = count(array_filter($mias, fn($a) => empty($a['leido'])));

  if (($_GET['solo'] ?? '') === 'nuevos') {
    $mias = array_values(array_filter($mias, fn($a) => empty($a['leido'])));
  }
  $limite = max(1, min(100, intval($_GET['limite'] ?? 30)));
  ok([
    'notificaciones' => array_slice($mias, 0, $limite),
    'sin_leer'       => $sinLeer,
  ]);
}

/** Solo el contador: es lo que pide la campana cada pocos minutos. */
if ($action === 'contador') {
  $uid = notificaciones_actor_uid();
  // Copia diaria de los datos: el hosting no garantiza tareas programadas, así
  // que la dispara la primera consulta de la campana del día. Si ya hay copia
  // reciente, sale en una lectura de directorio.
  if (function_exists('respaldo_automatico')) respaldo_automatico();
  // Y, con la misma visita, la revisión de datos: pedidos sin dueño, números
  // repetidos, lotes sin precio. Avisa a la administración si algo no cuadra.
  if (function_exists('salud_revision_diaria')) salud_revision_diaria();
  // No duplicar recordatorios opcionales en el contador de actividad.
  $sinLeer = 0;
  foreach (load_json('notificaciones', []) as $a) {
    if ((string)($a['uid'] ?? '') === $uid && empty($a['leido'])) $sinLeer++;
  }
  ok(['sin_leer' => $sinLeer]);
}

/** Marca uno (`id`) o todos (`todos: true`). Solo los propios. */
if ($action === 'leer') {
  $uid = notificaciones_actor_uid();
  $id = trim((string)($in['id'] ?? ($_GET['id'] ?? '')));
  $todos = filter_var($in['todos'] ?? ($_GET['todos'] ?? false), FILTER_VALIDATE_BOOLEAN);
  if ($id === '' && !$todos) fail('Indica id o todos.', 422);

  $tocados = 0;
  mutate_json('notificaciones', [], function (array $todas) use ($uid, $id, $todos, &$tocados) {
    foreach ($todas as &$a) {
      if ((string)($a['uid'] ?? '') !== $uid) continue;
      if (!$todos && (string)($a['id'] ?? '') !== $id) continue;
      if (empty($a['leido'])) { $a['leido'] = true; $a['leido_at'] = now_iso(); $tocados++; }
    }
    unset($a);
    return $todas;
  });
  ok(['marcados' => $tocados]);
}

/** Retirar un aviso propio de la bandeja. */
if ($action === 'borrar') {
  $uid = notificaciones_actor_uid();
  $id = trim((string)($in['id'] ?? ($_GET['id'] ?? '')));
  if ($id === '') fail('id requerido.', 422);
  $habia = false;
  mutate_json('notificaciones', [], function (array $todas) use ($uid, $id, &$habia) {
    return array_values(array_filter($todas, function ($a) use ($uid, $id, &$habia) {
      if ((string)($a['id'] ?? '') === $id && (string)($a['uid'] ?? '') === $uid) {
        $habia = true;
        return false;
      }
      return true;
    }));
  });
  if (!$habia) fail('Aviso no encontrado.', 404);
  ok(['borrado' => $id]);
}

/**
 * La administración compone y envía un aviso a otros miembros.
 *   destino=todos              → todos los miembros registrados
 *   destino=rol&rol=productor  → solo quienes tienen ese perfil
 *   destino=miembros&ids=a,b   → una lista concreta de ids
 */
if ($action === 'enviar') {
  $admin = notificaciones_admin_o_403();
  $destino = trim((string)($in['destino'] ?? ''));
  $titulo = trim((string)($in['titulo'] ?? ''));
  $texto = trim((string)($in['texto'] ?? ''));
  $enlace = trim((string)($in['enlace'] ?? ''));
  $tipo = trim((string)($in['tipo'] ?? 'sistema'));
  if (!in_array($tipo, AVISO_TIPOS, true)) $tipo = 'sistema';
  if ($titulo === '') fail('El título del aviso es obligatorio.', 422);
  if (mb_strlen($titulo) > 140) fail('El título no puede superar 140 caracteres.', 422);
  if (mb_strlen($texto) > 400) fail('El texto no puede superar 400 caracteres.', 422);

  $members = load_json('members', []);
  $destinatarios = [];

  if ($destino === 'todos') {
    $destinatarios = array_values(array_filter(array_map(fn($m) => (string)($m['id'] ?? ''), $members)));
  } elseif ($destino === 'rol') {
    $rol = trim((string)($in['rol'] ?? ''));
    if ($rol === '') fail('Indica el perfil al que quieres avisar.', 422);
    foreach ($members as $m) {
      if (miembro_tiene_rol($m, $rol)) $destinatarios[] = (string)($m['id'] ?? '');
    }
    $destinatarios = array_values(array_filter($destinatarios));
  } elseif ($destino === 'miembros') {
    $idsIn = $in['ids'] ?? [];
    if (is_string($idsIn)) $idsIn = array_filter(array_map('trim', explode(',', $idsIn)));
    if (!is_array($idsIn) || !count($idsIn)) fail('Indica al menos un miembro destinatario.', 422);
    $existentes = array_flip(array_map(fn($m) => (string)($m['id'] ?? ''), $members));
    foreach ($idsIn as $id) {
      $id = trim((string)$id);
      if ($id !== '' && isset($existentes[$id])) $destinatarios[] = $id;
    }
  } else {
    fail('Destino no válido: usa todos, rol o miembros.', 422);
  }

  $destinatarios = array_values(array_unique($destinatarios));
  if (!count($destinatarios)) fail('No se encontró a quién enviar el aviso.', 404);

  foreach ($destinatarios as $uid) {
    notificar($uid, $tipo, $titulo, $texto, $enlace);
  }

  // Copia por correo (opcional): solo a quien aceptó recibir novedades, con
  // enlace de baja en cada correo. Tope por envío para no rebasar el límite
  // de correo del hosting compartido.
  $correo = ['enviados' => 0, 'sin_consentimiento' => 0, 'sin_correo' => 0, 'fuera_de_tope' => 0, 'fallidos' => 0];
  if (!empty($in['correo'])) {
    require_once __DIR__ . '/mailer.php';
    @set_time_limit(180);
    $porId = [];
    foreach ($members as $m) $porId[(string)($m['id'] ?? '')] = $m;
    foreach ($destinatarios as $uid) {
      $m = $porId[$uid] ?? null;
      if (!$m) continue;
      if (!aviso_correo_consiente($m)) { $correo['sin_consentimiento']++; continue; }
      $email = (string)($m['email'] ?? '');
      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $correo['sin_correo']++; continue; }
      if ($correo['enviados'] + $correo['fallidos'] >= AVISO_CORREO_TOPE) { $correo['fuera_de_tope']++; continue; }
      $okMail = mailer_send('aviso', $email, [
        'nombre' => (string)($m['nombre'] ?? ''),
        'titulo' => $titulo, 'texto' => $texto,
        'enlace' => aviso_enlace_absoluto($enlace),
        'baja'   => aviso_correo_enlace_baja($uid),
      ]);
      $correo[$okMail ? 'enviados' : 'fallidos']++;
    }
  }

  registrar_actividad('aviso-admin-enviado', [
    'actor_id' => (string)($admin['id'] ?? 'admin'),
    'actor'    => (string)($admin['nombre'] ?? 'Administración'),
    'objeto_tipo' => 'notificacion',
    'detalle'  => $titulo . ' · enviado a ' . count($destinatarios) . ' miembro(s)'
                . (!empty($in['correo']) ? ' · ' . $correo['enviados'] . ' por correo' : '') . '.',
  ]);

  ok(['enviados' => count($destinatarios), 'correo' => !empty($in['correo']) ? $correo : null]);
}

/**
 * Baja de los correos de novedades con un clic (enlace firmado de cada correo).
 * No exige sesión: el enlace lleva la firma del miembro. Los avisos de la
 * campana y los correos de sus pedidos siguen llegando.
 */
if ($action === 'baja_correo') {
  $uid = (string)($_GET['u'] ?? '');
  $firma = (string)($_GET['t'] ?? '');
  $valida = $uid !== '' && hash_equals(aviso_correo_firma($uid), $firma);
  if ($valida) {
    mutate_json('members', [], function ($todos) use ($uid) {
      foreach ($todos as &$m) {
        if ((string)($m['id'] ?? '') !== $uid) continue;
        $m['acepta_marketing'] = false;
        $m['consentimientos']['marketing'] = ['aceptado' => false, 'fecha' => now_iso(), 'version' => 'baja-correo'];
      }
      return $todos;
    });
  }
  header('Content-Type: text/html; charset=utf-8');
  echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
     . '<title>Red Café Ecuador</title><body style="font-family:system-ui,sans-serif;background:#F7F4EF;color:#21170F;padding:48px 16px;text-align:center">'
     . ($valida
        ? '<h1 style="font-weight:500">Listo: ya no recibirás correos de novedades</h1><p>Seguirás viendo los avisos dentro de la Red y los correos de tus pedidos.</p>'
        : '<h1 style="font-weight:500">Este enlace no es válido</h1><p>Escríbenos a soporte@redcafeecuador.com y te damos de baja.</p>')
     . '<p><a href="/" style="color:#8A5A22">Volver a Red Café Ecuador</a></p></body>';
  exit;
}

fail('Acción no válida.', 400);
