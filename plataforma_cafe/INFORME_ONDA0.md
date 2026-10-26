# INFORME ONDA 0 — Seguridad y captación (puntos 0.4, 0.5, 0.7)

**Fecha:** 2026-08-18 · **Alcance:** solo backend (`public/api/**` + `components/Waitlist.tsx`)
**Estado:** implementado y probado localmente. **NO desplegado** — espera aprobación humana.

---

## Resumen

| Punto | Título | Archivos | Estado |
|---|---|---|---|
| 0.5 | Endpoint waitlist perdido (404 silencioso + fallback localStorage) | `public/api/enviar-waitlist.php` (nuevo), `components/Waitlist.tsx`, `public/api/mailer.php` | ✅ |
| 0.4 | Códigos de respaldo 2FA que nunca se invalidaban | `public/api/twofactor.php` | ✅ |
| 0.7 | Contraseña admin en texto plano | `public/api/auth.php` | ✅ (probado, mayor riesgo) |

**Nota:** `'waitlist'` ya estaba incluido en `ALLOWED_DATA_NAMES` de `_bootstrap.php` (línea 69); no hizo falta tocarlo.
**Nota:** revisado `public/api/admin.php` por el patrón por-copia: sus escrituras ya usan referencias (`foreach as &$m`/`&$item` + `unset`) — sin cambios necesarios.

---

## 1 · `public/api/enviar-waitlist.php` (nuevo) — punto 0.5

- `require_once __DIR__ . '/_bootstrap.php'`
- Lee `nombre`, `email`, `perfil` con `input()`
- Valida: `FILTER_VALIDATE_EMAIL`, nombre 2–100 (mb), perfil en lista cerrada `['productor','vendedor','comprador','interesado']`
- `check_rate_limit('waitlist', 5, 600)` → 429 si se excede
- Dedupe por email sin distinguir mayúsculas (reusa `find_member`, basado en `strcasecmp`) → 409 `"duplicado"`
- Guarda con `load_json`/`save_json` en `data/waitlist.json` con `id`, `nombre`, `email`, `perfil`, `ip`, `ua` (200 chars), `ts` — igual que el registro de consentimientos
- Intenta aviso por correo con `mailer_send('waitlist', …)` si `mailer.php` está disponible, **sin bloquear** la respuesta
- Responde `ok()` / `fail()` como el resto de la API

### `components/Waitlist.tsx`
- Eliminado el respaldo silencioso a `localStorage` (función `localOk` y comentario de fallback).
- 409 → estado `"duplicado"` (mismo texto visible de antes); respuesta `ok:true` → `"ok"`; cualquier fallo de red o de API → nuevo estado `"error"` con mensaje visible ("No pudimos registrar tu correo. Intenta de nuevo.").
- **No se tocó** el diseño ni los textos visibles del formulario existentes (botón, placeholders, select, mensajes ok/duplicado).

### `public/api/mailer.php`
- Añadida plantilla `waitlist` a `mailer_send()` (confirmación de lista de espera con la marca). Sin ella el aviso era un no-op silencioso.

---

## 2 · Códigos de respaldo 2FA — `public/api/twofactor.php` (punto 0.4)

El bloque de `verify_otp` (~línea 207) recorría copias: modificaba `$m['backup_codes']` y guardaba un `$members` que nunca cambió.

Corregido:
```php
$members = load_json('members', []);
foreach ($members as &$m) {
  if (($m['id'] ?? '') === $pendingId) {
    $codes = $m['backup_codes'] ?? [];
    foreach ($codes as $bc) {
      if (hash_equals((string)$bc, otp_hash($code))) {
        $m['backup_codes'] = array_values(array_filter($codes, fn($c) => $c !== $bc));
        $matched = true;
        break 2;
      }
    }
    break;
  }
}
unset($m);
if ($matched) save_json('members', $members);
```

- Referencia (`&$m`), `unset($m)` tras el bucle, y `save_json` **después** de modificar (persiste la baja).
- Revisado el resto de `twofactor.php` (enable_2fa, disable_2fa, regenerate_backup, user_set_2fa) y `admin.php`: ya usan referencias; no había más puntos por corregir.

---

## 3 · Contraseña admin — `public/api/auth.php` (punto 0.7)

Nuevos helpers:
- `admin_verify_password($input, $stored)`: si el archivo empieza por `$2y$` usa `password_verify`; si no, acepta la contraseña en claro (compatibilidad) con `hash_equals`.
- `admin_is_hashed($stored)`: detecta `$2y$`.
- `admin_write_password($content)`: escribe en las rutas candidatas de lectura (raíz del proyecto y `data/`), con fallback en `public/`, siempre con `chmod 0600`.

Cambios de comportamiento:
- `admin_login`: verifica con `admin_verify_password` y, en el **primer login correcto**, si el archivo estaba en claro lo reescribe hasheado.
- `admin_change_own_password`: verifica con `admin_verify_password` y escribe **siempre** el hash.
- `admin_reset_password`: escribe **siempre** el hash (la contraseña nueva se devuelve una sola vez en la respuesta, en claro).
- El auto-generado en `get_admin_password()` se mantiene en claro hasta el primer login correcto, que lo migra (compatibilidad sin romper la ruta).

### Procedimiento de recuperación del acceso admin (si algo saliera mal)

