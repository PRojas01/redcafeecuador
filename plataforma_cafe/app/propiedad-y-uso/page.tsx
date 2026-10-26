import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
 title: "Propiedad y uso — Red Café Ecuador",
 description: "Documento de firma de propiedad intelectual, marca, datos y licencia de uso.",
};

export default function PropiedadYUsoPage() {
 return (
 <div className="mx-auto max-w-[65ch] px-4 py-10 legal-text">
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Documento legal</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">Firma de Propiedad y Uso</h1>
 <p className="mt-2 text-pizarra/80">
 Establece formalmente la propiedad del software, activos de marca, datos y permisos de uso de la plataforma Red Café Ecuador.
 </p>
 <p className="mt-1 text-xs text-pizarra/50">Versión 1.0 · 14 de agosto de 2026</p>

 <div className="mt-6 space-y-8 text-sm leading-relaxed text-pizarra/85">

 <Section titulo="1. Propietario">
 <p>
 <strong>Pedro Rojas — SolucionesPro</strong>, con domicilio en Ecuador.
 Sitio: <a href="https://redcafeecuador.com" className="text-cereza underline">redcafeecuador.com</a>.
 Contacto legal: info@redcafeecuador.com.
 </p>
 <p>
 SolucionesPro es propietaria del código fuente, la marca, el modelo
 de negocio y todos los activos intangibles asociados al producto
 "Red Café Ecuador".
 </p>
 </Section>

 <Section titulo="2. Propiedad intelectual y activos">
 <Subsection titulo="2.1 Marca y nombre comercial">
 <ul>
 <li>Nombre comercial: Red Café Ecuador</li>
 <li>Dominio: redcafeecuador.com</li>
 <li>Tagline: "Todo el café ecuatoriano, conectado"</li>
 <li>Logos, paleta de colores y elementos gráficos: autoría de SolucionesPro.</li>
 </ul>
 <p>
 El uso no autorizado del nombre, marca o logos está prohibido y
 puede constituir infracción de derechos de propiedad intelectual
 conforme a la Ley de Propiedad Intelectual de Ecuador y la
 Decisión 486 de la CAN.
 </p>
 </Subsection>

 <Subsection titulo="2.2 Código fuente">
 <ul>
 <li><strong>Frontend (Next.js 15, React 19, TypeScript, Tailwind v4):</strong> autoría de SolucionesPro. Licencia: MIT.</li>
 <li><strong>Backend PHP (8 archivos en <code>public/api/</code>):</strong> autoría de SolucionesPro. Licencia: MIT.</li>
 <li><strong>Datos seed:</strong> autoría de SolucionesPro, con fines demostrativos. No representan fincas reales.</li>
 </ul>
 </Subsection>

 <Subsection titulo="2.3 Contenidos legales">
 <p>Los siguientes documentos son autoría de SolucionesPro y cumplen con la LOPDP de Ecuador:</p>
 <ul>
 <li><Link href="/politica-de-privacidad" className="text-cereza underline">Política de Privacidad</Link></li>
 <li><Link href="/politica-de-uso-de-datos" className="text-cereza underline">Política de Uso de Datos</Link></li>
 <li><Link href="/politica-de-cookies" className="text-cereza underline">Política de Cookies</Link></li>
 <li><Link href="/terminos-y-condiciones" className="text-cereza underline">Términos y Condiciones</Link></li>
 </ul>
 <p>
 Estos textos NO pueden ser reutilizados en plataformas de terceros sin autorización escrita.
 </p>
 </Subsection>
 </Section>

 <Section titulo="3. Datos y privacidad">
 <Subsection titulo="3.1 Datos de miembros">
 <p>
 <strong>Propiedad:</strong> Los datos publicados por cada miembro
 (lotes, descripciones, fotos, cataciones) pertenecen al miembro
 que los publica. La plataforma solo los aloja y exhibe conforme a
 los Términos aceptados.
 </p>
 <p>
 <strong>Encargado del tratamiento:</strong> Red Café Ecuador
 (SolucionesPro) actúa como encargado del tratamiento bajo la LOPDP.
 </p>
 <p>
 <strong>Cesión:</strong> La plataforma NO vende datos a terceros.
 Solo comparte datos con proveedores de infraestructura (hosting,
 pasarela de pago) bajo acuerdos de confidencialidad.
 </p>
 </Subsection>

 <Subsection titulo="3.2 Bitácoras locales">
 <p>
 Los registros de producción, ventas, costos, siembras, turnos y
 demás bitácoras que cada miembro mantiene en su navegador son{" "}
 <strong>propiedad exclusiva del miembro</strong>. La plataforma
 NO los transmite al servidor.
 </p>
 </Subsection>

 <Subsection titulo="3.3 Evidencia de consentimiento">
 <p>
 Conforme al artículo 16 de la LOPDP, la plataforma registra:
 </p>
 <ul>
 <li>IP y user agent al momento del registro.</li>
 <li>Fecha y versión de cada política aceptada.</li>
 <li>Lista de consentimientos otorgados.</li>
 </ul>
 <p>
 Estos datos se conservan durante la vigencia de la cuenta y por
 2 años adicionales.
 </p>
 </Subsection>
 </Section>

 <Section titulo="4. Licencia de uso">
 <p>El código se distribuye bajo la Licencia MIT. Esto significa:</p>
 <div className="grid gap-3 sm:grid-cols-2">
 <div className="rounded-xl border border-hoja/40 bg-hoja/10 p-4">
 <p className="font-semibold text-cafe"> Permitido</p>
 <ul className="mt-2 space-y-1 text-xs">
 <li>Uso comercial</li>
 <li>Modificación</li>
 <li>Distribución</li>
 <li>Sublicenciamiento</li>
 </ul>
 </div>
 <div className="rounded-xl border border-cafe/20 bg-crema p-4">
 <p className="font-semibold text-cafe"> Requerido</p>
 <ul className="mt-2 space-y-1 text-xs">
 <li>Mantener aviso de copyright</li>
 <li>Incluir texto de licencia</li>
 </ul>
 </div>
 </div>
 <p className="mt-3">
 <strong>NO permitido:</strong> usar la marca "Red Café Ecuador" sin
 autorización, reclamar autoría del código original o reutilizar
 textos legales en otros sitios.
 </p>
 </Section>

 <Section titulo="5. Uso no autorizado">
 <p>Queda expresamente prohibido:</p>
 <ul>
 <li>Suplantar la marca "Red Café Ecuador" o el dominio redcafeecuador.com.</li>
 <li>Vender el código fuente o porciones sustanciales sin atribución.</li>
 <li>Usar los textos legales en otras plataformas.</li>
 <li>Eliminar o modificar avisos de copyright, licencia o atribución.</li>
 <li>Realizar ingeniería inversa para clonar el producto con marca similar.</li>
 </ul>
 <p>
 Las infracciones serán perseguidas conforme a las leyes ecuatorianas y los tratados internacionales aplicables (Convenio de París, ADPIC).
 </p>
 </Section>

 <Section titulo="6. Soporte y contacto">
 <p>
 Para consultas sobre propiedad intelectual, licenciamiento,
 white-label o adaptaciones autorizadas: info@redcafeecuador.com
 </p>
 </Section>

 <div className="mt-8">
 <Link href="/legal" className="text-sm text-cereza underline">← Volver al centro legal</Link>
 </div>
 </div>
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

function Subsection({ titulo, children }: { titulo: string; children: ReactNode }) {
 return (
 <div>
 <h3 className="font-semibold text-cafe">{titulo}</h3>
 <div className="mt-1 space-y-2">{children}</div>
 </div>
 );
}
