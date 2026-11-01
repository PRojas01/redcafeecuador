"use client";

import type { Rol } from "@/lib/data";

// Bitácora personal (cuadernos de campo por dispositivo). Lo compartido con la Red
// vive en el backend PHP (lib/api.ts) y se identifica por cookie de sesión.

export interface Sesion {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  plan: string;
}

const KEY = "redcafe_sesion";

export function guardarSesion(s: Sesion) {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(s));
  }
}

export function leerSesion(): Sesion | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
  }
}

export function guardarBitacora(clave: string, valor: unknown) {
  if (typeof window === "undefined") return;
  const key = `redcafe_${clave}`;
  try {
    localStorage.setItem(key, JSON.stringify(valor));
  } catch {
    /* noop */
  }
}

export function leerBitacora<T>(clave: string, porDefecto: T): T {
  if (typeof window === "undefined") return porDefecto;
  try {
    const raw = localStorage.getItem(`redcafe_${clave}`);
    return raw ? (JSON.parse(raw) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}
