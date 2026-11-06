import { describe, expect, it } from "vitest";
import { armar, diasDeYahoo } from "../src/modulos/precios.js";

const dia = (iso: string) => Date.parse(`${iso}T13:30:00Z`) / 1000;
const yahoo = {
  chart: { result: [{
    timestamp: [dia("2026-11-03"), dia("2026-11-04"), dia("2026-11-05"), dia("2026-11-06")],
    indicators: { quote: [{
      open: [300, 302, null, 305],
      high: [304, 306, 309, 307],
      low: [299, 301, 303, 301],
      close: [302.456, 305, null, 303],
    }] },
  }] },
};

describe("precios diarios", () => {
  it("lee los cierres diarios, más reciente primero, sin días vacíos", () => {
    const d = diasDeYahoo(yahoo);
    expect(d.map((x) => x.fecha)).toEqual(["2026-11-06", "2026-11-04", "2026-11-03"]);
    expect(d[2]).toMatchObject({ centsLb: 302.46, usdQqal: 302.46, apertura: 300, maximo: 304, minimo: 299, mes: "2026-11" });
  });

  it("la cabecera usa el último cierre y la variación contra el anterior", () => {
    const p = armar([{ mes: "2026-11", centsLb: 303 }, { mes: "2026-10", centsLb: 290 }], "respaldo", diasDeYahoo(yahoo));
    expect(p.precio).toMatchObject({ valor: 303, fecha: "2026-11-06", variacion_periodo: "cierre_anterior", variacion_pct: -0.66 });
    expect(p.historico_diario).toHaveLength(3);
  });

  it("sin serie diaria vuelve a la variación mensual y deja la clave vacía", () => {
    const p = armar([{ mes: "2026-11", centsLb: 303 }, { mes: "2026-10", centsLb: 300 }], "respaldo");
    expect(p.precio).toMatchObject({ valor: 303, fecha: null, variacion_periodo: "mes_anterior", variacion_pct: 1 });
    expect(p.historico_diario).toEqual([]);
  });
});
