<?php
/**
 * API de Contenido editable del sitio.
 * Fuente de datos editable: public/data/contenido-*.json
 * (extraídos de las constantes NOTICIAS, CURSOS, PLANES y SERVICIOS_EXTRA de lib/data.ts).
 *
 * Endpoints:
 *   ?action=list&seccion=X        → público, array completo de la sección
 *   ?action=get&seccion=X&id=Y    → público, un elemento
 *   ?action=create&seccion=X      → admin, añade un elemento
 *   ?action=update&seccion=X&id=Y → admin, reemplaza un elemento
 *   ?action=delete&seccion=X&id=Y → admin, elimina un elemento
 *
 * Secciones válidas (whitelist cerrada): noticias | cursos | planes | servicios.
 * Solo se construye el nombre del archivo a partir de esta tabla, nunca del input.
 */

require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';
$seccion = trim($_GET['seccion'] ?? '');
$in = input();

// ─── Tabla de secciones → archivo y reglas de validación ────────────────────
// Nombre de archivo por sección: se resuelve en safe_data_path contra la
// whitelist ALLOWED_DATA_NAMES, por lo que una sección inventada nunca crea
// un archivo nuevo.

const SECCIONES_CONTENIDO = [
  'noticias' => [
    'archivo' => 'contenido-noticias',
    'requeridos' => ['titulo', 'fecha', 'resumen', 'fuente', 'categoria'],
    'maximos' => [
      'titulo' => 300,
      'fecha' => 32,
      'resumen' => 500,
      'fuente' => 120,
      'categoria' => 80,
      'slug' => 200,
    ],
    'contenido' => ['max_parrafos' => 100, 'max_long' => 5000],
  ],
  'cursos' => [
    'archivo' => 'contenido-cursos',
    'requeridos' => ['titulo', 'nivel', 'duracion', 'descripcion', 'categoria'],
    'maximos' => [
      'titulo' => 300,
      'nivel' => 50,
      'duracion' => 50,
      'descripcion' => 2000,
      'categoria' => 50,
    ],
    'modulos' => ['max_modulos' => 50, 'max_titulo' => 200, 'min_minutos' => 1, 'max_minutos' => 10000],
  ],
  'planes' => [
    'archivo' => 'contenido-planes',
    'requeridos' => ['nombre', 'perfil', 'precio', 'periodicidad', 'descripcion', 'beneficios'],
    'maximos' => [
      'nombre' => 200,
      'perfil' => 50,
      'periodicidad' => 100,
      'descripcion' => 2000,
    ],
    'beneficios' => ['max_items' => 50, 'max_long' => 500],
  ],
  'servicios' => [
    'archivo' => 'contenido-servicios',
    'requeridos' => ['titulo', 'descripcion', 'icono', 'href'],
    'maximos' => [
      'titulo' => 300,
      'descripcion' => 4000,
      'icono' => 20,
      'href' => 500,
    ],
  ],
  'recetas' => [
    'archivo' => 'contenido-recetas',
    'requeridos' => ['titulo', 'resumen', 'metodo', 'dificultad', 'minutos', 'porciones', 'ingredientes', 'pasos'],
    'maximos' => [
      'titulo' => 200,
      'resumen' => 500,
      'metodo' => 60,
      'dificultad' => 20,
      // minutos/porciones son numéricos: se coercion y validan en validar_escritura
      'ratio' => 20,
      'molienda' => 120,
      'temperatura' => 60,
      'consejo' => 600,
      'origenSugerido' => 400,
      'slug' => 200,
    ],
    'listas' => [
      'ingredientes' => ['max_items' => 30, 'max_long' => 200],
      'pasos' => ['max_items' => 30, 'max_long' => 600],
    ],
  ],
];

function seccion_valida(string $s): bool {
  return array_key_exists($s, SECCIONES_CONTENIDO);
}

function seccion_archivo(string $s): string {
  return SECCIONES_CONTENIDO[$s]['archivo'];
}

function validar_id(string $id): void {
  // Mismo criterio que los IDs existentes (n1, buenas-practicas, semilla…).
  if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9_\-]{0,79}$/', $id)) {
    fail('ID no válido. Usa letras, números, guion (-) o guion bajo (_).', 422);
  }
}

