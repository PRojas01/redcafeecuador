<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';
require_once __DIR__ . '/_comunidad-avisos.php';

$action = $_GET['action'] ?? '';
$in = input();

const EMPLEO_CATEGORIAS = [
  'barismo', 'produccion-agricola', 'beneficio-pilado', 'tueste',
  'calidad-catacion', 'ventas', 'logistica-transporte', 'administracion',
  'tecnico-agronomo', 'otro',
];
const EMPLEO_MODALIDADES = ['presencial', 'hibrido', 'remoto'];
const EMPLEO_JORNADAS = ['tiempo-completo', 'medio-tiempo', 'por-horas', 'temporal', 'por-obra'];
const EMPLEO_PERIODOS = ['hora', 'dia', 'mes', 'obra'];
const EMPLEO_EXPERIENCIAS = ['sin-experiencia', '1-2-anios', '3-5-anios', 'mas-5-anios'];
const EMPLEO_CONTACTOS = ['plataforma', 'whatsapp', 'correo'];
const EMPLEO_ESTADOS = ['abierta', 'pausada', 'cerrada'];
const POSTULACION_ESTADOS = ['recibida', 'en-revision', 'preseleccionado', 'descartada', 'contratado'];

// Pueden contratar todos los perfiles de negocio de la Red. Se excluye
// "amante" porque representa al aficionado al café, no a un negocio empleador.
const PERFILES_QUE_CONTRATAN = [
  'productor', 'vendedor', 'comprador', 'bar', 'barista', 'certificador',
  'transportista', 'pilador', 'exportador', 'proveedor', 'asesor',
];

function empleo_usuario_actual_o_admin(): array {
  $u = current_user();
  if ($u) return $u;
  if (!empty($_SESSION['admin'])) {
    return ['id' => 'admin', 'nombre' => 'Administración', 'rol' => 'admin', 'roles' => ['admin']];
  }
  fail('No autenticado.', 401);
}

function empleo_es_admin(?array $u = null): bool {
  if (!empty($_SESSION['admin'])) return true;
  return $u ? miembro_tiene_rol($u, 'admin') : false;
}

function empleo_puede_contratar(array $u): bool {
  if (empleo_es_admin($u)) return true;
  foreach (miembro_roles($u) as $rol) {
    if (in_array($rol, PERFILES_QUE_CONTRATAN, true)) return true;
  }
  return false;
}

function empleo_texto($valor, string $campo, int $min, int $max, bool $opcional = false): string {
  $valor = trim((string)$valor);
  if ($valor === '' && $opcional) return '';
  $len = mb_strlen($valor);
  if ($len < $min || $len > $max) {
    fail($campo . ' debe tener entre ' . $min . ' y ' . $max . ' caracteres.', 422);
  }
  return $valor;
}

function empleo_enum($valor, string $campo, array $permitidos): string {
  $valor = trim((string)$valor);
  if (!in_array($valor, $permitidos, true)) fail($campo . ' inválido.', 422);
  return $valor;
}

function empleo_numero($valor, string $campo): ?float {
  if ($valor === null || $valor === '') return null;
  if (!is_numeric($valor)) fail($campo . ' debe ser numérico.', 422);
  $n = (float)$valor;
  if ($n < 0) fail($campo . ' no puede ser negativo.', 422);
  return round($n, 2);
}

function empleo_bool($valor): bool {
  if (is_bool($valor)) return $valor;
  if (is_numeric($valor)) return (int)$valor === 1;
  $valor = strtolower(trim((string)$valor));
  return in_array($valor, ['1', 'true', 'on', 'si', 'sí'], true);
}

function empleo_fecha_cierre($valor): string {
  $valor = trim((string)$valor);
  // Sin fecha, la oferta se cierra sola a los 60 días. Una bolsa de empleo se
  // vuelve inútil llena de vacantes viejas, pero obligar a poner la fecha para
  // publicar es una barrera de más: se pone un plazo razonable por omisión y
  // el dueño puede cambiarlo o cerrar la oferta cuando quiera.
  if ($valor === '') {
    return (new DateTimeImmutable(today(), new DateTimeZone('UTC')))
      ->modify('+60 days')->format('Y-m-d');
  }
  $dt = DateTime::createFromFormat('!Y-m-d', $valor, new DateTimeZone('UTC'));
  if (!$dt || $dt->format('Y-m-d') !== $valor) fail('Fecha de cierre inválida.', 422);
  $hoy = new DateTimeImmutable(today(), new DateTimeZone('UTC'));
  $max = $hoy->modify('+1 year');
  $cierre = new DateTimeImmutable($valor, new DateTimeZone('UTC'));
  if ($cierre < $hoy) fail('La fecha de cierre no puede estar vencida.', 422);
  if ($cierre > $max) fail('La fecha de cierre no puede superar un año.', 422);
  return $valor;
}

