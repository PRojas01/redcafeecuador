# Conectar la plataforma con tu WordPress
**Fecha:** 18 de agosto de 2026 · Aplica la recomendación de EVALUACION_WORDPRESS.md

La plataforma ya sabe hablar con WordPress. Está **apagado por defecto**: sin configurar
nada, todo funciona como hasta ahora, con los archivos locales. Encenderlo es crear un
archivo.

---

## Qué se gana

- **Editas los textos en Gutenberg**, con borradores, revisiones y programación de
  publicación. Sin construir un editor a mano.
- **Usas la biblioteca de medios que ya tienes**: 116 imágenes disponibles hoy, con subida,
  miniaturas y recorte ya resueltos.
- **No añadimos subida de archivos propia**, que es la vía de ataque más común en hosting
  compartido. Esta es la razón de más peso de las tres.

Lo que NO se mueve a WordPress: marketplace, pedidos, academia, chat y panel. Son
aplicación, no contenido.

---

## Paso 1 · Crear una contraseña de aplicación (2 minutos)

1. Entra en `https://solucionespro.net/wp-admin/`
2. Usuarios → tu usuario → abajo del todo, **Contraseñas de aplicación**
3. Nombre: `Red Café Ecuador`
4. Pulsa **Añadir**. WordPress muestra una clave de 24 caracteres **una sola vez**.

No es tu contraseña de WordPress: es una clave aparte, revocable cuando quieras desde esa
misma pantalla, sin cambiar tu acceso.

## Paso 2 · Crear el archivo de configuración

En `public_html/redcafeecuador/data/`, crea `.wp.json` con este contenido:

```json
{
  "base": "https://solucionespro.net",
  "usuario": "tu-usuario-de-wordpress",
  "app_password": "la clave de 24 caracteres"
}
```

Ese archivo queda dentro de `data/`, que el `.htaccess` bloquea: devuelve 403 y nunca se
sirve por web. Aun así, no lo copies a ningún respaldo público — recuerda el incidente de
los ZIP accesibles en este mismo dominio.

## Paso 3 · Comprobar

Abre `https://solucionespro.net/redcafeecuador/api/cms.php?action=estado`

Debe responder `"origen":"wordpress"` y `"wp_responde":true`.
Si dice `local`, el archivo no está donde debe o el JSON tiene un error de sintaxis.

---

## Cómo se comporta

| Situación | Qué hace la plataforma |
|---|---|
| Sin `.wp.json` | Usa los archivos locales. Igual que hoy |
| Con `.wp.json` y WordPress respondiendo | Toma de WordPress las noticias y la biblioteca de medios |
| Con `.wp.json` pero WordPress caído | **Vuelve sola a los archivos locales.** El sitio no se cae |
| WordPress sin entradas publicadas | Usa el contenido local. No deja secciones vacías |

Las respuestas se guardan cinco minutos en caché, así que la portada no depende de la
latencia de WordPress en cada visita.

---

## Solo lectura, de momento

Hoy el adaptador **lee** de WordPress. Escribir desde el panel de la plataforma hacia
WordPress es el paso siguiente y necesita la contraseña de aplicación del paso 1.

Se hace así a propósito: primero comprobamos que la lectura funciona con tu contenido real,
y solo después damos permiso de escritura. Al revés es como se rompen las cosas.

---

## Si prefieres no depender de WordPress

Es una postura legítima: hoy la plataforma es estática y no depende de nadie. Basta con no
crear `.wp.json` y todo sigue igual. En ese caso, para editar imágenes habrá que terminar
el módulo de subida propio, con las diez reglas de seguridad del brief — y asumiendo que
eso introduce en el proyecto una superficie de ataque que hoy no tiene.
