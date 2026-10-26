# Auditoría integral — Red Café Ecuador
**Sitio:** https://solucionespro.net/redcafeecuador/ · **Código:** /media/master/Datos_3/plataforma_cafe
**Fecha:** 18 de agosto de 2026 · **Alcance:** propuesta de valor, seguridad, monetización, diseño y responsive
**Nota:** auditoría de solo lectura. No se modificó ningún archivo ni dato, local ni en producción.

---

## 0. Veredicto en una línea

La plataforma está técnicamente viva y bien organizada (29 páginas 200, 16 APIs, 2FA, panel admin, PWA, SEO base), pero **promete cosas que el producto no hace, no tiene ninguna forma de cobrar, pierde el 100% de los leads en silencio y tiene tres fallos de seguridad explotables**. Ninguno de los cuatro problemas requiere rehacer la arquitectura: son parches localizados.

| Eje | Nota | Riesgo dominante |
|---|---|---|
| Propuesta de valor | 6/10 | Promesas no respaldadas (escrow, SRI, verificación) |
| Seguridad | 4/10 | 2FA anulable, borrado de contenido invertido, un solo `.htaccess` como única defensa |
| Monetización | 2/10 | Todos los planes a $0, cero tarifas publicadas, cero cobro posible |
| Diseño visual | 6/10 | Cero fotografía en un producto que se vende por la vista |
| Responsive | 8/10 | Sólido; home demasiado larga y objetivos táctiles pequeños |
| Captación | 1/10 | El formulario de lista de espera devuelve 404 y guarda en el navegador del visitante |

---

## 1. Seguridad

### 1.1 Críticos

**S-01 · El segundo factor se puede saltar** — `public/api/twofactor.php:276` y `:326`, `public/api/auth.php:170`
```php
'dev_code' => !$sent && (getenv('OTP_DEBUG_MODE') === '1' || true) ? $code : null,
```
El `|| true` deja la condición siempre verdadera: cuando `mail()` falla, **la API devuelve el código OTP en el cuerpo de la respuesta HTTP**. En la línea 326 el código se devuelve sin condición alguna. En hosting compartido GoDaddy `mail()` falla con frecuencia, así que este no es un caso teórico: quien tenga la contraseña de un usuario recibe el segundo factor servido en la misma respuesta. El 2FA queda decorativo.

**S-02 · El código OTP no tiene límite de intentos** — `public/api/twofactor.php` (acción `verify`)
`check_rate_limit()` existe en el bootstrap y se usa en `login` y `admin_login`, pero **no se llama en la verificación del código**. Un código de 6 dígitos con 10 minutos de vida y reintentos ilimitados es forzable por script.

**S-03 · Cualquier usuario puede borrar las publicaciones de los demás** — `public/api/comunidad.php` (acción `delete`)
```php
$posts = array_values(array_filter($posts, fn($p) =>
  ($p['id'] ?? '') !== $id || ($p['autor_id'] ?? '') === $u['id'] || ($u['rol'] ?? '') === 'admin'));
```
`array_filter` **conserva** lo que devuelve verdadero. Para el post objetivo: si eres el autor, la condición es verdadera y el post **se conserva** (no puedes borrar lo tuyo); si no eres el autor, todo es falso y el post **se elimina**. La autorización está exactamente al revés. Además `$u['rol'] === 'admin'` nunca se cumple, porque el admin vive en `$_SESSION['admin']`, no en el rol del miembro.

### 1.2 Altos

**S-04 · Los códigos de respaldo del 2FA no se invalidan nunca** — `public/api/twofactor.php:212-218`
El `foreach ($members as $m)` recorre **copias**; se modifica `$m['backup_codes']` y luego se guarda `$members`, que nunca cambió. Un código de respaldo sirve indefinidamente, para siempre.

