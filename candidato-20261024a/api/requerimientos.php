<?php
declare(strict_types=1);

/* Red Café Ecuador — requerimientos de café ("compro café" / "busco café")
 * ---------------------------------------------------------------------------
 * Es el espejo del marketplace: hasta ahora solo se podía publicar lo que uno
 * VENDE. Quien compra tenía que recorrer las fichas una por una y escribir a
 * cada productor. Aquí publica una sola vez lo que busca, y son los productores
 * los que se acercan.
 *
 * Sigue deliberadamente la misma forma que empleos.php —mismos nombres de
 * acción, misma validación, mismo reparto de permisos—: dos módulos que hacen
 * lo mismo con formas distintas se vuelven dos módulos que hay que aprender.
 */

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';
require_once __DIR__ . '/_comunidad-avisos.php';

$action = $_GET['action'] ?? '';
$in = input();

const REQ_TIPOS      = ['verde', 'tostado', 'cualquiera'];
const REQ_PROCESOS   = ['lavado', 'honey', 'natural', 'cualquiera'];
const REQ_UNIDADES   = ['sacos', 'quintales', 'kg'];
const REQ_FRECUENCIAS = ['unica', 'mensual', 'trimestral', 'anual'];
const REQ_CONTACTOS  = ['plataforma', 'whatsapp', 'correo'];
const REQ_ESTADOS    = ['abierta', 'pausada', 'cerrada'];
const REQ_OFERTA_ESTADOS = ['recibida', 'en-revision', 'preseleccionada', 'descartada', 'cerrada'];

/* Decisión del propietario (10 sep 2026): publican los perfiles cuyo negocio es
 * comprar café —Comprador, Tostador/Comerciante, Bar/Cafetería y Exportador— y
 * además Barista y Amante del Café, que compran en cantidades pequeñas. Quedan
 * fuera los perfiles de servicio (asesor, transportista, pilador, certificador,
 * proveedor) y el productor, que es a quien va dirigido el requerimiento. */
const PERFILES_QUE_COMPRAN = ['comprador', 'vendedor', 'bar', 'exportador', 'barista', 'amante'];

function req_usuario_actual_o_admin(): array {
  $u = current_user();
  if ($u) return $u;
  if (!empty($_SESSION['admin'])) {
    return ['id' => 'admin', 'nombre' => 'Administración', 'rol' => 'admin', 'roles' => ['admin']];
  }
  fail('No autenticado.', 401);
}

function req_es_admin(?array $u = null): bool {
  if (!empty($_SESSION['admin'])) return true;
  return $u ? miembro_tiene_rol($u, 'admin') : false;
}

function req_puede_publicar(array $u): bool {
  if (req_es_admin($u)) return true;
  foreach (miembro_roles($u) as $rol) {
    if (in_array($rol, PERFILES_QUE_COMPRAN, true)) return true;
  }
  return false;
}

function req_texto($valor, string $campo, int $min, int $max, bool $opcional = false): string {
  $valor = trim((string)$valor);
  if ($valor === '' && $opcional) return '';
  $len = mb_strlen($valor);
  if ($len < $min || $len > $max) {
    fail($campo . ' debe tener entre ' . $min . ' y ' . $max . ' caracteres.', 422);
  }
  return $valor;
}

function req_enum($valor, string $campo, array $permitidos): string {
  $valor = trim((string)$valor);
  if (!in_array($valor, $permitidos, true)) fail($campo . ' inválido.', 422);
  return $valor;
}

function req_numero($valor, string $campo, ?float $max = null): ?float {
  if ($valor === null || $valor === '') return null;
  if (!is_numeric($valor)) fail($campo . ' debe ser numérico.', 422);
  $n = (float)$valor;
  if ($n < 0) fail($campo . ' no puede ser negativo.', 422);
  if ($max !== null && $n > $max) fail($campo . ' es demasiado alto.', 422);
  return round($n, 2);
}

function req_bool($valor): bool {
  if (is_bool($valor)) return $valor;
  if (is_numeric($valor)) return (int)$valor === 1;
  return in_array(strtolower(trim((string)$valor)), ['1', 'true', 'on', 'si', 'sí'], true);
}

