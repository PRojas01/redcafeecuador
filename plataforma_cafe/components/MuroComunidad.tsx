"use client";

// El muro de la Comunidad (antes lo pintaba la capa propia, redcafe-comunidad.js,
// al lado de la lista de React, que quedaba oculta: dos versiones a la vez y un
// salto al cargar). Filtros, novedades con su enlace, fechas en lenguaje llano,
// «me gusta», comentarios, editar y borrar lo propio, y reportar.
import { useState } from "react";
import type { ApiUser } from "@/lib/api";
import { CONFIG } from "@/lib/config";

export type EntradaMuro = {
  id: string;
  titulo?: string;
  text?: string;
  autor?: string;
  autor_id?: string;
  autor_rol?: string;
  autor_verificado?: boolean;
  tipo?: string;
  aviso?: string;
  enlace?: string;
  imagenes?: string[];
  likes?: string[];
  comments?: Array<{ id?: string; autor?: string; autor_id?: string; text?: string; created_at?: string }>;
  created_at?: string;
  editado_at?: string;
};

const ICONOS: Record<string, string> = { miembro: "👤", lote: "🫘", servicio: "🛠️", curso: "🎓", empleo: "💼", persona: "💬" };
const ENLACE_TEXTO: Record<string, string> = {
  lote: "Ver el lote",
  servicio: "Ver los servicios",
  curso: "Ver el curso",
  empleo: "Ver las ofertas de empleo",
  requerimiento: "Ver los requerimientos",
};
const FILTROS: Array<[string, string]> = [
  ["todo", "Todo"],
  ["personas", "De los miembros"],
  ["miembro", "Nuevos miembros"],
  ["lote", "Lotes"],
  ["servicio", "Servicios"],
  ["empleo", "Empleos"],
  ["curso", "Cursos"],
];
const POR_PAGINA = 12;

// Novedades guardadas antes del arreglo: «nuevo miembro» llevaba a esta misma
// página y el resto a la portada del marketplace. Cada una va a su sitio.
function enlaceDeNovedad(tipo: string, enlace: string) {
  if (tipo === "miembro") return "";
  if (!/^\/(marketplace|comunidad)\/?$/.test(enlace)) return enlace;
  if (tipo === "servicio") return "/marketplace/?ver=servicios";
  if (tipo === "requerimiento") return "/marketplace/?ver=requerimientos";
  if (tipo === "empleo") return "/marketplace/?ver=empleos";
  return "";
}

function cuando(iso?: string) {
  const t = Date.parse(iso || "");
  if (!t) return "";
  const seg = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (seg < 60) return "hace un momento";
  if (seg < 3600) return "hace " + Math.round(seg / 60) + " min";
  if (seg < 86400) return "hace " + Math.round(seg / 3600) + " h";
  if (seg < 172800) return "ayer";
  if (seg < 2592000) return "hace " + Math.round(seg / 86400) + " días";
  return new Date(t).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
}

