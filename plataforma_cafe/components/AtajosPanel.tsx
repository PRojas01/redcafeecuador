// «Tus herramientas»: barra de atajos arriba del panel. Antes la ponía la capa
// propia (redcafe-conversion.js · atajosPanel) después de cargar y empujaba
// todo el panel hacia abajo. Ahora sale con el panel, en el mismo pintado.
// Mismo id y clases, así que los estilos de redcafe-v60-final.css siguen valiendo.

type Atajo = { icono: keyof typeof ICONOS; titulo: string; href: string };

// Trazos de Lucide (licencia ISC), los mismos que usaba la capa.
const ICONOS = {
  vender: ["M7 20h10", "M10 20c5.5-2.5.8-6.4 3-10", "M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z", "M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"],
  comprar: ["M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z", "M3 6h18", "M16 10a4 4 0 0 1-8 0"],
  precio: ["M22 7 13.5 15.5 8.5 10.5 2 17", "M16 7h6v6"],
  academia: ["M22 10v6", "M2 10l10-5 10 5-10 5z", "M6 12v5c3 3 9 3 12 0v-5"],
  servicios: ["M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", "M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"],
  publicaciones: ["M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z", "M15 4v5h5", "M8 13h8", "M8 17h5"],
  bandeja: ["M4 13h4l2 3h4l2-3h4", "M5 5h14l2 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z"],
  requerimientos: ["M9 5h6a1 1 0 0 1 1 1v1H8V6a1 1 0 0 1 1-1z", "M8 7H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-2", "M9 12h6", "M9 16h4"],
  guias: ["M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z", "M14 4v4h4", "M8.5 12.5l1.4 1.4 3-3", "M8.5 17h7"],
  empleo: ["M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z", "M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2", "M3 12h18"],
};

const BASE: Atajo[] = [
  { icono: "publicaciones", titulo: "Mis publicaciones", href: "/panel/?ver=publicaciones" },
  { icono: "bandeja", titulo: "Mensajes", href: "/chat/" },
  { icono: "comprar", titulo: "Marketplace", href: "/marketplace/" },
  { icono: "precio", titulo: "Precio del café", href: "/servicios/precios/" },
  { icono: "academia", titulo: "Academia", href: "/academia/" },
  { icono: "servicios", titulo: "Servicios", href: "/servicios/" },
  { icono: "requerimientos", titulo: "Requerimientos", href: "/marketplace/?ver=requerimientos" },
  { icono: "empleo", titulo: "Empleo", href: "/marketplace/?ver=empleos" },
];

// Las guías son para quien maneja un cafetal o vende; a un comprador o a un
// transportista solo le ocuparían sitio.
const ROLES_GUIA = ["productor", "vendedor", "exportador", "bar", "barista", "asesor", "admin"];

function atajosPara(roles: string[]): Atajo[] {
  const lista = BASE.slice();
  if (ROLES_GUIA.some((r) => roles.includes(r))) lista.splice(1, 0, { icono: "guias", titulo: "Mis guías", href: "/panel/?ver=guias" });
  lista.unshift(
    roles.includes("productor")
      ? { icono: "vender", titulo: "Publicar lote de café", href: "/panel/?ver=publicar" }
      : { icono: "servicios", titulo: "Publicar servicio", href: "/panel/?ver=publicar_servicio" },
  );
  return lista;
}

export function AtajosPanel({ roles }: { roles: string[] }) {
  return (
    <section id="redcafe-atajos" aria-label="Accesos rápidos">
      <p className="redcafe-atajos-rotulo">Tus herramientas</p>
      <div className="redcafe-atajos-grid">
        {atajosPara(roles).map((a) => (
          // <a> y no <Link>: los atajos con ?ver= los abre la capa al cargar la página.
          <a key={a.href} href={a.href} className="redcafe-atajo">
            <span className="redcafe-atajo-icono" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                {ICONOS[a.icono].map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
            </span>
            <span className="redcafe-atajo-texto">{a.titulo}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
