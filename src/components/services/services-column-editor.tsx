"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
}

export interface ServicesColumnPreferencesController {
  variant: ServicesColumnVariant;
  isHydrated: boolean;
  preferences: ServicesColumnPreferences;
  setVisible: (key: ServicesColumnKey, visible: boolean) => void;
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

  return {
    variant,
    isHydrated: enabled && state.isHydrated && state.storageKey === storageKey,
    preferences: state.storageKey === storageKey
      ? state.preferences
      : createDefaultServicesColumnPreferences(),
    setVisible,
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
  if (controller.variant === "2") {
    return <DrawerColumnPicker controller={controller} />;
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" disabled={!controller.isHydrated}>
            Columnas
          </Button>
        }
      />
      <PopoverContent
        align="start"
        className="max-h-[min(70vh,38rem)] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-[var(--color-text)] shadow-none ring-0"
      >
        <PopoverHeader className="border-b border-[var(--color-border)] pb-2">
          <PopoverTitle>Columnas</PopoverTitle>
        </PopoverHeader>
        <CheckboxList
          controller={controller}
          layout={controller.variant === "1" ? "data-table" : "cards"}
        />
      </PopoverContent>
    </Popover>
  );
}

function DrawerColumnPicker({
  controller,
}: {
  controller: ServicesColumnPreferencesController;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button type="button" variant="outline" disabled={!controller.isHydrated}>
            Columnas
          </Button>
        }
      />
      <SheetContent
        side="right"
        className="w-[min(26rem,calc(100vw-1rem))] rounded-l-2xl border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-none"
      >
        <SheetHeader className="border-b border-[var(--color-border)] px-4 pb-3 pt-5">
          <SheetTitle>Columnas</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <CheckboxList controller={controller} layout="drawer" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CheckboxList({
  controller,
  layout,
}: {
  controller: ServicesColumnPreferencesController;
  layout: "data-table" | "drawer" | "cards";
}) {
  const id = useId();

  return (
    <fieldset
      className={
        layout === "cards"
          ? "grid grid-cols-2 gap-2 border-0 p-0 pt-3"
          : layout === "drawer"
            ? "flex flex-col gap-2 border-0 p-0 pt-3"
            : "flex flex-col gap-1 border-0 p-0 pt-2"
      }
    >
      <legend className="sr-only">Columnas visibles</legend>
      {controller.preferences.order.map((key) => {
        const definition = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === key)!;
        const checkboxId = `${id}-${key}-visible`;
        const locked = key === "service";

        return (
          <label
            key={key}
            htmlFor={checkboxId}
            className={
              layout === "cards"
                ? `${locked ? "col-span-2 " : ""}flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-[var(--color-border)] px-2.5 py-2 text-sm`
                : layout === "drawer"
                  ? "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm"
                  : "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--color-surface-subtle)]"
            }
          >
            <Checkbox
              id={checkboxId}
              checked={controller.preferences.visibility[key]}
              disabled={!controller.isHydrated || locked}
              onCheckedChange={(checked) => controller.setVisible(key, checked === true)}
            />
            <span className={locked && layout === "cards" ? "min-w-0 flex-1 whitespace-nowrap" : "min-w-0 flex-1 truncate"}>
              {definition.label}
            </span>
            {locked && (
              <span className="shrink-0 whitespace-nowrap text-xs text-[var(--color-text-secondary)]">
                Siempre visible
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
