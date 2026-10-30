# Brief de rediseño visual — Red Café Ecuador
**Fecha:** 18 de agosto de 2026 · **Base:** AUDITORIA_REDCAFE_2026-08-18.md §4
**Problema a resolver:** el sitio se lee como plantilla generada, y eso descuenta credibilidad justo donde el negocio la necesita (pedir a un desconocido que mande dinero por un saco de café).
**Alcance:** solo capa visual. No se toca el backend PHP, ni las rutas, ni la lógica de datos, ni los textos legales.

---

## Diagnóstico medido (para que el ejecutor sepa qué está corrigiendo)

| Señal | Medición en `app/page.tsx` / `globals.css` |
|---|---|
| Bloque `grid h-12 w-12 place-items-center rounded-xl … text-2xl` + emoji | **10 repeticiones idénticas** |
| Emojis usados como iconografía | **14** |
| `hover:-translate-y-1` (tarjeta que levita) | **11** |
| `rounded-2xl` / `shadow-sm` / `badge` / `text-center` | 13 / 8 / 13 / 15 |
| Composiciones distintas en 16.329 px de página | **1**, repetida 10 veces |
| Imágenes en toda la portada | **0** |
| `h2::after` decorativo | global, **sin una sola excepción** |
| Paleta | monocromía marrón; `--color-esmeralda` vale `#5C3A21` (marrón), `--color-oro` vale `#D9B48F` (beige); `--color-cereza` y `--color-hoja` casi sin uso |

---

## Brief para codex

