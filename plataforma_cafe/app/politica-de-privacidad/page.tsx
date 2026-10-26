import type { ReactNode } from "react";
import Link from "next/link";
import { CONFIG } from "@/lib/config";

export const metadata = {
 title: "Política de Privacidad — Red Café Ecuador",
 description: "Cómo Red Café Ecuador trata tus datos personales conforme a la LOPDP de Ecuador.",
};

export default function PrivacidadPage() {
 return (
 <PoliticaLayout titulo="Política de Privacidad" resumen="Cómo recopilamos, usamos y protegemos tus datos personales.">
 <Section titulo="1. Responsable del tratamiento">
 <p>
 <strong>Red Café Ecuador</strong>, con domicilio en Quito, Ecuador.
 Contacto: <a href={`mailto:${CONFIG.email}`} className="text-cereza underline">{CONFIG.email}</a>.
 </p>
 </Section>

 <Section titulo="2. Datos que recopilamos">
 <ul>
 <li><strong>Identificación y contacto:</strong> nombre, cédula/RUC, correo, teléfono.</li>
 <li><strong>Geolocalización:</strong> GPS de tu finca para trazabilidad EUDR.</li>
 <li><strong>Datos del negocio:</strong> provincia, variedad, proceso, fotos de lotes.</li>
 <li><strong>Bitácoras de operación:</strong> producción, ventas, costos, siembras (almacenadas en tu navegador).</li>
 <li><strong>Datos de uso:</strong> páginas visitadas, progreso de cursos, pedidos realizados.</li>
 <li><strong>Comunicaciones:</strong> mensajes enviados por chat a otros miembros.</li>
 </ul>
 </Section>

 <Section titulo="3. Finalidades de uso">
 <ul>
 <li>Gestionar tu membresía y acceso a la plataforma.</li>
 <li>Operar el marketplace de café (publicación de lotes, pedidos, escrow).</li>
 <li>Generar dossiers de trazabilidad EUDR.</li>
 <li>Mostrar tu perfil público a otros miembros verificados.</li>
 <li>Mejorar el servicio y desarrollar nuevas funcionalidades.</li>
 <li>Cumplir obligaciones legales y contables.</li>
 </ul>
 </Section>

 <Section titulo="4. Bases de legitimación">
 <p>Tus datos se tratan bajo las siguientes bases legales:</p>
 <ul>
 <li>Tu <strong>consentimiento</strong> explícito al aceptar esta política.</li>
 <li>La <strong>ejecución del contrato</strong> de membresía.</li>
 <li>El cumplimiento de <strong>obligaciones legales</strong>.</li>
 </ul>
 </Section>

 <Section titulo="5. Conservación de los datos">
 <p>
 Conservamos tus datos durante la vigencia de tu membresía y por
 <strong> 2 años adicionales</strong> tras su cancelación, para atender
 disputas, cumplir obligaciones contables y mantener trazabilidad de
 pedidos completados.
 </p>
 <p>
 Los datos de bitácoras (producción, ventas, costos) viven exclusivamente
 en tu navegador. Si los borras, se pierden permanentemente y la Red no
 puede recuperarlos.
 </p>
 </Section>

 <Section titulo="6. Tus derechos (ARCO+)">
 <p>Conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP), tienes derecho a:</p>
 <ul>
 <li><strong>Acceso:</strong> conocer qué datos tenemos sobre ti.</li>
 <li><strong>Rectificación:</strong> corregir datos inexactos.</li>
 <li><strong>Actualización:</strong> modificar datos desactualizados.</li>
 <li><strong>Supresión:</strong> solicitar la eliminación de tus datos.</li>
 <li><strong>Oposición:</strong> oponerte a ciertos tratamientos.</li>
 <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
 <li><strong>Revocación del consentimiento:</strong> retirar tu aceptación en cualquier momento.</li>
 </ul>
 <p>
 Para ejercer cualquiera de estos derechos, escríbenos a{" "}
 <a href={`mailto:${CONFIG.email}`} className="text-cereza underline">{CONFIG.email}</a>.
 <strong> Respondemos en un máximo de 15 días hábiles.</strong>
 </p>
 </Section>

 <Section titulo="7. Seguridad">
 <p>Implementamos medidas técnicas y organizativas para proteger tus datos:</p>
 <ul>
 <li>Cifrado en tránsito (HTTPS/TLS).</li>
 <li>Contraseñas almacenadas con hash bcrypt.</li>
 <li>Cookies de sesión con flags <code>HttpOnly</code>, <code>Secure</code>, <code>SameSite=Lax</code>.</li>
 <li>Control de acceso por roles y autorización en cada operación.</li>
 <li>Rate limiting en login y endpoints sensibles.</li>
 </ul>
 </Section>

 <Section titulo="8. Cesión a terceros">
 <p>
 <strong>No vendemos ni cedemos tus datos a terceros con fines comerciales.</strong>
 Solo compartimos datos cuando es estrictamente necesario para operar el
 servicio (proveedor de hosting, pasarela de pago) o cuando la ley lo
 exige.
 </p>
 </Section>

 <Section titulo="9. Transferencias internacionales">
 <p>
						Red Café Ecuador funciona sobre la infraestructura de su proveedor de
						alojamiento, cuyos servidores están ubicados en los Estados Unidos de
						América. Esto significa que tus datos personales salen del Ecuador: es
						una transferencia internacional y queremos que lo sepas sin buscarlo.
						La transferencia es necesaria para prestarte el servicio, se ampara en
						el contrato con dicho proveedor y se rige por la Ley Orgánica de
						Protección de Datos Personales. Si en el futuro cambiamos de proveedor
						o de país, actualizaremos esta política y te lo notificaremos antes.
 </p>
 </Section>

 <Section titulo="10. Cambios a esta política">
 <p>
 Podemos actualizar esta política. Te notificaremos por correo y dentro
 de la plataforma antes de que los cambios entren en vigencia. El uso
 continuado del servicio después de la notificación constituye tu
 aceptación.
 </p>
 </Section>

 <Section titulo="11. Autoridad de control">
 <p>
 Si consideras que tus derechos no han sido atendidos, puedes presentar
 una denuncia ante la <strong>Autoridad de Protección de Datos Personales</strong> del Ecuador.
 </p>
 </Section>

 <Section titulo="12. Contacto">
 <p>
 Para cualquier consulta sobre privacidad y datos personales:{" "}
 <a href={`mailto:${CONFIG.email}`} className="text-cereza underline">{CONFIG.email}</a>.
 </p>
 <p className="mt-4">
 <Link href="/legal" className="text-sm text-cereza underline">← Volver al centro legal</Link>
 </p>
 </Section>
 </PoliticaLayout>
 );
}

function PoliticaLayout({ titulo, resumen, children }: { titulo: string; resumen: string; children: ReactNode }) {
 return (
 <div className="mx-auto max-w-[65ch] px-4 py-10 legal-text">
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Documento legal</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">{titulo}</h1>
 <p className="mt-2 text-pizarra/80">{resumen}</p>
 <p className="mt-1 text-xs text-pizarra/50">Última actualización: 14 de agosto de 2026.</p>
 <div className="mt-6 space-y-8 text-sm leading-relaxed text-pizarra/85">{children}</div>
 </div>
 );
}

function Section({ titulo, children }: { titulo: string; children: ReactNode }) {
 return (
 <section>
 <h2 className="font-titulo text-xl font-bold text-cafe">{titulo}</h2>
 <div className="mt-2 space-y-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_code]:rounded [&_code]:bg-crema [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs">{children}</div>
 </section>
 );
}
