import { LOTES } from "@/lib/data";

export function generateStaticParams() {
 // «ficha»: la página que el servidor sirve a los lotes publicados por miembros.
 return [...LOTES.map((l) => ({ id: l.id })), { id: "ficha" }];
}

export default function LoteLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return <>{children}</>;
}