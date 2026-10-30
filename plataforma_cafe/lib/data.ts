import recetasJson from "../public/data/contenido-recetas.json";
import cursosLegacyJson from "../public/data/contenido-cursos-legacy.json";

export type Rol =
  | "productor"
  | "vendedor"
  | "comprador"
  | "bar"
  | "barista"
  | "certificador"
  | "transportista"
  | "pilador"
  | "exportador"
  | "proveedor"
  | "amante"
  | "asesor"
  | "admin";

export interface Plan {
  id: string;
  nombre: string;
  perfil: Rol;
  precio: number;
  periodicidad: string;
  descripcion: string;
  beneficios: string[];
  destacado?: boolean;
}

export interface Lote {
  id: string;
  finca: string;
  productor: string;
  provincia: string;
  variedad: string;
  proceso: string;
  altura: number;
  score: number;
  precioQuintal: number;
  precioSaco: number;
  stockSacos: number;
  stockQuintales: number;
  certificacion: string;
  emoji: string;
  ventaMinima: string;
  verificado: boolean;
  ejemplo: boolean;
  trazabilidad: {
    gps: string;
    altitud: number;
    especie: string;
    metodos: string[];
  };
  descripcion: string;
  imagen: string;
  lat?: number;
  lng?: number;
}

export interface Curso {
  id: string;
  titulo: string;
  nivel: string;
  duracion: string;
  modulos: { titulo: string; minutos: number }[];
  descripcion: string;
  categoria: "produccion" | "postcosecha" | "comercial" | "administrativo" | "barismo" | "calidad";
  // Campos de los cursos de pago (Legacy). Opcionales: los cursos gratis no los tienen.
  acceso?: string;
  autor?: string;
  introduccion?: string;
  objetivos?: string[];
  materiales?: { tipo: string; titulo: string; url: string; nota?: string }[];
  recursos?: string[];
  cierre?: string;
  precios?: { normal: number; descuento: number; pareja_grupo?: number };
  fechas?: { nombre: string; inicio: string; fin: string; horario: string; dias: string }[];
  incluye?: string[];
  requisitos?: string;
}

export interface Noticia {
  id: string;
  titulo: string;
  fecha: string;
  resumen: string;
  fuente: string;
  categoria: string;
  contenido?: string[];
  slug?: string;
  /** URL de la fuente. Toda afirmación factual debería poder comprobarse. */
  fuente_url?: string;
}

export type DificultadReceta = "fácil" | "media" | "alta";

export interface Receta {
  id: string;
  slug: string;
  titulo: string;
  resumen: string;
  metodo: string;
  dificultad: DificultadReceta;
  minutos: number;
  porciones: number;
  ratio: string;
  molienda: string;
  temperatura: string;
  ingredientes: string[];
  pasos: string[];
  consejo: string;
  origenSugerido: string;
}

export interface ServicioExtra {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  href: string;
}

