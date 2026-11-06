"use client";

import { useEffect, useRef } from "react";
import type { Lote as LoteApi } from "@/lib/api";

interface Props {
 lotes: LoteApi[];
 onSelect?: (lote: LoteApi) => void;
 altura?: string;
}

/* Mapa de lotes
   ------------------------------------------------------------------
   Antes cada lote era un cuadro oscuro de 34 px con un emoji encima. Dos
   problemas: el emoji se veía borroso y fuera de marca, y los lotes de una
   misma provincia (o publicados sin coordenadas, que caen en el centro de la
   provincia) quedaban uno encima de otro: en la vista nacional solo se veía
   el de arriba. Ahora:
   - cada lote es un pin rojo con un grano de café dibujado en SVG;
   - los pines que se tocan se agrupan en un círculo con el número de lotes;
     al pulsarlo se acerca el mapa y, si ya no se puede acercar más (misma
     finca o mismo punto), los lotes se abren en abanico para elegir uno;
   - las coordenadas que llegan como texto («-1.23») también cuentan. */

const RADIO_GRUPO = 50; // px: dos pines a menos de esto se agrupan
const ZOOM_MAX_GRUPO = 14;

const esc = (v: unknown) =>
 String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const numero = (v: unknown) => (v === "" || v === null || v === undefined ? NaN : Number(v));

function pinHtml(ejemplo: boolean) {
 const fondo = ejemplo ? "#7A7768" : "#8C1E0E";
 return `<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true" style="display:block;filter:drop-shadow(0 2px 3px rgba(36,23,17,.35));${ejemplo ? "opacity:.8;" : ""}">` +
 `<path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 39 15 39s14-13.7 14-24.1C29 7.2 22.7 1 15 1z" fill="${fondo}" stroke="#fff" stroke-width="2"${ejemplo ? ' stroke-dasharray="3 2"' : ""}/>` +
 `<ellipse cx="15" cy="14.5" rx="6.2" ry="8" fill="#fff" transform="rotate(28 15 14.5)"/>` +
 `<path d="M12.6 8.4c3.2 2.6 1.6 9.2 4.8 12.2" fill="none" stroke="${fondo}" stroke-width="1.8" stroke-linecap="round"/>` +
 `</svg>`;
}

function grupoHtml(n: number) {
 const t = n > 99 ? 46 : 40;
 return `<div style="display:flex;align-items:center;justify-content:center;width:${t}px;height:${t}px;border-radius:50%;background:#8C1E0E;border:3px solid #fff;box-shadow:0 2px 8px rgba(36,23,17,.4);color:#fff;font:700 15px/1 Inter,system-ui,sans-serif;">${n}</div>`;
}

function precioTexto(l: LoteApi) {
 const x = l as unknown as Record<string, unknown>;
 const terminado = String(x.categoria || "") === "terminado";
 const saco = Number(x.precioSaco) || 0, quintal = Number(x.precioQuintal) || 0, unidad = Number(x.precioUnidad) || 0;
 const partes: string[] = [];
 if (terminado && unidad > 0) partes.push(`$${esc(unidad)} c/u`);
 else if (saco > 0) partes.push(`$${esc(saco)}/saco`);
 else if (quintal > 0) partes.push(`$${esc(quintal)}/quintal`);
 if (Number(x.score) > 0) partes.push(`${esc(x.score)} pts`);
 return partes.join(" · ");
}

function popupHtml(l: LoteApi) {
 const x = l as unknown as Record<string, unknown>;
 const ejemplo = Boolean(x.ejemplo || x.demo);
 const detalle = [x.provincia, x.variedad, x.proceso].filter(Boolean).map(esc).join(" · ");
 const precio = precioTexto(l);
 return (
 (ejemplo ? `<span style="display:inline-block;margin-bottom:4px;padding:2px 7px;background:#F3F1EA;color:#5C5A50;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Ejemplo · no es una finca real</span><br>` : "") +
 `<strong style="font-size:14px;color:#14140F;">${esc(x.finca || x.nombre || "Lote de café")}</strong>` +
 (detalle ? `<br><span style="font-size:12px;color:#5C5A50;">${detalle}</span>` : "") +
 (precio ? `<br><span style="font-size:13px;font-weight:700;color:#8C1E0E;">${precio}</span>` : "") +
 (x.ubicacion_aproximada ? `<br><span style="font-size:11px;color:#5C5A50;">Ubicación aproximada (centro de la provincia)</span>` : "") +
 (x.id ? `<br><a href="/marketplace/${encodeURIComponent(String(x.id))}/" style="display:inline-block;margin-top:6px;font-size:13px;font-weight:600;color:#8C1E0E;">Ver ficha del lote</a>` : "")
 );
}

