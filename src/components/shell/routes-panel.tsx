"use client";

import { useCallback, useEffect, useState } from "react";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteRequestError, routesAdapter, type Route } from "@/lib/routes";

import { ShellError, ShellForbidden, ShellUnauthenticated } from "./shell-states";

type RoutesLoadState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; routes: Route[] };

export function RoutesPanel() {
  const [state, setState] = useState<RoutesLoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    async function requestRoutes() {
      setState({ status: "loading" });
      try {
        const page = await routesAdapter.list();
        if (isCurrent) setState({ status: "ready", routes: page.routes });
      } catch (caught) {
        if (!isCurrent) return;
        if (caught instanceof RouteRequestError && caught.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }
        if (caught instanceof RouteRequestError && caught.status === 403) {
          setState({ status: "forbidden" });
          return;
        }
        setState({ status: "error" });
      }
    }
    void requestRoutes();
    return () => {
      isCurrent = false;
    };
  }, [requestVersion]);

  const retry = useCallback(() => setRequestVersion((version) => version + 1), []);

  if (state.status === "loading") {
    return (
      <div aria-label="Cargando recorridos" className="flex max-w-2xl flex-col gap-3">
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
        title="No se pudieron cargar los recorridos"
        description="Verifique la conexión local y vuelva a intentarlo."
      />
    );
  }

  if (state.routes.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Sin recorridos</EmptyTitle>
          <EmptyDescription>No hay recorridos registrados para mostrar.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section aria-labelledby="routes-title" className="flex flex-col gap-3">
      <h2 id="routes-title" className="text-sm font-medium">Recorridos</h2>
      <ul className="flex flex-col gap-2">
        {state.routes.map((route) => (
          <li key={route.id}>
            <span className="font-medium">{route.code}</span> — {route.name} ({route.stops.length} {route.stops.length === 1 ? "parada" : "paradas"})
          </li>
        ))}
      </ul>
    </section>
  );
}
