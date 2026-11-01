# Red Café Ecuador ☕

Plataforma de afiliación del café ecuatoriano: una sola membresía mensual conecta a
**productores**, **vendedores** y **compradores** con marketplace, academia,
asesoría comercial y apoyo administrativo. Cumple LOPDP de Ecuador.

> **v1.0 lanzamiento** — Listo para producción en GoDaddy cPanel.

## Stack

- **Next.js 15** (App Router, **export estático** para hosting compartido) + **React 19**
- **TypeScript** estricto
- **Tailwind CSS v4**
- **Backend PHP 7.4+** (8 archivos en `public/api/`) para sesión, miembros, pedidos, lotes, chat, comunidad, menú, valoraciones, consents
- **Almacenamiento JSON** en `public/data/` (sin SQL, compatible con hosting compartido)
- Bitácoras locales del usuario en `localStorage` (privacidad first)

## Cómo correr

```bash
npm install     # instala dependencias
npm run dev     # servidor de desarrollo → http://localhost:3000
npm run build   # build estático → genera la carpeta out/ (listo para subir a cPanel)
```

Variables opcionales antes del build:

```bash
NEXT_PUBLIC_WHATSAPP=593999999999 \
NEXT_PUBLIC_WHATSAPP_MOSTRAR="+593 99 999 9999" \
npm run build
```

## Estructura de rutas

### Públicas

| Ruta | Contenido |
| --- | --- |
| `/` | Landing + Monitor de Precios (ICO / BCE / MAG) + planes + noticias + waitlist |
| `/marketplace` | Escaparate de lotes con filtros + rating de productores |
| `/marketplace/[id]` | Detalle del lote + pedido con escrow |
| `/academia` | Catálogo de cursos con barra de progreso |
| `/academia/[id]` | Módulos del curso + certificado |
| `/afiliate` | Selección de perfil/plan + registro con aceptación de políticas (LOPDP) |
| `/login` | Inicio de sesión |
| `/servicios` | Servicios incluidos |
| `/servicios/precios` | Panel de precios de referencia |
| `/servicios/calculadora` | Calculadora de quintales, sacos y margen |
| `/servicios/eudr` | Dossier de trazabilidad EUDR |
| `/servicios/factura` | Vista previa de factura electrónica |
| `/servicios/finanzas` | Simulador de costos y margen del usuario |
| `/asesoria` | Agenda de sesión de asesoría |
| `/laboratorio` | El Moral Bar Cafetería + Podcast + Experiencias + feedback |
| `/comunidad` | Publicaciones y comentarios |
| `/chat` | Mensajería entre miembros |
| `/bar` / `/barista` | Acceso directo a paneles de bar/barista |

### Privadas (requieren sesión)

| Ruta | Contenido |
| --- | --- |
| `/panel` | Mi Red: resumen por rol + Producción/Ventas/Planificación (productor) + Abastecimiento/Costos (vendedor) + Mis pedidos (comprador) + Menú/Pedidos (bar) + Turnos (barista) + Bitácora unificada + Valorar miembros + Certificados |
| `/admin` | Back-office: validación de miembros (pendiente → revisión → verificado/rechazado) + gestión de lotes + pedidos + ranking de valoraciones |

### Legales (cumplimiento LOPDP)

| Ruta | Contenido |
| --- | --- |
| `/legal` | Centro legal |
| `/politica-de-privacidad` | Política de Privacidad |
| `/politica-de-uso-de-datos` | Política de Uso de Datos |
| `/politica-de-cookies` | Política de Cookies |
| `/terminos-y-condiciones` | Términos y Condiciones |
| `/propiedad-y-uso` | Firma de propiedad intelectual y licencia |

## Perfiles y promesa de valor

| Rol | Tabs del panel | Bitácora | Valoraciones |
| --- | --- | --- | --- |
| **Productor** | Producción y venta, Publicar lote, Pedidos recibidos, Planificación, Bitácora, Valorar, Certificados | produccion, venta, siembra, limpieza, costo, lote, pedido | Sí |
| **Vendedor / Tostador** | Abastecimiento, Mis pedidos a productores, Costos y proyección, Bitácora, Valorar, Certificados | compra, tostado, costo, pedido | Sí |
| **Comprador** | Mis pedidos, Mis proveedores, Bitácora, Valorar, Certificados | pedido, compra | Sí |
| **Bar / Cafetería** | Mi menú, Pedidos del bar, Bitácora, Valorar, Certificados | menu, pedido, costo | Sí |
| **Barista** | Menú del día, Mis turnos, Bitácora, Certificados | turno, asistencia, capacitacion | (no requiere) |
| **Admin** | Validación, Valoraciones, Lotes, Pedidos | — | Puede valorar a todos |

## Sistema de validación (admin)

Estados por miembro:

1. **Pendiente** — recién registrado, sin revisar.
2. **En revisión** — la Red está validando identidad (cédula/RUC).
3. **Verificado** — pasó la revisión. Aparece con badge 🛡️ en el marketplace.
4. **Rechazado** — con motivo documentado. Puede corregirse y reenviar.

Filtros por estado, notas internas, fecha de verificación.

## Sistema de valoración

- **Score 1-5** (estrellas)
- **Admin** puede valorar a cualquier miembro en cualquier momento.
- **Miembros** pueden valorarse entre sí solo si tuvieron un pedido (verificación automática).
- **Rating promedio** y contador visible en:
  - Cards del marketplace (compacto)
  - Detalle de lote (completo)
  - Ranking del admin
  - Panel del miembro ("Valoraciones recibidas")

Rate limit: 20 valoraciones/hora por usuario.

## Despliegue

Ver [`DEPLOY.md`](./DEPLOY.md) — guía paso a paso para GoDaddy cPanel.

## Documentación adicional

| Archivo | Contenido |
| --- | --- |
| `LICENSE` | Licencia MIT — Pedro Rojas / SolucionesPro |
| `docs/PROPIEDAD_Y_USO.md` | Marca, propiedad intelectual, activos |
| `DEPLOY.md` | Despliegue completo en GoDaddy cPanel |
| `docs/LEGAL/README.md` | Notas internas legales |

## Estado del proyecto

**v1.0 lanzamiento.** Cumple LOPDP de Ecuador, incluye seguridad hardened para
hosting compartido, sistema de validación de usuarios y valoraciones entre miembros,
monitor de precios con fuente oficial (ICO), y exportación CSV de bitácoras.

---

*© 2026 Pedro Rojas — SolucionesPro · Red Café Ecuador*
