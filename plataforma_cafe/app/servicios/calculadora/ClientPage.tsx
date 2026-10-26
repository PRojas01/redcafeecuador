"use client";

import { useState } from "react";

export default function CalculadoraPage() {
 const [quintales, setQuintales] = useState(20);
 const [precioQq, setPrecioQq] = useState(155);
 const [costoQq, setCostoQq] = useState(90);
 const [comision, setComision] = useState(0);

 const sacos = (quintales * 45.36) / 60;
 const bruto = quintales * precioQq;
 const costos = quintales * costoQq;
 const comisionUsd = (bruto * comision) / 100;
 const neto = bruto - costos - comisionUsd;
 const margen = bruto > 0 ? ((neto / bruto) * 100).toFixed(1) : "0";

 const input = "mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2";

 return (
 <div className="mx-auto max-w-3xl px-4 py-10">
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Herramienta</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">Calculadora de Venta</h1>
 <p className="mt-2 text-pizarra/80">
 Estima cuánto recibirás por tu cosecha en café oro, cuántos sacos representan y
 tu margen neto.
 </p>
 <p className="mt-3 rounded-xl border border-cafe/10 bg-crema/70 px-4 py-3 text-sm font-semibold text-cafe">
 Quintal = 100 lb = 45,36 kg; saco de exportación = 60 kg.
 </p>

 <div className="mt-8 rounded-2xl border border-cafe/10 bg-white p-6">
 <div className="grid gap-4 sm:grid-cols-2">
 <label className="text-sm">
 Quintales de café oro
 <input type="number" value={quintales} onChange={(e) => setQuintales(Number(e.target.value))} className={input} />
 </label>
 <label className="text-sm">
 Precio por quintal (USD)
 <input type="number" value={precioQq} onChange={(e) => setPrecioQq(Number(e.target.value))} className={input} />
 </label>
 <label className="text-sm">
 Costo de producción por qq (USD)
 <input type="number" value={costoQq} onChange={(e) => setCostoQq(Number(e.target.value))} className={input} />
 </label>
 <label className="text-sm">
 Comisión de venta (%)
 <input type="number" value={comision} onChange={(e) => setComision(Number(e.target.value))} className={input} />
 </label>
 </div>

 <div className="mt-6 grid gap-3 rounded-2xl bg-crema p-5 sm:grid-cols-2">
 <div>
 <p className="text-xs text-pizarra/60">Venta bruta</p>
 <p className="text-2xl font-bold text-cafe">${bruto.toFixed(2)}</p>
 </div>
 <div>
 <p className="text-xs text-pizarra/60">Sacos de 60 kg equivalentes</p>
 <p className="text-2xl font-bold text-cafe">{sacos.toFixed(1)}</p>
 </div>
 <div>
 <p className="text-xs text-pizarra/60">Costos + comisión</p>
 <p className="text-xl font-semibold text-pizarra/70">
 ${(costos + comisionUsd).toFixed(2)}
 </p>
 </div>
 <div>
 <p className="text-xs text-pizarra/60">Ingreso neto estimado</p>
 <p className="text-2xl font-bold text-hoja">${neto.toFixed(2)}</p>
 </div>
 </div>
 <p className="mt-4 text-sm text-pizarra/70">
 Margen neto estimado: <strong>{margen}%</strong>. Consejo: compara con el panel de
 precios ICE C antes de negociar.
 </p>
 </div>
 </div>
 );
}
