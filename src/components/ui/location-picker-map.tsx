"use client";

import { divIcon, DomEvent, latLng } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Button } from "./button";
import styles from "./location-picker-map.module.css";
import type { LocationPoint } from "./location-picker";

export type LocationPickerMapProps = {
  point: LocationPoint | null;
  accuracy?: number;
  onPick: (point: LocationPoint) => void;
};
const pin = divIcon({
  className: "location-picker-pin",
  html: '<span class="block size-6 rounded-full border-4 border-background bg-primary shadow-md"></span>',
  iconSize: [24, 24], iconAnchor: [12, 12],
});
const gpsAccuracyPathOptions = {
  color: "var(--color-action)",
  fillColor: "var(--color-info-fill)",
  fillOpacity: 0.5,
  weight: 2,
};
function mapPoint(point: LocationPoint): LocationPoint {
  if (point.lng >= -180 && point.lng <= 180) return { lat: point.lat, lng: point.lng };
  const wrapped = latLng(point.lat, point.lng).wrap();
  return { lat: wrapped.lat, lng: wrapped.lng };
}
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
const MOVE_DURATION_MS = 600;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/**
 * Pin, accuracy circle and map centre travel together from the previous point to the new one,
 * so a short hop (Corrientes 348 → 349) glides instead of the pin jumping ahead of the pan.
 */
function PointLayer({ point, accuracy, onPick }: LocationPickerMapProps) {
  const map = useMap();
  const [shown, setShown] = useState<LocationPoint | null>(point);
  const shownRef = useRef<LocationPoint | null>(point);
  const show = (next: LocationPoint) => { shownRef.current = next; setShown(next); };
  useEffect(() => {
    if (!point) return;
    const zoom = accuracy === undefined ? Math.max(map.getZoom(), 15) : 17;
    const zoomChanges = map.getZoom() !== zoom;
    const reduced = prefersReducedMotion();
    const markerFrom = shownRef.current ?? point;
    const centerFrom = map.getCenter();
    if (zoomChanges) map.setView([point.lat, point.lng], zoom, { animate: !reduced, duration: 0.6, easeLinearity: 0.2 });
    const start = performance.now();
    let frame = 0;
    const step = () => {
      const t = reduced ? 1 : Math.min(Math.max((performance.now() - start) / MOVE_DURATION_MS, 0), 1);
      const eased = easeInOut(t);
      const at = (from: LocationPoint) => ({ lat: from.lat + (point.lat - from.lat) * eased, lng: from.lng + (point.lng - from.lng) * eased });
      show(t === 1 ? point : at(markerFrom));
      if (!zoomChanges) {
        const center = t === 1 ? point : at(centerFrom);
        map.setView([center.lat, center.lng], zoom, { animate: false });
      }
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [map, point, accuracy]);
  if (!point || !shown) return null;
  return <>
    <Marker position={[shown.lat, shown.lng]} icon={pin} draggable title="Ubicación marcada" eventHandlers={{dragend: (event) => {
      const dropped = mapPoint(event.target.getLatLng());
      show(dropped);
      onPick(dropped);
    }}} />
    {accuracy !== undefined && <Circle center={[shown.lat, shown.lng]} radius={accuracy} pathOptions={gpsAccuracyPathOptions} />}
  </>;
}
function MapActions({ onPick }: Pick<LocationPickerMapProps, "onPick">) {
  const map = useMap();
  const controls = useRef<HTMLDivElement>(null);
  useMapEvents({ click: ({ latlng }) => onPick(mapPoint(latlng)) });
  useEffect(() => {
    if (controls.current) DomEvent.disableClickPropagation(controls.current);
  }, []);
  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", "Mapa de ubicación. Use las flechas para mover y más o menos para acercar o alejar.");
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return <div ref={controls} className="absolute inset-x-2 bottom-6 z-[400] flex flex-wrap justify-center gap-2">
    <Button type="button" variant="secondary" aria-label="Acercar mapa" onClick={() => map.zoomIn()}>+</Button>
    <Button type="button" variant="secondary" aria-label="Alejar mapa" onClick={() => map.zoomOut()}>−</Button>
  </div>;
}
export function LocationPickerMap({ point, accuracy, onPick }: LocationPickerMapProps) {
  const [tileFailed, setTileFailed] = useState(false);
  return <div className="flex min-h-0 flex-1 flex-col gap-2">
    <div className="relative isolate min-h-64 flex-1">
      <MapContainer center={point ?? [-34.58, -58.42]} zoom={point ? 15 : 12} zoomControl={false} zoomAnimation={!prefersReducedMotion()} keyboard scrollWheelZoom className={`${styles.map} absolute inset-0 size-full`}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' eventHandlers={{tileerror: () => setTileFailed(true)}} />
        <MapActions onPick={onPick} />
        <PointLayer point={point} accuracy={accuracy} onPick={onPick} />
      </MapContainer>
    </div>
    {tileFailed && <p role="status" aria-live="polite">Sin conexión al mapa</p>}
  </div>;
}
