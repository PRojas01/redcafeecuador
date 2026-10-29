"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PLANES } from "@/lib/data";
import { useContenido } from "@/lib/useContenido";
import { api, getStoredSession, setStoredSession, type ApiUser } from "@/lib/api";
import type { Rol } from "@/lib/data";
import { Icono, type IconoNombre } from "@/components/Icono";
import { CONFIG } from "@/lib/config";
import { SkeletonGrid } from "@/components/Skeleton";

const PASOS = ["Perfil", "Datos", "Listo"] as const;

const ROLES: { r: Rol; n: string; d: string; icono: IconoNombre }[] = [
  { r: "productor", n: "Productor", d: "Produzco café y quiero mostrar mi finca y mis lotes.", icono: "productor" },
  { r: "vendedor", n: "Tostador / Comerciante", d: "Tueste, compro y vendo café con trazabilidad.", icono: "tostador" },
  { r: "comprador", n: "Comprador", d: "Compro café para mi cafetería, tienda o negocio.", icono: "comprador" },
  { r: "bar", n: "Bar / Cafetería", d: "Sirvo café de origen en mi barra y quiero hacerlo visible.", icono: "bar" },
  { r: "barista", n: "Barista", d: "Trabajo en barra y quiero capacitarme.", icono: "barista" },
  { r: "certificador", n: "Verificador / Catador", d: "Audito fincas y califico lotes con catación.", icono: "verificacion" },
  { r: "proveedor", n: "Proveedor de Equipos e Insumos", d: "Vendo maquinaria, insumos y materiales para el sector.", icono: "proveedor" },
  { r: "transportista", n: "Transportista", d: "Muevo café entre fincas y tostadores.", icono: "logistica" },
  { r: "pilador", n: "Pilador / Beneficiadero", d: "Proceso pergamino a café oro.", icono: "pilador" },
  { r: "exportador", n: "Exportador", d: "Llevo café ecuatoriano al mundo.", icono: "exportador" },
  { r: "amante", n: "Amante del Café", d: "Disfruto el café y quiero comprar y aprender.", icono: "amante" },
  { r: "asesor", n: "Asesor Experto", d: "Asesoro a otros actores del café.", icono: "asesor" },
];

const PLAN_DEFAULT: Record<Rol, string> = {
  productor: "cosecha",
  vendedor: "origen",
  comprador: "comprador",
  bar: "barra",
  barista: "barista",
  certificador: "certificador",
  proveedor: "proveedor",
  transportista: "transportista",
  pilador: "pilador",
  exportador: "exportador",
  amante: "amante",
  asesor: "asesor",
  admin: "origen",
};

const GUIA_PERFIL: Record<Rol, { titulo: string; texto: string; funciones: string[] }> = {
  productor: {
    titulo: "Tu panel se enfoca en vender y organizar tu café",
    texto: "Podrás publicar lotes de café desde grano sin proceso hasta producto terminado, agregar finca, altura, proceso, fotos y ubicación para que el mapa y el marketplace se actualicen desde la misma publicación.",
    funciones: ["Publicar lotes de café", "Recibir pedidos y cotizaciones", "Pedir flete, pilado, catación o trazabilidad"],
  },
  vendedor: {
    titulo: "Tu panel se enfoca en abastecimiento y compras",
    texto: "Podrás buscar lotes de café por origen, comparar información y abrir pedidos o cotizaciones con productores y proveedores de servicio.",
    funciones: ["Buscar lotes de café", "Solicitar servicios", "Organizar compras y costos"],
  },
  comprador: {
    titulo: "Tu panel se enfoca en encontrar café con contexto",
    texto: "Podrás comprar café de origen, revisar información del lote y pedir servicios relacionados cuando exista una operación.",
    funciones: ["Explorar marketplace", "Solicitar pedidos", "Calificar servicio y calidad"],
  },
  bar: {
    titulo: "Tu panel se enfoca en tu barra y abastecimiento",
    texto: "Podrás mostrar tu cafetería, organizar menú, pedir café y publicar necesidades de abastecimiento.",
    funciones: ["Menú digital", "Pedidos a proveedores", "Ingresos y gastos"],
  },
  barista: {
    titulo: "Tu panel se enfoca en capacitación y oportunidades",
    texto: "Podrás acceder a Academia, recetas, comunidad y oportunidades relacionadas con barras afiliadas.",
    funciones: ["Academia", "Recetas", "Vinculación con cafeterías"],
  },
  certificador: {
    titulo: "Tu panel se enfoca en evaluaciones e informes",
    texto: "Podrás ofrecer catación, verificación, informes técnicos y recibir solicitudes de miembros.",
    funciones: ["Solicitudes de evaluación", "Informes técnicos", "Calificaciones de servicio"],
  },
  proveedor: {
    titulo: "Tu panel se enfoca en publicar productos y servicios",
    texto: "Podrás mostrar equipos, insumos, soporte técnico y recibir solicitudes de cotización.",
    funciones: ["Publicar servicios", "Recibir pedidos", "Valoraciones de clientes"],
  },
  transportista: {
    titulo: "Tu panel se enfoca en rutas y fletes",
    texto: "Podrás publicar cobertura, recibir solicitudes de transporte y construir historial de entregas.",
    funciones: ["Publicar rutas", "Recibir fletes", "Historial de entregas"],
  },
  pilador: {
    titulo: "Tu panel se enfoca en procesamiento",
    texto: "Podrás publicar capacidad de pilado, recibir solicitudes y registrar lotes de café procesados.",
    funciones: ["Solicitudes de pilado", "Merma y humedad", "Historial de servicio"],
  },
  exportador: {
    titulo: "Tu panel se enfoca en lotes de café y documentación",
    texto: "Podrás buscar lotes con trazabilidad, solicitar verificaciones y coordinar servicios de exportación.",
    funciones: ["Lotes auditados", "EUDR", "Servicios de exportación"],
  },
  amante: {
    titulo: "Tu panel se enfoca en descubrir y aprender",
    texto: "Podrás explorar recetas, cafés de origen, contenidos y publicaciones abiertas de la Red.",
    funciones: ["Recetas", "Academia", "Cafés de origen"],
  },
  asesor: {
    titulo: "Tu panel se enfoca en ofrecer asesoría",
    texto: "Podrás publicar servicios, recibir solicitudes de miembros y construir reputación profesional con valoraciones.",
    funciones: ["Publicar asesorías", "Recibir solicitudes", "Calificaciones de clientes"],
  },
  admin: {
    titulo: "Panel de administración",
    texto: "Gestión general de usuarios, contenidos y operaciones.",
    funciones: ["Usuarios", "Operaciones", "Contenidos"],
  },
};