function validar_campos_texto(string $seccion, array $item): void {
  $cfg = SECCIONES_CONTENIDO[$seccion];
  foreach ($cfg['maximos'] as $campo => $max) {
    if (!array_key_exists($campo, $item)) continue;
    $v = $item[$campo];
    if (is_string($v) && mb_strlen($v) > $max) {
      fail("El campo '$campo' supera el máximo de $max caracteres.", 422);
    }
  }
}

function validar_contenido_seccion(string $seccion, array $item): void {
  $cfg = SECCIONES_CONTENIDO[$seccion];
  // Campos tipo lista de párrafos (noticias.contenido)
  if (isset($cfg['contenido']) && array_key_exists('contenido', $item)) {
    $v = $item['contenido'];
    if (!is_array($v)) fail("El campo 'contenido' debe ser una lista de párrafos.", 422);
    $lim = $cfg['contenido'];
    if (count($v) > $lim['max_parrafos']) fail('Demasiados párrafos en el contenido.', 422);
    foreach ($v as $parrafo) {
      if (!is_string($parrafo)) fail('Cada párrafo del contenido debe ser texto.', 422);
      if (mb_strlen($parrafo) > $lim['max_long']) fail('Un párrafo supera el máximo de caracteres.', 422);
    }
  }
  // Módulos (cursos)
  if (isset($cfg['modulos']) && array_key_exists('modulos', $item)) {
    $mods = $item['modulos'];
    if (!is_array($mods)) fail("El campo 'modulos' debe ser una lista.", 422);
    $lim = $cfg['modulos'];
    if (count($mods) > $lim['max_modulos']) fail('Demasiados módulos en el curso.', 422);
    foreach ($mods as $mod) {
      if (!is_array($mod) || !array_key_exists('titulo', $mod) || !array_key_exists('minutos', $mod)) {
        fail('Cada módulo requiere "titulo" y "minutos".', 422);
      }
      if (!is_string($mod['titulo']) || mb_strlen($mod['titulo']) > $lim['max_titulo']) {
        fail('Título de módulo demasiado largo.', 422);
      }
      $min = $mod['minutos'];
      if (!is_numeric($min) || (int)$min < $lim['min_minutos'] || (int)$min > $lim['max_minutos']) {
        fail('Minutos de módulo fuera de rango.', 422);
      }
    }
  }
  // Beneficios (planes)
  if (isset($cfg['beneficios']) && array_key_exists('beneficios', $item)) {
    $b = $item['beneficios'];
    if (!is_array($b)) fail("El campo 'beneficios' debe ser una lista.", 422);
    $lim = $cfg['beneficios'];
    if (count($b) > $lim['max_items']) fail('Demasiados beneficios en el plan.', 422);
    foreach ($b as $texto) {
      if (!is_string($texto) || mb_strlen($texto) > $lim['max_long']) {
        fail('Un beneficio supera el máximo de caracteres.', 422);
      }
    }
  }
  // Listas de texto (recetas: ingredientes, pasos)
  if (isset($cfg['listas']) && is_array($cfg['listas'])) {
    foreach ($cfg['listas'] as $campo => $lim) {
      if (!array_key_exists($campo, $item)) continue;
      $v = $item[$campo];
      if (!is_array($v)) fail("El campo '$campo' debe ser una lista.", 422);
      if (count($v) > $lim['max_items']) fail("Demasiados elementos en '$campo'.", 422);
      foreach ($v as $entrada) {
        if (!is_string($entrada)) fail("Cada elemento de '$campo' debe ser texto.", 422);
        if (mb_strlen($entrada) > $lim['max_long']) {
          fail("Un elemento de '$campo' supera el máximo de caracteres.", 422);
        }
      }
    }
  }
}

