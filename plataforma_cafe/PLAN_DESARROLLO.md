# Plan de Desarrollo — Plataforma del Café Ecuatoriano

**Versión:** 1.7
**Fecha:** 13 de agosto de 2026
**Base:** PROPUESTA_PLATAFORMA_CAFE_ECUADOR.md v1.0
**Estado:** Plan de desarrollo — Fase 0 y Fase 1 en curso (avances 13/08/2026: build producción, borradores legales E0.5, guías manuales)

---

## 0. Visión del plan

Construir el MVP de la plataforma de afiliación del café ecuatoriano en **6 meses**, partiendo de un ciclo de validación de 2 meses. Cada fase termina con un **entregable usable y verificable** (criterio de salida), no con código muerto. Principios rectores:

- **Primero validar, luego construir** (Fase 0 antes del código).
- **Menos features, más valor:** el MVP resuelve 1 flujo completo (productor → vende → cobra → se capacita) en vez de 5 flujos a medias.
- **WhatsApp-first:** toda la experiencia tiene al canal de mensajería como vía de bajo costo.
- **Cada fase se prueba en campo** con usuarios reales antes de pasar a la siguiente.

---

## 1. Fases resumen

| Fase | Nombre | Duración | Entregable principal |
|---|---|---|---|
| **0** | Validación y preparación | 2 meses | Evidencia de mercado + alcance congelado + marca + financiamiento |
| **1** | MVP | 4–6 meses | Plataforma funcional en piloto (100 productores + 20 compradores) |
| **2** | Crecimiento | 6–12 meses | Trazabilidad EUDR, catación verificada, logística, suscripción B2C |
| **3** | Escalado | 12–24 meses | Internacionalización, financiación, app nativa, API |

**Cronograma total:** ~24 meses hasta plataforma en escala. Los hitos de cada fase se detallan abajo.

### 1.1 Estado de avance (13/08/2026)

Leyenda: ✅ completado · 🔶 en curso · ⬜ pendiente · 🔒 requiere acción humana/legal/financiera

**FASE 0 — Validación y preparación**
| Entregable | Estado |
|---|---|
| E0.1 Investigación de usuarios (30–50 entrevistas) | 🔒 Pendiente — requiere trabajo de campo |
| E0.2 Propuesta de valor validada | 🔶 Parcial: borrador por perfil aplicado en landing; falta validar con entrevistas |
| E0.3 Landing + waitlist | ✅ Landing funcional con formulario waitlist (nombre/correo/perfil) + canal WhatsApp (13/08/2026); **en cPanel usa Formspree opcional + fallback localStorage** (ver GUIA_DEPLOY_GODADDY.md); falta alcanzar 3.000 sign-ups y 300 con perfil completo (requiere deploy + realizar Formspree) |
| E0.4 Modelo financiero | ✅ Entregado 13/08/2026: MODELO_FINANCIERO.md + simulador interactivo en `/servicios/finanzas` (MRR/ARR, churn, CAC, LTV, payback, break-even, 3 escenarios); falta validar supuestos con E0.1/E0.6 |
| E0.5 Decisión legal y fiscal (S.A.S., RUC, SRI, escrow) | 🔶 Borradores legales listos (docs/LEGAL/, 13/08/2026): privacidad LOPDP, términos, membresía, escrow/conflictos; falta constitución S.A.S. + revisión/ajuste del abogado + campos [ ] + decisión formal de escrow 🔒 |
| E0.6 Piloto definido (provincia + cartas de intención) | 🔒 Pendiente — requiere gestión comercial |
| E0.7 Presupuesto / financiamiento | ✅ Presupuesto Fase 1 ($27–55k) y plan de financiamiento en MODELO_FINANCIERO.md (13/08/2026); obtener fondos (≥$30k) pendiente 🔒 |
| E0.8 Marca | 🔶 Parcial: nombre+identidad+paleta creados (MARCA_IDENTIDAD_VISUAL.md); falta registro SENADI, dominios (NIC.EC) y logo final |

