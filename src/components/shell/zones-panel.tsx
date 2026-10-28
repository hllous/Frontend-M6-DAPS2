"use client";

import { useCallback, useEffect, useState } from "react";

import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoneRequestError, zoneLocationLabel, zonesAdapter, type Zone } from "@/lib/zones";

import { ShellError, ShellForbidden, ShellUnauthenticated } from "./shell-states";

type ZonesLoadState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; zones: Zone[]; total: number };

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
      <div role="status" aria-label="Cargando zonas operativas" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
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
      <ItemGroup className="gap-2">
        {state.zones.map((zone) => (
          <Item key={zone.id} variant="outline" size="sm">
            <ItemContent>
              <ItemTitle>{zone.name}</ItemTitle>
              {zone.commune ? <ItemDescription>{zoneLocationLabel(zone)}</ItemDescription> : null}
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
    </section>
  );
}
