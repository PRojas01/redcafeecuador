"use client";

import { useState } from "react";

export default function FinanzasClientPage() {
 const [quintales, setQuintales] = useState(20);
 const [precioQuintal, setPrecioQuintal] = useState(155);
 const [costoProduccion, setCostoProduccion] = useState(80);
 const [costoBeneficio, setCostoBeneficio] = useState(15);
 const [costoTransporte, setCostoTransporte] = useState(8);
 const [costoMembresia, setCostoMembresia] = useState(9);

 const costoTotalPorQuintal = costoProduccion + costoBeneficio + costoTransporte;
 const costoTotal = costoTotalPorQuintal * quintales;
 const ingresoBruto = precioQuintal * quintales;
 const margenPorQuintal = precioQuintal - costoTotalPorQuintal;
 const margenTotal = ingresoBruto - costoTotal - costoMembresia;
 const margenPct = ingresoBruto > 0 ? (margenTotal / ingresoBruto) * 100 : 0;

 const input = "mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2";
 const card = "rounded-2xl border border-cafe/10 bg-white p-5";

 return (
 <div className="mx-auto max-w-6xl px-4 py-10">
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">
 Herramienta · Mi Negocio
 </p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">
 Simulador de costos y margen
 </h1>
 <p className="mt-2 max-w-2xl text-pizarra/80">
 Calcula cuánto te cuesta producir un quintal de café y qué margen
 obtendrías al venderlo. Ajusta los valores según tu finca o negocio.
 </p>

 <div className="mt-8 grid gap-6 lg:grid-cols-3">
 <div className={`${card} lg:col-span-1`}>
 <p className="font-titulo text-lg font-bold text-cafe">Mi producción</p>
 <div className="mt-3 space-y-3 text-sm">
 <label className="block">
 Quintales a vender
 <input type="number" value={quintales} onChange={(e) => setQuintales(Number(e.target.value))} className={input} />
 </label>
 <label className="block">
 Precio de venta (USD/quintal)
 <input type="number" value={precioQuintal} onChange={(e) => setPrecioQuintal(Number(e.target.value))} className={input} />
 </label>
 </div>
 <p className="mt-4 font-titulo text-lg font-bold text-cafe">Mis costos</p>
 <div className="mt-3 space-y-3 text-sm">
 <label className="block">
 Producción (USD/quintal)
 <input type="number" value={costoProduccion} onChange={(e) => setCostoProduccion(Number(e.target.value))} className={input} />
 </label>
 <label className="block">
 Beneficio (USD/quintal)
 <input type="number" value={costoBeneficio} onChange={(e) => setCostoBeneficio(Number(e.target.value))} className={input} />
 </label>
 <label className="block">
 Transporte (USD/quintal)
 <input type="number" value={costoTransporte} onChange={(e) => setCostoTransporte(Number(e.target.value))} className={input} />
 </label>
<label className="block">
			Cuota Red (USD/mes)
			<input type="number" value={costoMembresia} onChange={(e) => setCostoMembresia(Number(e.target.value))} className={input} />
		</label>
 </div>
 </div>

 <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
 {[
 { k: "Costo por quintal", v: `$${costoTotalPorQuintal.toFixed(2)}`, d: "Producción + beneficio + transporte" },
 { k: "Costo total", v: `$${costoTotal.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`, d: `${quintales} quintales × $${costoTotalPorQuintal.toFixed(2)}` },
 { k: "Ingreso bruto", v: `$${ingresoBruto.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`, d: `${quintales} quintales × $${precioQuintal}` },
 { k: "Margen por quintal", v: `$${margenPorQuintal.toFixed(2)}`, d: margenPorQuintal > 0 ? "Ganancia por quintal vendido" : "Pérdida por quintal" },
 { k: "Margen total", v: `$${margenTotal.toLocaleString("es-EC", { minimumFractionDigits: 2 })}`, d: "Ingreso bruto − costos − cuota" },
 { k: "Margen %", v: `${margenPct.toFixed(1)}%`, d: "Rentabilidad sobre ingreso bruto" },
 ].map((c) => (
 <div key={c.k} className={card}>
 <p className="text-xs text-pizarra/60">{c.k}</p>
 <p className="mt-1 text-2xl font-bold text-cafe">{c.v}</p>
 <p className="mt-1 text-xs text-pizarra/60">{c.d}</p>
 </div>
 ))}
 <div className={`${card} sm:col-span-2 ${margenTotal >= 0 ? "border-hoja/50 bg-hoja/10" : "border-cereza/50 bg-cereza/10"}`}>
 <p className="text-sm font-semibold text-cafe">
 {margenTotal >= 0 ? " Tu venta es rentable" : " Tu venta tiene pérdida"}
 </p>
 <p className="mt-1 text-sm text-pizarra/80">
 {margenTotal >= 0
 ? `Vendiendo ${quintales} quintales a $${precioQuintal}/qq, tu ganancia es $${margenTotal.toLocaleString("es-EC", { minimumFractionDigits: 2 })} (${margenPct.toFixed(1)}% de margen).`
 : `Con estos costos pierdes $${Math.abs(margenTotal).toLocaleString("es-EC", { minimumFractionDigits: 2 })}. Considera subir el precio, reducir costos o aumentar el volumen.`}
 </p>
 </div>
 </div>
 </div>

 <div className="mt-6 rounded-2xl border border-cafe/10 bg-crema p-5 text-sm text-pizarra/70">
 <p className="font-semibold text-cafe"> Cómo usar este simulador</p>
 <ul className="mt-2 ml-5 list-disc space-y-1">
 <li>Ajusta los costos según tu realidad (mano de obra, insumos, transporte).</li>
 <li>Usa el <a href="/servicios/precios" className="font-semibold text-cereza underline">Panel de Precios</a> como referencia para fijar tu precio de venta.</li>
 <li>Si tu margen es menor al 20%, considera solicitar <a href="/asesoria" className="font-semibold text-cereza underline">asesoría comercial</a> para optimizar.</li>
 </ul>
 </div>
 </div>
 );
}
