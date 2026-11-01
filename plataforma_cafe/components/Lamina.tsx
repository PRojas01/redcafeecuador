import type { SVGProps } from "react";

type LaminaProps = SVGProps<SVGSVGElement> & {
  className?: string;
};

type SacoProps = LaminaProps & {
  linea1?: string;
  linea2?: string;
  linea3?: string;
};

type TazaProps = LaminaProps & {
  puntaje?: string;
  notas?: string;
};

function SharedDefs() {
  return (
    <defs>
      <pattern id="lamina-rayas" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M-2 8 8-2M2 12 12 2" stroke="var(--color-tostado)" strokeWidth="1" opacity=".26" />
      </pattern>
      <pattern id="lamina-yute" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 3h12M0 9h12M3 0v12M9 0v12" stroke="var(--color-tostado)" strokeWidth="1" opacity=".22" />
      </pattern>
      <pattern id="lamina-grano" width="18" height="12" patternUnits="userSpaceOnUse">
        <path d="M5 6c0-2 2-3.5 4-3.5S13 4 13 6s-2 3.5-4 3.5S5 8 5 6Z" fill="none" stroke="var(--color-cereza)" strokeWidth="1" opacity=".55" />
        <path d="M9 3.2c-1 1.2-1 4.4 0 5.6" stroke="var(--color-cereza)" strokeWidth=".8" opacity=".45" />
      </pattern>
    </defs>
  );
}

function baseProps(label: string, className?: string): SVGProps<SVGSVGElement> {
  return {
    role: "img",
    "aria-label": label,
    className,
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  };
}

export function FincaTerrazas({ className, ...props }: LaminaProps) {
  return (
    <svg viewBox="0 0 1600 900" {...baseProps("Cordilleras, hileras de cafetos y sol naciente", className)} {...props}>
      <SharedDefs />
      <rect width="1600" height="900" fill="var(--color-crema)" />
      <circle cx="1110" cy="230" r="112" fill="var(--color-latte)" stroke="var(--color-cafe)" strokeWidth="10" />
      <path d="M0 430 250 220l195 130 220-190 250 210 185-130 260 210 240-180v630H0Z" fill="var(--color-tostado-claro)" stroke="var(--color-cafe)" strokeWidth="12" />
      <path d="M0 520c170-70 310-82 465-30 175 58 305 44 490-36 206-89 398-74 645 64v382H0Z" fill="var(--color-hoja)" opacity=".18" stroke="var(--color-hoja)" strokeWidth="10" />
      <path d="M0 600c190-75 365-76 540-3s355 74 540 0 350-75 520 5v298H0Z" fill="url(#lamina-rayas)" stroke="var(--color-cafe)" strokeWidth="10" />
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={i} d={`M${-80 + i * 205} 835C${90 + i * 185} 740 ${215 + i * 150} 710 ${410 + i * 165} 630`} stroke="var(--color-hoja)" strokeWidth="14" />
      ))}
      {Array.from({ length: 28 }).map((_, i) => (
        <circle key={i} cx={80 + (i * 57) % 1450} cy={610 + (i * 29) % 220} r="11" fill="var(--color-cereza)" stroke="var(--color-cafe)" strokeWidth="4" />
      ))}
    </svg>
  );
}

export function CerezaMadura({ className, ...props }: LaminaProps) {
  return (
    <svg viewBox="0 0 800 1000" {...baseProps("Rama de cafeto con hojas verdes y cerezas maduras", className)} {...props}>
      <SharedDefs />
      <rect width="800" height="1000" fill="var(--color-crema)" />
      <path d="M150 820C310 625 470 425 650 150" stroke="var(--color-cafe)" strokeWidth="18" />
      {[[230,680,-24],[360,535,18],[500,355,-20],[575,255,24]].map(([x, y, r]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path d="M0 0C-95-80-215-55-260 35-150 75-55 60 0 0Z" fill="var(--color-hoja)" opacity=".22" stroke="var(--color-hoja)" strokeWidth="12" />
          <path d="M0 0C95-80 215-55 260 35 150 75 55 60 0 0Z" fill="var(--color-hoja)" opacity=".22" stroke="var(--color-hoja)" strokeWidth="12" />
          <path d="M-210 33C-125 25-62 18 0 0M0 0C62 18 125 25 210 33" stroke="var(--color-hoja)" strokeWidth="7" />
        </g>
      ))}
      {[[285,620],[330,585],[445,455],[493,410],[585,280],[626,232]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="43" fill="var(--color-cereza)" stroke="var(--color-cafe)" strokeWidth="9" />
          <path d={`M${x - 12} ${y - 27}c18 18 18 38 0 58`} stroke="var(--color-cafe)" strokeWidth="5" opacity=".65" />
        </g>
      ))}
      <rect x="52" y="52" width="696" height="896" stroke="var(--color-cafe)" strokeWidth="10" />
      <rect x="52" y="52" width="696" height="896" fill="url(#lamina-rayas)" opacity=".24" />
    </svg>
  );
}

