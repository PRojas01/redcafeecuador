# RED CAFÉ ECUADOR
## Documento Full Stack de Rediseño V2.2
### Refactor visual, UX, contenidos y frontend sobre la plataforma existente

**Concepto rector:**  
# Todo el café ecuatoriano, conectado.

**Concepto de captación:**  
# Buscamos a quienes hacen posible el café ecuatoriano.

**CTA principal:**  
# Forma parte de la Red.

---

# 1. OBJETO DEL DOCUMENTO

Este documento define el rediseño de **Red Café Ecuador** trabajando directamente sobre la plataforma existente.

El proyecto **NO implica reconstruir la aplicación ni cambiar su arquitectura funcional actual**.

Se conservarán:

- estructura de páginas;
- rutas actuales;
- Marketplace;
- Academia;
- Servicios;
- Bar;
- Noticias;
- Comunidad;
- sistema de acceso;
- sistema de afiliación;
- perfiles existentes;
- herramientas;
- lógica backend actual;
- funcionalidades ya desarrolladas.

La intervención se concentrará en:

1. identidad visual;
2. experiencia de usuario;
3. jerarquía de contenidos;
4. copywriting;
5. frontend;
6. componentes;
7. responsive;
8. estados de interfaz;
9. confianza;
10. conversión;
11. SEO;
12. rendimiento;
13. accesibilidad;
14. consistencia entre páginas.

---

# 2. PRINCIPIO DE IMPLEMENTACIÓN

La regla técnica principal será:

> **Refactorizar, no reconstruir.**

La implementación existente será tratada como base funcional.

Por tanto:

```text
ACTUAL
HTML / PHP / JS / API / BD / LOGIN / PERFILES
                    ↓
                 SE MANTIENE
                    ↓
NUEVA CAPA
DESIGN SYSTEM + UX + COPY + CSS + COMPONENTES
```

No deberán modificarse endpoints, tablas o procesos funcionales salvo que una corrección específica sea necesaria para soportar el nuevo frontend.

---

# 3. OBJETIVO DEL REDISEÑO

La plataforma actualmente tiene múltiples herramientas y servicios.

El nuevo diseño debe lograr que el usuario no perciba:

> “un sitio con muchas funciones”.

Debe percibir:

> **“Aquí están las personas, empresas, productos, conocimiento y oportunidades del café ecuatoriano.”**

La experiencia completa debe construirse alrededor de cuatro ideas:

### Personas

Quién forma parte de la Red.

### Café

Qué se produce, ofrece y comercializa.

### Conexiones

Quién puede encontrar a quién.

### Oportunidades

Qué puede obtener cada actor al participar.

---

# 4. POSICIONAMIENTO CENTRAL

## Marca

**Red Café Ecuador**

## Eslogan

**Todo el café ecuatoriano, conectado.**

## Propuesta

**Una plataforma que conecta productores, compradores, tostadores, cafeterías, comercializadores, exportadores, proveedores, profesionales y otros actores alrededor del café ecuatoriano.**

## Campaña

**Buscamos a quienes hacen posible el café ecuatoriano.**

## Acción principal

**Forma parte de la Red.**

---

# 5. JERARQUÍA DE MENSAJES

Toda la plataforma seguirá esta jerarquía:

```text
1. PERSONA
2. NECESIDAD
3. BENEFICIO
4. FUNCIÓN
5. TECNOLOGÍA
```

No:

```text
1. FUNCIÓN
2. MÓDULO
3. TECNOLOGÍA
4. USUARIO
```

---

# 6. VOCABULARIO OFICIAL

Usar consistentemente:

- Red;
- miembro;
- socio de la Red;
- actor del café;
- productor;
- comprador;
- tostador;
- cafetería;
- proveedor;
- profesional;
- encontrar;
- conectar;
- publicar;
- explorar;
- consultar;
- participar;
- aprender;
- negociar.

Evitar:

- ecosistema 360;
- plataforma revolucionaria;
- solución definitiva;
- potencia tu negocio;
- transforma tu futuro;
- todo lo que necesitas;
- líder;
- número uno.

---

# 7. CAMBIO DEL CTA GLOBAL

## Actual

“Únete a la Red”

Puede mantenerse técnicamente.

## Nuevo texto preferente

### Forma parte de la Red

Debe utilizarse en:

- header;
- Hero;
- perfiles;
- cierre HOME;
- footer;
- afiliación;
- campañas.

Ruta actual:

```text
/redcafeecuador/afiliate/
```

No cambiar.

---

# 8. ESTRUCTURA ACTUAL DEL HEADER

Conservar:

```text
LOGO
Marketplace
Academia
Servicios
Bar
Noticias
Comunidad
Entrar
CTA
```

No agregar elementos nuevos al menú principal.

---

# 9. REDISEÑO DEL HEADER

## Desktop

Altura:

```css
--header-height: 76px;
```

Estructura:

```text
┌──────────────────────────────────────────────────────────────┐
│ LOGO   Marketplace Academia Servicios Bar Noticias Comunidad │
│                                      Entrar [Forma parte]    │
└──────────────────────────────────────────────────────────────┘
```

Características:

- sticky;
- z-index alto;
- fondo ligeramente translúcido;
- blur moderado;
- borde inferior sutil;
- CTA permanente.

CSS orientativo:

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  min-height: 76px;
  background: rgba(255,255,255,.94);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border-soft);
}
```

---

# 10. HEADER MÓVIL

Mantener menú hamburguesa.

Estructura:

```text
[LOGO]                         [☰]
```

Menú desplegado:

```text
Marketplace
Academia
Servicios
Bar
Noticias
Comunidad

Entrar

[ Forma parte de la Red ]
```

El CTA debe ser full width.

---

# 11. DESIGN TOKENS

Centralizar todos los estilos mediante variables.

```css
:root {

  /* Brand */
  --coffee-950: #241711;
  --coffee-900: #2B1B14;
  --coffee-800: #402A20;
  --coffee-700: #59402F;
  --coffee-600: #76513B;

  --green-800: #294733;
  --green-700: #31543B;
  --green-600: #426B4A;
  --green-100: #EAF1EC;

  --cream-50: #FCFAF6;
  --cream-100: #F7F2E9;
  --cream-200: #EFE7DA;

  --sand-300: #E2D4C0;

  --gold-500: #C39755;

  /* Text */
  --text-primary: #241F1B;
  --text-secondary: #625B54;
  --text-muted: #827A72;

  /* UI */
  --surface: #FFFFFF;
  --surface-soft: #FCFAF6;
  --border-soft: #E8E1D8;

  /* States */
  --success: #36744A;
  --warning: #A66B20;
  --danger: #A5423B;
}
```

---

# 12. TIPOGRAFÍA

## Titulares editoriales

Recomendado:

**DM Serif Display**

Uso:

- H1;
- H2;
- titulares destacados;
- campañas.

## Interfaz

**Inter**

Uso:

- navegación;
- párrafos;
- formularios;
- botones;
- tablas;
- filtros;
- badges.

Fallback:

```css
font-family:
Inter,
system-ui,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif;
```

---

# 13. ESCALA TIPOGRÁFICA

Desktop:

```css
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;