```
CONTEXTO
Proyecto: /media/master/Datos_3/plataforma_cafe
Next.js 15 con output: "export" (estático), Tailwind v4, tokens en app/globals.css (@theme).
Se despliega en subdirectorio: solucionespro.net/redcafeecuador/

Antes de leer documentación, ejecuta:
  llmgraph context prepare . "rediseño visual de la portada: fotografía, iconos SVG, composiciones y paleta" --max-tokens 3000

OBJETIVO
La portada se percibe como plantilla generada. Hay que romper esa lectura sin rehacer la
maquetación, que es sólida (0 desbordamiento a 375 px, hamburguesa correcta, jerarquía
tipográfica real, foco accesible). El problema no es la ejecución, es el repertorio: una
sola composición repetida diez veces, emojis por iconografía y cero fotografía.

REGLAS INVIOLABLES
- Rama nueva. NO despliegues. Deja el diff para aprobación humana (DevControl).
- NO toques public/api/**, lib/data.ts, ni ninguna página legal (terminos, privacidad,
  cookies, uso-de-datos, propiedad-y-uso).
- NO cambies rutas, nombres de componentes, props ni el flujo de registro.
- NO añadas dependencias nuevas. Los iconos van como SVG propio, no como librería.
- NO inventes hechos, nombres de personas, cifras de tracción ni testimonios. Si un hueco
  necesita contenido real que no existe, deja el marcador y repórtalo.
- Mantén el contraste AA que ya está anotado en los comentarios de globals.css.

TAREAS

1. IMAGEN — láminas SVG dibujadas, no huecos de fotografía
   No hay ni una fotografía de café en el disco, y esperar a tenerlas bloquea el rediseño.
   La imagen se resuelve con ilustración vectorial embebida en el código, en registro de
   grabado de etiqueta de saco: trazo grueso, tramas de líneas en lugar de degradados, sin
   volumen ni brillos, paleta de marca con el cereza y el verde hoja recuperados.
   - Crea components/Lamina.tsx con cinco láminas como componentes SVG inline:
     · FincaTerrazas (16:9) — cordilleras, hileras de cafetos, sol naciente. Fondo del héroe.
     · CerezaMadura (4:5) — rama con hojas en --color-hoja y frutos en --color-cereza.
     · SacoExportacion (4:3) — saco con trama de yute y estarcido RED CAFÉ / ECUADOR · 69 KG /
       LOTE 2026-001, editable como texto vía props.
     · TazaCenital (4:3) — taza vista desde arriba con roseta y ficha de catación al margen
       (puntaje SCA y notas por props).
     · CamasSecado (16:9) — camas africanas en perspectiva con granos. Fondo de la sección
       de confianza.
     Cada una acepta props de proporción y textos, lleva role="img" y aria-label descriptivo,
     y usa los tokens de color, nunca hex sueltos. Define los <pattern> de trama UNA vez en un
     <defs> compartido, no repetidos por lámina.
   - Las láminas NO sustituyen a las personas. Para el retrato de productor y la foto del
     local, deja el hueco con el marcador visible (nombre de archivo y proporción) y
     documenta en public/img/LEEME.txt qué dos o tres fotografías faltan. Un dibujo no
     prueba que detrás hay gente verificada; ahí la fotografía es insustituible.
   - Toda lámina debe poder ser reemplazada por una imagen real sin tocar la maqueta: ese es
     el trabajo del módulo de imágenes editables (brief aparte, más abajo). Usa el mismo
     componente <Imagen slot="..."> en ambos casos.

2. FUERA LOS EMOJIS — set de iconos propio
   Hay 14 emojis haciendo de iconografía (👨‍🌾 🏭 ☕ 🛒 📚 🗂️ 🛡️ 🤝 📸 🎬 📰 💬 🧑‍🌾 📍).
   Renderizan distinto en cada sistema operativo y son el mayor delator de plantilla.
   - Crea components/Icono.tsx: SVG inline, trazo de 1.5, sin relleno, stroke="currentColor",
     24x24, con un icono por concepto (productor, tostador, comprador, marketplace,
     academia, administración, verificación, comunidad, media, noticias, chat, ubicación).
     Dibújalos tú; simples y de peso homogéneo.
   - Sustituye los 10 bloques `grid h-12 w-12 place-items-center rounded-xl bg-… text-2xl`
     que envuelven emojis. Y elimina el patrón: el icono no va dentro de un cuadrado
     redondeado tintado, va suelto sobre el fondo, más pequeño y en color de texto.
   - Los emojis pueden quedarse en el ticker de precios si aportan lectura rápida; en las
     tarjetas, no.

3. TRES COMPOSICIONES, NO UNA REPETIDA DIEZ VECES
   Hoy cada sección ejecuta: píldora centrada → H2 centrado → párrafo centrado → rejilla.
   Diez veces sin excepción. Define tres patrones y altérnalos:
   - A · A sangre completa: fotografía de fondo a ancho total, titular sobre ella, sin
     tarjetas. Úsalo una vez (sección de confianza).
   - B · Asimétrica 60/40: texto a un lado, fotografía al otro; alterna el lado entre
     secciones. Nada de 50/50.
   - C · Cifra o frase dominante: una sola idea grande, alineada a la izquierda, con mucho
     aire y sin rejilla.
   Y rompe el automatismo del adorno: en globals.css el `h2::after` es global. Conviértelo
   en una clase (.titulo-subrayado) y aplícala solo donde aporte, no en los diez H2.

4. QUITAR LA LEVITACIÓN
   11 `hover:-translate-y-1`. Déjalo como máximo en 2, y solo en tarjetas que sean
   realmente clicables y lleven a otra página. En el resto, sustituye el gesto por un
   cambio de color de borde o de fondo, más discreto.

5. RECUPERAR LA TENSIÓN CROMÁTICA
   La paleta v5 colapsó todo a marrón. Además los nombres de token mienten:
   --color-esmeralda es #5C3A21 (marrón) y --color-oro es #D9B48F (beige).
   - Renombra esos dos tokens a algo que describa su valor real (p. ej. --color-tostado y
     --color-latte), actualizando TODOS los usos. Es renombrado mecánico: verifica que no
     quede ninguna referencia viva a los nombres viejos.
   - Sube el uso de --color-cereza (#9E3F1C) y --color-hoja (#4F6A2F), que ya existen y
     están desaprovechados: cereza para el CTA primario, hoja para señales de verificado y
     estados correctos. El café real es rojo y verde antes de ser marrón.
   - Comprueba el contraste de cada combinación nueva: mínimo 4.5:1 en texto normal.
     No degrades ninguna de las que ya cumplen AA.

6. UN ELEMENTO CON MANO
   Añade una sola imperfección deliberada, hecha a medida, que no pueda salir de una
   plantilla. Elige UNA y hazla bien:
   - textura sutil de saco de yute o de papel en el fondo de una sección (SVG o CSS, muy
     baja opacidad, sin imagen pesada), o
   - un sello de tinta ligeramente torcido ("Origen verificado · Ecuador") como SVG propio.
   Sobria y en un solo sitio. Dos ya serían decoración.

7. QUITAR LA SIMETRÍA ARTIFICIAL DEL TEXTO
   Las tarjetas de perfil tienen todas la misma estructura de tres frases y casi la misma
   longitud; los textos reales son irregulares. Reescribe los textos de las tarjetas que
   queden en la portada con longitudes desiguales: una de cuatro palabras, otra de dos
   frases, otra más larga porque el caso lo pide. Mismo significado, distinto ritmo.
   NO inventes datos, nombres ni cifras: solo reescribe lo que ya se afirma.

VERIFICACIÓN (ejecuta y pega la salida)
- npm run build con NEXT_PUBLIC_BASE_PATH=/redcafeecuador — sin errores ni warnings nuevos.
- Sirve out/ y comprueba en un viewport de 375x812:
  · document.documentElement.scrollWidth - clientWidth === 0 (sin desbordamiento)
  · toda lámina con role="img" y aria-label; todo <img> con alt no vacío
  · ningún enlace ni botón por debajo de 44 px de alto
  · scrollHeight de la portada (dato informativo, para comparar con los 16.329 px de hoy)
- grep de los emojis retirados en app/page.tsx: cero coincidencias.
- grep de 'hover:-translate-y-1': 2 como máximo.
- grep de los nombres de token viejos (esmeralda, oro): cero referencias vivas.
- Peso total de las láminas SVG por debajo de 60 KB sumadas; public/img/ por debajo de 1 MB.

ENTREGABLE
Diff, salida de las verificaciones, y lista de lo que quedó pendiente de material real
(qué fotografía falta y dónde va). NO despliegues: espera aprobación humana.
```

