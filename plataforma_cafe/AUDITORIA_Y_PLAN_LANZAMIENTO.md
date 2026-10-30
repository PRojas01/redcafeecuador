# Auditoría completa y Plan de Lanzamiento — Red Café Ecuador

**Fecha de auditoría:** 14 de agosto de 2026
**Estado del repo al auditar:** código muy reciente (11:48–11:57) pero **build desactualizado** (último `out/` del 11:39). El build actual **no compila** (`tsc` falla en `app/panel/page.tsx:137` por inconsistencia de tipos `Rol` vs `Sesion.rol`).
**Veredicto:** **NO listo para lanzamiento oficial**. Requiere Fase 0 (corrección bloqueante) + Fase 1 (integración real backend↔frontend) + Fase 2 (seguridad/hardening) + Fase 3 (lanzamiento).

---

## 1. Resumen ejecutivo

| Dimensión | Estado | Notas |
|---|---|---|
| **Compilación** | ❌ Falla | `next build` roto: `Sesion.rol` no incluye `bar/barista/admin` |
| **Build de producción** | ❌ Desactualizado | `out/` del 11:39; backend PHP y páginas nuevas (chat, comunidad, login) son de 11:48+ |
| **Despliegue actual (`dist/*.zip`)** | ❌ No funcional para backend | El zip no contiene `api/` ni `data/` ni las páginas nuevas |
| **Backend PHP** | 🟡 Existe, no integrado | 7 endpoints creados, ninguno conectado al frontend de `panel` ni `admin` |
| **Frontend ↔ backend** | ❌ Solo parcial | `login`, `afiliate`, `marketplace`, `marketplace/[id]`, `chat`, `comunidad`, `navbar` sí usan API; `panel` y `admin` siguen en localStorage |
| **Auth real** | 🟡 Parcial | Login/registro por API OK; `panel` y `admin` no leen sesión de servidor |
| **Seguridad** | 🔴 Insuficiente para producción | Sesiones PHP sin flags `Secure`/`HttpOnly` para HTTPS forzado, admin en frontend por localStorage, sin CSRF, sin rate-limit, sin sanitización HTML en posts de comunidad |
| **Funcionalidades prometidas** | ❌ Incompletas | Perfiles **bar** y **barista** declarados en tipos pero **sin panel**; chat funciona pero sin notificaciones; comunidad sin moderación |
| **Datos** | 🔴 Riesgo de pérdida | `public/data/*.json` con `chmod 644` en hosting compartido; sin backups; race conditions posibles (flock sí, pero sin transacciones) |
| **Observabilidad** | ❌ Nula | Sin logs centralizados, sin healthcheck, sin analítica |
| **Documentación** | 🟡 Parcial | `GUIA_DEPLOY_GODADDY.md` describe el modo estático previo (sin backend). **No documenta** el nuevo backend PHP ni permisos de `data/` ni `cron` |
| **Legal/LOPD** | 🟡 Existe página `/legal` | No auditada en este pase; revisar antes de lanzar |

**Puntuación global de preparación para lanzamiento:** **~30%**. Se requiere trabajo focalizado antes de salir al público.

---

## 2. Auditoría técnica detallada

### 2.1 Build & tipos

- **Falla bloqueante:** `app/panel/page.tsx:137` llama `guardarSesion(actualizado)` con `rol: Rol` (5 valores), pero `Sesion.rol` en `lib/sesion.ts:8` está restringido a 3 valores. Esto rompe el type-check de Next 15 / TS 5.7.
- **Inconsistencias de tipos detectadas:**
  - `lib/data.ts:1` `Rol = "productor"|"vendedor"|"comprador"|"bar"|"barista"|"admin"` ✅
  - `lib/sesion.ts:8` `rol: "productor"|"vendedor"|"comprador"` ❌ (desfasado)
  - `app/admin/page.tsx` sigue importando `iniciarAdmin`/`esAdmin`/`cerrarAdmin` (admin localStorage) cuando el backend PHP ya provee `admin_login/me`.
- **Build desactualizado:** `out/` (11:39) no contiene `api/`, `chat/`, `comunidad/`, `login/`, ni `lib/api.ts`. Un ZIP generado a partir de este `out/` carece del backend y de las páginas nuevas.

