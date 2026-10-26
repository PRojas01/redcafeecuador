"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, getStoredSession, type Lote as ApiLote, type MarketplaceServicio, type ApiUser } from "@/lib/api";
import { LOTES, SERVICIOS_PAGADOS } from "@/lib/data";
import { CONFIG, waLink } from "@/lib/config";
import dynamic from "next/dynamic";
import { SacoExportacion } from "@/components/Lamina";
import { colorDeCata, familiaDeCata, ETIQUETA_CATA } from "@/lib/cata";
import { SkeletonGrid } from "@/components/Skeleton";
import { EstadoError } from "@/components/EstadoError";
import { EstadoVacio } from "@/components/EstadoVacio";

const MapaProductores = dynamic(() => import("@/components/MapaProductores"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-none bg-cream-200" />
  ),
});


/** Fotografía real según el proceso del lote.
 *  No es decoración: los tres procesos se ven distintos de verdad. El natural
 *  seca el grano dentro de la cereza, el honey conserva mucílago sobre el
 *  pergamino y el lavado llega limpio al café verde. La foto corresponde a lo
 *  que el comprador va a recibir. */
const FOTO_POR_PROCESO: Record<string, string> = {
  Natural: "secado",
  Honey: "pergamino",
  Lavado: "verde",
};

function FotoProceso({ proceso, finca, imagen }: { proceso: string; finca: string; imagen?: string }) {
  if (imagen) {
    return (
      <img
        src={imagen}
        alt={`Foto del lote de ${finca}`}
        className="aspect-[16/10] w-full object-cover"
        width={800}
        height={500}
        loading="lazy"
        decoding="async"
      />
    );
  }
  const foto = FOTO_POR_PROCESO[proceso] ?? "verde";
  return (
    <img
      src={`${CONFIG.basePath}/img/proceso/${foto}.webp`}
      alt={`Café de ${finca}, proceso ${proceso.toLowerCase()}`}
      className="aspect-[16/10] w-full object-cover"
      width={800}
      height={500}
      loading="lazy"
      decoding="async"
    />
  );
}

function etiquetaCategoriaServicio(categoria: MarketplaceServicio["categoria"]) {
  const etiquetas: Record<MarketplaceServicio["categoria"], string> = {
    transporte: "Transporte",
    catacion: "Catación",
    asesoria: "Asesoría",
    pilado: "Pilado",
    insumos: "Equipos e insumos",
    capacitacion: "Capacitación",
    exportacion: "Exportación",
    otro: "Servicio",
  };
  return etiquetas[categoria] ?? "Servicio";
}

function unidadServicio(unidad: string) {
  return unidad.replace(/^por\s+/i, "").trim();
}

const categoriaMarketplace: Record<string, MarketplaceServicio["categoria"]> = {
  asesoria: "asesoria",
  capacitacion: "capacitacion",
  certificacion: "catacion",
  logistica: "transporte",
  basico: "otro",
};

const categoriaRedcafePorId: Record<string, MarketplaceServicio["categoria"]> = {
  "redcafe-cert-eudr": "exportacion",
  "redcafe-cert-catacion": "catacion",
  "redcafe-flete-cafe": "transporte",
  "redcafe-pilado-sacos": "pilado",
  "redcafe-marketplace": "otro",
  "redcafe-acceso-basico": "otro",
  "redcafe-academia-basica": "capacitacion",
  "redcafe-precios-libres": "otro",
  "redcafe-facturacion": "asesoria",
};

const SERVICIOS_REDFCAFE_MARKETPLACE: MarketplaceServicio[] = SERVICIOS_PAGADOS.map((s) => ({
  id: `redcafe-${s.id}`,
  titulo: s.nombre === "Expediente EUDR" ? "Expediente de trazabilidad / EUDR" : s.nombre,
  categoria: categoriaRedcafePorId[`redcafe-${s.id}`] ?? categoriaMarketplace[s.categoria] ?? "otro",
  descripcion: s.descripcion,
  provincia: "Ecuador",
  cobertura: "Nacional",
  precio: s.precio,
  unidad: s.unidad,
  proveedor: "Red Café Ecuador",
  proveedor_id: "redcafe",
  proveedor_rol: "admin",
  proveedor_roles: ["admin"],
  visibilidad: "publico",
  verificado: true,
  redcafe: true,
  created_at: "2026-08-26T00:00:00.000Z",
}));

