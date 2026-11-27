import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/db.js", () => ({ db: {} }));
const { actualizarSolicitudCata, CATA_NOMBRE } = await import("../src/lib/cata-legacy.js");
const T = "2026-11-27T16:00:00.000Z";

describe("solicitudes de cata anteriores → servicio de muestras de Legacy", () => {
  it("orden pendiente: nuevo nombre, 50 USD y lo anterior guardado", () => {
    const o = { nro: 3, servicio_id: "cert-catacion", servicio_nombre: "Informe de catación", precio: 40, estado: "pendiente" };
    const r = actualizarSolicitudCata(o, T);
    expect(r.servicio_nombre).toBe(CATA_NOMBRE);
    expect(r.precio).toBe(50);
    expect(r.nota_servicio).toMatch(/analisis-de-muestras/);
    expect(r.cata_legacy_antes).toEqual({ servicio_nombre: "Informe de catación", precio: 40 });
    expect(actualizarSolicitudCata(r, T)).toBe(r); // idempotente
  });
  it("orden pagada conserva su precio", () => {
    const r = actualizarSolicitudCata({ servicio_id: "cert-catacion", servicio_nombre: "Informe de catación", precio: 40, estado: "pagado" }, T);
    expect(r.precio).toBe(40);
    expect(r.cata_legacy_antes).toEqual({ servicio_nombre: "Informe de catación" });
  });
  it("pedido «Solicitado» del chat: título y total", () => {
    const r = actualizarSolicitudCata({ tipo: "servicio", servicioId: "cert-catacion", servicio: "Informe de catación", cantidad: 2, total: 80, estado: "Solicitado" }, T);
    expect(r.servicio).toBe(CATA_NOMBRE);
    expect(r.total).toBe(100);
    expect(r.cata_legacy_antes).toEqual({ servicio: "Informe de catación", total: 80 });
  });
  it("otros servicios no cambian", () => {
    const o = { servicio_id: "cert-eudr", precio: 30, estado: "pendiente" };
    expect(actualizarSolicitudCata(o, T)).toBe(o);
  });
});