### 2.2 Backend PHP (GoDaddy cPanel)

**Archivos presentes en `public/api/`:**
- `_bootstrap.php` — bootstrap con sesiones, cabeceras, IO JSON con `flock`, helpers (`ok`, `fail`, `require_user`, `require_admin`, `current_user`).
- `auth.php` — register/login/logout/me + admin_login/logout/me.
- `members.php` — list/get/update/verify/all.
- `pedidos.php` — list (filtrado por rol) / create / advance / confirm_recepcion.
- `lotes.php` — list (siembra 6 ejemplos la 1ª vez) / all / publish / toggle_oculto / delete.
- `chat.php` — rooms / open / messages (polling) / send.
- `comunidad.php` — list / create / like / comment / delete.
- `menu.php` — list / add / delete.

**Hallazgos de seguridad (críticos):**
- 🔴 **CSRF:** no hay tokens CSRF. Las acciones `POST` cambian estado con sólo la cookie de sesión. Un atacante en otro sitio puede inducir acciones si el usuario está logueado (riesgo real en chat/comunidad/pedidos).
- 🔴 **XSS en comunidad:** `comunidad.php` guarda `text` sin `htmlspecialchars` en escritura. El frontend renderiza con `{p.text}` que escapa, pero **cualquier consumidor futuro** que pinte HTML crudo queda expuesto. Falta sanitización defensiva.
- 🔴 **Sesiones sin flags seguros:** `session_set_cookie_params` define `'httponly'=>true, 'samesite'=>'Lax'` pero **no `secure=>true`** y no fuerza HTTPS. En hosting GoDaddy el TLS termina en el proxy y la cookie puede viajar en claro si alguien accede por HTTP.
- 🔴 **Rate-limiting inexistente:** `register`, `chatSend`, `postCreate`, `pedidoCreate` no tienen límites. Un script puede llenar `data/messages.json` hasta agotar la cuota del hosting.
- 🟡 **Passwords:** `password_hash`/`password_verify` (bcrypt) OK.
- 🟡 **Permisos de archivos:** `save_json` escribe con `LOCK_EX` (OK), pero los archivos quedan con permisos del proceso PHP del hosting (típicamente 644). El directorio `data/` debe ser 755 o 775 y **debe existir antes** del primer request (hoy se crea `data/.gitkeep`).
- 🟡 **Tamaño máximo:** no hay límite en el tamaño de `pedidos.json`, `messages.json` o `posts.json`. En hosting compartido la cuota del usuario es limitada (~10–30 GB totales); un crecimiento sin control puede tumbar el sitio.
- 🟡 **Race conditions:** `flock` reduce el riesgo pero el flujo `load → mutate → save` no es transaccional si el servidor cambia `data/` de path tras un reset de permisos.
- 🟡 **Sesión admin separada:** `auth.php?action=admin_login` usa `$_SESSION['admin'] = true` — funciona, pero la contraseña está en `getenv('REDCAFE_ADMIN_PASS')` o constante `redcafe-admin-2026`. **El frontend admin aún no usa este endpoint.**

**Hallazgos funcionales:**
- ✅ Polling de chat bien diseñado (`since` para mensajes nuevos).
- ✅ Siembra de 6 lotes base en `lotes.php` la primera vez.
- ✅ `pedidos.php?action=list` filtra por rol correctamente.
- ❌ No hay endpoint para el **frontend admin** que liste miembros / lotes / pedidos de back-office (existe `members.php?action=all` con guard admin, pero `/admin` en el front sigue en localStorage).
- ❌ No hay endpoint de **notificaciones** centralizado.
- ❌ No hay endpoint para **publicar lotes desde el panel del productor** (sí existe `lotes.php?action=publish`, pero `/panel` no lo invoca).
- ❌ No hay endpoint para **reseñas** tras entrega.

### 2.3 Frontend

**Páginas y estado:**

