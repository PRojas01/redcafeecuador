"use client";

import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";

interface RatingResumen {
 promedio: number;
 count: number;
}

export function RatingBadge({ memberId, compacto }: { memberId: string; compacto?: boolean }) {
 const [data, setData] = useState<RatingResumen | null>(null);

 useEffect(() => {
 let cancel = false;
 fetch(CONFIG.api(`/api/ratings.php?action=promedio&id=${encodeURIComponent(memberId)}`), { credentials: "include" })
 .then((r) => r.json())
 .then((j) => {
 if (!cancel && j?.ok) setData(j.data);
 })
 .catch(() => {});
 return () => { cancel = true; };
 }, [memberId]);

 if (!data || data.count === 0) {
 if (compacto) return null;
 return (
 <span className="rounded-full bg-pizarra/10 px-2 py-0.5 text-[10px] font-medium text-pizarra/60">
 Sin valoraciones
 </span>
 );
 }

 if (compacto) {
 return (
 <span className="rounded-full bg-latte/20 px-2 py-0.5 text-[10px] font-bold text-pizarra">
 ★ {data.promedio.toFixed(1)}
 </span>
 );
 }

 return (
 <span className="inline-flex items-center gap-1 rounded-full bg-latte/20 px-2.5 py-0.5 text-xs font-bold text-pizarra">
 <span>★</span> {data.promedio.toFixed(1)}
 <span className="text-[10px] font-normal text-pizarra/60">({data.count})</span>
 </span>
 );
}
