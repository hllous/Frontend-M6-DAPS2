import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { handlers } from "@/mocks/handlers";
import type { Service } from "@/lib/services";
import { InspectionExecutionPanel } from "./inspection-execution-panel";

const server = setupServer(...handlers);

const service: Service = {
  id: "SVC-INS-1",
  serviceTypeId: "st-env-inspection",
  serviceTypeName: "Control ambiental",
  title: "InspecciÃ³n ambiental â€” Establecimiento de prueba",
  mode: "POINT",
  status: "IN_PROGRESS",
  statusReason: null,
  origin: "INSPECTION",
  zoneIds: ["zone-2"],
  zoneNames: ["Zona Sur"],
  inspectionId: "INS-TEST-1",
  scheduledDate: "2026-09-07",
  windowFrom: "09:00",
  windowTo: "11:00",
  crewId: "crew-b",
  crewName: "Cuadrilla B Â· FernÃ¡ndez",
  vehicleId: null,
  vehiclePlate: null,
  coordinates: { x: 10, y: 20 },
  attachments: [],
  history: [],
  updatedAt: "2026-09-07T08:00:00.000Z",
};

function inspectionResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "INS-TEST-1",
    reportId: "ER-TEST-1",
    serviceId: "SVC-INS-1",
    inspectedAt: null,
    scheduledDate: "2026-09-07",
    timeWindow: { start: "09:00", end: "11:00" },
    checklistVersion: "ambiental-v1",
    checklist: [
      { id: "source", label: "Verificar la fuente observada", required: true },
      { id: "impact", label: "Registrar el impacto visible", required: true },
    ],
    attachments: [],
    findings: null,
    outcome: null,
    nextStep: null,
    notes: null,
    createdAt: "2026-09-07T07:00:00.000Z",
    updatedAt: "2026-09-07T08:00:00.000Z",
    ...overrides,
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

