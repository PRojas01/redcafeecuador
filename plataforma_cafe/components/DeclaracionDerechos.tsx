"use client";

export const DERECHOS_TEXTO = "Declaro que tengo los derechos sobre este contenido y asumo la responsabilidad ante cualquier reclamo de terceros.";

export function DeclaracionDerechos({ aceptado, onChange }: { aceptado: boolean; onChange: (valor: boolean) => void }) {
  return <label className="redcafe-derechos my-3 flex items-start gap-2 text-sm text-pizarra">
    <input type="checkbox" name="acepta_derechos" required checked={aceptado} onChange={(e) => onChange(e.target.checked)} />
    <span>{DERECHOS_TEXTO}</span>
  </label>;
}