type IntroduccionPerfil = {
  titulo: string;
  texto: string;
  pasos: { n: string; t: string; d: string }[];
  cierre: string;
};

const INTRODUCCION_PERFIL: Record<Rol, IntroduccionPerfil> = {
  productor: {
    titulo: "Publica tu finca, tus lotes y los servicios que necesitas",
    texto: "Tu cuenta conecta tu perfil productivo con marketplace, mapa nacional, academia, pedidos y servicios Redcafe para vender con más información.",
    pasos: [
      { n: "01", t: "Muestras tu café con contexto", d: "Registra finca, provincia, altura, proceso, fotos y datos básicos para que el lote aparezca de forma coherente en marketplace y mapa." },
      { n: "02", t: "Recibes pedidos y cotizaciones", d: "Los compradores pueden solicitar tu café, conversar cuando exista una operación y dejar trazabilidad comercial dentro de tu panel." },
      { n: "03", t: "Pides servicios cuando los necesitas", d: "Catación, expediente de trazabilidad, asesoría, flete o pilado se solicitan desde la Red sin salir del flujo de trabajo." },
    ],
    cierre: "Cada lote bien presentado mejora tu oportunidad de venta y también fortalece la reputación del café ecuatoriano como origen.",
  },
  vendedor: {
    titulo: "Compra, tuesta y comercializa café con trazabilidad",
    texto: "Tu perfil reúne búsqueda de lotes, pedidos, servicios técnicos y contactos para organizar mejor el abastecimiento y la venta.",
    pasos: [
      { n: "01", t: "Encuentras lotes publicados", d: "Explora productores, perfiles de taza, ubicaciones y datos del lote antes de iniciar una solicitud." },
      { n: "02", t: "Ordenas tus operaciones", d: "Los pedidos y cotizaciones quedan visibles en tu panel para dar seguimiento a compras, servicios y conversaciones." },
      { n: "03", t: "Solicitas soporte especializado", d: "Puedes pedir catación, trazabilidad, asesoría comercial, control de calidad o logística según la operación." },
    ],
    cierre: "Un tostador o comerciante con información clara compra mejor, vende mejor y ayuda a elevar la confianza en el origen Ecuador.",
  },
  comprador: {
    titulo: "Encuentra café ecuatoriano con información verificable",
    texto: "Tu cuenta está pensada para explorar lotes, pedir muestras o compras, calificar calidad y solicitar servicios asociados.",
    pasos: [
      { n: "01", t: "Comparas opciones reales", d: "Revisa lote, finca, provincia, proceso y publicaciones disponibles desde el marketplace." },
      { n: "02", t: "Solicitas productos o servicios", d: "Cada pedido queda asociado a tu panel para que puedas revisar estado, contacto y continuidad." },
      { n: "03", t: "Calificas la experiencia", d: "Tus valoraciones de calidad de café, servicio y atención ayudan a construir reputación dentro de la Red." },
    ],
    cierre: "Comprar con trazabilidad reduce incertidumbre y premia a quienes trabajan mejor el café ecuatoriano.",
  },
  bar: {
    titulo: "Haz visible tu cafetería y organiza tu abastecimiento",
    texto: "Tu perfil conecta tu barra con productores, tostadores, proveedores, pedidos, servicios y valoración de clientes.",
    pasos: [
      { n: "01", t: "Presentas tu cafetería", d: "Muestra ubicación, propuesta, cafés servidos y datos útiles para que otros miembros te encuentren." },
      { n: "02", t: "Pides café y servicios", d: "Solicita lotes, insumos, equipos, asesoría, capacitación o soporte técnico desde marketplace." },
      { n: "03", t: "Construyes reputación", d: "Las calificaciones de servicio y experiencia ayudan a que tu cafetería gane visibilidad dentro de la Red." },
    ],
    cierre: "Una cafetería conectada compra mejor, comunica mejor el origen y acerca el café ecuatoriano al consumidor final.",
  },
  barista: {
    titulo: "Aprende, participa y conecta con oportunidades",
    texto: "Tu cuenta prioriza academia, recetas, comunidad, cafeterías vinculadas y servicios que fortalecen tu trabajo en barra.",
    pasos: [
      { n: "01", t: "Accedes a formación", d: "La Academia y los contenidos de preparación quedan disponibles desde tu cuenta gratuita." },
      { n: "02", t: "Te conectas con la Red", d: "Puedes participar en comunidad, seguir cafeterías, conocer cafés de origen y abrir conversaciones relacionadas." },
      { n: "03", t: "Construyes perfil profesional", d: "Tu actividad, servicios y valoraciones ayudan a mostrar experiencia ante cafeterías y miembros." },
    ],
    cierre: "Cuando el barista comunica mejor el origen, el consumidor entiende mejor el valor del café ecuatoriano.",
  },
  certificador: {
    titulo: "Recibe solicitudes de verificación, catación e informes",
    texto: "Tu perfil permite ofrecer servicios técnicos, responder pedidos y dejar evidencia verificable para productores, compradores y Redcafe.",
    pasos: [
      { n: "01", t: "Publicas tus servicios", d: "Catación, verificación de finca, análisis de calidad o informes técnicos pueden estar disponibles en marketplace." },
      { n: "02", t: "Atiendes solicitudes", d: "Los miembros solicitan el servicio y tú puedes dar continuidad desde el panel." },
      { n: "03", t: "Respaldas decisiones", d: "Los informes y calificaciones ayudan a que la negociación no dependa solo de la palabra." },
    ],
    cierre: "La verificación independiente aumenta la confianza de compradores y mejora la reputación del origen.",
  },
  proveedor: {
    titulo: "Publica productos, insumos y soporte para la cadena",
    texto: "Tu cuenta está pensada para mostrar oferta, recibir solicitudes, cotizar y construir confianza con valoraciones de miembros.",
    pasos: [
      { n: "01", t: "Muestras lo que ofreces", d: "Equipos, insumos, mantenimiento, instalación o soporte pueden organizarse como publicaciones o servicios." },
      { n: "02", t: "Recibes pedidos", d: "Los miembros solicitan productos o servicios desde marketplace y el seguimiento queda en tu panel." },
      { n: "03", t: "Ganas reputación", d: "Las calificaciones permiten diferenciar proveedores confiables dentro de la Red." },
    ],
    cierre: "Un proveedor visible y evaluado ayuda a que la cadena trabaje con mejores herramientas y menos incertidumbre.",
  },
  transportista: {
    titulo: "Ofrece rutas y logística para mover café con control",
    texto: "Tu perfil conecta cobertura, disponibilidad, solicitudes de flete y seguimiento de servicios logísticos.",
    pasos: [
      { n: "01", t: "Publicas cobertura", d: "Indica zonas, rutas, tipo de carga y condiciones para que los miembros sepan cuándo solicitarte." },
      { n: "02", t: "Recibes fletes", d: "Productores, compradores, tostadores o cafeterías pueden pedir transporte desde marketplace o panel." },
      { n: "03", t: "Registras continuidad", d: "El historial de pedidos y valoraciones ayuda a construir confianza operativa." },
    ],
    cierre: "Una logística clara evita pérdidas, mejora tiempos y protege el valor del café durante la operación.",
  },
  pilador: {
    titulo: "Ofrece beneficiado y procesamiento con seguimiento",
    texto: "Tu cuenta permite publicar capacidad, recibir solicitudes de pilado o beneficiado y registrar datos del servicio.",
    pasos: [
      { n: "01", t: "Presentas tu capacidad", d: "Describe ubicación, proceso, volumen, disponibilidad y condiciones del servicio." },
      { n: "02", t: "Atiendes pedidos de miembros", d: "Los productores o comerciantes pueden solicitar procesamiento y revisar estado desde el panel." },
      { n: "03", t: "Aportas datos al lote", d: "Humedad, merma, rendimiento y observaciones pueden fortalecer la trazabilidad." },
    ],
    cierre: "Un buen procesamiento conserva calidad y permite que cada lote llegue mejor preparado al mercado.",
  },
  exportador: {
    titulo: "Encuentra lotes, documentación y servicios para exportar",
    texto: "Tu perfil se orienta a abastecimiento, trazabilidad, requisitos, verificación y coordinación de servicios especializados.",
    pasos: [
      { n: "01", t: "Buscas lotes con contexto", d: "Revisa origen, finca, proceso, calidad y disponibilidad antes de iniciar contacto." },
      { n: "02", t: "Solicitas documentación", d: "Expediente de trazabilidad, EUDR, catación o verificación pueden pedirse desde marketplace." },
      { n: "03", t: "Das seguimiento operativo", d: "Pedidos, servicios y conversaciones quedan organizados para reducir errores en la operación." },
    ],
    cierre: "Exportar con información clara protege al comprador y abre mejores puertas para el café ecuatoriano.",
  },
  amante: {
    titulo: "Descubre, aprende y compra café de origen",
    texto: "Tu cuenta te acerca a cafés ecuatorianos, recetas, academia, cafeterías y publicaciones abiertas de la Red.",
    pasos: [
      { n: "01", t: "Exploras cafés y contenidos", d: "Puedes conocer lotes, historias, recetas y perfiles de taza sin perderte entre datos técnicos innecesarios." },
      { n: "02", t: "Pides productos disponibles", d: "Cuando un café o servicio esté publicado, podrás solicitarlo y revisar continuidad en tu panel." },
      { n: "03", t: "Calificas tu experiencia", d: "Tus opiniones ayudan a visibilizar calidad, servicio y cafeterías que hacen bien su trabajo." },
    ],
    cierre: "El consumidor informado reconoce mejor el valor del origen y ayuda a sostener una cultura cafetera más fuerte.",
  },
  asesor: {
    titulo: "Ofrece asesoría y acompaña mejoras reales",
    texto: "Tu perfil permite publicar servicios, recibir solicitudes y construir reputación profesional dentro de la cadena cafetera.",
    pasos: [
      { n: "01", t: "Publicas tu especialidad", d: "Agronomía, calidad, procesos, finanzas, exportación o marca pueden mostrarse como servicios solicitables." },
      { n: "02", t: "Recibes solicitudes", d: "Los miembros piden asesoría cuando la necesitan y el seguimiento queda asociado a la cuenta." },
      { n: "03", t: "Demuestras resultados", d: "Las valoraciones y continuidad de casos ayudan a diferenciar servicios útiles de promesas generales." },
    ],
    cierre: "La asesoría correcta convierte información en mejoras concretas para fincas, negocios y servicios de la Red.",
  },
  admin: {
    titulo: "Administra la Red sin alterar la experiencia pública",
    texto: "El panel admin debe permitir configurar contenido, servicios, miembros y operaciones con control, versionado y auditoría.",
    pasos: [
      { n: "01", t: "Editas con control", d: "Los cambios sensibles deben pasar por borrador, previsualización y publicación." },
      { n: "02", t: "Das seguimiento operativo", d: "Usuarios, pedidos, servicios, marketplace y calificaciones requieren continuidad desde admin." },
      { n: "03", t: "Proteges la versión aprobada", d: "Toda mejora se compara contra la base V60/V74 para no romper diseño ni funcionalidad." },
    ],
    cierre: "La administración debe facilitar cambios de contenido y operación sin convertir cada ajuste en riesgo de producción.",
  },
};