1. **La contraseña no cambia de valor:** `RedCafeAdmin2026` sigue siendo la contraseña válida, solo que ahora se almacena hasheada. Si el dueño recuerda la contraseña, el acceso sigue funcionando igual.
2. **Reset con token (desde la API):** la primera llamada a `POST /api/auth.php?action=admin_reset_password` (sin token) crea el archivo `public/.admin_reset_token` y registra el token en `error_log`. Con el token: `POST /api/auth.php?action=admin_reset_password&token=<TOKEN>` → devuelve `new_password` en la respuesta. Esa contraseña se guarda hasheada y sirve para un login.
3. **Reset directo por cPanel (último recurso):** con el Administrador de archivos de cPanel, escribe la contraseña en claro en `data/.redcafe_admin_pass` (`chmod 600`). El primer login correcto la vuelve a hashear automáticamente. (Vía documentada también en `DEPLOY.md`.)

> Copia de seguridad de la contraseña en claro durante la migración: `/tmp/user/1000/opencode/redcafe_admin_pass_original`. El archivo de producción ya quedó hasheado y `RedCafeAdmin2026` sigue funcionando.

---

## Verificación

### `php -l` (todos los archivos tocados)
```
No syntax errors detected in public/api/enviar-waitlist.php
No syntax errors detected in public/api/twofactor.php
No syntax errors detected in public/api/auth.php
No syntax errors detected in public/api/mailer.php
No syntax errors detected in public/api/_bootstrap.php
```

### Servidor local de pruebas
`php -S 127.0.0.1:18444 -t public` (puerto 18444 libre; 8080/8090 ocupados por otros servicios). Requirió `-d auto_prepend_file` con `$_SERVER['HTTPS']='on'` para esquivar el redirect HTTPS del bootstrap.

### Waitlist
```
=== RATE LIMIT: 6 envíos seguidos ===
envío 1 -> {"ok":true,"data":{"id":"3d9742795f3e"}}|200
envío 2 -> {"ok":true,"data":{"id":"0c7fae5b3973"}}|200
envío 3 -> {"ok":true,"data":{"id":"fef749b75db5"}}|200
envío 4 -> {"ok":true,"data":{"id":"16b971660731"}}|200
envío 5 -> {"ok":true,"data":{"id":"19629be3b8f1"}}|200
envío 6 -> {"ok":false,"error":"Demasiados envíos. Espera unos minutos."}|429

=== VALID EMAIL ===
{"ok":true,"data":{"id":"f11cf618f5c2"}}|200
=== SAME EMAIL (case-insensitive) ===
{"ok":false,"error":"duplicado"}|409
=== INVALID EMAIL ===
{"ok":false,"error":"Correo electrónico inválido."}|422
=== PERFIL FUERA DE LISTA ===
{"ok":false,"error":"Perfil inválido."}|422
=== NOMBRE CORTO ===
{"ok":false,"error":"Nombre: 2-100 caracteres."}|422
```
`data/waitlist.json` contiene los leads con `id`, `nombre`, `email`, `perfil`, `ip`, `ua`, `ts` (el correo duplicado aparece una sola vez). **Datos de prueba eliminados al terminar.**

### Contraseña admin
```
=== ESTADO ANTES: archivo en claro ===
RedCafeAdmin2026
=== 1er LOGIN ADMIN con contraseña actual ===
{"ok":true,"data":{"admin":true}}|200
=== ARCHIVO DESPUÉS ===
$2y$... (60 bytes, chmod 600)
=== 2º LOGIN ADMIN con la misma contraseña ===
{"ok":true,"data":{"admin":true}}|200
=== LOGIN CON CONTRASEÑA INCORRECTA ===
{"ok":false,"error":"Contraseña admin incorrecta."}|401
=== admin_change_own_password (nueva pass) ===
{"ok":true,"data":{"changed":true}}|200  → archivo sigue en $2y$
=== login con la nueva pass === {"ok":true}|200
=== restauración de RedCafeAdmin2026 === {"ok":true,"data":{"changed":true}}|200
=== login final con RedCafeAdmin2026 === {"ok":true,"data":{"admin":true}}|200
```

### Códigos de respaldo 2FA
```
=== login usuario 2FA ===  {"ok":true,"data":{"requires_2fa":true,...}}|200
=== verify_otp con AAAA-BBBB (1er uso) ===
{"ok":true,...} |200  → members.json: backup_codes = []
=== Re-login + verify_otp con el MISMO AAAA-BBBB (2º uso) ===
{"ok":false,"error":"Código incorrecto o expirado."}|401  → backup_codes sigue vacío
```

### Confirmación de alcance
- `app/` **intacto** (mtimes sin cambios) — el rediseño de codex sigue libre.
- `.zip` de la raíz y `dist/` **intactos**.
- No se desplegó nada.

---

## Riesgos pendientes / notas
- `data/` está dentro del webroot y la protección real depende del `.htaccess` (S-05 de la auditoría) — queda para otra onda; esta onda cubrió 0.4/0.5/0.7.
- El endpoint `admin_reset_password` sigue siendo tan seguro como su token (limitación ya documentada en el propio archivo).
- `get_admin_password()` auto-genera una contraseña y la loguea; es la ruta solo-para-el-caso-de-no-existir-archivo.
