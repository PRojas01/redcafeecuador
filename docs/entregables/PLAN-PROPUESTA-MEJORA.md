# Red Café Ecuador — Plan de propuesta de mejora

**Fecha:** 26 oct 2026 · **Versión en producción:** `20261002a` · **Paquete pendiente de subir:** `20261024a`

**Base del plan:**
- Auditoría de los 51 PHP de `api/` y de la capa `redcafe-*.js`.
- Pruebas reales: servidor PHP 8.3 y Chromium, con la suite `qa/` del proyecto.
- Documentos de `redcafeecuador-migracion/` del 27–28 sep.

**Método:** skills de ingeniería (`architecture`, `testing-strategy`, `deploy-checklist`, `tech-debt`) y operaciones (`risk-assessment`).

---

## 1. Resumen ejecutivo

1. **Subir ya el paquete corregido** `redcafe-actualizacion-20261024a-corregido.zip`, en un solo paso sobre `20261002a`. Cierra 14 fallos confirmados: anulación del 2FA, pérdida de altas por concurrencia, pedidos manipulables, avisos falsos, correos rotos y otros. **No daña servicios ni procesos:** la suite del proyecto da resultados idénticos antes y después (§2).
2. **No subir el parche de 11 archivos por separado sobre producción.** Depende de piezas nuevas de `20261024a` (por ejemplo `AVISO_PAGOS_VERSION` en `_avisos.php`). Sobre `20261002a` dejaría **los pedidos sin funcionar**.
3. **Esta semana, 7 arreglos de riesgo alto en el PHP actual** (§4). El primero es la validación del pago PayPal.
4. **Congelar el PHP y migrar** al Starter V0.1 (Next.js 16 + PostgreSQL + Prisma), como decidieron los documentos del 28-sep. Este plan los actualiza con lo verificado ahora: reglas de negocio que no deben perderse, mapa de datos y pruebas de paridad (§5–§7).
5. **Diseño:** identidad **Stradale** (ya aplicada) más las reglas del prototipo `concepto/`. Ver §8. *Tu mensaje se cortó en «con el diseño de…». Si te referías a otro diseño, dímelo y ajusto esa sección.*

---

## 2. Estado verificado: evaluación contra la versión real

**Producción no es accesible desde este entorno.** La política de red bloquea `redcafeecuador.com`. La comparación se hizo con lo más cercano posible:
- el sitio completo reconstruido con las herramientas del proyecto (`next build` + `fusionar-capa-propia.py`);
- encima, los archivos de `20261024a` (instancia **base**) y luego los corregidos (instancia **corregida**);
- la suite `qa/` completa en ambas.

