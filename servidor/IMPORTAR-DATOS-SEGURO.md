# Pasar los datos reales a la plataforma nueva, sin exponerlos

Los datos personales de los miembros (nombres, correos, teléfonos, cédulas,
contraseñas, mensajes) **solo existen en tres sitios**: el hosting antiguo, tu
equipo y la base de datos nueva. No pasan por el repositorio, ni por el chat,
ni por ningún archivo del servidor nuevo.

## Las tres piezas

| Pieza | Dónde | Qué hace |
|---|---|---|
| `herramientas/procesar-respaldo.html` | Tu navegador, sin internet | Lee el `.zip` del hosting y genera un **paquete cifrado** (datos reales) y una **copia anónima** (para pruebas). |
| `/admin/importar/` | La plataforma nueva | Recibe el paquete, lo descifra **en memoria** y lo guarda en la base. Primero simula. |
| `herramientas/vigilar-datos.mjs` | GitHub, en cada cambio | Bloquea el repositorio si alguien sube correos, teléfonos, cédulas o archivos de datos. |

## Paso a paso

1. **Descarga el respaldo** del hosting antiguo: `public_html/data/`, `public_html/uploads/`
   y el archivo `.redcafe_admin_pass` (está fuera de `public_html`). Un solo `.zip`.
2. **Abre `procesar-respaldo.html`** con doble clic (Chrome o Edge) y elige el `.zip`.
   Revisa la tabla: qué va al paquete cifrado, qué va a la copia anónima y qué se descarta.
3. **Crea el paquete cifrado:** elige una contraseña de 12 caracteres o más.
   Descarga `redcafe-datos.rcpaquete`. Guarda la contraseña aparte (gestor de
   contraseñas o papel). **Nunca la envíes por chat ni por correo.**
4. (Opcional) **Descarga la copia anónima** `redcafe-anonimo.json`. Es lo único que
   se puede compartir para revisar el sitio con contenido real.
5. **Activa la importación** en el panel de GoDaddy: variable `REDCAFE_IMPORTACION=1`
   y vuelve a desplegar.
6. Entra en `/admin/` con la contraseña de administración y abre **`/admin/importar/`**.
   Elige el paquete, escribe la contraseña y pulsa **Simular**. Revisa la tabla.
7. Si todo cuadra, pulsa **Importar de verdad**. Los miembros entrarán con su
   contraseña de siempre; la contraseña de administración pasa a ser la del sitio antiguo.
8. **Apaga la importación:** borra `REDCAFE_IMPORTACION` del panel y vuelve a desplegar.
9. **Borra** de tu equipo el `.zip`, la carpeta descomprimida y el paquete cuando
   compruebes que todo está bien (una o dos semanas).

Para el corte definitivo se repite desde el paso 1 con el respaldo de ese día.
Lo que ya se importó no se duplica.

## Qué protege cada capa

- **El navegador no puede filtrar nada:** la página prohíbe cualquier conexión de red
  (`connect-src 'none'`) y no carga código externo.
- **Se descarta lo que no hace falta:** sesiones, códigos de un solo uso, enlaces de
  recuperación, cupos, bloqueos, copias antiguas, PHP y archivos de configuración.
- **Paquete cifrado:** AES-256-GCM con clave derivada de tu contraseña
  (PBKDF2-SHA256, 600 000 iteraciones). Si se manipula, no se abre.
- **Servidor:** la pantalla de importación está apagada salvo con `REDCAFE_IMPORTACION=1`,
  exige la sesión de administración, limita los intentos (10 por hora) y no escribe
  los datos en disco: van a la base, donde **las cédulas se guardan cifradas** y las
  contraseñas siguen siendo hashes bcrypt. Solo se guardan las fotos (jpg, png, webp,
  gif, pdf) en `REDCAFE_UPLOADS`. Queda anotado quién importó y cuándo, sin contenido.
- **Repositorio:** `.gitignore` excluye `data/`, `uploads/`, `.zip`, paquetes y copias;
  y el vigilante falla en GitHub si aparece un correo, un teléfono o una cédula válida
  que no esté en `herramientas/datos-permitidos.txt` (solo datos públicos o ficticios).
