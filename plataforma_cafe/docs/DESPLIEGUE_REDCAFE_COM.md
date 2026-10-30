# Despliegue redcafeecuador.com — WordPress + Plataforma Next.js

Fecha: 2026-08-19
Estado: GUÍA para migración de solucionespro.net/redcafeecuador → redcafeecuador.com

## Arquitectura objetivo

```
redcafeecuador.com/
├── (WordPress en raíz)          ← marketing, blog, contenido editorial
│   ├── wp-content/themes/redcafe-child/   ← child theme con home diseñado
│   └── (página home = template "Home Red Café")
│
└── plataforma/                  ← la app Next.js (export estático + APIs PHP)
    ├── index.html               ← home de la plataforma
    ├── api/                     ← APIs PHP (auth, pedidos, servicios, ...)
    ├── data/                    ← JSON de datos (members, pedidos, ordenes...)
    ├── .htaccess                ← rewrite para rutas Next.js
    ├── manifest.json            ← PWA
    └── sw.js                    ← service worker (precaché)
```

WordPress en la raíz NO interfiere con `/plataforma/`: el `.htaccess` del
subdirectorio se encarga de sus propias rutas, y el de WordPress sigue
controlando la raíz.

## 1. Correo de contacto

- **Correo público / soporte:** `info@redcafeecuador.com`
- **Correo transaccional (From):** `no-reply@redcafeecuador.com`
- Crear ambos buzones en cPanel → Email Accounts.

> Si GoDaddy bloquea `mail()` hacia dominios externos, activar el envío
> vía SMTP del propio hosting (los formularios caen a log con fallback).

## 2. Subir la plataforma a /plataforma/

### 2.1 Generar el build (ya documentado en PLAN_MEJORA y memoria)

```bash
rm -rf out
NEXT_PUBLIC_BASE_PATH="/plataforma" \
NEXT_PUBLIC_WHATSAPP="593999999999" \
NEXT_PUBLIC_WHATSAPP_MOSTRAR="+593 99 999 9999" \
npm run build
```

Verificaciones tras build:
- `out/manifest.json` → `"id": "/plataforma/"`, `"start_url": "/plataforma/"`, `"scope": "/plataforma/"`
- `out/sw.js` → `const BASE = "/plataforma"`
- `out/index.html` → prefijos `/plataforma/_next/...` y `/plataforma/manifest.json`
- `out/api/precios.php` → CORS incluye `redcafeecuador.com`
- `out/api/mailer.php` → `MAIL_FROM = 'Red Café Ecuador <no-reply@redcafeecuador.com>'`
- `out/api/precios-refresh.php` → URL interna `/plataforma/api/...`

### 2.2 Subida (cPanel → File Manager)

1. Comprimir `out/` como `plataforma.zip`.
2. En cPanel, entrar a `public_html/`.
3. Crear carpeta `plataforma/`.
4. Subir `plataforma.zip` dentro de `plataforma/` y **Extraer**.
5. Mover el contenido extraído a `plataforma/` (debe quedar
   `plataforma/index.html`, NO `plataforma/out/index.html`).
6. Borrar `plataforma.zip`.
7. Permisos: carpetas `755`, archivos `644` (cPanel File Manager →
   Seleccionar todo → Cambiar permisos).
   - CRÍTICO: `plataforma/data/` debe quedar **755** (no 777).

### 2.3 Cron de precios (cPanel → Cron Jobs)

```
0 6 * * * /usr/bin/curl -s "https://redcafeecuador.com/plataforma/api/precios-refresh.php" > /dev/null 2>&1
```

## 3. Home de WordPress (child theme "Red Café")

### 3.1 Activar el child theme

El tema hijo está en `redcafeecuador.com/wp-content/themes/redcafe-child/`:

- `style.css` — header del tema hijo (Template: kubio) + CSS del home
- `functions.php` — encola estilos, registra el template
- `template-redcafe-home.php` — el home diseñado

Pasos:
1. WordPress → Apariencia → Temas → Activar **Red Café Ecuador**.
2. Páginas → Añadir nueva → Título "Inicio" → Template: **Home Red Café** →
   Publicar.
3. Ajustes → Lectura → "Tu página de inicio muestra" → **Una página estática** →
   Portada: **Inicio** → Guardar.

### 3.2 Verificar el home

- URL: `https://redcafeecuador.com/`
- Debe mostrar hero con foto real, 3 perfiles, servicios con precios,
  sección de confianza y CTA hacia `/plataforma/`.

### 3.3 Plugin "Contenido Plataforma" (opción B: editar catálogos desde WP)

El plugin `redcafe-contenido` está en `wp-content/plugins/redcafe-contenido/`:

- **Activar** en Plugins → "Red Café — Contenido de la Plataforma".
- Aparece el menú **Contenido Plataforma** con 4 pestañas: Noticias, Cursos,
  Planes y Servicios.
- CRUD completo (crear/editar/eliminar) sobre los catálogos que consume la
  plataforma en `plataforma/data/contenido-*.json`.
- Requisito: que `plataforma/data/` exista y sea escribible (755).
- Requiere permiso `manage_options` (solo administradores de WP).
- Cada guardado hace un backup `.bak` del archivo previo.

### 3.4 Menú y enlaces

Crear menú (Apariencia → Menús) con:
- **Inicio** → `/`
- **Plataforma** → `/plataforma/`
- **Servicios** → `/plataforma/servicios/`
- **Marketplace** → `/plataforma/marketplace/`
- **Blog** → `/blog/` (si aplica)
- **Contacto** → formulario CF7 o `mailto:info@redcafeecuador.com`

## 4. Verificación post-despliegue

| Qué | URL | Esperado |
|---|---|---|
| Home WP | `/` | Hero + CTA "Ir a la Plataforma" |
| Plataforma | `/plataforma/` | Home de la app cargada |
| Assets | `/plataforma/_next/...` | 200, prefijo correcto |
| API auth | `/plataforma/api/auth.php?action=me` | `{"ok":true,...}` o 401 |
| API servicios | `/plataforma/api/servicios.php?action=list` | catálogo JSON |
| Manifest | `/plataforma/manifest.json` | start_url `/plataforma/` |
| SW | `/plataforma/sw.js` | precaché BASE `/plataforma` |
| PWA install | Android/Chrome | ofrece instalar |
| CORS precios | fetch desde `/plataforma/` | sin bloqueo |
| HTTPS | cualquier ruta | 301 → https |

## 5. Rollback

- Conservar el ZIP anterior (`red-cafe-ecuador-20260818-V10-paleta-lanzamiento.zip`).
- Si `/plataforma/` falla: borrar carpeta y re-subir ZIP anterior.
- Si el child theme falla: reactivar tema Kubio desde el admin de WP.

## 6. Notas de seguridad

- `data/` protegido por `.htaccess` del subdirectorio (`RewriteRule ^data/ - [F,L]`).
- `_bootstrap.php` y `waitlist.log` bloqueados (`<Files>`).
- Sesión PHP: `session.cookie_secure 1`, `HttpOnly`, `SameSite=Lax`.
- 2FA: rate limit 5 intentos / 10 min; dev_code solo con `OTP_DEBUG_MODE=1`.
- CORS de `precios.php` solo permite el propio dominio (redcafeecuador.com).