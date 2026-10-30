# Firma de Propiedad y Uso — Red Café Ecuador

> Documento que establece formalmente la propiedad del software, activos de
> marca, datos y permisos de uso de la plataforma Red Café Ecuador.

---

## 1. PROPIETARIO

| Campo                  | Valor                                     |
|------------------------|-------------------------------------------|
| **Persona / Razón social** | Pedro Rojas — SolucionesPro            |
| **País**               | Ecuador                                   |
| **Sitio**              | https://redcafeecuador.com                |
| **Contacto legal**     | info@redcafeecuador.com                   |

SolucionesPro es propietaria del código fuente, la marca, el modelo de negocio
y todos los activos intangibles asociados al producto "Red Café Ecuador".

---

## 2. PROPIEDAD INTELECTUAL Y ACTIVOS

### 2.1 Marca y nombre comercial

- **Nombre comercial:** Red Café Ecuador
- **Dominio principal:** redcafeecuador.com
- **Tagline:** "La red que conecta tu café con más mercado"
- **Logos, paleta de colores y elementos gráficos:** autoría de SolucionesPro.

El uso no autorizado del nombre, marca o logos está prohibido y puede
constituir infracción de derechos de propiedad intelectual conforme a la
**Ley de Propiedad Intelectual de Ecuador** y la **Decisión 486 de la CAN**.

### 2.2 Código fuente

- **Frontend (Next.js 15, React 19, TypeScript, Tailwind v4):** autoría de
  SolucionesPro. Licencia: MIT (ver LICENSE).
- **Backend PHP (8 archivos en `public/api/`):** autoría de SolucionesPro.
  Licencia: MIT.
- **Datos seed (`public/data/lotes.json`, etc.):** autoría de SolucionesPro,
  con fines demostrativos. No representan fincas reales.

### 2.3 Contenidos legales

Los siguientes documentos son autoría de SolucionesPro y cumplen con la
**Ley Orgánica de Protección de Datos Personales (LOPDP)** del Ecuador:

- Política de Privacidad (`/politica-de-privacidad`)
- Política de Uso de Datos (`/politica-de-uso-de-datos`)
- Política de Cookies (`/politica-de-cookies`)
- Términos y Condiciones (`/terminos-y-condiciones`)

Estos textos NO pueden ser reutilizados en plataformas de terceros sin
autorización escrita.

### 2.4 Logos y marcas de terceros

El proyecto puede referenciar marcas de terceros con fines informativos
(FedEx, Mastercard, Visa, Spotify, etc.). Dichas marcas pertenecen a sus
respectivos titulares y su mención no implica asociación ni patrocinio.

---

## 3. DATOS Y PRIVACIDAD

### 3.1 Datos de miembros

- **Propiedad:** Los datos publicados por cada miembro (lotes, descripciones,
  fotos, cataciones) pertenecen al miembro que los publica. La plataforma
  solo los aloja y exhibe conforme a los Términos aceptados.

- **Encargado del tratamiento:** Red Café Ecuador (SolucionesPro) actúa como
  encargado del tratamiento bajo la LOPDP.

- **Cesión:** La plataforma NO vende datos a terceros. Solo comparte datos
  con proveedores de infraestructura (hosting, pasarela de pago) bajo
  acuerdos de confidencialidad.

### 3.2 Bitácoras locales (localStorage)

Los registros de producción, ventas, costos, siembras, turnos y demás
bitácoras que cada miembro mantiene en su navegador son **propiedad exclusiva
del miembro**. La plataforma NO los transmite al servidor.

### 3.3 Evidencia de consentimiento

Conforme al artículo 16 de la LOPDP, la plataforma registra:

- IP y user agent al momento del registro.
- Fecha y versión de cada política aceptada.
- Lista de consentimientos otorgados.

Estos datos se conservan en `public/data/consents.json` (protegido por
`.htaccess`) durante la vigencia de la cuenta y por 2 años adicionales.

---

## 4. LICENCIA DE USO

El código se distribuye bajo la **Licencia MIT** (ver LICENSE). Esto
significa, en resumen:

| Permitido                                   | Requerido                          |
|---------------------------------------------|------------------------------------|
| ✅ Uso comercial                            | 📌 Mantener aviso de copyright     |
| ✅ Modificación                             | 📌 Incluir texto de licencia       |
| ✅ Distribución                             |                                    |
| ✅ Sublicenciamiento                        |                                    |

| NO permitido                                |
|---------------------------------------------|
| ❌ Usar la marca "Red Café Ecuador" sin autorización |
| ❌ Reclamar autoría del código original    |
| ❌ Reutilizar textos legales en otros sitios |

---

## 5. USO NO AUTORIZADO

Queda expresamente prohibido:

1. Suplantar la marca "Red Café Ecuador" o el dominio `redcafeecuador.com`
   en servicios no operados por SolucionesPro.
2. Vender el código fuente o porciones sustanciales sin atribución.
3. Usar los textos legales en otras plataformas.
4. Eliminar o modificar avisos de copyright, licencia o atribución.
5. Realzar ingeniería inversa para clonar el producto con marca similar.

Las infracciones serán perseguidas conforme a las leyes ecuatorianas y los
tratados internacionales aplicables (Convenio de París, ADPIC).

---

## 6. SOPORTE Y CONTACTO

Para consultas sobre propiedad intelectual, licenciamiento, white-label o
adaptaciones autorizadas:

- **Email:** info@redcafeecuador.com
- **Asunto sugerido:** "Licenciamiento / Propiedad Intelectual"

---

## 7. HISTORIAL DE VERSIONES

| Versión | Fecha                  | Cambios                                    |
|---------|------------------------|--------------------------------------------|
| v1.0    | 14 de agosto de 2026   | Creación del documento                     |

---

*Este documento forma parte integral de la documentación legal y técnica
de la plataforma Red Café Ecuador. Se recomienda revisarlo y actualizarlo
anualmente o ante cambios sustanciales del producto.*
