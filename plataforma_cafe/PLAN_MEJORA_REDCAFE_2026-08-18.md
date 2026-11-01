# Red Café Ecuador — Plan de mejora y briefs de ejecución
**Base:** AUDITORIA_REDCAFE_2026-08-18.md · **Fecha:** 18 de agosto de 2026
**Regla de oro:** todo es aditivo. No se cambia el esquema de datos, ni las rutas, ni el `.htaccess`, ni el modelo de despliegue, ni el árbol de componentes.
**DevControl:** ningún cambio se auto-aprueba. Codex trabaja en rama y deja diff; el despliegue a producción lo aprueba Pedro.

---

## 1. Plan por ondas

### Onda 0 — Detener la hemorragia (24–48 h) · BLOQUEANTE

| ID | Acción | Archivo | Aceptación | Riesgo |
|---|---|---|---|---|
| 0.1 | Quitar `\|\| true`; `dev_code` solo con `OTP_DEBUG_MODE=1` | `twofactor.php:276,326` · `auth.php:170` | La respuesta de login nunca trae `dev_code` sin la variable | Nulo |
| 0.2 | `check_rate_limit('otp_verify', 5, 600)` al inicio de `verify` | `twofactor.php` | 6.º intento en 10 min devuelve 429 | Nulo |
| 0.3 | Corregir el filtro de borrado (paréntesis + `$_SESSION['admin']`) | `comunidad.php` | El autor borra lo suyo; un tercero recibe 403 | Nulo |
| 0.4 | `foreach (... as &$m)` en códigos de respaldo + `save_json` efectivo | `twofactor.php:205-220` | Un código de respaldo usado deja de servir | Bajo |
| 0.5 | **Crear `enviar-waitlist.php`**; quitar el respaldo silencioso a localStorage | `api/enviar-waitlist.php` (nuevo) · `Waitlist.tsx` | POST devuelve `{ok:true}` y el correo queda en `data/waitlist.json`; si falla, el usuario ve el fallo | Bajo |
| 0.6 | Limpiar contenido sembrado: fuera los tres `dQw4w9WgXcQ`, reportajes marcados como ejemplo | `media.php` (`seed_media`) | `api/media.php?action=list` no devuelve nombres propios inventados | Nulo |
| 0.7 | Hashear contraseña admin (`password_hash`/`password_verify`) con lectura compatible del formato en claro | `auth.php` (`get_admin_password`, `admin_login`, `admin_change_own_password`) | Login admin sigue funcionando con la contraseña actual y el archivo queda hasheado | **Medio — probar antes de subir** |

### Onda 1 — Mensaje verdadero y compartible (semana 1)

| ID | Acción | Archivo |
|---|---|---|
| 1.1 | Marcar como "próximamente" escrow, facturación SRI y laboratorios aliados | `app/page.tsx` · `lib/data.ts` (`SERVICIOS_EXTRA`) |
| 1.2 | Definir el proceso de "verificado" y no mostrar el sello mientras `verificado: false` | `app/page.tsx` · componentes de perfil |
| 1.3 | **`og:image` 1200×630** + `openGraph.images` y `twitter.images` | `public/og-image.jpg` (nuevo) · `app/layout.tsx` |
| 1.4 | 6–8 fotografías reales (finca, cereza, secado, barra, taza, retrato) | `public/img/` (nuevo) · héroe y tarjetas |
| 1.5 | Home de 16.300 px a ~7.000: tres perfiles protagonistas, los otros ocho a `/afiliate` | `app/page.tsx` · `app/afiliate/` |
| 1.6 | Objetivos táctiles a 44 px (`min-h-11`) | Enlaces y botones |

### Onda 2 — Cobrar sin pasarela (semanas 2–3)

