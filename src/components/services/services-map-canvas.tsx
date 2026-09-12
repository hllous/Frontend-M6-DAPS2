"use client";

import { LatLngBounds, divIcon } from "leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";

import type { Service } from "@/lib/services";
import type { MapCoordinate } from "@/lib/operational-zones";
import type { ServiceMapLocation, ServiceMapZone } from "@/lib/services-map";

import styles from "./services-map.module.css";

const defaultCenter: MapCoordinate = [-34.58, -58.42];

type ServicesMapCanvasProps = {
  services: Service[];
  locations: ServiceMapLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterFingerprint?: string;
};

function serviceMarkerIcon(markerNumber: number, selected: boolean) {
  return divIcon({
    className: styles.marker,
    html: `<span class="${styles.serviceMarker} ${selected ? styles.serviceMarkerSelected : ""}"><span>${markerNumber}</span></span>`,
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
  const accessibleLabel = `Parada ${markerNumber}: ${service.id} — ${service.title} (${location.zones
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
      icon={serviceMarkerIcon(markerNumber, selected)}
      eventHandlers={{ click: () => onSelect(service.id) }}
    >
      <Popup>
        <strong>{service.id} · {service.title}</strong>
        <span className={styles.popupDescription}>
          {service.serviceTypeName} · {service.mode === "ROUTE" ? "Recorrido" : "Punto"}
        </span>
        <span className={styles.popupDescription}>{locationLabel}</span>
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

function uniqueRouteZones(locations: ServiceMapLocation[]) {
  const zonesById = new Map<string, { zone: ServiceMapZone; serviceIds: string[] }>();

  for (const location of locations) {
    if (location.locationType !== "route") continue;

    for (const zone of location.zones) {
      const current = zonesById.get(zone.zoneId);
      if (current) {
        if (!current.serviceIds.includes(location.serviceId)) current.serviceIds.push(location.serviceId);
      } else {
        zonesById.set(zone.zoneId, { zone, serviceIds: [location.serviceId] });
      }
    }
  }

  return [...zonesById.values()];
}

export function ServicesMapCanvas({
  services,
  locations,
  selectedId,
  onSelect,
  filterFingerprint,
}: ServicesMapCanvasProps) {
  const servicesById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const routeZones = useMemo(() => uniqueRouteZones(locations), [locations]);
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
