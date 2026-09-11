"use client";

import { Activity, AlertTriangle, Boxes, MapPinned, RefreshCw, Route as RouteIcon } from "lucide-react";
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
import { indicatorsAdapter, type CoverageIndicator } from "@/lib/indicators";
import {
  buildCoverageZoneOverlays,
  COVERAGE_BAND_CLASSES,
  COVERAGE_BAND_LABELS,
  type CoverageZoneOverlay,
} from "@/lib/map-coverage";
import {
  operationalMapAdapter,
  type OperationalMapData,
} from "@/lib/operational-map";
import {
  buildTodayZoneCoverage,
  loadRoute,
  loadTodayServiceCoverage,
  operationalZonesAdapter,
  routeToStopOverlays,
  type OperationalZone,
  type TodayServiceCoverage,
} from "@/lib/operational-zones";
import { routesAdapter, type Route } from "@/lib/routes";
import type { OperationalScenario } from "@/lib/scenarios";
import { ZONE_RESULT_STATUS_LABEL } from "@/lib/services";
import type { RiskLevel } from "@/lib/tree-surveys";

import type { OperationalMapView } from "./operational-map-canvas";
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

type MapViewOption = {
  id: OperationalMapView;
  label: string;
  title: string;
};

const mapViews: MapViewOption[] = [
  { id: "inventory", label: "Inventario", title: "Contexto territorial" },
  { id: "zones", label: "Zonas", title: "Zonas operativas" },
  { id: "coverage", label: "Cobertura", title: "Cobertura por zona" },
  { id: "route", label: "Recorrido", title: "Recorrido operativo" },
  { id: "today", label: "Atención hoy", title: "Zonas atendidas hoy" },
];

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
const viewLoadError = "No se pudo cargar esta vista territorial. Intente nuevamente.";

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

const todayStatusLabels = {
  PENDING: "Pendiente",
  SERVICED: "Atendida",
  PARTIAL: "Parcial",
  NOT_SERVICED: "No atendida",
} as const;

const coverageBandSwatchClass = {
  "no-data": "coverageNoData",
  low: "coverageLow",
  partial: "coveragePartial",
  good: "coverageGood",
  high: "coverageHigh",
} as const;

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

function todayIsoDate() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function formatTodayDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function activeZoneRecords(zones: OperationalZone[]) {
  return zones.flatMap((item) => item.zone ? [item.zone] : []);
}

