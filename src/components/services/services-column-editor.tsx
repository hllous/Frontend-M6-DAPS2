"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import type { Service } from "@/lib/services";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ServicesColumnKey =
  | "service"
  | "status"
  | "zone"
  | "crew"
  | "scheduled";

export type ServicesColumnVariant = "1" | "2" | "3";
export type ServicesColumnMoveDirection = "previous" | "next";
export type ServicesColumnWidthPreset = "compact" | "balanced" | "wide";

export interface ServicesColumnDefinition {
  key: ServicesColumnKey;
  label: string;
  minimumWidth: number;
  maximumWidth: number;
  defaultWidth: number;
  presets: Record<ServicesColumnWidthPreset, number>;
}

// The ordinal (#) is fixed in the table and intentionally has no preference key.
export const SERVICES_COLUMN_DEFINITIONS: readonly ServicesColumnDefinition[] = [
  {
    key: "service",
    label: "Servicio",
    minimumWidth: 180,
    maximumWidth: 380,
    defaultWidth: 250,
    presets: { compact: 180, balanced: 250, wide: 350 },
  },
  {
    key: "status",
    label: "Estado",
    minimumWidth: 130,
    maximumWidth: 240,
    defaultWidth: 180,
    presets: { compact: 130, balanced: 180, wide: 230 },
  },
  {
    key: "zone",
    label: "Zona",
    minimumWidth: 110,
    maximumWidth: 280,
    defaultWidth: 150,
    presets: { compact: 110, balanced: 150, wide: 240 },
  },
  {
    key: "crew",
    label: "Equipo",
    minimumWidth: 120,
    maximumWidth: 280,
    defaultWidth: 160,
    presets: { compact: 120, balanced: 160, wide: 240 },
  },
  {
    key: "scheduled",
    label: "Fecha",
    minimumWidth: 130,
    maximumWidth: 280,
    defaultWidth: 180,
    presets: { compact: 130, balanced: 180, wide: 240 },
  },
] as const;

const SERVICES_TABLE_FEATURES = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnResizingFeature,
});

type ServicesTanStackTable = ReactTable<typeof SERVICES_TABLE_FEATURES, Service>;

const TANSTACK_SERVICE_COLUMNS: ColumnDef<typeof SERVICES_TABLE_FEATURES, Service>[] = [
  {
    id: "ordinal",
    accessorFn: (_service, index) => index + 1,
    enableHiding: false,
    enableResizing: false,
    size: 56,
  },
  ...SERVICES_COLUMN_DEFINITIONS.map((column) => ({
    id: column.key,
    header: column.label,
    accessorFn: (service: Service) => {
      switch (column.key) {
        case "service": return service.title;
        case "status": return service.status;
        case "zone": return service.zoneNames.join(", ");
        case "crew": return service.crewName ?? "Sin asignar";
        case "scheduled": return service.scheduledDate;
      }
    },
    enableHiding: column.key !== "service",
    size: column.defaultWidth,
    minSize: column.minimumWidth,
    maxSize: column.maximumWidth,
  })),
];

const COLUMN_KEYS = SERVICES_COLUMN_DEFINITIONS.map(({ key }) => key);

export interface ServicesColumnPreferences {
  order: ServicesColumnKey[];
  visibility: Record<ServicesColumnKey, boolean>;
  widths: Record<ServicesColumnKey, number>;
}

export interface UseServicesColumnPreferencesOptions {
  userId: string;
  variant: ServicesColumnVariant;
  enabled?: boolean;
  data?: Service[];
}

export interface ServicesColumnPreferencesController {
  variant: ServicesColumnVariant;
  isHydrated: boolean;
  preferences: ServicesColumnPreferences;
  table: ServicesTanStackTable;
  setVisible: (key: ServicesColumnKey, visible: boolean) => void;
  setOrder: (order: readonly ServicesColumnKey[]) => void;
  moveColumn: (
    key: ServicesColumnKey,
    direction: ServicesColumnMoveDirection,
  ) => void;
  setWidth: (key: ServicesColumnKey, width: number) => void;
  applyWidthPreset: (
    key: ServicesColumnKey,
    preset: ServicesColumnWidthPreset,
  ) => void;
  resetWidth: (key: ServicesColumnKey) => void;
  reset: () => void;
}

const STORAGE_PREFIX = "m6:services-columns:v1";