export const PLANES: Plan[] = [
  {
    id: "semilla",
    nombre: "Semilla",
    perfil: "productor",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Entrada gratuita a la Red para el pequeño caficultor.",
    beneficios: [
      "Escaparate digital con 3 lotes activos",
      "Acceso a la Academia (cursos básicos)",
      "Chat con compradores vía WhatsApp",
      "Guía de costos de producción (plantilla)",
      "Soporte en español",
      "Servicios básicos gratuitos para todos",
    ],
  },
  {
    id: "cosecha",
    nombre: "Cosecha",
    perfil: "productor",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Para productores que quieren vender directo y formalizarse.",
    beneficios: [
      "Lotes ilimitados + visibilidad destacada",
      "Trazabilidad GPS y dossier EUDR",
      "Acceso a asesoría, capacitación y certificación (con costo por servicio)",
      "Apoyo de formalización (RUC, facturación SRI)",
      "Todo lo de Semilla",
    ],
    destacado: true,
  },
  {
    id: "origen",
    nombre: "Origen",
    perfil: "vendedor",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Para tostadores, exportadores y mayoristas.",
    beneficios: [
      "Acceso a ofertas verificadas con catación",
      "Trazabilidad GPS + cumplimiento EUDR",
      "Logística integrada (cotización y tracking)",
      "Capacitación de tueste y blending (por servicio)",
      "3 sub-cuentas de equipo",
    ],
  },
  {
    id: "comprador",
    nombre: "Comprador Profesional",
    perfil: "comprador",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Para cafeterías, restaurantes y supermercados.",
    beneficios: [
      "Compras desde 1 libra, sin pedidos mínimos grandes",
      "Suscripción de café del mes",
      "Muestras de catación antes del pedido",
      "Proveedores verificados y trazables",
      "Historial de proveedores confiables",
    ],
  },
  {
    id: "granel",
    nombre: "Granel / Empresa",
    perfil: "vendedor",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Para cadenas y exportadores grandes.",
    beneficios: [
      "Cuenta multiusuario",
      "API de integración",
      "Reportes y analítica avanzada",
      "Servicio prioritario (por servicio)",
      "Contratos anuales",
    ],
  },
  {
    id: "barra",
    nombre: "Bar / Cafetería",
    perfil: "bar",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Para cafeterías y bares que sirven café de origen.",
    beneficios: [
      "Menú digital público de tu barra",
      "Pedidos directos a tostadores y productores verificados",
      "Registro de ventas al público y control de inventario",
      "Perfil visible para clientes de la Red",
      "Capacitación de barismo (por servicio)",
      "Comunidad y chat con tostadores",
    ],
    destacado: true,
  },
  {
    id: "barista",
    nombre: "Barista Pro",
    perfil: "barista",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Para baristas profesionales que quieren capacitarse y aparecer en la Red.",
    beneficios: [
      "Biblioteca de recetas y control de turno",
      "Vinculación a un bar o cafetería afiliada",
      "Comunidad de baristas",
      "Acceso al marketplace para insumos",
      "Capacitación continua (por servicio)",
    ],
  },
  {
    id: "certificador",
    nombre: "Verificador / Catador",
    perfil: "certificador",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Para catadores, Q Graders, laboratorios y verificadores que auditan y certifican lotes de la Red.",
    beneficios: [
      "Bandeja de solicitudes de certificación",
      "Catación SCA: puntúa lotes y emite certificado",
      "Auditoría EUDR: valida GPS, parcelas y debida diligencia",
      "Firma digital de certificados (número + código verificable)",
      "Historial y reportes de certificaciones emitidas",
      "Visibilidad pública como verificador de la Red",
      "Ingresos por cada certificación emitida (la Red cobra por servicio)",
    ],
  },
  {
    id: "proveedor",
    nombre: "Proveedor de Equipos e Insumos",
    perfil: "proveedor",
    precio: 0,
    periodicidad: "gratis",
    destacado: false,
    descripcion: "Para quienes venden maquinaria, insumos y materiales a la industria del café.",
    beneficios: [
      "Catálogo de equipos e insumos visible para toda la Red",
      "Solicitudes de cotización de productores, piladores, tostadores y barras",
      "Perfil con zona de cobertura y servicio técnico",
      "Historial de entregas y valoraciones",
      "Destacar productos en el marketplace (por servicio)",
      "Capacitación técnica a tus compradores (por servicio)",
    ],
  },
  {
    id: "amante",
    nombre: "Amante del Café",
    perfil: "amante",
    precio: 0,
    periodicidad: "gratis",
    destacado: false,
    descripcion: "Para quien disfruta del café ecuatoriano y quiere comprarlo, aprender y descubrir orígenes.",
    beneficios: [
      "Compra café de origen desde 1 libra",
      "Suscripción de café del mes",
      "Cursos de cata y preparación en la Academia",
      "Descubre fincas, perfiles de taza y reportajes",
      "Valora los cafés que pruebas y sigue a tus productores",
      "Comunidad, catas y eventos de la Red",
    ],
  },
  {
    id: "transportista",
    nombre: "Transportista",
    perfil: "transportista",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Para transportistas de café que conectan fincas con tostadores y puertos.",
    beneficios: [
      "Perfil público con zonas de cobertura",
      "Solicitudes de flete de la Red",
      "Cotización y tracking de rutas",
      "Historial de entregas y valoraciones",
      "Acceso a seguro de carga (por servicio)",
    ],
  },
  {
    id: "pilador",
    nombre: "Pilador / Beneficiadero",
    perfil: "pilador",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Para piladores y beneficiaderos que procesan café pergamino a oro.",
    beneficios: [
      "Perfil público de capacidad de pilado",
      "Solicitudes de pilado de la Red",
      "Control de merma y humedad",
      "Historial de lotes procesados",
      "Capacitación técnica (por servicio)",
    ],
  },
  {
    id: "exportador",
    nombre: "Exportador",
    perfil: "exportador",
    precio: 0,
    periodicidad: "gratis",
    descripcion: "Para exportadores que llevan café ecuatoriano a mercados internacionales.",
    beneficios: [
      "Acceso a lotes con dossier EUDR verificado",
      "Red de verificadores y catadores",
      "Logística internacional (cotización y flete)",
      "Documentación de exportación (por servicio)",
      "Conexión con compradores globales",
    ],
  },
  {
    id: "asesor",
    nombre: "Asesor Experto",
    perfil: "asesor",
    precio: 0,
    periodicidad: "gratis",
    destacado: false,
    descripcion:
      "Para profesionales que asesoran a productores, tostadores, barras y exportadores de la Red.",
    beneficios: [
      "Perfil público con tus áreas de especialidad y experiencia",
      "Solicitudes de asesoría de cualquier perfil de la Red",
      "Agenda de consultas y seguimiento de casos",
      "Historial de asesorías y valoraciones de quienes te contrataron",
      "Cobra por sesión o por proyecto (la Red cobra por servicio)",
      "Publica guías y responde en la comunidad como especialista",
    ],
  },
];

