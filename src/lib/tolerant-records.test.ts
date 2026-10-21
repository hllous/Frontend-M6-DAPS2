import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { tolerantRecords } from "./tolerant-records";

const itemSchema = z.object({ id: z.string(), status: z.enum(["OPEN", "CLOSED"]) });

describe("tolerantRecords", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps valid records and drops, with a warning, the ones the contract does not know", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const parsed = z.object({ data: tolerantRecords(itemSchema, "trees") }).parse({
      data: [{ id: "a", status: "OPEN" }, { id: "b", status: "FUTURE_STATUS" }, { id: "c", status: "CLOSED" }],
    });
    expect(parsed.data.map((item) => item.id)).toEqual(["a", "c"]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("trees");
    expect(warn.mock.calls[0]?.[0]).toContain("b");
    expect(warn.mock.calls[0]?.[0]).toContain("FUTURE_STATUS");
  });

  it("still fails the page on a record that is malformed for another reason", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const schema = z.object({ data: tolerantRecords(itemSchema, "trees") });
    expect(schema.safeParse({ data: [{ id: "a", status: "OPEN" }, { nope: 1 }] }).success).toBe(false);
    expect(schema.safeParse({ data: [{ id: 7, status: "FUTURE_STATUS" }] }).success).toBe(false);
  });

  it("still rejects a payload that is not an array", () => {
    expect(z.object({ data: tolerantRecords(itemSchema, "trees") }).safeParse({ data: "x" }).success).toBe(false);
  });
});
