"use client";

// Sistema de registro de actividades para control interno del usuario.
// Cada registro tiene fecha/hora, tipo, acción, perfil, descripción y metadatos.
// Los datos viven en localStorage del navegador del usuario (privacidad first).

export type TipoRegistro =
  | "produccion"
  | "venta"
  | "compra"
  | "tostado"
  | "siembra"
  | "limpieza"
  | "costo"
  | "turno"
  | "menu"
  | "pedido"
  | "lote"
  | "asistencia"
  | "capacitacion"
  | "nota"
  | "otro";

export interface Registro {
  id: string;
  fecha: string;        // YYYY-MM-DD
  hora: string;         // HH:MM
  ts: number;           // timestamp ms
  perfil: "productor" | "vendedor" | "comprador" | "bar" | "barista" | "certificador" | "transportista" | "pilador" | "exportador" | "proveedor" | "amante" | "asesor";
  tipo: TipoRegistro;
  accion: string;       // descripción corta
  monto?: number;       // USD si aplica
  unidad?: string;      // "qq", "sacos", "horas"
  cantidad?: number;
  meta?: Record<string, unknown>; // datos extra
}

const KEY = "redcafe_registros";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function agregarRegistro(r: Omit<Registro, "id" | "ts" | "fecha" | "hora">): Registro {
  const ahora = new Date();
  const completo: Registro = {
    ...r,
    id: uid(),
    ts: ahora.getTime(),
    fecha: ahora.toISOString().slice(0, 10),
    hora: ahora.toTimeString().slice(0, 5),
  };
  const lista = leerRegistros();
  lista.push(completo);
  try {
    localStorage.setItem(KEY, JSON.stringify(lista));
  } catch {
    /* noop */
  }
  return completo;
}

export function leerRegistros(): Registro[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Registro[]) : [];
  } catch {
    return [];
  }
}

export function leerRegistrosPorPerfil(perfil: Registro["perfil"]): Registro[] {
  return leerRegistros().filter((r) => r.perfil === perfil);
}

export function leerRegistrosPorTipo(tipo: TipoRegistro): Registro[] {
  return leerRegistros().filter((r) => r.tipo === tipo);
}

export function leerRegistrosPorRango(desde: string, hasta: string): Registro[] {
  return leerRegistros().filter((r) => r.fecha >= desde && r.fecha <= hasta);
}

export function eliminarRegistro(id: string): void {
  const lista = leerRegistros().filter((r) => r.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(lista));
  } catch {
    /* noop */
  }
}

export function limpiarRegistros(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

// Exporta registros a CSV (descarga).
export function exportarCSV(registros: Registro[]): void {
  if (registros.length === 0) return;
  const cabecera = ["fecha", "hora", "perfil", "tipo", "accion", "cantidad", "unidad", "monto", "meta"];
  const filas = registros.map((r) => [
    r.fecha,
    r.hora,
    r.perfil,
    r.tipo,
    r.accion.replace(/"/g, '""'),
    r.cantidad ?? "",
    r.unidad ?? "",
    r.monto ?? "",
    r.meta ? JSON.stringify(r.meta).replace(/"/g, '""') : "",
  ]);
  const csv = [cabecera, ...filas]
    .map((f) => f.map((c) => `"${c}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `redcafe-registros-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Resumen por tipo para dashboard.
export function resumenPorTipo(registros: Registro[]): Record<TipoRegistro, number> {
  const acc: Record<string, number> = {};
  for (const r of registros) acc[r.tipo] = (acc[r.tipo] ?? 0) + 1;
  return acc as Record<TipoRegistro, number>;
}

// Suma montos por tipo (USD).
export function sumaMontosPorTipo(registros: Registro[]): Record<TipoRegistro, number> {
  const acc: Record<string, number> = {};
  for (const r of registros) {
    if (typeof r.monto === "number") {
      acc[r.tipo] = (acc[r.tipo] ?? 0) + r.monto;
    }
  }
  return acc as Record<TipoRegistro, number>;
}
