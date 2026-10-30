"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { MapPinIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { ListItemsSkeleton, MapPaneSkeleton } from "@/components/ui/loading-skeletons";
import { LoadingRegion } from "@/components/ui/loading-region";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchPublicGreenPoints,
  PUBLIC_GREEN_POINT_MESSAGES,
  PUBLIC_GREEN_POINT_WASTE_LABELS,
  type PublicGreenPoint,
  type PublicGreenPointsPage,
} from "@/lib/public-green-points";
import { fetchPublicZones, type PublicLookup, type PublicZone } from "@/lib/public-services";
import { type WasteType } from "@/lib/green-points";
import { cn } from "@/lib/utils";

import { ZonePicker } from "./zone-picker";

type LocatedPoint = PublicGreenPoint & { lat: number; lng: number };

const GreenPointsMap = dynamic(
  () => import("./green-points-map-canvas").then((module) => module.GreenPointsMapCanvas),
  {
    ssr: false,
    loading: () => <MapPaneSkeleton className="min-h-0" />,
  },
);

type Keyed<T> = { key: string; outcome: PublicLookup<T> };

function useKeyedLookup<T>(key: string | undefined, load: (signal: AbortSignal) => Promise<PublicLookup<T>>) {
  const [result, setResult] = useState<Keyed<T>>();

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    load(controller.signal).then(
      (outcome) => setResult({ key, outcome }),
      () => undefined,
    );
    return () => controller.abort();
    // `load` is recreated on each render; the key identifies this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = result && result.key === key ? result : undefined;
  return { loading: key !== undefined && !current, outcome: current?.outcome };
}

function hasCoordinates(point: PublicGreenPoint): point is LocatedPoint {
  return typeof point.lat === "number" && typeof point.lng === "number";
}

