<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

// Configuracion y entregas se actualizan bajo un unico bloqueo, tambien entre sesiones.
function rc_recordatorios_store(callable $change): array {
  $f = fopen(safe_data_path('recordatorios-config'), 'c+');
  if (!$f || !flock($f, LOCK_EX)) throw new RuntimeException('No se pudo bloquear el archivo.');
  try {
    $raw = stream_get_contents($f);
    $data = $raw === '' ? ['campanas' => [], 'usuarios' => []] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    $result = $change($data);
    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    rewind($f);
    if (fwrite($f, $encoded) !== strlen($encoded) || !ftruncate($f, strlen($encoded)) || !fflush($f)) throw new RuntimeException('No se pudo guardar.');
    return $result;
  } finally { flock($f, LOCK_UN); fclose($f); }
}

function rc_recordatorios_base(): array {
  return [
    ['id'=>'lote','titulo'=>'Publica tu lote de café','texto'=>'Muestra tu café en el marketplace para que los compradores conozcan tu oferta.','enlace'=>'/panel/?ver=publicar','roles'=>['productor'],'dias'=>7,'activo'=>true,'inicio'=>0,'fin'=>0],
    ['id'=>'requerimiento','titulo'=>'Publica el café que necesitas','texto'=>'Indica cantidad, origen y calidad para recibir ofertas de los miembros de la Red.','enlace'=>'/panel/#redcafe-requerimientos-panel','roles'=>['comprador','vendedor','bar','exportador','barista','amante'],'dias'=>7,'activo'=>true,'inicio'=>0,'fin'=>0],
  ];
}

function rc_recordatorio_aplica(array $c, array $u, int $now): bool {
  if (!$c['activo'] || $c['inicio'] > $now || ($c['fin'] && $c['fin'] <= $now)) return false;
  if ($c['roles'] && !array_intersect($c['roles'], miembro_roles($u))) return false;
  if (in_array($c['id'], ['lote','requerimiento'], true)) {
    $created = strtotime($u['created_at'] ?? '') ?: $now;
    if ($now - $created < 86400) return false;
    $rows = load_json($c['id'] === 'lote' ? 'lotes' : 'requerimientos', []);
    foreach ($rows as $r) {
      $owner = $c['id'] === 'lote' ? ($r['productor_id'] ?? $r['published_by'] ?? '') : ($r['autor_id'] ?? '');
      if ((string)$owner !== (string)$u['id']) continue;
      if ($c['id'] === 'lote' && empty($r['oculto'])) return false;
      if ($c['id'] === 'requerimiento' && ($r['estado'] ?? '') === 'abierta' && (empty($r['cierra']) || strtotime($r['cierra'].' 23:59:59') > $now)) return false;
    }
  }
  return true;
}

$action = $_GET['action'] ?? 'list';
$adminAction = in_array($action, ['admin-list','guardar','estado'], true);
if ($adminAction) require_admin();
else {
  $sessionUser = require_user();
  $user = null;
  foreach (load_json('members', []) as $m) {
    if ((string)($m['id'] ?? '') === (string)$sessionUser['id']) { $user = $m; break; }
  }
  if (!$user) fail('Miembro no encontrado.', 401);
}
if (empty($_SESSION['rc_recordatorios_csrf'])) $_SESSION['rc_recordatorios_csrf'] = bin2hex(random_bytes(24));
$token = $_SESSION['rc_recordatorios_csrf'];
$in = input();
if (!in_array($action, ['list','admin-list'], true)) {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Usa POST.', 405);
  if (!hash_equals($token, (string)($_SERVER['HTTP_X_RC_TOKEN'] ?? ''))) fail('Sesion caducada. Recarga la pagina.', 403);
}

