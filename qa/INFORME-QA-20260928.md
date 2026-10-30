# Informe QA — versión 20260928a frente a la publicada (20260926h)

Fecha: 2026-09-28 · Entorno: dos instancias locales idénticas salvo el código
(`local/levantar.sh`, PHP 8.5 con 8 procesos, `data/` vacío con datos de
demostración y cuentas de prueba creadas por la propia API). Cada instancia se
sirve con las reglas de **su propio** `.htaccess` (`local/router.php`).
Ningún dato real de usuarios intervino en las pruebas.

- `:8991` PUBLICADA — respaldo del servidor del 28-sep (`20260926h`), sin cambios.
- `:8990` NUEVA — `staging-20260928a` (build limpio Next 15.5.26 + capa propia fusionada + correcciones PHP/.htaccess).

## 1. API, seguridad e integridad (`qa/qa_api.py`)

**Publicada 18/28 · Nueva 28/28 · Regresiones: 0**

| ID | Prueba | Publicada | Nueva | Evidencia (nueva) |
|---|---|---|---|---|
| SEG-04 | La copia `/Respaldo/` no ejecuta PHP | ❌ 200 | ✅ | 404 |
| SEG-05 | Notas `.md` internas no se sirven | ❌ 200 | ✅ | 404 |
| SEG-06 | `api/_*.php` no accesibles directamente | ❌ 200 | ✅ | 404 |
| SEG-08 | Content-Security-Policy | ❌ ausente | ✅ | `frame-ancestors 'self'; object-src 'none'; …` |
| SEG-09 | Permissions-Policy | ❌ ausente | ✅ | `camera=(), microphone=(), …` |
| SEG-10 | HSTS ≥ 1 año | ❌ 30 días | ✅ | 1 año |
| SEG-12 | Un miembro NO ve cédula/teléfono/correo de otros (listado) | ❌ **3 de 3 expuestos** | ✅ | 0 de 3 |
| SEG-13 | Ídem, ficha individual | ❌ **3 de 3 expuestos** | ✅ | 0 de 3 |
| VAL-01 | No se aceptan pedidos de lotes inexistentes | ❌ 200 | ✅ | 404 |
| CON-01 | 80 escrituras simultáneas sin pérdida | ❌ **19–25 perdidas** (3 corridas) | ✅ | 0 perdidas |
| — | Registro, login, sesión, ficha propia, publicar lote, listado público, pedido, pedido visible al productor, admin, bloqueo de admin a miembros, borrado ajeno (403), fuerza bruta (429), `data/` y `.htaccess` (403), PHP en `uploads/` (403) | ✅ | ✅ | idénticos |

## 2. Navegador: consola, hidratación, navegación (sin y con sesión)

| Comprobación | Publicada | Nueva |
|---|---|---|
| Portada sin sesión: React #418 (hidratación) | ❌ en cada carga | ✅ sin error |
| Navegación interna (`/` → `/quienes-somos/`, login → `/`) | ❌ "Failed to fetch RSC payload", recarga completa | ✅ navegación interna |
| "SCC Library has already been loaded" (en vivo) | ❌ script de GoDaddy 2 veces en 39 páginas | ✅ solo el que inyecta el hosting |
| Cabecera con sesión en `/panel/` y `/marketplace/` | ❌ muestra "Entrar" / "Forma parte de la Red" | ✅ "Mi Red", "Salir", campana |
| Menú móvil con sesión: "Salir" | ❌ ausente (el bug "URGENTE") | ✅ "Mi Red", chat y "Cerrar sesión" |
| Cerrar sesión desde el menú móvil | — | ✅ sesión cerrada, portada sin errores |
| 18 rutas sin sesión + 6 con sesión (panel, marketplace, comunidad, chat, curso, lote) | errores en `/` y navegación | ✅ 0 errores de consola |
| Registro de PHP (`error_log`) durante toda la batería | 0 | 0 |

## 3. Rendimiento de la portada (sin sesión, misma máquina)

| Métrica | Publicada | Nueva |
|---|---|---|
| Peticiones | 46 | 44 |
| JavaScript descargado | 1.040 KB | 914 KB (−12 %) |
| Llamadas a `auth.php?action=me` | 2 | 1 |
| Llamadas a la API | 9 | 8 |

## 4. Hallazgos que siguen abiertos (en ambas versiones)

1. **`/Respaldo/` sigue publicado en el servidor real** (verificado hoy: `/Respaldo/api/auth.php` responde 200). La regla nueva del `.htaccess` lo bloquea al subir el paquete, pero lo correcto es moverlo fuera de `public_html`.
2. El formulario de acceso dice «Mínimo 6 caracteres»; la API exige 8.
3. Marketplace móvil: «Publicar un lote» se ve como texto, sin forma de botón (los otros dos sí).
4. `pedidos.php`: el **total** lo sigue proponiendo el comprador (precio negociable). Finca, productor y lote ya salen del servidor.
5. Decisión a confirmar: la versión nueva **rechaza pedidos a lotes de demostración** («Este es un lote de demostración…»). Evita el riesgo #1 de la auditoría, pero cambia el comportamiento.
6. Integridad: `mutate_json` ya es atómico; quedan ~65 pares `load_json`/`save_json` fuera de él (p. ej. marcar mensajes leídos en `chat.php`) con el mismo riesgo, menor por ser menos frecuentes.
7. PHP local 8.5 frente al de GoDaddy (versión no confirmada): 0 avisos aquí; confirmar la versión del servidor antes de subir.

## 5. Veredicto

La versión `20260928a` **corrige todos los fallos reproducidos de la publicada sin
introducir regresiones** en las pruebas funcionales, de seguridad ni de
navegador. Es apta para subir **tras**: (a) retirar `/Respaldo/` del servidor,
(b) confirmar la decisión del punto 5, y (c) seguir el procedimiento de
paquete del proyecto (versión única, sin `data/` ni `uploads/`, registro en
`COORDINACION_AGENTES.md` y `REGISTRO_CONTEXTO_PRODUCCION.md`).

Reproducir: `local/levantar.sh <sitio> <puerto>` y
`python3 qa/qa_api.py http://127.0.0.1:<puerto> local/sitio-<puerto> <etiqueta>`.
