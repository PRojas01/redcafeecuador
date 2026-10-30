# Migración a redcafeecuador.com — estado y decisiones
**Fecha:** 19 de agosto de 2026 · Diagnóstico sobre el paquete descargado y el dominio en vivo

---

## 1. La migración ya está hecha en su mayor parte

Comprobado en `https://redcafeecuador.com`:

| Pieza | Estado |
|---|---|
| WordPress 7.0.4 en la raíz | funcionando |
| Plataforma en `/plataforma/` | **V15 desplegada**: hero nuevo, «desde 1 libra», Amante del Café, paleta y tipografía nuevas |
| `basePath` del build | correcto (`/plataforma/_next/…`) |
| Canonical y `og:url` | ya apuntan al dominio nuevo |
| `robots.txt` y `sitemap.xml` de la plataforma | responden 200 |
| Tema hijo `redcafe-child` | creado, con plantilla «Home Red Café» |
| Plugin `redcafe-contenido` | creado: CRUD de noticias, cursos, planes y servicios sobre los JSON de la plataforma |
| Fotografías | **19 imágenes reales** en la biblioteca de medios |

Lo de las fotografías merece subrayarse: era el bloqueo que arrastrábamos desde la primera auditoría. Ya no existe.

---

## 2. Lo que falta, por orden de urgencia

### 2.1 El dominio viejo no redirige — riesgo SEO real

`https://solucionespro.net/redcafeecuador/` **sigue devolviendo 200**. Hoy el mismo sitio existe en dos direcciones distintas: Google lo lee como contenido duplicado y reparte la autoridad entre ambas.

Hay que poner una redirección 301 permanente del subdirectorio viejo al nuevo, ruta a ruta. Se hace con un `.htaccess` en `solucionespro.net/redcafeecuador/`:

```apache
RewriteEngine On
RewriteRule ^(.*)$ https://redcafeecuador.com/plataforma/$1 [L,R=301]
```

Sin esto, la migración está a medias y el trabajo de SEO se reparte entre dos sitios.

### 2.2 El home de WordPress existe pero nadie lo ve

Hay una contradicción entre dos decisiones que conviven:

- El `.htaccess` de la raíz redirige `/` a `/plataforma/` con un 301.
- El tema hijo incluye una plantilla «Home Red Café» completa, con hero, perfiles, servicios y confianza.

Ninguna página de WordPress usa esa plantilla —las cinco existentes van con `full-width` o la de por defecto—, así que el trabajo está hecho y apagado.

**Hay que decidir qué es la portada del dominio.** Mi recomendación: **WordPress**, con la plataforma en `/plataforma/`. Motivos:

- El home es marketing puro: se edita a menudo, necesita fotos y SEO. Es exactamente lo que WordPress hace bien.
- La plataforma es aplicación: marketplace, panel, chat. No gana nada siendo una página de WordPress.
- Es la línea que ya aprobaste: WordPress para contenido, la aplicación donde está.

Implica quitar el 301 de la raíz y asignar la plantilla a la página frontal.

### 2.3 El sitemap de la raíz redirige

`/sitemap.xml` devuelve 301. Con WordPress como portada, el sitemap raíz debe ser el de WordPress y el de la plataforma vivir en `/plataforma/sitemap.xml`, declarados ambos en `robots.txt`.

---

## 3. Calidad del home actual

La plantilla funciona, pero repite errores que ya habíamos corregido en la plataforma:

| Problema | Detalle |
|---|---|
| **Emojis como iconografía** | 🌱 y compañía, justo lo que sustituimos por SVG propio |
| **Titular antiguo** | «Compra y vende café ecuatoriano directo…», cuando la plataforma ya usa «Todo el café ecuatoriano, conectado» |
| **Dos identidades** | El home y la plataforma no comparten paleta ni tipografía: se ven como dos sitios distintos |
| **Fotos sin `srcset`** | Se sirve la original completa en móvil |

El home es lo primero que ve alguien que llega por Google o por WhatsApp. Que no se parezca a la plataforma rompe la sensación de un solo producto.

---

## 4. Plan propuesto

**Fase A · Cerrar la migración (urgente, poco esfuerzo)**
1. Redirección 301 del subdirectorio viejo al nuevo.
2. Decidir la portada y quitar el 301 de la raíz si es WordPress.
3. Sitemaps y `robots.txt` coherentes en la raíz.

**Fase B · Home de WordPress a la altura**
4. Rediseñar la plantilla con la identidad de la plataforma: misma paleta, DM Serif Display e Inter autoalojadas, iconos SVG en vez de emojis, titular alineado.
5. Fotografía real de la biblioteca, con tamaños responsivos.
6. Enlaces coherentes hacia la plataforma y hacia la afiliación por perfil.

**Fase C · Mejora visual conjunta**
7. Que home y plataforma compartan sistema visual, para que se perciban como un solo producto.

---

## 5. Lo que no se puede hacer desde aquí

- **Activar la plantilla y la página frontal** requiere entrar en el escritorio de WordPress. Puedo dejar el código listo; asignarla es un clic tuyo en Ajustes → Lectura.
- **La redirección del dominio viejo** hay que subirla al hosting de solucionespro.net, que es otro sitio.
- **No he tocado `wp-config.php`** ni sus credenciales, ni voy a hacerlo.
