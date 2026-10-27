"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
      <div className={styles.mapLoading} role="status" aria-label="Cargando mapa…">
        Cargando mapa…
      </div>
    ),
  },
);

type ReferenceDataState =
  | { status: "loading" }
  | { status: "error"; message: string }
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
  const computedServiceOrdinals = useMemo(() => createServiceOrdinals(services), [services]);
  const serviceOrdinals = suppliedServiceOrdinals ?? computedServiceOrdinals;

  useEffect(() => {
    let isCurrent = true;

    Promise.all([operationalMapAdapter.load(), operationalZonesAdapter.list()])
      .then(([mapData, zones]) => {
        if (isCurrent) {
          setReferenceData({ status: "ready", mapData, zones });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setReferenceData({
            status: "error",
            message:
              "No se pudo cargar el mapa. Intente nuevamente.",
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [retryVersion]);

  const locations = useMemo(
    () =>
      referenceData.status === "ready"
        ? resolveServiceMapLocations(services, referenceData.mapData, referenceData.zones)
        : [],
    [referenceData, services],
  );
  const hasReferenceDataError = referenceData.status === "error";
  const hasError = error || hasReferenceDataError;
  const isLoading = loading || referenceData.status === "loading";
  const handleRetry = useCallback(() => {
    onRetry?.();
    setReferenceData({ status: "loading" });
    setRetryVersion((version) => version + 1);
  }, [onRetry]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)]",
        className,
        compact && styles.mapCompact,
      )}
      role="region"
      aria-label="Mapa de servicios"
    >
      {!hasError && referenceData.status === "ready" ? (
        <div className={cn(styles.mapLayer, compact && styles.mapLayerCompact)}>
          <ServicesMapCanvas
            services={services}
            serviceOrdinals={serviceOrdinals}
            locations={locations}
            selectedId={selectedId}
            onSelect={onSelect}
            compact={compact}
          />

        </div>
      ) : null}

      {hasError ? (
        <div role="alert" className={styles.stateOverlay}>
          <div className={styles.stateIcon}>
            <AlertCircle aria-hidden="true" />
          </div>
          <div>
            <h3>No se pudo cargar el mapa</h3>
            {hasReferenceDataError && referenceData.status === "error" ? <p>{referenceData.message}</p> : null}
          </div>
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : isLoading ? (
        <div role="status" aria-live="polite" className={cn(styles.stateOverlay, compact && styles.stateOverlayCompact)}>
          <Spinner className="size-5 text-[var(--color-action)]" aria-hidden="true" role="presentation" />
          <span>Cargando mapa…</span>
        </div>
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

    </div>
  );
}
