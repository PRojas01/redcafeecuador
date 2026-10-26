"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type Lote, type ApiUser } from "@/lib/api";
import { waLink } from "@/lib/config";
import { RatingBadge } from "@/components/RatingBadge";
import { TazaCenital } from "@/components/Lamina";
import { Skeleton } from "@/components/Skeleton";
import { EstadoError } from "@/components/EstadoError";

export default function LotePage() {
 const params = useParams<{ id: string }>();
 const [lote, setLote] = useState<Lote | null>(null);
 const [me, setMe] = useState<ApiUser | null>(null);
 const [sacos, setSacos] = useState(1);
 const [feedback, setFeedback] = useState<string | null>(null);
 const [nroPedido, setNroPedido] = useState(0);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 (async () => {
 const r = await api.lotesList();
 if (r.ok && r.data) {
 const found = (r.data as { lotes: Lote[] }).lotes.find((x) => x.id === params.id);
 setLote(found ?? null);
 }
 const m = await api.me();
 if (m.ok && m.data) setMe((m.data as { user: ApiUser | null }).user ?? null);
 setLoading(false);
 })();
 }, [params.id]);

if (loading) {
  return (
   <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
   <div className="mt-4 grid gap-8 lg:grid-cols-5">
   <Skeleton className="aspect-[4/3] w-full lg:col-span-2" style={{ borderRadius: 16 }} />
   <div className="space-y-5 lg:col-span-3">
   <Skeleton variante="linea" className="w-28" />
   <Skeleton variante="titulo" className="w-2/3" />
   <Skeleton variante="texto" className="w-1/3" />
   <Skeleton variante="linea" className="w-full" />
   <Skeleton variante="linea" className="w-5/6" />
   <Skeleton style={{ height: 40, maxWidth: 320, borderRadius: 8 }} />
   </div>
   </div>
   </div>
   );
  }
  if (!lote) return (
   <div className="mx-auto max-w-2xl px-4 py-16">
   <EstadoError
   titulo="Café no disponible"
   descripcion="Este café fue retirado o aún no existe."
   etiquetaCta="Volver al Marketplace"
   href="/marketplace"
   />
   </div>
   );

 const total = sacos * lote.precioSaco;

 const hacerPedido = async () => {
 if (!me) { setFeedback("afiliate"); return; }
 const r = await api.pedidoCreate({
 loteId: lote.id, finca: lote.finca, productor: lote.productor, sacos, total,
 });
 if (!r.ok || !r.data) { setFeedback(r.error || "Error"); return; }
 const p = (r.data as { pedido: { nro: number } }).pedido;
 setNroPedido(p.nro);
 setFeedback("ok");
 };

return (
  <div className="mx-auto max-w-6xl px-4 py-10">
  <Link href="/marketplace" className="text-sm font-semibold text-green-700 hover:underline">← Volver al Marketplace</Link>

  {lote.ejemplo && (
  <div className="mt-4 flex items-start gap-3 rounded-xl border border-border-soft bg-gold-500/10 p-4 text-sm text-coffee-800">
  <span className="mt-0.5 rounded-full bg-coffee-800/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-cream-100">DEMOSTRACIÓN</span>
  <p>
  Registro demostrativo del catálogo. No representa una publicación real de la Red.
  </p>
  </div>
  )}

  <div className="mt-6 grid gap-8 lg:grid-cols-5">
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-crema lg:col-span-2">
          {lote.imagenes?.[0] ? (
          <img
          src={lote.imagenes[0]}
          alt={`Foto del lote ${lote.finca}`}
          className="aspect-[4/3] w-full object-cover"
          />
          ) : (
          <TazaCenital className="aspect-[4/3] w-full" puntaje={`${lote.score} pts`} notas={`${lote.variedad} · ${lote.proceso}`} />
          )}
  </div>

  <div className="lg:col-span-3">
  <p className="text-sm font-semibold uppercase tracking-widest text-green-700">Lote #{lote.id}</p>
  <h1 className="mt-1 font-titulo text-3xl font-bold text-coffee-900">{lote.finca}</h1>
  <p className="text-text-secondary">
  {lote.productor} · {lote.provincia} · {lote.variedad} · {lote.proceso}
  </p>
  {lote.productor_id && (
  <div className="mt-1">
  <RatingBadge memberId={lote.productor_id} />
  </div>
  )}
  <div className="mt-3 flex flex-wrap gap-1.5">
  {lote.verificado && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700"> Verificado</span>}
  <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-xs font-semibold text-coffee-800">★ {lote.score} pts</span>
  <span className="rounded-full bg-coffee-900/10 px-2 py-0.5 text-xs font-semibold text-coffee-800"> {lote.altura} msnm</span>
  </div>

  <p className="mt-4 text-text-secondary">
  Catación {lote.score}/100. Pedido mínimo: {lote.ventaMinima}. Stock disponible:
  {" "}{lote.stockSacos} sacos / {lote.stockQuintales} quintales.
  </p>

  <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-border-soft bg-white p-5">
  <div>
  <p className="text-sm text-text-muted">Sacos</p>
  <input
  type="number" min={1} max={lote.stockSacos}
  value={sacos}
  onChange={(e) => setSacos(Math.max(1, Number(e.target.value)))}
  className="mt-1 w-24 rounded-lg border border-border-soft px-3 py-2 text-lg font-bold text-coffee-900"
  />
  </div>
  <div className="flex-1">
  <p className="text-sm text-text-muted">Total a pagar</p>
  <p className="text-2xl font-bold text-coffee-900">${total.toFixed(2)}</p>
  <p className="mt-1 text-xs text-text-muted">El pago se acuerda directamente con quien produce.</p>
  </div>
  <div className="flex gap-2">
  <button onClick={hacerPedido} className="btn-primary">
  {feedback === "ok" ? " Pedido registrado" : "Solicitar compra"}
  </button>
  <a
  href={waLink(`Hola, quiero consultar por el lote ${lote.finca} (${lote.variedad}) de la Red Café Ecuador.`)}
  target="_blank" rel="noreferrer"
  className="btn-ghost"
  > WhatsApp</a>
  </div>
  </div>

  {feedback === "afiliate" && (
  <p className="mt-3 rounded-xl bg-gold-500/15 p-3 text-sm font-semibold text-coffee-900">
  Inicia sesión para comprar. <Link href="/login" className="underline text-green-700">Entrar</Link> ·{" "}
  <Link href="/afiliate" className="underline text-green-700">Afíliate</Link>.
  </p>
  )}
  {feedback === "ok" && (
  <p className="mt-3 rounded-xl bg-green-100 p-3 text-sm font-semibold text-green-700">
  Pedido #{nroPedido} registrado y visible en la bandeja del productor. Mira tus pedidos en{" "}
  <Link href="/panel?ver=comprador" className="underline">Mi Red</Link>.
  </p>
  )}
  {feedback && feedback !== "ok" && feedback !== "afiliate" && (
  <p className="mt-3 rounded-xl bg-green-700/10 p-3 text-sm font-semibold text-green-700">{feedback}</p>
  )}
  </div>
  </div>
  </div>
  );
}
