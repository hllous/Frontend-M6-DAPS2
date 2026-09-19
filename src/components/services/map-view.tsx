"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, MapPin, MapPinOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { operationalMapAdapter, type OperationalMapData } from "@/lib/operational-map";
import { operationalZonesAdapter, type OperationalZone } from "@/lib/operational-zones";
import { resolveServiceMapLocations } from "@/lib/services-map";
import type { Service } from "@/lib/services";
import { cn } from "@/lib/utils";
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

function serviceCountLabel(count: number) {
  return `${count} servicio${count === 1 ? "" : "s"} visible${count === 1 ? "" : "s"}`;
}

function unlocatedServiceLabel(count: number) {
  return `${count} servicio${count === 1 ? "" : "s"} sin ubicación`;
}

type MapViewProps = {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  filterFingerprint?: string;
  className?: string;
};

export function MapView({
  services,
  selectedId,
  onSelect,
  loading = false,
  error = false,
  onRetry,
  filterFingerprint,
  className,
}: MapViewProps) {
  const [referenceData, setReferenceData] = useState<ReferenceDataState>({ status: "loading" });
  const [retryVersion, setRetryVersion] = useState(0);

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
  const unlocatedLocations = useMemo(
    () => locations.filter((location) => location.coordinates === null),
    [locations],
  );
  const selectedUnlocated = unlocatedLocations.find((location) => location.serviceId === selectedId);
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
        "relative h-full min-h-[360px] w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)]",
        className,
      )}
      role="region"
      aria-label="Mapa territorial de Servicios"
    >
      {!hasError && referenceData.status === "ready" ? (
        <div className={styles.mapLayer}>
          <ServicesMapCanvas
            services={services}
            locations={locations}
            selectedId={selectedId}
            onSelect={onSelect}
            filterFingerprint={filterFingerprint}
          />

          {services.length === 0 ? (
            <div className={styles.emptyNotice} role="status">
              <MapPin aria-hidden="true" />
              <strong>No hay servicios para mostrar</strong>
              <span>Modifique los filtros para consultar otra selección.</span>
            </div>
          ) : null}

          {unlocatedLocations.length > 0 ? (
            <div className={styles.locationNotice} role="status" aria-live="polite">
              <MapPinOff aria-hidden="true" />
              <div>
                <strong>{unlocatedServiceLabel(unlocatedLocations.length)}</strong>
                <span>
                  {selectedUnlocated
                    ? `${selectedUnlocated.serviceId} no tiene un objetivo o una zona con coordenadas resolubles.`
                    : "No se muestran como pines hasta contar con una ubicación resoluble."}
                </span>
                <div className={styles.locationActions} aria-label="Servicios sin ubicación">
                  {unlocatedLocations.map((location) => {
                    const service = services.find((candidate) => candidate.id === location.serviceId);
                    return (
                      <button
                        key={location.serviceId}
                        type="button"
                        className={styles.locationAction}
                        aria-label={`Seleccionar ${location.serviceId} sin ubicación`}
                        aria-pressed={location.serviceId === selectedId}
                        onClick={() => onSelect(location.serviceId)}
                      >
                        {service?.id ?? location.serviceId}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
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
        <div role="status" aria-live="polite" className={styles.stateOverlay}>
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
          {services.map((service, index) => (
            <button
              key={service.id}
              type="button"
              tabIndex={isLoading && !hasError ? 0 : -1}
              aria-label={`Parada ${index + 1}: ${service.id} — ${service.title} (${service.zoneNames.join(", ")})`}
              aria-pressed={service.id === selectedId}
              onClick={() => onSelect(service.id)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.counter} aria-live="polite">
        <MapPin aria-hidden="true" />
        <span>{serviceCountLabel(services.length)}</span>
      </div>
    </div>
  );
}
