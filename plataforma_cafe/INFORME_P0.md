# Informe P0 - auditoria redcafe

Fecha: 2026-08-20

## Cambios realizados

### `app/servicios/precios/page.tsx`
- Sustituido el `fetch` relativo en tiempo de compilacion por una pagina server que entrega datos sembrados desde `public/data/precios-cache.json`.
- Agregada metadata descriptiva del panel de precios.

### `app/servicios/precios/ClientPage.tsx`
- Nueva vista cliente del panel de precios.
- Al montar, solicita el dato fresco con `CONFIG.api("/api/precios.php?action=list")`.
- Si la peticion falla, conserva el valor sembrado y muestra: "La actualizacion en tiempo real esta temporalmente indisponible."
- La pagina nunca queda sin precio.

### `public/data/precios-cache.json`
- Actualizado con el valor confirmado en produccion el 2026-08-20:
  - `valor`: 363.4
  - `unidad`: `USD/quintal`
  - `updated_human`: `Actualizado 2026-08-20 11:01 UTC`

### `components/Footer.tsx`
- Sustituido el texto global del footer por:
  - "Todo el cafe ecuatoriano, conectado."
  - "Productores, compradores, tostadores, cafeterias, proveedores y profesionales en una misma Red."
- Cambiado el enlace global de "El Moral Bar / Cafeteria" a "Red Cafe Bar".

### `app/layout.tsx`
- Cambiado el title base, Open Graph y Twitter title a:
  - `Red Café Ecuador | Todo el café ecuatoriano, conectado`

### `app/servicios/calculadora/page.tsx`
- Convertido en wrapper server para poder exportar metadata propia.

### `app/servicios/calculadora/ClientPage.tsx`
- Movido el contenido cliente existente.
- Agregada documentacion visible:
  - `Quintal = 100 lb = 45,36 kg; saco de exportacion = 60 kg.`
- Corregida la conversion de sacos equivalentes a `(quintales * 45.36) / 60`.

### `app/servicios/eudr/page.tsx`
- Convertido en wrapper server con metadata descriptiva propia.

### `app/servicios/eudr/ClientPage.tsx`
- Movido el contenido cliente existente sin redisenar la herramienta.

### `app/servicios/factura/page.tsx`
- Convertido en wrapper server con metadata descriptiva propia.

### `app/servicios/factura/ClientPage.tsx`
- Movido el contenido cliente existente sin redisenar la herramienta.

### `app/servicios/finanzas/page.tsx`
- Convertido en wrapper server con metadata descriptiva propia.

### `app/servicios/finanzas/ClientPage.tsx`
- Movido el contenido cliente existente sin redisenar la herramienta.

### `app/servicios/contratar/page.tsx`
- Convertido en wrapper server con metadata descriptiva propia.
- Agregado fallback HTML sembrado para rastreadores con titulo del servicio, precio referencial, descripcion y CTA.
- El formulario sigue siendo cliente.

### `app/servicios/contratar/ClientPage.tsx`
- Movido el contenido cliente existente.
- Cambiado el POST del formulario a `CONFIG.api("/api/servicios.php?action=solicitar")`.

### `public/data/contenido-recetas.json`
- Corregido: "la base de los bebidas de maquina" por "la base de las bebidas preparadas con maquina espresso".

### `public/data/_semilla/contenido-recetas.json`
- Aplicada la misma correccion ortografica en la semilla.

## Verificacion

- `npx tsc --noEmit`: sin errores.
- `NODE_OPTIONS="--max-old-space-size=6144" npm run build`: sin errores.
- Next reporto `Generating static pages (59/59)`.
- El export final contiene 57 rutas HTML publicas con `index.html`.
- Verificado en `out/servicios/precios/index.html`: el HTML servido incluye `$363.40` y no incluye el mensaje horneado anterior.
- Verificado en `out/servicios/contratar/index.html`: el HTML servido incluye servicio, precio, descripcion y CTA sin depender de JavaScript.

## No realizado

- No se tocaron `app/page.tsx`, paginas legales ni contenido de noticias, por instruccion expresa.
- No se cambio `public/manifest.json`, aunque conserva el tagline anterior, porque la auditoria pidio el texto del footer y no el manifiesto.
