# Informe rediseño visual

Fecha: 2026-08-18  
Alcance: capa visual del frontend estático. No se tocaron `public/api/**`, `lib/api.ts`, `lib/data.ts`, `lib/config.ts`, `lib/sesion.ts`, `lib/registros.ts` ni `lib/certificados.ts`. No se desplegó.

## Perfil proveedor y avisos de vigencia

Fecha: 2026-08-18  
Alcance: tres cambios acotados de frontend. No se tocó `public/api/**`, `public/data/**`, `dist/`, zips de raíz ni `app/servicios/contratar/page.tsx`. No se desplegó ni se empaquetó.

- Marketplace: se retiró la mención de escrow del rótulo de total, quedó como `Total a pagar` y se añadió la nota pequeña `El pago con escrow estará disponible próximamente.`
- Legal: se añadió el aviso de vigencia al inicio de `/legal/` y una versión abreviada en `/terminos-y-condiciones/`, sin reescribir las cláusulas existentes.
- Perfil proveedor: se añadió el plan `Proveedor de Equipos`, el rol `proveedor` en registro/listas frontend, icono propio de caja de herramientas y tarjeta en la rejilla de perfiles de portada.
- Dependencia pendiente: el registro real de `proveedor` requiere que el backend acepte el rol en `public/api/auth.php`; ese archivo no se tocó porque lo trabaja otro agente.

Verificación:

```text
NEXT_PUBLIC_BASE_PATH=/redcafeecuador npm run build
✓ Compiled successfully
✓ Generating static pages (52/52)
✓ Exporting (3/3)
```

```text
OUT_DIR=present
/afiliate/index.html
/legal/index.html
/marketplace/index.html
/marketplace/loja-gesha-01/index.html
/terminos-y-condiciones/index.html
```

```text
GREP_ESCROW_LABEL_COUNT=0
AFILIATE_PROVIDER_COUNT=1
HOME_PROVIDER_COUNT=3
LEGAL_NOTICE_COUNT=2
LEGAL_QUOTAS_COUNT=2
TERMINOS_NOTICE_COUNT=2
```

Nota: no hay repositorio Git detectable desde `/media/master/Datos_3/plataforma_cafe`, por lo que no se pudo generar un `git diff` de diferencia editorial. La revisión se hizo por alcance de archivos y greps sobre las cadenas de este encargo.

## Archivos tocados

- `app/globals.css`: renombrado de tokens visuales `esmeralda/oro` a `tostado/latte`, foco visible, `prefers-reduced-motion`, subrayado de H2 convertido en `.titulo-subrayado`, hover sin levitación global, estilos de lectura legal.
- `components/Icono.tsx`: set SVG inline propio, 24x24, trazo 1.5, sin relleno.
- `components/Lamina.tsx`: cinco láminas SVG (`FincaTerrazas`, `CerezaMadura`, `SacoExportacion`, `TazaCenital`, `CamasSecado`) y un sello único `SelloOrigen`, con colores por tokens.
- `public/img/LEEME.txt`: listado de fotografías reales pendientes, proporción y peso máximo.
- `app/page.tsx`: portada con composiciones alternadas, láminas, sello único, iconos SVG y sin hover de levitación.
- `app/marketplace/page.tsx`, `app/marketplace/[id]/page.tsx`, `app/servicios/page.tsx`, `app/bar/page.tsx`: sustitución de bloques/emoji visual por láminas o iconos.
- `components/Navbar.tsx`, `components/Footer.tsx`, `components/HubFlotante.tsx`, `components/RatingBadge.tsx`, `components/PanelEstadisticas.tsx`, `components/Waitlist.tsx`: iconografía y objetivos táctiles visuales.
- Páginas de herramientas y paneles (`app/admin/page.tsx`, `app/panel/page.tsx`, `app/chat/page.tsx`, `app/login/page.tsx`, `app/bar/gestion/page.tsx`, `app/barista/page.tsx`): limpieza de emojis decorativos, foco/controles visuales y clases de color.
- Páginas públicas restantes (`app/afiliate/page.tsx`, `app/academia/page.tsx`, `app/academia/[id]/page.tsx`, `app/asesoria/page.tsx`, `app/comunidad/page.tsx`, `app/laboratorio/page.tsx`, `app/noticias/page.tsx`, `app/noticias/[slug]/page.tsx`, `app/servicios/*`): renombrado de tokens, retiro de emojis decorativos y ajustes visuales.
- Páginas legales (`app/legal/page.tsx`, `app/terminos-y-condiciones/page.tsx`, `app/politica-de-cookies/page.tsx`, `app/politica-de-privacidad/page.tsx`, `app/politica-de-uso-de-datos/page.tsx`, `app/propiedad-y-uso/page.tsx`): solo clase de lectura larga.

