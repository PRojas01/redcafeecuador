"use client";

// Pestañas «Empleos» (ofertas y quien busca trabajo) y «Requerimientos» (lo que
// la gente busca comprar) del marketplace. Antes las insertaba la capa propia
// junto a las pestañas de React; ahora son pestañas de la misma página.
// Reutilizan a propósito las clases visuales de Empleos (redcafe-empleo-*).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DeclaracionDerechos } from "@/components/DeclaracionDerechos";
import { CONFIG } from "@/lib/config";
import { s } from "@/lib/lotesVista";
import { EsqueletoTarjetas } from "./Tarjetas";

type Doc = Record<string, unknown> & { id?: string };

const ETIQUETAS_EMPLEO = {
  jornada: { "tiempo-completo": "Tiempo completo", "medio-tiempo": "Medio tiempo", "por-horas": "Por horas", temporal: "Temporal", "por-obra": "Por obra" } as Record<string, string>,
  experiencia: { "sin-experiencia": "Sin experiencia", "1-2-anios": "1 a 2 años", "3-5-anios": "3 a 5 años", "mas-5-anios": "Más de 5 años" } as Record<string, string>,
  periodo: { hora: "por hora", dia: "por día", mes: "al mes", obra: "por obra" } as Record<string, string>,
};
const ETIQUETAS_BUSQUEDA = {
  categoria: {
    barismo: "Barismo",
    "produccion-agricola": "Producción agrícola",
    "beneficio-pilado": "Beneficio y pilado",
    tueste: "Tueste",
    "calidad-catacion": "Calidad y catación",
    ventas: "Ventas",
    "logistica-transporte": "Logística y transporte",
    administracion: "Administración",
    "tecnico-agronomo": "Técnico agrónomo",
    otro: "Otro",
  } as Record<string, string>,
  disponibilidad: { inmediata: "Disponible ya", "dos-semanas": "En dos semanas", "un-mes": "En un mes", "a-convenir": "A convenir" } as Record<string, string>,
  modalidad: { presencial: "Presencial", hibrido: "Híbrido", remoto: "Remoto", cualquiera: "" } as Record<string, string>,
  jornada: { "tiempo-completo": "Tiempo completo", "medio-tiempo": "Medio tiempo", "por-horas": "Por horas", temporal: "Temporal", "por-obra": "Por obra", cualquiera: "" } as Record<string, string>,
};
const ETIQUETAS_REQ = {
  tipo: { verde: "Café verde", tostado: "Café tostado", cualquiera: "Verde o tostado" } as Record<string, string>,
  proceso: { lavado: "Lavado", honey: "Honey", natural: "Natural", cualquiera: "" } as Record<string, string>,
  frecuencia: { unica: "Compra única", mensual: "Cada mes", trimestral: "Cada trimestre", anual: "Cada año" } as Record<string, string>,
  unidadSingular: { sacos: "saco", quintales: "quintal", kg: "kg" } as Record<string, string>,
};

const corto = (t: unknown) => {
  const d = s(t);
  return d.slice(0, 220) + (d.length > 220 ? "…" : "");
};

function sueldoEmpleo(e: Doc) {
  const desde = Number(e.salarioDesde || 0);
  const hasta = Number(e.salarioHasta || 0);
  if (!desde && !hasta) return "Salario a convenir";
  const periodo = ETIQUETAS_EMPLEO.periodo[s(e.salarioPeriodo)] || "";
  if (desde && hasta && desde !== hasta) return `$ ${desde} – ${hasta} ${periodo}`;
  return `$ ${desde || hasta} ${periodo}`;
}

function pretensionBusqueda(b: Doc) {
  const d = b.pretensionDesde === null || b.pretensionDesde === undefined ? null : Number(b.pretensionDesde);
  const h = b.pretensionHasta === null || b.pretensionHasta === undefined ? null : Number(b.pretensionHasta);
  if (d === null && h === null) return "Pretensión a convenir";
  const per = ETIQUETAS_EMPLEO.periodo[s(b.pretensionPeriodo)] || "";
  if (d !== null && h !== null) return `$${d.toFixed(2)} - $${h.toFixed(2)} ${per}`;
  if (d !== null) return `Desde $${d.toFixed(2)} ${per}`;
  return `Hasta $${(h as number).toFixed(2)} ${per}`;
}