**FASE 1 — MVP**
| Entregable | Estado |
|---|---|
| E1.1 Producto funcional (producción) | 🔒 Pendiente — requiere backend/BD/pagos reales |
| E1.1b Prototipo funcional (app web demo) | ✅ **Entregado 13/08/2026** (Next.js 15, 16 rutas, build limpio) |
| E1.2 Piloto operativo (100 prod. + 20 comp.) | 🔒 Pendiente — requiere Fase 0 (E0.1/E0.6) + backend |
| E1.3 Academia operativa (10 cursos) | 🔶 Parcial: **10 cursos demo publicados** (13/08/2026); falta video real y métricas del piloto |
| E1.4 Facturación SRI en producción | ⬜ Pendiente — demo simulada lista en app |
| E1.5 Procesos operativos (manuales) | ✅ Entregado 13/08/2026: docs/MANUAL_ONBOARDING.md + docs/MANUAL_SOPORTE.md (onboarding de campo, soporte, estrategia de conflictos con escrow) |
| E1.6 Métricas base (MRR, churn, NPS) | ⬜ Pendiente — depende de piloto real |
| E1.7 Laboratorio en línea | 🔶 Parcial: Cafetería de Pruebas + Podcast + Banco de Pruebas + **formulario de feedback de probadores** (13/08/2026); falta alcanzar ≥20 respuestas |

**FASE 2 y FASE 3** — ⬜ Pendientes (bloqueadas por Fase 0 y Fase 1)

**Activos del repo:** PROPUESTA v1 · PLAN v1.7 · MARCA (opciones + identidad) · MODELO_FINANCIERO · manuales operativos · GUIA_ACCIONES_MANUALES · GUIA_DEPLOY_GODADDY · BACKLOG_TECNICO · INFORME_E01_TEMPLATE · **docs/LEGAL (borradores)** · app Next.js estática · dist/ (ZIP producción + fuente) · README.
**Guardado en memoria del proyecto:** contexto de mercado, decisiones, plan, marca, E1.1b, avances E0.x/E1.x.

---

## 2. FASE 0 — Validación y preparación (meses 1–2)

> **Objetivo:** demostrar que los tres perfiles están dispuestos a pagar por los servicios y congelar el alcance antes de escribir código. Sin evidencia de mercado, no se construye.

### 2.1 Alcance y entregables

| Entregable | Descripción | Criterio de salida |
|---|---|---|
| E0.1 Investigación de usuarios | 30–50 entrevistas: 25 productores (Loja, Zamora, Manabí, Sucumbíos), 15 vendedores, 10 compradores | Mapa de dolores + disposición a pagar documentado |
| E0.2 Propuesta de valor validada | Mensajes y beneficios por perfil, ajustados a hallazgos | 1 párrafo de PV por perfil validado |
| E0.3 Landing page + waitlist | Página con formulario de pre-registro y canal WhatsApp | 3.000 sign-ups (objetivo) y 300 con perfil completo |
| E0.4 Modelo financiero | Hoja de cálculo: MRR, churn, CAC, LTV, break-even, 3 escenarios | Escenario conservador con break-even < 18 meses |
| E0.5 Decisión legal y fiscal | Forma jurídica (S.A.S. / Cía. Ltda.), RUC, facturación electrónica SRI, normativa escrow/fintech | Registro legal constituido + dictamen de cumplimiento |
| E0.6 Piloto definido | Provincia y socios piloto seleccionados; acuerdos de intención | 3 cartas de intención (productor, tostador, cafetería) |
| E0.7 Presupuesto y financiamiento | Presupuesto Fase 1 + plan de fondos (bootstrapping / inversión) | Financiamiento asegurado (seed) |
| E0.8 Marca | **Red Café Ecuador** (seleccionado): identidad visual (logo, colores, tipografía), tono de voz, tagline, registro de marca y dominio | Marca registrada + activos de identidad aprobados y aplicados en landing page |

### 2.2 Tareas desglosadas

> **Cada tarea manual está desarrollada paso a paso en `GUIA_ACCIONES_MANUALES.md`** (scripts de entrevista, plantilla de carta de intención, checklist legal, registro de dominio/marca y plan de financiamiento). La sección resume las tareas; la guía las hace ejecutables.

