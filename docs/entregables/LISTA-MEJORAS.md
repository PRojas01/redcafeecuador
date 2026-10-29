# Red Café Ecuador — Lista priorizada de mejoras

Fecha: 26 oct 2026 · Basada en la auditoría del código (51 PHP de `public_html/api`, capa `redcafe-*.js`, `plataforma_cafe`) y en pruebas reales: servidor PHP 8.3 local, curl y Chromium.

**Prioridad = (Impacto + Riesgo) × (6 − Esfuerzo)**, cada factor de 1 a 5. Esfuerzo: 1 ≈ menos de 2 h · 3 ≈ 1 día · 5 ≈ semanas.
Estado: ✅ corregido y probado (en el parche entregado) · 🔧 pendiente.

---

## Fase 0 — Desplegar lo ya corregido (hoy)

Los 14 archivos del paquete `20261024a` son idénticos a `public_html/api`, así que el parche `redcafe-parche-seguridad-20261026.zip` aplica directamente.

| # | Mejora | Tipo | I | R | E | Prio | Estado |
|---|---|---|---|---|---|---|---|
| 1 | El 2FA se anulaba: `me` entregaba los hashes de los códigos de respaldo (descifrables en ~1 h) | Seguridad | 5 | 5 | 1 | **50** | ✅ |
| 2 | Altas y datos perdidos por escrituras sin bloqueo (se perdían 7 de 10 registros simultáneos) | Datos | 5 | 5 | 2 | **40** | ✅ |
| 3 | Pedidos con cantidad y total inventados (9.999 sacos por $0,01) | Negocio | 4 | 5 | 1 | **45** | ✅ |
| 4 | Avisos falsos a cualquier miembro con `create_service` (abría además chats no autorizados) | Seguridad | 4 | 5 | 1 | **45** | ✅ |
| 5 | Cambiar la contraseña sin pasar el 2FA; sesiones robadas abiertas tras cambiarla | Seguridad | 3 | 5 | 2 | **32** | ✅ |
| 6 | Pedidos de viveros, café tostado y lotes «a convenir» siempre fallaban | Funcional | 5 | 3 | 1 | **40** | ✅ |
| 7 | Enlaces rotos en el pie de todos los correos; asuntos sin codificar | Funcional | 3 | 2 | 1 | **25** | ✅ |
| 8 | Enlace de recuperación del administrador gastado por los antivirus del correo | Operación | 3 | 4 | 1 | **35** | ✅ |
| 9 | Registro con `plan` arbitrario; edición de lotes y servicios sin validar; comentarios de 300 KB | Validación | 3 | 3 | 1 | **30** | ✅ |

## Fase 1 — Esta semana (alto riesgo, poco esfuerzo)

| # | Mejora | Tipo | I | R | E | Prio | Por qué importa |
|---|---|---|---|---|---|---|---|
| 10 | **PayPal (`servicios.php`)**: validar el formato del ID de orden, exigir moneda USD, no repetir el `paypal_order_id` y numerar sin `count()+1` | Seguridad / pagos | 5 | 5 | 1 | **50** | El ID entra sin validar en la URL de la API de PayPal con las credenciales del comercio (`../` permite llamar a otras operaciones, como reembolsos). El navegador elige la moneda: «30» en yenes pasaría como pago de $30. |
| 11 | **Chat (`chat.php`)**: escrituras con bloqueo al enviar, abrir y marcar como leído | Datos | 4 | 5 | 2 | **36** | Cada consulta de la conversación reescribe el archivo entero de mensajes. Un mensaje enviado en ese momento se pierde. |
| 12 | **`admin.php`**: no devolver `pass` ni `backup_codes` en el listado ni en la exportación de miembros; escribir con bloqueo | Seguridad / datos | 3 | 4 | 1 | **35** | Los hashes salen al navegador y a los JSON descargados. Las ediciones del admin pueden borrar altas simultáneas. |
| 13 | **Pruebas de regresión de seguridad**: incorporar las pruebas de esta auditoría (17 casos + carrera de concurrencia) a `qa/suite-completa.sh` | Pruebas | 3 | 4 | 1 | **35** | Hoy la suite no detecta pérdidas por concurrencia, fugas de 2FA ni manipulación de pedidos. |
| 14 | **Bloqueo en los demás escritores**: `cotizaciones`, `cursos`, `ratings`, `menu`, `inventario`, `contenido`, `verificaciones`, `visual`, `media`, `enviar-waitlist`, `agregar-cursos` | Datos | 4 | 4 | 2 | **32** | Mismo fallo que el n.º 2. Aceptar una cotización crea un pedido cuyo número puede repetirse con otro creado a la vez. |
| 15 | **Cotizaciones**: las cifras globales (montos, conversión) solo para la administración; no permitir pedirse cotización a uno mismo; tope de longitud en `unidad`; crear las plantillas de correo `cotizacion_solicitada`/`recibida` | Negocio / funcional | 3 | 2 | 1 | **25** | Cualquier miembro ve la facturación de la Red. Los correos de cotización nunca se envían porque la plantilla no existe. |
| 16 | **Subidas**: rechazar imágenes de más de ~40 megapíxeles antes de procesarlas | Disponibilidad | 2 | 3 | 1 | **25** | Una imagen de menos de 2 MB con dimensiones enormes agota la memoria de PHP. |

