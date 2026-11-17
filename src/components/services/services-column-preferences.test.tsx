import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  SERVICES_COLUMN_DEFINITIONS,
  createDefaultServicesColumnPreferences,
  getServicesColumnStorageKey,
  getVisibleServicesColumnOrder,
  moveServicesColumn,
  sanitizeServicesColumnPreferences,
  useServicesColumnPreferences,
} from "./services-column-editor";

beforeEach(() => window.localStorage.clear());

async function hydratedHook(userId = "user-1") {
  const hook = renderHook(() => useServicesColumnPreferences({ userId, variant: "1", data: [] }));
  await waitFor(() => expect(hook.result.current.isHydrated).toBe(true));
  return hook;
}

describe("services column preference helpers", () => {
  it("builds defaults with every column visible at its default width", () => {
    const defaults = createDefaultServicesColumnPreferences();
    expect(defaults.order).toEqual(["service", "status", "zone", "crew", "scheduled"]);
    for (const column of SERVICES_COLUMN_DEFINITIONS) {
      expect(defaults.visibility[column.key]).toBe(true);
      expect(defaults.widths[column.key]).toBe(column.defaultWidth);
    }
  });

  it("falls back to the defaults when the stored value is not an object", () => {
    expect(sanitizeServicesColumnPreferences("roto")).toEqual(createDefaultServicesColumnPreferences());
    expect(sanitizeServicesColumnPreferences(null)).toEqual(createDefaultServicesColumnPreferences());
  });

  it("drops unknown and repeated keys, appends missing ones and keeps Servicio visible", () => {
    const result = sanitizeServicesColumnPreferences({
      order: ["zone", "zone", "inventada", "status"],
      visibility: { service: false, status: false, crew: "no-es-booleano" },
      widths: { zone: 9999, status: 1, crew: "ancho" },
    });

    expect(result.order).toEqual(["zone", "status", "service", "crew", "scheduled"]);
    expect(result.visibility.service).toBe(true);
    expect(result.visibility.status).toBe(false);
    expect(result.visibility.crew).toBe(true);
    const zone = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === "zone")!;
    const status = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === "status")!;
    expect(result.widths.zone).toBe(zone.maximumWidth);
    expect(result.widths.status).toBe(status.minimumWidth);
    expect(result.widths.crew).toBe(SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === "crew")!.defaultWidth);
  });

  it("lists only the visible columns in the stored order", () => {
    const preferences = sanitizeServicesColumnPreferences({ order: ["scheduled", "service"], visibility: { zone: false } });
    expect(getVisibleServicesColumnOrder(preferences)).toEqual(["scheduled", "service", "status", "crew"]);
  });

  it("moves a column one step and ignores moves past either end", () => {
    const order = ["service", "status", "zone"] as const;
    expect(moveServicesColumn(order, "status", "next")).toEqual(["service", "zone", "status"]);
    expect(moveServicesColumn(order, "status", "previous")).toEqual(["status", "service", "zone"]);
    expect(moveServicesColumn(order, "service", "previous")).toEqual(["service", "status", "zone"]);
    expect(moveServicesColumn(order, "zone", "next")).toEqual(["service", "status", "zone"]);
    expect(moveServicesColumn(order, "crew", "next")).toEqual(["service", "status", "zone"]);
  });

  it("scopes the storage key to the user and variant", () => {
    expect(getServicesColumnStorageKey({ userId: "a b", variant: "1" })).toBe("m6:services-columns:v1:a%20b:1");
  });
});