function req_fecha_cierre($valor): string {
  $valor = trim((string)$valor);
  // Mismo criterio que la bolsa de empleo: sin fecha se cierra solo a los 60
  // días. Un tablero de "compro café" lleno de peticiones viejas hace perder el
  // tiempo a los productores que escriben.
  if ($valor === '') {
    return (new DateTimeImmutable(today(), new DateTimeZone('UTC')))
      ->modify('+60 days')->format('Y-m-d');
  }
  $dt = DateTime::createFromFormat('!Y-m-d', $valor, new DateTimeZone('UTC'));
  if (!$dt || $dt->format('Y-m-d') !== $valor) fail('Fecha de cierre inválida.', 422);
  $hoy = new DateTimeImmutable(today(), new DateTimeZone('UTC'));
  if (new DateTimeImmutable($valor, new DateTimeZone('UTC')) < $hoy) fail('La fecha de cierre no puede estar vencida.', 422);
  if (new DateTimeImmutable($valor, new DateTimeZone('UTC')) > $hoy->modify('+1 year')) fail('La fecha de cierre no puede superar un año.', 422);
  return $valor;
}

function req_vencido(array $r): bool {
  $cierra = (string)($r['cierra'] ?? '');
  return $cierra !== '' && $cierra < today();
}

function req_owner_id(array $r): string { return (string)($r['autor_id'] ?? ''); }

function req_autorizado(array $r, array $u): bool {
  return req_es_admin($u) || req_owner_id($r) === (string)($u['id'] ?? '');
}

function req_por_id(array $lista, string $id): ?array {
  foreach ($lista as $r) if ((string)($r['id'] ?? '') === $id) return $r;
  return null;
}

function req_ya_oferto(array $ofertas, string $reqId, string $uid): bool {
  foreach ($ofertas as $o) {
    if ((string)($o['requerimiento_id'] ?? '') === $reqId && (string)($o['oferente_id'] ?? '') === $uid) return true;
  }
  return false;
}

function req_contar_ofertas(array $ofertas, string $reqId): int {
  $n = 0;
  foreach ($ofertas as $o) if ((string)($o['requerimiento_id'] ?? '') === $reqId) $n++;
  return $n;
}

/* Sin sesión no salen ni el correo ni el teléfono de quien publica. Es la misma
 * regla que rige las fichas de lote desde el 8 de septiembre: la oferta es
 * pública, el dato de contacto no. */
/**
 * Fotos del requerimiento: rutas de uploads propias, hasta cuatro. Quien
 * busca café también enseña algo —su tostadora, su cafetería, el empaque que
 * necesita—, y una ficha con cara recibe más ofertas que una de solo texto.
 */
function req_imagenes_validas($raw): array {
  if (!is_array($raw)) return [];
  $out = [];
  foreach ($raw as $url) {
    if (!is_string($url)) continue;
    $url = trim($url);
    if (!preg_match('#^/uploads/user-content/[A-Za-z0-9._-]+\.jpg$#', $url)) continue;
    if (!in_array($url, $out, true)) $out[] = $url;
    if (count($out) >= 4) break;
  }
  return $out;
}

function req_publico(array $r, ?array $u = null): array {
  $admin = $u ? req_es_admin($u) : !empty($_SESSION['admin']);
  $dueno = $u && req_owner_id($r) === (string)($u['id'] ?? '');
  $out = $r;
  unset($out['autor_email'], $out['autor_telefono']);
  if (!$u && !$admin) $out['contacto_restringido'] = true;
  if (empty($out['mostrarPrecio']) && !$admin && !$dueno) {
    unset($out['precioReferencia']);
  }
  return $out;
}

