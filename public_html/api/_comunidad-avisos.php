<?php
/**
 * Red Café Ecuador — avisos automáticos para el muro de comunidad.
 *
 * Este archivo concentra la redacción pública de eventos de la Red. No debe
 * filtrar datos sensibles de miembros: solo nombre, perfil y provincia.
 */

declare(strict_types=1);

const COMUNIDAD_AVISOS_MAX = 300;
const COMUNIDAD_AVISO_TIPOS = ['miembro', 'lote', 'servicio', 'curso', 'empleo', 'requerimiento'];

function publicar_aviso_comunidad(string $tipo, array $datos): void {
  $tipo = trim($tipo);
  if (!in_array($tipo, COMUNIDAD_AVISO_TIPOS, true)) return;

  if ($tipo === 'miembro' && function_exists('miembro_es_publico') && !miembro_es_publico($datos)) {
    return;
  }

  $objetoId = comunidad_aviso_texto($datos['objeto_id'] ?? ($datos['id'] ?? ''));
  if ($objetoId === '') return;

  $aviso = comunidad_aviso_redactar($tipo, $datos);
  if (($aviso['titulo'] ?? '') === '') return;

  $post = [
    'id' => uid(),
    'tipo' => 'aviso',
    'aviso' => $tipo,
    'objeto_id' => $objetoId,
    'titulo' => $aviso['titulo'],
    'text' => $aviso['text'],
    'enlace' => comunidad_aviso_enlace($aviso['enlace'] ?? ''),
    'autor' => 'Red Café Ecuador',
    'autor_id' => 'redcafe',
    'autor_rol' => 'sistema',
    'created_at' => comunidad_aviso_fecha($datos['created_at'] ?? ($datos['creado'] ?? '')),
    'imagenes' => [],
    'likes' => [],
    'comments' => [],
  ];

  try {
    mutate_json('posts', [], function (array $posts) use ($post, $tipo, $objetoId) {
      foreach ($posts as $p) {
        if (($p['tipo'] ?? '') === 'aviso'
            && ($p['aviso'] ?? '') === $tipo
            && (string)($p['objeto_id'] ?? '') === $objetoId) {
          return $posts;
        }
      }

      $posts[] = $post;
      return comunidad_avisos_podar($posts);
    });
  } catch (Throwable $e) {
    // Un aviso comunitario no debe tumbar la operación que lo originó.
  }
}

function comunidad_aviso_desde_actividad(array $actividad): void {
  $evento = (string)($actividad['evento'] ?? '');
  $mapa = [
    'miembro-alta' => ['miembro', 'members'],
    'lote-publicado' => ['lote', 'lotes'],
    'servicio-publicado' => ['servicio', 'servicios-terceros'],
    'curso-publicado' => ['curso', 'contenido-cursos'],
    'empleo-publicado' => ['empleo', 'empleos'],
  ];
  if (!isset($mapa[$evento])) return;

  [$tipo, $archivo] = $mapa[$evento];
  $id = comunidad_aviso_texto($actividad['objeto_id'] ?? '');
  if ($id === '') return;

  $objeto = comunidad_aviso_buscar($archivo, $id);
  if (!$objeto && $tipo === 'curso') $objeto = comunidad_aviso_buscar('cursos', $id);
  if (!$objeto) return;

  publicar_aviso_comunidad($tipo, $objeto);
}

function comunidad_aviso_buscar(string $archivo, string $id): ?array {
  foreach (load_json($archivo, []) as $item) {
    if ((string)($item['id'] ?? '') === $id) return $item;
  }
  return null;
}

