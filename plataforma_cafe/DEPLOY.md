# DEPLOY — Red Café Ecuador → GoDaddy cPanel

Guía completa de despliegue en producción (versión 1.0 · agosto 2026).

---

## 1. Requisitos previos

- **GoDaddy** con plan Linux (cPanel) que soporte **PHP 7.4+** (recomendado 8.0+).
- **PHP 7.4+** habilitado en cPanel → "Select PHP Version" → 8.x recomendado.
- **SSL/HTTPS** habilitado en el dominio (GoDaddy lo ofrece gratis con Let's Encrypt).
- **SSH** acceso opcional pero recomendado para ajustar permisos.

---

## 2. Subir archivos

### Opción A: File Manager (cPanel)

1. cPanel → **File Manager** → `public_html/`
2. Sube el ZIP `red-cafe-ecuador-YYYYMMDD.zip`
3. Click derecho → **Extract** en `public_html/`
4. Verifica que existan los siguientes archivos críticos:
   - `index.html`
   - `.htaccess` (CRÍTICO: no omitir)
   - `api/_bootstrap.php` y demás PHP
   - `data/.gitkeep`
5. **Borra** el ZIP extraído para no exponer el archivo.

### Opción B: SSH / FTP

```bash
# Con SCP:
scp red-cafe-ecuador-YYYYMMDD.zip user@server:/home/user/public_html/

# En el servidor:
cd public_html/
unzip red-cafe-ecuador-YYYYMMDD.zip
rm red-cafe-ecuador-YYYYMMDD.zip
chmod 755 api data
chmod 644 api/*.php
```

### Estructura esperada

```
public_html/
├── index.html
├── .htaccess             ← seguridad (HTTPS forzado, headers, bloqueo data/)
├── 404.html
├── LICENSE
├── api/
│   ├── _bootstrap.php
│   ├── auth.php          ← registro, login, admin login, LOPDP consents
│   ├── ratings.php       ← valoraciones entre miembros
│   ├── lotes.php
│   ├── pedidos.php
│   ├── members.php
│   ├── chat.php
│   ├── comunidad.php
│   └── menu.php
├── data/
│   ├── .gitkeep
│   └── (aquí se crean miembros.json, pedidos.json, etc. automáticamente)
├── privacidad/, terminos-y-condiciones/, etc.  ← páginas legales individuales
├── politica-de-privacidad/
├── politica-de-uso-de-datos/
├── politica-de-cookies/
├── terminos-y-condiciones/
├── propiedad-y-uso/
└── (resto de páginas: marketplace/, academia/, panel/, etc.)
```

---

## 3. Permisos

```bash
chmod 755 public_html
chmod -R 755 public_html/api
chmod 644 public_html/api/*.php
chmod 755 public_html/data
# El servidor web debe poder escribir en data/ (chmod 775 o 755 según config)
```

---

## 4. Configuración de variables (opcional)

Antes de hacer build puedes inyectar el WhatsApp real:

```bash
NEXT_PUBLIC_WHATSAPP=593999999999 \
NEXT_PUBLIC_WHATSAPP_MOSTRAR="+593 99 999 9999" \
npm run build
```

Si no defines estas variables, los enlaces de WhatsApp no funcionarán.

---

## 5. SSL / HTTPS

1. cPanel → **SSL/TLS Status** → instalar certificado (Let's Encrypt gratis).
2. Verifica que el `.htaccess` (incluido en el ZIP) esté activo: fuerza HTTPS.
3. En **Select PHP Version** asegúrate de tener **session.cookie_secure = On**.

---

## 6. Verificación post-despliegue

| Verificar                                              | Esperado                                              |
|--------------------------------------------------------|-------------------------------------------------------|
| `https://tu-dominio/`                                  | Carga el home con Monitor de Precios visible         |
| `https://tu-dominio/marketplace`                       | Muestra 6 lotes base del catálogo                     |
| `https://tu-dominio/legal`                             | Centro legal                                          |
| `https://tu-dominio/politica-de-privacidad`            | Página individual de privacidad                       |
| `https://tu-dominio/data/`                             | 403 Forbidden (bloqueado por .htaccess)               |
| `https://tu-dominio/api/auth.php?action=me`            | `{"ok":true,"data":{"user":null}}`                    |
| Registro nuevo en `/afiliate`                          | Crea cuenta, redirige a `/panel`                     |
| Login admin en `/admin` con contraseña por defecto     | Accede (luego cambia la contraseña, ver §7)           |
| Subir un lote como productor verificado                | Aparece en marketplace                                |
| Valorar a otro miembro desde `/panel → ⭐ Valorar`     | Crea entrada en `data/ratings.json`                  |

---

## 7. Contraseña de administrador

El sistema crea automáticamente una contraseña aleatoria la primera vez
que alguien intenta hacer admin_login:

1. Ve a `/admin` → ingresa cualquier cosa → fallará.
2. En el servidor, abre `data/.redcafe_admin_pass` y copia la contraseña.
3. **Inmediatamente** reemplázala por una tuya y reinicia sesión:

```bash
# En el servidor
echo "tu-contraseña-segura" > data/.redcafe_admin_pass
chmod 600 data/.redcafe_admin_pass
```

> **Recomendación de seguridad:** mueve `.redcafe_admin_pass` un nivel arriba
> de `public_html/` (es decir, a `/home/usuario/.redcafe_admin_pass`).
> El código ya lo busca en ambos lugares.

---

## 8. Privacidad y LOPDP

- Las páginas legales individuales (`/politica-de-privacidad`,
  `/terminos-y-condiciones`, `/politica-de-uso-de-datos`, `/politica-de-cookies`)
  cumplen con la LOPDP de Ecuador.
- El formulario de afiliación **obliga** al usuario a aceptar las 3 políticas
  antes de crear la cuenta.
- Los consentimientos se guardan en `data/consents.json` (protegido).
- **Antes del lanzamiento público** debes completar:
  - Razón social en la página de privacidad (lugar: `app/legal/page.tsx`)
  - RUC del responsable
  - Domicilio fiscal exacto
  - Email de contacto DPO (oficial de protección de datos)
  - Datos del proveedor de hosting

---

## 9. Datos iniciales

Al primer acceso el sistema crea automáticamente:

- `data/members.json` — array vacío (se llena con registros)
- `data/pedidos.json` — array vacío
- `data/lotes.json` — 6 lotes seed (catálogo inicial)
- `data/menus.json` — array vacío
- `data/chats.json` / `messages.json` — vacíos
- `data/posts.json` — vacío
- `data/consents.json` — vacío
- `data/ratings.json` — vacío
- `data/waitlist.json` — vacío
- `data/.sess/` — directorio para sesiones PHP

No necesitas precargar nada.

---

## 10. Seguridad activa (ya configurada)

✅ HTTPS forzado vía `.htaccess`  
✅ Cabeceras de seguridad HTTP (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS)  
✅ Bloqueo de acceso a `data/` (PII y sesiones)  
✅ Bloqueo de archivos `.log` y ocultos  
✅ Cookies de sesión con flags `Secure`, `HttpOnly`, `SameSite=Lax`  
✅ `session_regenerate_id(true)` en login (anti fixation)  
✅ Hash bcrypt para contraseñas  
✅ Rate limiting en login (10/min) y admin_login (5/5min)  
✅ Whitelist de archivos JSON (`ALLOWED_DATA_NAMES`)  
✅ Sanitización de respuestas (no se expone `pass`)  
✅ Validación de autorización en cada endpoint sensible  

---

## 11. Rollback

Antes de cualquier deploy nuevo, el ZIP anterior queda en `red-cafe-ecuador-YYYYMMDD.zip`
en tu máquina local. Para revertir:

1. Borra el contenido de `public_html/` (excepto `data/`).
2. Sube y extrae el ZIP anterior.
3. El archivo `data/.redcafe_admin_pass` se conserva si no lo borraste.

---

## 12. Soporte

- **Email:** hola@redcafeecuador.com
- **Documentación técnica adicional:** `docs/PROPIEDAD_Y_USO.md`
- **Marca y propiedad:** ver `/propiedad-y-uso`

---

*Última actualización: 14 de agosto de 2026 · v1.0 lanzamiento*
