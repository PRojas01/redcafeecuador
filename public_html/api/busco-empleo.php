<?php
declare(strict_types=1);

/* Red Café Ecuador — «Busco empleo»
 * ---------------------------------------------------------------------------
 * La otra cara de la bolsa de empleo. Hasta ahora solo publicaba quien
 * CONTRATA, y con una sola oferta en toda la Red la sección parecía muerta.
 * Quien busca trabajo es mucha más gente: entre los 32 miembros hay 19
 * productores, 7 asesores, 2 baristas y 1 pilador.
 *
 * Decisión del propietario (10 sep 2026): **abierto a todos**. Restringirlo a
 * baristas habría dejado un tablero con dos personas capaces de publicar, que
 * no es una funcionalidad sino una página vacía.
 *
 * Privacidad: una publicación de «busco empleo» es una persona diciendo que
 * necesita trabajo. Su nombre y su perfil son públicos —sin eso el anuncio no
 * sirve—, pero ni el correo ni el teléfono salen sin sesión, igual que en las
 * fichas de lote desde el 8 de septiembre.
 */

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

$action = $_GET['action'] ?? '';
$in = input();

/* Aquí SOLO se busca empleo. Quien quiera ofrecer asesoría o servicios por
   encargo ya tiene su sitio: la pestaña «Servicios» del marketplace, donde
   cualquier miembro publica con `marketplace-servicios.php?action=publish`.
   Abrir aquí un segundo canal para lo mismo repartiría la oferta en dos
   tableros y ninguno de los dos se vería lleno.
   (Que un asesor haya publicado su consultoría como si fuera una vacante no
   significa que falte un sitio: significa que no encontró el que ya existe.) */

const BUSQUEDA_CATEGORIAS = [
  'barismo', 'produccion-agricola', 'beneficio-pilado', 'tueste',
  'calidad-catacion', 'ventas', 'logistica-transporte', 'administracion',
  'tecnico-agronomo', 'otro',
];
const BUSQUEDA_MODALIDADES = ['presencial', 'hibrido', 'remoto', 'cualquiera'];
const BUSQUEDA_JORNADAS = ['tiempo-completo', 'medio-tiempo', 'por-horas', 'temporal', 'por-obra', 'cualquiera'];
const BUSQUEDA_EXPERIENCIAS = ['sin-experiencia', '1-2-anios', '3-5-anios', 'mas-5-anios'];
const BUSQUEDA_DISPONIBILIDAD = ['inmediata', 'dos-semanas', 'un-mes', 'a-convenir'];
const BUSQUEDA_PERIODOS = ['hora', 'dia', 'mes', 'obra'];
const BUSQUEDA_CONTACTOS = ['plataforma', 'whatsapp', 'correo'];
const BUSQUEDA_ESTADOS = ['abierta', 'pausada', 'cerrada'];
const BUSQUEDA_INTERES_ESTADOS = ['recibido', 'en-conversacion', 'descartado', 'contratado'];

function busqueda_usuario_o_admin(): array {
  $u = current_user();
  if ($u) return $u;
  if (!empty($_SESSION['admin'])) {
    return ['id' => 'admin', 'nombre' => 'Administración', 'rol' => 'admin', 'roles' => ['admin']];
  }
  fail('No autenticado.', 401);
}

function busqueda_es_admin(?array $u = null): bool {
  if (!empty($_SESSION['admin'])) return true;
  return $u ? miembro_tiene_rol($u, 'admin') : false;
}

function busqueda_texto($valor, string $campo, int $min, int $max, bool $opcional = false): string {
  $valor = trim((string)$valor);
  if ($valor === '' && $opcional) return '';
  $len = mb_strlen($valor);
  if ($len < $min || $len > $max) fail($campo . ' debe tener entre ' . $min . ' y ' . $max . ' caracteres.', 422);
  return $valor;
}

function busqueda_enum($valor, string $campo, array $permitidos): string {
  $valor = trim((string)$valor);
  if (!in_array($valor, $permitidos, true)) fail($campo . ' inválido.', 422);
  return $valor;
}