--h4: 22px;
--h3: 26px;
--h2: 42px;
--h1: clamp(48px, 5vw, 68px);
```

Móvil:

```text
H1: 38–42 px
H2: 30–34 px
H3: 22–24 px
BODY: 16 px
```

---

# 14. SISTEMA DE ESPACIADO

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
--space-9: 96px;
```

Secciones:

Desktop:

```text
80–96px
```

Móvil:

```text
56–64px
```

---

# 15. CONTENEDOR GLOBAL

```css
.container {
  width: min(100% - 48px, 1240px);
  margin-inline: auto;
}
```

Móvil:

```css
@media(max-width: 640px) {
  .container {
    width: min(100% - 32px, 1240px);
  }
}
```

---

# 16. BOTONES

Solo cuatro variantes.

## Primary

```text
Forma parte de la Red
Publicar café
Contactar
Comenzar curso
```

## Secondary

```text
Explorar
Ver Marketplace
Ver servicios
```

## Ghost

Navegación secundaria.

## Icon

Acciones compactas.

---

# 17. ESTILO PRIMARY

```css
.btn-primary {
  background: var(--green-700);
  color: white;
  border: 1px solid var(--green-700);
  min-height: 46px;
  padding: 0 22px;
  border-radius: 10px;
  font-weight: 650;
}
```

Hover:

```css
.btn-primary:hover {
  background: var(--green-800);
  transform: translateY(-1px);
}
```

---

# 18. TARJETAS

Todas las páginas deben compartir sistema.

```css
.card {
  background: #fff;
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  overflow: hidden;
}
```

Evitar:

- sombras grandes;
- gradientes artificiales;
- glassmorphism indiscriminado.

Hover:

```css
.card:hover {
  border-color: #D6CCC0;
  box-shadow: 0 10px 28px rgba(36,23,17,.07);
}
```

---

# 19. HOME — HERO

Eliminar como mensaje principal:

> Compra y vende café ecuatoriano directo, de 1 libra a una cosecha.

Ese mensaje reduce el alcance percibido.

## Nuevo contenido

Eyebrow:

**RED CAFÉ ECUADOR**

H1:

# Todo el café ecuatoriano, conectado.

Descripción:

**Encuentra productores, cafés, compradores, tostadores, cafeterías, proveedores, servicios y conocimiento especializado en un mismo espacio.**

CTA 1:

**Forma parte de la Red**

CTA 2:

**Explorar Marketplace**

Microcopy:

**Crea tu perfil · Conecta directamente · Encuentra oportunidades**

---

# 20. HERO — COMPOSICIÓN

Desktop:

```text
┌───────────────────────────────────────────────────────┐
│                                                       │
│  RED CAFÉ ECUADOR          [FOTOGRAFÍA DOCUMENTAL]    │
│                                                       │
│  Todo el café                                        │
│  ecuatoriano,                                        │
│  conectado.                                          │
│                                                       │
│  Texto                                               │
│                                                       │
│  [Forma parte] [Explorar]                            │
│                                                       │
│  Productores · Cafés · Empresas · Servicios          │
└───────────────────────────────────────────────────────┘
```

Layout:

```css
.hero-grid {
  display: grid;
  grid-template-columns: 1.05fr .95fr;
  gap: 64px;
  align-items: center;
}
```

---

# 21. FOTOGRAFÍA HERO

Dirección visual:

- fotografía real;
- Ecuador;
- cafetal;
- productor;
- proceso;
- café;
- profundidad natural.

No utilizar:

- personas posando mirando cámara;
- imágenes evidentemente generadas;
- taza genérica sobre fondo oscuro como imagen principal.

Relación:

```text
4:5 o 5:6
```

Border radius:

```text
20–24px
```

---

# 22. ELIMINAR DEL HERO

Eliminar:

- “Verificado · Desde 1 libra · Con asesoría” como headline superior;
- promesa de escrow;
- “origen verificado taza a taza”;
- bloques demasiado técnicos.

Estas funciones pueden mantenerse en sus secciones correspondientes.

---

# 23. SECCIÓN PERFILES

Mantener los diez perfiles existentes.

Nuevo título:

# ¿Formas parte del café ecuatoriano?

Subtítulo:

**Entonces hay un lugar para ti en la Red.**

---

# 24. TARJETAS DE PERFIL

No utilizar párrafos excesivos.

Formato:

```text
[ICONO]

PRODUCTOR

Publica tus cafés, muestra tu finca
y conecta con compradores.

[Crear perfil →]
```

---

# 25. COPY — PRODUCTOR

## Productor

**Muestra tu finca, publica tus cafés y conecta con compradores y otros actores del sector.**

CTA:

**Crear perfil de productor**

---

# 26. COPY — TOSTADOR / COMERCIANTE

## Tostador / Comerciante

**Encuentra productores, nuevos orígenes y cafés para abastecer tu actividad.**

CTA:

**Formar parte**

---

# 27. COPY — COMPRADOR

## Comprador

**Encuentra café ecuatoriano por origen, variedad, proceso y disponibilidad.**

CTA:

**Explorar cafés**

---

# 28. COPY — VERIFICADOR / CATADOR

## Verificador / Catador

**Ofrece servicios técnicos de evaluación, catación y verificación dentro de la Red.**

CTA:

**Mostrar mis servicios**

---

# 29. COPY — TRANSPORTISTA

## Transportista

**Conecta tu servicio logístico con productores, tostadores, empresas y compradores.**

CTA:

**Registrar mi servicio**

---

# 30. COPY — PILADOR / BENEFICIADERO

## Pilador / Beneficiadero

**Haz visible tu capacidad de procesamiento y conecta con productores que necesitan tus servicios.**

CTA:

**Crear mi perfil**

---

# 31. COPY — EXPORTADOR

## Exportador

**Encuentra productores, lotes, servicios y contactos para desarrollar oportunidades comerciales.**

CTA:

**Entrar a la Red**

---

# 32. COPY — PROVEEDOR

## Proveedor de equipos e insumos

**Haz que productores, tostadores y cafeterías encuentren tus productos y servicios.**

CTA:

**Mostrar mi empresa**

---

# 33. COPY — BAR / CAFETERÍA

## Bar / Cafetería

**Muestra tu negocio y conecta con productores, tostadores, proveedores y consumidores.**

CTA:

**Registrar cafetería**

---

# 34. COPY — BARISTA

## Barista

**Fortalece tu perfil profesional, aprende y conecta con cafeterías y otros actores del sector.**

