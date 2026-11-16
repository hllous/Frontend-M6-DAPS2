import { describe, expect, it } from "vitest";

import { randomInt, randomUuid } from "./random-id";

describe("random-id", () => {
  it("randomUuid devuelve UUID v4 distintos", () => {
    const a = randomUuid();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(randomUuid()).not.toBe(a);
  });

  it("randomInt respeta el rango inclusivo", () => {
    const values = Array.from({ length: 500 }, () => randomInt(1000, 9999));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(1000);
    expect(Math.max(...values)).toBeLessThanOrEqual(9999);
    expect(randomInt(5, 5)).toBe(5);
  });
});
