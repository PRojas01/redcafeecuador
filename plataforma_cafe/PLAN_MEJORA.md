# Red Café Ecuador — Plan de Mejora Continua

**Versión:** 1.0
**Fecha:** 17 de agosto de 2026
**Base:** AUDITORIA_Y_PLAN_LANZAMIENTO.md, PLAN_DESARROLLO.md v1.7, MODELO_FINANCIERO.md
**Método:** ondas cortas de 2 semanas (SEPA: Sprint, Evaluar, Priorizar, Aplicar)

---

## 0. Resumen ejecutivo

La plataforma funciona en producción (todas las páginas 200, 16 APIs PHP, auth completo con 2FA, panel admin, demo, ticker de precios). La auditoría del 17/08 confirmó **gaps de visibilidad y captación**, no de funcionalidad:

| Gap | Estado actual | Impacto |
|---|---|---|
| SEO (sitemap, robots, OG, JSON-LD) | Ausente (404) | Bajo posicionamiento → poco tráfico orgánico |
| PWA (manifest, service worker) | Ausente (404) | No instalable en móvil → menos retención |
| Buscador interno | No existe | Catálogo inutilizable cuando crezca |
| Blog / noticias SEO | No existe | Sin contenido que atraiga tráfico |
| Notificaciones email | Solo 2FA | Usuario se pierde tras registrarse |
| Pasarela de pago | No existe | No se puede monetizar membresías online |
| Mapa geográfico de productores | No existe | Falla la promesa "origen garantizado" |
| Ticker en subdirectorio | OK | — |

**Prioridad inmediata (Onda 1):** SEO técnico + PWA + blog, porque son bajo esfuerzo y alto impacto en traer visitantes, que es el cuello de botella de un MVP sin marketing.

---

## 1. Ondas de mejora (2 semanas cada una)

### Onda 1 — Visibilidad y captación (días 1–14)
Objetivo: ser encontrable e instalable.

| # | Mejora | Detalle | Esfuerzo | Impacto |
|---|---|---|---|---|
| 1.1 | `robots.txt` + `sitemap.xml` | Estático en `public/` con las 29 páginas públicas + generador de sitemap dinámico vía API | Bajo | Alto |
| 1.2 | Open Graph + Twitter Cards | `app/layout.tsx` + por página (`og:title`, `og:description`, `og:image`, `twitter:card`) | Bajo | Alto |
| 1.3 | Schema.org JSON-LD | `Organization`, `WebSite`, `LocalBusiness` en layout; `Product`/`Course` por detalle | Medio | Alto |
| 1.4 | PWA básica | `manifest.json` + `sw.js` de precaché de estáticos + splash | Medio | Medio |
| 1.5 | Imágenes con `alt` + `aria-label` | Auditoría de `components/` y páginas | Bajo | Medio |
| 1.6 | Blog/Noticias | Nueva sección `/noticias` alimentada por `api/media.php` (reportajes) + 3 artículos semilla | Medio | Alto |

**Criterio de salida:** sitemap.xml y robots.txt responden 200; home y páginas clave tienen OG/JSON-LD; Lighthouse SEO ≥ 90; PWA instalable en móvil.

---

### Onda 2 — Retención y activación (días 15–28)
Objetivo: que el usuario registrado vuelva y se active.

| # | Mejora | Detalle | Esfuerzo | Impacto |
|---|---|---|---|---|
| 2.1 | Email transaccional | Módulo `public/api/email.php`: bienvenida al registrarse, aviso de pedido nuevo, aviso de mensaje | Medio | Alto |
| 2.2 | Buscador interno | API `public/api/search.php` (filtros por categoría/región/precio) + UI en marketplace | Medio | Alto |
| 2.3 | Mapa geográfico | Leaflet (sin backend, datos ya en `lotes.json`) con marcadores de fincas | Medio | Alto |
| 2.4 | Notificaciones in-app | Badge de mensajes no leídos + polling en Navbar | Bajo | Medio |
| 2.5 | Onboarding guiado | Checklist de "primeros 5 pasos" en el panel (completa tu perfil, publica un lote…) | Medio | Medio |

**Criterio de salida:** tasa de activación (usuario que completa perfil o publica) ≥ 50% de los registrados; buscapersonas devuelve resultados <1s.

---

### Onda 3 — Monetización y comunidad (días 29–42)
Objetivo: cobrar membresías y fomentar el boca a boca.

