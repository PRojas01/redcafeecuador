# Revisión previa antes de publicar

Fecha: 2026-08-20

Comando inicial ejecutado según pedido:

```bash
llmgraph context prepare . "revisión completa antes de publicar" --max-tokens 3000
```

## Lo que está bien

- TypeScript limpio: `npx tsc --noEmit` terminó sin errores.
- PHP limpio: `php -l` en todos los `public/api/*.php` terminó sin errores.
- Build estático correcto: `NODE_OPTIONS="--max-old-space-size=6144" npm run build` terminó sin `Segmentation fault` y sin líneas `⚠`. Next reportó `Generating static pages (59/59)` y exportó correctamente.
- Rutas exportadas: `out/` contiene 57 rutas públicas `index.html` si se excluye `/404/`. Hay 58 HTML incluyendo `out/404/index.html`, y además `out/404.html`.
- Regresiones P0 en HTML de páginas: búsqueda en `out/**/*.html` no encontró `Próximamente`, `Cargando`, `servidores ubicados en Ecuador`, `EUDR en vigencia`, `exige desde 2025`, `acceden a precios premium` ni `La red que conecta tu café con más mercado`.
- `/servicios/precios/` trae precio sembrado en HTML: `out/servicios/precios/index.html` contiene `$363.40 USD/quintal`, histórico y fuentes.
- `/afiliate/` trae los 12 perfiles en HTML servido: Productor, Tostador / Comerciante, Comprador, Bar / Cafetería, Barista, Verificador / Catador, Proveedor, Transportista, Pilador, Exportador, Amante del Café y Asesor Experto.
- Enlaces internos: recorrí los `href` internos de 58 HTML exportados y no encontré rutas rotas.
- Multiperfil, compatibilidad hacia atrás: `public/api/_bootstrap.php:139-153` convierte un miembro sin `roles` a `[$rol]`.
- Multiperfil, autorización: no encontré decisiones de autorización directas contra `$m['rol']` en `public/api/*.php`; los endpoints revisados usan `miembro_tiene_rol()` para permisos.
- `components/Cafetal.tsx` y `components/CafetalAnimado.tsx` compilan por TypeScript. No aparecen referencias a `Cafetal`, `CafetalAnimado` ni al texto propio del componente en `out/_next/static/chunks/*.js`, así que no parecen entrar al bundle si no se usan.
- EUDR: verifiqué la fuente oficial de la Comisión Europea. Los plazos del sitio coinciden: 30/12/2026 para operadores grandes/medianos y micro/pequeños cubiertos por EUTR; 30/06/2027 para el resto de micro/pequeños. Fuente: https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en
- Móvil 375 px: en las páginas principales revisadas (`/`, `/servicios/`, `/afiliate/`, `/servicios/precios/`, `/servicios/eudr/`, `/marketplace/`, `/academia/`, `/legal/`, `/propiedad-y-uso/`, `/panel/`, `/admin/`) `document.scrollingElement.scrollWidth` fue 375, sin desbordamiento horizontal de página. La medición de contraste se hizo en Chromium convirtiendo `oklab()` y `color(srgb ...)` a sRGB antes de calcular ratios.

## Problemas encontrados

### P0 - Se publica un secreto de administración dentro del artefacto estático

- `public/data/.redcafe_admin_pass` existe y se copia a `out/data/.redcafe_admin_pass` durante el build. Confirmé que ambos archivos existen y tienen 60 bytes. No imprimí el contenido.
- Aunque algunos servidores bloquean dotfiles, el secreto está dentro del directorio público/exportado y puede terminar subido a producción.
- Relacionado: `public/api/auth.php:7-31` busca la contraseña admin también en `__DIR__ . '/../data/.redcafe_admin_pass'`, que en el despliegue exportado corresponde a `out/data/.redcafe_admin_pass`.

### P1 - El eslogan retirado sigue publicado en el manifest

- `public/manifest.json:4` contiene `La red que conecta tu café con más mercado`.
- En `out/manifest.json:4` aparece el mismo texto. Esto rompe la condición de cero apariciones en lo publicado. En HTML de páginas, footer, `<title>` y `/propiedad-y-uso/` ya no aparece.
- También queda como referencia documental no publicada en `docs/PROPIEDAD_Y_USO.md:28`.

### P1 - El flujo EUDR/Verificador-Catador sigue usando lenguaje de certificado

