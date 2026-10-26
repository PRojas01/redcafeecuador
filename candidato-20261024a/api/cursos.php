<?php
/**
 * Red Café Ecuador — Academia
 * ---------------------------------------------------------------------------
 * Gestión de cursos y registro del avance de cada miembro.
 *
 *  · Lectura pública:      list, get
 *  · Avance del miembro:   progreso, completar, reiniciar   (cualquier sesión)
 *  · Autoría:              publish, update, delete
 *      - El administrador gestiona todos los cursos.
 *      - El asesor experto publica cursos propios y edita solo los suyos.
 *
 * Los cursos de la Red viven en data/contenido-cursos.json; los publicados por
 * miembros se guardan en el mismo archivo con autor_id, de modo que la
 * academia sea una sola lista para quien la consulta.
 */

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_avisos.php';
require_once __DIR__ . '/_comunidad-avisos.php';

$action = $_GET['action'] ?? '';
$in = input();

const CURSO_NIVELES = ['Básico', 'Intermedio', 'Avanzado'];
const CURSO_CATEGORIAS = ['produccion', 'postcosecha', 'calidad', 'comercial', 'administrativo', 'barismo', 'legal', 'general'];
const MAX_MODULOS = 12;
const MAX_LECCIONES = 12;


/* ─── Bloques de contenido de una lección ────────────────────────────────
 * Una lección deja de ser un solo texto y pasa a ser una secuencia de
 * bloques, como en cualquier plataforma de formación:
 *
 *   texto      párrafos en texto plano
 *   imagen     subida al sitio o alojada en un dominio permitido
 *   enlace     documento en la nube (Drive, Dropbox, OneDrive…)
 *   tabla      datos técnicos en filas y columnas, sin HTML
 *   video      YouTube o Vimeo, incrustado
 *   documento  Drive / OneDrive / PDF incrustado
 *   codigo     fragmento de código mostrado como texto
 *
 * NUNCA se guarda HTML del usuario. Cuando pega un "código de inserción"
 * se extrae la URL y se valida contra la lista blanca: así puede incrustar
 * lo que necesita sin abrir una vía de inyección.
 */

const BLOQUE_TIPOS = ['texto', 'imagen', 'enlace', 'video', 'documento', 'codigo', 'tabla'];
const MAX_BLOQUES = 40;

// Dominios admitidos para incrustar. Todo lo demás se guarda como enlace.
const EMBED_PERMITIDOS = [
  'youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be',
  'player.vimeo.com', 'vimeo.com', 'www.vimeo.com',
  'drive.google.com', 'docs.google.com',
  'onedrive.live.com', '1drv.ms',
  'dropbox.com', 'www.dropbox.com',
];

function curso_host_de(string $url): string {
    $h = parse_url($url, PHP_URL_HOST);
    return is_string($h) ? mb_strtolower($h) : '';
}

function curso_url_segura(string $url): string {
    $url = trim($url);
    if ($url === '') return '';
    // Rutas internas del propio sitio (imágenes subidas por el miembro).
    if (strpos($url, '/uploads/user-content/') === 0
        && preg_match('#^/uploads/user-content/[A-Za-z0-9._-]+$#', $url)) {
        return $url;
    }
    if (!preg_match('#^https://#i', $url)) return '';   // solo https externo
    if (strpos($url, '"') !== false || strpos($url, '<') !== false) return '';
    return filter_var($url, FILTER_VALIDATE_URL) ? $url : '';
}

function curso_embed_permitido(string $url): bool {
    $host = curso_host_de($url);
    if ($host === '') return false;
    foreach (EMBED_PERMITIDOS as $ok) {
        if ($host === $ok || substr($host, -strlen('.' . $ok)) === '.' . $ok) return true;
    }
    return false;
}

/**
 * Acepta una URL o un código de inserción pegado y devuelve la URL limpia.
 * De un <iframe src="..."> se queda solo con el src, y lo valida.
 */
function curso_url_de_insercion(string $entrada): string {
    $entrada = trim($entrada);
    if ($entrada === '') return '';
    if (preg_match('#src\s*=\s*["\']([^"\']+)["\']#i', $entrada, $m)) {
        $entrada = $m[1];
    } elseif (preg_match('#https://[^\s"\'<>]+#i', $entrada, $m)) {
        $entrada = $m[0];
    }
    return curso_url_segura($entrada);
}

/** Normaliza a la URL de reproducción incrustada de cada proveedor. */
function curso_embed_normalizado(string $url): array {
    $host = curso_host_de($url);

    if (strpos($host, 'youtu') !== false) {
        $id = '';
        if (preg_match('#youtu\.be/([A-Za-z0-9_-]{6,})#', $url, $m)) $id = $m[1];
        elseif (preg_match('#[?&]v=([A-Za-z0-9_-]{6,})#', $url, $m)) $id = $m[1];
        elseif (preg_match('#/embed/([A-Za-z0-9_-]{6,})#', $url, $m)) $id = $m[1];
        if ($id === '') return ['', ''];
        return ['https://www.youtube-nocookie.com/embed/' . $id, 'youtube'];
    }

    if (strpos($host, 'vimeo') !== false) {
        if (preg_match('#vimeo\.com/(?:video/)?(\d+)#', $url, $m)) {
            return ['https://player.vimeo.com/video/' . $m[1], 'vimeo'];
        }
        return ['', ''];
    }

    if (strpos($host, 'drive.google.com') !== false) {
        if (preg_match('#/d/([A-Za-z0-9_-]+)#', $url, $m)) {
            return ['https://drive.google.com/file/d/' . $m[1] . '/preview', 'drive'];
        }
        return ['', ''];
    }

    if (strpos($host, 'docs.google.com') !== false) {
        return [preg_replace('#/(edit|view)([?#].*)?$#', '/preview', $url), 'docs'];
    }

    if (strpos($host, 'dropbox.com') !== false) {
        return [preg_replace('#[?&]dl=0#', '?raw=1', $url), 'dropbox'];
    }

    if (strpos($host, 'onedrive') !== false || strpos($host, '1drv.ms') !== false) {
        return [$url, 'onedrive'];
    }

    return ['', ''];
}

function curso_bloques_saneados($bloques): array {
    if (!is_array($bloques)) return [];
    $out = [];
    foreach ($bloques as $b) {
        if (!is_array($b)) continue;
        $tipo = mb_strtolower(trim((string)($b['tipo'] ?? 'texto')));
        if (!in_array($tipo, BLOQUE_TIPOS, true)) continue;

        $nuevo = ['tipo' => $tipo];
        $titulo = trim((string)($b['titulo'] ?? ''));
        if ($titulo !== '') $nuevo['titulo'] = mb_substr($titulo, 0, 140);

        if ($tipo === 'texto') {
            $texto = trim((string)($b['texto'] ?? ''));
            if ($texto === '') continue;
            $nuevo['texto'] = mb_substr($texto, 0, 8000);

        } elseif ($tipo === 'codigo') {
            $codigo = (string)($b['codigo'] ?? '');
            if (trim($codigo) === '') continue;
            $nuevo['codigo'] = mb_substr($codigo, 0, 6000);
            $len = trim((string)($b['lenguaje'] ?? ''));
            if ($len !== '') $nuevo['lenguaje'] = mb_substr(preg_replace('/[^A-Za-z0-9+#-]/', '', $len), 0, 20);

        } elseif ($tipo === 'imagen') {
            $url = curso_url_segura((string)($b['url'] ?? ''));
            if ($url === '') continue;
            $nuevo['url'] = $url;
            $alt = trim((string)($b['alt'] ?? ''));
            $nuevo['alt'] = mb_substr($alt !== '' ? $alt : 'Imagen del curso', 0, 200);
            $pie = trim((string)($b['pie'] ?? ''));
            if ($pie !== '') $nuevo['pie'] = mb_substr($pie, 0, 300);

        } elseif ($tipo === 'enlace') {
            $url = curso_url_de_insercion((string)($b['url'] ?? ''));
            if ($url === '') continue;
            $nuevo['url'] = $url;
            $nuevo['titulo'] = mb_substr($titulo !== '' ? $titulo : 'Documento del curso', 0, 140);
            $desc = trim((string)($b['descripcion'] ?? ''));
            if ($desc !== '') $nuevo['descripcion'] = mb_substr($desc, 0, 400);

        } elseif ($tipo === 'tabla') {
            $columnas = [];
            foreach ((array)($b['columnas'] ?? []) as $columna) {
                $valor = trim((string)$columna);
                if ($valor !== '') $columnas[] = mb_substr($valor, 0, 80);
                if (count($columnas) >= 6) break;
            }
            $filas = [];
            foreach ((array)($b['filas'] ?? []) as $fila) {
                if (!is_array($fila)) continue;
                $limpia = [];
                foreach ($fila as $celda) {
                    $limpia[] = mb_substr(trim((string)$celda), 0, 180);
                    if (count($limpia) >= count($columnas)) break;
                }
                while (count($limpia) < count($columnas)) $limpia[] = '';
                if ($limpia) $filas[] = $limpia;
                if (count($filas) >= 16) break;
            }
            if (!$columnas || !$filas) continue;
            $nuevo['columnas'] = $columnas;
            $nuevo['filas'] = $filas;
            $pie = trim((string)($b['pie'] ?? $b['descripcion'] ?? ''));
            if ($pie !== '') $nuevo['pie'] = mb_substr($pie, 0, 300);

        } else { // video | documento
            $url = curso_url_de_insercion((string)($b['url'] ?? ''));
            if ($url === '' || !curso_embed_permitido($url)) continue;
            [$embed, $proveedor] = curso_embed_normalizado($url);
            if ($embed === '') continue;
            $nuevo['url'] = $embed;
            $nuevo['proveedor'] = $proveedor;
            $desc = trim((string)($b['descripcion'] ?? ''));
            if ($desc !== '') $nuevo['descripcion'] = mb_substr($desc, 0, 400);
        }

        $out[] = $nuevo;
        if (count($out) >= MAX_BLOQUES) break;
    }
    return $out;
}

