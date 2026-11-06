"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingRegion } from "@/components/ui/loading-region";
import { MapPaneSkeleton } from "@/components/ui/loading-skeletons";
import { operationalMapAdapter, type OperationalMapData } from "@/lib/operational-map";
import { operationalZonesAdapter, type OperationalZone } from "@/lib/operational-zones";
import { resolveServiceMapLocations } from "@/lib/services-map";
import type { Service } from "@/lib/services";
import { cn } from "@/lib/utils";
import { createServiceOrdinals } from "./service-sorting";
import styles from "./services-map.module.css";

const ServicesMapCanvas = dynamic(
  () => import("./services-map-canvas").then((module) => module.ServicesMapCanvas),
  {
    ssr: false,
    loading: () => (
      <LoadingRegion label="Mapa" className={styles.mapLoading}>
        <MapPaneSkeleton className="min-h-0" />
      </LoadingRegion>
    ),
  },
);

type ReferenceDataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "partial-error"; message: string; mapData: OperationalMapData; zones: OperationalZone[] }
  | { status: "ready"; mapData: OperationalMapData; zones: OperationalZone[] };

type MapViewProps = {
  services: Service[];
  serviceOrdinals?: ReadonlyMap<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
};

export function MapView({
  services,
  serviceOrdinals: suppliedServiceOrdinals,
  selectedId,
  onSelect,
  loading = false,
  error = false,
  onRetry,
  compact = false,
  className,
}: MapViewProps) {
  const [referenceData, setReferenceData] = useState<ReferenceDataState>({ status: "loading" });
  const [retryVersion, setRetryVersion] = useState(0);
  const [inventoryComplete, setInventoryComplete] = useState(false);
  const computedServiceOrdinals = useMemo(() => createServiceOrdinals(services), [services]);
  const serviceOrdinals = suppliedServiceOrdinals ?? computedServiceOrdinals;

  useEffect(() => {
    let isCurrent = true;
    let currentZones: OperationalZone[] | undefined;
    let currentData: OperationalMapData | undefined;
    let failed = false;
    const publish = () => {
      if (isCurrent && currentZones && currentData) setReferenceData(failed
        ? { status: "partial-error", mapData: currentData, zones: currentZones, message: "No se pudo cargar el mapa. Intente nuevamente." }
        : { status: "ready", mapData: currentData, zones: currentZones });
    };
    const unsubscribe = operationalMapAdapter.subscribe((data) => {
      if (Object.values(data).some((items) => items.length > 0)) { currentData = data; publish(); }
    });
    const zonesPromise = operationalZonesAdapter.list().then((zones) => { currentZones = zones; publish(); return zones; });

    Promise.all([operationalMapAdapter.load(), zonesPromise])
      .then(([mapData, zones]) => {
        if (isCurrent) {
          setInventoryComplete(true);
          setReferenceData({ status: "ready", mapData, zones });
        }
      })
      .catch(() => {
        if (isCurrent) {
          failed = true;
          publish();
          setReferenceData((current) => current.status === "ready"
            ? { ...current, status: "partial-error", message: "No se pudo cargar el mapa. Intente nuevamente." }
            : current.status === "partial-error" ? current
            : { status: "error", message: "No se pudo cargar el mapa. Intente nuevamente." });
        }
      });

    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [retryVersion]);

  const locations = useMemo(
    () =>
      referenceData.status === "ready" || referenceData.status === "partial-error"
        ? resolveServiceMapLocations(services, referenceData.mapData, referenceData.zones)
        : [],
    [referenceData, services],
  );
  const hasReferenceDataError = referenceData.status === "error" || referenceData.status === "partial-error";
  const hasError = error || hasReferenceDataError;
  const isLoading = loading || referenceData.status === "loading";
  const handleRetry = useCallback(() => {
    onRetry?.();
    operationalMapAdapter.invalidate(true);
    setInventoryComplete(false);
    setReferenceData((current) => current.status === "partial-error" ? { ...current, status: "ready" } : { status: "loading" });
    setRetryVersion((version) => version + 1);
  }, [onRetry]);

  return (
    <LoadingRegion
      label="Mapa de servicios"
      isLoading={isLoading && !hasError}
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)]",
        className,
        compact && styles.mapCompact,
      )}
    >
      {(referenceData.status === "ready" || referenceData.status === "partial-error") ? (
        <div className={cn(styles.mapLayer, compact && styles.mapLayerCompact)}>
          <ServicesMapCanvas
            services={services}
            serviceOrdinals={serviceOrdinals}
            locations={locations}
            selectedId={selectedId}
            onSelect={onSelect}
            compact={compact}
            ready={!loading && (inventoryComplete || locations.some((location) => location.coordinates !== null))}
          />

        </div>
      ) : null}

      {referenceData.status === "partial-error" ? (
        <Alert variant="destructive" className="absolute inset-x-3 bottom-3 z-20 w-auto">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>No se pudo cargar el mapa</AlertTitle>
          <AlertDescription>{referenceData.message}</AlertDescription>
          <Button variant="outline" size="sm" onClick={handleRetry}><RefreshCw data-icon="inline-start" aria-hidden="true" />Reintentar</Button>
        </Alert>
      ) : hasError ? (
        <div role="alert" className={styles.stateOverlay}>
          <div className={styles.stateIcon}>
            <AlertCircle aria-hidden="true" />
          </div>
          <div>
            <h3>No se pudo cargar el mapa</h3>
            {referenceData.status === "error" ? <p>{referenceData.message}</p> : null}
          </div>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              Reintentar
            </Button>
        </div>
      ) : isLoading ? (
        <MapPaneSkeleton className="absolute inset-0 z-20 min-h-0" />
      ) : null}

      {services.length > 0 ? (
        <div
          className={cn(styles.loadingIndex, (!isLoading || hasError) && styles.loadingIndexHidden)}
          aria-hidden={!isLoading || hasError}
        >
          {services.map((service) => (
            <Button
              key={service.id}
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-full font-bold tabular-nums text-[var(--color-action)]"
              tabIndex={isLoading && !hasError ? 0 : -1}
              aria-label={`Parada ${serviceOrdinals.get(service.id)}: ${service.title} (${service.zoneNames.join(", ")})`}
              aria-pressed={service.id === selectedId}
              onClick={() => onSelect(service.id)}
            >
              {serviceOrdinals.get(service.id)}
            </Button>
          ))}
        </div>
      ) : null}

    </LoadingRegion>
  );
}
