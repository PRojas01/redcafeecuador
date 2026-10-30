<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

const USER_UPLOADS_DIR = __DIR__ . '/../uploads/user-content';
const USER_UPLOADS_URL = '/uploads/user-content';
const USER_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
const USER_UPLOAD_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Documentos que respaldan un lote: certificado de calidad, informe de
// catación, certificado orgánico, análisis de laboratorio... El comprador
// necesita poder verlos antes de decidir.
const USER_DOC_MAX_BYTES = 5 * 1024 * 1024;
const USER_DOC_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const USER_DOC_TIPOS = [
  'certificado-calidad', 'informe-catacion', 'certificado-organico',
  'analisis-laboratorio', 'trazabilidad-eudr', 'ficha-tecnica', 'otro',
];

$action = $_GET['action'] ?? '';

function asegurar_directorio_uploads(): void {
  if (!is_dir(USER_UPLOADS_DIR) && !@mkdir(USER_UPLOADS_DIR, 0755, true)) {
    fail('No se pudo preparar el directorio de imágenes.', 500);
  }
  $htaccess = dirname(USER_UPLOADS_DIR) . '/.htaccess';
  if (!file_exists($htaccess)) {
    @file_put_contents($htaccess, "php_flag engine off\nOptions -Indexes -ExecCGI\n");
  }
}

function imagen_desde_archivo(string $tmp, string $mime) {
  if ($mime === 'image/jpeg') return @imagecreatefromjpeg($tmp);
  if ($mime === 'image/png') return @imagecreatefrompng($tmp);
  if ($mime === 'image/webp' && function_exists('imagecreatefromwebp')) return @imagecreatefromwebp($tmp);
  return false;
}

function guardar_jpg_redimensionado(string $tmp, string $destino, string $mime): void {
  $info = @getimagesize($tmp);
  if (!$info || empty($info[0]) || empty($info[1])) fail('La imagen no es válida.', 422);
  $origen = imagen_desde_archivo($tmp, $mime);
  if (!$origen) fail('No pudimos procesar esa imagen.', 422);

  $w = (int)$info[0];
  $h = (int)$info[1];
  $max = 1600;
  $scale = min(1, $max / max($w, $h));
  $nw = max(1, (int)round($w * $scale));
  $nh = max(1, (int)round($h * $scale));

  $lienzo = imagecreatetruecolor($nw, $nh);
  $blanco = imagecolorallocate($lienzo, 255, 255, 255);
  imagefill($lienzo, 0, 0, $blanco);
  imagecopyresampled($lienzo, $origen, 0, 0, 0, 0, $nw, $nh, $w, $h);
  if (!@imagejpeg($lienzo, $destino, 84)) {
    imagedestroy($origen);
    imagedestroy($lienzo);
    fail('No se pudo guardar la imagen.', 500);
  }
  imagedestroy($origen);
  imagedestroy($lienzo);
  @chmod($destino, 0644);
}

function USER_DOC_DIR_ACTUAL(): string { return USER_UPLOADS_DIR; }

function etiqueta_tipo_documento(string $tipo): string {
  $map = [
    'certificado-calidad'  => 'Certificado de calidad',
    'informe-catacion'     => 'Informe de catación',
    'certificado-organico' => 'Certificado orgánico',
    'analisis-laboratorio' => 'Análisis de laboratorio',
    'trazabilidad-eudr'    => 'Expediente de trazabilidad / EUDR',
    'ficha-tecnica'        => 'Ficha técnica',
    'otro'                 => 'Documento del lote',
  ];
  return $map[$tipo] ?? 'Documento del lote';
}