/* ─── Utilidades ─────────────────────────────────────────────────────────── */

function cursos_todos(): array {
    $c = load_json('contenido-cursos', []);
    if (!is_array($c)) return [];
    // Actualización editorial incremental: el catálogo operativo conserva
    // matrículas, autores y cualquier edición posterior hecha por administración.
    if (is_file(__DIR__ . '/_legacy_catalogo_20261001.php')) {
        if (!defined('REDCAFE_CURSOS_INTERNO')) define('REDCAFE_CURSOS_INTERNO', true);
        $actualizaciones = require __DIR__ . '/_legacy_catalogo_20261001.php';
        foreach ($c as &$curso) {
            if (!is_array($curso)) continue;
            $id = (string)($curso['id'] ?? '');
            if (empty($curso['precios']) && isset($actualizaciones[$id])) {
                $curso = array_replace($curso, $actualizaciones[$id]);
            }
        }
        unset($curso);
    }
    return $c;
}

function curso_por_id(array $cursos, string $id): ?array {
    foreach ($cursos as $c) {
        if (($c['id'] ?? '') === $id) return $c;
    }
    return null;
}

/** Un curso lo edita su autor o un administrador. Los de la Red, solo admin. */
function curso_puede_editar(array $curso, array $u): bool {
    if (miembro_tiene_rol($u, 'admin')) return true;
    $autor = (string)($curso['autor_id'] ?? '');
    return $autor !== '' && $autor === ($u['id'] ?? '');
}

function curso_asociados_ids($asociados): array {
    if (!is_array($asociados)) return [];
    $out = [];
    foreach ($asociados as $id) {
        $id = trim((string)$id);
        if ($id === '' || in_array($id, $out, true)) continue;
        $out[] = $id;
        if (count($out) >= 10) break;
    }
    return $out;
}

function curso_es_autor_o_asociado(array $curso, ?array $u): bool {
    if (!$u && empty($_SESSION['admin'])) return false;
    if (miembro_tiene_rol($u ?? [], 'admin')) return true;
    $uid = (string)($u['id'] ?? '');
    if ($uid === '') return false;
    if ((string)($curso['autor_id'] ?? '') === $uid) return true;
    return in_array($uid, curso_asociados_ids($curso['asociados'] ?? []), true);
}

function curso_miembro_por_identificador(string $identificador): ?array {
    $identificador = trim($identificador);
    if ($identificador === '') return null;
    foreach (load_json('members', []) as $m) {
        if (!is_array($m)) continue;
        $id = (string)($m['id'] ?? '');
        $email = (string)($m['email'] ?? '');
        if ($id !== '' && hash_equals($id, $identificador)) return $m;
        if ($email !== '' && strcasecmp($email, $identificador) === 0) return $m;
    }
    return null;
}

function curso_asociados_detalle(array $curso): array {
    $ids = curso_asociados_ids($curso['asociados'] ?? []);
    if (!$ids) return [];
    $miembros = curso_miembros_por_id();
    $out = [];
    foreach ($ids as $id) {
        $m = $miembros[$id] ?? null;
        $out[] = [
            'id'     => $id,
            'nombre' => is_array($m) ? (string)($m['nombre'] ?? $id) : $id,
            'email'  => is_array($m) ? (string)($m['email'] ?? '') : '',
        ];
    }
    return $out;
}

/** Publicar cursos propios es cosa del asesor experto (o del administrador). */
function curso_puede_publicar(array $u): bool {
    return miembro_tiene_rol($u, 'admin') || miembro_tiene_rol($u, 'asesor');
}

