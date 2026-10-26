import type { ReactNode } from "react";
import Link from "next/link";
import { CONFIG } from "@/lib/config";

export const metadata = {
 title: "Política de Uso de Datos — Red Café Ecuador",
 description: "Reglas específicas sobre el uso, tratamiento y cesión de datos personales en Red Café Ecuador.",
};

export default function UsoDeDatosPage() {
 return (
 <Layout titulo="Política de Uso de Datos" resumen="Reglas específicas sobre cómo usamos, compartimos y protegemos tus datos personales.">
 <Section titulo="1. Compromiso">
 <p>
 En Red Café Ecuador tratamos los datos personales con estricto apego
 a la <strong>Ley Orgánica de Protección de Datos Personales del Ecuador (LOPDP)</strong>,
 su Reglamento y las buenas prácticas internacionales.
 </p>
 </Section>

 <Section titulo="2. Principios que aplicamos">
 <ul>
 <li><strong>Licitud:</strong> tratamos datos solo cuando tenemos base legal válida.</li>
 <li><strong>Finalidad:</strong> usamos los datos solo para los fines declarados y consentidos.</li>
 <li><strong>Necesidad:</strong> solicitamos solo los datos estrictamente necesarios.</li>
 <li><strong>Proporcionalidad:</strong> no tratamos datos excesivos o irrelevantes.</li>
 <li><strong>Veracidad:</strong> promovemos que los datos registrados sean exactos y actualizados.</li>
 <li><strong>Transparencia:</strong> informamos claramente qué hacemos con tus datos.</li>
 <li><strong>Confidencialidad:</strong> solo personal autorizado accede a los datos.</li>
 </ul>
 </Section>

 <Section titulo="3. Datos sensibles">
 <p>
 No solicitamos datos sensibles (origen étnico, religión, salud, orientación
 sexual, ideología política, datos biométricos) salvo cuando sea
 estrictamente necesario y con tu consentimiento expreso.
 </p>
 <p>
 La <strong>geolocalización de tu finca</strong> es necesaria para la
 trazabilidad EUDR y se almacena solo si la registras voluntariamente
 al publicar un lote.
 </p>
 </Section>

 <Section titulo="4. Decisiones automatizadas">
 <p>
 La plataforma no toma decisiones automatizadas que produzcan efectos
 jurídicos sobre ti (como denegar un servicio basado exclusivamente en
 un algoritmo). El perfil de "verificado" lo otorga el equipo de la Red
 tras revisión manual.
 </p>
 </Section>

 <Section titulo="5. Uso de herramientas de inteligencia artificial">
 <p>El equipo que opera Red Café Ecuador usa herramientas de inteligencia artificial (asistentes de código y de contenido de terceros) como apoyo para mantener la plataforma: redactar o revisar contenido educativo, dar soporte técnico, y programar y corregir funciones del sitio. Cuando ese trabajo requiere consultar datos reales de la plataforma, se hace bajo el control y la autorización del equipo, nunca de forma autónoma ni para fines distintos a operar el servicio.</p>
 <p>Estas herramientas de IA se tratan como un encargado del tratamiento más (ver sección siguiente): no venden ni ceden tus datos a terceros, y no se usan hoy para tomar decisiones automatizadas sobre tu cuenta (ver sección 4). Si en el futuro se incorpora una función de IA que interactúe directamente contigo (por ejemplo, un asistente o recomendador visible en la plataforma), lo anunciaremos y actualizaremos esta política antes de activarla.</p>
 </Section>

 <Section titulo="6. Cesión y encargados del tratamiento">
 <p>
 Para operar el servicio compartimos datos estrictamente necesarios
 con los siguientes <strong>encargados del tratamiento</strong>:
 </p>
 <ul>
 <li><strong>Proveedor de hosting:</strong> almacenamiento de la base de datos y archivos.</li>
 <li><strong>Pasarela de pago:</strong> procesamiento de pagos de membresía (no almacenamos datos de tarjeta).</li>
 <li><strong>Servicio de correo:</strong> envío de notificaciones transaccionales.</li>
 <li><strong>Herramientas de inteligencia artificial:</strong> asistentes de código y de contenido usados por el equipo para mantener y dar soporte a la plataforma (ver sección anterior).</li>
 </ul>
 <p>
 Todos los encargados firman acuerdos de confidencialidad y cumplen
 con estándares equivalentes a los nuestros.
 </p>
 </Section>

 <Section titulo="7. Datos compartidos entre miembros">
 <p>Además de los encargados del tratamiento, algunos de tus datos se muestran a otros miembros de la Red cuando es necesario para prestar el servicio que pediste. Esto no es una cesión a terceros externos: ocurre dentro de la plataforma, entre personas que ya están interactuando entre sí, y solo con el alcance necesario:</p>
 <ul>
 <li><strong>Marketplace:</strong> al publicar un lote o contactar a un vendedor, tu nombre y tus datos de contacto quedan visibles para la otra parte de la operación.</li>
 <li><strong>Servicios:</strong> al contratar o publicar un servicio, tus datos de contacto se comparten con la contraparte para poder coordinar y prestar el servicio.</li>
 <li><strong>Academia:</strong> al matricularte en un curso, quien lo creó ve tu nombre, tu avance y tus datos de contacto, únicamente mientras estés matriculado y para gestionar tu participación en ese curso. Si quien creó el curso se asocia con otros miembros para dictarlo (por ejemplo, un cocreador o coautor), esos mismos datos de matrícula también quedan visibles para las personas asociadas al curso, con el mismo alcance y la misma finalidad. Esto se te avisa también en el momento de matricularte.</li>
 <li><strong>Chat y comunidad:</strong> los mensajes que envías a otro miembro son visibles para esa persona; las publicaciones en Comunidad son visibles para el resto de la Red.</li>
 </ul>
 <p>Algunos de estos datos (como el teléfono) solo se muestran si tu configuración de contacto lo permite. Puedes reportar un contacto sospechoso o un uso indebido de tus datos desde la opción de reportes de la plataforma.</p>
 </Section>

 <Section titulo="8. Transferencias internacionales">
 <p>
 Por defecto, los datos se almacenan en <strong>Ecuador</strong>. Si en
 el futuro necesitamos transferir datos fuera del país (por ejemplo, a
 un proveedor en la nube internacional), te informaremos previamente y
 solicitaremos tu consentimiento, salvo que exista excepción legal.
 </p>
 </Section>

 <Section titulo="9. Plazo de conservación">
 <table>
 <thead>
 <tr className="border-b border-cafe/20 text-left">
 <th className="py-2">Tipo de dato</th>
 <th className="py-2">Plazo</th>
 </tr>
 </thead>
 <tbody className="text-xs">
 <tr className="border-b border-cafe/10"><td className="py-2">Datos de cuenta activa</td><td className="py-2">Mientras la membresía esté activa</td></tr>
 <tr className="border-b border-cafe/10"><td className="py-2">Datos tras cancelar membresía</td><td className="py-2">2 años adicionales</td></tr>
 <tr className="border-b border-cafe/10"><td className="py-2">Registros contables de pedidos</td><td className="py-2">7 años (obligación tributaria)</td></tr>
 <tr className="border-b border-cafe/10"><td className="py-2">Bitácoras locales (tu navegador)</td><td className="py-2">Hasta que las borres</td></tr>
 <tr><td className="py-2">Comunicaciones de chat</td><td className="py-2">Mientras la cuenta esté activa + 1 año</td></tr>
 </tbody>
 </table>
 </Section>

 <Section titulo="10. Medidas de seguridad">
 <ul>
 <li>Cifrado TLS en tránsito.</li>
 <li>Hash bcrypt para contraseñas (no se almacenan en texto plano).</li>
 <li>Cookies de sesión con flags <code>HttpOnly</code>, <code>Secure</code>, <code>SameSite=Lax</code>.</li>
 <li>Rate limiting en login y endpoints sensibles.</li>
 <li>Validación de autorización en cada operación (no solo autenticación).</li>
 <li>Cabeceras de seguridad HTTP (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).</li>
 <li>Bloqueo de acceso directo a archivos JSON de datos vía .htaccess.</li>
 </ul>
 </Section>

 <Section titulo="11. Incidentes de seguridad">
 <p>
 En caso de incidente que afecte tus datos personales, te notificaremos
 en un plazo máximo de <strong>72 horas</strong> desde que tengamos
 conocimiento, junto con las medidas adoptadas. También notificaremos
 a la Autoridad de Protección de Datos Personales cuando corresponda.
 </p>
 </Section>

 <Section titulo="12. Menores de edad">
 <p>
 La plataforma no está dirigida a menores de 18 años. Si detectamos
 datos de un menor sin autorización parental, los eliminaremos de
 inmediato.
 </p>
 </Section>

 <Section titulo="13. Ejercicio de derechos">
 <p>
 Para acceder, rectificar, suprimir, oponer, portar o revocar tu
 consentimiento, escríbenos a{" "}
 <a href={`mailto:${CONFIG.email}`} className="text-cereza underline">{CONFIG.email}</a>.
 Responderemos en <strong>máximo 15 días hábiles</strong>.
 </p>
 </Section>

 <Section titulo="14. Autoridad de control">
 <p>
 Si consideras que no hemos atendido adecuadamente tus derechos,
 puedes reclamar ante la{" "}
 <strong>Autoridad de Protección de Datos Personales del Ecuador</strong>.
 </p>
 </Section>

 <div className="mt-8">
 <Link href="/legal" className="text-sm text-cereza underline">← Volver al centro legal</Link>
 </div>
 </Layout>
 );
}

function Layout({ titulo, resumen, children }: { titulo: string; resumen: string; children: ReactNode }) {
 return (
 <div className="mx-auto max-w-[65ch] px-4 py-10 legal-text">
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Documento legal</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">{titulo}</h1>
 <p className="mt-2 text-pizarra/80">{resumen}</p>
 <p className="mt-1 text-xs text-pizarra/50">Última actualización: 26 de septiembre de 2026.</p>
 <div className="mt-6 space-y-8 text-sm leading-relaxed text-pizarra/85">{children}</div>
 </div>
 );
}

function Section({ titulo, children }: { titulo: string; children: ReactNode }) {
 return (
 <section>
 <h2 className="font-titulo text-xl font-bold text-cafe">{titulo}</h2>
 <div className="mt-2 space-y-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_code]:rounded [&_code]:bg-crema [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_table]:w-full [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-cafe">{children}</div>
 </section>
 );
}