CTA:

**Crear perfil**

---

# 35. GRID PERFILES

Desktop:

```css
.profiles-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}
```

Tablet:

```text
3 columnas
```

Mobile:

```text
1–2 columnas
```

Si el contenido se comprime demasiado, preferir 2 columnas desktop en tarjetas grandes antes que tarjetas excesivamente pequeñas.

---

# 36. BENEFICIOS

El actual concepto “4 beneficios que se multiplican” se mantiene como bloque estructural, pero cambia el contenido visual.

Nuevo H2:

# Una Red para encontrar, aprender y hacer negocios

Cuatro tarjetas:

### Marketplace

**Encuentra y publica café ecuatoriano.**

### Academia

**Accede a conocimiento práctico para tu actividad.**

### Servicios

**Encuentra soluciones y profesionales especializados.**

### Confianza

**Conoce quién está detrás de cada perfil y publicación.**

---

# 37. ELIMINAR CONTRADICCIÓN DE PAGO

Eliminar texto:

> Un solo pago mensual · toda la red.

Sustituir por:

### **Crear tu perfil y participar en la Red es gratuito.**

Microcopy:

**Los servicios especializados se contratan únicamente cuando los necesites.**

Esto deberá ser consistente en HOME, Servicios y afiliación.

---

# 38. SERVICIOS EN HOME

Mantener la sección actual.

Nuevo título:

# Herramientas y servicios para trabajar mejor

Subtítulo:

**Consulta información, aprende y accede a servicios especializados según tu actividad.**

---

# 39. TARJETA PANEL DE PRECIOS

Título:

### Precio de referencia

Texto:

**Consulta información de mercado y referencias útiles antes de negociar.**

CTA:

**Consultar precios**

---

# 40. TARJETA CALCULADORA

Título:

### Calculadora de venta

Texto:

**Estima ingresos, costos y margen de una operación.**

CTA:

**Calcular**

---

# 41. TARJETA TRAZABILIDAD

Cambiar:

“Certificación EUDR”

por:

### Trazabilidad y documentación

Texto:

**Organiza información de finca, ubicación y lote para procesos de trazabilidad y debida diligencia.**

---

# 42. FACTURACIÓN

Cambiar copy a:

### Facturación electrónica

**Herramientas de apoyo para organizar y emitir documentación comercial desde la Red.**

No utilizar:

> sin contador.

---

# 43. CONFIANZA — REEMPLAZAR SECCIÓN “PILOTO”

Eliminar completamente:

- “Somos una plataforma nueva”;
- “piloto territorial”;
- “empezamos con fincas de una zona”;
- “mientras siembra la Red”;
- “lista de espera”.

Nuevo bloque:

# Una Red basada en personas reales

Subtítulo:

**La confianza comienza sabiendo con quién estás conectando.**

Tres columnas:

### Perfil

**Cada actor presenta claramente quién es y qué actividad realiza.**

### Información

**Los perfiles pueden incorporar datos de finca, empresa, productos y servicios.**

### Contacto

**La Red facilita conexiones directas entre sus miembros.**

CTA:

**Conoce cómo funciona**

---

# 44. MAPA / CONCEPTO TERRITORIAL

Integrar conceptualmente:

# Ponemos el café ecuatoriano en el mapa

Texto:

**Explora productores, fincas, cafés y actores de diferentes provincias del Ecuador.**

CTA:

**Explorar Marketplace**

---

# 45. BLOQUE DE CAPTACIÓN

Nuevo bloque visual de alto impacto:

Eyebrow:

**FORMA PARTE**

H2:

# Buscamos a quienes hacen posible el café ecuatoriano.

Texto:

**Si produces, compras, tuestas, comercializas, preparas, transportas o prestas servicios alrededor del café, queremos que formes parte de la Red.**

CTA:

### Forma parte de Red Café Ecuador

Secundario:

### Explorar perfiles

---

# 46. DISEÑO BLOQUE CAPTACIÓN

Fondo:

```text
#2B1B14
```

Texto:

blanco.

Acentos:

dorado limitado.

Puede contener fotografías en collage:

```text
PRODUCTOR
TOSTADOR
BARISTA
CAFETERÍA
PROVEEDOR
```

---

# 47. SECCIÓN BAR EN HOME

Mantener bloque.

Nuevo título:

# Historias, personas y cultura del café

Texto:

**Conoce lo que ocurre alrededor del café ecuatoriano: historias, videos, reportajes, cafeterías y protagonistas.**

CTA:

**Entrar a Red Café Bar**

---

# 48. PLANES / PRECIOS

La estructura actual puede mantenerse.

Pero cambiar encabezado:

# Participa en la Red

Subtítulo:

**Crea tu perfil gratuitamente y utiliza los servicios adicionales según tus necesidades.**

Si todos los planes están en USD 0, no presentarlos visualmente como una tabla SaaS tradicional.

Presentarlos como:

### Formas de participar.

---

# 49. TARJETAS DE PARTICIPACIÓN

Ejemplo:

```text
PRODUCTOR

SEMILLA

GRATIS

Para comenzar a mostrar tu café
y conectar con la Red.

✓ Perfil
✓ Publicaciones básicas
✓ Academia básica
✓ Contacto

[Forma parte]
```

---

# 50. ELIMINAR “MÁS ELEGIDO”

No utilizar “Más elegido” mientras no exista evidencia real.

Puede sustituirse por:

### Perfil completo

solo si describe realmente un nivel funcional.

---

# 51. ELIMINAR LISTA DE ESPERA

La propuesta ya es definitiva.

Reemplazar:

> Únete a la lista de espera.

por:

# Forma parte de la Red

Texto:

**Crea tu perfil y empieza a conectar con otros actores del café ecuatoriano.**

Formulario actual puede conservarse si es el mecanismo de alta.

Botón:

### Crear mi perfil

---

# 52. CAMPO “SOY…”

Mantener selector.

Opciones existentes.

Label:

### ¿Cómo formas parte del café?

Esto es más humano que:

> Tipo de usuario.

---

# 53. BLOQUE NOTICIAS HOME

Título:

# Lo que está pasando alrededor del café

Subtítulo:

**Mercado, producción, normativa, conocimiento y oportunidades del sector.**

Cada tarjeta debe presentar:

```text
CATEGORÍA
FECHA

Título

Resumen

Fuente
```

---

# 54. MARKETPLACE — HERO

Mantener ruta:

```text
/marketplace/
```

Nuevo eyebrow:

**MARKETPLACE**

H1:

# Café ecuatoriano disponible en la Red

Texto:

**Descubre cafés publicados dentro de Red Café Ecuador. Busca por origen, variedad, proceso y otras características.**

CTA si productor:

### Publicar café

---

# 55. ELIMINAR MARKETPLACE

Eliminar mensajes como:

