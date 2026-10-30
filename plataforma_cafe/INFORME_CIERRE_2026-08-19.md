# Cierre de la jornada — Red Café Ecuador
**Fecha:** 19 de agosto de 2026 · **Paquete:** `red-cafe-ecuador-20260819-0900-plataforma-b.zip`
**Base:** INFORME_CIERRE_2026-08-18.md · docs/DESPLIEGUE_REDCAFE_COM.md · EVALUACION_WORDPRESS.md

---

## 1. Qué se cerró

### Migración a redcafeecuador.com — configuración base
| Cambio | Archivo |
|---|---|
| `SITE_URL` → `https://redcafeecuador.com/plataforma` | `app/layout.tsx` |
| Iconos y manifest dinámicos con `CONFIG.basePath` | `app/layout.tsx` |
| Registro PWA con `CONFIG.basePath` | `components/RegistrarPWA.tsx` |
| `manifest.json`: id/start_url/scope → `/plataforma/` | `public/manifest.json` |
| `sw.js`: `CACHE=redcafe-v3`, `BASE=/plataforma` | `public/sw.js` |
| `.htaccess`: `RewriteBase /plataforma/` + HTTPS | `public/.htaccess` |
| Fallback de precios → `/plataforma` | `app/servicios/precios/page.tsx` |
| Emails y marca → redcafeecuador.com | `mailer.php`, `auth.php`, `twofactor.php`, `precios.php`, `precios-refresh.php` |

### Correo de contacto unificado
- Sustituido `hola@redcafeecuador.com` → **`info@redcafeecuador.com`** en 7 archivos:
  `lib/config.ts`, `public/enviar-waitlist.php`, `public/api/mailer.php`,
  `app/propiedad-y-uso/page.tsx` (x2), `app/terminos-y-condiciones/page.tsx`,
  `docs/MANUAL_SOPORTE.md`, `docs/PROPIEDAD_Y_USO.md` (x2).
- `no-reply@redcafeecuador.com` se mantiene como remitente de correos transaccionales.

