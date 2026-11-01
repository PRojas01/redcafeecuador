# Plataforma de Afiliación del Café Ecuatoriano — Propuesta

**Versión:** 1.0
**Fecha:** 13 de agosto de 2026
**Estado:** Propuesta de diseño (pendiente de validación humana)

---

## 1. Resumen ejecutivo

Crear la primera **plataforma de afiliación integral** del sector cafetero ecuatoriano que conecta a **productores, vendedores (tostadores, exportadores, mayoristas) y compradores (cafeterías, supermercados, consumidores B2B y B2C)** bajo un modelo de suscripción mensual pequeña que da acceso a un ecosistema completo de servicios: **marketplace de café**, **capacitación**, **asesoría comercial** y **apoyo administrativo**.

A diferencia de los marketplaces tradicionales que cobran comisión por transacción (4–8%), el modelo de membresía genera **ingresos recurrentes predecibles** (MRR), baja la barrera de entrada para pequeños productores y alinea los incentivos: la plataforma solo crece si sus miembros venden más, se capacitan y se formalizan.

**Oportunidad:** Ecuador produce café arábiga y robusta de alta demanda internacional, pero el 80% de las fincas son menores a 5 ha, el rendimiento promedio (~5 qq/ha) es la mitad del potencial regional y solo ~10% de los productores están agremiados. Hay vacío claro de servicios integrados: nadie combina comercio + capacitación + asesoría en una sola afiliación.

---

## 2. Investigación de mercado — contexto Ecuador

### 2.1 Estructura del sector

| Dato | Valor | Fuente |
|---|---|---|
| Superficie cafetalera | ~60.000–193.000 ha (discrepancia de fuentes; censo 2002: 260.528 ha) | ANECAFÉ / MAGAP / II Censo |
| Variedades | Arábiga (66%), Robusta (31%) | MAGAP |
| Familias productoras | 67.500 – 105.000 | MAGAP |
| Tamaño promedio | 80% de fincas < 5 ha; 20% sin tierra legalizada | COFENAC |
| Asociatividad | Solo ~10% de caficultores agremiados | MAGAP |
| Rendimiento | ~5 qq café oro/ha (bajo; potencial 30–40) | MAGAP/FAO |
| Destino producción | 87% exportación, 13% consumo interno | MAGAP |
| Consumo per cápita | 0,8 → 1,05 kg (creciente 12–15% anual) | ANECAFÉ/USDA |
| Provincias | Manabí, Sucumbíos, Orellana, Loja (mayor producción) | COMEX |

### 2.2 Problemas diagnosticados

1. **Baja productividad:** manejo tradicional, cafetales viejos, sin asistencia técnica.
2. **Intermediación opaca:** el productor vende barato al intermediario; no conoce precios de mercado (ICE C, diferenciales).
3. **Falta de formalización:** ~20% sin tenencia legal; sin facturación ni historial crediticio.
4. **Capacidades administrativas ausentes:** "no tienen capacidades productivas ni administrativas para emprender un negocio agrícola rentable" (MAGAP).
5. **Desconexión con el mercado premium:** cafés de especialidad ecuatorianos (Geisha, Sidra, Typica en Loja/Zamora) no llegan a tostadores globales por falta de visibilidad y logística.
6. **Acceso a financiamiento nulo:** sin historial, sin garantías, los bancos no prestan al pequeño caficultor.

### 2.3 Tendencias favorables

- **Café de especialidad en auge:** segmento en EE.UU. $47.8B con crecimiento 9.5% anual; los consumidores pagan premium por origen verificable.
- **Trazabilidad exigida por la UE (EUDR):** a partir de dic/2025 (grandes) y dic/2026 (pequeñas), toda exportación a la UE requiere prueba de origen libre de deforestación con geolocalización. **Oportunidad:** plataforma que captura GPS de finca ofrece cumplimiento listo para EUDR, diferenciador enorme frente a canales tradicionales.
- **Direct trade en crecimiento:** 52% de tostadores considera el comercio directo "extremadamente valioso"; 77.8% lo valora alto o muy alto (Algrano).
- **Gobierno impulsa reactivación:** proyecto de 135.000 ha tecnificadas, programa de crédito e incentivos (MAGAP 2025–2026).
- **Dolarización:** estabilidad monetaria que facilita transacciones y pagos digitales.

