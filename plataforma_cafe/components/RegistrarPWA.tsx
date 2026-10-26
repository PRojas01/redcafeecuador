"use client";

import { useEffect } from "react";
import { CONFIG } from "@/lib/config";

export function RegistrarPWA() {
 useEffect(() => {
 if ("serviceWorker" in navigator) {
 navigator.serviceWorker
 .register(`${CONFIG.basePath}/sw.js`)
 .catch(() => {
 /* SW no crítico: si falla, la app sigue funcionando normal */
 });
 }
 }, []);

 return null;
}