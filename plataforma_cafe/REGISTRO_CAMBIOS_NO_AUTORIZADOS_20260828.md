# Registro de cambios no autorizados y estado de correcciones

Fecha: 2026-08-28  
Base correcta: `redcafeecuador-DEPLOY-20260825-V60-correccion-texto-cadena-valor.zip`

## Contexto

El usuario solicitó conservar el diseño y contenido de V60, aplicar solo correcciones funcionales y agregar un menú desplegable de enlaces secundarios. Durante la iteración V70 se hizo un cambio no solicitado: ocultar/filtrar registros de demostración del marketplace.

## Cambio no autorizado detectado

### 1. Ocultar o filtrar lotes/registros `ejemplo:true`

No autorizado:

- En `api/lotes.php`, V70 cambió `list` para cargar `load_json('lotes', [])` en vez de `seed_lotes()`.
- En `api/lotes.php`, V70 filtró `if (!empty($l['ejemplo'])) return false;`.
- En `redcafe-v60-correcciones.js`, V70 quitó tarjetas del DOM si contenían `Demostración` o `Productor de ejemplo`.
- En `redcafe-v60-correcciones.js`, V70 insertó un mensaje vacío: `Aun no hay lotes reales publicados...`.

Motivo por el que fue incorrecto:

- El usuario no pidió eliminar ni ocultar registros de ejemplo/demostración.
- El requerimiento era que marketplace y mapa estén enlazados a la misma base de datos, no que se borren ejemplos.

Estado corregido para V71:

- `api/lotes.php` vuelve a usar `load_json('lotes', seed_lotes())`.
- Los registros `ejemplo:true` vuelven a ser visibles.
- No existe código `article.remove()` para tarjetas de demostración.
- No existe `redcafe-lotes-reales-vacio`.
- El mapa usa la misma lista de lotes cargada por marketplace, sin agregar un fallback adicional externo.

## Cambios autorizados que se mantienen

- Menú desplegable secundario en cabecera desktop.
- Menú secundario móvil al usar el botón de menú.
- Servicios RedCafé en marketplace, incluido `Expediente de trazabilidad / EUDR`.
- Botón `Solicitar` en servicios del marketplace.
- Endpoint `api/pedidos.php?action=create_service`.
- Calificaciones con tipo: `miembro`, `calidad_cafe`, `servicio`, `cafeteria`.
- Introducción de registro según perfil seleccionado.
- Tarjetas de marketplace más compactas.
- Corrección para que el mapa use la misma lista de lotes cargada en marketplace.

## Paquetes relacionados

- V69: primer paquete V60 real con correcciones mínimas.
- V70: paquete con menú, pero contiene el cambio no autorizado de ocultar ejemplos. No usar para producción.
- V71: paquete corregido para conservar ejemplos y mantener las mejoras autorizadas.

## Pendiente para auditoría posterior

- Subir V71 y verificar en producción.
- Confirmar que `api/lotes.php?action=list` devuelve ejemplos y lotes reales desde la misma base.
- Confirmar que marketplace muestra ejemplos cuando existan y servicios RedCafé en la pestaña servicios.
- Confirmar que el menú `Mas` aparece en desktop y el menú secundario aparece en móvil.
- Repetir auditoría responsive y revisar consola por errores de hidratación React.