## Fase 2 — Este mes

| # | Mejora | Tipo | I | R | E | Prio | Por qué importa |
|---|---|---|---|---|---|---|---|
| 17 | Pedir la contraseña actual para cambiar el correo del perfil (API + formulario) | Seguridad | 3 | 4 | 2 | **28** | Quien roba una sesión cambia el correo, pide el restablecimiento y se queda con la cuenta. |
| 18 | Valoraciones de lotes y servicios solo de quien los compró | Confianza | 3 | 3 | 2 | **24** | Hoy cualquier cuenta valora cualquier lote. Con cuentas falsas se manipula la reputación. |
| 19 | 2FA (o lista de IP permitidas) para el acceso de administración | Seguridad | 3 | 5 | 3 | **24** | Una sola contraseña compartida, sin usuario ni segundo factor, abre todo el panel. |
| 20 | Correo por SMTP autenticado (SPF/DKIM) en lugar de `mail()` | Operación | 4 | 3 | 3 | **21** | Los códigos 2FA, la recuperación de contraseña y los avisos de pedido pueden caer en spam. Revisar los registros DNS del dominio. |
| 21 | Actualizar Next 15.1.6 / React 19.0.0 a su último parche | Dependencias | 2 | 3 | 2 | **20** | Versiones con avisos de seguridad conocidos. No son explotables en producción porque el sitio es un export estático sin servidor Node, pero sí afectan al entorno de desarrollo y bloquean futuras mejoras. |
| 22 | `cursos.php?action=exportar`: aviso PHP cuando falta `curso` | Código | 1 | 1 | 1 | **10** | Ensucia `error_log`. |

## Fase 3 — Trimestre (alto impacto, alto esfuerzo)

| # | Mejora | Tipo | I | R | E | Prio | Por qué importa |
|---|---|---|---|---|---|---|---|
| 23 | Terminar la migración de la capa propia a React (plan existente: `PLAN-MIGRACION-REACT.md`) | Arquitectura / UX | 5 | 3 | 5 | **8** | 35 scripts (1,2 MB con el CSS) ocultan y vuelven a pintar bloques de React: parpadeo de 1,5 a 4,1 s medido en las 65 páginas. La prioridad numérica es baja por el esfuerzo, pero es la mejora de experiencia más visible. |
| 24 | Pasar de archivos JSON a SQLite (o MySQL de cPanel) | Arquitectura | 4 | 3 | 5 | **7** | `members.json` se lee entero en cada petición, y cada nueva función debe acordarse de bloquear. Con varios miles de miembros, el rendimiento y la integridad lo exigirán. |
| 25 | Monitoreo externo: alertas por errores 5xx y por la falta de respaldo diario, fuera del propio sitio | Infraestructura | 3 | 3 | 3 | **18** | `_salud.php` avisa solo cuando alguien abre la campana. Si el sitio cae, nadie se entera. |

---

## Lo que está bien (verificado, no tocar)

- CSRF por origen.
- El escapado contra XSS: se probaron cargas en todos los campos y ninguna se ejecutó.
- Subida de imágenes: se recodifican con GD, se comprueba el tipo real y el servidor pone el nombre.
- Respaldos: rotados, fuera del alcance público y descarga solo para la administración.
- Preacuerdo de socios: protegido en el servidor.
- `.htaccess`.
- Contraseñas con bcrypt y tokens de recuperación de un solo uso.
- Moderación con debido proceso y baja LOPDP.

## Plan sugerido junto al trabajo de funcionalidades

1. **Hoy**: desplegar la Fase 0 (un ZIP de 11 archivos; no hace falta migrar datos).
2. **Semana 1**: n.º 10 a 16. Se pueden empaquetar en un solo incremental `20261027a`; ~1 día de trabajo.
3. **Semanas 2–4**: n.º 17 a 22, uno por paquete, junto a las funcionalidades.
4. **Trimestre**: n.º 23 por fases (ya planificado) y n.º 24 al terminar la fase 3 de la migración, para no mover dos cosas a la vez.