| ID | Acción | Archivo |
|---|---|---|
| 2.1 | Catálogo de servicios con precio | `public/data/servicios.json` (nuevo) |
| 2.2 | API de órdenes: `list`, `solicitar`, `mis_ordenes`, `marcar_pagado` (admin) | `public/api/servicios.php` (nuevo) + `'ordenes'`,`'servicios'` en `ALLOWED_DATA_NAMES` |
| 2.3 | Página de contratación con transferencia y comprobante | `app/servicios/contratar/` (nueva) |
| 2.4 | Precios de salida: EUDR $25–40 · catación $8–15 · destacado $5 · certificado $10 · formalización $60–120 | `servicios.json` |
| 2.5 | Reescribir el modelo financiero a ingreso por servicio | `MODELO_FINANCIERO.md` |

### Onda 3 — Cobro en línea y endurecimiento (mes 2)

| ID | Acción |
|---|---|
| 3.1 | Pasarela: **Payphone o DeUna** (adopción local) sobre el flujo de órdenes ya rodado |
| 3.2 | **Sacar `data/` del webroot**: `DATA_DIR` es una constante única en `_bootstrap.php:41` |
| 3.3 | Token CSRF en sesión; `input()` deja de aceptar `$_REQUEST` para escrituras |
| 3.4 | Respaldo automatizado de `data/` (cron diario + descarga desde admin) |
| 3.5 | Cabeceras de seguridad y CSP mínima para el HTML, no solo para PHP |
| 3.6 | Leaflet en carga diferida; fuentes autoalojadas |

---

## 2. Brief para codex — Onda 0

> Copiar íntegro. Es el único que corre ahora.

