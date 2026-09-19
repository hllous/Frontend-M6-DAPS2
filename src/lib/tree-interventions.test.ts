import { afterEach, describe, expect, it, vi } from "vitest";

import {
  treeInterventionsAdapter,
  TreeInterventionContractError,
  TreeInterventionRequestError,
} from "./tree-interventions";

afterEach(() => vi.restoreAllMocks());

const intervention = {
  id: "intervention-1",
  interventionType: "SAFETY_PRUNING",
  treeIds: ["tree-2", "tree-4"],
  address: "Parque del Bicentenario, sector norte",
  requiresStreetClosure: true,
  priority: "HIGH",
  status: "REQUESTED",
  serviceId: null,
  justification: "Relevamiento 06/09/2026 (survey-2).",
};

describe("treeInterventionsAdapter", () => {
  it("forwards intervention filters and validates a paginated response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [intervention], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } })),
    );

    await expect(
      treeInterventionsAdapter.list({ interventionType: "SAFETY_PRUNING", status: "REQUESTED", page: 1, pageSize: 10 }),
    ).resolves.toMatchObject({ interventions: [intervention], totalPages: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tree-interventions?interventionType=SAFETY_PRUNING&status=REQUESTED&page=1&pageSize=10",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("creates a multi-tree request and reads detail with linked trees", async () => {
    const detail = {
      ...intervention,
      trees: [
        { id: "tree-2", surveyCode: "ARB-00443", zoneId: "zone-2", species: "Tipa", address: "Parque del Bicentenario, sector norte", lat: -34.5692, lng: -58.4051, heightM: 18, diameterCm: 72.5, active: true, lastSurvey: { surveyedAt: "2026-08-18T10:30:00.000Z", healthStatus: "HEALTHY", riskLevel: "LOW", riskType: null, suggestedIntervention: null } },
        { id: "tree-4", surveyCode: "ARB-00445", zoneId: "zone-1", species: "Ceibo", address: "Paseo de la Costa 220", lat: -34.58, lng: -58.39, heightM: 10.5, diameterCm: 44, active: true, lastSurvey: null },
      ],
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(intervention), { status: 201 }));
    const input = {
      interventionType: "SAFETY_PRUNING" as const,
      treeIds: ["tree-2", "tree-4"],
      address: intervention.address,
      requiresStreetClosure: true,
      priority: "HIGH" as const,
      justification: intervention.justification,
    };

    await expect(treeInterventionsAdapter.create(input)).resolves.toEqual(intervention);
    expect(fetchMock).toHaveBeenCalledWith("/api/tree-interventions", expect.objectContaining({ method: "POST", body: JSON.stringify(input) }));

    fetchMock.mockResolvedValue(new Response(JSON.stringify(detail)));
    await expect(treeInterventionsAdapter.get("intervention-1")).resolves.toEqual(detail);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/tree-interventions/intervention-1", expect.objectContaining({ cache: "no-store" }));
  });

  it("submits removals for authorization without inventing a request body", async () => {
    const pending = { ...intervention, interventionType: "REMOVAL", status: "PENDING_AUTHORIZATION" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(pending)));

    await expect(treeInterventionsAdapter.submitForAuthorization("intervention-1")).resolves.toMatchObject({
      status: "PENDING_AUTHORIZATION",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tree-interventions/intervention-1/submit-for-authorization",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("authorizes every intervention type with the current Office identity", async () => {
    const authorized = {
      ...intervention,
      status: "AUTHORIZED",
      authorizedByUserId: "user-lucia",
      authorizedAt: "2026-09-07T14:30:00.000Z",
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(authorized)));

    await expect(treeInterventionsAdapter.authorize("intervention-1", { authorizedByUserId: "user-lucia" })).resolves.toMatchObject(authorized);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tree-interventions/intervention-1/authorize",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ authorizedByUserId: "user-lucia" }) }),
    );
  });

  it("rejects a removal without sending a reason to the backend", async () => {
    const rejected = { ...intervention, interventionType: "REMOVAL", status: "REJECTED" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(rejected)));

    await expect(treeInterventionsAdapter.reject("intervention-1")).resolves.toMatchObject({ status: "REJECTED" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tree-interventions/intervention-1/reject",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("assigns an existing Service and validates the updated intervention", async () => {
    const linked = { ...intervention, status: "AUTHORIZED", serviceId: "SVC-1200" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(linked)));

    await expect(treeInterventionsAdapter.assignService("intervention-1", { serviceId: "SVC-1200" })).resolves.toMatchObject(linked);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tree-interventions/intervention-1/assign-service",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ serviceId: "SVC-1200" }),
      }),
    );
  });

  it("surfaces the duplicate-link conflict instead of treating it as success", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      statusCode: 409,
      message: "La intervención ya tiene un servicio asociado.",
      error: "Conflict",
      timestamp: new Date().toISOString(),
      path: "/api/tree-interventions/intervention-1/assign-service",
    }), { status: 409 }));

    await expect(treeInterventionsAdapter.assignService("intervention-1", { serviceId: "SVC-1200" })).rejects.toMatchObject({
      constructor: TreeInterventionRequestError,
      status: 409,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks removal without justification before making a request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(treeInterventionsAdapter.create({
      interventionType: "REMOVAL",
      treeIds: ["tree-4"],
      address: "Paseo de la Costa 220",
      requiresStreetClosure: false,
      priority: "CRITICAL",
    })).rejects.toBeInstanceOf(TreeInterventionContractError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed success and error responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ malformed: true })));
    await expect(treeInterventionsAdapter.list()).rejects.toBeInstanceOf(TreeInterventionContractError);

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ statusCode: 403, message: "Sin permiso", error: "Forbidden", timestamp: "now", path: "/api/tree-interventions" }), { status: 403 }));
    await expect(treeInterventionsAdapter.list()).rejects.toMatchObject({ constructor: TreeInterventionRequestError, status: 403 });
  });
});
