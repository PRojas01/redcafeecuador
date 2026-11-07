import { CURSOS } from "@/lib/data";

export function generateStaticParams() {
 // Los de Legacy no: su ficha local es solo un marcador (llegan por la API).
 return CURSOS.filter((c) => !c.id.startsWith("legacy-")).map((c) => ({ id: c.id }));
}

export default function CursoLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return <>{children}</>;
}