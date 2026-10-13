import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { handlers } from "@/mocks/handlers";
import { serviceFixtures } from "@/lib/services-fixtures";
import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { saveFieldDraft, snapshotService } from "@/lib/field-drafts";
import type { CreateRepairRequestInput, RepairRequest } from "@/lib/repair-requests";
import { CreateRepairRequestDialog } from "./create-repair-request-dialog";

const server = setupServer(...handlers);
const service = serviceFixtures.find((item) => item.id === "SVC-1043")!;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetRepairRequestFixtures();
  window.localStorage.clear();
});
afterAll(() => server.close());

describe("CreateRepairRequestDialog", () => {
  it("validates required values and keeps publicSafetyRisk independent from severity", async () => {
    const user = userEvent.setup();
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={() => undefined} />);
    const dialog = screen.getByRole("dialog");

    await user.click(screen.getByRole("button", { name: /Crear deriv.*a M3/ }));
    expect(screen.getByText("Debe indicar la ubicación del daño.")).toBeVisible();

    await user.selectOptions(screen.getByLabelText(/^Severidad/), "LOW");
    await user.click(screen.getByLabelText(/^Sí,/));
    await user.type(screen.getByLabelText(/^Ubic/), "Av. Rivadavia 2200");
    await user.click(screen.getByRole("button", { name: /Crear deriv.*a M3/ }));

    await waitFor(() => expect(screen.getByText(/pendiente de respuesta de M3/i)).toBeVisible());
    expect(dialog).toHaveTextContent("SVC-1043");
  });

  it("shows an Unsent referral and retains entered values after a network failure", async () => {
    server.use(http.post("*/api/repair-requests", () => HttpResponse.error()));
    const user = userEvent.setup();
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={() => undefined} />);

    await user.type(screen.getByLabelText(/^Ubic/), "Av. Rivadavia 2200");
    await user.click(screen.getByRole("button", { name: /Crear deriv.*a M3/ }));

    await waitFor(() => expect(screen.getByText(/Unsent referral/i)).toBeVisible());
    expect(screen.getByLabelText(/^Ubic/)).toHaveValue("Av. Rivadavia 2200");
    expect(window.localStorage.length).toBe(1);
  });

  it("checks a restored draft against the current Service before resubmitting", async () => {
    const user = userEvent.setup();
    const input: CreateRepairRequestInput = {
      damageType: "BROKEN_PAVEMENT",
      address: "Av. Rivadavia 2200",
      severity: "MEDIUM",
      publicSafetyRisk: false,
      detectedInType: "SERVICE",
      detectedInId: service.id,
    };
    const composedAt = "2026-10-01T12:00:00.000Z";
    saveFieldDraft({
      serviceId: service.id,
      actionType: "repairRequest",
      payload: { input, composedAt },
      composedAgainst: snapshotService(service),
      savedAt: composedAt,
    });

    const listQueries: string[] = [];
    let serviceReads = 0;
    let createRequests = 0;
    server.use(
      http.get("*/api/repair-requests", ({ request }) => {
        listQueries.push(new URL(request.url).search);
        return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });
      }),
      http.get("*/api/services/:serviceId", () => {
        serviceReads += 1;
        return HttpResponse.json({ ...service, updatedAt: "2099-01-01T00:00:00.000Z" });
      }),
      http.post("*/api/repair-requests", () => {
        createRequests += 1;
        return HttpResponse.json({});
      }),
    );

    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={() => undefined} />);

    expect(await screen.findByText("Unsent referral")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Verificar y reenviar derivación" }));

    expect(await screen.findByText(/cambió mientras su borrador de derivación de reparación/i)).toBeVisible();
    expect(listQueries).toEqual([
      `?detectedInId=${service.id}`,
      `?detectedInId=${service.id}`,
    ]);
    expect(serviceReads).toBe(1);
    expect(createRequests).toBe(0);
  });

  it("shows a matching referral as already registered after a lost response", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const createdAt = new Date(Date.now() + 60_000).toISOString();
    const existingRequest: RepairRequest = {
      id: "RR-LOST-RESPONSE",
      damageType: "BROKEN_PAVEMENT",
      address: "Av. Rivadavia 2200",
      severity: "MEDIUM",
      publicSafetyRisk: false,
      detectedInType: "SERVICE",
      detectedInId: service.id,
      status: "REQUESTED",
      requestedAt: createdAt,
      createdAt,
    };
    let createRequests = 0;
    const listQueries: string[] = [];
    server.use(
      http.post("*/api/repair-requests", () => {
        createRequests += 1;
        return HttpResponse.error();
      }),
      http.get("*/api/repair-requests", ({ request }) => {
        listQueries.push(new URL(request.url).search);
        return HttpResponse.json({
          data: [existingRequest],
          meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
        });
      }),
    );

    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={onCreated} />);
    await user.type(screen.getByLabelText(/^Ubic/), "Av. Rivadavia 2200");
    await user.click(screen.getByRole("button", { name: /Crear deriv.*a M3/ }));

    expect(await screen.findByText("Derivación ya registrada.")).toBeVisible();
    expect(screen.getByText("Seguimiento RR-LOST-RESPONSE · Servicio SVC-1043")).toBeVisible();
    expect(createRequests).toBe(1);
    expect(listQueries).toEqual([`?detectedInId=${service.id}`]);
    expect(onCreated).toHaveBeenCalledWith(existingRequest);
    expect(screen.queryByRole("button", { name: /Verificar y reenviar derivación/ })).not.toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
  });
});