export const LOTES: Lote[] = [
  {
    id: "loja-gesha-01",
    finca: "Finca de ejemplo Loja",
    productor: "Productor de ejemplo",
    provincia: "Loja",
    variedad: "Geisha",
    proceso: "Lavado",
    altura: 1850,
    score: 91,
    precioQuintal: 320,
    precioSaco: 192,
    stockSacos: 12,
    stockQuintales: 20,
    certificacion: "Orgánico",
    emoji: "🫘",
    ventaMinima: "1 libra",
    verificado: false,
    ejemplo: true,
    trazabilidad: {
      gps: "4.0522° S, 79.4255° O",
      altitud: 1850,
      especie: "Arábica",
      metodos: ["Cosecha selectiva", "Fermentación 48h", "Secado en camas africanas"],
    },
    descripcion:
      "Geisha de altura de la frontera sur. Notas de jazmín, bergamota y miel. Perfil de taza excepcional, galardonado en catas locales.",
    imagen: "bg-gradient-to-br from-amber-700 to-amber-900",
    lat: -4.0522,
    lng: -79.4255,
  },
  {
    id: "zamora-sidra-02",
    finca: "Finca de ejemplo Zamora",
    productor: "Productor de ejemplo",
    provincia: "Zamora Chinchipe",
    variedad: "Sidra",
    proceso: "Honey",
    altura: 1600,
    score: 89,
    precioQuintal: 260,
    precioSaco: 156,
    stockSacos: 25,
    stockQuintales: 42,
    certificacion: "Comercio Justo",
    emoji: "🍒",
    ventaMinima: "1 libra",
    verificado: false,
    ejemplo: true,
    trazabilidad: {
      gps: "4.0692° S, 78.9567° O",
      altitud: 1600,
      especie: "Arábica",
      metodos: ["Cosecha selectiva", "Fermentación 36h", "Miel 60%"],
    },
    descripcion:
      "Sidra honey de la amazonía sur. Dulzor alto, notas de caramelo, naranja confitada y cuerpo cremoso.",
    imagen: "bg-gradient-to-br from-red-700 to-rose-900",
    lat: -4.0692,
    lng: -78.9567,
  },
  {
    id: "manabi-typica-03",
    finca: "Finca de ejemplo Manabí",
    productor: "Productor de ejemplo",
    provincia: "Manabí",
    variedad: "Typica",
    proceso: "Lavado",
    altura: 950,
    score: 84,
    precioQuintal: 150,
    precioSaco: 90,
    stockSacos: 40,
    stockQuintales: 68,
    certificacion: "Rainforest",
    emoji: "🌱",
    ventaMinima: "5 libras",
    verificado: false,
    ejemplo: true,
    trazabilidad: {
      gps: "1.6055° S, 80.3468° O",
      altitud: 950,
      especie: "Arábica",
      metodos: ["Cosecha selectiva", "Despulpado 12h", "Fermentación 24h"],
    },
    descripcion:
      "Typica de la costa manabita, cuerpo medio, notas de chocolate con leche, nuez y frutas secas.",
    imagen: "bg-gradient-to-br from-lime-800 to-green-900",
    lat: -1.6055,
    lng: -80.3468,
  },
  {
    id: "sucumbios-robusta-04",
    finca: "Finca de ejemplo Sucumbíos",
    productor: "Productor de ejemplo",
    provincia: "Sucumbíos",
    variedad: "Robusta",
    proceso: "Natural",
    altura: 620,
    score: 78,
    precioQuintal: 110,
    precioSaco: 66,
    stockSacos: 80,
    stockQuintales: 135,
    certificacion: "Sin deforestación",
    emoji: "🌳",
    ventaMinima: "1 saco",
    verificado: false,
    ejemplo: true,
    trazabilidad: {
      gps: "0.1577° N, 77.2616° O",
      altitud: 620,
      especie: "Robusta",
      metodos: ["Cosecha mecánica", "Secado natural en patios"],
    },
    descripcion:
      "Robusta amazónica sostenible y libre de deforestación. Ideal para mezclas e industria de soluble.",
    imagen: "bg-gradient-to-br from-emerald-800 to-teal-900",
    lat: 0.1577,
    lng: -77.2616,
  },
  {
    id: "pichincha-typica-05",
    finca: "Finca de ejemplo Pichincha",
    productor: "Productor de ejemplo",
    provincia: "Pichincha",
    variedad: "Typica",
    proceso: "Lavado",
    altura: 1750,
    score: 87,
    precioQuintal: 200,
    precioSaco: 120,
    stockSacos: 15,
    stockQuintales: 26,
    certificacion: "Orgánico",
    emoji: "🌿",
    ventaMinima: "1 libra",
    verificado: false,
    ejemplo: true,
    trazabilidad: {
      gps: "0.0156° S, 78.6259° O",
      altitud: 1750,
      especie: "Arábica",
      metodos: ["Cosecha selectiva", "Fermentación 40h", "Lavado doble"],
    },
    descripcion:
      "Café de la cordillera de los Andes noroccidente. Acidez brillante, notas cítricas y florales.",
    imagen: "bg-gradient-to-br from-stone-700 to-stone-900",
    lat: -0.0156,
    lng: -78.6259,
  },
  {
    id: "orense-robusta-06",
    finca: "Finca de ejemplo Orellana",
    productor: "Productor de ejemplo",
    provincia: "Orellana",
    variedad: "Robusta",
    proceso: "Natural",
    altura: 300,
    score: 74,
    precioQuintal: 95,
    precioSaco: 57,
    stockSacos: 60,
    stockQuintales: 100,
    certificacion: "Sin deforestación",
    emoji: "🏝️",
    ventaMinima: "1 quintal",
    verificado: false,
    ejemplo: true,
    trazabilidad: {
      gps: "0.9394° S, 76.9636° O",
      altitud: 300,
      especie: "Robusta",
      metodos: ["Cosecha manual", "Secado natural"],
    },
    descripcion:
      "Robusta amazónica de la provincia de Orellana, alta extracción para industria.",
    imagen: "bg-gradient-to-br from-cyan-800 to-sky-900",
    lat: -0.9394,
    lng: -76.9636,
  },
];