---

---

## Brief para codex — Módulo de imágenes editables

> Backend. **Revisión estrecha antes de aprobar**: hoy el proyecto no tiene ninguna subida de archivos, y por eso no tiene superficie de ejecución remota. Este módulo la introduce. Es la vulnerabilidad más común en hosting PHP compartido, así que las reglas de validación no son negociables.

```
CONTEXTO
Proyecto: /media/master/Datos_3/plataforma_cafe
Frontend Next.js con output: "export" (estático) + APIs PHP en public/api, GoDaddy cPanel.

Antes de leer documentación, ejecuta:
  llmgraph context prepare . "módulo de subida y edición de imágenes por slot, con permisos por rol" --max-tokens 3000

OBJETIVO
Que el dueño de la plataforma pueda cambiar desde el panel admin las imágenes de la
portada y sus elementos, y que cada miembro pueda poner las suyas (su perfil, sus lotes,
su local) sin tocar código ni FTP. Mientras un hueco no tenga imagen subida, se sigue
mostrando la lámina SVG dibujada: nunca debe verse un roto.

REGLAS INVIOLABLES
- Rama nueva. NO despliegues. Diff para aprobación humana (DevControl).
- NO cambies el flujo de registro, login ni 2FA.
- NO uses librerías nuevas. GD viene con PHP en GoDaddy.
- Cada punto de la sección SEGURIDAD es obligatorio. Si alguno no se puede cumplir en este
  hosting, PARA y repórtalo en vez de buscar un rodeo.

DISEÑO

1. CATÁLOGO DE HUECOS (slots)
   public/data/slots.json (nuevo), definido por el código, no por el usuario. Cada entrada:
     { "id":"hero-finca", "nombre":"Fondo del héroe", "proporcion":"16:9",
       "ancho_max":1600, "ambito":"plataforma", "lamina":"FincaTerrazas" }
   Ámbitos: "plataforma" (solo admin), "perfil" (el dueño de ese perfil), "lote" (el dueño
   del lote), "local" (el bar dueño).
   La proporción es obligatoria y fija: así cambiar una imagen nunca descuadra la maqueta.

2. ALMACÉN
   data/imagenes.json mapea slot ocupado -> archivo, con quién subió y cuándo. Añade
   'imagenes' y 'slots' a ALLOWED_DATA_NAMES en _bootstrap.php.
   Los archivos van a public/uploads/ (NO a data/, que está bloqueado por .htaccess y no
   podría servirlos).

3. API public/api/imagenes.php (nuevo)
   - action=map      público, sin sesión: devuelve { slot: url } de los slots ocupados.
                     Cacheable. Es lo único que consume el frontend estático.
   - action=subir    requiere sesión; comprueba permiso según el ámbito del slot.
   - action=borrar   idem; borra por id registrado en imagenes.json, NUNCA por una ruta
                     que venga del cliente.
   - action=listar   admin: inventario completo con peso y fecha.
   PERMISOS: ámbito "plataforma" exige !empty($_SESSION['admin']). Los demás exigen que el
   solicitante sea el DUEÑO del recurso. Comprueba la propiedad leyendo el recurso del
   almacén, nunca fiándote de un id de dueño que venga en la petición.
   Aviso: en comunidad.php la autorización de borrado quedó invertida por un problema de
   precedencia en un array_filter. No repitas ese patrón: escribe la comprobación como una
   guarda explícita al principio de la acción, con fail(..., 403) y return.

4. SEGURIDAD DE LA SUBIDA — obligatorio, en este orden
   a. Rechaza si $_FILES['archivo']['error'] !== UPLOAD_ERR_OK.
   b. Tamaño máximo 2 MB, comprobado en servidor.
   c. Tipo real con finfo_file(FILEINFO_MIME_TYPE) Y con getimagesize(). Whitelist estricta:
      image/jpeg, image/png, image/webp. NUNCA te fíes de la extensión ni del Content-Type
      que manda el navegador.
   d. REENCODA SIEMPRE la imagen con GD (imagecreatefromjpeg/png/webp -> imagejpeg o
      imagewebp) y guarda el resultado, descartando el archivo original. Esto destruye
      cualquier carga útil escondida en los metadatos, que es el ataque clásico.
   e. Redimensiona al ancho_max del slot y recorta a su proporción.
   f. Nombre generado por el servidor: uid() . '.jpg'. El nombre del cliente no se usa
      jamás, ni siquiera saneado.
   g. Guarda con permisos 0644 en public/uploads/.
   h. check_rate_limit('subir_imagen', 20, 3600).
   i. Cuota: máximo 30 imágenes por miembro.
   j. Crea public/uploads/.htaccess con:
        php_flag engine off
        <FilesMatch "\.(php|phtml|phar|cgi|pl|py|sh|htaccess)$">
          Require all denied
        </FilesMatch>
        Options -Indexes -ExecCGI
        AddHandler cgi-script .php .phtml .phar
        RemoveHandler .php .phtml .phar
      Y verifica en el servidor que un .php dentro de uploads/ NO se ejecuta. Si se ejecuta,
      PARA: el módulo no puede salir a producción.

5. FRONTEND
   - components/Imagen.tsx: recibe slot, alt y la lámina de reserva. En el primer render
     pinta la lámina SVG; en cliente consulta una sola vez api/imagenes.php?action=map
     (cachéalo en memoria para toda la página, no una petición por imagen) y, si el slot
     está ocupado, cambia a <img> con width/height y aspect-ratio del catálogo, para que no
     haya salto de layout.
   - Panel admin: nueva pestaña "Imágenes" con la rejilla de slots de ámbito plataforma,
     vista previa, botón de sustituir y de restaurar la lámina.
   - Panel de miembro: en su perfil y en cada lote, el mismo control, limitado a lo suyo.
   - El control muestra siempre la proporción esperada y el peso máximo antes de subir.

VERIFICACIÓN (ejecuta y pega la salida)
- php -l en cada .php nuevo o tocado.
- Con PHP local (php -S localhost:8080 -t public):
  · subir un JPG válido -> ok, y el archivo guardado pesa menos que el original
  · subir un .php renombrado a .jpg -> rechazado
  · subir un JPG con PHP embebido en los metadatos -> aceptado pero el reencodado lo
    elimina; comprueba que el archivo final no contiene la cadena '<?php'
  · subir 3 MB -> rechazado
  · pedir action=subir sobre un slot de ámbito plataforma sin sesión admin -> 403
  · pedir action=borrar sobre la imagen de OTRO miembro -> 403
  · action=map sin sesión -> 200
- Confirma que un archivo .php colocado a mano en public/uploads/ no se ejecuta.

ENTREGABLE
Diff, salida de las verificaciones, y una nota explícita sobre si el punto 4.j quedó
verificado en el hosting real o solo en local. NO despliegues.
```

## Lo que este brief no puede resolver

- **Las dos o tres fotografías de personas.** Las láminas SVG cubren lo conceptual — cereza, saco, taza, secado —, pero no la cara de un productor ni el interior de un local. Un dibujo no prueba que detrás hay gente verificada. Esas fotos siguen siendo trabajo de campo, no de código.
- **La dirección de marca.** Si en algún momento hay presupuesto para un diseñador, los puntos 3, 5 y 6 son los que más ganarían con una mano humana. El brief los deja resueltos de forma competente, no autoral.
- **Validar que funcionó.** La única prueba real es enseñar el antes y el después a cinco personas del sector y preguntar cuál les parece una empresa. Esa medición la hace el dueño, no el agente.