if ($action === 'image') {
  $u = require_user();

  // El cupo se cuenta por dirección IP: si se comprobara antes de exigir
  // sesión, cualquiera desde fuera podría agotar el de un miembro que comparte
  // salida a internet —una oficina, una asociación de productores—.
  if (!check_rate_limit('upload_image', 60, 3600)) {
    fail('Demasiadas imágenes subidas seguidas. Vuelve a intentarlo en una hora.', 429);
  }
  $context = trim((string)($_POST['context'] ?? ''));
  if (!in_array($context, ['comunidad', 'marketplace', 'lote', 'curso'], true)) {
    fail('Contexto de imagen inválido.', 422);
  }
  if (empty($_FILES['archivo']) || !is_array($_FILES['archivo'])) fail('Archivo requerido.', 422);
  $f = $_FILES['archivo'];
  if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) fail('No pudimos recibir el archivo.', 422);
  if (($f['size'] ?? 0) <= 0 || ($f['size'] ?? 0) > USER_UPLOAD_MAX_BYTES) {
    fail('La imagen debe pesar máximo 2 MB.', 422);
  }
  $tmp = (string)($f['tmp_name'] ?? '');
  if ($tmp === '' || !is_uploaded_file($tmp)) fail('Archivo inválido.', 422);

  $finfo = new finfo(FILEINFO_MIME_TYPE);
  $mime = (string)$finfo->file($tmp);
  if (!in_array($mime, USER_UPLOAD_ALLOWED_TYPES, true)) {
    fail('Solo se permiten imágenes JPG, PNG o WebP.', 422);
  }

  asegurar_directorio_uploads();
  $nombre = $context . '-' . preg_replace('/[^A-Za-z0-9_-]/', '', (string)$u['id']) . '-' . uid() . '.jpg';
  $destino = USER_UPLOADS_DIR . '/' . $nombre;
  guardar_jpg_redimensionado($tmp, $destino, $mime);
  ok(['url' => USER_UPLOADS_URL . '/' . $nombre]);
}

if ($action === 'documento') {
  $u = require_user();

  // El cupo se cuenta por dirección IP: si se comprobara antes de exigir
  // sesión, cualquiera desde fuera podría agotar el de un miembro que comparte
  // salida a internet —una oficina, una asociación de productores—.
  if (!check_rate_limit('upload_documento', 30, 3600)) {
    fail('Demasiados documentos subidos seguidos. Vuelve a intentarlo en una hora.', 429);
  }

  $tipo = trim((string)($_POST['tipo'] ?? 'otro'));
  if (!in_array($tipo, USER_DOC_TIPOS, true)) fail('Tipo de documento inválido.', 422);
  $titulo = trim((string)($_POST['titulo'] ?? ''));
  if (mb_strlen($titulo) > 120) fail('El título del documento es demasiado largo.', 422);

  if (empty($_FILES['archivo']) || !is_array($_FILES['archivo'])) fail('Archivo requerido.', 422);
  $f = $_FILES['archivo'];
  if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) fail('No pudimos recibir el archivo.', 422);
  if (($f['size'] ?? 0) <= 0 || ($f['size'] ?? 0) > USER_DOC_MAX_BYTES) {
    fail('El documento debe pesar máximo 5 MB.', 422);
  }
  $tmp = (string)($f['tmp_name'] ?? '');
  if ($tmp === '' || !is_uploaded_file($tmp)) fail('Archivo inválido.', 422);

  $finfo = new finfo(FILEINFO_MIME_TYPE);
  $mime = (string)$finfo->file($tmp);
  if (!in_array($mime, USER_DOC_ALLOWED_TYPES, true)) {
    fail('Solo se permiten documentos PDF, JPG o PNG.', 422);
  }

  asegurar_directorio_uploads();
  $slug = preg_replace('/[^A-Za-z0-9_-]/', '', (string)$u['id']);

  if ($mime === 'application/pdf') {
    // Se comprueba la firma del archivo, no solo el tipo declarado.
    $cabecera = (string)@file_get_contents($tmp, false, null, 0, 5);
    if (strpos($cabecera, '%PDF-') !== 0) fail('El PDF no es válido.', 422);
    $nombre = 'doc-' . $slug . '-' . uid() . '.pdf';
    $destino = USER_DOC_DIR_ACTUAL() . '/' . $nombre;
    if (!@move_uploaded_file($tmp, $destino)) fail('No pudimos guardar el documento.', 500);
    @chmod($destino, 0644);
  } else {
    // Un certificado escaneado se normaliza a JPG, igual que las fotos.
    $nombre = 'doc-' . $slug . '-' . uid() . '.jpg';
    $destino = USER_DOC_DIR_ACTUAL() . '/' . $nombre;
    guardar_jpg_redimensionado($tmp, $destino, $mime);
  }

  ok([
    'documento' => [
      'tipo'      => $tipo,
      'titulo'    => $titulo !== '' ? $titulo : etiqueta_tipo_documento($tipo),
      'url'       => USER_UPLOADS_URL . '/' . $nombre,
      'formato'   => $mime === 'application/pdf' ? 'pdf' : 'imagen',
      'subido_at' => now_iso(),
    ],
  ]);
}

fail('Acción no válida.', 400);
