/**
 * Cafetal en ladera — lámina del héroe.
 *
 * CÓMO ESTÁ CONSTRUIDA
 * Sin degradados. La profundidad sale de perspectiva aérea por capas planas:
 * cada plano más lejano es más claro, menos saturado y con menos detalle, que
 * es como se comporta la neblina de altura de verdad. Eso da relieve sin una
 * sola transición de color y encaja con el registro plano del resto del sitio.
 *
 * El detalle se genera, no se dibuja a mano: `ruido()` es un pseudoaleatorio
 * DETERMINISTA — con la misma semilla siempre da el mismo valor — para que el
 * HTML del servidor y el del navegador coincidan. Con Math.random se rompería
 * la hidratación de React.
 *
 * EL SUJETO es la rama en primer término, a la derecha del eje, con cerezas en
 * tres estados de maduración a la vez: verde, pintón y rojo. En una finca real
 * la maduración nunca es pareja; es el detalle que separa un cafetal de verdad
 * de una foto de banco.
 */

type Props = {
  className?: string;
  /** Marco de recorte para la animación de acercamiento. */
  id?: string;
};

/** Pseudoaleatorio determinista: misma entrada, misma salida, siempre. */
function ruido(i: number, semilla = 1): number {
  const x = Math.sin(i * 127.1 + semilla * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Una fila de matas de café que se aleja: más pequeñas y más claras al fondo. */
function Fila({
  y,
  alto,
  color,
  cantidad,
  semilla,
  opacidad = 1,
}: {
  y: number;
  alto: number;
  color: string;
  cantidad: number;
  semilla: number;
  opacidad?: number;
}) {
  const matas = Array.from({ length: cantidad }, (_, i) => {
    const t = i / (cantidad - 1);
    const x = -60 + t * 1720;
    const v = ruido(i, semilla);
    const w = alto * (0.78 + v * 0.5);
    const h = alto * (0.82 + ruido(i, semilla + 5) * 0.42);
    const dy = (ruido(i, semilla + 9) - 0.5) * alto * 0.22;
    return { x, y: y + dy, w, h, i, v };
  });

  return (
    <g opacity={opacidad}>
      {matas.map((m) => (
        <g key={m.i}>
          {/* masa de la mata */}
          <ellipse cx={m.x} cy={m.y} rx={m.w} ry={m.h} fill={color} />
          {/* dos lóbulos laterales: rompen la silueta de óvalo perfecto */}
          <ellipse
            cx={m.x - m.w * 0.55}
            cy={m.y + m.h * 0.18}
            rx={m.w * 0.52}
            ry={m.h * 0.62}
            fill={color}
          />
          <ellipse
            cx={m.x + m.w * 0.58}
            cy={m.y + m.h * 0.12}
            rx={m.w * 0.48}
            ry={m.h * 0.66}
            fill={color}
          />
        </g>
      ))}
    </g>
  );
}

/** Hoja de café: elíptica, con punta acuminada y nervio marcado. */
function Hoja({
  x,
  y,
  rot,
  largo,
  color,
  nervio,
}: {
  x: number;
  y: number;
  rot: number;
  largo: number;
  color: string;
  nervio: string;
}) {
  const a = largo;
  const b = largo * 0.36;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path
        d={`M0 0 C ${a * 0.28} ${-b} ${a * 0.72} ${-b} ${a} 0 C ${a * 0.72} ${b} ${a * 0.28} ${b} 0 0 Z`}
        fill={color}
      />
      {/* nervio central */}
      <path d={`M${a * 0.06} 0 L ${a * 0.94} 0`} stroke={nervio} strokeWidth={largo * 0.022} opacity="0.55" />
      {/* nervios laterales, curvados hacia la punta como en la especie */}
      {[0.25, 0.42, 0.59, 0.76].map((p, i) => (
        <g key={i}>
          <path
            d={`M${a * p} 0 Q ${a * (p + 0.06)} ${-b * 0.42} ${a * (p + 0.15)} ${-b * 0.52}`}
            stroke={nervio}
            strokeWidth={largo * 0.014}
            fill="none"
            opacity="0.4"
          />
          <path
            d={`M${a * p} 0 Q ${a * (p + 0.06)} ${b * 0.42} ${a * (p + 0.15)} ${b * 0.52}`}
            stroke={nervio}
            strokeWidth={largo * 0.014}
            fill="none"
            opacity="0.4"
          />
        </g>
      ))}
    </g>
  );
}

/** Cereza con su disco apical y un punto de luz especular. */
function Cereza({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} />
      {/* disco apical: la cicatriz de la flor, siempre presente en el fruto */}
      <circle cx={x + r * 0.1} cy={y - r * 0.62} r={r * 0.2} fill="#2A1207" opacity="0.35" />
      {/* brillo céreo */}
      <ellipse
        cx={x - r * 0.32}
        cy={y - r * 0.34}
        rx={r * 0.26}
        ry={r * 0.18}
        fill="#FBFAF7"
        opacity="0.5"
        transform={`rotate(-28 ${x - r * 0.32} ${y - r * 0.34})`}
      />
    </g>
  );
}