### Home de WordPress con el tema (Opción C)
- **Child theme `redcafe-child`** (hereda de Kubio, no toca el builder ni la DB):
  - `style.css` — paleta espresso (#3D2314/#5C3A21/#D9B48F/#F4E6D4/#A07855/#4F6A2F/#9E3F1C),
    grain overlay, touch targets ≥48px, hero con gradiente espresso→cereza.
  - `functions.php` — encola Kubio + child + Google Fonts (Bricolage Grotesque/Inter),
    registra el template «Home Red Café», clase `rce-home` al body.
  - `template-redcafe-home.php` — portada: hero con **foto real**
    (`pexels-photo-16943863.jpeg`), 3 perfiles (productores / tostadores / bares),
    8 servicios con precio real ($25/$45/$60/$10), confianza, 3 pasos y CTA
    «Ir a la Plataforma» → `/plataforma/`.
- Se usan las **fotografías reales** ya subidas al hosting
  (`wp-content/uploads/2026/08/pexels-photo-*.jpeg`, 16 originales).

### Contenido editable desde WordPress (Opción B)
- **Plugin `redcafe-contenido`** — menú «Contenido Plataforma» en el admin de WP:
  - CRUD completo (crear/editar/eliminar) sobre `plataforma/data/contenido-*.json`
    (noticias, cursos, planes, servicios).
  - Validación de ID (mismo criterio que `contenido.php`), campos requeridos,
    backup automático `.bak` en cada guardado, solo `manage_options`.
  - Escribe directamente en el subdirectorio `/plataforma/` del mismo hosting.
- **La app lee el contenido editable en runtime** (`lib/useContenido.ts`):
  - `useContenido(seccion, fallback)` hace fetch a `/api/contenido.php?action=list`
    y cae a `lib/data.ts` si la API no responde.
  - Aplicado en: `app/academia/page.tsx` (cursos), `app/afiliate/page.tsx` (planes),
    `app/noticias/page.tsx` (server) + `components/GrillaNoticias.tsx` (client).
  - Así, editar un texto/precio desde WP se refleja **sin regenerar el build**.

### Guía de despliegue
- **`docs/DESPLIEGUE_REDCAFE_COM.md`** creada: arquitectura raíz+subdirectorio,
  build con `NEXT_PUBLIC_BASE_PATH=/plataforma`, subida a `public_html/plataforma/`
  con permisos 755/644 (y `data/` sin 777), cron de precios, activación del child
  theme, plugin B, verificación post-despliegue, rollback y notas de seguridad.

---

## 2. Verificación final

| Comprobación | Resultado |
|---|---|
| `php -l` de los 3 archivos del child theme | Sin errores |
| `php -l` del plugin `redcafe-contenido.php` | Sin errores |
| `php -l` del `template-redcafe-home.php` | Sin errores |
| Build `NEXT_PUBLIC_BASE_PATH=/plataforma` | Correcto |
| Rutas exportadas | 51 páginas + noticias SSG |
| `hola@` restante en el código | **0** (grep) |
| `info@redcafeecuador.com` presente | 8 referencias |

---

## 3. Los paquetes

### `redcafe-wp-home-b20260819.zip` (11 KB)
Child theme + plugin, rutas `themes/redcafe-child/` y `plugins/redcafe-contenido/`.
Extraer en `wp-content/`.

### `red-cafe-ecuador-20260819-0900-plataforma-b.zip` (1,27 MB)
App build con `/plataforma` + hook `useContenido`. Extraer en `public_html/plataforma/`.
Respetar permisos: carpetas 755, archivos 644, `data/` nunca 777.

---

## 4. Acciones para el dueño (en WordPress)

1. **Activar el child theme**: Apariencia → Temas → **Red Café Ecuador**.
2. **Crear la portada**: Páginas → Nueva «Inicio» → Template **Home Red Café** → Publicar.
3. **Portada estática**: Ajustes → Lectura → «Una página estática» → Portada: Inicio.
4. **Activar el plugin**: Plugins → **Red Café — Contenido de la Plataforma**.
5. **Requisito del plugin**: que `public_html/plataforma/data/` exista y sea 755.
6. **Crear buzones**: `info@` y `no-reply@` en cPanel → Email Accounts.
7. **Cron de precios** (cPanel → Cron Jobs):
   `0 6 * * * /usr/bin/curl -s "https://redcafeecuador.com/plataforma/api/precios-refresh.php" > /dev/null 2>&1`

---

## 5. Lo que sigue abierto

- **Nuevas rutas de detalle requieren rebuild.** Un nuevo curso/noticia aparece en las
  listas al instante (runtime), pero su página individual (`/academia/[id]`,
  `/noticias/[slug]`) necesita un nuevo build para generar la ruta. Opciones futuras:
  una ruta catch-all dinámica o aceptar el ciclo editar→rebuild para contenidos nuevos.
- **El home de la plataforma (`/plataforma/`) sigue estático** en su sección de
  planes/servicios extra; solo academia, afiliate y noticias consumen el contenido
  editable. Aplicar `useContenido` al home es el siguiente paso natural si se quiere
  que también se edite desde WP.
- **Sin pasarela de pago.** Los servicios se cobran por transferencia con confirmación
  manual (Onda 2, sin cambios hoy).
- **`data/` sigue dentro del webroot** protegido por `.htaccess`. Sacarlo fuera es la
  mejora de seguridad pendiente más importante.
- **Sin token CSRF** y `input()` sigue aceptando `$_REQUEST` en escrituras.
- **Sin copia de seguridad automática** de `data/` (los guardados del plugin hacen `.bak`).
- **El proyecto no está bajo control de versiones.** Un `git init` haría auditable
  cualquier entrega futura.