# QA_OPENCODE_20260926 — Auditoría estática (revisión de fixes + responsividad)

Fecha: 2026-09-26 · Analista: OpenCode (análisis estático de código, sin ejecución ni navegador)
Archivos revisados: `components/Navbar.tsx`, `app/panel/page.tsx` (3601 líneas, completas), `app/admin/page.tsx`, `app/afiliate/page.tsx`, `app/servicios/precios/ClientPage.tsx`, `app/page.tsx`, `app/marketplace/page.tsx`.
No se modificó ningún archivo de código.

---

## 1. Veredicto de la Tarea 1

### 1a. `components/Navbar.tsx` — mover "Cerrar sesión" arriba en el menú móvil: **OK**

- **JSX bien formado:** el bloque móvil con sesión (`components/Navbar.tsx:196-220`) está balanceado y correcto: un `<div className="mb-1 flex items-center gap-2 border-b …">` con el enlace `Mi Red (first)` (`flex-1`), el enlace de chat con `aria-label="Chat de mensajes"` y el botón `Cerrar sesión` con estilo propio (`border-acento-claro`, `font-semibold`, `shrink-0`).
- **`logout()` intacta:** `components/Navbar.tsx:39-44`, sin cambios (api.logout → limpiar sesión → redirigir).
- **Sin duplicados:** existe exactamente un botón de cierre de sesión por rama visible. El "Salir" de desktop (`components/Navbar.tsx:141-146`) vive en `<nav className="hidden … lg:flex">`; el "Cerrar sesión" de móvil (`components/Navbar.tsx:213-218`) en `<div className="… lg:hidden">`. Son ramas mutuamente excluyentes — no hay dos botones de logout renderizados a la vez en ningún camino.
- **Rama `!user` sin tocar:** `components/Navbar.tsx:179-195` ("Forma parte de la Red" + "Entrar"), idéntica a su forma original.

### 1b. `app/panel/page.tsx` — `roles.map` con `<details>` controlado (`rolAbierto`): **OK**

- **Estado correcto:** `const [rolAbierto, setRolAbierto] = useState<string | null>(null)` (`app/panel/page.tsx:167`) — colapsado por defecto.
- **Solo un `<details>` abierto a la vez:** `open={rolAbierto === r}` (`app/panel/page.tsx:292`) dentro de `roles.map` (`app/panel/page.tsx:289`) — la condición es única por render, así que imposible tener dos abiertos.
- **Sincronización manual:** `onToggle={(e) => setRolAbierto(e.currentTarget.open ? r : null)}` (`app/panel/page.tsx:293`) — `e.currentTarget` es el propio `<details>`; el estado refleja la acción del usuario en ambos sentidos.
- **Elegir una opción navega Y colapsa:** `onClick={() => { setVista(t.id); setPerfilActivo(r); setRolAbierto(null); }}` (`app/panel/page.tsx:299`) — además `setPerfilActivo(r)` mantiene coherente el perfil activo con la opción elegida.
- **Multirol:** `rolesDeUsuario` (`app/panel/page.tsx:48-51`) filtra roles válidos (excluye `admin`, fallback `["productor"]`); `tabsPorRol` (`app/panel/page.tsx:53-129`) devuelve un arreglo propio por rol; los ids compartidos entre roles (`inventario`, `bitacora`, `…comun`) se deduplican en la barra global `tabs` (`app/panel/page.tsx:227-232`) con `.filter(… findIndex …)`. La key del `<details>` es `r` y la de cada botón `` `${r}-${t.id}` `` (`app/panel/page.tsx:298`) — único por grupo. **Riesgo menor:** `rolesDeUsuario` no deduplica explícitamente; si el backend devolviera `roles: ["productor","productor"]`, React vería keys repetidas. No ocurre con el backend actual, pero un `[...new Set(base)]` lo haría robusto.
- **Accesibilidad de teclado intacta:** `<details>`/`<summary>` nativo es operable por teclado (Enter/Espacio) y anuncia `expanded` automáticamente; el fix no quitó ningún atributo `aria` ni sustituyó el summary por un botón. Correcto.
- **Sin regresión en la barra de accesos rápidos:** `app/panel/page.tsx:282-287` sigue renderizando `Resumen / Informes técnicos / Mi cuenta` con `flex-wrap`.

