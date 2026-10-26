# redcafeecuador — Red Café Ecuador


Conexión de la cadena de valor del café ecuatoriano.
Plataforma de redcafeecuador.com. El servidor nuevo (Node.js + MySQL) está en
[`servidor/`](servidor/) y se publica según [`servidor/DESPLIEGUE.md`](servidor/DESPLIEGUE.md).

## Área de trabajo (sitio estático + capa propia)

Copia de trabajo para corregir y mejorar **el sitio actual** (export estático de
Next.js + PHP en GoDaddy) sin tocar el árbol que se sincroniza con el NAS
(`Proyectos/Redcafeecuador.com/`). Nada de aquí sube solo a producción.

| Carpeta | Qué es |
|---|---|
| `public_html/` | Producción `20260926h` (respaldo del 28-sep) **sin `data/` ni `uploads/`**, más las correcciones PHP/.htaccess. Fuente de verdad de la capa propia. |
| `plataforma_cafe/` | Código React (copia de `Redcafeecuador.com/plataforma_cafe`, sin `node_modules`, secretos ni fotos). |
| `staging-<versión>/` | Resultado de la fusión: lo que se empaquetaría. Se regenera, no se edita a mano. |
| `local/` | Despliegue local con PHP real (`levantar.sh`, `router.php`). `local/sitio/` es desechable. |

## Flujo

```bash
python3 plataforma_cafe/herramientas/tema-stradale-capa.py public_html   # idempotente
cd plataforma_cafe && npx next build && cd ..
python3 plataforma_cafe/herramientas/fusionar-capa-propia.py \
  plataforma_cafe/out public_html <version> staging-<version>
local/levantar.sh staging-<version> 8990      # requiere PHP
```

`fusionar-capa-propia.py` falla (exit 1) si alguna ruta no queda con la misma
capa propia que producción, si una página referencia un chunk inexistente o si
queda alguna versión vieja. No empaquetar si falla.

## Reglas

- Datos reales de usuarios: **nunca** en esta carpeta. Local usa `data/` vacío
  (la API siembra demostración) y cuentas de prueba creadas por la API.
- `data/` y `uploads/` jamás van en un paquete.
- Todo cambio de JS/CSS requiere versión nueva (se sirven `immutable` a 1 año);
  la fusión la aplica en páginas, `sw.js`, `redcafe-version.json` y `VERSION`.

## Diseño: identidad Stradale (Starter V0.1)

Aplicada el 28-sep a partir de `Project Files/Red_Cafe_Ecuador_Starter_V0.1`
(referencia ejecutable en `referencia-starter/`, `localhost:3200`, BD local vacía).

- React: tokens de `plataforma_cafe/app/globals.css` remapeados por rol
  (verde bosque `#18251F`, crema `#F7F4EF`, caramelo `#CA8E46`, acento sobre
  crema `#8A5A22`), DM Sans vía `next/font` en `app/layout.tsx`, botones rectos
  en mayúsculas, titulares ligeros.
- Capa propia: `herramientas/tema-stradale-capa.py` sustituye los colores del
  tema «Origen» por rol en `redcafe-v60-final.css` y 5 `redcafe-*.js`, y añade
  al final de la hoja el bloque «Tema Stradale».
- Contraste AA verificado: texto verde sobre caramelo (5,6:1), no blanco (2,8:1).
- Revertir: originales en el respaldo de la sesión y `git diff` cuando se versione.