| # | Mejora | Detalle | Esfuerzo | Impacto |
|---|---|---|---|---|
| 3.1 | Pasarela de pago | Integración PayPal (más fácil en GoDaddy, sin SSL complicado) para planes de suscripción | Alto | Alto |
| 3.2 | Programa de referidos | Código único por usuario; bono en su plan al invitar | Medio | Medio |
| 3.3 | Reputación visible | Badges por nivel (verificado, confiable, estrella) calculados de ratings | Bajo | Medio |
| 3.4 | Exportar reportes | CSV/PDF de pedidos y stats desde panel y admin | Medio | Medio |
| 3.5 | Tickets de soporte | Tabla simple en `api/soporte.php` (asunto, estado, mensajes) | Medio | Medio |

**Criterio de salida:** al menos 1 plan pagado online; ≥10% de nuevos usuarios vienen por referidos.

---

### Onda 4 — Escala y datos (días 43–56)
Objetivo: datos para decidir y solidez para crecer.

| # | Mejora | Detalle | Esfuerzo | Impacto |
|---|---|---|---|---|
| 4.1 | Dashboard analítico admin | Métricas de funnel (registro→activo→pago), cohortes | Alto | Alto |
| 4.2 | Exportación API / backup | Botón de respaldo JSON completo desde admin + programado | Medio | Alto |
| 4.3 | Logs y monitoreo | `api/health.php` que reporta estado de data/ + uptime | Bajo | Medio |
| 4.4 | Tests de regresión | Script de auditoría automatizado (curl) de las 16 APIs | Medio | Medio |
| 4.5 | Internacionalización | Preparar textos para es/en (i18n ligero en config) | Medio | Medio |

**Criterio de salida:** panel admin muestra embudo de conversión; backup restaurable probado; health endpoint monitorizado.

---

## 2. Backlog de mejora (más adelante)

| Mejora | Por qué se pospone |
|---|---|
| App móvil nativa | El PWA de la Onda 1 cubre el 80% del caso; re-evaluar en Onda 5 |
| Notificaciones push (Web Push) | Requiere service worker avanzado + permisos; posponer |
| Multiidioma completo | Recién cuando haya demanda internacional demostrada (Módulo EUDR lo anticipa) |
| AI/chatbot de soporte | Tras tickets de soporte (3.5) funcionando |
| APIs públicas para terceros | Tras tener tracción de usuarios |
| Financiación colectiva / catación virtual | Son ingresos secundarios (ver MODELO_FINANCIERO.md §4) |

---

## 3. Recursos y dependencias

### Lo que NO se puede hacer desde el código (requiere Pedro)
- ✅ Registrar dominio `redcafeecuador.com` (aún apuntado a solucionespro.net subdirectorio)
- ✅ Configurar cuenta PayPal/Gateway (requiere datos bancarios)
- ✅ Alta en Search Console de Google + envío de sitemap
- ✅ Envío de email real (SPF/DKIM en GoDaddy para `@redcafeecuador.com`)
- ✅ Entrevistas de validación (E0.1) que alimentan el contenido del blog

### Riesgos y mitigación
| Riesgo | Mitigación |
|---|---|
| Email cae en spam | Configurar SPF/DKIM antes de 2.1; siempre hay dev_code de respaldo |
| Pagos en GoDaddy compartido | Elegir PayPal estándar (sin SSL propio); fallback a link de pago manual |
| PWA con basePath en subdirectorio | `manifest.json` y `sw.js` con rutas absolutas `/redcafeecuador/...` |
| Crecimiento de JSON files | Respaldo automático (4.2) + particionar por año cuando supere ~5 MB |

---

## 4. Métricas de éxito (KPIs)

| KPI | Ahora | Onda 1 | Onda 2 | Onda 3 | Onda 4 |
|---|---|---|---|---|---|
| Lighthouse SEO | ~40 | ≥90 | ≥90 | ≥90 | ≥90 |
| Lighthouse Performance | — | ≥85 | ≥85 | ≥90 | ≥90 |
| Visitas/mes | — | +100% | +50% | +25% | +25% |
| Registros/mes | — | 30 | 60 | 100 | 150 |
| Activación (perfil/lote) | — | — | ≥50% | ≥50% | ≥60% |
| Pago online | No | No | No | 1 plan | ≥30 suscriptores |
| Tasa de retención 30d | — | — | ≥40% | ≥45% | ≥50% |

---

## 5. Plan de acción inmediato (próximos 7 días)

1. **Día 1:** crear `public/robots.txt`, `public/sitemap.xml`, `app/noticias/` y 3 artículos.
2. **Día 2:** OG + Twitter Cards + JSON-LD en `app/layout.tsx` y páginas clave.
3. **Día 3:** `manifest.json` + `sw.js` + registrar en layout.
4. **Día 4:** auditoría de `alt`/`aria` + arreglar los detectados.
5. **Día 5:** build con `NEXT_PUBLIC_BASE_PATH=/redcafeecuador`, ZIP, guía de subida.
6. **Día 6–7:** subida a producción + verificación (Search Console pendiente de Pedro).
