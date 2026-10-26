# Guía de Acciones Manuales — Red Café Ecuador

**Propósito:** convertir todos los pendientes que requieren acción humana (Fase 0) en **guías paso a paso implementables**. No son ideas: son scripts, plantillas y checklists listos para ejecutar.

**Versión:** 1.0 · **Fecha:** 13 de agosto de 2026
**Cubre:** E0.1 (entrevistas), E0.5 (legal), E0.6 (piloto), E0.8 (marca), E0.7 (financiamiento)

---

## GUÍA 1 — E0.1 Entrevistas de campo (30–50 entrevistas)

> **Objetivo:** validar dolores y disposición a pagar de los 3 perfiles antes de congelar precios o construir más.
> **Meta:** 25 productores · 15 vendedores/tostadores · 10 compradores/cafeterías.
> **Provincias:** Loja, Zamora Chi., Manabí, Sucumbíos.

### 1.1 Preparación (Días 0–3)
1. Crear cuenta de correo dedicada (ej. `investigacion@redcafeecuador.com`).
2. Preparar grabadora de voz (celular) con consentimiento verbal grabado.
3. Imprimir: plantilla de captura (§1.3), tarjetas de precios (§1.4), hoja de consentimiento.
4. Confirmar contactos con asociaciones territoriales + ANECAFÉ (WhatsApp 2 días antes).

### 1.2 Guion de apertura (leer siempre igual, 30 seg)
> *"Somos Red Café Ecuador, una red de afiliación que conecta productores, vendedores y compradores de café. Queremos entender cómo vende/compra usted hoy, nada más. No le voy a vender nada; son 30 minutos, con su permiso grabo para no perder detalle. ¿Podemos empezar?"*

### 1.3 Plantilla de captura (formato de campo)

```
# ___ | Perfil: [ ]Productor [ ]Vendedor [ ]Comprador | Fecha: ___ | Provincia: ___
1. ¿Cómo vende/compra hoy? (canal) ___
2. Precio que recibe/paga por qq o libra: $___
3. ¿Cuál es su mayor problema? (1 frase) ___
4. ¿Ha usado alguna app/red similar? ¿Cuál y qué opinión? ___
5. Disposición a pagar (Van Westendorp):
   - Muy barato: $___   - Barato pero bueno: $___
   - Caro pero lo consideraría: $___   - Demasiado caro: $___
6. ¿Qué servicio le importa más? (1=marketplace, 2=capacitación, 3=asesoría, 4=trámites) ___
7. ¿Preferiría pagar mensual o por uso? ___
8. Consentimiento: [ ] grabado   [ ] acepta seguimiento
Nota libre: ___
```

### 1.4 Tarjetas de precios (Van Westendorp impreso)
**Productor/Vendedor:** $3 / $8 / $15 / $40 al mes
**Comprador/Cafetería:** $15 / $25 / $50 / $120 al mes
Mostrar las 4 y preguntar las 4 posiciones (punto 5 de la plantilla).

### 1.5 Síntesis (Días 5–7 tras cada salida)
1. Pasar notas a hoja compartida con columnas de plantilla §1.3.
2. Clasificar respuestas del punto 3 en categorías (affinity mapping): medio de pago, precio, falta de mercado, calidad, formalización, logística.
3. Calcular: % dispuesto a pagar ≥ plan base; rango de precio justo (mediana barato/caro).
4. Documentar como **INFORME_E01.md** con tabla de hallazgos por perfil.

### 1.6 Criterio de salida (no seguir hasta cumplir)
- [ ] 30–50 entrevistas completas
- [ ] Conclusión clara de DAP por perfil (disposición a pagar)
- [ ] Top 5 dolores priorizados por perfil
- [ ] Informe `INFORME_E01.md` guardado en repo

---

## GUÍA 2 — E0.5 Decisión legal y fiscal

> **Objetivo:** constituir la persona jurídica, cumplir SRI y resolver el estatus del escrow en Ecuador.

### 2.1 Checklist de constitución (S.A.S. recomendada)
1. [ ] Reservar nombre en **Superintendencia de Compañías** (consulta gratuita en línea).
2. [ ] Elaborar minuta de constitución con abogado (costo aprox. $200–500).
3. [ ] Apertura de **cuenta de aportes** (RUC provisional + certificado de depósito).
4. [ ] Protocolización en notaría y registro mercantil.
5. [ ] Obtener RUC (SRI) definitivo con actividades económicas incluidas: comercio (marketplace), servicios de educación (academia) y asesoría.
6. [ ] Trámite de **firma electrónica** (Security Data como entidad certificadora).
7. [ ] Alinear con **facturación electrónica SRI** (software propio o proveedor emisor autorizado: Datafast, Meas, etc.).