---

## 3. Benchmark — plataformas similares (referencia para garantizar éxito)

### 3.1 Marketplaces B2B de café verde

| Plataforma | Modelo | Ingresos | Lecciones para nosotros |
|---|---|---|---|
| **Algrano** (Suiza, 2015, +$6.1M levantado) | Marketplace direct trade productor↔tostador; logística integrada; CRM para productores; financiación (finmid) | Comisión por transacción + servicios | La confianza (programa de vendedores verificados + seguro de calidad) es el motor. Las herramientas para productores (CRM) fidelizan más que el simple listado. El 90% del volumen 2024 vino de relaciones >1 año → **retención** es clave |
| **TYPICA** (Japón) | Red global direct trade, microlotes de 1 saco | Comisión | Bajar el pedido mínimo a 1 saco de 60 kg abrió el mercado a pequeños tostadores y productores |
| **Beyco** | Contratos verificados en blockchain; documentación EUDR | Gratis | La **trazabilidad como servicio** (no como feature) es un imán de compradores institucionales. Blockchain ≠ necesario en MVP; sí el registro de origen |
| **Kaffea-X** | Subastas con escrow, puntuación de calidad estandarizada | Comisión | El **escrow** resuelve la desconfianza de pagos entre desconocidos |
| **Genuine Origin / Royal Coffee** | Portales de importador con stock disponible | Margen importador | Dato de catación (cupping score) en el listado eleva confianza y precio |

### 3.2 Marketplaces nacionales de café (referencia regional)

| Plataforma | Modelo | Ingresos | Lecciones |
|---|---|---|---|
| **Compro Café de Colombia** (FNC, 2021) | Marketplace oficial de la Federación Nacional de Cafeteros; >50 marcas; logística Almacafé | Sin comisión al productor (subsidiado) | El respaldo institucional (FNC) generó confianza masiva. Pago directo al productor vía pasarela (ePayco). **No es sostenible sin subsidio → nuestro modelo de membresía sí lo es** |
| **Cafenlace** (FNC + Almacafé) | Plataforma digital de exportación | — | El Estado/gremio quiere estos servicios; alianza estratégica posible (ANECAFÉ, MAGAP) |
| **Byndo Market** (Colombia) | Marketplace mayorista B2B multinicho | Comisión | Modelo generalista; los nichos de café necesitan expertise |

### 3.3 Modelos de suscripción / membresía (el "cómo cobramos")

| Plataforma | Modelo | Lección |
|---|---|---|
| **Trade Coffee** (B2C) | Suscripción mensual de café tostado; 435.000+ clientes | La suscripción genera MRR predecible y lealtad; el pago mensual "pequeño" es psicológicamente fácil |
| **Digital House / Kajabi** (membresías educativas) | Suscripción mensual/anual con contenido + asesoría + comunidad | La combinación **contenido + asesoría + comunidad** justifica el cobro recurrente. Dashboard de progreso retiene |
| **Amazon FBA / Prime** | Suscripción de vendedores (FBA) + clientes (Prime) | Doble cara de suscripción (vendedor paga por servicios de fulfillment; cliente paga por beneficios) maximiza el modelo |
| **nurture.farm** | Plataforma agro con advisory + trazabilidad | Servicios de asesoría agrícola digital son adoptados por pequeños productores si la interfaz es simple (WhatsApp-first) |

### 3.4 Conclusiones del benchmark (factores de éxito confirmados)

1. **La confianza se construye con verificación y escrow**, no con marketing. (Algrano, Kaffea-X)
2. **La retención > adquisición:** relaciones de largo plazo generan la mayor parte del volumen. (Algrano: 90% volumen de relaciones >1 año)
3. **Trazabilidad + EUDR es un diferenciador de venta**, exigible por el principal mercado de exportación. (Beyco, Cropster)
4. **Pedido mínimo bajo** abre el mercado a pequeños actores. (TYPICA: 1 saco)
5. **El respaldo institucional importa:** la FNC hizo con subsidio lo que podemos hacer sostenible con membresía.
6. **La suscripción funciona mejor cuando agrupa servicios de necesidad continua** (comercio + capacitación + asesoría), no solo un listado.