export const CURSOS: Curso[] = [
  {
    id: "buenas-practicas",
    titulo: "Buenas Prácticas Agrícolas del Cafetal",
    nivel: "Básico",
    duracion: "3 horas",
    categoria: "produccion",
    descripcion:
      "Saca más quintales de la misma hectárea. Manejo de cultivo, poda, fertilización y prevención de la roya.",
    modulos: [
      { titulo: "Manejo del suelo y sombra", minutos: 40 },
      { titulo: "Poda y renovación de cafetales", minutos: 45 },
      { titulo: "Nutrición y fertilización", minutos: 50 },
      { titulo: "Manejo integrado de plagas y roya", minutos: 45 },
    ],
  },
  {
    id: "postcosecha",
    titulo: "Post-cosecha y Calidad de Taza",
    nivel: "Intermedio",
    duracion: "4 horas",
    categoria: "postcosecha",
    descripcion:
      "Sube el puntaje de tu taza y con él el precio que te pagan. Cosecha selectiva, fermentación, lavado y secado.",
    modulos: [
      { titulo: "Índice de madurez y cosecha selectiva", minutos: 50 },
      { titulo: "Fermentación controlada", minutos: 55 },
      { titulo: "Lavado y clasificación", minutos: 40 },
      { titulo: "Secado en camas africanas y patios", minutos: 50 },
      { titulo: "Análisis sensorial básico", minutos: 45 },
    ],
  },
  {
    id: "ventas-comercial",
    titulo: "Comercialización Directa y Negociación",
    nivel: "Intermedio",
    duracion: "3 horas",
    categoria: "comercial",
    descripcion:
      "Deja de aceptar el primer precio que te ofrecen. Cómo fijarlo, negociar con tostadores, presentar muestras y cerrar la venta directa.",
    modulos: [
      { titulo: "Entendiendo los precios del mercado (ICE C)", minutos: 45 },
      { titulo: "Preparación de muestras y presentación", minutos: 40 },
      { titulo: "Técnicas de negociación", minutos: 50 },
      { titulo: "Contratos y condiciones de entrega", minutos: 45 },
    ],
  },
  {
    id: "formalizacion",
    titulo: "Formalización y Administración del Negocio",
    nivel: "Básico",
    duracion: "3 horas",
    categoria: "administrativo",
    descripcion:
      "Factura en regla y véndele a quien exige comprobante. RUC, facturación electrónica del SRI, registro sanitario y control de costos.",
    modulos: [
      { titulo: "Constitución simple y RUC", minutos: 50 },
      { titulo: "Facturación electrónica SRI", minutos: 55 },
      { titulo: "Registro sanitario y certificaciones", minutos: 40 },
      { titulo: "Costos, ingresos y margen", minutos: 45 },
    ],
  },
  {
    id: "tueste",
    titulo: "Tueste y Blending para Tostadores",
    nivel: "Avanzado",
    duracion: "4 horas",
    categoria: "comercial",
    descripcion:
      "Consigue un perfil de tueste que puedas repetir siempre igual. Curvas, desarrollo y creación de mezclas.",
    modulos: [
      { titulo: "Física del tostado", minutos: 50 },
      { titulo: "Curvas de tueste por origen", minutos: 55 },
      { titulo: "Creación de blends", minutos: 50 },
      { titulo: "Control de calidad post-tueste", minutos: 45 },
    ],
  },
  {
    id: "trazabilidad",
    titulo: "Trazabilidad y Cumplimiento EUDR",
    nivel: "Avanzado",
    duracion: "2 horas",
    categoria: "administrativo",
    descripcion:
      "Llega con los papeles hechos cuando tu comprador europeo te los pida. Geolocalización de finca y expediente de debida diligencia.",
    modulos: [
      { titulo: "Reglamento EUDR en la práctica", minutos: 30 },
      { titulo: "Registro GPS de la finca", minutos: 30 },
      { titulo: "Dossier de lote exportable", minutos: 30 },
      { titulo: "Estrategia para mercados premium", minutos: 30 },
    ],
  },
  {
    id: "cafe-especial",
    titulo: "Café de Especialidad: calidad que paga precio",
    nivel: "Intermedio",
    duracion: "3 horas",
    categoria: "produccion",
    descripcion:
      "Haz que tu café deje de venderse como uno más. Variedades, perfil de taza, microlotes y mercados que pagan la diferencia.",
    modulos: [
      { titulo: "¿Qué hace especial a un café?", minutos: 40 },
      { titulo: "Variedades y perfiles de taza", minutos: 45 },
      { titulo: "Microlotes y lotes diferenciados", minutos: 40 },
      { titulo: "Posicionamiento de precio premium", minutos: 45 },
    ],
  },
  {
    id: "manejo-plagas",
    titulo: "Manejo Integrado de Plagas y Enfermedades",
    nivel: "Básico",
    duracion: "2 horas",
    categoria: "produccion",
    descripcion:
      "No pierdas la cosecha por una plaga que se veía venir. Roya, broca y otras amenazas: monitoreo, prevención y control sostenible.",
    modulos: [
      { titulo: "Identificación de plagas clave", minutos: 30 },
      { titulo: "Monitoreo y umbrales", minutos: 30 },
      { titulo: "Prevención y control biológico", minutos: 30 },
      { titulo: "Plan de manejo sostenible", minutos: 30 },
    ],
  },
  {
    id: "exportacion",
    titulo: "Comercio Exterior: vender al mundo",
    nivel: "Avanzado",
    duracion: "4 horas",
    categoria: "comercial",
    descripcion:
      "Vende fuera del Ecuador sin depender de un intermediario. Documentación, incoterms, flete, normativa y trato directo con compradores.",
    modulos: [
      { titulo: "Regulación exportadora de Ecuador", minutos: 50 },
      { titulo: "Incoterms y contratos", minutos: 55 },
      { titulo: "Logística y flete internacional", minutos: 50 },
      { titulo: "Mercados objetivo y estándares (EUDR)", minutos: 55 },
    ],
  },
  ...cursosLegacyJson.map((curso) => ({ ...curso, categoria: "barismo" as const })),
  {
    id: "cafe-de-especialidad-de-la-finca-a-la-taza",
    titulo: "Introducción al café de calidad: de la finca a la taza",
    nivel: "Básico",
    duracion: "1 h 30 min + degustación presencial",
    categoria: "calidad",
    descripcion: "CURSO GRATUITO de Red Café Ecuador. Qué es un café de especialidad y qué hace falta en cada eslabón para conseguirlo: finca, beneficio, pilado, tueste y taza. Para que productor, comprador, tostador, barista y consumidor hablen el mismo idioma. Hora y media en línea, más una sesión presencial de degustación.",
    modulos: [
      { titulo: "1 · Qué es café de especialidad (y qué no)", minutos: 15 },
      { titulo: "2 · En la finca: donde se gana o se pierde", minutos: 18 },
      { titulo: "3 · Pilado, clasificación y almacenamiento", minutos: 14 },
      { titulo: "4 · Tueste: revelar, no maquillar", minutos: 12 },
      { titulo: "5 · La taza: cómo se sabe que un café es bueno", minutos: 16 },
      { titulo: "6 · Comprar y vender con criterio", minutos: 15 },
      { titulo: "7 · Sesión presencial: degustación guiada", minutos: 0 },
    ],
  },
];

