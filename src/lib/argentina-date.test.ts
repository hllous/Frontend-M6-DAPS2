import { describe, expect, it } from "vitest";

import { argentinaDay, formatArgentinaDateTime, formatCalendarDay, todayInArgentina } from "./argentina-date";

describe("todayInArgentina", () => {
  it("returns the Argentina date even when UTC is already the next day", () => {
    expect(todayInArgentina(new Date("2026-09-21T01:30:00Z"))).toBe("2026-09-20");
  });

  it("returns the UTC date when both zones share the same day", () => {
    expect(todayInArgentina(new Date("2026-09-20T15:00:00Z"))).toBe("2026-09-20");
  });

  it("rolls over at 03:00 UTC (midnight in Argentina)", () => {
    expect(todayInArgentina(new Date("2026-09-21T02:59:59Z"))).toBe("2026-09-20");
    expect(todayInArgentina(new Date("2026-09-21T03:00:00Z"))).toBe("2026-09-21");
  });

  it("defaults to the current instant", () => {
    expect(todayInArgentina()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("argentinaDay", () => {
  it("resolves the Argentina day of an ISO timestamp", () => {
    expect(argentinaDay("2026-09-21T01:30:00.000Z")).toBe("2026-09-20");
    expect(argentinaDay("2026-09-20T12:00:00.000Z")).toBe("2026-09-20");
  });

  it("returns null for values that are not dates", () => {
    expect(argentinaDay("no-es-fecha")).toBeNull();
  });
});

describe("formatCalendarDay", () => {
  it("formats a calendar day without shifting it, from YYYY-MM-DD or the backend's UTC-midnight ISO", () => {
    expect(formatCalendarDay("2026-12-07")).toBe("7 dic 2026");
    expect(formatCalendarDay("2026-12-07T00:00:00.000Z")).toBe("7 dic 2026");
  });

  it("returns values that are not dates untouched", () => {
    expect(formatCalendarDay("sin fecha")).toBe("sin fecha");
  });
});

describe("formatArgentinaDateTime", () => {
  it("formats an instant in Argentina time", () => {
    // Intl separa "a. m." con espacios finos (U+202F), de ahí el \s.
    expect(formatArgentinaDateTime("2026-09-22T13:43:09.525Z")).toMatch(/^22 sept 2026, 10:43\sa\.\sm\.$/);
  });

  it("returns values that are not dates untouched", () => {
    expect(formatArgentinaDateTime("sin fecha")).toBe("sin fecha");
  });
});