function cantidadRequerimiento(r: Doc) {
  const num = Number(r.cantidad);
  if (!Number.isFinite(num) || num <= 0) return "";
  const unidad = (num === 1 && ETIQUETAS_REQ.unidadSingular[s(r.unidad)]) || s(r.unidad);
  return `${num} ${unidad}`;
}

function fechaRequerimiento(iso: unknown) {
  const v = s(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v + "T00:00:00");
  if (isNaN(d.getTime())) return v;
  try {
    return d.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return v;
  }
}

function precioRequerimiento(r: Doc) {
  if (r.precioReferencia === null || r.precioReferencia === undefined) return "Precio a convenir";
  return "Referencia: $" + Number(r.precioReferencia).toFixed(2);
}

let sesionPromesa: Promise<boolean> | null = null;
function haySesion(): Promise<boolean> {
  if (!sesionPromesa) {
    sesionPromesa = fetch(CONFIG.api("/api/auth.php?action=me&_=" + Date.now()), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((res) => !!(res && res.ok && res.data && res.data.user && res.data.user.id))
      .catch(() => false);
  }
  return sesionPromesa;
}

/* ── Formulario dentro de la tarjeta ─────────────────────────────── */

type Campo = { nombre: string; rotulo: string; tipo: "tel" | "number" | "text"; max?: number };
type Envio = {
  url: string;
  rotulo: string;
  ayuda: string;
  campos: Campo[];
  minimo: string;
  boton: string;
  ok: string;
  hecho: string;
  sinCuenta: string;
  cuerpo: (texto: string, extra: Record<string, string>) => Record<string, unknown>;
};

type Aviso = { tipo: "" | "es-ok" | "es-error"; texto: ReactNode };

function TarjetaConFormulario({
  datos,
  boton,
  claseBoton,
  envio,
  pideSesion,
  avisoSinSesion,
  children,
}: {
  datos: Record<string, string>;
  boton: string;
  claseBoton: string;
  envio: Envio;
  pideSesion: boolean;
  avisoSinSesion: string;
  children: ReactNode;
}) {
  const [aceptaDerechos, setAceptaDerechos] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [aviso, setAviso] = useState<Aviso>({ tipo: "", texto: "" });
  const [texto, setTexto] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (abierto) area.current?.focus();
  }, [abierto]);

  const cuentaPrimero = (mensaje: string) =>
    setAviso({
      tipo: "es-error",
      texto: (
        <>
          {mensaje} <a href="/afiliate/">Crear cuenta gratis</a> · <a href="/login/">Entrar</a>
        </>
      ),
    });

  const abrir = async () => {
    if (hecho || abierto) return;
    if (pideSesion && !(await haySesion())) return cuentaPrimero(avisoSinSesion);
    setAbierto(true);
  };

  const enviar = async () => {
    if (!aceptaDerechos) return;
    const mensaje = texto.trim();
    if (mensaje.length < 20) return setAviso({ tipo: "es-error", texto: envio.minimo });
    setAviso({ tipo: "", texto: "Enviando…" });
    try {
      const r = await fetch(CONFIG.api(envio.url), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...envio.cuerpo(mensaje, extra), acepta_derechos: true }),
      });
      const res = await r.json().catch(() => ({ ok: false }));
      if (res && res.ok) {
        setAbierto(false);
        setHecho(true);
        setAviso({ tipo: "es-ok", texto: envio.ok });
      } else {
        setAviso({ tipo: "es-error", texto: r.status === 401 ? envio.sinCuenta : (res && res.error) || "No se pudo enviar. Inténtelo de nuevo." });
      }
    } catch {
      setAviso({ tipo: "es-error", texto: "No se pudo conectar." });
    }
  };

  return (
    <article className="border border-border-soft bg-white p-5 shadow-sm redcafe-empleo-card" {...datos}>
      {children}
      <button type="button" className={`btn-primary mt-4 !px-4 !py-2 text-sm ${claseBoton}`} disabled={hecho} onClick={abrir}>
        {hecho ? envio.hecho : boton}
      </button>
      <p className={"redcafe-empleo-aviso" + (aviso.tipo ? " " + aviso.tipo : "")} role="status" aria-live="polite">
        {aviso.texto}
      </p>
      {abierto && (
        <div className="redcafe-empleo-form">
          <label>
            <span>{envio.rotulo}</span>
            <textarea ref={area} rows={4} maxLength={1500} placeholder={envio.ayuda} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
          {envio.campos.map((c) => (
            <label key={c.nombre}>
              <span>{c.rotulo}</span>
              <input
                type={c.tipo}
                inputMode={c.tipo === "tel" ? "tel" : c.tipo === "number" ? "decimal" : undefined}
                maxLength={c.max}
                min={c.tipo === "number" ? 0 : undefined}
                step={c.tipo === "number" ? "0.01" : undefined}
                value={extra[c.nombre] || ""}
                onChange={(e) => setExtra({ ...extra, [c.nombre]: e.target.value })}
              />
            </label>
          ))}
          <DeclaracionDerechos aceptado={aceptaDerechos} onChange={setAceptaDerechos} />
          <div className="redcafe-empleo-acciones">
            <button type="button" className="redcafe-empleo-cancelar" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button type="button" className="redcafe-empleo-enviar" disabled={!aceptaDerechos} onClick={enviar}>
              {envio.boton}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Etiquetas({ lista }: { lista: string[] }) {
  return (
    <p className="redcafe-empleo-etiquetas">
      {lista.filter(Boolean).map((t) => (
        <span key={t}>{t}</span>
      ))}
    </p>
  );
}

function OfertaEmpleo({ e }: { e: Doc }) {
  const lugar = [e.canton, e.provincia].filter(Boolean).join(", ");
  return (
    <TarjetaConFormulario
      datos={{ "data-empleo": s(e.id) }}
      boton="Postular"
      claseBoton="redcafe-empleo-postular"
      pideSesion
      avisoSinSesion="Crea tu perfil gratis para postular y recibir la respuesta en tu panel"
      envio={{
        url: "/api/empleos.php?action=postular",
        rotulo: "Cuéntale al empleador por qué te interesa",
        ayuda: "Tu experiencia, tu disponibilidad y cómo contactarte.",
        campos: [{ nombre: "telefono", rotulo: "Teléfono (opcional)", tipo: "tel", max: 40 }],
        minimo: "Escribe al menos un par de frases: el empleador necesita saber quién eres.",
        boton: "Enviar postulación",
        ok: "Postulación enviada. Verás la respuesta en tu panel.",
        hecho: "Ya postulaste",
        sinCuenta: "Crea tu perfil gratis para postular y recibir la respuesta en tu panel.",
        cuerpo: (mensaje, x) => ({ id: e.id, mensaje, telefono: x.telefono || "" }),
      }}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-green-700">{lugar || "Ecuador"}</p>
      <h3 className="mt-2 font-titulo text-xl font-bold text-coffee-900">{s(e.titulo) || "Oferta de empleo"}</h3>
      {!!e.empresa && <p className="mt-1 text-sm font-semibold text-text-secondary">{s(e.empresa)}</p>}
      <Etiquetas lista={[ETIQUETAS_EMPLEO.jornada[s(e.jornada)] || s(e.jornada), s(e.modalidad), ETIQUETAS_EMPLEO.experiencia[s(e.experiencia)] || ""]} />
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">{corto(e.descripcion)}</p>
      <p className="mt-3 text-lg font-bold text-coffee-900">{sueldoEmpleo(e)}</p>
      <p className="redcafe-empleo-pie">
        {Number(e.vacantes || 1)} vacante(s)
        {e.cierra ? " · recibe postulaciones hasta el " + s(e.cierra) : ""}
      </p>
    </TarjetaConFormulario>
  );
}

function BuscaEmpleo({ b }: { b: Doc }) {
  const lugar = [b.canton, b.provincia].filter(Boolean).join(", ");
  return (
    <TarjetaConFormulario
      datos={{ "data-busqueda": s(b.id) }}
      boton="Escribirle"
      claseBoton="redcafe-busco-contactar"
      pideSesion={false}
      avisoSinSesion=""
      envio={{
        url: "/api/busco-empleo.php?action=contactar",
        rotulo: "Cuéntele qué puesto tiene",
        ayuda: "El puesto, dónde es, la jornada y cómo postular.",
        campos: [{ nombre: "empresa", rotulo: "Empresa o finca (opcional)", tipo: "text", max: 120 }],
        minimo: "Escriba al menos un par de frases: al otro lado hay alguien buscando trabajo.",
        boton: "Enviar mensaje",
        ok: "Mensaje enviado. Le avisamos en su panel cuando responda.",
        hecho: "Ya le escribió",
        sinCuenta: "Crea tu perfil gratis para escribirle y recibir la respuesta desde tu panel.",
        cuerpo: (mensaje, x) => ({ id: b.id, mensaje, empresa: x.empresa || "" }),
      }}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-green-700">{lugar || "Ecuador"}</p>
      <h3 className="mt-2 font-titulo text-xl font-bold text-coffee-900">{s(b.titulo) || "Busca empleo"}</h3>
      <p className="mt-1 text-sm font-semibold text-text-secondary">{s(b.autor) || "Un miembro de la Red"}</p>
      <Etiquetas
        lista={[
          ETIQUETAS_BUSQUEDA.categoria[s(b.categoria)] || s(b.categoria),
          ETIQUETAS_EMPLEO.experiencia[s(b.experiencia)] || "",
          ETIQUETAS_BUSQUEDA.jornada[s(b.jornada)] || "",
          ETIQUETAS_BUSQUEDA.modalidad[s(b.modalidad)] || "",
          ETIQUETAS_BUSQUEDA.disponibilidad[s(b.disponibilidad)] || "",
        ]}
      />
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">{corto(b.descripcion)}</p>
      <p className="mt-3 text-lg font-bold text-coffee-900">{pretensionBusqueda(b)}</p>
    </TarjetaConFormulario>
  );
}

function Requerimiento({ r }: { r: Doc }) {
  const foto = (Array.isArray(r.imagenes) ? r.imagenes : []).map(s).find((u) => u.indexOf("/uploads/user-content/") === 0);
  return (
    <TarjetaConFormulario
      datos={{ "data-requerimiento": s(r.id) }}
      boton="Ofrecer mi café"
      claseBoton="redcafe-req-ofrecer"
      pideSesion
      avisoSinSesion="Crea tu perfil gratis para ofrecer café y ver la respuesta en tu panel"
      envio={{
        url: "/api/requerimientos.php?action=ofertar",
        rotulo: "Cuéntele qué café tiene",
        ayuda: "Variedad, proceso, puntaje, cantidad disponible y si puede enviar muestra.",
        campos: [
          { nombre: "cantidad", rotulo: "Cantidad que ofrece (opcional)", tipo: "number" },
          { nombre: "precio", rotulo: "Precio por unidad (opcional)", tipo: "number" },
        ],
        minimo: "Escriba al menos un par de frases: quien compra necesita saber qué café le ofrece.",
        boton: "Enviar oferta",
        ok: "Oferta enviada. Verá la respuesta en su panel.",
        hecho: "Ya ofertó",
        sinCuenta: "Crea tu perfil gratis para ofrecer café y dar seguimiento a la respuesta desde tu panel.",
        cuerpo: (mensaje, x) => ({ id: r.id, mensaje, cantidad: x.cantidad || "", precio: x.precio || "" }),
      }}
    >
      {foto && (
        <img src={foto} alt="Foto del requerimiento" loading="lazy" decoding="async" className="redcafe-servicio-foto" onError={(e) => e.currentTarget.remove()} />
      )}
      <p className="text-xs font-bold uppercase tracking-widest text-green-700">{r.provincia ? "Origen: " + s(r.provincia) : "Cualquier origen"}</p>
      <h3 className="mt-2 font-titulo text-xl font-bold text-coffee-900">{s(r.titulo) || "Requerimiento de café"}</h3>
      {!!(r.empresa || r.autor) && <p className="mt-1 text-sm font-semibold text-text-secondary">{s(r.empresa || r.autor)}</p>}
      <Etiquetas
        lista={[ETIQUETAS_REQ.tipo[s(r.tipo)] || s(r.tipo), s(r.variedad), ETIQUETAS_REQ.proceso[s(r.proceso)] || "", ETIQUETAS_REQ.frecuencia[s(r.frecuencia)] || ""]}
      />
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">{corto(r.descripcion)}</p>
      <p className="mt-3 text-lg font-bold text-coffee-900">Busca {cantidadRequerimiento(r)}</p>
      <p className="redcafe-empleo-pie">
        {precioRequerimiento(r)}
        {r.puntajeMinimo ? " · desde " + s(r.puntajeMinimo) + " puntos SCA" : ""}
        {r.certificacion ? " · " + s(r.certificacion) : ""}
        {r.cierra ? " · vigente hasta el " + fechaRequerimiento(r.cierra) : ""}
      </p>
    </TarjetaConFormulario>
  );
}

/* ── Carga de listados ───────────────────────────────────────────── */

function useListado(url: string, clave: string, activo: boolean) {
  const [lista, setLista] = useState<Doc[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!activo || lista) return;
    let vivo = true;
    fetch(CONFIG.api(url), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        const d = (res && res.ok && res.data) || {};
        if (vivo) setLista(Array.isArray(d[clave]) ? d[clave] : []);
      })
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [activo, lista, url, clave]);
  return { lista, error };
}

const VACIO = (t: ReactNode) => <p className="redcafe-market-vacio">{t}</p>;

export function PestanaEmpleos({ claseGrid }: { claseGrid: string }) {
  const [vista, setVista] = useState<"ofertas" | "busco">("ofertas");
  const ofertas = useListado("/api/empleos.php?action=list", "empleos", vista === "ofertas");
  const busco = useListado("/api/busco-empleo.php?action=list", "busquedas", vista === "busco");
  const actual = vista === "busco" ? busco : ofertas;
  const n = actual.lista?.length ?? 0;
  const resumen =
    actual.lista === null
      ? ""
      : vista === "busco"
        ? n === 0
          ? "Nadie ha publicado todavía que busca trabajo."
          : n === 1
            ? "1 persona busca trabajo."
            : n + " personas buscan trabajo."
        : n === 0
          ? "Ninguna oferta publicada todavía."
          : n === 1
            ? "1 oferta de empleo publicada."
            : n + " ofertas de empleo publicadas.";

  return (
    <>
      <div className="redcafe-market-grupo redcafe-empleo-conmutador" role="group" aria-label="Qué lado de la bolsa de empleo mirar">
        {(
          [
            ["ofertas", "Ofertas de trabajo"],
            ["busco", "Buscan trabajo"],
          ] as const
        ).map(([v, t]) => (
          <button key={v} type="button" data-vista={v} className={vista === v ? "is-activo" : ""} aria-pressed={vista === v} onClick={() => setVista(v)}>
            {t}
          </button>
        ))}
      </div>
      <p className="redcafe-market-resumen" role="status" aria-live="polite">
        {resumen}
      </p>
      <div id="redcafe-empleos-propio" className={claseGrid}>
        {actual.error
          ? VACIO("No se pudo cargar. Inténtelo de nuevo.")
          : actual.lista === null
            ? <EsqueletoTarjetas cuantas={4} />
            : actual.lista.length === 0
              ? vista === "busco"
                ? VACIO("Todavía nadie ha publicado que busca trabajo. Si usted lo busca, publíquelo desde su panel: lo puede hacer cualquier perfil.")
                : VACIO(
                    "Todavía no hay ofertas publicadas. Si tienes un negocio de café, publica la tuya desde tu panel. Y si lo que ofreces es tu propio servicio o una asesoría, va en la pestaña «Servicios».",
                  )
              : actual.lista.map((x) => (vista === "busco" ? <BuscaEmpleo key={s(x.id)} b={x} /> : <OfertaEmpleo key={s(x.id)} e={x} />))}
      </div>
    </>
  );
}

export function PestanaRequerimientos({ claseGrid }: { claseGrid: string }) {
  const { lista, error } = useListado("/api/requerimientos.php?action=list", "requerimientos", true);
  const n = lista?.length ?? 0;
  return (
    <>
      <p className="redcafe-market-resumen" role="status" aria-live="polite">
        {lista === null ? "" : n === 0 ? "Ningún requerimiento abierto." : n === 1 ? "1 requerimiento abierto." : n + " requerimientos abiertos."}
      </p>
      <div id="redcafe-requerimientos-propio" className={claseGrid}>
        {error
          ? VACIO("No se pudieron cargar los requerimientos.")
          : lista === null
            ? <EsqueletoTarjetas cuantas={4} />
            : lista.length === 0
              ? VACIO("Todavía nadie ha publicado qué café busca. Si usted compra café, publique el suyo desde su panel.")
              : lista.map((r) => <Requerimiento key={s(r.id)} r={r} />)}
      </div>
    </>
  );
}
