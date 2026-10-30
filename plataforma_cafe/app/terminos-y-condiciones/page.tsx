import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
 title: "Términos y Condiciones — Red Café Ecuador",
 description: "Reglas de uso de la plataforma Red Café Ecuador.",
 alternates: { canonical: "/terminos-y-condiciones/" },
 openGraph: {
  title: "Términos y Condiciones · Red Café Ecuador",
  description: "Reglas de uso de la plataforma Red Café Ecuador.",
  url: "/terminos-y-condiciones/",
 },
};

export default function TerminosPage() {
 return (
 <Layout titulo="Términos y Condiciones" resumen="Reglas que rigen el uso de la plataforma y la relación entre miembros.">
 <div className="rounded-lg border border-cafe/10 bg-white/70 p-4 text-sm leading-relaxed text-pizarra/75">
 <p className="font-semibold text-cafe">Estado de la plataforma · actualizado el 18 de agosto de 2026</p>
 <p className="mt-2">
 Red Café Ecuador está en fase de lanzamiento y algunas funciones descritas en este
 documento todavía no están operativas:
 </p>
 <ul className="mt-2 ml-5 list-disc space-y-1">
 <li>Escrow (pago retenido hasta confirmar la entrega): en preparación. Hoy el comprador y el vendedor acuerdan el pago directamente entre ellos; la Red no interviene en el cobro ni retiene fondos.</li>
 <li>Facturación electrónica desde la plataforma: en preparación.</li>
 </ul>
 <p className="mt-2">
 Cada cláusula entrará en vigor cuando la función correspondiente se active y se anuncie a
 los miembros.
 </p>
 </div>
 <Section titulo="Derechos y responsabilidad sobre el contenido">
 <p>Los miembros son responsables del contenido que suben y publican, y declaran que tienen los derechos para hacerlo. Red Café puede retirar el contenido ante un reclamo de terceros. La aceptación de esta declaración queda registrada con fecha y versión.</p>
 </Section>
 <Section titulo="1. Aceptación">
 <p>
 Al crear una cuenta en Red Café Ecuador, aceptas estos Términos y
 Condiciones. Si no estás de acuerdo, no uses el servicio.
 </p>
 </Section>

 <Section titulo="2. Naturaleza del servicio">
 <p>
 Red Café Ecuador es una plataforma de afiliación que conecta
 productores, vendedores, compradores, bares y baristas de café
 ecuatoriano. Actúa como <strong>intermediaria de conexión y sello de
 confianza</strong>, no como compradora ni vendedora del café.
 </p>
 <p>
 La Red no garantiza la exactitud de los datos declarados por los
 miembros ni el resultado comercial de las transacciones. Cada miembro
 es responsable de la información que publica.
 </p>
 </Section>

 <Section titulo="3. Elegibilidad">
 <ul>
 <li>Ser mayor de 18 años o persona jurídica válidamente representada.</li>
 <li>Proporcionar datos verídicos en el registro.</li>
 <li>Completar la verificación de identidad cuando la Red lo requiera.</li>
 </ul>
 </Section>

 <Section titulo="4. Membresía y costos">
					<ul>
						<li>
							Crear y mantener tu perfil en Red Café Ecuador es <strong>gratuito</strong>.
							El registro es gratuito hasta el 31 de diciembre de 2026, y quien se
							afilie antes de esa fecha conserva esas condiciones de acceso gratuito.
						</li>
						<li>
							Algunos servicios especializados tienen un costo, que se informa siempre
							antes de contratarlos. No se cobra nada de forma automática.
						</li>
						<li>
							Hoy <strong>no existe ninguna membresía de pago ni cobro recurrente</strong>.
							Si en el futuro se establece alguno, te lo comunicaremos con antelación
							razonable y no se aplicará de forma retroactiva ni automática: hará falta
							que lo aceptes.
						</li>
						<li>Puedes cerrar tu cuenta en cualquier momento desde tu panel (Mi cuenta → «Cerrar mi cuenta y eliminar mis datos»). Eliminamos tu perfil, tus datos de contacto y tus publicaciones; conservamos sin datos de contacto solo los pedidos ya cerrados y los registros de moderación, en los casos que permite el artículo 18 de la Ley Orgánica de Protección de Datos Personales (obligaciones con otras personas y atención de reclamos).</li>
					</ul>
				</Section>

 <Section titulo="5. Marketplace y pedidos">
 <ul>
 <li>Los lotes publicados deben reflejar datos reales (variedad, proceso, score, cantidad, GPS).</li>
 <li>El pago de cada pedido se rige por la política de escrow.</li>
 <li>El productor es responsable de la calidad y documentación del café enviado.</li>
 <li>El comprador debe inspeccionar el café recibido en el plazo de conformidad.</li>
 <li>Cada operación de compraventa o de servicios es estrictamente entre las partes que la acuerdan. Red Café Ecuador las pone en contacto, pero no es parte del contrato, no cobra, no retiene dinero ni garantiza la entrega o la calidad.</li>
 <li>Al enviar una solicitud de pedido, quien publica recibe tu nombre y tu solicitud para poder responderte. Antes de enviarla se te pide aceptarlo de forma expresa.</li>
 <li>Si continúas una conversación por WhatsApp, teléfono o correo, sales de la plataforma: compartes tus datos de contacto directamente con la otra persona y lo que hablen queda fuera de Red Café Ecuador, que no puede verlo, moderarlo ni guardarlo.</li>
 </ul>
 </Section>

 <Section titulo="6. Conducta prohibida">
 <p>Está prohibido:</p>
 <ul>
 <li>Publicar información falsa o suplantar identidades.</li>
 <li>Manipular precios, scores de catación o métricas de calidad.</li>
 <li>Defraudar el sistema de escrow o cualquier mecanismo de pago.</li>
 <li>Acosar, amenazar o discriminar a otros miembros.</li>
 <li>Usar la plataforma para actividades ilícitas.</li>
 <li>Intentar acceder a cuentas o datos de otros miembros.</li>
 </ul>
 <p>
 Las infracciones pueden llevar a la suspensión o cancelación de la
 cuenta, sin reembolso, y a las acciones legales correspondientes.
 </p>
 </Section>

 <Section titulo="7. Propiedad intelectual">
 <ul>
 <li>La marca, el código y los contenidos originales de la Red son propiedad de la plataforma.</li>
 <li>Las fotos y descripciones que publiques siguen siendo tuyas, pero nos otorgas una licencia para mostrarlas en la plataforma.</li>
 <li>No puedes reproducir la marca ni los materiales de la Red sin autorización.</li>
 </ul>
 </Section>

 <Section titulo="8. Limitación de responsabilidad">
 <p>
 La responsabilidad de la Red se limita al importe que hayas pagado por el servicio concreto de que se trate en los tres meses anteriores. Si no pagaste nada, no hay importe que reclamar por esta vía. Se exceptúan el dolo y la culpa grave. No somos responsables por:
 </p>
 <ul>
 <li>Daños indirectos, lucro cesante o pérdida de oportunidades comerciales.</li>
 <li>Calidad, legalidad o autenticidad del café comercializado entre miembros.</li>
 <li>Interrupciones del servicio por mantenimiento, fuerza mayor o causas técnicas.</li>
 </ul>
 </Section>

 <Section titulo="9. Suspensión y terminación">
 <p>La Red puede tomar medidas sobre una cuenta si:</p>
 <ul>
 <li>Se incumplen estos Términos (en especial la conducta prohibida del punto 6).</li>
 <li>Se detecta actividad fraudulenta o ilegal.</li>
 <li>El miembro lo solicita (cierre voluntario desde su panel).</li>
 </ul>
 <p className="mt-3 font-semibold text-cafe">Procedimiento</p>
 <ol className="ml-5 list-decimal space-y-1">
 <li><strong>Reporte o detección.</strong> Cualquier miembro puede reportar a otro desde su publicación o desde «¿Un problema?». La persona reportada no conoce la identidad de quien la reporta.</li>
 <li><strong>Revisión.</strong> La administración revisa los hechos y las pruebas, y puede pedir explicaciones a las partes por el chat de la Red o por correo.</li>
 <li><strong>Medida proporcional.</strong> Según la gravedad: advertencia, suspensión temporal (de 1 a 90 días) o bloqueo indefinido. Un bloqueo indefinido requiere pruebas documentadas.</li>
 <li><strong>Notificación.</strong> Se te informa por la plataforma y por correo de los hechos, la regla incumplida, la medida y su duración. Mientras la suspensión o el bloqueo estén vigentes, tus publicaciones no se muestran y no puedes iniciar sesión.</li>
 <li><strong>Apelación.</strong> Tienes 10 días desde la notificación para presentar tu versión y tus pruebas, con el enlace que recibes por correo o desde tu panel.</li>
 <li><strong>Resolución motivada.</strong> La administración responde por escrito explicando su decisión. Si la apelación prospera, la medida se levanta de inmediato.</li>
 <li><strong>Registro.</strong> Cada medida, apelación y resolución queda registrada para atender reclamos posteriores.</li>
 </ol>
 <p className="mt-3">
 En todos los casos, los pedidos en curso se gestionan conforme a la
 política de escrow. Para cerrar tu cuenta voluntariamente, primero completa o cancela tus pedidos en curso.
 </p>
 </Section>

 <Section titulo="10. Disponibilidad y continuidad del servicio">
					<p>
						Red Café Ecuador es un proyecto en desarrollo y así queremos decirlo, sin
						letra pequeña: ponemos todo el empeño en que funcione y esté disponible,
						pero <strong>no garantizamos que el servicio se preste de forma
						ininterrumpida ni por tiempo indefinido</strong>.
					</p>
					<p>
						Por razones operativas, técnicas, económicas, regulatorias o de fuerza
						mayor, podemos suspender, limitar, modificar o descontinuar funciones
						concretas o el servicio en su conjunto. También pueden producirse
						interrupciones por mantenimiento o por fallos de terceros de los que
						dependemos, como el proveedor de alojamiento.
					</p>
					<p>
						Cuando dependa de nosotros, avisaremos con antelación razonable y
						habilitaremos un medio para que puedas <strong>descargar la información
						que hayas publicado</strong> antes del cierre de una función o del
						servicio. No respondemos por lucro cesante ni por daños indirectos
						derivados de una interrupción o de la discontinuación.
					</p>
				</Section>

				<Section titulo="11. Modificaciones">
					<p>
						<strong>Estos Términos pueden cambiar.</strong> La plataforma está en
						construcción y sus funciones, sus condiciones y su modelo de servicio
						pueden evolucionar. Cuando modifiquemos estos Términos te avisaremos por
						correo y mediante aviso dentro de la plataforma, indicando la fecha de la
						nueva versión.
					</p>
					<p>
						El uso continuado después del aviso constituye aceptación. Si no estás de
						acuerdo con un cambio, puedes cerrar tu cuenta antes de que entre en
						vigencia y descargar la información que hayas publicado.
					</p>
				</Section>

 <Section titulo="12. Ley aplicable y jurisdicción">
 <p>
 Estos Términos se rigen por las leyes de la <strong>República del Ecuador</strong>.
 Cualquier controversia se resolverá ante los tribunales competentes de
 Quito, Ecuador.
 </p>
 </Section>

 <Section titulo="13. Contacto">
 <p>
 Para consultas sobre estos Términos: info@redcafeecuador.com.
 </p>
 <p className="mt-4">
 <Link href="/legal" className="text-sm text-cereza underline">← Volver al centro legal</Link>
 </p>
 </Section>
 </Layout>
 );
}

function Layout({ titulo, resumen, children }: { titulo: string; resumen: string; children: ReactNode }) {
 return (
 <div className="mx-auto max-w-[65ch] px-4 py-10 legal-text">
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Documento legal</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">{titulo}</h1>
 <p className="mt-2 text-pizarra/80">{resumen}</p>
 <p className="mt-1 text-xs text-pizarra/50">Última actualización: 23 de octubre de 2026.</p>
 <div className="mt-6 space-y-8 text-sm leading-relaxed text-pizarra/85">{children}</div>
 </div>
 );
}

function Section({ titulo, children }: { titulo: string; children: ReactNode }) {
 return (
 <section>
 <h2 className="font-titulo text-xl font-bold text-cafe">{titulo}</h2>
 <div className="mt-2 space-y-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">{children}</div>
 </section>
 );
}