**S-05 · Toda la seguridad del backend cuelga de un único `.htaccess`**
`data/` guarda en texto plano y dentro del *webroot*: `members.json` (hashes bcrypt + **cédulas** + teléfonos + correos), `consents.json` (IP y user-agent de cada registro), `otp-active.json`, `otp-debug.log` (**códigos OTP en claro**) y `.redcafe_admin_pass` (**contraseña de administrador en texto plano, sin hashear**). Hoy responde 403 — lo verifiqué en producción —, pero esa protección depende de un `RewriteRule ^data/ - [F,L]` que desaparece si el WordPress padre reescribe el `.htaccess`, si una migración cambia `AllowOverride` o si alguien copia el directorio a otra ruta. En este mismo dominio ya ocurrió un incidente equivalente con ZIP de respaldo accesibles públicamente: el patrón "un archivo de configuración es lo único que separa los datos de internet" ya falló una vez aquí.

**S-06 · La contraseña de admin se compara en claro** — `public/api/auth.php:340`
`hash_equals($adminPass, $pass)` sobre el contenido literal del archivo. No hay `password_hash`. Quien lea el archivo entra; no hay una segunda barrera.

### 1.3 Medios

- **S-07 · No hay token CSRF y `input()` acepta `$_REQUEST`** (`_bootstrap.php:56-63`): las acciones con efecto se pueden invocar por GET. `SameSite=Lax` frena formularios POST cross-site, pero **no** una navegación de nivel superior, así que un enlace del tipo `media.php?action=delete&id=...` abierto por un admin con sesión ejecuta el borrado.
- **S-08 · Cambio de contraseña con 2FA a medias** (`auth.php:255-262`): `change_password` acepta también `$_SESSION['2fa_pending_user']`, es decir, permite operar sin haber superado el segundo factor.
- **S-09 · Límite por IP frágil**: `check_rate_limit()` escribe un archivo por IP en `data/.rate` y nunca los borra. Se evade rotando IP y engorda el disco sin límite.
- **S-10 · Las páginas HTML no llevan cabeceras de seguridad**: las cabeceras del `.htaccess` están dentro de `<FilesMatch "\.php$">`. El servidor solo emite `content-security-policy: upgrade-insecure-requests`. Faltan CSP, `X-Frame-Options` y `nosniff` en el HTML estático.
- **S-11 · Contraseñas de 6 caracteres** sin comprobación de fortaleza (`auth.php:69`).
- **S-12 · LOPDP**: se recogen cédula y consentimientos (bien: hay evidencia con fecha, IP y versión), pero se almacenan sin cifrar, sin política de retención implementada y sin mecanismo de borrado a petición. La política publicada promete más de lo que el código hace.

### 1.4 Bajos

- `comunidad.php?action=list` es público: devuelve nombres, roles y contenido de los miembros sin autenticación (verificado en producción, HTTP 200).
- `mutate_json()` lee y escribe sin bloqueo continuo: con concurrencia real se pierden escrituras.
- Sin respaldo automático. Todo el negocio son archivos JSON en un único directorio.

### 1.5 Lo que está bien hecho

Merece decirse, porque no es lo habitual: sesiones fuera del *webroot* con `session_save_path` propio, cookie `Secure`+`HttpOnly`+`SameSite`, `session_regenerate_id` en cada elevación de privilegio, `password_hash` con bcrypt, whitelist de nombres de archivo que corta el *path traversal*, CORS con lista blanca explícita en `precios.php`, `display_errors` apagado, límite de intentos en login, evidencia de consentimiento LOPDP, y **cero uso de `eval`, `shell_exec` o subida de archivos** — no hay superficie de ejecución remota.

---

## 2. Propuesta de valor

### 2.1 Lo que funciona

El titular es de los buenos: **"Compra y vende café ecuatoriano directo, de 1 libra a una cosecha"**. Es concreto, dice el qué y elimina la principal objeción del comprador pequeño (el pedido mínimo). "Desde 1 libra" es el diferenciador real frente a exportadoras y acopiadores, y está bien colocado.

### 2.2 El problema central: se promete lo que no existe

