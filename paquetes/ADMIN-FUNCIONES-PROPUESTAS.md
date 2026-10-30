# Red Café Ecuador: funciones del admin, qué hay y qué falta

Revisión del 24-oct-2026, hecha con el modelo local (qwen3:14b en Ollama) sobre el inventario real de la API (50 archivos PHP) y del panel. Cada punto se comprobó después en el código.

## Hecho en 20261024a (ficha del miembro, Admin → Cuentas)

| Función | Detalle |
|---|---|
| **Estado de la cuenta** | Muestra el acceso: activa, suspendida hasta una fecha, bloqueada o desactivada. Tiene los botones **Bloquear**, **Suspender**, **Advertencia**, **Desbloquear**, **Desactivar (administrativo)** y **Reactivar**. Bloquear y suspender abren el formulario de medidas con esa medida ya elegida, así que el debido proceso se mantiene. |
| Validación del perfil | Pendiente, en revisión, verificado o rechazado, con motivo. |
| Notificar y contactar | **Dentro de la Red:** chat interno y aviso a la campana. **Fuera de la Red:** correo, WhatsApp y enlace para crear una contraseña nueva. |
| Lo que publicó | Lista de lotes, servicios, publicaciones, empleos, requerimientos y búsquedas. Lotes y servicios se pueden **ocultar** y volver a publicar; todo se puede **eliminar**. Cada acción exige un motivo, que le llega a quien publicó, y queda en el registro. |
| Pedidos | Sus pedidos de compra y de venta. Los que están en curso se pueden **cancelar por mediación**, con un motivo que ven las dos partes. |
| Notas internas | Las ve solo la administración y se borran si la persona cierra su cuenta (LOPDP art. 15). |
| Exportar ficha | Copia de sus datos en JSON para atender el derecho de acceso (LOPDP art. 13). Va sin la identidad de quien la reportó. |
| Contador de servicios | Arreglado: siempre marcaba 0 porque leía el archivo equivocado. |

## Ya existía (el modelo local lo dio por ausente)

| Función | Dónde está |
|---|---|
| Verificar lotes, servicios, cursos y miembros | `verificaciones.php`, Admin → Validación |
| Ocultar y volver a mostrar lotes | Admin → Lotes |
| Borrar comentarios de la comunidad | `comunidad.php` (`comment_delete`), Admin → Moderación |
| Ver matriculados y resolver solicitudes de acceso a cursos | `cursos.php` (`matriculados`, `solicitudes`, `resolver_acceso`) |
| Historial de acciones | `registrar_actividad` (también lo muestra la ficha) |

## Pendiente: propuesta por prioridad (no está en este paquete)

| Prioridad | Entidad | Función | Por qué |
|---|---|---|---|
| Alta | Miembros | Cambiar los perfiles (roles) desde la ficha | Hoy solo puede cambiarlos el propio miembro (`roles_update` exige su sesión). |
| Alta | Todas | Exportar a CSV (Excel) | La exportación actual es JSON, que no se abre en Excel. |
| Alta | Empleos, requerimientos, comunidad | Ocultar en vez de eliminar | Hoy solo se pueden borrar. Ocultar permite corregir y volver a publicar. |
| Media | Comunidad, marketplace | Destacar o fijar publicaciones y lotes | No existe. Sirve para avisos oficiales y para lotes verificados. |
| Media | Varias | Acciones masivas (verificar u ocultar varios a la vez) | Ahorra tiempo cuando hay muchos pendientes. |
| Media | Cursos | Matricular o dar de baja a varios miembros a la vez | Hoy se hace de uno en uno. |
| Media | Pedidos | Notas del admin dentro de cada pedido | Para documentar una mediación. |
| Baja | Lotes | Historial de cambios de precio y stock | Para detectar manipulación de precios (infracción del catálogo). |
| Baja | Miembros | Ver documentos subidos (cédula, certificados) en la ficha | Para que la verificación no salga de la ficha. |
| — | Miembros | «Entrar como el usuario» (impersonación) | **No recomendado.** Rompe el registro de quién hizo qué y es un riesgo para los datos (LOPDP). |
