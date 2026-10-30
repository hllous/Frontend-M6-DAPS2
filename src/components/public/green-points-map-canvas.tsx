"use client";

import { LatLngBounds, divIcon } from "leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { XIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";

import { Button } from "@/components/ui/button";
import { PUBLIC_GREEN_POINT_WASTE_LABELS, type PublicGreenPoint } from "@/lib/public-green-points";

import styles from "./green-points-map.module.css";

type LocatedPoint = PublicGreenPoint & { lat: number; lng: number };
type GreenPointsMapCanvasProps = {
  points: LocatedPoint[];
  selectedPointId: string | null;
  onSelect: (id: string) => void;
};

const defaultCenter: [number, number] = [-34.58, -58.42];
const pointIcon = divIcon({
  className: styles.marker,
  html: `<span class="${styles.markerPin}" aria-hidden="true"></span>`,
  iconSize: [34, 42],
  iconAnchor: [17, 40],
  popupAnchor: [0, -38],
});

function MapViewportController({ points, selectedPointId }: Pick<GreenPointsMapCanvasProps, "points" | "selectedPointId">) {
  const map = useMap();
  const locationKey = points.map((point) => point.id).join("|");
  const pointsById = useMemo(() => new Map(points.map((point) => [point.id, point])), [points]);

  useEffect(() => {
    const selected = selectedPointId ? pointsById.get(selectedPointId) : undefined;
    if (selected) {
      map.panTo([selected.lat, selected.lng], { animate: false });
      return;
    }
    if (points.length === 1) {
      const point = points[0]!;
      map.setView([point.lat, point.lng], 14);
      return;
    }
    if (points.length > 1) {
      map.fitBounds(new LatLngBounds(points.map((point) => [point.lat, point.lng])), { padding: [24, 24], maxZoom: 14 });
    }
  }, [locationKey, map, points, pointsById, selectedPointId]);

  return null;
}

function AccessibleGreenPointMarker({
  point,
  selected,
  onSelect,
}: {
  point: LocatedPoint;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);
  const location = point.address || "Dirección no informada";

  useEffect(() => {
    const marker = markerRef.current;
    const element = marker?.getElement();
    if (!marker || !element) return;
    element.setAttribute("aria-label", `Punto verde: ${point.name}`);
    element.setAttribute("aria-pressed", String(selected));
    if (selected) marker.openPopup();
  }, [point.name, selected]);

  return (
    <Marker
      ref={markerRef}
      position={[point.lat, point.lng]}
      title={`${point.name} · ${location}`}
      alt={`Punto verde: ${point.name}`}
      icon={pointIcon}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(point.id) }}
    >
      <Popup closeButton={false}>
        <div className={styles.popupHeader}>
          <strong>{point.name}</strong>
          <GreenPointPopupCloseButton pointName={point.name} />
        </div>
        <span className={styles.popupDescription}>{location}</span>
        <span className={styles.popupDescription}>
          {point.wasteTypes.map((wasteType) => PUBLIC_GREEN_POINT_WASTE_LABELS[wasteType]).join(", ")}
        </span>
      </Popup>
    </Marker>
  );
}

function GreenPointPopupCloseButton({ pointName }: { pointName: string }) {
  const map = useMap();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`Cerrar información de ${pointName}`}
      onClick={() => map.closePopup()}
    >
      <XIcon aria-hidden="true" />
    </Button>
  );
}

export function GreenPointsMapCanvas({ points, selectedPointId, onSelect }: GreenPointsMapCanvasProps) {
  return (
    <div className={styles.canvas}>
      <MapContainer
        center={defaultCenter}
        zoom={12}
        zoomControl={false}
        fadeAnimation={false}
        scrollWheelZoom
        className={styles.map}
        aria-label="Mapa de puntos verdes"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="topright" zoomInTitle="Acercar" zoomOutTitle="Alejar" />
        <MapViewportController points={points} selectedPointId={selectedPointId} />
        {points.map((point) => (
          <AccessibleGreenPointMarker
            key={point.id}
            point={point}
            selected={point.id === selectedPointId}
            onSelect={onSelect}
          />
        ))}
      </MapContainer>
    </div>
  );
}
