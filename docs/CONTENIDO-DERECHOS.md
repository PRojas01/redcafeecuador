# Derechos y responsabilidad del contenido

Cada formulario administra su aceptación y envía acepta_derechos en su propia petición. No hay interceptor global. El servidor conserva derechos-v1 y las excepciones administrativas existentes.

| Formulario | Archivo que lo renderiza | Acción API | Acción protegida del servidor |
| --- | --- | --- | --- |
| Lote y foto | `plataforma_cafe/app/panel/page.tsx:708` | lotes.publish; uploads.image | lotes.publish; uploads.image |
| Servicio y fotos | `plataforma_cafe/app/panel/page.tsx:789` | marketplace-servicios.publish; uploads.image | marketplace-servicios.publish; uploads.image |
| Menú del panel | `plataforma_cafe/app/panel/page.tsx:1446` | menu.add | menu.add |
| Valoración | `plataforma_cafe/app/panel/page.tsx:1801` | ratings.create | ratings.create |
| Menú del bar | `plataforma_cafe/app/bar/gestion/page.tsx:54` | menu.add | menu.add |
| Publicación e imágenes de comunidad | `plataforma_cafe/app/comunidad/page.tsx:59` | comunidad.create; uploads.image | comunidad.create; uploads.image |
| Editar publicación | `plataforma_cafe/components/MuroComunidad.tsx:202` | comunidad.update | comunidad.update |
| Comentar publicación | `plataforma_cafe/components/MuroComunidad.tsx:258` | comunidad.comment | comunidad.comment |
| empleos publish | `sitio/redcafe-empleos.js:217` | empleos.publish | empleos.publish |
| empleos update | `sitio/redcafe-empleos.js:319` | empleos.update | empleos.update |
| busco-empleo publish | `sitio/redcafe-busco-empleo.js:186` | busco-empleo.publish | busco-empleo.publish |
| busco-empleo update | `sitio/redcafe-busco-empleo.js:276` | busco-empleo.update | busco-empleo.update |
| requerimientos publish | `sitio/redcafe-requerimientos.js:275` | requerimientos.publish | requerimientos.publish |
| requerimientos update | `sitio/redcafe-requerimientos.js:306` | requerimientos.update | requerimientos.update |
| Fotos de requerimiento | `sitio/redcafe-requerimientos.js:213` | uploads.image | uploads.image |
| Publicar lote y certificado | `sitio/redcafe-panel-publicaciones.js:1084` | lotes.publish; uploads.documento; lotes.update | lotes.publish; uploads.documento; lotes.update |
| Publicar servicio y fotos | `sitio/redcafe-panel-publicaciones.js:1398` | marketplace-servicios.publish; uploads.image | marketplace-servicios.publish; uploads.image |
| Fotos de lote | `sitio/redcafe-panel-publicaciones.js:287` | uploads.image; lotes.update | uploads.image; lotes.update |
| Fotos de servicio | `sitio/redcafe-panel-publicaciones.js:287` | uploads.image; marketplace-servicios.update | uploads.image; marketplace-servicios.update |
| Documentos del lote | `sitio/redcafe-panel-publicaciones.js:404` | uploads.documento; lotes.update | uploads.documento; lotes.update |
| Crear curso | `sitio/redcafe-academia.js:984` | cursos.publish | cursos.publish |
| Editar curso | `sitio/redcafe-academia.js:984` | cursos.update | cursos.update |
| Imagen de bloque | `sitio/redcafe-academia.js:857` | uploads.image | uploads.image |
| Material de curso | `sitio/redcafe-academia.js:1033` | uploads.documento | uploads.documento |
| Acceso del curso | `sitio/redcafe-cursos-autor.js:162` | cursos.update | cursos.update |
| Postulación a empleo | `plataforma_cafe/components/marketplace/Bolsa.tsx:121` | empleos.postular | No exige exigirDerechos (casilla solicitada explícitamente) |
| Contacto de búsqueda | `plataforma_cafe/components/marketplace/Bolsa.tsx:121` | busco-empleo.contactar | No exige exigirDerechos (casilla solicitada explícitamente) |
| Oferta a requerimiento | `plataforma_cafe/components/marketplace/Bolsa.tsx:121` | requerimientos.ofertar | No exige exigirDerechos (casilla solicitada explícitamente) |

La publicación y edición de empleos, búsquedas y requerimientos se renderizan en la capa propia. Bolsa.tsx renderiza respuestas a esas publicaciones.

Sin formulario de miembro localizado: imagenes.subir (perfil, local y slots de lote); la pantalla existente en app/admin/page.tsx es administrativa y está exenta. No quedan formularios conocidos sin cubrir.

Sólo las fotos de lotes solicitan cámara con accept="image/*" capture="environment" y la nota «Toma la foto en el momento con tu cámara.». No se modificó HTML compilado ni el servidor.

Verificación local: servidor typecheck, 19 pruebas y build correctos. Frontend: tres importaciones JSON ausentes y TS7006 derivado en lib/data.ts:669. Sin pruebas de navegador ni MySQL.