```
CONTEXTO
Proyecto: /media/master/Datos_3/plataforma_cafe (Next.js 15 export estático + APIs PHP
en public/api, hosting GoDaddy cPanel, desplegado en solucionespro.net/redcafeecuador/).

Antes de leer documentación, ejecuta:
  llmgraph context prepare . "corregir fallos de seguridad en public/api y formulario de lista de espera" --max-tokens 3000

REGLAS INVIOLABLES
- Trabaja en una rama nueva. NO despliegues, NO subas nada a producción, NO toques el
  servidor. Al terminar deja el diff para aprobación humana (DevControl).
- Cambios mínimos y localizados. No refactorices, no renombres, no reformatees archivos
  enteros, no cambies el esquema de datos ni las rutas ni el .htaccess.
- No toques node_modules, .next, out/ ni los .zip del raíz.
- Si un cambio te obliga a modificar algo fuera de la lista, PARA y repórtalo.

TAREAS

1. public/api/twofactor.php línea 276 — la condición contiene `|| true`, que la deja
   siempre verdadera y filtra el código OTP en la respuesta HTTP:
     'dev_code' => !$sent && (getenv('OTP_DEBUG_MODE') === '1' || true) ? $code : null,
   Sustituir por: solo devolver dev_code si getenv('OTP_DEBUG_MODE') === '1'.
   Aplicar lo mismo en la línea 326 (allí dev_code se devuelve incondicionalmente) y en
   public/api/auth.php línea 170.

2. public/api/twofactor.php, acción 'verify' — no hay límite de intentos.
   Añadir al inicio de la acción:
     if (!check_rate_limit('otp_verify', 5, 600)) fail('Demasiados intentos. Espera 10 minutos.', 429);
   check_rate_limit() ya existe en _bootstrap.php y se usa igual en auth.php.

3. public/api/comunidad.php, acción 'delete' — la autorización está invertida:
   array_filter CONSERVA lo verdadero, así que hoy el autor no puede borrar lo suyo y
   cualquier otro usuario sí puede. Además $u['rol'] === 'admin' nunca se cumple porque
   el admin vive en $_SESSION['admin'].
   Corregir a: se elimina el post cuyo id coincide SI el solicitante es el autor
   (autor_id === $u['id']) o hay sesión admin (!empty($_SESSION['admin'])); en cualquier
   otro caso responder 403 sin borrar nada. Cuidado con la precedencia: los paréntesis
   importan.

4. public/api/twofactor.php ~líneas 205-220 — el foreach recorre COPIAS de $members, se
   modifica $m['backup_codes'] y luego se hace save_json($members), que nunca cambió: un
   código de respaldo sirve para siempre. Corregir usando referencia (foreach as &$m),
   con unset($m) después del bucle, y verificar que save_json persiste la baja del código.

5. CREAR public/api/enviar-waitlist.php. Hoy components/Waitlist.tsx:36 hace POST a
   /api/enviar-waitlist.php, que devuelve 404, y el catch guarda el lead en el
   localStorage DEL VISITANTE mostrándole "listo": se pierden todos los registros.
   El nuevo endpoint debe:
     - require_once __DIR__ . '/_bootstrap.php'
     - leer nombre, email y perfil con input()
     - validar (FILTER_VALIDATE_EMAIL, nombre 2-100, perfil de una lista cerrada)
     - check_rate_limit('waitlist', 5, 600)
     - añadir 'waitlist' a ALLOWED_DATA_NAMES en _bootstrap.php y guardar con
       load_json/save_json, evitando correos duplicados
     - intentar aviso por correo con mailer.php si existe, sin bloquear la respuesta
     - responder con ok() / fail() como el resto de la API
   Y en components/Waitlist.tsx: quitar el respaldo silencioso a localStorage; si la API
   falla, mostrar error al usuario. Mantener el diseño y los textos tal cual.

6. public/api/media.php, función seed_media() — es contenido de relleno publicado como
   periodismo real. Quitar los tres embeds de YouTube 'dQw4w9WgXcQ' (dejar embed vacío) y
   añadir a los dos reportajes un campo "ejemplo": true, más el prefijo "[Ejemplo] " en el
   título, hasta que existan los reales. No borres los items, solo márcalos.

7. public/api/auth.php, get_admin_password() — la contraseña de admin se guarda y compara
   EN CLARO. Migrar a password_hash/password_verify:
     - al leer: si el contenido empieza por $2y$ tratarlo como hash; si no, aceptarlo como
       contraseña en claro (compatibilidad) y reescribir el archivo hasheado al primer
       login correcto
     - admin_login y admin_change_own_password usan password_verify
     - admin_change_own_password y admin_reset_password escriben SIEMPRE el hash
   Este punto es el de mayor riesgo: no debe dejar a nadie fuera del panel. Pruébalo.

VERIFICACIÓN (ejecuta y pega la salida)
- php -l en cada .php tocado.
- npm run build con NEXT_PUBLIC_BASE_PATH=/redcafeecuador — debe completar sin errores.
- Levanta PHP local (php -S localhost:8080 -t public) y comprueba con curl:
  · POST a enviar-waitlist.php con un correo válido → {"ok":true} y aparece en data/waitlist.json
  · el mismo correo dos veces → no duplica
  · 6 intentos seguidos de verify con código erróneo → el 6.º devuelve 429
  · login normal → la respuesta NO contiene dev_code
  · media.php?action=list → sin 'dQw4w9WgXcQ'
- Explica en dos líneas por qué el cambio 3 (comunidad) es correcto ahora.

ENTREGABLE
Diff, salida de las verificaciones y lista de lo que NO pudiste hacer y por qué.
NO despliegues. Espera aprobación humana.
```

---

## 3. Briefs de las ondas siguientes

Cada uno arranca igual: `llmgraph context prepare . "<tarea>" --max-tokens 3000`, rama nueva, sin desplegar, diff para aprobación.

