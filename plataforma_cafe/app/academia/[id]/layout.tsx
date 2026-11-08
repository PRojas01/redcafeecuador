import { CURSOS } from "@/lib/data";

export function generateStaticParams() {
 // Los de Legacy no: su ficha local es solo un marcador (llegan por la API).
 return CURSOS.filter((c) => !c.id.startsWith("legacy-")).map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const c = CURSOS.find((x) => x.id === id);
 if (!c) return {};
 const url = `/academia/${c.id}/`;
 const description = c.descripcion.length > 160 ? c.descripcion.slice(0, 157).trimEnd() + "…" : c.descripcion;
 return {
  title: { absolute: `${c.titulo} — curso · Red Café Ecuador` },
  description,
  alternates: { canonical: url },
  openGraph: { title: c.titulo, description, url, images: ["/img/og-redcafe.jpg"] },
 };
}

export default function CursoLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return <>{children}</>;
}