function req_validar_payload(array $in, array $u, ?array $actual = null): array {
  $cantidad = req_numero($in['cantidad'] ?? null, 'Cantidad', 1000000);
  if ($cantidad === null || $cantidad <= 0) fail('Indica cuánto café buscas.', 422);
  $puntaje = req_numero($in['puntajeMinimo'] ?? null, 'Puntaje mínimo', 100);
  $now = now_iso();

  return [
    'id'          => $actual['id'] ?? uid(),
    'titulo'      => req_texto($in['titulo'] ?? '', 'Título', 5, 120),
    'descripcion' => req_texto($in['descripcion'] ?? '', 'Descripción', 20, 3000),
    'tipo'        => req_enum($in['tipo'] ?? '', 'Tipo de café', REQ_TIPOS),
    'variedad'    => req_texto($in['variedad'] ?? '', 'Variedad', 0, 80, true),
    'proceso'     => req_enum($in['proceso'] ?? 'cualquiera', 'Proceso', REQ_PROCESOS),
    'provincia'   => req_texto($in['provincia'] ?? '', 'Provincia de origen', 0, 80, true),
    'cantidad'    => $cantidad,
    'unidad'      => req_enum($in['unidad'] ?? '', 'Unidad', REQ_UNIDADES),
    'frecuencia'  => req_enum($in['frecuencia'] ?? 'unica', 'Frecuencia', REQ_FRECUENCIAS),
    'precioReferencia' => req_numero($in['precioReferencia'] ?? null, 'Precio de referencia', 100000),
    'mostrarPrecio'    => req_bool($in['mostrarPrecio'] ?? false),
    'puntajeMinimo'    => $puntaje,
    'certificacion'    => req_texto($in['certificacion'] ?? '', 'Certificación', 0, 120, true),
    'cierra'      => req_fecha_cierre($in['cierra'] ?? ''),
    'contactoPreferido' => req_enum($in['contactoPreferido'] ?? '', 'Contacto preferido', REQ_CONTACTOS),
    'estado'      => req_enum($in['estado'] ?? ($actual['estado'] ?? 'abierta'), 'Estado', REQ_ESTADOS),
    'empresa'     => req_texto($in['empresa'] ?? '', 'Empresa', 0, 120, true),
    'imagenes'    => array_key_exists('imagenes', $in)
                       ? req_imagenes_validas($in['imagenes'])
                       : ($actual['imagenes'] ?? []),
    'autor_id'    => $actual['autor_id'] ?? (string)($u['id'] ?? ''),
    'autor'       => $actual['autor'] ?? (string)($u['nombre'] ?? ''),
    'autor_rol'   => $actual['autor_rol'] ?? (string)($u['rol'] ?? ''),
    'autor_roles' => $actual['autor_roles'] ?? miembro_roles($u),
    'autor_email' => $actual['autor_email'] ?? (string)($u['email'] ?? ''),
    'autor_telefono' => $actual['autor_telefono'] ?? redcafe_whatsapp_display($u['whatsapp'] ?? $u['telefono'] ?? ''),
    'verificado'  => $actual['verificado'] ?? false,
    'created_at'  => $actual['created_at'] ?? $now,
    'updated_at'  => $now,
  ];
}

/* ── Acciones ──────────────────────────────────────────────────────────── */