| Promesa publicada | Qué hay en el código |
|---|---|
| "cobro con **escrow garantizado**" (`app/page.tsx:86`, `:210`) | Nada. No hay escrow, ni retención, ni cuenta puente |
| "**pago garantizado**" | No hay ninguna pasarela de pago en todo el proyecto |
| "**Facturación Electrónica SRI**, sin contador ni sistema externo" | No hay integración con el SRI |
| "productores y compradores **verificados uno a uno**" | `verificado: false` por defecto; no existe flujo de verificación |
| "**laboratorios aliados** puntúan tu lote" | No hay laboratorios dados de alta |

Esto es exposición legal (publicidad engañosa ante la Ley Orgánica de Defensa del Consumidor) y, sobre todo, un riesgo de credibilidad: basta que un tostador serio pida el escrow para que la confianza se rompa de golpe. La solución no es quitar la ambición, es marcarla en futuro: "**próximamente**" o "en preparación" cuesta una palabra y salva la promesa.

### 2.3 Contenido ficticio publicado como real

`public/api/media.php` siembra reportajes con nombres propios y hechos concretos: "María Zhunio, Q-Grader", "8 productores de Loja", "las 12 becadas 2026 ya están listas", y afirma que "cada uno de estos productores encontró en la Red Café Ecuador un canal directo para llegar a compradores internacionales". Los tres videos apuntan al mismo embed `dQw4w9WgXcQ` (el clásico enlace-broma). Está publicado en producción y sirviéndose ahora mismo (`api/media.php?action=list` responde 200 con este contenido).

Es contenido de relleno, entendible en un prototipo, pero **ahora mismo es público y se lee como periodismo real sobre personas con nombre y apellido**. Es el hallazgo de reputación más urgente del sitio.

### 2.4 Dispersión de audiencia

Once perfiles (productor, vendedor, comprador, bar, barista, certificador, transportista, pilador, exportador, granel, semilla) presentados a la vez en la home. La sección "La Red para cada perfil" mide **3.182 px de alto en móvil**. Cuando todos son el protagonista, ninguno lo es. El mercado inicial debería ser uno —productor de Loja/Zamora, o cafetería de Quito— y el resto vivir en una página aparte.

---

## 3. Monetización por servicios premium

### 3.1 El estado real

**Los once planes de `public/data/planes.json` están a `"precio": 0` con `"periodicidad": "gratis"`.** El discurso pivotó a "registro gratuito, pagas solo por servicios", lo cual es una decisión comercial razonable para arrancar. El problema es que la otra mitad del pivote no se hizo:

- **No hay una sola tarifa publicada.** Los beneficios dicen "(por servicio)" once veces y en ningún sitio se dice cuánto cuesta ese servicio.
- **No hay ninguna forma de cobrar.** Cero coincidencias de PayPal, Stripe, Payphone, DeUna, Datafast o checkout en todo el código. Las únicas menciones a "pasarela de pago" están en las políticas legales, describiendo algo que no existe.
- **`MODELO_FINANCIERO.md` sigue asumiendo el modelo anterior**: ARPU de $6/mes, MRR de $4.200 el año 1, precios de $3 a $120. Ese documento y el producto ya no hablan de lo mismo.

Resultado: el ingreso proyectado del año 1 es hoy estructuralmente $0. No por falta de demanda —eso está sin probar—, sino porque **no existe el botón**.

### 3.2 Dónde está el premium que ya está construido

Lo bueno es que el activo monetizable ya está desarrollado, solo no tiene precio ni caja:

1. **Certificación y catación** — el rol verificador/Q-Grader tiene bandeja de solicitudes, puntuación SCA y firma digital de certificado. Es el servicio con mayor disposición a pagar: un score publicado sube el precio del lote. Referencia de mercado: $5–15 por catación de lote.
2. **Dossier EUDR** — trazabilidad GPS y debida diligencia. **Es el más vendible de todos**: el reglamento europeo lo hace obligatorio, no opcional. Quien exporta a la UE necesita ese documento o no vende. Aquí no compites contra "gratis", compites contra "no exporto".
3. **Destacar un lote en el marketplace** — el clásico de cualquier marketplace, esfuerzo de implementación mínimo.
4. **Academia con certificado** — cursos gratis, certificado con número verificable de pago.
5. **Apoyo de formalización** (RUC, SRI) — es consultoría, no software; margen alto y ya está prometido.

