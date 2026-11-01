"use client";

// Tarjetas del marketplace: lote y servicio. Antes las pintaba la capa propia
// (redcafe-v60-mejoras-obligatorias.js · loteCardHtml / serviceCardHtml) sobre
// el listado de React, que quedaba oculto. Mismas clases y textos.
//
// «Solicitar este lote» y los enlaces .redcafe-contactar los atiende la capa
// por delegación (registra el contacto y crea el pedido con el aviso previo).
import {
  type LoteApi,
  s,
  n,
  msgWhatsapp,
  loteImagen,
  ETIQUETA_DISPONIBILIDAD,
  disponibilidadLote,
  esLoteDemo,
  esTerminado,
  esSiembraLote,
  presentacionLote,
  alturaLegible,
  textoVerificado,
  equivalenciaQuintal,
} from "@/lib/lotesVista";

function Sellos({ item, lote }: { item: LoteApi; lote?: boolean }) {
  const t = textoVerificado(item);
  const disp = lote ? disponibilidadLote(item) : "";
  return (
    <>
      {t && (
        <span className="redcafe-sello-verificado" title={t}>
          ✓ Verificado
        </span>
      )}
      {lote && ETIQUETA_DISPONIBILIDAD[disp] && <span className={`redcafe-sello-${disp}`}>{ETIQUETA_DISPONIBILIDAD[disp]}</span>}
      {lote && esLoteDemo(item) && <span className="redcafe-etiqueta-demo">Lote demo</span>}
    </>
  );
}

