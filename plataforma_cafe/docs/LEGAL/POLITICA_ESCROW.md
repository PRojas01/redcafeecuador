# POLÍTICA DE ESCROW Y RESOLUCIÓN DE CONFLICTOS

**Versión:** 1.0 · **Fecha:** [___]

> **ESTADO:** Borrador. Punto de especial revisión legal: en Ecuador, la retención de fondos de terceros puede constituir operación reservada al sistema financiero. La estructura propuesta es de **agencia entre partes** (la Red administra la custodia acordada contractualmente entre comprador y vendedor), no de intermediación financiera. Confirmar con abogado.

---

## 1. Definiciones
- **Escrow:** retención del pago de una compra en custodia hasta la conformidad.
- **Conformidad:** confirmación del comprador de que el lote recibido coincide con lo ofertado (calidad, cantidad, proceso).
- **Disputa:** desacuerdo entre las partes que impide la liberación o reversión.
- **Red:** administradora del acuerdo de custodia entre las partes.

## 2. Funcionamiento
2.1 Flujo propuesto:
1. Comprador solicita pedido; paga el monto.
2. El pago queda **retenido** (cuenta separada/no mezclada, o a través de pasarela con función de retención).
3. Productor despacha; comprador inspecciona.
4. **Conformidad →** la Red libera el pago al productor.
5. **Disconformidad →** inicia disputa (abajo).

2.2 Plazos sugeridos:
| Etapa | Plazo |
|---|---|
| Tiempo para confirmar conformidad tras entrega | **[5]** días calendario |
| Apertura de disputa | Antes del vencimiento de conformidad o ante producto defectuoso |
| Resolución de disputa por la Red | **[5]** días hábiles |
| Silencio del comprador (no confirma ni disputa) | En **[5]** días, ¿liberar automáticamente? → **decisión**: [ ] liberar | [ ] no liberar |

## 3. Estados del pedido (visibles a ambas partes)
`Solicitud → Pago retenido → Despacho → Conformidad/Liberación` o `→ Disputa → Resolución`.

## 4. Causales de reversión (devolución)
- Lote no coincide con la descripción publicada (variedad/proceso/cantidad).
- Daño físico crítico en transporte.
- Score/catación declarada significativamente distinta a la recibida (con evidencia).
- Falta de documentación (factura/trazabilidad) comprometida.

## 5. Procedimiento de disputa
1. Comprador presenta evidencia (fotos, guías, videos, mensajes) por WhatsApp/formulario.
2. Productor presenta su versión y evidencia de despacho conforme.
3. La Red evalúa en **[5]** días hábiles con criterios objetivos; puede pedir a un catador/auditor neutral (Manual de Soporte §3).
4. Resultados posibles: (a) liberar pago, (b) reversión total/parcial, (c) reposición acordada.
5. La parte incumplidora queda registrada; reincidencia → suspensión.

## 6. Manejo de fondos y prohibiciones
6.1 Los fondos en custodia no se usan para gastos de la Red ni se mezclan con ingresos propios.
6.2 La Red no dispone libremente de los fondos: libera o revierte según el acuerdo de partes.
6.3 **Revisión legal:** confirmar si para el volumen previsto se requiere convenio con una entidad autorizada (operador de pagos) o si la figura de agencia es suficiente en la práctica del piloto.

## 7. Registro y auditoría
7.1 Cada pedido y disputa queda registrado (número, estados, evidencia, resolución) para trazabilidad y auditoría.
7.2 Reporte mensual de métricas (tiempo de resolución, % de disputas, reincidencia).

## 8. Ejecución forzada
8.1 Acuerdos entre las partes que envuelvan montos relevantes (sugerencia **>$500**) ante dudas legales se escalarán al abogado de la Red.