---

## 2. Otros acordeones con el mismo bug potencial (estado recalculado en render)

**No se encontró ningún otro caso** en los archivos revisados. Verificación específica:

- `app/panel/page.tsx`: es el único `<details>` del archivo (grep: un solo `open=` y un solo `onToggle`, ambos en `app/panel/page.tsx:292-293`). No existen atributos `.open =`, ni `useState` con nombres `abierto/expandido/mostrar`, ni `aria-expanded`. El estado `step` de `TwoFactorPanel` (`app/panel/page.tsx:2399`) es una máquina de estados propia (vistas `enable_confirm`/`disable_confirm`…), no una expresión recalculada — correcto.
- `components/Navbar.tsx:111-126` (desplegable "Más" de desktop): `<details>` **nativo sin estado controlado** — el navegador persiste su apertura entre re-renders; no presenta el bug.
- `app/admin/page.tsx`, `app/afiliate/page.tsx`, `app/servicios/precios/ClientPage.tsx`, `app/page.tsx`, `app/marketplace/page.tsx`: sin `<details>` ni colapsables con estado derivado del render. El bottom sheet de filtros de marketplace (`app/marketplace/page.tsx:672, 754`) usa `filtrosAbiertos` con `setFiltrosAbiertos(false)` directo — bien.

**Conclusión:** el bug del `open={r === roles[0]}` recalculado era un caso único; el patrón no se repite en el archivo ni en el resto del sitio auditado.

---

## 3. Hallazgos de la Tarea 2 — por archivo, ordenados por severidad

### `app/admin/page.tsx` (2028 líneas)

**Severidad alta**
- `admin/page.tsx:~173` — **"Cerrar sesión" escondido en un `flex` sin `flex-wrap`** (junto a "Chat" y "Ver Bar"): en 375px la fila desborda y el cierre de sesión queda fuera de vista o inalcanzable. Es el **mismo patrón del bug de "Salir"** que se corrigió en Navbar móvil, aquí en el panel de administración.
- `admin/page.tsx:~800` — toggle "Activo/Inactivo" de miembros con `px-2 py-0.5`: **~20×20px de área táctil**, extremadamente difícil de tocar en móvil.

**Severidad media**
- `admin/page.tsx:~646, ~806-808, ~997, ~1002, ~1282-1283, ~1646-1647` — acciones de tabla/tarjeta (`Editar`, `Eliminar`, `Reset datos`, `Reset contraseña`, `Marcar pagado`, `Completar`) con `px-2 py-1 text-xs` (~20-24px de alto). Todas por debajo del estándar del sitio (`min-h-10`).
- `admin/page.tsx:~646, ~808, ~1283, ~1647` — **"Eliminar" con exactamente el mismo estilo visual que "Editar"** (`rounded bg-*/15 px-2 py-1 text-xs`): acción destructiva sin jerarquía ni diferenciación.
- `admin/page.tsx:~106` — label "Contraseña" + enlace "¿Olvidaste la contraseña?" en `flex justify-between` sin wrap: desborda en móvil.
- `admin/page.tsx:~539` — botones "Exportar JSON" y "+ Nuevo" en `flex gap-2` sin wrap.
- `admin/page.tsx:~1812` — grid del Editor Visual `xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]`: no colapsa hasta `xl` (1280px); entre 768-1280px las dos columnas apretadas pueden desbordar.

**Severidad baja**
- `admin/page.tsx:~388-389, ~794-795, ~848, ~978-982, ~1081-1082, ~1162, ~1278, ~1636` — celdas de tablas con nombres/emails largos sin `truncate` (las tablas sí tienen `overflow-x-auto`, así que no rompen el layout, pero el contenido queda cortado de feo).
- CTAs ambiguos: `~762` "Generar temporal", `~1003` "Completar", `~175` "Chat", `~178` "Ver Bar", `~1864` "Quitar preview".
- Labels sin `htmlFor`/`id` asociado: `~363`, `~765`, `~1887`, `~1960-1998` (login, modales y formulario de cuenta).
- `admin/page.tsx:~1281, ~1459, ~1645` — flex internos sin wrap en tarjetas de Media/Páginas/Imágenes.

### `app/marketplace/page.tsx` (762 líneas)