function curso_slug(string $texto): string {
    $s = mb_strtolower(trim($texto));
    $s = strtr($s, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n','ü'=>'u']);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim((string)$s, '-');
}

/** Normaliza lo que llega del editor: nada entra sin pasar por aquí. */
function curso_saneado(array $in, array $base = []): array {
    $c = $base;

    if (array_key_exists('titulo', $in)) {
        $t = trim((string)$in['titulo']);
        if ($t === '' || mb_strlen($t) > 140) fail('El título debe tener entre 1 y 140 caracteres.', 422);
        $c['titulo'] = $t;
    }
    if (array_key_exists('descripcion', $in)) {
        $d = trim((string)$in['descripcion']);
        if (mb_strlen($d) > 600) fail('La descripción es demasiado larga (máx 600).', 422);
        $c['descripcion'] = $d;
    }
    if (array_key_exists('nivel', $in)) {
        $n = trim((string)$in['nivel']);
        if (!in_array($n, CURSO_NIVELES, true)) fail('Nivel inválido.', 422);
        $c['nivel'] = $n;
    }
    if (array_key_exists('categoria', $in)) {
        $g = mb_strtolower(trim((string)$in['categoria']));
        if (!in_array($g, CURSO_CATEGORIAS, true)) fail('Categoría inválida.', 422);
        $c['categoria'] = $g;
    }
    if (array_key_exists('acceso', $in)) {
        $a = mb_strtolower(trim((string)$in['acceso']));
        if (!in_array($a, CURSO_ACCESOS, true)) fail('Tipo de acceso inválido.', 422);
        $c['acceso'] = $a;
    }
    if (array_key_exists('duracion', $in)) {
        $d = trim((string)$in['duracion']);
        if (mb_strlen($d) > 40) fail('Duración inválida.', 422);
        $c['duracion'] = $d;
    }
    foreach (['introduccion' => 1200, 'cierre' => 1200] as $campo => $max) {
        if (array_key_exists($campo, $in)) {
            $v = trim((string)$in[$campo]);
            if (mb_strlen($v) > $max) fail("El campo $campo es demasiado largo.", 422);
            $c[$campo] = $v;
        }
    }
    foreach (['objetivos', 'recursos'] as $campo) {
        if (array_key_exists($campo, $in)) {
            $items = is_array($in[$campo]) ? $in[$campo] : [];
            $out = [];
            foreach ($items as $item) {
                $v = trim((string)$item);
                if ($v === '') continue;
                if (mb_strlen($v) > 300) $v = mb_substr($v, 0, 300);
                $out[] = $v;
                if (count($out) >= 12) break;
            }
            $c[$campo] = $out;
        }
    }
    if (array_key_exists('materiales', $in)) {
        $c['materiales'] = curso_materiales_saneados($in['materiales']);
    }
    if (array_key_exists('modulos', $in)) {
        $c['modulos'] = curso_modulos_saneados($in['modulos']);
    }
    $c['asociados'] = curso_asociados_ids($c['asociados'] ?? []);
    return $c;
}

/**
 * Material de apoyo del curso: archivos subidos a la Red y enlaces externos
 * (una inscripción a un curso presencial, un formulario, un vídeo).
 *
 * Los archivos solo pueden apuntar a /uploads/user-content/ —lo que la propia
 * plataforma guardó— y los enlaces, a https o a una ruta interna. Sin esto, un
 * autor podría colgar en su curso la dirección que quisiera y la Red estaría
 * llevando a sus miembros a cualquier parte.
 */
function curso_materiales_saneados($materiales): array {
    if (!is_array($materiales)) return [];
    $out = [];
    foreach ($materiales as $m) {
        if (!is_array($m)) continue;
        $tipo = mb_strtolower(trim((string)($m['tipo'] ?? '')));
        if (!in_array($tipo, ['archivo', 'enlace'], true)) continue;
        $url = trim((string)($m['url'] ?? ''));
        if ($url === '') continue;
        if ($tipo === 'archivo') {
            if (!preg_match('#^/uploads/user-content/[A-Za-z0-9._-]+$#', $url)) continue;
        } else {
            $interno = $url !== '' && $url[0] === '/' && strpos($url, '//') !== 0 && strpos($url, '..') === false;
            if (!$interno && !preg_match('#^https://[^\s]+$#i', $url)) continue;
            if (mb_strlen($url) > 400) continue;
        }
        $titulo = trim((string)($m['titulo'] ?? ''));
        if ($titulo === '') $titulo = $tipo === 'archivo' ? 'Documento del curso' : 'Enlace del curso';
        $out[] = [
            'tipo'   => $tipo,
            'titulo' => mb_substr($titulo, 0, 120),
            'url'    => $url,
            'nota'   => mb_substr(trim((string)($m['nota'] ?? '')), 0, 300),
        ];
        if (count($out) >= 12) break;
    }
    return $out;
}

function curso_modulos_saneados($modulos): array {
    if (!is_array($modulos)) return [];
    $out = [];
    foreach ($modulos as $m) {
        if (!is_array($m)) continue;
        $titulo = trim((string)($m['titulo'] ?? ''));
        if ($titulo === '') continue;
        if (mb_strlen($titulo) > 140) $titulo = mb_substr($titulo, 0, 140);

        $minutos = intval($m['minutos'] ?? 0);
        if ($minutos < 0 || $minutos > 600) $minutos = 0;

        $mod = ['titulo' => $titulo, 'minutos' => $minutos];

        $resumen = trim((string)($m['resumen'] ?? ''));
        if ($resumen !== '') $mod['resumen'] = mb_substr($resumen, 0, 800);

        $ejercicio = trim((string)($m['ejercicio'] ?? ''));
        if ($ejercicio !== '') $mod['ejercicio'] = mb_substr($ejercicio, 0, 1500);

        $lecciones = [];
        foreach ((array)($m['lecciones'] ?? []) as $l) {
            if (!is_array($l)) continue;
            $lt = trim((string)($l['titulo'] ?? ''));
            $lc = trim((string)($l['contenido'] ?? ''));
            $tieneBloques = !empty($l['bloques']) && is_array($l['bloques']);
            if ($lt === '' && $lc === '' && !$tieneBloques) continue;
            $leccion = [
                'titulo'    => mb_substr($lt, 0, 140),
                'contenido' => mb_substr($lc, 0, 6000),
            ];
            $bloques = curso_bloques_saneados($l['bloques'] ?? []);
            if ($bloques) $leccion['bloques'] = $bloques;
            $lecciones[] = $leccion;
            if (count($lecciones) >= MAX_LECCIONES) break;
        }
        if ($lecciones) $mod['lecciones'] = $lecciones;

        $out[] = $mod;
        if (count($out) >= MAX_MODULOS) break;
    }
    return $out;
}

/** Total de lecciones: es la base para calcular el porcentaje de avance. */
function curso_total_lecciones(array $curso): int {
    $n = 0;
    foreach ((array)($curso['modulos'] ?? []) as $m) {
        $n += count((array)($m['lecciones'] ?? []));
    }
    return $n;
}

function curso_resumen(array $c, array $completadas = []): array {
    $total = curso_total_lecciones($c);
    $hechas = 0;
    foreach ($completadas as $clave) {
        if (strpos((string)$clave, ($c['id'] ?? '') . '::') === 0) $hechas++;
    }
    return [
        'id'          => $c['id'] ?? '',
        'titulo'      => $c['titulo'] ?? '',
        'nivel'       => $c['nivel'] ?? '',
        'duracion'    => $c['duracion'] ?? '',
        'categoria'   => $c['categoria'] ?? '',
        'descripcion' => $c['descripcion'] ?? '',
        'autor'       => $c['autor'] ?? 'Red Café Ecuador',
        'autor_id'    => $c['autor_id'] ?? '',
        'modulos'     => count((array)($c['modulos'] ?? [])),
        'lecciones'   => $total,
        'completadas' => min($hechas, $total),
        'avance'      => $total > 0 ? (int)round(($hechas / $total) * 100) : 0,
        'listo'       => $total > 0,
        'verificado'    => !empty($c['verificado']),
        'verificado_en' => $c['verificado_en'] ?? null,
        'verificado_por'=> $c['verificado_por'] ?? '',
    ];
}


/* ─── Acceso al curso ────────────────────────────────────────────────────
 * Un curso puede ser abierto o exigir aprobación de quien lo creó. En el
 * segundo caso el miembro solicita acceso, el autor lo aprueba o lo rechaza,
 * y hasta entonces solo ve la portada: temario, objetivos y duración.
 */

const CURSO_ACCESOS = ['abierto', 'aprobacion'];

function inscripciones_todas(): array {
    $i = load_json('inscripciones-cursos', []);
    return is_array($i) ? $i : [];
}

function inscripcion_clave(string $cursoId, string $uid): string {
    return $cursoId . '::' . $uid;
}

function inscripcion_estado(string $cursoId, string $uid): string {
    if ($uid === '') return 'anonimo';
    $todas = inscripciones_todas();
    $i = $todas[inscripcion_clave($cursoId, $uid)] ?? null;
    return is_array($i) ? (string)($i['estado'] ?? 'pendiente') : 'ninguno';
}

/** ¿Puede este usuario ver el contenido completo del curso? */
/**
 * ¿Puede esta persona ver el CONTENIDO del curso?
 *
 * Hay dos puertas y las dos deben estar abiertas:
 *
 *   1. **Matrícula.** Todo curso exige inscribirse antes de estudiarlo, aunque
 *      sea de acceso libre. Quien no se ha matriculado ve el temario y el
 *      resumen, no las lecciones. Sin esto no se sabe quién está estudiando
 *      qué, y el avance no significa nada.
 *   2. **Aprobación**, solo en los cursos con `acceso: aprobacion`: además de
 *      matricularse, el autor tiene que decir que sí.
 *
 * El autor y la administración entran siempre: no se matriculan en su propio
 * curso.
 */
function curso_acceso_concedido(array $curso, ?array $u): bool {
    // Un único curso puede marcarse como muestra pública (sin cuenta) para
    // que un visitante nuevo vea contenido real antes de registrarse. Decisión
    // explícita del dueño: solo el curso que lo tenga marcado, todos los demás
    // siguen exigiendo cuenta.
    if (!empty($curso['publico'])) return true;
    // La sesión de /admin/ (contraseña separada, sin cuenta de miembro) también
    // administra cursos: miembro_tiene_rol ya reconoce $_SESSION['admin'], solo
    // hace falta no cortar aquí cuando no hay $u.
    if (!$u && empty($_SESSION['admin'])) return false;        // sin cuenta ni admin, no hay contenido
    if (curso_es_autor_o_asociado($curso, $u)) return true;

    $estado = inscripcion_estado((string)($curso['id'] ?? ''), (string)($u['id'] ?? ''));
    if (($curso['acceso'] ?? 'abierto') === 'aprobacion') {
        return $estado === 'aprobado';
    }
    // Curso abierto: basta con estar matriculado.
    return in_array($estado, ['matriculado', 'aprobado'], true);
}

/** Miembro con sesión, o la sesión de /admin/ (contraseña separada, sin cuenta
 * propia) representada como un usuario admin sintético. Mismo patrón que
 * `req_usuario_actual_o_admin()` en requerimientos.php: el admin real de este
 * proyecto entra por /admin/ y no siempre tiene una cuenta de miembro. */
function curso_usuario_o_admin(): array {
    $u = current_user();
    if ($u) return $u;
    if (!empty($_SESSION['admin'])) {
        return ['id' => 'admin', 'nombre' => 'Administración', 'rol' => 'admin', 'roles' => ['admin']];
    }
    fail('No autenticado.', 401);
}

/** ¿Está matriculada esta persona, con independencia de la aprobación? */
function curso_matriculado(array $curso, ?array $u): bool {
    if (!$u) return false;
    if (curso_es_autor_o_asociado($curso, $u)) return true;
    $estado = inscripcion_estado((string)($curso['id'] ?? ''), (string)($u['id'] ?? ''));
    return in_array($estado, ['matriculado', 'pendiente', 'aprobado'], true);
}

/** Copia del curso sin el contenido de las lecciones, para la portada. */
function curso_sin_contenido(array $c): array {
    $out = $c;
    unset($out['asociados']);
    // El material de apoyo es contenido del curso: en la portada solo se dice
    // cuántas piezas trae, no dónde están.
    $out['materiales_count'] = count((array)($c['materiales'] ?? []));
    unset($out['materiales']);
    $out['modulos'] = array_map(function ($m) {
        return [
            'titulo'  => $m['titulo'] ?? '',
            'minutos' => $m['minutos'] ?? 0,
            'resumen' => $m['resumen'] ?? '',
            'lecciones' => array_map(function ($l) {
                return ['titulo' => $l['titulo'] ?? ''];   // solo el índice
            }, (array)($m['lecciones'] ?? [])),
        ];
    }, (array)($c['modulos'] ?? []));
    return $out;
}

/* ─── Avance del miembro ─────────────────────────────────────────────────── */

function progreso_todo(): array {
    $p = load_json('progreso-cursos', []);
    return is_array($p) ? $p : [];
}

function progreso_de(string $uid): array {
    $todo = progreso_todo();
    $mio = $todo[$uid] ?? [];
    return is_array($mio) ? $mio : [];
}

/* ─── Gente matriculada: la vista del autor ─────────────────────────────────
 * La privacidad de los datos de contacto es la regla que no se negocia: el
 * correo y el teléfono de un estudiante salen solo a quien es autor del curso
 * (o a la administración, que ve igual) y solo cuando esa persona está
 * matriculada en ESE curso: nunca en listados generales, nunca a otros
 * miembros. Un "pendiente" o "rechazado" no está matriculado: sin datos.
 */

/** Un miembro por id, indexado para no recorrer members.json a cada fila. */
function curso_miembros_por_id(): array {
    $out = [];
    foreach (load_json('members', []) as $m) {
        if (!is_array($m)) continue;
        $out[(string)($m['id'] ?? '')] = $m;
    }
    return $out;
}

/** Fecha de la última vez que esta persona avanzó (o su matrícula, si no hay avance). */
function curso_ultima_actividad(array $inscripcion, array $progresoDe): string {
    $act = (string)($progresoDe['actualizado'] ?? '');
    if ($act !== '') return $act;
    return (string)($inscripcion['solicitado'] ?? '');
}

/**
 * Detalle de un curso para su autor: estudiantes, avance y totales.
 * `$curso` debe ser de quien consulta (o administrable): el filtrado se hace
 * antes de llamar aquí. Devuelve también qué campos de contacto se pueden
 * pintar, porque no solo depende del estado: el consentimiento guardado al
 * matricularse y el estado real de la inscripción.
 */
function curso_estudiantes_autor(array $curso, array $inscripciones, array $progreso, array $miembros): array {
    $cursoId   = (string)($curso['id'] ?? '');
    $total     = curso_total_lecciones($curso);
    $completadasDe = function (array $p) use ($cursoId): array {
        return array_values(array_filter(
            (array)($p['completadas'] ?? []),
            fn($k) => strpos((string)$k, $cursoId . '::') === 0
        ));
    };

    $estudiantes = [];
    $totales = ['pendiente' => 0, 'matriculado' => 0, 'aprobado' => 0, 'rechazado' => 0];
    $sumaAvance = 0;
    $enrolados = 0;

    foreach ($inscripciones as $clave => $i) {
        if (!is_array($i)) continue;
        if ((string)($i['curso'] ?? '') !== $cursoId) continue;

        $uid = (string)($i['usuario'] ?? '');
        $miembro = $miembros[$uid] ?? null;
        $estado = (string)($i['estado'] ?? 'pendiente');
        $totales[$estado] = ($totales[$estado] ?? 0) + 1;

        $prog = (is_array($progreso[$uid] ?? null)) ? $progreso[$uid] : [];
        $hechas = count($completadasDe($prog));
        $avance = $total > 0 ? (int)round(($hechas / $total) * 100) : 0;
        if (in_array($estado, ['matriculado', 'aprobado'], true)) {
            $enrolados++;
            $sumaAvance += $avance;
        }

        // Contacto: solo matriculados en este curso y con consentimiento
        // vigente. Las inscripciones anteriores a esta regla se tratan como
        // consentidas (entraron por el flujo de «matricularme»); cualquiera
        // con un «no» explícito queda sin datos.
        $contacto = false;
        if (in_array($estado, ['matriculado', 'aprobado'], true)
            && ($i['contacto_visible_autor'] ?? true) !== false) {
            $contacto = true;
        }

        $miembroId = $uid;
        $nombre = (string)($miembro['nombre'] ?? ($i['nombre'] ?? ''));
        $roles = is_array($miembro) ? miembro_roles($miembro) : [];
        $perfil = implode(' · ', $roles ?: [(string)($i['rol'] ?? '')]);

        $estudiantes[] = [
            'usuario_id'        => $uid,
            'nombre'            => $nombre,
            'perfil'            => $perfil,
            'rol'               => (string)($roles[0] ?? ''),
            'provincia'         => (string)($miembro['provincia'] ?? ''),
            'estado'            => $estado,
            'fecha'             => (string)($i['solicitado'] ?? ''),
            'avance_pct'        => $avance,
            'completadas'       => $hechas,
            'ultima_actividad'  => curso_ultima_actividad($i, $prog),
            'contacto_visible'  => $contacto,
            'contacto_visible_autor' => ($i['contacto_visible_autor'] ?? true),
            'email'             => $contacto ? (string)($miembro['email'] ?? '') : null,
            'telefono'          => $contacto ? (string)($miembro['telefono'] ?? '') : null,
            'whatsapp'          => $contacto ? redcafe_whatsapp_link_digits((string)($miembro['telefono'] ?? '')) : '',
        ];
    }

    usort($estudiantes, fn($a, $b) => strcmp((string)($b['fecha'] ?? ''), (string)($a['fecha'] ?? '')));

    return [
        'estudiantes' => $estudiantes,
        'totales'     => $totales,
        'avance_medio' => $enrolados > 0 ? (int)round($sumaAvance / $enrolados) : 0,
        'matriculados' => ($totales['matriculado'] ?? 0) + ($totales['aprobado'] ?? 0),
        'pendientes'  => $totales['pendiente'] ?? 0,
    ];
}

/**
 * Cursos propios de quien consulta (o todos, si es administración), listos
 * para la vista del autor. Opcionalmente filtra por uno solo.
 */
function curso_autor_cursos(array $u, string $filtroCurso = ''): array {
    $esAdmin = miembro_tiene_rol($u, 'admin');
    $uid = (string)($u['id'] ?? '');
    $mios = array_values(array_filter(cursos_todos(), function ($c) use ($u) {
        return curso_es_autor_o_asociado($c, $u);
    }));
    if ($filtroCurso !== '') {
        $encontrado = null;
        foreach ($mios as $c) {
            if ((string)($c['id'] ?? '') === $filtroCurso) { $encontrado = $c; break; }
        }
        if (!$encontrado) fail('No autorizado: ese curso no es tuyo.', 403);
        return [$encontrado];
    }
    return $mios;
}

function curso_etiqueta_estado(string $estado): string {
    $etiquetas = ['pendiente' => 'Pendiente', 'matriculado' => 'Matriculado', 'aprobado' => 'Aprobado', 'rechazado' => 'Rechazado'];
    return $etiquetas[$estado] ?? $estado;
}

/** Celda de CSV con separador «;» apta para Excel en español. */
function curso_csv_celda(string $v): string {
    $v = trim($v);
    // Inyección CSV: Excel evalúa como fórmula lo que empieza por = + - @.
    if ($v !== '' && strpbrk($v[0], "=+-@\t\r") !== false) $v = "'" . $v;
    if (strpbrk($v, ";\n\"") !== false) {
        $v = '"' . str_replace('"', '""', $v) . '"';
    }
    return $v;
}

/* ─── Acciones ───────────────────────────────────────────────────────────── */

// LIST: público. Con sesión abierta añade el avance de quien consulta.
if ($action === 'list') {
    $cursos = cursos_todos();
    $u = current_user();
    $completadas = $u ? (array)(progreso_de($u['id'] ?? '')['completadas'] ?? []) : [];
    $out = array_map(fn($c) => curso_resumen($c, $completadas), $cursos);
    ok(['cursos' => $out, 'autenticado' => (bool)$u]);
}

// GET: público. Devuelve el curso completo y, con sesión, qué lecciones llevas.
if ($action === 'get') {
    $id = trim((string)($_GET['id'] ?? ''));
    if ($id === '') fail('id requerido.', 422);
    $curso = curso_por_id(cursos_todos(), $id);
    if (!$curso) fail('Curso no encontrado.', 404);

    $u = current_user();
    $mio = $u ? progreso_de($u['id'] ?? '') : [];
    $completadas = (array)($mio['completadas'] ?? []);
    $propias = array_values(array_filter($completadas, fn($k) => strpos((string)$k, $id . '::') === 0));

    $concedido = curso_acceso_concedido($curso, $u);
    ok([
        'curso'         => $concedido ? $curso : curso_sin_contenido($curso),
        'total'         => curso_total_lecciones($curso),
        'completadas'   => $concedido ? $propias : [],
        'avance'        => $concedido ? curso_resumen($curso, $completadas)['avance'] : 0,
        'puede_editar'  => $u ? curso_puede_editar($curso, $u) : false,
        'acceso'        => $curso['acceso'] ?? 'abierto',
        'acceso_concedido' => $concedido,
        'matriculado'   => curso_matriculado($curso, $u),
        'mi_solicitud'  => $u ? inscripcion_estado($id, (string)($u['id'] ?? '')) : 'anonimo',
    ]);
}

// PROGRESO: avance del miembro en toda la academia.
if ($action === 'progreso') {
    $u = require_user();
    $mio = progreso_de($u['id'] ?? '');
    $completadas = (array)($mio['completadas'] ?? []);
    $cursos = cursos_todos();
    $detalle = array_map(fn($c) => curso_resumen($c, $completadas), $cursos);
    $conAvance = array_values(array_filter($detalle, fn($c) => $c['completadas'] > 0));
    $terminados = array_values(array_filter($detalle, fn($c) => $c['lecciones'] > 0 && $c['completadas'] >= $c['lecciones']));
    ok([
        'cursos'      => $detalle,
        'en_curso'    => count($conAvance) - count($terminados),
        'terminados'  => count($terminados),
        'completadas' => count($completadas),
    ]);
}

// COMPLETAR: marca (o desmarca) una lección. Cualquier perfil puede avanzar.
if ($action === 'completar') {
    $u = require_user();
    $cursoId = trim((string)($in['curso'] ?? ''));
    $modulo = intval($in['modulo'] ?? -1);
    $leccion = intval($in['leccion'] ?? -1);
    $hecho = array_key_exists('hecho', $in) ? filter_var($in['hecho'], FILTER_VALIDATE_BOOLEAN) : true;

    if ($cursoId === '' || $modulo < 0 || $leccion < 0) fail('Curso, módulo y lección requeridos.', 422);

    $curso = curso_por_id(cursos_todos(), $cursoId);
    if (!$curso) fail('Curso no encontrado.', 404);
    $modulos = (array)($curso['modulos'] ?? []);
    if (!isset($modulos[$modulo])) fail('Módulo no encontrado.', 404);
    if (!isset(((array)($modulos[$modulo]['lecciones'] ?? []))[$leccion])) fail('Lección no encontrada.', 404);

    // Un curso marcado como público permite leer sin cuenta, pero el avance
    // pertenece al expediente de matrícula y no se crea antes de inscribirse.
    if (!empty($curso['publico']) && !curso_es_autor_o_asociado($curso, $u)
        && !in_array(inscripcion_estado($cursoId, (string)($u['id'] ?? '')), ['matriculado', 'aprobado'], true)) {
        fail('Matricúlate gratis para guardar tu avance.', 403);
    }
    if (!curso_acceso_concedido($curso, $u)) {
        // El mensaje distingue las dos puertas: matricularse es cosa del
        // alumno; la aprobación depende del autor.
        fail(($curso['acceso'] ?? 'abierto') === 'aprobacion'
            ? 'Necesitas que el autor apruebe tu acceso a este curso.'
            : 'Matricúlate en el curso antes de registrar tu avance.', 403);
    }

    $clave = $cursoId . '::' . $modulo . '::' . $leccion;
    $uid = (string)($u['id'] ?? '');

    $resultado = null;
    mutate_json('progreso-cursos', [], function ($todo) use ($uid, $clave, $hecho, &$resultado) {
        if (!isset($todo[$uid]) || !is_array($todo[$uid])) {
            $todo[$uid] = ['completadas' => [], 'actualizado' => now_iso()];
        }
        $lista = (array)($todo[$uid]['completadas'] ?? []);
        $lista = array_values(array_filter($lista, fn($k) => $k !== $clave));
        if ($hecho) $lista[] = $clave;
        $todo[$uid]['completadas'] = $lista;
        $todo[$uid]['actualizado'] = now_iso();
        $resultado = $lista;
        return $todo;
    });

    $propias = array_values(array_filter((array)$resultado, fn($k) => strpos((string)$k, $cursoId . '::') === 0));
    $total = curso_total_lecciones($curso);
    ok([
        'completadas' => $propias,
        'total'       => $total,
        'avance'      => $total > 0 ? (int)round((count($propias) / $total) * 100) : 0,
    ]);
}

// REINICIAR: borra el avance del miembro en un curso.
if ($action === 'reiniciar') {
    $u = require_user();
    $cursoId = trim((string)($in['curso'] ?? ''));
    if ($cursoId === '') fail('Curso requerido.', 422);
    $uid = (string)($u['id'] ?? '');
    mutate_json('progreso-cursos', [], function ($todo) use ($uid, $cursoId) {
        if (!isset($todo[$uid])) return $todo;
        $lista = (array)($todo[$uid]['completadas'] ?? []);
        $todo[$uid]['completadas'] = array_values(array_filter(
            $lista, fn($k) => strpos((string)$k, $cursoId . '::') !== 0
        ));
        $todo[$uid]['actualizado'] = now_iso();
        return $todo;
    });
    ok(['reiniciado' => $cursoId]);
}

// SOLICITAR ACCESO: el miembro pide entrar a un curso con aprobación.
/* MATRICULA: inscribirse en un curso antes de estudiarlo.
   En un curso abierto basta con esto. En uno moderado, además hay que esperar
   el visto bueno del autor, así que la matrícula queda "pendiente" y se avisa
   al autor igual que en solicitar_acceso. */
if ($action === 'matricular') {
    $u = require_user();
    $cursoId = trim((string)($in['curso'] ?? ''));
    if ($cursoId === '') fail('Curso requerido.', 422);
    $curso = curso_por_id(cursos_todos(), $cursoId);
    if (!$curso) fail('Curso no encontrado.', 404);

    $uid = (string)($u['id'] ?? '');
    if (curso_es_autor_o_asociado($curso, $u)) {
        ok(['estado' => 'aprobado', 'mensaje' => 'Es tu propio curso: no necesitas matricularte.']);
    }

    $moderado = ($curso['acceso'] ?? 'abierto') === 'aprobacion';
    $previo = inscripcion_estado($cursoId, $uid);
    if (in_array($previo, ['matriculado', 'aprobado'], true)) {
        ok(['estado' => $previo, 'mensaje' => 'Ya estabas matriculado.']);
    }
    if ($previo === 'pendiente') {
        ok(['estado' => 'pendiente', 'mensaje' => 'Tu solicitud sigue esperando respuesta del autor.']);
    }

    $estadoNuevo = $moderado ? 'pendiente' : 'matriculado';
    mutate_json('inscripciones-cursos', [], function ($todas) use ($cursoId, $uid, $u, $estadoNuevo) {
        // La matrícula deja constancia del consentimiento de contacto: al
        // matricularte, el autor de ESTE curso puede ver tu nombre, tu avance
        // y tus datos de contacto (la interfaz lo advierte antes de pulsar).
        $todas[inscripcion_clave($cursoId, $uid)] = [
            'curso'                 => $cursoId,
            'usuario'               => $uid,
            'nombre'                => $u['nombre'] ?? '',
            'email'                 => $u['email'] ?? '',
            'estado'                => $estadoNuevo,
            'mensaje'               => '',
            'solicitado'            => now_iso(),
            'contacto_visible_autor'=> true,
            'contacto_visible_en'   => now_iso(),
        ];
        return $todas;
    });

    registrar_actividad('curso-matricula', [
        'objeto_tipo' => 'curso',
        'objeto_id'   => $cursoId,
        'detalle'     => (string)($curso['titulo'] ?? $cursoId),
    ]);

    if ($moderado) {
        notificar((string)($curso['autor_id'] ?? ''), 'curso-acceso',
            ($u['nombre'] ?? 'Un miembro') . ' quiere matricularse en «' . (string)($curso['titulo'] ?? $cursoId) . '»',
            'Resuélvelo desde la academia.', '/academia/' . rawurlencode($cursoId) . '/');
        ok(['estado' => 'pendiente',
            'mensaje' => 'Este curso lo modera su autor. Te avisaremos cuando responda.']);
    }

    notificar($uid, 'curso',
        'Te matriculaste en «' . (string)($curso['titulo'] ?? $cursoId) . '»',
        'Ya puedes estudiarlo y tu avance queda registrado.', '/academia/' . rawurlencode($cursoId) . '/');

    // Nueva matrícula: el autor se entera y sabe de quién es. En los cursos
    // de la Red no hay autor_id, así que notificar no hace nada — y bien.
    $autorId = (string)($curso['autor_id'] ?? '');
    if ($autorId !== '') {
        notificar($autorId, 'curso',
            ($u['nombre'] ?? 'Un miembro') . ' se matriculó en «' . (string)($curso['titulo'] ?? $cursoId) . '»',
            'Ya puedes ver su avance y sus datos de contacto desde el panel.', '/panel/');
    }
    ok(['estado' => 'matriculado', 'mensaje' => 'Matrícula hecha. Ya puedes empezar.']);
}

/* Baja voluntaria: el avance se conserva por si vuelve. */
if ($action === 'desmatricular') {
    $u = require_user();
    $cursoId = trim((string)($in['curso'] ?? ''));
    if ($cursoId === '') fail('Curso requerido.', 422);
    $uid = (string)($u['id'] ?? '');
    mutate_json('inscripciones-cursos', [], function ($todas) use ($cursoId, $uid) {
        unset($todas[inscripcion_clave($cursoId, $uid)]);
        return $todas;
    });
    ok(['estado' => 'ninguno']);
}

if ($action === 'solicitar_acceso') {
    $u = require_user();
    $cursoId = trim((string)($in['curso'] ?? ''));
    if ($cursoId === '') fail('Curso requerido.', 422);
    $curso = curso_por_id(cursos_todos(), $cursoId);
    if (!$curso) fail('Curso no encontrado.', 404);

    if (($curso['acceso'] ?? 'abierto') !== 'aprobacion') {
        ok(['estado' => 'aprobado', 'mensaje' => 'Este curso es de acceso libre.']);
    }
    $uid = (string)($u['id'] ?? '');
    if (curso_es_autor_o_asociado($curso, $u)) {
        ok(['estado' => 'aprobado', 'mensaje' => 'Es tu propio curso.']);
    }

    $nota = trim((string)($in['mensaje'] ?? ''));
    if (mb_strlen($nota) > 400) fail('El mensaje es demasiado largo (máx 400).', 422);

    $estadoFinal = 'pendiente';
    mutate_json('inscripciones-cursos', [], function ($todas) use ($cursoId, $uid, $u, $nota, &$estadoFinal) {
        $k = $cursoId . '::' . $uid;
        $previa = $todas[$k] ?? null;
        // Una solicitud ya resuelta no se pisa: si fue aprobada sigue valiendo.
        if (is_array($previa) && ($previa['estado'] ?? '') === 'aprobado') {
            $estadoFinal = 'aprobado';
            return $todas;
        }
        $todas[$k] = [
            'curso'       => $cursoId,
            'usuario'     => $uid,
            'nombre'      => $u['nombre'] ?? '',
            'email'       => $u['email'] ?? '',
            'estado'      => 'pendiente',
            'mensaje'     => $nota,
            'solicitado'  => now_iso(),
            'contacto_visible_autor'=> true,
            'contacto_visible_en'   => now_iso(),
        ];
        return $todas;
    });
    if ($estadoFinal === 'pendiente') {
        notificar((string)($curso['autor_id'] ?? ''), 'curso-acceso',
            ($u['nombre'] ?? 'Un miembro') . ' pide acceso a «' . (string)($curso['titulo'] ?? $cursoId) . '»',
            $nota !== '' ? $nota : 'Sin mensaje. Resuélvelo desde la academia.',
            '/academia/' . rawurlencode($cursoId) . '/');
        registrar_actividad('curso-acceso-solicitado', [
            'objeto_tipo' => 'curso',
            'objeto_id'   => $cursoId,
            'detalle'     => 'Solicitud de acceso a ' . (string)($curso['titulo'] ?? $cursoId),
            'contraparte' => (string)($curso['autor'] ?? ''),
        ]);
    }
    ok(['estado' => $estadoFinal]);
}

// SOLICITUDES: las que esperan respuesta del autor (o todas, si es admin).
if ($action === 'solicitudes') {
    $u = require_user();
    $esAdmin = miembro_tiene_rol($u, 'admin');
    $uid = (string)($u['id'] ?? '');
    $cursos = cursos_todos();

    $mios = [];
    foreach ($cursos as $c) {
        if (curso_es_autor_o_asociado($c, $u)) {
            $mios[(string)($c['id'] ?? '')] = $c['titulo'] ?? '';
        }
    }

    $out = [];
    foreach (inscripciones_todas() as $k => $i) {
        if (!is_array($i)) continue;
        $cid = (string)($i['curso'] ?? '');
        if (!isset($mios[$cid])) continue;
        $i['curso_titulo'] = $mios[$cid];
        $i['clave'] = $k;
        $out[] = $i;
    }
    usort($out, fn($a, $b) => strcmp((string)($b['solicitado'] ?? ''), (string)($a['solicitado'] ?? '')));
    ok(['solicitudes' => $out, 'pendientes' => count(array_filter($out, fn($i) => ($i['estado'] ?? '') === 'pendiente'))]);
}

// RESOLVER ACCESO: el autor del curso aprueba o rechaza.
if ($action === 'resolver_acceso') {
    $u = require_user();
    $cursoId = trim((string)($in['curso'] ?? ''));
    $usuarioId = trim((string)($in['usuario'] ?? ''));
    $decision = mb_strtolower(trim((string)($in['decision'] ?? '')));
    if ($cursoId === '' || $usuarioId === '') fail('Curso y usuario requeridos.', 422);
    if (!in_array($decision, ['aprobado', 'rechazado', 'pendiente'], true)) fail('Decisión inválida.', 422);

    $curso = curso_por_id(cursos_todos(), $cursoId);
    if (!$curso) fail('Curso no encontrado.', 404);
    if (!curso_es_autor_o_asociado($curso, $u)) {
        fail('Solo el autor del curso, una persona asociada o un administrador puede resolver el acceso.', 403);
    }

    $encontrada = false;
    mutate_json('inscripciones-cursos', [], function ($todas) use ($cursoId, $usuarioId, $decision, $u, &$encontrada) {
        $k = $cursoId . '::' . $usuarioId;
        if (!isset($todas[$k]) || !is_array($todas[$k])) return $todas;
        $todas[$k]['estado'] = $decision;
        $todas[$k]['resuelto'] = now_iso();
        $todas[$k]['resuelto_por'] = $u['id'] ?? '';
        $encontrada = true;
        return $todas;
    });
    if (!$encontrada) fail('No hay solicitud de ese miembro para este curso.', 404);
    $titulo = (string)($curso['titulo'] ?? $cursoId);
    $mensajes = [
        'aprobado'  => ['Ya tienes acceso a «' . $titulo . '»', 'Puedes empezar el curso y registrar tu avance.'],
        'rechazado' => ['Tu solicitud de acceso a «' . $titulo . '» no fue aprobada', 'Puedes escribir al autor si necesitas revisarlo.'],
        'pendiente' => ['Tu acceso a «' . $titulo . '» vuelve a estar pendiente', 'El autor lo revisará de nuevo.'],
    ];
    notificar($usuarioId, 'curso-acceso', $mensajes[$decision][0], $mensajes[$decision][1], '/academia/' . rawurlencode($cursoId) . '/');
    registrar_actividad('curso-acceso-' . $decision, [
        'objeto_tipo' => 'curso',
        'objeto_id'   => $cursoId,
        'detalle'     => $titulo,
        'contraparte' => aviso_nombre_miembro($usuarioId),
    ]);
    ok(['curso' => $cursoId, 'usuario' => $usuarioId, 'estado' => $decision]);
}

// MATRICULADOS: la vista de estudiante del autor del curso (o de la
// administración). Por cada curso propio devuelve su gente con avance, y los
// datos de contacto solo de quienes están matriculados en ESE curso.
if ($action === 'matriculados') {
    $u = curso_usuario_o_admin();
    $mios = curso_autor_cursos($u, trim((string)($_GET['curso'] ?? '')));
    if (!$mios) fail('Aún no tienes cursos propios.', 404);

    $inscripciones = inscripciones_todas();
    $progreso = progreso_todo();
    $miembros = curso_miembros_por_id();

    $uid = (string)($u['id'] ?? '');
    $esAdmin = miembro_tiene_rol($u, 'admin');
    $cursos = array_map(function ($c) use ($inscripciones, $progreso, $miembros, $uid, $esAdmin) {
        $detalle = curso_estudiantes_autor($c, $inscripciones, $progreso, $miembros);
        $gestionaAsociados = (string)($c['autor_id'] ?? '') !== '' && (string)($c['autor_id'] ?? '') === $uid;
        return [
            'curso'      => (string)($c['id'] ?? ''),
            'titulo'     => (string)($c['titulo'] ?? ''),
            'acceso'     => $c['acceso'] ?? 'abierto',
            'autor_id'   => $c['autor_id'] ?? '',
            'puede_gestionar_asociados' => $gestionaAsociados,
            'asociados'  => $gestionaAsociados ? curso_asociados_detalle($c) : [],
            'total_lecciones' => curso_total_lecciones($c),
            'resumen'    => [
                'matriculados'  => (int)($detalle['matriculados'] ?? 0),
                'pendientes'    => (int)($detalle['pendientes'] ?? 0),
                'avance_medio'  => (int)($detalle['avance_medio'] ?? 0),
            ],
            'totales'    => $detalle['totales'],
            'estudiantes'=> $detalle['estudiantes'],
        ];
    }, $mios);

    ok(['cursos' => $cursos]);
}

// EXPORTAR: el mismo listado que matriculados, en CSV para Excel (BOM UTF-8
// y «;», que es lo que la hoja de cálculo en español reconoce).
if ($action === 'exportar') {
    $u = curso_usuario_o_admin();
    $mios = curso_autor_cursos($u, trim((string)($_GET['curso'] ?? '')));
    $inscripciones = inscripciones_todas();
    $progreso = progreso_todo();
    $miembros = curso_miembros_por_id();

    $filas = [];
    $cabecera = ['Curso', 'Nombre', 'Perfil', 'Provincia', 'Estado', 'Fecha matrícula', 'Avance %', 'Última actividad', 'Correo', 'Teléfono'];
    $filas[] = $cabecera;

    foreach ($mios as $c) {
        $detalle = curso_estudiantes_autor($c, $inscripciones, $progreso, $miembros);
        foreach ($detalle['estudiantes'] as $e) {
            $filas[] = [
                (string)($c['titulo'] ?? ''),
                (string)$e['nombre'],
                (string)$e['perfil'],
                (string)$e['provincia'],
                curso_etiqueta_estado((string)$e['estado']),
                mb_substr((string)$e['fecha'], 0, 10),
                (string)$e['avance_pct'] . ' %',
                mb_substr((string)$e['ultima_actividad'], 0, 10),
                (string)($e['email'] ?? ''),
                (string)($e['telefono'] ?? ''),
            ];
        }
    }

    $csv = "\xEF\xBB\xBF";   // BOM UTF-8: Excel lo abre sin tilde perdida.
    foreach ($filas as $fila) {
        $csv .= implode(';', array_map('curso_csv_celda', $fila)) . "\r\n";
    }

    $nombre = count($mios) === 1
        ? 'redcafe-estudiantes-' . curso_slug((string)($mios[0]['titulo'] ?? 'curso')) . '.csv'
        : 'redcafe-estudiantes-' . ($_GET['curso'] !== '' ? curso_slug((string)($_GET['curso'] ?? '')) . '-' : '') . date('Ymd') . '.csv';

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $nombre . '"');
    header('Content-Length: ' . strlen($csv));
    header('Cache-Control: no-store');
    echo $csv;
    exit;
}

