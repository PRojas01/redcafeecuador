# Auditoría local — Codex

> **Nota de revisión (Claude, 2026-10-29):** informe generado por Codex CLI en modo solo lectura. Comprobado a mano el hallazgo 1: `new URL().pathname` conserva `%64`/`%69`, `prohibida()` no lo detecta y `resolver()` decodifica; como `sitio/socios/redcafe-preacuerdo-estrategico-2026-a7f3c9/index.txt` existe, `/socios/redcafe-preacuerdo-estrategico-2026-a7f3c9/%69ndex.txt` lo serviría sin la puerta de sesión. Prioridad de arreglo.

Revisión estática de código dentro del alcance autorizado. No se modificaron archivos, no se accedió a datos reales ni se hicieron solicitudes de red. La normalización de rutas se comprobó con ejemplos sintéticos en memoria.

**Recomendación: corregir los hallazgos de severidad Alta antes de publicar.** Esta revisión no certifica la configuración del despliegue ni el contenido almacenado.

| N.º | Severidad | Hallazgo |
|---|---|---|
| 1 | Alta | Rutas codificadas eluden la protección de archivos |
| 2 | Alta | SSRF mediante suscripciones push |
| 3 | Alta | Cambiar o recuperar la contraseña admin no revoca sesiones |
| 4 | Alta | Cambio de correo sin reautenticación ni verificación |
| 5 | Alta | Contraseña inicial admin escrita en logs |
| 6 | Media | Recuperación de contraseña reutilizable mediante concurrencia |
| 7 | Media | Cancelación concurrente permite cancelar pedidos entregados |
| 8 | Media | Límites de subida posteriores a la lectura completa del cuerpo |
| 9 | Media | Límites de intentos vulnerables a concurrencia |
| 10 | Media | Solicitudes de servicios inexistentes aceptadas como oficiales |

## 1. Rutas codificadas eluden la protección de archivos

- **Severidad**: Alta
- **Ubicación**: `servidor/src/lib/estatico.ts:25`, `servidor/src/lib/estatico.ts:45`, `servidor/src/lib/estatico.ts:74`.
- **Problema**: `prohibida()` comprueba la ruta codificada; después, `resolver()` aplica `decodeURIComponent()`. Los filtros de carpetas, archivos ocultos y preacuerdos protegidos no se aplican a la ruta que finalmente se utiliza.
- **Caso de fallo**: `/%64ata/audit-placeholder.json` → supera el filtro de `/data/` → se resuelve dentro de esa carpeta. Igualmente, `/socios/redcafe-preacuerdo-estrategico-2026-a7f3c9/%69ndex.html` elude el bloqueo del preacuerdo. Si el archivo existe, se sirve sin pasar por la puerta de sesión. Se verificó la transformación con rutas sintéticas; no se comprobó ningún archivo protegido.
- **Arreglo sugerido**: decodificar y normalizar una sola vez antes de autorizar; aplicar los bloqueos a la ruta canónica y servir exactamente esa misma ruta.

## 2. SSRF mediante suscripciones push

- **Severidad**: Alta
- **Ubicación**: `servidor/src/modulos/push.ts:19`, `servidor/src/modulos/push.ts:44`, `servidor/src/lib/push.ts:64`.
- **Problema**: cualquier miembro puede guardar un endpoint que empiece por `https://`. El servidor realiza posteriormente un `POST` a esa dirección. No hay lista de proveedores autorizados, exclusión de direcciones privadas o loopback, ni restricción explícita de redirecciones.
- **Caso de fallo**: un miembro registra `https://127.0.0.1:8443/accion` con claves push válidas y ejecuta `prueba` → el servidor intenta conectarse a un servicio local. El alcance depende de los servicios accesibles desde el despliegue.
- **Arreglo sugerido**: permitir únicamente proveedores push admitidos, bloquear destinos internos tras resolver DNS y desactivar redirecciones. Aplicar también restricciones de salida de red.

## 3. Cambiar o recuperar la contraseña admin no revoca sesiones

- **Severidad**: Alta
- **Ubicación**: `servidor/src/modulos/auth.ts:249`, `servidor/src/modulos/auth.ts:291`, `servidor/src/lib/admin.ts:65`, `servidor/src/lib/sesion.ts:37`, `servidor/src/lib/usuarios.ts:177`.
- **Problema**: el cambio de contraseña actualiza el hash, pero no invalida sesiones administrativas existentes. Al cargar una sesión solo se comprueba su caducidad; `requiereAdmin()` confía en el booleano almacenado. No se contrasta `adminDesde` con una fecha de revocación.
- **Caso de fallo**: un atacante conserva una cookie admin → el administrador cambia o recupera la contraseña → la cookie del atacante sigue autorizando operaciones administrativas hasta que expire o sea eliminada.
- **Arreglo sugerido**: revocar las sesiones admin al cambiar o recuperar la contraseña, o comprobar una versión de credenciales en cada petición.

## 4. Cambio de correo sin reautenticación ni verificación

- **Severidad**: Alta
- **Ubicación**: `servidor/src/modulos/members.ts:66`, `servidor/src/modulos/members.ts:83`, `servidor/src/modulos/auth.ts:160`.
- **Problema**: `members.update` reemplaza inmediatamente el correo con una sesión válida, sin exigir contraseña, segundo factor o confirmación del nuevo correo. Ese correo se utiliza después para recuperar la contraseña.
- **Caso de fallo**: alguien obtiene temporalmente una sesión de miembro → cambia el correo por uno bajo su control → solicita recuperación y fija otra contraseña. El acceso temporal se convierte en control persistente de la cuenta. Si hay 2FA por correo, los siguientes códigos también se enviarán al nuevo destino.
- **Arreglo sugerido**: exigir reautenticación reciente, confirmar el nuevo correo antes de sustituirlo y avisar al correo anterior.

