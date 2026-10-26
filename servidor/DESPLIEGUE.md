# Publicar el servidor Node.js (GoDaddy)

El servidor sustituye a `api/*.php` con el mismo contrato: el sitio estático
(Next + capa propia) no cambia. Necesita **Node.js 22+** y **PostgreSQL 14+**.

## Qué plan de GoDaddy sirve

| Plan | ¿Sirve? | Notas |
|---|---|---|
| **VPS** (o servidor dedicado) | Sí — recomendado | Control total: Node 22, PostgreSQL, nginx, pm2, HTTPS con certbot. |
| Hosting compartido cPanel con «Setup Node.js App» | Solo si ofrece Node 22 y hay PostgreSQL | Muchas cuentas compartidas no traen PostgreSQL: se puede usar uno gestionado (Neon, Supabase, Render) en `DATABASE_URL`. Comprobar la versión de Node disponible antes. |
| Hosting compartido sin Node | No | Mantener el PHP corregido (`redcafe-actualizacion-20261024a-corregido.zip`). |

## Pasos comunes

1. **Copia de seguridad** de producción (cPanel → Copias de seguridad + descarga de `public_html/data/`).
2. Base de datos vacía y su usuario. Anota la URL `postgresql://usuario:clave@host:5432/redcafe`.
3. Clona el repositorio en el servidor (fuera de `public_html`):
   ```bash
   git clone git@github.com:PRojas01/redcafeecuador.git ~/redcafe
   cd ~/redcafe/servidor
   cp .env.ejemplo .env   # y rellénalo; REDCAFE_CLAVE_DATOS = openssl rand -hex 32
   npm ci                 # ejecuta prisma generate
   npm run build
   npm run db:push        # crea las tablas
   ```
4. **Sitio estático**: genera el export y la capa propia (ver `README.md` de la raíz)
   y copia el resultado, **sin `api/`, `data/` ni `uploads/`**, a la carpeta de `REDCAFE_SITIO`.
5. **Datos**: con el sitio PHP en modo mantenimiento, copia `public_html/data/` al servidor y:
   ```bash
   npm run importar -- /ruta/a/data                       # simulación: revisa el informe
   npm run importar -- /ruta/a/data --aplicar --pass-admin /ruta/.redcafe_admin_pass
   ```
   Copia `public_html/uploads/` a `REDCAFE_UPLOADS`. Borra la copia de `data/` cuando termines.
6. Arranca (ver abajo) y prueba: `/`, `/api/lotes.php?action=list`, inicio de sesión, admin.

### VPS: pm2 + nginx
```bash
npm i -g pm2 && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
```
nginx como proxy a `127.0.0.1:8080` con `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
y `X-Forwarded-Proto $scheme`; HTTPS con `certbot --nginx -d redcafeecuador.com -d www.redcafeecuador.com`.
`REDCAFE_PROXY_CONFIABLE=1`. Una sola instancia (las tareas diarias asumen una).

### cPanel «Setup Node.js App»
- Node.js version: 22 · Application root: `redcafe/servidor` · Application URL: el dominio
- Application startup file: **`app.cjs`**
- Variables de entorno: las del `.env` (o deja el `.env` en `servidor/`, se carga solo).
- «Run NPM Install», luego en la terminal: `npm run build && npm run db:push`, y «Restart».

## Actualizar
```bash
cd ~/redcafe && git pull && cd servidor && npm ci && npm run build && npm run db:push
pm2 restart redcafe        # o «Restart» en cPanel
```

## Volver atrás
El PHP no se borra durante la transición: si algo falla, se vuelve a apuntar el
dominio al `public_html` anterior. Los datos creados en el servidor nuevo
después del cambio habría que exportarlos (`/api/admin.php?action=export`).

## Lo que hace solo el servidor
Copia de seguridad diaria en `REDCAFE_RESPALDOS` (rotación 7/4/6), precio del
café cada 6 h y revisión diaria de datos con aviso a la administración.
Además, programa un `pg_dump` diario desde el sistema (cron) — es la copia completa.
