"use client";

import { useEffect, useState } from "react";
import { Icono } from "@/components/Icono";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstalarPWA({
  variant = "menu",
  showFallback = false,
}: {
  variant?: "menu" | "floating" | "mobile";
  showFallback?: boolean;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detectar si ya está instalada
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const instalar = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const canPrompt = Boolean(deferredPrompt);

  const handleInstall = () => {
    if (canPrompt) {
      void instalar();
      return;
    }
    if (showFallback) setShowInstructions(true);
  };

  if (installed) return null;
  if (!canPrompt && !showFallback) return null;

  const instructions = showInstructions && (
    <div className="fixed inset-0 z-[80] flex items-end bg-cafe/65 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full max-w-md border border-cafe/10 bg-crema p-5 text-cafe shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="rotulo text-filtrado-600">Instalar Red Café Ecuador</p>
            <h2 className="mt-1 font-titulo text-xl font-bold text-cafe">
              Acceso rápido desde tu pantalla de inicio
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowInstructions(false)}
            className="grid h-9 w-9 shrink-0 place-items-center border border-cafe/15 text-xl leading-none text-cafe"
            aria-label="Cerrar instrucciones de instalación"
          >
            ×
          </button>
        </div>
        <div className="mt-4 grid gap-3 text-sm leading-relaxed text-pizarra-suave">
          <p>
            En Android, abre el menú del navegador y elige <b className="text-cafe">Instalar app</b> o <b className="text-cafe">Agregar a pantalla principal</b>.
          </p>
          <p>
            En iPhone, usa el botón de compartir de Safari y elige <b className="text-cafe">Agregar a pantalla de inicio</b>.
          </p>
        </div>
      </div>
    </div>
  );

  if (variant === "floating") {
    return (
      <>
      <div className="fixed bottom-5 left-5 z-40 print:hidden">
        <button
          onClick={handleInstall}
          className="group flex items-center gap-2 rounded-full bg-cafe px-4 py-2.5 text-sm font-semibold text-crema shadow-lg transition hover:bg-cafe/90"
        >
          <Icono nombre="marketplace" className="h-4 w-4" />
          <span className="hidden sm:inline">Instalar app</span>
        </button>
      </div>
      {instructions}
      </>
    );
  }

  if (variant === "mobile") {
    return (
      <>
      <button
        type="button"
        onClick={handleInstall}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-crema/85 transition-colors hover:bg-filtrado-800 hover:text-acento-claro"
      >
        <Icono nombre="marketplace" className="h-4 w-4" />
        Instalar Red Café Ecuador
      </button>
      {instructions}
      </>
    );
  }

  return (
    <>
    <div className="relative">
      <button
        onClick={handleInstall}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-crema/25 px-4 py-2 text-sm font-semibold text-crema transition hover:bg-crema/10"
      >
        <Icono nombre="marketplace" className="h-4 w-4" />
        Instalar app
      </button>
      {showTooltip && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-xl border border-cafe/10 bg-white p-3 text-xs text-pizarra/70 shadow-lg">
          Instala Red Café Ecuador en tu dispositivo para acceso rápido sin abrir el navegador.
        </div>
      )}
    </div>
    {instructions}
    </>
  );
}
