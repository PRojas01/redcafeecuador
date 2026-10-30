"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, type ApiUser, type ChatRoom, type ChatMessage, type ChatContact } from "@/lib/api";

type MemberBrief = ChatContact;

export default function ChatPage() {
 const [me, setMe] = useState<ApiUser | null>(null);
 const [members, setMembers] = useState<MemberBrief[]>([]);
 const [rooms, setRooms] = useState<ChatRoom[]>([]);
 const [active, setActive] = useState<string | null>(null);
 const [msgs, setMsgs] = useState<ChatMessage[]>([]);
 const [text, setText] = useState("");
 const [error, setError] = useState<string | null>(null);
 const lastTsRef = useRef<string>("");

 useEffect(() => {
 (async () => {
 const m = await api.me();
 let user = (m.data as { user?: ApiUser | null } | undefined)?.user ?? null;
 if (!user) {
 const admin = await api.adminMe();
 if (admin.ok && (admin.data as { admin?: boolean } | undefined)?.admin) {
 user = { id: "redcafe_admin", nombre: "Admin Red Café Ecuador", email: "", rol: "admin", roles: ["admin"], plan: "admin" };
 }
 }
 if (!m.ok && !user) { window.location.href = "/login"; return; }
 if (!user) { window.location.href = "/login"; return; }
 setMe(user);
 const [ls, rs] = await Promise.all([api.chatContacts(), api.chatRooms()]);
 const target = new URLSearchParams(window.location.search).get("user");
 if (ls.ok && ls.data) {
 const list = (ls.data as { members: MemberBrief[] }).members.filter((x) => x.id !== user.id);
 setMembers(list);
 if (target && list.some((x) => x.id === target)) {
 const opened = await api.chatOpen(target);
 if (opened.ok && opened.data) {
 const rid = (opened.data as { room: string }).room;
 setActive(rid);
 setMsgs([]);
 lastTsRef.current = "";
 setRooms((prev) => {
 if (prev.find((x) => x.id === rid)) return prev;
 return [{ id: rid, users: [user.id, target], with: target, last: null, unread: 0 }, ...prev];
 });
 }
 }
 }
 if (rs.ok && rs.data) setRooms((rs.data as { rooms: ChatRoom[] }).rooms);
 })();
 }, []);

 // Polling de rooms para badges
 useEffect(() => {
 const t = setInterval(async () => {
 const r = await api.chatRooms();
 if (r.ok && r.data) setRooms((r.data as { rooms: ChatRoom[] }).rooms);
 }, 4000);
 return () => clearInterval(t);
 }, []);

 // Polling de mensajes del room activo
 useEffect(() => {
 if (!active) return;
 let stop = false;
 const tick = async () => {
 const since = lastTsRef.current || "";
 const r = await api.chatMessages(active, since);
 if (stop) return;
 if (r.ok && r.data) {
 const list = (r.data as { messages: ChatMessage[] }).messages;
 if (list.length > 0) {
 setMsgs((prev) => [...prev, ...list]);
 lastTsRef.current = list[list.length - 1].ts;
 }
 }
 };
 tick();
 const t = setInterval(tick, 3000);
 return () => { stop = true; clearInterval(t); };
 }, [active]);

 const abrir = async (otherId: string) => {
 setError(null);
 const r = await api.chatOpen(otherId);
 if (!r.ok || !r.data) { setError(r.error || "Error"); return; }
 const rid = (r.data as { room: string }).room;
 setActive(rid);
 setMsgs([]);
 lastTsRef.current = "";
 const list = members.find((m) => m.id === otherId);
 if (list) {
 setRooms((prev) => {
 if (prev.find((x) => x.id === rid)) return prev;
 return [{ id: rid, users: [me!.id, otherId], with: otherId, last: null, unread: 0 }, ...prev];
 });
 }
 };

 const enviar = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!active || !text.trim()) return;
 const t = text;
 setText("");
 await api.chatSend(active, t);
 };

 if (!me) return null;

 const nombreCon = (id: string) => members.find((m) => m.id === id)?.nombre ?? id.slice(0, 6);
 const rolesCon = (m: MemberBrief) => (m.roles?.length ? m.roles : [m.rol]).join(" · ");
 const relacionTexto = (relacion?: ChatRoom["relacion"] | ChatContact["relacion"]) => {
 if (!relacion) return "";
 if (relacion.tipo === "pedido") return `Pedido ${relacion.ref} · ${relacion.estado}`;
 if (relacion.tipo === "cotizacion") return `Cotización ${relacion.ref} · ${relacion.estado}`;
 return "Soporte con administración";
 };

 return (
 <div className="mx-auto max-w-6xl px-4 py-10">
 <p className="text-sm font-semibold uppercase tracking-widest text-cereza">Mensajería</p>
 <h1 className="mt-1 font-titulo text-3xl font-bold text-cafe">Chat de operaciones</h1>
 <p className="mt-2 text-sm text-pizarra/70">
 Entre miembros, el chat se activa cuando existe una cotización, pedido o compra.
 Todos los miembros también pueden escribir a administración para soporte.
 </p>

 <div className="mt-6 grid gap-4 lg:grid-cols-3">
 <div className="rounded-2xl border border-cafe/10 bg-white p-4">
 <p className="font-titulo text-lg font-bold text-cafe">Conversaciones</p>
 <div className="mt-3 space-y-2">
 {rooms.length === 0 && <p className="text-xs text-pizarra/50">Sin conversaciones aún. Inicia una abajo.</p>}
 {rooms.map((r) => (
 <button
 key={r.id}
 onClick={() => { setActive(r.id); setMsgs([]); lastTsRef.current = ""; }}
 className={`w-full rounded-xl border p-3 text-left ${active === r.id ? "border-cereza bg-cereza/5" : "border-cafe/10"}`}
 >
 <div className="flex items-center justify-between">
 <p className="font-semibold text-cafe">{nombreCon(r.with)}</p>
 {r.unread > 0 && (
 <span className="rounded-full bg-cereza px-2 py-0.5 text-xs font-bold text-crema">{r.unread}</span>
 )}
 </div>
 {r.relacion && (
 <p className="mt-1 text-xs font-semibold text-pizarra/50">
 {relacionTexto(r.relacion)}
 </p>
 )}
 {r.last && (
 <p className="mt-1 truncate text-xs text-pizarra/60">
 {r.last.from === me.id ? "Tú: " : ""}{r.last.text}
 </p>
 )}
 </button>
 ))}
 </div>

 <p className="mt-5 font-titulo text-sm font-bold text-cafe">Conexiones comerciales</p>
 <div className="mt-2 max-h-56 overflow-auto pr-1 space-y-1">
 {members.length === 0 && (
 <p className="rounded-lg bg-crema p-3 text-xs text-pizarra/60">
 Aún no tienes contactos comerciales habilitados. Se activan cuando solicitas una cotización, recibes una cotización o se crea un pedido.
 </p>
 )}
 {members.map((m) => (
 <button key={m.id} onClick={() => abrir(m.id)} className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-cafe/5">
 <span className="flex items-center justify-between gap-2">
 <span className="font-semibold text-cafe">{m.nombre}</span>
 <span className="text-xs text-pizarra/50">{rolesCon(m)}</span>
 </span>
 {m.relacion && (
 <span className="mt-1 block text-xs text-pizarra/50">
 {relacionTexto(m.relacion)}
 </span>
 )}
 </button>
 ))}
 </div>
 </div>

 <div className="lg:col-span-2 rounded-2xl border border-cafe/10 bg-white p-4">
 {!active ? (
 <p className="text-sm text-pizarra/60">Selecciona una conversación vinculada a una operación comercial.</p>
 ) : (
 <div className="flex h-[480px] flex-col">
 <div className="border-b border-cafe/10 pb-2 text-sm font-semibold text-cafe">
 {nombreCon(rooms.find((r) => r.id === active)?.with ?? "")}
 </div>
 <div className="flex-1 space-y-2 overflow-auto py-3">
 {msgs.length === 0 && <p className="text-xs text-pizarra/50">Sin mensajes. ¡Escribe el primero!</p>}
 {msgs.map((m) => (
 <div key={m.id} className={`flex ${m.from === me.id ? "justify-end" : "justify-start"}`}>
 <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.from === me.id ? "bg-cafe text-crema" : "bg-crema text-pizarra"}`}>
 <p>{m.text}</p>
 <p className={`mt-1 text-[10px] ${m.from === me.id ? "text-crema/70" : "text-pizarra/50"}`}>
 {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
 </p>
 </div>
 </div>
 ))}
 </div>
 <form onSubmit={enviar} className="mt-2 flex gap-2 border-t border-cafe/10 pt-2">
 <input
 value={text}
 onChange={(e) => setText(e.target.value)}
 placeholder="Escribe un mensaje…"
 className="flex-1 rounded-lg border border-cafe/20 px-3 py-2 text-sm"
 />
 <button className="rounded-full bg-cereza px-4 py-2 text-sm font-semibold text-crema hover:bg-cereza/90">Enviar</button>
 </form>
 {error && <p className="mt-2 text-xs text-cereza">{error}</p>}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
