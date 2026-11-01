# ÍNDICE LEGAL — Red Café Ecuador

**Estado:** Borradores listos para revisión legal (E0.5). Completar campos [ ] y ajustar con abogado antes de publicar. La página pública **`/legal`** ya está construida y enlazada en el footer con base en estos borradores.

| Documento | Archivo | Contenido clave |
|---|---|---|
| Política de Privacidad (LOPDP) | `docs/LEGAL/POLITICA_PRIVACIDAD.md` | Responsable, datos y finalidades, bases de legitimación, derechos ARCO+, seguridad, transferencias, cookies |
| Términos y Condiciones | `docs/LEGAL/TERMINOS_CONDICIONES.md` | Naturaleza del servicio, roles, marketplace, responsabilidad, jurisdicción |
| Contrato de Membresía | `docs/LEGAL/CONTRATO_MEMBRESIA.md` | Planes, cuota, renovación, obligaciones, terminación |
| Política de Escrow y Conflictos | `docs/LEGAL/POLITICA_ESCROW.md` | Retención/liberación/reversión, disputas, manejo de fondos |
| Política de Devoluciones (resumen) | ver POLITICA_ESCROW.md §4 (causales) | Reversión por disconformidad |

## En la aplicación
- Página pública: **`/legal`** (`app/legal/page.tsx`) con secciones Privacidad, Términos, Membresía, Escrow y Contacto.
- Enlaces en el footer (`components/Footer.tsx`): columnas "Info legal" + enlace inferior "Información legal".
- Reconstruir el build y los ZIP tras cualquier cambio en `app/legal/`.

## Campos a completar por el negocio
- [ ] Razón social y RUC de la empresa (Guía 2 — constitución S.A.S.)
- [ ] Domicilio y jurisdicción
- [ ] Correo/WhatsApp de contacto para derechos y notificaciones
- [ ] Montos de planes (validar con E0.1/MODELO_FINANCIERO)
- [ ] Plazos (conformidad, disputas, impago) a confirmar
- [ ] Decisión escrow: Opción A (agencia interna+cuenta separada) vs B (operador de pagos autorizado)
- [ ] Cláusulas de mediación previa y jurisdicción

## Pendientes legales adicionales (no redactados aquí)
- [ ] Política de Cookies / aviso web (si se añaden análisis de terceros)
- [ ] Avisos de consentimiento (checkbox activo en registro/waitlist)
- [ ] Registro de actividades de tratamiento (art. 24 LOPDP) y designación de DPO si aplica
- [ ] Notificación/inscripción ante la autoridad de datos personales si corresponde por el volumen
- [ ] Defensa del consumidor (LODC) aplicable a compradores finales