| Ruta | Fuente de datos | Auth | Estado |
|---|---|---|---|
| `/` (landing) | estática | — | ✅ |
| `/marketplace` | API ✅ | — | ✅ |
| `/marketplace/[id]` | API ✅ | sesión API | ✅ (compra por API) |
| `/academia`, `/academia/[id]` | estática + localStorage | — | 🟡 localStorage |
| `/servicios/*` | estática | — | ✅ |
| `/afiliate` | API ✅ | crea sesión | ✅ |
| `/login` | API ✅ | crea sesión | ✅ |
| `/panel` | localStorage ❌ | localStorage ❌ | 🔴 pendiente migrar |
| `/admin` | localStorage ❌ | localStorage ❌ | 🔴 pendiente migrar |
| `/chat` | API ✅ | API | ✅ |
| `/comunidad` | API ✅ | opcional para publicar | ✅ |
| `/legal` | estática | — | 🟡 no auditada |
| `/asesoria`, `/laboratorio` | localStorage | — | 🟡 |

**Hallazgos funcionales:**
- 🔴 **Roles `bar` y `barista` sin panel.** `Rol` los incluye y existen planes (`barra`, `barista`) en `lib/data.ts`, pero `/panel` solo conoce productor/vendedor/comprador (no muestra tabs ni accede a `menu.php`).
- 🔴 **Bandeja del productor** (`/panel?ver=bandeja`) usa `leerBitacora("pedidos")`, **no `api.pedidosList("productor")`**. La "interconexión" actual es **falsa en multiusuario**: sólo un mismo navegador ve los pedidos.
- 🔴 **Admin** sigue con `iniciarAdmin(localStorage)` y muestra lotes del array `LOTES` de `lib/data.ts` (estático), no del backend.
- 🔴 **Publicación de lotes del productor** no implementada: `lotes.php?action=publish` existe, pero no hay UI en `/panel`.
- 🔴 **Menú del bar** (`menu.php`) creado y sin UI.
- 🟡 **Bitácoras personales** (producción, ventas, siembras, limpiezas, costos, tostados, compras, favoritos) siguen en localStorage. Decisión de diseño: mantener local (cuaderno personal por dispositivo) o migrar a backend. **Decisión pendiente.**
- 🟡 **Academia:** progreso de cursos en localStorage. Aceptable, pero impide "trasladar" el avance entre dispositivos.
- 🟡 **Sin carga de imágenes/perfil:** avatar, foto de lote, logo de bar — no implementado.
- 🟡 **404 inconsistente:** hay `out/404.html` y `out/404/`, pero `.htaccess` sugerido en `GUIA_DEPLOY_GODADDY.md` no se genera desde el código. Hay que crearlo manualmente.
- 🟡 **Favicon:** `app/favicon.ico` no existe; `out/` no incluye favicon.
- 🟡 **Open Graph / SEO:** metadata básica en `layout.tsx`, no hay OG image, no hay `robots.txt`, no hay `sitemap.xml`.
- 🟡 **Accesibilidad:** no auditada; HTML usa `lang="es"` ✅, faltan roles ARIA en algunos formularios.

### 2.4 Despliegue en GoDaddy

- **PHP disponible:** ✅ (versión confirmada por la existencia de `enviar-waitlist.php` en producción).
- **Permisos esperados:**
  - `public_html/*.html`, `*.js`, `*.css`, `*.php` → `644`
  - `public_html/_next/` → `755`
  - `public_html/data/` → `755` (escribible por PHP)
  - `public_html/data/*.json` → `644`
- **Límites del hosting compartido:**
  - Sin websockets (chat por polling, OK).
  - Sin Node (correcto, no se usa).
  - `max_execution_time` PHP típicamente 30–120 s (nuestras llamadas son rápidas).
  - `post_max_size` y `upload_max_filesize` para formularios (no subimos archivos aún).
  - Cuota de disco 10–30 GB: **riesgo real** por crecimiento ilimitado de JSON.
- **Cron GoDaddy:** soporta cron jobs. Útil para rotación de logs y limpieza de datos antiguos.
- **HTTPS:** GoDaddy lo provee automáticamente (AutoSSL). Hay que forzar redirect en `.htaccess`.
- **Backups:** GoDaddy hace backups semanales automáticos, **no diarios**, y el usuario debe solicitarlos. Sin backup propio, perder un JSON es perder la Red.

### 2.5 Documentación existente

