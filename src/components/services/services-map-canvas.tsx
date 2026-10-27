"use client";

import { LatLngBounds, divIcon } from "leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";

import type { Service } from "@/lib/services";
import type { MapCoordinate } from "@/lib/operational-zones";
import { summarizeServiceZones, type ServiceMapLocation } from "@/lib/services-map";

import { SERVICE_MODE_LABEL } from "./service-ui-labels";
import styles from "./services-map.module.css";

const defaultCenter: MapCoordinate = [-34.58, -58.42];

type ServicesMapCanvasProps = {
  services: Service[];
  serviceOrdinals: ReadonlyMap<string, number>;
  locations: ServiceMapLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
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
  const locationLabel = location.locationLabel ?? "Ubicación";
  const greenSpace = isGreenSpaceService(service);
  const accessibleLabel = `Parada ${markerNumber}${greenSpace ? " en espacio verde" : ""}: ${service.title} (${location.zones
    .map((zone) => zone.name)
    .join(", ")})`;

  useEffect(() => {
    const element = markerRef.current?.getElement();
    if (!element) return;

    element.setAttribute("aria-label", accessibleLabel);
    element.setAttribute("aria-pressed", String(selected));
    element.setAttribute("data-service-id", service.id);

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
      zIndexOffset={selected ? 1000 : 0}
      title={`${service.title} · ${locationLabel}`}
      alt={accessibleLabel}
      icon={serviceMarkerIcon(markerNumber, selected, greenSpace)}
      eventHandlers={{ click: () => onSelect(service.id) }}
    >
      <Popup>
        <strong>{service.title}</strong>
        <span className={styles.popupDescription}>
          {service.serviceTypeName} · {SERVICE_MODE_LABEL[service.mode]}
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
    let frame = 0;
    let workspaceLayoutAnimating = false;
    let lastWidth = container.clientWidth;
    let lastHeight = container.clientHeight;

    const scheduleInvalidate = (force = false) => {
      if (workspaceLayoutAnimating) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!force && width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, debounceMoveend: true });
      });
    };
    const beginWorkspaceLayout = () => {
      workspaceLayoutAnimating = true;
      window.cancelAnimationFrame(frame);
    };
    const settleWorkspaceLayout = () => {
      workspaceLayoutAnimating = false;
      scheduleInvalidate(true);
    };

    const observer = new ResizeObserver(() => scheduleInvalidate());
    observer.observe(container);
    window.addEventListener("services-workspace-layout-changing", beginWorkspaceLayout);
    window.addEventListener("services-workspace-layout-settled", settleWorkspaceLayout);

    return () => {
      observer.disconnect();
      window.removeEventListener("services-workspace-layout-changing", beginWorkspaceLayout);
      window.removeEventListener("services-workspace-layout-settled", settleWorkspaceLayout);
      window.cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}

function MapViewportController({ locations }: { locations: ServiceMapLocation[] }) {
  const map = useMap();
  const hasInitialFit = useRef(false);
  const hasUserMovedMap = useRef(false);

  useEffect(() => {
    const points = locations.flatMap((location) => [
      ...(location.coordinates ? [location.coordinates] : []),
      ...(location.locationType === "route"
        ? location.zones.flatMap((zone) => zone.coordinates.flat(2))
        : []),
    ]);

    const fitInitialResult = () => {
      if (hasInitialFit.current || hasUserMovedMap.current || points.length === 0) return;
      const size = map.getSize();
      if (size.x <= 0 || size.y <= 0) return;

      const bounds = new LatLngBounds(points);
      if (!bounds.isValid()) return;
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
      hasInitialFit.current = true;
    };
    const markUserMovement = () => {
      hasUserMovedMap.current = true;
    };

    map.on("resize", fitInitialResult);
    map.on("dragstart", markUserMovement);
    map.on("zoomstart", markUserMovement);
    fitInitialResult();

    return () => {
      map.off("resize", fitInitialResult);
      map.off("dragstart", markUserMovement);
      map.off("zoomstart", markUserMovement);
    };
  }, [locations, map]);

  return null;
}

function MapSelectionController({
  selectedId,
  locations,
}: {
  selectedId: string | null;
  locations: ServiceMapLocation[];
}) {
  const map = useMap();
  const lastPannedServiceId = useRef<string | null>(null);
  const selectedLocation = locations.find((location) => location.serviceId === selectedId);

  useEffect(() => {
    if (!selectedId) {
      lastPannedServiceId.current = null;
      return;
    }
    if (lastPannedServiceId.current === selectedId || !selectedLocation?.coordinates) return;

    lastPannedServiceId.current = selectedId;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    map.panTo(selectedLocation.coordinates, {
      animate: !reducedMotion,
      duration: reducedMotion ? 0 : 0.28,
    });
  }, [map, selectedId, selectedLocation]);

  return null;
}

export function ServicesMapCanvas({
  services,
  serviceOrdinals,
  locations,
  selectedId,
  onSelect,
  compact = false,
}: ServicesMapCanvasProps) {
  const locationsByServiceId = useMemo(
    () => new Map(locations.map((location) => [location.serviceId, location])),
    [locations],
  );
  // Every zone with a service gets its outline, so neighbouring barrios stay distinguishable.
  const serviceZones = useMemo(() => summarizeServiceZones(locations), [locations]);
  const visibleMarkers = services.flatMap((service) => {
    const location = locationsByServiceId.get(service.id);
    const markerNumber = serviceOrdinals.get(service.id);
    if (!location || !location.coordinates || markerNumber === undefined) return [];

    return [{ service, location, markerNumber }];
  });

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      scrollWheelZoom
      className={compact ? `${styles.map} ${styles.mapCompact}` : styles.map}
      aria-label="Mapa de servicios"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapResizeController />
      <MapViewportController locations={locations} />
      <MapSelectionController selectedId={selectedId} locations={locations} />

      {serviceZones.flatMap(({ zone, serviceIds }) =>
        zone.coordinates.map((polygon, partIndex) => (
          <Polygon
            key={`${zone.zoneId}-${partIndex}`}
            positions={polygon}
            pathOptions={serviceZonePathOptions(serviceIds.includes(selectedId ?? ""))}
          >
            <Tooltip sticky>
              <strong>{zone.name}</strong>
              <br />
              {serviceIds.length} servicio{serviceIds.length === 1 ? "" : "s"} en la zona
            </Tooltip>
          </Polygon>
        )),
      )}

      {visibleMarkers.map(({ service, location, markerNumber }) => {
        return (
          <AccessibleServiceMarker
            key={service.id}
            service={service}
            location={location}
            markerNumber={markerNumber}
            selected={service.id === selectedId}
            onSelect={onSelect}
          />
        );
      })}
    </MapContainer>
  );
}
