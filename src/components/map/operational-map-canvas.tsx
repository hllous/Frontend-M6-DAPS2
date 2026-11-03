"use client";

import L, { divIcon } from "leaflet";
import "leaflet.markercluster";
import { Fragment, useEffect, useMemo, useState } from "react";
import MarkerClusterGroupComponent from "react-leaflet-cluster";
import { MapContainer, Marker, Pane, Polygon, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";

import { COVERAGE_BAND_PATH_OPTIONS, type CoverageZoneOverlay } from "@/lib/map-coverage";
import type { OperationalZone, RouteStopOverlay, TodayZoneCoverage } from "@/lib/operational-zones";

import { MapBoundaryControl, MapBoundaryLayers, useMapBoundaries } from "./map-boundaries";
import styles from "./operational-map-canvas.module.css";

type MarkerCluster = L.MarkerCluster;

export type OperationalMapView = "inventory" | "zones" | "coverage" | "route" | "today";

type OperationalMapMarker = {
  id: string;
  layer: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  markerSymbol: string;
  markerTone: "info" | "success" | "warning" | "danger" | "action";
};

type OperationalMapCanvasProps = {
  view: OperationalMapView;
  markers: OperationalMapMarker[];
  zones?: OperationalZone[];
  routeStops?: RouteStopOverlay[];
  todayZones?: TodayZoneCoverage[];
  coverageZones?: CoverageZoneOverlay[];
  selectedStopSequence?: number | null;
  onSelectStop?: (sequence: number) => void;
  selectedZoneCode?: string | null;
  onSelectZone?: (code: string) => void;
  selectedMarkerKey?: string | null;
  onSelectMarker?: (marker: OperationalMapMarker) => void;
};

const markerKey = (marker: OperationalMapMarker) => `${marker.layer}-${marker.id}`;

// Centra el mapa en el marcador seleccionado con zoom suficiente para sacarlo del cluster.
function FocusMarker({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap();

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 17));
  }, [map, lat, lng]);

  return null;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener?.("change", update);
    if (!mediaQuery.addEventListener) mediaQuery.addListener?.(update);

    return () => {
      mediaQuery.removeEventListener?.("change", update);
      if (!mediaQuery.removeEventListener) mediaQuery.removeListener?.(update);
    };
  }, []);

  return prefersReducedMotion;
}

const todayStatusPathOptions = {
  PENDING: { color: "var(--color-info)", fillColor: "var(--color-info-fill)" },
  SERVICED: { color: "var(--color-success)", fillColor: "var(--color-success-fill)" },
  PARTIAL: { color: "var(--color-warning)", fillColor: "var(--color-warning-fill)" },
  NOT_SERVICED: { color: "var(--color-danger)", fillColor: "var(--color-danger-fill)" },
} as const;

function routeStopIcon(sequence: number, selected: boolean) {
  return divIcon({
    className: styles.marker,
    html: `<span class="${styles.routeMarkerPin} ${selected ? styles.routeMarkerSelected : ""}"><span>${sequence}</span></span>`,
    iconSize: [42, 48],
    iconAnchor: [21, 46],
    popupAnchor: [0, -44],
  });
}

function clusterAccessibleLabel(count: number) {
  return `${count} elementos; acerque el mapa`;
}

