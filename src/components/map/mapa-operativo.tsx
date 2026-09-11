"use client";

import { AlertTriangle, Boxes, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTAINER_STATUS_LABELS } from "@/lib/containers";
import type { RiskLevel } from "@/lib/tree-surveys";
import {
  operationalMapAdapter,
  type OperationalMapData,
} from "@/lib/operational-map";
import type { OperationalScenario } from "@/lib/scenarios";

import styles from "./mapa-operativo.module.css";

type LayerId = keyof OperationalMapData;

type MapListItem = {
  id: string;
  layer: LayerId;
  title: string;
  description: string;
  lat: number | null;
  lng: number | null;
  markerSymbol: string;
  markerTone: "info" | "success" | "warning" | "danger" | "action";
};

const OperationalMapCanvas = dynamic(
  () => import("./operational-map-canvas").then((module) => module.OperationalMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className={styles.mapPlaceholder} role="status" aria-label="Preparando mapa geográfico">
        Preparando mapa geográfico
      </div>
    ),
  },
);

const layerLabels: Record<LayerId, string> = {
  containers: "Contenedores",
  greenPoints: "Puntos verdes",
  greenSpaces: "Espacios verdes",
  trees: "Arbolado",
};

const initialLayers: Record<LayerId, boolean> = {
  containers: true,
  greenPoints: true,
  greenSpaces: true,
  trees: true,
};

const mapLoadError = "No se pudo cargar la información territorial. Revise la conexión e intente nuevamente.";

const wasteTypeLabels = {
  HOUSEHOLD: "Domiciliarios",
  RECYCLABLE: "Reciclables",
  BULKY: "Voluminosos",
  GREEN: "Restos verdes",
  MIXED: "Mixtos",
} as const;

const wasteMarkerTones = {
  HOUSEHOLD: "action",
  RECYCLABLE: "info",
  BULKY: "warning",
  GREEN: "success",
  MIXED: "danger",
} as const;

const greenSpaceTypeLabels = {
  SQUARE: "Plaza",
  PARK: "Parque",
  PLANTER: "Cantero",
  MEDIAN: "Bulevar",
  PROMENADE: "Paseo",
} as const;

const greenSpaceMarkerTones = {
  SQUARE: "success",
  PARK: "success",
  PLANTER: "warning",
  MEDIAN: "info",
  PROMENADE: "action",
} as const;

const treeRiskLabels: Record<RiskLevel, string> = {
  NONE: "Sin riesgo",
  LOW: "Riesgo bajo",
  MEDIUM: "Riesgo medio",
  HIGH: "Riesgo alto",
  CRITICAL: "Riesgo crítico",
};