1. Diseñar guías de entrevista (una por perfil) con preguntas de disposición a pagar (Van Westendorp).
2. Coordinar visitas de campo vía asociaciones territoriales y ANECAFÉ.
3. Sintetizar hallazgos (affinity mapping) y documentar en informe.
4. Construir landing page (estática, +$50/mes hosting) con waitlist y botón WhatsApp.
5. Modelar finanzas en hoja de cálculo con escenarios (optimista/base/conservador).
6. Contratar asesor legal: constitución, términos y condiciones, política de privacidad, contrato de escrow.
7. Seleccionar pasarela de pago y validar operación en Ecuador (Payphone, Banred, PayPal, transferencias).
8. Definir stack técnico (ver §7) y contratar/armar equipo técnico.
9. Crear la marca: preseleccionar 3–5 nombres (revisar disponibilidad en SENADI/IP Ecuador y dominios), diseñar logo y paleta, definir tagline y tono de voz, registrar marca y dominio.
10. Constituir la empresa y registrar la marca (SENADI) / dominio.
11. Go/No-Go: presentar evidencia ante stakeholders; **aprobación humana obligatoria para pasar a Fase 1.**

### 2.3 Recursos

- Fundador/PM (tiempo completo).
- Asesor legal (horas) → incluye registro de marca (SENADI).
- 1 desarrollador para landing page (horas).
- Diseñador de marca (logo, paleta, tono) — freelance o agencia.
- Presupuesto marketing mínimo (canales WhatsApp + asociaciones).

### 2.4 Riesgos propios de la fase

- Baja disposición a pagar del productor → rediseñar plan Semilla o descontar membresía del escrow en la primera venta.
- Acceso difícil a productores → apoyo de asociaciones/organizaciones como puerta de entrada.

---

## 3. FASE 1 — MVP (meses 3–8)

> **Objetivo:** entregar la plataforma mínima que permite a un productor **publicar lotes, recibir pedidos, cobrar vía escrow, facturar y acceder a capacitación**, operando en un piloto territorial.

### 3.1 Alcance funcional (MVP congelado)

| Módulo | Funcionalidades (MVP) | Fuera de alcance en MVP |
|---|---|---|
| **1. Cuentas y perfiles** | Registro de los 3 roles; perfil de finca (fotos, GPS, variedad, proceso); verificación básica | Verificación documental avanzada, KYC completo |
| **2. Marketplace** | Escaparate de lotes con catación, precio y cantidad; solicitud de compra; chat/WhatsApp | Subastas, pedidos múltiples, dropshipping |
| **3. Pagos y escrow** | Pasarela de pago; fondo en custodia; liberación al confirmar conformidad | Pagos internacionales complejos, financiación |
| **4. Academia** | 10 cursos en video + certificados de participación | Plataforma LMS compleja, evaluaciones proctoring |
| **5. Facturación** | Facturación electrónica SRI para miembros activos | Contabilidad completa, roles múltiples de contador |
| **6. Admin** | Panel para operar piloto: usuarios, lotes, transacciones, reportes básicos | Dashboard analítico avanzado, API pública |
| **7. Laboratorio (Pruebas)** | Cafetería de pruebas (demo de tienda/suscripción), banco de pruebas de servicios (calculadora, factura, EUDR), podcast y contenidos | Procesar pagos reales; solo demostración |

**Flujo crítico a probar en el piloto (happy path):** *Productor publica lote → Tostador solicita → Negocian por WhatsApp → Compra con escrow → Despacho → Liberación de pago → Productor factura → Toma un curso.*

### 3.2 Entregables

| Entregable | Criterio de salida |
|---|---|
| E1.1 Producto funcional (producción) | Flujo crítico operativo con usuarios reales, backend y pagos reales (fase productiva) |
| E1.1b Prototipo funcional (app web demo) | **✅ Entregado 13/08/2026.** Next.js 15 + Tailwind, 15 rutas, build limpio. Para demostración y validación temprana: registro por rol, escaparate+filtros+detalle con escrow simulado, cursos+progreso+certificados, asesoría, laboratorio (cafetería de pruebas/podcast/banco), panel por rol. Backend/BD/pagos reales quedan para la fase productiva |
| E1.2 Piloto operativo | 100 productores + 20 compradores/vendedores transaccionando ≥ 2 meses |
| E1.3 Academia operativa | 10 cursos publicados; ≥ 60% de productores del piloto toma ≥ 1 curso |
| E1.4 Facturación en producción | Emisión de facturas electrónicas SRI desde la plataforma |
| E1.5 Procesos operativos | Manuales de onboarding de campo, soporte y resolución de conflictos |
| E1.6 Métricas base | MRR inicial, churn, ventas transadas, NPS — reporte mensual |
| E1.7 Laboratorio en línea | Cafetería de pruebas, banco de servicios (calculadora, factura, EUDR) y podcast publicados; feedback de ≥ 20 probadores |