---

## 4. Propuesta de valor

### 4.1 La plataforma

**Ecosistema de afiliación para el café ecuatoriano** con 3 perfiles de usuario y servicios en 4 pilares:

```
                    ┌─────────────────────────────────────┐
                    │      PLATAFORMA DEL CAFÉ (EC)       │
                    │   Modelo de afiliación mensual      │
                    └───────────────┬─────────────────────┘
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
   ┌──────────┐              ┌──────────────┐           ┌─────────────┐
   │PRODUCTOR │              │  VENDEDOR    │           │  COMPRADOR  │
   │ (fincas) │              │(tostador,    │           │(cafetería,  │
   │          │              │ exportador,  │           │ supermercado,│
   │          │              │ mayorista)   │           │ B2B, B2C)   │
   └──────────┘              └──────────────┘           └─────────────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   ▼
        ┌──────────────────────────────────────────────────┐
        │            4 PILARES DE SERVICIOS                 │
        │ 1. Marketplace (compra/venta con escrow)          │
        │ 2. Capacitación (academia virtual)                │
        │ 3. Asesoría comercial (matchmaking, precios,      │
        │    negociación, certificaciones, EUDR)            │
        │ 4. Apoyo administrativo (facturación, contabilidad│
        │    simple, registros, formalización)              │
        └──────────────────────────────────────────────────┘
```

### 4.2 Valor por perfil

**Productor (caficultor):**
- Vender directamente a tostadores y cafeterías sin intermediarios opacos.
- Visibilidad en escaparate digital con perfil de finca, fotos, GPS y datos de calidad.
- Acceso a micro-lotes y lotes completos con pedido mínimo bajo (desde 1 saco).
- Capacitación en buenas prácticas, post-cosecha, catación, manejo de plagas.
- Asesoría para certificaciones (orgánico, comercio justo, Rainforest) y cumplimiento EUDR.
- Apoyo para formalizarse: facturación, RUC simplificado, registro sanitario.
- Pago garantizado vía escrow (fondo en custodia hasta despacho conforme).

**Vendedor (tostador / exportador / mayorista):**
- Abastecimiento verificado con catación (cupping score) y trazabilidad GPS.
- Comparación de ofertas de múltiples fincas en un solo lugar.
- Cumplimiento EUDR documentado para exportación a la UE.
- Capacitación en tueste, blending y tendencias de consumo.
- Gestión de pedidos y logística integrada.

**Comprador (cafetería / supermercado / consumidor B2B / B2C):**
- Origen garantizado, historia de la finca y transparencia de precio.
- Compras por suscripción (café del mes) con entrega programada.
- Respaldo de calidad (muestras de catación antes del pedido grande).

### 4.3 Diferenciadores frente a la competencia

| Criterio | Marketplaces B2B (Algrano, TYPICA) | Marketplaces nacionales (Compro Café FNC) | **Nuestra plataforma** |
|---|---|---|---|
| Alcance | Global, inglés-first | Solo B2C nacional | **B2B + B2C + servicio en español**, foco Ecuador |
| Modelo de ingresos | Comisión por transacción | Subsidiado | **Membresía mensual recurrente (MRR)** |
| Capacitación | Talleres puntuales pagados | No | **Academia incluida en la membresía** |
| Asesoría comercial | Parcial | No | **Incluida (precios, negociación, certificaciones)** |
| Apoyo administrativo | No | Logística centralizada | **Facturación, contabilidad simple, formalización** |
| Sostenibilidad | Depende del volumen | Depende del subsidio | **Predecible y escalable** |

---

## 5. Modelo de negocio — afiliación mensual

### 5.1 Estructura de planes (propuesta inicial, validable en campo)

Principio: el productor paga poco (acceso a mercado que nunca tuvo), el vendedor/comprador paga más (porque transacciona). Tarifa plana con niveles.