// RECORDAR: aviso interno a quienes llevan más de N días sin avanzar en un
// curso propio. Un aviso por curso por semana: la marca se guarda en el propio
// curso.
if ($action === 'recordar') {
    $u = curso_usuario_o_admin();
    $cursoId = trim((string)($in['curso'] ?? ($_GET['curso'] ?? '')));
    if ($cursoId === '') fail('Curso requerido.', 422);
    $dias = intval($in['dias'] ?? ($_GET['dias'] ?? 30));
    if ($dias < 1 || $dias > 365) $dias = 30;

    $cursos = cursos_todos();
    $curso = curso_por_id($cursos, $cursoId);
    if (!$curso) fail('Curso no encontrado.', 404);
    if (!curso_puede_editar($curso, $u)) {
        fail('Solo el autor del curso o un administrador puede avisar.', 403);
    }

    // Tope: una vez cada 7 días por curso. La marca vive en el propio curso.
    $previo = strtotime((string)($curso['recordatorio_inactivos_en'] ?? '')) ?: 0;
    if ($previo && time() - $previo < 7 * 86400) {
        $queda = (int)ceil((($previo + 7 * 86400) - time()) / 86400);
        fail('Ya avisaste a los inactivos de este curso esta semana. Vuelve en ' . $queda . ' día(s).', 429);
    }

    // Quiénes se avisan: matriculados/aprobados sin avanzar en $dias días.
    $inscripciones = inscripciones_todas();
    $progreso = progreso_todo();
    $miembros = curso_miembros_por_id();
    $detalle = curso_estudiantes_autor($curso, $inscripciones, $progreso, $miembros);

    $avisados = [];
    foreach ($detalle['estudiantes'] as $e) {
        if (!in_array($e['estado'], ['matriculado', 'aprobado'], true)) continue;
        $ultima = strtotime($e['ultima_actividad']) ?: time();
        if (time() - $ultima < $dias * 86400) continue;
        $avisados[] = (string)$e['usuario_id'];
    }

    $tituloCurso = (string)($curso['titulo'] ?? $cursoId);
    foreach ($avisados as $uid) {
        notificar($uid, 'curso',
            '¿Sigues con «' . $tituloCurso . '»?',
            'Hace más de ' . $dias . ' días que no avanzas en este curso. Tu avance está guardado: continúa donde lo dejaste.',
            '/academia/' . rawurlencode($cursoId) . '/');
    }

    // La marca se reserva dentro del mismo bloque de escritura del curso.
    $guardado = false;
    foreach ($cursos as &$cc) {
        if (($cc['id'] ?? '') !== $cursoId) continue;
        $cc['recordatorio_inactivos_en'] = now_iso();
        $cc['recordatorio_inactivos_dias'] = $dias;
        $cc['recordatorio_inactivos_n'] = count($avisados);
        $guardado = true;
        break;
    }
    unset($cc);
    if ($guardado) save_json('contenido-cursos', $cursos);

    ok(['avisados' => count($avisados), 'dias' => $dias, 'curso' => $cursoId]);
}

