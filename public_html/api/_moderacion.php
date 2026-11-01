<?php
/**
 * Piezas compartidas de moderación (catálogo de infracciones, firma de los
 * enlaces de apelación y vista que recibe la persona sancionada). Lo usan
 * moderacion.php y el inicio de sesión (auth.php). No se llama directamente:
 * los api/_*.php están bloqueados en .htaccess.
 */
declare(strict_types=1);

/* ── Catálogo de infracciones: cada medida cita la regla que la justifica. ── */
const MOD_INFRACCIONES = [
  'informacion-falsa' => [
    'titulo' => 'Información falsa o suplantación de identidad',
    'norma' => 'Términos y Condiciones §6 («Publicar información falsa o suplantar identidades») y §3 (datos verídicos en el registro).',
    'gravedad' => 'grave',
  ],
  'manipulacion' => [
    'titulo' => 'Manipulación de precios, puntajes de catación o métricas',
    'norma' => 'Términos y Condiciones §6 («Manipular precios, scores de catación o métricas de calidad»).',
    'gravedad' => 'media',
  ],
  'fraude' => [
    'titulo' => 'Fraude en pagos o en transacciones con otros miembros',
    'norma' => 'Términos y Condiciones §6 («Defraudar… cualquier mecanismo de pago») y §9 (actividad fraudulenta o ilegal).',
    'gravedad' => 'muy-grave',
  ],
  'acoso' => [
    'titulo' => 'Acoso, amenazas o discriminación a otros miembros',
    'norma' => 'Términos y Condiciones §6 («Acosar, amenazar o discriminar a otros miembros»).',
    'gravedad' => 'grave',
  ],
  'actividad-ilicita' => [
    'titulo' => 'Uso de la plataforma para actividades ilícitas',
    'norma' => 'Términos y Condiciones §6 («Usar la plataforma para actividades ilícitas») y §9.',
    'gravedad' => 'muy-grave',
  ],
  'acceso-no-autorizado' => [
    'titulo' => 'Intento de acceso a cuentas o datos de otros miembros',
    'norma' => 'Términos y Condiciones §6 («Intentar acceder a cuentas o datos de otros miembros»); LOPDP art. 7 num. 8 (interés legítimo de seguridad).',
    'gravedad' => 'muy-grave',
  ],
  'uso-indebido-datos' => [
    'titulo' => 'Uso indebido de datos personales de otros miembros',
    'norma' => 'Términos y Condiciones §6; LOPDP art. 8 (los datos solo se tratan con consentimiento libre, específico, informado e inequívoco).',
    'gravedad' => 'grave',
  ],
  'spam' => [
    'titulo' => 'Mensajes o publicaciones no solicitadas y repetitivas (spam)',
    'norma' => 'Términos y Condiciones §9 (incumplimiento de los Términos).',
    'gravedad' => 'leve',
  ],
  'incumplimiento-pedidos' => [
    'titulo' => 'Incumplimiento reiterado de pedidos aceptados',
    'norma' => 'Términos y Condiciones §5 (los lotes deben reflejar datos reales; el productor responde por la calidad) y §9.',
    'gravedad' => 'media',
  ],
];

/* Medidas permitidas por gravedad (proporcionalidad). */
const MOD_MEDIDAS_POR_GRAVEDAD = [
  'leve' => ['advertencia', 'suspension'],
  'media' => ['advertencia', 'suspension'],
  'grave' => ['advertencia', 'suspension', 'bloqueo'],
  'muy-grave' => ['suspension', 'bloqueo'],
];
const MOD_DIAS_MAX_SUSPENSION = 90;
const MOD_DIAS_APELACION = 10;   // plazo para presentar la apelación

function mod_secreto(): string {
  $f = DATA_DIR . '/.moderacion_secreto';
  $s = is_file($f) ? trim((string)file_get_contents($f)) : '';
  if (strlen($s) < 32) {
    $s = bin2hex(random_bytes(32));
    @file_put_contents($f, $s, LOCK_EX);
    @chmod($f, 0600);
  }
  return $s;
}
function mod_firma(string $uid, string $sid): string {
  return hash_hmac('sha256', 'apelacion|' . $uid . '|' . $sid, mod_secreto());
}

/** Vista que recibe la persona sancionada (sin notas internas). */
function mod_publica(array $s): array {
  $inf = MOD_INFRACCIONES[$s['infraccion']] ?? ['titulo' => $s['infraccion'], 'norma' => ''];
  return [
    'id' => $s['id'], 'tipo' => $s['tipo'], 'estado' => mod_estado_vigente($s),
    'infraccion' => $inf['titulo'], 'norma' => $inf['norma'], 'hechos' => $s['hechos'],
    'desde' => $s['desde'], 'hasta' => $s['hasta'],
    'apelar_hasta' => $s['apelar_hasta'] ?? null,
    'apelacion' => isset($s['apelacion']) ? [
      'estado' => $s['apelacion']['estado'], 'fecha' => $s['apelacion']['fecha'],
      'respuesta' => $s['apelacion']['respuesta'] ?? null,
    ] : null,
  ];
}

/** «activa», «vencida», «levantada»: la vencida se calcula, no hace falta tarea programada. */
function mod_estado_vigente(array $s): string {
  if (($s['estado'] ?? '') !== 'activa') return (string)($s['estado'] ?? '');
  if (!empty($s['hasta']) && strtotime((string)$s['hasta']) <= time()) return 'vencida';
  return 'activa';
}


/** Lo que ve quien intenta entrar con la cuenta suspendida o bloqueada. */
function moderacion_vista_titular(array $s, string $uid): array {
  return mod_publica($s) + ['apelar' => ['id' => $s['id'], 'u' => $uid, 't' => mod_firma($uid, (string)$s['id'])]];
}

// Publicaciones de un miembro que la administración puede gestionar desde su
// ficha. «ocultable»: el listado público ya respeta el campo «oculto».
const MOD_PUBLICACIONES = [
  'lote'          => ['archivo' => 'lotes',              'ocultable' => true,  'enlace' => '/marketplace/'],
  'servicio'      => ['archivo' => 'servicios-terceros', 'ocultable' => true,  'enlace' => '/marketplace/?ver=servicios'],
  'publicacion'   => ['archivo' => 'posts',              'ocultable' => false, 'enlace' => '/comunidad/'],
  'empleo'        => ['archivo' => 'empleos',            'ocultable' => false, 'enlace' => '/marketplace/?ver=empleos'],
  'requerimiento' => ['archivo' => 'requerimientos',     'ocultable' => false, 'enlace' => '/marketplace/?ver=requerimientos'],
  'busqueda'      => ['archivo' => 'busquedas-empleo',   'ocultable' => false, 'enlace' => '/marketplace/?ver=empleos'],
];