### 3.3 La captación está rota y nadie se ha enterado

`components/Waitlist.tsx:36` envía a `/api/enviar-waitlist.php`. **Ese archivo no existe: producción devuelve 404.** El `catch` cae al respaldo, que guarda el lead en el `localStorage` **del propio visitante** y le muestra "listo, te avisamos".

Es decir: cada persona que ha dejado su correo cree que está en la lista, y el dato se quedó en su navegador. **No hay lista de espera.** Se ha perdido, en silencio, el 100% del interés capturado desde el lanzamiento. De todo el informe, este es el arreglo con mejor relación esfuerzo/retorno: un archivo PHP de 30 líneas.

---

## 4. Diseño visual y responsive

### 4.1 Medido en producción a 375 px

| Métrica | Valor | Lectura |
|---|---|---|
| Desbordamiento horizontal | **0 px** | Correcto, sin scroll lateral |
| Elementos fuera de viewport | **0** | Correcto |
| Alto total de la home | **16.329 px** | ≈20 pantallas. Excesivo |
| Palabras en la home | 1.474 | Excesivo para una portada |
| **Imágenes en toda la home** | **0** | El hallazgo visual grave |
| Emojis | 46 | Sustituyen a la fotografía |
| Objetivos táctiles < 40 px | **21 de 67** | Un tercio incumple la guía táctil |
| Encabezado H1 | 1, correcto | Bien |
| Menú móvil | Hamburguesa funcional | Bien |

### 4.2 Cero fotografía

Un marketplace de café de especialidad **se vende por la vista**: la cereza roja, el patio de secado, la barra, la taza. Aquí no hay una sola imagen; el peso visual lo cargan 46 emojis y degradados marrones. Los emojis en tarjetas de perfil (👨‍🌾🏭☕) leen como maqueta, no como producto terminado, y además renderizan distinto en cada sistema operativo. Con 6–8 fotografías reales de finca y taza el salto de percepción sería inmediato, sin tocar una línea de estructura.

Consecuencia colateral: **no hay `og:image`**. El `layout.tsx` define Open Graph y `twitter:card summary_large_image` pero **sin imagen**. En Ecuador el canal de difusión es WhatsApp, y ahora mismo cada enlace compartido sale como un bloque de texto gris. Una sola imagen de 1200×630 px arregla todo el compartir.

### 4.3 Rendimiento

- HTML de la portada: **99 KB** (mucho para una página estática).
- JS estático: **1,4 MB**, con un *chunk* de 200 KB, framework de 180 KB y 112 KB de *polyfills*.
- Fuentes de Google en `<link>` bloqueante (`layout.tsx:78-82`): dos familias × cuatro pesos. Tiene `display=swap`, que es lo correcto, pero sigue siendo una dependencia de terceros en la ruta crítica.
- El mapa de Leaflet entra en el paquete de la portada aunque el mapa no esté en la portada.

### 4.4 Lo que está bien

Paleta coherente y con personalidad (café, oro, crema, cereza, esmeralda), tipografía con jerarquía real (Bricolage Grotesque para títulos), cabecera *sticky* con estado al hacer scroll, animaciones sobrias (el vapor de la taza está bien resuelto y marcado `aria-hidden`), grilla que colapsa correctamente en los tres puntos de ruptura, y hub flotante que no tapa contenido. El trabajo de maquetación es sólido; lo que falta es materia prima visual.

---

## 5. Propuesta incremental

**Principio:** nada de lo que sigue cambia el esquema de datos, las rutas, el `.htaccess`, el modelo de despliegue ni el árbol de componentes. Todo es o bien un archivo nuevo, o bien un cambio de menos de diez líneas en un archivo existente. Cada punto indica por qué no rompe nada.

