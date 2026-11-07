"use client";

// «Pedidos y solicitudes del Marketplace» (arriba del panel) y «Lo que cambia
// para ti cuando entras en la Red» (al pie). Antes los insertaba la capa propia
// (redcafe-v60-final.js) dentro del <main> de React, otra capa les añadía los
// botones de cancelar/eliminar y una tercera los plegaba. Ahora es una sola
// versión, con las mismas clases y la misma memoria de plegado.
import { useEffect, useState, type ReactNode } from "react";

const CLAVE_PLEGADO = "redcafe-panel-abierto-v20260914c:";

function recordado(id: string) {
  try {
    return window.localStorage.getItem(CLAVE_PLEGADO + id) === "1";
  } catch {
    return false;
  }
}

function recordar(id: string, abierto: boolean) {
  try {
    window.localStorage.setItem(CLAVE_PLEGADO + id, abierto ? "1" : "0");
  } catch {
    /* navegación privada: se pliega y ya */
  }
}

/** Cuerpo plegable con el botón «Abrir …/Ocultar …» de las secciones del panel. */
function Plegable({ id, titulo, cuenta, children }: { id: string; titulo: string; cuenta?: number; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    setAbierto(recordado(id) || location.hash === "#" + id);
  }, [id]);
  const texto = titulo.toLowerCase();
  return (
    <>
      <button
        type="button"
        className="redcafe-col-boton"
        aria-controls={id + "-cuerpo"}
        aria-expanded={abierto}
        onClick={() => {
          setAbierto(!abierto);
          recordar(id, !abierto);
        }}
      >
        <span>
          <span className="redcafe-col-texto">{(abierto ? "Ocultar " : "Abrir ") + texto}</span>
          {cuenta ? <span className="redcafe-col-cuenta">{cuenta}</span> : null}
        </span>
        <span className="redcafe-col-flecha" aria-hidden="true">
          ▾
        </span>
      </button>
      <div className="redcafe-col-cuerpo" id={id + "-cuerpo"} hidden={!abierto}>
        {children}
      </div>
    </>
  );
}

type Pedido = {
  nro?: number | string;
  tipo?: string;
  servicio?: string;
  finca?: string;
  productor?: string;
  proveedor?: string;
  estado?: string;
  fecha?: string;
  solicitante_id?: string;
};

