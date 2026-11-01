<?php
/**
 * Guardián de datos — evita que un despliegue pise información real.
 *
 * EL PROBLEMA QUE RESUELVE
 * Los paquetes de actualización traen catálogos (lotes, cursos, noticias…). Hoy
 * eso es inofensivo porque todo el contenido publicado puede iniciar como base referencial, pero
 * en cuanto un productor publique su finca de verdad, extraer un ZIP encima
 * borraría su trabajo sin avisar. Este archivo impide que eso ocurra.
 *
 * CÓMO FUNCIONA
 * El paquete ya no escribe en data/ directamente: deja los catálogos en
 * data/_semilla/. Al arrancar la API, para cada catálogo se decide:
 *
 *   · no existe en data/          → se copia. Instalación limpia.
 *   · existe y TODO es de ejemplo → se copia, guardando respaldo antes.
 *   · existe con algún dato real  → NO SE TOCA. Se anota y se sigue.
 *
 * «Dato real» es cualquier registro sin la marca `ejemplo: true`. En cuanto
 * alguien publique de verdad, ese archivo queda bloqueado frente a despliegues.
 *
 * Los datos de personas —miembros, lista de espera, consentimientos, pedidos,
 * inventario— nunca viajan en el paquete, así que no entran aquí siquiera.
 */

declare(strict_types=1);

/** Catálogos que un paquete puede traer. El resto nunca se toca. */
const SEMILLA_CATALOGOS = [
    'lotes',
    'media',
    'cursos',
    'planes',
    'servicios',
    'contenido-noticias',
    'contenido-cursos',
    'contenido-planes',
    'contenido-servicios',
    'contenido-recetas',
];

/** ¿Este archivo contiene algo que haya creado una persona real? */
function semilla_tiene_datos_reales(string $ruta): bool
{
    if (!file_exists($ruta)) {
        return false;
    }
    $json = json_decode((string) file_get_contents($ruta), true);
    if (!is_array($json)) {
        // Ilegible: se trata como real para no destruir algo que no entendemos.
        return true;
    }

    // Algunos catálogos son {"items": [...]}, otros un array plano.
    $items = $json['items'] ?? $json;
    if (!is_array($items)) {
        return true;
    }

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        // Sin marca de ejemplo → lo creó alguien.
        if (empty($item['ejemplo'])) {
            return true;
        }
    }
    return false;
}

/**
 * Copia los catálogos de data/_semilla/ a data/ cuando es seguro hacerlo.
 * Devuelve un parte de lo que hizo, para poder auditarlo.
 */
function semilla_instalar(): array
{
    $dirDatos   = __DIR__ . '/../data';
    $dirSemilla = $dirDatos . '/_semilla';
    $parte = ['copiados' => [], 'protegidos' => [], 'sin_semilla' => []];

    if (!is_dir($dirSemilla)) {
        return $parte;
    }

    foreach (SEMILLA_CATALOGOS as $nombre) {
        $origen  = "$dirSemilla/$nombre.json";
        $destino = "$dirDatos/$nombre.json";

        if (!file_exists($origen)) {
            $parte['sin_semilla'][] = $nombre;
            continue;
        }

        if (semilla_tiene_datos_reales($destino)) {
            // Hay contenido de personas reales: el despliegue no manda aquí.
            $parte['protegidos'][] = $nombre;
            continue;
        }

        // Respaldo antes de tocar nada, aunque solo hubiera ejemplos.
        if (file_exists($destino)) {
            $respaldos = "$dirDatos/_respaldos";
            if (!is_dir($respaldos)) {
                @mkdir($respaldos, 0700, true);
            }
            @copy($destino, "$respaldos/$nombre." . gmdate('Ymd-His') . '.json');
        }

        if (@copy($origen, $destino)) {
            @chmod($destino, 0640);
            $parte['copiados'][] = $nombre;
        }
    }

    // Deja constancia de la decisión, para saber por qué un catálogo no cambió.
    @file_put_contents(
        "$dirDatos/.semilla.log",
        gmdate('c') . ' ' . json_encode($parte, JSON_UNESCAPED_UNICODE) . "\n",
        FILE_APPEND | LOCK_EX
    );

    return $parte;
}
