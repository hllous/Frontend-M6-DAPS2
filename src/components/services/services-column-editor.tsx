"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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

export type ServicesColumnVariant = "g" | "h" | "i";
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
    label: "Cuadrilla",
    minimumWidth: 120,
    maximumWidth: 280,
    defaultWidth: 160,
    presets: { compact: 120, balanced: 160, wide: 240 },
  },
  {
    key: "scheduled",
    label: "Programado",
    minimumWidth: 130,
    maximumWidth: 280,
    defaultWidth: 180,
    presets: { compact: 130, balanced: 180, wide: 240 },
  },
] as const;

const COLUMN_KEYS = SERVICES_COLUMN_DEFINITIONS.map(({ key }) => key);
const WIDTH_PRESETS: readonly {
  key: ServicesColumnWidthPreset;
  label: string;
}[] = [
  { key: "compact", label: "Compacto" },
  { key: "balanced", label: "Equilibrado" },
  { key: "wide", label: "Amplio" },
];

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

  // The service column is required by the agreed table layout.
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

interface ServicesColumnEditorProps {
  controller: ServicesColumnPreferencesController;
  columnKey?: ServicesColumnKey;
}

export function ServicesColumnEditor({
  controller,
  columnKey,
}: ServicesColumnEditorProps) {
  if (controller.variant === "g") return <PopoverEditor controller={controller} />;
  if (controller.variant === "h") return <SheetEditor controller={controller} />;

  if (columnKey) {
    return <ColumnContextMenu controller={controller} columnKey={columnKey} compact />;
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Opciones de columnas">
      {SERVICES_COLUMN_DEFINITIONS.map(({ key }) => (
        <ColumnContextMenu key={key} controller={controller} columnKey={key} />
      ))}
    </div>
  );
}

export function ServicesColumnHeaderMenu({
  controller,
  columnKey,
}: {
  controller: ServicesColumnPreferencesController;
  columnKey: ServicesColumnKey;
}) {
  return <ColumnContextMenu controller={controller} columnKey={columnKey} compact />;
}

function PopoverEditor({
  controller,
}: {
  controller: ServicesColumnPreferencesController;
}) {
  const [announcement, setAnnouncement] = useState("");

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
        align="end"
        className="max-h-[min(70vh,38rem)] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-[var(--color-text)] shadow-none ring-0"
      >
        <PopoverHeader className="border-b border-[var(--color-border)] pb-2">
          <PopoverTitle>Columnas</PopoverTitle>
        </PopoverHeader>
        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="sr-only">Columnas visibles y orden</legend>
          <ColumnRows
            controller={controller}
            showRangeControls
            onAnnounce={setAnnouncement}
          />
        </fieldset>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </PopoverContent>
    </Popover>
  );
}