if ($action === 'asociar' || $action === 'desasociar') {
    $u = require_user();
    $cursoId = trim((string)($in['curso'] ?? ($_GET['curso'] ?? '')));
    if ($cursoId === '') fail('Curso requerido.', 422);
    $uid = (string)($u['id'] ?? '');

    $identificador = trim((string)($in['miembro'] ?? $in['usuario'] ?? $in['email'] ?? $in['id'] ?? ''));
    if ($identificador === '') fail('Miembro requerido.', 422);

    $miembro = curso_miembro_por_identificador($identificador);
    if (!$miembro) fail('Miembro no encontrado.', 404);
    $miembroId = (string)($miembro['id'] ?? '');
    if ($miembroId === '') fail('Miembro inválido.', 422);

    $cursos = cursos_todos();
    $encontrado = false;
    $actualizado = null;
    foreach ($cursos as &$c) {
        if ((string)($c['id'] ?? '') !== $cursoId) continue;
        $encontrado = true;
        if ((string)($c['autor_id'] ?? '') !== $uid) {
            fail('Solo el autor real del curso puede gestionar personas asociadas.', 403);
        }
        if ($miembroId === (string)($c['autor_id'] ?? '')) {
            fail('El autor del curso no necesita asociarse.', 422);
        }
        $asociados = curso_asociados_ids($c['asociados'] ?? []);
        if ($action === 'asociar') {
            if (in_array($miembroId, $asociados, true)) fail('Ese miembro ya está asociado al curso.', 409);
            if (count($asociados) >= 10) fail('Puedes asociar máximo 10 personas a un curso.', 422);
            $asociados[] = $miembroId;
            $c['asociados'] = $asociados;
            $c['updated_at'] = now_iso();
            $c['updated_by'] = $uid;
            notificar($miembroId, 'curso',
                'Te asociaron al curso «' . (string)($c['titulo'] ?? $cursoId) . '»',
                'Ahora puedes ver estudiantes, solicitudes y contenido completo de ese curso.',
                '/panel/');
        } else {
            if (!in_array($miembroId, $asociados, true)) fail('Ese miembro no está asociado al curso.', 404);
            $c['asociados'] = array_values(array_filter($asociados, fn($id) => $id !== $miembroId));
            $c['updated_at'] = now_iso();
            $c['updated_by'] = $uid;
            notificar($miembroId, 'curso',
                'Ya no estás asociado al curso «' . (string)($c['titulo'] ?? $cursoId) . '»',
                'El autor retiró tu acceso de coautoría.',
                '/panel/');
        }
        $actualizado = $c;
        break;
    }
    unset($c);
    if (!$encontrado) fail('Curso no encontrado.', 404);
    save_json('contenido-cursos', $cursos);
    ok(['curso' => $cursoId, 'asociados' => curso_asociados_detalle($actualizado ?? [])]);
}

