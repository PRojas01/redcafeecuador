import { LOTES } from "@/lib/data";

export function generateStaticParams() {
 // «ficha»: la página que el servidor sirve a los lotes publicados por miembros.
 return [...LOTES.map((l) => ({ id: l.id })), { id: "ficha" }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 // «ficha» sirve a los lotes reales: el servidor pone su dirección en el canonical.
 if (id === "ficha") return { title: { absolute: "Lote de café · Red Café Ecuador" }, alternates: { canonical: "/marketplace/ficha/" } };
 const l = LOTES.find((x) => x.id === id);
 if (!l) return {};
 return {
  title: { absolute: `${l.variedad} de ${l.provincia} (ejemplo) · Red Café Ecuador` },
  alternates: { canonical: `/marketplace/${l.id}/` },
  robots: { index: false, follow: true },
 };
}

export default function LoteLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return <>{children}</>;
}