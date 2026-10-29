"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStoredSession, type Lote as ApiLote, type ApiUser } from "@/lib/api";
import { CONFIG, waLink } from "@/lib/config";
import dynamic from "next/dynamic";
import { EstadoError } from "@/components/EstadoError";
import { EstadoVacio } from "@/components/EstadoVacio";
import { type LoteApi, normalizar, ordenRecientes, ordenRecomendados, esLoteDemo, disponibilidadLote } from "@/lib/lotesVista";
import { TarjetaLote, TarjetaServicio, EsqueletoTarjetas, esGratis, type ServicioApi } from "@/components/marketplace/Tarjetas";
import { PestanaEmpleos, PestanaRequerimientos } from "@/components/marketplace/Bolsa";

const MapaProductores = dynamic(() => import("@/components/MapaProductores"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-none bg-cream-200" />
  ),
});


type Vista = "cafes" | "servicios" | "empleos" | "requerimientos";
type Orden = "reciente" | "recomendados" | "precio-asc" | "precio-desc" | "puntaje";
const VISTA_DE_VER: Record<string, Vista> = { servicios: "servicios", requerimientos: "requerimientos", empleos: "empleos", lotes: "cafes", cafes: "cafes" };
const CLASE_GRID = "mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3";

const textoBusqueda = (l: LoteApi) =>
  normalizar([l.finca, l.productor, l.variedad, l.proceso, l.provincia, l.canton, l.descripcion, l.notasTaza, l.certificacion, l.marca, l.tueste].filter(Boolean).join(" "));
const precioDe = (l: LoteApi) => Number(String(l.categoria) === "terminado" ? l.precioUnidad || 0 : l.precioSaco || l.precioQuintal || 0);