function empleo_vencida(array $e): bool {
  $cierra = (string)($e['cierra'] ?? '');
  return $cierra !== '' && $cierra < today();
}

function empleo_owner_id(array $e): string {
  return (string)($e['autor_id'] ?? '');
}

function empleo_autorizado(array $e, array $u): bool {
  return empleo_es_admin($u) || empleo_owner_id($e) === (string)($u['id'] ?? '');
}

function empleo_por_id(array $empleos, string $id): ?array {
  foreach ($empleos as $e) {
    if ((string)($e['id'] ?? '') === $id) return $e;
  }
  return null;
}

function empleo_postulacion_por_id(array $postulaciones, string $id): ?array {
  foreach ($postulaciones as $p) {
    if ((string)($p['id'] ?? '') === $id) return $p;
  }
  return null;
}

function empleo_ya_postulo(array $postulaciones, string $empleoId, string $uid): bool {
  foreach ($postulaciones as $p) {
    if ((string)($p['empleo_id'] ?? '') === $empleoId && (string)($p['postulante_id'] ?? '') === $uid) return true;
  }
  return false;
}

function empleo_contar_postulaciones(array $postulaciones, string $empleoId): int {
  $n = 0;
  foreach ($postulaciones as $p) {
    if ((string)($p['empleo_id'] ?? '') === $empleoId) $n++;
  }
  return $n;
}

function empleo_publico(array $e, ?array $u = null): array {
  $admin = $u ? empleo_es_admin($u) : !empty($_SESSION['admin']);
  $dueno = $u && empleo_owner_id($e) === (string)($u['id'] ?? '');
  $out = $e;
  unset($out['autor_email'], $out['autor_telefono'], $out['autor_whatsapp']);
  if (empty($out['mostrarSalario']) && !$admin && !$dueno) {
    unset($out['salarioDesde'], $out['salarioHasta']);
  }
  return $out;
}

function empleo_validar_payload(array $in, array $u, ?array $actual = null): array {
  $desde = empleo_numero($in['salarioDesde'] ?? null, 'Salario desde');
  $hasta = empleo_numero($in['salarioHasta'] ?? null, 'Salario hasta');
  if ($desde !== null && $hasta !== null && $desde > $hasta) {
    fail('El salario desde no puede superar al salario hasta.', 422);
  }
  $vacantes = (int)($in['vacantes'] ?? 0);
  if ($vacantes < 1 || $vacantes > 99) fail('Vacantes debe estar entre 1 y 99.', 422);

  $estado = empleo_enum($in['estado'] ?? ($actual['estado'] ?? 'abierta'), 'Estado', EMPLEO_ESTADOS);
  $now = now_iso();
  return [
    'id' => $actual['id'] ?? uid(),
    'titulo' => empleo_texto($in['titulo'] ?? '', 'Título', 5, 120),
    'descripcion' => empleo_texto($in['descripcion'] ?? '', 'Descripción', 20, 3000),
    'categoria' => empleo_enum($in['categoria'] ?? '', 'Categoría', EMPLEO_CATEGORIAS),
    'modalidad' => empleo_enum($in['modalidad'] ?? '', 'Modalidad', EMPLEO_MODALIDADES),
    'jornada' => empleo_enum($in['jornada'] ?? '', 'Jornada', EMPLEO_JORNADAS),
    'provincia' => empleo_texto($in['provincia'] ?? '', 'Provincia', 2, 80),
    'canton' => empleo_texto($in['canton'] ?? '', 'Cantón', 0, 80, true),
    'salarioDesde' => $desde,
    'salarioHasta' => $hasta,
    'salarioPeriodo' => empleo_enum($in['salarioPeriodo'] ?? '', 'Periodo de salario', EMPLEO_PERIODOS),
    'mostrarSalario' => empleo_bool($in['mostrarSalario'] ?? false),
    'experiencia' => empleo_enum($in['experiencia'] ?? '', 'Experiencia', EMPLEO_EXPERIENCIAS),
    'vacantes' => $vacantes,
    'cierra' => empleo_fecha_cierre($in['cierra'] ?? ''),
    'contactoPreferido' => empleo_enum($in['contactoPreferido'] ?? '', 'Contacto preferido', EMPLEO_CONTACTOS),
    'estado' => $estado,
    'empresa' => empleo_texto($in['empresa'] ?? '', 'Empresa', 0, 120, true),
    'autor_id' => $actual['autor_id'] ?? (string)($u['id'] ?? ''),
    'autor' => $actual['autor'] ?? (string)($u['nombre'] ?? ''),
    'autor_rol' => $actual['autor_rol'] ?? (string)($u['rol'] ?? ''),
    'autor_roles' => $actual['autor_roles'] ?? miembro_roles($u),
    'autor_email' => $actual['autor_email'] ?? (string)($u['email'] ?? ''),
    'autor_telefono' => $actual['autor_telefono'] ?? redcafe_whatsapp_display($u['whatsapp'] ?? $u['telefono'] ?? ''),
    'created_at' => $actual['created_at'] ?? $now,
    'updated_at' => $now,
  ];
}