### 3.3 Tareas desglosadas (sprints de 2 semanas)

**Sprints 1–2 — Fundaciones:**
- Setup de repositorio, CI/CD, entorno (dev/staging/prod), base de datos.
- Autenticación y roles (3 perfiles) + administración de usuarios.
- Registro de finca con captura de GPS (geolocalización en formulario).

**Sprints 3–4 — Marketplace:**
- CRUD de lotes (fotos, variedad, proceso, cupping, precio, cantidad, stock).
- Búsqueda y filtros básicos; escaparate público.
- Solicitud de compra + flujo de chat (integración WhatsApp).

**Sprints 5–6 — Pagos:**
- Integración pasarela de pago (sandbox primero).
- Módulo escrow: retención, confirmación de conformidad, liberación y reversión.
- Conciliación y estados de transacción visibles a ambas partes.

**Sprints 7–8 — Academia + Facturación:**
- Carga de 10 cursos (video + texto), progreso y certificado.
- Integración facturación electrónica SRI (proveedor como Datafast/Banred o API SRI).
- Ajustes de UX según feedback del piloto inicial.

**Sprints 9–10 — Hardening y piloto:**
- Correcciones, pruebas end-to-end, carga y seguridad.
- Onboarding masivo del piloto (promotores de campo).
- Dashboard admin y reportes operativos.
- **Go-live del piloto** y monitoreo.

**Sprints 11–12 — Estabilización y Laboratorio:**
- Laboratorio de pruebas: cafetería demo, banco de servicios y podcast en línea para testear UX y servicios.
- 2 ciclos completos de venta con el piloto.
- Encuesta de satisfacción; iteración rápida.
- **Revisión de hitos y aprobación para Fase 2.**

### 3.4 Equipo y rol

| Rol | Dedicación | Cobertura |
|---|---|---|
| PM / Product Owner | Tiempo completo | Fundador |
| Full-stack developer | Tiempo completo | 1–2 |
| Diseñador UX (también promo/landing) | Horas (sprint 0 y ajustes) | Freelance |
| Promotor de campo | Tiempo completo (piloto) | Contratado por zona |
| QA | Horas (sprints 7–10) | Freelance / developer |

### 3.5 Presupuesto estimado Fase 1 (indicativo)

| Concepto | Rango (USD) |
|---|---|
| Desarrollo (6 meses, 1–2 devs) | 18.000 – 36.000 |
| Diseño UX | 1.500 – 3.000 |
| QA | 1.500 – 3.000 |
| Infraestructura (hosting, dominio, email, CDN) | 600 – 1.200 |
| Pasarela y facturación (setup/fees) | 500 – 1.500 |
| Promotores de campo y movilización | 3.000 – 6.000 |
| Marketing y materiales | 1.000 – 2.500 |
| Legal (ajustes de contratos) | 800 – 1.500 |
| **Total** | **27.000 – 55.000** |

> Rango amplio; el valor real depende del equipo (local vs remoto) y el alcance final. Se valida con el modelo financiero (E0.4).

### 3.6 Criterios de salida de Fase 1 (obligatorios)

1. ≥ 100 productores activos y ≥ 20 compradores/vendedores con al menos 1 transacción cada uno.
2. ≥ 50 ventas completadas en el piloto con escrow funcionando sin incidencias críticas.
3. Churn mensual < 5% en el piloto.
4. NPS ≥ 40 en encuesta de pilotos.
5. Facturación electrónica operativa al menos para 30% de los miembros activos.
6. Costos operativos ≤ 40% del MRR del piloto.
7. **Aprobación humana del hito (DevControl).**

