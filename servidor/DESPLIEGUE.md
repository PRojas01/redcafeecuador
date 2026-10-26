# Publicar el servidor Node.js (GoDaddy)

El servidor sustituye a `api/*.php` con el mismo contrato: el sitio estático
(Next + capa propia) no cambia. Necesita **Node.js 22** (funciona desde 18.18) y **MySQL 8 o MariaDB 10.6+** (la base que trae el cPanel).

## Qué plan de GoDaddy sirve

| Plan | ¿Sirve? | Notas |
|---|---|---|
| **VPS** (o servidor dedicado) | Sí | Control total: Node 22, MySQL, nginx, pm2, HTTPS con certbot. |
| Hosting compartido cPanel con «Setup Node.js App» | Sí (el de Red Café: Node 22 + MySQL) | Todo queda en GoDaddy: aplicación Node y base MySQL del propio cPanel. |
| Hosting compartido sin Node | No | Mantener el PHP corregido (`redcafe-actualizacion-20261024a-corregido.zip`). |

## Despliegue desde GitHub (GoDaddy conectado al repositorio)
GoDaddy instala y arranca **desde la raíz** del repositorio, rama `main`:
- `npm install` → instala y compila `servidor/` (script `postinstall` del `package.json` raíz).
- `npm start` → `node servidor/app.cjs`. Escucha en `PORT` (lo fija GoDaddy).
- Sitio estático: `public_html/` del propio repositorio (salvo que se fije `REDCAFE_SITIO`).

Variables de entorno que hay que poner en el panel de GoDaddy (no van en el repositorio):
`DATABASE_URL` (mysql://…), `REDCAFE_CLAVE_DATOS` (openssl rand -hex 32), `REDCAFE_ENTORNO=produccion`,
`REDCAFE_PROXY_CONFIABLE=1` y, si hay correo, `RESEND_API_KEY`. Sin `DATABASE_URL` el sitio se ve
pero la API responde 503 «falta configurar la base de datos».
La primera vez, crear las tablas: importar `servidor/prisma/esquema-mysql.sql` en phpMyAdmin (base vacía → Importar), o `npm run db:push` desde una consola con acceso a la base.

## Pasos comunes

1. **Copia de seguridad** de producción (cPanel → Copias de seguridad + descarga de `public_html/data/`).
2. Base de datos MySQL vacía y su usuario con **todos los privilegios** (cPanel → Bases de datos MySQL). URL: `mysql://usuario:clave@localhost:3306/base`.
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

### cPanel compartido «Setup Node.js App» (el caso de Red Café)
Comprobado: el cPanel ofrece **Node.js 22**.

**Base de datos**: cPanel → «Bases de datos MySQL» → crea la base, el usuario y asígnale TODOS los privilegios.
`DATABASE_URL="mysql://usuario:clave@localhost:3306/base"` (en cPanel el nombre lleva delante el usuario de la cuenta).
`npm run db:push` crea las tablas y las deja en `utf8mb4_bin` (distingue mayúsculas y acentos en los identificadores).

**Crear la aplicación** (cPanel → Setup Node.js App → Create Application):
- Node.js version: **22** · Application mode: Production
- Application root: `redcafe/servidor` (el repositorio clonado o subido fuera de `public_html`)
- Application URL: `redcafeecuador.com` · Application startup file: **`app.cjs`**
- Guardar `servidor/.env` (a partir de `.env.ejemplo`). Las rutas relativas del `.env` se leen desde `servidor/`.

**Instalar** (botón «Run NPM Install», o en la Terminal tras `source` del entorno virtual que muestra cPanel):
```bash
npm ci && npm run build && npm run db:push
```
Después, «Restart». Si `npm run build` se queda sin memoria en el compartido, compílalo en otro equipo y sube `dist/`.

**Notas del compartido**
- Passenger duerme la aplicación sin visitas: las tareas diarias (respaldo, revisión) se ponen al día al despertar, no se pierden.
- El dominio deja de servir `public_html` en cuanto la aplicación toma la URL: deja el PHP corregido como plan de vuelta (se recupera borrando la aplicación Node).
- `REDCAFE_PROXY_CONFIABLE=1` (Passenger va delante).

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
Además, activa las copias de seguridad de cPanel (incluyen la base MySQL) — son la copia completa.
