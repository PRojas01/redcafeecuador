# Auditoría multidisciplinaria — Red Café Ecuador
**Fecha:** 19 de agosto de 2026 · **Objetivo:** redcafeecuador.com (producción)
**Alcance:** 30 áreas, todas las páginas públicas, APIs, contenido y mensajes.
**Regla:** sin cambios de arquitectura; solo se recomienda reestructurar si hay un problema técnico serio.

---

## Resumen ejecutivo

La plataforma migró al **dominio raíz** (`/` sirve la app; `/plataforma/*` → 301 → `/*`). El estado
general es sólido: HTTPS/HSTS, cabeceras de seguridad, robots/sitemap/canonical/JSON-LD presentes,
APIs respondiendo, auth y validaciones correctas.

**Problemas críticos (P0):**
1. **PWA rota tras la migración a raíz** — `manifest.json` y `sw.js` apuntan a `/plataforma/`
   (id, start_url, scope, iconos, `BASE`). El navegador registrará la app en una URL que redirige.
2. **Datos de demostración etiquetados como reales** — 6 lotes con `ejemplo: true` y
   `verificado: true`, 6 contenidos del Bar con título `[Ejemplo]`, redes sociales vacías,
   comunidad vacía.
3. **`robots.txt` referencia el dominio antiguo** — `Sitemap: https://solucionespro.net/redcafeecuador/sitemap.xml`.

---

## A. Migración a dominio raíz / PWA — ⚠️ CRÍTICO

| Check | Estado |
|---|---|
| `/` sirve la app | ✅ 200 (~168 KB) |
| `/plataforma/*` redirige a raíz | ✅ 301 |
| `manifest.json` (id/start_url/scope/iconos) | ❌ `/plataforma/…` |
| `sw.js` (`BASE`) | ❌ `/plataforma` |
| Instalación PWA funcional | ❌ no comprueba /plataforma |

**Acción P0:** regenerar `public/manifest.json` y `public/sw.js` con `BASE=""` (o
`CONFIG.basePath`) y subir. Tras el deploy, el service worker viejo puede quedar cacheado:
forzar versión nueva en `CACHE`.

---

## B. Arquitectura y stack

- Next.js estático (export) en raíz + WordPress legacy (wp-login.php 200).
- Páginas de detalle `marketplace/[id]` y `servicios/contratar` son **100% client-rendered**
  (curl devuelve solo shell + footer; el contenido depende de JS + API). No es un bug, pero
  degrada SEO y percepción de carga.
- APIs REST en `public/api/*.php` sirven JSON correcto.
- `marketplace/lotes/` → 404 (ruta con `/` extra). Verificar que ningún enlace la genere.

---

## C. Seguridad

| Check | Estado |
|---|---|
| HTTPS + HSTS | ✅ |
| `data/` (contenido) | ✅ 403 |
| `api/_bootstrap.php` | ✅ 403 |
| validación registro (aceptar términos) | ✅ |
| pedido sin sesión | ✅ "No autenticado." |
| wp-login.php expuesto | ⚠️ presente (legacy WP) |

---

## D. SEO técnico

| Check | Estado |
|---|---|
| robots.txt | ✅ Allow todo; disallow /admin/ /panel/ /chat/ /login/ /bar/gestion/ /api/ /data/ |
| sitemap.xml | ✅ 200 |
| `Sitemap:` en robots.txt | ❌ apunta a solucionespro.net (dominio viejo) |
| canonical | ✅ `https://redcafeecuador.com/` |
| JSON-LD | ✅ 1 bloque en home |
| og:image (`og-image.svg`) | ✅ 200 |
| Título/descripción home | ✅ "Red Café Ecuador — La red que conecta tu café con más mercado" |
| H1 único | ✅ "Todo el café ecuatoriano, conectado." |

**Acción P0:** corregir el `Sitemap:` de robots.txt → `https://redcafeecuador.com/sitemap.xml`.
**Acción P2:** los `[id]` client-rendered no aportan HTML indexable; si se quiere SEO de fichas de
lote, generar páginas estáticas con `generateStaticParams` (revisar viabilidad).

---

## E. Rendimiento

- Home HTML ~168 KB (pesa por CSS/JS inline, no por imágenes: **0 `<img>`**, todo SVG/Lamina).
- Página sin imágenes de producto real → carga rápida pero **pierde credibilidad visual** (ver O).
- Service worker roto (P0) → sin cacheo offline ni shell instantáneo.

---

## F. Accesibilidad (revisión desde HTML)

- Paleta con contrastes AA verificados (cereza-roja 6.60:1 sobre blanco; crema-oscuro 5.38:1).
- SVG con `role="img"`/aria: verificar en una pasada de QA visual.
- Touch targets ≥48px en plantilla WP: la app usa clases similares; auditar botones pequeños.

---

