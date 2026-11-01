import { CURSOS } from "@/lib/data";

export function generateStaticParams() {
 return CURSOS.map((c) => ({ id: c.id }));
}

export default function CursoLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return <>{children}</>;
}