- “Siembra de la Red”;
- “6 lotes base”;
- “los tipos de café que verás”;
- referencias a contenido ficticio de ejemplo una vez que el sistema se presente como final.

Si existen registros demostrativos, marcarlos técnicamente:

```text
DEMOSTRACIÓN
```

Nunca hacerlos parecer publicaciones reales.

---

# 56. MARKETPLACE — ORDEN VISUAL

```text
HERO
↓
MAPA
↓
FILTROS
↓
RESULTADOS
```

Se mantiene estructura existente.

Solo refactor visual.

---

# 57. MAPA

Título:

# Explora el origen

Texto:

**Encuentra café y productores por ubicación.**

Loading:

```text
Cargando mapa…
```

debe sustituirse visualmente por skeleton.

---

# 58. FILTROS MARKETPLACE

Desktop:

```text
Provincia
Variedad
Proceso
Buscar
```

Más buscador.

Convertir en toolbar unificada.

```css
.filters-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px,1fr)) 2fr;
  gap: 12px;
}
```

---

# 59. FILTROS MÓVIL

No mostrar cuatro controles ocupando toda la pantalla.

Usar:

```text
[Buscar café...]

[Filtros 3]
```

Botón abre drawer/bottom-sheet.

---

# 60. TARJETA CAFÉ

Estructura:

```text
[IMAGEN 16:10]

LOJA · ECUADOR

Café Sidra Lavado

Finca La Esperanza

[Sidra] [Lavado] [1850 msnm]

Disponible: 8 sacos

[Ver café]    [Contactar]
```

---

# 61. TARJETA CAFÉ — DATOS

No exceder:

- origen;
- variedad;
- proceso;
- altitud;
- disponibilidad.

Datos técnicos adicionales se muestran en ficha.

---

# 62. MARKETPLACE — SKELETON

Crear componente:

```html
<div class="coffee-card skeleton">
...
</div>
```

Nunca dejar:

> Cargando catálogo…

como único estado durante varios segundos.

---

# 63. MARKETPLACE — ERROR

Título:

### No pudimos cargar los cafés

Texto:

**Vuelve a intentarlo o modifica los filtros.**

Botón:

**Reintentar**

---

# 64. MARKETPLACE — VACÍO

### No encontramos cafés con esos filtros

Texto:

**Prueba con otra provincia, variedad o proceso.**

CTA:

**Limpiar filtros**

---

# 65. ACADEMIA

Mantener ruta:

```text
/academia/
```

Nuevo eyebrow:

**ACADEMIA RED CAFÉ**

H1:

# El conocimiento también forma parte de la Red

Texto:

**Aprende sobre producción, postcosecha, comercialización, administración, calidad, tueste y otros temas relacionados con el café.**

---

# 66. ELIMINAR COPY DE MEMBRESÍA

No decir:

> incluidos en tu membresía.

Sustituir:

**Consulta los contenidos disponibles para tu perfil y continúa aprendiendo dentro de la Red.**

---

# 67. TARJETA CURSO

```text
[IMAGEN]

PRODUCCIÓN · BÁSICO

Buenas Prácticas Agrícolas
del Cafetal

Manejo del cultivo, poda,
fertilización y prevención.

3 horas · 4 módulos

[Comenzar curso]
```

---

# 68. PROGRESO DEL CURSO

El actual 0 % debe presentarse como progreso, no dato suelto.

```text
Tu progreso
────────────── 0%
```

No mostrar progreso a visitantes sin sesión si no aporta valor.

---

# 69. SERVICIOS

Mantener:

```text
/servicios/
```

Nuevo Hero:

Eyebrow:

**SERVICIOS DE LA RED**

H1:

# Soluciones para quienes trabajan con café

Texto:

**Accede a herramientas, información, asesoría y servicios especializados según las necesidades de tu actividad.**

---

# 70. PRIMER BLOQUE SERVICIOS

Título:

# Herramientas disponibles para todos

Subtexto:

**Crea tu perfil gratis y utiliza las herramientas básicas de la Red.**

Tarjetas:

- Perfil;
- Marketplace;
- Academia;
- Precios.

---

# 71. SEGUNDO BLOQUE SERVICIOS

Título:

# Servicios especializados

Texto:

**Contrata únicamente los servicios que necesites.**

Categorías actuales:

- asesoría;
- capacitación;
- verificación;
- logística;
- herramientas.

---

# 72. CAMBIO “CERTIFICACIONES”

Renombrar visualmente la categoría:

### Verificación y documentación

Evita que todos los servicios parezcan certificaciones oficiales.

---

# 73. CATACIÓN

Copy recomendado:

### Servicio de catación

**Evaluación técnica del lote por profesionales o laboratorios especializados disponibles en la Red.**

Evitar afirmar “score oficial” salvo respaldo y metodología específica.

---

# 74. EUDR

Copy recomendado:

### Expediente de trazabilidad

**Organiza la información de finca y geolocalización necesaria para apoyar procesos de trazabilidad y debida diligencia.**

Botón:

**Preparar expediente**

---

# 75. BAR

Mantener:

```text
/bar/
```

Nuevo eyebrow:

**RED CAFÉ BAR**

H1:

# Historias, personas y cultura alrededor del café

Texto:

**Videos, reportajes, experiencias y conversaciones que muestran quiénes hacen posible el café ecuatoriano.**

---

# 76. CONTADORES EN CERO

No mostrar:

```text
Todo (0)
Videos (0)
Reportajes (0)
```

cuando todo sea cero.

En ese caso:

```text
Todo
Videos
Reportajes
Canales
```

---

# 77. BAR — ESTADO VACÍO

H2:

# Pronto encontrarás nuevas historias aquí

Texto:

**Red Café Bar reúne historias, videos y contenidos de quienes forman parte del sector.**

Alternativamente, priorizar contenido editorial inicial antes de publicar la sección.

---

# 78. BAR — CTA CAFETERÍA

Título:

# ¿Tienes una cafetería?

Texto:

**Crea tu perfil y haz visible tu cafetería dentro de la Red.**

CTA:

**Registrar cafetería**

---

# 79. COMUNIDAD

Mantener:

```text
/comunidad/
```

Nuevo H1:

# La conversación del café ecuatoriano

Texto:

**Comparte experiencias, preguntas, oportunidades, recetas, eventos y conocimiento con otros miembros de la Red.**

---

# 80. ESTADO VACÍO COMUNIDAD

Eliminar:

> Aún no hay publicaciones. Sé el primero en compartir.

Nuevo:

### Comparte algo con la Red

**Publica una pregunta, experiencia u oportunidad para iniciar una conversación.**

CTA:

**Crear publicación**

---

# 81. AFILIACIÓN

Mantener:

```text
/afiliate/
```

Este es uno de los puntos de conversión más importantes.

El contenido principal no puede depender únicamente de JavaScript.

