# Cierre de la jornada — Red Café Ecuador
**Fecha:** 18 de agosto de 2026 · **Paquete:** `red-cafe-ecuador-20260818-V11-lanzamiento.zip`
**Base:** AUDITORIA_REDCAFE_2026-08-18.md · PLAN_MEJORA_REDCAFE_2026-08-18.md · BRIEF_REDISENO_VISUAL_2026-08-18.md

---

## 1. Qué se cerró

### Seguridad (Onda 0)
| Hallazgo | Estado | Comprobación |
|---|---|---|
| Código 2FA devuelto en la respuesta HTTP (`\|\| true`) | Cerrado | El campo solo aparece con `OTP_DEBUG_MODE=1` |
| Verificación de OTP sin límite de intentos | Cerrado | `check_rate_limit('otp_verify', 5, 600)` |
| Borrado de comunidad con la autorización invertida | Cerrado | Guarda explícita con `$_SESSION['admin']` |
| Códigos de respaldo que nunca se invalidaban | Cerrado | `foreach ($members as &$m)` + guardado posterior |
| Contraseña de administrador en texto plano | Cerrado | Archivo con hash `$2y$12$`, permisos 0600 |
| Contenido sembrado con nombres inventados | Cerrado | Embeds vaciados y marcados como ejemplo |

### Captación
- **`api/enviar-waitlist.php` creado.** Antes devolvía 404 y cada correo se guardaba en el
  navegador del propio visitante mostrándole «listo, te avisamos». Probado: alta 200,
  duplicado 409, correo inválido 422, límite de intentos 429, y el registro aparece en
  `data/waitlist.json`.
- Eliminado el respaldo silencioso a `localStorage` en `Waitlist.tsx`: un fallo ahora se ve.

### Mensaje
- Escrow, facturación SRI y laboratorios aliados pasan a futuro declarado («Próximamente»),
  sin borrar la promesa. Las frases originales ya no existen en el código.
- Nota de vigencia en `legal` y `terminos-y-condiciones`: qué está operativo y qué no,
  incluida la aclaración de que las cláusulas de cuota mensual no aplican con planes gratuitos.
- `Total a pagar (escrow)` → `Total a pagar` en la pantalla de compra.

### Rediseño visual (31 páginas)
- Iconografía SVG propia en lugar de 14 emojis; eliminado el cuadrado tintado que los envolvía.
- Cinco láminas ilustradas dibujadas en SVG (finca, cereza, saco, taza, camas de secado).
- Tres composiciones alternas en lugar de una repetida diez veces.
- Tokens renombrados a su valor real (`tostado`, `latte`) y recuperados el cereza y el verde hoja.
- Sin tarjetas que levitan. Adorno de subrayado ya no global.
- Texto del sitio sin cambios salvo las promesas autorizadas arriba.

### Producto
- Nuevo perfil **Proveedor de Equipos e Insumos**: en `PLANES`, en `planes.json`, en el
  selector de registro, en la lista de espera, con icono propio, y aceptado por la whitelist
  de roles del backend. Probado: el registro con ese rol devuelve 200; un rol inventado, 422.

---

## 2. Verificación final

| Comprobación | Resultado |
|---|---|
| Build con `NEXT_PUBLIC_BASE_PATH=/redcafeecuador` | Correcto |
| Rutas exportadas | 51 páginas HTML |
| TypeScript (`tsc --noEmit`) | Sin errores |
| Desbordamiento horizontal a 375 px (12 páginas) | **0 en todas** |
| Controles por debajo de 44 px | 3, y los tres son enlaces en línea dentro de texto |
| SVG sin `aria-hidden` ni `role` | 0 |
| Emojis pictográficos en el código | 0 |
| Tokens de color obsoletos | 0 |
| `hover:-translate-y-1` | 0 |
| Login de administrador con la contraseña vigente | Funciona, y el archivo queda cifrado |
| Paquetes anteriores (V8, V9, V10) | Intactos, fechas originales |

Pruebas de API ejecutadas contra una copia aislada en `/tmp`, nunca contra los datos reales.
El entorno de pruebas se eliminó al terminar.

---

## 3. El paquete V11

`red-cafe-ecuador-20260818-V11-lanzamiento.zip` — 1,1 MB, rutas en la raíz, listo para
extraer en `public_html/redcafeecuador/`. Incluye `LEEME_V11.txt` con el procedimiento.

**Deliberadamente NO incluye:** `.redcafe_admin_pass`, `data/.sess/`, `members.json`,
`waitlist.json`, `consents.json`, ni registros de OTP. El servidor conserva los suyos y el
paquete no debe pisar `data/`.

---

## 4. Acciones para el dueño

1. **Cambiar la contraseña de administrador.** Quedó registrada en claro en los registros de
   trabajo del 18/08 durante las pruebas de un agente; hay que considerarla comprometida.
   El sistema ya guarda la nueva cifrada.
2. Hacer copia de `data/` del servidor **antes** de extraer el paquete.
3. Tras subir: comprobar que `api/enviar-waitlist.php` responde y que `data/` devuelve 403.
4. Conseguir las tres fotografías pendientes (`public/img/LEEME.txt`).

---

## 5. Lo que sigue abierto

- **Sin pasarela de pago.** Los servicios se cobran por transferencia con confirmación manual.
- **`data/` sigue dentro del webroot**, protegido solo por `.htaccess`. Sacarlo fuera es la
  mejora de seguridad pendiente más importante; `DATA_DIR` es una constante única.
- **Sin copia de seguridad automática** de `data/`. Hoy no existe ninguna.
- **Sin token CSRF**, y `input()` sigue aceptando `$_REQUEST` en escrituras.
- **Las páginas legales describen un escrow que no existe.** La nota de vigencia lo advierte,
  pero el contrato debería reescribirse cuando el escrow y los precios estén decididos.
- **El proyecto no está bajo control de versiones.** Toda esta jornada se revisó comparando
  contra un respaldo manual. Un `git init` haría auditable cualquier entrega futura.