### 2.2 Decisión escrow (documentada, elegir una opción)
| Opción | Descripción | Riesgo/complejidad | Recomendada |
|---|---|---|---|
| A. Escrow interno + cuenta de respaldo | Retener fondos en cuenta dedicada no mixta; liberación manual | Media; no es "mezcla de clientes" | ✅ Fase 1 |
| B. Operador de pagos/Escrow autorizado | Entidad regulada provee custodia (más costosa) | Baja; requiere contrato con tercero | Fase 2+ |
| C. Depósito previo entre partes | Sin custodia de la plataforma; contrato privado | Alta; menos protección | Evitar |

**Acción inmediata:** el abogado debe emitir **dictamen de cumplimiento** para la opción elegida.

### 2.3 Documentos a contratar (solicitar presupuesto a abogado)

> **🧾 BORRADORES LISTOS para revisión** (13/08/2026, en `docs/LEGAL/`): `POLITICA_PRIVACIDAD.md` (LOPDP), `TERMINOS_CONDICIONES.md`, `CONTRATO_MEMBRESIA.md`, `POLITICA_ESCROW.md` e índice `README.md`. Úsalos como insumos para conseguir presupuesto cerrado y revisión del abogado; completar los campos [ ] antes de publicarlos.

- [ ] Minuta de constitución S.A.S. (no redactada — la prepara el abogado)
- [ ] Términos y Condiciones de la plataforma — 🧾 borrador listo
- [ ] Política de Privacidad y tratamiento de datos (Ley Orgánica de Protección de Datos) — 🧾 borrador listo
- [ ] Contrato de membresía por rol (productor/vendedor/comprador) — 🧾 borrador único con roles; el abogado puede segmentarlo
- [ ] Política de escrow (retención, liberación, reversión) — 🧾 borrador listo (revisar con sello legal la figura de agencia vs. intermediación financiera)
- [ ] Política de devoluciones y resolución de conflictos — 🧾 incluida en POLITICA_ESCROW.md §4–5

### 2.4 Criterio de salida
- [ ] Empresa constituida con RUC activo
- [ ] Dictamen legal de cumplimiento escrow (opción A o B)
- [ ] Documentos contractuales listos para el piloto
- [ ] Facturación electrónica operativa (sandbox al menos)

---

## GUÍA 3 — E0.6 Piloto definido

> **Objetivo:** provincia + socios piloto comprometidos con **carta de intención**.

### 3.1 Selección de provincia (1 semana)
1. Calificar candidatas con este score (0–5) según: | Criterio | Peso |
   |---|---|
   | Densidad de productores cerca | 25% |
   | Acceso logístico (carretera) | 20% |
   | Organizaciones/asociaciones activas que faciliten contacto | 25% |
   | Presencia de tostadores/cafeterías | 15% |
   | Interés comercial mostrado (pre-contactos) | 15% |
2. Elegir la de mayor puntaje; anotar elección y razón.

**Recomendación inicial (de PROPUESTA):** Loja/Zamora (productores+tostadores) o Manabí (volumen). Validar con E0.1.

### 3.2 Plantilla de Carta de Intención (entregar impresa y en PDF)

```
[CIUDAD], [FECHA]

A: Red Café Ecuador
De: [NOMBRE / ORGANIZACIÓN]
RUC/CI: [____]

Manifiesto mi interés en participar como [productor / vendedor-tostador / comprador-cafetería]
del **piloto de la Red Café Ecuador** en [PROVINCIA], durante el período [MES A – MES B].

Entiendo que el piloto incluye: publicación/compra de lotes de café, capacitación básica
(10 cursos), asesoría comercial y facturación electrónica (SRI). Los montos de suscripción
serán los publicados en el lanzamiento.

Dispongo de aproximadamente [X] quintales/libra al mes para [vender/comprar].

Quedo a disposición para coordinar los detalles operativos con el equipo de la Red.

Firma y nombre: ______________________
Teléfono/WhatsApp: __________________
```

**Meta:** 3 cartas firmadas (1 productor, 1 tostador/vendedor, 1 cafetería).

### 3.3 Primer acercamiento (script WhatsApp, enviar perfil `comprador` correcto)
> *"Buenos días [Nombre], soy [Promotor] de Red Café Ecuador. Estamos armando el piloto en [Provincia]: su finca/negocio registrada a cambio de [publicación de lotes / catación / capacitación]. ¿Le interesa una llamada de 15 min esta semana?"*

### 3.4 Criterio de salida
- [ ] Provincia seleccionada (documentada)
- [ ] 3 cartas de intención firmadas
- [ ] Lista de 10 contactos extra para el rollout
- [ ] Cronograma de incorporación (arranca con E1.1 productivo)

---

## GUÍA 4 — E0.8 Marca (registro + dominios)

> **La marca ya definida:** Red Café Ecuador (identidad en `MARCA_IDENTIDAD_VISUAL.md`). Falta protegerla.

### 4.1 Registro de dominio (1 día)
1. Consultar en **NIC.EC** (nombres de dominio `.com.ec`, `.net.ec`, etc.).
2. Registrar `redcafeecuador.com.ec` (prioridad) + `redcafeecuador.com` (internacional).
3. Usar datos de la empresa constituida (Guía 2).
4. Concentrar: email institucional en ese dominio (no usar gmail para la marca).

