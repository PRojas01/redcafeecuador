# Informe multiperfil

Fecha: 2026-08-20

## Resumen

Se implemento el registro y gestion de miembros con varios perfiles manteniendo `rol` como perfil principal. Se agrego `roles` como lista ordenada, siempre con `rol` en primer lugar cuando se escribe, y lectura tolerante para miembros antiguos sin `roles`.

No se ejecuto ninguna migracion de datos ni reescritura de miembros existentes.

## Cambios archivo por archivo

- `public/api/_bootstrap.php`
  - Agregue `ROLES_MIEMBRO`, `MAX_ROLES_MIEMBRO`, `miembro_roles()`, `validar_roles_miembro()` y el helper obligatorio `miembro_tiene_rol(array $m, string $rol): bool`.
  - `sanitize_user()` ahora devuelve `roles` calculado al vuelo para usuarios antiguos sin escribir el JSON.

- `public/api/auth.php`
  - Registro acepta `roles[]`, valida valores, deduplica y corta a tres perfiles.
  - Escribe `rol` como primer perfil y `roles` como lista ordenada.
  - Login, `me` y sesiones devuelven `roles` via `sanitize_user()`.

- `public/api/members.php`
  - Agregue `roles_update` para cambiar perfiles y principal.
  - Valida minimo uno, maximo tres y valores permitidos.
  - Bloquea quitar perfiles con datos colgando: lotes publicados, menu, inventario/movimientos y pedidos asociados.

- `public/api/pedidos.php`
  - Migre autorizacion a `miembro_tiene_rol()`.
  - La lista respeta el perfil solicitado solo si el usuario lo tiene, para que un multiperfil pueda ver bandejas de cada perfil.

- `public/api/menu.php`
  - Migre autorizacion de bar/admin a `miembro_tiene_rol()`.

- `public/api/lotes.php`
  - Migre publicacion, verificacion admin y borrado a `miembro_tiene_rol()`.

- `public/api/inventario.php`
  - Migre la autorizacion por perfiles de inventario a `miembro_tiene_rol()`.

- `public/api/imagenes.php`
  - Migre la validacion de recurso local/bar a `miembro_tiene_rol()`.

- `lib/api.ts`
  - `ApiUser` ahora incluye `roles`.
  - `register()` envia `roles`.
  - Agregue `memberRolesUpdate()`.
  - `Lote` incluye `published_by`.

- `app/afiliate/page.tsx`
  - Paso 1 ahora permite seleccionar de uno a tres perfiles.
  - El primer perfil es principal y puede cambiarse con un clic.
  - El plan por defecto sigue saliendo del principal.
  - No se reintrodujo `Suspense`; los doce perfiles siguen en el HTML servido.

- `app/panel/page.tsx`
  - El panel arma secciones desde la union de `roles`, sin duplicados.
  - El perfil principal queda primero; los grupos secundarios se muestran plegados.
  - Agregue selector de perfil activo en cabecera sin ocultar secciones.
  - Agregue seccion "Mis perfiles" para anadir, quitar y cambiar principal.
  - La catacion rechaza emitir evaluaciones sobre lotes de la propia cuenta.

- `app/chat/page.tsx`
  - La lista de miembros muestra todas las etiquetas de perfil, principal primero.

- `app/admin/page.tsx`
  - Las tablas de miembros muestran `roles` cuando existen.

## Endpoints migrados al helper

- `public/api/pedidos.php`
- `public/api/menu.php`
- `public/api/lotes.php`
- `public/api/inventario.php`
- `public/api/imagenes.php`

Tras la migracion, la busqueda de comparaciones directas de autorizacion contra `$m['rol']` / `$u['rol']` quedo sin resultados. Las referencias restantes a `rol` son escritura, lectura informativa o variables internas, no autorizacion directa.

## No hice

- No elimine ni renombre `rol`.
- No migre ni reescribi miembros existentes sin `roles`.
- No cambie la politica comercial de planes multiperfil, porque la especificacion la deja fuera de alcance.
- No prohibi combinaciones como productor + certificador; solo bloquee el acto de evaluar lotes propios.
- No agregue bloqueo especial para pilador o transportista sobre lotes propios, siguiendo la especificacion.

## Verificacion

- `npx tsc --noEmit`: sin errores.
- `NODE_OPTIONS="--max-old-space-size=6144" npm run build`: sin errores.
- Build exportado: 57 rutas reales en `out/` excluyendo el duplicado tecnico `out/404.html`; Next reporto 59 paginas generadas incluyendo entradas internas/dinamicas.
- `out/afiliate/index.html` contiene los 12 perfiles por nombre:
  Productor, Tostador / Comerciante, Comprador, Bar / Cafeteria, Barista, Verificador / Catador, Proveedor de Equipos e Insumos, Transportista, Pilador / Beneficiadero, Exportador, Amante del Cafe, Asesor Experto.
- `php -l` sin errores en los PHP tocados.

## Puntos de la especificacion que parecen discrepantes

- La especificacion menciona 15 endpoints PHP con comparaciones directas de `rol`. En este codigo, la busqueda encontro comparaciones directas de autorizacion en los endpoints listados arriba; no aparecieron 15 archivos con ese patron. No invente migraciones donde no habia comparacion directa.
- La build de Next informa 59 paginas generadas, pero el conteo de rutas exportadas reales queda en 57 al excluir `out/404.html`, que duplica la ruta 404 tambien emitida como `out/404/index.html`.
