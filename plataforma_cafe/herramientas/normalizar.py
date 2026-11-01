#!/usr/bin/env python3
"""Normaliza una captura para que dos fotos del mismo sitio salgan iguales.

Lo que se quita no es diseño: es el orden en que el navegador serializa los
atributos y el contenido que cambia por sí solo entre dos visitas.

Dos casos medidos que obligaron a esto:

  · El contenedor del mapa sale unas veces como `tabindex style
    data-redcafe-map-fixed` y otras como `tabindex data-redcafe-map-fixed
    style`, porque distintos scripts le ponen atributos en distinto momento.
    Es el mismo nodo con el mismo aspecto. Se ordenan los atributos.

  · La franja de precios del día aparece o no según cuánto tarde su petición,
    y su contenido —el precio, «hace 3h», el porcentaje— cambia cada hora.
    No dice nada sobre el diseño: se sustituye por un marcador.
"""
import re
import sys

ETIQUETA = re.compile(r'<([a-zA-Z][\w-]*)((?:\s+[^\s=>]+(?:=(?:"[^"]*"|\'[^\']*\'|[^\s>]*))?)*)\s*(/?)>')
ATRIBUTO = re.compile(r'([^\s=]+)(?:=("[^"]*"|\'[^\']*\'|[^\s]*))?')


def ordenar_atributos(m):
    nombre, crudos, cierre = m.group(1), m.group(2), m.group(3)
    if not crudos.strip():
        return '<%s%s>' % (nombre, cierre)
    attrs = [a.group(0) for a in ATRIBUTO.finditer(crudos.strip()) if a.group(0).strip()]
    attrs.sort()
    return '<%s %s%s>' % (nombre, ' '.join(attrs), cierre)


ESTILO = re.compile(r'style="([^"]*)"')
FRANJA = re.compile(r'<div[^>]*aria-label="Precio referencial del caf[^"]*"[^>]*>')
DIV = re.compile(r'<(/?)div\b', re.I)


def _reemplazar_franja(texto):
    """Sustituye la franja de precios contando <div> para cerrarla bien."""
    m = FRANJA.search(texto)
    if not m:
        return texto
    profundidad = 1
    pos = m.end()
    for d in DIV.finditer(texto, pos):
        profundidad += -1 if d.group(1) else 1
        if profundidad == 0:
            return texto[:m.start()] + '<!--FRANJA-PRECIOS-->' + texto[d.end() + 1:]
    # Sin cierre: se deja el HTML como está antes que borrar de más.
    return texto


def normalizar_estilo(m):
    """El navegador reescribe los estilos en línea cuando procesa el CSSOM.

    Medido: el mismo nodo sale unas veces como `object-fit: contain;` y otras
    como `object-fit:contain`, según si el volcado llegó antes o después. Es la
    misma regla y el mismo aspecto.
    """
    reglas = [r.strip() for r in m.group(1).split(';') if r.strip()]
    limpias = []
    props = []
    for r in reglas:
        if ':' in r:
            prop, valor = r.split(':', 1)
            props.append(prop.strip().lower())
            limpias.append('%s:%s' % (prop.strip(), valor.strip()))
        else:
            limpias.append(r)

    # Solo se ordena si NINGUNA propiedad se repite. Con `color:red;color:blue`
    # el orden decide qué gana, así que ordenar podría igualar dos estilos que
    # se ven distintos: justo el falso negativo que hay que evitar.
    if len(set(props)) == len(props):
        limpias.sort()
    return 'style="%s"' % ';'.join(limpias)


def normalizar(texto):
    texto = ESTILO.sub(normalizar_estilo, texto)
    texto = ETIQUETA.sub(ordenar_atributos, texto)

    # La franja de precios del día: contenido vivo (el precio, «hace 3h», el
    # porcentaje) y aparición condicionada a que su petición llegue a tiempo.
    #
    # La primera versión de esta regla borraba desde la franja HASTA el
    # siguiente <main>, <header> o <section>. La auditoría lo demostró con un
    # caso mínimo: con `<div franja><article>Contenido real</article><section>`
    # se llevaba también el <article>. Es decir, podía tragarse contenido de
    # verdad y hacer pasar por «sin cambios» un cambio real: exactamente el
    # falso negativo que esta herramienta existe para no producir.
    #
    # Ahora se sustituye SOLO el contenido de la franja, contando la anidación
    # de <div> para cerrarla donde de verdad se cierra.
    texto = _reemplazar_franja(texto)

    return texto


if __name__ == '__main__':
    sys.stdout.write(normalizar(sys.stdin.read()))
