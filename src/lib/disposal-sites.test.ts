import { afterEach, describe, expect, it, vi } from "vitest";

import { disposalSitesAdapter, DisposalSiteContractError, DisposalSiteRequestError } from "./disposal-sites";

afterEach(() => vi.restoreAllMocks());

const disposalSite = { id: "ds-101", code: "RS-01", siteType: "TRANSFER_STATION", name: "Estación Norte", active: true };

describe("disposalSitesAdapter", () => {
  it("reads the confirmed paginated response and forwards active, type and search filters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [disposalSite], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }), { status: 200 }));
    await expect(disposalSitesAdapter.list({ active: true, siteType: "TRANSFER_STATION", search: "norte" })).resolves.toEqual({ disposalSites: [disposalSite], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    expect(fetchMock).toHaveBeenCalledWith("/api/disposal-sites?active=true&siteType=TRANSFER_STATION&search=norte", expect.objectContaining({ cache: "no-store" }));
  });

  it("sends the confirmed create and update shapes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(disposalSite), { status: 201 }));
    await disposalSitesAdapter.create({ code: "RS-01", siteType: "TRANSFER_STATION", name: "Estación Norte" });
    expect(fetchMock).toHaveBeenCalledWith("/api/disposal-sites", expect.objectContaining({ method: "POST", body: JSON.stringify({ code: "RS-01", siteType: "TRANSFER_STATION", name: "Estación Norte" }) }));

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...disposalSite, name: "Estación Sur", active: false }), { status: 200 }));
    await disposalSitesAdapter.update("ds-101", { name: "Estación Sur", siteType: "TRANSFER_STATION", active: false });
    expect(fetchMock).toHaveBeenLastCalledWith("/api/disposal-sites/ds-101", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name: "Estación Sur", siteType: "TRANSFER_STATION", active: false }) }));
  });

  it("uses DELETE only as the logical deactivation operation and rejects malformed contracts", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ...disposalSite, active: false }), { status: 200 }));
    await expect(disposalSitesAdapter.remove("ds-101")).resolves.toMatchObject({ active: false });
    expect(fetchMock).toHaveBeenCalledWith("/api/disposal-sites/ds-101", expect.objectContaining({ method: "DELETE" }));

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ invalid: true }), { status: 200 }));
    await expect(disposalSitesAdapter.list()).rejects.toBeInstanceOf(DisposalSiteContractError);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ statusCode: 409, message: "conflict", error: "Conflict", timestamp: "now", path: "/api/disposal-sites" }), { status: 409 }));
    await expect(disposalSitesAdapter.list()).rejects.toMatchObject({ constructor: DisposalSiteRequestError, status: 409 });
  });
});
