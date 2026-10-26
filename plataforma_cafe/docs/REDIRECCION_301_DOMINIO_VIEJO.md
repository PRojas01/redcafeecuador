# Redirección 301 desde el subdirectorio viejo

**Qué se arregla:** `solucionespro.net/redcafeecuador/` y todas sus rutas devuelven hoy
**404**. Cada enlace que circula por Google, por WhatsApp o en un correo antiguo lleva a
una página de error. Con un 301 ese tráfico llega al sitio nuevo y, además, Google
traspasa la autoridad acumulada al dominio propio en lugar de descartarla.

**Dónde va:** en **solucionespro.net**, NO en redcafeecuador.com. Es el servidor de origen
el que tiene que redirigir. Esto es lo que más se confunde: poner la regla en el dominio
nuevo no hace absolutamente nada.

---

## Opción A · Recrear el subdirectorio solo con el `.htaccess` (recomendada)

Es la más limpia y la que menos toca el resto de `solucionespro.net`.

1. En el hosting, crear de nuevo la carpeta `redcafeecuador/` dentro de `public_html/`.
   **Vacía**: no hace falta ningún archivo del sitio antiguo.

2. Dentro de ella, crear un archivo llamado `.htaccess` con este contenido:

```apache
# Redirección permanente al dominio propio.
# Conserva la ruta: /redcafeecuador/marketplace/ -> https://redcafeecuador.com/marketplace/
RewriteEngine On
RewriteBase /redcafeecuador/
RewriteRule ^(.*)$ https://redcafeecuador.com/$1 [R=301,L,QSA]
```

Qué hace cada parte, por si hay que tocarlo después:

- `R=301` — permanente. Es lo que hace que Google traspase la autoridad. Con 302 la
  redirección funciona igual para el visitante, pero Google la trata como temporal y no
  transfiere nada.
- `L` — deja de procesar más reglas.
- `QSA` — conserva la cadena de consulta, para que `?rol=productor` no se pierda.
- `$1` — arrastra la ruta. Sin esto todo caería en la portada y se perdería la
  correspondencia página a página, que es justo lo que Google necesita para el traspaso.

---

## Opción B · Una sola línea en el `.htaccess` de la raíz

Si prefieres no recrear la carpeta, añade esto al `.htaccess` que ya existe en
`public_html/` de solucionespro.net, **antes de las reglas de WordPress**:

```apache
RedirectMatch 301 ^/redcafeecuador/?(.*)$ https://redcafeecuador.com/$1
```

**El orden importa.** WordPress termina su bloque con una regla que captura todo lo que no
sea un archivo real; si esta línea queda por debajo, no llega a ejecutarse nunca. Va antes
de `# BEGIN WordPress`.

---

## Comprobación, en un minuto

Desde cualquier terminal:

```bash
curl -sI https://solucionespro.net/redcafeecuador/ | head -3
```

Tiene que responder:

```
HTTP/2 301
location: https://redcafeecuador.com/
```

Y que conserve la ruta:

```bash
curl -sI https://solucionespro.net/redcafeecuador/marketplace/ | grep -i location
```

Debe devolver `location: https://redcafeecuador.com/marketplace/`, **no** la raíz.

Si sale **404**, el archivo no se creó o está en la carpeta equivocada.
Si sale **302**, falta el `R=301` y Google no traspasará la autoridad.
Si redirige todo a la portada, falta el `$1`.

---

## Después

En Search Console, si el dominio viejo está dado de alta, usar **Cambio de dirección**.
No es imprescindible —el 301 hace el trabajo igual— pero acelera bastante que Google
reindexe bajo el dominio nuevo.

Mantén la redirección **al menos un año**. Los 301 se pueden retirar cuando ya no queda
tráfico entrante, y eso tarda más de lo que parece.