export function MapaOperativo({ scenario }: { scenario: OperationalScenario }) {
  const [data, setData] = useState<OperationalMapData | null>(null);
  const [zones, setZones] = useState<OperationalZone[]>([]);
  const [enabledLayers, setEnabledLayers] = useState(initialLayers);
  const [view, setView] = useState<OperationalMapView>("inventory");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewError, setViewError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [todayServices, setTodayServices] = useState<TodayServiceCoverage[]>([]);
  const [todayLoaded, setTodayLoaded] = useState(false);
  const [isTodayLoading, setIsTodayLoading] = useState(false);
  const [coverage, setCoverage] = useState<CoverageIndicator | null>(null);
  const [coverageLoaded, setCoverageLoaded] = useState(false);
  const [isCoverageLoading, setIsCoverageLoading] = useState(false);
  const [selectedStopSequence, setSelectedStopSequence] = useState<number | null>(null);
  const [selectedZoneCode, setSelectedZoneCode] = useState<string | null>(null);
  const availableMapViews = mapViews.filter(
    (option) => option.id !== "coverage" || scenario.capabilities.includes("indicator:view"),
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (view === "coverage") {
      setCoverage(null);
      setCoverageLoaded(false);
      setIsCoverageLoading(true);
    }
    try {
      const [nextData, nextZones] = await Promise.all([
        operationalMapAdapter.load(),
        operationalZonesAdapter.list(),
      ]);
      setData(nextData);
      setZones(nextZones);
    } catch {
      setError(mapLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [view]);

  useEffect(() => {
    let isCurrent = true;

    Promise.all([operationalMapAdapter.load(), operationalZonesAdapter.list()]).then(
      ([nextData, nextZones]) => {
        if (!isCurrent) return;
        setData(nextData);
        setZones(nextZones);
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

  useEffect(() => {
    if (view !== "route" || routesLoaded) return;
    let isCurrent = true;

    void routesAdapter.list({ active: true, page: 1, pageSize: 100 }).then(
      (result) => {
        if (!isCurrent) return;
        setRoutes(result.routes);
        setSelectedRouteId((current) => current || result.routes[0]?.id || "");
        setRoutesLoaded(true);
      },
      (reason) => {
        if (!isCurrent) return;
        setViewError(viewLoadError);
        setRoutesLoaded(true);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [routesLoaded, view]);

  useEffect(() => {
    if (view !== "route" || !selectedRouteId) return;
    let isCurrent = true;

    void loadRoute(selectedRouteId).then(
      (route) => {
        if (!isCurrent) return;
        setSelectedRoute(route);
        setIsRouteLoading(false);
      },
      (reason) => {
        if (!isCurrent) return;
        setSelectedRoute(null);
        setViewError(viewLoadError);
        setIsRouteLoading(false);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [selectedRouteId, view]);

  useEffect(() => {
    if (view !== "today" || todayLoaded) return;
    let isCurrent = true;

    void loadTodayServiceCoverage(todayIsoDate()).then(
      (coverage) => {
        if (!isCurrent) return;
        setTodayServices(coverage);
        setTodayLoaded(true);
        setIsTodayLoading(false);
      },
      () => {
        if (!isCurrent) return;
        setViewError(viewLoadError);
        setTodayLoaded(true);
        setIsTodayLoading(false);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [todayLoaded, view]);

  useEffect(() => {
    if (view !== "coverage" || coverageLoaded) return;
    let isCurrent = true;

    void indicatorsAdapter.getCoverage().then(
      (nextCoverage) => {
        if (!isCurrent) return;
        setCoverage(nextCoverage);
        setCoverageLoaded(true);
        setIsCoverageLoading(false);
      },
      () => {
        if (!isCurrent) return;
        setViewError(viewLoadError);
        setCoverageLoaded(true);
        setIsCoverageLoading(false);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [coverageLoaded, view]);

  const items = useMemo(() => (data ? toListItems(data) : []), [data]);
  const visibleItems = items.filter((item) => enabledLayers[item.layer]);
  const locatedItems = visibleItems.filter(
    (item): item is MapListItem & { lat: number; lng: number } => item.lat !== null && item.lng !== null,
  );
  const unlocatedCount = visibleItems.length - locatedItems.length;
  const routeStops = useMemo(
    () => selectedRoute ? routeToStopOverlays(selectedRoute, activeZoneRecords(zones)) : [],
    [selectedRoute, zones],
  );
  const todayZoneCoverage = useMemo(
    () => buildTodayZoneCoverage(todayServices, activeZoneRecords(zones)),
    [todayServices, zones],
  );
  const coverageZoneOverlays = useMemo(
    () => buildCoverageZoneOverlays(zones, coverage),
    [coverage, zones],
  );
  const currentView = availableMapViews.find((item) => item.id === view) ?? availableMapViews[0]!;
  const isViewLoading = view === "route"
    ? isRouteLoading || !routesLoaded
    : view === "today"
      ? isTodayLoading || !todayLoaded
      : view === "coverage"
        ? isCoverageLoading || !coverageLoaded
        : false;

  const handleViewChange = (nextView: OperationalMapView) => {
    setView(nextView);
    setViewError(null);
    if (nextView === "today" && !todayLoaded) setIsTodayLoading(true);
    if (nextView === "route" && routesLoaded && selectedRouteId) setIsRouteLoading(true);
    if (nextView === "coverage" && !coverageLoaded) setIsCoverageLoading(true);
  };

  const handleRouteChange = (nextRouteId: string) => {
    setSelectedRouteId(nextRouteId);
    setSelectedRoute(null);
    setSelectedStopSequence(null);
    setViewError(null);
    setIsRouteLoading(Boolean(nextRouteId));
  };

  return (
    <section className={styles.workspace} aria-labelledby="mapa-operativo-title">
      <header className={styles.heading}>
        <div>
          <h1 id="mapa-operativo-title">Mapa operativo</h1>
          <p>
            {scenario.actor.kind === "OFFICE"
              ? "Supervise el inventario urbano y la cobertura territorial de la operación."
              : "Consulte los recursos urbanos cercanos a su operación."}
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw data-icon="inline-start" aria-hidden />
          Actualizar datos
        </Button>
      </header>

      <div className={styles.viewSwitcher} role="tablist" aria-label="Vistas del mapa operativo">
        {availableMapViews.map((option) => (
          <Button
            key={option.id}
            id={`map-tab-${option.id}`}
            className={styles.viewTab}
            variant={view === option.id ? "default" : "outline"}
            role="tab"
            aria-selected={view === option.id}
            aria-controls={`map-view-${option.id}`}
            onClick={() => handleViewChange(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>

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

      {viewError ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertTitle>La vista no está disponible</AlertTitle>
          <AlertDescription>{viewError}</AlertDescription>
          <Button variant="outline" size="sm" onClick={() => {
            setViewError(null);
            if (view === "route") {
              setRoutesLoaded(false);
            } else if (view === "today") {
              setTodayLoaded(false);
            } else if (view === "coverage") {
              setCoverage(null);
              setCoverageLoaded(false);
            }
          }}>
            Reintentar vista
          </Button>
        </Alert>
      ) : null}

      {isLoading ? <MapLoading /> : data ? (
        <div className={styles.layout} id={`map-view-${view}`} role="tabpanel" aria-labelledby={`map-tab-${view}`}>
          <div className={styles.mapPanel}>
            <div className={styles.mapToolbar}>
              <strong>{currentView.title}</strong>
              <span>{mapToolbarSummary(view, locatedItems.length, zones, routeStops.length, todayServices.length, coverageZoneOverlays)}</span>
            </div>
            <OperationalMapCanvas
              view={view}
              markers={locatedItems}
              zones={zones}
              routeStops={routeStops}
              todayZones={todayZoneCoverage}
              coverageZones={coverageZoneOverlays}
              selectedStopSequence={selectedStopSequence}
              onSelectStop={setSelectedStopSequence}
              selectedZoneCode={selectedZoneCode}
              onSelectZone={setSelectedZoneCode}
            />
          </div>

          <aside className={styles.sidePanel} aria-label={`Controles de la vista ${currentView.label}`}>
            {view === "inventory" ? (
              <InventoryPanel
                items={items}
                locatedItems={locatedItems}
                unlocatedCount={unlocatedCount}
                enabledLayers={enabledLayers}
                onLayerChange={(layer, checked) => {
                  setEnabledLayers((current) => ({ ...current, [layer]: checked }));
                }}
              />
            ) : view === "zones" ? (
              <ZonesMapPanel zones={zones} selectedZoneCode={selectedZoneCode} onSelectZone={setSelectedZoneCode} />
            ) : view === "route" ? (
              <RouteMapPanel
                routes={routes}
                selectedRouteId={selectedRouteId}
                selectedRoute={selectedRoute}
                routeStops={routeStops}
                onRouteChange={handleRouteChange}
                selectedStopSequence={selectedStopSequence}
                onSelectStop={setSelectedStopSequence}
                loading={isViewLoading}
              />
            ) : view === "coverage" ? (
              <CoverageMapPanel
                coverage={coverage}
                zones={coverageZoneOverlays}
                loading={isViewLoading}
                selectedZoneCode={selectedZoneCode}
                onSelectZone={setSelectedZoneCode}
              />
            ) : (
              <TodayMapPanel
                services={todayServices}
                zones={todayZoneCoverage}
                loading={isViewLoading}
              />
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function mapToolbarSummary(
  view: OperationalMapView,
  locatedCount: number,
  zones: OperationalZone[],
  routeStopCount: number,
  todayServiceCount: number,
  coverageZones: CoverageZoneOverlay[],
) {
  if (view === "inventory") return `${locatedCount} ubicados`;
  if (view === "zones") return `${zones.length} zonas operativas`;
  if (view === "route") return `${routeStopCount} paradas`;
  if (view === "coverage") {
    const withData = coverageZones.filter((zone) => zone.rate !== null).length;
    return `${withData} de ${coverageZones.length} zonas con datos`;
  }
  return `${todayServiceCount} servicio${todayServiceCount === 1 ? "" : "s"} de atención`;
}

function InventoryPanel({
  items,
  locatedItems,
  unlocatedCount,
  enabledLayers,
  onLayerChange,
}: {
  items: MapListItem[];
  locatedItems: (MapListItem & { lat: number; lng: number })[];
  unlocatedCount: number;
  enabledLayers: Record<LayerId, boolean>;
  onLayerChange: (layer: LayerId, checked: boolean) => void;
}) {
  return (
    <>
      <fieldset className={styles.layers}>
        <legend>Capas visibles</legend>
        {(Object.keys(layerLabels) as LayerId[]).map((layer) => {
          const count = items.filter((item) => item.layer === layer && item.lat !== null && item.lng !== null).length;
          return (
            <label className={styles.layerControl} key={layer}>
              <Checkbox
                checked={enabledLayers[layer]}
                onCheckedChange={(checked) => onLayerChange(layer, checked === true)}
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
    </>
  );
}

function ZonesMapPanel({
  zones,
  selectedZoneCode,
  onSelectZone,
}: {
  zones: OperationalZone[];
  selectedZoneCode: string | null;
  onSelectZone: (code: string) => void;
}) {
  return (
    <section className={styles.viewPanel} aria-labelledby="zones-view-title">
      <div className={styles.panelIntro}>
        <div className={styles.panelTitleRow}>
          <MapPinned aria-hidden />
          <h2 id="zones-view-title">Zonas operativas</h2>
        </div>
        <p>Cuatro polígonos oficiales unidos al catálogo por el código estable de zona.</p>
      </div>
      <ul className={styles.zoneList}>
        {zones.map((zone) => (
          <li key={zone.code}>
            <button
              type="button"
              className={`${styles.zoneButton} ${selectedZoneCode === zone.code ? styles.selected : ""}`}
              aria-pressed={selectedZoneCode === zone.code}
              onClick={() => onSelectZone(selectedZoneCode === zone.code ? "" : zone.code)}
            >
              <span className={`${styles.zoneSwatch} ${styles[zone.code.toLowerCase().replace("-", "")]}`} aria-hidden />
              <span>
                <strong>{zone.code}</strong>
                <small>{zone.name}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.mapHint}>Seleccione una zona para destacarla en el mapa. El color no es el único indicador: cada zona conserva su código y nombre.</p>
    </section>
  );
}

function CoverageMapPanel({
  coverage,
  zones,
  loading,
  selectedZoneCode,
  onSelectZone,
}: {
  coverage: CoverageIndicator | null;
  zones: CoverageZoneOverlay[];
  loading: boolean;
  selectedZoneCode: string | null;
  onSelectZone: (code: string) => void;
}) {
  if (loading) return <MapSideLoading label="Cargando cobertura por zona" />;

  const zonesWithData = zones.filter((zone) => zone.rate !== null).length;
  const legendBands = ["no-data", "low", "partial", "good", "high"] as const;

  return (
    <section className={styles.viewPanel} aria-labelledby="coverage-view-title">
      <div className={styles.panelIntro}>
        <div className={styles.panelTitleRow}>
          <Activity aria-hidden />
          <h2 id="coverage-view-title">Cobertura por zona</h2>
        </div>
        <p>
          Objetivos atendidos sobre programados. Período: {coverage ? formatCoveragePeriod(coverage.period) : "no disponible"}.
        </p>
      </div>
      <div className={styles.coverageLegend} role="group" aria-label="Escala semántica de cobertura">
        {legendBands.map((band) => (
          <span className={styles.coverageLegendItem} key={band}>
            <span className={`${styles.coverageLegendSwatch} ${styles[coverageBandSwatchClass[band]]}`} aria-hidden />
            <span>{COVERAGE_BAND_LABELS[band]}</span>
          </span>
        ))}
      </div>
      <p className={styles.coverageSummary}>
        {zonesWithData} de {zones.length} zonas con datos
        {coverage ? ` · Actualizado ${formatCoverageFreshness(coverage.freshness.updatedAt)}` : ""}
      </p>
      <ul className={styles.coverageZoneList}>
        {zones.map((zone) => (
          <li key={zone.zoneCode}>
            <button
              type="button"
              className={`${styles.coverageZoneButton} ${selectedZoneCode === zone.zoneCode ? styles.selected : ""}`}
              aria-pressed={selectedZoneCode === zone.zoneCode}
              onClick={() => onSelectZone(selectedZoneCode === zone.zoneCode ? "" : zone.zoneCode)}
            >
              <span className={`${styles.coverageLegendSwatch} ${styles[coverageBandSwatchClass[zone.band]]}`} aria-hidden />
              <span className={styles.coverageZoneCopy}>
                <strong>{zone.zoneName}</strong>
                <small>{zone.zoneCode} · {zone.note}</small>
              </span>
              <span className={COVERAGE_BAND_CLASSES[zone.band]}>
                {COVERAGE_BAND_LABELS[zone.band]} · {formatCoverageRate(zone.rate)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.mapHint}>
        Seleccione una zona para destacarla. El color se acompaña con la tasa, el código y el detalle atendido/programado.
      </p>
    </section>
  );
}

function RouteMapPanel({
  routes,
  selectedRouteId,
  selectedRoute,
  routeStops,
  onRouteChange,
  selectedStopSequence,
  onSelectStop,
  loading,
}: {
  routes: Route[];
  selectedRouteId: string;
  selectedRoute: Route | null;
  routeStops: ReturnType<typeof routeToStopOverlays>;
  onRouteChange: (id: string) => void;
  selectedStopSequence: number | null;
  onSelectStop: (sequence: number) => void;
  loading: boolean;
}) {
  if (loading) return <MapSideLoading label="Cargando recorridos" />;

  return (
    <section className={styles.viewPanel} aria-labelledby="route-view-title">
      <div className={styles.panelIntro}>
        <div className={styles.panelTitleRow}>
          <RouteIcon aria-hidden />
          <h2 id="route-view-title">{selectedRoute?.name ?? "Recorrido operativo"}</h2>
        </div>
        <p>Las paradas se leen en orden y cada zona queda resaltada en el mapa.</p>
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="map-route-select">Recorrido a visualizar</label>
        <select
          id="map-route-select"
          value={selectedRouteId}
          onChange={(event) => onRouteChange(event.target.value)}
          className={styles.routeSelect}
        >
          {routes.length === 0 ? <option value="">No hay recorridos activos</option> : null}
          {routes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.name}</option>)}
        </select>
      </div>
      {selectedRoute ? (
        <>
          <div className={styles.routeSummary}>
            <strong>{selectedRoute.name}</strong>
            <span>{routeStops.length} paradas · {totalRouteDuration(routeStops)} min estimados</span>
          </div>
          <ol className={styles.routeStopList}>
            {routeStops.map((stop) => (
              <li key={stop.id}>
                <button
                  type="button"
                  className={`${styles.routeStopButton} ${selectedStopSequence === stop.sequence ? styles.selected : ""}`}
                  aria-pressed={selectedStopSequence === stop.sequence}
                  onClick={() => onSelectStop(selectedStopSequence === stop.sequence ? 0 : stop.sequence)}
                >
                  <span className={styles.sequenceBadge} aria-hidden>{stop.sequence}</span>
                  <span className={styles.routeStopCopy}>
                    <strong>Parada {stop.sequence}</strong>
                    <small>{stop.zoneCode} · {stop.zoneName}</small>
                  </span>
                  <small className={styles.duration}>{stop.estimatedDurationMin !== null ? `${stop.estimatedDurationMin} min estimados` : "Sin duración"}</small>
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <Empty className={styles.emptyState}>
          <EmptyHeader>
            <EmptyMedia variant="icon"><RouteIcon aria-hidden /></EmptyMedia>
            <EmptyTitle>No hay paradas para mostrar</EmptyTitle>
            <EmptyDescription>Seleccione un recorrido activo con zonas configuradas.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}

function TodayMapPanel({
  services,
  zones,
  loading,
}: {
  services: TodayServiceCoverage[];
  zones: ReturnType<typeof buildTodayZoneCoverage>;
  loading: boolean;
}) {
  if (loading) return <MapSideLoading label="Cargando atención de hoy" />;

  return (
    <section className={styles.viewPanel} aria-labelledby="today-view-title">
      <div className={styles.panelIntro}>
        <div className={styles.panelTitleRow}>
          <MapPinned aria-hidden />
          <h2 id="today-view-title">Zonas atendidas hoy</h2>
        </div>
        <p>{formatTodayDate(todayIsoDate())}. La cobertura se actualiza desde los resultados registrados por zona.</p>
      </div>
      <p className={styles.todaySummary}>
        {services.length} servicio{services.length === 1 ? "" : "s"} programado{services.length === 1 ? "" : "s"} hoy
      </p>
      {zones.length > 0 ? (
        <ul className={styles.todayZoneList}>
          {zones.map((zone) => (
            <li key={zone.zoneId}>
              <span className={`${styles.todayStatus} ${styles[zone.status.toLowerCase()]}`} aria-hidden />
              <span>
                <strong>{zone.zoneName}</strong>
                <small>{zone.zoneCode} · {zone.resultCount}/{zone.serviceCount} resultados registrados</small>
              </span>
              <span className={`${styles.statusLabel} ${styles[zone.status.toLowerCase()]}`}>
                {todayStatusLabels[zone.status]}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className={styles.emptyState}>
          <EmptyHeader>
            <EmptyMedia variant="icon"><MapPinned aria-hidden /></EmptyMedia>
            <EmptyTitle>No hay servicios programados hoy</EmptyTitle>
            <EmptyDescription>Cuando exista atención para la fecha actual, cada zona aparecerá con su resultado operativo.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {services.length > 0 ? (
        <div className={styles.todayServiceList}>
          <h3>Servicios incluidos</h3>
          <ul>
            {services.map(({ service, zoneResults }) => (
              <li key={service.id}>
                <strong>{service.title}</strong>
                <small>{service.id} · {service.windowFrom ?? "Horario no informado"}–{service.windowTo ?? ""}</small>
                <span>{service.zoneIds.map((zoneId) => {
                  const result = zoneResults.find((candidate) => candidate.zoneId === zoneId);
                  return `${service.zoneNames[service.zoneIds.indexOf(zoneId)] ?? zoneId}: ${result ? ZONE_RESULT_STATUS_LABEL[result.status] : "Pendiente"}`;
                }).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className={styles.mapHint}>La vista consulta el detalle de cada servicio del día para no confundir una zona asignada con una zona efectivamente atendida.</p>
    </section>
  );
}

function totalRouteDuration(stops: ReturnType<typeof routeToStopOverlays>) {
  return stops.reduce((total, stop) => total + (stop.estimatedDurationMin ?? 0), 0);
}

function formatCoverageRate(rate: number | null) {
  return rate === null
    ? "Sin valor"
    : `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(rate)} %`;
}

function formatCoveragePeriod(period: CoverageIndicator["period"]) {
  const format = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" });
  return `${format.format(new Date(`${period.from}T12:00:00`))} – ${format.format(new Date(`${period.to}T12:00:00`))}`;
}

function formatCoverageFreshness(updatedAt: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(updatedAt));
}

function MapSideLoading({ label }: { label: string }) {
  return (
    <div className={styles.sideLoading} role="status" aria-label={label}>
      <Skeleton />
      <Skeleton />
      <Skeleton />
      <span className="sr-only">{label}</span>
    </div>
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