try {
  if ($action === 'admin-list') {
    $data = load_json('recordatorios-config', ['campanas'=>[]]);
    ok(['campanas'=>array_values($data['campanas'] ?? []),'token'=>$token]);
  }
  if ($action === 'guardar') {
    $title = trim((string)($in['titulo'] ?? ''));
    $body = trim((string)($in['texto'] ?? ''));
    $link = trim((string)($in['enlace'] ?? ''));
    $roles = $in['roles'] ?? [];
    $days = filter_var($in['dias'] ?? 0, FILTER_VALIDATE_INT);
    if (mb_strlen($title)<5 || mb_strlen($title)>100 || mb_strlen($body)<10 || mb_strlen($body)>400) fail('Revisa el titulo y el mensaje.',422);
    if ($link !== '' && (!preg_match('~^/(?!/)[a-zA-Z0-9/_?=&#%.+-]*$~D',$link) || str_contains($link,'..'))) fail('Usa un enlace interno de la plataforma.',422);
    if (!is_array($roles) || array_diff($roles, ROLES_MIEMBRO) || !in_array($days,[0,1,7,30],true)) fail('Perfil o frecuencia no validos.',422);
    $start = empty($in['inicio']) ? time() : strtotime((string)$in['inicio']);
    $end = empty($in['fin']) ? 0 : strtotime((string)$in['fin']);
    if ($start === false || $end === false || ($end && $end <= $start)) fail('Revisa las fechas.',422);
    $id = trim((string)($in['id'] ?? ''));
    $result = rc_recordatorios_store(function (&$d) use ($id,$title,$body,$link,$roles,$days,$start,$end) {
      if ($id && !isset($d['campanas'][$id])) throw new InvalidArgumentException('Aviso no encontrado.');
      if (!$id && count($d['campanas'])>=100) throw new InvalidArgumentException('Limite de 100 avisos.');
      $id = $id ?: 'admin-'.bin2hex(random_bytes(8));
      $d['campanas'][$id] = ['id'=>$id,'titulo'=>$title,'texto'=>$body,'enlace'=>$link,'roles'=>array_values(array_unique($roles)),'dias'=>$days,'inicio'=>$start,'fin'=>$end,'activo'=>$d['campanas'][$id]['activo'] ?? true];
      return $d['campanas'][$id];
    });
    ok($result);
  }
  if ($action === 'estado') {
    $id = (string)($in['id'] ?? '');
    if (!is_bool($in['activo'] ?? null)) fail('Estado no valido.',422);
    ok(rc_recordatorios_store(function (&$d) use ($id,$in) {
      if (!isset($d['campanas'][$id])) throw new InvalidArgumentException('Aviso no encontrado.');
      $d['campanas'][$id]['activo'] = $in['activo'];
      return ['actualizado'=>true];
    }));
  }
  if ($action === 'list') {
    // GET solo consulta: la entrega se confirma mediante POST al abrir la bandeja.
    ok(['token'=>$token]);
  }
  $uid = (string)$user['id'];
  if ($action === 'entregar') {
    ok(rc_recordatorios_store(function (&$d) use ($user,$uid) {
      $out = []; $now = time();
      foreach (array_merge(rc_recordatorios_base(),array_values($d['campanas'])) as $c) {
        if (!rc_recordatorio_aplica($c,$user,$now)) continue;
        $s = $d['usuarios'][$uid][$c['id']] ?? [];
        if (!empty($s['desactivado']) || ($s['pospuesto'] ?? 0)>$now) continue;
        if (isset($s['ultimo']) && (!$c['dias'] || $now-$s['ultimo']<$c['dias']*86400) && !empty($s['leido'])) continue;
        if (!isset($s['ultimo']) || ($c['dias'] && $now-$s['ultimo'] >= $c['dias']*86400)) {
          $s['ultimo']=$now; $s['leido']=false;
          $d['usuarios'][$uid][$c['id']]=$s;
        }
        $c['ts']=gmdate('c',$s['ultimo']); $out[]=$c;
      }
      // Los avisos administrativos se presentan antes de las sugerencias automaticas.
      usort($out,fn($a,$b)=>strcmp($a['id'],$b['id']));
      return ['recordatorios'=>$out];
    }));
  }
  if ($action === 'preferencia') {
    $id=(string)($in['id'] ?? ''); $mode=$in['modo'] ?? '';
    if (!in_array($mode,['leido','posponer','desactivar','reactivar'],true)) fail('Preferencia no valida.',422);
    ok(rc_recordatorios_store(function (&$d) use ($uid,$id,$mode) {
      if (!in_array($id,['lote','requerimiento'],true) && !isset($d['campanas'][$id])) throw new InvalidArgumentException('Aviso no encontrado.');
      $s=$d['usuarios'][$uid][$id] ?? [];
      if ($mode==='leido') $s['leido']=true;
      if ($mode==='posponer') $s['pospuesto']=time()+7*86400;
      if ($mode==='desactivar') $s['desactivado']=true;
      if ($mode==='reactivar') { $s['desactivado']=false; $s['pospuesto']=0; }
      $d['usuarios'][$uid][$id]=$s;
      return ['guardado'=>true];
    }));
  }
  fail('Accion no valida.',400);
} catch (InvalidArgumentException $e) { fail($e->getMessage(),422); }
catch (Throwable $e) { error_log('Recordatorios: '.$e->getMessage()); fail('No se pudieron guardar los recordatorios. Intenta nuevamente.',503); }
