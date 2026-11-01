"use client";

import { useEffect, useMemo, useState } from "react";
import { CONFIG } from "@/lib/config";
import { Modal } from "@/components/Modal";
import { Toast, useToast } from "@/components/Toast";
import { FichaMiembro } from "@/components/AdminCuentas";

/*
 Gestión de la administración que tenía API pero no pantalla:
 · AvisosTab: avisos internos (campana + push) a todos, por perfil o a
   miembros concretos, con copia opcional por correo a quien aceptó novedades.
 · ReportesTab: problemas que reportan los miembros; responder y cerrar.
 · ModeracionTab: lo que publican los miembros fuera de lotes y cursos
   (servicios, requerimientos, empleos, búsquedas de empleo, comunidad).
 La API autoriza cada acción: sin sesión de administración responde 403.
*/

type Json = Record<string, unknown>;
async function pedir(ruta: string, cuerpo?: Json): Promise<{ ok: boolean; data?: Json; error?: string }> {
  try {
    const r = await fetch(CONFIG.api(ruta), {
      method: cuerpo ? "POST" : "GET",
      credentials: "include",
      cache: "no-store",
      headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    return { ok: !!j.ok, data: j.data, error: j.error || (r.ok ? undefined : `Error ${r.status}`) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
const txt = (v: unknown) => (v == null ? "" : String(v));
const fecha = (v: unknown) => { const d = new Date(txt(v)); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" }); };
const campo = "w-full rounded-lg border border-cafe/20 bg-white px-3 py-2.5 text-base text-cafe";
const rotulo = "mb-1 block text-sm font-semibold text-cafe/80";

const PERFILES: [string, string][] = [
  ["productor", "Productores"], ["comprador", "Compradores"], ["vendedor", "Vendedores / tostadores"],
  ["exportador", "Exportadores"], ["asesor", "Asesores expertos"], ["bar", "Bares y cafeterías"],
  ["barista", "Baristas"], ["certificador", "Certificadores / catadores"], ["transportista", "Transportistas"],
  ["pilador", "Piladores"], ["proveedor", "Proveedores"],
];

type Miembro = { id: string; nombre?: string; email?: string; rol?: string; roles?: string[]; activo?: boolean; estado?: string; acepta_marketing?: boolean; consentimientos?: { marketing?: { aceptado?: boolean } } };
const rolesDe = (m: Miembro) => (m.roles && m.roles.length ? m.roles : m.rol ? [m.rol] : []);
const aceptaCorreo = (m: Miembro) =>
  m.activo !== false && !["bloqueado", "suspendido", "eliminado"].includes(txt(m.estado)) &&
  (!!m.acepta_marketing || !!m.consentimientos?.marketing?.aceptado);

/* ─────────────────────────── Avisos ─────────────────────────── */
// Textos listos para los anuncios del momento (el admin los revisa antes de enviar).
// Se borran cuando pasan (la clase gratis del 8 de octubre ya pasó).
const PLANTILLAS: { nombre: string; titulo: string; texto: string; enlace: string }[] = [];
export function AvisosTab() {
  const { toast, mostrar, cerrar } = useToast();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [destino, setDestino] = useState<"todos" | "rol" | "miembros">("todos");
  const [rol, setRol] = useState("productor");
  const [buscar, setBuscar] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [enlace, setEnlace] = useState("");
  const [correo, setCorreo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string>("");

  useEffect(() => {
    pedir("/api/members.php?action=all").then((r) => setMiembros(((r.data?.members as Miembro[]) || []).filter((m) => m && m.id)));
  }, []);

  const alcance = useMemo(() => {
    if (destino === "todos") return miembros;
    if (destino === "rol") return miembros.filter((m) => rolesDe(m).includes(rol));
    return miembros.filter((m) => elegidos.includes(m.id));
  }, [destino, rol, elegidos, miembros]);
  const conCorreo = alcance.filter(aceptaCorreo).length;
  const encontrados = buscar.trim().length >= 2
    ? miembros.filter((m) => `${m.nombre} ${m.email}`.toLowerCase().includes(buscar.trim().toLowerCase())).slice(0, 8)
    : [];
  const enlaceValido = enlace === "" || (enlace.startsWith("/") && !enlace.startsWith("//"));
  const listo = titulo.trim().length >= 3 && alcance.length > 0 && enlaceValido && !enviando;

  const enviar = async () => {
    setConfirmar(false);
    setEnviando(true);
    const r = await pedir("/api/notificaciones.php?action=enviar", {
      destino, rol, ids: elegidos, titulo: titulo.trim(), texto: texto.trim(), enlace: enlace.trim(), tipo: "sistema", correo,
    });
    setEnviando(false);
    if (!r.ok) { mostrar("error", r.error || "No se pudo enviar el aviso."); return; }
    const c = r.data?.correo as Json | null;
    const linea = `Aviso enviado a ${r.data?.enviados} miembro(s) en la Red` +
      (c ? ` · ${c.enviados} por correo${Number(c.fuera_de_tope) ? ` (${c.fuera_de_tope} quedaron fuera por el tope de 250)` : ""}${Number(c.fallidos) ? ` · ${c.fallidos} fallidos` : ""}` : "");
    setResultado(linea);
    mostrar("success", linea);
    setTitulo(""); setTexto(""); setEnlace(""); setCorreo(false);
  };

  return (
    <div className="max-w-2xl">
      {toast && <Toast {...toast} onCerrar={cerrar} />}
      <Modal
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo="Confirmar envío"
        descripcion={`«${titulo.trim()}» llegará a ${alcance.length} miembro(s) en la campana de la Red${correo ? ` y a ${Math.min(conCorreo, 250)} por correo` : ""}. No se puede deshacer.`}
        pie={<>
          <button className="btn-ghost" onClick={() => setConfirmar(false)}>Cancelar</button>
          <button className="btn-primary" onClick={enviar}>Enviar aviso</button>
        </>}
      />
      <h2 className="font-titulo text-xl font-semibold text-cafe">Avisos a los miembros</h2>
      <p className="mt-1 text-sm text-pizarra/70">
        Llega a la campana de cada miembro y, si activó las notificaciones del navegador, también como notificación push.
        Para WhatsApp usa «Avisos por WhatsApp» en el Dashboard.
      </p>

      {PLANTILLAS.length > 0 && <div className="mt-4 rounded-xl border border-cafe/10 bg-white p-3">
        <p className="text-sm font-semibold text-cafe">Plantillas</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PLANTILLAS.map((pl) => (
            <button key={pl.nombre} type="button" className="btn-ghost min-h-11 px-4"
              onClick={() => { setDestino("todos"); setTitulo(pl.titulo); setTexto(pl.texto); setEnlace(pl.enlace); setCorreo(true); setResultado(""); }}>
              {pl.nombre}
            </button>
          ))}
        </div>
      </div>}

      <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); if (listo) setConfirmar(true); }}>
        <fieldset>
          <legend className={rotulo}>¿A quién?</legend>
          <div className="flex flex-wrap gap-2">
            {([["todos", "Todos los miembros"], ["rol", "Un perfil"], ["miembros", "Miembros concretos"]] as const).map(([v, l]) => (
              <label key={v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm ${destino === v ? "border-cafe bg-cafe text-crema" : "border-cafe/20 bg-white text-cafe"}`}>
                <input type="radio" name="aviso-destino" value={v} checked={destino === v} onChange={() => setDestino(v)} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>

        {destino === "rol" && (
          <div>
            <label htmlFor="aviso-rol" className={rotulo}>Perfil</label>
            <select id="aviso-rol" value={rol} onChange={(e) => setRol(e.target.value)} className={campo}>
              {PERFILES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}

        {destino === "miembros" && (
          <div>
            <label htmlFor="aviso-buscar" className={rotulo}>Buscar por nombre o correo</label>
            <input id="aviso-buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} className={campo} autoComplete="off" />
            {encontrados.length > 0 && (
              <ul className="mt-2 divide-y divide-cafe/10 rounded-lg border border-cafe/10 bg-white">
                {encontrados.map((m) => (
                  <li key={m.id}>
                    <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm"
                      onClick={() => { setElegidos((e) => (e.includes(m.id) ? e : [...e, m.id])); setBuscar(""); }}>
                      <span className="font-semibold text-cafe">{m.nombre}</span>
                      <span className="truncate text-pizarra/60">{m.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {elegidos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {elegidos.map((id) => {
                  const m = miembros.find((x) => x.id === id);
                  return (
                    <button key={id} type="button" onClick={() => setElegidos((e) => e.filter((x) => x !== id))}
                      className="min-h-9 rounded-full bg-crema px-3 text-sm text-cafe" aria-label={`Quitar a ${m?.nombre || id}`}>
                      {m?.nombre || id} ×
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="aviso-titulo" className={rotulo}>Título *</label>
          <input id="aviso-titulo" value={titulo} maxLength={140} onChange={(e) => setTitulo(e.target.value)} className={campo}
            placeholder="Ej.: Charla gratuita este sábado" required />
        </div>
        <div>
          <label htmlFor="aviso-texto" className={rotulo}>Mensaje</label>
          <textarea id="aviso-texto" value={texto} maxLength={400} rows={4} onChange={(e) => setTexto(e.target.value)} className={campo} />
          <p className="mt-1 text-xs text-pizarra/60">{texto.length}/400</p>
        </div>
        <div>
          <label htmlFor="aviso-enlace" className={rotulo}>Enlace dentro de la Red (opcional)</label>
          <input id="aviso-enlace" value={enlace} onChange={(e) => setEnlace(e.target.value)} className={campo} placeholder="/comunidad/" />
          {!enlaceValido && <p className="mt-1 text-sm text-cereza">Usa una ruta de la Red que empiece por «/», por ejemplo /academia/.</p>}
        </div>
        <label className="flex min-h-11 items-start gap-3 rounded-xl bg-crema p-3 text-sm text-cafe">
          <input type="checkbox" checked={correo} onChange={(e) => setCorreo(e.target.checked)} className="mt-0.5 h-5 w-5" />
          <span>
            Enviar también por correo
            <span className="block text-pizarra/70">
              Solo a quienes aceptaron recibir novedades: {conCorreo} de {alcance.length}. Cada correo lleva su enlace de baja. Máximo 250 por envío.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!listo} className="btn-primary min-h-11 disabled:opacity-50">
            {enviando ? "Enviando…" : `Enviar a ${alcance.length} miembro(s)`}
          </button>
          {resultado && <p className="text-sm text-hoja" role="status">{resultado}</p>}
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────── Reportes ─────────────────────────── */
type Reporte = { id: string; ts?: string; nombre?: string; email?: string; categoria?: string; asunto?: string; detalle?: string; url?: string; estado?: string; respuesta?: string; reportado_id?: string; reportado_nombre?: string; historial?: { respuesta?: string }[] };
const ESTADOS_REPORTE: [string, string][] = [["abierto", "Abierto"], ["en-proceso", "En proceso"], ["resuelto", "Resuelto"], ["cerrado", "Cerrado"]];

export function ReportesTab() {
  const { toast, mostrar, cerrar } = useToast();
  const [lista, setLista] = useState<Reporte[] | null>(null);
  const [filtro, setFiltro] = useState("abierto");
  const [respuestas, setRespuestas] = useState<Record<string, { texto: string; estado: string }>>({});
  const [ficha, setFicha] = useState("");

  const cargar = async () => {
    const r = await pedir(`/api/reportes.php?action=list${filtro ? `&estado=${filtro}` : ""}`);
    setLista((r.data?.reportes as Reporte[]) || []);
  };
  useEffect(() => { setLista(null); cargar(); }, [filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  const responder = async (rep: Reporte) => {
    const d = respuestas[rep.id] || { texto: "", estado: "resuelto" };
    const r = await pedir("/api/reportes.php?action=responder", { id: rep.id, estado: d.estado, respuesta: d.texto.trim() });
    if (!r.ok) { mostrar("error", r.error || "No se pudo guardar."); return; }
    mostrar("success", "Respuesta guardada: el miembro la verá en «Mis reportes».");
    cargar();
  };

  return (
    <div>
      {toast && <Toast {...toast} onCerrar={cerrar} />}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-titulo text-xl font-semibold text-cafe">Reportes de los miembros</h2>
        <label className="flex items-center gap-2 text-sm text-cafe">
          Estado
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="min-h-11 rounded-lg border border-cafe/20 bg-white px-3 text-base">
            <option value="">Todos</option>
            {ESTADOS_REPORTE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      {lista === null && <p className="text-sm text-pizarra/60">Cargando…</p>}
      {lista && !lista.length && <p className="rounded-xl bg-white p-4 text-sm text-pizarra/70">No hay reportes {filtro ? `en estado «${filtro}»` : ""}.</p>}
      <div className="grid gap-3">
        {lista?.map((rep) => {
          const d = respuestas[rep.id] || { texto: rep.respuesta || "", estado: rep.estado === "abierto" ? "en-proceso" : rep.estado || "resuelto" };
          return (
            <article key={rep.id} className="rounded-xl border border-cafe/10 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-cafe">{rep.asunto}</h3>
                <span className="rounded-full bg-crema px-2 py-0.5 text-xs font-semibold text-cafe">{rep.estado}</span>
              </div>
              <p className="mt-1 text-sm text-pizarra/70">{rep.nombre} · {rep.email} · {rep.categoria} · {fecha(rep.ts)}</p>
              {rep.detalle && <p className="mt-2 whitespace-pre-line text-sm text-cafe">{rep.detalle}</p>}
              {rep.url && <p className="mt-1 break-all text-sm"><a className="text-latte underline" href={rep.url}>{rep.url}</a></p>}
              {rep.reportado_id && (
                <div className="mt-2 rounded-lg bg-crema p-2 text-sm">
                  <span>Miembro reportado: <strong>{rep.reportado_nombre || rep.reportado_id}</strong></span>
                  <button type="button" className="btn-ghost ml-2 min-h-11 px-4" onClick={() => setFicha(ficha === rep.id ? "" : rep.id)}>{ficha === rep.id ? "Cerrar ficha" : "Ver ficha y actuar"}</button>
                  {ficha === rep.id && <div className="mt-2"><FichaMiembro uid={rep.reportado_id} reporteId={rep.id} onCerrar={() => setFicha("")} /></div>}
                </div>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <label className="sr-only" htmlFor={`resp-${rep.id}`}>Respuesta</label>
                <textarea id={`resp-${rep.id}`} rows={2} value={d.texto} placeholder="Respuesta para el miembro"
                  onChange={(e) => setRespuestas((x) => ({ ...x, [rep.id]: { ...d, texto: e.target.value } }))} className={campo} />
                <label className="sr-only" htmlFor={`est-${rep.id}`}>Nuevo estado</label>
                <select id={`est-${rep.id}`} value={d.estado} onChange={(e) => setRespuestas((x) => ({ ...x, [rep.id]: { ...d, estado: e.target.value } }))}
                  className="min-h-11 rounded-lg border border-cafe/20 bg-white px-3 text-base">
                  {ESTADOS_REPORTE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="btn-primary min-h-11" onClick={() => responder(rep)}>Guardar</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── Moderación ─────────────────────────── */
type Fuente = { id: string; label: string; lista: string; clave: string; borrar: string; titulo: (x: Json) => string; autor: (x: Json) => string; ver?: string };
const FUENTES: Fuente[] = [
  { id: "servicios", label: "Servicios de miembros", lista: "/api/marketplace-servicios.php?action=list", clave: "servicios", borrar: "/api/marketplace-servicios.php?action=delete",
    titulo: (x) => txt(x.titulo || x.nombre), autor: (x) => txt(x.autor || x.proveedor || x.published_by), ver: "/servicios/" },
  { id: "requerimientos", label: "Requerimientos de café", lista: "/api/requerimientos.php?action=list", clave: "requerimientos", borrar: "/api/requerimientos.php?action=delete",
    titulo: (x) => txt(x.titulo), autor: (x) => txt(x.empresa || x.autor) },
  { id: "empleos", label: "Ofertas de empleo", lista: "/api/empleos.php?action=list", clave: "empleos", borrar: "/api/empleos.php?action=delete",
    titulo: (x) => txt(x.titulo), autor: (x) => txt(x.empresa || x.autor) },
  { id: "busquedas", label: "Busco empleo", lista: "/api/busco-empleo.php?action=list", clave: "busquedas", borrar: "/api/busco-empleo.php?action=delete",
    titulo: (x) => txt(x.titulo), autor: (x) => txt(x.autor || x.nombre) },
  { id: "comunidad", label: "Comunidad", lista: "/api/comunidad.php?action=list", clave: "posts", borrar: "/api/comunidad.php?action=delete",
    titulo: (x) => txt(x.titulo || txt(x.text).slice(0, 90)), autor: (x) => txt(x.autor || x.autor_nombre), ver: "/comunidad/" },
];

export function ModeracionTab() {
  const { toast, mostrar, cerrar } = useToast();
  const [fuente, setFuente] = useState<Fuente>(FUENTES[0]);
  const [items, setItems] = useState<Json[] | null>(null);
  const [buscar, setBuscar] = useState("");
  const [borrando, setBorrando] = useState<Json | null>(null);

  const cargar = async (f: Fuente) => {
    setItems(null);
    const r = await pedir(f.lista);
    setItems(((r.data?.[f.clave] as Json[]) || []).filter((x) => x && x.id && !x.demo && !x.ejemplo));
  };
  useEffect(() => { cargar(fuente); }, [fuente]);

  const borrar = async () => {
    const x = borrando; setBorrando(null);
    if (!x) return;
    const id = txt(x.id);
    const r = await pedir(`${fuente.borrar}&id=${encodeURIComponent(id)}`, { id });
    if (!r.ok) { mostrar("error", r.error || "No se pudo eliminar."); return; }
    mostrar("success", "Eliminado.");
    cargar(fuente);
  };

  const q = buscar.trim().toLowerCase();
  const visibles = (items || []).filter((x) => !q || `${fuente.titulo(x)} ${fuente.autor(x)} ${txt(x.provincia)}`.toLowerCase().includes(q));

  return (
    <div>
      {toast && <Toast {...toast} onCerrar={cerrar} />}
      <Modal
        abierto={borrando !== null}
        onCerrar={() => setBorrando(null)}
        titulo="Confirmar eliminación"
        descripcion={borrando ? `¿Eliminar «${fuente.titulo(borrando)}»? Desaparece de la Red y no se puede deshacer.` : undefined}
        pie={<>
          <button className="btn-ghost" onClick={() => setBorrando(null)}>Cancelar</button>
          <button className="btn-primary" onClick={borrar}>Eliminar</button>
        </>}
      />
      <h2 className="font-titulo text-xl font-semibold text-cafe">Moderación de publicaciones</h2>
      <p className="mt-1 text-sm text-pizarra/70">Lotes, cursos y miembros se gestionan en sus pestañas; la verificación, en «Verificaciones» del Dashboard.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Tipo de publicación">
        {FUENTES.map((f) => (
          <button key={f.id} role="tab" aria-selected={f.id === fuente.id} onClick={() => setFuente(f)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${f.id === fuente.id ? "bg-cafe text-crema" : "border border-cafe/20 bg-white text-cafe"}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <label htmlFor="mod-buscar" className="sr-only">Buscar</label>
        <input id="mod-buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por título, autor o provincia" className={campo} />
      </div>
      {items === null && <p className="mt-3 text-sm text-pizarra/60">Cargando…</p>}
      {items && <p className="mt-3 text-sm text-pizarra/60">{visibles.length} publicación(es)</p>}
      <ul className="mt-2 grid gap-2">
        {visibles.map((x) => (
          <li key={txt(x.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cafe/10 bg-white p-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-cafe">{fuente.titulo(x) || "(sin título)"}</p>
              <p className="text-sm text-pizarra/70">
                {[fuente.autor(x), txt(x.provincia), txt(x.estado), fecha(x.created_at)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex gap-2">
              {fuente.ver && <a href={fuente.ver} className="btn-ghost min-h-11">Ver</a>}
              <button onClick={() => setBorrando(x)} className="min-h-11 rounded-full border border-cereza/40 px-4 text-sm font-semibold text-cereza">Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