**Severidad media**
- `marketplace/page.tsx:~362, ~447` — botón "✕" limpiar búsqueda con `rounded-full p-1`: **~28×28px** de blanco táctil. Tiene `aria-label`, pero es difícil de pulsar.
- `marketplace/page.tsx:~555` — enlace "WhatsApp" en tarjetas de servicio con `px-2.5 py-2 text-xs`: el `py-2` pisa el padding de `.btn-ghost` y deja **~33px** de alto.
- `marketplace/page.tsx:~690` — "Limpiar filtros" del bottom sheet como texto inline sin padding (~20px de alto).

**Severidad baja**
- `marketplace/page.tsx:~331-343` — tabs "Cafés"/"Servicios" con `py-2` ≈ 36px, justo por debajo de 40px.
- `marketplace/page.tsx:~349-350, ~434-436` — el glifo "⌕" decorativo dentro de los inputs es un `<span>` sin `aria-hidden="true"`: un lector de pantallas lo anunciará como carácter.
- `marketplace/page.tsx:~703` — select Provincia del bottom sheet: `aria-label="Buscar"` **sobrescribe al label visible "Provincia"** y es inconsistente con `f-var`/`f-proc`, que no llevan `aria-label`.
- `marketplace/page.tsx:~673` — overlay de cierre del bottom sheet con `onClick` + `aria-hidden="true"`: elemento interactivo oculto a lectores de pantanas; **cerrar haciendo clic fuera no es operable por teclado** (no `<button>`, no gestiona Escape).
- `marketplace/page.tsx:~650, ~661` — CTAs "Ver"/"Contactar" genéricos dentro de tarjetas (el titular aporta contexto, pero fuera de él resultan ambiguos).

### `app/afiliate/page.tsx` (901 líneas)

**Severidad media**
- `afiliate/page.tsx:~634` — encabezado del paso 2 (`flex justify-between` sin `flex-wrap`): el badge `"{perfil} principal"` puede llegar a "Proveedor de Equipos e Insumos principal" y desbordar junto al título en < 640px.
- `afiliate/page.tsx:~588, ~596` — botones "Activo/Elegir" y "Principal" con `py-2 text-xs` ≈ **32px** de alto.

**Severidad baja**
- `afiliate/page.tsx:~827` — nombre del plan + "$0 gratis" en `flex justify-between` sin `truncate` dentro de cada botón de plan.
- `afiliate/page.tsx:~580` — nombre de perfil largo ("Proveedor de Equipos e Insumos") en tarjetas de una columna sin `truncate`/`break-words` (el `min-w-0` del padre mitiga el desbordamiento real).
- `afiliate/page.tsx:~450` — icono decorativo `<Icono nombre="verificacion">` sin `aria-hidden="true"`.
- `afiliate/page.tsx:~658-713` — los `<label>` del formulario (Nombre, Correo, Contraseña, WhatsApp, Cédula, Provincia) no tienen `htmlFor` ni los inputs `id` (asociación solo implícita por proximidad).

### `app/servicios/precios/ClientPage.tsx` (353 líneas)

**Severidad baja**
- `ClientPage.tsx:~134` — botones de rango ("5D", "1M", "3M", "6M", "1Y") con `py-1.5 text-xs` ≈ 28px de alto. (Caben en 375px; solo el tamaño.)

Puntos positivos: tabla con `overflow-x-auto`, SVG responsivo con `viewBox` + `role="img"`/`aria-label`, grids que colapsan con `sm:grid-cols-2`, flex con `flex-wrap` donde corresponde.

### `app/panel/page.tsx` (3601 líneas)

**Severidad media**
- `panel/page.tsx:1345` — botón "Eliminar" del ítem de menú: `text-xs text-cereza hover:underline` **sin padding** (~20px de alto), inline al final de la fila y con estilo de enlace tenue. Es una **acción destructiva sin confirmación** (llama `api.menuDelete` directa) y sin jerarquía visual.

