"use client";

/*
 Ficha de un lote del marketplace (/marketplace/<id>/).
 Antes la componía la capa propia (redcafe-v60-mejoras-obligatorias.js ·
 renderDetalleLote) 1,2 s después de cargar: escondía la página de React y
 ponía la suya encima. Ahora es la única versión, con las mismas clases
 (redcafe-lote-*), así que los estilos de redcafe-v60-final.css siguen valiendo.

 Los botones «Solicitar este lote» y los enlaces de contacto los atiende la
 capa por delegación (.redcafe-solicitar-lote, .redcafe-contactar), igual que
 en las tarjetas del marketplace, y «Reportar al vendedor» lo abre
 redcafe-reportes.js (data-reportar-uid).
*/
import { useEffect, useState, type ReactNode } from "react";
import { CONFIG } from "@/lib/config";

import {
  type LoteApi,
  s,
  n,
  msgWhatsapp,
  loteImagen,
  ETIQUETA_DISPONIBILIDAD,
  disponibilidadLote,
  esLoteDemo,
  presentacionLote,
  alturaLegible,
  textoVerificado,
} from "@/lib/lotesVista";

function SelloVerificado({ lote }: { lote: LoteApi }) {
  const t = textoVerificado(lote);
  return t ? (
    <span className="redcafe-sello-verificado" title={t}>
      ✓ Verificado
    </span>
  ) : null;
}

const PEDIBLES: Array<[string, string]> = [
  ["estado", "estado del café (pergamino, oro…)"],
  ["humedad", "porcentaje de humedad"],
  ["score", "puntaje de catación"],
  ["defectos", "defectos por muestra de 300 g"],
  ["zaranda", "zaranda o granulometría"],
  ["rendimiento", "rendimiento en trilla"],
  ["cosecha", "mes de cosecha"],
  ["empaque", "tipo de empaque"],
  ["entrega", "condiciones de entrega"],
  ["certificacion", "certificaciones"],
  ["notasTaza", "notas de taza"],
];

function Dato({ etiqueta, valor }: { etiqueta: string; valor: unknown }) {
  if (valor === undefined || valor === null || valor === "") return null;
  return (
    <div className="redcafe-lote-dato">
      <span>{etiqueta}</span>
      <strong>{s(valor)}</strong>
    </div>
  );
}

function Envoltura({ rotulo, titulo, sub, children }: { rotulo: string; titulo: string; sub: string; children?: ReactNode }) {
  return (
    <div className="redcafe-lote-wrap">
      <p className="redcafe-lote-rotulo">{rotulo}</p>
      <h1 className="redcafe-lote-titulo">{titulo}</h1>
      <p className="redcafe-lote-sub">{sub}</p>
      {children}
    </div>
  );
}

const VOLVER = (
  <a className="btn-ghost" href="/marketplace/">
    Ver todo el marketplace
  </a>
);

type Estado = { tipo: "cargando" } | { tipo: "error" } | { tipo: "no-esta" } | { tipo: "listo"; lote: LoteApi; sesion: boolean };