---

# 82. AFILIACIÓN — SSR / FALLBACK

Actualmente la interfaz dinámica debe disponer de HTML básico inicial.

La página deberá renderizar al menos:

```html
<h1>Forma parte de Red Café Ecuador</h1>
<p>Selecciona cómo participas en el sector cafetero.</p>
<div id="profile-selector"></div>
```

Aunque falle JavaScript, el usuario debe entender la página.

---

# 83. AFILIACIÓN — NUEVO HERO

Eyebrow:

**FORMA PARTE**

H1:

# Forma parte de Red Café Ecuador

Texto:

**Queremos reunir a quienes producen, transforman, comercializan, preparan y prestan servicios alrededor del café ecuatoriano.**

Subtítulo:

### Selecciona cómo formas parte del sector.

---

# 84. SELECTOR DE PERFILES

Cada opción:

```text
[ICONO]

PRODUCTOR

Produzco café y quiero mostrar
mi finca y mis lotes.

[Seleccionar]
```

---

# 85. COPY DE FORMULARIOS

Labels claros.

No usar placeholders como sustituto de labels.

Ejemplo:

```text
Nombre completo
[________________]

WhatsApp
[________________]

Provincia
[________________]
```

---

# 86. PROGRESO DE AFILIACIÓN

Si el flujo tiene varios pasos:

```text
Perfil
────●────────○────────○────
Datos       Actividad      Listo
```

Mostrar:

```text
Paso 1 de 3
```

---

# 87. CONFIRMACIÓN AFILIACIÓN

No:

> Registro realizado correctamente.

Mejor:

# Ya formas parte de la Red

**Tu información fue registrada correctamente.**

Acciones:

**Completar mi perfil**

**Explorar Red Café**

---

# 88. ACCESO / LOGIN

No debe verse como panel administrativo.

H1:

# Entra a Red Café Ecuador

Texto:

**Accede a tu perfil, publicaciones, cursos y herramientas.**

---

# 89. NEWS / NOTICIAS

Conservar ruta existente.

Diseño editorial.

Grid:

```text
DESTACADA 2/3
SECUNDARIAS 1/3
↓
GRID 3 COLUMNAS
```

---

# 90. TARJETAS NOTICIAS

```text
MERCADO
18 AGO 2026

Título de la publicación

Resumen...

Fuente: ...
```

---

# 91. FUENTE

Toda noticia externa deberá mostrar claramente:

- fuente;
- fecha;
- enlace;
- autor cuando corresponda.

No hacer que el nombre de una institución parezca necesariamente autoría oficial.

---

# 92. FOOTER GLOBAL

Reemplazar el mensaje actual.

Nuevo:

## Red Café Ecuador

**Todo el café ecuatoriano, conectado.**

Columnas:

### La Red

Marketplace  
Academia  
Servicios  
Comunidad  
Bar

### Para ti

Productores  
Tostadores  
Exportadores  
Cafeterías  
Proveedores

### Información

Noticias  
Contacto  
Términos  
Privacidad  
Cookies

### Contacto

Correo  
WhatsApp  
Ecuador

---

# 93. FIRMA

Footer final:

**© 2026 Red Café Ecuador.**

Subline:

**Tecnología desarrollada por SolucionesPro.**

La identidad Red Café debe ser principal.

SolucionesPro funciona como respaldo tecnológico, no como marca dominante.

---

# 94. NUEVO DOMINIO

Cuando el dominio definitivo esté disponible:

```text
https://redcafeecuador.com/
```

La migración deberá preservar rutas equivalentes:

```text
/marketplace/
/academia/
/servicios/
/bar/
/noticias/
/comunidad/
/afiliate/
/login/
```

---

# 95. MIGRACIÓN SEO

Implementar 301 desde:

```text
solucionespro.net/redcafeecuador/*
```

hacia:

```text
redcafeecuador.com/*
```

Ejemplo:

```text
/redcafeecuador/marketplace/
       ↓ 301
https://redcafeecuador.com/marketplace/
```

---

# 96. CANONICAL

Cada página:

```html
<link
 rel="canonical"
 href="https://redcafeecuador.com/ruta/"
>
```

---

# 97. METADATA HOME

Title recomendado:

```text
Red Café Ecuador | Todo el café ecuatoriano, conectado
```

Description:

```text
Conecta con productores, compradores, tostadores,
cafeterías, proveedores y profesionales del café ecuatoriano.
```

---

# 98. METADATA MARKETPLACE

Title:

```text
Marketplace de café ecuatoriano | Red Café Ecuador
```

Description:

```text
Explora cafés ecuatorianos por origen, variedad,
proceso y disponibilidad.
```

---

# 99. METADATA ACADEMIA

Title:

```text
Academia del Café | Red Café Ecuador
```

---

# 100. OPEN GRAPH

Implementar:

```html
<meta property="og:type" content="website">
<meta property="og:site_name" content="Red Café Ecuador">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="...">
```

Imagen OG:

```text
1200 × 630 px
```

---

# 101. DATOS ESTRUCTURADOS

Home:

```text
Organization
WebSite
```

Marketplace:

```text
ItemList
Product
```

Academia:

```text
Course
```

Noticias:

```text
Article
NewsArticle
```

Breadcrumbs:

```text
BreadcrumbList
```

---

# 102. ACCESIBILIDAD

Objetivo mínimo:

### WCAG 2.2 AA

Requerimientos:

- contraste;
- navegación por teclado;
- labels;
- focus visible;
- alt text;
- aria;
- headings jerárquicos.

---

# 103. FOCUS

```css
:focus-visible {
  outline: 3px solid rgba(49,84,59,.35);
  outline-offset: 3px;
}
```

Nunca eliminar outline sin reemplazo.

---

# 104. IMÁGENES

Formato:

```text
AVIF
WebP fallback
```

Atributos:

```html
loading="lazy"
decoding="async"
width=""
height=""
```

Hero:

```text
fetchpriority="high"
```

---

# 105. PERFORMANCE

Objetivos:

```text
LCP < 2.5 s
INP < 200 ms
CLS < 0.1
```

---

# 106. JAVASCRIPT

Evitar cargar scripts globalmente cuando solo corresponden a:

- Marketplace;
- mapa;
- Academia;
- afiliación.

Usar carga condicional.

---

# 107. CSS

No acumular nuevos estilos inline por página.

Crear:

```text
/assets/css/
    tokens.css
    base.css
    layout.css
    components.css
    pages/
        home.css
        marketplace.css
        academia.css
        servicios.css
        comunidad.css
        bar.css
        afiliate.css
```

Si el proyecto actual utiliza un único bundle, mantener bundle pero conservar separación lógica en fuentes.

---

# 108. JAVASCRIPT PROPUESTO