| Documento | Estado | Acción |
|---|---|---|
| `README.md` | Breve | Ampliar |
| `GUIA_DEPLOY_GODADDY.md` | Describe solo el modo 100% estático previo | Reescribir para incluir el backend PHP, permisos de `data/`, `cron`, `.htaccess`, backups |
| `LEEME_PRODUCCION.txt` | Menciona "versión 1.8", no menciona backend ni chat/comunidad/login | Actualizar |
| `GUIA_ACCIONES_MANUALES.md` | Existe, no auditada | Revisar |
| `MODELO_FINANCIERO.md`, `PLAN_DESARROLLO.md`, `MARCA_*`, `PROPUESTA_*` | Estratégicos | No bloquean el lanzamiento técnico, pero conviene alinear el go-to-market con el estado real del producto |
| `docs/BACKLOG_TECNICO.md` | Referenciado en GUIA_DEPLOY pero no leído | Revisar y alinear con el nuevo plan |

---

## 3. Funcionalidades pendientes (lo que falta para todos los perfiles)

### 3.1 Productor
- ✅ Control de producción y venta (localStorage)
- ✅ Bandeja de pedidos (localStorage — **migrar a API**)
- ✅ Planificación (siembras, limpiezas, costos, proyección — localStorage)
- ❌ **Publicar lotes propios** desde el panel (backend ya lo soporta; falta UI)
- ❌ **Notificaciones** en tiempo real (o casi-real con polling) de nuevos pedidos y mensajes
- ❌ **Reseñas** que compradores dejan tras entrega

### 3.2 Vendedor / Tostador
- ✅ Abastecimiento y tostado (localStorage)
- ✅ Pedidos a productores (localStorage — **migrar a API**)
- ✅ Costos y proyección de margen (localStorage)
- ❌ **Catálogo de tostado** (productos terminados para vender a bares/compradores)
- ❌ **Gestión de clientes** del vendedor

### 3.3 Comprador
- ✅ Pedidos con escrow (localStorage — **migrar a API**)
- ✅ Mis proveedores (localStorage)
- ❌ **Reseñas** tras entrega
- ❌ **Suscripción de café del mes** (mencionada en plan "Comprador Profesional" pero sin UI)

### 3.4 Bar / Cafetería (nuevo)
- ❌ **Panel propio** con:
  - Menú digital público (API `menu.php` ya lista)
  - Pedidos a tostadores / productores
  - Registro de ventas al público (cuaderno local)
  - Inventario (café, leche, insumos)
  - Vinculación a baristas
- ❌ **Página pública del bar** para clientes (mostrar menú)

### 3.5 Barista (nuevo)
- ❌ **Panel propio** con:
  - Biblioteca de recetas
  - Registro de turno (consumo de café/leche/insumos)
  - Capacitación (Academia, ya integrada)
  - Vinculación a un bar afiliado
  - Comunidad y chat

### 3.6 Comunidad
- ✅ Publicar posts y comentar (API)
- ✅ Likes
- ❌ **Categorías / tags** (catación, recetas, noticias, mercado)
- ❌ **Búsqueda** de publicaciones
- ❌ **Reportar contenido** + moderación admin
- ❌ **Editar** publicación propia

### 3.7 Chat
- ✅ Mensajería 1:1 con polling 3s (API + front)
- ❌ **Indicador de typing** (no es prioritario; costoso en hosting compartido)
- ❌ **Adjuntar imagen** (no prioritario; quota de disco)
- ❌ **Mensajes grupales** (canal "Productores de Loja", etc.)
- ❌ **Persistencia de mensajes antiguos** — hoy el JSON crece sin tope

### 3.8 Admin
- 🔴 **Migrar 100% al backend** (hoy 100% localStorage)
- ❌ Aprobar verificación de miembros (`members.php?action=verify` ya existe)
- ❌ Moderar comunidad (ocultar/borrar posts)
- ❌ Exportar datos (CSV de pedidos, miembros)
- ❌ Métricas de uso (registros por día, mensajes por día, pedidos por día)

---

## 4. Funcionalidades que faltan (transversales)