function comunidad_aviso_redactar(string $tipo, array $d): array {
  if ($tipo === 'miembro') {
    $nombre = comunidad_aviso_miembro_nombre($d);
    $perfil = comunidad_aviso_perfil($d);
    $provincia = comunidad_aviso_texto($d['provincia'] ?? '');
    $fraseProvincia = $provincia !== '' ? ', desde ' . $provincia : '';
    return [
      'titulo' => 'Nuevo miembro en la Red: ' . $nombre,
      'text' => $nombre . ' se suma como ' . $perfil . $fraseProvincia . '.',
      // Sin enlace: llevaba a /comunidad/, la misma página donde ya se está.
      'enlace' => '',
    ];
  }

  if ($tipo === 'lote') {
    $finca = comunidad_aviso_texto($d['finca'] ?? ($d['titulo'] ?? 'Lote de café'));
    $partes = comunidad_aviso_partes([$d['variedad'] ?? '', $d['proceso'] ?? '', $d['provincia'] ?? '']);
    $precio = comunidad_aviso_precio($d['precioSaco'] ?? ($d['precio_saco'] ?? ''));
    $texto = implode(' · ', $partes);
    if ($precio !== '') $texto .= ($texto !== '' ? '. ' : '') . $precio . ' el saco.';
    elseif ($texto !== '') $texto .= '.';
    return [
      'titulo' => 'Nuevo lote publicado: ' . $finca,
      'text' => $texto,
      'enlace' => '/marketplace/' . rawurlencode((string)($d['id'] ?? $d['objeto_id'] ?? '')) . '/',
    ];
  }

  if ($tipo === 'servicio') {
    $titulo = comunidad_aviso_texto($d['titulo'] ?? 'Servicio');
    $partes = comunidad_aviso_partes([$d['categoria'] ?? '', $d['provincia'] ?? '']);
    $proveedor = comunidad_aviso_texto($d['proveedor'] ?? ($d['autor'] ?? 'un miembro de la Red'));
    $texto = implode(' · ', $partes);
    $texto .= ($texto !== '' ? '. ' : '') . 'Lo ofrece ' . $proveedor . '.';
    // Un servicio no tiene ficha propia: /marketplace/<id>/ abriría la ficha
    // de un lote con ese id, que no existe. Se enlaza al marketplace, donde
    // está la pestaña de servicios.
    return [
      'titulo' => 'Nuevo servicio: ' . $titulo,
      'text' => $texto,
      // Abre directamente la pestaña de servicios del marketplace.
      'enlace' => '/marketplace/?ver=servicios',
    ];
  }

  if ($tipo === 'curso') {
    $titulo = comunidad_aviso_texto($d['titulo'] ?? 'Curso');
    $partes = comunidad_aviso_partes([$d['nivel'] ?? '', $d['duracion'] ?? '']);
    $autor = comunidad_aviso_texto($d['autor'] ?? 'Red Café Ecuador');
    $texto = implode(' · ', $partes);
    $texto .= ($texto !== '' ? '. ' : '') . 'Lo publica ' . $autor . '.';
    return [
      'titulo' => 'Nuevo curso en la Academia: ' . $titulo,
      'text' => $texto,
      'enlace' => '/academia/' . rawurlencode((string)($d['id'] ?? $d['objeto_id'] ?? '')) . '/',
    ];
  }

  if ($tipo === 'requerimiento') {
    // Va ANTES del bloque final, que es el de empleo por omisión: sin esta
    // rama un requerimiento se anunciaría como «Nueva oferta de empleo».
    $titulo = comunidad_aviso_texto($d['titulo'] ?? 'Requerimiento de café');
    $cantidad = trim((string)($d['cantidad'] ?? ''));
    $unidad = comunidad_aviso_texto($d['unidad'] ?? '');
    // Ojo con recortar ceros a lo bruto: rtrim($cantidad, '0') convertía «20»
    // en «2». Se decide por el valor, no por el texto.
    $busca = '';
    if ($cantidad !== '' && is_numeric($cantidad)) {
      $n = (float)$cantidad;
      $cifra = $n == floor($n) ? (string)(int)$n : rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');
      $singular = ['sacos' => 'saco', 'quintales' => 'quintal', 'kg' => 'kg'];
      $medida = ($n == 1.0 && isset($singular[$unidad])) ? $singular[$unidad] : $unidad;
      $busca = 'Busca ' . $cifra . ' ' . $medida;
    }
    // «cualquiera» es la ausencia de preferencia, no una característica: como
    // descriptor quedaba «Busca 3 sacos. cualquiera.», que no dice nada.
    $rasgos = array_filter([$d['variedad'] ?? '', $d['proceso'] ?? '', $d['provincia'] ?? ''],
      fn($v) => trim((string)$v) !== '' && trim((string)$v) !== 'cualquiera');
    $partes = comunidad_aviso_partes(array_values($rasgos));
    $texto = implode(' · ', $partes);
    if ($busca !== '') $texto = $busca . ($texto !== '' ? '. ' . $texto . '.' : '.');
    elseif ($texto !== '') $texto .= '.';
    return [
      'titulo' => 'Buscan café: ' . $titulo,
      'text' => $texto,
      'enlace' => '/marketplace/?ver=requerimientos',
    ];
  }

  $titulo = comunidad_aviso_texto($d['titulo'] ?? 'Oferta de empleo');
  $partes = comunidad_aviso_partes([$d['modalidad'] ?? '', $d['jornada'] ?? '', $d['provincia'] ?? '']);
  return [
    'titulo' => 'Nueva oferta de empleo: ' . $titulo,
    'text' => implode(' · ', $partes) . (count($partes) ? '.' : ''),
    'enlace' => '/marketplace/?ver=empleos',
  ];
}