```text
/assets/js/
    core/
        navigation.js
        forms.js
        ui.js

    pages/
        marketplace.js
        academia.js
        afiliate.js
        community.js
```

No reescribir backend.

---

# 109. COMPONENTES REUTILIZABLES

Crear biblioteca visual:

```text
Button
Badge
Card
ProfileCard
CoffeeCard
CourseCard
ServiceCard
ArticleCard
EmptyState
ErrorState
Skeleton
Modal
Drawer
Toast
Tabs
FormField
Select
SearchInput
SectionHeader
CTASection
```

---

# 110. PROFILE CARD

Props conceptuales:

```js
{
  icon,
  title,
  description,
  href,
  cta
}
```

---

# 111. COFFEE CARD

```js
{
  image,
  origin,
  name,
  producer,
  variety,
  process,
  altitude,
  availability,
  verified,
  url
}
```

---

# 112. SERVICE CARD

```js
{
  category,
  icon,
  title,
  description,
  price,
  status,
  href
}
```

---

# 113. ARTICLE CARD

```js
{
  category,
  date,
  title,
  excerpt,
  source,
  image,
  url
}
```

---

# 114. SISTEMA DE BADGES

Ejemplos:

```text
Perfil verificado
Nuevo
Disponible
Próximamente
Gratuito
Socio fundador
```

No utilizar más de dos badges por tarjeta.

---

# 115. SOCIO FUNDADOR

Diseño:

```css
.badge-founder {
  background: #F7EDDB;
  color: #77551E;
  border: 1px solid #DFC999;
}
```

Texto:

### Socio fundador

No confundir con propiedad societaria.

---

# 116. LOADING

Sustituir textos largos de carga por skeletons.

Ejemplo Marketplace:

```text
████████████████
████████
██████
```

Con:

```css
animation: pulse 1.5s ease-in-out infinite;
```

---

# 117. ERROR GLOBAL

Componente:

### Algo no cargó correctamente

**Puedes volver a intentarlo sin perder tu información.**

[Reintentar]

---

# 118. EMPTY STATE

Componente reutilizable:

```text
[ICONO]

Título

Descripción

[CTA]
```

---

# 119. TOAST

Ejemplos:

```text
✓ Perfil actualizado
✓ Café publicado
✓ Mensaje enviado
```

Errores:

```text
No pudimos guardar los cambios.
```

No utilizar `alert()` del navegador.

---

# 120. MODALES

Solo para:

- confirmaciones;
- acciones rápidas;
- información contextual.

No usar modal para contenido principal.

---

# 121. RESPONSIVE BREAKPOINTS

```css
--bp-sm: 640px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
```

---

# 122. MOBILE FIRST

Orden de prioridad:

```text
320
375
390
430
768
1024
1280+
```

Probar específicamente teléfonos Android de gama media.

---

# 123. TARGETS TÁCTILES

Mínimo:

```text
44 × 44 px
```

Inputs:

```text
48–52px
```

---

# 124. GRID

Desktop:

```text
12 columnas
```

Tablet:

```text
8 columnas
```

Móvil:

```text
4 columnas
```

---

# 125. ANIMACIONES

Muy limitadas.

Permitido:

- hover;
- fade;
- slide pequeño;
- skeleton;
- transición de filtros.

Duración:

```text
150–250 ms
```

No usar:

- parallax excesivo;
- animaciones permanentes;
- contadores artificiales.

---

# 126. ANALÍTICA

Mantener o incorporar eventos.

Home:

```text
hero_join_click
hero_marketplace_click
profile_card_click
```

Marketplace:

```text
marketplace_search
marketplace_filter
coffee_view
coffee_contact
```

Academia:

```text
course_view
course_start
```

Servicios:

```text
service_view
service_contact
```

Afiliación:

```text
signup_start
profile_selected
signup_complete
```

---

# 127. KPI DE REDISEÑO

Medir antes y después:

### Conversión principal

```text
visitas → afiliación
```

### Marketplace

```text
visitas → ficha → contacto
```

### Academia

```text
visitas → curso iniciado
```

### Servicios

```text
visitas → solicitud
```

---

# 128. HEATMAPS

Analizar:

- Hero;
- perfiles;
- CTA;
- filtros;
- Servicios;
- abandono de afiliación.

No modificar diseño únicamente por estética.

Usar evidencia de comportamiento.

---

# 129. SEGURIDAD DEL FRONTEND

Mantener:

- validación server side;
- sanitización;
- protección CSRF;
- escape HTML;
- rate limiting.

La validación frontend es complementaria.

---

# 130. FORMULARIOS

Mostrar errores debajo del campo.

Ejemplo:

```text
Correo electrónico
[correo@dominio]

El formato del correo no es válido.
```

No mostrar:

> Error 422.

---

# 131. VALIDACIÓN POSITIVA

No mostrar checks verdes en todos los inputs.

Solo cuando tenga sentido.

Reducir ruido visual.

---

# 132. IMÁGENES DE PERFIL

Fallback:

```text
Iniciales
```

No:

avatar roto.

---

# 133. IMÁGENES DE CAFÉ

Fallback:

imagen neutra de marca.

No repetir siempre exactamente la misma fotografía.

---

# 134. FOTOGRAFÍA DE MARCA

Crear banco propio dividido en:

```text
PRODUCTORES
FINCAS
CEREZAS
POSTCOSECHA
TOSTADORES
CAFETERÍAS
BARISTAS
PRODUCTOS
EQUIPOS
ECUADOR
```

---

# 135. PRINCIPIO DE AUTENTICIDAD

Preferencia:

```text
Foto real mediocre pero auténtica
>
imagen genérica visualmente perfecta
```

Siempre que mantenga calidad mínima.

---

# 136. HOME — ORDEN DE LECTURA

Mantener la estructura existente, pero su experiencia visual debería sentirse aproximadamente así:

```text
HEADER

HERO

PERFILES

BENEFICIOS

SERVICIOS

CONFIANZA / RED

PRECIOS / HERRAMIENTAS

BAR

PARTICIPACIÓN

NOTICIAS

CTA FINAL

FOOTER
```

No introducir una nueva arquitectura de producto.

---

# 137. CTA FINAL HOME

Fondo:

Coffee 900.

Título:

# El café ecuatoriano ya tiene una Red.

Texto:

**Productores, compradores, tostadores, cafeterías, proveedores y profesionales pueden encontrarse en un mismo espacio.**

CTA:

### Forma parte de Red Café Ecuador

Secundario:

**Explorar Marketplace**

---

# 138. CAMPAÑA INTEGRADA

Añadir un pequeño banner reutilizable:

```text
BUSCAMOS A QUIENES HACEN POSIBLE
EL CAFÉ ECUATORIANO

[Forma parte]
```

Puede utilizarse en:

- HOME;
- Marketplace;
- Academia;
- Servicios;
- Bar.

No mostrarlo repetidamente dentro de una misma página.