| Función | Criticidad | Estado |
|---|---|---|
| Auth robusta (HTTPS, sesiones seguras) | 🔴 Crítico | Falta `secure=true` en cookie |
| CSRF tokens en POST | 🔴 Crítico | No existe |
| Rate-limit por IP/usuario | 🔴 Crítico | No existe |
| Sanitización XSS en posts | 🟠 Alto | Falta en backend |
| Backups automáticos de `data/` | 🟠 Alto | No existe |
| Notificaciones in-app | 🟡 Medio | No existe |
| `.htaccess` (HTTPS forzado, 404, compresión) | 🟡 Medio | Documentado pero no generado |
| `robots.txt`, `sitemap.xml` | 🟡 Medio | No existe |
| Favicon + OG image | 🟡 Medio | No existe |
| Logs centralizados | 🟡 Medio | No existe |
| Healthcheck `/api/health.php` | 🟡 Medio | No existe |
| PWA (manifest + service worker) | 🟢 Bajo | No existe |
| Tests automatizados | 🟢 Bajo | No existe |
| CI/CD | 🟢 Bajo | No existe |
| Internacionalización (es/en) | 🟢 Bajo | No existe |

---

## 5. Plan de lanzamiento

### Fase 0 — Estabilización bloqueante (1–2 días)
**Objetivo:** que `npm run build` pase y el ZIP de producción contenga TODO (backend + frontend).

1. **Corregir tipos de sesión:**
   - Ampliar `Sesion.rol` en `lib/sesion.ts` para incluir `"bar" | "barista" | "admin"` (o eliminar el tipo local y reusar `Rol`).
   - Decidir: ¿se mantiene `lib/sesion.ts` (localStorage) en absoluto? **Recomendación:** eliminar `guardarSesion/leerSesion/cerrarSesion/iniciarAdmin/esAdmin/cerrarAdmin` y usar siempre la API. Mantener `guardarBitacora/leerBitacora` solo para cuadernos personales.
2. **Migrar `app/panel/page.tsx`:**
   - Reemplazar `leerSesion()` por `api.me()` (con cookie).
   - Reemplazar `leerBitacora("pedidos")` por `api.pedidosList(rol, user.id)`.
   - Reemplazar `guardarBitacora("pedidos")` por `api.pedidoCreate()` / `api.pedidoAdvance()` / `api.pedidoConfirmRecepcion()`.
   - Eliminar el `<select>` "Ver como (demo)" — la sesión de servidor es la verdad. Si necesitas probar entre roles, haz logout/login.
   - Añadir tabs para **bar** (menú, pedidos, ventas, inventario) y **barista** (recetas, turnos, capacitación).
3. **Migrar `app/admin/page.tsx`:**
   - Reemplazar `iniciarAdmin/esAdmin/cerrarAdmin` por `api.adminLogin/adminLogout/adminMe`.
   - Cargar lotes con `api.lotesAll()`, miembros con `api.membersAll()`, pedidos con `api.pedidosList("admin", "")`.
   - Acciones: ocultar lote (`api.loteToggleOculto`), verificar miembro (`api.memberVerify`), borrar post (`api.postDelete`).
4. **Habilitar planes bar/barista en panel** y UI de publicar lote del productor.
5. **Regenerar `out/`** con `npm run build`. Verificar que contiene `api/*.php`, `data/`, `chat/`, `comunidad/`, `login/`.
6. **Regenerar ZIPs** (`dist/redcafe-produccion-public_html.zip` y `dist/redcafe-fuente-v2.zip`).

### Fase 1 — Seguridad y robustez (2–3 días)
**Objetivo:** que el sitio aguante tráfico real sin incidentes.

1. **CSRF tokens:** generar token por sesión, validar en cada POST no-idempotente (`chatSend`, `postCreate`, `postLike`, `postComment`, `pedidoCreate`, `lotePublish`, `menuAdd`, `register`, `login`).
2. **Sesiones seguras:**
   - `session_set_cookie_params(['secure'=>true, 'httponly'=>true, 'samesite'=>'Lax'])` cuando `HTTPS==on`.
   - Regenerar `session_id` en `login` y `register` (prevenir session fixation).
