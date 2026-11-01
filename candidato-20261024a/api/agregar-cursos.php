<?php
/**
 * Red Café Ecuador — añadir cursos nuevos
 * =============================================================================
 * Añade los cursos de `cursos-nuevos.json` a los que ya tiene la Academia.
 * NO reemplaza el archivo: lo lee, le agrega los que faltan y lo vuelve a
 * escribir. Los 9 cursos actuales se quedan como están.
 *
 * CÓMO SE USA (desde el navegador):
 *   1. Suba ESTE archivo a la carpeta  api/  y cursos-nuevos.json a la RAÍZ.
 *      (en la raíz el hosting devolvía 403 para este archivo; en api/ sí ejecuta)
 *   2. Suba a  uploads/user-content/  los 6 archivos de la carpeta «subir»
 *      (3 portadas .jpg y 3 pensums .pdf).
 *   3. Simulación, que no escribe nada:
 *        https://redcafeecuador.com/api/agregar-cursos.php?clave=a595b2bf7ccf24bbd89e
 *   4. Si está conforme:
 *        https://redcafeecuador.com/api/agregar-cursos.php?clave=a595b2bf7ccf24bbd89e&aplicar=SI
 *   5. Al terminar se borra solo. Borre también cursos-nuevos.json.
 *
 * Antes de escribir hace una copia de seguridad del archivo de cursos.
 * Si un curso ya existe con el mismo id, lo deja intacto y avisa.
 */

declare(strict_types=1);
@set_time_limit(120);
header('Content-Type: text/plain; charset=utf-8');

const CLAVE = 'a595b2bf7ccf24bbd89e';

function salir(string $m): void { echo $m . "\n"; exit; }

$raiz = realpath(__DIR__ . '/..');   // el script vive en api/; el sitio es el padre
if ($raiz === false) salir('No se pudo resolver la carpeta.');

/* Guarda de sitio: igual que en el script de limpieza. */
foreach (['redcafe-version.json', 'api/_bootstrap.php', 'index.html'] as $sena) {
  if (!is_file($raiz . '/' . $sena)) {
    salir("Esta NO parece la carpeta de redcafeecuador.com ($raiz).\nNo se escribe nada.");
  }
}
if (!hash_equals(CLAVE, (string)($_GET['clave'] ?? ''))) {
  http_response_code(403);
  salir('Clave incorrecta.');
}

$fNuevos = $raiz . '/cursos-nuevos.json';
$fCursos = $raiz . '/data/contenido-cursos.json';
$fCatalogo = $raiz . '/data/cursos.json';

if (!is_file($fNuevos)) salir("Falta cursos-nuevos.json junto a este script.\nNo se escribe nada.");
if (!is_file($fCursos)) salir("No encuentro data/contenido-cursos.json.\nNo se escribe nada.");

$nuevos = json_decode((string)file_get_contents($fNuevos), true);
$actuales = json_decode((string)file_get_contents($fCursos), true);
if (!is_array($nuevos) || !$nuevos)   salir("cursos-nuevos.json no es una lista válida.\nNo se escribe nada.");
if (!is_array($actuales))             salir("data/contenido-cursos.json no es una lista válida.\nNo se escribe nada.");
if (count($actuales) < 5) {
  salir('El archivo de cursos tiene solo ' . count($actuales) . " entradas: parece incompleto.\nNo se escribe nada.");
}

$existentes = [];
foreach ($actuales as $c) if (is_array($c)) $existentes[(string)($c['id'] ?? '')] = true;

$aplicar = ((string)($_GET['aplicar'] ?? '')) === 'SI';

echo "Red Café Ecuador — añadir cursos\n================================\n";
echo 'Carpeta:    ' . $raiz . "\n";
echo 'Modo:       ' . ($aplicar ? 'APLICAR' : 'SIMULACIÓN (no se escribe nada)') . "\n";
echo 'Ya hay:     ' . count($actuales) . " cursos en la Academia\n\n";