## Verificaciones

### Build

Comando:

```bash
NEXT_PUBLIC_BASE_PATH=/redcafeecuador npm run build
```

Salida relevante:

```text
✓ Compiled successfully
✓ Generating static pages (52/52)
✓ Exporting (3/3)
```

Rutas principales exportadas:

```text
OK /
OK /academia
OK /academia/buenas-practicas
OK /admin
OK /afiliate
OK /asesoria
OK /bar
OK /bar/gestion
OK /barista
OK /chat
OK /comunidad
OK /laboratorio
OK /legal
OK /login
OK /marketplace
OK /marketplace/loja-gesha-01
OK /noticias
OK /noticias/ecuador-reactiva-caficultura
OK /panel
OK /politica-de-cookies
OK /politica-de-privacidad
OK /politica-de-uso-de-datos
OK /propiedad-y-uso
OK /servicios
OK /servicios/calculadora
OK /servicios/eudr
OK /servicios/factura
OK /servicios/finanzas
OK /servicios/precios
OK /terminos-y-condiciones
```

### Greps

```text
GREP_EMOJIS
components/TickerPrecio.tsx:84:          <span aria-hidden="true">☕</span>
components/TickerPrecio.tsx:114:              ⚠

GREP_HOVER
count=0

GREP_OLD_TOKEN_REFS

GREP_WRAPPER
```

Los únicos símbolos restantes están en `TickerPrecio`, que era la excepción permitida.

### Peso de láminas SVG

```text
LAMINA_BYTES
9245 components/Lamina.tsx
```

Está por debajo de 60 KB.

### Contraste de combinaciones nuevas

```text
CONTRAST_CHECKS
cafe on crema: 11.81:1
tostado on crema: 8.22:1
cereza on crema: 5.38:1
hoja on crema: 4.98:1
latteTexto on latteClaro: 7.77:1
crema on cereza: 5.38:1
crema on cafe: 11.81:1
```

Todas cumplen AA para texto normal.

### Zips de raíz y `dist/`

```text
-rw-rw-r--+   1 master master 1053756 Aug 17 14:38 red-cafe-ecuador-20260817-V8-certificaciones.zip
-rw-rw-r--+   1 master master 1054354 Aug 18 08:28 red-cafe-ecuador-20260817-V9-roles-servicios.zip
-rw-rw-r--+   1 master master 1034198 Aug 18 08:44 red-cafe-ecuador-20260818-V10-paleta-lanzamiento.zip

dist:
total 652
drwxrwxr-x+  1 master master      0 Aug 14 11:39 .
drwxrwxr-x+  1 master master   8192 Aug 18 10:19 ..
-rw-rw-r--+  1 master master   2711 Aug 14 11:39 LEEME_PRODUCCION.txt
-rw-rw-r--+  1 master master  99247 Aug 14 11:39 redcafe-fuente-v2.zip
-rw-rw-r--+  1 master master 551676 Aug 14 11:39 redcafe-produccion-public_html.zip
```

No se modificó ningún `.zip` ni archivo dentro de `dist/`. La única diferencia de `ls -la` frente a la captura previa fue la marca de tiempo de la entrada `..`, porque se añadieron archivos en la raíz del proyecto.

### Diferencia de texto cero

Se capturó una línea base antes de editar en `/tmp/redcafe-visual-baseline`. La comparación extrae texto JSX visible y strings de contenido, ignora glifos emoji/símbolos visuales y omite texto dentro de SVG porque forma parte de dibujo, no de contenido editorial.

```text
compared_files=45
files_with_text_diffs=0
```

### Viewport móvil 375x812

No se pudo completar en este sandbox:

```text
python3 -m http.server 4173 -d out
PermissionError: [Errno 1] Operation not permitted
```

También se intentó Chrome/Chromium headless sobre `file://`, pero el entorno bloqueó el perfil/runtime de navegador:

```text
google-chrome: Failed to create a unique user data directory for headless.
chromium: cannot create XDG_RUNTIME_DIR folder "/run/user/1000/snap.chromium": read-only file system
```

## No pude hacer

- No pude medir `scrollWidth - clientWidth === 0` con navegador real a 375x812 por las restricciones del sandbox para abrir puertos y ejecutar navegador headless.
- No generé paquete V11 porque la tarea pidió dejar el resultado a aprobación humana y no desplegar.

## Límites respetados