function validar_escritura(string $seccion, array $item, bool $esCreate): array {
  $cfg = SECCIONES_CONTENIDO[$seccion];

  if ($esCreate) {
    if (!isset($item['id'])) fail('id requerido.', 422);
    validar_id((string)$item['id']);
  }

  foreach ($cfg['requeridos'] as $campo) {
    if (!array_key_exists($campo, $item)) {
      fail("Campo requerido: '$campo'.", 422);
    }
    $v = $item[$campo];
    if (is_string($v) && trim($v) === '') {
      fail("El campo '$campo' no puede estar vacío.", 422);
    }
  }

  validar_campos_texto($seccion, $item);
  validar_contenido_seccion($seccion, $item);

  // Coerción de tipos base
  if ($seccion === 'planes' && array_key_exists('precio', $item)) {
    $item['precio'] = (int)round((float)$item['precio']);
    if ($item['precio'] < 0) fail('El precio no puede ser negativo.', 422);
  }
  if ($seccion === 'recetas') {
    foreach (['minutos', 'porciones'] as $num) {
      if (array_key_exists($num, $item)) {
        $item[$num] = (int)round((float)$item[$num]);
        if ($item[$num] < 0) fail("El campo '$num' no puede ser negativo.", 422);
      }
    }
    if (array_key_exists('dificultad', $item) &&
        !in_array($item['dificultad'], ['fácil', 'media', 'alta'], true)) {
      fail("La dificultad debe ser: fácil, media o alta.", 422);
    }
  }
  if (array_key_exists('destacado', $item) && !is_bool($item['destacado'])) {
    fail("El campo 'destacado' debe ser booleano.", 422);
  }

  return $item;
}

// ─── Acciones ────────────────────────────────────────────────────────────

// LIST: público
if ($action === 'list') {
  if (!seccion_valida($seccion)) fail('Sección no válida. Usa: noticias, cursos, planes, servicios o recetas.', 400);
  $data = load_json(seccion_archivo($seccion), []);
  ok([$seccion => $data]);
}

// GET: público
if ($action === 'get') {
  if (!seccion_valida($seccion)) fail('Sección no válida.', 400);
  $id = trim($_GET['id'] ?? '');
  if (!$id) fail('id requerido.', 422);
  $data = load_json(seccion_archivo($seccion), []);
  foreach ($data as $item) {
    if (($item['id'] ?? '') === $id) {
      ok(['item' => $item]);
    }
  }
  fail('Elemento no encontrado.', 404);
}

// CREATE: admin
if ($action === 'create') {
  require_admin();
  if (!seccion_valida($seccion)) fail('Sección no válida.', 400);

  $item = validar_escritura($seccion, $in, true);
  $archivo = seccion_archivo($seccion);
  $data = load_json($archivo, []);
  foreach ($data as $existente) {
    if (($existente['id'] ?? '') === $item['id']) fail('id duplicado.', 409);
  }
  if (!isset($item['created_at'])) $item['created_at'] = now_iso();
  $data[] = $item;
  save_json($archivo, $data);
  ok(['id' => $item['id']]);
}

// UPDATE: admin (reemplaza el elemento completo)
if ($action === 'update') {
  require_admin();
  if (!seccion_valida($seccion)) fail('Sección no válida.', 400);

  $id = trim($_GET['id'] ?? $_POST['id'] ?? '');
  if (!$id) fail('id requerido.', 422);
  validar_id((string)$id);

  $archivo = seccion_archivo($seccion);
  $data = load_json($archivo, []);
  $idx = null;
  foreach ($data as $i => $existente) {
    if (($existente['id'] ?? '') === $id) { $idx = $i; break; }
  }
  if ($idx === null) fail('Elemento no encontrado.', 404);

  // El id lo controla la URL, no el cuerpo.
  $in['id'] = $id;
  $item = validar_escritura($seccion, $in, false);
  $item['updated_at'] = now_iso();
  $data[$idx] = $item;
  save_json($archivo, $data);
  ok(['id' => $id]);
}

// DELETE: admin
if ($action === 'delete') {
  require_admin();
  if (!seccion_valida($seccion)) fail('Sección no válida.', 400);

  $id = trim($_GET['id'] ?? $_POST['id'] ?? '');
  if (!$id) fail('id requerido.', 422);
  validar_id((string)$id);

  $archivo = seccion_archivo($seccion);
  $data = load_json($archivo, []);
  $before = count($data);
  $data = array_values(array_filter($data, fn($i) => ($i['id'] ?? '') !== $id));
  if (count($data) === $before) fail('Elemento no encontrado.', 404);
  save_json($archivo, $data);
  ok(['deleted' => $id]);
}

fail('Acción no válida.', 400);