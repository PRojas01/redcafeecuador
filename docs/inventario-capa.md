# Inventario de la capa propia (6-nov-2026, versión 20261106j)

Generado leyendo `sitio/` (qué páginas cargan cada script, cuántas veces oculta
bloques de React y qué API llama). «Ocultos» cuenta apariciones de
`data-redcafe-oculto-react` o `style.display = "none"` en el código: es una pista
de dónde la capa tapa a React, no un número exacto de bloques.

| Script | Tamaño | Páginas que lo cargan | Ocultos | API |
|---|---|---|---|---|
| redcafe-academia.js | 76 KB | 11 (/academia, /academia/buenas-practicas, /academia/cafe-especial, /academia/exportacion…) | 3 | auth, cursos, uploads |
| redcafe-admin-difusion.js | 23 KB | 1 (/admin) | 0 | difusion |
| redcafe-admin-respaldos.js | 8 KB | 1 (/admin) | 0 | respaldo |
| redcafe-admin-servicios.js | 14 KB | 2 (/admin, /panel) | 0 | auth, marketplace-servicios |
| redcafe-admin-verificaciones.js | 14 KB | 2 (/admin, /panel) | 0 | auth, identidad, verificaciones |
| redcafe-aviso-pedidos.js | 10 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 0 |  |
| redcafe-bandeja.js | 16 KB | 1 (/panel) | 0 | auth, bandeja, chat |
| redcafe-busco-empleo.js | 18 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 0 | auth, busco-empleo |
| redcafe-colapsables.js | 12 KB | 2 (/admin, /panel) | 0 |  |
| redcafe-conversion.js | 37 KB | 63 (/, /404, /academia, /academia/buenas-practicas…) | 17 | auth, marketplace-servicios, metricas |
| redcafe-cursos-autor.js | 21 KB | 1 (/panel) | 0 | cursos |
| redcafe-empleos.js | 23 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 0 | auth, empleos |
| redcafe-fusion.js | 3 KB | 51 (/, /404, /admin, /afiliate…) | 0 |  |
| redcafe-guias-contenido.js | 21 KB | 1 (/panel) | 0 |  |
| redcafe-guias.js | 19 KB | 1 (/panel) | 0 | guias |
| redcafe-mejoras-ui.js | 6 KB | 63 (/, /404, /academia, /academia/buenas-practicas…) | 0 |  |
| redcafe-menu.js | 5 KB | 30 (/404, /legal, /marketplace/ficha, /marketplace/loja-gesha-01…) | 0 | auth |
| redcafe-notificaciones.js | 15 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 0 | auth, notificaciones |
| redcafe-panel-publicaciones.js | 91 KB | 1 (/panel) | 3 | auth, identidad, lotes, marketplace-servicios, members, pedidos, uploads |
| redcafe-panel-unico-salir.js | 1 KB | 0 () | 0 |  |
| redcafe-push.js | 9 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 0 | auth, push |
| redcafe-recordatorios.js | 12 KB | 0 () | 0 | recordatorios |
| redcafe-referencia.js | 2 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 0 |  |
| redcafe-registro-actividad.js | 10 KB | 1 (/panel) | 0 | actividad, auth |
| redcafe-reportes.js | 14 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 0 | auth, reportes |
| redcafe-requerimientos.js | 29 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 0 | auth, requerimientos, uploads |
| redcafe-ruta.js | 6 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 1 |  |
| redcafe-sesion.js | 3 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 0 |  |
| redcafe-socios.js | 4 KB | 2 (/admin, /panel) | 0 | auth, socios |
| redcafe-v60-final.js | 41 KB | 63 (/, /404, /academia, /academia/buenas-practicas…) | 7 | auth, pedidos |
| redcafe-v60-mejoras-obligatorias.js | 27 KB | 63 (/, /404, /academia, /academia/buenas-practicas…) | 7 | lotes, pedidos, servicios |
| redcafe-volver-panel.js | 1 KB | 62 (/, /404, /academia, /academia/buenas-practicas…) | 0 | auth |

## Notas
- `redcafe-recordatorios.js` no está en ninguna página: lo carga `redcafe-notificaciones.js`.
- `redcafe-panel-unico-salir.js` no lo carga nada: se puede borrar ya.
- Los que más ocultan React: `redcafe-conversion.js` (17), `redcafe-v60-final.js` (7),
  `redcafe-v60-mejoras-obligatorias.js` (7). Son los primeros a pasar a React.
- Hecho: carrusel y collage de la portada ya en React (`components/PortadaFotos.tsx`).
- 13 scripts van en todas las páginas: son la «base común» de la fase 1.
- 7-nov (20261107a): borrados `redcafe-menu.js` y `redcafe-v60-mejoras-obligatorias.js`
  (solicitar/contactar lote, mapa, chat con Enter y menú «Más» ya en React).
  `redcafe-mejoras-ui.js` solo limpia cachés. Login: tarjeta de registro en React.
- Siguiente fase: panel. «Pedidos» y «Lo que cambia para ti» (redcafe-v60-final.js)
  sirven de ancla a 12 módulos que se colocan antes o después de ellos dentro de
  `<main>`; hay que darles a todos un hueco propio antes de pasarlos a React.