if ($action === 'list') {
  $empleos = load_json('empleos', []);
  $visibles = array_values(array_filter($empleos, function ($e) {
    return (string)($e['estado'] ?? '') === 'abierta' && !empleo_vencida($e);
  }));
  foreach (['categoria', 'provincia', 'modalidad', 'jornada'] as $f) {
    $v = trim((string)($_GET[$f] ?? $in[$f] ?? ''));
    if ($v === '') continue;
    $visibles = array_values(array_filter($visibles, fn($e) => (string)($e[$f] ?? '') === $v));
  }
  usort($visibles, fn($a, $b) => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  ok(['empleos' => array_map(fn($e) => empleo_publico($e), $visibles)]);
}

if ($action === 'get') {
  $id = trim((string)($_GET['id'] ?? $in['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $u = current_user();
  $e = empleo_por_id(load_json('empleos', []), $id);
  if (!$e) fail('Oferta no encontrada.', 404);
  if (((string)($e['estado'] ?? '') !== 'abierta' || empleo_vencida($e)) && (!$u || !empleo_autorizado($e, $u))) fail('Oferta no encontrada.', 404);
  $out = empleo_publico($e, $u);
  if ($u) {
    $out['ya_postule'] = empleo_ya_postulo(load_json('postulaciones', []), $id, (string)($u['id'] ?? ''));
  }
  ok(['empleo' => $out]);
}

if ($action === 'mias') {
  $u = empleo_usuario_actual_o_admin();
  $empleos = load_json('empleos', []);
  $postulaciones = load_json('postulaciones', []);
  $mias = array_values(array_filter($empleos, function ($e) use ($u) {
    return empleo_es_admin($u) || empleo_owner_id($e) === (string)($u['id'] ?? '');
  }));
  foreach ($mias as &$e) {
    $e['postulaciones_count'] = empleo_contar_postulaciones($postulaciones, (string)($e['id'] ?? ''));
  }
  unset($e);
  usort($mias, fn($a, $b) => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  ok(['empleos' => $mias, 'puede_contratar' => empleo_puede_contratar($u)]);
}

if ($action === 'publish') {
  // Evita ofertas repetidas que ensucien la bolsa de empleo.
  if (!check_rate_limit('empleo_publicar', 20, 3600)) {
    fail('Demasiadas ofertas publicadas seguidas. Vuelve a intentarlo en una hora.', 429);
  }

  $u = empleo_usuario_actual_o_admin();
  if (!empleo_puede_contratar($u)) fail('Este perfil puede postular, pero no publicar ofertas.', 403);
  $empleo = empleo_validar_payload($in, $u);
  mutate_json('empleos', [], function (array $empleos) use ($empleo) {
    $empleos[] = $empleo;
    return $empleos;
  });
  registrar_actividad('empleo-publicado', [
    'actor_id' => (string)($u['id'] ?? ''),
    'actor' => (string)($u['nombre'] ?? ''),
    'rol' => (string)($u['rol'] ?? ''),
    'objeto_tipo' => 'empleo',
    'objeto_id' => (string)$empleo['id'],
    'detalle' => (string)$empleo['titulo'],
    'ref' => (string)$empleo['provincia'],
  ]);
  publicar_aviso_comunidad('empleo', $empleo);
  notificar_admins('servicio', 'Nueva oferta de empleo: ' . (string)$empleo['titulo'],
    (string)$empleo['autor'] . ' · ' . (string)$empleo['provincia'], '/panel/');
  ok(['empleo' => empleo_publico($empleo, $u)]);
}

if ($action === 'update') {
  $u = empleo_usuario_actual_o_admin();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $actualizado = null;
  mutate_json('empleos', [], function (array $empleos) use ($id, $in, $u, &$actualizado) {
    foreach ($empleos as &$e) {
      if ((string)($e['id'] ?? '') !== $id) continue;
      if (!empleo_autorizado($e, $u)) fail('No autorizado.', 403);
      $e = empleo_validar_payload($in, $u, $e);
      $actualizado = $e;
      break;
    }
    unset($e);
    return $empleos;
  });
  if (!$actualizado) fail('Oferta no encontrada.', 404);
  ok(['empleo' => $actualizado]);
}

if ($action === 'cerrar') {
  $u = empleo_usuario_actual_o_admin();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $actualizado = null;
  mutate_json('empleos', [], function (array $empleos) use ($id, $u, &$actualizado) {
    foreach ($empleos as &$e) {
      if ((string)($e['id'] ?? '') !== $id) continue;
      if (!empleo_autorizado($e, $u)) fail('No autorizado.', 403);
      $e['estado'] = 'cerrada';
      $e['updated_at'] = now_iso();
      $actualizado = $e;
      break;
    }
    unset($e);
    return $empleos;
  });
  if (!$actualizado) fail('Oferta no encontrada.', 404);
  ok(['empleo' => $actualizado]);
}

if ($action === 'delete') {
  $u = empleo_usuario_actual_o_admin();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $actualizado = null;
  mutate_json('empleos', [], function (array $empleos) use ($id, $u, &$actualizado) {
    foreach ($empleos as &$e) {
      if ((string)($e['id'] ?? '') !== $id) continue;
      if (!empleo_autorizado($e, $u)) fail('No autorizado.', 403);
      // Conservamos la oferta cerrada en vez de borrarla para que las
      // postulaciones mantengan contexto y trazabilidad para ambas partes.
      $e['estado'] = 'cerrada';
      $e['eliminada'] = true;
      $e['updated_at'] = now_iso();
      $actualizado = $e;
      break;
    }
    unset($e);
    return $empleos;
  });
  if (!$actualizado) fail('Oferta no encontrada.', 404);
  mutate_json('postulaciones', [], function (array $postulaciones) use ($id) {
    foreach ($postulaciones as &$p) {
      if ((string)($p['empleo_id'] ?? '') === $id) $p['oferta_eliminada'] = true;
    }
    unset($p);
    return $postulaciones;
  });
  ok(['empleo' => $actualizado]);
}

if ($action === 'postular') {
  $u = require_user();

  // El cupo se cuenta por dirección IP, así que se comprueba solo con sesión:
  // si no, alguien de fuera agotaría el de quien comparte salida a internet.
  // Evita postulaciones masivas sin impedir búsquedas activas de trabajo.
  if (!check_rate_limit('empleo_postular', 30, 3600)) {
    fail('Demasiadas postulaciones seguidas. Vuelve a intentarlo en una hora.', 429);
  }

  $id = trim((string)($in['id'] ?? $in['empleo_id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $mensaje = empleo_texto($in['mensaje'] ?? '', 'Mensaje', 20, 1500);
  $telefono = empleo_texto($in['telefono'] ?? '', 'Teléfono', 0, 40, true);
  $empleo = empleo_por_id(load_json('empleos', []), $id);
  if (!$empleo) fail('Oferta no encontrada.', 404);
  if (empleo_owner_id($empleo) === (string)($u['id'] ?? '')) fail('No puedes postular a tu propia oferta.', 422);
  if ((string)($empleo['estado'] ?? '') !== 'abierta' || empleo_vencida($empleo)) fail('La oferta ya no recibe postulaciones.', 409);
  $postulaciones = load_json('postulaciones', []);
  if (empleo_ya_postulo($postulaciones, $id, (string)($u['id'] ?? ''))) fail('Ya postulaste a esta oferta.', 409);
  $p = [
    'id' => uid(),
    'empleo_id' => $id,
    'postulante_id' => (string)($u['id'] ?? ''),
    'postulante' => (string)($u['nombre'] ?? ''),
    'postulante_rol' => (string)($u['rol'] ?? ''),
    'postulante_roles' => miembro_roles($u),
    'postulante_provincia' => (string)($u['provincia'] ?? ''),
    'postulante_email' => (string)($u['email'] ?? ''),
    'postulante_telefono' => redcafe_whatsapp_display($telefono !== '' ? $telefono : ($u['whatsapp'] ?? $u['telefono'] ?? '')),
    'mensaje' => $mensaje,
    'estado' => 'recibida',
    'created_at' => now_iso(),
    'updated_at' => now_iso(),
  ];
  $postulaciones[] = $p;
  save_json('postulaciones', $postulaciones);
  notificar((string)($empleo['autor_id'] ?? ''), 'servicio', 'Nueva postulación: ' . (string)($empleo['titulo'] ?? ''),
    (string)$p['postulante'] . ' postuló a tu oferta.', '/panel/');
  registrar_actividad('empleo-postulacion', [
    'actor_id' => (string)$p['postulante_id'],
    'actor' => (string)$p['postulante'],
    'rol' => (string)$p['postulante_rol'],
    'objeto_tipo' => 'empleo',
    'objeto_id' => $id,
    'detalle' => (string)($empleo['titulo'] ?? ''),
    'contraparte' => (string)($empleo['autor'] ?? ''),
  ]);
  $out = $p;
  unset($out['postulante_email'], $out['postulante_telefono']);
  ok(['postulacion' => $out]);
}

if ($action === 'postulaciones') {
  $u = empleo_usuario_actual_o_admin();
  $id = trim((string)($in['id'] ?? $in['empleo_id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $empleo = empleo_por_id(load_json('empleos', []), $id);
  if (!$empleo) fail('Oferta no encontrada.', 404);
  if (!empleo_autorizado($empleo, $u)) fail('No autorizado.', 403);
  $postulaciones = array_values(array_filter(load_json('postulaciones', []), fn($p) => (string)($p['empleo_id'] ?? '') === $id));
  if (empleo_owner_id($empleo) !== (string)($u['id'] ?? '')) {
    foreach ($postulaciones as &$p) {
      unset($p['postulante_email'], $p['postulante_telefono']);
    }
    unset($p);
  }
  usort($postulaciones, fn($a, $b) => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  ok(['postulaciones' => $postulaciones, 'empleo' => ['id' => $id, 'titulo' => (string)($empleo['titulo'] ?? '')]]);
}

if ($action === 'mis_postulaciones') {
  $u = require_user();
  $uid = (string)($u['id'] ?? '');
  $empleos = load_json('empleos', []);
  $mias = array_values(array_filter(load_json('postulaciones', []), fn($p) => (string)($p['postulante_id'] ?? '') === $uid));
  foreach ($mias as &$p) {
    $e = empleo_por_id($empleos, (string)($p['empleo_id'] ?? ''));
    $p['empleo'] = $e ? empleo_publico($e, $u) : null;
    unset($p['postulante_email'], $p['postulante_telefono']);
  }
  unset($p);
  usort($mias, fn($a, $b) => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  ok(['postulaciones' => $mias]);
}

if ($action === 'resolver') {
  $u = empleo_usuario_actual_o_admin();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  $estado = empleo_enum($in['estado'] ?? '', 'Estado', POSTULACION_ESTADOS);
  if ($id === '') fail('ID requerido.', 422);
  $postulacion = empleo_postulacion_por_id(load_json('postulaciones', []), $id);
  if (!$postulacion) fail('Postulación no encontrada.', 404);
  $empleo = empleo_por_id(load_json('empleos', []), (string)($postulacion['empleo_id'] ?? ''));
  if (!$empleo) fail('Oferta no encontrada.', 404);
  if (!empleo_autorizado($empleo, $u)) fail('No autorizado.', 403);
  $actualizada = null;
  mutate_json('postulaciones', [], function (array $postulaciones) use ($id, $estado, &$actualizada) {
    foreach ($postulaciones as &$p) {
      if ((string)($p['id'] ?? '') !== $id) continue;
      $p['estado'] = $estado;
      $p['updated_at'] = now_iso();
      $actualizada = $p;
      break;
    }
    unset($p);
    return $postulaciones;
  });
  notificar((string)($actualizada['postulante_id'] ?? ''), 'servicio',
    'Tu postulación cambió de estado',
    'Estado: ' . $estado . ' · ' . (string)($empleo['titulo'] ?? ''), '/panel/');
  ok(['postulacion' => $actualizada]);
}

fail('Acción no válida.', 400);
