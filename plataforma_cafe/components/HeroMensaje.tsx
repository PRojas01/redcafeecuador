"use client";

import { useEffect, useState } from "react";

const TITULOS = [
  <>
    Una nueva forma de hacer negocios en el{" "}
    <span className="text-acento-claro">café ecuatoriano</span>
  </>,
  <>
    Haz crecer tu negocio cafetero con una{" "}
    <span className="text-acento-claro">red abierta y digital</span>
  </>,
];

const SUBTITULOS = [
  "Red Café Ecuador conecta productores, tostadores, compradores, cafeterías, asesores y proveedores en una plataforma abierta para mostrar oferta, encontrar oportunidades y trabajar con más información.",
  "Una plataforma para que productores, tostadores, compradores, cafeterías, asesores y proveedores del café ecuatoriano puedan mostrarse, conectar y encontrar oportunidades comerciales.",
];

const COMBINACIONES = TITULOS.flatMap((_, titulo) =>
  SUBTITULOS.map((__, subtitulo) => ({ titulo, subtitulo }))
);

function elegirCombinacion() {
  const anterior = Number(window.localStorage.getItem("redcafe.heroMensaje"));
  const opciones = COMBINACIONES.map((_, i) => i).filter((i) => i !== anterior);
  const indice = opciones[Math.floor(Math.random() * opciones.length)] ?? 0;
  window.localStorage.setItem("redcafe.heroMensaje", String(indice));
  return indice;
}

export function HeroMensaje() {
  const [indice, setIndice] = useState(0);
  const combinacion = COMBINACIONES[indice];

  useEffect(() => {
    try {
      setIndice(elegirCombinacion());
    } catch {
      setIndice(Math.floor(Math.random() * COMBINACIONES.length));
    }
  }, []);

  return (
    <>
      <h1 className="font-titulo text-4xl font-bold leading-[1.1] text-crema md:text-6xl">
        {TITULOS[combinacion.titulo]}
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-crema/85">
        {SUBTITULOS[combinacion.subtitulo]}
      </p>
    </>
  );
}