export function SacoExportacion({
  className,
  linea1 = "RED CAFÉ",
  linea2 = "ECUADOR · 69 KG",
  linea3 = "LOTE 2026-001",
  ...props
}: SacoProps) {
  return (
    <svg viewBox="0 0 1200 900" {...baseProps("Saco de exportación con trama de yute y estarcido", className)} {...props}>
      <SharedDefs />
      <rect width="1200" height="900" fill="var(--color-crema)" />
      <path d="M330 110h540l80 685c-180 65-510 65-700 0z" fill="var(--color-latte-claro)" stroke="var(--color-cafe)" strokeWidth="16" />
      <path d="M330 110c120 48 390 48 540 0" stroke="var(--color-cafe)" strokeWidth="16" />
      <path d="M265 215c205 52 475 62 670 0M245 755c240 74 475 74 710 0" stroke="var(--color-tostado)" strokeWidth="8" opacity=".55" />
      <path d="M330 110h540l80 685c-180 65-510 65-700 0z" fill="url(#lamina-yute)" />
      <text x="600" y="390" textAnchor="middle" fill="var(--color-cafe)" fontFamily="var(--font-titulo)" fontSize="112" fontWeight="800">{linea1}</text>
      <text x="600" y="500" textAnchor="middle" fill="var(--color-cereza)" fontFamily="var(--font-cuerpo)" fontSize="56" fontWeight="800">{linea2}</text>
      <text x="600" y="590" textAnchor="middle" fill="var(--color-cafe)" fontFamily="var(--font-cuerpo)" fontSize="48" fontWeight="800">{linea3}</text>
      <path d="M430 655h340" stroke="var(--color-hoja)" strokeWidth="14" />
    </svg>
  );
}

export function TazaCenital({ className, puntaje = "86.5 SCA", notas = "cacao · panela · cítrico", ...props }: TazaProps) {
  return (
    <svg viewBox="0 0 1200 900" {...baseProps("Taza cenital con roseta y ficha de catación", className)} {...props}>
      <SharedDefs />
      <rect width="1200" height="900" fill="var(--color-crema)" />
      <circle cx="455" cy="450" r="285" fill="var(--color-latte-claro)" stroke="var(--color-cafe)" strokeWidth="16" />
      <circle cx="455" cy="450" r="218" fill="var(--color-cafe)" stroke="var(--color-tostado)" strokeWidth="10" />
      <path d="M455 570c-92-78-92-160 0-245 92 85 92 167 0 245Z" fill="var(--color-latte)" stroke="var(--color-crema)" strokeWidth="10" />
      <path d="M455 560c-145-72-162-150-50-235M455 560c145-72 162-150 50-235" stroke="var(--color-crema)" strokeWidth="10" />
      <path d="M755 340h86c66 0 104 38 104 90s-38 92-104 92h-78" stroke="var(--color-cafe)" strokeWidth="16" />
      <rect x="800" y="170" width="275" height="560" fill="var(--color-latte-claro)" stroke="var(--color-cafe)" strokeWidth="10" />
      <path d="M835 285h205M835 360h205M835 435h205M835 510h150" stroke="var(--color-tostado)" strokeWidth="7" />
      <text x="938" y="630" textAnchor="middle" fill="var(--color-cereza)" fontFamily="var(--font-cuerpo)" fontSize="44" fontWeight="800">{puntaje}</text>
      <text x="938" y="685" textAnchor="middle" fill="var(--color-cafe)" fontFamily="var(--font-cuerpo)" fontSize="28" fontWeight="700">{notas}</text>
    </svg>
  );
}

export function CamasSecado({ className, ...props }: LaminaProps) {
  return (
    <svg viewBox="0 0 1600 900" {...baseProps("Camas africanas de secado en perspectiva con granos de café", className)} {...props}>
      <SharedDefs />
      <rect width="1600" height="900" fill="var(--color-crema)" />
      <path d="M0 250h1600M0 360h1600" stroke="var(--color-tostado)" strokeWidth="7" opacity=".35" />
      {[0, 1, 2].map((i) => {
        const y = 300 + i * 135;
        return (
          <g key={i}>
            <path d={`M210 ${y + 260} 645 ${y} 1340 ${y + 80} 880 ${y + 390}Z`} fill="url(#lamina-grano)" stroke="var(--color-cafe)" strokeWidth="14" />
            <path d={`M210 ${y + 260} 880 ${y + 390}M645 ${y} 1340 ${y + 80}`} stroke="var(--color-hoja)" strokeWidth="10" />
            <path d={`M300 ${y + 310}v70M1190 ${y + 290}v80M640 ${y + 365}v70`} stroke="var(--color-cafe)" strokeWidth="12" />
          </g>
        );
      })}
      <path d="M90 190c250-90 480-105 690-45 230 66 470 52 730-50" stroke="var(--color-hoja)" strokeWidth="12" opacity=".65" />
      <rect x="48" y="48" width="1504" height="804" stroke="var(--color-cafe)" strokeWidth="10" />
    </svg>
  );
}

export function SelloOrigen({ className, ...props }: LaminaProps) {
  return (
    <svg viewBox="0 0 320 160" {...baseProps("Sello de tinta: Origen verificado Ecuador", className)} {...props}>
      <ellipse cx="160" cy="80" rx="132" ry="54" stroke="var(--color-cereza)" strokeWidth="8" strokeDasharray="18 10" />
      <ellipse cx="160" cy="80" rx="112" ry="38" stroke="var(--color-cereza)" strokeWidth="3" opacity=".7" />
      <text x="160" y="76" textAnchor="middle" fill="var(--color-cereza)" fontFamily="var(--font-cuerpo)" fontSize="22" fontWeight="800">ORIGEN VERIFICADO</text>
      <text x="160" y="104" textAnchor="middle" fill="var(--color-cereza)" fontFamily="var(--font-cuerpo)" fontSize="18" fontWeight="800">ECUADOR</text>
      <path d="M72 45c20-9 41-11 63-4M211 119c20 5 39 3 56-7" stroke="var(--color-cereza)" strokeWidth="4" opacity=".45" />
    </svg>
  );
}