// PUBLISH: el asesor experto publica un curso propio; el admin, cualquiera.
if ($action === 'publish') {
  // Publicar un curso avisa a la administración y escribe en el muro.
  if (!check_rate_limit('curso_publicar', 20, 3600)) {
    fail('Has publicado demasiado seguido. Vuelve a intentarlo en una hora.', 429);
  }

    $u = curso_usuario_o_admin();
    if (!curso_puede_publicar($u)) {
        // Decir «no puedes» sin decir cómo sí es un callejón sin salida. En
        // esta Red un miembro puede tener hasta tres perfiles, así que la
        // puerta existe: basta con añadir el de Asesor Experto.
        fail('Para publicar cursos necesitas el perfil de Asesor Experto. '
           . 'Puedes añadirlo desde tu cuenta sin perder el que ya tienes: '
           . 'cada miembro puede tener hasta tres perfiles.', 403);
    }
    if (trim((string)($in['titulo'] ?? '')) === '') fail('El curso necesita un título.', 422);

    $cursos = cursos_todos();
    $base = curso_slug((string)$in['titulo']) ?: 'curso';
    $id = $base;
    $n = 2;
    while (curso_por_id($cursos, $id)) { $id = $base . '-' . $n; $n++; }

    $curso = curso_saneado($in, [
        'id'        => $id,
        'nivel'     => 'Básico',
        'categoria' => 'general',
        'duracion'  => '',
        'modulos'   => [],
        'asociados' => [],
    ]);
    $curso['autor'] = $u['nombre'] ?? 'Miembro de la Red';
    $curso['autor_id'] = $u['id'] ?? '';
    $curso['created_at'] = now_iso();

    $cursos[] = $curso;
    save_json('contenido-cursos', $cursos);

    // El catálogo corto se mantiene alineado para que la academia liste igual.
    $catalogo = load_json('cursos', []);
    if (is_array($catalogo)) {
        $catalogo[] = [
            'id' => $curso['id'], 'titulo' => $curso['titulo'],
            'nivel' => $curso['nivel'], 'duracion' => $curso['duracion'],
            'categoria' => $curso['categoria'], 'descripcion' => $curso['descripcion'] ?? '',
            'modulos' => array_map(fn($m) => ['titulo' => $m['titulo'], 'minutos' => $m['minutos']], $curso['modulos']),
        ];
        save_json('cursos', $catalogo);
    }
    publicar_aviso_comunidad('curso', $curso);
    registrar_actividad('curso-publicado', [
        'objeto_tipo' => 'curso',
        'objeto_id'   => (string)$curso['id'],
        'detalle'     => (string)$curso['titulo'] . ' · ' . (string)$curso['nivel'],
    ]);
    notificar_admins('curso', 'Nuevo curso publicado: ' . (string)$curso['titulo'],
        'Lo publicó ' . (string)$curso['autor'] . '.', '/academia/');
    ok(['curso' => $curso]);
}

