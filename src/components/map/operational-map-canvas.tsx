"use client";

import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import styles from "./operational-map-canvas.module.css";

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

export function OperationalMapCanvas({ markers }: { markers: OperationalMapMarker[] }) {
  return (
    <MapContainer
      center={[-34.578, -58.42]}
      zoom={13}
      scrollWheelZoom
      className={styles.map}
      aria-label="Mapa geográfico del inventario urbano"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => (
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
      ))}
    </MapContainer>
  );
}
