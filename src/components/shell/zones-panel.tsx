"use client";

import { ListItemsSkeleton } from "@/components/ui/loading-skeletons";
import { LoadingRegion } from "@/components/ui/loading-region";
import { useCallback, useEffect, useState } from "react";

import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoneRequestError, zonesAdapter, type Zone } from "@/lib/zones";

import { ShellError, ShellForbidden, ShellUnauthenticated } from "./shell-states";

type ZonesLoadState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; zones: Zone[]; total: number };

/** Agrupa zonas ya ordenadas por comuna bajo su encabezado («Comuna 2»); las que no tienen, al final como «Sin comuna». */
function groupZonesByCommune(zones: Zone[]) {
  const groups: { label: string; zones: Zone[] }[] = [];
  for (const zone of zones) {
    const label = zone.commune?.name ?? "Sin comuna";
    const last = groups[groups.length - 1];
    if (last?.label === label) last.zones.push(zone);
    else groups.push({ label, zones: [zone] });
  }
  return groups;
}

export function ZonesPanel() {
  const [state, setState] = useState<ZonesLoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    async function requestZones() {
      setState({ status: "loading" });
      try {
        const page = await zonesAdapter.list({ pageSize: 100 });
        if (isCurrent) setState({ status: "ready", zones: page.zones, total: page.total });
      } catch (caught) {
        if (!isCurrent) return;
        if (caught instanceof ZoneRequestError && caught.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }
        if (caught instanceof ZoneRequestError && caught.status === 403) {
          setState({ status: "forbidden" });
          return;
        }
        setState({ status: "error" });
      }
    }
    void requestZones();
    return () => {
      isCurrent = false;
    };
  }, [requestVersion]);

  const retry = useCallback(() => setRequestVersion((version) => version + 1), []);

  if (state.status === "loading") {
    return (
      <LoadingRegion label="Zonas operativas" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <ListItemsSkeleton itemCount={3} />
      </LoadingRegion>
    );
  }

  if (state.status === "unauthenticated") return <ShellUnauthenticated />;
  if (state.status === "forbidden") return <ShellForbidden />;

  if (state.status === "error") {
    return (
      <ShellError
        onRetry={retry}
        title="No se pudieron cargar las zonas"
        description="Revise la conexión e intente nuevamente."
      />
    );
  }

  if (state.zones.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Sin zonas operativas</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section aria-labelledby="zones-title" className="flex flex-col gap-3">
      <h2 id="zones-title" className="text-sm font-medium">Zonas operativas</h2>
      {state.total > state.zones.length ? (
        <p role="status" className="text-sm text-muted-foreground">
          Se muestran {state.zones.length} de {state.total} zonas.
        </p>
      ) : null}
      {groupZonesByCommune(state.zones).map(({ label, zones }) => (
        <div key={label} role="group" aria-labelledby={`zones-commune-${label.replace(/\W+/g, "-")}`} className="flex flex-col gap-2">
          <h3 id={`zones-commune-${label.replace(/\W+/g, "-")}`} className="text-sm font-semibold text-muted-foreground">{label}</h3>
          <ItemGroup className="gap-2">
            {zones.map((zone) => (
              <Item key={zone.id} variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>{zone.name}</ItemTitle>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </div>
      ))}
    </section>
  );
}