---

# 139. CONSISTENCIA DE TERMINOLOGÍA

Definir:

```text
Marketplace = Marketplace
Academia = Academia
Servicios = Servicios
Bar = Red Café Bar
Comunidad = Comunidad
```

No llamar al mismo módulo:

- laboratorio;
- hub;
- plataforma;
- módulo;
- espacio

en distintos lugares sin necesidad.

---

# 140. “LABORATORIO”

Si internamente existe el concepto de Laboratorio de herramientas, puede mantenerse técnicamente.

Pero al usuario:

### Herramientas de la Red

es más claro.

---

# 141. CORRECCIÓN DE PROMESAS FUTURAS

Funciones aún no operativas deben mostrar:

```text
Próximamente
```

de forma consistente.

No redactarlas en futuro como si fueran parte del beneficio actual.

---

# 142. ESCROW

Hasta estar implementado:

Badge:

### Próximamente

Texto:

**Pago protegido — en desarrollo.**

No utilizarlo como argumento principal del Hero.

---

# 143. VERIFICACIÓN

Diferenciar:

```text
Miembro de la Red
Perfil verificado
Finca verificada
Empresa verificada
```

No utilizar “verificado” como afirmación global si el proceso todavía no ocurrió.

---

# 144. PRECIO REFERENCIAL

Cuando falle fuente:

```text
Último dato disponible

USD XXX
17 AGO 2026

La actualización en tiempo real
no está disponible temporalmente.
```

Nunca dejar módulo vacío.

---

# 145. CACHE DE PRECIOS

Sin reconstruir backend, agregar almacenamiento del último dato válido.

Lógica:

```js
if (livePrice) {
  render(livePrice);
  cache(livePrice);
} else {
  render(lastCachedPrice);
}
```

---

# 146. FALLBACK DE JS

Páginas críticas:

```text
Marketplace
Afiliación
Precios
```

deben renderizar contenido mínimo sin depender totalmente de JS.

---

# 147. NOSCRIPT

Ejemplo:

```html
<noscript>
  Para utilizar las funciones interactivas
  de Red Café Ecuador necesitas activar JavaScript.
</noscript>
```

---

# 148. SEO DE CONTENIDO DINÁMICO

Los elementos esenciales deben existir en DOM inicial:

- H1;
- descripción;
- navegación;
- contenido introductorio;
- CTA.

Catálogo dinámico puede cargar posteriormente.

---

# 149. LOGO

Mantener marca.

Ajustar:

- margen;
- proporción;
- versión clara;
- versión oscura;
- favicon;
- app icon.

No añadir eslogan dentro del logo.

---

# 150. FAVICON

Entregables:

```text
favicon.ico
favicon.svg
apple-touch-icon.png
android-chrome-192.png
android-chrome-512.png
```

---

# 151. MANIFEST

Preparar:

```json
{
  "name": "Red Café Ecuador",
  "short_name": "Red Café",
  "theme_color": "#2B1B14",
  "background_color": "#F7F2E9"
}
```

Aunque todavía no se implemente PWA completa.

---

# 152. WHATSAPP

Mantener integración actual.

Botones deben utilizar texto contextual.

No siempre:

> WhatsApp.

Ejemplos:

### Consultar por WhatsApp

### Hablar con la Red

### Solicitar información

---

# 153. BOTÓN FLOTANTE WHATSAPP

Puede mantenerse.

No debe competir visualmente con CTA principal.

Tamaño:

```text
52–56px
```

Desktop:

esquina inferior derecha.

Mobile:

respetar `safe-area-inset-bottom`.

---

# 154. ESTADOS HOVER DE ENLACES

Links de texto:

```css
a.text-link {
  color: var(--green-700);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
```

---

# 155. TABLAS

Cuando existan:

Desktop:

tabla.

Mobile:

transformar en tarjetas.

No permitir scroll horizontal innecesario.

---

# 156. MAPA

Contenedor:

```text
border-radius: 18px
min-height: 460px
```

Mobile:

```text
340–380px
```

---

# 157. SKELETON MAPA

Mientras carga:

Mostrar bloque gris suave + texto:

**Preparando el mapa del café ecuatoriano…**

---

# 158. ICONOGRAFÍA

Recomendado:

### Lucide

Evitar mezcla con:

- emojis;
- FontAwesome;
- diferentes estilos SVG.

---

# 159. ILUSTRACIONES

Usarlas únicamente cuando no exista fotografía adecuada.

Estilo:

- lineal;
- simple;
- editorial;
- colores de marca.

---

# 160. NO UTILIZAR

- efectos neón;
- glassmorphism oscuro;
- imágenes 3D futuristas;
- gráficos de IA;
- robots;
- circuitos.

La marca es:

### café + personas + Ecuador.

---

# 161. COPY DE MARCA EN FOOTER

Eliminar:

> La red que conecta tu café con más mercado. Afíliate, vende directo y crece con asesoría.

Sustituir:

### Todo el café ecuatoriano, conectado.

---

# 162. “AFILIAR”

La palabra puede mantenerse legal o funcionalmente.

Pero en marketing utilizar preferentemente:

### Forma parte.

### Crear perfil.

### Entrar a la Red.

---

# 163. CAMPOS DE BÚSQUEDA

Placeholder Marketplace:

**Busca por finca, productor, provincia o variedad…**

No incluir demasiados conceptos en el placeholder.

---

# 164. RESULTADOS DE BÚSQUEDA

Encabezado:

```text
24 cafés encontrados
```

No:

> Resultados: 24.

Más natural.

---

# 165. FECHA DE ACTUALIZACIÓN

Para publicaciones, precios y lotes:

```text
Actualizado hace 2 días
```

o:

```text
Actualizado el 18 ago 2026
```

Ayuda a generar confianza.

---

# 166. DATOS REALES

No utilizar contadores manuales.

Home puede mostrar:

```text
X miembros
X productores
X cafés
X provincias
```

solo mediante consulta real.

Si cantidad = 0:

ocultar bloque.

---

# 167. “LA RED ESTÁ CRECIENDO”

Título recomendado cuando existan datos:

# Así crece la Red

Ejemplo:

```text
126 miembros
48 productores
32 cafés
11 provincias
```

---

# 168. NUEVOS MIEMBROS

Si backend ya dispone de fecha de registro, aprovecharla.

Sección posible dentro de espacios existentes:

### Nuevos en la Red

No requiere nueva arquitectura.

Solo consulta:

```text
ORDER BY created_at DESC
LIMIT 4
```

---

# 169. AUDITORÍA VISUAL

Antes de publicar V2 revisar:

- todas las páginas;
- todos los perfiles;
- sesión iniciada;
- sesión cerrada;
- móvil;
- tablet;
- desktop;
- errores;
- estados vacíos;
- loading.

---

