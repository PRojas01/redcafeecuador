# Estado del proyecto — traspaso a opencode
**19 de agosto de 2026, 17:40** · Sitio en producción: https://redcafeecuador.com (raíz del dominio)

## Cambios hechos hoy que NO deben perderse
Si tocas estos archivos, respeta lo siguiente:

| Archivo | Qué se hizo |
|---|---|
| `components/Navbar.tsx` | 9 estados de `hover:text-latte` → `hover:text-acento-claro`. El acento de fondo claro (#A94E17) sobre la cabecera café da 2,83:1 y el texto desaparece. **No revertir.** |
| `components/Marca.tsx` | Logotipo nuevo (`LogoRedCafe`: dos arcos con flecha + grano) y `BanderaEcuador` (imagen oficial con escudo, 3 tamaños). Antes se llamaba `ManchaEcuador.tsx`. |
| `components/Footer.tsx` | Redes reales desde `CONFIG.redes`; antes enlazaba a `facebook.com` e `instagram.com` sin perfil. |
| `app/page.tsx` | Titular «Conéctate a la red de valor…», etiqueta «Nueva plataforma», subtítulo en 3 bloques, botón de WhatsApp en el bloque de captación, tarjeta del perfil Asesor. |
| `lib/config.ts` | WhatsApp real `593968641376` («Asesor redcafeEcuador») y `redes` verificadas una a una. |
| `app/globals.css` | Dos acentos: `--color-latte` #A94E17 (sobre papel) y `--color-acento-claro` #DFA066 (sobre café). Sin degradados, sin bordes redondeados. |
| `app/*/layout.tsx` | 7 layouts nuevos solo para declarar `metadata` con canonical propio. **No borrar.** |

## Reglas de estilo vigentes
- Sin degradados. Sin bordes redondeados (salvo círculos reales). Sin sombras difusas.
- Sin emojis: usar `components/Icono.tsx`.
- Colores solo por token. El acento claro SOLO sobre fondo oscuro; el normal SOLO sobre claro.
- Datos y precios en monoespaciada (`.dato`), etiquetas en `.rotulo`.
- Precios de servicios siempre con «desde».
- Trece perfiles. Nada de emojis, nombres de personas inventadas ni cifras sin fuente.
- Escrow, facturación SRI y laboratorios: siempre en futuro, nunca como funciones activas.

## Pendiente en el SERVIDOR (no se resuelve con código)
1. `data/lotes.json`: 6 lotes de ejemplo con `verificado: true` y productores inventados.
2. Redirección 301 de `solucionespro.net/redcafeecuador/` al dominio nuevo.
3. Cambiar la contraseña de administrador.
4. Desactivar la analítica de GoDaddy (cookies sin consentimiento).
5. Completar los perfiles de redes sociales.
