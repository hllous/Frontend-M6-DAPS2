import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { ServiceDetail } from "@/components/services/service-detail";
import { ServicePreview } from "@/components/services/service-preview";
import { servicesAdapter } from "./services";
import { olvidarCatalogoDeEtiquetas } from "./service-labels";

const vehicleId = "b91bf270-025b-437d-a2d4-9f3be0963862";
// GET /services: identifiers, nested zones and ISO dates, without display labels.
const backendService = {
  id: "9837fac5-22f5-4a39-bdef-6eb029a7db6f",
  serviceTypeId: "02c17693-4fd9-473b-bc38-299dae4d8fcb",
  mode: "ROUTE", status: "SCHEDULED", origin: "MANUAL",
  scheduledDate: "2026-09-30T00:00:00.000Z", windowFrom: "08:00", windowTo: "12:00",
  crewId: "d765270f-e852-4fc2-bb15-06893b0454fa", vehicleId,
  zones: [{ zoneId: "b11adc1e-e258-4181-9637-a22c4ba98012", sequence: 1 }],
  zoneResults: [], collectionRecords: [],
  createdAt: "2026-09-22T12:00:00.000Z", updatedAt: "2026-09-22T12:05:00.000Z",
};
const meta = { total: 1, page: 1, pageSize: 100, totalPages: 1 };
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); olvidarCatalogoDeEtiquetas(); });
afterAll(() => server.close());

function mockBackend(id = vehicleId) {
  server.use(
    http.get("*/api/vehicles", () => HttpResponse.json({
      data: [{ id: vehicleId, plate: "AB123CD", vehicleType: "COMPACTOR_TRUCK", capacity: 12, active: true }], meta,
    })),
    http.get("*/api/services", () => HttpResponse.json({ data: [{ ...backendService, vehicleId: id }], meta })),
    http.get("*/api/services/:id", () => HttpResponse.json({ ...backendService, vehicleId: id })),
    http.post("*/api/services/:id/assign-crew", () => HttpResponse.json({ ...backendService, vehicleId: id })),
  );
}

describe("patente del vehículo asignado (#317)", () => {
  it("resuelve la patente en listado, detalle y respuesta de asignación", async () => {
    mockBackend();
    let catalogRequests = 0;
    server.events.on("request:start", ({ request }) => {
      if (new URL(request.url).pathname === "/api/vehicles") catalogRequests++;
    });
    expect((await servicesAdapter.list()).services[0].vehiclePlate).toBe("AB123CD");
    expect((await servicesAdapter.get(backendService.id)).vehiclePlate).toBe("AB123CD");
    expect((await servicesAdapter.assignCrew(backendService.id, { crewId: backendService.crewId, vehicleId })).vehiclePlate).toBe("AB123CD");
    expect(catalogRequests).toBe(1);
    server.events.removeAllListeners("request:start");
  });

  it("conserva las etiquetas recibidas y tolera que el catálogo falle", async () => {
    mockBackend();
    server.use(http.get("*/api/vehicles", () => new HttpResponse(null, { status: 503 })));
    expect((await servicesAdapter.get(backendService.id)).vehiclePlate).toBeNull();
    server.use(http.get("*/api/services/:id", () => HttpResponse.json({ ...backendService, vehiclePlate: "AB123CD" })));
    expect((await servicesAdapter.get(backendService.id)).vehiclePlate).toBe("AB123CD");
  });

  it.each([vehicleId, "1047d34a-13bf-44f8-aad8-552b55533573"])("muestra una etiqueta legible sin UUID para %s", async (id) => {
    mockBackend(id);
    const service = await servicesAdapter.get(backendService.id);
    expect(service.vehiclePlate).toBe(id === vehicleId ? "AB123CD" : null);
    const { unmount } = render(<ServicePreview service={service} onOpenDetail={() => {}} />);
    expect(screen.getByText(id === vehicleId ? "AB123CD" : "No asignado")).toBeVisible();
    expect(screen.queryByText(new RegExp(id))).not.toBeInTheDocument();
    unmount();
    render(<ServiceDetail service={service} onBack={() => {}} />);
    expect(screen.getByText(id === vehicleId ? "AB123CD" : "Sin vehículo")).toBeVisible();
    expect(screen.queryByText(new RegExp(id))).not.toBeInTheDocument();
  });
});