export function Cafetal({ className = "h-full w-full", id }: Props) {
  // Tres estados de maduración a la vez: así madura una finca de verdad.
  const VERDE = "#6E8B4A";
  const PINTON = "#C87A2E";
  const ROJO = "#A9301C";

  // Racimos en las axilas de las hojas, a lo largo de la rama.
  const racimos = [
    { x: 1190, y: 452, n: 7, estado: 0 },
    { x: 1268, y: 508, n: 8, estado: 2 },
    { x: 1352, y: 470, n: 6, estado: 1 },
    { x: 1418, y: 545, n: 9, estado: 2 },
    { x: 1300, y: 590, n: 7, estado: 2 },
    { x: 1478, y: 470, n: 5, estado: 0 },
    { x: 1225, y: 640, n: 6, estado: 1 },
  ];

  return (
    <svg
      viewBox="0 0 1600 900"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Cafetal en ladera al amanecer, con una rama en primer plano cargada de cerezas verdes, pintonas y maduras"
      id={id}
    >
      {/* ── CIELO Y NEBLINA · el plano más claro y sin detalle ── */}
      <rect width="1600" height="900" fill="#E9E6DD" />
      <rect y="0" width="1600" height="112" fill="#EFEDE6" />

      {/* ── CRESTA LEJANA · casi disuelta en la neblina ── */}
      <path d="M0 300 L 180 246 L 340 282 L 520 214 L 700 268 L 880 226 L 1080 286 L 1280 238 L 1460 290 L 1600 254 L 1600 340 L 0 340 Z" fill="#B9C0B4" opacity="0.55" />
      <path d="M0 334 L 220 292 L 430 330 L 640 286 L 860 328 L 1090 292 L 1320 336 L 1600 300 L 1600 400 L 0 400 Z" fill="#A3AD9C" opacity="0.7" />

      {/* banda de neblina colgada entre la cresta y las filas */}
      <rect y="300" width="1600" height="52" fill="#EFEDE6" opacity="0.62" />

      {/* ── LADERA · el terreno en pendiente, que es lo que hace de altura ── */}
      <path d="M0 372 L 1600 330 L 1600 900 L 0 900 Z" fill="#8B9481" />

      {/* ── FILAS DE CAFÉ · cuatro planos, cada uno más oscuro y más grande ── */}
      <Fila y={392} alto={17} color="#93A088" cantidad={46} semilla={2} opacidad={0.85} />
      <Fila y={430} alto={25} color="#7C8C72" cantidad={34} semilla={7} opacidad={0.92} />
      <Fila y={484} alto={36} color="#66785A" cantidad={26} semilla={13} />
      <Fila y={556} alto={52} color="#516244" cantidad={19} semilla={21} />
      <Fila y={654} alto={74} color="#3E4E34" cantidad={14} semilla={29} />

      {/* calles de tierra entre las filas: se ven a trozos, no como líneas continuas */}
      {[430, 500, 590, 700].map((y, i) => (
        <g key={y} opacity={0.28 + i * 0.06}>
          {Array.from({ length: 7 }, (_, k) => {
            const w = 90 + ruido(k, y) * 150;
            const x = ruido(k + 3, y) * 1500 - 60;
            return <rect key={k} x={x} y={y + 14 + i * 3} width={w} height={4 + i * 2} fill="#6B4A2A" />;
          })}
        </g>
      ))}

      {/* ── SUELO EN PRIMER TÉRMINO · hojarasca ── */}
      <path d="M0 790 L 1600 752 L 1600 900 L 0 900 Z" fill="#4A3320" />
      <path d="M0 832 L 1600 800 L 1600 900 L 0 900 Z" fill="#3A2716" />
      {Array.from({ length: 54 }, (_, i) => {
        const x = ruido(i, 41) * 1600;
        const y = 770 + ruido(i, 47) * 120;
        const w = 12 + ruido(i, 53) * 26;
        const r = ruido(i, 59) * 180 - 90;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={w}
            ry={w * 0.34}
            fill={ruido(i, 61) > 0.5 ? "#5C4028" : "#2F2013"}
            opacity={0.5 + ruido(i, 67) * 0.4}
            transform={`rotate(${r} ${x} ${y})`}
          />
        );
      })}

      {/* ══════════ SUJETO · LA RAMA EN PRIMER PLANO ══════════
          Entra por la derecha, fuera del eje. Es lo único a foco pleno. */}
      <g id="rama-primer-plano" transform="translate(90 -80) scale(1.42)" transform-origin="1300 500">
        {/* rama principal y sus dos ramillas */}
        <path
          d="M1600 372 C 1440 396 1300 442 1150 512 C 1080 546 1030 590 990 646"
          stroke="#4A3320"
          strokeWidth="17"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M1352 460 C 1310 512 1286 566 1272 634"
          stroke="#4A3320"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M1246 500 C 1206 540 1180 588 1168 648"
          stroke="#4A3320"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />

        {/* hojas opuestas, como en la especie: en pares enfrentados */}
        {[
          { x: 1508, y: 396, rot: -34, l: 152 },
          { x: 1508, y: 404, rot: 30, l: 146 },
          { x: 1402, y: 438, rot: -46, l: 168 },
          { x: 1402, y: 448, rot: 26, l: 158 },
          { x: 1288, y: 490, rot: -52, l: 178 },
          { x: 1288, y: 500, rot: 22, l: 170 },
          { x: 1176, y: 552, rot: -58, l: 186 },
          { x: 1176, y: 562, rot: 18, l: 176 },
          { x: 1074, y: 618, rot: -62, l: 172 },
          { x: 1074, y: 628, rot: 12, l: 164 },
        ].map((h, i) => (
          <Hoja
            key={i}
            x={h.x}
            y={h.y}
            rot={h.rot}
            largo={h.l}
            color={i % 2 === 0 ? "#31452A" : "#3F6B4A"}
            nervio="#22301C"
          />
        ))}

        {/* racimos en las axilas: verde, pintón y rojo conviviendo */}
        {racimos.map((rc, k) => (
          <g key={k}>
            {Array.from({ length: rc.n }, (_, i) => {
              const ang = (i / rc.n) * Math.PI * 2;
              const rad = 19 + ruido(i, k * 3 + 1) * 17;
              const cx = rc.x + Math.cos(ang) * rad;
              const cy = rc.y + Math.sin(ang) * rad * 0.82;
              const r = 16 + ruido(i, k * 5 + 2) * 7;
              // dentro de un mismo racimo también hay dispersión de madurez
              const v = ruido(i, k * 7 + 3);
              const color =
                rc.estado === 0
                  ? v > 0.75
                    ? PINTON
                    : VERDE
                  : rc.estado === 1
                  ? v > 0.6
                    ? ROJO
                    : PINTON
                  : v > 0.22
                  ? ROJO
                  : v > 0.1
                  ? PINTON
                  : VERDE;
              return <Cereza key={i} x={cx} y={cy} r={r} color={color} />;
            })}
          </g>
        ))}
      </g>
    </svg>
  );
}