export function PublicGreenPoints({ initialZoneId }: { initialZoneId?: string }) {
  const [zoneId, setZoneId] = useState(initialZoneId);
  const [wasteType, setWasteType] = useState<WasteType | "all">("all");
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [zonesAttempt, setZonesAttempt] = useState(0);
  const [pointsAttempt, setPointsAttempt] = useState(0);

  const zones = useKeyedLookup<PublicZone[]>(`zones:${zonesAttempt}`, fetchPublicZones);
  const zoneList = zones.outcome?.ok ? zones.outcome.data : undefined;
  const selectedZone = zoneList?.find((zone) => zone.id === zoneId)?.id;
  const points = useKeyedLookup<PublicGreenPointsPage>(
    selectedZone ? `green-points:${selectedZone}:${pointsAttempt}` : undefined,
    (signal) => fetchPublicGreenPoints(selectedZone!, signal),
  );
  const loadedPoints = points.outcome?.ok ? points.outcome.data.data : undefined;
  const visiblePoints = useMemo(
    () => loadedPoints?.filter((point) => wasteType === "all" || point.wasteTypes.includes(wasteType)) ?? [],
    [loadedPoints, wasteType],
  );
  const locatedPoints = useMemo(() => visiblePoints.filter(hasCoordinates), [visiblePoints]);
  const visibleSelectedPointId = selectedPointId && visiblePoints.some((point) => point.id === selectedPointId)
    ? selectedPointId
    : null;

  function pickZone(nextZoneId: string) {
    setZoneId(nextZoneId);
    setWasteType("all");
    setSelectedPointId(null);
    const url = new URL(window.location.href);
    url.searchParams.set("zona", nextZoneId);
    window.history.replaceState(window.history.state, "", url);
  }

  const failure = zones.outcome && !zones.outcome.ok
    ? { message: PUBLIC_GREEN_POINT_MESSAGES[zones.outcome.failure], retry: () => setZonesAttempt((attempt) => attempt + 1) }
    : points.outcome && !points.outcome.ok
      ? { message: PUBLIC_GREEN_POINT_MESSAGES[points.outcome.failure], retry: () => setPointsAttempt((attempt) => attempt + 1) }
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ZonePicker zones={zoneList ?? []} value={selectedZone} onChange={pickZone} disabled={!zoneList} />
          <Field>
            <FieldLabel htmlFor="public-green-points-waste-type">Tipo de residuo</FieldLabel>
            <Select
              items={{ all: "Todos los residuos", ...PUBLIC_GREEN_POINT_WASTE_LABELS }}
              value={wasteType}
              onValueChange={(next) => {
                if (next) {
                  setWasteType(next as WasteType | "all");
                  setSelectedPointId(null);
                }
              }}
              disabled={!loadedPoints || Boolean(failure)}
            >
              <SelectTrigger id="public-green-points-waste-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todos los residuos</SelectItem>
                  {Object.entries(PUBLIC_GREEN_POINT_WASTE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {zones.loading ? (
        <LoadingRegion label="Cargando zonas"><Skeleton className="h-5 w-1/2" /></LoadingRegion>
      ) : null}

      {failure ? (
        <Alert variant="danger">
          <AlertDescription className="flex flex-col items-start gap-3">
            {failure.message}
            <Button type="button" variant="outline" onClick={failure.retry}>Reintentar</Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {zoneList && !selectedZone && !failure ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><MapPinIcon /></EmptyMedia>
            <EmptyDescription>Elegí tu zona para ver los puntos verdes.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {points.loading ? <GreenPointsSkeleton /> : null}

      {loadedPoints && visiblePoints.length === 0 && !failure ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><MapPinIcon /></EmptyMedia>
            <EmptyDescription>
              {loadedPoints.length === 0
                ? "No hay puntos verdes activos en tu zona."
                : `No encontramos puntos verdes que reciban ${PUBLIC_GREEN_POINT_WASTE_LABELS[wasteType as WasteType]?.toLowerCase()}.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {visiblePoints.length > 0 && loadedPoints ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card>
            <CardHeader>
              <CardTitle id="public-green-points-list-title">Puntos verdes</CardTitle>
              <p className="text-sm text-muted-foreground">
                {visiblePoints.length === 1 ? "1 punto en tu zona." : `${visiblePoints.length} puntos en tu zona.`}
              </p>
            </CardHeader>
            <CardContent>
              <ul aria-labelledby="public-green-points-list-title" className="flex flex-col divide-y">
                {visiblePoints.map((point) => (
                  <li key={point.id} className="py-2 first:pt-0 last:pb-0">
                    <Button
                      type="button"
                      variant={point.id === visibleSelectedPointId ? "secondary" : "ghost"}
                      aria-pressed={point.id === visibleSelectedPointId}
                      onClick={() => setSelectedPointId(point.id)}
                      className="h-auto min-h-12 w-full justify-start whitespace-normal px-3 py-2 text-left"
                    >
                      <span className="flex min-w-0 flex-col items-start gap-1">
                        <span className="font-medium">{point.name}</span>
                        <span className="text-sm text-muted-foreground">{point.address || "Dirección no informada"}</span>
                        <span className="text-sm text-muted-foreground">
                          {point.zoneName} · {point.wasteTypes.map((type) => PUBLIC_GREEN_POINT_WASTE_LABELS[type]).join(", ")}
                        </span>
                        {!hasCoordinates(point) ? <Badge variant="neutral">Sin ubicación en el mapa</Badge> : null}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id="public-green-points-map-title">Mapa de puntos verdes</CardTitle>
              <p className="text-sm text-muted-foreground">
                {locatedPoints.length === 1 ? "1 punto con ubicación." : `${locatedPoints.length} puntos con ubicación.`}
              </p>
            </CardHeader>
            <CardContent>
              <LoadingRegion
                label="Mapa de puntos verdes"
                isLoading={false}
                aria-labelledby="public-green-points-map-title"
                className={cn("relative h-80 min-w-0 overflow-hidden rounded-xl border sm:h-96", "[&_.leaflet-container]:rounded-xl")}
              >
                {locatedPoints.length > 0 ? (
                  <GreenPointsMap points={locatedPoints} selectedPointId={visibleSelectedPointId} onSelect={setSelectedPointId} />
                ) : (
                  <Empty className="h-full">
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><MapPinIcon /></EmptyMedia>
                      <EmptyDescription>No hay puntos con ubicación disponible para mostrar en el mapa.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </LoadingRegion>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function GreenPointsSkeleton() {
  return (
    <LoadingRegion label="Cargando puntos verdes" className="grid min-w-0 gap-4 lg:grid-cols-2">
      <Card aria-hidden="true">
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent><ListItemsSkeleton itemCount={3} itemHeight="min-h-16" /></CardContent>
      </Card>
      <Card aria-hidden="true">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><MapPaneSkeleton height="h-80 sm:h-96" /></CardContent>
      </Card>
    </LoadingRegion>
  );
}