function unirServiciosRedcafe(publicados: MarketplaceServicio[]) {
  const alias: Record<string, string> = {
    catacion: "cert-catacion",
    flete: "flete-cafe",
    pilado: "pilado-sacos",
    capacitacion: "academia-basica",
    facturacion: "facturacion",
  };
  const normalizar = (id: string) => {
    const limpio = id.replace(/^redcafe-/, "");
    return alias[limpio] ?? limpio;
  };
  const ids = new Set(publicados.map((item) => normalizar(item.id)));
  return [
    ...SERVICIOS_REDFCAFE_MARKETPLACE.filter((item) => !ids.has(normalizar(item.id))),
    ...publicados,
  ];
}

export default function MarketplacePage() {
  const [vista, setVista] = useState<"cafes" | "servicios">("cafes");
  const [provincia, setProvincia] = useState("todas");
  const [variedad, setVariedad] = useState("todas");
  const [proceso, setProceso] = useState("todos");
  const [q, setQ] = useState("");
  // Detectar sesión al hidratar para que el botón "Publicar" vaya al panel si el
  // usuario ya está autenticado, o a /afiliate si todavía no.
  const [sesion, setSesion] = useState<ApiUser | null>(null);
  useEffect(() => { setSesion(getStoredSession()); }, []);
  const destinoPublicarLote = sesion ? "/panel?ver=publicar" : "/afiliate?rol=productor";
  const destinoPublicarServicio = sesion ? "/panel?ver=publicar_servicio" : "/afiliate?rol=proveedor";
  // Sembrado con los lotes de demostración para que el HTML servido ya traiga
  // contenido: sin esto la página llega vacía a Google y a una conexión lenta.
  // La carga desde la API lo reemplaza en cuanto responde.
  const [lotes, setLotes] = useState<ApiLote[]>(
    LOTES.map((l) => ({ ...l, ejemplo: true })) as unknown as ApiLote[],
  );
  const [servicios, setServicios] = useState<MarketplaceServicio[]>(SERVICIOS_REDFCAFE_MARKETPLACE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [solicitando, setSolicitando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    const [r, s] = await Promise.all([api.lotesList(), api.marketplaceServiciosList()]);
    if (r.ok && r.data) {
      setLotes((r.data as { lotes: ApiLote[] }).lotes ?? []);
    } else {
      setError(r.error ?? "No pudimos cargar los cafés");
    }
    if (s.ok && s.data) {
      setServicios(unirServiciosRedcafe(s.data.servicios ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const provincias = useMemo(() => Array.from(new Set([
    ...lotes.map((l) => l.provincia),
    ...servicios.map((s) => s.provincia ?? "").filter(Boolean),
  ])), [lotes, servicios]);
  const variedades = useMemo(() => Array.from(new Set(lotes.map((l) => l.variedad))), [lotes]);
  const procesos = useMemo(() => Array.from(new Set(lotes.map((l) => l.proceso))), [lotes]);

  const filtrosActivos = [provincia, variedad, proceso].filter(
    (v) => v !== "todas" && v !== "todos"
  ).length;

  const solicitarServicio = async (s: MarketplaceServicio) => {
    setAviso(null);
    setSolicitando(s.id);
    const r = await api.pedidoServicioCreate({
      servicioId: s.id,
      titulo: s.titulo,
      proveedor: s.proveedor,
      proveedorId: s.proveedor_id,
      cantidad: 1,
      total: s.precio,
    });
    setSolicitando(null);
    if (r.ok) {
      setAviso(`Solicitud enviada: ${s.titulo}. La verás en tu panel y podrás conversar desde el chat.`);
    } else {
      setAviso(r.status === 401 ? "Inicia sesión para solicitar este servicio." : r.error || "No pudimos enviar la solicitud.");
    }
  };

  const filtrados = lotes.filter((l) => {
    if (provincia !== "todas" && l.provincia !== provincia) return false;
    if (variedad !== "todas" && l.variedad !== variedad) return false;
    if (proceso !== "todos" && l.proceso !== proceso) return false;
    if (q.trim()) {
      const haystack = `${l.finca} ${l.productor} ${l.provincia} ${l.variedad} ${l.proceso} ${l.certificacion} ${l.precioSaco}`.toLowerCase();
      const words = q.trim().toLowerCase().split(/\s+/);
      if (!words.every((w) => haystack.includes(w))) return false;
    }
    return true;
  }).sort((a, b) => b.score - a.score);

  const lotesUbicables = useMemo(() => {
    return filtrados.filter((l) => typeof l.lat === "number" && typeof l.lng === "number");
  }, [filtrados]);

  const serviciosFiltrados = servicios.filter((s) => {
    if (provincia !== "todas" && s.provincia !== provincia) return false;
    if (q.trim()) {
      const haystack = `${s.titulo} ${s.proveedor} ${s.provincia ?? ""} ${s.cobertura ?? ""} ${s.categoria} ${s.descripcion}`.toLowerCase();
      const words = q.trim().toLowerCase().split(/\s+/);
      if (!words.every((w) => haystack.includes(w))) return false;
    }
    return true;
  });

  const limpiarFiltros = () => {
    setProvincia("todas");
    setVariedad("todas");
    setProceso("todos");
    setQ("");
  };

  const cerrarFiltros = () => setFiltrosAbiertos(false);
  useEffect(() => {
    if (!filtrosAbiertos) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFiltrosAbiertos(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filtrosAbiertos]);
  const selectCls =
    "rounded-lg border border-border-soft bg-white px-3 py-2 text-sm text-coffee-900";
  const etiqueta = "text-xs font-semibold uppercase tracking-wide text-text-muted";

  return (
    <div>
      {/* ═══════════ HERO §54 ═══════════ */}
      <section className="border-b border-border-soft bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="badge bg-gold-500/15 text-coffee-800">MARKETPLACE · VISTA DE DEMOSTRACIÓN</p>
          <h1 className="mt-4 max-w-2xl font-titulo text-4xl font-bold leading-[1.1] text-coffee-900 md:text-5xl">
            Café y servicios para el negocio cafetero
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-text-secondary">
            Explora lotes de café y servicios de terceros: transporte, catación,
            asesoría, pilado, insumos, capacitación y apoyo comercial.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={destinoPublicarLote} className="btn-primary">
              Publicar un lote
           </Link>
            <Link href={destinoPublicarServicio} className="btn-ghost">
              Publicar un servicio
           </Link>
            <a
              href={waLink("Hola, quiero publicar un lote en Red Café Ecuador.")}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              Alta asistida por WhatsApp
            </a>
          </div>
          <p className="mt-4 text-sm text-text-muted">
            Los lotes marcados como demostración no son fincas reales. Los lotes reales
            aparecerán con contacto directo y negociación acordada entre las partes.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-14 pt-8">
        {/* ═══════════ MAPA §57 ═══════════ */}
        {vista === "cafes" && <div id="mapa" className="overflow-hidden rounded-2xl border border-border-soft bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft bg-surface-soft px-5 py-4">
            <div>
              <h2 className="font-titulo text-xl font-bold text-coffee-900">
                Explora cómo se verá el origen
              </h2>
              <p className="text-sm text-text-secondary">
                Cada marcador sale de los mismos lotes filtrados que ves abajo.
              </p>
            </div>
            <span className="hidden text-xs text-text-muted sm:block">
              {lotesUbicables.length} de {filtrados.length} cafés tienen ubicación
            </span>
          </div>
          {/* El mapa no depende de la API: los lotes de demostración traen sus propias
              coordenadas, así que sigue mostrándose aunque el servidor no responda. */}
          {loading ? (
            <div className="h-[420px] w-full animate-pulse rounded-none bg-cream-200" />
          ) : lotesUbicables.length === 0 ? (
            <EstadoVacio
              titulo="Aún no hay fincas ubicadas en el mapa"
              descripcion="Cuando un productor publique su lote con ubicación, su finca aparecerá aquí."
            />
          ) : (
            <>
            <p className="border-b border-border-soft bg-white px-5 py-3 text-xs text-text-muted sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
              <span className="inline-flex min-w-0 items-center gap-1.5"><span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-latte bg-cereza"></span><span>Lotes publicados con ubicación</span></span>
              <span className="inline-flex min-w-0 items-center gap-1.5"><span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-dashed border-border-soft bg-text-muted opacity-75"></span><span>Demostración si el lote está marcado como ejemplo</span></span>
            </p>
            <MapaProductores
              lotes={lotesUbicables}
              onSelect={(l) => {
                limpiarFiltros();
                setQ(l.finca);
                document
                  .getElementById("lotes-grid")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            />
            </>
          )}
        </div>}

        <div className="mt-6 inline-flex rounded-xl border border-border-soft bg-white p-1">
          <button
            onClick={() => setVista("cafes")}
            className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold ${vista === "cafes" ? "bg-coffee-900 text-white" : "text-coffee-900 hover:bg-cream-100"}`}
          >
            Cafés
          </button>
          <button
            onClick={() => setVista("servicios")}
            className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold ${vista === "servicios" ? "bg-coffee-900 text-white" : "text-coffee-900 hover:bg-cream-100"}`}
          >
            Servicios
          </button>
        </div>

        {/* ═══════════ FILTROS MÓVIL §59 ═══════════ */}
        <div className="mt-6 md:hidden">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                ⌕
              </span>
              <input aria-label="Buscar café por finca, variedad o proceso"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar café..."
                className="w-full rounded-lg border border-border-soft bg-white py-2 pl-9 pr-8 text-sm text-coffee-900"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-1 top-1/2 grid min-h-9 min-w-9 -translate-y-1/2 place-items-center rounded-full text-text-muted transition hover:bg-cream-100 hover:text-coffee-900"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={() => setFiltrosAbiertos(true)}
              aria-haspopup="dialog"
              aria-expanded={filtrosAbiertos}
              className="inline-flex items-center gap-2 rounded-lg border border-border-soft bg-white px-4 py-2 text-sm font-semibold text-coffee-900"
            >
              Filtros
              {filtrosActivos > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-700 px-1.5 text-xs font-bold text-white">
                  {filtrosActivos}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ═══════════ FILTROS DESKTOP §58 ═══════════ */}
        <div className="mt-6 hidden rounded-2xl border border-border-soft bg-white p-4 md:grid md:grid-cols-[repeat(3,minmax(150px,1fr))_2fr] md:gap-3">
          <div>
            <label className={etiqueta}>Provincia</label>
            <select aria-label="Provincia"
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              className={selectCls}
            >
              <option value="todas">Todas</option>
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Variedad</label>
            <select aria-label="Variedad"
              value={variedad}
              onChange={(e) => setVariedad(e.target.value)}
              className={selectCls}
            >
              <option value="todas">Todas</option>
              {variedades.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Proceso</label>
            <select aria-label="Proceso"
              value={proceso}
              onChange={(e) => setProceso(e.target.value)}
              className={selectCls}
            >
              <option value="todos">Todos</option>
              {procesos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Buscar</label>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                ⌕
              </span>
              <input aria-label="Buscar café por finca, variedad o proceso"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Finca, productor, provincia, variedad, precio…"
                className="w-full rounded-lg border border-border-soft bg-white py-2 pl-9 pr-8 text-sm text-coffee-900"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-1 top-1/2 grid min-h-9 min-w-9 -translate-y-1/2 place-items-center rounded-full text-text-muted transition hover:bg-cream-100 hover:text-coffee-900"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ RESULTADOS §56 ═══════════ */}
        {!loading && !error && (
          <p className="mt-4 text-sm text-text-muted">
            {vista === "cafes" ? (filtrados.length === 0
              ? "Sin resultados"
              : `${filtrados.length} ${filtrados.length === 1 ? "café" : "cafés"}${
                  q.trim() ? " encontrados" : " disponibles"
                }`) : (serviciosFiltrados.length === 0
              ? "Sin servicios publicados"
              : `${serviciosFiltrados.length} ${serviciosFiltrados.length === 1 ? "servicio" : "servicios"}${
                  q.trim() ? " encontrados" : " disponibles"
                }`)}
            {q.trim() && (
              <>
                {" "}
                para <strong className="text-green-700">“{q.trim()}”</strong>
              </>
            )}
          </p>
        )}
        {aviso && (
          <p className="mt-4 rounded-xl border border-green-700/20 bg-green-100/40 p-3 text-sm font-semibold text-green-700">
            {aviso}
          </p>
        )}

        {/* ═══════════ SKELETON §62 ═══════════ */}
        {loading ? (
          <div id="lotes-grid" className="mt-6">
            <SkeletonGrid
              cards={6}
              etiqueta="Cargando cafés del Marketplace…"
              className="gap-5 sm:grid-cols-2 lg:grid-cols-3"
            />
          </div>
        ) : error && vista === "cafes" ? (
          /* ═══════════ ERROR §63 ═══════════ */
          <div className="mt-10">
            <EstadoError
              titulo="No pudimos cargar los cafés"
              descripcion="Vuelve a intentarlo o modifica los filtros."
              onReintentar={cargar}
            />
          </div>
        ) : vista === "servicios" ? (
          serviciosFiltrados.length === 0 ? (
          <div className="mt-10">
            <EstadoVacio
              icono="marketplace"
              titulo="Aún no hay servicios publicados"
              descripcion="Los miembros pueden publicar transporte, catación, asesoría, pilado, insumos y otros servicios desde su panel."
              cta="Publicar servicio"
              href="/panel?ver=publicar_servicio"
            />
          </div>
          ) : (
          <div id="servicios-grid" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {serviciosFiltrados.map((s) => (
              <article key={s.id} className="card overflow-hidden">
                {s.imagenes?.[0] ? (
                  <img src={s.imagenes[0]} alt={`Imagen de ${s.titulo}`} className="aspect-[16/6] w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid aspect-[16/6] place-items-center bg-cream-100 text-coffee-700">
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">{s.redcafe ? "RedCafé" : etiquetaCategoriaServicio(s.categoria)}</span>
                  </div>
                )}
                <div className="p-2.5">
                  <p className="rotulo flex flex-wrap items-center gap-2">
                    <span>{etiquetaCategoriaServicio(s.categoria)}</span>
                    {s.redcafe && <span className="text-green-700">RedCafé</span>}
                    {s.provincia && <span>{s.provincia}</span>}
                    {s.verificado && <span className="text-green-700">Verificado</span>}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-pizarra">{s.titulo}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{s.descripcion}</p>
                  <p className="mt-2 line-clamp-1 text-xs text-text-muted">
                    Por <span className="font-semibold text-coffee-900">{s.proveedor}</span>{s.cobertura ? ` · ${s.cobertura}` : ""}
                  </p>
                  <div className="regla mt-2" />
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <div>
                      <p className="rotulo">Desde</p>
                      <p className="dato text-base font-semibold text-pizarra">${s.precio.toFixed(2)}</p>
                    </div>
                    <p className="text-right text-xs text-text-muted">por {unidadServicio(s.unidad)}</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => solicitarServicio(s)}
                      disabled={solicitando === s.id}
                      className="btn-primary min-h-10 flex-1 px-3 py-2.5 text-center text-xs disabled:opacity-60"
                    >
                      {solicitando === s.id ? "Enviando..." : "Solicitar"}
                    </button>
                    <a
                      href={waLink(`Hola, quiero consultar por el servicio ${s.titulo} publicado por ${s.proveedor} en Red Café Ecuador.`)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost inline-flex min-h-10 px-3 py-2.5 text-center text-xs"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
          )
        ) : filtrados.length === 0 ? (
          /* ═══════════ VACÍO §64 ═══════════ */
          <div className="mt-10">
            <EstadoVacio
              icono="marketplace"
              titulo="No encontramos cafés con esos filtros"
              descripcion="Prueba con otra provincia, variedad o proceso."
              cta="Limpiar filtros"
              onCta={limpiarFiltros}
            />
          </div>
        ) : (
          /* ═══════════ GRID / TARJETA CAFÉ §60 §61 ═══════════ */
          <div id="lotes-grid" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((l) => (
              <article key={l.id} className="card group overflow-hidden">
                <Link
                  href={`/marketplace/${l.id}`}
                  aria-label={`Ver café ${l.variedad} ${l.proceso} de ${l.finca}`}
                  className="relative block bg-crema"
                >
<div className="[&>img]:aspect-[16/6]">
                    <FotoProceso proceso={l.proceso} finca={l.finca} imagen={l.imagenes?.[0]} />
                 </div>
                  {/* Franja de cata: el color sale de las notas del propio lote.
                      Sin notas reconocibles no hay franja. */}
                  {colorDeCata(l.descripcion) && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-1.5"
                      style={{ background: colorDeCata(l.descripcion) as string }}
                    />
                  )}
                  {l.ejemplo && (
                    <span className="rotulo absolute left-2 top-2 bg-coffee-900/90 px-2 py-0.5 text-cream-100">
                      Demostración
                    </span>
                  )}
                </Link>
                <div className="p-2.5">
                  <p className="rotulo flex flex-wrap items-center gap-2">
                    <span>{l.provincia}</span>
                    {familiaDeCata(l.descripcion) && (
                      <span className="inline-flex items-center gap-1.5 text-pizarra normal-case tracking-normal">
                        <span
                          aria-hidden="true"
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: colorDeCata(l.descripcion) as string }}
                        />
                        {ETIQUETA_CATA[familiaDeCata(l.descripcion)!]}
                      </span>
                    )}
                  </p>
                  <h3 className="mt-1 line-clamp-1 text-sm font-semibold leading-snug text-pizarra">
                    {l.variedad} · {l.proceso}
                  </h3>
                  <p className="line-clamp-1 text-xs text-text-secondary">{l.finca}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="rotulo border border-arena px-2 py-0.5 text-tostado">
                      {l.variedad}
                    </span>
                    <span className="rotulo border border-arena px-2 py-0.5 text-tostado">
                      {l.proceso}
                    </span>
                    <span className="rotulo border border-arena px-2 py-0.5 text-tostado">
                      {l.altura} msnm
                    </span>
                  </div>
                  <div className="regla mt-2" />
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <div>
                      <p className="rotulo">Saco 69 kg</p>
                      <p className="dato text-base font-semibold text-pizarra">
                        ${l.precioSaco}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="rotulo">Puntaje</p>
                      <p className="dato text-base font-semibold text-pizarra">{l.score}</p>
                    </div>
                  </div>
                  <p className="rotulo mt-1 normal-case tracking-normal text-text-secondary">
                    {l.stockSacos} sacos disponibles · desde {l.ventaMinima}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Link href={`/marketplace/${l.id}`} className="btn-primary flex-1 text-center text-sm">
                      Ver
                    </Link>
                    <a
                      href={waLink(
                        `Hola, quiero consultar por el café ${l.variedad} ${l.proceso} de ${l.finca} (Red Café Ecuador).`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost inline-flex flex-1 items-center justify-center text-sm"
                    >
                      Contactar
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════ FILTROS MÓVIL — BOTTOM SHEET §59 ═══════════ */}
      {filtrosAbiertos && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          <div
            className="absolute inset-0 bg-coffee-950/40"
            onClick={cerrarFiltros}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            className="relative w-full max-w-lg rounded-t-2xl border border-border-soft border-b-0 bg-white p-5 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-titulo text-xl font-bold text-coffee-900">
                Filtros
              </h3>
              {filtrosActivos > 0 && (
                <button
                  onClick={limpiarFiltros}
                  className="min-h-9 rounded-lg px-2 text-sm font-semibold text-green-700 underline-offset-4 hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="f-prov" className={etiqueta}>
                  Provincia
                </label>
                <select
                  id="f-prov"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className={`${selectCls} mt-1 w-full`}
                >
                  <option value="todas">Todas</option>
                  {provincias.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-var" className={etiqueta}>
                  Variedad
                </label>
                <select
                  id="f-var"
                  value={variedad}
                  onChange={(e) => setVariedad(e.target.value)}
                  className={`${selectCls} mt-1 w-full`}
                >
                  <option value="todas">Todas</option>
                  {variedades.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-proc" className={etiqueta}>
                  Proceso
                </label>
                <select
                  id="f-proc"
                  value={proceso}
                  onChange={(e) => setProceso(e.target.value)}
                  className={`${selectCls} mt-1 w-full`}
                >
                  <option value="todos">Todos</option>
                  {procesos.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={cerrarFiltros} className="btn-primary mt-6 w-full">
              Ver {filtrados.length} {filtrados.length === 1 ? "café" : "cafés"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
