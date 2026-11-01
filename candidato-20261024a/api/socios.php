<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';
$in = input();

function socios_admin_o_403(): array {
  $u = current_user();
  if (!empty($_SESSION['admin'])) return $u ?: ['id' => 'admin', 'nombre' => 'Administración'];
  if ($u && miembro_tiene_rol($u, 'admin')) return $u;
  fail('Solo la administración puede revisar invitados estratégicos.', 403);
}

function socios_texto($valor, int $max): string {
  $texto = trim((string)$valor);
  $texto = preg_replace('/\s+/u', ' ', $texto) ?? $texto;
  if (mb_strlen($texto) > $max) $texto = mb_substr($texto, 0, $max);
  return $texto;
}

function socios_parrafo($valor, int $max): string {
  $texto = trim((string)$valor);
  $texto = preg_replace("/\r\n?/", "\n", $texto) ?? $texto;
  $texto = preg_replace("/[ \t]+/", ' ', $texto) ?? $texto;
  $texto = preg_replace("/\n{3,}/", "\n\n", $texto) ?? $texto;
  if (mb_strlen($texto) > $max) $texto = mb_substr($texto, 0, $max);
  return $texto;
}

/**
 * Acepta la etiqueta legible o su identificador sin acentos, y guarda siempre
 * la etiqueta.
 *
 * El formulario manda `partner-estrategico` y aquí se esperaba
 * «Partner estratégico»: cualquier envío real habría devuelto 422. Antes que
 * atar la página a unos textos con acentos y tildes que se rompen con solo
 * cambiar una palabra, se admiten los dos y se normaliza a la etiqueta, que es
 * lo que después lee la administración.
 */
