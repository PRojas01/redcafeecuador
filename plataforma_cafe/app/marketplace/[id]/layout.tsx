import { LOTES } from "@/lib/data";

export function generateStaticParams() {
 return LOTES.map((l) => ({ id: l.id }));
}

export default function LoteLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return <>{children}</>;
}