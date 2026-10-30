"use client";

import { useEffect, useMemo, useState } from "react";
import { CONFIG } from "@/lib/config";
import { Modal } from "@/components/Modal";
import { Toast, useToast } from "@/components/Toast";

/*
 Cuentas: ficha del miembro, contacto interno/externo y medidas con debido
 proceso (api/moderacion.php). Cada medida exige hechos, la infracción del
 catálogo (que cita la regla de los Términos o de la LOPDP), una medida
 proporcional y, para el bloqueo indefinido, evidencias. La persona recibe la
 notificación formal y puede apelar; aquí se resuelve con una respuesta
 motivada que queda registrada.
*/

type Json = Record<string, unknown>;
async function api(ruta: string, cuerpo?: Json): Promise<{ ok: boolean; data?: Json; error?: string }> {
  try {
    const r = await fetch(CONFIG.api(ruta), {
      method: cuerpo ? "POST" : "GET", credentials: "include", cache: "no-store",
      headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    return { ok: !!j.ok, data: j.data, error: j.error || (r.ok ? undefined : `Error ${r.status}`) };
  } catch (e) { return { ok: false, error: String(e) }; }
}
const txt = (v: unknown) => (v == null ? "" : String(v));
const fecha = (v: unknown) => { const d = new Date(txt(v)); return isNaN(d.getTime()) ? "" : d.toLocaleString("es-EC", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
const campo = "w-full rounded-lg border border-cafe/20 bg-white px-3 py-2.5 text-base text-cafe";
const rotulo = "mb-1 block text-sm font-semibold text-cafe/80";
const ETIQUETA_MEDIDA: Record<string, string> = { advertencia: "Advertencia", suspension: "Suspensión temporal", bloqueo: "Bloqueo indefinido" };
const ETIQUETA_ESTADO: Record<string, string> = { activa: "Activa", vencida: "Vencida", levantada: "Levantada" };

type Infraccion = { titulo: string; norma: string; gravedad: string };
type Catalogo = { infracciones: Record<string, Infraccion>; medidas: Record<string, string[]>; dias_max: number; dias_apelacion: number };
type Sancion = { id: string; uid: string; tipo: string; infraccion: string; hechos: string; evidencias?: string[]; desde: string; hasta?: string | null; estado: string; estado_vigente?: string; apelar_hasta?: string; miembro?: string; apelacion?: { texto: string; fecha: string; estado: string; respuesta?: string }; historial?: { ts: string; accion: string; actor: string; nota?: string }[] };

function useCatalogo() {
  const [cat, setCat] = useState<Catalogo | null>(null);
  useEffect(() => { api("/api/moderacion.php?action=catalogo").then((r) => r.ok && setCat(r.data as unknown as Catalogo)); }, []);
  return cat;
}

/* ─────────── Ficha de un miembro ─────────── */
const ETIQUETA_VALIDACION: Record<string, string> = { pendiente: "Pendiente", en_revision: "En revisión", verificado: "Verificado", rechazado: "Rechazado" };
const ETIQUETA_TIPO_PUB: Record<string, string> = { lote: "Lote", servicio: "Servicio", publicacion: "Publicación", empleo: "Oferta de empleo", requerimiento: "Requerimiento", busqueda: "Búsqueda de empleo" };
const PEDIDO_CERRADO = ["Entregado", "Cancelado"];
type Publicacion = { tipo: string; id: string; titulo: string; oculto: boolean; puede_ocultar: boolean; fecha: string; enlace: string };
type PedidoFicha = { nro: number; estado: string; fecha: string; finca: string; sacos?: number; total?: number; papel: string };
type Nota = { ts: string; actor: string; texto: string };
type Pendiente =
  | { clase: "publicacion"; pub: Publicacion; accion: "ocultar" | "mostrar" | "eliminar" }
  | { clase: "pedido"; pedido: PedidoFicha }
  | { clase: "acceso"; activo: boolean };

export function FichaMiembro({ uid, onCerrar, reporteId }: { uid: string; onCerrar?: () => void; reporteId?: string }) {
  const { toast, mostrar, cerrar } = useToast();
  const cat = useCatalogo();
  const [f, setF] = useState<Json | null>(null);
  const [panel, setPanel] = useState<"" | "chat" | "correo" | "aviso" | "sancion">("");
  const [mensaje, setMensaje] = useState("");
  const [asunto, setAsunto] = useState("");
  const [inf, setInf] = useState("");
  const [tipo, setTipo] = useState("");
  const [preferida, setPreferida] = useState("");
  const [dias, setDias] = useState(7);
  const [hechos, setHechos] = useState("");
  const [evidencias, setEvidencias] = useState(reporteId ? `reporte ${reporteId}` : "");
  const [confirmar, setConfirmar] = useState(false);
  const [levantando, setLevantando] = useState<Sancion | null>(null);
  const [justif, setJustif] = useState("");
  const [validacion, setValidacion] = useState("");
  const [motivoValidacion, setMotivoValidacion] = useState("");
  const [nota, setNota] = useState("");
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [motivo, setMotivo] = useState("");

  const cargar = () => api(`/api/moderacion.php?action=ficha&uid=${encodeURIComponent(uid)}`).then((r) => (r.ok ? setF(r.data || null) : mostrar("error", r.error || "No se pudo cargar la ficha.")));
  useEffect(() => { cargar(); }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = (f?.miembro || {}) as Json;
  const c = (f?.contadores || {}) as Json;
  const acceso = (f?.acceso || {}) as { activo?: boolean; restringida?: boolean; estado_validacion?: string };
  const sanciones = ((f?.sanciones || []) as Sancion[]).slice().reverse();
  const reportes = (f?.reportes_recibidos || []) as Json[];
  const publicaciones = (f?.publicaciones || []) as Publicacion[];
  const pedidos = (f?.pedidos || []) as PedidoFicha[];
  const notas = (f?.notas || []) as Nota[];
  const vigente = sanciones.find((s) => (s.estado_vigente || s.estado) === "activa" && s.tipo !== "advertencia");
  const estadoAcceso = vigente
    ? (vigente.tipo === "bloqueo" ? "Bloqueada" : `Suspendida hasta ${fecha(vigente.hasta)}`)
    : acceso.activo === false ? "Desactivada (administrativo)" : "Activa";
  const tel = txt(m.whatsapp || m.telefono).replace(/\D/g, "");
  const wa = tel ? `https://wa.me/${tel.startsWith("0") ? "593" + tel.slice(1) : tel}` : "";
  const gravedad = inf && cat ? cat.infracciones[inf]?.gravedad : "";
  const permitidas = gravedad && cat ? cat.medidas[gravedad] : [];

  useEffect(() => { if (acceso.estado_validacion) setValidacion(acceso.estado_validacion); }, [acceso.estado_validacion]);

  const enviar = async (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    const r = await fn();
    if (!r.ok) { mostrar("error", r.error || "No se pudo completar."); return false; }
    mostrar("success", okMsg); setPanel(""); setMensaje(""); setAsunto(""); cargar(); return true;
  };
  const chat = () => enviar(async () => {
    const o = await api("/api/chat.php?action=open", { user: uid });
    if (!o.ok) return o;
    return api("/api/chat.php?action=send", { room: txt((o.data || {}).room), text: mensaje.trim() });
  }, "Mensaje enviado por el chat interno.");
  const correo = () => enviar(() => api("/api/moderacion.php?action=contactar_correo", { uid, asunto: asunto.trim(), mensaje: mensaje.trim() }), "Correo enviado.");
  const aviso = () => enviar(() => api("/api/notificaciones.php?action=enviar", { destino: "miembros", ids: [uid], titulo: asunto.trim(), texto: mensaje.trim(), tipo: "sistema" }), "Aviso enviado a su campana.");
  const restablecer = () => enviar(() => api("/api/auth.php?action=password_reset_request", { email: txt(m.email) }), "Se envió a su correo el enlace para crear una contraseña nueva.");
  const guardarValidacion = () => enviar(() => api("/api/members.php?action=set_estado", { id: uid, estado: validacion, motivo: motivoValidacion.trim() }), "Estado de validación guardado.").then((okk) => okk && setMotivoValidacion(""));
  const guardarNota = () => enviar(() => api("/api/moderacion.php?action=nota", { uid, texto: nota.trim() }), "Nota guardada (el miembro no la ve).").then((okk) => okk && setNota(""));
  // Bloquear / suspender abren el formulario de medidas con esa medida
  // preferida: el debido proceso (hechos, norma, proporcionalidad) se mantiene.
  const abrirMedida = (t: string) => { setPreferida(t); setTipo(""); setPanel("sancion"); };
  const elegirInfraccion = (k: string) => {
    setInf(k);
    const g = k && cat ? cat.infracciones[k]?.gravedad : "";
    const p = g && cat ? cat.medidas[g] : [];
    setTipo(preferida && p.includes(preferida) ? preferida : "");
  };
  const sancionar = async () => {
    setConfirmar(false);
    await enviar(() => api("/api/moderacion.php?action=sancionar", { uid, tipo, infraccion: inf, hechos: hechos.trim(), dias, evidencias: evidencias.split("\n").map((e) => e.trim()).filter(Boolean) }), "Medida aplicada y notificada.");
    setHechos(""); setInf(""); setTipo(""); setPreferida("");
  };
  const levantar = async () => {
    if (!levantando) return;
    const okk = await enviar(() => api("/api/moderacion.php?action=levantar", { id: levantando.id, justificacion: justif.trim() }), "Medida levantada.");
    if (okk) { setLevantando(null); setJustif(""); }
  };
  const ejecutarPendiente = async () => {
    if (!pendiente) return;
    const p = pendiente;
    const okk = await enviar(() => (
      p.clase === "publicacion" ? api("/api/moderacion.php?action=publicacion", { tipo: p.pub.tipo, id: p.pub.id, accion: p.accion, motivo: motivo.trim() })
        : p.clase === "pedido" ? api("/api/pedidos.php?action=cancelar", { nro: p.pedido.nro, motivo: `Mediación de la administración: ${motivo.trim()}` })
          : api("/api/moderacion.php?action=acceso", { uid, activo: p.activo, motivo: motivo.trim() })
    ), p.clase === "publicacion" ? "Hecho. Se le avisó a quien publicó." : p.clase === "pedido" ? "Pedido cancelado." : p.activo ? "Cuenta reactivada." : "Cuenta desactivada.");
    if (okk) { setPendiente(null); setMotivo(""); }
  };
  // Derecho de acceso (LOPDP art. 13): copia de los datos de la ficha para
  // entregarla al titular tras verificar su identidad.
  const exportar = () => {
    if (!f) return;
    // Sin la identidad de quien reportó (se garantiza el anonimato del reporte).
    const anonimos = reportes.map((r) => ({ id: r.id, ts: r.ts, categoria: r.categoria, asunto: r.asunto, detalle: r.detalle, estado: r.estado }));
    const blob = new Blob([JSON.stringify({ exportado: new Date().toISOString(), ...f, reportes_recibidos: anonimos, reportes_hechos: undefined }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ficha-${uid}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tituloPendiente = !pendiente ? "" : pendiente.clase === "publicacion"
    ? `${pendiente.accion === "ocultar" ? "Ocultar" : pendiente.accion === "mostrar" ? "Volver a publicar" : "Eliminar"}: ${pendiente.pub.titulo}`
    : pendiente.clase === "pedido" ? `Cancelar el pedido #${pendiente.pedido.nro}` : pendiente.activo ? "Reactivar la cuenta" : "Desactivar la cuenta";
  const descPendiente = !pendiente ? "" : pendiente.clase === "publicacion"
    ? (pendiente.accion === "eliminar" ? "Se borra de forma definitiva. " : "") + "Escribe el motivo: se le comunica a quien publicó y queda en el registro."
    : pendiente.clase === "pedido" ? "Usa esto para mediar en un conflicto. Las dos partes ven el pedido cancelado con este motivo."
      : pendiente.activo ? "La persona podrá volver a entrar. Escribe el motivo: queda en el registro."
        : "Motivo administrativo (cuenta duplicada, petición del titular, datos por confirmar). Si es una infracción, usa «Bloquear» o «Suspender»: así hay notificación formal y derecho a apelar.";

  if (!f) return <p className="text-sm text-pizarra/60">Cargando ficha…</p>;
  const seccion = "mt-5 rounded-lg border border-cafe/10 p-3";
  const boton = "btn-ghost min-h-11 px-4";
  const botonPeligro = "min-h-11 rounded-full border border-cereza/50 px-4 text-sm font-semibold text-cereza";
  return (
    <div className="rounded-xl border border-cafe/15 bg-white p-4">
      {toast && <Toast {...toast} onCerrar={cerrar} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-cafe">{txt(m.nombre)}</p>
          <p className="text-sm text-pizarra/70">{txt(m.email)}{tel ? ` · ${tel}` : ""} · {txt(m.provincia)}</p>
          <p className="mt-1 text-sm text-pizarra/70">Perfiles: {((m.roles as string[]) || [txt(m.rol)]).join(", ")} · Alta: {fecha(m.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportar} className={boton} title="Copia de sus datos para el derecho de acceso (LOPDP art. 13)">Exportar ficha</button>
          {onCerrar && <button type="button" onClick={onCerrar} className={boton}>Cerrar ficha</button>}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
        {[["Lotes", c.lotes], ["Servicios", c.servicios], ["Publicaciones", c.publicaciones], ["Pedidos (compra)", c.pedidos_comprador], ["Pedidos (venta)", c.pedidos_vendedor]].map(([k, v]) => (
          <div key={txt(k)} className="rounded-lg bg-crema p-2"><dt className="text-pizarra/70">{txt(k)}</dt><dd className="font-semibold text-cafe">{txt(v)}</dd></div>
        ))}
      </dl>

      {/* Estado: validación del perfil y acceso a la cuenta */}
      <section className={seccion} aria-labelledby="ficha-estado">
        <h3 id="ficha-estado" className="font-semibold text-cafe">Estado de la cuenta</h3>
        <p className="mt-1 text-sm">Acceso: <strong className={estadoAcceso === "Activa" ? "text-hoja" : "text-cereza"}>{estadoAcceso}</strong></p>
        <div className="mt-2 flex flex-wrap gap-2">
          {!vigente && <button type="button" className={botonPeligro} onClick={() => abrirMedida("bloqueo")}>Bloquear</button>}
          {!vigente && <button type="button" className={botonPeligro} onClick={() => abrirMedida("suspension")}>Suspender</button>}
          {vigente && <button type="button" className="btn-primary min-h-11 px-4" onClick={() => setLevantando(vigente)}>Desbloquear (levantar la medida)</button>}
          {!vigente && acceso.activo !== false && <button type="button" className={boton} onClick={() => setPendiente({ clase: "acceso", activo: false })}>Desactivar (administrativo)</button>}
          {acceso.activo === false && <button type="button" className="btn-primary min-h-11 px-4" onClick={() => setPendiente({ clase: "acceso", activo: true })}>Reactivar la cuenta</button>}
          <button type="button" className={boton} onClick={() => abrirMedida("advertencia")}>Advertencia</button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-end">
          <div><label className={rotulo} htmlFor="ficha-validacion">Validación del perfil</label>
            <select id="ficha-validacion" className={campo} value={validacion} onChange={(e) => setValidacion(e.target.value)}>
              {Object.entries(ETIQUETA_VALIDACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><label className={rotulo} htmlFor="ficha-motivo-val">Motivo (si la rechazas)</label>
            <input id="ficha-motivo-val" className={campo} value={motivoValidacion} maxLength={300} onChange={(e) => setMotivoValidacion(e.target.value)} /></div>
          <button type="button" className="btn-primary min-h-11 px-4" disabled={validacion === acceso.estado_validacion && !motivoValidacion.trim()} onClick={guardarValidacion}>Guardar</button>
        </div>
      </section>

      {/* Contacto: interno (chat, campana) y externo (correo, WhatsApp) */}
      <section className={seccion} aria-labelledby="ficha-contacto">
        <h3 id="ficha-contacto" className="font-semibold text-cafe">Notificar y contactar</h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-pizarra/60">Dentro de la Red</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" className={boton} onClick={() => setPanel(panel === "chat" ? "" : "chat")}>Chat interno</button>
          <button type="button" className={boton} onClick={() => setPanel(panel === "aviso" ? "" : "aviso")}>Aviso a su campana</button>
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-pizarra/60">Fuera de la Red</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" className={boton} onClick={() => setPanel(panel === "correo" ? "" : "correo")}>Correo</button>
          {wa && <a className={`${boton} inline-flex items-center`} href={wa} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>}
          {txt(m.email) && <button type="button" className={boton} onClick={restablecer}>Enviar enlace de contraseña</button>}
        </div>
        {(panel === "chat" || panel === "correo" || panel === "aviso") && (
          <form className="mt-3 grid gap-2" onSubmit={(e) => { e.preventDefault(); (panel === "chat" ? chat : panel === "correo" ? correo : aviso)(); }}>
            {panel !== "chat" && (<><label className={rotulo} htmlFor="ficha-asunto">{panel === "correo" ? "Asunto" : "Título del aviso"}</label>
              <input id="ficha-asunto" className={campo} value={asunto} maxLength={140} onChange={(e) => setAsunto(e.target.value)} required /></>)}
            <label className={rotulo} htmlFor="ficha-mensaje">Mensaje</label>
            <textarea id="ficha-mensaje" className={campo} rows={4} value={mensaje} maxLength={panel === "aviso" ? 400 : 3000} onChange={(e) => setMensaje(e.target.value)} required />
            <button className="btn-primary min-h-11 justify-self-start px-5">{panel === "chat" ? "Enviar por chat" : panel === "correo" ? "Enviar correo" : "Enviar aviso"}</button>
          </form>
        )}
      </section>

      {panel === "sancion" && cat && (
        <form className="mt-3 grid gap-3 rounded-lg border border-cereza/20 bg-crema/60 p-3" onSubmit={(e) => { e.preventDefault(); setConfirmar(true); }}>
          <p className="text-sm text-pizarra/80">Debido proceso: describe los hechos, elige la regla infringida y una medida proporcional. La persona recibirá la notificación formal y podrá apelar durante {cat.dias_apelacion} días.</p>
          <div>
            <label className={rotulo} htmlFor="ficha-inf">Infracción</label>
            <select id="ficha-inf" className={campo} value={inf} onChange={(e) => elegirInfraccion(e.target.value)} required>
              <option value="">Elige…</option>
              {Object.entries(cat.infracciones).map(([k, v]) => <option key={k} value={k}>{v.titulo} ({v.gravedad})</option>)}
            </select>
            {inf && <p className="mt-1 text-sm text-pizarra/70">Norma: {cat.infracciones[inf].norma}</p>}
            {inf && preferida && !permitidas.includes(preferida) && <p className="mt-1 text-sm text-cereza">«{ETIQUETA_MEDIDA[preferida]}» no es proporcional a esta infracción. Elige una de las permitidas.</p>}
          </div>
          {inf && (
            <div>
              <span className={rotulo}>Medida (proporcional a la gravedad)</span>
              <div className="flex flex-wrap gap-2">
                {permitidas.map((t) => (
                  <label key={t} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm ${tipo === t ? "border-cafe bg-cafe text-crema" : "border-cafe/20 bg-white text-cafe"}`}>
                    <input type="radio" name="ficha-tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />{ETIQUETA_MEDIDA[t]}
                  </label>
                ))}
              </div>
            </div>
          )}
          {tipo === "suspension" && (
            <div><label className={rotulo} htmlFor="ficha-dias">Días de suspensión (1–{cat.dias_max})</label>
              <input id="ficha-dias" type="number" min={1} max={cat.dias_max} className={campo} value={dias} onChange={(e) => setDias(Number(e.target.value))} /></div>
          )}
          <div><label className={rotulo} htmlFor="ficha-hechos">Hechos comprobados (qué pasó, cuándo y cómo se comprobó)</label>
            <textarea id="ficha-hechos" className={campo} rows={4} minLength={30} value={hechos} onChange={(e) => setHechos(e.target.value)} required />
            <p className="mt-1 text-xs text-pizarra/60">La persona verá este texto. No incluyas el nombre de quien reportó.</p></div>
          <div><label className={rotulo} htmlFor="ficha-evid">Evidencias (una por línea: reporte, enlace, captura){tipo === "bloqueo" ? " — obligatorias para un bloqueo" : ""}</label>
            <textarea id="ficha-evid" className={campo} rows={2} value={evidencias} onChange={(e) => setEvidencias(e.target.value)} required={tipo === "bloqueo"} /></div>
          <div className="flex flex-wrap gap-2">
            <button className="min-h-11 rounded-full bg-cereza px-5 font-semibold text-white disabled:opacity-50" disabled={!inf || !tipo || hechos.trim().length < 30}>Revisar y aplicar</button>
            <button type="button" className={boton} onClick={() => { setPanel(""); setPreferida(""); }}>Cancelar</button>
          </div>
        </form>
      )}

      <section className={seccion} aria-labelledby="ficha-pubs">
        <h3 id="ficha-pubs" className="font-semibold text-cafe">Lo que publicó ({publicaciones.length})</h3>
        {publicaciones.length ? (
          <ul className="mt-2 grid gap-2">{publicaciones.map((p) => (
            <li key={`${p.tipo}-${p.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cafe/10 p-2 text-sm">
              <span className="min-w-0"><strong>{ETIQUETA_TIPO_PUB[p.tipo] || p.tipo}</strong> · {p.titulo}{p.oculto ? " · oculto" : ""}<br /><span className="text-pizarra/60">{fecha(p.fecha)}</span></span>
              <span className="flex flex-wrap gap-2">
                {p.puede_ocultar && <button type="button" className={boton} onClick={() => setPendiente({ clase: "publicacion", pub: p, accion: p.oculto ? "mostrar" : "ocultar" })}>{p.oculto ? "Volver a publicar" : "Ocultar"}</button>}
                <button type="button" className={botonPeligro} onClick={() => setPendiente({ clase: "publicacion", pub: p, accion: "eliminar" })}>Eliminar</button>
              </span>
            </li>
          ))}</ul>
        ) : <p className="mt-1 text-sm text-pizarra/60">No tiene publicaciones.</p>}
      </section>

      <section className={seccion} aria-labelledby="ficha-pedidos">
        <h3 id="ficha-pedidos" className="font-semibold text-cafe">Pedidos ({pedidos.length})</h3>
        {pedidos.length ? (
          <ul className="mt-2 grid gap-2">{pedidos.map((p) => (
            <li key={p.nro} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cafe/10 p-2 text-sm">
              <span>#{p.nro} · {p.papel === "compra" ? "compra" : "venta"} · {p.finca} · {p.sacos ?? "?"} sacos · <strong>{p.estado}</strong><br /><span className="text-pizarra/60">{fecha(p.fecha)}</span></span>
              {!PEDIDO_CERRADO.includes(p.estado) && <button type="button" className={botonPeligro} onClick={() => setPendiente({ clase: "pedido", pedido: p })}>Cancelar (mediación)</button>}
            </li>
          ))}</ul>
        ) : <p className="mt-1 text-sm text-pizarra/60">Sin pedidos.</p>}
      </section>

      <section className={seccion} aria-labelledby="ficha-notas">
        <h3 id="ficha-notas" className="font-semibold text-cafe">Notas internas</h3>
        <p className="mt-1 text-xs text-pizarra/60">Solo las ve la administración. Se borran si la persona cierra su cuenta.</p>
        <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (nota.trim().length >= 3) guardarNota(); }}>
          <label className="sr-only" htmlFor="ficha-nota">Nota interna</label>
          <input id="ficha-nota" className={`${campo} min-w-0 flex-1`} value={nota} maxLength={1000} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: llamó el 24-oct, enviará la foto de su cédula" />
          <button className="btn-primary min-h-11 px-4" disabled={nota.trim().length < 3}>Guardar nota</button>
        </form>
        {notas.length > 0 && <ul className="mt-2 grid gap-1 text-sm">{notas.map((n, i) => <li key={i} className="rounded bg-crema p-2"><span className="text-pizarra/60">{fecha(n.ts)} · {n.actor}:</span> {n.texto}</li>)}</ul>}
      </section>

      <h3 className="mt-5 font-semibold text-cafe">Reportes recibidos ({reportes.length})</h3>
      {reportes.length ? (
        <ul className="mt-2 grid gap-2">{reportes.map((r) => (
          <li key={txt(r.id)} className="rounded-lg border border-cafe/10 p-2 text-sm"><strong>{txt(r.asunto)}</strong> · {txt(r.categoria)} · {fecha(r.ts)} · {txt(r.estado)}<br /><span className="text-pizarra/70">{txt(r.detalle).slice(0, 220)}</span></li>
        ))}</ul>
      ) : <p className="text-sm text-pizarra/60">Ninguno.</p>}

      <h3 className="mt-5 font-semibold text-cafe">Historial de medidas</h3>
      {sanciones.length ? (
        <ul className="mt-2 grid gap-2">{sanciones.map((s) => (
          <li key={s.id} className="rounded-lg border border-cafe/10 p-2 text-sm">
            <strong>{ETIQUETA_MEDIDA[s.tipo]}</strong> · {cat?.infracciones[s.infraccion]?.titulo || s.infraccion} · {ETIQUETA_ESTADO[s.estado_vigente || s.estado] || s.estado}
            <br /><span className="text-pizarra/70">Desde {fecha(s.desde)}{s.hasta ? ` hasta ${fecha(s.hasta)}` : ""}. {s.hechos}</span>
            {s.apelacion && <p className="mt-1">Apelación ({s.apelacion.estado}): {s.apelacion.texto}</p>}
            {(s.estado_vigente || s.estado) === "activa" && <button type="button" className={`${boton} mt-2`} onClick={() => setLevantando(s)}>Levantar medida</button>}
          </li>
        ))}</ul>
      ) : <p className="text-sm text-pizarra/60">Sin medidas.</p>}

      <Modal abierto={confirmar} onCerrar={() => setConfirmar(false)} titulo="Confirmar la medida"
        descripcion={`${ETIQUETA_MEDIDA[tipo] || ""}${tipo === "suspension" ? ` de ${dias} días` : ""} a ${txt(m.nombre)} por «${inf && cat ? cat.infracciones[inf].titulo : ""}». Se le notificará por la campana y por correo.`}
        pie={<><button className="btn-ghost" onClick={() => setConfirmar(false)}>Cancelar</button><button className="btn-primary" onClick={sancionar}>Aplicar y notificar</button></>} />
      <Modal abierto={levantando !== null} onCerrar={() => setLevantando(null)} titulo="Levantar la medida" descripcion="Escribe la justificación: queda en el registro y se comunica a la persona."
        pie={<><button className="btn-ghost" onClick={() => setLevantando(null)}>Cancelar</button><button className="btn-primary" onClick={levantar} disabled={justif.trim().length < 20}>Levantar</button></>}>
        <label className="sr-only" htmlFor="ficha-justif">Justificación</label>
        <textarea id="ficha-justif" className={campo} rows={3} value={justif} onChange={(e) => setJustif(e.target.value)} />
      </Modal>
      <Modal abierto={pendiente !== null} onCerrar={() => { setPendiente(null); setMotivo(""); }} titulo={tituloPendiente} descripcion={descPendiente}
        pie={<><button className="btn-ghost" onClick={() => { setPendiente(null); setMotivo(""); }}>Cancelar</button><button className="btn-primary" onClick={ejecutarPendiente} disabled={motivo.trim().length < 10}>Confirmar</button></>}>
        <label className="sr-only" htmlFor="ficha-motivo">Motivo</label>
        <textarea id="ficha-motivo" className={campo} rows={3} value={motivo} maxLength={260} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (mínimo 10 caracteres)" />
      </Modal>
    </div>
  );
}

/* ─────────── Pestaña Cuentas ─────────── */
type MiembroLista = { id: string; nombre?: string; email?: string; estado?: string; rol?: string };
export function CuentasTab() {
  const { toast, mostrar, cerrar } = useToast();
  const cat = useCatalogo();
  const [miembros, setMiembros] = useState<MiembroLista[]>([]);
  const [buscar, setBuscar] = useState("");
  const [uid, setUid] = useState("");
  const [vista, setVista] = useState<"buscar" | "medidas" | "apelaciones">("buscar");
  const [lista, setLista] = useState<Sancion[]>([]);
  const [resolviendo, setResolviendo] = useState<Sancion | null>(null);
  const [respuesta, setRespuesta] = useState("");

  useEffect(() => { api("/api/members.php?action=all").then((r) => setMiembros(((r.data?.members as MiembroLista[]) || []).filter((m) => m && m.id && m.estado !== "eliminado"))); }, []);
  const cargarLista = (v: string) => api(`/api/moderacion.php?action=list${v === "apelaciones" ? "&estado=apelaciones" : ""}`).then((r) => setLista((r.data?.sanciones as Sancion[]) || []));
  useEffect(() => { if (vista !== "buscar") cargarLista(vista); }, [vista]);
  const encontrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return q.length < 2 ? [] : miembros.filter((m) => `${m.nombre} ${m.email}`.toLowerCase().includes(q)).slice(0, 12);
  }, [buscar, miembros]);
  const resolver = async (decision: "aceptada" | "rechazada") => {
    if (!resolviendo) return;
    const r = await api("/api/moderacion.php?action=resolver_apelacion", { id: resolviendo.id, decision, respuesta: respuesta.trim() });
    if (!r.ok) { mostrar("error", r.error || "No se pudo resolver."); return; }
    mostrar("success", decision === "aceptada" ? "Apelación aceptada: la medida se levantó." : "Apelación rechazada con resolución motivada.");
    setResolviendo(null); setRespuesta(""); cargarLista(vista);
  };

  return (
    <div>
      {toast && <Toast {...toast} onCerrar={cerrar} />}
      <h2 className="font-titulo text-xl font-semibold text-cafe">Cuentas y medidas</h2>
      <p className="mt-1 text-sm text-pizarra/70">Ficha de cada miembro, contacto directo y medidas con debido proceso (hechos, norma, medida proporcional, notificación, apelación y resolución motivada).</p>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {([["buscar", "Buscar miembro"], ["medidas", "Medidas"], ["apelaciones", "Apelaciones pendientes"]] as const).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={vista === v} onClick={() => setVista(v)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${vista === v ? "bg-cafe text-crema" : "border border-cafe/20 bg-white text-cafe"}`}>{l}</button>
        ))}
      </div>

      {vista === "buscar" && (
        <div className="mt-4">
          <label className={rotulo} htmlFor="cuentas-buscar">Nombre o correo</label>
          <input id="cuentas-buscar" className={campo} value={buscar} onChange={(e) => setBuscar(e.target.value)} autoComplete="off" />
          {encontrados.length > 0 && !uid && (
            <ul className="mt-2 divide-y divide-cafe/10 rounded-lg border border-cafe/10 bg-white">
              {encontrados.map((m) => (
                <li key={m.id}><button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm" onClick={() => setUid(m.id)}>
                  <span className="font-semibold text-cafe">{m.nombre}</span><span className="truncate text-pizarra/60">{m.email}</span>
                </button></li>
              ))}
            </ul>
          )}
          {uid && <div className="mt-3"><FichaMiembro uid={uid} onCerrar={() => setUid("")} /></div>}
        </div>
      )}

      {vista !== "buscar" && (
        <ul className="mt-4 grid gap-2">
          {!lista.length && <li className="rounded-xl bg-white p-4 text-sm text-pizarra/70">{vista === "apelaciones" ? "No hay apelaciones pendientes." : "No hay medidas registradas."}</li>}
          {lista.map((s) => (
            <li key={s.id} className="rounded-xl border border-cafe/10 bg-white p-3 text-sm">
              <p className="font-semibold text-cafe">{s.miembro} · {ETIQUETA_MEDIDA[s.tipo]} · {ETIQUETA_ESTADO[s.estado_vigente || s.estado] || s.estado}</p>
              <p className="text-pizarra/70">{cat?.infracciones[s.infraccion]?.titulo || s.infraccion} · {fecha(s.desde)}{s.hasta ? ` → ${fecha(s.hasta)}` : ""}</p>
              <p className="mt-1">{s.hechos}</p>
              {s.apelacion && <p className="mt-1 rounded bg-crema p-2"><strong>Apelación ({s.apelacion.estado}):</strong> {s.apelacion.texto}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn-ghost min-h-11 px-4" onClick={() => { setVista("buscar"); setUid(s.uid); }}>Ver ficha</button>
                {s.apelacion?.estado === "pendiente" && <button type="button" className="btn-primary min-h-11 px-4" onClick={() => setResolviendo(s)}>Resolver apelación</button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal abierto={resolviendo !== null} onCerrar={() => setResolviendo(null)} titulo="Resolver la apelación" descripcion="Escribe una resolución motivada (mínimo 20 caracteres): se comunica a la persona y queda registrada."
        pie={<><button className="btn-ghost" onClick={() => setResolviendo(null)}>Cancelar</button>
          <button className="btn-ghost" disabled={respuesta.trim().length < 20} onClick={() => resolver("rechazada")}>Rechazar</button>
          <button className="btn-primary" disabled={respuesta.trim().length < 20} onClick={() => resolver("aceptada")}>Aceptar y levantar</button></>}>
        <label className="sr-only" htmlFor="cuentas-resp">Resolución</label>
        <textarea id="cuentas-resp" className={campo} rows={4} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
      </Modal>
    </div>
  );
}
