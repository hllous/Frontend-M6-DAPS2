"use client";

import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { zonesAdapter, type Zone } from "@/lib/zones";

type ZonesLoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; zones: Zone[] };

export function ZonesPanel() {
  const [state, setState] = useState<ZonesLoadState>({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;
    zonesAdapter
      .list()
      .then((page) => {
        if (isCurrent) setState({ status: "ready", zones: page.zones });
      })
      .catch(() => {
        if (isCurrent) setState({ status: "error" });
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div aria-label="Cargando zonas operativas" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudieron cargar las zonas</AlertTitle>
        <AlertDescription>Verifique la conexión local y vuelva a intentarlo.</AlertDescription>
      </Alert>
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
