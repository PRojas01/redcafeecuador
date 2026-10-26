# Auditoría de QA, seguridad y usabilidad
**Fecha:** 18 de agosto de 2026 · Ejecutada antes de compilar el paquete
**Método:** pruebas funcionales reales contra una copia aislada del backend, revisión de código, y medición de las 16 páginas construidas a 375 px. Ninguna prueba se hizo contra producción ni contra los datos reales.

---

## 1. QA funcional

**Endpoints públicos** — los ocho responden 200: `auth`, `cms`, `contenido`, `media`, `servicios`, `precios`, `comunidad`, `lotes`.

**Flujo de productor, probado de extremo a extremo:**

| Prueba | Resultado |
|---|---|
| Registro de productor | correcto |
| Publicar finca con coordenadas válidas | guarda `lat -3.99 / lng -79.20` |
| Publicar con coordenadas imposibles (lat 99) | **se guarda sin coordenadas y no rompe el alta** |
| Listado de lotes | 1 de 8 es ubicable: solo el real. Los de ejemplo no tienen GPS |

Esto cierra el fallo de esta mañana: **una finca registrada ahora sí puede aparecer en el mapa**, y las de ejemplo no se cuelan en él.

**Contenido editable:** las cuatro secciones se extrajeron sin pérdida — noticias 6→6, cursos 9→9, planes 13→13, servicios 9→9. `planes.json` y `servicios.json` originales, intactos.

**Panel admin:** los once recursos responden 200 tras corregir el `in_array` sobre array asociativo que lo tenía inservible. El editor de páginas completa su ciclo (crear, listar, actualizar con persistencia, borrar) y el borrado con `../` ahora se rechaza con 422.

---

## 2. Seguridad

### Verificado con ataque real

**Reencodado de imágenes.** Preparé un JPEG válido con `<?php system($_GET[1]); ?>` incrustado en un comentario. Se subió, se reencodó y **el archivo final no contiene el código**: 4.048 bytes de entrada, 3.049 de salida, JPEG limpio. La defensa principal del módulo funciona.

**Autorización.** Actualizar contenido sin sesión: 403. Con sesión de usuario normal: 403. Subir imagen a un hueco de plataforma sin ser admin: rechazado, y no se guarda archivo. `action=map` es público, como debe.

**Path traversal.** Sección inventada con `../../etc/passwd`: 400. Borrado de página con `../`: 422.

### Riesgos abiertos

**El `.htaccess` de `uploads/` no se pudo verificar aquí.** El servidor de pruebas de PHP no lee `.htaccess`, así que un `.php` colocado en `uploads/` sí se ejecutó en el entorno de prueba. En Apache la protección debería funcionar, pero **depende de que `AllowOverride` esté activo en el hosting**. Es la comprobación que hay que hacer en el servidor antes de habilitar cualquier subida.

**`cms.php` devuelve HTML de WordPress** en el campo `cuerpo` (`content.rendered`). Hoy ninguna página lo consume, así que no hay riesgo activo. Pero el día que se pinte, debe sanearse: inyectarlo con `dangerouslySetInnerHTML` sería XSS con el contenido de WordPress como vector.

**Orden de validación en `imagenes.php`:** valida el archivo antes de comprobar la sesión. No permite subir —lo verifiqué—, pero un anónimo obtiene mensajes sobre el formato esperado. Conviene mover la guarda de autorización al principio.

**Sigue sin token CSRF** en todo el backend, y `input()` acepta `$_REQUEST`. Es el hallazgo de la auditoría de la mañana que sigue abierto, y ahora pesa más: hay más acciones de escritura que entonces.

---

## 3. Usabilidad y accesibilidad

Medición de 16 páginas a 375 × 812:

| Métrica | Resultado |
|---|---|
| Desbordamiento horizontal | **0 en las 16** |
| Controles por debajo de 44 px | **2**, ambos enlaces en línea dentro de texto legal |
| Imágenes sin `alt` | **0** |
| Páginas sin un `<h1>` único | **0** |
| Campos de formulario sin etiqueta ni `aria-label` | **3**, todos en marketplace |

**Lo que hay que arreglar:** los tres campos sin etiqueta del marketplace son los filtros. Un lector de pantalla los anuncia como «cuadro combinado» sin decir de qué. Es media hora de trabajo.

**Lo que preocupa más, y no es un fallo técnico:** la portada mide **18.728 px** en móvil, unas 23 pantallas. Ha crecido un 15 % con el rediseño. Ninguna sección se eliminó al añadir las del documento V2.2. Es la pieza que más margen de mejora tiene en conversión.

---

## 4. Veredicto

**Listo para empaquetar**, con dos condiciones que no dependen del código:

1. Comprobar en el servidor que un `.php` dentro de `uploads/` no se ejecuta, **antes** de habilitar la subida propia. Si se decide usar la biblioteca de WordPress, este punto desaparece.
2. Siguen abiertas las cuatro tareas de servidor: `LEEME_V11.txt` público, el enlace-broma en `data/media.json`, la contraseña de administrador y las cookies de GoDaddy sin consentimiento.

**No bloqueantes, para la próxima onda:** etiquetas en los filtros del marketplace, token CSRF, saneado del HTML de WordPress antes de consumirlo, y acortar la portada.
