import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
 title: "Política de Cookies — Red Café Ecuador",
 description: "Qué cookies y almacenamiento local usa Red Café Ecuador.",
};

export default function CookiesPage() {
 return (
 <PoliticaLayout titulo="Política de Cookies" resumen="Qué cookies y almacenamiento local usamos y cómo controlarlos.">
 <Section titulo="1. ¿Qué son las cookies?">
 <p>
 Las cookies son pequeños archivos de texto que un sitio web almacena en
 tu navegador. También usamos <strong>localStorage</strong>, una
 tecnología similar pero con mayor capacidad y que permanece hasta que
 la borres manualmente.
 </p>
 </Section>

 <Section titulo="2. Cookies que usamos">
 <p>Esta plataforma utiliza únicamente cookies propias (no de terceros):</p>
 <table className="w-full">
 <thead>
 <tr className="border-b border-cafe/20 text-left">
 <th className="py-2">Nombre</th>
 <th className="py-2">Tipo</th>
 <th className="py-2">Finalidad</th>
 <th className="py-2">Duración</th>
 </tr>
 </thead>
 <tbody className="text-xs">
 <tr className="border-b border-cafe/10">
 <td className="py-2"><code>PHPSESSID</code></td>
 <td className="py-2">Sesión PHP</td>
 <td className="py-2">Mantener tu sesión autenticada</td>
 <td className="py-2">7 días</td>
 </tr>
 <tr>
 <td className="py-2"><code>redcafe_sesion</code></td>
 <td className="py-2">localStorage</td>
 <td className="py-2">Cachear datos de sesión (nombre, rol)</td>
 <td className="py-2">Hasta que la borres</td>
 </tr>
 </tbody>
 </table>
 </Section>

 <Section titulo="3. Almacenamiento local (localStorage)">
 <p>Además de la sesión, tu navegador guarda los siguientes datos <strong>exclusivamente en tu dispositivo</strong>:</p>
 <ul>
 <li><strong>Bitácoras:</strong> producción, ventas, compras, tostados, siembras, limpiezas, costos, turnos.</li>
 <li><strong>Progreso de cursos:</strong> módulos completados en la Academia.</li>
 <li><strong>Favoritos:</strong> lista de fincas guardadas por compradores.</li>
 <li><strong>Registros de actividad:</strong> bitácora unificada de operaciones.</li>
 </ul>
 <p>
 <strong>Importante:</strong> estos datos nunca se transmiten a nuestros servidores.
 Si cambias de navegador o dispositivo, no se sincronizan automáticamente.
 </p>
 </Section>

 <Section titulo="4. Cookies de terceros">
 <p>
 <strong>No usamos</strong> cookies de rastreo publicitario, analytics
 de terceros ni redes de seguimiento. Tu navegación es privada.
 </p>
 </Section>

 <Section titulo="5. Cómo controlar las cookies">
 <p>Puedes controlar y eliminar cookies desde tu navegador:</p>
 <ul>
 <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies.</li>
 <li><strong>Firefox:</strong> Preferencias → Privacidad y seguridad.</li>
 <li><strong>Safari:</strong> Preferencias → Privacidad.</li>
 <li><strong>Edge:</strong> Configuración → Cookies y permisos del sitio.</li>
 </ul>
 <p>
 Si bloqueas o eliminas nuestras cookies de sesión, no podrás mantener
 la sesión iniciada. Si eliminas el localStorage, perderás tus bitácoras
 locales.
 </p>
 </Section>

 <Section titulo="6. Cambios">
 <p>
 Cualquier cambio significativo en esta política será notificado por
 correo y mediante aviso dentro de la plataforma.
 </p>
 </Section>

 <div className="mt-8">
 <Link href="/legal" className="text-sm text-cereza underline">← Volver al centro legal</Link>
 </div>
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
 <div className="mt-2 space-y-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_code]:rounded [&_code]:bg-crema [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_table]:w-full [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-cafe">{children}</div>
 </section>
 );
}