---

## 4. FASE 2 — Crecimiento (meses 9–20)

> **Objetivo:** convertir el piloto en operación nacional, añadir los diferenciadores que venden (trazabilidad EUDR, catación verificada) y diversificar ingresos.

### 4.1 Alcance y entregables

| Módulo | Funcionalidades nuevas | Criterio de salida |
|---|---|---|
| **Trazabilidad EUDR** | Geolocalización por finca, dossier de lote (GPS, fecha, volumen), exportación de reporte | Dossier generado y descargable para 100% de lotes exportables |
| **Catación verificada** | Laboratorios aliados (ANECAFÉ, universidades, catadores), score en lote, sello "verificado" | ≥ 200 lotes con cupping score publicado |
| **Logística integrada** | Cotización de envío, tracking, empaque/consolidación de micro-lotes | Envíos B2B trackeados para ≥ 80% de ventas |
| **Suscripción B2C** | "Café del mes" para cafeterías y consumidores; entrega programada | ≥ 300 suscriptores activos |
| **Asesoría comercial 1:1** | Agenda de videollamadas, panel de precios ICE C, plantillas de negociación | ≥ 60% de productores Cosecha con 1 sesión/mes |
| **Internacional (preview)** | Perfiles bilingües, oferta visible a compradores extranjeros verificados | Primeras ventas internacionales B2B |
| **Datos y reportes** | Panel por finca (ventas, precios históricos, desempeño) | Panel usado por ≥ 50% de productores activos |

### 4.2 Tareas por módulo

1. **EUDR:** modelar datos de finca (GPS + polígono), generar reporte conforme a reglamento UE; validar con abogado.
2. **Catación:** convenios con laboratorios; protocolo de toma de muestras y publicación del score.
3. **Logística:** integración con transportadoras (cotización API o manual); módulo de consolidación.
4. **Suscripción B2C:** motor de suscripciones recurrentes (cobro automático), skip/pausa, entregas.
5. **Asesoría:** agenda y videollamada integrada; panel de precios (fuente: ICE C / reportes ANECAFÉ).
6. **Internacional:** versión EN, onboarding de compradores extranjeros con verificación, términos de incoterms básicos.
7. **Analítica:** métricas por finca, exportación CSV, notificaciones de precio.

### 4.3 Equipo y recursos

- Sumar: 1 back-end developer, 1 soporte/CS, coordinador de logística (part-time), 2–3 promotores de campo adicionales.
- Presupuesto indicativo: 40.000 – 90.000 USD (depende de convenios y expansión).

### 4.4 Criterios de salida

1. Operación en ≥ 3 provincias cafetaleras.
2. MRR objetivo de la fase: ≥ $25.000 (validar con E0.4).
3. Churn < 3% mensual.
4. ≥ 5% de lotes con catación verificada; dossier EUDR disponible en 100% de exportables.
5. NPS ≥ 45.
6. **Aprobación humana del hito.**

---

## 5. FASE 3 — Escalado (meses 21–36)

> **Objetivo:** consolidar la posición nacional y abrir el mercado internacional y de servicios financieros.

### 5.1 Alcance y entregables

| Módulo | Funcionalidades | Criterio de salida |
|---|---|---|
| **Internacionalización** | Compradores UE/EE.UU./Asia, oferta en inglés, contratos e incoterms, pagos FX | ≥ 15% de ingresos de exportación |
| **Financiación pre-cosecha** | Alianza con fintech/banca; scoring con datos de plataforma; adelantos | ≥ 100 créditos desembolsados |
| **App nativa** | Android-first, modo offline, notificaciones push | ≥ 40% de productores activos con la app |
| **API B2B** | API para exportadores y cadenas; integraciones | 5 integraciones activas |
| **Certificaciones premium** | Sello orgánico/comercio justo/Rainforest con aliados certificadores | ≥ 50 fincas certificadas vía la plataforma |
| **Marca y comunidad** | Club de miembros, eventos, feria virtual anual | Comunidad activa (eventos anuales, foro) |

### 5.2 Tareas por módulo

