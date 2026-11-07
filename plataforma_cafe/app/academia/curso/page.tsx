"use client";

// Ficha de los cursos creados después de compilar el sitio: el servidor sirve
// esta página para /academia/<id>/ cuando el curso no tiene carpeta propia, y
// el visor lee el id de la dirección.
import { VisorCurso } from "@/components/VisorCurso";

export default function CursoNuevoPage() {
  return <VisorCurso id={null} />;
}
