/* Red Café Ecuador — contenido de las guías interactivas
   ------------------------------------------------------------------
   Dos guías que acompañan el año cafetero: la de la finca (del suelo a la
   venta) y la del negocio (de la formalización a la exportación).

   Qué es este archivo: SOLO el contenido. La mecánica —marcar pasos, guardar
   notas, registros y avisos— vive en redcafe-guias.js y api/guias.php.

   Regla de la casa sobre las cifras: aquí no se inventa agronomía. Cada dato
   numérico lleva su fuente en `fuente`, y donde la práctica varía por zona,
   variedad o clima se dice «depende» en vez de dar un número falso. Lo que
   falta por revisar con un técnico está marcado con `revisar: true` y la
   interfaz lo muestra como «pendiente de revisión técnica».

   Fuentes usadas:
     · INIAP — Manual del cultivo del café (Ecuador).
     · Duicela Guambi, L. A. — Guía técnica para la producción y poscosecha
       del café arábigo (2014).
     · Anacafé — Buenas prácticas de beneficiado húmedo (CEDICAFE, 2018) y
       Guía de honeys y naturales.
     · Agrocalidad — Guía de Buenas Prácticas Agrícolas para café y Manual de
       registro de operadores (Resolución 266).
     · SCA — Coffee Value Assessment, normas 102/103/104-2024.
     · Reglamento EUDR de la Unión Europea.
*/
(function () {
  "use strict";

  var FUENTES = {
    iniap: "INIAP · Manual del cultivo del café",
    duicela: "Duicela (2014) · Guía técnica de producción y poscosecha del café arábigo",
    anacafe: "Anacafé · Buenas prácticas de beneficiado húmedo (2018)",
    anacafeHoney: "Anacafé · Guía de honeys y naturales",
    agrocalidad: "Agrocalidad · Guía de BPA para café",
    agrocalidadReg: "Agrocalidad · Registro de operadores (Resolución 266)",
    sca: "SCA · Coffee Value Assessment (normas 102/103/104-2024)",
    eudr: "Reglamento EUDR de la Unión Europea"
  };

  var FINCA = {
    id: "finca",
    titulo: "Mi finca, paso a paso",
    resumen: "Del análisis de suelo a la venta del lote. Marca lo que ya hiciste, anota lo tuyo y la guía te va diciendo qué toca.",
    etapas: [
      {
        id: "antes-de-sembrar",
        titulo: "Antes de sembrar",
        intro: "Lo que se decide aquí no se corrige después: el suelo, la variedad y la sombra mandan sobre la cosecha de los próximos años.",
        pasos: [
          { id: "suelo", titulo: "Análisis de suelo",
            hacer: "Toma muestras de varios puntos del lote, mézclalas y llévalas a un laboratorio. Pide pH, materia orgánica y los principales nutrientes.",
            fijarse: "Sin análisis, cualquier fertilización es a ciegas: se gasta en lo que no falta y falta lo que no se puso.",
            error: "Tomar una sola muestra de un solo punto.", fuente: FUENTES.iniap },
          { id: "variedad", titulo: "Elegir la variedad",
            hacer: "Decide según altura, clima de tu zona, resistencia a roya y a qué mercado quieres vender.",
            fijarse: "Una variedad de especialidad exige más trabajo de post-cosecha; si no vas a hacerlo, no paga la diferencia.",
            error: "Sembrar una variedad porque está de moda, sin ver si tu altura la sostiene.", fuente: FUENTES.iniap },
          { id: "sombra", titulo: "Plan de sombra",
            hacer: "Define qué árboles y a qué distancia. La sombra regula temperatura y humedad y protege el suelo.",
            fijarse: "El porcentaje de sombra que conviene depende de la zona y del clima: consulta al técnico de tu zona.",
            error: "Dejar la sombra para después de sembrar el café.", revisar: true, fuente: FUENTES.iniap },
          { id: "vivero", titulo: "Semillero y vivero",
            hacer: "Prepara semillero y vivero con sustrato limpio, riego y sombra. Descarta las plántulas con raíz torcida.",
            fijarse: "Una planta mal formada en vivero arrastra el defecto toda su vida productiva.",
            error: "Trasplantar plántulas con la raíz doblada.", fuente: FUENTES.iniap }
        ]
      },
      {
        id: "siembra",
        titulo: "Siembra y establecimiento",
        intro: "El trazado y la densidad determinan cuántas plantas manejarás y cuánto te costará cada labor.",
        pasos: [
          { id: "trazado", titulo: "Trazado y densidad",
            hacer: "Marca el terreno según la pendiente y la densidad elegida. En ladera, siembra en curvas de nivel.",
            fijarse: "La densidad se decide con la variedad, la altura y si habrá sombra; consúltala antes de hoyar.",
            error: "Sembrar en línea recta en ladera: se lleva el suelo la primera lluvia fuerte.", revisar: true, fuente: FUENTES.iniap },
          { id: "hoyado", titulo: "Hoyado y trasplante",
            hacer: "Abre los hoyos con antelación, incorpora materia orgánica y trasplanta al inicio de la época de lluvias.",
            fijarse: "Trasplantar en seco obliga a regar todos los días y aun así se pierden plantas.",
            error: "Enterrar el cuello de la planta.", fuente: FUENTES.iniap },
          { id: "primer-ano", titulo: "Primer año",
            hacer: "Controla malezas alrededor de la planta, repón las que se pierdan y registra cuántas quedaron.",
            fijarse: "Saber cuántas plantas tienes vivas es la base para calcular fertilizante y cosecha.",
            error: "No registrar las pérdidas y fertilizar por el número que se sembró.", fuente: FUENTES.iniap }
        ]
      },
      {
        id: "mantenimiento",
        titulo: "Mantenimiento del cafetal",
        intro: "El grueso del trabajo del año: poda, nutrición, malezas y sanidad.",
        pasos: [
          { id: "poda", titulo: "Poda y manejo de tejido",
            hacer: "Planifica el ciclo de poda del cafetal por lotes, para no quedarte sin producción un año entero.",
            fijarse: "El tipo de poda y el momento dependen de la variedad y de la edad del cafetal.",
            error: "Podar todo el cafetal el mismo año.", revisar: true, fuente: FUENTES.iniap },
          { id: "fertilizacion", titulo: "Fertilización",
            hacer: "Aplica según el análisis de suelo y la etapa de la planta; anota fecha, producto y dosis.",
            fijarse: "El registro de aplicaciones es obligatorio para la certificación BPA y te sirve para el EUDR.",
            error: "Aplicar la misma fórmula todos los años sin volver a analizar.", fuente: FUENTES.agrocalidad },
          { id: "plagas", titulo: "Plagas y enfermedades",
            hacer: "Monitorea broca y roya con recorridos periódicos. Combina control cultural, biológico y, solo si hace falta, químico.",
            fijarse: "Anota cada aplicación y respeta el periodo de carencia del producto.",
            error: "Aplicar por calendario en vez de por monitoreo.", fuente: FUENTES.iniap },
          { id: "suelo-agua", titulo: "Suelo y agua",
            hacer: "Mantén coberturas, barreras vivas y manejo de aguas del beneficio.",
            fijarse: "El agua del despulpado no puede ir a la quebrada: es uno de los puntos que revisa la auditoría de BPA.",
            error: "Verter aguas mieles sin tratamiento.", fuente: FUENTES.agrocalidad }
        ]
      },
      {
        id: "cosecha",
        titulo: "Cosecha",
        intro: "Aquí se gana o se pierde la taza. Todo lo que venga después solo puede conservar lo que entre en el saco.",
        pasos: [
          { id: "punto", titulo: "Punto de maduración",
            hacer: "Cosecha solo cereza madura. Pasa por el mismo lote varias veces en la campaña.",
            fijarse: "Verdes y sobremaduros bajan el puntaje y se castigan en el precio.",
            error: "Cosechar «a la brava» para terminar en una pasada.", fuente: FUENTES.duicela },
          { id: "calibracion", titulo: "Calibrar al equipo",
            hacer: "Explica y muestra qué cereza se corta. Revisa los baldes al recibir.",
            fijarse: "Pagar por calidad, y no solo por peso, cambia el resultado del día.",
            error: "Recibir sin revisar y descubrir los verdes en el despulpado.", fuente: FUENTES.duicela },
          { id: "registro-cosecha", titulo: "Registrar la cosecha",
            hacer: "Anota cada día: fecha, lote, kilos de cereza y quién cosechó.",
            fijarse: "De este registro salen tu rendimiento y tu costo real por quintal.",
            error: "Confiar en la memoria.", registro: "cosecha", fuente: FUENTES.duicela }
        ]
      },
      {
        id: "beneficiado",
        titulo: "Beneficiado húmedo",
        intro: "Despulpar el mismo día, fermentar con control y lavar bien. Es la etapa donde más café se arruina.",
        pasos: [
          { id: "despulpado", titulo: "Despulpado",
            hacer: "Despulpa el mismo día de la cosecha y limpia la máquina al terminar.",
            fijarse: "La cereza que espera empieza a fermentar sin control dentro del saco.",
            error: "Dejar la cereza del día para la mañana siguiente.", fuente: FUENTES.anacafe },
          { id: "fermentacion", titulo: "Fermentación",
            hacer: "Anota la hora de inicio, la temperatura del ambiente y cuándo termina. Comprueba el punto con la prueba del dedo o del palo.",
            fijarse: "Las horas de fermentación cambian con la altura y la temperatura: no hay un número igual para todos.",
            error: "Fermentar «las horas de siempre» sin comprobar el punto.", registro: "fermentacion", revisar: true, fuente: FUENTES.anacafe },
          { id: "lavado", titulo: "Lavado y clasificación",
            hacer: "Lava hasta que el grano quede áspero al tacto y separa los flotantes.",
            fijarse: "Los flotantes son defecto; si entran al secado, bajan el puntaje de todo el lote.",
            error: "Mezclar los flotantes con el café bueno.", fuente: FUENTES.anacafe }
        ]
      },
      {
        id: "secado",
        titulo: "Secado",
        intro: "El objetivo es llegar a 10–12 % de humedad, sin prisa y sin pasarse.",
        pasos: [
          { id: "tendido", titulo: "Tendido",
            hacer: "Extiende el café en capa delgada y muévelo con frecuencia para que seque parejo.",
            fijarse: "Anacafé recomienda no pasar de unos 7 cm de capa y remover con frecuencia; el patio muy caliente al tender raja el pergamino.",
            error: "Montones gruesos que secan por fuera y quedan húmedos por dentro.", fuente: FUENTES.anacafe },
          { id: "humedad", titulo: "Humedad final 10–12 %",
            hacer: "Mide con medidor de humedad antes de ensacar y anota el valor.",
            fijarse: "Por encima de 12 % aparecen mohos y sabores raros; muy por debajo, el grano se quiebra y pierdes peso.",
            error: "Calcular la humedad «al tacto».", registro: "secado", fuente: FUENTES.anacafe },
          { id: "curva", titulo: "Registrar la curva",
            hacer: "Anota humedad y día. Con dos o tres lotes ya sabes cuánto tarda tu secado.",
            fijarse: "Ese registro es el que convence a un comprador de que tu proceso es repetible.",
            error: "No guardar nada y empezar de cero cada campaña.", registro: "secado", fuente: FUENTES.anacafe }
        ]
      },
      {
        id: "reposo-trilla",
        titulo: "Reposo, trilla y clasificación",
        intro: "El café en pergamino descansa antes de trillarse; de aquí sale el rendimiento real.",
        pasos: [
          { id: "reposo", titulo: "Reposo en pergamino",
            hacer: "Guarda en sacos limpios, sobre tarimas, en lugar seco y ventilado.",
            fijarse: "El tiempo de reposo antes de trillar depende del destino del café; pregúntalo a tu comprador.",
            error: "Apilar sacos directo en el piso.", revisar: true, fuente: FUENTES.duicela },
          { id: "trilla", titulo: "Trilla y zaranda",
            hacer: "Trilla y clasifica por tamaño. Anota rendimiento de pergamino a oro y el porcentaje por zaranda.",
            fijarse: "El rendimiento es un número que el comprador va a pedir.",
            error: "No pesar antes y después de trillar.", fuente: FUENTES.duicela },
          { id: "defectos", titulo: "Defectos",
            hacer: "Separa y cuenta los defectos de una muestra.",
            fijarse: "Es la misma revisión que hará tu comprador: mejor saberlo antes.",
            error: "Mandar la muestra sin revisarla.", fuente: FUENTES.duicela }
        ]
      },
      {
        id: "calidad",
        titulo: "Control de calidad y catación",
        intro: "El puntaje no es un adorno: es el argumento con el que se negocia el precio.",
        pasos: [
          { id: "muestra", titulo: "Preparar la muestra",
            hacer: "Saca una muestra representativa del lote, identifícala y guárdala igual que el lote.",
            fijarse: "Una muestra que no representa al lote termina en una devolución.",
            error: "Mandar lo mejor del lote como muestra.", fuente: FUENTES.duicela },
          { id: "catacion", titulo: "Catación",
            hacer: "Encarga la catación a un catador acreditado y guarda el informe.",
            fijarse: "Desde noviembre de 2024 la SCA usa el Coffee Value Assessment, que sustituye al formulario de 2004. Pregunta con qué protocolo te catan y guárdalo junto al puntaje.",
            error: "Publicar un puntaje sin decir quién ni cómo lo evaluó.", fuente: FUENTES.sca },
          { id: "ficha-calidad", titulo: "Guardar el informe",
            hacer: "Adjunta el informe a tu lote en el marketplace.",
            fijarse: "Un lote con informe recibe más consultas que uno sin él.",
            error: "Tener el informe en el teléfono y no subirlo.", fuente: FUENTES.sca }
        ]
      },
      {
        id: "tueste",
        titulo: "Tueste, molienda y empaque",
        intro: "Solo si vendes café tostado. Si vendes en verde, salta a la etapa siguiente.",
        pasos: [
          { id: "perfil", titulo: "Perfil de tueste",
            hacer: "Anota cada tueste: lote, peso de entrada y salida, tiempo y punto final.",
            fijarse: "Sin registro no hay perfil repetible, y sin perfil no hay marca.",
            error: "Tostar «a ojo» y no poder repetir el resultado que gustó.", fuente: FUENTES.duicela },
          { id: "molienda", titulo: "Molienda",
            hacer: "Muele según el método de preparación de tu cliente, y solo cuando vayas a empacar.",
            fijarse: "El café molido pierde aroma en días.",
            error: "Moler todo el lote por adelantado.", fuente: FUENTES.duicela },
          { id: "empaque", titulo: "Empaque y etiqueta",
            hacer: "Empaca con válvula, pon fecha de tueste, origen, variedad, proceso y peso neto.",
            fijarse: "La fecha de tueste es lo primero que mira un cliente de especialidad.",
            error: "Etiquetar sin fecha.", fuente: FUENTES.duicela }
        ]
      },
      {
        id: "venta",
        titulo: "Venta",
        intro: "Con los registros de arriba ya puedes poner precio con criterio y publicar una ficha que convence.",
        pasos: [
          { id: "costo", titulo: "Tu costo por quintal",
            hacer: "Suma jornales, insumos, transporte y beneficio, y divide por los quintales obtenidos.",
            fijarse: "Si no sabes tu costo, no sabes si el precio que te ofrecen te conviene.",
            error: "Comparar la oferta solo con el precio de la bolsa.", registro: "costos", fuente: FUENTES.duicela },
          { id: "referencia", titulo: "Mirar la referencia",
            hacer: "Compara con el panel de precios de la Red, que publica la referencia mensual con su fuente.",
            fijarse: "La referencia internacional va por quintal de 100 lb: si vendes por saco, di cuánto pesa.",
            error: "Negociar sin ninguna referencia.", fuente: "Red Café Ecuador · Panel de precios" },
          { id: "publicar", titulo: "Publicar el lote",
            hacer: "Publica en el marketplace con foto real, altura, proceso, humedad, puntaje, sacos y precio.",
            fijarse: "Una ficha completa recibe más consultas; la guía ya tiene casi todos esos datos.",
            error: "Publicar solo el precio y esperar.", fuente: "Red Café Ecuador" }
        ]
      }
    ]
  };

  var NEGOCIO = {
    id: "negocio",
    titulo: "Mi negocio de café",
    resumen: "Formalizar, saber cuánto cuesta producir, vender con argumentos y cumplir lo que exige el comprador de afuera.",
    etapas: [
      {
        id: "formalizacion",
        titulo: "Formalización",
        intro: "Sin esto, muchas puertas se cierran: crédito, comprador grande y exportación.",
        pasos: [
          { id: "ruc", titulo: "RUC y permisos",
            hacer: "Saca el RUC y revisa qué permisos necesita tu actividad.",
            fijarse: "Vender formal te abre compradores que no compran sin factura.",
            error: "Dejarlo para cuando llegue el comprador.", fuente: "SRI Ecuador" },
          { id: "guia", titulo: "Registro de operador en Agrocalidad",
            hacer: "Regístrate como operador en el Sistema GUIA de Agrocalidad.",
            fijarse: "Es el paso previo para pedir la certificación de Buenas Prácticas Agrícolas.",
            error: "Pedir la certificación sin estar registrado.", fuente: FUENTES.agrocalidadReg },
          { id: "bpa", titulo: "Certificación BPA",
            hacer: "Solicita la certificación por el mismo sistema; un auditor visita la finca.",
            fijarse: "El certificado de BPA tiene una vigencia de tres años.",
            error: "Llegar a la auditoría sin los registros de labores e insumos.", fuente: FUENTES.agrocalidad }
        ]
      },
      {
        id: "costos",
        titulo: "Costos y precio",
        intro: "El número que decide si el negocio se sostiene.",
        pasos: [
          { id: "costo-qq", titulo: "Costo por quintal",
            hacer: "Usa la calculadora de la Red con tus jornales, insumos y transporte.",
            fijarse: "Incluye tu propio trabajo: si no te lo pagas, el negocio no es rentable, solo lo parece.",
            error: "Contar solo lo que se pagó en efectivo.", registro: "costos", fuente: "Red Café Ecuador · Calculadora" },
          { id: "equilibrio", titulo: "Punto de equilibrio",
            hacer: "Calcula cuántos quintales necesitas vender para cubrir los costos del año.",
            fijarse: "Debajo de ese punto, vender más barato solo aumenta la pérdida.",
            error: "Aceptar cualquier precio por vender rápido.", fuente: "Red Café Ecuador · Calculadora" }
        ]
      },
      {
        id: "calidad-venta",
        titulo: "La calidad como argumento",
        intro: "Lo que te diferencia del café a granel.",
        pasos: [
          { id: "que-medir", titulo: "Qué medir",
            hacer: "Humedad, rendimiento, defectos y puntaje de taza.",
            fijarse: "Cuatro números convierten una conversación en una negociación.",
            error: "Hablar de calidad sin ningún dato.", fuente: FUENTES.sca },
          { id: "presentar", titulo: "Cómo presentarlo",
            hacer: "Arma una ficha de una página: finca, altura, variedad, proceso, humedad, puntaje, cantidad y precio.",
            fijarse: "Esa misma ficha es la que publicas en el marketplace.",
            error: "Mandar audios de WhatsApp en lugar de una ficha.", fuente: "Red Café Ecuador" }
        ]
      },
      {
        id: "clientes",
        titulo: "Clientes y negociación",
        intro: "De la primera conversación al acuerdo escrito.",
        pasos: [
          { id: "perfil-cliente", titulo: "A quién le vendes",
            hacer: "Define si buscas tostador pequeño, exportador o consumidor final: cada uno pide cosas distintas.",
            fijarse: "Un tostador de especialidad pide muestra y puntaje; un exportador, volumen y constancia.",
            error: "Ofrecer lo mismo a todos.", fuente: "Red Café Ecuador" },
          { id: "muestra", titulo: "Muestra y respuesta",
            hacer: "Manda muestra identificada y acuerda un plazo para la respuesta.",
            fijarse: "Anota a quién mandaste qué: al tercer comprador ya no te acuerdas.",
            error: "Mandar muestras sin registro.", fuente: "Red Café Ecuador" },
          { id: "acuerdo", titulo: "Acuerdo por escrito",
            hacer: "Deja por escrito cantidad, calidad, precio, fecha y forma de pago.",
            fijarse: "Red Café Ecuador no interviene en los pagos: el acuerdo es entre las partes.",
            error: "Cerrar de palabra y discutir después.", fuente: "Red Café Ecuador" }
        ]
      },
      {
        id: "exportar",
        titulo: "Cumplimiento para exportar",
        intro: "Lo que pide Europa y lo que hay que tener listo antes, no después.",
        pasos: [
          { id: "trazabilidad", titulo: "Trazabilidad",
            hacer: "Guarda el origen de cada lote: finca, parcela, fecha y proceso.",
            fijarse: "Sin trazabilidad no hay expediente EUDR posible.",
            error: "Mezclar lotes de distintas fincas sin registro.", fuente: FUENTES.eudr },
          { id: "eudr", titulo: "Expediente EUDR",
            hacer: "Registra el GPS de tu finca y arma el documento de debida diligencia con la herramienta de la Red.",
            fijarse: "El reglamento europeo se aplica desde el 30 de diciembre de 2026.",
            error: "Empezar el mes anterior a embarcar.", fuente: FUENTES.eudr }
        ]
      },
      {
        id: "crecer",
        titulo: "Crecer",
        intro: "Cuando lo de arriba ya funciona.",
        pasos: [
          { id: "asociatividad", titulo: "Juntarse con otros",
            hacer: "Con volumen se negocia mejor flete, insumos y precio.",
            fijarse: "También se comparten costos de catación y certificación.",
            error: "Competir con el vecino por el mismo comprador en vez de sumar volumen.", fuente: "Red Café Ecuador" },
          { id: "marca", titulo: "Marca propia",
            hacer: "Si ya tienes calidad constante y clientes, evalúa tostar y vender con tu marca.",
            fijarse: "Es otro negocio: exige inventario, empaque y venta al detalle.",
            error: "Saltar a la marca sin tener constante la calidad.", fuente: "Red Café Ecuador" }
        ]
      }
    ]
  };

  window.REDCAFE_GUIAS = { version: "20260923b", fuentes: FUENTES, guias: [FINCA, NEGOCIO] };
})();