3. **Rate-limit:** un helper `check_rate($key, $max, $windowSec)` en `_bootstrap.php`. Límites sugeridos: `register/login 10/h por IP`, `chatSend 60/h por usuario`, `postCreate 20/h por usuario`, `pedidoCreate 30/h por usuario`.
4. **Sanitización XSS:** en `comunidad.php`, `chat.php`, `menu.php`: `htmlspecialchars($text, ENT_QUOTES|ENT_HTML5, 'UTF-8')` al guardar (o al servir; mantener consistencia).
5. **Cabeceras de seguridad** vía `.htaccess` o middleware PHP:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `X-Frame-Options: SAMEORIGIN`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Content-Security-Policy: default-src 'self'; img-src 'self' https://wa.me data:; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; script-src 'self'`
6. **Backups automáticos:**
   - Cron GoDaddy cada 6h: `cp -a public_html/data public_html/backups/data-$(date +%Y%m%d-%H%M)`.
   - Retener 7 días, luego borrar los más viejos.
7. **Healthcheck:** `public/api/health.php` que devuelve `{ok:true, time, version}` y verifica permisos de `data/`.
8. **Límite de tamaño de JSON:** si `filesize($f) > 5 MB`, rechazar nuevo append y devolver 413. Implementar archivo de log rotativo.
9. **Logging:** `data/log/app.log` con timestamp + endpoint + user_id + IP. Rotar cada 5 MB.

### Fase 2 — Producto y funcionalidades restantes (1–2 semanas)
**Objetivo:** que cada perfil tenga lo prometido y la plataforma sea utilizable de verdad.

1. **Paneles bar y barista** (Fase 0 ya deja la UI lista; aquí se completa la lógica).
2. **Publicar lote desde productor** (form completo en `/panel` para productores).
3. **Reseñas post-entrega:** endpoint `reviews.php` + UI en `/marketplace/[id]`.
4. **Notificaciones in-app:** endpoint `notifications.php` + bell en navbar (polling 30s).
5. **Búsqueda y categorías** en comunidad.
6. **Reportar contenido** + moderación admin.
7. **Importar bitácoras personales desde localStorage** (botón "subir a la nube" opcional — por si en el futuro queremos migrar).
8. **Estadísticas admin:** gráficas simples (registros/día, pedidos/día, posts/día) usando los JSON.

### Fase 3 — Lanzamiento oficial (3–5 días)
**Objetivo:** salir al público con garantías y plan de contingencia.

1. **Pre-lanzamiento:**
   - Variables de entorno reales: `NEXT_PUBLIC_WHATSAPP`, `NEXT_PUBLIC_ADMIN_PASS` (cambiar el default).
   - Cambiar `hola@redcafeecuador.com` por el correo real en `lib/config.ts` y `enviar-waitlist.php`.
   - Generar build final y subir a GoDaddy.
   - Configurar `data/` con permisos 755.
   - Configurar `.htaccess` (HTTPS, compresión gzip, caché de assets `_next/`).
   - Configurar cron de backups.
   - Configurar DNS / subdominio si aplica.
   - Crear `robots.txt` y `sitemap.xml` (o generador).
2. **Pruebas E2E en producción** (con un usuario real y un admin de prueba):
   - Registro, login, edición de perfil.
   - Publicar lote, comprar, avanzar estado, confirmar recepción.
   - Chat bidireccional desde dos navegadores.
   - Comunidad: publicar, comentar, dar like.
   - Admin: ocultar lote, verificar miembro, borrar post.
   - Resiliencia: tirar el servidor de caché, ¿la web sigue funcionando?
3. **Monitoreo:**
   - Alertas por correo si `data/log/app.log` registra más de N errores/hora (implementación simple con cron + `mail()`).
   - Revisión semanal manual de backups.
