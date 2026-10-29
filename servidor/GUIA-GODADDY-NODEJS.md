# Red Café Ecuador · Puesta en marcha en GoDaddy Node.js Hosting

Guía paso a paso para **crear la base de datos, configurar y desplegar** la
plataforma nueva. Los datos reales se migran al final, cuando la app esté completa.

Archivos que necesitas (te los envié):

| Archivo | Para qué | Confidencial |
|---|---|---|
| `redcafe-tablas-para-pegar.sql` | Crear las 12 tablas en la base | No |
| `redcafe-produccion.env` | Claves y ajustes de la app | **Sí** |

---

## Paso 1 · Crear la app y conectar GitHub

1. Entra en GoDaddy → **Node.js Hosting** → **Crear app** (o «New app»).
2. Elige **Conectar GitHub** → autoriza → repositorio **`PRojas01/redcafeecuador`**,
   rama **`plataforma-node`**.
3. Si te pregunta por los comandos, deja los que vienen del repositorio:
   - Instalación: `npm install`
   - Arranque: `npm start`
4. **Todavía no publiques.** Primero la base y las variables (pasos 2 y 3).

## Paso 2 · Crear las tablas en la base de datos

La app trae su propia base MySQL. En el panel de la app abre la sección
**Base de datos** (navegador de tablas / editor SQL).

### Opción A · Importar (recomendada)
1. Pulsa **Importar**.
2. Elige el archivo **`redcafe-tablas-para-pegar.sql`**.
3. Confirma. Al terminar deben aparecer **12 tablas**:
   `Administrador, Candado, CodigoRespaldo, Consentimiento, Documento, Intento,
   Otp, RecuperacionPass, RegistroImportacion, Secreto, Sesion, Usuario`.

### Opción B · Pegar en el editor SQL
1. Abre `redcafe-tablas-para-pegar.sql` con el Bloc de notas (Windows) o TextEdit (Mac).
2. Selecciona todo (**Ctrl+A** / **Cmd+A**) y copia (**Ctrl+C** / **Cmd+C**).
3. En el editor SQL del hosting, pega (**Ctrl+V**) y pulsa **Ejecutar** (Run).
4. Comprueba ejecutando: `SHOW TABLES;` → deben salir las **12 tablas**.

### Si algo falla
- **«Table already exists»**: ya estaba creada; no pasa nada, sigue.
- **El editor solo ejecuta la primera sentencia**: pega y ejecuta por partes,
  cada bloque que empieza por `CREATE TABLE` hasta su `;`, y al final las 4 líneas
  `ALTER TABLE … FOREIGN KEY`.
- **No te deja crear tablas**: no importa. La app crea las tablas sola en su primer
  arranque si la base está vacía. Puedes saltar este paso.

## Paso 3 · Variables de entorno (las claves)

En el panel de la app → **Variables de entorno** / **Secrets**.
Hay dos entornos, **preview** (vista previa) y **producción**: ponlas en los dos.

1. Abre `redcafe-produccion.env` y copia **una por una** estas variables
   (nombre a la izquierda del `=`, valor a la derecha, **sin las comillas**):

| Variable | Valor |
|---|---|
| `REDCAFE_CLAVE_DATOS` | el que está en el archivo (64 caracteres) |
| `REDCAFE_PASS_ADMIN_INICIAL` | el que está en el archivo |
| `REDCAFE_ENTORNO` | `produccion` |
| `REDCAFE_PROXY_CONFIABLE` | `1` |
| `REDCAFE_DOMINIO` | `https://redcafeecuador.com` |

   (Si el panel deja **subir un archivo .env**, puedes subir `redcafe-produccion.env` entero.)

2. **La base de datos:** mira si en las variables ya aparecen los datos de la base
   (host, puerto, nombre, usuario, contraseña). La app reconoce estos nombres:
   `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (o `MYSQL_HOST`,
   `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`).
   - **Si ya están** con esos nombres: no hagas nada.
   - **Si no están o tienen otros nombres:** copia los datos de conexión que muestra la
     sección Base de datos y créalas tú con los nombres `DB_HOST`, `DB_PORT`, `DB_NAME`,
     `DB_USER` y `DB_PASSWORD`.

⚠️ **Guarda `REDCAFE_CLAVE_DATOS` también en un lugar seguro** (gestor de contraseñas).
Si se pierde, las cédulas guardadas no se pueden leer. No la cambies nunca después
de tener miembros.

## Paso 4 · Desplegar (vista previa)

1. Pulsa **Desplegar** / **Deploy** (o «Pull from GitHub»).
2. El **primer** despliegue tarda unos minutos (instala y compila).
3. Abre la **URL de vista previa** que te da GoDaddy.

## Paso 5 · Comprobar

- [ ] La **portada** carga.
- [ ] El **Marketplace** muestra 6 lotes de ejemplo (con la base vacía es lo normal).
- [ ] **`/admin/`** → entra con la contraseña de `REDCAFE_PASS_ADMIN_INICIAL`.
  Esa variable solo cuenta la primera vez (base sin contraseña de admin). Si no la acepta, crea
  `REDCAFE_PASS_ADMIN_RESTABLECER` con una contraseña nueva (12+ caracteres), redespliega, entra
  y **borra la variable** enseguida.
- [ ] **Registrarse** con una cuenta de prueba e iniciar sesión.
- [ ] En la sección Base de datos, la tabla `Usuario` tiene esa cuenta de prueba.

Si la API dice **«falta configurar la base de datos»**, falta el paso 3.2.
Si algo no funciona, envíame el texto del error o una captura del registro
(«Logs») de la app.

## Paso 6 · Publicar en el dominio (cuando todo esté bien)

1. Requiere un plan de pago (Economy incluye 1 app publicada).
2. En la app → **Publicar** → asigna el dominio **redcafeecuador.com**.
3. Mientras no publiques, el sitio PHP actual sigue funcionando igual.

---

## Más adelante · Migrar los datos reales

Sigue [`IMPORTAR-DATOS-SEGURO.md`](IMPORTAR-DATOS-SEGURO.md): el respaldo se procesa
en tu navegador, se sube cifrado en `/admin/importar/` y va directo a la base.
Las personas entran con **su misma contraseña de siempre**.

## Pendiente de confirmar en tu panel
- La **carpeta persistente** para fotos subidas (las que no se borran al volver a
  desplegar). Cuando la veas, se pone en la variable `REDCAFE_UPLOADS`.
