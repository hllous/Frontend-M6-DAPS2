"use client";

import { useEffect, useState } from "react";
import { CalendarClockIcon, ClockIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { ListItemsSkeleton } from "@/components/ui/loading-skeletons";
import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { formatArgentinaCalendarDate } from "@/lib/argentina-date";
import {
  PUBLIC_SERVICE_MESSAGES,
  PUBLIC_SERVICE_STAGE_LABELS,
  fetchPublicServices,
  fetchPublicZones,
  groupServicesByDate,
  type PublicLookup,
  type PublicService,
  type PublicServiceStage,
  type PublicServicesPage,
  type PublicZone,
} from "@/lib/public-services";

import { ZonePicker } from "./zone-picker";

const STAGE_VARIANTS: Record<PublicServiceStage, "info" | "warning" | "success" | "neutral"> = {
  PROGRAMADO: "info",
  EN_CURSO: "warning",
  REALIZADO: "success",
  REPROGRAMADO: "neutral",
};

const weekdayFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: "UTC" });

function dayHeading(date: string): string {
  return `${weekdayFormatter.format(new Date(`${date}T00:00:00Z`))} ${formatArgentinaCalendarDate(date)}`;
}

function windowLabel(service: PublicService): string {
  const from = service.windowFrom?.slice(0, 5);
  const to = service.windowTo?.slice(0, 5);
  if (from && to) return `${from} a ${to}`;
  if (from) return `Desde las ${from}`;
  if (to) return `Hasta las ${to}`;
  return "Sin horario definido";
}

/** Un pedido al BFF queda identificado por su clave: mientras el resultado guardado no la tenga, está cargando. */
type Keyed<T> = { key: string; outcome: PublicLookup<T> };

function useKeyedLookup<T>(key: string | undefined, load: (signal: AbortSignal) => Promise<PublicLookup<T>>) {
  const [result, setResult] = useState<Keyed<T>>();

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    load(controller.signal).then(
      (outcome) => setResult({ key, outcome }),
      // Una consulta nueva reemplazó a esta: no hay nada que mostrar.
      () => undefined,
    );
    return () => controller.abort();
    // `load` se recrea en cada render; la clave es lo que identifica el pedido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = result && result.key === key ? result : undefined;
  return { loading: key !== undefined && !current, outcome: current?.outcome };
}

export function ServiceSchedule({ initialZoneId }: { initialZoneId?: string }) {
  const [zoneId, setZoneId] = useState(initialZoneId);
  const [zonesAttempt, setZonesAttempt] = useState(0);
  const [servicesAttempt, setServicesAttempt] = useState(0);

  const zones = useKeyedLookup<PublicZone[]>(`zones:${zonesAttempt}`, fetchPublicZones);
  const zoneList = zones.outcome?.ok ? zones.outcome.data : undefined;
  // Una zona del enlace que no existe se ignora: se vuelve a pedir que elija.
  const selectedZone = zoneList?.find((zone) => zone.id === zoneId)?.id;

  const services = useKeyedLookup<PublicServicesPage>(
    selectedZone ? `services:${selectedZone}:${servicesAttempt}` : undefined,
    (signal) => fetchPublicServices(selectedZone!, signal),
  );

  function pickZone(next: string) {
    setZoneId(next);
    const url = new URL(window.location.href);
    url.searchParams.set("zona", next);
    window.history.replaceState(window.history.state, "", url);
  }

  const failure = zones.outcome && !zones.outcome.ok
    ? { message: PUBLIC_SERVICE_MESSAGES[zones.outcome.failure], retry: () => setZonesAttempt((n) => n + 1) }
    : services.outcome && !services.outcome.ok
      ? { message: PUBLIC_SERVICE_MESSAGES[services.outcome.failure], retry: () => setServicesAttempt((n) => n + 1) }
      : undefined;
  const loaded = services.outcome?.ok ? services.outcome.data.data : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <ZonePicker zones={zoneList ?? []} value={selectedZone} onChange={pickZone} disabled={!zoneList} />
        </CardContent>
      </Card>

      {zones.loading ? <LoadingRegion label="Cargando zonas"><Skeleton className="h-5 w-1/2" /></LoadingRegion> : null}

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
            <EmptyMedia variant="icon"><CalendarClockIcon /></EmptyMedia>
            <EmptyDescription>Elegí tu zona para ver cuándo pasan los servicios.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {services.loading ? <ScheduleSkeleton /> : null}

      {loaded && loaded.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarClockIcon /></EmptyMedia>
            <EmptyDescription>No hay servicios programados en tu zona para los próximos 30 días.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {loaded && loaded.length > 0 ? <ScheduleGroups services={loaded} /> : null}
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <LoadingRegion label="Cargando servicios" className="flex flex-col gap-4">
      {[0, 1].map((group) => (
        <Card key={group} aria-hidden="true">
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent><ListItemsSkeleton itemCount={2} itemHeight="min-h-16" /></CardContent>
        </Card>
      ))}
    </LoadingRegion>
  );
}

function ScheduleGroups({ services }: { services: PublicService[] }) {
  const groups = groupServicesByDate(services);
  return (
    <>
      <p role="status" className="sr-only">
        {services.length === 1 ? "1 servicio programado" : `${services.length} servicios programados`} en los próximos 30 días.
      </p>
      <div className="flex flex-col gap-4">
        {groups.map(({ date, services: items }) => (
          <Card key={date} role="group" aria-labelledby={`services-${date}`}>
            <CardHeader>
              <CardTitle id={`services-${date}`} role="heading" aria-level={2} className="capitalize">{dayHeading(date)}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {items.map((service) => (
                  <li key={service.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium">{service.serviceTypeName}</span>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <ClockIcon aria-hidden="true" className="size-4 shrink-0" />
                        {windowLabel(service)}
                      </span>
                    </div>
                    <Badge variant={STAGE_VARIANTS[service.stage]}>{PUBLIC_SERVICE_STAGE_LABELS[service.stage]}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
