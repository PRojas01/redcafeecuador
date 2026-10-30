# Checklist de aplicación — Rediseño V2.2
**Fecha:** 18 de agosto de 2026 · **Base:** REVISION_V22.md · documento rector «Full Stack de Rediseño V2.2»
**Regla que manda sobre todo lo demás (§2 del documento):** refactorizar, no reconstruir. Rutas, endpoints, datos y flujos no se tocan.

Cómo usarlo: cada casilla es verificable, no interpretable. Si no se puede comprobar con un comando o con una mirada al sitio, no es una casilla: es una intención.

---

## FASE 0 · Decisiones que bloquean el resto  ⛔ antes de programar nada

- [ ] **¿Se conserva «desde 1 libra»?** El documento lo elimina; es el único diferenciador que un competidor no puede copiar. Decidir: se pierde, pasa a microcopy del hero, o vuelve como segundo mensaje.
- [ ] **¿Qué paleta manda?** La del documento (coffee/green/cream/gold) o la aplicada hoy (tostado/latte/cereza/hoja). Aplicar la del documento rehace el trabajo visual de hoy.
- [ ] **¿Se cambia la tipografía a DM Serif Display?** Altera el carácter de la marca entera.
- [ ] **¿Hay presupuesto para fotografía?** Sin ella, el hero del documento no se puede ejecutar. Decidir entre encargar sesión, licenciar banco, o mantener láminas SVG y adaptar el documento.
- [ ] **¿Cuándo el dominio nuevo?** Si es pronto, la migración SEO va al final igualmente; si es lejano, se congela el bloque D.

> Sin estas cinco respuestas, cualquier estimación de plazo es inventada.

---

## FASE 1 · Mensaje y contradicciones  ✅ hecho el 18/08

- [x] Fuera «Un solo pago mensual · toda la red» → «Crear tu perfil y participar en la Red es gratuito» (§37)
- [x] Fuera «Más elegido» sin evidencia real (§50)
- [x] Hero: «Todo el café ecuatoriano, conectado.» con eyebrow, descripción y doble CTA (§19)
- [x] CTA global «Forma parte de la Red» en header, hero, perfiles, cierre y footer (§7)
- [x] Lista de espera → «Forma parte de la Red» + botón «Crear mi perfil», conservando el formulario (§51)
- [x] Sección perfiles: «¿Formas parte del café ecuatoriano?» (§23)
- [x] Escrow, SRI y laboratorios marcados como próximos, no como funciones activas
- [x] Nota de vigencia en las páginas legales
- [ ] **Verificar en el sitio publicado**, no solo en local: hoy producción todavía sirve la versión anterior

---

## FASE 2 · Sistema visual  (58 secciones · 47–124 h)

- [ ] Tokens de color del documento en `globals.css` (§11) — **depende de la decisión 2 de la fase 0**
- [ ] Tipografía (§12) — **depende de la decisión 3**. Autoalojar en `public/fonts/` con `@font-face` y `font-display: swap`
- [ ] **Quitar `fonts.googleapis.com` de `app/layout.tsx`**: hoy el sitio carga un tercero en la ruta crítica
- [ ] Escala tipográfica y variantes móviles (§13)
- [ ] Sistema de espaciado con variables (§14)
- [ ] Contenedor global (§15)
- [ ] Botones: primary, secondary, ghost, icon (§16, §17)
- [ ] Tarjetas (§18)
- [ ] Header desktop (§9) y móvil (§10)
- [ ] Footer global y firma (§92, §93)
- [ ] Componentes reutilizables: ProfileCard, CoffeeCard, ServiceCard, ArticleCard (§109–§113)
- [ ] Sistema de badges (§114) y Socio Fundador (§115)
- [ ] Focus visible en todo control (§103) y accesibilidad (§102)
- [ ] **Criterio de salida:** cero valores de color o espaciado escritos a mano fuera de los tokens

---

## FASE 3 · Páginas una a una  (56 secciones · 59–186 h)

- [ ] Home: beneficios, servicios, confianza, mapa territorial, captación, bar, noticias (§36–§48)
- [ ] Marketplace: hero, orden visual, mapa, filtros desktop y móvil, tarjeta de café (§54–§61)
- [ ] Academia: tarjeta de curso y progreso; quitar copy de membresía (§65–§68)
- [ ] Servicios: dos bloques, precios, catación, EUDR (§69–§74)
- [ ] Bar: contadores en cero, estado vacío, CTA cafetería (§75–§78)
- [ ] Comunidad y su estado vacío (§79, §80)
- [ ] Afiliación: hero, selector de perfiles, copy de formularios, progreso, confirmación (§81–§87)
- [ ] Login (§88) · Noticias y sus tarjetas (§89–§91)
- [ ] Estados transversales: skeleton, error, vacío, toast, modales (§62–§64, §116–§120)
- [ ] Incluir **Amante del Café** y **Proveedor de Equipos e Insumos** en todo lo que el documento describa por perfil
- [ ] **Criterio de salida:** ninguna página con rejilla de tarjetas centradas repetida; cero desbordamiento a 375 px; cero controles bajo 44 px

---

## FASE 4 · SEO, metadatos y dominio  (17 secciones · 23–62 h) — al final, no antes

- [ ] Metadatos por página: home, marketplace, academia (§97–§99)
- [ ] Open Graph con imagen real (§100)
- [ ] Datos estructurados (§101) — **solo con datos reales**: marcar `Product` o `Course` de ejemplo penaliza
- [ ] Canonical (§96)
- [ ] Mover `themeColor` al export `viewport` — el build ya lo avisa
- [ ] Rendimiento, JavaScript y CSS (§105–§108)
- [ ] Dominio nuevo y migración SEO con redirecciones (§94, §95) — **lo último de todo**

---

## Verificación de cada fase (no se cierra sin esto)

- [ ] `NEXT_PUBLIC_BASE_PATH=/redcafeecuador npm run build` sin errores
- [ ] `npx tsc --noEmit` sin errores
- [ ] Las rutas siguen todas en `out/`: ninguna nueva, ninguna perdida
- [ ] `public/api/**` sin un solo cambio
- [ ] Medición a 375 px: desbordamiento 0, controles bajo 44 px solo los enlaces en línea
- [ ] Los ZIP de versiones anteriores intactos
- [ ] Paquete nuevo con número de versión siguiente, sin reutilizar nombre

---

## Pendientes en el servidor (no se resuelven desde el código)

- [ ] **Borrar `LEEME_V11.txt`** de `public_html/redcafeecuador/`: hoy es público y expone el mapa de debilidades del sitio
- [ ] **Arreglar `data/media.json`**: los cuatro vídeos siguen apuntando al enlace-broma `dQw4w9WgXcQ`, y los reportajes inventados siguen sin marca de ejemplo. El arreglo del código solo afecta a instalaciones nuevas: el archivo del servidor persiste desde el 14/08
- [ ] **Cambiar la contraseña de administrador**: quedó registrada en claro en los registros de trabajo del 18/08
- [ ] **Cookies de terceros sin consentimiento**: GoDaddy inyecta `tccl.min.js` y tres cookies de seguimiento antes de cualquier aceptación. Desactivar en el panel del hosting o añadir un mecanismo de consentimiento real
- [ ] Copia de seguridad de `data/` antes de cada despliegue
