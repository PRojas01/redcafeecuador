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
     · Variedades por zona: referencia general a partir de INIAP y MAG;
       marcada «pendiente de revisión técnica» hasta que la valide un técnico.
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
    resumen: "Del terreno y el análisis de suelo a la venta del lote. Marca lo que ya hiciste, anota lo tuyo y la guía te va diciendo qué toca.",
    etapas: [
      {
        id: "antes-de-sembrar",
        titulo: "Antes de sembrar",
        intro: "Lo que se decide aquí no se corrige después: el terreno, el suelo, la variedad y la sombra mandan sobre la cosecha de los próximos años. Empieza recorriendo el terreno y anotando lo que ves, antes de tomar muestras o comprar plantas.",
        pasos: [
          { id: "ubicacion", titulo: "Ubicación, altura y acceso",
            hacer: "Mide la altura (msnm) con el GPS del teléfono en la parte alta, media y baja del terreno, y anota provincia y cantón.",
            detalles: [
              "La altura decide la especie: el arábigo se cultiva en Ecuador aproximadamente entre 500 y 2 000 msnm; el robusta en zonas bajas y cálidas, por debajo de unos 600 msnm.",
              "A más altura, la cereza madura más despacio y la taza suele ser más compleja, pero la cosecha es más tardía y hay más riesgo de frío.",
              "Evita las hondonadas cerradas en zonas altas: ahí se acumula el aire frío de la madrugada.",
              "Mira de dónde vienen los vientos fuertes: si golpean de frente, hará falta una cortina rompevientos.",
              "Revisa el acceso: la cereza se despulpa el mismo día, así que el camino hasta el beneficio o el centro de acopio cuenta tanto como la tierra."
            ],
            fijarse: "Anota la altura de las tres partes: en una ladera puede haber 200 m de diferencia y eso cambia la variedad que conviene.",
            error: "Elegir el terreno solo por precio, sin saber a qué altura está.", revisar: true, fuente: FUENTES.iniap },
          { id: "pendiente", titulo: "Pendiente e inclinación",
            hacer: "Mide la pendiente: apoya una regla o palo de 1 m en horizontal (con nivel) sobre la ladera, mide cuántos centímetros quedan hasta el suelo y ese número es el porcentaje de pendiente.",
            detalles: [
              "Plana a suave (0–12 %): fácil de trabajar; cuida que no se encharque.",
              "Ondulada (12–25 %): siembra en curvas de nivel desde el principio.",
              "Inclinada (25–50 %): curvas de nivel, barreras vivas, cobertura del suelo y caminos internos para sacar la cosecha.",
              "Muy inclinada (más de 50 %): alto riesgo de erosión y deslaves, y cada labor cuesta más jornales. Consulta al técnico antes de sembrar.",
              "Mira hacia dónde está orientada la ladera: la que recibe el sol de la tarde se seca y calienta más."
            ],
            fijarse: "La pendiente decide el trazado, la densidad y cuánto costará cosechar. Mídela en varios puntos.",
            error: "Limpiar todo el terreno en ladera antes de las lluvias y dejar el suelo desnudo.", revisar: true, fuente: FUENTES.iniap },
          { id: "suelo-campo", titulo: "Mirar el suelo antes de muestrear",
            hacer: "Abre uno o dos hoyos de prueba (unos 60 cm de lado y lo más hondo que puedas) en partes distintas del terreno y observa las capas.",
            detalles: [
              "Profundidad: el café tiene raíz pivotante; busca suelo suelto y profundo, sin roca, piedra o capa dura cerca de la superficie.",
              "Color: la capa de arriba oscura indica materia orgánica; manchas grises o azuladas indican que el agua se queda estancada.",
              "Textura (prueba del puñado): humedece un poco de tierra y apriétala. Si raspa y no forma bola, es arenosa; si forma una cinta larga y pegajosa, es arcillosa; si forma bola que se desmorona, es franca, la que mejor le va al café.",
              "Drenaje: llena el hoyo de agua; si al día siguiente sigue con agua, el terreno se encharca.",
              "Anota piedras, raíces, lombrices y olor: un suelo vivo huele a tierra, no a podrido."
            ],
            fijarse: "Si el terreno tiene partes distintas (una más negra, otra más pedregosa), trátalas como lotes separados al tomar muestras.",
            error: "Mandar a analizar sin haber visto cómo es el suelo por dentro.", fuente: FUENTES.iniap },
          { id: "vegetacion", titulo: "Vegetación natural",
            hacer: "Anota qué crece hoy en el terreno: bosque, rastrojo, potrero, cultivo anterior, y qué árboles hay que puedan quedarse como sombra.",
            detalles: [
              "Monte o rastrojo alto y variado suele indicar suelo con materia orgánica y humedad.",
              "Potrero viejo o suelo pelado suele estar compactado y pobre: necesitará más materia orgánica y descompactar.",
              "Helechos abundantes suelen acompañar a suelos ácidos; plantas de pantano o juncos, a suelos que se encharcan. Confírmalo con el análisis.",
              "Árboles nativos sanos (guabas, laureles, porotillos, cedros) pueden servir de sombra: decide cuáles quedan antes de limpiar.",
              "No tumbes bosque para sembrar café: el reglamento europeo (EUDR) no permite vender a la Unión Europea café de terrenos deforestados después del 31 de diciembre de 2020."
            ],
            fijarse: "Lo que crece solo es una pista del suelo y del clima, no un diagnóstico: úsalo para decidir dónde tomar muestras.",
            error: "Quemar o limpiar todo antes de ver qué árboles conviene dejar.", fuente: FUENTES.eudr },
          { id: "agua", titulo: "Fuentes de agua",
            hacer: "Ubica las vertientes, quebradas, pozos o reservorios, cuánta agua llevan en la época seca y a qué distancia están de donde irá el vivero y el beneficio.",
            detalles: [
              "El vivero necesita riego diario; el beneficio húmedo necesita agua limpia para despulpar y lavar.",
              "Comprueba el caudal en el mes más seco, no en invierno.",
              "Usar agua de una fuente requiere la autorización de uso y aprovechamiento ante la autoridad del agua (hoy el Ministerio del Ambiente, Agua y Transición Ecológica).",
              "Deja una franja de vegetación sin sembrar a lo largo de quebradas y vertientes para protegerlas.",
              "Piensa desde ya dónde tratarás las aguas mieles: no pueden ir a la quebrada."
            ],
            fijarse: "Sin agua cerca, el beneficio húmedo se complica: tendrás que vender en cereza o planear un proceso natural.",
            error: "Medir el agua en época de lluvias y quedarse sin ella en cosecha.", fuente: FUENTES.agrocalidad },
          { id: "clima", titulo: "Clima y lluvias",
            hacer: "Averigua la temperatura media, cuánta lluvia cae al año y qué meses son secos. Pregunta a vecinos cafeteros y consulta los datos del INAMHI de la estación más cercana.",
            detalles: [
              "Arábigo: le va mejor con temperaturas medias de unos 18 a 22 °C y entre 1 200 y 1 800 mm de lluvia al año bien repartidos.",
              "Robusta: prefiere zonas más cálidas, de unos 22 a 26 °C, y tolera más lluvia.",
              "Unos dos o tres meses más secos ayudan a que la floración salga pareja; sequías largas obligan a regar o a más sombra.",
              "Anota en qué meses llueve: de ahí sale la fecha de trasplante (al inicio de lluvias) y la época de cosecha.",
              "Neblina y humedad constante favorecen la roya y otros hongos: pide variedades resistentes."
            ],
            fijarse: "Un año no es el clima: pregunta cómo fueron los últimos años (sequías, heladas, granizo).",
            error: "Copiar las fechas de siembra de otra zona.", revisar: true, fuente: FUENTES.iniap },
          { id: "ficha-terreno", titulo: "Anota la ficha de tu terreno",
            hacer: "Guarda aquí lo que viste. Con esta ficha el técnico, el laboratorio o un asistente de IA pueden darte una recomendación a tu medida.",
            fijarse: "Haz una ficha por cada lote distinto del terreno.",
            error: "Confiar en la memoria: en dos años nadie recuerda cómo estaba el terreno.", registro: "terreno", fuente: "Red Café Ecuador" },
          { id: "suelo", titulo: "Análisis de suelo",
            hacer: "Toma muestras de varios puntos del lote, mézclalas y llévalas a un laboratorio. Pide pH, materia orgánica y los principales nutrientes.",
            detalles: [
              "Haz el muestreo dos o tres meses antes de sembrar o de fertilizar, para tener los resultados a tiempo.",
              "Una muestra por cada lote parecido (misma pendiente, color de suelo y uso anterior).",
              "Recorre el lote en zigzag y toma de 15 a 20 submuestras de los primeros 20 cm, quitando antes la hojarasca.",
              "No tomes muestras en caminos, bordes, hormigueros, lugares de quema o donde se botó abono.",
              "Mezcla todo en un balde limpio (no de abono ni de químicos) y llena una bolsa con 1 kg aproximadamente. Etiquétala con lote, fecha y profundidad.",
              "Laboratorios: estaciones del INIAP, Agrocalidad y universidades agrícolas. Pregunta precio y plazo antes."
            ],
            fijarse: "Sin análisis, cualquier fertilización es a ciegas: se gasta en lo que no falta y falta lo que no se puso.",
            error: "Tomar una sola muestra de un solo punto.", registro: "suelo", fuente: FUENTES.iniap },
          { id: "variedad", titulo: "Elegir la variedad",
            hacer: "Decide según altura, clima de tu zona, resistencia a roya y a qué mercado quieres vender. Abajo están las variedades que más se siembran en cada zona.",
            zonas: [
              { zona: "Sur andino: Loja, El Oro (Zaruma) y Azuay", tipo: "Arábigo",
                variedades: "Típica, Típica mejorado, Bourbon, Caturra, Catuaí, Pacas, Sarchimor; en fincas de especialidad, Geisha y Sidra." },
              { zona: "Amazonía sur: Zamora Chinchipe y Morona Santiago", tipo: "Arábigo",
                variedades: "Típica, Caturra, Bourbon, Catuaí, Sarchimor; algunas fincas de especialidad con Geisha y Sidra." },
              { zona: "Norte andino: Pichincha (noroccidente), Imbabura (Intag) y Carchi", tipo: "Arábigo",
                variedades: "Típica, Típica mejorado, Caturra, Bourbon, Sidra (desarrollada en Pichincha) y Geisha." },
              { zona: "Centro andino: Bolívar, Chimborazo, Cotopaxi y Cañar", tipo: "Arábigo",
                variedades: "Típica, Caturra, Bourbon y líneas resistentes a roya (Sarchimor, Catimor)." },
              { zona: "Costa alta: Manabí (Jipijapa, Paján), Santa Elena y Guayas (cordillera Chongón-Colonche)", tipo: "Arábigo",
                variedades: "Típica, Caturra, Sarchimor y Catimor." },
              { zona: "Amazonía norte: Orellana, Sucumbíos y Napo", tipo: "Robusta",
                variedades: "Robusta (Coffea canephora) por clones; el INIAP ha liberado clones seleccionados para la zona." },
              { zona: "Costa baja: Los Ríos, Santo Domingo, Esmeraldas (Quinindé) y Guayas", tipo: "Robusta",
                variedades: "Robusta (Coffea canephora) por clones o semilla de plantas seleccionadas." }
            ],
            detalles: [
              "Compra plantas o semilla solo en viveros registrados en Agrocalidad o del INIAP y el MAG: pide la variedad por escrito.",
              "Las variedades resistentes a roya (Sarchimor, Catimor) piden menos fumigación; Típica, Bourbon, Geisha y Sidra son más delicadas pero se pagan mejor si hay buena poscosecha.",
              "Lo que hay disponible cambia de un año a otro: pregunta en la agencia del MAG de tu cantón."
            ],
            fijarse: "Una variedad de especialidad exige más trabajo de post-cosecha; si no vas a hacerlo, no paga la diferencia.",
            error: "Sembrar una variedad porque está de moda, sin ver si tu altura la sostiene.", revisar: true, fuente: FUENTES.iniap },
          { id: "sombra", titulo: "Plan de sombra",
            hacer: "Define qué árboles y a qué distancia. La sombra regula temperatura y humedad y protege el suelo.",
            detalles: [
              "Prefiere árboles que fijan nitrógeno (guabas o Inga, porotillo o Erythrina) y combínalos con frutales o maderables que te den otro ingreso.",
              "Siembra la sombra provisional (plátano, guineo, higuerilla) antes o junto con el café, y la definitiva con tiempo para que crezca.",
              "Más sombra protege del sol y la sequía pero baja la producción y favorece hongos; menos sombra produce más pero agota la planta y el suelo.",
              "En zonas muy altas o nubladas conviene menos sombra; en zonas bajas, cálidas o secas, más.",
              "Planifica la poda de la sombra: se regula cada año antes de la floración."
            ],
            fijarse: "El porcentaje de sombra que conviene depende de la zona y del clima: consulta al técnico de tu zona.",
            error: "Dejar la sombra para después de sembrar el café.", revisar: true, fuente: FUENTES.iniap },
          { id: "vivero", titulo: "Semillero y vivero",
            hacer: "Prepara semillero y vivero con sustrato limpio, riego y sombra. Descarta las plántulas con raíz torcida.",
            detalles: [
              "Usa semilla de plantas sanas y productivas o de un proveedor registrado en Agrocalidad; anota variedad y origen.",
              "Germinador: arena lavada o sustrato limpio, a la sombra, con riego que mantenga húmedo sin encharcar.",
              "Pasa a funda la plántula en estado de «fosforito» o «chapola» (primeras hojas), escogiendo solo raíces rectas.",
              "Sustrato de funda: tierra suelta mezclada con materia orgánica bien descompuesta; nunca abono fresco.",
              "Revisa a diario: riego, malezas, hojas con manchas. Elimina las plantas débiles o deformes.",
              "Endurece las plantas las últimas semanas reduciendo la sombra del vivero, para que no sufran al trasplante."
            ],
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
            detalles: [
              "Decide antes la distancia entre surcos y entre plantas según la variedad: las de porte bajo (Caturra, Catuaí, Sarchimor) admiten más plantas por hectárea que las altas (Típica, Bourbon, Geisha).",
              "En ladera traza curvas de nivel con un nivel en A o una manguera con agua y marca con estacas.",
              "Siembra en tresbolillo (triángulo) en pendiente: protege mejor el suelo.",
              "Deja caminos para sacar la cosecha y espacio para la sombra.",
              "Anota cuántas plantas caben por lote: es la base de todos los cálculos."
            ],
            fijarse: "La densidad se decide con la variedad, la altura y si habrá sombra; consúltala antes de hoyar.",
            error: "Sembrar en línea recta en ladera: se lleva el suelo la primera lluvia fuerte.", revisar: true, fuente: FUENTES.iniap },
          { id: "hoyado", titulo: "Hoyado y trasplante",
            hacer: "Abre los hoyos con antelación, incorpora materia orgánica y trasplanta al inicio de la época de lluvias.",
            detalles: [
              "Abre los hoyos unas semanas antes; separa la tierra de arriba (la más fértil) para devolverla al fondo.",
              "Mezcla la tierra con materia orgánica bien descompuesta y, si el análisis lo pide, la enmienda (cal) que indique el técnico.",
              "Quita la funda sin romper el pan de tierra y corta la punta de raíz si está enrollada.",
              "Deja el cuello de la planta a ras del suelo y aprieta la tierra para que no queden bolsas de aire.",
              "Pon cobertura (hojarasca, rastrojo) alrededor sin tocar el tallo."
            ],
            fijarse: "Trasplantar en seco obliga a regar todos los días y aun así se pierden plantas.",
            error: "Enterrar el cuello de la planta.", fuente: FUENTES.iniap },
          { id: "primer-ano", titulo: "Primer año",
            hacer: "Controla malezas alrededor de la planta, repón las que se pierdan y registra cuántas quedaron.",
            detalles: [
              "Haz plateo (limpia un círculo alrededor de cada planta) y deja la maleza baja entre surcos para proteger el suelo.",
              "Repón las plantas muertas en las primeras lluvias, con plantas de la misma edad y variedad.",
              "Revisa cada mes: hojas amarillas, cortadores, hormigas, mal de talluelo.",
              "La primera fertilización se hace según el análisis y la recomendación del técnico, en dosis pequeñas y repartidas.",
              "Cuenta y anota las plantas vivas por lote al final del año."
            ],
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
            detalles: [
              "Poda de formación en plantas jóvenes; poda sanitaria para quitar ramas secas, enfermas o chupones.",
              "Las renovaciones (recepa o descope) se hacen por lotes, renovando una parte del cafetal cada año.",
              "Hazla después de la cosecha y antes de las lluvias y la floración.",
              "Desinfecta la herramienta entre plantas enfermas y protege los cortes grandes.",
              "Anota qué lote podaste, cuándo y con qué tipo de poda."
            ],
            fijarse: "El tipo de poda y el momento dependen de la variedad y de la edad del cafetal.",
            error: "Podar todo el cafetal el mismo año.", revisar: true, fuente: FUENTES.iniap },
          { id: "fertilizacion", titulo: "Fertilización",
            hacer: "Aplica según el análisis de suelo y la etapa de la planta; anota fecha, producto y dosis.",
            detalles: [
              "Fertiliza según el análisis de suelo y la recomendación del técnico, no por costumbre.",
              "Divide la dosis en dos o tres aplicaciones al año, con el suelo húmedo (inicio y mitad de lluvias).",
              "Aplica alrededor de la planta, en la zona de la copa, no pegado al tallo.",
              "Si el pH es muy ácido, el encalado debe hacerse antes que el abono: sin eso, la planta no aprovecha lo que pones.",
              "Aprovecha la pulpa compostada del beneficio: devuelve materia orgánica y ahorra fertilizante.",
              "Anota fecha, producto, dosis y lote en cada aplicación."
            ],
            fijarse: "El registro de aplicaciones es obligatorio para la certificación BPA y te sirve para el EUDR.",
            error: "Aplicar la misma fórmula todos los años sin volver a analizar.", fuente: FUENTES.agrocalidad },
          { id: "plagas", titulo: "Plagas y enfermedades",
            hacer: "Monitorea broca y roya con recorridos periódicos. Combina control cultural, biológico y, solo si hace falta, químico.",
            detalles: [
              "Broca: recoge los granos caídos y los que quedan en la planta después de la cosecha (repase); usa trampas con alcohol para monitorear.",
              "Roya: revisa el envés de las hojas buscando polvillo anaranjado, sobre todo en lluvias; las variedades resistentes reducen el problema.",
              "Ojo de gallo y mal de hilachas aparecen con mucha sombra y humedad: regula la sombra y abre la ventilación.",
              "Recorre el lote cada dos semanas y anota en cuántas plantas de cada cien ves el problema; así decides si hay que actuar.",
              "Usa solo productos registrados en Agrocalidad, con equipo de protección, y respeta la dosis y el periodo de carencia.",
              "Guarda los envases vacíos lejos del agua y entrégalos al programa de recolección."
            ],
            fijarse: "Anota cada aplicación y respeta el periodo de carencia del producto.",
            error: "Aplicar por calendario en vez de por monitoreo.", fuente: FUENTES.iniap },
          { id: "suelo-agua", titulo: "Suelo y agua",
            hacer: "Mantén coberturas, barreras vivas y manejo de aguas del beneficio.",
            detalles: [
              "Mantén el suelo cubierto con maleza baja, hojarasca o coberturas; no lo dejes desnudo.",
              "Siembra barreras vivas (pasto, hierba luisa, piña) en curvas de nivel en las laderas.",
              "Abre zanjas de desviación para que el agua de lluvia no corra por los surcos.",
              "Trata las aguas mieles en fosas de infiltración o filtros, lejos de quebradas y vertientes.",
              "Composta la pulpa en lugar de botarla."
            ],
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
            detalles: [
              "La cereza lista es roja (o amarilla en variedades amarillas) uniforme y se desprende con facilidad.",
              "Pasa por el lote cada dos o tres semanas durante la campaña, según maduren.",
              "Separa los verdes y sobremaduros que caigan en el balde.",
              "Cosecha con la mano, sin arrancar la rama ni los botones florales de la próxima cosecha.",
              "No dejes la cereza al sol: llévala al beneficio el mismo día."
            ],
            fijarse: "Verdes y sobremaduros bajan el puntaje y se castigan en el precio.",
            error: "Cosechar «a la brava» para terminar en una pasada.", fuente: FUENTES.duicela },
          { id: "calibracion", titulo: "Calibrar al equipo",
            hacer: "Explica y muestra qué cereza se corta. Revisa los baldes al recibir.",
            detalles: [
              "Antes de empezar, muestra a cada cosechador un puñado de cereza buena y otro de lo que no se corta.",
              "Revisa el balde al recibir y devuelve lo que no cumpla.",
              "Prueba de flotación: en un balde con agua, la cereza que flota suele estar vana, brocada o seca.",
              "Paga un incentivo por calidad si puedes: cambia la conducta en pocos días."
            ],
            fijarse: "Pagar por calidad, y no solo por peso, cambia el resultado del día.",
            error: "Recibir sin revisar y descubrir los verdes en el despulpado.", fuente: FUENTES.duicela },
          { id: "registro-cosecha", titulo: "Registrar la cosecha",
            hacer: "Anota cada día: fecha, lote, kilos de cereza y quién cosechó.",
            detalles: [
              "Anota cada día: fecha, lote, kilos de cereza y jornales.",
              "Pesa siempre con la misma balanza y revísala de vez en cuando.",
              "Al final de la campaña suma por lote: sabrás cuál rinde más y cuál necesita atención."
            ],
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
            detalles: [
              "Calibra la despulpadora al tamaño del grano para no morder ni dejar cereza entera.",
              "Pasa la cereza por flotación o clasificación antes de despulpar.",
              "Usa la menor cantidad de agua posible y recíclala si tu equipo lo permite.",
              "Lava la máquina al terminar: restos de pulpa fermentada contaminan el lote siguiente."
            ],
            fijarse: "La cereza que espera empieza a fermentar sin control dentro del saco.",
            error: "Dejar la cereza del día para la mañana siguiente.", fuente: FUENTES.anacafe },
          { id: "fermentacion", titulo: "Fermentación",
            hacer: "Anota la hora de inicio, la temperatura del ambiente y cuándo termina. Comprueba el punto con la prueba del dedo o del palo.",
            detalles: [
              "Usa tanques limpios de cemento liso, plástico grado alimenticio o acero; no de metal que se oxide.",
              "Anota la hora de inicio, la temperatura del ambiente y la hora en que termina.",
              "Punto: el grano se siente áspero al frotarlo y no resbala el mucílago; un palo clavado en la masa deja un hueco que no se cierra.",
              "A más frío (más altura), más horas; a más calor, menos.",
              "Si haces procesos especiales (honey, natural, fermentaciones controladas), registra cada variable y prueba primero con lotes pequeños."
            ],
            fijarse: "Las horas de fermentación cambian con la altura y la temperatura: no hay un número igual para todos.",
            error: "Fermentar «las horas de siempre» sin comprobar el punto.", registro: "fermentacion", revisar: true, fuente: FUENTES.anacafe },
          { id: "lavado", titulo: "Lavado y clasificación",
            hacer: "Lava hasta que el grano quede áspero al tacto y separa los flotantes.",
            detalles: [
              "Lava con agua limpia, moviendo el café, hasta que el agua salga clara.",
              "Retira los flotantes (granos vanos o dañados) y sécalos aparte como café de segunda.",
              "Pasa al secado el mismo día: el café lavado y húmedo vuelve a fermentar si espera."
            ],
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
            detalles: [
              "Seca sobre marquesina (secador solar techado), camas elevadas o tendales; no sobre tierra ni asfalto.",
              "Remueve varias veces al día para que el secado sea parejo.",
              "Cubre en la noche y con lluvia: el café que se moja y se vuelve a secar pierde calidad.",
              "No mezcles lotes de días distintos en el mismo espacio sin separarlos."
            ],
            fijarse: "Anacafé recomienda no pasar de unos 7 cm de capa y remover con frecuencia; el patio muy caliente al tender raja el pergamino.",
            error: "Montones gruesos que secan por fuera y quedan húmedos por dentro.", fuente: FUENTES.anacafe },
          { id: "humedad", titulo: "Humedad final 10–12 %",
            hacer: "Mide con medidor de humedad antes de ensacar y anota el valor.",
            detalles: [
              "Mide en varias partes del tendal y anota el promedio.",
              "Si no tienes medidor, pide a tu asociación o comprador que te ayude; la prueba de morder el grano da solo una idea.",
              "Deja reposar el café unas horas a la sombra antes de ensacar para que se iguale la humedad."
            ],
            fijarse: "Por encima de 12 % aparecen mohos y sabores raros; muy por debajo, el grano se quiebra y pierdes peso.",
            error: "Calcular la humedad «al tacto».", registro: "secado", fuente: FUENTES.anacafe },
          { id: "curva", titulo: "Registrar la curva",
            hacer: "Anota humedad y día. Con dos o tres lotes ya sabes cuánto tarda tu secado.",
            detalles: [
              "Anota cada día la humedad, el clima y si se cubrió el café.",
              "Compara campañas: sabrás cuántos días tarda tu secado en sol y en lluvia.",
              "Un secado demasiado rápido o demasiado lento se nota en taza."
            ],
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
            detalles: [
              "Usa sacos limpios de yute o fibra, o bolsas herméticas para café de especialidad.",
              "Almacena sobre tarimas, separado de paredes, lejos de fertilizantes, combustible o pesticidas: el café absorbe olores.",
              "Identifica cada saco con lote, fecha y humedad.",
              "Revisa la humedad otra vez antes de vender."
            ],
            fijarse: "El tiempo de reposo antes de trillar depende del destino del café; pregúntalo a tu comprador.",
            error: "Apilar sacos directo en el piso.", revisar: true, fuente: FUENTES.duicela },
          { id: "trilla", titulo: "Trilla y zaranda",
            hacer: "Trilla y clasifica por tamaño. Anota rendimiento de pergamino a oro y el porcentaje por zaranda.",
            detalles: [
              "Pesa el pergamino antes de trillar y el oro después; el rendimiento es la relación entre los dos.",
              "Clasifica por zaranda (tamaño) y anota el porcentaje de cada una.",
              "Limpia la trilladora antes de pasar tu lote para no mezclarlo con otro."
            ],
            fijarse: "El rendimiento es un número que el comprador va a pedir.",
            error: "No pesar antes y después de trillar.", fuente: FUENTES.duicela },
          { id: "defectos", titulo: "Defectos",
            hacer: "Separa y cuenta los defectos de una muestra.",
            detalles: [
              "Toma una muestra de 350 g de café oro, que es la que usa la SCA para contar defectos.",
              "Separa granos negros, agrios, brocados, partidos, inmaduros y conchas.",
              "Defectos completos como negro o agrio pesan más que los parciales: un solo grano negro baja la calificación.",
              "Anota cuántos encontraste: es el dato que te pedirá el comprador."
            ],
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
            detalles: [
              "Toma pequeñas cantidades de varios sacos y mézclalas.",
              "Etiqueta con lote, fecha, humedad, variedad y proceso.",
              "Guarda una contramuestra igual a la que envías."
            ],
            fijarse: "Una muestra que no representa al lote termina en una devolución.",
            error: "Mandar lo mejor del lote como muestra.", fuente: FUENTES.duicela },
          { id: "catacion", titulo: "Catación",
            hacer: "Encarga la catación a un catador acreditado y guarda el informe.",
            detalles: [
              "Busca un catador con certificación Q Grader o un laboratorio reconocido.",
              "Pide el informe por escrito con fecha, protocolo y nombre del catador.",
              "Pide comentarios: el informe dice qué mejorar en la finca o el beneficio."
            ],
            fijarse: "Desde noviembre de 2024 la SCA usa el Coffee Value Assessment, que sustituye al formulario de 2004. Pregunta con qué protocolo te catan y guárdalo junto al puntaje.",
            error: "Publicar un puntaje sin decir quién ni cómo lo evaluó.", fuente: FUENTES.sca },
          { id: "ficha-calidad", titulo: "Guardar el informe",
            hacer: "Adjunta el informe a tu lote en el marketplace.",
            detalles: [
              "Escanea o fotografía el informe y súbelo al publicar el lote.",
              "Pon el puntaje y el protocolo en la ficha del lote, con la fecha de la catación."
            ],
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
            detalles: [
              "Anota en cada tueste: lote, peso de entrada, peso de salida, tiempo total, temperatura y momento del primer crack.",
              "La pérdida de peso dice qué tan tostado está el café.",
              "Prueba el resultado en taza y anota qué te gustó y qué cambiarías.",
              "Repite exactamente el perfil que funcionó y anótalo como receta."
            ],
            fijarse: "Sin registro no hay perfil repetible, y sin perfil no hay marca.",
            error: "Tostar «a ojo» y no poder repetir el resultado que gustó.", fuente: FUENTES.duicela },
          { id: "molienda", titulo: "Molienda",
            hacer: "Muele según el método de preparación de tu cliente, y solo cuando vayas a empacar.",
            detalles: [
              "Gruesa para prensa francesa, media para filtro, fina para espresso.",
              "Limpia el molino entre cafés distintos.",
              "Si vendes en grano, indícalo en la etiqueta y sugiere la molienda."
            ],
            fijarse: "El café molido pierde aroma en días.",
            error: "Moler todo el lote por adelantado.", fuente: FUENTES.duicela },
          { id: "empaque", titulo: "Empaque y etiqueta",
            hacer: "Empaca con válvula, pon fecha de tueste, origen, variedad, proceso y peso neto.",
            detalles: [
              "Usa bolsa con válvula de una vía para que salgan los gases sin entrar aire.",
              "Etiqueta con fecha de tueste, origen, variedad, proceso, peso neto y datos del productor.",
              "Para vender en tiendas o supermercados se exige registro y notificación sanitaria de ARCSA: consúltalo antes de empacar en volumen."
            ],
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
            detalles: [
              "Suma todo: jornales (incluido el tuyo y el de tu familia), abono, plantas, herramientas, transporte, beneficio y trilla.",
              "Divide entre los quintales que produjiste para tener el costo por quintal.",
              "Si tienes varios lotes, calcula por lote: puede que uno te dé pérdida."
            ],
            fijarse: "Si no sabes tu costo, no sabes si el precio que te ofrecen te conviene.",
            error: "Comparar la oferta solo con el precio de la bolsa.", registro: "costos", fuente: FUENTES.duicela },
          { id: "referencia", titulo: "Mirar la referencia",
            hacer: "Compara con el panel de precios de la Red, que publica la referencia mensual con su fuente.",
            detalles: [
              "Compara precio de café en el mismo estado (cereza, pergamino, oro) y la misma unidad.",
              "El café con puntaje y registros se negocia por encima de la referencia; el corriente, cerca de ella."
            ],
            fijarse: "La referencia internacional va por quintal de 100 lb: si vendes por saco, di cuánto pesa.",
            error: "Negociar sin ninguna referencia.", fuente: "Red Café Ecuador · Panel de precios" },
          { id: "publicar", titulo: "Publicar el lote",
            hacer: "Publica en el marketplace con foto real, altura, proceso, humedad, puntaje, sacos y precio.",
            detalles: [
              "Usa fotos reales del lote, con buena luz.",
              "Completa altura, variedad, proceso, humedad, puntaje, cantidad y precio.",
              "Responde rápido a las consultas: es lo que más cierra ventas."
            ],
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
            detalles: [
              "Saca el RUC en el SRI: si eres agricultor puedes revisar el régimen que te corresponde (por ejemplo RIMPE) con un contador.",
              "Pregunta en tu municipio si necesitas patente municipal o permiso de funcionamiento.",
              "Si vendes café empacado, necesitas además la notificación sanitaria de ARCSA."
            ],
            fijarse: "Vender formal te abre compradores que no compran sin factura.",
            error: "Dejarlo para cuando llegue el comprador.", fuente: "SRI Ecuador" },
          { id: "guia", titulo: "Registro de operador en Agrocalidad",
            hacer: "Regístrate como operador en el Sistema GUIA de Agrocalidad.",
            detalles: [
              "Entra al Sistema GUIA de Agrocalidad, crea tu usuario y registra tu finca como operador.",
              "Ten a mano tu cédula, la ubicación de la finca y la superficie de café.",
              "Si tienes dudas, acude a la oficina de Agrocalidad de tu provincia."
            ],
            fijarse: "Es el paso previo para pedir la certificación de Buenas Prácticas Agrícolas.",
            error: "Pedir la certificación sin estar registrado.", fuente: FUENTES.agrocalidadReg },
          { id: "bpa", titulo: "Certificación BPA",
            hacer: "Solicita la certificación por el mismo sistema; un auditor visita la finca.",
            detalles: [
              "Prepara antes los registros de labores, insumos, cosecha y capacitación del personal.",
              "Organiza la bodega de insumos separada de la vivienda y del café, con letreros.",
              "Instala un lugar de lavado de equipos y de manos para quien aplica productos.",
              "Revisa la lista de verificación de Agrocalidad y corrige lo que falte antes de pedir la auditoría."
            ],
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
            detalles: [
              "Incluye costos fijos (herramientas, depreciación de equipos) y variables (jornales, insumos).",
              "Usa el registro de costos de la guía: se suma solo.",
              "Repite el cálculo cada campaña."
            ],
            fijarse: "Incluye tu propio trabajo: si no te lo pagas, el negocio no es rentable, solo lo parece.",
            error: "Contar solo lo que se pagó en efectivo.", registro: "costos", fuente: "Red Café Ecuador · Calculadora" },
          { id: "equilibrio", titulo: "Punto de equilibrio",
            hacer: "Calcula cuántos quintales necesitas vender para cubrir los costos del año.",
            detalles: [
              "Punto de equilibrio = costos del año ÷ precio por quintal.",
              "Si tus quintales están por debajo, busca bajar costos o subir precio con calidad.",
              "Considera los meses sin ingresos: planifica el flujo de caja."
            ],
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
            detalles: [
              "Humedad con medidor, rendimiento de trilla, defectos en 350 g y puntaje de taza.",
              "Guarda los números de cada lote y cada campaña."
            ],
            fijarse: "Cuatro números convierten una conversación en una negociación.",
            error: "Hablar de calidad sin ningún dato.", fuente: FUENTES.sca },
          { id: "presentar", titulo: "Cómo presentarlo",
            hacer: "Arma una ficha de una página: finca, altura, variedad, proceso, humedad, puntaje, cantidad y precio.",
            detalles: [
              "Pon foto real, ubicación (provincia y altura), variedad y proceso.",
              "Agrega los cuatro números de calidad y la cantidad disponible.",
              "Indica precio, unidad y lugar de entrega."
            ],
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
            detalles: [
              "Tostador local: volumen pequeño, constancia, calidad media-alta.",
              "Exportador: volumen, constancia, documentación y trazabilidad.",
              "Consumidor final: tostado, empaque, marca y logística de envío.",
              "Elige uno o dos tipos de cliente y prepárate para lo que piden."
            ],
            fijarse: "Un tostador de especialidad pide muestra y puntaje; un exportador, volumen y constancia.",
            error: "Ofrecer lo mismo a todos.", fuente: "Red Café Ecuador" },
          { id: "muestra", titulo: "Muestra y respuesta",
            hacer: "Manda muestra identificada y acuerda un plazo para la respuesta.",
            detalles: [
              "Manda 250–300 g de café oro o la cantidad que pida el comprador, en bolsa limpia y etiquetada.",
              "Anota a quién, cuándo y qué lote enviaste, y pregunta la respuesta en el plazo acordado."
            ],
            fijarse: "Anota a quién mandaste qué: al tercer comprador ya no te acuerdas.",
            error: "Mandar muestras sin registro.", fuente: "Red Café Ecuador" },
          { id: "acuerdo", titulo: "Acuerdo por escrito",
            hacer: "Deja por escrito cantidad, calidad, precio, fecha y forma de pago.",
            detalles: [
              "Escribe cantidad, calidad mínima (humedad, defectos, puntaje), precio, fecha y lugar de entrega, y forma de pago.",
              "Acuerda qué pasa si la entrega no cumple la muestra.",
              "Firma o confirma por escrito, aunque sea por correo o mensaje."
            ],
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
            detalles: [
              "Asigna un código a cada lote y anótalo en todos los registros: cosecha, beneficio, secado, venta.",
              "Guarda fecha, parcela y cantidades de cada movimiento."
            ],
            fijarse: "Sin trazabilidad no hay expediente EUDR posible.",
            error: "Mezclar lotes de distintas fincas sin registro.", fuente: FUENTES.eudr },
          { id: "eudr", titulo: "Expediente EUDR",
            hacer: "Registra el GPS de tu finca y arma el documento de debida diligencia con la herramienta de la Red.",
            detalles: [
              "Toma las coordenadas GPS de cada parcela (un punto si es pequeña; el contorno si es grande, según el reglamento).",
              "Demuestra que la parcela no fue deforestada después del 31 de diciembre de 2020.",
              "Guarda las pruebas de que cumpliste la ley ecuatoriana (tenencia, ambiente, laboral)."
            ],
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
            detalles: [
              "Busca asociaciones u organizaciones de productores en tu zona o en el MAG.",
              "Compartir beneficio, secadora o catación baja costos.",
              "Definan por escrito reglas, aportes y reparto."
            ],
            fijarse: "También se comparten costos de catación y certificación.",
            error: "Competir con el vecino por el mismo comprador en vez de sumar volumen.", fuente: "Red Café Ecuador" },
          { id: "marca", titulo: "Marca propia",
            hacer: "Si ya tienes calidad constante y clientes, evalúa tostar y vender con tu marca.",
            detalles: [
              "Empieza con poco: un producto, un tamaño de bolsa, un canal de venta.",
              "Calcula el costo con tueste, empaque, etiqueta, registro sanitario y envío.",
              "Cuenta tu historia: finca, altura, variedad y familia venden."
            ],
            fijarse: "Es otro negocio: exige inventario, empaque y venta al detalle.",
            error: "Saltar a la marca sin tener constante la calidad.", fuente: "Red Café Ecuador" }
        ]
      }
    ]
  };

  window.REDCAFE_GUIAS = { version: "20261111h", fuentes: FUENTES, guias: [FINCA, NEGOCIO] };
})();
