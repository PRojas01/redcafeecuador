<?php
declare(strict_types=1);

/**
 * Verificación por la administración — lotes, servicios, cursos y miembros.
 * ---------------------------------------------------------------------------
 * Qué significa el sello. «Verificado» es una afirmación que un comprador va a
 * leer antes de mandar dinero a un desconocido, así que aquí no se pone solo.
 * Significa exactamente esto: una persona de la administración miró el lote, el
 * servicio, el curso o el perfil, y lo dio por bueno en una fecha concreta.
 * Por eso se guarda quién y cuándo, no un simple `true`: un sello sin autor ni
 * fecha no es verificable, y este proyecto ya arrastró bastante dato inventado.
 *
 * Antes de esto, un lote publicado por la administración nacía «verificado» sin
 * que nadie hubiera revisado nada, y no existía forma de verificar el lote de
 * otro. Las dos cosas se corrigen: el sello ya no se hereda del rol de quien
 * publica, se concede.
 *
 *   ?action=list    → todo lo verificable, con su estado (solo administración)
 *   ?action=set     → concede o retira el sello  {tipo, id, verificado, nota}
 *
 * `tipo` es uno de: lote, servicio, curso, miembro.
 */

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';

$action = $_GET['action'] ?? '';
$in = input();

/** La administración es la sesión de /admin/ o un miembro con rol admin. */
function verificacion_admin_o_403(): array {
  $u = current_user();

  // Se pregunta por la FICHA, no por miembro_tiene_rol(), porque esa función
  // devuelve true para cualquier miembro en cuanto existe $_SESSION['admin'].
  // Aquí no se decide si puede verificar, sino QUÉ NOMBRE se publica.
  $roles = $u['roles'] ?? [];
  $adminPorFicha = $u && (
    !empty($u['admin']) || !empty($u['is_admin']) ||
    ($u['rol'] ?? '') === 'admin' || in_array('admin', $roles, true)
  );
  if ($adminPorFicha) return $u;

  // La sesión de /admin/ es una contraseña, no una persona. Firmar el sello
  // con el nombre del miembro que casualmente tenga sesión abierta en el mismo
  // navegador publica como revisor a alguien que no revisó nada.
  if (!empty($_SESSION['admin'])) return ['id' => 'admin', 'nombre' => 'Administración'];

  fail('Solo la administración verifica publicaciones y perfiles.', 403);
}

const VERIFICACION_TIPOS = ['lote', 'servicio', 'curso', 'miembro'];

/** Los campos del sello, iguales para los cuatro tipos. */
function verificacion_sellar(array $item, bool $verificado, array $admin, string $nota): array {
  $item['verificado'] = $verificado;
  if ($verificado) {
    $item['verificado_en'] = now_iso();
    $item['verificado_por'] = (string)($admin['nombre'] ?? 'Administración');
    if ($nota !== '') $item['verificacion_nota'] = mb_substr($nota, 0, 300);
  } else {
    // Al retirar el sello no se borra el rastro de que hubo uno: se anota
    // quién lo retiró y cuándo. Un historial que se limpia solo no sirve de
    // nada. Lo que sí se borra es `verificado_por`: dejarlo puesto haría
    // parecer que alguien avala algo que ya no está verificado.
    $item['verificado_en'] = null;
    $item['verificado_por'] = '';
    $item['verificacion_retirada_en'] = now_iso();
    $item['verificacion_retirada_por'] = (string)($admin['nombre'] ?? 'Administración');
    $item['verificacion_nota'] = $nota !== '' ? mb_substr($nota, 0, 300) : '';
  }
  return $item;
}

/** Dueño de cada cosa, para avisarle de que la revisaron. */
function verificacion_dueno(string $tipo, array $item): string {
  if ($tipo === 'miembro') return (string)($item['id'] ?? '');
  if ($tipo === 'lote') {
    return (string)($item['productor_id'] ?? $item['owner_id'] ?? $item['published_by'] ?? '');
  }
  if ($tipo === 'servicio') {
    return (string)($item['proveedor_id'] ?? $item['owner_id'] ?? $item['published_by'] ?? '');
  }
  return (string)($item['autor_id'] ?? '');
}