| Prueba (suite del proyecto) | Base `20261024a` | **Corregida** | Lectura |
|---|---|---|---|
| API y seguridad (`qa_api.py`) | 28/28 | **28/28** | Igual. Incluye 80 escrituras simultáneas sin pérdida |
| Perfiles + administración | 74/74 | **74/74** | Igual |
| Cursos | 27/28 | **27/28** | Mismo fallo previo (C-11, §4) |
| Registro E2E | 11 ✔ | **11 ✔** | Igual |
| Lo que publica cada dueño | 37/37 | **37/37** | Igual |
| Moderación, baja y ficha | 55/55 | **55/55** | Igual |
| Cuentas en el admin E2E | 14/14 | **14/14** | Igual, 0 errores JS |
| Botones de la portada | 31/31 | **31/31** | Igual (repetido 2 veces; un aviso React #418 fue intermitente) |
| Mejoras (sesión, cerrar, avisos) | 12/15 | **12/15** | Mismos 3 fallos: botones «Eliminar» ausentes en el React recompilado aquí. No dependen del PHP |
| Pruebas de seguridad de la auditoría | 4/17 | **17/17** | Lo que corrige el paquete |

**Regresiones que la evaluación detectó en mis propios cambios (ya corregidas antes de entregar):**
- **El plan elegido en el registro se perdía.** Forzaba `origen`, pero el formulario deja elegir plan. Ahora se respeta si es un plan del catálogo.
- **Doble identificador oficial de servicio.** Forzaba `redcafe`, pero el catálogo antiguo usa `redcafe_admin` para el chat del administrador. Ahora se conserva el que envía la página.
- **Regla de precio del pedido.** Ahora es la misma que en la ficha y el panel: `sacos × precioSaco`; 0 = a convenir.
- **`me` durante el 2FA.** Ahora devuelve `user: null`, que es lo que el panel y la barra esperan para llevar a verificar el código. Antes devolvía el usuario completo y el panel se daba por iniciado sin el código.

**Límites de esta evaluación:**
- No se pudo comparar con el HTML que sirve producción.
- El React recompilado usa marcadores para el contenido de recetas y cursos legacy (`public/data/*.json`), que no venía en el ZIP de la fuente.
- Las pruebas `recorrido.mjs` y `parpadeo.mjs` no corrieron en ninguna de las dos instancias: requieren `local/cuentas-prueba.json` y una ruta del Mac.
- **Para cerrar esto:** habilitar `redcafeecuador.com` en la red del entorno y ejecutar `herramientas/comparar-con-produccion.py` y las comprobaciones de §3.

---

## 3. Despliegue inmediato: checklist (skill `deploy-checklist`)

**Release:** `redcafe-actualizacion-20261024a-corregido.zip` · SHA-256 `c9d5696bedd4d510ce50b9b9157c39f0daf90c4eb8b02b13fd73a33307a1c3c6`

Contenido: los 172 archivos de `20261024a`, 10 PHP corregidos y `sw.js`. Sin `data/` ni `uploads/`, sin secretos.

### Antes
- [ ] `https://redcafeecuador.com/redcafe-version.json` dice **`20261002a`**. Si dice otra cosa, **no subir**.
- [ ] Copia de seguridad de `public_html/api/`, `.htaccess` y `sw.js`. Respaldo de datos desde Admin → Respaldos → «Crear».
- [ ] Horario de poco tráfico. Tener a mano el ZIP de la versión anterior para revertir.

### Subida
- [ ] cPanel → raíz del sitio → subir el ZIP → Extraer → **sobrescribir** → borrar el ZIP.
- [ ] Pasos posteriores de `SUBIR_20261024a.txt`:
  - borrar `data/otp-debug.log` si existe;
  - poner `session.upload_progress.enabled = Off`;
  - enviar el aviso de Términos;
  - revisar los 2 miembros con `activo = false`.

### Comprobar (10 min)
- [ ] `redcafe-version.json` → `20261024a`.
- [ ] Portada: botones Registrarse, WhatsApp y Acceder.
- [ ] Con una cuenta de prueba: registrarse eligiendo un plan → el panel muestra **ese** plan.
- [ ] Iniciar y cerrar sesión. Con 2FA activo: el código llega y el panel no abre sin código.
- [ ] Solicitar un lote de prueba con la casilla marcada → el pedido muestra el total **sacos × precio**.
- [ ] Pedir un vivero o café tostado (antes fallaba) → se registra.
- [ ] Solicitar un servicio → le llega a quien lo ofrece. Si es oficial, aparece en la campana del admin.
- [ ] Admin → entrar → Cuentas → abrir una ficha.
- [ ] Recibir cualquier correo de la Red → los enlaces del pie abren `redcafeecuador.com`.

### Disparadores de reversión
- Cualquier `HTTP 500` en `api/*.php` durante la primera hora.
- Login, registro o creación de pedidos fallan.
- Aparece `PHP Fatal` en `error_log`.

**Revertir:** volver a subir los archivos guardados y avisar.

---

## 4. Mejoras al sistema actual hasta el corte (reglas: solo seguridad e integridad)

Prioridad = (Impacto + Riesgo) × (6 − Esfuerzo).

| # | Mejora | Prio | Esfuerzo | Evidencia |
|---|---|---|---|---|
| 1 | **PayPal** (`servicios.php`): validar el formato del ID de orden, exigir USD, rechazar un `paypal_order_id` repetido y numerar sin `count()+1` | 50 | 2 h | El ID entra sin validar en la URL de la API de PayPal con las credenciales del comercio. La moneda la decide el navegador (`PayPalButton.tsx`) |
| 2 | **Chat** (`chat.php`): bloqueo al enviar, abrir y marcar como leído | 36 | 2 h | Cada consulta reescribe el archivo de mensajes completo: se pierde lo enviado en ese instante |
| 3 | **`admin.php`**: no devolver `pass` ni `backup_codes`; escribir con bloqueo | 35 | 1 h | Los hashes salen al navegador y a los JSON exportados |
| 4 | **CSV de la Academia** (C-11): neutralizar celdas que empiezan con `= + - @` | 30 | 15 min | Fallo de la suite del proyecto: `=HYPERLINK(...)` llega a Excel |
| 5 | **Bloqueo en el resto de escritores**: `cotizaciones` (número de pedido repetible), `cursos`, `ratings`, `menu`, `inventario`, `contenido`, `verificaciones`, `visual`, `media`, `enviar-waitlist` | 32 | 4 h | Mismo fallo que la pérdida de altas |
| 6 | **Cotizaciones**: cifras globales solo para el admin; no pedirse cotización a uno mismo; crear las plantillas de correo `cotizacion_*` | 25 | 1 h | Los correos de cotización nunca se envían: la plantilla no existe |
| 7 | **Subidas**: rechazar imágenes de más de 40 Mpx antes de procesarlas | 25 | 30 min | Una imagen pequeña con dimensiones enormes agota la memoria de PHP |
| 8 | Cambiar el correo del perfil solo con la contraseña | 28 | 3 h | Robo de sesión → cambio de correo → toma de la cuenta |
| 9 | Valorar un lote o servicio solo si se compró | 24 | 2 h | Hoy cualquier cuenta valora cualquier lote |

Los n.º 1 a 7 van en un incremental `20261027a`, construido con `incremental-sobre-produccion.py` y verificado con la misma batería de §2. Los n.º 8 y 9 solo si el corte se retrasa más allá de febrero.
**Fuera:** 2FA del admin, SMTP, SQLite y migración de la capa propia. Eso lo resuelve la migración: hacerlo dos veces es doble trabajo.

---

## 5. ADR-001: Plataforma destino (skill `architecture`)

**Estado:** Propuesto · **Fecha:** 26-oct-2026 · **Decide:** el propietario y quien desarrolle el Starter.

### Contexto
- Producción tiene 51 endpoints PHP (~380 KB) sobre **archivos JSON** y un export estático de Next.js 15.
- Encima van 35 scripts que **ocultan y repintan** React: parpadeo medido de 1,5 a 4,1 s.
- **Integridad:** cada endpoint tiene que acordarse de bloquear sus escrituras (§4 n.º 2 y 5).
- **Administración:** una sola contraseña compartida.
- **Correo:** se envía con `mail()`, sin autenticar.
- **Hosting:** GoDaddy compartido, sin procesos persistentes.
- El **Starter V0.1** (Next.js 16 + Prisma + PostgreSQL, ~41.000 líneas, 80 modelos) ya resuelve buena parte de esto, pero no tiene correo, panel de administración ni pruebas (auditoría v2 del 28-sep).
- **Volumen:** ~100 miembros. Equipo de 1–3 personas asistidas por agentes.

### Opciones

**A. Mantener PHP y endurecerlo**

| Dimensión | Valoración |
|---|---|
| Complejidad | Baja a corto plazo, creciente |
| Costo | El hosting actual |
| Escalabilidad | Mala: JSON leídos enteros en cada petición |
| Familiaridad | Alta |

- **A favor:** cero migración y riesgo inmediato mínimo.
- **En contra:**
  - la deuda crece: cada función nueva repite el patrón leer-modificar-escribir;
  - el parpadeo no se resuelve sin rehacer el frontend;
  - sin 2FA nominal ni auditoría real.

**B. Starter V0.1: monolito modular Next.js 16 + PostgreSQL en un PaaS (recomendada)**

| Dimensión | Valoración |
|---|---|
| Complejidad | Media |
| Costo | 25–60 USD/mes (PaaS + Postgres + R2) |
| Escalabilidad | Holgada hasta miles de miembros |
| Familiaridad | Media: ya existe y es TypeScript |

- **A favor:**
  - transacciones reales;
  - una sola capa de UI (sin parpadeo);
  - sesiones en la base de datos;
  - datos personales cifrados;
  - CSP y CSRF ya configurados;
  - bcrypt `$2y$` compatible: **nadie tiene que cambiar su contraseña**.
- **En contra:**
  - faltan el correo, el panel de administración y las pruebas;
  - el código está sin resguardo (170 archivos sin commit al 28-sep);
  - hay que reescribir la paridad funcional.

**C. Backend separado (Node/Express o Laravel) + frontend actual**

| Dimensión | Valoración |
|---|---|
| Complejidad | Alta |
| Costo | Dos despliegues |
| Escalabilidad | Buena |
| Familiaridad | Baja |

- **A favor:** mantiene el frontend.
- **En contra:**
  - mantiene la frontera que causa la duplicación y el parpadeo;
  - tira el trabajo del Starter.

### Decisión
**B.** Con reglas estrictas:
1. Congelar el PHP: solo seguridad e integridad.
2. Hacer del Starter la única línea de desarrollo, con CI obligatoria.
3. Usar la suite `qa/` como **contrato de paridad**: los mismos escenarios deben pasar en el sistema nuevo antes del corte.

### Consecuencias
- **Más fácil:** la integridad de los datos (transacciones), el 2FA del admin, las pruebas unitarias por módulo, eliminar la capa propia y el SEO del contenido.
- **Más difícil:**
  - requiere hosting nuevo y DNS;
  - el correo exige SPF, DKIM y DMARC;
  - hay que importar y conciliar los datos;
  - quedan dos sistemas durante 2–3 meses.
- **A revisar:**
  - el proveedor de pagos (Payphone/Kushki o PayPal);
  - qué módulos se retiran (bar/gestión, laboratorio, inventario, factura, editor visual);
  - WhatsApp Business API después del lanzamiento.

### Acciones
1. [ ] Hoy: commit del Starter y repositorio remoto **privado**. **Necesito acceso al Starter** para ejecutar las fases siguientes: no venía en los ZIP.
2. [ ] Elegir el PaaS (Render o Railway) y crear el entorno *staging*.
3. [ ] Llevar las reglas de negocio de §6 a `src/modules/*` con sus pruebas.

---

## 6. Lo que la migración NO debe perder (reglas de negocio verificadas en el PHP)

Estas reglas salieron de leer y probar el código real. Cada una debe tener prueba en el Starter.

| Dominio | Regla | Origen |
|---|---|---|
| Identidad | Contraseñas bcrypt `$2y$`: verificar con `bcryptjs` y rehashear a argon2id al iniciar sesión | `auth.php` |
| Identidad | Códigos de respaldo 2FA en **dos formatos**: legacy sha256+sal fija y bcrypt. Aceptar ambos y **no migrar los legacy, invalidarlos** (pedir códigos nuevos) | `twofactor.php` |
| Identidad | Cambiar o restablecer la contraseña cierra las demás sesiones | `_bootstrap.php` (`pass_changed_at`) |
| Identidad | Una cuenta suspendida, bloqueada o eliminada pierde la sesión abierta en su siguiente petición | `cuenta_restringida()` |
| Privacidad | El directorio público usa una **lista blanca** de campos. Sin sesión: sin correo ni WhatsApp; coordenadas de finca redondeadas a 2 decimales; ficha técnica y documentos solo con cuenta (decisión del 8-sep) | `members.php`, `lotes.php` |
| Marketplace | Lotes demo: visibles con insignia, **no se pueden pedir y no se migran** | `lotes.php`, `pedidos.php` |
| Marketplace | Disponibilidad calculada: agotado si lo dice el dueño o si no hay existencias. Los agotados van al final, no se ocultan | `lote_disponibilidad()` |
| Marketplace | Material de siembra (semilla, plántula) y café tostado se venden **por unidad**; el café verde por saco | `lotes.php` |
| Pedidos | Total = cantidad × precio del lote, calculado por el servidor; 0 = a convenir; no más que las existencias | `pedidos.php` |
| Pedidos | Estados Solicitado → Aceptado → En camino → Entregado, más Cancelado. Un cancelado no se entrega. Se registra la aceptación del aviso de pagos con su versión | `pedidos.php`, `_avisos.php` |
| Moderación | Debido proceso: infracción del catálogo, medida proporcional, hechos de al menos 30 caracteres, evidencia para bloquear, apelación firmada (HMAC) en 10 días, justificación de al menos 20 caracteres para levantar | `moderacion.php` |
| LOPDP | La baja borra perfil, publicaciones y avisos; conserva pedidos cerrados sin contacto; exige que no haya pedidos abiertos. El registro de consentimientos guarda versión, IP y fecha | `moderacion.php`, `auth.php` |
| Contacto | El aviso de «preguntó por tu lote» se limita a uno cada 12 h por lote | `lotes.php` |
| Socios | El preacuerdo solo se sirve a un registro aceptado, comprobado en el servidor | `socios/...index.php` |

### Mapa de datos (los 51 nombres de `ALLOWED_DATA_NAMES` → Starter)

| JSON actual | Modelo destino | Nota |
|---|---|---|
| `members`, `consents` | `User`, `Profile`, `Activity`, `UserConsent` | `rol`/`roles` → `Activity`; `admin` → `SystemRole` nominal |
| `lotes` | `Listing` (SELL) + `Lot` | Filtrar `demo`/`ejemplo`; `LegacyEntityLink` por id |
| `requerimientos`, `ofertas-requerimiento` | `Listing` (BUY), `Offer` | |
| `pedidos`, `cotizaciones` | `Deal`, `ServiceQuote` | Conservar `nro` como referencia legacy |
| `chats`, `messages` | `Conversation`, `Message` | |
| `posts` | `CommunityPost` | Los «avisos» automáticos no se migran: se regeneran |
| `cursos`, `contenido-cursos`, `inscripciones-cursos`, `progreso-cursos` | Academia | |
| `ratings` | `Review` | Solo las vinculadas a un pedido real |
| `sanciones`, `reportes`, `notas-admin`, `bajas` | `Sanction`, `Report`, `AuditLog`, `DeletionRequest` | Plazo de retención LOPDP |
| `servicios-terceros`, `servicios`, `ordenes` | Servicios y órdenes | |
| `notificaciones`, `actividad`, `metricas` | No migrar; `metricas` solo agregada | Empezar limpio |
| `.sess`, `.rate`, `otp-active`, `password-resets` | **No migrar** | Volátiles; secretos |

---

## 7. Estrategia de pruebas (skill `testing-strategy`)

| Nivel | Qué | Herramienta | Meta |
|---|---|---|---|
| Unitarias | Las reglas de §6 en `src/modules/*/service.ts` (total del pedido, disponibilidad, permisos por recurso, debido proceso) | Vitest | ≥ 80 % de líneas en `marketplace`, `negotiation`, `identity`, `admin` |
| Integración | Route Handlers contra Postgres real (Testcontainers): autorización por recurso, validación Zod, **concurrencia** (80 escrituras simultáneas = 80 guardadas) | Vitest + pg | Cada endpoint con un caso de «otro usuario no puede» |
| Contrato y paridad | **Portar `qa/qa_api.py` y los 17 casos de la auditoría** a escenarios que corran contra PHP y contra el Starter, con el mismo resultado esperado | Python o Playwright request | 100 % antes del corte |
| E2E | 8 flujos críticos: registro con plan, login con 2FA, publicar lote, pedir lote, pedir vivero, solicitar servicio, chat, baja de cuenta | Playwright (móvil y escritorio) | Verdes en CI |
| Seguridad | `/security-review` por PR; cabeceras (CSP con *nonces*); subida de archivos (tipo real, re-encodificación con `sharp`) | CI | 0 hallazgos altos |
| Migración | Simulación del importador: conteos, muestreo manual de 20 registros y **login de los miembros con su contraseña actual** | Scripts del Starter | Conteos idénticos; 100 % de logins |
| Visual y accesibilidad | Contraste AA, toques ≥ 44 px, parpadeo < 0,3 s | `parpadeo.mjs`, axe | 0 regresiones |

Lo que falta hoy en `qa/`:
- concurrencia por endpoint (solo hay una prueba global);
- pagos;
- CSV (C-11 falla);
- 2FA de punta a punta.

---

## 8. Diseño

| Regla | Origen | Aplicación |
|---|---|---|
| Identidad **Stradale**: verde bosque `#18251F`, crema `#F7F4EF`, caramelo `#CA8E46`, acento `#8A5A22`, DM Sans, botones rectos en mayúsculas | README de la fuente; Starter | Tokens CSS únicos en el Starter. Retirar los 10.566 líneas de `globals.css` en favor de componentes |
| **Un solo CTA primario** por pantalla. Login en la cabecera; WhatsApp como botón secundario | `concepto/`, auditoría de diseño | Portada, ficha de lote, servicios |
| **Insignia obligatoria demo/real** en la tarjeta, no solo en el detalle | Hallazgo n.º 1 de los 4 análisis | Componente `ListingCard` |
| Propuesta de valor **por perfil** y **prueba social real** (casos con nombre, provincia y resultado) | Auditoría de diseño | Portada |
| Navegación inferior en el móvil: Inicio, Marketplace, Publicar, Mensajes, Perfil | Referencia Market | Productores con teléfono |
| PWA con catálogo y mensajes en caché; **un solo video** con póster y `preload="none"` | Auditoría de diseño | Zonas rurales con mala señal |
| WCAG 2.1 AA, toques ≥ 44 px, textos ≥ 15 px | QA del 24-oct | Verificación en CI |
| Martplace, Market y Social: **solo como referencia de patrones**, sin mezclar su código | Plan del 28-sep | — |

---

## 9. Registro de riesgos (skill `risk-assessment`)

| # | Riesgo | Prob. | Impacto | Nivel | Mitigación | Estado |
|---|---|---|---|---|---|---|
| R1 | Subir el parche de 11 archivos sobre `20261002a` → pedidos rotos | Media | Alto | **Alto** | Entregar solo el paquete completo; requisito de versión en el checklist | Mitigado |
| R2 | Fraude o abuso en el pago PayPal (moneda, ruta del ID) | Media | Alto | **Alto** | Arreglo n.º 1 de §4 esta semana | Abierto |
| R3 | Pérdida de mensajes o registros por concurrencia en endpoints sin bloqueo | Alta | Medio | **Alto** | §4 n.º 2 y 5; transacciones en el Starter | Abierto |
| R4 | Pérdida del trabajo del Starter (sin commits ni remoto) | Media | Alto | **Alto** | Repositorio privado hoy | Abierto (sin confirmar) |
| R5 | Correo sin autenticar → códigos y recuperaciones en spam | Alta | Medio | **Alto** | SPF, DKIM y DMARC con un proveedor transaccional (Fase 1) | Abierto |
| R6 | Corte con pérdida o desfase de datos | Baja | Alto | Medio | Ensayo general, PHP en solo lectura, reversa probada, conteos | Planificado |
| R7 | Datos personales en carpetas de trabajo (`members (2).json`, *dumps*) | Media | Alto | **Alto** | Volumen cifrado y borrado tras el corte; LOPDP art. 37 | Abierto |
| R8 | Desfase entre el React local y el publicado (el README avisa que la copia era del 26-sep) | Media | Medio | Medio | Congelar el React del PHP; la UI nueva se hace solo en el Starter | Aceptado |
| R9 | EUDR: los compradores europeos exigen geolocalización de parcelas (30-dic-2026 grandes; 30-jun-2027 pequeños) | Alta | Medio | **Alto** (oportunidad) | Módulo `compliance` (polígono y GeoJSON) en la Fase 4, antes de jun-2027 | Planificado |
| R10 | Una sola persona clave y sin documentación del despliegue | Media | Medio | Medio | Runbook de despliegue y reversa; CI | Abierto |

---

## 10. Hoja de ruta

Estimación para 1 desarrollador asistido por agentes. Cada fase termina en algo verificable.

| Fase | Fechas | Entregables | Criterio de salida |
|---|---|---|---|
| **0. Hoy–esta semana** | 26–30 oct | Subir el paquete corregido (§3); incremental `20261027a` con §4 n.º 1–7; Starter en repositorio privado con CI (`tsc` + lint + build) | Checklist §3 en verde; suite `qa/` igual o mejor; CI en verde |
| **1. Cimientos** | 2–27 nov | Zod en todas las rutas; `src/modules/*`; correo transaccional; worker pg-boss; 2FA TOTP y admin nominal; R2; Sentry; **staging** | E2E de registro → verificación de correo → publicar → pedir → chat en staging |
| **2. Paridad mínima** | 30 nov–18 dic | Panel de administración (verificaciones, moderación con debido proceso, contenidos, auditoría); precios ICE; CMS de noticias y recetas; 301 de URLs viejas; **paridad `qa/` al 100 %** | Pruebas de contrato (§7) verdes contra ambos sistemas; `/security-review` sin hallazgos altos |
| **Pausa** | 19 dic–6 ene | Sin corte en fiestas: solo ensayos en staging | — |
| **3. Ensayo y corte** | 7–23 ene 2027 | Dos ensayos completos de importación; ventana de corte con el PHP en solo lectura; DNS; PHP archivado 30 días | Conteos idénticos; los miembros entran con su contraseña; reversa probada |
| **4. Post-lanzamiento** | feb–jun 2027 | EUDR (parcelas y GeoJSON) antes del 30-jun-2027; pagos de verificación; PWA; resumen por correo; WhatsApp Business | Embudo: registro → perfil completo → primera publicación → primer contacto |

---

## 11. Decisiones que necesito

1. **Subir el paquete corregido** esta semana (§3): ¿sí?
2. **Acceso a red** a `redcafeecuador.com` desde este entorno, para cerrar la comparación con producción.
3. **El Starter V0.1:** súbelo (sin `node_modules` ni datos) para empezar la Fase 0/1.
4. **Hosting:** PaaS (recomendado) o VPS.
5. **Módulos que se retiran:** bar/gestión, laboratorio, inventario, factura, editor visual.
6. **Pagos al lanzar:** PayPal, Payphone/Kushki o posponer.
7. **El diseño** al que te referías (tu mensaje se cortó): ¿Stradale + concepto, u otro?
