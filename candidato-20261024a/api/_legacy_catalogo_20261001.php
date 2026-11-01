<?php
if (!defined('REDCAFE_CURSOS_INTERNO')) { http_response_code(404); exit; }
return json_decode(<<<'REDC_CATALOGO_JSON'
{
  "legacy-barista-en-casa": {
    "descripcion": "Curso DE PAGO, dictado por nuestro aliado Legacy Specialty Education. Todo lo que hay que saber sobre la extracción de café y sus fórmulas: filtrados, métodos alternativos y desarrollo del olfato y el paladar. 8 horas presenciales. Valor normal: 159 USD · Descuento: 143 USD · En pareja o grupo: 120 USD por persona. Se paga a Legacy.",
    "materiales": [
      {
        "tipo": "archivo",
        "titulo": "Pensum oficial (PDF de Legacy)",
        "url": "/uploads/user-content/legacy-pensum-barista-en-casa.pdf",
        "nota": "Documento original del aliado, tal cual lo entrega."
      },
      {
        "tipo": "enlace",
        "titulo": "Escribir a Legacy por WhatsApp",
        "url": "https://wa.me/593998569355?text=Hola%20Legacy%2C%20vengo%20de%20redcafeecuador.com.%20Me%20interesa%20el%20curso%20Barista%20en%20Casa.",
        "nota": "Consultas sobre fechas, cupos y forma de pago. Atiende el equipo de Legacy."
      },
      {
        "tipo": "enlace",
        "titulo": "Sitio web de Legacy",
        "url": "https://legacycafesas.com/",
        "nota": "Academia, cafetería, consultoría y desarrollo de producto."
      },
      {
        "tipo": "enlace",
        "titulo": "Legacy en Instagram",
        "url": "https://www.instagram.com/legacyacademics/",
        "nota": "@legacyacademics — la cuenta de la academia."
      },
      {
        "tipo": "enlace",
        "titulo": "Legacy Specialty Coffee en Instagram",
        "url": "https://www.instagram.com/legacy_specialty_coffee/"
      },
      {
        "tipo": "enlace",
        "titulo": "Legacy en Facebook",
        "url": "https://www.facebook.com/LegacySpecialtyCoffee"
      }
    ],
    "precios": {
      "normal": 159,
      "descuento": 143,
      "pareja_grupo": 120
    }
  },
  "legacy-barismo-profesional": {
    "descripcion": "Curso DE PAGO, dictado por nuestro aliado Legacy Specialty Education. Para trabajar como barista e iniciarte en el tueste y la cata a nivel profesional: espresso, texturización de leche, arte latte y manejo de barra real. Valor normal: 399 USD · Descuento: 359 USD · En pareja o grupo: 320 USD por persona. Se paga a Legacy.",
    "materiales": [
      {
        "tipo": "archivo",
        "titulo": "Pensum oficial (PDF de Legacy)",
        "url": "/uploads/user-content/legacy-pensum-barismo-profesional.pdf",
        "nota": "Documento original del aliado, tal cual lo entrega."
      },
      {
        "tipo": "enlace",
        "titulo": "Escribir a Legacy por WhatsApp",
        "url": "https://wa.me/593998569355?text=Hola%20Legacy%2C%20vengo%20de%20redcafeecuador.com.%20Me%20interesa%20el%20curso%20Barismo%20Profesional.",
        "nota": "Consultas sobre fechas, cupos y forma de pago. Atiende el equipo de Legacy."
      },
      {
        "tipo": "enlace",
        "titulo": "Sitio web de Legacy",
        "url": "https://legacycafesas.com/",
        "nota": "Academia, cafetería, consultoría y desarrollo de producto."
      },
      {
        "tipo": "enlace",
        "titulo": "Legacy en Instagram",
        "url": "https://www.instagram.com/legacyacademics/",
        "nota": "@legacyacademics — la cuenta de la academia."
      },
      {
        "tipo": "enlace",
        "titulo": "Legacy Specialty Coffee en Instagram",
        "url": "https://www.instagram.com/legacy_specialty_coffee/"
      },
      {
        "tipo": "enlace",
        "titulo": "Legacy en Facebook",
        "url": "https://www.facebook.com/LegacySpecialtyCoffee"
      }
    ],
    "precios": {
      "normal": 399,
      "descuento": 359,
      "pareja_grupo": 320
    },
    "fechas": [
      {
        "nombre": "Barista Pro septiembre · Intensivo Quito",
        "inicio": "28 septiembre",
        "fin": "2 octubre",
        "horario": "9:00am - 2:00pm",
        "dias": "Lunes a viernes"
      },
      {
        "nombre": "Barista Pro octubre · Sábados Cumbayá",
        "inicio": "3 octubre",
        "fin": "7 noviembre",
        "horario": "2:30pm - 7:30pm",
        "dias": "5 sábados; calendario por confirmar con Legacy"
      },
      {
        "nombre": "Barista Pro octubre · Intensivo Cumbayá",
        "inicio": "19 octubre",
        "fin": "23 octubre",
        "horario": "8:30am - 1:30pm",
        "dias": "Lunes a viernes"
      },
      {
        "nombre": "Barista Pro octubre · Intensivo Cuenca",
        "inicio": "12 octubre",
        "fin": "16 octubre",
        "horario": "9:00am - 1:00pm",
        "dias": "Lunes a viernes"
      },
      {
        "nombre": "Barista Pro octubre · Sábados Quito",
        "inicio": "17 octubre",
        "fin": "Fecha final por confirmar",
        "horario": "9:00am - 1:00pm",
        "dias": "6 sábados; calendario por confirmar con Legacy"
      },
      {
        "nombre": "Barista Pro octubre · Intensivo Quito",
        "inicio": "26 octubre",
        "fin": "30 octubre",
        "horario": "9:00am - 2:00pm",
        "dias": "Lunes a viernes"
      }
    ],
    "incluye": [
      "Filtrados",
      "Espresso",
      "Calibración",
      "Texturización",
      "Latte art",
      "Servicio",
      "Bebidas",
      "Todos los materiales",
      "Bolsa de empleo",
      "25 horas opcionales de práctica en barra",
      "25 horas opcionales de práctica de latte art"
    ]
  },
  "legacy-barista-avanzado": {
    "descripcion": "Curso DE PAGO, dictado por nuestro aliado Legacy Specialty Education. Recorre la cadena completa —finca, café verde, exportación, tueste y extracción— con salida a finca, catación y práctica en tostadora. Valor normal: 599 USD. Alumnos graduados de Barismo Profesional: 550 USD. Se paga a Legacy.",
    "materiales": [
      {
        "tipo": "archivo",
        "titulo": "Pensum oficial (PDF de Legacy)",
        "url": "/uploads/user-content/legacy-pensum-barista-avanzado.pdf",
        "nota": "Documento original del aliado, con el cronograma completo."
      },
      {
        "tipo": "enlace",
        "titulo": "Escribir a Legacy por WhatsApp",
        "url": "https://wa.me/593998569355?text=Hola%20Legacy%2C%20vengo%20de%20redcafeecuador.com.%20Me%20interesa%20el%20curso%20Barista%20Avanzado.",
        "nota": "Consultas sobre fechas, cupos y forma de pago. Atiende el equipo de Legacy."
      },
      {
        "tipo": "enlace",
        "titulo": "Sitio web de Legacy",
        "url": "https://legacycafesas.com/",
        "nota": "Academia, cafetería, consultoría y desarrollo de producto."
      },
      {
        "tipo": "enlace",
        "titulo": "Legacy en Instagram",
        "url": "https://www.instagram.com/legacyacademics/",
        "nota": "@legacyacademics — la cuenta de la academia."
      },
      {
        "tipo": "enlace",
        "titulo": "Legacy Specialty Coffee en Instagram",
        "url": "https://www.instagram.com/legacy_specialty_coffee/"
      },
      {
        "tipo": "enlace",
        "titulo": "Legacy en Facebook",
        "url": "https://www.facebook.com/LegacySpecialtyCoffee"
      }
    ],
    "precios": {
      "normal": 599,
      "descuento": 550
    },
    "requisitos": "Dirigido a alumnos graduados de Barista Profesional."
  }
}
REDC_CATALOGO_JSON, true);
