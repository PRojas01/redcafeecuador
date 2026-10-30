"use client";

import { useState } from "react";
import Link from "next/link";

export default function FacturaPreviewClientPage() {
  const [emisor, setEmisor] = useState("");
  const [ruc, setRuc] = useState("");
  const [cliente, setCliente] = useState("");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState(0);
  const [emitida, setEmitida] = useState(false);
  const [nro, setNro] = useState("");

  const input = "mt-1 w-full rounded-lg border border-cafe/20 px-3 py-2";
  const iva = (monto * 0.15).toFixed(2);
  const total = (monto * 1.15).toFixed(2);

  const emitir = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emisor.trim() || !ruc.trim() || !cliente.trim() || monto <= 0) return;
    setNro(`001-001-${String(Math.floor(100000 + Math.random() * 900000))}`);
    setEmitida(true);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/servicios/factura" className="inline-flex min-h-11 items-center text-sm font-semibold text-cereza hover:text-cereza/90 hover:underline">
        ← Volver a facturación
      </Link>

      <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-cereza">Herramienta</p>
      <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">Vista previa de factura</h1>
      <p className="mt-2 text-pizarra/80">
        Genera una vista previa de tu factura. Ingresa tus datos
        fiscales y los del cliente para ver cómo queda el comprobante.
      </p>
      <div className="mt-3 rounded-xl border border-latte/50 bg-latte/10 p-3 text-sm text-pizarra/80">
        <strong>Esta herramienta genera una vista previa.</strong> La facturación
        electrónica SRI real (con clave de acceso, firma digital y envío al SRI)
        requiere integración con un proveedor autorizado (e.g., Alegra, Facto).
        La Red puede asesorarte para activarla en tu negocio.
      </div>

      <form onSubmit={emitir} className="mt-8 space-y-4 rounded-2xl border border-cafe/10 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Nombre del emisor
            <input value={emisor} onChange={(e) => setEmisor(e.target.value)} placeholder="Tu nombre o razón social" className={input} required />
          </label>
          <label className="text-sm">
            RUC o cédula
            <input value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="Ej: documento o RUC" className={input} required />
          </label>
          <label className="text-sm">
            Cliente
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" className={input} required />
          </label>
          <label className="text-sm">
            Concepto
            <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: producto, cantidad y origen" className={input} />
          </label>
          <label className="text-sm">
            Monto sin IVA (USD)
            <input type="number" value={monto || ""} onChange={(e) => setMonto(Number(e.target.value))} placeholder="0.00" className={input} required />
          </label>
        </div>
        <button className="rounded-full bg-cereza px-6 py-3 font-semibold text-crema hover:bg-cereza/90">
          Generar vista previa
        </button>
      </form>

      {emitida && (
        <div className="mt-6 rounded-2xl border border-hoja/40 bg-white p-6">
          <div className="flex items-center justify-between border-b border-cafe/10 pb-3">
            <div>
              <p className="font-titulo text-lg font-bold text-cafe">{emisor}</p>
              <p className="text-xs text-pizarra/60">RUC: {ruc}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-cafe">FACTURA (VISTA PREVIA)</p>
              <p className="text-xs text-pizarra/60">No.: {nro}</p>
              <p className="text-xs text-pizarra/50">Sin valor fiscal</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-2"><dt className="font-semibold text-cafe">Cliente</dt><dd className="col-span-2">{cliente}</dd></div>
            <div className="grid grid-cols-3 gap-2"><dt className="font-semibold text-cafe">Concepto</dt><dd className="col-span-2">{concepto || "—"}</dd></div>
            <div className="grid grid-cols-3 gap-2"><dt className="font-semibold text-cafe">Subtotal</dt><dd className="col-span-2">${monto.toFixed(2)}</dd></div>
            <div className="grid grid-cols-3 gap-2"><dt className="font-semibold text-cafe">IVA 15%</dt><dd className="col-span-2">${iva}</dd></div>
            <div className="grid grid-cols-3 gap-2"><dt className="font-semibold text-cafe">Total</dt><dd className="col-span-2 font-bold text-hoja">${total}</dd></div>
          </dl>
          <p className="mt-4 rounded-xl bg-crema p-3 text-sm text-pizarra/70">
            Vista previa generada. Para emitir una factura con valor fiscal,
            necesitas un proveedor autorizado por el SRI. La Red puede ayudarte a
            integrar uno. <Link href="/servicios/factura" className="font-semibold text-cereza underline">Más información</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
