# ¿Puede Red Café Ecuador ser 100% compatible con WordPress?
**Fecha:** 18 de agosto de 2026 · **Evaluación técnica con datos del proyecto y del servidor real**

---

## 1. Lo primero: «compatible» significa tres cosas distintas

Conviene separarlas, porque el coste va de días a meses según cuál se quiera:

| Lectura | Qué implica | Estado |
|---|---|---|
| **A · Convivir** con el WordPress del dominio | La plataforma vive en un subdirectorio y no se estorban | **Ya funciona hoy** |
| **B · Usar WordPress como gestor de contenido** (headless) | WP guarda textos e imágenes; la plataforma los lee por su API | **Viable ya, sin instalar nada** |
| **C · Ser WordPress** (tema o plugin) | Reescribir la plataforma como código de WP | Posible, pero es rehacer el producto |

---

## 2. Lo que hay hoy en el servidor (comprobado)

- `solucionespro.net` **es WordPress**, sobre PHP 8.3.31.
- Su **REST API responde** (`/wp-json/` → 200) y expone `wp/v2`.
- Tiene activadas: contact-form-7, jetpack, code-snippets y **kubio** (constructor visual).
- **No tiene WooCommerce.**
- Ofrece **application passwords**, que es el mecanismo estándar para que una aplicación
  externa escriba en WordPress sin usar la contraseña del usuario.
- Tipos de contenido disponibles: `post`, `page`, **`attachment`** (biblioteca de medios),
  `wp_block`, entre otros.

La plataforma, por su parte: **31 páginas**, **18 componentes**, **10.886 líneas** de TSX,
**30 archivos con estado de cliente**, **19 endpoints PHP** con **3.544 líneas**, y **8
archivos JSON** como almacén. No usa MySQL.

---

## 3. Escenario A · Convivir (ya resuelto)

El `.htaccess` de la plataforma está escrito para vivir dentro de un WordPress padre:
hereda el rewrite, fuerza HTTPS y bloquea `data/`. Funciona hoy en producción.

**Único punto de fricción real:** WordPress inyecta en las páginas de la plataforma el
script de analítica de GoDaddy (`tccl.min.js`) y tres cookies de seguimiento sin
consentimiento previo. Eso no es un problema de compatibilidad, es un problema legal, y
está pendiente en el panel del hosting.

---

## 4. Escenario B · WordPress como gestor de contenido (recomendado)

WordPress guarda los textos y las imágenes; la plataforma sigue siendo la plataforma y los
lee por `wp-json`. No se reescribe nada del producto.

**Qué resuelve, y no es poco:**

- **El editor de contenido que se pidió hoy.** Gutenberg ya existe, está probado, tiene
  revisiones, borradores y programación de publicación. Construir eso a mano cuesta semanas
  y nunca queda tan bueno.
- **Las imágenes.** La biblioteca de medios de WordPress ya hace subida, validación,
  miniaturas y recorte. **Esto es lo importante:** el módulo de subida que estamos
  construyendo ahora mismo introduce en el proyecto la superficie de ejecución remota que
  hoy no tiene. Delegar en WordPress la evita por completo.
- **Usuarios y roles**, si en algún momento se quiere unificar el acceso.

**Qué cuesta:** conectar `contenido.php` a `wp-json/wp/v2/` en lugar de a archivos JSON, y
`Imagen.tsx` a la biblioteca de medios. Días, no semanas, y sin tocar las 31 páginas.

**Qué NO se debe mover a WordPress aquí:** el marketplace, los pedidos, el chat, la
academia y el panel. Son aplicación, no contenido, y meterlos en WP solo añade capas.

---

## 5. Escenario C · Convertir la plataforma en WordPress

Reescribir las 31 páginas como tema y los 19 endpoints como plugin, cambiando el almacén
JSON por tablas MySQL.

**Coste real:** los 10.886 líneas de TSX no se «convierten»: se rehacen. Treinta archivos
dependen de estado de cliente (filtros del marketplace, calculadoras, panel, chat), que en
un tema clásico hay que rehacer en JavaScript plano o volver a montar React encima —en cuyo
caso no se ha ganado nada—. A eso se suma migrar ocho almacenes JSON a tablas y reescribir
la autenticación, el 2FA y los permisos sobre el sistema de usuarios de WP.

**Qué se gana:** un ecosistema de plugins y personal que sabe mantener WordPress.

**Qué se pierde:** el sitio estático actual, que se sirve sin ejecutar nada y por eso es
rápido y con poca superficie de ataque; y se hereda la exposición de WordPress, que es el
blanco automatizado más frecuente de internet. Hoy la plataforma no tiene ni subida de
archivos ni base de datos: eso es una ventaja de seguridad que se regalaría.

**Veredicto:** es posible, pero no es «hacerla compatible». Es construir otro producto.
No lo recomiendo salvo que el objetivo real sea que un tercero que solo sabe WordPress se
haga cargo del mantenimiento.

---

## 6. Recomendación

**Escenario B, y por fases.** En orden:

1. Terminar el módulo de contenido que ya está en marcha, **pero con el almacén detrás
   abstraído**, de modo que mañana pueda apuntar a WordPress sin tocar las páginas.
2. Antes de dar por bueno el módulo de imágenes propio, decidir si se usa la biblioteca de
   medios de WordPress. Es la decisión con más impacto en seguridad de todo el proyecto.
3. Si se decide que sí, conectar contenido e imágenes a `wp-json` con application password.
4. Dejar marketplace, pedidos, academia, chat y panel donde están.

## 7. Lo que esta evaluación no puede afirmar

- No sé qué versión exacta de WordPress corre ni qué plugins de seguridad tiene: la API no
  la expone y no tengo acceso al panel.
- No he probado a escribir en `wp-json` porque requiere credenciales que no tengo, y no voy
  a pedirlas ni usarlas sin que el dueño lo decida.
- El coste del escenario C es una estimación por volumen de código, no un presupuesto.
