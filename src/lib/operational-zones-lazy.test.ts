import { describe, expect, it, vi } from "vitest";

const loaded = vi.hoisted(() => vi.fn());
vi.mock("@/data/operational-zones.json", () => {
  loaded();
  return { default: { type: "FeatureCollection", features: [] } };
});

describe("operational zone geometry", () => {
  it("loads geometry only on demand and shares the loaded result", async () => {
    const zones = await import("./operational-zones");
    expect(loaded).not.toHaveBeenCalled();
    await Promise.all([zones.loadOperationalZoneGeometries(), zones.loadOperationalZoneGeometries()]);
    await zones.loadOperationalZoneGeometries();
    expect(loaded).toHaveBeenCalledTimes(1);
  });
});