export const NOTICIAS: Noticia[] = [
  {
    id: "n0",
    titulo: "Calendario del café ecuatoriano: qué queda del 2026",
    fecha: "2026-08-24",
    resumen:
      "Dos festivales el mismo fin de semana de octubre, el Día Internacional del Café y una fecha europea que marca el trimestre. Lo que está confirmado y lo que todavía no.",
    fuente: "Red Café Ecuador",
    categoria: "Sector",
    slug: "calendario-cafe-ecuador-2026",
    contenido: [
      "Lo que queda del año concentra en octubre casi todo lo que importa para quien vive del café en Ecuador. Aquí está lo confirmado, con la advertencia de lo que todavía no tiene fecha pública.",
      "1 DE OCTUBRE · DÍA INTERNACIONAL DEL CAFÉ",
      "Establecido por la Organización Internacional del Café. No es un evento con sede: es la fecha en la que el sector entero, en todo el mundo, habla de lo mismo. Para una finca o una barra pequeña es el día del año con más atención disponible y menos esfuerzo necesario.",
      "9, 10 Y 11 DE OCTUBRE · COFFEEFEST ECUADOR · COTACACHI",
      "En el Parque Ornamental de Cotacachi, con entrada gratuita. Reúne a productores, baristas, cafeterías, tostadores, compradores y marcas de todo el país. En la agenda: el lanzamiento del Coffee Innovation Lab, los campeonatos nacionales de AeroPress y Origami, la categoría Baristas Kids y un torneo que combina café con destilados.",
      "El 10 de octubre a las 16:00 se entrega la Gala Nacional de The Best Coffee Shops Ecuador, tras un proceso en el que participaron más de trescientas cafeterías de la Costa, la Sierra, la Amazonía y Galápagos.",
      "9, 10 Y 11 DE OCTUBRE · CAFÉ Y CACAO FEST · CUENCA",
      "En el Hotel Oro Verde, aprovechando el feriado del 9 de octubre. Los dos festivales caen los mismos tres días y en extremos opuestos del país: Cotacachi está en Imbabura y Cuenca en Azuay. Quien tenga que elegir, que elija por cercanía a sus compradores, no por tamaño del evento.",
      "TAZA DORADA · SIN FECHA PÚBLICA TODAVÍA",
      "El concurso nacional de calidad que organiza ANECAFÉ desde hace más de dieciocho años no tiene, al cierre de esta nota, calendario 2026 publicado. Conviene consultarlo directamente con la asociación si piensas presentar café.",
      "De la edición de 2024 sí hay registro: se desarrolló en Estados Unidos del 22 al 24 de octubre y cerró con una subasta electrónica el 12 de diciembre, donde se ofrecieron los trece mejores cafés del país —todos por encima de 88 puntos— a compradores estadounidenses. Ganó un Sidra de Pallatanga, Chimborazo, con 91,02 puntos.",
      "30 DE DICIEMBRE · EMPIEZA A APLICARSE EL EUDR",
      "El reglamento europeo contra la deforestación se aplica desde esa fecha a los operadores grandes y medianos de la Unión Europea, y desde el 30 de junio de 2027 al resto de micro y pequeños. La obligación es del importador, no del productor ecuatoriano, pero él necesita los datos del origen para cumplirla: los va a pedir entre seis y doce meses antes de su propia fecha.",
      "Dicho de otro modo: quien exporte a Europa tiene el trimestre para dejar la documentación lista, no el año.",
      "UNA NOTA SOBRE LAS FERIAS DE PROVINCIA",
      "Este calendario recoge lo que aparece en fuentes nacionales. Las ferias cantonales y provinciales —que a menudo son las que más sirven para vender— rara vez se publican fuera de su zona. Si sabes de alguna en Loja, Zamora, El Oro o Manabí, escríbenos y la sumamos.",
    ],
    fuente_url: "https://ico.org/es/international-coffee-day/",
  },
  {
    id: "n1",
    titulo: "Ecuador reactiva su caficultura: 135 mil hectáreas tecnificadas",
    fecha: "2026-07-20",
    resumen:
      "El proyecto estatal apunta a renovar la caficultura con asistencia técnica, crédito productivo y comercialización asociativa.",
    fuente: "MAGAP",
    categoria: "Sector",
    slug: "ecuador-reactiva-caficultura",
    contenido: [
      "El gobierno ecuatoriano presentó un plan integral para renovar la caficultura nacional, con foco en la tecnificación de 135 mil hectáreas y el relevo generacional en las zonas productoras.",
      "El programa incluye asistencia técnica en manejo de cultivo, crédito productivo con tasas preferenciales y fortalecimiento de la comercialización asociativa para reducir la dependencia de intermediarios.",
      "Para los productores de la Red, esto significa un escenario favorable: más demanda de café con trazabilidad, más apoyo financiero para renovar cafetales viejos y oportunidades de exportación a mercados premium.",
    ],
  },
  {
    id: "n2",
    titulo: "Cuenta atrás para el EUDR: qué fecha te toca según a quién le vendes",
    fecha: "2026-07-02",
    resumen:
      "El reglamento europeo contra la deforestación no se aplica todavía: empieza el 30 de diciembre de 2026. Según el tamaño de tu comprador, tu plazo real puede ser ese o el 30 de junio de 2027.",
    fuente: "Comisión Europea",
    categoria: "Regulación",
    slug: "trazabilidad-requisito-europa",
    contenido: [
      "El Reglamento de la Unión Europea contra la deforestación (EUDR) todavía NO se aplica. La Comisión Europea confirmó el calendario definitivo y es este:",
      "· 30 de diciembre de 2026 — para operadores grandes y medianos de la UE, y también para los micro y pequeños que ya estaban cubiertos por el reglamento de la madera.",
      "· 30 de junio de 2027 — para el resto de operadores micro y pequeños.",
      "La obligación recae sobre el importador europeo, no sobre el productor ecuatoriano. Pero el importador no puede cumplirla sin los datos del origen, así que los pedirá antes de su propia fecha: en la práctica, entre seis meses y un año antes, porque necesita validarlos antes de comprar.",
      "Qué fecha te toca a ti depende, entonces, de a quién le vendes. Si tu comprador es un tostador o importador grande o mediano, tu límite real es la campaña anterior a diciembre de 2026. Si le vendes a un importador pequeño, tienes hasta mediados de 2027.",
      "Y el EUDR no se resuelve mandando unas coordenadas. La debida diligencia tiene tres partes: recopilar la información del origen, evaluar el riesgo de deforestación y, cuando haga falta, mitigarlo. La declaración se presenta en el sistema oficial de la Unión Europea, y quien la firma responde por ella.",
      "Ahí es donde la Red ayuda. El expediente de trazabilidad organiza los datos de tu finca —coordenadas, especie, proceso y cadena de custodia— en el formato que el importador va a pedir. No es una certificación oficial de cumplimiento: es el trabajo hecho y ordenado para que la conversación con tu comprador empiece con los papeles sobre la mesa.",
      "Si no sabes por dónde empezar, en la Red hay asesores que trabajan justamente esto: agronomía, calidad, exportación y cumplimiento. Puedes pedirles una asesoría, contratar la documentación, o preguntar en la comunidad qué está haciendo alguien que ya pasó por lo mismo.",
      "Fuente: Comisión Europea — Reglamento (UE) 2023/1115, calendario de aplicación revisado.",
    ],
  },
  {
    id: "n3",
    titulo: "El café de especialidad ecuatoriano gana terreno en Asia",
    fecha: "2026-06-15",
    resumen:
      "Microlotes de Geisha y Sidra de Loja y Zamora captan interés de tostadores japoneses y coreanos por perfiles de taza únicos.",
    fuente: "ANECAFÉ",
    categoria: "Mercado",
    slug: "cafe-especialidad-asia",
    contenido: [
      "Los microlotes ecuatorianos de Geisha y Sidra, cultivados en las alturas de Loja y Zamora Chinchipe, están captando la atención de tostadores en Japón, Corea y Taiwán.",
      "El perfil de taza ecuatoriano —notas cítricas, florales y dulzor persistente— destaca en competiciones internacionales y catas a ciegas frente a orígenes tradicionales.",
      "Para los productores con lotes de score alto, la ventana de exportación directa a Asia representa márgenes muy superiores a la venta local, y la Red facilita ese contacto con compradores verificados.",
    ],
  },
  {
    id: "n4",
    titulo: "Guía: cómo fijar el precio de tu café en Ecuador",
    fecha: "2026-08-10",
    resumen:
      "Paso a paso para calcular tu oferta usando el precio de referencia ICE C, el diferencial por calidad y tus costos de producción.",
    fuente: "Red Café Ecuador",
    categoria: "Guía",
    slug: "como-fijar-precio-cafe",
    contenido: [
      "Muchos productores venden a precio de 'mercado' sin saber si ese precio cubre sus costos. Esta guía te ayuda a fijar tu oferta con datos, no con corazonadas.",
      "Paso 1: conoce el precio de referencia internacional (ICE C). Lo ves en vivo en el panel de precios de la Red. Paso 2: aplica tu diferencial por calidad: los cafés con score alto, certificaciones orgánicas o procesos especiales suman primas de $20 a $150 por quintal.",
      "Paso 3: calcula tus costos reales (insumos, mano de obra, post-cosecha, transporte). Paso 4: suma tu margen. La calculadora de la Red hace la aritmética por ti y te muestra el ingreso neto por lote.",
    ],
  },
  {
    id: "n5",
    titulo: "Post-cosecha: el error que más cuesta a los pequeños productores",
    fecha: "2026-07-28",
    resumen:
      "La fermentación y el secado inadecuados pueden tirar a la basura un café con excelente potencial de taza. Cómo evitarlo con 3 prácticas simples.",
    fuente: "Red Café Ecuador",
    categoria: "Técnica",
    slug: "postcosecha-errores",
    contenido: [
      "El café se juega en la post-cosecha: un proceso descuidado en fermentación o secado puede convertir un lote de 90 puntos en uno de 80, y con ello perder $100 por quintal.",
      "Práctica 1: controla el tiempo y temperatura de fermentación según tu método (lavado, honey o natural). Práctica 2: seca sobre camas africanas o patios limpios, con espesores de capa uniformes y volteos regulares.",
      "Práctica 3: mide la humedad final (10.5% a 11.5%) antes de empacar. La Academia de la Red tiene un curso completo de post-cosecha con estas técnicas, incluidas en tu membresía.",
    ],
  },
  {
    id: "n6",
    titulo: "Barismo y cafeterías: cómo la Red conecta tu barra con el origen",
    fecha: "2026-07-15",
    resumen:
      "El bar y la cafetería de especialidad encuentran en la Red el puente directo con fincas verificadas, muestras de catación y el café del mes.",
    fuente: "Red Café Ecuador",
    categoria: "Comunidad",
    slug: "barismo-cafeterias-red",
    contenido: [
      "Las cafeterías de especialidad compiten por diferenciarse con origen. La Red les da el puente directo: contactar fincas verificadas, pedir muestras de catación y suscribirse al café del mes.",
      "Cada cafetería afiliada tiene su vitrina en el Bar de la Red: su carta, su historia y sus redes sociales en un escaparate público que los clientes comparten.",
      "El resultado es un círculo virtuoso: la cafetería vende café con historia verificable, el productor gana un canal directo y estable, y el consumidor recibe una taza que puede rastrear hasta la finca.",
    ],
  },
];