export default function AfiliatePage() {
  // Si el visitante ya está autenticado, no debe aterrizar en el formulario de
  // registro: lo mandamos al panel, que es donde de verdad publica y edita.
  const [sesion, setSesion] = useState<ApiUser | null>(null);
  const [routerReady, setRouterReady] = useState(false);
  useEffect(() => {
    setSesion(getStoredSession());
    setRouterReady(true);
  }, []);
  useEffect(() => {
    if (!routerReady || !sesion) return;
    const rol = new URLSearchParams(window.location.search).get("rol");
    const destino = rol === "proveedor" ? "/panel?ver=publicar_servicio" : "/panel?ver=publicar";
    window.location.replace(destino);
  }, [sesion, routerReady]);
  if (sesion) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Ya eres parte de la Red</p>
        <h1 className="mt-2 font-titulo text-3xl font-bold text-cafe">Te llevamos a tu panel</h1>
        <p className="mt-3 text-pizarra/70">
          Detectamos que ya iniciaste sesión como <strong>{sesion.nombre}</strong>. Para publicar un lote o un servicio ve directamente al panel.
       </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/panel?ver=publicar" className="btn-primary">Ir a publicar un lote</a>
          <a href="/panel?ver=publicar_servicio" className="btn-ghost">Publicar un servicio</a>
       </div>
     </div>
    );
  }
  return <AfiliateForm />;
}

