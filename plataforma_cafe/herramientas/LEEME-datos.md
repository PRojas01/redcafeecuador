# Por qué `data/` no vive en `public/`

`next build` copia todo lo que hay en `public/` dentro de `out/`. Y en
`public/data/` había una copia **vieja** del directorio de datos: `lotes.json`
con 6 lotes (solo los de demostración), `servicios.json` con los precios
anteriores, más `cursos.json`, `media.json`, una carpeta `_semilla/`, un
`_respaldos/` y hasta las sesiones PHP en `.sess`.

Producción, en cambio, tiene **8 lotes** —dos de ellos de una productora real—,
los siete precios nuevos y más de 20 miembros registrados.

Subir ese `out/` sobre `public_html` habría escrito esos archivos viejos encima
de los reales. Habría borrado los lotes de la productora y devuelto los precios
a como estaban. Ya pasó una vez en este proyecto: un borrado se llevó usuarios y
lotes reales.

Por eso ahora:

1. Los datos de trabajo local están en `datos-locales/`, **fuera de `public/`**,
   donde `next build` no los puede alcanzar.
2. Para probar en local, se copian al build:
   `cp -a datos-locales out/data`
3. El paquete de producción **nunca** incluye `data/`. Los datos reales viven
   solo en el servidor.

**Antes de subir cualquier build, comprobar que no lleva datos:**

    ./herramientas/comprobar-paquete.sh <carpeta-o-zip>