**Severidad baja**
- `panel/page.tsx:2315-2317, 2323-2326` — botones "Quitar/Añadir/Principal/Hacer principal" en `px-3 py-1.5 text-xs` (~28-30px).
- `panel/page.tsx:1707-1716` — estrellas de puntuación (1-5) **sin `aria-label`**: un lector de pantallas solo anuncia "★"; debería indicar "Puntuación: N de 5".
- `panel/page.tsx:3421, 3481` — botón "✕" de cierre de modales con `p-1` (~28px). Sí tiene `aria-label="Cerrar"`.
- `panel/page.tsx:3029` — "Eliminar" en historial de inventario con `px-3 py-1` (~30px); sí tiene modal de confirmación (`panel/page.tsx:3039-3059`), así que solo aplica el tamaño.
- `panel/page.tsx:625` — "Usar mi ubicación actual" con `px-3 py-1.5 text-xs`.
- `panel/page.tsx:1090` — `leerBitacora` llamado durante el render (side-effect leve en render; no es bug de accesibilidad, solo nota de robustez).

Puntos positivos: todos los grids colapsan con `sm:`/`md:`/`lg:`; no hay tablas sin scroll; las acciones críticas del panel ("Cerrar sesión" `panel/page.tsx:247-249`, "Guardar", "Publicar") son visibles con jerarquía; el modal de eliminación de inventario sí pide confirmación.

### `components/Navbar.tsx` (237 líneas)

**Severidad baja**
- `Navbar.tsx:197` — el header móvil con sesión (`flex items-center gap-2` sin `flex-wrap`): "Mi Red (first)" con `flex-1` **sin `truncate`/`min-w-0`**. Con un primer nombre largo el texto podría comprimir el chat y el botón de cierre. Riesgo bajo (solo incluye el primer nombre), pero `break-words` o `truncate` lo harían robusto.
- `Navbar.tsx:141-146` — en desktop, "Salir" usa `text-crema/60` tenue, al mismo nivel visual que un enlace secundario: acción crítica con poca jerarquía (el fix de jerarquía se aplicó solo en el menú móvil).
- `Navbar.tsx:57-68, 111-126` — "Términos" y "Privacidad" (acciones/avisos importantes) al final de la lista larga del dropdown "Más", sin destacar. No es el bug de estado; es solo jerarquía visual.

### `app/page.tsx` (513 líneas)

**Severidad baja**
- `page.tsx:~280` — CTA "Explorar →" textualmente idéntico en las 4 tarjetas de BENEFICIOS: un lector de pantallas anuncia 4 enlaces idénticos sin contexto.
- `page.tsx:~292` — CTA "Ver más →" repetido en las 4 tarjetas de NUMEROS (mismo problema).
- `page.tsx:~505` — "Leer →" ×3 en noticias (el titular aporta contexto; menor).

Puntos positivos: grids que colapsan correctamente (`sm/md/lg`), CTAs principales con `min-h-11`, sin tablas ni anchos fijos, sin objetivos táctiles pequeños.

---

## 4. Resumen — lo más urgente antes de publicar (5 líneas)

1. **Los dos fixes (Tarea 1) son correctos** y no introducen regresiones; el bug de acordeón con estado recalculado **no se repite** en ningún otro componente del sitio auditado.
2. **Arreglar antes de publicar:** el header móvil de `admin/page.tsx:~173` — "Cerrar sesión" en un `flex` sin `flex-wrap` (mismo patrón del bug de "Salir" ya corregido en Navbar) — y el toggle de activo de miembros `admin/page.tsx:~800` (~20×20px, inutilizable en táctil).
3. **Acciones destructivas sin jerarquía ni confirmación:** "Eliminar" estilo enlace tenue sin `confirm()` en `panel/page.tsx:1345` y con tamaño <24px e idéntico estilo que "Editar" en `admin/page.tsx:~646, ~808, ~1283, ~1647`.
4. **Blancos táctiles pequeños:** subir a `min-h-10` los botones de marketplace `~362/447, ~555, ~690`, afiliate `~588, ~596, ~134` y los botones `py-1` de admin.
5. **Accesibilidad rápida:** añadir `aria-label` a las estrellas (`panel/page.tsx:1712`) y a los CTAs repetidos de home (`~280/292`), `aria-hidden` a los glifos "⌕" (`marketplace/page.tsx:~349`), quitar el `aria-label="Buscar"` que pisa al label visible (`marketplace/page.tsx:~703`) y hacer el overlay del bottom sheet cerrable por teclado (`marketplace/page.tsx:~673`).