function socios_slug(string $texto): string {
  $t = mb_strtolower(trim($texto));
  $t = strtr($t, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n','ü'=>'u']);
  $t = preg_replace('/[^a-z0-9]+/', '-', $t) ?? $t;
  return trim((string)$t, '-');
}

function socios_opcion($valor, array $permitidas, string $campo): string {
  $valor = socios_texto($valor, 200);
  if (in_array($valor, $permitidas, true)) return $valor;

  $buscado = socios_slug($valor);
  foreach ($permitidas as $etiqueta) {
    if (socios_slug($etiqueta) === $buscado) return $etiqueta;
  }
  fail($campo . ' inválido.', 422);
}

function socios_bool($valor): bool {
  return filter_var($valor, FILTER_VALIDATE_BOOLEAN);
}

function socios_email($valor, bool $requerido = true): string {
  $email = mb_strtolower(socios_texto($valor, 160));
  if ($email === '' && !$requerido) return '';
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Correo inválido.', 422);
  return $email;
}

const SOCIOS_PROFILE_TYPES = [
  'Partner estratégico', 'Founder', 'Inversionista', 'Profesional aliado',
  'Institución aliada', 'Productor líder', 'Comprador/exportador',
  'Aliado promotor de red', 'Otro',
];

/* Cómo quiere participar el invitado. Se elige al final del preacuerdo, después
   de leer qué se pide y qué se ofrece a cada tipo, y admite varias opciones: una
   misma persona puede ser a la vez profesional aliado y promotor de red. */
const SOCIOS_PARTICIPACIONES = [
  'Partner estratégico', 'Founder operativo', 'Inversionista', 'Profesional aliado',
  'Institución aliada', 'Productor líder', 'Comprador/exportador',
  'Aliado promotor de red', 'Aún no lo sé',
];

const SOCIOS_INTERESTS = [
  'Comercialización', 'Exportación', 'Trazabilidad', 'Certificación',
  'Calidad/catación', 'Formación', 'Tecnología', 'Financiamiento',
  'Servicios para productores', 'Otro',
];

const SOCIOS_FEEDBACK_TYPES = [
  'Acepto avanzar', 'Quiero conversar', 'Propongo ajustes',
  'Necesito más información', 'No es de mi interés ahora',
];

if ($action === 'accept') {
  if (!check_rate_limit('socios_accept', 20, 3600)) fail('Demasiados intentos. Intenta nuevamente más tarde.', 429);

  $name = socios_texto($in['name'] ?? '', 120);
  $email = socios_email($in['email'] ?? '');
  $phone = socios_texto($in['phone'] ?? '', 60);
  $organization = socios_texto($in['organization'] ?? '', 140);
  $profileType = socios_opcion($in['profile_type'] ?? '', SOCIOS_PROFILE_TYPES, 'Tipo de perfil');
  $interest = socios_opcion($in['interest'] ?? '', SOCIOS_INTERESTS, 'Interés');
  $privacy = socios_bool($in['accepted_privacy'] ?? false);
  $confidentiality = socios_bool($in['accepted_confidentiality'] ?? false);

  if (mb_strlen($name) < 2) fail('Nombre requerido.', 422);
  if ($phone === '') fail('Teléfono o WhatsApp requerido.', 422);
  if ($organization === '') fail('Empresa u organización requerida.', 422);
  if (!$privacy || !$confidentiality) fail('Debes aceptar la política de datos y la reserva de la propuesta.', 422);

  $item = [
    'id' => 'socio-' . gmdate('YmdHis') . '-' . bin2hex(random_bytes(4)),
    'name' => $name,
    'email' => $email,
    'phone' => $phone,
    'organization' => $organization,
    'profile_type' => $profileType,
    'interest' => $interest,
    'accepted_privacy' => true,
    'accepted_confidentiality' => true,
    'ip_address' => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
    'user_agent' => socios_texto($_SERVER['HTTP_USER_AGENT'] ?? '', 500),
    'feedback_type' => '',
    'feedback' => '',
    'counterproposal' => '',
    'next_step' => '',
    'feedback_at' => '',
    'created_at' => now_iso(),
  ];

  mutate_json('socios-invitados', [], function (array $items) use ($item) {
    $items[] = $item;
    return $items;
  });

  /* Aceptar el registro es lo que ABRE la puerta del preacuerdo. La marca vive
     en la sesión del servidor, no en el navegador: el preacuerdo lleva dentro
     el modelo de negocio y las proyecciones, y una comprobación en JavaScript
     no protege nada —el HTML viajaría igual y se lee con un `curl`—. */
  $_SESSION['socio_id'] = $item['id'];
  $_SESSION['socio_email'] = $item['email'];

  ok(['id' => $item['id']]);
}

if ($action === 'feedback') {
  if (!check_rate_limit('socios_feedback', 20, 3600)) fail('Demasiados intentos. Intenta nuevamente más tarde.', 429);

  /* Quién puede escribir sobre un registro
     ------------------------------------------------------------------
     Esta acción es pública: el invitado llega desde el preacuerdo, sin
     cuenta. Antes bastaba con acertar un `id` para sobrescribir la
     retroalimentación de OTRO invitado, y los datos de un invitado
     estratégico no son cosa menor.

     Ahora, para actualizar un registro existente hay que traer el id Y el
     correo con el que se accedió, y tienen que coincidir. Si solo llega el
     correo, se añade una respuesta nueva en vez de pisar la anterior: es
     preferible un registro de más que una respuesta ajena machacada. */
  $id = socios_texto($in['id'] ?? '', 80);
  $email = socios_email($in['email'] ?? '', true);
  $feedbackType = socios_opcion($in['feedback_type'] ?? 'Quiero conversar', SOCIOS_FEEDBACK_TYPES, 'Tipo de respuesta');
  $feedback = socios_parrafo($in['feedback'] ?? '', 2500);
  $counterproposal = socios_parrafo($in['counterproposal'] ?? '', 2500);
  $nextStep = socios_texto($in['next_step'] ?? '', 220);

  // Participación elegida: lista cerrada, al menos una opción.
  $participacion = [];
  foreach ((array)($in['participacion'] ?? []) as $valor) {
    $participacion[] = socios_opcion($valor, SOCIOS_PARTICIPACIONES, 'Forma de participación');
  }
  $participacion = array_values(array_unique($participacion));
  if (!$participacion) fail('Elige al menos una forma de participación.', 422);

  // Con la forma de participación elegida ya hay una respuesta concreta: el
  // texto libre deja de ser obligatorio.
  if ($feedback === '' && $counterproposal === '' && $feedbackType === 'Propongo ajustes') {
    fail('Si propone ajustes, describa la contrapropuesta.', 422);
  }

  $actualizado = null;
  mutate_json('socios-invitados', [], function (array $items) use ($id, $email, $feedbackType, $feedback, $counterproposal, $nextStep, $participacion, &$actualizado) {
    $idx = -1;
    if ($id !== '') {
      foreach ($items as $i => $item) {
        if ((string)($item['id'] ?? '') !== $id) continue;
        // El id solo vale acompañado del correo del propio registro.
        if (strcasecmp((string)($item['email'] ?? ''), $email) === 0) $idx = $i;
        break;
      }
    }
    if ($idx < 0) {
      $items[] = [
        'id' => 'socio-' . gmdate('YmdHis') . '-' . bin2hex(random_bytes(4)),
        'name' => '',
        'email' => $email,
        'phone' => '',
        'organization' => '',
        'profile_type' => 'Otro',
        'interest' => 'Otro',
        'accepted_privacy' => false,
        'accepted_confidentiality' => false,
        'ip_address' => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
        'user_agent' => socios_texto($_SERVER['HTTP_USER_AGENT'] ?? '', 500),
        'created_at' => now_iso(),
      ];
      $idx = count($items) - 1;
    }
    $items[$idx]['participacion'] = $participacion;
    $items[$idx]['feedback_type'] = $feedbackType;
    $items[$idx]['feedback'] = $feedback;
    $items[$idx]['counterproposal'] = $counterproposal;
    $items[$idx]['next_step'] = $nextStep;
    $items[$idx]['feedback_at'] = now_iso();
    $actualizado = $items[$idx];
    return $items;
  });
  ok(['id' => $actualizado['id'] ?? $id]);
}

if ($action === 'list') {
  socios_admin_o_403();
  $items = load_json('socios-invitados', []);
  usort($items, function ($a, $b) {
    $ta = strtotime((string)($a['created_at'] ?? '')) ?: 0;
    $tb = strtotime((string)($b['created_at'] ?? '')) ?: 0;
    return $tb <=> $ta;
  });
  ok(['invitados' => $items]);
}

fail('Acción no válida.', 404);