describe("useServicesColumnPreferences", () => {
  it("restores stored preferences once hydrated", async () => {
    window.localStorage.setItem(getServicesColumnStorageKey({ userId: "user-1", variant: "1" }), JSON.stringify({ order: ["crew"], visibility: { zone: false } }));
    const { result } = await hydratedHook();

    expect(result.current.preferences.order[0]).toBe("crew");
    expect(result.current.table.getColumn("zone")?.getIsVisible()).toBe(false);
  });

  it("ignores an unreadable stored value", async () => {
    window.localStorage.setItem(getServicesColumnStorageKey({ userId: "user-1", variant: "1" }), "{no es json");
    const { result } = await hydratedHook();
    expect(result.current.preferences).toEqual(createDefaultServicesColumnPreferences());
  });

  it("hides and shows a column but never hides Servicio", async () => {
    const { result } = await hydratedHook();

    act(() => result.current.setVisible("zone", false));
    expect(result.current.preferences.visibility.zone).toBe(false);
    act(() => result.current.setVisible("service", false));
    expect(result.current.preferences.visibility.service).toBe(true);
    act(() => result.current.setVisible("zone", true));
    expect(result.current.preferences.visibility.zone).toBe(true);
  });

  it("reorders columns step by step and by explicit order", async () => {
    const { result } = await hydratedHook();

    act(() => result.current.moveColumn("status", "next"));
    expect(result.current.preferences.order).toEqual(["service", "zone", "status", "crew", "scheduled"]);
    act(() => result.current.setOrder(["scheduled", "crew", "zone", "status", "service"]));
    expect(result.current.preferences.order).toEqual(["scheduled", "crew", "zone", "status", "service"]);
    expect(result.current.table.getVisibleLeafColumns().map((column) => column.id)).toEqual(["ordinal", "scheduled", "crew", "zone", "status", "service"]);
  });

  it("clamps widths, applies presets, resets one width and rejects non-finite values", async () => {
    const { result } = await hydratedHook();
    const zone = SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === "zone")!;

    act(() => result.current.setWidth("zone", 100000));
    expect(result.current.preferences.widths.zone).toBe(zone.maximumWidth);
    act(() => result.current.setWidth("zone", Number.NaN));
    expect(result.current.preferences.widths.zone).toBe(zone.maximumWidth);
    act(() => result.current.applyWidthPreset("zone", "compact"));
    expect(result.current.preferences.widths.zone).toBe(zone.presets.compact);
    act(() => result.current.applyWidthPreset("zone", "wide"));
    expect(result.current.preferences.widths.zone).toBe(zone.presets.wide);
    act(() => result.current.resetWidth("zone"));
    expect(result.current.preferences.widths.zone).toBe(zone.defaultWidth);
  });

  it("resets every preference to the defaults", async () => {
    const { result } = await hydratedHook();
    act(() => { result.current.setVisible("crew", false); result.current.moveColumn("status", "next"); });
    act(() => result.current.reset());
    expect(result.current.preferences).toEqual(createDefaultServicesColumnPreferences());
  });

  it("applies the table callbacks to the stored preferences", async () => {
    const { result } = await hydratedHook();

    act(() => result.current.table.setColumnVisibility({ zone: false, ordinal: true }));
    expect(result.current.preferences.visibility.zone).toBe(false);
    expect(result.current.preferences.visibility.status).toBe(true);

    act(() => result.current.table.setColumnOrder(["ordinal", "crew", "service", "status", "zone", "scheduled"]));
    expect(result.current.preferences.order[0]).toBe("crew");

    act(() => result.current.table.setColumnSizing({ status: 5000 }));
    expect(result.current.preferences.widths.status).toBe(SERVICES_COLUMN_DEFINITIONS.find((column) => column.key === "status")!.maximumWidth);
  });

  it("persists the changes after the debounce", async () => {
    const { result } = await hydratedHook("user-persist");
    act(() => result.current.setVisible("crew", false));

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(getServicesColumnStorageKey({ userId: "user-persist", variant: "1" })) ?? "{}");
      expect(saved.visibility?.crew).toBe(false);
    });
  });

  it("stays at the defaults and unhydrated when disabled", () => {
    const { result } = renderHook(() => useServicesColumnPreferences({ userId: "user-1", variant: "1", enabled: false }));
    expect(result.current.isHydrated).toBe(false);
    expect(result.current.preferences).toEqual(createDefaultServicesColumnPreferences());
  });
});
