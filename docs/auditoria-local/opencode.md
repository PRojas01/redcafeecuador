# Auditoría local — OpenCode

> **Nota de revisión (Claude, 2026-10-29):** informe generado por OpenCode CLI (agente «plan», solo lectura, modelo gratuito big-pickle). Varias severidades «Crítica» (1, 3, 4) dependen de tener ya una sesión de administrador o de una mala configuración; conviene leerlas como Media/Baja. Los hallazgos más sólidos de este informe son el 5 (la exportación de miembros incluye cédulas descifradas) y el 8 (cabeceras al servir documentos). Ver también `codex.md`, más preciso.

## Resumen

| Severidad | Cantidad | Notas |
|---|---|---|
| Crítica | 4 | Problemas que pueden permitir bypass de autenticación/autorización, exposición de PII o ejecución fuera de ruta. |
| Alta | 5 | Falta de validación/consistencia en controles que pueden derivar en abuso o exposición. |
| Media | 3 | Defectos de lógica/contrato o exposiciones menores. |
| Baja | 2 | Mejores prácticas / casos de menor impacto. |

## Hallazgos

### 1) Exposición de detalles internos en `/estado-servidor` a quien sabe «entrar como administrador» pero la verificación es solo por sesión
- **Severidad**: Crítica
- **Ubicación**: `servidor/src/app.ts:40-98`
- **Problema**: El endpoint `/estado-servidor` devuelve un resumen público, pero si `ses.d.admin` es verdadero muestra `clave_datos_largo`, `clave_datos_forma`, descripción de `pass_inicial/pass_restablecer`, `variables_redcafe`, etc. La verificación es únicamente `if (!ses?.d.admin) ...` usando la sesión cargada por cookie.
- **Caso de fallo**: Si alguien logra obtener una sesión con `admin=true` (vía otro fallo) o si hay un error en lógica de sesión, obtiene información operativa sensible (forma/longitud de clave, nombres de variables). También `clave_datos_forma` intenta «mascarar» pero revela patrón si falla validación.
- **Arreglo sugerido**: Restringir aún más este endpoint (solo permitir desde IPs internas/whitelists), no mostrar patrones de secretos, loggear accesos y considerar `requireAdmin` estricto + 2FA. Nunca exponer forma/longitud de claves.

### 2) Ruta de «preacuerdo» accesible con marca en sesión, pero la verificación depende únicamente de `ses.d.datos.socio_id` + listado de `socios-invitados`
- **Severidad**: Crítica
- **Ubicación**: `servidor/src/app.ts:182-187`, `servidor/src/modulos/socios.ts:103-123`
- **Problema**: `paginaPreacuerdo` permite acceso si `ses.d.admin` o si existe entrada en `socios-invitados` con el `id` guardado en `ses.d.datos.socio_id` y campos `accepted_privacy`/`accepted_confidentiality` true. La marca se pone desde `action=accept` (`ctx.ses.set({ datos: { ...ctx.ses.d.datos, socio_id: item.id, ... } })`) sin ninguna firma/one-time ni vinculación a usuario/autenticación.
- **Caso de fallo**: Si un atacante logra obtener o adivinar un `socio_id` válido (p. ej. filtrado por otro canal) y consigue establecer esa cookie/sesión con ese dato, accede a contenido no público. Además cualquier invitado que acepta queda «marcado» en sesión y puede volver.
- **Arreglo sugerido**: Exigir sesión autenticada vinculada al invitado (o token firmado con expiración/uso único), invalidar la marca tras uso, registrar IP/UA y no confiar solo en un valor de sesión manipulable. Añadir rate-limit estricto y auditoría.