const treeRiskMarkerTones: Record<RiskLevel, MapListItem["markerTone"]> = {
  NONE: "success",
  LOW: "info",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

function toListItems(data: OperationalMapData): MapListItem[] {
  return [
    ...data.containers.map((item) => ({
      id: item.id,
      layer: "containers" as const,
      title: item.code,
      description: `${item.address} · ${CONTAINER_STATUS_LABELS[item.status]}`,
      lat: item.lat,
      lng: item.lng,
      markerSymbol: "C",
      markerTone: item.status === "DAMAGED" || item.status === "REMOVED"
        ? "danger" as const
        : item.status === "OVERFLOWED" || item.status === "UNDER_REPAIR"
          ? "warning" as const
          : item.status === "RELOCATING"
            ? "info" as const
            : "success" as const,
    })),
    ...data.greenPoints.map((item) => ({
      id: item.id,
      layer: "greenPoints" as const,
      title: item.name,
      description: `${item.address ?? "Sin dirección informada"} · ${item.wasteTypes.map((type) => wasteTypeLabels[type]).join(", ")}`,
      lat: item.lat,
      lng: item.lng,
      markerSymbol: "P",
      markerTone: wasteMarkerTones[item.wasteTypes[0] ?? "MIXED"],
    })),
    ...data.greenSpaces.map((item) => ({
      id: item.id,
      layer: "greenSpaces" as const,
      title: item.name,
      description: `${greenSpaceTypeLabels[item.spaceType]} · ${Math.round(item.areaM2).toLocaleString("es-AR")} m²`,
      lat: item.lat,
      lng: item.lng,
      markerSymbol: "E",
      markerTone: greenSpaceMarkerTones[item.spaceType],
    })),
    ...data.trees.map((item) => ({
      id: item.id,
      layer: "trees" as const,
      title: item.surveyCode,
      description: `${item.species} · ${item.address ?? "Sin dirección informada"} · ${item.lastSurvey ? treeRiskLabels[item.lastSurvey.riskLevel] : "Sin relevamiento"}`,
      lat: item.lat,
      lng: item.lng,
      markerSymbol: item.lastSurvey ? "A" : "?",
      markerTone: item.lastSurvey ? treeRiskMarkerTones[item.lastSurvey.riskLevel] : "action" as const,
    })),
  ];
}

export function MapaOperativo({ scenario }: { scenario: OperationalScenario }) {
  const [data, setData] = useState<OperationalMapData | null>(null);
  const [enabledLayers, setEnabledLayers] = useState(initialLayers);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await operationalMapAdapter.load());
    } catch {
      setError(mapLoadError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    operationalMapAdapter.load().then(
      (nextData) => {
        if (!isCurrent) return;
        setData(nextData);
        setIsLoading(false);
      },
      () => {
        if (!isCurrent) return;
        setError(mapLoadError);
        setIsLoading(false);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, []);

  const items = useMemo(() => (data ? toListItems(data) : []), [data]);
  const visibleItems = items.filter((item) => enabledLayers[item.layer]);
  const locatedItems = visibleItems.filter(
    (item): item is MapListItem & { lat: number; lng: number } => item.lat !== null && item.lng !== null,
  );
  const unlocatedCount = visibleItems.length - locatedItems.length;

  return (
    <section className={styles.workspace} aria-labelledby="mapa-operativo-title">
      <header className={styles.heading}>
        <div>
          <h1 id="mapa-operativo-title">Mapa operativo</h1>
          <p>
            {scenario.actor.kind === "OFFICE"
              ? "Supervise el inventario urbano en su contexto territorial."
              : "Consulte los recursos urbanos cercanos a su operación."}
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw data-icon="inline-start" aria-hidden />
          Actualizar datos
        </Button>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertTitle>El mapa no está disponible</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </Alert>
      ) : null}

      {isLoading ? <MapLoading /> : data ? (
        <div className={styles.layout}>
          <div className={styles.mapPanel}>
            <div className={styles.mapToolbar}>
              <strong>Contexto territorial</strong>
              <span>{locatedItems.length} ubicados</span>
            </div>
            <OperationalMapCanvas markers={locatedItems} />
          </div>

          <aside className={styles.sidePanel} aria-label="Controles y listado del mapa">
            <fieldset className={styles.layers}>
              <legend>Capas visibles</legend>
              {(Object.keys(layerLabels) as LayerId[]).map((layer) => {
                const count = items.filter((item) => item.layer === layer && item.lat !== null && item.lng !== null).length;
                return (
                  <label className={styles.layerControl} key={layer}>
                    <Checkbox
                      checked={enabledLayers[layer]}
                      onCheckedChange={(checked) => {
                        setEnabledLayers((current) => ({ ...current, [layer]: checked }));
                      }}
                      aria-label={`${layerLabels[layer]}, ${count} ubicados`}
                    />
                    <span className={`${styles.layerSwatch} ${styles[layer]}`} aria-hidden />
                    <span>{layerLabels[layer]}</span>
                    <small>{count}</small>
                  </label>
                );
              })}
            </fieldset>

            <section className={styles.visibleList} aria-labelledby="visible-items-title">
              <div className={styles.listHeading}>
                <h2 id="visible-items-title">Elementos visibles</h2>
                <span>{locatedItems.length}</span>
              </div>
              {unlocatedCount > 0 ? (
                <p className={styles.locationNotice}>{unlocatedCount} sin coordenadas no se muestran en el mapa.</p>
              ) : null}
              {locatedItems.length > 0 ? (
                <ul>
                  {locatedItems.map((item) => (
                    <li key={`${item.layer}-${item.id}`}>
                      <span className={`${styles.listMarker} ${styles[item.markerTone]}`} aria-hidden />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty className={styles.emptyState}>
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><Boxes aria-hidden /></EmptyMedia>
                    <EmptyTitle>No hay elementos visibles</EmptyTitle>
                    <EmptyDescription>Active al menos una capa con recursos ubicados.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </section>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function MapLoading() {
  return (
    <div className={styles.loading} role="status" aria-label="Cargando mapa operativo">
      <Skeleton className={styles.loadingMap} />
      <div className={styles.loadingPanel}>
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <span className="sr-only">Cargando mapa operativo</span>
      </div>
    </div>
  );
}