1. **Internacional:** cumplimiento de exportación (agente aduanero), doc de pagos FX, estrategia de adquisición de compradores en mercados objetivo.
2. **Financiación:** diseño de scoring con datos de ventas/trazabilidad; convenio con 1 fintech (modelo finmid/Algrano); legal y riesgo.
3. **App:** desarrollo nativo Android + PWA; sincronización offline de lotes y ventas.
4. **API:** diseño de API pública con rate limits, webhooks y documentación; planes "Granel".
5. **Certificaciones:** convenios con entes certificadores; programa de acompañamiento y financiamiento del costo.
6. **Comunidad:** embajadores por provincia, eventos presenciales y feria virtual; programa de referidos.

### 5.3 Equipo y recursos

- Equipo completo: PM, 3–4 devs, CS, logística, ventas comerciales, financiero/legal.
- Presupuesto: 120.000 – 300.000 USD (depende de financiamiento y expansión internacional).

### 5.4 Criterios de salida

1. ≥ 10.000 suscriptores activos (o 20% del mercado formalizable).
2. ARR ≥ $1M (validar con modelo financiero).
3. Churn sostenido < 3%.
4. Ingresos diversificados: 70% membresía / 30% servicios y financiación.
5. **Aprobación humana del hito.**

---

## 6. Gestión de proyecto y calidad

- **Metodología:** Scrum ligero, sprints de 2 semanas, grooming quincenal del backlog, demo al cierre de sprint.
- **Documentación técnica:** decisiones (ADR), arquitectura, API (OpenAPI), manual de operación. Mantener en el repo.
- **QA:** pruebas unitarias + E2E en cada sprint; checklist de regresión antes de cada release; entorno staging siempre.
- **Seguridad (base):** OWASP top 10, cifrado de datos personales, cumplimiento de protección de datos (LOEPDP Ecuador), logs de auditoría de pagos.
- **DevControl:** cada hito de fase requiere revisión y aprobación humana antes de avanzar. Nada se auto-aprueba.
- **Backup y DR:** backups diarios de BD, plan de recuperación documentado.

### 6.1 Métricas de seguimiento por fase

| Métrica | Fase 1 | Fase 2 | Fase 3 |
|---|---|---|---|
| Suscriptores activos | 120 | 1.500 | 10.000 |
| MRR | $2.500 | $25.000 | $85.000+ |
| Churn mensual | <5% | <3% | <3% |
| NPS | ≥40 | ≥45 | ≥50 |
| Transacciones/mes | 50 | 800 | 5.000 |

---

## 7. Stack técnico sugerido

> Decisión final en Fase 0 (E0.7). Principio: **stack simple y mantenible**, no moda tecnológica.

| Capa | Sugerencia |
|---|---|
| Frontend web | Next.js (React) — SSR y SEO de escaparate |
| Backend | Node.js (NestJS) o Django/Python — elegir por talento disponible |
| Base de datos | PostgreSQL + S3 (imágenes) |
| Cache/cola | Redis; BullMQ/Celery para tareas (facturas, emails) |
| Pagos/escrow | Pasarela local (Payphone/Banred) + cuenta en custodia; PayPal para internacional |
| Facturación SRI | Proveedor local (Datafast, e-Pyme, etc.) o API SRI |
| WhatsApp | WhatsApp Business API (proveedor oficial para no caer en bloqueo) |
| Video (academia) | Hosting de video (Cloudflare Stream / YouTube privado) + reproductor propio |
| Mapas/GPS | Mapbox / OSM para geolocalización de fincas |
| Hosting | VPS o PaaS (Render/Fly) en región EE.UU./UE; CDN |
| Monitoreo | Sentry + uptime + logs centralizados |

---

## 8. Dependencias y decisiones pendientes

| Dependencia | Afecta a | Decisión requerida en |
|---|---|---|
| Resultados de entrevistas (disposición a pagar) | Precios de planes | Fase 0 (E0.1) |
| Modelo financiero | Presupuesto y roadmap | Fase 0 (E0.4) |
| Forma legal + normativa escrow/fintech | Diseño de pagos | Fase 0 (E0.5) |
| Convenio laboratorios de catación | Fase 2 | Inicio Fase 2 |
| Convenio transportadoras | Fase 2 | Inicio Fase 2 |
| Alianza fintech para crédito | Fase 3 | Inicio Fase 3 |
| Aprobación humana de cada hito (DevControl) | Avance global | Antes de cada fase |