function comunidad_avisos_podar(array $posts): array {
  $avisos = [];
  foreach ($posts as $idx => $p) {
    if (($p['tipo'] ?? '') === 'aviso') {
      $avisos[] = ['idx' => $idx, 'post' => $p];
    }
  }
  if (count($avisos) <= COMUNIDAD_AVISOS_MAX) return $posts;

  usort($avisos, function ($a, $b) {
    $cmp = strcmp((string)($b['post']['created_at'] ?? ''), (string)($a['post']['created_at'] ?? ''));
    return $cmp !== 0 ? $cmp : ($b['idx'] <=> $a['idx']);
  });
  $mantener = [];
  foreach (array_slice($avisos, 0, COMUNIDAD_AVISOS_MAX) as $a) {
    $mantener[$a['idx']] = true;
  }

  $podados = [];
  foreach ($posts as $idx => $p) {
    if (($p['tipo'] ?? '') !== 'aviso' || isset($mantener[$idx])) $podados[] = $p;
  }
  return $podados;
}

function comunidad_aviso_texto($valor): string {
  $valor = preg_replace('/\s+/u', ' ', trim((string)$valor));
  return mb_substr($valor, 0, 160);
}

function comunidad_aviso_miembro_nombre(array $m): string {
  $nombre = comunidad_aviso_sin_contacto($m['nombre'] ?? '');
  return $nombre !== '' ? $nombre : 'Nuevo miembro';
}

function comunidad_aviso_perfil(array $m): string {
  $roles = function_exists('miembro_roles') ? miembro_roles($m) : (array)($m['roles'] ?? ($m['rol'] ?? []));
  $roles = array_values(array_filter(array_map('comunidad_aviso_texto', $roles)));
  if (!$roles && !empty($m['rol'])) $roles[] = comunidad_aviso_texto($m['rol']);
  if (!$roles) return 'miembro de la Red';
  // «vendedor, comprador, desde Pichincha» se leía mal. Con la conjunción
  // suena a frase escrita por alguien: «vendedor y comprador, desde Pichincha».
  $roles = array_slice($roles, 0, 3);
  if (count($roles) === 1) return $roles[0];
  $ultimo = array_pop($roles);
  return implode(', ', $roles) . ' y ' . $ultimo;
}

function comunidad_aviso_sin_contacto($valor): string {
  $valor = comunidad_aviso_texto($valor);
  $valor = preg_replace('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/iu', '', $valor);
  $valor = preg_replace('/(?:\+?593|0)?[\s().-]*(?:\d[\s().-]*){8,12}/u', '', $valor);
  return comunidad_aviso_texto($valor);
}

function comunidad_aviso_partes(array $valores): array {
  $partes = [];
  foreach ($valores as $valor) {
    $valor = comunidad_aviso_texto($valor);
    if ($valor !== '') $partes[] = $valor;
  }
  return $partes;
}

function comunidad_aviso_precio($valor): string {
  if ($valor === null || $valor === '') return '';
  if (is_numeric($valor)) return '$' . number_format((float)$valor, 2);
  return comunidad_aviso_texto($valor);
}

function comunidad_aviso_enlace(string $enlace): string {
  $enlace = trim($enlace);
  if ($enlace === '' || $enlace[0] !== '/' || str_starts_with($enlace, '//')) return '';
  if (str_contains($enlace, '..')) return '';
  return mb_substr($enlace, 0, 200);
}

function comunidad_aviso_fecha($fecha): string {
  $fecha = trim((string)$fecha);
  return $fecha !== '' && strtotime($fecha) !== false ? $fecha : now_iso();
}
