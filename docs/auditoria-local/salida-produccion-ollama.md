# Auditoría de salida a producción — rama plataforma-node (5aa75d2)

Fecha: 2026-10-31. Revisión de solo lectura hecha en local con Ollama (`qwen3:14b`,
script `herramientas/agentes-ollama/revisar.mjs`) sobre arranque, configuración,
seguridad, importación, autenticación, subidas, identidad y respaldos. **Cada
hallazgo se comprobó a mano en el código**; los ~90 avisos genéricos del modelo
que no se sostienen (p. ej. «/estado-servidor muestra variables sin
autenticación»: el detalle solo se da a una sesión de admin, `app.ts:66-69`) se
descartaron. Codex y OpenCode no se usaron: necesitan IA en la nube y la guardia
local lo bloquea sin permiso explícito.

## Bloqueantes (se resuelven en el panel de GoDaddy, no en el código)

1. **Fotos de miembros se pierden al redesplegar si falta `REDCAFE_UPLOADS`** —
   `servidor/src/lib/config.ts:24`: por defecto van a `sitio/uploads`, dentro de la
   carpeta de la app que GoDaddy reconstruye. Definir `REDCAFE_UPLOADS` con una
   ruta absoluta fuera de la app (p. ej. `/home/USUARIO/redcafe-uploads`).
   `/api/estado-servidor` (sesión admin) lo indica en «fotos».
2. **`REDCAFE_ENTORNO` debe ser `produccion`** — `config.ts:20` usa «desarrollo»
   por defecto: sin él no hay redirección a HTTPS/dominio único (`app.ts:24`), ni
   HSTS (`app.ts:117`), ni las cabeceras/cookies de producción.
3. **`REDCAFE_PASS_ADMIN_RESTABLECER` no puede quedarse puesta** —
   `servidor/src/lib/admin.ts:89-98`: en cada arranque, si la contraseña actual no
   coincide, la vuelve a imponer. Si se queda, un cambio de contraseña del admin se
   revierte en el siguiente reinicio y la clave queda en el panel. Usarla solo
   para un rescate y borrarla después.
4. **`REDCAFE_IMPORTACION` apagada** — `servidor/src/modulos/importacion.ts:122`:
   el módulo solo responde con `=1` y sesión admin. Correcto por diseño; activarla
   solo durante la importación y quitarla al terminar.
5. **`REDCAFE_CLAVE_DATOS` y `DATABASE_URL` (o `DB_*`) obligatorias** —
   `servidor/src/index.ts:16-18`: si faltan, el sitio arranca pero la API responde
   503. La clave de datos es la misma que cifró las cédulas: no generar una nueva.

## Importantes

- **`REDCAFE_PRIVADO`** (`config.ts:26`): por defecto `../redcafe-privado`, al lado
  de la app. `lib/privado.ts:9-14` ya impide que quede dentro del sitio o de
  uploads. Fijarla con ruta absoluta persistente para no depender de la estructura
  de carpetas del hosting.
- **`REDCAFE_RESPALDOS`** (`modulos/respaldo.ts:22`): por defecto dentro de la app
  (se pierden al redesplegar; no son públicos). Fijar ruta absoluta propia.
- **`REDCAFE_SITIO`**: `.env.ejemplo:12` sugiere `/home/USUARIO/redcafe-sitio`, pero
  el sitio viaja en el repositorio (`sitio/`). No definirla salvo que se haya
  copiado el sitio a esa ruta; si apunta a una carpeta vacía, todo da 404.
- **Token del respaldo en la URL** (`respaldo.ts:131`): solo lo ve el admin, pero
  queda en registros de acceso. Menor; mantener el respaldo automático interno.

## Comprobado sin problemas

- Sin secretos en el código; `.env*`, `data/` y `uploads/` en `.gitignore`.
- Identidad (documento y selfie) fuera del sitio con permisos 0700/0600
  (`lib/privado.ts`, `modulos/identidad.ts`).
- Arranque GoDaddy: `package.json` raíz → `npm start` → `arrancar.cjs`, que compila
  `servidor/dist` si falta y escucha en `PORT` (`index.ts:24-25`).
- `robots.txt` (bloquea /admin, /panel, /api…), `sitemap.xml` dinámico (`app.ts:101`)
  y estático (37 URL), y `title`/`description`/`canonical` en las páginas revisadas.

## Variables a configurar en el panel de GoDaddy

| Variable | Valor |
|---|---|
| `REDCAFE_ENTORNO` | `produccion` |
| `DATABASE_URL` o `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` | datos del MySQL de GoDaddy |
| `REDCAFE_CLAVE_DATOS` | la clave existente (64 hex), nunca una nueva |
| `REDCAFE_UPLOADS` | ruta absoluta fuera de la app |
| `REDCAFE_PRIVADO` | ruta absoluta fuera de la app y de uploads |
| `REDCAFE_RESPALDOS` | ruta absoluta fuera de la app |
| `REDCAFE_PASS_ADMIN_INICIAL` | ≥ 12 caracteres (solo primera instalación) |
| `REDCAFE_PROXY_CONFIABLE` | `1` (GoDaddy va detrás de proxy) |
| `RESEND_API_KEY`, `REDCAFE_CORREO_REMITENTE` | para enviar correos |
| **No definir** | `REDCAFE_IMPORTACION` (salvo al importar), `REDCAFE_PASS_ADMIN_RESTABLECER` (salvo rescate), `REDCAFE_SITIO` |