function verificacion_titulo(string $tipo, array $item): string {
  if ($tipo === 'miembro') return (string)($item['nombre'] ?? $item['id'] ?? '');
  if ($tipo === 'lote') {
    $partes = array_filter([$item['finca'] ?? '', $item['variedad'] ?? '']);
    return $partes ? implode(' · ', $partes) : (string)($item['id'] ?? '');
  }
  return (string)($item['titulo'] ?? $item['nombre'] ?? $item['id'] ?? '');
}

/**
 * Dónde vive cada tipo. Los servicios y los cursos viven en dos archivos: el
 * de contenido y el catálogo corto que lista el sitio. Hay que sellar en ambos
 * o la tarjeta del marketplace seguiría sin el sello.
 */
function verificacion_archivos(string $tipo): array {
  switch ($tipo) {
    case 'lote':     return ['lotes'];
    case 'servicio': return ['servicios-terceros', 'servicios'];
    case 'curso':    return ['contenido-cursos', 'cursos'];
    case 'miembro':  return ['members'];
  }
  return [];
}

if ($action === 'list') {
  verificacion_admin_o_403();

  $salida = [];

  foreach (load_json('lotes', []) as $l) {
    if (!empty($l['demo']) || !empty($l['ejemplo'])) continue;   // los de muestra no se verifican
    $salida[] = [
      'tipo' => 'lote', 'id' => (string)($l['id'] ?? ''),
      'titulo' => verificacion_titulo('lote', $l),
      'detalle' => trim((string)($l['provincia'] ?? '') . ' · ' . (string)($l['productor'] ?? '')),
      'verificado' => !empty($l['verificado']),
      'verificado_en' => $l['verificado_en'] ?? null,
      'verificado_por' => $l['verificado_por'] ?? '',
      'creado' => $l['created_at'] ?? '',
      'enlace' => '/marketplace/' . rawurlencode((string)($l['id'] ?? '')) . '/',
    ];
  }

  // Los servicios oficiales de Red Café no entran en esta cola: llevan el sello
  // porque son de la plataforma, no porque alguien los revisara, y eso se
  // administra en «Servicios de la plataforma». Aquí van los de los miembros.
  foreach (load_json('servicios-terceros', []) as $s) {
    $salida[] = [
      'tipo' => 'servicio', 'id' => (string)($s['id'] ?? ''),
      'titulo' => verificacion_titulo('servicio', $s),
      'detalle' => trim((string)($s['categoria'] ?? '') . ' · ' . (string)($s['proveedor'] ?? '')),
      'verificado' => !empty($s['verificado']),
      'verificado_en' => $s['verificado_en'] ?? null,
      'verificado_por' => $s['verificado_por'] ?? '',
      'creado' => $s['created_at'] ?? '',
      'enlace' => '/marketplace/',
    ];
  }

  foreach (load_json('contenido-cursos', []) as $c) {
    // También los cursos de la propia Red: si un sello va a aparecer en la
    // Academia, quien lo concede decide en cuáles, no este archivo.
    $deLaRed = trim((string)($c['autor_id'] ?? '')) === '';
    $salida[] = [
      'tipo' => 'curso', 'id' => (string)($c['id'] ?? ''),
      'titulo' => verificacion_titulo('curso', $c),
      'detalle' => trim((string)($c['nivel'] ?? '') . ' · ' .
        ($deLaRed ? 'curso de Red Café' : (string)($c['autor'] ?? ''))),
      'verificado' => !empty($c['verificado']),
      'verificado_en' => $c['verificado_en'] ?? null,
      'verificado_por' => $c['verificado_por'] ?? '',
      'creado' => $c['created_at'] ?? '',
      'enlace' => '/academia/' . rawurlencode((string)($c['id'] ?? '')) . '/',
    ];
  }

  foreach (load_json('members', []) as $m) {
    $salida[] = [
      'tipo' => 'miembro', 'id' => (string)($m['id'] ?? ''),
      'titulo' => verificacion_titulo('miembro', $m),
      // Ni correo ni teléfono: esta lista es para decidir, no un directorio.
      'detalle' => implode(' · ', array_filter([
        implode(', ', (array)($m['roles'] ?? [$m['rol'] ?? ''])),
        (string)($m['provincia'] ?? ''),
      ])),
      'verificado' => !empty($m['verificado']),
      'verificado_en' => $m['fecha_verificacion'] ?? ($m['verificado_en'] ?? null),
      'verificado_por' => $m['verificado_por'] ?? '',
      'estado_validacion' => $m['estado_validacion'] ?? 'pendiente',
      'creado' => $m['created_at'] ?? '',
      'enlace' => '',
    ];
  }

  // Lo que falta por revisar, primero: es la lista de trabajo pendiente.
  usort($salida, function ($a, $b) {
    if ($a['verificado'] !== $b['verificado']) return $a['verificado'] ? 1 : -1;
    return strcmp((string)$b['creado'], (string)$a['creado']);
  });

  ok([
    'items' => $salida,
    'tipos' => VERIFICACION_TIPOS,
    'pendientes' => count(array_filter($salida, fn($i) => !$i['verificado'])),
  ]);
}

