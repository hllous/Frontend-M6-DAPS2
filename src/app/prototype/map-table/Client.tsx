"use client";

// PROTOTYPE root for Wayfinder ticket #14. Three variants of a responsive
// map + table operations workspace, switchable via ?variant=A|B|C. See
// docs/design/inspiration/README.md for the visual references this draws
// on, and this ticket's grilling round (issue #14 comments) for the
// settled interaction-model decisions each variant honors.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Inter } from "next/font/google";
import { MOCK_SERVICES, type MockService } from "./data";
import { Toolbar, type FilterState } from "./components/Toolbar";
import { PrototypeSwitcher, type VariantMeta } from "./components/PrototypeSwitcher";
import { VariantA } from "./variants/VariantA";
import { VariantB } from "./variants/VariantB";
import { VariantC } from "./variants/VariantC";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const VARIANTS: VariantMeta[] = [
  { key: "A", name: "Panel dividido" },
  { key: "B", name: "Mapa primero" },
  { key: "C", name: "Lista primero" },
];

function matches(service: MockService, filter: FilterState) {
  if (filter.zone !== "all" && service.zone !== filter.zone) return false;
  if (filter.statuses.size > 0 && !filter.statuses.has(service.status)) return false;
  if (filter.query.trim()) {
    const q = filter.query.trim().toLowerCase();
    const haystack = `${service.id} ${service.title} ${service.zone} ${service.crew}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function MapTableClient() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";

  const [filter, setFilter] = useState<FilterState>({
    query: "",
    zone: "all",
    statuses: new Set(),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [simulateMapOutage, setSimulateMapOutage] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setMapLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Switching variant is a fresh look at the workspace — reset transient UI
  // state (a stale "open detail" from one layout leaking into another would
  // be confusing, not a feature).
  useEffect(() => {
    setSelectedId(null);
    setDetailId(null);
    setSelectedIds(new Set());
  }, [variant]);

  const services = useMemo(
    () => MOCK_SERVICES.filter((s) => matches(s, filter)),
    [filter],
  );

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleSelectAll() {
    setSelectedIds((prev) => {
      const allSelected = services.every((s) => prev.has(s.id));
      if (allSelected) return new Set();
      return new Set(services.map((s) => s.id));
    });
  }

  const detailService = detailId
    ? (MOCK_SERVICES.find((s) => s.id === detailId) ?? null)
    : null;

  const sharedProps = {
    services,
    selectedId,
    onSelect: handleSelect,
    selectedIds,
    onToggleSelect: handleToggleSelect,
    onToggleSelectAll: handleToggleSelectAll,
    onClearSelection: () => setSelectedIds(new Set()),
    mapLoading,
    mapError: simulateMapOutage,
    detailService,
    onOpenDetail: (id: string) => setDetailId(id),
    onCloseDetail: () => setDetailId(null),
  };

  return (
    <div className={`${inter.className} flex h-screen flex-col bg-[#FAFAFA] text-[#1A1A1A]`}>
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-navy px-4 py-2.5 text-white">
        <span className="text-sm font-bold tracking-tight">M6 · Ambiente e Higiene</span>
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium">
          Prototipo — Servicios (Mapa + Tabla)
        </span>
      </header>

      {!detailService && (
        <Toolbar
          filter={filter}
          onChange={setFilter}
          simulateMapOutage={simulateMapOutage}
          onToggleMapOutage={() => setSimulateMapOutage((v) => !v)}
        />
      )}

      <main className="min-h-0 flex-1">
        {variant === "A" && <VariantA {...sharedProps} />}
        {variant === "B" && <VariantB {...sharedProps} />}
        {variant === "C" && <VariantC {...sharedProps} />}
      </main>

      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </div>
  );
}