**Onda 1 — mensaje y visual (codex)**
```
En app/page.tsx y lib/data.ts (SERVICIOS_EXTRA): el sitio promete escrow garantizado,
pago garantizado, facturación electrónica SRI y laboratorios aliados. Nada de eso existe
en el código y es exposición legal. Reescribe esos textos marcándolos como futuros
("Próximamente", "en preparación"), sin quitar la funcionalidad ni las secciones: solo
cambia el tiempo verbal de la promesa. No inventes funcionalidades nuevas.
Añade og:image: crea public/og-image.jpg de 1200x630 con la identidad de MARCA_IDENTIDAD_VISUAL.md
y declara openGraph.images y twitter.images en app/layout.tsx (hoy hay summary_large_image
sin imagen y los enlaces compartidos en WhatsApp salen sin tarjeta).
Sube todos los enlaces y botones a 44 px de alto mínimo (min-h-11): hoy 21 de 67 objetivos
táctiles quedan por debajo de 40 px en móvil.
No toques el backend PHP.
```

**Onda 1b — acortar la home (codex)**
```
app/page.tsx mide 16.329 px de alto en un viewport de 375 px, con once perfiles en la
sección "La Red para cada perfil" (3.182 px ella sola). Deja en la home solo tres perfiles
protagonistas (productor, tostador/comerciante, comprador) y mueve los otros ocho a
app/afiliate/, que ya acepta ?rol=. No borres contenido: reubícalo. Objetivo ~7.000 px.
Mantén intactos el diseño, la paleta y los componentes.
```

**Onda 2 — monetización sin pasarela (codex)**
```
Añade un catálogo de servicios de pago y un flujo de orden manual, SIN integrar ninguna
pasarela. Todo aditivo:
- public/data/servicios.json: id, nombre, precio, moneda, perfil, descripcion.
  Semilla: dossier EUDR 30, catación SCA 12, destacar lote 5, certificado academia 10,
  formalización RUC/SRI 90 (USD).
- public/api/servicios.php: acciones list (público), solicitar (usuario autenticado, crea
  orden en ordenes.json), mis_ordenes, y marcar_pagado (require_admin). Calca la estructura
  de public/api/pedidos.php, que ya funciona. Añade 'ordenes' y 'servicios' a
  ALLOWED_DATA_NAMES en _bootstrap.php.
- app/servicios/contratar/page.tsx: catálogo con precio, botón Solicitar, instrucciones de
  transferencia y campo de referencia del comprobante. El admin confirma el pago a mano.
No cambies planes.json (los planes siguen gratuitos), ni el flujo de registro.
```

**Onda 3 — endurecimiento (codex, con revisión estrecha)**
```
1. Mueve el directorio de datos fuera del webroot: DATA_DIR es una constante única en
   public/api/_bootstrap.php:41. Cambia la constante, documenta el movimiento en DEPLOY.md
   y deja un script de migración. NO ejecutes el movimiento en producción.
2. Token CSRF en sesión, comprobado en todas las acciones con efecto; input() deja de caer
   a $_REQUEST para escrituras (hoy permite invocarlas por GET).
3. api/backup.php (require_admin): descarga un ZIP de data/ + entrada en DEPLOY.md para el
   cron diario. Hoy no existe ninguna copia de seguridad.
4. Cabeceras de seguridad y CSP mínima también para el HTML estático: las actuales están
   dentro de <FilesMatch "\.php$"> y no cubren las páginas.
5. Carga diferida de Leaflet (entra en el bundle de la portada sin usarse ahí) y fuentes
   autoalojadas en vez del <link> bloqueante a fonts.googleapis.com.
Cada punto en un commit separado.
```

---

## 4. Lo que no puede hacer un agente (queda para Pedro)

- Aprobar y desplegar cada onda (compuerta DevControl).
- Las fotografías reales de finca, secado, barra y taza: sin ellas la Onda 1 se queda a medias.
- Decidir los precios definitivos, idealmente tras las entrevistas E0.1.
- Abrir la cuenta de Payphone o DeUna (requiere datos bancarios).
- Configurar SPF/DKIM para que el correo transaccional no caiga en spam.
- Decidir qué hacer con el contenido sembrado: ¿se escribe el reportaje real o se retira?