if ($action === 'set') {
  $admin = verificacion_admin_o_403();

  $tipo = trim((string)($in['tipo'] ?? ''));
  $id   = trim((string)($in['id'] ?? ''));
  $nota = trim((string)($in['nota'] ?? ''));
  if (!in_array($tipo, VERIFICACION_TIPOS, true)) fail('Tipo no válido.', 422);
  if ($id === '') fail('id requerido.', 422);
  $verificado = filter_var($in['verificado'] ?? true, FILTER_VALIDATE_BOOLEAN);

  $tocado = null;
  foreach (verificacion_archivos($tipo) as $archivo) {
    $lista = load_json($archivo, []);
    $cambio = false;
    foreach ($lista as &$item) {
      if (!is_array($item) || (string)($item['id'] ?? '') !== $id) continue;
      $item = verificacion_sellar($item, $verificado, $admin, $nota);

      // Un miembro tiene además su propio estado de validación, que ya usaba
      // members.php. Se mantienen alineados: dos verdades sobre lo mismo es
      // como acaban las contradicciones en pantalla.
      if ($tipo === 'miembro') {
        $item['estado_validacion'] = $verificado ? 'verificado' : 'pendiente';
        $item['fecha_verificacion'] = $verificado ? now_iso() : null;
      }

      if ($tocado === null) $tocado = $item;
      $cambio = true;
      break;
    }
    unset($item);
    if ($cambio) save_json($archivo, $lista);
  }

  if ($tocado === null) fail('No se encontró lo que quieres verificar.', 404);

  $titulo = verificacion_titulo($tipo, $tocado);
  $dueno = verificacion_dueno($tipo, $tocado);

  $etiquetaTipo = ['lote' => 'lote', 'servicio' => 'servicio',
                   'curso' => 'curso', 'miembro' => 'perfil'][$tipo];

  registrar_actividad($verificado ? 'verificacion-concedida' : 'verificacion-retirada', [
    'objeto_tipo' => $tipo,
    'objeto_id'   => $id,
    'detalle'     => $etiquetaTipo . ': ' . $titulo . ($nota !== '' ? ' — ' . $nota : ''),
  ]);

  if ($dueno !== '') {
    $avisoTipo = $tipo === 'miembro' ? 'miembro' : ($tipo === 'curso' ? 'curso' : $tipo);
    notificar(
      $dueno,
      $avisoTipo,
      $verificado
        ? 'La administración verificó tu ' . $etiquetaTipo
        : 'Se retiró la verificación de tu ' . $etiquetaTipo,
      $verificado
        ? $titulo . ' lleva ahora el sello de verificado en la Red.' . ($nota !== '' ? ' ' . $nota : '')
        : $titulo . ' ya no lleva el sello.' . ($nota !== '' ? ' Motivo: ' . $nota : ''),
      (string)($tocado['enlace'] ?? '')
    );
  }

  ok([
    'tipo' => $tipo,
    'id' => $id,
    'verificado' => $verificado,
    'verificado_en' => $tocado['verificado_en'] ?? null,
    'verificado_por' => $tocado['verificado_por'] ?? '',
  ]);
}

fail('Acción no válida.', 400);
