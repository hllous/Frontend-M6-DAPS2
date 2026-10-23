"use client";

import { divIcon, DomEvent, latLng } from "leaflet";
import { Crosshair } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Button } from "./button";
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
function MapActions({ point, accuracy, onPick }: LocationPickerMapProps) {
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
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], accuracy === undefined ? Math.max(map.getZoom(), 15) : 17, { animate: false });
  }, [map, point, accuracy]);
  return <div ref={controls} className="absolute inset-x-2 bottom-6 z-[400] flex flex-wrap justify-center gap-2">
    <Button type="button" variant="secondary" onClick={() => onPick(mapPoint(map.getCenter()))}>Marcar centro del mapa</Button>
    <Button type="button" variant="secondary" aria-label="Acercar mapa" onClick={() => map.zoomIn()}>+</Button>
    <Button type="button" variant="secondary" aria-label="Alejar mapa" onClick={() => map.zoomOut()}>−</Button>
  </div>;
}
export function LocationPickerMap({ point, accuracy, onPick }: LocationPickerMapProps) {
  const [tileFailed, setTileFailed] = useState(false);
  return <div className="flex min-h-0 flex-1 flex-col gap-2">
    <div className="relative isolate min-h-64 flex-1">
      <MapContainer center={point ?? [-34.58, -58.42]} zoom={point ? 15 : 12} zoomControl={false} zoomAnimation={false} fadeAnimation={false} markerZoomAnimation={false} keyboard scrollWheelZoom className="absolute inset-0 size-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' eventHandlers={{tileerror: () => setTileFailed(true)}} />
        <MapActions point={point} accuracy={accuracy} onPick={onPick} />
        {point && <Marker position={[point.lat, point.lng]} icon={pin} draggable title="Ubicación marcada" eventHandlers={{dragend: (event) => onPick(mapPoint(event.target.getLatLng()))}} />}
        {point && accuracy !== undefined && <Circle center={[point.lat, point.lng]} radius={accuracy} pathOptions={gpsAccuracyPathOptions} />}
      </MapContainer>
      <Crosshair aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-[400] size-7 -translate-x-1/2 -translate-y-1/2 text-foreground drop-shadow-sm" />
    </div>
    {tileFailed && <p role="status" aria-live="polite">Sin conexión al mapa</p>}
  </div>;
}
