<?php
/**
 * Punto de entrada para el cron de precios.
 *
 * Cron sugerido en el hosting (UTC, después del cierre de mercado):
 * 0 23 * * * /usr/bin/curl -fsS 'https://redcafeecuador.com/api/precios-refresh.php' >/ruta/segura/precios-cron.log 2>&1
 *
 * La API también se actualiza cuando recibe visitas y su caché supera seis
 * horas. El cron mantiene la caché reciente incluso si nadie visita la web.
 * La fecha del último cierre puede permanecer igual en fines de semana y
 * feriados; no se inventan cotizaciones.
 */
declare(strict_types=1);

$_GET['action'] = 'refresh';
require __DIR__ . '/precios.php';