- `lib/certificados.ts:3-6`: el módulo se define como “Sistema de certificación”, con “certificado emitido”.
- `lib/certificados.ts:35-40`: los tipos incluyen `Certificado de Catación SCA` y `Certificado de Trazabilidad de Lote`.
- `lib/certificados.ts:99`: la acción central dice “Emite el certificado”.
- `app/servicios/eudr/ClientPage.tsx:133-136`: para el expediente EUDR indica que el verificador/catador puede “emitir el certificado”.
- `app/servicios/eudr/ClientPage.tsx:183-185`: habla de “Verificar un certificado” y autenticidad de certificado.
- `app/panel/page.tsx:1659`, `app/panel/page.tsx:1683`, `app/panel/page.tsx:1687`, `app/panel/page.tsx:1696` y `app/panel/page.tsx:1738`: la bandeja del rol verificador/catador sigue como certificación y emisión de certificado.
- `app/panel/page.tsx:1753`, `app/panel/page.tsx:1788`, `app/panel/page.tsx:1798`, `app/panel/page.tsx:1811`: catación emite “Certificado de Catación SCA” y usa “Catador certificado de la Red”.
- Esto contradice la instrucción de que Verificador/Catador debe emitir “informes técnicos” y que el expediente EUDR no debe presentarse como certificación oficial de cumplimiento.

### P1 - El límite de tres perfiles en registro PHP se recorta en vez de rechazarse

- `public/api/auth.php:86` llama `validar_roles_miembro(..., true)`.
- `public/api/_bootstrap.php:171-172`: si `$cortar` es `true`, hace `array_slice(..., MAX_ROLES_MIEMBRO)` antes de validar el exceso.
- Resultado: un registro que envía 4+ roles no falla; PHP acepta y recorta a 3. La tarea pide que el tope de tres perfiles se valide en PHP, no solo en formulario. En `members.php` sí se valida sin recorte para actualización de roles.

### P1 - Coherencia del modelo de costo rota en páginas legales y asesoría

Modelo esperado: crear y mantener perfil gratis; solo se pagan servicios especializados; registro gratuito hasta el 31/12/2026; quien entre antes es Miembro Fundador permanente.

- `app/legal/page.tsx:171-172`: limita responsabilidad a “cuota de membresía del periodo”.
- `app/legal/page.tsx:178-185`: define membresía mensual renovable, cuota mensual e impago, contradiciendo permanencia gratuita.
- `app/terminos-y-condiciones/page.tsx:112-113`: limita responsabilidad a “cuota de membresía del periodo en curso”; contradice la misma página, que en `app/terminos-y-condiciones/page.tsx:59-68` dice que crear/mantener perfil es gratuito y no hay cobro recurrente.
- `app/asesoria/page.tsx:51-53`: dice “Agrégalo a tu plan Cosecha, Origen o Comprador — incluido cada mes”, incompatible con “solo se pagan servicios especializados cuando se usan”.
- `docs/LEGAL/CONTRATO_MEMBRESIA.md:23-29`: contrato mensual, renovación automática, cuota mensual, impago y suspensión.
- `docs/LEGAL/TERMINOS_CONDICIONES.md:43`, `docs/LEGAL/TERMINOS_CONDICIONES.md:52`, `docs/LEGAL/TERMINOS_CONDICIONES.md:60`: comprobantes por servicios de membresía, límite por montos de membresía e impago de membresía.

### P2 - Afirmaciones factuales sin fuente URL verificable

- `public/data/contenido-noticias.json:4-13`: “135 mil hectáreas tecnificadas”, crédito productivo y oportunidades de exportación figuran con `fuente: "MAGAP"` pero sin `fuente_url`.
- `public/data/contenido-noticias.json:39-48`: afirmaciones de interés en Japón/Corea/Taiwán y competiciones internacionales figuran con `fuente: "ANECAFÉ"` pero sin `fuente_url`.
- `public/data/contenido-noticias.json:61`: primas de `$20 a $150 por quintal` por calidad/certificaciones/procesos sin fuente externa.
- `public/data/contenido-noticias.json:74`: pérdida de `$100 por quintal` por mala poscosecha sin fuente externa.

### P2 - Contraste móvil justo por debajo de AA en dos casos puntuales

- `app/afiliate/page.tsx:76-78`: el número activo del stepper usa `text-white` sobre `bg-white/25` dentro del estado activo. Medido a 375 px: 4.39:1; AA normal pide 4.5:1.
- `components/MapaProductores.tsx:48-52`: los marcadores de ejemplo de Leaflet usan `#fffaf2` sobre `#7A7768` con `opacity: .78`. Medido a 375 px en `/marketplace/`: 4.33:1 si el emoji se trata como texto. No genera overflow de página.

## Lo que no pude comprobar completamente

- No hice pruebas funcionales de APIs con datos reales de producción ni sesiones reales; solo revisé código PHP, sintaxis y artefacto exportado.
- No validé externamente todas las fuentes de noticias/mercado una por una. Sí verifiqué la fuente oficial de EUDR porque es regulatorio y temporalmente sensible.
- No ejecuté un crawler visual sobre las 57 rutas; la medición móvil/contraste fue sobre páginas principales y flujos de mayor riesgo.
