import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { ZoneExecutionPanel } from "./zone-execution-panel";
import {
  resetServiceFixtures,
  resetZoneResultFixtures,
  serviceFixtures,
  updateServiceFixture,
} from "@/lib/services-fixtures";
import type { Service } from "@/lib/services";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  resetServiceFixtures();
  resetZoneResultFixtures();
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  localStorage.clear();
});
afterAll(() => server.close());

const mockRouteService: Service = {
  id: "SVC-TEST-ROUTE",
  serviceTypeId: "st-street-cleaning",
  serviceTypeName: "Barrido mecánico",
  title: "Barrido mecánico — Bulevar Costero",
  mode: "ROUTE",
  status: "IN_PROGRESS",
  origin: "PLANNED",
  zoneIds: ["zone-3", "zone-1"],
  zoneNames: ["Zona Centro", "Zona Norte"],
  scheduledDate: "2026-09-05",
  windowFrom: "08:00",
  windowTo: "12:00",
  crewId: "crew-b",
  crewName: "Cuadrilla B · Fernández",
  vehicleId: "veh-102",
  vehiclePlate: "AE 456 FG",
  coordinates: { x: -34.6037, y: -58.3816 },
  attachments: [],
  history: [],
};

const mockPointService: Service = {
  id: "SVC-TEST-POINT",
  serviceTypeId: "st-container-repair",
  serviceTypeName: "Mantenimiento de contenedores",
  title: "Reparación de contenedor CT-0112",
  mode: "POINT",
  status: "IN_PROGRESS",
  origin: "MANUAL",
  zoneIds: ["zone-3"],
  zoneNames: ["Zona Centro"],
  scheduledDate: "2026-09-05",
  windowFrom: "14:00",
  windowTo: "17:00",
  crewId: "crew-b",
  crewName: "Cuadrilla B · Fernández",
  coordinates: { x: -34.6037, y: -58.3816 },
  attachments: [],
  history: [],
};