| Plan | Perfil | Costo mensual (USD) | Beneficios clave |
|---|---|---|---|
| **Semilla** | Productor | $ 3 – 5 | Escaparate digital, 3 lotes activos, acceso a capacitación básica, chat con compradores |
| **Cosecha** | Productor | $ 10 – 15 | Todo lo anterior + lotes ilimitados, asesoría comercial 1:1 mensual, apoyo formalización (facturación, RUC), descuento en certificaciones |
| **Origen** | Vendedor (tostador/exportador) | $ 25 – 40 | Ofertas verificadas con catación, trazabilidad GPS/EUDR, logística integrada, capacitación de tueste, 3 sub-cuentas |
| **Comprador Profesional** | Cafeterías / mayoristas | $ 20 – 30 | Pedidos por suscripción, muestras de catación, historial de proveedores, facturación automática |
| **Granel / Empresa** | Cadenas, supermercados, exportadores grandes | $ 80 – 150 | Cuenta multiusuario, API, reportes, servicio prioritario, contratos anuales |

> **Precios de referencia del mercado:** Algrano cobra comisión por transacción; Compro Café de Colombia no cobra comisión (subsidio); Trade Coffee cobra $21.99–49.99 por suscripción de café. Nuestros precios deben validarse con 30–50 entrevistas a usuarios reales antes de fijarlos (ver §8).

### 5.2 Ingresos (mix)

1. **Suscripciones mensuales (MRR)** — núcleo del modelo (70% objetivo).
2. **Servicios adicionales (transaccionales, opcionales):** certificación de catación por lote, verificación premium, diseño de marca/empaque, espacios destacados ("destacados").
3. **Comisión baja opcional en transacciones B2B grandes** (1–2%) — para "granel", como incentivo de descuento en la cuota.
4. **Financiación futura:** spread por financiamiento de pre-cosecha a productores (modelo finmid/Algrano).

### 5.3 Economía unitaria (ejemplo año 3)

Supuestos: 4.000 suscriptores promedio (2.500 productores, 900 vendedores, 600 compradores).

| Métrica | Valor |
|---|---|
| ARPU ponderado | ~$ 9,5/mes |
| MRR | ~$ 38.000 |
| ARR | ~$ 456.000 |
| Churn mensual objetivo | < 3% |
| LTV estimado (12 meses de retención) | ~$ 114 |
| CAC objetivo (membresía) | < $ 25 (adquisición rural vía organizaciones, no publicidad paga) |

> Validación financiera detallada (flujo de caja, break-even, escenarios) queda pendiente de modelar en la fase de desarrollo del plan de negocio.

---

## 6. Plataforma tecnológica — funcionalidades por fases

### 6.1 Principios de diseño

- **Mobile-first + WhatsApp-first:** el caficultor ecuatoriano usa WhatsApp, no apps complejas. Botón "vender/consultar" abre WhatsApp.
- **Bilingüe** (español / inglés para compradores internacionales).
- **Offline-tolerant:** registro de datos de finca con sincronización posterior.
- **Escrow integrado** desde el MVP (custodia del pago hasta conformidad).
- **Trazabilidad con GPS** desde el registro de finca (habilitador EUDR).
- **Monedero digital simple** (pagos vía pasarela local: payphone/daviplata/PayPal/transferencia).

### 6.2 Roadmap de producto

**Fase 0 — MVP (4–6 meses):**
- Registro y perfiles de los 3 roles.
- Escaparate de lotes con foto, variedad, proceso, catación y precio.
- Solicitud de compra + chat integrado (WhatsApp).
- Pasarela de pago + escrow básico.
- Academia con 10 cursos en video (producción, post-cosecha, ventas).
- Módulo de facturación electrónica simple (SRI) para miembros.

**Fase 1 — Crecimiento (meses 6–12):**
- Trazabilidad GPS + exportación de reporte EUDR (dossier por lote).
- Catación verificada (laboratorios aliados: ANECAFÉ, universidades, catadores certificados).
- Logística integrada (cotización de envío, tracking).
- Suscripciones de compra (café del mes) para cafeterías.
- Asesoría comercial 1:1 programada (video/telefonía) y panel de precios ICE C.

**Fase 2 — Escalado (año 2+):**
- Marketplace internacional (compradores UE/EE.UU./Asia) con oferta en inglés.
- Financiación pre-cosecha (partners financieros / fintech).
- App nativa (Android primero) con modo offline.
- Datos/analítica por finca (rendimiento, precios históricos).
- API B2B para exportadores y cadenas.

---

## 7. Estrategia de lanzamiento (Go-to-Market)

