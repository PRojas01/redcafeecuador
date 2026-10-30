import { FichaLote } from "@/components/FichaLote";

// Una sola ficha para los lotes de ejemplo y para los de los miembros (el
// servidor sirve /marketplace/ficha/ a los que no tienen página propia).
export default function LotePage() {
 return <FichaLote />;
}