function isColumnKey(value: unknown): value is ServicesColumnKey {
  return typeof value === "string" && COLUMN_KEYS.includes(value as ServicesColumnKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampWidth(key: ServicesColumnKey, value: number): number {
  const definition = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === key)!;
  return Math.round(
    Math.min(definition.maximumWidth, Math.max(definition.minimumWidth, value)),
  );
}

export function createDefaultServicesColumnPreferences(): ServicesColumnPreferences {
  const visibility = {} as Record<ServicesColumnKey, boolean>;
  const widths = {} as Record<ServicesColumnKey, number>;

  for (const column of SERVICES_COLUMN_DEFINITIONS) {
    visibility[column.key] = true;
    widths[column.key] = column.defaultWidth;
  }

  return {
    order: [...COLUMN_KEYS],
    visibility,
    widths,
  };
}

export function sanitizeServicesColumnPreferences(
  value: unknown,
): ServicesColumnPreferences {
  const defaults = createDefaultServicesColumnPreferences();
  if (!isRecord(value)) return defaults;

  const seen = new Set<ServicesColumnKey>();
  const order: ServicesColumnKey[] = [];
  if (Array.isArray(value.order)) {
    for (const key of value.order) {
      if (isColumnKey(key) && !seen.has(key)) {
        seen.add(key);
        order.push(key);
      }
    }
  }
  for (const key of COLUMN_KEYS) {
    if (!seen.has(key)) order.push(key);
  }

  const visibility = { ...defaults.visibility };
  const widths = { ...defaults.widths };
  if (isRecord(value.visibility)) {
    for (const key of COLUMN_KEYS) {
      if (typeof value.visibility[key] === "boolean") {
        visibility[key] = value.visibility[key] as boolean;
      }
    }
  }
  if (isRecord(value.widths)) {
    for (const key of COLUMN_KEYS) {
      const width = value.widths[key];
      if (typeof width === "number" && Number.isFinite(width)) {
        widths[key] = clampWidth(key, width);
      }
    }
  }

  // Servicio is required by the agreed table layout.
  visibility.service = true;

  return { order, visibility, widths };
}

export function getVisibleServicesColumnOrder(
  preferences: ServicesColumnPreferences,
): ServicesColumnKey[] {
  const normalized = sanitizeServicesColumnPreferences(preferences);
  return normalized.order.filter((key) => normalized.visibility[key]);
}

export function moveServicesColumn(
  order: readonly ServicesColumnKey[],
  key: ServicesColumnKey,
  direction: ServicesColumnMoveDirection,
): ServicesColumnKey[] {
  const next = [...order];
  const index = next.indexOf(key);
  const targetIndex = index + (direction === "previous" ? -1 : 1);
  if (index < 0 || targetIndex < 0 || targetIndex >= next.length) return next;

  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function getServicesColumnStorageKey({
  userId,
  variant,
}: Pick<UseServicesColumnPreferencesOptions, "userId" | "variant">): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}:${variant}`;
}

function readPreferences(storageKey: string): ServicesColumnPreferences {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved
      ? sanitizeServicesColumnPreferences(JSON.parse(saved) as unknown)
      : createDefaultServicesColumnPreferences();
  } catch {
    return createDefaultServicesColumnPreferences();
  }
}

function writePreferences(
  storageKey: string,
  preferences: ServicesColumnPreferences,
): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // Storage can be disabled or full; the current view remains usable in memory.
  }
}

interface StoredPreferencesState {
  storageKey: string;
  isHydrated: boolean;
  preferences: ServicesColumnPreferences;
}

export function useServicesColumnPreferences({
  userId,
  variant,
  enabled = true,
  data = [],
}: UseServicesColumnPreferencesOptions): ServicesColumnPreferencesController {
  const storageKey = getServicesColumnStorageKey({ userId, variant });
  const [state, setState] = useState<StoredPreferencesState>(() => ({
    storageKey: "",
    isHydrated: false,
    preferences: createDefaultServicesColumnPreferences(),
  }));

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    // Storage is read after hydration so the server and initial client render use the same defaults.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      storageKey,
      isHydrated: true,
      preferences: readPreferences(storageKey),
    });
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!enabled || !state.isHydrated || state.storageKey !== storageKey) return;
    const timeout = window.setTimeout(() => writePreferences(storageKey, state.preferences), 120);
    return () => window.clearTimeout(timeout);
  }, [enabled, state, storageKey]);

  const update = useCallback(
    (change: (current: ServicesColumnPreferences) => ServicesColumnPreferences) => {
      setState((current) => {
        if (!current.isHydrated || current.storageKey !== storageKey) return current;
        return {
          ...current,
          preferences: sanitizeServicesColumnPreferences(change(current.preferences)),
        };
      });
    },
    [storageKey],
  );

  const setVisible = useCallback(
    (key: ServicesColumnKey, visible: boolean) => {
      if (key === "service") return;
      update((current) => ({
        ...current,
        visibility: { ...current.visibility, [key]: visible },
      }));
    },
    [update],
  );

  const moveColumn = useCallback(
    (key: ServicesColumnKey, direction: ServicesColumnMoveDirection) => {
      update((current) => ({
        ...current,
        order: moveServicesColumn(current.order, key, direction),
      }));
    },
    [update],
  );

  const setOrder = useCallback(
    (order: readonly ServicesColumnKey[]) => {
      update((current) => ({ ...current, order: [...order] }));
    },
    [update],
  );

  const setWidth = useCallback(
    (key: ServicesColumnKey, width: number) => {
      if (!Number.isFinite(width)) return;
      update((current) => ({
        ...current,
        widths: { ...current.widths, [key]: clampWidth(key, width) },
      }));
    },
    [update],
  );

  const applyWidthPreset = useCallback(
    (key: ServicesColumnKey, preset: ServicesColumnWidthPreset) => {
      const definition = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === key)!;
      setWidth(key, definition.presets[preset]);
    },
    [setWidth],
  );

  const resetWidth = useCallback(
    (key: ServicesColumnKey) => {
      const definition = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === key)!;
      setWidth(key, definition.defaultWidth);
    },
    [setWidth],
  );

  const reset = useCallback(() => {
    update(() => createDefaultServicesColumnPreferences());
  }, [update]);

  const preferences = state.storageKey === storageKey
    ? state.preferences
    : createDefaultServicesColumnPreferences();
  const table = useTable({
    features: SERVICES_TABLE_FEATURES,
    data,
    columns: TANSTACK_SERVICE_COLUMNS,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    state: {
      columnOrder: ["ordinal", ...preferences.order],
      columnVisibility: { ...preferences.visibility, ordinal: true },
      columnSizing: preferences.widths,
    },
    onColumnOrderChange: (updater) => {
      update((current) => {
        const currentOrder = ["ordinal", ...current.order];
        const next = typeof updater === "function" ? updater(currentOrder) : updater;
        return { ...current, order: next.filter(isColumnKey) };
      });
    },
    onColumnVisibilityChange: (updater) => {
      update((current) => {
        const currentVisibility = { ...current.visibility, ordinal: true };
        const next = typeof updater === "function" ? updater(currentVisibility) : updater;
        const visibility = { ...current.visibility };
        for (const key of COLUMN_KEYS) {
          if (key !== "service") visibility[key] = next[key] !== false;
        }
        return { ...current, visibility };
      });
    },
    onColumnSizingChange: (updater) => {
      update((current) => {
        const next = typeof updater === "function" ? updater(current.widths) : updater;
        const widths = { ...current.widths };
        for (const key of COLUMN_KEYS) {
          if (typeof next[key] === "number") widths[key] = clampWidth(key, next[key]);
        }
        return { ...current, widths };
      });
    },
  });

  return {
    variant,
    isHydrated: enabled && state.isHydrated && state.storageKey === storageKey,
    preferences,
    table,
    setVisible,
    setOrder,
    moveColumn,
    setWidth,
    applyWidthPreset,
    resetWidth,
    reset,
  };
}

export function ServicesColumnEditor({
  controller,
}: {
  controller: ServicesColumnPreferencesController;
}) {
  const columns = controller.preferences.order.filter((key) => key !== "service");
  const trigger = (
    <Button type="button" variant="outline" disabled={!controller.isHydrated} className="ml-auto">
      Datos
    </Button>
  );

  if (controller.variant === "2") {
    return (
      <Sheet>
        <SheetTrigger render={trigger} />
        <SheetContent
          side="right"
          className="w-[min(24rem,calc(100vw-1rem))] rounded-l-2xl border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-none"
        >
          <SheetHeader className="border-b border-[var(--color-border)] px-4 pb-3 pt-5">
            <SheetTitle>Datos</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
            {columns.map((key) => (
              <ColumnVisibilityCheckbox key={key} columnKey={key} controller={controller} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (controller.variant === "3") {
    return (
      <Popover>
        <PopoverTrigger render={trigger} />
        <PopoverContent
          align="end"
          className="w-[min(20rem,calc(100vw-1rem))] rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-[var(--color-text)] shadow-none ring-0"
        >
          <PopoverHeader className="border-b border-[var(--color-border)] pb-2">
            <PopoverTitle>Datos</PopoverTitle>
          </PopoverHeader>
          <div className="flex flex-col gap-1 pt-2">
            {columns.map((key) => (
              <ColumnVisibilityCheckbox key={key} columnKey={key} controller={controller} />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="w-48">
        {columns.map((key) => {
          const definition = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === key)!;

          return (
            <DropdownMenuCheckboxItem
              key={key}
              checked={controller.table.getColumn(key)?.getIsVisible() ?? controller.preferences.visibility[key]}
              disabled={!controller.isHydrated}
              onCheckedChange={(checked) => controller.table.getColumn(key)?.toggleVisibility(checked)}
            >
              {definition.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColumnVisibilityCheckbox({
  columnKey,
  controller,
}: {
  columnKey: ServicesColumnKey;
  controller: ServicesColumnPreferencesController;
}) {
  const definition = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === columnKey)!;
  const id = `service-column-${controller.variant}-${columnKey}`;

  return (
    <label
      htmlFor={id}
      className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--color-surface-subtle)]"
    >
      <input
        id={id}
        type="checkbox"
        checked={controller.preferences.visibility[columnKey]}
        disabled={!controller.isHydrated}
        onChange={(event) => controller.setVisible(columnKey, event.currentTarget.checked)}
        className="size-4 shrink-0 accent-[var(--color-action)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
      />
      <span className="min-w-0 flex-1 truncate">{definition.label}</span>
    </label>
  );
}