// UPDATE: el autor edita el suyo; el administrador, todos.
if ($action === 'update') {
    $u = curso_usuario_o_admin();
    $id = trim((string)($in['id'] ?? ($_GET['id'] ?? '')));
    if ($id === '') fail('id requerido.', 422);

    $cursos = cursos_todos();
    $encontrado = false;
    foreach ($cursos as &$c) {
        if (($c['id'] ?? '') !== $id) continue;
        if (!curso_puede_editar($c, $u)) {
            fail('No autorizado: solo el autor del curso o un administrador puede editarlo.', 403);
        }
        $c = curso_saneado($in, $c);
        $c['updated_at'] = now_iso();
        $c['updated_by'] = $u['id'] ?? '';
        $encontrado = true;
        $actualizado = $c;
        break;
    }
    unset($c);
    if (!$encontrado) fail('Curso no encontrado.', 404);
    save_json('contenido-cursos', $cursos);

    $catalogo = load_json('cursos', []);
    if (is_array($catalogo)) {
        foreach ($catalogo as &$cc) {
            if (($cc['id'] ?? '') !== $id) continue;
            foreach (['titulo','nivel','duracion','categoria','descripcion'] as $campo) {
                if (isset($actualizado[$campo])) $cc[$campo] = $actualizado[$campo];
            }
            $cc['modulos'] = array_map(
                fn($m) => ['titulo' => $m['titulo'], 'minutos' => $m['minutos']],
                (array)($actualizado['modulos'] ?? [])
            );
        }
        unset($cc);
        save_json('cursos', $catalogo);
    }
    ok(['curso' => $actualizado]);
}

