"use client";

import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";

/*
 «Mi cuenta» del miembro: las medidas que la administración haya tomado sobre
 su cuenta (con la norma, los hechos y la vía para apelar) y el cierre de la
 cuenta con eliminación de sus datos (Términos §4; LOPDP art. 15).
*/

type Sancion = { id: string; tipo: string; estado: string; infraccion: string; norma: string; hechos: string; desde: string; hasta?: string | null; apelar_hasta?: string | null; apelacion?: { estado: string; fecha: string; respuesta?: string | null } | null };
const MEDIDA: Record<string, string> = { advertencia: "Advertencia", suspension: "Suspensión temporal", bloqueo: "Bloqueo" };
const fecha = (v?: string | null) => (v ? new Date(v).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" }) : "");
const campo = "w-full rounded-lg border border-cafe/20 bg-white px-3 py-2.5 text-base text-cafe";

async function post(ruta: string, cuerpo: Record<string, unknown>) {
  const r = await fetch(CONFIG.api(ruta), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = await r.json().catch(() => ({}));
  return { ok: !!j.ok, error: j.error as string | undefined, extra: j };
}

export function MedidasDeMiCuenta() {
  const [lista, setLista] = useState<Sancion[] | null>(null);
  const [apelando, setApelando] = useState("");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState("");
  const cargar = () => fetch(CONFIG.api("/api/moderacion.php?action=mi_estado"), { credentials: "include", cache: "no-store" })
    .then((r) => r.json()).then((j) => setLista((j && j.ok && j.data && j.data.sanciones) || [])).catch(() => setLista([]));
  useEffect(() => { cargar(); }, []);
  if (!lista || !lista.length) return null;
  const apelar = async (id: string) => {
    const r = await post("/api/moderacion.php?action=apelar", { id, texto: texto.trim() });
    setMsg(r.ok ? "Apelación enviada. Te responderemos con una resolución motivada." : r.error || "No se pudo enviar.");
    if (r.ok) { setApelando(""); setTexto(""); cargar(); }
  };
  return (
    <section className="rounded-2xl border border-cereza/25 bg-white p-5" aria-labelledby="medidas-titulo">
      <h3 id="medidas-titulo" className="font-titulo text-lg font-semibold text-cafe">Medidas sobre mi cuenta</h3>
      <ul className="mt-3 grid gap-3">
        {lista.map((s) => (
          <li key={s.id} className="rounded-xl bg-crema p-3 text-sm">
            <p className="font-semibold text-cafe">{MEDIDA[s.tipo] || s.tipo} · {s.estado === "activa" ? "vigente" : s.estado}</p>
            <p className="mt-1"><strong>Motivo:</strong> {s.infraccion}</p>
            <p className="mt-1"><strong>Norma:</strong> {s.norma}</p>
            <p className="mt-1"><strong>Hechos:</strong> {s.hechos}</p>
            <p className="mt-1 text-pizarra/70">Desde el {fecha(s.desde)}{s.hasta ? ` hasta el ${fecha(s.hasta)}` : ""}.</p>
            {s.apelacion ? (
              <p className="mt-2">Tu apelación ({fecha(s.apelacion.fecha)}): <strong>{s.apelacion.estado}</strong>{s.apelacion.respuesta ? ` — ${s.apelacion.respuesta}` : ""}</p>
            ) : s.apelar_hasta && new Date(s.apelar_hasta) > new Date() ? (
              apelando === s.id ? (
                <div className="mt-2 grid gap-2">
                  <label htmlFor={`apelar-${s.id}`} className="font-semibold text-cafe">Tu versión de los hechos y tus pruebas (enlaces)</label>
                  <textarea id={`apelar-${s.id}`} className={campo} rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-primary min-h-11 px-4" disabled={texto.trim().length < 30} onClick={() => apelar(s.id)}>Enviar apelación</button>
                    <button type="button" className="btn-ghost min-h-11 px-4" onClick={() => setApelando("")}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn-ghost mt-2 min-h-11 px-4" onClick={() => setApelando(s.id)}>Apelar (hasta el {fecha(s.apelar_hasta)})</button>
              )
            ) : null}
          </li>
        ))}
      </ul>
      {msg && <p className="mt-2 text-sm text-cafe" role="status">{msg}</p>}
    </section>
  );
}

export function CerrarMiCuenta() {
  const [abierto, setAbierto] = useState(false);
  const [pass, setPass] = useState("");
  const [conf, setConf] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [pedidos, setPedidos] = useState<{ nro: string | number; estado: string }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const cerrar = async () => {
    setEnviando(true); setError(""); setPedidos([]);
    const r = await post("/api/moderacion.php?action=baja", { pass, confirmacion: conf.trim(), motivo: motivo.trim() });
    setEnviando(false);
    if (!r.ok) { setError(r.error || "No se pudo cerrar la cuenta."); setPedidos((r.extra && r.extra.pedidos) || []); return; }
    try { localStorage.removeItem("redcafe_sesion"); sessionStorage.removeItem("redcafe_sesion"); } catch { /* nada */ }
    window.location.href = "/?cuenta=eliminada";
  };
  return (
    <section className="rounded-2xl border border-cafe/15 bg-white p-5" aria-labelledby="baja-titulo">
      <h3 id="baja-titulo" className="font-titulo text-lg font-semibold text-cafe">Cerrar mi cuenta y eliminar mis datos</h3>
      {!abierto ? (
        <>
          <p className="mt-1 text-sm text-pizarra/80">Puedes darte de baja cuando quieras. Es definitivo.</p>
          <button type="button" className="mt-3 min-h-11 rounded-full border border-cereza/50 px-4 text-sm font-semibold text-cereza" onClick={() => setAbierto(true)}>Quiero cerrar mi cuenta</button>
        </>
      ) : (
        <div className="mt-2 grid gap-3 text-sm">
          <div className="rounded-xl bg-crema p-3 text-pizarra/90">
            <p><strong>Se elimina:</strong> tu perfil, tus datos de contacto, tus lotes, servicios, requerimientos, ofertas de empleo, publicaciones y avisos. En los comentarios que dejaste en publicaciones ajenas, tu nombre se reemplaza por «Miembro que dejó la Red».</p>
            <p className="mt-2"><strong>Se conserva, sin tus datos de contacto:</strong> los pedidos ya cerrados (la otra parte necesita su registro) y el registro de medidas o reportes, solo para atender reclamos (LOPDP art. 18, num. 2 y 4).</p>
            <p className="mt-2">Si tienes pedidos en curso, primero complétalos o cancélalos. Te enviaremos un correo de confirmación.</p>
          </div>
          <label className="font-semibold text-cafe" htmlFor="baja-motivo">¿Por qué te vas? (opcional)</label>
          <input id="baja-motivo" className={campo} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <label className="font-semibold text-cafe" htmlFor="baja-pass">Tu contraseña</label>
          <input id="baja-pass" type="password" autoComplete="current-password" className={campo} value={pass} onChange={(e) => setPass(e.target.value)} />
          <label className="font-semibold text-cafe" htmlFor="baja-conf">Escribe ELIMINAR para confirmar</label>
          <input id="baja-conf" className={campo} value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="off" />
          {error && <p className="text-cereza" role="alert">{error}</p>}
          {pedidos.length > 0 && <ul className="list-disc pl-5 text-pizarra/80">{pedidos.map((p) => <li key={String(p.nro)}>Pedido #{p.nro}: {p.estado}</li>)}</ul>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-full bg-cereza px-5 font-semibold text-white disabled:opacity-50" disabled={enviando || !pass || conf.trim() !== "ELIMINAR"} onClick={cerrar}>{enviando ? "Cerrando…" : "Cerrar mi cuenta definitivamente"}</button>
            <button type="button" className="btn-ghost min-h-11 px-4" onClick={() => setAbierto(false)}>No, mantener mi cuenta</button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─────────── En el acceso: medida vigente y apelación sin sesión ─────────── */
export type SancionTitular = Sancion & { apelar?: { id: string; u: string; t: string } };

export async function verSancionPorEnlace(id: string, u: string, t: string): Promise<SancionTitular | null> {
  try {
    const r = await fetch(CONFIG.api(`/api/moderacion.php?action=ver_apelacion&id=${encodeURIComponent(id)}&u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`), { cache: "no-store" });
    const j = await r.json();
    return j && j.ok && j.data ? { ...(j.data.sancion as Sancion), apelar: { id, u, t } } : null;
  } catch { return null; }
}

export function AvisoSancion({ sancion }: { sancion: SancionTitular }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "ok">("");
  const [error, setError] = useState("");
  const yaApelo = !!sancion.apelacion;
  const enPlazo = !!sancion.apelar_hasta && new Date(sancion.apelar_hasta) > new Date();
  const enviar = async () => {
    if (!sancion.apelar) return;
    setEstado("enviando"); setError("");
    const r = await post("/api/moderacion.php?action=apelar", { id: sancion.apelar.id, u: sancion.apelar.u, t: sancion.apelar.t, texto: texto.trim() });
    if (r.ok) setEstado("ok"); else { setEstado(""); setError(r.error || "No se pudo enviar."); }
  };
  return (
    <section className="mt-5 rounded-2xl border border-cereza/30 bg-white p-5 text-sm" aria-labelledby="sancion-titulo" role="alert">
      <h2 id="sancion-titulo" className="font-titulo text-lg font-semibold text-cafe">{MEDIDA[sancion.tipo] || "Medida"} sobre tu cuenta</h2>
      <p className="mt-2"><strong>Motivo:</strong> {sancion.infraccion}</p>
      <p className="mt-1"><strong>Norma:</strong> {sancion.norma}</p>
      <p className="mt-1"><strong>Hechos:</strong> {sancion.hechos}</p>
      <p className="mt-1">{sancion.hasta ? `Vigente hasta el ${fecha(sancion.hasta)}.` : "Vigente por tiempo indefinido."}</p>
      {estado === "ok" || (yaApelo && sancion.apelacion?.estado === "pendiente") ? (
        <p className="mt-3 rounded-lg bg-crema p-3">Tu apelación está registrada. Te responderemos por correo con una resolución motivada.</p>
      ) : yaApelo ? (
        <p className="mt-3 rounded-lg bg-crema p-3">Tu apelación fue {sancion.apelacion?.estado}{sancion.apelacion?.respuesta ? `: ${sancion.apelacion.respuesta}` : "."}</p>
      ) : enPlazo && sancion.apelar ? (
        <div className="mt-3 grid gap-2">
          <label htmlFor="apelacion-texto" className="font-semibold text-cafe">Presenta tu versión y tus pruebas (hasta el {fecha(sancion.apelar_hasta)})</label>
          <textarea id="apelacion-texto" rows={5} className={campo} value={texto} onChange={(e) => setTexto(e.target.value)} />
          {error && <p className="text-cereza">{error}</p>}
          <button type="button" className="btn-primary min-h-11 justify-self-start px-5" disabled={texto.trim().length < 30 || estado === "enviando"} onClick={enviar}>{estado === "enviando" ? "Enviando…" : "Enviar apelación"}</button>
        </div>
      ) : (
        <p className="mt-3 text-pizarra/70">El plazo para apelar terminó. Si necesitas ayuda, escribe a soporte@redcafeecuador.com.</p>
      )}
    </section>
  );
}
