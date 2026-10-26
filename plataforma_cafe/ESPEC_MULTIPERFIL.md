# Registro con varios perfiles — especificación

**Red Café Ecuador · 20 de agosto de 2026**

---

## Punto de partida real

Hoy un miembro tiene **un solo campo `rol`**, un texto con uno de los doce valores:
`productor · vendedor · comprador · bar · barista · certificador · proveedor ·
transportista · pilador · exportador · amante · asesor`.

De ese campo cuelgan **32 decisiones en el frontend** —concentradas en `app/panel/`,
`app/afiliate/`, `app/chat/`, `app/admin/` y `lib/data.ts`— y **15 endpoints PHP** lo
consultan.

Eso descarta rehacer el modelo. La especificación se apoya en lo que ya existe.

---

## 1. Modelo de datos

```
rol:    "productor"                          ← SE MANTIENE. Ahora significa perfil PRINCIPAL
roles:  ["productor", "exportador"]          ← NUEVO. Siempre contiene a `rol`, en primer lugar
```

**Por qué no se sustituye `rol` por `roles`:** manteniéndolo, las 32 decisiones actuales
siguen funcionando sin tocarlas el día uno. El cambio se puede desplegar por partes en vez
de en una sola operación que rompa todo a la vez.

**Migración de los miembros que ya existen:** ninguna operación destructiva. Al leer un
miembro sin `roles`, se calcula `roles = [rol]` al vuelo. Se escribe solo cuando el usuario
edita sus perfiles. Un despliegue no reescribe datos de nadie.

**Helper obligatorio en PHP**, para que ningún endpoint vuelva a comparar contra `rol`
directamente:

```php
function miembro_tiene_rol(array $m, string $rol): bool {
    $roles = $m['roles'] ?? [$m['rol'] ?? ''];
    return in_array($rol, $roles, true);
}
```

Todo `$m['rol'] === 'productor'` pasa a `miembro_tiene_rol($m, 'productor')`. Son 15
archivos: es la parte más delicada y la que debe revisarse una por una, porque ahí vive
la autorización.

---

## 2. Cuántos perfiles se pueden tener

**Máximo tres. Mínimo uno.**

No es una limitación técnica, es de diseño: el perfil comunica *qué eres*. Si se permiten
los doce, todos marcan todos, la etiqueta deja de decir nada y se pierde justamente la
señal que hace útil el directorio. Tres cubre las combinaciones reales del sector —
productor + exportador, asesor + proveedor, comprador + bar — sin abrir la puerta al ruido.

Si más adelante los datos muestran que hace falta un cuarto, se sube. Bajarlo después de
haberlo abierto es mucho más caro.

---

## 3. Regla de incompatibilidad — esto es lo importante

**Un `certificador` no puede emitir evaluaciones sobre lotes de su propia cuenta.**

Nada impide que alguien sea productor y catador a la vez; en el sector ocurre. Lo que no
puede pasar es que se puntúe su propio café, porque destruye el único activo que la Red
está construyendo, que es que la prueba venga de un tercero.

Implementación: al crear una evaluación, si el lote pertenece a la misma cuenta que el
certificador, se rechaza con un mensaje explícito. No se prohíbe la combinación de
perfiles: se prohíbe el acto concreto.

Conviene revisar si aplica algo parecido a `pilador` y `transportista` sobre sus propios
lotes. Mi lectura es que no: procesar o transportar el café propio es normal y no falsea
ninguna prueba ante terceros.

---

## 4. Registro (`/afiliate/`)

El paso 1 hoy es *elige un perfil*. Pasa a ser **selección múltiple con principal**:

1. El usuario marca de uno a tres perfiles.
2. El primero marcado queda como principal; puede cambiarlo con un clic.
3. El principal decide qué ve al entrar y qué plan se le ofrece por defecto.
4. El paso 2 (datos) y el 3 (plan) no cambian.

**Cuidado con lo ya arreglado:** el selector de perfiles ahora viaja en el HTML servido
(se retiró el `Suspense` que dejaba el esqueleto). La selección múltiple debe conservar
esa propiedad: los doce perfiles siguen en el HTML inicial, y JavaScript solo añade la
interacción.

