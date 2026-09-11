"use client";

import { divIcon } from "leaflet";
import { Fragment } from "react";
import { MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip } from "react-leaflet";

import type { OperationalZone, RouteStopOverlay, TodayZoneCoverage } from "@/lib/operational-zones";

import styles from "./operational-map-canvas.module.css";

export type OperationalMapView = "inventory" | "zones" | "route" | "today";

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
  selectedStopSequence?: number | null;
  onSelectStop?: (sequence: number) => void;
  selectedZoneCode?: string | null;
  onSelectZone?: (code: string) => void;
};

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

function zonePathOptions(selected: boolean) {
  return {
    color: selected ? "var(--color-accent)" : "var(--color-action)",
    fillColor: selected ? "var(--color-accent)" : "var(--color-info-fill)",
    fillOpacity: selected ? 0.3 : 0.2,
    weight: selected ? 3 : 2,
  };
}

export function OperationalMapCanvas({
  view,
  markers,
  zones = [],
  routeStops = [],
  todayZones = [],
  selectedStopSequence = null,
  onSelectStop,
  selectedZoneCode = null,
  onSelectZone,
}: OperationalMapCanvasProps) {
  const mapLabel =
    view === "zones"
      ? "Mapa geográfico de zonas operativas"
      : view === "route"
        ? "Mapa geográfico del recorrido"
        : view === "today"
          ? "Mapa geográfico de zonas atendidas hoy"
          : "Mapa geográfico del inventario urbano";

  return (
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

      {view === "inventory"
        ? markers.map((marker) => (
            <Marker
              key={`${marker.layer}-${marker.id}`}
              position={[marker.lat, marker.lng]}
              title={`${marker.title}. ${marker.description}`}
              alt={`${marker.title}. ${marker.description}`}
              icon={divIcon({
                className: styles.marker,
                html: `<span class="${styles.markerPin} ${styles[marker.markerTone]}"><span>${marker.markerSymbol}</span></span>`,
                iconSize: [36, 42],
                iconAnchor: [18, 40],
                popupAnchor: [0, -38],
              })}
            >
              <Popup>
                <strong>{marker.title}</strong>
                <span className={styles.popupDescription}>{marker.description}</span>
              </Popup>
            </Marker>
          ))
        : null}

      {view === "zones"
        ? zones.map((zone) => (
            <Polygon
              key={zone.code}
              positions={zone.coordinates}
              pathOptions={zonePathOptions(selectedZoneCode === zone.code)}
              eventHandlers={onSelectZone ? { click: () => onSelectZone(zone.code) } : undefined}
            >
              <Tooltip sticky>
                <strong>{zone.code}</strong> · {zone.name}
              </Tooltip>
            </Polygon>
          ))
        : null}

      {view === "route"
        ? routeStops.map((stop) => (
            <Fragment key={stop.id}>
              {stop.geometry ? (
                <Polygon
                  positions={stop.geometry.coordinates}
                  pathOptions={zonePathOptions(selectedStopSequence === stop.sequence)}
                  eventHandlers={onSelectStop ? { click: () => onSelectStop(stop.sequence) } : undefined}
                >
                  <Tooltip sticky>
                    <strong>Parada {stop.sequence}</strong> · {stop.zoneName}
                  </Tooltip>
                </Polygon>
              ) : null}
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
                        ? `${stop.estimatedDurationMin} min estimados`
                        : "Duración estimada no informada"}
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
              <Polygon
                key={zone.zoneId}
                positions={zone.geometry.coordinates}
                pathOptions={todayStatusPathOptions[zone.status]}
              >
                <Tooltip sticky>
                  <strong>{zone.zoneName}</strong> · {zone.status}
                </Tooltip>
              </Polygon>
            ) : null,
          )
        : null}

      {view !== "inventory"
        ? zones.map((zone) => {
            const isCoveredToday = todayZones.some((todayZone) => todayZone.zoneCode === zone.code);
            const isRouteZone = routeStops.some((stop) => stop.zoneCode === zone.code);
            if ((view === "today" && isCoveredToday) || (view === "route" && isRouteZone) || view === "zones") {
              return null;
            }

            return (
              <Polygon key={`context-${zone.code}`} positions={zone.coordinates} pathOptions={zonePathOptions(false)}>
                <Tooltip sticky>{zone.name}</Tooltip>
              </Polygon>
            );
          })
        : null}
    </MapContainer>
  );
}