if ($action === 'list') {
  $reqs = load_json('requerimientos', []);
  $visibles = array_values(array_filter($reqs, function ($r) {
    return (string)($r['estado'] ?? '') === 'abierta' && !req_vencido($r);
  }));
  foreach (['tipo', 'proceso', 'provincia', 'frecuencia'] as $f) {
    $v = trim((string)($_GET[$f] ?? $in[$f] ?? ''));
    if ($v === '') continue;
    $visibles = array_values(array_filter($visibles, fn($r) => (string)($r[$f] ?? '') === $v));
  }
  usort($visibles, fn($a, $b) => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  $u = current_user();
  ok([
    'requerimientos' => array_map(fn($r) => req_publico($r, $u), $visibles),
    'sesion' => $u !== null || !empty($_SESSION['admin']),
  ]);
}

if ($action === 'get') {
  $id = trim((string)($_GET['id'] ?? $in['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $u = current_user();
  $r = req_por_id(load_json('requerimientos', []), $id);
  if (!$r) fail('Requerimiento no encontrado.', 404);
  if (((string)($r['estado'] ?? '') !== 'abierta' || req_vencido($r)) && (!$u || !req_autorizado($r, $u))) {
    fail('Requerimiento no encontrado.', 404);
  }
  $out = req_publico($r, $u);
  if ($u) $out['ya_oferte'] = req_ya_oferto(load_json('ofertas-requerimiento', []), $id, (string)($u['id'] ?? ''));
  ok(['requerimiento' => $out]);
}

if ($action === 'mios') {
  $u = req_usuario_actual_o_admin();
  $uid = (string)($u['id'] ?? '');
  $esAdmin = req_es_admin($u);
  if ($uid === '' && !$esAdmin) fail('Sesión inválida. Vuelve a iniciar sesión.', 401);
  $reqs = load_json('requerimientos', []);
  $ofertas = load_json('ofertas-requerimiento', []);
  $mios = array_values(array_filter($reqs, fn($r) => $esAdmin || req_owner_id($r) === $uid));
  foreach ($mios as &$r) {
    $r['ofertas_count'] = req_contar_ofertas($ofertas, (string)($r['id'] ?? ''));
  }
  unset($r);
  usort($mios, fn($a, $b) => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  ok(['requerimientos' => $mios, 'puede_publicar' => req_puede_publicar($u), 'admin' => $esAdmin]);
}

if ($action === 'publish') {
  // Evita ráfagas de peticiones repetidas que ensucien el tablero.
  if (!check_rate_limit('requerimiento_publicar', 20, 3600)) {
    fail('Demasiados requerimientos seguidos. Vuelve a intentarlo en una hora.', 429);
  }
  $u = req_usuario_actual_o_admin();
  if (!req_puede_publicar($u)) fail('Tu perfil no publica requerimientos de café.', 403);
  $req = req_validar_payload($in, $u);
  mutate_json('requerimientos', [], function (array $lista) use ($req) {
    $lista[] = $req;
    return $lista;
  });
  registrar_actividad('requerimiento-publicado', [
    'actor_id' => (string)($u['id'] ?? ''),
    'actor' => (string)($u['nombre'] ?? ''),
    'rol' => (string)($u['rol'] ?? ''),
    'objeto_tipo' => 'requerimiento',
    'objeto_id' => (string)$req['id'],
    'detalle' => (string)$req['titulo'],
    'ref' => (string)$req['provincia'],
  ]);
  publicar_aviso_comunidad('requerimiento', $req);
  notificar_admins('servicio', 'Nuevo requerimiento de café: ' . (string)$req['titulo'],
    (string)$req['autor'] . ' · ' . (string)$req['cantidad'] . ' ' . (string)$req['unidad'], '/marketplace/');
  ok(['requerimiento' => req_publico($req, $u)]);
}

if ($action === 'update') {
  $u = req_usuario_actual_o_admin();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $actualizado = null;
  mutate_json('requerimientos', [], function (array $lista) use ($id, $in, $u, &$actualizado) {
    foreach ($lista as &$r) {
      if ((string)($r['id'] ?? '') !== $id) continue;
      if (!req_autorizado($r, $u)) fail('No autorizado.', 403);
      $r = req_validar_payload($in, $u, $r);
      $actualizado = $r;
      break;
    }
    unset($r);
    return $lista;
  });
  if (!$actualizado) fail('Requerimiento no encontrado.', 404);
  ok(['requerimiento' => $actualizado]);
}

if ($action === 'cerrar') {
  $u = req_usuario_actual_o_admin();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $hecho = false;
  mutate_json('requerimientos', [], function (array $lista) use ($id, $u, &$hecho) {
    foreach ($lista as &$r) {
      if ((string)($r['id'] ?? '') !== $id) continue;
      if (!req_autorizado($r, $u)) fail('No autorizado.', 403);
      $r['estado'] = 'cerrada';
      $r['updated_at'] = now_iso();
      $hecho = true;
      break;
    }
    unset($r);
    return $lista;
  });
  if (!$hecho) fail('Requerimiento no encontrado.', 404);
  ok(['cerrado' => true]);
}

if ($action === 'delete') {
  $u = req_usuario_actual_o_admin();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $hecho = false;
  mutate_json('requerimientos', [], function (array $lista) use ($id, $u, &$hecho) {
    $out = [];
    foreach ($lista as $r) {
      if ((string)($r['id'] ?? '') === $id) {
        if (!req_autorizado($r, $u)) fail('No autorizado.', 403);
        $hecho = true;
        continue;
      }
      $out[] = $r;
    }
    return $out;
  });
  if (!$hecho) fail('Requerimiento no encontrado.', 404);
  // Las ofertas de un requerimiento borrado dejan de tener sentido, y dejarlas
  // sueltas convierte el panel del oferente en una lista de fantasmas.
  mutate_json('ofertas-requerimiento', [], function (array $lista) use ($id) {
    return array_values(array_filter($lista, fn($o) => (string)($o['requerimiento_id'] ?? '') !== $id));
  });
  ok(['borrado' => true]);
}

/* ── Ofertas: la respuesta del que vende ───────────────────────────────── */
/* Un requerimiento que nadie puede contestar es un tablón de anuncios sin
 * teléfono. Aquí NO se restringe por perfil: quien tiene café que ofrecer
 * puede ser un productor, una asociación, un exportador o un pilador que
 * intermedia. Lo único que se impide es ofrecerse a uno mismo. */

if ($action === 'ofertar') {
  if (!check_rate_limit('requerimiento_ofertar', 40, 3600)) {
    fail('Demasiadas ofertas seguidas. Vuelve a intentarlo en una hora.', 429);
  }
  $u = require_user();
  $id = trim((string)($in['id'] ?? $in['requerimiento_id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);

  $req = req_por_id(load_json('requerimientos', []), $id);
  if (!$req) fail('Requerimiento no encontrado.', 404);
  if ((string)($req['estado'] ?? '') !== 'abierta' || req_vencido($req)) fail('Este requerimiento ya no admite ofertas.', 409);
  if (req_owner_id($req) === (string)($u['id'] ?? '')) fail('No puedes ofertar a tu propio requerimiento.', 422);

  $ofertas = load_json('ofertas-requerimiento', []);
  if (req_ya_oferto($ofertas, $id, (string)($u['id'] ?? ''))) fail('Ya enviaste una oferta a este requerimiento.', 409);

  $oferta = [
    'id' => uid(),
    'requerimiento_id' => $id,
    'mensaje' => req_texto($in['mensaje'] ?? '', 'Mensaje', 20, 1500),
    'lote_id' => req_texto($in['lote_id'] ?? '', 'Lote', 0, 40, true),
    'precio' => req_numero($in['precio'] ?? null, 'Precio ofrecido', 100000),
    'cantidad' => req_numero($in['cantidad'] ?? null, 'Cantidad ofrecida', 1000000),
    'estado' => 'recibida',
    'oferente_id' => (string)($u['id'] ?? ''),
    'oferente' => (string)($u['nombre'] ?? ''),
    'oferente_rol' => (string)($u['rol'] ?? ''),
    'oferente_provincia' => (string)($u['provincia'] ?? ''),
    'oferente_email' => (string)($u['email'] ?? ''),
    'oferente_telefono' => redcafe_whatsapp_display($u['whatsapp'] ?? $u['telefono'] ?? ''),
    'created_at' => now_iso(),
  ];
  mutate_json('ofertas-requerimiento', [], function (array $lista) use ($oferta) {
    $lista[] = $oferta;
    return $lista;
  });
  notificar(req_owner_id($req), 'pedido',
    'Nueva oferta para «' . (string)$req['titulo'] . '»',
    (string)$oferta['oferente'] . ' respondió a tu requerimiento de café.', '/panel/');
  ok(['oferta' => $oferta]);
}

if ($action === 'ofertas') {
  $u = req_usuario_actual_o_admin();
  $id = trim((string)($_GET['id'] ?? $in['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $req = req_por_id(load_json('requerimientos', []), $id);
  if (!$req) fail('Requerimiento no encontrado.', 404);
  if (!req_autorizado($req, $u)) fail('No autorizado.', 403);
  $ofertas = array_values(array_filter(load_json('ofertas-requerimiento', []),
    fn($o) => (string)($o['requerimiento_id'] ?? '') === $id));
  usort($ofertas, fn($a, $b) => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  ok(['ofertas' => $ofertas]);
}

if ($action === 'mis_ofertas') {
  $u = require_user();
  $reqs = load_json('requerimientos', []);
  $mias = array_values(array_filter(load_json('ofertas-requerimiento', []),
    fn($o) => (string)($o['oferente_id'] ?? '') === (string)($u['id'] ?? '')));
  foreach ($mias as &$o) {
    $r = req_por_id($reqs, (string)($o['requerimiento_id'] ?? ''));
    // Se entrega el requerimiento ya recortado: el oferente no tiene por qué
    // recibir el correo ni el teléfono del comprador con la oferta.
    $o['requerimiento'] = $r ? req_publico($r, $u) : null;
  }
  unset($o);
  usort($mias, fn($a, $b) => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  ok(['ofertas' => $mias]);
}

if ($action === 'resolver') {
  $u = req_usuario_actual_o_admin();
  $id = trim((string)($in['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $estado = req_enum($in['estado'] ?? '', 'Estado', REQ_OFERTA_ESTADOS);
  $reqs = load_json('requerimientos', []);
  $hecho = false;
  mutate_json('ofertas-requerimiento', [], function (array $lista) use ($id, $estado, $u, $reqs, &$hecho) {
    foreach ($lista as &$o) {
      if ((string)($o['id'] ?? '') !== $id) continue;
      $req = req_por_id($reqs, (string)($o['requerimiento_id'] ?? ''));
      if (!$req || !req_autorizado($req, $u)) fail('No autorizado.', 403);
      $o['estado'] = $estado;
      $o['updated_at'] = now_iso();
      $hecho = true;
      break;
    }
    unset($o);
    return $lista;
  });
  if (!$hecho) fail('Oferta no encontrada.', 404);
  ok(['actualizado' => true]);
}

fail('Acción no válida.', 400);