function busqueda_numero($valor, string $campo, ?float $max = null): ?float {
  if ($valor === null || $valor === '') return null;
  if (!is_numeric($valor)) fail($campo . ' debe ser numérico.', 422);
  $n = (float)$valor;
  if ($n < 0) fail($campo . ' no puede ser negativo.', 422);
  if ($max !== null && $n > $max) fail($campo . ' es demasiado alto.', 422);
  return round($n, 2);
}

function busqueda_bool($valor): bool {
  if (is_bool($valor)) return $valor;
  if (is_numeric($valor)) return (int)$valor === 1;
  return in_array(strtolower(trim((string)$valor)), ['1', 'true', 'on', 'si', 'sí'], true);
}

function busqueda_fecha_cierre($valor): string {
  $valor = trim((string)$valor);
  if ($valor === '') {
    return (new DateTimeImmutable(today(), new DateTimeZone('UTC')))->modify('+60 days')->format('Y-m-d');
  }
  $dt = DateTime::createFromFormat('!Y-m-d', $valor, new DateTimeZone('UTC'));
  if (!$dt || $dt->format('Y-m-d') !== $valor) fail('Fecha inválida.', 422);
  $hoy = new DateTimeImmutable(today(), new DateTimeZone('UTC'));
  $f = new DateTimeImmutable($valor, new DateTimeZone('UTC'));
  if ($f < $hoy) fail('La fecha no puede estar vencida.', 422);
  if ($f > $hoy->modify('+1 year')) fail('La fecha no puede superar un año.', 422);
  return $valor;
}

function busqueda_vencida(array $b): bool {
  $c = (string)($b['cierra'] ?? '');
  return $c !== '' && $c < today();
}

function busqueda_owner_id(array $b): string { return (string)($b['autor_id'] ?? ''); }

function busqueda_autorizado(array $b, array $u): bool {
  return busqueda_es_admin($u) || busqueda_owner_id($b) === (string)($u['id'] ?? '');
}

function busqueda_por_id(array $lista, string $id): ?array {
  foreach ($lista as $b) if ((string)($b['id'] ?? '') === $id) return $b;
  return null;
}

function busqueda_ya_contacto(array $intereses, string $bid, string $uid): bool {
  foreach ($intereses as $i) {
    if ((string)($i['busqueda_id'] ?? '') === $bid && (string)($i['empleador_id'] ?? '') === $uid) return true;
  }
  return false;
}

function busqueda_contar_intereses(array $intereses, string $bid): int {
  $n = 0;
  foreach ($intereses as $i) if ((string)($i['busqueda_id'] ?? '') === $bid) $n++;
  return $n;
}

function busqueda_publica(array $b, ?array $u = null): array {
  $admin = $u ? busqueda_es_admin($u) : !empty($_SESSION['admin']);
  $dueno = $u && busqueda_owner_id($b) === (string)($u['id'] ?? '');
  $out = $b;
  unset($out['autor_email'], $out['autor_telefono']);
  if (!$u && !$admin) $out['contacto_restringido'] = true;
  if (empty($out['mostrarPretension']) && !$admin && !$dueno) {
    unset($out['pretensionDesde'], $out['pretensionHasta']);
  }
  return $out;
}

