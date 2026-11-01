"use client";

// «Qué cuesta y qué no», al pie de /comunidad/ (antes lo pintaba la capa propia
// al terminar de cargar). Lo gratuito sale desde el primer HTML; los precios de
// los servicios llegan de la API.
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";

const GRATIS: Array<[string, string]> = [
  ["Acceso básico", "Te encuentran, te escriben y cotizas sin pagar nada por estar."],
  ["Marketplace de lotes de café", "Vendes o compras con el origen a la vista y contacto directo entre las partes."],
  ["Academia básica", "Aprendes lo que sube el precio de tu café: producción, post-cosecha y taza."],
  ["Panel de precios", "Negocias con una referencia actual y una fuente visible para comparar mejor."],
  ["Que te encuentren", "Tus lotes de café, tu menú o tu servicio, delante de quien está buscando comprar."],
  ["Comprar y vender directo", "Contacto claro para comprar, vender o contratar servicios."],
];

type Servicio = { id?: string; titulo?: string; nombre?: string; precio?: number | string; unidad?: string };

const formatoPrecio = (precio: unknown) => {
  const n = Number(precio);
  if (!Number.isFinite(n)) return "";
  return n === Math.floor(n) ? String(n) : n.toFixed(2);
};

export function CostesRed() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  useEffect(() => {
    let vivo = true;
    fetch(CONFIG.api("/api/marketplace-servicios.php?action=list"), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        const lista = ((res && res.ok && res.data && res.data.servicios) || []) as Servicio[];
        if (vivo) setServicios(lista.filter((s) => Number(s.precio) > 0).sort((a, b) => Number(b.precio) - Number(a.precio)));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <section id="redcafe-costes-comunidad" className="redcafe-costes" aria-label="Qué cuesta y qué no">
      <div className="redcafe-costes-caja">
        <p className="redcafe-costes-rotulo">Qué cuesta y qué no</p>
        <h2>Estar en la Red es gratis. Los servicios, solo si los pides</h2>
        <p className="redcafe-costes-intro">
          Crear tu perfil y usar la Red no cuesta nada. Los servicios especializados se contratan solo cuando los pides.
        </p>
        <div className="redcafe-costes-columnas">
          <div className="redcafe-costes-col is-gratis">
            <p className="redcafe-costes-col-rotulo">Incluido en tu cuenta · $0</p>
            <h3>Lo que ganas por registrarte</h3>
            <ul>
              {GRATIS.map(([b, t]) => (
                <li key={b}>
                  <b>{b}</b> {t}
                </li>
              ))}
            </ul>
            <Link className="redcafe-costes-cta" href="/afiliate/">
              Crear mi perfil gratis
            </Link>
          </div>
          <div className="redcafe-costes-col">
            <p className="redcafe-costes-col-rotulo">Servicios especializados · con costo</p>
            <h3>Se contratan solo cuando los necesitas</h3>
            <ul className="redcafe-costes-precios">
              {servicios.map((s, i) => (
                <li key={s.id || i}>
                  <span>{s.titulo || s.nombre || "Servicio"}</span>
                  <span className="redcafe-costes-precio">
                    {"desde $" + formatoPrecio(s.precio) + (s.unidad ? " / " + s.unidad : "")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="redcafe-costes-nota">
              El precio varía según alcance y ubicación. Se confirma antes de contratar y no hay cobros automáticos.
            </p>
            <Link className="redcafe-costes-enlace" href="/servicios/">
              Ver todos los servicios →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