export default function MarketplacePage() {
  const [vista, setVista] = useState<Vista>("cafes");
  const [provincia, setProvincia] = useState("todas");
  const [variedad, setVariedad] = useState("todas");
  const [proceso, setProceso] = useState("todos");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"todos" | "verde" | "terminado">("todos");
  const [orden, setOrden] = useState<Orden>("reciente");
  // Detectar sesión al hidratar para que el botón "Publicar" vaya al panel si el
  // usuario ya está autenticado, o a /afiliate si todavía no.
  const [sesion, setSesion] = useState<ApiUser | null>(null);
  useEffect(() => { setSesion(getStoredSession()); }, []);
  const destinoPublicarLote = sesion ? "/panel?ver=publicar" : "/afiliate?rol=productor";
  const destinoPublicarServicio = sesion ? "/panel?ver=publicar_servicio" : "/afiliate?rol=proveedor";
  // null mientras llega la API: se enseña un esqueleto, nunca un listado que
  // luego se sustituye por otro.
  const [lotes, setLotes] = useState<LoteApi[] | null>(null);
  // La API dice si hay sesión; mientras no responde se asume que sí, para no
  // enseñar un botón de registro que desaparece un segundo después.
  const [conSesion, setConSesion] = useState(true);
  const [servicios, setServicios] = useState<ServicioApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  // /marketplace/?ver=servicios|requerimientos|empleos abre esa pestaña (las
  // novedades de la comunidad enlazan así a lo que anuncian).
  useEffect(() => {
    const ver = new URLSearchParams(window.location.search).get("ver") || "";
    if (VISTA_DE_VER[ver]) setVista(VISTA_DE_VER[ver]);
  }, []);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(CONFIG.api("/api/lotes.php?action=list&_=" + Date.now()), { credentials: "include", cache: "no-store" });
      const json = await r.json();
      if (!json || !json.ok) throw new Error(json?.error || "No pudimos cargar los cafés");
      setLotes(Array.isArray(json.data?.lotes) ? json.data.lotes : []);
      if (typeof json.data?.sesion === "boolean") setConSesion(json.data.sesion);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar los cafés");
    }
  }, []);

  useEffect(() => {
    cargar();
    fetch(CONFIG.api("/api/marketplace-servicios.php?action=list&_=" + Date.now()), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((json) => setServicios(json && json.ok ? (Array.isArray(json.data) ? json.data : json.data?.servicios ?? []) : []))
      .catch(() => setServicios([]));
  }, [cargar]);

  const todos = useMemo(() => lotes ?? [], [lotes]);
  const listaServicios = useMemo(() => servicios ?? [], [servicios]);
  const unicos = (v: unknown[]) => Array.from(new Set(v.map((x) => String(x || "")).filter(Boolean)));
  const provincias = useMemo(() => unicos([...todos.map((l) => l.provincia), ...listaServicios.map((x) => x.provincia)]), [todos, listaServicios]);
  const variedades = useMemo(() => unicos(todos.map((l) => l.variedad)), [todos]);
  const procesos = useMemo(() => unicos(todos.map((l) => l.proceso)), [todos]);

  const filtrosActivos = [provincia, variedad, proceso].filter(
    (v) => v !== "todas" && v !== "todos"
  ).length;

  const igual = (valor: unknown, filtro: string) => filtro === "todas" || filtro === "todos" || normalizar(valor) === normalizar(filtro);
  const buscado = normalizar(q);

  const filtrados = useMemo(() => {
    const lista = todos.filter((l) => {
      const cat = String(l.categoria || "verde");
      if (tipo !== "todos" && cat !== tipo) return false;
      if (!igual(l.provincia, provincia) || !igual(l.variedad, variedad) || !igual(l.proceso, proceso)) return false;
      if (buscado && textoBusqueda(l).indexOf(buscado) === -1) return false;
      return true;
    });
    if (orden === "recomendados") return ordenRecomendados(lista);
    if (orden === "precio-asc") return lista.sort((a, b) => precioDe(a) - precioDe(b));
    if (orden === "precio-desc") return lista.sort((a, b) => precioDe(b) - precioDe(a));
    if (orden === "puntaje") return lista.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    return ordenRecientes(lista);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, tipo, provincia, variedad, proceso, buscado, orden]);

  // Lo que el visitante tiene delante, desglosado: disponibles, agotados y ejemplos.
  const resumenCafes = useMemo(() => {
    if (!filtrados.length) return "";
    let disponibles = 0, agotados = 0, muestra = 0;
    filtrados.forEach((l) => {
      if (esLoteDemo(l)) muestra++;
      else if (disponibilidadLote(l) === "agotado") agotados++;
      else disponibles++;
    });
    const partes = [disponibles === 1 ? "1 café disponible" : disponibles + " cafés disponibles"];
    if (agotados) partes.push(agotados === 1 ? "1 agotado" : agotados + " agotados");
    if (muestra) partes.push(muestra === 1 ? "1 ejemplo de la Red" : muestra + " ejemplos de la Red");
    const cabeza = filtrados.length === todos.length
      ? `Mostrando ${filtrados.length} publicaciones: `
      : `Mostrando ${filtrados.length} de ${todos.length} publicaciones: `;
    return cabeza + partes.join(", ") + ".";
  }, [filtrados, todos]);

  const lotesUbicables = useMemo(
    () => filtrados.filter((l) => Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lng)) && l.lat !== "" && l.lng !== "" && l.lat != null && l.lng != null),
    [filtrados],
  );

  const serviciosFiltrados = listaServicios.filter((x) => {
    if (provincia !== "todas" && x.provincia && normalizar(x.provincia) !== normalizar(provincia)) return false;
    if (buscado) {
      const texto = normalizar(`${x.titulo} ${x.proveedor ?? ""} ${x.provincia ?? ""} ${x.categoria ?? ""} ${x.descripcion ?? ""}`);
      if (texto.indexOf(buscado) === -1) return false;
    }
    return true;
  });
  // Servicios oficiales de la Red: cuántos son gratuitos y cuántos premium.
  const oficiales = listaServicios.filter((x) => x.oficial_redcafe || /red caf[eé] ecuador/i.test(String(x.proveedor || "")));
  const oficialesGratis = oficiales.filter(esGratis).length;

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
  const conFiltros = vista === "cafes" || vista === "servicios";
  const selectCls =
    "rounded-lg border border-border-soft bg-white px-3 py-2 text-sm text-coffee-900";
  const etiqueta = "text-xs font-semibold uppercase tracking-wide text-text-muted";

  return (
    <div>
      {/* ═══════════ HERO §54 ═══════════ */}
      <section className="border-b border-border-soft bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="max-w-2xl font-titulo text-4xl font-bold leading-[1.1] text-coffee-900 md:text-5xl">
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
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-14 pt-8">
        {/* ═══════════ MAPA §57 ═══════════ */}
        {vista === "cafes" && <div id="mapa" className="overflow-hidden rounded-2xl border border-border-soft bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft bg-surface-soft px-5 py-4">
            <div>
              <h2 className="font-titulo text-xl font-bold text-coffee-900">
                Mapa de lotes de café publicados
              </h2>
            </div>
            <span className="hidden text-xs text-text-muted sm:block">
              {lotesUbicables.length} de {filtrados.length} cafés tienen ubicación
            </span>
          </div>
          {/* El mapa no depende de la API: los lotes de demostración traen sus propias
              coordenadas, así que sigue mostrándose aunque el servidor no responda. */}
          {lotes === null ? (
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
            </p>
            <MapaProductores
              lotes={lotesUbicables as unknown as ApiLote[]}
              onSelect={(l) => {
                limpiarFiltros();
                setQ(String(l.finca || ""));
                document
                  .getElementById("redcafe-lotes-propio")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            />
            </>
          )}
        </div>}

        <div className="mt-6 inline-flex flex-wrap rounded-xl border border-border-soft bg-white p-1" data-redcafe-pestanas="1">
          {(["cafes", "servicios"] as const).map((v) => (
            <button
              key={v}
              type="button"
              data-redcafe-tab={v === "cafes" ? "lotes" : v}
              onClick={() => setVista(v)}
              className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold ${vista === v ? "bg-coffee-900 text-white" : "text-coffee-900 hover:bg-cream-100"}`}
            >
              {v === "cafes" ? "Cafés" : "Servicios"}
            </button>
          ))}
          {(["empleos", "requerimientos"] as const).map((v) => (
            <span key={v} className="redcafe-empleos-tab">
              <button type="button" data-redcafe-tab={v} className={vista === v ? "is-activo" : ""} onClick={() => setVista(v)}>
                {v === "empleos" ? "Empleos" : "Requerimientos"}
              </button>
            </span>
          ))}
        </div>

        {/* ═══════════ FILTROS MÓVIL §59 ═══════════ */}
        {conFiltros && <div className="mt-6 md:hidden">
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
        </div>}

        {/* ═══════════ FILTROS DESKTOP §58 ═══════════ */}
        {conFiltros && <div className="mt-6 hidden rounded-2xl border border-border-soft bg-white p-4 md:grid md:grid-cols-[repeat(3,minmax(150px,1fr))_2fr] md:gap-3">
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
        </div>}

        {/* ═══════════ RESULTADOS ═══════════ */}
        {vista === "cafes" && (
          error ? (
            <div className="mt-10">
              <EstadoError titulo="No pudimos cargar los cafés" descripcion="Vuelve a intentarlo o modifica los filtros." onReintentar={cargar} />
            </div>
          ) : (
            <>
              <div id="redcafe-market-barra" className="redcafe-market-barra mt-6">
                <div className="redcafe-market-grupo" role="group" aria-label="Tipo de café">
                  {(
                    [
                      ["todos", "Todos"],
                      ["verde", "Café verde"],
                      ["terminado", "Café tostado"],
                    ] as const
                  ).map(([t, rotulo]) => (
                    <button key={t} type="button" data-tipo={t} className={tipo === t ? "is-activo" : ""} onClick={() => setTipo(t)}>
                      {rotulo}
                    </button>
                  ))}
                </div>
                <label className="redcafe-market-orden">
                  <span>Ordenar por</span>
                  <select data-orden value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
                    <option value="reciente">Más reciente</option>
                    <option value="recomendados">Recomendados</option>
                    <option value="precio-asc">Precio: de menor a mayor</option>
                    <option value="precio-desc">Precio: de mayor a menor</option>
                    <option value="puntaje">Puntaje de taza</option>
                  </select>
                </label>
                <p className="redcafe-market-resumen" role="status" aria-live="polite">
                  {resumenCafes}
                </p>
              </div>
              <div id="redcafe-lotes-propio" className={CLASE_GRID}>
                {lotes === null ? (
                  <EsqueletoTarjetas cuantas={8} />
                ) : filtrados.length === 0 ? (
                  <p className="redcafe-market-vacio">
                    {todos.length === 0
                      ? "Todavía no hay lotes publicados."
                      : "Ningún café coincide con esos filtros. Prueba con otra provincia o variedad, o limpia la búsqueda."}
                  </p>
                ) : (
                  filtrados.map((l) => <TarjetaLote key={String(l.id)} lote={l} sesion={conSesion} />)
                )}
              </div>
            </>
          )
        )}

        {vista === "servicios" && (
          <>
            {servicios !== null && (
              <p className="mt-4 text-sm text-text-muted">
                {serviciosFiltrados.length === 0
                  ? "Sin servicios publicados"
                  : `${serviciosFiltrados.length} ${serviciosFiltrados.length === 1 ? "servicio" : "servicios"}${q.trim() ? " encontrados" : " disponibles"}`}
              </p>
            )}
            {oficiales.length > 0 && (
              <div id="redcafe-service-plan-summary" className="redcafe-service-plan-summary">
                <span>Servicios RedCafé</span>
                <strong>{oficialesGratis} gratuitos</strong>
                <strong>{oficiales.length - oficialesGratis} premium</strong>
              </div>
            )}
            <div id="redcafe-servicios-propio" className={CLASE_GRID}>
              {servicios === null ? (
                <EsqueletoTarjetas cuantas={6} />
              ) : serviciosFiltrados.length === 0 ? (
                <p className="redcafe-market-vacio">Todavía no hay servicios publicados.</p>
              ) : (
                serviciosFiltrados.map((x) => <TarjetaServicio key={String(x.id)} servicio={x} />)
              )}
            </div>
          </>
        )}

        {vista === "empleos" && (
          <div className="mt-6">
            <PestanaEmpleos claseGrid={CLASE_GRID} />
          </div>
        )}
        {vista === "requerimientos" && (
          <div className="mt-6">
            <PestanaRequerimientos claseGrid={CLASE_GRID} />
          </div>
        )}
      </div>

      <aside id="redcafe-avisopago-fijo" className="redcafe-avisopago-fijo">
        <strong>Opera con cuidado.</strong>
        <span>
          {" "}
          Red Café Ecuador no cobra, no retiene dinero ni garantiza las operaciones entre miembros. No transfieras dinero si no estás seguro de la
          identidad de la otra parte: verifica al vendedor, pide una muestra y acuerda por escrito la forma de pago.
        </span>{" "}
        <a href="/terminos-y-condiciones/">Términos y condiciones</a>
      </aside>

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
