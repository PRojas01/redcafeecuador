# Auditoría posterior al lanzamiento — Red Café Ecuador
**Sitio:** https://solucionespro.net/redcafeecuador/ (paquete V11 ya publicado)
**Fecha:** 18 de agosto de 2026, tarde · **Compara con:** AUDITORIA_REDCAFE_2026-08-18.md (mañana)
**Método:** solo lectura sobre producción y sobre los archivos locales. No se modificó el servidor.

---

## 0. Veredicto

El despliegue funcionó: las 31 páginas responden, el rediseño está arriba, los datos están
protegidos y las APIs nuevas operan. De los quince hallazgos de la mañana, **once quedaron
cerrados y verificados en producción**.

Pero aparecieron **tres problemas nuevos que no existían esta mañana**, dos de ellos con el
sitio ya público, y uno es responsabilidad mía.

| Eje | Mañana | Ahora |
|---|---|---|
| Seguridad | 4/10 | 7/10 |
| Propuesta de valor | 6/10 | 7/10 |
| Monetización | 2/10 | 4/10 |
| Diseño visual | 6/10 | 8/10 |
| Responsive | 8/10 | 9/10 |
| Captación | 1/10 | 8/10 |
| **Privacidad y cumplimiento** | no evaluado | **3/10** |

---

## 1. Lo que quedó cerrado (verificado en el sitio en vivo)

| Comprobación | Resultado |
|---|---|
| `/data/`, `/data/members.json`, `/data/.redcafe_admin_pass`, `/data/.sess/` | **403** |
| `/api/`, `/api/_bootstrap.php` | **403** |
| El ZIP del paquete accesible por URL | **403** en las tres rutas probadas |
| `api/enviar-waitlist.php` | Existe y valida (antes: 404). La captación ya no se pierde |
| `api/stats.php` sin sesión | 401 |
| `api/servicios.php` | Responde con el catálogo |
| Perfil «Proveedor de Equipos e Insumos» | Presente en la portada |
| Promesas marcadas como futuras | 18 apariciones de «Próximamente» |
| Desbordamiento horizontal a 375 px | **0** |
| Controles por debajo de 44 px | **0** |
| Cabeceras de seguridad en las respuestas PHP | nosniff, DENY, HSTS, Referrer-Policy |
| Rendimiento | DOM 773 ms, carga 1.038 ms, gzip activo (148 KB → 24 KB) |

---

## 2. Hallazgos NUEVOS

### N-01 · CRÍTICO · El manual de despliegue quedó publicado
`https://solucionespro.net/redcafeecuador/LEEME_V11.txt` responde **200** a cualquiera.

Es un error mío: escribí ese archivo dentro de `out/`, que es exactamente el directorio que
se publica. Expone:
- la ruta de instalación y el procedimiento de cPanel,
- el aviso de que la contraseña de administrador debe considerarse comprometida,
- **la lista de vulnerabilidades corregidas**, que es un mapa de qué probar en cualquier
  copia antigua del sitio,
- los pendientes de seguridad: que `data/` está dentro del webroot protegido solo por
  `.htaccess`, y que no hay copia de seguridad.

**Acción:** borrar `LEEME_V11.txt` del servidor hoy. El paquete local ya está regenerado sin
él; el texto quedó fuera del ZIP, en `LEEME_V11_INSTRUCCIONES.txt`.

### N-02 · CRÍTICO · El contenido inventado sigue publicado, con el enlace-broma incluido
`api/media.php?action=list` en producción devuelve los seis elementos originales:
**cuatro vídeos apuntando a `dQw4w9WgXcQ`** (el rickroll) y los dos reportajes con nombres
propios inventados, **sin la marca de ejemplo**.

La corrección sí se hizo en el código, pero solo afectaba a `seed_media()`, que únicamente se
usa **cuando `data/media.json` no existe**. El servidor tiene ese archivo desde el 14 de
agosto, así que la semilla nueva nunca se aplicó. Se arregló el molde, no el dato.

Es el peor momento posible: el sitio acaba de lanzarse y cualquiera que pulse un vídeo del hub
recibe la broma.