function iniciales(nombre?: string) {
  const partes = String(nombre || "?").trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

const esAviso = (p: EntradaMuro) => (p.tipo || "") === "aviso";

async function enviar(accion: string, cuerpo: Record<string, unknown>) {
  try {
    const r = await fetch(CONFIG.api("/api/comunidad.php?action=" + accion), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    return (await r.json()) as { ok?: boolean; error?: string };
  } catch {
    return { ok: false };
  }
}

function Entrada({ p, yo, recargar }: { p: EntradaMuro; yo: ApiUser | null; recargar: () => void }) {
  const aviso = esAviso(p);
  const tipo = aviso ? p.aviso || "sistema" : "persona";
  const likes = Array.isArray(p.likes) ? p.likes : [];
  const yaDi = !!yo && likes.includes(yo.id);
  const comentarios = Array.isArray(p.comments) ? p.comments : [];
  const esMio = !aviso && !!yo && String(p.autor_id || "") === String(yo.id || "");
  const destino = aviso ? enlaceDeNovedad(tipo, p.enlace || "") : "";
  const [verComentarios, setVerComentarios] = useState(false);
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(p.titulo || "");
  const [texto, setTexto] = useState(p.text || "");
  const [estadoEdicion, setEstadoEdicion] = useState("");
  const [comentario, setComentario] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const like = async () => {
    if (!yo) {
      location.href = "/login/";
      return;
    }
    const r = await enviar("like", { id: p.id });
    if (r.ok) recargar();
  };
  const guardar = async () => {
    const t = titulo.trim();
    const x = texto.trim();
    if (t.length < 2 || x.length < 2) {
      setEstadoEdicion("Escribe título y texto.");
      return;
    }
    setOcupado(true);
    setEstadoEdicion("Guardando…");
    const r = await enviar("update", { id: p.id, titulo: t, text: x });
    setOcupado(false);
    if (r.ok) {
      setEditando(false);
      setEstadoEdicion("");
      recargar();
    } else setEstadoEdicion(r.error || "No se pudo guardar.");
  };
  const borrar = async () => {
    if (!window.confirm("¿Borrar esta publicación? Se pierden sus comentarios.")) return;
    const r = await enviar("delete", { id: p.id });
    if (r.ok) recargar();
  };
  const comentar = async () => {
    const t = comentario.trim();
    if (t.length < 2) return;
    setOcupado(true);
    const r = await enviar("comment", { id: p.id, text: t });
    setOcupado(false);
    if (r.ok) {
      setComentario("");
      recargar();
    }
  };
  const borrarComentario = async (cid: string) => {
    if (!window.confirm("¿Borrar este comentario?")) return;
    const r = await enviar("comment_delete", { id: p.id, comment_id: cid });
    if (r.ok) recargar();
  };

  return (
    <article className={"redcafe-muro-item" + (aviso ? " es-aviso" : "")} data-tipo={tipo}>
      <span className="redcafe-muro-avatar" aria-hidden="true">
        {aviso ? ICONOS[tipo] || "☕" : iniciales(p.autor)}
      </span>
      <div className="redcafe-muro-cuerpo">
        {/* <div>, no <header>: el CSS del sitio pinta toda cabecera con el fondo oscuro de la barra superior. */}
        <div className="redcafe-muro-cab">
          <div className="redcafe-muro-quien">
            <span className="redcafe-muro-autor">
              {p.autor || "Miembro de la Red"}
              {p.autor_verificado && (
                <span className="redcafe-sello-verificado" title="Perfil verificado por la administración">
                  ✓ Verificado
                </span>
              )}
            </span>
            <span className="redcafe-muro-meta">
              {aviso ? (
                <span className="redcafe-muro-sello">Novedad de la Red</span>
              ) : (
                p.autor_rol && <span className="redcafe-muro-rol">{p.autor_rol}</span>
              )}
              <time dateTime={p.created_at || ""}>{cuando(p.created_at)}</time>
              {p.editado_at && <span className="redcafe-muro-editado">· editado</span>}
            </span>
          </div>
        </div>
        {p.titulo && <h3 className="redcafe-muro-titulo">{p.titulo}</h3>}
        {p.text && <p className="redcafe-muro-texto">{p.text}</p>}
        {(Array.isArray(p.imagenes) ? p.imagenes : [])
          .filter((url) => typeof url === "string" && url.indexOf("/uploads/user-content/") === 0)
          .slice(0, 4)
          .map((url) => (
            <img key={url} className="redcafe-muro-foto" src={url} alt="Imagen de la publicación" loading="lazy" decoding="async" />
          ))}
        {destino && (
          <a className="redcafe-muro-enlace" href={destino}>
            {ENLACE_TEXTO[tipo] || "Ver más"}
          </a>
        )}
        {editando && (
          <div className="redcafe-muro-editor">
            <input type="text" maxLength={140} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <textarea rows={4} maxLength={4000} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <button type="button" className="redcafe-muro-editar-guardar" onClick={guardar} disabled={ocupado}>
              Guardar
            </button>
            <span className="redcafe-muro-editar-estado" role="status" aria-live="polite">
              {estadoEdicion}
            </span>
          </div>
        )}
        <div className="redcafe-muro-pie">
          <button type="button" className={"redcafe-muro-like" + (yaDi ? " es-mio" : "")} aria-pressed={yaDi} onClick={like}>
            {(yaDi ? "♥ " : "♡ ") + likes.length}
          </button>
          {esMio ? (
            <>
              <button type="button" className="redcafe-muro-editar" onClick={() => setEditando((v) => !v)}>
                {editando ? "Cancelar" : "Editar"}
              </button>
              <button type="button" className="redcafe-muro-borrar" onClick={borrar}>
                Borrar
              </button>
            </>
          ) : (
            yo &&
            !aviso &&
            p.autor_id && (
              // Lo atiende redcafe-reportes.js por delegación (data-reportar-uid).
              <button type="button" className="redcafe-muro-reportar" data-reportar-uid={String(p.autor_id)} data-reportar-nombre={p.autor || ""}>
                Reportar
              </button>
            )
          )}
          <button type="button" className="redcafe-muro-comentar" onClick={() => setVerComentarios((v) => !v)} aria-expanded={verComentarios}>
            {comentarios.length === 1 ? "1 comentario" : comentarios.length + " comentarios"}
          </button>
        </div>
        <div className="redcafe-muro-comentarios" hidden={!verComentarios}>
          {comentarios.map((c, i) => {
            const puedeBorrar = !!yo && !!c.id && (c.autor_id === String(yo.id) || p.autor_id === String(yo.id));
            return (
              <div key={c.id || i} className="redcafe-muro-comentario">
                <strong>{c.autor || "Miembro"}</strong>
                <span className="redcafe-muro-comfecha"> · {cuando(c.created_at)}</span>
                <p>{c.text || ""}</p>
                {puedeBorrar && (
                  <button type="button" className="redcafe-muro-borrar" aria-label="Borrar comentario" onClick={() => borrarComentario(String(c.id))}>
                    Borrar
                  </button>
                )}
              </div>
            );
          })}
          {yo ? (
            <div className="redcafe-muro-nuevocom">
              <input type="text" maxLength={1000} placeholder="Escribe un comentario…" value={comentario} onChange={(e) => setComentario(e.target.value)} />
              <button type="button" onClick={comentar} disabled={ocupado}>
                Comentar
              </button>
            </div>
          ) : (
            !comentarios.length && <p className="redcafe-muro-vacio">Entra a tu perfil para comentar.</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function MuroComunidad({
  entradas,
  yo,
  recargar,
  cargando,
  vacio,
}: {
  entradas: EntradaMuro[];
  yo: ApiUser | null;
  recargar: () => void;
  cargando: boolean;
  vacio?: React.ReactNode;
}) {
  const [filtro, setFiltro] = useState("todo");
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const pasa = (p: EntradaMuro) =>
    filtro === "todo" ? true : filtro === "personas" ? !esAviso(p) : esAviso(p) && (p.aviso || "") === filtro;
  const visibles = entradas.filter(pasa);

  return (
    <section id="redcafe-muro" className="redcafe-muro">
      <div className="redcafe-muro-barra" role="group" aria-label="Filtrar el muro">
        {FILTROS.map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            className={"redcafe-muro-filtro" + (filtro === id ? " is-activo" : "")}
            aria-pressed={filtro === id}
            onClick={() => {
              setFiltro(id);
              setMostrar(POR_PAGINA);
            }}
          >
            {nombre}
          </button>
        ))}
      </div>
      <p className="redcafe-muro-resumen" role="status" aria-live="polite">
        {cargando
          ? ""
          : visibles.length === entradas.length
            ? entradas.length + (entradas.length === 1 ? " entrada" : " entradas")
            : "Mostrando " + visibles.length + " de " + entradas.length}
      </p>
      <div className="redcafe-muro-lista">
        {cargando ? (
          <div className="redcafe-skeleton redcafe-skeleton-lista" role="status" aria-label="Cargando comunidad">
            {[0, 1, 2, 3].map((i) => (
              <article key={i} className="redcafe-skeleton-card" aria-hidden="true">
                <span className="redcafe-skeleton-bloque redcafe-skeleton-linea corta" />
                <span className="redcafe-skeleton-bloque redcafe-skeleton-linea" />
                <span className="redcafe-skeleton-bloque redcafe-skeleton-linea media" />
              </article>
            ))}
          </div>
        ) : !entradas.length && vacio ? (
          vacio
        ) : !visibles.length ? (
          <p className="redcafe-muro-vacio">
            {filtro === "personas" ? "Todavía nadie ha escrito en el muro. Puedes ser el primero." : "No hay nada de este tipo por ahora."}
          </p>
        ) : (
          <>
            {visibles.slice(0, mostrar).map((p) => (
              <Entrada key={p.id} p={p} yo={yo} recargar={recargar} />
            ))}
            {visibles.length > mostrar && (
              <button type="button" className="redcafe-muro-vermas" onClick={() => setMostrar((m) => m + POR_PAGINA)}>
                Ver más
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
