<?php
/**
 * Router para `php -S`: aplica las reglas del .htaccess DEL PROPIO SITIO
 * (php -S no lee .htaccess). Así cada versión se prueba con sus reglas y no
 * con las de otra:
 *   - RedirectMatch 404 <regex>          → 404
 *   - RewriteRule <regex> - [F...]       → 403
 *   - Header [always] set <Nombre> "<v>" → cabecera (salvo Cache-Control, que
 *     en el .htaccess depende de FilesMatch y se trata aparte)
 * Además replica lo que no es genérico: data/.htaccess (todo denegado),
 * uploads/ sin ejecución, DirectoryIndex y las vistas de /marketplace/<id>/ y
 * /academia/<id>/.
 *
 *   PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8990 -t <sitio> local/router.php
 */
declare(strict_types=1);

$root = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
$uri  = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

function denegar(int $code): bool {
  http_response_code($code);
  header('Content-Type: text/plain; charset=utf-8');
  echo $code === 404 ? 'Not Found' : 'Forbidden';
  return true;
}

function reglas_htaccess(string $root): array {
  static $cache = null;
  if ($cache !== null) return $cache;
  $cache = ['404' => [], '403' => [], 'headers' => []];
  $f = $root . '/.htaccess';
  if (!is_file($f)) return $cache;
  $enFiles = false;
  foreach (file($f, FILE_IGNORE_NEW_LINES) as $l) {
    $l = trim($l);
    if (stripos($l, '<FilesMatch') === 0) { $enFiles = true; continue; }
    if (stripos($l, '</FilesMatch') === 0) { $enFiles = false; continue; }
    if (preg_match('/^RedirectMatch\s+404\s+(\S+)/i', $l, $m)) {
      $cache['404'][] = '#' . str_replace('#', '\#', $m[1]) . '#';
    } elseif (preg_match('/^RewriteRule\s+(\S+)\s+-\s+\[F/i', $l, $m)) {
      $cache['403'][] = '#' . str_replace('#', '\#', $m[1]) . '#' . (stripos($l, 'NC') !== false ? 'i' : '');
    } elseif (!$enFiles && preg_match('/^Header\s+(?:always\s+)?set\s+([\w-]+)\s+"(.*)"/i', $l, $m)) {
      if (strcasecmp($m[1], 'Cache-Control') !== 0) $cache['headers'][$m[1]] = $m[2];
    }
  }
  return $cache;
}

$r = reglas_htaccess($root);
foreach ($r['headers'] as $k => $v) header("$k: $v");

// Orden de Apache: mod_alias y mod_rewrite actúan antes de servir.
foreach ($r['404'] as $re) if (@preg_match($re, $uri)) return denegar(404);
$rel = ltrim($uri, '/'); // RewriteRule en .htaccess compara sin la barra inicial
foreach ($r['403'] as $re) if (@preg_match($re, $rel)) return denegar(403);
// data/.htaccess: Require all denied (en ambas versiones).
if (preg_match('#^/data(/|$)#', $uri)) return denegar(403);
// uploads/.htaccess: nunca ejecutar código subido.
if (preg_match('#^/uploads/.*\.(php|phtml|phar|cgi|pl|py|sh)$#i', $uri)) return denegar(403);

$path = $root . $uri;

if (is_file($path)) {
  if (preg_match('#\.php$#', $path)) {
    chdir(dirname($path));
    $_SERVER['SCRIPT_FILENAME'] = $path;
    $_SERVER['SCRIPT_NAME'] = $uri;
    $_SERVER['PHP_SELF'] = $uri;
    require $path;
    return true;
  }
  if (preg_match('#\.(js|css)$#', $path)) header('Cache-Control: public, max-age=31536000, immutable');
  return false;
}

if (is_dir($path)) {
  if (substr($uri, -1) !== '/') {
    header('Location: ' . $uri . '/', true, 301);
    return true;
  }
  foreach (['index.html', 'index.php'] as $idx) {
    if (!is_file($path . $idx)) continue;
    if ($idx === 'index.php') {
      chdir($path);
      require $path . $idx;
      return true;
    }
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    readfile($path . $idx);
    return true;
  }
}

if (preg_match('#^/(marketplace|academia)/[^/]+/?$#', $uri, $m)) {
  header('Content-Type: text/html; charset=utf-8');
  readfile($root . '/' . $m[1] . '/index.html');
  return true;
}

http_response_code(404);
if (is_file($root . '/404.html')) readfile($root . '/404.html');
return true;