function Stepper({ paso }: { paso: number }) {
  return (
    <div>
      <ol className="flex items-center gap-2" aria-label="Progreso de afiliación">
        {PASOS.map((p, i) => {
          const idx = i + 1;
          const activo = idx === paso;
          const hecho = idx < paso;
          return (
            <li key={p} className="flex flex-1 items-center gap-2">
              {i > 0 && (
                <span className={`h-0.5 flex-1 rounded-full ${idx <= paso ? "bg-green-700" : "bg-border-soft"}`} aria-hidden="true"></span>
              )}
              <span
                aria-current={activo ? "step" : undefined}
                className={`inline-flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  activo
                    ? "bg-green-700 text-white"
                    : hecho
                      ? "bg-green-100 text-green-700"
                      : "border border-border-soft text-text-muted"
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                    activo ? "bg-white/25" : hecho ? "bg-green-700 text-white" : "bg-cream-200 text-text-muted"
                  }`}
                  aria-hidden="true"
                >
                  {hecho ? "✓" : idx}
                </span>
                <span className="hidden sm:inline">{p}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Paso {paso} de 3
      </p>
    </div>
  );
}

function AfiliateForm() {
	const [paso, setPaso] = useState<1 | 2 | 3>(1);
	const [roles, setRoles] = useState<Rol[]>(["productor"]);
	const [plan, setPlan] = useState<string>("cosecha");
	const { items: planes } = useContenido("planes", PLANES);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cedula, setCedula] = useState("");
  const [provincia, setProvincia] = useState("");
  // Público por defecto: el motivo de registrarse es que te encuentren. Quien
  // prefiera lo contrario lo cambia aquí mismo, no enterrado en ajustes.
  const [visibilidad, setVisibilidad] = useState<"publico" | "registrados">("publico");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaMarketing, setAceptaMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrada, setRegistrada] = useState(false);
  const [verMas, setVerMas] = useState(false);

  const rol = roles[0] ?? "productor";

  useEffect(() => {
    setPlan(PLAN_DEFAULT[rol]);
  }, [rol]);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("rol");
    if (r && ROLES.some((o) => o.r === r)) {
      setRoles([r as Rol]);
      setElegido(true);
      setPaso(2);
      const id = setTimeout(() => {
        document.getElementById("afiliar-form")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(id);
    }
  }, []);

const perfilActual = ROLES.find((o) => o.r === rol);
const perfilesActuales = roles.map((r) => ROLES.find((o) => o.r === r)).filter(Boolean) as typeof ROLES;
const guiaPerfil = GUIA_PERFIL[rol];
const introduccionPerfil = INTRODUCCION_PERFIL[rol];
	const planesRol = planes.filter((p) => p.perfil === rol);
	const planActual = planesRol.find((p) => p.id === plan);

  // «Productor» viene marcado por defecto. Si la primera elección es otro
  // perfil, lo sustituye en vez de sumarse: antes quien elegía Comprador quedaba
  // registrado como productor principal. Quien también produzca lo vuelve a marcar.
  const [elegido, setElegido] = useState(false);

  const toggleRol = (seleccionado: Rol) => {
    setError(null);
    const primera = !elegido;
    setElegido(true);
    setRoles((actuales) => {
      if (primera && seleccionado !== "productor" && actuales.length === 1 && actuales[0] === "productor") {
        return [seleccionado];
      }
      if (actuales.includes(seleccionado)) {
        if (actuales.length === 1) {
          setError("Debes seleccionar al menos un perfil.");
          return actuales;
        }
        return actuales.filter((r) => r !== seleccionado);
      }
      if (actuales.length >= 3) {
        setError("Puedes seleccionar máximo tres perfiles.");
        return actuales;
      }
      return [...actuales, seleccionado];
    });
  };

  const hacerPrincipal = (principal: Rol) => {
    setRoles((actuales) => [principal, ...actuales.filter((r) => r !== principal)]);
  };

  const siguiente = () => {
    setError(null);
    if (!nombre.trim() || !email.includes("@") || pass.length < 8) {
      setError("Completa nombre, correo y contraseña (mínimo 8 caracteres).");
      return;
    }
    if (!aceptaTerminos) {
      setError("Para crear tu cuenta debes aceptar los Términos, la Política de Privacidad y la Política de Uso de Datos.");
      return;
    }
    setPaso(3);
    const id = setTimeout(() => {
      document.getElementById("afiliar-form")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    void id;
  };

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() || !email.includes("@") || pass.length < 8) {
      setError("Completa nombre, correo y contraseña (mínimo 8 caracteres).");
      return;
    }
    if (!aceptaTerminos) {
      setError("Para crear tu cuenta debes aceptar los Términos, la Política de Privacidad y la Política de Uso de Datos.");
      return;
    }
    setLoading(true);
    const r = await api.register(
      nombre, email, pass, rol, plan, roles,
      { telefono, cedula, provincia, visibilidad },
      {
        terminos: aceptaTerminos,
        privacidad: aceptaTerminos,
        uso_datos: aceptaTerminos,
        marketing: aceptaMarketing,
      }
    );
    setLoading(false);
    if (!r.ok || !r.data) { setError(r.error || "Error"); return; }
    setStoredSession((r.data as { user: ApiUser }).user);
    setRegistrada(true);
    const id = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
    void id;
  };

  if (registrada) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Icono nombre="verificacion" className="mx-auto h-12 w-12 text-green-700" />
        <h1 className="mt-4 font-titulo text-4xl font-bold text-coffee-900 md:text-5xl">
          Ya formas parte de la Red
        </h1>
        <p className="mt-3 text-lg text-text-secondary">
          Tu información fue registrada correctamente.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
          Revisaremos tu registro y te escribiremos por WhatsApp para terminar de
          armar tu perfil.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/panel" className="btn-primary">
            Completar mi perfil
          </Link>
          <Link href="/" className="btn-ghost">
            Explorar Red Café
          </Link>
        </div>
        <SiguientePaso roles={roles} />
      </div>
    );
  }

  return (
    <div>
      <Portada />

      {/* WIZARD */}
      <div id="afiliar-form" className="mx-auto max-w-6xl px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Stepper paso={paso} />
        </div>

        {/* PASO 1 · PERFIL */}
        {paso === 1 && (
          <>
            <div className="mt-6 rounded-2xl border border-green-700/20 bg-green-100/25 p-4">
              <p className="font-titulo text-xl font-bold text-coffee-900">
                Elige tu actividad principal y, si aplica, hasta dos perfiles adicionales.
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                El perfil principal define la introducción, el plan sugerido y las funciones que verás primero en tu panel.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {perfilesActuales.map((p) => (
                  <span key={p.r} className="badge bg-white">{p.n}{p.r === rol ? " · principal" : ""}</span>
                ))}
              </div>
            </div>

            <div id="profile-selector" className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map((o) => {
                const activo = roles.includes(o.r);
                const principal = rol === o.r;
                return (
                  <div
                    key={o.r}
                    className={`rounded-xl border bg-white p-3 transition ${
                      principal ? "border-green-700 ring-2 ring-green-700/25" : activo ? "border-green-700/60 bg-green-100/25" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream-200 text-green-700" aria-hidden="true">
                        <Icono nombre={o.icono} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-snug text-coffee-900">{o.n}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{o.d}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRol(o.r)}
                        className={`min-h-10 flex-1 rounded-full px-3 py-2 text-xs font-semibold ${activo ? "bg-green-700 text-white" : "border border-border-soft text-coffee-700 hover:border-green-700"}`}
                      >
                        {activo ? "Activo" : "Elegir"}
                      </button>
                      {activo && (
                        <button
                          type="button"
                          onClick={() => hacerPrincipal(o.r)}
                          aria-pressed={principal}
                          className={`min-h-10 rounded-full border px-3 py-2 text-xs font-semibold ${principal ? "border-green-700 bg-green-100 text-green-700" : "border-border-soft text-coffee-700 hover:border-green-700"}`}
                        >
                          Principal
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Qué hace el perfil principal: debajo del selector, como conclusión de la elección. */}
            <div id="redcafe-afil-guia" className="redcafe-afil-guia" data-perfil={perfilActual?.n}>
              <p className="redcafe-afil-guia-rotulo">{perfilActual ? "Con el perfil de " + perfilActual.n : "Con este perfil"}</p>
              <p className="redcafe-afil-guia-titulo">{guiaPerfil.titulo}</p>
              <p className="redcafe-afil-guia-texto">{guiaPerfil.texto}</p>
              <div className="redcafe-afil-guia-chips">
                {guiaPerfil.funciones.map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>
            </div>
            {error && <p className="mt-4 rounded-xl bg-danger/10 p-3 text-center text-sm font-semibold text-danger">{error}</p>}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPaso(2);
                  const id = setTimeout(() => {
                    document.getElementById("afiliar-form")?.scrollIntoView({ behavior: "smooth" });
                  }, 50);
                  void id;
                }}
                className="btn-primary"
              >
                Continuar con {roles.length} perfil{roles.length === 1 ? "" : "es"}
              </button>
            </div>
          </>
        )}

        {/* PASO 2 · DATOS */}
        {paso === 2 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <form
              onSubmit={(e) => { e.preventDefault(); siguiente(); }}
              className="card p-6"
              noValidate
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <p className="font-titulo text-xl font-bold text-coffee-900">
                  Crea tu cuenta
                </p>
                <span className="badge badge-verde">{perfilActual?.n} principal</span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-green-700 underline">Inicia sesión</Link>.
              </p>

              <div className="mt-4 rounded-xl border border-green-700/20 bg-green-100/30 p-4">
                <p className="text-sm font-semibold text-coffee-900">{guiaPerfil.titulo}</p>
                <p className="mt-1 text-sm text-text-secondary">{guiaPerfil.texto}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {guiaPerfil.funciones.map((f) => (
                    <span key={f} className="rounded-full border border-green-700/20 bg-white px-2.5 py-1 text-xs font-semibold text-green-700">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="af-nombre" className="text-xs font-semibold text-coffee-700">Nombre completo</label>
                  <input
                    id="af-nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Nombre de ejemplo"
                    className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
                    required
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor="af-email" className="text-xs font-semibold text-coffee-700">Correo</label>
                  <input
                    id="af-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    inputMode="email"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label htmlFor="af-pass" className="text-xs font-semibold text-coffee-700">Contraseña</label>
                  <input
                    id="af-pass"
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="af-whatsapp" className="text-xs font-semibold text-coffee-700">WhatsApp</label>
                  <input
                    id="af-whatsapp"
                    type="tel"
                    inputMode="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej: 09X XXX XXXX"
                    className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label htmlFor="af-cedula" className="text-xs font-semibold text-coffee-700">Cédula o RUC</label>
                  <input
                    id="af-cedula"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej: documento o RUC"
                    inputMode="numeric"
                    autoComplete="off"
                    className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="af-provincia" className="text-xs font-semibold text-coffee-700">Provincia</label>
                  <select
                    id="af-provincia"
                    value={provincia}
                    onChange={(e) => setProvincia(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border-soft bg-surface px-3 py-2"
                  >
                    <option value="">Seleccionar provincia…</option>
                    {["Azuay","Bolívar","Cañar","Carchi","Chimborazo","Cotopaxi","El Oro","Esmeraldas","Galápagos","Guayas","Imbabura","Loja","Los Ríos","Manabí","Morona Santiago","Napo","Orellana","Pastaza","Pichincha","Santa Elena","Santo Domingo de los Tsáchilas","Sucumbíos","Tungurahua","Zamora Chinchipe"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-cream-200/70 p-3">
                <p className="text-xs font-semibold text-coffee-900">Después del registro</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Te escribiremos por WhatsApp para terminar de armar tu perfil: tu
                  actividad, tu zona y lo que ofreces o buscas en la Red.
                </p>
              </div>

              <fieldset className="mt-4 rounded-xl border border-cafe/15 bg-crema-oscuro p-4">
                <legend className="px-1 text-xs font-semibold text-cafe">Visibilidad del perfil</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                <label className={`flex items-start gap-2 rounded-lg border p-3 text-xs text-pizarra-suave ${visibilidad === "publico" ? "border-green-700 bg-green-100/35" : "border-cafe/10 bg-white"}`}>
                  <input
                    type="radio"
                    name="visibilidad"
                    className="mt-0.5"
                    checked={visibilidad === "publico"}
                    onChange={() => setVisibilidad("publico")}
                  />
                  <span>
                    <b className="text-cafe">Público.</b> Te pueden encontrar aunque aún no tengan cuenta.
                  </span>
                </label>
                <label className={`flex items-start gap-2 rounded-lg border p-3 text-xs text-pizarra-suave ${visibilidad === "registrados" ? "border-green-700 bg-green-100/35" : "border-cafe/10 bg-white"}`}>
                  <input
                    type="radio"
                    name="visibilidad"
                    className="mt-0.5"
                    checked={visibilidad === "registrados"}
                    onChange={() => setVisibilidad("registrados")}
                  />
                  <span>
                    <b className="text-cafe">Solo miembros.</b> Te ven únicamente usuarios registrados.
                  </span>
                </label>
                </div>
                <p className="mt-2 border-t border-cafe/10 pt-2 text-[11px] leading-relaxed text-pizarra-suave">
                  Nunca publicamos tu correo, teléfono ni cédula. Puedes cambiar esto desde tu panel.
                </p>
              </fieldset>

              <div className="mt-4 space-y-2 rounded-xl border border-border-soft bg-surface-soft p-4">
                <p className="text-xs font-semibold text-coffee-900">Aceptación legal</p>
                <label className="flex items-start gap-2 text-xs text-text-secondary">
                  <input type="checkbox" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} className="mt-0.5" required />
                  <span>
                    Acepto los{" "}
                    <Link href="/terminos-y-condiciones" target="_blank" className="font-semibold text-green-700 underline">Términos y Condiciones</Link>{" "}
                    , la{" "}
                    <Link href="/politica-de-privacidad" target="_blank" className="font-semibold text-green-700 underline">Política de Privacidad</Link>{" "}
                    y la{" "}
                    <Link href="/politica-de-uso-de-datos" target="_blank" className="font-semibold text-green-700 underline">Política de Uso de Datos</Link>{" "}
                    de Red Café Ecuador.
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-text-secondary">
                  <input type="checkbox" checked={aceptaMarketing} onChange={(e) => setAceptaMarketing(e.target.checked)} className="mt-0.5" />
                  <span>
                    (Opcional) Deseo recibir comunicaciones comerciales y novedades de la Red por correo.
                  </span>
                </label>
              </div>

              {error && <p className="mt-3 rounded-xl bg-danger/10 p-3 text-center text-sm font-semibold text-danger">{error}</p>}

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => setPaso(1)} className="btn-ghost">
                  ← Cambiar perfil
                </button>
                <button type="submit" className="btn-primary flex-1 sm:flex-none">
                  Revisar y listo →
                </button>
              </div>
            </form>

          </div>
        )}

        {/* PASO 3 · LISTO */}
        {paso === 3 && (
          <form onSubmit={registrar} className="mx-auto mt-8 max-w-2xl card p-6">
            <p className="font-titulo text-xl font-bold text-coffee-900">Listo para crear tu cuenta</p>
            <p className="mt-1 text-sm text-text-secondary">Revisa que tus datos estén correctos antes de enviar.</p>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border-soft bg-surface-soft p-3">
                <dt className="text-xs font-semibold uppercase tracking-widest text-text-muted">Perfiles</dt>
                <dd className="mt-0.5 font-semibold text-coffee-900">
                  {perfilesActuales.map((p) => p.n).join(" · ")}
                </dd>
              </div>
              <div className="rounded-xl border border-border-soft bg-surface-soft p-3">
                <dt className="text-xs font-semibold uppercase tracking-widest text-text-muted">Actividad</dt>
                <dd className="mt-0.5 font-semibold text-coffee-900">{planActual?.nombre ?? plan}</dd>
              </div>
              <div className="rounded-xl border border-border-soft bg-surface-soft p-3">
                <dt className="text-xs font-semibold uppercase tracking-widest text-text-muted">Nombre completo</dt>
                <dd className="mt-0.5 font-semibold text-coffee-900">{nombre || "—"}</dd>
              </div>
              <div className="rounded-xl border border-border-soft bg-surface-soft p-3">
                <dt className="text-xs font-semibold uppercase tracking-widest text-text-muted">Correo</dt>
                <dd className="mt-0.5 font-semibold text-coffee-900">{email || "—"}</dd>
              </div>
              <div className="rounded-xl border border-border-soft bg-surface-soft p-3">
                <dt className="text-xs font-semibold uppercase tracking-widest text-text-muted">WhatsApp</dt>
                <dd className="mt-0.5 font-semibold text-coffee-900">{telefono || "—"}</dd>
              </div>
              <div className="rounded-xl border border-border-soft bg-surface-soft p-3">
                <dt className="text-xs font-semibold uppercase tracking-widest text-text-muted">Provincia</dt>
                <dd className="mt-0.5 font-semibold text-coffee-900">{provincia || "—"}</dd>
              </div>
            </dl>

            <div className="rounded-xl bg-cream-200/70 p-3 text-xs text-text-secondary">
              Registro gratuito. Las herramientas básicas quedan incluidas en tu cuenta. La Red cobra solo por servicios a la carta:
              asesorías, capacitaciones y certificaciones. Sin comisiones por venta.
              Cancela cuando quieras.
            </div>

            {error && <p className="mt-3 rounded-xl bg-danger/10 p-3 text-center text-sm font-semibold text-danger">{error}</p>}

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => setPaso(2)} className="btn-ghost">← Atrás</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 sm:flex-none">
                {loading ? "Creando cuenta…" : "Crear mi cuenta"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Lo que se lee después de decidir: plegado tras un botón. */}
      <button
        type="button"
        id="redcafe-afil-vermas"
        className="redcafe-afil-vermas"
        aria-expanded={verMas}
        aria-controls="redcafe-afil-ventajas"
        onClick={() => setVerMas((v) => !v)}
      >
        {verMas ? "Ocultar" : "Ver qué incluye tu cuenta"}
      </button>
      {verMas && (
        <>
          <ul id="redcafe-afil-ventajas" className="redcafe-afil-ventajas">
            {VENTAJAS.map(([t, d]) => (
              <li key={t}>
                <strong>{t}</strong>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        <section className="border-b border-arena bg-crema py-6 md:py-16">
          <div className="mx-auto max-w-5xl px-4">
            <p className="rotulo text-filtrado-600">Qué ganas de verdad</p>
            <h2 className="mt-2 max-w-3xl font-titulo text-2xl font-bold leading-tight text-cafe md:text-3xl">
              {introduccionPerfil.titulo}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pizarra-suave md:mt-4 md:text-base">
              {introduccionPerfil.texto}
            </p>
  
            <ol className="mt-8 hidden gap-5 md:grid md:grid-cols-3 md:gap-6">
              {introduccionPerfil.pasos.map((p) => (
                <li key={p.n} className="border-l-2 border-latte pl-5">
                  <p className="dato text-filtrado-600">{p.n}</p>
                  <p className="mt-1.5 font-titulo text-lg font-bold text-cafe">{p.t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-pizarra-suave">{p.d}</p>
                </li>
              ))}
            </ol>
  
            <p className="mt-4 hidden max-w-3xl border-t border-cafe/10 pt-6 leading-relaxed text-pizarra-suave md:block">
              {introduccionPerfil.cierre}
            </p>
          </div>
        </section>
        </>
      )}

      <DatosReales />
    </div>
  );
}

/* ── Portada y datos de la Red ─────────────────────────────────────────
   Antes las pintaba la capa propia (redcafe-afiliate.js) encima de una
   portada de React que quedaba oculta. Orden pedido por el propietario:
   título, subtítulo, cómo funciona y, enseguida, los perfiles. Las ventajas
   van en el plegable «Ver qué incluye tu cuenta». */

const VENTAJAS: [string, string][] = [
  ["Gratis", "Crear cuenta y publicar no cuesta."],
  ["Sin comisión por el contacto", "Hablas y negocias directo con la otra parte."],
  ["Dos minutos", "Nombre, correo y contraseña."],
];

const COMO_FUNCIONA: [string, string, string][] = [
  ["1", "Eliges tu perfil", "Lo que haces con el café. Puedes marcar hasta tres."],
  ["2", "Creas tu cuenta", "Nombre, correo y contraseña. Dos minutos."],
  ["3", "Te encuentran y te escriben", "Tu ficha entra al directorio. Cuando publiques café o servicios, también salen en el marketplace y en el mapa."],
];

function Portada() {
  return (
    <section id="redcafe-afiliate-portada" className="redcafe-afil-hero">
      <div className="redcafe-afil-wrap">
        <p className="redcafe-afil-rotulo">Registro gratuito</p>
        <h1>Encuentra con quién hacer negocio en el café ecuatoriano.</h1>
        <p className="redcafe-afil-bajada">
          Produzcas, compres, tuestes, transportes o asesores: ficha pública, presencia en el mapa nacional cuando
          publiques café, y contacto directo sin comisión.
        </p>
        <ol className="redcafe-afil-pasos">
          {COMO_FUNCIONA.map(([n, t, d]) => (
            <li key={n}>
              <span className="redcafe-afil-num" aria-hidden="true">{n}</span>
              <strong>{t}</strong>
              <span className="redcafe-afil-paso-txt">{d}</span>
            </li>
          ))}
        </ol>
        <div className="redcafe-afil-acciones">
          <button
            type="button"
            className="redcafe-afil-cta"
            onClick={() => document.getElementById("profile-selector")?.scrollIntoView({ behavior: "smooth", block: "center" })}
          >
            Elegir mi perfil
          </button>
          <Link className="redcafe-afil-secundario" href="/login/">
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}

type LoteResumen = { provincia?: string; demo?: boolean; ejemplo?: boolean; oculto?: boolean };

/** Prueba social honesta: cuánto café hay publicado y desde dónde (sin lotes de muestra). */
function DatosReales() {
  const [texto, setTexto] = useState("");
  useEffect(() => {
    let vivo = true;
    const leer = (url: string) =>
      fetch(url, { credentials: "include", cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ ok: false }));
    Promise.all([leer("/api/lotes.php?action=list"), leer("/api/cursos.php?action=list")]).then(([rl, rc]) => {
      if (!vivo) return;
      const lotes = ((rl?.ok && rl.data?.lotes) || []).filter((l: LoteResumen) => l && !l.demo && !l.ejemplo && !l.oculto) as LoteResumen[];
      const cursos = (rc?.ok && rc.data?.cursos) || [];
      const nProv = new Set(lotes.map((l) => l.provincia).filter(Boolean)).size;
      const partes: string[] = [];
      if (lotes.length) partes.push(lotes.length + (lotes.length === 1 ? " lote publicado" : " lotes publicados"));
      if (nProv) partes.push(nProv + (nProv === 1 ? " provincia" : " provincias"));
      if (cursos.length) partes.push(cursos.length + (cursos.length === 1 ? " curso abierto" : " cursos abiertos"));
      setTexto(partes.length ? "Ahora mismo en la Red: " + partes.join(" · ") + "." : "");
    });
    return () => {
      vivo = false;
    };
  }, []);
  return (
    <p id="redcafe-afil-datos" className="redcafe-afil-datos">
      {texto}
    </p>
  );
}

/* Tras crear la cuenta: la acción que hace que la Red te encuentre, según el perfil. */
function SiguientePaso({ roles }: { roles: Rol[] }) {
  const tiene = (lista: Rol[]) => roles.some((r) => lista.includes(r));
  const vende = tiene(["productor", "vendedor", "exportador", "pilador"]);
  const compra = tiene(["comprador", "bar", "barista", "amante"]);
  const tarjetas: { principal: boolean; rotulo: string; titulo: string; desc: string; href: string; boton: string }[] = [];
  if (vende)
    tarjetas.push({ principal: true, rotulo: "Vender café", titulo: "Publica tu primer lote de café", desc: "En cereza, pergamino, oro o tostado. Los compradores de la Red lo ven en el Marketplace y te escriben.", href: "/panel/?ver=publicar", boton: "Publicar lote de café" });
  if (compra)
    tarjetas.push({ principal: !vende, rotulo: "Comprar café", titulo: "Publica qué café buscas", desc: "Variedad, cantidad y precio: los productores te ofrecen sus lotes.", href: "/panel/#redcafe-requerimientos-panel", boton: "Publicar lo que busco" });
  if (!vende && !compra)
    tarjetas.push({ principal: true, rotulo: "Ofrecer servicios", titulo: "Publica tu servicio", desc: "Catación, pilado, transporte, asesoría o insumos: que productores y compradores te contraten.", href: "/panel/?ver=publicar_servicio", boton: "Publicar mi servicio" });
  tarjetas.push({ principal: false, rotulo: "Explorar", titulo: "Mira el café disponible", desc: "Lotes reales por origen, proceso y variedad.", href: "/marketplace/", boton: "Ver lotes de café" });
  return (
    <section id="redcafe-siguiente-paso" className="redcafe-siguiente-paso" aria-label="Tu siguiente paso">
      <p className="redcafe-siguiente-rotulo">Tu siguiente paso: que la Red te encuentre</p>
      <div className="redcafe-panel-next-actions">
        {tarjetas.map((c) => (
          <article key={c.titulo} className={"redcafe-panel-next-card" + (c.principal ? " is-primary" : "")}>
            <p>{c.rotulo}</p>
            <h4>{c.titulo}</h4>
            <span>{c.desc}</span>
            <a href={c.href}>{c.boton}</a>
          </article>
        ))}
      </div>
    </section>
  );
}