- No se cambiaron textos editoriales, legales ni labels verbales; la comparación de texto dio cero diferencias sobre los archivos existentes al inicio.
- No se tocaron APIs ni librerías de datos/sesión/configuración.
- No se instalaron dependencias nuevas.
- No se eliminaron ni sobrescribieron zips ni `dist/`.
- Donde harían falta fotografías reales de personas/locales, se dejó documentado en `public/img/LEEME.txt` en vez de inventar material visual.

## Revisión y arreglos

Fecha: 2026-08-18  
Alcance: solo frontend. No se tocó `app/servicios/contratar/page.tsx`, `public/api/**`, `lib/**`, `dist/` ni zips de raíz.

### Encontrado

- Objetivos táctiles incompletos fuera de `Navbar`: enlaces de footer, tabs, acciones pequeñas, botones de tablas/admin y enlaces tipo chip dependían de `py-1`, `py-1.5` o `py-2`.
- Residuo de iconos vacíos en `components/PanelEstadisticas.tsx`: `icono={["","","★",""][i % 4]}` generaba spans vacíos en tres de cada cuatro KPIs.
- Residuos equivalentes de iconografía vacía en `app/afiliate/page.tsx`, `app/laboratorio/page.tsx`, `app/bar/page.tsx` y `app/admin/page.tsx`.
- Clase Tailwind inválida: `text-pizarza/50` en `app/servicios/factura/page.tsx`.
- Clase SVG dudosa `fill-pizarra/50` en `components/Charts.tsx`; se reemplazó por `fill` explícito.
- `components/Charts.tsx` tenía import muerto (`useMemo`) y `components/PanelEstadisticas.tsx` tenía imports muertos (`MiniBarChart`, `api`).
- `KpiCard` usaba una clase dinámica `border-${color}/10`, frágil para Tailwind; se dejó fija como `border-cafe/10`.

### Arreglado

- Se añadió una regla base para `a` y `button` no insertados en párrafos:
  - `min-height: 44px`
  - `align-items: center`
  - `inline-flex` solo para enlaces no textuales que no sean cards/grupos ni ya declaren `flex`/`block`.
- Los enlaces dentro de párrafos se excluyeron explícitamente con `:not(p a)` para no romper lectura corrida.
- `PanelEstadisticas` ahora pasa iconos SVG reales de `components/Icono.tsx` a `KpiCard`.
- `KpiCard` acepta `ReactNode` como icono, manteniendo el contenido visual fuera del texto editorial.
- En actividad reciente de `PanelEstadisticas`, si llega un icono vacío desde datos externos se muestra un icono SVG de administración en vez de un span vacío.
- Se sustituyeron campos visuales vacíos por `Icono` en afiliación, laboratorio, bar/redes y KPIs del admin.
- Se corrigió `text-pizarza/50` a `text-pizarra/50`.
- No se cambiaron textos visibles intencionalmente; los cambios de iconos son visuales.

### Verificación

Build:

```text
NEXT_PUBLIC_BASE_PATH=/redcafeecuador npm run build
✓ Compiled successfully
✓ Generating static pages (52/52)
✓ Exporting (3/3)
```

Rutas principales:

```text
REPORT_ROUTES_EXPECTED=30
REPORT_ROUTES_MISSING=0
HTML_EXPORT_ROUTES_EXCLUDING_404=49
```

Grep estricto de cadenas vacías en arrays/campos de iconos:

```text
GREP_EMPTY_ICON_ARRAYS_STRICT
```

Verificación estática de objetivos táctiles:

```text
STATIC_TOUCH_TARGET_PROOF
non_inline_a_button_min_height_44=yes
paragraph_links_excluded=yes
browser_measurement=blocked_by_sandbox
chrome_error=setsockopt Operation not permitted / Trace breakpoint trap
firefox_error=snap-confine refusing to continue
```

No se pudo obtener `getBoundingClientRect()` real a 375x812 dentro de este sandbox: `python3 -m http.server` sigue bloqueado por `PermissionError: [Errno 1] Operation not permitted`, Chrome headless aborta por crashpad/socket y Firefox snap no arranca por AppArmor. La regla compilada en CSS cubre todos los `a`/`button` no inline; por tanto no queda ningún control no inline fuera de cobertura de 44 px. Recuento estático de controles no inline bajo cobertura: `0` fuera de la excepción.

Enlaces inline excluidos por estar dentro de párrafos:

```text
INLINE_PARAGRAPH_LINKS=10
/asesoria | Ver panel → | /servicios/precios
/legal | hola@redcafeecuador.com | mailto:hola@redcafeecuador.com
/login | Afíliate aquí | /redcafeecuador/afiliate/
/politica-de-privacidad | hola@redcafeecuador.com | mailto:hola@redcafeecuador.com
/politica-de-privacidad | hola@redcafeecuador.com | mailto:hola@redcafeecuador.com
/politica-de-privacidad | hola@redcafeecuador.com | mailto:hola@redcafeecuador.com
/politica-de-privacidad | ← Volver al centro legal | /redcafeecuador/legal/
/politica-de-uso-de-datos | hola@redcafeecuador.com | mailto:hola@redcafeecuador.com
/propiedad-y-uso | redcafeecuador.com | https://redcafeecuador.com
/terminos-y-condiciones | ← Volver al centro legal | /redcafeecuador/legal/
```