---

## 9. Riesgos principales del plan

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Disposición a pagar menor a la esperada | Modelo insostenible | Piloto de precios en Fase 0; plan Semilla ultra-económico |
| Equipo técnico difícil de conseguir/retener | Retraso de fases | Stack común; priorizar 1 dev full-stack sólido antes de crecer |
| Regulatorio de pagos/escrow | Bloqueo de flujo de caja | Asesor legal en Fase 0; diseñar con normativa local desde el inicio |
| Adopción rural (conectividad/alfabetización digital) | Bajo uso del marketplace | WhatsApp-first, promotores, modo offline en Fase 3 |
| EUDR cambia o se aplaza | Diferenciador se debilita | Diseño modular de trazabilidad; no acoplar todo el valor a EUDR |
| Churn alto de suscriptores | MRR no crece | Valor continuo visible (cursos nuevos, precios, asesorías); encuestas de salida |
| Dependencia del piloto en 1 provincia | Sesgo de validación | Elegir 2 zonas (especialidad + volumen) en el piloto si el presupuesto lo permite |

---

## 10. Reglas del plan (contractuales)

1. **No se construye código de Fase 1 sin completar Fase 0** y su aprobación.
2. **Cada fase cierra con sus criterios de salida verificados** (métricas + aprobación humana).
3. **El MVP se congela** al iniciar; cualquier feature nueva entra al backlog de Fase 2.
4. **Las decisiones de arquitectura se documentan (ADR)** y se aprueban antes de implementar.
5. **El plan se revisa mensualmente** (avance vs métricas) y se ajusta solo con aprobación.
6. **Revisar y actualizar el plan en cada fase:** al abrir una fase, el PM actualiza este documento (entregables, alcance, presupuesto y riesgos) con los hallazgos de la fase anterior y lo marca en la bitácora abajo. El plan vivo siempre está en `PLAN_DESARROLLO.md`.
7. **El producto incluye un espacio de demostración** ("Cafetería de Pruebas", Podcast y Banco de Pruebas) desde el MVP, para testear servicios, contenido y UX con usuarios sin tocar producción.

### 10.1 Bitácora de actualización del plan

