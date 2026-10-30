# Red Café Ecuador — Modelo Financiero v1

**Entregable:** E0.4 (+ presupuesto E0.7)
**Fecha:** 13 de agosto de 2026
**Estado:** Versión inicial de planificación (validar con E0.1 antes de fijar precios)
**Método:** modelo simplificado de suscripción MRR con escenarios. Versionable en `app/servicios/finanzas` (interactivo) y este documento.

---

## 1. Supuestos generales

- Mercado potencial: ~67.500–105.000 familias productoras; objetivo moderado = captar 2% en año 3 (≈1.500 productores).
- Precios base de planes (ref.: PLANES en `lib/data.ts`): Semilla $3, Cosecha $12, Origen $30, Comprador $25, Granel $120.
- ARPU ponderado objetivo año 1: ≈ $6/mes; año 3: ≈ $9/mes (mezcla creciente de planes).
- Churn mensual objetivo: 5% (año 1) → 3% (año 3).
- CAC objetivo: < $25 (adquisición vía organizaciones, no publicidad paga pura).
- No hay comisión por transacción en el modelo base (fuente de diferenciación); los ingresos transaccionales (catación, destacados, financiación) se tratan como ingresos secundarios.

## 2. Escenarios de suscriptores

| Año | Conservador (arranque lento) | Base | Crecimiento |
|---|---|---|---|
| Año 1 | 400 | 700 | 1.200 |
| Año 2 | 1.200 | 2.200 | 3.800 |
| Año 3 | 2.400 | 4.000 | 6.500 |

## 3. Proyección financiera — escenario BASE

| Año | Suscriptores promedio | ARPU/mes | MRR (final) | ARR | Ingresos trans. (10% MRR) | Ingresos totales/año |
|---|---|---|---|---|---|---|
| Año 1 | 350 | $6,00 | $4.200 | $50.400 | $5.000 | ≈ $55.400 |
| Año 2 | 1.700 | $7,50 | $12.750 | $153.000 | $15.300 | ≈ $168.300 |
| Año 3 | 3.100 | $8,50 | $26.350 | $316.200 | $31.620 | ≈ $347.800 |

## 4. Costos operativos mensuales (régimen Fase 1–2)

| Concepto | Año 1 | Año 2 | Nota |
|---|---|---|---|
| Infraestructura (hosting, SaaS, pasarela) | $300 | $800 | Escala con transacciones |
| Soporte y comunidad (CS part-time) | $500 | $1.500 | 1 CS + promotores |
| Promotores de campo | $1.000 | $3.000 | Onboarding rural |
| Marketing | $400 | $1.500 | Canales WhatsApp/asociaciones |
| Legal/compliance | $200 | $400 | Renovaciones, contratos |
| Contenido academia + asesoría | $300 | $1.000 | Cursos, podcast |
| **Total mensual** | **$2.700** | **$8.200** | |
| **Margen operativo (base)** | ~+$1.500/mes (año 1 fin) | ~+$4.500/mes | Antes de devs/equipo |

> Nota: excluye costos de desarrollo y equipo fundador. La Fase 1 de desarrollo (E1.1 producción) se estima en **$27.000–55.000** (ver PLAN_DESARROLLO §3.5). El punto de equilibrio por suscripción es ~$2.700/20 ≈ 135 suscriptores de plan Cosecha-equivalente.

## 5. Economía unitaria

| Métrica | Fórmula | Valor objetivo |
|---|---|---|
| LTV | ARPU × vida útil (12 meses @ 5% churn) | ≈ $72–102 |
| CAC | Costo de adquisición por miembro | < $25 |
| Ratio LTV/CAC | LTV ÷ CAC | > 3 (objetivo 4) |
| Payback | CAC ÷ (ARPU − costo servicio) | < 6 meses |
| MRR | Suscriptores × ARPU | Creciente (tabla §3) |

## 6. Presupuesto Fase 1 (E0.7, desglose)

| Concepto | Rango (USD) |
|---|---|
| Desarrollo producción (backend, BD, pagos) | 18.000 – 36.000 |
| Diseño UX/UI (iteración app demo → prod) | 1.500 – 3.000 |
| QA y pruebas | 1.500 – 3.000 |
| Infraestructura 12 meses | 600 – 1.200 |
| Pasarela de pago + facturación (setup/fees) | 500 – 1.500 |
| Promotores y movilización piloto | 3.000 – 6.000 |
| Marketing lanzamiento | 1.000 – 2.500 |
| Legal (constitución, T&C, marca SENADI) | 800 – 1.500 |
| **Total Fase 1** | **27.000 – 55.000** |

**Financiamiento necesario antes de producción:** ≥ $30.000 (seed/bootstrapping + preventas) para cubrir Fase 1 base antes del break-even por suscripción (~135 membresías Cosecha-equivalentes).

## 7. Riesgos financieros y palancas

- **Riesgo precio:** si E0.1 muestra disposición < experiencia, bajar Semilla a $2 o financiar la membresía descontándola del escrow de la primera venta.
- **Riesgo churn:** mitigar con cursos nuevos mensuales, panel de precios y asesoría (valor continuo visible).
- **Palancas de ingresos secundarios:** catación verificada por lote ($5–10), destacados de lotes, espacios patrocinados, y luego financiación pre-cosecha (5–7% anual).

## 8. Nota de validación

Este modelo es **plan de trabajo, no compromiso**. Antes de fijar precios y pedir financiamiento se requieren: E0.1 (entrevistas), E0.5 (legal/fiscal) y validación del churn con el piloto real. El simulador interactivo en `app/servicios/finanzas` permite ajustar ARPU, churn y suscriptores.