### 4.2 Registro de marca (SENADI) — 2 a 4 meses
1. Búsqueda fonética/figurativa de "RED CAFÉ ECUADOR" y variantes (base de datos SENADI, gratuito).
2. Clase de producto a registrar: **Clase 35** (servicios de comercialización/marketplace) y **Clase 41** (educación/formación, academia). Evaluar Clase 9 (app) si aplica.
3. Solicitar cancelación de marcas en conflicto (si las hay) o elegir variante con `MARCA_OPCIONES.md`.
4. Presentar solicitud (presupuesto aprox. $200–400 incl. tasas y honorarios).
5. Seguimiento hasta título de concesión; renovación a los 10 años.

### 4.3 Logo final
1. Tomar el concepto de `MARCA_IDENTIDAD_VISUAL.md` (café + planta + estela de grano y colores café/crema/oro).
2. Contratar logo en vectores (SVG + PNG + favicon) por plataformas locales (presupuesto $80–300) o diseñar/refinar internamente.
3. Aplicarlo a: landing (reemplazar texto por logo), favicon, plantilla de email, WhatsApp business, material impreso del promotor.

### 4.4 Criterio de salida
- [ ] Dominio registrado y activo (apuntando al sitio)
- [ ] Solicitud de marca presentada en SENADI (n.º de trámite)
- [ ] Logo en vectores aplicado a landing y materiales

---

## GUÍA 5 — E0.7 Financiamiento (Σ$27–55k Fase 1)

> **Presupuesto completo en `MODELO_FINANCIERO.md` §6.** Necesidad mínima: **≥$30.000** antes de producción (split en 2 tramos recomendado).

### 5.1 Opciones de financiación (elegir 2–3 a perseguir)
| Fuente | Monto típico | Esfuerzo | Notas |
|---|---|---|---|
| Bootstrapping (ingresos de serv. / ahorro) | Parcial | Bajo | Financia Fase 0 |
| **Concursos de emprendimiento / aceleradoras** | $10–50k | Medio | Applica a CONQUITO/EMPRENDE, YEI, programas MAG. Cafetalera: premiar agricultura sostenible |
| **Fondos de innovación agro (agtech)** | $25–100k | Alto | BUSCAR: concursos de agtech Ecuador/Latam |
| Inversión ángel / FFF | $20–50k | Medio | Pitch 1-pager (§5.3) |
| Cooperativas/gremios (ANECAFÉ, PCID) | Técnico + crédito | Bajo | Validan y abren canales |

### 5.2 Actividades (semana 1–2)
1. Hacer pitch de 1 página (plantilla §5.3) y deck de 8 láminas.
2. Listar 10 programas con fecha límite (crear calendario).
3. Postular a los 3 más probables (documentar fechas).
4. Preparar listín de contactos de inversores agtech/agro.

### 5.3 Plantilla pitch 1 página
```
Red Café Ecuador — resumen de inversión
Problema: intermediarios capturan el margen del café; productor gana poco y sin formalización.
Solución: membresía mensual (marketplace + academia + asesoría + trámites).
Modelo: MRR, 5 planes ($3–120/mes). (Ver MODELO_FINANCIERO.md)
Tracción: [n.º] entrevistas, [n.º] waitlist, 1 piloto con 3 SI — [fecha].
Uso de fondos ($30k): 60% desarrollo MVP, 15% promotores, 10% legal/marca, 10% marketing, 5% reserva.
Métricas clave: CAC <$25 · LTV ≈ $22–96 · break-even < 18 meses.
Pedido: $___ por [%] de la empresa / participac. convertible.
Contacto: [nombre] · [teléfono/WhatsApp] · [dominio]
```

### 5.4 Criterio de salida
- [ ] Pitch + deck listos (repositorio raíz, `PITCH.md`)
- [ ] 3 postulaciones a programas enviadas (documentadas)
- [ ] ≥1 línea de financiamiento comprometida (semilla/tramo 1 ≥ $15k) o plan de bootstrapping validado

---

## RESUMEN EJECUTIVO — orden de ejecución recomendado

| # | Guía | Inversión típica | Ventana | Desbloquea |
|---|---|---|---|---|
| 1 | Guía 1 (entrevistas) | 2–4 semanas, $0–200 | Ya | Precios y todo el plan |
| 2 | Guía 4 (dominio + logo) | $80–300 + 1 semana | Ya | Waitlist real (E0.3) |
| 3 | Guía 3 (piloto) | 2–4 semanas | Tras arrancar E0.1 | Carta de intención |
| 4 | Guía 2 (legal) | 4–8 semanas, $500–1500 | Tras E0.1/E0.6 | Constitución + escrow |
| 5 | Guía 5 (financiamiento) | 4–8 semanas | En paralelo (día 1) | Fase 1 productiva |

> **Regla:** el arranque del código productivo (E1.1) se dispara solo cuando se cumplan los criterios de salida de las guías 1 y 3 (evidencia de mercado + piloto).