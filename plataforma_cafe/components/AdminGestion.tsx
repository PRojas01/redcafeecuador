"use client";

import { useEffect, useMemo, useState } from "react";
import { CONFIG } from "@/lib/config";
import { Modal } from "@/components/Modal";
import { Toast, useToast } from "@/components/Toast";
import { FichaMiembro } from "@/components/AdminCuentas";
import { PROVINCIAS_EC } from "@/lib/paises";

/*
 Gestión de la administración que tenía API pero no pantalla:
 · AvisosTab: mensajes a todos, a un grupo (perfil, provincia, curso,
   segmento) o a miembros concretos por campana, correo y WhatsApp (wa.me).
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
/* ─────────────────────────── Avisos ─────────────────────────── */
// Textos listos para los anuncios del momento (el admin los revisa antes de enviar).
// Se borran cuando pasan (la clase gratis del 8 de octubre ya pasó).
const PLANTILLAS: { nombre: string; titulo: string; texto: string; enlace: string }[] = [];
type Destinatario = { id: string; nombre?: string; telefono: string };
type Campana = { id: string; mensaje: string; enlace?: string; destinatarios: Destinatario[]; enviados?: Record<string, string> };
type Recuento = { total: number; con_correo: number; con_whatsapp: number; sin_consentimiento: number };
const SEGMENTOS: [string, string][] = [["todos", "Todos"], ["productores_sin_lote", "Productores sin lote publicado"], ["nuevos_30_dias", "Nuevos en los últimos 30 días"]];
const chip = (on: boolean) => `flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm ${on ? "border-cafe bg-cafe text-crema" : "border-cafe/20 bg-white text-cafe"}`;
const textoWhatsapp = (titulo: string, texto: string, enlace: string) =>
  [titulo.trim() ? `*${titulo.trim()}*` : "", texto.trim(), enlace.trim() ? `https://redcafeecuador.com${enlace.trim()}` : ""].filter(Boolean).join("\n\n");