function TarjetaPedido({ pedido, uid, onBorrado }: { pedido: Pedido; uid: string; onBorrado: () => void }) {
  const [estado, setEstado] = useState(pedido.estado || "Solicitado");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const nro = String(pedido.nro ?? "");
  const esMio = String(pedido.solicitante_id || "") === uid;
  const puedeCancelar = estado !== "Entregado" && estado !== "Cancelado";
  const puedeEliminar = esMio && (estado === "Solicitado" || estado === "Cancelado");

  async function actuar(accion: "cancelar" | "delete") {
    const pregunta = accion === "delete" ? `¿Eliminar definitivamente el pedido #${nro}?` : `¿Cancelar el pedido #${nro}?`;
    if (!window.confirm(pregunta)) return;
    setOcupado(true);
    setAviso({ ok: true, texto: accion === "delete" ? "Eliminando…" : "Cancelando…" });
    try {
      const r = await fetch(`/api/pedidos.php?action=${accion}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nro: Number(nro) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo completar la acción.");
      if (accion === "delete") {
        onBorrado();
        return;
      }
      setEstado("Cancelado");
      setAviso({ ok: true, texto: "Pedido cancelado." });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message || "No se pudo completar la acción." });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <article className="redcafe-panel-order-card" data-nro={nro}>
      <p className="rotulo text-filtrado-600">
        #{nro} · {pedido.tipo || "café"}
      </p>
      <h3 className="mt-1 font-titulo text-lg font-bold text-cafe">{pedido.servicio || pedido.finca || "Pedido"}</h3>
      <p className="mt-1 text-sm text-pizarra-suave">{pedido.productor || pedido.proveedor || ""}</p>
      <p className="mt-2 font-semibold text-cafe">{estado}</p>
      <p className="mt-1 text-xs text-pizarra-suave">{pedido.fecha || ""}</p>
      {(puedeCancelar || puedeEliminar || aviso) && (
        <div className="redcafe-ped-acciones">
          {puedeCancelar && (
            <button type="button" className="redcafe-ped-btn" disabled={ocupado} onClick={() => actuar("cancelar")}>
              Cancelar pedido
            </button>
          )}
          {puedeEliminar && (
            <button type="button" className="redcafe-ped-btn is-borrar" disabled={ocupado} onClick={() => actuar("delete")}>
              Eliminar
            </button>
          )}
          <span className={"redcafe-pub-estado" + (aviso ? (aviso.ok ? " is-ok" : " is-error") : "")} role="status" aria-live="polite">
            {aviso?.texto ?? ""}
          </span>
        </div>
      )}
    </article>
  );
}

export function PedidosPanel({ uid }: { uid: string }) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/pedidos.php?action=list&_v=" + Date.now(), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (vivo && j?.ok !== false) setPedidos(j?.data?.pedidos ?? j?.pedidos ?? []);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  if (pedidos === null) return null;
  const visibles = pedidos.slice(0, 12);
  return (
    <section id="redcafe-panel-orders" className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cafe/10 pb-3">
        <div>
          <p className="rotulo text-filtrado-600">Continuidad comercial</p>
          <h2 className="font-titulo text-2xl font-bold text-cafe">Pedidos y solicitudes del Marketplace</h2>
        </div>
        <a className="redcafe-panel-link" href="/marketplace/">
          Solicitar en Marketplace
        </a>
      </div>
      <Plegable id="redcafe-panel-orders" titulo="Pedidos y solicitudes del Marketplace" cuenta={visibles.length}>
        <div className="redcafe-panel-orders-grid mt-5">
          {visibles.length === 0 ? (
            <p className="redcafe-launch-note">Todavía no tienes pedidos o solicitudes. Cuando solicites café o servicios, aparecerán aquí.</p>
          ) : (
            visibles.map((p) => (
              <TarjetaPedido key={String(p.nro)} pedido={p} uid={uid} onBorrado={() => setPedidos((xs) => (xs || []).filter((x) => x.nro !== p.nro))} />
            ))
          )}
        </div>
      </Plegable>
    </section>
  );
}

function Recurso({ titulo, texto, href, cta = "Explorar" }: { titulo: string; texto: string; href: string; cta?: string }) {
  return (
    <a className="redcafe-panel-resource-card" href={href}>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      <span>{cta} →</span>
    </a>
  );
}

export function RecursosPanel() {
  return (
    <section id="redcafe-panel-resources" className="mx-auto max-w-6xl px-4 pb-12 pt-8">
      <div className="redcafe-panel-resources-head">
        <p className="rotulo text-filtrado-600">Todo lo de esta sección entra con tu cuenta gratuita</p>
        <h2>Lo que cambia para ti cuando entras en la Red</h2>
        <p>El registro y las herramientas básicas no tienen costo. Los servicios especializados se contratan aparte, solo si los necesitas.</p>
      </div>
      <Plegable id="redcafe-panel-resources" titulo="Lo que cambia para ti cuando entras en la Red">
        <div className="redcafe-panel-resource-grid">
          <Recurso titulo="Marketplace" texto="Publica lotes de café, encuentra oferta disponible y coordina operaciones con origen visible." href="/marketplace/" />
          <Recurso titulo="Academia" texto="Aprende lo que de verdad sube el precio de tu café: proceso, secado y taza." href="/academia/" />
          <Recurso titulo="Servicios" texto="Resuelve lo que te frena: exportar, formalizarte, cumplir con Europa." href="/servicios/" />
          <Recurso titulo="Confianza" texto="Sabes con quién tratas antes de mandar un solo saco." href="/comunidad/" />
        </div>
        <div className="redcafe-panel-resources-head redcafe-panel-resources-gap">
          <p className="rotulo text-filtrado-600">Herramientas para negociar con números, no a ciegas</p>
        </div>
        <div className="redcafe-panel-resource-grid redcafe-panel-resource-grid-tools">
          <Recurso titulo="Panel de Precios del Mercado" texto="Referencia ICE C y diferenciales para fijar tu oferta con información." href="/servicios/precios/" cta="Ver más" />
          <Recurso titulo="Calculadora de Venta" texto="Convierte quintales y sacos, estima tu ingreso neto y margen por lote." href="/servicios/calculadora/" cta="Ver más" />
          <Recurso titulo="Dossier EUDR de tu Finca" texto="Registra el GPS de tu finca y genera el documento de debida diligencia listo para exportar." href="/servicios/eudr/" cta="Ver más" />
          <Recurso titulo="Facturación Electrónica" texto="Herramientas de apoyo para organizar y emitir documentación comercial desde la Red." href="/servicios/factura/" cta="Ver más" />
          <Recurso titulo="Soporte y Comunidad WhatsApp" texto="Asistencia directa y una red de contactos comerciales en tu canal favorito." href="/comunidad/" cta="Ver más" />
        </div>
        <div className="redcafe-panel-eudr">
          <div>
            <p className="rotulo text-filtrado-600">Cuenta atrás europea</p>
            <h2>Tu comprador te va a pedir el origen antes de que llegue la fecha</h2>
            <p>
              El reglamento europeo se aplica desde el <b>30 de diciembre de 2026</b> a los compradores grandes y medianos, y desde el <b>30 de junio de 2027</b> a
              los pequeños. La obligación es de ellos, pero necesitan los datos de tu finca para cumplirla: <b>te los pedirán entre seis y doce meses antes</b>.
            </p>
          </div>
          <div className="redcafe-action-row">
            <a href="/servicios/eudr/">Arma tu expediente</a>
            <a href="/servicios/">Hablar con un asesor</a>
          </div>
        </div>
        <div className="redcafe-panel-split">
          <article>
            <p className="rotulo text-filtrado-600">Precio de mercado del café</p>
            <h3>El ticker muestra la cotización internacional base.</h3>
            <p>En el panel completo ves histórico, fuentes oficiales y referencias para estimar precio en Ecuador.</p>
            <a href="/servicios/precios/">Ver panel completo →</a>
          </article>
          <article>
            <p className="rotulo text-filtrado-600">Cómo garantizamos la confianza</p>
            <h3>Una Red basada en personas reales</h3>
            <p>
              La confianza comienza sabiendo con quién estás conectando: perfil claro, información de finca o empresa y contacto directo entre miembros.
            </p>
            <a href="/servicios/">Ver cómo funciona →</a>
          </article>
        </div>
      </Plegable>
    </section>
  );
}
