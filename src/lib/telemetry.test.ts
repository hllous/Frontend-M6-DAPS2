import { afterEach, describe, expect, it, vi } from "vitest";

import { recordTelemetryEvent } from "./telemetry";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("allowlisted telemetry", () => {
  it("emits only the allowlisted fields for a given event", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    recordTelemetryEvent({ name: "auth_session_expired", status: 401 });

    expect(infoSpy).toHaveBeenCalledWith("[m6-telemetry]", { name: "auth_session_expired", status: 401 });
  });

  it("strips any field an event object was constructed with outside the allowlist", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const eventWithExtraField = {
      name: "auth_forbidden",
      status: 403,
      token: "leaked-jwt-would-go-here",
    } as unknown as Parameters<typeof recordTelemetryEvent>[0];

    recordTelemetryEvent(eventWithExtraField);

    expect(infoSpy).toHaveBeenCalledWith("[m6-telemetry]", { name: "auth_forbidden", status: 403 });
  });
});