1. **Aterrizar en las organizaciones existentes primero:** las ~88 asociaciones territoriales y federaciones regionales son la puerta de entrada (solo 10% agremiados → el 90% es crecimiento orgánico vía boca a boca).
2. **Alianzas institucionales:** ANECAFÉ, MAGAP (programa de reactivación), PRO ECUADOR, COFENAC. El respaldo institucional generó confianza masiva en Colombia (FNC) — replicarlo.
3. **Piloto territorial:** 1 provincia (Loja/Zamora: café de especialidad; o Manabí: volumen) con 100 productores + 20 tostadores/cafeterías antes de escalar.
4. **Ancla de demanda:** firmar primero compradores (tostadores y cafeterías de Quito/Guayaquil/Cuenca y exportadores) para que la oferta (productores) quiera unirse.
5. **Onboarding asistido:** promotores de campo que registran fincas y fotografían lotes por el productor.
6. **Contenido que vende:** cursos y webinars gratis abiertos (lead magnet) para convertir asistentes en suscriptores.
7. **Precio de lanzamiento:** primer mes gratis / anual -20% para acelerar conversión.

---

## 8. Validación antes de construir (próximos pasos)

1. **30–50 entrevistas** a productores (Loja, Zamora, Manabí, Sucumbíos), tostadores y cafeterías. Objetivo: validar disposición a pagar, dolores reales y precio.
2. **Landing page + waitlist** (3.000 sign-ups objetivo) para medir demanda real antes del MVP.
3. **Prototipo de baja fidelidad** del escaparate y flujo de venta; testear con usuarios reales (usability test rural).
4. **Modelo financiero** en hoja de cálculo (MRR, churn, CAC, break-even, 3 escenarios).
5. **Definir forma legal** en Ecuador (S.A.S. o Cía. Ltda.), y validar: facturación electrónica SRI, manejo de pagos internacionales, normativa de escrow y fintech (Junta de Política y Regulación Monetaria).
6. **Registrar marca y dominio.**
7. **Decidir socios:** laboratorio de catación certificado, transportadora, pasarela de pago, proveedor de video.

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Baja disposición a pagar del productor | Alta | Plan Semilla a $3–5; pago anual con descuento; financiar membresía con la primera venta (descontar del escrow) |
| Churn alto (suscripciones) | Media | Valor continuo visible: cursos nuevos, precios del día, asesorías; encuestas de salida |
| Conectividad rural limitada | Media | WhatsApp-first, modo offline, promotores de campo |
| Desconfianza en pagos | Media | Escrow desde MVP, seguro de calidad, cuentas verificadas |
| Competencia con canales tradicionales (intermediarios) | Media | Mejor precio al productor + servicios que el intermediario no da |
| Escalamiento sin liquidez | Media | Cobro anual anticipado, rondas de inversión, préstamos fintech |
| Cambios regulatorios (SRI, fintech, EUDR) | Baja | Asesoría legal continua, arquitectura flexible |

---

## 10. Roadmap general

| Fase | Duración | Hitos |
|---|---|---|
| **0. Validación** | 2 meses | Entrevistas, waitlist, modelo financiero, forma legal |
| **1. MVP** | 4–6 meses | Marketplace + escrow + academia + facturación; piloto 100 productores |
| **2. Crecimiento** | 6–12 meses | Trazabilidad EUDR, catación verificada, logística, suscripción B2C |
| **3. Escalado** | 12–24 meses | Internacionalización, financiación, app, API |

---

## 11. Conclusión

La combinación que el mercado **no ofrece hoy en Ecuador** es: *un solo punto de afiliación mensual que resuelva comercio + capacitación + asesoría + administración*. Los benchmarks globales (Algrano, TYPICA, Beyco) prueban que el comercio directo de café funciona y que la trazabilidad vende; los nacionales (Compro Café de Colombia) prueban que el respaldo institucional genera confianza; y los modelos de suscripción (Trade, Kajabi, Amazon) prueban que el cobro recurrente es sostenible. Nuestra plataforma une las tres lecciones en un modelo de membresía, enfocado en el mercado hispanohablante ecuatoriano y sin depender de subsidios.

**Siguiente acción recomendada:** aprobar esta propuesta e iniciar la Fase 0 de validación (entrevistas + landing page + modelo financiero).