---

## 5. Panel del miembro

**Secciones:** hoy se arman con `rol === "x"`. Pasan a armarse con la unión de `roles`,
sin duplicados, con las del principal primero.

**Riesgo real:** alguien con tres perfiles se encuentra un panel muy largo. Mitigación:
agrupar por perfil, con el principal desplegado y los demás plegados.

**Selector en la cabecera del panel:** cambia el perfil activo sin recargar. Solo cambia
qué se destaca; no oculta lo demás.

**Sección «Mis perfiles»:**
- Añadir perfil → mismo selector, respetando el tope de tres.
- Cambiar el principal.
- Quitar un perfil, **con una restricción**: no se puede quitar un perfil que tenga datos
  colgando. Si quitas `productor` teniendo lotes publicados, o `bar` teniendo menú, se
  bloquea y se explica qué hay que hacer antes. Es el mismo criterio del guardián de
  datos: el sistema no destruye trabajo del usuario por un clic.

---

## 6. Perfil público

Mostrar **todos** los perfiles como etiquetas, el principal primero.

No es un detalle cosmético: «Productor · Exportador» dice más de esa persona que
«Productor», y es exactamente el tipo de señal que un comprador busca antes de escribir.

---

## 7. Backend — cambios concretos

| Endpoint | Cambio |
|---|---|
| `auth.php` (registro) | Acepta `roles[]`. Valida contra los doce, deduplica, corta a 3. Escribe `rol` = primero. Rechaza lista vacía. |
| `auth.php` (sesión) | Devuelve `roles` además de `rol`. |
| `members.php` | Nueva acción `roles_update`: cambia lista y principal. Verifica el tope, la validez y la restricción de datos colgando. |
| Los 15 con `rol` | Sustituir comparaciones directas por `miembro_tiene_rol()`. |

**Validación en el servidor, no solo en el formulario.** El tope de tres y la lista de
valores válidos se comprueban en PHP: el cliente puede mentir.

---

## 8. Orden de ejecución sugerido

1. Helper `miembro_tiene_rol()` + lectura tolerante (`roles` ausente ⇒ `[rol]`). Sin
   cambios visibles: el sitio sigue funcionando igual.
2. `auth.php` acepta y guarda `roles[]`.
3. Registro con selección múltiple.
4. Panel: unión de secciones + «Mis perfiles».
5. Sustitución de las comparaciones en los 15 endpoints, **de una en una**, porque ahí
   vive la autorización.
6. Perfil público con todas las etiquetas.
7. Regla de incompatibilidad del certificador.

Los pasos 1 y 2 se pueden desplegar sin que nadie note nada. A partir del 3 hay cambio
visible.

---

## Estado tras la implementación (20 ago 2026)

Implementado y verificado: `roles[]`, lectura tolerante, helper en los endpoints de
autorización, tope de tres validado en PHP, bloqueo al quitar perfiles con datos colgando,
selector múltiple sin `Suspense`.

**La regla del certificador (§3) NO se implementó, y no por descuido:** hoy no existe
ningún endpoint donde un certificador evalúe un lote. `ratings.php` valora MIEMBROS, no
lotes, y ya impide la autovaloración. La catación verificada era uno de los servicios
retirados por no existir.

Queda por tanto como **restricción bloqueante para el día en que se construya la catación
de lotes**: antes de guardar una evaluación, comprobar que el lote no pertenece a la cuenta
del certificador y rechazar el acto. No se puede implementar antes porque no hay dónde.

---

## Lo que esta especificación no resuelve

**Los planes.** Hoy el plan va asociado al perfil. Si alguien es productor y exportador,
¿paga dos planes, el más caro, o uno solo? No lo decido yo: es una decisión comercial
tuya y bloquea el paso 3. Mientras el registro sea gratuito no estorba, pero hay que
resolverla antes de cobrar.

**El límite de tres** es un juicio mío, no un dato. Con miembros reales se verá si la
gente lo choca de verdad o si nadie pasa de dos.