// Recetas de preparación de café (dominio público, sin autoría atribuida).
export const RECETAS: Receta[] = recetasJson as Receta[];

export const SERVICIOS_EXTRA: ServicioExtra[] = [
  {
    id: "precios",
    titulo: "Panel de Precios del Mercado",
    descripcion: "Precio de referencia ICE C y diferenciales para que fijes tu oferta informado.",
    icono: "📈",
    href: "/servicios/precios",
  },
  {
    id: "calculadora",
    titulo: "Calculadora de Venta",
    descripcion: "Convierte quintales y sacos, estima tu ingreso neto y margen por lote.",
    icono: "🧮",
    href: "/servicios/calculadora",
  },
  {
    id: "trazabilidad",
    titulo: "Dossier EUDR de tu Finca",
    descripcion: "Registra el GPS de tu finca y genera el documento de debida diligencia listo para exportar.",
    icono: "📍",
    href: "/servicios/eudr",
  },
  {
    id: "facturacion",
    titulo: "Facturación Electrónica",
    descripcion: "Herramientas de apoyo para organizar y emitir documentación comercial desde la Red.",
    icono: "🧾",
    href: "/servicios/factura",
  },
  {
    id: "soporte",
    titulo: "Soporte y Comunidad WhatsApp",
    descripcion: "Asistencia directa y una red de contactos comerciales en tu canal favorito.",
    icono: "💬",
    href: "/comunidad",
  },
];