export function TarjetaLote({ lote, sesion }: { lote: LoteApi; sesion: boolean }) {
  const terminado = esTerminado(lote);
  const siembra = esSiembraLote(lote);
  const titulo = terminado
    ? [lote.variedad || "Café", lote.tueste ? "tueste " + lote.tueste : ""].filter(Boolean).join(" · ")
    : [lote.variedad || "Café", lote.proceso || ""].filter(Boolean).join(" · ");
  const finca = lote.finca || lote.productor || "Lote publicado";
  const provincia = lote.provincia || "Ecuador";
  const precioSaco = n(lote.precioSaco);
  const precioQuintal = n(lote.precioQuintal);
  const precio = terminado || siembra ? n(lote.precioUnidad) : precioSaco > 0 ? precioSaco : precioQuintal;
  const unidad = terminado ? presentacionLote(lote) || "unidad" : siembra ? (s(lote.estado) === "semilla" ? "semilla" : "planta") : precioSaco > 0 ? "saco" : "quintal";
  const equivalencia = equivalenciaQuintal(lote);
  const stock = terminado || siembra ? n(lote.unidades) : n(lote.stockSacos || lote.stockQuintales);
  const contacto = lote.contacto || {};
  const wa = s(contacto.whatsapp_link || contacto.whatsapp).replace(/\D+/g, "");
  const id = s(lote.id);
  const disp = disponibilidadLote(lote);
  const demo = esLoteDemo(lote);
  const href = `/marketplace/${id}/`;

  let contactar;
  if (wa) {
    if (sesion || demo) {
      const cantidad = [stock ? stock + " disponibles" : "", lote.ventaMinima ? "pedido desde " + lote.ventaMinima : ""].filter(Boolean).join(", ");
      const mensaje = msgWhatsapp("Hola, quiero consultar por el café " + titulo + " de " + finca + (cantidad ? " (" + cantidad + ")" : "") + ".", "lote", id);
      contactar = (
        <a className="btn-primary !px-4 !py-2 text-sm redcafe-contactar" data-lote={id} target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${mensaje}`}>
          {disp === "agotado" ? "Preguntar por el próximo lote" : "Contactar"}
        </a>
      );
    } else {
      contactar = (
        <a className="btn-primary" href="/afiliate/">
          Entra para contactar al vendedor
        </a>
      );
    }
  } else if (sesion || demo) {
    contactar = (
      <button
        type="button"
        className="btn-primary !px-4 !py-2 text-sm redcafe-solicitar-lote"
        data-lote={id}
        data-finca={s(lote.finca)}
        data-productor={s(lote.productor)}
        data-precio={String(lote.precioSaco || 0)}
      >
        Solicitar este lote
      </button>
    );
  } else {
    contactar = (
      <a className="btn-primary" href="/afiliate/">
        Entra para contactar al vendedor
      </a>
    );
  }

  return (
    <article className="border border-border-soft bg-white p-5 shadow-sm redcafe-lote-tarjeta" data-disponibilidad={disp} data-redcafe-api-lote={id}>
      <a className="block" href={href} aria-label={`Ver café ${titulo} de ${finca}`}>
        <img className="redcafe-lote-foto" src={loteImagen(lote)} alt={`Café ${titulo} de ${finca}`} loading="lazy" decoding="async" />
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-green-700">
          {provincia}
          {lote.ubicacion_aproximada === true && <span className="redcafe-etiqueta-aprox">Ubicación aproximada</span>}
          {terminado && <span className="redcafe-etiqueta-terminado">Café tostado</span>}
          <Sellos item={lote} lote />
        </p>
        <h3 className="mt-2 font-titulo text-2xl font-bold text-coffee-900">{titulo}</h3>
        <p className="mt-1 text-sm font-semibold text-text-secondary">{finca}</p>
        <p className="mt-3 text-sm text-text-secondary">
          {terminado
            ? [presentacionLote(lote), s(lote.molienda), stock ? stock + " unidades" : ""].filter(Boolean).join(" · ")
            : [alturaLegible(lote), stock + " disponibles", lote.ventaMinima ? "desde " + lote.ventaMinima : "pedido a convenir"].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-3 text-lg font-bold text-coffee-900">
          {Number.isFinite(precio) && precio > 0 ? (
            <>
              $ {precio} <span className="text-xs font-semibold uppercase text-text-muted">/ {unidad}</span>
            </>
          ) : (
            "Precio a convenir"
          )}
          {equivalencia && <span className={"redcafe-precio-equivalente" + (equivalencia.falta ? " es-falta" : "")}>{equivalencia.texto}</span>}
        </p>
      </a>
      <div className="mt-4 flex flex-wrap gap-2">
        <a className="btn-ghost !px-4 !py-2 text-sm" href={href}>
          Ver café
        </a>
        {contactar}
      </div>
    </article>
  );
}

export type ServicioApi = LoteApi & {
  titulo?: string;
  gratis?: boolean;
  plan?: string;
  tipo_plan?: string;
  precio?: number | string;
  precio_etiqueta?: string;
  unidad?: string;
  whatsapp?: string;
  whatsapp_link?: string;
  proveedor?: string;
};

export const esGratis = (sv: ServicioApi) => sv.gratis === true || sv.plan === "gratis" || sv.tipo_plan === "gratis";

export function TarjetaServicio({ servicio }: { servicio: ServicioApi }) {
  const titulo = servicio.titulo || servicio.nombre || "Servicio RedCafé";
  const gratis = esGratis(servicio);
  const precio = servicio.precio_etiqueta || (gratis ? "Gratis" : n(servicio.precio) > 0 ? "$ " + n(servicio.precio) : "A convenir");
  const sinImporte = precio === "Gratis" || precio === "A convenir";
  const wa = s(servicio.whatsapp_link || servicio.whatsapp).replace(/\D+/g, "");
  const mensaje = msgWhatsapp("Hola, quiero solicitar el servicio " + titulo + ".", "servicio", s(servicio.id));
  const foto = (Array.isArray(servicio.imagenes) ? servicio.imagenes : []).map(s).find((u) => u.indexOf("/uploads/user-content/") === 0);
  const t = textoVerificado(servicio);
  return (
    <article className="border border-border-soft bg-white p-5 shadow-sm">
      {foto && (
        <img
          src={foto}
          alt={`Foto del servicio ${titulo}`}
          loading="lazy"
          decoding="async"
          className="redcafe-servicio-foto"
          onError={(e) => e.currentTarget.remove()}
        />
      )}
      <p className="text-xs font-bold uppercase tracking-widest text-green-700">
        {s(servicio.categoria) || "RedCafé"}
        {t && (
          <span className="redcafe-sello-verificado" title={t}>
            ✓ Verificado
          </span>
        )}
      </p>
      <h3 className="mt-2 font-titulo text-xl font-bold text-coffee-900">{titulo}</h3>
      <span className={"redcafe-service-plan-badge " + (gratis ? "is-free" : "is-premium")}>{gratis ? "Gratis RedCafé" : "Premium RedCafé"}</span>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">{servicio.descripcion || ""}</p>
      <p className="mt-3 text-lg font-bold text-coffee-900">
        {precio}
        {!sinImporte && <span className="text-xs font-semibold uppercase text-text-muted"> / {servicio.unidad || "servicio"}</span>}
      </p>
      {/* El botón lleva al WhatsApp de quien ofrece el servicio. Sin sesión la API
          no entrega su teléfono: se pide entrar en vez de mandar al de la Red. */}
      {wa ? (
        <a className="btn-primary mt-4 !px-4 !py-2 text-sm" href={`https://wa.me/${wa}?text=${mensaje}`} target="_blank" rel="noreferrer">
          Solicitar servicio
        </a>
      ) : servicio.oficial_redcafe ? (
        <a className="btn-primary mt-4 !px-4 !py-2 text-sm" href={`https://wa.me/593968641376?text=${mensaje}`} target="_blank" rel="noreferrer">
          Solicitar servicio
        </a>
      ) : (
        <a className="btn-primary mt-4 !px-4 !py-2 text-sm" href="/login/">
          Entra para contactar a quien lo ofrece
        </a>
      )}
    </article>
  );
}

/** Esqueleto de tarjetas mientras llega el listado. */
export function EsqueletoTarjetas({ cuantas }: { cuantas: number }) {
  return (
    <div className="redcafe-skeleton redcafe-skeleton-grid" role="status" aria-label="Cargando contenido">
      {Array.from({ length: cuantas }).map((_, i) => (
        <article key={i} className="redcafe-skeleton-card" aria-hidden="true">
          <span className="redcafe-skeleton-bloque redcafe-skeleton-media"></span>
          <span className="redcafe-skeleton-bloque redcafe-skeleton-linea corta"></span>
          <span className="redcafe-skeleton-bloque redcafe-skeleton-linea"></span>
          <span className="redcafe-skeleton-bloque redcafe-skeleton-linea media"></span>
          <span className="redcafe-skeleton-bloque redcafe-skeleton-linea corta"></span>
        </article>
      ))}
    </div>
  );
}
