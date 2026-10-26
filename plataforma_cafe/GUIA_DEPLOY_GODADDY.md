# Despliegue en GoDaddy (Hosting compartido cPanel)

**Fecha:** 13 de agosto de 2026 · **Aplica a:** Red Café Ecuador (Next.js estático)

> cPanel no ejecuta Node.js, por eso la app está configurada como **build 100% estático**
> (`next.config.ts` → `output: "export"`). Todo el sitio se genera en `out/` y se sube a
> `public_html`. No requiere base de datos ni procesos en segundo plano.

---

## 0. Requisitos
- Cuenta de hosting compartido **GoDaddy con cPanel** (plan básico alcanza).
- Node.js ≥ 20 en tu máquina local (para generar el build).
- Dominio ya apuntando al hosting (GoDaddy suele dejar `public_html` listo).

## 1. Generar el build estático (local)

```bash
npm install       # una sola vez
npm run build     # genera la carpeta out/
```

Verifica que `out/` contenga `index.html`, `marketplace/`, `academia/`, etc.

## 2. Waitlist con correo del hosting (PHP, sin servicios externos)

El formulario de la portada envía los datos a `enviar-waitlist.php` (incluido en `public/`
y copiado a `out/`), que usa la función `mail()` de GoDaddy/cPanel para enviar el correo a
`hola@redcafeecuador.com` y guarda una copia en `/waitlist.log`. No requiere Formspree ni cuentas externas.

Para cambiar el destinatario: edita la línea `$to = '...'` en `public/enviar-waitlist.php` y
regenera el build. En locales sin PHP (ej. `next dev`), la página guarda en `localStorage`
del navegador y ofrece WhatsApp (funciona, pero no centraliza los registros).

## 3. Subir a cPanel

1. Accede a **cPanel → Administrador de archivos**.
2. Entra a `public_html`.
3. Borra los archivos por defecto (`index.html` de bienvenida, etc.) — opcional.
4. Sube el contenido de `out/` (no la carpeta `out` misma, **su contenido**):
   - Sube `index.html`, la carpeta `_next/`, `marketplace/`, `academia/`, etc.
   - o comprime `out/` en ZIP, súbelo y usa "Extraer en" eligiendo la ruta correcta.
5. Asegúrate de que la estructura quede así:

```
public_html/
├── index.html
├── 404.html
├── _next/            ← obligatorio (código JS/CSS)
├── enviar-waitlist.php  ← obligatorio (formulario de la portada)
├── marketplace/…
├── academia/…
├── servicios/…
└── ...resto de rutas estáticas
```

> **Importante:** `enviar-waitlist.php` debe estar en la raíz de `public_html`, junto a `index.html`.
> Si no se sube, el formulario de la portada usa el fallback de `localStorage`.

## 4. Comprobar

- Abre `https://tudominio.com` → debe verse la landing.
- Prueba el formulario de la portada: tras enviar, revisa que llegue el correo a `hola@redcafeecuador.com` y que exista `waitlist.log` con el registro.
- Navega a `/marketplace/[id]` y `/academia/[id]` (se generan como archivos estáticos por `generateStaticParams`).
- Si una ruta da 404, revisa que su carpeta esté en `public_html` y que el archivo se llame `index.html` dentro de su carpeta.

## 5. `.htaccess` (si se necesita rutas limpias / SSL)

GoDaddy suele manejar HTTPS automáticamente. Si quieres forzar https y pesimizar rutas, crea `public_html/.htaccess`:

```apache
# Forzar HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [L,R=301]

# Página 404 personalizada
ErrorDocument 404 /404.html
```

> Las rutas ya se generan con `trailingSlash` (p. ej. `/marketplace/lote-1/`), que es lo
> correcto para hosting estático.

## 6. Actualizaciones futuras

Cada vez que cambies contenido (cursos, lotes, landing):
1. `npm run build`
2. Sube **solo** los archivos cambiados de `out/` a `public_html/` (recomendado: subir el `_next/` completo y las páginas tocadas).
3. Si usas CDN/limpieza de caché, purga tras subir.

## Notas
- No se requiere Node en GoDaddy: todo el código se entrega como HTML/JS/CSS pre-generado (+ `enviar-waitlist.php` para el correo).
- La app no guarda datos del servidor (todo en `localStorage` del navegador + waitlist por PHP/mail del hosting). Para backend/BD reales ver `docs/BACKLOG_TECNICO.md` (Fase 1 productiva, requiere VPS/Node).