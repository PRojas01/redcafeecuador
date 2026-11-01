import { RECETAS } from "@/lib/data";

export function generateStaticParams() {
  return RECETAS.map((r) => ({ slug: r.slug ?? r.id }));
}

export default function RecetaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}