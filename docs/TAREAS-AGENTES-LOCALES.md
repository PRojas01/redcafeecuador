# Tareas para los agentes locales (codex / opencode / Ollama) — 2026-11-06

Decisión de Pedro (6-nov-2026): **migrar todo a React** y borrar la «capa propia»
(`sitio/redcafe-*.js`, ~640 KB, 32 archivos) para que haya una sola versión y no
haya parpadeo. Plan de fondo: `PLAN-MIGRACION-REACT.md`.

Reglas: rama `claude/project-thread-9xcpyp` (o una rama local por tarea), **no publicar,
no push a main, no tocar producción ni datos**. Leer `CLAUDE.md` antes de empezar.
Cada tarea termina con su prueba en local y una línea en `director/bitacora.md`.

## 0. Preparar la compilación de React (bloqueante)
`cd plataforma_cafe && npm ci && npx next build` falla porque faltan 3 archivos
de contenido público que no se versionan:
- `public/data/contenido-recetas.json` y `public/data/contenido-cursos-legacy.json`:
  sacarlos del chunk compilado `sitio/_next/static/chunks/2808-*.js` (son las
  recetas y los cursos legacy que el sitio ya muestra; contenido público).
- `public/data/_semilla/media.json`: `[]`.
Hecho cuando `npx next build` termina con exit 0. Luego comparar `out/` con
`sitio/` (rutas y textos) para saber qué cambios del compilado faltan en el fuente.

## 1. Inventario de la capa (solo leer, escribir informe)
Para cada `sitio/redcafe-*.js`: en qué páginas carga, qué bloques de React oculta
(`data-redcafe-oculto-react`, `style.display = "none"`), qué pinta, qué API llama.
Salida: `docs/inventario-capa.md` con una tabla. Ollama sirve para resumir, pero
verificar cada punto (da falsos positivos).

## 2. Fases de migración (en este orden; cada una en React y borrando su capa)
1. Base común: menú, pie, botón flotante, video de fondo, sesión, campana
   (`redcafe-v60-final.js`, `redcafe-v60-mejoras-obligatorias.js`, `redcafe-menu.js`,
   `redcafe-sesion.js`, `redcafe-notificaciones.js`, `redcafe-fusion.js`, `redcafe-ruta.js`).
2. Inicio y registro (carrusel, collage de accesos, textos del hero; `redcafe-conversion.js`).
3. Academia y cursos (`redcafe-academia.js`, `redcafe-cursos-autor.js`).
4. Marketplace, fichas y servicios (`redcafe-aviso-pedidos.js`, `redcafe-referencia.js`).
5. Panel, comunidad, empleos, requerimientos, admin (resto de archivos).

Criterio de salida de cada fase: en sus rutas 0 bloques ocultos y parpadeo < 300 ms
(`qa/parpadeo.mjs`), y verdes `qa/qa_api.py`, `qa/e2e_movil.mjs`, `qa/e2e_usuarios.mjs`,
`qa/e2e_cuentas.mjs`, `qa/e2e_mejoras.mjs`, `qa/e2e_cursos.py` con `servidor/paridad.sh`
(MySQL/MariaDB local, base `redcafe_test`). Contraste AA ≥ 4,5:1.

## Ya hecho en la nube (6-nov)
- `sitio/redcafe-academia.js`: espera a que React hidrate antes de tocar la página
  (quitaba el parpadeo grande de /academia/: error #418 y repintado completo).
  Probado en local; falta medirlo en la vista previa.
- Medición en la vista previa (20261106i): parpadeo en /academia/ (repintado a ~1,2 s)
  e inicio (video, carrusel y collage a 0,6–2 s). redcafeecuador.com sigue en PHP 20261002a.
