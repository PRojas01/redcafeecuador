# Evidencias — 20261001b frente a la publicada 20261001a

Fecha: 2026-10-01 · Base: producción **20261001a**, reconstruida y verificada contra el
sitio en vivo (206 archivos públicos idénticos). Pruebas en dos instancias locales con
PHP 8.5 real, mismas condiciones y datos sintéticos (nunca datos reales).

## Garantía de no reversión
- React compilado del 20261001a: **964 archivos de React/RSC idénticos byte a byte** (no se recompiló).
- Sus cambios de PHP (`cursos.php`, `precios.php`, `precios-refresh.php`, `_legacy_catalogo_20261001.php`)
  **no se tocan**; revisados (modelo local + verificación manual): sin SSRF (URLs fijas) y el
  catálogo legado responde 404 por URL.
- Archivos de la capa con el tema: **solo cambian colores y fuentes**, la lógica es idéntica (comprobado
  normalizando colores).
- Mis 3 PHP y `.htaccess` parten de archivos que el 20261001a no modificó (el ensamblador se detiene si no).
- Simulación de subida: producción + paquete = versión probada, **0 diferencias en 1.159 archivos**.

## Resultados (publicada 20261001a → nueva 20261001b)

| Prueba | Publicada | Nueva |
|---|---|---|
| Batería API / seguridad / integridad | 18/28 | **28/28** · 0 regresiones |
| Miembro ve cédula, teléfono y correo de otros | **3 de 3 expuestos** | 0 de 3 |
| 80 escrituras simultáneas | 19–25 perdidas | 0 perdidas |
| Pedido de lote inexistente | aceptado | rechazado (404) |
| `/Respaldo/` · `.md` · `api/_*.php` | accesibles | 404 |
| CSP · Permissions-Policy · HSTS | ausentes · 30 días | presentes · 1 año |
| React #418 en la portada | 5 de 5 cargas | **0 de 5** (desplegable de perfiles igual) |
| Fallos de contraste AA (65 rutas) | 225 | **33** · 0 nuevos · 0 empeoran |
| Bajada del precio en la barra («▼ x %») | invisible (verde sobre verde) | visible (7.3:1) |
| Rutas con errores de consola | 17 | 16 · ninguna nueva |
| Rutas que no responden 200 | 0 | 0 |
| Menú móvil con sesión · navegación interna · login | OK | OK |
| Diseño | tema «Origen» | identidad Stradale (verde, crema, caramelo, DM Sans) |

## Revisión independiente de mis parches
- Codex y modelo local (`qa/revisiones/`). Ajustes aplicados a partir de ella: `productor_id` vacío
  recurre a `published_by`; la regla de `api/_*.php` cubre `PATH_INFO`; ya no se bloquean `.doc/.docx`.
- Puntos señalados y comprobados sin cambio: `miembro_publico()` existe con lista blanca; el admin
  ve todo con `action=all`; no hay bloqueos anidados entre archivos (sin interbloqueo); todos los
  formularios envían `loteId`; ningún flujo usa cámara/micrófono/pagos (Permissions-Policy segura).

## Limitaciones conocidas (no empeoran; ya existen en la publicada)
- React #418 en Academia **con sesión**: viene del componente React (requiere su fuente para corregirlo).
- Errores de consola restantes = 401/403 esperados sin sesión y 404 de imágenes de `uploads/` que
  solo faltan en local.
- 33 avisos de contraste restantes: varios son falsos positivos (texto sobre degradado/imagen, emoji).
- Pruebas con sesión hechas con cuentas de prueba locales; no se crearon cuentas en producción.
