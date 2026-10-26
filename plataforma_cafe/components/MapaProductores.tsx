"use client";

import { useEffect, useRef } from "react";
import type { Lote as LoteApi } from "@/lib/api";

interface Props {
 lotes: LoteApi[];
 onSelect?: (lote: LoteApi) => void;
 altura?: string;
}

export default function MapaProductores({ lotes, onSelect, altura = "420px" }: Props) {
 const containerRef = useRef<HTMLDivElement>(null);
 const mapRef = useRef<L.Map | null>(null);
 const leafletRef = useRef<typeof import("leaflet") | null>(null);
 const markersRef = useRef<L.Marker[]>([]);

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

 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
 attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
 maxZoom: 18,
 }).addTo(map);
 }

 const map = mapRef.current;
 if (!map) return;
 markersRef.current.forEach((m) => m.remove());
 markersRef.current = [];
 markersRef.current = lotes
 .filter((l) => typeof l.lat === "number" && typeof l.lng === "number")
 .map((l) => {
 // Los lotes de ejemplo se distinguen a simple vista: tono apagado y borde
 // discontinuo. Un comprador no debe confundirlos con una finca real.
 const esEjemplo = Boolean(l.ejemplo);
 const fondo = esEjemplo ? "#7A7768" : "#3B1A0C";
 const borde = esEjemplo ? "2px dashed #E4E1D9" : "2px solid #A94E17";
 const icon = L.divIcon({
 className: "",
 html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:${fondo};border:${borde};color:#fffaf2;font-size:15px;opacity:${esEjemplo ? ".78" : "1"};box-shadow:0 3px 8px rgba(36,23,17,.3);">${l.emoji}</div>`,
 iconSize: [34, 34],
 iconAnchor: [17, 17],
 });
 const marker = L.marker([l.lat!, l.lng!], { icon }).addTo(map);
 marker.bindPopup(
 (esEjemplo ? `<span style="display:inline-block;margin-bottom:4px;padding:2px 7px;background:#F3F1EA;color:#5C5A50;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Ejemplo · no es una finca real</span><br>` : "") +
 `<strong style="font-family:Georgia,serif;color:#14140F;">${l.finca}</strong><br>` +
 `<span style="font-size:12px;color:#5C5A50;">${l.provincia} · ${l.variedad} · ${l.proceso}</span><br>` +
 `<span style="font-size:13px;font-weight:700;color:#A94E17;">$${l.precioSaco}/saco · ${l.score} pts</span>`
 );
 marker.on("click", () => onSelect?.(l));
 return marker;
 });

 if (markersRef.current.length > 0) {
 map.fitBounds(L.latLngBounds(markersRef.current.map((m) => m.getLatLng())));
 }
 }

 init();
 return () => {
 cancelled = true;
 markersRef.current.forEach((m) => m.remove());
 markersRef.current = [];
 };
 }, [lotes, onSelect]);

 useEffect(() => {
 return () => {
 if (mapRef.current) {
 mapRef.current.remove();
 mapRef.current = null;
 }
 };
 }, []);

 return <div ref={containerRef} style={{ height: altura, width: "100%" }} />;
}