## G. UX / Usabilidad

- Navegación completa (Marketplace, Academia, Servicios, Bar, Noticias, Comunidad, Afíliate,
  Recetas — nuevo).
- Páginas con contenido client-rendered muestran "Cargando…" → percepción de lentitud y riesgo
  de pantalla vacía en JS-off.
- Footer con texto inconsistente: "© 2026 Red Café Ecuador — Pedro Rojas / SolucionesPro" y
  "El Moral Bar / Cafetería" (¿empresa real?). Unificar razón social.

---

## H. CRO / Conversión

- Home con 4+ CTAs ("Forma parte de la Red", "Explorar Marketplace", "Explora todos los
  servicios"). Bien.
- **Urgencia presente:** "Registro gratuito hasta el 31 de diciembre de 2026 · después, solo
  pagas los servicios que uses" — buen gancho, pero invita a "esperar" si no se aterriza qué se
  pierde.
- Planes: **todos gratis** (Semilla/Cosecha/Origen). No hay fricción de precio aún → la
  conversión es registro+uso; falta un siguiente paso monetizable claro (asesoría $25, etc.).
- Falta prueba social real: sin lotes reales ni posts de comunidad (ver I/J/K).

---

## I. Contenido editorial (Noticias / Academia / Bar)

**Hallazgo central:** casi todo el contenido de "medios" es **marca de demostración**:

- **Bar:** 6 items TODOS con título `[Ejemplo]` (ej. "[Ejemplo] 8 productores de Loja…",
  "[Ejemplo] Cata profesional de Geisha de Loja"), `imagen: ""`, `embed: ""`.
- **Redes sociales** (media.json redes): `whatsapp.comunidad="https://chat.whatsapp.com/"`
  (vacío), `contacto="https://wa.me/593999999999"` (número placeholder),
  `broadcast="https://whatsapp.com/channel/"` (vacío), y cuentas genéricas
  `instagram.com/redcafeecuador` etc. que probablemente no existen.
- **Comunidad:** `posts: []` (vacía).
- **Academia:** cursos reales (Producción Básico, Post-cosecha, Comercialización, Formalización,
  Tueste Avanzado, Trazabilidad EUDR…) pero con imágenes etiquetadas "LOTE 2026-001" (demo).
- **Noticias:** 6 items con fuentes mixtas (Red Café Ecuador, MAGAP, EUDR/Comisión Europea).
- **Home:** sin `<img>`, todo ilustrado → nada "fotografía real" del café ecuatoriano.

**Acción P0/P1:** quitar o marcar claramente como "demo" los lotes y contenidos `[Ejemplo]`
antes de promocionar la URL; o sustituir por contenido real (ver plan).

---

## J. Marketplace

- 6 lotes, TODOS `ejemplo: true` y `verificado: true`: María Zhunio, Carlos Zamora, Ana Mero,
  Pedro Zambrano, Lucía Cueva, Rosa Imbaquingo (productores ficticios).
- Texto de la página: "Próximamente: pago con escrow, trazabilidad y chat directo con el
  productor" — honesto sobre el estado.
- **Riesgo:** mostrar "Verificado ✅" sobre productores ficticios es publicidad engañosa.

---

## K. Comunidad

- API devuelve `posts: []`. Sección vacía. Ficha de lote depende de `pedidoCreate` (auth
  correcta). Sin actividad, la promesa de "red" no se sostiene.

---

## L. Autenticación / Registro

- `auth.php?action=me` → usuario null, `requires_2fa: false` (ok).
- Registro valida aceptación de Términos/Privacidad/Uso de Datos ✅.
- Correo de contacto unificado `info@redcafeecuador.com` ✅.

---

## M. Bar / Media

- Página del Bar: "Cargando contenido del Red Café Bar…" + perfil "86.5 SCA · cacao · panela ·
  cítrico". Todo contenido demo.

---

## N. Backoffice / Panel

- `/panel/` disallow en robots (correcto, es privado).
- No auditado internamente (requiere sesión).

---

## O. Marca e identidad visual

- Rediseño visual aplicado a la portada (cereza-roja #9E3F1C en iconos/enlaces, verde en
  botones, espaciado unificado). ZIP: `red-cafe-ecuador-20260819-rediseno-visual.zip` (pendiente
  de subir por el usuario; subpages sin aplicar).
- Paleta espresso/cereza/hoja coherente con la identidad del café.
- **Falta fotografía real** (0 imgs en home) → la marca se siente genérica e ilustrada, no
  auténtica. Es la mayor brecha de confianza.

---

## P. Mensajes y posicionamiento — LENTE SOLICITADO

Objetivo del usuario: **comercial sin vender, atractivo de pertenecer, exclusivo, para competir
con grandes empresas o comerciantes.**

### Qué funciona
- "Todo el café ecuatoriano, conectado." — posiciona como red, no como tienda. ✅
- "Forma parte de la Red" — lenguaje de membresía, no de compra. ✅
- "Próximamente: escrow, trazabilidad, chat directo con el productor" — anticipa ventajas frente
  a intermediarios. ✅

### Qué falla (contra ese lente)
1. **No hay exclusividad percibida:** "Registro gratuito" + planes todos gratis + lotes de
   demostración = puerta abierta sin filtro. Una red "exclusiva" necesita: criterio de ingreso
   (verificado, procedencia, puntaje SCA), o al menos narrarlo ("acceso a producto que no sale al
   comercio general").
2. **Los datos de demostración destruyen la exclusividad:** lotes ficticios "verificados" y
   contenidos `[Ejemplo]` dicen "esto es un demo", justo lo contrario de "esto es selecto".
3. **Copys genéricos:** "Encuentra productores, cafés, compradores…" — funcional, pero no dice
   QUÉ te hace especial. Falta el beneficio aspiracional: *ser el lugar donde el café de
   especialidad ecuatoriano se encuentra con compradores que lo valoran — sin pasar por 3
   intermediarios.*
4. **El Bar y las redes vacías** no muestran vida: una red exclusiva muestra conversación,
   catas, historias de origen. Con 0 posts y redes placeholder, "pertenecer" no promete nada.
5. **Competir con grandes:** la plataforma compite por diferenciación (origen, trazabilidad,
   escrow, puntaje). Pero nada en la home traduce eso a "comprador premium: aquí compras directo
   del productor, con trazabilidad verificada". Falta el manifiesto de valor B2B.

### Recomendación de mensajería (P1)
Reescribir las secciones de valor con 3 pilares:
- **Directo:** "compra directo al productor — sin intermediarios".
- **Verificado:** "cada lote con origen y trazabilidad" (y mientras sea demo: ocultar o marcar).
- **Privilegiado:** "acceso anticipado / reserva de lotes de puntaje" para miembros de la Red.

Y **antes de promocionar en público**, resolver los datos de demostración (J/K/M), porque
convierten el mensaje aspiracional en contradicción.

---

## Q. Backlog de mejora priorizado

### P0 — urgente (bloquea lanzamiento/promoción)
1. `manifest.json` + `sw.js` a raíz (A).
2. `robots.txt` Sitemap → dominio nuevo (D).
3. Ocultar/marcar como demo lotes `ejemplo:true` y Bar `[Ejemplo]`; quitar "Verificado" de
   productores ficticios (J/M/O).
4. Redes sociales: dejar vacíos (ocultar sección) o poner cuentas reales; nunca placeholders
   (M).

### P1 — antes de campaña pública
5. Mensajería con los 3 pilares (directo/verificado/privilegiado) en home + afíliate (P).
6. Comunidad: sembrar 3-5 posts reales (cata, origen, convocatoria) (K).
7. Footer: unificar razón social (quitar "El Moral Bar / Cafetería" o aclararlo) (G).
8. Páginas client-rendered: asegurar estado de carga visible y fallback si API cae (G/B).

### P2 — mejora de producto
9. Fotografías reales de café/productores en home (en vez de 100% SVG) (O/D).
10. `generateStaticParams` para fichas de lote (SEO de detalle) si el volumen lo permite (D).
11. Añadir criterio de "verificación" real para lotes (puntaje SCA, muestreo) y mostrarlo (J).
12. Escrow/trazabilidad/chat: planificar hitos públicos (J).

### P3 — pulido
13. Revisar `marketplace/lotes/` (404) y eliminar enlaces rotos (B).
14. Pasar el rediseño visual a /servicios, /marketplace, /academia (O).
15. Auditoría a11y de botones pequeños y roles SVG (F).

---

## Datos técnicos de verificación (fecha auditoría)

- `GET /` → 200, last-modified 16:25:30 GMT (deploy reciente).
- `GET /marketplace/ /academia/ /servicios/ /bar/ /noticias/ /comunidad/ /afiliate/ /login/
  /legal/ /panel/ /servicios/precios/ /servicios/calculadora/ /servicios/contratar/ /recetas/` → 200.
- `GET /marketplace/lotes/` → 404.
- APIs: `api/contenido.php?action=list&seccion=cursos|planes|servicios|noticias`,
  `api/servicios.php?action=list`, `api/auth.php?action=me`, `api/lotes.php?action=list`,
  `api/media.php?action=list|redes`, `api/comunidad.php?action=list` → 200.
- Acciones reales de API: `register`, `pedidoCreate`, `pedidoAdvance`, `pedidoConfirmRecepcion`,
  `postsList`, `postCreate`, `postLike`, `postComment`, `postDelete`, `ratingCreate`, `mediaList`.
- `robots.txt`, `sitemap.xml`, canonical, 1 bloque JSON-LD en home → presentes.