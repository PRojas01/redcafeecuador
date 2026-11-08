# Auditoría técnica — 8 de noviembre de 2026 (versión 20261108a)

Rendimiento, seguridad, SEO y accesibilidad de la plataforma Node (`servidor/` + `sitio/`).
Todo medido en local; nada contra producción.

## Corregido en esta versión

| Área | Problema | Corrección |
|---|---|---|
| Rendimiento | El servidor enviaba todo sin comprimir: portada 125 KB, CSS 343 KB. | Brotli/gzip según el navegador, en memoria: portada **15,7 KB**, CSS **57,7 KB** (−84 %). |
| Rendimiento | Sin ETag: cada visita volvía a bajar todo el HTML y las fotos. | ETag + 304. HTML `no-cache` (revalida, no se queda viejo). Fotos 7 días, fuentes 1 año, `_next/static` y `?v=` 1 año. |
| Rendimiento | `admin-visual-runtime.js` (sin `?v=`) se guardaba **un año** como inmutable: un cambio no llegaba nunca. | JS/CSS sin versión: 1 hora y revalidar. |
| Compatibilidad | Videos sin `Range`: Safari en iPhone no reproduce un video que no se sirve por trozos. | Respuestas 206/416 para mp4, webm y pdf. |
| Seguridad | `sharp` (procesa las fotos que suben los miembros) con fallos altos en libvips/libheif/librsvg. | `sharp` 0.35.5. |
| SEO | **Todas** las noticias, recetas, cursos y páginas legales decían a Google que eran copia de la portada o de su listado (`canonical` heredado). No se indexaban aunque estuvieran en el sitemap. | Cada página con su canonical. Lotes y cursos sin carpeta propia: el servidor pone su dirección en el canonical de la plantilla. |
| SEO | Panel, admin, chat, recuperar, gestión del bar, contratar y vista previa de factura estaban en «index». | `noindex, nofollow`. Los 6 lotes de ejemplo: `noindex, follow`. |
| SEO | 36 páginas con título repetido (p. ej. 12 cursos con «Academia del café…») y «Red Café Ecuador · Red Café Ecuador». | Título propio por receta, curso, lote y página; marca una sola vez. |
| Contenido | Las recetas del sitio compilado decían «Marcador local de prueba» con un único paso «Preparar» (desde el 26-oct). Es lo que ve Google y lo que se muestra si la API no responde. | Recuperadas las 6 recetas reales desde la copia PHP de producción. Ahora viven en `plataforma_cafe/lib/contenido/` (antes en `public/data/`, que `.gitignore` excluye: por eso se perdían en cada compilación). |

Comprobado: 71 pruebas vitest, 65 rutas en Chromium sin errores de hidratación (#418) ni de
JS, y el texto visible de las 66 páginas es idéntico salvo las recetas.

## Revisado y en buen estado

- Sesiones: token aleatorio de 32 bytes, solo su sha256 en la base, cookie `HttpOnly; Secure; SameSite=Lax`.
- CSRF: `Sec-Fetch-Site` + `Origin`; desde otro sitio solo lecturas.
- Límites de intentos por IP en 27 módulos; la IP se toma del último salto del proxy (no falsificable).
- Cuerpo limitado a 12 MB antes de analizarlo; rutas con doble codificación, `..` y archivos ocultos bloqueados.
- Subidas: CSP `sandbox` propia, solo jpg/png/webp/pdf; los documentos de identidad no pasan por `uploads`.
- `robots.txt`, `sitemap.xml` dinámico (solo lotes reales), `lang="es"`, un `h1` por página, todas las imágenes con `alt`.

## Pendiente (no se cambió, a propósito)

1. **Hosting PHP antiguo (lo hace Pedro en GoDaddy)**: borrar `api/agregar-cursos.php`; quitar las
   variables `REDCAFE_IMPORTACION` y `REDCAFE_PASS_ADMIN_RESTABLECER` cuando ya no hagan falta.
2. `next` 15.1.6 aparece como crítico en `npm audit`, pero los fallos son del servidor de Next
   (middleware, optimizador de imágenes) y aquí solo se usa el export estático. Subir a Next 16
   es un cambio grande: hacerlo junto con la migración de la capa propia a React.
3. `@hono/node-server`: el aviso es de `serveStatic`, que no se usa (el sitio lo sirve
   `estatico.ts`). `deepmerge-ts` viene con la CLI de Prisma. Revisar al subir de versión mayor.
4. CSP sin `script-src`: Next mete scripts en línea; endurecerla exige nonces o hashes por página.
5. La portada precarga 4 fotos que están más abajo (`vender`, `aprender`, `servicios`, `recetas`):
   compiten con la foto principal en móviles lentos. Quitar `priority` de esas imágenes.
6. 33 scripts por página (29 de la capa propia): se reducirán al pasarlos a React.