// DELETE: el autor retira el suyo; el administrador, cualquiera.
if ($action === 'delete') {
    $u = curso_usuario_o_admin();
    $id = trim((string)($in['id'] ?? ($_GET['id'] ?? '')));
    if ($id === '') fail('id requerido.', 422);

    $cursos = cursos_todos();
    $curso = curso_por_id($cursos, $id);
    if (!$curso) fail('Curso no encontrado.', 404);
    if (!curso_puede_editar($curso, $u)) {
        fail('No autorizado: solo el autor del curso o un administrador puede eliminarlo.', 403);
    }

    save_json('contenido-cursos', array_values(array_filter(
        $cursos, fn($c) => ($c['id'] ?? '') !== $id
    )));
    $catalogo = load_json('cursos', []);
    if (is_array($catalogo)) {
        save_json('cursos', array_values(array_filter(
            $catalogo, fn($c) => ($c['id'] ?? '') !== $id
        )));
    }
    ok(['eliminado' => $id]);
}

// MINE: cursos publicados por quien consulta (admin ve todos).
if ($action === 'mine') {
    $u = require_user();
    $cursos = cursos_todos();
    $esAdmin = miembro_tiene_rol($u, 'admin');
    $mios = array_values(array_filter($cursos, function ($c) use ($u) {
        return curso_es_autor_o_asociado($c, $u);
    }));
    ok([
        'cursos'         => $mios,
        'es_admin'       => $esAdmin,
        'puede_publicar' => curso_puede_publicar($u),
    ]);
}

// MATRICULAS: cursos en los que el usuario está inscrito como ESTUDIANTE
// (matriculado, aprobado o con solicitud pendiente). No confundir con
// `mine`, que es para el AUTOR de un curso: un miembro normal que se
// matricula en un curso ajeno nunca aparecía aquí, así que "Mis cursos" en
// el panel del estudiante se quedaba siempre vacío aunque sí se hubiera
// matriculado (el frontend llamaba a `mine` por error).
if ($action === 'matriculas') {
    $u = require_user();
    $uid = (string)($u['id'] ?? '');
    $cursos = cursos_todos();
    $mio = progreso_de($uid);
    $completadas = (array)($mio['completadas'] ?? []);
    $mias = [];
    foreach ($cursos as $c) {
        $cursoId = (string)($c['id'] ?? '');
        $estado = inscripcion_estado($cursoId, $uid);
        if (!in_array($estado, ['matriculado', 'aprobado', 'pendiente'], true)) continue;
        $resumen = curso_resumen($c, $completadas);
        $resumen['mi_solicitud'] = $estado;
        $mias[] = $resumen;
    }
    ok(['cursos' => $mias]);
}

fail('Acción no válida.', 400);