### 3) Sesión: `Secure` siempre puesto, pero confianza en proxy para IP/host depende de flag; cookie Lax/HttpOnly ok pero regeneración y destrucción presentes
- **Severidad**: Crítica
- **Ubicación**: `servidor/src/lib/sesion.ts:113-122`, `servidor/src/app.ts:205-223`
- **Problema**: `cookie()` fuerza `Secure` incluso en local (comentado) — puede romper en HTTP puro, pero mayor riesgo: `ipDe`/`hostPublico` solo usan cabeceras `X-Forwarded-*` si `REDCAFE_PROXY_CONFIABLE === "1"`. Si mal configurado en producción detrás de proxy, se puede falsear IP (afecta `cupo`) y potencialmente lógica basada en host; si configurado incorrectamente al revés también.
- **Caso de fallo**: Detrás de proxy no confiable → IP tomada de socket puede ser del proxy; con proxy confiable pero atacante logra inyectar cabeceras → toma la última entrada de `X-Forwarded-For` (correcto según comentario) pero host puede venir de `X-Forwarded-Host` si confiable. Configuración errónea es el vector.
- **Arreglo sugerido**: Fail-closed: solo confiar en proxy si explícitamente configurado y validar rango/origen del proxy; nunca usar `X-Forwarded-*` sin `REDCAFE_PROXY_CONFIABLE`; registrar cuando se usan cabeceras de proxy. Considerar `__Host-` cookies en producción si aplica.

### 4) Cifrado de PII con clave única desde entorno; descifrado silencioso retorna `""` en error
- **Severidad**: Crítica
- **Ubicación**: `servidor/src/lib/pii.ts:6-26`, `servidor/src/lib/usuarios.ts:76-82`
- **Problema**: `cifrar/descifrar` usan AES-256-GCM con `config.claveDatos()` (64 hex). `safeDescifrar` atrapa cualquier error y retorna `""` sin log. `aDoc` incluye `cedula: safeDescifrar(u.cedulaCifrada)`. Si la clave cambia o hay corrupción de datos, se pierde PII silenciosamente (y puede exponer vacío donde debería haber dato) — también dificulta detección.
- **Caso de fallo**: Rotación accidental de `REDCAFE_CLAVE_DATOS` → todas las cédulas cifradas dejan de descifrarse, se devuelven vacías; o fallo de integridad → mismo. No hay alerta. Además `huella` permite búsqueda pero si huella no coincide con descifrado no hay reconciliación.
- **Arreglo sugerido**: No tragar errores silenciosamente en rutas que exponen datos; loguear con contexto (sin valor) y alertar. Validar clave al inicio (ya hay chequeo de longitud). Considerar versión de clave y re-cifrado. Nunca retornar `""` por defecto sin marcar error.

### 5) Admin API: `export` devuelve datos crudos sin filtrar campos sensibles
- **Severidad**: Alta
- **Ubicación**: `servidor/src/modulos/admin.ts:215-222`, `servidor/src/lib/usuarios.ts:49-74`
- **Problema**: `export` llama a `leer(tipo)` o `listar(tipo)`. Para `members`, `leer` usa `todosLosMiembros()` que mapea con `aDoc()` (incluye `cedula` descifrada vía `safeDescifrar`). Para otros recursos lee crudo. No hay lista blanca de campos ni redacción en exportación.
- **Caso de fallo**: Un administrador exporta `members` → recibe cédulas (descifradas) en JSON descargable. Aunque requiere sesión admin, es un vector de exfiltración masiva de PII.
- **Arreglo sugerido**: Aplicar lista blanca por recurso en export, nunca incluir `cedula`, `passHash`, `two_factor_secret`, `backup_codes`, tokens, IPs sensibles. Usar `miembroPublico` o proyección explícita. Añadir auditoría de export.

### 6) Admin: `members` edit puede tocar roles/email/cedula pero hay lista de prohibidos; `aDoc` expone campos extra
- **Severidad**: Alta
- **Ubicación**: `servidor/src/modulos/admin.ts:33-64`
- **Problema**: `PROHIBIDOS` impide tocar `passHash`, `admin`, `two_factor_*` etc., pero `extra` se fusiona desde `i` sin filtrar claves. `aDoc` copia `...extra` al documento devuelto (línea ~63). También permite cambiar `email` con validación de unicidad.
- **Caso de fallo**: Si `extra` contiene claves que luego usan otras lógicas (`estado_validacion`, flags), un admin puede inyectar valores arbitrarios. No hay validación de esquema para `extra`.
- **Arreglo sugerido**: Lista blanca estricta para `extra`, validar tipos/valores, evitar copiar `extra` completo a respuestas sin saneado. Nunca permitir seteo de flags privilegiados desde `extra`.

