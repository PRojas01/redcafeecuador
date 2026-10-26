<?php
/**
 * Carga solo las funciones de respaldo (sin la parte de API) para que otras
 * APIs puedan disparar la copia diaria. api/respaldo.php decide si se comporta
 * como API mirando el nombre del script pedido, así que incluirlo aquí es
 * seguro: desde notificaciones.php solo define funciones.
 */
declare(strict_types=1);
require_once __DIR__ . '/respaldo.php';
