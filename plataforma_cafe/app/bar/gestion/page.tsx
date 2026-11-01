"use client";
import { DeclaracionDerechos } from "@/components/DeclaracionDerechos";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getStoredSession, setStoredSession, type ApiUser, type MenuItem } from "@/lib/api";
import { PanelEstadisticas } from "@/components/PanelEstadisticas";
import { Icono } from "@/components/Icono";

export default function BarPage() {
  const [aceptaDerechos, setAceptaDerechos] = useState(false);
  const [sesion, setSesion] = useState<ApiUser | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [ok, setOk] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [desc, setDesc] = useState("");
  const [precio, setPrecio] = useState("");
  const [cat, setCat] = useState("Café");

  useEffect(() => {
    const local = getStoredSession();
    if (local) { setSesion(local); return; }
    api.me().then((r) => {
      if (r.ok && r.data) {
        const u = (r.data as { user: ApiUser }).user;
        setStoredSession(u);
        setSesion(u);
      }
    });
  }, []);

  const cargar = () => {
    if (!sesion) return;
    api.menuList(sesion.id).then((r) => { if (r.ok && r.data) setMenu((r.data as { menu: MenuItem[] }).menu); });
  };

  useEffect(() => { cargar(); }, [sesion]);

  if (!sesion) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Icono nombre="bar" className="mx-auto h-10 w-10 text-green-700" />
        <h1 className="mt-4 font-titulo text-3xl font-bold text-coffee-900">Gestión del bar</h1>
        <p className="mt-2 text-text-secondary">Inicia sesión como bar para gestionar tu menú.</p>
        <Link href="/login" className="btn-primary mt-6">Iniciar sesión</Link>
      </div>
    );
  }

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aceptaDerechos) return;
    if (!nombre.trim() || !precio.trim()) { setOk("Nombre y precio requeridos."); return; }
    const r = await api.menuAdd({ acepta_derechos: aceptaDerechos, nombre, descripcion: desc, precio: parseFloat(precio), categoria: cat });
    if (r.ok) { setOk("Producto agregado."); setNombre(""); setDesc(""); setPrecio(""); cargar(); }
    else setOk(r.error || "Error.");
  };

  const eliminar = async (id: string) => { await api.menuDelete(id); cargar(); };
  const cats = [...new Set(menu.map((m) => m.categoria))];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-green-700">Bar · Gestión</p>
          <h1 className="mt-1 font-titulo text-3xl font-bold text-coffee-900">
            {sesion.nombre || "Mi bar / cafetería"}
          </h1>
        </div>
        <Link href="/panel" className="btn-ghost">Mi panel</Link>
      </div>

      {/* Estadísticas en vivo */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Estadísticas en vivo
        </p>
        <PanelEstadisticas showDistribucion={true} chartTitle="Tu actividad como bar" />
      </div>

      <form onSubmit={agregar} className="card mt-6 p-5">
        <p className="font-titulo text-lg font-bold text-coffee-900">Agregar producto al menú</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="sm:contents">
            <span className="sr-only">Nombre del producto</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className="rounded-lg border border-border-soft bg-surface px-3 py-2" />
          </label>
          <label className="sm:contents">
            <span className="sr-only">Descripción</span>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción" className="rounded-lg border border-border-soft bg-surface px-3 py-2" />
          </label>
          <label className="sm:contents">
            <span className="sr-only">Precio en dólares</span>
            <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio ($)" className="rounded-lg border border-border-soft bg-surface px-3 py-2" />
          </label>
          <label className="sm:contents">
            <span className="sr-only">Categoría</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-lg border border-border-soft bg-surface px-3 py-2">
              <option>Café</option><option>Bebida</option><option>Comida</option><option>Postre</option><option>Otro</option>
            </select>
          </label>
        </div>
        <button disabled={!aceptaDerechos} className="btn-primary mt-3 w-full">Agregar</button>
      <DeclaracionDerechos aceptado={aceptaDerechos} onChange={setAceptaDerechos} />
      </form>
      {ok && <p className="mt-3 rounded-xl bg-green-100 p-3 text-center text-sm font-semibold text-green-700">{ok}</p>}

      {cats.map((c) => (
        <div key={c} className="mt-6">
          <p className="mb-2 font-semibold text-coffee-900">{c}</p>
          <div className="space-y-2">
            {menu.filter((m) => m.categoria === c).map((m) => (
              <div key={m.id} className="card flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <span className="font-semibold text-coffee-900">{m.nombre}</span>
                  {m.descripcion && <span className="ml-2 text-text-muted">— {m.descripcion}</span>}
                  <span className="ml-2 font-bold text-coffee-900">${m.precio.toFixed(2)}</span>
                </div>
                <button onClick={() => eliminar(m.id)} className="text-xs font-semibold text-green-700 hover:underline">Eliminar</button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {menu.length === 0 && <p className="mt-4 card p-4 text-sm text-text-muted">Sin productos aún.</p>}
    </div>
  );
}