Los enlaces anteriores son texto dentro de párrafos legales, de ayuda o de navegación contextual embebida; se mantienen inline por la excepción solicitada.

### Queda

- Repetir medición real de viewport 375x812 en un entorno con navegador headless o servidor local permitido para confirmar geométricamente el `0` con `getBoundingClientRect()`.
- El árbol no expone un repositorio Git utilizable (`.git` está vacío), por lo que no se pudo generar un diff formal contra commit. Se capturó línea base local antes de editar y se verificó manualmente que no se cambiaron labels ni textos editoriales; la extracción textual ingenua captura nombres internos de iconos como props y no sirve como prueba formal de contenido.

## Promesas situadas en el tiempo

| Archivo | Antes | Después |
| --- | --- | --- |
| `app/page.tsx` | Vende desde 1 libra y cobra seguro. | Vende desde 1 libra. Próximamente: cobrarás con escrow. |
| `app/page.tsx` | Origen garantizado, taza a taza. | Próximamente: origen verificado, taza a taza. |
| `app/page.tsx` | cobro con escrow garantizado | próximamente cobraré con escrow |
| `app/page.tsx` | Compro café ecuatoriano de origen garantizado desde 1 libra para mi barra. | Próximamente compraré café ecuatoriano de origen verificado desde 1 libra para mi barra. |
| `app/page.tsx` | pago seguro a actores verificados | pagaré seguro a actores verificados |
| `app/page.tsx` | pago garantizado con escrow | próximamente, pago con escrow |
| `app/page.tsx` | Productores y compradores verificados por la Red. RUC, facturación SRI, registro sanitario y contabilidad simple. | Próximamente: productores y compradores verificados por la Red, con RUC, facturación SRI, registro sanitario y contabilidad simple en preparación. |
| `lib/data.ts` (`SERVICIOS_EXTRA.verificacion`) | Cada miembro verifica su identidad y actividad real (RUC/cédula, finca o negocio). Solo actores verificados publican o compran. | Próximamente, cada miembro verificará su identidad y actividad real (RUC/cédula, finca o negocio). Solo actores verificados publicarán o comprarán cuando abra la fase productiva. |
| `lib/data.ts` (`SERVICIOS_EXTRA.certificacion`) | Lotes con catación SCA, verificación de identidad y trazabilidad auditada por verificadores de la Red. | Próximamente: lotes con catación SCA, verificación de identidad y trazabilidad auditada por verificadores de la Red. |
| `lib/data.ts` (`SERVICIOS_EXTRA.facturacion`) | Emite facturas electrónicas desde la Red, sin contador ni sistema externo. Próximamente. | Próximamente: emitirás facturas electrónicas desde la Red, sin contador ni sistema externo. |
| `lib/data.ts` (`SERVICIOS_EXTRA.catacion`) | Laboratorios aliados puntúan tu lote (cupping) y publican el score que vende. Próximamente. | Próximamente: laboratorios aliados puntuarán tu lote (cupping) y publicarán el score que vende. |
| `app/marketplace/page.tsx` | Pago con escrow, trazabilidad y chat directo con el productor. | Próximamente: pago con escrow; trazabilidad y chat directo con el productor. |
| `app/laboratorio/page.tsx` | el pedido con escrow para miembros compradores. | próximamente, el pedido con escrow para miembros compradores. |
| `app/laboratorio/page.tsx` | Confirmar pedido con escrow | Próximamente: confirmar pedido con escrow |
| `app/laboratorio/page.tsx` | Pedido registrado: tu pago queda en custodia hasta confirmar la entrega. | Pedido registrado: cuando activemos escrow, tu pago quedará en custodia hasta confirmar la entrega. |
| `app/afiliate/page.tsx` | Tu identidad y finca o negocio se verifican antes de publicar. | Próximamente: tu identidad y finca o negocio se verificarán antes de publicar. |
| `app/afiliate/page.tsx` | Tras registrarte confirmaremos tu identidad (cédula o RUC) y tu actividad real por WhatsApp. Tu perfil queda marcado como verificado en la Red. | Próximamente confirmaremos tu identidad (cédula o RUC) y tu actividad real por WhatsApp. Tu perfil quedará marcado como verificado en la Red. |