export function FichaLote() {
  const [id, setId] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });

  useEffect(() => {
    // El id sale de la dirección y no de la ruta de Next: los lotes de los
    // miembros no tienen página propia y el servidor les sirve esta misma.
    const m = location.pathname.match(/^\/marketplace\/([^/]+)\/?$/);
    const elegido = m ? decodeURIComponent(m[1]) : "";
    setId(elegido);
    let vivo = true;
    fetch(CONFIG.api("/api/lotes.php?action=list&_=" + Date.now()), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!vivo) return;
        const lotes: LoteApi[] = (json && json.ok && json.data && Array.isArray(json.data.lotes) && json.data.lotes) || [];
        const sesion = !(json && json.data && json.data.sesion === false);
        const lote = lotes.find((l) => String(l.id) === elegido);
        setEstado(lote ? { tipo: "listo", lote, sesion } : { tipo: "no-esta" });
      })
      .catch(() => vivo && setEstado({ tipo: "error" }));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (estado.tipo !== "listo") return;
    const lote = estado.lote;
    const nombre = lote.finca || lote.nombre || lote.variedad || "Lote publicado";
    const titulo = [nombre, lote.provincia || "Ecuador"].filter(Boolean).join(" · ") + " · Red Café Ecuador";
    document.title = titulo;
    document.querySelector('meta[name="description"]')?.setAttribute("content", titulo);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", titulo);
    // El canonical heredado apunta al listado; cada ficha es su propia página.
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", location.origin + location.pathname);
  }, [estado]);

  let contenido: ReactNode;
  if (estado.tipo === "cargando") {
    contenido = <Envoltura rotulo="Marketplace" titulo="Cargando ficha del café..." sub="Estamos consultando la publicación actual." />;
  } else if (estado.tipo === "error") {
    contenido = (
      <Envoltura rotulo="Marketplace" titulo="No se pudo cargar la ficha" sub="Revisa la conexión o vuelve al marketplace para intentarlo de nuevo.">
        <div className="redcafe-lote-acciones">{VOLVER}</div>
      </Envoltura>
    );
  } else if (estado.tipo === "no-esta") {
    contenido = (
      <Envoltura
        rotulo="Marketplace"
        titulo="Lote no disponible"
        sub="La publicación no existe, fue retirada o todavía no está disponible en el marketplace."
      >
        <div className="redcafe-lote-acciones">{VOLVER}</div>
      </Envoltura>
    );
  } else {
    contenido = <Ficha lote={estado.lote} sesion={estado.sesion} />;
  }

  return (
    <section
      id="redcafe-lote-detalle"
      className="redcafe-lote-detalle"
      data-lote={id}
      data-loading={estado.tipo === "cargando" ? "1" : undefined}
      aria-busy={estado.tipo === "cargando"}
    >
      {contenido}
    </section>
  );
}

