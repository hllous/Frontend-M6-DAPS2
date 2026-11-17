// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { authenticatedFetch } from "./authenticated-fetch";
import { recordVersion, resetRecordVersions, STALE_RECORD_EVENT, withRecordVersion } from "./record-versions";

afterEach(() => {
  resetRecordVersions();
  vi.restoreAllMocks();
});

function sentIfMatch(fetchSpy: { mock: { calls: unknown[][] } }, call = 0) {
  return new Headers((fetchSpy.mock.calls[call]?.[1] as RequestInit | undefined)?.headers).get("if-match");
}

describe("record versions (concurrencia optimista)", () => {
  it("sends the ETag read from GET /:id as If-Match on a transition of that record", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: "cont-1", updatedAt: "2026-09-01T00:00:00.000Z" }, { headers: { etag: 'W/"111"' } }))
      .mockResolvedValueOnce(Response.json({ id: "cont-1" }, { headers: { etag: 'W/"222"' } }))
      .mockResolvedValueOnce(Response.json({ id: "cont-1" }));

    await authenticatedFetch("/api/containers/cont-1");
    await authenticatedFetch("/api/containers/cont-1/empty", { method: "POST" });
    expect(sentIfMatch(fetchSpy, 1)).toBe('W/"111"');

    // La respuesta de la escritura trae la versión nueva: la siguiente acción la usa.
    await authenticatedFetch("/api/containers/cont-1/relocate", { method: "POST" });
    expect(sentIfMatch(fetchSpy, 2)).toBe('W/"222"');
  });

  it("derives the version from updatedAt for list items, as the backend computes the ETag", async () => {
    const updatedAt = "2026-11-16T12:00:00.123Z";
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ data: [{ id: "SVC-1", updatedAt }, { id: "SVC-2" }], meta: {} }))
      .mockResolvedValue(Response.json({ id: "SVC-1" }));

    await authenticatedFetch("/api/services?page=1");
    expect(recordVersion("services", "SVC-1")).toBe(`W/"${Date.parse(updatedAt)}"`);
    expect(recordVersion("services", "SVC-2")).toBeUndefined();

    await authenticatedFetch("/api/services/SVC-1/start", { method: "POST" });
    expect(sentIfMatch(fetchSpy, 1)).toBe(`W/"${Date.parse(updatedAt)}"`);
  });

  it("matches ids written with encodeURIComponent and accepts a top-level array list", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ id: "ER 1", updatedAt: "2026-09-01T00:00:00.000Z" }]));
    await authenticatedFetch("/api/environmental-reports");
    const init = withRecordVersion("/api/environmental-reports/ER%201/close", { method: "POST" });
    expect(new Headers(init?.headers).get("if-match")).toBe(`W/"${Date.parse("2026-09-01T00:00:00.000Z")}"`);
  });

  it("sends no If-Match when the record was never read, and leaves non-versioned writes alone", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "SVC-1", updatedAt: "2026-09-01T00:00:00.000Z" }));
    await authenticatedFetch("/api/services/SVC-9/start", { method: "POST" });
    expect(sentIfMatch(fetchSpy, 0)).toBeNull();

    await authenticatedFetch("/api/services/SVC-1");
    // assign-crew y zone-results no están cubiertos por el ADR-012 del backend.
    await authenticatedFetch("/api/services/SVC-1/assign-crew", { method: "POST" });
    await authenticatedFetch("/api/services/SVC-1/zone-results", { method: "POST" });
    expect(sentIfMatch(fetchSpy, 2)).toBeNull();
    expect(sentIfMatch(fetchSpy, 3)).toBeNull();
  });

  it("uses If-Match on the PATCH of containers but not on resources without a versioned PATCH", () => {
    vi.spyOn(globalThis, "fetch");
    expect(withRecordVersion("/api/tree-interventions/i-1", { method: "PATCH" })).toEqual({ method: "PATCH" });
  });

  it("keeps an If-Match the caller set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: "cont-1" }, { headers: { etag: 'W/"111"' } }))
      .mockResolvedValueOnce(Response.json({ id: "cont-1" }));
    await authenticatedFetch("/api/containers/cont-1");
    await authenticatedFetch("/api/containers/cont-1", { method: "PATCH", headers: { "if-match": "*" } });
    expect(sentIfMatch(fetchSpy, 1)).toBe("*");
  });

  it("ignores the ETag of nested reads such as the inspections of a report", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ id: "ER-1", updatedAt: "2026-09-01T00:00:00.000Z" }], { headers: { etag: 'W/"2a-abc"' } }));
    await authenticatedFetch("/api/environmental-reports/ER-1/inspections");
    expect(recordVersion("environmental-reports", "ER-1")).toBeUndefined();
  });

  it("announces a 412 on a versioned write and keeps the read version", async () => {
    const listener = vi.fn();
    window.addEventListener(STALE_RECORD_EVENT, listener);
    try {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({ id: "cont-1" }, { headers: { etag: 'W/"111"' } }))
        .mockResolvedValueOnce(Response.json({ statusCode: 412, message: "Otra persona modificó este registro." }, { status: 412 }));
      await authenticatedFetch("/api/containers/cont-1");
      const response = await authenticatedFetch("/api/containers/cont-1/empty", { method: "POST" });

      expect(response.status).toBe(412);
      expect(listener).toHaveBeenCalledTimes(1);
      expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ resource: "containers", id: "cont-1" });
      // No se reintenta con otra versión: el usuario recarga.
      expect(recordVersion("containers", "cont-1")).toBe('W/"111"');
    } finally {
      window.removeEventListener(STALE_RECORD_EVENT, listener);
    }
  });

  it("does not consume the body the caller reads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [{ id: "cont-1", updatedAt: "2026-09-01T00:00:00.000Z" }] }));
    const response = await authenticatedFetch("/api/containers");
    expect(await response.json()).toEqual({ data: [{ id: "cont-1", updatedAt: "2026-09-01T00:00:00.000Z" }] });
  });
});
