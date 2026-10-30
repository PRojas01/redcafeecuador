"use client";

// Piezas vivas de /servicios/ que antes ponía la capa propia al cargar:
// el precio real de cada servicio (sale de la API, no de la lista fija) y el
// servicio de intermediación.
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONFIG, waLink } from "@/lib/config";

type Servicio = { id?: string; titulo?: string; nombre?: string; precio?: number | string; unidad?: string };

// Nombre en la página → título del servicio en la API.
const ALIAS: Record<string, string> = {
  "expediente de trazabilidad": "Expediente EUDR",
  "servicio de catación": "Informe de catación",
};

const normalizar = (t?: string) => String(t || "").toLowerCase().replace(/\s+/g, " ").trim();
const formatoPrecio = (precio: unknown) => {
  const n = Number(precio);
  if (!Number.isFinite(n)) return "";
  return n === Math.floor(n) ? String(n) : n.toFixed(2);
};

let promesa: Promise<Servicio[]> | null = null;
function serviciosApi(): Promise<Servicio[]> {
  if (!promesa) {
    promesa = fetch(CONFIG.api("/api/marketplace-servicios.php?action=list"), { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((res) => ((res && res.ok && res.data && res.data.servicios) || []) as Servicio[])
      .catch(() => {
        promesa = null;
        return [];
      });
  }
  return promesa;
}

function buscar(lista: Servicio[], nombre: string, id: string) {
  const porTitulo = new Map(lista.map((s) => [normalizar(s.titulo), s]));
  const alias = ALIAS[normalizar(nombre)];
  let s = porTitulo.get(normalizar(alias ?? nombre));
  if (!s && id) {
    const clave = normalizar(id.replace(/-/g, " "));
    s = lista.find((c) => normalizar(c.titulo).indexOf(clave) === 0);
  }
  return s && Number(s.precio) > 0 ? s : null;
}

/** «desde $X unidad»: la lista fija mientras carga; luego el precio real de la API. */
export function PrecioServicio({ id, nombre, precio, unidad }: { id: string; nombre: string; precio: number | string; unidad?: string }) {
  const [real, setReal] = useState<Servicio | null>(null);
  useEffect(() => {
    let vivo = true;
    serviciosApi().then((l) => vivo && setReal(buscar(l, nombre, id)));
    return () => {
      vivo = false;
    };
  }, [id, nombre]);
  const p = real ? formatoPrecio(real.precio) : String(precio);
  const u = real ? real.unidad : unidad;
  return (
    <p className="mt-3 text-lg font-bold text-cereza">
      <span className="rotulo mr-1 align-middle text-text-secondary">desde</span>${p}
      {u && <span className="text-sm font-normal text-pizarra/60"> {u}</span>}
    </p>
  );
}

/** Servicio oficial de intermediación en compraventa de café. */
export function Intermediacion() {
  return (
    <section id="redcafe-intermediation-service" className="mx-auto max-w-6xl px-4 py-6">
      <article className="redcafe-service-card redcafe-service-feature">
        <div>
          <p className="rotulo text-filtrado-600">Servicio oficial Red Café Ecuador</p>
          <h2>Intermediación en compraventa de café</h2>
          <p>
            Acompañamos a la parte que nos contrata durante una compra o venta de café: búsqueda de calidad, selección de
            proveedor o comprador, validación del lote, visita técnica, revisión de condiciones y soporte hasta el cierre.
          </p>
        </div>
        <div className="redcafe-service-steps">
          <p>
            <b>Para compradores:</b> ubicamos calidad, filtramos proveedores, validamos el lote y acompañamos la compra.
          </p>
          <p>
            <b>Para vendedores:</b> preparamos la oferta, revisamos calidad, soportamos la negociación y acompañamos el cierre.
          </p>
        </div>
        <div className="redcafe-action-row">
          <Link href="/marketplace/?ver=servicios">Solicitar servicio</Link>
          <a href={waLink("Hola, quiero solicitar intermediación en compraventa de café.")} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </div>
      </article>
    </section>
  );
}