function Ficha({ lote, sesion }: { lote: LoteApi; sesion: boolean }) {
  const contacto = lote.contacto || {};
  const wa = s(contacto.whatsapp_link || contacto.whatsapp).replace(/\D+/g, "");
  const idLote = s(lote.id);
  const titulo = [lote.variedad || "Café", lote.proceso || ""].filter(Boolean).join(" · ");
  const demo = esLoteDemo(lote);

  // Galería: las fotos del productor o, si no hay, una del proceso avisando que no es del lote.
  const propias = (Array.isArray(lote.imagenes) ? lote.imagenes : []).map(s).filter((u) => u.indexOf("/uploads/user-content/") === 0);
  const galeria = propias.length ? (
    <div className="redcafe-lote-galeria">
      {propias.map((u, i) => (
        <img key={u} src={u} alt={`Foto ${i + 1} del lote ${lote.finca || ""}`} loading="lazy" decoding="async" />
      ))}
    </div>
  ) : (
    <figure className="redcafe-lote-galeria es-generica">
      <img src={loteImagen(lote)} alt={`Imagen de referencia del proceso ${lote.proceso || "del café"}`} loading="lazy" decoding="async" />
      <figcaption>Imagen de referencia del proceso, no del lote. Pide fotos reales antes de cerrar la compra.</figcaption>
    </figure>
  );

  // Quién vende: el lote y el perfil se verifican por separado.
  const desde = lote.created_at ? new Date(Date.parse(lote.created_at)) : null;
  const partes: string[] = [];
  if (lote.provincia) partes.push("Opera en " + lote.provincia);
  if (desde && !isNaN(desde.getTime())) partes.push("publica en la Red desde " + desde.toLocaleDateString("es-EC", { month: "long", year: "numeric" }));
  partes.push(contacto.verificado ? "perfil verificado por la administración" : "perfil sin verificar todavía");
  partes.push(
    lote.verificado
      ? "este lote está verificado" + (lote.verificado_por ? " por " + lote.verificado_por : "")
      : "este lote todavía no lo ha revisado la administración",
  );

  // Lo que el lote todavía no declara, con un clic para pedirlo.
  const faltan = PEDIBLES.filter(([k]) => {
    const v = lote[k];
    return v === undefined || v === null || v === "" || v === 0;
  }).map(([, t]) => t);
  const docs = (Array.isArray(lote.documentos) ? lote.documentos : []).filter((d) => s(d.url).indexOf("/uploads/user-content/") === 0);
  if (!(Array.isArray(lote.documentos) && lote.documentos.length)) faltan.push("certificado o informe de catación");
  if (lote.muestraDisponible !== true) faltan.push("si envía muestra");

  const cantidadMensaje = [
    lote.stockSacos ? lote.stockSacos + " sacos disponibles" : "",
    lote.stockQuintales ? lote.stockQuintales + " quintales disponibles" : "",
    lote.ventaMinima ? "pedido desde " + lote.ventaMinima : "",
  ]
    .filter(Boolean)
    .join(", ");

  const precioSaco = n(lote.precioSaco);
  const precioQuintal = n(lote.precioQuintal);
  const precioUnidad = n(lote.precioUnidad);
  const pesoSaco = n(lote.pesoSacoLb);

  // Ficha técnica resumida.
  const origen = [lote.finca, lote.canton, lote.provincia || "Ecuador"].filter(Boolean).join(" · ");
  const calidad = [
    lote.score ? "SCA " + lote.score : "",
    lote.humedad ? "humedad " + lote.humedad + "%" : "",
    lote.defectos ? lote.defectos + " defectos / 300 g" : "",
    lote.zaranda ? "zaranda " + lote.zaranda : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const disponible = [lote.stockSacos ? lote.stockSacos + " sacos" : "", lote.stockQuintales ? lote.stockQuintales + " quintales" : "", lote.cantidadKg ? lote.cantidadKg + " kg" : ""]
    .filter(Boolean)
    .join(" · ");
  const pedido = [lote.ventaMinima ? "Desde " + lote.ventaMinima : "Confirmar muestra o pedido mínimo", disponible ? "disponible: " + disponible : "", lote.empaque ? "empaque: " + lote.empaque : ""]
    .filter(Boolean)
    .join(" · ");
  const filasFicha = (
    [
      ["Origen", origen],
      ["Perfil", [titulo, s(lote.notas || lote.notasCata)].filter(Boolean).join(" · ")],
      ["Calidad", calidad],
      ["Pedido", pedido],
    ] as Array<[string, string]>
  ).filter((r) => r[1]);

  let accion: ReactNode;
  if (demo) {
    accion = (
      <div className="redcafe-lote-demo-aviso">
        <p>
          <strong>Este es un lote de ejemplo</strong> de Red Café Ecuador, para mostrar cómo se ve una ficha. No hay café a la venta detrás de él.
        </p>
        <a className="btn-primary" href="/marketplace/">
          Ver los cafés de verdad
        </a>
      </div>
    );
  } else if (!sesion) {
    accion = (
      <a className="btn-primary" href="/afiliate/">
        Entra para contactar al vendedor
      </a>
    );
  } else {
    const mensaje = msgWhatsapp(
      "Hola, quiero consultar por el café " + titulo + " de " + (lote.finca || "") + (cantidadMensaje ? " (" + cantidadMensaje + ")" : "") + ".",
      "lote",
      idLote,
    );
    const dueno = s(lote.productor_id || lote.published_by);
    accion = (
      <>
        <button
          type="button"
          className="btn-primary redcafe-solicitar-lote"
          data-lote={idLote}
          data-finca={s(lote.finca)}
          data-productor={s(lote.productor)}
          data-precio={String(lote.precioSaco || 0)}
        >
          Solicitar este lote
        </button>
        {wa ? (
          <a className="btn-ghost redcafe-contactar" data-lote={idLote} target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${mensaje}`}>
            Contactar por WhatsApp
          </a>
        ) : contacto.email ? (
          <a className="btn-ghost redcafe-contactar" data-lote={idLote} href={`mailto:${contacto.email}?subject=${mensaje}`}>
            Escribir al correo
          </a>
        ) : null}
        {dueno && (
          <button type="button" className="redcafe-reportar-btn" data-reportar-uid={dueno} data-reportar-nombre={s(lote.productor)}>
            Reportar al vendedor
          </button>
        )}
      </>
    );
  }

  const pedirFaltantes =
    "Hola, me interesa el café " + (lote.variedad || "") + " de " + (lote.finca || "su finca") + ". ¿Me puede indicar " + faltan.slice(0, 5).join(", ") + "?";
  const disp = disponibilidadLote(lote);

  return (
    <div className="redcafe-lote-wrap">
      <p className="redcafe-lote-rotulo">
        {[lote.canton, lote.provincia || "Ecuador"].filter(Boolean).join(" · ")}
        {lote.ubicacion_aproximada === true && <span className="redcafe-etiqueta-aprox">Ubicación aproximada</span>}
        <SelloVerificado lote={lote} />
        {ETIQUETA_DISPONIBILIDAD[disp] && <span className={`redcafe-sello-${disp}`}>{ETIQUETA_DISPONIBILIDAD[disp]}</span>}
        {demo && <span className="redcafe-etiqueta-demo">Lote demo</span>}
      </p>
      <h1 className="redcafe-lote-titulo">{lote.finca || "Lote publicado"}</h1>
      <p className="redcafe-lote-sub">
        {titulo}
        {lote.productor ? " · " + lote.productor : ""}
      </p>
      {lote.descripcion && <p className="redcafe-lote-desc">{lote.descripcion}</p>}
      {galeria}
      <div className="redcafe-lote-datos">
        <Dato etiqueta="Altura" valor={alturaLegible(lote) || "Sin indicar"} />
        <Dato etiqueta="Puntaje de catación" valor={lote.score ? lote.score + " / 100 (SCA)" : "Sin catar"} />
        <Dato etiqueta="Precio por saco" valor={precioSaco > 0 ? "$ " + lote.precioSaco : ""} />
        <Dato
          etiqueta="Precio por quintal"
          valor={
            precioQuintal > 0
              ? "$ " + lote.precioQuintal
              : precioSaco > 0 && pesoSaco > 0
                ? "≈ $ " + Math.round(((precioSaco * 100) / pesoSaco) * 100) / 100 + " (calculado sobre un saco de " + pesoSaco + " lb)"
                : ""
          }
        />
        <Dato etiqueta="Peso del saco" valor={pesoSaco > 0 ? pesoSaco + " lb" : precioSaco > 0 ? "Sin indicar" : ""} />
        {!precioSaco && !precioQuintal && !precioUnidad && <Dato etiqueta="Precio" valor="A convenir" />}
        <Dato etiqueta="Disponibilidad" valor={ETIQUETA_DISPONIBILIDAD[disp] || "Disponible"} />
        <Dato etiqueta="Sacos disponibles" valor={lote.stockSacos} />
        <Dato etiqueta="Venta mínima" valor={lote.ventaMinima || "A convenir"} />
        <Dato etiqueta="Certificación" valor={lote.certificacion || "Sin especificar"} />
        <Dato etiqueta="Estado" valor={lote.estado} />
        <Dato etiqueta="Humedad" valor={lote.humedad ? lote.humedad + " %" : ""} />
        <Dato etiqueta="Zaranda" valor={lote.zaranda} />
        <Dato etiqueta="Defectos / 300 g" valor={lote.defectos} />
        <Dato etiqueta="Rendimiento" valor={lote.rendimiento ? lote.rendimiento + " %" : ""} />
        <Dato etiqueta="Empaque" valor={lote.empaque} />
        <Dato etiqueta="Cosecha" valor={lote.cosecha} />
        <Dato etiqueta="Cantidad" valor={lote.cantidadKg ? lote.cantidadKg + " kg" : ""} />
        <Dato etiqueta="Entrega" valor={lote.entrega} />
        <Dato etiqueta="Muestra" valor={lote.muestraDisponible === true ? "Disponible" : lote.muestraDisponible === false ? "No disponible" : ""} />
        <Dato etiqueta="Marca" valor={lote.marca} />
        <Dato etiqueta="Presentación" valor={presentacionLote(lote)} />
        <Dato etiqueta="Precio por unidad" valor={precioUnidad > 0 ? "$ " + lote.precioUnidad : ""} />
        <Dato etiqueta="Unidades disponibles" valor={lote.unidades} />
        <Dato etiqueta="Tueste" valor={lote.tueste} />
        <Dato etiqueta="Molienda" valor={lote.molienda} />
        <Dato etiqueta="Fecha de tueste" valor={lote.fechaTueste} />
        <Dato etiqueta="Empaque" valor={lote.empaqueTerminado} />
        <Dato etiqueta="Registro sanitario" valor={lote.registroSanitario} />
        <Dato etiqueta="Descafeinado" valor={lote.descafeinado === true ? "Sí" : lote.descafeinado === false ? "No" : ""} />
        <Dato etiqueta="Perfil en etiqueta" valor={lote.perfilTaza} />
      </div>
      {!!lote.notasTaza && (
        <p className="redcafe-lote-desc">
          <strong>Notas de taza:</strong> {s(lote.notasTaza)}
        </p>
      )}
      {!!lote.observaciones && <p className="redcafe-lote-desc">{s(lote.observaciones)}</p>}
      {lote.ficha_restringida && (
        <div className="redcafe-lote-registro">
          <h2>La ficha completa y el contacto son para miembros</h2>
          <p>
            El análisis de laboratorio, el informe de catación, los certificados y el resto de la ficha técnica los publica el productor para quien tiene cuenta en
            la Red. Con tu perfil puedes escribir al vendedor, hacer pedidos y dar seguimiento desde tu panel: el productor sabe quién le está comprando.
          </p>
          <div className="redcafe-lote-registro-acciones">
            <a className="btn-primary" href="/afiliate/">
              Crear mi cuenta gratis
            </a>
            <a className="btn-ghost" href="/login/">
              Ya tengo cuenta
            </a>
          </div>
        </div>
      )}
      {!lote.ficha_restringida &&
        (docs.length ? (
          <div className="redcafe-lote-docs">
            <h2>Certificados y documentos</h2>
            <ul>
              {docs.map((d) => (
                <li key={s(d.url)}>
                  <a href={s(d.url)} target="_blank" rel="noreferrer">
                    {d.titulo || "Documento"}
                    <em>{d.formato === "pdf" ? "PDF" : "Imagen"}</em>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="redcafe-lote-docs es-vacia">
            <h2>Certificados y documentos</h2>
            <p>Este lote no tiene documentos adjuntos. Puedes pedir el informe de catación o el certificado antes de cerrar la compra.</p>
          </div>
        ))}
      <div className="redcafe-lote-vendedor">
        <h2>Quién vende</h2>
        <p className="redcafe-lote-vendedor-nombre">{contacto.nombre || lote.productor || "Miembro de la Red"}</p>
        <p>{partes.join(" · ")}.</p>
        {lote.ubicacion_aproximada && (
          <p className="redcafe-lote-nota">
            La ubicación del mapa es una referencia de la provincia, no la finca exacta: pídesela si necesitas la trazabilidad del origen.
          </p>
        )}
      </div>
      {!lote.ficha_restringida && faltan.length > 0 && !demo && (
        <div className="redcafe-lote-falta">
          <h2>Datos que este lote todavía no declara</h2>
          <ul>
            {faltan.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="redcafe-lote-nota">
            Que falten no dice nada malo del café: muchos productores venden sin análisis de laboratorio. Pero conviene preguntarlos antes de acordar precio.
          </p>
          {wa && (
            <a
              className="btn-ghost redcafe-contactar"
              data-lote={idLote}
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${wa}?text=${msgWhatsapp(pedirFaltantes, "lote", idLote)}`}
            >
              Pedir estos datos por WhatsApp
            </a>
          )}
        </div>
      )}
      {filasFicha.length > 0 && (
        <div className="redcafe-lote-ficha">
          <h2>{lote.ficha_restringida ? "Resumen público del lote" : "Ficha técnica de compra"}</h2>
          {filasFicha.map(([k, v]) => (
            <p key={k}>
              <span>{k}</span>
              {v}
            </p>
          ))}
        </div>
      )}
      <div className="redcafe-lote-acciones">
        {accion}
        {VOLVER}
      </div>
    </div>
  );
}
