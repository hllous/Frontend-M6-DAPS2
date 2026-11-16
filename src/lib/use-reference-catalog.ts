"use client";

import { compareStrings } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  loadReferenceCatalog,
  loadTreeReferences,
  REFERENCE_UNAVAILABLE,
  referenceName,
  type ReferenceItem,
  type ReferenceKind,
  type ReferenceQuery,
} from "./reference-catalog";
import type { Tree } from "./trees";

export type ReferenceCatalog<T> = {
  status: "loading" | "ready" | "error";
  /** Catálogo completo; vacío mientras carga o si falló. */
  items: T[];
  /** Nombre de la referencia; `null` mientras carga (la pantalla muestra su skeleton), texto legible si no existe. */
  lookup: (id: string) => string | null;
};

type CatalogState<T> = { key: string; status: "ready" | "error"; items: T[] } | null;

/**
 * Catálogo completo de referencias para una pantalla: se pide una vez por montaje (y por filtro) y se reusa en
 * cada celda, detalle y combo de esa pantalla.
 */
export function useReferenceCatalog<K extends ReferenceKind>(kind: K, query?: ReferenceQuery<K>): ReferenceCatalog<ReferenceItem<K>> {
  const queryKey = JSON.stringify(query ?? {});
  const key = `${kind}:${queryKey}`;
  const [state, setState] = useState<CatalogState<ReferenceItem<K>>>(null);

  useEffect(() => {
    let isCurrent = true;
    // La query llega como objeto literal en cada render: se compara por su forma serializada.
    loadReferenceCatalog(kind, JSON.parse(queryKey) as ReferenceQuery<K>)
      .then((items) => { if (isCurrent) setState({ key, status: "ready", items }); })
      .catch(() => { if (isCurrent) setState({ key, status: "error", items: [] }); });
    return () => { isCurrent = false; };
  }, [key, kind, queryKey]);

  const current = state?.key === key ? state : null;
  const items = useMemo(() => current?.items ?? [], [current]);
  const names = useMemo(() => new Map(items.map((item) => [item.id, referenceName(kind, item)])), [items, kind]);
  const status = current?.status ?? "loading";
  const lookup = useCallback(
    (id: string) => names.get(id) ?? (status === "loading" ? null : REFERENCE_UNAVAILABLE[kind]),
    [names, status, kind],
  );
  return { status, items, lookup };
}

export type TreeReferences = {
  /** Árbol resuelto, `null` mientras carga, `undefined` si no existe. */
  lookup: (id: string) => Tree | null | undefined;
};

/** Resuelve por id solo los árboles que la pantalla muestra; cada id se pide una sola vez por montaje. */
export function useTreeReferences(ids: readonly string[]): TreeReferences {
  const [resolved, setResolved] = useState<ReadonlyMap<string, Tree | undefined>>(() => new Map());
  const requested = useRef(new Set<string>());
  const mounted = useRef(true);
  const idsKey = JSON.stringify([...new Set(ids)].sort(compareStrings));

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const missing = (JSON.parse(idsKey) as string[]).filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    for (const id of missing) requested.current.add(id);
    void loadTreeReferences(missing).catch(() => new Map<string, Tree>()).then((found) => {
      if (!mounted.current) return;
      setResolved((previous) => {
        const next = new Map(previous);
        for (const id of missing) next.set(id, found.get(id));
        return next;
      });
    });
  }, [idsKey]);

  const lookup = useCallback((id: string) => (resolved.has(id) ? resolved.get(id) : null), [resolved]);
  return { lookup };
}
