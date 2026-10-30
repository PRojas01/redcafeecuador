# Red Café Ecuador — guía para continuar el trabajo

Plataforma de redcafeecuador.com (cadena de valor del café ecuatoriano). Trabajo en curso:
paso del sitio PHP (GoDaddy, datos en JSON) a un servidor **Node.js + MySQL** en
**GoDaddy Node.js Hosting**, manteniendo el mismo frontend. Estado y pendientes:
**`docs/ESTADO-Y-PENDIENTES.md`** (leer primero).

## Estructura
- `servidor/` — servidor Node 22 (Hono + Prisma + MySQL). Reemplaza `api/*.php` con el mismo
  contrato (`{ok,data}` / `{ok:false,error}`). Módulos en `src/modulos/`, utilidades en `src/lib/`.
- `sitio/` — sitio estático compilado que sirve el servidor (export de Next + capa propia +
  tema «Origen»). Es lo que se ve en producción.
- `public_html/` — copia del sitio PHP de producción (fuente de la capa propia; le falta `_next/`).
- `plataforma_cafe/` — código React (Next). `qa/` — suites de prueba. `docs/` — informes.
- Raíz: `package.json` + `arrancar.cjs` para que GoDaddy haga `npm install` / `npm start`.

## Comandos (en `servidor/`)
- `npm ci && npm run build` · `npm test` (vitest) · `npm run typecheck`
- `npm run db:push` — crea/actualiza tablas y las pasa a utf8mb4_bin
- `npm run importar -- <carpeta data/> [--aplicar]` — importador (simula sin `--aplicar`)
- `./paridad.sh <puerto> <sitio> qa/<script>` — suites qa/ contra el servidor (MySQL local, base `redcafe_test`)

## Reglas
- **Nunca** subir `data/`, `uploads/`, `.env*`, `.redcafe_admin_pass`, secretos ni datos
  personales de miembros. La `REDCAFE_CLAVE_DATOS` de producción no se cambia jamás (cifra cédulas).
- Antes de cada push: `node herramientas/vigilar-datos.mjs` (también corre en GitHub). No
  versionar `.zip`, volcados `.sql` (salvo los dos esquemas de `servidor/prisma/`) ni datos.
- No probar contra producción; todo en local.
- Commit y push solo cuando el propietario lo pida; rama de trabajo `plataforma-node`.
- Diseño: mantener la estructura; solo colores, tipografía y animaciones. Fuente del tema en
  `sitio/redcafe-tema-origen.css`; se añade al final de `sitio/redcafe-v60-final.css` (no
  añadir `<link>` nuevos al HTML: rompe la hidratación de React, error #418).
- Los scripts de la capa propia no deben tocar el DOM antes de que React hidrate
  (`window.__redcafeReactListo()` en `redcafe-v60-final.js`).
- Cualquier cambio de colores debe mantener contraste AA (≥ 4,5:1).