**Acción:** editar o borrar `data/media.json` en el servidor. Si se borra, la API lo regenera
con la semilla ya corregida.

### N-03 · ALTO · Cookies de seguimiento sin consentimiento
La portada carga `https://img1.wsimg.com/traffic-assets/js/tccl.min.js` —analítica de
GoDaddy, inyectada por el hosting, no por este proyecto— y deja tres cookies con
identificador persistente: `_tccl_visitor`, `_tccl_visit`, `_scc_session`.

**No hay ningún banner ni mecanismo de consentimiento**: se instalan al cargar. La única
mención a cookies es el enlace del pie a la política.

Esto choca con la LOPDP ecuatoriana, que exige consentimiento para tratamientos no
necesarios, y de lleno con el RGPD — relevante porque el argumento EUDR apunta justamente a
compradores europeos. Además la política de privacidad no declara a GoDaddy como tercero
que recibe datos de navegación.

**Acción:** desactivar la analítica desde el panel de GoDaddy, o añadir consentimiento previo
y declarar el tercero en la política.

---

## 3. Hallazgos que siguen abiertos desde la mañana

| Id | Hallazgo | Estado |
|---|---|---|
| S-10 | Las páginas HTML no llevan cabeceras de seguridad. El servidor solo emite `upgrade-insecure-requests`; faltan CSP real y `X-Frame-Options`, así que las páginas son enmarcables (clickjacking). Las cabeceras están dentro de `<FilesMatch "\.php$">` | Abierto |
| S-05 | `data/` sigue dentro del webroot, protegido solo por `.htaccess`. Hoy responde 403, pero un cambio del WordPress padre lo tumba | Abierto |
| S-07 | Sin token CSRF; `input()` sigue aceptando `$_REQUEST` en escrituras | Abierto |
| Bajo | `api/comunidad.php?action=list` sigue siendo público (200) y devuelve autores y contenido | Abierto |
| — | Sin copia de seguridad automática de `data/` | Abierto |
| — | Sin pasarela de pago: el cobro es por transferencia con confirmación manual | Abierto por decisión |

---

## 4. Diseño y rendimiento tras el rediseño

Mejoró de forma clara: cero desbordamiento, cero controles pequeños, 42 ilustraciones y
iconos vectoriales, y ya no queda ni un emoji haciendo de iconografía.

Dos cosas a vigilar:
- **La portada mide 17.331 px de alto** y su HTML pesa **148 KB** (99 KB antes del rediseño):
  las láminas SVG van en línea. Gzip lo deja en 24 KB en tránsito, así que no es urgente,
  pero acortar la portada sigue pendiente y ahora rinde más que antes.
- **Cero fotografías.** Las láminas cubren lo conceptual; siguen faltando las tres fotos de
  personas y locales. Es lo que separa «se ve bien» de «esto es una empresa real».
- `index.txt` y equivalentes exponen el contenido de cada página duplicado (75 KB en la
  portada). Es el comportamiento normal del exportador, sin riesgo, pero dobla lo servido.

---

## 5. Qué hacer hoy, por orden

1. **Borrar `LEEME_V11.txt`** del servidor.
2. **Arreglar `data/media.json`**: quitar los cuatro `dQw4w9WgXcQ` o borrar el archivo para
   que se regenere.
3. **Cambiar la contraseña de administrador**, si no se hizo ya.
4. **Desactivar la analítica de GoDaddy** o poner consentimiento previo.
5. Añadir las cabeceras de seguridad para HTML en el `.htaccess` (fuera del `FilesMatch`).

---

## 6. Nota sobre el método

El proyecto sigue sin control de versiones, así que esta auditoría se apoya en comparar el
sitio publicado contra los archivos locales y contra el respaldo manual de las 10:01.
Los dos hallazgos críticos de hoy son de la clase que un diff no habría detectado igualmente
—uno vive en el servidor, el otro en un archivo de datos que el despliegue no toca—, pero
conviene decir que la trazabilidad de qué cambió y cuándo depende hoy de respaldos manuales.
