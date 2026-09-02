"use client";

// Variant A — "Split pane": table and map share the screen as equal,
// resizable citizens (desktop/office-first). Selecting opens a live preview
// panel alongside both — no navigation forced, matching an Office worker
// scanning many Services without losing their place. Resizable panel
// structure adapted from the 21st.dev shadcn Resizable component
// (react-resizable-panels) fetched for this prototype.
import { useState } from "react";
import { ArrowLeftRight, LayoutList, Map as MapIcon } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { MapMock } from "../components/MapMock";
import { ServiceTable, BulkActionBar } from "../components/ServiceTable";
import { ServicePreview } from "../components/ServicePreview";
import { DetailStub } from "../components/DetailStub";
import type { MockService } from "../data";
import { cn } from "@/lib/utils";

export function VariantA(props: {
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

  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [mapSide, setMapSide] = useState<"left" | "right">("right");
  const selected = services.find((s) => s.id === selectedId) ?? null;

  if (detailService) {
    return <DetailStub service={detailService} onBack={onCloseDetail} />;
  }

  return (
    <div className="flex h-full flex-col">
      <BulkActionBar count={selectedIds.size} onClear={onClearSelection} />

      {/* Mobile: tab between list and map (no room for a 2-3 pane split). */}
      <div className="flex border-b border-neutral-200 md:hidden">
        {(["list", "map"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium",
              mobileTab === tab
                ? "border-b-2 border-navy text-navy"
                : "text-neutral-400",
            )}
          >
            {tab === "list" ? (
              <LayoutList className="h-4 w-4" aria-hidden />
            ) : (
              <MapIcon className="h-4 w-4" aria-hidden />
            )}
            {tab === "list" ? "Lista" : "Mapa"}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 md:hidden">
        {mobileTab === "list" ? (
          <ServiceTable
            services={services}
            selectedId={selectedId}
            onSelect={onSelect}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
            dense
          />
        ) : (
          <div className="h-full p-2">
            <MapMock
              services={services}
              selectedId={selectedId}
              onSelect={onSelect}
              loading={mapLoading}
              error={mapError}
            />
          </div>
        )}
      </div>

      {/* Desktop: resizable table | map (either order — see the swap
          control below), with a preview panel anchored to the right edge
          when something is selected. `order` (not JSX order) drives which
          side each pane renders on, so swapping sides doesn't reset
          react-resizable-panels' internal layout. */}
      <div className="relative hidden min-h-0 flex-1 md:block">
        <div className="flex items-center justify-end border-b border-neutral-100 px-2 py-1">
          <button
            type="button"
            onClick={() => setMapSide((s) => (s === "right" ? "left" : "right"))}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-navy"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
            Mapa a la {mapSide === "right" ? "izquierda" : "derecha"}
          </button>
        </div>
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100%-33px)]">
          <ResizablePanel
            id="table"
            order={mapSide === "right" ? 1 : 2}
            defaultSize={45}
            minSize={30}
          >
            <ServiceTable
              services={services}
              selectedId={selectedId}
              onSelect={onSelect}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onToggleSelectAll={onToggleSelectAll}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="map"
            order={mapSide === "right" ? 2 : 1}
            defaultSize={55}
            minSize={25}
          >
            <div className="h-full p-2">
              <MapMock
                services={services}
                selectedId={selectedId}
                onSelect={onSelect}
                loading={mapLoading}
                error={mapError}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {selected && (
          <div className="absolute inset-y-0 right-0 w-[340px] border-l border-neutral-200 bg-white shadow-xl">
            <ServicePreview
              service={selected}
              onOpenDetail={onOpenDetail}
              onClose={() => onSelect(selected.id)}
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}
