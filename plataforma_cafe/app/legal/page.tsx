import type { ReactNode } from "react";
import { CONFIG } from "@/lib/config";

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
 return (
 <section id={titulo.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-24">
 <h2 className="mt-10 font-titulo text-2xl font-bold text-cafe">{titulo}</h2>
 <div className="mt-3 space-y-4 text-sm leading-relaxed text-pizarra/85">{children}</div>
 </section>
 );
}

function P({ children }: { children: ReactNode }) {
 return <p>{children}</p>;
}

function Lista({ items }: { items: ReactNode[] }) {
 return (
 <ul className="ml-5 list-disc space-y-1">
 {items.map((i, k) => (
 <li key={k}>{i}</li>
 ))}
 </ul>
 );
}

export const metadata = {
 title: "Información legal — Red Café Ecuador",
};

export default function LegalPage() {
 return (
 <div className="mx-auto max-w-[65ch] px-4 py-10 legal-text">
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Información legal</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">
 Política de privacidad, términos y políticas de la Red
 </h1>
 <p className="mt-2 text-pizarra/80">
 Estos documentos rigen el uso de la plataforma y el tratamiento de tus datos.
 Última actualización: 14 de agosto de 2026.
 </p>
 <div className="mt-6 rounded-lg border border-cafe/10 bg-white/70 p-4 text-sm leading-relaxed text-pizarra/75">
 <p className="font-semibold text-cafe">Estado de la plataforma · actualizado el 18 de agosto de 2026</p>
 <p className="mt-2">
 Red Café Ecuador está en fase de lanzamiento y algunas funciones descritas en este
 documento todavía no están operativas:
 </p>
 <ul className="mt-2 ml-5 list-disc space-y-1">
 <li>Escrow (pago retenido hasta confirmar la entrega): en preparación. Hoy el comprador y el vendedor acuerdan el pago directamente entre ellos; la Red no interviene en el cobro ni retiene fondos.</li>
 <li>Facturación electrónica desde la plataforma: en preparación.</li>
 <li>Cuotas de membresía: el registro y la permanencia son gratuitos. Las cláusulas sobre cuota mensual e impago no se aplican mientras los planes sean gratuitos.</li>
 </ul>
 <p className="mt-2">
 Cada cláusula entrará en vigor cuando la función correspondiente se active y se anuncie a
 los miembros.
 </p>
 </div>

 <nav className="mt-6 flex flex-wrap gap-2 text-sm">
 {[
 ["privacidad", "Privacidad"],
 ["cookies", "Cookies"],
 ["terminos-y-condiciones", "Términos"],
 ["membresia", "Membresía"],
 ["escrow", "Escrow y conflictos"],
 ["retencion-de-datos", "Retención de datos"],
 ["contacto", "Contacto"],
 ["propiedad", "Propiedad y uso"],
 ].map(([id, l]) => (
 <a
 key={id}
 href={id === "propiedad" ? "/propiedad-y-uso" : `#${id}`}
 className="rounded-full border border-cafe/20 px-4 py-1.5 font-semibold text-cafe hover:bg-cafe hover:text-crema"
 >
 {l}
 </a>
 ))}
 </nav>

 <Bloque titulo="Privacidad">
 <P>
 <strong>Responsable del tratamiento:</strong> Red Café Ecuador, con
 domicilio en Quito, Ecuador. Contacto: {CONFIG.email}.
 </P>
 <P>Recopilamos y tratamos tus datos personales solo para las finalidades de la membresía:</P>
 <Lista
 items={[
 <>Identificación y contacto (nombre, cédula/RUC, correo, teléfono) para registrar tu cuenta y notificarte.</>,
 <>Geolocalización de tu finca (GPS) para la trazabilidad de tu café y el cumplimiento EUDR.</>,
 <>Datos de tu negocio y lotes (provincia, variedad, proceso, fotos) para operar el marketplace.</>,
 <>Datos de uso (páginas, progreso de cursos, pedidos) para mejorar el servicio.</>,
 ]}
 />
 <P>
 <strong>Bases de legitimación:</strong> tu consentimiento, la ejecución del contrato de
 membresía y el cumplimiento de obligaciones legales. No vendemos tus datos.
 </P>
 <P>
 <strong>Tus derechos (ARCO+):</strong> puedes ejercer acceso, rectificación, actualización,
 supresión, oposición, portabilidad y revocación del consentimiento escribiéndonos a{" "}
 {CONFIG.email}. Respondemos en un máximo de 15 días hábiles.
 </P>
 <P>
 <strong>Seguridad:</strong> usamos cifrado en tránsito (HTTPS), control de accesos y
 conservamos los datos solo el tiempo necesario para las finalidades descritas.
 Este tratamiento se realiza conforme a la Ley Orgánica de Protección de Datos
 Personales de Ecuador (LOPDP).
 </P>
 </Bloque>

 <Bloque titulo="Cookies">
 <P>
 Esta plataforma utiliza cookies de sesión y almacenamiento local (localStorage)
 para funcionar correctamente. A continuación detallamos qué datos se almacenan
 y para qué fines:
 </P>
 <P><strong>Cookies de sesión (PHP):</strong></P>
 <Lista
 items={[
 <>Propósito: mantener tu sesión autenticada al navegar entre páginas.</>,
 <>Duración: 7 días.</>,
 <>Datos: identificador de sesión cifrado (no contiene información personal directa).</>,
 <>Seguridad: <code>HttpOnly</code>, <code>Secure</code>, <code>SameSite=Lax</code>.</>,
 ]}
 />
 <P><strong>Almacenamiento local (localStorage) en tu navegador:</strong></P>
 <Lista
 items={[
 <>Sesión de usuario (nombre, email, rol, plan) — para evitar consultas innecesarias al servidor.</>,
 <>Datos de cuadernos de campo (producción, ventas, costos, siembras, turnos) — se guardan exclusivamente en tu navegador, no se transmiten al servidor.</>,
 <>Favoritos de proveedores — lista de fincas guardadas.</>,
 <>Progreso de cursos de la Academia.</>,
 ]}
 />
 <P>
 <strong>Control:</strong> puedes borrar los datos de localStorage en cualquier momento
 desde la configuración de tu navegador. Al cerrar sesión, se elimina la sesión del
 servidor pero los datos de localStorage persisten hasta que los borres manualmente.
 </P>
 <P>
 No utilizamos cookies de rastreo, publicidad o análisis de terceros.
 </P>
 </Bloque>

 <Bloque titulo="Términos y Condiciones">
 <P>
 <strong>Naturaleza del servicio:</strong> Red Café Ecuador es una plataforma de afiliación
 que conecta productores, vendedores y compradores de café ecuatoriano. Actúa como
 intermediaria de conexión y sello de confianza, no como compradora ni vendedora.
 </P>
 <P>
 <strong>Elegibilidad:</strong> ser mayor de 18 años o una persona jurídica válidamente
 representada, con los datos de negocio requeridos según el perfil.
 </P>
 <P>
 <strong>Marketplace:</strong> los lotes publicados deben reflejar datos reales (variedad,
 proceso, score, cantidad, trazabilidad GPS). El pago de cada pedido se rige por la política
 de escrow.
 </P>
 <P>
 <strong>Academia:</strong> los certificados acreditan participación en el curso; no son
 títulos profesionales ni certificación oficial de calidad.
 </P>
 <P>
 <strong>Honestidad y conducta:</strong> queda prohibido publicar información falsa,
 suplantar identidades, manipular precios o scores o defraudar el escrow. Infracciones pueden
 llevar a la suspensión de la cuenta.
 </P>
 <P>
 <strong>Responsabilidad:</strong> la Red no garantiza la exactitud de los datos declarados
 por terceros ni el desempeño comercial. Su responsabilidad se limita al importe pagado por el servicio concreto en los tres meses anteriores, salvo dolo o culpa grave. Ley aplicable: República del Ecuador.
 </P>
 </Bloque>

 <Bloque titulo="Membresía y costos">
        <P>
          Crear y mantener tu perfil en Red Café Ecuador es gratuito. El registro es
          gratuito, y quien se afilie antes de esa
          fecha conserva esas condiciones de acceso gratuito.
        </P>
        <Lista
          items={[
            <>Hoy no existe ninguna membresía de pago ni cobro recurrente.</>,
            <>Algunos servicios especializados tienen costo, informado antes de contratarlos.</>,
            <>Si en el futuro se establece un cobro, se comunicará con antelación y no se aplicará de forma retroactiva ni automática.</>,
            <>Puedes cerrar tu cuenta en cualquier momento desde tu panel.</>,
          ]}
        />
      </Bloque>

 <Bloque titulo="Escrow y conflictos">
<P>
  <strong>Hoy:</strong> el comprador y el vendedor acuerdan el pago directamente entre ellos; la Red
  no interviene en el cobro ni retiene fondos. Cuando el escrow esté disponible (en preparación),
  se aplicará esta política.
  </P>
 <Lista
 items={[
 <>Plazo de conformidad: 5 días calendario tras la entrega.</>,
 <>Disputa: el comprador presenta evidencia (fotos, guías, mensajes); la Red evalúa y resuelve en hasta 5 días hábiles.</>,
 <>Causales de devolución: lote distinto al publicado, daño físico crítico, catación muy distinta a la declarada o falta de documentación.</>,
 <>Los fondos retenidos (cuando el escrow esté activo) no se mezclan con ingresos de la Red ni se usan para gastos propios.</>,
 ]}
 />
 </Bloque>

 <Bloque titulo="Retención de datos">
 <P>
 Conservamos tus datos personales durante el tiempo que tu membresía esté activa
 y por un periodo adicional de 2 años después de su cancelación, para:
 </P>
 <Lista
 items={[
 <>Resolver disputas pendientes o reclamos legales.</>,
 <>Cumplir obligaciones contables y tributarias.</>,
 <>Mantener la trazabilidad de pedidos completados.</>,
 ]}
 />
 <P>
 Los datos de cuadernos de campo (producción, ventas, costos, siembras, turnos)
 se almacenan exclusivamente en tu navegador y no se transmiten al servidor.
 Si borras los datos de tu navegador, se pierden permanentemente.
 </P>
 <P>
 Los datos de la comunidad (publicaciones, comentarios) se conservan mientras
 la cuenta esté activa. Al eliminar tu cuenta, tus publicaciones permanecen
 anonymizadas (sin vinculación a tu identidad).
 </P>
 <P>
 Puedes solicitar la eliminación completa de tus datos personales escribiéndonos
 a {CONFIG.email}. Procesaremos la solicitud en un máximo de 15 días hábiles.
 </P>
 </Bloque>

 <Bloque titulo="Contacto para derechos y notificaciones">
 <P>
 Para ejercer tus derechos de protección de datos, presentar un reclamo o recibir
 notificaciones legales, escríbenos a{" "}
 <a href={`mailto:${CONFIG.email}`} className="font-semibold text-cereza underline">
 {CONFIG.email}
 </a>.
 </P>
 </Bloque>
 </div>
 );
}
