import { RECETAS } from "@/lib/data";

export function generateStaticParams() {
  return RECETAS.map((r) => ({ slug: r.slug ?? r.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = RECETAS.find((x) => (x.slug ?? x.id) === slug);
  if (!r) return {};
  const url = `/recetas/${r.slug ?? r.id}/`;
  return {
    title: { absolute: `${r.titulo} — receta de café · Red Café Ecuador` },
    description: r.resumen,
    alternates: { canonical: url },
    openGraph: { title: r.titulo, description: r.resumen, url, images: ["/img/og-redcafe.jpg"] },
  };
}

export default function RecetaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}