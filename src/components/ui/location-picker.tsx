"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { ADDRESS_SEARCH_FALLBACK_MESSAGE } from "@/lib/address-search-messages";
import { roundCoordinate } from "@/lib/input-limits";
import { getOperationalZoneGeometries, isCoordinateInsideOperationalZone } from "@/lib/operational-zones";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Field, FieldLabel } from "./field";
import { Input } from "./input";

export type LocationPoint = { lat: number; lng: number };
export type LocationSearchResult = LocationPoint & { label: string };
export type LocationPickerProps = {
  currentPoint?: LocationPoint | null;
  initialAddress?: string;
  searchAddresses: (query: string) => Promise<LocationSearchResult[]>;
  onConfirm: (point: LocationPoint, selectedSearchLabel?: string) => void;
  onCancel: () => void;
};
const LocationPickerMap = dynamic(
  () => import("./location-picker-map").then((module) => module.LocationPickerMap),
  { ssr: false },
);
export function locationPointLabel(point: LocationPoint): string {
  return getOperationalZoneGeometries().find((zone) =>
    isCoordinateInsideOperationalZone([point.lat, point.lng], zone),
  )?.name ?? "Fuera de las zonas operativas";
}

/** Each mounted instance is one editing session; the dialog remounts it on open. */
export function LocationPicker({ currentPoint, initialAddress = "", searchAddresses, onConfirm, onCancel }: LocationPickerProps) {
  const searchId = useId();
  const [point, setPoint] = useState(currentPoint ?? null);
  const [query, setQuery] = useState(initialAddress);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>();
  const [accuracy, setAccuracy] = useState<number>();
  const [gpsMessage, setGpsMessage] = useState("");
  const [locating, setLocating] = useState(false);

  function locate() {
    const failed = () => {
      setLocating(false);
      setGpsMessage("No se pudo obtener su ubicación. Márquela en el mapa.");
    };
    if (!navigator.geolocation) { failed(); return; }
    setLocating(true);
    setGpsMessage("Buscando su ubicación…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setPoint({ lat: coords.latitude, lng: coords.longitude });
      setAccuracy(coords.accuracy);
      setSelectedLabel(undefined);
      setLocating(false);
      setGpsMessage("Ubicación obtenida. Puede ajustar el punto en el mapa.");
    }, failed, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  async function search() {
    if (searching) return;
    setSearching(true);
    setResults([]);
    setSearchMessage("Buscando dirección…");
    try {
      const found = query.trim() ? await searchAddresses(query.trim()) : [];
      setResults(found);
      setSearchMessage(found.length ? `${found.length} direcciones encontradas. Elija una.` : ADDRESS_SEARCH_FALLBACK_MESSAGE);
    } catch {
      setSearchMessage(ADDRESS_SEARCH_FALLBACK_MESSAGE);
    } finally { setSearching(false); }
  }

  return <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
    <Field>
      <FieldLabel htmlFor={searchId}>Dirección</FieldLabel>
      <div className="flex gap-2">
        <Input id={searchId} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); void search(); }
        }} />
        <Button type="button" variant="outline" disabled={searching} onClick={() => void search()}>Buscar dirección</Button>
      </div>
    </Field>
    <p aria-live="polite" aria-atomic="true" className={cn({ "sr-only": !searchMessage })}>{searchMessage}</p>
    {results.length > 0 && <ul aria-label="Direcciones encontradas" className="flex max-h-32 shrink-0 flex-col gap-1 overflow-auto">
      {results.map((result, index) => <li key={`${result.label}-${index}`}>
        <Button type="button" variant="outline" className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => {
          setPoint({ lat: result.lat, lng: result.lng });
          setAccuracy(undefined);
          setSelectedLabel(result.label);
          setResults([]);
          setSearchMessage(`Dirección seleccionada: ${result.label}`);
        }}>{result.label}</Button>
      </li>)}
    </ul>}
    <Button type="button" variant="outline" disabled={locating} onClick={locate}>Usar mi ubicación</Button>
    <p aria-live="polite" aria-atomic="true" className={cn({ "sr-only": !gpsMessage })}>{gpsMessage}</p>
    <LocationPickerMap point={point} accuracy={accuracy} onPick={(next) => {
      setPoint(next); setAccuracy(undefined); setSelectedLabel(undefined);
    }} />
    <p role="status" aria-live="polite" aria-atomic="true">
      {point ? <>Ubicación marcada: {locationPointLabel(point)}<span className="sr-only">. {point.lat.toFixed(7)}, {point.lng.toFixed(7)}</span></> : "Marque la ubicación"}
    </p>
    <div className="flex shrink-0 flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      <Button type="button" disabled={!point} onClick={() => point && onConfirm({
        lat: roundCoordinate(point.lat), lng: roundCoordinate(point.lng),
      }, selectedLabel)}>Confirmar ubicación</Button>
    </div>
  </div>;
}