function SheetEditor({
  controller,
}: {
  controller: ServicesColumnPreferencesController;
}) {
  const [announcement, setAnnouncement] = useState("");

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button type="button" variant="outline" disabled={!controller.isHydrated}>
            Editar columnas
          </Button>
        }
      />
      <SheetContent
        side="right"
        className="w-[min(28rem,calc(100vw-1rem))] rounded-l-2xl border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-none"
      >
        <SheetHeader className="border-b border-[var(--color-border)] px-4 pb-3 pt-5">
          <SheetTitle>Columnas</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <fieldset className="flex flex-col gap-3 border-0 p-0">
            <legend className="sr-only">Columnas visibles, orden y ancho</legend>
            <ColumnRows
              controller={controller}
              showWidthPresets
              onAnnounce={setAnnouncement}
            />
          </fieldset>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {announcement}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ColumnRows({
  controller,
  showRangeControls = false,
  showWidthPresets = false,
  onAnnounce,
}: {
  controller: ServicesColumnPreferencesController;
  showRangeControls?: boolean;
  showWidthPresets?: boolean;
  onAnnounce: (message: string) => void;
}) {
  const id = useId();
  const { preferences } = controller;

  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {preferences.order.map((key, index) => {
        const definition = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === key)!;
        const checkboxId = `${id}-${key}-visible`;
        const rangeId = `${id}-${key}-width`;
        const currentWidth = preferences.widths[key];

        return (
          <li
            key={key}
            className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-2.5"
          >
            <div className="flex min-h-10 items-center gap-2">
              <Checkbox
                id={checkboxId}
                checked={preferences.visibility[key]}
                disabled={!controller.isHydrated || key === "service"}
                onCheckedChange={(checked) => controller.setVisible(key, checked === true)}
              />
              <label
                htmlFor={checkboxId}
                className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text)]"
              >
                {definition.label}
              </label>
              <ColumnOrderButtons
                columnKey={key}
                index={index}
                total={preferences.order.length}
                disabled={!controller.isHydrated}
                onMove={controller.moveColumn}
                onAnnounce={onAnnounce}
              />
            </div>

            {showRangeControls && (
              <label htmlFor={rangeId} className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                <span>Ancho de {definition.label}: {Math.round(currentWidth / Object.values(preferences.widths).reduce((sum, width) => sum + width, 0) * 100)} %</span>
                <input
                  id={rangeId}
                  type="range"
                  min={definition.minimumWidth}
                  max={definition.maximumWidth}
                  step={10}
                  value={currentWidth}
                  disabled={!controller.isHydrated}
                  aria-valuetext={`${Math.round(currentWidth / Object.values(preferences.widths).reduce((sum, width) => sum + width, 0) * 100)} % del ancho de la tabla`}
                  onChange={(event) => controller.setWidth(key, Number(event.currentTarget.value))}
                  className="h-6 w-full cursor-pointer accent-[var(--color-action)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed"
                />
              </label>
            )}

            {showWidthPresets && (
              <fieldset className="flex flex-col gap-1.5 border-0 p-0">
                <legend className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Ancho de {definition.label}
                </legend>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Ancho de ${definition.label}`}>
                  {WIDTH_PRESETS.map(({ key: preset, label }) => (
                    <Button
                      key={preset}
                      type="button"
                      size="sm"
                      variant={currentWidth === definition.presets[preset] ? "default" : "outline"}
                      disabled={!controller.isHydrated}
                      aria-pressed={currentWidth === definition.presets[preset]}
                      onClick={() => controller.applyWidthPreset(key, preset)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </fieldset>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ColumnOrderButtons({
  columnKey,
  index,
  total,
  disabled,
  onMove,
  onAnnounce,
}: {
  columnKey: ServicesColumnKey;
  index: number;
  total: number;
  disabled: boolean;
  onMove: ServicesColumnPreferencesController["moveColumn"];
  onAnnounce: (message: string) => void;
}) {
  const label = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === columnKey)!.label;

  function move(direction: ServicesColumnMoveDirection) {
    onMove(columnKey, direction);
    const nextPosition = index + (direction === "previous" ? 0 : 2);
    onAnnounce(`${label}, posición ${nextPosition} de ${total}.`);
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled || index === 0}
        aria-label={`Mover ${label} hacia arriba`}
        onClick={() => move("previous")}
      >
        <ArrowUp data-icon="inline-start" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled || index === total - 1}
        aria-label={`Mover ${label} hacia abajo`}
        onClick={() => move("next")}
      >
        <ArrowDown data-icon="inline-start" />
      </Button>
    </div>
  );
}

function ColumnContextMenu({
  controller,
  columnKey,
  compact = false,
}: {
  controller: ServicesColumnPreferencesController;
  columnKey: ServicesColumnKey;
  compact?: boolean;
}) {
  const [announcement, setAnnouncement] = useState("");
  const definition = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === columnKey)!;
  const index = controller.preferences.order.indexOf(columnKey);
  const visible = controller.preferences.visibility[columnKey];
  const disabled = !controller.isHydrated;

  function move(direction: ServicesColumnMoveDirection) {
    controller.moveColumn(columnKey, direction);
    const nextPosition = index + (direction === "previous" ? 0 : 2);
    setAnnouncement(`${definition.label}, posición ${nextPosition} de ${controller.preferences.order.length}.`);
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        aria-haspopup="menu"
        aria-label={`Opciones de columna: ${definition.label}. Menú contextual disponible.`}
        render={
          <Button
            type="button"
            variant="outline"
            size={compact ? "icon-sm" : "sm"}
            disabled={disabled}
          >
            {compact ? (
              <MoreHorizontal data-icon="inline-start" aria-hidden="true" />
            ) : (
              <>
                <span>{definition.label}</span>
                <MoreHorizontal data-icon="inline-end" aria-hidden="true" />
              </>
            )}
          </Button>
        }
      />
      <ContextMenuContent className="max-h-[min(70vh,32rem)] min-w-52 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-none ring-0">
        <ContextMenuLabel>{definition.label}</ContextMenuLabel>
        <ContextMenuItem
          disabled={disabled || columnKey === "service"}
          onClick={() => controller.setVisible(columnKey, !visible)}
        >
          {visible ? "Ocultar columna" : "Mostrar columna"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={disabled || index === 0} onClick={() => move("previous")}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Mover a la izquierda
        </ContextMenuItem>
        <ContextMenuItem
          disabled={disabled || index === controller.preferences.order.length - 1}
          onClick={() => move("next")}
        >
          <ArrowRight data-icon="inline-start" aria-hidden="true" />
          Mover a la derecha
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Ancho</ContextMenuSubTrigger>
          <ContextMenuSubContent className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-none ring-0">
            {WIDTH_PRESETS.map(({ key: preset, label }) => (
              <ContextMenuItem
                key={preset}
                onClick={() => controller.applyWidthPreset(columnKey, preset)}
              >
                {label}
              </ContextMenuItem>
            ))}
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => controller.resetWidth(columnKey)}>
              Restablecer ancho
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </ContextMenu>
  );
}
