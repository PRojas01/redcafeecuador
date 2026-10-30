<?php
// mailer.php — Emails transaccionales con plantillas HTML de la marca.
// Red Café Ecuador — paleta "Recién Hecho" (espresso #2b1d16, roast #6f3f1f, caramelo #d19a5b).
// Uso: require '_bootstrap.php'; require 'mailer.php'; mailer_send('welcome', $destinatario, [...]);

declare(strict_types=1);

const MAIL_FROM      = 'Red Café Ecuador <no-reply@redcafeecuador.com>';
const MAIL_REPLY_TO  = 'no-reply@redcafeecuador.com';
const MAIL_BRAND_URL = 'https://redcafeecuador.com/';
const MAIL_DEBUG     = DATA_DIR . '/mail-debug.log';

function mailer_debug_log(string $to, string $subject, bool $ok): void {
  if ($ok) return;
  $line = '[' . date('Y-m-d H:i:s') . '] TO=' . $to . ' SUBJECT=' . $subject . "\n";
  @file_put_contents(MAIL_DEBUG, $line, FILE_APPEND | LOCK_EX);
  @chmod(MAIL_DEBUG, 0600);
}

function mailer_escape(string $s): string {
  return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function mailer_wrap(string $inner): string {
  // Las constantes no se interpolan dentro de un heredoc: «{MAIL_BRAND_URL}»
  // salía literal y los enlaces del pie de TODOS los correos estaban rotos.
  $marca = MAIL_BRAND_URL;
  return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Red Café Ecuador</title>
</head>
<body style="margin:0;padding:0;background:#f7f0e5;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f0e5;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fffaf2;border-radius:16px;overflow:hidden;border:1px solid rgba(43,29,22,0.09);">
        <!-- Encabezado -->
        <tr>
          <td style="background:linear-gradient(135deg,#2b1d16 0%,#6f3f1f 100%);padding:28px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:22px;font-weight:800;color:#f7f0e5;font-family:Georgia,serif;letter-spacing:-0.5px;">☕ Red Café</span>
                  <span style="font-size:22px;font-weight:800;color:#d19a5b;font-family:Georgia,serif;">Ecuador</span>
                  <p style="margin:6px 0 0;font-size:12px;color:rgba(247,240,229,0.75);font-family:Arial,sans-serif;">La red del café de especialidad</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Contenido -->
        <tr>
          <td style="padding:32px;">
            $inner
          </td>
        </tr>
        <!-- Pie -->
        <tr>
          <td style="padding:24px 32px;background:#efe5d2;border-top:1px solid rgba(43,29,22,0.08);">
            <p style="margin:0 0 8px;font-size:12px;color:#6f5747;font-family:Arial,sans-serif;">
              Red Café Ecuador — Comunidad de productores, tostadores y cafeterías de especialidad.
            </p>
            <p style="margin:0;font-size:12px;color:#6f5747;font-family:Arial,sans-serif;">
              <a href="{$marca}" style="color:#6f3f1f;font-weight:700;text-decoration:none;">Visita la plataforma</a>
              &nbsp;·&nbsp;
              <a href="{$marca}terminos-y-condiciones" style="color:#6f5747;text-decoration:none;">Términos y privacidad</a>
            </p>
            <p style="margin:12px 0 0;font-size:11px;color:#6f5747;font-family:Arial,sans-serif;">
              Recibes este correo porque tienes una cuenta o interacción en Red Café Ecuador.
              Si no reconoces esta actividad, ignóralo o escríbenos a info@redcafeecuador.com.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
HTML;
}

function mailer_button(string $label, string $url): string {
  $u = mailer_escape($url);
  return <<<HTML
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:999px;background:linear-gradient(135deg,#6f3f1f,#2b1d16);padding:12px 28px;">
      <a href="$u" style="color:#fffaf2;font-size:14px;font-weight:700;text-decoration:none;font-family:Arial,sans-serif;display:inline-block;">$label →</a>
    </td>
  </tr>
</table>
HTML;
}

function mailer_heading(string $t): string {
  return '<h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#2b1d16;font-family:Georgia,serif;">' . mailer_escape($t) . '</h1>';
}

function mailer_text(string $s): string {
  return '<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#2b1d16;font-family:Arial,sans-serif;">' . nl2br(mailer_escape($s)) . '</p>';
}

function mailer_send(string $template, string $to, array $vars = []): bool {
  $to    = filter_var($to, FILTER_VALIDATE_EMAIL) ? $to : '';
  $nombre = $vars['nombre'] ?? 'amigo';
  $first  = explode(' ', trim($nombre))[0] ?: 'amigo';

  switch ($template) {
    case 'welcome':
      $subject = '¡Bienvenido a la Red Café Ecuador, ' . $first . '! ☕';
      $roles = [
        'productor' => 'productor', 'vendedor' => 'vendedor',
        'comprador' => 'comprador', 'bar' => 'bar',
        'barista' => 'barista', 'certificador' => 'verificador / catador',
        'transportista' => 'transportista', 'pilador' => 'pilador',
        'exportador' => 'exportador',
      ];
      $rol = mailer_escape($roles[$vars['rol'] ?? ''] ?? 'miembro de la comunidad');
      $inner = mailer_heading('¡Bienvenido a la Red, ' . mailer_escape($first) . '!');
      $inner .= mailer_text("Hola, gracias por unirte como $rol. Tu cuenta está lista.");
      $inner .= mailer_text('Aquí puedes publicar lotes de café, conectarte con compradores, '
            . 'llevar tu menú y vender directo a cafeterías y baristas de especialidad de todo el país.');
      $inner .= mailer_button('Entrar a tu panel', MAIL_BRAND_URL . 'panel');
      $inner .= mailer_text('Encuentra guías y herramientas para vender mejor en la sección Servicios de la plataforma.');
      break;

    case 'pedido':
      $subject = 'Nuevo pedido #' . ($vars['nro'] ?? '') . ' — Red Café Ecuador';
      $inner = mailer_heading('Tienes un nuevo pedido 🚚');
      $inner .= mailer_text('Hola ' . mailer_escape($first) . ', recibiste un pedido con este detalle:');
      $inner .= '<table role="presentation" width="100%" cellpadding="10" cellspacing="0" style="background:#f7f0e5;border-radius:12px;margin:0 0 16px;font-family:Arial,sans-serif;">'
              . '<tr><td style="color:#6f5747;font-size:13px;">N° pedido</td><td style="color:#2b1d16;font-weight:700;font-size:14px;">#' . mailer_escape($vars['nro'] ?? '') . '</td></tr>'
              . '<tr><td style="color:#6f5747;font-size:13px;">Cliente</td><td style="color:#2b1d16;font-weight:700;font-size:14px;">' . mailer_escape($vars['cliente'] ?? '') . '</td></tr>'
              . '<tr><td style="color:#6f5747;font-size:13px;">Total</td><td style="color:#6f3f1f;font-weight:800;font-size:15px;">' . mailer_escape($vars['total'] ?? '') . '</td></tr>'
              . '</table>';
      $inner .= mailer_button('Ver pedido', MAIL_BRAND_URL . 'panel');
      break;

    case 'mensaje':
      $subject = 'Nuevo mensaje de ' . $first . ' — Red Café Ecuador';
      $inner = mailer_heading('Tienes un nuevo mensaje 💬');
      $inner .= mailer_text('De ' . mailer_escape($vars['de'] ?? $nombre) . ' en ' . mailer_escape($vars['tema'] ?? 'tu conversación') . ':');
      $inner .= '<blockquote style="margin:0 0 16px;padding:14px 18px;background:#f7f0e5;border-left:4px solid #d19a5b;border-radius:8px;color:#2b1d16;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">'
              . mailer_escape($vars['texto'] ?? '') . '</blockquote>';
      $inner .= mailer_button('Responder', MAIL_BRAND_URL . 'comunidad');
      break;

    case 'codigo':
      $subject = 'Tu código de verificación — Red Café Ecuador';
      $code = mailer_escape($vars['code'] ?? '');
      $inner = mailer_heading('Tu código de verificación');
      $inner .= mailer_text('Hola ' . mailer_escape($first) . ', usa este código para completar tu acceso:');
      $inner .= '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="background:#f7f0e5;border:2px dashed #d19a5b;border-radius:12px;padding:16px 32px;font-size:30px;font-weight:800;letter-spacing:8px;color:#2b1d16;font-family:monospace;">' . $code . '</td></tr></table>';
      $inner .= mailer_text('El código es válido por 10 minutos. Si no solicitaste este código, ignora este mensaje.');
      break;

    case 'password_reset':
      $subject = 'Recupera tu contraseña · Red Café Ecuador';
      $inner  = mailer_heading('Recupera tu contraseña');
      $inner .= mailer_text('Hola ' . mailer_escape($first) . ', recibimos una solicitud para cambiar la contraseña de tu cuenta.');
      $inner .= mailer_button('Crear una nueva contraseña', $vars['enlace'] ?? MAIL_BRAND_URL . 'recuperar');
      $inner .= mailer_text('El enlace vale UNA HORA y sirve UNA SOLA VEZ. Si no pediste este cambio, ignora este correo: tu contraseña actual seguirá igual.');
      break;

    case 'admin_reset':
      $subject = 'Recuperar el acceso de administrador · Red Café Ecuador';
      $inner  = mailer_heading('Recuperar el acceso de administrador');
      $inner .= mailer_text('Alguien pidió restablecer la contraseña del panel de administración. '
            . 'Si has sido tú, abre este enlace: te mostrará una contraseña nueva, una sola vez.');
      $inner .= mailer_button('Restablecer la contraseña', $vars['enlace'] ?? MAIL_BRAND_URL);
      $inner .= mailer_text('El enlace vale UNA HORA y sirve UNA SOLA VEZ. '
            . 'Si no lo has pedido tú, ignora este correo: mientras nadie lo abra, '
            . 'la contraseña actual sigue funcionando y no ha cambiado nada.');
      break;

    case 'waitlist':
      $subject = '¡Estás en la lista de espera de Red Café Ecuador! ☕';
      $perfil = mailer_escape($vars['perfil'] ?? '');
      $inner = mailer_heading('¡Gracias, ' . mailer_escape($first) . '!');
      $inner .= mailer_text('Tu correo quedó en la lista de espera de la Red Café Ecuador.');
      $inner .= mailer_text('Te avisaremos cuando abra la membresía de tu perfil' . ($perfil !== '' ? " ($perfil)" : '') . ': acceso anticipado, precios de lanzamiento y contenido gratuito de la Academia.');
      $inner .= mailer_button('Ver la Red', MAIL_BRAND_URL);
      break;

    case 'sancion':
      // Notificación formal de una medida sobre la cuenta (debido proceso):
      // hechos, norma, medida, plazo y vía para apelar.
      $subject = mb_substr(str_replace(["\r", "\n"], ' ', (string)($vars['titulo'] ?? 'Aviso sobre tu cuenta')), 0, 140) . ' — Red Café Ecuador';
      $inner  = mailer_heading((string)($vars['titulo'] ?? 'Aviso sobre tu cuenta'));
      $inner .= mailer_text('Hola ' . mailer_escape($first) . ', te escribimos para notificarte formalmente una medida sobre tu cuenta.');
      $inner .= mailer_text('Medida: ' . (string)($vars['texto'] ?? ''));
      $inner .= mailer_text('Infracción: ' . (string)($vars['infraccion'] ?? ''));
      $inner .= mailer_text('Norma aplicada: ' . (string)($vars['norma'] ?? ''));
      $inner .= mailer_text('Hechos: ' . (string)($vars['hechos'] ?? ''));
      if (!empty($vars['hasta'])) $inner .= mailer_text('Vigente hasta: ' . (string)$vars['hasta']);
      $inner .= mailer_text('Tienes derecho a presentar tu versión y las pruebas que consideres' . (!empty($vars['apelar_hasta']) ? ' hasta el ' . (string)$vars['apelar_hasta'] : '') . '. Revisaremos tu apelación y te responderemos con una resolución motivada.');
      $inner .= mailer_button('Presentar mi apelación', (string)($vars['enlace'] ?? MAIL_BRAND_URL . 'login/'));
      break;

    case 'contacto_admin':
      $subject = mb_substr(str_replace(["\r", "\n"], ' ', (string)($vars['asunto'] ?? 'Mensaje de Red Café Ecuador')), 0, 140) . ' — Red Café Ecuador';
      $inner  = mailer_heading((string)($vars['asunto'] ?? 'Mensaje de Red Café Ecuador'));
      $inner .= mailer_text('Hola ' . mailer_escape($first) . ',');
      $inner .= mailer_text((string)($vars['mensaje'] ?? ''));
      $inner .= mailer_text('Puedes responder escribiéndonos desde el chat de tu panel o a soporte@redcafeecuador.com.');
      $inner .= mailer_button('Ir a mi panel', MAIL_BRAND_URL . 'panel/');
      break;

    case 'baja':
      $subject = 'Tu cuenta fue eliminada — Red Café Ecuador';
      $inner  = mailer_heading('Tu cuenta fue eliminada');
      $inner .= mailer_text('Hola ' . mailer_escape($first) . ', confirmamos que cerraste tu cuenta en Red Café Ecuador.');
      $inner .= mailer_text('Eliminamos tu perfil, tus datos de contacto, tus publicaciones y tus avisos. Conservamos solo lo que la ley permite para atender obligaciones con otras personas o reclamos (pedidos ya cerrados y registros de moderación), sin tus datos de contacto.');
      $inner .= mailer_text('Si no fuiste tú, escríbenos de inmediato a soporte@redcafeecuador.com.');
      break;

    case 'aviso':
      // Aviso de la administración (copia del aviso de la campana). Solo se
      // envía a quien aceptó novedades y siempre lleva el enlace de baja.
      $subject = mb_substr(str_replace(["\r", "\n"], ' ', (string)($vars['titulo'] ?? 'Novedades')), 0, 140) . ' — Red Café Ecuador';
      $inner  = mailer_heading((string)($vars['titulo'] ?? 'Novedades de la Red'));
      $inner .= mailer_text('Hola ' . mailer_escape($first) . ',');
      if (trim((string)($vars['texto'] ?? '')) !== '') $inner .= mailer_text((string)$vars['texto']);
      $inner .= mailer_button('Ver en la Red', (string)($vars['enlace'] ?? MAIL_BRAND_URL . 'panel/'));
      $inner .= '<p style="margin:24px 0 0;color:#6f5747;font-size:12px;line-height:1.5;font-family:Arial,sans-serif;">'
              . 'Recibes este correo porque aceptaste recibir novedades de la Red. '
              . '<a href="' . mailer_escape((string)($vars['baja'] ?? '')) . '" style="color:#6f3f1f;">Dejar de recibir estos correos</a>.</p>';
      break;

    default:
      return false;
  }

  $body    = mailer_wrap($inner);
  $headers = 'From: ' . MAIL_FROM . "\r\n"
           . 'Reply-To: ' . MAIL_REPLY_TO . "\r\n"
           . 'MIME-Version: 1.0' . "\r\n"
           . 'Content-Type: text/html; charset=utf-8' . "\r\n";

  // Asunto con tildes y emoji: sin codificar (RFC 2047) muchos clientes lo
  // muestran con caracteres rotos.
  $subject = mb_encode_mimeheader(str_replace(["\r", "\n"], ' ', $subject), 'UTF-8', 'B', "\r\n");
  $ok = $to !== '' && @mail($to, $subject, $body, $headers);
  mailer_debug_log($to, $subject, $ok);
  return $ok;
}