/* ═══════════════════════════════════════════════════════════════
   MONETIZACIÓN POR SERVICIOS (modelo 2026)
   Registro gratuito para todos los perfiles. La Red cobra por
   servicios: asesorías, capacitaciones y certificaciones.
   Los servicios básicos son gratuitos para todos.
   ═══════════════════════════════════════════════════════════════ */
export interface ServicioPago {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  unidad: string; // "por sesión", "por curso", "por certificado", "por lote"
  gratis: boolean;
  categoria: "asesoria" | "capacitacion" | "certificacion" | "logistica" | "basico";
  icono: string;
  href: string;
  destinatarios: Rol[];
  /** ID del ítem en PayPal para botón de pago rápido (opcional). */
  paypal_item_id?: string;
}

export const SERVICIOS_PAGADOS: ServicioPago[] = [
  // ── GRATUITOS PARA TODOS ─────────────────────────────────────
  {
    id: "acceso-basico",
    nombre: "Acceso básico",
    descripcion: "Te encuentran, te escriben y cotizas sin pagar nada por estar.",
    precio: 0,
    unidad: "gratis",
    gratis: true,
    categoria: "basico",
    icono: "🆓",
    href: "/afiliate",
    destinatarios: ["productor", "vendedor", "comprador", "bar", "barista", "certificador", "transportista", "pilador", "exportador"],
  },
  {
    id: "marketplace",
    nombre: "Marketplace de lotes",
    descripcion: "Vendes o compras directo, con el origen a la vista y sin comisión de por medio.",
    precio: 0,
    unidad: "gratis",
    gratis: true,
    categoria: "basico",
    icono: "🫘",
    href: "/marketplace",
    destinatarios: ["productor", "vendedor", "comprador", "bar", "barista", "certificador", "transportista", "pilador", "exportador"],
  },
  {
    id: "academia-basica",
    nombre: "Academia básica",
    descripcion: "Aprendes lo que sube el precio de tu café: producción, post-cosecha y taza.",
    precio: 0,
    unidad: "gratis",
    gratis: true,
    categoria: "basico",
    icono: "🎓",
    href: "/academia",
    destinatarios: ["productor", "vendedor", "comprador", "bar", "barista", "certificador", "transportista", "pilador", "exportador"],
  },
  {
    id: "precios-libres",
    nombre: "Panel de precios",
    descripcion: "Llegas a negociar sabiendo cuánto vale tu quintal hoy, no lo que te digan.",
    precio: 0,
    unidad: "gratis",
    gratis: true,
    categoria: "basico",
    icono: "📈",
    href: "/servicios/precios",
    destinatarios: ["productor", "vendedor", "comprador", "bar", "barista", "certificador", "transportista", "pilador", "exportador"],
  },
  {
    id: "facturacion",
    nombre: "Apoyo de facturación electrónica",
    descripcion: "Orientación para ordenar datos comerciales y emitir documentación desde las herramientas de la Red.",
    precio: 0,
    unidad: "herramienta",
    gratis: true,
    categoria: "basico",
    icono: "🧾",
    href: "/servicios/factura",
    destinatarios: ["productor", "vendedor", "comprador", "bar", "barista", "certificador", "transportista", "pilador", "exportador", "proveedor", "asesor"],
  },

  // ── ASESORÍAS ────────────────────────────────────────────────
  {
    id: "asesoria-negocio",
    nombre: "Asesoría de negocio",
    descripcion: "Sesión 1:1 con un asesor de la Red para fijar precios, formalizar o planificar tu cosecha.",
    precio: 25,
    unidad: "por sesión",
    gratis: false,
    categoria: "asesoria",
    icono: "💼",
    href: "/asesoria",
    destinatarios: ["productor", "vendedor", "comprador", "bar", "barista", "transportista", "pilador", "exportador"],
    paypal_item_id: "ASE-NNEG-25",
  },
  {
    id: "asesoria-exportacion",
    nombre: "Asesoría de exportación",
    descripcion: "Prepara tus lotes para mercados internacionales: documentos, incoterms y compradores.",
    precio: 60,
    unidad: "por sesión",
    gratis: false,
    categoria: "asesoria",
    icono: "🌎",
    href: "/asesoria",
    destinatarios: ["productor", "vendedor", "exportador", "pilador"],
    paypal_item_id: "ASE-EXPO-60",
  },

  // ── CAPACITACIONES ───────────────────────────────────────────
  {
    id: "curso-especialidad",
    nombre: "Curso de especialidad",
    descripcion: "Catación, microlotes y perfiles premium. Con certificado de la Academia.",
    precio: 45,
    unidad: "por curso",
    gratis: false,
    categoria: "capacitacion",
    icono: "☕",
    href: "/academia",
    destinatarios: ["productor", "vendedor", "barista", "bar", "certificador"],
    paypal_item_id: "CUR-ESPC-45",
  },
  {
    id: "curso-barismo",
    nombre: "Curso de barismo",
    descripcion: "Técnicas de barra, latte art y recetas. Con certificado de la Academia.",
    precio: 35,
    unidad: "por curso",
    gratis: false,
    categoria: "capacitacion",
    icono: "🧑‍🍳",
    href: "/academia",
    destinatarios: ["bar", "barista", "comprador"],
    paypal_item_id: "CUR-BARZ-35",
  },

  // ── CERTIFICACIONES ──────────────────────────────────────────
  {
    id: "cert-eudr",
    nombre: "Expediente EUDR",
    descripcion: "Dossier de debida diligencia auditado por un verificador de la Red, numerado y verificable.",
    precio: 30,
    unidad: "por certificado",
    gratis: false,
    categoria: "certificacion",
    icono: "📍",
    href: "/servicios/eudr",
    destinatarios: ["productor", "vendedor", "exportador", "pilador"],
    paypal_item_id: "CERT-EUDR-30",
  },
  {
    id: "cert-catacion",
    nombre: "Informe de catación",
    descripcion: "Catación SCA con score oficial por un catador certificado de la Red.",
    precio: 40,
    unidad: "por certificado",
    gratis: false,
    categoria: "certificacion",
    icono: "🛡️",
    href: "/servicios/eudr",
    destinatarios: ["productor", "vendedor", "exportador", "bar", "barista"],
    paypal_item_id: "CERT-CATA-40",
  },
  {
    id: "cert-verificacion",
    nombre: "Verificación de perfil",
    descripcion: "Confirma identidad y actividad real (RUC/cédula, finca o negocio). Tu perfil queda verificado.",
    precio: 10,
    unidad: "por verificación",
    gratis: false,
    categoria: "certificacion",
    icono: "✅",
    href: "/servicios/eudr",
    destinatarios: ["productor", "vendedor", "comprador", "bar", "barista", "certificador", "transportista", "pilador", "exportador"],
    paypal_item_id: "CERT-VERI-10",
  },

  // ── LOGÍSTICA ────────────────────────────────────────────────
  {
    id: "flete-cafe",
    nombre: "Flete de café",
    descripcion: "Transporte de sacos entre fincas, tostadores y puertos con transportistas de la Red.",
    precio: 50,
    unidad: "por ruta",
    gratis: false,
    categoria: "logistica",
    icono: "🚚",
    href: "/marketplace",
    destinatarios: ["productor", "vendedor", "exportador", "transportista", "pilador"],
    paypal_item_id: "LOG-FLET-50",
  },
  {
    id: "pilado-sacos",
    nombre: "Pilado de sacos",
    descripcion: "Procesamiento de pergamino a oro en beneficiaderos de la Red.",
    precio: 20,
    unidad: "por quintal",
    gratis: false,
    categoria: "logistica",
    icono: "⚙️",
    href: "/marketplace",
    destinatarios: ["productor", "vendedor", "exportador", "pilador"],
    paypal_item_id: "LOG-PILA-20",
  },


];

export function serviciosPara(rol: Rol): ServicioPago[] {
  return SERVICIOS_PAGADOS.filter((s) => s.destinatarios.includes(rol));
}