describe("ZoneExecutionPanel component", () => {
  it("renders desktop zone navigation with descriptive tags in one uninterrupted form", () => {
    render(
      <ZoneExecutionPanel service={mockRouteService} canExecute={true} />,
    );

    expect(screen.getByRole("heading", { name: "Registro de ejecución de zonas" })).toBeVisible();

    // Check desktop zone navigation list items
    const nav = screen.getByRole("region", { name: /registro de ejecución de zonas/i });
    expect(nav).toBeVisible();

    // Both zones are listed with initial "Pendiente" tags
    const pendingBadges = screen.getAllByText("Pendiente");
    expect(pendingBadges.length).toBeGreaterThanOrEqual(2);

    // Initial selected zone is shown in form header
    expect(screen.getByRole("heading", { name: "Zona Centro" })).toBeVisible();
    expect(screen.getByText("Resultado de la zona *")).toBeVisible();
  });

  it("supports mobile disclosure toggle and restores focus to toggle button on zone selection", async () => {
    const user = userEvent.setup();
    render(
      <ZoneExecutionPanel service={mockRouteService} canExecute={true} />,
    );

    // Find disclosure toggle button
    const toggle = screen.getByRole("button", { name: /zona: zona centro/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Click disclosure to open mobile navigation
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    // Select second zone (Zona Norte) from mobile list
    const mobileList = document.querySelector("#mobile-zone-nav");
    expect(mobileList).not.toBeNull();
    const zonaNorteButton = mobileList!.querySelectorAll("button")[1];
    await user.click(zonaNorteButton);

    // Disclosure collapses
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Focus restored to the disclosure toggle button
    expect(toggle).toHaveFocus();
  });

  it("enforces reason and evidence when selecting a non-SERVICED outcome (PARTIAL / NOT_SERVICED)", async () => {
    const user = userEvent.setup();
    render(
      <ZoneExecutionPanel service={mockRouteService} canExecute={true} />,
    );

    // Select Parcial
    const partialRadio = screen.getByLabelText("Parcial");
    await user.click(partialRadio);

    // Reason dropdown appears
    const reasonSelect = screen.getByLabelText(/motivo de la excepción/i);
    expect(reasonSelect).toBeVisible();

    // Try submitting without reason and without evidence
    const submitBtn = screen.getByRole("button", { name: /guardar resultado de zona/i });
    await user.click(submitBtn);

    // Validation alert surfaces required reason
    expect(screen.getByRole("alert")).toHaveTextContent(/motivo es obligatorio/i);

    // Select a reason
    await user.selectOptions(reasonSelect, "BLOCKED_ACCESS");

    // Try submitting with reason but without evidence
    await user.click(submitBtn);
    expect(screen.getByRole("alert")).toHaveTextContent(/se requiere adjuntar evidencia/i);
  });

  it("submits a clean SERVICED result for ROUTE zone in any order and updates result tag", async () => {
    const user = userEvent.setup();

    let recordedResults: any[] = [];

    server.use(
      http.post("*/api/services/:serviceId/zone-results", async ({ request }) => {
        const body = (await request.json()) as any;
        const newRecord = {
          id: "ZR-MOCK-1",
          serviceId: "SVC-TEST-ROUTE",
          zoneId: body.zoneId,
          status: body.status,
          reason: null,
          notes: body.notes ?? null,
          attachments: [],
          recordedAt: "2026-09-05 10:15",
        };
        recordedResults = [newRecord];
        return HttpResponse.json(newRecord);
      }),
      http.get("*/api/services/:serviceId/zone-results", () => {
        return HttpResponse.json(recordedResults);
      }),
    );

    render(
      <ZoneExecutionPanel service={mockRouteService} canExecute={true} />,
    );

    // Select Zona Norte first (navigating out of order)
    const zonaNorteButtons = screen.getAllByRole("button", { name: /zona norte/i });
    await user.click(zonaNorteButtons[0]);

    // Fill notes
    const notesInput = screen.getByPlaceholderText(/detalles sobre el estado/i);
    await user.type(notesInput, "Barrido completado en Zona Norte");

    // Submit clean SERVICED result
    const submitBtn = screen.getByRole("button", { name: /guardar resultado de zona/i });
    await user.click(submitBtn);

    // Result tag updates to "Atendida"
    await waitFor(() => {
      expect(screen.getAllByText("Atendida").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("uploads evidence with local filename displayed until success, switching to canonical filename, and supporting retry with same idempotency key", async () => {
    const user = userEvent.setup();

    let uploadAttempts = 0;
    const capturedIdempotencyKeys: string[] = [];
    let recordedResults: any[] = [];

    server.use(
      http.post("*/api/services/:serviceId/zone-results", async ({ request }) => {
        const body = (await request.json()) as any;
        const result = {
          id: "ZR-MOCK-PARTIAL",
          serviceId: "SVC-TEST-ROUTE",
          zoneId: body.zoneId,
          status: body.status,
          reason: body.reason,
          notes: body.notes,
          attachments: [],
          recordedAt: "2026-09-05 10:20",
        };
        recordedResults = [result];
        return HttpResponse.json(result);
      }),
      http.post("*/api/evidence", async ({ request }) => {
        uploadAttempts++;
        const idempKey = request.headers.get("Idempotency-Key") || "";
        capturedIdempotencyKeys.push(idempKey);

        if (uploadAttempts === 1) {
          // Fail the first attempt to verify retry
          return HttpResponse.json(
            {
              statusCode: 500,
              message: "Fallo transitorio de red en almacenamiento",
              error: "Internal Server Error",
              timestamp: new Date().toISOString(),
              path: "/api/evidence",
            },
            { status: 500 },
          );
        }

        // Second attempt succeeds with canonical sanitized filename
        return HttpResponse.json({
          id: "att-mock-1",
          url: "/mock/evidence/calle_bloqueada_obra.jpg",
          filename: "calle_bloqueada_obra.jpg",
          contentType: "image/jpeg",
          uploadedAt: "2026-09-05 10:22",
        });
      }),
      http.get("*/api/services/:serviceId/zone-results", () => {
        if (recordedResults.length === 0) {
          return HttpResponse.json([]);
        }
        return HttpResponse.json([
          {
            ...recordedResults[0],
            attachments: uploadAttempts > 1
              ? [
                  {
                    id: "att-mock-1",
                    url: "/mock/evidence/calle_bloqueada_obra.jpg",
                    filename: "calle_bloqueada_obra.jpg",
                    contentType: "image/jpeg",
                    uploadedAt: "2026-09-05 10:22",
                  },
                ]
              : [],
          },
        ]);
      }),
    );

    render(
      <ZoneExecutionPanel service={mockRouteService} canExecute={true} />,
    );

    // Select Parcial and reason
    await user.click(screen.getByLabelText("Parcial"));
    await user.selectOptions(screen.getByLabelText(/motivo de la excepción/i), "BLOCKED_ACCESS");

    // Select file with raw local filename
    const file = new File(["dummy-content"], "Foto Calle Bloqueada (Obra).jpg", {
      type: "image/jpeg",
    });
    const fileInput = document.querySelector("#evidence-input") as HTMLInputElement;
    await user.upload(fileInput, file);

    // Displays local filename before upload
    expect(screen.getByText("Foto Calle Bloqueada (Obra).jpg")).toBeVisible();
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThanOrEqual(1);

    // Submit form (first attempt fails in mock handler)
    const submitBtn = screen.getByRole("button", { name: /guardar resultado de zona/i });
    await user.click(submitBtn);

    // Retry button appears for that file
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
    });

    // Local filename is still displayed
    expect(screen.getByText("Foto Calle Bloqueada (Obra).jpg")).toBeVisible();

    // Click retry
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    // Upon success, switches to sanitized canonical filename
    await waitFor(() => {
      expect(screen.getByText("calle_bloqueada_obra.jpg")).toBeVisible();
    });

    // Idempotency key reused
    expect(capturedIdempotencyKeys.length).toBe(2);
    expect(capturedIdempotencyKeys[0]).toBe(capturedIdempotencyKeys[1]);
  });

  it("keeps completion button disabled until all zones are recorded, then invokes complete with no request body", async () => {
    const user = userEvent.setup();
    const handleServiceUpdated = vi.fn();

    let capturedCompleteBody: any = "NOT_CALLED";

    server.use(
      http.get("*/api/services/:serviceId/zone-results", () => {
        return HttpResponse.json([
          {
            id: "ZR-1",
            serviceId: "SVC-TEST-ROUTE",
            zoneId: "zone-3",
            status: "SERVICED",
            reason: null,
            notes: null,
            attachments: [],
            recordedAt: "2026-09-05 10:00",
          },
          {
            id: "ZR-2",
            serviceId: "SVC-TEST-ROUTE",
            zoneId: "zone-1",
            status: "PARTIAL",
            reason: "WEATHER",
            notes: "Lluvia",
            attachments: [],
            recordedAt: "2026-09-05 10:30",
          },
        ]);
      }),
      http.post("*/api/services/:serviceId/complete", async ({ request }) => {
        const text = await request.text();
        capturedCompleteBody = text;
        return HttpResponse.json({
          ...mockRouteService,
          status: "PARTIALLY_COMPLETED",
          statusReason: "Lluvia",
        });
      }),
    );

    render(
      <ZoneExecutionPanel
        service={mockRouteService}
        canExecute={true}
        onServiceUpdated={handleServiceUpdated}
      />
    );

    // All zones are recorded (2 of 2)
    await waitFor(() => {
      expect(screen.getByText("Todas las zonas registradas. Listo para finalizar.")).toBeVisible();
    });

    const completeBtn = screen.getByRole("button", { name: "Completar servicio" });
    expect(completeBtn).toBeEnabled();

    // Click complete
    await user.click(completeBtn);

    // Request body was empty
    await waitFor(() => {
      expect(capturedCompleteBody).toBe("");
    });

    // Service updated callback was called with backend-computed PARTIALLY_COMPLETED status
    expect(handleServiceUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PARTIALLY_COMPLETED" }),
    );

    // Rendered result matches exactly what backend returned
    expect(screen.getByText(/Servicio finalizado con estado: Parcial/i)).toBeVisible();
  });

  it("uses the same interaction for POINT mode single zone", async () => {
    const user = userEvent.setup();

    render(
      <ZoneExecutionPanel service={mockPointService} canExecute={true} />,
    );

    expect(screen.getByText(/Servicio puntual: registre el resultado de la zona/i)).toBeVisible();
    // Only single zone is listed
    expect(screen.getAllByText("Zona Centro").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /guardar resultado de zona/i })).toBeVisible();
  });

  it("saves a ZoneResult draft on a network failure, then resolves a drift as an explicit conflict rather than applying it", async () => {
    const user = userEvent.setup();

    let submitAttempts = 0;
    server.use(
      http.post("*/api/services/:serviceId/zone-results", () => {
        submitAttempts += 1;
        return HttpResponse.error();
      }),
      http.get("*/api/services/:serviceId", () =>
        // Service was reassigned server-side while the crew leader was offline.
        HttpResponse.json({
          ...mockRouteService,
          crewId: "crew-c",
          crewName: "Cuadrilla C · Ibáñez",
          updatedAt: "2026-09-05T12:00:00.000Z",
        }),
      ),
    );

    render(<ZoneExecutionPanel service={mockRouteService} canExecute={true} />);

    const notesInput = screen.getByPlaceholderText(/detalles sobre el estado/i);
    await user.type(notesInput, "Zona Centro completada normalmente");

    await user.click(screen.getByRole("button", { name: /guardar resultado de zona/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/borrador local pendiente/i);
    });
    expect(submitAttempts).toBe(1);

    const retryButton = await screen.findByRole("button", { name: "Reintentar envío" });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/cambió mientras/i)).toBeVisible();
    });
    expect(screen.getByText("Cuadrilla C · Ibáñez")).toBeVisible();
    // The draft was never silently applied: no second POST attempt was made
    expect(submitAttempts).toBe(1);

    await user.click(screen.getByRole("button", { name: "Descartar borrador" }));

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /guardar resultado de zona/i })).toBeVisible();
  });

  it("shows read-only view with no state-changing actions for Crew Member (canExecute = false)", () => {
    render(
      <ZoneExecutionPanel service={mockRouteService} canExecute={false} />,
    );

    // Explanatory guidance
    expect(screen.getByText("Resultado pendiente de registro")).toBeVisible();
    expect(
      screen.getByText("La persona responsable de la cuadrilla registrará el resultado de esta zona."),
    ).toBeVisible();

    // No submit or complete buttons
    expect(screen.queryByRole("button", { name: /guardar resultado de zona/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Completar servicio" })).toBeNull();
  });
});
