# Migración de redcafeecuador.com a Node.js + MySQL, paso a paso (GoDaddy cPanel)

Objetivo: pasar del sitio PHP actual al servidor nuevo **sin perder ningún dato real**
(miembros y sus contraseñas, lotes, pedidos, cursos, mensajes, avisos, imágenes…).

La migración se hace dos veces: un **ensayo** en un subdominio (el sitio PHP sigue
funcionando como siempre) y, cuando el ensayo esté bien, el **corte definitivo** en una
ventana corta de mantenimiento. Si algo falla en el corte, se vuelve al PHP en minutos.

Qué necesitas:
- Acceso a cPanel con: **Bases de datos MySQL**, **phpMyAdmin**, **Setup Node.js App**,
  **Terminal** (o SSH) y **Administrador de archivos**.
  Si no ves «Terminal», actívalo en GoDaddy (SSH) o avísame: preparo otra vía.
- Los dos archivos que te envié: `redcafe-esquema-mysql.sql` y `redcafe-produccion.env`.
- En los comandos, `USUARIO` es tu usuario de cPanel (lo ves arriba a la derecha) y
  `~` es tu carpeta personal (`/home/USUARIO`).

Qué se migra y qué no:

| Se migra | No se migra |
|---|---|
| Miembros (siguen entrando con **su misma contraseña**), consentimientos, códigos 2FA | Sesiones abiertas: todos vuelven a iniciar sesión una vez |
| Lotes, pedidos, cotizaciones, servicios, requerimientos, empleo | Lotes de demostración |
| Cursos, matrículas y avance, guías, recetas, noticias, páginas | Contadores de intentos y bloqueos temporales |
| Comunidad, chats, avisos, reportes, sanciones, actividad | Códigos de un solo uso (OTP) |
| Contraseña de administración y secretos (enlaces de baja y apelación siguen valiendo) | |
| Imágenes y documentos subidos (carpeta `uploads/`) | |

---

## Fase 0 · Preparación (sin tocar el sitio)

1. **Copia de seguridad completa.** cPanel → «Copia de seguridad» → «Descargar una copia
   de seguridad completa». Guárdala en tu equipo. Es la red de seguridad de todo lo demás.
2. **Subdominio de ensayo.** cPanel → «Dominios» → «Crear un nuevo dominio» →
   `nuevo.redcafeecuador.com`, con su **propia** raíz de documentos
   (por ejemplo `nuevo.redcafeecuador.com`, NO `public_html`).
3. **El código.** Ya está conectado (Git Version Control → `PRojas01/redcafeecuador`, rama
   `plataforma-node`). Anota la **ruta del repositorio** que muestra cPanel
   (por ejemplo `/home/USUARIO/repositories/redcafeecuador`). La llamaremos `REPO`.
   Pulsa «Update from Remote» para tener la última versión.

## Fase 1 · Base de datos

1. cPanel → **Bases de datos MySQL**:
   - «Crear nueva base de datos»: `redcafe` → queda como `USUARIO_redcafe`.
   - «Agregar nuevo usuario»: `redcafe` con una contraseña larga → `USUARIO_redcafe`.
   - «Agregar usuario a la base de datos» → marca **TODOS LOS PRIVILEGIOS**.
2. cPanel → **phpMyAdmin** → a la izquierda, elige `USUARIO_redcafe` (vacía) →
   pestaña **Importar** → archivo `redcafe-esquema-mysql.sql` → **Importar**.
   Deben aparecer 12 tablas (Usuario, Documento, Sesion…).

## Fase 2 · Configuración (.env)

1. Abre `redcafe-produccion.env` y rellena la línea `DATABASE_URL`:
   ```
   DATABASE_URL="mysql://USUARIO_redcafe:CONTRASEÑA@localhost:3306/USUARIO_redcafe"
   ```
   Si la contraseña tiene `@ : / # %`, escríbelos como `%40 %3A %2F %23 %25`.
2. Añade al final la carpeta de imágenes:
   ```
   REDCAFE_UPLOADS="/home/USUARIO/redcafe-uploads"
   REDCAFE_RESPALDOS="/home/USUARIO/redcafe-respaldos"
   ```
3. Administrador de archivos → entra en `REPO/servidor/` → sube el archivo y
   **renómbralo a `.env`** (con el punto delante). Permisos: 600.
   Es confidencial: está fuera de la web y Git no lo sube (`.gitignore`).

## Fase 3 · La aplicación Node (en el subdominio de ensayo)

1. cPanel → **Setup Node.js App** → **Create Application**:
   - Node.js version: **22**
   - Application mode: **Production**
   - Application root: `REPO/servidor` (sin `/home/USUARIO/`, p. ej. `repositories/redcafeecuador/servidor`)
   - Application URL: **`nuevo.redcafeecuador.com`**
   - Application startup file: **`app.cjs`**
   - → **Create**.
2. Arriba de la ficha de la aplicación cPanel muestra un comando como
   `source /home/USUARIO/nodevenv/.../activate && cd ...`. Cópialo.
3. cPanel → **Terminal**, pega ese comando y después:
   ```bash
   npm ci
   npm run build
   ```
   (Si `npm ci` falla por memoria, repítelo una vez; si persiste, avísame.)
4. En Setup Node.js App → **Restart**.
5. Abre `https://nuevo.redcafeecuador.com/`: debe verse la portada. Aún sin datos.

