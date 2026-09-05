"use client";

import { useCallback, useEffect, useState } from "react";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoneRequestError, zonesAdapter, type Zone } from "@/lib/zones";

import { ShellError, ShellForbidden, ShellUnauthenticated } from "./shell-states";

type ZonesLoadState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; zones: Zone[] };

export function ZonesPanel() {
  const [state, setState] = useState<ZonesLoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    async function requestZones() {
      setState({ status: "loading" });
      try {
        const page = await zonesAdapter.list();
        if (isCurrent) setState({ status: "ready", zones: page.zones });
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
      <div aria-label="Cargando zonas operativas" className="flex max-w-2xl flex-col gap-3">
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
        description="Verifique la conexión local y vuelva a intentarlo."
      />
    );
  }

  if (state.zones.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Sin zonas operativas</EmptyTitle>
          <EmptyDescription>No hay zonas registradas para mostrar.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section aria-labelledby="zones-title" className="flex flex-col gap-3">
      <h2 id="zones-title" className="text-sm font-medium">Zonas operativas</h2>
      <ul className="flex flex-col gap-2">
        {state.zones.map((zone) => (
          <li key={zone.id}>
            <span className="font-medium">{zone.code}</span> — {zone.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