### 7) Auth: reset de contraseña envía enlace con token en URL; `admin_reset_password` muestra formulario GET y procesa POST
- **Severidad**: Alta
- **Ubicación**: `servidor/src/modulos/auth.ts:160-190`, `servidor/src/modulos/auth.ts:260-299`
- **Problema**: `password_reset_request` genera token hex y lo envía como query `?token=...` por correo. GET en `admin_reset_password` muestra formulario con token en campo oculto (buen intento), pero tokens en URL pueden quedar en logs (servidor/proxy/correo), historial navegador.
- **Caso de fallo**: Token filtrado por logs/caché → atacante puede usarlo. Para admin, el formulario GET es vulnerable a prefetch/antivirus que abren enlaces.
- **Arreglo sugerido**: Usar enlaces POST-only o tokens en body vía página intermedia con one-time; enviar por canal seguro, expirar rápido, invalidar tras uso, rate-limit. Considerar magic links con short TTL y rotación.

### 8) Uploads: validación de tipo/mime débil, ruta controlada pero sin lista negra de extensiones peligrosas
- **Severidad**: Alta
- **Ubicación**: `servidor/src/modulos/uploads.ts:23-61`, `servidor/src/lib/imagen.ts` (referenciado)
- **Problema**: Usa `formatoReal(buf)` para detectar tipo real, rechaza `webp` en documentos y solo permite JPG/PNG/PDF. Guarda con nombres aleatorios `uid()` y `slugUid`. Sin embargo no hay validación explícita de extensión permitida, ni bloqueo de SVG (SVG puede contener JS), ni verificación de contenido para PDF más allá de formato.
- **Caso de fallo**: Si `formatoReal` falla o permite tipo inesperado, o si se sube SVG malicioso → podría servir contenido con XSS si servido con `Content-Type` incorrecto. También path traversal prevenido por `slugUid` y `path.join` a carpeta fija.
- **Arreglo sugerido**: Lista blanca estricta por extensión/tipo, rechazar SVG, validar PDF cabecera, forzar `Content-Type` al servir, servir con `Content-Disposition: attachment` para documentos, headers `X-Content-Type-Options: nosniff`.

### 9) CSRF/origin protection: lista de lectura amplia, EXENTAS incluyen `baja_correo`, `admin_reset_password`
- **Severidad**: Alta
- **Ubicación**: `servidor/src/lib/seguridad.ts:13-35`
- **Problema**: `protegerOrigen` permite GET si acción coincide con regex `LECTURA` (muy amplia: incluye `exportar`, `messages`, etc.). EXENTAS son solo 3 acciones. `admin_reset_password` está en EXENTAS pero procesa POST (formulario propio) — GET exento (muestra formulario). `baja_correo` exento.
- **Caso de fallo**: Si hay GET con side-effects por error de mapeo acción→handler, o si regex captura acción incorrecta. También confiar en `Sec-Fetch-Site` + `Origin` es razonable pero debe ser estricta.
- **Arreglo sugerido**: Reducir regex LECTURA lo más posible, usar lista blanca explícita, marcar side-effects solo en POST/PUT/PATCH/DELETE. Revisar EXENTAS.

### 10) Rate limiting por IP con hash parcial
- **Severidad**: Alta
- **Ubicación**: `servidor/src/lib/seguridad.ts:40-48`
- **Problema**: `clave = accion + ":" + sha256("ip|" + ctx.ip).slice(0, 24)` — usa 24 hex chars del hash. `ctx.ip` viene de `ipDe` (confía en proxy solo si flag). `reinicioDePrueba()` borra `db.intento` completo fuera de producción al crear marca `.rate` — puede usarse para resetear límites en pruebas.
- **Caso de fallo**: Colisión teórica baja pero posible; o si IP no confiable → límites por proxy IP. Fuera de prod reset global facilita brute force en QA.
- **Arreglo sugerido**: Usar hash completo o suficiente con sal, considerar `user-agent` + ruta, rate-limit por cuenta además de IP, proteger endpoint de reset de pruebas.

