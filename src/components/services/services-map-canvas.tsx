"use client";

import { LatLngBounds, divIcon } from "leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";

import type { Service } from "@/lib/services";
import type { MapCoordinate } from "@/lib/operational-zones";
import { summarizeServiceZones, type ServiceMapLocation } from "@/lib/services-map";

import styles from "./services-map.module.css";

const defaultCenter: MapCoordinate = [-34.58, -58.42];

type ServicesMapCanvasProps = {
  services: Service[];
  locations: ServiceMapLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterFingerprint?: string;
};

// Paths of lucide's TreeDeciduous: divIcon takes an HTML string, not a React node.
const greenSpaceBadge =
  `<span class="${styles.greenSpaceBadge}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z"/><path d="M12 19v3"/></svg></span>`;

function isGreenSpaceService(service: Service) {
  return service.targetType === "GREEN_SPACE";
}

function serviceMarkerIcon(markerNumber: number, selected: boolean, greenSpace: boolean) {
  const classes = [
    styles.serviceMarker,
    greenSpace ? styles.serviceMarkerGreenSpace : "",
    selected ? styles.serviceMarkerSelected : "",
  ].join(" ");

  return divIcon({
    className: styles.marker,
    html: `<span class="${classes}"><span>${markerNumber}</span></span>${greenSpace ? greenSpaceBadge : ""}`,
    iconSize: [42, 48],
    iconAnchor: [21, 46],
    popupAnchor: [0, -44],
  });
}

type AccessibleServiceMarkerProps = {
  service: Service;
  location: ServiceMapLocation;
  markerNumber: number;
  selected: boolean;
  onSelect: (id: string) => void;
};

function AccessibleServiceMarker({
  service,
  location,
  markerNumber,
  selected,
  onSelect,
}: AccessibleServiceMarkerProps) {
  const markerRef = useRef<LeafletMarker | null>(null);
  const locationLabel = location.locationLabel ?? "Ubicación resuelta";
  const greenSpace = isGreenSpaceService(service);
  const accessibleLabel = `Parada ${markerNumber}${greenSpace ? " en espacio verde" : ""}: ${service.id} — ${service.title} (${location.zones
    .map((zone) => zone.name)
    .join(", ")})`;

  useEffect(() => {
    const element = markerRef.current?.getElement();
    if (!element) return;

    element.setAttribute("aria-label", accessibleLabel);
    element.setAttribute("aria-pressed", String(selected));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      onSelect(service.id);
    };

    element.addEventListener("keydown", handleKeyDown);
    return () => element.removeEventListener("keydown", handleKeyDown);
  }, [accessibleLabel, onSelect, selected, service.id]);

  return (
    <Marker
      ref={markerRef}
      position={location.coordinates!}
      title={`${service.id} · ${service.title} · ${locationLabel}`}
      alt={accessibleLabel}
      icon={serviceMarkerIcon(markerNumber, selected, greenSpace)}
      eventHandlers={{ click: () => onSelect(service.id) }}
    >
      <Popup>
        <strong>{service.id} · {service.title}</strong>
        <span className={styles.popupDescription}>
          {service.serviceTypeName} · {service.mode === "ROUTE" ? "Recorrido" : "Punto"}
        </span>
        <span className={styles.popupDescription}>
          {greenSpace ? `Espacio verde · ${locationLabel}` : locationLabel}
        </span>
      </Popup>
    </Marker>
  );
}

function serviceZonePathOptions(selected: boolean) {
  return {
    color: selected ? "var(--color-accent)" : "var(--color-action)",
    fillColor: selected ? "var(--color-accent)" : "var(--color-info-fill)",
    fillOpacity: selected ? 0.3 : 0.16,
    weight: selected ? 3 : 2,
  };
}

function MapResizeController() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    // El contenedor del mapa vive dentro de paneles redimensionables (react-resizable-panels)
    // y de un layout con flex/grid. Leaflet no detecta esos cambios de tamaño por sí solo:
    // si no se le avisa con invalidateSize(), sigue usando las dimensiones con las que
    // midió por última vez, lo que rompe el renderizado al hacer zoom y limita el arrastre
    // a la zona que sí alcanzó a medir correctamente.
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [map]);

  return null;
}

function MapViewportController({
  locations,
  filterFingerprint,
}: {
  locations: ServiceMapLocation[];
  filterFingerprint?: string;
}) {
  const map = useMap();

  useEffect(() => {
    const points = locations.flatMap((location) => [
      ...(location.coordinates ? [location.coordinates] : []),
      ...(location.locationType === "route"
        ? location.zones.flatMap((zone) => zone.coordinates.flat())
        : []),
    ]);

    if (points.length === 0) return;

    const bounds = new LatLngBounds(points);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
    }
  }, [filterFingerprint, locations, map]);

  return null;
}

export function ServicesMapCanvas({
  services,
  locations,
  selectedId,
  onSelect,
  filterFingerprint,
}: ServicesMapCanvasProps) {
  const servicesById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  // Polygons stay limited to zones a route crosses; the count covers every service in the zone.
  const routeZones = useMemo(
    () => summarizeServiceZones(locations).filter((summary) => summary.hasRoute),
    [locations],
  );
  const visibleMarkers = locations.flatMap((location) => {
    const service = servicesById.get(location.serviceId);
    if (!service || !location.coordinates) return [];

    return [{ service, location }];
  });

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      scrollWheelZoom
      className={styles.map}
      aria-label="Mapa geográfico de servicios operativos"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapResizeController />
      <MapViewportController locations={locations} filterFingerprint={filterFingerprint} />

      {routeZones.map(({ zone, serviceIds }) => (
        <Polygon
          key={zone.zoneId}
          positions={zone.coordinates}
          pathOptions={serviceZonePathOptions(serviceIds.includes(selectedId ?? ""))}
        >
          <Tooltip sticky>
            <strong>{zone.code}</strong> · {zone.name}
            <br />
            {serviceIds.length} servicio{serviceIds.length === 1 ? "" : "s"} en la zona
          </Tooltip>
        </Polygon>
      ))}

      {visibleMarkers.map(({ service, location }, index) => {
        return (
          <AccessibleServiceMarker
            key={service.id}
            service={service}
            location={location}
            markerNumber={index + 1}
            selected={service.id === selectedId}
            onSelect={onSelect}
          />
        );
      })}
    </MapContainer>
  );
}
