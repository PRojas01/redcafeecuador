# Auditoría de Red Café Ecuador — paquete `actualizacion-20261024a`

Fecha: 26 oct 2026 · Alcance: los 14 archivos de `api/`, los scripts propios `redcafe-*.js`, `sw.js` y `.htaccess` del paquete.
Método: lectura del código, servidor PHP 8.3 local y pruebas reales (curl y Chromium) antes y después de corregir.

## Resultado

| | Antes | Después |
|---|---|---|
| Fallos confirmados con prueba | 14 | 0 |
| Pruebas de seguridad (17) | 13 fallan | 17 pasan |
| Flujos normales (registro, lotes, pedidos, servicios, comunidad, reportes) | — | 30/30 OK |
| Registros simultáneos perdidos (10 a la vez) | 7 de 10 | 0 |

## Fallos corregidos

### Críticos
1. **El 2FA se podía anular.** Con solo la contraseña, `auth.php?action=me` devolvía los hashes de los códigos de respaldo. Eran sha256 de 8 caracteres hexadecimales con sal fija: se descifraban en ~1 h con un solo núcleo de CPU (segundos con GPU). Ahora esos datos nunca salen del servidor, la pantalla 2FA recibe solo nombre y correo enmascarado, y los códigos nuevos se guardan con bcrypt. Los ya emitidos siguen valiendo.
2. **Pérdida de datos por escrituras simultáneas.** Registro, perfil, lotes, servicios, publicaciones y contraseñas se leían y guardaban sin bloqueo. De 10 altas simultáneas se perdieron 7: cada persona recibía «ok» y su cuenta no quedaba guardada. Ahora todas esas escrituras pasan por `mutate_json` (bloqueo exclusivo).

### Altos
3. **Pedidos con cantidad y precio inventados.** Se aceptaban 9.999 sacos de un lote con 5, por $0,01. Ahora el total lo calcula el servidor a partir del precio del lote, y se rechaza pedir más de lo que hay o un lote agotado.
4. **Avisos falsos a cualquier miembro.** `create_service` aceptaba cualquier `proveedorId` y cualquier nombre de proveedor. Se podía enviar a otra persona un aviso «Red Café Ecuador: pago pendiente…». Ahora proveedor, título y precio salen del catálogo.
5. **Cambiar la contraseña sin pasar el 2FA.** Quien tenía la contraseña robada podía cambiarla y dejar fuera al titular. Ahora `change_password` exige la sesión completa.
6. **Las sesiones robadas seguían abiertas** después de cambiar o restablecer la contraseña. Ahora un cambio cierra las demás sesiones.
7. **El enlace de recuperación del administrador se gastaba solo.** Los antivirus y las vistas previas del correo abren los enlaces: generaban una contraseña nueva que nadie veía, y la administración quedaba fuera. Ahora abrir el enlace solo muestra un botón, y la contraseña se genera al pulsarlo (POST).
8. **El registro aceptaba cualquier `plan`** («premium-oro»). Ahora toda alta entra en `origen`.
9. **Fuerza bruta del código 2FA.** Solo había límite por IP. Ahora, tras 5 códigos erróneos, el código se anula.

### Funcionales
10. **No se podían pedir viveros, café tostado ni lotes «a convenir».** El botón enviaba total 0 y la API respondía «Total inválido».
11. **Un pedido cancelado se podía marcar como «Entregado».**
12. **Los enlaces del pie de todos los correos estaban rotos.** Salía `{MAIL_BRAND_URL}` literal. Además, los asuntos con tildes o emoji ahora van codificados (RFC 2047).
13. **El proveedor de un servicio no podía avanzar sus solicitudes.** Solo podía hacerlo el productor de un lote.
14. **Al editar lotes y servicios no se validaba nada:** stock y precio negativos, textos sin tope, objetos en lugar de texto y una visibilidad arbitraria. Ahora se aplican los mismos límites que al publicar. Los comentarios también tienen tope: antes se aceptó uno de 300 KB.

### Menores
- `members.php?action=publicos` ya no lista cuentas suspendidas ni bloqueadas.
- La baja de cuenta considera también los pedidos de servicios (`proveedor_id`).
- El inicio de sesión con 2FA regenera el id de sesión.
- La cookie de cierre de sesión lleva `SameSite`.
- En `sw.js`, una notificación push ya no puede abrir un dominio externo (`//otro.com`).

## Lo que está bien (verificado)
- **Protección CSRF** (`rc_proteger_origen`): bloquea las escrituras desde otro sitio.
- **XSS:** se publicaron cargas `<img onerror>` en todos los campos de lotes, servicios, perfil y comunidad. En marketplace, ficha de lote y comunidad salen como texto; ninguna se ejecuta.
- **Contraseñas** con bcrypt, y **tokens de recuperación** con hash, caducidad y un solo uso.
- **`.htaccess`:** bloquea `data/`, los archivos ocultos, los `api/_*.php` y `error_log`, fuerza HTTPS y un solo dominio, y envía cabeceras de seguridad.
- **Versionado de caché:** las 1.287 referencias usan el mismo `?v=20261024a`.

## Pendiente / recomendaciones
1. **Auditar el resto del sistema.** El paquete trae 14 de ~32 endpoints: faltan `chat.php`, `cursos.php`, `uploads.php`, `admin.php`, `cotizaciones.php`, `servicios.php`, `visual.php`, `push.php`, `socios.php` y otros. Tampoco trae el núcleo de Next (`webpack-*.js`, `main-app-*.js`) ni `redcafe-sesion.js`, `redcafe-ruta.js`, `redcafe-fusion.js`, etc. Sin ellos la interfaz no arranca en local. **`uploads.php` es la prioridad: subir archivos es el punto de mayor riesgo.**
2. **El acceso de administración es una sola contraseña, sin 2FA ni usuario.** Recomendado: 2FA para la administración o restringir `/admin` por IP.
3. **El cambio de correo del perfil no pide la contraseña actual.** Si alguien roba una sesión, puede cambiar el correo y luego restablecer la contraseña. Recomendado: pedir la contraseña al cambiar el correo (requiere ajustar el formulario del panel).
4. **Almacenamiento en JSON.** Ya es seguro ante concurrencia, pero `members.json` y `posts.json` se leen enteros en cada petición. Con varios miles de miembros conviene pasar a SQLite/MySQL.
5. **Peso del frontend:** 252 KB de CSS y ~400 KB de JS propio, en 18 scripts por página. Recomendado: unir y minificar.
6. Los endpoints `admin_save` y `admin_delete` de servicios oficiales siguen sin bloqueo. El riesgo es bajo porque solo los usa la administración.

## Cómo desplegar
- **Opción A (recomendada):** subir `redcafe-parche-seguridad-20261026.zip` a `public_html` y descomprimirlo encima. Son 11 archivos: 10 de `api/` y `sw.js`.
- **Opción B:** usar `redcafe-actualizacion-20261024a-corregido.zip`, que es el paquete completo original con las correcciones.
- No hace falta migrar datos. Los códigos 2FA ya emitidos y las sesiones abiertas siguen funcionando.
- Haz antes una copia de `public_html/api/`.
- Detalle línea a línea de los cambios: `cambios.diff`.