export default function MapaProductores({ lotes, onSelect, altura = "420px" }: Props) {
 const containerRef = useRef<HTMLDivElement>(null);
 const mapRef = useRef<L.Map | null>(null);
 const leafletRef = useRef<typeof import("leaflet") | null>(null);
 const capaRef = useRef<L.LayerGroup | null>(null);
 const dibujarRef = useRef<(() => void) | null>(null);
 // Lote pulsado: al filtrar la lista el mapa se redibuja y se vuelve a abrir su ficha.
 const elegidoRef = useRef<string | null>(null);

 useEffect(() => {
 let cancelled = false;

 async function init() {
 if (!containerRef.current) return;

 const L = leafletRef.current ?? await import("leaflet");
 leafletRef.current = L;
 if (cancelled || !containerRef.current) return;
 if (!document.querySelector('link[data-redcafe-leaflet="1"]')) {
 const css = document.createElement("link");
 css.rel = "stylesheet";
 css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
 css.dataset.redcafeLeaflet = "1";
 document.head.appendChild(css);
 }

 if (!mapRef.current) {
 const map = L.map(containerRef.current, {
 center: [-1.8312, -78.1834],
 zoom: 7,
 scrollWheelZoom: false,
 });
 mapRef.current = map;
 capaRef.current = L.layerGroup().addTo(map);

 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
 attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
 maxZoom: 18,
 }).addTo(map);
 map.on("zoomend", () => dibujarRef.current?.());
 }

 const map = mapRef.current;
 const capa = capaRef.current;
 if (!map || !capa) return;

 const puntos = lotes
 .map((l) => ({ l, lat: numero(l.lat), lng: numero(l.lng) }))
 .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
 .map((p) => ({ l: p.l, ll: L.latLng(p.lat, p.lng) }));

 const pin = (l: LoteApi, ll: L.LatLng) => {
 const x = l as unknown as Record<string, unknown>;
 const icon = L.divIcon({ className: "", html: pinHtml(Boolean(x.ejemplo || x.demo)), iconSize: [30, 40], iconAnchor: [15, 39], popupAnchor: [0, -34] });
 const m = L.marker(ll, { icon, title: String(x.finca || x.nombre || "Lote de café"), riseOnHover: true });
 m.bindPopup(popupHtml(l));
 m.on("click", () => { elegidoRef.current = String(x.id ?? ""); onSelect?.(l); });
 if (x.id && String(x.id) === elegidoRef.current) m.on("add", () => setTimeout(() => m.openPopup(), 0));
 return m;
 };

 // Abre en abanico los lotes que siguen juntos al máximo acercamiento.
 const abanico = (grupo: typeof puntos, centro: L.LatLng) => {
 const c = map.latLngToLayerPoint(centro);
 const r = Math.max(46, grupo.length * 11);
 grupo.forEach((p, i) => {
 const ang = (2 * Math.PI * i) / grupo.length - Math.PI / 2;
 const ll = map.layerPointToLatLng(L.point(c.x + r * Math.cos(ang), c.y + r * Math.sin(ang)));
 L.polyline([centro, ll], { color: "#8C1E0E", weight: 1.5, opacity: 0.7, interactive: false }).addTo(capa);
 pin(p.l, ll).addTo(capa);
 });
 };

 const dibujar = () => {
 capa.clearLayers();
 const grupos: { p: L.Point; items: typeof puntos }[] = [];
 puntos.forEach((it) => {
 const p = map.latLngToLayerPoint(it.ll);
 const g = grupos.find((x) => x.p.distanceTo(p) < RADIO_GRUPO);
 if (g) g.items.push(it);
 else grupos.push({ p, items: [it] });
 });
 grupos.forEach((g) => {
 if (g.items.length === 1) {
 pin(g.items[0].l, g.items[0].ll).addTo(capa);
 return;
 }
 const limites = L.latLngBounds(g.items.map((i) => i.ll));
 const centro = limites.getCenter();
 const t = g.items.length > 99 ? 46 : 40;
 const icon = L.divIcon({ className: "", html: grupoHtml(g.items.length), iconSize: [t, t], iconAnchor: [t / 2, t / 2] });
 const m = L.marker(centro, { icon, title: `${g.items.length} lotes en esta zona`, zIndexOffset: 500 }).addTo(capa);
 m.on("click", () => {
 const z = Math.min(map.getBoundsZoom(limites.pad(0.3)), ZOOM_MAX_GRUPO);
 if (z > map.getZoom()) map.fitBounds(limites.pad(0.3), { maxZoom: ZOOM_MAX_GRUPO });
 else {
 dibujar();
 capa.eachLayer((ly) => { if ((ly as L.Marker).getLatLng && (ly as L.Marker).getLatLng().equals(centro)) capa.removeLayer(ly); });
 abanico(g.items, centro);
 }
 });
 });
 };
 dibujarRef.current = dibujar;

 if (puntos.length > 0) {
 map.fitBounds(L.latLngBounds(puntos.map((p) => p.ll)), { padding: [30, 30], maxZoom: 9 });
 }
 dibujar();
 }

 init();
 return () => {
 cancelled = true;
 capaRef.current?.clearLayers();
 };
 }, [lotes, onSelect]);

 useEffect(() => {
 return () => {
 if (mapRef.current) {
 mapRef.current.remove();
 mapRef.current = null;
 capaRef.current = null;
 }
 };
 }, []);

 return <div ref={containerRef} style={{ height: altura, width: "100%" }} />;
}