export function AvisosTab() {
  const { toast, mostrar, cerrar } = useToast();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cursos, setCursos] = useState<{ id: string; titulo: string }[]>([]);
  const [destino, setDestino] = useState<"todos" | "filtro" | "miembros">("todos");
  const [roles, setRoles] = useState<string[]>([]);
  const [provincia, setProvincia] = useState("");
  const [curso, setCurso] = useState("");
  const [segmento, setSegmento] = useState("todos");
  const [buscar, setBuscar] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [enlace, setEnlace] = useState("");
  const [campana, setCampana] = useState(true);
  const [correo, setCorreo] = useState(false);
  const [recuento, setRecuento] = useState<Recuento | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string>("");
  const [wa, setWa] = useState<Campana | null>(null);

  useEffect(() => {
    pedir("/api/members.php?action=all").then((r) => setMiembros(((r.data?.members as Miembro[]) || []).filter((m) => m && m.id)));
    pedir("/api/cursos.php?action=list").then((r) => setCursos(((r.data?.cursos as Json[]) || []).map((c) => ({ id: txt(c.id), titulo: txt(c.titulo) })).filter((c) => c.id)));
  }, []);

  const cuerpoDestino = useMemo((): Json => {
    if (destino === "todos") return { destino: "todos" };
    if (destino === "miembros") return { destino: "filtro", filtros: { ids: elegidos } };
    return { destino: "filtro", filtros: { roles, provincia, curso, segmento } };
  }, [destino, roles, provincia, curso, segmento, elegidos]);
  const filtrosWa = (cuerpoDestino.filtros as Json) || {};

  useEffect(() => {
    if (destino === "miembros" && !elegidos.length) { setRecuento({ total: 0, con_correo: 0, con_whatsapp: 0, sin_consentimiento: 0 }); return; }
    let vivo = true;
    const t = setTimeout(() => {
      pedir("/api/notificaciones.php?action=audiencia", cuerpoDestino).then((r) => { if (vivo && r.ok) setRecuento(r.data as unknown as Recuento); });
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [cuerpoDestino, destino, elegidos.length]);

  const total = recuento?.total ?? 0;
  const encontrados = buscar.trim().length >= 2
    ? miembros.filter((m) => `${m.nombre} ${m.email}`.toLowerCase().includes(buscar.trim().toLowerCase())).slice(0, 8)
    : [];
  const enlaceValido = enlace === "" || (enlace.startsWith("/") && !enlace.startsWith("//"));
  const listo = titulo.trim().length >= 3 && total > 0 && enlaceValido && !enviando && (campana || correo);
  const mensajeWa = textoWhatsapp(titulo, texto, enlace);

  const enviar = async () => {
    setConfirmar(false);
    setEnviando(true);
    const r = await pedir("/api/notificaciones.php?action=enviar", {
      ...cuerpoDestino, titulo: titulo.trim(), texto: texto.trim(), enlace: enlace.trim(), tipo: "sistema", campana, correo,
    });
    setEnviando(false);
    if (!r.ok) { mostrar("error", r.error || "No se pudo enviar el aviso."); return; }
    const c = r.data?.correo as Json | null;
    const partes = [campana ? `${r.data?.enviados} en la campana de la Red` : ""];
    if (c) partes.push(`${c.enviados} por correo${Number(c.fuera_de_tope) ? ` (${c.fuera_de_tope} quedaron fuera por el tope)` : ""}${Number(c.fallidos) ? ` · ${c.fallidos} fallidos` : ""}`);
    const linea = "Enviado: " + partes.filter(Boolean).join(" · ") + ".";
    setResultado(linea);
    mostrar("success", linea);
  };

  const prepararWhatsapp = async () => {
    if (mensajeWa.length > 1000) { mostrar("error", "Para WhatsApp el mensaje no puede pasar de 1000 caracteres."); return; }
    const r = await pedir("/api/difusion.php?action=guardar", { titulo: titulo.trim(), mensaje: [titulo.trim() ? `*${titulo.trim()}*` : "", texto.trim()].filter(Boolean).join("\n\n"), enlace: enlace.trim(), filtros: { ...filtrosWa, solo_consentimiento: true } });
    if (!r.ok) { mostrar("error", r.error || "No se pudo preparar la lista de WhatsApp."); return; }
    setWa(r.data?.campaign as unknown as Campana);
  };
  const marcar = async (uidM: string) => {
    if (!wa) return;
    const r = await pedir("/api/difusion.php?action=marcar", { id: wa.id, uid: uidM, enviado: true });
    if (r.ok) setWa(r.data?.campaign as unknown as Campana);
  };
  const enlaceWa = (tel: string) => `https://wa.me/${tel}?text=${encodeURIComponent([wa?.mensaje || "", wa?.enlace || ""].filter(Boolean).join("\n\n"))}`;

  return (
    <div className="max-w-2xl">
      {toast && <Toast {...toast} onCerrar={cerrar} />}
      <Modal
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo="Confirmar envío"
        descripcion={`«${titulo.trim()}» llegará${campana ? ` a ${total} miembro(s) en la campana de la Red` : ""}${campana && correo ? " y" : ""}${correo ? ` a ${recuento?.con_correo ?? 0} por correo` : ""}. No se puede deshacer.`}
        pie={<>
          <button className="btn-ghost" onClick={() => setConfirmar(false)}>Cancelar</button>
          <button className="btn-primary" onClick={enviar}>Enviar</button>
        </>}
      />
      <h2 className="font-titulo text-xl font-semibold text-cafe">Mensajes a los miembros</h2>
      <p className="mt-1 text-sm text-pizarra/70">
        Un mensaje, tres canales: la campana de la Red (y notificación push), el correo y WhatsApp.
        Por correo y WhatsApp solo llega a quien aceptó recibir novedades; cada correo lleva su enlace de baja.
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
            {([["todos", "Todos los miembros"], ["filtro", "Un grupo (perfil, provincia, curso)"], ["miembros", "Miembros concretos"]] as const).map(([v, l]) => (
              <label key={v} className={chip(destino === v)}>
                <input type="radio" name="aviso-destino" value={v} checked={destino === v} onChange={() => { setDestino(v); setWa(null); }} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>

        {destino === "filtro" && (
          <div className="space-y-3 rounded-xl border border-cafe/10 bg-white p-3">
            <fieldset>
              <legend className={rotulo}>Perfiles (ninguno = todos)</legend>
              <div className="flex flex-wrap gap-2">
                {PERFILES.map(([v, l]) => (
                  <label key={v} className={chip(roles.includes(v))}>
                    <input type="checkbox" className="sr-only" checked={roles.includes(v)}
                      onChange={() => setRoles((r) => (r.includes(v) ? r.filter((x) => x !== v) : [...r, v]))} />
                    {l}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="aviso-provincia" className={rotulo}>Provincia</label>
                <select id="aviso-provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} className={campo}>
                  <option value="">Todas</option>
                  {PROVINCIAS_EC.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="aviso-curso" className={rotulo}>Curso</label>
                <select id="aviso-curso" value={curso} onChange={(e) => setCurso(e.target.value)} className={campo}>
                  <option value="">Cualquiera</option>
                  {cursos.map((c) => <option key={c.id} value={c.id}>{c.titulo || c.id}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="aviso-segmento" className={rotulo}>Segmento</label>
                <select id="aviso-segmento" value={segmento} onChange={(e) => setSegmento(e.target.value)} className={campo}>
                  {SEGMENTOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
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

        <p className="rounded-xl bg-crema p-3 text-sm text-cafe" role="status">
          {recuento
            ? <>Alcance: <strong>{recuento.total}</strong> miembro(s) · con correo y permiso: <strong>{recuento.con_correo}</strong> · con WhatsApp y permiso: <strong>{recuento.con_whatsapp}</strong>{recuento.sin_consentimiento ? ` · ${recuento.sin_consentimiento} no aceptaron novedades` : ""}</>
            : "Calculando el alcance…"}
        </p>

        <div>
          <label htmlFor="aviso-titulo" className={rotulo}>Título o asunto *</label>
          <input id="aviso-titulo" value={titulo} maxLength={140} onChange={(e) => setTitulo(e.target.value)} className={campo}
            placeholder="Ej.: Charla gratuita este sábado" required />
        </div>
        <div>
          <label htmlFor="aviso-texto" className={rotulo}>Mensaje</label>
          <textarea id="aviso-texto" value={texto} maxLength={2000} rows={5} onChange={(e) => setTexto(e.target.value)} className={campo} />
          <p className="mt-1 text-xs text-pizarra/60">{texto.length}/2000 · la campana muestra los primeros 400; WhatsApp admite hasta 1000.</p>
        </div>
        <div>
          <label htmlFor="aviso-enlace" className={rotulo}>Enlace dentro de la Red (opcional)</label>
          <input id="aviso-enlace" value={enlace} onChange={(e) => setEnlace(e.target.value)} className={campo} placeholder="/comunidad/" />
          {!enlaceValido && <p className="mt-1 text-sm text-cereza">Usa una ruta de la Red que empiece por «/», por ejemplo /academia/.</p>}
        </div>

        <fieldset className="space-y-2">
          <legend className={rotulo}>Canales</legend>
          <label className="flex min-h-11 items-start gap-3 rounded-xl bg-crema p-3 text-sm text-cafe">
            <input type="checkbox" checked={campana} onChange={(e) => setCampana(e.target.checked)} className="mt-0.5 h-5 w-5" />
            <span>Campana de la Red<span className="block text-pizarra/70">A todo el alcance: {total}. Incluye notificación push si la activaron.</span></span>
          </label>
          <label className="flex min-h-11 items-start gap-3 rounded-xl bg-crema p-3 text-sm text-cafe">
            <input type="checkbox" checked={correo} onChange={(e) => setCorreo(e.target.checked)} className="mt-0.5 h-5 w-5" />
            <span>Correo<span className="block text-pizarra/70">Solo a quien aceptó novedades: {recuento?.con_correo ?? 0}. Se envía por tandas con enlace de baja.</span></span>
          </label>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!listo} className="btn-primary min-h-11 disabled:opacity-50">
            {enviando ? "Enviando…" : "Enviar por campana / correo"}
          </button>
          {resultado && <p className="text-sm text-hoja" role="status">{resultado}</p>}
        </div>
      </form>

      <section className="mt-6 rounded-xl border border-cafe/10 bg-white p-4" aria-labelledby="wa-titulo">
        <h3 id="wa-titulo" className="font-titulo text-lg font-semibold text-cafe">WhatsApp</h3>
        <p className="mt-1 text-sm text-pizarra/70">
          Sin coste: WhatsApp se abre con el mensaje ya escrito y tú pulsas enviar. A un grupo: elige el grupo al abrirse.
          A cada miembro: prepara la lista y ve marcando los enviados.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className={`btn-ghost min-h-11 px-4 ${titulo.trim().length < 3 ? "pointer-events-none opacity-50" : ""}`} aria-disabled={titulo.trim().length < 3}
            href={`https://wa.me/?text=${encodeURIComponent(mensajeWa)}`} target="_blank" rel="noreferrer">
            Enviar a un grupo o contacto
          </a>
          <button type="button" className="btn-ghost min-h-11 px-4 disabled:opacity-50" disabled={titulo.trim().length < 3 || !recuento?.con_whatsapp}
            onClick={prepararWhatsapp}>
            Preparar lista uno a uno ({recuento?.con_whatsapp ?? 0})
          </button>
        </div>
        {wa && (
          <div className="mt-3">
            <p className="text-sm text-cafe" role="status">
              Enviados {Object.keys(wa.enviados || {}).length} de {wa.destinatarios.length}. La lista queda guardada en «Avisos por WhatsApp» del Dashboard.
            </p>
            <ul className="mt-2 max-h-96 divide-y divide-cafe/10 overflow-y-auto rounded-lg border border-cafe/10">
              {wa.destinatarios.map((d) => {
                const hecho = !!wa.enviados?.[d.id];
                return (
                  <li key={d.id} className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="font-semibold text-cafe">{d.nombre || d.id}{hecho && <span className="ml-2 font-normal text-hoja">✓ enviado</span>}</span>
                    <a className="btn-primary !px-4 !py-2 text-sm" href={enlaceWa(d.telefono)} target="_blank" rel="noreferrer" onClick={() => marcar(d.id)}>
                      Abrir WhatsApp
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
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
