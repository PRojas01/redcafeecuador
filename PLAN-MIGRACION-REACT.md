# Plan: eliminar la duplicación React ↔ capa propia (migrar a React)

Fecha: 2026-10-01 · Medido en producción `20261001c` (65 páginas, móvil).

## Diagnóstico
- La «capa propia» (35 archivos `redcafe-*.js`, 855 KB) **oculta bloques de React y pinta los suyos
  después de cargar**. Resultado: **las 65 páginas parpadean entre 1,5 y 4,1 s** mostrando primero la
  versión de React y luego la de la capa (solapamiento de versiones).
- Peores: `/marketplace/` 4,1 s (23 ocultos / 34 pintados), `/` 3,7 s (17/18), `/servicios/` y
  `/servicios/contratar/` 2,4 s (14/16).
- **Base común en todas las páginas** (2 ocultos / 3 pintados):
  1. Botón flotante: React pinta «Comunidad de la Red» **+ «Canales de la Red» (redes)**; la capa los
     oculta y pinta solo Comunidad → el botón de redes se ve durante el parpadeo.
  2. «Fuente oficial» del ticker → la capa lo cambia por «Fuente».
  3. Vídeo de fondo añadido por la capa en todas las páginas.
- Datos crudos: `qa/parpadeo-produccion-20261001c.json`.

## Regla (propietario)
Lo repetido o desactualizado se **borra**, no se oculta. Ningún parche nuevo en la capa: cada
cambio va al fuente React y se elimina la versión vieja y el código de capa que la sustituía.

## Solución definitiva: migración por rutas
Cada paquete migra un bloque: se implementa en `plataforma_cafe` (React), se **borra** el código de
la capa que lo sustituía y el contenido viejo de React, se recompila y se publica incremental.

| Fase | Alcance | Efecto esperado |
|---|---|---|
| 1 | **Globales**: botón flotante (solo Comunidad, se borra «Canales de la Red»), texto «Fuente» del ticker, vídeo de fondo | Parpadeo eliminado en ~55 páginas simples |
| 2 | **Portada** (17/18) y **/afiliate/** (registro, prioridad 1) | Portada estable; registro sin saltos |
| 3 | **Marketplace** y fichas de lote (23/34) | Compra/venta sin solapamientos |
| 4 | **Servicios / contratar** (14/16) | — |
| 5 | **Academia, curso, panel, comunidad** | Capa reducida a funciones sin equivalente React |

Criterio de salida de cada fase (medido, no estimado): en las rutas migradas **0 bloques ocultos,
0 pintados, parpadeo < 0,3 s**; batería API, E2E de registro/cursos, recorrido de 65 rutas y
contraste **sin regresiones**; simulación de subida idéntica a lo probado.

## Requisito para empezar
El **fuente React vigente** (`plataforma_cafe` del NAS, sin `node_modules`): la copia local es del
26-sep y 20261001a se compiló con cambios posteriores. Sin él, recompilar revertiría esos cambios.
Y coordinar con el resto de agentes: **congelar** nuevos parches en la capa mientras dure.

## Herramientas ya disponibles
`herramientas/incremental-sobre-produccion.py` (ensambla sobre producción y verifica), `qa/recorrido.mjs`,
`qa/e2e_usuarios.mjs`, `qa/e2e_cursos.py`, `qa/qa_api.py`, medidor de parpadeo
(`parpadeo-produccion-*.json`), `empaquetar-actualizacion.py`.
