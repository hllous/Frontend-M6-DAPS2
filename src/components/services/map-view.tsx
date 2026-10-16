"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className={styles.mapLoading} role="status" aria-label="Preparando mapa geográfico">
        Preparando mapa geográfico
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
              "No se pudo cargar la información territorial. Revise la conexión e intente nuevamente.",
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
      aria-label="Mapa territorial de Servicios"
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
            <p>
              {hasReferenceDataError && referenceData.status === "error"
                ? referenceData.message
                : "La tabla de servicios permanece completamente disponible y operativa. El mapa es una vista complementaria."}
            </p>
          </div>
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              Reintentar mapa
            </Button>
          ) : null}
        </div>
      ) : isLoading ? (
        <div role="status" aria-live="polite" className={cn(styles.stateOverlay, compact && styles.stateOverlayCompact)}>
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-action)]" aria-hidden="true" />
          <span>Cargando mapa territorial…</span>
        </div>
      ) : null}

      {services.length > 0 ? (
        <div
          className={cn(styles.loadingIndex, (!isLoading || hasError) && styles.loadingIndexHidden)}
          aria-hidden={!isLoading || hasError}
          aria-label="Servicios disponibles mientras carga el mapa"
        >
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              tabIndex={isLoading && !hasError ? 0 : -1}
              aria-label={`Parada ${serviceOrdinals.get(service.id)}: ${service.title} (${service.zoneNames.join(", ")})`}
              aria-pressed={service.id === selectedId}
              onClick={() => onSelect(service.id)}
            >
              {serviceOrdinals.get(service.id)}
            </button>
          ))}
        </div>
      ) : null}

    </div>
  );
}