| Fecha | Versión | Qué cambió | Aprobación |
|---|---|---|---|
| 13/08/2026 | 1.1 | Regla 6 (revisar/actualizar plan por fase), Regla 7 y módulo 7 en MVP: **Laboratorio — Cafetería de Pruebas, Podcast y Banco de Pruebas**. Marca seleccionada: Red Café Ecuador. | Pendiente humana |
| 13/08/2026 | 1.2 | **E1.1 entregado (versión demo):** app web Next.js 15 + Tailwind funcional con 15 rutas (`npm run build` ✅, `npm run dev` OK). Rutas: landing, marketplace (escaparate + detalle con escrow simulado), academia (cursos + progreso + certificados), afiliate (registro por rol), servicios (precios, calculadora, EUDR, facturación), asesoría, laboratorio (cafetería de pruebas + podcast + banco de pruebas) y panel Mi Red por rol. MVP demo: datos locales + localStorage, sin backend ni pagos reales. Pendiente para fase productiva: backend, BD, pasarela/escrow reales, facturación SRI. | ✅ Aprobado en demo (ejecución delegada a agente) |
| 13/08/2026 | 1.3 | **Avances accionables:** ✅ **E0.3** Landing con waitlist (localStorage, nombre/correo/perfil) + canal WhatsApp; ✅ **E0.4** MODELO_FINANCIERO.md + simulador interactivo `/servicios/finanzas` (MRR/ARR, CAC, LTV, payback, break-even, 3 escenarios); ✅ **E0.7** Presupuesto Fase 1 ($27–55k) y plan de financiamiento (≥$30k) dentro del modelo financiero; ✅ **E0.2** propuesta de valor por perfil (productor/vendedor/comprador) en landing; ✅ **E1.3** Academia completa a 10 cursos (café de especialidad, plagas, comercio exterior, barismo); ✅ **E1.5** Manuales de onboarding y soporte/conflictos (`docs/`); ✅ **E1.7** Formulario de feedback de probadores en Laboratorio. Build limpio (16 rutas), rutas nuevas verificadas en HTTP 200. | ⏳ Ejecutado, pendiente validación humana |
| 13/08/2026 | 1.4 | **Prep productiva lista:** ✅ **GUIA_ACCIONES_MANUALES.md** — acciones humanas de Fase 0 (E0.1 entrevistas, E0.5 legal, E0.6 piloto, E0.8 marca/dominio, E0.7 financiamiento) convertidas en guías paso a paso con scripts/plantillas/checklists; ✅ **docs/BACKLOG_TECNICO.md** — modelo de datos Prisma, API Route Handlers, plan de 10 sprints y migración desde la demo (listo para ejecutar al aprobarse el gate); ✅ **docs/INFORME_E01_TEMPLATE.md** — plantilla de informe de entrevistas; ✅ **API waitlist funcional** (`POST/GET /api/waitlist` con persistencia en `data/waitlist.json`, dedupe por email y validación; la landing escribe ahí con fallback a localStorage) — habilita la meta de 3.000 sign-ups al desplegar. Build limpio + endpoint probado. | ⏳ Ejecutado, pendiente validación humana |
| 13/08/2026 | 1.5 | **Ajuste para GoDaddy (hosting compartido cPanel):** ❌ se retira la API `waitlist` (cPanel no ejecuta Node.js) y se pasa la app a **build 100% estático** (`next.config.ts` → `output: "export"`, `trailingSlash`), generando `out/` (6 lotes + 10 cursos prerenderizados vía `generateStaticParams` en layouts). ✅ `GUIA_DEPLOY_GODADDY.md` con pasos de subida a `public_html` + `.htaccess`; waitlist ahora apunta a **Formspree** opcional (`NEXT_PUBLIC_FORMSPREE`) con fallback localStorage y botón WhatsApp; actualizados README/.gitignore. Verificado: build genera `out/` completo (30 HTML). **Impacto:** despliegue inmediato en GoDaddy sin backend; la Fase 1 productiva (real, con BD) requiere migrar a VPS/Node según backlog. | ⏳ Ejecutado, pendiente validación humana |
| 13/08/2026 | 1.6 | **Build de PRODUCCIÓN listo + paquetes ZIP (para lanzamiento):** ✅ Contacto centralizado en `lib/config.ts` (email, WhatsApp `waLink()`, formspree) y migrado en landing/footer/marketplace/panel/asesoria/laboratorio. ✅ Textos de demo eliminados del código visible (0 menciones "demo/simulado/próximamente/MVP" en el build verificado): afiliate, asesoría (agendado ahora confirma por WhatsApp), EUDR, factura, precios, servicios, laboratorio, panel (liberación de escrow ahora es CTA WhatsApp). ✅ `npm run build` → `out/` completo; creados en `dist/`: **`redcafe-produccion-public_html.zip`** (sitio listo para `public_html`, incluye LEEME_PRODUCCION.txt) y **`redcafe-fuente-v2.zip`** (código fuente). Verificado: zip íntegros, rutas 200, sin "demo". | ✅ Build entregado; pendiente validación humana antes de subir |
| 13/08/2026 | 1.7 | **E0.5 — Borradores legales listos para revisión:** ✅ `docs/LEGAL/` con `POLITICA_PRIVACIDAD.md` (LOPDP: responsable, finalidades, legitimación, ARCO+, seguridad, transferencias, cookies), `TERMINOS_CONDICIONES.md` (naturaleza de servicio, roles, marketplace, responsabilidad, jurisdicción), `CONTRATO_MEMBRESIA.md` (planes, cuota, renovación, terminación), `POLITICA_ESCROW.md` (retención/liberación/reversión, disputas, manejo de fondos — punto crítico: confirmar figura de agencia vs. intermediación financiera) e índice `README.md` con checklist de campos por completar. Guía 2 actualizada. **Queda para el abogado:** constitución S.A.S., validación/ajuste de cláusulas y campos [ ], decisión formal de escrow. | ⏳ Borradores entregados, pendiente revisión del abogado |