/* Comprobar que los archivos de portada y pensum estén subidos. */
$faltanArchivos = [];
foreach ($nuevos as $c) {
  foreach ((array)($c['materiales'] ?? []) as $m) {
    if (($m['tipo'] ?? '') === 'archivo') {
      $ruta = $raiz . ($m['url'] ?? '');
      if (!is_file($ruta)) $faltanArchivos[] = (string)($m['url'] ?? '');
    }
  }
  foreach ((array)($c['modulos'] ?? []) as $mod) {
    foreach ((array)($mod['lecciones'] ?? []) as $l) {
      foreach ((array)($l['bloques'] ?? []) as $b) {
        if (($b['tipo'] ?? '') === 'imagen' && strpos((string)($b['url'] ?? ''), '/uploads/') === 0) {
          if (!is_file($raiz . $b['url'])) $faltanArchivos[] = (string)$b['url'];
        }
      }
    }
  }
}
if ($faltanArchivos) {
  echo "FALTAN ARCHIVOS EN uploads/user-content/ :\n";
  foreach (array_unique($faltanArchivos) as $f) echo '  ' . $f . "\n";
  echo "\nSúbalos primero. Sin ellos los cursos quedarían con la portada rota\n";
  echo "y sin el pensum descargable.\nNo se escribe nada.\n";
  exit;
}
echo "Portadas y pensums: los " . count($nuevos) . " cursos tienen sus archivos en su sitio.\n\n";

$aAnadir = []; $yaEstaban = [];
foreach ($nuevos as $c) {
  $id = (string)($c['id'] ?? '');
  if ($id === '') continue;
  if (isset($existentes[$id])) { $yaEstaban[] = $id; continue; }
  $aAnadir[] = $c;
}

if ($yaEstaban) {
  echo "YA EXISTÍAN (se dejan intactos):\n";
  foreach ($yaEstaban as $id) echo '  ' . $id . "\n";
  echo "\n";
}
if (!$aAnadir) salir("No hay nada que añadir.");

echo "SE AÑADIRÁN:\n";
foreach ($aAnadir as $c) {
  $lec = 0;
  foreach ((array)($c['modulos'] ?? []) as $m) $lec += count((array)($m['lecciones'] ?? []));
  printf("  %-44s %-11s %-12s %d módulos · %d lecciones · %d materiales\n",
    $c['id'], $c['nivel'] ?? '', ($c['acceso'] ?? '') === 'abierto' ? 'GRATIS' : 'con aprobación',
    count((array)($c['modulos'] ?? [])), $lec, count((array)($c['materiales'] ?? [])));
}
echo "\n";

if (!$aplicar) {
  echo "Simulación: no se ha escrito nada.\n\n";
  echo "Para aplicarlo de verdad, repita con:\n  ?clave=SU_CLAVE&aplicar=SI\n";
  exit;
}

/* Copia de seguridad antes de tocar nada. */
$sello = date('Ymd-His');
$copia = $raiz . '/data/contenido-cursos.copia-' . $sello . '.json';
if (!@copy($fCursos, $copia)) salir("No pude crear la copia de seguridad.\nNo se escribe nada.");
echo 'Copia de seguridad: data/' . basename($copia) . "\n";

$final = array_merge($actuales, $aAnadir);
$json = json_encode($final, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($json === false) salir("No pude convertir el resultado a JSON.\nNo se ha tocado el archivo.");
if (@file_put_contents($fCursos, $json, LOCK_EX) === false) {
  salir("No pude escribir data/contenido-cursos.json. Revise permisos.\nLa copia de seguridad está a salvo.");
}

/* El catálogo corto de la Academia, para que liste igual. */
if (is_file($fCatalogo)) {
  $cat = json_decode((string)file_get_contents($fCatalogo), true);
  if (is_array($cat)) {
    @copy($fCatalogo, $raiz . '/data/cursos.copia-' . $sello . '.json');
    $enCat = [];
    foreach ($cat as $x) if (is_array($x)) $enCat[(string)($x['id'] ?? '')] = true;
    foreach ($aAnadir as $c) {
      if (isset($enCat[(string)$c['id']])) continue;
      $cat[] = [
        'id' => $c['id'], 'titulo' => $c['titulo'], 'nivel' => $c['nivel'] ?? 'Básico',
        'duracion' => $c['duracion'] ?? '', 'categoria' => $c['categoria'] ?? 'general',
        'descripcion' => $c['descripcion'] ?? '',
        'modulos' => array_map(fn($m) => ['titulo' => $m['titulo'], 'minutos' => (int)($m['minutos'] ?? 0)],
                               (array)($c['modulos'] ?? [])),
      ];
    }
    @file_put_contents($fCatalogo, json_encode($cat, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
    echo "Catálogo corto actualizado (data/cursos.json).\n";
  }
}

echo "\nHECHO: " . count($aAnadir) . ' curso(s) añadido(s). La Academia tiene ahora ' . count($final) . ".\n";
echo "Están en /academia/ y se editan desde el perfil de administración.\n\n";
if (@unlink(__FILE__)) echo "Este script se ha borrado solo. Borre también cursos-nuevos.json.\n";
else echo "AVISO: no me he podido borrar. BÓRRELO A MANO, junto con cursos-nuevos.json.\n";