### Onda 0 — 24 a 48 horas · Detener la hemorragia

| # | Acción | Archivo | Por qué no rompe nada |
|---|---|---|---|
| 0.1 | Quitar el `\|\| true` y devolver `dev_code` solo si `getenv('OTP_DEBUG_MODE')==='1'`; lo mismo en la línea 326 y en `auth.php:170` | `twofactor.php:276,326` · `auth.php:170` | Se elimina un campo de la respuesta que el frontend ya trata como opcional |
| 0.2 | Añadir `check_rate_limit('otp_verify', 5, 600)` al inicio de `verify` | `twofactor.php` | La función ya existe y se usa igual en `login` |
| 0.3 | Corregir el filtro de borrado de la comunidad (`$p['id'] !== $id \|\| ($p['autor_id'] === $u['id'] \|\| !empty($_SESSION['admin']))` — con paréntesis) | `comunidad.php` | Una línea; el resto del flujo no cambia |
| 0.4 | Cambiar el `foreach` de códigos de respaldo a `foreach (... as &$m)` con `save_json` dentro | `twofactor.php:205-220` | Corrige un guardado que hoy no surte efecto |
| 0.5 | **Crear `public/api/enviar-waitlist.php`**: valida, guarda en `data/waitlist.json` y envía aviso; y quitar el respaldo a `localStorage` para que un fallo se muestre como fallo | `api/enviar-waitlist.php` (nuevo) · `Waitlist.tsx` | Archivo nuevo; el frontend ya apunta a esa ruta |
| 0.6 | Vaciar o marcar el contenido sembrado: quitar los tres embeds `dQw4w9WgXcQ` y etiquetar los reportajes como "contenido de ejemplo" hasta tener los reales | `media.php` (función `seed_media`) | Solo cambia datos semilla |
| 0.7 | Hashear la contraseña de admin (`password_hash` al escribirla, `password_verify` al comparar), con lectura compatible si el archivo aún está en claro | `auth.php` | La compatibilidad hacia atrás evita quedarse fuera |

### Onda 1 — Semana 1 · Que el mensaje sea verdad y se pueda compartir

- **1.1 Marcar como futuro** cada promesa no operativa: escrow, facturación SRI, laboratorios aliados. Basta con "próximamente" en `app/page.tsx` y en `SERVICIOS_EXTRA`. Es cambio de texto.
- **1.2 Definir qué significa "verificado"** y publicarlo (cédula/RUC + llamada + foto de finca). Mientras no haya proceso, el sello no se muestra: el campo ya es `verificado: false` por defecto, solo hay que respetarlo en la interfaz.
- **1.3 `og:image` de 1200×630** y `openGraph.images` en `layout.tsx`. Un archivo y tres líneas. Es el mayor retorno de toda la Onda 1: arregla el compartir en WhatsApp.
- **1.4 Seis a ocho fotografías reales** (finca, cereza, secado, barra, taza, retrato de productor) en el héroe, las tarjetas de perfil y las noticias. Aditivo: `<img>` dentro de contenedores que ya existen.
- **1.5 Acortar la home**: dejar tres perfiles protagonistas y mover los otros ocho a `/afiliate` (que ya existe y ya recibe `?rol=`). Objetivo: bajar de 16.000 px a ~7.000 px. No se borra nada, se reubica.
- **1.6 Objetivos táctiles a 44 px** mínimo (`min-h-11` en enlaces y botones). Cambio de clases utilitarias.

### Onda 2 — Semanas 2 y 3 · Monetización mínima viable, sin pasarela

La clave es que **se puede empezar a cobrar sin integrar ninguna pasarela**. Orden de servicio + comprobante de transferencia + confirmación manual del admin. Es lo que ya hacen las empresas del sector en Ecuador y elimina de golpe el riesgo técnico y regulatorio.

