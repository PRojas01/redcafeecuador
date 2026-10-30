/**
 * Marca de la Red — logotipo y bandera, en piezas separadas.
 *
 *   · LogoRedCafe: dos arcos con punta de flecha girando alrededor del grano.
 *     Las flechas dicen lo que un anillo cerrado no decía: aquí las cosas
 *     circulan —café que sale, negocio que vuelve—. Un solo color, así que
 *     sirve igual para favicon, sello o documento en blanco y negro.
 *
 *   · BanderaEcuador: la bandera oficial con el escudo, servida como imagen
 *     porque el escudo (cóndor, Chimborazo, vapor Guayas, fasces y laureles)
 *     no se puede redibujar a mano sin estropearlo. Se sirve en dos tamaños
 *     para que el navegador elija según la densidad de pantalla.
 *
 * La bandera acompaña al logotipo pero nunca va dentro, para poder retirarla
 * donde estorbe sin romper la marca.
 */

type Props = {
  className?: string;
  /** Título accesible. Si se omite, la pieza queda como decorativa. */
  titulo?: string;
};

export function LogoRedCafe({ className = "h-9 w-9", titulo }: Props) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={className}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Arco superior: entra por la izquierda y apunta a la derecha */}
        <path d="M18 32a35 35 0 0 1 54-6" />
        <path d="M60 21l12 5-4 12" />

        {/* Arco inferior: cierra el giro en sentido contrario */}
        <path d="M78 64a35 35 0 0 1-54 6" />
        <path d="M36 75l-12-5 4-12" />
      </g>

      {/* Grano visto desde abajo, con la hendidura recorriendo su eje */}
      <mask id="hendidura-grano">
        <rect width="96" height="96" fill="#fff" />
        <path
          d="M48 34c-3.6 5.6 3.6 11.2 0 16.8s-3.6 11.2 0 16.8"
          fill="none"
          stroke="#000"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </mask>
      <ellipse
        cx="48"
        cy="50"
        rx="12"
        ry="17"
        fill="currentColor"
        mask="url(#hendidura-grano)"
      />
    </svg>
  );
}

/**
 * Bandera oficial del Ecuador, con escudo.
 *
 * Proporción 3:2. Se declaran ancho y alto para que no haya salto de maquetación
 * mientras carga, y se marca `decorative` cuando acompaña a un texto que ya dice
 * «Ecuador», para no repetirlo en el lector de pantalla.
 */
export function BanderaEcuador({
  className = "h-4 w-6",
  titulo,
}: Props) {
  return (
    <img
      src="/img/bandera-ecuador-96.webp"
      srcSet="/img/bandera-ecuador-96.webp 96w, /img/bandera-ecuador-192.webp 192w"
      sizes="(min-width: 768px) 32px, 24px"
      width={96}
      height={64}
      alt={titulo ?? ""}
      aria-hidden={titulo ? undefined : true}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
