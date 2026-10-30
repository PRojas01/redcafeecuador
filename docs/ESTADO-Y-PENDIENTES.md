# Red Café Ecuador — estado del trabajo y pendientes

Resumen de todo lo pedido y hecho en la sesión de octubre 2026 (auditoría, plan, migración
a Node.js + MySQL, despliegue en GoDaddy y nuevo diseño). Punto de partida para continuar.

- Repositorio: `PRojas01/redcafeecuador` (privado) · rama de trabajo **`plataforma-node`**
- PR: https://github.com/PRojas01/redcafeecuador/pull/1 (CI en verde)
- Hosting elegido: **GoDaddy Node.js Hosting** (Node 22 + MySQL gestionado), conectado a la rama `plataforma-node`.

## Mapa de documentos

| Documento | Contenido |
|---|---|
| `docs/entregables/INFORME-AUDITORIA.md` | Auditoría del paquete 20261024a: fallos confirmados y corregidos |
| `docs/entregables/LISTA-MEJORAS.md` | Lista de mejoras basada en pruebas y auditoría |
| `docs/entregables/PLAN-PROPUESTA-MEJORA.md` | Plan de migración: arquitectura, decisiones, riesgos, fases |
| (fuera del repo) `redcafe-actualizacion-20261024a-corregido.zip` | Paquete PHP corregido, SHA-256 `c9d5696b…`; el vigilante de datos no admite .zip. Se reconstruye con `cambios.diff` |
| `docs/entregables/cambios.diff` | Diferencias de las correcciones PHP |
| `servidor/GUIA-GODADDY-NODEJS.md` | Paso a paso: base, variables, despliegue en GoDaddy Node.js Hosting |
| `servidor/MIGRACION-PRODUCCION.md` | Migración con datos reales, ensayo y vuelta atrás |
| `servidor/DESPLIEGUE.md` | Despliegue general (VPS, cPanel, GitHub) |
| `DISENO-TEMA-ORIGEN.md` | Guía de estilo del tema «Origen» |
| `servidor/prisma/tablas-para-pegar.sql` | Las 12 tablas para «Importar/Pegar» en la base |
| `servidor/herramientas/convertir-datos-a-sql.sh` | Convierte data/*.json del PHP en un .sql con datos |

**No está en el repositorio (a propósito):** `redcafe-produccion.env` con `REDCAFE_CLAVE_DATOS`
y `REDCAFE_PASS_ADMIN_INICIAL`. Lo tiene el propietario; guardarlo en un gestor de contraseñas.

---

## Lo pedido y hecho

1. **Auditoría end-to-end del paquete 20261024a** — fallos confirmados con pruebas y
   corregidos en el PHP (10 archivos + `sw.js`): 2FA anulable (`me` devolvía los códigos de
   respaldo), 7 de 10 registros simultáneos perdidos, total y stock de pedidos manipulables,
   avisos falsos vía `create_service`, pedidos cancelados marcables como entregados, pedidos
   de viveros/tostado que siempre fallaban, enlaces rotos en el pie de los correos, ediciones
   sin validar, comentarios de 300 KB, enlace push roto; y 3 regresiones del parche
   restauradas (plan, `me` con 2FA pendiente, precio por saco).
2. **Instrucciones para extraer la fuente** de la carpeta de desarrollo (prompt para Claude Code local).
3. **Lista de mejoras** con las skills. Hallazgos adicionales al leer el código, corregidos
   en el servidor nuevo: PayPal (inyección en el ID de orden, moneda sin comprobar), chat que
   perdía mensajes, admin que mostraba hashes y escribía sin bloqueo, CSV con fórmulas
   (Excel), cotizaciones con cifras globales visibles y sin correos, valoraciones sin compra,
   estadísticas con chats de toda la Red, «FOB Guayaquil» que no se guardaba, bombas de
   descompresión en imágenes, tarea de precios con ruta errónea.
4. **Comparación con producción** (redcafeecuador.com, versión anterior): misma suite qa/ en
   base y corregida, mismos resultados; el parche parcial dependía de 20261024a → instalar el
   paquete completo.
5. **Plan de propuesta de mejora** para migrar a un sistema moderno y seguro.
6. **Migración según el plan** — servidor Node.js (Hono + Prisma) que reemplaza los 43
   `api/*.php` con el mismo contrato; sesiones opacas, cédulas cifradas (AES-256-GCM),
   escrituras atómicas, respaldo diario, precios cada 6 h, revisión diaria de datos; importador
   de `data/*.json` (simulación por defecto, idempotente, conserva contraseñas).
7. **GitHub** — repositorio conectado, PR y CI.
8. **GoDaddy** — adaptado a cPanel compartido, Node 22 y **MySQL** (probado en MySQL 8).
9. **Suspender al terminar** — servicios detenidos y revisión programada cancelada.
10. **Error «package.json en la raíz»** — `package.json`, `package-lock.json` y `arrancar.cjs` en la raíz.
11. **Base lista para importar y secretos** — `.sql` de estructura y `.env` con clave generada.
12. **Pasos de despliegue y migración con datos reales** — guía con ensayo y vuelta atrás;
    probado: un miembro migrado entra con su contraseña PHP y su cédula queda cifrada.
13. **Sin Terminal en el hosting** — instalación con «Run NPM Install»; conversión de datos
    preparada; explicado qué se garantiza en privacidad y la alternativa de convertir en el PC.
14. **Base primero, datos al final** — contraseña de admin inicial por `.env`; el importador
    reemplaza los lotes de ejemplo y la contraseña de admin de producción sustituye a la inicial.
15. **GoDaddy Node.js Hosting** — conexión con variables `DB_*`/`MYSQL_*`, tablas automáticas
    en el primer arranque, arranque que completa la instalación (probado en el peor caso).
16. **Paso a paso para importar/pegar la tabla** — `GUIA-GODADDY-NODEJS.md`.
17. **Aviso «la importación reemplaza las tablas»** — importar solo ahora (vacía) y una vez al final.
18. **Vista previa deformada** — faltaba `_next/` en `public_html/`; sitio completo en `sitio/`
    y DM Sans añadida; 0 recursos con error.
19. **Diseño profesional** (tema «Origen», misma estructura) — paleta café, títulos serif,
    botones y tarjetas unificados, animaciones con «reducir movimiento»; textos bajo AA 74 → 33;
    corregida además una carrera con React (#418) en `redcafe-v60-final.js` y
    `redcafe-afiliate.js`: 0 errores en 48 cargas.

## Resultados de pruebas (servidor nuevo sobre MySQL 8)

| Suite (`qa/`) | Resultado |
|---|---|
| `qa_api.py` (80 escrituras simultáneas) | 28/28 |
| `auditoria_perfiles_admin.py` | 74/74 |
| `auditoria_dueno.py` | 37/37 |
| `auditoria_moderacion.py` | 55/55 |
| `e2e_cursos.py` | 28/28 |
| `e2e_portada_botones.mjs` | 31/31 (con miembros en la base) |
| `e2e_cuentas.mjs` | 13/14 por separado (el caso 1 necesita miembros) |
| `e2e_mejoras.mjs` | 12/15, igual que con PHP |

Cómo correrlas: `servidor/paridad.sh <puerto> <carpeta-sitio> qa/<script>` (MySQL local con
base `redcafe_test`).

## Trabajo posterior en otra sesión (29 de octubre)
Otra sesión siguió trabajando en la misma rama `plataforma-node`. Sus cambios (ver `git log`):

- Panel: estadísticas en vivo cargan; tarjetas de acción con el tema Origen; ayuda de respaldos para MySQL
- Herramienta: anonimizar data/ en el navegador para ensayar con contenido real
- Datos reales sin exponerlos: paquete cifrado, importación desde el admin y vigilante del repositorio
- Arranque: escuchar siempre en PORT y 0.0.0.0, con página de espera mientras compila
- Con PORT fijado por el hosting, escuchar siempre en 0.0.0.0 aunque exista HOST
- Admin: rescate de la contraseña con REDCAFE_PASS_ADMIN_RESTABLECER
- Vista previa tras el proxy: Host público por X-Forwarded-Host, sin redirigir fuera del dominio propio y /estado-servidor de diagnóstico
- Variables del panel: limpiar espacios y comillas; /estado-servidor dice qué variables llegan (sin valores)
- Herramientas locales: generar claves y SQL para fijar la contraseña del admin
- SQL del admin: una sola sentencia UPDATE, sin comentarios (la consola de GoDaddy no acepta varias)
- SQL del admin como volcado completo: el importador de GoDaddy borra las tablas antes de cargar el archivo
- /estado-servidor: forma de los valores no válidos y minutos desde el arranque
- /estado-servidor: no mostrar la forma de las contraseñas
- generar-claves: bloque listo para «Pegar .env» del panel de GoDaddy
- Importación: modo «Sincronizar» para importaciones repetidas desde el sitio antiguo

Destacan: rescate de la contraseña de admin (`REDCAFE_PASS_ADMIN_RESTABLECER`), diagnóstico
en `/estado-servidor` (sin mostrar valores), **datos reales sin exponerlos** (paquete cifrado
que se importa desde el admin, con modo «Sincronizar»), herramientas en `herramientas/`
(`generar-claves.html`, `procesar-respaldo.html`, `sql-contrasena-admin.html`) y un
**vigilante de datos personales** (`herramientas/vigilar-datos.mjs`) que falla si se versionan
datos, `.zip`, `.sql` no permitidos o `.env`.

## Pendiente

1. **Desplegar en GoDaddy** (lo hace el propietario): variables, tablas, Deploy. Confirmar en
   el panel los nombres de las variables de la base y la **carpeta persistente** para fotos
   subidas (`REDCAFE_UPLOADS`; una fuente menciona `/public/assets/`).
2. **Migrar los datos reales** al final. Vía preferente: el paquete cifrado que se importa
   desde el admin (sesión del 29-oct, con modo «Sincronizar»). Alternativa local:
   `servidor/herramientas/convertir-datos-a-sql.sh` (genera un .sql que NO debe versionarse).
3. **Confirmar los casos de prueba que dependen de datos** con los datos reales.
4. **Revisar el tema «Origen» en páginas internas** (panel, admin, chat) — no se revisaron a fondo.
5. **Borrar `api/agregar-cursos.php` de producción** (clave fija en el código).
6. **Unir el PR a `main`** cuando se quiera desplegar desde `main`.
7. Errores #418 intermitentes que ya existían en otras páginas: medidos 0 en 48 cargas tras la
   corrección; vigilar en producción.
8. Futuros builds del frontend: `herramientas/fusionar-capa-propia.py` debe conservar los
   cambios de `sitio/` (tema añadido al final de `redcafe-v60-final.css` y los dos scripts
   corregidos). Fuente del tema: `sitio/redcafe-tema-origen.css`.