- **2.1 `public/data/servicios.json` (nuevo)**: catálogo con `id`, `nombre`, `precio`, `moneda`, `perfil`, `descripcion`. Mismo patrón que `planes.json`, que ya se lee sin problema.
- **2.2 `public/api/servicios.php` (nuevo)**: `list`, `solicitar` (crea una orden en `ordenes.json`), `mis_ordenes`, y para admin `marcar_pagado`. Calca la estructura de `pedidos.php`, que ya funciona. Añadir `'ordenes'` y `'servicios'` a `ALLOWED_DATA_NAMES` — la whitelist está pensada para crecer así.
- **2.3 Página `/servicios/contratar`**: catálogo con precio, botón "Solicitar", instrucciones de transferencia y subida de comprobante. Página nueva, ninguna existente se toca.
- **2.4 Precios de salida sugeridos** (a validar con las entrevistas E0.1 que ya estaban previstas):
  | Servicio | Precio | Por qué |
  |---|---|---|
  | Dossier EUDR por finca | $25–40 | Obligatorio para exportar a la UE; no compite con "gratis" |
  | Catación SCA por lote | $8–15 | Sube el precio del lote; se paga solo |
  | Destacar lote 30 días | $5 | Micropago, decisión sin fricción |
  | Certificado de academia | $10 | Coste marginal cero |
  | Formalización RUC/SRI | $60–120 | Consultoría, margen alto |
- **2.5 Actualizar `MODELO_FINANCIERO.md`** al modelo real: ingreso por servicio, no MRR de suscripción. Hoy el documento describe un negocio que ya no es este.

### Onda 3 — Mes 2 · Cobro en línea y endurecimiento

- **3.1 Pasarela**: para Ecuador, **Payphone o DeUna antes que PayPal** — adopción local muy superior y comisión menor. PayPal solo si el objetivo es el comprador internacional. Se conecta al flujo de órdenes de la Onda 2, que ya estará rodado con dinero real.
- **3.2 Sacar `data/` del webroot** (`../data` fuera de `public_html`): `DATA_DIR` es una constante en un solo sitio (`_bootstrap.php:41`), así que es un cambio de una línea más mover el directorio. Elimina de raíz el riesgo S-05.
- **3.3 Token CSRF** en sesión, comprobado en las acciones con efecto, y que `input()` deje de aceptar `$_REQUEST` para escrituras.
- **3.4 Respaldo automatizado** de `data/` (cron diario + descarga desde el panel admin). Ya estaba previsto como 4.2 del plan de mejora; súbelo de prioridad: hoy no hay ninguna copia.
- **3.5 Cabeceras de seguridad para el HTML** además del PHP, con una CSP mínima.
- **3.6 Rendimiento**: carga diferida del mapa de Leaflet y autoalojar las dos fuentes.

---

## 6. Los cinco movimientos si solo se pueden hacer cinco

1. **Crear `enviar-waitlist.php`.** Ahora mismo se está tirando a la basura cada lead.
2. **Quitar el `|| true` del 2FA.** Una condición booleana anula todo el segundo factor.
3. **Poner `og:image`.** El canal de difusión es WhatsApp y hoy no hay tarjeta visual.
4. **Marcar como "próximamente" el escrow y la facturación SRI.** Riesgo legal por el coste de una palabra.
5. **Publicar cinco precios de servicio.** Sin precio no hay negocio, aunque todo lo demás funcione.

---

## 7. Lo que esta auditoría no puede afirmar

- **No se probó la explotación real** de S-01 a S-04: se identificaron leyendo el código y no se intentó ningún ataque contra el sitio en producción. La lectura del código es inequívoca, pero la confirmación en vivo requiere autorización explícita.
- **No hay datos de tráfico ni de conversión**, así que las notas de propuesta de valor son juicio profesional sobre el mensaje, no medición.
- **No se ejecutó Lighthouse**: las cifras de rendimiento son medición directa del DOM y de los archivos, no puntuación sintética.
- **No se auditó el WordPress padre** de solucionespro.net, que comparte hosting y podría afectar al `.htaccess` del subdirectorio.
- **Los precios sugeridos son referencias de mercado**, no una recomendación validada. Requieren las entrevistas E0.1 antes de fijarse.