# 170. QA — RESOLUCIONES

Probar:

```text
360 × 800
390 × 844
412 × 915
768 × 1024
1024 × 768
1366 × 768
1440 × 900
1920 × 1080
```

---

# 171. QA — NAVEGADORES

Mínimo:

- Chrome;
- Edge;
- Safari;
- Firefox;
- Chrome Android.

---

# 172. CRITERIOS DE ACEPTACIÓN — HOME

La V2 se considera correcta cuando:

- H1 comunica la Red;
- CTA principal visible sin scroll;
- perfiles comprensibles;
- no existe referencia a piloto;
- no existe lista de espera;
- no existe contradicción de pago;
- diseño consistente;
- responsive correcto;
- ningún texto de prueba visible.

---

# 173. CRITERIOS MARKETPLACE

- mapa funciona;
- filtros funcionan;
- loading tiene skeleton;
- error tiene fallback;
- tarjetas son uniformes;
- CTA Contactar visible;
- mobile usable;
- contenido de demostración identificado.

---

# 174. CRITERIOS ACADEMIA

- cursos visualmente consistentes;
- nivel claro;
- módulos claros;
- progreso legible;
- CTA específico;
- ningún curso parece certificación oficial sin respaldo.

---

# 175. CRITERIOS SERVICIOS

- gratuitos y pagados claramente separados;
- precio visible cuando aplique;
- función del servicio comprensible;
- EUDR correctamente descrito;
- verificación separada de certificación.

---

# 176. CRITERIOS BAR

- no mostrar contadores cero innecesarios;
- diseño editorial;
- estados vacíos profesionales;
- CTA cafetería claro.

---

# 177. CRITERIOS COMUNIDAD

- estado vacío útil;
- publicación clara;
- login claro;
- diseño consistente.

---

# 178. CRITERIOS AFILIACIÓN

- contenido inicial visible aun si falla JS;
- perfiles comprensibles;
- formulario usable móvil;
- validaciones claras;
- CTA consistente;
- confirmación final profesional.

---

# 179. FASE 1 — DESIGN SYSTEM

Implementar primero:

```text
tokens
fonts
buttons
cards
forms
header
footer
badges
states
```

No comenzar retocando página por página sin estos componentes.

---

# 180. FASE 2 — HOME

Aplicar:

- Hero;
- perfiles;
- beneficios;
- servicios;
- confianza;
- participación;
- noticias;
- CTA;
- footer.

---

# 181. FASE 3 — MARKETPLACE

Aplicar:

- Hero;
- mapa;
- filtros;
- cards;
- responsive;
- loading;
- error;
- empty.

---

# 182. FASE 4 — AFILIACIÓN

Aplicar:

- copy;
- perfiles;
- formularios;
- fallback;
- confirmación.

---

# 183. FASE 5 — CONTENIDO

Aplicar:

- Academia;
- Servicios;
- Bar;
- Comunidad;
- Noticias.

---

# 184. FASE 6 — SEO Y PERFORMANCE

- metadata;
- structured data;
- imágenes;
- JS;
- cache;
- canonical;
- Core Web Vitals.

---

# 185. FASE 7 — QA

- visual;
- funcional;
- responsive;
- accesibilidad;
- contenido;
- formularios;
- estados;
- SEO.

---

# 186. FASE 8 — DOMINIO FINAL

Cuando se disponga del dominio:

1. clonar/configurar producción;
2. HTTPS;
3. DNS;
4. canonical;
5. Analytics;
6. Search Console;
7. sitemap;
8. redirects;
9. pruebas;
10. publicación.

---

# 187. NO HACER DURANTE ESTE REDISEÑO

No:

- cambiar base de datos;
- crear nuevos roles;
- reconstruir Marketplace;
- cambiar rutas;
- migrar framework solo por estética;
- convertir todo a React sin necesidad;
- eliminar funcionalidades;
- crear módulos adicionales.

El objetivo es obtener el máximo valor utilizando lo que ya está desarrollado.

---

# 188. PRINCIPIO TÉCNICO FINAL

Antes:

```text
MÓDULO
↓
FUNCIÓN
↓
USUARIO
```

V2:

```text
PERSONA
↓
NECESIDAD
↓
CONEXIÓN
↓
FUNCIÓN EXISTENTE
```

La tecnología permanece.

Cambia la experiencia.

---

# 189. RESULTADO VISUAL BUSCADO

Red Café Ecuador debe transmitir:

### autenticidad

### profesionalismo

### especialización

### pertenencia

### confianza

### utilidad

### identidad ecuatoriana

No debe parecer:

- plantilla SaaS;
- directorio genérico;
- proyecto experimental;
- prototipo;
- página creada alrededor de IA.

---

# 190. MENSAJE FINAL DEL PRODUCTO

## RED CAFÉ ECUADOR

# Todo el café ecuatoriano, conectado.

**Productores, compradores, tostadores, cafeterías, exportadores, proveedores, profesionales y otros actores del café ecuatoriano tienen un espacio para encontrarse, mostrar lo que hacen, acceder a conocimiento y generar nuevas oportunidades.**

### Forma parte de la Red.

---

# 191. MENSAJE DE LANZAMIENTO

# Buscamos a quienes hacen posible el café ecuatoriano.

**Si produces, compras, tuestas, comercializas, preparas, transportas o prestas servicios alrededor del café, queremos encontrarte.**

## Red Café Ecuador

### Todo el café ecuatoriano, conectado.

**[Forma parte de la Red]**

---

# 192. DIRECTRIZ DEFINITIVA PARA DESARROLLO

La implementación V2 debe realizarse **sobre el código y estructura actual**, conservando las funcionalidades existentes y sustituyendo progresivamente la capa visual anterior por el nuevo sistema de diseño.

El orden técnico será:

```text
1. INVENTARIAR COMPONENTES ACTUALES
2. CREAR DESIGN TOKENS
3. CREAR COMPONENTES BASE
4. REFACTORIZAR HEADER / FOOTER
5. REFACTORIZAR HOME
6. REFACTORIZAR MARKETPLACE
7. REFACTORIZAR AFILIACIÓN
8. REFACTORIZAR ACADEMIA
9. REFACTORIZAR SERVICIOS
10. REFACTORIZAR BAR
11. REFACTORIZAR COMUNIDAD
12. REFACTORIZAR NOTICIAS
13. APLICAR RESPONSIVE
14. APLICAR SEO
15. OPTIMIZAR PERFORMANCE
16. QA COMPLETO
17. MIGRAR AL DOMINIO DEFINITIVO
```

La regla de desarrollo será:

> **Si una función ya existe y funciona, no se reconstruye: se integra al nuevo sistema visual.**

El resultado debe ser la misma plataforma funcional, pero con una nueva percepción:

# una Red profesional y especializada en conectar a quienes hacen posible el café ecuatoriano.