function inventoryClusterIcon(cluster: MarkerCluster) {
  const count = cluster.getChildCount();
  const label = clusterAccessibleLabel(count);

  return divIcon({
    className: styles.markerCluster,
    html: `<span class="${styles.markerClusterCount}" role="img" aria-label="${label}">${count}</span>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

function ClusterAccessibility() {
  const map = useMap();

  useEffect(() => {
    const handleClusterKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    };

    const clusterElements = () => map.getContainer().querySelectorAll<HTMLElement>(`.${styles.markerCluster}`);
    const updateClusterNames = () => {
      clusterElements().forEach((element) => {
        const count = Number(element.querySelector(`.${styles.markerClusterCount}`)?.textContent);
        if (!Number.isFinite(count) || count < 1) return;

        const label = clusterAccessibleLabel(count);
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");
        element.setAttribute("aria-label", label);
        element.setAttribute("title", label);
        element.addEventListener("keydown", handleClusterKeyDown);
      });
    };

    map.on("zoomend moveend", updateClusterNames);
    const observer = new MutationObserver(updateClusterNames);
    observer.observe(map.getContainer(), { childList: true, subtree: true });
    updateClusterNames();

    return () => {
      map.off("zoomend moveend", updateClusterNames);
      observer.disconnect();
      clusterElements().forEach((element) => element.removeEventListener("keydown", handleClusterKeyDown));
    };
  }, [map]);

  return null;
}

function zonePathOptions(selected: boolean) {
  return {
    color: selected ? "var(--color-accent)" : "var(--color-action)",
    fillColor: selected ? "var(--color-accent)" : "var(--color-info-fill)",
    fillOpacity: selected ? 0.3 : 0.2,
    weight: selected ? 3 : 2,
  };
}

function coveragePathOptions(zone: CoverageZoneOverlay, selected: boolean) {
  const bandPath = COVERAGE_BAND_PATH_OPTIONS[zone.band];
  return {
    ...bandPath,
    color: selected ? "var(--color-accent)" : bandPath.color,
    weight: selected ? 3 : 2,
  };
}

export function OperationalMapCanvas({
  view,
  markers,
  zones = [],
  routeStops = [],
  todayZones = [],
  coverageZones = [],
  selectedStopSequence = null,
  onSelectStop,
  selectedZoneCode = null,
  onSelectZone,
  selectedMarkerKey = null,
  onSelectMarker,
}: OperationalMapCanvasProps) {
  const boundaries = useMapBoundaries();
  // La visibilidad de comunas y barrios también filtra los marcadores (#720). Sin filtro se devuelve `markers`
  // tal cual para que el clúster reciba una identidad estable; el seleccionado nunca se oculta.
  const { filterActive, isPointVisible } = boundaries;
  const visibleMarkers = useMemo(
    () =>
      filterActive
        ? markers.filter((marker) => markerKey(marker) === selectedMarkerKey || isPointVisible([marker.lat, marker.lng]))
        : markers,
    [markers, filterActive, isPointVisible, selectedMarkerKey],
  );
  const selectedMarker = visibleMarkers.find((marker) => markerKey(marker) === selectedMarkerKey);
  const prefersReducedMotion = usePrefersReducedMotion();

  const mapLabel =
    view === "zones"
      ? "Mapa de zonas"
      : view === "coverage"
        ? "Mapa de cobertura"
      : view === "route"
        ? "Mapa del recorrido"
        : view === "today"
          ? "Mapa de hoy"
          : "Mapa de inventario";

  return (
    <div className={styles.canvas}>
      <MapContainer
        center={[-34.58, -58.42]}
        zoom={12}
        scrollWheelZoom
        className={styles.map}
        aria-label={mapLabel}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundaryLayers state={boundaries} />

        {view === "inventory" ? (
          <>
            <Pane name="markerClusterPane" style={{ zIndex: 610 }} />
            <MarkerClusterGroupComponent
              clusterPane="markerClusterPane"
              iconCreateFunction={inventoryClusterIcon}
              maxClusterRadius={64}
              zoomToBoundsOnClick
              spiderfyOnMaxZoom
              showCoverageOnHover={false}
              animate={!prefersReducedMotion}
            >
              {visibleMarkers.map((marker) => (
                <Marker
                  key={markerKey(marker)}
                  position={[marker.lat, marker.lng]}
                  title={`${marker.title}. ${marker.description}`}
                  alt={`${marker.title}. ${marker.description}`}
                  icon={divIcon({
                    className: styles.marker,
                    html: `<span class="${styles.markerPin} ${styles[marker.markerTone]} ${marker === selectedMarker ? styles.markerSelected : ""}"><span>${marker.markerSymbol}</span></span>`,
                    iconSize: [36, 42],
                    iconAnchor: [18, 40],
                    popupAnchor: [0, -38],
                  })}
                  eventHandlers={onSelectMarker ? { click: () => onSelectMarker(marker) } : undefined}
                >
                  <Popup>
                    <strong>{marker.title}</strong>
                    <span className={styles.popupDescription}>{marker.description}</span>
                  </Popup>
                </Marker>
              ))}
              <ClusterAccessibility />
            </MarkerClusterGroupComponent>
            <FocusMarker lat={selectedMarker?.lat} lng={selectedMarker?.lng} />
          </>
        ) : null}

        {view === "zones"
          ? zones.flatMap((zone) =>
              zone.coordinates.map((polygon, partIndex) => (
                <Polygon
                  key={`${zone.code}-${partIndex}`}
                  positions={polygon}
                  pathOptions={zonePathOptions(selectedZoneCode === zone.code)}
                  eventHandlers={onSelectZone ? { click: () => onSelectZone(zone.code) } : undefined}
                >
                  <Tooltip sticky>
                    <strong>{zone.name}</strong>
                  </Tooltip>
                </Polygon>
              )),
            )
          : null}

        {view === "route"
          ? routeStops.map((stop) => (
              <Fragment key={stop.id}>
                {stop.geometry
                  ? stop.geometry.coordinates.map((polygon, partIndex) => (
                      <Polygon
                        key={`${stop.id}-${partIndex}`}
                        positions={polygon}
                        pathOptions={zonePathOptions(selectedStopSequence === stop.sequence)}
                        eventHandlers={onSelectStop ? { click: () => onSelectStop(stop.sequence) } : undefined}
                      >
                        <Tooltip sticky>
                          <strong>Parada {stop.sequence}</strong> · {stop.zoneName}
                        </Tooltip>
                      </Polygon>
                    ))
                  : null}
                {stop.geometry ? (
                  <Marker
                    position={stop.geometry.center}
                    title={`Parada ${stop.sequence}: ${stop.zoneName}`}
                    alt={`Parada ${stop.sequence}: ${stop.zoneName}`}
                    icon={routeStopIcon(stop.sequence, selectedStopSequence === stop.sequence)}
                    eventHandlers={onSelectStop ? { click: () => onSelectStop(stop.sequence) } : undefined}
                  >
                    <Popup>
                      <strong>Parada {stop.sequence} · {stop.zoneName}</strong>
                      <span className={styles.popupDescription}>
                        {stop.estimatedDurationMin !== null
                          ? `${stop.estimatedDurationMin} min`
                          : "—"}
                      </span>
                    </Popup>
                  </Marker>
                ) : null}
              </Fragment>
            ))
          : null}

        {view === "today"
          ? todayZones.map((zone) =>
              zone.geometry ? (
                zone.geometry.coordinates.map((polygon, partIndex) => (
                  <Polygon
                    key={`${zone.zoneId}-${partIndex}`}
                    positions={polygon}
                    pathOptions={todayStatusPathOptions[zone.status]}
                  >
                    <Tooltip sticky>
                      <strong>{zone.zoneName}</strong> · {zone.status}
                    </Tooltip>
                  </Polygon>
                ))
              ) : null,
            )
          : null}

        {view === "coverage"
          ? coverageZones.flatMap((zone) =>
              zone.geometry.coordinates.map((polygon, partIndex) => (
                <Polygon
                  key={`${zone.zoneCode}-${partIndex}`}
                  positions={polygon}
                  pathOptions={coveragePathOptions(zone, selectedZoneCode === zone.zoneCode)}
                  eventHandlers={onSelectZone ? { click: () => onSelectZone(zone.zoneCode) } : undefined}
                >
                  <Tooltip sticky>
                    <strong>{zone.zoneName}</strong>
                    <br />
                    {zone.rate === null ? "Sin datos" : formatCoverageRate(zone.rate)}
                    <br />
                    {zone.note}
                  </Tooltip>
                  <Popup>
                    <strong>{zone.zoneName}</strong>
                    <span className={styles.popupDescription}>
                      {zone.rate === null ? "Sin datos" : `${formatCoverageRate(zone.rate)} · ${zone.note}`}
                    </span>
                  </Popup>
                </Polygon>
              )),
            )
          : null}

        {view !== "inventory"
          ? zones.flatMap((zone) => {
              const isCoveredToday = todayZones.some((todayZone) => todayZone.zoneCode === zone.code);
              const isRouteZone = routeStops.some((stop) => stop.zoneCode === zone.code);
              const isCoverageZone = coverageZones.some((coverageZone) => coverageZone.zoneCode === zone.code);
              if ((view === "today" && isCoveredToday) || (view === "route" && isRouteZone) || view === "zones" || (view === "coverage" && isCoverageZone)) {
                return [];
              }

              return zone.coordinates.map((polygon, partIndex) => (
                <Polygon key={`context-${zone.code}-${partIndex}`} positions={polygon} pathOptions={zonePathOptions(false)}>
                  <Tooltip sticky>{zone.name}</Tooltip>
                </Polygon>
              ));
            })
          : null}
      </MapContainer>
      <MapBoundaryControl state={boundaries} />
    </div>
  );
}

function formatCoverageRate(rate: number) {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(rate)} %`;
}