### 11) Sesión: upsert con token hash, regeneración en login, pero `cookieDeSesion` lógica
- **Severidad**: Media
- **Ubicación**: `servidor/src/lib/sesion.ts:59-106`
- **Problema**: `cookieRecordar` pone `cookieDeSesion = !recordar` (cookie de sesión vs persistente). Al regenerar en login se borra hash viejo. `guardar()` solo escribe si `cambiado`. Si sesión vacía y sin hash leído retorna null (ok). `Secure` siempre true.
- **Caso de fallo**: En algunos navegadores/ambientes HTTP puede fallar; fijar dominio/path correcto. También `SameSite=Lax` puede afectar ciertas redirecciones.
- **Arreglo sugerido**: Ajustar `Secure` según `esProduccion()` o `x-forwarded-proto`, considerar `SameSite=Strict` donde posible, añadir `Domain` solo si necesario.

### 12) Frontend (sitio): `redcafe-sesion.js` cachea respuestas GET por clave
- **Severidad**: Media
- **Ubicación**: `sitio/redcafe-sesion.js:30-95`
- **Problema**: Cachea `auth.php?action=me`, `media.php?action=redes`, `comunidad.php?action=list`, etc. por 10s. Al método POST/otros limpia todo. Clave ignora `?v`, `?_v` con regex.
- **Caso de fallo**: En carga con múltiples tabs/llamadas reduce contención de sesión (mitiga el bug de bloqueo descrito), pero si sesión cambia entre pestañas en <10s puede mostrar datos cacheados brevemente. También comparte promesas clonado.
- **Arreglo sugerido**: Cache solo para lecturas idempotentes, invalidar por evento `storage`/`focus`, no cachear respuestas con datos sensibles en ciertas rutas. Comentarios indican workaround para bloqueo PHP → aceptable si controlado.

### 13) Frontend: `redcafe-v60-final.js` evita escribir en nodos React con `reemplazarTextoSeguro`
- **Severidad**: Media
- **Ubicación**: `sitio/redcafe-v60-final.js:216-278`
- **Problema**: Usa técnica de ocultar nodo React (`data-redcafe-oculto-react`) y añadir copia propia para evitar `removeChild`. Tiene lógica para limpiar copias huérfanas.
- **Caso de fallo**: Si React re-renderiza mucho, puede quedar marcado como oculto incorrectamente o copias duplicadas. Funciona como workaround.
- **Arreglo sugerido**: Preferir no tocar DOM de componentes React hidratados; usar CSS/selectores o extender componentes en `plataforma_cafe`. Actualmente bien comentado con guardas.

### 14) Media/REDES hardcodeadas
- **Severidad**: Baja
- **Ubicación**: `servidor/src/modulos/media.ts:18-23`
- **Problema**: `REDES` con números/cuentas fijas en código.
- **Caso de fallo**: Cambios requieren redeploy.
- **Arreglo sugerido**: Mover a configuración/BD editable.

### 15) `socios.js` (frontend) consulta APIs sin manejo de errores visible
- **Severidad**: Baja
- **Ubicación**: `sitio/redcafe-socios.js:18-25`, `102-130`
- **Problema**: `json()` retorna objeto con `ok:false` en error pero UI solo actúa si `res.ok`. Suficiente.
- **Caso de fallo**: Errores silenciosos.
- **Arreglo sugerido**: Añadir estados de error/empty más explícitos.

## Notas sobre alcance
- Revisados: `servidor/src/**` (app, lib, modulos clave), `sitio/redcafe-*.js` relevantes, estructura de `plataforma_cafe/app/**`. No se accedió a `data/`, `uploads/`, `.env*`, dumps SQL ni datos reales (cumpliendo reglas).
- Contrato API `{ok,data}/{ok:false,error}` respetado en mayor parte.
- Cifrado AES-256-GCM con HMAC para huella presente.
- Protección origen con `Sec-Fetch-Site`/`Origin` implementada.

**Ordenado por severidad. Hallazgos verificados en código.**