function busqueda_validar(array $in, array $u, ?array $actual = null): array {
  $desde = busqueda_numero($in['pretensionDesde'] ?? null, 'Pretensión desde', 1000000);
  $hasta = busqueda_numero($in['pretensionHasta'] ?? null, 'Pretensión hasta', 1000000);
  if ($desde !== null && $hasta !== null && $desde > $hasta) {
    fail('La pretensión mínima no puede superar a la máxima.', 422);
  }
  $now = now_iso();
  return [
    'id' => $actual['id'] ?? uid(),
    'titulo' => busqueda_texto($in['titulo'] ?? '', 'Título', 5, 120),
    'descripcion' => busqueda_texto($in['descripcion'] ?? '', 'Descripción', 20, 3000),
    'categoria' => busqueda_enum($in['categoria'] ?? '', 'Área', BUSQUEDA_CATEGORIAS),
    'experiencia' => busqueda_enum($in['experiencia'] ?? '', 'Experiencia', BUSQUEDA_EXPERIENCIAS),
    'modalidad' => busqueda_enum($in['modalidad'] ?? 'cualquiera', 'Modalidad', BUSQUEDA_MODALIDADES),
    'jornada' => busqueda_enum($in['jornada'] ?? 'cualquiera', 'Jornada', BUSQUEDA_JORNADAS),
    'disponibilidad' => busqueda_enum($in['disponibilidad'] ?? 'a-convenir', 'Disponibilidad', BUSQUEDA_DISPONIBILIDAD),
    'provincia' => busqueda_texto($in['provincia'] ?? '', 'Provincia', 2, 80),
    'canton' => busqueda_texto($in['canton'] ?? '', 'Cantón', 0, 80, true),
    'pretensionDesde' => $desde,
    'pretensionHasta' => $hasta,
    'pretensionPeriodo' => busqueda_enum($in['pretensionPeriodo'] ?? 'mes', 'Periodo', BUSQUEDA_PERIODOS),
    'mostrarPretension' => busqueda_bool($in['mostrarPretension'] ?? false),
    'cierra' => busqueda_fecha_cierre($in['cierra'] ?? ''),
    'contactoPreferido' => busqueda_enum($in['contactoPreferido'] ?? '', 'Contacto preferido', BUSQUEDA_CONTACTOS),
    'estado' => busqueda_enum($in['estado'] ?? ($actual['estado'] ?? 'abierta'), 'Estado', BUSQUEDA_ESTADOS),
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

/* ── Acciones ──────────────────────────────────────────────────────────── */

if ($action === 'list') {
  $lista = load_json('busquedas-empleo', []);
  $visibles = array_values(array_filter($lista, function ($b) {
    return (string)($b['estado'] ?? '') === 'abierta' && !busqueda_vencida($b);
  }));
  foreach (['categoria', 'provincia', 'modalidad', 'jornada', 'experiencia'] as $f) {
    $v = trim((string)($_GET[$f] ?? $in[$f] ?? ''));
    if ($v === '') continue;
    $visibles = array_values(array_filter($visibles, fn($b) => (string)($b[$f] ?? '') === $v));
  }
  usort($visibles, fn($a, $b) => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  $u = current_user();
  ok([
    'busquedas' => array_map(fn($b) => busqueda_publica($b, $u), $visibles),
    'sesion' => $u !== null || !empty($_SESSION['admin']),
  ]);
}

if ($action === 'get') {
  $id = trim((string)($_GET['id'] ?? $in['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $u = current_user();
  $b = busqueda_por_id(load_json('busquedas-empleo', []), $id);
  if (!$b) fail('Publicación no encontrada.', 404);
  if (((string)($b['estado'] ?? '') !== 'abierta' || busqueda_vencida($b)) && (!$u || !busqueda_autorizado($b, $u))) {
    fail('Publicación no encontrada.', 404);
  }
  $out = busqueda_publica($b, $u);
  if ($u) $out['ya_contacte'] = busqueda_ya_contacto(load_json('intereses-empleo', []), $id, (string)($u['id'] ?? ''));
  ok(['busqueda' => $out]);
}

if ($action === 'mias') {
  $u = busqueda_usuario_o_admin();
  $lista = load_json('busquedas-empleo', []);
  $intereses = load_json('intereses-empleo', []);
  $mias = array_values(array_filter($lista, fn($b) => busqueda_es_admin($u) || busqueda_owner_id($b) === (string)($u['id'] ?? '')));
  foreach ($mias as &$b) {
    $b['intereses_count'] = busqueda_contar_intereses($intereses, (string)($b['id'] ?? ''));
  }
  unset($b);
  usort($mias, fn($a, $b) => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  ok(['busquedas' => $mias]);
}

if ($action === 'publish') {
  if (!check_rate_limit('busqueda_publicar', 20, 3600)) {
    fail('Demasiadas publicaciones seguidas. Vuelve a intentarlo en una hora.', 429);
  }
  // Abierto a todos los perfiles: cualquiera con cuenta puede decir que busca
  // trabajo o que ofrece su experiencia.
  $u = busqueda_usuario_o_admin();
  $b = busqueda_validar($in, $u);
  mutate_json('busquedas-empleo', [], function (array $lista) use ($b) {
    $lista[] = $b;
    return $lista;
  });
  registrar_actividad('busqueda-empleo-publicada', [
    'actor_id' => (string)($u['id'] ?? ''),
    'actor' => (string)($u['nombre'] ?? ''),
    'rol' => (string)($u['rol'] ?? ''),
    'objeto_tipo' => 'busqueda-empleo',
    'objeto_id' => (string)$b['id'],
    'detalle' => (string)$b['titulo'],
    'ref' => (string)$b['provincia'],
  ]);
  ok(['busqueda' => busqueda_publica($b, $u)]);
}

if ($action === 'update') {
  $u = busqueda_usuario_o_admin();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $actualizado = null;
  mutate_json('busquedas-empleo', [], function (array $lista) use ($id, $in, $u, &$actualizado) {
    foreach ($lista as &$b) {
      if ((string)($b['id'] ?? '') !== $id) continue;
      if (!busqueda_autorizado($b, $u)) fail('No autorizado.', 403);
      $b = busqueda_validar($in, $u, $b);
      $actualizado = $b;
      break;
    }
    unset($b);
    return $lista;
  });
  if (!$actualizado) fail('Publicación no encontrada.', 404);
  ok(['busqueda' => $actualizado]);
}

if ($action === 'cerrar') {
  $u = busqueda_usuario_o_admin();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $hecho = false;
  mutate_json('busquedas-empleo', [], function (array $lista) use ($id, $u, &$hecho) {
    foreach ($lista as &$b) {
      if ((string)($b['id'] ?? '') !== $id) continue;
      if (!busqueda_autorizado($b, $u)) fail('No autorizado.', 403);
      $b['estado'] = 'cerrada';
      $b['updated_at'] = now_iso();
      $hecho = true;
      break;
    }
    unset($b);
    return $lista;
  });
  if (!$hecho) fail('Publicación no encontrada.', 404);
  ok(['cerrado' => true]);
}

if ($action === 'delete') {
  $u = busqueda_usuario_o_admin();
  $id = trim((string)($in['id'] ?? $_GET['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $hecho = false;
  mutate_json('busquedas-empleo', [], function (array $lista) use ($id, $u, &$hecho) {
    $out = [];
    foreach ($lista as $b) {
      if ((string)($b['id'] ?? '') === $id) {
        if (!busqueda_autorizado($b, $u)) fail('No autorizado.', 403);
        $hecho = true;
        continue;
      }
      $out[] = $b;
    }
    return $out;
  });
  if (!$hecho) fail('Publicación no encontrada.', 404);
  // Retirar el anuncio debe llevarse también los contactos que generó: quien
  // se va de la bolsa de empleo espera irse entero.
  mutate_json('intereses-empleo', [], function (array $lista) use ($id) {
    return array_values(array_filter($lista, fn($i) => (string)($i['busqueda_id'] ?? '') !== $id));
  });
  ok(['borrado' => true]);
}

/* ── Quien contrata se interesa ────────────────────────────────────────── */

if ($action === 'contactar') {
  if (!check_rate_limit('busqueda_contactar', 40, 3600)) {
    fail('Demasiados contactos seguidos. Vuelve a intentarlo en una hora.', 429);
  }
  $u = require_user();
  $id = trim((string)($in['id'] ?? $in['busqueda_id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);

  $b = busqueda_por_id(load_json('busquedas-empleo', []), $id);
  if (!$b) fail('Publicación no encontrada.', 404);
  if ((string)($b['estado'] ?? '') !== 'abierta' || busqueda_vencida($b)) fail('Esta publicación ya no admite contactos.', 409);
  if (busqueda_owner_id($b) === (string)($u['id'] ?? '')) fail('No puedes contactarte a ti mismo.', 422);

  $intereses = load_json('intereses-empleo', []);
  if (busqueda_ya_contacto($intereses, $id, (string)($u['id'] ?? ''))) fail('Ya contactaste a esta persona.', 409);

  $interes = [
    'id' => uid(),
    'busqueda_id' => $id,
    'mensaje' => busqueda_texto($in['mensaje'] ?? '', 'Mensaje', 20, 1500),
    'estado' => 'recibido',
    'empleador_id' => (string)($u['id'] ?? ''),
    'empleador' => (string)($u['nombre'] ?? ''),
    'empleador_rol' => (string)($u['rol'] ?? ''),
    'empleador_empresa' => busqueda_texto($in['empresa'] ?? '', 'Empresa', 0, 120, true),
    'empleador_email' => (string)($u['email'] ?? ''),
    'empleador_telefono' => redcafe_whatsapp_display($u['whatsapp'] ?? $u['telefono'] ?? ''),
    'created_at' => now_iso(),
  ];
  mutate_json('intereses-empleo', [], function (array $lista) use ($interes) {
    $lista[] = $interes;
    return $lista;
  });
  notificar(busqueda_owner_id($b), 'mensaje',
    'Le escribieron por «' . (string)$b['titulo'] . '»',
    (string)$interes['empleador'] . ' vio su publicación en la bolsa de empleo.', '/panel/');
  ok(['interes' => $interes]);
}

if ($action === 'intereses') {
  $u = busqueda_usuario_o_admin();
  $id = trim((string)($_GET['id'] ?? $in['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $b = busqueda_por_id(load_json('busquedas-empleo', []), $id);
  if (!$b) fail('Publicación no encontrada.', 404);
  if (!busqueda_autorizado($b, $u)) fail('No autorizado.', 403);
  $lista = array_values(array_filter(load_json('intereses-empleo', []),
    fn($i) => (string)($i['busqueda_id'] ?? '') === $id));
  usort($lista, fn($a, $b2) => strcmp((string)($b2['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  ok(['intereses' => $lista]);
}

if ($action === 'mis_contactos') {
  $u = require_user();
  $busquedas = load_json('busquedas-empleo', []);
  $mios = array_values(array_filter(load_json('intereses-empleo', []),
    fn($i) => (string)($i['empleador_id'] ?? '') === (string)($u['id'] ?? '')));
  foreach ($mios as &$i) {
    $b = busqueda_por_id($busquedas, (string)($i['busqueda_id'] ?? ''));
    // Recortada: quien escribió no recibe de vuelta el correo ni el teléfono
    // de la persona por el hecho de haberle escrito.
    $i['busqueda'] = $b ? busqueda_publica($b, $u) : null;
  }
  unset($i);
  usort($mios, fn($a, $b2) => strcmp((string)($b2['created_at'] ?? ''), (string)($a['created_at'] ?? '')));
  ok(['contactos' => $mios]);
}

if ($action === 'resolver') {
  $u = busqueda_usuario_o_admin();
  $id = trim((string)($in['id'] ?? ''));
  if ($id === '') fail('ID requerido.', 422);
  $estado = busqueda_enum($in['estado'] ?? '', 'Estado', BUSQUEDA_INTERES_ESTADOS);
  $busquedas = load_json('busquedas-empleo', []);
  $hecho = false;
  mutate_json('intereses-empleo', [], function (array $lista) use ($id, $estado, $u, $busquedas, &$hecho) {
    foreach ($lista as &$i) {
      if ((string)($i['id'] ?? '') !== $id) continue;
      $b = busqueda_por_id($busquedas, (string)($i['busqueda_id'] ?? ''));
      if (!$b || !busqueda_autorizado($b, $u)) fail('No autorizado.', 403);
      $i['estado'] = $estado;
      $i['updated_at'] = now_iso();
      $hecho = true;
      break;
    }
    unset($i);
    return $lista;
  });
  if (!$hecho) fail('Contacto no encontrado.', 404);
  ok(['actualizado' => true]);
}

fail('Acción no válida.', 400);
