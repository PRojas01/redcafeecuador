"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getStoredSession, setStoredSession, type ApiUser, type MenuItem } from "@/lib/api";
import { leerBitacora, guardarBitacora } from "@/lib/sesion";

interface Turno { id: string; fecha: string; horas: number; notas: string }

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function BaristaPage() {
 const [sesion, setSesion] = useState<ApiUser | null>(null);
 const [menu, setMenu] = useState<MenuItem[]>([]);
 const [turnos, setTurnos] = useState<Turno[]>([]);
 const [ok, setOk] = useState<string | null>(null);
 const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
 const [horas, setHoras] = useState("");
 const [notas, setNotas] = useState("");

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

 useEffect(() => {
 if (!sesion) return;
 api.menuList(sesion.id).then((r) => {
 if (r.ok && r.data) setMenu((r.data as { menu: MenuItem[] }).menu);
 });
 setTurnos(leerBitacora<Turno[]>("turnos_barista", []));
 }, [sesion]);

 if (!sesion) {
 return (
 <div className="mx-auto max-w-2xl px-4 py-16 text-center">
 <span aria-hidden="true" className="mx-auto block h-10 w-10 rounded-full border border-cereza/40"></span>
 <h1 className="mt-4 font-titulo text-3xl font-bold text-cafe">Panel del Barista</h1>
 <p className="mt-2 text-pizarra/70">Inicia sesión como barista para ver el menú y registrar turnos.</p>
 <Link href="/login" className="mt-6 inline-block rounded-full bg-cereza px-6 py-3 font-semibold text-crema hover:bg-cereza/90">Iniciar sesión</Link>
 </div>
 );
 }

 const agregarTurno = (e: React.FormEvent) => {
 e.preventDefault();
 const h = parseFloat(horas);
 if (isNaN(h) || h <= 0) { setOk("Ingresa las horas trabajadas."); return; }
 const next = [...turnos, { id: uid(), fecha, horas: h, notas }];
 guardarBitacora("turnos_barista", next); setTurnos(next);
 setHoras(""); setNotas(""); setOk("Turno registrado.");
 };

 const cats = [...new Set(menu.map((m) => m.categoria))];
 const totalHoras = turnos.reduce((a, t) => a + t.horas, 0);

 return (
 <div className="mx-auto max-w-4xl px-4 py-10">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Barista</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">Mi turno de hoy</h1>
 </div>
 <Link href="/panel" className="rounded-full border border-cafe/30 px-4 py-2 text-sm font-semibold text-cafe hover:bg-cafe hover:text-crema">Mi panel</Link>
 </div>

 <div className="mt-6 rounded-2xl border border-hoja/30 bg-hoja/10 p-4">
 <p className="text-xs text-pizarra/60">Total horas registradas</p>
 <p className="text-2xl font-bold text-cafe">{totalHoras.toFixed(1)} h</p>
 </div>

 <div className="mt-6 grid gap-6 lg:grid-cols-2">
 <div>
 <h2 className="mb-3 text-lg font-semibold text-cafe">Menú disponible</h2>
 {cats.length === 0 ? (
 <p className="rounded-2xl border border-cafe/10 bg-white p-5 text-sm text-pizarra/70">Sin productos en el menú.</p>
 ) : (
 cats.map((c) => (
 <div key={c} className="mb-4">
 <p className="mb-1 text-sm font-semibold text-cafe">{c}</p>
 <div className="space-y-2">
 {menu.filter((m) => m.categoria === c).map((m) => (
 <div key={m.id} className="flex items-center justify-between rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <div>
 <span className="font-semibold text-cafe">{m.nombre}</span>
 {m.descripcion && <span className="ml-2 text-pizarra/60">— {m.descripcion}</span>}
 </div>
 <span className="font-bold text-cafe">${m.precio.toFixed(2)}</span>
 </div>
 ))}
 </div>
 </div>
 ))
 )}
 </div>

 <div>
 <h2 className="mb-3 text-lg font-semibold text-cafe">Registrar turno</h2>
 <form onSubmit={agregarTurno} className="rounded-2xl border border-cafe/10 bg-white p-5">
 <div className="space-y-3">
 <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input type="number" step="0.5" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="Horas trabajadas" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (opcional)" className="w-full rounded-lg border border-cafe/20 px-3 py-2" />
 <button className="w-full rounded-full bg-cereza px-4 py-2.5 font-semibold text-crema hover:bg-cereza/90">Registrar turno</button>
 </div>
 </form>
 {ok && <p className="mt-3 rounded-xl bg-hoja/15 p-3 text-center text-sm font-semibold text-hoja">{ok}</p>}

 {turnos.length > 0 && (
 <div className="mt-4 space-y-2">
 <p className="font-semibold text-cafe">Turnos recientes</p>
 {turnos.slice().reverse().slice(0, 10).map((t) => (
 <div key={t.id} className="rounded-xl border border-cafe/10 bg-white p-3 text-sm">
 <span className="font-semibold text-cafe">{t.horas}h</span>
 {t.notas && <span className="ml-2 text-pizarra/60">— {t.notas}</span>}
 <span className="float-right text-pizarra/50">{t.fecha}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