describe("InspectionExecutionPanel", () => {
  it("lets a Crew Leader complete a clean inspection and renders the returned next step", async () => {
    const user = userEvent.setup();
    let completionBody: unknown;
    server.use(
      http.get("*/api/environmental-inspections/INS-TEST-1", () => HttpResponse.json(inspectionResponse())),
      http.post("*/api/environmental-inspections/INS-TEST-1/complete", async ({ request }) => {
        completionBody = await request.json();
        return HttpResponse.json(inspectionResponse({
          inspectedAt: "2026-09-07T12:00:00.000Z",
          outcome: "NO_VIOLATION",
          nextStep: "CASE_CLOSED",
          findings: null,
        }));
      }),
    );

    render(<InspectionExecutionPanel service={service} canExecute />);

    expect(await screen.findByRole("heading", { name: "EjecuciÃ³n de inspecciÃ³n ambiental" })).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: /Verificar la fuente observada/ }));
    await user.click(screen.getByRole("checkbox", { name: /Registrar el impacto visible/ }));
    await user.type(screen.getByRole("textbox", { name: /Conclus/ }), "No se constatÃ³ infracciÃ³n durante la visita.");
    await user.click(screen.getByRole("button", { name: "Completar inspecciÃ³n" }));

    await screen.findByText(/Resultado registrado/);
    expect(screen.getAllByText(/Siguiente paso:.*Cierre del expediente/).length).toBeGreaterThan(0);
    expect(completionBody).toEqual({
      outcome: "NO_VIOLATION",
      checklist: [
        { id: "source", completed: true },
        { id: "impact", completed: true },
      ],
      conclusion: "No se constatÃ³ infracciÃ³n durante la visita.",
    });
  });

  it("keeps the same assigned context read-only for a Crew Member", async () => {
    server.use(http.get("*/api/environmental-inspections/INS-TEST-1", () => HttpResponse.json(inspectionResponse())));

    render(<InspectionExecutionPanel service={service} />);

    expect(await screen.findByText("Esta inspecciÃ³n se encuentra en modo de solo consulta para integrantes de la cuadrilla.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Completar inspecciÃ³n" })).not.toBeInTheDocument();
    expect(screen.getByText("Verificar la fuente observada")).toBeVisible();
  });

  it("uploads inspection evidence before submitting a violation outcome", async () => {
    const user = userEvent.setup();
    let evidenceUploaded = false;
    let completionBody: unknown;
    server.use(
      http.get("*/api/environmental-inspections/INS-TEST-1", () => HttpResponse.json(inspectionResponse())),
      http.post("*/api/evidence", async ({ request }) => {
        const formData = await request.formData();
        evidenceUploaded = formData.get("ownerType") === "INSPECTION";
        return HttpResponse.json({ id: "att-test-1", url: "/evidence/test.jpg", filename: "test.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-07T12:00:00.000Z" }, { status: 201 });
      }),
      http.post("*/api/environmental-inspections/INS-TEST-1/complete", async ({ request }) => {
        completionBody = await request.json();
        return HttpResponse.json(inspectionResponse({ outcome: "VIOLATION_FOUND", nextStep: "NOTICE_TO_BE_ISSUED", findings: "Emisión visible", attachments: [{ id: "att-test-1", url: "/evidence/test.jpg", filename: "test.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-07T12:00:00.000Z" }] }));
      }),
    );

    render(<InspectionExecutionPanel service={service} canExecute />);
    await screen.findByRole("heading", { name: /Ejecuci/ });
    await user.click(screen.getByRole("checkbox", { name: /Verificar la fuente/ }));
    await user.click(screen.getByRole("checkbox", { name: /Registrar el impacto/ }));
    await user.selectOptions(screen.getByRole("combobox", { name: /Resultado/ }), "VIOLATION_FOUND");
    await user.type(screen.getByRole("textbox", { name: /Hallazgos/ }), "Emisión visible");
    await user.selectOptions(screen.getByRole("combobox", { name: /Tipo de infracc/ }), "AIR_EMISSION");
    await user.selectOptions(screen.getByRole("combobox", { name: /Gravedad/ }), "HIGH");
    await user.selectOptions(screen.getByRole("combobox", { name: /Acc/ }), "FORMAL_NOTICE");
    await user.upload(screen.getByLabelText(/Seleccionar archivos/), new File(["evidence"], "chimenea.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("button", { name: /Completar inspecci/ }));

    expect(await screen.findByText(/Resultado registrado/)).toBeVisible();
    expect(evidenceUploaded).toBe(true);
    expect(completionBody).toEqual({
      outcome: "VIOLATION_FOUND",
      checklist: [{ id: "source", completed: true }, { id: "impact", completed: true }],
      findings: "Emisión visible",
      violationType: "AIR_EMISSION",
      severity: "HIGH",
      suggestedAction: "FORMAL_NOTICE",
    });
  });

  it("saves an offline draft and blocks resubmission when the service has drifted", async () => {
    const user = userEvent.setup();
    let completionAttempts = 0;
    server.use(
      http.get("*/api/environmental-inspections/INS-TEST-1", () => HttpResponse.json(inspectionResponse())),
      http.post("*/api/environmental-inspections/INS-TEST-1/complete", () => {
        completionAttempts += 1;
        return HttpResponse.error();
      }),
      http.get("*/api/services/SVC-INS-1", () => HttpResponse.json({ ...service, updatedAt: "2026-09-07T13:00:00.000Z", crewName: "Cuadrilla C" })),
    );

    render(<InspectionExecutionPanel service={service} canExecute />);
    await screen.findByRole("heading", { name: /Ejecuci/ });
    await user.click(screen.getByRole("checkbox", { name: /Verificar la fuente/ }));
    await user.click(screen.getByRole("checkbox", { name: /Registrar el impacto/ }));
    await user.type(screen.getByRole("textbox", { name: /Conclus/ }), "Sin infracción constatada.");
    await user.click(screen.getByRole("button", { name: /Completar inspecci/ }));

    expect(await screen.findByText(/Borrador local pendiente/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Reintentar env/ }));
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveTextContent(/cambi/);
    expect(completionAttempts).toBe(1);
  });
});