## 5. Contraseña inicial admin escrita en logs

- **Severidad**: Alta
- **Ubicación**: `servidor/src/lib/admin.ts:49`, `servidor/src/lib/admin.ts:51`.
- **Problema**: cuando no existe administrador ni una contraseña inicial válida configurada, se genera una contraseña y se imprime íntegramente mediante `console.warn`.
- **Caso de fallo**: instalación nueva con esa configuración → la contraseña efectiva queda almacenada en los registros del hosting y accesible a quienes puedan consultarlos.
- **Arreglo sugerido**: eliminar el secreto del log y utilizar un mecanismo de activación de un solo uso con entrega controlada.

## 6. Recuperación de contraseña reutilizable mediante concurrencia

- **Severidad**: Media
- **Ubicación**: `servidor/src/modulos/auth.ts:183`, `servidor/src/modulos/auth.ts:185`.
- **Problema**: el token se valida fuera de la transacción. Dentro de ella se cambia la contraseña y se ejecuta `deleteMany()`, sin comprobar que esa petición haya consumido un token todavía vigente.
- **Caso de fallo**: dos confirmaciones simultáneas con el mismo token y contraseñas diferentes leen primero el token válido → ambas actualizan la contraseña y responden éxito; el último cambio prevalece. La segunda eliminación puede afectar cero filas sin impedir la operación.
- **Arreglo sugerido**: consumir el token de forma atómica dentro de la transacción y exigir que se haya eliminado exactamente una fila antes de cambiar la contraseña.

## 7. Cancelación concurrente permite cancelar pedidos entregados

- **Severidad**: Media
- **Ubicación**: `servidor/src/modulos/pedidos.ts:175`, `servidor/src/modulos/pedidos.ts:179`, `servidor/src/modulos/pedidos.ts:181`.
- **Problema**: se comprueba que el pedido no esté entregado antes de adquirir el bloqueo de `mutar()`. Dentro del bloqueo se sobrescribe su estado sin volver a validarlo.
- **Caso de fallo**: cancelación lee un pedido «En camino» → otra petición confirma su recepción y guarda «Entregado» → la cancelación adquiere el bloqueo y lo transforma en «Cancelado», pese a la prohibición explícita.
- **Arreglo sugerido**: comprobar autorización y estado sobre el documento actual dentro del callback de `mutar()`.

## 8. Límites de subida posteriores a la lectura completa del cuerpo

- **Severidad**: Media
- **Ubicación**: `servidor/src/app.ts:125`, `servidor/src/lib/http.ts:66`, `servidor/src/lib/http.ts:77`, `servidor/src/modulos/uploads.ts:23`.
- **Problema**: el cuerpo se procesa con `formData()` o `text()` antes de autenticar, comprobar cupos o validar tamaños de archivos. No hay un límite global del cuerpo en la aplicación revisada. Los máximos de 2 y 5 MB se verifican cuando el multipart ya fue leído.
- **Caso de fallo**: un cliente sin sesión envía cuerpos multipart o JSON muy grandes → la aplicación consume recursos para leerlos antes de rechazarlos. Varias peticiones pueden agotar memoria o degradar el servicio. Un límite externo podría mitigar el impacto, pero su configuración no forma parte de esta revisión.
- **Arreglo sugerido**: limitar los bytes recibidos antes del parseo, incluyendo peticiones sin `Content-Length`, y configurar un límite coherente en el proxy.

## 9. Límites de intentos vulnerables a concurrencia

- **Severidad**: Media
- **Ubicación**: `servidor/src/lib/seguridad.ts:40`, `servidor/src/lib/seguridad.ts:44`.
- **Problema**: contar intentos y registrar uno nuevo son operaciones separadas, sin bloqueo ni reserva atómica del cupo. Afecta a los controles de login, recuperación, OTP y otras acciones que utilizan `cupo()`.
- **Caso de fallo**: quedan uno o pocos intentos disponibles → llegan varias peticiones simultáneas → todas leen un contador inferior al máximo y continúan, superando el límite establecido.
- **Arreglo sugerido**: reservar el intento mediante una operación atómica o una transacción con bloqueo por clave y ventana.

## 10. Solicitudes de servicios inexistentes aceptadas como oficiales

- **Severidad**: Media
- **Ubicación**: `servidor/src/modulos/pedidos.ts:106`, `servidor/src/modulos/pedidos.ts:122`, `servidor/src/modulos/pedidos.ts:130`.
- **Problema**: `create_service` no exige encontrar un servicio oficial cuando no hay coincidencia entre los servicios de terceros. Conserva el título proporcionado por el cliente y asigna a Red Café como proveedor, con precio cero.
- **Caso de fallo**: un miembro envía un `servicioId` inexistente y un título inventado → se registra un pedido oficial atribuido a Red Café y se notifica a administración, en lugar de responder 404. Un servicio de terceros oculto tampoco se rechaza explícitamente antes de esa ruta alternativa.
- **Arreglo sugerido**: exigir una coincidencia válida y disponible en el catálogo correspondiente; obtener siempre proveedor, título y precio del servidor.
