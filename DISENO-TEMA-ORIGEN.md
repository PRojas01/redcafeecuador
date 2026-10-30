# Tema «Origen» — guía de estilo de Red Café Ecuador

Mejora visual de octubre 2026. **Mantiene la estructura** de todas las páginas: solo
cambian colores, tipografía y animaciones.

## Por qué
El sitio anterior asignaba el mismo rojo (`#8c1e0e`) a todas sus variables de color
(café, latte, miel, cereza, filtrado…): cabecera, portada, secciones y pie salían del mismo
tono, los botones competían entre sí (amarillo, verde, melocotón) y todo el texto de
botones y tarjetas iba en mayúsculas. Medido: 309 textos bajo el contraste mínimo AA.

## Referencias
Marcas de café de especialidad y plataformas agro: fondo crema, marrón espresso para
texto y superficies oscuras, terracota/cereza solo como acento; títulos serif (calidez y
confianza) con texto sans para datos, precios y formularios.

## Paleta
| Uso | Color |
|---|---|
| Espresso (texto, cabecera, portada, pie) | `#24160F` |
| Tostado (bloques oscuros secundarios) | `#3A2418` |
| Cereza (botones principales, acentos) | `#9B2D1F` |
| Caramelo (detalles, foco) | `#B8762F` |
| Oro (acentos sobre fondo oscuro) | `#E6B873` |
| Crema (fondo) / Papel (tarjetas) | `#F7F2EA` / `#FFFCF7` |
| Hoja (verificado, confianza) | `#2F6B45` |

## Tipografía
- Títulos (h1, h2): **DM Serif Display**.
- Texto, botones, tarjetas, formularios: **DM Sans** (antes caía en la fuente del sistema).
- Ambas alojadas en el sitio (`/fonts`, licencia OFL), sin servicios externos.

## Componentes
- Botones: misma forma en toda la web (esquinas 10 px, sin mayúsculas, peso 600);
  principal en cereza, secundario en contorno; sobre fondo oscuro, oro y contorno claro.
- Tarjetas: papel, esquinas 12 px, sombra suave y elevación al pasar el cursor.
- Etiquetas pequeñas: píldora con texto en versalitas.

## Animaciones
Entrada escalonada de la portada, aparición suave de tarjetas al hacer scroll y
transiciones en botones y enlaces. Todas se desactivan con «reducir movimiento».

## Accesibilidad (medido en píxeles reales, 8 páginas)
Textos bajo AA: **74 → 33** (los restantes son en su mayoría enlaces legales del pie
al límite, 4,43:1, ya corregidos a 0,70 de opacidad). Foco visible en caramelo.

## Archivos
- `sitio/redcafe-tema-origen.css`: fuente del tema (editar aquí).
- Se añade al final de `sitio/redcafe-v60-final.css` (no se toca el HTML: un `<link>`
  nuevo rompía la hidratación de React).
- Se corrigió además una carrera previa: `redcafe-v60-final.js` y `redcafe-afiliate.js`
  modificaban la página antes de que React terminara de hidratarla (error #418
  intermitente). Ahora esperan a React: 0 errores en 48 cargas de 12 páginas.