## Fase 4 · Ensayo de la migración (el sitio PHP sigue funcionando)

En la Terminal (con el `source … activate` del paso 3.2 hecho):

```bash
# 1. Copia de los datos actuales (la web sigue usando los originales)
mkdir -p ~/migracion-ensayo
cp -a ~/public_html/data ~/migracion-ensayo/data
mkdir -p ~/redcafe-uploads ~/redcafe-respaldos
cp -a ~/public_html/uploads/. ~/redcafe-uploads/

# 2. Simulación: no escribe nada, solo informa
cd REPO/servidor
npm run importar -- ~/migracion-ensayo/data

# 3. Si el informe está bien, importar de verdad
npm run importar -- ~/migracion-ensayo/data --aplicar --pass-admin ~/.redcafe_admin_pass
```

El informe dice cuántos miembros, lotes, pedidos… pasan, y avisa de cualquier cuenta
sin contraseña válida (esas personas tendrán que usar «Olvidé mi contraseña»).
Si `~/.redcafe_admin_pass` no existe, busca el archivo con
`ls -a ~ ~/public_html/data | grep admin_pass` y pon esa ruta.

**Comprueba en `https://nuevo.redcafeecuador.com/`** (Restart antes):
- [ ] Entras con **tu cuenta de miembro y tu contraseña de siempre**.
- [ ] Entras en `/admin/` con la contraseña de administración actual.
- [ ] Marketplace: están los lotes reales, con sus fotos.
- [ ] Tu panel: tus pedidos, avisos y mensajes.
- [ ] Academia: los cursos y tu avance.
- [ ] Comunidad: publicaciones y comentarios.

Ojo: lo que se haga en el subdominio durante el ensayo **no** pasa a producción; es una copia.

**Vaciar la base para el corte:** phpMyAdmin → `USUARIO_redcafe` → «Marcar todas» →
«Eliminar» → confirmar → pestaña **Importar** → `redcafe-esquema-mysql.sql` otra vez.
(El importador no reescribe lo ya importado, así que el corte debe empezar con la base vacía.)

## Fase 5 · Corte definitivo (≈ 30 minutos, a una hora de poco tráfico)

1. **Mantenimiento del PHP** (nadie escribe datos durante la copia).
   Administrador de archivos → `public_html/` → crea `mantenimiento.html` con un texto
   breve («Volvemos en unos minutos») y añade **al principio** de `public_html/.htaccess`:
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_URI} !^/mantenimiento\.html$
   RewriteCond %{REQUEST_URI} !^/\.well-known/
   RewriteRule ^ /mantenimiento.html [R=503,L]
   ErrorDocument 503 /mantenimiento.html
   ```
2. **Copia final e importación** (Terminal, con el `source … activate`):
   ```bash
   mkdir -p ~/migracion-final
   cp -a ~/public_html/data ~/migracion-final/data
   cp -a ~/public_html/uploads/. ~/redcafe-uploads/
   cd REPO/servidor
   npm run importar -- ~/migracion-final/data
   npm run importar -- ~/migracion-final/data --aplicar --pass-admin ~/.redcafe_admin_pass
   ```
3. **Apartar el PHP** (queda guardado entero para volver si hace falta):
   ```bash
   mkdir ~/sitio-php-respaldo
   cd ~/public_html
   shopt -s dotglob
   for f in *; do [ "$f" != ".well-known" ] && mv "$f" ~/sitio-php-respaldo/; done
   ```
4. **Pasar el dominio a Node.** Setup Node.js App → en la aplicación →
   Application URL: **`redcafeecuador.com`** → Save → **Restart**.
   (Si cPanel no deja cambiar la URL, crea otra aplicación igual con esa URL y borra la del subdominio.)
5. **Comprueba** la lista de la Fase 4 en `https://redcafeecuador.com/` y también:
   - [ ] `https://redcafeecuador.com/api/agregar-cursos.php` responde «Este script ya no se usa…» (señal de que contesta Node).
   - [ ] `https://www.redcafeecuador.com` redirige a `redcafeecuador.com`.

### Si algo sale mal: volver al PHP (5 minutos)
1. Setup Node.js App → **Stop** (o borra la aplicación).
2. `mv ~/sitio-php-respaldo/* ~/sitio-php-respaldo/.[!.]* ~/public_html/`
3. Quita las líneas de mantenimiento de `public_html/.htaccess`.
Lo que se hubiera creado en Node después del corte no estaría en el PHP: por eso conviene
comprobar en los primeros minutos, antes de anunciar nada.

## Fase 6 · Después del corte

- **Avisa a los miembros** de que tendrán que volver a iniciar sesión (una sola vez).
- Activa en cPanel las **copias de seguridad automáticas** (incluyen la base MySQL).
  Además, el servidor guarda una copia diaria en `~/redcafe-respaldos`.
- **Borra las copias de trabajo** con datos personales cuando todo esté bien (una o dos semanas):
  `rm -rf ~/migracion-ensayo ~/migracion-final`. Conserva `~/sitio-php-respaldo` un mes.
- Si configuras el correo (Resend), añade `RESEND_API_KEY` al `.env` y **Restart**.

## Actualizaciones futuras

cPanel → Git Version Control → «Update from Remote», y en la Terminal:
```bash
source /home/USUARIO/nodevenv/.../activate && cd REPO/servidor
npm ci && npm run build && npm run db:push
```
y **Restart** en Setup Node.js App.
