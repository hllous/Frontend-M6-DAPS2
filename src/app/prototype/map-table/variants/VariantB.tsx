"use client";

// Variant B — "Map primary": the map is the dominant surface (field/mobile
// first), the table lives in a pull-up sheet the user can peek, half-open,
// or expand over the map. Selecting a marker or row navigates straight to
// the Service detail route — no intermediate preview — matching a Crew
// member in the field who wants the job, not a scan-and-compare view.
// Sheet structure is a hand-simplified take on the 21st.dev Base UI Drawer
// fetched for this prototype: that component targets Tailwind v4 + Base UI
// (arbitrary `--spacing()`/`in-[...]` utilities this project's Tailwind v3
// setup can't run), so this keeps its snap-point idea — peek/half/full —
// without the drag-physics implementation.
import { useState } from "react";
import { ChevronUp, GripHorizontal } from "lucide-react";
import { MapMock } from "../components/MapMock";
import { ServiceTable, BulkActionBar } from "../components/ServiceTable";
import { DetailStub } from "../components/DetailStub";
import type { MockService } from "../data";
import { cn } from "@/lib/utils";

type SnapPoint = "peek" | "half" | "full";

const SHEET_HEIGHT: Record<SnapPoint, string> = {
  peek: "18%",
  half: "50%",
  full: "92%",
};

export function VariantB(props: {
  services: MockService[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  mapLoading: boolean;
  mapError: boolean;
  detailService: MockService | null;
  onOpenDetail: (id: string) => void;
  onCloseDetail: () => void;
}) {
  const {
    services,
    selectedId,
    onSelect,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onClearSelection,
    mapLoading,
    mapError,
    detailService,
    onOpenDetail,
    onCloseDetail,
  } = props;

  const [snap, setSnap] = useState<SnapPoint>("peek");

  // Settled decision: selecting in this variant navigates straight to the
  // detail route, no preview layer.
  function handleSelect(id: string) {
    onSelect(id);
    onOpenDetail(id);
  }

  function cycleSnap() {
    setSnap((s) => (s === "peek" ? "half" : s === "half" ? "full" : "peek"));
  }

  if (detailService) {
    return <DetailStub service={detailService} onBack={onCloseDetail} />;
  }

  return (
    <div className="relative h-full">
      {/* Desktop: map full-bleed behind a fixed, docked side panel instead
          of a pull-up sheet — the sheet interaction is a touch/mobile idiom
          that doesn't translate to a mouse-driven desktop session. */}
      <div className="hidden h-full md:flex">
        <div className="min-w-0 flex-1 p-2">
          <MapMock
            services={services}
            selectedId={selectedId}
            onSelect={handleSelect}
            loading={mapLoading}
            error={mapError}
          />
        </div>
        <div className="flex w-[380px] shrink-0 flex-col border-l border-neutral-200 bg-white">
          <BulkActionBar count={selectedIds.size} onClear={onClearSelection} />
          <ServiceTable
            services={services}
            selectedId={selectedId}
            onSelect={handleSelect}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
            dense
          />
        </div>
      </div>

      {/* Mobile/field: map fills the screen, table is a pull-up sheet. */}
      <div className="relative h-full md:hidden">
        <div className="absolute inset-0 p-2" style={{ paddingBottom: SHEET_HEIGHT.peek }}>
          <MapMock
            services={services}
            selectedId={selectedId}
            onSelect={handleSelect}
            loading={mapLoading}
            error={mapError}
          />
        </div>

        <div
          className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border border-neutral-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-[height] duration-300 ease-out"
          style={{ height: SHEET_HEIGHT[snap] }}
        >
          <button
            type="button"
            onClick={cycleSnap}
            className="flex shrink-0 flex-col items-center gap-1 py-2"
            aria-label="Expandir o contraer la lista"
          >
            <GripHorizontal className="h-4 w-4 text-neutral-300" aria-hidden />
            <span className="flex items-center gap-1 text-xs font-medium text-neutral-500">
              {services.length} Servicio{services.length === 1 ? "" : "s"}
              <ChevronUp
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  snap === "full" && "rotate-180",
                )}
                aria-hidden
              />
            </span>
          </button>
          <BulkActionBar count={selectedIds.size} onClear={onClearSelection} />
          <div className="min-h-0 flex-1">
            <ServiceTable
              services={services}
              selectedId={selectedId}
              onSelect={handleSelect}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onToggleSelectAll={onToggleSelectAll}
              dense
            />
          </div>
        </div>
      </div>
    </div>
  );
}