4. **Comunicación de lanzamiento:**
   - Email a la lista de espera (`waitlist.log`).
   - Publicación en comunidad (#1 post fijado).
   - Difusión por WhatsApp a contactos del piloto.
5. **Plan de contingencia:**
   - Si el sitio cae: ¿dónde está el último `out/` y `data/`? (respuesta: backup local + ZIP en `dist/`).
   - Si hay un bug crítico: ruta de rollback (volver al build anterior en GoDaddy).
   - Canal de reporte de bugs: WhatsApp / correo.
6. **Post-lanzamiento (semana 1):**
   - Métricas de uso reales.
   - Retroalimentación de los primeros 5 usuarios.
   - Ajustes de UX.

---

## 6. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Cuota de disco llena por JSON | Alta | Caída del sitio | Límite 5 MB por archivo + backups + monitoreo |
| CSRF permite acciones no autorizadas | Media | Compromiso de cuentas | Tokens CSRF (Fase 1) |
| `data/` sin permisos de escritura | Alta en primer deploy | Backend no arranca | Verificar en `/api/health.php` + documentar |
| Crecimiento de `messages.json` | Alta (con chat) | Lentitud | Paginación + límite de antigüedad |
| Inyección de HTML en posts | Media | XSS | `htmlspecialchars` (Fase 1) |
| Pérdida de datos por error humano | Media | Pérdida de la Red | Backups automáticos cada 6h + retención 7 días |
| Caída de GoDaddy | Baja | Indisponibilidad | Plan documentado de migración a VPS Node (en `docs/BACKLOG_TECNICO.md`) |
| Admin password filtrado (está en el JS del cliente en `CONFIG.adminPass`) | Alta | Acceso no deseado a admin | **Eliminar la contraseña admin del bundle JS**, validar **siempre** en servidor. El admin password de hoy está tanto en cliente como servidor: doble problema. |

**Hallazgo crítico de seguridad a corregir de inmediato:**
- `lib/config.ts` expone `adminPass: "redcafe-admin-2026"` al bundle del cliente. **Eliminar** y leer **solo en servidor** desde variable de entorno (`getenv('REDCAFE_ADMIN_PASS')`). El frontend ya tiene `/api/auth.php?action=admin_login` para validarlo.

---

## 7. Checklist de lanzamiento (Día 0)

- [ ] `npm run build` pasa sin errores ni warnings críticos.
- [ ] `out/` contiene: `index.html`, `chat/`, `comunidad/`, `login/`, `marketplace/`, `academia/`, `panel/`, `admin/`, `api/*.php`, `data/.gitkeep`, `enviar-waitlist.php`.
- [ ] `dist/redcafe-produccion-public_html.zip` regenerado y subido a GoDaddy.
- [ ] `data/` con permisos 755 en GoDaddy.
- [ ] `.htaccess` con HTTPS forzado + cabeceras de seguridad + compresión.
- [ ] Cron de backups configurado y probado.
- [ ] `/api/health.php` responde 200.
- [ ] Contraseña admin cambiada del default `redcafe-admin-2026`.
- [ ] Variables de entorno reales (`WHATSAPP`, `EMAIL`, `ADMIN_PASS`).
- [ ] Prueba E2E: registro, login, publicar lote, comprar, chat, comunidad, admin.
- [ ] `robots.txt`, `sitemap.xml`, favicon, OG image.
- [ ] Página `/legal` revisada por abogado.
- [ ] Email de lanzamiento enviado a `waitlist.log`.
- [ ] Plan de contingencia comunicado al equipo.

---

## 8. Estimación de esfuerzo

| Fase | Días (1 dev) |
|---|---|
| Fase 0 — Estabilización | 1–2 |
| Fase 1 — Seguridad | 2–3 |
| Fase 2 — Producto | 7–12 |
| Fase 3 — Lanzamiento | 3–5 |
| **Total** | **13–22 días** |

Esto es para un solo desarrollador a tiempo completo. Con CodeReview y QA, añadir 20%.

---

## 9. Recomendaciones estratégicas

1. **No lanzar todavía.** El producto no está listo: tipos rotos, build desactualizado, sin seguridad básica, sin paneles bar/barista.
2. **Priorizar Fase 0 + Fase 1.** Sin esto, lanzar es un riesgo reputacional y técnico.
3. **Considerar migrar el backend PHP a SQLite** (suele estar disponible en cPanel) si el JSON crece. Es una migración barata.
4. **A medio plazo**, migrar a un VPS con Node.js + PostgreSQL para websocket (chat en tiempo real) y mejor DX. El backend PHP es un excelente punto de partida para validar el producto sin coste de infraestructura.
5. **Eliminar el secret admin del bundle JS** antes de cualquier despliegue público.

---

**Fin de la auditoría.** Próxima acción recomendada: ejecutar Fase 0 completa en orden y volver a auditar el build.
