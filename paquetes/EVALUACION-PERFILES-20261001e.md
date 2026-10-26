# Alcance por perfil y control del admin — 20261001e

Verificado de punta a punta en local (datos sintéticos), en la API y en la interfaz móvil (390 px).
Scripts: `qa/auditoria_perfiles_admin.py`, `qa/e2e_movil.mjs`, `qa/regresion.sh`.

## Lo que puede hacer cada perfil (comprobado)
| Perfil | Puede | No puede (comprobado) |
|---|---|---|
| Visitante | Ver portada, marketplace, mapa, fichas, academia, comunidad; registrarse | Ver datos personales de miembros |
| Productor | Publicar lote (con GPS → mapa), editarlo, ver pedidos y aviso en campana, avanzar pedido | Borrar o editar lo ajeno |
| Comprador | Filtrar marketplace, pedir lote, ver servicios, seguir cursos. **También publica lotes (reventa, por diseño)** | Funciones de admin, enviar avisos |
| Asesor | Publicar servicios y cursos, ver inscritos y exportarlos (CSV), coautoría | — |
| Exportador | Publicar requerimientos de café y ofertas de empleo | — |
| Admin | Todo lo de abajo | — |

## Control del admin
| Área | Ver | Editar | Aprobar/verificar | Ocultar | Borrar | Interfaz |
|---|---|---|---|---|---|---|
| Miembros | ✔ | ✔ (API) | ✔ verificar / rechazar | ✔ activo/inactivo | ✔ reset / eliminar | Validación, Miembros |
| Lotes | ✔ | ✔ | ✔ | ✔ | ✔ | Lotes, Verificaciones |
| Servicios de miembros | ✔ | ✔ (API) | ✔ | — | ✔ | **Moderación (nueva)** |
| Servicios oficiales | ✔ | ✔ | — | ✔ retirar | ✔ | Servicios de la plataforma |
| Cursos | ✔ inscritos + CSV | ✔ | ✔ | — | ✔ | Academia |
| Pedidos | ✔ | ✔ avanzar | — | — | ✔ | Pedidos |
| Requerimientos / empleos / busco empleo | ✔ | ✔ (API, y en su página) | — | ✔ cerrar | ✔ | **Moderación (nueva)** |
| Comunidad | ✔ | ✔ | — | — | ✔ | **Moderación (nueva)** |
| Reportes de miembros | ✔ | ✔ responder / estado | — | — | — | **Reportes (nueva)** |

## Notificaciones
| Canal | Estado |
|---|---|
| Interna (campana) a todos / perfil / miembros | ✔ **Pestaña Avisos (nueva)**; antes solo existía en la API |
| Push del navegador | ✔ sale junto con cada aviso para quien lo activó |
| Correo | ✔ **nuevo**: copia opcional del aviso, solo con consentimiento, enlace de baja firmado, tope de 250 por envío |
| WhatsApp | ✔ manual (lista + enlaces wa.me), respeta consentimiento |

## Pendiente (por orden de impacto)
1. **Avance de los cursos de la Red** (Buenas Prácticas, etc.): se guarda solo en el navegador. No pasa a otro
   dispositivo y ni el admin ni el autor lo ven. Propuesta: guardarlo en el servidor como los cursos creados por asesores.
2. **Editar desde el admin** el perfil de un miembro, un servicio o un requerimiento: la API lo permite y falta el formulario
   (hoy, desde Moderación solo se puede eliminar).
3. Formularios de publicar lote y servicio: campos sin `label` (accesibilidad). El de servicio está duplicado (React oculto
   y copia de la capa) → fase 4 de la migración.
4. Móvil: botones +/− del mapa < 32 px (Leaflet); 13 textos < 11 px en la ficha de lote.
5. Popup de novedades: faltan fecha, hora y lugar de la charla del sábado.
6. Correo: el hosting compartido limita los envíos y el remitente no-reply puede caer en spam. Hay que probarlo primero con tu cuenta.
